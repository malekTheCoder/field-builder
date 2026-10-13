import {describe, expect, it} from 'vitest';
import type {Vec} from '../src/symbolic/physics';
import {besideWire, BEHIND_GAP, diskSignMarks, gapLift, signMarks, slabCovers, washerHalf} from '../src/diagrams/three/bodies';
import {cameraBasis} from '../src/diagrams/three/orthoCamera';
import {keptSpans, runScene, type RunSceneInput} from '../src/diagrams/three/runScene';
import {pairOrder, pairShares} from '../src/diagrams/pairs';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';
/* THE SCENE LANE, WAVE 3, ITERATION 1: what the critics found, pinned where it can be without a GPU.
 *
 * In Add them up the sum's arrow grew up through a mirror pair's two parts along the axis, which stayed whole until
 * the merge was over: a chevron on the sum's shaft and a second head on its tip. The pair's whole arrows went on one
 * frame. A ring cut an odd number of ways ended its sum with a piece drawn as never added. The disk's sign marks
 * were four and a half times denser at its rim. The gap behind P whitened the middle of a disk P hovers over. A
 * wire's minus, centred on the tube, read as a cut. A disk's mark behind the chosen washer was cut in half by it.
 * Each of these fails on the code before this change. */
const params = (over: Partial<Params> = {}): Params => ({...DEFAULT_PARAMS, ...over});
const len = (v: Vec) => Math.hypot(v.x, v.y, v.z);

const R = 2;
const ring = (t: number): Vec => ({x: R * Math.cos(2 * Math.PI * t), y: R * Math.sin(2 * Math.PI * t), z: 0});
const base = (over: Partial<RunSceneInput>): RunSceneInput => ({
 stage: 'add', kind: 'wire', closed: true, n: 5, selected: 0, at: ring, partner: null,
 weights: [0, 0, 0, 0, 0], summing: true, continuum: 0, split: 0, arrows: null, chain: null, ...over,
});
/** The pair going into the sum, as ChargeDiagram hands it over: the ring's, each member's part along z equal. */
const pairArrows = (cancelled: number, fade: number, from: Vec = {x: 0, y: 0, z: 1}) => ({
 scale: 1, field: {x: .3, y: .1, z: .5}, keep: {x: 0, y: 0, z: .5}, drop: {x: .3, y: .1, z: 0}, partner: {x: -.3, y: -.1, z: .5},
 partnerKeep: {x: 0, y: 0, z: .5}, partnerDrop: {x: -.3, y: -.1, z: 0}, components: true, cancelled, from, fade});

describe('a mirror pair is taken into the sum as the sum\'s arrow grows over it', () => {
 it('what is left of the parts along the axis never lies under the sum, and ends where the pair ends', () => {
  const from = {x: 0, y: 0, z: 1};
  for (let k = 0; k <= 40; k++) {
   const merge = k / 40, a = runScene(base({arrows: pairArrows(1, 1 - merge, from)})).arrows!;
   const spans = keptSpans(a);
   // The sum's arrow, as ChargeDiagram draws it: the sum so far and `merge` of the pair's two parts along z.
   const tip = from.z + merge * 1;
   for (const s of [spans.piece, spans.partner]) if (s) {
    expect(s.from.z, `merge ${merge}`).toBeGreaterThanOrEqual(tip - 1e-9);
    expect(Math.hypot(s.from.x, s.from.y, s.along.x, s.along.y)).toBeLessThan(1e-12);
   }
   // What is left runs from the sum's tip to the pair's end, without a gap or an overlap.
   const ends = [spans.piece, spans.partner].filter(Boolean).map(s => [s!.from.z, s!.from.z + s!.along.z]);
   if (ends.length) {
    expect(ends[0][0]).toBeCloseTo(tip, 9);
    expect(ends[ends.length - 1][1]).toBeCloseTo(2, 9);
    if (ends.length === 2) expect(ends[1][0]).toBeCloseTo(ends[0][1], 9);
   }
  }
  // Taken in whole, nothing is left.
  const done = keptSpans(runScene(base({arrows: pairArrows(1, 0, from)})).arrows);
  expect(done.piece).toBeNull();
  expect(done.partner).toBeNull();
 });
 it('the mirror\'s part slides out from under the piece\'s as the parts across cancel, as the flat figure\'s does', () => {
  for (const c of [0, .25, .5, 1]) {
   const s = keptSpans(runScene(base({arrows: pairArrows(c, 1)})).arrows);
   expect(s.partner!.from.z).toBeCloseTo(1 + .5 * c, 12);
   expect(s.partner!.along.z).toBeCloseTo(.5, 12);
  }
 });
 it('explaining one piece, What cancels still lays the mirror\'s part on the piece\'s tip once the parts across are half gone', () => {
  const a = (c: number) => runScene(base({stage: 'cancel', arrows: {...pairArrows(c, 1), from: undefined, fade: undefined}})).arrows!;
  expect(keptSpans(a(.3)).partner).toBeNull();
  const s = keptSpans(a(.7));
  expect(s.partner!.from.z).toBeCloseTo(.5, 12);
  expect(s.piece!.along.z).toBeCloseTo(.5, 12);
  expect(a(.7).pair).toBe(false);
  expect(a(.7).whole).toBe(1);
 });
 it('the pair\'s whole arrows fade at the flat figure\'s rate, not all at once at six tenths', () => {
  for (const c of [0, .083, .3, .5, .6, .7, .8, 1]) {
   const a = runScene(base({arrows: pairArrows(c, 1)})).arrows!;
   expect(a.whole, `cancel ${c}`).toBeCloseTo(Math.max(0, Math.min(1, 1 - 1.25 * c)), 12);
   // The piece's own whole arrow is the run's to draw while the pair goes in, beside a mirror's.
   expect(!!a.pieceWhole, `cancel ${c}`).toBe(a.whole > 0);
  }
  // At six tenths both whole arrows are still there, at a quarter: they went on that frame before.
  expect(runScene(base({arrows: pairArrows(.6, 1)})).arrows!.whole).toBeGreaterThan(.2);
  // The middle piece of an odd count lies on the axis and goes in alone: no whole arrow beside it.
  const alone = runScene(base({arrows: {...pairArrows(0, 1), partner: null}})).arrows!;
  expect(alone.pieceWhole).toBeNull();
 });
});

describe('a ring cut an odd number of ways ends its sum with every stretch in it or lit', () => {
 for (const n of [3, 5, 7, 9]) it(`cut ${n} ways`, () => {
  const slots = pairOrder('ring', n, 1)!, last = slots.length - 1, slot = slots[last];
  const input = (withAdded: boolean) => base({n, selected: slot.a.of, selectedSpan: [slot.a.lo, slot.a.hi], partner: {lo: slot.b!.lo, hi: slot.b!.hi},
   weights: pairShares(slots, n, last).map(s => s > .999 ? 1 : 0),
   added: withAdded ? slots.slice(0, last).flatMap(s => s.b ? [[s.a.lo, s.a.hi], [s.b.lo, s.b.hi]] as [number, number][] : [[s.a.lo, s.a.hi]] as [number, number][]) : null});
  const s = runScene(input(true));
  expect(s.spans.added + s.spans.lit).toBeCloseTo(1, 9);
  // No stretch drawn as stepped back except under the partner's own body, which is drawn lit over it.
  const dim: [number, number][] = [];
  s.tones.forEach((tone, i) => { const parts = s.parts[i]; if (parts) parts.filter(q => q.tone === 'dim').forEach(q => dim.push([q.lo, q.hi])); else if (tone === 'dim') dim.push([i / n, (i + 1) / n]); });
  const under = (t: number) => [-1, 0, 1].some(k => t > slot.b!.lo + k - 1e-9 && t < slot.b!.hi + k + 1e-9);
  for (const [lo, hi] of dim) expect(under((lo + hi) / 2) && hi - lo <= .5 / n + 1e-9, `${lo}-${hi}`).toBe(true);
  // Each stretch is cut only at its own piece's ends: a stretch that meets the next in the middle of a piece is
  // not a cut.
  s.parts.forEach((parts, i) => parts?.forEach(q => {
   expect(q.head).toBe(Math.abs(q.lo - i / n) < 1e-9);
   expect(q.tail).toBe(Math.abs(q.hi - (i + 1) / n) < 1e-9);
  }));
  // Told only which pieces are in whole, the sum came up short by the halves.
  const before = runScene(input(false));
  expect(before.spans.added + before.spans.lit).toBeLessThan(1 - .4 / n);
 });
});

describe('the disk\'s sign marks are as dense everywhere as its charge', () => {
 const half = (unit: number) => (4.6 + 1.25) / unit;
 for (const [R0, unit, band] of [[2, 42, {inner: 1.2, outer: 1.6}], [4, 26, {inner: 2.4, outer: 3.2}], [3, 42, {inner: 1.8, outer: 2.4}]] as const) it(`R ${R0} at ${unit}`, () => {
  const marks = diskSignMarks(R0, unit, band, half(unit)), h = half(unit), lo = .2 * R0, hi = .92 * R0;
  const r = marks.map(m => Math.hypot(m.x, m.y));
  for (const x of r) {
   expect(x < band.inner - h + 1e-9 || x > band.outer + h - 1e-9).toBe(true);
   expect(x).toBeGreaterThanOrEqual(lo - 1e-9);
   expect(x).toBeLessThanOrEqual(hi + 1e-9);
  }
  const inner = r.filter(x => x < band.inner).length / (Math.PI * ((band.inner - h) ** 2 - lo ** 2));
  const outer = r.filter(x => x > band.outer).length / (Math.PI * (hi ** 2 - (band.outer + h) ** 2));
  expect(inner).toBeGreaterThan(0);
  expect(outer).toBeGreaterThan(0);
  expect(Math.max(inner, outer) / Math.min(inner, outer), `${inner.toFixed(2)} and ${outer.toFixed(2)} per square metre`).toBeLessThan(1.5);
  for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++)
   expect(Math.hypot(marks[i].x - marks[j].x, marks[i].y - marks[j].y) * unit).toBeGreaterThanOrEqual(2.6 * 5.85 - 1e-9);
 });
});

describe('the gap behind P leaves a face P hovers over whole', () => {
 it('none within the gap\'s outer radius of the plane, all of it from twice that', () => {
  expect(gapLift(0)).toBe(0);
  expect(gapLift(BEHIND_GAP.outer)).toBe(0);
  expect(gapLift(2 * BEHIND_GAP.outer)).toBe(1);
  for (let h = 0; h < 100; h += 2) expect(gapLift(h + 2)).toBeGreaterThanOrEqual(gapLift(h));
  // P half a metre over the disk, at R = 2 and R = 4: none. At its default height, every surface lesson: all of it.
  expect(gapLift(.5 * 42)).toBe(0);
  expect(gapLift(.5 * 26)).toBe(0);
  expect(gapLift(3 * 42)).toBe(1);
  expect(gapLift(3 * 30)).toBe(1);
 });
});

describe('a wire\'s sign stands beside the tube', () => {
 const a = 5.85, b = 2.25, unit = 42;
 it('its glyph and paper clear the tube whichever way the wire runs on the screen, on the side away', () => {
  for (const [yaw, pitch] of [[-.5, .6], [.3, 1.2], [1.4, .2], [-.42, .82]]) {
   const {right, up} = cameraBasis(yaw, pitch);
   for (let k = 0; k < 24; k++) {
    const th = k * Math.PI / 12, along = {x: Math.cos(th), y: Math.sin(th) * Math.cos(.4), z: Math.sin(th) * Math.sin(.4)};
    const at = {x: 1, y: .5, z: 0}, away = {x: 0, y: 0, z: 0};
    for (const plus of [true, false]) {
     const clear = 3 / unit, o = besideWire(at, along, away, right, up, a / unit, b / unit, plus, clear);
     const dot = (u: Vec, v: Vec) => u.x * v.x + u.y * v.y + u.z * v.z;
     const oR = dot(o, right) * unit, oU = dot(o, up) * unit, tR = dot(along, right), tU = dot(along, up), t = Math.hypot(tR, tU);
     // How far the glyph's nearest corner is from the wire's line on the screen, across it.
     if (t > 1e-3) {
      const nR = -tU / t, nU = tR / t, across = Math.abs(oR * nR + oU * nU);
      const reach = (p: number, q: number) => Math.abs(nR) * p + Math.abs(nU) * q, glyph = plus ? Math.max(reach(a, b), reach(b, a)) : reach(a, b);
      expect(across - glyph, `yaw ${yaw} pitch ${pitch} at ${k}`).toBeGreaterThanOrEqual(3 - 1e-6);
      // Square to the wire on the screen: nothing along it.
      expect(Math.abs(oR * tR + oU * tU) / t).toBeLessThan(1e-6);
     }
     // On the side away from the middle.
     expect(dot(o, {x: at.x - away.x, y: at.y - away.y, z: at.z - away.z}) * unit).toBeGreaterThanOrEqual(-1e-6);
    }
   }
  }
 });
 it('every mark knows which way its wire runs', () => {
  const marks = signMarks(sampleDistribution('ring', params(), 96), 20, .5);
  for (const m of marks) {
   expect(len(m.along)).toBeCloseTo(1, 9);
   // Round the ring: square to the radius.
   expect(Math.abs(m.along.x * m.x + m.along.y * m.y) / Math.hypot(m.x, m.y)).toBeLessThan(.05);
  }
 });
});

describe('a disk\'s mark the chosen washer stands in front of is let go', () => {
 const band = {inner: 1.2, outer: 1.6}, px = 1 / 42, half = washerHalf(.09, band.inner, band.outer, px), mark = 5.85 / 42;
 // Seen low (5 x ArrowRight and 4 x ArrowDown from the disk's opening view), as the critic found it.
 const {right, up, forward} = cameraBasis(-.5 + 5 * .08, .6 - 4 * .08);
 const toward = forward, lift = (v: Vec): Vec => ({x: v.x + toward.x * .13, y: v.y + toward.y * .13, z: v.z + toward.z * .13});
 const ahead = {x: -toward.x / Math.hypot(toward.x, toward.y), y: -toward.y / Math.hypot(toward.x, toward.y)};
 const at = (r: number): Vec => lift({x: ahead.x * r, y: ahead.y * r, z: 0});
 it('just beyond the far edge: covered; in the hole, in front, or well beyond: not', () => {
  expect(slabCovers(at(band.outer + .05), band, half, toward, right, up, mark)).toBe(true);
  expect(slabCovers(at(band.outer + .15), band, half, toward, right, up, mark)).toBe(true);
  expect(slabCovers(at(.5), band, half, toward, right, up, mark)).toBe(false);
  expect(slabCovers(at(-1.9), band, half, toward, right, up, mark)).toBe(false);
  expect(slabCovers(at(-.4), band, half, toward, right, up, mark)).toBe(false);
  expect(slabCovers(at(4), band, half, toward, right, up, mark)).toBe(false);
 });
 it('from the opening view the marks round the washer are drawn', () => {
  const b = cameraBasis(-.5, .6), f = b.forward;
  const ah = {x: -f.x / Math.hypot(f.x, f.y), y: -f.y / Math.hypot(f.x, f.y)}, lifted = (r: number): Vec => ({x: ah.x * r + f.x * .13, y: ah.y * r + f.y * .13, z: f.z * .13});
  for (const r of [.5, 1.85, -.5, -1.85]) expect(slabCovers(lifted(r), band, half, f, b.right, b.up, mark), `${r}`).toBe(false);
 });
});

