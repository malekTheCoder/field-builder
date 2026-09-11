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
