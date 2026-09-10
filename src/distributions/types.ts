import type {Params} from '../problems/types';
import {K,type Vec} from './constants';
export type ChargeSample={position:Vec;dq:number;field:Vec;coordinate:number};
/** Everything the pure layer knows about one charge distribution. `field` is the closed form;
 * `quadrature` is the app's own point-charge sum (n already validated, ≥ 1); `sample` is the
 * midpoint partition the diagram draws and sums (n already clamped to 1…10000). `substitutions`
 * are the total-charge ↔ density identities the grader accepts, e.g. Q = λL. `total` is the
 * charge in coulombs when the slider is a density on a finite object; absent, the slider is Q. */
export type Distribution={id:string;field(p:Params):Vec;quadrature(p:Params,n:number):Vec;sample(p:Params,n:number):ChargeSample[];substitutions?:Record<string,string>;total?(p:Params):number};
/** Accumulates k·dq·r̂/r² over source-to-P displacements. */
export function coulombSum(run:(add:(dq:number,x:number,y:number,z:number)=>void)=>void):Vec{const sum:Vec={x:0,y:0,z:0};run((dq,x,y,z)=>{const r3=Math.hypot(x,y,z)**3;sum.x+=K*dq*x/r3;sum.y+=K*dq*y/r3;sum.z+=K*dq*z/r3;});return sum;}
/** One point-charge sample and its field at the observation point. */
export function pointSample(position:Vec,observation:Vec,dq:number,coordinate:number):ChargeSample{
 const delta={x:observation.x-position.x,y:observation.y-position.y,z:observation.z-position.z};
 const coefficient=K*dq/Math.hypot(delta.x,delta.y,delta.z)**3;
 return{position,dq,coordinate,field:{x:coefficient*delta.x,y:coefficient*delta.y,z:coefficient*delta.z}};
}
/** Midpoint fractions (i + ½)/n. */
export const midpoints=(n:number)=>Array.from({length:n},(_,i)=>(i+.5)/n);
