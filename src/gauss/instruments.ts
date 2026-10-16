import {add, ballFraction, bandFlux, boundaries, cross, dot, EPS0, fieldAt, norm, pointOn, rectangleAngle, scale, sub, unit, v3, type ChargeKind, type V3} from './physics';
import {chargeOf, surfaceOf} from './scene';
import type {GaussCase} from './types';
/* THE TWO INSTRUMENTS' PHYSICS, apart from their drawing, so a unit test can hold them to it.
 *
 * Symmetry first: a field is proposed, the charge is turned or flipped by a move that leaves it as it was, and
 * the field is carried with it. If the carried field differs from the field that was there, the proposal is
 * impossible: the same charge cannot make two fields. Every move here is a half turn or a mirror, so the
 * sample points land on one another and the comparison is made point by point.
 *
 * Flux, the idea: point charges of either sign in the plane of a closed surface's cross-section, the surface
 * star-shaped about its centre: its radius s(1 + sin²(polar)·bump(azimuth)) is a sphere's at the poles and the
 * dashed curve's in the charges' plane, where its normal lies in the plane. The flux out through it is the enclosed charges over ε₀, which
 * physics.ts's `starFlux` confirms by quadrature in the tests; the readout names them and nothing else. */

export type Sym = 'sphere' | 'line' | 'plane';
export type Candidate = 'straight' | 'tilted' | 'swirl' | 'oneway';
export type Move = {key: string; label: string; kind: 'turn' | 'mirror'; axis: V3};
export const CANDIDATES: Record<Sym, {key: Candidate; label: string}[]> = {
  sphere: [{key: 'straight', label: 'Straight out or in'}, {key: 'tilted', label: 'Leaning upward'}, {key: 'swirl', label: 'Swirling round'}],
  line: [{key: 'straight', label: 'Straight out or in'}, {key: 'tilted', label: 'Leaning along the line'}, {key: 'swirl', label: 'Swirling round the line'}],
  plane: [{key: 'straight', label: 'Straight out or in'}, {key: 'tilted', label: 'Leaning along the sheet'}, {key: 'oneway', label: 'One way on both sides'}],
};
/** The moves that leave each charge exactly as it was. A turn is a half turn about `axis`; a mirror is the plane
 * whose normal is `axis`. */
export const MOVES: Record<Sym, Move[]> = {
  sphere: [
    {key: 'turn-up', label: 'Half turn about the vertical', kind: 'turn', axis: v3(0, 0, 1)},
    {key: 'turn-level', label: 'Half turn about a level axis', kind: 'turn', axis: v3(1, 0, 0)},
    {key: 'mirror', label: 'Mirror in a plane through the centre', kind: 'mirror', axis: v3(0, 1, 0)},
  ],
  line: [
    {key: 'turn', label: 'Half turn about the line', kind: 'turn', axis: v3(0, 0, 1)},
    {key: 'mirror-holds', label: 'Mirror that holds the line', kind: 'mirror', axis: v3(0, 1, 0)},
    {key: 'mirror-square', label: 'Mirror square to the line', kind: 'mirror', axis: v3(0, 0, 1)},
  ],
  plane: [
    {key: 'turn', label: 'Half turn about a line square to it', kind: 'turn', axis: v3(0, 0, 1)},
    {key: 'mirror-square', label: 'Mirror square to the sheet', kind: 'mirror', axis: v3(1, 0, 0)},
    {key: 'flip', label: 'Flip it over', kind: 'mirror', axis: v3(0, 0, 1)},
  ],
};
/** The proposed field at X, for a charge of the given sign: straight out (the true one), or with an extra part
 * the symmetry forbids. Its size is unit here: only its direction is on trial. */
export function proposed(sym: Sym, c: Candidate, sign: 1 | -1, X: V3): V3 {
  const s = v3(X.x, X.y, 0), ring = norm(s) > 1e-9 ? unit(v3(-X.y, X.x, 0)) : v3(0, 0, 0);
  let out: V3;
  if (sym === 'plane') {
    const away = v3(0, 0, Math.sign(X.z));
    out = c === 'tilted' ? add(away, v3(.6, 0, 0)) : c === 'oneway' ? v3(0, 0, 1) : away;
  } else {
    const radial = sym === 'sphere' ? unit(X) : unit(s);
    // About the vertical: a sphere's lean and swirl are about the axis the figure stands it on.
    out = c === 'tilted' ? add(radial, v3(0, 0, .6)) : c === 'swirl' ? add(radial, scale(ring, .6)) : radial;
  }
  return scale(out, sign);
}
/** Where the arrows are drawn: points every move here sends onto one another. */
export function samples(sym: Sym): V3[] {
  const out: V3[] = [];
  if (sym === 'sphere') {
    const r = 1.45;
    for (const d of [v3(1, 0, 0), v3(-1, 0, 0), v3(0, 1, 0), v3(0, -1, 0), v3(0, 0, 1), v3(0, 0, -1)]) out.push(scale(d, r));
    for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) out.push(scale(unit(v3(x, y, z)), r));
  } else if (sym === 'line') {
    for (const z of [.85, -.85]) for (let k = 0; k < 8; k++) out.push(v3(.9 * Math.cos(k * Math.PI / 4), .9 * Math.sin(k * Math.PI / 4), z));
  } else {
    for (const x of [-1.15, 0, 1.15]) for (const y of [-1.15, 0, 1.15]) for (const z of [.6, -.6]) out.push(v3(x, y, z));
  }
  return out;
}
/** The move, a fraction `t` of the way: a turn by t half turns, a mirror squashed through its plane. Applied to
 * points and to the field's arrows alike (the field is a vector, and turns and flips as the charge does). */
export function moveBy(m: Move, t: number, p: V3): V3 {
  const a = m.axis;
  if (m.kind === 'mirror') return sub(p, scale(a, 2 * t * dot(p, a)));
  const th = Math.PI * t, c = Math.cos(th), s = Math.sin(th);
  return add(add(scale(p, c), scale(cross(a, p), s)), scale(a, dot(a, p) * (1 - c)));
}
/** Whether the proposed field survives the move: carried with the charge, it must equal the field already at
 * each point it lands on. */
export function survives(sym: Sym, c: Candidate, m: Move, sign: 1 | -1 = 1): boolean {
  return samples(sym).every(X => {
    const to = moveBy(m, 1, X), carried = moveBy(m, 1, proposed(sym, c, sign, X)), there = proposed(sym, c, sign, to);
    return norm(sub(carried, there)) < 1e-9;
  });
}

// ---- Flux, the idea ----
export type Pt = {x: number; y: number};
export type Charged = {key: string; name: string; tex: string; sign: 1 | -1; at: Pt};
/** Four charges, two of each sign, named as the readout names them. */
export const START: Charged[] = [
  {key: 'q1', name: 'q₁', tex: 'q_1', sign: 1, at: {x: -.55, y: .35}},
  {key: 'q2', name: 'q₂', tex: 'q_2', sign: -1, at: {x: 2.55, y: 1.05}},
  {key: 'q3', name: 'q₃', tex: 'q_3', sign: 1, at: {x: .65, y: -.55}},
  {key: 'q4', name: 'q₄', tex: 'q_4', sign: -1, at: {x: -2.6, y: -1.05}},
];
/** The closed surface's radius in each direction round its centre, for a surface of size `s`: lumpy on purpose,
 * since the flux does not care about the shape. */
export const blob = (theta: number, s: number) => s * (1 + .17 * Math.cos(3 * theta + .4) + .08 * Math.sin(2 * theta - .3));
export const isInside = (p: Pt, s: number) => Math.hypot(p.x, p.y) < blob(Math.atan2(p.y, p.x), s);
export const enclosedOf = (charges: readonly Charged[], s: number) => charges.filter(c => isInside(c.at, s));
/** The readout: the enclosed charges by name, over ε₀. Zero, said as zero, when there are none. */
export function fluxTex(charges: readonly Charged[], s: number): string {
  const inside = enclosedOf(charges, s);
  if (!inside.length) return String.raw`\Phi=0`;
  const sum = inside.map(c => c.tex).join('+');
  return String.raw`\Phi=\frac{${sum}}{\varepsilon_0}`;
}
/** The same, in words, for a screen reader. */
export function fluxWords(charges: readonly Charged[], s: number): string {
  const inside = enclosedOf(charges, s);
  return inside.length ? `The flux is ${inside.map(c => c.name).join(' plus ')}, over epsilon nought.` : 'The flux is zero: no charge is inside.';
}
/** The field's part along the outward normal at points round the dashed curve, from every charge (k = 1, charges
 * of unit size): what goes out (positive) and what comes in (negative). For drawing, not for the readout. */
export function flowRound(charges: readonly Charged[], s: number, n = 40): {at: Pt; normal: Pt; through: number}[] {
  const out: {at: Pt; normal: Pt; through: number}[] = [];
  for (let i = 0; i < n; i++) {
    const th = 2 * Math.PI * (i + .5) / n, r = blob(th, s), eps = 1e-4, dr = (blob(th + eps, s) - blob(th - eps, s)) / (2 * eps);
    const at = {x: r * Math.cos(th), y: r * Math.sin(th)};
    // The tangent is d/dθ of the point; the outward normal is the tangent turned a quarter clockwise.
    const tx = dr * Math.cos(th) - r * Math.sin(th), ty = dr * Math.sin(th) + r * Math.cos(th), tl = Math.hypot(tx, ty);
    const normal = {x: ty / tl, y: -tx / tl};
    let ex = 0, ey = 0;
    for (const c of charges) { const dx = at.x - c.at.x, dy = at.y - c.at.y, d = Math.hypot(dx, dy); ex += c.sign * dx / d ** 3; ey += c.sign * dy / d ** 3; }
    out.push({at, normal, through: ex * normal.x + ey * normal.y});
  }
  return out;
}

// ---- The field against distance: Lines and cylinders, Sheets and slabs ----
/* The profile under the figure plots the field's component at P along the outward normal against the slider's own
 * coordinate (the surface's radius, or its face's height), from the same exact field the figure draws, so the dot
 * the slider moves along it is the answer the run solves for. The curve is drawn a region at a time, split at the
 * charge's surfaces, so a jump (onto a shell of charge) is a gap and never a slanted line. */
/** The signed field the case solves for when its surface has size `x`: E_r on a sphere or a cylinder, E_⊥ on a
 * pillbox's face. */
export function fieldAlong(c: GaussCase, sign: 1 | -1, x: number): number {
  const ch = chargeOf(c, sign), P = pointOn(surfaceOf(c, x), ch);
  return dot(fieldAt(ch, P.at), P.normal);
}
/** How far the profile reaches: past the slider's end and the charge's outermost surface, and for a capacitor out
 * past its far plate, where the field is gone. */
export function profileReach(c: GaussCase): number {
  const b = boundaries(c.figure.charge), s = c.figure.surface.size.max;
  return c.figure.charge.kind === 'plates' ? Math.max(s, ...b) * 1.45 : Math.max(s, ...b) * 1.15;
}
/** Which region a size is in: how many of the charge's surfaces lie inside it. */
export const regionOf = (c: GaussCase, x: number) => boundaries(c.figure.charge).filter(b => x > b).length;
export type ProfilePiece = {from: number; to: number; points: {x: number; e: number}[]};
/** The curve, region by region. A field that grows without end at the axis (a line's) starts a little out. */
export function profile(c: GaussCase, sign: 1 | -1, n = 160): ProfilePiece[] {
  const X = profileReach(c), cuts = [0, ...boundaries(c.figure.charge).filter(b => b < X), X], out: ProfilePiece[] = [];
  const singular = c.figure.charge.kind === 'line';
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = i === 0 && singular ? X * .06 : cuts[i], b = cuts[i + 1], m = Math.max(8, Math.round(n * (b - a) / X)), eps = (b - a) * 1e-6;
    const points = Array.from({length: m + 1}, (_, k) => { const x = a + eps + (b - a - 2 * eps) * k / m; return {x, e: fieldAlong(c, sign, x)}; });
    out.push({from: a, to: b, points});
  }
  return out;
}

// ---- A charge in a cavity: Conductors ----
/* A metal ball with a round hollow at its centre, and a point charge q that can be moved about inside the hollow.
 * The hollow's wall takes −q, crowded toward q by the image solution's density (physics.ts `wallDensity`); the
 * outer surface takes the metal's net charge plus q, spread evenly however q sits, since the metal between screens
 * the outside from the hollow. Lengths in units of the hollow's radius. */
/** The hollow and the ball in the same proportion as the figure's Hollow case (radii .655 and 1.355). */
export const CAVITY = {a: 1, b: 2.07, reach: .7} as const;
/** The angles round the wall's cross-section at which to draw `n` marks of its charge: where the `n` field lines
 * from q end, one mark for each line, so every line is seen to end on a charge and the marks crowd as the lines
 * do, toward q (the wall's density, `wallDensity`, crowds the same way). */
export function wallMarks(q: Pt, n: number, a: number = CAVITY.a): number[] {
  return cavityLines(q, n, a).map(l => { const e = l[l.length - 1]; return Math.atan2(e.y, e.x); });
}
/** The field in the hollow at p, for a unit positive charge at q: q's own field and the wall's, which inside the
 * hollow is exactly the field of an image charge −qa/d at a²/d along the same line, outside it (k = 1). */
export function cavityField(q: Pt, p: Pt, a: number = CAVITY.a): Pt {
  const d = Math.hypot(q.x, q.y), dx = p.x - q.x, dy = p.y - q.y, r3 = Math.hypot(dx, dy) ** 3;
  let ex = dx / r3, ey = dy / r3;
  if (d > 1e-9) {
    const s = a * a / (d * d), ix = p.x - q.x * s, iy = p.y - q.y * s, i3 = Math.hypot(ix, iy) ** 3, qi = -a / d;
    ex += qi * ix / i3; ey += qi * iy / i3;
  }
  return {x: ex, y: ey};
}
/** Field lines from q to the wall, `n` of them, leaving q evenly spaced: each ends where the wall's charge is. */
export function cavityLines(q: Pt, n = 14, a: number = CAVITY.a): Pt[][] {
  const out: Pt[][] = [], h = a / 90;
  for (let i = 0; i < n; i++) {
    const t = 2 * Math.PI * (i + .5) / n;
    let p = {x: q.x + .06 * a * Math.cos(t), y: q.y + .06 * a * Math.sin(t)};
    const line = [{...q}, p];
    for (let k = 0; k < 600 && Math.hypot(p.x, p.y) < a; k++) {
      // A midpoint step along the field's direction.
      const e1 = cavityField(q, p, a), l1 = Math.hypot(e1.x, e1.y), mid = {x: p.x + e1.x / l1 * h / 2, y: p.y + e1.y / l1 * h / 2};
      const e2 = cavityField(q, mid, a), l2 = Math.hypot(e2.x, e2.y);
      p = {x: p.x + e2.x / l2 * h, y: p.y + e2.y / l2 * h};
      line.push(p);
    }
    // The last step lands on the wall.
    const r = Math.hypot(p.x, p.y);
    if (r > a) line[line.length - 1] = {x: p.x * a / r, y: p.y * a / r};
    out.push(line);
  }
  return out;
}
/** The charges the readout names: on the hollow's wall and on the outside, with a charge q in the hollow or none,
 * on metal that is neutral or carries Q. */
export function cavityTex(hasCharge: boolean, net: boolean): string {
  const wall = hasCharge ? '-q' : '0', outer = hasCharge ? (net ? 'Q+q' : 'q') : (net ? 'Q' : '0');
  return String.raw`q_{\text{wall}}=${wall},\qquad q_{\text{outer}}=${outer}`;
}
// ---- Why only the charge inside ----
/* A point charge on the axis of a sphere of radius one, a distance d from its centre, and the sphere cut into bands
 * about that axis. Each band's flux is exact (physics.ts, bandFlux): the field is the same turned about the axis, so a
 * band is the right piece. The instrument stacks them: inside, every band carries flux of q's sign and they add to
 * q/ε₀; outside, the bands facing the charge carry it the other way, exactly as much as the bands beyond it, and the
 * stack comes back to zero. */
export const BANDS = 8;
export type Band = {i: number; th0: number; th1: number; mid: number; flux: number; field: V3; normal: V3};
/** The bands, nearest the charge first, each with its flux (k = 1) and the field at its middle, in the plane that
 * holds the axis (x across it, z along it toward the charge). */
export function insideBands(d: number, sign: 1 | -1, n = BANDS): Band[] {
  const out: Band[] = [];
  for (let i = 0; i < n; i++) {
    const th0 = Math.PI * i / n, th1 = Math.PI * (i + 1) / n, mid = (th0 + th1) / 2, at = v3(Math.sin(mid), 0, Math.cos(mid));
    out.push({i, th0, th1, mid, flux: bandFlux(sign, d, 1, th0, th1), field: fieldAt({kind: 'offset', sign, size: d}, at), normal: at});
  }
  return out;
}
/** Each band's flux as a share of q/ε₀: positive where it carries flux of q's own sign (out for a positive q). */
export const bandShares = (d: number, n = BANDS) => insideBands(d, 1, n).map(b => b.flux * EPS0);
/** The readout: q/ε₀ with the charge inside, zero outside. The instrument never stops on the sphere itself. */
export const insideTex = (d: number) => d < 1 ? String.raw`\Phi=\frac{q}{\varepsilon_0}` : String.raw`\Phi=0`;

// ---- Q_enc from a density ----
/* A ball of radius R and total charge Q, its density one of three: uniform, rising as r, or falling to zero at the
 * surface. The thin shell at r′ holds dq = ρ(r′)·4πr′²dr′; the shells inside the Gaussian sphere add to Q_enc. In units
 * of R and Q (R = 1, Q = 1), so the fractions are ballFraction's and the shells' charge per unit radius its slope. */
export type Profile = 'uniform' | 'rising' | 'falling';
export const PROFILE_KIND: Record<Profile, ChargeKind> = {uniform: 'ball', rising: 'rising', falling: 'falling'};
/** The density at x = r′/R, for Q = 1 and R = 1: 3/4π, x/π, or 3(1 − x)/π, each normalised so the ball holds Q. */
export function density(p: Profile, x: number): number {
  if (x > 1) return 0;
  return p === 'uniform' ? 3 / (4 * Math.PI) : p === 'rising' ? x / Math.PI : 3 * (1 - x) / Math.PI;
}
/** The charge per unit radius in the shell at x: ρ·4πx², whose integral from zero to x is the enclosed charge. */
export const shellCharge = (p: Profile, x: number) => density(p, x) * 4 * Math.PI * x * x;
/** The charge inside a sphere of radius x (units of R), as a fraction of Q. */
export const qencFraction = (p: Profile, x: number) => ballFraction(PROFILE_KIND[p], x, 1);
const raw = String.raw;
/** The density as the board writes it, its constant fixed by the total Q, the shells' integrand, and the closed
 * form inside. */
const QENC: Record<Profile, {rho: string; norm: string; integrand: string; inside: string}> = {
  uniform: {rho: raw`\rho=\text{const}`, norm: raw`\rho=\frac{Q}{\frac43\pi R^3}`, integrand: raw`\rho\,4\pi r'^2`, inside: raw`Q\,\frac{r^3}{R^3}`},
  rising: {rho: raw`\rho=\rho_0\,\frac{r}{R}`, norm: raw`\rho_0=\frac{Q}{\pi R^3}`, integrand: raw`\rho_0\frac{r'}{R}\,4\pi r'^2`, inside: raw`Q\,\frac{r^4}{R^4}`},
  falling: {rho: raw`\rho=\rho_0\Big(1-\frac{r}{R}\Big)`, norm: raw`\rho_0=\frac{3Q}{\pi R^3}`, integrand: raw`\rho_0\Big(1-\frac{r'}{R}\Big)4\pi r'^2`, inside: raw`Q\Big(\frac{4r^3}{R^3}-\frac{3r^4}{R^4}\Big)`},
};
/** The readout, built for where the sphere is: the shells from the centre to r inside the ball, to R outside it
 * (there is no charge beyond R), and the mistaken ∫ρ dr′ when the reader asks for it. */
export function qencTex(p: Profile, x: number, mistaken = false): {density: string; integral: string} {
  const q = QENC[p], top = x < 1 ? 'r' : 'R';
  if (mistaken) return {density: raw`${q.rho},\quad ${q.norm}`, integral: raw`\int_0^{${top}}\rho\,dr'\neq Q_{\text{enc}}`};
  return {density: raw`${q.rho},\quad ${q.norm}`, integral: raw`Q_{\text{enc}}=\int_0^{${top}}${q.integrand}\,dr'=${x < 1 ? q.inside : 'Q'}`};
}

// ---- Spheres: the field against r ----
/* The four spheres of the lesson, each of total charge Q (k = 1, Q = 1, R = 1): a point charge, a thin shell, a
 * uniform ball and a ball with ρ ∝ r. Outside R all four make the same field; inside they part. */
export const SPHERE_KINDS = ['point', 'shell', 'ball', 'rising'] as const;
export type SphereKind = typeof SPHERE_KINDS[number];
/** E_r at r (units of R) for a charge of the given sign: the figure's own fields, along a radius. */
export const fieldOf = (k: SphereKind, r: number, sign: 1 | -1 = 1) => fieldAt({kind: k, sign, size: 1}, v3(r, 0, 0)).x;

// ---- Holes by superposition: the field in a hole, as the hole is moved ----
/* A ball (or a rod, seen end on) of uniform ρ with a round hole in it, cut through both centres: the instrument under
 * Holes by superposition. The field is the whole charge's plus the plug's, the plug of −ρ filling the hole. Inside a
 * uniform ball the field is ρr⃗/(3ε₀) and inside a uniform rod ρr⃗⊥/(2ε₀); outside, a point charge's and a line's.
 * Lengths are in units of the big radius R, and fields in units of ρR/(nε₀), n = 3 for a ball and 2 for a rod, so
 * inside the whole charge the field is r⃗ itself. */
export type HoleShape = 'ball' | 'rod';
export const HOLE = {b: .38, reach: .5} as const;
/** The field of a uniform ball (n = 3) or rod (n = 2) of radius a about c, at p, in units of ρ/(nε₀): p − c inside,
 * a³(p − c)/|p − c|³ or a²(p − c)/|p − c|² outside. */
function solid(shape: HoleShape, a: number, c: Pt, p: Pt): Pt {
  const dx = p.x - c.x, dy = p.y - c.y, r = Math.hypot(dx, dy);
  if (r <= a) return {x: dx, y: dy};
  const k = shape === 'ball' ? a ** 3 / r ** 3 : a * a / (r * r);
  return {x: k * dx, y: k * dy};
}
/** The field at p of the whole charge (radius 1, about the origin) with a hole of radius b about c, for a charge of the
 * given sign: the whole charge's field, less the plug's. In the hole it is c itself, the same at every point. */
export function holeField(shape: HoleShape, c: Pt, p: Pt, sign: 1 | -1 = 1, b: number = HOLE.b): Pt {
  const whole = solid(shape, 1, {x: 0, y: 0}, p), plug = solid(shape, b, c, p);
  return {x: sign * (whole.x - plug.x), y: sign * (whole.y - plug.y)};
}
/** The two pieces' fields at p, the whole charge's and the plug's, for drawing them tip to tail. */
export function holePieces(shape: HoleShape, c: Pt, p: Pt, sign: 1 | -1 = 1, b: number = HOLE.b): [Pt, Pt] {
  const whole = solid(shape, 1, {x: 0, y: 0}, p), plug = solid(shape, b, c, p);
  return [{x: sign * whole.x, y: sign * whole.y}, {x: -sign * plug.x, y: -sign * plug.y}];
}
/** Where the hole may go: wholly inside the charge, with a rim of charge left round it. */
export function holeAt(to: Pt, b: number = HOLE.b): Pt {
  const d = Math.hypot(to.x, to.y), max = 1 - b - .08;
  return d > max ? {x: to.x * max / d, y: to.y * max / d} : to;
}
/** The readout: the field in the hole, ρd⃗/(3ε₀) for a ball and ρd⃗/(2ε₀) for a rod, or none when the hole is centred. */
export function holeTex(shape: HoleShape, centred: boolean): string {
  const n = shape === 'ball' ? 3 : 2;
  return centred ? String.raw`\vec d=0:\quad\vec E_{\text{hole}}=0` : String.raw`\vec E_{\text{hole}}=\frac{\rho\,\vec d}{${n}\varepsilon_0}`;
}

// ---- When symmetry runs out: a charge in a cube ----
/* A point charge anywhere inside a cube of half-width 1. The flux through each face is q/ε₀ times the solid angle
 * the face fills as seen from the charge, over 4π (physics.ts `rectangleAngle`): exact, the same
 * integral the figure's patches carry. The six shares add to the whole, q/ε₀, wherever the charge sits; only at the
 * centre does symmetry alone say each is a sixth. */
export const FACES = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;
export type Face = typeof FACES[number];
/** Each face's share of the flux, a fraction of q/ε₀, for a charge at q in the cube |x|, |y|, |z| ≤ 1 (the cross-section
 * is the plane y = 0: left and right are x = ∓1, top and bottom z = ±1, front and back y = ∓1). */
export function cubeShares(q: V3): Record<Face, number> {
  const share = (D: number, u0: number, u1: number, v0: number, v1: number) => rectangleAngle(D, u0, u1, v0, v1) / (4 * Math.PI);
  return {
    right: share(1 - q.x, -1 - q.y, 1 - q.y, -1 - q.z, 1 - q.z), left: share(1 + q.x, -1 - q.y, 1 - q.y, -1 - q.z, 1 - q.z),
    back: share(1 - q.y, -1 - q.x, 1 - q.x, -1 - q.z, 1 - q.z), front: share(1 + q.y, -1 - q.x, 1 - q.x, -1 - q.z, 1 - q.z),
    top: share(1 - q.z, -1 - q.x, 1 - q.x, -1 - q.y, 1 - q.y), bottom: share(1 + q.z, -1 - q.x, 1 - q.x, -1 - q.y, 1 - q.y),
  };
}
/** Where the charge may go: inside the cube, clear of its faces. */
export const cubeAt = (p: {x: number; y: number}) => Math.hypot(p.x, p.y) < .02 ? {x: 0, y: 0} : {x: Math.max(-.85, Math.min(.85, p.x)), y: Math.max(-.85, Math.min(.85, p.y))};
