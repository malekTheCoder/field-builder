import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** Uniform rod on the x-axis from 0 to L; P = (L + a, 0) beyond its end. `distance` is a. */
export const axial:Distribution={id:'axial',substitutions:{Q:'lambda*L'},
 // E = kQ/L (1/a - 1/(a+L)) written as kQ/(a(a+L)): the same number, without the loss. Those two
 // reciprocals agree to more digits the further away P is, so their difference throws away about
 // one digit per decade of a/L -- 12 of them gone by a/L = 1e12, and the far field is where this
 // lesson's own limiting case looks. The potential on the next line already knows the rule.
 field(p){const d=p.distance,L=p.size,q=p.charge*1e-9;return{x:K*q/(d*(d+L)),y:0,z:0};},
 // V = kλ ln((a + L)/a); log1p keeps the far field kQ/a exact.
 potential(p){const d=p.distance,L=p.size,q=p.charge*1e-9;return K*q/L*Math.log1p(L/d);},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return coulombSum(add=>{for(let i=0;i<n;i++){const u=(i+.5)*L/n;add(q/n,L+d-u,0,0);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance,L=p.size;return midpoints(n).map(t=>{const x=L*t;return pointSample({x,y:0,z:0},{x:L+d,y:0,z:0},q/n,x);});},
};
