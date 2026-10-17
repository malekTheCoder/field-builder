import {describe, expect, it} from 'vitest';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';
import {EPS0, K, field, numerical, sampleLimit} from '../src/symbolic/physics';
import {sampleDistribution} from '../src/diagrams/sampling';
import {annulusRadii} from '../src/distributions/disk';
import {diskSignMarks} from '../src/diagrams/three/bodies';
import {safeParse} from '../src/symbolic/equivalence';
/* THE ANNULUS, CHECKED FROM COULOMB'S LAW UP.
 *
 * Its field is summed here from point charges laid on the annulus itself -- rings of them from the hole's edge to
 * the rim, each ring cut into points round it -- with nothing of the app's in the sum. That sum is held against
 * the closed form the app uses, against the formula the lesson prints, against the board's antiderivative and
 * against every one of its four limits, for both signs of the charge and on both sides of the annulus. */
const at = (o: Partial<Params>): Params => ({...DEFAULT_PARAMS, ...o});
/** E_z at height z of point charges laid on the annulus a ≤ s ≤ b, σ = Q/(π(b² − a²)): nr rings by nt points,
 * cut evenly in s² so every ring holds the same charge. */
function brute(Q: number, a: number, b: number, z: number, nr = 4000, nt = 32) {
  const q = Q * 1e-9 / (nr * nt);
  let ex = 0, ey = 0, ez = 0;
  for (let i = 0; i < nr; i++) {
    const s = Math.sqrt(a * a + (b * b - a * a) * (i + .5) / nr);
    for (let j = 0; j < nt; j++) {
      const t = 2 * Math.PI * (j + .5) / nt, x = s * Math.cos(t), y = s * Math.sin(t), r = Math.hypot(x, y, z);
      ex += -K * q * x / r ** 3; ey += -K * q * y / r ** 3; ez += K * q * z / r ** 3;
    }
  }
  return {ex, ey, ez};
}
const rel = (got: number, want: number) => Math.abs(got - want) / Math.max(Math.abs(want), 1e-300);
/** The lesson's printed answer, evaluated as a student would read it. */
const printed = (expr: string, Q: number, a: number, b: number, z: number) =>
  safeParse(expr).compile().evaluate({pi: Math.PI, k: K, eps0: EPS0, a, b, z, Q: Q * 1e-9, sigma: Q * 1e-9 / (Math.PI * (b * b - a * a))}) as number;
const CASES: [Q: number, a: number, b: number, z: number][] = [
  [2, 1, 2, 3], [-2, 1, 2, 3], [3.5, .3, 3.8, .6], [-1.1, 2.8, 3, 1.7], [4, .05, .5, 5], [-5, 3.6, 4, -2.2], [2, 1, 2, -3],
];
describe('the annulus against point charges laid on it', () => {
  for (const [Q, a, b, z] of CASES) it(`Q ${Q} · a ${a} · b ${b} · z ${z}`, () => {
    const want = brute(Q, a, b, z), p = at({charge: Q, inner: a, size: 2 * b, distance: z}), E = field('annulus', p);
    expect(rel(E.z, want.ez), 'closed form').toBeLessThan(1e-5);
    expect(E.x).toBe(0); expect(E.y).toBe(0);
    expect(Math.hypot(want.ex, want.ey) / Math.abs(want.ez), 'the sideways parts cancel round each ring').toBeLessThan(1e-9);
    // The sign: away from a positive annulus, toward a negative one, on either side.
    expect(Math.sign(E.z)).toBe(Math.sign(Q) * Math.sign(z));
    // The app's own quadrature and its drawn rings, refined, close on the same number.
    expect(rel(numerical('annulus', p, 160000).z, want.ez)).toBeLessThan(1e-4);
    const rings = sampleDistribution('annulus', p, 2000).reduce((s, r) => s + r.field.z, 0);
    expect(rel(rings, E.z), 'the rings the figure draws').toBeLessThan(1e-5);
    expect(sampleDistribution('annulus', p, 7).reduce((s, r) => s + r.dq, 0) / (Q * 1e-9)).toBeCloseTo(1, 12);
    // The printed answer, in σ, holds on both sides of the annulus: its lower end is √(a² + z²), never |z|.
    expect(rel(printed(getProblem('annulus').result, Q, a, b, z), E.z), 'the printed answer').toBeLessThan(1e-12);
  });
  it('is zero in the middle of the hole, and exactly the disk with no hole', () => {
    expect(field('annulus', at({inner: 1, size: 4, distance: 0})).z).toBe(0);
    for (const z of [.5, 3, -2]) {
      const p = at({inner: 0, size: 4, distance: z});
      expect(rel(field('annulus', p).z, field('disk', p).z)).toBeLessThan(1e-14);
    }
  });
  it('is the disk of radius b less the disk of radius a, at the same σ', () => {
    for (const [Q, a, b, z] of CASES) {
      const sigma = Q / (Math.PI * (b * b - a * a)), disk = (R: number) => field('disk', at({charge: sigma * Math.PI * R * R, size: 2 * R, distance: z})).z;
      expect(rel(field('annulus', at({charge: Q, inner: a, size: 2 * b, distance: z})).z, disk(b) - disk(a))).toBeLessThan(1e-10);
    }
  });
  it('lays no sign mark in the hole, however wide the hole is', () => {
    for (const hole of [.5, 1.5, 1.85, 1.9]) for (const unit of [24, 42, 90]) {
      const marks = diskSignMarks(2, unit, null, 6 / unit, hole);
      expect(marks.length, `hole ${hole} unit ${unit}`).toBeGreaterThan(0);
      for (const m of marks) { const r = Math.hypot(m.x, m.y); expect(r).toBeGreaterThan(hole); expect(r).toBeLessThanOrEqual(2); }
    }
  });
  it('holds its hole inside its rim, so the charge is never turned inside out', () => {
    expect(annulusRadii(at({inner: 3, size: 4})).a).toBeLessThan(2);
    expect(Number.isFinite(field('annulus', at({inner: 3.8, size: 1, distance: 2})).z)).toBe(true);
  });
});
describe('the annulus’s limits are the lessons it says they are', () => {
  const Q = 2, a = 1, b = 2, z = 3, sigma = Q * 1e-9 / (Math.PI * (b * b - a * a));
  it('a → 0 at fixed σ is the disk of radius b', () => {
    const tiny = 1e-4, E = field('annulus', at({charge: sigma * 1e9 * Math.PI * (b * b - tiny * tiny), inner: tiny, size: 2 * b, distance: z})).z;
    expect(rel(E, sigma / (2 * EPS0) * (1 - z / Math.hypot(b, z)))).toBeLessThan(1e-7);
  });
  it('b → ∞ at fixed σ is a sheet with a hole: σ/(2ε₀) z/√(a² + z²), not the whole sheet’s σ/(2ε₀)', () => {
    const big = 1e6, E = field('annulus', at({charge: sigma * 1e9 * Math.PI * (big * big - a * a), inner: a, size: 2 * big, distance: z})).z;
    const holed = sigma / (2 * EPS0) * z / Math.hypot(a, z);
    expect(rel(E, holed)).toBeLessThan(1e-5);
    expect(rel(E, sigma / (2 * EPS0))).toBeGreaterThan(.05);
    // And the hole's field is a disk's: the whole sheet less the disk of radius a.
    expect(rel(holed, sigma / (2 * EPS0) - sigma / (2 * EPS0) * (1 - z / Math.hypot(a, z)))).toBeLessThan(1e-14);
  });
  it('far away it is kQ/z², with Q = σπ(b² − a²), and the error falls as (b/z)²', () => {
    const err = (d: number) => field('annulus', at({charge: Q, inner: a, size: 2 * b, distance: d})).z / (K * Q * 1e-9 / d ** 2) - 1;
    expect(Math.abs(err(1e4))).toBeLessThan(1e-7);
    expect(err(300) / err(600)).toBeCloseTo(4, 2);
    expect(err(1e3) * (1e3 / b) ** 2).toBeCloseTo(-3 * (a * a + b * b) / (4 * b * b), 3);
  });
  it('a → b at fixed Q is a ring of radius b', () => {
    const E = field('annulus', at({charge: Q, inner: .999 * b, size: 2 * b, distance: z})).z, ring = field('ring', at({charge: Q, size: 2 * b, distance: z})).z;
    expect(rel(E, ring)).toBeLessThan(1e-3);
    expect(rel(brute(Q, .999 * b, b, z, 200).ez, ring)).toBeLessThan(1e-3);
  });
  it('each limit’s plot ends on the reference its formula prints, at the reader’s own σ, a and b', () => {
    const p = at({charge: Q, inner: a, size: 2 * b, distance: z}), lesson = getProblem('annulus');
    const lim = (mode: string) => lesson.limits.find(l => l.mode === mode)!;
    const grown = sampleLimit(lesson, p, lim('infinite'), 30);
    expect(rel(grown.target, Math.abs(sigma) / (2 * EPS0) * z / Math.hypot(a, z))).toBeLessThan(1e-12);
    const closed = sampleLimit(lesson, p, lim('hole'), 30);
    expect(rel(closed.target, sigma / (2 * EPS0) * (1 - z / Math.hypot(b, z)))).toBeLessThan(1e-12);
    expect(rel(closed.actual, closed.target)).toBeLessThan(1e-12);
    const thin = sampleLimit(lesson, p, lim('thin'), 30);
    expect(rel(thin.target, K * Q * 1e-9 * z / Math.hypot(b, z) ** 3)).toBeLessThan(1e-12);
    expect(rel(thin.actual, thin.target)).toBeLessThan(5e-3);
    for (const charge of [Q, -Q]) for (const mode of ['far', 'hole', 'infinite', 'thin']) for (const t of [1, 9, 30]) {
      const s = sampleLimit(lesson, {...p, charge}, lim(mode), t);
      expect(s.target, `${mode} ${t}`).toBeGreaterThan(0); expect(Math.sign(s.vector!.z)).toBe(Math.sign(charge));
    }
  });
});
