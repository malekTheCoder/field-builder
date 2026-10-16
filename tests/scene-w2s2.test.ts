import {describe, expect, it} from 'vitest';
import type {Vec} from '../src/symbolic/physics';
import {fieldLines, lineHeads, LINE_HEAD, HEAD_ROOM, refineEnds, seedPool, tipSeeds, traceLimit, type Box} from '../src/diagrams/fieldlines';
import {endlessAxis, joinCurve3, meridianLines, radialLines, RADIAL_SPOKES, seedOffset, spaceField, spaceLines, traceTo} from '../src/diagrams/field3d';
import {behindGap, BEHIND_GAP, gapDepth, gapRamp, gapStart, lineReach, NAME_MARGIN, PIECE_FAR_LOW, wireRadius} from '../src/diagrams/three/bodies';
import {cutPiece, cutShare, polylineLength} from '../src/diagrams/three/runScene';
import {coarsen, sampleDistribution} from '../src/diagrams/sampling';
import {bodyDistance, bodyFoot, PLOT} from '../src/diagrams/vectorfield';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';
/* THE SCENE LANE, WAVE 2, ITERATION 2: what the critics found, pinned where it can be without a GPU.
 *
 * The gap behind P had a ruled floor and a size in CSS pixels, so it cut the chosen washer into a U and a phone's
 * ring into an open C; the infinite line's 3D lines were strokes at scattered angles, not wheels; the closing
 * cuts of Shrink them read as a coil spring; the disk's lines were started off its face, so a small disk was two
 * jets; small rings and short rods started theirs far off the wire; no flat line left a rod near its axis, where
 * the axial lesson stands P; the 3D lines met a rod's ends at a corner; and the bounded charge past the flat
 * figure's span seeded no line at all. Each of these fails on the code before this change. */
const params = (over: Partial<Params> = {}): Params => ({...DEFAULT_PARAMS, ...over});
const UNBOUNDED = new Set<ProblemId>(['infinite', 'semi', 'sheet']);
/** ChargeDiagram's field partition, its 3D reach, and the flat figure's reach. */
const fieldSamples = (id: ProblemId, p: Params) => sampleDistribution(id, p, Math.max(p.slices, UNBOUNDED.has(id) ? 400 : 96));
const reachOf = (p: Params) => Math.round(Math.min(9, Math.max(3.5, p.size * 1.5)) * 2) / 2;
const flatReach = (p: Params) => Math.max(2.5, p.distance * 1.7, p.size);
const pointOf = (id: ProblemId, p: Params): Vec => id === 'axial' ? {x: p.size + p.distance, y: 0, z: 0} : ['ring', 'disk'].includes(id) ? {x: 0, y: 0, z: p.distance} : {x: p.distance, y: 0, z: 0};
const LEN = (v: Vec) => Math.hypot(v.x, v.y, v.z);
const deg = (a: Vec, b: Vec) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (LEN(a) * LEN(b))))) * 180 / Math.PI;
/** The scene's lines, as FieldStage builds them for a bounded charge. */
function scene(id: ProblemId, p: Params) {
 const reach = reachOf(p), source = fieldSamples(id, p), few = coarsen(source, 48), layout = id === 'disk' ? 'surface' as const : 'wire' as const;
 const span = Math.max(...few.map(c => LEN(c.position)), .5), pool = seedPool(few, 16, reach * .95, 10), away = bodyDistance(few, layout), P = pointOf(id, p);
 const drawn = lineReach(reach, away(P.x, P.y, P.z)), wr = wireRadius(reach);
 const lines = spaceLines(few, layout, pool.count, traceTo(few, layout, drawn, span, {seedLimit: reach * .95, seedPool: pool.pool, root: {inset: layout === 'wire' ? wr : 0}, twist: layout === 'wire', ...(layout === 'wire' ? {finish: {samples: source}} : {})}));
 return {lines, reach, few, source, wr};
}
/** The flat figure's lines, as FieldCanvas traces them for a rod. */
function flat(id: ProblemId, p: Params) {
 const reach = flatReach(p), samples = fieldSamples(id, p), coarse = coarsen(samples, 64);
 const chargeSpan = Math.max(...coarse.map(s => LEN(s.position)), 1), step = Math.min(reach, chargeSpan) * .05, limit = traceLimit(null, reach * 1.6);
 const pool = seedPool(coarse, 16, reach * .95, reach * 1.3);
 const lines = fieldLines(coarse, pool.count, {step, maxSteps: Math.min(1600, Math.max(420, Math.ceil(1.3 * limit / step))), outerLimit: limit, seedLimit: reach * .95, seedPool: pool.pool, root: bodyFoot(coarse, 'wire'), finish: {samples, step: step / 4}});
 return {lines, coarse};
}
const farEnd = <T extends {x: number; y: number}>(l: T[], from: {x: number; y: number}) => Math.hypot(l[0].x - from.x, l[0].y - from.y) > Math.hypot(l[l.length - 1].x - from.x, l[l.length - 1].y - from.y) ? l[0] : l[l.length - 1];

describe('the gap behind P comes in with depth, keeps the chosen piece, and is the figure\'s size', () => {
 it('in depth it is a ramp, not a step: no jump between neighbouring depths anywhere', () => {
  const ramp = .6;
  expect(gapDepth(-.1, ramp)).toBe(0);
  expect(gapDepth(0, ramp)).toBe(0);
  expect(gapDepth(ramp, ramp)).toBe(1);
  for (let b = 0; b < ramp; b += ramp / 200) expect(Math.abs(gapDepth(b + ramp / 200, ramp) - gapDepth(b, ramp))).toBeLessThan(.02);
  // Through the shader's curve: a surface point at the middle of the gap, stepped across the ramp's depth.
  for (let b = 0; b < ramp; b += ramp / 200) expect(Math.abs(behindGap(0, gapDepth(b + ramp / 200, ramp)) - behindGap(0, gapDepth(b, ramp)))).toBeLessThan(.02);
 });
 it('the chosen piece keeps PIECE_FAR_LOW of itself, a wire\'s too; everything else keeps a trace, a wire PIECE_FAR_LOW', () => {
  expect(behindGap(0, 1, false, BEHIND_GAP, PIECE_FAR_LOW)).toBeCloseTo(PIECE_FAR_LOW, 9);
  expect(behindGap(0, 1, true, BEHIND_GAP, PIECE_FAR_LOW)).toBeCloseTo(PIECE_FAR_LOW, 9);
  expect(behindGap(0, 1)).toBeCloseTo(BEHIND_GAP.low, 9);
  // A wire is dimmed, not cut: cut, a ring tipped up read as an open C (wave 6).
  expect(behindGap(0, 1, true)).toBe(PIECE_FAR_LOW);
  // A wire half behind is still whole; more than half, dimmed.
  expect(behindGap(0, .4, true)).toBe(1);
  expect(behindGap(0, .6, true)).toBe(PIECE_FAR_LOW);
  // Nothing at all in front of the gap's start.
  expect(behindGap(0, 0, false, BEHIND_GAP, PIECE_FAR_LOW)).toBe(1);
 });
 it('its ramp in depth is its outer radius in metres, and it starts twice the halo\'s reach behind P', () => {
  for (const unit of [30, 60, 120]) expect(gapRamp(1 / unit)).toBeCloseTo(BEHIND_GAP.outer / unit, 12);
  expect(gapStart(.05)).toBeCloseTo(2 * 4.2 * .05, 12);
 });
});

describe('the infinite line in space is drawn in wheels of spokes', () => {
 for (const distance of [.5, 3]) it(`d = ${distance}: stations of ${RADIAL_SPOKES} spokes sharing a root, sixty degrees apart, each wheel turned thirty from the last`, () => {
  const p = params({distance}), reach = reachOf(p), few = coarsen(fieldSamples('infinite', p), 144), window = 10, axis = endlessAxis(few, window)!;
  const pool = seedPool(few, 16, reach * .95, window), lines = radialLines(axis, pool.count, wireRadius(reach), reach * 1.4, 1);
  const stations = new Map<string, Vec[][]>();
  // Grouped by where along the wire each leaves it.
  const along = (v: Vec) => (v.x - axis.foot.x) * axis.dir.x + (v.y - axis.foot.y) * axis.dir.y + (v.z - axis.foot.z) * axis.dir.z;
  for (const l of lines) {const k = along(l[0]).toFixed(6); stations.set(k, [...(stations.get(k) ?? []), l]);}
  expect(stations.size).toBeGreaterThanOrEqual(3);
  // As many lines as asked for, to within a wheel: the density still says the field's strength.
  expect(Math.abs(lines.length - pool.count)).toBeLessThanOrEqual(RADIAL_SPOKES / 2);
  const offsets: number[] = [];
  for (const group of stations.values()) {
   expect(group.length).toBeGreaterThanOrEqual(5);
   // Square to the wire, and the azimuths round it evenly spaced.
   const az = group.map(l => {const d = {x: l[1].x - l[0].x, y: l[1].y - l[0].y, z: l[1].z - l[0].z}; return ((Math.atan2(d.z, d.x) * 180 / Math.PI) % 360 + 360) % 360;}).sort((a, b) => a - b);
   const gaps = az.map((a, i) => (i + 1 < az.length ? az[i + 1] : az[0] + 360) - a);
   for (const g of gaps) expect(Math.abs(g - 60)).toBeLessThan(1);
   offsets.push(az[0] % 60);
  }
  // Neighbouring wheels turned half a spoke from each other.
  for (let i = 1; i < offsets.length; i++) expect(Math.min(Math.abs(offsets[i] - offsets[i - 1]) % 60, 60 - Math.abs(offsets[i] - offsets[i - 1]) % 60)).toBeCloseTo(30, 6);
 });
});

describe('Shrink them: past forty pieces the cuts are seams, not a spring', () => {
 const straight = Array.from({length: 9}, (_, i) => ({x: i / 8, y: 0, z: 0}));
 it('each end gives up at most six hundredths of the piece past forty pieces, a fifth up to forty', () => {
  expect(cutShare(40)).toBe(.2);
  expect(cutShare(80)).toBe(.06);
  const [cut] = cutPiece(straight, 1, 1, 0, cutShare(80));
  expect(polylineLength(cut)).toBeCloseTo(1 - 2 * .06, 9);
  const [wide] = cutPiece(straight, 1, 1, 0, cutShare(40));
  expect(polylineLength(wide)).toBeCloseTo(1 - 2 * .2, 9);
 });
 it('the middle cut of forty pieces is already what the eighty pieces\' ends give up: no jump as it becomes a real cut', () => {
  const halves = cutPiece(straight, 0, 0, 1, cutShare(40), cutShare(80) / 2);
  expect(halves).toHaveLength(2);
  const gap = 1 - polylineLength(halves[0]) - polylineLength(halves[1]);
  // Each half of length one half gives up cutShare(80) of itself at the cut.
  expect(gap).toBeCloseTo(2 * cutShare(80) * .5, 9);
 });
});

describe('a surface\'s lines start on its face, so a small disk radiates all round', () => {
 /** Each line's far end, as a polar angle from the axis, folded onto one face. */
 const polar = (lines: Vec[][]) => lines.map(l => {const e = LEN(l[0]) > LEN(l[l.length - 1]) ? l[0] : l[l.length - 1]; return Math.acos(Math.abs(e.z) / LEN(e)) * 180 / Math.PI;});
 for (const [over, least] of [[{}, 78], [{size: 1, distance: 6}, 70]] as const) it(`3D ${JSON.stringify(over)}: the outermost line ends at least ${least} degrees from the axis, every line on the face`, {timeout: 30000}, () => {
  const p = params(over), {lines, few} = scene('disk', p), angles = polar(lines);
  expect(Math.max(...angles), angles.map(a => a.toFixed(0)).join(' ')).toBeGreaterThanOrEqual(least);
  const R = p.size / 2, onFace = (v: Vec) => Math.abs(v.z) < .02 && Math.hypot(v.x, v.y) <= R + .05;
  for (const l of lines) expect(onFace(l[0]) || onFace(l[l.length - 1])).toBe(true);
  void few;
 });
 it('at equal flux the default disk\'s lines end where cos theta = 1 - (s/R)^2 says, to within six degrees', {timeout: 30000}, () => {
  const {lines} = scene('disk', params()), angles = polar(lines).sort((a, b) => a - b), n = angles.length;
  angles.forEach((a, k) => expect(Math.abs(a - Math.acos(1 - (k + .5) / n) * 180 / Math.PI), angles.map(v => v.toFixed(0)).join(' ')).toBeLessThan(6));
 });
 it('flat side view, R = 0.5, z = 6: sixteen distinct lines, the outermost sixty degrees or more from the axis', {timeout: 30000}, () => {
  const p = params({size: 1, distance: 6}), reach = flatReach(p), coarse = coarsen(fieldSamples('disk', p), 64);
  const step = Math.min(reach, Math.max(...coarse.map(s => LEN(s.position)), 1)) * .05, limit = traceLimit(null, reach * 1.6);
  const lines = meridianLines(coarse, 'surface', 16, {step, maxSteps: 1600, outerLimit: limit, seedLimit: reach * .95, root: {}, seedSpan: reach * 1.9});
  const distinct = new Set(lines.map(l => l.map(v => `${v.x.toFixed(3)},${v.z.toFixed(3)}`).join(';'))).size;
  expect(lines.length).toBe(16);
  expect(distinct).toBe(16);
  const angles = lines.map(l => {const e = LEN(l[0]) > LEN(l[l.length - 1]) ? l[0] : l[l.length - 1]; return Math.acos(Math.abs(e.z) / LEN(e)) * 180 / Math.PI;});
  expect(Math.max(...angles)).toBeGreaterThanOrEqual(60);
 });
});

describe('a wire\'s lines start as near it as its own size calls for', () => {
 it('ring R = 0.5, z = 6: no more lines end near the axis than the ring at its default', {timeout: 30000}, () => {
  const within = (p: Params) => scene('ring', p).lines.filter(l => {const e = LEN(l[0]) > LEN(l[l.length - 1]) ? l[0] : l[l.length - 1]; return Math.acos(Math.abs(e.z) / LEN(e)) * 180 / Math.PI < 30;}).length;
  expect(within(params({size: 1, distance: 6}))).toBeLessThanOrEqual(3);
  expect(within(params())).toBeLessThanOrEqual(3);
 });
 for (const id of ['bisector', 'axial', 'endpoint'] as ProblemId[]) it(`${id}, L = 1: a line ends within thirty-five degrees of the rod's axis`, {timeout: 30000}, () => {
  const p = params({size: 1}), {lines} = scene(id, p);
  const axis = id === 'axial' ? {x: 1, y: 0, z: 0} : {x: 0, y: 1, z: 0}, mid = id === 'axial' ? {x: .5, y: 0, z: 0} : id === 'endpoint' ? {x: 0, y: .5, z: 0} : {x: 0, y: 0, z: 0};
  const cosines = lines.map(l => {const a = l[0], b = l[l.length - 1], e = LEN({x: a.x - mid.x, y: a.y - mid.y, z: a.z - mid.z}) > LEN({x: b.x - mid.x, y: b.y - mid.y, z: b.z - mid.z}) ? a : b, d = {x: e.x - mid.x, y: e.y - mid.y, z: e.z - mid.z}; return Math.abs(d.x * axis.x + d.y * axis.y + d.z * axis.z) / LEN(d);});
  expect(Math.max(...cosines)).toBeGreaterThanOrEqual(.82);
 });
 it('never inside the radius a line stops at', () => {
  const ring = coarsen(fieldSamples('ring', params({size: .2})), 48);
  expect(seedOffset(ring, 'wire', .3, .05, .05)).toBeGreaterThanOrEqual(1.25 * .05 - 1e-12);
 });
});

describe('the flat rod: lines leave its ends too, so the axis off each end is not bare', () => {
 const near = (lines: {x: number; y: number}[][], P: {x: number; y: number}) => {
  let best = Infinity;
  for (const l of lines) for (let i = 0; i + 1 < l.length; i++) {
   const a = l[i], b = l[i + 1], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 > 0 ? Math.max(0, Math.min(1, ((P.x - a.x) * dx + (P.y - a.y) * dy) / l2)) : 0;
   best = Math.min(best, Math.hypot(P.x - a.x - dx * t, P.y - a.y - dy * t));
  }
  return best;
 };
 for (const [over, most] of [[{}, 1], [{size: 8, distance: .5}, .5]] as const) it(`axial ${JSON.stringify(over)}: a line passes within ${most} m of P`, {timeout: 30000}, () => {
  const p = params(over), {lines} = flat('axial', p);
  expect(near(lines, {x: p.size + p.distance, y: 0})).toBeLessThan(most);
 });
 it('bisector: a line ends within twenty degrees of the rod\'s axis off each end', {timeout: 30000}, () => {
  const {lines} = flat('bisector', params()), ends = lines.map(l => farEnd(l, {x: 0, y: 0})).map(e => Math.atan2(e.x, e.y) * 180 / Math.PI);
  expect(Math.min(...ends.map(a => Math.abs(a)))).toBeLessThan(20);
  expect(Math.min(...ends.map(a => 180 - Math.abs(a)))).toBeLessThan(20);
 });
 it('the ramp: lines off its heavy end, none off its light end, where lambda is zero', () => {
  const coarse = coarsen(fieldSamples('ramp', params()), 64), seeds = tipSeeds(coarse, .2);
  expect(seeds).toHaveLength(2);
  // The heavy end is the one whose pieces carry the most charge.
  const heavy = Math.abs(coarse[0].dq) > Math.abs(coarse[coarse.length - 1].dq) ? coarse[0].position : coarse[coarse.length - 1].position;
  for (const s of seeds) expect(Math.hypot(s.x - heavy.x, s.y - heavy.y)).toBeLessThan(.5);
 });
 it('a uniform rod, even coarsened unevenly: lines off both ends; an arc or a line past the picture: none', () => {
  expect(tipSeeds(coarsen(fieldSamples('axial', params()), 64), .2)).toHaveLength(4);
  expect(tipSeeds(coarsen(fieldSamples('arc', params()), 64), .2)).toHaveLength(0);
  expect(tipSeeds(coarsen(fieldSamples('infinite', params()), 192), .2, 10)).toHaveLength(0);
 });
 for (const id of ['axial', 'bisector', 'ramp', 'endpoint'] as ProblemId[]) it(`${id}: no two lines cross, and every line is rooted on the rod`, {timeout: 30000}, () => {
  const p = params(), {lines, coarse} = flat(id, p), on = bodyDistance(coarse, 'wire');
  for (const l of lines) expect(Math.min(on(l[0].x, l[0].y, 0), on(l[l.length - 1].x, l[l.length - 1].y, 0))).toBeLessThan(.02);
  // Segments of different lines, both clear of the rod, never cross.
  const segs = lines.flatMap((l, k) => l.slice(1).map((b, i) => ({k, a: l[i], b}))).filter(s => on(s.a.x, s.a.y, 0) > .15 && on(s.b.x, s.b.y, 0) > .15);
  const crosses = (s: typeof segs[number], t: typeof segs[number]) => {
   const d = (p: {x: number; y: number}, q: {x: number; y: number}, r: {x: number; y: number}) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
   return d(s.a, s.b, t.a) * d(s.a, s.b, t.b) < 0 && d(t.a, t.b, s.a) * d(t.a, t.b, s.b) < 0;
  };
  let found = 0;
  for (let i = 0; i < segs.length && !found; i++) for (let j = i + 1; j < segs.length; j++) if (segs[i].k !== segs[j].k && crosses(segs[i], segs[j])) {found++; break;}
  expect(found).toBe(0);
 });
 it('a bounded charge a little past the span seeds along all of itself', () => {
  const coarse = coarsen(fieldSamples('axial', params({size: 8, distance: .5})), 64), far = Math.max(...coarse.map(s => LEN(s.position)));
  expect(seedPool(coarse, 16, 7.6, 10).pool).toBeGreaterThanOrEqual(far);
  // An endless line is still cut at the window.
  const line = coarsen(fieldSamples('infinite', params()), 192);
  expect(seedPool(line, 16, 5, 8).pool).toBe(8);
 });
});

describe('the 3D lines meet a rod\'s ends without a corner', () => {
 for (const id of ['axial', 'endpoint', 'ramp', 'bisector'] as ProblemId[]) it(`${id}: every chord of the join within six degrees of the field`, {timeout: 30000}, () => {
  const p = params(), {lines, reach, wr} = scene(id, p), fine = sampleDistribution(id, p, 4000), away = bodyDistance(fine, 'wire'), off: string[] = [];
  let joins = 0;
  for (const l of lines) for (const ends of [l, [...l].reverse()]) {
   if (away(ends[0].x, ends[0].y, ends[0].z) > wr * 1.5) continue;
   joins++;
   for (let i = 0; i + 1 < ends.length; i++) {
    const a = ends[i], b = ends[i + 1], m = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2};
    if (away(m.x, m.y, m.z) > .35) break;
    // Not on the tube itself, where the reference's own millimetre lumps are within reach.
    if (away(m.x, m.y, m.z) < wr * 1.2) continue;
    const e = spaceField(fine, m), d = {x: b.x - a.x, y: b.y - a.y, z: b.z - a.z};
    const angle = Math.min(deg(d, e), deg(d, {x: -e.x, y: -e.y, z: -e.z}));
    if (angle > 6) off.push(`${angle.toFixed(1)} at ${away(m.x, m.y, m.z).toFixed(3)}`);
   }
  }
  expect(joins).toBeGreaterThan(8);
  expect(off).toEqual([]);
  void reach;
 });
 it('the join ends on the tube, square to it', () => {
  const foot = (q: Vec): Vec => ({x: q.x, y: 0, z: 0});
  const curve = joinCurve3({x: 0, y: .3, z: .1}, {x: .1, y: .4, z: .12}, foot, .05);
  const last = curve[curve.length - 1], before = curve[curve.length - 2];
  expect(Math.hypot(last.y, last.z)).toBeCloseTo(.05, 9);
  const d = {x: last.x - before.x, y: last.y - before.y, z: last.z - before.z};
  // The last chord within a few degrees of square to the wire; the curve itself ends exactly square.
  expect(Math.abs(d.x) / LEN(d)).toBeLessThan(.1);
 });
 it('the ends of an open wire are cut finer, its charge kept; a ring is left as it is', () => {
  const rod = fieldSamples('axial', params()), fine = refineEnds(rod);
  expect(fine.length).toBeGreaterThan(rod.length);
  expect(fine.reduce((q, s) => q + s.dq, 0)).toBeCloseTo(rod.reduce((q, s) => q + s.dq, 0), 18);
  const ring = fieldSamples('ring', params());
  expect(refineEnds(ring)).toHaveLength(ring.length);
 });
});

describe('a line head gives way to one already laid', () => {
 it('two lines that run together on the screen carry no two heads closer than a head and a half', () => {
  const line = Array.from({length: 40}, (_, i) => ({x: PLOT.x + 40 + i * 12, y: PLOT.y + 200}));
  const twin = line.map(q => ({x: q.x, y: q.y + 2}));
  const placed: Box[] = [], room = HEAD_ROOM * LINE_HEAD.length, heads: {x: number; y: number}[] = [];
  for (const l of [line, twin]) for (const h of lineHeads(l, PLOT, 180, 28, 6, placed)) {placed.push({x: h.x - room / 2, y: h.y - room / 2, width: room, height: room}); heads.push(h);}
  expect(heads.length).toBeGreaterThan(2);
  for (let i = 0; i < heads.length; i++) for (let j = i + 1; j < heads.length; j++) expect(Math.hypot(heads[i].x - heads[j].x, heads[i].y - heads[j].y)).toBeGreaterThanOrEqual(1.5 * LINE_HEAD.length);
 });
 it('a sign mark keeps a margin of paper from a name', () => {
  expect(NAME_MARGIN).toBeGreaterThanOrEqual(5);
 });
});
