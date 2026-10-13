import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* A 3D VIEW THAT CANNOT START SAYS SO.
 *
 * The scene is a chunk fetched on demand and a WebGL context, and a school machine with a blocklisted
 * GPU, or acceleration turned off by policy, has no context to give. Nothing caught that: the ring, the
 * disk and the sheet open in 3D, and they showed their labels floating over an empty figure, with an
 * unhandled rejection and no word of why. Here the browser is made to refuse WebGL. */
const realGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')!.value as typeof HTMLCanvasElement.prototype.getContext;
afterEach(() => {
 HTMLCanvasElement.prototype.getContext = realGetContext;
 cleanup();
 window.history.replaceState(null, '', '/');
});
describe('a device with no WebGL', () => {
 it('the ring, which opens in space, says the 3D view is unavailable and that 2D shows it', async () => {
  // The flat canvas and the colour probe still get their 2D contexts; only WebGL is refused.
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
   if (/webgl/.test(kind)) return null;
   return (realGetContext as (...a: unknown[]) => unknown).call(this, kind, ...rest);
  } as typeof HTMLCanvasElement.prototype.getContext;
  await new Promise(r => setTimeout(r, 280));
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'ring', seen: true, dark: false, sidebarOpen: true, params: {ring: {...DEFAULT_PARAMS}}}));
  const view = render(<Explorer />);
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
  await waitFor(() => expect(view.container.querySelector('.cd-stage-unavailable')?.textContent).toMatch(/3D view is not available/), {timeout: 15000});
  // And the figure has gone flat rather than staying in space over the empty stage (see scene-w4-flat-fallback).
  expect(view.container.querySelector('.charge-diagram')?.classList.contains('cd-in-space')).toBe(false);
  // Said where a screen reader hears it, not inside the scene's hidden layer.
  const said = view.container.querySelector('.cd-stage-unavailable')!;
  // An <output>, whose role is status: announced when it appears.
  expect(said.tagName).toBe('OUTPUT');
  expect(said.closest('[aria-hidden="true"]')).toBeNull();
 }, 60000);
});
