import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* A WEBGL CONTEXT TAKEN BACK MID-LESSON.
 *
 * A GPU reset, a driver update or too many tabs drawing at once, and the browser takes the scene's context away. Nothing
 * listened for it: the ring, which opens in space, went on as an empty card under its labels. Now the figure goes flat
 * with a quiet line saying why, and 3D stays on offer to start the scene again. Lost here the way the browser loses it,
 * through WEBGL_lose_context. */
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openRing() {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'ring', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {ring: {...DEFAULT_PARAMS}}}));
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
 // Drawn: the scene writes where P is once it has rendered a frame.
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.cd-field-stage')?.dataset.sceneP).toBeTruthy(), {timeout: 15000});
 return view;
}
type View = Awaited<ReturnType<typeof openRing>>;
const figure = (view: View) => view.container.querySelector<HTMLElement>('.charge-diagram')!;
const canvas = (view: View) => view.container.querySelector<HTMLCanvasElement>('.cd-stage-gl canvas')!;
describe('a WebGL context lost while the ring is drawn in space', () => {
 it('goes flat with a line saying why, and 3D starts the scene again', async () => {
  const view = await openRing();
  expect(figure(view).classList.contains('cd-in-space')).toBe(true);
  const gl = (canvas(view).getContext('webgl2') ?? canvas(view).getContext('webgl')) as WebGLRenderingContext | null;
  const lose = gl?.getExtension('WEBGL_lose_context');
  expect(lose, 'the browser can lose a context on purpose').toBeTruthy();
  lose!.loseContext();
  await waitFor(() => expect(figure(view).classList.contains('cd-in-space'), 'the figure is drawn flat').toBe(false), {timeout: 10000});
  const said = view.container.querySelector('.cd-stage-unavailable');
  expect(said?.textContent).toMatch(/interrupted/);
  expect(said?.tagName).toBe('OUTPUT');
  // Not a blank card: the flat figure draws its own field and its charge.
  expect(view.container.querySelector('.cd-svg')).toBeTruthy();
  const three = view.getByRole('button', {name: '3D'}) as HTMLButtonElement;
  expect(three.disabled, 'the device can still draw in space').toBe(false);
  fireEvent.click(three);
  await waitFor(() => expect(figure(view).classList.contains('cd-in-space')).toBe(true));
  await waitFor(() => expect(view.container.querySelector<HTMLElement>('.cd-field-stage')?.dataset.sceneP).toBeTruthy(), {timeout: 15000});
  expect(view.container.querySelector('.cd-stage-unavailable')).toBeNull();
 }, 60000);
 it('asks the browser to give the context back', async () => {
  const view = await openRing();
  const ev = new Event('webglcontextlost', {cancelable: true});
  canvas(view).dispatchEvent(ev);
  expect(ev.defaultPrevented).toBe(true);
  await waitFor(() => expect(figure(view).classList.contains('cd-in-space')).toBe(false));
 }, 60000);
});
