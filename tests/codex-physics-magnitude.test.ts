import {describe,expect,it} from 'vitest';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {K,REGISTRY} from '../src/distributions';
import {potential} from '../src/symbolic/physics';
import {lesson as sheet} from '../src/lessons/sheet';
import {lesson as diskPotential} from '../src/lessons/v-disk';
import {lesson as arcPotential} from '../src/lessons/v-arc';
const text=(lesson:typeof sheet,heading:string)=>lesson.sections.find(s=>s.heading===heading)!.body.filter(b=>typeof b==='string').join(' ');

describe('magnitude claims hold when charge reverses',()=>{
 it('bounds every sheet contribution in magnitude, uniformly as the cut gets finer',()=>{
  for(const charge of [-5,0,5])for(const N of [3,5,30]){
   const p={...DEFAULT_PARAMS,charge},width=Math.PI/(2*N),bound=2*Math.PI*K*Math.abs(charge)*1e-9*width;
   const pieces=REGISTRY.sheet.sample(p,N);
   for(const piece of pieces)expect(Math.abs(piece.field.z)).toBeLessThanOrEqual(bound+1e-12);
   expect(pieces.reduce((sum,piece)=>sum+Math.abs(piece.field.z),0)).toBeLessThanOrEqual(Math.PI**2*K*Math.abs(charge)*1e-9+1e-12);
   for(let i=1;i<N;i++)expect(Math.abs(pieces[i].field.z)).toBeGreaterThanOrEqual(Math.abs(pieces[i-1].field.z));
  }
  expect(text(sheet,'One ring')).toContain('$|\\Delta E_z|$ grows');
  expect(text(sheet,'Add them up')).toContain('magnitude');
  expect(text(sheet,'Add them up')).toContain('2\\pi k|\\sigma|');
  expect(text(sheet,'Add them up')).toContain('N\\Delta\\alpha=\\pi/2');
 });
 it('describes growing disk and arc potentials by magnitude at fixed signed density',()=>{
  for(const density of [-5,5]){
   const disk=[1,4].map(R=>potential('v-disk',{...DEFAULT_PARAMS,distance:1,size:2*R,charge:density*Math.PI*R*R}));
   const arc=[.1*Math.PI,2*Math.PI].map(phi=>potential('v-arc',{...DEFAULT_PARAMS,phi,size:4,charge:density*2*phi}));
   for(const values of [disk,arc]){
    expect(Math.abs(values[1])).toBeGreaterThan(Math.abs(values[0]));
    expect(Math.sign(values[1]-values[0])).toBe(Math.sign(density));
   }
  }
  expect(text(diskPotential,'What the answer says')).toContain('$|V|$ grows');
  expect(text(arcPotential,'What the answer says')).toContain('$|V|$ grows');
 });
});
