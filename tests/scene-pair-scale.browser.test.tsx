import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE RING'S PAIRS IN SPACE, AT ONE READABLE SCALE.
 *
 * The ring opens in 3D, and in its Add them up each mirror pair arrives at the tip of the sum drawn larger than the sum's
 * scale. The enlargement was each pair's own, read off its arrow in the view of the moment and capped by the room left
 * above its tip: the second pair's arrows were about thirty units on the screen and the last pair's fifteen, a burst of
 * arrowheads, and two pieces of exactly the same size were drawn at different sizes. Now one enlargement, fitted once
 * in the opening view, serves every pair. These read the scene's own plan and what it measured on the screen. */
beforeAll(async () => { await page.viewport(1280, 800); });
afterAll(async () => { await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openRing() {
 await new Promise(r => setTimeout(r, 280));
 window.history.replaceState(null, '', '/');
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'ring', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {ring: {...DEFAULT_PARAMS}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
 await waitFor(() => expect(view.container.querySelector('.cd-in-space'), 'the ring opens in 3D').toBeTruthy());
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(await view.findByRole('button', {name: 'Stage 4: Add them up'}));
 return view;
}
type View = Awaited<ReturnType<typeof openRing>>;
/** Hold Add them up with pair `k` of three `u` of the way through its step (see tests/figure-pairs.browser.test.tsx). */
async function hold(view: View, k: number, u: number) {
 const f = .8 * (.2675 + .7325 * (k + u) / 3);
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[3].getBoundingClientRect(), x = r.left + f * r.width;
 fireEvent.pointerDown(track, {clientX: x - 16, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 const stage = () => view.container.querySelector<HTMLElement>('.cd-field-stage')!;
 await waitFor(() => expect(stage().dataset.runPairShown, `pair ${k}`).toBeTruthy());
 await new Promise(r => setTimeout(r, 120));
 const s = stage().dataset;
 const keep = /piece ([-\d.e]+) ([-\d.e]+)/.exec(s.runKeepSpan ?? '')!;
 return {shown: s.runPairShown!.split(' ').map(Number), keep: Number(keep[2]) - Number(keep[1])};
}
/** Each test mounts the whole Explorer with its 3D scene and holds the run three or four times. */
const HEAVY = 60000;
describe('the ring\'s mirror pairs in space', () => {
 it('every pair is drawn readable, at one enlargement for all of them', async () => {
  const view = await openRing();
  const pairs = [];
  for (const k of [0, 1, 2]) pairs.push(await hold(view, k, .3));
  // The five pieces' pairs: two whole pieces with their lengths straight across, then the two half pieces left.
  for (const k of [0, 1]) expect(Math.min(...pairs[k].shown), `pair ${k}: its shorter whole arrow on the screen`).toBeGreaterThan(40);
  expect(Math.min(...pairs[2].shown), 'the half pieces: half a piece\'s arrow').toBeGreaterThan(20);
  // Every piece of a ring makes the same part along its axis, so at one enlargement the parts are the same length,
  // and a half piece's exactly half.
  expect(pairs[1].keep / pairs[0].keep).toBeCloseTo(1, 3);
  expect(pairs[2].keep / pairs[0].keep).toBeCloseTo(.5, 3);
 }, HEAVY);
 it('turning the view does not resize the pair', async () => {
  const view = await openRing();
  const before = await hold(view, 1, .3);
  const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
  fireEvent.keyDown(svg, {key: 'ArrowLeft'});
  fireEvent.keyDown(svg, {key: 'ArrowUp'});
  await new Promise(r => setTimeout(r, 900));
  const after = await hold(view, 1, .3);
  expect(after.keep / before.keep).toBeCloseTo(1, 6);
 }, HEAVY);
});
