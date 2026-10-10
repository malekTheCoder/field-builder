import {cleanup, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {afterEach, describe, expect, it} from 'vitest';
// The page's own type: KaTeX's stylesheet and fonts, and globals.css, where `.math` scrolls sideways
// when its formula is wider than the card. Measured in a default serif, a formula would fit or run
// over for reasons that have nothing to do with what ships.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '../app/globals.css';
import '../src/static-fonts.css';
import {Assessment} from '../src/components/Assessment';
import {Laws} from '../src/components/Laws';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
afterEach(cleanup);
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
/* WAVE 2, SECOND PASS · CONTENT, AS DRAWN.
 *
 * Three limit formulas ran past the card on a phone, the rest hidden behind a sideways scroll no one
 * finds: the rod's potential read "|V| →" with no ∞. A growth plot labelled "grows as R" bent up like
 * an exponential on an unmarked log axis, while the rod's logarithm was drawn straight. And the half
 * line's thumbnail put P on the line, a negative line's arrow running straight across it. */
describe('every limit formula fits the card on a phone', () => {
  // The card's inner width in the Explorer at a 320, 360 and 390 px window.
  for (const width of [284, 324, 354]) it(`at ${width} px`, async () => {
    await document.fonts.ready;
    const over: string[] = [];
    for (const problem of [...PROBLEMS, getProblem('infinite', 'limit')]) for (const limit of problem.limits) {
      const {container, unmount} = render(<div style={{width}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
      // The card measures itself after its first paint, and sets a long formula over two lines then.
      await frame();
      const math = container.querySelector<HTMLElement>('.assessment > .math')!;
      if (math.scrollWidth > math.clientWidth) over.push(`${problem.id}/${limit.id}: ${math.scrollWidth - math.clientWidth}px over`);
      unmount();
    }
    expect(over).toEqual([]);
  }, 30000);
  it('and on a wide card the formula keeps its one line', async () => {
    const p = getProblem('v-rod-bisector'), limit = p.limits.find(l => l.mode === 'infinite')!;
    const {container} = render(<div style={{width: 560}}><Assessment problem={p} params={DEFAULT_PARAMS} limit={limit} /></div>);
    await frame();
    // One line, its colon set as punctuation (content-w2-i3.browser).
    expect(container.querySelector('.assessment > .math annotation')!.textContent).toBe(limit.formula.replace(':\\quad', '\\colon\\quad'));
  });
});

/** The points of a plotted path, in the SVG's own units. */
const points = (d: string) => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])] as const);
/** The largest distance of any point from the chord between the path's two ends. */
function bow(d: string) {
  const pts = points(d), [x0, y0] = pts[0], [x1, y1] = pts.at(-1)!, len = Math.hypot(x1 - x0, y1 - y0);
  return Math.max(...pts.map(([x, y]) => Math.abs((x1 - x0) * (y0 - y) - (x0 - x) * (y1 - y0)) / len));
}
describe('a growth law is drawn as the line its label names, on an axis that says what scale it is', () => {
  const plot = (id: string, mode: string) => {
    const p = getProblem(id), limit = p.limits.find(l => l.mode === mode)!;
    const {container} = render(<div style={{width: 560}}><Assessment problem={p} params={DEFAULT_PARAMS} limit={limit} /></div>);
    const svg = container.querySelector<SVGSVGElement>('svg.comparison-plot')!;
    return {guide: svg.querySelector('path.comparison-guide')?.getAttribute('d') ?? '', axis: svg.querySelector('text.comparison-axis')!.textContent!, label: svg.getAttribute('aria-label')!};
  };
  it('the disk’s “grows as R” is a straight line on a linear axis', () => {
    const {guide, axis} = plot('v-disk', 'infinite');
    // Within rounding of the path's one decimal: on a log axis it bowed some sixty units off its chord.
    expect(bow(guide)).toBeLessThan(.2);
    expect(axis).not.toMatch(/log scale/);
  });
  it('the rods’ logarithms are straight lines on an axis named a log scale', () => {
    for (const [id, mode] of [['v-rod-bisector', 'infinite'], ['v-rod-axial', 'near']] as const) {
      const {guide, axis, label} = plot(id, mode);
      expect(bow(guide), id).toBeLessThan(.2);
      expect(axis, id).toMatch(/\(log scale\)$/);
      expect(label, id).toMatch(/\(log scale\) from/);
      cleanup();
    }
  });
  it('every log axis says so', () => {
    const {axis} = plot('bisector', 'far');
    expect(axis).toBe('distance r (log scale)');
  });
});

describe('the half line’s thumbnail keeps P off the line and its arrow above it', () => {
  // The charged line is drawn at y = 38 with a stroke 7 wide: its top edge is at 34.5.
  const TOP = 34.5;
  it('for either sign, along the whole sweep', async () => {
    const semi = getProblem('semi');
    for (const charge of [2, -2]) {
      const {container, getByRole, unmount} = render(<div style={{width: 560}}><Assessment problem={semi} params={{...DEFAULT_PARAMS, charge}} limit={semi.limits[0]} /></div>);
      const slider = getByRole('slider', {name: 'Explore limiting case'});
      for (const key of ['{Home}', '{PageUp}', '{End}']) {
        if (key !== '{PageUp}') slider.focus();
        await userEvent.keyboard(key);
        const svg = container.querySelector('.limit-mini svg')!;
        const dot = svg.querySelector('circle')!, cy = Number(dot.getAttribute('cy')), r = Number(dot.getAttribute('r'));
        expect(cy + r, `q=${charge} ${key}: P's dot clears the line`).toBeLessThan(TOP - 2);
        const arrow = svg.querySelector<SVGGElement>('.limit-arrow');
        if (arrow) {
          const b = arrow.getBBox();
          expect(b.y + b.height, `q=${charge} ${key}: the arrow stays above the line`).toBeLessThanOrEqual(TOP);
        }
        if (charge > 0 && key === '{Home}') expect(arrow, 'a positive line’s arrow, up and away, is drawn').not.toBeNull();
      }
      unmount();
    }
  });
  it('a negative rod’s arrow stops short of the rod’s end as P walks onto it', async () => {
    const axial = getProblem('axial'), near = axial.limits.find(l => l.mode === 'near')!;
    const {container, getByRole} = render(<div style={{width: 560}}><Assessment problem={axial} params={{...DEFAULT_PARAMS, charge: -2}} limit={near} /></div>);
    const slider = getByRole('slider', {name: 'Explore limiting case'});
    for (const key of ['{Home}', '{End}']) {
      slider.focus(); await userEvent.keyboard(key);
      const arrow = container.querySelector<SVGGElement>('.limit-mini .limit-arrow');
      // The rod runs from x = 44 to 129, its round cap reaching 132.5.
      if (arrow) expect(arrow.getBBox().x, key).toBeGreaterThanOrEqual(132.5);
    }
  });
});

describe('a law’s detail is named by its button only while it is there', () => {
  it('no aria-controls points at a detail that is not mounted', async () => {
    const {container, getByRole} = render(<Laws />);
    for (const button of container.querySelectorAll('.law > button')) expect(button.hasAttribute('aria-controls')).toBe(false);
    const coulomb = getByRole('button', {name: /Coulomb/});
    await userEvent.click(coulomb);
    await waitFor(() => expect(coulomb.getAttribute('aria-expanded')).toBe('true'));
    expect(document.getElementById(coulomb.getAttribute('aria-controls')!)).not.toBeNull();
  });
});
