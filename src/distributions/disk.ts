import {EPS0,K,type Vec} from './constants';
import {coulombSum,midpoints,type ChargeSample,type Distribution} from './types';
import type {Params} from '../problems/types';
// Disk and sheet are built from whole annuli: each sample is a complete thin ring whose
// transverse fields have already cancelled, so its field is purely axial. The sheet sweeps
// s ∈ [0, ∞) through s = |z| tan(πt/2) with the matching Jacobian.
const annulus=(s:number,ds:number,sigma:number,d:number):ChargeSample=>{const dq=sigma*2*Math.PI*s*ds,h=Math.hypot(s,d);return{position:{x:s,y:0,z:0},dq,coordinate:s,field:{x:0,y:0,z:K*dq*d/h**3},potential:K*dq/h};};
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
 sample(p,n){const R=p.size/2,sigma=p.charge*1e-9/(Math.PI*R*R);return midpoints(n).map(t=>annulus(R*t,R/n,sigma,p.distance));},
};
/** Infinite isolated nonconducting sheet (σ in nC/m²) in the xy-plane; P = (0, 0, z). */
export const sheet:Distribution={id:'sheet',
 field(p){const d=p.distance,q=p.charge*1e-9;return{x:0,y:0,z:d===0?NaN:Math.sign(d)*q/(2*EPS0)};},
 quadrature(p,n){const a=Math.abs(p.distance);return surfaceQuadrature(p,n,p.charge*1e-9,t=>a*Math.tan(Math.PI*t/2),(t,nr)=>a*Math.PI/2/(Math.cos(Math.PI*t/2)**2)/nr);},
 sample(p,n){const a=Math.abs(p.distance),sigma=p.charge*1e-9;return midpoints(n).map(t=>{const theta=Math.PI*t/2;return annulus(a*Math.tan(theta),a*Math.PI/(2*n*Math.cos(theta)**2),sigma,p.distance);});},
};
