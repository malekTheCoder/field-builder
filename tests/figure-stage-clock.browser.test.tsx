import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import '../app/globals.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* THE CUTS AND THE ARROWS' GROWTH RUN ON THE RUN'S CLOCK.
 *
 * Cut it up makes its cuts one after another, and One piece grows its arrow out of P. Both were CSS
 * animations on the wall clock: paused on the run's first frame, the cuts went on to finish two and a half
 * seconds later; paused as One piece began, the arrow grew to full length anyway; scrubbed within Cut it
 * up, the cuts never moved. A paused frame must be the frame the clock is at. No animation is switched off
 * here, unlike the figure's other browser tests: the animations are what is being tested. */
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
/** Drag the transport to `f` of the way through stage `i` (from 0) and let go: the run holds there. */
function scrub(view: View, i: number, f: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][i].getBoundingClientRect(), x = seg.left + f * seg.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
const seams = (view: View) => [...view.container.querySelectorAll('.cd-stage-pieces .cd-seam')].map(s => Number(getComputedStyle(s).opacity));
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
describe('the cuts and the arrows\' growth are the frame the clock is at', () => {
 it('held on Cut it up\'s first frame, no cut is made; scrubbed near its end, every one is', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  scrub(view, 0, 0);
  await waitFor(() => expect(view.container.querySelector('.cd-stage-pieces')).toBeTruthy());
  await wait(2800);
  expect(seams(view).length).toBe(4);
  for (const o of seams(view)) expect(o, 'a cut made while the run stood still').toBeLessThan(.05);
  scrub(view, 0, .9);
  await waitFor(() => { for (const o of seams(view)) expect(o).toBeGreaterThan(.95); }, {timeout: 3000});
 }, 30000);
 it('held as One piece begins, the piece\'s arrow has not grown', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  scrub(view, 1, .01);
  await waitFor(() => expect(view.container.querySelector('.cd-stage-one .cd-grow')).toBeTruthy());
  await wait(1500);
  const scale = new DOMMatrix(getComputedStyle(view.container.querySelector('.cd-stage-one .cd-grow')!).transform).a;
  expect(scale, 'grown to full length while the run stood still').toBeLessThan(.9);
  scrub(view, 1, .5);
  await waitFor(() => expect(new DOMMatrix(getComputedStyle(view.container.querySelector('.cd-grow')!).transform).a).toBeGreaterThan(.99), {timeout: 3000});
 }, 30000);
});
