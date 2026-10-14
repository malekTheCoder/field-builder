import {cleanup, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {page} from 'vitest/browser';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';

afterEach(async () => { cleanup(); await page.viewport(1280, 800); });
it('a phone keeps the charge-element formula separate from the arrow-scale note', async () => {
 await page.viewport(390, 844);
 for (const id of ['sheet', 'infinite', 'semi', 'disk', 'bisector', 'arc', 'ramp'] as const) for (const charge of [-5, 5]) for (const key of ['one', 'cancel'] as const) {
  const view = render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, charge}} setParams={vi.fn()}
   count={5} continuum={0} selected={1} onSelect={vi.fn()} progress={1} components={true} pair={true} mode="project" compact
   build={{key, name: key === 'one' ? 'One piece' : 'What cancels', index: key === 'one' ? 1 : 2, count: 5, paused: true}} />);
  const formula = view.container.querySelector<SVGTextElement>('.cd-footer-math')!, note = view.container.querySelector<SVGTextElement>('.cd-footer[data-dim="pieces"]')!;
  const f = formula.getBBox(), n = note.getBBox();
  expect(n.x - f.x - f.width, `${id}, ${key}, Q=${charge}: ${formula.textContent} / ${note.textContent}`).toBeGreaterThanOrEqual(12);
  // A shorter warning still tells the reader that the arrow is magnified; the charge expression remains whole.
  if (id === 'sheet') expect(formula.textContent).toContain('sec');
  cleanup();
 }
}, 120000);
