import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {Assessment} from '../src/components/Assessment';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
afterEach(cleanup);
/* THE LIMITING-CASES PANEL, AS IT RENDERS.
 *
 * The page shows no numerals: the plot used to label its axis with the sweep's internal 1 and 30,
 * print "distance / 2R = 4.0" under the slider, and close with a readout of newtons per coulomb to
 * four figures and a percentage. The numbers stay where a screen reader or a table wants them --
 * the plot's aria-label and the sr-only table -- and nowhere a reader sees. */
const visible = (root: Element) => [
  ...[...root.querySelectorAll('.comparison-plot text')].map(t => t.textContent ?? ''),
  root.querySelector('.comparison-labels')?.textContent ?? '',
  root.querySelector('.numerical-check')?.textContent ?? '',
  root.querySelector('.control-label')?.textContent ?? '',
];
describe('the limiting cases speak in symbols', () => {
  // Two dozen renders of a 480-wide SVG; well under a second here, with room for a slow runner.
  it('no plot label, legend or caption carries a numeral, in any lesson', () => {
    for (const problem of PROBLEMS) for (const limit of problem.limits) {
      const {container, unmount} = render(<Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} />);
      for (const text of visible(container)) expect(text, `${problem.id}/${limit.id}: “${text}”`).not.toMatch(/[0-9]/);
      // The numbers are still there for a screen reader.
      expect(container.querySelector('svg.comparison-plot')!.getAttribute('aria-label')).toMatch(/[0-9]/);
      unmount();
    }
  }, 20000);
  it('the thumbnail’s arrow is the lesson’s own field: it reverses with the charge', () => {
    const endpoint = getProblem('endpoint');
    const arrow = (charge: number, mode: string) => {
      const {container, unmount} = render(<Assessment problem={endpoint} params={{...DEFAULT_PARAMS, charge}} limit={endpoint.limits.find(l => l.mode === mode)!} />);
      const g = container.querySelector<SVGGElement>('.limit-arrow')!;
      const out = {dx: Number(g.dataset.dx), dy: Number(g.dataset.dy)};
      unmount();
      return out;
    };
    for (const mode of ['far', 'infinite']) {
      const up = arrow(2, mode), down = arrow(-2, mode);
      expect(down.dx, mode).toBeCloseTo(-up.dx, 3);
      expect(down.dy, mode).toBeCloseTo(-up.dy, 3);
      // Positive charge above P: the arrow leans right and down (screen y grows downward).
      expect(up.dx, mode).toBeGreaterThan(0);
      expect(up.dy, mode).toBeGreaterThan(0);
    }
  });
});
