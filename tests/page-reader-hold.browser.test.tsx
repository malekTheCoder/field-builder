import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, onTestFinished} from 'vitest';
import {page, userEvent} from 'vitest/browser';
// Measured with the page's own type and sheet: what fits in a window depends on both.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE PAGE DOES WHAT THE READER ASKED, AND NOTHING THEY DID NOT.
 *
 * Each of these was a page acting on its own: the board gliding away from the line a reader had paused
 * to read; the answer arriving, sinking under the panel's foot and being chased back; a window of blank
 * card past the answer; a drag along the bar reading out every caption it crossed; Space scrolling the
 * page away from a run a teacher meant to pause; a teacher's link opening on the student's own settings;
 * Back leaving the site; and on a projector zoomed for the room, five stages of a run with its algebra
 * under the window. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 await page.viewport(1280, 800);
});
const STORE = 'field-builder:explorer:v1';
async function openLesson(id: string, width = 1280, height = 800, params: Record<string, unknown> = {}) {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const box = (view: {container: HTMLElement}, selector: string) => view.container.querySelector(selector)!.getBoundingClientRect();
const panelOf = (view: {container: HTMLElement}) => view.container.querySelector<HTMLElement>('.exp-workspace>.ew-panel')!;
function scrubToEnd(view: {container: HTMLElement}) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const last = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')].at(-1)!.getBoundingClientRect();
 fireEvent.pointerDown(track, {clientX: last.right - 40, button: 0, pointerId: 9});
 fireEvent.pointerMove(track, {clientX: last.right, pointerId: 9});
 fireEvent.pointerUp(track, {clientX: last.right, pointerId: 9});
}
/** The run's frames in the test's hands, fifty milliseconds of run a frame (see page-run-view). */
function framesInHand() {
 let queue: FrameRequestCallback[] = [], t = 0;
 let realRaf: typeof window.requestAnimationFrame, realCancel: typeof window.cancelAnimationFrame;
 beforeEach(() => {
  queue = []; t = 0;
  realRaf = window.requestAnimationFrame; realCancel = window.cancelAnimationFrame;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
 });
 afterEach(() => { window.requestAnimationFrame = realRaf; window.cancelAnimationFrame = realCancel; for (const cb of queue.splice(0)) cb(performance.now()); });
 const frame = () => { t += 50; const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); };
 return async (done: () => boolean, most = 900) => { for (let i = 0; i < most && !done(); i++) { frame(); if (i % 25 === 24) await sleep(0); } };
}
describe('the board while the run is open, on a laptop', () => {
 const play = framesInHand();
 it('Pause leaves the board on the line the reader scrolled back to', async () => {
  const view = await openLesson('bisector', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  let n = 0;
  await play(() => ++n > 30);
  await sleep(900);
  const panel = panelOf(view), one = panel.querySelector('.db-step[data-step=one]')!;
  panel.scrollTop += one.getBoundingClientRect().top - panel.getBoundingClientRect().top - 20;
  await sleep(300);
  const before = panel.scrollTop;
  expect(before, 'the board did not scroll back to One piece').toBeLessThan(panel.scrollHeight - panel.clientHeight - 40);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await sleep(900);
  expect(Math.abs(panel.scrollTop - before), 'Pause pulled the board away from the line being read').toBeLessThanOrEqual(4);
 }, 30000);
 it('the answer arrives in view and stays there, not pushed under the panel\'s foot and chased back', async () => {
  const view = await openLesson('ramp', 1366, 768);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  // As in a run at its own pace, the board has followed the stage's line before the answer arrives.
  await sleep(1000);
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  await play(() => !!view.container.querySelector('.ew-result.is-shown'));
  // The rows above it ease open, and the board glides, on the page's own clock: watched in real time.
  const panel = panelOf(view), result = view.container.querySelector('.ew-result.is-shown')!;
  // While it is under the panel's foot it only ever rises into view. Before the fix it rose, then sank
  // as the line above it opened -- sixty pixels under the foot -- and stayed cut until the second look
  // 650 ms later chased it back up. Judged by its path, not by the clock, so a slow machine still gliding
  // it up is not taken for a sinking one.
  const start = performance.now(), under: number[] = [];
  while (performance.now() - start < 1400) {
   await sleep(16);
   under.push(result.getBoundingClientRect().bottom - Math.min(panel.getBoundingClientRect().bottom, window.innerHeight));
  }
  // A sink is more than twelve pixels back. The answer now fades in where it stays (a4007b4) rather than
  // rising eight pixels into place, and in the first frame or two -- before the glide has picked up speed,
  // with the answer's foot still a hundred and fifty pixels and more under the panel's -- the rows opening
  // above it can set it down seven or eight pixels: a jitter on something still out of view, where the fault
  // this guards against was sixty pixels, on the answer itself.
  let best = Infinity;
  for (const d of under) {
   expect(d > 1 && d > best + 12, `the answer sank under the panel's foot on its way up: ${under.map(Math.round).join(' ')}`).toBe(false);
   best = Math.min(best, d);
  }
  expect(under.at(-1)!, 'the answer ended under the panel\'s foot').toBeLessThanOrEqual(1);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 30000);
 it('past its answer the board ends, not a window of blank card later', async () => {
  const view = await openLesson('bisector', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  scrubToEnd(view);
  await waitFor(() => expect(view.container.querySelector('.ew-result.is-shown')).toBeTruthy());
  await sleep(1500);
  const panel = panelOf(view);
  panel.scrollTop = panel.scrollHeight;
  await sleep(50);
  const blank = panel.getBoundingClientRect().bottom - panel.lastElementChild!.getBoundingClientRect().bottom;
  expect(blank, 'blank card under the board\'s last card').toBeLessThan(60);
  expect(view.container.querySelector('.ew-result.is-shown')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom);
 }, 20000);
});
describe('the run says what it does once', () => {
 it('a drag along the bar says nothing until it is let go, then the stage it ends on', async () => {
  const view = await openLesson('bisector', 1280, 800);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  const live = view.container.querySelector('output.sr-only')!;
  await waitFor(() => expect(live.textContent).toBeTruthy());
  const said: string[] = [];
  const watch = new MutationObserver(() => { const now = live.textContent ?? ''; if (said.at(-1) !== now) said.push(now); });
  watch.observe(live, {childList: true, characterData: true, subtree: true});
  const track = view.container.querySelector<HTMLElement>('.bp-track')!, segs = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')];
  const from = segs[0].getBoundingClientRect().left + 2, to = segs.at(-1)!.getBoundingClientRect().right;
  fireEvent.pointerDown(track, {clientX: from, clientY: 0, button: 0, pointerId: 7});
  for (let i = 1; i <= 40; i++) fireEvent.pointerMove(track, {clientX: from + (to - from) * i / 40, clientY: 0, pointerId: 7});
  await sleep(50);
  expect(said, 'the drag narrated the stages it crossed').toEqual([]);
  fireEvent.pointerUp(track, {clientX: to, clientY: 0, pointerId: 7});
  await sleep(50);
  watch.disconnect();
  expect(said).toEqual([buildStages(getProblem('bisector')).at(-1)!.caption]);
 });
 it('the figure\'s own live region stands aside while the run is open', async () => {
  const view = await openLesson('bisector', 1280, 800);
  const figure = view.container.querySelector<HTMLElement>('.cd-announcement')!;
  expect(getComputedStyle(figure).display).not.toBe('none');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  expect(getComputedStyle(figure).display).toBe('none');
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  expect(getComputedStyle(figure).display).not.toBe('none');
 });
 it('Space pauses the run when the focus is on the lesson, without scrolling the page', async () => {
  const view = await openLesson('bisector', 1366, 768);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await sleep(1200);
  document.getElementById('lesson-title')!.focus();
  const y = window.scrollY;
  await userEvent.keyboard(' ');
  await waitFor(() => expect(view.getByRole('button', {name: 'Play'})).toBeTruthy());
  await sleep(200);
  expect(window.scrollY, 'Space scrolled the page').toBe(y);
 });
});
describe('a link is the lesson it names', () => {
 it('a teacher\'s link opens with the teacher\'s values, not the student\'s saved ones', async () => {
  window.history.replaceState(null, '', '/?p=ring&distance=4.5');
  const view = await openLesson('ring', 1280, 800, {ring: {...DEFAULT_PARAMS, charge: -3, slices: 12}});
  await waitFor(() => expect(view.getByRole('slider', {name: 'Height z'}).getAttribute('aria-valuenow')).toBe('4.5'));
  expect(view.getByRole('slider', {name: 'Total charge Q'}).getAttribute('aria-valuenow')).toBe(String(DEFAULT_PARAMS.charge));
  expect(view.getByRole('slider', {name: 'Pieces N'}).getAttribute('aria-valuenow')).toBe(String(DEFAULT_PARAMS.slices));
 });
 it('the first lesson\'s address names it, so sharing it shares that lesson', async () => {
  await openLesson('bisector');
  await waitFor(() => expect(location.search).toContain('p=bisector'), {timeout: 2000});
 });
 it('each lesson is a place in the history, so Back returns to the last one', async () => {
  window.history.replaceState(null, '', '/?p=ring');
  const view = await openLesson('ring');
  await sleep(400);
  const before = history.length;
  fireEvent.click(view.getByRole('link', {name: 'Disk of charge'}));
  await waitFor(() => expect(location.search).toContain('p=disk'), {timeout: 2000});
  fireEvent.click(view.getByRole('link', {name: 'Arc of charge'}));
  await waitFor(() => expect(location.search).toContain('p=arc'), {timeout: 2000});
  expect(history.length).toBe(before + 2);
  history.back();
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('disk').title), {timeout: 2000});
 });
});
describe('on a projector zoomed for the room, the run\'s algebra is on screen at every stage', () => {
 // XGA at 125%, WXGA at 150%, a Chromebook at 150%, and a 1024 by 768 screen at 110%.
 for (const [id, w, h] of [['ring', 853, 533], ['bisector', 910, 512], ['ring', 931, 698]] as const) it(`${id} at ${w} by ${h}`, async () => {
  const view = await openLesson(id, w, h);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  for (const [i, name] of ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'].entries()) {
   fireEvent.click(view.getByRole('button', {name: `Stage ${i + 1}: ${name}`}));
   await waitFor(() => {
    const panel = panelOf(view), step = view.container.querySelector('.db-step.is-here')!.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const onBoard = step.top >= Math.max(p.top, 0) - 1 && step.bottom <= Math.min(p.bottom, innerHeight) + 1;
    const math = view.container.querySelector<HTMLElement>('.bp-math-step.is-here');
    const inPlayer = !!math && math.checkVisibility() && math.getBoundingClientRect().bottom <= innerHeight + 1;
    expect(onBoard || inPlayer, `${name}: its algebra is on screen nowhere`).toBe(true);
    expect(box(view, '.cd-stage').top, `${name}: the drawing went off the top`).toBeGreaterThanOrEqual(-1);
   // CI's runner is several times slower than a laptop: the board's glide to the stage had not
   // landed in four seconds there on some runs, though it always lands. Twelve leaves it room.
   }, {timeout: 12000});
  }
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
 }, 90000);
});
function contrast(a: string, b: string) {
 const lum = (c: string) => {
  const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(v => Number(v) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * bl;
 };
 const [x, y] = [lum(a), lum(b)];
 return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
describe('every control says what it is', () => {
 it('the charge says its unit, the crumb that it opens a picker, and a family\'s list is named once', async () => {
  const view = await openLesson('bisector');
  expect(view.getByRole('slider', {name: 'Total charge Q'}).getAttribute('aria-valuetext')).toMatch(/^[\d.]+ nanocoulombs?$/);
  const crumb = view.getByRole('button', {name: 'Charge library'});
  expect(crumb.getAttribute('aria-haspopup')).toBe('dialog');
  expect(crumb.getAttribute('aria-expanded')).toBe('false');
  for (const list of view.container.querySelectorAll('.exp-lessons ul')) expect(list.hasAttribute('aria-label'), 'a family named twice').toBe(false);
  cleanup();
  const sheet = await openLesson('sheet');
  expect(sheet.getByRole('slider', {name: 'Surface density σ'}).getAttribute('aria-valuetext')).toMatch(/nanocoulombs? per square meter$/);
 });
 it('each limiting case is its tab\'s panel, under a named list', async () => {
  const view = await openLesson('ring');
  // Limiting cases starts open: a click on its summary would fold it away.
  const list = await view.findByRole('tablist', {name: 'Limiting cases'});
  const chosen = list.querySelector('[aria-selected=true]')!;
  const panel = view.getByRole('tabpanel');
  expect(chosen.getAttribute('aria-controls')).toBe(panel.id);
  expect(panel.querySelector('.exp-limit-why')?.textContent).toBeTruthy();
 });
 it('the infinite line\'s two routes are a named list, set at the page\'s size', async () => {
  const view = await openLesson('infinite');
  const list = view.getByRole('tablist', {name: 'Explore another route to the same result'});
  for (const tab of list.querySelectorAll<HTMLElement>('[role=tab]')) expect(parseFloat(getComputedStyle(tab).fontSize)).toBeGreaterThanOrEqual(13);
 });
});
describe('every slider can be seen and taken hold of', () => {
 it('the limiting case\'s track holds 3:1 on the ground, and with a finger it is a band', async () => {
  const view = await openLesson('bisector');
  // Limiting cases starts open: a click on its summary would fold it away.
  const track = await waitFor(() => { const t = view.container.querySelector<HTMLElement>('.assessment [data-slot=slider-track]'); expect(t).toBeTruthy(); return t!; });
  // Drawn in the track token, not left to the slider's own grey (#858585 on the light ground).
  const fill = getComputedStyle(track).backgroundColor;
  expect(fill, 'the track is not drawn in --exp-track').toBe('rgb(133, 133, 133)');
  expect(contrast(fill, getComputedStyle(document.body).backgroundColor)).toBeGreaterThanOrEqual(3);
  // The finger's band is read from the sheet, not by emulating a touch screen: Chromium keeps answering
  // (hover: none) after its touch emulation is switched off, and the files after this one then ran on a
  // phone. Any slider, under any coarse pointer -- not only the page's own, and not only a primary one.
  const bands = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules]; } catch { return []; } })
   .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule && /any-pointer:\s*coarse/.test(r.conditionText))
   .flatMap(r => [...r.cssRules]).filter((r): r is CSSStyleRule => r instanceof CSSStyleRule);
  const band = bands.find(r => /^\[data-slot="?slider"?\]\s*>\s*div$/.test(r.selectorText));
  expect(band?.style.minHeight, 'no finger-sized band for every slider').toBe('32px');
  expect(view.container.querySelector('.assessment [data-slot=slider]>div')!.matches(band!.selectorText)).toBe(true);
 });
 it('at 320 pixels the ramp\'s confusions stay in the page\'s width', async () => {
  // The limit card above the confusions, open with them, keeps a data table hidden by the app's sr-only
  // rule, which this project does not build: unclipped, the table alone ran the page wide.
  const srOnly = document.createElement('style');
  srOnly.textContent = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border-width:0}';
  document.head.appendChild(srOnly);
  onTestFinished(() => { srOnly.remove(); });
  const view = await openLesson('ramp', 320, 700);
  // Easy to confuse with starts open: a click on its summary would fold it away.
  await waitFor(() => expect(view.container.querySelector('.exp-slip-math .katex')).toBeTruthy());
  // The ramp's widest expression measured 311px on the shipped page, but this project runs without
  // Tailwind and sets it a little narrower, so one wider than the column stands in for it: a formula
  // box as the page makes them, scrolling its own overflow.
  const wide = document.createElement('span');
  wide.className = 'math';
  wide.innerHTML = '<span style="display:inline-block;width:400px;height:10px"></span>';
  view.container.querySelector('.exp-slip-math')!.appendChild(wide);
  await sleep(100);
  expect(document.documentElement.scrollWidth, 'the page scrolls sideways').toBeLessThanOrEqual(320);
 });
});
describe('on a phone the transport says what the board says', () => {
 it('the part that survives too, and the answer as the integral done, with its k', async () => {
  const view = await openLesson('endpoint', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  expect(view.container.querySelector('.bp-math-step.is-here')?.textContent).toMatch(/survives too/);
  scrubToEnd(view);
  await waitFor(() => {
   const answer = view.container.querySelector('.bp-answer')?.textContent ?? '';
   // Two integrals here, E_x's and the surviving E_y's, as the panel says it.
   expect(answer).toMatch(/Doing the integrals gives this/);
   expect(answer).toMatch(/with/);
  });
 });
});
describe('where the lesson leads, and the laws under it', () => {
 it('the lesson\'s last line goes to the lesson it names, from the top', async () => {
  const view = await openLesson('bisector');
  window.scrollTo(0, document.body.scrollHeight);
  fireEvent.click(view.getByRole('link', {name: /Take this rod to infinity/}));
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('infinite').title));
  expect(window.scrollY).toBe(0);
 });
 it('the laws open from the lesson, the potential\'s law first on a potential lesson', async () => {
  const view = await openLesson('v-ring');
  fireEvent.click(view.getByRole('button', {name: 'The laws behind it'}));
  const dialog = await view.findByRole('dialog');
  expect(dialog.querySelector('.law-name')?.textContent).toBe('Potential of a point charge');
 });
});
