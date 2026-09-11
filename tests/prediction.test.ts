import {describe,expect,it} from 'vitest';
import {compare,describe as say,strayComponent,type Plane} from '../src/workbench/prediction';
const v=(x:number,y:number):Plane=>({x,y});
describe('comparing a guess with the field',()=>{
 it('reads a perfect guess as agreement, in both direction and length',()=>{
  const c=compare(v(3,4),v(3,4));
  expect(c.angle).toBeCloseTo(0,12);expect(c.ratio).toBeCloseTo(1,12);
  expect(c.aligned).toBe(true);expect(c.vanishing).toBe(false);
 });
 it('measures the angle between the arrows regardless of their lengths',()=>{
  expect(compare(v(1,0),v(0,1)).angle).toBeCloseTo(90,10);
  expect(compare(v(50,0),v(0,.001)).angle).toBeCloseTo(90,10);
  expect(compare(v(1,0),v(-1,0)).angle).toBeCloseTo(180,10);
  expect(compare(v(1,1),v(1,0)).angle).toBeCloseTo(45,10);
 });
 it('measures length as a ratio, which is what the two arrows look like',()=>{
  expect(compare(v(2,0),v(1,0)).ratio).toBeCloseTo(2,12);
  expect(compare(v(1,0),v(4,0)).ratio).toBeCloseTo(.25,12);
 });
 it('treats a near miss as agreement, so the remaining sliver is not the lesson',()=>{
  expect(compare(v(1,0),v(1,0.08)).aligned).toBe(true);
  expect(compare(v(1.1,0),v(1,0)).aligned).toBe(true);
  // Far enough out to be worth saying something about.
  expect(compare(v(1,0),v(1,1)).aligned).toBe(false);
  expect(compare(v(3,0),v(1,0)).aligned).toBe(false);
 });
 it('handles the ring centre, where the field really is zero',()=>{
  const none=compare(v(0,0),v(0,0));
  expect(none.vanishing).toBe(true);expect(none.aligned).toBe(true);
  const drewOne=compare(v(1,0),v(0,0));
  expect(drewOne.vanishing).toBe(true);expect(drewOne.aligned).toBe(false);
 });
 it('handles no guess yet without dividing by zero',()=>{
  const c=compare(v(0,0),v(1,0));
  expect(c.ratio).toBe(0);expect(c.aligned).toBe(false);expect(Number.isFinite(c.angle)).toBe(true);
 });
 it('never returns an angle outside 0 to 180, even for hostile input',()=>{
  for(const [a,b] of [[v(1e-9,0),v(1e9,0)],[v(-1e9,1e9),v(1e-9,-1e-9)],[v(1,0),v(1,0)]] as [Plane,Plane][]){
   const {angle}=compare(a,b);
   expect(angle).toBeGreaterThanOrEqual(0);expect(angle).toBeLessThanOrEqual(180);
   expect(Number.isNaN(angle)).toBe(false);
  }
 });
});
describe('what the student is told',()=>{
 it('never marks the guess right or wrong',()=>{
  const forbidden=/\b(correct|incorrect|wrong|right answer|good|bad|well done|try again|score|points?)\b/i;
  const cases:[Plane,Plane][]=[[v(1,0),v(1,0)],[v(1,0),v(0,1)],[v(1,0),v(-1,0)],[v(5,0),v(1,0)],[v(.2,0),v(1,0)],
   [v(0,0),v(1,0)],[v(0,0),v(0,0)],[v(1,0),v(0,0)],[v(1,1),v(1,0)],[v(1,.05),v(1,0)]];
  for(const [g,t] of cases){
   const line=say(g,t);
   expect(line,`${JSON.stringify(g)} vs ${JSON.stringify(t)}`).not.toMatch(forbidden);
   expect(line.length).toBeGreaterThan(10);
   expect(line).not.toMatch(/\\[a-zA-Z]+/); // spoken aloud, never through KaTeX
   expect(line.trim()).toBe(line);
  }
 });
 it('separates a direction miss from a length miss',()=>{
  expect(say(v(2,0),v(1,0))).toMatch(/right direction/i);
  expect(say(v(2,0),v(1,0))).toMatch(/too long/);
  expect(say(v(0,1),v(1,0))).toMatch(/right length/i);
  expect(say(v(0,1),v(1,0))).toMatch(/right angles/);
  expect(say(v(1,0),v(1,0))).toMatch(/agree/);
 });
 it('explains a zero field instead of calling an empty guess correct',()=>{
  expect(say(v(0,0),v(0,0))).toMatch(/no field here|cancelling/i);
  expect(say(v(1,0),v(0,0))).toMatch(/zero/i);
  // The reason is the teaching, so the pairing has to be named.
  expect(say(v(1,0),v(0,0))).toMatch(/partner|cancel/i);
 });
 it('asks for an arrow rather than judging an empty one',()=>{
  expect(say(v(0,0),v(1,0))).toMatch(/drag/i);
 });
 it('reports a reversed arrow as opposite, not as a large angle',()=>{
  expect(say(v(-1,0),v(1,0))).toMatch(/opposite way/);
 });
});
describe('the component that should not be there',()=>{
 it('is zero when the guess lies along the field',()=>{
  expect(strayComponent(v(3,0),v(1,0))).toBeCloseTo(0,12);
  expect(strayComponent(v(-5,0),v(1,0))).toBeCloseTo(0,12);
 });
 it('measures what a student added along the axis the geometry cancels',()=>{
  // A rod on its bisector has no field along the rod; expecting one is the misconception.
  expect(strayComponent(v(1,1),v(1,0))).toBeCloseTo(1,12);
  expect(strayComponent(v(0,4),v(1,0))).toBeCloseTo(4,12);
 });
 it('counts the whole guess as stray where the field vanishes',()=>{
  expect(strayComponent(v(3,4),v(0,0))).toBeCloseTo(5,12);
 });
});
