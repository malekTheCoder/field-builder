import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type and colours: what is measured here is what a reader sees.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE FIGURE'S NAMES, SPACED, PLACED AND SET AS THE BOARD SETS THEM.
 *
 * On a phone the placer kept eight units between names while it set them half as large again: four pixels, and "z s
 * ring ΔQ" read as one phrase. A radius' letter went wherever its reach allowed, and the disk's R settled on the disk's
 * centre. With P half a metre from the rod the angle's letter stood on the rod. The sum's name was set on P's. The
 * board's bold ΔE was a light italic ΔE in the figure; the cube's face names were eight pixels on a phone; the 3D
 * legend, the mirror's arrows and the faded axis letters were under the contrast their size needs. The endless line's
 * ±∞ were lit as the limits, which are θ's; and a disk's corner said "Cut into pieces" over rings. */
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
 await settle(view);
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One (piece|ring)', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
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
/** How strongly an element is painted: every opacity on the way up to the figure, multiplied. */
function painted(el: Element): number {
 let o = 1;
 for (let e: Element | null = el; e && !(e instanceof SVGSVGElement); e = e.parentElement) {
  const cs = getComputedStyle(e);
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  o *= Number(cs.opacity);
 }
 return o;
}
const shown = (t: Element | undefined) => !!t && !(t as SVGTextElement).dataset.placerHidden && painted(t) > .05;
const named = (v: View, text: string) => [...svgOf(v).querySelectorAll<SVGTextElement>('text')].find(t => t.textContent?.trim() === text);
type Box = {x: number; y: number; width: number; height: number};
/** A name's box in the drawing's units, as the reader sees it, nudge and all. */
function box(v: View, el: Element): Box {
 const inverse = svgOf(v).getScreenCTM()!.inverse(), r = el.getBoundingClientRect();
 const a = new DOMPoint(r.left, r.top).matrixTransform(inverse), b = new DOMPoint(r.right, r.bottom).matrixTransform(inverse);
 return {x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y};
}
const toSegment = (b: Box, a: {x: number; y: number}, e: {x: number; y: number}) => {
 let best = Infinity;
 for (let k = 0; k <= 60; k++) { const p = {x: a.x + (e.x - a.x) * k / 60, y: a.y + (e.y - a.y) * k / 60}; best = Math.min(best, Math.hypot(Math.max(b.x - p.x, 0, p.x - b.x - b.width), Math.max(b.y - p.y, 0, p.y - b.y - b.height))); }
 return best;
};
const meet = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const ends = (d: string) => [...d.matchAll(/[ML]\s*([-\d.]+)[ ,]([-\d.]+)/g)].slice(0, 2).map(m => ({x: Number(m[1]), y: Number(m[2])}));
/** sRGB channels, 0..1, of a computed colour: rgb(), color(srgb …) or oklab(). */
function rgb(css: string): number[] {
 const n = (css.match(/[-\d.]+%?/g) ?? []).map(s => s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s));
 if (css.startsWith('rgb')) return n.slice(0, 3).map(c => c / 255);
 if (css.startsWith('color(srgb')) return n.slice(0, 3);
 const [L, a, b] = n, l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
 const lin = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
 return lin.map(c => Math.max(0, Math.min(1, c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055)));
}
const luminance = (c: number[]) => { const [r, g, b] = c.map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

describe('on a phone the names keep a word\'s space between them', () => {
 for (const [id, n, params] of [['ring', 1, {slices: 3}], ['disk', 1, {}], ['disk', 5, {}], ['arc', 2, {}]] as const) it(`${id} ${JSON.stringify(params)}, stage ${n}`, async () => {
  await page.viewport(390, 844);
  const v = await openLesson(id, params);
  await hold(v, n, .98);
  const k = svgOf(v).getBoundingClientRect().width / 720;
  const names = [...svgOf(v).querySelectorAll<SVGTextElement>('text')].filter(t => shown(t) && (t.textContent ?? '').trim() && !t.closest('.cd-cube, .cd-plus, .cd-help') && !t.classList.contains('cd-footer') && !t.classList.contains('cd-stage-label')).map(t => ({t: t.textContent!.trim(), b: box(v, t)}));
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
   const a = names[i].b, b = names[j].b, overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
   if (overlapY < .6 * Math.min(a.height, b.height)) continue;
   const gap = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
   expect(gap * k, `"${names[i].t}" and "${names[j].t}" on one line`).toBeGreaterThanOrEqual(5);
  }
 }, 60000);
});

describe('a radius\' letter names its own radius', () => {
 it('the ring\'s R, as the first pair goes in: by its radius, not by the line from P to the piece', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('ring');
  await hold(v, 4, .3);
  const g = [...svgOf(v).querySelectorAll('.cd-dimension')].find(d => d.querySelector('text')?.textContent === 'R')!, [o, tip] = ends(g.querySelector('path')!.getAttribute('d')!);
  const r = box(v, g.querySelector('text')!), line = svgOf(v).querySelector<SVGLineElement>('.cd-construction[data-ri]');
  if (!line || painted(line) < .05) return;
  const toPiece = toSegment(r, {x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1'))}, {x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2'))});
  expect(toSegment(r, o, tip) + 3, 'nearer its own radius').toBeLessThanOrEqual(toPiece);
 }, 60000);
 it('the disk\'s R on a phone, in Shrink them: out by the rim, never at the centre', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('disk');
  await hold(v, 5, .98);
  const rim = svgOf(v).querySelector('[data-rim] path')!, [o, tip] = ends(rim.getAttribute('d')!), r = box(v, svgOf(v).querySelector('[data-rim] text')!);
  const centre = {x: r.x + r.width / 2, y: r.y + r.height / 2};
  expect(Math.hypot(centre.x - o.x, centre.y - o.y), 'its middle well out from the centre').toBeGreaterThan(Math.hypot(tip.x - o.x, tip.y - o.y) / 3);
 }, 60000);
});

describe('with P close in, the angle\'s letter is never on the rod', () => {
 for (const [id, w] of [['bisector', 1440], ['bisector', 390], ['endpoint', 1440], ['infinite', 1440]] as const) it(`${id} at ${w}`, async () => {
  await page.viewport(w, w > 1000 ? 900 : 844);
  const v = await openLesson(id, {distance: .5});
  await hold(v, 3, .98);
  const rod = box(v, svgOf(v).querySelector('.cd-source-rod')!);
  // On P's side of the rod: on it, or under its foot past it, the letter read as the angle at O.
  for (const t of svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text.cd-angle')) expect(box(v, t).x, `${t.textContent} clear of the rod, on P's side`).toBeGreaterThan(rod.x + rod.width);
 }, 60000);
});

describe('P\'s name is never covered by the sum\'s', () => {
 it('the arc on a phone, as the pairs go in', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('arc');
  for (const f of [.4, .5, .6]) {
   await hold(v, 4, f);
   const p = svgOf(v).querySelector<SVGTextElement>('.cd-point-label')!, sum = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => /^(E [≈=] )?Σ ΔE$/.test(t.dataset.symbol ?? ''));
   if (sum && shown(sum)) expect(meet(box(v, p), box(v, sum)), `at ${f}`).toBe(false);
  }
 }, 60000);
});

describe('set as the board sets them, and strong enough to read', () => {
 it('a whole vector\'s name is bold and upright, a component\'s is not', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('bisector');
  await hold(v, 3, .98);
  const label = (s: string) => [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => t.dataset.symbol === s)!;
  const e = label('ΔE').querySelector('.cd-bold')!;
  expect(e?.textContent).toBe('E');
  expect(Number(getComputedStyle(e).fontWeight)).toBeGreaterThanOrEqual(700);
  expect(getComputedStyle(e).fontStyle).toBe('normal');
  expect(label('ΔE_x').querySelector('.cd-bold'), 'ΔE_x stays light').toBeNull();
 }, 60000);
 it('the cube\'s face names are eleven pixels or more on a phone', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('ring');
  const faces = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-cube-label')];
  expect(faces.length).toBeGreaterThan(0);
  for (const f of faces) expect(f.getBoundingClientRect().height, f.textContent ?? '').toBeGreaterThanOrEqual(11);
 }, 60000);
 it('the 3D legend, the mirror\'s arrows and the faded axis letters keep their contrast', async () => {
  await page.viewport(1440, 900);
  const ring = await openLesson('ring');
  expect(Number(getComputedStyle(svgOf(ring).querySelector('.cd-help')!).opacity), 'the legend').toBe(1);
  cleanup();
  const v = await openLesson('arc');
  await hold(v, 3, .98);
  const ground = rgb(getComputedStyle(v.container.querySelector('.charge-diagram')!.closest('.exp-diagram-card') ?? document.body).backgroundColor);
  const white = ground.every(c => c > .98) || ground.length < 3 ? [1, 1, 1] : ground;
  const partner = [...svgOf(v).querySelectorAll<SVGGElement>('.cd-vector')].find(g => !g.querySelector('text') && /color-mix|oklab|rgb/.test(g.style.color))!;
  expect(contrast(rgb(getComputedStyle(partner).color), white), 'the mirror\'s arrow').toBeGreaterThanOrEqual(3);
  for (const t of svgOf(v).querySelectorAll('.cd-axes text')) expect(painted(t), 'an axis letter').toBeGreaterThanOrEqual(.55);
 }, 60000);
});

describe('the endless line\'s ends are not its limits, and a disk is cut into rings', () => {
 it('Shrink them on the endless line: ±∞ in ink, the limits\' arrows named in α', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('infinite');
  await hold(v, 5, .98);
  const end = named(v, '+∞')!, limit = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-bound text')].find(t => t.textContent?.includes('α'));
  expect(limit, 'a limit named in α').toBeTruthy();
  expect(getComputedStyle(end).fill, '+∞ not in the limits\' colour').not.toBe(getComputedStyle(limit!).fill);
 }, 60000);
 for (const [id, note] of [['disk', 'Cut into rings'], ['sheet', 'Cut into rings'], ['v-disk', 'Cut into rings'], ['bisector', 'Cut into pieces']] as const) it(`${id}: "${note}"`, async () => {
  await page.viewport(1440, 900);
  const v = await openLesson(id);
  await hold(v, 1, .98);
  expect(svgOf(v).querySelector('.cd-footer[data-dim="pieces"]')?.textContent).toBe(note);
 }, 60000);
});
