import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** asinh(x) − x/√(1+x²), to full precision at every x. Rises like x³/3 from zero. */
function asinhGap(x:number):number{
 if(x>=.1)return Math.asinh(x)-x/Math.sqrt(1+x*x);
 const t=x*x;
 return x*t*(1/3+t*(-3/10+t*(15/56+t*(-35/144+t*(315/1408-t*693/3328)))));
}
/** Rod standing on the x-axis from y = 0 to L with λ(y) = λ₀ y/L: empty at the foot, densest
 * at the top. P = (r, 0), level with the foot — the `endpoint` geometry with the density
 * broken. `charge` is the peak density λ₀ in nC/m, so the total charge is λ₀L/2 and the
 * centre of charge sits at 2L/3, which is what the far-field E_y remembers. */
export const ramp:Distribution={id:'ramp',substitutions:{Q:'lambda0*L/2'},total:p=>p.charge*1e-9*p.size/2,
 // The textbook forms (kλ₀/L)(1 − r/h) and ln((L+h)/r) cancel catastrophically far away; 1 − r/h = L²/(h(h+r))
 // exactly, and asinh(L/r) = ln((L+h)/r), so these are the same numbers computed without the loss.
 //
 // That was only ever true of E_x. `asinh(x) − x/√(1+x²)` cancels just as badly: both terms tend to x,
 // their difference to x³/3, so it throws away two digits per decade of r/L and E_y was 7% wrong by
 // r/L = 1e7. There is no algebraic rearrangement for this one, so below x = 0.1 the series IS the
 // answer — six terms, each a factor x² = 0.01 smaller than the last, so it carries more digits there
 // than the subtraction ever could. Above it the two terms differ by enough that nothing is lost.
 field(p){const d=p.distance,L=p.size,l0=p.charge*1e-9,h=Math.sqrt(d*d+L*L);return{x:K*l0*L/(h*(h+d)),y:-K*l0/L*asinhGap(L/d),z:0};},
 quadrature(p,n){const l0=p.charge*1e-9,d=p.distance,L=p.size;return coulombSum(add=>{for(let i=0;i<n;i++){const y=(i+.5)*L/n;add(l0*y/n,d,-y,0);}});},
 sample(p,n){const l0=p.charge*1e-9,d=p.distance,L=p.size;return midpoints(n).map(t=>{const y=L*t;return pointSample({x:0,y,z:0},{x:d,y:0,z:0},l0*y/n,y);});},
};
