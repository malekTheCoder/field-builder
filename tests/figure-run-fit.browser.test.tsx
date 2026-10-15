import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE RUN'S ARROWS STAY IN THE PICTURE, AND SAY WHAT THEY ARE.
 *
 * The run's scale was fitted to the net field alone. Where the pieces mostly cancel -- an arc closed
 * nearly into a ring, a ring with P close over a wide loop -- each piece's field is many times the net,
 * so the piece, its parts and the chain that winds round before it closes ran hundreds of pixels out of
 * the figure, through the footer and off the card. With E = 0 the scale was read off the pieces of the
 * moment, so Shrink them inflated the closed chain into a curve thousands of pixels round. A negative
 * charge's net was stretched until its head was buried in the charge. The ring, the disk and the sheet
 * were drawn at a fixed scale, so a lifted P left the plot. And the potential's column, whose direction
 * is its only sign, was stood upside down where the room above P was short. Each is measured here, in
 * the shipped Explorer. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
/** Drag the transport to `f` of the way through stage `n` and let go: the run holds there. */
async function hold(view: View, n: number, f: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: ${NAMES[n - 1].replace('One piece', 'One (piece|ring)')}$`)}));
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][n - 1], box = seg.getBoundingClientRect(), x = box.left + f * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(seg, {clientX: x});
 await new Promise(r => setTimeout(r, 250));
 await settle(view);
}
async function turn(view: View, to: '2D' | '3D') {
 fireEvent.click(view.getByRole('button', {name: to}));
 // The turn to 2D is a 0.65 s glide before the figure goes flat, and a loaded machine draws the scene's
 // frames slowly through it: the default second was measured at 0.7 to 0.9 s here, on old code and new.
 await waitFor(() => expect(view.container.querySelector('.cd-in-space') !== null).toBe(to === '3D'), {timeout: 5000});
 await new Promise(r => setTimeout(r, 1000));
 await settle(view);
}
const PLOT = {x0: 42, y0: 54, x1: 668, y1: 371};
const inPlot = (p: {x: number; y: number}) => p.x >= PLOT.x0 - 1 && p.x <= PLOT.x1 + 1 && p.y >= PLOT.y0 - 1 && p.y <= PLOT.y1 + 1;
/** Every end of every arrow drawn, and every point of the chain, in the drawing's own units. */
function reached(view: View) {
 const out: {x: number; y: number; what: string}[] = [];
 for (const g of view.container.querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')) {
  if (g.closest('[opacity="0"]')) continue;
  const [x1, y1, x2, y2] = g.dataset.shaft!.split(' ').map(Number);
  const name = g.querySelector('.cd-vector-label')?.getAttribute('data-symbol') ?? 'arrow';
  out.push({x: x1, y: y1, what: name}, {x: x2, y: y2, what: name});
 }
 const chain = view.container.querySelector('.cd-sum-chain')?.getAttribute('d') ?? '';
 for (const m of chain.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)) out.push({x: Number(m[1]), y: Number(m[2]), what: 'chain'});
 return out;
}
const P = (view: View) => { const c = view.container.querySelector<SVGCircleElement>('circle.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
function namedArrow(view: View, symbol: string) {
 const label = [...view.container.querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => (t.getAttribute('data-symbol') ?? '').replace(/^E [≈=] /, '') === symbol);
 expect(label, `${symbol} is drawn`).toBeTruthy();
 expect(label!.dataset.placerHidden, `${symbol} is not hidden`).toBeUndefined();
 return label!.closest<SVGGElement>('.cd-vector')!.dataset.shaft!.split(' ').map(Number);
}
describe('where the pieces mostly cancel, every arrow and the chain stay in the plot', () => {
 const cases: [string, Record<string, number>, '2D' | '3D' | null][] = [
  ['arc', {phi: Math.PI * 1.9}, null],
  ['arc', {phi: Math.PI * 1.75}, '3D'],
  ['ring', {size: 8, distance: .5, slices: 3}, null],
  ['ring', {size: 8, distance: 1, slices: 5}, '2D'],
 ];
 for (const [id, params, view] of cases) it(`${id} ${JSON.stringify(params)}${view ? ` in ${view}` : ''}: One piece, What cancels, Add them up`, async () => {
  const v = await openLesson(id, params);
  if (view) await turn(v, view);
  for (const [n, f] of [[2, .97], [3, .2], [3, .97], [4, .97]] as const) {
   await hold(v, n, f);
   const out = reached(v).filter(p => !inPlot(p)).map(p => `${p.what} at ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
   expect(out, `stage ${n} at ${f}`).toEqual([]);
  }
 }, 45000);
});
describe('an arc closed into a ring: the field is zero, and the run says so', () => {
 it('Add them up takes the sum out along the axis and back to P, and Shrink them names E = 0', async () => {
  const v = await openLesson('arc', {phi: Math.PI * 2});
  // The pieces go in as mirror pairs from the middle out: the near pairs take the sum out along the axis...
  const sum = () => { const l = v.container.querySelector('[data-sum-arrow] line'); return l ? Math.hypot(Number(l.getAttribute('x2')) - Number(l.getAttribute('x1')), Number(l.getAttribute('y2')) - Number(l.getAttribute('y1'))) : 0; };
  await hold(v, 4, .8 * (.2675 + .7325 * .55));
  expect(sum()).toBeGreaterThan(20);
  expect(reached(v).filter(p => !inPlot(p))).toEqual([]);
  // ...and the far pairs, past a quarter turn, bring it back to P.
  await hold(v, 4, .97);
  expect(sum()).toBeLessThan(2);
  await hold(v, 5, .99);
  expect(reached(v).filter(p => !inPlot(p))).toEqual([]);
  const zero = v.container.querySelector<SVGTextElement>('.cd-zero');
  expect(zero?.textContent).toBe('E = 0');
  expect(zero!.dataset.placerHidden).toBeUndefined();
 }, 30000);
});
describe('a field that points at the charge stops short of it, and is named', () => {
 it('endpoint, Q < 0: the net at the end of Add them up and Shrink them', async () => {
  const v = await openLesson('endpoint', {charge: -3});
  const origin = v.container.querySelector<SVGTextElement>('.cd-origin')!.dataset.at!.split(' ').map(Number);
  for (const n of [4, 5]) {
   await hold(v, n, .99);
   const name = v.container.querySelector('.cd-vector-label[data-symbol="E"]') ? 'E' : 'Σ ΔE';
   const [, , x2] = namedArrow(v, name);
   // The rod is drawn seven units either side of its axis.
   expect(x2 - (origin[0] + 7), `${name}'s head clear of the rod`).toBeGreaterThanOrEqual(20);
  }
 }, 30000);
 it('disk, Q < 0, in space: E stops above the disk and keeps its name', async () => {
  const v = await openLesson('disk', {charge: -3});
  await hold(v, 5, .99);
  const [, , , y2] = namedArrow(v, v.container.querySelector('.cd-vector-label[data-symbol="E"]') ? 'E' : 'Σ ΔE');
  const origin = v.container.querySelector<SVGTextElement>('.cd-origin')!.dataset.at!.split(' ').map(Number);
  expect(origin[1] - y2).toBeGreaterThanOrEqual(20);
 }, 30000);
});
describe('the ring, the disk and the sheet are drawn to a scale that holds P', () => {
 for (const id of ['ring', 'disk', 'sheet']) for (const view of ['2D', '3D'] as const) it(`${id} with P six metres up, in ${view}`, async () => {
  const v = await openLesson(id, {distance: 6});
  if (view === '2D') await turn(v, '2D');
  await settle(v);
  expect(P(v).y, 'P well inside the plot, with room above it').toBeGreaterThanOrEqual(160);
  await hold(v, 5, .99);
  expect(reached(v).filter(p => !inPlot(p))).toEqual([]);
 }, 30000);
});
describe('the potential\'s column points the way its sign does', () => {
 for (const charge of [2, -2]) it(`v-rod-axial in space, Q ${charge > 0 ? '>' : '<'} 0`, async () => {
  const v = await openLesson('v-rod-axial', {charge});
  await turn(v, '3D');
  await hold(v, 4, .99);
  const py = P(v).y;
  const slots = [...v.container.querySelectorAll<SVGRectElement>('.cd-stack-slot, .cd-stack-fill')].map(r => ({top: Number(r.getAttribute('y')), bottom: Number(r.getAttribute('y')) + Number(r.getAttribute('height'))}));
  expect(slots.length).toBeGreaterThan(0);
  for (const s of slots) {
   if (charge > 0) expect(s.bottom).toBeLessThanOrEqual(py + .5);
   else expect(s.top).toBeGreaterThanOrEqual(py - .5);
  }
 }, 30000);
});
describe('the sheet\'s walking ring never runs through P', () => {
 for (const [distance, view] of [[3, '3D'], [6, '2D']] as const) it(`z = ${distance}, in ${view}, through Add them up`, async () => {
  const v = await openLesson('sheet', {distance});
  if (view === '2D') await turn(v, '2D');
  for (const f of [.3, .6, .9]) {
   await hold(v, 4, f);
   const py = P(v).y;
   // The chosen ring's outline, wherever it is drawn, stays well below P.
   for (const path of v.container.querySelectorAll<SVGPathElement>('.cd-orbit-plane .cd-piece.is-selected path')) {
    const box = path.getBoundingClientRect(), svg = v.container.querySelector('.cd-svg')!.getBoundingClientRect(), k = 430 / svg.height;
    expect((box.top - svg.top) * k, `at ${f}`).toBeGreaterThanOrEqual(py + 10);
   }
   // And the line from P to it runs down, to below P.
   const line = v.container.querySelector<SVGLineElement>('.cd-construction:not(.cd-pair)');
   if (line) expect(Number(line.getAttribute('y1')), `at ${f}`).toBeGreaterThan(py);
  }
 }, 40000);
});
