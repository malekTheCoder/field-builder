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
 /** Per-element stopping radii, when the caller has already worked them out. */
 radii?:readonly number[];
 maxSteps?:number;
 /** Stop once this far from the origin; the line has left the picture. */
 outerLimit?:number;
 /** How far out a line may START, as opposed to how far it may run. The two differ on the
  * three unbounded lessons, whose charge reaches hundreds of metres: a line may usefully run
  * a little past the frame, but one that BEGINS out there is drawn entirely off the picture. */
 seedLimit?:number;
 /** Which of the charge lines may start FROM, as a distance from O, where that is not `seedLimit`:
  * the part of an endless line the window shows (see `seedPool`). `seedLimit` still sets the
  * picture's scale -- the launch offset and the crowding radius -- which the pool must not move. */
 seedPool?:number;
 /** Stop once outside this rectangle: the window the figure shows, with a margin. A line that has
  * left the picture has nothing more to draw, and the circle `outerLimit` sets is the wrong shape for
  * a window twice as wide as it is tall -- lines heading for its near side ran on, unseen, for as far
  * again as the picture is wide. */
 bounds?:PlaneRect;
 /** +1 follows the field, −1 walks back against it. */
 sign?:number;
 /** Stop when the line comes this close to one already drawn. Jobard and Lefer's dtest rule,
  * and ONLY that rule: their seeding spaces streamlines evenly, which would destroy the one
  * thing our seeding buys — that line density means field strength, because every line
  * carries the same flux. So the threshold here is not a pleasing separation. It is about
  * one drawn line width, the distance below which two lines are the same stroke on screen
  * and the second carries no information the first did not. Culling redundancy, not density. */
 crowd?:number; drawn?:ReturnType<typeof drawnPoints>;
 /** Finish every line on the charge it comes from: where a half of a line stopped because it had
  * ARRIVED at the charge, the line is carried on, straight, to this point of the body (see
  * `bodyFoot`). Only the drawing asks for it. The tracer stops an element spacing short for a
  * reason that still holds -- the summed field there is a lump's -- so the traced polyline is left
  * exactly as the field gives it, and the join is added after, by the one function that knows
  * which ends arrived. */
 root?:(x:number,y:number,z:number)=>{x:number;y:number;z:number}|null;
 /** WHERE A HALF ARRIVED, ITS LAST STRETCH TRACED AGAIN, FINER, before it is joined to the body: on
  * `samples` -- the partition before it was coarsened -- at `step`, until it is within one and a half of
  * their spacing of them. The coarse tracer stops a step and an element's spacing short, about a quarter
  * of a metre off a rod, and the straight join square to the rod across that stretch was cornered by
  * fourteen degrees where lines turn round a rod's ends and twenty at the ramp's light end, where the
  * field leans well off square to the charge; traced on in, the join is a few centimetres long and is
  * the line to well under a degree. */
 finish?:{samples:readonly ChargeSample[];step:number};
};
/** A rectangle of the plane, in world metres: the window the figure shows, or one a trace was made for. */
export type PlaneRect={x0:number;y0:number;x1:number;y1:number};
/** HOW FAR A LINE IS TRACED: past the farthest corner of the window the figure shows.
 *
 * It was a circle of 1.6 times the field's reach about O, and a circle is the wrong shape for a
 * window that is twice as wide as it is tall and does not have O in its middle. Lines that left
 * the charge toward the far side of the picture ended in mid-air on that circle, short of the
 * frame -- on the infinite line, a ragged column of line ends 180 pixels before the edge -- and on
 * the semi-infinite line the lines that should have come in from the edge began in empty space.
 *
 * So the limit is the distance from O to the window's farthest corner, plus a tenth, and the clip
 * on the canvas trims whatever runs past the edge. It is rounded UP to a power of 1.25, so a window
 * that grows a little does not change it. `area` is the window in world metres (`visibleArea`);
 * null, for a plane seen edge on, falls back to `fallback`. A caller that knows the window passes
 * it as `bounds` too, so a line also stops once it is past the NEAR edges, which the circle alone
 * would let it run on beyond, unseen, for as far again as the picture is wide. */
export function traceLimit(area:PlaneRect|null,fallback:number,margin=1.1):number{
 const far=area?Math.max(Math.hypot(area.x0,area.y0),Math.hypot(area.x1,area.y0),Math.hypot(area.x0,area.y1),Math.hypot(area.x1,area.y1)):fallback;
 const want=Math.max(1e-3,far*margin);
 return 1.25**Math.ceil(Math.log(want)/Math.log(1.25)-1e-9);
}
/** The window a trace is made for: what the figure shows, with room all round -- a seventh of its
 * longer side -- so every line runs on past the edge, where the clip trims it, and a view that moves
 * a little is still inside what was traced. */
export function traceWindow(area:PlaneRect,room=1/7):PlaneRect{
 const pad=room*Math.max(area.x1-area.x0,area.y1-area.y0);
 return {x0:area.x0-pad,y0:area.y0-pad,x1:area.x1+pad,y1:area.y1+pad};
}
/** Whether a trace made for the window `traced` still reaches past every edge of what the figure
 * shows, by at least a twentieth of its longer side. Zooming in always passes; only a window that has really
 * grown, or moved, needs the lines traced again. */
export function covers(traced:PlaneRect|null,area:PlaneRect|null):boolean{
 if(!traced||!area)return traced===area;
 const pad=.05*Math.max(area.x1-area.x0,area.y1-area.y0);
 return area.x0-pad>=traced.x0&&area.y0-pad>=traced.y0&&area.x1+pad<=traced.x1&&area.y1+pad<=traced.y1;
}
/** How close a line may come to each element: about half that element's own spacing, so a
 * finely cut stretch of charge may be approached closely and a coarse one may not. */
export function localRadii(samples:readonly ChargeSample[],floor=ARRIVED):number[]{
 return samples.map((s,i)=>{
  let nearest=Infinity;
  for(const j of [i-1,i+1]){
   const o=samples[j];
   if(!o)continue;
   nearest=Math.min(nearest,Math.hypot(s.position.x-o.position.x,s.position.y-o.position.y,s.position.z-o.position.z));
  }
  return Math.max(floor,.55*(Number.isFinite(nearest)?nearest:0));
 });
}
/** THE PARTITION WITH ITS END PIECES CUT FINER: each of the `pieces` outermost samples at both ends of an open
 * wire split into `into` equal parts along the stretch it stands for, each with its share of the charge. The
 * field turns fastest round a rod's tip -- just off it, a line at angle phi from the rod's axis is heading at
 * phi / 2 -- and a line finished on a partition a few centimetres apart came into the tip across the last
 * gap on a curve fifteen to twenty degrees off it. Cut finer only there, the finish runs on in to within a
 * centimetre or so. A closed wire, which has no ends, is returned as it is. */
export function refineEnds(samples:readonly ChargeSample[],into=12,pieces=3):ChargeSample[]{
 const n=samples.length;
 if(n<2*pieces+2||into<2)return [...samples];
 const at=(i:number)=>samples[i].position,gap=(i:number,j:number)=>Math.hypot(at(i).x-at(j).x,at(i).y-at(j).y,at(i).z-at(j).z);
 const gaps=Array.from({length:n-1},(_,i)=>gap(i,i+1)).sort((a,b)=>a-b),typical=gaps[Math.floor(gaps.length/2)];
 if(!(gap(0,n-1)>2.5*typical))return [...samples];
 const mid=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2});
 // The stretch sample i stands for: halfway to each neighbour, the end ones mirrored past the end.
 const lo=(i:number)=>i>0?mid(at(i-1),at(i)):{x:2*at(0).x-mid(at(0),at(1)).x,y:2*at(0).y-mid(at(0),at(1)).y,z:2*at(0).z-mid(at(0),at(1)).z};
 const hi=(i:number)=>i<n-1?mid(at(i),at(i+1)):{x:2*at(n-1).x-mid(at(n-2),at(n-1)).x,y:2*at(n-1).y-mid(at(n-2),at(n-1)).y,z:2*at(n-1).z-mid(at(n-2),at(n-1)).z};
 const out:ChargeSample[]=[];
 samples.forEach((s,i)=>{
  if(i>=pieces&&i<n-pieces){out.push(s);return;}
  const a=lo(i),b=hi(i);
  for(let j=0;j<into;j++){
   const t=(j+.5)/into;
   out.push({...s,position:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},dq:s.dq/into});
  }
 });
 return out;
}
/** The most a field line may turn across one traced step: ten degrees, so no chord leans more than about five off
 * the field where it starts. See `trace`. */
export const TURN_MOST=10*Math.PI/180;
const TURN_COS=Math.cos(TURN_MOST);
/** The most the chords either side of a head may turn from its own: six degrees, so a head points within about three
 * of the field. See `lineHeads`. */
export const HEAD_TURN=6*Math.PI/180;
const HEAD_COS=Math.cos(HEAD_TURN);
/** One streamline, stepped by RK4 on the unit field direction so the arc length per step is
 * honest and the curve does not drift wide on tight bends the way Euler does. */
export function traceLine(samples:readonly ChargeSample[],start:Plane,options:TraceOptions={}):Plane[]{
 return trace(samples,start,options).path;
}
/** The same walk, saying also whether it ended by arriving at the charge -- as opposed to leaving
 * the picture, running into a line already drawn, or running out of steps. Only an arrival is
 * finished on the body. */
function trace(samples:readonly ChargeSample[],start:Plane,options:TraceOptions):{path:Plane[];arrived:boolean}{
 const step=options.step??.06,maxSteps=options.maxSteps??900,outer=options.outerLimit??40,sign=options.sign??1,arrive=options.arrive??ARRIVED;
 // Each element stops a line at ITS OWN spacing, not at one radius shared by all of them.
 //
 // A single radius is the median gap, and on a lesson cut at r·tan(...) the gaps run from
 // centimetres in the middle to metres at the ends. The median made a stopping radius of 1.2 m
 // and every line halted a metre clear of the wire, leaving a hole around the charge; taking the
 // smallest gap instead would let lines run into the coarse far elements and wiggle there.
 // Neither is a compromise worth making, because the right radius is local: close to a finely
 // cut stretch a line may come close, and near a coarse one it may not.
 const radii=options.radii??localRadii(samples,arrive);
 const {crowd=0,drawn,bounds}=options;
 const path:Plane[]=[{x:start.x,y:start.y}];
 let here={x:start.x,y:start.y};
 for(let i=0;i<maxSteps;i++){
  const k1=heading(samples,here,sign);if(!k1)break;
  // A STEP THAT TURNS TOO FAR IS TAKEN AGAIN, SHORTER. The step is fixed by the picture, and almost everywhere
  // the field turns a degree or two across one. Not in the gap of an arc cut nearly into a ring: on the axis
  // there the field is a twentieth of its strength at P, and just off it the sideways part grows so fast that
  // the field turns eighty degrees within a few centimetres. A tenth-of-a-metre chord cut that elbow at up to
  // thirty degrees off the field, and the lines from the arc's two ends met the axis square, head on, at one
  // point of empty space. So where the direction at the end of a step is more than TURN_MOST off the one it
  // began with, the step is halved, down to a sixteenth, and the next step starts at full length again.
  let h=step,next:Plane|null=null;
  for(;;){
   const k2=heading(samples,{x:here.x+k1.x*h/2,y:here.y+k1.y*h/2},sign);if(!k2)break;
   const k3=heading(samples,{x:here.x+k2.x*h/2,y:here.y+k2.y*h/2},sign);if(!k3)break;
   const k4=heading(samples,{x:here.x+k3.x*h,y:here.y+k3.y*h},sign);if(!k4)break;
   if(k1.x*k4.x+k1.y*k4.y<TURN_COS&&h>step/16+1e-12){h/=2;continue;}
   next={x:here.x+h*(k1.x+2*k2.x+2*k3.x+k4.x)/6,y:here.y+h*(k1.y+2*k2.y+2*k3.y+k4.y)/6};
   break;
  }
  if(!next||!Number.isFinite(next.x)||!Number.isFinite(next.y))break;
  path.push(next);here=next;
  if(LEN(here)>outer)break;
  if(bounds&&(here.x<bounds.x0||here.x>bounds.x1||here.y<bounds.y0||here.y>bounds.y1))break;
  // Not in the first few steps: every line leaves the charge from nearly the same place, so
  // testing at the root would stop each one the moment it started.
  if(crowd>0&&drawn&&i>4&&drawn.within(here,crowd))break;
  let arrived=false;
  for(let k=0;k<samples.length;k++){const s=samples[k];if(Math.hypot(here.x-s.position.x,here.y-s.position.y,s.position.z)<radii[k]){arrived=true;break;}}
  if(arrived){
   // That last step landed inside the arrival radius, on top of the charge, where the
   // summed field leans hard toward whichever element is nearest. Keeping it drew the
   // line a final chord that hooks: 41 degrees of turn on the bisector, against 0.15
   // for every chord before it. The line stops one step short instead.
   if(path.length>1)path.pop();
   return {path,arrived:true};
  }
 }
 return {path,arrived:false};
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
export function chargeSeeds(samples:readonly ChargeSample[],count:number,offset:number,limit=Infinity):Plane[]{
 // Only from the part of the charge that is on the picture. Seeding by accumulated |dq| is what
 // makes crowding mean field strength, and on a bounded lesson it lands seeds right across the
 // drawing. The infinite line and the semi-infinite line are cut at y = r·tan(...), so their
 // outer elements are both enormous and enormously charged: every seed landed tens of metres
 // out, every line was drawn off-frame, and those two lessons showed NO field lines at all.
 // Restricting the pool costs nothing in meaning -- within the visible part the seeding is
 // still proportional to charge.
 const near=samples.filter(s=>Math.hypot(s.position.x,s.position.y,s.position.z)<=limit);
 const pool=near.length>1?near:samples;
 const weights=pool.map(s=>Math.abs(s.dq));
 const total=weights.reduce((a,b)=>a+b,0);
 if(!(total>0)||pool.length<2)return [];
 const wanted=Math.max(1,Math.round(count/2));
 const seeds:Plane[]=[];
 let index=0,carried=weights[0];
 for(let j=0;j<wanted;j++){
  const target=total*(j+.5)/wanted;
  while(carried<target&&index<weights.length-1){index+=1;carried+=weights[index];}
  // WHERE inside the chosen element, not just which element.
  //
  // Snapping each seed to a sample position caps the number of distinct seeds at the number of
  // elements on the picture, and on the unbounded lessons that is very few: the infinite line
  // cut into five puts only three inside the frame, so sixteen requested seeds collapsed to six
  // and the field came out as a handful of stray fragments. An element stands for a stretch of
  // charge, and a seed may stand anywhere along it -- so the accumulated charge is carried on
  // into the element and the position interpolated across the span it represents. Every lesson
  // gets the seeds it asked for, at any element count.
  const upTo=carried-weights[index];
  const frac=weights[index]>0?Math.min(1,Math.max(0,(target-upTo)/weights[index])):.5;
  const half=(a:ChargeSample,b:ChargeSample)=>({x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2});
  const lo=index>0?half(pool[index-1],pool[index]):pool[index].position;
  const hi=index<pool.length-1?half(pool[index],pool[index+1]):pool[index].position;
  const here={x:lo.x+(hi.x-lo.x)*frac,y:lo.y+(hi.y-lo.y)*frac};
  // Local tangent from the neighbours, so the launch is perpendicular to the distribution
  // whatever shape it runs in. A rod, an arc and a bent rod all work without special cases.
  const before=pool[Math.max(0,index-1)].position,after=pool[Math.min(pool.length-1,index+1)].position;
  const tx=after.x-before.x,ty=after.y-before.y,tl=Math.hypot(tx,ty);
  const nx=tl>1e-12?-ty/tl:0,ny=tl>1e-12?tx/tl:1;
  seeds.push({x:here.x+nx*offset,y:here.y+ny*offset});
  seeds.push({x:here.x-nx*offset,y:here.y-ny*offset});
 }
 return seeds;
}
/** LINES OFF A STRAIGHT ROD'S ENDS, TOO. Every seed above is launched square to the rod, at its middle of an
 * equal share of the charge, and in the plane of a rod a line launched square at the share whose middle is a
 * fraction f along it ends at the far polar angle cos theta = 2f - 1: the last share, f = 15/16, ends 29
 * degrees off the rod's axis. So a cone of 29 degrees about the axis was bare off both ends -- and the axial
 * lesson stands P on that axis, where the field at its distance is the strongest, in the widest gap of the
 * picture: the nearest line passed two and a half metres from P, three metres off the rod's end.
 *
 * So each end of a straight, open rod also launches a line to either side of its axis, from the tip, TIP_LAUNCH
 * off the axis -- true field lines, traced and rooted like the rest, filling the cone; the equal-charge
 * spacing along the rod is left as it was. Not at an end whose charge per metre is under half the rod's mean:
 * the ramp's light end, where lambda falls to zero, stays as bare as its charge says. (Per metre over the last
 * few pieces, not per piece: a partition coarsened unevenly has end pieces of half the others' charge on a
 * uniform rod.) Only ends inside `limit` of O, so a line running past the picture has none. */
export const TIP_LAUNCH=35*Math.PI/180;
export function tipSeeds(samples:readonly ChargeSample[],offset:number,limit=Infinity):Plane[]{
 const n=samples.length;
 if(n<3)return [];
 const a=samples[0].position,b=samples[n-1].position,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
 if(!(length>1e-9))return [];
 // Straight: every point on the line through the two ends.
 if(samples.some(s=>Math.abs((s.position.x-a.x)*dy-(s.position.y-a.y)*dx)/length>1e-6*Math.max(1,length)||Math.abs(s.position.z)>1e-9))return [];
 if(n<5)return [];
 // Charge per metre over the last three pieces at an end, from the tip -- half a gap past the end piece -- to
 // halfway between the third and the fourth; and over the whole rod, tip to tip.
 const P=(i:number)=>samples[i].position,tipOf=(e:number,f:number)=>({x:P(e).x+(P(e).x-P(f).x)/2,y:P(e).y+(P(e).y-P(f).y)/2});
 const tips=[tipOf(0,1),tipOf(n-1,n-2)],total=samples.reduce((q,s)=>q+Math.abs(s.dq),0);
 const mean=total/Math.max(1e-12,Math.hypot(tips[1].x-tips[0].x,tips[1].y-tips[0].y));
 const endDensity=(e:number,d:number)=>{
  const q=Math.abs(samples[e].dq)+Math.abs(samples[e+d].dq)+Math.abs(samples[e+2*d].dq),edge={x:(P(e+2*d).x+P(e+3*d).x)/2,y:(P(e+2*d).y+P(e+3*d).y)/2},tip=e===0?tips[0]:tips[1];
  return q/Math.max(1e-12,Math.hypot(edge.x-tip.x,edge.y-tip.y));
 };
 const seeds:Plane[]=[];
 for(const [e,f] of [[0,1],[n-1,n-2]] as const){
  const end=samples[e],next=samples[f];
  if(endDensity(e,f-e)<.5*mean||Math.hypot(end.position.x,end.position.y)>limit)continue;
  const ox=end.position.x-next.position.x,oy=end.position.y-next.position.y,l=Math.hypot(ox,oy);
  if(!(l>1e-12))continue;
  const ux=ox/l,uy=oy/l,tip={x:end.position.x+ox/2,y:end.position.y+oy/2};
  const c=Math.cos(TIP_LAUNCH),s=Math.sin(TIP_LAUNCH);
  for(const side of [1,-1])seeds.push({x:tip.x+offset*(c*ux-side*s*uy),y:tip.y+offset*(c*uy+side*s*ux)});
 }
 return seeds;
}
/** WHERE THE LINES OF AN ENDLESS CHARGE START: along all of it that the window shows.
 *
 * Lines are seeded from the charge within `span` of O -- the field's reach, a little under -- and on
 * a bounded lesson that is all of it. An infinite or semi-infinite line goes on past the window, and
 * the part of it beyond the reach but still on the picture had no line leaving it at all: the semi-
 * infinite line, drawn out to about nine and a half metres, had lines only from its first five, so the
 * whole region beside the right half of the charge -- where its field is strongest, falling as 1/r --
 * was drawn empty, and line density is what says how strong a field is. Zoomed out, the infinite line
 * had empty bands beside it.
 *
 * So where the charge runs beyond the window, the pool is the window (`window`, as a distance from O),
 * and the number of lines grows with the charge it now holds, so the lines per unit of charge -- and so
 * the density that means strength -- are what they were. Capped, because a zoomed-out window is a lot
 * of line to trace; past the cap the lines thin evenly rather than stopping. A bounded charge is left
 * exactly as it was. */
export function seedPool(samples:readonly ChargeSample[],count:number,span:number,window:number,most=4):{count:number;pool:number}{
 const far=Math.max(0,...samples.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)));
 // ALL OF A CHARGE THE PICTURE HOLDS. A bounded charge reaching a little past `span` -- the axial rod eight
 // metres long, with the flat figure's span 7.6 -- had the last of its length, the end P stands beyond, start
 // no line at all: forty degrees bare about the axis there. Only a charge running past the window is cut.
 if(far<=Math.max(span,window))return {count,pool:Math.max(span,far*(1+1e-9))};
 if(!(window>span))return {count,pool:span};
 const within=(r:number)=>samples.reduce((q,s)=>Math.hypot(s.position.x,s.position.y,s.position.z)<=r?q+Math.abs(s.dq):q,0);
 const before=within(span),after=within(window);
 const grown=before>0?count*after/before:count;
 return {count:Math.max(count,Math.min(count*most,Math.round(grown))),pool:window};
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
 // The floor is a step, not a constant. A line that comes closer to the charge than one step
 // cannot be resolved by steps that size: the field turns further across a single step than the
 // step is long, and the drawn line both kinks and loses more potential than |E|·dl allows.
 const span=options.seedLimit??reach;
 const stride=options.step??span*.05;
 const radii=localRadii(samples,Math.max(ARRIVED,stride*.9));
 const arrive=Math.min(...radii);
 const offset=Math.max(arrive*1.6,span*.05),pool=options.seedPool??options.seedLimit??Infinity;
 const seeded=chargeSeeds(samples,count,offset,pool);
 // And off a straight rod's ends (see `tipSeeds`), only where the lines are rooted on the charge: that is the
 // figure's drawing, where the bare cone off each end was the gap P stood in.
 const starts=seeded.length?[...seeded,...(options.root?tipSeeds(samples,offset,pool):[])]:seedRing(samples,count);
 // About a drawn line width in world units. Both halves of one line are traced against the
 // grid as it stood BEFORE the line began, then added together: otherwise the second half
 // would stop against the first at the seed they share.
 // Scaled to the picture, not to how far the charge runs: on an unbounded lesson `reach` is
 // hundreds of metres, and a crowding radius that size discards every line but the first.
 const crowd=options.crowd??span*.012;
 const drawn=drawnPoints(Math.max(crowd,1e-6));
 const lines:Plane[][]=[];
 // The last stretch of a half that arrived, traced again on the finer partition (see `finish`). Kept only
 // if it arrives too: a half that wanders off is joined as before.
 // Its ends cut finer still, where the field turns round a rod's tip (see `refineEnds`).
 const finish=options.finish,fine=finish?refineEnds(finish.samples):null;
 const fineRadii=(step:number)=>fine?fine.map((s,i)=>{
  let gap=Infinity;
  for(const j of [i-1,i+1]){const o=fine[j];if(o)gap=Math.min(gap,Math.hypot(s.position.x-o.position.x,s.position.y-o.position.y,s.position.z-o.position.z));}
  return Math.max(step*.9,1.5*(Number.isFinite(gap)?gap:0));
 }):[];
 // Twice: at the finish's step, and then on in at a quarter of it, where the end pieces are fine enough to
 // be come close to -- a line cannot be brought nearer a charge than its own step resolves.
 const passes=finish?[finish.step,finish.step/4,finish.step/16].map(step=>({step,radii:fineRadii(step)})):[];
 const finished=(half:{path:Plane[];arrived:boolean},sign:number)=>{
  if(!fine||!half.arrived||!half.path.length)return half;
  let out=half,within=Math.max(...radii)*2+stride*2;
  for(const pass of passes){
   const more=trace(fine,out.path[out.path.length-1],{step:pass.step,radii:pass.radii,maxSteps:Math.ceil(within/pass.step)+12,outerLimit:options.outerLimit,sign});
   if(!(more.arrived&&more.path.length>1))break;
   out={path:[...out.path,...more.path.slice(1)],arrived:true};within=pass.step*8;
  }
  return out;
 };
 for(const seed of starts){
  const along=finished(trace(samples,seed,{...options,arrive,radii,crowd,drawn,sign:1}),1);
  const against=finished(trace(samples,seed,{...options,arrive,radii,crowd,drawn,sign:-1}),-1);
  const line=[...against.path.slice(1).reverse(),...along.path];
  if(line.length<=3)continue;
  for(const q of line)drawn.add(q);
  // Joined after the line is booked as drawn, so a root never stops a neighbour short of the charge.
  const root=options.root;
  if(root){
   const foot=(q:Plane)=>{const f=root(q.x,q.y,0);return f?{x:f.x,y:f.y}:null;};
   const head=against.arrived?foot(line[0]):null,tail=along.arrived?foot(line[line.length-1]):null;
   if(head&&Math.hypot(head.x-line[0].x,head.y-line[0].y)>1e-9)line.unshift(...joinCurve(line[0],line[1],foot).reverse());
   if(tail&&Math.hypot(tail.x-line[line.length-1].x,tail.y-line[line.length-1].y)>1e-9)line.push(...joinCurve(line[line.length-1],line[line.length-2],foot));
  }
  lines.push(line);
 }
 return lines;
}
/** THE LAST STRETCH OF A LINE INTO THE CHARGE: the points after `end`, where the trace stopped, on to the
 * body, whose nearest point to any point `footOf` gives. Not a straight stroke square to the body: a curve
 * leaving `end` the way the line was going (from `before`) and meeting the body square, which is how a field
 * line meets a line of charge -- close in, the charge's own field is square to it; a little further out,
 * near its ends, it leans. The straight join met the traced line at a corner of up to fourteen degrees where
 * lines turn round a rod's ends. A quadratic whose middle control point is on the line's own direction,
 * half as far from the body as `end` is, and which ends on the body at that point's foot, so it arrives
 * square; cut into a few chords. A line running along the body or away from it is joined straight. */
export function joinCurve(end:Plane,before:Plane,footOf:(q:Plane)=>Plane|null,chords=6):Plane[]{
 const f=footOf(end);
 if(!f)return [];
 const tx=end.x-before.x,ty=end.y-before.y,lt=Math.hypot(tx,ty),nx=f.x-end.x,ny=f.y-end.y,h=Math.hypot(nx,ny);
 if(!(lt>1e-12&&h>1e-12))return [f];
 const ux=tx/lt,uy=ty/lt,into=(ux*nx+uy*ny)/h;
 if(!(into>.2))return [f];
 const s=h/(2*into),c={x:end.x+ux*s,y:end.y+uy*s},g=footOf(c);
 if(!g)return [f];
 const out:Plane[]=[];
 for(let k=1;k<=chords;k++){
  const t=k/chords,a=(1-t)*(1-t),b=2*(1-t)*t,d=t*t;
  out.push(k===chords?g:{x:a*end.x+b*c.x+d*g.x,y:a*end.y+b*c.y+d*g.y});
 }
 return out;
}
/** WHICH WAY THE FIELD GOES, on the line itself.
 *
 * Every line is ordered along E (see `fieldLines`), but nothing on the page said so: a field line
 * with no arrowhead is only a curve, and flipping the charge negative left every line exactly as it
 * was -- only the arrow at P turned round. A textbook never draws field lines without their
 * direction, away from positive charge and into negative, and on the infinite line and the sheet a
 * bare straight line through the charge is the textbook picture of a uniform EXTERNAL field, the
 * opposite of what those lessons are about.
 *
 * So each line carries a small head pointing the way the polyline runs. Where they go is decided on
 * the screen, by the part of the line the reader can actually see inside `rect`: one at the middle
 * of that part, and one more for every `every` units of it, spread evenly, so a long line is marked
 * along its length and a line that merely clips a corner of the window gets none (under `least`).
 * Returns, for each head, the segment it sits on, how far along it, and the screen position and unit
 * direction there. */
export type LineHead={segment:number;t:number;x:number;y:number;dx:number;dy:number};
/** A field line's arrowhead in units of the figure's viewBox: as long as the flat arrows' barbs and
 * narrower than it is long, so it reads as a direction rather than as a dot on the line. The flat
 * canvas and the scene draw the same head. */
export const LINE_HEAD={length:6.5,half:2.6} as const;
/** How much room a head already laid keeps round itself against the next line's heads, as a square this many
 * head lengths across (see FieldStage's `layLineHeads`): with the box's padding, no two heads closer than a
 * head and a half, which is where two of them read as one doubled glyph. */
export const HEAD_ROOM=2.2;
export function lineHeads(screen:readonly {x:number;y:number}[],rect:{x:number;y:number;width:number;height:number},every=180,least=28,margin=6,keepOut:readonly Box[]=[]):LineHead[]{
 const x0=rect.x+margin,x1=rect.x+rect.width-margin,y0=rect.y+margin,y1=rect.y+rect.height-margin;
 // The part of each segment inside the window, as a range of t (Liang and Barsky): a straight line
 // may be one segment from the charge to far past the edge, and only its visible stretch counts.
 const parts:{t0:number;t1:number;l:number}[]=[];let total=0;
 for(let i=0;i+1<screen.length;i++){
  const a=screen[i],b=screen[i+1],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);
  let t0=0,t1=1;
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite)||!(l>0))t1=-1;
  else for(const [p,q] of [[-dx,a.x-x0],[dx,x1-a.x],[-dy,a.y-y0],[dy,y1-a.y]]){
   if(p===0){if(q<0){t1=-1;break;}continue;}
   const r=q/p;
   if(p<0){if(r>t0)t0=r;}else if(r<t1)t1=r;
  }
  const seen=t1>t0?(t1-t0)*l:0;
  parts.push({t0,t1,l:seen});total+=seen;
 }
 if(!(total>=least))return [];
 /** The head `want` units along the visible stretch of the line. */
 const at=(want:number):LineHead|null=>{
  let i=0,before=0;
  while(i<parts.length-1&&before+parts[i].l<want){before+=parts[i].l;i++;}
  const part=parts[i];if(!part||!(part.l>0))return null;
  const a=screen[i],b=screen[i+1],full=Math.hypot(b.x-a.x,b.y-a.y);
  const t=Math.min(part.t1,Math.max(part.t0,part.t0+(want-before)/full));
  return {segment:i,t,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dx:(b.x-a.x)/full,dy:(b.y-a.y)/full};
 };
 // NOT ON A NAME. A head is a solid mark, and one set where a line crosses the figure's names sat on the
 // letter -- a head on the y beside the disk, through the x on the sheet. It slides along its own line,
 // up to about a third of the spacing either way, to the nearest place clear of every name; with none, it
 // is not drawn: the line's other heads say which way it runs.
 //
 // NOR ON A CORNER. A head is laid along its one chord, and where the chords either side of it turn by more than
 // HEAD_TURN the chord is not the field's direction: a head set on the elbow a line makes in an arc's gap pointed
 // twenty-four degrees off the field. It slides along the line, as off a name, to where the line runs straight.
 const turn=(i:number,j:number)=>{
  const a=screen[i],b=screen[i+1],c=screen[j],d=screen[j+1];
  if(!a||!b||!c||!d)return false;
  const ux=b.x-a.x,uy=b.y-a.y,vx=d.x-c.x,vy=d.y-c.y,l=Math.hypot(ux,uy)*Math.hypot(vx,vy);
  return l>0&&(ux*vx+uy*vy)/l<HEAD_COS;
 };
 const corner=(i:number)=>turn(i-1,i)||turn(i,i+1);
 const clear=(h:LineHead)=>!corner(h.segment)&&(!keepOut.length||!meetsBoxes({x:h.x-h.dx*LINE_HEAD.length/2,y:h.y-h.dy*LINE_HEAD.length/2},{x:h.x+h.dx*LINE_HEAD.length/2,y:h.y+h.dy*LINE_HEAD.length/2},keepOut,LINE_HEAD.half));
 const count=Math.max(1,Math.round(total/every)),heads:LineHead[]=[],reach=Math.min(every/3,total/2),edge=LINE_HEAD.length/2;
 for(let j=0;j<count;j++){
  const want=total*(j+.5)/count;
  let head=at(want);
  if(head&&!clear(head)){
   head=null;
   for(let k=6;k<=reach&&!head;k+=6)for(const s of [want+k,want-k]){
    if(s<edge||s>total-edge)continue;
    const moved=at(s);
    if(moved&&clear(moved)){head=moved;break;}
   }
  }
  if(head)heads.push(head);
 }
 return heads;
}
/** A box in the figure's viewBox units. */
export type Box={x:number;y:number;width:number;height:number};
/** Whether the segment from `a` to `b` passes through any of `boxes`, each grown by `pad` (Liang and
 * Barsky against each box in turn). */
export function meetsBoxes(a:{x:number;y:number},b:{x:number;y:number},boxes:readonly Box[],pad=0):boolean{
 const dx=b.x-a.x,dy=b.y-a.y;
 for(const box of boxes){
  const x0=box.x-pad,x1=box.x+box.width+pad,y0=box.y-pad,y1=box.y+box.height+pad;
  let t0=0,t1=1,inside=true;
  for(const [p,q] of [[-dx,a.x-x0],[dx,x1-a.x],[-dy,a.y-y0],[dy,y1-a.y]]){
   if(p===0){if(q<0){inside=false;break;}continue;}
   const r=q/p;
   if(p<0){if(r>t0)t0=r;}else if(r<t1)t1=r;
   if(t0>t1){inside=false;break;}
  }
  if(inside&&t0<=t1)return true;
 }
 return false;
}
/** How far the point `p` is from the nearest of `boxes`, zero inside one; Infinity with none. */
export function boxGap(p:{x:number;y:number},boxes:readonly Box[]):number{
 let best=Infinity;
 for(const b of boxes){
  const dx=Math.max(b.x-p.x,0,p.x-(b.x+b.width)),dy=Math.max(b.y-p.y,0,p.y-(b.y+b.height));
  best=Math.min(best,Math.hypot(dx,dy));
 }
 return best;
}
/** THE NAMES THE FIGURE HAS PAINTED, as boxes in its viewBox, each grown by `pad`: every text of `svg` that
 * is drawn -- not empty, not inside a hidden or fully transparent group -- where it stands now, after the
 * placer has moved it. Read from the screen, as the placer reads them, so a name and the field's marks are
 * judged in one space. The field gives way to the names: the placer cannot see the field, which is drawn on
 * a canvas or in the scene under the SVG. */
export function paintedLabels(svg:Element|null|undefined,pad=4):Box[]{
 if(!svg)return [];
 const frame=svg.getBoundingClientRect();
 if(!(frame.width>2&&frame.height>2))return [];
 const view=(svg as SVGSVGElement).viewBox?.baseVal,sx=(view?.width||720)/frame.width,sy=(view?.height||430)/frame.height;
 const out:Box[]=[];
 for(const t of svg.querySelectorAll('text')){
  // Not the charge's own plus signs, which are the charge, nor the view cube's faces, outside the window.
  if(!t.textContent?.trim()||t.closest('.cd-help, .cd-plus, .cd-cube'))continue;
  try{if(!t.checkVisibility({opacityProperty:true,visibilityProperty:true}))continue;}catch{/* an older engine: judged by its box alone */}
  const r=t.getBoundingClientRect();
  if(!(r.width>.5&&r.height>.5))continue;
  out.push({x:(r.left-frame.left)*sx-pad,y:(r.top-frame.top)*sy-pad,width:r.width*sx+2*pad,height:r.height*sy+2*pad});
 }
 // And the potential's column beside P, which is a mark about P as its name is.
 for(const g of svg.querySelectorAll('.cd-gauge')){
  const r=g.getBoundingClientRect();
  if(r.width>.5&&r.height>.5)out.push({x:(r.left-frame.left)*sx-pad,y:(r.top-frame.top)*sy-pad,width:r.width*sx+2*pad,height:r.height*sy+2*pad});
 }
 return out;
}
/** THE VIEW CUBE, with its four turning buttons, as one box in the figure's viewBox units, `pad` units clear all
 * round, or null where there is none (the flat view). It stands inside the window, at its top-left corner, and the
 * scene draws under it: on the endless and semi-infinite lines the charge's + marks ran up the rod into that
 * corner, one against the cube's edge and one on its right-turn button, where they read as part of the control.
 * The placer keeps the names out of the same box (ChargeDiagram's `dom`); the scene's marks keep out of it too. */
export function controlBox(svg:Element|null|undefined,pad=8):Box|null{
 const cube=svg?.querySelector('.cd-cube');
 if(!svg||!cube)return null;
 const frame=svg.getBoundingClientRect(),r=cube.getBoundingClientRect();
 if(!(frame.width>2&&frame.height>2&&r.width>.5&&r.height>.5))return null;
 const view=(svg as SVGSVGElement).viewBox?.baseVal,sx=(view?.width||720)/frame.width,sy=(view?.height||430)/frame.height;
 return {x:(r.left-frame.left)*sx-pad,y:(r.top-frame.top)*sy-pad,width:r.width*sx+2*pad,height:r.height*sy+2*pad};
}
/** Whether a mutation of the figure's SVG can have moved, shown or hidden one of its names: it touched a
 * text, or a group holding one. Everything else the run changes every frame -- arrows, pieces, brackets --
 * is not the field's business. */
export function touchesLabels(records:readonly MutationRecord[]):boolean{
 const holds=(n:Node|null)=>!!n&&(n.nodeName==='text'||n.nodeName==='tspan'||(n.nodeType===1&&!!(n as Element).querySelector('text')));
 return records.some(r=>{
  const n=r.target;
  if(n.nodeType!==1)return !!n.parentElement?.closest('text');
  if((n as Element).closest('text'))return true;
  if(r.type==='childList')return [...r.addedNodes,...r.removedNodes].some(holds);
  return holds(n);
 });
}
