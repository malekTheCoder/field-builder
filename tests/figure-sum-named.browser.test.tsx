import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* WHAT THE SUM IS, SAID ON THE FIGURE.
 *
 * "What does sum of delta V even represent?" The column at P was named "Σ ΔV", and the chain "Σ ΔE", from the
 * first piece in to the last, and nothing on the figure said what that sum was. Once every piece is in, it is
 * the potential (the field) at P, nearly: ≈ while the pieces are finite, = where the sum is exact at any cut,
 * and the bare V or E once the pieces have shrunk away. While the pieces are going in it is only a sum so far. */
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
function scrub(view: View, stage: number, f: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[stage].getBoundingClientRect(), x = r.left + f * r.width;
 fireEvent.pointerDown(track, {clientX: x - 16, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
const sumName = (view: View, scalar: boolean) => scalar
 ? view.container.querySelector('[data-gauge-name]')?.textContent
 : [...view.container.querySelectorAll('.cd-vector-label')].map(t => t.getAttribute('data-symbol')).find(s => s === 'E' || !!s?.includes('Σ'));
describe('the sum at P says what it is', () => {
 for (const [id, scalar, done] of [['v-rod-bisector', true, 'V ≈ Σ ΔV'], ['v-ring', true, 'V = Σ ΔV'], ['bisector', false, 'E ≈ Σ ΔE'], ['ring', false, 'E = Σ ΔE']] as const) it(id, async () => {
  const view = await openLesson(id);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  // Half the pieces in: a sum so far, not yet the potential or the field. (The field's sum is named only where it is
  // long enough to hold a name beside the pair going in, so it is read where it is named.)
  scrub(view, 3, .4);
  await waitFor(() => expect(sumName(view, scalar) ?? 'Σ ΔE').toBe(scalar ? 'Σ ΔV' : 'Σ ΔE'));
  // Every piece in: the answer, nearly or exactly.
  scrub(view, 3, .97);
  await waitFor(() => expect(sumName(view, scalar)).toBe(done));
  // Still so while the pieces shrink, and the bare letter once they are gone.
  scrub(view, 4, .3);
  await waitFor(() => expect(sumName(view, scalar)).toBe(done));
  scrub(view, 4, 1);
  await waitFor(() => expect(sumName(view, scalar)).toBe(scalar ? 'V' : 'E'), {timeout: 5000});
 }, 30000);
});
