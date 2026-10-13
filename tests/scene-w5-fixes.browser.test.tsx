import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {boxGap, controlBox} from '../src/diagrams/fieldlines';
/* THE SCENE IN THE EXPLORER AS IT SHIPS, WAVE 5.
 *
 * On the ring cut thirty ways a mirror pair's parts along the axis hung detached past the sum's arrowhead while the sum
 * took them in. On the arc past half a turn a pair that takes away from the sum was laid inside the sum's own shaft.
 * The endless lines' + marks ran under the view cube's buttons, and the cube's front face read "F". The sheet's newest
 * ring kept two dark crescents of wall over a light wash, and P's gap whitened the disk seen from above. Each of these
 * fails on the code before this change. */
afterEach(async () => {
 cleanup();
 // A URL left behind by one test beats the storage the next one writes; see build-ui's note.
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 // The Explorer saves on a 220ms debounce, and the previous test's pending save must not land on top of this one.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Each mounts the whole Explorer with its 3D scene: a second or two here, about 6.5 times that on the build machine. */
const HEAVY = 120000;
const stage = (view: View) => view.container.querySelector<HTMLElement>('.cd-field-stage');
const svg = (view: View) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
const frames = (n = 4) => new Promise<void>(r => {let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);});
async function inSpace(view: View) {
 if (!view.container.querySelector('.cd-in-space')) {
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
 }
 await waitFor(() => expect(stage(view)?.dataset.sceneP).toBeTruthy(), {timeout: 20000});
}
async function openRun(view: View) {
 await inSpace(view);
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('pieces'));
 fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
}
function scrub(view: View, n: number, fraction: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[n].getBoundingClientRect(), x = r.left + fraction * r.width;
 fireEvent.pointerDown(track, {clientX: x + (fraction > .5 ? -16 : 16), button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}

describe('a mirror pair drawn larger goes into the sum at the sum\'s own head', () => {
 it('ring cut thirty ways: what is left of the pair starts where the sum\'s arrow ends, every frame of the merge', async () => {
  const view = await openLesson('ring', {slices: 30});
  await openRun(view);
  let merging = 0;
  for (let f = .4; f <= .8; f += .02) {
   scrub(view, 3, f);
   await frames(2);
   const s = stage(view)!.dataset, taken = Number(s.runTaken);
   if (!(taken > .02 && taken < .98)) continue;
   const starts = (s.runKeepSpan ?? '').split(';').filter(Boolean).map(t => Number(t.split(' ')[1]));
   if (!starts.length) continue;
   merging++;
   // Along z, from P: the sum's arrow reaches |net|.
   const net = Math.hypot(...(s.sceneNet ?? '0 0 0').split(' ').map(Number));
   expect(Math.min(...starts), `at ${f.toFixed(2)}: the pair hangs off the sum's head`).toBeCloseTo(net, 3);
  }
  expect(merging, 'frames caught mid-merge').toBeGreaterThan(2);
 }, HEAVY);
 it('arc past half a turn: a pair that takes away from the sum is laid beside it, not in its shaft', async () => {
  const view = await openLesson('arc', {phi: 1.8 * Math.PI, charge: -2, slices: 9});
  await openRun(view);
  let beside = 0;
  for (let f = .7; f <= .8; f += .01) {
   scrub(view, 3, f);
   await frames(2);
   const s = stage(view)!.dataset, aside = Number(s.runKeepAside ?? 0);
   if (aside > 0) { beside++; expect(aside, `at ${f.toFixed(2)}`).toBeGreaterThanOrEqual(6); expect(aside).toBeLessThanOrEqual(10); }
  }
  expect(beside, 'frames with the backward pair laid beside the sum').toBeGreaterThan(0);
 }, HEAVY);
});

describe('the view cube is a control, not part of the figure', () => {
 for (const [w, h] of [[1280, 800], [390, 844]] as const) it(`at ${w} wide the endless lines' + marks keep out of it`, async () => {
  await page.viewport(w, h);
  for (const id of ['infinite', 'semi']) {
   const view = await openLesson(id);
   await inSpace(view);
   await frames(20);
   const cube = controlBox(svg(view), 8)!;
   expect(cube, 'a cube in space').toBeTruthy();
   const marks = (stage(view)!.dataset.signScreen ?? '').split(' ').filter(Boolean).map(m => m.split(',').map(Number));
   expect(marks.length).toBeGreaterThan(3);
   for (const [x, y] of marks) expect(boxGap({x, y}, [cube]), `${id}: a mark at ${x}, ${y}`).toBeGreaterThan(0);
   cleanup();
   window.history.replaceState(null, '', '/');
  }
 }, HEAVY);
 for (const [w, h] of [[1366, 768], [1093, 614], [911, 512]] as const) it(`at ${w} wide no face is named by a bare letter, and no name runs past its face`, async () => {
  await page.viewport(w, h);
  const view = await openLesson('ring');
  await inSpace(view);
  const labels = [...svg(view).querySelectorAll<SVGTextElement>('.cd-cube-label')];
  expect(labels.length).toBeGreaterThan(0);
  for (const t of labels) {
   expect(t.textContent!.length, `"${t.textContent}"`).toBeGreaterThan(1);
   const face = t.closest('.cd-cube')!.querySelector(`.cd-cube-side[data-face="${t.textContent!.toLowerCase()}"] .cd-cube-outline`)!.getBoundingClientRect();
   const r = t.getBoundingClientRect();
   expect(r.left, `${t.textContent}'s left`).toBeGreaterThanOrEqual(face.left);
   expect(r.right, `${t.textContent}'s right`).toBeLessThanOrEqual(face.right);
  }
 }, HEAVY);
});

describe('the surfaces', () => {
 it('the sheet\'s newest ring in Add them up: no wall drawn stronger than its face', async () => {
  const view = await openLesson('sheet');
  await openRun(view);
  for (const f of [.3, .6, .9]) {
   scrub(view, 3, f);
   await frames(3);
   const ink = stage(view)!.dataset.sceneWasherInk;
   if (!ink) continue;
   const [face, wall] = ink.split(' ').map(Number);
   if (face < .5) expect(wall, `at ${f}: a wash ring's wall`).toBeLessThanOrEqual(face + 1e-4);
  }
  expect(stage(view)!.dataset.sceneWasherInk, 'the ring\'s ink is reported').toBeTruthy();
 }, HEAVY);
 it('the disk seen from above keeps its gap round P to about P\'s halo', async () => {
  const view = await openLesson('disk');
  await inSpace(view);
  expect(Number(stage(view)!.dataset.gapShrink)).toBe(1);
  const s = svg(view);
  fireEvent.pointerDown(s, {clientX: 60, clientY: 60, pointerId: 1});
  fireEvent.pointerUp(s, {pointerId: 1});
  s.focus();
  for (let i = 0; i < 8; i++) await userEvent.keyboard('{ArrowUp}');
  await frames(40);
  expect(Number(stage(view)!.dataset.gapShrink)).toBeLessThan(.8);
 }, HEAVY);
});
