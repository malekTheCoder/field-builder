import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE FIGURE FIXER'S PAUSED WORK, AS CARRIED OVER. Each of these held on main as the opposite, or not at all:
 *
 * the ring's pairs, cut finely, arriving as a burst of arrowheads over P; ticks for the shares of a sum left on bare
 * axis past its head once the wide arc's far pairs brought it back; the ring's last two half pieces lit with no line
 * to the second; the endless line drawn at one scale for every r, so with P close in its triangle was a smudge on the
 * line; the fan's rays through every stage; Shrink them setting the integral up with dQ on the last sliver under the
 * limit's handle; the field laid inside the sum's own shaft; the stage clock written to the root
 * on every tick of every stage; the L bar jumping at three stage changes, +L/2 beside the piece Cut it up lights; a
 * piece's enlarged arrow at rest under a corner that said only "Cut into pieces"; field lines through the names; "P = O"
 * standing over the pair's junction; the limits unnamed in the stage the board names them in; one of the endless
 * line's two ends named on a phone. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}, search = '') {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
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
 await settle(view);
}
async function flat(view: View) {
 fireEvent.click(view.getByRole('button', {name: '2D'}));
 await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeNull(), {timeout: 5000});
}
/** Where in Add them up's bar the pairs are `s` of the way in (see tests/figure-pairs.browser.test.tsx). */
const at = (s: number) => .8 * (.2675 + .7325 * s);
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const P = (v: View) => { const c = v.container.querySelector<SVGCircleElement>('.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
const shaft = (g: Element) => { const [x1, y1, x2, y2] = (g as HTMLElement).dataset.shaft!.split(' ').map(Number); return {a: {x: x1, y: y1}, b: {x: x2, y: y2}, length: Math.hypot(x2 - x1, y2 - y1)}; };
const note = (v: View) => svgOf(v).querySelector('.cd-footer[data-dim="pieces"]')?.textContent;
const named = (v: View, name: string) => [...svgOf(v).querySelectorAll<SVGTextElement>('text')].find(t => t.textContent?.trim() === name);
/** A name's box where the placer left it: its own box, moved by the placer's nudge. */
const placed = (t: SVGTextElement) => { const b = t.getBBox(), m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(t.getAttribute('transform') ?? ''); return {x: b.x + Number(m?.[1] ?? 0), y: b.y + Number(m?.[2] ?? 0), width: b.width, height: b.height}; };
const shown = (t: SVGTextElement | undefined) => !!t && !t.dataset.placerHidden && t.style.opacity !== '0';

describe('the pairs going in are seen, and say so', () => {
 it('a ring cut twenty ways: each pair arrives a readable length, under the axis\' letter, and the corner says so all through its step', async () => {
  const v = await openLesson('ring', {slices: 20});
  await flat(v);
  const letter = svgOf(v).querySelector<SVGTextElement>('[data-axis="z"]')!.getBBox();
  for (const s of [.12, .15, .18, .21, .24, .27]) {
   await hold(v, 4, at(s));
   expect(note(v), `${s}: the corner`).toBe('This pair drawn larger');
   for (const g of svgOf(v).querySelectorAll('.cd-pair-step .cd-vector[data-shaft]')) expect(shaft(g).b.y, `${s}: a head clear under the z`).toBeGreaterThan(letter.y + letter.height);
  }
  await hold(v, 4, at(.13));
  const whole = svgOf(v).querySelector('[data-pair-whole="piece"] .cd-vector[data-shaft]')!;
  expect(shaft(whole).length, 'the piece\'s arrow, as it arrives').toBeGreaterThan(40);
 }, 60000);
 it('the ring\'s last two half pieces: a line from P to each', async () => {
  const v = await openLesson('ring');
  await flat(v);
  await hold(v, 4, at(.85));
  expect(svgOf(v).querySelector('[data-half-piece="partner"]')).toBeTruthy();
  expect(svgOf(v).querySelector('.cd-construction.cd-pair'), 'the line to the half straight across').toBeTruthy();
 }, 30000);
});
describe('a share the sum went past is a ghost, never a tick on bare axis', () => {
 it('the arc closed into a ring: no tick past an arrow of nothing, the ghost of where the sum went', async () => {
  const v = await openLesson('arc', {phi: 2 * Math.PI});
  await hold(v, 4, .97);
  expect(svgOf(v).querySelector('.cd-pair-ticks'), 'no ticks on the axis').toBeNull();
  const ghost = svgOf(v).querySelector<SVGGElement>('.cd-pair-overshoot');
  expect(ghost).toBeTruthy();
  expect(Number(ghost!.dataset.pairOvershoot)).toBeGreaterThan(0);
 }, 30000);
});
describe('the endless line in the run', () => {
 it('stands P well off the line however close it is, and keeps its scale at rest', async () => {
  const v = await openLesson('infinite', {distance: .5});
  const rod = () => { const b = svgOf(v).querySelector<SVGGraphicsElement>('[data-source-body]')!.getBBox(); return b.x + b.width / 2; };
  expect(P(v).x - rod(), 'at rest').toBeLessThan(30);
  await hold(v, 3, .98);
  expect(P(v).x - rod(), 'in the run').toBeGreaterThan(60);
 }, 30000);
 it('draws the fan\'s rays where they are the subject: all in Cut it up, the chosen wedge\'s in Add them up, none between', async () => {
  const v = await openLesson('infinite');
  const rays = () => [...svgOf(v).querySelectorAll('.cd-fan .cd-ray')];
  expect(rays().length, 'at rest').toBeGreaterThan(2);
  await hold(v, 1, .98);
  expect(rays().length, 'Cut it up').toBeGreaterThan(2);
  await hold(v, 3, .98);
  expect(rays().length, 'What cancels').toBe(0);
  await hold(v, 4, at(.5));
  expect(rays().length, 'Add them up').toBe(2);
  for (const r of rays()) expect(r.classList.contains('is-chosen')).toBe(true);
 }, 40000);
 it('names its ends where θ goes as the board sums, and on a phone both ∞ or neither', async () => {
  await page.viewport(390, 844);
  try {
   const v = await openLesson('infinite');
   for (const n of [4, 5]) {
    await hold(v, n, n === 4 ? at(.5) : .98);
    expect(shown(named(v, '+∞')), `stage ${n}: +∞ and −∞ go together`).toBe(shown(named(v, '−∞')));
   }
   await hold(v, 4, at(.5));
   for (const name of ['θ → π/2', 'θ → −π/2']) expect(shown(named(v, name)), name).toBe(true);
  } finally { await page.viewport(1440, 900); }
 }, 40000);
});
describe('the limits are named in the stage whose board names them', () => {
 it('ring, arc: in Add them up, with no handle', async () => {
  let v = await openLesson('ring');
  await flat(v);
  await hold(v, 4, at(.5));
  expect(svgOf(v).querySelector('[data-bound-name="closed"]')?.textContent).toBe('θ = 0, 2π');
  expect(svgOf(v).querySelector('.cd-bound:not(.cd-bound-name)'), 'no handle').toBeNull();
  cleanup();
  v = await openLesson('arc');
  await hold(v, 4, at(.5));
  expect([...svgOf(v).querySelectorAll('[data-bound-name]')].map(g => g.textContent).sort()).toEqual(['θ = −φ/2', 'θ = φ/2'].sort());
 }, 40000);
 it('the arc closed into a ring has one limit handle, named for both ends', async () => {
  const v = await openLesson('arc', {phi: 2 * Math.PI});
  await hold(v, 5, .98);
  const handles = [...svgOf(v).querySelectorAll<SVGGElement>('.cd-bound[data-bound]')];
  expect(handles.map(h => h.dataset.bound)).toEqual(['closed']);
  expect(handles[0].textContent).toBe('θ = ±φ/2');
 }, 30000);
});
describe('Shrink them sets the integral up on a general piece', () => {
 for (const id of ['bisector', 'endpoint'] as const) it(`${id}: dQ and dy well inside the rod, not on the last sliver under a limit's handle`, async () => {
  const v = await openLesson(id);
  await hold(v, 5, .98);
  const rod = svgOf(v).querySelector<SVGGraphicsElement>('.cd-source-rod')!.getBBox(), piece = svgOf(v).querySelector<SVGGraphicsElement>('.cd-piece.is-selected')!.getBBox();
  const up = (rod.y + rod.height - (piece.y + piece.height / 2)) / rod.height;
  expect(up, 'the piece dQ names, from the rod\'s foot').toBeGreaterThan(.1);
  expect(up).toBeLessThan(.9);
 }, 30000);
});
describe('the run holds its dimensions and its clock still', () => {
 it('bisector: the L bar stands in one place in every stage, and +L/2 stands past the rod\'s end', async () => {
  const v = await openLesson('bisector');
  const bar = () => { const d = svgOf(v).querySelector('.cd-dimension[data-dim="size"] path')!.getAttribute('d')!; return Number(/^M([-\d.]+)/.exec(d)![1]); };
  const xs: number[] = [];
  for (const n of [1, 2, 3, 4, 5]) { await hold(v, n, .98); xs.push(bar()); }
  expect(new Set(xs).size, xs.join(' ')).toBe(1);
  await hold(v, 1, .98);
  const rod = svgOf(v).querySelector<SVGGraphicsElement>('.cd-source-rod')!.getBBox(), top = named(v, '+L/2')!;
  expect(shown(top)).toBe(true);
  const b = placed(top);
  expect(b.y + b.height, '+L/2 above the rod\'s top, not beside its first piece').toBeLessThan(rod.y + 2);
 }, 60000);
 it('the stage clock is written only while the stage\'s own animation reads it', async () => {
  const v = await openLesson('bisector');
  const local = () => parseFloat(v.container.querySelector<HTMLElement>('.charge-diagram')!.style.getPropertyValue('--cd-local'));
  await hold(v, 2, .9);
  expect(local()).toBeLessThanOrEqual(1);
  await hold(v, 4, .6);
  expect(local()).toBe(0);
 }, 30000);
});
describe('at rest', () => {
 it('the field beside the sum, not inside its shaft', async () => {
  const v = await openLesson('axial', {slices: 3, distance: .5});
  const e = svgOf(v).querySelector('.cd-true-field .cd-vector[data-shaft]')!, p0 = P(v), s = shaft(e);
  expect(Math.abs(s.a.y - p0.y), 'laid off to the side').toBeGreaterThan(8);
  expect(Math.abs(s.a.y - s.b.y), 'parallel to the sum').toBeLessThan(.5);
  expect(svgOf(v).querySelector('.cd-true-field-ends')).toBeTruthy();
 }, 30000);
 it('a piece\'s enlarged arrow is said to be enlarged', async () => {
  const v = await openLesson('bisector', {}, '?p=bisector&mode=project');
  await waitFor(() => expect(note(v)).toBe('The piece’s arrow drawn larger'));
 }, 30000);
 it('names stand on a patch of the ground over the field lines, flat; none in space', async () => {
  let v = await openLesson('bisector');
  await settle(v);
  await waitFor(() => expect(svgOf(v).querySelectorAll('.cd-label-knock rect').length).toBeGreaterThanOrEqual(5));
  cleanup();
  v = await openLesson('ring');
  await settle(v);
  expect(svgOf(v).querySelector('.cd-label-knock')).toBeNull();
 }, 30000);
 it('α and φ in the board\'s face', async () => {
  const v = await openLesson('arc');
  expect(svgOf(v).querySelector('[data-dim="angle"] text tspan.cd-greek')?.textContent).toBe('φ');
 }, 30000);
});
describe('the arc\'s P while the pairs go in', () => {
 it('is P, by its dot, never over the pair\'s junction; and the radius steps back for the pair', async () => {
  const v = await openLesson('arc');
  await hold(v, 3, .98);
  expect(svgOf(v).querySelector('[data-arc-radius]'), 'What cancels').toBeNull();
  await hold(v, 4, at(.5));
  expect(svgOf(v).querySelector('[data-arc-radius]'), 'Add them up').toBeTruthy();
  const name = svgOf(v).querySelector<SVGTextElement>('text.cd-point-label')!, b = placed(name), p0 = P(v);
  const [jx, jy] = svgOf(v).querySelector<HTMLElement>('.cd-pair-step')!.dataset.pairFrom!.split(' ').map(Number);
  const c = {x: b.x + b.width / 2, y: b.y + b.height / 2};
  expect(name.textContent).toBe('P');
  expect(Math.hypot(c.x - p0.x, c.y - p0.y), 'nearer P than the junction').toBeLessThan(Math.hypot(c.x - jx, c.y - jy));
 }, 30000);
});
describe('the ramp\'s chosen piece', () => {
 it('keeps its density\'s shade, and the dense end is named', async () => {
  const v = await openLesson('ramp');
  await hold(v, 2, .98);
  const piece = svgOf(v).querySelector('.cd-piece.is-selected')!;
  expect(piece.classList.contains('is-density')).toBe(true);
  expect(Number(piece.querySelector('rect')!.getAttribute('fill-opacity'))).toBeLessThan(1);
  expect(shown(named(v, 'λ = λ0'))).toBe(true);
 }, 30000);
});
describe('the sheet\'s chosen ring', () => {
 it('is drawn in Cut it up, where the tag names it', async () => {
  const v = await openLesson('sheet');
  await hold(v, 1, .98);
  expect(svgOf(v).querySelector('.cd-orbit-plane .cd-piece.is-selected path')).toBeTruthy();
 }, 30000);
});
