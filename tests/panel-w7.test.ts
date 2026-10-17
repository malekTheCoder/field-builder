import {describe, expect, it} from 'vitest';
import {evaluate} from 'mathjs';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {BREAK, boardLines, resultLines, workedSteps} from '../src/workbench/derivation';
import {buildStages} from '../src/explorer/buildRun';
/* Wave seven's panel round: the answers whose brackets were split across rows, Shrink them's replacement row,
 * the rod off its middle's What cancels, the chain named in Add them up, and the words a weak student was missing --
 * how many pieces, what Σ and ∫ are, what a potential is. */
const step = (id: string, key: string) => boardLines(getProblem(id)).find(l => l.key === key)!;
const rows = (tex: string) => tex.replace(/^\\begin\{aligned\}|\\end\{aligned\}$/g, '').split(/\\\\(?:\[[^\]]*\])?/);
const K = 8.99e9, EPS0 = 1 / (4 * Math.PI * K);

describe('an answer never splits a bracket across rows', () => {
  it('every row of every answer opens as many brackets as it closes', () => {
    const opens = (r: string) => (r.match(/\\(left|bigg|Bigl|Big)[([]/g) ?? []).length + (r.match(/\\bigl\(/g) ?? []).length;
    const closes = (r: string) => (r.match(/\\(right|bigg|Bigr|Big)[)\]]/g) ?? []).length + (r.match(/\\bigr\)/g) ?? []).length;
    // The ramp's E_y is the lesson's own bracket over two rows, hung by a phantom: the content lane's to rewrite.
    for (const p of PROBLEMS.filter(q => q.id !== 'ramp')) for (const tex of resultLines(p)) for (const r of rows(tex))
      expect(opens(r.replace(/\\phantom\{[^}]*\{[^}]*\}[^}]*\}/g, '')), `${p.id}: ${r}`).toBe(closes(r));
  });
  it('the annulus is the disk of radius b minus the disk of radius a, in σ and in Q', () => {
    const [tex] = resultLines(getProblem('annulus'));
    expect(rows(tex)).toHaveLength(3);
    expect(tex).not.toMatch(/bigg/);
    expect(tex).toContain(String.raw`E_z&=\frac{2\pi k\sigma z}{\sqrt{a^2+z^2}}-\frac{2\pi k\sigma z}{\sqrt{b^2+z^2}}`);
    for (const [a, b, z, Q] of [[.5, 2, 1.3, 2], [1, 4, .2, -3], [.1, .3, 5, 1]]) {
      const sigma = Q / (Math.PI * (b * b - a * a));
      const lesson = evaluate(getProblem('annulus').result, {sigma, eps0: EPS0, a, b, z});
      const first = 2 * Math.PI * K * sigma * z / Math.hypot(a, z) - 2 * Math.PI * K * sigma * z / Math.hypot(b, z);
      const inQ = 2 * K * Q * z / ((b * b - a * a) * Math.hypot(a, z)) - 2 * K * Q * z / ((b * b - a * a) * Math.hypot(b, z));
      expect(first / lesson).toBeCloseTo(1, 10);
      expect(inQ / lesson).toBeCloseTo(1, 10);
      // And the disk of radius b minus the disk of radius a, each 2πkσ(1 − z/√(R² + z²)).
      const disk = (R: number) => 2 * Math.PI * K * sigma * (1 - z / Math.hypot(R, z));
      expect((disk(b) - disk(a)) / lesson).toBeCloseTo(1, 10);
    }
    // Unfold ends on the answer's own last rows.
    expect(workedSteps(getProblem('annulus')).worked.at(-1)!.tex).toContain(String.raw`-\frac{2kQz}{(b^2-a^2)\sqrt{b^2+z^2}}`);
  });
  it('the rod off its middle writes each end’s term whole', () => {
    const [tex] = resultLines(getProblem('offset'));
    expect(tex).not.toMatch(/bigg/);
    expect(tex).toContain(String.raw`E_x&=\frac{k\lambda y_2}{r\sqrt{y_2^2+r^2}}`);
    expect(tex).toContain(String.raw`E_y&=\frac{k\lambda}{\sqrt{y_2^2+r^2}}-\frac{k\lambda}{\sqrt{y_1^2+r^2}}`);
    const p = getProblem('offset');
    for (const [y1, y2, r, lambda] of [[-3, 1, .7, 2], [-.4, 3.6, 2, -1]]) {
      const ex = K * lambda * y2 / (r * Math.hypot(y2, r)) - K * lambda * y1 / (r * Math.hypot(y1, r));
      const ey = K * lambda / Math.hypot(y2, r) - K * lambda / Math.hypot(y1, r);
      expect(ex / evaluate(p.result, {k: K, lambda, y1, y2, r})).toBeCloseTo(1, 10);
      expect(ey / evaluate(p.secondaryResult!, {k: K, lambda, y1, y2, r})).toBeCloseTo(1, 10);
    }
  });
  it('the shell’s inside is 0 < z < R, and its note says what the answer means', () => {
    const [tex] = resultLines(getProblem('shell'));
    expect(tex).toContain('(0<z<R)');
    expect(tex).not.toMatch(/\(z<R\)/);
    for (const s of workedSteps(getProblem('shell')).worked) expect(s.tex).not.toMatch(/\(z<R\)/);
  });
});

describe('Shrink them’s replacement row', () => {
  it('holds Σ_i → ∫ in one group, with a break allowed only before the charge’s replacement', () => {
    for (const p of PROBLEMS) {
      const where = step(p.id, 'limit').where!;
      expect(where, p.id).toMatch(/^\{\\textstyle\\sum_i\\to\\int\}\\quad\\allowbreak /);
      expect(where, p.id).not.toMatch(/\\int,/);
    }
  });
  it('says the changing factors once, under the integral, and what ∫ is', () => {
    for (const p of PROBLEMS) {
      const say = step(p.id, 'limit').say!;
      expect(say, p.id).not.toMatch(/What changes from/);
      expect(say, p.id).toContain('The sign $\\int$ is a stretched S, for “sum”');
    }
    // The semi-infinite line and the sheet: the piece's width becomes dy or ds, in the row.
    expect(step('semi', 'limit').swaps!.join(' ')).toContain(String.raw`r\sec^2\alpha\,\Delta\alpha\to dy`);
    expect(step('sheet', 'limit').swaps!.join(' ')).toContain(String.raw`z\sec^2\alpha\,\Delta\alpha\to ds`);
    // The shell's integral keeps r_i, and says what it is there.
    expect(step('shell', 'limit').say).toMatch(/In the integral \$r_i\$ stands for .*the \$i\$ is gone/);
  });
});

describe('the rod off its middle’s What cancels', () => {
  it('says which pieces pair and which have none, in two short sentences', () => {
    const cancel = step('offset', 'cancel');
    expect(cancel.cancelsSay).toMatch(/^Pieces at equal heights above and below \$P\$’s level pair up\./);
    expect(cancel.cancelsSay).toContain('Past the shorter end, the longer side has extra rod with no partner');
    expect(cancel.cancelsSay).not.toMatch(/long side as the nearer end/);
    for (const s of buildStages(getProblem('offset'))) {
      expect(s.line, s.key).not.toMatch(/leftover|leans/);
      expect(s.caption, s.key).not.toMatch(/leftover|long side as the near/);
    }
  });
});

describe('Add them up names the chain', () => {
  it('never "how far it reaches" with nothing for "it"', () => {
    for (const p of PROBLEMS) {
      const say = step(p.id, 'add').say!;
      expect(say, p.id).not.toMatch(/how far it reaches/i);
      if (p.quantity === 'E' && !say.includes('already exact')) expect(say, p.id).toMatch(/chain of arrows|the chain ends/);
      // The ≈ is said of the sum, by name, in a paragraph of its own.
      if (!say.includes('already exact')) expect(say.split(BREAK).some(para => para.startsWith('The sum above is only')), p.id).toBe(true);
      // And Σ in words.
      expect(say, p.id).toMatch(/The sum \$\\sum_i\$ adds|already exact/);
    }
    expect(step('ring', 'add').say).toContain(String.raw`$k\cos\alpha/(R^2+z^2)$ comes out of the sum`);
  });
});

describe('the words a weak student was missing', () => {
  it('Cut it up says the whole is cut into N pieces', () => {
    for (const p of PROBLEMS) expect(step(p.id, 'pieces').say, p.id).toMatch(/\$N\$ (pieces|rings)/);
  });
  it('a potential is a signed scalar, and its mirror piece is named in its own step', () => {
    for (const p of PROBLEMS.filter(q => q.quantity === 'V')) {
      expect(step(p.id, 'one').say, p.id).not.toMatch(/is a number/);
      expect(step(p.id, 'cancel').nothing, p.id).not.toMatch(/^Its /);
    }
    expect(step('v-ring', 'limit').say).toContain('Nothing in $k/r_i$ changes');
  });
  it('the unit vector is said to be an arrow of length one; the hypotenuse is the long side', () => {
    expect(step('bisector', 'one').say).toContain('an arrow of length one');
    expect(step('bisector', 'one').say).toContain('the long side of the right triangle with legs $y_i$ and $r$');
  });
  it('the equal-angle Cut it up gives the width in one sentence', () => {
    for (const id of ['infinite', 'semi', 'sheet']) {
      const paras = step(id, 'pieces').say!.split(BREAK);
      expect(paras[1], id).toMatch(/^Near/);
      expect(paras[1].match(/\. /g) ?? [], id).toHaveLength(0);
    }
  });
});
