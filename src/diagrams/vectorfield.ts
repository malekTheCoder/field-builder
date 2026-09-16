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
/** How far a point is from the charge ITSELF, rather than from the points it was cut into.
 *
 * Measuring to the samples is the same thing only when they are dense. At three elements a rod's
 * samples sit L/3 apart, so a lattice point can land exactly ON the rod, be more than the guard
 * distance from every sample, and be drawn — an arrow lying along the charge, at full weight,
 * showing the field of whichever lump it happened to land nearest. There is no field there to
 * draw. A rod is the segments joining its samples, extended half a step past each end because a
 * midpoint partition sets its first and last samples half a piece inside the body; a disk or a
 * sheet is the annulus its radii span, likewise padded. */
export function bodyDistance(samples:readonly ChargeSample[],layout:'wire'|'surface'='wire'):(x:number,y:number,z:number)=>number{
 if(!samples.length)return ()=>Infinity;
 if(layout==='surface'){
  const radii=samples.map(s=>Math.abs(s.coordinate));
  const lo=Math.min(...radii),hi=Math.max(...radii);
  const pad=radii.length>1?(hi-lo)/(2*(radii.length-1)):0;
  const inner=Math.max(0,lo-pad),outer=hi+pad;
  return (x,y,z)=>{const rho=Math.hypot(x,y);return Math.hypot(rho>outer?rho-outer:rho<inner?inner-rho:0,z);};
 }
 const pts=samples.map(s=>[s.position.x,s.position.y,s.position.z] as [number,number,number]);
 if(pts.length>1){
  const half=(a:number[],b:number[]):[number,number,number]=>[a[0]+(a[0]-b[0])/2,a[1]+(a[1]-b[1])/2,a[2]+(a[2]-b[2])/2];
  pts.unshift(half(pts[0],pts[1]));
  pts.push(half(pts[pts.length-1],pts[pts.length-2]));
 }
 return (x,y,z)=>{
  let best=Infinity;
  for(let i=0;i+1<pts.length;i++){
   const a=pts[i],b=pts[i+1];
   const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=dx*dx+dy*dy+dz*dz;
   const t=len>0?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/len)):0;
   const d=Math.hypot(x-(a[0]+t*dx),y-(a[1]+t*dy),z-(a[2]+t*dz));
   if(d<best)best=d;
  }
  return pts.length===1?Math.hypot(x-pts[0][0],y-pts[0][1],z-pts[0][2]):best;
 };
}
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
 const clear=bodyDistance(samples,'wire');
 const raw:{at:Plane;dir:Plane;magnitude:number}[]=[];
 for(let x=area.x0;x<=area.x1+1e-9;x+=spacing)for(let y=area.y0;y<=area.y1+1e-9;y+=spacing){
  const at={x,y};
  if(clear(x,y,0)<TOO_CLOSE)continue;
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
