import {EPS0,K,type Vec} from './constants';
import {coulombSum,midpoints,type ChargeSample,type Distribution} from './types';
import type {Params} from '../problems/types';
// Disk and sheet are built from whole annuli: each sample is a complete thin ring whose
// transverse fields have already cancelled, so its field is purely axial. The sheet sweeps
// s ∈ [0, ∞) through s = |z| tan(πt/2) with the matching Jacobian.
const thinRing=(s:number,ds:number,sigma:number,d:number):ChargeSample=>{const dq=sigma*2*Math.PI*s*ds,h=Math.hypot(s,d);return{position:{x:s,y:0,z:0},dq,coordinate:s,field:{x:0,y:0,z:K*dq*d/h**3},potential:K*dq/h};};
function surfaceQuadrature(p:Params,n:number,sigma:number,radius:(t:number)=>number,width:(t:number,nr:number)=>number):Vec{
 if(p.distance===0)return{x:0,y:0,z:NaN};
 const d=p.distance,nr=Math.max(100,Math.floor(Math.sqrt(n))),nt=160;
 return coulombSum(add=>{for(let i=0;i<nr;i++){const t=(i+.5)/nr,rho=radius(t),dr=width(t,nr);for(let j=0;j<nt;j++){const theta=2*Math.PI*(j+.5)/nt;add(sigma*rho*dr*2*Math.PI/nt,-rho*Math.cos(theta),-rho*Math.sin(theta),d);}}});
}
/** Uniform disk of radius R = size/2 in the xy-plane, total charge Q; P = (0, 0, z). */
export const disk:Distribution={id:'disk',substitutions:{Q:'sigma*pi*R^2'},
 field(p){const d=p.distance,R=p.size/2,q=p.charge*1e-9,sigma=q/(Math.PI*R*R),h=Math.hypot(d,R);return{x:0,y:0,z:d===0?NaN:Math.sign(d)*sigma/(2*EPS0)*(R/h)*(R/(h+Math.abs(d)))};},
 // V = (σ/2ε₀)(√(z²+R²) − |z|); h − |z| is written as R²/(h + |z|) so the far field kQ/z survives cancellation.
 potential(p){const d=Math.abs(p.distance),R=p.size/2,sigma=p.charge*1e-9/(Math.PI*R*R),h=Math.hypot(d,R);return sigma/(2*EPS0)*R*R/(h+d);},
 quadrature(p,n){const R=p.size/2;return surfaceQuadrature(p,n,p.charge*1e-9/(Math.PI*R*R),t=>R*t,(_,nr)=>R/nr);},
 sample(p,n){const R=p.size/2,sigma=p.charge*1e-9/(Math.PI*R*R);return midpoints(n).map(t=>thinRing(R*t,R/n,sigma,p.distance));},
};
/** Infinite isolated nonconducting sheet (σ in nC/m²) in the xy-plane; P = (0, 0, z). */
export const sheet:Distribution={id:'sheet',
 field(p){const d=p.distance,q=p.charge*1e-9;return{x:0,y:0,z:d===0?NaN:Math.sign(d)*q/(2*EPS0)};},
 quadrature(p,n){const a=Math.abs(p.distance);return surfaceQuadrature(p,n,p.charge*1e-9,t=>a*Math.tan(Math.PI*t/2),(t,nr)=>a*Math.PI/2/(Math.cos(Math.PI*t/2)**2)/nr);},
 sample(p,n){const a=Math.abs(p.distance),sigma=p.charge*1e-9;return midpoints(n).map(t=>{const theta=Math.PI*t/2;return thinRing(a*Math.tan(theta),a*Math.PI/(2*n*Math.cos(theta)**2),sigma,p.distance);});},
};
/** How near the rim the slider lets the hole come, as a share of b: the annulus stays one a reader can see. */
export const HOLE_MAX=.95;
/** The annulus's two radii: b = size/2, and the hole's a = `inner`, held just inside the rim so the charge is never
 * turned inside out. The Explorer keeps `inner` under HOLE_MAX·b; only the thin-annulus limit, which closes the
 * annulus up on its rim, takes it further, and the physics holds for any a < b. */
export const annulusRadii=(p:Params)=>{const b=p.size/2;return{a:Math.max(0,Math.min(p.inner,.999*b)),b};};
/** Uniform annulus, inner radius a and outer radius b, in the xy-plane, total charge Q; P = (0, 0, z). Its
 * rings run from s = a to s = b, the disk's rings with the middle ones taken out.
 *
 * E_z = 2πkσz (1/√(z² + a²) − 1/√(z² + b²)), with σ = Q/(π(b² − a²)). The two reciprocals agree to more digits
 * the further away P is, so their difference is written without the loss: 1/h_a − 1/h_b = (b² − a²)/(h_a h_b
 * (h_a + h_b)), and the b² − a² cancels the one in σ, leaving E_z = 2kQz/(h_a h_b (h_a + h_b)). Far away that is
 * kQ/z², at a = 0 the disk's 2kQ/(h_b(h_b + |z|)) and at a → b the ring's kQz/h_b³: every limit is read off it
 * whole. At the centre of a disk with no hole (a = 0, z = 0) the field jumps from one face to the other, as the
 * disk's does, and is NaN there; with a hole it is zero, by symmetry. */
export const annulus:Distribution={id:'annulus',substitutions:{Q:'sigma*pi*(b^2-a^2)'},
 field(p){const d=p.distance,{a,b}=annulusRadii(p),q=p.charge*1e-9,ha=Math.hypot(d,a),hb=Math.hypot(d,b);return{x:0,y:0,z:a===0&&d===0?NaN:2*K*q*d/(ha*hb*(ha+hb))};},
 quadrature(p,n){const {a,b}=annulusRadii(p);if(a===0&&p.distance===0)return{x:0,y:0,z:NaN};const sigma=p.charge*1e-9/(Math.PI*(b-a)*(b+a)),d=p.distance,nr=Math.max(100,Math.floor(Math.sqrt(n))),nt=160;
  return coulombSum(add=>{for(let i=0;i<nr;i++){const rho=a+(b-a)*(i+.5)/nr,dr=(b-a)/nr;for(let j=0;j<nt;j++){const theta=2*Math.PI*(j+.5)/nt;add(sigma*rho*dr*2*Math.PI/nt,-rho*Math.cos(theta),-rho*Math.sin(theta),d);}}});},
 // The width w = b − a is worked out once and used for both the ring's width and σ's area, π w (b + a): a thin annulus's
 // b² − a² lost digits to cancellation, and each ring's charge came out two parts in 10¹⁴ off its share of Q.
 sample(p,n){const {a,b}=annulusRadii(p),w=b-a,sigma=p.charge*1e-9/(Math.PI*w*(b+a));return midpoints(n).map(t=>thinRing(a+w*t,w/n,sigma,p.distance));},
};
