import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE RUN'S TRANSPORT AND THE CONTROLS AROUND IT. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLesson(id: string, params: Partial<typeof DEFAULT_PARAMS> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
/** Drag along the bar to the very end of the run, which is where it settles on its answer. */
function scrubToEnd(view: {container: HTMLElement}) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const last = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')].at(-1)!.getBoundingClientRect();
 fireEvent.pointerDown(track, {clientX: last.right - 40, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: last.right, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: last.right, pointerId: 7});
}
describe('the run settled', () => {
 it('gives every line of the answer where the panel is out of sight: the rod seen off its end has an E_y', async () => {
  // At or below 1000 pixels the panel is under the figure, and the transport carries the algebra.
  await page.viewport(900, 1000);
  const view = await openLesson('endpoint');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(view.container.querySelector('.bp-track')).toBeTruthy());
  scrubToEnd(view);
  // Settled on the answer: the stage says so, and the bar has not moved out from under the drag.
  expect(view.container.querySelector('.bp-line')?.textContent).toMatch(/^Shrink them\./);
  const tex = () => [...view.container.querySelectorAll('.bp-math annotation')].map(a => a.textContent ?? '');
  await waitFor(() => expect(tex().some(t => t.startsWith('E_y')), tex().join(' | ')).toBe(true));
  expect(tex().some(t => t.startsWith('E_x'))).toBe(true);
  expect(getComputedStyle(view.container.querySelector('.bp-math')!).display).not.toBe('none');
 }, 15000);
});
describe('the transport on a phone', () => {
 it('names no stage, the last included', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  const segments = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')];
  await waitFor(() => expect(segments.at(-1)!.classList.contains('is-here')).toBe(true));
  // The bar is the width of the phone. The algebra the transport carries on a narrow screen used to
  // size its one column, and on the last stage the bar ran thousands of pixels off to the right.
  const track = view.container.querySelector<HTMLElement>('.bp-track')!.getBoundingClientRect();
  expect(track.right, 'the bar runs off the screen').toBeLessThanOrEqual(window.innerWidth);
  // A container rule brought the playing stage's name back when it was the last, and outranked the
  // phone's rule, so the bar named its fifth stage and no other.
  for (const name of view.container.querySelectorAll<HTMLElement>('.bp-seg-name')) expect(getComputedStyle(name).display, name.textContent ?? '').toBe('none');
 }, 15000);
});
describe('the charge slider', () => {
 it('steps over zero rather than stopping on a charge of nothing', async () => {
  const view = await openLesson('bisector', {charge: .1});
  const slider = view.getAllByRole('slider').find(s => s.closest('[aria-label="Total charge Q"]') || s.getAttribute('aria-label') === 'Total charge Q')!;
  expect(slider).toBeTruthy();
  slider.focus();
  await userEvent.keyboard('{ArrowLeft}');
  await waitFor(() => expect(Number(slider.getAttribute('aria-valuenow'))).toBeCloseTo(-.1, 6));
  // And back, the way it was going.
  await userEvent.keyboard('{ArrowRight}');
  await waitFor(() => expect(Number(slider.getAttribute('aria-valuenow'))).toBeCloseTo(.1, 6));
  await userEvent.keyboard('{ArrowRight}');
  await waitFor(() => expect(Number(slider.getAttribute('aria-valuenow'))).toBeCloseTo(.2, 6));
 }, 15000);
});
