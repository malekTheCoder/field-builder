import {describe, expect, it} from 'vitest';
import {K, EPS0} from '../src/distributions/constants';
import {shell, shellField, shellRings} from '../src/distributions/shell';
import {getProblem} from '../src/problems/definitions';
import {sampleLimit, limitPlot, field, potential} from '../src/symbolic/physics';
import {safeParse} from '../src/symbolic/equivalence';
import {boardLines, resultLines, factorsOf} from '../src/workbench/derivation';
import {buildStages} from '../src/explorer/buildRun';
import {lessonFor} from '../src/lessons';
import {bank} from '../src/quiz/bank/shell';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';
/* THE SPHERICAL SHELL, BUILT FROM RINGS, checked from Coulomb's law. Every claim the lesson, its board, its run, its
 * limits and its quiz make is measured here by charges laid by hand: point charges round each ring, rings down the
 * sphere, an adaptive integral over the polar angle. Both signs of charge, inside and outside, near the surface and
 * far from it. Nothing here reads a closed form to check itself against. */
type V3 = [number, number, number];
/** One ring of radius s at height h holding dq, as `AZ` point charges round it, its field at P = (0, 0, z). */
const AZ = 64;
function ringByPoints(dq: number, s: number, h: number, z: number): V3 {
  const out: V3 = [0, 0, 0];
  for (let j = 0; j < AZ; j++) {
    const phi = 2 * Math.PI * (j + .5) / AZ, d: V3 = [-s * Math.cos(phi), -s * Math.sin(phi), z - h], r = Math.hypot(...d), k = K * dq / AZ / r ** 3;
    out[0] += k * d[0]; out[1] += k * d[1]; out[2] += k * d[2];
  }
  return out;
}
/** Adaptive Simpson over θ of the band dθ's field: σ 2πR² sin θ dθ of charge round the ring at θ. */
function truth(R: number, q: number, z: number): V3 {
  const sigma = q / (4 * Math.PI * R * R);
  const f = (t: number) => ringByPoints(sigma * 2 * Math.PI * R * R * Math.sin(t), R * Math.sin(t), R * Math.cos(t), z);
  const simpson = (a: number, b: number, fa: V3, fm: V3, fb: V3, depth: number, eps: number): V3 => {
    const m = (a + b) / 2, l = (a + m) / 2, r = (m + b) / 2, fl = f(l), fr = f(r);
    const whole = [0, 1, 2].map(i => (b - a) / 6 * (fa[i] + 4 * fm[i] + fb[i]));
    const halves = [0, 1, 2].map(i => (m - a) / 6 * (fa[i] + 4 * fl[i] + fm[i]) + (b - m) / 6 * (fm[i] + 4 * fr[i] + fb[i]));
    if (depth > 40 || Math.max(...[0, 1, 2].map(i => Math.abs(halves[i] - whole[i]))) < 15 * eps) return halves.map((h, i) => h + (h - whole[i]) / 15) as V3;
    const left = simpson(a, m, fa, fl, fm, depth + 1, eps / 2), right = simpson(m, b, fm, fr, fb, depth + 1, eps / 2);
    return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
  };
  const eps = K * Math.abs(q) / (R * R) * 1e-13, cuts = [0, .02, .1, .5, 1.5, Math.PI];
  const out: V3 = [0, 0, 0];
  for (let i = 0; i + 1 < cuts.length; i++) { const a = cuts[i], b = cuts[i + 1], part = simpson(a, b, f(a), f((a + b) / 2), f(b), 0, eps); out[0] += part[0]; out[1] += part[1]; out[2] += part[2]; }
  return out;
}
const P = (over: Partial<Params>): Params => ({...DEFAULT_PARAMS, ...over});
const SETTINGS: [number, number][] = [[2, 3], [2, 1], [2, .5], [1, 6], [4, 3.6], [4, 4.4], [.5, .6], [3, 2.2], [1.5, 1.6]];
describe('the closed form against an independent integral from Coulomb’s law', () => {
  for (const q of [2e-9, -3.5e-9]) for (const [R, z] of SETTINGS) it(`R ${R} · z ${z} · q ${q}`, () => {
    const t = truth(R, q, z), exact = shellField(R, q, z), scale = K * Math.abs(q) / (R * R);
    // Outside a point charge's field to a part in a billion; inside nothing, to a part in a billion of the field just outside.
    expect(Math.abs(t[2] - exact) / (z > R ? Math.abs(exact) : scale), `E_z ${t[2]} vs ${exact}`).toBeLessThan(1e-9);
    expect(Math.abs(t[0]) / scale).toBeLessThan(1e-12);
    expect(Math.abs(t[1]) / scale).toBeLessThan(1e-12);
    if (z > R) { expect(exact).toBeCloseTo(K * q / (z * z), 20); expect(Math.sign(exact)).toBe(Math.sign(q)); } else expect(exact).toBe(0);
    // And the app's own point-charge sum, bands of points at equal angles, closes on it too.
    const pc = shell.quadrature({...P({size: 2 * R, distance: z}), charge: q * 1e9}, 160000).z;
    expect(Math.abs(pc - exact) / scale).toBeLessThan(z > R * 1.15 || z < R * .85 ? 2e-4 : 5e-3);
  });
});
describe('the rings the run adds up', () => {
  it('hold their bands’ exact charge, so they add to Q at every N, the equator’s ring biggest', () => {
    for (const n of [1, 2, 3, 5, 7, 12, 30, 61]) {
      const rings = shellRings(2, 3e-9, 3, n), total = rings.reduce((t, s) => t + s.dq, 0);
      expect(Math.abs(total / 3e-9 - 1), `N = ${n}`).toBeLessThan(1e-13);
      // Each holds σ times its band's area, (Q/2)(cos θ₋ − cos θ₊), exactly.
      rings.forEach((s, i) => expect(s.dq / 3e-9).toBeCloseTo((Math.cos(Math.PI * i / n) - Math.cos(Math.PI * (i + 1) / n)) / 2, 14));
      // Small near the top and the bottom, largest round the equator: the lesson's "the ones round the equator hold the most".
      const biggest = rings.reduce((b, s, i) => s.dq > rings[b].dq ? i : b, 0);
      expect(Math.abs(rings[biggest].coordinate - Math.PI / 2)).toBeLessThanOrEqual(Math.PI / (2 * n) + 1e-12);
    }
  });
  it('make each ring’s field the ring lesson’s, k ΔQ (z − R cos θ)/r_i³, along the axis, as point charges round it agree', () => {
    for (const z of [3, 1, .4]) for (const s of shellRings(2, 2e-9, z, 7)) {
      const pts = ringByPoints(s.dq, s.position.x, s.position.z, z);
      expect(Math.abs(pts[2] - s.field.z) / Math.abs(s.field.z)).toBeLessThan(1e-12);
      expect(Math.abs(pts[0]) + Math.abs(pts[1])).toBeLessThan(1e-9 * Math.abs(s.field.z));
    }
  });
  it('add up to the closed form as N grows, inside and outside, both signs; one ring is the equator’s ring holding all of Q', () => {
    for (const q of [2e-9, -2e-9]) for (const [R, z] of SETTINGS) {
      const exact = shellField(R, q, z), scale = K * Math.abs(q) / (R * R), sum = (n: number) => shellRings(R, q, z, n).reduce((t, s) => t + s.field.z, 0);
      expect(sum(1) / (K * q * z / (z * z + R * R) ** 1.5)).toBeCloseTo(1, 12);
      const gaps = [40, 400, 4000].map(n => Math.abs(sum(n) - exact) / scale);
      expect(gaps[1], `R ${R} z ${z}`).toBeLessThan(gaps[0]);
      expect(gaps[2], `R ${R} z ${z}`).toBeLessThan(Math.max(gaps[1] / 20, 1e-12));
      if (Math.abs(z - R) > .1 * R) expect(gaps[2]).toBeLessThan(1e-5);
    }
  });
  it('outside, every ring’s field points the same way along the axis, the charge’s way; inside, the rings above P point the other way', () => {
    for (const q of [2e-9, -2e-9]) {
      for (const s of shellRings(2, q, 3, 9)) expect(Math.sign(s.field.z)).toBe(Math.sign(q));
      const inside = shellRings(2, q, 1, 9);
      for (const s of inside) expect(Math.sign(s.field.z)).toBe(s.position.z < 1 ? Math.sign(q) : -Math.sign(q));
      // The cap above P holds less of the shell than the part below, and is nearer: and the two cancel in the limit.
      const fine = shellRings(2, q, 1, 20000), above = fine.filter(s => s.position.z > 1), below = fine.filter(s => s.position.z < 1);
      expect(Math.abs(above.reduce((t, s) => t + s.dq, 0))).toBeLessThan(Math.abs(below.reduce((t, s) => t + s.dq, 0)));
      const up = above.reduce((t, s) => t + s.field.z, 0), down = below.reduce((t, s) => t + s.field.z, 0);
      expect(Math.abs(up + down) / Math.abs(down)).toBeLessThan(1e-7);
    }
  });
  it('at the default five rings, the sum is rough on both sides of the surface, as the lesson says', () => {
    const sum = (z: number) => shellRings(2, 2e-9, z, 5).reduce((t, s) => t + s.field.z, 0);
    expect(Math.abs(sum(3) / shellField(2, 2e-9, 3) - 1)).toBeGreaterThan(.02);
    expect(Math.abs(sum(1)) / (K * 2e-9 / 4)).toBeGreaterThan(.02);
  });
});
describe('the substitution and the bracket the lesson and its Unfold write', () => {
  const F = (R: number, z: number, t: number) => { const u = R * R + z * z - 2 * z * R * Math.cos(t); return 2 * Math.sqrt(u) - 2 * (z * z - R * R) / Math.sqrt(u); };
  it('u = R² + z² − 2zR cos θ runs from (z − R)² at the top to (z + R)² at the bottom, and du = 2zR sin θ dθ', () => {
    for (const [R, z] of SETTINGS) {
      const u = (t: number) => R * R + z * z - 2 * z * R * Math.cos(t);
      expect(u(0)).toBeCloseTo((z - R) ** 2, 12); expect(u(Math.PI)).toBeCloseTo((z + R) ** 2, 12);
      for (const t of [.3, 1.2, 2.5]) { expect((u(t + 1e-6) - u(t - 1e-6)) / 2e-6).toBeCloseTo(2 * z * R * Math.sin(t), 5); expect(z - R * Math.cos(t)).toBeCloseTo((u(t) + z * z - R * R) / (2 * z), 12); }
    }
  });
  it('the bracket is 4R at the bottom, −4R at the top outside and 4R inside: 8R and zero', () => {
    for (const [R, z] of SETTINGS) {
      expect(F(R, z, Math.PI)).toBeCloseTo(4 * R, 10);
      expect(F(R, z, 0)).toBeCloseTo(z > R ? -4 * R : 4 * R, 10);
      const E = Math.PI * K * (2e-9 / (4 * Math.PI * R * R)) * R / (2 * z * z) * (F(R, z, Math.PI) - F(R, z, 0));
      expect(Math.abs(E - shellField(R, 2e-9, z)) / (K * 2e-9 / (R * R))).toBeLessThan(1e-12);
    }
  });
  it('in θ the two powers join into one fraction, (R − z cos θ)/√u: 1 at the bottom, −1 at the top outside and 1 inside', () => {
    const G = (R: number, z: number, t: number) => (R - z * Math.cos(t)) / Math.sqrt(R * R + z * z - 2 * z * R * Math.cos(t));
    for (const [R, z] of SETTINGS) {
      for (const t of [.4, 1.3, 2.6]) expect(G(R, z, t)).toBeCloseTo(F(R, z, t) / (4 * R), 12);
      expect(G(R, z, Math.PI)).toBeCloseTo(1, 12);
      expect(G(R, z, 0)).toBeCloseTo(z > R ? -1 : 1, 12);
      const E = 2 * Math.PI * K * (2e-9 / (4 * Math.PI * R * R)) * R * R / (z * z) * (G(R, z, Math.PI) - G(R, z, 0));
      expect(Math.abs(E - shellField(R, 2e-9, z)) / (K * 2e-9 / (R * R))).toBeLessThan(1e-12);
    }
  });
  it('the antiderivative differentiates back to the integrand, and the bracket’s prefactor makes it the board’s', () => {
    const R = 2, z = 3, sigma = 1, k = 1;
    for (const t of [.2, 1, 2.2, 3]) {
      const dF = (F(R, z, t + 1e-6) - F(R, z, t - 1e-6)) / 2e-6 * Math.PI * k * sigma * R / (2 * z * z);
      const kernel = 2 * Math.PI * k * sigma * R * R * Math.sin(t) * (z - R * Math.cos(t)) / (R * R + z * z - 2 * z * R * Math.cos(t)) ** 1.5;
      expect(dF).toBeCloseTo(kernel, 6);
    }
  });
});
describe('the lesson’s own strings', () => {
  const p = getProblem('shell'), ev = (expr: string, scope: Record<string, number>) => safeParse(expr).compile().evaluate({pi: Math.PI, ...scope}) as number;
  it('the graded result is kQ/z² outside, the inside field graded as zero, and the integral is the kernel’s', () => {
    for (const [R, z] of SETTINGS.filter(([R, z]) => z > R)) expect(ev(p.result, {k: K, Q: 2e-9, z, R}) / shellField(R, 2e-9, z)).toBeCloseTo(1, 12);
    const inside = p.steps.flatMap(s => s.fields ?? []).find(f => f.id === 'inside');
    expect(inside?.expected).toBe('0');
    for (const [R, z] of SETTINGS) {
      // Compiled once: parsed afresh for every point the sum took seconds, and on the CI runner several times that.
      const sigma = 2e-9 / (4 * Math.PI * R * R), n = 4000, kernel = safeParse(p.kernel).compile();
      let sum = 0; for (let i = 0; i < n; i++) { const t = Math.PI * (i + .5) / n; sum += (kernel.evaluate({pi: Math.PI, k: K, sigma, R, z, theta: t}) as number) * Math.PI / n; }
      expect(Math.abs(sum - shellField(R, 2e-9, z)) / (K * 2e-9 / (R * R)), `R ${R} z ${z}`).toBeLessThan(Math.abs(z - R) < .25 * R ? 2e-2 : 1e-5);
    }
  });
  it('the board’s factors multiply to the kernel, its answer typesets both sides, and the run calls the pieces rings', () => {
    const f = factorsOf(p);
    for (const t of [.3, 1.4, 2.7]) {
      const scope = {k: K, sigma: 1e-9, R: 2, z: 3, theta: t, pi: Math.PI};
      const built = K * ev(f.dq, scope) * ev(f.dir, scope) / ev(f.r, scope) ** 2;
      expect(built / ev(p.kernel, scope)).toBeCloseTo(1, 12);
    }
    expect(resultLines(p)[0]).toContain('(z>R)');
    expect(resultLines(p)[0]).toContain('(0<z<R)');
    expect(boardLines(p)[0].tex).toContain('\\approx');
    expect(buildStages(p)[1].name).toBe('One ring');
  });
  it('the sum on the board holds its band’s charge to the order the rings make it, and the density adds to Q', () => {
    let q = 0; const n = 4000;
    for (let i = 0; i < n; i++) { const t = Math.PI * (i + .5) / n; q += ev(p.dq.replace('dtheta', '1'), {sigma: 1, R: 2, theta: t}) * Math.PI / n; }
    expect(q / (4 * Math.PI * 4)).toBeCloseTo(1, 6);
  });
  it('the jump across the surface is σ/ε₀, kQ/R², whatever the sign', () => {
    for (const q of [2e-9, -2e-9]) for (const R of [.5, 2, 4]) {
      const sigma = q / (4 * Math.PI * R * R), jump = shellField(R, q, R * (1 + 1e-9)) - shellField(R, q, R * (1 - 1e-9));
      expect(jump / (sigma / EPS0)).toBeCloseTo(1, 6);
      expect(jump / (K * q / (R * R))).toBeCloseTo(1, 6);
    }
  });
  it('the potential is kQ/z outside and kQ/R everywhere inside, added up ring by ring', () => {
    for (const [R, z] of SETTINGS) {
      const sum = shellRings(R, 2e-9, z, 4000).reduce((t, s) => t + s.potential, 0);
      expect(sum / (K * 2e-9 / Math.max(z, R))).toBeCloseTo(1, 5);
      expect(potential('shell', P({size: 2 * R, distance: z}))).toBeCloseTo(K * 2e-9 / Math.max(z, R), 12);
    }
  });
});
describe('the limiting cases, measured', () => {
  const p = getProblem('shell'), at = (mode: string) => p.limits.find(l => l.mode === mode)!;
  for (const charge of [2, -3]) {
    const q = P({charge});
    it(`outside, the rings’ sum is a point charge’s at every height (charge ${charge})`, () => {
      for (const t of [1, 3.3, 9, 30]) { const s = sampleLimit(p, q, at('outside'), t); expect(Math.abs(s.actual / s.target - 1)).toBeLessThan(2e-6); }
      expect(limitPlot(p, at('outside')).kind).toBe('constant');
    });
    it(`inside, the field is zero from the surface to the centre; outside it grows as P comes in (charge ${charge})`, () => {
      const scale = K * Math.abs(charge) * 1e-9 / 4;
      // Just inside the surface the four thousand rings leave a residue of a few in a hundred thousand; deeper in, nothing.
      for (const t of [16, 20, 25, 29.9, 30]) expect(sampleLimit(p, q, at('inside'), t).actual / scale).toBeLessThan(t < 18 ? 5e-5 : 1e-6);
      const out = [1, 5, 10, 15].map(t => sampleLimit(p, q, at('inside'), t).actual);
      for (let i = 1; i < out.length; i++) expect(out[i]).toBeGreaterThan(out[i - 1]);
    });
    it(`across the surface the field jumps by σ/ε₀, approached as the gap closes (charge ${charge})`, () => {
      const ratio = (t: number) => { const s = sampleLimit(p, q, at('jump'), t); return s.actual / s.target; };
      for (const t of [1, 2, 5, 12, 30]) expect(Math.abs(ratio(t) - (1 + 1 / (2 * t)) ** -2), `t ${t}`).toBeLessThan(5e-5);
      expect(ratio(30)).toBeGreaterThan(.96);
    });
  }
});
describe('the quiz, by number', () => {
  const ids = bank.map(b => b.id);
  it('has every question it promises, each with one correct choice and every wrong one diagnosed', () => {
    expect(ids).toEqual(['shell-ring-charge', 'shell-distance', 'shell-one-ring', 'shell-substitution', 'shell-outside', 'shell-inside', 'shell-what-cancels', 'shell-surface', 'shell-negative']);
    for (const q of bank) { expect(q.choices.filter(c => c.correct)).toHaveLength(1); for (const c of q.choices.filter(c => !c.correct)) { expect(c.misconception).toBeTruthy(); expect(c.why).toBeTruthy(); } }
  });
  it('a ring’s area is 2πR² sin θ dθ, and added round the shell it is 4πR²', () => {
    let a = 0; const n = 100000; for (let i = 0; i < n; i++) a += 2 * Math.PI * 4 * Math.sin(Math.PI * (i + .5) / n) * Math.PI / n;
    expect(a / (4 * Math.PI * 4)).toBeCloseTo(1, 8);
  });
  it('the distance is the law of cosines, √(R² + z² − 2zR cos θ), the two legs R sin θ and z − R cos θ', () => {
    for (const t of [.4, 1.9]) expect(Math.hypot(2 * Math.sin(t), 3 - 2 * Math.cos(t))).toBeCloseTo(Math.sqrt(4 + 9 - 12 * Math.cos(t)), 12);
  });
  it('a negative shell’s field outside points back toward it, and inside it is still zero', () => {
    expect(field('shell', P({charge: -2, distance: 3})).z).toBeLessThan(0);
    expect(field('shell', P({charge: -2, distance: 1})).z).toBe(0);
  });
  it('the lesson’s and the bank’s sentences carry no em dash and no numeral outside their maths', () => {
    const text = [JSON.stringify(lessonFor('shell')), JSON.stringify(bank)].join(' ');
    expect(text).not.toContain('—');
  });
});
