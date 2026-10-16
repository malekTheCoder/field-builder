import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {boxSegmentDistance, type Segment} from '../src/diagrams/labels';
/* THE FIGURE, WAVE SIX: what the critics found wrong on the 2D figure, held to its fix. Styled and with the page's
 * own fonts, because the first of these only happens in them: the serif's box stands higher over its baseline than
 * the fallback's, and that is what put the y axis' letter into the stage's title band. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => {
 quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet);
 await document.fonts.load('italic 600 20px "Source Serif 4 Variable"');
 await document.fonts.load('600 20px "Source Serif 4 Variable"');
});
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
/** Drag the transport to `f` of the way through stage `n` and let go: the run holds there. */
async function hold(view: View, n: number, f = .97) {
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
const svgOf = (v: {container: HTMLElement}) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const shown = (t: Element | null | undefined) => !!t && !(t as SVGElement).dataset.placerHidden && (t as SVGElement).style.opacity !== '0';
/** A name's box where the placer left it, in the drawing's units. */
const placed = (t: SVGTextElement) => { const b = t.getBBox(), m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(t.getAttribute('transform') ?? ''); return {x: b.x + Number(m?.[1] ?? 0), y: b.y + Number(m?.[2] ?? 0), width: b.width, height: b.height}; };
const centre = (b: {x: number; y: number; width: number; height: number}) => ({x: b.x + b.width / 2, y: b.y + b.height / 2});
const fresh = () => { cleanup(); window.history.replaceState(null, '', '/'); };
const pointOf = (v: View) => { const c = svgOf(v).querySelector<SVGCircleElement>('.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
/** Where the vertical axis runs: the flat axes' path is "M64 y H656 M x 365 V60". */
const axisX = (v: View) => Number(/M[-\d.]+ [-\d.]+H[-\d.]+ M([-\d.]+)/.exec(svgOf(v).querySelector('.cd-axes path')!.getAttribute('d')!)![1]);

describe('the axis letter in a 1280 window', () => {
 it('names the y axis through every stage of the run, not only at rest', async () => {
  await page.viewport(1280, 720);
  for (const id of ['bisector', 'endpoint', 'arc'] as const) {
   const v = await openLesson(id);
   for (const n of [1, 2, 3, 4, 5]) {
    await hold(v, n);
    const y = svgOf(v).querySelector<SVGTextElement>('.cd-axes text[data-axis="y"]');
    expect(shown(y), `${id}, ${NAMES[n - 1]}: the y axis is named`).toBe(true);
   }
   fresh();
  }
 }, 120000);
});

describe('the rod\'s triangle', () => {
 it('in a 1280 window the y leg\'s letter stays above the r leg, and r_i by its own line', async () => {
  await page.viewport(1280, 720);
  const v = await openLesson('bisector');
  await hold(v, 3);
  const P = pointOf(v);
  const y = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text')].find(t => t.textContent === 'y')!;
  if (shown(y)) expect(centre(placed(y)).y, 'y on its own leg\'s side of P\'s level').toBeLessThan(P.y);
  const ri = svgOf(v).querySelector<SVGTextElement>('.cd-triangle .cd-ri')!;
  const legD = svgOf(v).querySelector('.cd-triangle path[data-leg]')!.getAttribute('d')!;
  const [met, foot] = [...legD.matchAll(/[ML]\s*([-\d.]+)[ ,]([-\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));
  const piece = svgOf(v).querySelector<SVGTextElement>('.cd-triangle .cd-ri')!.dataset.shaft!.split(' ').map(Number);
  const hyp: Segment = {a: {x: piece[0], y: piece[1]}, b: {x: piece[2], y: piece[3]}}, leg: Segment = {a: met, b: foot};
  expect(shown(ri), 'r_i is named').toBe(true);
  const box = placed(ri);
  expect(boxSegmentDistance(box, hyp) + 2, 'r_i nearer its own line than the y leg').toBeLessThan(boxSegmentDistance(box, leg));
 }, 60000);
 it('a short positive rod keeps its y letter above the axis, on its own leg\'s side', async () => {
  await page.viewport(1440, 900);
  for (const id of ['endpoint', 'ramp'] as const) {
   const v = await openLesson(id, {size: 1});
   await hold(v, 3);
   const P = pointOf(v), y = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text')].find(t => t.textContent === 'y');
   if (y && shown(y)) expect(centre(placed(y)).y, `${id}: y above P's level`).toBeLessThan(P.y);
   fresh();
  }
 }, 60000);
});

describe('the run\'s scale on the semi-infinite line', () => {
 it('stands P well off the line at small r, as the endless line does', async () => {
  await page.viewport(1440, 900);
  for (const r of [.5, 1]) {
   const v = await openLesson('semi', {distance: r});
   await hold(v, 2);
   expect(pointOf(v).x - axisX(v), `r = ${r}`).toBeGreaterThanOrEqual(69);
   fresh();
  }
 }, 60000);
});

describe('the rod\'s end names', () => {
 it('stand near their ends in the first three stages, not out beside r_i', async () => {
  await page.viewport(1440, 900);
  for (const [id, params] of [['bisector', {}], ['bisector', {distance: 6, size: 1, slices: 30}], ['endpoint', {size: 1}]] as const) {
   const v = await openLesson(id, params);
   const O = axisX(v);
   for (const n of [1, 2, 3]) {
    await hold(v, n);
    for (const t of svgOf(v).querySelectorAll<SVGTextElement>('text.cd-end')) {
     if (!shown(t) || t.dataset.placerLeader) continue;
     expect(centre(placed(t)).x - O, `${id} ${JSON.stringify(params)}, ${NAMES[n - 1]}: ${t.textContent}`).toBeLessThanOrEqual(85);
    }
   }
   fresh();
  }
 }, 120000);
});

describe('the arc\'s radius', () => {
 it('is drawn off the y axis when the arc\'s end lies on it, so R names a stroke of its own', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('arc');
  const bar = svgOf(v).querySelector('[data-arc-radius] path')!.getAttribute('d')!;
  const [, x0] = /M([-\d.]+) ([-\d.]+)/.exec(bar)!.map(Number);
  expect(Math.abs(x0 - axisX(v)), 'the bar stands off the axis').toBeGreaterThanOrEqual(8);
 }, 60000);
 it('on a phone the half circle stops short of the y axis\' letter', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('arc');
  await hold(v, 5);
  const y = svgOf(v).querySelector<SVGTextElement>('.cd-axes text[data-axis="y"]')!.getBBox();
  const handle = [...svgOf(v).querySelectorAll<SVGGElement>('[data-bound]')].map(g => g.querySelector('rect')!.getBBox()).sort((a, b) => a.y - b.y)[0];
  expect(y.y + y.height, 'the letter ends above the top handle').toBeLessThanOrEqual(handle.y + 1);
 }, 60000);
});

describe('the ring\'s Cut it up', () => {
 it('does not set R across a ray of the lit piece\'s angle', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('ring');
  await hold(v, 1);
  const R = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-dimension text')].find(t => t.textContent === 'R');
  if (!R || !shown(R)) return;
  const box = placed(R), inner = {x: box.x + 1, y: box.y + 1, width: box.width - 2, height: box.height - 2};
  for (const ray of svgOf(v).querySelectorAll<SVGLineElement>('.cd-piece-ray')) {
   const n = ['x1', 'y1', 'x2', 'y2'].map(k => Number(ray.getAttribute(k)));
   expect(boxSegmentDistance(inner, {a: {x: n[0], y: n[1]}, b: {x: n[2], y: n[3]}}), 'R struck through by a ray').toBeGreaterThan(0);
  }
 }, 60000);
});

describe('on a phone', () => {
 it('the two survivors stand apart by more than their heads\' width', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('bisector');
  await hold(v, 3);
  const P = pointOf(v);
  const ys = [...new Set([...svgOf(v).querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')].map(g => g.dataset.shaft!.split(' ').map(Number))
   .filter(([x1, y1, x2, y2]) => Math.abs(y1 - y2) < .5 && Math.abs(x1 - P.x) < 2 && Math.abs(y1 - P.y) < 30 && x2 - x1 > 20).map(s => Math.round(s[1] * 10) / 10))].sort((a, b) => a - b);
  expect(ys.length).toBeGreaterThanOrEqual(2);
  expect(ys[1] - ys[0], 'eleven units grown with the labels').toBeGreaterThanOrEqual(14);
 }, 60000);
 it('the ring\'s side view does not set ΔE_z across another arrow', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('ring');
  await flat(v);
  await hold(v, 3);
  const name = svgOf(v).querySelector<SVGTextElement>('.cd-vector-label[data-symbol="ΔE_z"]');
  expect(name, 'ΔE_z is drawn').toBeTruthy();
  const own = name!.closest<SVGGElement>('.cd-vector')!.dataset.shaft;
  const box = placed(name!), inner = {x: box.x + 2, y: box.y + 2, width: box.width - 4, height: box.height - 4};
  for (const g of svgOf(v).querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')) {
   if (g.dataset.shaft === own || g.closest('[opacity="0"]')) continue;
   const [x1, y1, x2, y2] = g.dataset.shaft!.split(' ').map(Number);
   expect(boxSegmentDistance(inner, {a: {x: x1, y: y1}, b: {x: x2, y: y2}}), `ΔE_z across ${g.textContent || 'an arrow'}`).toBeGreaterThan(0);
  }
 }, 60000);
 it('the flat disk in Shrink them leaves R to the rim\'s handle, "s = R"', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('disk');
  await flat(v);
  await hold(v, 5);
  const R = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-dimension text')].find(t => t.textContent === 'R');
  expect(R ?? null).toBeNull();
 }, 60000);
 it('the view cube\'s turn buttons are at least 24 pixels across', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('ring');
  const steps = [...svgOf(v).querySelectorAll<SVGGElement>('.cd-cube-step')];
  expect(steps.length).toBe(4);
  for (const s of steps) {
   const r = s.querySelector('.cd-cube-hit')!.getBoundingClientRect();
   expect(Math.min(r.width, r.height), s.getAttribute('aria-label') ?? '').toBeGreaterThanOrEqual(24);
  }
 }, 60000);
});

describe('type', () => {
 it('the arrows\' names in the light theme are at least 4.5:1 against the ground', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('bisector');
  await hold(v, 3);
  const probe = document.createElement('canvas').getContext('2d')!;
  const lum = (css: string) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = css; probe.fillRect(0, 0, 1, 1); const [r, g, b] = probe.getImageData(0, 0, 1, 1).data; const f = (c: number) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  for (const t of svgOf(v).querySelectorAll<SVGTextElement>('.cd-vector-label')) {
   if (!shown(t)) continue;
   expect((1.05) / (lum(getComputedStyle(t).fill) + .05), `${t.textContent}: ${getComputedStyle(t).fill}`).toBeGreaterThanOrEqual(4.5);
  }
 }, 60000);
 it('the triangle\'s note is set with the labels, never under eleven pixels in a 1280 window', async () => {
  await page.viewport(1280, 720);
  const v = await openLesson('ring');
  await hold(v, 2);
  const note = svgOf(v).querySelector<SVGTextElement>('.cd-triangle-note');
  if (!note) return;
  const svg = svgOf(v), px = svg.getBoundingClientRect().width / 720;
  expect(parseFloat(getComputedStyle(note).fontSize) * px).toBeGreaterThanOrEqual(11);
 }, 60000);
});
