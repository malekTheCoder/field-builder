import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* THE LESSON'S ONE BUTTON IS ON ITS FIRST SCREEN.
 *
 * "Watch it build" sat under the figure and the figure's toolbar, with its top at 919 pixels on a
 * 1440 by 900 screen -- below the fold of a laptop, whose browser shows about 800 of those, and of
 * a 1280 by 720 projector. A first-time reader never saw the feature the lesson is built around,
 * while the one hand-drawn cue on the page pointed at the tour instead. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 await page.viewport(1280, 800);
});
async function openLesson(id: string, seen = true) {
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: seen, cued: seen, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 // A first visit opens on the tour; the cue waits for it to close.
 if (!seen) fireEvent.click(await view.findByRole('button', {name: 'Skip intro'}));
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
describe('the first screen', () => {
 for (const [w, h] of [[1440, 800], [1280, 720]] as const) it(`shows Watch it build without scrolling at ${w} by ${h}`, async () => {
  await page.viewport(w, h);
  const view = await openLesson('bisector');
  const button = view.getByRole('button', {name: 'Watch it build'});
  const box = button.getBoundingClientRect();
  expect(box.height).toBeGreaterThan(0);
  expect(box.top).toBeGreaterThanOrEqual(0);
  expect(box.bottom, 'the button ends below the window').toBeLessThan(window.innerHeight);
  // In the figure's own heading, opposite the point it is about -- not somewhere above the lesson.
  expect(button.closest('.exp-diagram-heading')).toBeTruthy();
 }, 15000);

 it('points the first-visit cue, after the tour, at the button, not at the tour', async () => {
  await page.viewport(1440, 800);
  const view = await openLesson('bisector', false);
  const button = view.getByRole('button', {name: 'Watch it build'});
  const cue = await waitFor(() => { const el = document.querySelector<HTMLElement>('.start-here'); expect(el).toBeTruthy(); return el!; });
  const target = button.getBoundingClientRect(), tour = view.getByRole('button', {name: 'Walkthrough'}).getBoundingClientRect();
  // Centred under the control it points at, and hanging just below it.
  await waitFor(() => expect(Math.abs(parseFloat(cue.style.left) - (target.left + target.width / 2))).toBeLessThan(2));
  expect(parseFloat(cue.style.top)).toBeCloseTo(target.bottom + 10, 0);
  expect(Math.abs(parseFloat(cue.style.left) - (tour.left + tour.width / 2))).toBeGreaterThan(40);
 }, 15000);

 it('opening the run hands focus to its play button and brings the transport into view', async () => {
  await page.viewport(1280, 720);
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  // The button that was pressed is gone; the control that replaces it has the focus, so a keyboard
  // reader is not dropped back at the top of the page.
  await waitFor(() => expect(document.activeElement?.classList.contains('bp-play')).toBe(true));
  // The transport opened under the figure. Brought into view -- or, where the figure and the
  // transport do not both fit, the page goes only as far as the top of the figure.
  await waitFor(() => {
   const card = view.container.querySelector('.exp-diagram-card')!.getBoundingClientRect();
   const transport = view.container.querySelector('.bp')!.getBoundingClientRect();
   expect(card.top, 'the figure was scrolled off the top').toBeGreaterThanOrEqual(0);
   expect(transport.bottom <= window.innerHeight || card.top <= 13, `transport ends at ${transport.bottom} in ${window.innerHeight}`).toBe(true);
  }, {timeout: 4000});
  // Pause the run so it does not play on into the next test.
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 15000);
});
