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
/** Points already drawn, bucketed so "is anything within d of here" is a look at nine cells
 * rather than a scan of every point on every line. */
function drawnPoints(cell:number){
 const buckets=new Map<string,Plane[]>();
 const at=(x:number,y:number)=>`${Math.floor(x/cell)},${Math.floor(y/cell)}`;
 return {
  add(p:Plane){const k=at(p.x,p.y),b=buckets.get(k);if(b)b.push(p);else buckets.set(k,[p]);},
  within(p:Plane,d:number){
   const gx=Math.floor(p.x/cell),gy=Math.floor(p.y/cell),d2=d*d;
   for(let i=gx-1;i<=gx+1;i++)for(let j=gy-1;j<=gy+1;j++){
    const b=buckets.get(`${i},${j}`);
    if(b)for(const q of b){const dx=p.x-q.x,dy=p.y-q.y;if(dx*dx+dy*dy<d2)return true;}
   }
   return false;
  },
 };
}
export type TraceOptions={
 /** Arc length per step, in world metres. Smaller is smoother and slower. */
 step?:number;
 /** How close to an element counts as having arrived. Within about one element spacing the
  * summed field bends toward that particular element rather than the charge it stands for,
  * so stopping a spacing short keeps a line from wiggling at its root. */
 arrive?:number;
 maxSteps?:number;
 /** Stop once this far from the origin; the line has left the picture. */
 outerLimit?:number;
 /** +1 follows the field, −1 walks back against it. */
 sign?:number;
 /** Stop when the line comes this close to one already drawn. Jobard and Lefer's dtest rule,
  * and ONLY that rule: their seeding spaces streamlines evenly, which would destroy the one
  * thing our seeding buys — that line density means field strength, because every line
  * carries the same flux. So the threshold here is not a pleasing separation. It is about
  * one drawn line width, the distance below which two lines are the same stroke on screen
  * and the second carries no information the first did not. Culling redundancy, not density. */
 crowd?:number; drawn?:ReturnType<typeof drawnPoints>;
};
/** One streamline, stepped by RK4 on the unit field direction so the arc length per step is
 * honest and the curve does not drift wide on tight bends the way Euler does. */
export function traceLine(samples:readonly ChargeSample[],start:Plane,options:TraceOptions={}):Plane[]{
 const step=options.step??.06,maxSteps=options.maxSteps??900,outer=options.outerLimit??40,sign=options.sign??1,arrive=options.arrive??ARRIVED;
 const {crowd=0,drawn}=options;
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
  // Not in the first few steps: every line leaves the charge from nearly the same place, so
  // testing at the root would stop each one the moment it started.
  if(crowd>0&&drawn&&i>4&&drawn.within(here,crowd))break;
  let arrived=false;
  for(const s of samples)if(Math.hypot(here.x-s.position.x,here.y-s.position.y,s.position.z)<arrive){arrived=true;break;}
  if(arrived)break;
 }
 return path;
}
/** Where to start the lines, and the reason the picture means anything.
 *
 * The density of field lines is not decoration: it is proportional to field strength,
 * because it is lines per unit area and that is flux. Density only carries that meaning if
 * every line represents the same amount of flux, which means seeding in proportion to
 * CHARGE rather than evenly around a circle. Evenly spaced seeds draw a picture where
 * crowding says nothing at all.
 *
 * Seeds are therefore taken at equal steps of accumulated |dq| along the distribution and
 * launched perpendicular to it, on both sides. For a uniform rod that comes out evenly
 * spaced; for the ramp, whose density grows along its length, the lines visibly crowd
 * toward the heavy end, which is the lesson that rod exists to teach. */
export function chargeSeeds(samples:readonly ChargeSample[],count:number,offset:number):Plane[]{
 const weights=samples.map(s=>Math.abs(s.dq));
 const total=weights.reduce((a,b)=>a+b,0);
 if(!(total>0)||samples.length<2)return [];
 const wanted=Math.max(1,Math.round(count/2));
 const seeds:Plane[]=[];
 let index=0,carried=weights[0];
 for(let j=0;j<wanted;j++){
  const target=total*(j+.5)/wanted;
  while(carried<target&&index<weights.length-1){index+=1;carried+=weights[index];}
  const here=samples[index].position;
  // Local tangent from the neighbours, so the launch is perpendicular to the distribution
  // whatever shape it runs in. A rod, an arc and a bent rod all work without special cases.
  const before=samples[Math.max(0,index-1)].position,after=samples[Math.min(samples.length-1,index+1)].position;
  const tx=after.x-before.x,ty=after.y-before.y,tl=Math.hypot(tx,ty);
  const nx=tl>1e-12?-ty/tl:0,ny=tl>1e-12?tx/tl:1;
  seeds.push({x:here.x+nx*offset,y:here.y+ny*offset});
  seeds.push({x:here.x-nx*offset,y:here.y-ny*offset});
 }
 return seeds;
}
/** A circle enclosing everything. Kept as the fallback for layouts the tangent trick cannot
 * read, such as a single element with no neighbours to take a direction from. */
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
 const reach=Math.max(...samples.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)),.5);
 const gaps=samples.slice(1,50).map((s,i)=>Math.hypot(s.position.x-samples[i].position.x,s.position.y-samples[i].position.y)).sort((a,b)=>a-b);
 const arrive=Math.max(ARRIVED,.55*(gaps[Math.floor(gaps.length/2)]??0));
 const seeded=chargeSeeds(samples,count,Math.max(arrive*1.6,reach*.05));
 const starts=seeded.length?seeded:seedRing(samples,count);
 // About a drawn line width in world units. Both halves of one line are traced against the
 // grid as it stood BEFORE the line began, then added together: otherwise the second half
 // would stop against the first at the seed they share.
 const crowd=options.crowd??reach*.012;
 const drawn=drawnPoints(Math.max(crowd,1e-6));
 const lines:Plane[][]=[];
 for(const seed of starts){
  const along=traceLine(samples,seed,{...options,arrive,crowd,drawn,sign:1});
  const against=traceLine(samples,seed,{...options,arrive,crowd,drawn,sign:-1});
  const line=[...against.slice(1).reverse(),...along];
  if(line.length>3){lines.push(line);for(const q of line)drawn.add(q);}
 }
 return lines;
}
