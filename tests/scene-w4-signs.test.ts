import {describe, expect, it} from 'vitest';
import {DISK_SIGN_FREE, diskSignMarks} from '../src/diagrams/three/bodies';
/* A SMALL DISK IS MARKED MORE FINELY, NOT LESS.
 *
 * On a phone the disk is drawn at thirty-five units a metre, not forty-two, and with the chosen washer across the middle
 * of its radius -- five rings, the default -- the face round it held five places for a mark, which the names round O
 * cut to one: a disk with a single plus. Now at least DISK_SIGN_FREE are laid on the face free for them, still as dense
 * everywhere as the charge is, and never closer than a mark's width and a little paper. */
const half = (unit: number) => (4.6 + 1.25) / unit;
describe('the disk\'s sign marks on a small figure', () => {
 for (const [R0, unit, band] of [[2, 35, {inner: 1.2, outer: 1.6}], [3, 35, {inner: 1.8, outer: 2.4}], [2, 30, {inner: .8, outer: 1.2}]] as const) it(`R ${R0} at ${unit} units a metre`, () => {
  const h = half(unit), marks = diskSignMarks(R0, unit, band, h), lo = .2 * R0, hi = .92 * R0;
  const r = marks.map(m => Math.hypot(m.x, m.y));
  expect(marks.length, 'places for a mark on the free face').toBeGreaterThanOrEqual(Math.min(DISK_SIGN_FREE - 2, 6));
  for (const x of r) {
   expect(x < band.inner - h + 1e-9 || x > band.outer + h - 1e-9).toBe(true);
   expect(x).toBeGreaterThanOrEqual(lo - 1e-9);
   expect(x).toBeLessThanOrEqual(hi + 1e-9);
  }
  for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++)
   expect(Math.hypot(marks[i].x - marks[j].x, marks[i].y - marks[j].y) * unit).toBeGreaterThanOrEqual(2.6 * 5.85 - 1e-9);
 });
 it('as dense inside the chosen washer as outside it', () => {
  const unit = 35, R0 = 3, band = {inner: 1.2, outer: 1.5}, h = half(unit), lo = .2 * R0, hi = .92 * R0;
  const r = diskSignMarks(R0, unit, band, h).map(m => Math.hypot(m.x, m.y));
  const inner = r.filter(x => x < band.inner).length / (Math.PI * ((band.inner - h) ** 2 - lo ** 2));
  const outer = r.filter(x => x > band.outer).length / (Math.PI * (hi ** 2 - (band.outer + h) ** 2));
  expect(Math.max(inner, outer) / Math.min(inner, outer)).toBeLessThan(1.5);
 });
});
