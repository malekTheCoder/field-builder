import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Problem} from '../src/problems/types';
import {lessonWorking} from '../src/state/artifact';
/* THE HANDOUT AND THE PROJECTOR SHOW ONE DERIVATION.
 *
 * The offline copy's working came from lessonWorking in src/state/artifact.ts, and the panel's Unfold
 * from a list EquationWorkbench built for itself. The panel gained four branches the copy never did,
 * so on the semi-infinite line, the disk, the arc and the rod on its axis a lecturer who projected the
 * page and handed out the copy gave a class two routes to one answer. Here the panel's Unfold, line
 * for line, must be the copy's -- on every lesson and on the infinite line's finite-rod route. */
afterEach(cleanup);
function unfolded(p: Problem, route: Problem) {
  const view = render(<EquationWorkbench problem={p} derivationProblem={route} params={DEFAULT_PARAMS} continuum={0} progress={1}
    mode="divide" onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} />);
  fireEvent.click(view.getByRole('button', {name: /Unfold the integration/}));
  for (let i = 0; i < 30 && view.queryByRole('button', {name: /Next step/}); i++) fireEvent.click(view.getByRole('button', {name: /Next step/}));
  // Each step's displayed line: the TeX KaTeX keeps beside the block it set, not the sentence's symbols.
  return [...view.container.querySelectorAll('.ew-worked-step')].map(step =>
    [...step.querySelectorAll('annotation')].filter(a => !a.closest('p')).map(a => a.textContent ?? '').join(''));
}
it('every lesson’s Unfold is the offline copy’s working, line for line', () => {
  const cases = [...PROBLEMS.map(p => [p, p] as const), [getProblem('infinite', 'angular'), getProblem('infinite', 'limit')] as const];
  for (const [p, route] of cases) {
    const {worked, back} = lessonWorking(p, route);
    expect(unfolded(p, route), `${p.id}/${route.variable}`).toEqual([...worked, ...back].map(w => w.tex));
    cleanup();
  }
}, 30000);
