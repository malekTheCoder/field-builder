import {describe,expect,it} from 'vitest';
import {projectCamera} from '../src/diagrams/camera';
import {cameraBasis,cameraPosition,cross,dot,frameTarget,frustum} from '../src/diagrams/three/orthoCamera';
import type {Vec} from '../src/symbolic/physics';
const ANGLES:[number,number][]=[[-.5,.6],[0,.15],[0,1.3],[1.1,.8],[-2.7,.42],[Math.PI,1.2],[-Math.PI,.3]];
const POINTS:Vec[]=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1},{x:2,y:-3,z:4},{x:-1.4,y:.2,z:-2.6},{x:0,y:0,z:0}];
const len=(v:Vec)=>Math.hypot(v.x,v.y,v.z);
describe('the 3D camera agrees with the projection the SVG already uses',()=>{
 it('reproduces projectCamera exactly, at every angle and for every point',()=>{
  for(const [yaw,pitch] of ANGLES){
   const {right,up}=cameraBasis(yaw,pitch);
   for(const v of POINTS){
    const screen=projectCamera(v,yaw,pitch);
    // Screen x is the projection onto screen-right.
    expect(dot(right,v),`x @${yaw},${pitch}`).toBeCloseTo(screen.x,12);
    // Screen y runs downward, so it is the negation of the projection onto screen-up.
    expect(-dot(up,v),`y @${yaw},${pitch}`).toBeCloseTo(screen.y,12);
   }
  }
 });
 it('is an orthonormal right-handed frame, so nothing is skewed or mirrored',()=>{
  for(const [yaw,pitch] of ANGLES){
   const {right,up,forward}=cameraBasis(yaw,pitch);
   expect(len(right)).toBeCloseTo(1,12);
   expect(len(up)).toBeCloseTo(1,12);
   expect(len(forward)).toBeCloseTo(1,12);
   expect(dot(right,up)).toBeCloseTo(0,12);
   expect(dot(right,forward)).toBeCloseTo(0,12);
   expect(dot(up,forward)).toBeCloseTo(0,12);
   // right × up = forward keeps the handedness; a sign slip here mirrors the scene.
   const c=cross(right,up);
   expect(c.x).toBeCloseTo(forward.x,12);expect(c.y).toBeCloseTo(forward.y,12);expect(c.z).toBeCloseTo(forward.z,12);
  }
 });
 it('places the camera on the viewing side, looking at the origin',()=>{
  for(const [yaw,pitch] of ANGLES){
   const eye=cameraPosition(yaw,pitch,12),{forward}=cameraBasis(yaw,pitch);
   expect(len(eye)).toBeCloseTo(12,10);
   // The eye lies along +forward, so the camera looks back along −forward at the origin.
   expect(dot(eye,forward)).toBeGreaterThan(0);
  }
 });
 it('keeps a point in front of the camera regardless of tilt',()=>{
  // The whole scene sits near the origin; with an orthographic camera pulled back far
  // enough, every part of it stays on the visible side.
  for(const [yaw,pitch] of ANGLES){
   const eye=cameraPosition(yaw,pitch,40),{forward}=cameraBasis(yaw,pitch);
   for(const v of POINTS){
    const toward={x:v.x-eye.x,y:v.y-eye.y,z:v.z-eye.z};
    expect(dot(toward,forward)).toBeLessThan(0); // in front, along −forward
   }
  }
 });
 it('scales so one world unit is exactly the pixel size the SVG uses',()=>{
  const f=frustum(720,430,42);
  expect(f.right-f.left).toBeCloseTo(720/42,12);
  expect(f.top-f.bottom).toBeCloseTo(430/42,12);
  expect(f.left).toBeCloseTo(-f.right,12);
  expect(f.bottom).toBeCloseTo(-f.top,12);
  // Doubling the pixels-per-unit halves how much world the frame covers.
  const tighter=frustum(720,430,84);
  expect(tighter.right).toBeCloseTo(f.right/2,12);
 });
});
describe('lining the 3D origin up with the SVG origin',()=>{
 it('puts the world origin exactly on the SVG origin, at every angle',()=>{
  const frame={width:720,height:430},unit=42;
  for(const [yaw,pitch] of ANGLES)for(const origin of [{x:315,y:296},{x:360,y:215},{x:130,y:230},{x:660,y:70}]){
   const target=frameTarget(origin,frame,unit,yaw,pitch);
   // How the renderer places a world point: frame centre, plus the projection of the
   // point measured from the target, scaled to pixels.
   const at=(v:Vec)=>{const s=projectCamera({x:v.x-target.x,y:v.y-target.y,z:v.z-target.z},yaw,pitch);
    return {x:frame.width/2+unit*s.x,y:frame.height/2+unit*s.y};};
   const drawn=at({x:0,y:0,z:0});
   expect(drawn.x,`x @${yaw},${pitch}`).toBeCloseTo(origin.x,9);
   expect(drawn.y,`y @${yaw},${pitch}`).toBeCloseTo(origin.y,9);
  }
 });
 it('keeps every other point in step with the SVG too, not just the origin',()=>{
  const frame={width:720,height:430},unit=42,origin={x:315,y:296},yaw=-.5,pitch=.6;
  const target=frameTarget(origin,frame,unit,yaw,pitch);
  for(const v of POINTS){
   const s3=projectCamera({x:v.x-target.x,y:v.y-target.y,z:v.z-target.z},yaw,pitch);
   const three={x:frame.width/2+unit*s3.x,y:frame.height/2+unit*s3.y};
   // What the SVG itself draws for the same point.
   const flat=projectCamera(v,yaw,pitch);
   const svg={x:origin.x+unit*flat.x,y:origin.y+unit*flat.y};
   expect(three.x).toBeCloseTo(svg.x,9);
   expect(three.y).toBeCloseTo(svg.y,9);
  }
 });
});
