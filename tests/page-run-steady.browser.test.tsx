import {act, cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// Measured with the page's own type and sheet: where the board scrolls to depends on both.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE PAGE HOLDS STILL WHERE THE READER IS LOOKING, AND OPENS WHERE THEY MEANT.
 *
 * The run began its first cut on a page still gliding up the screen; stepping back from the answer lurched
 * the board a hundred and thirty pixels in one frame; a second look at a line still opening sent the board a
 * hundred pixels too far; the pieces slider shut the run without a word. And at rest: a run frame saved
 * before the persistence fix, or carried in an old link, opened as the lesson; a link could set no charge
 * at all; the lessons were buttons that could not be opened in a tab; the dark theme flashed light on load. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 document.documentElement.classList.remove('dark');
 await page.viewport(1280, 800);
});
const STORE = 'field-builder:explorer:v1';
async function openLesson(id: string, width = 1280, height = 800, saved: Record<string, unknown> = {}) {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}, ...saved}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const frame = () => new Promise<number>(r => requestAnimationFrame(r));
const panelOf = (view: {container: HTMLElement}) => view.container.querySelector<HTMLElement>('.exp-workspace>.ew-panel')!;
const pieces = (view: {container: HTMLElement}) => view.container.querySelector('.cd-footer[data-dim="pieces"]')?.textContent;

describe('the run starts on a page that has stopped moving', () => {
 it('the first stage does not advance while the page glides to the board', async () => {
  const view = await openLesson('bisector', 1280, 800);
  window.scrollTo(0, 0);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  const fill = () => {
   const m = view.container.querySelector<HTMLElement>('.bp-seg-fill')?.style.transform.match(/scaleX\(([\d.e-]+)\)/);
   return m ? Number(m[1]) : 0;
  };
  // Every frame for a second: where the page is, and how far the first stage has played.
  const samples: {y: number; fill: number}[] = [];
  const end = performance.now() + 1000;
  while (performance.now() < end) { await frame(); samples.push({y: scrollY, fill: fill()}); }
  const glided = samples.filter((s, i) => i > 0 && Math.abs(s.y - samples[i - 1].y) > .5);
  expect(glided.length, 'the page never glided to the board, so this checked nothing').toBeGreaterThan(2);
  // The cut is clocked from a fifth of a second in; it used to be five per cent through the stage by the
  // time the page came to rest.
  for (const s of glided) expect(s.fill, `the run moved on while the page was at ${s.y}`).toBeLessThan(.01);
  expect(samples.at(-1)!.fill, 'the run never started').toBeGreaterThan(0);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 20000);
});

describe('the board stays put when the reader steps back', () => {
 // The run's frames in the test's hands: a run played in real time takes half a minute.
 let queue: FrameRequestCallback[] = [], t = 0;
 let realRaf: typeof window.requestAnimationFrame, realCancel: typeof window.cancelAnimationFrame;
 beforeEach(() => {
  queue = []; t = 0;
  realRaf = window.requestAnimationFrame; realCancel = window.cancelAnimationFrame;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
 });
 afterEach(() => { window.requestAnimationFrame = realRaf; window.cancelAnimationFrame = realCancel; for (const cb of queue.splice(0)) cb(performance.now()); });
 const step = () => { t += 50; const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); };
 const play = async (done: () => boolean, most = 900) => { for (let i = 0; i < most && !done(); i++) { step(); if (i % 25 === 24) await sleep(0); } };
 for (const back of ['Previous stage', 'Play again'] as const) it(`from the answer, ${back} does not jolt the board`, async () => {
  const view = await openLesson('bisector', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  await play(() => !!view.queryByRole('button', {name: 'Play again'}));
  // The board has followed the answer and trimmed the room under it.
  await sleep(1300);
  const panel = panelOf(view), before = panel.scrollTop;
  expect(before, 'the board never scrolled to the answer').toBeGreaterThan(100);
  fireEvent.click(view.getByRole('button', {name: back}));
  // Read in the frame the answer went: the board used to be pulled back a hundred and thirty pixels here,
  // before the follow had moved at all.
  expect(Math.abs(panel.scrollTop - before), 'the board lurched as the answer went').toBeLessThanOrEqual(12);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 60000);
});

describe('a second look at a line still opening does not overshoot', () => {
 it('Play just after a stage is chosen brings the board to its line once', async () => {
  const view = await openLesson('arc', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await sleep(1200);
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  await sleep(100);
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  const panel = panelOf(view), seen: number[] = [];
  const end = performance.now() + 1600;
  while (performance.now() < end) { await frame(); seen.push(panel.scrollTop); }
  const last = seen.at(-1)!;
  // It went a hundred pixels past the line and glided back at the second look.
  expect(Math.max(...seen), `peak ${Math.max(...seen)} against ${last}`).toBeLessThanOrEqual(last + 8);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 20000);
});

describe('a new cut keeps the run where it was', () => {
 it('the pieces slider re-cuts the charge under the run instead of closing it', async () => {
  const view = await openLesson('bisector', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  const slider = view.getByRole('slider', {name: 'Pieces N'});
  fireEvent.keyDown(slider, {key: 'ArrowRight'});
  await waitFor(() => expect(slider.getAttribute('aria-valuenow')).toBe(String(DEFAULT_PARAMS.slices + 1)));
  // The transport is still there, on the same stage, and the figure is cut into the new number of pieces.
  expect(view.queryByRole('button', {name: 'Watch it build'}), 'the run closed').toBeNull();
  expect(view.container.querySelector('.bp-seg.is-here')?.getAttribute('aria-label')).toBe('Stage 3: What cancels');
  await waitFor(() => expect(view.container.querySelectorAll('.cd-piece').length).toBe(DEFAULT_PARAMS.slices + 1));
 });
});

describe('the transport says where its answer came from', () => {
 for (const [id, lead] of [['ring', /^Adding up the pieces gives this, exactly/], ['bisector', /^Doing the integral gives this\.$/], ['endpoint', /^Doing the integrals gives this\. .*surviving/]] as const) it(`${id}`, async () => {
  const view = await openLesson(id, 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  const track = view.container.querySelector<HTMLElement>('.bp-track')!;
  const end = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')].at(-1)!.getBoundingClientRect();
  fireEvent.pointerDown(track, {clientX: end.right - 40, button: 0, pointerId: 9});
  fireEvent.pointerMove(track, {clientX: end.right, pointerId: 9});
  fireEvent.pointerUp(track, {clientX: end.right, pointerId: 9});
  await waitFor(() => expect(view.container.querySelector('.bp-lead')?.textContent).toMatch(lead));
 });
});

describe('a stage is said once', () => {
 it('the segments carry no title, so a key press does not read the stage\'s sentence twice', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  for (const seg of view.getAllByRole('button', {name: /^Stage \d: /})) expect(seg.hasAttribute('title'), seg.getAttribute('aria-label') ?? '').toBe(false);
 });
 it('the endnotes can be reached by heading', async () => {
  const view = await openLesson('bisector');
  const heading = view.getByRole('heading', {name: 'Limiting cases and easy confusions'});
  expect(heading.closest('section')?.getAttribute('aria-labelledby')).toBe(heading.id);
  // And the summary's own words are not repeated by it: the name to find a disclosure by is still its own.
  expect(view.getByText('Limiting cases').closest('summary')).toBeTruthy();
 });
});

describe('what is opened is the lesson at rest', () => {
 it('a cut saved as gone opens cut into pieces, and the address carries no run', async () => {
  const view = await openLesson('ring', 1280, 800, {params: {ring: {...DEFAULT_PARAMS, slices: 12, continuum: 1}}});
  await waitFor(() => expect(pieces(view)).toBe('Cut into pieces'));
  await sleep(400);
  expect(location.search).toBe('?slices=12&p=ring');
  expect(JSON.parse(localStorage.getItem(STORE) ?? '{}').params.ring.continuum).toBe(0);
 });
 it('an old link with the cut gone opens cut into pieces, and the address loses it', async () => {
  // Copied at the end of a run before the persistence fix. Its picture of the sum is still drawn, as a
  // teacher's assignment may ask; its cut is not, since the board beside it says ΔQ.
  window.history.replaceState(null, '', '/?p=bisector&mode=sum&continuum=1');
  const view = await openLesson('bisector');
  await waitFor(() => expect(pieces(view)).toBe('Cut into pieces'));
  expect(view.container.querySelector('.exp-diagram-card.mode-sum')).toBeTruthy();
  await waitFor(() => expect(location.search).toBe('?mode=sum&p=bisector'));
 });
 it('a link cannot set no charge, and a lesson typed with a capital still opens', async () => {
  await new Promise(r => setTimeout(r, 280));
  // The student was last on the bisector; the link names the ring, as a teacher might type it.
  localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
  window.history.replaceState(null, '', '/?p=Ring%20&charge=0');
  const view = render(<Explorer />);
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
  expect(view.getByRole('slider', {name: 'Total charge Q'}).getAttribute('aria-valuenow')).toBe(String(DEFAULT_PARAMS.charge));
  await waitFor(() => expect(location.search).toBe('?p=ring'));
 });
});

describe('a lesson is a link', () => {
 it('a plain click switches in place; a click for a new tab is left to the browser', async () => {
  const view = await openLesson('bisector');
  const ring = within(view.getByRole('navigation', {name: 'Lessons'})).getByRole('link', {name: 'Ring of charge'});
  expect(ring.getAttribute('href')).toBe('?p=ring');
  // Whether the page took each click over, read after it has had its say -- and then stopped here, so the
  // test page itself never navigates.
  const taken: boolean[] = [];
  const watch = (e: Event) => { taken.push(e.defaultPrevented); e.preventDefault(); };
  window.addEventListener('click', watch);
  try {
   fireEvent.click(ring, {ctrlKey: true});
   fireEvent.click(ring, {metaKey: true});
   expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('bisector').title);
   fireEvent.click(ring);
  } finally { window.removeEventListener('click', watch); }
  expect(taken).toEqual([false, false, true]);
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
 });
});

describe('the dark theme does not flash light', () => {
 it('the class set before the page mounts is never taken off while it reads its settings', async () => {
  // As index.html's head sets it from storage, before the bundle runs.
  document.documentElement.classList.add('dark');
  const lost: string[] = [];
  const watch = new MutationObserver(records => { for (const r of records) if (!(document.documentElement.classList.contains('dark')) || !/\bdark\b/.test(r.oldValue ?? '')) lost.push(r.oldValue ?? ''); });
  watch.observe(document.documentElement, {attributes: true, attributeFilter: ['class'], attributeOldValue: true});
  try {
   await openLesson('bisector', 1280, 800, {dark: true});
   await sleep(50);
  } finally { watch.disconnect(); }
  expect(lost, 'the dark class came off on mount').toEqual([]);
  expect(document.documentElement.classList.contains('dark')).toBe(true);
 });
});
