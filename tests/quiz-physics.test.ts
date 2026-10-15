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
 it('a negative ramp’s field points toward the rod and up', () => {
  const f = line(1, 0, 0, L, y => -ramp(y)); expect(f.ex).toBeLessThan(0); expect(f.ey).toBeGreaterThan(0);
 });
});

describe('the semi-infinite line', () => {
 // The line on the x-axis from 0 to ∞ with P = (0, r) is the reflection, across y = x, of a line on the y-axis
 // from 0 to ∞ with P = (r, 0): the reflection swaps the two components.
 const lam = 1.5, semi = (r: number, l = lam) => { const f = line(r, 0, 0, 1e5 * r, () => l, 400000); return {ex: f.ey, ey: f.ex}; };
 it('E_x = −kλ/r and E_y = kλ/r: away from the line and back past the end, at π/4', () => {
  const f = semi(1); close(f.ex, -k * lam, 1e-3); close(f.ey, k * lam, 1e-3);
  close(Math.atan2(f.ey, -f.ex), Math.PI / 4, 1e-3);
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
 it('one piece’s parts are −ΔE sin α along x and ΔE cos α along y, α from the perpendicular', () => {
  const r = 1, x = .8, a = Math.atan(x / r), d = Math.hypot(x, r), e = k / d ** 2;
  close(e * (0 - x) / d, -e * Math.sin(a), 1e-12); close(e * (r - 0) / d, e * Math.cos(a), 1e-12);
 });
 it('doubling r halves both parts and keeps the lean; they do not quarter', () => {
  const a = semi(1), b = semi(2);
  close(b.ex / a.ex, .5, 2e-3); close(b.ey / a.ey, .5, 2e-3);
  close(Math.atan2(b.ey, -b.ex), Math.PI / 4, 1e-3);
 });
 it('with the mirror half added, it is 2kλ/r straight out from the line', () => {
  const f = line(1, 0, -1e5, 1e5, () => lam, 400000); // the whole line, reflected as above
  close(f.ex, 2 * k * lam, 1e-3); expect(Math.abs(f.ey)).toBeLessThan(1e-6);
 });
 it('a negative line’s field points toward the line and out over it, still at π/4', () => {
  const f = semi(1, -lam); expect(f.ex).toBeGreaterThan(0); expect(f.ey).toBeLessThan(0);
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
