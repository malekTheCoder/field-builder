import type {Limit,Params,Problem,ProblemId} from '../problems/types';
import {REGISTRY} from '../distributions';
export {EPS0,K,type Vec} from '../distributions/constants';
import {K,EPS0,type Vec} from '../distributions/constants';
// Finite distributions use total Q in nC; infinite lines use λ in nC/m;
// semi-infinite lines use λ in nC/m; an infinite sheet uses σ in nC/m². Distance and geometry are in meters.
// The per-geometry closed forms and point-charge sums live in src/distributions/.
export function field(id:ProblemId,p:Params):Vec {return REGISTRY[id].field(p);}
export function magnitude(v:Vec){return Math.hypot(v.x,v.y,v.z);}
export function pretty(n:number){if(!Number.isFinite(n))return '—';return Math.abs(n)<.001&&n!==0?n.toExponential(2):n.toLocaleString('en-US',{maximumSignificantDigits:4});}
export function numerical(id:ProblemId,p:Params,n=12000):Vec {if(!Number.isFinite(n)||n<1)throw Error('Use a positive number of integration samples.');return REGISTRY[id].quadrature(p,Math.floor(n));}
/** One point on the limiting-case comparison plot. `actual` is a magnitude, so every
 * reference must be a magnitude too — otherwise a negative charge mirrors the reference
 * curve below the axis and the percentage readout disappears. Densities are derived from
 * the student's own geometry: a 2 nC rod 4 m long carries λ = 0.5 nC/m, not 2 nC/m, and a
 * 2 nC disk of radius 2 m carries σ = Q/(πR²), not 2 nC/m². Only the infinite-line and
 * sheet problems expose a density on their charge slider directly. */
export function sampleLimit(problem:Problem,p:Params,limit:Limit,t:number){const copy={...p},q=Math.abs(p.charge)*1e-9,R=p.size/2;let actual=0,target=0,label='';switch(limit.mode){case 'far':copy.distance=t*p.size;actual=magnitude(field(problem.id,copy));target=K*q/copy.distance**2;label=`distance / ${problem.id==='bisector'||problem.id==='axial'||problem.id==='endpoint'?'L':'2R'} = ${t.toFixed(1)}`;break;case 'infinite':if(problem.id==='bisector'||problem.id==='infinite'){const lambda=problem.id==='infinite'?p.charge:p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=magnitude(field('bisector',copy));target=2*K*Math.abs(lambda)*1e-9/p.distance;label=`L / r = ${t.toFixed(1)} · λ fixed`;}else if(problem.id==='endpoint'){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=magnitude(field('endpoint',copy));target=Math.SQRT2*K*Math.abs(lambda)*1e-9/p.distance;label=`L / r = ${t.toFixed(1)} · λ fixed`;}else{const sigma=problem.id==='sheet'?p.charge:p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=magnitude(field('disk',copy));target=Math.abs(sigma)*1e-9/(2*EPS0);label=`R / z = ${t.toFixed(1)} · σ fixed`;}break;case 'center':copy.distance=R*(1-t/30);actual=magnitude(field('ring',copy));target=0;label=`z / R = ${(copy.distance/R).toFixed(2)}`;break;case 'maximum':copy.distance=R*t/10;actual=magnitude(field('ring',copy));target=K*q/(R*R)*2/(3*Math.sqrt(3));label=`z / R = ${(t/10).toFixed(2)} · peak = 1/√2`;break;case 'full':copy.phi=2*Math.PI*t/30;actual=magnitude(field('arc',copy));target=0;label=`φ / π = ${(copy.phi/Math.PI).toFixed(2)}`;break;case 'half':copy.phi=Math.PI;actual=magnitude(field('arc',copy));target=2*K*q/(Math.PI*R*R);label='φ = π · the semicircle';break;case 'scale':copy.distance=t;actual=magnitude(field(problem.id,copy));target=problem.id==='sheet'?q/(2*EPS0):Math.SQRT2*K*q/t;label=`${problem.id==='sheet'?'z':'r'} = ${t.toFixed(1)} m`;break;}return{actual,target,label};}
