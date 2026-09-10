import {describe,it,expect} from 'vitest';
import {field,magnitude,potential,EPS0,K,type Vec} from '../src/symbolic/physics';
import {getProblem,PROBLEMS} from '../src/problems/definitions';
import {PROBLEM_IDS} from '../src/distributions';
import {safeParse} from '../src/symbolic/equivalence';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../src/problems/types';
import {sampleDistribution,sumSamples,sumPotential} from '../src/diagrams/sampling';
import {numerical} from '../src/symbolic/physics';
// ---------------------------------------------------------------------------
// An INDEPENDENT ground truth. Nothing below imports the app's own `numerical`
// or `sampleDistribution`; every number comes from Coulomb's law applied to a
// point charge plus a composite Simpson rule written here. Unbounded domains
// are covered by octave panels, not by the tangent substitution the app uses,
// so a shared substitution bug cannot hide.
// ---------------------------------------------------------------------------
type V3=[number,number,number];
const ke=1/(4*Math.PI*8.8541878128e-12);
const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a:V3,c:number):V3=>[a[0]*c,a[1]*c,a[2]*c];
/** Field at P from a point charge q sitting at S. Textbook Coulomb, nothing else. */
function coulomb(q:number,S:V3,P:V3):V3{const d:V3=[P[0]-S[0],P[1]-S[1],P[2]-S[2]];const r=Math.hypot(...d);return scale(d,ke*q/(r*r*r));}
/** Composite Simpson over [a,b] with m even panels, vector valued. */
function simpson(g:(t:number)=>V3,a:number,b:number,m:number):V3{
 if(m%2)m++;const h=(b-a)/m;let sum:V3=[0,0,0];
 for(let i=0;i<=m;i++){const w=i===0||i===m?1:i%2?4:2;sum=add(sum,scale(g(a+i*h),w));}
 return scale(sum,h/3);
}
/** [start, ∞) covered by geometrically doubling panels of scale `unit`. */
function toInfinity(g:(t:number)=>V3,start:number,unit:number,octaves=60,m=64):V3{
 let sum=simpson(g,start,start+unit,m),lo=start+unit,width=unit;
 for(let i=0;i<octaves;i++){sum=add(sum,simpson(g,lo,lo+width,m));lo+=width;width*=2;}
 return sum;
}
function double2d(g:(s:number,t:number)=>V3,s0:number,s1:number,ms:number,t0:number,t1:number,mt:number):V3{
 return simpson(s=>simpson(t=>g(s,t),t0,t1,mt),s0,s1,ms);
}
/** Ground truth per geometry, built only from each problem's stated setup text. */
function truth(id:ProblemId,p:Params):V3{
 const q=p.charge*1e-9,L=p.size,R=p.size/2,d=p.distance;
 switch(id){
  // Rod on the y-axis, centred at the origin; P = (r, 0).
  case 'bisector':{const lam=q/L;return simpson(y=>coulomb(lam,[0,y,0],[d,0,0]),-L/2,L/2,4000);}
  // Rod from x = 0 to x = L; P = (L + a, 0).
  case 'axial':{const lam=q/L;return simpson(x=>coulomb(lam,[x,0,0],[L+d,0,0]),0,L,4000);}
  // Infinite line on the y-axis, P = (r, 0). Both tails, octave panels.
  case 'infinite':{const lam=q,g=(y:number)=>coulomb(lam,[0,y,0],[d,0,0]);
   return add(add(simpson(g,-Math.abs(d),Math.abs(d),256),toInfinity(g,Math.abs(d),Math.abs(d))),toInfinity(y=>g(-y),Math.abs(d),Math.abs(d)));}
  // Ring of radius R in the xy-plane; P = (0, 0, z).
  case 'ring':{const lam=q/(2*Math.PI*R);return simpson(t=>coulomb(lam*R,[R*Math.cos(t),R*Math.sin(t),0],[0,0,d]),0,2*Math.PI,2000);}
  // Arc of radius R spanning −φ/2…+φ/2 about +x; P at the centre of curvature.
  case 'arc':{const lam=q/(R*p.phi);return simpson(t=>coulomb(lam*R,[R*Math.cos(t),R*Math.sin(t),0],[0,0,0]),-p.phi/2,p.phi/2,2000);}
  // Rod standing on the x-axis from y = 0 to y = L; P = (r, 0), level with its lower end.
  case 'endpoint':{const lam=q/L;return simpson(y=>coulomb(lam,[0,y,0],[d,0,0]),0,L,4000);}
  // The same rod with λ(y) = λ₀ y/L; the slider is the peak density λ₀.
  case 'ramp':return simpson(y=>coulomb(q*y/L,[0,y,0],[d,0,0]),0,L,4000);
  // Semi-infinite rod along +x from the origin; P = (0, r).
  case 'semi':{const lam=q,g=(x:number)=>coulomb(lam,[x,0,0],[0,d,0]);
   return add(simpson(g,0,Math.abs(d),256),toInfinity(g,Math.abs(d),Math.abs(d)));}
  // Disk of radius R in the xy-plane; honest two-dimensional surface integral.
  case 'disk':{const sig=q/(Math.PI*R*R);return double2d((s,t)=>coulomb(sig*s,[s*Math.cos(t),s*Math.sin(t),0],[0,0,d]),0,R,600,0,2*Math.PI,120);}
  // Infinite plane, same surface integral pushed to infinity in the radius.
  case 'sheet':{const sig=q,g=(s:number,t:number)=>coulomb(sig*s,[s*Math.cos(t),s*Math.sin(t),0],[0,0,d]);
   const a=Math.abs(d);return add(double2d(g,0,a,200,0,2*Math.PI,80),toInfinity(s=>simpson(t=>g(s,t),0,2*Math.PI,80),a,a,60,64));}
  default:throw Error(`${id} has no independent field ground truth`);
 }
}
const ids:ProblemId[]=['bisector','axial','infinite','ring','disk','semi','arc','sheet','endpoint','ramp'];
/** Total charge in coulombs, from the setup text: the ramp's slider is a peak density on a finite rod. */
const total=(id:ProblemId,p:Params)=>id==='ramp'?p.charge*1e-9*p.size/2:p.charge*1e-9;
const params=(extra:Partial<Params>={}):Params=>({...DEFAULT_PARAMS,...extra});
function closeTo(actual:Vec,expected:V3,tol:number,what:string){
 const s=Math.max(Math.hypot(...expected),1e-30);
 for(const [i,axis] of (['x','y','z'] as const).entries())
  expect(Math.abs(actual[axis]-expected[i])/s,`${what} ${axis}: got ${actual[axis]}, truth ${expected[i]}`).toBeLessThan(tol);
}
describe('closed forms vs an independently written Coulomb integrator',()=>{
 for(const id of ids)for(const charge of [2.4,-1.7])for(const distance of [0.8,3,7.5])
  it(`${id} · charge ${charge} · distance ${distance}`,()=>{
   const p=params({charge,distance,size:3.8,phi:2.3});
   closeTo(field(id,p),truth(id,p),2e-6,`${id}`);
  });
 for(const id of ['ring','disk','sheet'] as const)for(const charge of [2.4,-1.7])
  it(`${id} below the plane · charge ${charge}`,()=>{
   const p=params({charge,distance:-2.1,size:3.8});
   closeTo(field(id,p),truth(id,p),2e-6,`${id} negative z`);
  });
 it('arc closes to exactly zero at phi = 2 pi',()=>{
  const p=params({phi:2*Math.PI});
  const pointScale=Math.abs(K*p.charge*1e-9/(p.size/2)**2);
  expect(magnitude(field('arc',p))/pointScale).toBeLessThan(1e-15);
  expect(Math.hypot(...truth('arc',p))/pointScale).toBeLessThan(1e-9);
 });
 it('arc at phi = pi is the textbook 2 k lambda / R half ring',()=>{
  const p=params({phi:Math.PI}),R=p.size/2,lam=p.charge*1e-9/(R*Math.PI);
  expect(field('arc',p).x).toBeCloseTo(-2*K*lam/R,18);
 });
 for(const id of ids)it(`${id} far field approaches the point charge when it is bounded`,()=>{
  if(id==='infinite'||id==='semi'||id==='sheet'||id==='arc')return; // unbounded charge, or P pinned to the centre
  const p=params({distance:1e8,size:3.8});
  expect(magnitude(field(id,p))/(K*Math.abs(total(id,p))/p.distance**2)).toBeCloseTo(1,6);
 });
});
// ---------------------------------------------------------------------------
// Does the derivation a student reads produce the number the app computes?
// Each problem carries a machine-readable integrand and bounds. Integrate THOSE
// and compare with both the stated closed form and field().
// ---------------------------------------------------------------------------
const ev=(expr:string,scope:Record<string,number>)=>safeParse(expr).compile().evaluate({pi:Math.PI,...scope}) as number;
function scopeFor(id:ProblemId,p:Params):Record<string,number>{
 const geom=id==='infinite'?id:getProblem(id).geometry,q=p.charge*1e-9,L=p.size,R=p.size/2,d=p.distance;
 const base={k:K,eps0:EPS0,Q:q,L,R,a:d,r:d,z:d,phi:p.phi};
 if(geom==='bisector')return{...base,lambda:q/L};
 if(geom==='axial')return{...base,lambda:q/L};
 if(geom==='infinite')return{...base,lambda:q,Q:q*L};
 if(geom==='ring')return{...base,lambda:q/(2*Math.PI*R)};
 if(geom==='arc')return{...base,lambda:q/(R*p.phi)};
 if(geom==='disk')return{...base,sigma:q/(Math.PI*R*R),lambda:q/L};
 if(geom==='semi')return{...base,lambda:q};
 if(geom==='endpoint')return{...base,lambda:q/L};
 if(geom==='ramp')return{...base,lambda0:q,Q:q*L/2,y:.7*L};
 return{...base,sigma:q,lambda:q};
}
/** Scalar Simpson of the definition's own integrand string over its own bounds. */
function integrateKernel(kernel:string,variable:string,lo:number,hi:number|'inf',scope:Record<string,number>):number{
 const node=safeParse(kernel).compile();
 const g=(t:number)=>node.evaluate({pi:Math.PI,...scope,[variable]:t}) as number;
 const s=(a:number,b:number,m:number)=>{const h=(b-a)/m;let sum=0;for(let i=0;i<=m;i++)sum+=(i===0||i===m?1:i%2?4:2)*g(a+i*h);return sum*h/3;};
 if(hi!=='inf')return s(lo,hi,6000);
 const unit=Math.max(scope.r??scope.z??1,1e-9);let total=s(lo,lo+unit,256),x=lo+unit,w=unit;
 for(let i=0;i<60;i++){total+=s(x,x+w,128);x+=w;w*=2;}
 return total;
}
type Row={id:ProblemId;path?:string;lo:number;hi:number|'inf';component:'x'|'z';element:string;secondary?:{kernelId:string;expected:string;component:'y'}};
describe('the displayed derivation reproduces the displayed answer',()=>{
 const p=params({distance:1.9,size:3.8,charge:2.4,phi:2.3});
 const rows:Row[]=[
  {id:'bisector',lo:-p.size/2,hi:p.size/2,component:'x',element:'dy'},
  {id:'axial',lo:0,hi:p.size,component:'x',element:'dx'},
  {id:'infinite',path:'angular',lo:-Math.PI/2,hi:Math.PI/2,component:'x',element:'dy'},
  {id:'ring',lo:0,hi:2*Math.PI,component:'z',element:'R*dtheta'},
  {id:'disk',lo:0,hi:p.size/2,component:'z',element:'2*pi*s*ds'},
  {id:'semi',lo:0,hi:'inf',component:'x',element:'dx',secondary:{kernelId:'kernel2',expected:'k*lambda/r',component:'y'}},
  {id:'endpoint',lo:0,hi:p.size,component:'x',element:'dy',secondary:{kernelId:'kernel2',expected:'-k*lambda*(1/r-1/sqrt(r^2+L^2))',component:'y'}},
  {id:'ramp',lo:0,hi:p.size,component:'x',element:'dy',secondary:{kernelId:'kernel2',expected:'-k*lambda0/L*(log((L+sqrt(L^2+r^2))/r)-L/sqrt(L^2+r^2))',component:'y'}},
  {id:'arc',lo:-p.phi/2,hi:p.phi/2,component:'x',element:'R*dtheta'},
  {id:'sheet',lo:0,hi:'inf',component:'z',element:'2*pi*s*ds'},
 ];
 for(const row of rows){
  const problem=getProblem(row.id,row.path);
  const scope=scopeFor(row.id,row.id==='infinite'?p:p);
  it(`${row.id}: stated result equals field()`,()=>{
   expect(ev(problem.result,scope)).toBeCloseTo(field(row.id,p)[row.component],14);
  });
  it(`${row.id}: integrating the stated integrand over the stated bounds gives the stated result`,()=>{
   const got=integrateKernel(problem.kernel,problem.variable,row.lo,row.hi,scope);
   const want=ev(problem.result,scope);
   expect(Math.abs(got-want)/Math.max(Math.abs(want),1e-30)).toBeLessThan(1e-6);
  });
  it(`${row.id}: symbolic bound strings agree with the numeric bounds used`,()=>{
   expect(ev(problem.bounds[0],scope)).toBeCloseTo(row.lo,12);
   if(row.hi==='inf')expect(problem.bounds[1]).toBe('Infinity');
   else expect(ev(problem.bounds[1],scope)).toBeCloseTo(row.hi,12);
  });
  const secondary=row.secondary;
  if(secondary){
   it(`${row.id}: the second component's integrand and result agree too`,()=>{
    const step=problem.steps.find(s=>s.kind==='variable');
    const f=step?.fields?.find(x=>x.id===secondary.kernelId);
    expect(f,'kernel2 field present').toBeTruthy();
    const got=integrateKernel(f!.expected,problem.variable,row.lo,row.hi,scope);
    const want=ev(secondary.expected,scope);
    expect(Math.abs(got-want)/Math.abs(want)).toBeLessThan(1e-6);
    expect(ev(problem.secondaryResult!,scope)).toBeCloseTo(field(row.id,p)[secondary.component],14);
   });
  }
  it(`${row.id}: dQ equals the stated density times the stated element`,()=>{
   const d={...scope,s:1.234,dy:1,dx:1,ds:1,dtheta:1};
   const got=ev(problem.dq,d),want=ev(problem.density,d)*ev(row.element,d);
   expect(Math.abs(got-want)/Math.abs(want)).toBeLessThan(1e-14);
  });
 }
 it('both infinite-line derivation paths land on the same field',()=>{
  const angular=getProblem('infinite','angular'),finite=getProblem('infinite','finite');
  const scope=scopeFor('infinite',p);
  expect(ev(angular.result,scope)).toBeCloseTo(ev(finite.result,scope),18);
  // The finite path reuses the finite rod's integrand, so its own closed form is the
  // rod's. Hold lambda fixed, grow L, and it must climb to 2 k lambda / r from below.
  expect(finite.kernel).toBe(getProblem('bisector').kernel);
  const target=ev(finite.result,scope);
  let previous=0;
  for(const L of [10,100,1e4,1e8]){
   const value=ev(getProblem('bisector').result,{...scope,L,Q:scope.lambda*L});
   expect(value).toBeGreaterThan(previous);expect(value).toBeLessThan(target);previous=value;
  }
  expect(previous/target).toBeCloseTo(1,7);
 });
});
// ---------------------------------------------------------------------------
// Potentials. Same independence rule: k q / |P − S| summed by Simpson, nothing
// from the app. Then the payoff the potential lessons promise — E = −dV/dz —
// is checked by a central difference against the field closed forms.
// ---------------------------------------------------------------------------
function coulombV(q:number,S:V3,P:V3):number{return ke*q/Math.hypot(P[0]-S[0],P[1]-S[1],P[2]-S[2]);}
const simpson1=(g:(t:number)=>number,a:number,b:number,m:number)=>simpson(t=>[g(t),0,0],a,b,m)[0];
function truthPotential(id:ProblemId,p:Params):number{
 const q=p.charge*1e-9,L=p.size,R=p.size/2,d=p.distance;
 switch(id){
  case 'bisector':return simpson1(y=>coulombV(q/L,[0,y,0],[d,0,0]),-L/2,L/2,4000);
  case 'axial':return simpson1(x=>coulombV(q/L,[x,0,0],[L+d,0,0]),0,L,4000);
  case 'ring':return simpson1(t=>coulombV(q/(2*Math.PI),[R*Math.cos(t),R*Math.sin(t),0],[0,0,d]),0,2*Math.PI,2000);
  case 'arc':return simpson1(t=>coulombV(q/p.phi,[R*Math.cos(t),R*Math.sin(t),0],[0,0,0]),-p.phi/2,p.phi/2,2000);
  case 'disk':{const sig=q/(Math.PI*R*R);return simpson1(s=>simpson1(t=>coulombV(sig*s,[s*Math.cos(t),s*Math.sin(t),0],[0,0,d]),0,2*Math.PI,120),0,R,600);}
  default:throw Error(`${id} has no potential ground truth`);
 }
}
const potentialIds=['bisector','axial','ring','arc','disk'] as const;
describe('potential closed forms vs an independently written Coulomb integrator',()=>{
 for(const id of potentialIds)for(const charge of [2.4,-1.7])for(const distance of [0.8,3,7.5])
  it(`${id} · charge ${charge} · distance ${distance}`,()=>{
   const p=params({charge,distance,size:3.8,phi:2.3});
   expect(Math.abs(potential(id,p)-truthPotential(id,p))/Math.abs(truthPotential(id,p))).toBeLessThan(2e-6);
  });
 for(const id of ['ring','disk'] as const)it(`${id} below the plane has the same potential as above it`,()=>{
  const p=params({charge:2.4,distance:-2.1,size:3.8});
  expect(Math.abs(potential(id,p)/truthPotential(id,p)-1)).toBeLessThan(2e-6);expect(potential(id,p)).toBeCloseTo(potential(id,{...p,distance:2.1}),12);
 });
 for(const id of potentialIds)it(`${id} far potential approaches kQ/d`,()=>{
  const p=params({distance:1e8,size:3.8,phi:2.3});
  if(id==='arc'){expect(potential(id,p)).toBeCloseTo(K*p.charge*1e-9/(p.size/2),12);return;} // P is pinned to the centre
  expect(potential(id,p)/(K*p.charge*1e-9/p.distance)).toBeCloseTo(1,6);
 });
 it('the arc potential is kQ/R for every arc angle, while its field is not',()=>{
  const p=params({phi:2*Math.PI});
  for(const phi of [.3,Math.PI,2*Math.PI]){expect(potential('arc',{...p,phi})).toBeCloseTo(K*p.charge*1e-9/(p.size/2),12);expect(truthPotential('arc',{...p,phi})).toBeCloseTo(potential('arc',{...p,phi}),6);}
  expect(magnitude(field('arc',{...p,phi:Math.PI}))).toBeGreaterThan(1e3*magnitude(field('arc',p)));
 });
 it('ring and disk potentials are finite and equal to kQ/R and 2kQ/R at the centre, where the ring field is zero',()=>{
  const p=params({distance:0,size:3.8}),R=p.size/2,q=p.charge*1e-9;
  expect(potential('ring',p)).toBeCloseTo(K*q/R,12);expect(potential('disk',p)).toBeCloseTo(2*K*q/R,12);expect(field('ring',p).z).toBe(0);
 });
 for(const id of potentialIds)it(`${id} sampler accumulates the potential too`,()=>{
  const p=params({charge:2.4,distance:1.6,size:3.8,phi:2.3});
  expect(Math.abs(sumPotential(sampleDistribution(id,p,4000))-truthPotential(id,p))/Math.abs(truthPotential(id,p))).toBeLessThan(3e-5);
 });
});
describe('E = −dV/d(coordinate) recovers every field closed form',()=>{
 // Ring and disk: E_z = −dV/dz. Bisector: E_r = −dV/dr. Axial: E_a = −dV/da. All four are the same statement.
 for(const id of ['ring','disk','bisector','axial'] as const)for(const charge of [2.4,-1.7])it(`${id} · charge ${charge}`,()=>{
  const p=params({charge,size:3.8,distance:1.9}),h=1e-5*p.distance;
  const minusDV=-(potential(id,{...p,distance:p.distance+h})-potential(id,{...p,distance:p.distance-h}))/(2*h);
  const E=field(id,p),component=id==='ring'||id==='disk'?E.z:E.x;
  expect(Math.abs(minusDV/component-1),`${id}: −dV/dz ${minusDV} vs E ${component}`).toBeLessThan(1e-7);
 });
});
describe('the displayed potential derivation reproduces V',()=>{
 const p=params({distance:1.9,size:3.8,charge:2.4,phi:2.3});
 const rows: {id:ProblemId;lo:number;hi:number;element:string}[]=[
  {id:'v-ring',lo:0,hi:2*Math.PI,element:'R*dtheta'},
  {id:'v-disk',lo:0,hi:p.size/2,element:'2*pi*s*ds'},
  {id:'v-arc',lo:-p.phi/2,hi:p.phi/2,element:'R*dtheta'},
  {id:'v-rod-bisector',lo:-p.size/2,hi:p.size/2,element:'dy'},
  {id:'v-rod-axial',lo:0,hi:p.size,element:'dx'},
 ];
 for(const row of rows){
  const problem=getProblem(row.id),scope=scopeFor(row.id,p),axis=problem.geometry==='ring'||problem.geometry==='disk'?'z' as const:'x' as const;
  it(`${row.id}: stated result equals potential()`,()=>{
   expect(ev(problem.result,scope)).toBeCloseTo(potential(problem.geometry,p),12);
  });
  it(`${row.id}: integrating the stated integrand over the stated bounds gives the stated result`,()=>{
   const got=integrateKernel(problem.kernel,problem.variable,row.lo,row.hi,scope),want=ev(problem.result,scope);
   expect(Math.abs(got-want)/Math.max(Math.abs(want),1e-30)).toBeLessThan(1e-6);
  });
  it(`${row.id}: is a reduced scalar flow with a citation, two limits, and targeted misconceptions`,()=>{
   expect(problem.quantity).toBe('V');expect(problem.steps.some(s=>s.kind==='symmetry')).toBe(false);
   expect(problem.steps.find(s=>s.kind==='variable')!.fields!.some(f=>f.id==='projection')).toBe(false);
   expect(problem.limits.length).toBeGreaterThanOrEqual(2);expect(problem.sources.length).toBeGreaterThanOrEqual(1);
   expect(problem.steps.flatMap(s=>s.fields??[]).flatMap(f=>f.mistakes??[]).length).toBeGreaterThanOrEqual(3);
   const g=problem.steps.find(s=>s.kind==='gradient');
   if(row.id==='v-arc')expect(g).toBeUndefined();
   else expect(ev(g!.fields![0].expected,scope)).toBeCloseTo(field(problem.geometry,p)[axis],12);
  });
  it(`${row.id}: dQ equals the stated density times the stated element`,()=>{
   const d={...scope,s:1.234,dy:1,dx:1,ds:1,dtheta:1};
   const got=ev(problem.dq,d),want=ev(problem.density,d)*ev(row.element,d);
   expect(Math.abs(got-want)/Math.abs(want)).toBeLessThan(1e-14);
  });
 }
});
describe('units and parameter scaling',()=>{
 it('epsilon0 and k are mutually consistent and physically accurate',()=>{
  expect(K).toBe(1/(4*Math.PI*EPS0));
  expect(K/8.9875517923e9).toBeCloseTo(1,9);
  expect(EPS0/8.8541878e-12).toBeCloseTo(1,7);
 });
 it('every geometry is exactly linear in its nC parameter',()=>{
  for(const id of ids){const one=field(id,params({charge:1})),seven=field(id,params({charge:7}));
   for(const axis of ['x','y','z'] as const)expect(Math.abs(seven[axis]-one[axis]*7)).toBeLessThan(1e-14*Math.max(Math.abs(seven[axis]),1e-30));}
 });
 it('a 1 nC/m infinite line at 1 m gives 17.98 N/C',()=>{
  expect(field('infinite',params({charge:1,distance:1})).x).toBeCloseTo(17.975,3);
 });
 it('a 1 nC/m^2 sheet gives 56.5 N/C at any height',()=>{
  expect(field('sheet',params({charge:1,distance:5})).z).toBeCloseTo(56.47,2);
 });
});
describe('degenerate and edge cases',()=>{
 it('disk and sheet are undefined on the charged surface itself',()=>{
  for(const id of ['disk','sheet'] as const)expect(field(id,params({distance:0})).z).toBeNaN();
 });
 it('ring at its centre is exactly zero, not merely small',()=>{
  expect(field('ring',params({distance:0}))).toEqual({x:0,y:0,z:0});
 });
 it('every finite-distance field diverges as the observation point approaches the charge',()=>{
  for(const id of ['bisector','infinite','semi','axial'] as const)
   expect(magnitude(field(id,params({distance:1e-9})))).toBeGreaterThan(1e5);
 });
 it('problem definitions cover every registry id exactly once',()=>{
  expect(PROBLEMS.map(x=>x.id).sort()).toEqual([...PROBLEM_IDS].sort());
 });
});

describe('the diagram sampler and the app quadrature also match the independent truth',()=>{
 for(const id of ids)it(`${id} sampler`,()=>{
  const p=params({charge:2.4,distance:1.6,size:3.8,phi:2.3});
  closeTo(sumSamples(sampleDistribution(id,p,4000)),truth(id,p),3e-5,`${id} sampler`);
 });
 for(const id of ids)it(`${id} app quadrature`,()=>{
  const p=params({charge:-1.9,distance:2.2,size:3.8,phi:2.3});
  closeTo(numerical(id,p,40000),truth(id,p),3e-4,`${id} numerical`);
 });
});
