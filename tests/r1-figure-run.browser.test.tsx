import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* "Watch it build", checked in the figure it draws: what each stage shows, measured off the page. */
afterEach(() => {
 cleanup();
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
function stage(view: View, n: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: ${NAMES[n - 1].replace('One piece', 'One (piece|ring)')}$`)}));
}
/** Drag the transport to `f` of the way through stage `i` (0-based) and let go: the run holds there. */
function scrub(view: View, i: number, f: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][i].getBoundingClientRect();
 const x = seg.left + f * seg.width;
 fireEvent.pointerDown(track, {clientX: x - 4, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
const length = (line: Element) => Math.hypot(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')), Number(line.getAttribute('y2')) - Number(line.getAttribute('y1')));
describe('"E = 0" only where the field is zero', () => {
 it('is not printed over the empty sum the adding stage starts from', async () => {
  // The field on the bisector is not zero; the sum of no pieces at all is, and that is not the field.
  const view = await openLesson('bisector');
  stage(view, 4);
  await waitFor(() => expect(view.container.querySelector('.cd-stage-add')).toBeTruthy());
  expect(view.container.querySelector('.cd-zero')).toBeNull();
 });
 it('is printed where the field really is zero: an arc closed into a ring, at its centre', async () => {
  const view = await openLesson('arc', {phi: 2 * Math.PI});
  await waitFor(() => expect(view.container.querySelector('.cd-zero')?.textContent).toBe('E = 0'));
 });
});
describe('what cancels, as something you can see', () => {
 it('draws both sideways parts as real arrows, named, and names the part that survives with its component', async () => {
  const view = await openLesson('bisector');
  stage(view, 3);
  await waitFor(() => expect(view.container.querySelectorAll('[data-cancel-transverse]').length).toBe(2));
  for (const part of view.container.querySelectorAll<SVGGElement>('[data-cancel-transverse]')) {
   const line = part.querySelector('.cd-vector line')!;
   expect(parseFloat(getComputedStyle(line).strokeWidth), part.dataset.cancelTransverse).toBeGreaterThanOrEqual(2);
   // Held whole at the stage's start: the reader sees them before they go.
   expect(length(line), part.dataset.cancelTransverse).toBeGreaterThanOrEqual(18);
   expect(part.querySelector('.cd-vector-label')?.getAttribute('data-symbol'), part.dataset.cancelTransverse).toMatch(/ΔE_y$/);
  }
  const names = [...view.container.querySelectorAll('[data-cancel-transverse] .cd-vector-label')].map(l => l.getAttribute('data-symbol'));
  expect(new Set(names)).toEqual(new Set(['ΔE_y', '−ΔE_y']));
  // The part that survives carries the component the derivation builds.
  expect(view.container.querySelector('.cd-grow-parts .cd-vector:not(.is-dashed) .cd-vector-label')?.getAttribute('data-symbol')).toBe('ΔE_x');
 });
 it('names each arrow beside itself, not past its tip where the part that survives also ends', async () => {
  const view = await openLesson('bisector');
  stage(view, 2);
  await waitFor(() => expect(view.container.querySelector('.cd-stage-one .cd-vector-label')).toBeTruthy());
  const vector = [...view.container.querySelectorAll<SVGGElement>('.cd-vector')].find(v => v.querySelector('.cd-vector-label')?.getAttribute('data-symbol') === 'ΔE')!;
  const line = vector.querySelector('line')!, label = vector.querySelector<SVGTextElement>('.cd-vector-label')!;
  const tip = {x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2'))};
  const middle = {x: (Number(line.getAttribute('x1')) + tip.x) / 2, y: (Number(line.getAttribute('y1')) + tip.y) / 2};
  const at = {x: Number(label.getAttribute('x')), y: Number(label.getAttribute('y'))};
  expect(Math.hypot(at.x - middle.x, at.y - middle.y)).toBeLessThan(Math.hypot(at.x - tip.x, at.y - tip.y));
 });
 it('draws a part that survives solid, wherever there is no mirror piece to cancel it', async () => {
  // Dashed means "cancels". On these three both parts survive, and the board says so.
  for (const id of ['endpoint', 'semi', 'ramp']) {
   const view = await openLesson(id);
   stage(view, 3);
   await waitFor(() => expect(view.container.querySelector('.cd-grow-parts'), id).toBeTruthy());
   expect(view.container.querySelectorAll('.cd-grow-parts .cd-vector.is-dashed').length, id).toBe(0);
   const named = [...view.container.querySelectorAll('.cd-grow-parts .cd-vector-label')].map(l => l.getAttribute('data-symbol'));
   expect(new Set(named), id).toEqual(new Set(['ΔE_x', 'ΔE_y']));
   cleanup();
   window.history.replaceState(null, '', '/');
  }
 }, 30000);
 it('and keeps the dashed style for the parts that do cancel', async () => {
  const view = await openLesson('bisector');
  stage(view, 3);
  await waitFor(() => expect(view.container.querySelector('[data-cancel-transverse]')).toBeTruthy());
  expect(view.container.querySelectorAll('.cd-grow-parts .cd-vector.is-dashed').length).toBe(0);
  expect(view.container.querySelectorAll('[data-cancel-transverse] .cd-vector.is-dashed').length).toBe(2);
 });
});
describe('the potential\'s pile, at a ring cut an odd number of ways', () => {
 it('lights the mirror as well: a run as tall as the chosen piece\'s own segment', async () => {
  // At five pieces no piece lies straight across, so the mirror is half of one and half of the next
  // -- adjacent in the column. "Both go on the pile" lit only one of them.
  const view = await openLesson('v-ring');
  stage(view, 3);
  await waitFor(() => expect(view.container.querySelectorAll('[data-stack-lit]').length).toBe(2));
  const lit = [...view.container.querySelectorAll('[data-stack-lit]')].map(r => Number(r.getAttribute('height')));
  expect(lit[0] / lit[1]).toBeCloseTo(1, 6);
  expect(view.container.querySelector('[data-stack-lit="mirror"]')).toBeTruthy();
 });
});
describe('shrinking the pieces is something the chain is seen to do', () => {
 it('keeps the chain through the limit, refining as the pieces multiply, its end on the field\'s tip', async () => {
  const view = await openLesson('bisector');
  stage(view, 5);
  await waitFor(() => expect(view.container.querySelector('.cd-stage-limit')).toBeTruthy());
  const at = () => Number(view.container.querySelector('[data-sum-chain]')?.getAttribute('data-sum-chain') ?? 0);
  await waitFor(() => expect(at()).toBeGreaterThan(1));
  const start = at();
  scrub(view, 4, .4);
  await waitFor(() => expect(at()).toBeGreaterThan(start));
  const chain = view.container.querySelector<SVGPathElement>('[data-sum-chain]')!;
  const points = [...(chain.getAttribute('d') ?? '').matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));
  const end = points[points.length - 1];
  const net = [...view.container.querySelectorAll<SVGGElement>('.cd-vector')].find(v => /Σ|^E$/.test(v.querySelector('.cd-vector-label')?.textContent ?? ''))!.querySelector('line')!;
  await waitFor(() => expect(Math.hypot(end.x - Number(net.getAttribute('x2')), end.y - Number(net.getAttribute('y2')))).toBeLessThan(2));
 });
});
describe('a new lesson opens its own way', () => {
 // The figure stays mounted from lesson to lesson, and its view used to carry over: the ring opened
 // at the rod's camera with "Reset view" already lit.
 const go = async (view: View, short: string, title: string) => {
  const entry = [...view.container.querySelectorAll<HTMLElement>('.exp-shape-button')].find(b => b.textContent === short)!;
  fireEvent.click(entry);
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(title));
 };
 it('opens the ring at the ring\'s own view, not the rod\'s', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await go(view, 'Ring of charge', getProblem('ring').title);
  await waitFor(() => expect((view.getByRole('button', {name: 'Reset view'}) as HTMLButtonElement).disabled).toBe(true));
 });
 it('and a zoom on one lesson does not follow the reader into the next', async () => {
  const view = await openLesson('ring');
  fireEvent.click(view.getByRole('button', {name: 'Zoom in'}));
  await waitFor(() => expect((view.getByRole('button', {name: 'Reset view'}) as HTMLButtonElement).disabled).toBe(false));
  await go(view, 'Disk of charge', getProblem('disk').title);
  await waitFor(() => expect((view.getByRole('button', {name: 'Reset view'}) as HTMLButtonElement).disabled).toBe(true));
 });
});
