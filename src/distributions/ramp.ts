import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** Rod standing on the x-axis from y = 0 to L with λ(y) = λ₀ y/L: empty at the foot, densest
 * at the top. P = (r, 0), level with the foot — the `endpoint` geometry with the density
 * broken. `charge` is the peak density λ₀ in nC/m, so the total charge is λ₀L/2 and the
 * centre of charge sits at 2L/3, which is what the far-field E_y remembers. */
export const ramp:Distribution={id:'ramp',substitutions:{Q:'lambda0*L/2'},total:p=>p.charge*1e-9*p.size/2,
 // The textbook forms (kλ₀/L)(1 − r/h) and ln((L+h)/r) cancel catastrophically far away; 1 − r/h = L²/(h(h+r))
 // exactly, and asinh(L/r) = ln((L+h)/r), so these are the same numbers computed without the loss.
 field(p){const d=p.distance,L=p.size,l0=p.charge*1e-9,h=Math.sqrt(d*d+L*L);return{x:K*l0*L/(h*(h+d)),y:-K*l0/L*(Math.asinh(L/d)-L/h),z:0};},
 quadrature(p,n){const l0=p.charge*1e-9,d=p.distance,L=p.size;return coulombSum(add=>{for(let i=0;i<n;i++){const y=(i+.5)*L/n;add(l0*y/n,d,-y,0);}});},
 sample(p,n){const l0=p.charge*1e-9,d=p.distance,L=p.size;return midpoints(n).map(t=>{const y=L*t;return pointSample({x:0,y,z:0},{x:d,y:0,z:0},l0*y/n,y);});},
};
