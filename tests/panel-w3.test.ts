import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {evaluate} from 'mathjs';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {BREAK, alongAntiderivativeOf, alongIntegralOf, backLead, boardLines, exactSum, partHasAlso, partResult, resultLines, rodUnfold, workedSteps} from '../src/workbench/derivation';
/* THE PANEL'S WAVE-THREE CLAIMS, EACH CHECKED AS ONE.
 *
 * Each case was a critic's finding: the part of a charge answered in E_x alone while the board said
 * ΔE_y survives; E_y's integral set the lesson's way under a board that sets E_x's another; a bracket
 * wholly below the middle described by pieces above it; an exact sum that left r_i outside its Σ; the
 * pieces' positions never indexed, so y_i → y, the Riemann step, was nowhere; formulas separated by
 * punctuation alone; stage lines that wrapped to four lines on a phone; and an Unfold that used sec, the
 * derivative of tan and ∫sec without a word. Where a sentence claims something about numbers, the
 * numbers are checked. */
const step = (id: string, key: string, bounds?: [string, string], opts: Parameters<typeof boardLines>[2] = {}) =>
  boardLines(getProblem(id), bounds, opts).find(l => l.key === key)!;
const typeset = (tex: string) => katex.renderToString(tex, {throwOnError: true, strict: 'ignore', displayMode: true, trust: c => c.command === '\\htmlClass'});
const at = {k: 1.3, lambda: .7, lambda0: -1.1, sigma: .9, Q: 2, r: 1.4, z: 1.2, a: .8, L: 3.1, R: 1.7, phi: 2.2};
/** ΔE_y per unit of the variable, as the board writes it: the charge, over r_i², times the part's factor. */
const DE_Y: Record<string, string> = {
  bisector: '-k*lambda/(y^2+r^2)*y/sqrt(y^2+r^2)',
  endpoint: '-k*lambda/(y^2+r^2)*y/sqrt(y^2+r^2)',
  ramp: '-k*lambda0*y/L/(y^2+r^2)*y/sqrt(y^2+r^2)',
  semi: 'k*lambda/(x^2+r^2)*r/sqrt(x^2+r^2)',
  infinite: '-k*(lambda*r/cos(theta)^2)/(r^2/cos(theta)^2)*sin(theta)',
  arc: '-k*lambda*R/R^2*sin(theta)',
};
const ends = (id: string): [number, number] => ({bisector: [-at.L / 2, at.L / 2], endpoint: [0, at.L], ramp: [0, at.L], semi: [0, 1e9],
  infinite: [-Math.PI / 2, Math.PI / 2], arc: [-at.phi / 2, at.phi / 2]} as Record<string, [number, number]>)[id];

describe('the part of a charge gives E_y wherever the board says ΔE_y survives', () => {
  it('its bracket differentiates back to the board’s ΔE_y, written in the variable', () => {
    for (const [id, integrand] of Object.entries(DE_Y)) {
      const p = getProblem(id), F = alongAntiderivativeOf(p)!, v = p.variable, h = 1e-5;
      expect(F, id).toBeTruthy();
      for (const x of v === 'theta' ? [-.9, .3, 1.1] : [.2, .9, 2.3]) {
        const d = (evaluate(F, {...at, [v]: x + h}) - evaluate(F, {...at, [v]: x - h})) / (2 * h);
        expect(d / evaluate(integrand, {...at, [v]: x}), `${id} at ${v} = ${x}`).toBeCloseTo(1, 6);
      }
    }
  });
  it('between the whole charge’s ends it is the answer’s E_y -- or zero, where the mirrors cancel it', () => {
    for (const id of Object.keys(DE_Y)) {
      const p = getProblem(id), F = alongAntiderivativeOf(p)!, v = p.variable, [lo, hi] = ends(id);
      const whole = evaluate(F, {...at, [v]: hi}) - evaluate(F, {...at, [v]: lo});
      if (p.secondaryResult) expect(whole / evaluate(p.secondaryResult, at), id).toBeCloseTo(1, 6);
      else expect(Math.abs(whole), id).toBeLessThan(1e-9);
    }
  });
  it('the rods level with one end and the semi-infinite line always; the mirrored lessons only off-centre', () => {
    for (const id of ['endpoint', 'ramp', 'semi']) {
      expect(partHasAlso(getProblem(id)), id).toBe(true);
      const tex = partResult(getProblem(id), 'y_1', 'y_2')!;
      expect(tex, id).toMatch(/^\\begin\{aligned\}E_[xz]&=.*\\\\\[[\d.]+em\]E_y&=/);
      expect(() => typeset(tex), id).not.toThrow();
    }
    for (const id of ['bisector', 'infinite', 'arc']) {
      expect(partResult(getProblem(id), 'a', 'b', true), id).not.toMatch(/E_y/);
      expect(partResult(getProblem(id), 'a', 'b', false), id).toMatch(/E_y&=/);
    }
    // The ramp's second bracket is set over two rows, as its answer is, and hangs under its first term.
    expect(partResult(getProblem('ramp'), 'y_1', 'y_2')).toMatch(/\\bigg\[\\ln\\frac\{y\+\\sqrt\{y\^2\+r\^2\}\}\{r\}\\\\&\\phantom\{\{\}=-\\frac\{k\\lambda_0\}\{L\}\\bigg\[\}-\\frac\{y\}/);
  });
});

describe('E_y’s integral is set as the board sets E_x’s finished line', () => {
  it('constants inside, the d last, and its integrand is the board’s ΔE_y', () => {
    for (const id of ['endpoint', 'ramp', 'semi']) {
      const p = getProblem(id), along = alongIntegralOf(p)!, v = p.variable;
      expect(along.tex, id).toMatch(new RegExp(`^E_y=-?\\\\int_0\\^(L|\\\\infty)\\\\frac\\{k\\\\lambda.*\\}\\\\,d${v}$`));
      // E_x's finished line on the board, for the same convention.
      expect(step(id, 'limit').finish, id).toMatch(new RegExp(`\\\\,d${v}$`));
      for (const x of [.3, 1.2, 2.6]) expect(evaluate(along.check, {...at, [v]: x}) / evaluate(DE_Y[id], {...at, [v]: x}), `${id} at ${x}`).toBeCloseTo(1, 10);
      expect(() => typeset(along.tex), id).not.toThrow();
    }
  });
});

describe('the survivor’s sentence follows the bracket', () => {
  it('wholly below the middle it speaks of pieces below, which point up', () => {
    const below = step('bisector', 'cancel', ['-L/2', '0'], {keeps: false, oneSided: true, below: true, above: false}).say!;
    expect(below).toMatch(/up for a piece below the/);
    expect(below).not.toMatch(/down for a piece above/);
    const arc = step('arc', 'cancel', ['-\\varphi/2', '0'], {keeps: false, oneSided: true, below: true, above: false}).say!;
    expect(arc).toMatch(/up for a piece below the.*where \$\\theta<0\$/);
    expect(arc).not.toMatch(/\\theta>0/);
    // Across the middle, both, and that the one minus covers both.
    expect(step('infinite', 'cancel', ['-\\pi/4', '\\pi/2'], {keeps: false, oneSided: false, below: true, above: true}).say).toMatch(/down for a piece above .* and up for one below it.*covers both/);
    expect(step('arc', 'cancel', ['-\\varphi/4', '\\varphi/2'], {keeps: false, oneSided: false, below: true, above: true}).say).toMatch(/where \$\\theta>0\$, and up for one below it, where \$\\theta<0\$/);
    // And by default a bracket ending at the middle is wholly below it.
    expect(step('bisector', 'cancel', ['-L/2', '0'], {keeps: false}).say).not.toMatch(/down for a piece above/);
  });
  it('the physics: a positive piece below the axis pushes P up', () => {
    // A charge q at (0, y) makes E_y = −k q y / r_i³ at P = (r, 0): positive for y < 0.
    for (const y of [-1.5, -.2]) expect(-(y) / Math.hypot(y, 1) ** 3).toBeGreaterThan(0);
  });
});

describe('an exact sum keeps its index inside the Σ', () => {
  it('ring and ring potential: the distance comes out as what every r_i is, and the last expression is the answer', () => {
    const ring = step('ring', 'add').finish!, vring = step('v-ring', 'add').finish!;
    for (const f of [ring, vring]) expect(f.split('\\sum_i')[0] + f.split('\\sum_i')[1].replace(/^.*?\}/, ''), f).not.toMatch(/r_i/);
    expect(vring).toMatch(/=\\frac\{kQ\}\{\\htmlClass\{fx fx-distance\}\{\\sqrt\{R\^2\+z\^2\}\}\}\\end\{aligned\}$/);
    // The cosine after its fraction on every row, as every other line sets it.
    expect(ring).toMatch(/\\frac\{k\}\{[^]*?\}\}\\htmlClass\{fx fx-projection\}\{\\cos\\alpha\}\\sum_i/);
    expect(ring).toMatch(/=\\frac\{kQ\}\{\\htmlClass\{fx fx-distance\}\{R\^2\+z\^2\}\}\\htmlClass\{fx fx-projection\}\{\\cos\\alpha\}\\end\{aligned\}$/);
    expect(ring).not.toMatch(/\\frac\{k\\htmlClass/);
    expect(step('ring', 'add').say).toMatch(/every \$r_i\$ is the same, \$\\sqrt\{R\^2\+z\^2\}\$/);
    // Letter for letter, the potential's answer.
    expect(resultLines(getProblem('v-ring')).join(' ')).toContain(String.raw`\frac{kQ}{\sqrt{R^2+z^2}}`);
  });
});

describe('where piece i sits is indexed, and the rule says what becomes of it', () => {
  it('Add places piece i at y_i; Shrink writes the changing factors in y_i and turns y_i into y', () => {
    for (const p of PROBLEMS) {
      const v = p.variableTex, add = step(p.id, 'add').say!, limit = step(p.id, 'limit').say!;
      expect(add, p.id).toContain(`$${v}_i$`);
      expect(limit, p.id).toContain(`’s position $${v}_i$ becomes the integral’s $${v}$`);
    }
    expect(step('disk', 'limit').say).toContain(String.raw`$\Delta Q_i=\sigma\,2\pi s_i\,\Delta s$`);
    expect(step('bisector', 'limit').say).toContain(String.raw`$\cos\alpha_i=r/\sqrt{y_i^2+r^2}$`);
  });
});

describe('formulas are never separated by punctuation alone, and no sentence opens on a symbol', () => {
  it('in every remark on every board', () => {
    for (const p of PROBLEMS) for (const l of boardLines(p)) for (const t of [l.say, l.nothing, l.cancelsSay].filter((x): x is string => !!x)) for (const para of t.split(BREAK)) {
      expect(para, `${p.id} ${l.key}`).not.toMatch(/(^|[.!?]\s+)\$/);
      expect(para, `${p.id} ${l.key}`).not.toMatch(/\$[^$]*\$[,:;.]\s*\$[^$]*\$/);
    }
    expect(step('bisector', 'one').say).toContain(String.raw`with $k=1/(4\pi\varepsilon_0)$. Here $r_i$ is`);
    expect(step('bisector', 'one').say).toContain(String.raw`out from $y=0$, so $r_i$ is the hypotenuse`);
    expect(step('infinite', 'pieces').say).toContain(String.raw`a distance $r\sec\theta$ from`);
  });
});

describe('small marks of the setting', () => {
  it('ΔE carries the charge’s sign, said in One piece; its size is |ΔE|', () => {
    for (const id of ['bisector', 'endpoint', 'ramp', 'infinite', 'semi', 'arc', 'ring', 'axial']) expect(step(id, 'one').say, id).toMatch(/\$\\Delta E=k\\,\\Delta Q\/r_i\^2\$ is negative when the charge is/);
    expect(step('bisector', 'one').say).toContain(String.raw`its size is $|\Delta E|$`);
  });
  it('kλ is spaced one way in Shrink’s two rows', () => {
    for (const p of PROBLEMS) expect(step(p.id, 'limit').tex, p.id).not.toMatch(/\\frac\{k\\,\\htmlClass\{fx fx-element\}\{\\(lambda|sigma)/);
  });
  it('the infinite line’s merged gloss is inline; the sheet’s ring charge is grouped; the bridge is to the piece’s own length', () => {
    expect(step('infinite', 'limit').merged).not.toContain('\\frac');
    expect(step('sheet', 'pieces').tex).toContain(String.raw`\sigma\,(2\pi s)(z\sec^2\alpha\,\Delta\alpha)`);
    expect(step('semi', 'pieces').say).toMatch(/which for a piece near\s\$P\$ is nearly its own length, \$\\Delta x\$\./);
  });
  it('the axial answer makes one change per "="', () => {
    expect(resultLines(getProblem('axial'))[0]).toMatch(/\\left\(\\frac1a-\\frac1\{L\+a\}\\right\)\\\\\[[\d.]+em\]&=\\frac\{k\\lambda L\}\{a\(L\+a\)\}\\\\\[[\d.]+em\]&=\\frac\{kQ\}\{a\(L\+a\)\}/);
  });
  it('a potential’s What cancels says its line is the one above, unchanged', () => {
    for (const p of PROBLEMS.filter(q => q.quantity === 'V')) expect(step(p.id, 'cancel').nothing, p.id).toMatch(/\$\\Delta V\$ is unchanged from the step before\.$/);
  });
  it('Add says where E_y is, where the chain leans', () => {
    for (const id of ['endpoint', 'ramp', 'semi']) expect(step(id, 'add').say, id).toMatch(/How far it reaches along \$y\$ is \$E_y\$.*its integral is written with the answer, below/);
    expect(step('bisector', 'add', ['0', 'L/2'], {keeps: false}).say).toMatch(/How far it reaches along \$y\$ is \$E_y\$.*part’s answer/);
    expect(step('bisector', 'add').say).not.toMatch(/along \$y\$/);
    // And What cancels, off-centre, no longer says the integral builds E_x "alone" where the answer writes
    // E_y beside it; the ring's part, an exact sum with no bracket to write, still does.
    for (const id of ['bisector', 'infinite', 'arc']) expect(step(id, 'cancel', ['y_1', 'y_2'], {keeps: false}).nothing, id).toMatch(/builds \$E_x\$, and \$E_y\$ comes with the part’s answer\.$/);
    expect(step('ring', 'cancel', ['0', '\\pi'], {keeps: false}).nothing).toMatch(/builds \$E_z\$ alone\.$/);
  });
});

describe('the run’s lines', () => {
  it('each under ninety characters, and the mirror-pair lines are sentences', () => {
    for (const p of PROBLEMS) for (const s of buildStages(p)) expect(s.line.length, `${p.id} ${s.key}: ${s.line}`).toBeLessThanOrEqual(90);
    for (const id of ['bisector', 'infinite', 'arc']) {
      const add = buildStages(getProblem(id))[3];
      expect(add.line, id).not.toMatch(/The sum:/);
      expect(add.line, id).toMatch(/cancel; the sum runs along x/);
    }
    expect(buildStages(getProblem('ring'))[3].line).toMatch(/sum to exactly the field/);
    expect(buildStages(getProblem('ring'))[3].line).not.toMatch(/add, exactly to/);
  });
  it('the pair captions name the axis the sum runs along', () => {
    expect(buildStages(getProblem('bisector'))[3].caption).toMatch(/straight along the x-axis, perpendicular to the rod/);
    expect(buildStages(getProblem('infinite'))[3].caption).toMatch(/straight along the x-axis, perpendicular to the line/);
    // Along it, never "out": a negative charge's sum runs in toward the charge.
    for (const p of PROBLEMS) for (const s of buildStages(p)) expect(s.caption + s.line, `${p.id} ${s.key}`).not.toMatch(/\b(straight )?out along\b/);
  });
  it('a potential’s mirror caption speaks of the mirror pieces, not one the figure may not draw', () => {
    for (const id of ['v-rod-bisector', 'v-arc']) expect(buildStages(getProblem(id))[2].caption, id).not.toMatch(/its mirror piece\./i);
  });
});

describe('Unfold says what it uses', () => {
  it('the tan substitution names its angle, sec, the derivative of tan and 1 + tan² = sec²', () => {
    const text = rodUnfold('0', 'L')[1].text;
    for (const s of [String.raw`$\sec\alpha=1/{\cos\alpha}$`, String.raw`the derivative of $\tan\alpha$ is $\sec^2\alpha$`, String.raw`$1+\tan^2\alpha=\sec^2\alpha$`, String.raw`$\tan\alpha=y/r$`]) expect(text).toContain(s);
  });
  it('the ramp’s E_y in three steps, with ∫sec α dα said', () => {
    const w = workedSteps(getProblem('ramp')).worked.map(s => s.text + ' ' + s.tex).join('\n');
    expect(w).toContain(String.raw`$\int\sec\alpha\,d\alpha=\ln(\sec\alpha+\tan\alpha)$`);
    expect(w).toContain(String.raw`\int\tan^2\alpha\cos\alpha\,d\alpha`);
    expect(w).not.toContain('as for a uniform rod');
    expect(w).toContain('Evaluate it between the ends of the rod.');
    // tan²α cos α = sec α − cos α, and d/dα ln(sec α + tan α) = sec α.
    for (const a of [.2, .7, 1.2]) {
      expect(Math.tan(a) ** 2 * Math.cos(a)).toBeCloseTo(1 / Math.cos(a) - Math.cos(a), 12);
      const F = (t: number) => Math.log(1 / Math.cos(t) + Math.tan(t)), h = 1e-6;
      expect((F(a + h) - F(a - h)) / (2 * h)).toBeCloseTo(1 / Math.cos(a), 6);
    }
  });
  it('a root in the denominator is said to be a negative power, and the endpoint’s E_y has the power rule’s middle row', () => {
    for (const id of ['disk', 'ramp', 'endpoint']) expect(workedSteps(getProblem(id)).worked.map(s => s.text).join(' '), id).toContain(String.raw`$1/u^{3/2}$ is $u^{-3/2}$`);
    expect(workedSteps(getProblem('v-disk')).worked.map(s => s.text).join(' ')).toContain(String.raw`$1/\sqrt u$ is $u^{-1/2}$`);
    const endpoint = workedSteps(getProblem('endpoint')).worked.map(s => s.tex).join(' ');
    expect(endpoint).toContain(String.raw`\frac12\cdot\frac{u^{-1/2}}{-1/2}`);
  });
  it('“Every step accounted for” reaches the answer’s last row', () => {
    expect(workedSteps(getProblem('disk')).worked.at(-1)!.tex).toContain(String.raw`\frac{2kQ}{R^2}`);
    expect(workedSteps(getProblem('v-disk')).worked.at(-1)!.tex).toContain(String.raw`\frac{2kQ}{R^2}`);
    expect(workedSteps(getProblem('endpoint')).worked.map(s => s.tex).join(' ')).toContain(String.raw`&=-\frac{kQ}{L}\left(\frac1r-\frac1{\sqrt{L^2+r^2}}\right)`);
    // σ = Q/(πR²): 2πkσ is 2kQ/R².
    expect(2 * Math.PI * at.k * (at.Q / (Math.PI * at.R ** 2))).toBeCloseTo(2 * at.k * at.Q / at.R ** 2, 12);
  });
  it('no step names a stage of the run: the handout prints them, and has no run', () => {
    for (const p of PROBLEMS) for (const s of [...workedSteps(p).worked, ...workedSteps(p).back]) expect(s.text, p.id).not.toMatch(/Cut it up|One piece|One ring|What cancels|Add them up|Shrink them/);
  });
  it('differentiating back says why, first', () => {
    for (const p of PROBLEMS) expect(!!backLead(p), p.id).toBe(workedSteps(p).back.length > 0);
    expect(backLead(getProblem('v-ring'))).toContain(String.raw`$E_z=-dV/dz$`);
  });
});

describe('the board still typesets everywhere', () => {
  it('every line, every part, every bracket', () => {
    for (const p of PROBLEMS) {
      for (const l of [...boardLines(p), ...boardLines(p, ['y_1', 'y_2'], {keeps: false})]) for (const tex of [l.tex, l.finish, l.where, l.merged, l.cancels, l.also].filter((x): x is string => !!x)) expect(() => typeset(tex), p.id).not.toThrow();
      for (const tex of resultLines(p)) expect(() => typeset(tex), p.id).not.toThrow();
      if (!exactSum(p)) expect(() => typeset(partResult(p, 'y_1', 'y_2', false)!), p.id).not.toThrow();
    }
  });
});
