import {describe, expect, it} from 'vitest';
import type {ChargeSample} from '../src/distributions/types';
import type {Vec} from '../src/symbolic/physics';
import {openingCamera, projectCamera} from '../src/diagrams/camera';
import {seedPool} from '../src/diagrams/fieldlines';
import {annuliField, endlessAxis, latticeBody, latticeFrame, radialLines, spaceLines, spaceSeeds, surfaceRoots, traceTo} from '../src/diagrams/field3d';
import {diskSignRadii, drawOrder, drawnAfter, fillAlpha, latticeClear, LATTICE_CLEAR, segmentGap, sheetFarFade, sheetSignRoots, sheetSigns, splitAtPlane, strokeSide, wireRadius, type OrderNode} from '../src/diagrams/three/bodies';
import {cameraBasis} from '../src/diagrams/three/orthoCamera';
import {fieldsCollinear, runScene, type RunSceneInput} from '../src/diagrams/three/runScene';
import {endlessSheet, sideSheetArrows} from '../src/diagrams/FieldCanvas';
import {coarsen, sampleDistribution} from '../src/diagrams/sampling';
import {latticeArea} from '../src/diagrams/vectorfield';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';
/* THE SCENE LANE, WAVE 1, ITERATION 3: what the critics found, pinned where it can be without a GPU.
 *
 * The overlay drawn before the marks it was meant to lie over; a piece on P's own line given itself as a
 * mirror; wire lines premixed with the paper over the tube; the endless line's plaid; the disk's lines
 * from two rings; the disk's and the sheet's sign marks; the sheet's side-view arrows summed from coarse
 * annuli; the arrows' cube off-centre and its hole round P; the chain hidden in the net arrow; the dark
 * fill. Every one of these fails on the code before this change. */
const params = (over: Partial<Params> = {}): Params => ({...DEFAULT_PARAMS, ...over});
const UNBOUNDED = new Set<ProblemId>(['infinite', 'semi', 'sheet']);
/** ChargeDiagram's field partition, and its 3D reach. */
const fieldSamples = (id: ProblemId, p: Params) => sampleDistribution(id, p, Math.max(p.slices, UNBOUNDED.has(id) ? 400 : 96));
const reachOf = (p: Params) => Math.round(Math.min(9, Math.max(3.5, p.size * 1.5)) * 2) / 2;
const LEN = (v: Vec) => Math.hypot(v.x, v.y, v.z);
const deg = (a: Vec, b: Vec) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (LEN(a) * LEN(b))))) * 180 / Math.PI;

describe('what is laid over the scene is drawn after the marks', () => {
 it('three\'s order: a group\'s renderOrder rules everything under it, and the scene root is group zero', () => {
  const mesh = (name: string, renderOrder = 0): OrderNode => ({name, renderOrder, children: []});
  // As it was: the front strokes straight under the scene with a high renderOrder.
  const before: OrderNode = {renderOrder: 0, children: [{name: 'marks', isGroup: true, renderOrder: 2, children: [mesh('element')]}, mesh('front-strokes', 5), mesh('signs', 3)]};
  const was = drawOrder(before);
  expect(drawnAfter(was.get('front-strokes')!, was.get('element')!)).toBe(false);
  expect(drawnAfter(was.get('signs')!, was.get('element')!)).toBe(false);
  // As it is: an overlay group drawn after the marks.
  const after: OrderNode = {renderOrder: 0, children: [{name: 'marks', isGroup: true, renderOrder: 2, children: [mesh('element')]},
   {name: 'overlay', isGroup: true, renderOrder: 3, children: [mesh('front-heads', 1), mesh('front-strokes', 2), mesh('signs', 3)]}]};
  const is = drawOrder(after);
  for (const name of ['front-heads', 'front-strokes', 'signs']) expect(drawnAfter(is.get(name)!, is.get('element')!), name).toBe(true);
  expect(drawnAfter(is.get('front-strokes')!, is.get('front-heads')!)).toBe(true);
 });
});

describe('a line round a wire is ink, never paper', () => {
 it('no wire segment is premixed with the paper; a surface still splits at its plane', () => {
  const a = {x: 0, y: 0, z: -1}, b = {x: 0, y: 0, z: 1};
  expect(strokeSide('wire', a, b)).toEqual([{a, b, behind: false}]);
  expect(strokeSide('wire', {x: 1, y: 0, z: -2}, {x: 1, y: 1, z: -3}).every(s => !s.behind)).toBe(true);
  expect(strokeSide('disk', a, b)).toEqual(splitAtPlane([a, b]));
  expect(strokeSide('sheet', a, b).map(s => s.behind)).toEqual([true, false]);
 });
});

describe('a piece on P\'s own line has no mirror', () => {
 const rod = (t: number): Vec => ({x: 0, y: 4 * (t - .5), z: 0});
 const base = (over: Partial<RunSceneInput>): RunSceneInput => ({stage: 'cancel', kind: 'wire', closed: false, n: 5, selected: 2, at: rod, partner: 2, weights: [1, 1, 1, 1, 1], summing: false, continuum: 0, split: 0, arrows: null, chain: null, ...over});
 const field = {x: 1, y: 0, z: 0};
 const arrows = {scale: 2, field, keep: field, drop: {x: 0, y: 0, z: 0}, partner: field, partnerKeep: field, partnerDrop: {x: 0, y: 0, z: 0}, components: true, cancelled: .97};
 it('no lighter copy of ΔE over its own, and no second ΔE_x laid on the first', () => {
  const s = runScene(base({arrows}));
  expect(s.partner).toBeNull();
  expect(s.arrows!.partner).toBeNull();
  expect(s.arrows!.partnerDrop).toBeNull();
  expect(s.arrows!.partnerSurvivor).toBeNull();
  expect(s.arrows!.partnerFrom).toBeNull();
  expect(s.arrows!.cancelled).toBe(0);
  expect(s.arrows!.keep).toEqual({x: 2, y: 0, z: 0});
 });
 it('a piece with a real mirror keeps it', () => {
  const s = runScene(base({selected: 3, partner: 1, arrows}));
  expect(s.arrows!.partner).not.toBeNull();
  expect(s.arrows!.partnerSurvivor).not.toBeNull();
 });
});

describe('the endless line\'s field goes round it, not in two parallel families', () => {
 const opening = openingCamera('infinite');
 /** The screen direction of each line's first stretch, in five-degree bins. */
 const bins = (lines: Vec[][], yaw = opening.yaw, pitch = opening.pitch) => new Set(lines.map(l => {
  const a = projectCamera(l[0], yaw, pitch), b = projectCamera(l[Math.min(l.length - 1, 3)], yaw, pitch);
  return Math.round((Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 360) % 180 / 5);
 })).size;
 it('the infinite line is drawn from Gauss: radial, from roots along what is shown, many directions', () => {
  for (const distance of [.5, 3]) {
   const p = params({distance}), reach = reachOf(p), few = coarsen(fieldSamples('infinite', p), 144);
   const window = 10, axis = endlessAxis(few, window)!;
   expect(axis, `d = ${distance}`).not.toBeNull();
   const pool = seedPool(few, 16, reach * .95, window);
   const lines = radialLines(axis, pool.count, wireRadius(reach), reach * 1.4, 1);
   expect(bins(lines), `d = ${distance}`).toBeGreaterThanOrEqual(6);
   // Every segment is square to the wire and points away from it.
   for (const l of lines) for (let i = 0; i + 1 < l.length; i++) {
    const a = l[i], b = l[i + 1], d = {x: b.x - a.x, y: b.y - a.y, z: b.z - a.z};
    // The point's offset from the wire, with its part along the wire taken out.
    const w = {x: a.x - axis.foot.x, y: a.y - axis.foot.y, z: a.z - axis.foot.z}, along = w.x * axis.dir.x + w.y * axis.dir.y + w.z * axis.dir.z;
    const radial = {x: w.x - axis.dir.x * along, y: w.y - axis.dir.y * along, z: w.z - axis.dir.z * along};
    expect(deg(d, radial)).toBeLessThan(.5);
   }
   // Negative charge runs the other way, into the wire.
   const inward = radialLines(axis, 4, .05, 3, -1), off = (v: Vec) => LEN({x: v.x - axis.foot.x, y: 0, z: v.z - axis.foot.z});
   expect(off(inward[0][0])).toBeGreaterThan(off(inward[0][inward[0].length - 1]));
  }
 });
 it('only a straight line running past the picture both ways is the infinite line', () => {
  expect(endlessAxis(coarsen(fieldSamples('semi', params()), 144), 10)).toBeNull();
  expect(endlessAxis(coarsen(fieldSamples('bisector', params()), 48), 10)).toBeNull();
  expect(endlessAxis(coarsen(fieldSamples('ring', params()), 48), 10)).toBeNull();
 });
 it('the semi-infinite line, traced, leaves its wire in many directions', {timeout: 20000}, () => {
  const p = params(), reach = reachOf(p), few = coarsen(fieldSamples('semi', p), 144), span = Math.max(...few.map(s => LEN(s.position)), .5);
  const pool = seedPool(few, 16, reach * .95, 10);
  const opts = traceTo(few, 'wire', reach, span, {seedLimit: reach * .95, seedPool: pool.pool, root: {inset: wireRadius(reach)}});
  const flat = spaceLines(few, 'wire', pool.count, opts), twisted = spaceLines(few, 'wire', pool.count, {...opts, twist: true});
  const semi = openingCamera('semi');
  expect(bins(flat, semi.yaw, semi.pitch)).toBeLessThan(bins(twisted, semi.yaw, semi.pitch));
  expect(bins(twisted, semi.yaw, semi.pitch)).toBeGreaterThanOrEqual(6);
  // The ring keeps its meridians: twisting is asked for, never assumed.
  const ring = sampleDistribution('ring', p, 96);
  expect(spaceSeeds(ring, 'wire', 16, .2)).toEqual(spaceSeeds(ring, 'wire', 16, .2, 4, Infinity, false));
 });
});

describe('the disk\'s lines leave every part of its face', () => {
 for (const size of [4, 8]) it(`R = ${size / 2}: roots spread over the face, few in the lit washer, the lines still on the field`, {timeout: 20000}, () => {
  const p = params({size}), R = size / 2, reach = reachOf(p), few = coarsen(fieldSamples('disk', p), 48);
  const span = Math.max(...few.map(s => LEN(s.position)), .5), pool = seedPool(few, 16, reach * .95, 10);
  const roots = surfaceRoots(few, pool.count).map(q => Math.hypot(q.x, q.y));
  const washer = [R * 3 / 5, R * 4 / 5];
  expect(new Set(roots.map(r => r.toFixed(2))).size).toBeGreaterThanOrEqual(6);
  expect(Math.min(...roots)).toBeLessThan(.35 * R);
  expect(Math.max(...roots)).toBeGreaterThan(.85 * R);
  expect(roots.filter(r => r >= washer[0] && r <= washer[1]).length / roots.length).toBeLessThanOrEqual(.35);
  // Both faces.
  const seeds = spaceSeeds(few, 'surface', pool.count, .2);
  expect(seeds.filter(s => s.z > 0).length).toBe(seeds.filter(s => s.z < 0).length);
  // Traced as FieldStage traces them, every chord runs along the field it follows.
  const lines = spaceLines(few, 'surface', pool.count, traceTo(few, 'surface', reach, span, {seedLimit: reach * .95, seedPool: pool.pool, root: {inset: 0}}));
  const off: number[] = [];
  for (const l of lines) for (let i = 1; i + 2 < l.length; i++) {
   const a = l[i], b = l[i + 1], mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2};
   if (Math.abs(mid.z) < .3) continue;
   const e = annuliField(few, mid), d = {x: b.x - a.x, y: b.y - a.y, z: b.z - a.z};
   off.push(Math.min(deg(d, e), deg(d, {x: -e.x, y: -e.y, z: -e.z})));
  }
  off.sort((x, y) => x - y);
  expect(off[Math.floor(off.length * .95)]).toBeLessThan(.5);
 });
});

describe('the sign is written on the charge, and not on the chosen piece', () => {
 it('the disk\'s marks stay off the chosen ring, and the outer part of the disk carries some', () => {
  for (const R of [2, 3, 4]) for (const unit of [42, 30]) for (const k of [0, 1, 2, 3, 4]) {
   const band = {inner: R * k / 5, outer: R * (k + 1) / 5}, clear = 5.85 / unit;
   const radii = diskSignRadii(R, unit, band, clear);
   expect(radii.length, `R ${R} ring ${k}`).toBeGreaterThan(0);
   for (const r of radii) expect(r < band.inner - clear + 1e-9 || r > band.outer + clear - 1e-9, `R ${R} ring ${k}: ${r}`).toBe(true);
   if (band.outer < .85 * R) expect(Math.max(...radii), `R ${R} ring ${k}`).toBeGreaterThan(band.outer);
  }
  // At the disk's default the marks are not all at one radius.
  expect(new Set(diskSignRadii(2, 42, {inner: 1.2, outer: 1.6}, 5.85 / 42).map(r => r.toFixed(2))).size).toBeGreaterThan(1);
 });
 it('the sheet\'s marks are laid on the sheet: turning the view changes how they are drawn, not where', () => {
  const unit = 42, pitch = openingCamera('sheet').pitch, far = sheetFarFade(3, pitch, unit);
  const roots = sheetSignRoots(17);
  const view = (yaw: number) => {
   const b = cameraBasis(yaw, pitch);
   const toScreen = (v: Vec) => ({x: 360 + (v.x * b.right.x + v.y * b.right.y + v.z * b.right.z) * unit, y: 300 - (v.x * b.up.x + v.y * b.up.y + v.z * b.up.z) * unit});
   return sheetSigns(roots, toScreen, {x: -Math.sin(yaw), y: Math.cos(yaw)}, far, null, 17, .14);
  };
  const a = view(openingCamera('sheet').yaw), b = view(openingCamera('sheet').yaw + .7);
  expect(a.map(m => m.at)).toEqual(b.map(m => m.at));
  expect(a.filter(m => m.alpha > 0).length).toBeGreaterThan(5);
  expect(a.map(m => m.alpha)).not.toEqual(b.map(m => m.alpha));
  // None on a chosen ring drawn solid; on a ring drawn only as a wash, none on its walls.
  const b0 = cameraBasis(openingCamera('sheet').yaw, pitch);
  const toScreen = (v: Vec) => ({x: 360 + (v.x * b0.right.x + v.y * b0.right.y) * unit, y: 300 - (v.x * b0.up.x + v.y * b0.up.y) * unit});
  const solid = sheetSigns(roots, toScreen, {x: 0, y: 1}, far, {inner: 2, outer: 3}, 17, .14);
  expect(solid.filter(m => m.alpha > 0 && Math.hypot(m.at.x, m.at.y) >= 1.86 && Math.hypot(m.at.x, m.at.y) <= 3.14)).toEqual([]);
  const wash = sheetSigns(roots, toScreen, {x: 0, y: 1}, far, {inner: 2, outer: 40}, 17, .14);
  expect(wash.filter(m => m.alpha > 0 && Math.abs(Math.hypot(m.at.x, m.at.y) - 2) <= .14)).toEqual([]);
  expect(wash.filter(m => m.alpha > 0 && Math.hypot(m.at.x, m.at.y) > 2.2).length).toBeGreaterThan(0);
 });
});

describe('the sheet\'s side-view arrows are drawn from Gauss', () => {
 for (const distance of [.5, 3]) it(`at d = ${distance}: every arrow vertical, every weight one`, () => {
  const p = params({distance}), reach = Math.max(2.5, p.distance * 1.7, p.size), coarse = coarsen(fieldSamples('sheet', p), 192);
  expect(endlessSheet(coarse, reach, 'xz', 'surface')).toBe(true);
  const {area, spacing} = latticeArea({x0: -8, y0: -3, x1: 8, y1: 5}, reach / 7, .5);
  const arrows = sideSheetArrows(coarse, area, spacing);
  expect(arrows.length).toBeGreaterThan(40);
  for (const a of arrows) {
   expect(a.weight).toBe(1);
   expect(Math.abs(a.dir.x)).toBe(0);
   expect(a.dir.y).toBe(Math.sign(a.at.y));
  }
  // Into the sheet for negative charge.
  const negative = coarsen(fieldSamples('sheet', params({distance, charge: -2})), 192);
  for (const a of sideSheetArrows(negative, area, spacing)) expect(a.dir.y).toBe(-Math.sign(a.at.y));
 });
 it('a disk, however zoomed, is not the sheet', () => {
  expect(endlessSheet(coarsen(fieldSamples('disk', params()), 64), 4, 'xz', 'surface')).toBe(false);
  expect(endlessSheet(coarsen(fieldSamples('sheet', params()), 64), 4, 'xy', 'surface')).toBe(false);
 });
});

describe('the arrows\' cube stands round the charge and P', () => {
 const inside = (v: Vec, c: Vec, s: number) => Math.max(Math.abs(v.x - c.x), Math.abs(v.y - c.y), Math.abs(v.z - c.z)) <= 1.5 * s + .05 + 1e-9;
 it('a disk of any size is centred on its axis', () => {
  for (const size of [4, 6.5, 8]) {
   const p = params({size}), source = fieldSamples('disk', p), P = {x: 0, y: 0, z: p.distance};
   const {centre} = latticeFrame([...latticeBody('disk', size / 2, undefined, source), P], reachOf(p));
   expect(centre.x, `R ${size / 2}`).toBe(0);
   expect(centre.y, `R ${size / 2}`).toBe(0);
  }
 });
 it('P and both ends of the charge lie within the outer layers', () => {
  const cases: [ProblemId, Partial<Params>, (p: Params, s: ChargeSample[]) => Vec][] = [
   ['axial', {}, (p, s) => ({x: Math.max(...s.map(q => q.position.x)) + p.distance, y: 0, z: 0})],
   ['axial', {size: 8, distance: 6}, (p, s) => ({x: Math.max(...s.map(q => q.position.x)) + p.distance, y: 0, z: 0})],
   ['arc', {}, () => ({x: 0, y: 0, z: 0})],
  ];
  for (const [id, over, at] of cases) {
   const p = params(over), source = fieldSamples(id, p), P = at(p, source);
   const ends = [source[0].position, source[source.length - 1].position];
   const {centre, spacing} = latticeFrame([...source.map(s => s.position), P], reachOf(p));
   for (const v of [P, ...ends]) expect(inside(v, centre, spacing), `${id} ${JSON.stringify(over)}: ${JSON.stringify(v)}`).toBe(true);
  }
 });
});

describe('the arrows round P give way on the screen, not by a ball in space', () => {
 const basis = cameraBasis(openingCamera('ring').yaw, openingCamera('ring').pitch), screen = {right: basis.right, up: basis.up, unit: 42};
 const P = {x: 0, y: 0, z: 3}, net = {x: 0, y: 0, z: 2};
 it('hides an arrow drawn on P, on the net arrow, or just past its tip -- whatever its depth', () => {
  // A step straight behind P along the line of sight: in space it is far away, on the screen it is on P.
  const f = basis.forward, behind = {x: P.x - f.x * 2, y: P.y - f.y * 2, z: P.z - f.z * 2};
  expect(latticeClear(behind, {x: behind.x + .3, y: behind.y, z: behind.z}, P, net, screen)).toBe(false);
  // Lying along the net arrow, and just beyond its tip.
  expect(latticeClear({x: .1, y: 0, z: 4}, {x: .1, y: 0, z: 4.6}, P, net, screen)).toBe(false);
  expect(latticeClear({x: 0, y: 0, z: 5.3}, {x: 0, y: 0, z: 5.7}, P, net, screen)).toBe(false);
  // Well clear of both.
  expect(latticeClear({x: 3, y: 0, z: 1}, {x: 3.5, y: 0, z: 1}, P, net, screen)).toBe(true);
 });
 it('never shows an arrow within forty units of P on the screen', () => {
  const at = (v: Vec) => ({x: (v.x * basis.right.x + v.y * basis.right.y + v.z * basis.right.z) * 42, y: -(v.x * basis.up.x + v.y * basis.up.y + v.z * basis.up.z) * 42});
  for (let i = 0; i < 400; i++) {
   const c = {x: Math.sin(i * 1.3) * 3, y: Math.cos(i * .7) * 3, z: 3 + Math.sin(i * .37) * 3}, d = {x: Math.cos(i), y: Math.sin(i * 1.7), z: Math.cos(i * 2.3)};
   const l = LEN(d) || 1, tail = c, tip = {x: c.x + d.x / l * .6, y: c.y + d.y / l * .6, z: c.z + d.z / l * .6};
   if (!latticeClear(tail, tip, P, net, screen)) continue;
   const p0 = at(P), a = at(tail), b = at(tip);
   expect(segmentGap(a, b, p0, p0)).toBeGreaterThanOrEqual(40);
  }
  expect(LATTICE_CLEAR.point).toBeGreaterThanOrEqual(40);
 });
});

describe('the chain goes beside the net arrow exactly where it would hide in it', () => {
 const fields = (id: ProblemId, over: Partial<Params>) => sampleDistribution(id, {...params(over), slices: 0, continuum: 0}, 5).map(s => s.field);
 it('beside where the whole chain strays under five per cent of the sum from its line', () => {
  for (const [id, over] of [['bisector', {size: 1, distance: 6}], ['ring', {size: 1, distance: 6}], ['arc', {phi: .1 * Math.PI}], ['ramp', {size: 1}], ['axial', {}], ['disk', {}]] as [ProblemId, Partial<Params>][])
   expect(fieldsCollinear(fields(id, over)), `${id} ${JSON.stringify(over)}`).toBe(true);
 });
 it('not beside where it is seen where it is', () => {
  for (const [id, over] of [['bisector', {}], ['ring', {}], ['arc', {}], ['bisector', {distance: 6}], ['ramp', {}]] as [ProblemId, Partial<Params>][])
   expect(fieldsCollinear(fields(id, over)), `${id} ${JSON.stringify(over)}`).toBe(false);
 });
});

describe('the dark theme\'s summed shading is a tint, not a slab', () => {
 it('is laid at under a third', () => {
  expect(fillAlpha(true)).toBeLessThanOrEqual(.3);
  expect(fillAlpha(false)).toBeGreaterThan(fillAlpha(true));
 });
});
