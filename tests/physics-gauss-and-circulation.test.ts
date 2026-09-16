import {describe,it,expect} from 'vitest';
import {sampleDistribution} from '../src/diagrams/sampling';
import {cloud,spaceField,type Layout} from '../src/diagrams/field3d';
import {planeField} from '../src/diagrams/fieldlines';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../src/problems/types';
import type {ChargeSample} from '../src/distributions/types';
// ---------------------------------------------------------------------------
// Integral theorems on the sampled field: flux, divergence, circulation, closure.
//
// Every other physics test in this repo asks the app for E at the one point P the
// lesson cares about and compares a number. That is a single sample of a vector
// field, taken where symmetry has already killed two of its three components. This
// file never asks for the answer. It evaluates spaceField/planeField over the FULL
// ChargeSample set at points on closed surfaces and closed loops, and holds the
// results to statements that are true of ANY inverse-square field built from those
// charges — Gauss, ∇·E = 0 off the charge, ∇×E = 0, and path independence — plus
// the one place the sampled field has to meet a lesson's own closed form.
//
// What that catches, and nothing else here does:
//  • a constant inside spaceField that is not 1/(4πε₀), or a nC→C slip in a dq:
//    the flux misses Q/ε₀ by that factor;
//  • a wrong r-exponent in the kernel: the flux stops being size-independent, so
//    the small and the large surface disagree;
//  • a (S − P) sign slip: Φ = −Q/ε₀;
//  • cloud() handing each of its 16 points the WHOLE annulus dq (16×) — dq
//    conservation in cloud is otherwise only checked to 1e−3, on axis;
//  • a dq paired with a neighbouring piece's position, or a partition drifted by
//    half a bin: caught by putting the surface THROUGH a bin edge and counting;
//  • a sec instead of sec² (or d instead of d²) in the tan-partitioned samplers,
//    which no present test can see — they are checked only by an n = 2000 sum;
//  • a rotation/reflection of the field (E_x ↔ E_y, one component's sign flipped):
//    magnitudes and radial checks are blind to it, circulation is not;
//  • an off-axis radial component of the wrong size, a ring built in the wrong
//    plane, or a cloud ring at the wrong radius — invisible to Gauss (any position
//    inside the surface gives Q/ε₀) but fatal to the rectangle and to E = −∇V.
//
// EVERY expected number below is a theorem, a textbook closed form, or a quadrature
// written in this file. The app is only ever evaluated AT a surface point or a loop
// point; it is never asked what the answer should be. The charge partitions used to
// predict enclosed charge are transcribed from each lesson's setup sentence and the
// midpoint rule, then asserted to agree with the sampler as a precondition — so a
// partition bug fails loudly at the precondition rather than laundering itself into
// the expected value.
// ---------------------------------------------------------------------------
type V3=[number,number,number];
// CODATA ε₀ typed in again rather than imported, so a corrupted constants.ts cannot
// cancel itself out of both sides of a Gauss test.
const E0=8.8541878128e-12,ke=1/(4*Math.PI*E0);
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const len=(a:V3)=>Math.hypot(a[0],a[1],a[2]);
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(a:V3):V3=>{const l=len(a);return [a[0]/l,a[1]/l,a[2]/l];};
/** Coordinates in a failure message, so a mis-placed charge is readable at a glance. */
const at=(v:readonly number[])=>v.map(c=>c.toPrecision(6)).join(', ');
/** Relative comparison with the numbers printed on failure — `rel < tol` on its own
 * says nothing useful in a log. Run with GAUSS_REPORT=1 to print every achieved error,
 * which is how you tell a tolerance that is doing work from one that is decoration. */
const REPORT=Boolean(process.env.GAUSS_REPORT);
function near(got:number,want:number,tol:number,what:string):void{
 const r=Math.abs(got-want)/Math.abs(want);
 if(REPORT)console.log(`  rel ${r.toExponential(2)}  of ${tol.toExponential(0)}   ${what}  [${want.toPrecision(10)}]`);
 expect(r,`${what}: got ${got.toPrecision(12)}, want ${want.toPrecision(12)}, rel ${r.toExponential(3)}`).toBeLessThan(tol);
}
// --- Gauss–Legendre, built here ---------------------------------------------
// Newton on the three-term Legendre recurrence. Nothing in src/ computes quadrature
// nodes, so there is no circularity, but the rule is self-checked below against a
// polynomial whose integral is known by hand before any of it is trusted.
function legendre(n:number,x:number):[number,number]{
 let p0=1,p1=x;
 for(let k=2;k<=n;k++){const p2=((2*k-1)*x*p1-(k-1)*p0)/k;p0=p1;p1=p2;}
 return [p1,n*(x*p1-p0)/(x*x-1)];
}
const glCache=new Map<number,{x:number[];w:number[]}>();
function gauss(n:number):{x:number[];w:number[]}{
 const hit=glCache.get(n);if(hit)return hit;
 const x:number[]=[],w:number[]=[];
 for(let i=0;i<n;i++){
  // Tricomi's asymptotic root; Newton then converges in three or four steps.
  let t=Math.cos(Math.PI*(i+.75)/(n+.5));
  for(let it=0;it<100;it++){const [p,dp]=legendre(n,t),d=p/dp;t-=d;if(Math.abs(d)<2e-16)break;}
  const [,dp]=legendre(n,t);
  x.push(t);w.push(2/((1-t*t)*dp*dp));
 }
 const out={x,w};glCache.set(n,out);return out;
}
// --- Closed surfaces as quadrature patches ----------------------------------
/** One node of a surface rule: a point, the OUTWARD unit normal there, and the area
 * weight. Φ = Σ E(p)·n a; the gross flux ∫|E·n̂| dA reuses the same nodes. */
type Patch={p:V3;n:V3;a:number};
/** `depth` is how far inside the surface a point lies (negative outside). It is what the
 * preconditions below use: a partition that has drifted onto the surface shows up as a
 * depth near zero, which is a loud failure rather than a quietly ruined quadrature. */
type Surface={patches:Patch[];depth(p:V3):number;label:string};
const inside=(s:Surface,p:V3)=>s.depth(p)>0;
/** An orthonormal frame whose third axis is `axis`, so a sphere's polar axis can be
 * laid along a rod: then the flux integrand is φ-free and GL in μ carries everything. */
function frame(axis:V3):[V3,V3,V3]{
 const e3=unit(axis),t:V3=Math.abs(e3[0])<.9?[1,0,0]:[0,1,0];
 const e1=unit(cross(t,e3));
 return [e1,cross(e3,e1),e3];
}
/** Sphere: GL in μ = cos θ times the equispaced (periodic trapezoid) rule in φ.
 * For a point charge at fractional radius a/Rs the flux density is Σ(l+1)(a/Rs)^l P_l(μ)
 * for the m = 0 part, which GL-n integrates exactly through l = 2n−1; every m ≠ 0
 * harmonic is annihilated exactly by the equispaced φ rule unless m is a multiple of
 * the node count. So the error is the multipole tail (a/Rs)^(2n), quoted per test. */
function sphere(C:V3,Rs:number,nMu:number,nPhi:number,axis:V3=[0,0,1]):Surface{
 const {x:mu,w}=gauss(nMu),[e1,e2,e3]=frame(axis),patches:Patch[]=[];
 for(let j=0;j<nMu;j++){
  const s=Math.sqrt(Math.max(0,1-mu[j]*mu[j]));
  for(let k=0;k<nPhi;k++){
   // Half a step off zero so a node never lands on the frame's seam, where a
   // symmetric layout can put it exactly on a charge's azimuth.
   const ph=2*Math.PI*(k+.5)/nPhi,cx=s*Math.cos(ph),cy=s*Math.sin(ph),cz=mu[j];
   const n:V3=[e1[0]*cx+e2[0]*cy+e3[0]*cz,e1[1]*cx+e2[1]*cy+e3[1]*cz,e1[2]*cx+e2[2]*cy+e3[2]*cz];
   patches.push({p:[C[0]+Rs*n[0],C[1]+Rs*n[1],C[2]+Rs*n[2]],n,a:Rs*Rs*w[j]*(2*Math.PI/nPhi)});
  }
 }
 return {patches,depth:p=>Rs-len(sub(p,C)),label:`sphere r=${Rs} at (${at(C)})`};
}
/** Axis-aligned box, GL m×m on each of the six faces. */
function box(lo:V3,hi:V3,m:number):Surface{
 const {x,w}=gauss(m),patches:Patch[]=[];
 for(let ax=0;ax<3;ax++){
  const u=(ax+1)%3,v=(ax+2)%3,hu=(hi[u]-lo[u])/2,hv=(hi[v]-lo[v])/2,mu=(hi[u]+lo[u])/2,mv=(hi[v]+lo[v])/2;
  for(const side of [-1,1] as const)for(let a=0;a<m;a++)for(let b=0;b<m;b++){
   const p:V3=[0,0,0],n:V3=[0,0,0];
   p[ax]=side>0?hi[ax]:lo[ax];p[u]=mu+hu*x[a];p[v]=mv+hv*x[b];n[ax]=side;
   patches.push({p,n,a:hu*hv*w[a]*w[b]});
  }
 }
 return {patches,depth:p=>Math.min(...p.map((c,i)=>Math.min(c-lo[i],hi[i]-c))),label:`box [${at(lo)}]…[${at(hi)}]`};
}
/** Cylinder about the z-axis through C: wall GL in z, caps GL in r with the r weight,
 * both times an equispaced φ rule. The φ node count is deliberately PRIME, so the
 * n-fold harmonics an n-piece partition (or cloud's 16-fold ring) puts on the surface
 * can never alias onto the mean the rule is trying to measure. */
function cylinder(C:V3,rho:number,h:number,nz:number,nr:number,nPhi:number):Surface{
 const gz=gauss(nz),gr=gauss(nr),patches:Patch[]=[];
 for(let k=0;k<nPhi;k++){
  const ph=2*Math.PI*(k+.5)/nPhi,c=Math.cos(ph),s=Math.sin(ph);
  for(let j=0;j<nz;j++)patches.push({p:[C[0]+rho*c,C[1]+rho*s,C[2]+h*gz.x[j]],n:[c,s,0],a:rho*h*gz.w[j]*(2*Math.PI/nPhi)});
  for(let j=0;j<nr;j++){
   const r=rho*(gr.x[j]+1)/2,a=rho/2*gr.w[j]*r*(2*Math.PI/nPhi);
   for(const side of [1,-1] as const)patches.push({p:[C[0]+r*c,C[1]+r*s,C[2]+side*h],n:[0,0,side],a});
  }
 }
 return {patches,depth:p=>Math.min(rho-Math.hypot(p[0]-C[0],p[1]-C[1]),h-Math.abs(p[2]-C[2])),label:`cylinder ρ=${rho} h=${h}`};
}
/** Net and gross flux in one pass over the nodes: the gross is what the net's
 * tolerance is measured against when the net must vanish. */
function flux(E:(p:V3)=>V3,s:Surface):{net:number;gross:number}{
 let net=0,gross=0;
 for(const q of s.patches){const d=dot(E(q.p),q.n)*q.a;net+=d;gross+=Math.abs(d);}
 return {net,gross};
}
const E3=(pts:readonly ChargeSample[])=>(p:V3):V3=>{const v=spaceField(pts,{x:p[0],y:p[1],z:p[2]});return [v.x,v.y,v.z];};
const E2=(pts:readonly ChargeSample[])=>(p:V3):V3=>{const v=planeField(pts,{x:p[0],y:p[1]});return [v.x,v.y,0];};
const params=(o:Partial<Params>):Params=>({...DEFAULT_PARAMS,...o});
// --- The partitions, re-derived ---------------------------------------------
/** One piece of charge, transcribed from a lesson's setup sentence and the midpoint
 * rule — never read back from ChargeSample. Used to PREDICT how much charge a surface
 * encloses and to build an independent scalar potential; the samplers are then asserted
 * to agree with it, so the two roles stay honest. */
type Piece={q:number;at:V3};
const mid=(n:number)=>Array.from({length:n},(_,i)=>(i+.5)/n);
function refPieces(id:ProblemId,p:Params,n:number):Piece[]{
 const L=p.size,R=p.size/2,d=p.distance,c=p.charge*1e-9,which:string=id;
 switch(id){
  // Rod on the y-axis, −L/2…L/2, uniform: dq = (Q/L)·(L/n) = Q/n at the bin midpoint.
  case 'bisector':case 'v-rod-bisector':return mid(n).map(t=>({q:c/n,at:[0,-L/2+L*t,0] as V3}));
  // Rod on the x-axis, 0…L, uniform.
  case 'axial':case 'v-rod-axial':return mid(n).map(t=>({q:c/n,at:[L*t,0,0] as V3}));
  // Rod standing on the x-axis, y = 0…L, uniform.
  case 'endpoint':return mid(n).map(t=>({q:c/n,at:[0,L*t,0] as V3}));
  // Same rod with λ(y) = λ₀y/L: dq = λ(y_i)·(L/n) = λ₀ y_i/n. `charge` is λ₀.
  case 'ramp':return mid(n).map(t=>({q:c*(L*t)/n,at:[0,L*t,0] as V3}));
  // Ring of radius R in the xy-plane: dq = Q/n at equal steps of angle.
  case 'ring':case 'v-ring':return mid(n).map(t=>{const th=2*Math.PI*t;return {q:c/n,at:[R*Math.cos(th),R*Math.sin(th),0] as V3};});
  // Arc of radius R spanning −φ/2…φ/2 about +x.
  case 'arc':case 'v-arc':return mid(n).map(t=>{const th=p.phi*(t-.5);return {q:c/n,at:[R*Math.cos(th),R*Math.sin(th),0] as V3};});
  // Infinite line on the y-axis, swept y = d tan θ over θ ∈ (−π/2, π/2): the piece of
  // line in one θ-bin carries λ dy = λ d sec²θ Δθ with Δθ = π/n. `charge` is λ.
  case 'infinite':return mid(n).map(t=>{const th=Math.PI*t-Math.PI/2;return {q:c*d*Math.PI/(n*Math.cos(th)**2),at:[0,d*Math.tan(th),0] as V3};});
  // Half-line along +x from the origin, same sweep over θ ∈ (0, π/2), Δθ = π/2n.
  case 'semi':return mid(n).map(t=>{const th=Math.PI*t/2;return {q:c*d*Math.PI/(2*n*Math.cos(th)**2),at:[d*Math.tan(th),0,0] as V3};});
  // Disk: whole annuli at equal steps of radius, dq = σ·2πs·Δs with Δs = R/n. The
  // stored position is the representative point (s, 0, 0); cloud() spreads it.
  case 'disk':case 'v-disk':{const sigma=c/(Math.PI*R*R);return mid(n).map(t=>{const s=R*t;return {q:sigma*2*Math.PI*s*(R/n),at:[s,0,0] as V3};});}
  // Sheet: annuli at s = |z| tan θ, Δs = |z| sec²θ Δθ, Δθ = π/2n. `charge` is σ.
  case 'sheet':return mid(n).map(t=>{const th=Math.PI*t/2,a=Math.abs(d),s=a*Math.tan(th);return {q:c*2*Math.PI*s*(a*Math.PI/(2*n*Math.cos(th)**2)),at:[s,0,0] as V3};});
 }
 throw new Error(`no reference partition transcribed for ${which}`);
}
/** The documented 16-point spread of an annulus, written out here so the expected
 * potential never borrows cloud()'s own arithmetic. Order matches cloud(): sample by
 * sample, azimuth (k + ½)·2π/16 within each. */
const PER_RING=16;
const refCloud=(pieces:readonly Piece[]):Piece[]=>pieces.flatMap(({q,at})=>{
 const r=len(at);
 if(r<1e-9)return [{q,at:[0,0,0] as V3}];
 return Array.from({length:PER_RING},(_,k)=>{const a=2*Math.PI*(k+.5)/PER_RING;return {q:q/PER_RING,at:[r*Math.cos(a),r*Math.sin(a),0] as V3};});
});
const refPoints=(id:ProblemId,p:Params,n:number,layout:Layout)=>layout==='surface'?refCloud(refPieces(id,p,n)):refPieces(id,p,n);
const appPoints=(id:ProblemId,p:Params,n:number,layout:Layout)=>cloud(sampleDistribution(id,p,n),layout);
/** Precondition for every case that predicts enclosed charge or builds a potential:
 * the app's pieces ARE the pieces transcribed above. A drifted partition, a dq paired
 * with a neighbour's position, or a cloud ring at a scaled radius stops here. */
function assertPartition(id:ProblemId,p:Params,n:number,layout:Layout):void{
 const app=appPoints(id,p,n,layout),ref=refPoints(id,p,n,layout);
 expect(app.length,`${id} n=${n} ${layout}: piece count`).toBe(ref.length);
 for(let i=0;i<ref.length;i++){
  const slip=Math.abs(app[i].dq-ref[i].q)/Math.abs(ref[i].q);
  expect(slip,`${id} n=${n} piece ${i} dq: got ${app[i].dq.toPrecision(12)}, want ${ref[i].q.toPrecision(12)}`).toBeLessThan(1e-12);
  const a:V3=[app[i].position.x,app[i].position.y,app[i].position.z];
  expect(len(sub(a,ref[i].at)),`${id} n=${n} piece ${i} position: got (${at(a)}), want (${at(ref[i].at)})`).toBeLessThan(1e-12*Math.max(1,len(ref[i].at)));
 }
}
const totalRef=(pieces:readonly Piece[])=>pieces.reduce((s,c)=>s+c.q,0);
const enclosedRef=(pieces:readonly Piece[],s:Surface)=>pieces.reduce((t,c)=>t+(inside(s,c.at)?c.q:0),0);
/** Smallest depth over a set of pieces: > 0 means all enclosed, and how comfortably. */
const margin=(pts:readonly Piece[],s:Surface)=>Math.min(...pts.map(c=>s.depth(c.at)));
const asPieces=(app:readonly ChargeSample[]):Piece[]=>app.map(c=>({q:c.dq,at:[c.position.x,c.position.y,c.position.z] as V3}));
// --- The rules used below, checked before they are trusted -------------------
describe('the quadrature this file brings with it', () => {
 it('Gauss–Legendre integrates polynomials of degree 2n − 1 exactly', () => {
  for(const n of [8,48,64,96,128]){
   const {x,w}=gauss(n);
   // ∫₋₁¹ x^p dx = 2/(p+1) for even p, 0 for odd. Checked at the highest degree the
   // rule claims and one past it, so a wrong node count cannot pass.
   for(const p of [0,2,6,2*n-2,2*n-1]){
    const got=x.reduce((s,xi,i)=>s+w[i]*xi**p,0),want=p%2?0:2/(p+1);
    expect(Math.abs(got-want),`GL${n} on x^${p}: ${got}`).toBeLessThan(1e-11*Math.max(1,Math.abs(want)));
   }
   expect(Math.abs(w.reduce((a,b)=>a+b,0)-2)).toBeLessThan(1e-13);
  }
 });
 it('the surface rules reproduce areas and Gauss for a single point charge', () => {
  // A unit test of the machinery, not of the app: a hand-placed 1 nC point charge.
  const q=1e-9,E=(S:V3)=>(p:V3):V3=>{const r=sub(p,S),c=ke*q/len(r)**3;return [c*r[0],c*r[1],c*r[2]];};
  const surfaces:Surface[]=[sphere([0,0,0],2,64,128),box([-1,-1,-1],[1,1,1],48),cylinder([0,0,0],1.5,2,96,48,257)];
  for(const s of surfaces){
   const area=s.patches.reduce((t,c)=>t+c.a,0);
   expect(area,`${s.label}: total area positive`).toBeGreaterThan(0);
   near(flux(E([.3,-.2,.1]),s).net,q/E0,1e-12,`${s.label}: Gauss for an interior point charge`);
   expect(Math.abs(flux(E([9,4,-7]),s).net),`${s.label}: an exterior charge contributes nothing`).toBeLessThan(1e-13*q/E0);
  }
 });
});
// ===========================================================================
// 1. Gauss with everything enclosed.
// ===========================================================================
// Φ = Q/ε₀ = 112.940 9… N m²/C per nC. The only inputs are the slider charge and
// ε₀ typed in above; nothing asks the app what its total charge is.
const L=4,RAD=2; // size = 4 → rod half-length 2, ring/arc/disk radius R = size/2 = 2
const PHI_PER_NC=1e-9/E0;
type Enclosing={layout:Layout;Q(p:Params):number;surfaces():Surface[]};
const ENCLOSING:Partial<Record<ProblemId,Enclosing>>={
 // Rod on the y-axis, |y| < L/2: a cube reaching L on every side leaves the nearest
 // face half a side away from the nearest charge (Bernstein ρ ≥ 1.6, GL48 error < 1e−20).
 bisector:{layout:'wire',Q:p=>p.charge*1e-9,surfaces:()=>[box([-L,-L,-L],[L,L,L],48),box([-3*L,-3*L,-3*L],[3*L,3*L,3*L],48)]},
 // Rod on the x-axis, 0…L: sphere about its midpoint, polar axis along the rod.
 axial:{layout:'wire',Q:p=>p.charge*1e-9,surfaces:()=>[sphere([L/2,0,0],L,64,128,[1,0,0]),sphere([L/2,0,0],3*L,64,128,[1,0,0])]},
 endpoint:{layout:'wire',Q:p=>p.charge*1e-9,surfaces:()=>[sphere([0,L/2,0],L,64,128,[0,1,0]),sphere([0,L/2,0],3*L,64,128,[0,1,0])]},
 // λ₀ in nC/m, so the enclosed charge is λ₀L/2 — the one lesson where the slider is
 // not Q, and the one place a flux test can catch that being forgotten.
 ramp:{layout:'wire',Q:p=>p.charge*1e-9*p.size/2,surfaces:()=>[sphere([0,L/2,0],L,64,128,[0,1,0]),sphere([0,L/2,0],3*L,64,128,[0,1,0])]},
 arc:{layout:'wire',Q:p=>p.charge*1e-9,surfaces:()=>[sphere([0,0,0],2*RAD,64,128),sphere([0,0,0],6*RAD,64,128)]},
 // The disk is summed through cloud(): 16 points per annulus, each carrying dq/16.
 // If cloud gave each of them the whole annulus dq the flux would be 16 × Q/ε₀.
 disk:{layout:'surface',Q:p=>p.charge*1e-9,surfaces:()=>[sphere([0,0,0],2*RAD,64,128),sphere([0,0,0],6*RAD,64,128)]},
 // A coaxial cylinder instead of a sphere, so the ring's flux is measured by a rule
 // with no spherical symmetry to lean on. 257 azimuthal nodes: prime, so the n-fold
 // harmonics of an n-piece ring can never alias onto the mean.
 ring:{layout:'wire',Q:p=>p.charge*1e-9,surfaces:()=>[cylinder([0,0,0],1.5*RAD,RAD,96,48,257),cylinder([0,0,0],3*RAD,3*RAD,96,48,257)]},
};
for(const [v,base] of [['v-ring','ring'],['v-disk','disk'],['v-arc','arc'],['v-rod-bisector','bisector'],['v-rod-axial','axial']] as const)
 ENCLOSING[v]=ENCLOSING[base];
describe('Gauss: the flux of the sampled field through a surface enclosing every piece', () => {
 // Tolerance 1e−9 relative. Quadrature error is not the budget: every sample sits at
 // most 0.6 of the way from the centre to the surface, so the multipole tail after
 // GL64 in μ is ≤ 0.6^128 ≈ 1e−28, the equispaced φ rule annihilates every m ≠ 0
 // harmonic exactly, and the cube's faces stand half a side off the nearest charge.
 // What is left is rounding over ~10⁴ positive terms. 1e−9 is five decades above that
 // and five below the smallest factor a real bug could produce.
 for(const id of Object.keys(ENCLOSING) as ProblemId[]) it(`${id}: Φ = Q/ε₀, independent of surface size, sign and n`,()=>{
  const spec=ENCLOSING[id]!,surfaces=spec.surfaces();
  for(const charge of [1,-1]){
   const p=params({charge,distance:3,size:L,phi:2.3}),Q=spec.Q(p);
   near(Q/E0,charge*(id==='ramp'?L/2:1)*PHI_PER_NC,1e-15,`${id}: Q/ε₀ bookkeeping`);
   for(const n of [5,37,200]){
    assertPartition(id,p,n,spec.layout);
    const pts=appPoints(id,p,n,spec.layout),pieces=asPieces(pts);
    // The premise of Gauss, and the whole of cloud()'s dq conservation: the pieces
    // the figure sums carry the continuum's charge, in coulombs, not nanocoulombs.
    near(totalRef(pieces),Q,1e-12,`${id} n=${n}: Σ dq over the drawn pieces`);
    for(const s of surfaces){
     expect(margin(pieces,s),`${id} n=${n} ${s.label}: every piece strictly inside`).toBeGreaterThan(.9);
     near(flux(E3(pts),s).net,Q/E0,1e-9,`${id} q=${charge}nC n=${n} ${s.label}`);
    }
   }
  }
 },180000);
});
// ===========================================================================
// 2. Gauss with the surface cutting the charge at a bin edge.
// ===========================================================================
// Σdq = Q and "the sum at P converges" cannot tell a dq paired with a neighbouring
// piece's position from a correct pairing, nor a partition drifted by half a bin, nor
// a ramp piece charged at its lower edge instead of its midpoint (λ₀ i L/n²: 3.0
// instead of 4.5 units for the third piece, 33 % off). Put the surface THROUGH an
// interior bin edge and Gauss counts the pieces one by one, exactly where the lesson's
// animation cuts them. A partition drifted by half a bin puts a sample ON the surface:
// the margin precondition below fails first, which is the loud failure we want.
type BinEdge={layout:Layout;n:number;surface():Surface;count:number;enclosed(p:Params):number;why:string};
const BIN_EDGE:Partial<Record<ProblemId,BinEdge>>={
 // Pieces at x = (i+½)L/8; a sphere about the rod's midpoint of radius L/2 − 2L/8 cuts
 // the rod at the 2/8 and 6/8 bin edges. Uniform rod ⇒ the continuum charge between
 // those cuts is 4Q/8, and exactly four midpoints fall inside.
 axial:{layout:'wire',n:8,surface:()=>sphere([L/2,0,0],L/2-2*L/8,128,32,[1,0,0]),count:4,
  enclosed:p=>p.charge*1e-9*4/8,why:'the middle half of a uniform rod'},
 // Pieces at y = (i+½)L/8 on a rod standing at the origin; a sphere at the foot of
 // radius 3L/8 cuts at the 3/8 edge.
 endpoint:{layout:'wire',n:8,surface:()=>sphere([0,0,0],3*L/8,128,32,[0,1,0]),count:3,
  enclosed:p=>p.charge*1e-9*3/8,why:'the lowest three eighths of a uniform rod'},
 // Same cut, ramp density: ∫₀^{3L/8} λ₀ y/L dy = λ₀(3L/8)²/(2L). The midpoint rule is
 // EXACT for a linear density, so the discrete count must hit the continuum on the nose.
 ramp:{layout:'wire',n:8,surface:()=>sphere([0,0,0],3*L/8,128,32,[0,1,0]),count:3,
  enclosed:p=>p.charge*1e-9*(3*p.size/8)**2/(2*p.size),why:'∫₀^{3L/8} λ₀ y/L dy'},
 // Four annuli, cloud points at radius 0.25, 0.75 | 1.25, 1.75; a sphere of radius R/2
 // cuts the disk at the 2/4 edge, so the continuum inside is σπ(R/2)² = Q/4. This is the
 // only test anywhere that asks whether an annulus's dq is the charge between ITS edges.
 disk:{layout:'surface',n:4,surface:()=>sphere([0,0,0],RAD/2,128,257),count:2*PER_RING,
  enclosed:p=>{const R=p.size/2,Rs=R/2;return p.charge*1e-9/(Math.PI*R*R)*Math.PI*Rs*Rs;},why:'σπ(R/2)²'},
 // Eight samples at 22.5° + 45°k: the face x = 0 passes between them (nearest at
 // |x| = R cos 67.5° = 0.765), so the box holds the four with x > 0 — half the ring.
 ring:{layout:'wire',n:8,surface:()=>box([0,-3,-1],[3,3,1],96),count:4,
  enclosed:p=>p.charge*1e-9/2,why:'the half of a uniform ring with x > 0'},
};
for(const [v,base] of [['v-rod-axial','axial'],['v-disk','disk'],['v-ring','ring']] as const)BIN_EDGE[v]=BIN_EDGE[base];
describe('Gauss with the surface cutting the charge at a bin edge', () => {
 // Tolerance 1e−9 relative. The worst charge sits at a/Rs = 0.857 (endpoint/ramp), so
 // the multipole tail after GL128 (exact through degree 255) is Σ(l+1)0.857^l ≈ 1e−14
 // of one piece's flux; the ring's cube has its nearest charge 0.765 off the face
 // x = 0 over half-sides 3 and 1 (Bernstein ρ ≈ 1.36), so GL96 errs by ~1e−26.
 for(const id of Object.keys(BIN_EDGE) as ProblemId[]) it(`${id}: the surface counts exactly the pieces inside it`,()=>{
  const spec=BIN_EDGE[id]!,s=spec.surface();
  for(const charge of [1,-1]){
   const p=params({charge,distance:3,size:L,phi:2.3});
   assertPartition(id,p,spec.n,spec.layout);
   const ref=refPoints(id,p,spec.n,spec.layout);
   // No piece may lie near the surface: a drifted partition would sit on it and the
   // quadrature would explode rather than report a wrong number.
   expect(Math.min(...ref.map(c=>Math.abs(s.depth(c.at)))),`${id}: clearance from ${s.label}`).toBeGreaterThan(.2);
   expect(ref.filter(c=>inside(s,c.at)).length,`${id}: pieces inside ${s.label}`).toBe(spec.count);
   // The pieces inside carry the continuum's charge over the same region — the point
   // of cutting at a bin edge, and a statement about dq, not about any field.
   near(enclosedRef(ref,s),spec.enclosed(p),1e-12,`${id}: enclosed charge (${spec.why})`);
   const pts=appPoints(id,p,spec.n,spec.layout);
   near(flux(E3(pts),s).net,spec.enclosed(p)/E0,1e-9,`${id} q=${charge}nC: Φ through ${s.label}`);
  }
 },120000);
});
// ===========================================================================
// 3. Gauss on the tan-partitioned lessons, through their own Jacobian.
// ===========================================================================
// The infinite line, the half-line and the sheet are the three samplers with no total
// charge to check and no finite domain to bracket. Today they are pinned only by an
// n = 2000 sum at P (which hides an O(1/n²) slip) and by not being NaN. Here the
// expected enclosed charge is built from the lesson's own change of variables —
// θ cut uniformly, Jacobian d sec²θ — and NOT from ChargeSample.dq, so a sec instead
// of a sec², a d instead of a d² in the sheet's Jacobian, or (i)/n instead of (i+½)/n
// changes the answer by 10–70 % at n = 7–8 and is caught either at the partition
// precondition or by the flux itself.
type TanCut={layout:Layout;n:number;p:Params;surface():Surface;count:number};
const TAN_CUT:Record<'infinite'|'semi'|'sheet',TanCut>={
 // Wire on the y-axis, θ_i = (i+½)π/7 − π/2 ⇒ y = 0, ±1.4447, ±3.7619, ±13.144, with
 // dq_i = λ d (π/7) sec²θ_i = 1.3464, 1.6586, 3.4635, 27.191 nC. A sphere of radius 4.3
 // on the wire holds five of the seven: 11.5907 nC, Φ = 1309.06 N m²/C per nC/m.
 infinite:{layout:'wire',n:7,p:params({charge:1,distance:3}),surface:()=>sphere([0,0,0],4.3,256,64,[0,1,0]),count:5},
 // Half-line along +x, θ_i = (2i+1)π/32 ⇒ x = 0.2955, 0.9100, 1.6035, 2.4620 | 3.656 …
 // A sphere of radius 3 at the wire's end holds the first four: (3π/16)Σsec²θ_i =
 // 2.98114 nC, Φ = 336.692 N m²/C per nC/m.
 semi:{layout:'wire',n:8,p:params({charge:1,distance:3}),surface:()=>sphere([0,0,0],3,256,64,[1,0,0]),count:4},
 // Rings at the same radii, spread by cloud(); a pillbox of radius 3 and half-height 1.5
 // holds the first four rings, all 16 points of each: 27.6622 nC, Φ = 3124.19 N m²/C per
 // nC/m² — deliberately NOT the continuum's σπρ² = 28.2743 nC (3193.3). See below.
 sheet:{layout:'surface',n:8,p:params({charge:1,distance:3}),surface:()=>cylinder([0,0,0],3,1.5,64,64,257),count:4*PER_RING},
};
describe('Gauss on the tan-partitioned samplers', () => {
 // Tolerance 1e−9 relative. Sphere ratios a/Rs and Rs/a are ≤ 0.875, so the multipole
 // tail after GL256 (exact through degree 511) is ≤ 1e−26. The pillbox wall's nearest
 // cloud point is 0.538 away over a half-height of 1.5 (Bernstein ρ ≈ 1.42), giving a
 // GL64 error ~3e−20; the cloud's 16-fold harmonics are annihilated exactly by the 257
 // equispaced φ nodes, 257 being prime and never a divisor of 16k.
 for(const id of Object.keys(TAN_CUT) as (keyof typeof TAN_CUT)[]) it(`${id}: Φ = (Jacobian-weighted charge inside)/ε₀`,()=>{
  const spec=TAN_CUT[id],s=spec.surface();
  for(const charge of [1,-1]){
   const p={...spec.p,charge};
   assertPartition(id,p,spec.n,spec.layout);
   const ref=refPoints(id,p,spec.n,spec.layout),Qin=enclosedRef(ref,s);
   expect(Math.min(...ref.map(c=>Math.abs(s.depth(c.at)))),`${id}: clearance from ${s.label}`).toBeGreaterThan(.2);
   expect(ref.filter(c=>inside(s,c.at)).length,`${id}: pieces inside ${s.label}`).toBe(spec.count);
   near(flux(E3(appPoints(id,p,spec.n,spec.layout)),s).net,Qin/E0,1e-9,`${id} ${charge>0?'+':'−'}: Φ through ${s.label}`);
  }
 },120000);
 it('the sheet\'s discrete Gauss law is 2 % short of the continuum, and that is the midpoint error', () => {
  // NOT σπρ²: at n = 8 the tan partition's inner rings hold only 79–98 % of their exact
  // annulus charge, so the enclosed charge is honestly short of the continuum disc of
  // radius 3. Pinning the size of that gap is what stops a "fix" that quietly replaces
  // the lesson's own Riemann sum with the closed form the lesson is supposed to derive.
  const spec=TAN_CUT.sheet,s=spec.surface(),p=spec.p;
  const Qin=enclosedRef(refPoints('sheet',p,spec.n,'surface'),s);
  const continuumRing=p.charge*1e-9*Math.PI*3*3; // σπρ² over the pillbox's own footprint
  const ratio=Qin/continuumRing;
  expect(ratio,`sheet: enclosed/continuum = ${ratio.toFixed(6)}`).toBeGreaterThan(.97);
  expect(ratio,`sheet: enclosed/continuum = ${ratio.toFixed(6)}`).toBeLessThan(.99);
 });
});
// ===========================================================================
// 4. Gauss with nothing inside: ∇·E = 0 where the field is strong and curved.
// ===========================================================================
// This is the only statement that exercises the kernel's exponent and all three
// components TOGETHER at points nothing else looks at. A dropped or duplicated
// component (E_z := E_y, or an in-plane field summed as if z = 0 for a sample off the
// plane) gives ∇·E = Kq(3z² − r²)/r⁵ and a net flux of the order of the gross; so does
// an added uniform or 1/r term. Placed where the field is strong and bending, not in a
// quiet corner where everything is nearly uniform and everything cancels anyway.
const EMPTY:Record<string,{layout:Layout;n:number;p:Params;surface():Surface}>={
 // A unit cube around the bisector's own P, 2.5 from the nearest charge.
 bisector:{layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),surface:()=>box([2.5,-.5,-.5],[3.5,.5,.5],48)},
 // Inside the arc, where the field is emphatically NOT zero (it is the arc's answer)
 // but no charge is enclosed. a/Rs = 2, so the multipole tail is 0.5^128.
 arc:{layout:'wire',n:37,p:params({charge:1,size:L,phi:2.3}),surface:()=>sphere([0,0,0],RAD/2,64,128)},
 disk:{layout:'surface',n:37,p:params({charge:1,distance:3,size:L}),surface:()=>box([-1,-1,1],[1,1,3],48)},
 sheet:{layout:'surface',n:8,p:params({charge:1,distance:3}),surface:()=>box([-1,-1,1],[1,1,3],48)},
 infinite:{layout:'wire',n:37,p:params({charge:1,distance:3}),surface:()=>box([1,-1,-1],[3,1,1],48)},
 // Straddling the ring's axis just above the plane, where the field turns hardest.
 ring:{layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),surface:()=>box([-1,-1,.8],[1,1,2.8],48)},
};
describe('zero net flux where no charge is enclosed', () => {
 // Tolerance |Φ_net| ≤ 1e−12 Φ_gross. Every charge stands at least half a side off every
 // face (Bernstein ρ ≥ 2.4, GL48 error < 1e−30), so the bar is set purely by rounding in
 // the cancellation between opposite faces. Worst achieved: 2.6e−15 (the infinite line,
 // whose far pieces carry enormous dq and cancel across the box), so the bar sits ~400×
 // above the noise — tight enough that a lost component, which lands at 1e−2, is caught
 // with eleven decades to spare.
 for(const id of Object.keys(EMPTY)) it(`${id}: Φ_net = 0 while Φ_gross is not`,()=>{
  const spec=EMPTY[id],s=spec.surface();
  for(const charge of [1,-1]){
   const p={...spec.p,charge},ref=refPoints(id as ProblemId,p,spec.n,spec.layout);
   assertPartition(id as ProblemId,p,spec.n,spec.layout);
   expect(Math.max(...ref.map(c=>s.depth(c.at))),`${id}: every piece outside ${s.label}`).toBeLessThan(-.5);
   const {net,gross}=flux(E3(appPoints(id as ProblemId,p,spec.n,spec.layout)),s);
   expect(gross,`${id}: the surface sits in a real field`).toBeGreaterThan(.1);
   expect(Math.abs(net)/gross,`${id} q=${charge}: Φ_net = ${net.toExponential(4)} against Φ_gross = ${gross.toPrecision(6)}`).toBeLessThan(1e-12);
  }
 },120000);
 it('the arc test really is placed inside a strong field', () => {
  // Not decoration: if the sphere sat where E vanished, Φ_net = 0 would be free. The
  // reference is the exact midpoint sum of the arc — a Dirichlet kernel,
  // Σcos θ_i = sin(φ/2)/sin(φ/2n) with θ_i = (φ/n)(i + ½ − n/2) — so this is a closed
  // form of the DISCRETE arc, not of the continuum, and holds to rounding.
  const spec=EMPTY.arc,p=spec.p,n=spec.n,R=p.size/2,q=p.charge*1e-9,phi=p.phi;
  const want=ke*q*Math.sin(phi/2)/(n*R*R*Math.sin(phi/(2*n)));
  const e=E3(appPoints('arc',p,n,'wire'))([0,0,0]);
  near(len(e),want,1e-12,`|E| at the arc's centre (${want.toPrecision(6)} N/C per nC)`);
  // …and it points back along −x, the way the arc's own closed form says.
  expect(e[0]).toBeLessThan(0);
  expect(Math.hypot(e[1],e[2])).toBeLessThan(1e-12*len(e));
 });
});
// ===========================================================================
// 5. Curl-free: the circulation around closed loops, one of them around a sample.
// ===========================================================================
// Magnitude and radial tests are blind to a rotation or a reflection of the field.
// Swapping (E_x, E_y) gives ∇×E = 3Kq(y² − x²)/r⁵ and a circulation of 0.1–1 × the
// gross; flipping one component's sign gives 6Kq xy/r⁵. Neither changes |E| anywhere.
// One loop deliberately ENCIRCLES a single sample: that proves the discrete field is a
// gradient even where the punctured 2D domain is not simply connected. A magnetic-style
// azimuthal 1/ρ field — which the 2D tracer would happily follow, drawing closed loops
// around the rod and looking almost plausible — gives a constant non-zero Γ there.
const TAU=2*Math.PI;
/** Periodic trapezoid on a circle: Γ = (2πρ/M) Σ E·t̂, and the same rule on |E| for the
 * gross the tolerance is measured against. E·t̂ is analytic and 2π-periodic along the
 * loop, so with every charge at a centre-distance ratio ≥ 1.3 (or ≤ 0.67 for the one
 * inside) the trapezoid error is below e^(−0.75·512) and only rounding is left. */
function circulation(E:(p:V3)=>V3,C:V3,rho:number,u:V3,v:V3,M=512):{net:number;gross:number}{
 let net=0,gross=0;
 for(let k=0;k<M;k++){
  const t=TAU*k/M,c=Math.cos(t),s=Math.sin(t);
  const p:V3=[C[0]+rho*(u[0]*c+v[0]*s),C[1]+rho*(u[1]*c+v[1]*s),C[2]+rho*(u[2]*c+v[2]*s)];
  const tan:V3=[v[0]*c-u[0]*s,v[1]*c-u[1]*s,v[2]*c-u[2]*s],e=E(p);
  net+=dot(e,tan);gross+=len(e);
 }
 return {net:rho*TAU/M*net,gross:rho*TAU/M*gross};
}
/** Half-width of the strip of analyticity of E·t̂ around the real loop angle, which is
 * the ONLY thing the trapezoid's convergence depends on. |P(θ) − S| vanishes where
 * cos(θ − θ_s) = (ρ² + a²)/(2ρ a∥) with a∥ the charge's in-plane offset, so the error
 * decays like e^(−M·arccosh(that)). Asserting this per charge BOUNDS the quadrature
 * instead of guessing at it — and it is not the same as closest approach: a charge the
 * loop passes 0.13 m from can still be exponentially harmless if it sits well outside
 * the circle, which is exactly the situation the encircled-sample loop is built on. */
function loopStrip(C:V3,rho:number,n:V3,S:V3):number{
 const d=sub(S,C),off=Math.abs(dot(d,n)),a2=len(d)**2,apar=Math.sqrt(Math.max(0,a2-off*off));
 if(apar<1e-12)return Number.POSITIVE_INFINITY; // on the loop's axis: no singularity at all
 return Math.acosh((rho*rho+a2)/(2*rho*apar));
}
const perp=(n:V3):[V3,V3]=>{const [a,b]=frame(n);return [a,b];};
type Loop={id:ProblemId;layout:Layout;n:number;p:Params;C:V3;rho:number;normal:V3;plane:boolean;encircled:number};
const X:V3=[0,0,1]; // the 2D lessons all live in z = 0, so their loops have normal ẑ
const LOOPS:Loop[]=[
 {id:'bisector',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),C:[2,1.3,0],rho:1,normal:X,plane:true,encircled:0},
 // n = 8 puts a sample at (0, 0.75); this circle contains it and nothing else — its
 // neighbours at y = 0.25 and 1.25 stand 0.583 from the centre.
 {id:'bisector',layout:'wire',n:8,p:params({charge:1,distance:3,size:L}),C:[.3,.75,0],rho:.45,normal:X,plane:true,encircled:1},
 {id:'endpoint',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),C:[1.5,1,0],rho:.8,normal:X,plane:true,encircled:0},
 {id:'ramp',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),C:[1.5,1,0],rho:.8,normal:X,plane:true,encircled:0},
 {id:'axial',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),C:[L+1.5,1,0],rho:.8,normal:X,plane:true,encircled:0},
 {id:'arc',layout:'wire',n:37,p:params({charge:1,size:L,phi:2.3}),C:[1,.4,0],rho:.6,normal:X,plane:true,encircled:0},
 {id:'infinite',layout:'wire',n:7,p:params({charge:1,distance:3}),C:[2,1,0],rho:1,normal:X,plane:true,encircled:0},
 {id:'semi',layout:'wire',n:8,p:params({charge:1,distance:3}),C:[1.5,1.5,0],rho:.7,normal:X,plane:true,encircled:0},
 // Tilted out of every symmetry plane the ring has, so all three components matter.
 {id:'ring',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),C:[2.5,.4,.6],rho:.5,normal:unit([1,1,1]),plane:false,encircled:0},
 {id:'disk',layout:'surface',n:37,p:params({charge:1,distance:3,size:L}),C:[1.2,.3,1],rho:.5,normal:unit([0,1,1]),plane:false,encircled:0},
 {id:'sheet',layout:'surface',n:8,p:params({charge:1,distance:3}),C:[1.2,.3,1],rho:.5,normal:unit([0,1,1]),plane:false,encircled:0},
];
describe('the circulation of the sampled field around closed loops vanishes', () => {
 // Tolerance |Γ| ≤ 1e−13 Γ_gross: the trapezoid truncation is astronomically below that
 // (the analyticity strip asserted per loop bounds it by e^(−0.2·512)), so the bar is
 // rounding over 512 terms. Worst achieved across every loop: 1.9e−16, so the bar sits
 // ~500× above the noise, while the rotations and reflections it exists to catch land
 // at 1e−2 and above — see the mutation block at the foot of the file.
 for(const loop of LOOPS) it(`${loop.id} n=${loop.n}: Γ = 0 on a circle ρ=${loop.rho} at (${at(loop.C)})${loop.encircled?' around one sample':''}`,()=>{
  const [u,v]=perp(loop.normal);
  for(const charge of [1,-1]){
   const p={...loop.p,charge};
   assertPartition(loop.id,p,loop.n,loop.layout);
   const pts=appPoints(loop.id,p,loop.n,loop.layout),ref=asPieces(pts);
   // How many charges the loop encircles, and how analytic E·t̂ is along it.
   const inLoop=ref.filter(c=>len(sub(c.at,loop.C))<loop.rho).length;
   expect(inLoop,`${loop.id} n=${loop.n}: charges inside the loop`).toBe(loop.encircled);
   const strip=Math.min(...ref.map(c=>loopStrip(loop.C,loop.rho,loop.normal,c.at)));
   // > 0.2 ⇒ trapezoid truncation below e^(−0.2·512) ≈ 1e−45; rounding is all that is left.
   expect(strip,`${loop.id} n=${loop.n}: analyticity strip ${strip.toFixed(4)}`).toBeGreaterThan(.2);
   const fields:[string,(q:V3)=>V3][]=loop.plane?[['planeField',E2(pts)],['spaceField',E3(pts)]]:[['spaceField',E3(pts)]];
   for(const [name,E] of fields){
    const {net,gross}=circulation(E,loop.C,loop.rho,u,v);
    expect(gross,`${loop.id}: the loop sits in a real field`).toBeGreaterThan(1e-3);
    expect(Math.abs(net)/gross,`${loop.id} n=${loop.n} ${name} q=${charge}: Γ = ${net.toExponential(4)} against Γ_gross = ${gross.toPrecision(6)}`).toBeLessThan(1e-13);
   }
  }
 },60000);
});
// ===========================================================================
// 6. One conservative field: the on-axis closed form and the off-axis sampled
//    field have to close a rectangle.
// ===========================================================================
// Nothing in the suite compares the OFF-AXIS 2D/3D sampled field with any lesson's
// closed form — the drawn field is checked for shape and for its value at P, both of
// which sit on a symmetry axis. Take a rectangle with one side on that axis, where the
// potential difference is the lesson's own textbook V, and three sides off it where
// only the sampled field exists. Curl-freeness (case 5) forces the three off-axis sides
// to sum to V(end) − V(start) of the axis side. That catches an off-axis radial
// component of the wrong sign or size, a K that differs between spaceField and the
// closed forms, a ring or disk built in the wrong plane, and a cloud whose points sit
// at the wrong radius — the last being invisible to Gauss (any radius inside the
// surface still gives Q/ε₀) and to the circulation test.
/** ∫E·dl along one straight side, GL-m. On sides whose nearest charge is ≥ 1 m away
 * (asserted below) the Bernstein ratio is ≥ 2.4 and GL64 is exact to ~1e−30. */
function lineIntegral(E:(p:V3)=>V3,a:V3,b:V3,m=64):number{
 const {x,w}=gauss(m),d=sub(b,a);let s=0;
 for(let i=0;i<m;i++){const t=(x[i]+1)/2;s+=w[i]*dot(E([a[0]+d[0]*t,a[1]+d[1]*t,a[2]+d[2]*t]),d)/2;}
 return s;
}
const sideNodes=(a:V3,b:V3,m=64):V3[]=>{const {x}=gauss(m),d=sub(b,a);return x.map(xi=>{const t=(xi+1)/2;return [a[0]+d[0]*t,a[1]+d[1]*t,a[2]+d[2]*t] as V3;});};
type Rect={layout:Layout;n:number;p:Params;plane:boolean;corners:[V3,V3,V3,V3];V(p:Params,at:V3):number;tol:number};
const RECT:Partial<Record<ProblemId,Rect>>={
 // Rod on the y-axis: the perpendicular bisector is the x-axis, where
 // V(r) = 2kλ asinh(L/2r) with λ = Q/L (Knight/Serway, the ln form written as asinh).
 bisector:{layout:'wire',n:4000,p:params({charge:1,distance:3,size:L}),plane:true,
  corners:[[1,0,0],[3,0,0],[3,2,0],[1,2,0]],tol:1e-7,
  V:(p,at)=>2*ke*(p.charge*1e-9/p.size)*Math.asinh(p.size/(2*at[0]))},
 // Rod on the x-axis 0…L: beyond its end V(a) = kλ ln((L+a)/a), a = x − L.
 axial:{layout:'wire',n:4000,p:params({charge:1,distance:3,size:L}),plane:true,
  corners:[[L+1,0,0],[L+3,0,0],[L+3,2,0],[L+1,2,0]],tol:1e-6,
  V:(p,at)=>ke*(p.charge*1e-9/p.size)*Math.log(at[0]/(at[0]-p.size))},
 // Ring: V(z) = kQ/√(R²+z²) on the axis.
 ring:{layout:'wire',n:2000,p:params({charge:1,distance:3,size:L}),plane:false,
  corners:[[0,0,1],[0,0,3],[1,0,3],[1,0,1]],tol:1e-13,
  V:(p,at)=>ke*p.charge*1e-9/Math.hypot(p.size/2,at[2])},
 // Disk: V(z) = (2kQ/R²)(√(R²+z²) − |z|) on the axis. The off-axis side runs at ρ = 1,
 // inside the rim (R = 2) but above the plane, so it never touches the charge.
 disk:{layout:'surface',n:2000,p:params({charge:1,distance:3,size:L}),plane:false,
  corners:[[0,0,2],[0,0,4],[1,0,4],[1,0,2]],tol:1e-6,
  V:(p,at)=>{const R=p.size/2;return 2*ke*p.charge*1e-9/(R*R)*(Math.hypot(R,at[2])-Math.abs(at[2]));}},
};
for(const [v,base] of [['v-rod-bisector','bisector'],['v-rod-axial','axial'],['v-ring','ring'],['v-disk','disk']] as const)RECT[v]=RECT[base];
describe('the rectangle between an on-axis closed form and the off-axis sampled field', () => {
 // Tolerances 1e−7 (bisector), 1e−6 (axial, disk), 1e−13 (ring) — looser than the flux
 // tests for one reason only: the sampled field is a Riemann sum, so the rectangle can
 // only close on the CONTINUUM's ΔV to the sampler's own accuracy. The rods' sum is a
 // midpoint rule of spacing L/4000 = 0.001 at distances ≥ 1; the disk adds a radial
 // midpoint rule and its 16-point cloud's m = 16 azimuthal ripple; the ring's sum is a
 // periodic trapezoid and is exponentially exact, so it closes to rounding. Measured
 // with the n above: bisector 6.9e−9, axial 4.8e−8, disk 3.0e−8, ring 2.9e−16 — each
 // bar sits 10–300× above what is achieved, and orders below the smallest wrong radial
 // component that could hide behind it. The quadrature is not the limit: GL64 on sides
 // whose nearest charge is ≥ 1 m away (asserted) is exact to ~1e−30.
 for(const id of Object.keys(RECT) as ProblemId[]) it(`${id}: the three off-axis sides equal ΔV along the axis`,()=>{
  const r=RECT[id]!,[a,b,c,d]=r.corners;
  for(const charge of [1,-1]){
   const p={...r.p,charge};
   assertPartition(id,p,r.n,r.layout);
   const pts=appPoints(id,p,r.n,r.layout),ref=asPieces(pts);
   const sides:[V3,V3][]=[[b,c],[c,d],[d,a]];
   let clear=Infinity;
   for(const [u,v] of sides)for(const q of sideNodes(u,v))for(const e of ref)clear=Math.min(clear,len(sub(q,e.at)));
   expect(clear,`${id}: the off-axis sides stay clear of the charge (${clear.toFixed(4)} m)`).toBeGreaterThan(.9);
   const E=E3(pts);
   const walked=sides.reduce((t,[u,v])=>t+lineIntegral(E,u,v),0);
   const want=r.V(p,b)-r.V(p,a);
   near(walked,want,r.tol,`${id} q=${charge}nC: ∮ closes (want ΔV = ${want.toPrecision(8)} V)`);
   // In the plane the flat view draws, planeField must agree with spaceField side for side.
   if(r.plane)near(sides.reduce((t,[u,v])=>t+lineIntegral(E2(pts),u,v),0),walked,1e-13,`${id}: planeField vs spaceField along the same sides`);
  }
 },120000);
});
// ===========================================================================
// 7. E = −∇V at generic off-axis points.
// ===========================================================================
// The single-point Coulomb test pins the kernel for ONE sample in a handful of
// directions. This pins the accumulation over many samples, and cloud()'s spread, in
// every component, at points off every symmetry axis — below the plane, behind an open
// rod, past a rod's far end — against a SCALAR that involves no vector bookkeeping at
// all. A dq paired with a neighbour's position, a cloud ring at a scaled radius, or a
// lost z-component would pass Gauss (any position inside the surface gives Q/ε₀) and
// pass the sums at P, and fail here. It is also the only off-axis check of any kind on
// the infinite, semi and sheet samplers.
/** Richardson-extrapolated central difference: D(h) = [V(P+h) − V(P−h)]/2h has error
 * h²V‴/6 + h⁴V⁽⁵⁾/120, and (4D(h/2) − D(h))/3 kills the h² term. With h = 1e−3 × the
 * distance to the nearest charge the truncation is ~(h/r)⁴ ≈ 1e−12 and the rounding in
 * the difference is ε·V/(h|E|) ≈ ε·r/h ≈ 1e−13, both under the 1e−9 bar. */
function gradV(V:(p:V3)=>number,P:V3,h:number):V3{
 const g:V3=[0,0,0];
 for(let a=0;a<3;a++){
  const D=(step:number)=>{const u:V3=[...P],d:V3=[...P];u[a]+=step;d[a]-=step;return (V(u)-V(d))/(2*step);};
  g[a]=(4*D(h/2)-D(h))/3;
 }
 return g;
}
const Vof=(pieces:readonly Piece[])=>(P:V3)=>pieces.reduce((s,c)=>s+ke*c.q/len(sub(P,c.at)),0);
type GradCase={id:ProblemId;layout:Layout;n:number;p:Params;plane:boolean;points:V3[]};
const GRAD:GradCase[]=[
 // Above the plane, out near the rim, and BELOW the plane — where a lost or copied
 // z-component changes the answer and no other test looks.
 {id:'ring',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),plane:false,points:[[1.1,.7,1.9],[2.3,-.4,.2],[.4,-1.6,-1.5]]},
 {id:'v-ring',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),plane:false,points:[[1.1,.7,1.9],[2.3,-.4,.2]]},
 {id:'disk',layout:'surface',n:37,p:params({charge:1,distance:3,size:L}),plane:false,points:[[.9,.5,1.2],[2.6,.1,-.8]]},
 {id:'v-disk',layout:'surface',n:37,p:params({charge:1,distance:3,size:L}),plane:false,points:[[.9,.5,1.2],[2.6,.1,-.8]]},
 {id:'sheet',layout:'surface',n:8,p:params({charge:1,distance:3}),plane:false,points:[[.5,.2,1.5]]},
 // (−0.8, 2.6) is BEHIND the rod and past its top end: nothing about it is symmetric.
 {id:'bisector',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),plane:true,points:[[1.7,1.1,0],[-.8,2.6,0]]},
 {id:'endpoint',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),plane:true,points:[[-1.2,.9,0],[.8,4.6,0]]},
 {id:'ramp',layout:'wire',n:37,p:params({charge:1,distance:3,size:L}),plane:true,points:[[-1.2,.9,0],[.8,4.6,0]]},
 {id:'arc',layout:'wire',n:37,p:params({charge:1,size:L,phi:2.3}),plane:true,points:[[1.4,-.6,0]]},
 {id:'infinite',layout:'wire',n:7,p:params({charge:1,distance:3}),plane:true,points:[[2,1,0]]},
 {id:'semi',layout:'wire',n:8,p:params({charge:1,distance:3}),plane:true,points:[[1.5,1.5,0]]},
];
describe('E = −∇V of the same pieces, at points off every symmetry axis', () => {
 for(const g of GRAD) it(`${g.id} n=${g.n}: spaceField = −∇V, component by component`,()=>{
  for(const charge of [1,-1]){
   const p={...g.p,charge};
   assertPartition(g.id,p,g.n,g.layout); // the potential below is built from MY partition
   const ref=refPoints(g.id,p,g.n,g.layout),pts=appPoints(g.id,p,g.n,g.layout),V=Vof(ref);
   for(const P of g.points){
    const nearest=Math.min(...ref.map(c=>len(sub(P,c.at))));
    const e=E3(pts)(P),grad=gradV(V,P,1e-3*nearest);
    expect(len(e),`${g.id} at (${at(P)}): a real field to compare against`).toBeGreaterThan(1e-3);
    const err=len([e[0]+grad[0],e[1]+grad[1],e[2]+grad[2]]);
    expect(err/len(e),`${g.id} q=${charge} at (${at(P)}): E = (${at(e)}), −∇V = (${at(grad.map(c=>-c))})`).toBeLessThan(1e-9);
    if(g.plane){
     // planeField is what the flat view traces; it must be the same two components.
     const f=E2(pts)(P);
     expect(Math.hypot(f[0]+grad[0],f[1]+grad[1])/len(e),`${g.id} planeField at (${at(P)})`).toBeLessThan(1e-9);
     expect(Math.hypot(f[0]-e[0],f[1]-e[1]),`${g.id}: planeField vs spaceField at z = 0`).toBeLessThan(1e-13*len(e));
     expect(Math.abs(e[2]),`${g.id}: a planar lesson has no E_z`).toBeLessThan(1e-13*len(e));
    }
   }
  }
 },60000);
});
// ===========================================================================
// Are these theorems actually load-bearing?
// ===========================================================================
// A flux that comes out right for the wrong reason is worth nothing, so the rules above
// are aimed at deliberately broken kernels — written HERE, over the app's own
// ChargeSample array — and each has to fail. The harness is first shown to reproduce
// spaceField bit for bit, so a mutant's failure is evidence about the real accumulator
// and not about this scaffolding.
type Kernel=(dq:number,d:V3)=>V3; // d = P − S, the displacement from source to field point
const honest:Kernel=(dq,d)=>{const c=ke*dq/len(d)**3;return [c*d[0],c*d[1],c*d[2]];};
describe('the integral theorems are not vacuous', () => {
 const p=params({charge:1,distance:3,size:L}),pts=sampleDistribution('ring',p,37),Q=1e-9;
 const build=(k:Kernel,src:readonly {q:number;at:V3}[])=>(P:V3):V3=>{
  let x=0,y=0,z=0;
  for(const s of src){const e=k(s.q,sub(P,s.at));x+=e[0];y+=e[1];z+=e[2];}
  return [x,y,z];
 };
 const ringPieces=asPieces(pts);
 it('the mutant harness is the app accumulator', () => {
  for(const P of [[1.5,.3,.8],[0,0,2.2],[-3,1,-1]] as V3[]){
   const mine=build(honest,ringPieces)(P),app=E3(pts)(P);
   expect(len(sub(mine,app)),`harness vs spaceField at (${at(P)})`).toBeLessThan(1e-13*len(app));
  }
 });
 it('a wrong constant, a nC→C slip, a sign slip or a 16× cloud all break Gauss', () => {
  const small=cylinder([0,0,0],1.5*RAD,RAD,96,48,257),truth=Q/E0;
  const ratio=(k:Kernel,src=ringPieces)=>flux(build(k,src),small).net/truth;
  expect(Math.abs(ratio((dq,d)=>{const c=dq/len(d)**3;return [c*d[0],c*d[1],c*d[2]];})-1),'K → 1').toBeGreaterThan(.9);
  expect(Math.abs(ratio((dq,d)=>honest(dq*1e9,d))-1),'dq left in nC').toBeGreaterThan(1e8);
  expect(Math.abs(ratio((dq,d)=>honest(dq,[-d[0],-d[1],-d[2]]))-1),'(S − P) instead of (P − S)').toBeGreaterThan(1.9);
  // cloud() handing each of its 16 points the WHOLE annulus dq: 16 × Q/ε₀.
  const fat=refCloud(refPieces('disk',p,37)).map(c=>({q:c.q*PER_RING,at:c.at}));
  const s=sphere([0,0,0],2*RAD,64,128);
  near(flux(build(honest,fat),s).net,PER_RING*truth,1e-9,'a cloud that does not divide dq');
 });
 it('a wrong r-exponent survives one surface and not two', () => {
  // 1/r³ instead of 1/r²: still radial, still finite, still "looks like" a field — but
  // it is no longer divergence-free, so the flux depends on the surface's size.
  const cube:Kernel=(dq,d)=>{const c=ke*dq/len(d)**4;return [c*d[0],c*d[1],c*d[2]];};
  const a=flux(build(cube,ringPieces),cylinder([0,0,0],1.5*RAD,RAD,96,48,257)).net;
  const b=flux(build(cube,ringPieces),cylinder([0,0,0],3*RAD,3*RAD,96,48,257)).net;
  expect(Math.abs(a/b-1),`1/r³ flux: small ${a.toPrecision(6)} vs large ${b.toPrecision(6)}`).toBeGreaterThan(.1);
 });
 it('a swapped or dropped component breaks the circulation and the empty-box flux', () => {
  const rod=asPieces(sampleDistribution('bisector',params({charge:1,distance:3,size:L}),37));
  const swap:Kernel=(dq,d)=>{const e=honest(dq,d);return [e[1],e[0],e[2]];};
  const [u,v]=perp([0,0,1] as V3);
  const g=circulation(build(swap,rod),[2,1.3,0],1,u,v);
  expect(Math.abs(g.net)/g.gross,`swapped E_x/E_y: Γ = ${g.net.toPrecision(6)}`).toBeGreaterThan(.01);
  // …while the honest field on the same loop is zero, which is the contrast that matters.
  const h=circulation(build(honest,rod),[2,1.3,0],1,u,v);
  expect(Math.abs(h.net)/h.gross).toBeLessThan(1e-13);
  const lost:Kernel=(dq,d)=>{const e=honest(dq,d);return [e[0],e[1],e[1]];};
  const empty=box([-1,-1,.8],[1,1,2.8],48),src=asPieces(sampleDistribution('ring',p,37));
  const bad=flux(build(lost,src),empty),ok=flux(build(honest,src),empty);
  expect(Math.abs(bad.net)/bad.gross,`E_z := E_y: Φ_net/Φ_gross = ${(bad.net/bad.gross).toExponential(3)}`).toBeGreaterThan(.01);
  expect(Math.abs(ok.net)/ok.gross).toBeLessThan(1e-12);
 });
});
