import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type and stylesheet: these read painted strokes and the boxes of letters.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';
import {sampleDistribution, sumSamples} from '../src/diagrams/sampling';
import {field, magnitude} from '../src/symbolic/physics';
import {projectCamera} from '../src/diagrams/camera';
import {boxSegmentDistance} from '../src/diagrams/labels';
import {intervalKey} from '../src/diagrams/subdivision';
/* WAVE TWO OF THE FIGURE, AS A READER MEETS IT.
 *
 * The schematic triangle's z took the height bar's held place, inside the triangle under the angle. The middle
 * piece of an odd cut was drawn with a phantom mirror. Pointing at the charge thinned the ring's band. The
 * endless line's ΔQ was set in the title's row. The resting arrow and the potential's column did not grow with
 * what they draw. A negative column ran down through the disk. The breaks hid under the charge's colour; the
 * rods' triangle did not close; a rod's limits went unnamed in the stages about them; Shrink them never showed
 * the piece becoming dy; the ring never marked Δθ, the sheet never Δα; the arc's R stood inside φ's mark; r_i
 * was never lettered in space; the sum's chain hid in the net's shaft. Each is measured here. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(async () => { cleanup(); window.history.replaceState(null, '', '/'); await page.viewport(1440, 900); });
async function openLesson(id: string, params: Record<string, number> = {}, search = '') {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 if (search) window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
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
 await waitFor(() => expect(view.container.querySelector('.cd-in-space') !== null).toBe(to === '3D'), {timeout: 5000});
 await new Promise(r => setTimeout(r, 1000));
 await settle(view);
}
const svgOf = (view: {container: HTMLElement}) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
function box(view: {container: HTMLElement}, el: Element) {
 const s = svgOf(view).getBoundingClientRect(), r = el.getBoundingClientRect(), k = 720 / s.width;
 return {x: (r.left - s.left) * k, y: (r.top - s.top) * k, width: r.width * k, height: r.height * k};
}
const centre = (b: {x: number; y: number; width: number; height: number}) => ({x: b.x + b.width / 2, y: b.y + b.height / 2});
function painted(el: Element): number {
 let o = 1;
 for (let e: Element | null = el; e && !(e instanceof SVGSVGElement); e = e.parentElement) {
  const cs = getComputedStyle(e);
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  o *= Number(cs.opacity);
 }
 return o;
}
const shown = (t: SVGTextElement) => !t.dataset.placerHidden && painted(t) > .3;
const texts = (view: View) => [...svgOf(view).querySelectorAll<SVGTextElement>('text')].filter(t => !t.closest('.cd-help') && t.textContent?.trim());
const named = (view: View, text: string) => texts(view).filter(t => t.textContent === text);
const P = (view: {container: HTMLElement}) => { const c = view.container.querySelector<SVGCircleElement>('circle.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
const shaftOf = (g: Element) => { const [x1, y1, x2, y2] = (g as SVGGElement).dataset.shaft!.split(' ').map(Number); return {a: {x: x1, y: y1}, b: {x: x2, y: y2}}; };
/** A path's points in the drawing's own units, through every transform round it: the ring's and the disk's
 * outline is drawn in metres inside the plane's matrix. */
function outline(view: {container: HTMLElement}, path: SVGGeometryElement, k = 160) {
 const svg = svgOf(view), m = svg.getScreenCTM()!.inverse().multiply(path.getScreenCTM()!), len = path.getTotalLength();
 return Array.from({length: k + 1}, (_, i) => { const q = path.getPointAtLength(len * i / k); return new DOMPoint(q.x, q.y).matrixTransform(m); }).map(q => ({x: q.x, y: q.y}));
}

describe('the schematic triangle keeps its letters: α inside the angle, z beside its own leg', () => {
 for (const [w, h] of [[1280, 720], [1920, 970], [1024, 768]] as const) for (const id of ['ring', 'disk']) it(`${id} in space at ${w}`, async () => {
  await page.viewport(w, h);
  const v = await openLesson(id);
  for (const n of [1, 2, 3]) {
   await hold(v, n, .99);
   if (n === 1) continue;
   const tri = svgOf(v).querySelector<SVGPathElement>('.cd-triangle path')!.getAttribute('d')!;
   const legX = Number(tri.match(/^M([-\d.]+)/)![1]);
   const alpha = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text')].find(t => t.textContent === 'α')!;
   const z = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text')].find(t => t.textContent === 'z')!;
   expect(centre(box(v, alpha)).x, `stage ${n}: α right of the leg`).toBeGreaterThan(legX);
   expect(centre(box(v, z)).x, `stage ${n}: z left of the leg`).toBeLessThan(legX);
  }
 }, 45000);
 it('ring and v-ring seen flat, after the view has been in space', async () => {
  for (const id of ['ring', 'v-ring']) {
   const v = await openLesson(id);
   await hold(v, 1, .99);
   await turn(v, '2D');
   for (const n of [1, 2, 3, 2]) {
    await hold(v, n, .99);
    const tri = svgOf(v).querySelector<SVGPathElement>('.cd-triangle path');
    if (!tri) continue;
    const legX = Number(tri.getAttribute('d')!.match(/^M([-\d.]+)/)![1]);
    const z = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-triangle text')].find(t => t.textContent === 'z')!;
    expect(centre(box(v, z)).x, `${id} stage ${n}: z left of the leg`).toBeLessThan(legX);
   }
   cleanup(); window.history.replaceState(null, '', '/');
  }
 }, 60000);
});

describe('a piece that is its own mirror has none', () => {
 for (const id of ['bisector', 'infinite', 'arc']) it(`${id}, the middle of five picked in What cancels`, async () => {
  const v = await openLesson(id, {slices: 5});
  await hold(v, 3, .5);
  fireEvent.pointerDown(svgOf(v).querySelector(`.cd-piece[data-piece-key="${intervalKey(2, 5)}"]`)!, {button: 0, pointerId: 3});
  await hold(v, 3, .97);
  expect(svgOf(v).querySelector(`.cd-piece.is-selected[data-piece-key="${intervalKey(2, 5)}"]`), 'the middle piece is the run\'s').toBeTruthy();
  expect(svgOf(v).querySelector('.cd-grow-pair'), 'no mirror arrows').toBeNull();
  expect(svgOf(v).querySelector('.cd-partner-keep'), 'no mirror survivor').toBeNull();
  expect(svgOf(v).querySelector('line.cd-pair'), 'no line from a mirror to P').toBeNull();
 }, 30000);
 it('a teacher\'s link at seven pieces, pair and parts: nothing drawn for a partner', async () => {
  const v = await openLesson('bisector', {slices: 7}, '?p=bisector&slices=7&pair=1&components=1&mode=project');
  await settle(v);
  expect(svgOf(v).querySelector('.cd-grow-pair')).toBeNull();
  expect(svgOf(v).querySelector('.cd-partner-keep')).toBeNull();
  expect(svgOf(v).querySelector('line.cd-pair')).toBeNull();
 }, 30000);
});

describe('pointing at the charge never thins the body that answers for it', () => {
 for (const [id, flat] of [['arc', false], ['ring', true], ['v-arc', false]] as const) it(id, async () => {
  const v = await openLesson(id);
  if (flat) await turn(v, '2D');
  const body = svgOf(v).querySelector<SVGPathElement>('[data-source-body]')!;
  const rest = parseFloat(getComputedStyle(body).strokeWidth);
  for (const label of [/Total charge Q/, /Radius R/]) {
   const range = [...v.container.querySelectorAll<HTMLElement>('.exp-range')].find(r => label.test(r.textContent ?? ''))!;
   fireEvent.pointerEnter(range);
   await frames(2);
   expect(parseFloat(getComputedStyle(body).strokeWidth), `${label}`).toBeGreaterThanOrEqual(rest);
   fireEvent.pointerLeave(range);
  }
 }, 30000);
});

describe('no name is set in the stage title\'s row', () => {
 for (const [w, h] of [[1440, 900], [390, 844]] as const) it(`the endless line with P far, at ${w}`, async () => {
  await page.viewport(w, h);
  const v = await openLesson('infinite', {distance: 6});
  for (const n of [1, 2, 3, 5]) {
   await hold(v, n, .99);
   for (const t of svgOf(v).querySelectorAll<SVGTextElement>('.cd-source-tag text')) if (shown(t)) expect(box(v, t).y, `stage ${n}`).toBeGreaterThanOrEqual(53);
  }
 }, 45000);
});

/** The resting net arrow's length, and the field it stands for, over a sweep of one slider. */
function sweep(id: ProblemId, key: 'distance' | 'charge', values: number[]) {
 const problem = getProblem(id), g = problem.geometry;
 const props = (params: Params) => ({problem, params, setParams: vi.fn(), count: 5, continuum: 0, selected: 2, onSelect: vi.fn(), progress: 1, components: false, pair: false, mode: 'divide' as const, boundRange: [0, 100] as [number, number]});
 const view = render(<ChargeDiagram {...props({...DEFAULT_PARAMS, [key]: values[0]})} />);
 const out: {len: number; e: number}[] = [];
 for (const value of values) {
  const params = {...DEFAULT_PARAMS, [key]: value};
  view.rerender(<ChargeDiagram {...props(params)} />);
  const label = [...view.container.querySelectorAll('.cd-vector-label')].find(t => t.getAttribute('data-symbol') === 'Σ ΔE');
  const g2 = label?.closest('.cd-vector') ?? [...view.container.querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')][0];
  const s = g2 ? shaftOf(g2) : {a: {x: 0, y: 0}, b: {x: 0, y: 0}};
  out.push({len: Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), e: magnitude(sumSamples(sampleDistribution(g, params, 5)))});
 }
 cleanup();
 return out;
}
describe('the resting arrow grows with the field, and only with it', () => {
 const lessons: ProblemId[] = ['bisector', 'axial', 'endpoint', 'ramp', 'infinite', 'semi', 'ring', 'disk', 'arc', 'sheet'];
 for (const id of lessons) it(id, () => {
  const steps = (lo: number, hi: number) => Array.from({length: 40}, (_, i) => lo + (hi - lo) * i / 39);
  for (const [key, values] of [['charge', steps(.1, 5)], ...(id === 'arc' ? [] : [['distance', steps(.5, 6)]])] as ['distance' | 'charge', number[]][]) {
   const run = sweep(id, key, values);
   for (let i = 1; i < run.length; i++) {
    const dl = run[i].len - run[i - 1].len, de = run[i].e - run[i - 1].e;
    if (Math.abs(dl) > .5) expect(Math.sign(dl), `${key} ${values[i - 1].toFixed(2)} → ${values[i].toFixed(2)}: ${run[i - 1].len.toFixed(1)} → ${run[i].len.toFixed(1)} px for |E| ${run[i - 1].e.toPrecision(3)} → ${run[i].e.toPrecision(3)}`).toBe(Math.sign(de));
   }
  }
 });
});

describe('the potential\'s column is as tall as the potential is large', () => {
 const height = (view: {container: HTMLElement}) => {
  const fills = [...view.container.querySelectorAll<SVGRectElement>('.cd-gauge .cd-stack-fill')];
  if (!fills.length) return 0;
  const ys = fills.flatMap(r => [Number(r.getAttribute('y')), Number(r.getAttribute('y')) + Number(r.getAttribute('height'))]);
  return Math.max(...ys) - Math.min(...ys);
 };
 for (const id of ['v-ring', 'v-rod-bisector', 'v-rod-axial'] as ProblemId[]) it(id, () => {
  const problem = getProblem(id);
  const at = (over: Partial<Params>) => {
   const view = render(<ChargeDiagram problem={problem} params={{...DEFAULT_PARAMS, ...over}} setParams={vi.fn()} count={5} continuum={0} selected={2} onSelect={vi.fn()} progress={1} components={false} pair={false} mode="divide" boundRange={[0, 100]} />);
   const h = height(view);
   cleanup();
   return h;
  };
  const near = at({distance: .5}), mid = at({distance: 3}), far = at({distance: 6});
  expect(near, 'P close in').toBeGreaterThan(mid);
  expect(mid, 'P far off').toBeGreaterThan(far);
  expect(at({charge: 5}), 'more charge').toBeGreaterThan(at({charge: .5}));
 });
});

describe('a negative potential is never drawn down through its own charge', () => {
 for (const id of ['v-disk', 'v-ring']) for (const charge of [-2, -5]) for (const distance of [.5, 3]) it(`${id}, Q ${charge}, z ${distance}`, async () => {
  for (const view of ['3D', '2D'] as const) {
   const v = await openLesson(id, {charge, distance});
   if (view === '2D') await turn(v, '2D');
   const body = svgOf(v).querySelector<SVGGeometryElement>('[data-source-body]')!;
   const rim = outline(v, body);
   for (const r of v.container.querySelectorAll<SVGRectElement>('.cd-gauge rect')) {
    const x0 = Number(r.getAttribute('x')), x1 = x0 + Number(r.getAttribute('width')), y1 = Number(r.getAttribute('y')) + Number(r.getAttribute('height'));
    const under = rim.filter(q => q.x >= x0 && q.x <= x1);
    if (under.length) expect(y1, `${view}: the column's foot stays above the charge under it`).toBeLessThanOrEqual(Math.min(...under.map(q => q.y)) + .5);
   }
   cleanup(); window.history.replaceState(null, '', '/');
  }
 }, 45000);
});

describe('the breaks of a line that never ends', () => {
 for (const id of ['infinite', 'semi']) it(`${id}: no + inside a break in the limit, and the break is drawn over the charge`, async () => {
  const v = await openLesson(id);
  await hold(v, 5, .99);
  const gaps = [...svgOf(v).querySelectorAll<SVGPolygonElement>('.cd-break-gap')];
  expect(gaps.length, 'each break is drawn as a gap').toBeGreaterThan(0);
  const upright = id === 'infinite';
  for (const g of gaps) {
   const pts = g.getAttribute('points')!.split(' ').map(p => p.split(',').map(Number));
   const along = pts.map(([x, y]) => upright ? y : x), lo = Math.min(...along) - 7, hi = Math.max(...along) + 7;
   for (const t of svgOf(v).querySelectorAll<SVGTextElement>('.cd-plus text')) {
    const c = centre(box(v, t)), a = upright ? c.y : c.x;
    expect(a > lo && a < hi, `a + at ${a.toFixed(0)} inside the break ${lo.toFixed(0)}–${hi.toFixed(0)}`).toBe(false);
   }
  }
 }, 30000);
});

describe('a rod\'s limits are named in the stages about them', () => {
 const cases: [string, Record<string, number>, string[]][] = [
  ['axial', {distance: .5}, ['x = 0', 'x = L']],
  ['endpoint', {distance: .5, size: 8}, ['y = 0', 'y = L']],
  ['bisector', {}, ['+L/2', '−L/2']],
 ];
 for (const [w, h] of [[1440, 900], [390, 844]] as const) for (const [id, params, ends] of cases) it(`${id} ${JSON.stringify(params)} at ${w}`, async () => {
  await page.viewport(w, h);
  const v = await openLesson(id, params);
  for (const n of [4, 5]) {
   await hold(v, n, .99);
   for (const end of ends) if (n === 5 || !end.startsWith('x = 0')) expect(named(v, end).some(shown), `stage ${n}: ${end}`).toBe(true);
  }
 }, 45000);
 it('a rod\'s two ends are never half named', async () => {
  const v = await openLesson('bisector', {distance: 1, size: 8});
  await hold(v, 2, .99);
  const [top, bottom] = [named(v, '+L/2')[0], named(v, '−L/2')[0]];
  expect(shown(top)).toBe(shown(bottom));
 }, 30000);
});

describe('Shrink them shows the piece becoming the differential', () => {
 for (const [w, h] of [[1280, 800], [390, 844]] as const) for (const [id, sel, name] of [['bisector', '[data-piece-length] text', 'dy'], ['endpoint', '[data-piece-length] text', 'dy'], ['arc', '.cd-piece-angle text', 'dθ'], ['infinite', '.cd-piece-angle text', 'dθ']] as const) it(`${id} at ${w}`, async () => {
  await page.viewport(w, h);
  const v = await openLesson(id);
  await hold(v, 5, .99);
  const t = svgOf(v).querySelector<SVGTextElement>(sel);
  expect(t?.textContent).toBe(name);
  expect(shown(t!)).toBe(true);
 }, 30000);
});

describe('the field itself, beside the pieces\' sum, where they differ', () => {
 it('P close to a rod\'s end cut in three: E drawn along the field', async () => {
  const v = await openLesson('endpoint', {distance: .5, size: 8, slices: 3});
  await settle(v);
  const e = svgOf(v).querySelector('[data-true-field] .cd-vector')!;
  expect(e, 'E is drawn').toBeTruthy();
  const s = shaftOf(e), want = field('endpoint', {...DEFAULT_PARAMS, distance: .5, size: 8, slices: 3}), screen = projectCamera(want, 0, Math.PI / 2);
  const angle = Math.abs(Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) - Math.atan2(screen.y, screen.x)) * 180 / Math.PI;
  expect(Math.min(angle, 360 - angle)).toBeLessThan(1);
  expect(svgOf(v).querySelector('[data-true-field] .cd-vector-label')?.textContent).toBe('E');
 }, 30000);
 it('at the defaults, one arrow at P', async () => {
  for (const id of ['bisector', 'endpoint', 'infinite', 'ring', 'arc']) {
   const v = await openLesson(id);
   await settle(v);
   expect(svgOf(v).querySelector('[data-true-field]'), id).toBeNull();
   cleanup(); window.history.replaceState(null, '', '/');
  }
 }, 45000);
});

describe('a wide ring or disk stays in the plot', () => {
 for (const id of ['ring', 'disk']) for (const distance of [.5, 3]) it(`${id}, R 4, z ${distance}`, async () => {
  const v = await openLesson(id, {size: 8, distance});
  await settle(v);
  const rim = outline(v, svgOf(v).querySelector<SVGGeometryElement>('[data-source-body]')!);
  expect(Math.max(...rim.map(q => q.y)), 'the near rim').toBeLessThanOrEqual(366);
  expect(Math.min(...rim.map(q => q.x))).toBeGreaterThanOrEqual(30);
  expect(Math.max(...rim.map(q => q.x))).toBeLessThanOrEqual(690);
 }, 30000);
});

describe('in space the line from P to the piece is lettered r_i, and z stands by its own height', () => {
 for (const distance of [1.5, 3, 5]) it(`ring, z ${distance}`, async () => {
  const v = await openLesson('ring', {distance});
  await hold(v, 2, .99);
  const ri = svgOf(v).querySelector<SVGTextElement>('[data-ri-line]')!;
  expect(ri && shown(ri), 'r_i is lettered').toBe(true);
  const line = svgOf(v).querySelector<SVGLineElement>('.cd-construction[data-ri]')!;
  const seg = {a: {x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1'))}, b: {x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2'))}};
  expect(boxSegmentDistance(box(v, ri), seg)).toBeLessThanOrEqual(12);
  const z = [...svgOf(v).querySelectorAll<SVGTextElement>('[data-dim="distance"] text')].find(t => t.textContent === 'z')!;
  const zb = box(v, z), p = P(v), axis = {a: {x: p.x, y: p.y}, b: {x: p.x, y: 400}};
  expect(boxSegmentDistance(zb, axis), 'z nearer its height than r_i\'s line').toBeLessThan(boxSegmentDistance(zb, seg));
 }, 30000);
});

describe('the angles a ring and a sheet are cut by', () => {
 it('the ring\'s Δθ in Cut it up', async () => {
  const v = await openLesson('ring');
  await hold(v, 1, .99);
  const t = svgOf(v).querySelector<SVGTextElement>('[data-ring-angle] text')!;
  expect(t.textContent).toBe('Δθ');
  expect(shown(t)).toBe(true);
 }, 30000);
 for (const view of ['3D', '2D'] as const) it(`the sheet's Δα in Cut it up, ${view}`, async () => {
  const v = await openLesson('sheet');
  if (view === '2D') await turn(v, '2D');
  await hold(v, 1, .99);
  const t = svgOf(v).querySelector<SVGTextElement>('.cd-piece-angle text')!;
  expect(t.textContent).toBe('Δα');
  expect(shown(t)).toBe(true);
 }, 30000);
});

describe('the arc\'s R is its own radius', () => {
 it('at rest, R stands by its radius, not the x axis', async () => {
  const v = await openLesson('arc');
  await settle(v);
  const g = svgOf(v).querySelector('[data-arc-radius]')!, d = g.querySelector('path')!.getAttribute('d')!;
  const [x1, y1, x2, y2] = d.match(/^M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/)!.slice(1).map(Number);
  const r = box(v, g.querySelector('text')!), radius = {a: {x: x1, y: y1}, b: {x: x2, y: y2}}, axis = {a: {x: 64, y: y1}, b: {x: 656, y: y1}};
  expect(boxSegmentDistance(r, radius)).toBeLessThan(boxSegmentDistance(r, axis));
  expect(Math.hypot(x2 - x1, y2 - y1), 'a whole radius').toBeGreaterThan(40);
 }, 30000);
});

describe('v-arc\'s One piece draws r_i = R and θ', () => {
 it('both lettered', async () => {
  const v = await openLesson('v-arc');
  await hold(v, 2, .99);
  expect(texts(v).some(t => t.classList.contains('cd-ri') && t.textContent?.includes('= R') && shown(t))).toBe(true);
  expect(texts(v).some(t => t.classList.contains('cd-angle') && t.textContent === 'θ')).toBe(true);
 }, 30000);
});

describe('the sum\'s chain beside the net, where every piece pushes nearly the same way', () => {
 // The rod's and the ring's pieces go in as mirror pairs and draw no chain (see figure-pairs); the rod level with
 // its end, short and seen from far off, and the ramp still lay theirs beside the sum.
 for (const [id, params, view] of [['endpoint', {size: 1, distance: 6}, null], ['ramp', {size: 1, distance: 6}, null]] as const) it(id, async () => {
  const v = await openLesson(id, params);
  if (view) await turn(v, view);
  await hold(v, 4, .6);
  expect(svgOf(v).querySelector('.cd-sum-chain-ends'), 'laid beside, with its end ticks').toBeTruthy();
  const label = [...svgOf(v).querySelectorAll('.cd-vector-label')].find(t => t.getAttribute('data-symbol') === 'Σ ΔE')!;
  const s = shaftOf(label.closest('.cd-vector')!), u = {x: s.b.x - s.a.x, y: s.b.y - s.a.y}, len = Math.hypot(u.x, u.y);
  const chain = svgOf(v).querySelector<SVGPathElement>('.cd-sum-chain:not(.cd-sum-chain-ends)')!.getAttribute('d')!;
  for (const [, x, y] of chain.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)) expect(Math.abs((Number(x) - s.a.x) * u.y - (Number(y) - s.a.y) * u.x) / len).toBeGreaterThanOrEqual(8);
 }, 30000);
});

describe('at rest, with the parts drawn, the part that survives is not covered by the sum', () => {
 it('?p=bisector&mode=project&components=1', async () => {
  const v = await openLesson('bisector', {}, '?p=bisector&mode=project&components=1');
  await settle(v);
  const parts = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-vector-label')];
  expect(parts.some(t => t.getAttribute('data-symbol') === 'ΔE_x' && shown(t))).toBe(true);
  expect(parts.some(t => t.getAttribute('data-symbol') === 'Σ ΔE')).toBe(false);
 }, 30000);
});

describe('the width the board brackets is bracketed on the figure', () => {
 // The sheet's board sends the reader to "the width Δs bracketed on the figure", and the disk's and the axis
 // lesson's footers write ΔQ in Δs and Δx: none of the three was drawn.
 for (const [w, h] of [[1280, 800], [390, 844]] as const) for (const [id, name, view] of [['sheet', 'Δs', null], ['sheet', 'Δs', '2D'], ['disk', 'Δs', null], ['v-disk', 'Δs', null], ['axial', 'Δx', null]] as const) it(`${id}${view ? ' flat' : ''} at ${w}`, async () => {
  await page.viewport(w, h);
  const v = await openLesson(id);
  if (view) await turn(v, view);
  await hold(v, 1, .99);
  const t = svgOf(v).querySelector<SVGTextElement>('[data-piece-length] text');
  expect(t?.textContent).toBe(name);
  expect(shown(t!)).toBe(true);
 }, 30000);
 it('the axis lesson\'s piece has its own x, from O on r_i\'s line', async () => {
  for (const id of ['axial', 'v-rod-axial']) {
   const v = await openLesson(id);
   await hold(v, 2, .99);
   const g = svgOf(v).querySelector('[data-piece-coordinate]');
   expect(g, id).toBeTruthy();
   expect(shown(g!.querySelector('text')!), id).toBe(true);
   cleanup(); window.history.replaceState(null, '', '/');
  }
 }, 30000);
});

describe('Δ and Σ are set upright, as the board sets them', () => {
 it('the footer and the arrows\' names', async () => {
  const v = await openLesson('bisector');
  await settle(v);
  const upright = (t: Element) => [...t.querySelectorAll('tspan[font-style="normal"]')].map(s => s.textContent);
  expect(upright(svgOf(v).querySelector('.cd-footer-math')!)).toContain('Δ');
  const sum = [...svgOf(v).querySelectorAll('.cd-vector-label')].find(t => t.getAttribute('data-symbol') === 'Σ ΔE')!;
  expect(upright(sum)).toEqual(['Σ', 'Δ']);
 }, 30000);
});
