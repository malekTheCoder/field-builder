import {describe, expect, it} from 'vitest';
import type {ChargeSample} from '../src/distributions/types';
import type {Vec} from '../src/symbolic/physics';
import {openingCamera, projectCamera, SURFACE_UNIT} from '../src/diagrams/camera';
import {fieldLines, seedPool} from '../src/diagrams/fieldlines';
import {latticeCore, latticeFrame, spaceLines, traceTo} from '../src/diagrams/field3d';
import {fillFade, lineStrength, pieceFade, sheetColumns, sheetFarFade, SHEET_COLUMNS, SHEET_FAR_LOW, signMarks, splitAtPlane, tickGaps, wireRadius} from '../src/diagrams/three/bodies';
import {fieldsCollinear, runScene, type RunSceneInput} from '../src/diagrams/three/runScene';
import {sideSheet} from '../src/diagrams/FieldCanvas';
import {coarsen, sampleDistribution} from '../src/diagrams/sampling';
import {bodyDistance, bodyFoot, vectorGrid} from '../src/diagrams/vectorfield';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';
/* THE SCENE LANE, WAVE 1, ITERATION 2: what the critics found, pinned where it can be without a GPU.
 *
 * Endless lines seeded only beside O; 3D lines ending on a sphere about O in mid-air; the arrows'
 * cube centred on O, which is the axial rod's end; the sheet's lines clumped on the screen; the axis
 * ticks under P's arrowheads; the walking washer's far wall and the fill's straight horizon over P; the
 * mirror piece's surviving part never drawn; the chain jumping beside the net and back; the charge's sign
 * nowhere in the scene; the flat sheet traced with S-bends; flat arrows beside far, coarse pieces. Every
 * one of these fails on the code before this change. */
const params = (over: Partial<Params> = {}): Params => ({...DEFAULT_PARAMS, ...over});
const UNBOUNDED = new Set<ProblemId>(['infinite', 'semi', 'sheet']);
/** ChargeDiagram's field partition: fine enough to be the charge. */
const fieldSamples = (id: ProblemId, p: Params) => sampleDistribution(id, p, Math.max(p.slices, UNBOUNDED.has(id) ? 400 : 96));
const LEN = (v: Vec) => Math.hypot(v.x, v.y, v.z);

describe('an endless line is seeded all along the part of it the picture shows', () => {
 /** The flat semi-infinite line: P at height d above O, the line running out along +x. The window it is
  * traced for, by default and after three zoom-outs (each about 1.25 times wider), about the same middle. */
 const p = params(), reach = Math.max(2.5, p.distance * 1.7, p.size);
 const windows = [1, 1.25 ** 3].map(k => ({x0: 2.25 - 8.5 * k, x1: 2.25 + 8.5 * k, y0: 1.5 - 4.6 * k, y1: 1.5 + 4.6 * k}));
 it('every sixth of the visible line has a line leaving it, by default and zoomed out', () => {
  const coarse = coarsen(fieldSamples('semi', p), 192), span = Math.max(...coarse.map(s => LEN(s.position)), 1);
  for (const w of windows) {
   const shown = Math.max(Math.abs(w.x0), Math.abs(w.x1), Math.abs(w.y0), Math.abs(w.y1));
   const pool = seedPool(coarse, 15, reach * .95, shown);
   const lines = fieldLines(coarse, pool.count, {step: Math.min(reach, span) * .05, maxSteps: 900, outerLimit: shown * 1.6, seedLimit: reach * .95, seedPool: pool.pool, bounds: w, root: bodyFoot(coarse, 'wire')});
   // Where each line meets the line of charge (y = 0, x >= 0).
   const roots = lines.flatMap(l => [l[0], l[l.length - 1]]).filter(q => Math.abs(q.y) < .02 && q.x > -.05).map(q => q.x);
   const visible = Math.min(w.x1, shown), spacing = visible / (pool.count / 2);
   for (let k = 0; k < 6; k++) {
    const a = visible * k / 6, b = visible * (k + 1) / 6;
    expect(roots.some(x => x >= a - spacing && x <= b + spacing), `window ×${(w.x1 - 2.25) / 8.5}: sixth ${k} (${a.toFixed(1)} to ${b.toFixed(1)} m)`).toBe(true);
   }
  }
 });
 it('a bounded charge is seeded exactly as before, at any zoom', () => {
  const coarse = coarsen(fieldSamples('bisector', p), 64);
  for (const shown of [3, 8, 30]) expect(seedPool(coarse, 15, 4.85, shown)).toEqual({count: 15, pool: 4.85});
 });
});

describe('a 3D field line ends where the drawing has faded it, not on a sphere about O', () => {
 /** What FieldStage traces: the field partition coarsened to the scene's budget, at ChargeDiagram's reach. */
 const scene = (id: ProblemId, over: Partial<Params> = {}) => {
  const p = params(over), reach = Math.round(Math.min(9, Math.max(3.5, p.size * 1.5)) * 2) / 2;
  const few = coarsen(fieldSamples(id, p), 48), span = Math.max(...few.map(c => LEN(c.position)), .5);
  const lines = spaceLines(few, 'wire', 16, traceTo(few, 'wire', reach, span, {seedLimit: reach * .95, root: {inset: wireRadius(reach)}}));
  return {lines, reach, away: bodyDistance(few, 'wire'), crowd: reach * .95 * .012};
 };
 it('every end off the body is faded to nothing, or has run into another line', {timeout: 20000}, () => {
  for (const [id, over] of [['axial', {}], ['endpoint', {}], ['ramp', {}], ['ring', {size: 4}], ['axial', {size: 8}]] as const) {
   const {lines, reach, away, crowd} = scene(id, over);
   const near = (q: Vec, self: number) => lines.some((l, i) => i !== self && l.some(v => Math.hypot(v.x - q.x, v.y - q.y, v.z - q.z) < crowd * 1.5));
   const stray = lines.flatMap((l, i) => [l[0], l[l.length - 1]].map(q => ({q, i})))
    .filter(({q}) => away(q.x, q.y, q.z) > reach * .1 && lineStrength(away(q.x, q.y, q.z), reach) >= .05)
    .filter(({q, i}) => !near(q, i));
   expect(stray.map(({q}) => `(${q.x.toFixed(1)}, ${q.y.toFixed(1)}, ${q.z.toFixed(1)}) at ${lineStrength(away(q.x, q.y, q.z), reach).toFixed(2)}`), id).toEqual([]);
  }
 });
 it('the trace stops exactly where the strength of a line reaches zero', () => {
  expect(lineStrength(1.35 * 6, 6)).toBe(0);
  expect(lineStrength(1.3 * 6, 6)).toBeGreaterThan(0);
 });
});

describe('the 3D arrows stand about the charge and P, not about O', () => {
 it('on the rod seen along its axis, arrows lie between the rod\'s end and P, and none behind O', () => {
  for (const over of [{}, {size: 8, distance: 6}] as Partial<Params>[]) {
   const p = params(over), reach = Math.round(Math.min(9, Math.max(3.5, p.size * 1.5)) * 2) / 2;
   const source = fieldSamples('axial', p), few = coarsen(source, 48);
   // P sits on the axis beyond the rod's far end at x = L.
   const L = Math.max(...source.map(s => s.position.x)), P = {x: L + p.distance, y: 0, z: 0};
   const {centre, spacing} = latticeFrame([...source.map(s => s.position), P], reach);
   const arrows = latticeCore(few, reach, 'wire', centre, spacing);
   expect(arrows.length).toBeGreaterThan(40);
   expect(arrows.filter(a => a.at.x > L && a.at.x < P.x).length, JSON.stringify(over)).toBeGreaterThan(0);
   expect(arrows.filter(a => a.at.x < -.5 * spacing), JSON.stringify(over)).toEqual([]);
  }
 });
 it('a charge centred on O with P on its axis keeps arrows half a step off the plane and the axis', () => {
  const {centre, spacing} = latticeFrame([{x: -2, y: -2, z: 0}, {x: 2, y: 2, z: 0}, {x: 0, y: 0, z: 3}], 6);
  const arrows = latticeCore(sampleDistribution('ring', params(), 96), 6, 'wire', centre, spacing);
  for (const a of arrows) {
   expect(Math.abs(a.at.z / spacing - Math.round(a.at.z / spacing))).toBeCloseTo(.5, 9);
   expect(Math.abs(a.at.x / spacing - Math.round(a.at.x / spacing))).toBeCloseTo(.5, 9);
  }
  expect(latticeFrame([], 6, true)).toEqual({centre: {x: 0, y: 0, z: 0}, spacing: 2});
 });
});

describe('the sheet\'s lines are even on the screen', () => {
 const unit = SURFACE_UNIT, opening = openingCamera('sheet');
 it('at the opening view and turned either way, the columns are evenly spaced and clear of P', () => {
  for (const yaw of [opening.yaw, opening.yaw + .6, opening.yaw - .6, 1.2]) {
   const roots = sheetColumns(yaw, unit, -318, 308, -6, 2);
   const xs = roots.map(r => unit * projectCamera({x: r.x, y: r.y, z: 0}, yaw, opening.pitch).x).sort((a, b) => a - b);
   const gaps = xs.slice(1).map((x, i) => x - xs[i]);
   expect(Math.max(...gaps) / Math.min(...gaps), `yaw ${yaw}`).toBeLessThanOrEqual(1.6);
   // P stands over O, so its screen x is O's.
   expect(xs.filter(x => Math.abs(x) < SHEET_COLUMNS.corridor), `yaw ${yaw}`).toEqual([]);
   // Across the whole window, edge to edge.
   expect(xs[0]).toBeLessThan(-318 + SHEET_COLUMNS.gap);
   expect(xs[xs.length - 1]).toBeGreaterThan(308 - SHEET_COLUMNS.gap);
   // And every root on the solid near part of the plane.
   for (const r of roots) {
    const depth = -r.x * Math.sin(yaw) + r.y * Math.cos(yaw);
    expect(depth).toBeGreaterThanOrEqual(-6 - 1e-9);
    expect(depth).toBeLessThanOrEqual(2 + 1e-9);
   }
  }
 });
});

describe('a line in front of a surface is cut from the part behind it', () => {
 it('splits each segment where it crosses the plane, and says which side each part is on', () => {
  const parts = splitAtPlane([{x: 0, y: 0, z: -1}, {x: 2, y: 0, z: 1}, {x: 3, y: 0, z: 2}]);
  expect(parts).toHaveLength(3);
  expect(parts[0]).toEqual({a: {x: 0, y: 0, z: -1}, b: {x: 1, y: 0, z: 0}, behind: true});
  expect(parts[1]).toEqual({a: {x: 1, y: 0, z: 0}, b: {x: 2, y: 0, z: 1}, behind: false});
  expect(parts[2].behind).toBe(false);
  // A line lying in the plane is in front of nothing it could be hidden by.
  expect(splitAtPlane([{x: 0, y: 0, z: 0}, {x: 1, y: 0, z: 0}])[0].behind).toBe(false);
 });
});

describe('the axis ticks give way to P and the arrows lying along the axis', () => {
 it('clears round P and over an arrow along the axis, padded at the head', () => {
  const P = {x: 0, y: 0, z: 3}, net = {x: 0, y: 0, z: 2}, aside = {x: 1, y: 0, z: 1};
  expect(tickGaps(2, P, [net, aside], 1, .2, .5)).toEqual([[2, 4], [2.8, 5.5]]);
  // No ticks are cleared on an axis P does not lie on.
  expect(tickGaps(0, P, [net], 1, .2)).toEqual([]);
  // P on the x axis beside a rod's bisector, its arrow along x and one leaning off it.
  expect(tickGaps(0, {x: 3, y: 0, z: 0}, [{x: -1.5, y: 0, z: 0}, {x: 1, y: 1, z: 0}], .5, .1, .3)).toEqual([[2.5, 3.5], [1.2, 3.1]]);
 });
});

describe('the sheet in Add them up does not draw a ring, or a horizon, level with P', () => {
 const z = DEFAULT_PARAMS.distance, view = openingCamera('sheet'), fade = sheetFarFade(z, view.pitch, SURFACE_UNIT);
 /** The depth along the camera's far direction at which the plane is drawn level with P. */
 const level = Math.cos(view.pitch) * z / Math.sin(view.pitch);
 it('the walking ring\'s outline is gone by the depth at which it would rise to P', () => {
  expect(pieceFade(fade, 'outline').low).toBeLessThanOrEqual(SHEET_FAR_LOW);
  const outline = pieceFade(fade, 'outline'), wall = (d: number) => outline.low! + (1 - outline.low!) * (d <= outline.inner ? 1 : d >= outline.outer ? 0 : .5);
  expect(wall(level)).toBeLessThanOrEqual(SHEET_FAR_LOW);
  // Its face keeps the trace the piece's face always kept.
  expect(pieceFade(fade, 'face').low).toBeGreaterThan(SHEET_FAR_LOW);
 });
 it('the summed shading is an ellipse about O: nothing of it level with P, solid round O', () => {
  expect(fillFade(0, level, 8, fade)).toBe(0);
  expect(fillFade(0, fade.outer, 8, fade)).toBe(0);
  expect(fillFade(0, 0, 8, fade)).toBe(1);
  expect(fillFade(0, -3, 8, fade)).toBe(1);
  // Its edge curves: at the same depth, further to the side is fainter -- not a straight horizon.
  const d = fade.outer * .7;
  expect(fillFade(4, d, 8, fade)).toBeLessThan(fillFade(0, d, 8, fade));
 });
});

describe('the run in space: the mirror\'s surviving part, and where the chain is drawn', () => {
 const ring = (t: number): Vec => ({x: 2 * Math.cos(2 * Math.PI * t), y: 2 * Math.sin(2 * Math.PI * t), z: 0});
 const base = (over: Partial<RunSceneInput>): RunSceneInput => ({stage: 'cancel', kind: 'wire', closed: true, n: 5, selected: 0, at: ring, partner: 'across', weights: [1, 1, 1, 1, 1], summing: false, continuum: 0, split: 0, arrows: null, chain: null, ...over});
 it('lays the mirror\'s part along the axis on the piece\'s own, at the figure\'s scale', () => {
  const field = {x: -1, y: 0, z: 2}, partner = {x: 1, y: 0, z: 2};
  const s = runScene(base({arrows: {scale: 3, field, keep: {x: 0, y: 0, z: 2}, drop: {x: -1, y: 0, z: 0}, partner, partnerKeep: {x: 0, y: 0, z: 2}, partnerDrop: {x: 1, y: 0, z: 0}, components: true, cancelled: .8}}));
  expect(s.arrows!.partnerSurvivor).toEqual({x: 0, y: 0, z: 6});
  expect(s.arrows!.partnerFrom).toEqual({x: 0, y: 0, z: 0});
  // Not resolved into parts: nothing to lay on.
  expect(runScene(base({arrows: {scale: 3, field, keep: {x: 0, y: 0, z: 2}, drop: {x: -1, y: 0, z: 0}, partner, partnerKeep: {x: 0, y: 0, z: 2}, partnerDrop: {x: 1, y: 0, z: 0}, components: false, cancelled: .8}})).arrows!.partnerSurvivor).toBeNull();
 });
 it('decides once per stage, from every piece, whether the chain goes beside the net arrow', () => {
  const ringFields = Array.from({length: 5}, (_, i) => ({x: -Math.cos(2 * Math.PI * (i + .5) / 5), y: -Math.sin(2 * Math.PI * (i + .5) / 5), z: 1.5}));
  const diskFields = Array.from({length: 5}, (_, i) => ({x: 0, y: 0, z: 1 / (i + 1)}));
  for (const progress of [.1, .6]) {
   const weights = [1, progress > .5 ? 1 : .5, progress > .5 ? 1 : 0, 0, 0];
   // The ring's first link alone is "collinear" with itself, and was drawn beside P on a tie.
   expect(runScene(base({stage: 'add', summing: true, weights, chain: {scale: 1, fields: ringFields, weights}})).chainBeside, `ring at ${progress}`).toBe(false);
   expect(runScene(base({stage: 'add', kind: 'disk', closed: false, at: t => ({x: 2 * t, y: 0, z: 0}), partner: null, summing: true, weights, chain: {scale: 1, fields: diskFields, weights}})).chainBeside, `disk at ${progress}`).toBe(true);
  }
  expect(fieldsCollinear([{x: 1, y: 0, z: 0}, {x: -1, y: 0, z: 0}])).toBe(false);
 });
});

describe('the charge\'s sign is written along it in space', () => {
 it('the ramp\'s marks crowd toward its heavy end, as its density does', () => {
  const marks = signMarks(fieldSamples('ramp', params()), 20, .5);
  expect(marks.length).toBeGreaterThan(4);
  const ys = marks.map(m => m.y).sort((a, b) => a - b), gaps = ys.slice(1).map((y, i) => y - ys[i]);
  for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThan(gaps[i - 1] + 1e-9);
 });
 it('a uniform rod is marked evenly, and an endless line only along what the picture shows', () => {
  const rod = signMarks(fieldSamples('bisector', params()), 20, .5).map(m => m.y);
  const gaps = rod.slice(1).map((y, i) => y - rod[i]);
  expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.05);
  const line = signMarks(fieldSamples('infinite', params()), 8, .5);
  expect(line.every(m => LEN(m) <= 8)).toBe(true);
  expect(line.length).toBeGreaterThan(20);
 });
});

describe('the flat side view of the sheet is the field Gauss gives', () => {
 it('every line is straight and square to the plane, and the gaps between them are equal', () => {
  for (const z of [.5, 3]) {
   const p = params({distance: z}), reach = Math.max(2.5, p.distance * 1.7, p.size);
   const coarse = coarsen(fieldSamples('sheet', p), 192);
   const lines = sideSheet(coarse, 15, reach * .95, {x0: -9, y0: -2, x1: 9, y1: 7});
   for (const l of lines) expect(Math.abs(l[0].x - l[l.length - 1].x)).toBeLessThan(1e-12);
   const roots = [...new Set(lines.map(l => l[0].y === 0 ? l[0].x : l[l.length - 1].x))].sort((a, b) => a - b);
   const gaps = roots.slice(1).map((x, i) => x - roots[i]);
   expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.01);
   // Across the whole window, and out of the plane on both faces, away from a positive sheet.
   expect(roots[0]).toBeLessThan(-9 + gaps[0]);
   expect(roots[roots.length - 1]).toBeGreaterThan(9 - gaps[0]);
   expect(lines.every(l => Math.abs(l[0].y) < 1e-12)).toBe(true);
  }
 });
});

describe('a flat arrow is not drawn where the charge is a row of lumps', () => {
 it('beside the semi-infinite line\'s far, coarse pieces, every arrow drawn points within 10 degrees of the field', () => {
  const p = params({distance: .5}), coarse = coarsen(fieldSamples('semi', p), 192);
  const fine = sampleDistribution('semi', p, 6000);
  const truth = (x: number, y: number) => {
   let ex = 0, ey = 0;
   for (const s of fine) {const dx = x - s.position.x, dy = y - s.position.y, r2 = dx * dx + dy * dy; if (r2 < 1e-12) continue; const k = s.dq / (r2 * Math.sqrt(r2)); ex += k * dx; ey += k * dy;}
   return Math.atan2(ey, ex);
  };
  const arrows = vectorGrid(coarse, {x0: -3, y0: -3, x1: 11, y1: 3}, 4 / 7);
  expect(arrows.length).toBeGreaterThan(100);
  const off = arrows.map(a => {const d = Math.abs(Math.atan2(a.dir.y, a.dir.x) - truth(a.at.x, a.at.y)); return {a, deg: Math.min(d, 2 * Math.PI - d) * 180 / Math.PI};}).filter(o => o.deg > 10);
  expect(off.map(o => `(${o.a.at.x.toFixed(2)}, ${o.a.at.y.toFixed(2)}) ${o.deg.toFixed(1)}°`)).toEqual([]);
 });
});
export type {ChargeSample};
