import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {page} from 'vitest/browser';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';

const realMedia = window.matchMedia;
beforeEach(() => {
 window.matchMedia = (q: string) => q.includes('prefers-reduced-motion')
  ? {matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} as unknown as MediaQueryList
  : realMedia.call(window, q);
});
afterEach(async () => {cleanup(); window.matchMedia = realMedia; await page.viewport(1280, 800);});
it('the flat phone disk keeps its own radius clear of the integration limits', async () => {
 await page.viewport(390, 844);
 for (const size of [4, 1, 8]) for (const distance of [2.5, .5, 6]) for (const charge of [5, -5]) for (const key of ['add', 'limit'] as const) {
  const view = render(<ChargeDiagram problem={getProblem('disk')} params={{...DEFAULT_PARAMS, size, distance, charge}} setParams={vi.fn()}
   count={key === 'limit' ? 30 : 3} continuum={key === 'limit' ? 1 : 0} selected={1} onSelect={vi.fn()} progress={key === 'limit' ? 1 : .55}
   components={false} pair={false} mode={key === 'limit' ? 'integrate' : 'sum'} onBoundRangeChange={vi.fn()} compact build={{key, name: key === 'add' ? 'Add them up' : 'Shrink them', index: key === 'add' ? 3 : 4, count: 5, paused: true}} />);
  fireEvent.click(view.getByRole('button', {name:'2D'}));
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeNull(), {timeout: 5000});
  const radius = view.container.querySelector<SVGTextElement>('[data-dim="size"] text')!;
  const radii = [...view.container.querySelectorAll<SVGTextElement>('.cd-dimension > text')].filter(t => t.textContent === 'R' || t.textContent === 's');
  const limits = [...view.container.querySelectorAll<SVGTextElement>('.cd-bound-name text, .cd-bound[data-bound] text')];
  expect(limits).toHaveLength(2);
  const context = `R=${size/2}, z=${distance}, Q=${charge}, ${key}`;
  await waitFor(() => {
   expect(view.container.querySelector('[data-rim="true"]'), `${context}: enough room for the true-radius dimension`).toBeNull();
   const placed=(t:SVGTextElement)=>{const b=t.getBBox(), m=t.transform.baseVal.consolidate()?.matrix;return {x:b.x+(m?.e??0),y:b.y+(m?.f??0),width:b.width,height:b.height};};
   const r=placed(radius);
   expect(r.y+r.height, `${context}: radius above footer`).toBeLessThanOrEqual(378.5);
   for (const name of radii) for (const limit of limits) {
    const a = placed(name), b = placed(limit);
    const gap = Math.max(b.x-a.x-a.width,a.x-b.x-b.width,b.y-a.y-a.height,a.y-b.y-b.height);
    expect(gap, `${context}: ${name.textContent} / ${limit.textContent}`).toBeGreaterThan(4);
   }
  });
  cleanup();
 }
}, 120000);
