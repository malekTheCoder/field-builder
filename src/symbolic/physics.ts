import type {Limit,Params,Problem,ProblemId} from '../problems/types';
import {REGISTRY} from '../distributions';
export {EPS0,K,type Vec} from '../distributions/constants';
import {K,EPS0,type Vec} from '../distributions/constants';
// Finite distributions use total Q in nC; infinite lines use λ in nC/m;
// semi-infinite lines use λ in nC/m; an infinite sheet uses σ in nC/m². Distance and geometry are in meters.
// The per-geometry closed forms and point-charge sums live in src/distributions/.
export function field(id:ProblemId,p:Params):Vec {return REGISTRY[id].field(p);}
/** Closed-form potential at P in volts. Only the geometries with a potential problem define one. */
export function potential(id:ProblemId,p:Params):number {const v=REGISTRY[id].potential?.(p);if(v===undefined)throw Error(`${id} has no potential closed form.`);return v;}
export function magnitude(v:Vec){return Math.hypot(v.x,v.y,v.z);}
export function pretty(n:number){if(!Number.isFinite(n))return '—';return Math.abs(n)<.001&&n!==0?n.toExponential(2):n.toLocaleString('en-US',{maximumSignificantDigits:4});}
export function numerical(id:ProblemId,p:Params,n=12000):Vec {if(!Number.isFinite(n)||n<1)throw Error('Use a positive number of integration samples.');return REGISTRY[id].quadrature(p,Math.floor(n));}
/** One point on the limiting-case comparison plot. `actual` is a magnitude, so every
 * reference must be a magnitude too — otherwise a negative charge mirrors the reference
 * curve below the axis and the percentage readout disappears. Densities are derived from
 * the student's own geometry: a 2 nC rod 4 m long carries λ = 0.5 nC/m, not 2 nC/m, and a
 * 2 nC disk of radius 2 m carries σ = Q/(πR²), not 2 nC/m². Only the infinite-line and
 * sheet problems expose a density on their charge slider directly. */
export function sampleLimit(problem:Problem,p:Params,limit:Limit,t:number){
 const copy={...p},geom=problem.geometry,scalar=problem.quantity==='V',q=Math.abs(REGISTRY[geom].total?.(p)??p.charge*1e-9),R=p.size/2,rod=geom==='bisector'||geom==='axial'||geom==='endpoint'||geom==='ramp';
 let actual=0,target=0,label='';
 switch(limit.mode){
  case 'far':copy.distance=t*p.size;if(scalar){actual=Math.abs(potential(geom,copy));target=K*q/copy.distance;}else{actual=magnitude(field(geom,copy));target=K*q/copy.distance**2;}label=`distance / ${rod?'L':'2R'} = ${t.toFixed(1)}`;break;
  // The transverse far field is a first moment: −kQ y_c/r³ with y_c the centre of charge. Only the ramp uses it, and its y_c is 2L/3.
  case 'moment':copy.distance=t*p.size;actual=Math.abs(field(geom,copy).y);target=K*q*(2*p.size/3)/copy.distance**3;label=`distance / L = ${t.toFixed(1)} · vertical component only`;break;
  case 'infinite':if(scalar&&geom==='disk'){const sigma=p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=Math.abs(potential('disk',copy));target=Math.abs(sigma)*1e-9*(copy.size/2)/(2*EPS0);label=`R / z = ${t.toFixed(1)} · σ fixed · V ~ σR/2ε₀`;}else if(scalar){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=Math.abs(potential('bisector',copy));target=2*K*Math.abs(lambda)*1e-9*Math.log(Math.max(copy.size/p.distance,1));label=`L / r = ${t.toFixed(1)} · λ fixed · V ~ 2kλ ln(L/r)`;}else if(geom==='bisector'||geom==='infinite'){const lambda=geom==='infinite'?p.charge:p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=magnitude(field('bisector',copy));target=2*K*Math.abs(lambda)*1e-9/p.distance;label=`L / r = ${t.toFixed(1)} · λ fixed`;}else if(geom==='endpoint'){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=magnitude(field('endpoint',copy));target=Math.SQRT2*K*Math.abs(lambda)*1e-9/p.distance;label=`L / r = ${t.toFixed(1)} · λ fixed`;}else{const sigma=geom==='sheet'?p.charge:p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=magnitude(field('disk',copy));target=Math.abs(sigma)*1e-9/(2*EPS0);label=`R / z = ${t.toFixed(1)} · σ fixed`;}break;
  case 'center':copy.distance=R*(1-t/30);if(scalar){actual=Math.abs(potential(geom,copy));target=geom==='disk'?2*K*q/R:K*q/R;}else{actual=magnitude(field('ring',copy));target=0;}label=`z / R = ${(copy.distance/R).toFixed(2)}`;break;
  case 'near':copy.distance=p.size/t;actual=Math.abs(potential('axial',copy));target=K*Math.abs(p.charge/p.size)*1e-9*Math.log(Math.max(p.size/copy.distance,1));label=`a / L = ${(copy.distance/p.size).toFixed(3)} · V ~ kλ ln(L/a)`;break;
  case 'maximum':copy.distance=R*t/10;actual=magnitude(field('ring',copy));target=K*q/(R*R)*2/(3*Math.sqrt(3));label=`z / R = ${(t/10).toFixed(2)} · peak = 1/√2`;break;
  case 'full':copy.phi=2*Math.PI*t/30;if(scalar){actual=Math.abs(potential('arc',copy));target=K*q/R;}else{actual=magnitude(field('arc',copy));target=0;}label=`φ / π = ${(copy.phi/Math.PI).toFixed(2)}`;break;
  case 'half':copy.phi=Math.PI;if(scalar){actual=Math.abs(potential('arc',copy));target=K*q/R;}else{actual=magnitude(field('arc',copy));target=2*K*q/(Math.PI*R*R);}label='φ = π · the semicircle';break;
  case 'scale':copy.distance=t;actual=magnitude(field(geom,copy));target=geom==='sheet'?q/(2*EPS0):Math.SQRT2*K*q/t;label=`${geom==='sheet'?'z':'r'} = ${t.toFixed(1)} m`;break;
 }return{actual,target,label};
}
