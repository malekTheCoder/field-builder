import {describe, expect, it} from 'vitest';
import {LIMIT_CHAIN, cutPiece, dropStyle, polylineLength, resample, runScene, stretch, trim, type RunSceneInput} from '../src/diagrams/three/runScene';
import type {Vec} from '../src/symbolic/physics';
/* What the 3D scene draws of "Watch it build", worked out without a GPU. The browser test reads the
 * same plan back off the page; this pins the choices themselves -- which pieces are lit, which wait,
 * where the partner is, how wide the cuts are -- against the flat figure's own rules. */
const R = 2;
const ring = (t: number): Vec => ({x: R * Math.cos(2 * Math.PI * t), y: R * Math.sin(2 * Math.PI * t), z: 0});
const rod = (t: number): Vec => ({x: 0, y: 4 * (t - .5), z: 0});
const disk = (t: number): Vec => ({x: R * t, y: 0, z: 0});
const zero = {x: 0, y: 0, z: 0};
const base = (over: Partial<RunSceneInput>): RunSceneInput => ({
 stage: 'pieces', kind: 'wire', closed: false, n: 5, selected: 3, at: rod, partner: null,
 weights: [1, 1, 1, 1, 1], summing: false, continuum: 0, split: 0, arrows: null, chain: null, ...over,
});
const close = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
describe('the plan for each stage', () => {
 it('cuts the charge into the partition being summed, one stretch of wire per piece', () => {
  const s = runScene(base({}));
  expect(s.pieces).toHaveLength(5);
  s.pieces.forEach((piece, i) => {
   if (!('path' in piece)) throw new Error('a wire piece is a path');
   expect(close(piece.path[0], rod(i / 5))).toBeLessThan(1e-12);
   expect(close(piece.path[piece.path.length - 1], rod((i + 1) / 5))).toBeLessThan(1e-12);
  });
  // While the cuts are being made, nothing has stepped back: every piece but the chosen one waits.
  expect(s.tones).toEqual(['idle', 'idle', 'idle', 'lit', 'idle']);
  expect(s.open).toBe(1);
 });
 it('one piece: everything but the chosen piece steps back', () => {
  expect(runScene(base({stage: 'one'})).tones).toEqual(['dim', 'dim', 'dim', 'lit', 'dim']);
 });
 it('what cancels: the partner is lit as a whole piece, the mirror image along the rod', () => {
  const s = runScene(base({stage: 'cancel', partner: 1}));
  expect(s.tones).toEqual(['dim', 'lit', 'dim', 'lit', 'dim']);
  expect(s.partner?.index).toBe(1);
  expect(s.partner?.across).toBe(false);
 });
 it('a ring cut an odd number of ways: the partner is the arc straight across, not a piece', () => {
  const s = runScene(base({stage: 'cancel', kind: 'wire', closed: true, at: ring, partner: 'across'}));
  // Only the chosen piece is lit as a piece: no piece lies straight across from it.
  expect(s.tones.filter(t => t === 'lit')).toHaveLength(1);
  const chosen = s.pieces[3] as {path: Vec[]}, mirror = s.partner!.path;
  const mid = (p: Vec[]) => p[(p.length - 1) / 2];
  // The arc's middle is exactly opposite the chosen piece's middle, and it is as long.
  expect(close(mid(mirror), {x: -mid(chosen.path).x, y: -mid(chosen.path).y, z: 0})).toBeLessThan(1e-12);
  expect(polylineLength(mirror)).toBeCloseTo(polylineLength(chosen.path), 12);
  expect(s.partner!.index).toBeNull();
 });
 it('add them up: what is in the sum is coloured, what is still to come waits faintly', () => {
  const s = runScene(base({stage: 'add', summing: true, selected: 2, weights: [1, 1, .4, 0, 0]}));
  expect(s.tones).toEqual(['added', 'added', 'lit', 'dim', 'dim']);
 });
 it('the limit: the cuts close as the partition goes to the continuum, and nothing is held back', () => {
  const half = runScene(base({stage: 'limit', summing: true, continuum: .5, split: .3}));
  expect(half.open).toBe(.5);
  expect(half.split).toBe(.3);
  expect(half.tones.filter(t => t === 'dim')).toHaveLength(0);
  const done = runScene(base({stage: 'limit', summing: true, continuum: 1, split: 1}));
  expect(done.open).toBe(0);
  // A doubling that is not going to happen draws no mid-cuts.
  expect(done.split).toBe(0);
 });
});
describe('a surface', () => {
 it('is cut along circles at the edges of its rings, in order out from the centre', () => {
  const s = runScene(base({kind: 'disk', at: disk}));
  expect(s.pieces[0]).toEqual({annulus: {inner: 0, outer: R / 5}});
  expect(s.seams.map(c => c.radius)).toEqual([1, 2, 3, 4].map(k => R * k / 5));
  expect(s.seams.map(c => c.at)).toEqual([1, 2, 3, 4].map(k => k / 5));
  expect(s.partner).toBeNull();
 });
 it('shades only what has been summed, out to where the sum has reached', () => {
  expect(runScene(base({kind: 'disk', at: disk, stage: 'one'})).filled).toBeNull();
  const s = runScene(base({kind: 'disk', at: disk, stage: 'add', summing: true, weights: [1, 1, .5, 0, 0]}));
  expect(s.filled).toBeCloseTo(R * 2.5 / 5, 12);
 });
});
describe('the arrows at P, at the figure\'s own scale', () => {
 const field = {x: 3, y: -1, z: 0}, keep = {x: 3, y: 0, z: 0}, drop = {x: 0, y: -1, z: 0};
 const arrows = (over: Partial<NonNullable<RunSceneInput['arrows']>>) => runScene(base({stage: 'cancel', arrows: {
  scale: 2, field, keep, drop, partner: null, partnerKeep: keep, partnerDrop: {x: 0, y: 1, z: 0}, components: true, cancelled: 0, ...over}})).arrows!;
 it('without a partner, the other part is drawn in full out of P, where the flat figure draws it', () => {
  // Laid from the tip of the kept part it ended under the arrowhead of the piece's own arrow.
  const a = arrows({});
  expect(a.keep).toEqual({x: 6, y: 0, z: 0});
  expect(a.dropFrom).toEqual(zero);
  expect(a.drop).toEqual({x: 0, y: -2, z: 0});
  expect(a.partner).toBeNull();
 });
 it('with a partner, the two parts that go start together at P and shrink together as they cancel', () => {
  const a = arrows({partner: {x: 3, y: 1, z: 0}, cancelled: .75});
  expect(a.dropFrom).toEqual(zero);
  expect(a.partnerKeep).toEqual(zero);
  expect(a.partner).toEqual({x: 6, y: 2, z: 0});
  expect(a.drop!.y).toBeCloseTo(-.5, 12);
  expect(a.partnerDrop!.y).toBeCloseTo(.5, 12);
  expect(a.cancelled).toBe(.75);
 });
 it('the parts are only drawn when the stage asks for them -- but a cancelling pair always is', () => {
  const plain = arrows({components: false});
  expect(plain.keep).toBeNull();
  expect(plain.drop).toBeNull();
  const pair = arrows({components: false, partner: {x: 3, y: 1, z: 0}});
  expect(pair.keep).toBeNull();
  expect(pair.drop).not.toBeNull();
 });
 it('a part nothing cancels is drawn solid, as the survivor it is; a part a partner cancels is dashed', () => {
  // The rod seen from beyond its end, the ramp, the semi-infinite line: no mirror piece, so the
  // sideways part survives. It used to be drawn dashed in space, the mark for a part that goes.
  expect(dropStyle(arrows({}))).toBe('solid');
  expect(dropStyle(arrows({partner: {x: 3, y: 1, z: 0}, cancelled: .3}))).toBe('dashed');
  // No dropped part, no style.
  expect(dropStyle(arrows({components: false}))).toBeNull();
  expect(dropStyle(null)).toBeNull();
 });
 it('the chain is every piece\'s arrow tip to tail, skipping the pieces not yet in', () => {
  const fields = [{x: 1, y: 0, z: 0}, {x: 0, y: 1, z: 0}, {x: 0, y: 0, z: 1}];
  const s = runScene(base({stage: 'add', chain: {scale: 2, fields, weights: [1, 0, .5]}}));
  expect(s.chain).toEqual([zero, {x: 2, y: 0, z: 0}, {x: 2, y: 0, z: 1}]);
  expect(runScene(base({stage: 'add', chain: {scale: 2, fields, weights: [0, 0, 0]}})).chain).toBeNull();
 });
});
describe('the chain while the pieces shrink', () => {
 const fields = Array.from({length: 160}, (_, i) => ({x: Math.cos(i / 50), y: Math.sin(i / 50), z: 0}));
 const weights = fields.map(() => 1);
 it('is carried through the limit, and arrives as a curve of a fixed number of points with its ends in place', () => {
  const add = runScene(base({stage: 'add', chain: {scale: 1, fields, weights}}));
  const limit = runScene(base({stage: 'limit', chain: {scale: 1, fields, weights}}));
  expect(add.chain).toHaveLength(161);
  expect(limit.chain).toHaveLength(LIMIT_CHAIN);
  // More points than the scene marks joins on, so it is drawn as a curve and never as beads.
  expect(LIMIT_CHAIN).toBeGreaterThan(65);
  expect(close(limit.chain![0], add.chain![0])).toBeLessThan(1e-12);
  expect(close(limit.chain![LIMIT_CHAIN - 1], add.chain![160])).toBeLessThan(1e-9);
 });
 it('a short chain is filled in along its own links, which changes nothing about where it goes', () => {
  const short = runScene(base({stage: 'limit', chain: {scale: 2, fields: fields.slice(0, 5), weights: [1, 1, 1, 1, 1]}}));
  expect(short.chain).toHaveLength(LIMIT_CHAIN);
  const add = runScene(base({stage: 'add', chain: {scale: 2, fields: fields.slice(0, 5), weights: [1, 1, 1, 1, 1]}}));
  expect(polylineLength(short.chain!)).toBeCloseTo(polylineLength(add.chain!), 9);
 });
 it('resamples evenly along the length', () => {
  const line: Vec[] = [zero, {x: 1, y: 0, z: 0}, {x: 1, y: 3, z: 0}];
  const out = resample(line, 5);
  expect(out).toHaveLength(5);
  expect(out[1].x).toBeCloseTo(1, 12);
  expect(out[1].y).toBeCloseTo(0, 12);
  expect(out[2].y).toBeCloseTo(1, 12);
  expect(out[4]).toEqual(line[2]);
 });
});
describe('cutting a wire', () => {
 const straight: Vec[] = stretch(rod, 0, .2, 5);
 it('a piece is sampled with its parameter midpoint as a point of its own', () => {
  expect(straight.length % 2).toBe(1);
  expect(close(straight[(straight.length - 1) / 2], rod(.1))).toBeLessThan(1e-12);
 });
 it('trims exactly the length asked for from each end', () => {
  const t = trim(straight, .1, .05);
  expect(polylineLength(t)).toBeCloseTo(.8 - .15, 12);
  expect(t[0].y).toBeCloseTo(-2 + .1, 12);
  expect(t[t.length - 1].y).toBeCloseTo(-1.2 - .05, 12);
 });
 it('an open wire keeps its outer ends, so the rod keeps its length', () => {
  const [only] = cutPiece(straight, 0, .2);
  expect(only[0]).toEqual(straight[0]);
  expect(only[only.length - 1].y).toBeCloseTo(-1.2 - .1, 12);
 });
 it('no piece gives up more than a fifth of its length at a cut, however wide the cut', () => {
  const [only] = cutPiece(straight, 10, 10);
  expect(polylineLength(only)).toBeCloseTo(.8 * .6, 12);
 });
 it('a piece the next doubling is about to split is drawn as two halves with a gap between', () => {
  const halves = cutPiece(straight, .1, .1, .06);
  expect(halves).toHaveLength(2);
  expect(halves[1][0].y - halves[0][halves[0].length - 1].y).toBeCloseTo(.06, 12);
 });
});
