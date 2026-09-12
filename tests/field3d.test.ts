import {describe,expect,it} from 'vitest';
import {K} from '../src/distributions/constants';
import type {ChargeSample} from '../src/distributions/types';
import type {Vec} from '../src/symbolic/physics';
import {cloud,meridianLines,spaceField,spaceGrid,spaceLines,spaceSeeds,traceLine3,typicalSpacing} from '../src/diagrams/field3d';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {logWeights} from '../src/diagrams/vectorfield';
const charge=(x:number,y:number,z:number,dq:number,coordinate=0):ChargeSample=>({position:{x,y,z},dq,field:{x:0,y:0,z:0},potential:0,coordinate});
const point=[charge(0,0,0,2e-9)];
const rod=Array.from({length:40},(_,i)=>charge(0,-2+4*(i+.5)/40,0,2e-9/40));
const ring=Array.from({length:60},(_,i)=>{const t=2*Math.PI*(i+.5)/60;return charge(Math.cos(t),Math.sin(t),0,2e-9/60);});
// annuli of a disk: each sample IS a ring at radius s, carrying charge ∝ s ds
const disk=Array.from({length:30},(_,i)=>{const s=(i+.5)/30;return charge(s,0,0,2e-9*s/30*2,s);});
const len=(v:Vec)=>Math.hypot(v.x,v.y,v.z);
describe('the field in space',()=>{
 it('is Coulomb for a single charge, in every direction',()=>{
  for(const at of [{x:2,y:0,z:0},{x:0,y:0,z:3},{x:1,y:1,z:1}]){
   const e=spaceField(point,at),r=len(at);
   expect(len(e)).toBeCloseTo(K*2e-9/(r*r),12);
   // radial
   expect(e.x*at.x+e.y*at.y+e.z*at.z).toBeCloseTo(len(e)*r,10);
  }
 });
 it('points straight up the axis of a ring, with the transverse parts cancelling',()=>{
  const e=spaceField(ring,{x:0,y:0,z:1.5});
  expect(Math.abs(e.x)).toBeLessThan(1e-12*Math.abs(e.z));
  expect(Math.abs(e.y)).toBeLessThan(1e-12*Math.abs(e.z));
  expect(e.z).toBeGreaterThan(0);
 });
 it('vanishes at the centre of a ring',()=>{
  expect(len(spaceField(ring,{x:0,y:0,z:0}))).toBeLessThan(1e-9*len(spaceField(ring,{x:0,y:0,z:1})));
 });
 it('never returns NaN, even on top of an element',()=>{
  const e=spaceField(point,{x:0,y:0,z:0});
  expect([e.x,e.y,e.z].every(Number.isFinite)).toBe(true);
 });
});
describe('tracing in space',()=>{
 it('runs radially from a point charge and terminates',()=>{
  const path=traceLine3(point,{x:.3,y:.3,z:.3},{outerLimit:5});
  expect(path.length).toBeGreaterThan(5);
  for(const q of path){const r=len(q);expect(q.x/r).toBeCloseTo(q.y/r,9);expect(q.y/r).toBeCloseTo(q.z/r,9);}
  expect(len(path[path.length-1])).toBeGreaterThan(5);
 });
 it('keeps a constant step',()=>{
  const path=traceLine3(point,{x:.5,y:0,z:.2},{step:.05,outerLimit:3});
  for(let i=1;i<path.length-1;i++)expect(len({x:path[i].x-path[i-1].x,y:path[i].y-path[i-1].y,z:path[i].z-path[i-1].z})).toBeCloseTo(.05,6);
 });
 it('produces finite lines around a ring and a disk',()=>{
  for(const [samples,layout] of [[ring,'wire'],[disk,'surface'],[rod,'wire']] as const){
   const lines=spaceLines(samples,layout,16,{outerLimit:8,maxSteps:300});
   expect(lines.length).toBeGreaterThan(4);
   for(const line of lines)for(const q of line)expect([q.x,q.y,q.z].every(Number.isFinite)).toBe(true);
  }
 });
});
describe('seeding in space',()=>{
 it('surrounds a wire on every side, not only in one plane',()=>{
  const seeds=spaceSeeds(rod,'wire',16,.2);
  expect(seeds.length).toBe(16);
  expect(seeds.some(s=>s.x>.1)).toBe(true);expect(seeds.some(s=>s.x<-.1)).toBe(true);
  expect(seeds.some(s=>s.z>.1)).toBe(true);expect(seeds.some(s=>s.z<-.1)).toBe(true);
  for(const s of seeds)expect(Math.hypot(s.x,s.z)).toBeCloseTo(.2,6); // off the rod by the offset
 });
 it('launches off both faces of a surface',()=>{
  const seeds=spaceSeeds(disk,'surface',24,.15);
  expect(seeds.some(s=>s.z>0)).toBe(true);expect(seeds.some(s=>s.z<0)).toBe(true);
  for(const s of seeds)expect(Math.abs(s.z)).toBeCloseTo(.15,6);
 });
 it('favours the outer annuli of a disk, where more of the charge is',()=>{
  const seeds=spaceSeeds(disk,'surface',40,.1);
  const radii=seeds.map(s=>Math.hypot(s.x,s.y));
  const outer=radii.filter(r=>r>.6).length,inner=radii.filter(r=>r<=.6).length;
  expect(outer).toBeGreaterThan(inner);
 });
 it('copes with a wire that runs along z',()=>{
  const vertical=Array.from({length:20},(_,i)=>charge(0,0,-1+2*(i+.5)/20,1e-9/20));
  const seeds=spaceSeeds(vertical,'wire',8,.2);
  expect(seeds.length).toBe(8);
  for(const s of seeds){expect(Number.isFinite(s.x)&&Number.isFinite(s.y)).toBe(true);expect(Math.hypot(s.x,s.y)).toBeCloseTo(.2,6);}
 });
});
describe('a lattice of arrows in space',()=>{
 it('fills the volume, skipping the charge, with unit directions',()=>{
  const arrows=spaceGrid(rod,2,1);
  expect(arrows.length).toBeGreaterThan(50);
  for(const a of arrows){
   expect(len(a.dir)).toBeCloseTo(1,12);
   expect(Math.min(...rod.map(s=>Math.hypot(a.at.x-s.position.x,a.at.y-s.position.y,a.at.z-s.position.z)))).toBeGreaterThanOrEqual(.14);
  }
 });
 it('weights on the same scale as the flat view',()=>{
  const arrows=spaceGrid(point,2,1);
  const again=logWeights(arrows.map(a=>a.magnitude));
  arrows.forEach((a,i)=>expect(a.weight).toBeCloseTo(again[i],12));
  expect(Math.max(...arrows.map(a=>a.weight))).toBeCloseTo(1,9);
 });
 it('refuses nonsense input',()=>{
  expect(spaceGrid([],2,1)).toEqual([]);expect(spaceGrid(rod,2,0)).toEqual([]);expect(spaceGrid(rod,0,1)).toEqual([]);
 });
});
describe('shared log weights',()=>{
 it('treats a spread under five percent as uniform',()=>{
  expect(logWeights([1,1.02,1.04]).every(w=>w===1)).toBe(true);
  const w=logWeights([1,10,100]);
  expect(w[0]).toBeCloseTo(0,12);expect(w[1]).toBeCloseTo(.5,12);expect(w[2]).toBeCloseTo(1,12);
 });
});
describe('the cross-section a side view wants',()=>{
 it('keeps every line in the plane y = 0 for an axisymmetric charge',()=>{
  for(const [samples,layout] of [[ring,'wire'],[disk,'surface']] as const){
   const lines=meridianLines(samples,layout,12,{outerLimit:6,maxSteps:200});
   expect(lines.length).toBeGreaterThan(3);
   // Away from the charge the plane is exact. Within a spacing of a discrete point the field
   // leans toward that point, which is why lines stop short of it.
   const points=cloud(samples,layout);
   for(const line of lines)for(const q of line){
    const nearest=Math.min(...points.map(s=>Math.hypot(q.x-s.position.x,q.y-s.position.y,q.z-s.position.z)));
    if(nearest>.3)expect(Math.abs(q.y)).toBeLessThan(1e-9);
    expect(Math.abs(q.y)).toBeLessThan(.06);
   }
  }
 });
 it('stops a spacing short of the wire, so lines do not wiggle at the root',()=>{
  const lines=meridianLines(ring,'wire',12,{outerLimit:6,maxSteps:200});
  const spacing=typicalSpacing(ring);
  for(const line of lines)for(const end of [line[0],line[line.length-1]]){
   const nearest=Math.min(...ring.map(s=>Math.hypot(end.x-s.position.x,end.y-s.position.y,end.z-s.position.z)));
   const far=Math.hypot(end.x,end.y,end.z)>5.5;
   if(!far)expect(nearest).toBeGreaterThan(.5*spacing);
  }
 });
 it('starts lines on both sides of the axis where a ring crosses the cut',()=>{
  const lines=meridianLines(ring,'wire',12,{outerLimit:6,maxSteps:200});
  const starts=lines.map(l=>l[0].x);
  expect(starts.some(x=>x>0)).toBe(true);expect(starts.some(x=>x<0)).toBe(true);
 });
 it('slices the lattice to the plane and offsets it off the axes',()=>{
  const slab=spaceGrid(ring,2,1,.14,'xz');
  expect(slab.length).toBeGreaterThan(8);
  for(const a of slab){expect(a.at.y).toBe(0);expect(Math.abs(a.at.x)%1).toBeCloseTo(.5,9);}
  for(const a of spaceGrid(point,2,1))for(const c of [a.at.x,a.at.y,a.at.z])expect(Math.abs(c)%1).toBeCloseTo(.5,9);
 });
});
describe('a surface is summed as a surface',()=>{
 it('spreads each annulus round its ring, keeping the charge',()=>{
  const points=cloud(disk,'surface',16);
  expect(points.length).toBe(disk.length*16);
  expect(points.reduce((a,s)=>a+s.dq,0)).toBeCloseTo(disk.reduce((a,s)=>a+s.dq,0),18);
  for(const s of points.slice(0,16))expect(Math.hypot(s.position.x,s.position.y)).toBeCloseTo(Math.abs(disk[0].coordinate),12);
 });
 it("reproduces the app's own annulus field on the axis of a real disk",()=>{
  const samples=sampleDistribution('disk',DEFAULT_PARAMS,40);
  const own=samples.reduce((a,s)=>a+s.field.z,0);
  const spread=spaceField(cloud(samples,'surface',48),{x:0,y:0,z:DEFAULT_PARAMS.distance}).z;
  expect(spread/own).toBeCloseTo(1,3);
  // On the axis a point on a ring and the whole ring agree, so the difference only shows off
  // it: an axisymmetric surface has no sideways field on the plane x = 0, while the annuli
  // taken as points on one radius pull everything toward that radius.
  const off={x:0,y:.4,z:DEFAULT_PARAMS.distance};
  const surface=spaceField(cloud(samples,'surface',48),off),points=spaceField(samples,off);
  expect(Math.abs(surface.x)).toBeLessThan(1e-9*Math.abs(surface.z));
  expect(Math.abs(points.x)).toBeGreaterThan(.05*Math.abs(points.z));
 });
 it('leaves a wire alone',()=>{
  expect(cloud(ring,'wire')).toHaveLength(ring.length);
 });
});
describe('the same rule in space',()=>{
 it('keeps every seeded line, shortening rather than dropping',()=>{
  for(const [samples,layout] of [[ring,'wire'],[disk,'surface']] as const){
   const withRule=spaceLines(samples,layout,16,{outerLimit:8,maxSteps:300});
   const without=spaceLines(samples,layout,16,{outerLimit:8,maxSteps:300,crowd:0});
   expect(withRule.length).toBe(without.length);
   for(const l of withRule)expect(l.length).toBeGreaterThan(3);
  }
 });
 it('does not draw two lines along the same stroke away from the charge',()=>{
  const lines=spaceLines(ring,'wire',20,{outerLimit:8,maxSteps:300});
  const crowd=Math.max(...ring.map(s=>len(s.position)),.5)*.012;
  const far=lines.map(l=>l.filter(q=>len(q)>2.2)).filter(l=>l.length>2);
  for(let i=0;i<far.length;i++)for(let j=i+1;j<far.length;j++){
   let worst=Infinity;
   for(const a of far[i])for(const b of far[j])worst=Math.min(worst,len({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}));
   expect(worst).toBeGreaterThan(crowd*.5);
  }
 });
 it('keeps the meridian cut in its plane with the rule on',()=>{
  for(const q of meridianLines(ring,'wire',12,{outerLimit:6,maxSteps:200}).flat())expect(Math.abs(q.y)).toBeLessThan(.06);
 });
});
