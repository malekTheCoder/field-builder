import {describe, expect, it} from 'vitest';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';
import {K, field, numerical, sampleLimit} from '../src/symbolic/physics';
import {sampleDistribution} from '../src/diagrams/sampling';
import {offsetAt, offsetCut, offsetEnds, offsetPartner} from '../src/distributions/offset';
import {pairOrder, pairPlan, pairSum} from '../src/diagrams/pairs';
import {equivalent, safeParse} from '../src/symbolic/equivalence';
/* THE ROD OFF ITS BISECTOR, CHECKED FROM COULOMB'S LAW UP.
 *
 * Its field is summed here from point charges laid along the rod from y₁ = −h − L/2 to y₂ = L/2 − h, with nothing of
 * the app's in the sum. That sum is held against the closed form the app uses, against both formulas the lesson
 * prints, against its two neighbours at the ends of the slider -- the bisector at h = 0 and the rod level with an end
 * at |h| = L/2 -- and against every limit, for both signs of the charge and P on both sides of the middle. */
const at = (o: Partial<Params>): Params => ({...DEFAULT_PARAMS, ...o});
/** The field at P = (r, 0) of n point charges spread evenly along the rod from y₁ to y₂. */
function brute(Q: number, L: number, h: number, r: number, n = 200000) {
  const y1 = -h - L / 2, q = Q * 1e-9 / n;
  let ex = 0, ey = 0;
  for (let i = 0; i < n; i++) { const y = y1 + (i + .5) * L / n, d3 = Math.hypot(y, r) ** 3; ex += K * q * r / d3; ey += -K * q * y / d3; }
  return {ex, ey};
}
const rel = (got: number, want: number) => Math.abs(got - want) / Math.max(Math.abs(want), 1e-300);
/** The lesson's printed answers, evaluated as a student would read them. */
const printed = (expr: string, Q: number, L: number, h: number, r: number) =>
  safeParse(expr).compile().evaluate({pi: Math.PI, k: K, r, L, Q: Q * 1e-9, lambda: Q * 1e-9 / L, y1: -h - L / 2, y2: L / 2 - h}) as number;
/** sin α and cos α at P for a point of the rod at y, α signed like y. */
const sinA = (y: number, r: number) => y / Math.hypot(y, r), cosA = (y: number, r: number) => r / Math.hypot(y, r);
const CASES: [Q: number, L: number, h: number, r: number][] = [
  [2, 4, 1, 3], [-2, 4, 1, 3], [2, 4, -1, 3], [-2, 4, -1, 3], [3.5, 8, 3.7, .5], [-1.1, 1, .45, 6], [5, 6, -2.9, 1.2], [2, 4, 0, 3], [-4, 2, 1, .7], [1, 3, -1.5, 2],
];
describe('the rod off its bisector against point charges laid on it', () => {
  for (const [Q, L, h, r] of CASES) it(`Q ${Q} · L ${L} · h ${h} · r ${r}`, () => {
    const want = brute(Q, L, h, r), p = at({charge: Q, size: L, height: h, distance: r}), E = field('offset', p);
    expect(rel(E.x, want.ex), 'E_x').toBeLessThan(1e-7);
    if (h === 0) expect(Math.abs(E.y)).toBeLessThan(1e-12 * Math.abs(E.x)); else expect(rel(E.y, want.ey), 'E_y').toBeLessThan(1e-6);
    expect(E.z).toBe(0);
    // The sign: E_x away from a positive rod; E_y away from the rod's longer reach beyond P's level, h > 0 being more
    // rod below P. For a negative rod both turn round.
    expect(Math.sign(E.x)).toBe(Math.sign(Q));
    if (h !== 0) expect(Math.sign(E.y)).toBe(Math.sign(Q) * Math.sign(h));
    // The angle forms, (kλ/r)(sin α₂ − sin α₁) and (kλ/r)(cos α₂ − cos α₁).
    const y1 = -h - L / 2, y2 = L / 2 - h, kl = K * Q * 1e-9 / L / r;
    expect(rel(kl * (sinA(y2, r) - sinA(y1, r)), E.x)).toBeLessThan(1e-12);
    expect(Math.abs(kl * (cosA(y2, r) - cosA(y1, r)) - E.y)).toBeLessThan(1e-9 * Math.hypot(E.x, E.y));
    // The printed answers, in λ, y₁ and y₂.
    const lesson = getProblem('offset');
    expect(rel(printed(lesson.result, Q, L, h, r), E.x), 'printed E_x').toBeLessThan(1e-12);
    expect(Math.abs(printed(lesson.secondaryResult!, Q, L, h, r) - E.y), 'printed E_y').toBeLessThan(1e-9 * Math.hypot(E.x, E.y));
    // The app's own quadrature, and the pieces the figure draws, refined, close on the same field.
    const N = numerical('offset', p, 100000);
    expect(rel(N.x, want.ex)).toBeLessThan(1e-6);
    const drawn = sampleDistribution('offset', p, 1600).reduce((s, x) => ({x: s.x + x.field.x, y: s.y + x.field.y}), {x: 0, y: 0});
    expect(rel(drawn.x, E.x), 'the drawn pieces, E_x').toBeLessThan(1e-4);
    expect(Math.abs(drawn.y - E.y) / Math.hypot(E.x, E.y), 'the drawn pieces, E_y').toBeLessThan(1e-4);
    expect(sampleDistribution('offset', p, 7).reduce((s, x) => s + x.dq, 0) / (Q * 1e-9)).toBeCloseTo(1, 12);
  });
  it('is the bisector at h = 0 and the rod level with its end at h = −L/2', () => {
    for (const [Q, L, r] of [[2, 4, 3], [-3, 7, .6], [1, 1, 5]] as const) {
      const bis = field('bisector', at({charge: Q, size: L, distance: r})), mid = field('offset', at({charge: Q, size: L, distance: r, height: 0}));
      expect(rel(mid.x, bis.x)).toBeLessThan(1e-13); expect(Math.abs(mid.y)).toBe(0);
      const end = field('endpoint', at({charge: Q, size: L, distance: r})), low = field('offset', at({charge: Q, size: L, distance: r, height: -L / 2}));
      expect(rel(low.x, end.x)).toBeLessThan(1e-13); expect(rel(low.y, end.y)).toBeLessThan(1e-12);
      // At the upper end it is the same rod turned over: E_y the other way round.
      const high = field('offset', at({charge: Q, size: L, distance: r, height: L / 2}));
      expect(rel(high.x, end.x)).toBeLessThan(1e-13); expect(rel(high.y, -end.y)).toBeLessThan(1e-12);
    }
  });
  it('holds P level with some part of the rod: h is clamped to ±L/2', () => {
    expect(offsetEnds(at({size: 2, height: 3})).h).toBe(1);
    expect(offsetEnds(at({size: 2, height: -3})).h).toBe(-1);
    expect(field('offset', at({size: 2, height: 3, distance: 2})).y).toBeCloseTo(field('offset', at({size: 2, height: 1, distance: 2})).y, 20);
  });
  it('keeps every digit of E_y far away, where the two cosines agree', () => {
    for (const r of [1e3, 1e5, 1e7]) {
      const p = at({charge: 2, size: 4, height: 1, distance: r}), E = field('offset', p);
      // Q at the middle, a height h = 1 below P: E_y = kQh/(r² + h²)^{3/2}, to order (L/r)².
      expect(rel(E.y, K * 2e-9 * 1 / Math.hypot(r, 1) ** 3)).toBeLessThan((4 / r) ** 2 + 1e-12);
    }
  });
});
describe('the cut: a mirrored stretch and a leftover, each cut evenly', () => {
  for (const [L, h] of [[4, 1], [4, -1], [8, 3.7], [4, 0], [4, 2], [4, -2], [1, .03], [6, -.4]] as const) it(`L ${L} · h ${h}`, () => {
    const p = at({size: L, height: h, slices: 5}), {m, y1, y2} = offsetEnds(p);
    for (const n of [5, 10, 20, 40, 160]) {
      const c = offsetCut(p, n);
      expect(c.mirror.count + c.leftover).toBe(n);
      if (m > 0 && L - 2 * m > 1e-9) { expect(c.mirror.count).toBeGreaterThan(0); expect(c.leftover).toBeGreaterThan(0); }
      // The ends are the rod's ends, and the mirrored stretch is symmetric about P's level.
      expect(offsetAt(c, 0)).toBeCloseTo(y1, 12); expect(offsetAt(c, 1)).toBeCloseTo(y2, 12);
      const {start, count} = c.mirror;
      if (count) { expect(offsetAt(c, start / n)).toBeCloseTo(-m, 12); expect(offsetAt(c, (start + count) / n)).toBeCloseTo(m, 12); }
      // Every piece of the mirrored stretch has a partner the same distance away; the leftover's have none.
      const s = sampleDistribution('offset', p, n);
      for (let i = 0; i < n; i++) {
        const j = offsetPartner(c, i);
        if (i < start || i >= start + count) expect(j).toBe(-1);
        else if (j >= 0) { expect(s[j].position.y).toBeCloseTo(-s[i].position.y, 12); expect(s[j].dq).toBeCloseTo(s[i].dq, 20); }
        else expect(Math.abs(s[i].position.y)).toBeLessThan(1e-12);
      }
    }
    // Doubling the reader's N keeps every cut: each piece of the coarser cut is two of the finer.
    const a = offsetCut(p, 5), b = offsetCut(p, 10);
    for (let i = 0; i <= 5; i++) expect(offsetAt(b, (2 * i) / 10)).toBeCloseTo(offsetAt(a, i / 5), 12);
  });
});
describe('the sum in mirror pairs, then the leftover whole', () => {
  for (const [Q, h] of [[2, 1], [-2, 1], [2, -1.3], [2, 0], [2, 2]] as const) it(`Q ${Q} · h ${h}`, () => {
    const p = at({charge: Q, size: 4, height: h, slices: 5}), s = sampleDistribution('offset', p, 5), c = offsetCut(p, 5);
    const plan = pairPlan('offset', s, 0, c.mirror)!, order = pairOrder('offset', 5, 0, c.mirror)!;
    expect(plan).not.toBeNull();
    // Every piece goes in exactly once.
    const taken = Array(5).fill(0);
    for (const slot of order) for (const [i, share] of slot.shares) taken[i] += share;
    expect(taken).toEqual([1, 1, 1, 1, 1]);
    // The pairs come first and lie along x; the leftover pieces after them, each whole, nearest P's level first.
    const pairs = plan.filter(st => !st.alone), lone = plan.filter(st => st.alone);
    expect(plan.slice(0, pairs.length)).toEqual(pairs);
    for (const st of pairs) expect(Math.abs(st.along.y)).toBeLessThan(1e-12 * Math.abs(st.along.x));
    for (const st of lone) expect(st.along).toEqual(st.fa);
    const dist = lone.map(st => Math.abs(s[st.a.of].position.y));
    expect(dist).toEqual([...dist].sort((x, y) => x - y));
    // The whole plan adds to the pieces' own sum.
    const total = pairSum(plan, plan.length), sum = s.reduce((v, x) => ({x: v.x + x.field.x, y: v.y + x.field.y}), {x: 0, y: 0});
    expect(rel(total.x, sum.x)).toBeLessThan(1e-12); expect(Math.abs(total.y - sum.y)).toBeLessThan(1e-12 * Math.abs(sum.x));
  });
});
describe('the rod off its bisector’s limits are the lessons it says they are', () => {
  const lesson = getProblem('offset'), lim = (mode: string) => lesson.limits.find(l => l.mode === mode)!;
  it('far away it is kQ/d² with d counted from the middle, and the error falls as (L/d)²', () => {
    const err = (r: number) => { const E = field('offset', at({charge: 2, size: 4, height: 1, distance: r})); return Math.hypot(E.x, E.y) / (K * 2e-9 / (r * r + 1)) - 1; };
    expect(Math.abs(err(1e4))).toBeLessThan(1e-7);
    expect(err(400) / err(800)).toBeCloseTo(4, 1);
  });
  it('grown at fixed λ and h it is the endless line, 2kλ/r, with E_y gone', () => {
    const lambda = .5, r = 3, L = 1e6, E = field('offset', at({charge: lambda * L, size: L, height: 1, distance: r}));
    expect(rel(E.x, 2 * K * lambda * 1e-9 / r)).toBeLessThan(1e-9);
    expect(Math.abs(E.y / E.x)).toBeLessThan(1e-9);
  });
  it('each limit’s plot ends on the reference its formula prints', () => {
    for (const charge of [2, -2]) for (const height of [1, -1, 0]) {
      const p = at({charge, size: 4, height, distance: 3});
      const grown = sampleLimit(lesson, p, lim('infinite'), 30);
      expect(grown.target).toBeCloseTo(2 * K * .5e-9 / 3, 15);
      const far = sampleLimit(lesson, p, lim('far'), 30);
      expect(Math.abs(far.actual / far.target - 1)).toBeLessThan(.01);
      const mid = sampleLimit(lesson, p, lim('middle'), 30), start = sampleLimit(lesson, p, lim('middle'), 1);
      expect(mid.actual).toBeLessThan(1e-12 * start.actual); expect(start.actual).toBeGreaterThan(0);
      expect(rel(mid.vector!.x, field('bisector', p).x)).toBeLessThan(1e-12);
      const end = sampleLimit(lesson, p, lim('end'), 30);
      expect(rel(end.actual, end.target)).toBeLessThan(1e-12);
      expect(rel(end.target, Math.hypot(field('endpoint', p).x, field('endpoint', p).y))).toBeLessThan(1e-12);
      for (const mode of ['far', 'infinite', 'middle', 'end']) for (const t of [1, 9, 30]) {
        const s = sampleLimit(lesson, p, lim(mode), t);
        expect(Math.sign(s.vector!.x), `${mode} ${t}`).toBe(Math.sign(charge));
      }
    }
  });
});
describe('the grader takes y₁ and y₂ however they are written', () => {
  const lesson = getProblem('offset');
  it('marks the printed answers right, and their usual slips wrong', () => {
    expect(equivalent(lesson.result, lesson.result, lesson).ok).toBe(true);
    expect(equivalent(String.raw`\frac{k\lambda}{r}\left(\frac{y_2}{\sqrt{y_2^2+r^2}}-\frac{y_1}{\sqrt{y_1^2+r^2}}\right)`, lesson.result, lesson).ok).toBe(true);
    expect(equivalent('k*Q/(L*r)*(y₂/sqrt(y₂^2+r^2)-y₁/sqrt(y₁^2+r^2))', lesson.result, lesson).ok).toBe(true);
    expect(equivalent('k*lambda/r*(y2/sqrt(y2^2+r^2)+y1/sqrt(y1^2+r^2))', lesson.result, lesson).ok).toBe(false);
    expect(equivalent(lesson.secondaryResult!, lesson.secondaryResult!, lesson).ok).toBe(true);
    expect(equivalent('k*lambda*(1/sqrt(y1^2+r^2)-1/sqrt(y2^2+r^2))', lesson.secondaryResult!, lesson).ok).toBe(false);
    expect(equivalent('-dE*sin(alpha)', '-dE*sin(alpha)', lesson).ok).toBe(true);
  });
});
