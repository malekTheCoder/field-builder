import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import 'katex/dist/katex.min.css';
import '../app/globals.css';
import {Assessment} from '../src/components/Assessment';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {limitPlot} from '../src/symbolic/physics';
afterEach(cleanup);
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
/* WAVE 2, THIRD PASS · CONTENT, AS DRAWN. On a desktop or a projector every limit formula spaced its
 * colon as a relation, "a ≪ L :", and twenty-two plots named their curve "Your exact field" on a page
 * where the reader computes nothing. */
describe('a limit card on a wide screen', () => {
  it('sets each condition’s colon as punctuation, \\colon, as a phone’s card already did', async () => {
    let checked = 0;
    for (const problem of [...PROBLEMS, getProblem('infinite', 'limit')]) for (const limit of problem.limits) {
      const {container, unmount} = render(<div style={{width: 640}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
      await frame();
      const tex = container.querySelector('.assessment > .math annotation')!.textContent!;
      expect(tex, `${problem.id}/${limit.id}`).not.toContain(':\\quad');
      if (limit.formula.includes(':\\quad')) { expect(tex, `${problem.id}/${limit.id}`).toContain('\\colon\\quad'); checked++; }
      unmount();
    }
    expect(checked).toBeGreaterThanOrEqual(28);
  }, 30000);
  it('names the exact curve for what it is, never as the reader’s', async () => {
    let unnamed = 0;
    for (const problem of [...PROBLEMS, getProblem('infinite', 'limit')]) for (const limit of problem.limits) {
      const {container, unmount} = render(<div style={{width: 640}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
      const legend = container.querySelector('.comparison-labels > span')!.textContent!;
      expect(legend, `${problem.id}/${limit.id}`).not.toMatch(/^Your\b/);
      if (!limitPlot(problem, limit).solid) { expect(legend).toBe(problem.quantity === 'V' ? 'The exact potential' : 'The exact field'); unnamed++; }
      unmount();
    }
    expect(unnamed).toBeGreaterThan(10);
  }, 30000);
});
