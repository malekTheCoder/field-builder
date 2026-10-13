import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, onTestFinished, vi} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
// Measured with the page's own type and sheet: the crash screen, the sliders' row and the short windows'
// transport are laid out by app/globals.css as much as by the component's own sheet.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {ErrorBoundary} from '../src/components/ErrorBoundary';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {intervalKey} from '../src/diagrams/subdivision';
/* THE PAGE AROUND THE FIGURE AND THE BOARD.
 *
 * A crash screen with no way out that looked like one; a teacher's link dropped by a browser that refuses
 * storage; no way to copy a link with the address bar out of sight; the transport saying "the column is exactly
 * the potential" over a bare sum; a run that bracketed a piece running off to infinity; Next that quietly ended
 * a playing run; a clicker that stepped a figure a screen above the window; a held board whose foot read as
 * its end; a first-visit cue placed before the page's faces arrived; limiting cases and WebGL layers that did
 * not reach paper; a fourth slider three times as long as the three above it. */
afterEach(async () => {
 cleanup();
 vi.restoreAllMocks();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 document.documentElement.classList.remove('dark');
 try { await cdp().send('Emulation.setEmulatedMedia', {media: '', features: []}); } catch { /* not emulating */ }
 await page.viewport(1280, 800);
});
const STORE = 'field-builder:explorer:v1';
async function openLesson(id: string, width = 1280, height = 800, saved: Record<string, unknown> = {}) {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}, ...saved}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const card = (view: View) => view.container.querySelector<HTMLElement>('.exp-diagram-card')!;
const here = (view: View) => view.container.querySelector('.bp-seg.is-here')?.getAttribute('aria-label');
/** Drag along the bar to a fraction of the whole run, and let go: the run holds there. */
function dragTo(view: View, f: number, letGo = true) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!, box = track.getBoundingClientRect(), x = box.left + f * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 if (letGo) fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
/** The run's frames in the test's hands: a run played in real time takes half a minute. */
function frames() {
 const queue: FrameRequestCallback[] = [];let t = 0;
 const realRaf = window.requestAnimationFrame, realCancel = window.cancelAnimationFrame;
 window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
 window.cancelAnimationFrame = () => {};
 const step = () => { t += 50; const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); };
 const play = async (done: () => boolean, most = 900) => { for (let i = 0; i < most && !done(); i++) { step(); if (i % 25 === 24) await sleep(0); } };
 const restore = () => { window.requestAnimationFrame = realRaf; window.cancelAnimationFrame = realCancel; for (const cb of queue.splice(0)) cb(performance.now()); };
 return {step, play, restore};
}

describe('the crash screen', () => {
 function Broken(): never { throw new Error('Invalid saved view'); }
 it('takes the focus, so the reader is told where they are, and offers two buttons a finger can find', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const ui = render(<ErrorBoundary><Broken/></ErrorBoundary>);
  const heading = ui.getByRole('heading', {name: 'Field Builder could not display this view'});
  expect(document.activeElement, 'the focus fell to the page').toBe(heading);
  for (const name of ['Try again', 'Reset saved settings and try again']) {
   const b = ui.getByRole('button', {name});
   // Under Tailwind's reset they had no edge, fill or padding: the end of the paragraph, not a way out.
   expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
   expect(getComputedStyle(b).borderTopStyle).toBe('solid');
  }
 }, 20000);
});

describe('a link is read whether or not storage can be', () => {
 it('a browser that refuses storage opens the lesson the link names, with the tour shut', async () => {
  window.history.replaceState(null, '', '/?p=ring');
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
  const view = render(<Explorer />);
  await view.findByRole('button', {name: 'Watch it build'});
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
  await sleep(300);
  expect(view.container.querySelector('h1')?.textContent, 'the link was dropped with the storage').toBe(getProblem('ring').title);
  expect(document.querySelector('.fb-onboarding'), 'the tour opened by itself').toBeNull();
  expect(view.getByText('Settings are kept for this visit.')).toBeTruthy();
 }, 20000);
});

describe('a link to the lesson, from the page', () => {
 const said = (view: View) => [...view.container.querySelectorAll('output[aria-live]')].map(o => o.textContent);
 it('copies the address bar\'s link, and says so', async () => {
  window.history.replaceState(null, '', '/?p=ring&distance=4.5');
  const view = await openLesson('ring');
  const write = vi.fn(() => Promise.resolve());
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({writeText: write} as unknown as Clipboard);
  await userEvent.click(view.getByRole('button', {name: 'Lesson tools'}));
  await userEvent.click(await view.findByRole('menuitem', {name: 'Copy a link to this lesson'}));
  await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
  const url = new URL((write.mock.calls[0] as unknown as [string])[0]);
  expect(url.origin + url.pathname).toBe(location.origin + location.pathname);
  expect(url.searchParams.get('p')).toBe('ring');
  expect(url.searchParams.get('distance')).toBe('4.5');
  // Said in the page's live region, and for a moment where the eye is.
  await waitFor(() => expect(said(view)).toContain('Link to this lesson copied.'));
  expect(document.querySelector('.exp-copied')?.textContent).toBe('Link to this lesson copied.');
 }, 45000);
 it('where the clipboard is refused and copying fails, says where the link is', async () => {
  const view = await openLesson('ring');
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError'))} as unknown as Clipboard);
  vi.spyOn(document, 'execCommand').mockReturnValue(false);
  await userEvent.click(view.getByRole('button', {name: 'Lesson tools'}));
  await userEvent.click(await view.findByRole('menuitem', {name: 'Copy a link to this lesson'}));
  await waitFor(() => expect(said(view)).toContain('The link to this lesson is in the address bar.'));
 }, 45000);
});

describe('the transport\'s algebra', () => {
 for (const id of ['ring', 'v-ring', 'v-arc'] as const) it(`${id}: Add them up ends on its own answer, as the board's line does`, async () => {
  const view = await openLesson(id, 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  const steps = [...view.container.querySelectorAll('.bp-math-step')];
  expect(steps.length).toBe(5);
  const finish = steps[3].querySelector('.bp-finish');
  expect(finish, 'the exact sum\'s answer is missing').toBeTruthy();
  // The board's alignment strut is the board's: here the line opens on its "=".
  expect(finish!.querySelector('.katex-mathml annotation')?.textContent).toMatch(/^=/);
  // The last stage's finish is the settled chain's, not a line of its own.
  expect(steps[4].querySelector('.bp-finish')).toBeNull();
 }, 20000);
 it('bisector: a sum that is only approximate has no answer to end on', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  expect(view.container.querySelector('.bp-finish')).toBeNull();
 }, 20000);
});

describe('the run never talks about a piece with no far end', () => {
 const cases: [string, number, number][] = [['semi', 3, 1], ['semi', 4, 2], ['infinite', 4, 2], ['infinite', 3, 2]];
 for (const [id, n, want] of cases) it(`${id} in ${n} pieces talks about piece ${want}`, async () => {
  const view = await openLesson(id, 1280, 800, {params: {[id]: {...DEFAULT_PARAMS, slices: n}}});
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 2: One piece'}));
  await waitFor(() => expect(view.container.querySelector<SVGGElement>('.cd-piece.is-selected')?.dataset.pieceKey).toBe(intervalKey(want, n)));
 }, 20000);
});

describe('Next and the keys', () => {
 it('Next pressed while the run plays goes on playing from the next stage', async () => {
  const f = frames();
  try {
   const view = await openLesson('bisector');
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   for (let i = 0; i < 4; i++) f.step();
   fireEvent.click(view.getByRole('button', {name: 'Next stage'}));
   await f.play(() => here(view) === 'Stage 3: What cancels' || !!view.queryByRole('button', {name: 'Play'}));
   // It used to play One piece alone and stop there: a playing run ended without a word.
   expect(here(view)).toBe('Stage 3: What cancels');
   expect(view.queryByRole('button', {name: 'Pause'}), 'the run stopped after one stage').toBeTruthy();
   fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  } finally { f.restore(); }
 }, 20000);
 it('one press past the last stage does nothing', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  const last = view.getByRole('button', {name: 'Stage 5: Shrink them'});
  fireEvent.click(last);
  dragTo(view, 1);
  await waitFor(() => expect(card(view).classList.contains('is-settled')).toBe(true));
  last.focus();
  await userEvent.keyboard('{ArrowRight}');
  await sleep(150);
  // It replayed Shrink them from its start: the answer left and the figure went back to "Cut into pieces".
  expect(card(view).classList.contains('is-settled'), 'the answer went').toBe(true);
  expect(view.queryByRole('button', {name: 'Pause'})).toBeNull();
 }, 20000);
 it('Page Down pages, rather than stepping a run a screen above the window', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await sleep(300);
  window.scrollTo(0, document.documentElement.scrollHeight);
  await sleep(100);
  const drawing = card(view).querySelector('.cd-stage')!.getBoundingClientRect();
  expect(drawing.bottom, 'the drawing is still on screen, so this checks nothing').toBeLessThan(0);
  const from = here(view);
  expect(fireEvent.keyDown(document.body, {key: 'PageDown'}), 'the page could not page').toBe(true);
  const play = view.getByRole('button', {name: 'Play'});
  expect(fireEvent.keyDown(play, {key: 'PageDown'}), 'the transport took the key').toBe(true);
  await sleep(100);
  expect(here(view)).toBe(from);
 }, 20000);
 it('Space plays and pauses from the lesson\'s title; a lone K does nothing', async () => {
  const view = await openLesson('bisector', 1366, 768);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await sleep(200);
  document.getElementById('lesson-title')!.focus();
  await userEvent.keyboard('k');
  await sleep(100);
  expect(view.queryByRole('button', {name: 'Pause'}), 'K paused the run').toBeTruthy();
  await userEvent.keyboard(' ');
  await waitFor(() => expect(view.getByRole('button', {name: 'Play'})).toBeTruthy());
 }, 20000);
 it('Space pauses from the 3D drawing, which a drag to turn it focuses', async () => {
  const view = await openLesson('ring', 1366, 768);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await sleep(200);
  const drawing = view.container.querySelector<SVGSVGElement>('svg.cd-svg')!;
  expect(drawing.tabIndex, 'not the turnable drawing here, so this checks nothing').toBe(0);
  drawing.focus();
  await userEvent.keyboard(' ');
  await waitFor(() => expect(view.getByRole('button', {name: 'Play'})).toBeTruthy());
 }, 45000);
 it('a clicker steps the run from a line of the board, while the drawing is on screen', async () => {
  const view = await openLesson('bisector', 1366, 768);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await sleep(1200);
  const line = view.getByRole('button', {name: /^Cut it up: play this step/});
  line.focus({preventScroll: true});
  // It scrolled the window a page from here: the projector lost the figure and the stage stayed where it was.
  expect(fireEvent.keyDown(line, {key: 'PageDown'}), 'the key went to the page').toBe(false);
  await waitFor(() => expect(here(view)).toBe('Stage 2: One piece'));
 }, 20000);
});

describe('where the focus goes', () => {
 it('the lesson is not a focus stop; going on to the next lesson lands on its title', async () => {
  const view = await openLesson('bisector');
  // Focusable, it took every click inside the lesson, and the keys a reader pages with scrolled the window,
  // never the board held beside the figure.
  expect(document.getElementById('lesson')!.hasAttribute('tabindex')).toBe(false);
  fireEvent.click(view.container.querySelector('.exp-related')!);
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('infinite').title));
  expect(document.activeElement?.id).toBe('lesson-title');
  expect(document.activeElement?.textContent).toBe(getProblem('infinite').title);
  // A place to be, not a control: not ringed.
  expect(getComputedStyle(document.activeElement!).outlineStyle).toBe('none');
 }, 20000);
});

describe('the held board says that it goes on', () => {
 it('its foot fades while more of it lies below, and not once it is all in view', async () => {
  const view = await openLesson('bisector', 1280, 720);
  const panel = view.container.querySelector<HTMLElement>('.exp-workspace>.ew-panel')!;
  expect(getComputedStyle(panel).overflowY, 'the board is not held beside the figure here').toBe('auto');
  await waitFor(() => expect(panel.hasAttribute('data-more')).toBe(true));
  expect(getComputedStyle(panel).maskImage).toContain('linear-gradient');
  panel.scrollTop = panel.scrollHeight;
  await waitFor(() => expect(panel.hasAttribute('data-more')).toBe(false));
  // Not while the run is open: the room under the line being written is always "more".
  panel.scrollTop = 0;
  await waitFor(() => expect(panel.hasAttribute('data-more')).toBe(true));
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await waitFor(() => expect(panel.hasAttribute('data-more')).toBe(false));
 }, 20000);
});

describe('a drag along the bar', () => {
 it('does not fade the sentence in again at every stage it crosses', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  dragTo(view, .5, false);
  await waitFor(() => expect(card(view).classList.contains('is-scrubbing')).toBe(true));
  expect(getComputedStyle(view.container.querySelector('.bp-line')!).animationName).toBe('none');
  const track = view.container.querySelector<HTMLElement>('.bp-track')!;
  fireEvent.pointerUp(track, {clientX: track.getBoundingClientRect().left + track.getBoundingClientRect().width / 2, pointerId: 7});
  await waitFor(() => expect(card(view).classList.contains('is-scrubbing')).toBe(false));
  // And the sentence wraps for a reader, without a lone word on its last line where it can help it.
  expect(getComputedStyle(view.container.querySelector('.bp-line')!).textWrapStyle).toBe('pretty');
 }, 20000);
});

describe('the board and the figure turn on one frame', () => {
 it('the answer is never on the board while the figure still says the pieces are cut', async () => {
  const f = frames();
  try {
   const view = await openLesson('bisector');
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   fireEvent.click(view.getByRole('button', {name: 'Pause'}));
   fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
   fireEvent.click(view.getByRole('button', {name: 'Play'}));
   const said = () => view.container.querySelector('.cd-footer[data-dim="pieces"]')?.textContent;
   let disagreed = 0, frames = 0;
   for (let i = 0; i < 400 && !view.queryByRole('button', {name: 'Play again'}); i++) {
    f.step(); if (i % 25 === 24) await sleep(0);
    frames++;
    if (card(view).classList.contains('is-settled') !== (said() === 'In the limit')) disagreed++;
   }
   expect(frames, 'the run never ended').toBeLessThan(400);
   expect(disagreed, 'frames where the board had the answer and the figure said ΔQ').toBe(0);
  } finally { f.restore(); }
 }, 45000);
});

describe('the first-visit cue', () => {
 it('waits for the page\'s faces before it is placed', async () => {
  let arrived = () => {};
  const ready = new Promise<void>(r => { arrived = r; });
  Object.defineProperty(document, 'fonts', {configurable: true, value: {ready}});
  try {
   await page.viewport(1280, 800);
   await sleep(280);
   // A reader who has ticked "Don't show this again" but not yet had the cue: the walkthrough, which opens on every
   // other visit, would stand in front of the cue, which waits for it to close.
   localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: false, dark: false, sidebarOpen: true, params: {}}));
   const view = render(<Explorer />);
   await view.findByRole('button', {name: 'Watch it build'});
   await sleep(400);
   // Placed while the title was in the fallback face, its arrow ended inside "Watch it build" once the serif came.
   expect(document.querySelector('.start-here'), 'placed before the faces arrived').toBeNull();
   arrived();
   await waitFor(() => expect(document.querySelector('.start-here')).toBeTruthy());
  } finally { delete (document as unknown as {fonts?: unknown}).fonts; }
 }, 20000);
});

describe('on paper', () => {
 it('every limiting case prints under its own heading, and the tabs come back after', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByText('Limiting cases'));
  await waitFor(() => expect(view.getByRole('tablist', {name: 'Limiting cases'})).toBeTruthy());
  window.dispatchEvent(new Event('beforeprint'));
  const printed = [...view.container.querySelectorAll('.exp-limit-print h3')].map(h => h.textContent);
  expect(printed).toEqual(getProblem('bisector').limits.map(l => l.title));
  expect(view.queryByRole('tablist', {name: 'Limiting cases'})).toBeNull();
  await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
  // Instructions for the screen are not printed: how to use an endnote, and the interval's disclosure.
  expect(view.container.querySelector<HTMLElement>('.exp-note > summary small')!.checkVisibility()).toBe(false);
  expect(view.container.querySelector<HTMLElement>('.ew-bounds')!.checkVisibility()).toBe(false);
  // The board may break between its steps, never inside one: kept whole it went to a second sheet and left
  // the lower third of the first blank.
  expect(getComputedStyle(view.container.querySelector('.exp-workspace>.ew-panel')!).breakInside).toBe('auto');
  expect(getComputedStyle(view.container.querySelector('.db-step')!).breakInside).toBe('avoid');
  await cdp().send('Emulation.setEmulatedMedia', {media: ''});
  window.dispatchEvent(new Event('afterprint'));
  await waitFor(() => expect(view.getByRole('tablist', {name: 'Limiting cases'})).toBeTruthy());
  expect(view.container.querySelector('.exp-limit-print')).toBeNull();
 }, 20000);
 it('a field layer drawn in WebGL prints as the picture taken of it, which is never on screen', async () => {
  const view = await openLesson('ring');
  const layer = await waitFor(() => { const l = view.container.querySelector<HTMLElement>('.cd-field-stage'); expect(l?.querySelector('canvas')).toBeTruthy(); return l!; });
  await sleep(300);
  window.dispatchEvent(new Event('beforeprint'));
  const snap = layer.querySelector<HTMLCanvasElement>('canvas.cd-print-snap');
  expect(snap, 'no picture was taken').toBeTruthy();
  expect(snap!.width).toBeGreaterThan(0);
  // On screen it is not there, even for the moment the print dialog is up.
  expect(getComputedStyle(snap!).display).toBe('none');
  await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
  expect(getComputedStyle(snap!).display).toBe('block');
  expect(getComputedStyle(layer.querySelector('canvas:not(.cd-print-snap)')!).visibility).toBe('hidden');
  await cdp().send('Emulation.setEmulatedMedia', {media: ''});
  window.dispatchEvent(new Event('afterprint'));
  expect(layer.querySelector('.cd-print-snap')).toBeNull();
  expect(layer.classList.contains('is-print-snapped')).toBe(false);
 }, 20000);
});

describe('the page\'s layout', () => {
 it('the fourth slider, on a row of its own, is no longer than the three above it', async () => {
  const view = await openLesson('bisector', 1280, 720);
  const ranges = [...view.container.querySelectorAll<HTMLElement>('.exp-parameters .exp-range')].map(r => r.getBoundingClientRect());
  expect(ranges.length).toBe(4);
  expect(ranges[3].top, 'the fourth slider did not wrap here, so this checks nothing').toBeGreaterThan(ranges[0].bottom);
  expect(ranges[3].width).toBeLessThanOrEqual(ranges[0].width + 1);
 }, 20000);
 it('a short wide window keeps the sentence where it was as the run settles', async () => {
  const view = await openLesson('bisector', 900, 500);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  await sleep(100);
  const line = () => view.container.querySelector<HTMLElement>('.bp-now')!.getBoundingClientRect();
  const before = line();
  dragTo(view, 1);
  await waitFor(() => expect(card(view).classList.contains('is-settled')).toBe(true));
  const after = line();
  // It went to a column of its own beside the answer -- which the board beside the figure carries here.
  expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
 }, 20000);
 it('on a short phone-wide window, Previous is clear of Close', async () => {
  const view = await openLesson('bisector', 900, 400);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  const close = view.getByRole('button', {name: 'Close'}).getBoundingClientRect();
  const previous = view.getByRole('button', {name: 'Previous stage'}).getBoundingClientRect();
  expect(Math.abs(previous.top - close.top), 'not on one row here, so this checks nothing').toBeLessThan(8);
  expect(previous.left - close.right).toBeGreaterThanOrEqual(20);
 }, 20000);
});

describe('in a Windows contrast theme', () => {
 it('the open lesson\'s card in the library is all in the selection\'s text colour', async () => {
  const view = await openLesson('ring');
  fireEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const open = await waitFor(() => { const c = document.querySelector<HTMLElement>('.exp-library-grid>.exp-library-card[aria-current=page]'); expect(c).toBeTruthy(); return c!; });
  await cdp().send('Emulation.setEmulatedMedia', {features: [{name: 'forced-colors', value: 'active'}]});
  await waitFor(() => expect(getComputedStyle(open.querySelector('span')!).color).toBe(getComputedStyle(open).color));
  expect(getComputedStyle(open.querySelector('svg')!).color).toBe(getComputedStyle(open).color);
 }, 20000);
});

/** The sheet's rules for a coarse pointer, laid on as if one were there. Not by emulating a touch screen: once
 * Chromium's touch emulation has been on, the page answers (hover: none) whatever it is told after -- switching
 * it off does not bring hover back, nor does any other reset the protocol offers -- and the files after this
 * one ran as a phone: "a screen that can hover is told to point" (panel-lede-partial) failed in the full run. */
function asIfCoarse() {
 const rules = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules]; } catch { return []; } })
  .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule && /any-pointer:\s*coarse/.test(r.conditionText))
  .flatMap(r => [...r.cssRules].map(x => x.cssText));
 const style = document.createElement('style');
 style.textContent = rules.join('\n');
 document.head.appendChild(style);
 return {rules: rules.length, done: () => { style.remove(); }};
}
describe('on a touch screen', () => {
 it('the header\'s buttons and the geometry reset have a finger\'s margin, not overlapping each other', async () => {
  const view = await openLesson('bisector', 390, 844);
  const coarse = asIfCoarse();
  onTestFinished(coarse.done);
  expect(coarse.rules, 'no rules for a coarse pointer').toBeGreaterThan(0);
  const buttons = [view.getByRole('button', {name: 'Walkthrough'}), view.getByRole('button', {name: 'Switch to dark theme'}), view.getByRole('button', {name: 'Lesson tools'})];
  const pads = buttons.map(b => { const box = b.getBoundingClientRect(), s = getComputedStyle(b, '::before'); expect(s.content).not.toBe('none'); return {left: box.left + parseFloat(s.left), right: box.right - parseFloat(s.right), height: box.height - parseFloat(s.top) - parseFloat(s.bottom)}; });
  for (const p of pads) expect(p.height).toBeGreaterThanOrEqual(40);
  for (let i = 1; i < pads.length; i++) expect(pads[i].left, 'one button\'s margin covers the next').toBeGreaterThanOrEqual(pads[i - 1].right);
  expect(getComputedStyle(view.getByRole('button', {name: 'Reset geometry'}), '::before').content).not.toBe('none');
 }, 20000);
});

describe('a step back out of the answer', () => {
 it('brings the drawing back down into the window', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  dragTo(view, 1);
  await waitFor(() => expect(card(view).classList.contains('is-settled')).toBe(true));
  const top = () => card(view).querySelector('.cd-stage')!.getBoundingClientRect().top;
  await sleep(1200);
  // Where the answer is tall, the settle takes the drawing's top off the window so the answer fits; and a
  // reader may have scrolled down to read it. Either way the drawing's top is above the window.
  window.scrollBy({top: top() + 60, behavior: 'instant'});
  await sleep(100);
  expect(top()).toBeLessThan(-40);
  expect(view.container.querySelector('.bp')!.getBoundingClientRect().bottom, 'the transport went under the window').toBeLessThanOrEqual(innerHeight);
  fireEvent.click(view.getByRole('button', {name: 'Previous stage'}));
  // The earlier stages replayed with the figure's top and the stage's own name cut off, with room to spare.
  await waitFor(() => expect(top()).toBeGreaterThanOrEqual(0), {timeout: 3000});
  expect(view.container.querySelector('.bp')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 }, 45000);
});

describe('a window that changes shape mid-run', () => {
 it('is looked at again when it turns, and not when a phone\'s toolbar slides', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  await sleep(1200);
  window.scrollTo({top: 0, behavior: 'instant'});
  await sleep(100);
  // The toolbar: the height alone changes, as it does whenever a phone's page is scrolled.
  await page.viewport(390, 760);
  await sleep(600);
  expect(window.scrollY, 'a toolbar sliding in pulled the reader back down').toBe(0);
  // The phone turned on its side: the transport went under the window, and nothing brought it back.
  await page.viewport(844, 390);
  await waitFor(() => expect(view.container.querySelector('.bp')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight), {timeout: 3000});
  expect(window.scrollY).toBeGreaterThan(0);
 }, 45000);
});
