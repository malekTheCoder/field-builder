import {K} from '../distributions/constants';
import type {ChargeSample} from '../distributions/types';
/** Field lines for the plane the planar lessons live in.
 *
 * Every figure so far has drawn one net arrow and a handful of contributions, and asked a
 * student to imagine the rest. A field fills space, and the shape it takes around a rod --
 * bowing out near the middle, wrapping round the ends -- is the thing the integral is
 * actually about. This traces it from the same discretised charge the rest of the app sums,
 * so what is drawn and what is computed cannot disagree. */
export type Plane={x:number;y:number};
/** Closer than this to a charge element the sum is dominated by discretisation rather than
 * physics, so a line is treated as having arrived. Expressed in world metres. */
const ARRIVED=.055;
/** E in the z = 0 plane. Summed over the elements directly; no closed form is consulted. */
export function planeField(samples:readonly ChargeSample[],at:Plane):Plane{
 let ex=0,ey=0;
 for(const s of samples){
  const dx=at.x-s.position.x,dy=at.y-s.position.y,dz=s.position.z;
  const r2=dx*dx+dy*dy+dz*dz;
  if(r2<1e-12)continue;
  const inv=K*s.dq/(r2*Math.sqrt(r2));
  ex+=inv*dx;ey+=inv*dy;
 }
 return {x:ex,y:ey};
}
const LEN=(v:Plane)=>Math.hypot(v.x,v.y);
/** Unit vector along E, or null where the field vanishes and a line has no way to continue. */
function heading(samples:readonly ChargeSample[],at:Plane,sign:number):Plane|null{
 const e=planeField(samples,at),len=LEN(e);
 if(!Number.isFinite(len)||len<1e-30)return null;
 return {x:sign*e.x/len,y:sign*e.y/len};
}
export type TraceOptions={
 /** Arc length per step, in world metres. Smaller is smoother and slower. */
 step?:number;
 maxSteps?:number;
 /** Stop once this far from the origin; the line has left the picture. */
 outerLimit?:number;
 /** +1 follows the field, −1 walks back against it. */
 sign?:number;
};
/** One streamline, stepped by RK4 on the unit field direction so the arc length per step is
 * honest and the curve does not drift wide on tight bends the way Euler does. */
export function traceLine(samples:readonly ChargeSample[],start:Plane,options:TraceOptions={}):Plane[]{
 const step=options.step??.06,maxSteps=options.maxSteps??900,outer=options.outerLimit??40,sign=options.sign??1;
 const path:Plane[]=[{x:start.x,y:start.y}];
 let here={x:start.x,y:start.y};
 for(let i=0;i<maxSteps;i++){
  const k1=heading(samples,here,sign);if(!k1)break;
  const k2=heading(samples,{x:here.x+k1.x*step/2,y:here.y+k1.y*step/2},sign);if(!k2)break;
  const k3=heading(samples,{x:here.x+k2.x*step/2,y:here.y+k2.y*step/2},sign);if(!k3)break;
  const k4=heading(samples,{x:here.x+k3.x*step,y:here.y+k3.y*step},sign);if(!k4)break;
  const next={x:here.x+step*(k1.x+2*k2.x+2*k3.x+k4.x)/6,y:here.y+step*(k1.y+2*k2.y+2*k3.y+k4.y)/6};
  if(!Number.isFinite(next.x)||!Number.isFinite(next.y))break;
  path.push(next);here=next;
  if(LEN(here)>outer)break;
  let arrived=false;
  for(const s of samples)if(Math.hypot(here.x-s.position.x,here.y-s.position.y,s.position.z)<ARRIVED){arrived=true;break;}
  if(arrived)break;
 }
 return path;
}
/** Where to start the lines.
 *
 * Seeding on the charge itself is fiddly for a shape that is a line rather than a surface,
 * so seeds sit on a circle enclosing the whole distribution and each one is traced BOTH
 * ways: outwards to where the line escapes, inwards to where it meets the charge. Joined,
 * that is the whole streamline through that point, and it works for any planar layout
 * without the seeding knowing what shape it is looking at. */
export function seedRing(samples:readonly ChargeSample[],count:number):Plane[]{
 let reach=0;
 for(const s of samples)reach=Math.max(reach,Math.hypot(s.position.x,s.position.y,s.position.z));
 const radius=Math.max(.6,reach*1.35);
 const n=Math.max(1,Math.round(count));
 return Array.from({length:n},(_,i)=>{
  // Offset by half a step so a seed never lands exactly on an axis, where a symmetric
  // layout can put it on a line of zero transverse field and stall the trace.
  const angle=2*Math.PI*(i+.5)/n;
  return {x:radius*Math.cos(angle),y:radius*Math.sin(angle)};
 });
}
/** Full streamlines through a ring of seeds: inward half reversed and joined to the outward
 * half, so each is one continuous curve running from the charge out of the picture. */
export function fieldLines(samples:readonly ChargeSample[],count:number,options:TraceOptions={}):Plane[][]{
 // Each line is ordered ALONG the field, whichever way that runs: out of a positive
 // distribution, into a negative one. An arrowhead can then simply follow the polyline
 // instead of needing to know the sign of the charge.
 return seedRing(samples,count).map(seed=>{
  const along=traceLine(samples,seed,{...options,sign:1});
  const against=traceLine(samples,seed,{...options,sign:-1});
  return [...against.slice(1).reverse(),...along];
 }).filter(line=>line.length>3);
}
