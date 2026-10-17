import {describe, expect, it} from 'vitest';
import {sampleDistribution, sumSamples} from '../src/diagrams/sampling';
import {acrossAxis, pairOrder, pairPlan, pairShares, pairSum, PAIRED} from '../src/diagrams/pairs';
import {field, magnitude} from '../src/symbolic/physics';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE SUM IN MIRROR PAIRS IS THE SUM. Watch it build adds a symmetric charge's pieces a piece and its mirror at a
 * time, so that the sum is an arrow along the axis at every moment (see `pairs.ts`). That is only honest if every
 * partial sum really lies on the axis, every piece goes in exactly once, and the whole is the sum of the pieces --
 * for either sign, any cut, and a ring cut an odd number of ways, whose last pair is two half pieces. */
const plus = (a: {x: number; y: number; z: number}, b: {x: number; y: number; z: number}) => ({x: a.x + b.x, y: a.y + b.y, z: a.z + b.z});
describe('every partial sum lies on the axis, and the whole is the sum of the pieces', () => {
 // The rod off its bisector pairs only part of itself, and its leftover leans the sum on purpose: tests/offset.test.ts.
 for (const id of [...PAIRED].filter(id => id !== 'offset')) for (const charge of [2, -3]) for (const n of [3, 4, 5, 7, 30]) for (const distance of [.5, 3, 6]) it(`${id} q=${charge} n=${n} r=${distance}`, () => {
  const p = {...DEFAULT_PARAMS, charge, distance, slices: n, phi: id === 'arc' ? 1.7 * Math.PI : DEFAULT_PARAMS.phi};
  const samples = sampleDistribution(id as never, p, n), total = sumSamples(samples);
  const scale = Math.max(magnitude(total), ...samples.map(s => magnitude(s.field)));
  for (const start of [0, 2, n - 1]) {
   const plan = pairPlan(id, samples, start)!;
   for (let k = 0; k <= plan.length; k++) for (const f of [0, .37, 1]) expect(magnitude(acrossAxis(id, pairSum(plan, k, f))) / scale, `after ${k} + ${f}`).toBeLessThan(1e-12);
   for (const step of plan) expect(magnitude(acrossAxis(id, step.fb ? plus(step.fa, step.fb) : step.fa)) / scale, 'a pair cancels sideways').toBeLessThan(1e-12);
   const end = pairSum(plan, plan.length);
   expect(magnitude(plus(end, {x: -total.x, y: -total.y, z: -total.z})) / scale, 'the whole is the sum of the pieces').toBeLessThan(1e-12);
   for (const share of pairShares(plan, n, plan.length)) expect(share).toBeCloseTo(1, 12);
  }
 });
 it('and a ring\'s, at any cut, is its field exactly', () => {
  for (const n of [3, 5, 6, 7]) {
   const p = {...DEFAULT_PARAMS, slices: n}, plan = pairPlan('ring', sampleDistribution('ring', p, n), 1)!;
   expect(pairSum(plan, plan.length).z / field('ring', p).z).toBeCloseTo(1, 10);
  }
 });
});
describe('the order', () => {
 it('from the middle out on a rod, a line and an arc: the middle piece of an odd count alone, first', () => {
  expect(pairOrder('bisector', 5)!.map(s => [s.a.of, s.b?.of ?? null])).toEqual([[2, null], [3, 1], [4, 0]]);
  expect(pairOrder('arc', 4)!.map(s => [s.a.of, s.b?.of ?? null])).toEqual([[2, 1], [3, 0]]);
 });
 it('the nearest pair first: each step along the axis no bigger, per piece, than the last', () => {
  for (const id of ['bisector', 'infinite']) for (const n of [5, 8, 30]) {
   const plan = pairPlan(id, sampleDistribution(id as never, DEFAULT_PARAMS, n))!, per = (j: number) => magnitude(plan[j].along) / (plan[j].fb ? 2 : 1);
   for (let k = 1; k < plan.length; k++) expect(per(k)).toBeLessThanOrEqual(per(k - 1) * (1 + 1e-12));
  }
 });
 it('round the ring from its first piece: straight across at an even count; at an odd one the length across, then two half pieces', () => {
  expect(pairOrder('ring', 6, 4)!.map(s => [s.a.of, s.b?.of])).toEqual([[4, 1], [5, 2], [0, 3]]);
  const odd = pairOrder('ring', 5, 4)!;
  expect(odd.map(s => [s.a.kind, s.b?.kind])).toEqual([['whole', 'across'], ['whole', 'across'], ['half', 'half']]);
  // The last two halves are straight across from each other: their middles half a turn apart.
  const last = odd[2], mid = (s: {lo: number; hi: number}) => (s.lo + s.hi) / 2;
  expect((mid(last.b!) - mid(last.a) + 1) % 1).toBeCloseTo(.5, 12);
  expect(pairOrder('endpoint', 5)).toBeNull();
 });
});
