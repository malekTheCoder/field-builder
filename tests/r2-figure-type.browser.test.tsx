import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The display serif the figure's symbols are set in: a subscript's drop is measured against it.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* A SUBSCRIPT HANGS FROM ITS LETTER.
 *
 * The figure's subscripts were set with `baseline-shift: sub`, which drops them about half an em:
 * the subscript's top sat below the middle of the letter it belongs to, and ΔE_y read as ΔE with a
 * stray y underneath. A subscript is dropped a fifth of an em or so -- its top within the letter's
 * own height, its foot a little below the letter's. Measured character by character on the labels
 * the run is written in. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => {
 cleanup();
 window.history.replaceState(null, '', '/');
});
/** On CI's slower machine a lingering save from the lesson before could still win the race for the saved id,
 * and the page opened on that lesson. Choose the lesson as a reader would, from the list, when it did. */
async function settleOn(view: ReturnType<typeof render>, id: string) {
  const title = getProblem(id as never).title;
  if (view.container.querySelector('h1')?.textContent !== title) {
    const nav = view.container.querySelector('nav[aria-label="Lessons"]');
    const link = [...(nav?.querySelectorAll('a') ?? [])].find(a => a.textContent?.trim() === getProblem(id as never).short);
    if (link) fireEvent.click(link);
  }
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(title));
}
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 window.history.replaceState(null, '', '/');
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await settleOn(view, id);
 await document.fonts.ready;
 return view;
}
type Rect = {top: number; bottom: number};
/** The cells of characters `from` to `to` of a label, top to bottom, in the drawing's units. */
function cells(t: SVGTextElement, from: number, to: number): Rect {
 let top = Infinity, bottom = -Infinity;
 for (let i = from; i < to; i++) { const r = t.getExtentOfChar(i); top = Math.min(top, r.y); bottom = Math.max(bottom, r.y + r.height); }
 return {top, bottom};
}
function hangs(t: SVGTextElement, main: number, sub: number) {
 const size = parseFloat(getComputedStyle(t).fontSize);
 const letter = cells(t, main - 1, main), script = cells(t, main, main + sub);
 const where = `${t.textContent}: letter ${letter.top.toFixed(1)}–${letter.bottom.toFixed(1)}, subscript ${script.top.toFixed(1)}–${script.bottom.toFixed(1)}, size ${size}`;
 expect(script.bottom - letter.bottom, where).toBeLessThanOrEqual(.3 * size);
 expect(script.bottom - letter.bottom, where).toBeGreaterThan(0);
 expect(script.top, where).toBeGreaterThanOrEqual(letter.top);
 expect(script.top, where).toBeLessThanOrEqual(letter.bottom);
}
describe('subscripts hang from their letters', () => {
 it('ΔE_x, ΔE_y and r_i, as What cancels names them', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  await waitFor(() => expect(view.container.querySelectorAll('[data-cancel-transverse] .cd-vector-label').length).toBe(2));
  const labels = [...view.container.querySelectorAll<SVGTextElement>('.cd-svg text')];
  for (const name of ['ΔEx', 'ΔEy', 'ri']) {
   const t = labels.find(l => l.textContent === name);
   expect(t, name).toBeTruthy();
   hangs(t!, name.length - 1, 1);
  }
 }, 20000);
 it('λ_0, at the top of the ramp, and the text after a subscript is back on the line', async () => {
  const view = await openLesson('ramp');
  const t = [...view.container.querySelectorAll<SVGTextElement>('.cd-svg text')].find(l => l.textContent === 'λ = λ0')!;
  expect(t).toBeTruthy();
  hangs(t, 5, 1);
  // On the axis lesson the distance's name runs on after its subscript: r_i = L + a − x.
  cleanup();
  const axial = await openLesson('axial');
  fireEvent.click(axial.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(axial.getByRole('button', {name: 'Stage 2: One piece'}));
  const ri = await waitFor(() => { const l = [...axial.container.querySelectorAll<SVGTextElement>('.cd-svg text')].find(x => x.textContent?.startsWith('ri =')); expect(l).toBeTruthy(); return l!; });
  hangs(ri, 1, 1);
  const r = ri.getExtentOfChar(0), after = ri.getExtentOfChar(3);
  expect(Math.abs(after.y + after.height - (r.y + r.height))).toBeLessThan(.5);
 }, 20000);
});
