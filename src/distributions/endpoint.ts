import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** Uniform rod standing on the x-axis from y = 0 to L; P = (r, 0), level with its foot (Knight P26.41). */
export const endpoint:Distribution={id:'endpoint',substitutions:{Q:'lambda*L'},
 field(p){const d=p.distance,L=p.size,q=p.charge*1e-9,h=Math.sqrt(d*d+L*L);return{x:K*q/(d*h),y:-K*(q/L)*(1/d-1/h),z:0};},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return coulombSum(add=>{for(let i=0;i<n;i++){const u=(i+.5)*L/n;add(q/n,d,-u,0);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return midpoints(n).map(t=>{const y=L*t;return pointSample({x:0,y,z:0},{x:d,y:0,z:0},q/n,y);});},
};
