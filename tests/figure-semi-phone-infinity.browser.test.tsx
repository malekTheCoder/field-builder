import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE HALF LINE'S ∞ ON A PHONE. In What cancels the run's piece, cut by angle, sits at the top break, and its ΔQ
 * hung beside the break took the spot left of the marks: the placer hid ∞, the one name that says the line never
 * ends, and the line read as stopping at the top of the frame. Both are drawn, apart. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(() => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true,
  params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 window.history.replaceState(null, '', '/');
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
async function hold(view: View, n: number, f: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(await view.findByRole('button', {name: new RegExp(`^Stage ${n}: `)}));
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][n - 1], box = seg.getBoundingClientRect(), x = box.left + f * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(seg, {clientX: x});
 await new Promise(r => setTimeout(r, 250));
 await settle(view);
}
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const shown = (t: SVGTextElement | undefined | null) => !!t && !t.dataset.placerHidden && t.style.opacity !== '0' && getComputedStyle(t).opacity !== '0';
describe('the semi-infinite line on a phone, What cancels', () => {
 for (const [w, h, params] of [[390, 844, {}], [360, 740, {}], [390, 844, {charge: -2}]] as const) it(`${w} × ${h} ${JSON.stringify(params)}`, async () => {
  await page.viewport(w, h);
  const v = await openLesson('semi', params);
  await hold(v, 3, .98);
  const texts = [...svgOf(v).querySelectorAll<SVGTextElement>('text')];
  const infinity = texts.find(t => t.textContent?.trim() === '∞'), dq = texts.find(t => t.textContent?.trim() === 'ΔQ' && t.closest('.cd-source-tag'));
  expect(shown(infinity), '∞ at the top break is drawn').toBe(true);
  expect(shown(dq), 'the piece\'s ΔQ is drawn').toBe(true);
  const a = infinity!.getBoundingClientRect(), b = dq!.getBoundingClientRect();
  const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
  expect(apart, '∞ and ΔQ do not overlap').toBe(true);
 }, 60000);
});
