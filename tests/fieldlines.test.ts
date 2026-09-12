import {describe,expect,it} from 'vitest';
import {K} from '../src/distributions/constants';
import type {ChargeSample} from '../src/distributions/types';
import {chargeSeeds,fieldLines,planeField,seedRing,traceLine} from '../src/diagrams/fieldlines';
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
describe('seeding in proportion to charge, so density means field strength',()=>{
 const along=(seeds:{x:number;y:number}[])=>seeds.map(s=>s.y).sort((a,b)=>a-b);
 it('spaces seeds evenly along a rod of uniform density',()=>{
  const seeds=chargeSeeds(rod,16,.1);
  expect(seeds.length).toBe(16);
  const ys=[...new Set(along(seeds).map(y=>+y.toFixed(4)))];
  const gaps=ys.slice(1).map((y,i)=>y-ys[i]);
  const mean=gaps.reduce((a,b)=>a+b,0)/gaps.length;
  for(const g of gaps)expect(Math.abs(g-mean)/mean).toBeLessThan(.35);
 });
 it('crowds them toward the heavy end when the density is not uniform',()=>{
  // lambda growing along the rod, exactly the ramp lesson's distribution
  const ramp=Array.from({length:80},(_,i)=>{const y=(i+.5)*4/80;return charge(0,y,(y/4)*1e-9);});
  const seeds=chargeSeeds(ramp,24,.1);
  const ys=along(seeds);
  const lower=ys.filter(y=>y<2).length,upper=ys.filter(y=>y>=2).length;
  // Half the charge sits in the top 29% of a linear ramp, so seeds must favour it.
  expect(upper).toBeGreaterThan(lower);
  const median=ys[Math.floor(ys.length/2)];
  expect(median).toBeGreaterThan(2.4);
 });
 it('launches on both sides of the distribution, never on it',()=>{
  const seeds=chargeSeeds(rod,12,.2);
  expect(seeds.some(s=>s.x>.1)).toBe(true);
  expect(seeds.some(s=>s.x<-.1)).toBe(true);
  for(const s of seeds)expect(Math.abs(s.x)).toBeCloseTo(.2,6);
 });
 it('falls back to a ring when there is nothing to take a tangent from',()=>{
  expect(chargeSeeds([charge(0,0,1e-9)],8,.1)).toHaveLength(0);
  expect(fieldLines([charge(0,0,1e-9)],8,{outerLimit:6}).length).toBeGreaterThan(3);
 });
 it('ignores a distribution with no charge rather than dividing by zero',()=>{
  expect(chargeSeeds([charge(0,0,0),charge(0,1,0)],8,.1)).toHaveLength(0);
 });
});
describe('stopping a line that merely repeats one already drawn',()=>{
 const spacing=(a:{x:number;y:number}[],b:{x:number;y:number}[])=>{
  let worst=Infinity;
  for(const p of a)for(const q of b)worst=Math.min(worst,Math.hypot(p.x-q.x,p.y-q.y));
  return worst;
 };
 it('keeps flux seeding untouched: the same number of lines still start',()=>{
  // The rule culls redundancy, never density. Every seed still produces a line, because
  // density meaning field strength is the whole point of seeding in proportion to charge.
  const withRule=fieldLines(rod,16,{outerLimit:9});
  const without=fieldLines(rod,16,{outerLimit:9,crowd:0});
  expect(withRule.length).toBe(without.length);
 });
 it('does not let two lines run on top of each other away from the charge',()=>{
  const lines=fieldLines(rod,24,{outerLimit:9});
  const crowd=Math.max(...rod.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)),.5)*.012;
  // Near the charge every line leaves from nearly the same place, so only the parts well
  // clear of it are asked to be distinct.
  const far=lines.map(l=>l.filter(q=>Math.hypot(q.x,q.y)>2.6)).filter(l=>l.length>2);
  for(let i=0;i<far.length;i++)for(let j=i+1;j<far.length;j++)
   expect(spacing(far[i],far[j])).toBeGreaterThan(crowd*.5);
 });
 it('shortens a line rather than dropping it',()=>{
  const lines=fieldLines(rod,24,{outerLimit:9});
  for(const l of lines)expect(l.length).toBeGreaterThan(3);
 });
 it('leaves a lone line its full length',()=>{
  const one=fieldLines(point,2,{outerLimit:7});
  for(const l of one)expect(Math.hypot(l[l.length-1].x,l[l.length-1].y)).toBeGreaterThan(6);
 });
 it('is not quadratic in the number of points',()=>{
  // A naive pair scan made this unusable; the bucket lookup keeps it near linear.
  const t0=performance.now();fieldLines(rod,40,{outerLimit:12,step:.03});
  expect(performance.now()-t0).toBeLessThan(3000);
 });
});
