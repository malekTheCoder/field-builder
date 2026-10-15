import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own type: the placer measures every name, and a name measured in a fallback face is another size.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* A NEGATIVE CHARGE'S ΔE_x LIES ON THE r LEG.
 *
 * In What cancels a negative rod's part along the axis points from P back at the rod, down the triangle's leg that is
 * r, and the dashed leg was painted over it: the arrow read as the leg with a teal head. Its name and r's shared the
 * one line -- "ΔE_x r" side by side under the endpoint rod's leg, ΔE_x pushed up beside the y leg on the bisector. Now
 * the leg stops just past the arrow's point, as r_i's line does at ΔE's, ΔE_x is named beside its own shaft, and r
 * beside the stretch of leg the arrow leaves bare. A positive charge's part leaves P the other way, and its leg still
 * runs to P. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(() => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, params: Record<string, number> = {}) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true,
  params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 window.history.replaceState(null, '', '/');
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await document.fonts.ready;
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const frames = (n: number) => new Promise<void>(r => { const step = (k: number) => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); });
async function settle(view: View) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await frames(3);
}
/** Hold the run near the end of What cancels, once the mirror's sideways part has gone. */
async function holdCancel(view: View) {
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: /^Stage 3: What cancels$/}));
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const seg = [...view.container.querySelectorAll<HTMLElement>('.bp-seg')][2], box = seg.getBoundingClientRect(), x = box.left + .98 * box.width;
 fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
 fireEvent.click(seg, {clientX: x});
 await new Promise(r => setTimeout(r, 200));
 await settle(view);
}
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
/** A name's centre in the drawing's units, nudge and all. */
function centre(v: View, el: Element) {
 const inverse = svgOf(v).getScreenCTM()!.inverse(), r = el.getBoundingClientRect();
 return new DOMPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2).matrixTransform(inverse);
}
function box(v: View, el: Element) {
 const inverse = svgOf(v).getScreenCTM()!.inverse(), r = el.getBoundingClientRect();
 return {left: new DOMPoint(r.left, r.top).matrixTransform(inverse).x, right: new DOMPoint(r.right, r.top).matrixTransform(inverse).x};
}
function parts(v: View) {
 const svg = svgOf(v), c = svg.querySelector<SVGCircleElement>('.cd-point')!;
 const P = {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))};
 const legPts = [...svg.querySelector<SVGPathElement>('.cd-triangle path[data-leg]')!.getAttribute('d')!.matchAll(/[ML]\s*([-\d.]+)[ ,]([-\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));
 const [, foot, end] = legPts;
 const xName = svg.querySelector<SVGTextElement>('.cd-vector-label[data-symbol="ΔE_x"]')!;
 const [, , tx, ty] = xName.dataset.shaft!.split(' ').map(Number);
 const rName = [...svg.querySelectorAll<SVGTextElement>('.cd-triangle text[data-dim="distance"]')].find(t => t.textContent === 'r')!;
 return {P, foot, end, tip: {x: tx, y: ty}, xName, rName};
}
const between = (x: number, a: number, b: number, slack: number) => x >= Math.min(a, b) - slack && x <= Math.max(a, b) + slack;

describe('a negative rod\'s ΔE_x on the r leg, What cancels', () => {
 for (const id of ['bisector', 'endpoint', 'infinite', 'semi']) for (const w of [1440, 390]) it(`${id} at ${w}`, async () => {
  await page.viewport(w, w > 1000 ? 900 : 844);
  const v = await openLesson(id, {charge: -3});
  await holdCancel(v);
  const {P, foot, end, tip, xName, rName} = parts(v);
  expect(xName, 'ΔE_x is named').toBeTruthy();
  expect(rName, 'r is named').toBeTruthy();
  const arrow = Math.hypot(tip.x - P.x, tip.y - P.y), leg = Math.hypot(foot.x - P.x, foot.y - P.y);
  expect(Math.abs(tip.y - P.y), 'ΔE_x lies along the leg').toBeLessThan(.5);
  expect(arrow, 'and shorter than it').toBeLessThan(leg);
  // The leg is not drawn over the arrow: it ends at the arrow's point, not at P.
  expect(Math.hypot(end.x - P.x, end.y - P.y), 'the leg stops short of P').toBeGreaterThan(arrow);
  expect(Math.hypot(end.x - tip.x, end.y - tip.y), 'just past the arrow\'s point').toBeLessThan(6);
  if (w > 1000) {
   // Each name by its own stroke: ΔE_x beside the arrow, r beside the bare leg.
   const xb = box(v, xName), rc = centre(v, rName);
   const alongArrow = Math.min(xb.right, Math.max(tip.x, P.x)) - Math.max(xb.left, Math.min(tip.x, P.x));
   expect(alongArrow, `ΔE_x's name (${xb.left.toFixed(0)} to ${xb.right.toFixed(0)}) beside its arrow (${tip.x.toFixed(0)} to ${P.x.toFixed(0)})`).toBeGreaterThan(4);
   expect(between(rc.x, foot.x, tip.x, 8), `r's name (${rc.x.toFixed(0)}) beside the bare leg (${foot.x.toFixed(0)} to ${tip.x.toFixed(0)})`).toBe(true);
  }
 }, 60000);
 it('a positive rod\'s leg still runs to P', async () => {
  await page.viewport(1440, 900);
  const v = await openLesson('endpoint', {charge: 3});
  await holdCancel(v);
  const {P, end} = parts(v);
  expect(Math.hypot(end.x - P.x, end.y - P.y)).toBeLessThan(.5);
 }, 60000);
});
