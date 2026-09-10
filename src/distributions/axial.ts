import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** Uniform rod on the x-axis from 0 to L; P = (L + a, 0) beyond its end. `distance` is a. */
export const axial:Distribution={id:'axial',substitutions:{Q:'lambda*L'},
 field(p){const d=p.distance,L=p.size,q=p.charge*1e-9;return{x:K*q/L*(1/d-1/(d+L)),y:0,z:0};},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return coulombSum(add=>{for(let i=0;i<n;i++){const u=(i+.5)*L/n;add(q/n,L+d-u,0,0);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return midpoints(n).map(t=>{const x=L*t;return pointSample({x,y:0,z:0},{x:L+d,y:0,z:0},q/n,x);});},
};
