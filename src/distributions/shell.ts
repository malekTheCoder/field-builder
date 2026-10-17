import {K} from './constants';
import {coulombSum,type ChargeSample,type Distribution} from './types';
import type {Params} from '../problems/types';
/** THE SPHERICAL SHELL, BUILT FROM RINGS. A thin shell of radius R = size/2 centred on the origin holds a charge Q
 * spread evenly over its surface, σ = Q/(4πR²); P = (0, 0, z) is on its axis, `distance` = z > 0, outside when z > R
 * and inside when z < R. A ring of it is placed by its polar angle θ, measured at the centre from the +z axis: 0 at
 * the top, π at the bottom; it is R sin θ out from the axis and R cos θ up it.
 *
 * EACH RING HOLDS THE CHARGE OF ITS OWN BAND, (Q/2)(cos θ₋ − cos θ₊) = Q sin θᵢ sin(Δθ/2), so the rings add to Q at
 * every N (Σ sin θᵢ = 1/sin(Δθ/2) over the midpoints), as the uneven semicircle's pieces hold their own stretch's
 * charge. The density at the middle times the band's area, σ 2πR² sin θᵢ Δθ, the board's ΔQ, is that charge to
 * within (Δθ/2)²/6, and at N rings it adds to Q (Δθ/2)/sin(Δθ/2), not Q: a sum that held more charge than the shell
 * would not close on kQ/z² for the right reason. A ring's field on its own axis is exact at any width of band, so the
 * one approximation left in the sum is the band's charge counted at one angle, one distance r_i from P.
 *
 * Each sample stands for a whole ring: `position` is where it crosses the xz-plane on the +x side, (R sin θ, 0,
 * R cos θ), `coordinate` is θ, and `field` is the ring's own field on its axis, along z only. */
const ring=(theta:number,dq:number,R:number,z:number):ChargeSample=>{
 const s=R*Math.sin(theta),h=R*Math.cos(theta),r=Math.hypot(s,z-h);
 return{position:{x:s,y:0,z:h},dq,coordinate:theta,field:{x:0,y:0,z:K*dq*(z-h)/r**3},potential:K*dq/r};
};
/** The rings of a shell of radius R and charge q (coulombs), cut into n bands of equal angle, seen from height z. */
export function shellRings(R:number,q:number,z:number,n:number):ChargeSample[]{
 const w=q*Math.sin(Math.PI/(2*n));
 return Array.from({length:n},(_,i)=>{const theta=Math.PI*(i+.5)/n;return ring(theta,w*Math.sin(theta),R,z);});
}
/** The closed form: kQ/z² outside, zero inside. On the surface itself the integral is the mean of the two sides,
 * kQ/(2R²), which is what the rings add to there too; the lesson never stands P on it. */
export function shellField(R:number,q:number,z:number):number{
 const a=Math.abs(z);
 if(a>R*(1+1e-12))return Math.sign(z)*K*q/(z*z);
 if(a<R*(1-1e-12))return 0;
 return Math.sign(z)*K*q/(2*R*R);
}
export const shell:Distribution={id:'shell',substitutions:{Q:'sigma*4*pi*R^2'},
 field(p:Params){return{x:0,y:0,z:shellField(p.size/2,p.charge*1e-9,p.distance)};},
 // V = kQ/z outside and kQ/R everywhere inside: the potential the field's zero inside leaves level.
 potential(p:Params){const R=p.size/2,a=Math.abs(p.distance);return K*p.charge*1e-9/Math.max(a,R);},
 // A point-charge sum over the whole surface, not the rings: bands of equal angle, each split into point charges at
 // equal azimuths, every point holding its patch's exact charge. Nothing in it uses a ring's closed form.
 quadrature(p:Params,n:number){
  const R=p.size/2,q=p.charge*1e-9,z=p.distance,nt=Math.max(120,Math.floor(Math.sqrt(n))),np=160,w=q*Math.sin(Math.PI/(2*nt))/np;
  return coulombSum(add=>{for(let i=0;i<nt;i++){const theta=Math.PI*(i+.5)/nt,s=R*Math.sin(theta),h=R*Math.cos(theta),dq=w*Math.sin(theta);
   for(let j=0;j<np;j++){const phi=2*Math.PI*(j+.5)/np;add(dq,-s*Math.cos(phi),-s*Math.sin(phi),z-h);}}});
 },
 sample(p:Params,n:number){return shellRings(p.size/2,p.charge*1e-9,p.distance,n);},
};
