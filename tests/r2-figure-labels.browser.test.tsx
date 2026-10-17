import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type, imported as src/main.tsx imports it: the placer measures every label, and a
// label measured in a fallback face is a different size from the one a reader sees.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE NAMES THE BOARD IS WRITTEN IN ARE ON THE FIGURE, CLEAR, AND BESIDE WHAT THEY NAME.
 *
 * The label placer moves a label that collides to the nearest free spot within a reach, and hides
 * it if there is none. Its reach was a fixed 24 units while a phone sets the labels nearly twice as
 * large, its obstacles left out the construction it was lettering, and nothing told it which names
 * mattered -- so on a phone at What cancels it hid −ΔE_y, ΔE_x, r_i, α and y on the bisector, and
 * every lesson lost some of the very symbols the stage's line of algebra is written in. Elsewhere
 * it kept them and put them on the wrong arrow, or on a dashed line, or two of them so close they
 * read as one phrase.
 *
 * So, swept over the shipped Explorer -- every lesson, a desktop and a phone, the stage that draws
 * one piece and the stage that cancels -- and the projector and the views the critics found worst:
 * every name the stage is about is drawn and visible; nothing marked to keep is hidden; no two
 * names touch; no kept name is crossed by a construction stroke; and every arrow's name is nearer
 * its own shaft than any other arrow's. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(() => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => {
 cleanup();
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function stage(view: View, n: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: ${NAMES[n - 1].replace('One piece', 'One (piece|ring)')}$`)}));
 await waitFor(() => expect(view.container.querySelector(`.cd-stage-${['pieces', 'one', 'cancel', 'add', 'limit'][n - 1]}`)).toBeTruthy());
 await settle(view);
}
/** Until the view has stopped moving and the placer has had a frame to lay the labels out. */
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
type Box = {x: number; y: number; width: number; height: number};
/** How strongly an element is painted: every opacity on the way up to the figure, multiplied. */
function painted(el: Element): number {
 let o = 1;
 for (let e: Element | null = el; e && !(e instanceof SVGSVGElement); e = e.parentElement) {
  const cs = getComputedStyle(e);
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  // The computed opacity already carries an `opacity` attribute: SVG reads it as a property.
  o *= Number(cs.opacity);
 }
 return o;
}
function figure(view: View) {
 const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
 const inverse = svg.getScreenCTM()!.inverse();
 const box = (el: Element): Box => {
  const r = el.getBoundingClientRect(), a = new DOMPoint(r.left, r.top).matrixTransform(inverse), b = new DOMPoint(r.right, r.bottom).matrixTransform(inverse);
  return {x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y};
 };
 // Every name in the drawing, but not the legend's prose, the cube's faces or the charge's own marks.
 const labels = [...svg.querySelectorAll<SVGTextElement>('text')]
  .filter(t => !t.closest('.cd-help, .cd-cube, .cd-plus') && (t.textContent ?? '').trim() && t.getBoundingClientRect().width > .5)
  .map(t => ({t, text: t.textContent!.trim(), box: box(t), shown: !t.dataset.placerHidden && painted(t) > .05}));
 return {svg, labels, box};
}
const describeLabel = (l: {text: string; box: Box}) => `${l.text} @${l.box.x.toFixed(0)},${l.box.y.toFixed(0)}`;
const touch = (a: Box, b: Box, pad: number) => a.x - pad < b.x + b.width && b.x - pad < a.x + a.width && a.y - pad < b.y + b.height && b.y - pad < a.y + a.height;
/** The distance from a box to a segment: none where they touch. */
function boxToSegment(b: Box, a: {x: number; y: number}, e: {x: number; y: number}) {
 let best = Infinity;
 for (let k = 0; k <= 40; k++) {
  const p = {x: a.x + (e.x - a.x) * k / 40, y: a.y + (e.y - a.y) * k / 40};
  best = Math.min(best, Math.hypot(Math.max(b.x - p.x, 0, p.x - b.x - b.width), Math.max(b.y - p.y, 0, p.y - b.y - b.height)));
 }
 return best;
}
/** The names each stage's line of algebra is written in. A rod turned into space keeps the name of
 * the distance and loses the angle at P, which is only that angle seen flat. */
function terms(id: string, n: 2 | 3, space = false): string[] {
 const all = flatTerms(id, n), g = getProblem(id as never).geometry;
 return space && !['ring', 'disk', 'sheet'].includes(g) ? all.filter(t => t !== 'α' && t !== 'θ' && t !== 'y') : all;
}
function flatTerms(id: string, n: 2 | 3): string[] {
 const p = getProblem(id as never), g = p.geometry, scalar = p.quantity === 'V';
 const surface = g === 'disk' || g === 'sheet', round = g === 'ring' || surface;
 const ri = g === 'arc' || g === 'uneven-arc' ? (scalar ? [] : ['ri = R']) : g === 'axial' ? ['ri = L + a − x'] : ['ri'];
 if (scalar) {
  const pairs = ['bisector', 'ring', 'arc', 'uneven-arc'].includes(g);
  return n === 2 ? ['ΔV', ...ri, ...(g === 'bisector' ? ['y'] : []), surface ? 'ring ΔQ' : 'ΔQ'] : [pairs ? 'ΔV + ΔV' : 'ΔV'];
 }
 if (n === 2) return [surface ? 'ΔEz' : 'ΔE', ...ri, surface ? 'ring ΔQ' : 'ΔQ'];
 const angle = g === 'arc' || g === 'uneven-arc' ? 'θ' : 'α';
 if (g === 'axial') return ['ΔE', ...ri];
 if (surface) return ['ΔEz', angle, ...ri];
 // The piece's own whole arrow too, which What cancels' line says "lies along that line" -- and not the mirror's part
 // that cancels it: the board writes that once, as (−ΔE_y), and it is the name that gives way to the piece's own.
 const keep = round ? 'ΔEz' : 'ΔEx', drop = round ? 'ΔE⊥' : 'ΔEy';
 return [keep, drop, 'ΔE', angle, ...ri];
}
function check(view: View, where: string, want: string[]) {
 const {svg, labels} = figure(view);
 const shown = labels.filter(l => l.shown);
 // The stage's own names: drawn, and visible.
 for (const name of want) expect(shown.some(l => l.text === name), `${where}: "${name}" is drawn and visible; shown: ${shown.map(l => l.text).join(' | ')}`).toBe(true);
 // Nothing it was told to keep is hidden -- other than a whole bracket the figure withholds on purpose,
 // as it does a flat view's dimensions once the view turns into space.
 for (const l of labels.filter(l => l.t.dataset.keep === 'true' && !l.t.closest('.is-hidden'))) expect(l.shown, `${where}: kept "${l.text}" is hidden`).toBe(true);
 // No two names touch.
 for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++)
  expect(touch(shown[i].box, shown[j].box, 1), `${where}: ${describeLabel(shown[i])} touches ${describeLabel(shown[j])}`).toBe(false);
 // No kept name has a construction stroke through it.
 const strokes = [...svg.querySelectorAll<SVGGeometryElement>('.cd-construction, .cd-triangle path, .cd-triangle line')].filter(s => painted(s) > .05);
 for (const l of shown.filter(l => l.t.dataset.keep === 'true')) for (const s of strokes) {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
   const p = new DOMPoint(l.box.x + l.box.width * (i + .5) / 3, l.box.y + l.box.height * (j + .5) / 3);
   expect(s.isPointInStroke(p), `${where}: ${describeLabel(l)} is crossed by ${s.getAttribute('class') ?? s.parentElement?.getAttribute('class')}`).toBe(false);
  }
 }
 // Every arrow's name is nearer its own shaft than any other arrow's.
 const shafts = [...svg.querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')].filter(g => painted(g) > .05 || g.closest('.cd-in-space, [data-cancel-ghost]'))
  .map(g => ({g, s: g.dataset.shaft!.split(' ').map(Number)}));
 for (const l of shown.filter(l => l.t.classList.contains('cd-vector-label'))) {
  const own = shafts.find(s => s.g.contains(l.t));
  if (!own) continue;
  const mine = boxToSegment(l.box, {x: own.s[0], y: own.s[1]}, {x: own.s[2], y: own.s[3]});
  for (const other of shafts) {
   if (other === own || other.g.closest('[data-cancel-ghost]') || own.g.closest('[data-cancel-ghost]')) continue;
   if (other.s.every((v, k) => Math.abs(v - own.s[k]) < .6)) continue;
   const theirs = boxToSegment(l.box, {x: other.s[0], y: other.s[1]}, {x: other.s[2], y: other.s[3]});
   expect(theirs, `${where}: ${describeLabel(l)} is ${theirs.toFixed(1)} from another arrow and ${mine.toFixed(1)} from its own`).toBeGreaterThan(mine);
  }
 }
}
async function sweep(view: View, where: string, id: string, space = false) {
 await stage(view, 2);
 check(view, `${where} / One piece`, terms(id, 2, space));
 await stage(view, 3);
 check(view, `${where} / What cancels`, terms(id, 3, space));
}
const VIEWPORTS: [number, number][] = [[1440, 900], [390, 844]];
describe('every lesson, a desktop and a phone, One piece and What cancels', () => {
 for (const [w, h] of VIEWPORTS) for (const {id} of PROBLEMS) it(`${id} at ${w}x${h}`, async () => {
  await page.viewport(w, h);
  const view = await openLesson(id);
  await sweep(view, `${id} ${w}`, id);
 }, 30000);
});
describe('the projector, and the views the critics found worst', () => {
 for (const id of ['bisector', 'ring', 'endpoint']) it(`${id} at 1280x720`, async () => {
  await page.viewport(1280, 720);
  const view = await openLesson(id);
  await sweep(view, `${id} 1280`, id);
 }, 30000);
 it('endpoint with a negative charge, where every arrow turns round', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('endpoint', {charge: -2});
  await sweep(view, 'endpoint Q<0', 'endpoint');
 }, 30000);
 it('ring in the flat side view', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('ring');
  fireEvent.click(view.getByRole('button', {name: '2D'}));
  await settle(view);
  await sweep(view, 'ring 2D', 'ring');
 }, 30000);
 it('bisector turned into space', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await settle(view);
  await sweep(view, 'bisector 3D', 'bisector', true);
 }, 30000);
});
