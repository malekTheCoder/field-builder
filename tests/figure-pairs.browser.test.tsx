import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {intervalKey} from '../src/diagrams/subdivision';
import {sampleDistribution} from '../src/diagrams/sampling';
import {pairPlan, pairSum} from '../src/diagrams/pairs';
import {magnitude} from '../src/symbolic/physics';
/* THE SUM IN MIRROR PAIRS, AS THE RUN DRAWS IT.
 *
 * Laid tip to tail in the order the pieces sit, the arrows of the endless line made a great arch over the
 * axis -- the field its chord -- and the sideways parts cancelled only at the arch's far end, where nobody
 * saw it: "this doesn't show the cancelling nature and makes it look so weird." Where the charge has a mirror
 * about P's axis the run now adds a piece and its mirror together, and the sum is an arrow along the axis at
 * every moment. These hold it to that: no arch, the pair lit together, the arrow ending on the sum of the
 * pieces with each pair's share where the physics puts it, and the lessons with nothing to pair still
 * drawing their chain. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true,
  params: Object.keys(params).length ? {[id]: {...DEFAULT_PARAMS, ...params}} : {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const NAMES = ['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them'];
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
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
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
/** Where in Add them up's bar the pairs are `s` of the way in: the stage moves for four fifths of its time,
 * and the first stretch of that hands the run's piece over to the sum. */
const at = (s: number) => .8 * (.2675 + .7325 * s);
const P = (v: View) => { const c = v.container.querySelector<SVGCircleElement>('.cd-point')!; return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))}; };
/** The sum's arrow: where it starts and where it ends, as the figure drew it. */
function sumArrow(v: View) {
 const line = v.container.querySelector<SVGLineElement>('[data-sum-arrow] line');
 if (!line) return null;
 return {a: {x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1'))}, b: {x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2'))}};
}
const tickMarks = (d: string | null | undefined) => [...(d ?? '').matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)]
 .map(m => ({x: (Number(m[1]) + Number(m[3])) / 2, y: (Number(m[2]) + Number(m[4])) / 2}));
const ticks = (v: View) => tickMarks(v.container.querySelector('.cd-pair-ticks')?.getAttribute('d'));
/** The ticks on the ghost of the axis where the sum had been before the far pairs brought it back. */
const overshoot = (v: View) => tickMarks(v.container.querySelector('.cd-pair-overshoot-ticks')?.getAttribute('d'));
/** How far a point lies off the axis through P: the screen's vertical for the ring seen flat, its horizontal otherwise. */
const off = (id: string, p0: {x: number; y: number}, q: {x: number; y: number}) => id === 'ring' ? Math.abs(q.x - p0.x) : Math.abs(q.y - p0.y);
describe('the paired lessons add in mirror pairs: the sum is an arrow along the axis at every moment', () => {
 for (const id of ['bisector', 'infinite', 'arc', 'ring'] as const) for (const charge of [2, -2]) it(`${id}, charge ${charge}`, async () => {
  const v = await openLesson(id, {charge});
  if (id === 'ring') { fireEvent.click(v.getByRole('button', {name: '2D'})); await waitFor(() => expect(v.container.querySelector('.cd-in-space')).toBeNull(), {timeout: 5000}); }
  let sums = 0, steps = 0;
  for (const f of [.3, at(.1), at(.42), at(.5), at(.62), at(.8), at(.95), .97]) {
   await hold(v, 4, f);
   expect(v.container.querySelector('[data-sum-chain]'), `${f}: no chain`).toBeNull();
   const p0 = P(v), sum = sumArrow(v);
   if (sum && Math.hypot(sum.b.x - sum.a.x, sum.b.y - sum.a.y) > .5) {
    sums++;
    expect(off(id, p0, sum.a), `${f}: the sum starts at P`).toBeLessThan(1);
    expect(off(id, p0, sum.b), `${f}: the sum ends on the axis`).toBeLessThan(1);
   }
   const step = v.container.querySelector<SVGGElement>('.cd-pair-step');
   if (step) {
    steps++;
    const [x, y] = step.dataset.pairFrom!.split(' ').map(Number);
    expect(off(id, p0, {x, y}), `${f}: the pair goes in at the tip of the sum, on the axis`).toBeLessThan(1);
   }
   for (const t of [...ticks(v), ...overshoot(v)]) expect(off(id, p0, t), `${f}: each pair's share ends on the axis`).toBeLessThan(1);
  }
  // Checked, not skipped: the sum was drawn at most of those moments, and a pair was going in at most.
  expect(sums).toBeGreaterThanOrEqual(5);
  expect(steps).toBeGreaterThanOrEqual(5);
 }, 60000);
});
describe('the pair going in is lit on the charge, both pieces together', () => {
 it('bisector: the middle piece goes in alone first, then its neighbours together, then the ends', async () => {
  const v = await openLesson('bisector');
  const lit = () => ({piece: v.container.querySelector<SVGGElement>('.cd-piece.is-selected')?.dataset.pieceKey, partner: v.container.querySelector<SVGGElement>('.cd-piece.is-partner')?.dataset.pieceKey});
  await hold(v, 4, at(.15));
  expect(lit()).toEqual({piece: intervalKey(2, 5), partner: undefined});
  await hold(v, 4, at(.45));
  expect(lit()).toEqual({piece: intervalKey(3, 5), partner: intervalKey(1, 5)});
  // The pieces already in are coloured in; the pair going in is lit, not coloured in.
  expect([...v.container.querySelectorAll<SVGGElement>('.cd-piece.is-added')].map(g => g.dataset.pieceKey)).toEqual([intervalKey(2, 5)]);
  // Both of the pair's arrows, and both parts across, drawn at the tip.
  expect(v.container.querySelectorAll('.cd-pair-step [data-pair-whole]').length).toBe(2);
  expect(v.container.querySelectorAll('.cd-pair-step [data-pair-across]').length).toBe(2);
  await hold(v, 4, at(.8));
  expect(lit()).toEqual({piece: intervalKey(4, 5), partner: intervalKey(0, 5)});
 }, 30000);
 it('a ring cut five ways: round in pairs from the run\'s piece, each with the length straight across, and last two half pieces', async () => {
  const v = await openLesson('ring');
  fireEvent.click(v.getByRole('button', {name: '2D'}));
  await waitFor(() => expect(v.container.querySelector('.cd-in-space')).toBeNull(), {timeout: 5000});
  await hold(v, 4, at(.15));
  expect(v.container.querySelector('.cd-piece.is-selected[data-piece-key]')).toBeTruthy();
  expect(v.container.querySelector('[data-mirror-arc]'), 'the length straight across').toBeTruthy();
  await hold(v, 4, at(.85));
  expect(v.container.querySelector('[data-half-piece="piece"]'), 'half a piece').toBeTruthy();
  expect(v.container.querySelector('[data-half-piece="partner"]'), 'and the half straight across').toBeTruthy();
  expect(v.container.querySelector('.cd-piece.is-selected[data-piece-key]'), 'no whole piece lit').toBeNull();
 }, 30000);
});
describe('the sum ends on the sum of the pieces, and each pair takes its own share', () => {
 for (const [id, params] of [['bisector', {}], ['infinite', {}], ['arc', {}], ['infinite', {slices: 8}], ['arc', {phi: 1.8 * Math.PI}]] as const) it(`${id} ${JSON.stringify(params)}`, async () => {
  const v = await openLesson(id, params);
  await hold(v, 4, .97);
  const end = sumArrow(v)!, marks = ticks(v), past = overshoot(v);
  // The first frame of Shrink them draws the sum of the pieces as the chain's lessons always have.
  await hold(v, 5, 0);
  const next = sumArrow(v)!;
  expect(Math.hypot(end.b.x - next.b.x, end.b.y - next.b.y), 'Add them up ends where the sum of the pieces is').toBeLessThan(1.5);
  // Each tick stands where the physics puts the end of its pair's share: the pairs' running sum over the whole.
  const p = {...DEFAULT_PARAMS, ...params}, samples = sampleDistribution(id, p, p.slices), plan = pairPlan(id, samples)!;
  const whole = pairSum(plan, plan.length).x, length = end.b.x - end.a.x;
  const want = plan.slice(0, -1).map((_, j) => pairSum(plan, j + 1).x / whole * length + end.a.x)
   .filter(x => Math.abs(x - end.b.x) >= 9);
  // On the arrow, and -- where the far pairs bring the sum back, the wide arc -- on the ghost of where it had been.
  for (const t of [...marks, ...past]) expect(Math.min(...want.map(x => Math.abs(x - t.x))), `tick at ${t.x.toFixed(1)}`).toBeLessThan(1.2);
  const s = Math.sign(end.b.x - end.a.x), reach = Math.abs(end.b.x - end.a.x);
  for (const t of marks) expect((t.x - end.a.x) * s, `a tick on the arrow, not on the bare axis past its head`).toBeLessThan(reach);
  for (const t of past) expect((t.x - end.a.x) * s, `a share the sum went past, past the arrow's head`).toBeGreaterThan(reach);
  expect(marks.length + past.length).toBeGreaterThan(0);
  expect(magnitude(samples[0].field)).toBeGreaterThan(0);
 }, 30000);
});
describe('the lessons with nothing to pair keep their chain', () => {
 for (const id of ['endpoint', 'axial', 'semi', 'ramp'] as const) it(id, async () => {
  const v = await openLesson(id);
  await hold(v, 4, at(.6));
  expect(v.container.querySelector('[data-sum-chain]'), 'the chain').toBeTruthy();
  expect(v.container.querySelector('.cd-pair-step'), 'no pair').toBeNull();
  expect(v.container.querySelector('.cd-pair-ticks'), 'no pair ticks').toBeNull();
 }, 30000);
 it('nor does a paired lesson summed over part of the charge, which has no mirror to pair with', () => {
  const problem = getProblem('infinite');
  const view = render(<ChargeDiagram problem={problem} params={DEFAULT_PARAMS} setParams={() => {}} count={5} continuum={0} selected={3} onSelect={() => {}}
   progress={.7} components={false} pair={false} mode="sum" boundRange={[0, 60]} build={{key: 'add', name: 'Add them up', index: 3, count: 5, piece: 3}} />);
  expect(view.container.querySelector('[data-sum-chain]')).toBeTruthy();
  expect(view.container.querySelector('.cd-pair-step')).toBeNull();
 });
});
describe('in space the scene draws the pair, from the tip of the sum', () => {
 it('ring: the pair\'s arrows start on the axis above P, the sum is no chain', async () => {
  const v = await openLesson('ring');
  await hold(v, 4, at(.55));
  const stage = v.container.querySelector<HTMLElement>('[data-run-stage]')!;
  expect(stage.dataset.runChain, 'no chain').toBeUndefined();
  expect(stage.dataset.runArrows).toMatch(/partner/);
  const [x, y, z] = stage.dataset.runArrowsFrom!.split(' ').map(Number);
  expect(Math.hypot(x, y)).toBeLessThan(1e-9);
  expect(z).toBeGreaterThan(0);
  expect(v.container.querySelector('.cd-pair-step'), 'the flat copy is not painted over the scene').toBeNull();
 }, 30000);
});
