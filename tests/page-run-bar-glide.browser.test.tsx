import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import '../app/globals.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* THE TRANSPORT'S BAR GLIDES AT THE RUN'S FRAME RATE.
 *
 * "It doesn't slide smoothly", while the run plays and when it is dragged. The fill and the knob were drawn by a
 * render of the transport on each tick of the run's clock, a React update committed after the frame that moved the
 * clock -- and with the figure's own redraw where the figure moved too -- so the bar moved in steps of whatever the
 * page took to draw. Now every tick writes them straight onto the page, as transforms, in the frame the clock moved.
 *
 * So these hand the run its frames and read the bar after each one WITHOUT letting React render in between: the
 * knob must already be where the clock is, the same step every frame, with no ease trailing it. */
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
/** Where the knob is, as a share of its stage's segment, read off the page as it stands. */
const knob = (view: View) => {
 const carrier = view.container.querySelector<HTMLElement>('.bp-seg.is-here .bp-knob-track');
 const m = carrier?.style.transform.match(/translateX\(([-\d.]+)%\)/);
 return m ? Number(m[1]) / 100 : NaN;
};
const fill = (view: View) => new DOMMatrix(view.container.querySelector<HTMLElement>('.bp-seg.is-here .bp-seg-fill')!.style.transform).a;
describe('the run\'s bar', () => {
 let queue: FrameRequestCallback[] = [];
 let realRaf: typeof window.requestAnimationFrame, realCancel: typeof window.cancelAnimationFrame;
 beforeEach(() => {
  queue = [];
  realRaf = window.requestAnimationFrame; realCancel = window.cancelAnimationFrame;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
 });
 afterEach(() => { window.requestAnimationFrame = realRaf; window.cancelAnimationFrame = realCancel; });
 /** One frame of the run, with no React render after it: what the page shows is what the frame itself wrote. */
 const bare = (t: number) => { for (const cb of queue.splice(0)) cb(t); };
 it('moves the same step on every frame while it plays, with nothing easing behind it', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  const at: number[] = [];
  for (let t = 0; t <= 3000; t += 16) {
   bare(t);
   at.push(knob(view));
   // The fill and the knob say the same thing in the same frame.
   expect(fill(view)).toBeCloseTo(at[at.length - 1], 4);
  }
  // Past the opening's wait for the page to settle (see `hold` in Explorer), each frame is sixteen milliseconds of
  // a five-second stage further on: the same step every time.
  const moving = at.findIndex((x, i) => i > 0 && x > at[i - 1]);
  expect(moving, 'the knob never moved').toBeGreaterThan(0);
  const steps = at.slice(moving).map((x, i, a) => i ? x - a[i - 1] : NaN).slice(1);
  expect(steps.length).toBeGreaterThan(40);
  for (const step of steps) expect(step).toBeCloseTo(.016 / 5, 5);
  // And nothing eases it: a transition would draw the bar behind the clock it shows.
  for (const el of [view.container.querySelector('.bp-seg.is-here .bp-knob-track')!, view.container.querySelector('.bp-seg.is-here .bp-seg-fill')!])
   expect(getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0)).toBe(true);
  act(() => {});
 }, 30000);
 it('follows a drag along the bar on every move of the pointer', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  act(() => {});
  const track = view.container.querySelector<HTMLElement>('.bp-track')!;
  const seg = view.container.querySelectorAll<HTMLElement>('.bp-seg')[0].getBoundingClientRect();
  fireEvent.pointerDown(track, {clientX: seg.left - 8, clientY: seg.top + 10, button: 0, pointerId: 3});
  for (const f of [.1, .2, .35, .5, .65, .8]) {
   fireEvent.pointerMove(track, {clientX: seg.left + f * seg.width, clientY: seg.top + 10, pointerId: 3});
   expect(knob(view), `dragged to ${f}`).toBeCloseTo(f, 2);
   expect(fill(view)).toBeCloseTo(f, 2);
  }
  fireEvent.pointerUp(track, {clientX: seg.left + .8 * seg.width, clientY: seg.top + 10, pointerId: 3});
  act(() => {});
 }, 30000);
});
