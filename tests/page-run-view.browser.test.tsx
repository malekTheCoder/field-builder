import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
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
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
/** The run's frames, in the test's hands: a run played in real time takes half a minute, and CI is
 * several times slower than a laptop. The clock is moved on fifty milliseconds a frame. */
function framesInHand() {
 let queue: FrameRequestCallback[] = [], t = 0;
 let realRaf: typeof window.requestAnimationFrame, realCancel: typeof window.cancelAnimationFrame;
 beforeEach(() => {
  queue = []; t = 0;
  realRaf = window.requestAnimationFrame; realCancel = window.cancelAnimationFrame;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
 });
 // Anything still waiting on a frame -- the figure's own animations -- gets one, so nothing stalls.
 afterEach(() => { window.requestAnimationFrame = realRaf; window.cancelAnimationFrame = realCancel; for (const cb of queue.splice(0)) cb(performance.now()); });
 const frame = () => { t += 50; const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); };
 /** Frames until `done` says so, yielding now and then so the page can lay out and scroll. */
 return async (done: () => boolean, most = 900) => { for (let i = 0; i < most && !done(); i++) { frame(); if (i % 25 === 24) await sleep(0); } };
}
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
describe('on a laptop, a run PLAYED to its end leaves its answer in view', () => {
 // A held board drew more than a playing one -- the stage's note, under its line -- and a run that plays
 // to its end holds on Shrink them: the note arrived after the answer had been brought into view and
 // pushed it back under the window. The test above reaches the end by seeking, which holds from the
 // start, so it never saw. These play the run, at its own pace, and look when it has stopped.
 const play = framesInHand();
 for (const [w, h] of [[1366, 768], [1280, 800]] as const) it(`at ${w} by ${h}`, async () => {
  const view = await openLesson('bisector', w, h);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  // At the pace of the real run: the answer arrives a couple of seconds before the run stops, so the
  // board has long since followed it there when the held stage's note opens above it.
  await play(() => !!view.container.querySelector('.ew-result.is-shown'));
  await sleep(900);
  await play(() => !!view.queryByRole('button', {name: 'Play again'}));
  expect(view.queryByRole('button', {name: 'Play again'})).toBeTruthy();
  await waitFor(() => {
   const answer = box(view, '.ew-result.is-shown'), panel = box(view, '.exp-workspace>.ew-panel');
   expect(answer.bottom, 'the answer is cut off').toBeLessThanOrEqual(Math.min(panel.bottom, window.innerHeight) + 1);
   expect(answer.top).toBeGreaterThanOrEqual(Math.max(panel.top, 0) - 1);
   expect(box(view, '.cd-stage').top, 'the figure left the screen').toBeGreaterThanOrEqual(-1);
  }, {timeout: 5000});
 }, 60000);
 it('a stage stepped with Next ends with the whole of its line in view beside the figure', async () => {
  const view = await openLesson('v-ring', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  fireEvent.click(view.getByRole('button', {name: 'Next stage'}));
  // The stage plays for six seconds: the board has followed its line long before it stops and holds.
  await play(() => view.container.querySelector('.bp-seg.is-here')?.getAttribute('aria-label') === 'Stage 4: Add them up');
  await sleep(900);
  await play(() => !view.queryByRole('button', {name: 'Pause'}));
  await waitFor(() => {
   const here = box(view, '.db-step.is-here'), panel = box(view, '.exp-workspace>.ew-panel');
   expect(here.bottom, 'the held line runs under the window').toBeLessThanOrEqual(Math.min(panel.bottom, window.innerHeight) + 1);
  }, {timeout: 5000});
 }, 60000);
 it('the new line is brought up as it opens, not three-quarters of a second later', async () => {
  const view = await openLesson('bisector', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 2: One piece'}));
  await sleep(900);
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  await play(() => view.container.querySelector('.bp-seg.is-here')?.getAttribute('aria-label') === 'Stage 3: What cancels');
  // Inside the follow's 650 ms second look: only the first, made as the line opens, has run.
  await sleep(350);
  const here = box(view, '.db-step.is-here'), panel = box(view, '.exp-workspace>.ew-panel');
  const shown = Math.min(panel.bottom, window.innerHeight) - panel.top;
  expect((here.top - panel.top) / shown, 'the line opened low and waited to be brought up').toBeLessThan(.4);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 60000);
});
describe('on a laptop the board is all there while the run is open', () => {
 it('as the run opens the page rises until the board is at its top, so its foot is in the window', async () => {
  const view = await openLesson('bisector', 1366, 768);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => {
   expect(box(view, '.exp-workspace>.ew-panel').bottom, 'the board runs on under the window').toBeLessThanOrEqual(window.innerHeight + 1);
   expect(box(view, '.cd-stage').top).toBeGreaterThanOrEqual(-1);
  }, {timeout: 4000});
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 });
 it('a line of the board brings the whole drawing on screen, not half of it', async () => {
  const view = await openLesson('ring', 1440, 900);
  // The ring's drawing two-fifths above the window: P and the cancelling arrows are in that part.
  const r = box(view, '.cd-stage');
  window.scrollTo(0, r.top + scrollY + r.height * .4);
  fireEvent.click(view.getByRole('button', {name: 'What cancels: play this step on the figure'}));
  await waitFor(() => expect(onScreen(box(view, '.cd-stage')), 'the stage played above the window').toBe(true), {timeout: 4000});
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 });
});
describe('on a phone the run stays where it can be seen', () => {
 it('the answer the run ends on arrives on screen, under the figure', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  // The transport keeps one height from stage to stage: everything under it moved at each one. Its
  // sentence and its algebra both -- the algebra was 46 pixels at one stage and 69 at the next.
  const heights = new Set<number>(), sentence = new Set<number>();
  for (const [i, name] of ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'].entries()) {
   fireEvent.click(view.getByRole('button', {name: `Stage ${i + 1}: ${name}`}));
   sentence.add(Math.round(box(view, '.bp-now').height));
   heights.add(Math.round(box(view, '.bp').height));
  }
  expect([...sentence]).toHaveLength(1);
  expect([...heights]).toHaveLength(1);
  // What cancels says what cancels, as the board does, and not only what survives it: under that
  // heading, the survivor alone read as the part that cancels.
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  const said = [...view.container.querySelectorAll('.bp-math-step.is-here annotation')].map(a => a.textContent ?? '');
  expect(said.some(t => /\\Delta E_y\s*\+/.test(t)), said.join(' | ')).toBe(true);
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
  // Keyboard help stays: it is the one way to pick a piece without a pointer, and a piece picked while
  // the run is open becomes the run's piece. Only the caption's sentence makes room.
  expect(view.getByText('Keyboard help').checkVisibility(), 'Keyboard help went with the caption').toBe(true);
 });
 for (const [w, h, ids] of [[683, 657, ['bisector', 'ramp', 'semi']], [360, 640, ['ring', 'disk', 'ramp']]] as const) it(`at ${w} by ${h}, the run ends with its answer on screen`, async () => {
  // A Chromebook snapped to half its screen beside the assignment, and a small phone. The answer ended
  // below the window in every lesson at 683 by 657.
  for (const id of ids) {
   const view = await openLesson(id, w, h);
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   fireEvent.click(view.getByRole('button', {name: 'Pause'}));
   scrubToEnd(view);
   await waitFor(() => {
    expect(view.container.querySelector('.bp-answer'), id).toBeTruthy();
    expect(box(view, '.bp-math').bottom, `${id}: the answer is under the window`).toBeLessThanOrEqual(window.innerHeight + 1);
    expect(box(view, '.bp-bar').top, `${id}: the transport went off the top`).toBeGreaterThanOrEqual(-1);
   }, {timeout: 4000});
   cleanup();
   window.history.replaceState(null, '', '/');
   window.scrollTo(0, 0);
  }
 }, 60000);
 it('a phone on its side fits the drawing and the transport together', async () => {
  const view = await openLesson('bisector', 844, 390);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await waitFor(() => {
   expect(onScreen(box(view, '.cd-stage')), 'the drawing').toBe(true);
   expect(onScreen(box(view, '.exp-walk')), 'the transport').toBe(true);
  }, {timeout: 4000});
  // And the run's end shows its answer. The transport's algebra is hidden here while the run plays,
  // and the run used to end on the Shrink sentence with the answer a screen and a half below.
  scrubToEnd(view);
  await waitFor(() => {
   const answer = view.container.querySelector<HTMLElement>('.bp-answer');
   expect(answer?.checkVisibility(), 'no answer on screen').toBe(true);
   expect(onScreen(answer!.getBoundingClientRect()), 'the answer is off screen').toBe(true);
  }, {timeout: 4000});
  // Close hands the focus back to Watch it build, and here the page has to come back up to it.
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(view.getByRole('button', {name: 'Watch it build'}).getBoundingClientRect().top, 'the focused button is above the window').toBeGreaterThanOrEqual(0));
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
  // The ring opens in 3D, whose legend sits where the cue is drawn: the legend gives way to it.
  expect(view.container.querySelector('.explorer-app')!.classList.contains('is-cueing')).toBe(true);
  await waitFor(() => expect(getComputedStyle(view.container.querySelector('.cd-help')!).opacity).toBe('0'));
 });
});
