import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
// The plot's own type: its labels are 10.5px Geist from globals.css, and whether a label sits clear
// of a curve depends on how wide the label really is.
import '@fontsource-variable/geist';
import '../app/globals.css';
import '../src/static-fonts.css';
import {Assessment} from '../src/components/Assessment';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
afterEach(cleanup);
/* A POTENTIAL WITH NO LIMIT IS DRAWN GROWING.
 *
 * "The infinite line has no finite V" used to plot V divided by its growth law: a curve that fell
 * and flattened onto a dashed line at one. A student read it as V levelling off, the opposite of the
 * tab's point. It is now V and the growth law themselves, over one shared constant: two curves that
 * both climb the plot. */
const ys = (d: string) => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => Number(m[2]));
describe('a diverging potential is drawn as two rising curves', () => {
  // The rod's potential walking onto its end is the third: drawn as V over its logarithm, the ratio
  // came in from off the top at a = L, where ln(L/a) is zero, and settled on one as V ran off.
  for (const [id, mode] of [['v-rod-bisector', 'infinite'], ['v-disk', 'infinite'], ['v-rod-axial', 'near']] as const) it(`${id}/${mode}`, async () => {
    const problem = getProblem(id), limit = problem.limits.find(l => l.mode === mode)!;
    const {container} = render(<div style={{width: 560}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit}/></div>);
    await document.fonts.ready;
    const svg = container.querySelector<SVGSVGElement>('svg.comparison-plot')!;
    expect(svg.dataset.kind).toBe('growth');
    // No level reference line: the growth law is a curve of its own.
    expect(svg.querySelector('line[stroke="var(--charge)"]')).toBeNull();
    const exact = svg.querySelector<SVGPathElement>('path[stroke="var(--field)"]')!;
    const law = svg.querySelector<SVGPathElement>('path.comparison-guide')!;
    expect(law, 'the growth law is drawn').not.toBeNull();
    for (const [name, path] of [['V', exact], ['growth law', law]] as const) {
      const y = ys(path.getAttribute('d')!);
      expect(y.length).toBe(70);
      // SVG y grows downward: rising means never moving down, and climbing most of the plot.
      for (let i = 1; i < y.length; i++) expect(y[i], `${id} ${name} at ${i}`).toBeLessThanOrEqual(y[i - 1]);
      expect(y[0] - y[y.length - 1], `${id} ${name} climbs`).toBeGreaterThan(90);
    }
    expect(container.querySelector('.numerical-check')!.textContent).toMatch(/^Both (keep growing|grow) without end/);
    expect(container.querySelector('.comparison-labels')!.textContent).toMatch(mode === 'near' ? /k\|λ\| ln\(L\/a\)/ : /Grows as (R|ln\(L\/r\))/);
    // The growth law's name sits beside it, touching neither curve.
    const label = svg.querySelector<SVGTextElement>('text.comparison-line')!, box = label.getBBox();
    expect(box.width).toBeGreaterThan(20);
    // Probed as if solid: a label must clear the dashes' gaps too.
    law.style.strokeDasharray = 'none';
    // The probe itself works: a point on either curve is in its stroke.
    for (const path of [exact, law]) expect(path.isPointInStroke(path.getPointAtLength(path.getTotalLength() / 2))).toBe(true);
    for (let x = box.x; x <= box.x + box.width; x += 1.5) for (let y = box.y; y <= box.y + box.height; y += 1.5) {
      const at = new DOMPoint(x, y);
      expect(exact.isPointInStroke(at) || law.isPointInStroke(at), `${id}: the label overlaps a curve at ${x.toFixed(1)}, ${y.toFixed(1)}`).toBe(false);
    }
  });
});
