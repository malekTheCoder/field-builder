import {describe, expect, it} from 'vitest';
import type {ChargeSample} from '../src/distributions/types';
import type {Vec} from '../src/symbolic/physics';
import {fieldLines, lineHeads, type Plane} from '../src/diagrams/fieldlines';
import {latticeCore, meridianLines, sheetLines, sheetRoots, spaceLines} from '../src/diagrams/field3d';
import {arrowHead, lineStrength, wireRadius, writesDepth} from '../src/diagrams/three/bodies';
import {chainBeside} from '../src/diagrams/three/runScene';
import {coarsen, sampleDistribution} from '../src/diagrams/sampling';
import {bodyDistance, bodyFoot, PLOT} from '../src/diagrams/vectorfield';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';
/* THE FIELD LINES SAY WHICH WAY THE FIELD GOES, AND WHERE IT COMES FROM.
 *
 * A scene critic found that no field line, flat or in space, carried a direction -- a negative
 * charge drew exactly the lines a positive one did -- and that every line began in empty space, an
 * element spacing beside the charge it is the field of. In space it found more: the ring cut into
 * five drew the field of five lumps, none of its lines reaching the ring; the sheet hid the field
 * under it, began and ended its lines in mid-air, and was seeded in clumps; the side view of the
 * sheet left a hole over P in a field that is the same everywhere; the arrowheads read as dots;
 * Add them up buried its chain inside the net arrow. Each is pinned here in the shipped
 * configuration, by a check that fails on the old code. */
const params = (over: Partial<Params> = {}): Params => ({...DEFAULT_PARAMS, ...over});
/** What FieldCanvas traces with: ChargeDiagram's field partition, coarsened to the canvas budget. */
const flatCharge = (id: ProblemId, p: Params, n = DEFAULT_PARAMS.slices) => coarsen(sampleDistribution(id, p, Math.max(n, ['infinite', 'semi', 'sheet'].includes(id) ? 400 : 96)), ['infinite', 'semi', 'sheet'].includes(id) ? 192 : 64);
const frameReach = (p: Params) => Math.max(2.5, p.distance * 1.7, p.size);
const span = (c: readonly ChargeSample[]) => Math.max(...c.map(s => Math.hypot(s.position.x, s.position.y, s.position.z)), 1);
const flatTrace = (p: Params, c: readonly ChargeSample[]) => {
 const reach = frameReach(p);
 return {step: Math.min(reach, span(c)) * .05, maxSteps: 420, outerLimit: reach * 1.6, seedLimit: reach * .95};
};
/** The bisector figure's projection, near enough: O in the window's middle, 40 units a metre, y up. */
const toScreen = (q: Plane) => ({x: 360 + q.x * 40, y: 215 - q.y * 40});
describe('a field line carries its direction', () => {
 it('a head sits on the visible part of a line, pointing the way the line runs', () => {
  const line = [{x: 100, y: 200}, {x: 300, y: 200}];
  const [head] = lineHeads(line, PLOT);
  expect(head.dx).toBe(1);
  expect(head.x).toBeCloseTo(200, 6);
  const [back] = lineHeads([...line].reverse(), PLOT);
  expect(back.dx).toBe(-1);
  // One straight segment from inside the window to far past its edge -- the sheet's lines are drawn
  // like this -- gets its head in the middle of the part that can be seen, not of the whole segment.
  const [out] = lineHeads([{x: 360, y: 300}, {x: 360, y: -5000}], PLOT);
  expect(out.y).toBeGreaterThan(PLOT.y);
  expect(out.y).toBeCloseTo((300 + PLOT.y + 6) / 2, 6);
  // A line that only clips a corner of the window is not marked.
  expect(lineHeads([{x: PLOT.x - 50, y: PLOT.y + 10}, {x: PLOT.x + 10, y: PLOT.y - 50}], PLOT)).toEqual([]);
  // A long line is marked along its length.
  expect(lineHeads([{x: 50, y: 100}, {x: 660, y: 100}], PLOT).length).toBeGreaterThan(1);
 });
 it('flipping the charge turns every head round: out of a positive rod, into a negative one', () => {
  for (const q of [2, -2]) {
   const p = params({charge: q}), c = flatCharge('bisector', p);
   const lines = fieldLines(c, 15, {...flatTrace(p, c), root: bodyFoot(c, 'wire')});
   let right = 0;
   for (const line of lines) {
    const screen = line.map(toScreen);
    for (const h of lineHeads(screen, PLOT)) {
     // Right of the rod every element pushes a positive charge's field to +x, so E_x has the
     // charge's sign everywhere there; on the screen, +x is +x.
     if ((h.x - 360) / 40 < .3) continue;
     right++;
     expect(Math.sign(h.dx), `q = ${q}: a head at (${h.x.toFixed(0)}, ${h.y.toFixed(0)})`).toBe(Math.sign(q));
    }
   }
   expect(right, `q = ${q}: no head right of the rod`).toBeGreaterThan(3);
  }
 });
});
describe('a field line begins on the charge it comes from', () => {
 it('flat: every line that comes to the rod is finished on it, for either sign', () => {
  for (const q of [2, -2]) {
   const p = params({charge: q}), c = flatCharge('bisector', p), on = bodyDistance(c, 'wire');
   const at = (v: Plane) => on(v.x, v.y, 0);
   const near = .5;
   const joined = fieldLines(c, 15, {...flatTrace(p, c), root: bodyFoot(c, 'wire')});
   const bare = fieldLines(c, 15, flatTrace(p, c));
   // The rod end of each line: its start for a positive charge, its end for a negative one.
   const root = (l: Plane[]) => q > 0 ? l[0] : l[l.length - 1];
   const reaching = joined.filter(l => at(root(l)) < near);
   expect(reaching.length, `q = ${q}`).toBeGreaterThan(8);
   for (const l of reaching) expect(at(root(l)), `q = ${q}`).toBeLessThan(1e-9);
   // Without the join, the tracer stops a spacing short, as it must: none of them touches the rod.
   for (const l of bare) expect(at(root(l)), `q = ${q}, unjoined`).toBeGreaterThan(.05);
  }
 });
 it('in space: every line that comes to a wire is finished at the surface of its tube', () => {
  const p = params(), reach = Math.round(Math.min(9, Math.max(3.5, p.size * 1.5)) * 2) / 2, wr = wireRadius(reach);
  const few = coarsen(sampleDistribution('ring', p, 96), 48), on = bodyDistance(few, 'wire');
  const opts = {step: Math.min(reach, span(few)) * .04, maxSteps: 420, outerLimit: reach * 1.6, seedLimit: reach * .95};
  const joined = spaceLines(few, 'wire', 16, {...opts, root: {inset: wr}});
  const roots = joined.map(l => l[0]).filter(v => on(v.x, v.y, v.z) < .5);
  expect(roots.length).toBeGreaterThan(8);
  for (const v of roots) expect(on(v.x, v.y, v.z)).toBeCloseTo(wr, 6);
  // Unjoined, a line stops short of the tube. Its seeds now stand an eighth of the ring's radius off the wire
  // (see `seedOffset`), not the picture's six hundredths, so it can come a little nearer -- never into it.
  for (const l of spaceLines(few, 'wire', 16, opts)) expect(on(l[0].x, l[0].y, l[0].z)).toBeGreaterThan(1.2 * wr);
 });
 it('a ring cut into five is drawn with the field of the RING: every line rooted on it, none floating', () => {
  // ChargeDiagram traces from max(N, 96) pieces. From the reader's five, the lines are the field of
  // five lumps: rooted up to 1.8 m off the ring, with fragments floating free at both ends.
  const p = params(), reach = 6, R = p.size / 2;
  const offRing = (v: Vec) => Math.hypot(Math.hypot(v.x, v.y) - R, v.z);
  const lines = (n: number) => {
   const few = coarsen(sampleDistribution('ring', p, n), 48);
   return spaceLines(few, 'wire', 16, {step: Math.min(reach, span(few)) * .04, maxSteps: 420, outerLimit: reach * 1.6, seedLimit: reach * .95, root: {inset: wireRadius(reach)}});
  };
  const fine = lines(Math.max(5, 96));
  expect(fine.length).toBeGreaterThan(8);
  for (const l of fine) {
   const ends = [l[0], l[l.length - 1]].map(offRing).sort((a, b) => a - b);
   // One end on the ring; the other has left the picture, never stopped in it.
   expect(ends[0]).toBeLessThan(.3);
   expect(Math.hypot(l[l.length - 1].x, l[l.length - 1].y, l[l.length - 1].z)).toBeGreaterThan(reach);
  }
  expect(Math.max(...lines(5).map(l => offRing(l[0])))).toBeGreaterThan(.3);
 });
});
describe('the infinite sheet', () => {
 it('in the side view, its lines leave the sheet evenly spaced across the window, one beside the axis', () => {
  const p = params(), c = flatCharge('sheet', p);
  const lines = meridianLines(c, 'surface', 15, {...flatTrace(p, c), seedSpan: 8, root: {}});
  // Where each line above the sheet meets it, on the side x > 0.
  const xs = lines.map(l => l.reduce((a, b) => Math.abs(b.z) < Math.abs(a.z) ? b : a)).filter(v => v.x > 0 && lines.length).map(v => v.x).sort((a, b) => a - b);
  const unique = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 1e-6);
  expect(unique.length).toBeGreaterThan(4);
  const gaps = unique.slice(1).map((x, i) => x - unique[i]), mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  for (const g of gaps) expect(Math.abs(g / mean - 1), `gaps ${gaps.map(v => v.toFixed(2)).join(' ')}`).toBeLessThan(.05);
  expect(unique[0]).toBeLessThan(mean);
 });
 it('in space, its lines are straight, square to the plane, on both faces, ordered along the field', () => {
  const roots = sheetRoots(7, 20);
  expect(roots.length).toBe(20);
  for (const sign of [1, -1]) {
   const lines = sheetLines(roots, 40, sign);
   expect(lines.filter(l => l.some(v => v.z < 0)).length).toBe(20);
   expect(lines.filter(l => l.some(v => v.z > 0)).length).toBe(20);
   for (const l of lines) {
    expect(l[0].x).toBe(l[1].x);expect(l[0].y).toBe(l[1].y);
    // Away from the plane for positive charge, into it for negative.
    expect(Math.sign(Math.abs(l[1].z) - Math.abs(l[0].z))).toBe(sign);
   }
  }
  // The same number of lines on every patch: as many roots inside half the area as outside it.
  const inner = roots.filter(r => Math.hypot(r.x, r.y) < 7 / Math.SQRT2).length;
  expect(Math.abs(inner - 10)).toBeLessThanOrEqual(1);
 });
 it('its arrows point away from it on both sides, and it never hides them', () => {
  expect(writesDepth('sheet')).toBe(false);
  expect(writesDepth('disk')).toBe(false);
  expect(writesDepth('wire')).toBe(true);
  const few = coarsen(sampleDistribution('sheet', params(), 400), 144);
  const arrows = latticeCore(few, 4.5, 'surface');
  expect(arrows.length).toBeLessThanOrEqual(64);
  expect(arrows.some(a => a.at.z < 0 && a.dir.z < -.9)).toBe(true);
  expect(arrows.some(a => a.at.z > 0 && a.dir.z > .9)).toBe(true);
 });
});
describe('marks in space', () => {
 it('an arrowhead is longer than it is wide, at any length the figure draws', () => {
  const px = 1 / 42;
  for (const [length, thick] of [[2.4, .045], [1.1, .037], [.6, .033], [3, .018]]) {
   const h = arrowHead(length, thick, px);
   expect(h.length).toBeLessThanOrEqual(length * .45 + 1e-12);
   expect(h.length / (2 * h.half)).toBeGreaterThanOrEqual(1.5);
   if (length > 1) expect(h.length).toBeGreaterThanOrEqual(Math.max(7 * thick, 9 * px) - 1e-12);
  }
 });
 it('a field line fades with distance from the charge, not from O', () => {
  const wire = coarsen(sampleDistribution('infinite', params(), 400), 144), away = bodyDistance(wire, 'wire');
  // Three metres out from the infinite line, at its middle and five metres along it.
  const here = lineStrength(away(3, 0, 0), 6), along = lineStrength(away(3, 5, 0), 6);
  expect(Math.abs(here - along)).toBeLessThan(.02);
 });
 it('the chain is moved beside the net arrow exactly where it would lie inside it', () => {
  const up = (k: number): Vec => ({x: 0, y: 0, z: k});
  expect(chainBeside([up(0), up(1), up(2.5), up(3)], up(3))).toBe(true);
  expect(chainBeside([up(0), up(1)], null)).toBe(true);
  // A ring's links lean round the axis.
  const ring = [up(0), {x: .5, y: 0, z: 1}, {x: .3, y: .4, z: 2}, {x: 0, y: 0, z: 3}];
  expect(chainBeside(ring, up(3))).toBe(false);
  expect(chainBeside(null, up(1))).toBe(false);
 });
});
