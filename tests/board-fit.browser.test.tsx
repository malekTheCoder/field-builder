import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own styles, imported the way src/main.tsx imports them. Without KaTeX's stylesheet and
// fonts, and the type scale in globals.css, the lines would be measured in a default serif at a
// default size -- and fit or overflow for reasons that have nothing to do with what ships.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {isReady} from '../src/problems/readiness';
/* EVERY LINE OF THE DERIVATION FITS ITS PANEL.
 *
 * A line of KaTeX does not wrap. Too wide for the panel, it scrolls sideways inside its own box: a
 * scrollbar under one equation, with its end cut off, in the one part of the page that is meant to
 * read like a textbook. The board's lines are written by hand and the panel is three different
 * widths beside the figure and another below it on a phone, so nothing but a sweep says they all
 * fit. This is that sweep: every lesson, at each width the panel takes, at rest -- the whole
 * derivation and its answer on the page -- and with the run open on its last stage, where the
 * longest line has its second half, the stage's note is open and the answer has arrived.
 *
 * The Explorer, not a bare panel, because the panel's width is the page's grid, not its own. */
const WIDTHS: [number, number][] = [[1060, 900], [1280, 900], [1440, 900], [1728, 1000], [390, 844]];
// Transitions and entrances off, so a measurement is of where things land, not of a frame on the way.
const STILL = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';

afterEach(() => {
  cleanup();
  // A URL left behind by the last test beats the storage the next one writes.
  window.history.replaceState(null, '', '/');
  document.getElementById('board-fit-still')?.remove();
});
afterAll(async () => { await page.viewport(1280, 800); });

async function open(id: string) {
  // The Explorer saves which lesson it was on, on a debounce; let the last test's save land first,
  // then open on the bisector and move to the lesson the way a reader does, through the library.
  await new Promise(r => setTimeout(r, 280));
  await page.viewport(1440, 900);
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
  const view = render(<Explorer />);
  await view.findByRole('button', {name: 'Watch it build'});
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('bisector').title));
  const still = document.createElement('style');
  still.id = 'board-fit-still';
  still.textContent = STILL;
  document.head.appendChild(still);
  const lesson = getProblem(id);
  if (id !== 'bisector') {
    const entry = [...view.container.querySelectorAll<HTMLElement>('.exp-shape-button')].find(b => b.textContent === lesson.short);
    expect(entry, `${lesson.short} is not in the library`).toBeTruthy();
    fireEvent.click(entry!);
    await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(lesson.title));
  }
  return view;
}
type View = Awaited<ReturnType<typeof open>>;
const settle = async () => {
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};

/** Every line of the board and the answer that scrolls sideways, at each width, said by name. */
async function overflowing(view: View, state: string) {
  const bad: string[] = [];
  for (const [width, height] of WIDTHS) {
    await page.viewport(width, height);
    await settle();
    for (const el of view.container.querySelectorAll<HTMLElement>('.db .math, .ew-result .math')) {
      if (el.scrollWidth <= el.clientWidth + 1) continue;
      const where = el.closest<HTMLElement>('.db-step')?.dataset.step ?? 'answer';
      bad.push(`${state} at ${width}px, ${where} (${el.className.trim()}): ${el.scrollWidth}px in ${el.clientWidth}px`);
    }
    // Nor anything else in the panel: a remark in words, or the note under a stage.
    const panel = view.container.querySelector<HTMLElement>('.ew-panel')!;
    if (panel.scrollWidth > panel.clientWidth + 1) bad.push(`${state} at ${width}px: the panel itself is ${panel.scrollWidth}px in ${panel.clientWidth}px`);
  }
  return bad;
}

/** Open the run and drag its bar to the very end: the last stage, the pieces shrunk away. */
async function toTheEnd(view: View) {
  await page.viewport(1440, 900);
  await settle();
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  const last = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')].at(-1)!;
  const track = view.container.querySelector('.bp-track')!;
  const box = last.getBoundingClientRect();
  fireEvent.pointerDown(track, {clientX: box.right - 12, button: 0, pointerId: 1});
  fireEvent.pointerMove(track, {clientX: box.right, pointerId: 1});
  fireEvent.pointerUp(track, {clientX: box.right, pointerId: 1});
  // And it got there: the last line is the current one, its second half is in, and the answer is.
  await waitFor(() => expect(view.container.querySelector('.db-step.is-here')?.getAttribute('data-step')).toBe('limit'));
  await waitFor(() => expect(view.container.querySelector('.ew-result.is-shown')).not.toBeNull());
  if (view.container.querySelector('.db-then')) expect(view.container.querySelector('.db-then.is-shown')).not.toBeNull();
  expect(view.container.querySelector('.db-step.is-here .db-note')).not.toBeNull();
}

describe('the derivation fits its panel, in every lesson, at every width', () => {
  for (const lesson of PROBLEMS.filter(p => isReady(p.id))) {
    // Ten layouts a lesson, each measured after the fonts have loaded and the page has laid out.
    // About a second and a half here; given room for a CI runner several times slower.
    it(lesson.id, async () => {
      const view = await open(lesson.id);
      const bad = await overflowing(view, 'at rest');
      await toTheEnd(view);
      bad.push(...await overflowing(view, 'run on its last stage'));
      expect(bad, `${bad.length} lines run off the side of the panel`).toEqual([]);
    }, 60000);
  }
});
