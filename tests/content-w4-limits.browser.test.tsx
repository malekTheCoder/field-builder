import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {Assessment} from '../src/components/Assessment';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {limitPlot, sampleLimit} from '../src/symbolic/physics';
/* THE LIMITING CASES, READ AS DRAWN.
 *
 * A ratio plot was drawn close up around its line at one, from the smallest value on its sweep, with no
 * break in its axis: the bisector's far case starts at 0.89 of a point charge's field and was drawn
 * starting on the bottom edge, which a page without numerals reads as zero. And the slider under each
 * plot had no visible name, a bare track that read as a progress bar. */
afterEach(cleanup);
const lessons = [...PROBLEMS, getProblem('infinite', 'limit')];
describe('a ratio plot stands on zero', () => {
  it('the curve’s height over the axis, against the dashed line’s, is the ratio it plots, from the first sample', () => {
    let checked = 0;
    for (const problem of lessons) for (const limit of problem.limits) {
      const plot = limitPlot(problem, limit);
      if (plot.kind !== 'ratio' && plot.kind !== 'constant') continue;
      const {container, unmount} = render(<div style={{width: 560}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
      const exact = container.querySelector('path[stroke="var(--field)"]')!.getAttribute('d')!;
      const [, y0] = /^M[\d.]+,([\d.]+)/.exec(exact)!.map(Number);
      const reference = Number(container.querySelector('line.comparison-reference')!.getAttribute('y1'));
      // The axis the plot stands on: the foot of its L.
      const base = Number(/V([\d.]+)H/.exec(container.querySelector('svg.comparison-plot > path')!.getAttribute('d')!)![1]);
      const s = sampleLimit(problem, DEFAULT_PARAMS, limit, 1), ratio = s.actual / s.target;
      expect((base - y0) / (base - reference), `${problem.id}/${limit.id}: drawn height at the start, against the line’s`).toBeCloseTo(ratio, 1);
      checked++;
      unmount();
    }
    expect(checked, 'every ratio plot was looked at').toBeGreaterThan(10);
  });
});
describe('the limiting case’s slider says what it moves', () => {
  it('a visible name beside the track, from the plot’s own sweep', () => {
    const expected: Record<string, RegExp> = {far: /^Move P out$/, moment: /^Move P out$/, scale: /^Move P out$/, maximum: /^Move P out$/, infinite: /^Grow the (rod|disk)$/, center: /^Bring P down$/, near: /^Move P in$/, full: /^Open the arc$/, half: /^Add pieces$/};
    for (const problem of lessons) for (const limit of problem.limits) {
      const {container, getByRole, unmount} = render(<div style={{width: 560}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
      const name = container.querySelector<HTMLElement>('.limit-slider-name');
      expect(name, `${problem.id}/${limit.id}`).not.toBeNull();
      expect(name!.textContent, `${problem.id}/${limit.id}`).toMatch(expected[limit.mode]);
      expect(name!.checkVisibility(), 'seen, not only read out').toBe(true);
      // Beside the track, on its left, on the same line.
      const track = getByRole('slider', {name: 'Explore limiting case'}).closest('[data-slot=slider]')!.getBoundingClientRect(), box = name!.getBoundingClientRect();
      expect(box.right, `${problem.id}/${limit.id}`).toBeLessThanOrEqual(track.left);
      expect(Math.abs((box.top + box.bottom) / 2 - (track.top + track.bottom) / 2), `${problem.id}/${limit.id}`).toBeLessThan(box.height);
      unmount();
    }
    // The disks say disk, and the rods rod.
    const disk = getProblem('disk'), sheet = getProblem('sheet'), rod = getProblem('bisector');
    for (const [p, word] of [[disk, 'disk'], [sheet, 'disk'], [rod, 'rod']] as const) {
      const {container, unmount} = render(<Assessment problem={p} params={DEFAULT_PARAMS} limit={p.limits.find(l => l.mode === 'infinite')!} />);
      expect(container.querySelector('.limit-slider-name')!.textContent).toBe(`Grow the ${word}`);
      unmount();
    }
  });
});
