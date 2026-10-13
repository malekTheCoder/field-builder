import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE POTENTIAL'S COLUMN, SEEN ON A PHONE AND STANDING BY P. The column -- the potential lessons' only picture of V --
 * was drawn at the drawing's size while the names beside it were set half as large again: on a phone six pixels wide,
 * the disk's first ring's block a pixel tall. And with the charge negative on the ring and the disk it was moved out
 * past the rim, a hundred pixels from P, a bar standing on the ring with its name in the limit's "θ = 0, 2π". */
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
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
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
const meets = (a: DOMRect, b: DOMRect) => a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;

describe('on a phone (390 × 844)', () => {
 it('the column is nine pixels wide, and every ring of the disk has a block that can be seen', async () => {
  const v = await openLesson('v-disk', {}, [390, 844]);
  await hold(v, 4, .98);
  const slots = [...svgOf(v).querySelectorAll('.cd-gauge [data-stack-slot]')].map(r => r.getBoundingClientRect());
  expect(slots.length).toBe(5);
  for (const s of slots) {
   expect(s.width, 'wide').toBeGreaterThan(8.5);
   expect(s.height, 'a block one can see').toBeGreaterThan(2);
  }
 }, 60000);
 it('and as tall as the names beside it are large', async () => {
  const v = await openLesson('v-ring', {}, [390, 844]);
  await hold(v, 5, .98);
  const column = svgOf(v).querySelector('.cd-gauge .cd-stack-fill')!.getBoundingClientRect();
  expect(column.height).toBeGreaterThan(40);
 }, 60000);
});

describe('the charge negative on the ring and the disk', () => {
 for (const id of ['v-ring', 'v-disk']) {
  it(`${id}: the column hangs beside P, and its name stays off the limits' names`, async () => {
   const v = await openLesson(id, {charge: -2}, [1440, 900]);
   for (const stage of [4, 5]) {
    await hold(v, stage, .98);
    const p = svgOf(v).querySelector('.cd-point')!.getBoundingClientRect(), column = svgOf(v).querySelector('.cd-gauge .cd-stack-slot, .cd-gauge .cd-stack-fill')!.getBoundingClientRect();
    expect(column.x - p.right, `stage ${stage}: beside P`).toBeLessThan(50);
    expect(column.y, `stage ${stage}: hanging down from P's level`).toBeGreaterThan(p.y);
    const name = svgOf(v).querySelector('[data-gauge-name]')!.getBoundingClientRect();
    for (const bound of svgOf(v).querySelectorAll('.cd-bound text')) expect(meets(name, bound.getBoundingClientRect()), `stage ${stage}: the column's name on "${bound.textContent}"`).toBe(false);
   }
  }, 60000);
 }
});
