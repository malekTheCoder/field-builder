import {describe,it,expect,afterAll} from 'vitest';
import {field,potential,numerical,type Vec} from '../src/symbolic/physics';
import {sampleDistribution,sumSamples,sumPotential} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../src/problems/types';
// ---------------------------------------------------------------------------
// Convergence order of the sampler and conditioning of the closed forms.
//
// Every other physics file in tests/ asks the same question — "is the number
// right at the one n (or the one distance) I happened to pick?" — and answers it
// with a tolerance. That is blind to a whole class of faults: a partition that is
// off by half a bin still lands inside 1e−5 at n = 2000, a closed form spelled as
// a difference of two nearly equal terms still has six good digits at d/L = 1e8.
// This file asserts a RATE, a SIGN and a CONSTANT instead.
//
//   1. The midpoint sampler is second order, and its leading error is the
//      Euler–Maclaurin term −(h²/24)(f'(b) − f'(a)). That constant is computed
//      here from the kernel's endpoint derivative, differentiated by hand, so a
//      Jacobian, a density weight or a dq sign that is wrong changes it.
//   2. The angle- and tan-partitioned lessons have an EXACT error law at every n,
//      including n = 1, 2, 3 — the regime the slider actually draws. The midpoint
//      sum of cos or sin over equal pieces is (h/2)/sin(h/2) times the integral
//      (Lagrange's identity), independent of distance, λ and σ.
//   3. The difference-form closed forms (1/a − 1/(a+L), h − |z|, ln((a+L)/a),
//      asinh) must keep twelve digits across d/L from 1e−3 to 1e12. Written in
//      the textbook spelling they do not; written as a product they do.
//   4. The transverse far field of the endpoint rod and the ramp is ~1/r³ while
//      |E| is ~1/r², so the existing far-field magnitude check at d = 1e8 cannot
//      see E_y at all. It is pinned here to its first-moment law.
//
// Nothing below reads an expected value out of the app. Every reference is a
// textbook closed form transcribed here, a hand-differentiated kernel, a binomial
// or asinh series summed here, or an adaptive Simpson integral written here.
// ---------------------------------------------------------------------------
const E0=8.8541878128e-12,ke=1/(4*Math.PI*E0); // CODATA ε₀, re-entered by hand rather than imported.
const P=(over:Partial<Params>):Params=>({...DEFAULT_PARAMS,...over});
const rel=(got:number,want:number)=>Math.abs(got-want)/Math.abs(want);

// --- series references, used wherever the textbook spelling would cancel ------
/** (1+x)^(−1/2) − 1 summed as a binomial series; |x| ≤ ¼ so the terms fall by ~¼ each. */
function invSqrt1pMinus1(x:number){let term=1,sum=0;for(let m=1;m<200;m++){term*=-x*(2*m-1)/(2*m);sum+=term;if(Math.abs(term)<1e-19*Math.abs(sum))break;}return sum;}
/** 1 − |z|/√(z²+R²) with no subtraction of near-equal doubles. u = R/|z|. */
const oneMinusCos=(u:number)=>u*u<=.25?-invSqrt1pMinus1(u*u):1-1/Math.sqrt(1+u*u);
/** √(1+x) − 1, same recurrence with the +½ exponent. */
function sqrt1pMinus1(x:number){if(Math.abs(x)>.25)return Math.sqrt(1+x)-1;let term=1,sum=0;for(let m=1;m<200;m++){term*=x*(3-2*m)/(2*m);sum+=term;if(Math.abs(term)<1e-19*Math.abs(sum))break;}return sum;}
/** asinh by its own Maclaurin series for small argument — deliberately NOT Math.asinh,
 *  which is what bisector.ts calls, so the potential sweep compares two spellings. */
function asinhRef(u:number){if(Math.abs(u)>.25)return Math.asinh(u);let term=u,sum=u;for(let m=1;m<200;m++){term*=-u*u*(2*m-1)/(2*m);const add=term/(2*m+1);sum+=add;if(Math.abs(add)<1e-19*Math.abs(sum))break;}return sum;}
/** Adaptive Simpson; `eps` is ABSOLUTE, so callers scale it by the size the answer obviously has. */
function adaptive(g:(t:number)=>number,a:number,b:number,eps:number):number{
 const panel=(lo:number,hi:number,flo:number,fm:number,fhi:number)=>(hi-lo)/6*(flo+4*fm+fhi);
 const refine=(lo:number,hi:number,flo:number,fm:number,fhi:number,whole:number,tol:number,depth:number):number=>{
  const m=(lo+hi)/2,fl=g((lo+m)/2),fr=g((m+hi)/2);
  const l=panel(lo,m,flo,fl,fm),r=panel(m,hi,fm,fr,fhi),delta=l+r-whole;
  if(depth===0||Math.abs(delta)<=15*tol)return l+r+delta/15;
  return refine(lo,m,flo,fl,fm,l,tol/2,depth-1)+refine(m,hi,fm,fr,fhi,r,tol/2,depth-1);
 };
 const fa=g(a),fb=g(b),fm=g((a+b)/2);
 return refine(a,b,fa,fm,fb,panel(a,b,fa,fm,fb),eps,40);
}

// ===========================================================================
// 1. The midpoint sampler is second order, with the Euler–Maclaurin constant.
// ===========================================================================
// Composite midpoint on [a,b] with h = (b−a)/n obeys
//     M_n = I − (h²/24)(f'(b) − f'(a)) + O(h⁴),
// so the RELATIVE error e_n = (M_n − I)/I is −(h²/24)(f'(b) − f'(a))/I. Both f'
// and I below are written out from the geometry; the app supplies only M_n.
// The sweep starts at n = 40 (h = 0.1 ≪ d = 3): below n ≈ L/d the expansion has
// not set in and the error changes sign — documented midpoint behaviour.
describe('Convergence order of the sampler',()=>{
 const d=3,L=4,R=2,q=1e-9,lam=q/L,l0=1e-9,sigma=q/(Math.PI*R*R),h5=Math.hypot(d,L),hR=Math.hypot(d,R);
 const p=P({distance:d,size:L,charge:1});
 type Case={name:string;id:ProblemId;pick:((v:Vec)=>number)|null;a:number;b:number;dF:(t:number)=>number;I:number;sign:1|-1;quad:boolean};
 const CASES:Case[]=[
  // Rod on its bisector, P = (d,0): f(y) = kλd/(d²+y²)^{3/2}, f'(y) = −3kλdy/(d²+y²)^{5/2}.
  // The constant collapses to L²d²/(8n²(d²+L²/4)²) — 4.1605e−6 at n = 160.
  {name:'bisector E_x',id:'bisector',pick:v=>v.x,a:-L/2,b:L/2,dF:y=>-3*ke*lam*d*y/(d*d+y*y)**2.5,I:ke*q/(d*Math.sqrt(d*d+L*L/4)),sign:1,quad:true},
  // Rod end-on, P beyond the far end: f(x) = kλ/(L+d−x)², an UNDERestimate because
  // the kernel's curvature is concentrated at the near end.
  {name:'axial E_x',id:'axial',pick:v=>v.x,a:0,b:L,dF:x=>2*ke*lam/(L+d-x)**3,I:ke*q/(d*(d+L)),sign:-1,quad:true},
  // Rod standing on the axis from its foot. Same transverse kernel as the bisector,
  // but only half the interval, so f'(a) no longer cancels f'(b).
  {name:'endpoint E_x',id:'endpoint',pick:v=>v.x,a:0,b:L,dF:y=>-3*ke*lam*d*y/(d*d+y*y)**2.5,I:ke*lam*L/(d*h5),sign:1,quad:true},
  // f_y(y) = −kλy/(d²+y²)^{3/2}, f_y'(y) = −kλ(d²−2y²)/(d²+y²)^{5/2}.
  {name:'endpoint E_y',id:'endpoint',pick:v=>v.y,a:0,b:L,dF:y=>-ke*lam*(d*d-2*y*y)/(d*d+y*y)**2.5,I:-ke*lam*L*L/(d*h5*(d+h5)),sign:1,quad:true},
  // Ramp λ(y) = λ₀y/L. Its E_x kernel is the endpoint's E_y kernel times a constant,
  // so the two relative errors must agree digit for digit — a fingerprint that the
  // y-weighted density is being applied to the right kernel and not to the other one.
  {name:'ramp E_x',id:'ramp',pick:v=>v.x,a:0,b:L,dF:y=>ke*l0*d/L*(d*d-2*y*y)/(d*d+y*y)**2.5,I:ke*l0*L/(h5*(h5+d)),sign:1,quad:true},
  // f_y(y) = −(kλ₀/L)y²/(d²+y²)^{3/2}: vanishing derivative at the foot, so the
  // constant is ~40× smaller than E_x's and carries the opposite sign.
  {name:'ramp E_y',id:'ramp',pick:v=>v.y,a:0,b:L,dF:y=>-ke*l0/L*y*(2*d*d-y*y)/(d*d+y*y)**2.5,I:-ke*l0/L*(Math.asinh(L/d)-L/h5),sign:-1,quad:true},
  // Disk swept as annuli: f(s) = 2πkσ d s/(s²+d²)^{3/2}, f'(s) = 2πkσ d(d²−2s²)/(s²+d²)^{5/2}.
  {name:'disk E_z',id:'disk',pick:v=>v.z,a:0,b:R,dF:s=>2*Math.PI*ke*sigma*d*(d*d-2*s*s)/(s*s+d*d)**2.5,I:2*Math.PI*ke*sigma*R*R/(hR*(hR+d)),sign:1,quad:false},
  {name:'disk V',id:'v-disk',pick:null,a:0,b:R,dF:s=>2*Math.PI*ke*sigma*d*d/(s*s+d*d)**1.5,I:2*Math.PI*ke*sigma*R*R/(hR+d),sign:1,quad:false},
  // Potentials: f(y) = kλ/√(d²+y²) and f(x) = kλ/(L+d−x).
  {name:'bisector V',id:'v-rod-bisector',pick:null,a:-L/2,b:L/2,dF:y=>-ke*lam*y/(d*d+y*y)**1.5,I:2*ke*lam*Math.asinh(L/(2*d)),sign:1,quad:false},
  {name:'axial V',id:'v-rod-axial',pick:null,a:0,b:L,dF:x=>ke*lam/(L+d-x)**2,I:ke*lam*Math.log1p(L/d),sign:-1,quad:false},
 ];
 const NS=[40,80,160,320,640,1280,2560];
 const measure=(c:Case,n:number)=>{const s=sampleDistribution(c.id,p,n);return c.pick?c.pick(sumSamples(s)):sumPotential(s);};
 const predict=(c:Case,n:number)=>{const h=(c.b-c.a)/n;return -(h*h/24)*(c.dF(c.b)-c.dF(c.a))/c.I;};

 // Run with CONVERGENCE_REPORT=1 to print e_40/e_80/e_160/e_2560 beside the prediction.
 const log:string[]=[];
 afterAll(()=>{if(process.env.CONVERGENCE_REPORT)process.stderr.write('\n'+log.join('\n')+'\n');});

 for(const c of CASES) it(`${c.name}: e_n matches the Euler-Maclaurin constant and halves four times per doubling`,()=>{
  const e=NS.map(n=>(measure(c,n)-c.I)/c.I);
  log.push(`${c.name.padEnd(14)} ${[0,1,2,6].map(i=>e[i].toExponential(4)).join(' ')}  pred ${[0,1,2,6].map(i=>predict(c,NS[i]).toExponential(4)).join(' ')}`);
  for(let i=0;i<NS.length;i++){
   expect.soft(Math.sign(e[i]),`${c.name} n=${NS[i]} sign of e_n`).toBe(c.sign);
   // 2% at n = 40 leaves room for the h⁴ term the two-term expansion drops; by
   // n = 80 that term is a quarter of its size and 0.5% is generous.
   expect.soft(rel(e[i],predict(c,NS[i])),`${c.name} n=${NS[i]} e_n=${e[i].toExponential(5)} pred=${predict(c,NS[i]).toExponential(5)}`).toBeLessThan(i===0?.02:.005);
  }
  for(let i=1;i<NS.length-1;i++) // ratio pairs from n = 80 up; 1.98..2.02 in log₂ is 4.00 ± 0.7%.
   expect.soft(Math.log2(Math.abs(e[i]/e[i+1])),`${c.name} order over ${NS[i]}->${NS[i+1]}`).toBeGreaterThan(1.98);
  for(let i=1;i<NS.length-1;i++)
   expect.soft(Math.log2(Math.abs(e[i]/e[i+1])),`${c.name} order over ${NS[i]}->${NS[i+1]}`).toBeLessThan(2.02);
  // Richardson kills the h² term exactly, so (4S_2n − S_n)/3 must land two orders
  // inside the plain error — the strongest single statement that the error IS h².
  for(const n of [160,320]){
   const s1=measure(c,n),s2=measure(c,2*n),rich=(4*s2-s1)/3,plain=Math.abs(s2-c.I);
   expect.soft(Math.abs(rich-c.I),`${c.name} Richardson at n=${n} vs plain |S_2n-I|=${plain.toExponential(3)}`).toBeLessThan(plain/100);
  }
 });

 it('the app quadrature walks the same partition, so it obeys the same law',()=>{
  for(const c of CASES.filter(x=>x.quad&&x.pick)){
   const pick=c.pick as (v:Vec)=>number;
   const e=NS.map(n=>(pick(numerical(c.id,p,n))-c.I)/c.I);
   for(let i=1;i<NS.length;i++)
    expect.soft(rel(e[i],predict(c,NS[i])),`${c.name} quadrature n=${NS[i]} e_n=${e[i].toExponential(5)}`).toBeLessThan(.005);
   for(let i=1;i<NS.length-1;i++)
    expect.soft(Math.abs(Math.log2(Math.abs(e[i]/e[i+1]))-2),`${c.name} quadrature order ${NS[i]}->${NS[i+1]}`).toBeLessThan(.02);
  }
 });

 // The control: geometries where no order is measurable because the midpoint sum is
 // already exact. Every ring element sits at the same distance and contributes the
 // same axial field, so E_z and V are the closed form at n = 1 and never improve.
 it('ring E_z, ring V and arc V are exact at every n, so no order exists to measure',()=>{
  const rp=P({distance:2.4,size:5,charge:3}),Rr=rp.size/2,Q=rp.charge*1e-9;
  const Ez=ke*Q*rp.distance/(Rr*Rr+rp.distance**2)**1.5,Vr=ke*Q/Math.hypot(Rr,rp.distance);
  const ap=P({distance:1,size:5,charge:3,phi:1.7});
  for(const n of [1,2,3,5,17,400]){
   expect.soft(rel(sumSamples(sampleDistribution('ring',rp,n)).z,Ez),`ring E_z n=${n}`).toBeLessThan(1e-14);
   expect.soft(rel(sumPotential(sampleDistribution('v-ring',rp,n)),Vr),`ring V n=${n}`).toBeLessThan(1e-14);
   expect.soft(rel(sumPotential(sampleDistribution('v-arc',ap,n)),ke*ap.charge*1e-9/(ap.size/2)),`arc V n=${n}`).toBeLessThan(1e-14);
  }
 });
});

// ===========================================================================
// 2. Exact error laws for the angle- and tan-partitioned lessons, from n = 1.
// ===========================================================================
// Lagrange's identity for a midpoint sum of a sinusoid:
//     Σ_{i<n} cos(a+(i+½)h) = [sin(a+nh) − sin(a)] / (2 sin(h/2)),
// and the matching one for sin. Each of these five lessons reduces, after its
// Jacobian, to exactly such a sum, so the sampled answer is (h/2)/sin(h/2) times
// the closed form at EVERY n — no asymptotics, no tolerance on n. This is the only
// way to test the small-N regime the slider draws (3..5 slices): a Jacobian written
// sec instead of sec², a partition in y instead of θ, or a half-bin shift all break
// the law at n = 1..3 while still converging perfectly at n = 2000.
describe('Exact midpoint error laws at every n',()=>{
 const law=(h:number)=>(h/2)/Math.sin(h/2);
 type Exact={name:string;id:ProblemId;p:Params;pick:((v:Vec)=>number)|null;h:(n:number)=>number;closed:number;flat?:boolean};
 const CASES:Exact[]=[];
 for(const lamNC of [1,-7]) for(const dist of [.5,3,6]){
  const lam=lamNC*1e-9;
  // Infinite line: y = r tan θ over θ ∈ (−π/2, π/2), kernel kλ cos θ/r, h = π/n.
  CASES.push({name:`infinite E_x λ=${lamNC} r=${dist}`,id:'infinite',p:P({distance:dist,charge:lamNC}),pick:v=>v.x,h:n=>Math.PI/n,closed:2*ke*lam/dist});
  // Semi-infinite line from the origin, P = (0, r): kλ sin θ/r and kλ cos θ/r on [0, π/2].
  CASES.push({name:`semi E_x λ=${lamNC} r=${dist}`,id:'semi',p:P({distance:dist,charge:lamNC}),pick:v=>v.x,h:n=>Math.PI/(2*n),closed:-ke*lam/dist});
  CASES.push({name:`semi E_y λ=${lamNC} r=${dist}`,id:'semi',p:P({distance:dist,charge:lamNC}),pick:v=>v.y,h:n=>Math.PI/(2*n),closed:ke*lam/dist});
 }
 for(const sigNC of [1,-7]) for(const z of [.5,3,6,-2]){
  // Sheet: s = |z| tan θ with the sec² Jacobian folded into dq; kernel 2πkσ sin θ.
  // The sum is HEIGHT-INDEPENDENT at every n, not merely in the limit.
  CASES.push({name:`sheet E_z σ=${sigNC} z=${z}`,id:'sheet',p:P({distance:z,charge:sigNC}),pick:v=>v.z,h:n=>Math.PI/(2*n),closed:Math.sign(z)*sigNC*1e-9/(2*E0)});
 }
 for(const qNC of [1,-7]) for(const phi of [.3,2.3,Math.PI,2*Math.PI-1e-3]){
  const pr=P({size:4,charge:qNC,phi}),R=pr.size/2,Q=qNC*1e-9;
  // Arc about +x: kernel −kλ cos θ/R on [−φ/2, φ/2], h = φ/n.
  CASES.push({name:`arc E_x q=${qNC} phi=${phi.toFixed(3)}`,id:'arc',p:pr,pick:v=>v.x,h:n=>phi/n,closed:-2*ke*Q*Math.sin(phi/2)/(R*R*phi)});
  // Every arc element is exactly R from the centre, so V has NO n-dependence at all.
  CASES.push({name:`arc V q=${qNC} phi=${phi.toFixed(3)}`,id:'v-arc',p:pr,pick:null,h:n=>phi/n,closed:ke*Q/R,flat:true});
 }
 const NS=[1,2,3,5,10,37,100,1000,10000];
 for(const c of CASES) it(`${c.name}: sampled/closed = (h/2)/sin(h/2) at n = 1..10000`,()=>{
  for(const n of NS){
   const s=sampleDistribution(c.id,c.p,n);
   const terms=s.map(x=>c.pick?c.pick(x.field):x.potential);
   const got=(c.pick?c.pick(sumSamples(s)):sumPotential(s))/c.closed;
   const want=c.flat?1:law(c.h(n));
   // A near-closed arc genuinely cancels: Σ|term| / |Σterm| is the condition number of
   // the sum itself, and no summation order can beat √n·eps·κ. Everything else has
   // κ = 1 (one-signed kernels) and lands on the flat 1e−12 / 1e−10 floors, where 1e−10
   // at n = 10⁴ is the accumulation of ten thousand roundings, not slack.
   const kappa=terms.reduce((a,b)=>a+Math.abs(b),0)/Math.abs(terms.reduce((a,b)=>a+b,0));
   const tol=Math.max(n<=1000?1e-12:1e-10,4*Math.sqrt(n)*Number.EPSILON*kappa);
   expect.soft(Math.abs(got-want),`${c.name} n=${n} ratio=${got.toPrecision(15)} law=${want.toPrecision(15)} kappa=${kappa.toPrecision(4)}`).toBeLessThan(tol);
  }
 });
 it('the semi-infinite line points at exactly 135 degrees at every n',()=>{
  // Σ sin θ_i and Σ cos θ_i are the same multiset of terms walked in opposite order, so
  // they are equal in exact arithmetic but not bit for bit; 4√n·eps is the random-walk
  // bound on a sequential sum of n terms and is the tightest honest statement available.
  for(const n of [1,2,3,5,10,37,100,1000,10000]){
   const v=sumSamples(sampleDistribution('semi',P({distance:2.5,charge:4}),n));
   expect.soft(Math.abs(v.x+v.y),`semi n=${n} x=${v.x} y=${v.y}`).toBeLessThan(4*Math.sqrt(n)*Number.EPSILON*Math.abs(v.x));
  }
 });
 it('the tan sweep reaches 3.8e4 m with a 7.6e-4 C element and still obeys the law',()=>{
  const dist=6,lamNC=10,n=10000,s=sampleDistribution('infinite',P({distance:dist,charge:lamNC}),n);
  const last=s[s.length-1],theta=Math.PI/2-Math.PI/(2*n);
  // tan θ and sec²θ are steep here: writing the same angle as (n−½)π/n − π/2 rather than
  // π/2 − π/2n moves it by an ulp, and the Jacobian multiplies that by 2 tan θ ≈ 1.3e4.
  // That amplification is the conditioning of the substitution, not slack in the sampler.
  const amp=Math.max(1e-12,8*Math.abs(Math.tan(theta))*Number.EPSILON);
  expect(rel(last.position.y,dist*Math.tan(theta))).toBeLessThan(amp);
  expect(rel(last.dq,lamNC*1e-9*dist*Math.PI/(n*Math.cos(theta)**2))).toBeLessThan(amp);
  expect(last.position.y).toBeGreaterThan(3.8e4);expect(last.dq).toBeGreaterThan(7.6e-4);
  expect(s.every(x=>Number.isFinite(x.dq)&&Number.isFinite(x.field.x))).toBe(true);
  expect(Math.abs(sumSamples(s).x/(2*ke*lamNC*1e-9/dist)-law(Math.PI/n))).toBeLessThan(1e-10);
 });
});

// ===========================================================================
// 3. Twelve digits across d/L from 1e−3 to 1e12.
// ===========================================================================
// 1/a − 1/(a+L), √(z²+R²) − |z|, 1 − |z|/h, ln((a+L)/a) and asinh(L/2r) all lose
// one digit per decade of d/L when spelled the textbook way. The existing far-field
// check sits at d = 1e8 and asks for six digits, by which point a naive spelling has
// either failed completely or still looks fine — either way it cannot localise the
// loss. The band 1e3 < d/L < 1e7 is checked nowhere. References here are the
// cancellation-free rearrangement (a product, never a subtraction) cross-checked
// against a binomial/asinh series summed above.
describe('Conditioning of the closed forms across sixteen decades',()=>{
 const L=3.8,q=1e-9,lam=q/L,R=L/2,sigma=q/(Math.PI*R*R);
 const EXPS=Array.from({length:16},(_,i)=>i-3);
 const check=(name:string,e:number,got:number,want:number)=>{
  // hypot and one division are all that separate these two spellings, so 1e−12 holds
  // to d/L = 1e9; past that the argument reduction inside hypot costs one more digit.
  expect.soft(rel(got,want),`${name} d/L=1e${e} got=${got.toExponential(12)} want=${want.toExponential(12)}`).toBeLessThan(e<=9?1e-12:1e-11);
 };
 it('rod end-on: E = kQ/(a(a+L)) and V = kλ log1p(L/a)',()=>{
  for(const e of EXPS){const a=L*10**e,p=P({distance:a,size:L,charge:1});
   check('axial E_x',e,field('axial',p).x,ke*q/(a*(a+L)));
   check('axial V',e,potential('v-rod-axial',p),ke*lam*(L/a<=.25?Math.log1p(L/a):Math.log((a+L)/a)));}
 });
 it('disk on axis: E = 2πkσ R²/(h(h+|z|)) and V = 2πkσ R²/(h+|z|), both signs of z',()=>{
  for(const e of EXPS) for(const s of [1,-1]){const z=s*L*10**e,a=Math.abs(z),p=P({distance:z,size:L,charge:1}),u=R/a;
   // 1 − |z|/h and h − |z| from the binomial series, so the reference never subtracts.
   check('disk E_z',e,field('disk',p).z,s*2*Math.PI*ke*sigma*oneMinusCos(u));
   check('disk V',e,potential('v-disk',p),2*Math.PI*ke*sigma*a*sqrt1pMinus1(u*u));}
 });
 it('ring on axis: E = kQz/(z²+R²)^{3/2} and V = kQ/hypot(R,z) — the cancellation-free control',()=>{
  for(const e of EXPS) for(const s of [1,-1]){const z=s*L*10**e,p=P({distance:z,size:L,charge:1});
   check('ring E_z',e,field('ring',p).z,ke*q*z/(R*R+z*z)**1.5);
   check('ring V',e,potential('v-ring',p),ke*q/Math.hypot(R,z));}
 });
 it('rod on its bisector: E = kQ/(r√(r²+L²/4)) and V = 2kλ asinh(L/2r)',()=>{
  for(const e of EXPS){const r=L*10**e,p=P({distance:r,size:L,charge:1});
   check('bisector E_x',e,field('bisector',p).x,ke*q/(r*Math.hypot(r,L/2)));
   check('bisector V',e,potential('v-rod-bisector',p),2*ke*lam*asinhRef(L/(2*r)));}
 });
 // The far-field ratios, with the textbook multipole coefficients. E d²/kQ → 1 for every
 // finite distribution; the first correction is what says WHICH distribution it was.
 it('far-field ratios carry the textbook second-moment coefficients',()=>{
  type M={name:string;ratio:(d:number)=>number;series:(x:number)=>number};
  const MOMENTS:M[]=[
   // Rod end-on is not centred on P, so its leading correction is first order in L/a.
   {name:'axial E a²/kQ',ratio:a=>field('axial',P({distance:a,size:L,charge:1})).x*a*a/(ke*q),series:x=>1-x+x*x-x**3},
   {name:'axial V a/kQ',ratio:a=>potential('v-rod-axial',P({distance:a,size:L,charge:1}))*a/(ke*q),series:x=>1-x/2+x*x/3-x**3/4},
   // Centred distributions: only even powers survive, and the coefficient is the second moment.
   {name:'bisector E r²/kQ',ratio:r=>field('bisector',P({distance:r,size:L,charge:1})).x*r*r/(ke*q),series:x=>1-x*x/8+3*x**4/128},
   {name:'bisector V r/kQ',ratio:r=>potential('v-rod-bisector',P({distance:r,size:L,charge:1}))*r/(ke*q),series:x=>1-x*x/24+3*x**4/640},
   {name:'ring E z²/kQ',ratio:z=>field('ring',P({distance:z,size:L,charge:1})).z*z*z/(ke*q),series:x=>1-3*(x/2)**2/2+15*(x/2)**4/8},
   {name:'disk E z²/kQ',ratio:z=>field('disk',P({distance:z,size:L,charge:1})).z*z*z/(ke*q),series:x=>1-3*(x/2)**2/4+5*(x/2)**4/8},
   {name:'disk V z/kQ',ratio:z=>potential('v-disk',P({distance:z,size:L,charge:1}))*z/(ke*q),series:x=>1-(x/2)**2/4+(x/2)**4/8},
  ];
  // At d/L = 1e4 the first dropped term is (L/d)⁶ ~ 1e−24, so the four-term series is
  // the exact value to every digit a double carries.
  for(const m of MOMENTS) for(const e of [4,5,6]){const d=L*10**e;
   expect.soft(Math.abs(m.ratio(d)-m.series(L/d)),`${m.name} at d/L=1e${e}`).toBeLessThan(1e-12);}
 });
});

// ===========================================================================
// 4. The transverse far field, which |E| cannot see.
// ===========================================================================
// E_y of the endpoint rod and of the ramp falls as 1/r³ while E_x falls as 1/r², so
// at the distance the existing far-field test uses (d = 1e8 L) E_y is 1e−8 of the
// magnitude and contributes nothing to six digits. It is also a difference of two
// nearly equal terms in its textbook spelling. Both facts together mean a total loss
// of E_y is invisible everywhere else in the suite.
describe('Transverse far field of the endpoint rod and the ramp',()=>{
 const L=3.8,lam=1e-9,l0=1e-9,Qe=lam*L,Qr=l0*L/2;
 /** ∫₀ˣ t²/(1+t²)^{3/2} dt = asinh x − x/√(1+x²), the ramp's bracket. Series below 1e−2
  *  (four terms already reach 1e−16 relative), adaptive Simpson above — the integrand is
  *  one-signed, so Simpson has nothing to cancel and needs no stable spelling. */
 const bracket=(x:number)=>x<=1e-2?x**3/3-3*x**5/10+15*x**7/56-35*x**9/144:adaptive(t=>t*t/(1+t*t)**1.5,0,x,1e-15*x**3/3);
 const EXPS=[-2,-1,0,1,2,3,4,5,6,7];
 it('endpoint E_y = -kλL²/(r h (r+h)) to 12 digits from r/L = 1e-2 to 1e7',()=>{
  for(const e of EXPS){const r=L*10**e,h=Math.hypot(r,L),want=-ke*lam*L*L/(r*h*(r+h));
   expect.soft(rel(field('endpoint',P({distance:r,size:L,charge:L})).y,want),`endpoint E_y r/L=1e${e} want=${want.toExponential(12)} got=${field('endpoint',P({distance:r,size:L,charge:L})).y.toExponential(12)}`).toBeLessThan(e<=6?1e-12:1e-11);}
 });
 it('ramp E_y = -(kλ0/L)∫ y²/(r²+y²)^{3/2} to 12 digits from r/L = 1e-2 to 1e7',()=>{
  for(const e of EXPS){const r=L*10**e,want=-ke*l0/L*bracket(L/r);
   expect.soft(rel(field('ramp',P({distance:r,size:L,charge:1})).y,want),`ramp E_y r/L=1e${e} want=${want.toExponential(12)} got=${field('ramp',P({distance:r,size:L,charge:1})).y.toExponential(12)}`).toBeLessThan(e<=6?1e-12:1e-11);}
 });
 // The first-moment law: E_y → −kQ y_c/r³ with y_c the centre of charge — L/2 for the
 // uniform rod, 2L/3 for the ramp. The correction term is what distinguishes them:
 // −¾(L/r)² for the uniform rod, −0.9(L/r)² for the ramp. Carried to (L/r)⁶ so that at
 // r/L = 1e2 the truncation (1e−16) is far below anything the app could contribute.
 it('both obey the first-moment law with its first correction',()=>{
  for(const e of [2,3,4,5,6,7]){const r=L*10**e,x=L/r;
   const re=field('endpoint',P({distance:r,size:L,charge:L})).y*r**3/(-ke*Qe*L/2);
   expect.soft(Math.abs(re-(1-.75*x*x+.625*x**4-35*x**6/64)),`endpoint moment at r/L=1e${e} ratio=${re.toPrecision(14)}`).toBeLessThan(1e-12);
   const rr=field('ramp',P({distance:r,size:L,charge:1})).y*r**3/(-ke*Qr*2*L/3);
   expect.soft(Math.abs(rr-(1-.9*x*x+45*x**4/56-105*x**6/144)),`ramp moment at r/L=1e${e} ratio=${rr.toPrecision(14)}`).toBeLessThan(1e-12);}
 });
 it('the anchor the dipole term alone would miss: ramp at r = 1e3 L',()=>{
  const r=1e3*L,want=-ke*l0/L*bracket(L/r),dipole=-ke*Qr*(2*L/3)/r**3;
  expect(want).toBeCloseTo(-7.88381027e-10,18); // series value, printed to nine digits
  expect(dipole).toBeCloseTo(-7.88381736e-10,18); // pure first moment, 9.0e-7 above it
  expect(Math.abs(want/dipole-1+9.0e-7)).toBeLessThan(1e-9);
 });
});
