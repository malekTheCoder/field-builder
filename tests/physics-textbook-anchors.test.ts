import {describe,it,expect} from 'vitest';
import {field,potential,magnitude} from '../src/symbolic/physics';
import {DEFAULT_PARAMS,type Params} from '../src/problems/types';
// ---------------------------------------------------------------------------
// Hard-coded textbook values and the two classical theorems.
//
// Every other physics test in this repo is, at bottom, a conversation between
// the app and one author's reading of the setup text: ground-truth and
// independent-integration both re-derive the integral from the same sentence
// the closed form was written from, and spec-formulas evaluates the printed
// string. That catches an algebra slip. It cannot catch a SHARED misreading —
// R = size versus R = size/2, λ₀ versus λ₀/L, sin φ versus sin(φ/2), a
// half-length L where the app means full length — because a wrong convention
// propagates identically into the reference integral and cancels.
//
// So nothing here is transcribed from src/. Every number below is either
//   (a) a value printed in a textbook (HRW, OpenStax University Physics 2,
//       Griffiths, Purcell) at a specific geometry, or
//   (b) the output of a theorem — the multipole expansion, the boundary
//       condition on E across a charged surface, the angle-bisector
//       construction for a straight line of charge — evaluated here by hand.
// k and ε₀ are RETYPED from CODATA rather than imported, so the app's own
// K = 1/(4πε₀) is checked against an external number for the first time.
//
// What this file would catch that the covered suite would not:
//   · an exponent slip in the ring (3/2 vs 1/2) — invisible at z = 0 and z → ∞,
//     4% wrong at z = R, which is the one point HRW prints;
//   · sin φ or φ/2 in place of sin(φ/2) in the arc — exact at φ = 2π, nearly
//     exact as φ → 0, and 0.83 kQ/R² versus 0.87 or 0.72 at HRW's 120°;
//   · a half-length/full-length transcription of the rod, which changes the
//     quadrupole coefficient from L²/8 to L²/2 while leaving every far-field
//     test at d = 10⁸ (correction ~10⁻¹⁶) perfectly happy;
//   · k and ε₀ drifting apart, since the disk here is computed from ε₀ alone;
//   · the asinh(L/2r) notation being implemented as asinh(L/2·r).
// ---------------------------------------------------------------------------

// CODATA 2018, typed from the NIST tables, NOT imported. ε₀ is the defining
// measured quantity; k is NIST's own listed Coulomb constant, so k and
// 1/(4πε₀) disagree here at 4.32e−12 relative — the floor under every "1e−9"
// tolerance below, and three decades under anything a wrong factor survives.
const k=8.9875517923e9;
const eps0=8.8541878128e-12;
const nC=1e-9;

const P=(extra:Partial<Params>):Params=>({...DEFAULT_PARAMS,...extra});
/** Relative comparison with the two numbers in the failure message. Every call
 * site names the textbook or theorem the `want` came from. */
function rel(got:number,want:number,tol:number,what:string){
 const error=Math.abs(got-want)/Math.max(Math.abs(want),Number.MIN_VALUE);
 expect(error,`${what}: app ${got}, reference ${want} (relative ${error.toExponential(3)})`).toBeLessThan(tol);
}
const TIGHT=1e-9;   // app-vs-textbook: dominated by the 4.3e−12 k/ε₀ mismatch.
const ALGEBRA=1e-12;// app-vs-app identities that are exact algebra, so only rounding.

describe('the two constants, read from outside the app',()=>{
 // Not a physics check on a lesson — a check that this file and the app are
 // talking about the same universe before any lesson is judged against it.
 it('the app’s K agrees with NIST’s Coulomb constant to 5e−12',()=>{
  // field('infinite') is 2Kλ/r; at λ = 1 nC/m, r = 2 m it reads out K directly.
  const readout=field('infinite',P({charge:1,distance:2})).x;
  rel(readout,2*k*nC/2,5e-12,'K recovered from the infinite line vs NIST k');
 });
});

// ===========================================================================
describe('ring at z = R',()=>{
 // HRW eq. 22-16 E_z = kQz/(z²+R²)^{3/2}; HRW eq. 24-32 V = kQ/√(z²+R²).
 // OpenStax UP2 Example 5.6, Griffiths Prob. 2.5. The slider is total Q in nC
 // and the geometry slider is the DIAMETER, so size = 2 means R = 1 m.
 const p=P({charge:1,size:2,distance:1}); // Q = 1 nC, R = 1 m, z = R.
 const Q=1*nC,R=1;
 it('E_z = kQ/(2√2 R²) = 3.1775794 N/C, transverse components exactly zero',()=>{
  const want=k*Q/(2*Math.SQRT2*R*R); // = kQz/(z²+R²)^{3/2} at z = R, by hand.
  const E=field('ring',p);
  rel(E.z,want,TIGHT,'ring E_z at z = R vs HRW 22-16');
  // Not "small": the closed form writes 0, and anything else means the ring's
  // axis is not the z-axis the lesson draws.
  expect(E.x).toBe(0);expect(E.y).toBe(0);
 });
 it('V = kQ/(√2 R) = 6.3551589 V',()=>{
  rel(potential('v-ring',p),k*Q/(Math.SQRT2*R),TIGHT,'ring V at z = R vs HRW 24-32');
  // The potential lesson is the field lesson's charge: same number, not close.
  expect(potential('v-ring',p)).toBe(potential('ring',p));
 });
 it('V(z) z/(z²+R²) = E_z(z) exactly, so V(R) = 2R E_z(R)',()=>{
  // Derivative-free: kQ/√(z²+R²) · z/(z²+R²) = kQz/(z²+R²)^{3/2}. Both sides
  // are the app's, so a 3/2 written as 1/2 in E breaks it at every z while the
  // far field (where both collapse to kQ/z^n) still looks fine.
  for(const z of [0.25,1,2,7]){
   const q=P({charge:1,size:2,distance:z}),E=field('ring',q).z,V=potential('v-ring',q);
   rel(E,V*z/(z*z+R*R),ALGEBRA,`ring E/V identity at z = ${z}`);
  }
  rel(potential('v-ring',p),2*R*field('ring',p).z,ALGEBRA,'V(R) = 2R E_z(R)');
 });
 it('E_z(R) is 3√3/(4√2) of the covered peak 2kQ/(3√3 R²)',()=>{
  // The peak sits at z = R/√2; the ratio is pure geometry, independent of k.
  const peak=2*k*Q/(3*Math.sqrt(3)*R*R);
  rel(field('ring',p).z/peak,3*Math.sqrt(3)/(4*Math.SQRT2),TIGHT,'E_z(R)/E_max');
 });
 it('E_z = 2kQ/(5√5 R²) at z = 2R',()=>{
  rel(field('ring',P({charge:1,size:2,distance:2})).z,2*k*Q/(5*Math.sqrt(5)*R*R),TIGHT,'ring E_z at z = 2R');
 });
});

// ===========================================================================
describe('disk at z = R, computed from ε₀ alone',()=>{
 // HRW eq. 22-26 E = (σ/2ε₀)(1 − z/√(z²+R²)); HRW eq. 24-37
 // V = (σ/2ε₀)(√(z²+R²) − z). OpenStax UP2 eq. 5.15, Griffiths Prob. 2.6.
 // Every covered disk anchor reaches the disk through k (kQ/d² far field,
 // 2kQ/R centre). Going through ε₀ instead cross-checks the two constants
 // THROUGH the lesson: if the app's K and EPS0 ever drift apart, the disk is
 // where it shows, because disk.ts uses both.
 const R=1,Q=1*nC,sigma=Q/(Math.PI*R*R),half=sigma/(2*eps0); // 17.975103585 N/C
 const p=P({charge:1,size:2,distance:1});
 it('σ/2ε₀ = 17.9751036 N/C from ε₀, and E_z = (σ/2ε₀)(1 − 1/√2)',()=>{
  rel(half,17.975103585,1e-9,'sanity: σ/2ε₀ as typed here');
  rel(field('disk',p).z,half*(1-1/Math.SQRT2),TIGHT,'disk E_z at z = R vs HRW 22-26');
 });
 it('V = (σ/2ε₀) R (√2 − 1) = 7.4455317 V',()=>{
  rel(potential('v-disk',p),half*R*(Math.SQRT2-1),TIGHT,'disk V at z = R vs HRW 24-37');
 });
 it('V(z) = √(z²+R²) E_z(z) exactly, ratio √2 at z = R',()=>{
  // (√(z²+R²) − z) = √(z²+R²)(1 − z/√(z²+R²)): the v-disk closed form and the
  // disk closed form are the same bracket times different prefactors. Ties the
  // two lessons at FINITE z, where the central-difference gradient test has
  // 1e−7 of slack and a small coefficient error hides.
  for(const z of [0.5,1,3,6]){
   const q=P({charge:1,size:2,distance:z});
   rel(potential('v-disk',q),Math.hypot(z,R)*field('disk',q).z,ALGEBRA,`disk V = h·E at z = ${z}`);
  }
  rel(potential('v-disk',p)/field('disk',p).z,Math.SQRT2,ALGEBRA,'V/E at z = R');
 });
 it('at z = R and equal Q: ring < disk < point charge',()=>{
  // Same Q spread further from the axis gives less axial field; the same Q at
  // the origin gives more. Ordering, not magnitude — an exponent slip in any
  // one of the three breaks it.
  const ring=field('ring',p).z,dsk=field('disk',p).z,point=k*Q/(R*R);
  expect(ring).toBeLessThan(dsk);
  expect(dsk).toBeLessThan(point);
  rel(ring,3.1775794093,TIGHT,'ring leg of the ordering');
  rel(dsk,5.2647859474,TIGHT,'disk leg of the ordering');
  rel(point,8.9875517923,TIGHT,'point-charge leg of the ordering');
 });
});

// ===========================================================================
describe('arc at 60°, 90° and 120°',()=>{
 // |E| at the centre of curvature = 2kλ sin(φ/2)/R (HRW Ch. 22; OpenStax UP2).
 // The covered arc checks are φ = 2π (E = 0), φ → 0 (point charge) and φ = π.
 // sin φ in place of sin(φ/2) agrees at φ = 2π (both give 0) and to first order
 // as φ → 0; φ/2 in place of sin(φ/2) agrees as φ → 0 too.
 //
 // Why all THREE angles and not just HRW's: sin 120° = sin 60° exactly, so the
 // 120° case — the only one a student can look up — is precisely BLIND to the
 // sin φ / sin(φ/2) confusion. 60° catches it by 73%, 90° by 41%. The lookup
 // value pins the constant; the other two pin the functional form.
 const R=1;
 const arcE=(chargeNC:number,phi:number)=>field('arc',P({charge:chargeNC,size:2*R,phi}));
 it('φ = 60° with λ = 1 nC/m: |E| = kλ/R = 8.9875518 N/C',()=>{
  const phi=Math.PI/3,lambda=1*nC;         // Q = λRφ, so charge slider = φ nC.
  const E=arcE(phi,phi);
  rel(magnitude(E),2*k*lambda*Math.sin(phi/2)/R,TIGHT,'arc 60° vs 2kλ sin(φ/2)/R');
  rel(magnitude(E),k*lambda/R,TIGHT,'arc 60° closed value (sin 30° = 1/2)');
 });
 it('φ = 90° quarter ring: √2 kλ/R, and 2√2 kQ/(πR²) at Q = 1 nC',()=>{
  const phi=Math.PI/2,lambda=1*nC;
  rel(magnitude(arcE(phi,phi)),Math.SQRT2*k*lambda/R,TIGHT,'quarter ring at λ = 1 nC/m');
  const Q=1*nC;
  rel(magnitude(arcE(1,phi)),2*Math.SQRT2*k*Q/(Math.PI*R*R),TIGHT,'quarter ring at Q = 1 nC');
 });
 it('φ = 120° at Q = 1 nC: 3√3 kQ/(2πR²) = 0.827 kQ/R², HRW’s printed 0.83',()=>{
  // HRW Ch. 22 sample problem "Electric field of a charged circular rod":
  // a 120° arc gives E = 0.83 Q/(4πε₀r²). This is the one arc number a student
  // can look up and check by hand.
  const Q=1*nC,want=3*Math.sqrt(3)*k*Q/(2*Math.PI*R*R);
  const E=arcE(1,2*Math.PI/3);
  rel(magnitude(E),want,TIGHT,'arc 120° vs HRW sample problem');
  rel(magnitude(E)/(k*Q/(R*R)),0.8269933431,TIGHT,'arc 120° as a multiple of kQ/R²');
  // HRW rounds to two digits; assert we land inside that printed figure.
  expect(Math.abs(magnitude(E)/(k*Q/(R*R))-0.83)).toBeLessThan(0.005);
 });
 it('the arc points along −x (away from the charge) with y and z exactly zero',()=>{
  for(const phi of [Math.PI/3,Math.PI/2,2*Math.PI/3]){
   const E=arcE(1,phi);
   expect(E.x,`arc φ = ${phi}`).toBeLessThan(0);
   expect(E.y).toBe(0);expect(E.z).toBe(0);
  }
 });
 it('V at the centre is kQ/R at every opening angle',()=>{
  // Every element is exactly R away, so V cannot depend on φ: the flat scalar
  // check that the vector formula's sin(φ/2) must NOT leak into.
  for(const phi of [Math.PI/3,Math.PI/2,2*Math.PI/3])
   rel(potential('v-arc',P({charge:1,size:2,phi})),k*nC/R,TIGHT,`arc V at φ = ${phi}`);
 });
});

// ===========================================================================
describe('Griffiths 2.3, the angle-bisector theorem, and the semi-infinite line',()=>{
 // Griffiths Example 2.3 (rod from y = 0 to L, P level with the foot at x = r):
 //   E_⊥ = kλL/(r√(r²+L²)),  E_∥ = −(kλ/r)(1 − r/√(r²+L²)).
 //
 // THE THEOREM (Purcell; one line). Put y = r tan θ. Then dq = λ r sec²θ dθ,
 // the distance is r sec θ, and
 //     dE = (kλ/r)(cos θ, −sin θ) dθ.
 // So E is (kλ/r) times the sum of UNIT vectors spread uniformly over the
 // subtended angle Θ = atan(L/r). Two consequences, both exact at every finite
 // (L, r), neither requiring an integral:
 //   (i)  E bisects the subtended angle: atan(|E_y|/E_x) = Θ/2.
 //   (ii) |E| = (2kλ/r) sin(Θ/2) — identical to a uniform ARC of radius r and
 //        opening angle Θ carrying the same λ. Straight line and curved arc are
 //        the same field. That makes two lessons check each other with no
 //        integrator and no transcription of either geometry.
 const lam=1; // nC/m throughout this block.
 const GRID:[number,number][]=[];
 for(const L of [1,2,4,8])for(const r of [0.5,1,3,6])GRID.push([L,r]);

 it('at L = r = 1 m, λ = 1 nC/m: E = (6.3551588, −2.6323930) N/C, 22.5° below +x',()=>{
  const E=field('endpoint',P({charge:1,size:1,distance:1}));
  rel(E.x,k*nC*1/(1*Math.sqrt(2)),TIGHT,'Griffiths 2.3 E_⊥');
  rel(E.y,-k*nC*(1/1-1/Math.SQRT2),TIGHT,'Griffiths 2.3 E_∥');
  expect(E.z).toBe(0);
  // Θ = atan(1) = 45°, so the bisector sits at exactly 22.5°.
  expect(Math.abs(Math.atan(-E.y/E.x)-Math.PI/8)).toBeLessThan(1e-12);
  rel(magnitude(E),2*k*nC*Math.sin(Math.PI/8)/1,TIGHT,'|E| = 2kλ sin(Θ/2)/r');
 });
 it('E bisects the subtended angle at every (L, r) on the grid',()=>{
  for(const [L,r] of GRID){
   const E=field('endpoint',P({charge:lam*L,size:L,distance:r}));
   const Theta=Math.atan(L/r);
   expect(Math.abs(Math.atan(-E.y/E.x)-Theta/2),`bisector direction at L = ${L}, r = ${r}`).toBeLessThan(1e-12);
  }
 });
 it('|E| = (2kλ/r) sin(Θ/2) at every (L, r) on the grid',()=>{
  for(const [L,r] of GRID){
   const E=field('endpoint',P({charge:lam*L,size:L,distance:r}));
   rel(magnitude(E),2*k*lam*nC*Math.sin(Math.atan(L/r)/2)/r,TIGHT,`endpoint |E| at L = ${L}, r = ${r}`);
  }
 });
 it('the straight rod and the arc subtending the same angle give the same |E|',()=>{
  for(const [L,r] of GRID){
   const Theta=Math.atan(L/r);
   const line=magnitude(field('endpoint',P({charge:lam*L,size:L,distance:r})));
   // Arc of radius r, opening angle Θ, same λ ⇒ Q = λ r Θ; the size slider is 2R.
   const curve=magnitude(field('arc',P({charge:lam*r*Theta,size:2*r,phi:Theta})));
   rel(line,curve,ALGEBRA,`rod/arc equivalence at L = ${L}, r = ${r}`);
  }
 });
 it('the bisector rod is the same theorem with Θ = 2 atan(L/2r)',()=>{
  // A centred rod is two endpoint rods of half-length back to back; the
  // transverse halves cancel and the magnitude is (2kλ/r) sin(atan(L/2r)).
  for(const [L,r] of GRID){
   const E=field('bisector',P({charge:lam*L,size:L,distance:r}));
   rel(magnitude(E),2*k*lam*nC*Math.sin(Math.atan(L/(2*r)))/r,TIGHT,`bisector |E| at L = ${L}, r = ${r}`);
   expect(E.y).toBe(0);expect(E.z).toBe(0);
  }
 });
 it('L → ∞ drives the endpoint rod to (kλ/r)(1, −1)',()=>{
  // Θ → 90°, so the unit vectors sweep a quarter turn and E leans 45°.
  const E=field('endpoint',P({charge:1e6,size:1e6,distance:1}));
  rel(E.x,k*nC/1,1e-5,'endpoint E_x as L → ∞');
  rel(E.y,-k*nC/1,1e-5,'endpoint E_y as L → ∞'); // deficit is r/L = 1e−6 here.
 });
 it('the semi-infinite line at the foot is exactly (−kλ/r, +kλ/r)',()=>{
  // Same quarter-turn sweep, taken as its own lesson: P = (0, r) with the line
  // along +x, so the app's signs are mirrored relative to the endpoint rod.
  const E=field('semi',P({charge:1,distance:1}));
  rel(E.x,-k*nC/1,TIGHT,'semi E_x');
  rel(E.y,k*nC/1,TIGHT,'semi E_y');
  expect(E.z).toBe(0);
  rel(magnitude(E),Math.SQRT2*k*nC/1,TIGHT,'semi |E| = √2 kλ/r');
 });
});

// ===========================================================================
describe('the far field approaches the point charge at the quadrupole rate',()=>{
 // Griffiths sec. 3.4.1 eq. 3.95. A uniform rod of charge Q and length L has
 // zero dipole moment about its centre and second moment ∫λy² dy = QL²/12, so
 //     V = kQ/r + kQ L² P₂(cos θ)/(12 r³) + O(r⁻⁵),
 // and E_r = −∂V/∂r = (kQ/r²)(1 + L² P₂/(4r²)).
 // On the axis P₂ = 1; on the equator P₂ = −1/2. Hence the four coefficients:
 //     bisector E   deficit  L²/8      (P₂ = −1/2 → −L²/8r²)
 //     axial    E   excess   L²/4      (P₂ = +1   → +L²/4d²)
 //     bisector V   deficit  L²/24
 //     axial    V   excess   L²/12
 // d is measured FROM THE CENTRE in all four, which is why the axial cases use
 // a = d − L/2 on the slider. The covered far-field tests sit at d = 1e8 where
 // the L² term is ~1e−16 and limits.test tolerates 5% out to t = 30, so a
 // half-length/full-length mix-up (Griffiths Ex. 2.2 works with half-length,
 // giving L²/2 where the app means L²/8) passes everything today.
 const Q=1*nC,L=1,lambda=Q/L;
 // 1e−4 against the limit constants: the first neglected term is 1.9e−5,
 // 2.5e−7, 1.1e−5 and 1.5e−5 relative at the radii chosen, so the bar sits an
 // order above the truncation and four orders below a wrong coefficient.
 const LIMIT=1e-4;
 // The exact closed forms below are compared to E and V DIRECTLY — never to a
 // difference of two near-equal doubles — so all five land on the 4.32e−12 k/ε₀
 // floor and need no tier of their own: they use TIGHT like every other
 // app-vs-textbook number in this file.

 it('bisector E: deficit × (r/L)² → 1/8',()=>{
  const r=100,E=field('bisector',P({charge:1,size:L,distance:r})).x,point=k*Q/(r*r);
  rel((point-E)/point*(r/L)**2,1/8,LIMIT,'bisector quadrupole coefficient');
  // The exact textbook field, with no expansion and no subtraction. Writing the
  // deficit as a DIFFERENCE of two numbers agreeing to five digits amplifies
  // this file's 4.3e−12 k/ε₀ mismatch by 1/deficit = 8e4, so the exact form is
  // asserted on E itself, where nothing cancels and 1e−8 is honest.
  rel(E,k*Q/(r*r)/Math.sqrt(1+L*L/(4*r*r)),TIGHT,'bisector exact closed form');
 });
 it('axial E: excess × (d/L)² → 1/4, with d from the rod’s CENTRE',()=>{
  const d=1000,a=d-L/2; // the slider is a, the gap beyond the far end.
  const E=field('axial',P({charge:1,size:L,distance:a})).x,point=k*Q/(d*d);
  // Error budget at d = 1000: truncating the expansion costs 2.5e−7 relative,
  // and the retyped k enters the subtraction amplified by 1/excess = 4e6, i.e.
  // 1.7e−5. The 1e−4 bar clears both, and still sits three decades under the
  // L²/2 that a half-length transcription of Griffiths Ex. 2.2 would produce.
  rel((E-point)/point*(d/L)**2,1/4,LIMIT,'axial quadrupole coefficient');
  rel(E,k*Q/(d*d-L*L/4),TIGHT,'axial exact closed form');  // no subtraction here either
 });
 it('the L²/8 coefficient survives with k eliminated entirely',()=>{
  // The sharpest form of the theorem. f(r) ≡ E_x(r)·r² = kQ(1 + L²/4r²)^{−1/2},
  // so f(r)/f(2r) contains no k, no ε₀ and no charge scale whatever: two app
  // values divided, against a reference built from the geometry alone. That
  // buys four decades — the shape is pinned at 1e−12 instead of 1e−4 — and a rod
  // that took L for its half-length misses this ratio by a factor of four.
  const r=100,f=(x:number)=>field('bisector',P({charge:1,size:L,distance:x})).x*x*x;
  const ratio=f(r)/f(2*r);
  rel(ratio,Math.sqrt((1+L*L/(16*r*r))/(1+L*L/(4*r*r))),ALGEBRA,'k-free far-field ratio');
  // The ratio's departure from 1 is 3L²/32r²: the same 1/8, read through two
  // radii instead of through an absolute point charge.
  rel((1-ratio)*(r/L)**2*32/3,1,1e-4,'quadrupole coefficient, k-free');
 });
 it('bisector V: deficit × r³/(kQL²) → 1/24',()=>{
  const r=100,V=potential('v-rod-bisector',P({charge:1,size:L,distance:r})),point=k*Q/r;
  rel((point-V)*r**3/(k*Q*L*L),1/24,LIMIT,'bisector V quadrupole coefficient');
  rel(V,2*k*lambda*Math.asinh(L/(2*r)),TIGHT,'bisector V exact (2kλ asinh(L/2r))');
 });
 it('axial V: excess × d³/(kQL²) → 1/12',()=>{
  const d=100,a=d-L/2;
  const V=potential('v-rod-axial',P({charge:1,size:L,distance:a})),point=k*Q/d;
  rel((V-point)*d**3/(k*Q*L*L),1/12,LIMIT,'axial V quadrupole coefficient');
  // Two equivalent textbook forms of the same antiderivative.
  rel(V,k*lambda*Math.log((d+L/2)/(d-L/2)),TIGHT,'axial V as kλ ln((d+L/2)/(d−L/2))');
  rel(V,2*k*lambda*Math.atanh(L/(2*d)),TIGHT,'axial V as 2kλ atanh(L/2d)');
 });
 it('the two field corrections are in the ratio P₂(90°)/P₂(0°) = −1/2',()=>{
  // The ONLY thing distinguishing equator from axis in the expansion is P₂, so
  // the ratio of the signed corrections is a pure Legendre number — it cannot
  // be affected by k, by ε₀, or by how the charge slider is scaled.
  const r=100,bisSigned=(field('bisector',P({charge:1,size:L,distance:r})).x-k*Q/(r*r))/(k*Q/(r*r))*(r/L)**2;
  const d=1000,axSigned=(field('axial',P({charge:1,size:L,distance:d-L/2})).x-k*Q/(d*d))/(k*Q/(d*d))*(d/L)**2;
  expect(bisSigned).toBeLessThan(0);
  expect(axSigned).toBeGreaterThan(0);
  rel(bisSigned/axSigned,-0.5,1e-3,'P₂ ratio of the two quadrupole corrections');
 });
});

// ===========================================================================
describe('the near field approaches the infinite line at rate 2r²/L²',()=>{
 // Griffiths Example 2.2, written in FULL length L:
 //     E_x = (2kλ/r)(1 + 4r²/L²)^{−1/2}
 // so N ≡ (1 − E_x r/(2kλ)) (L/r)² → 2. The RATE, not the limit, is the test:
 // a mistranscribed log form or a half-length L would still tend to 2kλ/r and
 // still pass limits.test's 5% sweep, but would approach it like r/L or with
 // coefficient 1/2 instead of 2.
 const lambda=1*nC,L=1000;
 const p=(r:number)=>P({charge:1000,size:L,distance:r}); // λ = Q/L = 1 nC/m.
 it('N → 2 at r = 1 and r = 10 with L = 1000 m',()=>{
  for(const [r,tol] of [[1,1e-5],[10,1e-3]] as const){
   const Ex=field('bisector',p(r)).x;
   const N=(1-Ex*r/(2*k*lambda))*(L/r)**2;
   rel(N,2,tol,`approach rate N at r = ${r}`); // truncation is 3e−6 and 3e−4.
   // And against the exact Griffiths expression, no expansion:
   rel(Ex,2*k*lambda/r/Math.sqrt(1+4*r*r/(L*L)),1e-8,`Griffiths 2.2 exact at r = ${r}`);
  }
 });
 it('the app’s own infinite-line lesson is the L → ∞ endpoint of that sequence',()=>{
  rel(field('infinite',P({charge:1,distance:1})).x,2*k*lambda/1,TIGHT,'infinite line 2kλ/r');
 });
 it('ΔV between r = 1 and r = 2 is 2kλ ln 2 with a −4.3e−6 finite-L residual',()=>{
  // OpenStax UP2 sec. 7.3 / Griffiths Prob. 2.22: V(r₁) − V(r₂) = 2kλ ln(r₂/r₁)
  // for an infinite line. The finite rod carries 2kλ asinh(L/2r) =
  // 2kλ[ln(L/r) + r²/L² + O(r⁴/L⁴)], so the residual is −2kλ(r₂² − r₁²)/L².
  // This is the first time the textbook ΔV is read through potential().
  const V=(r:number,len:number)=>potential('v-rod-bisector',P({charge:len,size:len,distance:r}));
  const dV=V(1,L)-V(2,L),book=2*k*lambda*Math.log(2);
  rel(dV,book,1e-5,'ΔV(1 → 2) vs 2kλ ln 2');
  const residual=dV-book;
  expect(residual).toBeLessThan(0); // the finite rod is always weaker.
  rel(residual/book,-3/(L*L*Math.log(2)),1e-3,'relative residual −3/(L² ln 2)');
  // Double L and the residual quarters: the signature of an r²/L² correction.
  // r/L would halve it; r⁴/L⁴ would cut it sixteenfold.
  const residual2=(V(1,2*L)-V(2,2*L))-book;
  rel(residual/residual2,4,0.1,'residual ratio when L doubles');
 });
});

// ===========================================================================
describe('rod potentials at points that disambiguate the asinh notation',()=>{
 // bisector.ts prints V = 2kλ asinh(L/2r). Read as asinh(L/(2r)) at L = 2, r = 1
 // that is asinh(1) = 0.88137; read as asinh((L/2)·r) it is the same here, so
 // the disambiguating point is one where L/2 ≠ 1 — hence the z = L and z = 3L
 // rows below, where the two readings give 1.76275 and 3.99102 in units of 2kλ
 // and no grader that merely parses the string can tell them apart.
 it('OpenStax log form matches the app wherever z is comparable to L',()=>{
  // OpenStax UP2 "Potential of a line of charge":
  //   V = kλ ln[(L/2 + √(L²/4 + z²)) / (−L/2 + √(L²/4 + z²))].
  // Evaluated here; not used below z ≈ L/2, where the numerator and denominator
  // of the ratio both approach L/2 ± L/2 and the form loses digits.
  const lambda=1*nC;
  for(const [L,z] of [[2,1],[2,2],[2,6],[4,2],[4,4],[1,3]] as const){
   const h=Math.sqrt(L*L/4+z*z);
   const want=k*lambda*Math.log((L/2+h)/(-L/2+h));
   rel(potential('v-rod-bisector',P({charge:lambda/nC*L,size:L,distance:z})),want,1e-11,
    `OpenStax log form at L = ${L}, z = ${z}`);
  }
 });
 it('at z = L/2 exactly: V = 2kλ ln(1+√2) = 15.8427815 V',()=>{
  // λ = 1 nC/m, L = 2 m, z = 1 m. asinh(L/2z) = asinh(1); the misparse
  // asinh((L/2)·z) = asinh(1) too, so this pins the VALUE while the grid above
  // pins the reading.
  const V=potential('v-rod-bisector',P({charge:2,size:2,distance:1}));
  rel(V,2*k*nC*Math.log(1+Math.SQRT2),TIGHT,'V at z = L/2 vs 2kλ ln(1+√2)');
  rel(V,15.8427815234,TIGHT,'V at z = L/2, printed value');
 });
 it('axial V is kλ ln 2 at a = L and kλ ln 3 at a = L/2',()=>{
  // V(a) = kλ ∫_a^{a+L} dx/x = kλ ln(1 + L/a). A swapped ratio, a/(a+L), would
  // give −kλ ln 2 here, which no magnitude-only test would notice.
  rel(potential('v-rod-axial',P({charge:1,size:1,distance:1})),k*nC*Math.log(2),TIGHT,'axial V at a = L');
  rel(potential('v-rod-axial',P({charge:1,size:1,distance:0.5})),k*nC*Math.log(3),TIGHT,'axial V at a = L/2');
  expect(potential('v-rod-axial',P({charge:1,size:1,distance:1}))).toBeGreaterThan(0);
 });
 it('at a = 100 L the axial V is 0.99503309 of kQ/a — measured from the END, not the centre',()=>{
  // ln(1 + L/a)/(L/a) = 1 − L/2a + ... : a FIRST-order deficit, because a is the
  // gap beyond the end and the charge centroid is L/2 further away. If the app
  // measured `distance` from the centre the ratio would be 1 + L²/12a², i.e.
  // 1.0000083 — above one, not below. Sign of the departure settles the
  // convention on its own.
  const Q=1*nC,a=100,L=1;
  const ratio=potential('v-rod-axial',P({charge:1,size:L,distance:a}))/(k*Q/a);
  rel(ratio,Math.log(1+L/a)/(L/a),TIGHT,'axial V/(kQ/a) at a = 100 L');
  rel(ratio,0.9950330853,TIGHT,'axial near-point-charge ratio, printed value');
  expect(ratio).toBeLessThan(1);
 });
});

// ===========================================================================
describe('the boundary condition across the disk: E jumps, V kinks',()=>{
 // Griffiths eqs. 2.31–2.36: across any surface charge σ, E_⊥ jumps by σ/ε₀
 // while V is continuous. The v-disk lesson's "center" prose currently says the
 // FIELD has a kink at z = 0 and offers "infinite, like the field's derivative
 // jump" as a distractor; the physics is the other way round, and these are the
 // numbers a corrected explanation should quote. Everything here is computed
 // from ε₀ with no k anywhere.
 const R=1,Q=1*nC,sigma=Q/(Math.PI*R*R),h=1e-6;
 const jumpFull=sigma/eps0,jumpHalf=sigma/(2*eps0);
 const at=(z:number)=>P({charge:1,size:2,distance:z});
 it('E_z jumps by σ/ε₀ = 35.9502 N/C across the plane',()=>{
  const jump=field('disk',at(h)).z-field('disk',at(-h)).z;
  // Exact at finite h: the jump is (σ/ε₀)(1 − h/√(h²+R²)).
  rel(jump,jumpFull*(1-h/Math.hypot(h,R)),1e-9,'disk E jump, h-corrected');
  // And within 2e−6 of the ideal σ/ε₀, the sheet's whole discontinuity.
  rel(jump,jumpFull,2e-6,'disk E jump vs σ/ε₀');
  rel(field('disk',at(h)).z,jumpHalf*(1-h/Math.hypot(h,R)),1e-9,'disk E just above');
  expect(field('disk',at(-h)).z).toBeCloseTo(-field('disk',at(h)).z,15);
 });
 it('V is CONTINUOUS across the plane — the same number on both sides',()=>{
  // Not "close": if the potential were discontinuous at a surface charge, the
  // field there would be a delta function, not a step.
  expect(potential('v-disk',at(h))).toBe(potential('v-disk',at(-h)));
  rel(potential('v-disk',at(h)),jumpHalf*(Math.hypot(h,R)-h),1e-9,'V just off the plane');
 });
 it('V(0) = σR/2ε₀ = 2kQ/R = 17.9751 V, the finite peak',()=>{
  rel(potential('v-disk',at(0)),jumpHalf*R,TIGHT,'V at the centre from ε₀');
  // Same number through k — the cross-check that k and ε₀ agree inside disk.ts.
  rel(potential('v-disk',at(0)),2*k*Q/R,TIGHT,'V at the centre from k');
 });
 it('V has a KINK there: the one-sided slope is σ/2ε₀, not zero and not infinite',()=>{
  // |dV/dz| → σ/2ε₀ as z → 0⁺, and by symmetry −σ/2ε₀ from below: a finite
  // corner, which is exactly what a jump in E means for V.
  const slope=(potential('v-disk',at(0))-potential('v-disk',at(h)))/h;
  rel(slope,jumpHalf*(1-h/(2*R)),1e-5,'one-sided slope of V at the disk');
  expect(Number.isFinite(slope)).toBe(true);
  // The slope from below is the mirror image, so the two one-sided derivatives
  // differ by σ/ε₀ — the corner, stated as a number.
  const below=(potential('v-disk',at(0))-potential('v-disk',at(-h)))/h;
  rel(slope+below,jumpFull*(1-h/(2*R)),1e-5,'the size of the kink in V');
 });
 it('the sheet at the same σ is ±σ/2ε₀ at every z, which is what the disk tends to',()=>{
  // The sheet slider IS σ in nC/m²; 1/π nC/m² is the disk's σ at Q = 1 nC, R = 1.
  const s=(z:number)=>field('sheet',P({charge:1/Math.PI,distance:z})).z;
  rel(s(3),jumpHalf,TIGHT,'sheet above');
  rel(s(-3),-jumpHalf,TIGHT,'sheet below');
  expect(s(3)-s(-3)).toBeCloseTo(jumpFull,9);
  // The disk just off its own surface has already reached 99.9999% of it.
  // 1 − h/√(h²+R²) is 1 − 1e−6 to within 5e−13, so "> 0.999999" would turn on
  // the last bit. State the shortfall instead: it is h/R, and nothing larger.
  expect(1-field('disk',at(h)).z/jumpHalf).toBeLessThan(2*h/R);
 });
});

// ===========================================================================
describe('the ramp from its two standard antiderivatives',()=>{
 // λ(y) = λ₀ y/L on [0, L], P = (r, 0) level with the empty foot.
 //   E_x = (kλ₀ r/L) ∫₀^L y dy/(r²+y²)^{3/2} = (kλ₀/L)(1 − r/√(r²+L²))
 //   E_y = −(kλ₀/L) ∫₀^L y² dy/(r²+y²)^{3/2}
 //       = −(kλ₀/L)[ln((L + √(r²+L²))/r) − L/√(r²+L²)]
 // from the antiderivatives −1/√(r²+y²) and ln(y + √(r²+y²)) − y/√(r²+y²)
 // (Gradshteyn 2.271; the second is the integral in Griffiths Ex. 2.2).
 // The ramp is the only lesson with a position-dependent density, so a λ₀ vs
 // λ₀/L normalisation slip or a y ↔ y² swap has nothing else to contradict it.
 const l0=1*nC;
 it('at λ₀ = 1 nC/m, L = r = 1: E = (2.6323930, −1.5662319) N/C',()=>{
  const E=field('ramp',P({charge:1,size:1,distance:1})),hyp=Math.SQRT2;
  rel(E.x,k*l0/1*(1-1/hyp),TIGHT,'ramp E_x from the first antiderivative');
  rel(E.y,-k*l0/1*(Math.log((1+hyp)/1)-1/hyp),TIGHT,'ramp E_y from the second antiderivative');
  expect(E.z).toBe(0);
  // E_x here is numerically the same as Griffiths 2.3's |E_∥| at L = r: both are
  // k λ (1 − r/√(r²+L²)) with λ = λ₀ = the uniform rod's λ. A coincidence of the
  // integrands worth stating, because it is the cross-check generalised below.
  rel(E.x,Math.abs(field('endpoint',P({charge:1,size:1,distance:1})).y),ALGEBRA,'ramp E_x = |Griffiths 2.3 E_∥| at L = r');
 });
 it('both components against the antiderivatives on a grid of (L, r)',()=>{
  for(const L of [1,2,4,8])for(const r of [0.5,1,3,6]){
   const hyp=Math.sqrt(r*r+L*L),E=field('ramp',P({charge:1,size:L,distance:r}));
   rel(E.x,k*l0/L*(1-r/hyp),TIGHT,`ramp E_x at L = ${L}, r = ${r}`);
   rel(E.y,-k*l0/L*(Math.log((L+hyp)/r)-L/hyp),TIGHT,`ramp E_y at L = ${L}, r = ${r}`);
  }
 });
 it('ramp E_x = (r/L) × |endpoint E_y| at every (L, r) — exact, no integrator',()=>{
  // The ramp's E_x integrand is k(λ₀y/L)·r/(r²+y²)^{3/2}; the uniform rod's
  // E_y integrand at λ = λ₀ is k λ₀ y/(r²+y²)^{3/2}. The first is r/L times the
  // second POINTWISE, so the identity holds before any integration is done —
  // which makes it a statement about the two lessons' geometry and normalisation
  // and nothing else. It fails instantly if the ramp reads λ₀ as a total charge.
  for(const L of [1,2,4,8])for(const r of [0.5,1,3,6]){
   const ramp=field('ramp',P({charge:1,size:L,distance:r})).x;
   const rod=Math.abs(field('endpoint',P({charge:1*L,size:L,distance:r})).y);
   rel(ramp,(r/L)*rod,ALGEBRA,`ramp/endpoint identity at L = ${L}, r = ${r}`);
  }
 });
 it('the transverse far field remembers the centre of charge at 2L/3',()=>{
  // The first moment of λ₀y/L on [0, L] is over its total λ₀L/2 at ȳ = 2L/3,
  // so E_y → −kQ ȳ/r³ with Q = λ₀L/2. A uniform rod would put ȳ at L/2; the
  // ratio 4/3 between them is the whole content of the ramp lesson.
  const L=1,r=3000,Qtot=l0*L/2;
  const Ey=field('ramp',P({charge:1,size:L,distance:r})).y;
  rel(Ey,-k*Qtot*(2*L/3)/r**3,1e-6,'ramp transverse far field vs first moment');
  const rodEy=field('endpoint',P({charge:1,size:L,distance:r})).y;
  rel(Ey/rodEy,(Qtot*(2*L/3))/(l0*L*(L/2)),1e-5,'ramp/uniform first-moment ratio');
 });
});
