import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {sampleDistribution, sumSamples} from '../src/diagrams/sampling';
import {magnitude} from '../src/symbolic/physics';
/* THE RUN'S PIECE IS DRAWN AT ITS OWN SCALE, AND SAYS SO WHEN IT JOINS THE SUM.
 *
 * One piece's arrow used to be magnified by one factor for the whole lesson, set by its STRONGEST
 * piece. The run talks about an end piece, so on a long rod with P close in it came out a dot --
 * five pixels on the bisector, too short to carry a name, with parts a pixel long -- while on the
 * ring, at the defaults, the one piece was drawn longer than the whole sum it then joined. Now the
 * piece is drawn from its own field at a readable length in One piece and What cancels, and as Add
 * them up begins it is seen to shrink to its true length at the scale the chain is drawn at. */
beforeAll(async () => { await page.viewport(1440, 900); });
afterAll(async () => { await page.viewport(1280, 800); });
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
 fireEvent.click(view.getByRole('button', {name: `Stage ${n}: ${NAMES[n - 1]}`}));
}
/** Drag the transport to `f` of the way through stage `i` (0-based) and let go, as a browser does,
 * click and all: the run holds there. */
function scrub(view: View, i: number, f: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const segment = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][i], seg = segment.getBoundingClientRect();
 const x = seg.left + f * seg.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(segment, {clientX: x});
}
const length = (line: Element) => Math.hypot(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')), Number(line.getAttribute('y2')) - Number(line.getAttribute('y1')));
/** An arrow by the name it carries, and that name: present, and not hidden by the label placer. */
function named(view: View, symbol: string, within = '') {
 const label = [...view.container.querySelectorAll<SVGTextElement>(`${within} .cd-vector-label`)].find(t => t.getAttribute('data-symbol') === symbol);
 expect(label, `${symbol} is named`).toBeTruthy();
 expect(label!.dataset.placerHidden, `${symbol} is not hidden`).toBeUndefined();
 return label!.closest('.cd-vector')!.querySelector('line')!;
}
const points = (d: string) => [...d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));
describe('the run\'s piece has an arrow worth reading, however far off it is', () => {
 it('bisector, P half a metre from a rod eight long: One piece draws a named arrow, not a dot', async () => {
  const view = await openLesson('bisector', {distance: .5, size: 8});
  stage(view, 2);
  await waitFor(() => expect(length(named(view, 'ΔE', '.cd-grow'))).toBeGreaterThanOrEqual(60));
 });
 it('and What cancels draws it, and both parts that cancel, named', async () => {
  const view = await openLesson('bisector', {distance: .5, size: 8});
  stage(view, 3);
  await waitFor(() => expect(length(named(view, 'ΔE', '.cd-grow'))).toBeGreaterThanOrEqual(60));
  for (const s of ['ΔE_y', '−ΔE_y']) expect(length(named(view, s, '[data-cancel-transverse]')), s).toBeGreaterThanOrEqual(18);
 });
 it('disk, P half a metre over a disk eight wide: the ring\'s arrow along the axis is named', async () => {
  const view = await openLesson('disk', {distance: .5, size: 8});
  stage(view, 3);
  await waitFor(() => expect(length(named(view, 'ΔE_z', '.cd-grow'))).toBeGreaterThanOrEqual(40));
 });
});
describe('the sum is drawn to one scale, and the piece is seen to join it', () => {
 it('at the end of Add them up every link of the chain is to the sum as the field it stands for', async () => {
  const view = await openLesson('bisector');
  stage(view, 4);
  scrub(view, 3, .95);
  const samples = sampleDistribution('bisector', DEFAULT_PARAMS, 5), total = magnitude(sumSamples(samples));
  // Waited for as a whole: the sum's arrow glides to its new length over a few frames.
  await waitFor(() => {
   expect(view.container.querySelector('[data-sum-chain="6"]')).toBeTruthy();
   const chain = points(view.container.querySelector('.cd-sum-chain')!.getAttribute('d')!);
   const sum = length(named(view, 'Σ ΔE'));
   samples.forEach((s, i) => {
    const link = Math.hypot(chain[i + 1].x - chain[i].x, chain[i + 1].y - chain[i].y);
    expect(Math.abs(link / sum / (magnitude(s.field) / total) - 1), `link ${i}`).toBeLessThan(.05);
   });
  });
 }, 20000);
 it('fifteen percent into Add them up, the run\'s piece has shrunk to exactly its own link', async () => {
  const view = await openLesson('bisector');
  stage(view, 4);
  scrub(view, 3, .95);
  await waitFor(() => expect(view.container.querySelector('[data-sum-chain="6"]')).toBeTruthy());
  const chain = points(view.container.querySelector('.cd-sum-chain')!.getAttribute('d')!);
  // The run talks about the bisector's end piece, the last link of the chain.
  const own = Math.hypot(chain[5].x - chain[4].x, chain[5].y - chain[4].y);
  scrub(view, 3, .16);
  await waitFor(() => expect(view.container.querySelector('.cd-hand-over')).toBeTruthy());
  expect(Math.abs(length(view.container.querySelector('.cd-hand-over .cd-vector line')!) - own)).toBeLessThanOrEqual(2);
  // Where it began, it was the readable length the two stages before had drawn it at.
  scrub(view, 3, .005);
  await waitFor(() => expect(length(view.container.querySelector('.cd-hand-over .cd-vector line')!)).toBeGreaterThan(own * 1.5));
 }, 20000);
 it('never draws one piece longer than the sum beside it', async () => {
  const view = await openLesson('ring');
  stage(view, 4);
  for (const f of [.02, .1, .2, .3, .5, .9]) {
   scrub(view, 3, f);
   await new Promise(r => requestAnimationFrame(() => r(null)));
   const piece = view.container.querySelector('.cd-hand-over .cd-vector line');
   const sum = [...view.container.querySelectorAll('.cd-vector-label')].find(t => t.getAttribute('data-symbol') === 'Σ ΔE')?.closest('.cd-vector')?.querySelector('line');
   if (piece && sum) expect(length(piece), `at ${f}`).toBeLessThanOrEqual(length(sum) + .5);
  }
 }, 20000);
});
