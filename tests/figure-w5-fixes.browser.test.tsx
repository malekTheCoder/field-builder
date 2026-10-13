import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';
/* THE FIGURE, WAVE FIVE: what the critics found wrong or misleading on the 2D figure, held to its fix. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); });
afterAll(async () => { quiet.remove(); document.documentElement.classList.remove('dark'); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}, dark = false) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
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
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
async function flat(view: View) {
 fireEvent.click(view.getByRole('button', {name: '2D'}));
 await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeNull(), {timeout: 5000});
}
/** Where in Add them up's bar the pairs are `s` of the way in (see tests/figure-pairs.browser.test.tsx). */
const at = (s: number) => .8 * (.2675 + .7325 * s);
const svgOf = (v: {container: HTMLElement}) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const shown = (t: Element | null | undefined) => !!t && !(t as SVGElement).dataset.placerHidden && (t as SVGElement).style.opacity !== '0';
/** A name's box where the placer left it, in the drawing's units. */
const placed = (t: SVGTextElement) => { const b = t.getBBox(), m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(t.getAttribute('transform') ?? ''); return {x: b.x + Number(m?.[1] ?? 0), y: b.y + Number(m?.[2] ?? 0), width: b.width, height: b.height}; };
const centre = (b: {x: number; y: number; width: number; height: number}) => ({x: b.x + b.width / 2, y: b.y + b.height / 2});
/** A second lesson in one test: the first one's address would open in its place. */
const fresh = () => { cleanup(); window.history.replaceState(null, '', '/'); };
const footer = (v: View) => [...svgOf(v).querySelectorAll('.cd-footer')].map(e => e.textContent).join(' ');
function mount(id: ProblemId, over: Partial<Params> = {}, props: Record<string, unknown> = {}) {
 const onBoundRangeChange = vi.fn();
 const view = render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, ...over}} setParams={vi.fn()}
  count={8} continuum={0} selected={3} onSelect={vi.fn()} progress={1} components={false} pair={false}
  mode="integrate" boundRange={[0, 100]} onBoundRangeChange={onBoundRangeChange} {...props} />);
 return {view, onBoundRangeChange};
}

describe('the integration handles', () => {
 it('cannot be crossed from the sliders: the sum would turn round and point into a positive rod', async () => {
  await page.viewport(1280, 800);
  const {view, onBoundRangeChange} = mount('bisector', {}, {boundRange: [0, 50]});
  const [lower] = view.container.querySelectorAll<HTMLInputElement>('input[aria-label$="integration bound"]');
  fireEvent.change(lower, {target: {value: '80'}});
  expect(onBoundRangeChange).toHaveBeenLastCalledWith([49, 50]);
  cleanup();
  const again = mount('bisector', {}, {boundRange: [30, 100]});
  const upper = again.view.container.querySelectorAll<HTMLInputElement>('input[aria-label$="integration bound"]')[1];
  fireEvent.change(upper, {target: {value: '20'}});
  expect(again.onBoundRangeChange).toHaveBeenLastCalledWith([30, 31]);
 });
 it('a ring cut open names its whole end as a value of θ, not a bare 0 beside R', async () => {
  const {view} = mount('ring', {}, {boundRange: [0, 50]});
  const lower = view.container.querySelector('[data-bound="lower"] text');
  expect(lower?.textContent?.replace(/\s+/g, ' ')).toBe('θ = 0');
 });
});

describe('the run, stage by stage', () => {
 it('arc closed into a ring, cut in three: no second angle called θ that is π − θ', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('arc', {phi: 2 * Math.PI, slices: 3});
  await hold(v, 3, .97);
  // The run's piece is a third of a turn round: its ΔE_x points to +x, and the angle between ΔE and ΔE_x is π − θ.
  expect(svgOf(v).querySelector('[data-angle-twin]'), 'the opposite angle, past a quarter turn').toBeNull();
  fresh();
  const half = await openLesson('arc');
  await hold(half, 3, .97);
  expect(svgOf(half).querySelector('[data-angle-twin]'), 'within a quarter turn the twin is still drawn').toBeTruthy();
 }, 60000);
 it('the paired lessons name the growing sum through Add them up, not only at its end', async () => {
  await page.viewport(1440, 900);
  for (const id of ['bisector', 'arc'] as const) {
   const v = await openLesson(id);
   await hold(v, 4, at(.6));
   const name = svgOf(v).querySelector('.cd-sum-arrow .cd-vector-label');
   expect(name, `${id}: the sum's name`).toBeTruthy();
   expect(shown(name), `${id}: the sum's name is not hidden`).toBe(true);
   fresh();
  }
 }, 60000);
 it('the corner stops saying a pair is drawn larger once the last pair is in at its true size', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('ring', {slices: 20});
  await flat(v);
  await hold(v, 4, at(.15));
  expect(footer(v), 'while a pair arrives').toContain('This pair drawn larger');
  await hold(v, 4, .99);
  expect(footer(v)).not.toContain('This pair drawn larger');
 }, 60000);
 it('on a phone the two survivors stand far enough apart to read as two arrows', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('bisector');
  await hold(v, 3, .97);
  const c = v.container.querySelector<SVGCircleElement>('.cd-point')!, P = {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))};
  // The parts along the axis that leave from beside P: the piece's ΔE_x, and the mirror's set beside it.
  const along = [...svgOf(v).querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')].map(g => g.dataset.shaft!.split(' ').map(Number))
   .filter(([x1, y1, x2, y2]) => Math.abs(y1 - y2) < .5 && Math.abs(x1 - P.x) < 2 && Math.abs(y1 - P.y) < 20 && x2 - x1 > 20);
  const ys = [...new Set(along.map(s => Math.round(s[1] * 10) / 10))].sort((a, b) => a - b);
  expect(ys.length, 'both survivors drawn').toBeGreaterThanOrEqual(2);
  for (let k = 1; k < ys.length; k++) expect(ys[k] - ys[k - 1]).toBeGreaterThanOrEqual(10);
 }, 60000);
 it('a short rod\'s end names stay near its ends', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('bisector', {size: 1});
  for (const n of [1, 2, 3]) {
   await hold(v, n, .97);
   const rod = svgOf(v).querySelector<SVGGraphicsElement>('.cd-source-rod')!.getBBox();
   const ends: [string, number][] = [['+L/2', rod.y + 7], ['−L/2', rod.y + rod.height - 7]];
   for (const [name, y] of ends) {
    const t = [...svgOf(v).querySelectorAll<SVGTextElement>('text.cd-end')].find(e => e.textContent?.trim() === name);
    if (!shown(t) || t!.dataset.placerLeader) continue;
    expect(Math.abs(centre(placed(t!)).y - y), `stage ${n}: ${name}`).toBeLessThanOrEqual(30);
   }
  }
 }, 60000);
 it('the flat disk\'s limits each stand nearer their own handle, on a phone and a laptop', async () => {
  for (const [w, h] of [[390, 844], [1280, 800]] as const) {
   await page.viewport(w, h);
   const v = await openLesson('disk');
   await flat(v);
   await hold(v, 5, .97);
   const handles = [...svgOf(v).querySelectorAll<SVGGElement>('[data-bound]')].map(g => ({key: g.dataset.bound!, at: centre(g.querySelector('rect')!.getBBox()), name: g.querySelector('text')}));
   expect(handles.length, `${w}: two handles`).toBe(2);
   for (const own of handles) {
    if (!own.name || !shown(own.name)) continue;
    const other = handles.find(x => x !== own)!, c = centre(placed(own.name));
    expect(Math.hypot(c.x - own.at.x, c.y - own.at.y), `${w}: ${own.name.textContent} nearer its own handle`).toBeLessThan(Math.hypot(c.x - other.at.x, c.y - other.at.y));
   }
   fresh();
  }
 }, 60000);
 it('the endless line\'s limit on a phone stays inside the plot, under the stage\'s title', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('infinite');
  await hold(v, 4, .97);
  for (const t of svgOf(v).querySelectorAll<SVGTextElement>('.cd-bound-name text, .cd-bound text')) {
   if (!shown(t)) continue;
   expect(placed(t).y, t.textContent ?? '').toBeGreaterThanOrEqual(48);
  }
 }, 60000);
 it('a footed rod\'s y letter goes left of the axis when the rod reaches the top, clear of its end name', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('endpoint');
  await hold(v, 5, .97);
  const y = svgOf(v).querySelector<SVGTextElement>('text[data-axis="y"]')!;
  expect(y.getAttribute('text-anchor')).toBe('end');
  const axis = svgOf(v).querySelector('.cd-axes path')!.getAttribute('d')!, x = Number(/M[-\d.]+ [-\d.]+H[-\d.]+ M([-\d.]+)/.exec(axis)![1]);
  expect(y.getBBox().x + y.getBBox().width).toBeLessThan(x);
 }, 60000);
});

describe('dark', () => {
 it('the pieces not being talked about fade toward a muted orange, not black', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('bisector', {}, true);
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
  await hold(v, 3, .97);
  const piece = svgOf(v).querySelector<SVGGElement>('.cd-piece:not(.is-selected):not(.is-partner)')!;
  const style = getComputedStyle(piece);
  expect(Number(style.opacity)).toBe(1);
  // Whatever colour space the browser reports the mix in, it is not near black: its lightness is well up.
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.fillStyle = style.fill; probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  expect(.2126 * r + .7152 * g + .0722 * b, style.fill).toBeGreaterThan(70);
  expect(r, 'orange, not grey').toBeGreaterThan(b + 30);
  document.documentElement.classList.remove('dark');
 }, 60000);
});

describe('the view cube and the reset', () => {
 it('names its faces in one style: all spelled out, or all by their initials', async () => {
  for (const [w, h] of [[390, 844], [1440, 900]] as const) {
   await page.viewport(w, h);
   const v = await openLesson('ring');
   const words = [...svgOf(v).querySelectorAll('.cd-cube-label')].map(t => t.textContent ?? '');
   expect(words.length).toBeGreaterThan(0);
   expect(new Set(words.map(x => x.length === 1)).size, `${w}: ${words.join(' ')}`).toBe(1);
   fresh();
  }
 }, 60000);
 it('Reset view is not lit on arriving in 3D, nor in 2D with nothing zoomed', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('bisector');
  const reset = () => v.getByRole('button', {name: 'Reset view'}) as HTMLButtonElement;
  fireEvent.click(v.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(v.container.querySelector('.cd-in-space')).toBeTruthy(), {timeout: 5000});
  await waitFor(() => expect(v.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 5000});
  await new Promise(r => setTimeout(r, 300));
  expect(reset().disabled, 'arrived at the opening view').toBe(true);
  fresh();
  const ring = await openLesson('ring');
  await flat(ring);
  await new Promise(r => setTimeout(r, 300));
  expect((ring.getByRole('button', {name: 'Reset view'}) as HTMLButtonElement).disabled, 'flat, unzoomed').toBe(true);
 }, 60000);
});
