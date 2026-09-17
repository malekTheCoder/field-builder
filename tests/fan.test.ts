import {describe, expect, it} from 'vitest';
import {area, exitDistance, rayToEdge, sub, unit, wedgePath, type Point, type Rect} from '../src/diagrams/fan';
/* The geometry the unbounded lessons are being rebuilt on, checked with arithmetic.
 *
 * A piece of an infinite line cannot be drawn where it is, but the ANGLE it subtends at the
 * observation point can always be drawn, because angles at P do not run off the page. Everything
 * here serves that: rays out of P, and the wedge between two of them, clipped to the picture. */
const FRAME: Rect = {x: 0, y: 0, width: 100, height: 60};
const mid: Point = {x: 50, y: 30};
describe('directions', () => {
 it('points from one place to another, at unit length', () => {
  const d = unit(sub({x: 53, y: 34}, {x: 50, y: 30}))!;
  expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 12);
  expect(d).toEqual({x: .6, y: .8});
 });
 it('has no direction to give when the two places are the same', () => {
  // The seam a wedge is built from can coincide with P -- the semi-infinite line's first seam
  // sits at the foot of the perpendicular. Returning a made-up direction there would draw a ray
  // pointing somewhere arbitrary and call it physics.
  expect(unit({x: 0, y: 0})).toBeNull();
  expect(unit(sub(mid, mid))).toBeNull();
 });
});
describe('a ray leaving the picture', () => {
 it('measures the distance to the edge it actually hits', () => {
  expect(exitDistance(mid, {x: 1, y: 0}, FRAME)).toBeCloseTo(50, 9);
  expect(exitDistance(mid, {x: 0, y: -1}, FRAME)).toBeCloseTo(30, 9);
  // Diagonal: the nearer slab wins. 30 up costs 30/.6 = 50; 50 across costs 50/.8 = 62.5.
  expect(exitDistance(mid, {x: .8, y: -.6}, FRAME)).toBeCloseTo(50, 9);
 });
 it('lands on the edge, and never a hair outside it', () => {
  for (const angle of Array.from({length: 24}, (_, i) => i * Math.PI / 12)) {
   const end = rayToEdge(mid, {x: Math.cos(angle), y: Math.sin(angle)}, FRAME);
   expect(end.x).toBeGreaterThanOrEqual(FRAME.x);
   expect(end.x).toBeLessThanOrEqual(FRAME.x + FRAME.width);
   expect(end.y).toBeGreaterThanOrEqual(FRAME.y);
   expect(end.y).toBeLessThanOrEqual(FRAME.y + FRAME.height);
   // And it really reached an edge rather than stopping short.
   const onEdge = Math.min(end.x - FRAME.x, FRAME.x + FRAME.width - end.x, end.y - FRAME.y, FRAME.y + FRAME.height - end.y);
   expect(onEdge, `angle ${angle.toFixed(2)} stopped inside the frame`).toBeCloseTo(0, 6);
  }
 });
});
describe('the wedge a piece subtends', () => {
 const right = {x: 1, y: 0}, up = {x: 0, y: -1}, left = {x: -1, y: 0}, down = {x: 0, y: 1};
 it('stays inside the picture however wide it opens', () => {
  for (const [a, b] of [[right, up], [up, left], [left, down], [right, down]] as const) {
   const poly = wedgePath(mid, a, b, FRAME);
   expect(poly.length).toBeGreaterThan(2);
   for (const p of poly) {
    expect(p.x).toBeGreaterThanOrEqual(FRAME.x - 1e-6);
    expect(p.x).toBeLessThanOrEqual(FRAME.x + FRAME.width + 1e-6);
    expect(p.y).toBeGreaterThanOrEqual(FRAME.y - 1e-6);
    expect(p.y).toBeLessThanOrEqual(FRAME.y + FRAME.height + 1e-6);
   }
  }
 });
 it('gives a quarter of the picture to a quarter turn from the middle', () => {
  // From the centre, the wedge from due-right to due-up is exactly the top-right quadrant.
  expect(area(wedgePath(mid, right, up, FRAME))).toBeCloseTo(50 * 30, 6);
 });
 it('adds up to the whole picture when the pieces do', () => {
  // The real invariant: a fan that sweeps every direction covers the frame exactly once. If the
  // wedges overlapped or left gaps, a reader clicking between two pieces would select the wrong
  // one, or none.
  const n = 16;
  const dirs = Array.from({length: n + 1}, (_, i) => ({x: Math.cos(2 * Math.PI * i / n), y: Math.sin(2 * Math.PI * i / n)}));
  const total = dirs.slice(0, n).reduce((sum, d, i) => sum + area(wedgePath(mid, d, dirs[i + 1], FRAME)), 0);
  expect(total).toBeCloseTo(FRAME.width * FRAME.height, 6);
 });
 it('covers the picture from a corner too, where every wedge is lopsided', () => {
  const corner = {x: 2, y: 2}, n = 16;
  const dirs = Array.from({length: n + 1}, (_, i) => ({x: Math.cos(2 * Math.PI * i / n), y: Math.sin(2 * Math.PI * i / n)}));
  const total = dirs.slice(0, n).reduce((sum, d, i) => sum + area(wedgePath(corner, d, dirs[i + 1], FRAME)), 0);
  expect(total).toBeCloseTo(FRAME.width * FRAME.height, 6);
 });
 it('draws nothing for a wedge that misses the picture', () => {
  // P can sit outside the frame mid-drag. A wedge pointing away from the picture must produce no
  // polygon at all, rather than a sliver pinned to the nearest edge.
  const outside = {x: -40, y: 30};
  expect(area(wedgePath(outside, {x: -1, y: -.2}, {x: -1, y: .2}, FRAME))).toBeCloseTo(0, 9);
 });
 it('is the same wedge whichever way round its two edges are given', () => {
  expect(area(wedgePath(mid, right, up, FRAME))).toBeCloseTo(area(wedgePath(mid, up, right, FRAME)), 6);
 });
});
describe('the fan of an infinite line, from the lesson\'s own substitution', () => {
 // y = r tan θ, θ from −π/2 to π/2, cut into equal steps: the partition the sampler uses. P sits
 // at (r, 0) and the line is the y-axis, so the direction from P to the seam at angle θ is
 // (−cos θ, sin θ) -- which stays finite as θ → ±π/2, where the charge itself does not.
 const r = 3, n = 5;
 const seamDirection = (i: number) => {
  const theta = Math.PI * (i / n - .5);
  return unit(sub({x: 0, y: r * Math.tan(theta)}, {x: r, y: 0}));
 };
 it('every seam has a direction, including the two at infinity', () => {
  for (let i = 0; i <= n; i++) expect(seamDirection(i), `seam ${i}`).not.toBeNull();
 });
 it('the outermost rays run parallel to the line, which is where the charge went', () => {
  // θ → ±π/2 is y → ±∞. The ray does not diverge; it lies down along the wire. That is the whole
  // reason a reader can still be shown the piece.
  const first = seamDirection(0)!, last = seamDirection(n)!;
  expect(Math.abs(first.x)).toBeLessThan(.31);
  expect(Math.abs(last.x)).toBeLessThan(.31);
  expect(first.y).toBeLessThan(-.95);
  expect(last.y).toBeGreaterThan(.95);
 });
 it('the fan is symmetric about the perpendicular, as the physics is', () => {
  for (let i = 0; i <= n; i++) {
   const a = seamDirection(i)!, b = seamDirection(n - i)!;
   expect(a.x).toBeCloseTo(b.x, 12);
   expect(a.y).toBeCloseTo(-b.y, 12);
  }
 });
 it('no wedge of it is too thin to point at', () => {
  // The complaint that holds this lesson back. In metres the outer piece is 950 long and 99.97%
  // off frame; in angle it is a 36-degree wedge, the same as every other piece, and all of it is
  // on screen. Measured in a frame the shape of the real one.
  const frame: Rect = {x: 42, y: 54, width: 626, height: 317};
  const p: Point = {x: 325, y: 216};
  const smallest = Math.min(...Array.from({length: n}, (_, i) =>
   area(wedgePath(p, seamDirection(i)!, seamDirection(i + 1)!, frame))));
  expect(smallest / (frame.width * frame.height)).toBeGreaterThan(.02);
 });
});
