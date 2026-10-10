import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
// Measured with the page's own type and sheet: what fits in a window depends on both.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* WHAT FITS IN THE WINDOWS READERS HAVE.
 *
 * A phone held sideways ran the stage's sentence under the window at almost every stage, and on the smaller
 * ones showed the run's algebra at none; a Chromebook cut the drawing's footer through its middle on six
 * lessons; the board ran fifteen hundred pixels past the figure at rest; the library opened on a phone with
 * its title and Close out of view; the crumb's focus ring was a forty-four pixel box; and a few things meant
 * for the screen -- the caption's sentence under a running figure, Show every step on paper -- were left in. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 try { await cdp().send('Emulation.setEmulatedMedia', {media: ''}); } catch { /* not emulating */ }
 await page.viewport(1280, 800);
});
async function openLesson(id: string, width: number, height: number) {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 return view;
}
const box = (view: {container: HTMLElement}, selector: string) => view.container.querySelector(selector)!.getBoundingClientRect();
const STAGES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
/** Where the words of an element end, not its box: a grid cell is as tall as the tallest stage's. */
function inkBottom(el: Element) { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().bottom; }
async function eachStage(view: {container: HTMLElement; getByRole: (role: string, o: {name: string}) => HTMLElement}, check: (name: string) => void) {
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 for (const [i, name] of STAGES.entries()) {
  fireEvent.click(view.getByRole('button', {name: `Stage ${i + 1}: ${name}`}));
  await waitFor(() => { expect(box(view, '.cd-stage').top, `${name}: the drawing went off the top`).toBeGreaterThanOrEqual(-1); check(name); }, {timeout: 4000});
 }
}

describe('a phone held sideways', () => {
 // Galaxy phones sideways (800 by 360), an iPhone in Safari with its bars (844 by 360), and two more.
 for (const [w, h, id] of [[760, 360, 'bisector'], [800, 360, 'ring'], [844, 360, 'ring'], [812, 375, 'ring']] as const) it(`at ${w} by ${h}, the ${id}'s sentence ends on screen at every stage`, async () => {
  const view = await openLesson(id, w, h);
  await eachStage(view, name => {
   const line = view.container.querySelector('.bp-line')!;
   expect(line.checkVisibility(), `${name}: no sentence`).toBe(true);
   expect(inkBottom(line), `${name}: the sentence runs under the window`).toBeLessThanOrEqual(innerHeight + 1);
  });
 }, 40000);
 for (const [w, h] of [[640, 360], [667, 375]] as const) it(`at ${w} by ${h}, the run's algebra is on screen at every stage`, async () => {
  const view = await openLesson('bisector', w, h);
  await eachStage(view, name => {
   const step = view.container.querySelector('.bp-math-step.is-here')!;
   const shown = [...step.children].filter(c => c.checkVisibility());
   expect(shown.length, `${name}: no algebra on screen`).toBeGreaterThan(0);
   for (const c of shown) expect(c.getBoundingClientRect().bottom, `${name}: the algebra runs under the window`).toBeLessThanOrEqual(innerHeight + 1);
  });
 }, 40000);
});

describe('a Chromebook window', () => {
 it('the drawing and its footer are whole on the first screen, whatever the subtitle', async () => {
  for (const id of ['arc', 'semi', 'v-rod-axial', 'bisector']) {
   const view = await openLesson(id, 1366, 657);
   for (const f of view.container.querySelectorAll('.cd-footer')) expect(f.getBoundingClientRect().bottom, `${id}: the footer is cut by the window`).toBeLessThanOrEqual(innerHeight);
   expect(box(view, '.cd-stage').bottom, `${id}: the drawing runs under the window`).toBeLessThanOrEqual(innerHeight + 1);
   cleanup();
   window.history.replaceState(null, '', '/');
  }
 }, 30000);
});

describe('on a laptop at rest', () => {
 it('the board is held to the window beside the figure, and the endnotes are a window away, not three', async () => {
  const view = await openLesson('ring', 1366, 768);
  const panel = view.container.querySelector<HTMLElement>('.exp-workspace>.ew-panel')!;
  expect(getComputedStyle(panel).overflowY).toBe('auto');
  expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(innerHeight - 52 + 1);
  // Scrolled to where the board sticks, and the board read to its end: the figure is still beside it.
  window.scrollTo(0, panel.getBoundingClientRect().top + scrollY - 22);
  panel.scrollTop = panel.scrollHeight;
  expect(box(view, '.cd-stage').bottom, 'the figure left the screen').toBeGreaterThan(innerHeight / 2);
  expect(box(view, '.exp-endnotes').top + scrollY, 'the endnotes are far down the page').toBeLessThan(innerHeight * 2);
  // And on paper it is the whole board.
  await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
  expect(getComputedStyle(panel).maxHeight).toBe('none');
  expect(getComputedStyle(panel).overflowY).toBe('visible');
  const unfold = view.container.querySelector('.ew-result-unfold');
  if (unfold) expect(getComputedStyle(unfold).display, 'Show every step on paper').toBe('none');
 });
});

describe('the header row', () => {
 it('the library crumb is a finger tall, and its focus ring is round its words', async () => {
  const view = await openLesson('ring', 1366, 657);
  const crumb = view.getByRole('button', {name: 'Charge library'});
  const r = crumb.getBoundingClientRect();
  expect(r.height, 'the ring is drawn round a box this tall').toBeLessThanOrEqual(30);
  // The finger's band above and below the words still lands on it.
  for (const y of [r.top - 9, r.bottom + 9]) expect(crumb.contains(document.elementFromPoint(r.left + r.width / 2, y)), `nothing to tap at ${y}`).toBe(true);
  // And the title does not end on one word on a phone.
  expect(getComputedStyle(view.container.querySelector('h1')!).getPropertyValue('text-wrap-style')).toBe('balance');
 });
 it('on a phone the library opens on the lesson with its title and Close in view', async () => {
  const view = await openLesson('v-rod-axial', 390, 844);
  await userEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const dialog = await view.findByRole('dialog');
  const card = within(dialog).getByRole('link', {name: getProblem('v-rod-axial').short});
  await waitFor(() => expect(document.activeElement).toBe(card));
  await new Promise(r => setTimeout(r, 300));
  expect(within(dialog).getByRole('heading', {name: 'Choose your geometry'}).getBoundingClientRect().top, 'the title is above the window').toBeGreaterThanOrEqual(0);
  expect(within(dialog).getByRole('button', {name: 'Close'}).getBoundingClientRect().top, 'Close is above the window').toBeGreaterThanOrEqual(0);
  const c = card.getBoundingClientRect();
  expect(c.top >= 0 && c.bottom <= innerHeight, 'the open lesson\'s card is out of view').toBe(true);
 });
});

describe('the run on a phone', () => {
 it('the figure\'s resting caption makes way for the run\'s own sentence', async () => {
  const view = await openLesson('bisector', 390, 844);
  expect(view.container.querySelector('.cd-caption>span')!.checkVisibility()).toBe(true);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  expect(view.container.querySelector('.cd-caption>span')!.checkVisibility(), 'two sentences about the figure').toBe(false);
 });
});

describe('the limiting cases', () => {
 it('the tabs are as wide as the check they choose between', async () => {
  const view = await openLesson('ring', 1280, 800);
  fireEvent.click(view.getByText('Limiting cases'));
  const tabs = await view.findByRole('tablist', {name: 'Limiting cases'});
  await waitFor(() => expect(view.container.querySelector('.exp-limit-panel .assessment')).toBeTruthy());
  const check = view.container.querySelector('.exp-limit-panel .assessment')!.getBoundingClientRect();
  expect(tabs.getBoundingClientRect().width).toBeLessThanOrEqual(check.width + 1);
 });
});
