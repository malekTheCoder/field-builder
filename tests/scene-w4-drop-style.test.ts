import {describe, expect, it} from 'vitest';
import {dropStyle, runScene, type RunSceneInput} from '../src/diagrams/three/runScene';
import type {Vec} from '../src/symbolic/physics';
/* THE PART A MIRROR REMOVES IS DASHED, WHETHER OR NOT THE MIRROR IS DRAWN.
 *
 * Dashed is the figure's mark for a part that goes, solid for one that survives. On the bisector, the endless
 * line, the ring and the arc the sideways part of a piece's arrow is exactly the one its mirror piece cancels --
 * but the scene dashed it only while the partner was drawn, so One piece with the parts on (a teacher's link,
 * `components=1`) laid it solid: "survives", one stage before What cancels says it goes. */
const rod = (t: number): Vec => ({x: 0, y: 4 * (t - .5), z: 0});
const field = {x: 3, y: -1, z: 0}, keep = {x: 3, y: 0, z: 0}, drop = {x: 0, y: -1, z: 0};
const scene = (over: Partial<RunSceneInput>, arrows: Partial<NonNullable<RunSceneInput['arrows']>> = {}) => runScene({
 stage: 'one', kind: 'wire', closed: false, n: 5, selected: 3, at: rod, partner: null, weights: [1, 1, 1, 1, 1], summing: false, continuum: 0, split: 0, chain: null,
 arrows: {scale: 2, field, keep, drop, partner: null, partnerKeep: keep, partnerDrop: {x: 0, y: 1, z: 0}, components: true, cancelled: 0, ...arrows}, ...over});
describe('how the scene draws the sideways part', () => {
 it('on a lesson with a mirror, dashed even before the mirror is shown', () => {
  expect(dropStyle(scene({mirrored: true}).arrows)).toBe('dashed');
  // And while the partner is shown, as before.
  expect(dropStyle(scene({mirrored: true, stage: 'cancel', partner: 1}, {partner: {x: 3, y: 1, z: 0}, cancelled: .3}).arrows)).toBe('dashed');
 });
 it('with no mirror -- the rod seen from its end, the ramp, the semi-infinite line -- solid: it survives', () => {
  expect(dropStyle(scene({mirrored: false}).arrows)).toBe('solid');
  expect(dropStyle(scene({}).arrows)).toBe('solid');
 });
 it('a piece on P\'s own line is its own mirror: nothing pairs with it, so nothing is marked as cancelled', () => {
  // Cut an odd number of ways, the middle piece of the bisector is handed back itself as its partner.
  expect(dropStyle(scene({mirrored: true, n: 5, selected: 2, partner: 2}, {partner: field}).arrows)).toBe('solid');
 });
 it('no dropped part, no style', () => {
  expect(dropStyle(scene({mirrored: true}, {components: false}).arrows)).toBeNull();
 });
});
