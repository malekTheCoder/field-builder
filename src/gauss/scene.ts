import {CUT, add, boundaries, carriesNothing, cross, dot, enclosedCharge, fieldAt, isBall, norm, patches, piecesOf, pointOn, scale, sub, throughPatch, unit, v3, type Charge, type Patch, type PatchPart, type Surface, type V3} from './physics';
import type {GaussCase} from './types';
import {projectPoint} from '../diagrams/three/orthoCamera';
import type {GaussStageKey} from './run';
/* WHAT THE GAUSS FIGURE DRAWS, WORKED OUT APART FROM DRAWING IT. The 3D scene (GaussScene) and the flat cross-section
 * (GaussFigure) draw the same things from here: the charge, the closed surface cut into patches in the order the run
 * takes them, each patch's field and outward normal from the exact field (physics.ts), the patches that carry
 * nothing, the point P where the field is wanted. Pure, so a unit test can hold every arrow to the physics. */

/** How much of each layer a moment of the run shows, each from 0 (none) to 1 (all). At rest, everything. */
export type Look = {stage: GaussStageKey | null; spokes: number; surface: number; sweep: number; enclosed: number; solve: number};
export const REST: Look = {stage: null, spokes: 0, surface: 1, sweep: 1, enclosed: 1, solve: 1};
/** What each stage draws: the field's shape before any surface (Symmetry), the surface arriving (The surface),
 * its patches taken one by one with what each carries (Left side), the charge inside lit (Right side), and the
 * field at P (Solve). Each stage keeps what the stages before it built. */
export function lookAt(m: {key: GaussStageKey; progress: number} | null): Look {
  if (!m) return REST;
  const p = m.progress;
  switch (m.key) {
    case 'symmetry': return {stage: 'symmetry', spokes: p, surface: 0, sweep: 0, enclosed: 0, solve: 0};
    case 'surface': return {stage: 'surface', spokes: 1 - p, surface: p, sweep: 0, enclosed: 0, solve: 0};
    case 'left': return {stage: 'left', spokes: 0, surface: 1, sweep: p, enclosed: 0, solve: 0};
    case 'right': return {stage: 'right', spokes: 0, surface: 1, sweep: 1, enclosed: p, solve: 0};
    case 'solve': return {stage: 'solve', spokes: 0, surface: 1, sweep: 1, enclosed: 1, solve: p};
  }
}

/** A point charge's disc, in the figure's pixels: large enough to carry its sign. The scene draws it the same size. */
export const POINT_PX = 10.5;
/** A patch as the figure draws it: whether it carries nothing, and E·n̂ at its centre (signed). */
export type DrawnPatch = Patch & {zero: boolean; through: number; field: V3;
  /** How long its field arrow is drawn, in world units: `arrowSpan`. */
  span: number;
  /** Whether the arrow is laid with its tip on the patch, its tail outside (`arrowPlace`), rather than its tail on it. */
  back?: boolean;
  /** Which piece of a superposition the patch's surface is round, and whose field it carries: 0 the whole charge,
   * 1 the plug. Absent for a charge with no hole. */
  piece?: number};
/** A piece of the cross-section's outline, in the plane y = 0 that holds the axis: from `a` to `b` (x, z). */
export type Seg = {key: string; part: PatchPart; a: [number, number]; b: [number, number]; mid: V3; normal: V3; field: V3; zero: boolean; through: number; arc?: number;
  /** The centre of an arc's circle, when it is not the origin. */
  about?: V3;
  /** How long its field arrow is drawn, once a case is known (`build`), and whether its tip is on the segment. */
  span?: number; back?: boolean;
  /** Which piece of a superposition it belongs to, as a patch's `piece`. */
  piece?: number};
/** One piece of a superposition, solved alone: the whole charge, or the plug of the opposite sign filling its hole.
 * Its surface is round its own centre and passes through P (none for a plug Gauss's law cannot solve, a sheet's
 * disc); its field at P is one of the two the answer adds. */
export type Piece = {charge: Charge; surface: Surface | null; enclosed: number; fieldAtP: V3; spanAtP: number};
/** A field arrow in space away from any surface, for the Symmetry stage: from `at`, along `field`, `span` long. */
export type Spoke = {at: V3; field: V3; span?: number; back?: boolean};

export type Built = {
  charge: Charge;
  surface: Surface;
  /** In the run's order: the patches that carry flux first, the ones that carry nothing last. */
  patches: DrawnPatch[];
  slice: Seg[];
  spokes: Spoke[]; flatSpokes: Spoke[];
  /** The point where the field is wanted, on the surface, its outward normal, and the field there. */
  P: V3; normalAtP: V3; fieldAtP: V3; spanAtP: number;
  /** Whether the answer's arrow ends at P (a field pointing in through the surface) rather than starting there. */
  backAtP: boolean;
  /** Whether some patch's arrow had no room for its length on either side and is drawn shorter than its field. */
  shortened: boolean;
  /** Whether the run ends on the field at P. Not for a charge off the sphere's centre: there the answer is a flux,
   * and the field on the sphere is not the same from patch to patch, so no one arrow could stand for it. */
  answerAtP: boolean;
  /** P marked, with no answer at it: where the text asks what the field there is and the law cannot say. */
  markP?: boolean;
  /** A neighbouring patch whose normal is named dA, and a patch that carries nothing, for the labels. */
  namedPatch: DrawnPatch; zeroPatch: DrawnPatch | null;
  /** Half the world's extent the figure fits, and the pixels per world unit that fit it in 720 by 430. */
  half: number; unit: number;
  /** For a charge with a hole: the whole charge and the plug, each solved round its own surface. The patches and the
   * slice then hold both surfaces' (each marked with its `piece`), carrying each piece's own field; the field at P
   * is the real one, the two added. */
  pieces?: Piece[];
};

/** The surface a case draws at a slider value: a sphere or a cylinder takes the size as its radius, a pillbox
 * as its face height. */
export function surfaceOf(c: GaussCase, size: number): Surface {
  const s = c.figure.surface;
  return s.kind === 'pillbox' ? {kind: 'pillbox', r: s.other, h: size, ...(s.low !== undefined ? {low: s.low} : {})} : s.kind === 'cube' ? {kind: 'cube', r: size, h: size} : {kind: s.kind, r: size, h: s.other};
}
export const chargeOf = (c: GaussCase, sign: 1 | -1): Charge => ({kind: c.figure.charge.kind, sign, size: c.figure.charge.size, ...(c.figure.charge.outer ? {outer: c.figure.charge.outer} : {}),
  ...(c.figure.charge.hole ? {hole: c.figure.charge.hole} : {}), ...(c.figure.charge.amount ? {amount: c.figure.charge.amount} : {}), ...(c.figure.charge.at ? {at: c.figure.charge.at} : {})});
/** Whether the run solves for the field at P: not for a charge off a sphere's centre, a finite rod, or a cube round a
 * charge, where no surface has the field the same all over it and the run ends on the flux. */
export const answersAtP = (c: Charge, g: Surface) => c.kind !== 'offset' && c.kind !== 'segment' && g.kind !== 'cube';
/** The plug's own surface through P: a sphere about the ball's hole, a cylinder about the rod's; none for a sheet's
 * disc, whose field on its axis comes from adding its rings. */
export function plugSurface(charge: Charge, first: Surface, P: V3): Surface | null {
  const h = charge.hole;
  if (!h) return null;
  if (charge.kind === 'ballhole') return {kind: 'sphere', r: norm(sub(P, h.at)), h: 0, center: h.at};
  if (charge.kind === 'rodhole') return {kind: 'cylinder', r: Math.hypot(P.x - h.at.x, P.y - h.at.y), h: first.h, center: v3(h.at.x, h.at.y, 0)};
  return null;
}

/** The world's half-extent for a case: its largest surface, with room for the arrows standing off it. */
export function halfOf(c: GaussCase): number {
  // The largest surface, or the charge's outermost face if that reaches farther (a capacitor's far plate), or a
  // charge off the centre, outside the largest sphere, kept in the frame with its arrows round it.
  const s = c.figure.surface, big = Math.max(s.size.max, ...boundaries(c.figure.charge), c.figure.charge.hole && c.figure.charge.kind !== 'sheethole' ? c.figure.charge.size : 0);
  if (s.kind === 'sphere') return Math.max(big, c.figure.charge.kind === 'offset' ? c.figure.charge.size + .5 : 0) + .55;
  if (s.kind === 'cylinder') return Math.hypot(big + .5, s.other + .2);
  // A cube: its corners stand out to √3 times its half-width, which the turned view can show.
  if (s.kind === 'cube') return big * 1.5 + .35;
  return Math.hypot(s.other + .4, Math.max(big, Math.abs(s.low ?? 0)) + .55);
}
/** The view each case opens at, and the flat cross-section's: the two views the figure is fitted to. */
export const openingView = (c: GaussCase) => c.figure.surface.kind === 'pillbox' ? {yaw: -.5, pitch: .3} : {yaw: -.5, pitch: .34};
/** Where the figure's origin sits in its 720 by 430 frame. */
export const FIGURE_ORIGIN = {x: 360, y: 222};
const UNITS = new WeakMap<GaussCase, number>();
/** PIXELS PER WORLD UNIT: THE FIGURE FITTED TO WHAT IT DRAWS. It was fitted to a sphere round the largest surface
 * with a margin for arrows any length, which left a ball at its opening size a third of its card. Now the case is
 * drawn, both signs, at sizes across the slider's whole reach, and every point of it (the surface's corners, every
 * arrow's two ends, the spokes, P and the answer's arrow, the charge's own edges) is projected at the opening view and
 * in the cross-section: the scale is the largest at which all of it stays inside the frame, less a margin for the
 * names. Fixed per case, so dragging the surface never rescales the picture, and an arrow's length keeps meaning the
 * field's size on one scale; never smaller than the old fit. */
export function unitOf(c: GaussCase): number {
  const known = UNITS.get(c);
  if (known) return known;
  const old = Math.round(.92 * 430 / (2 * halfOf(c))), s = c.figure.surface.size, views = [openingView(c), {yaw: 0, pitch: 0}];
  let up = 1e-6, down = 1e-6, side = 1e-6;
  const see = (p: V3) => { for (const v of views) { const q = projectPoint(p, {x: 0, y: 0}, 1, v.yaw, v.pitch); up = Math.max(up, -q.y); down = Math.max(down, q.y); side = Math.max(side, Math.abs(q.x)); } };
  const ends = (at: V3, field: V3, span: number | undefined, back?: boolean) => { if (!(span! > 0) || !(norm(field) > 1e-12)) return; const e = arrowEnds(at, field, span!, back); see(e.from); see(e.to); };
  for (let k = 0; k <= 6; k++) for (const sign of [1, -1] as const) {
    const b = build(c, s.min + (s.max - s.min) * k / 6, sign, 1);
    for (const p of b.patches) { for (const q of p.corners) see(q); ends(p.center, p.field, p.span, p.back); }
    for (const sp of b.spokes) ends(sp.at, sp.field, sp.span, sp.back);
    see(b.P); if (b.answerAtP) ends(b.P, b.fieldAtP, b.spanAtP, b.backAtP);
    for (const link of chainOf(b)) { see(link.from); see(add(link.from, scale(link.dir, link.length))); }
  }
  // A finite charge's own edge: a ball's, a hollow's metal, a finite rod's ends.
  const ch = c.figure.charge, edge = Math.max(0, ...boundaries(ch).map(Math.abs), ch.kind === 'ballhole' || ch.kind === 'segment' ? ch.size : 0);
  if (ch.kind !== 'line' && ch.kind !== 'sheet' && ch.kind !== 'slab' && ch.kind !== 'tent' && ch.kind !== 'oddslab' && ch.kind !== 'rod' && ch.kind !== 'tube' && ch.kind !== 'coax' && ch.kind !== 'rodhole' && ch.kind !== 'face' && ch.kind !== 'plates' && ch.kind !== 'sheethole' && ch.kind !== 'halo') { up = Math.max(up, edge); down = Math.max(down, edge); side = Math.max(side, edge); }
  const fit = Math.min((FIGURE_ORIGIN.y - 14) / up, (430 - FIGURE_ORIGIN.y - 14) / down, (360 - 40) / side);
  const unit = Math.max(old, Math.round(Math.min(fit, old * 1.9)));
  UNITS.set(c, unit);
  return unit;
}

/** The size an arrow is drawn at, in world units, for a field of magnitude `e`: in proportion to the field,
 * on a scale fixed by the field on the crossed part of the case's opening surface, so dragging the surface out
 * shrinks the arrows as the field falls (and leaves them alone where it does not, on a sheet). At the smallest sizes of a
 * steep field (the point charge's 1/r²) a cap holds the longest arrows to the figure: proportional all the way there,
 * they shrank to stubs at the opening size, the one a reader meets first. */
export function arrowLength(c: GaussCase, e: number): number {
  // A charge off a sphere's centre makes a field on it that differs too much from patch to patch for one scale (the
  // patches facing a charge just outside see it some sixteen times stronger than the far ones): there an arrow is
  // drawn to the square root of the field, still longer where the field is stronger, the nearest patch of the opening
  // sphere at the longest length.
  const k = c.figure.charge;
  if (k.kind === 'offset') {
    const near = 1 / (k.size - c.figure.surface.size.initial) ** 2;
    return Math.max(.06, rollOff(1.05 * Math.sqrt(Math.abs(e) / near)));
  }
  // A lesson may fix the scale for all its cases, so equal fields are drawn equal; otherwise the opening
  // surface's field, or where it sees none (inside a shell, in metal), the field the slider first reaches from
  // its outer end.
  const ref = scaleOf(c);
  if (!(ref > 0)) return 0;
  return Math.max(.06, rollOff(.62 * Math.abs(e) / ref));
}
/** The longest an arrow is drawn, and where it starts to bend toward it. Below the knee a length is in proportion
 * to the field; above it the length still grows with the field, ever more slowly, and never reaches the longest. A
 * hard cap held every arrow near a point charge at one length while the sphere was dragged in, which read as a field
 * that stops growing. */
export const LONGEST = 1.6, KNEE = 1;
const rollOff = (x: number) => x <= KNEE ? x : KNEE + (LONGEST - KNEE) * Math.tanh((x - KNEE) / (LONGEST - KNEE));
/** The field a case draws at the standard arrow length (`arrowLength`). */
function scaleOf(c: GaussCase): number {
  const at = (size: number) => { const ch = chargeOf(c, 1), P = pointOn(surfaceOf(c, size), ch); return Math.abs(dot(fieldAt(ch, P.at), P.normal)); };
  const s = c.figure.surface.size;
  let ref = c.figure.reference ?? at(s.initial);
  for (let k = 0; !(ref > 0) && k <= 40; k++) ref = at(s.max - (s.max - s.min) * k / 40);
  return ref;
}
/** Where the field changes a lot over the surface and nothing is solved at P (a finite rod's, a charge in a cube's),
 * its arrows are its whole message: so every patch's arrow is drawn on one linear scale for the frame, shrunk
 * together until none is held to the longest length and none reaches past where the field turns round. */
const fitsFrame = (c: Charge) => c.kind === 'segment' || (c.kind === 'point' && !!c.at);

/** Where an arrow of the field `field` at `at` is laid, and how long: its length by the scale, `k` times, from `at`
 * along the field (its tail there), or ending at `at` (its tip there, `back`). It goes on the side `outward` points to
 * (a patch's outer side; for an arrow in space, the side a positive charge's field points to), so an arrow of a field
 * pointing in through a surface ends on it, its tail outside, at its full length: the same place and length for either
 * sign. Only when that side has no room (a conductor's metal, outside a cable, past a capacitor's far plate, past the
 * charge) is it laid on the other; and only when neither has room is it cut short. An arrow drawn across metal would
 * show a field where the lesson says there is none, and one cut short for a negative charge alone would draw its field
 * weaker than the same positive charge's. */
export function arrowPlace(c: GaussCase, charge: Charge, at: V3, field: V3, k = 1, outward?: V3): {span: number; back: boolean} {
  const want = arrowLength(c, norm(field)) * k, d = unit(field);
  if (!(norm(field) > 1e-12) || !(want > 0)) return {span: 0, back: false};
  const n = 64;
  // How much of the arrow fits on one side: forward from `at` (1), or back from it (−1), before the field there stops
  // or turns against the arrow.
  const room = (side: 1 | -1) => {
    for (let i = 1; i <= n; i++) {
      const e = fieldAt(charge, add(at, scale(d, side * want * i / n)));
      if (norm(e) < 1e-12 || dot(e, d) <= 0) return want * (i - 1) / n * .92;
    }
    return want;
  };
  // A field along the surface (a patch that carries nothing) has no outer side: it goes where a positive charge's would.
  const hint = outward && Math.abs(dot(d, outward)) > 1e-9 ? outward : fieldAt({...charge, sign: 1}, at);
  const first: 1 | -1 = dot(d, hint) < 0 ? -1 : 1, a = room(first);
  if (a >= want) return {span: want, back: first < 0};
  const b = room(-first as 1 | -1);
  if (b >= want) return {span: want, back: first > 0};
  return a >= b ? {span: a, back: first < 0} : {span: b, back: first > 0};
}
/** How long the arrow of the field `field` at `at` is drawn (`arrowPlace`). */
export const arrowSpan = (c: GaussCase, charge: Charge, at: V3, field: V3, k = 1, outward?: V3) => arrowPlace(c, charge, at, field, k, outward).span;
/** An arrow's two ends, as `arrowPlace` lays it: its tail and its tip. */
export function arrowEnds(at: V3, field: V3, span: number, back = false): {from: V3; to: V3} {
  const d = scale(unit(field), span);
  return back ? {from: sub(at, d), to: at} : {from: at, to: add(at, d)};
}

/** The cross-section through the axis, cut as the figure cuts the surface. */
export function slice(charge: Charge, g: Surface, fine: {around?: number; across?: number} = {}): Seg[] {
  const out: Seg[] = [];
  // A surface round a plug sits off the origin, its centre in the cut's plane: the cut is the same, moved there.
  const o = g.center ?? v3(0, 0, 0);
  const seg = (key: string, part: PatchPart, a0: [number, number], b0: [number, number], mid0: V3, normal: V3, arc?: number) => {
    const a: [number, number] = [a0[0] + o.x, a0[1] + o.z], b: [number, number] = [b0[0] + o.x, b0[1] + o.z], mid = add(mid0, v3(o.x, 0, o.z));
    const field = fieldAt(charge, mid), through = dot(field, normal), m = norm(field);
    out.push({key, part, a, b, mid, normal, field, through, zero: m < 1e-12 || Math.abs(through) < 1e-9 * m, ...(arc ? {arc} : {}), ...(g.center ? {about: v3(o.x, 0, o.z)} : {})});
  };
  if (g.kind === 'cube') {
    // The square the cube cuts in the plane y = 0: its east and west faces, its top and bottom.
    const h = g.h, n = 3;
    for (const [part, x] of [['east', h], ['west', -h]] as const) for (let i = 0; i < n; i++) {
      const z0 = -h + 2 * h * i / n, z1 = -h + 2 * h * (i + 1) / n;
      seg(`${part}-${i}`, part, [x, z0], [x, z1], v3(x, 0, (z0 + z1) / 2), v3(Math.sign(x), 0, 0));
    }
    for (const [part, z] of [['top', h], ['bottom', -h]] as const) for (let i = 0; i < n; i++) {
      const x0 = -h + 2 * h * i / n, x1 = -h + 2 * h * (i + 1) / n;
      seg(`${part}-${i}`, part, [x0, z], [x1, z], v3((x0 + x1) / 2, 0, z), v3(0, 0, Math.sign(z)));
    }
    return out.sort((a, b) => Number(a.zero) - Number(b.zero));
  }
  if (g.kind === 'sphere') {
    const n = fine.around ?? 16, r = g.r;
    for (let i = 0; i < n; i++) {
      const t0 = 2 * Math.PI * i / n, t1 = 2 * Math.PI * (i + 1) / n, tm = (t0 + t1) / 2;
      seg(`s${i}`, 'sphere', [r * Math.sin(t0), r * Math.cos(t0)], [r * Math.sin(t1), r * Math.cos(t1)], v3(r * Math.sin(tm), 0, r * Math.cos(tm)), v3(Math.sin(tm), 0, Math.cos(tm)), r);
    }
    return out;
  }
  const {r, h} = g, lo = g.low ?? -h, bands = g.kind === 'cylinder' ? 3 : 2, across = fine.across ?? (g.kind === 'cylinder' ? 2 : 3);
  for (const side of [1, -1]) for (let i = 0; i < bands; i++) {
    const z0 = lo + (h - lo) * i / bands, z1 = lo + (h - lo) * (i + 1) / bands;
    seg(`w${side}-${i}`, 'wall', [side * r, z0], [side * r, z1], v3(side * r, 0, (z0 + z1) / 2), v3(side, 0, 0));
  }
  for (const [part, z] of [['top', h], ['bottom', lo]] as const) for (let i = 0; i < across; i++) {
    const x0 = -r + 2 * r * i / across, x1 = -r + 2 * r * (i + 1) / across;
    seg(`${part}-${i}`, part, [x0, z], [x1, z], v3((x0 + x1) / 2, 0, z), v3(0, 0, part === 'top' ? 1 : -1));
  }
  return out.sort((a, b) => Number(a.zero) - Number(b.zero));
}

/** Arrows of the field in space round the charge, before any surface is drawn: the shape symmetry forces. */
export function spokes(charge: Charge): Spoke[] {
  const out: Spoke[] = [];
  // A point charge off the centre has its spokes round its own place.
  const o = offOf(charge), add = (p: V3) => { const at = v3(p.x + o.x, p.y + o.y, p.z + o.z); out.push({at, field: fieldAt(charge, at)}); };
  const round = roundness(charge);
  if (round) {
    // Directions spread evenly over the sphere (a Fibonacci lattice), at a radius just clear of the charge, and
    // inside a cavity as well as outside the metal round it.
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (const [rho, n] of round) for (let i = 0; i < n; i++) { const z = 1 - 2 * (i + .5) / n, s = Math.sqrt(1 - z * z), a = i * golden; add(v3(rho * s * Math.cos(a), rho * s * Math.sin(a), lift(charge) + rho * z)); }
  } else if (axialKind(charge)) {
    const rho = axialSpoke(charge);
    for (const z of [-.9, 0, .9]) for (let j = 0; j < 8; j++) { const a = 2 * Math.PI * (j + .5) / 8; add(v3(rho * Math.cos(a), rho * Math.sin(a), z)); }
    // A finite rod's field on its axis beyond its ends, straight along it.
    if (charge.kind === 'segment') for (const z of [charge.size + .35, -charge.size - .35]) add(v3(0, 0, z));
  } else {
    for (const x of [-1.2, 0, 1.2]) for (const y of [-1.2, 0, 1.2]) for (const z of planeSpokes(charge)) add(v3(x, y, z));
  }
  // In a ball's or a rod's hole too: the field there is what the lesson finds.
  for (const at of holeSpokes(charge, false)) add(at);
  return out;
}
const axialKind = (c: Charge) => c.kind === 'line' || c.kind === 'rod' || c.kind === 'tube' || c.kind === 'coax' || c.kind === 'rodhole' || c.kind === 'segment';
/** Where a point charge off the centre sits (a cube's), for its spokes. */
const offOf = (c: Charge) => c.kind === 'point' && c.at ? c.at : v3(0, 0, 0);
/** A few points in a ball's or a rod's hole, round its centre, for the Symmetry stage's arrows: in the cut's plane
 * for the cross-section, or about the hole in space. */
function holeSpokes(c: Charge, flat: boolean): V3[] {
  const h = c.hole;
  if (!h || (c.kind !== 'ballhole' && c.kind !== 'rodhole')) return [];
  const r = h.radius * .5, n = flat ? 4 : 6;
  return Array.from({length: n}, (_, i) => {
    const t = 2 * Math.PI * (i + .5) / n;
    if (flat) return v3(h.at.x + r * Math.cos(t), 0, (c.kind === 'ballhole' ? h.at.z : 0) + r * Math.sin(t));
    return c.kind === 'ballhole' ? add(h.at, v3(r * Math.cos(t), r * Math.sin(t) * .6, r * Math.sin(t) * .8)) : v3(h.at.x + r * Math.cos(t), h.at.y + r * Math.sin(t), (i % 3 - 1) * .9);
  });
}
/** The radii a round charge's spokes stand at, and how many at each: just clear of the charge, and for a charge in
 * a hollow, in the hollow too. Nothing for a charge that is not round. */
function roundness(c: Charge): [number, number][] | null {
  // Round a charge off the centre, at its own place (`lift`).
  if (c.kind === 'offset') return [[.9, 22]];
  if (c.kind === 'cavity') return [[c.size * .55, 10], [(c.outer ?? c.size * 2) + .35, 22]];
  if (c.kind === 'point' && c.at) return [[.55, 22]];
  if (c.kind === 'point' || isBall(c.kind) || c.kind === 'shell' || c.kind === 'metal') return [[Math.max(c.size * 1.18, .55) + .35, 22]];
  if (c.kind === 'ballhole') return [[c.size + .35, 22]];
  if (c.kind === 'cusp') return [[c.size + .35, 22]];
  if (c.kind === 'halo') return [[.75, 14], [1.6, 22]];
  return null;
}
/** The radius a cylinder's spokes stand at: where its field is, clear of it (between a coaxial pair's shells). */
const axialSpoke = (c: Charge) => c.kind === 'coax' ? (c.size + (c.outer ?? c.size * 2)) / 2 : c.kind === 'line' || c.kind === 'segment' ? .62 : c.size + (c.kind === 'rodhole' ? .3 : .45);
/** The heights a flat charge's spokes stand at: either side of a sheet or a slab, only above a conductor's face,
 * only between a capacitor's plates. */
/** How far up the axis a round charge's spokes are centred: a charge off the centre's own height. */
const lift = (c: Charge) => c.kind === 'offset' ? c.size : 0;
const planeSpokes = (c: Charge) => c.kind === 'face' ? [.42] : c.kind === 'plates' ? [-c.size / 2] : c.kind === 'slab' || c.kind === 'tent' ? [c.size + .3, -c.size - .3] : c.kind === 'oddslab' ? [c.size * .5, 0, -c.size * .5] : [.42, -.42];

/** The same arrows in the cross-section's plane, y = 0, for the flat figure. */
export function flatSpokes(charge: Charge): Spoke[] {
  const out: Spoke[] = [];
  const o = offOf(charge), add = (x: number, z: number) => { const at = v3(x + o.x, 0, z + o.z); out.push({at, field: fieldAt(charge, at)}); };
  const round = roundness(charge);
  if (round) {
    for (const [rho, n] of round) { const m = Math.max(8, Math.round(n * 12 / 22)); for (let i = 0; i < m; i++) { const a = 2 * Math.PI * (i + .5) / m; add(rho * Math.sin(a), lift(charge) + rho * Math.cos(a)); } }
  } else if (axialKind(charge)) {
    const rho = axialSpoke(charge);
    for (const z of [-.9, 0, .9]) for (const x of [-rho, rho]) add(x, z);
    if (charge.kind === 'segment') for (const z of [charge.size + .35, -charge.size - .35]) add(0, z);
  } else {
    for (const x of [-1.6, -.8, 0, .8, 1.6]) for (const z of planeSpokes(charge)) add(x, z);
  }
  for (const at of holeSpokes(charge, true)) add(at.x, at.z);
  return out;
}

export function build(c: GaussCase, size: number, sign: 1 | -1, fixedUnit?: number): Built {
  const charge = chargeOf(c, sign), surface = surfaceOf(c, size);
  const on = pointOn(surface, charge), P = on.at, normalAtP = on.normal, fieldAtP = fieldAt(charge, P);
  // A charge with a hole is solved as its two pieces, each round its own surface through P, each surface's patches
  // carrying that piece's field alone: the whole charge's, then the plug's.
  const parts = piecesOf(charge);
  const solved: {charge: Charge; surface: Surface | null}[] = parts ? [{charge: parts[0], surface}, {charge: parts[1], surface: plugSurface(charge, surface, P)}] : [{charge, surface}];
  const drawn: DrawnPatch[] = solved.flatMap(({charge: q, surface: g}, i) => g ? patches(g, i === 0 && c.figure.surface.cut ? c.figure.surface.cut : CUT[g.kind]).map(p => {
    const field = fieldAt(q, p.center);
    return {...p, zero: carriesNothing(q, p), through: throughPatch(q, p), field, ...arrowPlace(c, q, p.center, field, 1, p.normal), ...(parts ? {piece: i, key: `${i}${p.key}`} : {})};
  }) : []);
  // Those that carry flux first, in the order they were cut; the ones that carry nothing after them, so the run
  // ends the left side on the parts it adds nothing for, and lights them as zero last.
  drawn.sort((a, b) => Number(a.zero) - Number(b.zero));
  const pieces: Piece[] | undefined = parts ? solved.map(({charge: q, surface: g}) => {
    const e = fieldAt(q, P);
    return {charge: q, surface: g, enclosed: g ? enclosedCharge(q, g) : 0, fieldAtP: e, spanAtP: arrowLength(c, norm(e))};
  }) : undefined;
  const cut = solved.flatMap(({charge: q, surface: g}, i) => g ? slice(q, g, parts ? {around: i ? 8 : 16, across: 2} : {}).map(s => ({...s, ...arrowPlace(c, q, s.mid, s.field, 1, s.normal), ...(parts ? {piece: i, key: `${i}${s.key}`} : {})})) : [])
    .sort((a, b) => Number(a.zero) - Number(b.zero));
  // The dA named on the figure: a crossed patch a little round from P, so its arrow and P's do not lie on each other.
  const towards = surface.kind === 'pillbox' ? (charge.kind === 'plates' ? v3(.9 * surface.r, -.3 * surface.r, -surface.h) : v3(-.5 * surface.r, -.5 * surface.r, surface.h)) : surface.kind === 'cylinder' ? v3(-surface.r * .45, -surface.r * .9, surface.h * .5) : v3(-surface.r * .35, -surface.r * .55, surface.r * .76);
  // Named on the slider's own surface: the whole charge's, for a charge with a hole.
  const own = drawn.filter(p => !p.piece), crossed = own.filter(p => !p.zero), pool = crossed.length ? crossed : own;
  const namedPatch = pool.reduce((best, p) => norm(sub(p.center, towards)) < norm(sub(best.center, towards)) ? p : best, pool[0]);
  const zeros = own.filter(p => p.zero);
  // The patch that carries nothing named on the figure: the one that faces the opening camera most squarely.
  const facing = v3(-.42, -.78, .45);
  const zeroPatch = zeros.length ? zeros.reduce((best, p) => dot(p.normal, facing) > dot(best.normal, facing) ? p : best, zeros[0]) : null;
  if (fitsFrame(charge)) {
    const ref = scaleOf(c), raw = (e: V3) => .62 * norm(e) / ref, all = [...drawn.map(p => ({span: p.span, field: p.field})), ...cut.map(s => ({span: s.span, field: s.field}))];
    const fit = Math.min(1, ...all.filter(a => raw(a.field) > 1e-12).map(a => a.span / raw(a.field)));
    for (const p of drawn) p.span = raw(p.field) * fit;
    for (const s of cut) s.span = raw(s.field) * fit;
  }
  const shortened = !fitsFrame(charge) && [...drawn.map(p => [p.span, p.field] as const), ...cut.map(s => [s.span ?? 0, s.field] as const)].some(([span, e]) => norm(e) > 1e-12 && span < arrowLength(c, norm(e)) - 1e-9);
  // The spokes are drawn from their anchors, a little shorter than the patches' arrows, and never into metal.
  const spoked = (list: Spoke[]) => list.map(s => ({...s, ...arrowPlace(c, charge, s.at, s.field, .85)}));
  const atP = parts ? {span: arrowLength(c, norm(fieldAtP)), back: false} : arrowPlace(c, charge, P, fieldAtP, 1, normalAtP);
  return {charge, surface, patches: drawn, slice: cut, spokes: spoked(spokes(charge)), flatSpokes: spoked(flatSpokes(charge)),
    P, normalAtP, fieldAtP, spanAtP: atP.span, backAtP: atP.back, shortened, answerAtP: answersAtP(charge, surface), markP: charge.kind === 'segment', namedPatch, zeroPatch, half: halfOf(c), unit: fixedUnit ?? unitOf(c), ...(pieces ? {pieces} : {})};
}
/** The surface a patch or a segment lies on: the slider's, or the plug's. */
export const surfaceOfPiece = (b: Built, piece?: number): Surface => (piece ? b.pieces?.[piece]?.surface : null) ?? b.surface;
/** The direction an arrow of field `e` is drawn in, and its length, for a case: unit and world units. */
export const arrowOf = (c: GaussCase, e: V3) => ({dir: unit(e), length: arrowLength(c, norm(e))});
/** Every patch carries E·n̂ dA; the sum is the flux, for the tests to hold against Q_enc/ε₀. */
export const drawnFlux = (b: Built) => b.patches.reduce((t, p) => t + p.through * p.area, 0);
/** A superposition's two fields at P as the figure draws them, tip to tail on the answer's scale: the whole charge's
 * from P, the plug's from its tip, adding to the answer's arrow. Where the two lie along one line (on a sheet's axis)
 * each is stepped a little to the side, so the second does not run back over the first and both stay readable. */
export function chainOf(b: Built): {from: V3; dir: V3; length: number}[] {
  const pieces = b.pieces ?? [];
  if (!pieces.length) return [];
  const dirs = pieces.map(p => unit(p.fieldAtP)), along = pieces.every(p => norm(p.fieldAtP) > 1e-12) && norm(cross(dirs[0], dirs[1])) < 1e-6;
  const side = along ? scale(unit(v3(dirs[0].z, 0, -dirs[0].x)), .1) : v3(0, 0, 0);
  let tip = b.P;
  return pieces.map((p, i) => { const from = add(tip, side); tip = add(from, scale(dirs[i], p.spanAtP)); return {from, dir: dirs[i], length: p.spanAtP}; });
}
