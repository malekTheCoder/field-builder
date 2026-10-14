import {describe, expect, it} from 'vitest';
/* THE QUIZ'S PHYSICS, CHECKED BY NUMBER. Every question in src/quiz/bank that states a result, a limit or a
 * comparison is checked here by brute force: the charge cut into many point charges and their fields added
 * as vectors, with nothing from the lessons' algebra assumed. A claim the bank makes and a sum that disagrees
 * is a wrong question, however well it reads. k = 1 throughout. */
const k = 1;
/** The field at (px, py) of a straight charge on the y-axis from a to b, with density lam(y): a midpoint sum in
 * u, with y = py + d sinh u, so the pieces are short near P and long far away, as an endless line needs. */
function line(px: number, py: number, a: number, b: number, lam: (y: number) => number, n = 200000) {
 let ex = 0, ey = 0;
 const d = Math.abs(px), u0 = Math.asinh((a - py) / d), u1 = Math.asinh((b - py) / d), du = (u1 - u0) / n;
 for (let i = 0; i < n; i++) {
  const u = u0 + (i + .5) * du, y = py + d * Math.sinh(u), dy = d * Math.cosh(u) * du, dyp = py - y, r = Math.hypot(px, dyp), q = lam(y) * dy;
  ex += k * q * px / r ** 3; ey += k * q * dyp / r ** 3;
 }
 return {ex, ey};
}
/** The field on the axis of a ring of radius R and charge Q, at height z, cut into n point charges (or a part of it). */
function ring(R: number, Q: number, z: number, n: number, from = 0, to = 2 * Math.PI) {
 let ex = 0, ey = 0, ez = 0;
 const dt = (to - from) / n, q = Q / (2 * Math.PI) * dt;
 for (let i = 0; i < n; i++) {
  const t = from + (i + .5) * dt, x = -R * Math.cos(t), y = -R * Math.sin(t), r = Math.hypot(R, z);
  ex += k * q * x / r ** 3; ey += k * q * y / r ** 3; ez += k * q * z / r ** 3;
 }
 return {ex, ey, ez};
}
const close = (a: number, b: number, tol = 1e-3) => expect(Math.abs(a - b) / Math.max(Math.abs(b), 1e-12)).toBeLessThan(tol);

describe('the finite line, on its bisector', () => {
 const L = 2, Q = 3, lam = Q / L;
 const exact = (r: number) => k * Q / (r * Math.sqrt((L / 2) ** 2 + r ** 2));
 it('has the lesson’s field, along x only', () => {
  for (const r of [.3, 1, 4]) { const f = line(r, 0, -L / 2, L / 2, () => lam); close(f.ex, exact(r)); expect(Math.abs(f.ey)).toBeLessThan(1e-9); }
 });
 it('looks like a point charge far away, kQ/r², and not like 2kλ/r', () => {
  const r = 400; close(line(r, 0, -L / 2, L / 2, () => lam, 2000).ex, k * Q / r ** 2, 1e-4);
  expect(Math.abs(exact(r) - 2 * k * lam / r) / exact(r)).toBeGreaterThan(10);
 });
 it('grown at fixed λ tends to 2kλ/r; grown at fixed Q tends to zero', () => {
  const r = 1, big = 1e5;
  close(k * lam * big / (r * Math.sqrt((big / 2) ** 2 + r ** 2)), 2 * k * lam / r, 1e-4);
  expect(k * Q / (r * Math.sqrt((big / 2) ** 2 + r ** 2))).toBeLessThan(1e-4);
  // Half the rod's bounds, 0 to L/2, give half: kλ/r for the endless line.
  close(line(r, 0, 0, 2000, () => lam).ex, k * lam / r, 1e-3);
 });
 it('after y = r tan α the integrand is (kλ/r) cos α dα; without the Jacobian it is (kλ/r²) cos³α dα', () => {
  const r = 1.7;
  for (const a of [-1.2, -.3, .4, 1.1]) {
   const y = r * Math.tan(a), dyda = r / Math.cos(a) ** 2, integrand = k * lam * r / (y * y + r * r) ** 1.5;
   close(integrand * dyda, k * lam * Math.cos(a) / r, 1e-12);
   close(integrand, k * lam * Math.cos(a) ** 3 / r ** 2, 1e-12);
  }
 });
 it('integrates over -L/2 to L/2: -L to L or 0 to L give another rod’s field', () => {
  const r = 1, f = (a: number, b: number) => line(r, 0, a, b, () => lam, 20000).ex;
  close(f(-L / 2, L / 2), exact(r));
  expect(Math.abs(f(-L, L) - exact(r))).toBeGreaterThan(.1);
  close(2 * f(0, L / 2), exact(r));
 });
 it('with P raised off the bisector, a part along the rod survives, away from the longer side for a positive rod', () => {
  const f = line(1, .4, -L / 2, L / 2, () => lam);
  expect(Math.abs(f.ey)).toBeGreaterThan(.05);
  expect(f.ey).toBeGreaterThan(0); // more rod below P: its pieces push P up, along +y
 });
 it('denser near the top: E_y no longer vanishes, though every piece still has a mirror', () => {
  const f = line(1, 0, -L / 2, L / 2, y => lam * (1 + .8 * y));
  expect(Math.abs(f.ey)).toBeGreaterThan(.05);
 });
 it('a negative rod’s field points along x toward the rod', () => {
  const f = line(1, 0, -L / 2, L / 2, () => -lam);
  expect(f.ex).toBeLessThan(0); expect(Math.abs(f.ey)).toBeLessThan(1e-9);
 });
});

describe('the ring, on its axis', () => {
 const R = 1.3, Q = 2;
 const exact = (z: number) => k * Q * z / (R * R + z * z) ** 1.5;
 it('is exact along the axis at any cut, however few the pieces', () => {
  for (const n of [1, 2, 3, 5, 40]) close(ring(R, Q, .8, n).ez, exact(.8), 1e-12);
  // and from three pieces up the sideways parts cancel; with one piece they do not
  const three = ring(R, Q, .8, 3); expect(Math.hypot(three.ex, three.ey)).toBeLessThan(1e-12);
  const one = ring(R, Q, .8, 1); expect(Math.hypot(one.ex, one.ey)).toBeGreaterThan(.1);
 });
 it('is zero at the centre, not kQ/R², and finite there', () => {
  const c = ring(R, Q, 0, 400); expect(Math.hypot(c.ex, c.ey, c.ez)).toBeLessThan(1e-12);
 });
 it('tends to kQ/z² far up the axis; the sideways projection would give kQR/z³', () => {
  const z = 500; close(exact(z), k * Q / z ** 2, 1e-4);
  close(k * Q * R / (R * R + z * z) ** 1.5, k * Q * R / z ** 3, 1e-4);
 });
 it('rises, peaks at R/√2, then falls to zero as P comes down to the centre', () => {
  let best = 0, at = 0;
  for (let z = 0; z <= 6 * R; z += 1e-4) { const e = exact(z); if (e > best) { best = e; at = z; } }
  close(at, R / Math.SQRT2, 1e-3);
  expect(exact(3 * R)).toBeLessThan(best); expect(exact(.05 * R)).toBeLessThan(best);
  // the distance to P does change as P moves
  expect(Math.hypot(R, 2)).not.toBe(Math.hypot(R, 1));
 });
 it('a negative ring pulls P’s field down the axis toward its centre', () => {
  expect(ring(R, -Q, .7, 64).ez).toBeLessThan(0);
 });
 it('half a ring, with its own charge as it was: the axial part halves and a sideways part appears', () => {
  const half = ring(R, Q, .7, 4000, 0, Math.PI); // the half with y > 0, at the same density: half the charge
  close(half.ez, exact(.7) / 2, 1e-6);
  expect(Math.abs(half.ey)).toBeGreaterThan(.05);
  expect(half.ey).toBeLessThan(0); // away from the half that is left, for a positive charge
 });
 it('needs θ from 0 to 2π: λR dθ over a full turn is Q, over half a turn Q/2', () => {
  const lam = Q / (2 * Math.PI * R);
  close(lam * R * 2 * Math.PI, Q, 1e-12); close(lam * R * Math.PI, Q / 2, 1e-12);
 });
});

describe('the infinite line', () => {
 const lam = 1.5;
 const endless = (r: number, a = -1e5, b = 1e5) => line(r, 0, a, b, () => lam, 400000);
 it('is 2kλ/r, so doubling r halves it', () => {
  // the stretch beyond ±1e5 adds a part of order r/1e5 of the whole
  close(endless(1).ex, 2 * k * lam / 1, 1e-3);
  close(endless(2).ex / endless(1).ex, .5, 2e-3);
 });
 it('a piece Δθ wide at angle θ is r sec²θ Δθ long, r sec θ from P, and every one makes kλΔθ/r', () => {
  const r = 2, d = 1e-6;
  for (const t of [0, .5, 1.2, 1.5]) {
   const len = r * Math.tan(t + d / 2) - r * Math.tan(t - d / 2);
   close(len, r * d / Math.cos(t) ** 2, 1e-6);
   const dist = Math.hypot(r, r * Math.tan(t)); close(dist, r / Math.cos(t), 1e-12);
   close(k * lam * len / dist ** 2, k * lam * d / r, 1e-6);
  }
 });
 it('without its cos θ the angular integral gives πkλ/r; over half the line it gives kλ/r', () => {
  const r = 1, n = 100000; let all = 0, half = 0;
  for (let i = 0; i < n; i++) { const t = -Math.PI / 2 + (i + .5) * Math.PI / n; all += k * lam / r * Math.PI / n; if (t > 0) half += k * lam / r * Math.cos(t) * Math.PI / n; }
  close(all, Math.PI * k * lam / r, 1e-9); close(half, k * lam / r, 1e-6);
 });
 it('cut off below P’s foot, it leans at π/4: E_x halves and an equal part along the line appears', () => {
  const f = line(1, 0, 0, 1e5, () => lam, 400000);
  close(f.ex, k * lam / 1, 1e-3); close(Math.abs(f.ey), k * lam / 1, 1e-3);
  expect(f.ey).toBeLessThan(0); // away from the half that is left, for a positive line
 });
 it('a negative line’s field points toward it', () => { expect(line(1, 0, -1e4, 1e4, () => -lam, 100000).ex).toBeLessThan(0); });
});
