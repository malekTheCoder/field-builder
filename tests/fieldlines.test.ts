import {describe,expect,it} from 'vitest';
import {K} from '../src/distributions/constants';
import type {ChargeSample} from '../src/distributions/types';
import {fieldLines,planeField,seedRing,traceLine} from '../src/diagrams/fieldlines';
const charge=(x:number,y:number,dq:number):ChargeSample=>({position:{x,y,z:0},dq,field:{x:0,y:0,z:0},potential:0,coordinate:0});
const point=[charge(0,0,2e-9)];
const rod=Array.from({length:60},(_,i)=>charge(0,-2+4*(i+.5)/60,2e-9/60));
const len=(v:{x:number;y:number})=>Math.hypot(v.x,v.y);
describe('the field in the plane',()=>{
 it('reproduces Coulomb for a single charge, in size and direction',()=>{
  for(const r of [.5,1,3.7,25]){
   const e=planeField(point,{x:r,y:0});
   expect(len(e)).toBeCloseTo(K*2e-9/(r*r),12);
   expect(e.y).toBeCloseTo(0,14);
   expect(e.x).toBeGreaterThan(0); // away from positive charge
  }
 });
 it('points inward for a negative charge',()=>{
  const e=planeField([charge(0,0,-2e-9)],{x:2,y:0});
  expect(e.x).toBeLessThan(0);expect(e.y).toBeCloseTo(0,14);
 });
 it('cancels on the bisector of a symmetric rod, leaving only the perpendicular part',()=>{
  const e=planeField(rod,{x:3,y:0});
  expect(e.y).toBeCloseTo(0,12);
  expect(e.x).toBeGreaterThan(0);
 });
 it('falls off like a point charge far from a finite rod',()=>{
  const far=planeField(rod,{x:400,y:0}),total=2e-9;
  expect(len(far)).toBeCloseTo(K*total/(400*400),1e-12 as unknown as number);
  expect(len(far)/(K*total/(400*400))).toBeCloseTo(1,4);
 });
 it('survives a point sitting exactly on an element instead of returning NaN',()=>{
  const e=planeField(point,{x:0,y:0});
  expect(Number.isFinite(e.x)).toBe(true);expect(Number.isFinite(e.y)).toBe(true);
 });
});
describe('tracing a line',()=>{
 it('runs straight out along a radius from a single charge',()=>{
  const path=traceLine(point,{x:.4,y:0},{outerLimit:6});
  expect(path.length).toBeGreaterThan(10);
  // Radial means y never departs from zero and x only grows.
  for(const p of path){expect(Math.abs(p.y)).toBeLessThan(1e-6);}
  for(let i=1;i<path.length;i++)expect(path[i].x).toBeGreaterThan(path[i-1].x);
  expect(len(path[path.length-1])).toBeGreaterThan(6);
 });
 it('walks back into the charge when the sign is reversed',()=>{
  const path=traceLine(point,{x:2,y:0},{sign:-1});
  expect(len(path[path.length-1])).toBeLessThan(len(path[0]));
 });
 it('keeps a constant step, so the curve is not sampled unevenly',()=>{
  const path=traceLine(point,{x:.5,y:.5},{step:.05,outerLimit:4});
  for(let i=1;i<path.length-1;i++){
   const d=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
   expect(d).toBeCloseTo(.05,6);
  }
 });
 it('always terminates, even pointed straight at the charge',()=>{
  const path=traceLine(point,{x:.2,y:0},{sign:-1,maxSteps:5000});
  expect(path.length).toBeLessThan(5000);
  expect(path.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);
 });
 it('produces no NaN anywhere along a rod line',()=>{
  for(const line of fieldLines(rod,12))for(const p of line){
   expect(Number.isFinite(p.x)).toBe(true);expect(Number.isFinite(p.y)).toBe(true);
  }
 });
});
describe('seeding',()=>{
 it('encloses the whole distribution',()=>{
  const reach=Math.max(...rod.map(s=>Math.hypot(s.position.x,s.position.y)));
  for(const s of seedRing(rod,16))expect(len(s)).toBeGreaterThan(reach);
 });
 it('never lands a seed exactly on an axis, where a symmetric layout can stall it',()=>{
  for(const n of [4,8,12,16,24])for(const s of seedRing(rod,n)){
   expect(Math.abs(s.x)).toBeGreaterThan(1e-9);
   expect(Math.abs(s.y)).toBeGreaterThan(1e-9);
  }
 });
 it('gives the asked-for number of seeds, and lines that actually go somewhere',()=>{
  expect(seedRing(rod,18)).toHaveLength(18);
  const lines=fieldLines(rod,14);
  expect(lines.length).toBeGreaterThan(8);
  for(const line of lines)expect(line.length).toBeGreaterThan(3);
 });
 it('runs the lines outward from positive charge and inward for negative',()=>{
  const [outward]=fieldLines([charge(0,0,1e-9)],6,{outerLimit:8});
  const [inward]=fieldLines([charge(0,0,-1e-9)],6,{outerLimit:8});
  // A line starts at the charge and ends far away when the charge is positive.
  expect(len(outward[0])).toBeLessThan(len(outward[outward.length-1]));
  expect(len(inward[0])).toBeGreaterThan(len(inward[inward.length-1]));
 });
});
