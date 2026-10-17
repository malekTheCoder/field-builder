import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import katex from 'katex';
import {evaluate} from 'mathjs';
import {PROBLEMS} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {Prose} from '../src/components/Math';
import {ARC_UNFOLD, AXIAL_UNFOLD, DISK_UNFOLD, SEMI_UNFOLD, boardLines, exactSum, resultLines} from '../src/workbench/derivation';
/* THE BOARD'S FOURTH ROUND OF CLAIMS, EACH CHECKED AS ONE.
 *
 * Every case was a critic's finding: a ring's third set equal to a point charge with no word that only
 * its part along the axis is; a partial ring whose magnitude "survives"; pieces "small enough" with no
 * word for what they are small beside, at settings where the board's sum is 2.7 times the field; an arc
 * whose every bit is R away and whose sum is still only ≈, with no reason; a "=" under Shrink them with
 * no word for where the ≈ went; fixed-Q answers in λ alone; a derivative as the first line's reason; the
 * run's symbols in the page's sans; the shelf's x-axis broken at its hyphen. Where a sentence makes a claim
 * about numbers, the numbers are checked too. */
const lesson = (id: string) => PROBLEMS.find(p => p.id === id)!;
const step = (id: string, key: string, bounds?: [string, string], opts: {keeps?: boolean; span?: string; oneSided?: boolean; below?: boolean} = {}) =>
  boardLines(lesson(id), bounds, opts).find(l => l.key === key)!;
const typeset = (tex: string) => katex.renderToString(tex, {throwOnError: true, strict: 'ignore', displayMode: true});
/** The midpoint integral of f over [a, b]. */
const integral = (f: (x: number) => number, a: number, b: number, n = 200000) => {
  let s = 0; const h = (b - a) / n;
  for (let i = 0; i < n; i++) s += f(a + (i + .5) * h);
  return s * h;
};

describe('the ring’s piece, of any size', () => {
  it('One piece says the piece is drawn as a point charge and that its part along the axis is exact at any size', () => {
    const say = step('ring', 'one').say!;
    expect(say).toMatch(/need not be small/);
    expect(say).toMatch(/along the axis/);
    expect(say).toMatch(/at any size/);
    expect(say).toMatch(/leans a little closer to the axis/);
    // And What cancels names the arrow as the drawing it is.
    expect(step('ring', 'cancel').say).toMatch(/^The angle \$\\alpha\$ is the one .* The drawn arrow/);
    // A third of a ring, R = 2 and z = 3: every bit is r_i away at one angle, so the parts along the axis
    // add to the point charge's exactly, while the parts across add to sin(Δθ/2)/(Δθ/2) = 0.83 of it.
    const R = 2, z = 3, dTheta = 2 * Math.PI / 3, ri = Math.hypot(R, z);
    const along = integral(() => z / ri ** 3, -dTheta / 2, dTheta / 2, 2000) / dTheta;
    const across = integral(t => R * Math.cos(t) / ri ** 3, -dTheta / 2, dTheta / 2, 2000) / dTheta;
    expect(along / (z / ri ** 3)).toBeCloseTo(1, 12);
    expect(across / (R / ri ** 3)).toBeCloseTo(Math.sin(dTheta / 2) / (dTheta / 2), 6);
    expect(across / (R / ri ** 3)).toBeLessThan(.85);
  });
  it('part of a ring says in words what its parts across the axis do, with its sine, and writes no magnitude that "survives"', () => {
    for (const [b, oneSided] of [[['0', '\\pi'], true], [['0', '3\\pi/2'], false]] as const) {
      const cancel = step('ring', 'cancel', [...b], {oneSided});
      expect(cancel.also).toBeUndefined();
      expect(cancel.say).toContain(String.raw`$\sin\alpha=R/\sqrt{R^2+z^2}$`);
      expect(cancel.say).toMatch(/only partly cancel, and the rest leans the field/);
      expect([cancel.say, cancel.nothing, cancel.also].join(' ')).not.toMatch(/\|\\Delta\\mathbf E_\\perp\|/);
    }
    // The rods keep their signed survivor.
    expect(step('bisector', 'cancel', ['0', 'L/2']).also).toContain(String.raw`\Delta E_y=-\frac{k\,`);
  });
});

describe('the bracket’s angle is said to be negative only where it can be', () => {
  it('wholly above the middle, no word about below it', () => {
    expect(step('bisector', 'cancel', ['0', 'L/2']).say).not.toMatch(/is negative/);
    expect(step('bisector', 'cancel', ['-L/2', '0']).say).toMatch(/below the.*\$x\$-axis, where \$\\alpha_i\$, like \$y_i\$, is negative/);
    expect(step('bisector', 'cancel', ['-L/4', 'L/2'], {keeps: false, oneSided: false}).say).toMatch(/is negative/);
    // A handle's name says nothing of where it is: the panel says, and without it the sentence stays.
    expect(step('bisector', 'cancel', ['y_1', 'L/2'], {below: false}).say).not.toMatch(/is negative/);
    expect(step('bisector', 'cancel', ['y_1', 'L/2']).say).toMatch(/is negative/);
  });
});

describe('small beside what', () => {
  // The lessons whose pieces are cut evenly along the charge and whose sum is not already exact.
  const bounded = ['bisector', 'endpoint', 'ramp', 'axial', 'disk', 'v-disk', 'v-rod-bisector', 'v-rod-axial'];
  // "Compared with", not "beside", which read as "next to"; and the run's line says when a piece is nearly a
  // point charge, not that the drawn pieces are: at r = ½ beside L = 8 they are five times their distance.
  it('the run’s Cut it up and the board’s Add say the pieces are small compared with their distance from P', () => {
    for (const id of bounded) {
      const [cut] = buildStages(lesson(id));
      expect(cut.caption, id).toMatch(/distance from P/);
      expect(step(id, 'add').say, id).toMatch(/(short|narrow) compared with (its|that) distance/);
      if (id !== 'disk' && id !== 'v-disk') expect(cut.line, id).toMatch(/^A piece short compared with its distance from P is nearly a point charge\./);
    }
    expect(buildStages(lesson('arc'))[0].caption).toMatch(/short compared with their distance from P, which is R/);
  });
  it('at r = ½ beside L = 8 and three pieces the bisector’s sum is 2.7 times the field: the words are needed', () => {
    const r = .5, L = 8, n = 3, dy = L / n;
    const sum = Array.from({length: n}, (_, i) => -L / 2 + (i + .5) * dy).reduce((s, y) => s + r * dy / (y * y + r * r) ** 1.5, 0);
    const field = L / (r * Math.sqrt((L / 2) ** 2 + r * r));
    expect(sum / field).toBeGreaterThan(2.6);
    expect(sum / field).toBeLessThan(2.8);
  });
});

describe('the arc: every bit is R away, and still only ≈', () => {
  it('says why: cos θ changes across a piece, and the sum takes it at the middle', () => {
    expect(step('arc', 'add').say).toMatch(/every bit of a piece is \$R\$ from.*\$P\$, but the bits’ fields point different ways: \$\\cos\\theta\$ changes across the piece, and the sum takes it at the piece’s middle/);
    expect(buildStages(lesson('arc'))[0].line).toMatch(/the field’s direction turns along a piece/);
    // The point-charge sum is too big by exactly (Δθ/2)/sin(Δθ/2): 1.7% at five pieces of a semicircle.
    const phi = DEFAULT_PARAMS.phi;
    for (const n of [3, 5]) {
      const dt = phi / n, sum = sampleDistribution('arc', DEFAULT_PARAMS, n).reduce((x, s) => x + s.field.x, 0);
      const exact = sampleDistribution('arc', DEFAULT_PARAMS, 4000).reduce((x, s) => x + s.field.x, 0);
      expect(sum / exact, `${n} pieces`).toBeCloseTo((dt / 2) / Math.sin(dt / 2), 5);
    }
    expect((Math.PI / 10) / Math.sin(Math.PI / 10) - 1).toBeCloseTo(.0166, 3);
  });
  it('One piece points at direction, not at the distance and the charge, which do not vary', () => {
    const one = buildStages(lesson('arc'))[1];
    expect(one.line).toMatch(/same charge: the arrows differ only in direction/);
    expect(one.line).not.toMatch(/farther/);
    expect(one.caption).toMatch(/every arrow is the same size; only its direction changes round the arc/);
    expect(one.caption).not.toMatch(/how far away/);
    // Every piece of the arc holds the same charge, R from P.
    const pieces = sampleDistribution('arc', DEFAULT_PARAMS, 5);
    for (const s of pieces) expect(s.dq / pieces[0].dq).toBeCloseTo(1, 12);
  });
});

describe('where the ≈ goes', () => {
  it('every lesson whose sum is only ≈ says, under the integral, why the integral is =', () => {
    for (const p of PROBLEMS.filter(q => !exactSum(q))) {
      const limit = step(p.id, 'limit').say!;
      expect(limit, p.id).toMatch(/The \$\\approx\$ becomes \$=\$ here: the (thinner|shorter) a (piece|ring)/);
      expect(limit, p.id).toMatch(/in the limit/);
      // And the run's last line says so too, rather than "the field stops depending on the cut".
      const run = buildStages(p)[4].line;
      expect(run, p.id).toMatch(/becomes exact|stops changing/);
      expect(run, p.id).not.toMatch(/stops depending on the cut/);
    }
    for (const p of PROBLEMS.filter(exactSum)) expect(step(p.id, 'limit').say, p.id).not.toMatch(/\\approx\$ becomes/);
  });
});

describe('the answer in Q where the lesson holds Q', () => {
  // However the setup words it: "carries a uniform charge Q", "Q is fixed", "a fixed total charge Q".
  const fixesQ = (p: (typeof PROBLEMS)[number]) => /uniform charge \$Q\$|\$Q\$ is fixed|fixed total charge \$Q\$|total charge \$Q\$ is fixed/.test(p.setup);
  it('every lesson whose setup fixes Q says its answer in Q too', () => {
    const held = PROBLEMS.filter(fixesQ).map(p => p.id).sort();
    expect(held).toEqual(['arc', 'axial', 'bisector', 'endpoint', 'ring', 'v-arc', 'v-ring', 'v-rod-axial', 'v-rod-bisector']);
    for (const id of held) {
      const tex = resultLines(lesson(id)).join(' ');
      expect(tex, id).toMatch(/kQ/);
      for (const t of resultLines(lesson(id))) expect(() => typeset(t), id).not.toThrow();
    }
    // In λ first where the board built it in λ, then in Q.
    for (const id of ['arc', 'axial', 'v-rod-bisector', 'v-rod-axial', 'endpoint']) {
      const tex = resultLines(lesson(id))[0];
      expect(tex.indexOf('\\lambda'), id).toBeLessThan(tex.indexOf('kQ'));
    }
  });
  it('the Q form is the λ form with the setup’s λ', () => {
    for (const at of [{k: 1.3, Q: 2.1, R: 1.7, phi: 2.2, L: 3.1, a: .8, r: 1.4}, {k: .7, Q: -1.2, R: .9, phi: 5.9, L: 6, a: 2.5, r: .6}]) {
      const {k, Q, R, phi, L, a, r} = at;
      // The arc: λ = Q/(Rφ).
      expect(evaluate(lesson('arc').result, {...at, lambda: Q / (R * phi)})).toBeCloseTo(-2 * k * Q / (R * R * phi) * Math.sin(phi / 2), 12);
      // The rod on its axis and its potential: λ = Q/L.
      expect(evaluate(lesson('axial').result, {...at, lambda: Q / L})).toBeCloseTo(k * Q / (a * (L + a)), 12);
      expect(evaluate(lesson('v-rod-axial').result, {...at, lambda: Q / L})).toBeCloseTo(k * Q / L * Math.log(1 + L / a), 12);
      expect(evaluate(lesson('v-rod-bisector').result, {...at, lambda: Q / L})).toBeCloseTo(2 * k * Q / L * Math.log((L / 2 + Math.sqrt((L / 2) ** 2 + r * r)) / r), 12);
      // The rod level with one end: E_y in λ is −kλ(1/r − 1/√(L² + r²)), and kλ is kQ/L.
      const lambda = Q / L;
      expect(-k * lambda * (1 / r - 1 / Math.hypot(L, r))).toBeCloseTo(-(k * Q / L) * (1 / r - 1 / Math.hypot(L, r)), 12);
    }
    // At fixed Q the arc's field only falls as φ opens, where in λ it would peak at a semicircle.
    const atQ = (phi: number) => Math.sin(phi / 2) / phi;
    for (let phi = .2; phi < 2 * Math.PI; phi += .2) expect(atQ(phi + .1)).toBeLessThan(atQ(phi));
  });
});

describe('the equal-angle first line is geometry, not a rate', () => {
  it('no "how fast"; the piece across the sight line, and 1/cos α along the line', () => {
    for (const id of ['infinite', 'semi', 'sheet']) {
      const say = step(id, 'pieces').say!;
      expect(say, id).not.toMatch(/how fast/);
      expect(say, id).toMatch(/across the line of sight/);
      expect(say, id).toMatch(/times as (long|wide)/);
    }
    // Δx cos α = r_i Δα, with r_i = r sec α: a thin piece is r sec²α Δα long.
    const r = 1.6, alpha = .9, d = 1e-6;
    const dx = r * (Math.tan(alpha + d / 2) - Math.tan(alpha - d / 2));
    expect(dx * Math.cos(alpha) / ((r / Math.cos(alpha)) * d)).toBeCloseTo(1, 6);
  });
  it('the disk says what s and Δs are where they first appear; a bit’s field lies along its own line, not "its own r_i"', () => {
    for (const id of ['disk', 'v-disk']) expect(step(id, 'pieces').say, id).toMatch(/A thin ring of radius \$s\$ and width \$\\Delta s\$/);
    for (const id of ['disk', 'sheet']) expect(step(id, 'cancel').say, id).not.toMatch(/its own \$r_i\$/);
  });
  it('a potential’s One piece names the distance once', () => {
    for (const p of PROBLEMS.filter(q => q.quantity === 'V')) {
      const say = step(p.id, 'one').say!;
      expect(say, p.id).not.toMatch(/over its distance.{0,3}over/);
      expect(say, p.id).toMatch(/divided by its distance/);
    }
  });
});

describe('the run', () => {
  it('a disk’s and a sheet’s second stage is One ring', () => {
    for (const p of PROBLEMS) expect(buildStages(p)[1].name, p.id).toBe(['disk', 'sheet', 'annulus'].includes(p.geometry) ? 'One ring' : 'One piece');
  });
  it('every symbol in a run line is marked for the page to set as math, and the plain line is the same words', () => {
    for (const p of PROBLEMS) for (const s of buildStages(p)) {
      const words = s.prose.split('$').filter((_, i) => i % 2 === 0).join(' ');
      expect(words, `${p.id} · ${s.key}: "${s.prose}"`).not.toMatch(/(^|[\s(])(P|k|R|N|x|z)([\s.,:;) -]|$)|Δ|θ/);
      expect(s.prose.split('$').length % 2, s.prose).toBe(1);
      for (const [i, tex] of s.prose.split('$').entries()) if (i % 2) expect(() => typeset(tex), tex).not.toThrow();
      // The plain line, for a title and a screen reader: the same words, with no TeX in it.
      expect(s.line, s.line).not.toMatch(/[$\\]/);
      const plain = s.prose.replace(/ \$/g, ' $').replace(/\$([^$]*)\$/g, (_, t: string) => t.replace(/\\Delta\s*/g, 'Δ').replace(/\\cos\s*/g, 'cos ').replace(/\\theta/g, 'θ').replace(/\\to\s*/g, '→').replace(/\\infty/g, '∞'));
      expect(s.line).toBe(plain);
    }
    expect(buildStages(lesson('sheet'))[1].prose).toContain(String.raw`$\Delta E$`);
  });
  it('the mirror lessons speak of mirror pieces, which hold of the middle piece too', () => {
    for (const id of ['bisector', 'infinite', 'arc', 'v-rod-bisector', 'v-arc']) {
      const line = buildStages(lesson(id))[2].line;
      expect(line, id).not.toMatch(/^Its mirror piece/);
      expect(line, id).toMatch(/[Mm]irror/);
    }
  });
});

describe('Unfold, from the board’s last line', () => {
  it('every new step typesets, and writes the move a weak-calculus reader cannot supply', () => {
    for (const s of [...SEMI_UNFOLD, ...DISK_UNFOLD, ...ARC_UNFOLD, ...AXIAL_UNFOLD]) {
      expect(() => typeset(s.tex), s.tex).not.toThrow();
      for (const [i, part] of s.text.split('$').entries()) if (i % 2) expect(() => typeset(part), part).not.toThrow();
    }
    const all = (steps: {text: string; tex: string}[]) => steps.map(s => `${s.text} ${s.tex}`).join(' ');
    expect(all(SEMI_UNFOLD)).toContain(String.raw`\int_0^{\pi/2}\sin\alpha\,d\alpha`);
    expect(all(SEMI_UNFOLD)).toContain(String.raw`$\int\sin\alpha\,d\alpha=-\cos\alpha$`);
    expect(all(SEMI_UNFOLD)).not.toMatch(/u=x\^2/);
    expect(all(DISK_UNFOLD)).toMatch(/Raise the power by one/);
    expect(all(DISK_UNFOLD)).toContain(String.raw`\right]_0^R`);
    expect(all(DISK_UNFOLD)).not.toContain('z^2+R^2');
    expect(all(ARC_UNFOLD)).toContain(String.raw`$\sin(-\varphi/2)=-\sin(\varphi/2)$`);
    expect(all(AXIAL_UNFOLD)).toContain(String.raw`$du=-dx$`);
    expect(all(AXIAL_UNFOLD)).toContain(String.raw`\int_a^{L+a}\frac{du}{u^2}`);
  });
  it('and every one is right', () => {
    const r = 1.3, z = .9, R = 2.2, a = .7, L = 3.4, phi = 2.6;
    // Semi: x dx/(x² + r²)^{3/2} is sin α dα / r, and both run to 1/r.
    expect(integral(x => x / (x * x + r * r) ** 1.5, 0, 4000, 400000)).toBeCloseTo(1 / r, 3);
    expect(integral(t => Math.sin(t), 0, Math.PI / 2)).toBeCloseTo(1, 9);
    expect(integral(t => Math.cos(t), 0, Math.PI / 2)).toBeCloseTo(1, 9);
    // Disk: ∫₀^R s ds/(s² + z²)^{3/2} = 1/z − 1/√(R² + z²).
    expect(integral(s => s / (s * s + z * z) ** 1.5, 0, R)).toBeCloseTo(1 / z - 1 / Math.hypot(R, z), 9);
    // Arc: ∫ cos θ over the arc is 2 sin(φ/2).
    expect(integral(t => Math.cos(t), -phi / 2, phi / 2)).toBeCloseTo(2 * Math.sin(phi / 2), 9);
    // Axial: ∫₀^L dx/(L + a − x)² = 1/a − 1/(L + a).
    expect(integral(x => 1 / (L + a - x) ** 2, 0, L)).toBeCloseTo(1 / a - 1 / (L + a), 7);
  });
});

describe('Prose holds a hyphenated word to its symbol, wherever it is set', () => {
  it('"the $x$-axis" with an ordinary space before it', () => {
    const html = renderToStaticMarkup(createElement(Prose, {text: 'It stands on the $x$-axis at the origin.'}));
    // The x and its "-axis" in one unbreakable run.
    expect(html).toMatch(/<span class="db-held"><span class="math db-sym"[\s\S]*?<\/span>-axis<\/span>/);
    // The words before it are left to wrap as words.
    expect(html.startsWith('It stands on the ')).toBe(true);
    // And with a no-break space, the word before is held too, as the board's remarks have it.
    expect(renderToStaticMarkup(createElement(Prose, {text: 'on the $x$-axis.'}))).toMatch(/<span class="db-held">the [\s\S]*-axis\.<\/span>$/);
  });
});
