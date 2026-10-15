import {describe, expect, it} from 'vitest';
import type {Vec} from '../src/symbolic/physics';
import {boxGap, fieldLines, lineHeads, LINE_HEAD, meetsBoxes, seedPool, traceLimit, type Box} from '../src/diagrams/fieldlines';
import {endlessAxis, endlessBody, endlessRay, latticeCore, latticeFrame, meridianLines, meridianLaunch, rayField, rayLines, spaceField, spaceLines, spaceSeeds, surfaceRoots, traceTo} from '../src/diagrams/field3d';
import {apartOnScreen, behindGap, BEHIND_GAP, chainAside, CHAIN_ASIDE, diskSignMarks, lineReach, lineStrength, SHEET_SIGN_GAP, sheetFarFade, sheetSignRoots, sheetSigns, signMarks, washerHalf, wireRadius} from '../src/diagrams/three/bodies';
import {cameraBasis} from '../src/diagrams/three/orthoCamera';
import {coarsen, sampleDistribution} from '../src/diagrams/sampling';
import {bodyDistance, bodyFoot, PLOT} from '../src/diagrams/vectorfield';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';
/* THE SCENE LANE, WAVE 2, ITERATION 1: what the critics found, pinned where it can be without a GPU.
 *
 * The disk's lines leaving in four doubled bundles; sign marks piled on a small disk, over a narrow arc and
 * thick on the sheet seen low; the chain moved aside while it was a stub; a small charge's lines fading out
 * before they reach P; the semi-infinite line's lines following the integration's lumps; the endless
 * charges' arrows standing in a fixed cube about O that P could be outside of; a wire's lines leaving it in
 * four tufts; the ring's side view with no line near P; the flat lines cornered where they join a rod's
 * ends; the sheet's smallest ring drawn as a puck; and the field's heads and arrows set on the names. Every
 * one of these fails on the code before this change. */
const params = (over: Partial<Params> = {}): Params => ({...DEFAULT_PARAMS, ...over});
const UNBOUNDED = new Set<ProblemId>(['infinite', 'semi', 'sheet']);
/** ChargeDiagram's field partition, and its 3D reach. */
const fieldSamples = (id: ProblemId, p: Params) => sampleDistribution(id, p, Math.max(p.slices, UNBOUNDED.has(id) ? 400 : 96));
const reachOf = (p: Params) => Math.round(Math.min(9, Math.max(3.5, p.size * 1.5)) * 2) / 2;
/** Where ChargeDiagram stands P in space. */
const pointOf = (id: ProblemId, p: Params): Vec => id === 'arc' ? {x: 0, y: 0, z: 0} : id === 'axial' ? {x: p.size + p.distance, y: 0, z: 0}
 : ['ring', 'disk', 'sheet', 'v-ring', 'v-disk'].includes(id) ? {x: 0, y: 0, z: p.distance} : {x: p.distance, y: 0, z: 0};
const LEN = (v: Vec) => Math.hypot(v.x, v.y, v.z);
const deg = (a: Vec, b: Vec) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (LEN(a) * LEN(b))))) * 180 / Math.PI;

describe('each face of the disk is its own sunflower', () => {
 for (const size of [4, 8]) it(`R = ${size / 2}: the lines leave each face evenly all round, never two in one meridian`, () => {
  const p = params({size}), few = coarsen(fieldSamples('disk', p), 48), pool = seedPool(few, 16, reachOf(p) * .95, 10);
  const seeds = spaceSeeds(few, 'surface', pool.count, .2);
  for (const face of [1, -1]) {
   const angles = seeds.filter(s => Math.sign(s.z) === face).map(s => ((Math.atan2(s.y, s.x) * 180 / Math.PI) % 360 + 360) % 360).sort((a, b) => a - b);
   const n = angles.length;
   expect(n).toBeGreaterThanOrEqual(6);
   const gaps = angles.map((a, i) => (i + 1 < n ? angles[i + 1] : angles[0] + 360) - a);
   expect(Math.min(...gaps), `face ${face}: ${angles.map(a => a.toFixed(0)).join(' ')}`).toBeGreaterThanOrEqual(.6 * 360 / n);
   expect(Math.min(...gaps)).toBeGreaterThanOrEqual(25);
  }
 });
 it('one face is the old single sunflower, unchanged', () => {
  const few = coarsen(fieldSamples('disk', params()), 48);
  const one = surfaceRoots(few, 12, 1);
  one.forEach((q, k) => expect(Math.atan2(q.y, q.x)).toBeCloseTo(Math.atan2(Math.sin(k * Math.PI * (3 - Math.sqrt(5)) + .4), Math.cos(k * Math.PI * (3 - Math.sqrt(5)) + .4)), 9));
 });
});

describe('sign marks never pile up', () => {
 const half = (unit: number) => (4.6 + 1.25) / unit;
 it('the smallest disk: no two marks closer than a mark\'s width and a little paper, at any zoom', () => {
  for (const unit of [24, 30, 42, 60, 90, 140]) for (const band of [null, {inner: 0, outer: .1}, {inner: .2, outer: .3}, {inner: .4, outer: .5}]) {
   const marks = diskSignMarks(.5, unit, band, half(unit));
   expect(marks.length, `unit ${unit}`).toBeGreaterThan(0);
   for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++)
    expect(Math.hypot(marks[i].x - marks[j].x, marks[i].y - marks[j].y) * unit, `unit ${unit} band ${JSON.stringify(band)}`).toBeGreaterThanOrEqual(2.2 * 5.85 - 1e-9);
  }
 });
 it('a wide disk still carries rings of marks', () => {
  const marks = diskSignMarks(2, 42, {inner: 1.2, outer: 1.6}, half(42));
  expect(new Set(marks.map(m => Math.hypot(m.x, m.y).toFixed(2))).size).toBeGreaterThan(1);
  expect(marks.length).toBeGreaterThan(6);
 });
 it('the narrowest arc carries one mark, not two that cover it', () => {
  const marks = signMarks(fieldSamples('arc', params({phi: .1 * Math.PI})), 20, 34 / 42);
  expect(marks.length).toBeLessThanOrEqual(1);
  expect(marks.length).toBe(1);
 });
 it('marks that would land on one another on the screen are let go', () => {
  // A rod seen end on: every mark at the same place on the screen.
  const rod = signMarks(fieldSamples('bisector', params()), 20, .5).map(at => ({at}));
  expect(rod.length).toBeGreaterThan(3);
  expect(apartOnScreen(rod, v => ({x: v.x * 40, y: v.z * 40}), 12.9)).toHaveLength(1);
  expect(apartOnScreen(rod, v => ({x: v.y * 40, y: v.z * 40}), 12.9)).toHaveLength(rod.length);
 });
});

describe('the chain stays on P while it is a stub', () => {
 it('nothing aside under thirty units; then at most three tenths of its length', () => {
  expect(chainAside(0)).toBe(0);
  expect(chainAside(5)).toBe(0);
  expect(chainAside(CHAIN_ASIDE.from - .01)).toBe(0);
  for (const shown of [30, 33, 40, 80, 300]) {
   expect(chainAside(shown)).toBeGreaterThan(0);
   expect(chainAside(shown)).toBeLessThanOrEqual(.3 * shown);
   expect(chainAside(shown)).toBeLessThanOrEqual(10);
  }
 });
});

describe('a small charge\'s field reaches P', () => {
 for (const id of ['bisector', 'ring', 'disk', 'axial'] as ProblemId[]) it(`${id} at size 1, P six metres off: lines still drawn at P, and one passes near it`, {timeout: 30000}, () => {
  const p = params({size: 1, distance: 6}), reach = reachOf(p), layout = id === 'disk' ? 'surface' : 'wire';
  const few = coarsen(fieldSamples(id, p), 48), P = pointOf(id, p), away = bodyDistance(few, layout);
  const drawn = lineReach(reach, away(P.x, P.y, P.z));
  // The reach alone faded every line to nothing short of P.
  expect(lineStrength(away(P.x, P.y, P.z), reach)).toBeLessThan(.1);
  expect(lineStrength(away(P.x, P.y, P.z), drawn)).toBeGreaterThanOrEqual(.35);
  const span = Math.max(...few.map(s => LEN(s.position)), .5), pool = seedPool(few, 16, reach * .95, 10);
  const lines = spaceLines(few, layout, pool.count, traceTo(few, layout, drawn, span, {seedLimit: reach * .95, seedPool: pool.pool, root: {inset: layout === 'wire' ? wireRadius(reach) : 0}, twist: id !== 'ring'}));
  // The lines run on past P's distance from the charge, still drawn there: not faded out short of it.
  // (Where exactly they pass is the charge's: sixteen lines round a charge this small, seen from six metres,
  // are a point charge's, about fifty degrees apart, and P on an axis may sit between them.)
  const past = lines.flat().filter(q => away(q.x, q.y, q.z) >= away(P.x, P.y, P.z) && lineStrength(away(q.x, q.y, q.z), drawn) >= .3);
  expect(past.length, id).toBeGreaterThan(0);
  // And at least as many lines reach P's distance as leave the charge.
  const reaching = lines.filter(l => l.some(q => away(q.x, q.y, q.z) >= away(P.x, P.y, P.z)));
  expect(reaching.length, id).toBeGreaterThanOrEqual(Math.floor(lines.length * .8));
  const before = spaceLines(few, layout, pool.count, traceTo(few, layout, reach, span, {seedLimit: reach * .95, seedPool: pool.pool, root: {inset: layout === 'wire' ? wireRadius(reach) : 0}, twist: id !== 'ring'}));
  expect(before.filter(l => l.some(q => away(q.x, q.y, q.z) >= away(P.x, P.y, P.z))).length, `${id} before`).toBe(0);
 });
 it('a P within the reach changes nothing, and a drag only moves the reach in steps', () => {
  expect(lineReach(6, 3)).toBe(6);
  expect(lineReach(6, 4.6)).toBe(6);
  const a = lineReach(3.5, 5), b = lineReach(3.5, 5.1);
  expect(a).toBe(b);
  const power = Math.log(lineReach(3.5, 9)) / Math.log(1.25);
  expect(Math.abs(power - Math.round(power))).toBeLessThan(1e-9);
 });
});

describe('the semi-infinite line\'s field is its own, not its lumps\'', () => {
 for (const distance of [.5, 1, 3]) it(`d = ${distance}: the half-line's closed form is the line's field, and every traced step follows it`, {timeout: 30000}, () => {
  const p = params({distance}), source = fieldSamples('semi', p), ray = endlessRay(source, 10)!;
  expect(ray).not.toBeNull();
  expect(endlessRay(fieldSamples('infinite', p), 10)).toBeNull();
  expect(endlessRay(fieldSamples('bisector', p), 10)).toBeNull();
  expect(endlessRay(fieldSamples('axial', p), 10)).toBeNull();
  // Against a very fine partition of the same line, where its lumps are far finer than the distance.
  const fine = sampleDistribution('semi', p, 20000), E = rayField(ray);
  for (const at of [{x: distance, y: 0, z: 0}, {x: .7, y: 4, z: .3}, {x: 1, y: -1, z: 0}, {x: 2, y: 9, z: -1}]) {
   const exact = spaceField(fine, at), closed = E(at);
   expect(deg(exact, closed), JSON.stringify(at)).toBeLessThan(.3);
   expect(LEN(closed) / LEN(exact), JSON.stringify(at)).toBeCloseTo(1, 1);
  }
  // Traced in space as the scene traces it: every step within two degrees of the field, and every seed a line.
  const few = coarsen(source, 144), reach = reachOf(p), wr = wireRadius(reach), span = Math.max(...few.map(s => LEN(s.position)));
  const fineStep = Math.max(.03, .15 * distance);
  const lines = rayLines(ray, 24, 10, Math.max(wr * 2.5, Math.min(reach * .95 * .06, .5 * distance)), wr, traceTo(few, 'wire', reach, Math.min(span, fineStep / .04), {crowd: reach * .95 * .012}));
  expect(lines).toHaveLength(24);
  const off: string[] = [];
  for (const l of lines) for (let i = 1; i + 2 < l.length; i++) {
   const a = l[i], b = l[i + 1], mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2};
   if (LEN(mid) > 12) continue;
   const e = E(mid), dir = {x: b.x - a.x, y: b.y - a.y, z: b.z - a.z}, angle = Math.min(deg(dir, e), deg(dir, {x: -e.x, y: -e.y, z: -e.z}));
   if (angle > 2) off.push(`${angle.toFixed(1)} at (${mid.x.toFixed(2)}, ${mid.y.toFixed(2)}, ${mid.z.toFixed(2)})`);
  }
  expect(off).toEqual([]);
 });
 it('the flat lines are evenly spaced beside the line, with no hole and no doubled stroke', () => {
  const p = params({distance: .5}), ray = endlessRay(fieldSamples('semi', p), 12)!;
  const window = {x0: -4, y0: -3, x1: 5, y1: 13};
  const lines = rayLines(ray, 32, 12, 4 * .95 * .05, 0, {step: .1, maxSteps: 3200, outerLimit: 30, crowd: 4 * .95 * .012, far: v => v.x < window.x0 || v.x > window.x1 || v.y < window.y0 || v.y > window.y1}, true);
  expect(lines).toHaveLength(32);
  // Where each line beside the wire crosses x = 3, over the stretch where the line is the infinite one's.
  const at: number[] = [];
  for (const l of lines) for (let i = 0; i + 1 < l.length; i++) {
   const a = l[i], b = l[i + 1];
   if ((a.x - 3) * (b.x - 3) <= 0 && a.x !== b.x) {const y = a.y + (b.y - a.y) * (3 - a.x) / (b.x - a.x); if (y > 3 && y < 10) at.push(y);}
  }
  at.sort((x, y) => x - y);
  const gaps = at.slice(1).map((x, i) => x - at[i]), median = [...gaps].sort((x, y) => x - y)[Math.floor(gaps.length / 2)];
  expect(gaps.length).toBeGreaterThan(6);
  for (const g of gaps) expect(Math.abs(g / median - 1), gaps.map(g => g.toFixed(2)).join(' ')).toBeLessThanOrEqual(.35);
 });
});

describe('an endless charge\'s arrows stand round P', () => {
 const kind = (id: ProblemId) => id === 'sheet' ? 'sheet' as const : 'wire' as const;
 for (const id of ['infinite', 'semi', 'sheet'] as ProblemId[]) it(`${id}: P inside the arrows at every height`, () => {
  for (const distance of [.5, 3, 6]) {
   const p = params({distance}), reach = reachOf(p), source = fieldSamples(id, p), P = pointOf(id, p);
   const {centre, spacing} = latticeFrame(endlessBody(kind(id), source, P, reach), reach);
   expect(spacing).toBeGreaterThanOrEqual(reach / 3 - 1e-9);
   for (const axis of ['x', 'y', 'z'] as const) expect(Math.abs(P[axis] - centre[axis]), `${id} d ${distance} ${axis}`).toBeLessThanOrEqual(1.5 * spacing + .05);
  }
 });
 it('the semi-infinite line has arrows beside the wire past its end', () => {
  const p = params(), reach = reachOf(p), source = fieldSamples('semi', p), P = pointOf('semi', p);
  const {centre, spacing} = latticeFrame(endlessBody('wire', source, P, reach), reach);
  const arrows = latticeCore(coarsen(source, 144), reach, 'wire', centre, spacing, rayField(endlessRay(source, 10)!));
  expect(arrows.filter(a => a.at.y >= 5).length).toBeGreaterThan(0);
 });
 it('the sheet\'s arrows stay half a step off the plane, all at full weight', () => {
  for (const distance of [.5, 3, 6]) {
   const p = params({distance}), reach = reachOf(p), source = fieldSamples('sheet', p), P = pointOf('sheet', p);
   const {centre, spacing} = latticeFrame(endlessBody('sheet', source, P, reach), reach);
   const arrows = latticeCore(coarsen(source, 144), reach, 'surface', centre, spacing);
   expect(arrows.length).toBeGreaterThan(20);
   for (const a of arrows) {
    expect(Math.abs(a.at.z / spacing - Math.round(a.at.z / spacing)), `d ${distance}`).toBeCloseTo(.5, 9);
    expect(a.weight, `d ${distance} at ${JSON.stringify(a.at)}`).toBe(1);
   }
  }
 });
 it('the infinite line is still the infinite line', () => {
  expect(endlessAxis(coarsen(fieldSamples('infinite', params()), 144), 10)).not.toBeNull();
 });
});

describe('the charge behind P leaves a gap round it', () => {
 it('a surface keeps a trace within the inner radius and all of itself from the outer; a wire is cut clean; nothing in front is touched', () => {
  expect(behindGap(0, true)).toBeCloseTo(BEHIND_GAP.low, 9);
  expect(behindGap(BEHIND_GAP.inner, true)).toBeCloseTo(BEHIND_GAP.low, 9);
  expect(behindGap(BEHIND_GAP.outer, true)).toBe(1);
  expect(behindGap(80, true)).toBe(1);
  // Twenty-two pixels below P -- where P's halo and the foot of the sum end -- the surface is all but paper.
  expect(behindGap(22, true)).toBeLessThan(.1);
  for (const d of [0, 10, 22, 30]) {expect(behindGap(d, false)).toBe(1); expect(behindGap(d, false, true)).toBe(1);}
  for (let d = 0; d < 40; d += .5) expect(behindGap(d + .5, true)).toBeGreaterThanOrEqual(behindGap(d, true));
  // A wire: gone within the hard radius, whole outside it -- wider than P's halo, about eleven pixels.
  expect(BEHIND_GAP.hard).toBeGreaterThanOrEqual(18);
  expect(behindGap(BEHIND_GAP.hard - .5, true, true)).toBe(0);
  expect(behindGap(BEHIND_GAP.hard + .5, true, true)).toBe(1);
 });
});

describe('a wire\'s lines leave it from all along it, not in four tufts', () => {
 /** The lines the scene draws round a wire, as FieldStage asks for them. */
 const scene = (id: ProblemId, p: Params) => {
  const reach = reachOf(p), few = coarsen(fieldSamples(id, p), 48), span = Math.max(...few.map(s => LEN(s.position)), .5), pool = seedPool(few, 16, reach * .95, 10);
  return {few, reach, lines: spaceLines(few, 'wire', pool.count, traceTo(few, 'wire', reach, span, {seedLimit: reach * .95, seedPool: pool.pool, root: {inset: wireRadius(reach)}, twist: true}))};
 };
 for (const id of ['ring', 'bisector', 'arc'] as ProblemId[]) it(`${id}: eight stations of two`, () => {
  const few = coarsen(fieldSamples(id, params()), 48), seeds = spaceSeeds(few, 'wire', 16, .2, 2, Infinity, true);
  const stations = new Set<string>();
  for (let k = 0; k + 1 < seeds.length; k += 2) stations.add(`${((seeds[k].x + seeds[k + 1].x) / 2).toFixed(3)},${((seeds[k].y + seeds[k + 1].y) / 2).toFixed(3)},${((seeds[k].z + seeds[k + 1].z) / 2).toFixed(3)}`);
  expect(stations.size).toBeGreaterThanOrEqual(8);
 });
 for (const size of [4, 8]) it(`ring R = ${size / 2}: no stretch of the ring wider than fifty degrees leaves no line`, {timeout: 30000}, () => {
  const p = params({size}), {lines, reach} = scene('ring', p), R = size / 2, wr = wireRadius(reach);
  const azimuths: number[] = [];
  for (const l of lines) for (const end of [l[0], l[l.length - 1]]) {
   const rho = Math.hypot(end.x, end.y);
   if (Math.hypot(rho - R, end.z) < 3 * wr) azimuths.push(((Math.atan2(end.y, end.x) * 180 / Math.PI) % 360 + 360) % 360);
  }
  azimuths.sort((a, b) => a - b);
  expect(azimuths.length).toBeGreaterThanOrEqual(12);
  const gaps = azimuths.map((a, i) => (i + 1 < azimuths.length ? azimuths[i + 1] : azimuths[0] + 360) - a);
  expect(Math.max(...gaps), azimuths.map(a => a.toFixed(0)).join(' ')).toBeLessThanOrEqual(50);
 });
 it('ring at its default: a line passes within a metre of P', {timeout: 30000}, () => {
  const p = params(), {lines} = scene('ring', p), P = pointOf('ring', p);
  const nearest = Math.min(...lines.flat().map(q => Math.hypot(q.x - P.x, q.y - P.y, q.z - P.z)));
  expect(nearest).toBeLessThan(1);
 });
});

describe('the ring\'s side view: the lines end evenly spaced in angle, so one runs beside P', () => {
 /** The flat side view, as FieldCanvas traces it: in the cut y = 0, x across and z up. */
 const side = (p: Params) => {
  const coarse = coarsen(fieldSamples('ring', p), 64), reach = Math.max(2.5, p.distance * 1.7, p.size);
  const span = Math.max(...coarse.map(s => LEN(s.position)), 1), step = Math.min(reach, span) * .05, limit = traceLimit(null, reach * 1.6);
  return meridianLines(coarse, 'wire', 15, {step, maxSteps: Math.min(1600, Math.max(420, Math.ceil(1.3 * limit / step))), outerLimit: limit, seedLimit: reach * .95, root: {}}).map(l => l.map(v => ({x: v.x, y: v.z})));
 };
 /** Where the lines cross the height z, sorted. */
 const crossings = (lines: {x: number; y: number}[][], z: number) => {
  const xs: number[] = [];
  for (const l of lines) for (let i = 0; i + 1 < l.length; i++) {const a = l[i], b = l[i + 1]; if ((a.y - z) * (b.y - z) <= 0 && a.y !== b.y) xs.push(a.x + (b.x - a.x) * (z - a.y) / (b.y - a.y));}
  return xs.sort((a, b) => a - b);
 };
 it('the launch angles: cos theta = psi / pi, evenly in theta', () => {
  const psi = meridianLaunch(4);
  expect(psi).toHaveLength(4);
  psi.forEach((a, k) => expect(Math.acos(a / Math.PI)).toBeCloseTo((k + .5) * Math.PI / 8, 9));
 });
 it('at its default, a line crosses P\'s height within two fifths of R of the axis, and the gaps there widen outward', {timeout: 30000}, () => {
  const p = params(), R = p.size / 2, lines = side(p), xs = crossings(lines, p.distance).filter(x => x > 0 && x <= 2 * R);
  expect(xs[0], xs.map(x => x.toFixed(2)).join(' ')).toBeLessThan(.4 * R);
  const gaps = [xs[0], ...xs.slice(1).map((x, i) => x - xs[i])];
  for (let i = 1; i < gaps.length; i++) expect(gaps[i], gaps.map(g => g.toFixed(2)).join(' ')).toBeGreaterThanOrEqual(gaps[i - 1] * .9);
 });
 for (const size of [1, 2, 4, 8]) for (const distance of [.5, 3, 6]) it(`R = ${size / 2}, z = ${distance}: every line has one end on the ring and none crosses the axis`, {timeout: 30000}, () => {
  const p = params({size, distance}), R = size / 2, lines = side(p);
  expect(lines.length).toBeGreaterThanOrEqual(12);
  for (const l of lines) {
   const onRing = [l[0], l[l.length - 1]].map(e => Math.min(Math.hypot(e.x - R, e.y), Math.hypot(e.x + R, e.y)));
   expect(Math.min(...onRing), JSON.stringify([l[0], l[l.length - 1]])).toBeLessThan(.02);
   // A line from one crossing never runs over to the other side of the axis: the field is symmetric about it.
   const side0 = Math.sign(l[0].x + l[l.length - 1].x);
   expect(l.every(q => q.x * side0 >= -1e-6), `R ${R} z ${distance}`).toBe(true);
  }
 });
});

describe('the flat lines meet a rod\'s ends without a corner', () => {
 for (const id of ['axial', 'endpoint', 'ramp', 'bisector'] as ProblemId[]) it(`${id}: every join to the rod within four degrees of the field`, {timeout: 30000}, () => {
  const p = params(), samples = fieldSamples(id, p), coarse = coarsen(samples, 64), reach = Math.max(2.5, p.distance * 1.7, p.size);
  const span = Math.max(...coarse.map(s => LEN(s.position)), 1), step = Math.min(reach, span) * .05, limit = traceLimit(null, reach * 1.6);
  const pool = seedPool(coarse, 15, reach * .95, 0), foot = bodyFoot(coarse, 'wire');
  const lines = fieldLines(coarse, pool.count, {step, maxSteps: Math.min(1600, Math.max(420, Math.ceil(1.3 * limit / step))), outerLimit: limit, seedLimit: reach * .95, seedPool: pool.pool, root: foot, finish: {samples, step: step / 4}});
  // Every chord within a third of a metre of the rod at a line's end on it: the join, and the last of the trace.
  const fine = sampleDistribution(id, p, 4000), away = bodyDistance(coarse, 'wire'), off: string[] = [];
  let joins = 0;
  for (const l of lines) for (const ends of [l, [...l].reverse()]) {
   const f = foot(ends[0].x, ends[0].y, 0)!;
   if (Math.hypot(f.x - ends[0].x, f.y - ends[0].y) > 1e-9) continue;
   joins++;
   for (let i = 0; i + 1 < ends.length; i++) {
    const a = ends[i], b = ends[i + 1], mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
    if (away(mid.x, mid.y, 0) > .33) break;
    // Not within two of the reference's own millimetre gaps of the rod, where a 4000-lump sum is lumps: the
    // lines off a rod's tips (see `tipSeeds`) are now finished to within a few millimetres of it.
    if (away(mid.x, mid.y, 0) < 2 * p.size / 4000) continue;
    const e = spaceField(fine, {...mid, z: 0}), d = {x: b.x - a.x, y: b.y - a.y, z: 0};
    const angle = Math.min(deg(d, e), deg(d, {x: -e.x, y: -e.y, z: -e.z}));
    if (angle > 4) off.push(`${angle.toFixed(1)} at (${mid.x.toFixed(3)}, ${mid.y.toFixed(3)})`);
   }
  }
  expect(joins).toBeGreaterThan(8);
  expect(off).toEqual([]);
 });
});

describe('the sheet\'s smallest ring is a piece of the sheet, not a puck', () => {
 it('no thicker than a sixth of its width, its walls never under a pixel and a half', () => {
  const px = 1 / 42, thick = wireRadius(4) * 1.5;
  // P half a metre up: the innermost ring runs from O to sixteen centimetres.
  expect(washerHalf(thick, 0, .162, px)).toBeLessThanOrEqual(Math.max(.75 * px, .15 * .162) + 1e-12);
  expect(washerHalf(thick, 0, .162, px)).toBeLessThan(thick * .62 * .6);
  expect(washerHalf(thick, 0, .01, px)).toBeCloseTo(.75 * px, 12);
  // A ring as wide as the disk's keeps the chosen piece's full thickness.
  expect(washerHalf(thick, 1.2, 1.6, px)).toBeCloseTo(thick * .62, 12);
 });
});

describe('the sheet\'s sign marks stay apart on the screen however low the view', () => {
 for (const pitch of [.2, .35, .6]) it(`pitch ${pitch}: no two marks drawn nearer than forty units`, () => {
  const yaw = -.5, unit = 42, b = cameraBasis(yaw, pitch), half = (4.6 + 1.25) / unit;
  const toScreen = (v: Vec) => ({x: 360 + (v.x * b.right.x + v.y * b.right.y + v.z * b.right.z) * unit, y: 215 - (v.x * b.up.x + v.y * b.up.y + v.z * b.up.z) * unit});
  const far = sheetFarFade(3, pitch, unit);
  const shown = sheetSigns(sheetSignRoots(12.5), toScreen, {x: -Math.sin(yaw), y: Math.cos(yaw)}, far, {inner: 1, outer: 2}, 17, half).filter(c => c.alpha > .02);
  const kept = apartOnScreen(shown, toScreen, SHEET_SIGN_GAP).map(c => toScreen(c.at));
  expect(kept.length).toBeGreaterThan(4);
  for (let i = 0; i < kept.length; i++) for (let j = i + 1; j < kept.length; j++) expect(Math.hypot(kept[i].x - kept[j].x, kept[i].y - kept[j].y)).toBeGreaterThanOrEqual(40);
 });
});

describe('the field\'s heads give way to the names', () => {
 const line = Array.from({length: 61}, (_, i) => ({x: 50 + i * 10, y: 200}));
 it('a head on a name slides along its line clear of it', () => {
  const bare = lineHeads(line, PLOT);
  expect(bare.length).toBe(3);
  const name: Box = {x: bare[1].x - 8, y: 190, width: 16, height: 20};
  const heads = lineHeads(line, PLOT, 180, 28, 6, [name]);
  expect(heads).toHaveLength(3);
  for (const h of heads) expect(meetsBoxes({x: h.x - h.dx * LINE_HEAD.length / 2, y: h.y}, {x: h.x + h.dx * LINE_HEAD.length / 2, y: h.y}, [name], LINE_HEAD.half)).toBe(false);
  // Not far: within a third of the spacing between heads.
  expect(Math.abs(heads[1].x - bare[1].x)).toBeLessThanOrEqual(60);
  // The others stay where they were.
  expect(heads[0].x).toBeCloseTo(bare[0].x, 9);
  expect(heads[2].x).toBeCloseTo(bare[2].x, 9);
 });
 it('with nowhere clear near it, a head is not drawn', () => {
  const heads = lineHeads(line, PLOT, 180, 28, 6, [{x: 40, y: 190, width: 640, height: 20}]);
  expect(heads).toHaveLength(0);
 });
 it('boxes: a segment through, beside and short of one; the gap from a point', () => {
  const box: Box = {x: 0, y: 0, width: 10, height: 10};
  expect(meetsBoxes({x: -5, y: 5}, {x: 15, y: 5}, [box])).toBe(true);
  expect(meetsBoxes({x: -5, y: 12}, {x: 15, y: 12}, [box])).toBe(false);
  expect(meetsBoxes({x: -5, y: 12}, {x: 15, y: 12}, [box], 3)).toBe(true);
  expect(meetsBoxes({x: -9, y: 5}, {x: -1, y: 5}, [box])).toBe(false);
  expect(boxGap({x: 5, y: 5}, [box])).toBe(0);
  expect(boxGap({x: 13, y: 14}, [box])).toBeCloseTo(5, 9);
  expect(boxGap({x: 13, y: 14}, [])).toBe(Infinity);
 });
});
