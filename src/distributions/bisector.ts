import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** Uniform rod on the y-axis from −L/2 to L/2, total charge Q; P = (r, 0). */
export const bisector:Distribution={id:'bisector',substitutions:{Q:'lambda*L'},
 field(p){const d=p.distance,L=p.size,q=p.charge*1e-9;return{x:K*q/(d*Math.sqrt(d*d+L*L/4)),y:0,z:0};},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return coulombSum(add=>{for(let i=0;i<n;i++){const u=(i+.5)*L/n;add(q/n,d,L/2-u,0);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return midpoints(n).map(t=>{const y=-L/2+L*t;return pointSample({x:0,y,z:0},{x:d,y:0,z:0},q/n,y);});},
};
