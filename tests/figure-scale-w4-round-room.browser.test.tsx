import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE RING'S AND THE DISK'S ARROWS AS READABLE AS THE RODS'. Their arrows rise from a P the resting picture stands high in
 * the plot, and the ring's two surviving parts are laid up its axis tip to tail: What cancels drew the ring's piece at
 * fifty pixels on a laptop, its cancelling parts at thirty, and with the charge negative -- every arrow pointing down at
 * the ring, stopped at the drop to its centre -- at twenty and twelve on a phone; the negative bisector's, stacked
 * toward the rod, at fifty. Now P stands lower over the ring and the disk while the run plays, the ring's parts may run
 * down through its empty middle in space, and a negative rod's two surviving parts stand side by side. Measured in
 * screen pixels, in the shipped Explorer. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement | null = null;
afterAll(async () => { quiet?.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number>, viewport: [number, number]) {
 if (!quiet) { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); }
 await page.viewport(...viewport);
 await new Promise(r => setTimeout(r, 280));
 // A run left open writes its stage into the address, and an address beats storage: the next mount would open
 // that run instead of this lesson at rest.
 window.history.replaceState(null, '', '/');
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
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
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
/** An arrow's length in screen pixels. */
const px = (v: View, g: Element | null | undefined) => {
 if (!g) return 0;
 const [x1, y1, x2, y2] = (g as HTMLElement).dataset.shaft!.split(' ').map(Number);
 return Math.hypot(x2 - x1, y2 - y1) * svgOf(v).getBoundingClientRect().width / 720;
};
const piece = (v: View) => px(v, svgOf(v).querySelector('g.cd-grow:not(.cd-grow-pair):not(.cd-grow-parts) > .cd-vector[data-shaft]'));
const cancelling = (v: View) => [...svgOf(v).querySelectorAll('[data-cancel-ghost] .cd-vector[data-shaft]')].map(g => px(v, g));

describe('What cancels on a laptop (1280 × 720)', () => {
 it('the ring: the piece\'s arrow past seventy pixels, each part that cancels past forty', async () => {
  const v = await openLesson('ring', {}, [1280, 720]);
  await hold(v, 3, .98);
  expect(piece(v)).toBeGreaterThan(70);
  for (const c of cancelling(v)) expect(c).toBeGreaterThan(40);
 }, 60000);
 it('the ring, the charge negative', async () => {
  const v = await openLesson('ring', {charge: -2}, [1280, 720]);
  await hold(v, 3, .98);
  expect(piece(v)).toBeGreaterThan(80);
  for (const c of cancelling(v)) expect(c).toBeGreaterThan(40);
 }, 60000);
 it('the disk, either sign', async () => {
  for (const charge of [2, -2]) {
   const v = await openLesson('disk', {charge}, [1280, 720]);
   await hold(v, 3, .98);
   expect(piece(v), `Q = ${charge}`).toBeGreaterThan(85);
   cleanup();
  }
 }, 60000);
 it('the bisector, the charge negative: as large as the positive\'s, near enough', async () => {
  const v = await openLesson('bisector', {charge: -2}, [1280, 720]);
  await hold(v, 3, .98);
  expect(piece(v)).toBeGreaterThan(80);
  for (const c of cancelling(v)) expect(c).toBeGreaterThan(35);
 }, 60000);
});

describe('What cancels on a phone (390 × 844), the charge negative', () => {
 it('the ring\'s arrows toward it do not collapse', async () => {
  const v = await openLesson('ring', {charge: -2}, [390, 844]);
  await hold(v, 3, .98);
  expect(piece(v)).toBeGreaterThan(32);
  for (const c of cancelling(v)) expect(c).toBeGreaterThan(19);
 }, 60000);
});
