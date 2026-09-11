import {describe,expect,it} from 'vitest';
import {closestPair,spreadSpots,type Area,type Spot} from '../src/diagrams/hotspots';
const AREA:Area={x0:50,y0:60,x1:660,y1:360};
const at=(...pairs:[number,number][]):Spot[]=>pairs.map(([x,y])=>({x,y}));
describe('keeping the targets pointable',()=>{
 it('leaves targets alone when none of them collide',()=>{
  const given=at([100,100],[300,120],[500,300],[200,340]);
  expect(spreadSpots(given,32,AREA)).toEqual(given);
 });
 it('separates the disk case that actually overlaps on screen',()=>{
  // Measured live: the charge ring and the bounds bracket land 23.1px apart, inside the
  // 26px at which two 13px circles touch.
  const crowded=at([315,296],[318,273],[289,278],[357,296]);
  expect(closestPair(crowded)).toBeLessThan(26);
  const spread=spreadSpots(crowded,32,AREA);
  expect(closestPair(spread)).toBeGreaterThanOrEqual(32-1e-6);
 });
 it('separates every measured geometry without moving anything far',()=>{
  // Each row is one lesson's four targets as rendered.
  const real:Spot[][]=[
   at([220,216],[281,236],[321,325],[220,126]),
   at([130,230],[236,230],[315,212],[270,230]),
   at([220,216],[243,232],[321,325],[220,55]),
   at([315,296],[318,273],[289,278],[357,296]),
   at([300,310],[340,290],[416,292],[628,310]),
  ];
  for(const row of real){
   const spread=spreadSpots(row,32,AREA);
   expect(closestPair(spread),JSON.stringify(row)).toBeGreaterThanOrEqual(32-1e-6);
   // A target that wanders off its feature is worse than one that is a little close.
   for(let i=0;i<row.length;i++)expect(Math.hypot(spread[i].x-row[i].x,spread[i].y-row[i].y)).toBeLessThan(26);
  }
 });
 it('keeps count and order, so a target still names the factor it was built for',()=>{
  const given=at([300,300],[300,300],[300,300],[610,355]);
  const spread=spreadSpots(given,32,AREA);
  expect(spread).toHaveLength(4);
  // The far one barely moves, so it is still recognisably the fourth.
  expect(Math.hypot(spread[3].x-610,spread[3].y-355)).toBeLessThan(10);
 });
 it('pushes exactly coincident targets apart the same way every render',()=>{
  const stacked=at([300,200],[300,200],[300,200]);
  const once=spreadSpots(stacked,32,AREA),twice=spreadSpots(stacked,32,AREA);
  expect(once).toEqual(twice);
  expect(closestPair(once)).toBeGreaterThanOrEqual(32-1e-6);
 });
 it('never pushes a target out of the drawing',()=>{
  const corner=at([50,60],[52,62],[54,64],[56,66]);
  for(const s of spreadSpots(corner,40,AREA)){
   expect(s.x).toBeGreaterThanOrEqual(AREA.x0);expect(s.x).toBeLessThanOrEqual(AREA.x1);
   expect(s.y).toBeGreaterThanOrEqual(AREA.y0);expect(s.y).toBeLessThanOrEqual(AREA.y1);
  }
 });
 it('is stable: spreading an already spread set changes nothing',()=>{
  const once=spreadSpots(at([315,296],[318,273],[289,278],[357,296]),32,AREA);
  expect(spreadSpots(once,32,AREA)).toEqual(once);
 });
 it('reports the closest pair, and nothing to report below two targets',()=>{
  expect(closestPair([])).toBe(Infinity);
  expect(closestPair(at([1,1]))).toBe(Infinity);
  expect(closestPair(at([0,0],[3,4]))).toBe(5);
 });
});
