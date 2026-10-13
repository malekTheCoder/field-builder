import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {evaluate} from 'mathjs';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {ARC_UNFOLD, AXIAL_UNFOLD, BREAK, DISK_UNFOLD, INFINITE_UNFOLD, RAMP_EY_UNFOLD, RAMP_UNFOLD, SEMI_UNFOLD, SHEET_UNFOLD, V_DISK_POWER, V_ROD_BISECTOR_UNFOLD, alongIntegralOf, boardLines, rodUnfold, workedSteps} from '../src/workbench/derivation';
/* THE PANEL'S WAVE-FIVE CLAIMS, EACH CHECKED AS ONE.
 *
 * Each case was a critic's finding: "opposite" meaning an angle across a crossing and then a side of a
 * triangle, two clauses apart; the i on y and α coming and going between steps; r_i defined with r and read
 * as the same thing; the sine the rods level with an end use never written in y on the board; Shrink them
 * writing only Σ → ∫ and ΔQ → dQ as maths, the swaps a student must make alone hidden in a paragraph; a
 * range "y: −L/2 → L/2" read as an equation; the disk's cancellation jumping from one ring to the whole
 * charge; the arc's R left in ink; E_y's first row set as the
 * next row of E_x's chain; Unfold's sentences opening on symbols; and the run's lines saying half a reason,
 * or an "It" with nothing to refer to. Where a sentence claims something about numbers, the numbers are
 * checked. */
const step = (id: string, key: string, bounds?: [string, string], opts: Parameters<typeof boardLines>[2] = {}) =>
  boardLines(getProblem(id), bounds, opts).find(l => l.key === key)!;
const typeset = (tex: string) => katex.renderToString(tex, {throwOnError: true, strict: 'ignore', displayMode: true, trust: c => c.command === '\\htmlClass'});
const RODS = ['bisector', 'endpoint', 'ramp'];

describe('What cancels names the angle fact it rests on', () => {
  it('"vertically opposite", in its own sentence; "opposite" alone only for a side', () => {
    for (const id of RODS) {
      const say = step(id, 'cancel').say!;
      expect(say, id).toContain('vertically opposite angles are equal');
      expect(say, id).not.toMatch(/the one opposite/);
      // And one notation for the arrow: bold for the arrow, plain for it without its direction. Its size is
      // said in One piece, with the plain letter.
      expect(say, id).not.toMatch(/of size/);
      expect(step(id, 'one').say, id).toContain(String.raw`its size is $|\Delta E|$`);
      // Short sentences: no paragraph of it runs past a few lines.
      for (const para of say.split(BREAK)) expect(para.length, `${id}: ${para}`).toBeLessThan(380);
    }
  });
});

describe('piece i is at y_i from One piece on', () => {
  it('the rods index the piece’s position and angle where they first appear, and say what r is against r_i', () => {
    expect(step('bisector', 'one').where).toContain(String.raw`r_i=\sqrt{y_i^2+r^2}`);
    expect(step('axial', 'one').where).toContain(String.raw`r_i=L+a-x_i`);
    expect(step('v-rod-bisector', 'one').where).toContain(String.raw`r_i=\sqrt{y_i^2+r^2}`);
    for (const id of [...RODS, 'v-rod-bisector']) {
      const say = step(id, 'one').say!;
      expect(say, id).toMatch(/Piece\s\$i\$ is \$y_i\$ along the rod/);
      expect(say, id).toMatch(/The letter \$r\$ with no \$i\$ is \$P\$’s own distance from the rod, the same for every piece, while \$r_i\$ changes from piece to piece and is \$r\$ only where \$y_i=0\$\./);
    }
    for (const id of RODS) {
      const cancel = step(id, 'cancel');
      expect(cancel.tex, id).toContain(String.raw`\cos\alpha_i`);
      expect(cancel.where, id).toContain(String.raw`\cos\alpha_i=\frac{r}{\sqrt{y_i^2+r^2}}`);
    }
    // The lessons cut in an angle keep their letters: their sec² cancels only while ΔQ and r_i are alike.
    expect(step('infinite', 'one').where).toContain(String.raw`r_i=r\sec\theta}`);
    expect(step('semi', 'one').say).toContain('The piece is $x$ along the line');
  });
  it('and the sine the rods level with an end build E_y with is glossed beside the cosine, and is right', () => {
    for (const id of ['endpoint', 'ramp']) {
      const cancel = step(id, 'cancel');
      expect(cancel.alsoWhere, id).toContain(String.raw`\sin\alpha_i=\frac{y_i}{\sqrt{y_i^2+r^2}}`);
      expect(cancel.also, id).toContain(String.raw`\sin\alpha_i`);
      typeset(cancel.alsoWhere!);
    }
    expect(step('semi', 'cancel').alsoWhere).toContain(String.raw`\cos\alpha=\frac{r}{\sqrt{x^2+r^2}}`);
    // ΔE_y = −k ΔQ sin α / r_i², with ΔQ = λ dy and sin α = y/√(y² + r²), is the endpoint's own E_y integrand.
    const at = {k: 1.3, lambda: .7, r: 1.4};
    for (const y of [.2, 1.1, 3.7]) {
      const built = -at.k * at.lambda / (y * y + at.r * at.r) * (y / Math.sqrt(y * y + at.r * at.r));
      expect(built).toBeCloseTo(evaluate(alongIntegralOf(getProblem('endpoint'))!.check, {...at, y}), 12);
    }
  });
});

describe('Shrink them writes every swap as maths', () => {
  it('the width, the distance and the direction, each a formula coloured like its factor', () => {
    expect(step('bisector', 'limit').swaps).toEqual([
      String.raw`\Delta y\to dy`,
      String.raw`\htmlClass{fx fx-distance}{r_i^2\to y^2+r^2}`,
      String.raw`\htmlClass{fx fx-projection}{\cos\alpha_i\to r/\sqrt{y^2+r^2}}`,
    ]);
    expect(step('disk', 'limit').swaps).toContain(String.raw`\htmlClass{fx fx-distance}{r_i^2\to s^2+z^2}`);
    expect(step('v-rod-axial', 'limit').swaps).toContain(String.raw`\htmlClass{fx fx-distance}{r_i\to L+a-x}`);
    // An exact lesson's term never changes: only the width.
    expect(step('ring', 'limit').swaps).toEqual([String.raw`\Delta \theta\to d\theta`]);
    // Cut in an angle but integrated in x and s, the width's own swap is in the charge element.
    expect(step('semi', 'limit').swaps!.some(s => s.includes('\\Delta x'))).toBe(false);
    for (const p of PROBLEMS) for (const s of step(p.id, 'limit').swaps ?? []) typeset(s);
  });
});

describe('the sum’s range, the cancellation and the exact sums', () => {
  it('the range is a range, never "y: …", and an endless end is not reached', () => {
    expect(step('bisector', 'add').where).toBe(String.raw`\htmlClass{fx fx-bounds}{{-L/2}\le y\le {L/2}}`);
    expect(step('sheet', 'add').where).toBe(String.raw`\htmlClass{fx fx-bounds}{{0}\le s<{\infty}}`);
    expect(step('infinite', 'add').where).toMatch(/<\\theta</);
    for (const p of PROBLEMS) expect(step(p.id, 'add').where, p.id).not.toContain('\\colon');
  });
  it('a ring’s bits cancel to that ring’s ΔE⊥, and every ring’s to the whole E⊥', () => {
    for (const id of ['disk', 'sheet']) expect(step(id, 'cancel').cancels, id).toContain(String.raw`\delta\mathbf E_\perp=\Delta\mathbf E_\perp=\mathbf 0\;\Rightarrow\;\mathbf E_\perp=\mathbf 0`);
    // And One ring says what δq is to ΔQ where δq first appears.
    expect(step('disk', 'one').say).toContain(String.raw`a small share of the ring’s charge, $\Delta Q=\sum\delta q$`);
  });
  it('the arc’s R is coloured as the distance it is, on two rows like the ring’s', () => {
    const finish = step('v-arc', 'add').finish!;
    expect(finish).toContain(String.raw`\frac{k}{\htmlClass{fx fx-distance}{R}}`);
    expect(finish).toContain(String.raw`\frac{kQ}{\htmlClass{fx fx-distance}{R}}`);
    expect(finish).toMatch(/^\\begin\{aligned\}/);
  });
  it('a potential’s What cancels never names a step as if it were a noun', () => {
    for (const p of PROBLEMS.filter(q => q.quantity === 'V')) expect(step(p.id, 'cancel').nothing, p.id).not.toMatch(/One (piece|ring) wrote/);
  });
});

describe('the answer and Unfold', () => {
  it('no Unfold sentence opens on a symbol, and the endpoint’s calls E_y the part along the rod', () => {
    // The panel's own steps; the lessons' own, inherited after them, are the lessons'.
    for (const s of [...rodUnfold('0', 'L'), ...INFINITE_UNFOLD, ...SEMI_UNFOLD, ...DISK_UNFOLD, ...ARC_UNFOLD, ...AXIAL_UNFOLD, ...SHEET_UNFOLD, ...RAMP_UNFOLD, ...RAMP_EY_UNFOLD, ...V_DISK_POWER, ...V_ROD_BISECTOR_UNFOLD]) expect(s.text, s.text).not.toMatch(/^\$/);
    const endpoint = workedSteps(getProblem('endpoint')).worked.map(s => s.text).join(' ');
    expect(endpoint).not.toMatch(/vertical/);
    expect(endpoint).toContain('Nothing cancels $E_y$, the part along the rod');
    expect(workedSteps(getProblem('ramp')).worked.map(s => s.text).join(' ')).not.toMatch(/vertical/);
  });
});

describe('the run’s lines', () => {
  it('say the whole reason, with a subject, in the board’s words', () => {
    for (const id of ['infinite', 'semi']) {
      const one = buildStages(getProblem(id))[1].line;
      expect(one, id).toMatch(/same \|ΔE\| at P: far ones hold more charge, but are farther\./);
    }
    for (const id of ['v-ring', 'v-arc', 'v-rod-bisector', 'v-rod-axial']) expect(buildStages(getProblem(id))[1].line, id).toBe('Each piece adds a number to the potential at P: k times its charge over its distance.');
    expect(buildStages(getProblem('ring'))[2].line).not.toMatch(/^The ring half a turn/);
    expect(buildStages(getProblem('disk'))[1].line).not.toMatch(/one angle from/);
    for (const id of ['bisector', 'infinite', 'arc']) expect(buildStages(getProblem(id))[3].line, id).toMatch(/the field at P once the pieces shrink\.$/);
  });
});
