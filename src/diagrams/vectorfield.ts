import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
import {planeField,type Plane} from './fieldlines';
/** A grid of field arrows, the other way of showing a field fills space.
 *
 * Lines show where the field goes; arrows show how hard it pushes at a place you pick. Both
 * are worth having, and a student who has only ever seen one tends to think the field is
 * only defined along the curves. */
export type Arrow={at:Plane;dir:Plane;magnitude:number;weight:number};
export type GridArea={x0:number;y0:number;x1:number;y1:number};
/** The window every layer of the figure is drawn inside, in the SVG's viewBox units -- the same
 * rounded rectangle the SVG clips its own drawing to. The field layers under it are cut to it
 * too, or their lines run on over the caption and the rule under the picture and out to the
 * edges of the card. */
export const PLOT={x:42,y:54,width:626,height:317,radius:10} as const;
/** The rectangle of the charge's plane that the picture actually shows, in world metres:
 * the window's four corners carried back through the figure's own projection.
 *
 * The lattice of arrows used to be laid over a square of the field's reach, whatever the camera
 * showed -- so wherever the picture was wider than that square, the arrows simply stopped, a
 * third of the way across the infinite line's figure, and left the rest of it bare. `plane` says
 * which plane the flat drawing is a cut through: z = 0 for the planar lessons, y = 0 for the side
 * view of a ring, a disk or a sheet, where the second coordinate returned is z. Null when the
 * plane is seen edge-on and has no area on screen. */
export function visibleArea(project:(v:Vec)=>{x:number;y:number},plane:'xy'|'xz'='xy',rect:{x:number;y:number;width:number;height:number}=PLOT):GridArea|null{
 const lift=(a:number,b:number):Vec=>plane==='xz'?{x:a,y:0,z:b}:{x:a,y:b,z:0};
 const o=project(lift(0,0)),u=project(lift(1,0)),v=project(lift(0,1));
 const ax=u.x-o.x,ay=u.y-o.y,bx=v.x-o.x,by=v.y-o.y,det=ax*by-bx*ay;
 if(!Number.isFinite(det)||Math.abs(det)<1e-9)return null;
 const corners=[[rect.x,rect.y],[rect.x+rect.width,rect.y],[rect.x,rect.y+rect.height],[rect.x+rect.width,rect.y+rect.height]];
 const world=corners.map(([sx,sy])=>{const dx=sx-o.x,dy=sy-o.y;return [(dx*by-bx*dy)/det,(ax*dy-ay*dx)/det];});
 const as=world.map(w=>w[0]),bs=world.map(w=>w[1]);
 return {x0:Math.min(...as),y0:Math.min(...bs),x1:Math.max(...as),y1:Math.max(...bs)};
}
/** A lattice over an area, its points on whole multiples of the spacing (or, with `offset` ½,
 * halfway between them) so that the arrows stand still while the window around them moves --
 * a zoom adds arrows at the edges rather than sliding the ones already there. A window much
 * larger than the field's reach would ask for thousands of arrows, so past `most` the spacing
 * opens up instead. */
export function latticeArea(area:GridArea,spacing:number,offset=0,most=600):{area:GridArea;spacing:number}{
 let s=spacing;
 const first=(v:number)=>(Math.ceil(v/s-offset-1e-9)+offset)*s,last=(v:number)=>(Math.floor(v/s-offset+1e-9)+offset)*s;
 const count=()=>(Math.round((last(area.x1)-first(area.x0))/s)+1)*(Math.round((last(area.y1)-first(area.y0))/s)+1);
 for(let guard=0;guard<40&&count()>most;guard++)s*=1.25;
 return {area:{x0:first(area.x0),y0:first(area.y0),x1:last(area.x1),y1:last(area.y1)},spacing:s};
}
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
export function bodyDistance(samples:readonly ChargeSample[],layout:'wire'|'surface'|'shell'='wire'):(x:number,y:number,z:number)=>number{
 if(!samples.length)return ()=>Infinity;
 // The spherical shell: its rings' crossings all lie on the sphere, so the body is the sphere through them.
 if(layout==='shell'){const R=Math.max(...samples.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)));return (x,y,z)=>Math.abs(Math.hypot(x,y,z)-R);}
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
/** The point of the charge ITSELF nearest a given point: the foot of the perpendicular onto the
 * same body `bodyDistance` measures to -- a wire's padded polyline, a surface's padded annulus in
 * z = 0. Null when there is no charge to be near.
 *
 * It is what a field line is finished with. A traced line has to stop about one element spacing
 * short of the charge, because closer in the summed field is the field of the nearest lump rather
 * than of the rod (see `localRadii`) -- and so every line used to begin in empty space, eleven to
 * twenty-nine pixels beside the rod it comes from. Field lines begin on positive charge and end on
 * negative charge. Within that last spacing the continuous body's field is radial to it, so the
 * straight join to this point is the line, to about a degree. */
export function bodyFoot(samples:readonly ChargeSample[],layout:'wire'|'surface'|'shell'='wire'):(x:number,y:number,z:number)=>Vec|null{
 if(!samples.length)return ()=>null;
 // The spherical shell: straight in or out along the radius, onto the sphere.
 if(layout==='shell'){const R=Math.max(...samples.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)));return (x,y,z)=>{const r=Math.hypot(x,y,z);return r>1e-12?{x:x*R/r,y:y*R/r,z:z*R/r}:{x:0,y:0,z:R};};}
 if(layout==='surface'){
  const radii=samples.map(s=>Math.abs(s.coordinate));
  const lo=Math.min(...radii),hi=Math.max(...radii);
  const pad=radii.length>1?(hi-lo)/(2*(radii.length-1)):0;
  const inner=Math.max(0,lo-pad),outer=hi+pad;
  return (x,y)=>{
   const rho=Math.hypot(x,y),s=Math.min(outer,Math.max(inner,rho));
   return rho>1e-12?{x:x*s/rho,y:y*s/rho,z:0}:{x:s,y:0,z:0};
  };
 }
 const pts=samples.map(s=>[s.position.x,s.position.y,s.position.z] as [number,number,number]);
 if(pts.length===1)return ()=>({x:pts[0][0],y:pts[0][1],z:pts[0][2]});
 const half=(a:number[],b:number[]):[number,number,number]=>[a[0]+(a[0]-b[0])/2,a[1]+(a[1]-b[1])/2,a[2]+(a[2]-b[2])/2];
 pts.unshift(half(pts[0],pts[1]));
 pts.push(half(pts[pts.length-1],pts[pts.length-2]));
 return (x,y,z)=>{
  let best=Infinity,foot:Vec={x:pts[0][0],y:pts[0][1],z:pts[0][2]};
  for(let i=0;i+1<pts.length;i++){
   const a=pts[i],b=pts[i+1];
   const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=dx*dx+dy*dy+dz*dz;
   const t=len>0?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/len)):0;
   const fx=a[0]+t*dx,fy=a[1]+t*dy,fz=a[2]+t*dz,d=Math.hypot(x-fx,y-fy,z-fz);
   if(d<best){best=d;foot={x:fx,y:fy,z:fz};}
  }
  return foot;
 };
}
/** HOW CLOSE TO EACH ELEMENT ITS FIELD IS A LUMP'S: four fifths of the larger gap to its neighbours.
 *
 * The fixed guard of `TOO_CLOSE` is right where the pieces are centimetres apart, and wrong where a
 * partition cut for integrating has made them metres apart: beside the semi-infinite line's far stretch
 * at a small height, an arrow half a metre from the line -- well past the guard -- showed the field of
 * the nearest lump, up to sixty degrees off the line's own. Within about a gap of a row of charges the
 * field ripples with the row; at four fifths of one the drawn direction is within ten degrees. */
export function lumpRadii(samples:readonly ChargeSample[]):number[]{
 return samples.map((s,i)=>{
  let gap=0;
  for(const j of [i-1,i+1]){const o=samples[j];if(o)gap=Math.max(gap,Math.hypot(s.position.x-o.position.x,s.position.y-o.position.y,s.position.z-o.position.z));}
  return .8*gap;
 });
}
/** Whether a point is within the lump radius of the element NEAREST it: the far, metre-long pieces have
 * radii of metres, and only matter to the points that are nearest them. */
const lumpy=(samples:readonly ChargeSample[],radii:readonly number[],x:number,y:number,z:number)=>{
 let best=Infinity,k=-1;
 samples.forEach((s,i)=>{const d=Math.hypot(x-s.position.x,y-s.position.y,z-s.position.z);if(d<best){best=d;k=i;}});
 return k>=0&&best<radii[k];
};
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
 const clear=bodyDistance(samples,'wire'),lumps=lumpRadii(samples);
 const raw:{at:Plane;dir:Plane;magnitude:number}[]=[];
 for(let x=area.x0;x<=area.x1+1e-9;x+=spacing)for(let y=area.y0;y<=area.y1+1e-9;y+=spacing){
  const at={x,y};
  if(clear(x,y,0)<TOO_CLOSE||lumpy(samples,lumps,x,y,0))continue;
  const e=planeField(samples,at),magnitude=Math.hypot(e.x,e.y);
  if(!Number.isFinite(magnitude)||magnitude<=0)continue;
  raw.push({at,dir:{x:e.x/magnitude,y:e.y/magnitude},magnitude});
 }
 const kept=withoutNulls(raw);
 if(!kept.length)return [];
 const weights=logWeights(kept.map(a=>a.magnitude));
 return kept.map((a,i)=>({...a,weight:weights[i]}));
}
/** HOW SMALL A FIELD IS NO FIELD AT ALL, as a share of the strongest in the lattice: round-off, not a field.
 * The strongest and weakest arrows any figure really draws are a few thousand to one apart at most. */
export const NUMERICAL_ZERO=1e-6;
/** The lattice points whose field is more than round-off. At a null -- the centre of a full ring, where the field
 * is zero by symmetry -- a sum of pieces leaves a remainder of floating-point dust, and an arrow was drawn there
 * pointing wherever the dust sent it, in the one setting whose answer is E = 0. The direction of nothing is not a
 * direction, so no arrow is drawn: a point with no arrow is what a field of zero looks like. */
export function withoutNulls<T extends {magnitude:number}>(raw:readonly T[]):T[]{
 const top=raw.reduce((m,a)=>Math.max(m,a.magnitude),0);
 return raw.filter(a=>a.magnitude>NUMERICAL_ZERO*top);
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
