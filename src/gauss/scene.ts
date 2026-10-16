import {add, boundaries, carriesNothing, dot, fieldAt, norm, patches, pointOn, scale, sub, throughPatch, unit, v3, type Charge, type Patch, type PatchPart, type Surface, type V3} from './physics';
import type {GaussCase} from './types';
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

/** A patch as the figure draws it: whether it carries nothing, and E·n̂ at its centre (signed). */
export type DrawnPatch = Patch & {zero: boolean; through: number; field: V3;
  /** How long its field arrow is drawn, in world units: `arrowSpan`. */
  span: number};
/** A piece of the cross-section's outline, in the plane y = 0 that holds the axis: from `a` to `b` (x, z). */
export type Seg = {key: string; part: PatchPart; a: [number, number]; b: [number, number]; mid: V3; normal: V3; field: V3; zero: boolean; through: number; arc?: number;
  /** How long its field arrow is drawn, once a case is known (`build`). */
  span?: number};
/** A field arrow in space away from any surface, for the Symmetry stage: from `at`, along `field`, `span` long. */
export type Spoke = {at: V3; field: V3; span?: number};

export type Built = {
  charge: Charge;
  surface: Surface;
  /** In the run's order: the patches that carry flux first, the ones that carry nothing last. */
  patches: DrawnPatch[];
  slice: Seg[];
  spokes: Spoke[]; flatSpokes: Spoke[];
  /** The point where the field is wanted, on the surface, its outward normal, and the field there. */
  P: V3; normalAtP: V3; fieldAtP: V3; spanAtP: number;
  /** A neighbouring patch whose normal is named dA, and a patch that carries nothing, for the labels. */
  namedPatch: DrawnPatch; zeroPatch: DrawnPatch | null;
  /** Half the world's extent the figure fits, and the pixels per world unit that fit it in 720 by 430. */
  half: number; unit: number;
};

/** The surface a case draws at a slider value: a sphere or a cylinder takes the size as its radius, a pillbox
 * as its face height. */
export function surfaceOf(c: GaussCase, size: number): Surface {
  const s = c.figure.surface;
  return s.kind === 'pillbox' ? {kind: 'pillbox', r: s.other, h: size} : {kind: s.kind, r: size, h: s.other};
}
export const chargeOf = (c: GaussCase, sign: 1 | -1): Charge => ({kind: c.figure.charge.kind, sign, size: c.figure.charge.size, ...(c.figure.charge.outer ? {outer: c.figure.charge.outer} : {})});

/** The world's half-extent for a case: its largest surface, with room for the arrows standing off it. */
export function halfOf(c: GaussCase): number {
  // The largest surface, or the charge's outermost face if that reaches farther (a capacitor's far plate).
  const s = c.figure.surface, big = Math.max(s.size.max, ...boundaries(c.figure.charge));
  if (s.kind === 'sphere') return big + .55;
  if (s.kind === 'cylinder') return Math.hypot(big + .5, s.other + .2);
  return Math.hypot(s.other + .4, big + .55);
}
/** Pixels per world unit: the half-extent fills the frame's height, less a margin for the labels. */
export const unitOf = (c: GaussCase) => Math.round(.92 * 430 / (2 * halfOf(c)));

/** The size an arrow is drawn at, in world units, for a field of magnitude `e`: in proportion to the field,
 * on a scale fixed by the field on the crossed part of the case's opening surface, so dragging the surface out
 * shrinks the arrows as the field falls (and leaves them alone where it does not, on a sheet). At the smallest sizes of a
 * steep field (the point charge's 1/r²) a cap holds the longest arrows to the figure: proportional all the way there,
 * they shrank to stubs at the opening size, the one a reader meets first. */
export function arrowLength(c: GaussCase, e: number): number {
  // A lesson may fix the scale for all its cases, so equal fields are drawn equal; otherwise the opening
  // surface's field, or where it sees none (inside a shell, in metal), the field the slider first reaches from
  // its outer end.
  const at = (size: number) => { const ch = chargeOf(c, 1), P = pointOn(surfaceOf(c, size), ch); return Math.abs(dot(fieldAt(ch, P.at), P.normal)); };
  const s = c.figure.surface.size;
  let ref = c.figure.reference ?? at(s.initial);
  for (let k = 0; !(ref > 0) && k <= 40; k++) ref = at(s.max - (s.max - s.min) * k / 40);
  if (!(ref > 0)) return 0;
  return Math.max(.06, Math.min(1.6, .62 * Math.abs(e) / ref));
}

/** How long the arrow of the field `field` at `at` is drawn: its length by the scale, `k` times, cut short before
 * it would run into a place with no field (a conductor's metal, outside a cable, beyond a capacitor's far plate) or
 * where the field turns round (past a charge). An arrow drawn across metal would show a field where the lesson
 * says there is none. */
export function arrowSpan(c: GaussCase, charge: Charge, at: V3, field: V3, k = 1): number {
  const want = arrowLength(c, norm(field)) * k, d = unit(field);
  if (!(norm(field) > 1e-12) || !(want > 0)) return 0;
  const n = 64;
  for (let i = 1; i <= n; i++) {
    const e = fieldAt(charge, add(at, scale(d, want * i / n)));
    if (norm(e) < 1e-12 || dot(e, d) <= 0) return want * (i - 1) / n * .92;
  }
  return want;
}

/** The cross-section through the axis, cut as the figure cuts the surface. */
export function slice(charge: Charge, g: Surface): Seg[] {
  const out: Seg[] = [];
  const seg = (key: string, part: PatchPart, a: [number, number], b: [number, number], mid: V3, normal: V3, arc?: number) => {
    const field = fieldAt(charge, mid), through = dot(field, normal), m = norm(field);
    out.push({key, part, a, b, mid, normal, field, through, zero: m < 1e-12 || Math.abs(through) < 1e-9 * m, ...(arc ? {arc} : {})});
  };
  if (g.kind === 'sphere') {
    const n = 16, r = g.r;
    for (let i = 0; i < n; i++) {
      const t0 = 2 * Math.PI * i / n, t1 = 2 * Math.PI * (i + 1) / n, tm = (t0 + t1) / 2;
      seg(`s${i}`, 'sphere', [r * Math.sin(t0), r * Math.cos(t0)], [r * Math.sin(t1), r * Math.cos(t1)], v3(r * Math.sin(tm), 0, r * Math.cos(tm)), v3(Math.sin(tm), 0, Math.cos(tm)), r);
    }
    return out;
  }
  const {r, h} = g, bands = g.kind === 'cylinder' ? 3 : 2, across = g.kind === 'cylinder' ? 2 : 3;
  for (const side of [1, -1]) for (let i = 0; i < bands; i++) {
    const z0 = -h + 2 * h * i / bands, z1 = -h + 2 * h * (i + 1) / bands;
    seg(`w${side}-${i}`, 'wall', [side * r, z0], [side * r, z1], v3(side * r, 0, (z0 + z1) / 2), v3(side, 0, 0));
  }
  for (const [part, z] of [['top', h], ['bottom', -h]] as const) for (let i = 0; i < across; i++) {
    const x0 = -r + 2 * r * i / across, x1 = -r + 2 * r * (i + 1) / across;
    seg(`${part}-${i}`, part, [x0, z], [x1, z], v3((x0 + x1) / 2, 0, z), v3(0, 0, part === 'top' ? 1 : -1));
  }
  return out.sort((a, b) => Number(a.zero) - Number(b.zero));
}

/** Arrows of the field in space round the charge, before any surface is drawn: the shape symmetry forces. */
export function spokes(charge: Charge): Spoke[] {
  const out: Spoke[] = [];
  const add = (at: V3) => out.push({at, field: fieldAt(charge, at)});
  const round = roundness(charge);
  if (round) {
    // Directions spread evenly over the sphere (a Fibonacci lattice), at a radius just clear of the charge, and
    // inside a cavity as well as outside the metal round it.
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (const [rho, n] of round) for (let i = 0; i < n; i++) { const z = 1 - 2 * (i + .5) / n, s = Math.sqrt(1 - z * z), a = i * golden; add(v3(rho * s * Math.cos(a), rho * s * Math.sin(a), rho * z)); }
  } else if (charge.kind === 'line' || charge.kind === 'rod' || charge.kind === 'tube' || charge.kind === 'coax') {
    const rho = axialSpoke(charge);
    for (const z of [-.9, 0, .9]) for (let j = 0; j < 8; j++) { const a = 2 * Math.PI * (j + .5) / 8; add(v3(rho * Math.cos(a), rho * Math.sin(a), z)); }
  } else {
    for (const x of [-1.2, 0, 1.2]) for (const y of [-1.2, 0, 1.2]) for (const z of planeSpokes(charge)) add(v3(x, y, z));
  }
  return out;
}
/** The radii a round charge's spokes stand at, and how many at each: just clear of the charge, and for a charge in
 * a hollow, in the hollow too. Nothing for a charge that is not round. */
function roundness(c: Charge): [number, number][] | null {
  if (c.kind === 'cavity') return [[c.size * .55, 10], [(c.outer ?? c.size * 2) + .35, 22]];
  if (c.kind === 'point' || c.kind === 'ball' || c.kind === 'shell' || c.kind === 'metal') return [[Math.max(c.size * 1.18, .55) + .35, 22]];
  return null;
}
/** The radius a cylinder's spokes stand at: where its field is, clear of it (between a coaxial pair's shells). */
const axialSpoke = (c: Charge) => c.kind === 'coax' ? (c.size + (c.outer ?? c.size * 2)) / 2 : c.kind === 'line' ? .62 : c.size + .45;
/** The heights a flat charge's spokes stand at: either side of a sheet or a slab, only above a conductor's face,
 * only between a capacitor's plates. */
const planeSpokes = (c: Charge) => c.kind === 'face' ? [.42] : c.kind === 'plates' ? [-c.size / 2] : c.kind === 'slab' ? [c.size + .3, -c.size - .3] : [.42, -.42];

/** The same arrows in the cross-section's plane, y = 0, for the flat figure. */
export function flatSpokes(charge: Charge): Spoke[] {
  const out: Spoke[] = [];
  const add = (x: number, z: number) => { const at = v3(x, 0, z); out.push({at, field: fieldAt(charge, at)}); };
  const round = roundness(charge);
  if (round) {
    for (const [rho, n] of round) { const m = Math.max(8, Math.round(n * 12 / 22)); for (let i = 0; i < m; i++) { const a = 2 * Math.PI * (i + .5) / m; add(rho * Math.sin(a), rho * Math.cos(a)); } }
  } else if (charge.kind === 'line' || charge.kind === 'rod' || charge.kind === 'tube' || charge.kind === 'coax') {
    const rho = axialSpoke(charge);
    for (const z of [-.9, 0, .9]) for (const x of [-rho, rho]) add(x, z);
  } else {
    for (const x of [-1.6, -.8, 0, .8, 1.6]) for (const z of planeSpokes(charge)) add(x, z);
  }
  return out;
}

export function build(c: GaussCase, size: number, sign: 1 | -1): Built {
  const charge = chargeOf(c, sign), surface = surfaceOf(c, size);
  const drawn: DrawnPatch[] = patches(surface).map(p => { const field = fieldAt(charge, p.center); return {...p, zero: carriesNothing(charge, p), through: throughPatch(charge, p), field, span: arrowSpan(c, charge, p.center, field)}; });
  // Those that carry flux first, in the order they were cut; the ones that carry nothing after them, so the run
  // ends the left side on the parts it adds nothing for, and lights them as zero last.
  drawn.sort((a, b) => Number(a.zero) - Number(b.zero));
  const on = pointOn(surface, charge), P = on.at, normalAtP = on.normal, fieldAtP = fieldAt(charge, P);
  // The dA named on the figure: a crossed patch a little round from P, so its arrow and P's do not lie on each other.
  const towards = surface.kind === 'pillbox' ? (charge.kind === 'plates' ? v3(.9 * surface.r, -.3 * surface.r, -surface.h) : v3(-.5 * surface.r, -.5 * surface.r, surface.h)) : surface.kind === 'cylinder' ? v3(-surface.r * .45, -surface.r * .9, surface.h * .5) : v3(-surface.r * .35, -surface.r * .55, surface.r * .76);
  const crossed = drawn.filter(p => !p.zero), pool = crossed.length ? crossed : drawn;
  const namedPatch = pool.reduce((best, p) => norm(sub(p.center, towards)) < norm(sub(best.center, towards)) ? p : best, pool[0]);
  const zeros = drawn.filter(p => p.zero);
  // The patch that carries nothing named on the figure: the one that faces the opening camera most squarely.
  const facing = v3(-.42, -.78, .45);
  const zeroPatch = zeros.length ? zeros.reduce((best, p) => dot(p.normal, facing) > dot(best.normal, facing) ? p : best, zeros[0]) : null;
  // The spokes are drawn from their anchors, a little shorter than the patches' arrows, and never into metal.
  const spoked = (list: Spoke[]) => list.map(s => ({...s, span: arrowSpan(c, charge, s.at, s.field, .85)}));
  return {charge, surface, patches: drawn, slice: slice(charge, surface).map(s => ({...s, span: arrowSpan(c, charge, s.mid, s.field)})), spokes: spoked(spokes(charge)), flatSpokes: spoked(flatSpokes(charge)),
    P, normalAtP, fieldAtP, spanAtP: arrowSpan(c, charge, P, fieldAtP), namedPatch, zeroPatch, half: halfOf(c), unit: unitOf(c)};
}
/** The direction an arrow of field `e` is drawn in, and its length, for a case: unit and world units. */
export const arrowOf = (c: GaussCase, e: V3) => ({dir: unit(e), length: arrowLength(c, norm(e))});
/** Every patch carries E·n̂ dA; the sum is the flux, for the tests to hold against Q_enc/ε₀. */
export const drawnFlux = (b: Built) => b.patches.reduce((t, p) => t + p.through * p.area, 0);
