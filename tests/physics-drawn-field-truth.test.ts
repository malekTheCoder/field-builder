import {describe,it,expect} from 'vitest';
import {sampleDistribution,coarsen} from '../src/diagrams/sampling';
import {fieldLines,type Plane,localRadii} from '../src/diagrams/fieldlines';
import {vectorGrid} from '../src/diagrams/vectorfield';
import {annuliField,meridianLines,spaceGrid,spaceLines} from '../src/diagrams/field3d';
import {REGISTRY} from '../src/distributions';
import type {ChargeSample} from '../src/distributions/types';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../src/problems/types';
import {isReady} from '../src/problems/readiness';
import type {Vec} from '../src/symbolic/physics';
// ---------------------------------------------------------------------------
// WHAT THE FIGURE DRAWS IS THE PHYSICS.
//
// Every other physics test in this repo checks a NUMBER: E at P, the sum over
// the samples, a limiting case. None of them looks at the curves and arrows the
// student actually sees. A tracer fed a rotated field draws equipotentials; one
// fed −E draws the lines of the opposite charge; a backward half concatenated
// without reversal draws a line that runs out of the charge and back into it;
// a seed regime that lands every line 300 m off the page draws the field of two
// point charges and calls it an infinite wire. Every one of those passes
// ground-truth.test.ts and independent-integration.test.ts untouched.
//
// So this file takes the SHIPPED drawing configuration — FieldCanvas' stride,
// step, maxSteps and outerLimit, FieldStage's 48/24 thinning and its spaceLines
// options, the 'xz' meridian lift, the two arrow lattices — and asks whether
// what comes out is tangent to, and the right length for, a field computed here
// from Coulomb's law and the setup text alone. Nothing below reads a closed
// form out of src/distributions: the rod is the textbook segment formula
// derived in the comment beside it, the sheet is σ/2ε₀ sign(z) ẑ, the ring and
// arc are azimuthal quadratures written here, the disk is a nested adaptive
// Simpson over those rings. Where the reference must be discrete (a chord can
// only be tangent to the field that was traced) the point charges are rebuilt
// here from the setup and CHECKED against the app's partition first, so the
// partition gets audited for free.
//
// The bugs this would catch, in the order they would bite: a dropped field
// component or a P−S sign flip in planeField/spaceField (tens of degrees, or
// 180°); a tracer that integrates E rather than Ê (chords fine, V ratio wrong);
// a backward half that is not reversed (V rises then falls); a cloud() that
// puts its points on the wrong radius or divides dq by the wrong count (exact
// on-axis theorem, 1e-12); an arrow lattice that lands on the rod and draws a
// vector that is neither the rod's field nor anything else; a seed rule that
// leaves the picture blank.
// ---------------------------------------------------------------------------

// ---- arithmetic -----------------------------------------------------------
type V3=[number,number,number];
const EPS_0=8.8541878128e-12;               // CODATA, re-entered by hand rather than imported.
const ke=1/(4*Math.PI*EPS_0);
const NANO=1e-9;
const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const plus=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a:V3,c:number):V3=>[a[0]*c,a[1]*c,a[2]*c];
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=(a:V3)=>Math.hypot(a[0],a[1],a[2]);
const v3=(v:Vec):V3=>[v.x,v.y,v.z];
const flat=(p:Plane):V3=>[p.x,p.y,0];
/** Angle between two vectors in degrees, by atan2 of |a×b| against a·b: acos loses every
 * digit of a small angle to cancellation, and a small angle is the whole subject here. */
const angleDeg=(a:V3,b:V3)=>{const la=len(a),lb=len(b);if(!(la>0)||!(lb>0))return NaN;
 return Math.atan2(len(cross(a,b)),dot(a,b))*180/Math.PI;};
const params=(over:Partial<Params>={}):Params=>({...DEFAULT_PARAMS,...over});

/** Adaptive Simpson with Richardson extrapolation; `eps` is an ABSOLUTE error budget, so
 * callers pass a fraction of the field scale the geometry plainly has rather than a fraction
 * of a component symmetry may annihilate. */
function adaptive(g:(t:number)=>number,a:number,b:number,eps:number):number{
 const panel=(lo:number,hi:number,flo:number,fm:number,fhi:number)=>(hi-lo)/6*(flo+4*fm+fhi);
 const refine=(lo:number,hi:number,flo:number,fm:number,fhi:number,whole:number,tol:number,depth:number):number=>{
  const m=(lo+hi)/2,left=(lo+m)/2,right=(m+hi)/2,fl=g(left),fr=g(right);
  const l=panel(lo,m,flo,fl,fm),r=panel(m,hi,fm,fr,fhi),delta=l+r-whole;
  if(depth===0||Math.abs(delta)<=15*tol)return l+r+delta/15;
  return refine(lo,m,flo,fl,fm,l,tol/2,depth-1)+refine(m,hi,fm,fr,fhi,r,tol/2,depth-1);
 };
 const fa=g(a),fb=g(b),fm=g((a+b)/2);
 return refine(a,b,fa,fm,fb,panel(a,b,fa,fm,fb),eps,26);
}
/** Vector integral over a chain of breakpoints, one cached evaluation per node so the three
 * component passes walk the same tree. Breakpoints go at the peaks by hand. */
function segInt(g:(t:number)=>V3,breaks:number[],eps:number):V3{
 const seen=new Map<number,V3>();
 const f=(t:number)=>{const hit=seen.get(t);if(hit)return hit;const v=g(t);seen.set(t,v);return v;};
 const share=eps/(breaks.length-1);let sum:V3=[0,0,0];
 for(let i=0;i<breaks.length-1;i++)sum=plus(sum,[0,1,2].map(c=>adaptive(t=>f(t)[c],breaks[i],breaks[i+1],share)) as V3);
 return sum;
}

// ---- references, each written from the setup text and Coulomb's law --------
/** A set of point charges, summed by Coulomb. Used where the reference MUST be discrete:
 * a chord can only be tangent to the field the tracer was actually given. */
const pointsField=(q:readonly {dq:number;at:V3}[],P:V3):V3=>{
 let s:V3=[0,0,0];
 for(const c of q){const d=sub(P,c.at),r=len(d);if(r<1e-12)continue;s=plus(s,mul(d,ke*c.dq/(r*r*r)));}
 return s;};
const pointsPotential=(q:readonly {dq:number;at:V3}[],P:V3)=>{
 let v=0;for(const c of q)v+=ke*c.dq/len(sub(P,c.at));return v;};

/** Exact field of a uniform straight segment A→B of total charge q, at any P off its line.
 *
 *   put u = (arclength from A) − s where s = (P−A)·d̂, and ρ = |P−A−s d̂|; then
 *   E = kλ ∫ (ρ ŵ − u d̂)/(ρ²+u²)^{3/2} du over u ∈ [−s, L−s], and both primitives are
 *   elementary: ∫du/(ρ²+u²)^{3/2} = u/(ρ²√(ρ²+u²)), ∫u du/(ρ²+u²)^{3/2} = −1/√(ρ²+u²).
 * On the line (ρ = 0) only the parallel term survives, and it is still exact provided P is
 * outside the segment — which the support-distance filters below guarantee. */
function segmentField(A:V3,B:V3,q:number,P:V3):V3{
 const d=sub(B,A),L=len(d),dh=mul(d,1/L),lam=q/L;
 const rel=sub(P,A),s=dot(rel,dh),w=sub(rel,mul(dh,s)),rho=len(w);
 const u1=-s,u2=L-s,r1=Math.hypot(rho,u1),r2=Math.hypot(rho,u2);
 const par=ke*lam*(1/r2-1/r1);
 const perp=rho>1e-12?ke*lam/rho*(u2/r2-u1/r1):0;
 return plus(mul(dh,par),rho>1e-12?mul(w,perp/rho):[0,0,0]);
}
/** The same integral with the far end sent to infinity: u₂ → ∞ kills 1/r₂ and sends
 * u₂/r₂ → 1. At P = (0, r) off the foot of a ray along +x this is (−kλ/r, kλ/r), the
 * textbook 45° answer. */
function rayField(A:V3,dh:V3,lam:number,P:V3):V3{
 const rel=sub(P,A),s=dot(rel,dh),w=sub(rel,mul(dh,s)),rho=len(w);
 const u1=-s,r1=Math.hypot(rho,u1);
 const par=ke*lam*(0-1/r1),perp=rho>1e-12?ke*lam/rho*(1-u1/r1):0;
 return plus(mul(dh,par),rho>1e-12?mul(w,perp/rho):[0,0,0]);
}
/** E = 2kλ/ρ ρ̂ about an infinite wire through the origin along d̂. Gauss, no integral. */
function wireField(dh:V3,lam:number,P:V3):V3{
 const w=sub(P,mul(dh,dot(P,dh))),rho=len(w);
 return rho>1e-12?mul(w,2*ke*lam/(rho*rho)):[0,0,0];
}
/** Rod on [0,L] of the y-axis with λ(y) = λ₀ y/L. No closed form is used: adaptive Simpson
 * of the point-charge integrand, broken at the foot of the perpendicular where it peaks. */
function rampField(L:number,lam0:number,P:V3):V3{
 const scaleE=ke*lam0/L,peak=Math.min(L,Math.max(0,P[1]));
 const eps=1e-12*Math.abs(scaleE)*L/Math.max(.05,Math.hypot(P[0],P[2]));
 return segInt(y=>{const d=sub(P,[0,y,0]),r=len(d);return mul(d,scaleE*y/(r*r*r));},[0,peak,L],eps);
}
/** Field per unit charge of a uniform circular wire of radius s centred on the origin in the
 * z = 0 plane, read at (ρ, 0, ζ), returned as [E_ρ, E_z].
 *
 * The integrand is analytic and 2π-periodic, so the plain trapezoid converges like
 * exp(−m·δ) where δ is the width of the analyticity strip, and δ ≈ (closest approach to the
 * wire)/s. Taking m = 44 s/approach therefore lands at exp(−44) ≈ 1e−19 — below the rounding
 * of the sum itself — everywhere this is called. */
function ringUnit(s:number,rho:number,zz:number):[number,number]{
 const approach=Math.max(Math.hypot(Math.abs(rho-s),zz),1e-9);
 const m=Math.min(1<<18,Math.max(512,Math.ceil(44*s/approach)));
 let er=0,ez=0;
 for(let i=0;i<m;i++){
  const a=2*Math.PI*i/m,dx=rho-s*Math.cos(a),dy=-s*Math.sin(a);
  const r3=(dx*dx+dy*dy+zz*zz)**1.5;
  er+=dx/r3;ez+=zz/r3;
 }
 return [ke*er/m,ke*ez/m];
}
/** Uniform ring of radius R and total charge q in the z = 0 plane, at any P. */
function ringField(R:number,q:number,P:V3):V3{
 const rho=Math.hypot(P[0],P[1]),[er,ez]=ringUnit(R,rho,P[2]);
 return rho>1e-12?[q*er*P[0]/rho,q*er*P[1]/rho,q*ez]:[0,0,q*ez];
}
/** Uniform arc of radius R spanning −φ/2…φ/2 about +x, total charge q, by composite Simpson
 * on 4096 panels. dq = q dθ/φ. With the callers kept at least 0.2 m from the wire the panel
 * width (1.5 mm of arc) is 1e−2 of the nearest length scale, so the h⁴ error is ~1e−8. */
function arcField(R:number,q:number,phi:number,P:V3):V3{
 const n=4096,h=phi/n;let sum:V3=[0,0,0];
 for(let i=0;i<=n;i++){
  const th=-phi/2+i*h,w=i===0||i===n?1:i%2?4:2;
  const d=sub(P,[R*Math.cos(th),R*Math.sin(th),0]),r=len(d);
  sum=plus(sum,mul(d,w/(r*r*r)));
 }
 return mul(sum,ke*q/phi*h/3);
}
/** Uniform disk of radius R and total charge q in the z = 0 plane: the rings above, swept in
 * s by adaptive Simpson with a breakpoint at s = ρ.
 *
 * The brief asked for a fixed 1024-panel Simpson in s. It cannot be used here: at |ζ| = 0.05
 * the s-integrand has a peak of width 0.05 sitting at s = ρ, which 1024 uniform panels over
 * [0,2] straddle with two nodes. Bisecting to the peak is strictly stronger, and the
 * breakpoint puts the kink on a panel edge where Simpson is exact rather than inside one. */
function diskField(R:number,q:number,P:V3):V3{
 const rho=Math.hypot(P[0],P[1]),zz=P[2],sigma=q/(Math.PI*R*R),c=2*Math.PI*sigma;
 const breaks=rho>1e-9&&rho<R?[0,rho,R]:[0,R];
 // An ABSOLUTE budget, so it has to be scaled to the field that is actually there: σ/2ε₀
 // close in, kQ/d² far away. Fixing it at the near-field scale would leave the far field —
 // where this is checked against kQ/z² — accurate to eight per cent of nothing.
 const eps=1e-9*Math.min(Math.abs(sigma)/(2*EPS_0),ke*Math.abs(q)/Math.max(len(P),R)**2);
 const seen=new Map<number,[number,number]>();
 const at=(s:number)=>{const hit=seen.get(s);if(hit)return hit;const v=ringUnit(s,rho,zz);seen.set(s,v);return v;};
 const er=segInt(s=>[c*s*at(s)[0],0,0],breaks,eps)[0];
 const ez=segInt(s=>[c*s*at(s)[1],0,0],breaks,eps)[0];
 return rho>1e-12?[er*P[0]/rho,er*P[1]/rho,ez]:[0,0,ez];
}
/** The one lesson with no integral at all: an infinite sheet's field is σ/2ε₀ away from it. */
const sheetField=(sigma:number,P:V3):V3=>[0,0,Math.sign(P[2])*sigma/(2*EPS_0)];

// ---- the setup text, as geometry -------------------------------------------
/** Where each lesson's charge actually lives, and what its field is. Read off the `setup`
 * prose in src/problems, not off src/distributions. `support` is the continuum object — the
 * segment, the ray, the whole wire — because "is this arrow drawn on top of the charge?" is
 * a question about the rod, not about whichever sample happens to be nearest. */
type Lesson={support(P:V3,p:Params):number;field(P:V3,p:Params):V3;line?:{A:V3;B:V3}};
const distanceToSegment=(A:V3,B:V3,P:V3)=>{
 const d=sub(B,A),L2=dot(d,d),t=Math.max(0,Math.min(1,dot(sub(P,A),d)/L2));
 return len(sub(P,plus(A,mul(d,t))));};
const ROD:Record<'bisector'|'axial'|'endpoint'|'ramp',(p:Params)=>{A:V3;B:V3}>={
 bisector:p=>({A:[0,-p.size/2,0],B:[0,p.size/2,0]}),
 axial:p=>({A:[0,0,0],B:[p.size,0,0]}),
 endpoint:p=>({A:[0,0,0],B:[0,p.size,0]}),
 ramp:p=>({A:[0,0,0],B:[0,p.size,0]}),
};
/* Checks are run for the lessons that SHIP.
 *
 * The three unbounded geometries are held back in `src/problems/readiness.ts`, and they are held
 * back for exactly what this file measures: their partition runs to infinity, so "one element" is
 * itself infinite and the pictures built from it do not yet read. Asserting they draw well would
 * be asserting something nobody claims.
 *
 * They are filtered by that same file rather than deleted here, so publishing one turns its
 * checks back on in the same commit -- the suite cannot quietly stay green for a lesson that has
 * just been shipped. What is skipped is named out loud at the end of the run, because a suite
 * that silently covers less than it appears to is worse than one that fails. */
const SHIPPING = <T extends ProblemId>(ids: readonly T[]) => ids.filter(isReady);
const HELD_BACK = new Set<string>();
for (const id of ['infinite', 'semi', 'sheet'] as ProblemId[]) if (!isReady(id)) HELD_BACK.add(id);
const shipping = <T extends ProblemId>(ids: readonly T[]) => { for (const id of ids) if (!isReady(id)) HELD_BACK.add(id); return SHIPPING(ids); };
const LESSON:Record<string,Lesson>={
 bisector:{support:(P,p)=>distanceToSegment(ROD.bisector(p).A,ROD.bisector(p).B,P),
  field:(P,p)=>segmentField(ROD.bisector(p).A,ROD.bisector(p).B,p.charge*NANO,P)},
 axial:{support:(P,p)=>distanceToSegment(ROD.axial(p).A,ROD.axial(p).B,P),
  field:(P,p)=>segmentField(ROD.axial(p).A,ROD.axial(p).B,p.charge*NANO,P)},
 endpoint:{support:(P,p)=>distanceToSegment(ROD.endpoint(p).A,ROD.endpoint(p).B,P),
  field:(P,p)=>segmentField(ROD.endpoint(p).A,ROD.endpoint(p).B,p.charge*NANO,P)},
 ramp:{support:(P,p)=>distanceToSegment(ROD.ramp(p).A,ROD.ramp(p).B,P),
  field:(P,p)=>rampField(p.size,p.charge*NANO,P)},
 // The whole y-axis: λ is the slider, and there is no end to be far from.
 infinite:{support:P=>Math.hypot(P[0],P[2]),field:(P,p)=>wireField([0,1,0],p.charge*NANO,P)},
 // x ≥ 0 on the x-axis; behind the origin the nearest charge is the origin itself.
 semi:{support:P=>P[0]>=0?Math.hypot(P[1],P[2]):len(P),field:(P,p)=>rayField([0,0,0],[1,0,0],p.charge*NANO,P)},
};

// ---- the shipped drawing configuration, copied from its two consumers -------
/** src/diagrams/FieldCanvas.tsx: one sample in `stride` is drawn from, the trace is scaled by
 * how far the KEPT samples reach, and the lattice is scaled by the `reach` prop instead. */
const UNBOUNDED=['infinite','semi','sheet'];
/** What ChargeDiagram hands the tracers for the unbounded geometries: a partition fine enough to
 * be the geometry, and a bigger budget to sum from. It is the MERGE target that limits how
 * radial their drawn field is -- 64 elements is 1.54 degrees off radial on the infinite line at
 * 6.7 m out, 128 is 0.66, 256 is 0.28 -- not how far the partition is truncated. */
const fieldCut=(id:ProblemId,p:Params,n:number)=>sampleDistribution(id,p,UNBOUNDED.includes(id)?Math.max(n,400):n);
/** What a truncated infinite domain costs, in degrees.
 *
 * A bounded charge is represented exactly by enough elements. An unbounded one never is: the
 * partition is cut off at a finite distance, and whatever is beyond pulls a little on the drawn
 * field. Measured on the infinite line 6.7 m out, the residual falls with the element budget --
 * 64 elements is 1.54 degrees off radial, 128 is 0.66, 256 is 0.28 -- but extending the
 * truncation alone plateaus at 0.82, so it is the budget and not the cut-off that governs. At
 * the budget these lessons ship with, the worst readings anywhere are 0.53 degrees on a drawn
 * line and 2.83 on the most distant arrow of the spatial lattice, at the far corner 7.07 m out.
 *
 * So the bar is the bounded one everywhere, and three degrees on the geometries that run to
 * infinity -- which is a statement about what can be drawn, not a tolerance chosen to pass. */
const UNBOUNDED_BAR=3;
const barFor=(id:ProblemId,bounded:number)=>UNBOUNDED.includes(id)?Math.max(bounded,UNBOUNDED_BAR):bounded;
const canvasBudget=(id:ProblemId)=>UNBOUNDED.includes(id)?192:64;
const stageBudget=(id:ProblemId,_surface:boolean)=>UNBOUNDED.includes(id)?144:48;
const canvasThin=(s:readonly ChargeSample[],budget=64)=>({stride:Math.max(1,Math.ceil(s.length/budget)),coarse:coarsen(s,budget)});
const canvasReach=(c:readonly ChargeSample[])=>Math.max(...c.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)),1);
// One rule for both views, and it is the PICTURE's half-width that sets it, never the charge's.
// These mirror src/diagrams/FieldCanvas.tsx and src/diagrams/three/FieldStage.tsx exactly; when
// they drifted apart, this file was measuring a configuration the app never uses -- the old one,
// scaled to a charge that on three lessons runs for hundreds of metres.
const canvasTrace=(reach:number,span=reach)=>({step:Math.min(reach,span)*.05,maxSteps:420,outerLimit:reach*1.6,seedLimit:reach*.95});
/** ChargeDiagram.tsx passes this as `reach`; it is the half-width of the drawn picture. */
const frameReach=(p:Params)=>Math.max(2.5,p.distance*1.7,p.size);
/** src/diagrams/three/FieldStage.tsx: 48 elements for a wire, 24 for a surface. */
const stageThin=(s:readonly ChargeSample[],limit:number)=>({stride:Math.max(1,Math.ceil(s.length/limit)),few:coarsen(s,limit)});
const chargeSpan=(c:readonly ChargeSample[])=>Math.max(...c.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)),.5);
const stageReach=(p:Params)=>Math.round(Math.min(9,Math.max(3.5,p.size*1.5))*2)/2;
const stageTrace=(reach:number,span=reach)=>({step:Math.min(reach,span)*.04,maxSteps:420,outerLimit:reach*1.6,seedLimit:reach*.95});
/** FieldCanvas leaves `lines` at its default of 15; every seeding rule in the two modules
 * rounds count/2, count/4 or count/8, and 15 and 16 round to the same seed set, so the 16 the
 * brief names and the 15 that ships draw the identical picture. */
const LINES=16;
/** Charge as the app's sample list gives it, ready for a reference sum written here. */
const asCharges=(s:readonly ChargeSample[])=>s.map(c=>({dq:c.dq,at:v3(c.position)}));
/** The gap between the drawn elements NEAREST a point. The discretisation ripple a distance h
 * from a row of charges spaced a apart is ~exp(−2πh/a), so "how far from the charge must a
 * test point be before the drawn field is the continuum's" is answered in units of the LOCAL
 * gap — which on the tan-partitioned lines varies from centimetres to hundreds of metres. */
function localGap(c:readonly ChargeSample[],P:V3):number{
 if(c.length<2)return Infinity;
 let best=0,bd=Infinity;
 for(let i=0;i<c.length;i++){const d=len(sub(P,v3(c[i].position)));if(d<bd){bd=d;best=i;}}
 const at=(i:number)=>v3(c[i].position);
 const gaps=[best>0?len(sub(at(best),at(best-1))):0,best<c.length-1?len(sub(at(best),at(best+1))):0];
 return Math.max(...gaps);
}
/** Distance from a point to the nearest drawn element. The tracer's step, the ripple and the
 * chord error are all measured against this, never against an absolute number of metres. */
const nearestElement=(c:readonly ChargeSample[],P:V3)=>{
 let best=Infinity;for(const s of c)best=Math.min(best,len(sub(P,v3(s.position))));return best;};
const verts=(line:readonly Plane[]):V3[]=>line.map(flat);
const mid=(a:V3,b:V3):V3=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
/** A worst-case tracker that remembers where the worst happened, so a failure reads as a
 * measurement rather than as a number. */
function worstOf(){const w={value:-Infinity,where:''};
 return {w,see(value:number,where:string){if(value>w.value){w.value=value;w.where=where;}},
  get value(){return w.value===-Infinity?0:w.value;},get where(){return w.where;}};}

// ===========================================================================
// 1. Every chord of every traced 2D line is tangent to the field.
// ===========================================================================
// Four claims, kept apart because they fail for different reasons and a reader deserves to
// know which one broke.
//
//  (i)  No drawn segment runs against the field at its own start. Each line is assembled as
//       [backward half reversed, forward half] precisely so an arrowhead can follow the
//       polyline without knowing the sign of the charge; a half joined without reversing it,
//       or a sign slip in `heading`, shows up here and nowhere else.
//  (ii) Four tracer steps clear of every drawn element, the CENTRED chord is within 1° of
//       the field summed here from those same elements. The centred chord cancels the
//       first-order curvature, leaving h²κ′/6; four steps out the field varies on the scale
//       r = 4h, so κ ≲ 1/r and κ′ ≲ 1/r², giving h²/(6·16h²) = 0.010 rad = 0.6°. Under a
//       degree, and nothing like the tens of degrees a dropped component costs.
// (iii) The same chords against the CONTINUUM — the textbook segment formula, the ramp's
//       Simpson, Gauss for the wire — wherever the vertex also stands two local element gaps
//       clear of the charge, where the ripple exp(−2πh/a) is under 1e−3, i.e. 0.06°.
//  (iv) The drawn polyline turns where the field turns. A streamline's turn between two
//       consecutive chords is ∫κ ds over the span, which is the turn of the field between
//       their midpoints to third order; 5° of slack covers that and nothing else.
const ROD_LESSONS=shipping(['bisector','axial','endpoint','infinite','semi'] as ProblemId[]);
const CHORD_NS=[24,64,160,200];
describe('2D field lines: every chord runs along the field it is drawn from',()=>{
 for(const id of ROD_LESSONS)for(const q of [2,-2])
  it(`${id}, charge ${q}: chords tangent to the summed field and to the textbook rod`,()=>{
   const notes:string[]=[];let against=0,againstAt='',nan=0,short=0,empty=0,summed=0,booked=0;
   const wSum=worstOf(),wBook=worstOf();
   for(const n of CHORD_NS){
    const p=params({charge:q}),{coarse}=canvasThin(fieldCut(id,p,n),canvasBudget(id));
    // The picture's half-width drives the trace; the charge's span is only a floor under the
    // step. Passing the charge's span as both is what FieldCanvas used to do, and it is the
    // bug this file exists to catch -- measuring it here would measure the bug as the rule.
    const reach=frameReach(p),span=canvasReach(coarse),step=Math.min(reach,span)*.05;
    const lines=fieldLines(coarse,LINES,canvasTrace(reach,span));
    if(!lines.length){empty++;notes.push(`N=${n}: nothing drawn`);continue;}
    const charges=asCharges(coarse);const nSum=worstOf(),nBook=worstOf();let sHere=0,bHere=0;
    for(const line of lines){
     if(line.length<3)short++;
     const v=verts(line);
     for(const w of v)if(!w.every(Number.isFinite))nan++;
     for(let i=0;i<v.length-1;i++){
      const chord=sub(v[i+1],v[i]);
      if(len(chord)<1e-12)continue;
      if(dot(chord,pointsField(charges,v[i]))<=0){if(!against)againstAt=`N=${n} at (${v[i][0].toFixed(2)},${v[i][1].toFixed(2)})`;against++;}
     }
     for(let i=1;i<v.length-1;i++){
      const chord=sub(v[i+1],v[i-1]);
      if(len(chord)<1e-12||nearestElement(coarse,v[i])<4*step)continue;
      sHere++;summed++;
      const at=`(${v[i][0].toFixed(2)},${v[i][1].toFixed(2)})`;
      nSum.see(angleDeg(chord,pointsField(charges,v[i])),at);
      const d=LESSON[id].support(v[i],p),gap=localGap(coarse,v[i]);
      if(d<2*gap)continue;
      bHere++;booked++;
      nBook.see(angleDeg(chord,LESSON[id].field(v[i],p)),`${at}, ${d.toFixed(2)} m out, local gap ${gap.toFixed(3)} m`);
     }
    }
    wSum.see(nSum.value,`N=${n} ${nSum.where}`);wBook.see(nBook.value,`N=${n} ${nBook.where}`);
    notes.push(`N=${n}: ${lines.length} lines, ${sHere}/${bHere} vertices past 4 steps (${(4*step).toFixed(2)} m)/2 gaps, worst vs summed ${nSum.value.toFixed(3)}°, vs textbook ${nBook.value.toFixed(3)}°`);
   }
   const log=notes.join(' · ');
   expect(empty,`${id} q=${q}: the figure drew nothing. ${log}`).toBe(0);
   expect(nan,`${id} q=${q}: ${nan} non-finite vertices. ${log}`).toBe(0);
   expect(short,`${id} q=${q}: ${short} polylines shorter than 3 vertices. ${log}`).toBe(0);
   expect(against,`${id} q=${q}: ${against} drawn segments run AGAINST the field at their own start, first ${againstAt}. ${log}`).toBe(0);
   expect(summed,`${id} q=${q}: not one drawn vertex gets four tracer steps clear of an element. ${log}`).toBeGreaterThan(0);
   expect(wSum.value,`${id} q=${q}: worst centred chord vs the summed field ${wSum.value.toFixed(3)}°, ${wSum.where} (${summed} vertices). ${log}`).toBeLessThan(1);
   expect(booked,`${id} q=${q}: not one drawn vertex stands two element gaps clear of the charge — nowhere on the drawing is the field of a continuous rod. ${log}`).toBeGreaterThan(0);
   expect(wBook.value,`${id} q=${q}: worst centred chord vs the textbook field ${wBook.value.toFixed(3)}°, ${wBook.where} (${booked} vertices). ${log}`).toBeLessThan(1);
  });
 // (iv) The kink at the root, stated on its own so it cannot be mistaken for the three above.
 // fieldlines.ts stops a line "about one element spacing" short of an element on purpose,
 // because closer in the sum is the field of that one element rather than of the rod. But
 // the test is made AFTER the step is taken and the step, 0.05·reach, is twice that radius
 // on these lessons — so the last vertex lands deep inside it and the last segment kinks.
 for(const id of ROD_LESSONS)
  it(`${id}: the drawn polyline turns only where the field turns`,()=>{
   const notes:string[]=[];const wAll=worstOf(),wInner=worstOf();
   for(const n of CHORD_NS){
    const p=params(),{coarse}=canvasThin(fieldCut(id,p,n),canvasBudget(id));
    const lines=fieldLines(coarse,LINES,canvasTrace(frameReach(p),canvasReach(coarse)));
    const charges=asCharges(coarse);const nAll=worstOf();
    for(const line of lines){
     const v=verts(line);
     for(let i=1;i<v.length-1;i++){
      const a=sub(v[i],v[i-1]),b=sub(v[i+1],v[i]);
      if(len(a)<1e-12||len(b)<1e-12)continue;
      const excess=angleDeg(a,b)-angleDeg(pointsField(charges,mid(v[i-1],v[i])),pointsField(charges,mid(v[i],v[i+1])));
      const at=`N=${n} at (${v[i][0].toFixed(2)},${v[i][1].toFixed(2)}), ${nearestElement(coarse,v[i]).toFixed(3)} m from an element`;
      nAll.see(excess,at);
      if(i>1&&i<v.length-2)wInner.see(excess,at);
     }
    }
    wAll.see(nAll.value,nAll.where);
    notes.push(`N=${n}: worst excess turn ${nAll.value.toFixed(1)}°`);
   }
   expect(wAll.value,`${id}: a drawn corner turns ${wAll.value.toFixed(1)}° more than the field does across it, ${wAll.where}; away from the first and last segment of each line the worst is ${wInner.value.toFixed(2)}° (${wInner.where}). ${notes.join(' · ')}`).toBeLessThan(5);
  });
});

// ===========================================================================
// 2. The infinite line: straight rays, and radial arrows.
// ===========================================================================
// The one lesson whose field is known everywhere without integrating anything: Gauss gives
// E = 2kλ/ρ ρ̂, so every field line is a straight ray leaving the wire at a right angle and
// every arrow is radial. RK4 on a straight line has zero chord error, and the discreteness
// ripple a distance h from elements a apart is exp(−2πh/a): at h = 1.2a that is 5.6e−4 of
// |E|, i.e. 0.03°. So 0.5° is the bound, and the gate is 1.2 LOCAL gaps rather than a fixed
// distance — the tan partition's gap is 0.4 m near y = 0 and hundreds of metres at its ends,
// and asking for a wire's field where the drawn charge is three lumps asks the impossible.
const INFINITE_NS=[24,64,160,200];
describe.skipIf(!isReady('infinite' as ProblemId))('infinite line: straight radial rays and radial arrows',()=>{
 for(const q of [2,-2]){
  it(`2D lines are straight and perpendicular to the wire, λ = ${q} nC/m`,()=>{
   const notes:string[]=[];const w=worstOf();let tested=0;const wd=worstOf();
   for(const n of INFINITE_NS){
    const p=params({charge:q}),{coarse}=canvasThin(fieldCut('infinite',p,n),canvasBudget('infinite'));
    const lines=fieldLines(coarse,LINES,canvasTrace(frameReach(p),canvasReach(coarse)));
    let here=0;
    for(const line of lines){
     const v=verts(line);
     const span=Math.max(...v.map(u=>u[0]))-Math.min(...v.map(u=>u[0]));
     if(span>=1)wd.see(Math.max(...v.map(u=>Math.abs(u[1]-v[0][1])))/span,`N=${n}, a line spanning ${span.toFixed(1)} m in x`);
     for(let i=1;i<v.length-1;i++){
      const rho=Math.abs(v[i][0]);
      if(rho<.5||rho<1.2*localGap(coarse,v[i]))continue;
      tested++;here++;
      w.see(angleDeg(sub(v[i+1],v[i-1]),[Math.sign(v[i][0])*Math.sign(q),0,0]),`N=${n} at (${v[i][0].toFixed(2)},${v[i][1].toFixed(2)})`);
     }
    }
    notes.push(`N=${n}: ${lines.length} lines, ${here} vertices where the drawn charge reads as a wire`);
   }
   const log=notes.join(' · ');
   expect(tested,`not one drawn vertex stands 1.2 local element gaps out from the wire, at any N. ${log}`).toBeGreaterThan(0);
   expect(w.value,`worst chord-vs-ρ̂ angle ${w.value.toFixed(2)}°, ${w.where}. ${log}`).toBeLessThan(UNBOUNDED_BAR);
   // The same residual as the angle above, accumulated along a whole line rather than measured
   // across one chord: a line everywhere within UNBOUNDED_BAR of radial may still wander a
   // little end to end. Measured at the shipped budget: 0.51% of a 7.4 m span, under four
   // centimetres, against a bound of tan(3 degrees) = 5%.
   expect(wd.value,`worst drift along the wire ${(wd.value*100).toFixed(2)}% of the x-span, ${wd.where}. ${log}`).toBeLessThan(Math.tan(UNBOUNDED_BAR*Math.PI/180));
  });
  it(`drawn lines lie inside the picture the reader sees, λ = ${q} nC/m`,()=>{
   // Seeds go at equal steps of accumulated |dq|, and the tan partition keeps most of the
   // charge in its two outermost pieces, tens to hundreds of metres up and down the wire.
   // field3d.ts already caps this for a surface — `seedLimit`, and the comment beside it
   // says exactly why — but fieldlines.ts has no such cap, and the flat wire lessons get
   // none. The consequence is not a tolerance: it is a picture with no field in it.
   const p=params({charge:q}),half=frameReach(p),notes:string[]=[];let bad=0;
   for(const n of [3,8,12,24,64,200]){
    const {coarse}=canvasThin(fieldCut('infinite',p,n),canvasBudget('infinite'));
    const lines=fieldLines(coarse,LINES,canvasTrace(frameReach(p),canvasReach(coarse)));
    const inFrame=lines.filter(l=>l.filter(v=>Math.abs(v.x)<=half&&Math.abs(v.y)<=half).length>=3);
    const nearest=Math.min(...lines.map(l=>Math.min(...l.map(v=>Math.abs(v.y)))));
    if(inFrame.length<8)bad++;
    notes.push(`N=${n}: ${inFrame.length}/${lines.length} lines reach the ±${half.toFixed(1)} m frame, nearest approach |y| = ${nearest.toFixed(1)} m`);
   }
   expect(bad,`at ${bad} of 6 element counts fewer than half the drawn lines put 3 vertices inside the picture. ${notes.join(' · ')}`).toBe(0);
  });
  it(`2D arrows are radial and carry no component along the wire, λ = ${q} nC/m`,()=>{
   const notes:string[]=[];const w=worstOf();let tested=0;
   for(const n of INFINITE_NS){
    const p=params({charge:q}),{coarse,stride}=canvasThin(fieldCut('infinite',p,n),canvasBudget('infinite'));
    const half=frameReach(p),arrows=vectorGrid(coarse,{x0:-half,y0:-half,x1:half,y1:half},half/7);
    let here=0;
    for(const a of arrows){
     const at:V3=[a.at.x,a.at.y,0],rho=Math.abs(at[0]);
     if(rho<.5||rho<1.2*localGap(coarse,at))continue;
     tested++;here++;
     w.see(Math.abs(a.dir.y),`N=${n} at (${at[0].toFixed(2)},${at[1].toFixed(2)})`);
    }
    notes.push(`N=${n}: stride ${stride} keeps ${coarse.length}, ${here}/${arrows.length} arrows clear of the discretisation`);
   }
   const log=notes.join(' · ');
   expect(tested,`no 2D arrow anywhere stands 1.2 local gaps out from the wire. ${log}`).toBeGreaterThan(0);
   expect(w.value,`worst |dir·ŷ| = ${w.value.toExponential(2)}, i.e. ${(Math.asin(Math.min(1,w.value))*180/Math.PI).toFixed(2)}° off radial, ${w.where}. ${log}`).toBeLessThan(Math.sin(UNBOUNDED_BAR*Math.PI/180));
  });
  it(`3D arrows are radial and point away from the wire, λ = ${q} nC/m`,()=>{
   // A thinned tan partition is not a shorter wire: keeping every stride-th element drops
   // one of the two enormous outermost pieces whenever the stride does not divide the count,
   // and the survivor pulls every arrow in the picture toward its end of the wire.
   const notes:string[]=[];const w=worstOf();let inward=0,tested=0;
   for(const n of INFINITE_NS){
    const p=params({charge:q}),{few,stride}=stageThin(fieldCut('infinite',p,n),stageBudget('infinite',false));
    const reach=stageReach(p),arrows=spaceGrid(few,reach,reach/3,.14,undefined,'wire');
    let here=0;
    for(const a of arrows){
     const at:V3=[a.at.x,a.at.y,a.at.z],rho=Math.hypot(at[0],at[2]);
     if(rho<.5||rho<1.2*localGap(few,at))continue;
     tested++;here++;
     w.see(Math.abs(a.dir.y),`N=${n} at (${at[0].toFixed(1)},${at[1].toFixed(1)},${at[2].toFixed(1)}), ρ = ${rho.toFixed(1)} m`);
     if((a.dir.x*at[0]+a.dir.z*at[2])/rho*Math.sign(q)<=0)inward++;
    }
    const ends=few.map(c=>c.position.y).sort((x,y)=>x-y);
    notes.push(`N=${n}: stride ${stride} keeps ${few.length} spanning y ∈ [${ends[0].toFixed(0)}, ${ends[ends.length-1].toFixed(0)}] m, ${here}/${arrows.length} arrows clear`);
   }
   const log=notes.join(' · ');
   expect(tested,`no 3D arrow stands 1.2 local gaps out from the wire. ${log}`).toBeGreaterThan(0);
   expect(inward,`${inward} arrows point the wrong way round the wire. ${log}`).toBe(0);
   expect(w.value,`worst |dir·ŷ| = ${w.value.toExponential(2)}, i.e. ${(Math.asin(Math.min(1,w.value))*180/Math.PI).toFixed(2)}° off radial, ${w.where}. ${log}`).toBeLessThan(Math.sin(UNBOUNDED_BAR*Math.PI/180));
  });
 }
});

// ===========================================================================
// 3. Side views of the axisymmetric lessons: ring, arc, disk.
// ===========================================================================
// The side view is the only flat picture the ring, the disk and the sheet get, and it is
// drawn by the 3D module through an (x,z) → (x,y) lift. A swapped axis, a cloud on the wrong
// radius or a sign slip on z in spaceField would leave the on-axis field — the only thing any
// other test looks at — untouched, and tilt every off-axis chord.
//
// The references are azimuthal quadratures written here: a periodic trapezoid round the ring
// whose node count is set by the distance to the wire, a 4096-panel Simpson round the arc,
// and for the disk those rings swept in s by adaptive Simpson. The arc is drawn in its own
// plane by fieldLines rather than by meridianLines — ChargeDiagram only lifts to 'xz' for the
// three lessons with an axis — so it is checked the way it is actually drawn.
const pick=<T,>(xs:readonly T[],most:number):T[]=>{
 const k=Math.max(1,Math.ceil(xs.length/most));return xs.filter((_,i)=>i%k===0);};
const ringDistance=(R:number,P:V3)=>Math.hypot(Math.hypot(P[0],P[1])-R,P[2]);
describe('side views: meridian chords tangent to the axisymmetric field',()=>{
 for(const q of [2,-2]){
  it(`ring: every meridian chord is tangent to the azimuthal quadrature, Q = ${q} nC`,()=>{
   const notes:string[]=[];const w=worstOf();let against=0,tested=0,offPlane=0;
   for(const n of [24,64]){
    const p=params({charge:q}),R=p.size/2,{coarse}=canvasThin(fieldCut('ring',p,n),canvasBudget('ring'));
    // The picture's half-width drives the trace; the charge's span is only a floor under the
    // step. Passing the charge's span as both is what FieldCanvas used to do, and it is the
    // bug this file exists to catch -- measuring it here would measure the bug as the rule.
    const reach=frameReach(p),span=canvasReach(coarse),step=Math.min(reach,span)*.05;
    const lines=meridianLines(coarse,'wire',LINES,canvasTrace(reach,span));
    expect(lines.length,`ring N=${n}: no meridian lines drawn`).toBeGreaterThan(0);
    const here=worstOf();let hits=0;
    for(const line of lines){
     const v=line.map(v3);
     for(const u of v)if(Math.abs(u[1])>1e-9)offPlane++;
     for(let i=1;i<v.length-1;i++){
      if(nearestElement(coarse,v[i])<Math.max(4*step,2*localGap(coarse,v[i])))continue;
      const chord=sub(v[i+1],v[i-1]),e=ringField(R,q*NANO,v[i]);
      tested++;hits++;
      if(dot(chord,e)<=0)against++;
      here.see(angleDeg(chord,e),`(${v[i][0].toFixed(2)},${v[i][2].toFixed(2)}) in the x–z cut, ${ringDistance(R,v[i]).toFixed(2)} m from the wire`);
     }
    }
    w.see(here.value,`N=${n} ${here.where}`);
    notes.push(`N=${n}: ${lines.length} lines, ${hits} vertices clear, worst ${here.value.toFixed(3)}°`);
   }
   const log=notes.join(' · ');
   expect(offPlane,`${offPlane} meridian vertices left the y = 0 cut. ${log}`).toBe(0);
   expect(tested,`no meridian vertex stands clear of the discretisation. ${log}`).toBeGreaterThan(0);
   expect(against,`${against} meridian chords run against the field. ${log}`).toBe(0);
   expect(w.value,`worst meridian chord vs the ring quadrature ${w.value.toFixed(3)}°, ${w.where}. ${log}`).toBeLessThan(1);
  });
  it(`arc: every chord is tangent to a 4096-panel Simpson round the arc, Q = ${q} nC`,()=>{
   const notes:string[]=[];const w=worstOf();let against=0,tested=0;
   for(const n of [24,64]){
    const p=params({charge:q}),R=p.size/2,{coarse}=canvasThin(fieldCut('arc',p,n),canvasBudget('arc'));
    // The picture's half-width drives the trace; the charge's span is only a floor under the
    // step. Passing the charge's span as both is what FieldCanvas used to do, and it is the
    // bug this file exists to catch -- measuring it here would measure the bug as the rule.
    const reach=frameReach(p),span=canvasReach(coarse),step=Math.min(reach,span)*.05;
    const lines=fieldLines(coarse,LINES,canvasTrace(reach,span));
    const here=worstOf();let hits=0;
    for(const line of lines){
     const v=verts(line);
     for(let i=1;i<v.length-1;i++){
      if(nearestElement(coarse,v[i])<Math.max(4*step,2*localGap(coarse,v[i])))continue;
      const chord=sub(v[i+1],v[i-1]),e=arcField(R,q*NANO,p.phi,v[i]);
      tested++;hits++;
      if(dot(chord,e)<=0)against++;
      here.see(angleDeg(chord,e),`(${v[i][0].toFixed(2)},${v[i][1].toFixed(2)})`);
     }
    }
    w.see(here.value,`N=${n} ${here.where}`);
    notes.push(`N=${n}: ${lines.length} lines, ${hits} vertices clear, worst ${here.value.toFixed(3)}°`);
   }
   const log=notes.join(' · ');
   expect(tested,`no arc vertex stands clear of the discretisation. ${log}`).toBeGreaterThan(0);
   expect(against,`${against} arc chords run against the field. ${log}`).toBe(0);
   expect(w.value,`worst arc chord vs the Simpson quadrature ${w.value.toFixed(3)}°, ${w.where}. ${log}`).toBeLessThan(1);
  });
  it(`disk: meridian chords tangent to a nested adaptive quadrature at |z| ≥ 0.8 m, Q = ${q} nC`,()=>{
   // The 16-point cloud reads as an annulus at a height of a few tenths of the rim spacing
   // and not below it; 0.8 m is where the azimuthal ripple exp(−2πh/a) over a = 2πR/16 =
   // 0.79 m has fallen to 1.6e−3, i.e. a tenth of a degree. At most 40 vertices per element
   // count are checked: each disk reference is a nested adaptive quadrature, and forty
   // vertices spread along the lines cannot miss a systematic tilt.
   const notes:string[]=[];const w=worstOf();let against=0,tested=0;
   for(const n of [24,64]){
    const p=params({charge:q}),R=p.size/2,{coarse}=canvasThin(fieldCut('disk',p,n),canvasBudget('disk'));
    // The picture's half-width drives the trace; the charge's span is only a floor under the
    // step. Passing the charge's span as both is what FieldCanvas used to do, and it is the
    // bug this file exists to catch -- measuring it here would measure the bug as the rule.
    const reach=frameReach(p),span=canvasReach(coarse),step=Math.min(reach,span)*.05;
    const lines=meridianLines(coarse,'surface',LINES,canvasTrace(reach,span));
    expect(lines.length,`disk N=${n}: no meridian lines drawn`).toBeGreaterThan(0);
    const candidates:V3[][]=[];
    for(const line of lines){
     const v=line.map(v3);
     for(let i=1;i<v.length-1;i++)
      if(Math.abs(v[i][2])>=.8&&ringGap(coarse,v[i])>=4*step)candidates.push([v[i-1],v[i],v[i+1]]);
    }
    const here=worstOf();
    for(const [a,b,c] of pick(candidates,40)){
     const chord=sub(c,a),e=diskField(R,q*NANO,b);
     tested++;
     if(dot(chord,e)<=0)against++;
     here.see(angleDeg(chord,e),`(${b[0].toFixed(2)},${b[2].toFixed(2)}) in the x–z cut`);
    }
    w.see(here.value,`N=${n} ${here.where}`);
    notes.push(`N=${n}: ${lines.length} lines, ${candidates.length} vertices above 0.8 m, ${Math.min(40,candidates.length)} checked, worst ${here.value.toFixed(3)}°`);
   }
   const log=notes.join(' · ');
   expect(tested,`no disk meridian vertex reaches |z| = 0.8 m clear of the cloud. ${log}`).toBeGreaterThan(0);
   expect(against,`${against} disk meridian chords run against the field. ${log}`).toBe(0);
   expect(w.value,`worst disk meridian chord vs the nested quadrature ${w.value.toFixed(3)}°, ${w.where}. ${log}`).toBeLessThan(1);
  });
 }
 it('ring: every meridian line is rooted where the ring pierces the cut, at x = ±R',()=>{
  // A ring crosses the plane y = 0 at exactly two points. Every meridian line must therefore
  // end at one of them, to within the distance the tracer is allowed to stop short (its
  // arrive radius) plus the distance it was launched from (the seed offset) — both computed
  // here from the rules field3d.ts states. What it does instead is seed beside whichever
  // SAMPLE happens to lie nearest the cut, which at a coarse ring is nowhere near the cut.
  const notes:string[]=[];const w=worstOf();let bad=0;
  for(const n of [3,4,5,8,24]){
   const p=params(),R=p.size/2,{coarse}=canvasThin(fieldCut('ring',p,n),canvasBudget('ring'));
   const points=coarse;
   const gaps=points.slice(1,60).map((s,i)=>len(sub(v3(s.position),v3(points[i].position)))).sort((a,b)=>a-b);
   const arrive=Math.max(.05,.55*(gaps[Math.floor(gaps.length/2)]??0));
   const reach=Math.max(...coarse.map(s=>len(v3(s.position))),.5);
   const budget=Math.max(arrive*1.6,reach*.06)+arrive;
   const lines=meridianLines(coarse,'wire',LINES,canvasTrace(frameReach(p),canvasReach(coarse)));
   let worstHere=0;
   for(const line of lines){
    const v=line.map(v3);
    const root=v.reduce((a,b)=>Math.abs(b[2])<Math.abs(a[2])?b:a);
    const miss=Math.min(len(sub(root,[R,0,0])),len(sub(root,[-R,0,0])));
    worstHere=Math.max(worstHere,miss);
    if(miss>budget){bad++;w.see(miss-budget,`N=${n}, a root at (${root[0].toFixed(2)},${root[2].toFixed(2)}) missing (±${R}, 0) by ${miss.toFixed(2)} m against a budget of ${budget.toFixed(2)} m`);}
   }
   notes.push(`N=${n}: ${lines.length} lines, worst root miss ${worstHere.toFixed(2)} m, budget ${budget.toFixed(2)} m`);
  }
  expect(bad,`${bad} meridian roots miss both crossings of the cut; worst overshoot ${w.value.toFixed(2)} m — ${w.where}. ${notes.join(' · ')}`).toBe(0);
 });
 it('the potential lessons inherit the very same charge layout, so the side views carry over',()=>{
  // ChargeDiagram takes `id` from problem.geometry, so v-ring draws the ring and v-disk the
  // disk. Worth pinning: if a potential lesson ever got a partition of its own, everything
  // measured above would stop applying to it silently.
  const p=params();
  for(const [scalar,vector] of [['v-ring','ring'],['v-disk','disk'],['v-arc','arc'],
   ['v-rod-bisector','bisector'],['v-rod-axial','axial']] as [ProblemId,ProblemId][])
   for(const n of [5,24])
    expect(REGISTRY[scalar].sample(p,n).map(s=>[s.position,s.dq,s.coordinate]),
     `${scalar} no longer shares ${vector}'s partition`).toEqual(REGISTRY[vector].sample(p,n).map(s=>[s.position,s.dq,s.coordinate]));
 });
});

// ===========================================================================
// 7. cloud(): a 16-point ring is its annulus, exactly on the axis.
// ===========================================================================
// Sixteen equal charges dq/16 at radius s and azimuths 2π(k+½)/16 give, at (0,0,z), a z
// component k dq z/(s²+z²)^{3/2} — every one of them contributes the identical term, because
// every one is the same distance away — and transverse components proportional to
// Σcos(2π(k+½)/16) and Σsin(2π(k+½)/16), both exactly zero. So this is a theorem, not an
// approximation, and 1e−12 is what floating point costs. A 1e−3 tolerance here would pass a
// cloud whose points sat 0.05% off the annulus radius, or carried dq·(1−5e−4) — a perRing
// off-by-one rounded away.
describe('annuliField: every annulus is summed as the ring it is',()=>{
 // What the figure draws for a disk or a sheet. It used to sum sixteen dots a ring, and the checks
 // here measured how good an approximation that was: exact on the axis, within half a degree
 // above 0.8 m, and "no longer a surface" below it. The rings are summed exactly now, so the
 // question changed from how close to whether, and the answer is held to 1e-9 all the way down to
 // five centimetres off the face -- against this file's own dense quadrature of a ring, which
 // shares no formula with the elliptic integrals under test.
 for(const id of shipping(['disk','sheet'] as ProblemId[])){
  it(`${id}: on the axis it is the theorem, with nothing sideways`,()=>{
   for(const n of [5,24,64])for(const z of [.05,.5,1,3,-2]){
    const p=params(),samples=sampleDistribution(id,p,n);
    const want=samples.reduce((s,a)=>s+ke*a.dq*z/(a.coordinate*a.coordinate+z*z)**1.5,0);
    const got=annuliField(samples,{x:0,y:0,z});
    expect(Math.abs(got.z-want)/Math.abs(want),`${id} N=${n} z=${z}: axial field ${got.z} against the theorem's ${want}`).toBeLessThan(1e-12);
    expect(Math.hypot(got.x,got.y),`${id} N=${n} z=${z}: a transverse field on the axis`).toBe(0);
   }
  });
 }
 it('disk: off the axis it is its annuli at every height, down to the face',()=>{
  const w=worstOf(),wm=worstOf();
  for(const n of [5,24,64])for(const z of [.05,.1,.2,.4,.8,1.5,3,-2])for(const rho of [.4,1,1.9,3]){
   const p=params(),samples=sampleDistribution('disk',p,n);
   const got=v3(annuliField(samples,{x:rho,y:0,z}));
   let er=0,ez=0;
   for(const a of samples){const [r,zz]=ringUnit(Math.abs(a.coordinate),rho,z);er+=a.dq*r;ez+=a.dq*zz;}
   const want:V3=[er,0,ez];
   w.see(angleDeg(got,want),`N=${n} at (ρ, z) = (${rho}, ${z})`);
   wm.see(Math.abs(len(got)/len(want)-1),`N=${n} at (ρ, z) = (${rho}, ${z})`);
  }
  expect(w.value,`worst drawn-vs-quadrature angle ${w.value.toExponential(2)}°, ${w.where}`).toBeLessThan(1e-6);
  expect(wm.value,`worst drawn-vs-quadrature magnitude error ${wm.value.toExponential(2)}, ${wm.where}`).toBeLessThan(1e-9);
 });
 it('one annulus is the ring at every radius and every distance a reader can reach',()=>{
  // The formula that became the drawn field of every surface, swept rather than spot-checked.
  // Radii across what the sliders give (R = size/2 runs 0.5 to 4) and field points all round the
  // ring's cross-section, from two radii away down to a hundredth of one -- far closer than any
  // drawn line goes, since the tracer stops a clearance of at least 0.05 m off the body.
  //
  // Normalised by the size of the field a radius out from the SAME ring, never by the answer at
  // the point itself. At the centre of a ring the field is exactly zero, and dividing by it turns
  // one rounding error by another into "31% wrong" -- which is what my first probe reported, and
  // it was the metric, not the formula.
  let worst={v:0,at:''};
  for(const s of [.5,1,2,4]){
   const dq=2e-9,[sr,sz]=ringUnit(s,2*s,0),scale=Math.hypot(sr,sz)*dq;
   for(const frac of [2,1,.5,.2,.1,.05,.02,.01])for(const turn of [0,.2,.4,.6,.8,1,1.2,1.4,1.6,1.8]){
    const gap=frac*s,rho=s+gap*Math.cos(Math.PI*turn),z=gap*Math.sin(Math.PI*turn);
    if(rho<0)continue;
    const got=annuliField([{position:{x:s,y:0,z:0},dq,coordinate:s,field:{x:0,y:0,z:0},potential:0}],{x:rho,y:0,z});
    const [er,ez]=ringUnit(s,rho,z),want=Math.hypot(er,ez)*dq;
    if(want<1e-9*scale){
     // The centre, where the ring's field vanishes. Comparing there would divide the reference's
     // own last-bit rounding by the formula's, so the claim is the physical one instead.
     expect(Math.hypot(got.x,got.z),`R=${s}: a field where the ring has none`).toBeLessThan(1e-9*scale);
     continue;
    }
    const e=Math.hypot(got.x-er*dq,got.z-ez*dq)/want;
    if(e>worst.v)worst={v:e,at:`R=${s} at (ρ, z) = (${rho.toFixed(3)}, ${z.toFixed(3)}), a gap of ${frac} radii`};
   }
  }
  // Measured 2.8e-13 when this was written, at the closest gap swept. Its teeth, by mutation:
  // scaling the axial E(m) term, the radial K(m) term or beta's z-part by 1 + 1e-7 each fails
  // this, so the bar sits well below anything a wrong coefficient could survive.
  expect(worst.v,`worst ${worst.v.toExponential(2)} — ${worst.at}`).toBeLessThan(1e-11);
 });
 it('at the centre of a ring there is no field, and the formula says so exactly',()=>{
  // Not "small": the axial term carries a factor z, and the radial one is not reached at all when
  // rho is zero, so both come out as the zero double rather than as cancellation.
  const s=1.9,ring=[{position:{x:s,y:0,z:0},dq:2e-9,coordinate:s,field:{x:0,y:0,z:0},potential:0}];
  expect(annuliField(ring,{x:0,y:0,z:0})).toEqual({x:0,y:0,z:0});
 });
 it('a ring the point is sitting on is dropped, and nothing drawn can get that close',()=>{
  // annuliField skips a ring whose alpha² is under 1e-12 -- within a micrometre of the wire --
  // because K(m) diverges there and the arithmetic would be meaningless, not merely inaccurate.
  // Pinned so the guard is deliberate, together with the reason it is unreachable: a line stops
  // at `clearance`, which is at least ARRIVED = 0.05 m, fifty thousand times further out.
  const s=2,ring=[{position:{x:s,y:0,z:0},dq:2e-9,coordinate:s,field:{x:0,y:0,z:0},potential:0}];
  expect(annuliField(ring,{x:s,y:0,z:0})).toEqual({x:0,y:0,z:0});
  const justOutside=annuliField(ring,{x:s+.05,y:0,z:0});
  expect(Math.hypot(justOutside.x,justOutside.z),'and just outside it is very much not zero').toBeGreaterThan(1);
 });
 it('and it does not depend on which way round the ring you stand',()=>{
  // Axisymmetry, which sixteen dots only had sixteen-fold: the same (ρ, z) at any azimuth gives
  // the same radial and axial field, turned with the point.
  const samples=sampleDistribution('disk',params(),24),base=annuliField(samples,{x:1.3,y:0,z:.4});
  for(const a of [.1,1,2.5,4,6]){
   const e=annuliField(samples,{x:1.3*Math.cos(a),y:1.3*Math.sin(a),z:.4});
   expect(Math.hypot(e.x,e.y)/Math.hypot(base.x,base.y)-1,`radial size at azimuth ${a}`).toBeCloseTo(0,12);
   expect(e.z/base.z-1,`axial part at azimuth ${a}`).toBeCloseTo(0,12);
   expect(Math.atan2(e.y,e.x),`radial direction at azimuth ${a}`).toBeCloseTo(Math.atan2(Math.sin(a),Math.cos(a)),10);
  }
 });
});

// ===========================================================================
// 4. Field lines meet a charged surface perpendicularly.
// ===========================================================================
// Just above a uniformly charged surface and away from its rim the field is σ/2ε₀ n̂, and a
// field line therefore leaves the surface at a right angle. How near a right angle is not a
// number to remember: it is computed below from the disk quadrature over the very strip the
// drawn chords are taken from, and each chord is then allowed that plus 3° for its own chord
// error. A reader who sees lines curling sideways into individual dots on the face of a disk
// learns that a surface is a row of charges, which is the opposite of what the figure is for.
//
// The chords are compared as LINES, not as arrows: `min(θ, 180 − θ)`. Whether a line runs
// into the surface or out of it is the sign of the charge, and it is checked elsewhere —
// here the question is only whether the curve meets the face square.
const acute=(a:V3,b:V3)=>{const t=angleDeg(a,b);return Math.min(t,180-t);};
describe('lines arrive perpendicular to a charged surface',()=>{
 it('the references in this file agree with the closed forms they are meant to reproduce',()=>{
  // A quadrature nobody has checked is not a second opinion. Both of these have exact axial
  // forms — kQz/(R²+z²)^{3/2} for a ring, (σ/2ε₀)(1 − |z|/√(z²+R²)) for a disk — and the
  // disk must also fall off as kQ/z² far away, which is the hardest part for a nested
  // adaptive rule to get right.
  const R=2,Q=2*NANO,sigma=Q/(Math.PI*R*R);
  for(const z of [.05,.3,1,3,-2]){
   const [er,ez]=ringUnit(R,0,z);
   // Relative to E_z, because Σcos(2πi/m) is zero as mathematics and a few 1e−14 as
   // arithmetic, and that residue gets multiplied by k before anyone sees it.
   expect(Math.abs(er/ez),`ring E_ρ/E_z on the axis at z = ${z}`).toBeLessThan(1e-13);
   expect(ez/(ke*z/(R*R+z*z)**1.5)-1,`ring axial quadrature at z = ${z}`).toBeCloseTo(0,12);
   const d=diskField(R,Q,[0,0,z]);
   const want=Math.sign(z)*sigma/(2*EPS_0)*(1-Math.abs(z)/Math.hypot(z,R));
   expect(d[2]/want-1,`disk axial quadrature at z = ${z}: ${d[2]} against ${want}`).toBeCloseTo(0,8);
   expect(Math.hypot(d[0],d[1])/Math.abs(d[2]),`disk transverse field on the axis at z = ${z}`).toBeLessThan(1e-9);
  }
  // Far away a disk is a point charge with a quadrupole correction, and the correction is
  // part of the check: expanding (σ/2ε₀)(1 − z/√(z²+R²)) in u = R²/z² gives u/2 − 3u²/8 + …,
  // i.e. kQ/z²·(1 − ¾R²/z² + …). Asserting the bare kQ/z² instead would have mistaken that
  // −1.9e−5 for a quadrature error, which is exactly what it looked like the first time.
  const far=diskField(R,Q,[0,0,400]);
  expect(far[2]/(ke*Q/160000*(1-.75*R*R/160000))-1,'disk far field against kQ/z² and its quadrupole correction').toBeCloseTo(0,8);
  // And the arc closes into the ring when it is swept all the way round.
  const whole=arcField(R,Q,2*Math.PI,[1.1,0,.9]),asRing=ringField(R,Q,[1.1,0,.9]);
  expect(angleDeg(whole,asRing),'a full arc is a ring').toBeLessThan(1e-6);
 });
 /** The tilt of the exact field from the normal, over the strip the chords are judged in. */
 const exactTilt=(id:ProblemId,p:Params,P:V3)=>
  id==='sheet'?0:acute(diskField(p.size/2,p.charge*NANO,P),[0,0,1]);
 it('the exact field over that strip is near-normal, and the bound is a rim effect',()=>{
  const p=params(),R=p.size/2,w=worstOf();const profile:string[]=[];
  for(const x of [.05*R,.2*R,.4*R,.6*R]){
   const col=worstOf();
   for(const z of [.05,.1,.2,.3])col.see(exactTilt('disk',p,[x,0,z]),`z = ${z}`);
   profile.push(`ρ = ${x.toFixed(2)} m: up to ${col.value.toFixed(1)}°`);
   w.see(col.value,`ρ = ${x.toFixed(2)} m, ${col.where}`);
  }
  // Nothing is asserted about 12° or 15°: the number the drawn chords are held to is this
  // measurement, taken at each chord's own midpoint. The assertion is only that the rim
  // effect behaves like a rim effect — it grows as the rim is approached and stays acute.
  expect(w.value,`the exact disk field tilts ${w.value.toFixed(1)}° from the normal at worst (${w.where}) — ${profile.join(' · ')}`).toBeLessThan(45);
  expect(exactTilt('disk',p,[.05*R,0,.3]),'near the axis the exact field must be near-normal').toBeLessThan(2);
 });
 for(const id of shipping(['disk','sheet'] as ProblemId[]))for(const q of [2,-2])
  // Sixty seconds, because this is heavy on purpose: up to thirty chords per view, each held to a
  // numerically integrated exact disk field. It took 1.4 s locally while the lines stopped short of
  // the face and the strip was thin. Once they reached it the strip filled, and it takes 2.4 s here
  // and 15.7 s on the CI runner, over the default ten. The app's own field build got FASTER in the
  // same change (disk 23.8 -> 7.9 ms, sheet 46 -> 11 ms); it is the checking that grew, because
  // there is now more to check.
  it(`${id}: every chord within 0.3 m of the face is tangent to the exact field, charge ${q}`,()=>{
   // Three degrees: the chord of a curve of radius ρ_c misses the tangent by (h/ρ_c)²/6, and
   // at the step these lessons use, 0.05·reach ≈ 0.1 m, against the metre-scale curvature of
   // a disk's field that is well under a degree. What is left over is the drawn
   // discretisation — which is the point: if the drawn annuli cannot support a line there,
   // the line should not be drawn there.
   const notes:string[]=[];const w=worstOf(),wn=worstOf();let tested=0;
   for(const n of [24,64]){
    const p=params({charge:q}),R=id==='disk'?p.size/2:5;
    const {coarse}=canvasThin(fieldCut(id,p,n),canvasBudget(id));
    const {few}=stageThin(fieldCut(id,p,n),stageBudget(id,true));
    const flatLines=meridianLines(coarse,'surface',LINES,canvasTrace(frameReach(p),canvasReach(coarse)));
    const spatial=spaceLines(few,'surface',LINES,stageTrace(stageReach(p),chargeSpan(few)));
    for(const [lines,tag] of [[flatLines,'2D side view'],[spatial,'3D']] as [Vec[][],string][]){
     const strip:[V3,V3][]=[];
     for(const line of lines){
      const v=line.map(v3);
      for(let i=0;i<v.length-1;i++){
       const m=mid(v[i],v[i+1]),rho=Math.hypot(m[0],m[1]),az=Math.abs(m[2]);
       if(rho<=.6*R&&az>=.05&&az<=.3)strip.push([sub(v[i+1],v[i]),m]);
      }
     }
     for(const [chord,m] of pick(strip,30)){
      tested++;
      const tilt=exactTilt(id,p,m);
      const exact:V3=id==='sheet'?[0,0,1]:diskField(p.size/2,p.charge*NANO,m);
      const off=acute(chord,exact);
      w.see(off-tilt-3,`N=${n} ${tag}, a chord at (ρ, z) = (${Math.hypot(m[0],m[1]).toFixed(2)}, ${m[2].toFixed(3)}) lying ${off.toFixed(1)}° off the exact field, which itself tilts ${tilt.toFixed(1)}° from the normal`);
      wn.see(acute(chord,[0,0,1]),`N=${n} ${tag} at (ρ, z) = (${Math.hypot(m[0],m[1]).toFixed(2)}, ${m[2].toFixed(3)})`);
     }
     notes.push(`N=${n} ${tag}: ${lines.length} lines, ${strip.length} chords in the strip, ${Math.min(30,strip.length)} checked`);
    }
   }
   const log=notes.join(' · ');
   expect(tested,`${id} q=${q}: no drawn chord comes within 0.3 m of the face inside 0.6R. ${log}`).toBeGreaterThan(0);
   expect(w.value,`${id} q=${q}: a chord misses the exact field by ${(w.value+3).toFixed(1)}° more than the field's own tilt — ${w.where}; worst angle from the bare normal anywhere in the strip ${wn.value.toFixed(1)}° (${wn.where}). ${log}`).toBeLessThan(0);
  },60000);
 it('no line is launched closer to the charge than one step of the tracer',()=>{
  // A streamline tracer stops when it comes within `arrive` of an element, and it makes that
  // test AFTER taking a step. So the seed offset has to be at least one step, or the very
  // first step is taken blind: it can cross the surface, come out the other side into a field
  // that has reversed, and thrash there. Both numbers are computed here from the rules the
  // two modules state — offset = max(1.6·arrive, 0.06·reach), step = 0.05·reach flat and
  // 0.04·reach in space, where the two `reach`es are not the same quantity: the flat one is
  // how far the samples go, the spatial one is the size of the frame.
  const notes:string[]=[];const w=worstOf();
  for(const id of shipping(['disk','sheet'] as ProblemId[]))for(const n of [24,64]){
   const p=params(),samples=sampleDistribution(id,p,n);
   const {coarse}=canvasThin(samples),{few}=stageThin(samples,24);
   // Both steps are the smaller of the picture and the charge, exactly as FieldCanvas and
   // FieldStage compute them. Scaling by the picture alone is far too coarse for a small charge
   // in a big frame, which is what made this check fail on the disk.
   for(const [kept,step,tag] of [[coarse,Math.min(frameReach(p),canvasReach(coarse))*.05,'2D side view'],
    [few,Math.min(stageReach(p),chargeSpan(few))*.04,'3D']] as [ChargeSample[],number,string][]){
    // Mirrors `stopping` and `spaceLines` in src/diagrams/field3d.ts as they stand: the arrive
    // radius is the smallest element spacing with a floor of nine tenths of a step, and the seed
    // offset is the larger of 1.6 of that and six percent of the PICTURE -- the seed limit, not
    // the charge's extent. This mirror used to spread the annuli into dots and scale by the
    // charge, which is how the code read two rewrites ago.
    const arrive=Math.min(...localRadii(kept,Math.max(.05,step*.9)));
    const span=(tag==='3D'?stageReach(p):frameReach(p))*.95;
    const offset=Math.max(arrive*1.6,span*.06);
    w.see(step/offset,`${id} N=${n} ${tag}: launched ${offset.toFixed(3)} m out and stepping ${step.toFixed(3)} m`);
    if(id==='disk'){
     const lines=tag==='3D'?spaceLines(kept,'surface',LINES,stageTrace(stageReach(p),chargeSpan(few)))
      :meridianLines(kept,'surface',LINES,canvasTrace(frameReach(p),canvasReach(kept)));
     const roots=lines.map(l=>Math.min(...l.map(v=>Math.abs(v.z)))).sort((a,b)=>a-b);
     notes.push(`${id} N=${n} ${tag}: offset ${offset.toFixed(3)} m, step ${step.toFixed(3)} m, roots |z| from ${roots[0].toFixed(3)} to ${roots[roots.length-1].toFixed(3)} m, median ${roots[Math.floor(roots.length/2)].toFixed(3)} m`);
    }else notes.push(`${id} N=${n} ${tag}: offset ${offset.toFixed(3)} m, step ${step.toFixed(3)} m`);
   }
  }
  expect(w.value,`a line is launched only ${(1/w.value).toFixed(2)} steps clear of the charge — ${w.where}. ${notes.join(' · ')}`).toBeLessThanOrEqual(1);
 });
});

// ===========================================================================
// 5. The sheet: the one lesson whose whole point is that nothing varies.
// ===========================================================================
// σ/2ε₀ sign(z) ẑ, everywhere, forever — 56.47 N/C per nC/m². So every line is a straight
// vertical, every arrow is ±ẑ, every arrow is the same length, and every weight is 1 (the
// log scale gives full weight to everything when the spread is under 5%, which is the honest
// picture of a uniform field). 2° and 5% are the bounds: the un-thinned tan partition sums
// to (π/4n)/sin(π/4n)·σ/2ε₀ at P, 0.18% at n = 24, and the annulus ripple at |z| ≥ 1 m over
// bands under 0.5 m wide is exp(−2π·1/0.5) < 2e−6. The magnitudes are compared as a RATIO
// inside the picture, because thinning the annuli scales the whole field by about 1/stride
// and the drawn weights are normalised against the picture anyway.
const EXACT_SHEET=(sigma:number)=>Math.abs(sigma)*NANO/(2*EPS_0);
describe.skipIf(!isReady('sheet' as ProblemId))('sheet: straight normal lines, vertical arrows, and one weight for all of them',()=>{
 it('the reference is arithmetic, not an integral',()=>{
  expect(EXACT_SHEET(1)).toBeCloseTo(56.47,2);
  expect(sheetField(2*NANO,[3,-4,2])).toEqual([0,0,EXACT_SHEET(2)]);
  expect(sheetField(2*NANO,[3,-4,-2])[2]).toBe(-EXACT_SHEET(2));
 });
 for(const q of [2,-2]){
  it(`every drawn sheet line is a straight vertical, σ = ${q} nC/m²`,()=>{
   const notes:string[]=[];const w=worstOf();let frames=0,checked=0;
   for(const n of [24,64,200]){
    const p=params({charge:q}),{coarse}=canvasThin(fieldCut('sheet',p,n),canvasBudget('sheet'));
    const {few}=stageThin(fieldCut('sheet',p,n),stageBudget('sheet',true));
    const flatLines=meridianLines(coarse,'surface',LINES,canvasTrace(frameReach(p),canvasReach(coarse)));
    const spatial=spaceLines(few,'surface',LINES,stageTrace(stageReach(p),chargeSpan(few)));
    for(const [lines,half,tag] of [[flatLines,frameReach(p),'2D side view'],[spatial,stageReach(p),'3D']] as [Vec[][],number,string][]){
     const inFrame=lines.filter(l=>l.filter(v=>Math.hypot(v.x,v.y)<=half&&Math.abs(v.z)<=half).length>=3);
     if(inFrame.length<8)frames++;
     for(const line of lines){
      const v=line.map(v3),zs=v.map(u=>u[2]);
      const span=Math.max(...zs)-Math.min(...zs);
      if(span<1e-6)continue;
      checked++;
      const rho=v.map(u=>Math.hypot(u[0],u[1]));
      w.see(Math.max(...rho.map(r=>Math.abs(r-rho[0])))/span,`N=${n} ${tag}, a line spanning ${span.toFixed(2)} m in z`);
     }
     notes.push(`N=${n} ${tag}: ${inFrame.length}/${lines.length} lines put 3 vertices inside the ±${half.toFixed(1)} m frame`);
    }
   }
   const log=notes.join(' · ');
   expect(checked,`no sheet line has any extent in z at all. ${log}`).toBeGreaterThan(0);
   expect(frames,`at ${frames} of 6 (element count × view) the sheet lesson draws fewer than 8 visible lines. ${log}`).toBe(0);
   expect(w.value,`worst sideways wander ${(w.value*100).toFixed(1)}% of the line's own z-span, ${w.where}. ${log}`).toBeLessThan(.02);
  });
  it(`every sheet arrow is vertical, the same length and at full weight, σ = ${q} nC/m²`,()=>{
   const notes:string[]=[];const wDir=worstOf(),wRatio=worstOf(),wWeight=worstOf();let tested=0;
   for(const n of [24,64,200]){
    const p=params({charge:q});
    const {coarse}=canvasThin(fieldCut('sheet',p,n),canvasBudget('sheet'));
    const {few}=stageThin(fieldCut('sheet',p,n),stageBudget('sheet',true));
    const half=frameReach(p);
    const slice=spaceGrid(coarse,half,half/7,.12,'xz','surface');
    const volume=spaceGrid(few,stageReach(p),stageReach(p)/3,.14,undefined,'surface');
    for(const [arrows,kept,tag] of [[slice,coarse,'2D xz slice'],[volume,few,'3D volume']] as [typeof slice,ChargeSample[],string][]){
     const band=arrows.filter(a=>Math.abs(a.at.z)>=1&&Math.abs(a.at.z)<=5&&Math.hypot(a.at.x,a.at.y)<=5);
     if(!band.length){notes.push(`N=${n} ${tag}: no arrow in the band`);continue;}
     // Truncation of the KEPT annuli, computed independently: a uniformly charged disc of
     // radius R gives σ/2ε₀·(1 − z/√(z²+R²)) on its axis, so keeping rings only out to
     // R_kept costs at most that, and nothing else about the picture may vary more.
     // Two per cent on top of the truncation covers the partition itself: the un-thinned
     // tan rule is exact to (π/4n)/sin(π/4n), 0.18% at n = 24, and the annulus ripple at
     // |z| ≥ 1 m over bands under 0.5 m wide is exp(−2π·1/0.5) < 2e−6.
     const rKept=Math.max(...kept.map(s=>Math.abs(s.coordinate)));
     const truncation=5/Math.hypot(5,rKept),allow=truncation+.02;
     const reference=band.reduce((a,b)=>Math.hypot(b.at.x,b.at.y)<Math.hypot(a.at.x,a.at.y)&&Math.abs(b.at.z)<=Math.abs(a.at.z)?b:a);
     for(const a of band){
      tested++;
      wDir.see(angleDeg([a.dir.x,a.dir.y,a.dir.z],[0,0,Math.sign(a.at.z)*Math.sign(q)]),`N=${n} ${tag} at (${a.at.x.toFixed(1)},${a.at.y.toFixed(1)},${a.at.z.toFixed(1)})`);
      const spread=Math.abs(a.magnitude/reference.magnitude-1);
      wRatio.see(spread-allow,`N=${n} ${tag} at (${a.at.x.toFixed(1)},${a.at.y.toFixed(1)},${a.at.z.toFixed(1)}), |E| = ${a.magnitude.toExponential(3)} against ${reference.magnitude.toExponential(3)} on the reference arrow, a spread of ${(spread*100).toFixed(1)}% against ${(allow*100).toFixed(1)}% allowed`);
      wWeight.see(1-a.weight,`N=${n} ${tag} at (${a.at.x.toFixed(1)},${a.at.y.toFixed(1)},${a.at.z.toFixed(1)}), weight ${a.weight.toFixed(3)}`);
     }
     notes.push(`N=${n} ${tag}: ${band.length}/${arrows.length} arrows in the band, outermost kept ring ${rKept.toFixed(0)} m so ${(allow*100).toFixed(1)}% is allowed`);
    }
   }
   const log=notes.join(' · ');
   expect(tested,`no sheet arrow lands in 1 ≤ |z| ≤ 5 m, ρ ≤ 5 m. ${log}`).toBeGreaterThan(0);
   expect(wDir.value,`worst arrow ${wDir.value.toFixed(2)}° off the normal, ${wDir.where}. ${log}`).toBeLessThan(2);
   expect(wWeight.value,`an arrow is drawn at less than full weight in a field that does not vary: shortfall ${wWeight.value.toFixed(3)}, ${wWeight.where}. ${log}`).toBe(0);
   expect(wRatio.value,`the drawn |E| varies across the band by ${(wRatio.value*100).toFixed(1)} points more than the truncation of the kept rings allows — ${wRatio.where}. ${log}`).toBeLessThan(0);
  });
 }
});

// ===========================================================================
// 6. No arrow on the charge, and every other arrow is the textbook field.
// ===========================================================================
// An arrow lying on the rod and pointing along it is the one drawn vector that is
// unambiguously wrong physics: there is no field there to draw, and whatever the lattice
// happens to sum is the field of whichever element it landed nearest. vectorfield.ts drops
// such arrows — but it measures the distance to the nearest SAMPLE, and TOO_CLOSE is an
// absolute 0.12 m while the sample spacing is L/N. At a coarse partition the lattice slips
// between the samples and draws on the rod anyway.
//
// Everywhere else the arrow must be the rod's field. Lattice points are exact evaluation
// points — no chord, no integration — so the only error is the ripple, under 1e−3 of |E| at
// two local gaps out, i.e. 0.06°. The magnitudes are compared after rescaling the thinned
// set back to the whole charge, which is what the picture claims to be showing.
const ARROW_NS=[3,4,5,6,8,12,16,24,40,64,160,200];
const AXIS:Record<string,V3>={bisector:[0,1,0],endpoint:[0,1,0],ramp:[0,1,0],infinite:[0,1,0],axial:[1,0,0],semi:[1,0,0]};
describe('arrows: none on the charge, and the rest are the textbook field',()=>{
 for(const id of shipping(['bisector','axial','endpoint','ramp','infinite','semi'] as ProblemId[]))
  it(`${id}: no arrow is drawn on top of the charge`,()=>{
   const notes:string[]=[];let flat2=0,space3=0;const w=worstOf();
   for(const n of ARROW_NS){
    const p=params(),samples=sampleDistribution(id,p,n);
    const {coarse}=canvasThin(samples),{few}=stageThin(samples,48);
    const half=frameReach(p);
    const onRod=vectorGrid(coarse,{x0:-half,y0:-half,x1:half,y1:half},half/7)
     .filter(a=>LESSON[id].support([a.at.x,a.at.y,0],p)<.12);
    const onRod3=spaceGrid(few,stageReach(p),stageReach(p)/3,.14,undefined,'wire')
     .filter(a=>LESSON[id].support([a.at.x,a.at.y,a.at.z],p)<.14);
    flat2+=onRod.length;space3+=onRod3.length;
    for(const a of onRod)w.see(a.weight,`N=${n}, a 2D arrow at (${a.at.x.toFixed(2)},${a.at.y.toFixed(2)}) ${LESSON[id].support([a.at.x,a.at.y,0],p).toFixed(3)} m from the charge, weight ${a.weight.toFixed(2)}, pointing (${a.dir.x.toFixed(2)},${a.dir.y.toFixed(2)})`);
    if(onRod.length||onRod3.length)notes.push(`N=${n}: ${onRod.length} flat, ${onRod3.length} spatial, element spacing ${(p.size/n).toFixed(3)} m against a 0.12 m guard`);
   }
   expect(flat2+space3,`${id}: ${flat2} flat and ${space3} spatial arrows are drawn on the charge itself; the loudest is ${w.where}. ${notes.join(' · ')}`).toBe(0);
  });
 for(const id of shipping(['bisector','axial','endpoint','ramp','infinite','semi'] as ProblemId[]))
  it(`${id}: every arrow clear of the charge points along the textbook field`,()=>{
   const uniform=id!=='infinite'&&id!=='semi';
   const notes:string[]=[];const wDir=worstOf(),wMag=worstOf(),wPhi=worstOf();let tested=0,spatial=0;
   // Below 24 elements no claim of this kind is supportable and none is made: a midpoint
    // partition misses by (a/r)²/24 and a three-piece rod has a = L/3, so the lesson at that
    // setting honestly shows the field of three lumps. Three LOCAL gaps is the gate above
    // it — (1/3)²/24 = 0.26°, and the ripple exp(−6π) is nine orders below that.
    for(const n of ARROW_NS.filter(k=>k>=24)){
    const p=params(),samples=sampleDistribution(id,p,n);
    const {coarse}=canvasThin(samples),{few}=stageThin(samples,48);
    const half=frameReach(p);
    const whole=samples.reduce((s,a)=>s+a.dq,0);
    const flatScale=whole/coarse.reduce((s,a)=>s+a.dq,0);
    const spaceScale=whole/few.reduce((s,a)=>s+a.dq,0);
    const arrows=vectorGrid(coarse,{x0:-half,y0:-half,x1:half,y1:half},half/7);
    const arrows3=spaceGrid(few,stageReach(p),stageReach(p)/3,.14,undefined,'wire');
    let here=0;
    for(const a of arrows){
     const at:V3=[a.at.x,a.at.y,0],d=LESSON[id].support(at,p);
     if(d<Math.max(.5,3*localGap(coarse,at)))continue;
     tested++;here++;
     const want=LESSON[id].field(at,p);
     wDir.see(angleDeg([a.dir.x,a.dir.y,0],want),`N=${n}, a flat arrow at (${at[0].toFixed(2)},${at[1].toFixed(2)}), ${d.toFixed(2)} m out`);
     // Only for the finite rods: thinning a tan partition drops pieces carrying wildly
     // unequal charge, so the kept set of an infinite line is not that line scaled down.
     if(uniform)wMag.see(Math.abs(a.magnitude*flatScale/len(want)-1),`N=${n}, a flat arrow at (${at[0].toFixed(2)},${at[1].toFixed(2)}), |E|·${flatScale.toFixed(3)} = ${(a.magnitude*flatScale).toExponential(3)} against ${len(want).toExponential(3)}`);
    }
    for(const a of arrows3){
     const at:V3=[a.at.x,a.at.y,a.at.z],d=LESSON[id].support(at,p);
     if(d<Math.max(.5,3*localGap(few,at)))continue;
     tested++;spatial++;
     const dir:V3=[a.dir.x,a.dir.y,a.dir.z],want=LESSON[id].field(at,p);
     wDir.see(angleDeg(dir,want),`N=${n}, a spatial arrow at (${at[0].toFixed(1)},${at[1].toFixed(1)},${at[2].toFixed(1)}), ${d.toFixed(2)} m out`);
     if(uniform)wMag.see(Math.abs(a.magnitude*spaceScale/len(want)-1),`N=${n}, a spatial arrow at (${at[0].toFixed(1)},${at[1].toFixed(1)},${at[2].toFixed(1)}), |E|·${spaceScale.toFixed(3)} = ${(a.magnitude*spaceScale).toExponential(3)} against ${len(want).toExponential(3)}`);
     // Off the plane of the figure the field of a straight charge can have no azimuthal
     // part at all: φ̂ = axis × ρ̂, and E·φ̂ = 0 is a symmetry, not an approximation.
     const rho=sub(at,mul(AXIS[id],dot(at,AXIS[id])));
     if(len(rho)>.5&&Math.abs(dot(at,AXIS[id]))>1e-9){
      const phi=cross(AXIS[id],rho);
      wPhi.see(Math.abs(dot(dir,mul(phi,1/len(phi)))),`N=${n} at (${at[0].toFixed(1)},${at[1].toFixed(1)},${at[2].toFixed(1)})`);
     }
    }
    notes.push(`N=${n}: ${here}+${spatial} arrows clear`);
   }
   const log=`${notes.slice(0,4).join(' · ')} …`;
   expect(tested,`${id}: no arrow anywhere is clear of the discretisation. ${log}`).toBeGreaterThan(0);
   expect(wPhi.value,`${id}: an arrow off the plane has an azimuthal component about the charge's own axis, |dir·φ̂| = ${wPhi.value.toExponential(2)}, ${wPhi.where}. ${log}`).toBeLessThan(Math.sin(.5*Math.PI/180));
   expect(wDir.value,`${id}: worst arrow ${wDir.value.toFixed(3)}° off the textbook field, ${wDir.where}. ${log}`).toBeLessThan(barFor(id,1));
   if(uniform)expect(wMag.value,`${id}: worst arrow magnitude off by ${(wMag.value*100).toFixed(2)}%, ${wMag.where}. ${log}`).toBeLessThan(.02);
  });
});

// ===========================================================================
// 8. The potential falls along every drawn line, whatever the sign of the charge.
// ===========================================================================
// V is the only quantity that must fall monotonically along a correctly traced line no
// matter what the charge is, because dV = −E·dl and the line is drawn ALONG E either way.
// A tracer fed a rotated field draws equipotentials (dV ≈ 0 ± noise); a backward half joined
// without reversing it shows V rising and then falling; a negative-charge line traced
// against E rises the whole way; and a line that closed on itself would have to return to a
// value it has already left. The sign is a theorem and carries no tolerance at all.
//
// The point charges are rebuilt here from each lesson's setup text — the midpoints, the
// ramp's λ₀y/L, the ring's angles, the disk's annuli spread sixteen ways — and checked
// against the app's own partition first, so the partition is audited for free and V is then
// an independent function of position.
type Charge={dq:number;at:V3};
function setupCharges(id:ProblemId,p:Params):Charge[]{
 const L=p.size,R=p.size/2,Q=p.charge*NANO,n=p.slices;
 const out:Charge[]=[];
 for(let i=0;i<n;i++){
  const t=(i+.5)/n;
  if(id==='bisector')out.push({dq:Q/n,at:[0,-L/2+L*t,0]});
  else if(id==='axial')out.push({dq:Q/n,at:[L*t,0,0]});
  else if(id==='endpoint')out.push({dq:Q/n,at:[0,L*t,0]});
  // λ(y) = λ₀ y/L over a piece of width L/n, so dq = λ₀ y_i/n with λ₀ on the slider.
  else if(id==='ramp')out.push({dq:Q*(L*t)/L*(L/n),at:[0,L*t,0]});
  else if(id==='ring')out.push({dq:Q/n,at:[R*Math.cos(2*Math.PI*t),R*Math.sin(2*Math.PI*t),0]});
  else if(id==='arc')out.push({dq:Q/n,at:[R*Math.cos(p.phi*(t-.5)),R*Math.sin(p.phi*(t-.5)),0]});
  else if(id==='disk'){
   // Annulus i runs from iR/n to (i+1)R/n and carries Q((i+1)² − i²)/n² of the total, spread
   // round the circle at its midpoint radius. RING_POINTS of them, not sixteen: sixteen was
   // chosen to mirror the cloud the figure USED to sum, and a ring of sixteen dots is sixteen
   // point charges, 23° off normal a third of a metre above the face at 3 m out. The figure now
   // sums exact rings, and this reference has to be a ring too, or it measures the drawing
   // against a coarser thing than the drawing. The azimuthal trapezoid converges geometrically
   // with distance from the ring, so how many points make "a ring" depends on how close the
   // test looks. Measured against a ring of four times the points: 96 is a ring to 4e-3 at the
   // 0.15 m closest approach below, 192 to 4e-6, 384 to 2e-12. The check it feeds has a band of
   // ten percent, so 192 is the ring for every purpose here at half the cost of 384; the test
   // after the partition audit holds it to those numbers.
   const s=R*t,dq=Q*((i+1)**2-i**2)/(RING_POINTS*n*n);
   for(let k=0;k<RING_POINTS;k++){const a=2*Math.PI*(k+.5)/RING_POINTS;out.push({dq,at:[s*Math.cos(a),s*Math.sin(a),0]});}
  }
 }
 return out;
}
const RING_POINTS=192;
/** How far a point is from the nearest ring of a surface's partition, in the meridian plane. The
 * figure draws rings, so this is the distance to the drawn charge. */
const ringGap=(annuli:readonly ChargeSample[],m:V3)=>Math.min(...annuli.map(r=>Math.hypot(Math.hypot(m[0],m[1])-Math.abs(r.coordinate),m[2])));
const V_LESSONS=['bisector','axial','endpoint','ramp','arc','ring','disk'] as const;
describe('the potential falls along every drawn field line',()=>{
 it('the charges rebuilt from the setup text are the charges the app partitions',()=>{
  for(const id of V_LESSONS)for(const n of [24,64]){
   const p=params({slices:n}),mine=setupCharges(id,p),app=sampleDistribution(id,p,n);
   if(id==='disk'){
    // The disk is audited RING BY RING: each of the sampler's annuli must carry the charge the
    // setup text gives it, at the radius the setup text puts it, with the reference's points
    // summing to exactly that. This used to compare against cloud(), which spread each annulus
    // into sixteen dots -- but cloud() is no longer what the figure sums, so a test pinned to
    // it was guarding a path nobody draws.
    expect(mine.length).toBe(app.length*RING_POINTS);
    let worstQ=0,worstX=0;
    app.forEach((ring,i)=>{
     const pts=mine.slice(i*RING_POINTS,(i+1)*RING_POINTS);
     worstQ=Math.max(worstQ,Math.abs(pts.reduce((a,c)=>a+c.dq,0)-ring.dq)/Math.abs(ring.dq));
     for(const c of pts)worstX=Math.max(worstX,Math.abs(Math.hypot(c.at[0],c.at[1])-Math.abs(ring.coordinate)));
    });
    expect(worstQ,`disk N=${n}: an annulus's charge differs from the setup by ${worstQ.toExponential(2)} relative`).toBeLessThan(1e-12);
    expect(worstX,`disk N=${n}: a ring sits ${worstX.toExponential(2)} m from the radius the setup puts it at`).toBeLessThan(1e-12);
    continue;
   }
   expect(mine.length,`${id} N=${n}: ${mine.length} elements against the app's ${app.length}`).toBe(app.length);
   let worstQ=0,worstX=0;
   for(let i=0;i<mine.length;i++){
    worstQ=Math.max(worstQ,Math.abs(mine[i].dq-app[i].dq)/Math.abs(app[i].dq));
    worstX=Math.max(worstX,len(sub(mine[i].at,v3(app[i].position))));
   }
   expect(worstQ,`${id} N=${n}: a charge differs from the setup by ${worstQ.toExponential(2)} relative`).toBeLessThan(1e-12);
   expect(worstX,`${id} N=${n}: an element sits ${worstX.toExponential(2)} m from where the setup puts it`).toBeLessThan(1e-12);
  }
 });
 it('the reference ring is a ring to the measured tolerance at every distance the checks look',()=>{
  // The claim the disk reference rests on, held to numbers rather than to "double precision":
  // quadrupling the points must move the field by under 1e-5 at the 0.15 m closest approach the
  // V-drop loop allows, and by nothing a double can see a step further out. Measured 3.85e-6 and
  // 2.5e-12 when this was written; the bars sit a little above each.
  const p=params({slices:24}),Q=p.charge*NANO;
  const ringAt=(pts:number,s:number,dq:number,m:V3)=>pointsField(Array.from({length:pts},(_,k)=>{const a=2*Math.PI*(k+.5)/pts;return{dq:dq/pts,at:[s*Math.cos(a),s*Math.sin(a),0] as V3};}),m);
  const worstAt=(gap:number)=>{let worst=0;
   for(const s of [.5,1,1.9])for(const m of [[s+gap,0,0],[s,0,gap],[s+gap/Math.SQRT2,0,gap/Math.SQRT2]] as V3[]){
    const a=ringAt(RING_POINTS,s,Q/24,m),b=ringAt(4*RING_POINTS,s,Q/24,m);
    worst=Math.max(worst,len(sub(a,b))/len(b));}
   return worst;};
  expect(worstAt(.15),'at the closest chord the V-drop loop measures').toBeLessThan(1e-5);
  expect(worstAt(.4),'a step further out').toBeLessThan(1e-11);
 });
 for(const id of V_LESSONS)for(const q of [2,-2])
  it(`${id}, charge ${q}: V decreases at every step of every drawn line`,()=>{
   const notes:string[]=[];let rises=0,riseAt='';const wHigh=worstOf(),wLow=worstOf();let ratios=0;
   for(const n of [24,64]){
    const p=params({charge:q,slices:n}),samples=sampleDistribution(id,p,n);
    let charges=setupCharges(id,p),lines:V3[][],skip=0;
    if(id==='ring'){
     const {few,stride}=stageThin(samples,48);
     charges=charges.filter((_,i)=>i%stride===0);
     lines=spaceLines(few,'wire',LINES,stageTrace(stageReach(p),chargeSpan(few))).map(l=>l.map(v3));
     skip=3;
    }else if(id==='disk'){
     const {coarse,stride}=canvasThin(samples);
     charges=charges.filter((_,i)=>Math.floor(i/16)%stride===0);
     lines=meridianLines(coarse,'surface',LINES,canvasTrace(frameReach(p),canvasReach(coarse))).map(l=>l.map(v3));
     skip=3;
    }else{
     const {coarse,stride}=canvasThin(samples);
     charges=charges.filter((_,i)=>i%stride===0);
     lines=fieldLines(coarse,LINES,canvasTrace(frameReach(p),canvasReach(coarse))).map(verts);
     skip=3;
    }
    let steps=0;
    for(const line of lines){
     const V=line.map(u=>pointsPotential(charges,u));
     for(let i=0;i<line.length-1;i++){
      steps++;
      if(!(V[i+1]<V[i])){rises++;if(rises===1)riseAt=`N=${n} at (${line[i][0].toFixed(2)},${line[i][1].toFixed(2)},${line[i][2].toFixed(2)}): V went from ${V[i].toPrecision(8)} to ${V[i+1].toPrecision(8)} V`;}
      if(i<skip||i>line.length-2-skip)continue;
      const m=mid(line[i],line[i+1]),chord=len(sub(line[i+1],line[i]));
      // Within a step of a ring the field turns too sharply for a straight chord to carry
      // ΔV = E·dl; the distance is to the ring itself now, since that is what is drawn.
      if(id==='disk'&&ringGap(samples,m)<.15)continue;
      const ratio=-(V[i+1]-V[i])/(len(pointsField(charges,m))*chord);
      if(!Number.isFinite(ratio))continue;
      ratios++;
      const at=`N=${n} at (${m[0].toFixed(2)},${m[1].toFixed(2)},${m[2].toFixed(2)}), step ${chord.toFixed(3)} m`;
      wHigh.see(ratio,at);wLow.see(-ratio,at);
     }
    }
    notes.push(`N=${n}: ${lines.length} lines, ${steps} steps`);
   }
   const log=notes.join(' · ');
   expect(rises,`${id} q=${q}: V rises or stalls at ${rises} steps, first ${riseAt}. ${log}`).toBe(0);
   expect(ratios,`${id} q=${q}: no interior chord to measure −ΔV against |E||dl| on. ${log}`).toBeGreaterThan(0);
   // −ΔV = ∫E·dl along the arc, against |E(midpoint)|·|chord| here: the arc exceeds the
   // chord and |E| is convex along it, both by (h/r)², which the RK4 step h ≤ 0.05·reach
   // against r ≥ the arrive radius keeps under 5%.
   expect(wHigh.value,`${id} q=${q}: −ΔV/(|E||dl|) reaches ${wHigh.value.toFixed(4)}, ${wHigh.where}. ${log}`).toBeLessThan(1.03);
   expect(-wLow.value,`${id} q=${q}: −ΔV/(|E||dl|) falls to ${(-wLow.value).toFixed(4)}, ${wLow.where}. ${log}`).toBeGreaterThan(.9);
  });
});

/* Said out loud, so the suite never quietly covers less than it looks like it does. */
describe('what this file did not check',()=>{
 it('names every lesson skipped for not being shipped yet',()=>{
  const held=[...HELD_BACK].sort();
  if(held.length)console.log(`physics-drawn-field-truth: skipped ${held.length} lesson(s) held back in src/problems/readiness.ts — ${held.join(', ')}`);
  for(const id of held)expect(isReady(id as ProblemId),`${id} is shipping now, so its checks must run`).toBe(false);
 });
});

// ===========================================================================
// 9. The figure still draws something, at the corners of the sliders.
// ===========================================================================
// Every other check in this file runs at DEFAULT_PARAMS: distance 3, size 4. Only the charge
// and the piece count ever move. So a seed rule, a tracer reach or a stopping radius that is
// right for a 4 m object seen from 3 m -- and draws nothing, or draws off the page, for an 8 m
// object seen from half a metre -- ships without a word.
//
// That is not hypothetical. It is the exact shape of two faults this project has already had:
// the infinite and semi-infinite lines drew ZERO field lines because a local `reach` shadowed
// the prop and every seed landed hundreds of metres outside the frame, and the sheet's lines
// stopped in mid-air above its face. Both were invisible to a suite that only ever drew one
// geometry.
//
// This is deliberately not a tangency check -- those need an exact field at arbitrary points and
// already run thoroughly at the default. It asserts the two things that actually broke: lines get
// drawn, and they are drawn where the reader is looking.
//
// Its teeth, measured: feeding the tracer the charge's own extent instead of the picture's --
// which IS the shadowing fault, written out -- fails twelve of these, reporting "16 of 16 lines
// lie entirely outside the 8.0 m picture" for the infinite line, the semi-infinite line and the
// sheet. Those are the three that shipped that way.
const CORNERS: {at: string; over: Partial<Params>}[] = [
  {at: 'close to a long object', over: {distance: .5, size: 8}},
  {at: 'far from a small one', over: {distance: 6, size: 1}},
];
describe('the picture still has a field in it at the ends of every slider', () => {
  for (const id of shipping(['bisector','axial','endpoint','ramp','ring','arc','disk','infinite','semi','sheet'] as ProblemId[]))
    for (const corner of CORNERS) for (const q of [2, -2])
      it(`${id}: ${corner.at}, charge ${q}`, () => {
        const p = params({...corner.over, charge: q});
        const surface = id === 'disk' || id === 'sheet';
        const {coarse} = canvasThin(fieldCut(id, p, 24), canvasBudget(id));
        const flat = (surface || id === 'ring'
          ? meridianLines(coarse, 'surface', LINES, canvasTrace(frameReach(p), canvasReach(coarse)))
          : fieldLines(coarse, LINES, canvasTrace(frameReach(p), canvasReach(coarse))).map(l => l.map(u => ({x: u.x, y: 0, z: u.y})))
        ).map(l => l.map(v3));
        const {few} = stageThin(fieldCut(id, p, 24), stageBudget(id, surface));
        const spatial = spaceLines(few, surface ? 'surface' : 'wire', LINES, stageTrace(stageReach(p), chargeSpan(few))).map(l => l.map(v3));
        for (const [lines, view, reach] of [[flat, '2D', frameReach(p)], [spatial, '3D', stageReach(p)]] as [V3[][], string, number][]) {
          // Something is drawn, and it is a line rather than a dot.
          expect(lines.length, `${id} ${view} ${corner.at}: not one field line was traced`).toBeGreaterThanOrEqual(LINES / 2);
          const drawn = lines.filter(l => l.length >= 3);
          expect(drawn.length, `${id} ${view}: ${lines.length - drawn.length} of ${lines.length} lines are too short to be a line`).toBe(lines.length);
          // And it is drawn where the reader is looking. The frame is about `reach` across, so a
          // line whose vertices all sit outside it is being drawn for nobody.
          const seen = drawn.filter(l => l.some(u => Math.hypot(u[0], u[1], u[2]) <= reach * 1.05));
          expect(seen.length, `${id} ${view} ${corner.at}: ${drawn.length - seen.length} of ${drawn.length} lines lie entirely outside the ${reach.toFixed(1)} m picture`).toBe(drawn.length);
        }
      });
});
