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
 * - `tent`: a slab whose density falls from its middle plane to zero at its faces, ρ = ρ₀(1 − |z|/a). */
export type ChargeKind = 'point' | 'shell' | 'ball' | 'line' | 'sheet' | 'slab' | 'rod' | 'tube' | 'coax' | 'metal' | 'cavity' | 'face' | 'plates'
  | 'offset' | 'rising' | 'falling' | 'tent';
export type Charge = {kind: ChargeKind; sign: 1 | -1; size: number; outer?: number};
/** Where the field's formula changes, in the slider's coordinate (a radius, or a height): the surfaces of the
 * charge. The profile under the figure marks them, and a case names the regions between them. */
export function boundaries(c: Pick<Charge, 'kind' | 'size' | 'outer'>): number[] {
  switch (c.kind) {
    case 'ball': case 'shell': case 'rod': case 'tube': case 'metal': case 'slab': case 'plates': case 'rising': case 'falling': case 'tent': return [c.size];
    case 'coax': case 'cavity': return [c.size, c.outer ?? c.size * 2];
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
export type SurfaceKind = 'sphere' | 'cylinder' | 'pillbox';
export type Surface = {kind: SurfaceKind; r: number; h: number};

/** The exact field of each distribution at a point, by the closed forms Gauss's law gives (and the integral
 * lessons confirm for the line and the sheet): k = 1. */
export function fieldAt(c: Charge, p: V3): V3 {
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
  }
}

/** The charge inside a surface, signed, in the same units: the right side of Gauss's law. Each surface is
 * placed as its lesson places it, centred on the charge's centre (or straddling the sheet). */
export function enclosedCharge(c: Charge, g: Surface): number {
  const s = c.sign;
  if (g.kind === 'sphere') {
    if (c.kind === 'point') return s;
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
  }
  throw Error(`No enclosed charge for a ${g.kind} round a ${c.kind}.`);
}

/** A pillbox whose field crosses only one face: one face in a conductor's metal, or out beyond both of a
 * capacitor's plates, where there is no field. */
export const oneSided = (c?: Pick<Charge, 'kind'>) => c?.kind === 'face' || c?.kind === 'plates';
/** The left side's area: the part of the surface the field crosses, where E is the same and square to it.
 * A sphere's whole area; a cylinder's wall; a pillbox's two faces, or its one face where the other sees no field. */
export function crossedArea(g: Surface, c?: Pick<Charge, 'kind'>): number {
  return g.kind === 'sphere' ? 4 * Math.PI * g.r * g.r : g.kind === 'cylinder' ? 2 * Math.PI * g.r * 2 * g.h : (oneSided(c) ? 1 : 2) * Math.PI * g.r * g.r;
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
export type PatchPart = 'sphere' | 'wall' | 'top' | 'bottom';
export type Patch = {center: V3; normal: V3; area: number; corners: V3[]; part: PatchPart; key: string;
  /** The patch's parameter ranges, [u0, u1, v0, v1]: polar angle and azimuth on a sphere, height and azimuth on
   * a wall, radius and azimuth on a cap (see `surfacePoint`). */
  uv: [number, number, number, number]};
/** How the figure cuts each surface: bands and sectors. Few enough to read one by one. */
export const CUT = {sphere: {bands: 4, sectors: 8}, cylinder: {bands: 2, sectors: 8, rings: 1}, pillbox: {bands: 2, sectors: 8, rings: 1}} as const;

const sph = (r: number, th: number, ph: number) => v3(r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th));
/** The surface cut into patches. Each patch's normal is the outward one at its centre; its area is exact. */
export function patches(g: Surface, cut: {bands: number; sectors: number; rings?: number} = CUT[g.kind]): Patch[] {
  const out: Patch[] = [];
  const {bands, sectors} = cut;
  if (g.kind === 'sphere') {
    for (let i = 0; i < bands; i++) for (let j = 0; j < sectors; j++) {
      const t0 = Math.PI * i / bands, t1 = Math.PI * (i + 1) / bands, p0 = 2 * Math.PI * j / sectors, p1 = 2 * Math.PI * (j + 1) / sectors;
      const tm = (t0 + t1) / 2, pm = (p0 + p1) / 2;
      const corners = [sph(g.r, t0, p0), sph(g.r, t0, p1), sph(g.r, t1, p1), sph(g.r, t1, p0)];
      out.push({center: sph(g.r, tm, pm), normal: sph(1, tm, pm), area: g.r * g.r * (Math.cos(t0) - Math.cos(t1)) * (p1 - p0), corners, part: 'sphere', key: `s${i}-${j}`, uv: [t0, t1, p0, p1]});
    }
    return out;
  }
  const {r, h} = g, rings = cut.rings ?? 1;
  for (let i = 0; i < bands; i++) for (let j = 0; j < sectors; j++) {
    const z0 = -h + 2 * h * i / bands, z1 = -h + 2 * h * (i + 1) / bands, p0 = 2 * Math.PI * j / sectors, p1 = 2 * Math.PI * (j + 1) / sectors, pm = (p0 + p1) / 2;
    const at = (z: number, ph: number) => v3(r * Math.cos(ph), r * Math.sin(ph), z);
    out.push({center: at((z0 + z1) / 2, pm), normal: v3(Math.cos(pm), Math.sin(pm), 0), area: r * (p1 - p0) * (z1 - z0), corners: [at(z0, p0), at(z0, p1), at(z1, p1), at(z1, p0)], part: 'wall', key: `w${i}-${j}`, uv: [z0, z1, p0, p1]});
  }
  for (const [part, z] of [['top', h], ['bottom', -h]] as const) for (let i = 0; i < rings; i++) for (let j = 0; j < sectors; j++) {
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
  if (part === 'sphere') return sph(g.r, u, v);
  if (part === 'wall') return v3(g.r * Math.cos(v), g.r * Math.sin(v), u);
  return v3(u * Math.cos(v), u * Math.sin(v), part === 'top' ? g.h : -g.h);
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
  if (g.kind === 'sphere') {
    // Midpoint in θ and φ, with the exact band area: converges for any field whose E·n̂ is smooth on the sphere.
    // E itself, never throughPatch, so the check stays independent of the closed forms.
    for (const p of patches(g, cut)) total += dot(fieldAt(c, p.center), p.normal) * p.area;
    return total;
  }
  // The caps' annular sectors, with the field taken at each one's mid radius.
  for (const p of patches(g, cut)) {
    if (p.part === 'wall') { total += dot(fieldAt(c, p.center), p.normal) * p.area; continue; }
    const a = Math.hypot(p.center.x, p.center.y), mid = p.corners.length === 3 ? a * 3 / 4 : a;
    const at = a > 0 ? scale(v3(p.center.x, p.center.y, 0), mid / a) : v3(0, 0, 0);
    total += dot(fieldAt(c, v3(at.x, at.y, p.center.z)), p.normal) * p.area;
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
