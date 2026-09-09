import {describe,it,expect} from 'vitest';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../src/problems/types';
import {field,numerical,magnitude,K,EPS0,type Vec} from '../src/symbolic/physics';
const params=(extra:Partial<Params>={}):Params=>({...DEFAULT_PARAMS,...extra});
const ids:ProblemId[]=['bisector','axial','infinite','ring','disk','semi','arc','sheet'];
function closeVector(actual:Vec,expected:Vec,tolerance=3e-5){const scale=magnitude(expected);for(const axis of ['x','y','z'] as const)expect(Math.abs(actual[axis]-expected[axis])).toBeLessThan(tolerance*Math.max(scale,1e-12));}
describe('closed forms against independent point-charge quadrature',()=>{
 for(const id of ids)for(const charge of [2,-1.7])it(`${id}, charge ${charge}`,()=>{
  const p=params({distance:1.37,size:3.8,phi:4.4,charge});closeVector(field(id,p),numerical(id,p,40000));
 });
 for(const id of ['ring','disk','sheet'] as const)it(`${id} below the plane`,()=>{
  const p=params({distance:-1.7,charge:-2.4});closeVector(field(id,p),numerical(id,p,40000));
 });
});
describe('geometry, signs and limiting cases',()=>{
 it('semi-infinite line has negative x, positive y, and a 135° direction',()=>{
  const v=field('semi',params());expect(v.x).toBeLessThan(0);expect(v.y).toBeGreaterThan(0);expect(v.x).toBe(-v.y);expect(Math.atan2(v.y,v.x)).toBeCloseTo(3*Math.PI/4,12);
 });
 for(const id of ids)it(`${id} reverses exactly when charge reverses`,()=>{
  const v=field(id,params()),n=field(id,params({charge:-DEFAULT_PARAMS.charge}));closeVector(n,{x:-v.x,y:-v.y,z:-v.z},1e-14);
 });
 for(const id of ['bisector','axial','ring','disk'] as const)it(`${id} recovers the point charge far field`,()=>{
  const p=params({distance:1e7});expect(magnitude(field(id,p))/(K*p.charge*1e-9/p.distance**2)).toBeCloseTo(1,5);
 });
 it('finite rod becomes infinite at fixed linear density',()=>{
  const p=params({size:1e6});closeVector(field('bisector',{...p,charge:p.charge*p.size}),field('infinite',p),1e-9);
 });
 it('growing disk becomes a sheet at fixed surface density',()=>{
  const p=params({size:1e8});closeVector(field('disk',{...p,charge:p.charge*Math.PI*(p.size/2)**2}),field('sheet',p),1e-6);
 });
 it('ring center has zero field; its axial maximum is R/√2',()=>{
  expect(magnitude(field('ring',params({distance:0})))).toBe(0);const R=DEFAULT_PARAMS.size/2,peak=R/Math.sqrt(2);const at=(distance:number)=>field('ring',params({distance})).z;
  expect(at(peak)).toBeGreaterThan(at(peak-.01));expect(at(peak)).toBeGreaterThan(at(peak+.01));
 });
 it('arc closes to zero and shrinks to a point at fixed Q',()=>{
  expect(magnitude(field('arc',params({phi:2*Math.PI})))).toBeLessThan(1e-14);expect(field('arc',params({phi:1e-8})).x).toBeCloseTo(-K*DEFAULT_PARAMS.charge*1e-9/(DEFAULT_PARAMS.size/2)**2,12);
 });
 it('sheet is distance-independent and has opposite one-sided limits',()=>{
  const above=field('sheet',params({distance:.001})).z;expect(above).toBe(field('sheet',params({distance:1e4})).z);expect(above).toBe(-field('sheet',params({distance:-.001})).z);
  expect(above).toBeCloseTo(DEFAULT_PARAMS.charge*1e-9/(2*EPS0),12);
 });
 for(const id of ['disk','sheet'] as const)it(`${id} excludes the ideal charged surface`,()=>{
  expect(field(id,params({distance:0})).z).toBeNaN();expect(numerical(id,params({distance:0})).z).toBeNaN();
 });
});
