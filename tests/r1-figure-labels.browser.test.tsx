import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {isReady} from '../src/problems/readiness';
/* Labels that stay on what they name: checked in every lesson, at rest and at the end of every
 * stage of the run, in the page the figure ships in. */
afterEach(() => {
 cleanup();
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
type Rect = {left: number; top: number; right: number; bottom: number};
const hit = (a: Rect, b: Rect) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
const inset = (r: DOMRect, d: number): Rect => ({left: r.left + d, top: r.top + d, right: r.right - d, bottom: r.bottom - d});
const square = (p: {x: number; y: number}, half: number): Rect => ({left: p.x - half, top: p.y - half, right: p.x + half, bottom: p.y + half});
/** A point in the figure's own coordinates, on the page. */
const toPage = (el: SVGGraphicsElement, x: number, y: number) => new DOMPoint(x, y).matrixTransform(el.getScreenCTM()!);
/** Points along the drawn charge: the rod, ring or arc outline itself, wherever it is drawn. */
function bodyPoints(view: View) {
 const body = view.container.querySelector<SVGGeometryElement>('[data-source-body]');
 // A disk or a sheet is an area, which labels may lie on. A rod turned into space is drawn by the
 // scene, and its flat outline is not where the scene puts it; a ring's outline turns with the plane.
 if (!body || body.classList.contains('cd-surface')) return [];
 if (view.container.querySelector('.cd-in-space.cd-wire-kind')) return [];
 const total = body.getTotalLength(), out: DOMPoint[] = [];
 for (let s = 0; s <= total; s += 4) { const q = body.getPointAtLength(s); out.push(toPage(body, q.x, q.y)); }
 return out;
}
function netPoints(view: View) {
 const net = [...view.container.querySelectorAll<SVGGElement>('.cd-vector')].find(v => /Σ|^E$/.test(v.querySelector('.cd-vector-label')?.textContent ?? ''));
 const line = net?.querySelector('line');
 if (!line || net!.getAttribute('opacity') === '0') return [];
 const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(k => Number(line.getAttribute(k)));
 const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
 return Array.from({length: n + 1}, (_, i) => toPage(line, x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n));
}
/** Every rule the placer is meant to keep, in the figure as it stands. */
function check(view: View, where: string): string[] {
 const bad: string[] = [];
 for (const t of view.container.querySelectorAll('.cd-plus text, .cd-cube-label'))
  if (t.getAttribute('transform')) bad.push(`${where}: "${t.textContent}" was moved off what it marks`);
 const tag = view.container.querySelector('.cd-source-tag');
 if (tag) {
  const line = tag.querySelector('line')!, text = tag.querySelector('text')!;
  if (text.style.opacity !== '0' && line.style.opacity !== '0') {
   const end = toPage(line, Number(line.getAttribute('x2')), Number(line.getAttribute('y2')));
   const box = text.getBoundingClientRect(), dx = Math.max(box.left - end.x, 0, end.x - box.right), dy = Math.max(box.top - end.y, 0, end.y - box.bottom);
   if (Math.hypot(dx, dy) > 6) bad.push(`${where}: the leader stops ${Math.hypot(dx, dy).toFixed(0)}px short of "${text.textContent}"`);
  }
 }
 const marks = [...bodyPoints(view).map(q => square(q, 1.5)), ...netPoints(view).map(q => square(q, 1.5))];
 const labels = [...view.container.querySelectorAll<SVGTextElement>('.cd-svg text')].filter(t =>
  !t.closest('.cd-plus, .cd-cube, .cd-help') && !t.matches('.cd-footer, .cd-stage-label, [data-anchor="fixed"]')
  && t.style.opacity !== '0' && !t.closest('.is-hidden,[opacity="0"]') && t.textContent!.trim() !== '');
 for (const t of labels) {
  const box = inset(t.getBoundingClientRect(), 2);
  if (marks.some(m => hit(box, m))) bad.push(`${where}: "${t.textContent}" sits on the charge or the field's arrow`);
 }
 return bad;
}
describe('labels stay on what they name, and off what they would cover', () => {
 // Measured on settled frames: with reduced motion asked for, every morph and every arrow's glide
 // lands at once, so what is checked is the figure each state arrives at, not one caught mid-way.
 let real: typeof window.matchMedia, still: HTMLStyleElement;
 beforeEach(() => {
  real = window.matchMedia;
  window.matchMedia = ((q: string) => q.includes('prefers-reduced-motion')
   ? {matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} as unknown as MediaQueryList
   : real.call(window, q)) as typeof window.matchMedia;
  still = document.createElement('style');
  still.textContent = '*{animation:none!important;transition:none!important}';
  document.head.appendChild(still);
 });
 afterEach(() => { window.matchMedia = real; still.remove(); });
 it('in every lesson, at rest and at the end of every stage', async () => {
  const view = await openLesson('bisector');
  const bad: string[] = [];
  for (const lesson of PROBLEMS.filter(pr => isReady(pr.id))) {
   const entry = [...view.container.querySelectorAll<HTMLElement>('.exp-shape-button')].find(b => b.textContent === lesson.short)!;
   fireEvent.click(entry);
   await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(lesson.title));
   await new Promise(r => setTimeout(r, 60));
   bad.push(...check(view, `${lesson.id} at rest`));
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   const track = view.container.querySelector<HTMLElement>('.bp-track')!;
   for (let i = 0; i < 5; i++) {
    const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][i].getBoundingClientRect();
    const x = seg.left + .985 * seg.width;
    fireEvent.pointerDown(track, {clientX: x - 3, button: 0, pointerId: 9});
    fireEvent.pointerMove(track, {clientX: x, pointerId: 9});
    fireEvent.pointerUp(track, {clientX: x, pointerId: 9});
    await new Promise(r => setTimeout(r, 60));
    bad.push(...check(view, `${lesson.id} end of stage ${i + 1}`));
   }
   fireEvent.click(view.getByRole('button', {name: 'Close'}));
   await waitFor(() => expect(view.queryByRole('button', {name: /^Stage 1: /})).toBeNull());
  }
  expect(bad, bad.join('\n')).toEqual([]);
 }, 120000);
});
describe('P is named beside P', () => {
 // In every view of a ring or a disk "below P" is down the axis onto the plane, and P's letter used
 // to land inside the ring's back edge -- read as a point on the ring.
 for (const id of ['ring', 'disk', 'v-ring', 'v-disk']) {
  it(`${id}, in space: within reach of the dot and off the ring`, async () => {
   const view = await openLesson(id);
   await waitFor(() => expect(view.container.querySelector('.charge-diagram.cd-in-space')).toBeTruthy());
   const dot = view.container.querySelector<SVGCircleElement>('.cd-point')!;
   const p = toPage(dot, Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy')));
   const label = view.container.querySelector<SVGTextElement>('.cd-point-label')!.getBoundingClientRect();
   const gap = Math.hypot(Math.max(label.left - p.x, 0, p.x - label.right), Math.max(label.top - p.y, 0, p.y - label.bottom));
   expect(gap).toBeLessThanOrEqual(24);
   // The outline of the charge, 96 points round it, through the same projection the plane is drawn in.
   const outline = view.container.querySelector<SVGGeometryElement>('.cd-orbit-plane [data-source-body]')!;
   const total = outline.getTotalLength();
   for (let k = 0; k < 96; k++) {
    const q = outline.getPointAtLength(total * k / 96), at = new DOMPoint(q.x, q.y).matrixTransform(outline.getScreenCTM()!);
    expect(hit(inset(label, 1), square(at, .5)), `${id}: P's letter on the outline`).toBe(false);
   }
  });
 }
 it('semi: P\'s letter is clear of the axis P stands on', async () => {
  const view = await openLesson('semi');
  const label = view.container.querySelector<SVGTextElement>('.cd-point-label')!.getBoundingClientRect();
  const axis = view.container.querySelector<SVGPathElement>('.cd-axes path')!;
  const d = [...(axis.getAttribute('d') ?? '').matchAll(/-?[\d.]+/g)].map(m => Number(m[0]));
  // `M64 Oy H656 M Ox 365 V60`: the y axis is the vertical line at Ox.
  const x = toPage(axis, d[3], 0).x;
  expect(label.left > x || label.right < x, `P's letter spans the y axis at ${x.toFixed(0)}`).toBe(true);
 });
});
describe('the limits\' handles', () => {
 const toLimit = async (id: string) => {
  const view = await openLesson(id);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  await waitFor(() => expect(view.container.querySelector('.cd-bound')).toBeTruthy());
  return view;
 };
 it('on the rod seen along its axis, no handle is called "a" -- the gap to P already is', async () => {
  const view = await toLimit('axial');
  for (const t of view.container.querySelectorAll('.cd-bound text')) expect(t.textContent).not.toBe('a');
 });
 it('a whole ring\'s two limits are one point, so one handle, named for both', async () => {
  const view = await toLimit('ring');
  // They used to be two squares nudged thirteen pixels either side of the one point they both are,
  // each with its own letter, on top of each other.
  const handles = [...view.container.querySelectorAll<SVGGElement>('.cd-bound')];
  expect(handles).toHaveLength(1);
  expect(handles[0].querySelector('text')?.textContent).toBe('0 = 2π');
 });
 it('the sheet\'s limit off the page is an arrow at the edge, not a handle pinned in a corner', async () => {
  const view = await toLimit('sheet');
  for (const h of view.container.querySelectorAll<SVGGElement>('.cd-bound')) {
   const c = h.querySelector('circle')!, x = Number(c.getAttribute('cx')), y = Number(c.getAttribute('cy'));
   const corner = (x === 57 || x === 650) && (y === 66 || y === 358);
   expect(corner, `handle at ${x}, ${y}`).toBe(false);
  }
 });
});
describe('a piece of an unbounded line is an angle that ends at the line', () => {
 for (const id of ['semi', 'infinite']) {
  it(`${id}: no corner of the chosen wedge lies past the charge`, async () => {
   const view = await openLesson(id);
   const wedge = view.container.querySelector<SVGPolygonElement>('.cd-wedge.is-selected')!;
   expect(wedge).toBeTruthy();
   const points = (wedge.getAttribute('points') ?? '').trim().split(/\s+/).map(s => s.split(',').map(Number));
   const axis = [...(view.container.querySelector('.cd-axes path')!.getAttribute('d') ?? '').matchAll(/-?[\d.]+/g)].map(m => Number(m[0]));
   // `M64 Oy H656 M Ox 365 V60`. The semi-infinite line lies along y = Oy, below P; the infinite
   // line stands along x = Ox, left of P.
   for (const [x, y] of points) {
    if (id === 'semi') expect(y, `${x},${y}`).toBeLessThanOrEqual(axis[1] + .5);
    else expect(x, `${x},${y}`).toBeGreaterThanOrEqual(axis[3] - .5);
   }
  });
 }
});
