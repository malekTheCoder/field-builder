import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';
/* THE MARKS IN SPACE SAY WHAT THE FLAT ONES SAY.
 *
 * Turned into space, the figure kept fewer of the stage's own terms and laid some of its marks by the flat view's
 * rules: the arc and the rod seen along its axis lost θ, r_i = R, Δθ, dθ, x, r_i = L + a − x, Δx and dx, which
 * the board boxes for the stage; the y axis' letter fell under the view cube on a phone; the endless lines'
 * limit arrows stood twenty units off their line, as wide as long, and the half line's far one unnamed; the
 * sheet's far limit and its "s → ∞" were drawn inside the "Same triangle" inset; the disk on a phone carried one sign
 * mark; and a minus beside the bisector's O read "O −". */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 localStorage.clear();
 await page.viewport(1280, 800);
});
type Id = 'arc' | 'axial' | 'v-rod-axial' | 'infinite' | 'semi' | 'sheet' | 'disk' | 'bisector';
async function openLesson(id: Id, search?: string, params: Partial<Params> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 if (search) window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const figure = (view: View) => view.container.querySelector<HTMLElement>('.charge-diagram')!;
const svg = (view: View) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
async function toSpace(view: View) {
 if (!figure(view).classList.contains('cd-in-space')) {
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(figure(view).classList.contains('cd-in-space')).toBe(true));
 }
 // The camera glides from the flat view to the opening one.
 await new Promise(r => setTimeout(r, 1400));
}
async function stage(view: View, n: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 await waitFor(() => expect(view.queryByRole('button', {name: /^Stage 1: /})).toBeTruthy());
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: `)}));
 await new Promise(r => setTimeout(r, 300));
 // Paused at the stage's end, as a reader stepping through it sees it.
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][n - 1], track = view.container.querySelector<HTMLElement>('.bp-track')!, box = seg.getBoundingClientRect(), x = box.left + .98 * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 await waitFor(() => expect(figure(view).dataset.moving).toBe('false'), {timeout: 6000}).catch(() => undefined);
 // The triangle fades in a little after its stage begins (charge-diagram.css, `cd-fade`).
 await new Promise(r => setTimeout(r, 1300));
}
// A name the reader can see: drawn, not hidden by the placer, not faded out.
const shown = (t: Element | null | undefined) => {
 if (!t) return false;
 if ((t as HTMLElement).dataset?.placerHidden || t.closest('.is-hidden,[opacity="0"]')) return false;
 for (let e: Element | null = t; e && e !== document.body; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < .2) return false;
 const r = t.getBoundingClientRect();
 return r.width > 0 && r.height > 0;
};
const texts = (view: View, selector = 'text') => [...svg(view).querySelectorAll<SVGTextElement>(selector)];
const named = (view: View, re: RegExp, selector?: string) => texts(view, selector).filter(t => re.test((t.textContent ?? '').replace(/\s+/g, ' ')) && shown(t));
describe('the arc and the rod seen along its axis keep their stage terms in space', () => {
 it('arc: Δθ as it is cut, θ and r_i = R for one piece, dθ in the limit', async () => {
  const view = await openLesson('arc');
  await toSpace(view);
  await stage(view, 1);
  expect(named(view, /^Δθ$/).length, 'Cut it up: the piece\'s angle').toBe(1);
  await stage(view, 2);
  expect(named(view, /^θ$/, '.cd-angle').length, 'One piece: θ').toBe(1);
  expect(named(view, /^ri = R$/).length, 'One piece: r_i = R beside the line to the piece').toBe(1);
  await stage(view, 5);
  expect(named(view, /^dθ$/).length, 'Shrink them: dθ').toBe(1);
 }, 60000);
 it('rod on its axis: Δx as it is cut, x and r_i = L + a − x for one piece, dx in the limit -- beside the rod as projected', async () => {
  const view = await openLesson('axial');
  await toSpace(view);
  await stage(view, 1);
  expect(named(view, /^Δx$/, '[data-piece-length] text').length, 'Cut it up: Δx').toBe(1);
  await stage(view, 2);
  const coordinate = svg(view).querySelector('[data-piece-coordinate] text');
  expect(shown(coordinate) && coordinate!.textContent, 'One piece: the piece\'s x').toBe('x');
  expect(named(view, /^ri = L \+ a − x$/).length, 'One piece: r_i = L + a − x').toBe(1);
  // The r_i bracket runs parallel to the rod as drawn: its two ends are as far from the rod's line as each other.
  const bar = svg(view).querySelector('.cd-ri-bar')!.getAttribute('d')!.match(/^M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/)!.slice(1).map(Number);
  const axes = svg(view).querySelector('.cd-axes path')!.getAttribute('d')!.match(/^M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/)!.slice(1).map(Number);
  const off = (x: number, y: number) => { const [ax, ay, bx, by] = axes, l = Math.hypot(bx - ax, by - ay); return ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / l; };
  expect(Math.abs(off(bar[0], bar[1]) - off(bar[2], bar[3]))).toBeLessThan(1.5);
  expect(Math.abs(off(bar[0], bar[1]))).toBeGreaterThan(8);
  await stage(view, 5);
  expect(named(view, /^dx$/, '[data-piece-length] text').length, 'Shrink them: dx').toBe(1);
 }, 60000);
});
describe('the y axis\' letter in space', () => {
 it('is never under the view cube: the rod on its axis on a phone', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('v-rod-axial');
  await toSpace(view);
  const y = svg(view).querySelector('[data-axis="y"]')!.getBoundingClientRect(), cube = svg(view).querySelector('.cd-cube')!.getBoundingClientRect();
  const w = Math.max(0, Math.min(y.right, cube.right) - Math.max(y.left, cube.left)), h = Math.max(0, Math.min(y.bottom, cube.bottom) - Math.max(y.top, cube.top));
  expect(w * h / (y.width * y.height), 'the share of y under the cube').toBeLessThan(.15);
 }, 60000);
});
describe('the limits\' arrows at the frame, in space', () => {
 const edges = (view: View) => [...svg(view).querySelectorAll<SVGGElement>('.cd-bound.is-edge')].map(g => {
  const d = g.querySelector('path')!.getAttribute('d')!, [tx, ty, ax, ay, bx, by] = d.match(/[-\d.]+/g)!.map(Number);
  return {g, tip: {x: tx, y: ty}, base: {x: (ax + bx) / 2, y: (ay + by) / 2}, width: Math.hypot(ax - bx, ay - by), name: g.querySelector('text')?.textContent ?? ''};
 });
 // The scene draws each axis right through O; the SVG's own axes path gives the line on the screen.
 const axis = (view: View, k: 0 | 1) => svg(view).querySelector('.cd-axes path')!.getAttribute('d')!.split('M').filter(Boolean)[k].match(/[-\d.]+/g)!.map(Number);
 const fromLine = (q: {x: number; y: number}, [ax, ay, bx, by]: number[]) => Math.abs((bx - ax) * (q.y - ay) - (by - ay) * (q.x - ax)) / Math.hypot(bx - ax, by - ay);
 for (const [id, k] of [['infinite', 1], ['semi', 0]] as const) it(`${id}: on its line, longer than wide, and named`, async () => {
  const view = await openLesson(id, `?p=${id}&mode=integrate`);
  await toSpace(view);
  const all = edges(view);
  expect(all.length, 'an arrow where the line runs off the page').toBeGreaterThan(0);
  for (const e of all) {
   expect(fromLine(e.tip, axis(view, k)), `${id}: its tip on the line`).toBeLessThan(2);
   expect(fromLine(e.base, axis(view, k)), `${id}: and its base`).toBeLessThan(2);
   expect(e.width, 'narrower than long').toBeLessThan(Math.hypot(e.tip.x - e.base.x, e.tip.y - e.base.y));
   expect(e.name, 'named').toMatch(id === 'infinite' ? /^α → / : /^x → ∞$/);
  }
 }, 60000);
 for (const [w, h] of [[1440, 900], [390, 844]] as const) it(`sheet at ${w}: the far limit and its name stay out of the "Same triangle" inset`, async () => {
  await page.viewport(w, h);
  const view = await openLesson('sheet', '?p=sheet&mode=integrate');
  await new Promise(r => setTimeout(r, 800));
  const inset = svg(view).querySelector('.cd-triangle[data-kind="schematic"]')!.getBoundingClientRect();
  const far = svg(view).querySelector('[data-bound="upper"]');
  expect(far, 'the far limit, off the page in space').toBeTruthy();
  for (const part of [far!.querySelector('path'), far!.querySelector('text')]) {
   const r = part!.getBoundingClientRect();
   const meet = Math.max(0, Math.min(r.right, inset.right) - Math.max(r.left, inset.left)) * Math.max(0, Math.min(r.bottom, inset.bottom) - Math.max(r.top, inset.top));
   expect(meet, `${part!.tagName} inside the inset`).toBe(0);
  }
 }, 60000);
});
describe('the charge\'s sign marks in space', () => {
 // Where the scene drew them, in the figure's units, for the tests: see FieldStage's `laySigns`.
 const marks = async (view: View) => {
  await waitFor(() => expect(view.container.querySelector<HTMLElement>('.cd-field-stage')?.dataset.signMarks).toBeDefined(), {timeout: 8000});
  await new Promise(r => setTimeout(r, 500));
  const at = view.container.querySelector<HTMLElement>('.cd-field-stage')!.dataset.signScreen ?? '';
  return at.split(' ').filter(Boolean).map(q => q.split(',').map(Number)).map(([x, y]) => ({x, y}));
 };
 it('the disk on a phone carries a few, not one', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('disk');
  expect((await marks(view)).length).toBeGreaterThanOrEqual(3);
 }, 60000);
 it('a minus never stands level with the bisector\'s O, close by', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('bisector', undefined, {charge: -3});
  await toSpace(view);
  const all = await marks(view), s = svg(view).getBoundingClientRect(), k = 720 / s.width;
  const o = texts(view).find(t => t.textContent === 'O' && shown(t))!.getBoundingClientRect();
  const box = {left: (o.left - s.left) * k, right: (o.right - s.left) * k, top: (o.top - s.top) * k, bottom: (o.bottom - s.top) * k};
  // Level: across the middle of the letter's line, where a dash beside it reads as one more character.
  const h = box.bottom - box.top;
  for (const m of all) if (m.y > box.top + .2 * h && m.y < box.bottom - .2 * h) expect(Math.max(box.left - m.x, m.x - box.right), `a minus at ${m.x.toFixed(0)},${m.y.toFixed(0)} beside O`).toBeGreaterThan(20);
  // And no mark was given up for it: the wire keeps its row of signs, the one by O moved along it.
  expect(all.length).toBeGreaterThanOrEqual(4);
 }, 60000);
});
