import {describe, expect, it} from 'vitest';
import {PROBLEMS} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {bracketKeeps, bracketOf, wholeBracket} from '../src/workbench/bracket';
/* THE RUN OVER A BRACKET. Watch it build used to throw away a bracket the reader had dragged, so its lines could
 * always speak of the whole charge. It keeps the bracket now, and from What cancels on its lines are about the
 * bracketed part: a mirror is drawn only where it is bracketed too, the sum is the bracketed pieces', and the
 * integral is over the bracket. */
const VARIANTS = [{keeps: true, mirrorIn: true}, {keeps: false, mirrorIn: true}, {keeps: false, mirrorIn: false}];
describe('the run\'s lines over a bracket', () => {
 for (const p of PROBLEMS) for (const b of VARIANTS) it(`${p.id} ${JSON.stringify(b)}`, () => {
  const stages = buildStages(p, b), by = Object.fromEntries(stages.map(s => [s.key, s]));
  // Read while the figure moves, in one cell of the transport: each under ninety characters (tests/panel-w3).
  for (const s of stages) expect(s.line.length, `${s.key}: ${s.line}`).toBeLessThanOrEqual(90);
  for (const s of stages) expect(s.caption + s.line, 'no em dash').not.toMatch(/—/);
  // The same stages, at the same times, as over the whole charge: the run's clock does not move under a bracket.
  expect(stages.map(s => s.seconds)).toEqual(buildStages(p).map(s => s.seconds));
  // No mirror drawn from outside the bracket.
  if (!b.mirrorIn) expect(by.cancel.pair).toBe(false);
  expect(by.add.line + by.add.caption, 'the sum is the bracketed part\'s').toMatch(/bracket/);
  expect(by.limit.line, 'the integral is over the bracket').toMatch(/over the bracket/);
  // Never the whole charge's claim that the sum of a ring's pieces is exact: across the axis it is not.
  if (p.quantity === 'E') expect(by.add.line + by.add.caption + by.limit.caption).not.toMatch(/exact all along|exactly the field/);
 });
 it('over the whole charge, the lines are the lesson\'s own', () => {
  for (const p of PROBLEMS) expect(buildStages(p)).toEqual(buildStages(p, undefined));
 });
});
describe('a bracket, as the board writes it', () => {
 const rod = PROBLEMS.find(p => p.id === 'bisector')!, ring = PROBLEMS.find(p => p.id === 'ring')!;
 it('is whole only at both ends', () => {
  expect(wholeBracket([0, 100])).toBe(true);
  expect(wholeBracket([0, 50])).toBe(false);
 });
 it('keeps every mirror only when centred, and a ring only whole', () => {
  expect(bracketKeeps(rod, [25, 75])).toBe(true);
  expect(bracketKeeps(rod, [50, 100])).toBe(false);
  expect(bracketKeeps(ring, [25, 75])).toBe(false);
  expect(bracketOf(rod, [50, 100])).toMatchObject({whole: false, keeps: false, oneSided: true, lower: '0'});
 });
});
