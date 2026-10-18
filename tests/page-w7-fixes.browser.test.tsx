import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, describe, expect, it, onTestFinished} from 'vitest';
import {cdp, page} from 'vitest/browser';
// Measured with the page's own type and sheet: whether a sentence fits a phone's width depends on both.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '../app/globals.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* WAVE SEVEN, THE PAGE: A LINK THAT RAN OFF A PHONE, P STANDING ON THE SHELL, A RUN IN SPACE THAT JUDDERED WITH NO
 * WAY OUT OFFERED, A HANDOUT THAT TOLD THE FIVE STEPS TWICE, AND A LIBRARY THAT OPENED ON A SLICED ROW OF CARDS. */
const STORE = 'field-builder:explorer:v1';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 try { await cdp().send('Emulation.setEmulatedMedia', {media: ''}); } catch { /* not emulating */ }
 await page.viewport(1280, 800);
});
async function openLesson(id: string, width = 1280, height = 800, search = '') {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await sleep(280);
 window.history.replaceState(null, '', '/' + search);
 localStorage.setItem(STORE, JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}

describe('the links under a lesson', () => {
 it('wrap on a 360 phone instead of running the page sideways (the annulus\'s Gauss link)', async () => {
  // The limit plot's data table is hidden by the app's sr-only rule, which this project does not build (print.browser.test.tsx).
  const srOnly = document.createElement('style');
  srOnly.textContent = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border-width:0}';
  document.head.appendChild(srOnly);
  onTestFinished(() => { srOnly.remove(); });
  const view = await openLesson('annulus', 360, 740);
  const link = view.getByRole('link', {name: /A sheet with a hole, by Gauss/});
  expect(link.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
 }, 15000);
});

describe('P is never on the shell', () => {
 it('Height z steps over z = R the way it is moving, both ways', async () => {
  const view = await openLesson('shell');
  const z = view.getByRole('slider', {name: 'Height z'});
  const seen: number[] = [];
  for (let i = 0; i < 21; i++) { fireEvent.keyDown(z, {key: 'ArrowLeft'}); await sleep(10); seen.push(Number(z.getAttribute('aria-valuenow'))); }
  // From z = 3 down past R = 2: 2.05, then 1.95, never 2.
  expect(seen.some(v => Math.abs(v - 2) < 1e-9), seen.join(' ')).toBe(false);
  expect(seen).toContain(1.95);
  for (let i = 0; i < 3; i++) { fireEvent.keyDown(z, {key: 'ArrowRight'}); await sleep(10); seen.push(Number(z.getAttribute('aria-valuenow'))); }
  expect(seen.some(v => Math.abs(v - 2) < 1e-9), seen.join(' ')).toBe(false);
 }, 15000);
 it('a link that stands P on the shell opens it just outside', async () => {
  const view = await openLesson('shell', 1280, 800, '?p=shell&r=2&L=4');
  await waitFor(() => expect(Number(view.getByRole('slider', {name: 'Height z'}).getAttribute('aria-valuenow'))).toBeCloseTo(2.05, 9));
 }, 15000);
});

describe('a run in space on a slow computer', () => {
 async function runRing(gap: number) {
  // Every frame of the page, the run's own included, arrives this far apart: a stand-in for a slow GPU.
  const real = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
  // The frame times it hands out are the gap itself, one on from the last: a loaded runner (software WebGL, a CI
  // machine several times slower) delays the timers, and stamping by performance.now() timed that delay, not the stand-in.
  let stamp = performance.now();
  window.requestAnimationFrame = cb => window.setTimeout(() => cb(stamp += gap), gap) as unknown as number;
  window.cancelAnimationFrame = id => window.clearTimeout(id);
  onTestFinished(() => { window.requestAnimationFrame = real; window.cancelAnimationFrame = cancel; });
  const view = await openLesson('ring');
  expect(view.getByRole('button', {name: '3D'}).getAttribute('aria-pressed'), 'the ring opens in space').toBe('true');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  return view;
 }
 it('is offered the flat view, and taking it presses the 2D switch and keeps the focus there', async () => {
  const view = await runRing(120);
  const offer = await view.findByRole('button', {name: 'Switch to the flat view'}, {timeout: 6000});
  expect(view.getByRole('button', {name: '3D'}).getAttribute('aria-pressed'), 'never switched without asking').toBe('true');
  fireEvent.click(offer);
  const flat = view.getByRole('button', {name: '2D'});
  await waitFor(() => expect(flat.getAttribute('aria-pressed')).toBe('true'), {timeout: 4000});
  expect(document.activeElement).toBe(flat);
  expect(view.queryByRole('button', {name: 'Switch to the flat view'})).toBeNull();
  // The run is still open, on its stage.
  expect(view.getAllByRole('button', {name: /^Stage \d: /}).length).toBe(5);
 }, 20000);
 it('is not offered it when the frames come at sixty a second', async () => {
  const view = await runRing(16);
  await sleep(2600);
  expect(view.queryByRole('button', {name: 'Switch to the flat view'})).toBeNull();
 }, 20000);
});

describe('the printed lesson', () => {
 for (const id of ['bisector', 'shell', 'v-ring'] as const) it(`${id} tells the five steps once, on the board beside the figure`, async () => {
  const view = await openLesson(id, 816, 1056);
  await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
  const lesson = view.getByRole('region', {name: 'The lesson'});
  const lessonHeads = [...lesson.querySelectorAll<HTMLElement>('h3')].filter(h => h.checkVisibility()).map(h => h.textContent);
  const boardHeads = [...view.container.querySelectorAll<HTMLElement>('.db-title')].filter(h => h.checkVisibility()).map(h => h.textContent);
  expect(boardHeads.length).toBe(5);
  for (const h of boardHeads) expect(lessonHeads, `${h} printed twice`).not.toContain(h);
  // What the lesson alone says still prints: its setup, what the answer says, its reading, and the potentials' way back.
  expect(lessonHeads).toEqual(expect.arrayContaining(['The setup', 'What the answer says', 'Read it in a textbook']));
  if (id === 'v-ring') expect(lessonHeads).toContain('Differentiate back');
 }, 15000);
});

describe('the library', () => {
 // The focus on the open lesson's card scrolled the list only as far as the card: it sat at the region's foot with
 // the row above it sliced and its family's name out of sight. Now the family's heading leads the region, or, where
 // the family is taller than the region, the card itself does.
 for (const [id, family, w, h] of [['annulus', 'Rings, disks and arcs', 1280, 800], ['shell', 'Rings, disks and arcs', 360, 640]] as const) it(`opens on the ${id}'s family at ${w} wide, its heading or its card first`, async () => {
  const view = await openLesson(id, w, h);
  fireEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const dialog = await view.findByRole('dialog');
  const list = dialog.querySelector<HTMLElement>('.exp-library-list')!;
  const card = dialog.querySelector<HTMLElement>('[aria-current=page]')!;
  const heading = within(dialog).getByRole('heading', {name: family});
  await sleep(300);
  const top = list.getBoundingClientRect().top, bottom = top + list.clientHeight;
  const head = heading.getBoundingClientRect().top - top, cardTop = card.getBoundingClientRect().top - top;
  expect(card.getBoundingClientRect().bottom, 'the open lesson is in view').toBeLessThanOrEqual(bottom + 1);
  const leads = (head >= 0 && head < 24) || (cardTop >= 0 && cardTop < 24);
  expect(leads, `heading at ${head}, card at ${cardTop}`).toBe(true);
 }, 15000);
});
