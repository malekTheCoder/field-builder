import {K} from '../distributions/constants';
import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
import {bodyDistance,logWeights} from './vectorfield';
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
 /** How far out lines may START, as opposed to how far they may run. The two differ on the
  * sheet: a line may usefully run well past the edge of the drawing, but one that BEGINS out
  * there is drawn entirely off the picture. Defaults to `outerLimit`. */
 seedLimit?:number;
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
 crowd?:number; drawn?:ReturnType<typeof drawnPoints>};
/** One streamline in space, RK4 on the unit field direction so each step is one honest
 * increment of arc length; stops on leaving the picture or arriving at the charge. */
export function traceLine3(samples:readonly ChargeSample[],start:Vec,options:TraceOptions={}):Vec[]{
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
    break;
   }
  }
  path.push(next);here=next;
  if(LEN(here)>outer)break;
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
   break;
  }
 }
 return path;
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
/** Full streamlines through every seed, each ordered along the field whichever way it runs. */
export function spaceLines(samples:readonly ChargeSample[],layout:Layout,count:number,options:TraceOptions={}):Vec[][]{
 const {arrive,stops}=stopping(samples,layout,options);
 const reach=Math.max(...samples.map(s=>LEN(s.position)),.5);
 // The offset comes from the PICTURE, like everything else here. Scaling it by the charge's own
 // extent launched the sheet's lines twenty-one metres above the plane -- its refined partition
 // reaches 355 m -- so every line began outside the frame and was discarded on its first step.
 const span=options.seedLimit??options.outerLimit??reach;
 const seeds=spaceSeeds(samples,layout,count,Math.max(arrive*1.6,span*.06),4,options.seedLimit??options.outerLimit??Infinity);
 // Both halves are traced against the grid as it stood BEFORE this line, then added
 // together: otherwise the second half stops against the first at the seed they share.
 const crowd=options.crowd??span*.012;
 const drawn=drawnPoints(Math.max(crowd,1e-6));
 const lines:Vec[][]=[];
 for(const seed of seeds){
  const along=traceLine3(samples,seed,{...options,...stops,crowd,drawn,sign:1});
  const against=traceLine3(samples,seed,{...options,...stops,crowd,drawn,sign:-1});
  const line=[...against.slice(1).reverse(),...along];
  if(line.length>3){lines.push(line);for(const q of line)drawn.add(q);}
 }
 return lines;
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
  const wanted=Math.max(1,Math.round(count/4));
  const near=samples.filter(s=>Math.abs(s.coordinate)<=span);
  const pool=near.length?near:samples.slice(0,Math.max(1,Math.ceil(samples.length/4)));
  for(const i of chosen(pool,wanted)){
   const r=Math.max(Math.abs(pool[i].coordinate),offset*.5);
   for(const side of [1,-1])for(const sign of [1,-1])seeds.push({x:side*r,y:0,z:sign*offset});
  }
 }
 // Both halves are traced against the grid as it stood BEFORE this line, then added
 // together: otherwise the second half stops against the first at the seed they share.
 const crowd=options.crowd??span*.012;
 const drawn=drawnPoints(Math.max(crowd,1e-6));
 const lines:Vec[][]=[];
 for(const seed of seeds){
  const along=traceLine3(samples,seed,{...options,...stops,crowd,drawn,sign:1});
  const against=traceLine3(samples,seed,{...options,...stops,crowd,drawn,sign:-1});
  const line=[...against.slice(1).reverse(),...along];
  if(line.length>3){lines.push(line);for(const q of line)drawn.add(q);}
 }
 return lines;
}
export type Arrow3={at:Vec;dir:Vec;magnitude:number;weight:number};
/** A lattice of arrows through the volume, weighted on the same log scale as the flat view.
 * Points on the charge are dropped rather than drawn wrong. The lattice is offset by half a
 * step so no arrow ever sits exactly on an axis or in the plane of the charge, which is where
 * a symmetric field is either zero or points straight along the line the arrow would hide.
 * With `slice`, only the plane y = 0 is filled: the cross-section a side view wants. */
export function spaceGrid(samples:readonly ChargeSample[],extent:number,spacing:number,exclude=.14,slice?:'xz',layout:Layout='wire'):Arrow3[]{
 if(!(spacing>0)||!(extent>0)||!samples.length)return [];
 const field=fieldOf(samples,layout);
 // Clearance from the charge itself, not from the points it was cut into: at a coarse partition
 // the lattice slips between the samples and draws an arrow lying on the body, at full weight,
 // showing the field of whichever element it landed nearest. See bodyDistance.
 const clear=bodyDistance(samples,layout==='surface'?'surface':'wire');
 const raw:{at:Vec;dir:Vec;magnitude:number}[]=[];
 const n=Math.floor(extent/spacing);
 for(let i=-n;i<n;i++)for(let j=slice?0:-n;j<(slice?1:n);j++)for(let k=-n;k<n;k++){
  const at={x:(i+.5)*spacing,y:slice?0:(j+.5)*spacing,z:(k+.5)*spacing};
  if(clear(at.x,at.y,at.z)<exclude)continue;
  const e=field(at),magnitude=LEN(e);
  if(!Number.isFinite(magnitude)||magnitude<=0)continue;
  raw.push({at,dir:scale(e,1/magnitude),magnitude});
 }
 const weights=logWeights(raw.map(a=>a.magnitude));
 return raw.map((a,i)=>({...a,weight:weights[i]}));
}
