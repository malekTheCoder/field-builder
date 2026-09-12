import {describe,expect,it} from 'vitest';
import {projectCamera} from '../src/diagrams/camera';
import {axisTickLabels,projectPoint,tickStep,tickText} from '../src/diagrams/three/orthoCamera';
import {bodyReach,fadeOut,frameExtent,SHEET_FADE,surfaceOpacity} from '../src/diagrams/three/bodies';
import type {Vec} from '../src/symbolic/physics';
/* The scene's own sense of scale, and the two edges it must not draw.
 *
 * Everything here is the pure half of three pieces of the 3D figure: the numbers on the axis
 * ticks, the ramp that lets an infinite sheet end without an edge, and how far the frame runs.
 * The drawing itself needs a GPU and is judged by eye; these are the decisions behind it, and
 * they are the ones that go quietly wrong -- a number on top of another number, a plate where
 * a plane should be -- so they are pinned here instead. */
const ANGLES:[number,number][]=[[-.5,.6],[0,.15],[0,1.3],[1.1,.8],[-2.7,.42],[Math.PI,1.2]];
const FRAME={width:720,height:430};
const ORIGIN={x:315,y:296};
describe('a world point in the SVG’s own coordinates',()=>{
 it('is exactly where the figure would draw it, at every angle',()=>{
  const points:Vec[]=[{x:1,y:0,z:0},{x:0,y:2,z:0},{x:0,y:0,z:-3},{x:2,y:-3,z:4},{x:0,y:0,z:0}];
  for(const [yaw,pitch] of ANGLES)for(const unit of [35,42,70])for(const v of points){
   const flat=projectCamera(v,yaw,pitch);
   const mine=projectPoint(v,ORIGIN,unit,yaw,pitch);
   expect(mine.x,`x @${yaw},${pitch}`).toBeCloseTo(ORIGIN.x+unit*flat.x,12);
   expect(mine.y,`y @${yaw},${pitch}`).toBeCloseTo(ORIGIN.y+unit*flat.y,12);
  }
 });
});
describe('how many numbers an axis carries',()=>{
 it('never puts more than a few on one half-axis',()=>{
  for(let extent=1;extent<=400;extent++){
   const step=tickStep(extent);
   expect(Math.floor(extent/step+1e-9),`extent ${extent}`).toBeLessThanOrEqual(3);
  }
 });
 it('picks round numbers, never 3 or 7 metres',()=>{
  for(let extent=1;extent<=400;extent++){
   const step=tickStep(extent),decade=10**Math.floor(Math.log10(step)+1e-9);
   expect([1,2,5],`extent ${extent} gave ${step}`).toContain(Math.round(step/decade));
  }
 });
 it('uses the coarsest step that still says something, so it never over-thins',()=>{
  // One rung finer must break the promise above; otherwise a picture is carrying fewer
  // numbers than it could and the reader is guessing at the scale.
  for(let extent=4;extent<=400;extent++){
   const step=tickStep(extent);
   const ladder=[.01,.02,.05,.1,.2,.5,1,2,5,10,20,50,100,200,500,1000];
   const below=ladder.filter(s=>s<step*.999).pop();
   if(below!==undefined)expect(Math.floor(extent/below+1e-9),`extent ${extent}`).toBeGreaterThan(3);
  }
 });
 it('writes a number the short way',()=>{
  expect(tickText(5)).toBe('5');
  expect(tickText(-10)).toBe('-10');
  expect(tickText(.5)).toBe('0.5');
  expect(tickText(-0)).toBe('0');
 });
});
const labels=(over:Partial<Parameters<typeof axisTickLabels>[0]>={})=>
 axisTickLabels({extent:11,origin:ORIGIN,frame:FRAME,unit:42,yaw:-.5,pitch:.6,...over});
describe('the numbers on the axis ticks',()=>{
 it('names a tick, not a place between two of them',()=>{
  for(const [yaw,pitch] of ANGLES)for(const extent of [3,5,11,26]){
   for(const l of labels({extent,yaw,pitch})){
    const value=Number(l.text);
    expect(Number.isFinite(value)).toBe(true);
    expect(Math.abs(value/tickStep(extent)-Math.round(value/tickStep(extent))),`${l.key}`).toBeLessThan(1e-9);
    expect(Math.abs(value)).toBeLessThanOrEqual(extent+1e-9);
    expect(value).not.toBe(0);
   }
  }
 });
 it('sits beside the tick it names, never on top of it',()=>{
  for(const [yaw,pitch] of ANGLES)for(const l of labels({yaw,pitch})){
   const axis=l.key[0] as 'x'|'y'|'z',value=Number(l.key.slice(1));
   const dir:Vec={x:axis==='x'?value:0,y:axis==='y'?value:0,z:axis==='z'?value:0};
   const tick=projectPoint(dir,ORIGIN,42,yaw,pitch);
   const away=Math.hypot(tick.x-l.x,tick.y-l.y);
   expect(away,`${l.key} @${yaw},${pitch}`).toBeGreaterThan(6);
   expect(away,`${l.key} @${yaw},${pitch}`).toBeLessThan(26);
  }
 });
 it('never puts two of them on each other, and never one on the origin',()=>{
  for(const [yaw,pitch] of ANGLES)for(const extent of [3,5,11,26]){
   const out=labels({extent,yaw,pitch});
   for(let i=0;i<out.length;i++){
    expect(Math.hypot(out[i].x-ORIGIN.x,out[i].y-ORIGIN.y),`${out[i].key} on the origin`).toBeGreaterThanOrEqual(28);
    for(let j=i+1;j<out.length;j++)
     expect(Math.hypot(out[i].x-out[j].x,out[i].y-out[j].y),`${out[i].key} on ${out[j].key}`).toBeGreaterThanOrEqual(20);
   }
  }
 });
 it('keeps every one of them inside the picture',()=>{
  for(const [yaw,pitch] of ANGLES)for(const unit of [20,42,90])for(const l of labels({yaw,pitch,unit})){
   expect(l.x,l.key).toBeGreaterThanOrEqual(48);
   expect(l.x,l.key).toBeLessThanOrEqual(FRAME.width-48);
   expect(l.y,l.key).toBeGreaterThanOrEqual(80);
   expect(l.y,l.key).toBeLessThanOrEqual(FRAME.height-56);
  }
 });
 it('stays clear of what the figure has already put on the picture',()=>{
  // P rides the z axis on a ring, a disk or a sheet, so at a round observation distance a
  // number lands squarely on it unless it is told not to. That is the collision this catches.
  const at=projectPoint({x:0,y:0,z:5},ORIGIN,42,-.5,.6);
  const avoid=[{x:at.x,y:at.y+14,r:34}];
  const without=labels().some(l=>Math.hypot(l.x-avoid[0].x,l.y-avoid[0].y)<34);
  expect(without,'the fixture no longer collides, so it proves nothing').toBe(true);
  for(const l of labels({avoid}))
   expect(Math.hypot(l.x-avoid[0].x,l.y-avoid[0].y),l.key).toBeGreaterThanOrEqual(34);
 });
 it('leaves an axis unlabelled rather than piling its numbers on the origin',()=>{
  // Looking straight down z, the z axis has no length on screen at all.
  const out=axisTickLabels({extent:11,origin:ORIGIN,frame:FRAME,unit:42,yaw:0,pitch:Math.PI/2});
  expect(out.some(l=>l.key.startsWith('z'))).toBe(false);
  expect(out.length).toBeGreaterThan(0);
 });
 it('carries a handful of numbers, not a ruler',()=>{
  // Three axes running both ways is six of everything; the failure this guards is the figure
  // that answered "how big is this" eleven times at once.
  for(const [yaw,pitch] of ANGLES)for(const extent of [3,5,7,11,26])for(const unit of [20,42,90])
   expect(labels({extent,yaw,pitch,unit}).length,`extent ${extent} @${yaw},${pitch}`).toBeLessThanOrEqual(8);
  // And it keeps the ones nearest the origin, so the numbers that survive are the ones beside
  // an axis the reader can still see the end of.
  const near=labels({extent:7,limit:3}).map(l=>Math.abs(Number(l.text)));
  expect(near.length).toBe(3);
  expect(Math.max(...near)).toBeLessThanOrEqual(Math.min(...labels({extent:7}).map(l=>Math.abs(Number(l.text))))+tickStep(7));
 });
 it('says nothing at all rather than something wrong when there is no scale',()=>{
  expect(labels({extent:0})).toEqual([]);
  expect(labels({unit:0})).toEqual([]);
 });
});
describe('an edge the scene cannot honestly draw',()=>{
 it('is solid inside, gone outside, and monotone in between',()=>{
  expect(fadeOut(0,3,10)).toBe(1);
  expect(fadeOut(3,3,10)).toBe(1);
  expect(fadeOut(10,3,10)).toBe(0);
  expect(fadeOut(99,3,10)).toBe(0);
  let last=1;
  for(let r=0;r<=12;r+=.25){const a=fadeOut(r,3,10);expect(a).toBeLessThanOrEqual(last+1e-12);expect(a).toBeGreaterThanOrEqual(0);last=a;}
  // Smooth, not a straight line: the ramp leaves both ends flat so neither shows as a crease.
  expect(fadeOut(6.5,3,10)).toBeCloseTo(.5,12);
  expect(fadeOut(3.7,3,10)).toBeGreaterThan(.9);
 });
 it('degrades to a hard cut rather than dividing by zero',()=>{
  expect(fadeOut(1,5,5)).toBe(1);
  expect(fadeOut(9,5,5)).toBe(0);
 });
});
describe('a sheet has no edge',()=>{
 it('fades out well inside the picture, not past the corner of it',()=>{
  // The whole failure this replaces: a sheet drawn a frame and a half wide at a flat opacity
  // never showed its rim, and so read as an even slab of colour from corner to corner.
  const frameWorld=720/42,spread=bodyReach('sheet',2,frameWorld);
  const halfWidth=frameWorld/2;
  expect(spread*SHEET_FADE.outer,'still solid at the frame edge').toBeLessThan(halfWidth*2);
  expect(spread*SHEET_FADE.inner,'already fading before the reader can see any of it').toBeGreaterThan(halfWidth*.35);
  // It must still cover the picture: a fade that finishes inside the frame is an edge again.
  expect(spread*SHEET_FADE.outer).toBeGreaterThan(halfWidth);
 });
 it('reaches past the frame however small the charge is drawn',()=>{
  for(const frameWorld of [4,17.14,40])for(const radius of [.1,2,9])
   expect(bodyReach('sheet',radius,frameWorld)).toBeGreaterThanOrEqual(frameWorld*.95);
 });
 it('is quieter than a disk, because it covers everything a disk does not',()=>{
  expect(surfaceOpacity('sheet')).toBeLessThan(surfaceOpacity('disk'));
 });
 it('leaves a disk stopping at its own rim, because a disk has one',()=>{
  expect(bodyReach('disk',2,17.14)).toBe(2);
  expect(bodyReach('disk',0,17.14)).toBe(.05);
 });
});
describe('how far the frame runs',()=>{
 it('covers the field and the picture, in whole metres',()=>{
  for(const reach of [.5,2,6,20])for(const frameWorld of [4,17.14,40]){
   const extent=frameExtent(reach,frameWorld);
   expect(Number.isInteger(extent)).toBe(true);
   expect(extent).toBeGreaterThanOrEqual(reach*1.15);
   expect(extent).toBeGreaterThanOrEqual(frameWorld*.6);
   expect(extent).toBeGreaterThanOrEqual(3);
  }
 });
});
