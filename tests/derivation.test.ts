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
const close = (got: number, want: number, what: string) =>
  expect(Math.abs(got - want), `${what}: ${got} vs ${want}`).toBeLessThanOrEqual(1e-10 * Math.max(1, Math.abs(want)));
describe('the derivation board', () => {
  for (const p of PROBLEMS) {
    const lines = boardLines(p), f = factorsOf(p), scalar = p.quantity === 'V';
    it(`${p.id}: one line per stage of the run, in the run's order`, () => {
      expect(lines.map(l => l.key)).toEqual(buildStages(p).map(s => s.key));
    });
    it(`${p.id}: every line and every result typesets`, () => {
      for (const l of lines) for (const tex of [l.tex, l.where, l.finish]) if (tex) expect(() => typeset(tex), `${l.key}: ${tex}`).not.toThrow();
      for (const tex of resultLines(p)) expect(() => typeset(tex), tex).not.toThrow();
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
  it('dragging the brackets rewrites the limits of the last line', () => {
    const p = PROBLEMS.find(x => x.id === 'bisector')!;
    const limit = boardLines(p, ['0', 'L/2']).find(l => l.key === 'limit')!;
    expect(limit.tex).toContain('\\htmlClass{fx fx-bounds}{0}');
    expect(limit.tex).not.toContain('-L/2');
  });
});
