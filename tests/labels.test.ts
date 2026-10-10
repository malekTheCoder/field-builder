import {describe,expect,it} from 'vitest';
import {boxSegmentDistance,candidates,collisions,nearestOnBox,placeLabels,reachCandidates,segmentBoxes,type Box,type Label} from '../src/diagrams/labels';
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
describe('a label with a reach',()=>{
 // Past about 24px a label stops naming what it was put beside: an axis letter's neighbour pushed
 // into empty space, a "+" nudged off the rod beside an infinity sign. With a reach, the placer
 // tries the far side of what the label names, and failing that leaves it out.
 it('never moves a label further than its reach, in any direction',()=>{
  for(const n of reachCandidates(24))expect(Math.hypot(n.dx,n.dy)).toBeLessThanOrEqual(24+1e-9);
  expect(reachCandidates(24)[0]).toEqual({dx:0,dy:0});
 });
 it('tries the far side of the point it names before giving up',()=>{
  // An obstacle covering everything within reach on the right of the mirror point, nothing on the left.
  const wall=box(100,40,120,80);
  const labels:Label[]=[{box:box(120,74,24,12),mirror:{x:100,y:80}}];
  const [n]=placeLabels(labels,{frame:FRAME,obstacles:[wall],maxShift:24});
  expect(n.hidden).toBeFalsy();
  const [b]=moved(labels,[n]);
  expect(b.x+b.width).toBeLessThanOrEqual(100);
  expect(collisions([b,wall])).toEqual([]);
 });
 it('then tries the places it is given, in order',()=>{
  const wall=box(60,40,200,80);
  const labels:Label[]=[{box:box(120,74,24,12),mirror:{x:130,y:80},alternates:[box(300,74,24,12)]}];
  const [n]=placeLabels(labels,{frame:FRAME,obstacles:[wall],maxShift:24});
  expect(moved(labels,[n])[0].x).toBeGreaterThanOrEqual(276);
 });
 it('hides a label that has nowhere to go, rather than floating it away',()=>{
  const wall=box(0,0,720,430);
  const [n]=placeLabels([{box:box(300,200)}],{frame:FRAME,obstacles:[wall],maxShift:24});
  expect(n.hidden).toBe(true);
 });
 it('but never the one it must keep, and a hidden label takes up no room',()=>{
  const wall=box(250,150,200,140);
  const out=placeLabels([{box:box(300,200)},{box:box(310,205),keep:true}],{frame:FRAME,obstacles:[wall],maxShift:24});
  expect(out[0].hidden).toBe(true);
  expect(out[1].hidden).toBeFalsy();
 });
 it('without a reach, nothing is ever hidden: the old behaviour',()=>{
  const wall=box(0,0,720,430);
  expect(placeLabels([{box:box(300,200)}],{frame:FRAME,obstacles:[wall]})[0].hidden).toBeFalsy();
 });
});
const PAGE:Box={x:0,y:0,width:720,height:430};
describe('strokes as obstacles',()=>{
 it('covers a segment with small squares along it, not its bounding box',()=>{
  const out=segmentBoxes({x:0,y:0},{x:80,y:80},6,PAGE);
  // A label sitting in the corner of the diagonal's bounding box is clear of it.
  expect(collisions([...out,box(60,5,14,10)]).filter(([,j])=>j===out.length)).toEqual([]);
  for(const b of out)expect(b.width).toBe(6);
  expect(out.length).toBeGreaterThan(10);
 });
 it('keeps only the part inside the frame, so a line running a mile off the page costs nothing extra',()=>{
  const out=segmentBoxes({x:-100000,y:200},{x:100000,y:200},4,PAGE,[],8);
  expect(out.length).toBeLessThan(100);
  for(const b of out){expect(b.x).toBeGreaterThanOrEqual(-2);expect(b.x).toBeLessThanOrEqual(720);}
  expect(segmentBoxes({x:-50,y:-50},{x:-10,y:-10},4,PAGE)).toEqual([]);
 });
 it('a leader ends on the nearest edge of its label',()=>{
  expect(nearestOnBox(box(100,100,30,12),{x:80,y:90})).toEqual({x:100,y:100});
  expect(nearestOnBox(box(100,100,30,12),{x:115,y:200})).toEqual({x:115,y:112});
 });
});
describe('a label among words, arrows and a reach that is not enough',()=>{
 it('keeps more air between two words than between a word and a stroke',()=>{
  // "ΔQ x = L": two labels seven units apart on one baseline read as one phrase.
  const words=[{box:box(100,100,30,12)},{box:box(137,100,30,12)}];
  expect(placeLabels(words,{frame:FRAME,pad:2})[1]).toEqual({dx:0,dy:0});
  expect(placeLabels(words,{frame:FRAME,pad:2,labelPad:8})[1]).not.toEqual({dx:0,dy:0});
  const moved1=moved(words,placeLabels(words,{frame:FRAME,pad:2,labelPad:8}));
  const gapX=Math.max(moved1[1].x-(moved1[0].x+30),moved1[0].x-(moved1[1].x+30)),gapY=Math.max(moved1[1].y-(moved1[0].y+12),moved1[0].y-(moved1[1].y+12));
  expect(gapX>=8||gapY>=4).toBe(true);
  // A stroke seven units off is clear enough: the label margin is for labels only.
  const stroke={...box(137,100,30,12)};
  expect(placeLabels([{box:box(100,100,30,12)}],{frame:FRAME,pad:2,labelPad:8,obstacles:[stroke]})[0]).toEqual({dx:0,dy:0});
 });
 it('measures how far a box is from a stroke, and touching is nothing',()=>{
  expect(boxSegmentDistance(box(0,0,10,10),{a:{x:20,y:5},b:{x:40,y:5}})).toBeCloseTo(10,9);
  expect(boxSegmentDistance(box(0,0,10,10),{a:{x:-5,y:5},b:{x:15,y:5}})).toBe(0);
  expect(boxSegmentDistance(box(0,0,10,10),{a:{x:13,y:13},b:{x:20,y:20}})).toBeCloseTo(Math.hypot(3,3),9);
 });
 it('never names an arrow from a spot nearer another arrow',()=>{
  // Two arrows out of one point; a name asking to sit at the tip of the first, right beside the
  // head of the second. The spot is free, but it is the wrong arrow's.
  const own={a:{x:100,y:200},b:{x:200,y:200}},other={a:{x:100,y:200},b:{x:200,y:240}};
  const label:Label={box:box(196,214,30,14),shaft:own};
  const [n]=placeLabels([label],{frame:FRAME,maxShift:24,shafts:[own,other]});
  expect(n.hidden).toBeFalsy();
  const [b]=moved([label],[n]);
  expect(boxSegmentDistance(b,other)).toBeGreaterThanOrEqual(boxSegmentDistance(b,own)+3);
  // Without the rule it would have stayed where it asked to be, beside the other arrow's head.
  expect(placeLabels([{box:label.box}],{frame:FRAME,maxShift:24})[0]).toEqual({dx:0,dy:0});
 });
 it('keeps a name on its own side of the line it must not cross',()=>{
  const label:Label={box:box(100,190,30,14),within:[{x:0,y:200,nx:0,ny:1}]};
  const [n]=placeLabels([label],{frame:FRAME,maxShift:24});
  const [b]=moved([label],[n]);
  expect(b.y+b.height/2).toBeGreaterThanOrEqual(200);
 });
 it('takes a name it must keep past its reach, on a leader, before letting it sit on anything',()=>{
  // A wall around the label's spot, open thirty-six units out: past the reach, inside twice it.
  const wall=box(80,80,100,60);
  const label:Label={box:box(115,104,24,12),keep:true};
  const [n]=placeLabels([label],{frame:FRAME,obstacles:[wall],maxShift:24});
  expect(n.hidden).toBeFalsy();
  expect(n.leader).toBe(true);
  const [b]=moved([label],[n]);
  expect(collisions([b,wall],2)).toEqual([]);
  expect(Math.hypot(n.dx,n.dy)).toBeLessThanOrEqual(48+1e-9);
  // A name that need not be kept is still hidden rather than floated away.
  expect(placeLabels([{box:label.box}],{frame:FRAME,obstacles:[wall],maxShift:24})[0].hidden).toBe(true);
 });
});
