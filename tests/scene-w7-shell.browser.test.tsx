import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE SHELL'S STAIRCASE IN SPACE, WAVE 7.
 *
 * Inside the shell the rings above P push back down the axis, so the scene took the chain for one not to be laid beside
 * the sum, and measured its length from its end, which comes back near P: the staircase started on P, its first column
 * over the sum's arrow on P's own line, burying the arrow ΣΔE names. Its jogs across were drawn as links with beads,
 * sideways ΔE's no ring gives; and in Shrink them its fixed steps drew the sum ending beside E, not on it. The plan is
 * read off the stage; the shift and the beads only where the browser has WebGL, since the renderer lays them. */
afterEach(() => {
 cleanup();
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Mounts the whole Explorer with its 3D scene: a second or two here, about 6.5 times that on the build machine. */
const HEAVY = 60000;
const stage = (view: View) => view.container.querySelector<HTMLElement>('.cd-field-stage');
const frames = (n = 4) => new Promise<void>(r => {let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);});
function scrub(view: View, n: number, fraction: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[n].getBoundingClientRect(), x = r.left + fraction * r.width;
 fireEvent.pointerDown(track, {clientX: x + (fraction > .5 ? -16 : 16), button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
describe('the shell staircase in space', () => {
 it('inside the shell: beside the sum, its jogs hairlines, and no staircase in Shrink them', async () => {
  const view = await openLesson('shell', {distance: 1});
  if (!view.container.querySelector('.cd-in-space')) {
   fireEvent.click(view.getByRole('button', {name: '3D'}));
   await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
  }
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('pieces'));
  scrub(view, 3, .995);
  await waitFor(() => expect(stage(view)?.dataset.runChain).toBeTruthy());
  await frames(6);
  const s = stage(view)!.dataset;
  expect(s.runChainBeside).toBe('true');
  // Five rings, four jogs between their links.
  expect(s.runJogs).toBe('4');
  if (s.runChainShift !== undefined) {
   expect(Number(s.runChainShift)).toBeGreaterThanOrEqual(6);
   // A bead at the top of each ring's link but the last, none at the foot of a jog.
   expect(s.runChainBeads).toBe('4');
  }
  scrub(view, 4, .7);
  await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('limit'));
  await frames(4);
  expect(stage(view)!.dataset.runChain).toBeUndefined();
 }, HEAVY);
});
