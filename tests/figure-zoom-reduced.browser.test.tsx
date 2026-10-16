import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* WITH REDUCE MOTION ON, A ZOOM STEPS. Everywhere else it glides to the level asked for (see figure-zoom-window and
 * run-perf); the setting asks for no smooth movement, so here the drawn zoom is the one asked for, at once. In a
 * file of its own: the motion library reads the setting once, the first time any figure asks. */
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function open(id: string) {
 window.history.replaceState(null, '', '/');
 await new Promise(r => setTimeout(r, 300));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id).title));
 return view;
}
const svgOf = (view: {container: HTMLElement}) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
const drawn = (view: {container: HTMLElement}) => Number(view.container.querySelector<HTMLElement>('.charge-diagram')!.dataset.zoom);
const zooming = (view: {container: HTMLElement}) => view.container.querySelector<HTMLElement>('.charge-diagram')!.dataset.zooming === 'true';
describe('a zoom, with Reduce Motion on', () => {
 let real: typeof window.matchMedia;
 beforeEach(() => {
  real = window.matchMedia;
  window.matchMedia = ((q: string) => q.includes('prefers-reduced-motion')
   ? {matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} as unknown as MediaQueryList
   : real.call(window, q)) as typeof window.matchMedia;
 });
 afterEach(() => { window.matchMedia = real; });
 it('steps straight to it', async () => {
  const view = await open('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Zoom in'}));
  expect(zooming(view), 'glided with Reduce Motion on').toBe(false);
  expect(drawn(view)).toBeCloseTo(1.18, 3);
  fireEvent.wheel(svgOf(view), {deltaY: 100});
  expect(zooming(view)).toBe(false);
  expect(drawn(view)).toBeCloseTo(1.18 * Math.exp(-.16), 3);
 }, 15000);
});
