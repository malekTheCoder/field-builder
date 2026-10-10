import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {drawnAfter} from '../src/diagrams/three/bodies';
/* WHAT THE SCENE DRAWS OVER ITSELF, AND WHERE ITS ARROWS STAND -- in the Explorer as it ships.
 *
 * The translucent front of the field lines, their heads and the sign marks were drawn BEFORE the chosen
 * piece, because three sorts by a group's order first and they sat straight under the scene: on the disk
 * and the sheet the chosen washer painted out every line in front of it and buried the marks. The scene
 * writes the order it really draws in on itself (see `drawOrder`). And the 3D arrows round P were hidden
 * by a ball in space two and a half to three metres across, which took out the inside of the arc and the
 * gap between the axial rod and P; the scene writes where the arrows it draws stand. */
afterEach(() => {
 cleanup();
 // A URL left behind by one test beats the storage the next one writes; see build-ui's note.
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 // The Explorer saves on a 220ms debounce, and the previous test's pending save must not land on
 // top of this one's lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Each mounts the whole Explorer with its 3D scene: a second or two here, about 6.5 times that on
 * the build machine. */
const HEAVY = 60000;
const stage = (view: View) => view.container.querySelector<HTMLElement>('.cd-field-stage');
async function inSpace(view: View) {
 if (!view.container.querySelector('.cd-in-space')) {
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
 }
}
const order = (view: View) => new Map((stage(view)?.dataset.sceneOrder ?? '').split(' ').filter(Boolean).map(s => {
 const [name, at] = s.split(':'), [g, r] = at.split('.').map(Number);
 return [name, [g, r] as [number, number]];
}));
describe('the overlay is drawn over the chosen piece', () => {
 for (const id of ['disk', 'sheet', 'ring']) it(`${id}: the front of the lines, their heads and the sign marks come after the chosen piece`, async () => {
  const view = await openLesson(id);
  await inSpace(view);
  await waitFor(() => expect(order(view).get('front-strokes')).toBeTruthy());
  const o = order(view);
  for (const name of ['front-strokes', 'front-heads', 'signs']) expect(drawnAfter(o.get(name)!, o.get('element')!), name).toBe(true);
 }, HEAVY);
});
describe('the 3D arrows fill the region the lesson is about', () => {
 const shown = (view: View) => (stage(view)?.dataset.latticeShown ?? '').split(' ').filter(Boolean).map(s => { const [x, y, z] = s.split(',').map(Number); return {x, y, z}; });
 it('arc: arrows inside the arc round P, as the flat view draws them', async () => {
  const view = await openLesson('arc');
  await inSpace(view);
  fireEvent.click(view.getByRole('button', {name: 'Arrows'}));
  await waitFor(() => expect(shown(view).length).toBeGreaterThan(0));
  const R = DEFAULT_PARAMS.size / 2;
  expect(shown(view).filter(a => Math.hypot(a.x, a.y) < R).length).toBeGreaterThanOrEqual(4);
 }, HEAVY);
 it('axial: at least one arrow in the gap between the rod\'s end and P', async () => {
  const view = await openLesson('axial');
  await inSpace(view);
  fireEvent.click(view.getByRole('button', {name: 'Arrows'}));
  await waitFor(() => expect(shown(view).length).toBeGreaterThan(0));
  // The rod runs along x from O to L; P is d past its end.
  const L = DEFAULT_PARAMS.size, P = L + DEFAULT_PARAMS.distance;
  expect(shown(view).filter(a => a.x > L && a.x < P).length).toBeGreaterThanOrEqual(1);
 }, HEAVY);
});
