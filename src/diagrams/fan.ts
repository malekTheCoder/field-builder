export type Point = {x: number; y: number};
export type Rect = {x: number; y: number; width: number; height: number};
/** The angular fan a partition makes at the observation point.
 *
 * WHY THIS EXISTS. Three lessons cut a charge distribution that runs to infinity, and they cut it
 * the way the derivation does: equal steps in the angle θ of the substitution y = r tan θ. That is
 * the right partition -- on the two line lessons it gives every piece an identical |ΔE|, which is
 * the whole reason the improper integral is tractable -- but it makes the OUTER PIECES ENORMOUS.
 * At five pieces the infinite line's first and last run from ±4.1 m out to the truncation, their
 * centres of charge sit 9.2 m away, and the figure drew them as bands 33 000 pixels long inside a
 * 626-pixel window. Not one of those pixels is a piece a reader can point at, and pointing at one
 * piece is the first move of every lesson here.
 *
 * Windowing the drawing does not fix it: the piece's own centre is outside the window, so there is
 * nothing in the picture to label. What IS always in the picture is the ANGLE the piece subtends
 * at P -- because the partition is an angular one, and angles at P do not run off the page. A
 * piece becomes the wedge between two rays out of P. The far wedges narrow toward the line's own
 * direction and never leave the frame, however far out the charge they name happens to lie.
 *
 * This is not a workaround for a drawing problem. It is the substitution the lesson teaches, drawn
 * instead of asserted: the reader sees the infinite line resolved into a finite fan of angles.
 *
 * Kept free of the camera and of React so it can be checked with arithmetic. */
const EPS = 1e-9;
export const sub = (a: Point, b: Point): Point => ({x: a.x - b.x, y: a.y - b.y});
/** Unit vector, or null when the two points coincide and there is no direction to speak of. */
export function unit(v: Point): Point | null {
  const len = Math.hypot(v.x, v.y);
  return len < EPS ? null : {x: v.x / len, y: v.y / len};
}
/** How far a ray from `from` in direction `dir` travels before it leaves `rect`.
 *
 * Infinity when the ray never leaves -- which cannot happen for a direction of unit length inside
 * a finite rect, but is returned rather than guessed at so a caller that starts outside the rect
 * gets an answer it can test. */
export function exitDistance(from: Point, dir: Point, rect: Rect): number {
  let best = Infinity;
  const slab = (o: number, d: number, lo: number, hi: number) => {
    if (Math.abs(d) < EPS) return;
    for (const edge of [lo, hi]) {
      const t = (edge - o) / d;
      if (t > EPS && t < best) best = t;
    }
  };
  slab(from.x, dir.x, rect.x, rect.x + rect.width);
  slab(from.y, dir.y, rect.y, rect.y + rect.height);
  return best;
}
/** Where a ray from `from` leaves `rect`. Clamped back into the rect so rounding cannot put the
 * endpoint a hair outside and have the clip swallow the whole line. */
export function rayToEdge(from: Point, dir: Point, rect: Rect): Point {
  const d = exitDistance(from, dir, rect);
  const far = Number.isFinite(d) ? d : Math.hypot(rect.width, rect.height) * 2;
  return {
    x: Math.min(Math.max(from.x + dir.x * far, rect.x), rect.x + rect.width),
    y: Math.min(Math.max(from.y + dir.y * far, rect.y), rect.y + rect.height),
  };
}
/** Sutherland–Hodgman against one half-plane, kept inside because nothing else needs it. */
function clipHalf(poly: Point[], inside: (p: Point) => boolean, cross: (a: Point, b: Point) => Point): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ain = inside(a), bin = inside(b);
    if (ain) out.push(a);
    if (ain !== bin) out.push(cross(a, b));
  }
  return out;
}
/** The wedge between two rays out of `from`, clipped to `rect`.
 *
 * Built as a triangle reaching well past the frame and then clipped, rather than by walking the
 * frame's corners by hand: a wedge can span two corners, or none, or open backwards, and every
 * hand-rolled version of that has a case it gets wrong. Returns [] when the wedge misses the rect
 * entirely, so a caller can simply not draw it. */
export function wedgePath(from: Point, a: Point, b: Point, rect: Rect): Point[] {
  const reach = (Math.hypot(rect.width, rect.height) + Math.hypot(from.x - rect.x, from.y - rect.y)) * 4;
  let poly: Point[] = [from, {x: from.x + a.x * reach, y: from.y + a.y * reach}, {x: from.x + b.x * reach, y: from.y + b.y * reach}];
  const [x0, y0, x1, y1] = [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height];
  const lerpX = (p: Point, q: Point, x: number): Point => ({x, y: p.y + (q.y - p.y) * (x - p.x) / (q.x - p.x || EPS)});
  const lerpY = (p: Point, q: Point, y: number): Point => ({x: p.x + (q.x - p.x) * (y - p.y) / (q.y - p.y || EPS), y});
  poly = clipHalf(poly, p => p.x >= x0, (p, q) => lerpX(p, q, x0));
  poly = clipHalf(poly, p => p.x <= x1, (p, q) => lerpX(p, q, x1));
  poly = clipHalf(poly, p => p.y >= y0, (p, q) => lerpY(p, q, y0));
  poly = clipHalf(poly, p => p.y <= y1, (p, q) => lerpY(p, q, y1));
  return poly;
}
/** Area of a polygon, for asking whether a wedge is big enough to be worth drawing or clicking. */
export function area(poly: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}
