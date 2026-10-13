import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';
import {field, magnitude} from '../src/symbolic/physics';
/* WITH THE SUM ON SCREEN, ITS SCALE HOLDS. The run's scale was fitted again to every new P: held on E, drawing P out
 * from three metres to six made the bisector's field three and a half times weaker and its arrow two fifths shorter,
 * and lifting P off the sheet -- whose one claim is that lifting it changes nothing -- shrank the sheet's field to four
 * fifths. Now the scale is fitted as the sum comes on screen and held while the run stays on it, so E follows E; where
 * the held scale takes it past the frame it stops inside the plot with a break across its shaft; and a new run fits
 * the scale again. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
async function hold(view: View, n: number, f: number) {
 if (!view.queryByRole('button', {name: /^Stage 1: /})) fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(await view.findByRole('button', {name: new RegExp(`^Stage ${n}: `)}));
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][n - 1], box = seg.getBoundingClientRect(), x = box.left + f * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(seg, {clientX: x});
 await new Promise(r => setTimeout(r, 250));
 await settle(view);
}
async function slide(view: View, name: string, key: 'Home' | 'End') {
 fireEvent.keyDown(view.getByRole('slider', {name}), {key});
 await new Promise(r => setTimeout(r, 300));
 await settle(view);
}
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const E = (v: View) => { const [x1, y1, x2, y2] = svgOf(v).querySelector<HTMLElement>('.cd-sum-arrow .cd-vector[data-shaft]')!.dataset.shaft!.split(' ').map(Number); return {length: Math.hypot(x2 - x1, y2 - y1), tip: {x: x2, y: y2}}; };
const fieldAt = (id: string, over: Partial<Params>) => magnitude(field(id as never, {...DEFAULT_PARAMS, ...over}));

describe('the sum\'s arrow follows the field while the run shows it', () => {
 it('the bisector: P drawn out, E shorter in proportion; drawn in past the frame, cut there and marked', async () => {
  const v = await openLesson('bisector');
  await hold(v, 5, .98);
  const near = E(v).length;
  await slide(v, 'Distance r', 'End');
  const far = E(v).length, ratio = fieldAt('bisector', {distance: 6}) / fieldAt('bisector', {distance: DEFAULT_PARAMS.distance});
  expect(far / near, 'drawn as the field').toBeCloseTo(ratio, 1);
  expect(svgOf(v).querySelector('[data-sum-cut]'), 'no cut on a shorter arrow').toBeNull();
  await slide(v, 'Distance r', 'Home');
  const cut = svgOf(v).querySelector('[data-sum-cut]');
  expect(cut, 'the field forty times stronger runs past the frame: cut, and marked').toBeTruthy();
  const tip = E(v).tip;
  expect(tip.x, 'its head inside the plot, clear of the x axis\' letter').toBeLessThanOrEqual(640);
  // Back on Add them up the scale is the same; a new run fits it again.
  await hold(v, 4, .98);
  expect(svgOf(v).querySelector('[data-sum-cut]'), 'held through Add them up').toBeTruthy();
  fireEvent.click(v.getByRole('button', {name: 'Close'}));
  await settle(v);
  await hold(v, 5, .98);
  expect(svgOf(v).querySelector('[data-sum-cut]'), 'a new run fits the scale to the field it shows').toBeNull();
 }, 60000);
 it('the sheet: P lifted, E unchanged', async () => {
  const v = await openLesson('sheet');
  await hold(v, 5, .98);
  const low = E(v).length;
  // Lifted to six metres P stands near the top of the plot, and the arrow may be cut at the frame: its whole length
  // is the drawn length over the share drawn.
  const whole = () => E(v).length / Number(svgOf(v).querySelector('[data-sum-cut]')?.getAttribute('data-sum-cut') ?? 1);
  await slide(v, 'Height z', 'End');
  expect(whole() / low, 'the same field, the same arrow').toBeCloseTo(1, 2);
  await slide(v, 'Height z', 'Home');
  expect(whole() / low).toBeCloseTo(1, 2);
 }, 60000);
});
