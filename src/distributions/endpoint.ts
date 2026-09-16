import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** Uniform rod standing on the x-axis from y = 0 to L; P = (r, 0), level with its foot (Knight P26.41). */
export const endpoint:Distribution={id:'endpoint',substitutions:{Q:'lambda*L'},
 // E_y = -(kQ/L)(1/r - 1/h) written as -kQL/(r h (h+r)): 1/r - 1/h = L^2/(r h (h+r)) exactly. The
 // subtracted form loses two digits per decade of r/L, so the transverse field -- the whole point
 // of standing P level with the foot -- was 3% wrong by r/L = 1e7. Same spelling as ramp.ts uses.
 field(p){const d=p.distance,L=p.size,q=p.charge*1e-9,h=Math.sqrt(d*d+L*L);return{x:K*q/(d*h),y:-K*q*L/(d*h*(h+d)),z:0};},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return coulombSum(add=>{for(let i=0;i<n;i++){const u=(i+.5)*L/n;add(q/n,d,-u,0);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return midpoints(n).map(t=>{const y=L*t;return pointSample({x:0,y,z:0},{x:d,y:0,z:0},q/n,y);});},
};
