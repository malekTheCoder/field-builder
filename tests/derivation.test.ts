import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {evaluate} from 'mathjs';
import {PROBLEMS} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {K} from '../src/distributions/constants';
import {BISECTOR_UNFOLD, boardLines, componentOf, exactSum, factorsOf, resultLines} from '../src/workbench/derivation';
/* THE DERIVATION BOARD, CHECKED AS ALGEBRA.
 *
 * The board's TeX is written by hand, because generated TeX is unreadable -- which means nothing
 * but a check like this stands between a typo and a student copying a wrong factor into their
 * notes. Each lesson's factors are written a second time as expressions, beside the TeX, and here
 * they are multiplied together and compared with the lesson's OWN integrand: the kernel the
 * physics tests already verify against independent quadrature. A wrong sign, a missing Jacobian,
 * the cosine of the wrong angle -- each changes the product, at almost every point. */
const trust = (context: {command: string}) => context.command === '\\htmlClass';
const typeset = (tex: string) => katex.renderToString(tex, {throwOnError: true, trust, strict: 'ignore', displayMode: true});
/** A random point inside every lesson's domain at once. Seeded, so a failure reproduces. */
function points(n: number) {
  let seed = 12345;
  const rand = (lo: number, hi: number) => { seed = (seed * 16807) % 2147483647; return lo + (hi - lo) * seed / 2147483647; };
  return Array.from({length: n}, () => {
    const L = rand(1, 8), R = rand(.5, 4);
    return {k: rand(.5, 9), lambda: rand(-5, 5), lambda0: rand(-5, 5), sigma: rand(-5, 5), Q: rand(-5, 5),
      r: rand(.5, 6), z: rand(.5, 6), a: rand(.5, 6), L, R, x: rand(0, L), y: rand(-L, L), s: rand(0, R),
      theta: rand(-1.4, 1.4), phi: rand(.2, 6.2)};
  });
}
/** What changes from piece to piece in each lesson's sum, and what the shrink line writes it as in
 * the lesson's variable: the TeX the board writes, and the same thing as an expression, checked
 * against the lesson's own distance or direction. A ring's bits are all one distance away at one
 * angle and an arc's pieces all R away, and the infinite line's charge and cosine are already in θ:
 * there nothing more is written. */
type Swap = [tex: string, expr: string, against: 'distance^2' | 'distance' | 'projection' | 'none'];
const ROD_SWAPS: Swap[] = [[String.raw`r_i^2=y^2+r^2`, 'y^2+r^2', 'distance^2'], [String.raw`\cos\alpha_i=r/\sqrt{y^2+r^2}`, 'r/sqrt(y^2+r^2)', 'projection']];
const RING_SWAPS: Swap[] = [[String.raw`r_i^2=s^2+z^2`, 's^2+z^2', 'distance^2'], [String.raw`\cos\alpha_i=z/\sqrt{s^2+z^2}`, 'z/sqrt(s^2+z^2)', 'projection']];
const RING_CHARGE: Swap = [String.raw`\Delta Q_i=\sigma\,2\pi s\,\Delta s`, 'sigma*2*pi*s', 'none'];
const SWAPS: Record<string, Swap[]> = {
  bisector: ROD_SWAPS, endpoint: ROD_SWAPS,
  ramp: [[String.raw`\lambda(y)=\lambda_0\,(y/L)`, 'lambda0*y/L', 'none'], ...ROD_SWAPS],
  axial: [[String.raw`r_i^2=(L+a-x)^2`, '(L+a-x)^2', 'distance^2']],
  infinite: [[String.raw`r_i^2=r^2\sec^2\theta`, 'r^2/cos(theta)^2', 'distance^2']],
  semi: [[String.raw`r_i^2=x^2+r^2`, 'x^2+r^2', 'distance^2'], [String.raw`\sin\alpha_i=x/\sqrt{x^2+r^2}`, 'x/sqrt(x^2+r^2)', 'none']],
  ring: [], arc: [], 'v-ring': [], 'v-arc': [],
  disk: [RING_CHARGE, ...RING_SWAPS], sheet: RING_SWAPS,
  'v-disk': [RING_CHARGE, [String.raw`r_i=\sqrt{s^2+z^2}`, 'sqrt(s^2+z^2)', 'distance']],
  'v-rod-bisector': [[String.raw`r_i=\sqrt{y^2+r^2}`, 'sqrt(y^2+r^2)', 'distance']],
  'v-rod-axial': [[String.raw`r_i=L+a-x`, 'L+a-x', 'distance']],
};
/** Every remark on a board, in words: its sentences and, where nothing cancels, that sentence. */
const remarks = (l: {say?: string; nothing?: string}) => [l.say, l.nothing].filter((t): t is string => !!t);
const close = (got: number, want: number, what: string) =>
  expect(Math.abs(got - want), `${what}: ${got} vs ${want}`).toBeLessThanOrEqual(1e-10 * Math.max(1, Math.abs(want)));
const lesson = (id: string) => PROBLEMS.find(x => x.id === id)!;
const step = (id: string, key: string, bounds?: [string, string], keeps?: boolean) =>
  boardLines(lesson(id), bounds, keeps === undefined ? {} : {keeps}).find(l => l.key === key)!;
describe('the derivation board', () => {
  for (const p of PROBLEMS) {
    const lines = boardLines(p), f = factorsOf(p), scalar = p.quantity === 'V';
    it(`${p.id}: one line per stage of the run, in the run's order`, () => {
      expect(lines.map(l => l.key)).toEqual(buildStages(p).map(s => s.key));
    });
    it(`${p.id}: every line and every result typesets`, () => {
      for (const l of lines) for (const tex of [l.tex, l.where, l.finish, l.merged, l.cancels, l.also]) if (tex) expect(() => typeset(tex), `${l.key}: ${tex}`).not.toThrow();
      // The symbols inside a remark in words, which are set as math between its dollar signs.
      for (const l of lines) for (const text of remarks(l)) for (const [i, part] of text.split('$').entries()) if (i % 2) expect(() => typeset(part), `${l.key} say: ${part}`).not.toThrow();
      for (const tex of resultLines(p)) expect(() => typeset(tex), tex).not.toThrow();
    });
    it(`${p.id}: words are set as words, never as \\text inside a gloss`, () => {
      // KaTeX never breaks a \text{} run, and sets it in Computer Modern beside the panel's prose:
      // "for every bit of the ring" and "θ: the piece's angle at P" both ran that way.
      // (A label under a sum, like the ring or the sheet's thin ring, is a label and not a sentence.)
      const label = (tex: string) => tex.replace(/\\sum\\nolimits_\{\\text\{[^}]*\}\}/g, '');
      for (const l of lines) for (const tex of [l.where, l.cancels, l.also, l.merged]) if (tex) expect(label(tex), `${l.key}: ${tex}`).not.toMatch(/\\text\{[^}]*[\s:][^}]*\}/);
      // And a remark's words carry no raw TeX: every symbol in one sits between its dollar signs.
      for (const l of lines) for (const text of remarks(l)) {
        expect(text.split('$').length % 2, `${l.key}: unbalanced $ in "${text}"`).toBe(1);
        for (const [i, part] of text.split('$').entries()) if (!(i % 2)) expect(part, `${l.key}: "${text}"`).not.toMatch(/\\[a-zA-Z]/);
      }
    });
    it(`${p.id}: no line of words starts with a dash`, () => {
      // Set with ordinary spaces either side, an em dash was broken before as readily as after, and a
      // line of the panel began "— λ(y), r_i and cos α_i —". The space before one never breaks.
      for (const l of lines) for (const text of remarks(l)) expect(text, `${l.key}: "${text}"`).not.toMatch(/[ \t]—/);
      for (const s of buildStages(p)) for (const text of [s.line, s.caption]) expect(text, `${s.key}: "${text}"`).not.toMatch(/[ \t]—/);
    });
    it(`${p.id}: the first line says what the density is and how much charge a piece holds`, () => {
      const pieces = lines.find(l => l.key === 'pieces')!;
      expect(pieces.say, p.id).toMatch(/charge per unit (length|area)/);
    });
    it(`${p.id}: the limits are said where they first appear, as where the pieces are and where they run`, () => {
      // "The limits are where the charge starts and ends in the variable you sum over" sat under a
      // sum over i, not over y, and a reader looked for y under the Σ. The pieces are counted by i
      // and placed by the variable: so the sentence names the variable and both ends in it.
      const add = lines.find(l => l.key === 'add')!.say!;
      const v = p.variableTex;
      expect(add, p.id).toMatch(new RegExp(`^Each (piece|ring) sits at its own (angle |radius )?\\$${v.replace(/\\/g, '\\\\')}\\$`));
      expect(add, p.id).toContain(`$${v}=${p.boundTex[0]}$`);
      expect(add, p.id).toContain(p.boundTex[1] === '\\infty' ? 'on to $\\infty$' : `$${v}=${p.boundTex[1]}$`);
      // How many there are is N, the Pieces slider, which Shrink them sends to infinity.
      expect(add, p.id).toMatch(/the \$N\$ (piece|ring)s, numbered by \$i\$/);
      expect(add, p.id).not.toMatch(/variable you sum over/);
      // Dragging the brackets says which pieces are now counted, not the whole charge's ends.
      const dragged = boardLines(p, ['a', 'b']).find(l => l.key === 'add')!.say!;
      expect(dragged, p.id).toContain(`from $${v}=a$ to $${v}=b$`);
      expect(dragged, p.id).toMatch(/bracketed/);
      // "So each of them is counted once" went from the whole charge's sentence as redundant, and from
      // the bracket's too.
      expect(dragged, p.id).not.toMatch(/counted once/);
    });
    it(`${p.id}: the add line says what the sum is, and why it is only nearly the answer -- or that it is already exact`, () => {
      const add = lines.find(l => l.key === 'add')!;
      if (exactSum(p)) {
        expect(add.tex, p.id).not.toContain('\\approx');
        expect(add.say, p.id).toMatch(/already exact/);
      } else {
        expect(add.tex, p.id).toContain('\\approx');
        expect(add.say, p.id).toMatch(/only \$\\approx\$: (each (piece is still treated as a point charge|ring is still treated as one thin ring|ring is \$\\Delta s\$ wide, but all its charge is counted at one radius)|every bit of a piece is \$R\$ from)/);
        // The figure's chain -- or, where the run adds the pieces in mirror pairs, those pairs.
        expect(add.say, p.id).toMatch(scalar ? /column/ : /chain|mirror pairs/);
      }
    });
    it(`${p.id}: the last line writes the rule -- what changes from piece to piece, written in the variable`, () => {
      // The one step a student has to make alone to set up the next integral, which the board made
      // silently, and then named without writing: r_i² = y² + r², cos α_i = r/√(y² + r²).
      const limit = lines.find(l => l.key === 'limit')!.say!;
      expect(limit, p.id).toContain(`integral over $${p.variableTex}$`);
      const swaps = SWAPS[p.id];
      for (const [tex] of swaps) expect(limit, `${p.id}: ${tex}`).toContain(`$${tex}$`);
      // The factors it names are the ones the sum above it indexes.
      const sum = lines.find(l => l.key === 'add')!.tex;
      for (const [tex] of swaps) {
        const name = tex.split('=')[0];
        if (/_i/.test(name) && !name.startsWith('r_i')) expect(sum, `${p.id}: ${name}`).toContain(name);
      }
      // And each one is what it says: the lesson's own distance and direction.
      for (const at of points(10)) for (const [tex, expr, against] of swaps) {
        if (against === 'none') continue;
        const want = against === 'projection' ? Math.abs(evaluate(p.projection, at)) : evaluate(p.distance, at) ** (against === 'distance^2' ? 2 : 1);
        close(Math.abs(evaluate(expr, at)), want, `${p.id} ${tex}`);
      }
      expect(limit, p.id).toMatch(/changes from (piece to piece|ring to ring)/);
      // And what shrinking is, on the board, not only in a note: N → ∞, and where the lesson is cut in
      // its own variable, Δv → dv. The step named Shrink them never said the pieces got thinner -- nor,
      // on the exact lessons, did it ever: they said only that the term never changes, and credited the
      // integral to that.
      expect(limit, p.id).toMatch(/^Make the (piece|ring)s thinner without end, \$N\\to\\infty\$/);
      if (p.id !== 'semi' && p.id !== 'sheet') expect(limit, p.id).toContain(`$\\Delta ${p.variableTex}$ becomes $d${p.variableTex}$`);
      // "Write … in y" is "in terms of y", as a student is taught to say it.
      expect(limit, p.id).not.toMatch(/written in \$/);
    });
    it(`${p.id}: the factors multiply to the lesson's own integrand`, () => {
      for (const at of points(40)) {
        const dq = evaluate(f.dq, at), r = evaluate(f.r, at), dir = evaluate(f.dir, at);
        const built = scalar ? at.k * dq / r : at.k * dq * dir / (r * r);
        close(built, evaluate(p.kernel, at), `${p.id} at ${JSON.stringify(at)}`);
      }
    });
    it(`${p.id}: the distance and the charge are the lesson's own`, () => {
      for (const at of points(20)) {
        close(evaluate(f.r, at), evaluate(p.distance, at), `${p.id} distance`);
        // The lesson writes its charge element per unit of its own coordinate. The infinite line
        // is integrated in the angle, so its dy carries the Jacobian of y = r tan θ.
        const per = {dx: 1, dy: p.id === 'infinite' ? at.r / Math.cos(at.theta) ** 2 : 1, ds: 1, dtheta: 1};
        close(evaluate(f.dq, at), evaluate(p.dq, {...at, ...per}), `${p.id} charge element`);
      }
    });
    it(`${p.id}: a potential has no direction factor, and a field has the one its figure draws`, () => {
      const text = lines.map(l => [l.tex, l.where, l.finish].join(' ')).join(' ');
      if (scalar) {
        expect(f.dir).toBe('1');
        expect(text).not.toContain('fx-projection');
        expect(text).not.toMatch(/\\cos/);
        return;
      }
      // The semi-infinite line builds E_x, the component along the line, whose factor is not the
      // lesson's authored `projection` (that one is E_y's). Every other lesson's factor is it.
      if (p.id !== 'semi') for (const at of points(10)) close(Math.abs(evaluate(f.dir, at)), Math.abs(evaluate(p.projection, at)), `${p.id} direction`);
      // The rod seen end-on has nothing to project: every piece already pushes along the axis.
      if (p.id === 'axial') expect(lines[2].tex).not.toContain('fx-projection');
      else expect(lines[2].tex).toContain('fx-projection');
    });
    it(`${p.id}: the answer names the component the board built`, () => {
      expect(resultLines(p)[0].replace(/^\\begin\{aligned\}/, '').trim()).toMatch(new RegExp('^' + componentOf(p).replace('_', '_')));
    });
    it(`${p.id}: each line carries the factor its stage puts in`, () => {
      const at = (key: string) => lines.find(l => l.key === key)!;
      expect(at('pieces').tex).toContain('fx-element');
      expect(at('one').where).toContain('fx-distance');
      expect(at('add').where).toContain('fx-bounds');
      for (const term of ['element', 'distance', 'bounds']) expect(at('limit').tex, term).toContain(`fx-${term}`);
    });
    it(`${p.id}: set as a book sets it -- r_i² stacked and coloured, the sign before Σ and ∫, one space before cos`, () => {
      const text = lines.map(l => [l.tex, l.cancels, l.also, l.finish].join(' ')).join(' ');
      // The square inside the distance's group, never hung off it in black.
      expect(text, p.id).not.toContain('{r_i}^{2}');
      if (!scalar) expect(text, p.id).toContain(String.raw`\htmlClass{fx fx-distance}{r_i^{2}}`);
      // KaTeX spaces an operator itself; an explicit \, before a coloured cos or sin doubled it.
      expect(text, p.id).not.toMatch(/\\,\\htmlClass\{fx fx-projection\}\{\\(cos|sin)/);
      // −Σ and −∫, not Σ − and ∫ −.
      expect(text, p.id).not.toMatch(/\\sum_i\s*-|\\int_\{[^}]*\}\^\{[^}]*\}-|\\int_\{\\htmlClass\{fx fx-bounds\}\{[^}]*\}\}\^\{\\htmlClass\{fx fx-bounds\}\{[^}]*\}\}-/);
      // And the range's colon is punctuation, not a relation.
      expect(lines.find(l => l.key === 'add')!.where, p.id).toContain('\\colon');
    });
    it(`${p.id}: What cancels answers its own question -- the cancellation, or why nothing cancels`, () => {
      const cancel = lines.find(l => l.key === 'cancel')!;
      expect(!!cancel.cancels !== !!cancel.nothing, `${p.id}: exactly one of the two`).toBe(true);
      if (cancel.nothing) expect(cancel.nothing, p.id).toMatch(/nothing (sideways )?(to )?cancel|nothing cancels/i);
    });
  }
  it('the equal-angle lessons give each piece the point charge the figure draws, so the sum on the board stays finite', () => {
    // Cut at equal angles, the outermost piece never ends. ΔQ = λΔy made the board's sum infinite at
    // every N; what the figure gives a piece is the point charge at its middle angle, λ r sec²θ Δθ,
    // and so does the board now. It is a definition of the stand-in, not "≈" of the piece's charge.
    for (const [id, tex, where, bracket] of [
      ['infinite', String.raw`\lambda r\sec^2\theta\,\Delta\theta`, String.raw`y=r\tan\theta`, String.raw`$\Delta y$`],
      ['semi', String.raw`\lambda r\sec^2\alpha\,\Delta\alpha`, String.raw`x=r\tan\alpha`, String.raw`$\Delta x$`],
      ['sheet', String.raw`\sigma\,2\pi s\,z\sec^2\alpha\,\Delta\alpha`, String.raw`s=z\tan\alpha`, String.raw`$\Delta s$`],
    ] as const) {
      const pieces = step(id, 'pieces');
      expect(pieces.tex, id).toContain(tex);
      expect(pieces.tex, id).not.toContain('\\approx');
      expect(pieces.where, id).toContain(where);
      // A definition, said as one -- and "the outermost's, which never ends" no longer reads as the
      // outermost's FIELD never ending.
      expect(pieces.say, id).toMatch(/\$\\Delta Q\$ stands for .* whose field at.*is nearly the (piece|ring)’s, even for the outermost (piece|ring), which never ends\./);
      // The figure brackets the piece in the lesson's own coordinate, and the board says how its
      // r sec²θ Δθ relates to that bracket: nearly it, near P.
      expect(pieces.say, id).toContain(`nearly the ${id === 'sheet' ? 'width' : 'length'} ${bracket} bracketed on the figure`);
    }
    // The figure's own pieces: the stand-in charge at each middle angle, to the last digit.
    const n = 5, P = DEFAULT_PARAMS, d = P.distance, q = P.charge * 1e-9;
    sampleDistribution('infinite', P, n).forEach((s, i) => {
      const theta = ((i + .5) / n) * Math.PI - Math.PI / 2;
      close(s.dq, q * d / Math.cos(theta) ** 2 * (Math.PI / n), `infinite piece ${i + 1}`);
    });
    sampleDistribution('sheet', P, n).forEach((s, i) => {
      const alpha = ((i + .5) / n) * Math.PI / 2, a = Math.abs(d);
      close(s.dq, q * 2 * Math.PI * a * Math.tan(alpha) * a / Math.cos(alpha) ** 2 * (Math.PI / 2 / n), `sheet ring ${i + 1}`);
    });
    // And the board's sum of them is the figure's chain: finite, and the field to within the cut.
    const board = sampleDistribution('infinite', P, n).reduce((sum, s, i) => {
      const theta = ((i + .5) / n) * Math.PI - Math.PI / 2, ri = d / Math.cos(theta);
      return sum + K * s.dq * Math.cos(theta) / ri ** 2;
    }, 0);
    expect(Number.isFinite(board)).toBe(true);
    close(board, sampleDistribution('infinite', P, n).reduce((x, s) => x + s.field.x, 0), 'the board’s sum is the chain');
    // The limit brings in the lesson's own element, exactly.
    expect(step('infinite', 'limit').where).toContain('dQ=\\lambda r\\sec^2\\theta\\,d\\theta');
  });
  it('the angle is said in words in the first line that uses it', () => {
    // y = r tan θ and a sec² arrived in the first line of the infinite line with θ said two steps
    // later; α arrived in What cancels with no word for it at all.
    for (const p of PROBLEMS.filter(q => q.quantity === 'E' && q.id !== 'axial')) {
      const angle = p.id === 'infinite' || p.id === 'arc' ? '\\theta' : '\\alpha';
      const lines = boardLines(p);
      const uses = (tex?: string) => !!tex && tex.replace(/\\Delta\\(theta|alpha)/g, '').includes(angle);
      const first = lines.findIndex(l => [l.tex, l.where, l.finish, l.cancels, l.also].some(uses));
      expect(first, p.id).toBeGreaterThan(-1);
      // Said in that line's remark, or in an earlier one's: the arc's θ is said on its first line now.
      expect(lines.slice(0, first + 1).flatMap(remarks).join(' '), `${p.id}: ${lines[first].key}`).toContain(`$${angle}$ is `);
    }
    const say = (id: string) => step(id, 'cancel').say!;
    expect(say('bisector')).toMatch(/the side next to/);
    expect(say('endpoint')).toContain(String.raw`$\Delta E\sin\alpha$, is the side opposite`);
    for (const id of ['endpoint', 'ramp', 'semi', 'arc']) expect(say(id), id).toMatch(/hence the minus|\$-\\Delta E\\cos\\theta\$/);
    expect(step('semi', 'pieces').say).toMatch(/from the perpendicular to the line/);
    expect(say('semi')).toContain(String.raw`$\Delta E\sin\alpha$, the side opposite`);
    expect(step('ring', 'cancel').cancelsSay).toContain(String.raw`$\theta+\pi$`);
    expect(step('ring', 'cancel').cancelsSay).toContain(String.raw`$-\Delta\mathbf E_\perp$`);
    // The arc says where θ is measured from -- on its first line, where θ first appears -- and why its
    // part along x is minus the cosine.
    expect(step('arc', 'pieces').say).toMatch(/^\$\\theta\$ is a piece’s angle round the arc from the.*\$x\$-axis, its line of symmetry/);
    expect(say('arc')).toMatch(/back through/);
    // θ and φ on a ring's or an arc's first line, said there: on the potentials they were never said.
    for (const id of ['ring', 'v-ring', 'arc', 'v-arc']) expect(step(id, 'pieces').say, id).toMatch(/^\$\\theta\$ is a piece’s angle round the (ring|arc)/);
    for (const id of ['arc', 'v-arc']) expect(step(id, 'pieces').say, id).toContain(String.raw`$\varphi$ is the whole arc’s angle`);
    // Bold is the arrow and plain its size, said where the plain one first appears.
    for (const id of ['bisector', 'endpoint', 'ring', 'infinite', 'semi', 'arc']) expect(say(id), id).toMatch(/\$\\Delta\\mathbf E\$, of size \$\\Delta E\$/);
    // "Hence the minus" points at the line that has it: the line above the sentence has none.
    for (const id of ['endpoint', 'ramp']) expect(say(id), id).toContain(String.raw`hence the minus in $\Delta E_y$ below`);
    // The infinite line says why its part along x is ΔE cos θ.
    // Along the line of sight, named as a line: r_i is a distance on this board.
    expect(say('infinite')).toMatch(/lies along the line of sight to the piece, so its part along \$x\$ is \$\\Delta E\\cos\\theta\$/);
    for (const id of ['bisector', 'endpoint', 'ramp', 'ring', 'disk', 'infinite', 'semi']) expect(say(id), id).not.toMatch(/between \$r_i\$ and|lies along \$r_i\$/);
    // A disk's ring adds up to its charge, ΔQ = Σδq, times one factor; the sheet's only nearly.
    expect(say('disk')).toContain(String.raw`$\Delta Q=\sum\delta q$`);
    expect(say('disk')).toContain(String.raw`$k\,\Delta Q\cos\alpha/r_i^2$`);
    // The sheet's sum is over the thin ring that stands in for each wide one, so of it this is exact.
    expect(say('sheet')).toContain(String.raw`add to $k\,\Delta Q\cos\alpha/r_i^2$, where $\Delta Q=\sum\delta q$ is the thin ring’s charge`);
    expect(say('sheet')).not.toMatch(/nearly/);
    for (const id of ['disk', 'sheet']) expect(step(id, 'cancel').cancelsSay, id).toMatch(/the bit straight across the ring makes \$-\\delta\\mathbf E_\\perp\$/);
  });
  it('what cancels is written as the figure draws it, and in ink', () => {
    // The figure labels the pair ΔE_y and −ΔE_y. Coloured as a projection, the whole equation lit the
    // angle's triangle when pointed at, while the pair it names is drawn in the contributions' teal.
    for (const id of ['bisector', 'infinite', 'arc']) {
      expect(step(id, 'cancel').cancels, id).toContain(String.raw`\Delta E_y+(-\Delta E_y)=0\;\Rightarrow\;E_y=0`);
      expect(step(id, 'cancel').say, id).toMatch(/Its mirror piece, at \$-\\(alpha|theta)\$, makes the same \$\\Delta E_x\$\.$/);
      // ΔE_y is named directly under the cancellation that uses it, not at the paragraph's end -- in a
      // sentence with a verb, as the ring's and the disk's are.
      expect(step(id, 'cancel').cancelsSay, id).toMatch(/^\$\\Delta E_y\$ is a piece’s part (along the rod|along the line|across the axis); its mirror piece makes \$-\\Delta E_y\$\.$/);
    }
    expect(step('ring', 'cancel').cancels).toContain(String.raw`\Delta\mathbf E_\perp+(-\Delta\mathbf E_\perp)=\mathbf 0`);
    for (const id of ['disk', 'sheet']) expect(step(id, 'cancel').cancels, id).toContain(String.raw`\delta\mathbf E_\perp=\mathbf 0`);
    for (const id of ['bisector', 'infinite', 'arc', 'ring', 'disk', 'sheet']) expect(step(id, 'cancel').cancels, id).not.toContain('fx-');
    // Nothing is written cancelling where nothing does -- and that is said, at rest, in its place.
    for (const id of ['axial', 'endpoint', 'ramp', 'semi', 'v-ring', 'v-disk', 'v-arc', 'v-rod-bisector', 'v-rod-axial']) {
      expect(step(id, 'cancel').cancels, id).toBeUndefined();
      expect(step(id, 'cancel').nothing, id).toBeTruthy();
    }
    for (const id of ['endpoint', 'ramp']) expect(step(id, 'cancel').nothing, id).toMatch(/every piece lies above the.*\$x\$-axis, so no piece has a mirror partner.*Cancellation needs a symmetry this geometry lacks\.$/);
    expect(step('semi', 'cancel').nothing).toMatch(/stops right below.*no piece has a mirror partner.*which is why the field leans\.$/);
    // Where nothing cancels, nothing names a pair that is not there.
    for (const id of ['axial', 'endpoint', 'ramp', 'semi', 'v-ring', 'v-disk', 'v-arc', 'v-rod-bisector', 'v-rod-axial']) expect(step(id, 'cancel').cancelsSay, id).toBeUndefined();
    // Nor off-centre, where the pairs are broken.
    expect(step('bisector', 'cancel', ['0', 'L/2']).cancelsSay).toBeUndefined();
    expect(step('axial', 'cancel').nothing).toMatch(/nothing sideways to cancel/);
  });
  it('a bracket dragged off-centre leaves the mirrors outside it, and the board stops saying E_y = 0', () => {
    // The upper half of the rod leans 17°; a quarter-arc 45°; half a ring has a sideways part 0.42 of
    // its axial one. The board wrote E_y = 0 over all of them.
    for (const [id, bounds] of [['bisector', ['0', 'L/2']], ['infinite', ['0', '\\pi/2']], ['arc', ['0', '\\varphi/2']], ['ring', ['0', '\\pi']]] as const) {
      const cancel = step(id, 'cancel', [...bounds] as [string, string]);
      expect(cancel.cancels, id).toBeUndefined();
      expect(cancel.nothing, id).toMatch(/no longer cancels/);
      // The rods write the signed part that survives; the ring says in words what its parts across the
      // axis do, since a magnitude cannot survive a sum.
      if (id === 'ring') expect(cancel.also, id).toBeUndefined();
      else expect(cancel.also, id).toBeTruthy();
    }
    // Symmetric about the middle, the partners are all inside and the cancellation stands.
    expect(step('bisector', 'cancel', ['-L/4', 'L/4']).cancels).toContain('E_y=0');
    expect(step('bisector', 'cancel', ['y_1', 'y_2'], true).cancels).toContain('E_y=0');
    // The disk's and the sheet's rings are whole at any radius: each still cancels round itself.
    expect(step('disk', 'cancel', ['s_1', 's_2'], false).cancels).toBeTruthy();
    // And the transverse part it now writes is the lesson's own: −k ΔQ sin α / r_i² along y.
    expect(step('bisector', 'cancel', ['0', 'L/2']).also).toContain(String.raw`\Delta E_y=-\frac{k\,`);
  });
  it('the one-piece line says Coulomb’s law, k, and the triangle r_i comes from; a potential’s says why it is over r_i', () => {
    for (const p of PROBLEMS) {
      const one = step(p.id, 'one').say!;
      expect(one, p.id).toContain(String.raw`$k=1/(4\pi\varepsilon_0)$`);
      if (p.quantity === 'V') expect(one, p.id).toMatch(/divided by its distance, \$r_i\$\u00a0— not \$r_i\^2\$, as for the field\u00a0— and a potential has no direction/);
      else expect(one, p.id).toMatch(/Coulomb’s law/);
    }
    for (const id of ['bisector', 'endpoint', 'ramp', 'semi', 'ring', 'infinite', 'disk', 'sheet']) expect(step(id, 'one').say, id).toMatch(/\$r_i\$ is the hypotenuse/);
    // The sheet's triangle joins the distance to Cut it up's name for it.
    expect(step('sheet', 'one').say).toContain(String.raw`the $z\sec\alpha$ of Cut it up`);
    // The disk says what r_i is, and what i numbers, before the triangle that gives it.
    expect(step('disk', 'one').say!.indexOf('(the $i$ numbers the rings)')).toBeLessThan(step('disk', 'one').say!.indexOf('is the hypotenuse'));
    expect(step('v-disk', 'one').say).toMatch(/^A ring is not a point, but if it is treated as thin/);
    expect(step('bisector', 'one').say).toMatch(/unit vector from the piece toward/);
    expect(step('disk', 'one').say).toMatch(/\$\\delta q\$ is one bit of the ring/);
    expect(step('v-disk', 'one').say).toMatch(/every bit of it is \$r_i\$ from/);
  });
  it('the sheet’s wide rings are never said to be thin, or all one distance away', () => {
    const sheet = lesson('sheet');
    const texts = [...boardLines(sheet).flatMap(remarks), ...buildStages(sheet).flatMap(s => [s.line, s.caption])];
    for (const text of texts) {
      // The stand-in is a thin ring, and is called one; the sheet's own rings never are.
      expect(text, text).not.toMatch(/thin rings|(each|every|the|this|a wide) ring is thin|(rings|ring) thin in angle/i);
      expect(text, text).not.toMatch(/Every bit is \$r_i\$ away/);
      expect(text, text).not.toMatch(/bits are nearly the same distance/);
      // "The same distance" only ever as nearly so.
      for (const m of text.matchAll(/same distance/g)) expect(text.slice(0, m.index), text).toMatch(/nearly (the )?$/);
    }
    // What holds of them, the outermost too, is that each makes nearly a thin ring's field -- and the
    // board's one-piece line says so with ≈, not =.
    const one = step('sheet', 'one');
    expect(one.say).toMatch(/^\$\\delta q\$ is one bit of the thin ring that stands in for this one: its bits hold \$\\Delta Q\$ between them, all \$r_i\$ from/);
    // ΔE is the thin ring's field, as on the lines it is the stand-in point charge's: "=", as there. Cut
    // it up says the stand-in's field is nearly the wide ring's, and Add keeps the one ≈.
    expect(one.tex).not.toContain('\\approx');
    expect(one.tex).toContain(String.raw`\sum\nolimits_{\text{thin ring}}`);
    expect(step('disk', 'one').tex).not.toContain('\\approx');
    // At five pieces, P three metres up: the fourth ring's bits run from 0.77 to 1.47 of its r_i.
    const z = 3, edges = [3, 4].map(i => z * Math.tan(Math.PI / 2 * i / 5)), mid = z * Math.tan(Math.PI / 2 * 3.5 / 5);
    const ri = Math.hypot(mid, z), near = Math.hypot(edges[0], z) / ri, far = Math.hypot(edges[1], z) / ri;
    expect(near).toBeLessThan(.8);
    expect(far).toBeGreaterThan(1.4);
  });
  it('a thin angle makes each piece’s field nearly the one the remark names -- the outermost too', () => {
    // The first line's remark is a claim about numbers, checked against the exact field of each
    // piece the figure draws: five of them, cut at equal angles from P, as the run cuts them.
    const n = 5, dA = Math.PI / 2 / n;
    for (let i = 0; i < n; i++) {
      const a1 = i * dA, a2 = (i + 1) * dA, mid = (a1 + a2) / 2;
      // A segment of a line seen from r away makes 2kλ sin(Δα/2)/r; the point charge λ r sec²α Δα,
      // r sec α away, makes kλΔα/r. (k = λ = r = 1.)
      expect(Math.abs(dA / (2 * Math.sin(dA / 2)) - 1), `piece ${i + 1}`).toBeLessThan(.005);
      // An annulus of a sheet seen from z away on its axis makes 2πkσ(cos α₁ − cos α₂); the thin ring
      // of charge σ 2πs z sec²α Δα at s = z tan α makes 2πkσ sin α Δα.
      expect(Math.abs(Math.sin(mid) * dA / (Math.cos(a1) - Math.cos(a2)) - 1), `ring ${i + 1}`).toBeLessThan(.005);
    }
    // The outermost ring: 0.310 against the exact 0.309, in units of 2πkσ.
    expect((Math.sin(9 * Math.PI / 20) * Math.PI / 10).toFixed(3)).toBe('0.310');
    expect(Math.cos(2 * Math.PI / 5).toFixed(3)).toBe('0.309');
  });
  it('a ring’s field, and a ring’s and an arc’s potential, are exact at any cut -- and the board says =', () => {
    // Every piece is the same distance from P at the same angle: the figure's sum is the closed form at
    // three pieces as at thirty. The arc's field is not, and keeps its ≈.
    expect(PROBLEMS.filter(exactSum).map(p => p.id).sort()).toEqual(['ring', 'v-arc', 'v-ring']);
    const P = DEFAULT_PARAMS;
    const Ez = (n: number) => sampleDistribution('ring', P, n).reduce((z, s) => z + s.field.z, 0);
    const V = (id: 'v-ring' | 'v-arc', n: number) => sampleDistribution(id, P, n).reduce((v, s) => v + s.potential, 0);
    for (const n of [3, 5, 30]) {
      expect(Ez(n) / Ez(1000), `ring E_z at ${n}`).toBeCloseTo(1, 10);
      expect(V('v-ring', n) / V('v-ring', 1000), `ring V at ${n}`).toBeCloseTo(1, 10);
      expect(V('v-arc', n) / V('v-arc', 1000), `arc V at ${n}`).toBeCloseTo(1, 10);
    }
    const Ex = (n: number) => sampleDistribution('arc', P, n).reduce((x, s) => x + s.field.x, 0);
    expect(Math.abs(Ex(5) / Ex(1000) - 1)).toBeGreaterThan(1e-3);
    // The integral of a term that never changes: it comes out, and the rest counts the whole charge.
    expect(step('ring', 'limit').say).toContain(String.raw`$\int_0^{2\pi}d\theta=2\pi$`);
    // Spelled as the lesson's own Unfold spells it, one click down: 2πRλ.
    expect(step('ring', 'limit').say).toContain(String.raw`$2\pi R\lambda=Q$`);
    expect(step('ring', 'limit').finish).toContain(String.raw`(2\pi R\lambda)`);
    expect(step('v-ring', 'limit').finish).toContain(String.raw`(2\pi R\lambda)`);
    for (const id of ['ring', 'v-ring']) expect(boardLines(lesson(id)).flatMap(l => [l.tex, l.finish, l.say]).join(' '), id).not.toContain(String.raw`\lambda\,2\pi R`);
    expect(step('v-arc', 'limit').say).toContain(String.raw`$\lambda R\varphi=Q$`);
    expect(step('v-arc', 'limit').say).not.toMatch(/stays\. So/);
    // A ring's bits are all at one angle, so its sum does not index α.
    expect(step('ring', 'add').tex).not.toContain('\\alpha_i');
  });
  it('the square times its own root is said where the finished line arrives at the three-halves power', () => {
    for (const id of ['bisector', 'endpoint', 'ramp', 'ring', 'disk', 'sheet', 'semi']) {
      const limit = step(id, 'limit');
      expect(limit.merged, id).toMatch(/\\sqrt\{.*\}=\(.*\)\^\{3\/2\}/);
      expect(limit.finish, id).toContain('^{3/2}');
    }
    for (const id of ['axial', 'arc']) expect(step(id, 'limit').merged, id).toBeUndefined();
    // The infinite line's second row cancels a sec²θ, the lesson's whole claim, and says so.
    expect(step('infinite', 'limit').merged).toContain(String.raw`\frac{\lambda r\sec^2\theta}{r^2\sec^2\theta}=\frac{\lambda}{r}`);
  });
  it('every answer contains the k its definition defines, and says it in k before ε₀', () => {
    for (const p of PROBLEMS) expect(resultLines(p).join(' '), p.id).toMatch(/k/);
    for (const id of ['disk', 'sheet', 'v-disk']) {
      const tex = resultLines(lesson(id)).join(' ');
      expect(tex.indexOf('2\\pi k\\sigma'), id).toBeGreaterThan(-1);
      expect(tex.indexOf('2\\pi k\\sigma'), id).toBeLessThan(tex.indexOf('\\frac{\\sigma}{2\\varepsilon_0}'));
    }
    // The disk, the sheet and the disk's potential state their condition in one style.
    for (const id of ['disk', 'sheet', 'v-disk']) expect(resultLines(lesson(id)).join(' '), id).toContain('(z>0)');
    expect(resultLines(lesson('v-disk')).join(' ')).not.toContain('\\text');
    // 2πk is 1/(2ε₀), with k = 1/(4πε₀).
    expect(2 * Math.PI * (1 / (4 * Math.PI))).toBeCloseTo(1 / 2, 15);
    // The endpoint's components both in λ, as the board integrated -- and E_x is still kQ/(r√(r²+L²)).
    const [ex] = resultLines(lesson('endpoint'));
    expect(ex).toContain('k\\lambda L');
    for (const at of points(10)) {
      const viaLambda = at.k * at.lambda * at.L / (at.r * Math.sqrt(at.r ** 2 + at.L ** 2));
      close(viaLambda, at.k * (at.lambda * at.L) / (at.r * Math.sqrt(at.r ** 2 + at.L ** 2)), 'E_x in λ is kQ/(r√(r²+L²))');
    }
    // The semi-infinite line's magnitude is a row of its own, not one of its signed components -- in the
    // one aligned block its components are set in.
    expect(resultLines(lesson('semi'))).toHaveLength(1);
    expect(resultLines(lesson('semi'))[0]).toMatch(/E_x&=.*E_y&=.*\|\\mathbf E\|&=/);
  });
  it('the bisector’s worked substitution writes every identity it uses, in α', () => {
    const all = BISECTOR_UNFOLD.map(s => s.text + ' ' + s.tex).join(' ');
    expect(all).toContain(String.raw`r^2(\tan^2\alpha+1)=r^2\sec^2\alpha`);
    expect(all).toContain(String.raw`\int\cos\alpha\,d\alpha=\sin\alpha`);
    expect(all).toContain(String.raw`\sin\alpha=y/\sqrt{y^2+r^2}`);
    expect(BISECTOR_UNFOLD[0].tex).toMatch(/^E_x=k\\lambda\\int/);
    for (const s of BISECTOR_UNFOLD) {
      expect(() => typeset(s.tex)).not.toThrow();
      for (const [i, part] of s.text.split('$').entries()) if (i % 2) expect(() => typeset(part)).not.toThrow();
      expect(s.text + s.tex).not.toMatch(/(?<![A-Za-z\\])u(?![A-Za-z])/);
    }
  });
  it('dragging the brackets rewrites the limits of the last line', () => {
    const limit = step('bisector', 'limit', ['0', 'L/2']);
    expect(limit.tex).toContain('\\htmlClass{fx fx-bounds}{0}');
    expect(limit.tex).not.toContain('-L/2');
  });
});
