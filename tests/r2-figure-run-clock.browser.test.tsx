import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* WHAT CANCELS RUNS ON THE RUN'S OWN CLOCK.
 *
 * The two sideways parts used to shrink into P on a timer of their own -- a second's wait, a
 * second's shrink -- started when the pair first appeared. So the figure did what the timer said,
 * not what the run said: paused on the stage's first frame, the pair was gone two seconds later;
 * replayed from the board, stepped back into, or clicked again, it never came back, because nothing
 * restarted the timer; and the stage's held last frame showed only the part that survives, under a
 * caption saying two parts had cancelled. These read the pair off the shipped Explorer at moments
 * the run's clock is holding still, which is exactly where the timer and the clock disagreed. */
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
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
function stage(view: View, n: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: `Stage ${n}: ${NAMES[n - 1]}`}));
}
/** Drag the transport to `f` of the way through stage `i` (0-based) and let go: the run holds there.
 * A browser follows the release with a click on the stage under it, which the transport swallows as
 * the end of a drag -- sent here too, or it would swallow the next real click instead. */
function scrub(view: View, i: number, f: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const segment = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][i], seg = segment.getBoundingClientRect();
 const x = seg.left + f * seg.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(segment, {clientX: x});
}
const length = (line: Element) => Math.hypot(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')), Number(line.getAttribute('y2')) - Number(line.getAttribute('y1')));
const parts = (view: View) => [...view.container.querySelectorAll<SVGGElement>('[data-cancel-transverse]')];
/** Both sideways parts drawn whole: fully opaque, and long enough to read as arrows. */
function whole(view: View) {
 const pair = parts(view);
 expect(pair.length).toBe(2);
 for (const g of pair) {
  expect(Number(g.getAttribute('opacity')), g.dataset.cancelTransverse).toBe(1);
  expect(length(g.querySelector('.cd-vector line')!), g.dataset.cancelTransverse).toBeGreaterThanOrEqual(18);
 }
}
describe('paused on What cancels, the pair stays where the clock is', () => {
 // Two and a half seconds is past the old timer's whole second of waiting and second of shrinking.
 for (const id of ['bisector', 'ring', 'arc']) it(`${id}: still whole after the clock has stood still for 2.5 s`, async () => {
  const view = await openLesson(id);
  stage(view, 3);
  // A click on a stage goes to its start and holds there: the transport offers Play, not Pause.
  expect(view.getByRole('button', {name: 'Play'})).toBeTruthy();
  await waitFor(() => whole(view));
  await new Promise(r => setTimeout(r, 2500));
  whole(view);
 }, 30000);
});
describe('the stage\'s end keeps what cancelled', () => {
 it('held late in the stage, the pair has met and gone, and a faint ghost of each part is still drawn', async () => {
  const view = await openLesson('bisector');
  stage(view, 3);
  scrub(view, 2, .9);
  await waitFor(() => expect(Number(parts(view)[0]?.getAttribute('opacity') ?? 0)).toBeLessThan(.2));
  const ghosts = [...view.container.querySelectorAll<SVGGElement>('[data-cancel-ghost] .cd-vector')];
  expect(ghosts.length).toBe(2);
  for (const g of ghosts) {
   const line = g.querySelector('line')!;
   const opacity = Number(getComputedStyle(line).opacity);
   expect(opacity).toBeGreaterThan(.1);
   expect(opacity).toBeLessThan(.5);
   // Full length: the ghost is the part as it was, not as it shrank.
   expect(length(line)).toBeGreaterThanOrEqual(18);
  }
  // Still named, so a paused or printed frame says what went.
  expect(new Set(ghosts.map(g => g.querySelector('.cd-vector-label')?.getAttribute('data-symbol')))).toEqual(new Set(['ΔE_y', '−ΔE_y']));
 }, 20000);
});
describe('every way back into the stage starts it whole', () => {
 it('replayed from the board after it has played, the pair is whole again', async () => {
  const view = await openLesson('bisector');
  stage(view, 3);
  scrub(view, 2, .9);
  await waitFor(() => expect(Number(parts(view)[0]?.getAttribute('opacity') ?? 0)).toBeLessThan(.2));
  fireEvent.click(view.getByRole('button', {name: 'What cancels: play this step on the figure'}));
  await waitFor(() => whole(view));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 20000);
 it('stepped back into from Add them up, the pair is whole again', async () => {
  const view = await openLesson('bisector');
  stage(view, 3);
  scrub(view, 2, .9);
  await waitFor(() => expect(Number(parts(view)[0]?.getAttribute('opacity') ?? 0)).toBeLessThan(.2));
  stage(view, 4);
  await waitFor(() => expect(parts(view).length).toBe(0));
  fireEvent.click(view.getByRole('button', {name: 'Previous stage'}));
  await waitFor(() => whole(view));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 20000);
});
