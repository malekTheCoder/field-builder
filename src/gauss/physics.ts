/* THE PHYSICS OF THE GAUSS LESSONS, EXACT AND IN ONE PLACE.
 *
 * Every arrow the figure draws, every patch it lights as zero and every right side the board writes comes
 * from here, and tests/gauss-physics.test.ts holds each closed form against a numerical flux integral over
 * the very patches the figure draws, for both signs of the charge.
 *
 * Units are the figure's own and never reach the page (the page prints no numerals): k = 1, so
 * ε₀ = 1/(4π); a charge's size is its magnitude (Q, λ, σ or ρ as the kind has it), and `sign` says which
 * way. Lengths are in the figure's world units, z up. */
export type V3 = {x: number; y: number; z: number};
export const EPS0 = 1 / (4 * Math.PI);
export const v3 = (x: number, y: number, z: number): V3 => ({x, y, z});
export const add = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: V3, s: number): V3 => v3(a.x * s, a.y * s, a.z * s);
export const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const norm = (a: V3) => Math.hypot(a.x, a.y, a.z);
export const unit = (a: V3): V3 => { const n = norm(a); return n > 0 ? scale(a, 1 / n) : v3(0, 0, 0); };

/** The charge distributions a Gauss lesson can draw. `size` is the ball's or the shell's radius R, or the
 * slab's half-thickness a; a point, a line and a sheet have none.
 *
 * The cylinders and the conductors (Lines and cylinders, Sheets and slabs, Conductors):
 * - `rod`: a solid cylinder of radius R = size, charged evenly through, λ per unit length.
 * - `tube`: a thin cylindrical shell of radius R = size, λ per unit length.
 * - `coax`: two thin coaxial shells, the inner (radius a = size) carrying λ per unit length and the outer
 *   (radius b = outer) carrying −λ: a coaxial cable's two conductors.
 * - `metal`: a solid metal ball of radius R = size carrying Q, all of it on its surface.
 * - `cavity`: a neutral thick metal shell, inner radius a = size and outer radius b = outer, with a point
 *   charge q at the centre of its hollow. The hollow's wall carries −q and the outer surface +q.
 * - `face`: a large flat conductor seen close to its surface: metal below z = 0, σ on the surface z = 0, no
 *   field in the metal and σ/ε₀ just outside.
 * - `plates`: two parallel sheets, σ at z = 0 and −σ at z = −d (d = size): a capacitor's plates.
 *
 * The charge inside (Why only the charge inside, Q_enc from a density, Spheres):
 * - `offset`: a point charge off the centre, a distance `size` straight up from it, on the z axis: inside the
 *   sphere or outside it. No symmetry about the sphere's centre.
 * - `rising`, `falling`: balls whose density depends on r, ρ = ρ₀r/R and ρ = ρ₀(1 − r/R), total charge Q.
 * - `tent`: a slab whose density falls from its middle plane to zero at its faces, ρ = ρ₀(1 − |z|/a).
 *
 * Holes by superposition: a charge with a hole cut out of it is the whole charge plus a plug of the opposite sign
 * where the hole is (`piecesOf`), and its field is the two pieces' fields added.
 * - `ballhole`: a uniform ball of radius R = size with a round hole of radius `hole.radius` centred at `hole.at`.
 * - `rodhole`: an infinite uniform rod of radius R = size along z, with a hole of radius `hole.radius` drilled along
 *   it, its axis through `hole.at`.
 * - `sheethole`: an infinite sheet with a round hole of radius `hole.radius` about the z axis.
 * - `disk`: a flat disc of radius R = size in the plane z = 0, σ per unit area: the sheet's plug, whose field the
 *   integral lesson builds ring by ring. Here it is added up ring by ring too (`diskField`).
 *
 * When symmetry runs out: `segment`, a finite rod of λ per unit length along the z axis, from −ℓ to ℓ (ℓ = size),
 * whose field has the closed form the integral lesson builds; and a `point` given an `at`, off the centre of the cube
 * round it.
 *
 * The hard cases: `halo`, charge with no edge, ρ = ρ₀a²/(r² + a²) (a = size), whose charge inside grows without end;
 * `cusp`, a ball of radius R = size with ρ = β/r, infinite at its centre but finite in total; `oddslab`, a slab from
 * −a to a (a = size) with ρ = ρ₀z/a, one sign above its middle and the other below. Each of unit ρ₀ or β, times its amount. */
export type ChargeKind = 'point' | 'shell' | 'ball' | 'line' | 'sheet' | 'slab' | 'rod' | 'tube' | 'coax' | 'metal' | 'cavity' | 'face' | 'plates'
  | 'offset' | 'rising' | 'falling' | 'tent' | 'ballhole' | 'rodhole' | 'sheethole' | 'disk' | 'segment' | 'halo' | 'cusp' | 'oddslab';
export type Charge = {kind: ChargeKind; sign: 1 | -1; size: number; outer?: number;
  /** The charge's centre (or its axis's foot) when it is not the origin: a superposition's plug. */
  at?: V3;
  /** A multiple of the kind's own amount: a plug cut from a bigger charge of the same density. */
  amount?: number;
  /** The hole cut out of a `ballhole`, a `rodhole` or a `sheethole`. */
  hole?: {radius: number; at: V3}};
const ORIGIN = v3(0, 0, 0);
/** A charge with a hole, as the two charges it is the sum of: the whole charge, and a plug of the opposite sign and
 * the same density filling the hole. Each piece is symmetric about its own centre, so each is solved alone. Nothing
 * for a charge with no hole. */
export function piecesOf(c: Pick<Charge, 'kind' | 'sign' | 'size' | 'hole' | 'amount'>): Charge[] | null {
  const h = c.hole, s = c.sign, minus = -c.sign as 1 | -1, k = c.amount ?? 1;
  if (!h) return null;
  if (c.kind === 'ballhole') return [{kind: 'ball', sign: s, size: c.size, amount: k}, {kind: 'ball', sign: minus, size: h.radius, amount: k * (h.radius / c.size) ** 3, at: h.at}];
  if (c.kind === 'rodhole') return [{kind: 'rod', sign: s, size: c.size, amount: k}, {kind: 'rod', sign: minus, size: h.radius, amount: k * (h.radius / c.size) ** 2, at: v3(h.at.x, h.at.y, 0)}];
  if (c.kind === 'sheethole') return [{kind: 'sheet', sign: s, size: 0, amount: k}, {kind: 'disk', sign: minus, size: h.radius, amount: k, at: v3(h.at.x, h.at.y, 0)}];
  return null;
}
/** Where the field's formula changes, in the slider's coordinate (a radius, or a height): the surfaces of the
 * charge. The profile under the figure marks them, and a case names the regions between them. */
export function boundaries(c: Pick<Charge, 'kind' | 'size' | 'outer'>): number[] {
  switch (c.kind) {
    case 'ball': case 'shell': case 'rod': case 'tube': case 'metal': case 'slab': case 'plates': case 'rising': case 'falling': case 'tent': return [c.size];
    case 'coax': case 'cavity': return [c.size, c.outer ?? c.size * 2];
    case 'cusp': return [c.size];
    case 'oddslab': return [-c.size, c.size];
    default: return [];
  }
}
/** The charges drawn as a ball of radius `size`, centred: uniform or not. */
export const isBall = (k: ChargeKind) => k === 'ball' || k === 'rising' || k === 'falling';
/** The charge a ball of total charge one holds inside radius r: the fraction of it there, by its density.
 * Uniform, (r/R)³; ρ ∝ r, (r/R)⁴; ρ ∝ 1 − r/R, 4(r/R)³ − 3(r/R)⁴. All of it once r reaches R. */
export function ballFraction(k: ChargeKind, r: number, R: number): number {
  const x = Math.max(0, Math.min(1, r / R));
  return k === 'rising' ? x ** 4 : k === 'falling' ? 4 * x ** 3 - 3 * x ** 4 : x ** 3;
}
/** A tent slab's charge per unit area between its middle plane and height h, for ρ₀ = 1: ∫₀^h (1 − z/a) dz,
 * stopping at the face a. */
export const tentHalf = (h: number, a: number) => { const m = Math.min(Math.abs(h), a); return m - m * m / (2 * a); };
/** The closed surfaces: a sphere about the centre, a cylinder about the z axis, a pillbox (a short cylinder
 * about the z axis, standing across the plane z = 0). `r` is the radius; `h` is the half-length of the
 * cylinder or the half-height of the pillbox. */
export type SurfaceKind = 'sphere' | 'cylinder' | 'pillbox' | 'cube';
export type Surface = {kind: SurfaceKind; r: number; h: number;
  /** The centre (or the axis's foot) when it is not the origin: a superposition's second surface, round its plug. */
  center?: V3;
  /** A pillbox's bottom face, when it is not at −h: below a slab, with the top face at h. */
  low?: number};

/** The exact field of each distribution at a point, by the closed forms Gauss's law gives (and the integral
 * lessons confirm for the line and the sheet): k = 1. */
export function fieldAt(c: Charge, p: V3): V3 {
  const parts = piecesOf(c);
  if (parts) return parts.reduce((e, q) => add(e, fieldAt(q, p)), v3(0, 0, 0));
  const e = ownField(c, c.at ? sub(p, c.at) : p);
  return c.amount === undefined ? e : scale(e, c.amount);
}
/** The field of a charge with no hole, about its own centre. */
function ownField(c: Charge, p: V3): V3 {
  const s = c.sign;
  switch (c.kind) {
    case 'point': { const r = norm(p); return r > 0 ? scale(p, s / (r * r * r)) : v3(0, 0, 0); }
    case 'shell': { const r = norm(p); return r > c.size ? scale(p, s / (r * r * r)) : v3(0, 0, 0); }
    case 'ball': case 'rising': case 'falling': {
      // Outside, a point charge's; inside, kQ_enc/r² along r̂, Q_enc the ball's own fraction (ballFraction).
      const r = norm(p), R = c.size;
      if (r >= R) return scale(p, s / (r * r * r));
      return r > 0 ? scale(p, s * ballFraction(c.kind, r, R) / (r * r * r)) : v3(0, 0, 0);
    }
    case 'offset': { const q = sub(p, v3(0, 0, c.size)), r = norm(q); return r > 0 ? scale(q, s / (r * r * r)) : v3(0, 0, 0); }
    // 2kλ/s along ŝ, s the distance from the axis.
    case 'line': { const q = v3(p.x, p.y, 0), d = norm(q); return d > 0 ? scale(q, 2 * s / (d * d)) : v3(0, 0, 0); }
    // σ/(2ε₀) = 2πkσ, away from the sheet on either side.
    case 'sheet': return v3(0, 0, p.z === 0 ? 0 : Math.sign(p.z) * 2 * Math.PI * s);
    // Inside the slab ρz/ε₀ = 4πkρz; outside ρa/ε₀, away from it.
    case 'slab': { const a = c.size; return v3(0, 0, Math.abs(p.z) <= a ? 4 * Math.PI * s * p.z : Math.sign(p.z) * 4 * Math.PI * s * a); }
    // A solid cylinder, λ per unit length: 2kλr/R² inside (only the part within r counts), 2kλ/r outside.
    case 'rod': { const q = v3(p.x, p.y, 0), d = norm(q), R = c.size; return d >= R ? scale(q, 2 * s / (d * d)) : scale(q, 2 * s / (R * R)); }
    // A cylindrical shell: nothing inside, the line's field outside.
    case 'tube': { const q = v3(p.x, p.y, 0), d = norm(q); return d > c.size ? scale(q, 2 * s / (d * d)) : v3(0, 0, 0); }
    // Two coaxial shells, λ and −λ: the inner one's field between them, and nothing inside or outside both.
    case 'coax': { const q = v3(p.x, p.y, 0), d = norm(q), b = c.outer ?? c.size * 2; return d > c.size && d < b ? scale(q, 2 * s / (d * d)) : v3(0, 0, 0); }
    // A metal ball: no field in the metal, its charge on its surface, a point charge's field outside.
    case 'metal': { const r = norm(p); return r > c.size ? scale(p, s / (r * r * r)) : v3(0, 0, 0); }
    // A charge q in a hollow of a neutral metal shell: q's field in the hollow, none in the metal, and outside
    // the field of q + (−q) + q = q, from the centre.
    case 'cavity': { const r = norm(p), b = c.outer ?? c.size * 2; return r > 0 && (r < c.size || r > b) ? scale(p, s / (r * r * r)) : v3(0, 0, 0); }
    // σ/ε₀ = 4πkσ just outside a conductor's face, straight out of it; nothing in the metal below.
    case 'face': return v3(0, 0, p.z > 0 ? 4 * Math.PI * s : 0);
    // σ/ε₀ between the plates, from the σ plate toward the −σ one; the two sheets' fields cancel outside.
    case 'plates': return v3(0, 0, p.z < 0 && p.z > -c.size ? -4 * Math.PI * s : 0);
    // Inside the tent slab (ρ₀/ε₀)(z − z|z|/2a), outside ρ₀a/2ε₀, away from it: ε₀ = 1/4π.
    case 'tent': return v3(0, 0, Math.sign(p.z) * 4 * Math.PI * s * tentHalf(p.z, c.size));
    // A finite rod from −ℓ to ℓ on the z axis: k = 1, its pieces added (the integral lesson's sum, in closed form).
    case 'segment': {
      const l = c.size, sq = Math.hypot(p.x, p.y), up = Math.hypot(sq, p.z + l), dn = Math.hypot(sq, p.z - l);
      const Ez = s * (1 / dn - 1 / up);
      if (sq < 1e-12) return v3(0, 0, Math.abs(p.z) > l ? Ez : 0);
      const Es = s / sq * ((p.z + l) / up - (p.z - l) / dn);
      return v3(Es * p.x / sq, Es * p.y / sq, Ez);
    }
    // The halo: Q_enc = 4πρ₀a²(r − a·arctan(r/a)), its field Q_enc/r² (k = 1) along r̂.
    case 'halo': { const r = norm(p), a = c.size; return r > 0 ? scale(p, s * 4 * Math.PI * a * a * (r - a * Math.atan(r / a)) / (r * r * r)) : v3(0, 0, 0); }
    // ρ = β/r: inside, Q_enc = 2πβr² and E = β/(2ε₀) = 2πβ, the same size everywhere; outside, 2πβR²/r².
    case 'cusp': { const r = norm(p), R = c.size; return r === 0 ? v3(0, 0, 0) : r <= R ? scale(p, s * 2 * Math.PI / r) : scale(p, s * 2 * Math.PI * R * R / (r * r * r)); }
    // ρ = ρ₀z/a: inside, (ρ₀/(2ε₀a))(z² − a²) = 2πρ₀(z² − a²)/a along z, the same way on both sides; outside, none.
    case 'oddslab': { const a = c.size; return v3(0, 0, Math.abs(p.z) <= a ? s * 2 * Math.PI * (p.z * p.z - a * a) / a : 0); }
    // A disc of unit σ: added up ring by ring.
    case 'disk': return scale(diskField(c.size, p), s);
    // A charge with a hole is its pieces (fieldAt), and never reaches here.
    case 'ballhole': case 'rodhole': case 'sheethole': return v3(0, 0, 0);
  }
}

/** Complete elliptic integrals of the first and second kinds, K(m) and E(m) with m = k², by the arithmetic-geometric
 * mean: exact to rounding in a handful of steps. */
export function elliptic(m: number): {K: number; E: number} {
  let a = 1, b = Math.sqrt(1 - m), c = Math.sqrt(m), sum = .5 * c * c, pow = .5;
  for (let i = 0; i < 40 && Math.abs(c) > 1e-16; i++) {
    const a1 = (a + b) / 2, b1 = Math.sqrt(a * b);
    c = (a - b) / 2; pow *= 2; sum += pow * c * c;
    a = a1; b = b1;
  }
  const K = Math.PI / (2 * a);
  return {K, E: K * (1 - sum)};
}
/** The field of a ring of charge Q (k = 1) and radius a, about the z axis in the plane z = 0, at a point a distance s
 * from the axis and a height z: its parts along ŝ and ẑ, from the ring's potential 2Q K(m)/(π√((a + s)² + z²)),
 * m = 4as/((a + s)² + z²). */
export function ringField(Q: number, a: number, s: number, z: number): {s: number; z: number} {
  const far = (a + s) ** 2 + z * z, near = (a - s) ** 2 + z * z, m = 4 * a * s / far, root = Math.sqrt(far);
  if (near < 1e-24) return {s: 0, z: 0};
  const {K, E} = elliptic(Math.min(m, 1 - 1e-15));
  const Ez = 2 * Q * z * E / (Math.PI * near * root);
  const Es = s < 1e-12 ? 0 : Q / (Math.PI * s * root) * (K - (a * a - s * s + z * z) / near * E);
  return {s: Es, z: Ez};
}
/** Gauss–Legendre nodes and weights on [−1, 1], by Newton's method on the Legendre polynomial. */
function legendre(n: number): {x: number[]; w: number[]} {
  const x: number[] = [], w: number[] = [];
  for (let i = 1; i <= n; i++) {
    let t = Math.cos(Math.PI * (i - .25) / (n + .5)), dp = 1;
    for (let it = 0; it < 100; it++) {
      let p0 = 1, p1 = t;
      for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * t * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; }
      dp = n * (t * p1 - p0) / (t * t - 1);
      const dt = p1 / dp;
      t -= dt;
      if (Math.abs(dt) < 1e-15) break;
    }
    x.push(t); w.push(2 / ((1 - t * t) * dp * dp));
  }
  return {x, w};
}
const GL = legendre(40);
/** The field of a uniform disc of unit σ (k = 1), radius b, about the z axis in the plane z = 0, at p: its rings of
 * radius a and width da, each carrying σ·2πa da, added by Gauss–Legendre quadrature, split where a ring passes under
 * p. On the axis, the integral lesson's closed form, 2πσ(1 − z/√(z² + b²)) away from the disc. */
export function diskField(b: number, p: V3): V3 {
  const s = Math.hypot(p.x, p.y), z = p.z;
  if (s < 1e-9) return v3(0, 0, z === 0 ? 0 : 2 * Math.PI * (Math.sign(z) - z / Math.hypot(z, b)));
  let Es = 0, Ez = 0;
  const spans: [number, number][] = s < b ? [[0, s], [s, b]] : [[0, b]];
  for (const [lo, hi] of spans) {
    const half = (hi - lo) / 2, mid = (hi + lo) / 2;
    for (let i = 0; i < GL.x.length; i++) {
      const a = mid + half * GL.x[i], f = ringField(2 * Math.PI * a, a, s, z);
      Es += GL.w[i] * half * f.s; Ez += GL.w[i] * half * f.z;
    }
  }
  return v3(Es * p.x / s, Es * p.y / s, Ez);
}
/** The volume two balls share, of radii r1 and r2 with centres d apart. */
export function lensVolume(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return 4 / 3 * Math.PI * Math.min(r1, r2) ** 3;
  return Math.PI * (r1 + r2 - d) ** 2 * (d * d + 2 * d * (r1 + r2) - 3 * (r1 - r2) ** 2) / (12 * d);
}
/** The area two discs share, of radii r1 and r2 with centres d apart. */
export function lensArea(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const clip = (x: number) => Math.max(-1, Math.min(1, x));
  const a = Math.acos(clip((d * d + r1 * r1 - r2 * r2) / (2 * d * r1))), b = Math.acos(clip((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)));
  return r1 * r1 * a + r2 * r2 * b - .5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
}

/** The charge inside a surface, signed, in the same units: the right side of Gauss's law. Each surface is
 * placed as its lesson places it, centred on the charge's centre (or straddling the sheet). */
export function enclosedCharge(c: Charge, g: Surface): number {
  const s = c.sign * (c.hole ? c.amount ?? 1 : 1), h = c.hole;
  // A charge with a hole, in a surface about the whole charge's centre: the whole charge's share, less the part of
  // the hole's plug the surface holds.
  if (h && !g.center) {
    if (c.kind === 'ballhole' && g.kind === 'sphere') return s * (Math.min(1, (g.r / c.size) ** 3) - lensVolume(g.r, h.radius, norm(h.at)) / (4 / 3 * Math.PI * c.size ** 3));
    if (c.kind === 'rodhole' && g.kind === 'cylinder') return s * 2 * g.h * (Math.min(1, (g.r / c.size) ** 2) - lensArea(g.r, h.radius, Math.hypot(h.at.x, h.at.y)) / (Math.PI * c.size ** 2));
    if (c.kind === 'sheethole' && g.kind === 'pillbox') return s * (Math.PI * g.r * g.r - lensArea(g.r, h.radius, Math.hypot(h.at.x, h.at.y)));
  }
  // A point charge off the centre: all of it, or none, as it is inside the surface or not.
  if (c.kind === 'point' && c.at && !g.center) return (c.amount ?? 1) * s * (isInside(g, c.at) ? 1 : 0);
  // A piece about its own centre, which its surface shares: as the piece alone, in proportion to its amount.
  if (c.at || g.center) {
    if (norm(sub(c.at ?? ORIGIN, g.center ?? ORIGIN)) > 1e-9) throw Error(`A ${g.kind} not centred on the ${c.kind} it is drawn round.`);
    return enclosedCharge({...c, at: undefined}, {...g, center: undefined});
  }
  if (c.amount !== undefined) return c.amount * enclosedCharge({...c, amount: undefined}, g);
  if (g.kind === 'sphere') {
    if (c.kind === 'point') return s;
    if (c.kind === 'segment') return s * 2 * Math.min(c.size, g.r);
    if (c.kind === 'halo') return s * 4 * Math.PI * c.size ** 2 * (g.r - c.size * Math.atan(g.r / c.size));
    if (c.kind === 'cusp') return s * 2 * Math.PI * Math.min(g.r, c.size) ** 2;
    if (c.kind === 'shell') return g.r > c.size ? s : 0;
    if (isBall(c.kind)) return s * ballFraction(c.kind, g.r, c.size);
    if (c.kind === 'offset') return g.r > c.size ? s : 0;
    if (c.kind === 'metal') return g.r > c.size ? s : 0;
    // q, then q and the wall's −q, then those and the outer surface's +q.
    if (c.kind === 'cavity') return g.r < c.size || g.r > (c.outer ?? c.size * 2) ? s : 0;
  }
  if (g.kind === 'cylinder') {
    // λ per unit length, over the cylinder's length 2h.
    const L = 2 * g.h;
    if (c.kind === 'line') return s * L;
    if (c.kind === 'segment') return s * 2 * Math.min(c.size, g.h);
    if (c.kind === 'rod') return s * L * Math.min(1, (g.r / c.size) ** 2);
    if (c.kind === 'tube') return g.r > c.size ? s * L : 0;
    if (c.kind === 'coax') return g.r > c.size && g.r < (c.outer ?? c.size * 2) ? s * L : 0;
  }
  if (g.kind === 'pillbox') {
    const A = Math.PI * g.r * g.r;
    if (c.kind === 'sheet' || c.kind === 'face') return s * A;
    if (c.kind === 'slab') return s * A * 2 * Math.min(g.h, c.size);
    // The pillbox straddles the σ plate; once it reaches past the −σ one as well it holds both, and nothing.
    if (c.kind === 'plates') return g.h < c.size ? s * A : 0;
    if (c.kind === 'tent') return s * A * 2 * tentHalf(g.h, c.size);
    // A disc of σ, in a pillbox on its axis: the part of it between the faces.
    if (c.kind === 'disk') return s * Math.PI * Math.min(g.r, c.size) ** 2;
    // From the bottom face up to the top, the part inside the slab: ρ₀A(z₁² − z₀²)/(2a).
    if (c.kind === 'oddslab') { const a = c.size, z1 = Math.max(-a, Math.min(a, g.h)), z0 = Math.max(-a, Math.min(a, g.low ?? -g.h)); return s * A * (z1 * z1 - z0 * z0) / (2 * a); }
  }
  throw Error(`No enclosed charge for a ${g.kind} round a ${c.kind}.`);
}

/** A pillbox whose field crosses only one face: one face in a conductor's metal, or out beyond both of a
 * capacitor's plates, where there is no field. */
export const oneSided = (c?: Pick<Charge, 'kind'>) => c?.kind === 'face' || c?.kind === 'plates' || c?.kind === 'oddslab';
/** The left side's area: the part of the surface the field crosses, where E is the same and square to it.
 * A sphere's whole area; a cylinder's wall; a pillbox's two faces, or its one face where the other sees no field. */
export function crossedArea(g: Surface, c?: Pick<Charge, 'kind'>): number {
  return g.kind === 'cube' ? 24 * g.h * g.h : g.kind === 'sphere' ? 4 * Math.PI * g.r * g.r : g.kind === 'cylinder' ? 2 * Math.PI * g.r * 2 * g.h : (oneSided(c) ? 1 : 2) * Math.PI * g.r * g.r;
}
/** The solve: the field's component along the outward normal on the crossed part, from Q_enc/ε₀ = E·(area). */
export const solvedField = (c: Charge, g: Surface) => enclosedCharge(c, g) / EPS0 / crossedArea(g, c);
/** The point P where a case wants the field, on its surface, and the outward normal there: on a sphere's or a
 * cylinder's side, level with the centre; on a pillbox's top face, or its bottom face between a capacitor's
 * plates, where the field is. */
export function pointOn(g: Surface, c?: Pick<Charge, 'kind'>): {at: V3; normal: V3} {
  if (g.kind !== 'pillbox') return {at: v3(g.r, 0, 0), normal: v3(1, 0, 0)};
  return c?.kind === 'plates' ? {at: v3(0, 0, -g.h), normal: v3(0, 0, -1)} : {at: v3(0, 0, g.h), normal: v3(0, 0, 1)};
}
/** The charge on each surface of a conductor, the cavity's wall and the outside, for a charge `q` in the
 * cavity and a net charge `net` on the metal: the wall takes −q, so a surface in the metal round the cavity
 * encloses nothing, and the outer surface takes what is left, net + q. */
export const inducedCharges = (q: number, net: number) => ({wall: -q, outer: net + q});
/** The density the cavity's wall takes for a point charge q a distance d from the centre of a spherical cavity
 * of radius a, at the angle θ from the line through the charge: the image solution, −q(a² − d²)/(4πa(a² + d² −
 * 2ad cos θ)^{3/2}). It is the same whether the metal is earthed or not, crowds toward the charge, and adds up to
 * −q over the wall. */
export function wallDensity(q: number, d: number, a: number, theta: number): number {
  return -q * (a * a - d * d) / (4 * Math.PI * a * (a * a + d * d - 2 * a * d * Math.cos(theta)) ** 1.5);
}

/** A patch of a closed surface, as the figure draws it: its centre, its outward normal, its area, its four
 * corners (or three, at a pole), and which part of the surface it is. */
export type PatchPart = 'sphere' | 'wall' | 'top' | 'bottom' | 'east' | 'west' | 'north' | 'south';
export type Patch = {center: V3; normal: V3; area: number; corners: V3[]; part: PatchPart; key: string;
  /** The patch's parameter ranges, [u0, u1, v0, v1]: polar angle and azimuth on a sphere, height and azimuth on
   * a wall, radius and azimuth on a cap (see `surfacePoint`). */
  uv: [number, number, number, number];
  /** A flat rectangle: a cube's patch, whose flux from a point charge is its solid angle. */
  square?: boolean};
/** How the figure cuts each surface: bands and sectors. Few enough to read one by one. */
export const CUT = {sphere: {bands: 4, sectors: 8}, cylinder: {bands: 2, sectors: 8, rings: 1}, pillbox: {bands: 2, sectors: 8, rings: 1}, cube: {bands: 2, sectors: 2}} as const;

const sph = (r: number, th: number, ph: number) => v3(r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th));
/** The surface cut into patches. Each patch's normal is the outward one at its centre; its area is exact. */
export function patches(g: Surface, cut: {bands: number; sectors: number; rings?: number} = CUT[g.kind]): Patch[] {
  if (g.center) {
    const o = g.center, to = (p: V3) => add(p, o);
    return patches({...g, center: undefined}, cut).map(p => ({...p, center: to(p.center), corners: p.corners.map(to)}));
  }
  const out: Patch[] = [];
  const {bands, sectors} = cut;
  if (g.kind === 'cube') {
    // Six faces, each cut into bands by bands squares; on each face (u, v) are the two coordinates surfacePoint takes.
    const h = g.h, n = bands, step = 2 * h / n;
    for (const part of CUBE_FACES) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const u0 = -h + i * step, u1 = u0 + step, v0 = -h + j * step, v1 = v0 + step, at = (u: number, v: number) => surfacePoint(g, part, u, v);
      out.push({center: at((u0 + u1) / 2, (v0 + v1) / 2), normal: CUBE_NORMAL[part], area: step * step, corners: [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], part, key: `${part}${i}-${j}`, uv: [u0, u1, v0, v1], square: true});
    }
    return out;
  }
  if (g.kind === 'sphere') {
    for (let i = 0; i < bands; i++) for (let j = 0; j < sectors; j++) {
      const t0 = Math.PI * i / bands, t1 = Math.PI * (i + 1) / bands, p0 = 2 * Math.PI * j / sectors, p1 = 2 * Math.PI * (j + 1) / sectors;
      const tm = (t0 + t1) / 2, pm = (p0 + p1) / 2;
      const corners = [sph(g.r, t0, p0), sph(g.r, t0, p1), sph(g.r, t1, p1), sph(g.r, t1, p0)];
      out.push({center: sph(g.r, tm, pm), normal: sph(1, tm, pm), area: g.r * g.r * (Math.cos(t0) - Math.cos(t1)) * (p1 - p0), corners, part: 'sphere', key: `s${i}-${j}`, uv: [t0, t1, p0, p1]});
    }
    return out;
  }
  const {r, h} = g, rings = cut.rings ?? 1, lo = g.low ?? -h;
  for (let i = 0; i < bands; i++) for (let j = 0; j < sectors; j++) {
    const z0 = lo + (h - lo) * i / bands, z1 = lo + (h - lo) * (i + 1) / bands, p0 = 2 * Math.PI * j / sectors, p1 = 2 * Math.PI * (j + 1) / sectors, pm = (p0 + p1) / 2;
    const at = (z: number, ph: number) => v3(r * Math.cos(ph), r * Math.sin(ph), z);
    out.push({center: at((z0 + z1) / 2, pm), normal: v3(Math.cos(pm), Math.sin(pm), 0), area: r * (p1 - p0) * (z1 - z0), corners: [at(z0, p0), at(z0, p1), at(z1, p1), at(z1, p0)], part: 'wall', key: `w${i}-${j}`, uv: [z0, z1, p0, p1]});
  }
  for (const [part, z] of [['top', h], ['bottom', lo]] as const) for (let i = 0; i < rings; i++) for (let j = 0; j < sectors; j++) {
    const a0 = r * i / rings, a1 = r * (i + 1) / rings, p0 = 2 * Math.PI * j / sectors, p1 = 2 * Math.PI * (j + 1) / sectors, pm = (p0 + p1) / 2;
    const at = (a: number, ph: number) => v3(a * Math.cos(ph), a * Math.sin(ph), z);
    // The centroid of an annular sector lies a little out from its middle radius; the middle is close enough to draw.
    const corners = i === 0 ? [at(0, pm), at(a1, p0), at(a1, p1)] : [at(a0, p0), at(a1, p0), at(a1, p1), at(a0, p1)];
    out.push({center: at(i === 0 ? a1 * 2 / 3 : (a0 + a1) / 2, pm), normal: v3(0, 0, part === 'top' ? 1 : -1), area: (a1 * a1 - a0 * a0) / 2 * (p1 - p0), corners, part, key: `${part[0]}${i}-${j}`, uv: [a0, a1, p0, p1]});
  }
  return out;
}
/** A point of a surface's part from its two parameters, as `uv` gives them. */
export function surfacePoint(g: Surface, part: PatchPart, u: number, v: number): V3 {
  if (g.center) return add(surfacePoint({...g, center: undefined}, part, u, v), g.center);
  if (g.kind === 'cube') {
    const h = g.h;
    // Top and bottom: (x, y). East and west, x = ±h: (z, y). North and south, y = ±h: (z, x).
    return part === 'top' ? v3(u, v, h) : part === 'bottom' ? v3(u, v, -h) : part === 'east' ? v3(h, v, u) : part === 'west' ? v3(-h, v, u) : part === 'north' ? v3(v, h, u) : v3(v, -h, u);
  }
  if (part === 'sphere') return sph(g.r, u, v);
  if (part === 'wall') return v3(g.r * Math.cos(v), g.r * Math.sin(v), u);
  return v3(u * Math.cos(v), u * Math.sin(v), part === 'top' ? g.h : g.low ?? -g.h);
}
/** The flux of a point charge q (k = 1) on the z axis at height d through the band of a sphere of radius R, centred
 * on the origin, between polar angles θ₀ < θ₁, outward. Exact: with u = cos θ and s the distance from the charge,
 * E·n̂ = q(R − du)/s³, whose integral over the band is −(πq/d)[G(s)] taken from θ₁'s edge to θ₀'s, where
 * G(s) = s − (R² − d²)/s. Its total over the sphere is 4πq = q/ε₀ for d < R and zero for d > R. */
export function bandFlux(q: number, d: number, R: number, th0: number, th1: number): number {
  if (Math.abs(d) < 1e-12) return q * 2 * Math.PI * (Math.cos(th0) - Math.cos(th1));
  const G = (u: number) => { const s = Math.sqrt(Math.max(0, R * R + d * d - 2 * R * d * u)); return s - (R * R - d * d) / s; };
  return -(Math.PI * q / d) * (G(Math.cos(th0)) - G(Math.cos(th1)));
}
/** What a patch carries through itself, per unit area: E·n̂ at its centre wherever E·n̂ is the same all over the
 * part it lies on, and, for a charge off the centre of a sphere, the patch's exact flux over its area (its band's,
 * shared by the band's sectors, since the field is the same turned about the axis through the charge). So the
 * drawn patches add to the flux exactly, either way. */
export function throughPatch(c: Charge, p: Patch): number {
  // A finite rod, through a closed cylinder on its axis: the wall's and the caps' integrals in closed form, since
  // E_s·r and E_z·s each have an antiderivative (k = 1). So the patches add to 2λℓ/ε₀ exactly, though E varies on each.
  if (c.kind === 'segment' && !c.at && (p.part === 'wall' || p.part === 'top' || p.part === 'bottom')) {
    const l = c.size, [u0, u1, v0, v1] = p.uv, dphi = v1 - v0;
    if (p.part === 'wall') {
      const r = Math.hypot(p.center.x, p.center.y), F = (z: number) => Math.hypot(r, z + l) - Math.hypot(r, z - l);
      return c.sign * dphi * (F(u1) - F(u0)) / p.area;
    }
    const zc = p.center.z, nz = p.normal.z, G = (a: number) => Math.hypot(a, zc - l) - Math.hypot(a, zc + l);
    return c.sign * nz * dphi * (G(u1) - G(u0)) / p.area;
  }
  // A point charge, through a cube's flat face: its charge times the solid angle the patch fills, exactly.
  if (c.kind === 'point' && p.square) {
    const q = c.at ?? ORIGIN, n = p.normal, e1 = unit(sub(p.corners[1], p.corners[0])), e2 = unit(sub(p.corners[3], p.corners[0]));
    const D = dot(sub(p.center, q), n), foot = sub(p.corners[0], q), a0 = dot(foot, e1), b0 = dot(foot, e2);
    const side1 = norm(sub(p.corners[1], p.corners[0])), side2 = norm(sub(p.corners[3], p.corners[0]));
    return c.sign * (c.amount ?? 1) * rectangleAngle(D, a0, a0 + side1, b0, b0 + side2) / p.area;
  }
  if (c.kind === 'offset' && p.part === 'sphere') {
    const r = norm(p.center), [t0, t1, p0, p1] = p.uv;
    return bandFlux(c.sign, c.size, r, t0, t1) * (p1 - p0) / (2 * Math.PI) / p.area;
  }
  return dot(fieldAt(c, p.center), p.normal);
}
/** A patch where the field lies along the surface, or is zero: it carries no flux, and the figure lights it so. */
export function carriesNothing(c: Charge, p: Patch) {
  const e = fieldAt(c, p.center), m = norm(e);
  return m < 1e-12 || Math.abs(dot(e, p.normal)) < 1e-9 * m;
}

/** The flux through a surface by brute force: a fine midpoint sum over a fine cut, independent of the closed
 * forms above except for E itself. For the tests and the node check, never for drawing. */
export function numericFlux(c: Charge, g: Surface, fine = 240): number {
  const cut = g.kind === 'sphere' ? {bands: fine, sectors: 2 * fine} : {bands: fine, sectors: 2 * fine, rings: fine};
  let total = 0;
  if (g.kind === 'cube') {
    for (const p of patches(g, {bands: fine, sectors: fine})) total += dot(fieldAt(c, p.center), p.normal) * p.area;
    return total;
  }
  if (g.kind === 'sphere') {
    // Midpoint in θ and φ, with the exact band area: converges for any field whose E·n̂ is smooth on the sphere.
    // E itself, never throughPatch, so the check stays independent of the closed forms.
    for (const p of patches(g, cut)) total += dot(fieldAt(c, p.center), p.normal) * p.area;
    return total;
  }
  // The caps' annular sectors, with the field taken at each one's mid radius.
  const o = g.center ?? ORIGIN;
  for (const p of patches(g, cut)) {
    if (p.part === 'wall') { total += dot(fieldAt(c, p.center), p.normal) * p.area; continue; }
    const local = sub(p.center, o), a = Math.hypot(local.x, local.y), mid = p.corners.length === 3 ? a * 3 / 4 : a;
    const at = a > 0 ? scale(v3(local.x, local.y, 0), mid / a) : v3(0, 0, 0);
    total += dot(fieldAt(c, add(o, v3(at.x, at.y, local.z))), p.normal) * p.area;
  }
  return total;
}

/** The flux of point charges through any star-shaped closed surface round `center`, whose radius in each
 * direction is `radius(azimuth, polar)`: the "any shape" half of the flux lesson, done by quadrature over
 * the directions. Charges are {at, q}, k = 1. */
export function starFlux(charges: {at: V3; q: number}[], center: V3, radius: (az: number, polar: number) => number, n = 400): number {
  let total = 0;
  const dT = Math.PI / n, dP = 2 * Math.PI / (2 * n), eps = 1e-5;
  const X = (az: number, pol: number) => add(center, sph(radius(az, pol), pol, az));
  for (let i = 0; i < n; i++) for (let j = 0; j < 2 * n; j++) {
    const pol = (i + .5) * dT, az = (j + .5) * dP, x = X(az, pol);
    const xt = scale(sub(X(az, pol + eps), X(az, pol - eps)), 1 / (2 * eps)), xp = scale(sub(X(az + eps, pol), X(az - eps, pol)), 1 / (2 * eps));
    const dA = scale(cross(xt, xp), dT * dP); // θ then φ: outward for a star-shaped surface
    let e = v3(0, 0, 0);
    for (const ch of charges) { const d = sub(x, ch.at), r = norm(d); e = add(e, scale(d, ch.q / (r * r * r))); }
    total += dot(e, dA);
  }
  return total;
}

/** A cube's six faces, and each one's outward normal. */
export type CubeFace = 'top' | 'bottom' | 'east' | 'west' | 'north' | 'south';
export const CUBE_FACES: readonly CubeFace[] = ['top', 'bottom', 'east', 'west', 'north', 'south'];
const CUBE_NORMAL: Record<CubeFace, V3> = {top: v3(0, 0, 1), bottom: v3(0, 0, -1), east: v3(1, 0, 0), west: v3(-1, 0, 0), north: v3(0, 1, 0), south: v3(0, -1, 0)};
/** The solid angle a rectangle fills, seen from a point a distance D from its plane (D > 0 on the side its normal
 * points away from), the rectangle spanning [u0, u1] by [v0, v1] measured from the foot of the perpendicular. Each
 * corner contributes arctan(uv/(D√(D² + u² + v²))); a whole plane fills 2π. */
export function rectangleAngle(D: number, u0: number, u1: number, v0: number, v1: number): number {
  const F = (u: number, v: number) => Math.atan(u * v / (D * Math.sqrt(D * D + u * u + v * v)));
  return F(u1, v1) - F(u0, v1) - F(u1, v0) + F(u0, v0);
}
/** Whether a point is inside a closed surface centred on the origin. */
function isInside(g: Surface, p: V3): boolean {
  if (g.kind === 'sphere') return norm(p) < g.r;
  if (g.kind === 'cube') return Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) < g.h;
  return Math.hypot(p.x, p.y) < g.r && Math.abs(p.z) < g.h;
}
