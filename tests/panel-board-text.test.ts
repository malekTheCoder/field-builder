import {describe, expect, it} from 'vitest';
import {PROBLEMS} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {K} from '../src/distributions/constants';
import {boardLines, exactSum, resultLines} from '../src/workbench/derivation';
/* THE BOARD'S WORDS, CHECKED AGAINST WHAT THEY CLAIM.
 *
 * Each of these was a critic's finding on the board's text: the sheet's second line summed a wide
 * ring's bits as if all were r_i away, which is infinite for the outermost ring at every N; v-arc wrote
 * an indefinite integral and said it "counts the pieces"; a bracket on the arc finished on
 * (φ/4 − −φ/4); the ring lessons opened by saying the pieces must be small, then that size never
 * mattered; the bisector's answer swapped λ for Q with nothing between. */
const lesson = (id: string) => PROBLEMS.find(p => p.id === id)!;
const step = (id: string, key: string, bounds?: [string, string], opts: {keeps?: boolean; span?: string} = {}) =>
  boardLines(lesson(id), bounds, opts).find(l => l.key === key)!;

describe('the sheet sums the thin ring that stands in for each wide one', () => {
  it('the figure’s chain is the stand-in’s k ΔQ cos α / r_i², ring by ring, and that is within half a percent of the wide ring’s', () => {
    const n = 5, z = DEFAULT_PARAMS.distance, dA = Math.PI / 2 / n;
    sampleDistribution('sheet', DEFAULT_PARAMS, n).forEach((s, i) => {
      const a1 = i * dA, a2 = (i + 1) * dA, alpha = (a1 + a2) / 2, ri = z / Math.cos(alpha);
      const standIn = K * s.dq * Math.cos(alpha) / ri ** 2;
      expect(Math.abs(s.field.z) / Math.abs(standIn), `ring ${i + 1}`).toBeCloseTo(1, 10);
      // The wide ring's own field on its axis: 2πkσ(cos α₁ − cos α₂), σ = charge per area.
      const sigma = DEFAULT_PARAMS.charge * 1e-9;
      const exact = 2 * Math.PI * K * sigma * (Math.cos(a1) - Math.cos(a2));
      expect(Math.abs(Math.abs(standIn) / exact - 1), `ring ${i + 1}`).toBeLessThan(.005);
    });
  });
  it('the wide ring’s own bits put at r_i would be 27% too big on the fourth ring and infinite on the fifth', () => {
    // Why line two is the stand-in's: its old reading, Σ over the wide ring's bits at one r_i, is
    // k (wide ring's charge) cos α / r_i².
    const z = 3, n = 5, dA = Math.PI / 2 / n;
    const wideAtRi = (i: number) => {
      const a1 = i * dA, a2 = (i + 1) * dA, alpha = (a1 + a2) / 2, ri = z / Math.cos(alpha);
      const charge = Math.PI * ((z * Math.tan(a2)) ** 2 - (z * Math.tan(a1)) ** 2);
      return {wrong: charge * Math.cos(alpha) / ri ** 2, exact: 2 * Math.PI * (Math.cos(a1) - Math.cos(a2))};
    };
    const fourth = wideAtRi(3);
    expect(fourth.wrong / fourth.exact).toBeGreaterThan(1.25);
    expect(Math.tan((n) * dA)).toBeGreaterThan(1e15);
    // So the board's sum is over the thin ring, and the cancel step says so without "nearly".
    expect(step('sheet', 'one').tex).toContain(String.raw`\sum\nolimits_{\text{thin ring}}`);
    expect(step('sheet', 'one').say).toMatch(/stands in/);
  });
});

describe('a constant integrand: what ∫dθ is, and what it is not', () => {
  it('every ∫dθ has its limits, and none of them "counts the pieces"', () => {
    for (const id of ['ring', 'v-ring', 'v-arc']) {
      const limit = step(id, 'limit').say!;
      expect(limit, id).toMatch(/\$\\int_\{?[^$]*\}?\^\{?[^$]*\}?d\\theta=/);
      expect(limit, id).not.toMatch(/\\int d\\theta/);
      expect(limit, id).toMatch(/adds up the pieces’ angles/);
      expect(limit, id).not.toMatch(/counts the pieces/);
    }
    expect(step('v-arc', 'limit').say).toContain(String.raw`$\int_{-\varphi/2}^{\varphi/2}d\theta=\varphi$`);
    for (const p of PROBLEMS) for (const l of boardLines(p)) expect([l.say, l.nothing].join(' '), p.id).not.toMatch(/counts the pieces/);
  });
  it('a bracket finishes on the angle it takes, never a double minus or an unsubtracted span', () => {
    const cases: [string, [string, string], string | undefined][] = [
      ['v-arc', ['-\\varphi/2', '\\theta_2'], undefined],
      ['v-arc', ['-\\varphi/4', '\\varphi/4'], '\\varphi/2'],
      ['ring', ['\\pi/2', '3\\pi/2'], '\\pi'],
      ['v-ring', ['\\pi/2', '3\\pi/2'], '\\pi'],
    ];
    for (const [id, bounds, span] of cases) {
      const limit = step(id, 'limit', bounds, {span});
      expect(limit.finish, `${id} ${bounds.join(" → ")}`).not.toContain('--');
      expect(limit.finish, `${id} ${bounds.join(" → ")}`).not.toMatch(/3\\pi\/2-/);
      if (span) expect(limit.finish, `${id} ${bounds.join(" → ")}`).toContain(span);
      // The angle stands before a fraction, not trailing after it.
      if (id !== 'v-arc') expect(limit.finish, id).toMatch(/=\\pi\\,\\frac/);
      // And the rule says what the bracket's ∫dθ comes to.
      expect(limit.say, id).toContain(String.raw`d\theta=`);
    }
    expect(step('v-arc', 'limit', ['-\\varphi/2', '\\theta_2']).finish).toContain(String.raw`(\theta_2+\varphi/2)`);
  });
});

describe('the exact lessons never say the pieces must be small', () => {
  it('ring, v-ring and v-arc', () => {
    for (const p of PROBLEMS.filter(exactSum)) {
      const cut = buildStages(p)[0];
      expect(cut.line, p.id).not.toMatch(/small enough/);
      expect(cut.caption, p.id).not.toMatch(/small enough/);
      expect(cut.caption, p.id).toMatch(/need not even be small/);
      expect(cut.caption, p.id).toMatch(/exactly a point charge’s/);
    }
    // Every other finite lesson still wants short pieces -- said as when a piece is nearly a point charge,
    // not as a fact of the drawn ones, which the sliders draw five times their distance from P.
    expect(buildStages(lesson('bisector'))[0].line).toMatch(/short compared with its distance from P is nearly a point charge/);
  });
});

describe('the answer follows the board’s letters', () => {
  it('the bisector’s answer is said in λ before Q, as the board integrated it', () => {
    const [ex] = resultLines(lesson('bisector'));
    expect(ex).toContain(String.raw`\frac{k\lambda L}{r\sqrt{(L/2)^2+r^2}}`);
    expect(ex.indexOf('k\\lambda L')).toBeLessThan(ex.indexOf('kQ'));
    // And the two are one: ∫ kλ r dy/(y²+r²)^{3/2} from −L/2 to L/2 is kλL/(r√(r²+(L/2)²)).
    const k = 2, lambda = 1.3, L = 4, r = 1.7, n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) { const y = -L / 2 + (i + .5) * L / n; sum += k * lambda * r / (y * y + r * r) ** 1.5 * L / n; }
    expect(sum / (k * lambda * L / (r * Math.sqrt(r * r + (L / 2) ** 2)))).toBeCloseTo(1, 6);
  });
});

describe('small things the board said wrongly', () => {
  it('axial has no second row that only moves dx; a is said to be P’s distance past the end', () => {
    expect(step('axial', 'limit').finish).toBeUndefined();
    expect(step('axial', 'one').say).toMatch(/a distance \$a\$ past its end/);
  });
  it('the disk’s ≈ gives its reason, not the approximation again', () => {
    for (const id of ['disk', 'v-disk']) {
      expect(step(id, 'add').say, id).toMatch(/each ring is \$\\Delta s\$ wide, but all its charge is counted at one radius \$s\$/);
      expect(step(id, 'add').say, id).not.toMatch(/still treated as one thin ring/);
      // And One piece says the ring is treated as thin, rather than stating it as a fact.
      expect(step(id, 'one').say, id).toMatch(/treated as thin/);
    }
  });
  it('the ring lessons call their pieces pieces; "bit" is a part of one piece on the disk and the sheet', () => {
    const ring = lesson('ring');
    const text = [...boardLines(ring).flatMap(l => [l.say, l.nothing, l.cancelsSay]), ...boardLines(ring, ['0', '\\pi']).flatMap(l => [l.say, l.nothing]),
      ...buildStages(ring).flatMap(s => [s.line, s.caption])].filter(Boolean).join(' ');
    // "Every bit of every piece" is a part of a piece, as on the disk; a piece itself is never a bit.
    expect(text.replace(/every bit of every piece/gi, '')).not.toMatch(/\bbits?\b/);
  });
  it('the unit vector is in ink: the figure has nothing for it to light', () => {
    for (const p of PROBLEMS.filter(q => q.quantity === 'E')) expect(step(p.id, 'one').tex, p.id).not.toMatch(/\\htmlClass\{[^}]*\}\{\\hat/);
  });
});
