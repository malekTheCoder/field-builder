import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {PROBLEMS} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {ENDPOINT_UNFOLD, INFINITE_UNFOLD, boardLines, exactSum, resultLines} from '../src/workbench/derivation';
/* THE BOARD'S THIRD ROUND OF CLAIMS, EACH CHECKED AS ONE.
 *
 * Every case here was a critic's finding: a card that told the reader the mirrors were outside the
 * bracket and then that the mirror made the same ΔE_x; a ring whose "piece half a turn round" is not a
 * piece at the default five; a sheet whose one ΔE was ≈, then =, then ≈; an exact sum integrated as
 * ritual; an equal-angle lesson that never showed why every piece makes the same field; an endless
 * sheet of ever-bigger rings that never said why it adds to a finite field. Where a sentence makes a
 * claim about numbers, the numbers are checked too. */
const lesson = (id: string) => PROBLEMS.find(p => p.id === id)!;
const step = (id: string, key: string, bounds?: [string, string], opts: {keeps?: boolean; span?: string; oneSided?: boolean} = {}) =>
  boardLines(lesson(id), bounds, opts).find(l => l.key === key)!;
const typeset = (tex: string) => katex.renderToString(tex, {throwOnError: true, strict: 'ignore', displayMode: true, trust: c => c.command === '\\htmlClass'});
const words = (l: {say?: string; nothing?: string; cancelsSay?: string}) => [l.say, l.nothing, l.cancelsSay].filter(Boolean).join(' ');

describe('a bracket off the middle', () => {
  const cases = [['bisector', ['0', 'L/2']], ['infinite', ['0', '\\pi/2']], ['arc', ['0', '\\varphi/2']]] as const;
  it('never says, in the card that drops the mirrors, that the mirror makes the same ΔE_x', () => {
    for (const [id, b] of cases) {
      const cancel = step(id, 'cancel', [...b]);
      expect(cancel.say, id).not.toMatch(/mirror/);
      // On one side of the middle no mirror is inside at all: "some" said too little.
      expect(cancel.nothing, id).toMatch(/every piece’s mirror lies outside it/);
      expect(cancel.nothing, id).not.toMatch(/some pieces’ mirrors/);
      // The whole charge keeps its mirror sentence.
      expect(step(id, 'cancel').say, id).toMatch(/Its mirror piece, at \$-\\(alpha|theta)(_i)?\$, makes the same \$\\Delta E_x\$\.$/);
    }
    // Off-centre but over the middle, some mirrors are in and some out.
    const over = step('bisector', 'cancel', ['-L/4', 'L/2'], {keeps: false, oneSided: false});
    expect(over.nothing).toMatch(/not every piece’s mirror is inside it/);
    expect(over.say).not.toMatch(/mirror/);
    // The ring: half of it or less leaves the ring across every piece outside.
    // "The ring straight across every piece" read as one ring that is straight across.
    expect(step('ring', 'cancel', ['0', '\\pi'], {oneSided: true}).nothing).toMatch(/the length of ring straight across from each piece lies outside it/);
    expect(step('ring', 'cancel', ['0', '3\\pi/2'], {oneSided: false}).nothing).toMatch(/the length of ring straight across from some pieces lies outside it/);
  });
  it('the bisector’s survivor −k ΔQ sin α / r_i² takes its sign from y, and the card says so', () => {
    const cancel = step('bisector', 'cancel', ['-L/2', '0']);
    expect(cancel.say).toContain(String.raw`$\sin\alpha_i=y_i/\sqrt{y_i^2+r^2}$`);
    expect(cancel.say!.indexOf('$\\alpha$ is the angle')).toBeLessThan(cancel.say!.indexOf('is negative'));
    // A point charge q at (0, y) makes E_y = k q (0 − y)/r_i³ at P = (r, 0): with sin α = y/r_i that is
    // −k q sin α / r_i², below the axis as above it.
    const k = 1, q = 1, r = 1.3;
    for (const y of [-1.7, -.4, .6, 2.2]) {
      const ri = Math.hypot(y, r), sin = y / ri;
      expect(-k * q * sin / ri ** 2).toBeCloseTo(k * q * (0 - y) / ri ** 3, 12);
    }
  });
});

describe('the ring has no piece half a turn round at an odd N', () => {
  it('at the default five, half a turn from a piece’s middle is the cut between two pieces', () => {
    const n = 5;
    const middles = sampleDistribution('ring', DEFAULT_PARAMS, n).map(s => Math.atan2(s.position.y, s.position.x));
    const turn = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    for (const m of middles) {
      const across = turn(m + Math.PI);
      const nearest = Math.min(...middles.map(o => Math.min(Math.abs(turn(o) - across), 2 * Math.PI - Math.abs(turn(o) - across))));
      expect(nearest).toBeCloseTo(Math.PI / n, 9);
    }
  });
  it('so neither the board nor the run says there is one, on the field or the potential', () => {
    for (const id of ['ring', 'v-ring']) {
      const p = lesson(id);
      const text = [...boardLines(p).map(words), ...buildStages(p).flatMap(s => [s.line, s.caption])].join(' ');
      expect(text, id).not.toMatch(/piece (of ring )?straight across|piece half a turn|mirror piece|both go on the column/);
      expect(text, id).toMatch(/same length of ring (straight across|half a turn round)/);
    }
    expect(step('ring', 'cancel').cancelsSay).toContain(String.raw`centred at $\theta+\pi$`);
  });
});

describe('a potential with a mirror says why nothing cancels', () => {
  it('the same distance, the same sign, and a number has no sideways part', () => {
    for (const id of ['v-rod-bisector', 'v-ring', 'v-arc']) {
      const nothing = step(id, 'cancel').nothing!;
      expect(nothing, id).toMatch(/just as far away and its charge has the same sign, so it adds the same \$\\Delta V\$: nothing cancels, since a potential has no sideways part, and \$\\Delta V\$ is unchanged from the step before\.$/);
    }
  });
  it('k is defined after the "over r_i", so the dash never reads as k over r_i', () => {
    for (const p of PROBLEMS.filter(q => q.quantity === 'V')) {
      const one = step(p.id, 'one').say!;
      expect(one.indexOf('$k=1/(4\\pi\\varepsilon_0)$'), p.id).toBeGreaterThan(one.indexOf('over $r_i$, not $r_i^2$'));
      expect(one, p.id).not.toMatch(/\$k=1\/\(4\\pi\\varepsilon_0\)\$ — /);
    }
  });
});

describe('the sheet sets its one ΔE one way', () => {
  it('= in One piece and What cancels, ≈ only in Add; one Σ, over the same thin ring, in both', () => {
    const one = step('sheet', 'one'), cancel = step('sheet', 'cancel'), add = step('sheet', 'add');
    expect(one.tex).not.toContain('\\approx');
    expect(cancel.tex).not.toContain('\\approx');
    expect(add.tex).toContain('\\approx');
    const sum = String.raw`\sum\nolimits_{\text{thin ring}}`;
    expect(one.tex).toContain(sum);
    expect(cancel.cancels).toContain(sum);
    expect(one.say).not.toMatch(/hence/);
    // The disk's is the same Σ, over its own ring.
    expect(step('disk', 'one').tex).toContain(String.raw`\sum\nolimits_{\text{ring}}`);
    expect(step('disk', 'cancel').cancels).toContain(String.raw`\sum\nolimits_{\text{ring}}`);
  });
  it('the endless sheet of ever-bigger rings adds to a finite field, and Add says why', () => {
    const add = step('sheet', 'add').say!;
    expect(add).toContain(String.raw`$2\pi k\sigma\sin\alpha_i\,\Delta\alpha$`);
    // N terms, none more than 2πkσΔα: finite. That the angles stop at a right angle is Cut it up's opening
    // reason for cutting by angle at all, and is not said a second time here.
    expect(add).toMatch(/never more than \$2\\pi k\\sigma\\,\\Delta\\alpha\$, and there are \$N\$ of them, so the endless sheet still adds to a finite field/);
    expect(add).not.toMatch(/right angle/);
    expect(step('sheet', 'pieces').say).toMatch(/^An endless sheet has no last ring of equal width, but seen from.*\$P\$ its angles stop at a right angle, so it is cut into \$N\$ rings of equal angle\./);
    // k ΔQ cos α / r_i² with ΔQ = σ 2π s z sec²α Δα, s = z tan α, r_i² = z² sec²α is 2πkσ sin α Δα.
    const k = 1.7, sigma = .9, dA = .01;
    for (const z of [.5, 3, 7]) for (const a of [.1, .7, 1.4]) {
      const s = z * Math.tan(a), sec2 = 1 / Math.cos(a) ** 2, dQ = sigma * 2 * Math.PI * s * z * sec2 * dA;
      expect(k * dQ * Math.cos(a) / (z * z * sec2)).toBeCloseTo(2 * Math.PI * k * sigma * Math.sin(a) * dA, 12);
    }
    // And summed over the rings the figure draws, the terms rise, yet stay under 2πkσ.
    const terms = sampleDistribution('sheet', DEFAULT_PARAMS, 40).map(t => Math.abs(t.field.z));
    for (let i = 1; i < terms.length; i++) expect(terms[i]).toBeGreaterThan(terms[i - 1]);
  });
});

describe('the equal-angle lines show why every piece makes the same field', () => {
  it('the sec² in the charge cancels the sec² in the distance, said on One piece and glossed on Shrink them', () => {
    expect(step('infinite', 'one').say).toMatch(/the \$\\sec\^2\\alpha\$ in \$\\Delta Q\$ cancels: every piece’s \$\\Delta E\$ is \$k\\lambda\\,\\Delta\\alpha\/r\$/);
    expect(step('semi', 'one').say).toMatch(/the \$\\sec\^2\\alpha\$ in \$\\Delta Q\$ cancels: every piece’s \$\\Delta E\$ is \$k\\lambda\\,\\Delta\\alpha\/r\$/);
    expect(step('infinite', 'limit').merged).toBeTruthy();
    // k λ r sec²α Δα / (r² sec²α) = k λ Δα / r, for every α.
    const k = 2, lambda = 1.1, r = .8, d = .02;
    for (const t of [-1.4, -.3, 0, .9, 1.5]) {
      const sec2 = 1 / Math.cos(t) ** 2;
      expect(k * lambda * r * sec2 * d / (r * r * sec2)).toBeCloseTo(k * lambda * d / r, 12);
    }
  });
  it('sec is said where it first appears', () => {
    for (const [id, a] of [['infinite', 'alpha'], ['semi', 'alpha'], ['sheet', 'alpha']]) {
      // The cosine braced, so KaTeX sets no operator space after the slash: "1/ cos α" otherwise.
      expect(step(id, 'pieces').say, id).toContain(`with $\\sec\\${a}=1/{\\cos\\${a}}$`);
    }
  });
});

describe('an exact sum needs no integral, and the board says why it gets one anyway', () => {
  it('the shared factor comes out of the sum; shrinking is Δθ → dθ, and ∫dθ gives what ΣΔθᵢ gave', () => {
    for (const p of PROBLEMS.filter(exactSum)) {
      const add = step(p.id, 'add').say!, limit = step(p.id, 'limit').say!;
      expect(add, p.id).toMatch(/(is the same in every term and comes out of the sum|every \$r_i\$ is the same, .* comes out of the sum), and \$\\sum_i\\Delta Q_i\$ is the whole charge \$Q\$\. The answer needs no integral\./);
      expect(limit, p.id).toMatch(/^As \$N\\to\\infty\$ the pieces grow ever thinner: each \$\\Delta ?\\theta\$ becomes \$d\\theta\$/);
      expect(limit, p.id).toContain(String.raw`just as $\sum_i\Delta\theta_i$ did`);
      expect(limit, p.id).not.toMatch(/So the sum/);
    }
    // Bracketed, the charge in the sum is the bracket's.
    expect(step('ring', 'add', ['0', '\\pi'], {span: '\\pi'}).say).toMatch(/is the bracketed part’s charge\./);
  });
});

describe('small things said once, and said right', () => {
  it('a dragged limit named y₂ is said to be where the handle stands; an end at ∞ is "on to ∞"; nothing is "counted once"', () => {
    const add = step('ramp', 'add', ['0', 'y_2']).say!;
    expect(add).toContain('Here $y_2$ is where the bracket’s handle stands on the figure.');
    expect(step('bisector', 'add', ['y_1', 'y_2']).say).toContain('Here $y_1$ and $y_2$ are where the bracket’s handles stand on the figure.');
    const semi = step('semi', 'add', ['r', '\\infty']).say!;
    expect(semi).toContain('from $y=r$ on to $\\infty$');
    expect(semi).not.toContain('y=\\infty');
    for (const p of PROBLEMS) expect(boardLines(p, ['a', 'b']).map(words).join(' '), p.id).not.toMatch(/counted once/);
  });
  it('r_i’s index is said where r_i first appears', () => {
    for (const p of PROBLEMS) expect(step(p.id, 'one').say, p.id).toMatch(/the \$i\$ numbers the (piece|ring)s/);
  });
  it('the ramp’s density is set one way, and λ₀ is said to be the density at the top', () => {
    const lines = boardLines(lesson('ramp'));
    const tex = lines.flatMap(l => [l.tex, l.where, l.finish]).join(' ') + lines.map(words).join(' ');
    expect(tex).not.toMatch(/\\frac\{y\}\{L\}|\\lambda_0 y\/L/);
    expect(lines[0].tex).toContain(String.raw`\lambda_0\,(y/L)\,\Delta y`);
    expect(lines[0].where).toContain(String.raw`\lambda(y)=\lambda_0\,(y/L)`);
    expect(lines[0].say).toMatch(/rising from zero at \$y=0\$ to \$\\lambda_0\$ at the top, \$y=L\$/);
  });
  it('Cut it up is one element, so a lit chip never pinches its "="', () => {
    // ≈ where the piece's charge is the density at its middle times its length only nearly (the uneven semicircle's).
    for (const p of PROBLEMS) expect(step(p.id, 'pieces').tex, p.id).toMatch(/^\\htmlClass\{fx fx-element\}\{\\Delta Q(=|\\approx )/);
  });
  it('every cancellation ends on what it means for the whole field, and its symbols are named in a sentence', () => {
    for (const id of ['ring', 'disk', 'sheet']) expect(step(id, 'cancel').cancels, id).toMatch(/\\Rightarrow\\;\\mathbf E_\\perp=\\mathbf 0$/);
    for (const id of ['bisector', 'infinite', 'arc']) expect(step(id, 'cancel').cancelsSay, id).toMatch(/^A piece’s part .* is \$\\Delta E_y\$; its mirror piece makes \$-\\Delta E_y\$\.$/);
  });
});

describe('the answer in one rhythm, in the board’s order', () => {
  it('every result of more than one row is one aligned block, its equality rows a gap apart', () => {
    for (const id of ['bisector', 'endpoint', 'ramp', 'semi', 'disk', 'v-disk']) {
      const lines = resultLines(lesson(id));
      expect(lines, id).toHaveLength(1);
      expect(lines[0], id).toMatch(/^\\begin\{aligned\}/);
      // Every row that starts a new equality follows a gapped break.
      const rows = lines[0].replace(/^\\begin\{aligned\}|\\end\{aligned\}$/g, '').split(/\\\\(?:\[[^\]]*\])?/);
      const breaks = [...lines[0].matchAll(/\\\\(\[[^\]]*\])?/g)].map(m => m[1] ?? '');
      rows.slice(1).forEach((row, i) => { if (/^(E_[xyz]|\|\\mathbf E\||V)?&=/.test(row)) expect(breaks[i], `${id} row ${i + 2}`).not.toBe(''); });
      expect(() => typeset(lines[0]), id).not.toThrow();
    }
  });
  it('the terms come in the order of the board’s last line', () => {
    expect(resultLines(lesson('bisector'))[0]).toContain('(L/2)^2+r^2');
    expect(resultLines(lesson('endpoint'))[0]).toContain('L^2+r^2');
    for (const id of ['disk', 'v-disk']) {
      expect(resultLines(lesson(id))[0], id).toContain('R^2+z^2');
      expect(resultLines(lesson(id))[0], id).not.toContain('z^2+R^2');
    }
  });
});

describe('Unfold starts from the board’s own last line', () => {
  it('the infinite line in α, with kλ/r taken out and ∫cos α dα written', () => {
    expect(INFINITE_UNFOLD[0].tex).toBe(String.raw`E_x=\frac{k\lambda}{r}\int_{-\pi/2}^{\pi/2}\cos\alpha\,d\alpha`);
    expect(INFINITE_UNFOLD.map(s => s.text).join(' ')).toContain(String.raw`$\int\cos\alpha\,d\alpha=\sin\alpha$`);
    expect(INFINITE_UNFOLD.map(s => s.tex).join(' ')).not.toMatch(/dy|y\^2/);
  });
  it('the rod level with one end takes the bisector’s four steps between 0 and L, then evaluates', () => {
    expect(ENDPOINT_UNFOLD[0].tex).toContain('\\int_{0}^{L}');
    expect(ENDPOINT_UNFOLD.map(s => s.tex).join(' ')).toContain(String.raw`r^2(\tan^2\alpha+1)=r^2\sec^2\alpha`);
    expect(ENDPOINT_UNFOLD.at(-1)!.tex).toContain(String.raw`\right]_0^L`);
    for (const s of [...ENDPOINT_UNFOLD, ...INFINITE_UNFOLD]) expect(() => typeset(s.tex)).not.toThrow();
  });
});

describe('the run', () => {
  it('a line goes on from its stage’s name instead of saying its verb again', () => {
    for (const p of PROBLEMS) for (const s of buildStages(p)) {
      const verb = s.name.split(' ')[0];
      expect(s.line, `${p.id} · ${s.name}: "${s.line}"`).not.toMatch(new RegExp(`^${verb}\\b`, 'i'));
    }
  });
  it('a disk’s and a sheet’s rings stay rings from Add them up on', () => {
    for (const id of ['disk', 'sheet', 'v-disk']) {
      const stages = buildStages(lesson(id));
      for (const s of stages.slice(1)) for (const text of [s.line, s.caption]) expect(text, `${id} · ${s.key}: "${text}"`).not.toMatch(/\bpiece/);
    }
  });
  it('the ring’s One piece says the piece is drawn as a point charge, and only its axial part is exact', () => {
    // At three pieces a piece is a third of the ring: its sideways field is sin(60°)/(π/3) = 0.83 of the
    // point charge's, so its own field leans closer to the axis than the drawn arrow does.
    const chord = Math.sin(Math.PI / 3) / (Math.PI / 3);
    expect(chord).toBeLessThan(.85);
    const one = buildStages(lesson('ring'))[1];
    expect(one.line).toMatch(/point charge/);
    expect(one.line).toMatch(/exact at any size/);
    expect(one.caption).toMatch(/leans a little closer to the axis/);
  });
});
