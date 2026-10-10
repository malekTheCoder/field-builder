import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// Measured with the page's own type: the board's lines and the transport's algebra are KaTeX, and
// their heights decide what fits in a window.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* THE RUN, WHERE THE READER CAN SEE IT.
 *
 * "Watch it build" plays on the figure, writes a line of algebra per stage and ends on the answer. On a
 * laptop the line being written and the answer fell below the window beside a figure that was drawing
 * them; on a phone the answer arrived under the window; a line of the board played its stage on a
 * figure a screen away; and on a short Chromebook window the drawing was cut off before anything ran.
 * These check what is on screen, in the windows readers have. They also check that a frame of the run
 * is never saved as if it were the reader's settings, and that the run is about what the reader chose. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 await page.viewport(1280, 800);
});
async function openLesson(id: string, width = 1280, height = 800, seen = true) {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
/** Drag along the bar to the very end of the run, where it settles on its answer. */
function scrubToEnd(view: {container: HTMLElement}) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const last = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')].at(-1)!.getBoundingClientRect();
 fireEvent.pointerDown(track, {clientX: last.right - 40, button: 0, pointerId: 9});
 fireEvent.pointerMove(track, {clientX: last.right, pointerId: 9});
 fireEvent.pointerUp(track, {clientX: last.right, pointerId: 9});
}
const box = (view: {container: HTMLElement}, selector: string) => view.container.querySelector(selector)!.getBoundingClientRect();
const onScreen = (r: DOMRect) => r.top >= -1 && r.bottom <= window.innerHeight + 1;
describe('what is saved is the lesson, not a frame of the run', () => {
 it('the address and the stored lesson carry no stage, and the cut is never saved as gone', async () => {
  const view = await openLesson('ring');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  // Past the save's settle: a teacher copying the address now would have shared ?mode=project&pair=1.
  await new Promise(r => setTimeout(r, 400));
  expect(location.search).not.toMatch(/mode|pair|components|continuum/);
  scrubToEnd(view);
  await waitFor(() => expect(view.container.querySelector('.cd-footer[data-dim="pieces"]')?.textContent).toBe('In the limit'));
  await new Promise(r => setTimeout(r, 400));
  // A run left at its end saved continuum=1, and every later visit opened on a smooth ring.
  expect(location.search).not.toMatch(/mode|continuum/);
  const stored = JSON.parse(localStorage.getItem('field-builder:explorer:v1') ?? '{}');
  expect(stored.params?.ring?.continuum ?? 0).toBe(0);
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
 }, 20000);
});
describe('the run is about what the reader chose', () => {
 it('a piece picked while the run is open becomes the run\'s piece', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 2: One piece'}));
  const chosen = () => view.container.querySelector<SVGGElement>('.cd-piece.is-selected')?.dataset.pieceKey;
  await waitFor(() => expect(chosen()).toBeTruthy());
  const other = [...view.container.querySelectorAll<SVGGElement>('.cd-piece:not(.is-selected)')][1];
  fireEvent.pointerDown(other);
  await waitFor(() => expect(chosen()).toBe(other.dataset.pieceKey));
 });
 it('opens on the whole distribution, whatever part of it was bracketed', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.container.querySelector('.ew-bounds .ew-disclosure')!);
  fireEvent.change(await view.findByLabelText('Lower bound'), {target: {value: '0'}});
  fireEvent.click(view.getByRole('button', {name: 'Apply interval'}));
  await waitFor(() => expect(view.container.querySelector('.ew-result.is-partial')).toBeTruthy());
  // The captions then said the sideways parts cancel, which a half-rod sum does not do.
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(view.container.querySelector('.ew-result.is-partial')).toBeNull());
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 });
});
describe('on a laptop the board follows the run beside the figure', () => {
 it('each stage\'s line, and at the end the answer, is on screen with the figure', async () => {
  const view = await openLesson('bisector', 1366, 768);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  const names = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
  for (const [i, name] of names.entries()) {
   fireEvent.click(view.getByRole('button', {name: `Stage ${i + 1}: ${name}`}));
   await waitFor(() => {
    const here = box(view, '.db-step.is-here'), panel = box(view, '.exp-workspace>.ew-panel');
    expect(here.top, `${name} starts above the panel`).toBeGreaterThanOrEqual(Math.max(panel.top, 0) - 1);
    expect(here.bottom, `${name} runs below the window`).toBeLessThanOrEqual(Math.min(panel.bottom, window.innerHeight) + 1);
   }, {timeout: 4000});
  }
  scrubToEnd(view);
  await waitFor(() => {
   expect(onScreen(box(view, '.ew-result')), 'the answer is off screen').toBe(true);
   expect(onScreen(box(view, '.cd-stage')), 'the figure left the screen').toBe(true);
  }, {timeout: 4000});
 }, 30000);
});
describe('on a phone the run stays where it can be seen', () => {
 it('the answer the run ends on arrives on screen, under the figure', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  // The transport keeps one height from stage to stage: everything under it moved at each one.
  const heights = new Set<number>();
  for (const [i, name] of ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'].entries()) {
   fireEvent.click(view.getByRole('button', {name: `Stage ${i + 1}: ${name}`}));
   heights.add(Math.round(box(view, '.bp-now').height));
  }
  expect([...heights]).toHaveLength(1);
  scrubToEnd(view);
  await waitFor(() => {
   expect(box(view, '.exp-walk').bottom, 'the integral and the answer are under the window').toBeLessThanOrEqual(window.innerHeight + 1);
   expect(box(view, '.cd-stage').top, 'the drawing went off the top').toBeGreaterThanOrEqual(-1);
  }, {timeout: 4000});
 }, 20000);
 it('a line of the board plays its stage on a figure that is brought on screen', async () => {
  const view = await openLesson('bisector', 390, 844);
  const line = view.getByRole('button', {name: 'What cancels: play this step on the figure'});
  line.scrollIntoView();
  expect(onScreen(box(view, '.cd-stage'))).toBe(false);
  fireEvent.click(line);
  await waitFor(() => expect(onScreen(box(view, '.cd-stage')), 'the stage played off screen').toBe(true), {timeout: 4000});
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 });
});
describe('a short window', () => {
 it('shows the whole drawing on the first screen of a Chromebook, and the stage\'s sentence once the run opens', async () => {
  const view = await openLesson('ring', 1366, 657);
  expect(box(view, '.cd-stage').bottom, 'the drawing is cut off by the window').toBeLessThanOrEqual(window.innerHeight);
  const before = box(view, '.cd-stage').top + scrollY;
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  // The heading row keeps its height without the button, so the figure does not jump as the run opens.
  expect(box(view, '.cd-stage').top + scrollY).toBeCloseTo(before, 0);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await waitFor(() => {
   expect(box(view, '.bp-now').bottom, 'the stage\'s sentence is under the window').toBeLessThanOrEqual(window.innerHeight + 1);
   expect(box(view, '.cd-stage').top).toBeGreaterThanOrEqual(-1);
  }, {timeout: 4000});
 });
 it('a phone on its side fits the drawing and the transport together', async () => {
  const view = await openLesson('bisector', 844, 390);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await waitFor(() => {
   expect(onScreen(box(view, '.cd-stage')), 'the drawing').toBe(true);
   expect(onScreen(box(view, '.exp-walk')), 'the transport').toBe(true);
  }, {timeout: 4000});
 });
});
describe('a teacher\'s link', () => {
 it('still shows a first-time student where to start', async () => {
  await page.viewport(1280, 800);
  await new Promise(r => setTimeout(r, 280));
  localStorage.clear();
  window.history.replaceState(null, '', '/?p=ring');
  const view = render(<Explorer />);
  await view.findByRole('button', {name: 'Watch it build'});
  await waitFor(() => expect(document.querySelector('.start-here')).toBeTruthy());
 });
});
