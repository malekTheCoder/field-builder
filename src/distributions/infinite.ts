import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
// The unbounded coordinate is swept by t ∈ (−π/2, π/2) with y = r tan t; each element carries
// the Jacobian r sec²t, so the sums are honest point-charge sums with no closed form inside.
/** Infinite uniform line (λ in nC/m) on the y-axis; P = (r, 0). Sample coordinates are the angle. */
export const infinite:Distribution={id:'infinite',substitutions:{Q:'lambda*L'},
 field(p){return{x:2*K*p.charge*1e-9/p.distance,y:0,z:0};},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance;return coulombSum(add=>{for(let i=0;i<n;i++){const t=(i+.5)*Math.PI/n-Math.PI/2,u=d*Math.tan(t);add(q*d/(Math.cos(t)**2)*Math.PI/n,d,-u,0);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance;return midpoints(n).map(t=>{const theta=t*Math.PI-Math.PI/2,u=d*Math.tan(theta);return pointSample({x:0,y:u,z:0},{x:d,y:0,z:0},q*d*Math.PI/(n*Math.cos(theta)**2),theta);});},
};
/** Semi-infinite uniform line (λ in nC/m) along +x from the origin; P = (0, r). Sample coordinates are x. */
export const semi:Distribution={id:'semi',
 field(p){const v=K*p.charge*1e-9/p.distance;return{x:-v,y:v,z:0};},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance;return coulombSum(add=>{for(let i=0;i<n;i++){const t=(i+.5)*Math.PI/2/n,u=d*Math.tan(t);add(q*d/(Math.cos(t)**2)*Math.PI/2/n,-u,d,0);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance;return midpoints(n).map(t=>{const theta=t*Math.PI/2,u=d*Math.tan(theta);return pointSample({x:u,y:0,z:0},{x:0,y:d,z:0},q*d*Math.PI/2/(n*Math.cos(theta)**2),u);});},
};
