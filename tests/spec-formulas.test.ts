import {describe,it,expect,afterAll} from 'vitest';
// ---------------------------------------------------------------------------
// Machine check of docs/curriculum-spec.md §7 — the sixteen closed forms the spec
// derived but never ran. Every reference number below is Coulomb's or Biot–Savart's
// law applied to POINT sources and summed with quadrature written here from the
// stated geometry. Nothing is derived from the closed form it checks; the only
// reused facts are constants. Run with SPEC_REPORT=1 to print the achieved errors.
// ---------------------------------------------------------------------------
type V3=[number,number,number];
const EPS0=8.8541878128e-12,ke=1/(4*Math.PI*EPS0),MU0=4*Math.PI*1e-7;
const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a:V3,c:number):V3=>[a[0]*c,a[1]*c,a[2]*c];
const norm=(a:V3)=>Math.hypot(a[0],a[1],a[2]);
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
/** Field at P of a point charge q at S. */
function coulomb(q:number,S:V3,P:V3):V3{const d=sub(P,S),r=norm(d);return scale(d,ke*q/(r*r*r));}
function potential(q:number,S:V3,P:V3){return ke*q/norm(sub(P,S));}
/** dB = (μ₀/4π) I dl × r̂ / r² for a current element I dl at S. */
function biot(I:number,dl:V3,S:V3,P:V3):V3{const d=sub(P,S),r=norm(d);return scale(cross(dl,d),MU0/(4*Math.PI)*I/(r*r*r));}
function simpson(g:(t:number)=>V3,a:number,b:number,m:number):V3{if(m%2)m++;const h=(b-a)/m;let s:V3=[0,0,0];for(let i=0;i<=m;i++)s=add(s,scale(g(a+i*h),i===0||i===m?1:i%2?4:2));return scale(s,h/3);}
function simpson1(g:(t:number)=>number,a:number,b:number,m:number):number{if(m%2)m++;const h=(b-a)/m;let s=0;for(let i=0;i<=m;i++)s+=(i===0||i===m?1:i%2?4:2)*g(a+i*h);return s*h/3;}
/** Midpoint rule: never touches the endpoints, for integrands singular there. */
function midpoint(g:(t:number)=>V3,a:number,b:number,m:number):V3{const h=(b-a)/m;let s:V3=[0,0,0];for(let i=0;i<m;i++)s=add(s,g(a+(i+.5)*h));return scale(s,h);}
/** [start, ∞) by geometrically doubling Simpson panels. */
function toInfinity(g:(t:number)=>V3,start:number,unit:number,octaves=60,m=64):V3{let s=simpson(g,start,start+unit,m),lo=start+unit,w=unit;for(let i=0;i<octaves;i++){s=add(s,simpson(g,lo,lo+w,m));lo+=w;w*=2;}return s;}
/** Point-source field integrated along an infinite line through S0 in direction ẑ, by z = ρ tan t. The
 * ρ here is the perpendicular distance from P to the line; the integrand stays finite at t = ±π/2. */
function alongLine(perLength:(S:V3,dz:number)=>V3,S0:V3,P:V3,m=256):V3{const rho=Math.hypot(P[0]-S0[0],P[1]-S0[1]);if(rho<1e-12)return[0,0,0];return simpson(t=>{const c=Math.cos(t);if(c<1e-9)return[0,0,0];return perLength([S0[0],S0[1],S0[2]+rho*Math.tan(t)],rho/(c*c));},-Math.PI/2,Math.PI/2,m);}
const rel=(got:number,want:number)=>Math.abs(got-want)/Math.abs(want);
const report:string[]=[];
const note=(what:string,error:number)=>{report.push(`${what.padEnd(64)} ${error.toExponential(1)}`);};
afterAll(()=>{if(process.env.SPEC_REPORT)console.log('\n'+report.join('\n')+'\n');});

describe('§7.1–7.2 · the cos θ ring: dipole far field and the sin θ rotation',()=>{
 const lam0=2.1,R=1.6,p=Math.PI*lam0*R*R;
 const ring=(density:(t:number)=>number,P:V3)=>simpson(t=>coulomb(density(t)*R,[R*Math.cos(t),R*Math.sin(t),0],P),0,2*Math.PI,4000);
 it('centre field −πkλ₀/R and zero net charge (spec-verified; re-run as a control)',()=>{
  const E=ring(t=>lam0*Math.cos(t),[0,0,0]);
  expect(rel(E[0],-Math.PI*ke*lam0/R)).toBeLessThan(1e-12);expect(Math.abs(E[1])/Math.abs(E[0])).toBeLessThan(1e-12);
  expect(Math.abs(simpson1(t=>lam0*Math.cos(t)*R,0,2*Math.PI,4000))/(lam0*R)).toBeLessThan(1e-14);
 });
 it('far field is a dipole of moment p = πλ₀R² x̂: 2kp/D³ on the axis, −kp/D³ across it',()=>{
  const D=300*R;
  const axial=ring(t=>lam0*Math.cos(t),[D,0,0]),transverse=ring(t=>lam0*Math.cos(t),[0,D,0]),above=ring(t=>lam0*Math.cos(t),[0,0,D]);
  const e1=rel(axial[0],2*ke*p/D**3),e2=rel(transverse[0],-ke*p/D**3),e3=rel(above[0],-ke*p/D**3);
  note('7.1 cosring dipole coefficient, on-axis 2kp/D³',e1);note('7.1 cosring dipole coefficient, transverse −kp/D³',e2);note('7.1 cosring dipole coefficient, along z −kp/D³',e3);
  for(const e of [e1,e2,e3])expect(e).toBeLessThan(3e-5);
  // The transverse fields have no component along their own direction (p ⊥ D there).
  expect(Math.abs(transverse[1])/Math.abs(transverse[0])).toBeLessThan(1e-9);expect(Math.abs(above[2])/Math.abs(above[0])).toBeLessThan(1e-9);
 });
 it('λ₀ sin θ rotates the answer: E_y = −πkλ₀/R, E_x = 0',()=>{
  const E=ring(t=>lam0*Math.sin(t),[0,0,0]);const e=rel(E[1],-Math.PI*ke*lam0/R);note('7.2 sin θ ring, E_y = −πkλ₀/R',e);
  expect(e).toBeLessThan(1e-12);expect(Math.abs(E[0])/Math.abs(E[1])).toBeLessThan(1e-12);
 });
});

describe('§7.3 · the parabolic rod λ(y) = λ₀(1 − 4y²/L²) on the bisector — closed form derived here',()=>{
 // Derivation (recorded in the spec): with A = L²/4 + r²,
 //   E_x = kλ₀ [ L/(r√A) − (4r/L²)( 2 ln((L/2+√A)/r) − L/√A ) ],  E_y = 0,  Q = 2λ₀L/3.
 const closed=(lam0:number,L:number,r:number)=>{const A=L*L/4+r*r,s=Math.sqrt(A);return ke*lam0*(L/(r*s)-4*r/(L*L)*(2*Math.log((L/2+s)/r)-L/s));};
 const direct=(lam0:number,L:number,r:number)=>simpson(y=>coulomb(lam0*(1-4*y*y/(L*L)),[0,y,0],[r,0,0]),-L/2,L/2,6000);
 it('matches direct integration at several distances, with E_y = 0',()=>{
  let worst=0;
  for(const [lam0,L,r] of [[1.7,2.7,1.3],[2.2,4,0.6],[0.9,1.5,5]]){const E=direct(lam0,L,r);const e=rel(E[0],closed(lam0,L,r));worst=Math.max(worst,e);
   expect(e).toBeLessThan(1e-11);expect(Math.abs(E[1])/Math.abs(E[0])).toBeLessThan(1e-12);}
  note('7.3 parabolic rod E_x closed form (derived here)',worst);
 });
 it('total charge is 2λ₀L/3 and the far field is kQ/r²',()=>{
  const lam0=1.7,L=2.7;expect(rel(simpson1(y=>lam0*(1-4*y*y/(L*L)),-L/2,L/2,2000),2*lam0*L/3)).toBeLessThan(1e-13);
  const r=400*L,e=rel(closed(lam0,L,r),ke*(2*lam0*L/3)/(r*r));note('7.3 parabolic rod far field kQ/r²',e);expect(e).toBeLessThan(2e-6);
 });
});

describe('§7.4 · annulus far field',()=>{
 const a=.7,b=2.4,sig=1.3;
 const annulus=(z:number)=>simpson(s=>simpson(t=>coulomb(sig*s,[s*Math.cos(t),s*Math.sin(t),0],[0,0,z]),0,2*Math.PI,64),a,b,400);
 it('z ≫ b recovers kQ/z² with Q = σπ(b² − a²)',()=>{
  const z=400*b,E=annulus(z),e=rel(E[2],ke*sig*Math.PI*(b*b-a*a)/(z*z));note('7.4 annulus far field kQ/z²',e);expect(e).toBeLessThan(1e-5);
 });
 it('control: the spec-verified closed form at z = 1.1',()=>{
  const z=1.1,E=annulus(z);expect(rel(E[2],2*Math.PI*ke*sig*z*(1/Math.hypot(z,a)-1/Math.hypot(z,b)))).toBeLessThan(1e-9);
 });
});

describe('§7.5 · ring with a gap, field at the centre',()=>{
 const R=1.6,lam=1.9;
 // Gap of angular width δ centred on +x; the charge occupies δ/2 ≤ θ ≤ 2π − δ/2.
 const gapped=(delta:number)=>simpson(t=>coulomb(lam*R,[R*Math.cos(t),R*Math.sin(t),0],[0,0,0]),delta/2,2*Math.PI-delta/2,4000);
 it('|E| = 2kλ sin(δ/2)/R and it points TOWARD the gap',()=>{
  let worst=0;for(const delta of [.3,.9,Math.PI,4.5]){const E=gapped(delta);const e=rel(norm(E),2*ke*lam*Math.sin(delta/2)/R);worst=Math.max(worst,e);
   expect(e).toBeLessThan(1e-11);expect(E[0]).toBeGreaterThan(0);expect(Math.abs(E[1])/E[0]).toBeLessThan(1e-10);}
  note('7.5 gapring magnitude 2kλ sin(δ/2)/R',worst);
 });
 it('a small gap acts as a point charge of the missing charge, kq_gap/R²',()=>{
  const delta=.02,E=gapped(delta),e=rel(E[0],ke*lam*R*delta/(R*R));note('7.5 gapring small-gap limit kq_gap/R²',e);expect(e).toBeLessThan(1e-4);
 });
});

describe('§7.6 · the point dipole: 2kp/y³ on axis, −kp/x³ on the bisector',()=>{
 const q=1.3e-9,d=.02,p=q*d;
 const dipole=(P:V3)=>add(coulomb(q,[0,d/2,0],P),coulomb(-q,[0,-d/2,0],P));
 it('axial field is +2kp/y³ (parallel to p), bisector field is −kp/x³ (antiparallel), ratio exactly −2',()=>{
  const y=500*d,x=500*d;const onAxis=dipole([0,y,0]),onBisector=dipole([x,0,0]);
  const e1=rel(onAxis[1],2*ke*p/y**3),e2=rel(onBisector[1],-ke*p/x**3);
  note('7.6 dipole on-axis 2kp/y³',e1);note('7.6 dipole bisector −kp/x³',e2);
  expect(e1).toBeLessThan(1e-5);expect(e2).toBeLessThan(1e-5);
  expect(onAxis[1]).toBeGreaterThan(0);expect(onBisector[1]).toBeLessThan(0);expect(Math.abs(onBisector[0])/Math.abs(onBisector[1])).toBeLessThan(1e-12);
  expect(rel(onAxis[1]/onBisector[1],-2)).toBeLessThan(1e-5);
 });
});

describe('§7.7–7.8 · potential of rods and lines',()=>{
 it('7.7 the bisector rod potential 2kλ ln((L/2+√(L²/4+r²))/r) tends to kQ/r far away',()=>{
  const L=2.6,lam=1.7;const V=(r:number)=>simpson1(y=>potential(lam,[0,y,0],[r,0,0]),-L/2,L/2,4000);
  expect(rel(V(1.15),2*ke*lam*Math.log((L/2+Math.sqrt(L*L/4+1.15**2))/1.15))).toBeLessThan(1e-12);
  const r=400*L,e=rel(V(r),ke*lam*L/r);note('7.7 rod V far field kQ/r',e);expect(e).toBeLessThan(2e-6);
 });
 it('7.8 the infinite line has only potential differences: V(r₁) − V(r₂) = 2kλ ln(r₂/r₁)',()=>{
  const lam=1.7,r1=.8,r2=2.3;
  // Each element's contribution to the DIFFERENCE decays as 1/y³, so the improper integral converges.
  const g=(y:number):V3=>[potential(lam,[0,y,0],[r1,0,0])-potential(lam,[0,y,0],[r2,0,0]),0,0];
  const total=add(add(simpson(g,-r2,r2,2048),toInfinity(g,r2,r2,60,256)),toInfinity(y=>g(-y),r2,r2,60,256));
  const e=rel(total[0],2*ke*lam*Math.log(r2/r1));note('7.8 infinite line ΔV = 2kλ ln(r₂/r₁)',e);expect(e).toBeLessThan(1e-9);
 });
});

describe('§7.9 · current loop far field is a magnetic dipole m = IπR²',()=>{
 const R=1.6,I=1.7;
 const loop=(P:V3)=>simpson(t=>biot(I,[-R*Math.sin(t),R*Math.cos(t),0],[R*Math.cos(t),R*Math.sin(t),0],P),0,2*Math.PI,4000);
 it('centre μ₀I/(2R) (control) and z ≫ R → μ₀m/(2πz³)',()=>{
  expect(rel(loop([0,0,0])[2],MU0*I/(2*R))).toBeLessThan(1e-12);
  const z=300*R,B=loop([0,0,z]),e=rel(B[2],MU0*(I*Math.PI*R*R)/(2*Math.PI*z**3));note('7.9 loop far field μ₀m/(2πz³), m = IπR²',e);expect(e).toBeLessThan(2e-5);
 });
});

describe('§7.10 · uniformly charged spherical shell',()=>{
 const R=1.2,Q=2.2e-9,sig=Q/(4*Math.PI*R*R);
 const shellE=(P:V3)=>simpson(th=>simpson(ph=>coulomb(sig*R*R*Math.sin(th),[R*Math.sin(th)*Math.cos(ph),R*Math.sin(th)*Math.sin(ph),R*Math.cos(th)],P),0,2*Math.PI,64),0,Math.PI,400);
 const shellV=(P:V3)=>simpson1(th=>simpson1(ph=>potential(sig*R*R*Math.sin(th),[R*Math.sin(th)*Math.cos(ph),R*Math.sin(th)*Math.sin(ph),R*Math.cos(th)],P),0,2*Math.PI,64),0,Math.PI,400);
 it('E = 0 inside and kQ/r² outside; V = kQ/R inside and kQ/r outside',()=>{
  const unit=ke*Q/(R*R);
  const inside=norm(shellE([.3*R,.2*R,.4*R]))/unit;note('7.10 shell E inside (relative to kQ/R²)',inside);expect(inside).toBeLessThan(1e-9);
  const P:V3=[1.5*R,-1*R,1.6*R],r=norm(P),out=shellE(P);const e=rel(norm(out),ke*Q/(r*r));note('7.10 shell E outside kQ/r²',e);expect(e).toBeLessThan(1e-9);
  expect(rel(out[0]/norm(out),P[0]/r)).toBeLessThan(1e-9); // radial
  const v0=rel(shellV([0,0,0]),ke*Q/R),v1=rel(shellV([.5*R,0,.3*R]),ke*Q/R),v2=rel(shellV(P),ke*Q/r);
  note('7.10 shell V inside = kQ/R (worst of two points)',Math.max(v0,v1));note('7.10 shell V outside kQ/r',v2);
  for(const e of [v0,v1,v2])expect(e).toBeLessThan(1e-9);
 });
 it('7.16 shell self-energy is kQ²/(2R), as ½QV with V the constant interior potential',()=>{
  const e=rel(.5*Q*shellV([0,0,0]),ke*Q*Q/(2*R));note('7.16 shell self-energy kQ²/(2R)',e);expect(e).toBeLessThan(1e-9);
  expect(ke*Q*Q/(2*R)).toBeLessThan(3*ke*Q*Q/(5*R)); // the solid sphere of the same charge stores more
 });
});

/** Integrate a per-length source over the cross-section of an infinite cylinder of radius R (axis ẑ),
 * observed at P = (r, 0, 0). Polar coordinates are centred on P, not on the axis, so the Jacobian
 * kills the 1/ρ⊥ line singularity when P is inside the material. */
function cylinderSum(R:number,r:number,perLength:(S:V3,dz:number)=>V3,m=100):V3{
 const P:V3=[r,0,0];
 // A line's field falls as 1/u and the Jacobian supplies a factor u, so the integrand tends to a
 // finite constant at u = 0 rather than to zero. The midpoint rule never has to evaluate it there.
 const g=(psi:number,u:number)=>alongLine((S,dz)=>scale(perLength(S,dz),u),[r+u*Math.cos(psi),u*Math.sin(psi),0],P);
 if(r<R)return simpson(psi=>{const umax=-r*Math.cos(psi)+Math.sqrt(R*R-r*r*Math.sin(psi)**2);return midpoint(u=>g(psi,u),0,umax,m);},0,2*Math.PI,m);
 // Outside, the chord through the cylinder vanishes like a square root at the tangent angles
 // ψ = π ± α; the substitution ψ = π + α sin θ makes the ψ-integrand smooth there.
 const alpha=Math.asin(R/r);
 return simpson(th=>{const psi=Math.PI+alpha*Math.sin(th),c=-r*Math.cos(psi),h=Math.sqrt(Math.max(0,R*R-r*r*Math.sin(psi)**2));return scale(midpoint(u=>g(psi,u),c-h,c+h,m),alpha*Math.cos(th));},-Math.PI/2,Math.PI/2,m);
}
describe('§7.11 · infinite solid cylinder of uniform ρ',()=>{
 const rho=1.5e-9,R=.8;
 it('E = ρr/(2ε₀) inside and ρR²/(2ε₀r) outside, radial',()=>{
  for(const [r,want] of [[.5*R,rho*.5*R/(2*EPS0)],[2.5*R,rho*R*R/(2*EPS0*2.5*R)]]){
   const E=cylinderSum(R,r,(S,dz)=>coulomb(rho*dz,S,[r,0,0]));const e=rel(E[0],want);note(`7.11 solid cylinder E at r = ${r/R}R`,e);
   expect(e).toBeLessThan(1e-6);expect(Math.abs(E[1])/E[0]).toBeLessThan(1e-8);expect(Math.abs(E[2])/E[0]).toBeLessThan(1e-8);
  }
 });
});

describe('§7.12 · coaxial cable: +λ on the inner conductor, −λ induced on the shell’s inner surface',()=>{
 const lam=1.7e-9,a=.3,b=.9,c=1.1;
 // A thin cylindrical shell of radius s carrying λ per length, as a ring of infinite lines.
 const shell=(s:number,lambda:number,P:V3)=>simpson(ph=>alongLine((S,dz)=>coulomb(lambda/(2*Math.PI)*dz,S,P),[s*Math.cos(ph),s*Math.sin(ph),0],P),0,2*Math.PI,400);
 it('E = 0 inside the inner conductor, 2kλ/r in the gap, 0 outside the neutral cable',()=>{
  const unit=2*ke*lam/a;
  const inside=norm(shell(a,lam,[.5*a,0,0]))/unit;note('7.12 coax E inside inner conductor',inside);expect(inside).toBeLessThan(1e-9);
  const r=.6,gap=add(shell(a,lam,[r,0,0]),shell(b,-lam,[r,0,0]));const e=rel(gap[0],2*ke*lam/r);note('7.12 coax E in the gap 2kλ/r',e);expect(e).toBeLessThan(1e-9);
  const outside=norm(add(shell(a,lam,[1.4*c,0,0]),shell(b,-lam,[1.4*c,0,0])))/unit;note('7.12 coax E outside (with −λ on the inner surface)',outside);expect(outside).toBeLessThan(1e-9);
  // Without the induced −λ the outside would NOT be field-free — the induced charge is load-bearing.
  expect(norm(shell(a,lam,[1.4*c,0,0]))/unit).toBeGreaterThan(.1);
 });
});

/** Field of an infinite sheet σ in the plane x = x0 at P, as rings of point charge. */
function sheetE(sig:number,x0:number,P:V3):V3{
 const h=Math.abs(P[0]-x0);const ring=(s:number,ds:number)=>simpson(ph=>coulomb(sig*s*ds,[x0,s*Math.cos(ph),s*Math.sin(ph)],P),0,2*Math.PI,32);
 // With s = h tan t the integrand is 2πkσ sin t: finite at t = π/2, so stop a hair short. The
 // omitted tail is sin ε ≈ ε of the total, and the endpoint value is insensitive to rounding in cos t.
 return simpson(t=>{const c=Math.cos(t);return ring(h*Math.tan(t),h/(c*c));},0,Math.PI/2-1e-11,128);
}
describe('§7.13 · slab and conductor surface — the σ/ε₀ versus σ/(2ε₀) headline',()=>{
 const rho=2e-9,d=.4;
 // The slab is a stack of sheets σ = ρ dx′; the stack is split at P so no panel straddles the sign change.
 const slabE=(x:number)=>{const g=(xp:number)=>sheetE(rho,xp,[x,0,0]);if(Math.abs(x)>=d)return midpoint(g,-d,d,64);return add(midpoint(g,-d,x,48),midpoint(g,x,d,48));};
 it('inside the slab E = ρx/ε₀ (linear), outside E = ρd/ε₀ = σ_eff/(2ε₀)',()=>{
  for(const x of [.15,-.3]){const E=slabE(x),e=rel(E[0],rho*x/EPS0);note(`7.13 slab E inside at x = ${x}`,e);expect(e).toBeLessThan(1e-9);}
  for(const x of [.7,-2]){const E=slabE(x),e=rel(E[0],Math.sign(x)*rho*d/EPS0);note(`7.13 slab E outside at x = ${x}`,e);expect(e).toBeLessThan(1e-9);}
  expect(rel(rho*d/EPS0,(2*rho*d)/(2*EPS0))).toBe(0);
 });
 it('an isolated sheet gives σ/(2ε₀), but just outside a charged conductor the field is σ/ε₀',()=>{
  const sig=1.3e-9,t=.2;
  expect(rel(sheetE(sig,0,[.5,0,0])[0],sig/(2*EPS0))).toBeLessThan(1e-9);
  // A conducting slab of thickness t carries σ on EACH face. The far face supplies the missing half
  // outside, and cancels the near face inside — which is why the pillbox needs only one face.
  const slab=(x:number)=>add(sheetE(sig,-t/2,[x,0,0]),sheetE(sig,t/2,[x,0,0]));
  const eOut=rel(slab(t/2+.05)[0],sig/EPS0),eIn=Math.abs(slab(.03)[0])/(sig/EPS0);
  note('7.13 conductor surface E = σ/ε₀',eOut);note('7.13 conductor interior E = 0 (relative to σ/ε₀)',eIn);
  expect(eOut).toBeLessThan(1e-9);expect(eIn).toBeLessThan(1e-9);
 });
});

describe('§7.14 · Ampère results by direct Biot–Savart',()=>{
 it('thick wire: B = μ₀Ir/(2πR²) inside, μ₀I/(2πr) outside, azimuthal',()=>{
  const I=2.3,R=.8,J=I/(Math.PI*R*R);
  for(const [r,want] of [[.5*R,MU0*I*.5*R/(2*Math.PI*R*R)],[2.5*R,MU0*I/(2*Math.PI*2.5*R)]]){
   const B=cylinderSum(R,r,(S,dz)=>biot(J,[0,0,dz],S,[r,0,0]));const e=rel(B[1],want);note(`7.14 thick wire B at r = ${r/R}R`,e);
   expect(e).toBeLessThan(1e-6);expect(Math.abs(B[0])/Math.abs(B[1])).toBeLessThan(1e-8);expect(Math.abs(B[2])/Math.abs(B[1])).toBeLessThan(1e-8);
  }
 });
 it('toroid: B = μ₀NI/(2πr) inside the windings, ~0 outside',()=>{
  const Rmaj=2,a=.5,N=720,I=1.3;
  const toroid=(P:V3)=>{let B:V3=[0,0,0];for(let k=0;k<N;k++){const ph=2*Math.PI*(k+.5)/N,cph=Math.cos(ph),sph=Math.sin(ph);
   B=add(B,simpson(th=>biot(I,[-a*Math.sin(th)*cph,-a*Math.sin(th)*sph,a*Math.cos(th)],[(Rmaj+a*Math.cos(th))*cph,(Rmaj+a*Math.cos(th))*sph,a*Math.sin(th)],P),0,2*Math.PI,96));}return B;};
  for(const r of [Rmaj-.5*a,Rmaj,Rmaj+.5*a]){const B=toroid([r,0,0]);const e=rel(Math.abs(B[1]),MU0*N*I/(2*Math.PI*r));note(`7.14 toroid B at r = ${r} (N = ${N} discrete turns)`,e);
   expect(e).toBeLessThan(1e-4);expect(Math.abs(B[0])/Math.abs(B[1])).toBeLessThan(1e-3);expect(Math.abs(B[2])/Math.abs(B[1])).toBeLessThan(1e-3);}
  const out=norm(toroid([Rmaj+2*a,0,0]))/(MU0*N*I/(2*Math.PI*Rmaj));note('7.14 toroid B outside (relative to interior)',out);expect(out).toBeLessThan(1e-3);
 });
 it('sign convention: current in +ŷ with P on +x̂ gives B in −ẑ (finite wire)',()=>{
  const I=2.3,d=1.4,B=simpson(y=>biot(I,[0,1,0],[0,y,0],[d,0,0]),-.8,3.1,2000);
  expect(B[2]).toBeLessThan(0);expect(rel(B[2],-MU0*I/(4*Math.PI*d)*(3.1/Math.hypot(3.1,d)-(-.8)/Math.hypot(.8,d)))).toBeLessThan(1e-12);
 });
});

describe('§7.15 · emf of a loop receding from a long wire',()=>{
 it('emf = −dΦ/dt = (μ₀Iℓ/2π)·vw/(a(a+w)), positive as the flux falls',()=>{
  const I=2,w=1.7,l=1.1,v=.6;
  const B=(r:number)=>alongLine((S,dz)=>biot(I,[0,0,dz],S,[r,0,0]),[0,0,0],[r,0,0])[1];
  const flux=(a:number)=>simpson1(r=>B(r)*l,a,a+w,800);
  const a=.5,h=1e-3,dPhi=(flux(a+h)-flux(a-h))/(2*h);
  expect(dPhi).toBeLessThan(0);
  const e=rel(-dPhi*v,MU0*I*l/(2*Math.PI)*v*w/(a*(a+w)));note('7.15 receding-loop emf',e);expect(e).toBeLessThan(1e-5);
  // Control: the spec-verified flux itself.
  expect(rel(flux(a),MU0*I*l/(2*Math.PI)*Math.log((a+w)/a))).toBeLessThan(1e-9);
 });
});
