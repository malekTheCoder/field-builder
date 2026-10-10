import {K} from '../distributions/constants';
import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
import {bodyDistance,bodyFoot,logWeights} from './vectorfield';
import {localRadii} from './fieldlines';
/** The field in space, for the 3D view.
 *
 * The flat view traces the field in the plane the planar lessons live in. In space there is
 * no such plane: a ring's field wraps round the wire, a disk's rises off both faces. So the
 * same discretised charge the rest of the app sums is summed in three dimensions here, and
 * lines and arrows are placed in the volume rather than on a slice of it. */
const ARRIVED=.05;
/** Complete elliptic integrals K(m) and E(m), by the arithmetic-geometric mean: quadratic
 * convergence, so five or six square roots reach machine precision anywhere off the ring. */
function elliptic(m:number):[number,number]{
 // m = 1 is the ring itself, where K diverges; the AGM would halve forever instead of stopping.
 let a=1,b=Math.sqrt(1-Math.min(m,1-1e-16)),c=0,sum=m/2,weight=.5;
 for(let i=0;i<60&&(i===0||c>1e-16*a);i++){const next=(a+b)/2;c=(a-b)/2;b=Math.sqrt(a*b);a=next;weight*=2;sum+=weight*c*c;}
 const K=Math.PI/(2*a);return [K,K*(1-sum)];
}
/** The field of a surface's annuli, each summed as the whole ring it is.
 *
 * The figure used to stand each ring in for sixteen points, and every ring's points sat on the
 * same sixteen azimuths, so the drawn surface was sixteen charged SPOKES with bare wedges between
 * them -- a spread that lived here as `cloud` until nothing drew it and was removed. Above a
 * wedge the field ripples as exp(-16 z/rho): the gap between spokes is 2 pi rho/16, which grows
 * with radius without limit. The disk never reaches far enough out for that to show. The sheet's
 * picture does: at rho = 3 m the summed field stood 23 degrees off the normal 0.3 m above the face
 * and 61 degrees off 0.1 m above it. Nothing about an infinite sheet leans; that was the spokes.
 *
 * A charged ring has a closed form, so there is nothing to approximate. With
 * alpha^2 = (s - rho)^2 + z^2, beta^2 = (s + rho)^2 + z^2 and m = 4 s rho / beta^2,
 *   E_z   = (2kQ/pi)  z E(m) / (alpha^2 beta),
 *   E_rho = (kQ/(pi rho beta)) [K(m) - E(m) (s^2 - rho^2 + z^2)/alpha^2],
 * which is -grad of V = (2kQ/pi) K(m)/beta. It agrees with a 4096-point ring to 1e-13, costs
 * about a quarter of what sixteen points did, and leaves the radial gap between annuli as the only
 * discretisation a line meets -- which is the gap the partition was chosen for. */
export function annuliField(samples:readonly ChargeSample[],at:Vec):Vec{
 const rho=Math.hypot(at.x,at.y),z=at.z;let er=0,ez=0;
 for(const sample of samples){
  const s=Math.abs(sample.coordinate);
  if(s<1e-9){const r2=rho*rho+z*z;if(r2<1e-12)continue;const inv=K*sample.dq/(r2*Math.sqrt(r2));er+=inv*rho;ez+=inv*z;continue;}
  const alpha2=(s-rho)**2+z*z;if(alpha2<1e-12)continue;
  const beta2=(s+rho)**2+z*z,beta=Math.sqrt(beta2),[Km,Em]=elliptic(4*s*rho/beta2);
  ez+=2*K*sample.dq/Math.PI*z*Em/(alpha2*beta);
  if(rho>1e-12)er+=K*sample.dq/(Math.PI*rho*beta)*(Km-Em*(s*s-rho*rho+z*z)/alpha2);
 }
 return rho>1e-12?{x:er*at.x/rho,y:er*at.y/rho,z:ez}:{x:0,y:0,z:ez};
}
/** The drawn field of a layout: a wire's elements are points, a surface's are rings. */
const fieldOf=(samples:readonly ChargeSample[],layout:Layout)=>layout==='surface'
 ?(at:Vec)=>annuliField(samples,at):(at:Vec)=>spaceField(samples,at);
export function typicalSpacing(points:readonly ChargeSample[]):number{
 // Sampled ACROSS the whole charge, not from the first sixty points.
 //
 // On a wire those are the same thing. On anything listed innermost first they are not: given a
 // surface spread into rings of points, the first sixty are the three or four smallest
 // rings — radii of a few centimetres, and gaps to match. The median came out far below the
 // spacing anywhere a line is actually drawn, `arrive` fell back to its floor, and lines were
 // traced to within a few centimetres of a face whose points are a quarter of a metre apart.
 // Within that, the drawn field is the field of sixteen point charges, not of a ring.
 const gaps:number[]=[];
 const stride=Math.max(1,Math.floor(points.length/60));
 for(let i=stride;i<points.length;i+=stride){const a=points[i-stride].position,b=points[i].position;gaps.push(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));}
 if(!gaps.length)return ARRIVED;
 gaps.sort((x,y)=>x-y);
 return gaps[Math.floor(gaps.length/2)];
}
export function spaceField(samples:readonly ChargeSample[],at:Vec):Vec{
 let x=0,y=0,z=0;
 for(const s of samples){
  const dx=at.x-s.position.x,dy=at.y-s.position.y,dz=at.z-s.position.z,r2=dx*dx+dy*dy+dz*dz;
  if(r2<1e-12)continue;
  const inv=K*s.dq/(r2*Math.sqrt(r2));
  x+=inv*dx;y+=inv*dy;z+=inv*dz;
 }
 return {x,y,z};
}
const LEN=(v:Vec)=>Math.hypot(v.x,v.y,v.z);
const add=(a:Vec,b:Vec,k=1):Vec=>({x:a.x+b.x*k,y:a.y+b.y*k,z:a.z+b.z*k});
const scale=(v:Vec,k:number):Vec=>({x:v.x*k,y:v.y*k,z:v.z*k});
const cross=(a:Vec,b:Vec):Vec=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const unit=(v:Vec):Vec|null=>{const l=LEN(v);return l>1e-12?scale(v,1/l):null;};
function heading(field:(at:Vec)=>Vec,at:Vec,sign:number):Vec|null{
 const e=field(at),l=LEN(e);
 if(!Number.isFinite(l)||l<1e-30)return null;
 return scale(e,sign/l);
}
/** Points already drawn, bucketed in three dimensions: "is anything within d of here" is a
 * look at twenty-seven cells rather than a scan of every point on every line. */
function drawnPoints(cell:number){
 const buckets=new Map<string,Vec[]>();
 const at=(v:Vec)=>`${Math.floor(v.x/cell)},${Math.floor(v.y/cell)},${Math.floor(v.z/cell)}`;
 return {
  add(v:Vec){const k=at(v),b=buckets.get(k);if(b)b.push(v);else buckets.set(k,[v]);},
  within(v:Vec,d:number){
   const gx=Math.floor(v.x/cell),gy=Math.floor(v.y/cell),gz=Math.floor(v.z/cell),d2=d*d;
   for(let i=gx-1;i<=gx+1;i++)for(let j=gy-1;j<=gy+1;j++)for(let k=gz-1;k<=gz+1;k++){
    const b=buckets.get(`${i},${j},${k}`);
    if(b)for(const q of b){const dx=v.x-q.x,dy=v.y-q.y,dz=v.z-q.z;if(dx*dx+dy*dy+dz*dz<d2)return true;}
   }
   return false;
  },
 };
}
export type TraceOptions={step?:number;maxSteps?:number;outerLimit?:number;sign?:number;
 /** Stop where the DRAWING has let the line go, as opposed to the sphere `outerLimit` sets about O.
  * The scene fades each line with its distance from the charge (see `lineStrength`), and the sphere
  * about O was a different place wherever the charge is not centred on O: on the rod seen along its
  * axis -- O is its end -- lines stopped dead in empty space beside P while still drawn at a third to
  * three fifths of their ink, each end a sink that is not there. Given this, a line runs on until it
  * has faded to nothing, and `outerLimit` is only a guard. */
 far?:(at:Vec)=>boolean;
 /** How far out lines may START, as opposed to how far they may run. The two differ on the
  * sheet: a line may usefully run well past the edge of the drawing, but one that BEGINS out
  * there is drawn entirely off the picture. Defaults to `outerLimit`. */
 seedLimit?:number;
 /** Which of the charge lines may start from, where that is not `seedLimit`; see `seedPool` in
  * fieldlines.ts. */
 seedPool?:number;
 /** How close to a point charge counts as having arrived. */
 arrive?:number;
 /** Per-element stopping radii, when the caller has worked them out. */
 radii?:readonly number[];
 /** Distance from a point to the charge BODY, for layouts whose elements are not points. A disk's
  * annulus is a continuous ring; measuring to the one point each sample stores, or to the sixteen
  * points it used to be spread into, lets a line thread between them and run closer to the surface than the
  * drawing can support. See bodyDistance. A line that comes within `clearance` of it is shortened
  * to end there. */
 clear?:(x:number,y:number,z:number)=>number;
 clearance?:number;
 /** The field to follow, where the samples are not simply point charges: a surface's annuli.
  * Defaults to Coulomb summed over the samples as points. */
 field?:(at:Vec)=>Vec;
 /** Jobard and Lefer's dtest rule, and only that rule — their even seeding would destroy
  * density meaning field strength. About one drawn line width: below it two lines are the
  * same stroke and the second says nothing the first did not. */
 crowd?:number; drawn?:ReturnType<typeof drawnPoints>;
 /** Finish every line on the charge, as the flat tracer's `root` does: where a half of a line
  * arrived, it is carried on straight to the body, stopping `inset` short of it -- a wire's tube is
  * drawn with a radius, and a line that ran on to the axis inside it would be hidden in the last
  * stretch anyway. A surface is a plane with no thickness, so its lines run onto it. */
 root?:{inset?:number};
 /** How far out along a surface a SIDE VIEW's lines may start, when that is not `seedLimit`: the
  * half-width of the window the side view shows. A disk's rings all lie inside it anyway; an
  * infinite sheet's go on past it, and its lines must fill the window its field fills -- seeded only
  * to the field's reach they stopped a hundred pixels short of either edge, a uniform field with
  * empty margins. The number of lines grows with the distance, so their spacing does not. */
 seedSpan?:number};
/** One streamline in space, RK4 on the unit field direction so each step is one honest
 * increment of arc length; stops on leaving the picture or arriving at the charge. */
export function traceLine3(samples:readonly ChargeSample[],start:Vec,options:TraceOptions={}):Vec[]{
 return trace3(samples,start,options).path;
}
/** The walk, saying also whether it ended by arriving at the charge: on a wire, inside an element's
 * stopping radius; on a surface, at its clearance above the face. */
function trace3(samples:readonly ChargeSample[],start:Vec,options:TraceOptions):{path:Vec[];arrived:boolean}{
 const step=options.step??.06,maxSteps=options.maxSteps??600,outer=options.outerLimit??40,sign=options.sign??1,arrive=options.arrive??ARRIVED;
 // Each element stops a line at its own spacing; see localRadii in fieldlines.ts.
 const radii=options.radii??localRadii(samples,arrive);
 const {clear,clearance=arrive}=options;
 const {crowd=0,drawn}=options;
 const field=options.field??((at:Vec)=>spaceField(samples,at));
 const advance=(from:Vec,h:number):Vec|null=>{
  const k1=heading(field,from,sign);if(!k1)return null;
  const k2=heading(field,add(from,k1,h/2),sign);if(!k2)return null;
  const k3=heading(field,add(from,k2,h/2),sign);if(!k3)return null;
  const k4=heading(field,add(from,k3,h),sign);if(!k4)return null;
  const to:Vec={x:from.x+h*(k1.x+2*k2.x+2*k3.x+k4.x)/6,y:from.y+h*(k1.y+2*k2.y+2*k3.y+k4.y)/6,z:from.z+h*(k1.z+2*k2.z+2*k3.z+k4.z)/6};
  return [to.x,to.y,to.z].every(Number.isFinite)?to:null;
 };
 const path:Vec[]=[{...start}];
 let here:Vec={...start};
 for(let i=0;i<maxSteps;i++){
  const next=advance(here,step);if(!next)break;
  // A surface is met by shortening the last step onto the clearance, not by throwing it away.
  //
  // Throwing it away is right at a wire, where that step ends deep inside the arrival radius on
  // top of an element (below). A face is not an element: the field above it is the face's all
  // the way down to the clearance, so the part of the step above the clearance is as honest as
  // any other. Discarding it left a line's lowest vertex anywhere from one clearance to one
  // clearance plus a step off the face -- on the sheet that was every line stopping at the seed,
  // 0.37 m up, and nothing drawn in the 0.3 m where the field meets the surface.
  if(clear){
   const to=clear(next.x,next.y,next.z);
   if(to<clearance){
    const from=clear(here.x,here.y,here.z),h=step*(from-clearance)/(from-to);
    const end=h>step*1e-3?advance(here,h):null;
    if(end)path.push(end);
    return {path,arrived:true};
   }
  }
  path.push(next);here=next;
  if(LEN(here)>outer||options.far?.(here))break;
  // Not at the root: every line leaves the charge from nearly the same place.
  if(crowd>0&&drawn&&i>4&&drawn.within(here,crowd))break;
  if(clear)continue;
  let arrived=false;
  for(let k=0;k<samples.length;k++){const s=samples[k];if(Math.hypot(here.x-s.position.x,here.y-s.position.y,here.z-s.position.z)<radii[k]){arrived=true;break;}}
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
/** How the charge is laid out, which decides where lines can start.
 * A wire is a rod, an arc or a ring: samples run along it. A surface is a disk or a sheet:
 * each sample is a whole annulus at one radius, not a point. */
export type Layout='wire'|'surface';
/** Which elements to start lines from: equal steps of accumulated |dq|, so every line stands
 * for the same flux and density means strength, exactly as in the flat view. */
function chosen(samples:readonly ChargeSample[],wanted:number):number[]{
 return along(samples,wanted).map(c=>c.index);
}
/** The same walk, but saying WHERE inside the chosen element as well as which one.
 *
 * An element stands for a stretch of charge and a seed may sit anywhere along it. Snapping every
 * seed to a sample position caps the distinct seeds at the number of elements on the picture,
 * which on the unbounded lessons is very few — the infinite line cut into five puts three inside
 * the frame, so sixteen requested seeds became six and the field drew as stray fragments. */
function along(samples:readonly ChargeSample[],wanted:number):{index:number;frac:number}[]{
 const weights=samples.map(s=>Math.abs(s.dq)),total=weights.reduce((a,b)=>a+b,0);
 if(!(total>0)||!samples.length)return [];
 const out:{index:number;frac:number}[]=[];let index=0,carried=weights[0];
 for(let j=0;j<wanted;j++){
  const target=total*(j+.5)/wanted;
  while(carried<target&&index<weights.length-1){index+=1;carried+=weights[index];}
  const upTo=carried-weights[index];
  out.push({index,frac:weights[index]>0?Math.min(1,Math.max(0,(target-upTo)/weights[index])):.5});
 }
 return out;
}
const midway=(a:Vec,b:Vec):Vec=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2});
const lerp=(a:Vec,b:Vec,t:number):Vec=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
/** The point a fraction of the way through element `index`'s own span. */
function spanPoint(pool:readonly ChargeSample[],index:number,frac:number):Vec{
 const here=pool[index].position;
 const lo=index>0?midway(pool[index-1].position,here):here;
 const hi=index<pool.length-1?midway(here,pool[index+1].position):here;
 return lerp(lo,hi,frac);
}
/** Seeds around a wire: a few directions perpendicular to it at each chosen element, so the
 * lines leave the wire on every side rather than only in one plane. Around a surface: points
 * on the chosen annulus at several azimuths, launched off both faces. */
export function spaceSeeds(samples:readonly ChargeSample[],layout:Layout,count:number,offset:number,around=4,limit=Infinity):Vec[]{
 const seeds:Vec[]=[];
 if(samples.length<2)return seeds;
 if(layout==='wire'){
  const wanted=Math.max(1,Math.round(count/around));
  // Wires need the same restriction surfaces got, and for the same reason. The infinite and
  // semi-infinite lines are cut at y = r·tan(...), so their end elements sit tens of metres out
  // and carry most of the charge; seeding by |dq| put every seed past the far limit, every line
  // ended on its first step, and both lessons produced NO LINES AT ALL in space -- not lines
  // drawn off-screen, none traced.
  const inFrame=samples.filter(s=>LEN(s.position)<=limit);
  const wire=inFrame.length>1?inFrame:samples;
  for(const {index:i,frac} of along(wire,wanted)){
   const here=spanPoint(wire,i,frac);
   const before=wire[Math.max(0,i-1)].position,after=wire[Math.min(wire.length-1,i+1)].position;
   const tangent=unit({x:after.x-before.x,y:after.y-before.y,z:after.z-before.z})??{x:0,y:1,z:0};
   // Two directions perpendicular to the wire. If the wire runs along z the first cross
   // product vanishes, so a different reference is used there.
   const reference:Vec=Math.abs(tangent.z)<.9?{x:0,y:0,z:1}:{x:1,y:0,z:0};
   const n1=unit(cross(tangent,reference))!,n2=unit(cross(tangent,n1))!;
   for(let k=0;k<around;k++){
    const a=2*Math.PI*(k+.5)/around;
    seeds.push(add(add(here,n1,offset*Math.cos(a)),n2,offset*Math.sin(a)));
   }
  }
  return seeds;
 }
 const wanted=Math.max(1,Math.round(count/(around*2)));
 // Choose only among the rings that are actually on the picture.
 //
 // Seeding by charge is what makes crowding mean field strength, and on every other lesson the
 // partition is even enough that it lands seeds across the drawing. The sheet is cut at
 // |z|·tan(pi t/2), so its outermost ring is not merely the widest: it carries most of the
 // charge on the plane and sits tens of metres out. Choosing by |dq| alone put EVERY seed
 // beyond the frame -- measured at 91 m against a drawn region of 7.5 -- every line left the
 // picture within a step, and all of them were discarded. The lesson about the field of an
 // infinite sheet drew no field at all.
 //
 // Restricting the choice does not weaken the meaning: within the visible rings the seeding is
 // still proportional to charge, and since a ring at radius s carries charge proportional to
 // s ds, that is a constant number of lines per unit area -- which is exactly the uniform
 // field an infinite sheet has. The disk, whose rings all lie on the picture, is unchanged.
 const near=samples.filter(s=>Math.abs(s.coordinate)<=limit);
 const pool=near.length?near:samples.slice(0,Math.max(1,Math.ceil(samples.length/4)));
 for(const i of chosen(pool,wanted)){
  const r=Math.max(Math.abs(pool[i].coordinate),offset*.5);
  for(let k=0;k<around;k++){
   const a=2*Math.PI*(k+.5)/around+i*.37;
   seeds.push({x:r*Math.cos(a),y:r*Math.sin(a),z:offset});
   seeds.push({x:r*Math.cos(a),y:r*Math.sin(a),z:-offset});
  }
 }
 return seeds;
}
/** Where the two line builders stop a line, and the field they have it follow.
 *
 * A wire's elements are points, and each stops a line at its own spacing with a floor of one step
 * (see localRadii): within a step of a point the field turns further than the step is long.
 *
 * A surface stops a line on the annulus instead (see TraceOptions.clear), and at HALF a step. The
 * one-step floor is about the field turning, and a face does not turn it: above a uniformly charged
 * plane the field is the same at every height. What a step does forbid is jumping the face, and a
 * step from at least c above it cannot land more than c below it while the step is at most 2c --
 * so half a step is as close as a line can come and still be caught. With the one-step floor, 0.23 m
 * on the sheet, not one of its lines came within 0.3 m of the face it is the field of. */
function stopping(samples:readonly ChargeSample[],layout:Layout,options:TraceOptions){
 const step=options.step??.06,radii=localRadii(samples,Math.max(ARRIVED,step*.9)),arrive=Math.min(...radii);
 if(layout!=='surface')return {arrive,stops:{arrive,radii}};
 return {arrive,stops:{arrive,radii,clear:bodyDistance(samples,'surface'),clearance:Math.max(ARRIVED,step/2),field:fieldOf(samples,layout)}};
}
/** Trace both halves through every seed and join them, each line ordered along the field.
 *
 * Both halves are traced against the grid as it stood BEFORE this line, then added together:
 * otherwise the second half stops against the first at the seed they share. Where a half arrived
 * and the caller asked for roots, the line is then carried on to the body (see TraceOptions.root). */
function throughSeeds(samples:readonly ChargeSample[],layout:Layout,seeds:readonly Vec[],options:TraceOptions,stops:TraceOptions,crowd:number):Vec[][]{
 const drawn=drawnPoints(Math.max(crowd,1e-6));
 const foot=options.root?bodyFoot(samples,layout):null,inset=options.root?.inset??0;
 /** The point `inset` short of the body on the way from `q` to its foot, or null where `q` is
  * already that close -- a line never doubles back to meet its own tube. */
 const rootOf=(q:Vec):Vec|null=>{
  const f=foot?.(q.x,q.y,q.z);if(!f)return null;
  const d=Math.hypot(q.x-f.x,q.y-f.y,q.z-f.z);
  if(!(d>inset+1e-9))return null;
  const k=inset/d;return {x:f.x+(q.x-f.x)*k,y:f.y+(q.y-f.y)*k,z:f.z+(q.z-f.z)*k};
 };
 const lines:Vec[][]=[];
 for(const seed of seeds){
  const along=trace3(samples,seed,{...options,...stops,crowd,drawn,sign:1});
  const against=trace3(samples,seed,{...options,...stops,crowd,drawn,sign:-1});
  const line=[...against.path.slice(1).reverse(),...along.path];
  if(line.length<=3)continue;
  for(const q of line)drawn.add(q);
  if(foot){
   const head=against.arrived?rootOf(line[0]):null,tail=along.arrived?rootOf(line[line.length-1]):null;
   if(head)line.unshift(head);
   if(tail)line.push(tail);
  }
  lines.push(line);
 }
 return lines;
}
/** Full streamlines through every seed, each ordered along the field whichever way it runs. */
export function spaceLines(samples:readonly ChargeSample[],layout:Layout,count:number,options:TraceOptions={}):Vec[][]{
 const {arrive,stops}=stopping(samples,layout,options);
 const reach=Math.max(...samples.map(s=>LEN(s.position)),.5);
 // The offset comes from the PICTURE, like everything else here. Scaling it by the charge's own
 // extent launched the sheet's lines twenty-one metres above the plane -- its refined partition
 // reaches 355 m -- so every line began outside the frame and was discarded on its first step.
 const span=options.seedLimit??options.outerLimit??reach;
 const seeds=spaceSeeds(samples,layout,count,Math.max(arrive*1.6,span*.06),4,options.seedPool??options.seedLimit??options.outerLimit??Infinity);
 return throughSeeds(samples,layout,seeds,options,stops,options.crowd??span*.012);
}
/** HOW FAR THE SCENE TRACES A LINE: until the drawing has faded it to nothing, 1.35 reaches from the
 * charge's body, where `lineStrength` reaches zero (see TraceOptions.far) -- with the sphere about O
 * kept only as a guard, at three reaches, and enough steps to get there. The step is the smaller of
 * the picture and the charge, as it always was. `span` is how far the charge itself runs from O. */
export function traceTo(samples:readonly ChargeSample[],layout:Layout,reach:number,span:number,extra:TraceOptions={}):TraceOptions{
 const away=bodyDistance(samples,layout==='surface'?'surface':'wire'),step=Math.min(reach,span)*.04,gone=reach*1.35;
 return {step,maxSteps:Math.min(1200,Math.max(420,Math.ceil(2*gone/step))),outerLimit:Math.max(reach*3,span+gone),far:v=>away(v.x,v.y,v.z)>gone,...extra};
}
/** The side view of a ring, a disk or a sheet is a cut through the plane y = 0, and every
 * one of them is symmetric about its axis, so a line that starts in that plane stays in it.
 * Seeds on the cut -- either side of where a wire crosses it, or above and below a surface
 * along its radius -- give the textbook cross-section of the field. */
export function meridianLines(samples:readonly ChargeSample[],layout:Layout,count:number,options:TraceOptions={}):Vec[][]{
 const {arrive,stops}=stopping(samples,layout,options);
 // The picture's extent where the caller knows it; the charge's own only as a fallback. The
 // sheet's charge runs ninety metres, and an offset or a crowding radius scaled to that puts
 // every seed and every line outside the frame.
 const span=options.seedLimit??options.outerLimit??Math.max(...samples.map(s=>LEN(s.position)),.5);
 const offset=Math.max(arrive*1.6,span*.06);
 const seeds:Vec[]=[];
 if(layout==='wire'){
  // Where the wire crosses the cut: the samples nearest y = 0 on each side of the axis.
  const crossings=[...samples].sort((a,b)=>Math.abs(a.position.y)-Math.abs(b.position.y)).slice(0,8);
  const seen=new Set<string>();
  for(const s of crossings){
   const key=`${Math.sign(s.position.x)}`;
   if(seen.has(key))continue;seen.add(key);
   const around=Math.max(2,Math.round(count/2));
   for(let k=0;k<around;k++){const a=2*Math.PI*(k+.5)/around;seeds.push({x:s.position.x+offset*Math.cos(a),y:0,z:offset*Math.sin(a)});}
  }
 }else{
  const out=Math.max(span,options.seedSpan??span);
  const near=samples.filter(s=>Math.abs(s.coordinate)<=out);
  const pool=near.length?near:samples.slice(0,Math.max(1,Math.ceil(samples.length/4)));
  // As many lines per metre of the cut as count/4 spread over the field's reach, never fewer.
  const reached=Math.max(...pool.map(s=>Math.abs(s.coordinate)));
  const wanted=Math.max(1,Math.round(count/4*Math.max(1,reached/span)));
  for(const r0 of sliceRadii(pool,wanted)){
   const r=Math.max(r0,offset*.5);
   for(const side of [1,-1])for(const sign of [1,-1])seeds.push({x:side*r,y:0,z:sign*offset});
  }
 }
 return throughSeeds(samples,layout,seeds,options,stops,options.crowd??span*.012);
}
/** Where a side view's lines leave a surface: at equal steps of CHARGE PER UNIT LENGTH OF THE CUT,
 * sigma ds -- not of each annulus' charge.
 *
 * In space a ring at radius s carries charge in proportion to s ds, and seeding by it is right:
 * lines per unit AREA follow the charge. A side view is a cut through the axis, and there the
 * surface is a line; lines per unit LENGTH of it must follow sigma, or a uniform sheet is drawn
 * with its lines crowding outward like the square root of the radius. That is what it was: the
 * infinite sheet -- the lesson whose whole point is that its field is the same everywhere -- drawn
 * with a 1.7 m hole over its axis and P, and the disk's lines bunched toward its rim.
 *
 * Each annulus is weighted by |dq|/s, and the seed is placed inside the band it stands for rather
 * than on its middle, so a coarse partition still lands its seeds evenly. */
export function sliceRadii(pool:readonly ChargeSample[],wanted:number):number[]{
 const n=pool.length;
 if(!n)return [];
 const c=pool.map(s=>Math.abs(s.coordinate));
 // The band each annulus stands for: halfway to its neighbours, the outer ones mirrored.
 const lo=(i:number)=>i>0?(c[i-1]+c[i])/2:n>1?Math.max(0,c[0]-(c[1]-c[0])/2):0;
 const hi=(i:number)=>i<n-1?(c[i]+c[i+1])/2:n>1?c[n-1]+(c[n-1]-c[n-2])/2:c[0];
 const weights=pool.map((s,i)=>Math.abs(s.dq)/Math.max(c[i],(hi(i)-lo(i))/2,1e-9));
 const total=weights.reduce((a,b)=>a+b,0);
 if(!(total>0))return [];
 const out:number[]=[];let index=0,carried=weights[0];
 for(let j=0;j<wanted;j++){
  const target=total*(j+.5)/wanted;
  while(carried<target&&index<n-1){index+=1;carried+=weights[index];}
  const frac=weights[index]>0?Math.min(1,Math.max(0,(target-(carried-weights[index]))/weights[index])):.5;
  out.push(lo(index)+(hi(index)-lo(index))*frac);
 }
 return out;
}
export type Arrow3={at:Vec;dir:Vec;magnitude:number;weight:number};
/** A lattice of arrows through the volume, weighted on the same log scale as the flat view.
 * Points on the charge are dropped rather than drawn wrong. The lattice is offset by half a
 * step so no arrow ever sits exactly on an axis or in the plane of the charge, which is where
 * a symmetric field is either zero or points straight along the line the arrow would hide.
 * With `slice`, only the plane y = 0 is filled: the cross-section a side view wants. A slice may
 * also be given the `area` of that plane the picture shows -- x across, z as the area's second
 * coordinate, its edges already on the half-step lattice (see `latticeArea`) -- so the arrows
 * reach the edges of the window rather than stopping at the field's reach. */
export function spaceGrid(samples:readonly ChargeSample[],extent:number,spacing:number,exclude=.14,slice?:'xz',layout:Layout='wire',area?:{x0:number;y0:number;x1:number;y1:number}):Arrow3[]{
 if(!(spacing>0)||!(extent>0)||!samples.length)return [];
 const field=fieldOf(samples,layout);
 // Clearance from the charge itself, not from the points it was cut into: at a coarse partition
 // the lattice slips between the samples and draws an arrow lying on the body, at full weight,
 // showing the field of whichever element it landed nearest. See bodyDistance.
 const clear=bodyDistance(samples,layout==='surface'?'surface':'wire');
 const raw:{at:Vec;dir:Vec;magnitude:number}[]=[];
 const n=Math.floor(extent/spacing);
 const span=(lo:number,hi:number)=>Array.from({length:Math.max(0,Math.round((hi-lo)/spacing)+1)},(_,i)=>lo+i*spacing);
 const half=Array.from({length:2*n},(_,i)=>(i-n+.5)*spacing);
 const xs=slice&&area?span(area.x0,area.x1):half,ys=slice?[0]:half,zs=slice&&area?span(area.y0,area.y1):half;
 for(const x of xs)for(const y of ys)for(const z of zs){
  const at={x,y,z};
  if(clear(at.x,at.y,at.z)<exclude)continue;
  const e=field(at),magnitude=LEN(e);
  if(!Number.isFinite(magnitude)||magnitude<=0)continue;
  raw.push({at,dir:scale(e,1/magnitude),magnitude});
 }
 const weights=logWeights(raw.map(a=>a.magnitude));
 return raw.map((a,i)=>({...a,weight:weights[i]}));
}
/** THE INFINITE SHEET'S FIELD IN SPACE, drawn as what it is: straight lines, square to the plane,
 * equally dense everywhere, leaving both faces.
 *
 * It used to be traced like every other charge, from a few rings chosen by charge, at four
 * azimuths each, and only out to a sphere about O. In the one lesson whose field is the same
 * everywhere, lines began and ended in mid-air at random heights -- sources and sinks that do not
 * exist -- and came in clumps ten pixels apart beside gaps of a hundred, when line density is meant
 * to BE field strength. Gauss settles the field outright: sigma/2 epsilon_0, normal to the sheet, on
 * both sides, at every distance; and the traced lines agree with it to under two per cent of their
 * height (see the drawn-field truth tests). So nothing is traced. Each line leaves the plane at one
 * of `roots` and runs `length` straight out, which is meant to be past every edge of the picture,
 * and is ordered along the field: away from the sheet for positive charge, into it for negative. */
export function sheetLines(roots:readonly {x:number;y:number}[],length:number,sign:number):Vec[][]{
 const lines:Vec[][]=[];
 for(const {x,y} of roots)for(const side of [1,-1]){
  const root={x,y,z:0},end={x,y,z:side*length};
  lines.push(sign>=0?[root,end]:[end,root]);
 }
 return lines;
}
/** Where the sheet's lines leave it: `count` points over a disc of `radius` about O, a sunflower --
 * the golden angle round, the square root out -- which puts the same number of lines on every patch
 * of the plane, as a uniform field has, with no rows for the camera to line up into clumps from
 * whichever direction it is turned. A square lattice, seen at a slant, prints as clumped rows. */
export function sheetRoots(radius:number,count:number):{x:number;y:number}[]{
 const golden=Math.PI*(3-Math.sqrt(5)),roots:{x:number;y:number}[]=[];
 for(let k=0;k<count;k++){
  const r=radius*Math.sqrt((k+.5)/count),a=k*golden+.4;
  roots.push({x:r*Math.cos(a),y:r*Math.sin(a)});
 }
 return roots;
}
/** THE ARROWS THE SCENE DRAWS: a readable subset of the lattice, not the whole cube. Six by six by
 * six, each three to four times the length of a flat arrow, ran over the charge, P, the net arrow
 * and the labels. What is drawn is four by four by four about `centre`, where the field has its shape,
 * weighted among themselves. Half a step off every plane through the centre, as the lattice always
 * is, so a surface has as many arrows under it as over it. See `latticeFrame` for where it stands. */
export function latticeCore(samples:readonly ChargeSample[],reach:number,layout:Layout,centre:Vec={x:0,y:0,z:0},spacing=reach/3):Arrow3[]{
 if(!(spacing>0)||!samples.length)return [];
 const field=fieldOf(samples,layout),clear=bodyDistance(samples,layout==='surface'?'surface':'wire');
 const steps=[-1.5,-.5,.5,1.5].map(k=>k*spacing),raw:{at:Vec;dir:Vec;magnitude:number}[]=[];
 for(const dx of steps)for(const dy of steps)for(const dz of steps){
  const at={x:centre.x+dx,y:centre.y+dy,z:centre.z+dz};
  if(clear(at.x,at.y,at.z)<.14)continue;
  const e=field(at),magnitude=LEN(e);
  if(!Number.isFinite(magnitude)||magnitude<=0)continue;
  raw.push({at,dir:scale(e,1/magnitude),magnitude});
 }
 const weights=logWeights(raw.map(a=>a.magnitude));
 return raw.map((a,i)=>({...a,weight:weights[i]}));
}
/** WHERE THE ARROWS STAND: about the middle of the charge and P together, not about O.
 *
 * The cube was centred on the world's origin, and O is where each lesson's own labels need it, not
 * the middle of what the lesson is about. On the rod seen along its axis O is the rod's END: half the
 * arrows stood in empty space behind it, and none lay between the rod's far end and P, or round P --
 * the gap the lesson is about -- while the flat arrows cover the whole window. So the cube is centred
 * on the middle of the box holding the charge and P, rounded to a whole step so the arrows stand still
 * as P moves a little, and opened up until that box fits inside it. A charge that goes on past the
 * picture (`endless`) keeps O, which is the middle of everything it has. */
export function latticeFrame(points:readonly Vec[],reach:number,endless=false):{centre:Vec;spacing:number}{
 const base=reach/3;
 if(endless||!points.length)return {centre:{x:0,y:0,z:0},spacing:base};
 const lo={x:Infinity,y:Infinity,z:Infinity},hi={x:-Infinity,y:-Infinity,z:-Infinity};
 for(const v of points){lo.x=Math.min(lo.x,v.x);lo.y=Math.min(lo.y,v.y);lo.z=Math.min(lo.z,v.z);hi.x=Math.max(hi.x,v.x);hi.y=Math.max(hi.y,v.y);hi.z=Math.max(hi.z,v.z);}
 const half=Math.max(hi.x-lo.x,hi.y-lo.y,hi.z-lo.z)/2,spacing=Math.max(base,half/1.45);
 const snap=(v:number)=>Math.round(v/spacing)*spacing+0;
 return {centre:{x:snap((lo.x+hi.x)/2),y:snap((lo.y+hi.y)/2),z:snap((lo.z+hi.z)/2)},spacing};
}
