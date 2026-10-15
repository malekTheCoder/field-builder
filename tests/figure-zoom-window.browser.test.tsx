import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {PLOT} from '../src/diagrams/vectorfield';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* ZOOMED IN, NOTHING OF THE FIGURE LEAVES ITS WINDOW.
 *
 * The owner's screenshot: the bisector, flat, zoomed in with +. The field lines and the rod's body
 * stopped at the plot's window, but the rod's length bar ran from the top of the card down through the
 * caption and into the controls, and the rod's + marks stood beside "P = (r, 0)" in the heading and
 * again by the zoom buttons. Only some layers were cut to the window: the axes only in space, the
 * dimension bars, the triangle, the angles, the potential's column and the charge's marks never.
 *
 * Every stroke and every mark is now cut to the window or left out, and every name stays inside the
 * frame the placer keeps names in (the figure above the caption's band; under the stage's title while
 * the run plays) -- none cut in half, and none standing for a thing the window no longer shows. Checked
 * in the Explorer, the configuration that ships, zoomed all the way in, at a laptop's width and a
 * phone's. */
const FOOTER_BAND = 378, TITLE_BAND = 48;
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function open(id: string, params: Partial<typeof DEFAULT_PARAMS> = {}) {
 // A stale ?p= or the last test's pending save opens the wrong lesson: wait it out.
 window.history.replaceState(null, '', '/');
 await new Promise(r => setTimeout(r, 300));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id).title));
 return view;
}
/** Until nothing moves and the placer has had its pass. */
async function settle(view: {container: HTMLElement}) {
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
async function zoomAll(view: ReturnType<typeof render>, name: 'Zoom in' | 'Zoom out') {
 const button = view.getByRole('button', {name}) as HTMLButtonElement;
 for (let i = 0; i < 30 && !button.disabled; i++) fireEvent.click(button);
 expect(button.disabled, `${name} never reached its limit`).toBe(true);
 await settle(view);
}
/** Everything drawn that is outside where it may be, in the figure's own units. */
function escapes(svg: SVGSVGElement, running: boolean): string[] {
 const frame = svg.getBoundingClientRect(), sx = 720 / frame.width, sy = 430 / frame.height, out: string[] = [];
 // The caption's rule and its two lines, the stage's title, the grid behind the window, the legend and the cube
 // are the figure's frame, set in its margins on purpose; the knocked-out patches only follow the names.
 const frameParts = 'defs, clipPath, pattern, .cd-grid, .cd-divider, .cd-footer, .cd-stage-label, .cd-help, .cd-cube, .cd-label-knock';
 for (const el of svg.querySelectorAll<SVGGraphicsElement>('path,line,circle,rect,polygon,polyline,ellipse,text')) {
  if (el.closest(frameParts)) continue;
  let hidden = false, clipped = false;
  for (let e: Element | null = el; e && e !== svg; e = e.parentElement) {
   const cs = getComputedStyle(e);
   if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < .02) { hidden = true; break; }
   if ((e.getAttribute('clip-path') ?? '').includes('clip)') || cs.clipPath.includes('clip')) clipped = true;
  }
  if (hidden) continue;
  const text = el.tagName === 'text', cs = getComputedStyle(el);
  if (text && !el.textContent?.trim()) continue;
  const transparent = (v: string) => v === 'none' || v === 'transparent' || v === 'rgba(0, 0, 0, 0)';
  if (!text && transparent(cs.stroke) && transparent(cs.fill)) continue;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) continue;
  let b = {x0: (r.left - frame.left) * sx, y0: (r.top - frame.top) * sy, x1: (r.right - frame.left) * sx, y1: (r.bottom - frame.top) * sy};
  // What a clip leaves of it: a line cut to the window is drawn only inside it.
  if (clipped) b = {x0: Math.max(b.x0, PLOT.x), y0: Math.max(b.y0, PLOT.y), x1: Math.min(b.x1, PLOT.x + PLOT.width), y1: Math.min(b.y1, PLOT.y + PLOT.height)};
  if (b.x1 <= b.x0 || b.y1 <= b.y0) continue;
  // A charge's mark is a mark of the drawing, not a name: inside the window, like every stroke.
  const mark = !text || !!el.closest('.cd-plus');
  const box = mark ? {x0: PLOT.x, y0: PLOT.y, x1: PLOT.x + PLOT.width, y1: PLOT.y + PLOT.height} : {x0: 0, y0: running ? TITLE_BAND : 0, x1: 720, y1: FOOTER_BAND};
  const tol = 1.5;
  if (b.x0 < box.x0 - tol || b.y0 < box.y0 - tol || b.x1 > box.x1 + tol || b.y1 > box.y1 + tol)
   out.push(`${el.tagName}.${el.getAttribute('class') || el.parentElement?.getAttribute('class') || ''}${text ? ` "${el.textContent}"` : ''} at ${b.x0.toFixed(0)},${b.y0.toFixed(0)} to ${b.x1.toFixed(0)},${b.y1.toFixed(0)}`);
 }
 return out;
}
const svgOf = (view: {container: HTMLElement}) => view.container.querySelector<SVGSVGElement>('.cd-svg')!;
describe('the figure stays in its window, zoomed', () => {
 for (const [w, h] of [[1280, 800], [390, 844]] as const) {
  it(`all the way in, flat, at ${w} wide`, async () => {
   await page.viewport(w, h);
   const found: string[] = [];
   // The owner's bisector, either sign; a rod on its foot, the ramp's many marks, the arc's, the rod along
   // its axis with its potential's column beside P, and the flat sheet, whose P rose out of the window.
   for (const [id, charge] of [['bisector', 2], ['bisector', -2], ['endpoint', 2], ['ramp', 2], ['arc', 2], ['axial', 2], ['v-rod-axial', 2], ['sheet', 2]] as const) {
    const view = await open(id, {charge});
    const flat = view.queryByRole('button', {name: '2D'});
    if (flat) fireEvent.click(flat);
    await zoomAll(view, 'Zoom in');
    found.push(...escapes(svgOf(view), false).map(e => `${id} (${charge > 0 ? '+' : '−'}): ${e}`));
    cleanup();
   }
   expect(found, 'drawn outside the window').toEqual([]);
  }, 90000);
 }
 it('all the way out, and in again during the run', async () => {
  await page.viewport(1280, 800);
  const found: string[] = [];
  for (const id of ['bisector', 'infinite'] as const) {
   const view = await open(id);
   await zoomAll(view, 'Zoom out');
   found.push(...escapes(svgOf(view), false).map(e => `${id}, out: ${e}`));
   await zoomAll(view, 'Zoom in');
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   // One piece, held: the construction's triangle, the piece's angle and ΔQ's tag are all drawn.
   fireEvent.click(await view.findByRole('button', {name: /^Stage 2:/}));
   const pause = view.queryByRole('button', {name: 'Pause'});
   if (pause) fireEvent.click(pause);
   await settle(view);
   found.push(...escapes(svgOf(view), true).map(e => `${id}, in, One piece: ${e}`));
   cleanup();
  }
  expect(found, 'drawn outside the window').toEqual([]);
 }, 60000);
});
