import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE ROD ON ITS BISECTOR KEEPS ITS LABELS IN SPACE.
 *
 * Its L, r and the ends' ±L/2 are laid by the flat view's fixed rows, and its Δy bracket and the piece's y by the flat
 * triangle, so turned into space all of them were hidden: the potential lesson, whose answer is a function of L and r
 * alone, showed neither, and its board's ΔQ = λΔy and r_i = √(y² + r²) had no Δy, dy or y on the figure. They are drawn
 * through the projection now, on true segments, as the arc's and the axis rod's terms already were. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 localStorage.clear();
 await page.viewport(1280, 800);
});
async function openInSpace(id: 'v-rod-bisector' | 'bisector') {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS}}}));
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id).title));
 fireEvent.click(view.getByRole('button', {name: '3D'}));
 await waitFor(() => expect(view.container.querySelector('.charge-diagram')?.classList.contains('cd-in-space')).toBe(true));
 // The camera glides from the flat view to the opening one.
 await new Promise(r => setTimeout(r, 1400));
 return view;
}
type View = Awaited<ReturnType<typeof openInSpace>>;
async function stage(view: View, n: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 await waitFor(() => expect(view.queryByRole('button', {name: /^Stage 1: /})).toBeTruthy());
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: `)}));
 await new Promise(r => setTimeout(r, 300));
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][n - 1], track = view.container.querySelector<HTMLElement>('.bp-track')!, box = seg.getBoundingClientRect(), x = box.left + .98 * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')!.dataset.moving).toBe('false'), {timeout: 6000}).catch(() => undefined);
 await new Promise(r => setTimeout(r, 1300));
}
const shown = (t: Element) => {
 if ((t as HTMLElement).dataset?.placerHidden || t.closest('.is-hidden,[opacity="0"]')) return false;
 for (let e: Element | null = t; e && e !== document.body; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < .2) return false;
 const r = t.getBoundingClientRect();
 return r.width > 0 && r.height > 0;
};
const names = (view: View) => [...view.container.querySelectorAll<SVGTextElement>('.cd-svg text')].filter(shown).map(t => (t.textContent ?? '').replace(/\s+/g, ' '));
describe('the rod on its bisector in space', () => {
 it('v-rod-bisector: L, r and both ends at rest; Δy as it is cut, y and Δy for one piece, dy in the limit', async () => {
  const view = await openInSpace('v-rod-bisector');
  for (const term of ['L', 'r', '+L/2', '−L/2']) expect(names(view), `at rest: ${term}`).toContain(term);
  await stage(view, 1);
  expect(names(view), 'Cut it up: Δy').toContain('Δy');
  await stage(view, 2);
  expect(names(view), 'One piece: the piece\'s y').toContain('y');
  expect(view.container.querySelector('[data-piece-coordinate] text')?.textContent).toBe('y');
  expect(names(view), 'One piece: Δy').toContain('Δy');
  await stage(view, 5);
  expect(names(view), 'Shrink them: dy').toContain('dy');
 }, 60000);
 it('bisector: the field lesson keeps L and r in space too', async () => {
  const view = await openInSpace('bisector');
  for (const term of ['L', 'r']) expect(names(view), `at rest: ${term}`).toContain(term);
 }, 60000);
});
