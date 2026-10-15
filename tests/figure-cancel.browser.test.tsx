import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type and stylesheet: these read computed strokes and the boxes of letters.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE ANGLE AT P, WHAT CANCELS, AND THE SMALL MARKS THAT SAY WHAT THINGS ARE.
 *
 * The angle's letter used to leave its angle: on a phone it went outside on a leader through r_i, or
 * across the rod to the corner at O; on a desktop it stood mid-triangle, nearer the right angle than
 * its own arc. With P within twelve pixels of the rod, the arc marked 180° − α. In What cancels the r
 * bar dropped onto the mirror piece and stranded ΔE_y's name under it; the mirror's whole arrow was
 * dashed, the style kept for what cancels, and its surviving part was never drawn; the ghosts of the
 * parts that cancelled were too faint to see on the frame a reader stops on. The figure never marked a
 * piece's length Δy. The ramp's density labels were lit as limits of integration; its formula read
 * "λ°"; the gesture line promised a phone a scroll wheel and arrow keys; P was drawn as ⊙. */
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
const svgOf = (view: View) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
/** A box in the drawing's own units, from the screen. */
function box(view: View, el: Element) {
 const s = svgOf(view).getBoundingClientRect(), r = el.getBoundingClientRect(), k = 720 / s.width;
 return {x: (r.left - s.left) * k, y: (r.top - s.top) * k, width: r.width * k, height: r.height * k};
}
const P = (view: View) => { const c = view.container.querySelector<SVGCircleElement>('circle.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
/** The piece end of the line from the chosen piece to P. */
function pieceEnd(view: View) {
 const l = view.container.querySelector<SVGLineElement>('.cd-construction:not(.cd-pair)')!;
 return {x: Number(l.getAttribute('x1')), y: Number(l.getAttribute('y1'))};
}
const cross = (a: {x: number; y: number}, b: {x: number; y: number}) => a.x * b.y - a.y * b.x;
describe('the angle at P is lettered inside its own angle, beside its own arc', () => {
 for (const [w, h] of [[1440, 900], [390, 844]] as const) for (const id of ['bisector', 'endpoint', 'infinite']) for (const n of [2, 3]) it(`${id} at ${w}x${h}, stage ${n}`, async () => {
  await page.viewport(w, h);
  const view = await openLesson(id);
  await hold(view, n, .97);
  const letter = view.container.querySelector<SVGTextElement>('.cd-triangle .cd-angle')!;
  expect(letter.dataset.placerHidden).toBeUndefined();
  const b = box(view, letter), c = {x: b.x + b.width / 2, y: b.y + b.height * .62}, p = P(view), piece = pieceEnd(view);
  // The two sides: toward the charge, square to it, and along r_i to the piece.
  const toCharge = {x: -1, y: 0}, toPiece = {x: piece.x - p.x, y: piece.y - p.y}, at = {x: c.x - p.x, y: c.y - p.y};
  // Inside the wedge: on the same side of each side as the other side is.
  expect(Math.sign(cross(toCharge, at)), 'inside, past the side toward the charge').toBe(Math.sign(cross(toCharge, toPiece)));
  expect(Math.sign(cross(toPiece, at)), 'inside, short of r_i').toBe(Math.sign(cross(toPiece, toCharge)));
  // Beside its arc, not out at the far corner: nearer P than halfway along the side toward the charge.
  const arc = view.container.querySelector<SVGPathElement>('.cd-triangle .cd-angle-arc')!.getAttribute('d')!;
  const radius = Number(arc.match(/A([\d.]+)/)![1]);
  expect(Math.hypot(at.x, at.y) - radius, 'the letter stands just past its arc').toBeLessThan(1.1 * b.height);
  const rod = Number(view.container.querySelector<SVGTextElement>('.cd-origin')!.dataset.at!.split(' ')[0]);
  expect(Math.hypot(at.x, at.y), 'nearer P than the far corner').toBeLessThan(.6 * (p.x - rod));
 }, 30000);
 it('with P closer to the rod than the leg stands, the arc marks α itself, not 180° − α', async () => {
  const view = await openLesson('endpoint', {size: 8, distance: .5});
  await hold(view, 2, .97);
  const p = P(view), piece = pieceEnd(view);
  const d = view.container.querySelector<SVGPathElement>('.cd-triangle .cd-angle-arc')!.getAttribute('d')!;
  const [sx, sy] = d.match(/^M([-\d.]+) ([-\d.]+)/)!.slice(1).map(Number);
  const [ex, ey] = d.match(/ ([-\d.]+) ([-\d.]+)$/)!.slice(1).map(Number);
  const angle = (u: {x: number; y: number}, v: {x: number; y: number}) => Math.acos((u.x * v.x + u.y * v.y) / Math.hypot(u.x, u.y) / Math.hypot(v.x, v.y)) * 180 / Math.PI;
  const toPiece = {x: piece.x - p.x, y: piece.y - p.y}, alpha = angle({x: -1, y: 0}, toPiece);
  // The arc starts on the side toward the rod and ends on r_i: its two ends span α.
  expect(angle({x: sx - p.x, y: sy - p.y}, {x: -1, y: 0})).toBeLessThan(2);
  expect(angle({x: ex - p.x, y: ey - p.y}, toPiece)).toBeLessThan(2);
  expect(Math.abs(angle({x: sx - p.x, y: sy - p.y}, {x: ex - p.x, y: ey - p.y}) - alpha)).toBeLessThan(2);
 }, 30000);
});
describe('What cancels, held at its end', () => {
 it('names the leg r instead of dropping the bar onto the mirror piece', async () => {
  const view = await openLesson('bisector');
  await hold(view, 3, .97);
  expect(view.container.querySelector('.cd-dimension[data-dim="distance"]'), 'no separate r bar').toBeNull();
  const r = [...view.container.querySelectorAll<SVGTextElement>('.cd-triangle text')].find(t => t.textContent === 'r')!;
  expect(r, 'the leg is lettered r').toBeTruthy();
  expect(r.dataset.placerHidden).toBeUndefined();
  // Beside the leg from the rod to P: between the rod and P, and near the axis P is on.
  const b = box(view, r), p = P(view);
  expect(b.x + b.width).toBeLessThan(p.x);
  expect(Math.abs(b.y + b.height / 2 - p.y)).toBeLessThan(2.2 * b.height);
  // And the bar is back in the next stage.
  await hold(view, 4, .5);
  expect(view.container.querySelector('.cd-dimension[data-dim="distance"]')).toBeTruthy();
 }, 30000);
 it('draws the mirror\'s arrow solid, the ghosts at a strength that can be seen, and the mirror\'s surviving part on the end of the piece\'s', async () => {
  const view = await openLesson('bisector');
  await hold(view, 3, .97);
  const partner = view.container.querySelector<SVGLineElement>('.cd-grow-pair > .cd-vector line')!;
  expect(getComputedStyle(partner).strokeDasharray === 'none' || !partner.getAttribute('stroke-dasharray')).toBe(true);
  // As painted: the strength is set on the group round the stroke.
  const painted = (el: Element) => { let o = 1; for (let e: Element | null = el; e && !(e instanceof SVGSVGElement); e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  for (const g of view.container.querySelectorAll('[data-cancel-ghost] .cd-vector line')) expect(painted(g)).toBeGreaterThanOrEqual(.4);
  const keep = [...view.container.querySelectorAll<SVGGElement>('.cd-vector')].find(g => g.querySelector('.cd-vector-label')?.getAttribute('data-symbol') === 'ΔE_x')!;
  const [, , kx, ky] = keep.dataset.shaft!.split(' ').map(Number);
  const more = view.container.querySelector<SVGGElement>('[data-partner-keep] .cd-vector')!;
  expect(more, 'the mirror\'s surviving part is drawn').toBeTruthy();
  const [mx1, my1, mx2] = more.dataset.shaft!.split(' ').map(Number);
  expect(Math.hypot(mx1 - kx, my1 - ky), 'tip to tail').toBeLessThan(1);
  expect(mx2 - mx1, 'as long as the piece\'s own, the same way').toBeCloseTo(kx - P(view).x, 0);
 }, 30000);
 it('draws the mirror\'s line to P in the charge\'s colour, not the field\'s', async () => {
  const view = await openLesson('bisector');
  await hold(view, 3, .97);
  const pair = getComputedStyle(view.container.querySelector('.cd-construction.cd-pair')!).stroke;
  const field = getComputedStyle(view.container.querySelector<SVGGElement>('.cd-grow-pair > .cd-vector')!).color;
  const own = getComputedStyle(view.container.querySelector('.cd-construction:not(.cd-pair)')!).stroke;
  expect(pair).not.toBe(field);
  // Redder than it is green, as the charge's colour is.
  const [r, g] = pair.match(/[\d.]+/g)!.map(Number);
  expect(r).toBeGreaterThan(g);
  expect(own).not.toBe(pair);
 }, 30000);
});
describe('the piece\'s own length is marked', () => {
 it('Δy beside the chosen piece in Cut it up and One piece, and gone in What cancels', async () => {
  const view = await openLesson('bisector');
  for (const [n, shown] of [[1, true], [2, true], [3, false]] as const) {
   await hold(view, n, .97);
   const mark = view.container.querySelector<SVGGElement>('[data-piece-length]');
   expect(!!mark, `stage ${n}`).toBe(shown);
   if (mark) {
    expect(mark.dataset.pieceLength).toBe('Δy');
    // On the side away from P.
    expect(box(view, mark).x + box(view, mark).width).toBeLessThan(P(view).x);
   }
  }
 }, 30000);
});
describe('the ramp', () => {
 it('keeps its density labels out of the limits\' colour, and draws its density in the limit', async () => {
  const view = await openLesson('ramp');
  await hold(view, 5, .99);
  expect(view.container.querySelector('.charge-diagram.cd-focus-bounds'), 'the stage is about the limits').toBeTruthy();
  const density = [...view.container.querySelectorAll<SVGTextElement>('.cd-density-end')];
  expect(density.length).toBe(2);
  const ink = getComputedStyle(view.container.querySelector('.cd-axes text')!).fill;
  for (const t of density) expect(getComputedStyle(t).fill).toBe(ink);
  const shade = view.container.querySelector<SVGPathElement>('.cd-ramp-density')!;
  expect(Number(getComputedStyle(shade).opacity)).toBeGreaterThan(.8);
 }, 30000);
 it('writes λ₀ in its footer with a real subscript, in the figure\'s serif', async () => {
  const view = await openLesson('ramp');
  const footer = view.container.querySelector<SVGTextElement>('.cd-footer-math')!;
  expect(footer.querySelector('.cd-sub')?.textContent).toBe('0');
  expect(footer.textContent).not.toContain('₀');
  expect(getComputedStyle(footer).fontStyle).toBe('italic');
 }, 20000);
});
describe('small marks', () => {
 it('P is a point, not ⊙, while the run plays', async () => {
  const view = await openLesson('bisector');
  await hold(view, 2, .5);
  expect(Number(getComputedStyle(view.container.querySelector('.cd-point-halo')!).strokeOpacity)).toBe(0);
 }, 20000);
 it('the limits\' handles are painted over the charge\'s marks', async () => {
  const view = await openLesson('axial');
  await hold(view, 5, .99);
  const plus = view.container.querySelector('.cd-plus')!, handle = view.container.querySelector('.cd-bound')!;
  expect(plus.compareDocumentPosition(handle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // And lit for the limits, a ring round the ground rather than a solid block.
  expect(view.container.querySelector('.charge-diagram.cd-focus-bounds')).toBeTruthy();
  const rect = getComputedStyle(handle.querySelector('rect')!);
  expect(rect.fill).not.toBe(rect.stroke);
 }, 20000);
 it('on a phone the 3D legend promises only the drag, at a readable size', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('ring');
  await settle(view);
  const more = view.container.querySelector('.cd-help-more')!;
  expect(getComputedStyle(more).display).toBe('none');
  const drag = view.container.querySelector('.cd-help-text')!;
  expect(drag.getBoundingClientRect().height).toBeGreaterThanOrEqual(10);
 }, 20000);
});
