import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* NO WEBGL, THE FLAT FIGURE.
 *
 * The scene is a WebGL context, which a school machine with a blocklisted GPU or acceleration turned off by
 * policy does not have. The stage said so in a note, but it failed alone: the figure above it stayed in space,
 * and the ring, the disk and the sheet -- which open there -- showed the view cube, a lone z, the chosen
 * piece's wedge and its ΔQ floating round the note in an empty plot, and the run narrated pieces nobody could
 * see. Now the figure is drawn flat, 3D is turned off with a reason, and one line under the toolbar says why.
 * Here the browser is made to refuse WebGL before the ring is opened. */
const realGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')!.value as typeof HTMLCanvasElement.prototype.getContext;
afterEach(() => {
 HTMLCanvasElement.prototype.getContext = realGetContext;
 cleanup();
 window.history.replaceState(null, '', '/');
 localStorage.clear();
});
const refuseWebGL = () => {
 // The flat field canvas and the colour probes still get their 2D contexts; only WebGL is refused.
 HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
  if (/webgl/.test(kind)) return null;
  return (realGetContext as (...a: unknown[]) => unknown).call(this, kind, ...rest);
 } as typeof HTMLCanvasElement.prototype.getContext;
};
async function openLesson(id: 'ring' | 'disk' | 'sheet' | 'bisector') {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS}}}));
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id).title));
 return view;
}
const button = (view: Awaited<ReturnType<typeof openLesson>>, name: '2D' | '3D') => view.getByRole('button', {name}) as HTMLButtonElement;
describe('a device with no WebGL', () => {
 it('the ring, which opens in space, is drawn flat: no cube, no in-space marks, 3D off with its reason, a one-line status', async () => {
  refuseWebGL();
  const view = await openLesson('ring');
  const figure = () => view.container.querySelector<HTMLElement>('.charge-diagram')!;
  await waitFor(() => expect(figure().classList.contains('cd-in-space'), 'the figure stayed in space over an empty scene').toBe(false), {timeout: 15000});
  // Nothing of the space view is left: no stage, no view cube, no orbit legend; the flat field is drawn instead.
  expect(view.container.querySelector('.cd-field-stage')).toBeNull();
  expect(view.container.querySelector('.cd-cube')).toBeNull();
  expect(view.container.querySelector('.cd-orbitable')).toBeNull();
  expect(view.container.querySelector('.cd-field-canvas canvas')).not.toBeNull();
  // 3D is off, and says why where a pointer finds it; 2D is the view in use.
  expect(button(view, '3D').disabled).toBe(true);
  expect(button(view, '3D').title).toMatch(/not available on this device/);
  expect(button(view, '2D').getAttribute('aria-pressed')).toBe('true');
  // The status: one line, an <output> (role status, announced as it appears), outside any hidden layer, and
  // not over the plot -- under the toolbar.
  const said = view.container.querySelector<HTMLElement>('.cd-stage-unavailable')!;
  expect(said?.textContent).toMatch(/3D view is not available on this device/);
  expect(said.tagName).toBe('OUTPUT');
  expect(said.closest('[aria-hidden="true"]')).toBeNull();
  expect(said.closest('.cd-toolbar')).not.toBeNull();
  expect(said.closest('.cd-stage')).toBeNull();
  // Pressing 3D anyway changes nothing.
  fireEvent.click(button(view, '3D'));
  await new Promise(r => setTimeout(r, 400));
  expect(figure().classList.contains('cd-in-space')).toBe(false);
  // And the run plays flat: its pieces are the flat figure's, with no cube over them.
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(view.queryByRole('button', {name: /^Stage 2: /})).toBeTruthy());
  fireEvent.click(view.getByRole('button', {name: /^Stage 2: /}));
  await new Promise(r => setTimeout(r, 600));
  expect(figure().classList.contains('cd-in-space')).toBe(false);
  expect(view.container.querySelector('.cd-cube')).toBeNull();
  expect(view.container.querySelector('.cd-field-stage')).toBeNull();
 }, 60000);
 it('with WebGL the ring still opens in space, and 3D is on offer', async () => {
  const view = await openLesson('ring');
  await new Promise(r => setTimeout(r, 1500));
  expect(view.container.querySelector('.charge-diagram')!.classList.contains('cd-in-space')).toBe(true);
  expect(button(view, '3D').disabled).toBe(false);
  expect(view.container.querySelector('.cd-stage-unavailable')).toBeNull();
 }, 60000);
});
