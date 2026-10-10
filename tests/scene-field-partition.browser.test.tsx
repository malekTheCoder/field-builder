import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE FIELD IS THE CHARGE'S, AND THE CHARGE IS ONE COLOUR -- in the Explorer as it ships.
 *
 * The lines of every lesson were traced from the reader's own pieces: a ring cut into five drew the
 * field of five lumps, none of its lines reaching the ring. ChargeDiagram now traces from a partition
 * fine enough to be the charge, and both field layers say how fine on themselves. The scene used to
 * paint a negative charge blue against the flat figure's orange; it reports its charge colour too.
 * And where Add them up's chain would lie inside the net arrow, the plan says it is moved beside it.
 * These read what the layers write on themselves; see run-3d for why not the meshes. */
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
/** Hold the run at a fraction of the way through one stage, as a reader dragging the bar does. */
function scrub(view: View, index: number, fraction: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[index].getBoundingClientRect(), x = r.left + fraction * r.width;
 fireEvent.pointerDown(track, {clientX: x + (fraction > .5 ? -16 : 16), button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
describe('the field the Explorer draws', () => {
 it('a ring cut into five has its field traced from the ring, in space and in the side view', async () => {
  const view = await openLesson('ring', {slices: 5});
  await waitFor(() => expect(Number(stage(view)?.dataset.fieldSamples)).toBeGreaterThanOrEqual(96));
  fireEvent.click(view.getByRole('button', {name: '2D'}));
  await waitFor(() => expect(Number(view.container.querySelector<HTMLElement>('.cd-field-canvas')?.dataset.fieldSamples)).toBeGreaterThanOrEqual(96));
 }, HEAVY);
 it('a negative charge is drawn in the same colour as a positive one', async () => {
  const colour = async (charge: number) => {
   const view = await openLesson('ring', {charge});
   await waitFor(() => expect(stage(view)?.dataset.chargeColour).toMatch(/^#[0-9a-f]{6}$/));
   const seen = stage(view)!.dataset.chargeColour;
   cleanup();
   window.history.replaceState(null, '', '/');
   return seen;
  };
  expect(await colour(-2)).toBe(await colour(2));
 }, HEAVY);
 it('Add them up draws the disk\'s chain beside its net arrow, and the ring\'s where it is', async () => {
  for (const [id, beside] of [['disk', 'true'], ['ring', undefined]] as const) {
   const view = await openLesson(id);
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('pieces'));
   scrub(view, 3, .8);
   await waitFor(() => expect(Number(stage(view)?.dataset.runChain)).toBeGreaterThan(2));
   expect(stage(view)?.dataset.runChainBeside, id).toBe(beside);
   cleanup();
   window.history.replaceState(null, '', '/');
  }
 }, HEAVY);
});
