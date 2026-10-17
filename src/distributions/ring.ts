import {K} from './constants';
import {coulombSum,midpoints,pointSample,type Distribution} from './types';
/** Uniform ring of radius R = size/2 in the xy-plane, total charge Q; P = (0, 0, z). */
export const ring:Distribution={id:'ring',substitutions:{Q:'lambda*2*pi*R'},
 field(p){const d=p.distance,R=p.size/2,q=p.charge*1e-9;return{x:0,y:0,z:K*q*d/(R*R+d*d)**1.5};},
 potential(p){const d=p.distance,R=p.size/2,q=p.charge*1e-9;return K*q/Math.hypot(R,d);},
 quadrature(p,n){const q=p.charge*1e-9,d=p.distance,R=p.size/2;return coulombSum(add=>{for(let i=0;i<n;i++){const theta=2*Math.PI*(i+.5)/n;add(q/n,-R*Math.cos(theta),-R*Math.sin(theta),d);}});},
 sample(p,n){const q=p.charge*1e-9,d=p.distance,R=p.size/2;return midpoints(n).map(t=>{const theta=2*Math.PI*t;return pointSample({x:R*Math.cos(theta),y:R*Math.sin(theta),z:0},{x:0,y:0,z:d},q/n,theta);});},
};
/** Uniform arc of radius R spanning −φ/2…φ/2 about +x, total charge Q; P at the centre of curvature. */
export const arc:Distribution={id:'arc',substitutions:{Q:'lambda*R*phi'},
 field(p){const R=p.size/2,q=p.charge*1e-9;return{x:-2*K*q*Math.sin(p.phi/2)/(R*R*p.phi),y:0,z:0};},
 // Every element is exactly R from the centre, so V is kQ/R whatever the arc angle.
 potential(p){return K*p.charge*1e-9/(p.size/2);},
 quadrature(p,n){const q=p.charge*1e-9,R=p.size/2;return coulombSum(add=>{for(let i=0;i<n;i++){const theta=-p.phi/2+p.phi*(i+.5)/n;add(q/n,-R*Math.cos(theta),-R*Math.sin(theta),0);}});},
 sample(p,n){const q=p.charge*1e-9,R=p.size/2;return midpoints(n).map(t=>{const theta=p.phi*(t-.5);return pointSample({x:R*Math.cos(theta),y:R*Math.sin(theta),z:0},{x:0,y:0,z:0},q/n,theta);});},
};
/** A semicircle of radius R spanning −π/2…π/2 about +x, its charge uneven: λ(θ) = λ₀ cos θ, densest on the axis and
 * empty at the two ends, so Q = 2λ₀R and λ₀ = Q/(2R). P at the centre. `charge` is Q, as the arc's is, so the two
 * semicircles compare at one charge.
 *
 * EACH PIECE HOLDS THE CHARGE OF ITS OWN STRETCH, λ₀R(sin θ₊ − sin θ₋) = Q sin(Δθ/2) cos θᵢ, put at its middle: so the
 * pieces add to Q at every N, and the one approximation left is the one the run names, a piece treated as a point
 * charge at its middle. The density at the middle times the length, λ₀ cos θᵢ R Δθ, the board's ΔQ, is that charge to
 * within (Δθ/2)²/6 -- and is not the cut to draw: at one piece it puts πQ/2 on the arc, and from two pieces on its
 * midpoint sum of cos²θ is exactly N/2, so the chain would land on the integral at every N and the limit would show
 * nothing converging. */
export const unevenArc:Distribution={id:'uneven-arc',substitutions:{Q:'2*lambda0*R'},
 // E_x = −(kλ₀/R)∫cos²θ dθ over the half turn = −πkλ₀/(2R) = −πkQ/(4R²); every piece has its mirror at −θ, so E_y = 0.
 field(p){const R=p.size/2,q=p.charge*1e-9;return{x:-Math.PI*K*q/(4*R*R),y:0,z:0};},
 // Every element is exactly R from the centre, so V is kQ/R however the charge is spread along the arc.
 potential(p){return K*p.charge*1e-9/(p.size/2);},
 quadrature(p,n){const R=p.size/2,w=p.charge*1e-9*Math.sin(Math.PI/(2*n)),dt=Math.PI/n;return coulombSum(add=>{for(let i=0;i<n;i++){const theta=-Math.PI/2+dt*(i+.5);add(w*Math.cos(theta),-R*Math.cos(theta),-R*Math.sin(theta),0);}});},
 sample(p,n){const R=p.size/2,w=p.charge*1e-9*Math.sin(Math.PI/(2*n));return midpoints(n).map(t=>{const theta=Math.PI*(t-.5);return pointSample({x:R*Math.cos(theta),y:R*Math.sin(theta),z:0},{x:0,y:0,z:0},w*Math.cos(theta),theta);});},
};
