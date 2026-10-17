import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type: several of these measure a label's box against a stroke beside it.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE FIGURE'S OWN MARKS, EACH CLEAR OF WHAT IT IS NOT.
 *
 * Round two's critics found a figure whose marks sat on each other in a dozen small ways, each of
 * which a reader takes for a statement: a dashed construction line through the rod's + marks read as
 * a row of minus signs; α lay on the line to the piece; the r bar's tick sat under a downward
 * arrowhead; the arc's pair hid on its own axis; the infinite line's outermost rays met in a second
 * axis through P and its +∞ corner was a knot of strokes; in space the x letter sat among the arrows,
 * the potential's column climbed out of the plot and the schematic's letters lay on its legs; on a
 * phone the cube's faces and the + marks were too small to read; and the rod's end pieces poked out
 * of its rounded caps. Each is measured here, on the shipped Explorer. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 await page.viewport(1440, 900);
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 // A debounced address write from a lesson just closed can land in that wait, and a stale ?p= opens bisector.
 window.history.replaceState(null, '', '/');
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 await settle(view);
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const KEYS = ['pieces', 'one', 'cancel', 'add', 'limit'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
async function stage(view: View, n: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: ${NAMES[n - 1].replace('One piece', 'One (piece|ring)')}$`)}));
 await waitFor(() => expect(view.container.querySelector(`.cd-stage-${KEYS[n - 1]}`)).toBeTruthy());
 await settle(view);
}
async function turn(view: View, to: '2D' | '3D') {
 fireEvent.click(view.getByRole('button', {name: to}));
 await waitFor(() => expect(view.container.querySelector('.cd-in-space') !== null).toBe(to === '3D'));
 await settle(view);
}
type Box = {x: number; y: number; width: number; height: number};
type Pt = {x: number; y: number};
const svgOf = (view: View) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
/** An element's box in the drawing's own units. */
function box(view: View, el: Element): Box {
 const inverse = svgOf(view).getScreenCTM()!.inverse(), r = el.getBoundingClientRect();
 const a = new DOMPoint(r.left, r.top).matrixTransform(inverse), b = new DOMPoint(r.right, r.bottom).matrixTransform(inverse);
 return {x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y};
}
const centre = (b: Box): Pt => ({x: b.x + b.width / 2, y: b.y + b.height / 2});
const grid = (b: Box, n = 3): Pt[] => Array.from({length: n * n}, (_, k) => ({x: b.x + b.width * ((k % n) + .5) / n, y: b.y + b.height * (Math.floor(k / n) + .5) / n}));
const crosses = (b: Box, strokes: SVGGeometryElement[]) => strokes.some(s => grid(b).some(p => s.isPointInStroke(new DOMPoint(p.x, p.y))));
const touch = (a: Box, b: Box, pad = 0) => a.x - pad < b.x + b.width && b.x - pad < a.x + a.width && a.y - pad < b.y + b.height && b.y - pad < a.y + a.height;
const gap = (a: Box, b: Box) => Math.hypot(Math.max(0, b.x - (a.x + a.width), a.x - (b.x + b.width)), Math.max(0, b.y - (a.y + a.height), a.y - (b.y + b.height)));
function painted(el: Element): number {
 let o = 1;
 for (let e: Element | null = el; e && !(e instanceof SVGSVGElement); e = e.parentElement) {
  const cs = getComputedStyle(e);
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  o *= Number(cs.opacity);
 }
 return o;
}
/** How near a stroke's own line comes to a point, sampled along its length. */
function nearest(stroke: SVGGeometryElement, p: Pt) {
 const total = stroke.getTotalLength();
 let best = Infinity;
 for (let k = 0; k <= 200; k++) { const q = stroke.getPointAtLength(total * k / 200); best = Math.min(best, Math.hypot(q.x - p.x, q.y - p.y)); }
 return best;
}
const texts = (view: View, sel = 'text') => [...svgOf(view).querySelectorAll<SVGTextElement>(sel)];
const textNamed = (view: View, name: string, sel = 'text') => texts(view, sel).find(t => t.textContent?.trim() === name);

describe('the rod\'s + marks are never crossed out', () => {
 for (const [id, n] of [['endpoint', 3], ['axial', 2], ['axial', 3], ['bisector', 3], ['infinite', 3]] as const) it(`${id}, stage ${n}: no construction stroke runs through a +, and the + is painted over them`, async () => {
  const view = await openLesson(id);
  await stage(view, n);
  const strokes = [...svgOf(view).querySelectorAll<SVGGeometryElement>('.cd-construction, .cd-triangle path, .cd-triangle line')].filter(s => painted(s) > .05);
  const marks = texts(view, '.cd-plus text');
  expect(marks.length).toBeGreaterThan(2);
  for (const m of marks) for (const s of strokes) expect(nearest(s, centre(box(view, m))), `${s.getAttribute('class') ?? s.parentElement?.getAttribute('class')} by a + at ${centre(box(view, m)).y.toFixed(0)}`).toBeGreaterThanOrEqual(7);
  // Painted after every construction stroke, so where one comes near a mark the mark is on top.
  const plus = svgOf(view).querySelector('.cd-plus')!;
  for (const s of strokes) expect(s.compareDocumentPosition(plus) & Node.DOCUMENT_POSITION_FOLLOWING, 'the marks come after the construction').toBeTruthy();
 }, 20000);
 it('the pieces are cut to the rod\'s rounded ends', async () => {
  const view = await openLesson('bisector');
  const rects = [...svgOf(view).querySelectorAll<SVGRectElement>('.cd-piece rect')];
  expect(rects.length).toBe(5);
  for (const r of rects) expect(r.getAttribute('clip-path')).toMatch(/^url\(#.+rod\)$/);
  const clip = svgOf(view).querySelector(`clipPath${rects[0].getAttribute('clip-path')!.slice(4, -1)} path`);
  expect(clip?.getAttribute('d')).toBe(svgOf(view).querySelector('.cd-source-rod')?.getAttribute('d'));
 });
});
describe('α stands inside its angle, clear of the lines that make it', () => {
 for (const [w, h] of [[1440, 900], [390, 844]] as const) for (const n of [2, 3]) it(`bisector at ${w}x${h}, stage ${n}`, async () => {
  await page.viewport(w, h);
  const view = await openLesson('bisector');
  await stage(view, n);
  const alpha = textNamed(view, 'α', '.cd-angle')!;
  expect(alpha.dataset.placerHidden).toBeUndefined();
  const lines = [...svgOf(view).querySelectorAll<SVGGeometryElement>('.cd-construction, .cd-triangle > path:not(.cd-angle-arc):not(.cd-right-angle)')].filter(s => painted(s) > .05);
  expect(crosses(box(view, alpha), lines)).toBe(false);
 }, 20000);
});
describe('the r bar\'s ticks stand clear of the arrows at P', () => {
 // On the rods and the lines, What cancels letters the triangle's leg r instead of drawing the bar: see
 // tests/figure-cancel.browser.test.tsx. The semi-infinite line keeps its bar in One piece, under ΔE.
 for (const id of ['semi']) it(`${id}, One piece`, async () => {
  const view = await openLesson(id);
  await stage(view, 2);
  const bar = svgOf(view).querySelector<SVGPathElement>('.cd-dimension[data-dim="distance"] path')!;
  const moves = [...bar.getAttribute('d')!.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)].map(m => m.slice(1).map(Number));
  // The bar, then a tick across each end.
  expect(moves.length).toBe(3);
  const arrows = [...svgOf(view).querySelectorAll<SVGGeometryElement>('.cd-vector line, .cd-vector path')].filter(s => painted(s) > .05);
  for (const [x1, y1, x2, y2] of moves.slice(1)) for (let k = 0; k <= 10; k++) {
   const p = new DOMPoint(x1 + (x2 - x1) * k / 10, y1 + (y2 - y1) * k / 10);
   for (const a of arrows) expect(a.isPointInStroke(p), `tick at ${p.x.toFixed(0)},${p.y.toFixed(0)}`).toBe(false);
  }
 }, 20000);
});
describe('the arc\'s pair is seen against its axis, and P = O is clear of φ', () => {
 it('What cancels, as it opens', async () => {
  const view = await openLesson('arc');
  await stage(view, 3);
  // The axes' lines step back; their letters less far, so they still read (see figure-names-w4-type).
  expect(Number(getComputedStyle(svgOf(view).querySelector('.cd-axes path')!).opacity)).toBeLessThanOrEqual(.4);
  // Lettered plain P here, where "P = O" had no room up by P and went out on a leader: P is O is said at rest.
  const name = svgOf(view).querySelector<SVGTextElement>('text.cd-point-label')!, phi = svgOf(view).querySelector<SVGGeometryElement>('[data-dim="angle"] path')!;
  expect(name.textContent).toBe('P');
  expect(name.dataset.leader, 'P beside its dot, not on a leader').toBeUndefined();
  expect(crosses(box(view, name), [phi])).toBe(false);
 }, 20000);
});
describe('a line that never ends', () => {
 it('draws no ray of the fan that runs to the frame instead of the charge', async () => {
  const view = await openLesson('infinite');
  const rays = [...svgOf(view).querySelectorAll('.cd-ray')];
  expect(rays.length).toBeGreaterThan(2);
  for (const r of rays) {
   const x = Number(r.getAttribute('x2')), y = Number(r.getAttribute('y2'));
   expect(Math.min(Math.abs(x - 42), Math.abs(x - 668), Math.abs(y - 54), Math.abs(y - 371)), `ray to ${x},${y}`).toBeGreaterThan(1);
  }
 });
 for (const at of ['rest', 'Shrink them'] as const) it(`keeps its ±∞, its y and the limits' arrows apart, and off the break marks: ${at}`, async () => {
  const view = await openLesson('infinite');
  if (at !== 'rest') await stage(view, 5);
  // The y letter stands at the axis' top as other lessons' do, and goes while α's limits are named there (wave 5).
  if (at !== 'rest') expect(textNamed(view, 'y'), 'y beside the named limits').toBeFalsy();
  const named = (at === 'rest' ? ['+∞', '−∞', 'y'] : ['+∞', '−∞']).map(n => ({n, b: box(view, textNamed(view, n)!)}));
  const handles = [...svgOf(view).querySelectorAll<SVGPathElement>('.cd-bound.is-edge path')].map((h, i) => ({n: `limit ${i}`, b: box(view, h)}));
  if (at !== 'rest') expect(handles.length).toBe(2);
  const all = [...named, ...handles];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(gap(all[i].b, all[j].b), `${all[i].n} and ${all[j].n}`).toBeGreaterThanOrEqual(6);
  const breaks = [...svgOf(view).querySelectorAll<SVGGeometryElement>('.cd-infinity path')];
  for (const {n, b} of all) expect(crosses(b, breaks), `${n} on a break mark`).toBe(false);
 }, 20000);
});
describe('in space, the x letter names its axis and nothing else', () => {
 const cases: [string, number][] = [['bisector', 0], ['bisector', 3], ['bisector', 5], ['v-rod-axial', 0]];
 for (const [id, n] of cases) it(`${id} in 3D${n ? `, stage ${n}` : ', at rest'}`, async () => {
  const view = await openLesson(id);
  await turn(view, '3D');
  if (n) await stage(view, n);
  const x = svgOf(view).querySelector<SVGTextElement>('[data-axis="x"]')!, b = box(view, x);
  // Every arrow, painted in the scene or here: its shaft and its head.
  for (const v of svgOf(view).querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')) {
   if (v.getAttribute('opacity') === '0' || v.closest('[opacity="0"]')) continue;
   const [x1, y1, x2, y2] = v.dataset.shaft!.split(' ').map(Number);
   for (let k = 0; k <= 30; k++) { const p = {x: x1 + (x2 - x1) * k / 30, y: y1 + (y2 - y1) * k / 30}; expect(touch(b, {x: p.x - 2, y: p.y - 2, width: 4, height: 4}), `x on the arrow ${v.textContent}`).toBe(false); }
  }
  for (const t of texts(view)) {
   if (t === x || t.closest('.cd-help, .cd-cube') || !t.textContent?.trim() || t.dataset.placerHidden || painted(t) < .05) continue;
   expect(touch(b, box(view, t)), `x on "${t.textContent}"`).toBe(false);
  }
 }, 30000);
});
describe('the potential\'s column stays in the plot', () => {
 for (const id of ['v-rod-axial', 'v-rod-bisector']) for (const n of [0, 5]) it(`${id} in 3D${n ? ', Shrink them' : ', at rest'}`, async () => {
  const view = await openLesson(id);
  await turn(view, '3D');
  if (n) await stage(view, n);
  const gauge = svgOf(view).querySelector('.cd-gauge')!, b = box(view, gauge);
  expect(b.y).toBeGreaterThanOrEqual(54 - .5);
  expect(b.y + b.height).toBeLessThanOrEqual(371 + .5);
  expect(b.x).toBeGreaterThanOrEqual(42 - .5);
  expect(b.x + b.width).toBeLessThanOrEqual(668 + .5);
  const name = gauge.querySelector<SVGTextElement>('text')!;
  expect(name.dataset.placerHidden).toBeUndefined();
  expect(painted(name)).toBeGreaterThan(.5);
 }, 30000);
});
describe('the schematic triangle\'s letters stand off its legs', () => {
 for (const [w, h] of [[1440, 900], [390, 844]] as const) for (const id of ['ring', 'disk', 'sheet', 'v-ring', 'v-disk']) it(`${id} at ${w}x${h}`, async () => {
  await page.viewport(w, h);
  const view = await openLesson(id);
  for (const n of getProblem(id as never).quantity === 'V' ? [2] : [2, 3]) {
   await stage(view, n);
   const legs = [...svgOf(view).querySelectorAll<SVGGeometryElement>('.cd-triangle path')];
   const letters = texts(view, '.cd-triangle text:not(.cd-triangle-note)');
   expect(letters.length, `stage ${n}`).toBeGreaterThanOrEqual(3);
   for (const t of letters) {
    expect(t.dataset.placerHidden, `${t.textContent} hidden at stage ${n}`).toBeUndefined();
    expect(crosses(box(view, t), legs), `${t.textContent} on a leg at stage ${n}`).toBe(false);
   }
  }
 }, 30000);
});
describe('on a phone the figure\'s small marks are still marks', () => {
 it('the + marks, the cube\'s faces, and no prose crammed into the figure', async () => {
  await page.viewport(390, 844);
  const rod = await openLesson('bisector');
  const scale = () => svgOf(rod).getBoundingClientRect().width / 720;
  for (const m of texts(rod, '.cd-plus text')) expect(parseFloat(getComputedStyle(m).fontSize) * scale()).toBeGreaterThanOrEqual(9);
  cleanup();
  const ring = await openLesson('ring');
  await stage(ring, 2);
  const k = svgOf(ring).getBoundingClientRect().width / 720;
  const faces = texts(ring, '.cd-cube-label');
  expect(faces.length).toBeGreaterThan(0);
  for (const f of faces) expect(parseFloat(getComputedStyle(f).fontSize) * k, f.textContent ?? '').toBeGreaterThanOrEqual(8);
  // The compact note preserves the caveat: this fixed-proportion schematic cannot be measured.
  const note = svgOf(ring).querySelector<SVGTextElement>('.cd-triangle-note')!;
  expect(note.textContent).toBe('Not to scale');
  expect(getComputedStyle(note).display).not.toBe('none');
  expect(parseFloat(getComputedStyle(note).fontSize) * k).toBeGreaterThanOrEqual(8);
 }, 30000);
});
