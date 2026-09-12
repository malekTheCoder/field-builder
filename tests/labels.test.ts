import {describe,expect,it} from 'vitest';
import {candidates,collisions,placeLabels,type Box,type Label} from '../src/diagrams/labels';
const box=(x:number,y:number,width=30,height=12):Box=>({x,y,width,height});
const moved=(labels:readonly Label[],nudges:{dx:number;dy:number}[]):Box[]=>
 labels.map((l,i)=>({...l.box,x:l.box.x+nudges[i].dx,y:l.box.y+nudges[i].dy}));
const FRAME={width:720,height:430};
describe('where a label is allowed to go',()=>{
 it('offers staying put first, so a label that is already clear never moves',()=>{
  expect(candidates()[0]).toEqual({dx:0,dy:0});
 });
 it('tries near before far, and vertical before sideways',()=>{
  const c=candidates(9,2);
  expect(Math.hypot(c[1].dx,c[1].dy)).toBeCloseTo(9,9);
  expect(c[1]).toEqual({dx:0,dy:-9});             // straight up first
  expect(c[2]).toEqual({dx:0,dy:9});
  const far=c.findIndex(n=>Math.hypot(n.dx,n.dy)>10);
  expect(far).toBeGreaterThan(4);                  // a whole ring before widening
 });
});
describe('placing them',()=>{
 it('leaves labels alone when nothing collides',()=>{
  const labels=[{box:box(10,10)},{box:box(200,200)},{box:box(400,60)}];
  expect(placeLabels(labels,{frame:FRAME})).toEqual([{dx:0,dy:0},{dx:0,dy:0},{dx:0,dy:0}]);
 });
 it('separates two labels that want the same spot',()=>{
  const labels=[{box:box(100,100)},{box:box(104,102)}];
  const out=placeLabels(labels,{frame:FRAME});
  expect(out[0]).toEqual({dx:0,dy:0});             // the first keeps its place
  expect(out[1]).not.toEqual({dx:0,dy:0});
  expect(collisions(moved(labels,out))).toEqual([]);
 });
 it('clears a whole crowd, which is the case that was failing',()=>{
  // Six labels stacked nearly on top of each other, as on the arc's centre.
  const labels=Array.from({length:6},(_,i)=>({box:box(300+i*3,200+i*2,34,13)}));
  const out=placeLabels(labels,{frame:FRAME});
  expect(collisions(moved(labels,out))).toEqual([]);
 });
 it('pulls back a label that starts outside the frame',()=>{
  // Every candidate is rejected for leaving the frame, so a label already outside used to have
  // no candidate at all and was left exactly where it was. The net field arrow grows long
  // enough on one lesson to carry its own label off the edge, which is how this was found.
  const labels=[{box:box(900,-40,34,13)}];
  const [n]=placeLabels(labels,{frame:FRAME});
  const [b]=moved(labels,[n]);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x+b.width).toBeLessThanOrEqual(FRAME.width);
  expect(b.y+b.height).toBeLessThanOrEqual(FRAME.height);
 });
 it('still keeps a pulled-back label off the ones already placed',()=>{
  const labels=[{box:box(700,415,34,13)},{box:box(900,600,34,13)}];
  const out=placeLabels(labels,{frame:FRAME});
  expect(collisions(moved(labels,out))).toEqual([]);
  for(const b of moved(labels,out))expect(b.x+b.width).toBeLessThanOrEqual(FRAME.width);
 });
 it('never pushes a label off the frame',()=>{
  const labels=[{box:box(690,6,28,12)},{box:box(692,8,28,12)},{box:box(688,10,28,12)}];
  const out=placeLabels(labels,{frame:FRAME});
  for(const b of moved(labels,out)){
   expect(b.x).toBeGreaterThanOrEqual(0);
   expect(b.y).toBeGreaterThanOrEqual(0);
   expect(b.x+b.width).toBeLessThanOrEqual(FRAME.width);
   expect(b.y+b.height).toBeLessThanOrEqual(FRAME.height);
  }
 });
 it('holds an anchored label still and moves the others around it',()=>{
  // An axis letter that shifts stops naming its axis; a dimension label may move.
  const labels:Label[]=[{box:box(100,100),fixed:true},{box:box(103,101)}];
  const out=placeLabels(labels,{frame:FRAME});
  expect(out[0]).toEqual({dx:0,dy:0});
  expect(out[1]).not.toEqual({dx:0,dy:0});
  expect(collisions(moved(labels,out))).toEqual([]);
 });
 it('keeps labels off the marks they would cover',()=>{
  const obstacle=box(100,100,40,40);              // P and its halo
  const labels=[{box:box(110,110,30,12)}];
  const out=placeLabels(labels,{frame:FRAME,obstacles:[obstacle]});
  expect(out[0]).not.toEqual({dx:0,dy:0});
  expect(collisions([...moved(labels,out),obstacle])).toEqual([]);
 });
 it('demands clear space, not merely a lack of contact',()=>{
  // Touching exactly at an edge reads as collided text; the pad is what makes it legible.
  const labels=[{box:box(100,100,20,10)},{box:box(120,100,20,10)}];
  const out=placeLabels(labels,{frame:FRAME,pad:4});
  expect(out[1]).not.toEqual({dx:0,dy:0});
 });
 it('prefers a small overlap to leaving the picture when there is nowhere free',()=>{
  // A frame with room for one label and three that want it.
  const tiny={width:40,height:20};
  const labels=[{box:box(2,2,34,14)},{box:box(3,3,34,14)},{box:box(4,4,34,14)}];
  const out=placeLabels(labels,{frame:tiny});
  for(const b of moved(labels,out)){
   expect(b.x).toBeGreaterThanOrEqual(-1);
   expect(b.y).toBeGreaterThanOrEqual(-1);
  }
  expect(out).toHaveLength(3);
 });
 it('is stable: the same input gives the same answer',()=>{
  const labels=Array.from({length:8},(_,i)=>({box:box(200+i*7,150+i*4)}));
  expect(placeLabels(labels,{frame:FRAME})).toEqual(placeLabels(labels,{frame:FRAME}));
 });
});
describe('reporting what still overlaps',()=>{
 it('finds every colliding pair, and none among the clear',()=>{
  expect(collisions([box(0,0),box(100,100),box(200,200)])).toEqual([]);
  expect(collisions([box(0,0),box(5,5),box(300,300)])).toEqual([[0,1]]);
  expect(collisions([box(0,0),box(5,5),box(8,2)])).toHaveLength(3);
 });
});
