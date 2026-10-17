import {describe,expect,it} from 'vitest';
import {offShellSurface} from '../src/state/shellPoint';
import {DEFAULT_PARAMS as p} from '../src/problems/types';
import {shellField} from '../src/distributions/shell';
describe('a shell lesson never presents the surface mean as an ordinary field',()=>{
 for(const charge of [2,-2])it(`a link on the skin opens outside with the full field, charge ${charge}`,()=>{
  const q=offShellSurface({...p,distance:2,charge});
  expect(q.distance).toBeGreaterThan(2);
  expect(shellField(2,charge*1e-9,q.distance)).toBeCloseTo(8.9875517923*charge/q.distance**2,6);
 });
 it('a distance slider crosses the skin in either direction rather than getting stuck',()=>{
  const at={...p,distance:2};
  expect(offShellSurface(at,{...p,distance:2.05}).distance).toBeLessThan(2);
  expect(offShellSurface(at,{...p,distance:1.95}).distance).toBeGreaterThan(2);
 });
 it('growing the shell past P puts P inside, and shrinking it past P puts P outside',()=>{
  const at={...p,distance:2,size:4};
  expect(offShellSurface(at,{...at,size:3.9}).distance).toBeLessThan(2);
  expect(offShellSurface(at,{...at,size:4.1}).distance).toBeGreaterThan(2);
 });
 it('the smallest shell stays inside the height slider domain',()=>{
  expect(offShellSurface({...p,size:1,distance:.5},{...p,size:1,distance:.55}).distance).toBeGreaterThan(.5);
 });
});
