import {add, cross, dot, norm, scale, sub, unit, v3, type V3} from './physics';
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
