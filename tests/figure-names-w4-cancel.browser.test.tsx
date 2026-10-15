import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type: the placer measures every name, and a name measured in a fallback face is another size.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* WHAT CANCELS NAMES WHAT ITS BOARD IS WRITTEN IN, AND A TEACHER'S LINK TO THE PARTS NAMES THE PART THAT SURVIVES.
 *
 * In What cancels the piece's own arrow ΔE was a name the placer could drop -- and it did, in half the frames with a
 * negative charge, where the arrow lies on the line to the piece -- and the arc's r_i = R was hidden at every setting:
 * the board's line, "ΔE_x = −k ΔQ/r_i² cos θ", and its "the drawn arrow ΔE lies along that line", pointed at names the
 * figure did not have, while the mirror's −ΔE_y, written once on the board, kept its. At rest, a teacher's link to the
 * parts (mode=project&components=1) hid the survivor ΔE_x, the one part the answer is built from, and drew the part a
 * mirror will cancel solid, the site's mark for a part that survives. And with a negative charge every arrow lay on
 * its own construction line, the line drawn through it to P. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(() => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}, search = '') {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One (piece|ring)', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
/** Drag the transport to `f` of the way through stage `n` and let go: the run holds there. */
async function hold(view: View, n: number, f: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: ${NAMES[n - 1]}$`)}));
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][n - 1], box = seg.getBoundingClientRect(), x = box.left + f * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(seg, {clientX: x});
 await new Promise(r => setTimeout(r, 200));
 await settle(view);
}
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const shown = (t: SVGTextElement | undefined) => !!t && !t.dataset.placerHidden && t.style.opacity !== '0';
/** An arrow's name, by the symbol it was given. */
const arrowName = (v: View, symbol: string) => [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-vector-label')].filter(t => t.dataset.symbol === symbol);
const named = (v: View, text: string) => [...svgOf(v).querySelectorAll<SVGTextElement>('text')].find(t => t.textContent?.trim() === text);
const P = (v: View) => { const c = svgOf(v).querySelector<SVGCircleElement>('.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };

describe('What cancels keeps the names its own board line is written in', () => {
 const cases: [string, Record<string, number>, number, string[]][] = [
  ['arc', {}, 1440, ['ΔE', 'ri = R']], ['arc', {phi: 1.8 * Math.PI}, 390, ['ΔE', 'ri = R']], ['arc', {phi: 2 * Math.PI}, 1440, ['ΔE', 'ri = R']],
  ['arc', {charge: -2}, 1440, ['ΔE', 'ri = R']], ['ring', {charge: -2}, 1440, ['ΔE', 'ΔQ']], ['ring', {distance: 6}, 1440, ['ΔE']],
  ['bisector', {charge: -3}, 1440, ['ΔE', 'ΔQ']], ['infinite', {charge: -3}, 1440, ['ΔE']], ['semi', {charge: -3}, 390, ['ΔE']],
 ];
 for (const [id, params, w, want] of cases) it(`${id} ${JSON.stringify(params)} at ${w}`, async () => {
  await page.viewport(w, w > 1000 ? 900 : 844);
  const v = await openLesson(id, params);
  await hold(v, 3, .98);
  for (const name of want) {
   const t = name === 'ΔE' ? arrowName(v, 'ΔE')[0] : named(v, name);
   expect(t, `${name} is drawn`).toBeTruthy();
   expect(shown(t), `${name} is not hidden`).toBe(true);
   expect(t!.dataset.keep, `${name} is kept`).toBe('true');
  }
 }, 60000);
});

describe('a teacher\'s link to the parts names the part that survives', () => {
 for (const [id, search, keep] of [['bisector', '&components=1&pair=1', 'ΔE_x'], ['arc', '&components=1', 'ΔE_x'], ['arc', '&components=1&pair=1', 'ΔE_x'], ['ring', '&components=1', 'ΔE_z'], ['ring', '&components=1&pair=1', 'ΔE_z'], ['infinite', '&components=1&pair=1', 'ΔE_x']] as const) it(`${id}${search}`, async () => {
  await page.viewport(1440, 900);
  const v = await openLesson(id, {}, `?p=${id}&mode=project${search}`);
  // Past the second the pair is held whole, and the time it takes to cancel.
  await new Promise(r => setTimeout(r, 2600));
  await settle(v);
  const survivor = arrowName(v, keep)[0];
  expect(survivor, `${keep} is drawn`).toBeTruthy();
  expect(shown(survivor), `${keep} is named`).toBe(true);
 }, 60000);
 for (const id of ['bisector', 'ring', 'arc', 'infinite']) it(`${id}: the part a mirror will cancel is dashed, though the mirror is not drawn`, async () => {
  await page.viewport(1440, 900);
  const v = await openLesson(id, {}, `?p=${id}&mode=project&components=1`);
  await settle(v);
  const drop = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => /^ΔE_[y⊥]$/.test(t.dataset.symbol ?? ''));
  expect(drop, 'the part across is drawn and named').toBeTruthy();
  expect(drop!.closest('.cd-vector')!.classList.contains('is-dashed'), 'dashed').toBe(true);
 }, 60000);
 it('endpoint, which has no mirror: both parts survive, and both are solid', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('endpoint', {}, '?p=endpoint&mode=project&components=1');
  await settle(v);
  const drop = arrowName(v, 'ΔE_y')[0];
  expect(drop).toBeTruthy();
  expect(drop.closest('.cd-vector')!.classList.contains('is-dashed')).toBe(false);
 }, 60000);
});

describe('a negative charge\'s arrows are not drawn over their own construction', () => {
 for (const id of ['bisector', 'infinite', 'arc']) it(`${id}, What cancels`, async () => {
  await page.viewport(1440, 900);
  const v = await openLesson(id, {charge: -3});
  await hold(v, 3, .98);
  const p = P(v), line = svgOf(v).querySelector<SVGLineElement>('.cd-construction[data-ri]')!;
  const end = {x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2'))};
  const piece = [...svgOf(v).querySelectorAll<SVGGElement>('.cd-vector')].find(g => g.querySelector('.cd-vector-label')?.getAttribute('data-symbol') === 'ΔE')!;
  const [, , tx, ty] = piece.dataset.shaft!.split(' ').map(Number), arrow = Math.hypot(tx - p.x, ty - p.y);
  // The line from the piece stops just past the arrow's point, so the arrow is its own stroke.
  expect(Math.hypot(end.x - p.x, end.y - p.y), 'r_i\'s line stops short of P').toBeGreaterThan(arrow);
  expect(Math.hypot(end.x - tx, end.y - ty), 'just past the arrow\'s point').toBeLessThan(6);
 }, 60000);
 it('a positive charge\'s line still runs to P', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('bisector');
  await hold(v, 3, .98);
  const p = P(v), line = svgOf(v).querySelector<SVGLineElement>('.cd-construction[data-ri]')!;
  expect(Math.hypot(Number(line.getAttribute('x2')) - p.x, Number(line.getAttribute('y2')) - p.y)).toBeLessThan(.5);
 }, 60000);
});
