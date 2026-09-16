import {describe, expect, it} from 'vitest';
import {buildStages, stageAt, stageStart, totalSeconds} from '../src/explorer/buildRun';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {isReady} from '../src/problems/readiness';
/* The choreography, checked as choreography.
 *
 * "Watch it build" is one animation that has to make one argument, in order: cut it up, look at
 * a piece, watch what cancels, add what is left, then shrink the pieces away. Every one of those
 * frames existed before, scattered across four controls in four places, which is exactly why
 * nobody found the argument. Keeping the script as data means these checks can read it without
 * running it, and a future retiming cannot quietly drop a stage or put them out of order. */
const ORDER = ['pieces', 'one', 'cancel', 'add', 'limit'];
describe('the build sequence tells the same story for every lesson', () => {
 for (const problem of PROBLEMS) {
  const stages = buildStages(problem);
  it(`${problem.id}: five stages, in the one order that makes the argument`, () => {
   expect(stages.map(s => s.key)).toEqual(ORDER);
   for (const s of stages) {
    expect(s.seconds, `${s.key} must hold the screen`).toBeGreaterThan(1);
    expect(s.name.length, `${s.key} needs a name for its marker`).toBeGreaterThan(2);
    // Long enough to say something, short enough to read while the figure moves.
    expect(s.caption.length).toBeGreaterThan(40);
    expect(s.caption.length).toBeLessThan(340);
   }
  });
  it(`${problem.id}: the pieces are only cut finer at the end`, () => {
   // The limit is the last idea, not a thing happening quietly under the earlier ones. If the
   // partition drifted during the cancellation stage, the two pieces being compared would not
   // be the same two pieces by the end of it.
   for (const s of stages.slice(0, -1)) expect(s.continuum, s.key).toEqual([0, 0]);
   expect(stages[4].continuum).toEqual([0, 1]);
  });
  it(`${problem.id}: the sum is drawn only while it is being added`, () => {
   expect(stages[3].sum).toEqual([0, 1]);
   expect(stages[3].mode).toBe('sum');
   for (const s of [stages[0], stages[1], stages[2]]) expect(s.sum[0]).toBe(s.sum[1]);
  });
 }
 it('only the geometries whose figure draws a mirror partner ask for one', () => {
  // Mirrors `supportsPair` in ChargeDiagram. Asking for a partner the figure will not draw
  // would leave the cancellation stage sitting on an unchanged picture for four seconds --
  // which is worse than not claiming anything, because the caption claims something.
  const asks = PROBLEMS.filter(p => buildStages(p)[2].pair).map(p => p.id).sort();
  expect(asks).toEqual(['arc', 'bisector', 'infinite', 'ring']);
 });
 it('a scalar lesson never claims anything cancels', () => {
  // V is a number. There is no direction to cancel, and saying otherwise would teach the one
  // confusion these lessons exist to prevent.
  for (const p of PROBLEMS.filter(p => p.quantity === 'V')) {
   expect(buildStages(p)[2].pair, p.id).toBe(false);
   expect(buildStages(p)[2].caption, p.id).toMatch(/nothing cancels|already cancelled/i);
  }
 });
 it('every lesson a reader can actually open has a run under half a minute', () => {
  for (const p of PROBLEMS.filter(p => isReady(p.id))) {
   const total = totalSeconds(buildStages(p));
   expect(total, p.id).toBeGreaterThan(12);
   expect(total, p.id).toBeLessThan(30);
  }
 });
});
describe('finding a moment in the run', () => {
 const stages = buildStages(getProblem('bisector'));
 it('starts on the first frame of the first stage', () => {
  expect(stageAt(stages, 0)).toMatchObject({index: 0, local: 0});
 });
 it('each stage starts exactly where the last one ended', () => {
  let t = 0;
  stages.forEach((s, i) => {
   expect(stageStart(stages, i)).toBeCloseTo(t, 6);
   // The instant a stage begins belongs to that stage, not to the one before it.
   expect(stageAt(stages, t).index).toBe(i);
   expect(stageAt(stages, t).local).toBeCloseTo(0, 6);
   // And the instant before it belongs to the previous one, finished.
   if (i > 0) expect(stageAt(stages, t - 1e-6).index).toBe(i - 1);
   t += s.seconds;
  });
 });
 it('settles on the finished last stage rather than wrapping round', () => {
  // A run that overshoots its final frame -- a dropped frame, a slow tab -- must end on the
  // integral. Wrapping to zero would snap the figure back to the first cut at the exact moment
  // the reader is looking at the answer.
  const total = totalSeconds(stages);
  for (const t of [total, total + .5, total * 3]) {
   expect(stageAt(stages, t)).toMatchObject({index: stages.length - 1, local: 1});
  }
 });
});
