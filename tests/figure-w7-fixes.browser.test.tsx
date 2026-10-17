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
/* THE FIGURE, WAVE SEVEN: what the critics found wrong on the 2D figure, held to its fix. Styled and with the page's
 * own fonts, as wave six's are, since where a name lands depends on the serif's own box. */
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
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
/** Drag the transport to `f` of the way through stage `n` and let go: the run holds there. */
async function hold(view: View, n: number, f = .97) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: `)}));
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
 const b = view.queryByRole('button', {name: '2D'});
 if (b) fireEvent.click(b);
 await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeNull(), {timeout: 5000});
}
const svgOf = (v: {container: HTMLElement}) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const shown = (t: Element | null | undefined) => !!t && !(t as SVGElement).dataset.placerHidden && (t as SVGElement).style.opacity !== '0';
const placed = (t: SVGTextElement) => { const b = t.getBBox(), m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(t.getAttribute('transform') ?? ''); return {x: b.x + Number(m?.[1] ?? 0), y: b.y + Number(m?.[2] ?? 0), width: b.width, height: b.height}; };
const centre = (b: {x: number; y: number; width: number; height: number}) => ({x: b.x + b.width / 2, y: b.y + b.height / 2});
const fresh = () => { cleanup(); window.history.replaceState(null, '', '/'); };
const pointOf = (v: View) => { const c = svgOf(v).querySelector<SVGCircleElement>('.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
const shaftOf = (g: Element | null | undefined): Segment | null => { const n = (g as HTMLElement | null)?.dataset.shaft?.split(' ').map(Number); return n && n.length === 4 ? {a: {x: n[0], y: n[1]}, b: {x: n[2], y: n[3]}} : null; };
const lengthOf = (s: Segment | null) => s ? Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) : 0;
const footerNote = (v: View) => svgOf(v).querySelector('.cd-footer[data-dim="pieces"]')?.textContent ?? '';

describe('a round surface cut into rings, seen from the side', () => {
 it('keeps its body: each cut is a ring outline in the charge\'s colour, and the lit ring is painted over them', async () => {
  await page.viewport(1440, 900);
  for (const id of ['annulus', 'disk', 'sheet'] as const) {
   const v = await openLesson(id);
   await flat(v);
   await hold(v, 1);
   const seams = svgOf(v).querySelector<SVGGElement>('.cd-surface-seams');
   expect(seams, `${id}: the cuts are drawn`).toBeTruthy();
   expect(seams!.classList.contains('is-flat'), `${id}: seen flat`).toBe(true);
   const path = seams!.querySelector('path')!;
   // Not the paper's colour, which painted the whole edge-on face out.
   expect(getComputedStyle(path).stroke, `${id}: a cut is drawn in the charge's colour`).toBe('rgb(184, 70, 15)');
   expect(Number.parseFloat(getComputedStyle(path).strokeWidth), `${id}: and thin`).toBeLessThan(2);
   if (id !== 'sheet') {
    const ring = svgOf(v).querySelector('.cd-piece.is-selected')!;
    expect(seams!.compareDocumentPosition(ring) & Node.DOCUMENT_POSITION_FOLLOWING, `${id}: the lit ring after the cuts`).toBeTruthy();
   }
   fresh();
  }
 }, 90000);
 it('the shell draws no flat cuts round O: its cuts are its own rings', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('shell');
  await flat(v);
  await hold(v, 1);
  expect(svgOf(v).querySelector('.cd-orbit-plane .cd-surface-seams')).toBeNull();
  expect(svgOf(v).querySelector('.cd-shell .cd-surface-seams')).toBeTruthy();
 }, 60000);
});

describe('a negative arc\'s piece', () => {
 it('has its ΔE drawn clear of r_i = R, which starts past the arrow\'s point', async () => {
  await page.viewport(1440, 900);
  for (const id of ['uneven-arc', 'arc'] as const) {
   const v = await openLesson(id, {charge: -3});
   for (const n of [2, 3]) {
    await hold(v, n);
    const P = pointOf(v), line = svgOf(v).querySelector<SVGLineElement>('[data-arc-ri-line]')!;
    const start = {x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1'))};
    const arrow = shaftOf([...svgOf(v).querySelectorAll('.cd-grow > .cd-vector')].at(-1));
    expect(lengthOf(arrow), `${id} stage ${n}: ΔE is drawn`).toBeGreaterThan(20);
    // The line begins beyond the arrow's point, so the purple stroke never covers the teal shaft.
    expect(Math.hypot(start.x - P.x, start.y - P.y), `${id} stage ${n}`).toBeGreaterThan(lengthOf(arrow));
   }
   fresh();
  }
 }, 90000);
 it('a positive arc keeps its r_i from P', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('arc');
  await hold(v, 2);
  const P = pointOf(v), line = svgOf(v).querySelector<SVGLineElement>('[data-arc-ri-line]')!;
  expect(Math.hypot(Number(line.getAttribute('x1')) - P.x, Number(line.getAttribute('y1')) - P.y)).toBeLessThan(1);
 }, 60000);
});

describe('the shell', () => {
 it('inside, at rest: the rings\' residue is drawn at its true share of the field outside, beside E = 0', async () => {
  await page.viewport(1440, 900);
  for (const slices of [5, 30]) {
   const v = await openLesson('shell', {distance: 1, slices});
   await flat(v);
   await new Promise(r => setTimeout(r, 400));
   const sum = shaftOf(svgOf(v).querySelector('.cd-sum-arrow .cd-vector'));
   expect(lengthOf(sum), `N ${slices}: the residue's arrow`).toBeLessThan(6);
   const zero = svgOf(v).querySelector<SVGTextElement>('.cd-zero');
   expect(shown(zero), 'E = 0 is said').toBe(true);
   // ...beside P, or on a leader back to it.
   const P = pointOf(v), c = centre(placed(zero!));
   if (!zero!.dataset.placerLeader) expect(Math.hypot(c.x - P.x, c.y - P.y), `N ${slices}: E = 0 by P`).toBeLessThan(45);
   fresh();
  }
 }, 60000);
 it('marks θ at O for a P inside it, clear of P', async () => {
  await page.viewport(1440, 900);
  for (const z of [1, .5]) {
   const v = await openLesson('shell', {distance: z});
   await flat(v);
   for (const n of [1, 2]) {
    await hold(v, n);
    const mark = svgOf(v).querySelector('[data-shell-angle] text');
    expect(mark, `z ${z}, stage ${n}: θ is marked`).toBeTruthy();
    const P = pointOf(v), c = centre((mark as SVGTextElement).getBBox());
    expect(Math.hypot(c.x - P.x, c.y - P.y), `z ${z}, stage ${n}`).toBeGreaterThanOrEqual(14);
   }
   fresh();
  }
 }, 90000);
 it('with P on its skin, never names the rings\' sum E, and says the field jumps there', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('shell', {distance: 2, size: 4});
  await flat(v);
  await hold(v, 5);
  const names = [...svgOf(v).querySelectorAll('.cd-vector text')].map(t => t.textContent?.trim());
  expect(names).not.toContain('E');
  expect(names.some(t => t?.startsWith('E ')), 'nor "E ≈ Σ ΔE"').toBe(false);
  expect(footerNote(v)).toContain('On the shell');
  // The limit θ = 0 is P's own spot: no square is drawn over P's dot.
  const P = pointOf(v);
  for (const r of svgOf(v).querySelectorAll<SVGRectElement>('.cd-bound rect'))
   expect(Math.hypot(Number(r.getAttribute('x')) + 7 - P.x, Number(r.getAttribute('y')) + 7 - P.y), 'a handle on P').toBeGreaterThan(8);
 }, 60000);
 it('sets R beside its radius, not on it', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('shell');
  await flat(v);
  let seen = 0;
  for (const n of [0, 1, 2]) {
   if (n) await hold(v, n); else await new Promise(r => setTimeout(r, 400));
   const R = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-dimension text[data-shaft]')].find(t => t.textContent === 'R');
   if (!shown(R)) continue;
   seen++;
   expect(boxSegmentDistance(placed(R!), shaftOf(R)!), `stage ${n}: R clear of its radius`).toBeGreaterThan(1);
  }
  expect(seen, 'R is named').toBeGreaterThan(0);
 }, 60000);
 it('on a phone, sets the inset\'s z − R cos θ on two lines, clear of P\'s name', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('shell');
  await flat(v);
  await hold(v, 2);
  const leg = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text')].find(t => t.textContent?.replace(/\s/g, '').startsWith('z−R'))!;
  expect(leg.querySelectorAll(':scope > tspan[x]').length).toBe(2);
  const p = svgOf(v).querySelector<SVGTextElement>('.cd-point-label')!, a = placed(leg), b = placed(p);
  const gap = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), a.y - (b.y + b.height), b.y - (a.y + a.height));
  expect(gap, 'P and the leg\'s name apart').toBeGreaterThan(4);
 }, 60000);
});

describe('the rod off its bisector', () => {
 it('letters a narrow α near P, not by the foot of the y leg', async () => {
  await page.viewport(1440, 900);
  for (const params of [{height: -1, slices: 5}, {height: 1, charge: -3}] as Record<string, number>[]) {
   const v = await openLesson('offset', params);
   await hold(v, 2);
   const P = pointOf(v), alpha = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text.cd-angle')].find(t => t.textContent === 'α');
   if (!alpha) { fresh(); continue; }
   const O = Number(/M[-\d.]+ [-\d.]+H[-\d.]+ M([-\d.]+)/.exec(svgOf(v).querySelector('.cd-axes path')!.getAttribute('d')!)![1]);
   const r = Math.abs(P.x - O), c = centre(alpha.getBBox());
   expect(Math.hypot(c.x - P.x, c.y - P.y) / r, JSON.stringify(params)).toBeLessThanOrEqual(.62);
   fresh();
  }
 }, 60000);
 it('with P level with an end, the run stands P\'s level clear of the plot\'s edge and the piece\'s arrow full size', async () => {
  await page.viewport(1440, 900);
  for (const height of [2, -2]) {
   const v = await openLesson('offset', {height});
   await hold(v, 2);
   const P = pointOf(v);
   expect(P.y, `h ${height}`).toBeGreaterThan(160);
   expect(P.y, `h ${height}`).toBeLessThan(272);
   expect(lengthOf(shaftOf([...svgOf(v).querySelectorAll('.cd-grow > .cd-vector')].at(-1))), `h ${height}: ΔE`).toBeGreaterThanOrEqual(90);
   fresh();
  }
 }, 60000);
});

describe('the endless line on a phone', () => {
 it('sets dα on P\'s side of the rod in Shrink them, never on the rod', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('infinite');
  await hold(v, 5);
  const t = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-piece-angle text')].find(e => /dα/.test(e.textContent ?? ''));
  expect(t).toBeTruthy();
  const O = Number(/M[-\d.]+ [-\d.]+H[-\d.]+ M([-\d.]+)/.exec(svgOf(v).querySelector('.cd-axes path')!.getAttribute('d')!)![1]);
  expect(t!.getBBox().x, 'dα clear of the rod\'s right edge').toBeGreaterThan(O + 7 + 2);
 }, 60000);
});

describe('the origin\'s name', () => {
 it('stays below the x axis, by O, in every stage', async () => {
  await page.viewport(1440, 900);
  for (const [id, view] of [['disk', true], ['annulus', true], ['semi', false], ['bisector', false]] as const) {
   const v = await openLesson(id);
   if (view) await flat(v);
   for (const n of [0, 1, 2, 3, 4, 5]) {
    if (n) await hold(v, n); else await new Promise(r => setTimeout(r, 400));
    const o = svgOf(v).querySelector<SVGTextElement>('.cd-origin');
    if (!shown(o)) continue;
    const [ox, oy] = o!.dataset.at!.split(' ').map(Number), c = centre(placed(o!));
    expect(c.y, `${id}, stage ${n}: O below the x axis`).toBeGreaterThan(oy);
    expect(Math.hypot(c.x - ox, c.y - oy), `${id}, stage ${n}: O by the origin`).toBeLessThan(48);
   }
   fresh();
  }
 }, 180000);
});

describe('the corner note', () => {
 it('in a potential, is quiet after Cut it up until the limit, as nothing there is drawn to another scale', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('v-ring');
  await flat(v);
  await hold(v, 1);
  expect(footerNote(v)).toContain('Cut into');
  for (const n of [2, 3, 4]) { await hold(v, n); expect(footerNote(v), `stage ${n}`).toBe(''); }
 }, 60000);
});

describe('the sheet seen flat on a phone', () => {
 it('is not cut flat by the plot\'s foot', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('sheet');
  await flat(v);
  await new Promise(r => setTimeout(r, 400));
  const body = svgOf(v).querySelector<SVGGraphicsElement>('.cd-surface[data-source-body]')!;
  const r = body.getBoundingClientRect(), frame = svgOf(v).getBoundingClientRect();
  const bottom = (r.bottom - frame.top) * 430 / frame.height;
  expect(bottom).toBeLessThan(365);
 }, 60000);
});
