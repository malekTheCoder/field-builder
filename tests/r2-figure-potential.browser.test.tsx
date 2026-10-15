import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own styles: the distance's colour is defined there, and so is the rule that shows the
// run's line of algebra under the figure on a narrow screen.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {resultLines} from '../src/workbench/derivation';
/* THE POTENTIAL'S FIGURE SAYS WHAT IT IS SHOWING.
 *
 * Four potential lessons leave their integral unsimplified on the board, so on a screen without the
 * panel the run ended on the bare integral and never said what V is. The column that is the
 * potential's own picture had no name until it was finished, and lit its piece where that piece
 * would eventually sit -- a block floating at the top of a column too faint to see, and its mirror
 * at the other end -- so "both go on the pile" was said over a picture that did not show it. Its
 * lessons never named r_i, so pointing at the distance on the board lit an unnamed line; and the
 * distance lit on the figure in the field's teal, beside a board that writes it in blue. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 await page.viewport(1440, 900);
});
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const KEYS = ['pieces', 'one', 'cancel', 'add', 'limit'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function stage(view: View, n: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: ${NAMES[n - 1].replace('One piece', 'One (piece|ring)')}$`)}));
 await waitFor(() => expect(view.container.querySelector(`.cd-stage-${KEYS[n - 1]}`)).toBeTruthy());
 await frames(3);
}
function scrub(view: View, i: number, f: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const segment = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][i], seg = segment.getBoundingClientRect();
 const x = seg.left + f * seg.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(segment, {clientX: x});
}
const shown = (t: Element | undefined) => !!t && !(t as SVGTextElement).dataset.placerHidden && Number(getComputedStyle(t).opacity) > .5;
const named = (view: View, text: string) => [...view.container.querySelectorAll<SVGTextElement>('.cd-svg text')].find(t => t.textContent?.trim() === text);
/** A colour as the browser computes it, for comparing a variable with a fill. */
function rgb(colour: string) {
 const probe = document.createElement('span');
 probe.style.color = colour;
 document.body.appendChild(probe);
 const out = getComputedStyle(probe).color;
 probe.remove();
 return out;
}
describe('at the end of the run, the player states V on a screen without the panel', () => {
 for (const id of ['v-ring', 'v-rod-axial']) it(id, async () => {
  await page.viewport(900, 900);
  const view = await openLesson(id);
  await stage(view, 5);
  scrub(view, 4, .99);
  await waitFor(() => expect(view.container.querySelector('.bp-math')?.querySelectorAll('annotation').length).toBeGreaterThan(1));
  const math = view.container.querySelector<HTMLElement>('.bp-math')!;
  expect(math.checkVisibility()).toBe(true);
  const written = [...math.querySelectorAll('annotation')].map(a => a.textContent?.replace(/\s+/g, ''));
  for (const line of resultLines(getProblem(id as never))) expect(written, line).toContain(line.replace(/\s+/g, ''));
 }, 20000);
});
describe('the column says what it is holding, and holds it from P up', () => {
 it('v-ring, What cancels: the piece and its mirror stacked on the rule at P, named ΔV + ΔV', async () => {
  const view = await openLesson('v-ring');
  await stage(view, 3);
  const P = Number(view.container.querySelector('.cd-point')!.getAttribute('cy'));
  const lit = [...view.container.querySelectorAll<SVGRectElement>('[data-stack-lit]')];
  expect(lit.length).toBe(2);
  const bottom = Math.max(...lit.map(r => Number(r.getAttribute('y')) + Number(r.getAttribute('height'))));
  expect(Math.abs(bottom - P)).toBeLessThan(.5);
  // One on the other, no gap between.
  const [low, high] = [...lit].sort((a, b) => Number(b.getAttribute('y')) - Number(a.getAttribute('y')));
  expect(Math.abs(Number(high.getAttribute('y')) + Number(high.getAttribute('height')) - Number(low.getAttribute('y')))).toBeLessThan(.5);
  // Nothing faint under the stack to read it against: the stack is all there is.
  expect(view.container.querySelectorAll('.cd-stack-slot').length).toBe(0);
  const label = view.container.querySelector('[data-gauge-name]');
  expect(label?.textContent).toBe('ΔV + ΔV');
  expect(shown(label!)).toBe(true);
 }, 20000);
 it('v-ring, One piece: one block on the rule, named ΔV', async () => {
  const view = await openLesson('v-ring');
  await stage(view, 2);
  const label = view.container.querySelector('[data-gauge-name]');
  expect(label?.textContent).toBe('ΔV');
  expect(shown(label!)).toBe(true);
 }, 20000);
});
describe('a potential names its distance', () => {
 for (const id of ['v-rod-bisector', 'v-ring']) it(`${id}, One piece: r_i${id === 'v-rod-bisector' ? ' and y' : ''}`, async () => {
  const view = await openLesson(id);
  await stage(view, 2);
  expect(shown(named(view, 'ri')), 'r_i').toBe(true);
  if (id === 'v-rod-bisector') expect(shown(named(view, 'y')), 'y').toBe(true);
  // A number has no direction: no angle is drawn for it.
  expect(view.container.querySelector('.cd-svg .cd-angle')).toBeNull();
 }, 20000);
 it('pointing at the distance on the board names r_i on the figure', async () => {
  const view = await openLesson('v-rod-bisector');
  expect(named(view, 'ri')).toBeUndefined();
  const factor = view.container.querySelector('.db .fx-distance')!;
  expect(factor).toBeTruthy();
  fireEvent.pointerOver(factor);
  await waitFor(() => expect(view.container.querySelector('.cd-focus-distance')).toBeTruthy());
  await frames(2);
  expect(shown(named(view, 'ri'))).toBe(true);
 }, 20000);
});
describe('the distance is lit in the distance\'s own colour', () => {
 it('pointing at r lights the figure\'s r in the colour the board writes the distance in', async () => {
  const view = await openLesson('bisector');
  const slider = view.container.querySelector('.exp-range [data-slot="slider"][aria-label="Distance r"]')!;
  expect(slider).toBeTruthy();
  fireEvent.pointerEnter(slider.closest('.exp-range')!);
  await waitFor(() => expect(view.container.querySelector('.cd-focus-distance')).toBeTruthy());
  const r = view.container.querySelector<SVGTextElement>('.cd-dimension[data-dim="distance"] text')!;
  const want = rgb(getComputedStyle(view.container.querySelector('.charge-diagram')!).getPropertyValue('--term-distance').trim());
  expect(getComputedStyle(r).fill).toBe(want);
  expect(getComputedStyle(view.container.querySelector('.cd-dimension[data-dim="distance"] path')!).stroke).toBe(want);
 }, 20000);
});
