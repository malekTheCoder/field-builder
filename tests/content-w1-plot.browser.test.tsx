import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {Assessment} from '../src/components/Assessment';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
afterEach(cleanup);
/* THE LIMIT PLOT ON A PHONE.
 *
 * The plot is a 480-unit SVG scaled to its box. On a 390-px phone that box is about 354 px, and its
 * 10.5-unit labels -- the axis ends, the axis name, the landmarks, the reference's name -- came out at
 * 7.7 px: the axes of an assigned case could not be read on the device a student opens the link on.
 * The labels are now held at twelve pixels at the least however narrow the plot is drawn, and once they grow
 * the axis name moves to a row of its own, under the two end labels it would otherwise run into.
 *
 * The suite does not load the app's stylesheet, so the plot's type is given a sans face of about the
 * app's width here; the sizes under test are the ones the component itself writes. */
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const face = () => { const s = document.createElement('style'); s.textContent = '.comparison-plot text{font-family:Arial,Helvetica,sans-serif}'; document.head.appendChild(s); return () => s.remove(); };
const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5;
describe('the limit plot’s labels stay readable and apart', () => {
  for (const width of [354, 560]) it(`at ${width} px, in every lesson`, async () => {
    const restore = face();
    try {
      for (const problem of [...PROBLEMS, getProblem('infinite', 'limit')]) for (const limit of problem.limits) {
        const {container, unmount} = render(<div style={{width}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
        await frame();
        const svg = container.querySelector<SVGSVGElement>('svg.comparison-plot')!, scale = svg.getBoundingClientRect().width / 480;
        const texts = [...svg.querySelectorAll('text')].filter(t => t.textContent);
        for (const t of texts) {
          const px = parseFloat(getComputedStyle(t).fontSize) * scale;
          expect(px, `${problem.id}/${limit.id} “${t.textContent}” at ${width}`).toBeGreaterThanOrEqual(11.5);
        }
        const boxes = texts.map(t => ({t: t.textContent, r: t.getBoundingClientRect()}));
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++)
          expect(overlap(boxes[i].r, boxes[j].r), `${problem.id}/${limit.id} at ${width}: “${boxes[i].t}” runs into “${boxes[j].t}”`).toBe(false);
        // Every label inside the plot's own box.
        const box = svg.getBoundingClientRect();
        for (const {t, r} of boxes) expect(r.left >= box.left - .5 && r.right <= box.right + .5 && r.bottom <= box.bottom + .5, `${problem.id}/${limit.id} “${t}” leaves the plot at ${width}`).toBe(true);
        unmount();
      }
    } finally { restore(); }
  }, 30000);
  it('the arc’s φ in the plot is set in the formulas’ face, not the sans', async () => {
    const arc = getProblem('v-arc');
    const {container} = render(<div style={{width: 560}}><Assessment problem={arc} params={DEFAULT_PARAMS} limit={arc.limits[0]} /></div>);
    const sym = [...container.querySelectorAll<SVGTSpanElement>('svg.comparison-plot tspan.comparison-sym')];
    expect(sym.map(s => s.textContent)).toContain('φ');
    for (const s of sym) expect(getComputedStyle(s).fontFamily).toMatch(/^KaTeX_Math/);
  });
  it('the arc’s potential draws the field beside it, falling to the axis as the circle closes', () => {
    const arc = getProblem('v-arc');
    const {container} = render(<div style={{width: 560}}><Assessment problem={arc} params={DEFAULT_PARAMS} limit={arc.limits[0]} /></div>);
    const second = container.querySelector<SVGPathElement>('path.comparison-second')!;
    expect(second).not.toBeNull();
    const ys = [...second.getAttribute('d')!.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => Number(m[2]));
    // SVG y grows downward: the field only falls, from near the top of the plot to its axis.
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
    expect(ys.at(-1)! - ys[0]).toBeGreaterThan(100);
    expect(container.querySelector('.comparison-labels')!.textContent).toContain('The field |E|, scaled');
  });
});
