import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE RING'S PIECE IN WHAT CANCELS, AS READABLE AS A ROD'S.
 *
 * The ring's two surviving parts are laid up its axis tip to tail, and the room for that pair was measured to a little
 * under the axis' letter -- which in space stands beside the axis, not over it, while the axis runs on to the plot's
 * top. That pair capped the piece at 73 pixels on a laptop, where a rod's is a hundred. The pair now runs up the axis to
 * a little short of the axis' end, the piece reaches the run's own readable length, and the scale is the one map it was:
 * the piece is as long in One ring as in What cancels, and every name round P is still drawn. */
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
const shaft = (g: Element) => (g as HTMLElement).dataset.shaft!.split(' ').map(Number);
/** An arrow's length in screen pixels. */
const px = (v: View, g: Element | null) => { if (!g) return 0; const [x1, y1, x2, y2] = shaft(g); return Math.hypot(x2 - x1, y2 - y1) * svgOf(v).getBoundingClientRect().width / 720; };
const pieceArrow = (v: View) => svgOf(v).querySelector('g.cd-grow:not(.cd-grow-pair):not(.cd-grow-parts) > .cd-vector[data-shaft]');

describe('the ring, What cancels, on a laptop (1280 × 720)', () => {
 it('the piece is drawn at the run\'s readable length, and the stacked pair stops short of the axis\' end', async () => {
  await page.viewport(1280, 720);
  const v = await openLesson('ring');
  await hold(v, 2, .6);
  const one = px(v, pieceArrow(v));
  await hold(v, 3, .98);
  const piece = px(v, pieceArrow(v));
  expect(piece, 'the piece, in pixels').toBeGreaterThan(85);
  expect(Math.abs(piece - one), 'as long in One ring as in What cancels: one map').toBeLessThan(1);
  // The mirror's survivor, laid on from the piece's tip, up the axis: its head below where the axis ends.
  const stack = svgOf(v).querySelector('.cd-partner-keep .cd-vector[data-shaft]')!;
  const [, , , tipY] = shaft(stack);
  expect(tipY, 'the pair stops short of the axis\' end').toBeGreaterThan(60 + 8);
  // Every name round P is drawn, none hidden.
  const names = [...svgOf(v).querySelectorAll<SVGTextElement>('.cd-vector-label')].filter(t => ['ΔE', 'ΔE_z', 'ΔE_⊥'].includes(t.dataset.symbol ?? ''));
  expect(names.length).toBe(3);
  for (const t of names) expect(t.dataset.placerHidden, `${t.dataset.symbol} is drawn`).toBeUndefined();
  const ri = svgOf(v).querySelector<SVGTextElement>('text[data-ri-line]');
  expect(ri && !ri.dataset.placerHidden, 'r_i on the line to the piece is drawn').toBe(true);
 }, 60000);
});
