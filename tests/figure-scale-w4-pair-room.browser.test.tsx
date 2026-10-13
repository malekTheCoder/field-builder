import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE PAIR GOING IN, DRAWN LARGER -- BUT NOT OVER THE CHARGE, AND WITH HEADS. With the charge negative and P close, the
 * sum's arrow crosses the rod, and the pair, enlarged at its tip, was laid across the L bracket beside the rod. It stops
 * short of the rod and the bracket now, going in at its true size where there is no room. And an arrow long enough to
 * carry a head carries one at least six units long: at a third of its length, a pair's shrinking parts had four-unit
 * smudges for heads. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}) {
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
/** Where in Add them up's bar the pairs are `s` of the way in (see tests/figure-pairs.browser.test.tsx). */
const at = (s: number) => .8 * (.2675 + .7325 * s);
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
/** The pair's arrows on screen now: each one drawn, not faded out. */
const pairArrows = (v: View) => [...svgOf(v).querySelectorAll<SVGGElement>('.cd-pair-step > g')].filter(g => Number(g.getAttribute('opacity') ?? 1) > .05)
 .flatMap(g => [...g.querySelectorAll<HTMLElement>('.cd-vector[data-shaft]')]).map(g => {
  const [x1, y1, x2, y2] = g.dataset.shaft!.split(' ').map(Number);
  const head = /^M([-\d.e]+),([-\d.e]+)L/.exec(g.querySelector('path')?.getAttribute('d') ?? '');
  return {x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1), head: head ? Math.hypot(Number(head[1]) - x2, Number(head[2]) - y2) : 0};
 });

describe('the pair going in', () => {
 it('the charge negative and P close: never laid across the rod\'s L bracket', async () => {
  const v = await openLesson('bisector', {charge: -5, distance: .5});
  let seen = 0;
  for (const s of [.4, .5, .6, .75, .9]) {
   await hold(v, 4, at(s));
   // Where the bracket stands while the run is open: further out than at rest.
   const bar = [...svgOf(v).querySelectorAll<SVGGElement>('[data-dim="size"]')].find(g => g.querySelector('text')?.textContent === 'L')!.querySelector('path')!.getBBox();
   for (const a of pairArrows(v)) {
    seen++;
    for (let t = 0; t <= 1; t += .05) {
     const x = a.x1 + (a.x2 - a.x1) * t, y = a.y1 + (a.y2 - a.y1) * t;
     const onBar = x > bar.x - 3 && x < bar.x + bar.width + 3 && y > bar.y && y < bar.y + bar.height;
     expect(onBar, `at ${s}: a pair arrow from ${a.x1},${a.y1} to ${a.x2},${a.y2} crosses L's bracket at x ${bar.x.toFixed(1)}`).toBe(false);
    }
   }
  }
  expect(seen, 'pairs were drawn').toBeGreaterThan(0);
 }, 60000);
 it('arrows long enough for a head carry one at least six units long', async () => {
  const v = await openLesson('bisector');
  let short = 0;
  for (let s = .8; s <= .86; s += .01) {
   await hold(v, 4, at(s));
   for (const a of pairArrows(v)) if (a.length >= 12) {
    if (a.length < 17.6) short++;
    expect(a.head, `an arrow ${a.length.toFixed(1)} units long`).toBeGreaterThan(5.9);
   }
  }
  expect(short, 'arrows between twelve and eighteen units were drawn').toBeGreaterThan(0);
 }, 60000);
});
