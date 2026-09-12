import type {ChargeSample} from '../distributions/types';
import {planeField,type Plane} from './fieldlines';
/** A grid of field arrows, the other way of showing a field fills space.
 *
 * Lines show where the field goes; arrows show how hard it pushes at a place you pick. Both
 * are worth having, and a student who has only ever seen one tends to think the field is
 * only defined along the curves. */
export type Arrow={at:Plane;dir:Plane;magnitude:number;weight:number};
export type GridArea={x0:number;y0:number;x1:number;y1:number};
/** Where an arrow would sit on top of the charge, its value is dominated by which element
 * happens to be nearest rather than by physics, so it is dropped instead of drawn wrong. */
const TOO_CLOSE=.12;
/** Field samples on a lattice, with a weight for how strong each one is relative to the
 * rest of the picture.
 *
 * The magnitude across a figure spans several orders — near a rod it is enormous, a few
 * radii out it is almost nothing — so a linear scale draws one huge arrow and a field of
 * invisible stubs. The weight is logarithmic, which is the same reason a decibel exists,
 * and it is normalised against the strongest arrow actually on screen rather than an
 * absolute value, so the picture stays readable as the charge is changed. */
export function vectorGrid(samples:readonly ChargeSample[],area:GridArea,spacing:number):Arrow[]{
 if(!(spacing>0)||!samples.length)return [];
 const raw:{at:Plane;dir:Plane;magnitude:number}[]=[];
 for(let x=area.x0;x<=area.x1+1e-9;x+=spacing)for(let y=area.y0;y<=area.y1+1e-9;y+=spacing){
  const at={x,y};
  let near=false;
  for(const s of samples)if(Math.hypot(x-s.position.x,y-s.position.y,s.position.z)<TOO_CLOSE){near=true;break;}
  if(near)continue;
  const e=planeField(samples,at),magnitude=Math.hypot(e.x,e.y);
  if(!Number.isFinite(magnitude)||magnitude<=0)continue;
  raw.push({at,dir:{x:e.x/magnitude,y:e.y/magnitude},magnitude});
 }
 if(!raw.length)return [];
 const weights=logWeights(raw.map(a=>a.magnitude));
 return raw.map((a,i)=>({...a,weight:weights[i]}));
}
/** Relative weights for a set of magnitudes, on a log scale normalised to the set itself.
 *
 * A field that barely varies must not have its variation stretched across the whole range:
 * above a large sheet the field is very nearly constant, and normalising a fraction of a
 * percent up to full contrast would draw dramatic differences that are not there. Below a
 * ratio the eye would not notice anyway, everything is given full weight, which is the honest
 * picture of a uniform field. Shared by the flat lattice and the 3D one so the two cannot
 * disagree about what "strong" means. */
export function logWeights(magnitudes:readonly number[]):number[]{
 if(!magnitudes.length)return [];
 const logs=magnitudes.map(m=>Math.log(Math.max(m,1e-300)));
 const top=Math.max(...logs),bottom=Math.min(...logs),span=top-bottom;
 const UNIFORM=Math.log(1.05);
 return logs.map(l=>span<UNIFORM?1:(l-bottom)/span);
}
/** Arrow length in world units. Even the weakest arrow keeps a stub, because an arrow that
 * vanishes reads as "no field here", which is a different claim from "a weak field here". */
export function arrowLength(weight:number,spacing:number):number{
 const clamped=Math.max(0,Math.min(1,weight));
 return spacing*(.28+.52*clamped);
}
