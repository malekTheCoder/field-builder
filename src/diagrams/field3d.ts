import {K} from '../distributions/constants';
import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
import {logWeights} from './vectorfield';
/** The field in space, for the 3D view.
 *
 * The flat view traces the field in the plane the planar lessons live in. In space there is
 * no such plane: a ring's field wraps round the wire, a disk's rises off both faces. So the
 * same discretised charge the rest of the app sums is summed in three dimensions here, and
 * lines and arrows are placed in the volume rather than on a slice of it. */
const ARRIVED=.05;
/** The charge as points the field can be summed from.
 *
 * A wire's samples already are points. A disk's or a sheet's are annuli: each sample is a
 * whole ring at one radius, and its position is only a representative point on it. Summing
 * Coulomb from that point would make a disk into a row of charges along one radius. Each
 * annulus is spread round its ring instead, so the field is the surface's. */
export function cloud(samples:readonly ChargeSample[],layout:Layout,perRing=16):ChargeSample[]{
 if(layout!=='surface')return [...samples];
 const out:ChargeSample[]=[];
 for(const s of samples){
  const r=Math.abs(s.coordinate);
  if(r<1e-9){out.push({...s,position:{x:0,y:0,z:0}});continue;}
  for(let k=0;k<perRing;k++){const a=2*Math.PI*(k+.5)/perRing;out.push({...s,position:{x:r*Math.cos(a),y:r*Math.sin(a),z:0},dq:s.dq/perRing});}
 }
 return out;
}
/** How far apart the points are, so a line can stop before the discretisation shows.
 * Within about one spacing of a point charge the summed field bends toward that particular
 * point rather than the wire it stands for, and a line traced there wiggles at its root. */
export function typicalSpacing(points:readonly ChargeSample[]):number{
 const gaps:number[]=[];
 for(let i=1;i<Math.min(points.length,60);i++){const a=points[i-1].position,b=points[i].position;gaps.push(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));}
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
function heading(samples:readonly ChargeSample[],at:Vec,sign:number):Vec|null{
 const e=spaceField(samples,at),l=LEN(e);
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
 /** How close to a point charge counts as having arrived. */
 arrive?:number;
 /** Jobard and Lefer's dtest rule, and only that rule — their even seeding would destroy
  * density meaning field strength. About one drawn line width: below it two lines are the
  * same stroke and the second says nothing the first did not. */
 crowd?:number; drawn?:ReturnType<typeof drawnPoints>};
/** One streamline in space, RK4 on the unit field direction so each step is one honest
 * increment of arc length; stops on leaving the picture or arriving at the charge. */
export function traceLine3(samples:readonly ChargeSample[],start:Vec,options:TraceOptions={}):Vec[]{
 const step=options.step??.06,maxSteps=options.maxSteps??600,outer=options.outerLimit??40,sign=options.sign??1,arrive=options.arrive??ARRIVED;
 const {crowd=0,drawn}=options;
 const path:Vec[]=[{...start}];
 let here:Vec={...start};
 for(let i=0;i<maxSteps;i++){
  const k1=heading(samples,here,sign);if(!k1)break;
  const k2=heading(samples,add(here,k1,step/2),sign);if(!k2)break;
  const k3=heading(samples,add(here,k2,step/2),sign);if(!k3)break;
  const k4=heading(samples,add(here,k3,step),sign);if(!k4)break;
  const next:Vec={x:here.x+step*(k1.x+2*k2.x+2*k3.x+k4.x)/6,y:here.y+step*(k1.y+2*k2.y+2*k3.y+k4.y)/6,z:here.z+step*(k1.z+2*k2.z+2*k3.z+k4.z)/6};
  if(![next.x,next.y,next.z].every(Number.isFinite))break;
  path.push(next);here=next;
  if(LEN(here)>outer)break;
  // Not at the root: every line leaves the charge from nearly the same place.
  if(crowd>0&&drawn&&i>4&&drawn.within(here,crowd))break;
  let arrived=false;
  for(const s of samples)if(Math.hypot(here.x-s.position.x,here.y-s.position.y,here.z-s.position.z)<arrive){arrived=true;break;}
  if(arrived)break;
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
 const weights=samples.map(s=>Math.abs(s.dq)),total=weights.reduce((a,b)=>a+b,0);
 if(!(total>0)||!samples.length)return [];
 const out:number[]=[];let index=0,carried=weights[0];
 for(let j=0;j<wanted;j++){
  const target=total*(j+.5)/wanted;
  while(carried<target&&index<weights.length-1){index+=1;carried+=weights[index];}
  out.push(index);
 }
 return out;
}
/** Seeds around a wire: a few directions perpendicular to it at each chosen element, so the
 * lines leave the wire on every side rather than only in one plane. Around a surface: points
 * on the chosen annulus at several azimuths, launched off both faces. */
export function spaceSeeds(samples:readonly ChargeSample[],layout:Layout,count:number,offset:number,around=4):Vec[]{
 const seeds:Vec[]=[];
 if(samples.length<2)return seeds;
 if(layout==='wire'){
  const wanted=Math.max(1,Math.round(count/around));
  for(const i of chosen(samples,wanted)){
   const here=samples[i].position;
   const before=samples[Math.max(0,i-1)].position,after=samples[Math.min(samples.length-1,i+1)].position;
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
 for(const i of chosen(samples,wanted)){
  const r=Math.max(Math.abs(samples[i].coordinate),offset*.5);
  for(let k=0;k<around;k++){
   const a=2*Math.PI*(k+.5)/around+i*.37;
   seeds.push({x:r*Math.cos(a),y:r*Math.sin(a),z:offset});
   seeds.push({x:r*Math.cos(a),y:r*Math.sin(a),z:-offset});
  }
 }
 return seeds;
}
/** Full streamlines through every seed, each ordered along the field whichever way it runs. */
export function spaceLines(samples:readonly ChargeSample[],layout:Layout,count:number,options:TraceOptions={}):Vec[][]{
 const points=cloud(samples,layout),arrive=Math.max(ARRIVED,.55*typicalSpacing(points));
 const reach=Math.max(...samples.map(s=>LEN(s.position)),.5);
 const seeds=spaceSeeds(samples,layout,count,Math.max(arrive*1.6,reach*.06));
 // Both halves are traced against the grid as it stood BEFORE this line, then added
 // together: otherwise the second half stops against the first at the seed they share.
 const crowd=options.crowd??reach*.012;
 const drawn=drawnPoints(Math.max(crowd,1e-6));
 const lines:Vec[][]=[];
 for(const seed of seeds){
  const along=traceLine3(points,seed,{...options,arrive,crowd,drawn,sign:1});
  const against=traceLine3(points,seed,{...options,arrive,crowd,drawn,sign:-1});
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
 const points=cloud(samples,layout),arrive=Math.max(ARRIVED,.55*typicalSpacing(points));
 const reach=Math.max(...samples.map(s=>LEN(s.position)),.5),offset=Math.max(arrive*1.6,reach*.06);
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
  for(const i of chosen(samples,wanted)){
   const r=Math.max(Math.abs(samples[i].coordinate),offset*.5);
   for(const side of [1,-1])for(const sign of [1,-1])seeds.push({x:side*r,y:0,z:sign*offset});
  }
 }
 // Both halves are traced against the grid as it stood BEFORE this line, then added
 // together: otherwise the second half stops against the first at the seed they share.
 const crowd=options.crowd??reach*.012;
 const drawn=drawnPoints(Math.max(crowd,1e-6));
 const lines:Vec[][]=[];
 for(const seed of seeds){
  const along=traceLine3(points,seed,{...options,arrive,crowd,drawn,sign:1});
  const against=traceLine3(points,seed,{...options,arrive,crowd,drawn,sign:-1});
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
 const points=cloud(samples,layout);
 const raw:{at:Vec;dir:Vec;magnitude:number}[]=[];
 const n=Math.floor(extent/spacing);
 for(let i=-n;i<n;i++)for(let j=slice?0:-n;j<(slice?1:n);j++)for(let k=-n;k<n;k++){
  const at={x:(i+.5)*spacing,y:slice?0:(j+.5)*spacing,z:(k+.5)*spacing};
  let near=false;
  for(const s of points)if(Math.hypot(at.x-s.position.x,at.y-s.position.y,at.z-s.position.z)<exclude){near=true;break;}
  if(near)continue;
  const e=spaceField(points,at),magnitude=LEN(e);
  if(!Number.isFinite(magnitude)||magnitude<=0)continue;
  raw.push({at,dir:scale(e,1/magnitude),magnitude});
 }
 const weights=logWeights(raw.map(a=>a.magnitude));
 return raw.map((a,i)=>({...a,weight:weights[i]}));
}
