import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type and stylesheet: these read painted strokes and the boxes of letters.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {intervalKey} from '../src/diagrams/subdivision';
import {boxSegmentDistance} from '../src/diagrams/labels';
/* THE RUN, AS A READER MEETS IT.
 *
 * The ghosts of the parts that cancel mount as the cancelling starts, and their strength was set in a
 * motion element's style, which motion reads once: played, they stayed at nothing for the whole stage.
 * The net was stopped short of the charge on the screen, not in space, so a ring's far rim behind P cut
 * an upward arrow to six pixels, and P close to a charge left nine. The semi-infinite line drew a P six
 * metres up in the plot's top corner. The mirror's survivor ran off the plot. The disk never lettered R.
 * The ramp's limits were hidden in the stage that sets them. The equal-angle lessons' footer named a
 * charge the board does not. Names stood across the rod from what they name, on their own arrows, and
 * on the footer's divider. The live region talked over the run. Each is measured here, in the Explorer. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(async () => { cleanup(); window.history.replaceState(null, '', '/'); await page.viewport(1440, 900); });
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
 // The turn to 2D is a 0.65 s glide, drawn slowly on a loaded machine: more than the default second.
 await waitFor(() => expect(view.container.querySelector('.cd-in-space') !== null).toBe(to === '3D'), {timeout: 5000});
 await new Promise(r => setTimeout(r, 1000));
 await settle(view);
}
const svgOf = (view: View) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
function box(view: View, el: Element) {
 const s = svgOf(view).getBoundingClientRect(), r = el.getBoundingClientRect(), k = 720 / s.width;
 return {x: (r.left - s.left) * k, y: (r.top - s.top) * k, width: r.width * k, height: r.height * k};
}
/** How strongly an element is painted: its own opacity times every group's round it. */
function painted(el: Element): number {
 let o = 1;
 for (let e: Element | null = el; e && !(e instanceof SVGSVGElement); e = e.parentElement) {
  const cs = getComputedStyle(e);
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  o *= Number(cs.opacity);
 }
 return o;
}
const P = (view: View) => { const c = view.container.querySelector<SVGCircleElement>('circle.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
const O = (view: View) => view.container.querySelector<SVGTextElement>('.cd-origin')!.dataset.at!.split(' ').map(Number);
const shown = (t: SVGTextElement) => !t.dataset.placerHidden && painted(t) > .3;
const texts = (view: View) => [...svgOf(view).querySelectorAll<SVGTextElement>('text')].filter(t => !t.closest('.cd-help') && t.textContent?.trim());
const named = (view: View, text: string) => texts(view).filter(t => t.textContent === text);
/** The net arrow -- Σ ΔE or E -- with its length, and whether its name is drawn. */
function net(view: View) {
 const label = [...view.container.querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => ['E', 'Σ ΔE'].includes(t.getAttribute('data-symbol') ?? ''));
 expect(label, 'the net arrow is named').toBeTruthy();
 const [x1, y1, x2, y2] = label!.closest<SVGGElement>('.cd-vector')!.dataset.shaft!.split(' ').map(Number);
 return {length: Math.hypot(x2 - x1, y2 - y1), shown: shown(label!), tip: {x: x2, y: y2}};
}
const PLOT = {x0: 42, y0: 54, x1: 668, y1: 371};
const inPlot = (q: {x: number; y: number}) => q.x >= PLOT.x0 - 1 && q.x <= PLOT.x1 + 1 && q.y >= PLOT.y0 - 1 && q.y <= PLOT.y1 + 1;

describe('the ghosts of the parts that cancel are seen however the stage is reached', () => {
 it('played into, from One piece by Next stage, and held at its end', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 2: One piece'}));
  await new Promise(r => setTimeout(r, 300));
  fireEvent.click(view.getByRole('button', {name: 'Next stage'}));
  await waitFor(() => expect(Number(view.container.querySelector<SVGGElement>('[data-cancel-ghost]')?.dataset.cancelGhost ?? 0)).toBeGreaterThan(.99), {timeout: 25000, interval: 100});
  await frames(3);
  const lines = [...view.container.querySelectorAll('[data-cancel-ghost] .cd-vector line')];
  expect(lines.length).toBe(2);
  for (const l of lines) expect(painted(l)).toBeGreaterThanOrEqual(.4);
 }, 45000);
 it('scrubbed half way and then to the end', async () => {
  const view = await openLesson('bisector');
  await hold(view, 3, .5);
  await hold(view, 3, .97);
  for (const l of view.container.querySelectorAll('[data-cancel-ghost] .cd-vector line')) expect(painted(l)).toBeGreaterThanOrEqual(.4);
 }, 30000);
 it('a net arrow drawn flat and then turned into space is not painted over the scene\'s', async () => {
  const view = await openLesson('bisector');
  await hold(view, 4, .99);
  await turn(view, '3D');
  const line = [...view.container.querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => t.getAttribute('data-symbol') === 'Σ ΔE')!.closest('.cd-vector')!.querySelector('line')!;
  expect(painted(line)).toBe(0);
 }, 30000);
});

describe('the net arrow is never stopped to a dot', () => {
 const cases: [string, string, Record<string, number>, '2D' | null][] = [
  ['ring, P a metre up, in space', 'ring', {distance: 1}, null],
  ['ring, P a metre and a third up, in space', 'ring', {distance: 1.3}, null],
  ['disk, negative, in space', 'disk', {charge: -2}, null],
  ['ring, wide and P low, flat', 'ring', {size: 8, distance: .5}, '2D'],
  ['bisector, negative, P close to a long rod', 'bisector', {charge: -5, distance: .5, size: 8}, null],
  ['endpoint, negative, P close to a long rod', 'endpoint', {charge: -5, distance: .5, size: 8}, null],
  ['infinite, negative, P close', 'infinite', {charge: -5, distance: .5}, null],
 ];
 for (const [name, id, params, view] of cases) it(name, async () => {
  const v = await openLesson(id, params);
  if (view) await turn(v, view);
  for (const n of [4, 5]) {
   await hold(v, n, .99);
   const arrow = net(v);
   expect(arrow.length, `stage ${n}`).toBeGreaterThanOrEqual(60);
   expect(arrow.shown, `stage ${n}: named`).toBe(true);
  }
 }, 45000);
 it('a ring\'s net at a metre is about as long as at two, not a sixth of it', async () => {
  const lengths: number[] = [];
  for (const distance of [1, 2]) {
   const v = await openLesson('ring', {distance});
   await hold(v, 4, .99);
   lengths.push(net(v).length);
   cleanup(); window.history.replaceState(null, '', '/');
  }
  expect(lengths[0] / lengths[1]).toBeGreaterThan(.75);
 }, 45000);
 it('the semi-infinite line with P six metres up: P in the plot\'s middle and a long net', async () => {
  const v = await openLesson('semi', {distance: 6});
  expect(P(v).y).toBeGreaterThanOrEqual(150);
  await hold(v, 4, .99);
  expect(net(v).length).toBeGreaterThanOrEqual(80);
  expect(net(v).shown).toBe(true);
 }, 30000);
});

describe('the mirror\'s surviving part stays in the plot and off the charge', () => {
 const cases: [string, string, Record<string, number>, '2D' | null][] = [
  ['bisector far from a short rod', 'bisector', {distance: 6, size: 1, slices: 30}, null],
  ['negative ring, flat', 'ring', {charge: -2}, '2D'],
  ['ring, flat', 'ring', {}, '2D'],
 ];
 for (const [w, h] of [[1440, 900], [390, 844]] as const) for (const [name, id, params, view] of cases) it(`${name}, at ${w}`, async () => {
  await page.viewport(w, h);
  const v = await openLesson(id, params);
  if (view) await turn(v, view);
  await hold(v, 3, .97);
  const keep = v.container.querySelector<SVGGElement>('[data-partner-keep] .cd-vector')!;
  expect(keep, 'the mirror\'s surviving part is drawn').toBeTruthy();
  const [, y1, x2, y2] = keep.dataset.shaft!.split(' ').map(Number);
  expect(inPlot({x: x2, y: y2}), `tip at ${x2.toFixed(0)},${y2.toFixed(0)}`).toBe(true);
  // A ring seen flat lies along the level of O: the survivor does not run down through it.
  if (id === 'ring') { const oy = O(v)[1]; expect(Math.max(y1, y2)).toBeLessThan(oy - 8); }
 }, 30000);
 it('in space, on the ring, where the view opens: drawn once, by the scene, on the tip of the piece\'s', async () => {
  const v = await openLesson('ring');
  await hold(v, 3, .97);
  await waitFor(() => expect(v.container.querySelector('[data-run-arrows]')?.getAttribute('data-run-arrows')).toContain('partner-keep'));
  const flat = v.container.querySelector<SVGGElement>('[data-partner-keep] .cd-vector')!;
  expect(painted(flat.querySelector('line')!), 'no flat copy over the scene\'s').toBe(0);
  // The flat one, unpainted, still says where the scene's stands, for the names to keep off: on the tip.
  const keep = [...v.container.querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => t.getAttribute('data-symbol') === 'ΔE_z')!.closest<SVGGElement>('.cd-vector')!;
  const [, , kx, ky] = keep.dataset.shaft!.split(' ').map(Number), [fx, fy] = flat.dataset.shaft!.split(' ').map(Number);
  expect(Math.hypot(fx - kx, fy - ky)).toBeLessThan(1);
 }, 30000);
});

describe('the limits are named in the stage that sets them', () => {
 for (const id of ['disk', 'v-disk']) for (const view of ['3D', '2D'] as const) it(`${id} in ${view}: R lettered, and both ends named in s`, async () => {
  const v = await openLesson(id);
  if (view === '2D') await turn(v, '2D');
  await hold(v, 5, .99);
  expect(named(v, 'R').some(shown), 'R is lettered').toBe(true);
  const bounds = [...v.container.querySelectorAll<SVGTextElement>('.cd-bound text')];
  expect(bounds.map(t => t.textContent).sort()).toEqual(['s = 0', 's = R']);
  for (const t of bounds) expect(shown(t), t.textContent!).toBe(true);
 }, 30000);
 for (const [w, h] of [[1440, 900], [390, 844]] as const) it(`ramp at ${w}: y = 0 and y = L beside their handles`, async () => {
  await page.viewport(w, h);
  const v = await openLesson('ramp');
  await hold(v, 5, .99);
  for (const name of ['y = 0', 'y = L']) {
   const t = named(v, name)[0];
   expect(t, name).toBeTruthy();
   expect(shown(t), name).toBe(true);
  }
 }, 30000);
 it('the arc\'s ends are values of θ', async () => {
  const v = await openLesson('arc');
  await hold(v, 5, .99);
  expect([...v.container.querySelectorAll('.cd-bound text')].map(t => t.textContent).sort()).toEqual(['θ = φ/2', 'θ = −φ/2']);
 }, 30000);
});

describe('the footer names the charge the board does', () => {
 // In the limit, in the variable the board integrates over: θ on the endless line, x and s on the others.
 for (const [id, want, limit] of [['infinite', 'ΔQ = λr sec²θ Δθ', 'dQ = λr sec²θ dθ'], ['semi', 'ΔQ = λr sec²α Δα', 'dQ = λ dx'], ['sheet', 'ΔQ = σ 2πs z sec²α Δα', 'dQ = σ 2πs ds']] as const) it(id, async () => {
  const v = await openLesson(id);
  await hold(v, 2, .5);
  const footer = v.container.querySelector<SVGTextElement>('.cd-footer-math')!;
  expect(footer.textContent).toBe(want);
  // The function's name upright among the italic symbols, its square with it.
  expect([...footer.querySelectorAll('tspan[font-style="normal"]')].map(t => t.textContent)).toContain('sec²');
  await hold(v, 5, .99);
  expect(footer.textContent).toBe(limit);
 }, 30000);
});

describe('names stay on the side of what they name', () => {
 for (const [w, h] of [[1440, 900], [390, 844]] as const) for (const id of ['bisector', 'endpoint', 'ramp']) it(`${id} at ${w}: Δy by its bracket, y by its leg`, async () => {
  await page.viewport(w, h);
  const v = await openLesson(id);
  const axis = O(v)[0];
  for (const n of [1, 2]) {
   await hold(v, n, .97);
   const dy = v.container.querySelector<SVGTextElement>('[data-piece-length] text')!;
   const b = box(v, dy);
   expect(b.x + b.width / 2, `stage ${n}: Δy left of the rod`).toBeLessThan(axis);
  }
  const leg = texts(v).find(t => t.textContent === 'y' && t.closest('.cd-triangle'));
  if (leg && shown(leg)) { const b = box(v, leg); expect(b.x + b.width / 2, 'y on the leg\'s side').toBeGreaterThan(axis); }
 }, 30000);
 for (const id of ['bisector', 'infinite', 'arc']) it(`${id} on a phone: ΔE_x is not written across an arrow`, async () => {
  await page.viewport(390, 844);
  const v = await openLesson(id);
  await hold(v, 3, .97);
  const label = [...v.container.querySelectorAll<SVGTextElement>('.cd-vector-label')].find(t => t.getAttribute('data-symbol') === 'ΔE_x')!;
  const b = box(v, label), inner = {x: b.x + 1.5, y: b.y + 1.5, x1: b.x + b.width - 1.5, y1: b.y + b.height - 1.5};
  for (const g of v.container.querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')) {
   if (painted(g.querySelector('line')!) < .05) continue;
   const [x1, y1, x2, y2] = g.dataset.shaft!.split(' ').map(Number);
   for (let k = 0; k <= 40; k++) {
    const x = x1 + (x2 - x1) * k / 40, y = y1 + (y2 - y1) * k / 40;
    expect(x > inner.x && x < inner.x1 && y > inner.y && y < inner.y1, `${g.querySelector('.cd-vector-label')?.getAttribute('data-symbol') ?? 'an arrow'} through ΔE_x`).toBe(false);
   }
  }
 }, 30000);
 for (const id of ['arc', 'bisector', 'infinite']) it(`${id} on a phone, What cancels: no name is set across a line of the construction`, async () => {
  await page.viewport(390, 844);
  const v = await openLesson(id);
  await hold(v, 3, .97);
  const lines = [...v.container.querySelectorAll<SVGLineElement>('.cd-construction')].map(l => ({a: {x: Number(l.getAttribute('x1')), y: Number(l.getAttribute('y1'))}, b: {x: Number(l.getAttribute('x2')), y: Number(l.getAttribute('y2'))}}));
  expect(lines.length).toBeGreaterThan(0);
  for (const t of texts(v)) {
   // The names the placer sets: an angle's letter is fitted inside its own angle, on its own terms.
   if (!shown(t) || t.dataset.anchor === 'fixed' || t.closest('.cd-plus, .cd-cube, .cd-axes') || t.classList.contains('cd-footer') || t.classList.contains('cd-stage-label')) continue;
   const b = box(v, t), inner = {x: b.x + 2, y: b.y + 2, width: b.width - 4, height: b.height - 4};
   for (const line of lines) expect(boxSegmentDistance(inner, line), `${t.textContent} across a construction line`).toBeGreaterThan(0);
  }
 }, 30000);
 for (const [id, view, n, f] of [['ring', '2D', 2, .97], ['disk', '2D', 4, .5], ['ring', null, 4, .5]] as const) it(`${id}${view ? ' flat' : ''} on a phone, stage ${n}: no scene name on the footer's divider`, async () => {
  await page.viewport(390, 844);
  const v = await openLesson(id);
  if (view) await turn(v, view);
  await hold(v, n, f);
  for (const t of texts(v)) {
   if (t.classList.contains('cd-footer') || !shown(t)) continue;
   const b = box(v, t);
   expect(b.y + b.height / 2, t.textContent!).toBeLessThan(371);
  }
 }, 30000);
 for (const id of ['arc', 'ring']) it(`${id} on a phone: the vertical axis' letter keeps clear of the stage's name`, async () => {
  await page.viewport(390, 844);
  const v = await openLesson(id);
  await hold(v, 2, .97);
  const stage = box(v, v.container.querySelector('.cd-stage-label')!);
  const letter = texts(v).filter(t => t.closest('.cd-axes') && ['y', 'z'].includes(t.textContent!)).map(t => box(v, t)).sort((a, b) => a.y - b.y)[0];
  expect(letter.y - (stage.y + stage.height)).toBeGreaterThanOrEqual(4);
 }, 30000);
});

describe('the run\'s sum starts from the first piece', () => {
 it('no link while the run\'s piece is handed over, and then the first piece lit', async () => {
  const v = await openLesson('bisector');
  await hold(v, 4, .1);
  expect(v.container.querySelector('[data-hand-over]'), 'handing over').toBeTruthy();
  expect(v.container.querySelector('[data-sum-chain]'), 'no chain yet').toBeNull();
  await hold(v, 4, .24);
  // The rod's pieces go in as mirror pairs from the middle out, and the middle piece, on P's axis, first.
  expect(v.container.querySelector('.cd-piece.is-selected')?.getAttribute('data-piece-key')).toBe(intervalKey(2, 5));
 }, 30000);
});

describe('the rods\' triangle is drawn to its piece', () => {
 for (const [id, params] of [['endpoint', {distance: 1.5, size: 6, slices: 4}], ['bisector', {distance: 1.5, size: 8}], ['endpoint', {}]] as const) it(`${id} ${JSON.stringify(params)}`, async () => {
  const v = await openLesson(id, params);
  await hold(v, 2, .97);
  expect(v.container.querySelector('.cd-angle-leader'), 'the angle\'s letter stands inside it').toBeNull();
  const piece = v.container.querySelector<SVGGElement>('.cd-piece.is-selected')!, pb = box(v, piece);
  // The triangle closes: r_i ends where the dashed leg does, and the leg's extension line runs on from there to
  // the piece's own level and across to it. r_i used to start on the piece and meet the leg short of its end.
  const line = v.container.querySelector<SVGLineElement>('.cd-construction[data-ri]')!;
  const end = {x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1'))};
  const leg = v.container.querySelector<SVGPathElement>('.cd-triangle path[data-leg]')!.getAttribute('d')!;
  const [lx, ly] = leg.match(/^M([-\d.]+) ([-\d.]+)/)!.slice(1).map(Number);
  expect(Math.hypot(lx - end.x, ly - end.y), 'r_i ends on the dashed leg\'s end').toBeLessThanOrEqual(1);
  const ext = v.container.querySelector<SVGPathElement>('.cd-triangle path[data-leg-extension]')!.getAttribute('d')!;
  const points = [...ext.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));
  expect(Math.hypot(points[0].x - end.x, points[0].y - end.y), 'the extension starts where r_i meets the leg').toBeLessThanOrEqual(1);
  expect(Math.abs(points[1].y - (pb.y + pb.height / 2)), 'the extension reaches the piece\'s level').toBeLessThanOrEqual(2);
  expect(points[2].x, 'and across to the rod').toBeLessThanOrEqual(pb.x + pb.width + 1);
  // r_i still points at its piece: the piece's middle lies on its line.
  const P0 = P(v), mid = {x: pb.x + pb.width / 2, y: pb.y + pb.height / 2}, d = {x: P0.x - end.x, y: P0.y - end.y};
  expect(Math.abs((mid.x - end.x) * d.y - (mid.y - end.y) * d.x) / Math.hypot(d.x, d.y), 'r_i\'s line runs through its piece').toBeLessThanOrEqual(2);
 }, 30000);
});

describe('the ramp\'s pieces carry their charge', () => {
 it('every piece keeps a + on a phone, and the density is drawn from the start', async () => {
  await page.viewport(390, 844);
  const v = await openLesson('ramp');
  await hold(v, 1, .97);
  const marks = [...v.container.querySelectorAll('.cd-plus text')].map(t => box(v, t)).map(b => b.y + b.height / 2);
  for (const piece of v.container.querySelectorAll('.cd-piece')) {
   const b = box(v, piece);
   expect(marks.some(y => y > b.y && y < b.y + b.height), `piece ${piece.getAttribute('data-piece-key')}`).toBe(true);
  }
  expect(painted(v.container.querySelector('.cd-ramp-density')!)).toBeGreaterThan(.5);
 }, 30000);
});

describe('the live region leaves the run to the page', () => {
 it('says nothing of the sum\'s progress while Add them up plays', async () => {
  const v = await openLesson('bisector');
  await hold(v, 4, .3);
  await new Promise(r => setTimeout(r, 700));
  const live = v.container.querySelector('.cd-announcement')!;
  const before = live.textContent;
  await hold(v, 4, .8);
  await new Promise(r => setTimeout(r, 700));
  expect(live.textContent).toBe(before);
  expect(live.textContent ?? '').not.toMatch(/percent of the interval/);
 }, 30000);
});

describe('the wheel', () => {
 it('is the page\'s once the figure is as small as it zooms', async () => {
  const v = await openLesson('bisector');
  const svg = svgOf(v);
  const out = v.getByRole('button', {name: 'Zoom out'}) as HTMLButtonElement;
  for (let k = 0; k < 12 && !out.disabled; k++) fireEvent.click(out);
  expect(out.disabled).toBe(true);
  expect(fireEvent.wheel(svg, {deltaY: 240}), 'a scroll down passes to the page').toBe(true);
  expect(fireEvent.wheel(svg, {deltaY: -240}), 'a scroll up still zooms').toBe(false);
 }, 20000);
});
