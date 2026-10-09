import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {intervalKey} from '../src/diagrams/subdivision';
/* THE PIECE THE RUN TALKS ABOUT, ON A ROD SEEN FROM ITS BISECTOR, IS THE END PIECE.
 *
 * It was the piece three quarters of the way along: at five pieces, y = 0.8 m, seen fifteen degrees
 * off the perpendicular, so its sideways part was about a quarter of its arrow and "What cancels"
 * had almost nothing to cancel. The end piece is seen at twenty-eight degrees, its sideways part
 * nearly half the arrow, and its mirror is the first piece. */
afterEach(() => {
 cleanup();
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
describe('the run on the bisector', () => {
 for (const id of ['bisector', 'v-rod-bisector'] as const) it(`${id}: talks about the last piece, and its mirror is the first`, async () => {
  const view = await openLesson(id);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  await waitFor(() => expect(view.container.querySelector('.cd-piece.is-partner')).toBeTruthy());
  const chosen = view.container.querySelector<SVGGElement>('.cd-piece.is-selected')?.dataset.pieceKey;
  const mirror = view.container.querySelector<SVGGElement>('.cd-piece.is-partner')?.dataset.pieceKey;
  // Five pieces, the default.
  expect(chosen).toBe(intervalKey(4, 5));
  expect(mirror).toBe(intervalKey(0, 5));
 });
});
