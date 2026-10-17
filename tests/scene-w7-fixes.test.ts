import {describe, expect, it} from 'vitest';
import type {ChargeSample} from '../src/distributions/types';
import {spaceGrid} from '../src/diagrams/field3d';
import {ABOVE_GAP, BEHIND_GAP, PIECE_FAR_LOW, gapKeep, gapLow} from '../src/diagrams/three/bodies';
import {runScene, type RunSceneInput} from '../src/diagrams/three/runScene';
import {vectorGrid} from '../src/diagrams/vectorfield';
import type {Vec} from '../src/symbolic/physics';
/* Wave 7's scene fixes, pinned without a GPU: the shell's staircase in the 3D sum, and no lattice arrow at a null. */
const R = 2;
// The shell's rings, top to bottom, as the sampler cuts it: at angle θ from the top, a ring at height R cos θ.
const shellAt = (t: number): Vec => ({x: R * Math.sin(Math.PI * t), y: 0, z: R * Math.cos(Math.PI * t)});
/** A ring of charge's field on its axis at height h above its plane: k Q h / (r² + h²)^(3/2), along z. */
const ringField = (r: number, h: number, q: number): Vec => ({x: 0, y: 0, z: q * h / Math.pow(r * r + h * h, 1.5)});
const shellFields = (n: number, z: number): Vec[] => Array.from({length: n}, (_, i) => {
 const th = Math.PI * (i + .5) / n, q = Math.sin(th) * Math.PI / n;
 return ringField(R * Math.sin(th), z - R * Math.cos(th), q);
});
const step: Vec = {x: .1, y: 0, z: 0};
const shell = (over: Partial<RunSceneInput>): RunSceneInput => ({
 stage: 'add', kind: 'shell', closed: false, n: 5, selected: 0, at: shellAt, partner: null,
 weights: [1, 1, 1, 1, 1], summing: true, continuum: 0, split: 0, arrows: null, chain: null, ...over,
});
describe('the shell staircase in the 3D sum', () => {
 it('is laid beside the sum inside the shell, where the rings push both ways along the axis', () => {
  const fields = shellFields(5, 1);
  // Inside: the top rings push down, the bottom ones up, so the fields are not all one way.
  expect(fields.some(f => f.z > 0) && fields.some(f => f.z < 0)).toBe(true);
  const s = runScene(shell({chain: {scale: 1, fields, weights: [1, 1, 1, 1, 1], step}}));
  expect(s.chainBeside).toBe(true);
 });
 it('marks its jogs, one between each pair of ring links, each square to the axis, and ends on a link', () => {
  const fields = shellFields(5, 3);
  const s = runScene(shell({chain: {scale: 1, fields, weights: [1, 1, 1, 1, 1], step}}));
  const chain = s.chain!, jogs = s.jogs!;
  expect(jogs).toHaveLength(chain.length - 1);
  expect(jogs.filter(Boolean)).toHaveLength(4);
  expect(jogs[jogs.length - 1]).toBe(false);
  jogs.forEach((jog, k) => {
   const d = {x: chain[k + 1].x - chain[k].x, z: chain[k + 1].z - chain[k].z};
   // A jog runs across (no z); a ring's link runs along the axis (no x).
   if (jog) expect(Math.abs(d.z)).toBeLessThan(1e-12); else expect(Math.abs(d.x)).toBeLessThan(1e-12);
  });
 });
 it('halfway through the sum still ends on the newest ring link, not on a jog to a ring still to come', () => {
  const fields = shellFields(5, 3);
  const s = runScene(shell({chain: {scale: 1, fields, weights: [1, 1, 0, 0, 0], step}}));
  expect(s.jogs).toEqual([false, true, false]);
 });
 it('is not drawn in Shrink them, where its fixed steps would end the sum beside E', () => {
  const fields = shellFields(5, 3);
  const s = runScene(shell({stage: 'limit', continuum: .5, chain: {scale: 1, fields, weights: [1, 1, 1, 1, 1], step}}));
  expect(s.chain).toBeNull();
  expect(s.jogs).toBeNull();
  // A chain with no staircase still comes through the limit, ending on the sum.
  const plain = runScene(shell({stage: 'limit', kind: 'disk', continuum: .5, chain: {scale: 1, fields, weights: [1, 1, 1, 1, 1]}}));
  const end = plain.chain![plain.chain!.length - 1], sum = fields.reduce((a, f) => a + f.z, 0);
  expect(Math.abs(end.z - sum)).toBeLessThan(1e-9);
 });
});
describe('no lattice arrow at a null', () => {
 // A full ring cut into sixty-four pieces: its field at the centre is zero by symmetry, and the sum leaves round-off.
 const ring: ChargeSample[] = Array.from({length: 64}, (_, i) => {
  const t = 2 * Math.PI * (i + .5) / 64;
  return {position: {x: Math.cos(t), y: Math.sin(t), z: 0}, dq: 1e-9 / 64, field: {x: 0, y: 0, z: 0}, potential: 0, coordinate: 0};
 });
 it('the flat lattice draws none at the centre of a full ring, and keeps the rest', () => {
  const arrows = vectorGrid(ring, {x0: -.5, y0: -.5, x1: .5, y1: .5}, .5);
  expect(arrows.some(a => Math.hypot(a.at.x, a.at.y) < 1e-9)).toBe(false);
  expect(arrows.length).toBe(8);
 });
 it('nor does the lattice in space', () => {
  const arrows = spaceGrid(ring, .5, .5, .14, 'xz', 'wire', {x0: -.5, y0: -.5, x1: .5, y1: .5});
  expect(arrows.some(a => Math.hypot(a.at.x, a.at.y, a.at.z) < 1e-9)).toBe(false);
  expect(arrows.length).toBe(8);
 });
});
describe('the gap round P, seen from above', () => {
 it('keeps the side view\'s notch, and from above lets the charge under P back', () => {
  // From the side, as before: the far rim's notch is nearly paper, the chosen piece dimmed.
  expect(gapLow(.6, 'disk')).toBeCloseTo(BEHIND_GAP.low, 12);
  expect(gapKeep(.6, 'disk')).toBeCloseTo(PIECE_FAR_LOW, 12);
  // From above (the opening view turned up six times), the face and the chosen washer under P plainly stay.
  for (const kind of ['disk', 'sheet'] as const) {
   expect(gapLow(1.08, kind)).toBeGreaterThan(.25);
   expect(gapKeep(1.08, kind)).toBeGreaterThan(.6);
   expect(gapLow(1.3, kind)).toBeCloseTo(ABOVE_GAP.low, 12);
   expect(gapKeep(1.3, kind)).toBeCloseTo(ABOVE_GAP.keep, 12);
  }
  // A wire is a far line passing behind P from every side: its gap is untouched.
  expect(gapLow(1.3, 'wire')).toBe(BEHIND_GAP.low);
 });
});
