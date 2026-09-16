import {describe,it,expect} from 'vitest';
import {field,potential,numerical,magnitude,type Vec} from '../src/symbolic/physics';
import {sampleDistribution,sumInterval,sumPotential} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../src/problems/types';
// ---------------------------------------------------------------------------
// Metamorphic laws over the closed forms: scaling, superposition, differentiation,
// monotone falloff.
//
// Nothing here transcribes an expected value. Every assertion is a RELATION the
// fifteen closed forms must satisfy for ANY parameters — one evaluation of the app
// held against another evaluation of the app, or against a textbook identity built
// on this file's own k. tests/ground-truth.test.ts and tests/independent-integration.test.ts
// already price each lesson against an integral at four settings; a formula that is
// right at those four settings and wrong between them survives both. These laws do not
// have four settings: they hold everywhere or they fail somewhere.
//
// What each section would catch that a fixed-setting integral cannot:
//  · SCALING — a hidden absolute length. Double every metre in the picture and every field
//    must move by a fixed power of the scale. A `Math.max(d, .5)` floor, a smoothing
//    `r*r + 1e-3`, a tan cut built on a fixed 1 m instead of d, an L that should have been
//    L/2 and cancels at the tested settings: all of them break this identity at EVERY
//    setting, including inside the drawn partition at n = 1 where no truth value exists.
//  · SUPERPOSITION — each lesson pinned against a DIFFERENT lesson's geometry over 60+
//    settings with no integrator anywhere: a rod measured from the wrong end, a factor of 2
//    between the half line and the whole one, an arc that is not centred on its own bisector.
//  · d/dR AND −dV/dd — the disk's dependence on its radius, and each potential's dependence
//    on the coordinate, tested as FUNCTIONS over a grid rather than at a point. A branch or
//    a clamp that is invisible in the value shows up in the derivative. The discrete half is
//    the only check anywhere that sumPotential and sumInterval weight the same partition the
//    same way under bounds, progress and reversal.
//  · MONOTONE FALLOFF — 400 geometric distances from 0.05 m to 60 m, past both ends of the
//    slider, where no closed-form value is examined by any other suite.
// ---------------------------------------------------------------------------
// ε₀ is CODATA, re-entered by hand; k is built from it here. Every textbook expression below
// uses these, never the app's exported constants, so a wrong K cannot cancel itself out.
const EPS=8.8541878128e-12,ke=1/(4*Math.PI*EPS);
const AXES=['x','y','z'] as const;
const P=(extra:Partial<Params>):Params=>({...DEFAULT_PARAMS,...extra});
const scaled=(v:Vec,c:number):Vec=>({x:v.x*c,y:v.y*c,z:v.z*c});
/** Error relative to the expected value, with `floor` as the smallest denominator allowed.
 * A component that symmetry or cancellation drives to zero must be measured against the
 * scale it belongs to (the vector's own magnitude, the partition's own length) — measured
 * against itself it would only ever report floating-point noise. */
const relative=(got:number,want:number,floor=0)=>Math.abs(got-want)/Math.max(Math.abs(want),floor,Number.MIN_VALUE);
function close(got:number,want:number,tol:number,what:string,floor=0){
 expect(relative(got,want,floor),`${what}: got ${got}, expected ${want}`).toBeLessThan(tol);
}
function closeVec(got:Vec,want:Vec,tol:number,what:string,floor=0){
 const scale=Math.max(magnitude(want),floor);
 for(const axis of AXES)close(got[axis],want[axis],tol,`${what} ${axis}`,scale);
}
/** The worst error seen over a loop, with the label of where it happened. The element loops
 * run 200 pieces × four quantities × eight settings per test; building a message per piece
 * costs more than the physics, so they report once at the end. NaN beats every rival here. */
function tracker(){
 let error=-1,where='nothing';
 return{
  note(e:number,w:string){if(!(e<=error)){error=e;where=w;}},
  check(tol:number,label:string){expect(error,`${label} · worst at ${where}`).toBeLessThan(tol);},
 };
}
/** Central difference with one Richardson step. D(h) = f′ + h²f‴/6 + h⁴f⁽⁵⁾/120, so
 * (4·D(h/2) − D(h))/3 cancels the h² term exactly and leaves −f⁽⁵⁾h⁴/480. */
const richardson=(f:(x:number)=>number,x:number,h:number)=>{
 const D=(step:number)=>(f(x+step)-f(x-step))/(2*step);
 return (4*D(h/2)-D(h))/3;
};

// ---------------------------------------------------------------------------
// 1. The scaling law
// ---------------------------------------------------------------------------
// Blow the whole picture up by s — every distance and every length in metres — and hold the
// slider fixed. Coulomb's law then fixes the answer with no integration at all:
//   · a slider that is a total charge Q keeps dq, so E = k dq/r² scales as s⁻²;
//   · a slider that is a line density λ gives dq = λ dl, one power of s, so E scales as s⁻¹;
//   · a slider that is a surface density σ gives dq = σ dA, two powers, so E scales as s⁰.
// V = k dq/r is one power of s above E in every case. The partition is affine in the lengths,
// so sample positions scale by s, angles do not, and the per-element dq carries exactly the
// power its density demands. m and e below are not independent: a sample's field is k dq/r²,
// so m = e − 2 in every row, and the test asserts that rather than trusting the table twice.
type Law={m:number;e:number;angle:boolean};
const Q_ROD:Law={m:-2,e:0,angle:false},Q_TURN:Law={m:-2,e:0,angle:true};
const LAWS:Record<ProblemId,Law>={
 bisector:Q_ROD,axial:Q_ROD,endpoint:Q_ROD,disk:Q_ROD,
 ring:Q_TURN,arc:Q_TURN,
 ramp:{m:-1,e:1,angle:false},semi:{m:-1,e:1,angle:false},infinite:{m:-1,e:1,angle:true},
 sheet:{m:0,e:2,angle:false},
 'v-ring':Q_TURN,'v-arc':Q_TURN,'v-disk':Q_ROD,'v-rod-bisector':Q_ROD,'v-rod-axial':Q_ROD,
};
const ALL_IDS=Object.keys(LAWS) as ProblemId[];
// The ten lessons whose geometry defines an absolute potential: the two unbounded lines and
// the sheet have none (the integral diverges), and endpoint/ramp were never given one.
const HAS_V=new Set<ProblemId>(['bisector','axial','ring','disk','arc','v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial']);
const BASES:Partial<Params>[]=[{distance:3,size:4},{distance:.5,size:8,phi:.3*Math.PI},{distance:6,size:1,phi:2*Math.PI}];
const CHARGES=[-3,1],SCALES=[.37,2,7.5,1e3],QUAD_N=[1,7,400],SAMPLE_N=[1,5,37,200];

describe('length and charge scaling, through the closed form, the quadrature and every element',()=>{
 it('the three exponents are one exponent: a sample field is k dq/r², so m = e − 2',()=>{
  for(const [id,law] of Object.entries(LAWS))expect(law.m,id).toBe(law.e-2);
  expect(ALL_IDS).toHaveLength(15);
 });
 for(const id of ALL_IDS)for(const base of BASES)
  it(`${id} · d ${base.distance} m · L ${base.size} m`,()=>{
   const law=LAWS[id];
   for(const charge of CHARGES){
    const p0=P({...base,charge});
    for(const s of SCALES){
     // At s = 10³ the geometry spans six decades and the sums inside the quadrature carry
     // three more digits of rounding than at s = 2; one decade of slack, still two decades
     // above anything a misplaced length could hide in.
     const ps={...p0,distance:s*p0.distance,size:s*p0.size},lift=s**(-law.m),tol=s>=1e3?1e-11:1e-12;
     const tag=`${id} q=${charge} s=${s}`;
     // A sum whose terms cancel has to be measured against the terms, not against what is
     // left of them: a closed arc (φ = 2π) adds n point charges around a full circle and the
     // answer IS zero, so both sides of the identity are rounding residue there. `term` is the
     // largest single element in the partition of that size — the scale of what is being added.
     // Where the sum survives its own terms (every lesson but the closed arc) |want| is larger
     // and the floor never applies; where it does apply it still demands agreement to 1e−12 of
     // one element, four decades under the 1e−16 a cancelling sum can actually resolve.
     const term=(n:number)=>Math.max(...sampleDistribution(id,p0,n).map(x=>magnitude(x.field)));
     closeVec(scaled(field(id,ps),lift),field(id,p0),tol,`E ${tag}`,term(1));
     if(HAS_V.has(id))close(potential(id,ps)*s,potential(id,p0),tol,`V ${tag}`);
     for(const n of QUAD_N)closeVec(scaled(numerical(id,ps,n),lift),numerical(id,p0,n),tol,`quadrature n=${n} ${tag}`,term(n));
     for(const n of SAMPLE_N){
      const A=sampleDistribution(id,p0,n),B=sampleDistribution(id,ps,n);
      expect(B,`${tag} n=${n}`).toHaveLength(A.length);
      // A coordinate that runs through zero (the bisector's midpoint, the arc's own axis)
      // cannot be compared to itself: the partition's own extent is the scale it lives on.
      const len=s*Math.max(Math.abs(p0.distance),...A.map(x=>magnitude(x.position)));
      const turn=law.angle?1:s,span=Math.max(...A.map(x=>Math.abs(x.coordinate)))*turn||1;
      const pos=tracker(),coord=tracker(),charges=tracker(),fields=tracker(),volts=tracker();
      for(const [i,a] of A.entries()){
       const at=`${tag} n=${n} #${i}`,b2=B[i],want=scaled(a.field,s**law.m),scale=magnitude(want);
       for(const axis of AXES){
        pos.note(relative(b2.position[axis],s*a.position[axis],len),`${at} ${axis}`);
        fields.note(relative(b2.field[axis],want[axis],scale),`${at} ${axis}`);
       }
       coord.note(relative(b2.coordinate,turn*a.coordinate,span),at);
       charges.note(relative(b2.dq,a.dq*s**law.e),at);
       volts.note(relative(b2.potential,a.potential*s**(law.m+1)),at);
      }
      pos.check(1e-15,`element position ${tag} n=${n}`);
      coord.check(1e-15,`element coordinate ${tag} n=${n}`);
      charges.check(1e-15,`element dq ${tag} n=${n}`);
      fields.check(1e-13,`element field ${tag} n=${n}`);
      volts.check(1e-13,`element potential ${tag} n=${n}`);
     }
    }
    // V is linear in the charge slider, closed form and drawn sum alike. Seven times the
    // charge is seven times the potential, not 7^something.
    const seven=P({...base,charge:7*charge});
    if(HAS_V.has(id))close(potential(id,seven),7*potential(id,p0),1e-14,`V linearity ${id} q=${charge}`);
    for(const n of SAMPLE_N)
     close(sumPotential(sampleDistribution(id,seven,n)),7*sumPotential(sampleDistribution(id,p0,n)),1e-13,`ΣV linearity ${id} q=${charge} n=${n}`);
   }
  });
});

// ---------------------------------------------------------------------------
// 2. Superposition across lessons
// ---------------------------------------------------------------------------
describe('one lesson against another: superposition of the closed forms',()=>{
 const DS=[.5,1.3,3,6,40],LS=[1,2.6,4,8],QS=[-2.5,1,7];
 it('a bisector rod is two endpoint rods: the transverse halves cancel, the radial halves add',()=>{
  // Both lessons stand their rod on the y-axis with P at (d, 0). Cut the bisector rod at the
  // origin and the lower half is the mirror image of the upper: E_y cancels between them and
  // E_x doubles. So one endpoint rod of length L/2 carrying Q/2 is exactly half the answer.
  for(const d of DS)for(const L of LS)for(const q of QS){
   const whole=field('bisector',P({distance:d,size:L,charge:q})),half=field('endpoint',P({distance:d,size:L/2,charge:q/2}));
   close(whole.x,2*half.x,1e-13,`bisector = 2 × endpoint · d ${d} L ${L} q ${q}`);
   expect(whole.y,`the bisector keeps no transverse push · d ${d} L ${L}`).toBe(0);
   expect(Math.sign(half.y),`and the half rod does have one to cancel · d ${d} L ${L} q ${q}`).toBe(-Math.sign(q));
  }
 });
 it('an axial rod telescopes into two shorter rods at the same λ, for E and for V',()=>{
  // The rod runs 0…L with P at L + a. Split it at L − L₁: the near piece is a rod of length
  // L − L₁ whose far end is still a from P, and the far piece is a rod of length L₁ sitting
  // a + L − L₁ back. Same λ = Q/L in all three, so the charges split as the lengths do.
  // For E this is ∫ over a union of disjoint segments; for V it is kλ ln((a+L)/a) telescoping.
  for(const d of DS)for(const L of LS)for(const q of QS)for(const f of [.2,.5,.9]){
   const L1=f*L,tag=`a ${d} L ${L} q ${q} cut ${f}`;
   const whole=P({distance:d,size:L,charge:q});
   const near=P({distance:d,size:L-L1,charge:q*(L-L1)/L}),far=P({distance:d+L-L1,size:L1,charge:q*L1/L});
   // At f = 0.9 the near piece is a tenth of the rod and 1/a − 1/(a+L−L₁) loses two digits
   // to cancellation at a = 40 m; the identity is still good to 1e−12.
   const tol=f===.9?1e-12:1e-13;
   close(field('axial',whole).x,field('axial',near).x+field('axial',far).x,tol,`E axial telescope · ${tag}`);
   close(potential('axial',whole),potential('axial',near)+potential('axial',far),tol,`V axial telescope · ${tag}`);
  }
 });
 it('two mirrored semi-infinite lines make the infinite line',()=>{
  // The semi lesson lays λ along +x from the origin with P at (0, r); its mirror image runs
  // along −x. Together they are one infinite wire: the along-wire pushes cancel and the
  // perpendicular ones add, so the semi rod carries exactly half the infinite line's field.
  for(const d of DS)for(const q of QS){
   const half=field('semi',P({distance:d,charge:q})),whole=field('infinite',P({distance:d,charge:q}));
   close(half.y,whole.x/2,1e-13,`semi = ½ infinite · r ${d} q ${q}`);
   close(half.x,-half.y,1e-13,`and the two halves cancel along the wire · r ${d} q ${q}`);
  }
 });
 it('an arc is two rotated sub-arcs, each pointing along its own bisector',()=>{
  // Split φ into φ_A + φ_B at the same λ. Each piece's field lies along its own bisector,
  // which sits at φ_B/2 on one side of the full arc's bisector and φ_A/2 on the other. So the
  // projections add as sin(a/2)cos(b/2) + cos(a/2)sin(b/2) = sin((a+b)/2) — the sine addition
  // formula applied to E = −2kλ sin(φ/2)/R — and the transverse parts cancel identically.
  for(const size of [1,4,8])for(const phi of [.4,1.1,2.3,Math.PI,5,2*Math.PI])for(const f of [.2,.5,.7])for(const q of QS){
   const R=size/2,phiA=f*phi,phiB=phi-phiA,tag=`R ${R} φ ${phi.toFixed(2)} f ${f} q ${q}`;
   const Ea=field('arc',P({size,phi:phiA,charge:q*f})),Eb=field('arc',P({size,phi:phiB,charge:q*(1-f)}));
   // Both quantities are compared against the point-charge field kQ/R², not against themselves:
   // at φ = 2π the true answer IS zero to floating-point noise, and a closing arc's cancellation
   // is the physics, not an error. Below 2π the floor is the value, so nothing is given away.
   const floor=ke*Math.abs(q)*1e-9/(R*R);
   close(field('arc',P({size,phi,charge:q})).x,Ea.x*Math.cos(phiB/2)+Eb.x*Math.cos(phiA/2),1e-13,`arc superposition · ${tag}`,floor);
   close(Ea.x*Math.sin(phiB/2),Eb.x*Math.sin(phiA/2),1e-13,`arc transverse cancellation · ${tag}`,floor);
   for(const E of [Ea,Eb])expect(E.y,`a sub-arc is still centred on its own bisector · ${tag}`).toBe(0);
  }
 });
});

// ---------------------------------------------------------------------------
// 3. The disk is a stack of rings
// ---------------------------------------------------------------------------
describe('a disk is a stack of rings: ∂/∂R at fixed σ is the ring lesson',()=>{
 // E_disk(z, R) = ∫₀^R E_ring(z; radius s, dq = σ2πs ds) ds, so differentiating the disk with
 // respect to its radius at fixed σ must hand back the ring at radius R carrying the charge of
 // a one-metre-thick shell, dQ/dR = 2πRσ. Textbook, both sides written out here:
 //   ∂/∂R [2πkσ(1 − z/√(z²+R²))·sign z] = k(2πRσ) z/(R²+z²)^{3/2}
 //   ∂/∂R [2πkσ(√(z²+R²) − |z|)]        = k(2πRσ)/√(R²+z²)
 // It is the only test of the disk's dependence on R as a FUNCTION, over a 2-D grid of (z, R)
 // and both sides of the plane, with no integrator: an R² that should be R, a σ↔Q conversion
 // off by π, or a |z| branch that only misbehaves below the plane cannot track the ring's
 // odd-in-z field and even-in-z potential along the whole R axis.
 for(const sigma of [1.7,-.6])for(const R of [.5,1,2,4])
  it(`σ ${sigma} nC/m² · R ${R} m`,()=>{
   for(const z of [-6,-1.4,-.5,.5,.9,2.2,6]){
    const tag=`σ ${sigma} R ${R} z ${z}`,dQ=2*Math.PI*R*sigma*1e-9,root=Math.hypot(R,z);
    // h = R/100. Richardson leaves −f⁽⁵⁾h⁴/480; the stiffest case here is R ≫ |z|, where the
    // disk field goes as z/R² and the residue is h⁴/4R⁴ = 2.5e−9 of the derivative. Rounding
    // is 3ε·f/(2h f′) ≈ 1e−12. Hence 1e−8, four times the truncation and four decades under
    // the 1e−4 a wrong power of R would produce.
    const h=1e-2*R;
    const Ez=richardson(r=>field('disk',P({distance:z,size:2*r,charge:sigma*Math.PI*r*r})).z,R,h);
    const Vz=richardson(r=>potential('disk',P({distance:z,size:2*r,charge:sigma*Math.PI*r*r})),R,h);
    const shell=P({distance:z,size:2*R,charge:2*Math.PI*R*sigma});
    close(Ez,ke*dQ*z/root**3,1e-8,`∂E_disk/∂R vs textbook ring · ${tag}`);
    close(Ez,field('ring',shell).z,1e-8,`∂E_disk/∂R vs the ring lesson · ${tag}`);
    close(Vz,ke*dQ/root,1e-8,`∂V_disk/∂R vs textbook ring · ${tag}`);
    close(Vz,potential('ring',shell),1e-8,`∂V_disk/∂R vs the ring lesson · ${tag}`);
   }
  });
});

// ---------------------------------------------------------------------------
// 4. E = −dV/d(coordinate)
// ---------------------------------------------------------------------------
describe('E = −dV/d(coordinate), for the closed forms and for the drawn sums',()=>{
 const PAIRS=[
  {v:'v-ring',base:'ring',axis:'z'},{v:'v-disk',base:'disk',axis:'z'},
  {v:'v-rod-bisector',base:'bisector',axis:'x'},{v:'v-rod-axial',base:'axial',axis:'x'},
 ] as const;
 const POSITIVE=[.5,.8,1.4,2.2,3.5,6,25],BELOW=[-.5,-2.2,-6];
 const SIZES=[1,2.5,4,8],QS=[-3,1,7];
 // The step is a fixed FRACTION of the distance, so it never crosses the plane and never
 // changes the sign of z. Every charge in these four geometries lies at least |d| from P, so
 // the worst case for the truncation is the whole charge sitting exactly there: V = A/d gives
 // −V⁽⁵⁾h⁴/480 = (h/d)⁴/4 of V′, i.e. 6e−11 at h = 4e−3 d. Rounding runs the other way,
 // 3ε·d/2h ≈ 4e−13 (2e−11 for a 200-term sum). 1e−9 sits an order above both.
 const STEP=4e-3;
 const grid=(id:string)=>id==='ring'||id==='disk'?[...POSITIVE,...BELOW]:POSITIVE;
 for(const {v,base,axis} of PAIRS)
  it(`${v}: −dV/d(distance) is ${base}'s closed-form field`,()=>{
   for(const d of grid(base))for(const size of SIZES)for(const charge of QS){
    const p=P({distance:d,size,charge}),h=STEP*Math.abs(d);
    const slope=richardson(x=>potential(v,{...p,distance:x}),d,h);
    close(-slope,field(base,p)[axis],1e-9,`−dV/dd = E${axis} · ${v} d ${d} L ${size} q ${charge}`);
   }
  });
 const BOUNDS:[number,number][]=[[0,100],[0,50],[13,71],[100,0]];
 const PROGRESS=[1,.5,.13],NS=[1,2,3,5,8,37,200];
 for(const {v,base,axis} of PAIRS)
  it(`${v}: the same identity term by term over the partition, under bounds, progress and reversal`,()=>{
   // These four partitions do not depend on the distance at all — the pieces sit on the ring,
   // the disk or the rod, and only P moves. So every term of the weighted potential sum is
   // k·dq·w/r with r the only thing that knows about d, and d/dd of it is minus the identically
   // weighted field term. The identity therefore holds for ANY weights: a sumPotential that
   // ignored progress, dropped the fractional edge bin, or reversed differently from
   // sumInterval would break it at n = 5, [13, 71], progress 0.5, and nowhere else in the suite.
   for(const d of grid(base))for(const size of [1,4])for(const charge of [-3,7])for(const n of NS){
    const p=P({distance:d,size,charge}),h=STEP*Math.abs(d);
    const at=(x:number)=>sampleDistribution(base,{...p,distance:x},n);
    const wide=[at(d+h),at(d-h)],half=[at(d+h/2),at(d-h/2)],here=at(d);
    for(const bounds of BOUNDS)for(const progress of PROGRESS){
     const V=(pair:ReturnType<typeof at>[],step:number)=>(sumPotential(pair[0],bounds,progress)-sumPotential(pair[1],bounds,progress))/(2*step);
     const slope=(4*V(half,h/2)-V(wide,h))/3;
     close(-slope,sumInterval(here,bounds,progress)[axis],1e-9,
      `−dΣV/dd = ΣE${axis} · ${v} d ${d} L ${size} q ${charge} n ${n} bounds ${bounds.join('→')} progress ${progress}`);
    }
   }
  });
 it('a potential lesson and its field twin draw the identical partition, element for element',()=>{
  // The differentiate-back step only means anything if both sides are summing the same pieces.
  const p=P({distance:1.9,size:3.8,charge:2.4,phi:2.3});
  const TWINS:[ProblemId,ProblemId][]=[['v-ring','ring'],['v-disk','disk'],['v-arc','arc'],['v-rod-bisector','bisector'],['v-rod-axial','axial']];
  for(const [v,base] of TWINS)for(const n of SAMPLE_N)
   expect(JSON.stringify(sampleDistribution(v,p,n)),`${v} vs ${base} at n=${n}`).toBe(JSON.stringify(sampleDistribution(base,p,n)));
 });
});

// ---------------------------------------------------------------------------
// 5. Monotone falloff and point-charge bounds
// ---------------------------------------------------------------------------
describe('monotone falloff and point-charge bounds, on a grid that runs past the sliders',()=>{
 // 400 points from 0.05 m to 60 m, geometric: 1.79% per step, thirteen decades above rounding,
 // and covering 0.05…0.5 and 6…60 where the sliders never go. A bounded positive charge lying
 // wholly on one side of P pushes weaker the further P walks away, and never harder than the
 // same charge squeezed into its nearest point.
 const GRID=Array.from({length:400},(_,i)=>.05*(60/.05)**(i/399));
 const falling=(values:number[],what:string)=>{
  for(let i=1;i<values.length;i++)expect(values[i],`${what}: step ${i} did not fall`).toBeLessThan(values[i-1]);
 };
 for(const size of [1,4,8])it(`|E| and V fall off monotonically along the ray · L or 2R = ${size} m`,()=>{
  const at=(d:number)=>P({distance:d,size,charge:1});
  for(const id of ['bisector','axial','endpoint','infinite','semi','disk'] as const)
   falling(GRID.map(d=>magnitude(field(id,at(d)))),`|E| ${id}`);
  // The transverse component is a difference of two nearly equal terms far away; it has to
  // fall too, and it is the half that a sign slip inside the difference form would break.
  for(const id of ['endpoint','ramp'] as const)
   falling(GRID.map(d=>Math.abs(field(id,at(d)).y)),`|E_y| ${id}`);
  for(const id of ['v-ring','v-disk','v-rod-bisector','v-rod-axial'] as const)
   falling(GRID.map(d=>potential(id,at(d))),`V ${id}`);
 });
 for(const size of [1,4,8])it(`the ring climbs to its peak at z = R/√2 and falls beyond · 2R = ${size} m`,()=>{
  // The one geometry that is not monotone: on the axis of a ring E_z starts at zero, peaks at
  // z = R/√2 and then decays. The peak value 2kQ/(3√3R²) is textbook; the grid straddles it.
  const R=size/2,zp=R/Math.SQRT2,peak=2*ke*1e-9/(3*Math.sqrt(3)*R*R);
  const Ez=(z:number)=>field('ring',P({distance:z,size,charge:1})).z;
  close(Ez(zp),peak,1e-12,`ring peak value · R ${R}`);
  if(R===2)expect(Ez(zp),'2kQ/(3√3R²) at Q = 1 nC, R = 2 m').toBeCloseTo(.86483,5);
  const below=GRID.filter(z=>z<zp),above=GRID.filter(z=>z>zp);
  expect(below.length,'the grid brackets the peak from below').toBeGreaterThan(0);
  expect(above.length,'and from above').toBeGreaterThan(0);
  for(let i=1;i<below.length;i++)expect(Ez(below[i]),`rising below the peak at step ${i}`).toBeGreaterThan(Ez(below[i-1]));
  for(let i=1;i<above.length;i++)expect(Ez(above[i]),`falling above the peak at step ${i}`).toBeLessThan(Ez(above[i-1]));
  // The two grid points either side sit 1.8% away, so each must be strictly under the peak.
  for(const z of [below[below.length-1],above[0]])expect(Ez(z),`the neighbour at z = ${z} is below the peak`).toBeLessThan(peak);
  for(const z of GRID)expect(Ez(z),`nothing on the axis beats the peak · z = ${z}`).toBeLessThanOrEqual(peak);
 });
 it('the arc weakens monotonically as it closes',()=>{
  // |E| = 2kQ sin(φ/2)/(R²φ), and sin x / x falls strictly on (0, π]. At φ = 2π the closed ring
  // leaves nothing at all, and the last step still has to be a step down.
  for(const size of [1,4,8])
   falling(Array.from({length:400},(_,j)=>Math.abs(field('arc',P({size,phi:2*Math.PI*(j+1)/400,charge:1})).x)),`|E| arc · 2R = ${size}`);
 });
 for(const size of [1,4,8])it(`every closed form stays inside its point-charge bound · L or 2R = ${size} m`,()=>{
  const R=size/2,q=1e-9,sigma=1/(Math.PI*R*R); // σ in nC/m² of a 1 nC disk of this radius
  const plate=2*Math.PI*ke*sigma*1e-9;         // σ/2ε₀, since 2πk = 1/2ε₀
  for(const d of GRID){
   const p=P({distance:d,size,charge:1}),point=ke*q/(d*d),tag=`d ${d.toFixed(4)} · 2R ${size}`;
   expect(field('bisector',p).x,`a rod is weaker than its charge at the near point · ${tag}`).toBeLessThan(point);
   expect(field('ring',p).z,`a ring is weaker than the same charge on the axis · ${tag}`).toBeLessThan(point);
   expect(field('disk',p).z,`a disk is weaker than a point charge · ${tag}`).toBeLessThan(point);
   expect(field('disk',p).z,`a disk never reaches the infinite plate · ${tag}`).toBeLessThan(plate);
   expect(field('disk',p).z,`and never reaches the sheet lesson at the same σ · ${tag}`).toBeLessThan(field('sheet',P({distance:d,charge:sigma})).z);
   expect(potential('v-ring',p),`V_ring < kQ/z · ${tag}`).toBeLessThan(ke*q/d);
   expect(potential('v-disk',p),`V_disk < 2kQ/R · ${tag}`).toBeLessThan(2*ke*q/R);
   // Spreading the same charge over the disk brings some of it closer than the ring's rim:
   // V_disk = 2kQ/(h + z) beats V_ring = kQ/h for every finite z, since h > z.
   expect(potential('v-disk',p),`V_disk > V_ring at equal Q and R · ${tag}`).toBeGreaterThan(potential('v-ring',p));
  }
 });
});
