import {describe,expect,it} from 'vitest';
import {angleBetween,phrase,read,strayComponent,type Plane} from '../src/workbench/prediction';
const v=(x:number,y:number):Plane=>({x,y});
const both=(r:ReturnType<typeof read>)=>[phrase(r,true),phrase(r,false)];
describe('reading a guess against the field',()=>{
 it('reads only the direction, at any length, because magnitude was never asked for',()=>{
  // The same direction at a tenth and at a hundred times the length is the same answer.
  for(const k of [.01,.5,1,7,140])expect(read(v(3*k,4*k),v(3,4))).toBe('aligned');
 });
 it('is generous about a hand-aimed arrow, and firm about a real disagreement',()=>{
  expect(read(v(1,0),v(1,.2))).toBe('aligned');      // ~11 degrees: arguing, not measuring
  expect(read(v(1,0),v(1,1))).toBe('off');           // 45
  expect(read(v(1,0),v(0,1))).toBe('across');        // 90
  expect(read(v(1,0),v(-1,.1))).toBe('opposite');    // ~174
 });
 it('knows the ring centre has no direction to guess at',()=>{
  expect(read(v(1,0),v(0,0))).toBe('vanishing');
  expect(read(v(0,0),v(0,0))).toBe('vanishing');
 });
 it('asks for an arrow rather than judging an absent one',()=>{
  expect(read(v(0,0),v(1,0))).toBe('none');
 });
 it('measures the angle only to choose a sentence, never to report one',()=>{
  expect(angleBetween(v(1,0),v(0,1))).toBeCloseTo(90,10);
  expect(angleBetween(v(1,0),v(-1,0))).toBeCloseTo(180,10);
  expect(angleBetween(v(50,0),v(.001,0))).toBeCloseTo(0,10);
  // degenerate input must not produce NaN, since it picks a branch
  for(const [a,b] of [[v(0,0),v(1,0)],[v(1,0),v(0,0)],[v(0,0),v(0,0)]] as [Plane,Plane][])
   expect(Number.isFinite(angleBetween(a,b))).toBe(true);
 });
});
describe('what the student is told',()=>{
 const readings=['none','vanishing','aligned','across','opposite','off'] as const;
 it('never marks the guess right or wrong',()=>{
  // "point" is unavoidable vocabulary when the whole subject is which way something points,
  // so only the scoring senses are forbidden.
  const forbidden=/\b(correct|incorrect|wrong|right answer|good|bad|well done|try again|scored?|mastery|marks?|\d+\s*points?|points? (earned|awarded|lost))\b/i;
  for(const r of readings)for(const line of both(r)){
   expect(line,r).not.toMatch(forbidden);
   expect(line.length,r).toBeGreaterThan(10);
   expect(line,r).not.toMatch(/\\[a-zA-Z]+/);   // spoken aloud, never through KaTeX
   expect(line.trim(),r).toBe(line);
  }
 });
 it('never reports a number — no degrees, no percentages, no ratios',()=>{
  // A measurement is not an explanation. "Forty degrees off" teaches nothing about why.
  for(const r of readings)for(const line of both(r)){
   expect(line,r).not.toMatch(/\d/);
   expect(line,r).not.toMatch(/\b(degrees?|percent|times|longer|shorter|too (long|short))\b/i);
  }
 });
 it('explains the physics of the direction rather than the geometry of the miss',()=>{
  expect(phrase('across',true)).toMatch(/cancel/i);
  expect(phrase('across',true)).toMatch(/pairs?/i);
  expect(phrase('vanishing',true)).toMatch(/zero/i);
  expect(phrase('vanishing',true)).toMatch(/partner|cancel/i);
 });
 it('gets the sign of the charge right, since which way "away" runs depends on it',()=>{
  expect(phrase('opposite',true)).toMatch(/away from positive/i);
  expect(phrase('opposite',false)).toMatch(/toward negative/i);
  expect(phrase('opposite',true)).not.toMatch(/toward negative/i);
 });
 it('asks for an arrow when there is none, without comment on the reader',()=>{
  expect(phrase('none',true)).toMatch(/aim/i);
 });
});
describe('the component that should not be there',()=>{
 it('is zero when the guess lies along the field, at any length or sign',()=>{
  expect(strayComponent(v(3,0),v(1,0))).toBeCloseTo(0,12);
  expect(strayComponent(v(-5,0),v(1,0))).toBeCloseTo(0,12);
 });
 it('measures what a student added along the axis the geometry cancels',()=>{
  expect(strayComponent(v(1,1),v(1,0))).toBeCloseTo(1,12);
  expect(strayComponent(v(0,4),v(1,0))).toBeCloseTo(4,12);
 });
 it('counts the whole guess as stray where the field vanishes',()=>{
  expect(strayComponent(v(3,4),v(0,0))).toBeCloseTo(5,12);
 });
});
