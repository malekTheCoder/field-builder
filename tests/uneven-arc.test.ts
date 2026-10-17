import {describe, it, expect} from 'vitest';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';
import {REGISTRY} from '../src/distributions';
import {field, potential, sampleLimit, numerical} from '../src/symbolic/physics';
import {equivalent} from '../src/symbolic/equivalence';
import {boardLines, partResult} from '../src/workbench/derivation';
import {buildStages} from '../src/explorer/buildRun';
import {bank} from '../src/quiz/bank/uneven-arc';
import {lessonFor} from '../src/lessons';

/* THE SEMICIRCLE WITH UNEVEN CHARGE, CHECKED FROM COULOMB'S LAW. Every number below is a brute-force sum of point
 * charges laid on the arc by hand -- θ from −π/2 to π/2, λ = λ₀ cos θ, λ₀ = Q/(2R) -- never the app's own sampler,
 * so a slip in the partition cannot vouch for itself. The claims are the lesson's and the quiz's: the field, its
 * direction for both signs, the cancelling across the axis, the total charge, the comparison with the even
 * semicircle, and the potential that ignores the spread. */
const ke = 1 / (4 * Math.PI * 8.8541878128e-12);
type Charge = {q: number; x: number; y: number};
/** N point charges at the middles of N equal stretches, each holding its stretch's own charge, λ₀R(sin θ₊ − sin θ₋). */
function cosineArc(Q: number, R: number, n: number): Charge[] {
  const l0 = Q / (2 * R);
  return Array.from({length: n}, (_, i) => {
    const a = -Math.PI / 2 + Math.PI * i / n, b = a + Math.PI / n, m = (a + b) / 2;
    return {q: l0 * R * (Math.sin(b) - Math.sin(a)), x: R * Math.cos(m), y: R * Math.sin(m)};
  });
}
function evenArc(Q: number, R: number, n: number): Charge[] {
  return Array.from({length: n}, (_, i) => { const m = -Math.PI / 2 + Math.PI * (i + .5) / n; return {q: Q / n, x: R * Math.cos(m), y: R * Math.sin(m)}; });
}
function at(charges: Charge[]) {
  let ex = 0, ey = 0, v = 0;
  for (const c of charges) { const dx = -c.x, dy = -c.y, r = Math.hypot(dx, dy); ex += ke * c.q * dx / r ** 3; ey += ke * c.q * dy / r ** 3; v += ke * c.q / r; }
  return {ex, ey, v};
}
const close = (got: number, want: number, rel: number, what: string) =>
  expect(Math.abs(got - want), `${what}: ${got} vs ${want}`).toBeLessThanOrEqual(rel * Math.max(Math.abs(want), 1e-300));
const P = (extra: Partial<Params> = {}): Params => ({...DEFAULT_PARAMS, ...extra});
const problem = getProblem('uneven-arc');

describe('the semicircle with uneven charge, by point charges', () => {
  it('E_x = −πkQ/(4R²), for both signs and every radius, and E_y = 0', () => {
    for (const Q of [2.4e-9, -3.1e-9]) for (const R of [.5, 1.7, 4]) {
      const sum = at(cosineArc(Q, R, 200000));
      close(sum.ex, -Math.PI * ke * Q / (4 * R * R), 1e-9, `E_x Q=${Q} R=${R}`);
      expect(Math.abs(sum.ey) / Math.abs(sum.ex), 'E_y cancels').toBeLessThan(1e-12);
      const app = field('uneven-arc', P({charge: Q * 1e9, size: 2 * R}));
      close(app.x, sum.ex, 1e-9, 'the closed form the app draws');
      expect(app.y).toBe(0);
      // For positive charge the field points away from the arc, toward −x; for negative, toward its middle, +x.
      expect(Math.sign(app.x)).toBe(-Math.sign(Q));
    }
  });
  it('the printed result, in λ₀ and in Q, is that field', () => {
    for (const Q of [2.4e-9, -3.1e-9]) {
      const R = 1.3, l0 = Q / (2 * R), want = at(cosineArc(Q, R, 200000)).ex;
      close(-Math.PI * ke * l0 / (2 * R), want, 1e-9, 'E_x in λ₀');
      expect(equivalent(problem.result, '-pi*k*Q/(4*R^2)', problem).ok, 'result in Q').toBe(true);
    }
  });
  it('the total charge is 2λ₀R, at every cut', () => {
    for (const n of [1, 3, 5, 30, 400]) {
      const total = cosineArc(2.4e-9, 1.3, n).reduce((s, c) => s + c.q, 0);
      close(total, 2.4e-9, 1e-12, `n=${n}`);
      const drawn = REGISTRY['uneven-arc'].sample(P({charge: 2.4, size: 2.6}), n).reduce((s, c) => s + c.dq, 0);
      close(drawn, 2.4e-9, 1e-12, `the figure's pieces, n=${n}`);
    }
  });
  it('the figure draws exactly the pieces this file lays by hand', () => {
    for (const n of [1, 5, 37]) {
      const mine = cosineArc(2.4e-9, 1.3, n), app = REGISTRY['uneven-arc'].sample(P({charge: 2.4, size: 2.6}), n);
      app.forEach((s, i) => { close(s.dq, mine[i].q, 1e-12, `dq ${i}`); expect(Math.hypot(s.position.x - mine[i].x, s.position.y - mine[i].y)).toBeLessThan(1e-12); });
      const sum = at(mine), summed = app.reduce((s, c) => s + c.field.x, 0);
      close(summed, sum.ex, 1e-12, `the chain at n=${n}`);
    }
  });
  it('the sum at N pieces is short of the integral by (2N/π) sin(π/2N), and closes on it', () => {
    let last = Infinity;
    for (const n of [2, 3, 5, 10, 30, 160]) {
      const ratio = at(cosineArc(1e-9, 1, n)).ex / (-Math.PI * ke * 1e-9 / 4);
      close(ratio, 2 * n / Math.PI * Math.sin(Math.PI / (2 * n)), 1e-12, `n=${n}`);
      expect(ratio).toBeLessThan(1);
      expect(1 - ratio).toBeLessThan(last);
      last = 1 - ratio;
    }
  });
  it('one piece holds all of Q at the middle and gives kQ/R², stronger by 4/π', () => {
    const one = at(cosineArc(1e-9, 1, 1));
    close(one.ex, -ke * 1e-9, 1e-12, 'one piece');
  });
  it('the even semicircle with the same Q is weaker, by π²/8, and both are weaker than kQ/R²', () => {
    for (const Q of [1e-9, -2e-9]) {
      const cos = at(cosineArc(Q, 1.1, 200000)).ex, even = at(evenArc(Q, 1.1, 200000)).ex;
      close(even, -2 * ke * Q / (Math.PI * 1.21), 1e-9, 'even semicircle');
      close(cos / even, Math.PI ** 2 / 8, 1e-8, 'ratio');
      expect(Math.abs(cos)).toBeLessThan(ke * Math.abs(Q) / 1.21);
    }
  });
  it('the potential is kQ/R however the charge is spread', () => {
    for (const n of [1, 5, 1000]) close(at(cosineArc(2e-9, 1.3, n)).v, ke * 2e-9 / 1.3, 1e-12, `n=${n}`);
    close(potential('uneven-arc', P({charge: 2, size: 2.6})), ke * 2e-9 / 1.3, 1e-12, 'closed form');
  });
  it('the mirror pieces hold equal charges, and their parts across the axis cancel pair by pair', () => {
    const pieces = cosineArc(1e-9, 1, 9);
    for (let i = 0; i < 4; i++) {
      const a = pieces[i], b = pieces[8 - i];
      close(a.q, b.q, 1e-12, `pair ${i}`);
      const fa = at([a]), fb = at([b]);
      expect(Math.abs(fa.ey + fb.ey)).toBeLessThan(1e-12 * Math.abs(fa.ey));
      close(fa.ex, fb.ex, 1e-12, 'the parts along the axis add');
    }
  });
  it('what cancels is mostly the light end pairs’ field: a pair near the axis keeps nearly all of it', () => {
    // The share of a piece's field that survives along the axis is cos θ; the end pairs hold little charge.
    const pieces = cosineArc(1e-9, 1, 9), mid = at([pieces[4]]), end = at([pieces[0]]);
    expect(Math.abs(mid.ex) / Math.hypot(mid.ex, mid.ey)).toBeCloseTo(1, 12);
    expect(Math.abs(end.ex) / Math.hypot(end.ex, end.ey)).toBeLessThan(.2);
    expect(Math.abs(pieces[0].q)).toBeLessThan(.2 * Math.abs(pieces[4].q));
    // And less of the whole charge goes to cancelling than when it is spread evenly.
    const kept = (cs: Charge[]) => Math.abs(at(cs).ex) / cs.reduce((s, c) => s + Math.hypot(at([c]).ex, at([c]).ey), 0);
    expect(kept(cosineArc(1e-9, 1, 4000))).toBeGreaterThan(kept(evenArc(1e-9, 1, 4000)));
    close(kept(cosineArc(1e-9, 1, 4000)), Math.PI / 4, 1e-6, 'the cosine keeps π/4 of its pieces’ fields');
    close(kept(evenArc(1e-9, 1, 4000)), 2 / Math.PI, 1e-6, 'the even arc keeps 2/π');
  });
});

describe('its limits, measured', () => {
  it('built from point charges, the sum closes on the integral', () => {
    const half = problem.limits.find(l => l.mode === 'half')!, p = P({charge: 2.4, size: 3});
    const first = sampleLimit(problem, p, half, 1), last = sampleLimit(problem, p, half, 30);
    close(first.actual / first.target, 4 / Math.PI, 1e-12, 'one piece');
    expect(Math.abs(last.actual / last.target - 1)).toBeLessThan(1e-3);
    close(first.target, Math.PI * ke * 2.4e-9 / (4 * 1.5 * 1.5), 1e-12, 'the dashed line');
  });
  it('spread evenly, the field falls onto the even semicircle’s', () => {
    const even = problem.limits.find(l => l.mode === 'even')!, p = P({charge: -2.4, size: 3});
    const start = sampleLimit(problem, p, even, 1), end = sampleLimit(problem, p, even, 30);
    expect(Math.abs(start.actual / start.target - Math.PI ** 2 / 8)).toBeLessThan(1e-4);
    expect(Math.abs(end.actual / end.target - 1)).toBeLessThan(1e-4);
    let prev = Infinity;
    for (let t = 1; t <= 30; t += 1) { const s = sampleLimit(problem, p, even, t); expect(s.actual).toBeLessThan(prev); prev = s.actual; }
    // A negative semicircle's field points toward its middle all the way along.
    expect(start.vector!.x).toBeGreaterThan(0);
  });
  it('the quadrature the limit sums is the figure’s own cut', () => {
    const p = P({charge: 1.7, size: 2.2});
    for (const n of [1, 4, 25]) close(numerical('uneven-arc', p, n).x, REGISTRY['uneven-arc'].sample(p, n).reduce((s, c) => s + c.field.x, 0), 1e-12, `n=${n}`);
  });
});

describe('the board, the run and the bracket', () => {
  it('the board writes the density and both cosines', () => {
    const lines = boardLines(problem);
    expect(lines[0].tex).toContain(String.raw`\Delta Q\approx \lambda_0\cos\theta\,R\,\Delta\theta`);
    expect(lines.find(l => l.key === 'limit')!.tex).toContain(String.raw`\lambda_0\cos\theta\,R\,d\theta`);
    expect(lines.find(l => l.key === 'cancel')!.cancels).toContain(String.raw`\Delta E_y+(-\Delta E_y)=0`);
  });
  it('a bracket off the middle leaves E_y, and its two brackets are the lesson’s antiderivatives', () => {
    // From the axis to the upper end: E_x = −(kλ₀/R)(π/4), E_y = −(kλ₀/R)/2.
    const Q = 1e-9, R = 1, l0 = Q / (2 * R);
    const upper = cosineArc(Q, R, 200000).filter(c => c.y > 0), sum = at(upper);
    close(sum.ex, -ke * l0 / R * Math.PI / 4, 1e-8, 'upper half E_x');
    close(sum.ey, -ke * l0 / R / 2, 1e-8, 'upper half E_y');
    expect(partResult(problem, '0', String.raw`\pi/2`, false)).toContain('E_y');
  });
  it('What cancels says the density changes how much a pair adds, not what cancels', () => {
    const cancel = buildStages(problem)[2];
    expect(cancel.pair).toBe(true);
    expect(cancel.caption).toMatch(/cos\(−θ\) = cos θ/);
    expect(cancel.caption).toMatch(/changes how much a pair adds, not what cancels/);
  });
});

describe('the lesson and the quiz say what the numbers say', () => {
  it('the lesson exists, links to the even arc, and its answer is the board’s', () => {
    const l = lessonFor('uneven-arc')!;
    expect(l).toBeDefined();
    expect(problem.link?.id).toBe('arc');
    const text = JSON.stringify(l.sections);
    expect(text).toContain(String.raw`-\\frac{\\pi kQ}{4R^2}`);
    expect(text).toContain(String.raw`\\pi^2/8`);
  });
  it('each quiz question has exactly one right answer and a why for every wrong one', () => {
    expect(bank.length).toBeGreaterThanOrEqual(8);
    for (const q of bank) {
      expect(q.choices.filter(c => c.correct), q.id).toHaveLength(1);
      for (const c of q.choices) if (!c.correct) { expect(c.why, q.id).toBeTruthy(); expect(c.misconception, q.id).toBeTruthy(); }
    }
  });
  it('the quiz’s numbers: ∫cos²θ = π/2 over the half turn, Q = 2λ₀R, the half holds λ₀R', () => {
    let full = 0, half = 0, q = 0; const n = 100000;
    for (let i = 0; i < n; i++) { const t = -Math.PI / 2 + Math.PI * (i + .5) / n; full += Math.cos(t) ** 2 * Math.PI / n; q += Math.cos(t) * Math.PI / n; if (t > 0) half += Math.cos(t) * Math.PI / n; }
    close(full, Math.PI / 2, 1e-9, '∫cos²');
    close(q, 2, 1e-9, '∫cos');
    close(half, 1, 1e-9, '∫ over one half');
  });
});
