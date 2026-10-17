import {describe, expect, it} from 'vitest';
import {getProblem} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {boardLines} from '../src/workbench/derivation';
import {MISCONCEPTION} from '../src/quiz/misconceptions';
import {bank as bankSemi} from '../src/quiz/bank/semi';
import {bank as bankInfinite} from '../src/quiz/bank/infinite';
import {lesson as semiLesson} from '../src/lessons/semi';
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

/* THE RODS' AND LINES' LESSONS. The rod on its own line, the rod level with an end, the ramp, the half line, and
 * the two potentials of a rod: every result, limit and comparison their questions rely on, by brute force. */
/** The field and potential at P on a rod's own line, a gap a beyond the end of a rod of length L on the x-axis
 * (0 to L): point charges spaced evenly in the log of their distance from P, so the near end is cut finely. */
function onAxis(a: number, L: number, lam: number, n = 200000) {
 let ex = 0, v = 0;
 const u0 = Math.log(a), du = (Math.log(L + a) - u0) / n;
 for (let i = 0; i < n; i++) { const d = Math.exp(u0 + (i + .5) * du), q = lam * d * du; ex += k * q / d ** 2; v += k * q / d; }
 return {ex, v};
}
/** The field at (px, py) of a charge on the x-axis from x0 to x1 with density lam(x): a plain midpoint sum. */
function alongX(px: number, py: number, x0: number, x1: number, lam: (x: number) => number, n = 200000) {
 let ex = 0, ey = 0;
 const dx = (x1 - x0) / n;
 for (let i = 0; i < n; i++) { const x = x0 + (i + .5) * dx, q = lam(x) * dx, rx = px - x, ry = py, r = Math.hypot(rx, ry); ex += k * q * rx / r ** 3; ey += k * q * ry / r ** 3; }
 return {ex, ey};
}
/** The potential at (px, py) of a straight charge on the y-axis from a to b, cut as `line` cuts it. */
function vline(px: number, py: number, a: number, b: number, lam: (y: number) => number, n = 200000) {
 let v = 0;
 const d = Math.abs(px), u0 = Math.asinh((a - py) / d), u1 = Math.asinh((b - py) / d), du = (u1 - u0) / n;
 for (let i = 0; i < n; i++) { const u = u0 + (i + .5) * du, y = py + d * Math.sinh(u), dy = d * Math.cosh(u) * du; v += k * lam(y) * dy / Math.hypot(px, py - y); }
 return v;
}

describe('the rod, on its own line beyond its end', () => {
 const L = 2, Q = 3, lam = Q / L;
 const exact = (a: number) => k * Q / (a * (L + a));
 it('has the lesson’s field, kQ/(a(L + a)) = kλ(1/a − 1/(L + a)), along the axis only', () => {
  for (const a of [.1, 1, 5]) { close(onAxis(a, L, lam).ex, exact(a), 1e-6); close(exact(a), k * lam * (1 / a - 1 / (L + a)), 1e-12); }
  expect(alongX(L + 1, 0, 0, L, () => lam, 2000).ey).toBe(0);
 });
 it('the near pieces count most: a piece at the near end outweighs one at the far end by ((L + a)/a)²', () => {
  const a = .5, near = k * lam / a ** 2, far = k * lam / (L + a) ** 2;
  close(near / far, ((L + a) / a) ** 2, 1e-12); expect(near).toBeGreaterThan(far);
 });
 it('integrates over 0 to L: the bounds −L/2 to L/2 with the same integrand give another number', () => {
  const a = 1, f = (x0: number, x1: number, n = 100000) => { let s = 0; const dx = (x1 - x0) / n; for (let i = 0; i < n; i++) { const x = x0 + (i + .5) * dx; s += k * lam * dx / (L + a - x) ** 2; } return s; };
  close(f(0, L), exact(a), 1e-6);
  expect(Math.abs(f(-L / 2, L / 2) - exact(a)) / exact(a)).toBeGreaterThan(.1);
 });
 it('with the origin at the centre, ∫ from −L/2 to L/2 of kλ dx/(L/2 + a − x)² gives the same field', () => {
  const a = .7, n = 200000, dx = L / n; let s = 0, wrong = 0;
  for (let i = 0; i < n; i++) { const x = -L / 2 + (i + .5) * dx; s += k * lam * dx / (L / 2 + a - x) ** 2; wrong += k * lam * dx / (L + a - x) ** 2; }
  close(s, exact(a), 1e-6);
  expect(Math.abs(wrong - exact(a)) / exact(a)).toBeGreaterThan(.1);
 });
 it('far away tends to kQ/(a + L/2)², off by a part of order (L/a)²', () => {
  const a = 100 * L, e = onAxis(a, L, lam).ex;
  close(e, k * Q / (a + L / 2) ** 2, 1e-4);
  expect(Math.abs(e / (k * Q / (a + L / 2) ** 2) - 1)).toBeLessThan((L / a) ** 2);
 });
 it('up against the end tends to kλ/a, growing as 1/a: not kQ/a², and faster than ln(L/a)', () => {
  const a = 1e-4 * L, e = onAxis(a, L, lam).ex;
  close(e, k * lam / a, 1e-3);
  expect(e / (k * Q / a ** 2)).toBeLessThan(1e-3);
  expect(e / (k * lam * Math.log(L / a))).toBeGreaterThan(100);
  close(onAxis(a / 2, L, lam).ex / e, 2, 1e-3);
 });
 it('a negative rod’s field points along the axis toward the rod', () => {
  expect(onAxis(.5, L, -lam).ex).toBeLessThan(0);
  const f = alongX(L + .5, 0, 0, L, () => -lam, 2000); expect(f.ex).toBeLessThan(0); expect(f.ey).toBe(0);
 });
 it('off the axis a part across it appears, away from the rod’s line for a positive charge, with nothing to cancel it', () => {
  const f = alongX(L + .5, .3, 0, L, () => lam);
  expect(f.ey).toBeGreaterThan(.05 * f.ex);
  expect(alongX(L + .5, .3, 0, L, () => -lam).ey).toBeLessThan(0);
 });
});

describe('the rod, level with one end', () => {
 const L = 2, Q = 3, lam = Q / L;
 const ex = (r: number) => k * Q / (r * Math.sqrt(L * L + r * r)), ey = (r: number) => -k * lam * (1 / r - 1 / Math.sqrt(L * L + r * r));
 it('has the lesson’s two components: away from the rod and down, for a positive rod', () => {
  for (const r of [.3, 1, 4]) { const f = line(r, 0, 0, L, () => lam); close(f.ex, ex(r)); close(f.ey, ey(r)); expect(f.ex).toBeGreaterThan(0); expect(f.ey).toBeLessThan(0); }
 });
 it('E_y is −∫ kλ y dy/(y² + r²)^{3/2} from 0 to L; the cos α version, and half the rod doubled, are other numbers', () => {
  const r = 1, n = 100000, dy = L / n; let s = 0, c = 0;
  for (let i = 0; i < n; i++) { const y = (i + .5) * dy; s -= k * lam * y * dy / (y * y + r * r) ** 1.5; c -= k * lam * r * dy / (y * y + r * r) ** 1.5; }
  close(s, ey(r), 1e-6);
  expect(Math.abs(c - ey(r)) / Math.abs(ey(r))).toBeGreaterThan(.1);
  expect(Math.abs(2 * line(r, 0, 0, L / 2, () => lam).ex - ex(r)) / ex(r)).toBeGreaterThan(.1);
 });
 it('its E_x is exactly half a centred rod of length 2L’s, which has no E_y', () => {
  const r = .8, whole = line(r, 0, -L, L, () => lam);
  close(line(r, 0, 0, L, () => lam).ex, whole.ex / 2, 1e-6);
  expect(Math.abs(whole.ey)).toBeLessThan(1e-9);
 });
 it('its field does not point away from the rod’s middle up close, but nearly does far away', () => {
  const ratio = (r: number) => Math.abs(ey(r) / ex(r)), middle = (r: number) => (L / 2) / r;
  expect(Math.abs(ratio(L) - middle(L)) / middle(L)).toBeGreaterThan(.1);
  close(ratio(200 * L), middle(200 * L), 1e-3);
 });
 it('far away |E| tends to k|Q|/r², off by a part of order (L/r)²; not k|Q|/r, 2k|λ|/r or √2 k|λ|/r', () => {
  const r = 100 * L, f = line(r, 0, 0, L, () => lam, 4000), m = Math.hypot(f.ex, f.ey);
  close(m, k * Q / r ** 2, 1e-4);
  expect(Math.abs(m / (k * Q / r ** 2) - 1)).toBeLessThan((L / r) ** 2);
  for (const wrong of [k * Q / r, 2 * k * lam / r, Math.SQRT2 * k * lam / r]) expect(wrong / m).toBeGreaterThan(10);
 });
 it('grown upward without end at fixed λ: E_x → kλ/r and E_y → −kλ/r, leaning at π/4', () => {
  const r = 1, f = line(r, 0, 0, 1e5, () => lam, 400000);
  close(f.ex, k * lam / r, 1e-3); close(f.ey, -k * lam / r, 1e-3);
  close(Math.atan2(-f.ey, f.ex), Math.PI / 4, 1e-3);
 });
 it('with P raised level with the middle, E_y vanishes and E_x survives', () => {
  const f = line(1, L / 2, 0, L, () => lam);
  expect(Math.abs(f.ey)).toBeLessThan(1e-9); expect(f.ex).toBeGreaterThan(.1);
 });
 it('a negative rod’s field points toward the rod and up', () => {
  const f = line(1, 0, 0, L, () => -lam); expect(f.ex).toBeLessThan(0); expect(f.ey).toBeGreaterThan(0);
 });
});

describe('the ramp', () => {
 const L = 2, l0 = 1.5, Q = l0 * L / 2, ramp = (y: number) => l0 * y / L;
 const ex = (r: number) => k * l0 / L * (1 - r / Math.sqrt(L * L + r * r));
 const ey = (r: number) => -k * l0 / L * (Math.log((L + Math.sqrt(L * L + r * r)) / r) - L / Math.sqrt(L * L + r * r));
 it('holds Q = λ₀L/2, not λ₀L', () => {
  const n = 100000, dy = L / n; let q = 0;
  for (let i = 0; i < n; i++) q += ramp((i + .5) * dy) * dy;
  close(q, Q, 1e-9);
  expect(Math.abs(l0 * L - q)).toBeGreaterThan(.5 * q);
 });
 it('has the lesson’s E_x and E_y; the integrand with λ₀ for λ(y) is another rod’s', () => {
  for (const r of [.3, 1, 4]) { const f = line(r, 0, 0, L, ramp); close(f.ex, ex(r)); close(f.ey, ey(r)); }
  expect(Math.abs(line(1, 0, 0, L, () => l0).ex - ex(1)) / ex(1)).toBeGreaterThan(.1);
 });
 it('at every distance its E_x is weaker than a uniform rod’s with the same Q; they agree far away', () => {
  for (const r of [.05, .3, 1, 3, 10]) expect(ex(r)).toBeLessThan(line(r, 0, 0, L, () => Q / L, 20000).ex);
  const r = 200 * L; close(ex(r), k * Q / (r * Math.sqrt(L * L + r * r)), 1e-3);
 });
 it('with P level with the middle, E_y does not vanish: it points down for a positive ramp', () => {
  const f = line(1, L / 2, 0, L, ramp); expect(f.ey).toBeLessThan(-.05);
 });
 it('far away E_x → kQ/r² with Q = λ₀L/2, not kλ₀L/r²', () => {
  const r = 200 * L; close(line(r, 0, 0, L, ramp, 4000).ex, k * Q / r ** 2, 1e-3);
 });
 it('far away E_y → −kQȳ/r³ with ȳ = 2L/3, the centre of charge: not L/2 or L/3', () => {
  const r = 300 * L, e = line(r, 0, 0, L, ramp, 20000).ey;
  close(e, -k * Q * (2 * L / 3) / r ** 3, 2e-3);
  for (const wrong of [L / 2, L / 3]) expect(Math.abs(e / (-k * Q * wrong / r ** 3) - 1)).toBeGreaterThan(.2);
 });
 it('turned upside down, densest at the foot, the same charge makes a larger E_x', () => {
  for (const r of [.3, 1, 3]) expect(line(r, 0, 0, L, y => l0 * (1 - y / L)).ex).toBeGreaterThan(ex(r));
 });
 it('the comparisons are of sizes, |E_x|: for negative charge the larger field is the more negative E_x', () => {
  // The bank once asked for the 'larger E_x' and said the flipped ramp's E_x 'grows': true only for positive λ₀.
  for (const r of [.3, 1, 3]) {
   const ramped = line(r, 0, 0, L, y => -ramp(y)).ex, uniform = line(r, 0, 0, L, () => -Q / L, 20000).ex, flipped = line(r, 0, 0, L, y => -l0 * (1 - y / L)).ex;
   expect(uniform).toBeLessThan(ramped); expect(Math.abs(uniform)).toBeGreaterThan(Math.abs(ramped));
   expect(flipped).toBeLessThan(ramped); expect(Math.abs(flipped)).toBeGreaterThan(Math.abs(ramped));
  }
 });
 it('a negative ramp’s field points toward the rod and up', () => {
  const f = line(1, 0, 0, L, y => -ramp(y)); expect(f.ex).toBeLessThan(0); expect(f.ey).toBeGreaterThan(0);
 });
});

describe('the semi-infinite line', () => {
 // The line on the y-axis from its end at 0 up to ∞, with P = (r, 0) level with the end, as the lesson lays it.
 // (It was laid along x with P above the end; it now stands as the rod level with an end stands.)
 const lam = 1.5, semi = (r: number, l = lam) => { const f = line(r, 0, 0, 1e5 * r, () => l, 400000); return {ex: f.ex, ey: f.ey}; };
 it('E_x = kλ/r and E_y = −kλ/r: away from the line and back past the end, at π/4', () => {
  const f = semi(1); close(f.ex, k * lam, 1e-3); close(f.ey, -k * lam, 1e-3);
  close(Math.atan2(-f.ey, f.ex), Math.PI / 4, 1e-3);
 });
 it('cut at equal angles from the perpendicular, every piece is r sec²α Δα long and makes kλΔα/r', () => {
  const r = 1.3, d = 1e-6;
  for (const t of [0, .4, 1, 1.5]) {
   const len = r * Math.tan(t + d / 2) - r * Math.tan(t - d / 2), dist = Math.hypot(r * Math.tan(t), r);
   close(len, r * d / Math.cos(t) ** 2, 1e-6); close(k * lam * len / dist ** 2, k * lam * d / r, 1e-6);
  }
 });
 it('over the quarter turn, 0 to π/2, ∫ sin α dα = ∫ cos α dα = 1', () => {
  const n = 100000, da = Math.PI / 2 / n; let s = 0, c = 0;
  for (let i = 0; i < n; i++) { const a = (i + .5) * da; s += Math.sin(a) * da; c += Math.cos(a) * da; }
  close(s, 1, 1e-8); close(c, 1, 1e-8);
 });
 it('equal pieces alone do not make the lean π/4: a finite rod level with its end, also cut at equal angles, leans less', () => {
  // The π/4 needs the pieces spread evenly over the whole quarter turn, as the corrected answer says.
  const r = 1, f = line(r, 0, 0, 2, () => lam);
  expect(Math.abs(Math.atan2(-f.ey, f.ex) - Math.PI / 4)).toBeGreaterThan(.1);
 });
 it('one piece’s parts are ΔE cos α along x and −ΔE sin α along y, α from the perpendicular', () => {
  const r = 1, y = .8, a = Math.atan(y / r), d = Math.hypot(y, r), e = k / d ** 2;
  close(e * (r - 0) / d, e * Math.cos(a), 1e-12); close(e * (0 - y) / d, -e * Math.sin(a), 1e-12);
 });
 it('doubling r halves both parts and keeps the lean; they do not quarter', () => {
  const a = semi(1), b = semi(2);
  close(b.ex / a.ex, .5, 2e-3); close(b.ey / a.ey, .5, 2e-3);
  close(Math.atan2(-b.ey, b.ex), Math.PI / 4, 1e-3);
 });
 it('with the mirror half added, it is 2kλ/r straight out from the line', () => {
  const f = line(1, 0, -1e5, 1e5, () => lam, 400000); // the whole line
  close(f.ex, 2 * k * lam, 1e-3); expect(Math.abs(f.ey)).toBeLessThan(1e-6);
 });
 it('a negative line’s field points toward the line and up along it, still at π/4', () => {
  const f = semi(1, -lam); expect(f.ex).toBeLessThan(0); expect(f.ey).toBeGreaterThan(0);
  close(Math.abs(f.ex), Math.abs(f.ey), 2e-3);
 });
});

describe('the potential on the bisector of a rod', () => {
 const L = 2, Q = 3, lam = Q / L;
 const V = (r: number, len = L) => 2 * k * lam * Math.log((len / 2 + Math.sqrt((len / 2) ** 2 + r * r)) / r);
 it('is 2kλ ln((L/2 + √((L/2)² + r²))/r); mirror halves add equally; the field’s integrands give other numbers', () => {
  for (const r of [.3, 1, 4]) { const v = vline(r, 0, -L / 2, L / 2, () => lam); close(v, V(r), 1e-6); close(vline(r, 0, 0, L / 2, () => lam), v / 2, 1e-6); }
  const r = 1; expect(Math.abs(line(r, 0, -L / 2, L / 2, () => lam).ex - V(r)) / V(r)).toBeGreaterThan(.1);
  const sq = 2 * k * lam * Math.atan(L / 2 / r) / r; expect(Math.abs(sq - V(r)) / V(r)).toBeGreaterThan(.1);
 });
 it('far away tends to kQ/r, off by a part of order (L/r)²', () => {
  const r = 100 * L; close(vline(r, 0, -L / 2, L / 2, () => lam, 4000), k * Q / r, 1e-4);
  expect(Math.abs(V(r) / (k * Q / r) - 1)).toBeLessThan((L / r) ** 2);
 });
 it('grown at fixed λ, it goes as 2kλ ln(L/r) and grows without bound; differences stay finite', () => {
  const r = 1;
  for (const big of [1e4, 1e6]) close(V(r, big), 2 * k * lam * Math.log(big / r), 1e-6);
  expect(V(r, 1e6) - V(r, 1e3)).toBeGreaterThan(2 * k * lam * 6);
  close(V(1, 1e8) - V(2, 1e8), 2 * k * lam * Math.log(2), 1e-6);
 });
 it('for a negative rod grown at fixed λ it is its size that grows: V itself heads down without bound', () => {
  const Vn = (len: number) => 2 * k * -lam * Math.log((len / 2 + Math.sqrt((len / 2) ** 2 + 1)) / 1);
  expect(Vn(1e6)).toBeLessThan(Vn(1e3) - 2 * k * lam * 6);
  close(vline(1, 0, -50, 50, () => -lam, 200000), Vn(100), 1e-6);
 });
 it('E_x = −dV/dr is the bisector’s field, pointing away from a positive rod; V/r is not', () => {
  for (const r of [.4, 1, 3]) {
   const h = 1e-5, grad = -(vline(r + h, 0, -L / 2, L / 2, () => lam) - vline(r - h, 0, -L / 2, L / 2, () => lam)) / (2 * h);
   close(grad, line(r, 0, -L / 2, L / 2, () => lam).ex, 1e-4);
   close(grad, k * Q / (r * Math.sqrt((L / 2) ** 2 + r * r)), 1e-4);
   expect(grad).toBeGreaterThan(0);
  }
  expect(Math.abs(V(1) / 1 - k * Q / Math.sqrt((L / 2) ** 2 + 1))).toBeGreaterThan(.1);
 });
 it('E_y needs V off the bisector: −∂V/∂y is zero on it by symmetry, and off it is the field’s E_y', () => {
  const r = 1, h = 1e-5, dVdy = (py: number) => -(vline(r, py + h, -L / 2, L / 2, () => lam) - vline(r, py - h, -L / 2, L / 2, () => lam)) / (2 * h);
  expect(Math.abs(dVdy(0))).toBeLessThan(1e-6);
  close(dVdy(.4), line(r, .4, -L / 2, L / 2, () => lam).ey, 1e-4);
 });
 it('a negative rod’s potential is negative', () => { expect(vline(1, 0, -L / 2, L / 2, () => -lam)).toBeLessThan(0); });
});

describe('the potential beyond the end of a rod', () => {
 const L = 2, Q = 3, lam = Q / L;
 const V = (a: number) => k * lam * Math.log((L + a) / a);
 it('is kλ ln((L + a)/a); the field is another number', () => {
  for (const a of [.1, 1, 5]) close(onAxis(a, L, lam).v, V(a), 1e-6);
  expect(Math.abs(onAxis(1, L, lam).ex - V(1)) / V(1)).toBeGreaterThan(.1);
 });
 it('with u = L + a − x it is kλ ∫ from a to L + a of du/u; the ends left unturned give minus that', () => {
  const a = .6, n = 100000, du = L / n; let s = 0;
  for (let i = 0; i < n; i++) s += k * lam * du / (a + (i + .5) * du);
  close(s, V(a), 1e-8);
  close(k * lam * Math.log(a / (L + a)), -V(a), 1e-12);
 });
 it('far away tends to kQ/(a + L/2), off by a part of order (L/a)²', () => {
  const a = 100 * L, v = onAxis(a, L, lam).v;
  close(v, k * Q / (a + L / 2), 1e-4);
  expect(Math.abs(v / (k * Q / (a + L / 2)) - 1)).toBeLessThan((L / a) ** 2);
 });
 it('onto the end it grows as kλ ln(L/a): without bound, far slower than kQ/a or the field’s kλ/a', () => {
  const a = 1e-6 * L, v = onAxis(a, L, lam).v;
  close(v, k * lam * Math.log(L / a), 1e-6);
  expect(onAxis(1e-9 * L, L, lam).v).toBeGreaterThan(v + k * lam * 6);
  expect(v / (k * Q / a)).toBeLessThan(1e-4); expect(v / (k * lam / a)).toBeLessThan(1e-4);
 });
 it('E_x = −dV/da is the axial field, pointing away from a positive rod, and not kQ/a²', () => {
  for (const a of [.2, 1, 4]) {
   const h = 1e-5, grad = -(onAxis(a + h, L, lam).v - onAxis(a - h, L, lam).v) / (2 * h);
   close(grad, k * lam * (1 / a - 1 / (L + a)), 1e-4); close(grad, onAxis(a, L, lam).ex, 1e-4);
   expect(grad).toBeGreaterThan(0);
   expect(Math.abs(grad - k * Q / a ** 2) / grad).toBeGreaterThan(.03);
  }
 });
 it('on the rod’s line the field has no part across it; off the line it has', () => {
  expect(alongX(L + .5, 0, 0, L, () => lam, 2000).ey).toBe(0);
  expect(alongX(L + .5, .3, 0, L, () => lam).ey).toBeGreaterThan(.01);
 });
 it('a negative rod’s potential is negative, and more negative closer in', () => {
  expect(onAxis(1, L, -lam).v).toBeLessThan(0);
  expect(onAxis(.1, L, -lam).v).toBeLessThan(onAxis(1, L, -lam).v);
 });
});

/* THE RINGS', DISKS', ARCS' AND SHEET'S BANKS, and their potentials. Here the charge is a set of point charges in
 * space, [x, y, z, q], and the field and the potential at P are their sums: the disk and the sheet are bands of
 * rings, each ring cut into point charges round it; the arc and the ring are point charges round a circle. */
type Charge = [number, number, number, number];
const eps0 = 1 / (4 * Math.PI * k);
/** The field and the potential at (px, py, pz) of point charges. */
function at(px: number, py: number, pz: number, cs: Charge[]) {
 let ex = 0, ey = 0, ez = 0, v = 0;
 for (const [x, y, z, q] of cs) {
  const dx = px - x, dy = py - y, dz = pz - z, r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  ex += k * q * dx / r ** 3; ey += k * q * dy / r ** 3; ez += k * q * dz / r ** 3; v += k * q / r;
 }
 return {ex, ey, ez, v};
}
/** A flat band of charge round the z-axis with density sigma, between the radii s(u0) and s(u1): nu rings, even in
 * u, each holding sigma times its exact area, cut into nt point charges at its middle radius. */
function band(sigma: number, s: (u: number) => number, u0: number, u1: number, nu = 3000, nt = 24): Charge[] {
 const out: Charge[] = [], du = (u1 - u0) / nu, dt = 2 * Math.PI / nt;
 for (let i = 0; i < nu; i++) {
  const s1 = s(u0 + i * du), s2 = s(u0 + (i + 1) * du), sm = (s1 + s2) / 2, q = sigma * (s2 * s2 - s1 * s1) / 2 * dt;
  for (let j = 0; j < nt; j++) { const t = (j + .5) * dt; out.push([sm * Math.cos(t), sm * Math.sin(t), 0, q]); }
 }
 return out;
}
/** A disk (or the band of it from a to R), cut finely near the axis below a point at height z. */
const diskCharges = (R: number, sigma: number, z: number, a = 0, nu = 3000) => band(sigma, u => z * Math.sinh(u), Math.asinh(a / z), Math.asinh(R / z), nu);
/** The sheet's rings between the angles a0 and a1 at P, at height z: s = z tan α. */
const sheetCharges = (sigma: number, z: number, a0 = 0, a1 = Math.PI / 2 - 1e-7, nu = 3000) => band(sigma, u => z * Math.tan(u), a0, a1, nu);
/** Point charges round a circle of radius R in the xy-plane, from the angle `from` to `to`, `perAngle` per radian. */
function circle(R: number, perAngle: number, from: number, to: number, n: number): Charge[] {
 const dt = (to - from) / n;
 return Array.from({length: n}, (_, i) => { const t = from + (i + .5) * dt; return [R * Math.cos(t), R * Math.sin(t), 0, perAngle * dt] as Charge; });
}
/** The arc of the lessons: opening phi about the x-axis, charge Q, P at its centre. */
const arcCharges = (R: number, Q: number, phi: number, n: number) => circle(R, Q / phi, -phi / 2, phi / 2, n);
const total = (cs: Charge[]) => cs.reduce((t, c) => t + c[3], 0);

describe('the disk, on its axis', () => {
 const R = 1.5, Q = 2, sig = Q / (Math.PI * R * R);
 const exact = (z: number) => sig / (2 * eps0) * (1 - z / Math.sqrt(R * R + z * z));
 it('has the lesson’s field, along the axis only, with the sign of σ', () => {
  for (const z of [.3, 1, 3]) {
   const f = at(0, 0, z, diskCharges(R, sig, z));
   close(f.ez, exact(z), 1e-4); expect(Math.hypot(f.ex, f.ey)).toBeLessThan(1e-9);
   close(at(0, 0, z, diskCharges(R, -sig, z)).ez, -exact(z), 1e-4); // toward a negative disk
  }
 });
 it('one thin ring makes k ΔQ z/(s² + z²)^{3/2}: not with R, not whole, not with s on top', () => {
  const s = .6, dQ = .01, z = .8, f = ring(s, dQ, z, 64).ez;
  close(f, k * dQ * z / (s * s + z * z) ** 1.5, 1e-12);
  for (const wrong of [k * dQ * z / (R * R + z * z) ** 1.5, k * dQ / (s * s + z * z), k * dQ * s / (s * s + z * z) ** 1.5]) expect(Math.abs(wrong - f) / f).toBeGreaterThan(.1);
 });
 it('a ring of radius s and width ds has area 2πs ds, so the rings add to Q; σπs² ds or Q 2πs ds do not', () => {
  const s = .7, ds = 1e-6; close((Math.PI * (s + ds) ** 2 - Math.PI * s * s) / ds, 2 * Math.PI * s, 1e-5);
  const n = 100000, d = R / n; let right = 0, inner = 0, whole = 0;
  for (let i = 0; i < n; i++) { const si = (i + .5) * d; right += sig * 2 * Math.PI * si * d; inner += sig * Math.PI * si * si * d; whole += Q * 2 * Math.PI * si * d; }
  close(right, Q, 1e-8); expect(Math.abs(inner - Q) / Q).toBeGreaterThan(.1); close(whole, Math.PI * R * R * Q, 1e-8);
 });
 it('far up the axis tends to kQ/z², not σ/(2ε₀), zero or kQ/z', () => {
  const z = 300, f = at(0, 0, z, diskCharges(R, sig, z, 0, 400)).ez;
  close(f, k * Q / z ** 2, 1e-4);
  expect(f / (sig / (2 * eps0))).toBeLessThan(1e-3); expect(f / (k * Q / z)).toBeLessThan(1e-2);
 });
 it('close to the centre tends to σ/(2ε₀): finite, not zero, and half of σ/ε₀', () => {
  const f = at(0, 0, 1e-3, diskCharges(R, sig, 1e-3)).ez;
  close(f, sig / (2 * eps0), 2e-3); expect(f).toBeLessThan(sig / (2 * eps0));
  close(f / (sig / eps0), .5, 2e-3);
 });
 it('grown at fixed σ settles to σ/(2ε₀) at every height; at fixed Q it falls to zero; each ring added at the rim adds less', () => {
  for (const z of [.5, 2]) close(at(0, 0, z, diskCharges(1e4, sig, z)).ez, sig / (2 * eps0), 1e-3);
  expect(at(0, 0, 1, diskCharges(1e4, Q / (Math.PI * 1e8), 1)).ez).toBeLessThan(1e-6);
  const e = (r: number) => at(0, 0, 1, diskCharges(r, sig, 1)).ez, [e10, e20, e30] = [e(10), e(20), e(30)];
  expect(e20 - e10).toBeGreaterThan(e30 - e20); expect(e30 - e20).toBeGreaterThan(0);
  expect(e30).toBeLessThan(sig / (2 * eps0));
 });
 it('with a hole of radius a, the band from a to R is the whole disk less a disk of radius a, not a disk of radius R − a', () => {
  const a = .5, z = .7, rest = at(0, 0, z, diskCharges(R, sig, z, a)).ez;
  close(rest, at(0, 0, z, diskCharges(R, sig, z)).ez - at(0, 0, z, diskCharges(a, sig, z)).ez, 1e-5);
  expect(Math.abs(at(0, 0, z, diskCharges(R - a, sig, z)).ez - rest) / rest).toBeGreaterThan(.05);
  expect(Math.abs(at(0, 0, z, diskCharges(a, sig, z)).ez - rest) / rest).toBeGreaterThan(.1);
 });
});

/* THE ANNULUS'S BANK (src/quiz/bank/annulus.ts): the disk's band from a to b, every claim summed from point charges. */
describe('the annulus, on its axis', () => {
 const a = .6, b = 1.5, Q = 2, sig = Q / (Math.PI * (b * b - a * a));
 const exact = (z: number, s = sig, lo = a, hi = b) => 2 * Math.PI * k * s * z * (1 / Math.hypot(lo, z) - 1 / Math.hypot(hi, z));
 const band_ = (z: number, s = sig, lo = a, hi = b, nu = 3000) => diskCharges(hi, s, z, lo, nu);
 it('has the lesson’s field along the axis only, with the sign of σ, on either side (what-cancels, result, negative)', () => {
  for (const z of [.3, 1, 3]) for (const sign of [1, -1]) {
   const f = at(0, 0, z, band_(z, sign * sig));
   close(f.ez, sign * exact(z), 1e-4); expect(Math.hypot(f.ex, f.ey)).toBeLessThan(1e-9);
   expect(Math.sign(f.ez)).toBe(sign);
   // The swapped ends give the field turned round: pointing at a positive annulus.
   expect(Math.sign(-exact(z, sign * sig))).toBe(-sign);
  }
  const below = at(0, 0, -1, band_(1));
  close(below.ez, -exact(1), 1e-4);
 });
 it('σ = Q/(π(b² − a²)) puts Q on the band; Q/(πb²) or Q/(π(b − a)²) do not (density)', () => {
  close(total(band_(1)), Q, 1e-9);
  expect(Math.abs(total(band_(1, Q / (Math.PI * b * b))) - Q) / Q).toBeGreaterThan(.1);
  expect(Math.abs(total(band_(1, Q / (Math.PI * (b - a) ** 2))) - Q) / Q).toBeGreaterThan(.1);
 });
 it('one ring of radius s makes k ΔQ z/(s² + z²)^{3/2}: not with b, not whole (one-ring)', () => {
  const s = .9, dQ = .01, z = .8, f = ring(s, dQ, z, 64).ez;
  close(f, k * dQ * z / (s * s + z * z) ** 1.5, 1e-12);
  for (const wrong of [k * dQ * z / (b * b + z * z) ** 1.5, k * dQ / (s * s + z * z)]) expect(Math.abs(wrong - f) / f).toBeGreaterThan(.1);
 });
 it('the rings run from a to b: from 0, from 0 to b − a, or on to ∞ are other charges (bounds, result)', () => {
  const z = .7, f = at(0, 0, z, band_(z)).ez;
  close(f, exact(z), 1e-4);
  for (const wrong of [exact(z, sig, 0, b), exact(z, sig, 0, b - a), exact(z, sig, a, 1e4)]) expect(Math.abs(wrong - f) / f).toBeGreaterThan(.05);
  // The whole disk's 2πkσ(1 − z/√(b² + z²)) is the integral from 0.
  close(exact(z, sig, 0, b), 2 * Math.PI * k * sig * (1 - z / Math.hypot(b, z)), 1e-12);
 });
 it('a → 0 at fixed σ is the disk of radius b, not zero and not the sheet (no-hole)', () => {
  const z = .9, f = at(0, 0, z, band_(z, sig, 1e-6)).ez, disk = 2 * Math.PI * k * sig * (1 - z / Math.hypot(b, z));
  close(f, disk, 1e-4); expect(f).toBeLessThan(sig / (2 * eps0));
 });
 it('b → ∞ at fixed σ is a sheet with a hole: σ/(2ε₀) z/√(a² + z²), not σ/(2ε₀), zero or twice (holed-sheet)', () => {
  for (const z of [.5, 1]) {
   const f = at(0, 0, z, band_(z, sig, a, 1e4)).ez, holed = sig / (2 * eps0) * z / Math.hypot(a, z);
   close(f, holed, 1e-3);
   expect(Math.abs(f - sig / (2 * eps0)) / f).toBeGreaterThan(.05);
  }
  expect(at(0, 0, 1, band_(1, Q / (Math.PI * 1e8), a, 1e4)).ez).toBeLessThan(1e-6);
 });
 it('far up the axis is kQ/z² with Q = σπ(b² − a²), not kσπb²/z² (far)', () => {
  const z = 300, f = at(0, 0, z, band_(z, sig, a, b, 400)).ez;
  close(f, k * Q / z ** 2, 1e-4);
  expect(Math.abs(k * sig * Math.PI * b * b / z ** 2 - f) / f).toBeGreaterThan(.1);
 });
 it('a → b at fixed Q is a ring of radius b, not zero and not kQ/z² (thin)', () => {
  const z = .8, lo = .9995 * b, s = Q / (Math.PI * (b * b - lo * lo)), f = at(0, 0, z, band_(z, s, lo, b, 50)).ez;
  close(f, k * Q * z / (b * b + z * z) ** 1.5, 1e-3);
  expect(Math.abs(k * Q / z ** 2 - f) / f).toBeGreaterThan(.1);
  expect(Math.abs(k * Q / (b * b + z * z) - f) / f).toBeGreaterThan(.1);
  // The bracket over b² − a² is the derivative the explanation names.
  close((1 / Math.hypot(lo, z) - 1 / Math.hypot(b, z)) / (b * b - lo * lo), 1 / (2 * (b * b + z * z) ** 1.5), 1e-3);
 });
});

describe('the infinite sheet', () => {
 const sig = .8, E = sig / (2 * eps0);
 const field = (z: number, a0?: number, a1?: number, nu?: number) => at(0, 0, z, sheetCharges(sig, z, a0, a1, nu)).ez;
 it('is σ/(2ε₀) at every height, half of σ/ε₀: twice the height leaves it the same', () => {
  for (const z of [.5, 1, 2, 4]) close(field(z), E, 1e-3);
  close(field(2) / field(1), 1, 1e-6);
 });
 it('cut at equal angles, the far rings make the larger fields, each at most 2πkσΔα, adding to 2πkσ', () => {
  const N = 12, d = Math.PI / 2 / N, parts = Array.from({length: N}, (_, i) => field(1, i * d, i === N - 1 ? Math.PI / 2 - 1e-7 : (i + 1) * d, 300));
  for (let i = 1; i < N; i++) expect(parts[i]).toBeGreaterThan(parts[i - 1]);
  for (const p of parts) expect(p).toBeLessThanOrEqual(2 * Math.PI * k * sig * d * (1 + 1e-9));
  close(parts.reduce((a, b) => a + b, 0), 2 * Math.PI * k * sig, 1e-3);
 });
 it('a thin ring at α holds σ 2πs z sec²α Δα and makes 2πkσ sin α Δα; the other choices do not', () => {
  const z = 1.3, a = 1, d = 1e-4, s = z * Math.tan(a), s1 = z * Math.tan(a - d / 2), s2 = z * Math.tan(a + d / 2);
  const area = Math.PI * (s2 * s2 - s1 * s1), sec2 = 1 / Math.cos(a) ** 2;
  close(area, 2 * Math.PI * s * z * sec2 * d, 1e-6);
  expect(Math.abs(2 * Math.PI * s * z * d - area) / area).toBeGreaterThan(.5); // without the stretch
  const f = field(z, a - d / 2, a + d / 2, 4), right = 2 * Math.PI * k * sig * Math.sin(a) * d;
  close(f, right, 1e-6);
  for (const wrong of [Math.tan(a), Math.sin(a) * Math.tan(a), Math.sin(a) * Math.cos(a) ** 2]) expect(Math.abs(2 * Math.PI * k * sig * wrong * d - f) / f).toBeGreaterThan(.1);
 });
 it('raised to twice the height, each equal-angle ring holds four times the charge and makes the same field', () => {
  const low = sheetCharges(sig, 1, .4, 1.1, 200), high = sheetCharges(sig, 2, .4, 1.1, 200);
  close(total(high) / total(low), 4, 1e-12);
  close(at(0, 0, 2, high).ez, at(0, 0, 1, low).ez, 1e-9);
 });
 it('a disk as high above as its radius gives less than a third of the sheet’s field; close to its centre, nearly all of it', () => {
  expect(at(0, 0, 1, diskCharges(1, sig, 1)).ez).toBeLessThan(E / 3);
  expect(at(0, 0, 1e-3, diskCharges(1, sig, 1e-3)).ez / E).toBeGreaterThan(.998);
 });
 it('a negative sheet’s field points toward it, the same size at every height', () => {
  const lo = at(0, 0, .5, sheetCharges(-sig, .5)).ez, hi = at(0, 0, 3, sheetCharges(-sig, 3)).ez;
  expect(lo).toBeLessThan(0); close(hi, lo, 1e-6); close(lo, -E, 1e-3);
 });
});

describe('the arc, at its centre', () => {
 const R = 1.2, Q = 1.7;
 const exact = (phi: number) => -2 * k * Q * Math.sin(phi / 2) / (R * R * phi);
 const field = (q: number, phi: number, n = 20000) => at(0, 0, 0, arcCharges(R, q, phi, n));
 it('has the lesson’s field, along x only', () => {
  for (const phi of [.3, 1, Math.PI, 4, 5.5]) { const f = field(Q, phi); close(f.ex, exact(phi), 1e-6); expect(Math.abs(f.ey)).toBeLessThan(1e-9); }
 });
 it('closed, it is zero; very short, −kQ/R²; a semicircle, −2kQ/(πR²) = −2kλ/R, a point charge’s over π/2, and not half that', () => {
  const full = field(Q, 2 * Math.PI); expect(Math.hypot(full.ex, full.ey)).toBeLessThan(1e-9);
  close(field(Q, 1e-3).ex, -k * Q / R ** 2, 1e-6);
  const semi = field(Q, Math.PI).ex;
  close(semi, -2 * k * Q / (Math.PI * R * R), 1e-6); close((-k * Q / R ** 2) / semi, Math.PI / 2, 1e-6);
  close(semi, -2 * k * (Q / (Math.PI * R)) / R, 1e-6);
  expect(Math.abs(semi / 2 - semi) / Math.abs(semi)).toBeGreaterThan(.1);
 });
 it('needs short pieces: a semicircle as one or two point charges is far off, and a long piece is weaker than a point charge', () => {
  const ex = exact(Math.PI);
  expect(Math.abs(field(Q, Math.PI, 1).ex - ex) / Math.abs(ex)).toBeGreaterThan(.5);
  expect(Math.abs(field(Q, Math.PI, 2).ex - ex) / Math.abs(ex)).toBeGreaterThan(.05);
  close(field(Q, Math.PI, 400).ex, ex, 1e-5);
  const piece = at(0, 0, 0, circle(R, 1, -.5, .5, 20000)); // one radian of arc holding one unit of charge
  expect(Math.hypot(piece.ex, piece.ey)).toBeLessThan(k / R ** 2 * .99);
 });
 it('a piece at θ makes −k ΔQ cos θ/R² along x', () => {
  for (const t of [.3, 2.2, -1]) close(at(0, 0, 0, [[R * Math.cos(t), R * Math.sin(t), 0, .1]]).ex, -k * .1 * Math.cos(t) / R ** 2, 1e-12);
 });
 it('needs −φ/2 to φ/2: 0 to φ leans off the axis, 0 to φ/2 gives half of E_x, and λR dθ over the arc is Q', () => {
  const phi = 1.4, perAngle = Q / phi, whole = field(Q, phi).ex;
  const up = at(0, 0, 0, circle(R, perAngle, 0, phi, 20000));
  expect(Math.abs(up.ey)).toBeGreaterThan(.05); expect(Math.abs(up.ex - whole) / Math.abs(whole)).toBeGreaterThan(.05);
  close(at(0, 0, 0, circle(R, perAngle, 0, phi / 2, 10000)).ex, whole / 2, 1e-6);
  close(total(arcCharges(R, Q, phi, 1000)), Q, 1e-12);
 });
 it('a negative arc’s field points along +x, toward its middle', () => {
  for (const phi of [1, Math.PI, 4.5]) { const f = field(-Q, phi, 4000); expect(f.ex).toBeGreaterThan(0); expect(Math.abs(f.ey)).toBeLessThan(1e-9); }
 });
 it('opened at fixed Q, its field only falls; at fixed λ it grows to the semicircle, then falls', () => {
  const phis = Array.from({length: 31}, (_, i) => .2 + i * (2 * Math.PI - .2) / 30);
  const atQ = phis.map(p => Math.abs(field(Q, p, 4000).ex));
  for (let i = 1; i < atQ.length; i++) expect(atQ[i]).toBeLessThan(atQ[i - 1]);
  const atLam = phis.map(p => Math.abs(field(R * p, p, 4000).ex)), top = phis[atLam.indexOf(Math.max(...atLam))];
  expect(Math.abs(top - Math.PI)).toBeLessThan(.2);
  expect(atLam[atLam.length - 1]).toBeLessThan(1e-9);
 });
});

describe('the potential on the axis of a ring', () => {
 const R = 1.3, Q = 2, ringOf = (q: number, n: number, from = 0, to = 2 * Math.PI) => circle(R, q / (2 * Math.PI), from, to, n);
 const exact = (z: number) => k * Q / Math.sqrt(R * R + z * z);
 it('is kQ/√(R² + z²), exactly, however few the pieces; one piece adds k ΔQ/rᵢ', () => {
  for (const n of [1, 2, 3, 7]) close(at(0, 0, .8, ringOf(Q, n)).v, exact(.8), 1e-12);
  const one = at(0, 0, .8, [[R, 0, 0, .1]]).v; close(one, k * .1 / Math.sqrt(R * R + .64), 1e-12);
  for (const wrong of [k * .1 / (R * R + .64), k * .1 * .8 / (R * R + .64) ** 1.5, k * .1 / .8]) expect(Math.abs(wrong - one) / one).toBeGreaterThan(.1);
 });
 it('the half turn opposite adds as much; it does not cancel', () => {
  const a = at(0, 0, .8, ringOf(Q, 50, 0, Math.PI)).v, b = at(0, 0, .8, ringOf(Q, 50, Math.PI, 2 * Math.PI)).v;
  close(a, b, 1e-12); close(a + b, exact(.8), 1e-12);
 });
 it('at the centre the field is zero but V is kQ/R; far up it is kQ/z, not kQ/z²', () => {
  const c = at(0, 0, 0, ringOf(Q, 400)); expect(Math.hypot(c.ex, c.ey, c.ez)).toBeLessThan(1e-12); close(c.v, k * Q / R, 1e-12);
  const z = 500; close(at(0, 0, z, ringOf(Q, 40)).v, k * Q / z, 1e-5);
 });
 it('E_z = −dV/dz, along +z for a positive ring; V over a distance is not it', () => {
  const cs = ringOf(Q, 64), z = .9, h = 1e-5, dVdz = (at(0, 0, z + h, cs).v - at(0, 0, z - h, cs).v) / (2 * h), ez = at(0, 0, z, cs).ez;
  close(-dVdz, ez, 1e-7); expect(-dVdz).toBeGreaterThan(0);
  expect(Math.abs(k * Q / (R * R + z * z) - ez) / ez).toBeGreaterThan(.1);
 });
 it('its size falls steadily up the axis, with no peak where the field’s is', () => {
  let last = Infinity;
  for (let z = 0; z <= 6 * R; z += .01) { const v = at(0, 0, z, ringOf(Q, 8)).v; expect(v).toBeLessThan(last); last = v; }
 });
 it('off the axis the field has a sideways part, which V on the axis cannot give', () => {
  expect(Math.abs(at(.4, 0, .8, ringOf(Q, 2000)).ex)).toBeGreaterThan(1e-2);
 });
 it('a negative ring’s potential is negative, the same size', () => { close(at(0, 0, .8, ringOf(-Q, 16)).v, -exact(.8), 1e-12); });
});

describe('the potential on the axis of a disk', () => {
 const R = 1.5, Q = 2, sig = Q / (Math.PI * R * R);
 const exact = (z: number, a = 0) => sig / (2 * eps0) * (Math.sqrt(R * R + z * z) - Math.sqrt(a * a + z * z));
 it('is (σ/2ε₀)(√(R² + z²) − z), and a thin ring adds k ΔQ/√(s² + z²), not with the rim’s distance', () => {
  for (const z of [.2, 1, 3]) close(at(0, 0, z, diskCharges(R, sig, z)).v, exact(z), 1e-5);
  const s = .6, z = .8, thin = at(0, 0, z, circle(s, .01 / (2 * Math.PI), 0, 2 * Math.PI, 8)).v;
  close(thin, k * .01 / Math.sqrt(s * s + z * z), 1e-12); expect(Math.abs(k * .01 / Math.sqrt(R * R + z * z) - thin) / thin).toBeGreaterThan(.1);
 });
 it('∫ s ds/√(s² + z²) from 0 to R is √(R² + z²) − z: not twice it, not the upper end alone, not the field’s integral', () => {
  const z = .8, n = 100000, d = R / n; let I = 0;
  for (let i = 0; i < n; i++) { const s = (i + .5) * d; I += s * d / Math.sqrt(s * s + z * z); }
  const right = Math.sqrt(R * R + z * z) - z; close(I, right, 1e-8);
  for (const wrong of [2 * right, Math.sqrt(R * R + z * z), 1 / z - 1 / Math.sqrt(R * R + z * z)]) expect(Math.abs(wrong - I) / I).toBeGreaterThan(.1);
 });
 it('−dV/dz is the disk’s field: away from a positive disk, toward a negative one, where V is negative', () => {
  for (const s of [sig, -sig]) {
   const z = .7, cs = diskCharges(R, s, z), h = 1e-5, dVdz = (at(0, 0, z + h, cs).v - at(0, 0, z - h, cs).v) / (2 * h);
   close(-dVdz, at(0, 0, z, cs).ez, 1e-6);
   expect(Math.sign(-dVdz)).toBe(Math.sign(s)); expect(Math.sign(at(0, 0, z, cs).v)).toBe(Math.sign(s));
  }
  // holding the root still gives σ/(2ε₀), which is not the field
  expect(Math.abs(sig / (2 * eps0) - at(0, 0, .7, diskCharges(R, sig, .7)).ez) / (sig / (2 * eps0))).toBeGreaterThan(.1);
 });
 it('far up the axis is kQ/z; at the centre σR/(2ε₀) = 2kQ/R, twice kQ/R and finite', () => {
  close(at(0, 0, 400, diskCharges(R, sig, 400, 0, 400)).v, k * Q / 400, 1e-4);
  const c = at(0, 0, 1e-6, diskCharges(R, sig, 1e-6)).v;
  close(c, sig * R / (2 * eps0), 1e-4); close(c, 2 * k * Q / R, 1e-4);
 });
 it('grown at fixed σ, V grows without end while the field settles', () => {
  const v = (r: number) => at(0, 0, 1, diskCharges(r, sig, 1)).v, [v10, v100, v1000] = [v(10), v(100), v(1000)];
  expect(v100).toBeGreaterThan(5 * v10); expect(v1000).toBeGreaterThan(9 * v100);
  expect(v1000).toBeGreaterThan(100 * sig / (2 * eps0));
 });
 it('with a hole of radius a, V is (σ/2ε₀)(√(R² + z²) − √(a² + z²)), not a smaller disk’s, and not with a for the root', () => {
  const a = .5, z = .7, v = at(0, 0, z, diskCharges(R, sig, z, a)).v;
  close(v, exact(z, a), 1e-5);
  for (const wrong of [sig / (2 * eps0) * (Math.sqrt((R - a) ** 2 + z * z) - z), sig / (2 * eps0) * (Math.sqrt(R * R + z * z) - a)]) expect(Math.abs(wrong - v) / v).toBeGreaterThan(.05);
 });
});

describe('the potential at the centre of an arc', () => {
 const R = 1.2, Q = 1.7;
 it('is kQ/R at every opening, exactly, however few the pieces', () => {
  for (const phi of [.2, 1, Math.PI, 5, 2 * Math.PI]) for (const n of [1, 2, 5]) close(at(0, 0, 0, arcCharges(R, Q, phi, n)).v, k * Q / R, 1e-12);
 });
 it('closed into a ring, the field is zero and V is still kQ/R; a semicircle has the same V and a field', () => {
  const closed = at(0, 0, 0, arcCharges(R, Q, 2 * Math.PI, 1000)), semi = at(0, 0, 0, arcCharges(R, Q, Math.PI, 20000));
  expect(Math.hypot(closed.ex, closed.ey)).toBeLessThan(1e-9); close(closed.v, semi.v, 1e-12);
  close(semi.ex, -2 * k * Q / (Math.PI * R * R), 1e-6);
 });
 it('at fixed λ, V = kλφ grows with the opening', () => {
  const lam = .9, v = (phi: number) => at(0, 0, 0, arcCharges(R, lam * R * phi, phi, 50)).v;
  close(v(1), k * lam, 1e-12); close(v(2 * Math.PI), k * lam * 2 * Math.PI, 1e-12);
  expect(v(2)).toBeGreaterThan(v(1));
 });
 it('one piece adds kλΔθ; −dV/dR = kQ/R² is not the field at the centre', () => {
  const lam = Q / (R * Math.PI), dt = .01; close(at(0, 0, 0, [[R, 0, 0, lam * R * dt]]).v, k * lam * dt, 1e-12);
  for (const phi of [Math.PI, 2 * Math.PI]) expect(Math.abs(at(0, 0, 0, arcCharges(R, Q, phi, 4000)).ex + k * Q / R ** 2)).toBeGreaterThan(.1);
 });
 it('a negative arc’s potential is negative', () => { expect(at(0, 0, 0, arcCharges(R, -Q, 2, 10)).v).toBeLessThan(0); });
});

/* THE PHYSICS REVIEW'S CORRECTIONS, for the rings', disks', arcs' and sheet's banks: each claim reworded there is
 * checked here, for both signs of charge where the bank no longer fixes one. */
describe('the review of the rings’, disks’, arcs’ and sheet’s questions', () => {
 it('a long piece of ring: its part along the axis is exactly a point charge’s, though its sideways part is not', () => {
  const R = 1.3, z = .8, q = .5, piece = at(0, 0, z, circle(R, q / Math.PI, 0, Math.PI, 20000)); // half a ring as one piece
  const mid: Charge = [0, R, 0, q], point = at(0, 0, z, [mid]);
  close(piece.ez, point.ez, 1e-9);
  expect(Math.hypot(piece.ex, piece.ey)).toBeLessThan(.9 * Math.hypot(point.ex, point.ey)); // weaker, leaning closer to the axis
 });
 it('cut at equal angles, no ring of the sheet adds more than 2πk|σ|Δα in size, for either sign', () => {
  const N = 12, d = Math.PI / 2 / N;
  for (const sig of [.8, -.8]) for (let i = 0; i < N; i++) {
   const p = at(0, 0, 1, sheetCharges(sig, 1, i * d, i === N - 1 ? Math.PI / 2 - 1e-7 : (i + 1) * d, 300)).ez;
   expect(Math.sign(p)).toBe(Math.sign(sig)); expect(Math.abs(p)).toBeLessThanOrEqual(2 * Math.PI * k * Math.abs(sig) * d * (1 + 1e-9));
  }
 });
 it('a disk’s rim ring of width ds adds about 2πkσ z ds/s², a 1/s² fall-off whose sum beyond R is 2πkσ z/R', () => {
  const sig = .4, z = 1, ds = 1e-3;
  for (const s of [50, 100]) close(ring(s, sig * 2 * Math.PI * s * ds, z, 64).ez, 2 * Math.PI * k * sig * z * ds / s ** 2, 1e-3);
  const R = 30, rest = sig / (2 * eps0) - sig / (2 * eps0) * (1 - z / Math.sqrt(R * R + z * z));
  close(rest, 2 * Math.PI * k * sig * z / R, 1e-3);
 });
 it('mirror pieces of an arc never cancel along x; past a semicircle, other pieces do', () => {
  const R = 1.2, t = .7, a = at(0, 0, 0, [[R * Math.cos(t), R * Math.sin(t), 0, .1]]).ex, b = at(0, 0, 0, [[R * Math.cos(-t), R * Math.sin(-t), 0, .1]]).ex;
  close(a, b, 1e-12);
  const far = at(0, 0, 0, [[R * Math.cos(Math.PI - t), R * Math.sin(Math.PI - t), 0, .1]]).ex; close(far, -a, 1e-12);
 });
 it('the arc’s minus is the geometry’s: ΔE_x = −k ΔQ cos θ/R² for a negative piece too', () => {
  const R = 1.2;
  for (const t of [.3, -1, 2.2]) close(at(0, 0, 0, [[R * Math.cos(t), R * Math.sin(t), 0, -.1]]).ex, -k * -.1 * Math.cos(t) / R ** 2, 1e-12);
 });
 it('for a negative ring the field’s size is how steeply |V| falls up the axis', () => {
  const R = 1.3, cs = circle(R, -2 / (2 * Math.PI), 0, 2 * Math.PI, 64), z = .9, h = 1e-5;
  const slope = (Math.abs(at(0, 0, z + h, cs).v) - Math.abs(at(0, 0, z - h, cs).v)) / (2 * h), f = at(0, 0, z, cs);
  close(-slope, Math.abs(f.ez), 1e-7); expect(f.ez).toBeLessThan(0);
 });
 it('at fixed negative σ or λ the potential’s size grows, keeping its sign', () => {
  const sig = -.3, v = (r: number) => at(0, 0, 1, diskCharges(r, sig, 1)).v;
  expect(v(10)).toBeLessThan(0); expect(Math.abs(v(100))).toBeGreaterThan(5 * Math.abs(v(10)));
  const lam = -.9, R = 1.2, va = (phi: number) => at(0, 0, 0, arcCharges(R, lam * R * phi, phi, 50)).v;
  expect(va(1)).toBeLessThan(0); expect(Math.abs(va(2))).toBeGreaterThan(Math.abs(va(1)));
 });
});

/* THE PHYSICS REVIEW OF THE SEMI-INFINITE LINE, THE α RENAME AND THE LINKS: each claim reworded there, checked by
 * number for both signs of charge, and pinned as it now reads. */
describe('the review of the semi-infinite line, the α rename and the links', () => {
 const half = (r: number, l: number) => line(r, 0, 0, 1e5 * r, () => l, 400000);
 const below = (r: number, l: number) => line(r, 0, -1e5 * r, 0, () => l, 400000);
 it('the mirror half added gives 2kλ/r along x, perpendicular to the line, for either sign: not "straight out"', () => {
  for (const l of [1.5, -1.5]) {
   const up = half(1, l), down = below(1, l);
   close(up.ex + down.ex, 2 * k * l, 1e-3); expect(Math.abs(up.ey + down.ey)).toBeLessThan(1e-4);
  }
  // a negative line's sum points in, toward the line: "straight out" held for a positive line only
  expect(half(1, -1.5).ex + below(1, -1.5).ex).toBeLessThan(0);
  const add = bankSemi.find(q => q.id === 'semi-add-mirror')!;
  expect(add.choices.find(c => c.correct)!.text).not.toMatch(/straight (away|out)/);
  expect(add.explanation).not.toMatch(/straight out/);
  expect(semiLesson.sections.flatMap(s => s.body).filter(b => typeof b === 'string').join(' ')).not.toMatch(/straight out/);
 });
 it('cut in half, the infinite line’s part along it is −kλ/r, signed: back past the end for a positive line', () => {
  for (const l of [1.5, -1.5]) close(half(1, l).ey, -k * l, 1e-3);
  const q = bankInfinite.find(x => x.id === 'infinite-cut-in-half')!;
  expect(q.explanation).toContain(String.raw`-(k\lambda/r)\int\sin\alpha\,d\alpha=-k\lambda/r`);
 });
 it('a half line fills a quarter turn at P from any distance, not half a turn, and its field still halves as r doubles', () => {
  for (const r of [.5, 3]) close(Math.atan2(1e9 * r, r), Math.PI / 2, 1e-8);
  for (const l of [1.5, -1.5]) { const a = half(1, l), b = half(2, l); close(b.ex / a.ex, .5, 2e-3); close(b.ey / a.ey, .5, 2e-3); }
  expect(MISCONCEPTION.get('line-falloff')!.idea).toMatch(/a quarter turn for a half line/);
 });
 it('cut at equal angles, the outermost piece never ends at any N: it grows thinner only in angle, and its field still shrinks', () => {
  const r = 1, l = 1.5;
  for (const n of [4, 40]) {
   const da = Math.PI / 2 / n, outer = line(r, 0, r * Math.tan(Math.PI / 2 - da), 1e9, () => l, 200000);
   // its whole field is 2kλ sin(Δα/2)/r: it shrinks with Δα though the piece is endless
   close(Math.hypot(outer.ex, outer.ey), 2 * k * l * Math.sin(da / 2) / r, 1e-3);
  }
  for (const id of ['infinite', 'semi', 'sheet']) {
   expect(boardLines(getProblem(id)).find(b => b.key === 'limit')!.say, id).toMatch(/grow ever thinner in angle/);
   expect(buildStages(getProblem(id)).at(-1)!.caption, id).toMatch(/grow ever thinner in angle/);
  }
  expect(boardLines(getProblem('bisector')).find(b => b.key === 'limit')!.say).not.toMatch(/in angle/);
 });
 it('the endless line’s piece is r sec²α dα long: the rename reached the misconception that names it', () => {
  const r = 2, d = 1e-6, a = 1.1;
  close(r * Math.tan(a + d / 2) - r * Math.tan(a - d / 2), r * d / Math.cos(a) ** 2, 1e-6);
  expect(MISCONCEPTION.get('piece-length')!.idea).toContain(String.raw`r\sec^2\alpha\,d\alpha`);
  expect(MISCONCEPTION.get('piece-length')!.idea).not.toContain(String.raw`\sec^2\theta`);
 });
 it('the arc’s potential ignores the opening only at a fixed charge, and its link says so', () => {
  const R = 1.2, Q = 1.7, lam = .9;
  close(at(0, 0, 0, arcCharges(R, Q, 1, 50)).v, at(0, 0, 0, arcCharges(R, Q, 5, 50)).v, 1e-12);
  expect(at(0, 0, 0, arcCharges(R, lam * R * 5, 5, 50)).v).toBeGreaterThan(at(0, 0, 0, arcCharges(R, lam * R, 1, 50)).v);
  const link = getProblem('arc').link!;
  expect(link.text).toMatch(/at a fixed charge/); expect(link.from).toMatch(/at a fixed charge/);
 });
 it('a rod grown at fixed λ becomes the endless line; at fixed Q its field goes to zero, so the links hold λ', () => {
  const r = 1, Q = 3, lam = 1.5;
  for (const L of [1e4, 1e6]) {
   const f = line(r, 0, 0, L, () => lam, 200000); close(f.ex, k * lam / r, 1e-3);
   expect(line(r, 0, 0, L, () => Q / L, 200000).ex).toBeLessThan(1e-3);
  }
  expect(getProblem('endpoint').link!.from).toMatch(/hold λ fixed/);
  expect(getProblem('bisector').link!.from).toMatch(/hold λ fixed/);
 });
});

/* GAUSS'S LAW. The Gauss banks (src/quiz/bank/gauss-*.ts) checked the same way: fluxes as sums over a surface's
 * patches of the field of point charges, charges inside as sums of thin shells or slices, a sheet as a sum of
 * rings, a shell as a sum of point charges. Every check runs for both signs. */
type P3 = [number, number, number];
type PointCharge = [number, number, number, number];
const gdot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** The field at p of point charges [x, y, z, q]. */
function pointsE(cs: PointCharge[], p: P3): P3 {
 let ex = 0, ey = 0, ez = 0;
 for (const [x, y, z, q] of cs) { const dx = p[0] - x, dy = p[1] - y, dz = p[2] - z, r3 = Math.hypot(dx, dy, dz) ** 3; ex += k * q * dx / r3; ey += k * q * dy / r3; ez += k * q * dz / r3; }
 return [ex, ey, ez];
}
/** The flux of E out through a sphere of radius R about c, patch by patch, with the flux out and in apart, and the
 * largest and smallest outward part of E on a patch. */
function sphereFlux(E: (p: P3) => P3, c: P3, R: number, nt = 240, np = 480) {
 let flux = 0, out = 0, inn = 0, most = -Infinity, least = Infinity; const dt = Math.PI / nt, dp = 2 * Math.PI / np;
 for (let i = 0; i < nt; i++) {
  const t = (i + .5) * dt, st = Math.sin(t), ct = Math.cos(t);
  for (let j = 0; j < np; j++) {
   const ph = (j + .5) * dp, n: P3 = [st * Math.cos(ph), st * Math.sin(ph), ct];
   const en = gdot(E([c[0] + R * n[0], c[1] + R * n[1], c[2] + R * n[2]]), n), f = en * R * R * st * dt * dp;
   flux += f; if (f > 0) out += f; else inn += f; most = Math.max(most, en); least = Math.min(least, en);
  }
 }
 return {flux, out, inn, most, least};
}
/** A uniform shell of radius R and charge Q as point charges, centred on the origin. */
function shellCharges(R: number, Q: number, nt = 300, np = 600): PointCharge[] {
 const out: PointCharge[] = [], dt = Math.PI / nt, dp = 2 * Math.PI / np;
 for (let i = 0; i < nt; i++) { const t = (i + .5) * dt; for (let j = 0; j < np; j++) { const ph = (j + .5) * dp; out.push([R * Math.sin(t) * Math.cos(ph), R * Math.sin(t) * Math.sin(ph), R * Math.cos(t), Q / (4 * Math.PI) * Math.sin(t) * dt * dp]); } }
 return out;
}
/** The field E_z of an endless uniform sheet in the plane z = z0, at height z on its axis: a sum of rings, each
 * adding its own field on its axis, out to radii far beyond z. */
function sheetEz(sigma: number, z0: number, z: number, n = 40000) {
 const h = z - z0, d = Math.abs(h), top = Math.atan(1e7 / d), da = top / n;
 let e = 0;
 for (let i = 0; i < n; i++) { const a = (i + .5) * da, s = d * Math.tan(a), ds = d / Math.cos(a) ** 2 * da; e += k * sigma * 2 * Math.PI * s * ds * h / (s * s + h * h) ** 1.5; }
 return e;
}
/** The charge inside radius r of a ball with density rho(r′), by thin shells ρ 4πr′² dr′; and the slip ∫ρ dr′. */
const shells = (rho: (r: number) => number, r: number, n = 20000) => { let q = 0; const dr = r / n; for (let i = 0; i < n; i++) { const x = (i + .5) * dr; q += rho(x) * 4 * Math.PI * x * x * dr; } return q; };
const thin = (rho: (r: number) => number, r: number, n = 20000) => { let q = 0; const dr = r / n; for (let i = 0; i < n; i++) q += rho((i + .5) * dr) * dr; return q; };

describe('Gauss: symmetry first', () => {
 for (const s of [1, -1]) {
  it(`the endless line’s field is λ/2πε₀r, falls as 1/r, and has no part along the line (sign ${s})`, () => {
   const lam = 1.3 * s;
   for (const r of [.5, 1, 2]) { const f = line(r, 0, -1e5, 1e5, () => lam); close(f.ex, lam / (2 * Math.PI * eps0 * r), 2e-3); expect(Math.abs(f.ey)).toBeLessThan(1e-6); }
   close(line(2, 0, -1e5, 1e5, () => lam).ex, line(1, 0, -1e5, 1e5, () => lam).ex / 2, 2e-3);
   // The cylinder's wall carries E_r 2πrL, which is λL/ε₀; a 1/r² field would be another number.
   const r = 1, L = 3, er = line(r, 0, -1e5, 1e5, () => lam).ex;
   close(er * 2 * Math.PI * r * L, lam * L / eps0, 2e-3);
   expect(Math.abs(lam / (4 * Math.PI * eps0 * r * r) - er)).toBeGreaterThan(.1 * Math.abs(er));
  });
  it(`a finite rod’s field leans away from its middle, and changes along a coaxial wall (sign ${s})`, () => {
   const lam = s, L = 2, r = .5;
   const mid = line(r, 0, -L / 2, L / 2, () => lam), off = line(r, .6, -L / 2, L / 2, () => lam);
   expect(Math.abs(off.ey)).toBeGreaterThan(.2 * Math.abs(off.ex));
   expect(Math.abs(mid.ex - off.ex)).toBeGreaterThan(.1 * Math.abs(mid.ex));
  });
  it(`a sheet’s field is σ/2ε₀ at every height, toward it on both sides when negative; the pillbox’s faces add (sign ${s})`, () => {
   const sigma = .8 * s;
   for (const z of [.2, 1, 5]) { close(sheetEz(sigma, 0, z), sigma / (2 * eps0), 1e-3); close(sheetEz(sigma, 0, -z), -sigma / (2 * eps0), 1e-3); }
   // Top face, outward +z, carries E_z(z)A; bottom face, outward −z, carries −E_z(−z)A: they add to σA/ε₀.
   const A = .7, z = .9, flux = sheetEz(sigma, 0, z) * A - sheetEz(sigma, 0, -z) * A;
   close(flux, sigma * A / eps0, 1e-3);
   expect(Math.sign(sheetEz(sigma, 0, z))).toBe(s);
  });
 }
});

describe('Gauss: flux', () => {
 it('through a flat patch is EA cos θ from the normal, EA sin β from the surface, zero edge on', () => {
  const E = 2.3, A = .6;
  for (const th of [0, .4, 1.1, Math.PI / 2]) {
   const n: P3 = [Math.sin(th), 0, Math.cos(th)], f = gdot([0, 0, E], n) * A;
   close(f + 1, E * A * Math.cos(th) + 1, 1e-12);
   const beta = Math.PI / 2 - th; close(f + 1, E * A * Math.sin(beta) + 1, 1e-12);
  }
 });
 for (const s of [1, -1]) {
  it(`round a point charge it is q/ε₀ on every sphere: at twice the radius, a quarter the field over four times the area (sign ${s})`, () => {
   const q = 1.7 * s, E = (p: P3) => pointsE([[0, 0, 0, q]], p);
   for (const R of [.8, 1.6]) close(sphereFlux(E, [0, 0, 0], R).flux, q / eps0, 1e-4);
   close(Math.hypot(...E([1.6, 0, 0])), Math.hypot(...E([.8, 0, 0])) / 4, 1e-12);
   expect(Math.sign(sphereFlux(E, [0, 0, 0], 1).flux)).toBe(s);
  });
  it(`a sphere of diameter d has area πd², the field on it 4k|q|/d², and the flux πd²E (sign ${s})`, () => {
   const q = s * 1.1, d = 1.4, E = (p: P3) => pointsE([[0, 0, 0, q]], p), area = sphereFlux(p => { const n = Math.hypot(...p); return [p[0] / n, p[1] / n, p[2] / n]; }, [0, 0, 0], d / 2).flux;
   close(area, Math.PI * d * d, 1e-4);
   const e = Math.hypot(...E([d / 2, 0, 0])); close(e, 4 * k * Math.abs(q) / d ** 2, 1e-12);
   close(Math.abs(sphereFlux(E, [0, 0, 0], d / 2).flux), Math.PI * d * d * e, 1e-4);
  });
  it(`a charge outside adds zero, though its field crosses every patch; with one inside the flux is the inside one’s (sign ${s})`, () => {
   const q1 = .9 * s, q2 = -1.4 * s, out = (p: P3) => pointsE([[0, 0, 2.2, q2]], p), both = (p: P3) => pointsE([[.3, 0, 0, q1], [0, 0, 2.2, q2]], p);
   const f = sphereFlux(out, [0, 0, 0], 1);
   expect(Math.abs(f.flux)).toBeLessThan(1e-4 * Math.abs(f.out));
   close(f.out, -f.inn, 1e-4); expect(Math.min(Math.abs(f.most), Math.abs(f.least))).toBeGreaterThan(0);
   close(sphereFlux(both, [0, 0, 0], 1).flux, q1 / eps0, 1e-4);
  });
  it(`charges adding to zero inside give zero flux, and a field that is not zero on the surface (sign ${s})`, () => {
   const q = s, E = (p: P3) => pointsE([[.3, 0, 0, q], [-.3, 0, 0, -q]], p), f = sphereFlux(E, [0, 0, 0], 1);
   expect(Math.abs(f.flux)).toBeLessThan(1e-4 * f.out);
   expect(Math.hypot(...E([1, 0, 0]))).toBeGreaterThan(.5);
  });
 }
});

describe('Gauss: why only the charge inside', () => {
 for (const s of [1, -1]) {
  it(`moved off the centre, anywhere inside, the flux stays q/ε₀ and the near patches carry more; outside, zero (sign ${s})`, () => {
   const q = 1.2 * s;
   const centred = sphereFlux(p => pointsE([[0, 0, 0, q]], p), [0, 0, 0], 1);
   for (const z of [.3, .6, .75]) {
    const f = sphereFlux(p => pointsE([[0, 0, z, q]], p), [0, 0, 0], 1);
    close(f.flux, q / eps0, 2e-4);
    expect(Math.max(Math.abs(f.most), Math.abs(f.least))).toBeGreaterThan(2 * Math.max(Math.abs(centred.most), Math.abs(centred.least)));
   }
   for (const z of [1.25, 1.6, 3]) expect(Math.abs(sphereFlux(p => pointsE([[0, 0, z, q]], p), [0, 0, 0], 1).flux)).toBeLessThan(2e-3 * Math.abs(q / eps0));
  });
  it(`a lumpy closed surface round an off-centre charge fills the whole solid angle, 4π, and carries q/ε₀ (sign ${s})`, () => {
   const q = s * .7, at: P3 = [.15, -.1, .2], rad = (t: number, ph: number) => 1 + .3 * Math.sin(3 * t) * Math.cos(2 * ph);
   const pt = (t: number, ph: number): P3 => { const r = rad(t, ph); return [r * Math.sin(t) * Math.cos(ph), r * Math.sin(t) * Math.sin(ph), r * Math.cos(t)]; };
   const nt = 300, np = 600, dt = Math.PI / nt, dp = 2 * Math.PI / np, h = 1e-6;
   let flux = 0, omega = 0;
   for (let i = 0; i < nt; i++) for (let j = 0; j < np; j++) {
    const t = (i + .5) * dt, ph = (j + .5) * dp, p = pt(t, ph), a = pt(t + h, ph), b = pt(t, ph + h);
    const ut: P3 = [(a[0] - p[0]) / h, (a[1] - p[1]) / h, (a[2] - p[2]) / h], up: P3 = [(b[0] - p[0]) / h, (b[1] - p[1]) / h, (b[2] - p[2]) / h];
    const dA: P3 = [(ut[1] * up[2] - ut[2] * up[1]) * dt * dp, (ut[2] * up[0] - ut[0] * up[2]) * dt * dp, (ut[0] * up[1] - ut[1] * up[0]) * dt * dp];
    const sv: P3 = [p[0] - at[0], p[1] - at[1], p[2] - at[2]], sl = Math.hypot(...sv);
    omega += gdot(sv, dA) / sl ** 3; flux += gdot(pointsE([[...at, q]], p), dA);
   }
   close(omega, 4 * Math.PI, 2e-3); close(flux, q / eps0, 2e-3);
  });
  it(`the capacitor: between the plates σ/ε₀, outside zero; the pillbox’s flux is σA/ε₀, all through the inner face (sign ${s})`, () => {
   const sigma = s * .6, d = 1, A = .5, between = .4, outside = -.4;
   const E = (z: number) => sheetEz(sigma, 0, z) + sheetEz(-sigma, d, z);
   close(E(between), sigma / eps0, 1e-3); expect(Math.abs(E(outside))).toBeLessThan(1e-3 * Math.abs(sigma / eps0));
   close(E(between) * A - E(outside) * A, sigma * A / eps0, 1e-3);
   // The plate's own field on each face gives the right flux but the wrong field on each face.
   expect(Math.abs(sheetEz(sigma, 0, between) - E(between))).toBeGreaterThan(.4 * Math.abs(E(between)));
  });
  it(`a rod through the sphere gives λℓ/ε₀, with ℓ the length inside, not λL/ε₀ (sign ${s})`, () => {
   const lam = s * .5, b = .5, L = 4, n = 80, dl = L / n, cs: PointCharge[] = [];
   for (let i = 0; i < n; i++) { const y = -L / 2 + (i + .5) * dl; if (Math.abs(Math.hypot(b, y) - 1) > .05) cs.push([b, y, 0, lam * dl]); }
   const ell = 2 * Math.sqrt(1 - b * b), inside = cs.filter(c => Math.hypot(c[0], c[1]) < 1).reduce((t, c) => t + c[3], 0);
   close(inside, lam * ell, .1);
   close(sphereFlux(p => pointsE(cs, p), [0, 0, 0], 1).flux, inside / eps0, 5e-3);
   expect(Math.abs(inside - lam * L)).toBeGreaterThan(.3 * Math.abs(lam * L));
  });
 }
});

describe('Gauss: shells and Q_enc', () => {
 for (const s of [1, -1]) {
  it(`a uniform shell makes no field anywhere inside and a point charge’s outside; the jump is σ/ε₀ (sign ${s})`, () => {
   const R = 1, Q = 1.3 * s, cs = shellCharges(R, Q);
   for (const p of [[0, 0, 0], [.4, .1, 0], [0, .3, -.5], [.6, 0, 0]] as P3[]) expect(Math.hypot(...pointsE(cs, p))).toBeLessThan(1e-3 * Math.abs(Q));
   for (const r of [1.5, 3]) close(pointsE(cs, [r, 0, 0])[0], k * Q / r ** 2, 1e-3);
   close(k * Q / R ** 2, Q / (4 * Math.PI * R * R) / eps0, 1e-12);
   const D = 2 * R; close(k * Q / R ** 2, 4 * k * Q / D ** 2, 1e-12);
  });
  it(`a uniform ball encloses Qr³/R³, so E_r = kQr/R³ inside, meeting kQ/r² at R (sign ${s})`, () => {
   const R = 1.1, Q = 2 * s, rho = () => Q / (4 / 3 * Math.PI * R ** 3);
   for (const r of [.3, .55, .9]) { close(shells(rho, r), Q * r ** 3 / R ** 3, 1e-6); close(k * shells(rho, r) / r ** 2, k * Q * r / R ** 3, 1e-6); }
   close(shells(rho, R / 2), Q / 8, 1e-6);
   close(k * Q * R / R ** 3, k * Q / R ** 2, 1e-12);
   // The ratio of areas would leave the field level inside, at kQ/R².
   const r = .5 * R; expect(Math.abs(k * Q * r ** 2 / R ** 2 / r ** 2 - k * Q * r / R ** 3)).toBeGreaterThan(.4 * Math.abs(k * Q / R ** 2));
  });
  it(`the falling density: ρ₀ = 3Q/πR³, four times the average; Q_enc = Q(4r³/R³ − 3r⁴/R⁴); the outer half holds eleven sixteenths (sign ${s})`, () => {
   const R = 1.1, Q = 1.5 * s, rho0 = 3 * Q / (Math.PI * R ** 3), rho = (r: number) => rho0 * (1 - r / R);
   close(shells(rho, R), Q, 1e-6);
   close(rho0, 4 * Q / (4 / 3 * Math.PI * R ** 3), 1e-12);
   for (const x of [.2, .5, .8]) close(shells(rho, x * R), Q * (4 * x ** 3 - 3 * x ** 4), 1e-6);
   close(shells(rho, R / 2), 5 / 16 * Q, 1e-6); close(Q - shells(rho, R / 2), 11 / 16 * Q, 1e-6);
   // Carrying the formula on past R takes charge away: the limit outside is R.
   for (const x of [1.1, 1.3, 1.5]) { expect(shells(rho, x * R) / Q).toBeLessThan(1); expect(shells(rho, x * R) / Q).toBeLessThan(shells(rho, (x - .1) * R) / Q); }
   // ∫ρ dr′ is not a charge: even normalised to Q at R it is another function of r.
   const wrong = (r: number) => thin(rho, r) / thin(rho, R) * Q;
   expect(Math.abs(wrong(R / 2) - shells(rho, R / 2))).toBeGreaterThan(.3 * Math.abs(Q));
  });
  it(`the rising density: ρ₀ = Q/πR³, Q_enc = Qr⁴/R⁴, ρ dr′ would give Qr²/R²; its field is below the uniform ball’s inside (sign ${s})`, () => {
   const R = 1.1, Q = 1.7 * s, rho0 = Q / (Math.PI * R ** 3), rho = (r: number) => rho0 * r / R;
   close(shells(rho, R), Q, 1e-6);
   for (const x of [.25, .5, .9]) {
    close(shells(rho, x * R), Q * x ** 4, 1e-6); close(shells(rho, x * R), Math.PI * rho0 * (x * R) ** 4 / R, 1e-6);
    close(thin(rho, x * R) / thin(rho, R) * Q, Q * x * x, 1e-6);
    const uniform = k * Q * x * R / R ** 3, rising = k * shells(rho, x * R) / (x * R) ** 2;
    close(rising, k * Q * (x * R) ** 2 / R ** 4, 1e-6); expect(Math.abs(rising)).toBeLessThan(Math.abs(uniform));
   }
  });
  it(`outside R every one of the four makes kQ/r² (sign ${s})`, () => {
   const R = 1, Q = s, r = 1.8;
   const enc = [Q, Q, shells(() => Q / (4 / 3 * Math.PI), R), shells(x => Q / Math.PI * x, R)];
   for (const e of enc) close(k * e / r ** 2, k * Q / r ** 2, 1e-6);
  });
  it(`the slab: Q_enc = 2ρ₀A(z − z²/2a), half that undoubled; its field, a sum of slices, is ρ₀(z − z²/2a)/ε₀ (sign ${s})`, () => {
   const rho0 = .9 * s, a = .7, A = .4, n = 20000;
   for (const z of [.2, .5]) {
    let half = 0; const dz = z / n; for (let i = 0; i < n; i++) half += rho0 * (1 - (i + .5) * dz / a) * A * dz;
    close(2 * half, 2 * rho0 * A * (z - z * z / (2 * a)), 1e-6);
    // Each slice is a sheet of σ = ρ dz′: those below z push up, those above push down, each σ/2ε₀.
    let e = 0; const dzz = 2 * a / n; for (let i = 0; i < n; i++) { const zp = -a + (i + .5) * dzz, sig = rho0 * (1 - Math.abs(zp) / a) * dzz; e += (zp < z ? 1 : -1) * sig / (2 * eps0); }
    close(e, rho0 / eps0 * (z - z * z / (2 * a)), 1e-3);
    close(2 * e * A, 2 * half / eps0, 1e-3);
   }
  });
  it(`a uniform cylinder encloses λL r²/R², not the ball’s cube ratio (sign ${s})`, () => {
   const lam = 1.2 * s, R = .9, L = 2.5, rho = lam / (Math.PI * R * R), n = 20000;
   for (const r of [.3, .6]) {
    let q = 0; const dr = r / n; for (let i = 0; i < n; i++) { const x = (i + .5) * dr; q += rho * 2 * Math.PI * x * L * dr; }
    close(q, lam * L * r * r / (R * R), 1e-6); expect(Math.abs(q - lam * L * r ** 3 / R ** 3)).toBeGreaterThan(.05 * Math.abs(q));
   }
  });
 }
});

/* THE LAST SIX GAUSS BANKS, checked the same way. Long straight charges are filaments, each adding its own line field
 * 2kλᵢ/d in the plane square to them; slabs are stacks of sheets, each adding ±σᵢ/2ε₀; a ball with a hole is a grid of
 * point charges with the hole left empty; a metal's surface charges are point charges placed where the lesson puts
 * them, and the field in the metal is summed to show it is zero. Every check runs for both signs. */
type F2 = [number, number, number];
/** Filaments [x, y, λ] square to the plane; their field at (px, py). */
function filE(fs: F2[], px: number, py: number): [number, number] {
 let ex = 0, ey = 0;
 for (const [x, y, l] of fs) { const dx = px - x, dy = py - y, d2 = dx * dx + dy * dy; ex += 2 * k * l * dx / d2; ey += 2 * k * l * dy / d2; }
 return [ex, ey];
}
/** A thin cylindrical shell of radius R carrying lam per unit length, as n filaments round it, centred at (cx, cy). */
const tubeFil = (R: number, lam: number, n = 4000, cx = 0, cy = 0): F2[] => Array.from({length: n}, (_, j) => { const t = (j + .5) * 2 * Math.PI / n; return [cx + R * Math.cos(t), cy + R * Math.sin(t), lam / n]; });
/** A solid rod of radius R carrying lam per unit length evenly, as nr rings of nt filaments. */
function rodFil(R: number, lam: number, nr = 100, nt = 4000): F2[] {
 const out: F2[] = [], dr = R / nr;
 for (let i = 0; i < nr; i++) { const r = (i + .5) * dr; out.push(...tubeFil(r, lam * 2 * r * dr / (R * R), nt)); }
 return out;
}
/** Sheets [z, σ] parallel to the xy-plane; E_z at height z. */
const sheetsEz = (ss: [number, number][], z: number) => ss.reduce((e, [zi, s]) => e + (z > zi ? 1 : -1) * s / (2 * eps0), 0);
/** A slab from z0 to z1 with density rho(z) as n thin sheets. */
const slabSheets = (rho: (z: number) => number, z0: number, z1: number, n = 20000): [number, number][] => Array.from({length: n}, (_, i) => { const z = z0 + (i + .5) * (z1 - z0) / n; return [z, rho(z) * (z1 - z0) / n]; });
/** The finite rod from z = −ℓ to ℓ on the z-axis, λ per unit length: its field at (s, z), exactly, summed in closed form. */
const rodEs = (lam: number, l: number, s: number, z: number) => k * lam / s * ((z + l) / Math.hypot(s, z + l) - (z - l) / Math.hypot(s, z - l));
const rodEz = (lam: number, l: number, s: number, z: number) => k * lam * (1 / Math.hypot(s, z - l) - 1 / Math.hypot(s, z + l));
/** The flux out of a closed cylinder of radius r and half-length h round the finite rod: its wall and its two ends. */
function rodCylinderFlux(lam: number, l: number, r: number, h: number, n = 20000) {
 let wall = 0, ends = 0; const dz = 2 * h / n, ds = r / n;
 for (let i = 0; i < n; i++) wall += rodEs(lam, l, r, -h + (i + .5) * dz) * 2 * Math.PI * r * dz;
 for (let i = 0; i < n; i++) { const s = (i + .5) * ds; ends += 2 * rodEz(lam, l, s, h) * 2 * Math.PI * s * ds; }
 return {wall, ends, total: wall + ends};
}

describe('Gauss: lines and cylinders', () => {
 for (const s of [1, -1]) {
  it(`the line: λ/2πε₀r, half as big at twice the radius, with no L in it (sign ${s})`, () => {
   const lam = 1.1 * s, e1 = line(.8, 0, -1e5, 1e5, () => lam).ex, e2 = line(1.6, 0, -1e5, 1e5, () => lam).ex;
   close(e1, lam / (2 * Math.PI * eps0 * .8), 2e-3); close(e2, e1 / 2, 2e-3);
   expect(Math.abs(e2 - e1 / 4)).toBeGreaterThan(.2 * Math.abs(e1));
   // The wall carries E_r 2πrL, which is λL/ε₀ for every length L: the L cancels.
   for (const L of [.5, 3]) close(e1 * 2 * Math.PI * .8 * L, lam * L / eps0, 2e-3);
  });
  it(`the solid rod: Q_enc = λL r²/R², E_r = λr/2πε₀R² inside, a line’s outside, meeting at R, zero on the axis (sign ${s})`, () => {
   const R = 1, lam = 1.3 * s, fs = rodFil(R, lam);
   for (const r of [.3, .6, .9]) {
    const inside = fs.filter(f => Math.hypot(f[0], f[1]) < r).reduce((t, f) => t + f[2], 0);
    close(inside, lam * r * r / (R * R), 1e-6); expect(Math.abs(inside - lam * r ** 3)).toBeGreaterThan(.05 * Math.abs(inside));
    const [ex, ey] = filE(fs, r * Math.cos(.3), r * Math.sin(.3)), er = ex * Math.cos(.3) + ey * Math.sin(.3);
    close(er, lam * r / (2 * Math.PI * eps0 * R * R), 2e-3); expect(Math.abs(-ex * Math.sin(.3) + ey * Math.cos(.3))).toBeLessThan(1e-3 * Math.abs(er));
    expect(Math.sign(er)).toBe(s);
   }
   close(filE(fs, 1.5, 0)[0], lam / (2 * Math.PI * eps0 * 1.5), 1e-3);
   close(lam * R / (2 * Math.PI * eps0 * R * R), lam / (2 * Math.PI * eps0 * R), 1e-12);
   expect(Math.abs(filE(fs, 1e-3, 0)[0])).toBeLessThan(1e-2 * Math.abs(lam / (2 * Math.PI * eps0 * R)));
   // Its size grows to the surface: largest there.
   expect(Math.abs(filE(fs, .5, 0)[0])).toBeLessThan(Math.abs(filE(fs, .9, 0)[0]));
   expect(Math.abs(filE(fs, 1.2, 0)[0])).toBeLessThan(Math.abs(filE(fs, .99, 0)[0]));
  });
  it(`the cylindrical shell: no field anywhere in the hollow, a line’s outside, σR/ε₀r for σ = λ/2πR, a jump of σ/ε₀ (sign ${s})`, () => {
   const R = 1, lam = .9 * s, fs = tubeFil(R, lam), out = lam / (2 * Math.PI * eps0 * 1.7);
   for (const [x, y] of [[0, 0], [.4, .1], [-.2, .6], [.75, 0]]) expect(Math.hypot(...filE(fs, x, y))).toBeLessThan(1e-6 * Math.abs(out));
   close(filE(fs, 1.7, 0)[0], out, 1e-6);
   const sigma = lam / (2 * Math.PI * R); close(sigma * R / (eps0 * 1.7), out, 1e-12);
   close(filE(fs, 1.005, 0)[0] - filE(fs, .995, 0)[0], sigma / eps0, 2e-2);
   // σ in place of λ would be another field, and so would an L left in.
   expect(Math.abs(sigma / (2 * Math.PI * eps0 * 1.7) - out)).toBeGreaterThan(.5 * Math.abs(out));
  });
  it(`the coaxial cable: nothing inside both or outside both, the inner shell’s line field between (sign ${s})`, () => {
   const lam = 1.2 * s, inner = tubeFil(.8, lam), outer = tubeFil(1.7, -lam), both = [...inner, ...outer];
   for (const r of [.3, 2.2, 3]) expect(Math.abs(filE(both, r, .1)[0])).toBeLessThan(1e-6);
   for (const r of [1, 1.4]) close(filE(both, r, 0)[0], lam / (2 * Math.PI * eps0 * r), 1e-6);
   // Outside, the outer shell’s field is the line field of −λ, not nothing.
   close(filE(outer, 2.2, 0)[0], -lam / (2 * Math.PI * eps0 * 2.2), 1e-6);
  });
  it(`a rod a few times longer than the distance: its field is not a line’s, and leans off the middle (sign ${s})`, () => {
   const lam = s, r = .5, l = 1;
   const mid = line(r, 0, -l, l, () => lam), off = line(r, .7, -l, l, () => lam);
   expect(Math.abs(mid.ex - lam / (2 * Math.PI * eps0 * r))).toBeGreaterThan(.05 * Math.abs(mid.ex));
   expect(Math.abs(off.ey)).toBeGreaterThan(.2 * Math.abs(off.ex));
  });
 }
});

describe('Gauss: sheets and slabs', () => {
 for (const s of [1, -1]) {
  it(`the sheet: σ/2ε₀ at every height, both faces of the pillbox carrying σA/2ε₀ with one sign, a jump of σ/ε₀ (sign ${s})`, () => {
   const sigma = .7 * s, A = .6;
   for (const z of [.3, .9, 1.7]) {
    const top = sheetEz(sigma, 0, z) * A, bottom = -sheetEz(sigma, 0, -z) * A;
    close(top, sigma * A / (2 * eps0), 1e-3); close(bottom, top, 1e-3); close(top + bottom, sigma * A / eps0, 1e-3);
   }
   close(sheetEz(sigma, 0, .01) - sheetEz(sigma, 0, -.01), sigma / eps0, 1e-3);
   expect(Math.abs(sheetEz(sigma, 0, .5) - sigma / eps0)).toBeGreaterThan(.4 * Math.abs(sigma / eps0));
  });
  it(`the slab: Q_enc = 2ρAz, ρz/ε₀ inside, ρa/ε₀ at every height outside, toward it on both sides when negative; a sheet of 2ρa from outside (sign ${s})`, () => {
   const rho = 1.1 * s, a = .6, A = .5, ss = slabSheets(() => rho, -a, a);
   for (const z of [.15, .4]) {
    const q = ss.filter(([zi]) => Math.abs(zi) < z).reduce((t, [, sg]) => t + sg * A, 0);
    close(q, 2 * rho * A * z, 1e-3); close(sheetsEz(ss, z), rho * z / eps0, 1e-3);
   }
   for (const z of [.8, 1.5, 4]) { close(sheetsEz(ss, z), rho * a / eps0, 1e-6); close(sheetsEz(ss, -z), -rho * a / eps0, 1e-6); }
   expect(Math.sign(sheetsEz(ss, 1))).toBe(s); expect(Math.sign(sheetsEz(ss, -1))).toBe(-s);
   close(2 * rho * a / (2 * eps0), rho * a / eps0, 1e-12);
   close(sheetsEz(ss, a), rho * a / eps0, 1e-3);
  });
  it(`the capacitor: σ/ε₀ from the σ plate toward the −σ one, nothing outside; a pillbox round both has zero flux, as a uniform field would too (sign ${s})`, () => {
   const sigma = .8 * s, d = 1, A = .4, E = (z: number) => sheetEz(sigma, d, z) + sheetEz(-sigma, 0, z);
   close(E(.5), -sigma / eps0, 1e-3);
   for (const z of [1.4, 3, -.5, -2]) expect(Math.abs(E(z))).toBeLessThan(1e-3 * Math.abs(sigma / eps0));
   close(E(1.4) * A - E(-.5) * A + 1, 1, 1e-6);
   const c = 2.5; close((E(1.4) + c) * A - (E(-.5) + c) * A + 1, 1, 1e-6);
   expect(Math.abs(sheetEz(sigma, d, .5) - E(.5))).toBeGreaterThan(.4 * Math.abs(E(.5)));
  });
  it(`two sheets of the same charge: nothing between, σ/ε₀ away from them outside (sign ${s})`, () => {
   const sigma = .8 * s, E = (z: number) => sheetEz(sigma, 1, z) + sheetEz(sigma, 0, z);
   expect(Math.abs(E(.5))).toBeLessThan(1e-3 * Math.abs(sigma / eps0));
   close(E(2), sigma / eps0, 1e-3); close(E(-1), -sigma / eps0, 1e-3);
  });
 }
});

describe('Gauss: conductors', () => {
 for (const s of [1, -1]) {
  it(`the metal ball: its charge on the surface makes no field in the metal and kQ/r² outside, σ/ε₀ just outside; 4kQ/D² by diameter (sign ${s})`, () => {
   const R = 1, Q = 1.4 * s, cs = shellCharges(R, Q);
   for (const p of [[0, 0, 0], [.3, .2, 0], [0, -.6, .3]] as P3[]) expect(Math.hypot(...pointsE(cs, p))).toBeLessThan(1e-3 * Math.abs(Q));
   close(pointsE(cs, [1.5, 0, 0])[0], k * Q / 1.5 ** 2, 1e-3);
   const sigma = Q / (4 * Math.PI * R * R); close(k * Q / R ** 2, sigma / eps0, 1e-12);
   const D = 2 * R, sD = Q / (Math.PI * D * D);
   close(k * Q / R ** 2, 4 * k * Q / D ** 2, 1e-12); close(sD / eps0, 4 * k * Q / D ** 2, 1e-12); close(sD / (2 * eps0), 2 * k * Q / D ** 2, 1e-12);
   // A uniformly charged insulating ball would have a field inside.
   expect(Math.abs(k * Q * .5 / R ** 3)).toBeGreaterThan(.4 * Math.abs(k * Q / R ** 2));
  });
  it(`a conductor’s face: σ/ε₀ just outside, out of the metal for a positive σ, none in the metal, twice a lone sheet’s (sign ${s})`, () => {
   const sigma = .9 * s, t = .3, A = .5;
   // An isolated plate, σ on each face; and one plate of a capacitor, σ on its inner face and −σ facing it.
   const plate = (z: number) => sheetEz(sigma, 0, z) + sheetEz(sigma, -t, z);
   const capacitor = (z: number) => sheetEz(sigma, 0, z) + sheetEz(-sigma, .8, z);
   expect(Math.abs(plate(-t / 2))).toBeLessThan(1e-3 * Math.abs(sigma / eps0)); close(plate(.05), sigma / eps0, 1e-3); expect(Math.sign(plate(.05))).toBe(s);
   expect(Math.abs(capacitor(-.2))).toBeLessThan(1e-3 * Math.abs(sigma / eps0)); close(capacitor(.05), sigma / eps0, 1e-3);
   // The one-sided pillbox: the face in the metal carries nothing, the outer one all of σA/ε₀.
   close(plate(.05) * A - plate(-t / 2) * A, sigma * A / eps0, 1e-3);
   close(sheetEz(sigma, 0, .05), sigma / (2 * eps0), 1e-3);
  });
  it(`a charge in a hollow: −q on the wall, +q outside; q’s field in the hollow and outside, none in the metal; with a net Q, Q + q outside (sign ${s})`, () => {
   const q = 1.2 * s, a = .65, b = 1.35, Q = -.7 * s;
   const metal = (wall: number, outer: number) => [[0, 0, 0, q] as PointCharge, ...shellCharges(a, wall, 200, 400), ...shellCharges(b, outer, 200, 400)];
   const right = metal(-q, q), withQ = metal(-q, Q + q);
   for (const r of [.9, 1.1]) { expect(Math.hypot(...pointsE(right, [r, 0, .1]))).toBeLessThan(2e-3 * Math.abs(q)); expect(Math.hypot(...pointsE(withQ, [0, r, .1]))).toBeLessThan(2e-3 * Math.abs(q)); }
   close(pointsE(right, [.4, 0, 0])[0], k * q / .4 ** 2, 1e-3); close(pointsE(right, [2, 0, 0])[0], k * q / 4, 1e-3);
   close(pointsE(withQ, [2, 0, 0])[0], k * (Q + q) / 4, 1e-3);
   // A wall of no charge, or of +q, leaves a field in the metal; the outside’s charge is the metal’s Q less the wall’s.
   for (const wall of [0, q]) expect(Math.hypot(...pointsE(metal(wall, q), [1, 0, .1]))).toBeGreaterThan(.1 * Math.abs(k * q));
   close(Q - -q, Q + q, 1e-12);
  });
  it(`q off the hollow’s centre: the wall’s −q crowds toward it, the field in the metal stays zero, and outside it is still q’s from the centre (sign ${s})`, () => {
   const q = s, a = .65, b = 1.35, off = .35, nt = 400, np = 400, dt = Math.PI / nt, dp = 2 * Math.PI / np, wall: PointCharge[] = [];
   // The wall's charge as the image method gives it: σ(θ) = −q(a² − c²)/(4πa(a² + c² − 2ac cos θ)^{3/2}), θ from the charge's side.
   for (let i = 0; i < nt; i++) { const th = (i + .5) * dt; for (let j = 0; j < np; j++) { const ph = (j + .5) * dp, sg = -q * (a * a - off * off) / (4 * Math.PI * a * (a * a + off * off - 2 * a * off * Math.cos(th)) ** 1.5); wall.push([a * Math.sin(th) * Math.cos(ph), a * Math.sin(th) * Math.sin(ph), a * Math.cos(th), sg * a * a * Math.sin(th) * dt * dp]); } }
   close(wall.reduce((t, c) => t + c[3], 0), -q, 1e-3);
   const near = wall.filter(c => c[2] > 0).reduce((t, c) => t + c[3], 0), far = wall.filter(c => c[2] < 0).reduce((t, c) => t + c[3], 0);
   expect(Math.abs(near)).toBeGreaterThan(2 * Math.abs(far));
   const all = [[0, 0, off, q] as PointCharge, ...wall, ...shellCharges(b, q, 200, 400)];
   for (const p of [[1, 0, 0], [0, 0, 1], [0, 0, -1], [0, .7, -.7]] as P3[]) expect(Math.hypot(...pointsE(all, p))).toBeLessThan(5e-3 * Math.abs(q));
   for (const p of [[2, 0, 0], [0, 0, 2], [0, 0, -2]] as P3[]) { const e = pointsE(all, p); close(gdot(e, [p[0] / 2, p[1] / 2, p[2] / 2]), k * q / 4, 5e-3); }
  });
 }
});

describe('Gauss: holes by superposition', () => {
 /** A ball of radius R and density rho about the origin, with a round hole of radius b about `at` left empty, as a grid of point charges. */
 function holeBall(R: number, rho: number, b: number, at: P3, n = 90): PointCharge[] {
  const out: PointCharge[] = [], h = 2 * R / n, q = rho * h ** 3;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let l = 0; l < n; l++) {
   const x = -R + (i + .5) * h, y = -R + (j + .5) * h, z = -R + (l + .5) * h;
   if (x * x + y * y + z * z < R * R && Math.hypot(x - at[0], y - at[1], z - at[2]) > b) out.push([x, y, z, q]);
  }
  return out;
 }
 for (const s of [1, -1]) {
  it(`a ball’s hole: the field is ρd/3ε₀ at every point of it, whatever the hole’s size, against d when ρ is negative (sign ${s})`, () => {
   const R = 1.4, rho = s, at: P3 = [.6, 0, .33], want = at.map(x => rho * x / (3 * eps0)) as P3, size = Math.hypot(...want);
   const ps: P3[] = [[.6, 0, .33], [.85, .15, .2], [.4, -.2, .5], [.7, .1, .25]];
   const big = holeBall(R, rho, .55, at);
   for (const b of [.55, .35]) {
    const cs = b === .55 ? big : holeBall(R, rho, b, at);
    for (const p of ps.filter(p => Math.hypot(p[0] - at[0], p[1] - at[1], p[2] - at[2]) < b - .05)) {
     const e = pointsE(cs, p);
     expect(Math.hypot(e[0] - want[0], e[1] - want[1], e[2] - want[2])).toBeLessThan(.02 * size);
     // Not the sizes subtracted along r̂₁, and not the rod's two.
     const r1 = Math.hypot(...p), r2 = Math.hypot(p[0] - at[0], p[1] - at[1], p[2] - at[2]), wrong = rho * (r1 - r2) / (3 * eps0);
     if (r2 > .1) expect(Math.hypot(e[0] - wrong * p[0] / r1, e[1] - wrong * p[1] / r1, e[2] - wrong * p[2] / r1)).toBeGreaterThan(.2 * size);
     expect(Math.abs(Math.hypot(...e) - 1.5 * size)).toBeGreaterThan(.3 * size);
    }
   }
   expect(gdot(pointsE(big, at), at) * s).toBeGreaterThan(0);
  });
  it(`a centred hole has no field in it (sign ${s})`, () => {
   const cs = holeBall(1.4, s, .55, [0, 0, 0]);
   for (const p of [[0, 0, 0], [.3, 0, .1], [0, -.25, .2]] as P3[]) expect(Math.hypot(...pointsE(cs, p))).toBeLessThan(.02 * 4 * Math.PI * k * .6 / 3);
  });
  it(`a rod’s hole: ρd/2ε₀, half as big again as a ball’s (sign ${s})`, () => {
   const R = 1.4, rho = s, at = [.5, .3], b = .5, n = 700, h = 2 * R / n, fs: F2[] = [];
   for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = -R + (i + .5) * h, y = -R + (j + .5) * h; if (x * x + y * y < R * R && Math.hypot(x - at[0], y - at[1]) > b) fs.push([x, y, rho * h * h]); }
   for (const p of [[.5, .3], [.7, .1], [.3, .5]]) {
    const e = filE(fs, p[0], p[1]);
    close(e[0], rho * at[0] / (2 * eps0), 2e-2); close(e[1], rho * at[1] / (2 * eps0), 2e-2);
   }
  });
  it(`a sheet’s hole: σz/2ε₀√(z² + b²) on its axis, the sheet less the disc; zero at its centre, the sheet’s far above (sign ${s})`, () => {
   const sigma = .6 * s, b = 1, n = 40000;
   const ring = (z: number) => { let e = 0; const a0 = Math.atan(b / z), a1 = Math.PI / 2 - 1e-9, da = (a1 - a0) / n; for (let i = 0; i < n; i++) { const al = a0 + (i + .5) * da, r = z * Math.tan(al), dr = z / Math.cos(al) ** 2 * da; e += k * sigma * 2 * Math.PI * r * dr * z / (r * r + z * z) ** 1.5; } return e; };
   for (const z of [.3, 1, 2]) {
    close(ring(z), sigma * z / (2 * eps0 * Math.hypot(z, b)), 1e-3);
    close(sigma / (2 * eps0) - sigma / (2 * eps0) * (1 - z / Math.hypot(z, b)), ring(z), 1e-3);
   }
   expect(Math.abs(ring(1e-3))).toBeLessThan(2e-3 * Math.abs(sigma / (2 * eps0)));
   close(ring(200), sigma / (2 * eps0), 1e-4);
  });
 }
});

describe('Gauss: when symmetry runs out', () => {
 /** The flux out of each face of a cube of half-width a about the origin, from a point charge q at c: n × n patches a face. */
 function cubeFaces(q: number, c: P3, a: number, n = 300) {
  const out: number[] = [], h = 2 * a / n;
  for (let f = 0; f < 6; f++) {
   const ax = f >> 1, sg = f & 1 ? -1 : 1, u = (ax + 1) % 3, v = (ax + 2) % 3; let t = 0;
   for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const p: P3 = [0, 0, 0]; p[ax] = sg * a; p[u] = -a + (i + .5) * h; p[v] = -a + (j + .5) * h;
    const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2], r3 = Math.hypot(dx, dy, dz) ** 3;
    t += sg * k * q * [dx, dy, dz][ax] / r3 * h * h;
   }
   out.push(t);
  }
  return out;
 }
 for (const s of [1, -1]) {
  it(`the finite rod: the closed cylinder carries 2λℓ/ε₀ at every radius, the ends’ share growing as it widens (sign ${s})`, () => {
   const lam = s, l = 1, h = 1.4;
   // The closed form agrees with the rod cut into pieces.
   const cut = line(.7, .4, -l, l, () => lam); close(rodEs(lam, l, .7, .4), cut.ex, 1e-6); close(rodEz(lam, l, .7, .4), cut.ey, 1e-6);
   let share = 0;
   for (const r of [.3, .7, 1.6]) {
    const f = rodCylinderFlux(lam, l, r, h); close(f.total, 2 * lam * l / eps0, 1e-4);
    expect(f.ends / f.total).toBeGreaterThan(share); share = f.ends / f.total;
    // The field is strongest on the wall beside the middle, above its average there, and the whole flux over the wall’s
    // area is not it either: dividing gives no field at P.
    expect(Math.abs(rodEs(lam, l, r, 0))).toBeGreaterThan(Math.abs(f.wall / (2 * Math.PI * r * 2 * h)));
    expect(Math.abs(rodEs(lam, l, r, 0) - f.total / (2 * Math.PI * r * 2 * h))).toBeGreaterThan(.05 * Math.abs(rodEs(lam, l, r, 0)));
   }
   expect(share).toBeGreaterThan(.1);
  });
  it(`the field beside its middle is 2kλℓ/r√(r² + ℓ²): a line’s close in, a point charge’s far off; a short cylinder near the middle nearly a line’s (sign ${s})`, () => {
   const lam = 1.3 * s, l = 1;
   for (const r of [.2, .7, 2]) close(line(r, 0, -l, l, () => lam).ex, 2 * k * lam * l / (r * Math.hypot(r, l)), 1e-6);
   close(line(.01, 0, -l, l, () => lam).ex, 2 * k * lam / .01, 1e-3); close(line(100, 0, -l, l, () => lam).ex, k * 2 * lam * l / 1e4, 1e-3);
   const r = .05, f = rodCylinderFlux(lam, l, r, .05, 4000);
   expect(Math.abs(f.ends / f.total)).toBeLessThan(.01);
   close(f.wall / (2 * Math.PI * r * .1), lam / (2 * Math.PI * eps0 * r), 1e-2);
   expect(Math.abs(rodEs(lam, l, r, .05) - rodEs(lam, l, r, 0))).toBeLessThan(.01 * Math.abs(rodEs(lam, l, r, 0)));
   expect(Math.abs(line(.7, 0, -l, l, () => lam).ex - lam / (2 * Math.PI * eps0 * .7))).toBeGreaterThan(.1 * Math.abs(lam / (2 * Math.PI * eps0 * .7)));
  });
  it(`the cube: q/ε₀ in all wherever q is inside, more than a sixth through the near face, a sixth each at the centre, none in all from outside (sign ${s})`, () => {
   const q = s, a = .85, off = cubeFaces(q, [.35, 0, .2], a), mid = cubeFaces(q, [0, 0, 0], a), out = cubeFaces(q, [1.4, 0, .2], a);
   close(off.reduce((t, x) => t + x, 0), q / eps0, 2e-3);
   expect(off[0] * s).toBeGreaterThan(q / (6 * eps0) * s * 1.3); expect(off[1] * s).toBeLessThan(q / (6 * eps0) * s);
   close(off[2], off[3], 1e-6);
   for (const x of mid) close(x, q / (6 * eps0), 2e-3);
   expect(Math.abs(out.reduce((t, x) => t + x, 0))).toBeLessThan(5e-3 * Math.abs(q / eps0));
   expect(Math.max(...out.map(Math.abs))).toBeGreaterThan(.1 * Math.abs(q / eps0));
  });
 }
});

describe('Gauss: the hard cases', () => {
 for (const s of [1, -1]) {
  it(`the halo: Q_enc = 4πρ₀a²(r − a arctan r/a), a uniform ball’s field near the centre, ρ₀a²/ε₀r far out (sign ${s})`, () => {
   const rho0 = .8 * s, a = .6, rho = (r: number) => rho0 * a * a / (r * r + a * a), E = (r: number) => k * shells(rho, r, 200000) / (r * r);
   for (const r of [.3, 1, 5]) close(shells(rho, r), 4 * Math.PI * rho0 * a * a * (r - a * Math.atan(r / a)), 1e-6);
   close(E(.006), rho0 * .006 / (3 * eps0), 1e-3);
   expect(Math.abs(E(.006) - rho0 * .006 / (2 * eps0))).toBeGreaterThan(.2 * Math.abs(E(.006)));
   close(E(600), rho0 * a * a / (eps0 * 600), 5e-3); close(E(1200) / E(600), .5, 5e-3);
   expect(Math.sign(E(2))).toBe(s);
  });
  it(`ρ = β/r: Q_enc = 2πβr², the field β/2ε₀ at every radius inside, βR²/2ε₀r² outside; ∫ρ dr′ has no limit (sign ${s})`, () => {
   const beta = .5 * s, R = 1.1, rho = (r: number) => r < R ? beta / r : 0;
   for (const r of [.2, .6, 1]) { close(shells(rho, r), 2 * Math.PI * beta * r * r, 1e-6); close(k * shells(rho, r) / (r * r), beta / (2 * eps0), 1e-6); expect(Math.abs(shells(rho, r) - 4 / 3 * Math.PI * beta * r * r)).toBeGreaterThan(.2 * Math.abs(shells(rho, r))); }
   close(k * shells(rho, R) / 2.25, beta * R * R / (2 * eps0 * 2.25), 1e-4);
   expect(Math.abs(thin(rho, 1, 200000)) - Math.abs(thin(rho, 1, 2000))).toBeGreaterThan(.9 * Math.log(100) * Math.abs(beta));
  });
  it(`run backwards: from E_r = E_R r²/R² the density is 4ε₀E_R r/R², not the average 3ε₀E_R r/R² nor ε₀ dE_r/dr (sign ${s})`, () => {
   const ER = 1.3 * s, R = 1.1, Qenc = (r: number) => 4 * Math.PI * eps0 * r * r * ER * r * r / (R * R), h = 1e-5;
   for (const r of [.3, .7, 1]) {
    const rho = (Qenc(r + h) - Qenc(r - h)) / (2 * h) / (4 * Math.PI * r * r);
    close(rho, 4 * eps0 * ER * r / (R * R), 1e-6);
    close(Qenc(r) / (4 / 3 * Math.PI * r ** 3), .75 * rho, 1e-6);
    expect(Math.abs(eps0 * 2 * ER * r / (R * R) - rho)).toBeGreaterThan(.4 * Math.abs(rho));
   }
   close(shells(r => 4 * eps0 * ER * r / (R * R), .8), Qenc(.8), 1e-6);
  });
  it(`the slab ρ₀z/a: ρ₀(z² − a²)/2ε₀a inside, the same way on both sides, none outside; the pillbox across the middle has zero flux (sign ${s})`, () => {
   const rho0 = .9 * s, a = .6, A = .5, ss = slabSheets(z => rho0 * z / a, -a, a);
   for (const z of [-.4, 0, .2, .5]) {
    close(sheetsEz(ss, z + 1e-9), rho0 * (z * z - a * a) / (2 * eps0 * a), 1e-3);
    expect(Math.sign(sheetsEz(ss, z + 1e-9))).toBe(-s);
   }
   for (const z of [.2, .45]) {
    close(sheetsEz(ss, -z), sheetsEz(ss, z), 1e-6);
    expect(Math.abs(sheetsEz(ss, z) * A - sheetsEz(ss, -z) * A)).toBeLessThan(1e-6);
    const enc = ss.filter(([zi]) => Math.abs(zi) < z).reduce((t, [, sg]) => t + sg * A, 0);
    expect(Math.abs(enc)).toBeLessThan(1e-6);
    // Doubling the charge from 0 to z, or starting from the middle, would be other fields.
    expect(Math.abs(rho0 * z * z / (2 * eps0 * a) - sheetsEz(ss, z))).toBeGreaterThan(.3 * Math.abs(sheetsEz(ss, z)));
    expect(Math.abs(rho0 * (z * z - a * a) / (4 * eps0 * a) - sheetsEz(ss, z))).toBeGreaterThan(.3 * Math.abs(sheetsEz(ss, z)));
   }
   for (const z of [.7, 2, -.7, -3]) expect(Math.abs(sheetsEz(ss, z))).toBeLessThan(1e-9);
   // The two halves alone each make a field outside; they cancel.
   const upper = slabSheets(z => rho0 * z / a, 0, a); expect(Math.abs(sheetsEz(upper, 2))).toBeGreaterThan(.1 * Math.abs(rho0 * a / eps0));
  });
  it(`the square: q/π ε₀ arctan(b²/d√(d² + 2b²)); q/6ε₀ when d = b, toward q/2ε₀ as it grows without end (sign ${s})`, () => {
   const q = 1.1 * s, d = .7;
   // x = d tan u, so the patches are small near the foot of the axis and large far out, as an endless plane needs.
   const flux = (b: number) => {
    const n = 800, u = Math.atan(b / d), du = 2 * u / n, xs: number[] = [], ws: number[] = [];
    for (let i = 0; i < n; i++) { const t = -u + (i + .5) * du; xs.push(d * Math.tan(t)); ws.push(d / Math.cos(t) ** 2 * du); }
    let t = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) t += k * q * d * ws[i] * ws[j] / (d * d + xs[i] * xs[i] + xs[j] * xs[j]) ** 1.5;
    return t;
   };
   for (const b of [.4, .7, 2]) close(flux(b), q / (Math.PI * eps0) * Math.atan(b * b / (d * Math.sqrt(d * d + 2 * b * b))), 1e-4);
   close(flux(d), q / (6 * eps0), 1e-4);
   close(flux(1e5), q / (2 * eps0), 1e-3);
  });
 }
});

/* THE REVIEW OF THE FIRST FIVE GAUSS BANKS: each claim a reviewer corrected, checked by number for both signs. */
describe('Gauss: the review of the first five banks', () => {
 for (const s of [1, -1]) {
  it(`off the centre, the nearest patch sees a stronger field than the flux over the area, with q’s sign (sign ${s})`, () => {
   const q = 1.1 * s, R = 1, at = .6, E = (p: P3) => pointsE([[0, 0, at, q]], p);
   const avg = sphereFlux(E, [0, 0, 0], R).flux / (4 * Math.PI * R * R);
   close(avg, q / (4 * Math.PI * eps0 * R * R), 2e-4);
   const near = E([0, 0, R])[2];
   expect(Math.sign(near)).toBe(s); expect(Math.abs(near)).toBeGreaterThan(2 * Math.abs(avg));
  });
  it(`inside a uniform ball E_r is proportional to r: its size grows outward, its value only for a positive Q (sign ${s})`, () => {
   const R = 1, Q = 1.4 * s, rho = () => Q / (4 / 3 * Math.PI * R ** 3), Er = (r: number) => k * shells(rho, r) / r ** 2;
   for (const r of [.2, .5, .9]) { close(Er(r) / r, k * Q / R ** 3, 1e-6); expect(Math.sign(Er(r))).toBe(s); }
   expect(Math.abs(Er(.9))).toBeGreaterThan(Math.abs(Er(.5)));
   expect(Math.sign(Er(.9) - Er(.5))).toBe(s);
  });
  it(`the falling density’s formula changes sign past R, so carrying it on adds charge of the other sign; its size is greatest at the centre (sign ${s})`, () => {
   const R = 1, Q = 1.2 * s, rho0 = 3 * Q / (Math.PI * R ** 3), rho = (r: number) => rho0 * (1 - r / R);
   for (const x of [1.1, 1.4]) { expect(Math.sign(rho(x * R))).toBe(-s); expect(Math.sign(shells(rho, x * R) - shells(rho, R))).toBe(-s); }
   for (const x of [.1, .5, .9]) expect(Math.abs(rho(x * R))).toBeLessThan(Math.abs(rho0));
  });
  it(`the line outside a coaxial cylinder makes field on its wall, changing along it, yet no net flux; the whole field is the same all along (sign ${s})`, () => {
   const lam = .8 * s, r = .6, h = .9;
   // The rest of the line is the endless line less the piece inside, from −h to h.
   const outEs = (z: number) => 2 * k * lam / r - rodEs(lam, h, r, z);
   expect(Math.abs(outEs(0))).toBeGreaterThan(.1 * Math.abs(2 * k * lam / r));
   expect(Math.abs(outEs(.8 * h) - outEs(0))).toBeGreaterThan(.1 * Math.abs(outEs(0)));
   const outFlux = 2 * k * lam / r * 2 * Math.PI * r * 2 * h - rodCylinderFlux(lam, h, r, h).total;
   expect(Math.abs(outFlux)).toBeLessThan(2e-3 * Math.abs(lam * 2 * h / eps0));
   for (const z of [0, .5, .85]) close(line(r, z, -1e5, 1e5, () => lam).ex, 2 * k * lam / r, 2e-3);
  });
 }
});
