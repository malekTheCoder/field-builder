import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {evaluate} from 'mathjs';
import {PROBLEMS} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {boardLines, componentOf, factorsOf, resultLines} from '../src/workbench/derivation';
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
/** What changes from piece to piece in each lesson's sum, written independently of the board. A
 * ring's bits are all one distance away at one angle; an arc's pieces are all R away. */
const VARIES: Record<string, string[]> = {
  bisector: ['r_i', '\\cos\\alpha_i'], endpoint: ['r_i', '\\cos\\alpha_i'], ramp: ['\\lambda(y)', 'r_i', '\\cos\\alpha_i'],
  axial: ['r_i'], infinite: ['r_i', '\\cos\\theta_i', '\\Delta y'], semi: ['r_i', '\\sin\\alpha_i'],
  ring: [], disk: ['r_i', '\\cos\\alpha_i'], sheet: ['r_i', '\\cos\\alpha_i'], arc: ['\\cos\\theta_i'],
  'v-ring': [], 'v-disk': ['r_i'], 'v-arc': [], 'v-rod-bisector': ['r_i'], 'v-rod-axial': ['r_i'],
};
const close = (got: number, want: number, what: string) =>
  expect(Math.abs(got - want), `${what}: ${got} vs ${want}`).toBeLessThanOrEqual(1e-10 * Math.max(1, Math.abs(want)));
describe('the derivation board', () => {
  for (const p of PROBLEMS) {
    const lines = boardLines(p), f = factorsOf(p), scalar = p.quantity === 'V';
    it(`${p.id}: one line per stage of the run, in the run's order`, () => {
      expect(lines.map(l => l.key)).toEqual(buildStages(p).map(s => s.key));
    });
    it(`${p.id}: every line and every result typesets`, () => {
      for (const l of lines) for (const tex of [l.tex, l.where, l.finish, l.cancels, l.also]) if (tex) expect(() => typeset(tex), `${l.key}: ${tex}`).not.toThrow();
      // The symbols inside a remark in words, which are set as math between its dollar signs.
      for (const l of lines) for (const [i, part] of (l.say ?? '').split('$').entries()) if (i % 2) expect(() => typeset(part), `${l.key} say: ${part}`).not.toThrow();
      for (const tex of resultLines(p)) expect(() => typeset(tex), tex).not.toThrow();
    });
    it(`${p.id}: words are set as words, never as \\text inside a gloss`, () => {
      // KaTeX never breaks a \text{} run, and sets it in Computer Modern beside the panel's prose:
      // "for every bit of the ring" and "θ: the piece's angle at P" both ran that way.
      // (A one-word label, like the ring under a sum, is a label and not a sentence.)
      for (const l of lines) for (const tex of [l.where, l.cancels, l.also]) if (tex) expect(tex, `${l.key}: ${tex}`).not.toMatch(/\\text\{[^}]*[\s:][^}]*\}/);
      // And a remark's words carry no raw TeX: every symbol in one sits between its dollar signs.
      for (const l of lines) if (l.say) {
        expect(l.say.split('$').length % 2, `${l.key}: unbalanced $ in "${l.say}"`).toBe(1);
        for (const [i, part] of l.say.split('$').entries()) if (!(i % 2)) expect(part, `${l.key}: "${l.say}"`).not.toMatch(/\\[a-zA-Z]/);
      }
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
      expect(add, p.id).toMatch(/counted once/);
      expect(add, p.id).not.toMatch(/variable you sum over/);
      // Dragging the brackets says which pieces are now counted, not the whole charge's ends.
      const dragged = boardLines(p, ['a', 'b']).find(l => l.key === 'add')!.say!;
      expect(dragged, p.id).toContain(`from $${v}=a$ to $${v}=b$`);
      expect(dragged, p.id).toMatch(/bracketed/);
    });
    it(`${p.id}: the last line says the rule -- everything that changes from piece to piece is written in the variable`, () => {
      // The one step a student has to make alone to set up the next integral, which the board made
      // silently: r_i became √(y²+r²) and cos α_i became r/√(y²+r²), followable only by colour.
      const limit = lines.find(l => l.key === 'limit')!.say!;
      expect(limit, p.id).toContain(`integral over $${p.variableTex}$`);
      const varies = VARIES[p.id];
      for (const factor of varies) expect(limit, `${p.id}: ${factor}`).toContain(`$${factor}$`);
      // The factors it names are the ones the sum above it indexes.
      const sum = lines.find(l => l.key === 'add')!.tex;
      for (const factor of varies.filter(f => f.endsWith('_i'))) expect(sum, `${p.id}: ${factor}`).toContain(factor);
      if (varies.length) expect(limit, p.id).toMatch(/changes from piece to piece/);
      else expect(limit, p.id).toMatch(/^Nothing changes from piece to piece/);
      // An arc's pieces are all R away: the R stays.
      if (p.geometry === 'arc') expect(limit, p.id).toMatch(/\$R\$ stays/);
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
  }
  it('the infinite line’s piece holds λΔy, exactly; the sec² of y = r tan θ comes in only with the limit', () => {
    // At every N the outermost piece is infinitely long, so "ΔQ ≈ λ r sec²θ Δθ" was false of it: what
    // a thin angle approximates is the piece's field at P, not its charge.
    const lines = boardLines(PROBLEMS.find(x => x.id === 'infinite')!);
    const pieces = lines.find(l => l.key === 'pieces')!, limit = lines.find(l => l.key === 'limit')!;
    expect(pieces.tex).toContain('\\lambda\\,\\Delta y');
    expect(pieces.tex).not.toContain('\\sec');
    expect(pieces.tex).not.toContain('\\approx');
    expect(pieces.where).toContain('y=r\\tan\\theta');
    expect(limit.where).toContain('dQ=\\lambda r\\sec^2\\theta\\,d\\theta');
    // The sec² before the limit only as what it is: the point charge whose field a thin piece nearly makes.
    expect(pieces.say).toMatch(/nearly the field at.*of a point charge \$\\lambda r\\sec\^2\\theta\\,\\Delta\\theta\$/);
  });
  it('the semi-infinite line and the sheet are cut at equal angles, and their first lines say so', () => {
    // Both runs cut at equal angles at P, as the samplers do: at five pieces the semi-infinite line's
    // fourth piece runs from about four to nine metres, as does the sheet's fourth ring, and each
    // one's last never ends. "A piece Δx long holds λΔx" and "a thin ring's area is 2πsΔs" described
    // pieces that were short and thin; these are not.
    const pieces = (id: string) => boardLines(PROBLEMS.find(x => x.id === id)!).find(l => l.key === 'pieces')!;
    expect(pieces('semi').where).toContain(String.raw`x=r\tan\alpha`);
    expect(pieces('semi').say).toMatch(/^\$\\lambda\$ is the charge per unit length\. Thin in angle, each piece makes nearly the field at.*of a point charge \$\\lambda r\\sec\^2\\alpha\\,\\Delta\\alpha\$ — even the outermost/);
    expect(pieces('sheet').where).toContain(String.raw`s=z\tan\alpha`);
    expect(pieces('sheet').say).toMatch(/^\$\\sigma\$ is the charge per unit area\. Thin in angle, each ring makes nearly the field at.*of a thin ring of charge \$\\sigma\\,2\\pi s\\,z\\sec\^2\\alpha\\,\\Delta\\alpha\$ — even the outermost/);
    // The piece's charge is still written as what it exactly is; only the limit brings in the angle.
    expect(pieces('semi').tex).toContain(String.raw`\lambda\,\Delta x`);
    expect(pieces('sheet').tex).toContain(String.raw`\sigma\,2\pi s\,\Delta s`);
    // The disk IS cut into thin rings of equal width, and keeps saying so.
    expect(pieces('disk').say).toMatch(/thin ring’s area/);
  });
  it('nothing the sheet says calls its rings thin, or every bit of one the same distance away, unqualified', () => {
    const sheet = PROBLEMS.find(x => x.id === 'sheet')!;
    const texts = [...boardLines(sheet).map(l => l.say ?? ''), ...buildStages(sheet).flatMap(s => [s.line, s.caption])];
    for (const text of texts) {
      expect(text, text).not.toMatch(/thin rings|thin ring’s/i);
      expect(text, text).not.toMatch(/Every bit is \$r_i\$ away/);
      // "The same distance" only ever as nearly so.
      for (const m of text.matchAll(/same distance/g)) expect(text.slice(0, m.index), text).toMatch(/nearly (the )?$/);
    }
    expect(boardLines(sheet).find(l => l.key === 'one')!.say).toMatch(/In a ring thin in angle, every bit is nearly \$r_i\$ away\./);
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
  it('every angle the board uses is said in words where the cancellation line brings it in', () => {
    // α arrived in What cancels with no word for it, and nothing said why the part along x is
    // "times cos α"; the ring's ⊥ and θ+π had no words at all.
    for (const p of PROBLEMS.filter(q => q.quantity === 'E' && q.id !== 'axial')) {
      const cancel = boardLines(p).find(l => l.key === 'cancel')!;
      const angle = p.id === 'infinite' || p.id === 'arc' ? String.raw`$\theta$` : String.raw`$\alpha$`;
      expect(cancel.say, p.id).toBeTruthy();
      expect(cancel.say!.startsWith(`${angle} is the`), `${p.id}: ${cancel.say}`).toBe(true);
      // Which side of the triangle the component is, wherever the board writes the angle's ratio.
      if (cancel.where) expect(cancel.say, p.id).toMatch(/lies along/);
    }
    const say = (id: string) => boardLines(PROBLEMS.find(x => x.id === id)!).find(l => l.key === 'cancel')!.say!;
    expect(say('bisector')).toMatch(/the side next to/);
    expect(say('endpoint')).toContain(String.raw`$\Delta E\sin\alpha$, is the side opposite`);
    expect(say('semi')).toMatch(/perpendicular from.*to the line/);
    expect(say('semi')).toContain(String.raw`$\Delta E\sin\alpha$, the side opposite`);
    expect(say('ring')).toContain(String.raw`$\theta+\pi$`);
    expect(say('ring')).toContain(String.raw`$\Delta\mathbf E_\perp$`);
    for (const id of ['disk', 'sheet']) expect(say(id), id).toMatch(/cancel round each ring/);
    // The rod seen end-on has no angle to name.
    expect(say('axial')).toBe('Already along the axis.');
  });
  it('what cancels is written, not only what survives', () => {
    const at = (id: string) => boardLines(PROBLEMS.find(x => x.id === id)!).find(l => l.key === 'cancel')!;
    // A piece and its mirror partner, at the opposite angle, in the lesson's own angle symbol.
    expect(at('bisector').cancels).toContain('\\Delta E_y(\\alpha)+\\Delta E_y(-\\alpha)=0');
    expect(at('bisector').cancels).toContain('E_y=0');
    expect(at('infinite').cancels).toContain('\\Delta E_y(\\theta)+\\Delta E_y(-\\theta)=0');
    expect(at('arc').cancels).toContain('\\Delta E_y(\\theta)+\\Delta E_y(-\\theta)=0');
    expect(at('ring').cancels).toContain('\\Delta\\mathbf E_\\perp(\\theta)+\\Delta\\mathbf E_\\perp(\\theta+\\pi)=\\mathbf 0');
    for (const id of ['bisector', 'infinite', 'arc', 'ring', 'disk', 'sheet']) expect(at(id).cancels, id).toContain('fx-projection');
    // Nothing is written cancelling where nothing does.
    for (const id of ['axial', 'endpoint', 'ramp', 'semi', 'v-ring', 'v-disk', 'v-arc', 'v-rod-bisector', 'v-rod-axial']) expect(at(id).cancels, id).toBeUndefined();
  });
  it('the unit vector and the bit of a ring are said in words where they first appear', () => {
    const one = (id: string) => boardLines(PROBLEMS.find(x => x.id === id)!).find(l => l.key === 'one')!;
    expect(one('bisector').say).toMatch(/unit vector from the piece toward/);
    expect(one('disk').say).toMatch(/\$\\delta q\$ is one bit of the ring/);
    expect(one('v-disk').say).toMatch(/every bit of it is \$r_i\$ from/);
  });
  it('dragging the brackets rewrites the limits of the last line', () => {
    const p = PROBLEMS.find(x => x.id === 'bisector')!;
    const limit = boardLines(p, ['0', 'L/2']).find(l => l.key === 'limit')!;
    expect(limit.tex).toContain('\\htmlClass{fx fx-bounds}{0}');
    expect(limit.tex).not.toContain('-L/2');
  });
});
