import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {evaluate} from 'mathjs';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {lessonWorking} from '../src/state/artifact';
import {BREAK, antiderivativeOf, boardLines, exactSum, partResult, resultLines, workedSteps} from '../src/workbench/derivation';
/* THE PANEL'S WAVE-TWO CLAIMS, EACH CHECKED AS ONE.
 *
 * Each case was a critic's finding: a lopsided bracket's survivor with neither its sine nor its minus
 * said; a "Part of the distribution" box with no formula in it; an exact sum said in words to need no
 * integral and never written; the disk answered in σ while its slider holds Q; an Unfold that sent the
 * sheet to another lesson, said "upper minus lower" twice on the axial rod, and skipped the steps the
 * potentials' field twins spell out; the same distance three ways on the infinite line. Where a sentence
 * makes a claim about numbers, the numbers are checked too. */
const lesson = (id: string) => getProblem(id);
const step = (id: string, key: string, bounds?: [string, string], opts: {keeps?: boolean; span?: string; oneSided?: boolean; below?: boolean} = {}) =>
  boardLines(lesson(id), bounds, opts).find(l => l.key === key)!;
const typeset = (tex: string) => katex.renderToString(tex, {throwOnError: true, strict: 'ignore', displayMode: true, trust: c => c.command === '\\htmlClass'});
const at = {k: 1.3, lambda: .8, lambda0: 1.1, sigma: .7, Q: 2.1, r: 1.4, z: 1.9, a: .6, L: 3.2, R: 1.7, phi: 2.3};

describe('a lopsided bracket says why its survivor is a sine, and why it has a minus', () => {
  const lopsided = {keeps: false, oneSided: true, below: false};
  it('on the bisector, the infinite line and the arc', () => {
    for (const [id, b] of [['bisector', ['0', 'L/2']], ['infinite', ['0', '\\pi/2']], ['arc', ['0', '\\varphi/2']]] as const) {
      const say = step(id, 'cancel', [...b], lopsided).say!;
      if (id === 'arc') expect(say, id).toContain(String.raw`Its part along $y$ is $-\Delta E\sin\theta$`);
      else expect(say, id).toMatch(/is the side opposite.*hence the minus in \$\\Delta E_y\$ below\./);
      // Its own paragraph: the cosine's sentence, then the sine's.
      expect(say.split(BREAK).length, id).toBe(2);
      // And with the whole charge, the mirror's sentence instead.
      expect(step(id, 'cancel').say, id).not.toMatch(/hence the minus|Its part along \$y\$/);
    }
    // Off-centre over the middle, the angle's sign is said too.
    expect(step('infinite', 'cancel', ['-\\pi/4', '\\pi/2'], {keeps: false, oneSided: false, below: true}).say).toMatch(/below it, where \$\\theta\$, like \$y\$, is negative/);
  });
  it('and the minus is the geometry’s: a positive piece above the axis pushes P down', () => {
    // The bisector and the infinite line: a charge q at (0, y) makes E_y = −k q y / r_i³ at P = (r, 0).
    // The arc: a charge q at R(cos θ, sin θ) makes E_y = −k q sin θ / R² at the centre.
    const k = 1, q = 1, r = 1.2, R = 2;
    for (const y of [-.9, .4, 1.7]) {
      const ri = Math.hypot(y, r);
      expect(-k * q * (y / ri) / ri ** 2).toBeCloseTo(k * q * (0 - y) / ri ** 3, 12);
    }
    for (const t of [-1, .3, 1.2]) expect(-k * q * Math.sin(t) / R ** 2).toBeCloseTo(k * q * (0 - R * Math.sin(t)) / R ** 3, 12);
  });
});

describe('the part of the distribution is a formula, not a promise of one', () => {
  it('every lesson whose last line is an integral writes its bracket between the bracket’s own ends', () => {
    for (const p of PROBLEMS) {
      const tex = partResult(p, 'y_1', 'y_2');
      if (exactSum(p)) { expect(tex, p.id).toBeUndefined(); continue; }
      expect(tex, p.id).toBeTruthy();
      // One row, or -- where E_y survives -- an aligned block whose every row ends on the same ends.
      expect(tex!, p.id).toMatch(/\\(right|Bigr|bigg)\]_\{y_1\}\^\{y_2\}(\\end\{aligned\})?$/);
      for (const row of tex!.replace(/^\\begin\{aligned\}|\\end\{aligned\}$/g, '').split(/\\\\(?:\[[^\]]*\])?(?=[A-Z])/)) expect(row, p.id).toMatch(/\]_\{y_1\}\^\{y_2\}$/);
      expect(() => typeset(tex!), p.id).not.toThrow();
      // Every logarithm of a pure number, as the lessons write theirs.
      for (const m of tex!.matchAll(/\\ln\s*(.{5})/g)) expect(m[1], p.id).toMatch(/^\\frac/);
    }
  });
  it('and what is in the bracket differentiates back to the lesson’s own integrand', () => {
    for (const p of PROBLEMS.filter(q => !exactSum(q))) {
      const F = antiderivativeOf(p)!, v = p.variable, h = 1e-5;
      for (const x of v === 'theta' ? [-.7, .2, 1.1] : [.3, 1.1, 2.4]) {
        const d = (evaluate(F, {...at, [v]: x + h}) - evaluate(F, {...at, [v]: x - h})) / (2 * h);
        expect(d / evaluate(p.kernel, {...at, [v]: x}), `${p.id} at ${v} = ${x}`).toBeCloseTo(1, 6);
      }
    }
  });
});

describe('an exact sum, done in symbols on the line that says it needs no integral', () => {
  it('the shared factor comes out and Σ ΔQ_i is Q; over part of the charge it stops at the part’s sum', () => {
    for (const p of PROBLEMS.filter(exactSum)) {
      const add = step(p.id, 'add');
      // On one row, or -- written in what every r_i is, too wide for one -- with its second "=" on the next.
      expect(add.finish, p.id).toMatch(/\\sum_i\\htmlClass\{fx fx-element\}\{\\Delta Q_i\}(\\\\(\[[\d.]+em\])?\\phantom\{[EV_z]+\}&)?=\\frac\{kQ/);
      expect(() => typeset(add.finish!), p.id).not.toThrow();
      const part = boardLines(p, ['0', p.id === 'v-arc' ? '\\varphi/4' : '\\pi'], {span: '\\pi'}).find(l => l.key === 'add')!;
      expect(part.finish, p.id).toMatch(/\\sum_i\\htmlClass\{fx fx-element\}\{\\Delta Q_i\}$/);
    }
    // k Q cos α / r_i² is the ring's answer, k Q z / (R² + z²)^{3/2}.
    const {k, Q, R, z} = at, ri = Math.hypot(R, z);
    expect(k * Q * (z / ri) / ri ** 2).toBeCloseTo(evaluate(lesson('ring').result, at), 12);
    expect(k * Q / ri).toBeCloseTo(evaluate(lesson('v-ring').result, at), 12);
  });
});

describe('the disk and its potential answer in Q too, as their slider holds it', () => {
  it('a third row puts σ = Q/(πR²) in, and the trend at fixed Q is the figure’s', () => {
    for (const id of ['disk', 'v-disk']) {
      const tex = resultLines(lesson(id))[0];
      expect(tex, id).toContain(String.raw`&=\frac{2kQ}{R^2}\left(`);
      expect(tex.indexOf('2kQ'), id).toBeGreaterThan(tex.indexOf('\\varepsilon_0'));
    }
    const Ez = (R: number, z: number, Q = 1) => 2 * Q / R ** 2 * (1 - z / Math.hypot(R, z));
    const V = (R: number, z: number, Q = 1) => 2 * Q / R ** 2 * (Math.hypot(R, z) - z);
    // The same as the σ form with σ = Q/(πR²) (k = 1).
    for (const R of [.5, 2, 4]) expect(Ez(R, 3)).toBeCloseTo(2 * Math.PI * (1 / (Math.PI * R * R)) * (1 - 3 / Math.hypot(R, 3)), 12);
    // At fixed Q both fall as R grows, while the σ forms read with σ fixed rise.
    expect(Ez(.5, 3)).toBeCloseTo(.109, 3);
    expect(Ez(4, 3)).toBeCloseTo(.05, 3);
    expect(V(.5, 3)).toBeCloseTo(.331, 3);
    expect(V(4, 3)).toBeCloseTo(.25, 3);
    for (let R = .5; R < 4; R += .25) {
      expect(Ez(R + .25, 3)).toBeLessThan(Ez(R, 3));
      expect(V(R + .25, 3)).toBeLessThan(V(R, 3));
    }
  });
  it('the rod’s potential on its axis changes one thing per "="', () => {
    const tex = resultLines(lesson('v-rod-axial'))[0];
    expect(tex).toContain(String.raw`&=\frac{kQ}{L}\ln\frac{L+a}{a}`);
    expect(tex).not.toContain('1+\\frac La');
  });
});

describe('Unfold, built once, for the page and the handout', () => {
  const all = (id: string) => {const {worked, back} = workedSteps(lesson(id)); return [...worked, ...back];};
  const text = (id: string) => all(id).map(s => s.text + ' ' + s.tex).join(' ');
  it('the handout prints the panel’s list', () => {
    for (const p of PROBLEMS) expect(lessonWorking(p), p.id).toEqual(workedSteps(p));
    expect(lessonWorking(lesson('infinite'), getProblem('infinite', 'limit'))).toEqual(workedSteps(lesson('infinite'), getProblem('infinite', 'limit')));
  });
  it('the sheet is done in its own angle, not sent to the disk', () => {
    expect(text('sheet')).not.toMatch(/Reuse|disk|sgn|\|z\|/);
    expect(text('sheet')).toContain(String.raw`2\pi k\sigma\int_0^{\pi/2}\sin\alpha\,d\alpha`);
    expect(text('sheet')).toContain(String.raw`$\int\sin\alpha\,d\alpha=-\cos\alpha$`);
    // z · z tan α · z sec²α dα / (z³ sec³α) = sin α dα.
    for (const a of [.2, .9, 1.4]) {
      const z = 1.7, s = z * Math.tan(a), ds = z / Math.cos(a) ** 2;
      expect(z * s * ds / (s * s + z * z) ** 1.5).toBeCloseTo(Math.sin(a), 12);
    }
  });
  it('the axial rod says "upper minus lower" once, and ends on the answer', () => {
    const steps = all('axial');
    for (let i = 1; i < steps.length; i++) {
      const rows = (t: string) => t.replace(/^\\begin\{aligned\}|\\end\{aligned\}$/g, '').split(/\\\\(?:\[[^\]]*\])?/).map(r => r.replace(/^[^&]*&/, ''));
      expect(rows(steps[i].tex)[0], `step ${i + 1}`).not.toBe(rows(steps[i - 1].tex).at(-1));
    }
    expect(text('axial').match(/[Uu]pper (end )?minus lower/g)).toHaveLength(1);
    expect(steps.at(-1)!.tex).toBe(String.raw`E_x=\frac{k\lambda L}{a(L+a)}=\frac{kQ}{a(L+a)}`);
  });
  it('the potentials take their constant out, do their substitution and write their bracket, as their field twins do', () => {
    expect(all('v-disk')[0].tex).toBe(String.raw`V=2\pi k\sigma\int_0^R\frac{s\,ds}{\sqrt{s^2+z^2}}`);
    expect(text('v-disk')).toContain(String.raw`\frac12\int u^{-1/2}\,du`);
    expect(text('v-disk')).toContain(String.raw`\Bigl[\sqrt{s^2+z^2}\Bigr]_0^R`);
    expect(all('v-rod-bisector')[0].tex).toBe(String.raw`V=k\lambda\int_{-L/2}^{L/2}\frac{dy}{\sqrt{y^2+r^2}}`);
    expect(all('v-rod-axial')[0].tex).toBe(String.raw`V=k\lambda\int_0^L\frac{dx}{L+a-x}`);
    expect(text('v-rod-axial')).toContain(String.raw`k\lambda\int_{L+a}^{a}\frac{-du}{u}=k\lambda\int_a^{L+a}\frac{du}{u}`);
    expect(text('v-rod-axial')).toMatch(/logarithm/);
    // The disk's potential raises its power in words, as the disk's field does.
    expect(text('v-disk')).toMatch(/Raise the power by one/);
    // Each step said once: where a lesson now carries a step the panel used to add, it is not added twice.
    for (const p of PROBLEMS) {
      const {worked, back} = workedSteps(p), seen = new Set<string>();
      for (const s of [...worked, ...back]) {
        const first = s.tex.replace(/^\\begin\{aligned\}/, '').split(/\\\\/)[0].replace(/&/g, '');
        expect(seen.has(first), `${p.id}: "${first.slice(0, 60)}" opens two steps`).toBe(false);
        seen.add(first);
      }
    }
    // The logarithm between two ends is of their quotient: ∫ from a to L + a of du/u is ln((L + a)/a).
    const a = .6, L = 3.2, n = 200000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += (L / n) / (a + (i + .5) * L / n);
    expect(sum).toBeCloseTo(Math.log((L + a) / a), 8);
  });
  it('the ramp’s E_x and the end rod’s E_y write the power rule and the bracket; the ramp folds back to its answer', () => {
    for (const id of ['ramp', 'endpoint']) {
      expect(text(id), id).toContain(String.raw`\frac12\int u^{-3/2}\,du`);
      expect(text(id), id).toMatch(/Raise the power by one/);
    }
    expect(text('endpoint')).toContain(String.raw`&=-k\lambda\left[-\frac1{\sqrt{y^2+r^2}}\right]_0^L`);
    expect(all('ramp')[0].tex).toBe(String.raw`E_x=\frac{k\lambda_0 r}{L}\int_0^L\frac{y\,dy}{(y^2+r^2)^{3/2}}`);
    const last = all('ramp').at(-1)!.tex;
    expect(last).toContain(String.raw`&=-\frac{k\lambda_0}{L}\bigg[\ln\frac{L+\sqrt{L^2+r^2}}{r}`);
    // −(kλ₀/L) ln(…) + kλ₀/√(L² + r²) is −(kλ₀/L)[ln(…) − L/√(L² + r²)].
    const {k, lambda0, L, r} = at, root = Math.hypot(L, r), lg = Math.log((L + root) / r);
    expect(-k * lambda0 / L * lg + k * lambda0 / root).toBeCloseTo(-k * lambda0 / L * (lg - L / root), 12);
  });
  it('every inherited row is in the answer’s order', () => {
    for (const p of PROBLEMS) for (const s of [...workedSteps(p).worked, ...workedSteps(p).back]) {
      expect(s.tex, p.id).not.toMatch(/r\^2\+\(L\/2\)\^2|r\^2\+L\^2|z\^2\+R\^2|\\sin\(\\varphi\/2\)/);
      expect(() => typeset(s.tex), `${p.id}: ${s.tex}`).not.toThrow();
    }
    // The infinite line's last row stacked, as its answer is.
    expect(all('infinite').at(-1)!.tex).toBe(String.raw`E_x=\frac{2k\lambda}{r}=\frac{\lambda}{2\pi\varepsilon_0r}`);
  });
});

describe('the board says what it had left unsaid', () => {
  it('why the endless charges are cut by angle', () => {
    expect(step('infinite', 'pieces').say).toMatch(/^An endless line has no last piece of equal length, but seen from.*\$P\$ it spans only half a turn/);
    expect(step('semi', 'pieces').say).toMatch(/^An endless line has no last piece of equal length, but seen from.*\$P\$ it spans only a quarter turn/);
    for (const id of ['infinite', 'semi']) expect(buildStages(lesson(id))[0].line, id).toBe('Pieces of equal angle at P: the line never ends, but its angles do.');
  });
  it('the axial rod says where its unit vector went', () => {
    expect(step('axial', 'cancel').nothing).toContain(String.raw`$\hat{\mathbf r}_i$ is the $+x$ direction for every piece and $\Delta E_x$ is the whole of $\Delta E$`);
  });
  it('the infinite line names its distance one way, the way Cut it up defines sec for', () => {
    const lines = boardLines(lesson('infinite'));
    expect(lines[1].where).toContain(String.raw`r_i=r\sec\theta`);
    expect(lines.flatMap(l => [l.tex, l.where, l.finish, l.say]).join(' ')).not.toContain(String.raw`\frac{r}{\cos\theta}`);
  });
  it('a ring’s or an arc’s potential says why a piece of any size is exact', () => {
    expect(step('v-ring', 'one').say).toContain('A piece need not be small: all of it is $r_i$ from');
    expect(step('v-arc', 'one').say).toContain('A piece need not be small: all of it is $R$ from');
    // Every point of a ring is √(R² + z²) from a point on its axis; of an arc, R from its centre.
    for (const t of [0, 1, 2.5]) expect(Math.hypot(at.R * Math.cos(t), at.R * Math.sin(t), at.z)).toBeCloseTo(Math.hypot(at.R, at.z), 12);
  });
  it('the board refuses the infinite line’s finite-rod route rather than mixing θ with y', () => {
    expect(() => boardLines(getProblem('infinite', 'limit'))).toThrow(/θ/);
  });
  it('no paragraph of a remark runs on: the longest ideas are set apart', () => {
    const plain = (t: string) => t.replace(/\$[^$]*\$/g, 'XX');
    for (const p of PROBLEMS) for (const l of boardLines(p)) for (const para of (l.say ?? '').split(BREAK))
      expect(plain(para).length, `${p.id} · ${l.key}: ${para.slice(0, 60)}`).toBeLessThan(380);
    // The three longest -- the equal-angle Cut it up -- are three paragraphs each.
    for (const id of ['infinite', 'semi', 'sheet']) expect(step(id, 'pieces').say!.split(BREAK), id).toHaveLength(3);
  });
});

describe('the run says it the same way', () => {
  it('the ring’s field gives the angle as well as the distance; its potential needs only the distance', () => {
    expect(buildStages(lesson('ring'))[0].line).toMatch(/one distance and one angle from P/);
    expect(buildStages(lesson('v-ring'))[0].line).not.toMatch(/angle/);
  });
  it('the disk’s One ring is its own idea, not Cut it up’s again', () => {
    const [cut, one] = buildStages(lesson('disk'));
    expect(cut.line).toMatch(/same distance/);
    expect(one.line).not.toMatch(/same distance/);
    expect(one.line).toMatch(/adds up at once/);
  });
  it('Shrink them’s caption gives the line’s reason, and says thinner', () => {
    for (const p of PROBLEMS) {
      const cap = buildStages(p)[4].caption;
      expect(cap, p.id).toMatch(/thinner without end/);
      expect(cap, p.id).not.toMatch(/smaller|stops depending/);
      if (!exactSum(p)) expect(cap, p.id).toMatch(/which was only nearly right, becomes exact/);
    }
  });
  it('the mirror captions speak of the pieces and their mirrors, as the lines do', () => {
    for (const id of ['bisector', 'infinite', 'arc']) {
      const cap = buildStages(lesson(id))[2].caption;
      expect(cap, id).toMatch(/^Now the mirror pieces/);
      expect(cap, id).not.toMatch(/its mirror piece/);
    }
  });
});
