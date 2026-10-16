import {describe, expect, it} from 'vitest';
import type {Vec} from '../src/symbolic/physics';
import {gapShrink, keepAside, sheetInk, surfaceOpacity, washWall} from '../src/diagrams/three/bodies';
import {keptSpans, runScene, type RunSceneInput} from '../src/diagrams/three/runScene';
/* THE SCENE LANE, WAVE 5: what the critics found, pinned where it can be without a GPU.
 *
 * A mirror pair arrives drawn larger than the sum's scale and eases to its true size as the sum takes it in, but its
 * parts along the axis were consumed by the fraction taken of their DRAWN length, so what was left hung up to
 * nineteen units past the sum's arrowhead. A pair that takes away from the sum was laid inside the sum's own shaft.
 * The sheet ring's walls outlasted its face as two dark crescents; the dark sheet was grey; the gap round P whitened
 * the disk seen from above. Each of these fails on the code before this change. */
const R = 2;
const ring = (t: number): Vec => ({x: R * Math.cos(2 * Math.PI * t), y: R * Math.sin(2 * Math.PI * t), z: 0});
const base = (over: Partial<RunSceneInput>): RunSceneInput => ({
 stage: 'add', kind: 'wire', closed: true, n: 5, selected: 0, at: ring, partner: null,
 weights: [0, 0, 0, 0, 0], summing: true, continuum: 0, split: 0, arrows: null, chain: null, ...over,
});
/** The ring's pair going into the sum as ChargeDiagram hands it over, drawn `gain` times its true size (`pairM`). */
const pair = (merge: number, gain: number, from: Vec) => ({
 scale: gain, field: {x: .3, y: .1, z: .5}, keep: {x: 0, y: 0, z: .5}, drop: {x: .3, y: .1, z: 0}, partner: {x: -.3, y: -.1, z: .5},
 partnerKeep: {x: 0, y: 0, z: .5}, partnerDrop: {x: -.3, y: -.1, z: 0}, components: true, cancelled: 1, from, fade: 1 - merge});

describe('a mirror pair drawn larger is taken in exactly as far as the sum\'s arrow reaches', () => {
 it('what is left starts at the sum\'s head at every enlargement, and is gone once the merge is over', () => {
  const from = {x: 0, y: 0, z: 1};
  for (const top of [1, 3, 9]) for (let k = 1; k < 40; k++) {
   const merge = k / 40, gain = top + (1 - top) * merge;
   // The sum's arrow at its true scale: the sum so far and `merge` of the pair's true parts along z (2 x .5).
   const net = {x: 0, y: 0, z: from.z + merge * 1};
   const spans = keptSpans(runScene(base({arrows: pair(merge, gain, from)})).arrows, net);
   const first = spans.piece ?? spans.partner;
   expect(first, `gain ${top}, merge ${merge}`).not.toBeNull();
   expect(first!.from.z, `gain ${top}, merge ${merge}: the parts start at the sum's head`).toBeCloseTo(net.z, 9);
  }
  const done = keptSpans(runScene(base({arrows: pair(1, 1, from)})).arrows, {x: 0, y: 0, z: 2});
  expect(done.piece).toBeNull();
  expect(done.partner).toBeNull();
 });
 it('given no net arrow, the fraction taken still stands in for it', () => {
  const s = keptSpans(runScene(base({arrows: pair(.5, 1, {x: 0, y: 0, z: 1})})).arrows);
  expect(s.piece?.from.z ?? s.partner!.from.z).toBeCloseTo(1.5, 9);
 });
});

describe('a pair that takes away from the sum is laid beside it', () => {
 it('between six and ten units of the figure aside, three tenths of its length between', () => {
  expect(keepAside(4)).toBe(6);
  expect(keepAside(25)).toBeCloseTo(7.5, 9);
  expect(keepAside(200)).toBe(10);
 });
});

describe('the sheet', () => {
 const far = {inner: 2, outer: 6, low: 0};
 it('a wash ring\'s wall is never stronger than its face, and is gone where the shading round it is', () => {
  for (const face of [.14, .3, .49]) for (const [x, y] of [[0, 0], [3, 0], [-5, 1], [4, 4], [0, -3]]) {
   expect(washWall(face, x, y, 5, far)).toBeLessThanOrEqual(face + 1e-12);
  }
  expect(washWall(.3, 5.5, 0, 5, far), 'beyond the shading at the side').toBe(0);
  expect(washWall(.3, 0, 0, 5, far), 'at the middle, the face\'s own strength').toBeCloseTo(.3, 9);
 });
 it('in the dark it is drawn unlit in the charge colour, a little stronger; in the light as it was', () => {
  expect(sheetInk(true).unlit).toBe(true);
  expect(sheetInk(true).opacity).toBeGreaterThanOrEqual(.3);
  expect(sheetInk(false)).toEqual({opacity: surfaceOpacity('sheet'), unlit: false});
 });
});

describe('the gap round P on a disk seen from above', () => {
 it('is whole from the side, about P\'s halo from straight above, and a wire keeps its own', () => {
  expect(gapShrink(.35, 'disk')).toBe(1);
  expect(gapShrink(.85, 'disk')).toBe(1);
  expect(gapShrink(.85, 'sheet'), 'the sheet keeps its notch from the side').toBe(1);
  expect(gapShrink(1.08, 'disk')).toBeLessThan(.8);
  expect(gapShrink(Math.PI / 2, 'disk')).toBeCloseTo(.4, 9);
  expect(gapShrink(Math.PI / 2, 'wire')).toBe(1);
 });
});
