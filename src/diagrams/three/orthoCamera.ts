import type {Vec} from '../../symbolic/physics';
/** The 3D layer has to agree with the SVG drawn on top of it, exactly and at every camera
 * angle, or labels drift off the things they label. Rather than tune two projections until
 * they look close, the orthographic basis is derived here from the same yaw and pitch the
 * SVG already uses, and a test asserts it reproduces `projectCamera` to floating-point
 * precision. Alignment then cannot rot. */
export type Basis={right:Vec;up:Vec;forward:Vec};
const unitVec=(x:number,y:number,z:number):Vec=>({x,y,z});
export const dot=(a:Vec,b:Vec)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const cross=(a:Vec,b:Vec):Vec=>unitVec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
/** Screen right, screen up, and the direction the camera looks along.
 *
 * `projectCamera` maps a world point to screen x = right·v and screen y = −up·v; screen y
 * runs downward, which is why the camera's up is the negation of the projection's second
 * row rather than the row itself. */
export function cameraBasis(yaw:number,pitch:number):Basis{
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const right=unitVec(cy,sy,0);
 const up=unitVec(-sy*sp,cy*sp,cp);
 // Looking down −forward, so the camera sits at +forward from what it looks at.
 return {right,up,forward:cross(right,up)};
}
/** Where to put an orthographic camera so it frames the origin from the given angles. */
export function cameraPosition(yaw:number,pitch:number,distance:number):Vec{
 const {forward}=cameraBasis(yaw,pitch);
 return unitVec(forward.x*distance,forward.y*distance,forward.z*distance);
}
/** The half-extents an orthographic frustum needs so that one world unit covers exactly
 * `unit` pixels inside a viewBox of the given size. Without this the 3D layer and the SVG
 * agree on direction but not on scale, which is the subtler half of lining up. */
export function frustum(viewWidth:number,viewHeight:number,unit:number){
 const halfWidth=viewWidth/(2*unit),halfHeight=viewHeight/(2*unit);
 return {left:-halfWidth,right:halfWidth,top:halfHeight,bottom:-halfHeight};
}
/** The world point that must sit at the centre of the frame so that the world origin lands
 * exactly on the SVG's origin.
 *
 * The SVG does not centre its origin — each geometry places it where its labels and brackets
 * need it. Rendering the 3D body about the frame centre instead leaves two copies of the
 * same ring an inch apart, which is what happens if you skip this. */
export function frameTarget(origin:{x:number;y:number},frame:{width:number;height:number},unit:number,yaw:number,pitch:number):Vec{
 const {right,up}=cameraBasis(yaw,pitch);
 const dx=(frame.width/2-origin.x)/unit,dy=(frame.height/2-origin.y)/unit;
 // screen y runs down, so a downward offset is a negative step along camera up.
 return {x:right.x*dx-up.x*dy,y:right.y*dx-up.y*dy,z:right.z*dx-up.z*dy};
}
/** Where the SVG itself would draw a world point, in its own viewBox units.
 *
 * This is the figure's own `project`, rebuilt from the basis above rather than from a second
 * copy of the projection, so a tick the scene cuts into an axis and the number written beside
 * it cannot drift apart. The test that pins `cameraBasis` to `projectCamera` pins this too. */
export function projectPoint(v:Vec,origin:{x:number;y:number},unit:number,yaw:number,pitch:number):{x:number;y:number}{
 const {right,up}=cameraBasis(yaw,pitch);
 // Screen y runs downward, which is why up is subtracted rather than added.
 return {x:origin.x+unit*dot(right,v),y:origin.y-unit*dot(up,v)};
}
const LADDER=[1,2,5];
/** The spacing of the ticks that get a number: a 1-2-5 step chosen so that no half-axis
 * carries more than `most` of them.
 *
 * Scale is read off a couple of round numbers. A number against every metre is a ruler, and a
 * ruler laid through the middle of a figure is clutter. How many actually get drawn is capped
 * separately, in `axisTickLabels`: the step only has to be fine enough that a number exists
 * near the origin, since three axes running both ways is six of everything. */
export function tickStep(extent:number,most=3):number{
 if(!(extent>0))return 1;
 for(let decade=-2;decade<=7;decade++)for(const m of LADDER){
  const step=m*10**decade;
  if(Math.floor(extent/step+1e-9)<=most)return step;
 }
 return extent;
}
/** A tick's number, written the short way: 5 rather than 5.0, 0.5 rather than 0.50. */
export const tickText=(value:number)=>{
 const rounded=Number(value.toFixed(2));
 return Object.is(rounded,-0)?'0':String(rounded);
};
export type TickLabel={key:string;x:number;y:number;text:string};
export type TickLabelOptions={
 /** How far the axes run, in metres. */
 extent:number;
 origin:{x:number;y:number};frame:{width:number;height:number};unit:number;yaw:number;pitch:number;
 /** How far off the axis a number sits, and how close two of them may come, in viewBox units. */
 offset?:number;gap?:number;
 /** How many numbers the picture may carry at once. Three axes running both ways is six of
  * everything, and a figure that answers "how big is this" six times over has stopped
  * answering it: the nearest ones are kept, which is one at the end of each visible axis. */
 limit?:number;
 /** The drawing area numbers are allowed inside, in viewBox units. */
 bounds?:{left:number;top:number;right:number;bottom:number};
 /** Patches of the picture already spoken for -- P and its letter, above all, which on a ring,
  * a disk or a sheet sits squarely on the z axis and would otherwise collect a number on top
  * of it at whatever distance happens to land on a tick. */
 avoid?:{x:number;y:number;r?:number}[];
};
/** Numbers for the axis ticks, in the SVG's coordinates, so the scene can be measured.
 *
 * Metre ticks alone say the scale is regular; they do not say whether the rod is one metre
 * long or eight. The numbers are placed off the line rather than on it, culled to the picture,
 * and thinned so that two of them never land on each other -- including at the origin, where
 * all three axes cross and where the figure already draws its own mark. */
export function axisTickLabels(o:TickLabelOptions):TickLabel[]{
 const {extent,origin,frame,unit,yaw,pitch,offset=12,gap=20,limit=8}=o;
 // The top of the frame carries the figure's own chrome -- the kicker, the scale bar and the
 // drawn gesture legend -- so numbers start below all of it rather than being placed into it.
 const bounds=o.bounds??{left:48,top:80,right:frame.width-48,bottom:frame.height-56};
 if(!(extent>0)||!(unit>0))return [];
 const step=tickStep(extent);
 const axes=[{name:'x',dir:{x:1,y:0,z:0}},{name:'y',dir:{x:0,y:1,z:0}},{name:'z',dir:{x:0,y:0,z:1}}] as const;
 const candidates:{key:string;x:number;y:number;text:string;rank:number}[]=[];
 for(const axis of axes){
  const along=projectPoint(axis.dir,origin,unit,yaw,pitch);
  const dx=along.x-origin.x,dy=along.y-origin.y,length=Math.hypot(dx,dy);
  // An axis pointing nearly at the camera has almost no length on screen, and its numbers
  // would pile onto the origin. It goes unlabelled rather than badly labelled.
  if(length<unit*.2)continue;
  const ux=dx/length,uy=dy/length;
  // The number sits beside the line rather than on it, and above it rather than below.
  // Below is where the figure's own axis letters already are -- each one set down and to the
  // right of its axis -- so a number placed there lands on top of an x or a y at whichever
  // zoom happens to put a tick near one. Above keeps the two apart at every angle without
  // this layer having to know where that layer put anything.
  let nx=-uy,ny=ux;
  if(ny>0||(Math.abs(ny)<1e-9&&nx<0)){nx=-nx;ny=-ny;}
  for(let m=1;m*step<=extent+1e-9;m++)for(const sign of [1,-1]){
   const value=sign*m*step;
   const at=projectPoint({x:axis.dir.x*value,y:axis.dir.y*value,z:axis.dir.z*value},origin,unit,yaw,pitch);
   candidates.push({key:`${axis.name}${value}`,x:at.x+nx*offset,y:at.y+ny*offset,text:tickText(value),rank:m});
  }
 }
 // Nearest first, so when two numbers compete for the same patch of picture the one that
 // reads the scale soonest is the one that survives.
 candidates.sort((a,b)=>a.rank-b.rank||a.key.localeCompare(b.key));
 const taken=[{x:origin.x,y:origin.y,r:28},...(o.avoid??[]).map(a=>({x:a.x,y:a.y,r:a.r??24}))];
 const out:TickLabel[]=[];
 for(const c of candidates){
  if(out.length>=limit)break;
  if(c.x<bounds.left||c.x>bounds.right||c.y<bounds.top||c.y>bounds.bottom)continue;
  if(taken.some(t=>Math.hypot(t.x-c.x,t.y-c.y)<Math.max(t.r,gap)))continue;
  taken.push({x:c.x,y:c.y,r:gap});
  out.push({key:c.key,x:c.x,y:c.y,text:c.text});
 }
 return out;
}
