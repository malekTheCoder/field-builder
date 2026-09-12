import {describe,expect,it} from 'vitest';
import {K} from '../src/distributions/constants';
import type {ChargeSample} from '../src/distributions/types';
import {arrowLength,vectorGrid,type GridArea} from '../src/diagrams/vectorfield';
const charge=(x:number,y:number,dq:number):ChargeSample=>({position:{x,y,z:0},dq,field:{x:0,y:0,z:0},potential:0,coordinate:0});
const point=[charge(0,0,2e-9)];
const rod=Array.from({length:40},(_,i)=>charge(0,-2+4*(i+.5)/40,2e-9/40));
const AREA:GridArea={x0:-3,y0:-3,x1:3,y1:3};
describe('a grid of field arrows',()=>{
 it('points away from a positive charge and back toward a negative one',()=>{
  for(const [sign,expected] of [[1,1],[-1,-1]] as const){
   const arrows=vectorGrid([charge(0,0,sign*2e-9)],AREA,1);
   for(const a of arrows){
    // Radially out (or in): the direction is parallel to the position vector.
    const r=Math.hypot(a.at.x,a.at.y);
    expect(a.dir.x*a.at.x/r+a.dir.y*a.at.y/r).toBeCloseTo(expected,9);
   }
  }
 });
 it('reports unit directions and a real magnitude',()=>{
  for(const a of vectorGrid(rod,AREA,1)){
   expect(Math.hypot(a.dir.x,a.dir.y)).toBeCloseTo(1,12);
   expect(a.magnitude).toBeGreaterThan(0);
   expect(Number.isFinite(a.magnitude)).toBe(true);
  }
 });
 it('matches Coulomb where the answer is known',()=>{
  const arrows=vectorGrid(point,{x0:2,y0:0,x1:2,y1:0},1);
  expect(arrows).toHaveLength(1);
  expect(arrows[0].magnitude).toBeCloseTo(K*2e-9/4,12);
 });
 it('drops arrows that would sit on the charge, rather than drawing a wrong one',()=>{
  // A lattice point landing on the rod itself is dominated by whichever element is nearest.
  const through=vectorGrid(rod,{x0:0,y0:-1,x1:0,y1:1},.5);
  for(const a of through)expect(Math.min(...rod.map(s=>Math.hypot(a.at.x-s.position.x,a.at.y-s.position.y)))).toBeGreaterThanOrEqual(.12);
 });
 it('weights logarithmically, so a near arrow does not swamp every far one',()=>{
  const arrows=vectorGrid(point,AREA,1);
  const weights=arrows.map(a=>a.weight);
  expect(Math.min(...weights)).toBeCloseTo(0,9);
  expect(Math.max(...weights)).toBeCloseTo(1,9);
  // Linear weighting would put almost every arrow within a hair of zero. Check the spread
  // is genuinely used rather than collapsed at one end.
  const middling=weights.filter(w=>w>.2&&w<.8).length;
  expect(middling).toBeGreaterThan(arrows.length*.25);
 });
 it('orders weight the same way as magnitude',()=>{
  const arrows=vectorGrid(rod,AREA,.75);
  const byMagnitude=[...arrows].sort((a,b)=>a.magnitude-b.magnitude);
  for(let i=1;i<byMagnitude.length;i++)expect(byMagnitude[i].weight).toBeGreaterThanOrEqual(byMagnitude[i-1].weight-1e-9);
 });
 it('gives every arrow full weight when the field is uniform',()=>{
  // Two equal sheets of charge far away approximate a flat field; with no spread to
  // normalise against, nothing should be drawn as though it were weaker than the rest.
  const flat=vectorGrid([charge(0,-400,1e-6)],{x0:-1,y0:0,x1:1,y1:0},1);
  for(const a of flat)expect(a.weight).toBeGreaterThan(.9);
 });
 it('refuses nonsense input instead of producing NaN',()=>{
  expect(vectorGrid([],AREA,1)).toEqual([]);
  expect(vectorGrid(rod,AREA,0)).toEqual([]);
  expect(vectorGrid(rod,AREA,-1)).toEqual([]);
 });
});
describe('how long to draw one',()=>{
 it('grows with weight but never reaches zero',()=>{
  expect(arrowLength(0,1)).toBeGreaterThan(0);
  expect(arrowLength(1,1)).toBeGreaterThan(arrowLength(0,1));
  // An arrow that vanishes says "no field", which is a different claim from "weak field".
  expect(arrowLength(0,1)).toBeGreaterThan(.2);
 });
 it('stays inside its cell, so a grid of arrows does not become a thicket',()=>{
  for(const w of [0,.25,.5,.75,1])expect(arrowLength(w,1)).toBeLessThan(1);
 });
 it('clamps weights outside the usual range',()=>{
  expect(arrowLength(-5,1)).toBe(arrowLength(0,1));
  expect(arrowLength(9,1)).toBe(arrowLength(1,1));
 });
 it('scales with the grid spacing',()=>{
  expect(arrowLength(.5,2)).toBeCloseTo(2*arrowLength(.5,1),12);
 });
});
