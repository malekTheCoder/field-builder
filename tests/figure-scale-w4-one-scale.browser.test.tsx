import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* ONE MAGNIFICATION PER FIGURE, NOT ONE PER PIECE. Each piece's arrow was magnified by its own field -- to 55 units at
 * rest, 108 in the run -- so whichever piece was picked came out the same length: on a long rod with P close, the piece
 * level with P (forty times the end piece's field) drawn as long as the end piece, under a stage that says "farther,
 * smaller". Now one map of the field's size sizes every piece of the figure as it stands, so a nearer piece of a
 * uniform rod is drawn longer than a farther one -- at rest and in One piece. And wherever the parts are drawn at rest
 * (a teacher's link to the parts) they are drawn at the run's readable size, not the resting view's 55 units; and in
 * What cancels the shorter part is long enough to carry its name where there is room. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1280, 720); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}, search = '') {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await settle(view);
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
const lengthOf = (g: Element | null | undefined) => { if (!g) return 0; const [x1, y1, x2, y2] = (g as HTMLElement).dataset.shaft!.split(' ').map(Number); return Math.hypot(x2 - x1, y2 - y1); };
/** The piece's own arrow: the last of the arrows grown out of P, outside the pair's and the parts' groups. */
const pieceArrow = (v: View) => svgOf(v).querySelector('g.cd-grow:not(.cd-grow-pair):not(.cd-grow-parts) > .cd-vector[data-shaft]');
const P = (v: View) => { const c = svgOf(v).querySelector('.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
/** Pick every piece in turn, and read the piece's arrow and how far from P the picked piece's charge is drawn. A rod's
 * pieces hold equal charge, so on these lessons the nearer piece is the stronger. */
async function picks(v: View) {
 const out: {far: number; length: number}[] = [];
 const n = svgOf(v).querySelectorAll('[data-piece-key]').length;
 for (let i = 0; i < n; i++) {
  fireEvent.pointerDown([...svgOf(v).querySelectorAll('[data-piece-key]')][i], {button: 0});
  await new Promise(r => setTimeout(r, 150));
  await settle(v);
  const lit = svgOf(v).querySelector('.cd-piece.is-selected')!.getBoundingClientRect(), box = svgOf(v).getBoundingClientRect(), k = 720 / box.width, p = P(v);
  out.push({far: Math.hypot((lit.x + lit.width / 2 - box.x) * k - p.x, (lit.y + lit.height / 2 - box.y) * k - p.y), length: lengthOf(pieceArrow(v))});
 }
 return out;
}
/** Nearer pieces drawn longer: for every two picks a clear distance apart, the nearer one's arrow at least a fifth longer. */
function nearerLonger(rows: {far: number; length: number}[], what: string) {
 expect(rows.length, `${what}: pieces picked`).toBeGreaterThanOrEqual(5);
 for (const a of rows) for (const b of rows) if (a.far < b.far * .8) expect(a.length, `${what}: a nearer piece (${a.far.toFixed(0)} units off) against a farther (${b.far.toFixed(0)})`).toBeGreaterThan(b.length * 1.05);
}

describe('a nearer piece is drawn longer', () => {
 it('at rest, a link to one piece\'s arrow on a long rod with P close', async () => {
  nearerLonger(await picks(await openLesson('bisector', {distance: .5, size: 8}, '?p=bisector&mode=project&r=0.5&L=8')), 'bisector at rest');
 }, 60000);
 it('at rest, the rod with a foot', async () => {
  nearerLonger(await picks(await openLesson('endpoint', {distance: .5, size: 8}, '?p=endpoint&mode=project&r=0.5&L=8')), 'endpoint at rest');
 }, 60000);
 it('in One piece', async () => {
  const v = await openLesson('bisector', {distance: .5, size: 8});
  await hold(v, 2, .98);
  nearerLonger(await picks(v), 'bisector, One piece');
 }, 60000);
 it('in One piece on the rod with a foot', async () => {
  const v = await openLesson('endpoint', {distance: .5, size: 8});
  await hold(v, 2, .98);
  nearerLonger(await picks(v), 'endpoint, One piece');
 }, 60000);
});

describe('the parts are drawn to be read', () => {
 it('a teacher\'s link to the parts and the pair draws them at the run\'s size', async () => {
  const v = await openLesson('bisector', {}, '?p=bisector&mode=project&components=1&pair=1');
  await new Promise(r => setTimeout(r, 2600));
  await settle(v);
  expect(lengthOf(pieceArrow(v)), 'the piece\'s arrow').toBeGreaterThan(90);
  const across = svgOf(v).querySelector('[data-cancel-ghost] .cd-vector[data-shaft]') ?? svgOf(v).querySelector('[data-cancel-transverse="piece"] .cd-vector[data-shaft]');
  expect(lengthOf(across), 'the part that cancels (fourteen units at the resting size)').toBeGreaterThan(30);
  expect(lengthOf(svgOf(v).querySelector('.cd-grow-parts .cd-vector[data-shaft]')), 'the part that survives').toBeGreaterThan(80);
 }, 60000);
 // A small ring: its pieces' parts across the axis came out nine units long in What cancels, and went unnamed. Sized
 // for sixteen, they are as long as the room up the ring's axis lets them be.
 it('What cancels on a small ring: the parts that cancel are drawn longer, as the room allows', async () => {
  const v = await openLesson('ring', {size: 1});
  await hold(v, 3, .98);
  const ghosts = [...svgOf(v).querySelectorAll('[data-cancel-ghost] .cd-vector[data-shaft]')];
  expect(ghosts.length).toBe(2);
  for (const g of ghosts) expect(lengthOf(g), 'a part that cancels').toBeGreaterThan(12);
 }, 60000);
});
