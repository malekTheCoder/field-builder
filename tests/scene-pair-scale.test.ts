import {describe, expect, it} from 'vitest';
import {projectCamera} from '../src/diagrams/camera';
import {alongAxis, pairPlan, pairSum, spacePairGain, spacePairShrink} from '../src/diagrams/pairs';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS} from '../src/problems/types';
import type {Vec} from '../src/symbolic/physics';
/* ONE ENLARGEMENT FOR EVERY PAIR IN SPACE (see `spacePairGain`): as large as makes the shortest whole piece's arrow
 * readable, never so large that a pair laid from its own tip of the sum leaves the plot. */
const view = {yaw: -.5, pitch: .6};
const ring = sampleDistribution('ring', DEFAULT_PARAMS, 5), plan = pairPlan('ring', ring, 4)!;
const total = pairSum(plan, plan.length);
/** The sum fitted to `length` units on the screen, as the run fits it. */
const screenAt = (length: number) => {
 const t = projectCamera(total, view.yaw, view.pitch), k = length / Math.hypot(t.x, t.y);
 return (v: Vec) => { const s = projectCamera(v, view.yaw, view.pitch); return {x: k * s.x, y: k * s.y}; };
};
const box = {x: 52, y: 82, width: 606, height: 279}, from = {x: 315, y: 233};
describe('one enlargement for every pair in space', () => {
 it('lets the enlargement go through the cancellation and the merge, and is at the sum\'s scale once in', () => {
  expect(spacePairShrink({cancel: 0, merge: 0})).toBe(0);
  expect(spacePairShrink({cancel: 1, merge: 0})).toBe(.5);
  expect(spacePairShrink({cancel: 1, merge: 1})).toBe(1);
 });
 it('keeps every pair, at every moment of its step, inside the plot', () => {
  const screen = screenAt(123), m = spacePairGain('ring', plan, screen, from, box, 44);
  expect(m).toBeGreaterThan(2);
  const inside = (p: {x: number; y: number}) => p.x >= box.x + 12 - 1e-6 && p.x <= box.x + box.width - 12 + 1e-6 && p.y >= box.y + 12 - 1e-6 && p.y <= box.y + box.height - 12 + 1e-6;
  plan.forEach((st, k) => {
   const s = screen(pairSum(plan, k)), tip = {x: from.x + s.x, y: from.y + s.y};
   for (const v of [st.fa, st.fb!]) { const d = screen(v); expect(inside({x: tip.x + d.x * m, y: tip.y + d.y * m}), `pair ${k}`).toBe(true); }
   for (let c = 0; c <= 1; c += .05) {
    const g = m + (1 - m) * spacePairShrink({cancel: c, merge: 0}), a = screen(alongAxis('ring', st.fa)), b = screen(alongAxis('ring', st.fb!));
    expect(inside({x: tip.x + (a.x * c + b.x) * g, y: tip.y + (a.y * c + b.y) * g}), `pair ${k} cancelling at ${c.toFixed(2)}`).toBe(true);
   }
  });
 });
 it('is the readable size where the plot has room, and never below the sum\'s own scale', () => {
  const small = screenAt(40), m = spacePairGain('ring', plan, small, from, box, 44);
  const shortest = Math.min(...plan.filter(st => st.a.kind !== 'half').flatMap(st => [st.fa, st.fb!]).map(v => Math.hypot(small(v).x, small(v).y)));
  expect(m * shortest).toBeCloseTo(44, 6);
  expect(spacePairGain('ring', plan, screenAt(400), from, box, 44)).toBe(1);
 });
});
