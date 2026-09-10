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
