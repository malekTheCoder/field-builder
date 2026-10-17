import 'katex/dist/katex.min.css';
import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {MathText} from '../src/components/Math';
import {getProblem} from '../src/problems/definitions';
import {boardLines} from '../src/workbench/derivation';
/* SHRINK THEM'S FIRST REPLACEMENT, NEVER BROKEN INSIDE. On the shell the row "Σ_i → ∫, ΔQ_i → dQ = σ 2πR² sin θ dθ"
 * was one math box wider than a desktop panel's board, and KaTeX broke it after the first arrow: "Σ_i →" alone on a
 * line and "∫," opening the next. Σ_i → ∫ is now one group and the only break is before the charge's replacement, so
 * at any width too narrow for the whole row the two formulas wrap apart, each whole. */
afterEach(cleanup);
const top = (root: HTMLElement, glyph: string) => {
  const el = [...root.querySelectorAll('.katex-html span')].find(s => s.childElementCount === 0 && s.textContent === glyph);
  expect(el, glyph).toBeTruthy();
  return el!.getBoundingClientRect().top;
};
describe('Σ_i → ∫ stays on one line', () => {
  for (const id of ['shell', 'bisector', 'disk']) it(`${id}, at widths from a phone's board to a narrow desktop one`, () => {
    const where = boardLines(getProblem(id)).find(l => l.key === 'limit')!.where!;
    for (const width of [230, 260, 300]) {
      const view = render(<div style={{width, fontSize: 16}}><MathText tex={where} trusted /></div>);
      const root = view.container.firstElementChild as HTMLElement;
      const sum = top(root, '∑'), int = top(root, '∫'), dq = top(root, 'd');
      expect(Math.abs(sum - int), `${id} at ${width}px: Σ and ∫ on one line`).toBeLessThan(6);
      // Too narrow for the row, it wraps -- and only between the two formulas.
      if (root.scrollWidth > width + 1) throw Error(`${id} at ${width}px: ran past the board`);
      expect(dq, `${id} at ${width}px`).toBeGreaterThanOrEqual(sum - 6);
      view.unmount();
    }
  });
  it('the old one-string row did break between them on the shell', () => {
    const where = boardLines(getProblem('shell')).find(l => l.key === 'limit')!.where!;
    const old = where.replace(/^\{\\textstyle\\sum_i\\to\\int\}\\quad\\allowbreak /, String.raw`\textstyle\sum_i\to\int,\quad `);
    expect(old).not.toBe(where);
    const view = render(<div style={{width: 260, fontSize: 16}}><MathText tex={old} trusted /></div>);
    const root = view.container.firstElementChild as HTMLElement;
    expect(Math.abs(top(root, '∑') - top(root, '∫'))).toBeGreaterThan(6);
  });
});
