import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {PLOT} from '../src/diagrams/vectorfield';
/* THE SCENE IN THE EXPLORER AS IT SHIPS, WAVE 6.
 *
 * Turned up over the bisector, the field's arrow ran out of the top of the window and the clip took its head. The sheet
 * seen from above bleached a hole round P in its chosen ring. In Add them up the sheet's widest ring filled the picture
 * to the window's sides, a rounded-rectangle slab. The endless and the semi-infinite lines ran up under the view cube.
 * Each of these fails on the code before this change. */
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
const frames = (n = 4) => new Promise<void>(r => {let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);});
async function inSpace(view: View) {
 if (!view.container.querySelector('.cd-in-space')) {
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
 }
 await waitFor(() => expect(stage(view)?.dataset.sceneP).toBeTruthy(), {timeout: 20000});
}
async function orbit(view: View, left: number, up: number) {
 const s = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
 fireEvent.pointerDown(s, {clientX: 60, clientY: 60, pointerId: 1});
 fireEvent.pointerUp(s, {pointerId: 1});
 s.focus();
 for (let i = 0; i < left; i++) await userEvent.keyboard('{ArrowLeft}');
 for (let i = 0; i < up; i++) await userEvent.keyboard('{ArrowUp}');
 await frames(40);
}
function scrub(view: View, n: number, fraction: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[n].getBoundingClientRect(), x = r.left + fraction * r.width;
 fireEvent.pointerDown(track, {clientX: x + (fraction > .5 ? -16 : 16), button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}

describe('turned up over the bisector', () => {
 it('the field\'s arrow is cut short to keep its head inside the window, not cut off by it', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('bisector');
  await inSpace(view);
  // Turned as the critic turned it, and then on round to the left a step at a time: P rises toward the top of the
  // window, and in some of these views the whole arrow would leave it.
  await orbit(view, 6, 6);
  let cut = 0;const seen: string[] = [];
  for (let k = 0; k < 12; k++) {
   const s = stage(view)!.dataset;seen.push(`${s.sceneP}|${s.sceneNetTip}|${s.sceneNetFit}`);
   const [x, y] = (s.sceneNetTip ?? '').split(' ').map(Number);
   expect(Number.isFinite(x) && Number.isFinite(y), 'the tip is reported').toBe(true);
   // Inside the window: never past its edge, where the clip takes the head; a P right under the edge has its
   // arrow cut to a head and a little shaft, and that much may come within a few units of it.
   expect(y, `step ${k} ${seen.join(' ; ')}`).toBeGreaterThanOrEqual(PLOT.y + 2);
   expect(x, `step ${k}`).toBeGreaterThanOrEqual(PLOT.x + 2);
   expect(x, `step ${k}`).toBeLessThanOrEqual(PLOT.x + PLOT.width - 2);
   if (Number(s.sceneNetFit) < 1) cut++;
   await userEvent.keyboard('{ArrowLeft}');
   await frames(20);
  }
  expect(cut, `views that would take the whole arrow out: ${seen.join(' ; ')}`).toBeGreaterThan(0);
 }, HEAVY);
});

describe('the sheet', () => {
 it('seen from above keeps only about P\'s halo of a gap', async () => {
  const view = await openLesson('sheet');
  await inSpace(view);
  expect(Number(stage(view)!.dataset.gapShrink)).toBe(1);
  await orbit(view, 0, 8);
  expect(Number(stage(view)!.dataset.gapShrink)).toBeLessThan(.6);
 }, HEAVY);
 it('in Add them up, a ring drawn as a wash ends on a curve inside the window, not at its sides', async () => {
  const view = await openLesson('sheet');
  await inSpace(view);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('pieces'));
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  let washes = 0;
  for (const f of [.45, .6, .75, .9]) {
   scrub(view, 3, f);
   await frames(3);
   const [face, , edge] = (stage(view)!.dataset.sceneWasherInk ?? '').split(' ').map(Number);
   if (!(face < .5)) continue;
   washes++;
   expect(edge, `at ${f}: the wash at the window's sides`).toBeLessThan(.01);
  }
  expect(washes, 'a ring drawn as a wash').toBeGreaterThan(0);
 }, HEAVY);
});

describe('the endless lines and the view cube', () => {
 for (const id of ['infinite', 'semi']) it(`${id}: the charge fades out before the cube's box`, async () => {
  const view = await openLesson(id);
  await inSpace(view);
  const box = (stage(view)!.dataset.cubeFade ?? 'off').split(' ').map(Number);
  expect(box.length, 'the cube\'s box is handed to the scene').toBe(4);
  expect(box.every(Number.isFinite)).toBe(true);
  expect(box[2]).toBeGreaterThan(40);
 }, HEAVY);
});
