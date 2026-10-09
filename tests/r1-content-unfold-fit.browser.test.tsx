import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
// The page's own styles: KaTeX's stylesheet and fonts, the type scale in globals.css, and the
// panel's workbench.css, where `.ew-worked-step .math` sets the unfold's maths in the body size.
// Measured in a default serif at a default size, a line would fit or overflow for reasons that
// have nothing to do with what ships.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import '../src/components/workbench.css';
import {MathText} from '../src/components/Math';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
/* EVERY WORKED LINE IN "UNFOLD THE INTEGRATION" FITS THE PANEL.
 *
 * A line of KaTeX does not wrap: too wide, it scrolls sideways inside its own box and its end is cut
 * off. The worked lines are written by hand in src/problems, and the narrowest the panel gets beside
 * the figure is 272px (at a 1060px window). So every one of them -- the integration's and the
 * potentials' differentiate-back step, which the panel is about to show too -- is set here exactly
 * as the unfold sets it, in a 272px column, and must not scroll. */
const WIDTH = 272;
afterEach(cleanup);
const lessons = [...PROBLEMS, getProblem('infinite', 'limit')];
const lines = lessons.flatMap(p => p.steps.filter(s => s.kind === 'integrate' || s.kind === 'gradient')
  .flatMap(s => (s.worked ?? []).map((w, i) => ({where: `${p.id}${p.id === 'infinite' ? '/' + p.variable : ''} ${s.kind}[${i}]`, tex: w.tex}))));

describe('the unfolded integration fits the panel', () => {
  it('has worked lines to measure, the potentials’ gradient lines among them', () => {
    expect(lines.length).toBeGreaterThan(40);
    expect(lines.filter(l => l.where.includes('gradient')).length).toBeGreaterThanOrEqual(8);
  });
  // A few hundred KaTeX renders and one layout; about a second here, given room for a slow runner.
  it(`every integrate and gradient worked line fits ${WIDTH}px`, async () => {
    const view = render(<div className="ew-worked-body" style={{width: WIDTH}}>{lines.map(l =>
      <div className="ew-worked-step" key={l.where} data-where={l.where}><div><MathText tex={l.tex} block/></div></div>)}</div>);
    await document.fonts.ready;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const bad: string[] = [];
    for (const step of view.container.querySelectorAll<HTMLElement>('.ew-worked-step')) {
      const math = step.querySelector<HTMLElement>('.math')!;
      expect(math.clientWidth, 'the column is the panel’s width').toBeLessThanOrEqual(WIDTH);
      if (math.scrollWidth > math.clientWidth + 1) bad.push(`${step.dataset.where}: ${math.scrollWidth}px in ${math.clientWidth}px`);
    }
    expect(bad, `${bad.length} worked lines run off the panel`).toEqual([]);
  }, 30000);
});
