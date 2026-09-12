import {describe,it,expect,afterAll} from 'vitest';
import {field,potential,magnitude,sampleLimit,K,EPS0,type Vec} from '../src/symbolic/physics';
import {getProblem,PROBLEMS} from '../src/problems/definitions';
import {safeParse} from '../src/symbolic/equivalence';
import {sampleDistribution,sumSamples,sumInterval} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../src/problems/types';
// ---------------------------------------------------------------------------
// A second opinion on all fifteen lessons, written from Coulomb's law and the
// setup text alone. Nothing below calls src/distributions: every reference
// number is an ADAPTIVE Simpson integral of k dq r̂ / r² built here, so a bug in
// the app's own partition or quadrature cannot launder itself into the truth.
// tests/ground-truth.test.ts already checks the same closed forms with FIXED
// panels and octave-doubled tails; this file deliberately differs — error-driven
// bisection, a sinh sweep for the unbounded coordinates, a periodic trapezoid
// around each annulus — so the two agree only where the physics is right.
// ---------------------------------------------------------------------------
type V3=[number,number,number];
const E0=8.8541878128e-12,ke=1/(4*Math.PI*E0); // CODATA ε₀, re-entered by hand rather than imported.
const zero=():V3=>[0,0,0];
const plus=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const times=(a:V3,c:number):V3=>[a[0]*c,a[1]*c,a[2]*c];
const norm=(a:V3)=>Math.hypot(a[0],a[1],a[2]);
const vecOf=(v:Vec):V3=>[v.x,v.y,v.z];
/** Coulomb's law for a point charge q at S, read at P. The only physics input in this file. */
function coulomb(q:number,S:V3,P:V3):V3{const dx=P[0]-S[0],dy=P[1]-S[1],dz=P[2]-S[2],r3=Math.hypot(dx,dy,dz)**3;return [ke*q*dx/r3,ke*q*dy/r3,ke*q*dz/r3];}
const coulombV=(q:number,S:V3,P:V3)=>ke*q/Math.hypot(P[0]-S[0],P[1]-S[1],P[2]-S[2]);
/** Adaptive Simpson with Richardson extrapolation. `eps` is ABSOLUTE: callers pass a
 * fraction of the field scale the geometry obviously has, never a fraction of one
 * component, or a component that symmetry annihilates would drive the bisection to
 * the depth limit chasing zero. */
function adaptive(g:(t:number)=>number,a:number,b:number,eps:number):number{
 const panel=(lo:number,hi:number,flo:number,fm:number,fhi:number)=>(hi-lo)/6*(flo+4*fm+fhi);
 const refine=(lo:number,hi:number,flo:number,fm:number,fhi:number,whole:number,tol:number,depth:number):number=>{
  const m=(lo+hi)/2,left=(lo+m)/2,right=(m+hi)/2,fl=g(left),fr=g(right);
  const l=panel(lo,m,flo,fl,fm),r=panel(m,hi,fm,fr,fhi),delta=l+r-whole;
  if(depth===0||Math.abs(delta)<=15*tol)return l+r+delta/15;
  return refine(lo,m,flo,fl,fm,l,tol/2,depth-1)+refine(m,hi,fm,fr,fhi,r,tol/2,depth-1);
 };
 const fa=g(a),fb=g(b),fm=g((a+b)/2);
 return refine(a,b,fa,fm,fb,panel(a,b,fa,fm,fb),eps,30);
}
/** One cached evaluation per node: the three component passes walk the same tree. */
const memo=(g:(t:number)=>V3)=>{const seen=new Map<number,V3>();return (t:number)=>{const hit=seen.get(t);if(hit)return hit;const v=g(t);seen.set(t,v);return v;};};
/** Vector integral over a chain of breakpoints. The breakpoints are placed by hand at
 * the peaks (y = 0 on a bisector, u = 0 on a sinh sweep) so the first Simpson panel
 * cannot step over the only part of the rod that matters. */
function seg(g:(t:number)=>V3,breaks:number[],eps:number):V3{
 const f=memo(g),share=eps/(breaks.length-1);let sum=zero();
 for(let i=0;i<breaks.length-1;i++)sum=plus(sum,[0,1,2].map(c=>adaptive(t=>f(t)[c],breaks[i],breaks[i+1],share)) as V3);
 return sum;
}
const segS=(g:(t:number)=>number,breaks:number[],eps:number)=>seg(t=>[g(t),0,0],breaks,eps)[0];
// Every unbounded integrand here falls off at least as fast as 1/y², so under
// y = c sinh u it decays like e^(−u): truncating at u = 45 throws away 3e−20 of it.
const SINH=[0,.5,1,2,3,5,8,13,21,32,45];
const halfLine=(f:(y:number)=>V3,c:number,eps:number)=>seg(u=>times(f(c*Math.sinh(u)),c*Math.cosh(u)),SINH,eps);
const wholeLine=(f:(y:number)=>V3,c:number,eps:number)=>plus(halfLine(f,c,eps),halfLine(y=>f(-y),c,eps));
// A disk or a sheet is swept as annuli, but the ring itself is summed as points on a
// periodic trapezoid: nothing here is told that the transverse parts cancel, so they
// have to cancel on their own or the test fails.
const AZ=48;
const ringOf=(dq:number,s:number,P:V3):V3=>{let sum=zero();for(let j=0;j<AZ;j++){const t=2*Math.PI*(j+.5)/AZ;sum=plus(sum,coulomb(dq/AZ,[s*Math.cos(t),s*Math.sin(t),0],P));}return sum;};
const ringVOf=(dq:number,s:number,P:V3):number=>{let sum=0;for(let j=0;j<AZ;j++){const t=2*Math.PI*(j+.5)/AZ;sum+=coulombV(dq/AZ,[s*Math.cos(t),s*Math.sin(t),0],P);}return sum;};
const annulus=(sigma:number,s:number,P:V3)=>ringOf(sigma*2*Math.PI*s,s,P);
const annulusV=(sigma:number,s:number,P:V3)=>ringVOf(sigma*2*Math.PI*s,s,P);
const REL=1e-12;
// Every smooth closed-form comparison below is held to this. The worst error actually
// seen across all fifteen lessons is 6e−13 (the end-on rod's E_y, where 1/r − 1/√(r²+L²)
// cancels two digits away), so the bar sits two decades above the noise and three below
// anything a wrong factor could survive. Run with INDEP_REPORT=1 to print the achieved errors.
const TOL=1e-10;
// ---------------------------------------------------------------------------
// The ten geometries, each transcribed from its own setup sentence. `eps` is a part in
// 10¹² of the order of magnitude the answer obviously has — it only sizes the tolerance,
// so it may be generous, but it must never be zero or the bisection never terminates.
// ---------------------------------------------------------------------------
type Geom={P(p:Params):V3;E(p:Params):V3;V?(p:Params):number;centroid(p:Params):V3|null;component:'x'|'z';total(p:Params):number};
const GEOMETRY:Record<string,Geom>={
 // 'A thin rod of length L … lies on the y-axis, centered at the origin … P = (r, 0).'
 bisector:{P:p=>[p.distance,0,0],component:'x',total:p=>p.charge*1e-9,centroid:()=>[0,0,0],
  E(p){const q=p.charge*1e-9,L=p.size,P=this.P(p),eps=ke*Math.abs(q)/p.distance**2*REL;return seg(y=>coulomb(q/L,[0,y,0],P),[-L/2,0,L/2],eps);},
  V(p){const q=p.charge*1e-9,L=p.size,P=this.P(p),eps=ke*Math.abs(q)/p.distance*REL;return segS(y=>coulombV(q/L,[0,y,0],P),[-L/2,0,L/2],eps);}},
 // 'A positive rod runs from x = 0 to x = L. Point P is at x = L + a.'
 axial:{P:p=>[p.size+p.distance,0,0],component:'x',total:p=>p.charge*1e-9,centroid:p=>[p.size/2,0,0],
  E(p){const q=p.charge*1e-9,L=p.size,P=this.P(p),eps=ke*Math.abs(q)/p.distance**2*REL;return seg(x=>coulomb(q/L,[x,0,0],P),[0,L/2,L],eps);},
  V(p){const q=p.charge*1e-9,L=p.size,P=this.P(p),eps=ke*Math.abs(q)/p.distance*REL;return segS(x=>coulombV(q/L,[x,0,0],P),[0,L/2,L],eps);}},
 // 'An infinite positive line of density λ lies on the y-axis. P = (r, 0).' The charge
 // slider is λ itself, so there is no total and no absolute potential.
 infinite:{P:p=>[p.distance,0,0],component:'x',total:()=>Number.NaN,centroid:()=>[0,0,0],
  E(p){const lam=p.charge*1e-9,P=this.P(p),eps=2*ke*Math.abs(lam)/Math.abs(p.distance)*REL;return wholeLine(y=>coulomb(lam,[0,y,0],P),Math.abs(p.distance),eps);}},
 // 'A ring of radius R and positive charge Q lies in the xy-plane. P … (0, 0, z).'
 ring:{P:p=>[0,0,p.distance],component:'z',total:p=>p.charge*1e-9,centroid:()=>[0,0,0],
  E(p){const q=p.charge*1e-9,R=p.size/2,P=this.P(p),eps=ke*Math.abs(q)/(R*R+p.distance**2)*REL;
   return seg(t=>coulomb(q/(2*Math.PI),[R*Math.cos(t),R*Math.sin(t),0],P),[0,Math.PI/2,Math.PI,3*Math.PI/2,2*Math.PI],eps);},
  V(p){const q=p.charge*1e-9,R=p.size/2,P=this.P(p),eps=ke*Math.abs(q)/Math.hypot(R,p.distance)*REL;
   return segS(t=>coulombV(q/(2*Math.PI),[R*Math.cos(t),R*Math.sin(t),0],P),[0,Math.PI/2,Math.PI,3*Math.PI/2,2*Math.PI],eps);}},
 // 'A disk of radius R … σ = Q/(πR²). P = (0, 0, z).'
 disk:{P:p=>[0,0,p.distance],component:'z',total:p=>p.charge*1e-9,centroid:()=>[0,0,0],
  E(p){const R=p.size/2,sigma=p.charge*1e-9/(Math.PI*R*R),P=this.P(p),eps=Math.abs(sigma)/(2*E0)*REL;return seg(s=>annulus(sigma,s,P),[0,R/2,R],eps);},
  V(p){const R=p.size/2,sigma=p.charge*1e-9/(Math.PI*R*R),P=this.P(p),eps=Math.abs(sigma)*R/(2*E0)*REL;return segS(s=>annulusV(sigma,s,P),[0,R/2,R],eps);}},
 // 'Positive uniform density λ extends from x = 0 to +∞. P = (0, r).'
 semi:{P:p=>[0,p.distance,0],component:'x',total:()=>Number.NaN,centroid:()=>null,
  E(p){const lam=p.charge*1e-9,P=this.P(p),eps=ke*Math.abs(lam)/Math.abs(p.distance)*REL;return halfLine(x=>coulomb(lam,[x,0,0],P),Math.abs(p.distance),eps);}},
 // 'An arc of radius R … spans −φ/2 ≤ θ ≤ +φ/2 … P is the center of curvature.'
 arc:{P:()=>[0,0,0],component:'x',total:p=>p.charge*1e-9,centroid:p=>[p.size/2*Math.sin(p.phi/2)/(p.phi/2),0,0],
  E(p){const q=p.charge*1e-9,R=p.size/2,P=this.P(p),eps=ke*Math.abs(q)/(R*R)*REL;
   return seg(t=>coulomb(q/p.phi,[R*Math.cos(t),R*Math.sin(t),0],P),[-p.phi/2,0,p.phi/2],eps);},
  V(p){const q=p.charge*1e-9,R=p.size/2,P=this.P(p),eps=ke*Math.abs(q)/R*REL;
   return segS(t=>coulombV(q/p.phi,[R*Math.cos(t),R*Math.sin(t),0],P),[-p.phi/2,0,p.phi/2],eps);}},
 // 'A uniform, isolated, nonconducting infinite sheet … positive surface density σ.'
 sheet:{P:p=>[0,0,p.distance],component:'z',total:()=>Number.NaN,centroid:()=>[0,0,0],
  E(p){const sigma=p.charge*1e-9,P=this.P(p),a=Math.abs(p.distance),eps=Math.abs(sigma)/(2*E0)*REL;
   return seg(u=>times(annulus(sigma,a*Math.sinh(u),P),a*Math.cosh(u)),SINH,eps);}},
 // 'A thin rod … stands on the x-axis, running from y = 0 up to y = L. P … (r, 0).'
 endpoint:{P:p=>[p.distance,0,0],component:'x',total:p=>p.charge*1e-9,centroid:p=>[0,p.size/2,0],
  E(p){const q=p.charge*1e-9,L=p.size,P=this.P(p),eps=ke*Math.abs(q)/p.distance**2*REL;return seg(y=>coulomb(q/L,[0,y,0],P),[0,L/2,L],eps);}},
 // 'λ(y) = λ₀ y/L, zero at the lower end and λ₀ at the top … total charge is Q = λ₀L/2.'
 ramp:{P:p=>[p.distance,0,0],component:'x',total:p=>p.charge*1e-9*p.size/2,centroid:p=>[0,2*p.size/3,0],
  E(p){const l0=p.charge*1e-9,L=p.size,P=this.P(p),eps=ke*Math.abs(l0)*L/2/p.distance**2*REL;return seg(y=>coulomb(l0*y/L,[0,y,0],P),[0,L/2,L],eps);}},
};
/** Which charge layout each lesson sits on, read off its own setup sentence. Asserted
 * against the app's declaration below rather than taken from it. */
const GEOM_OF:Record<string,string>={bisector:'bisector',axial:'axial',infinite:'infinite',ring:'ring',disk:'disk',semi:'semi',arc:'arc',sheet:'sheet',endpoint:'endpoint',ramp:'ramp',
 'v-ring':'ring','v-disk':'disk','v-arc':'arc','v-rod-bisector':'bisector','v-rod-axial':'axial'};
const FIELD_IDS=['bisector','axial','infinite','ring','disk','semi','arc','sheet','endpoint','ramp'] as const;
const POTENTIAL_IDS=['v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial'] as const;
const truthE=(id:string,p:Params)=>GEOMETRY[GEOM_OF[id]].E(p);
const truthV=(id:string,p:Params)=>GEOMETRY[GEOM_OF[id]].V!(p);
const params=(extra:Partial<Params>={}):Params=>({...DEFAULT_PARAMS,...extra});
// Four settings, not one: charge sign, distance, rod length and opening angle all move,
// so a factor hiding inside a fixed L or a fixed φ has nowhere left to sit.
const SETTINGS:Partial<Params>[]=[
 {charge:2.4,distance:.8,size:3.8,phi:2.3},
 {charge:-1.7,distance:3,size:1.1,phi:.4},
 {charge:.35,distance:7.5,size:9.2,phi:5.9},
 {charge:-4.2,distance:1.9,size:.25,phi:Math.PI},
];
const worst=new Map<string,number>();
const record=(what:string,error:number)=>{if(Number.isFinite(error)&&error>(worst.get(what)??-1))worst.set(what,error);};
// stderr, not console.log: vitest swallows console output written from a hook.
afterAll(()=>{if(process.env.INDEP_REPORT)process.stderr.write('\n'+[...worst].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k.padEnd(52)} ${v.toExponential(2)}`).join('\n')+'\n');});
function closeVec(got:Vec,want:V3,tol:number,what:string){
 const scale=Math.max(norm(want),Number.MIN_VALUE);
 for(const [i,axis] of (['x','y','z'] as const).entries()){
  const error=Math.abs(got[axis]-want[i])/scale;record(what,error);
  expect(error,`${what} ${axis}: closed form ${got[axis]}, independent integral ${want[i]}`).toBeLessThan(tol);
 }
}
function closeNum(got:number,want:number,tol:number,what:string){
 const error=Math.abs(got-want)/Math.max(Math.abs(want),Number.MIN_VALUE);record(what,error);
 expect(error,`${what}: closed form ${got}, independent integral ${want}`).toBeLessThan(tol);
}

describe('the constants the closed forms are built on',()=>{
 it('k and ε₀ are the CODATA values this file integrates with',()=>{
  expect(EPS0).toBe(E0);expect(K).toBe(ke);
 });
 it('each lesson sits on the charge layout its own setup sentence describes',()=>{
  for(const problem of PROBLEMS)expect(problem.geometry,problem.id).toBe(GEOM_OF[problem.id]);
  expect(Object.keys(GEOM_OF)).toHaveLength(15);
 });
});

describe('every field closed form against an independent adaptive integral',()=>{
 for(const id of FIELD_IDS)for(const [i,extra] of SETTINGS.entries())
  it(`${id} · setting ${i+1} · q ${extra.charge} · d ${extra.distance} · L ${extra.size}`,()=>{
   const p=params(extra);closeVec(field(id,p),truthE(id,p),TOL,`E ${id}`);
  });
 // z < 0 is the same physics mirrored, and the only place a stray Math.abs shows up.
 for(const id of ['ring','disk','sheet'] as const)for(const charge of [2.4,-1.7])
  it(`${id} below the plane · charge ${charge}`,()=>{
   const p=params({charge,distance:-2.1,size:3.8});closeVec(field(id,p),truthE(id,p),TOL,`E ${id} z<0`);
   const above=field(id,{...p,distance:2.1});
   expect(field(id,p).z).toBeCloseTo(-above.z,15);
  });
});

describe('every potential closed form against an independent adaptive integral',()=>{
 for(const id of POTENTIAL_IDS)for(const [i,extra] of SETTINGS.entries())
  it(`${id} · setting ${i+1} · q ${extra.charge} · d ${extra.distance}`,()=>{
   const p=params(extra);closeNum(potential(id,p),truthV(id,p),TOL,`V ${id}`);
  });
 // The potential lesson and the field lesson are the same charge at the same P, so
 // their V must be the same number, not merely a close one.
 for(const id of POTENTIAL_IDS)it(`${id} reports exactly the potential of the geometry it shares`,()=>{
  const p=params({charge:2.4,distance:1.9,size:3.8,phi:2.3});
  expect(potential(id,p)).toBe(potential(GEOM_OF[id] as ProblemId,p));
 });
});

describe('the closed form the lesson PRINTS is the one the integral produces',()=>{
 // The student never sees field(); they see `result`. Evaluate that string with mathjs
 // and hold it to the independent integral at every setting, using this file's own k.
 const ev=(expr:string,values:Record<string,number>)=>safeParse(expr).compile().evaluate({pi:Math.PI,...values}) as number;
 function scopeOf(id:string,p:Params):Record<string,number>{
  const q=p.charge*1e-9,L=p.size,R=p.size/2,d=p.distance,base={k:ke,eps0:E0,L,R,r:d,z:d,a:d,phi:p.phi,Q:q};
  switch(GEOM_OF[id]){
   case 'infinite':case 'semi':return {...base,lambda:q};        // the slider is λ, not Q
   case 'sheet':return {...base,sigma:q};                        // the slider is σ
   case 'ring':return {...base,lambda:q/(2*Math.PI*R)};
   case 'arc':return {...base,lambda:q/(R*p.phi)};
   case 'disk':return {...base,sigma:q/(Math.PI*R*R)};
   case 'ramp':return {...base,lambda0:q,Q:q*L/2};               // the slider is the peak λ₀
   default:return {...base,lambda:q/L};
  }
 }
 for(const id of [...FIELD_IDS,...POTENTIAL_IDS])for(const [i,extra] of SETTINGS.entries())
  it(`${id} · setting ${i+1}`,()=>{
   const p=params(extra),problem=getProblem(id),geom=GEOMETRY[GEOM_OF[id]];
   if(problem.quantity==='V'){
    closeNum(ev(problem.result,scopeOf(id,p)),truthV(id,p),TOL,`printed V ${id}`);
    // The payoff each potential lesson promises: differentiate V and the field falls out.
    // The expression the student is shown has to be the field itself, not merely close to it.
    const gradient=problem.steps.find(s=>s.kind==='gradient');
    if(gradient)closeNum(ev(gradient.fields![0].expected,scopeOf(id,p)),truthE(id,p)[geom.component==='x'?0:2],TOL,`printed −dV/dz ${id}`);
    return;
   }
   const want=truthE(id,p),axis=geom.component==='x'?0:2;
   closeNum(ev(problem.result,scopeOf(id,p)),want[axis],TOL,`printed E ${id}`);
   // endpoint, ramp and semi print a second component; nothing cancels it, so it is
   // stated separately and has to survive the same comparison.
   if(problem.secondaryResult)closeNum(ev(problem.secondaryResult,scopeOf(id,p)),want[1],TOL,`printed E_y ${id}`);
  });
});

// What the field must DO for a POSITIVE charge, geometry by geometry, read off the
// setup drawing: 0 marks a component symmetry is required to annihilate. A sign error
// anywhere in src/distributions turns one of these over.
const DIRECTION:Record<string,V3>={
 bisector:[1,0,0],   // P sits on +x, the rod on the y-axis: pushed further out along +x
 axial:[1,0,0],      // P is beyond the right end: pushed further right
 infinite:[1,0,0],
 ring:[0,0,1],disk:[0,0,1],sheet:[0,0,1], // P above the plane at z > 0
 semi:[-1,1,0],      // the rod runs along +x from below P, so P is pushed back and up
 arc:[-1,0,0],       // the charge is bunched toward +x, P at the centre is pushed to −x
 endpoint:[1,-1,0],  // the rod stands above P's level, so the transverse push is downward
 ramp:[1,-1,0],
};
describe('signs and conventions',()=>{
 for(const id of FIELD_IDS)for(const charge of [2.4,-2.4])it(`${id} points away from positive charge · q ${charge}`,()=>{
  const p=params({charge,distance:1.9,size:3.8,phi:2.3}),app=field(id,p),want=truthE(id,p),scale=norm(want);
  for(const [i,axis] of (['x','y','z'] as const).entries()){
   const expected=DIRECTION[id][i]*Math.sign(charge);
   if(expected===0){ // symmetry kills it in the closed form, and has to kill it in the integral too
    expect(app[axis],`${id} ${axis} must vanish`).toBe(0);
    expect(Math.abs(want[i])/scale,`${id} ${axis} residue`).toBeLessThan(1e-11);continue;
   }
   expect(Math.sign(app[axis]),`${id} ${axis} closed form`).toBe(expected);
   expect(Math.sign(want[i]),`${id} ${axis} independent integral`).toBe(expected);
   expect(Math.abs(want[i])/scale,`${id} ${axis} is not a rounding artefact`).toBeGreaterThan(1e-6);
  }
 });
 it('the components symmetry cancels stay exactly zero at every parameter setting',()=>{
  for(const id of FIELD_IDS)for(const extra of SETTINGS){const app=field(id,params(extra));
   for(const [i,axis] of (['x','y','z'] as const).entries())if(DIRECTION[id][i]===0)expect(app[axis],`${id} ${axis}`).toBe(0);}
 });
 it('a positive charge pushes the field away from its own centre of charge',()=>{
  for(const id of FIELD_IDS)for(const charge of [2.4,-2.4]){
   const p=params({charge,distance:1.9,size:3.8,phi:2.3}),geom=GEOMETRY[id],c=geom.centroid(p);
   if(!c)continue; // the semi-infinite rod's centre of charge runs off to infinity
   const P=geom.P(p),E=truthE(id,p),dot=E[0]*(P[0]-c[0])+E[1]*(P[1]-c[1])+E[2]*(P[2]-c[2]);
   expect(Math.sign(dot),`${id} q ${charge}`).toBe(Math.sign(charge));
  }
 });
 // A closed form that quietly reads the wrong slider is the other way a sign or a factor
 // goes wrong, and no amount of integrating at one parameter setting would show it. Each
 // entry lists the sliders the geometry has no business reading at all.
 const IGNORES:Record<string,(keyof Params)[]>={
  bisector:['phi'],axial:['phi'],ring:['phi'],disk:['phi'],endpoint:['phi'],ramp:['phi'],
  infinite:['phi','size'],semi:['phi','size'],sheet:['phi','size'], // unbounded: there is no L to read
  arc:['distance'],                                                // P is pinned to the centre of curvature
  'v-ring':['phi'],'v-disk':['phi'],'v-rod-bisector':['phi'],'v-rod-axial':['phi'],
  'v-arc':['phi','distance'],                                      // every element is R away whatever φ is
 };
 for(const [id,ignored] of Object.entries(IGNORES))for(const slider of ignored)
  it(`${id} does not read ${slider}`,()=>{
   const a=params({charge:2.4,distance:1.9,size:3.8,phi:2.3}),b={...a,[slider]:slider==='phi'?1.1:5.3};
   if(getProblem(id).quantity==='V'){expect(potential(id as ProblemId,b)).toBe(potential(id as ProblemId,a));return;}
   expect(field(id as ProblemId,b)).toEqual(field(id as ProblemId,a));
  });
 it('the sheet reads only the SIGN of the distance, never its size',()=>{
  const p=params({charge:2.4,size:3.8});
  for(const distance of [.001,2,1e6])expect(field('sheet',{...p,distance}).z).toBe(field('sheet',{...p,distance:1}).z);
  expect(field('sheet',{...p,distance:-2}).z).toBe(-field('sheet',{...p,distance:2}).z);
 });
 for(const id of POTENTIAL_IDS)it(`${id} takes the sign of the charge, as a scalar with V(∞) = 0 must`,()=>{
  for(const charge of [2.4,-2.4]){const p=params({charge,distance:1.9,size:3.8,phi:2.3});
   expect(Math.sign(potential(id,p)),`${id} closed form`).toBe(Math.sign(charge));
   expect(Math.sign(truthV(id,p)),`${id} independent integral`).toBe(Math.sign(charge));}
 });
});

describe('the sanity checks each lesson displays are themselves true',()=>{
 // The ASSESS panel plots the exact field against a reference the lesson asserts. Other
 // suites check that the app's curve reaches the app's reference; these four references
 // are sharp closed-form claims, so they are worth pricing against an integral instead.
 const limitOf=(id:ProblemId,mode:string)=>{const l=getProblem(id).limits.find(x=>x.mode===mode);expect(l,`${id}/${mode}`).toBeTruthy();return l!;};
 it('the ring peak really is 2kQ/(3√3 R²), and it really sits at z = R/√2',()=>{
  const p=params({charge:2,size:4,distance:3}),R=p.size/2,q=p.charge*1e-9;
  const at=(z:number)=>truthE('ring',{...p,distance:z})[2];
  const peak=at(R/Math.SQRT2);
  for(const off of [.96,.98,1.02,1.04])expect(at(R/Math.SQRT2*off),`z/R√2 = ${off}`).toBeLessThan(peak);
  closeNum(sampleLimit(getProblem('ring'),p,limitOf('ring','maximum'),10).target,peak,TOL,'ring peak reference');
  closeNum(peak,2*ke*q/(3*Math.sqrt(3)*R*R),TOL,'ring peak is 2kQ/(3√3R²)');
 });
 it('the half ring really is 2kQ/(πR²)',()=>{
  const p=params({charge:2,size:4,distance:3}),R=p.size/2,q=p.charge*1e-9;
  const half=norm(truthE('arc',{...p,phi:Math.PI}));
  closeNum(sampleLimit(getProblem('arc'),p,limitOf('arc','half'),1).target,half,TOL,'half ring reference');
  closeNum(half,2*ke*q/(Math.PI*R*R),TOL,'half ring is 2kQ/(πR²)');
 });
 it('a rod stood on its end and made long really does approach √2 kλ/r at 45°',()=>{
  const p=params({charge:2,size:4,distance:3}),lam=p.charge*1e-9/p.size;
  const long={...p,size:1e4*p.distance,charge:lam*1e9*1e4*p.distance},E=truthE('endpoint',long);
  // A rod of finite length is short of the limit by O(r/L), so the claim itself is only
  // good to 1e−4 here; the reference the panel plots has to be that number exactly.
  closeNum(sampleLimit(getProblem('endpoint'),p,limitOf('endpoint','infinite'),1e4).target,Math.SQRT2*ke*lam/p.distance,TOL,'endpoint √2 reference');
  expect(norm(E)/(Math.SQRT2*ke*lam/p.distance),'the integral reaching it').toBeCloseTo(1,3);
  expect(Math.abs(E[0]/E[1]),'and arriving at 45°').toBeCloseTo(1,3);
 });
 it('the ramp rod really does remember its centre of charge at 2L/3, not its midpoint',()=>{
  const p=params({charge:2,size:4,distance:3}),Q=p.charge*1e-9*p.size/2,far={...p,distance:400*p.size};
  const E=truthE('ramp',far);
  closeNum(sampleLimit(getProblem('ramp'),p,limitOf('ramp','moment'),400).target,ke*Q*(2*p.size/3)/far.distance**3,TOL,'ramp moment reference');
  expect(E[1]/(-ke*Q*(2*p.size/3)/far.distance**3),'the transverse first moment').toBeCloseTo(1,4);
  expect(E[1]/(-ke*Q*(p.size/2)/far.distance**3),'and not the midpoint').not.toBeCloseTo(1,2);
 });
});

describe('degenerate and boundary cases',()=>{
 it('the charged surface is excluded from the field but not from the potential',()=>{
  for(const id of ['disk','sheet'] as const)expect(field(id,params({distance:0})).z,id).toBeNaN();
  const p=params({distance:0,size:3.8,charge:2.4}),R=p.size/2,sigma=p.charge*1e-9/(Math.PI*R*R);
  // On the disk's own centre dq/r is 0/0 at s = 0, so the sweep starts a part in 10¹³ of
  // the way out. The integrand there is flat, so the skipped head costs that same fraction.
  const want=segS(s=>annulusV(sigma,s,[0,0,0]),[R*1e-13,R/2,R],Math.abs(sigma)*R/(2*E0)*REL);
  closeNum(potential('v-disk',p),want,1e-11,'V disk on the surface');
  closeNum(potential('v-disk',p),2*ke*p.charge*1e-9/R,1e-12,'V disk centre is 2kQ/R');
 });
 it('a closed arc is the ring read from its own centre: no field, and V = kQ/R',()=>{
  const p=params({phi:2*Math.PI,size:3.8,charge:2.4}),R=p.size/2,pointCharge=ke*Math.abs(p.charge)*1e-9/(R*R);
  expect(magnitude(field('arc',p))/pointCharge).toBeLessThan(1e-15);
  expect(norm(truthE('arc',p))/pointCharge).toBeLessThan(1e-12);
  const centre=params({size:3.8,charge:2.4,distance:0});
  expect(field('ring',centre)).toEqual({x:0,y:0,z:0});
  expect(potential('v-arc',p)).toBe(potential('v-ring',centre));
  closeNum(potential('v-arc',p),truthV('arc',p),TOL,'V closed arc');
 });
 it('an arc collapsed to a pinhole is a point charge sitting at (R, 0)',()=>{
  const p=params({phi:1e-6,size:3.8,charge:2.4}),R=p.size/2;
  closeVec(field('arc',p),truthE('arc',p),TOL,'E pinhole arc');
  expect(field('arc',p).x/(-ke*p.charge*1e-9/(R*R))).toBeCloseTo(1,11);
  expect(potential('v-arc',p)).toBe(ke*p.charge*1e-9/R); // V never learned about φ at all
 });
 it('sweeping a distribution backwards accumulates exactly minus the field',()=>{
  const p=params({charge:2.4,distance:1.9,size:3.8,phi:2.3});
  for(const id of FIELD_IDS){
   const samples=sampleDistribution(id,p,4000),forward=sumSamples(samples),backward=sumInterval(samples,[100,0]);
   for(const axis of ['x','y','z'] as const)expect(backward[axis],`${id} ${axis}`).toBeCloseTo(-forward[axis],20);
   // The midpoint rule at n = 4000 is the limit here, not the closed form.
   closeVec({x:-backward.x,y:-backward.y,z:-backward.z},truthE(id,p),1e-6,`reversed sweep ${id}`);
  }
 });
 it('the field diverges the way each geometry says it should as P reaches the charge',()=>{
  const base=params({charge:2.4,size:3.8}),lam=base.charge*1e-9/base.size,L=base.size;
  // Close to the middle of a rod, every rod looks infinite. My own quadrature is the
  // weaker side here: the integrand is a spike of width r inside a panel of width L/2.
  for(const r of [L/100,L/1000]){const p={...base,distance:r};
   closeVec(field('bisector',p),truthE('bisector',p),1e-9,'E bisector up close');}
  const tiny=L*1e-7;
  expect(field('bisector',{...base,distance:tiny}).x/(2*ke*lam/tiny)).toBeCloseTo(1,6);
  // Level with the END of a rod only half the line is present, so the transverse push halves.
  expect(field('endpoint',{...base,distance:tiny}).x/(ke*lam/tiny)).toBeCloseTo(1,6);
  // Just beyond the end, the rod is a line that begins at P: E → kλ/a.
  expect(field('axial',{...base,distance:tiny}).x/(ke*lam/tiny)).toBeCloseTo(1,6);
  const R=L/2,sigma=base.charge*1e-9/(Math.PI*R*R);
  expect(field('disk',{...base,distance:R*1e-9}).z/(sigma/(2*E0))).toBeCloseTo(1,8);
  // The ring's centre is the one place a field is exactly zero rather than merely small.
  expect(field('ring',{...base,distance:0})).toEqual({x:0,y:0,z:0});
 });
 it('zero charge is exactly zero field and exactly zero potential, not a small number',()=>{
  const p=params({charge:0,distance:1.9,size:3.8,phi:2.3});
  for(const id of FIELD_IDS){expect(magnitude(field(id,p)),id).toBe(0);expect(norm(truthE(id,p)),id).toBe(0);}
  for(const id of POTENTIAL_IDS){expect(potential(id,p),id).toBe(0);expect(truthV(id,p),id).toBe(0);}
 });
 it('every element the app draws is honest Coulomb, down to a single piece',()=>{
  const p=params({charge:2.4,distance:1.9,size:3.8,phi:2.3});
  for(const id of FIELD_IDS){
   const P=GEOMETRY[id].P(p),surface=id==='disk'||id==='sheet'; // those two partition into whole annuli
   for(const n of [1,5,37]){
    const samples=sampleDistribution(id,p,n);
    expect(samples,`${id} n=${n}`).toHaveLength(n);
    for(const s of samples){
     const S:V3=[s.position.x,s.position.y,s.position.z];
     closeVec(s.field,surface?ringOf(s.dq,s.position.x,P):coulomb(s.dq,S,P),1e-12,`element ${id}`);
     closeNum(s.potential,surface?ringVOf(s.dq,s.position.x,P):coulombV(s.dq,S,P),1e-12,`element V ${id}`);
    }
    const total=GEOMETRY[id].total(p);
    if(Number.isFinite(total))expect(samples.reduce((sum,s)=>sum+s.dq,0)/total,`${id} n=${n} total charge`).toBeCloseTo(1,12);
   }
  }
 });
 it('a single piece is already a real Riemann sum of the real field',()=>{
  // One chunk is the coarsest thing a student can look at. On a source that is small
  // compared with the distance, the one-point midpoint rule is good to (L/d)²/24, so the
  // coarsest picture is not merely suggestive — it is the answer, to three or four digits.
  const p=params({charge:2.4,distance:30,size:.4,phi:.1});
  for(const id of ['bisector','axial','endpoint','arc'] as const){
   const one=sumSamples(sampleDistribution(id,p,1)),want=truthE(id,p);
   closeVec(one,want,1e-3,`single piece ${id}`);
   expect(Math.sign(vecOf(one)[0]),`single piece ${id} direction`).toBe(Math.sign(want[0]));
  }
  // The ramp is the exception, and it is the instructive one. One chunk carries the right
  // total charge λ₀L/2 but hangs it at the rod's midpoint L/2 rather than at its centre of
  // charge 2L/3. E_x barely notices; E_y is a first moment about that point, so it comes
  // out at exactly (L/2)/(2L/3) = ¾ of the truth until the partition is refined.
  const chunk=sumSamples(sampleDistribution('ramp',p,1)),exact=truthE('ramp',p);
  expect(Math.abs(chunk.x-exact[0])/norm(exact),'single piece ramp E_x').toBeLessThan(1e-3);
  expect(chunk.y/exact[1],'single piece ramp E_y').toBeCloseTo(.75,3);
  expect(sumSamples(sampleDistribution('ramp',p,400)).y/exact[1],'refined ramp E_y').toBeCloseTo(1,5);
 });
 it('the ring gets its axial field exactly right from one piece, because every piece is alike',()=>{
  // Each element of a ring is the same distance from P and leans at the same angle, so
  // the axial component carries no discretisation error at all — the partition only ever
  // affects the transverse parts, which cancel. This is the ring lesson's whole point.
  const p=params({charge:2.4,distance:1.9,size:3.8});
  for(const n of [1,2,7,60])expect(sumSamples(sampleDistribution('ring',p,n)).z/truthE('ring',p)[2],`n=${n}`).toBeCloseTo(1,14);
 });
});
