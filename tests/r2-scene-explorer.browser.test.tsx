// KaTeX's own sizes are what set a text-style fraction small, so the confusions' check needs them.
import 'katex/dist/katex.min.css';
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {openingCamera} from '../src/diagrams/camera';
import {PLOT} from '../src/diagrams/vectorfield';
/* ROUND TWO, THE SCENE AND THE EXPLORER, CHECKED IN THE PAGE THAT SHIPS.
 *
 * - In space, the part of an arrow that SURVIVES was drawn dashed wherever there was no mirror piece
 *   to cancel it -- the rod seen from beyond its end, the ramp, the semi-infinite line -- the mark the
 *   figure keeps for parts that go. The flat figure draws it solid.
 * - On the sheet, the ring the lesson rested on and the run talked about had its far edge running
 *   through P in the opening view, so P read as lying in the sheet.
 * - The 3D contribution arrows were slate grey under teal labels.
 * - The flat field lines stopped in mid-air on a circle about O, well short of the frame.
 * - "Easy to confuse with" set its expressions at half the size of the prose, in a muted grey.
 * - The sidebar said "discs" where every lesson says "disk".
 *
 * The scene's own drawing is WebGL, which a build machine is not promised; what it was asked to draw
 * is written on the stage, and that is what these read. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 document.documentElement.classList.remove('dark');
 await page.viewport(1280, 800);
});
async function openLesson(id: string, extra: Record<string, unknown> = {}) {
 // The previous test's pending save must not land on top of this one's lesson; see build-ui.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS}}, ...extra}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Every one of these mounts the whole Explorer, a second or so here and about 6.5 times that on the
 * build machine; each carries its own limit. */
const HEAVY = 60000;
const stage = (view: View) => view.container.querySelector<HTMLElement>('.cd-field-stage');
const jump = (view: View, n: number, name: string) => fireEvent.click(view.getByRole('button', {name: `Stage ${n}: ${name}`}));
/** The page's own tokens, set to values nothing falls back to, so a check of colour or size proves
 * the page read them. The repo's browser project does not load the app's global sheet. */
function tokens(css: string) {
 const style = document.createElement('style');
 style.dataset.test = 'tokens';
 style.textContent = css;
 document.head.appendChild(style);
 return () => style.remove();
}
describe('in space, the part that survives is drawn as a survivor', () => {
 for (const [id, expected] of [['endpoint', 'solid'], ['semi', 'solid'], ['ramp', 'solid'], ['bisector', 'dashed']] as const) {
  it(`${id}: the sideways part is ${expected} at "What cancels"`, async () => {
   const view = await openLesson(id);
   fireEvent.click(view.getByRole('button', {name: '3D'}));
   await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   jump(view, 3, 'What cancels');
   await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('cancel'));
   // Nothing cancels a piece with no mirror: both of its parts are drawn solid, as the flat figure
   // draws them. Where a partner's part is cancelling it, the pair is dashed and fades.
   await waitFor(() => expect(stage(view)?.dataset.runDrop).toBe(expected));
   expect(stage(view)?.dataset.runArrows?.split(' ')).toContain('drop');
  }, HEAVY);
 }
});
describe('the sheet in space: P is drawn above the sheet, not in it', () => {
 /** How far below P, in the figure's units, the far edge of the ring the figure is showing lies. */
 function clearance(view: View) {
  const root = view.container.querySelector<HTMLElement>('.charge-diagram')!;
  const [, outer] = (root.dataset.elementAnnulus ?? '').split(',').map(Number);
  const point = view.container.querySelector<SVGCircleElement>('circle.cd-point')!;
  const P = {x: Number(point.getAttribute('cx')), y: Number(point.getAttribute('cy'))};
  const [, oy] = (view.container.querySelector<SVGTextElement>('.cd-origin')!.dataset.at ?? '').split(' ').map(Number);
  // The figure's own scale, read back from P: z rises cos(pitch) per metre on the screen.
  const {pitch} = openingCamera('sheet'), unit = (oy - P.y) / (Math.cos(pitch) * DEFAULT_PARAMS.distance);
  expect(unit).toBeGreaterThan(10);
  const farEdge = oy - Math.sin(pitch) * outer * unit;
  return farEdge - P.y;
 }
 it('at rest, and through the run\'s first stages, the ring shown lies clearly below P', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('sheet');
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
  expect(clearance(view), 'the resting ring').toBeGreaterThanOrEqual(20);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  for (const [n, name, key] of [[2, 'One ring', 'one'], [3, 'What cancels', 'cancel']] as const) {
   jump(view, n, name);
   await waitFor(() => expect(stage(view)?.dataset.runStage).toBe(key));
   expect(clearance(view), name).toBeGreaterThanOrEqual(20);
  }
 }, HEAVY);
});
describe('one piece\'s arrow is the colour of its label', () => {
 for (const dark of [false, true]) it(`ring, ${dark ? 'dark' : 'light'} theme: the scene draws the parts in --contribution`, async () => {
  const restore = tokens(':root{--contribution:#1a7f5e}.dark{--contribution:#5ee0b0}');
  try {
   const view = await openLesson('ring', {dark});
   const gl = await waitFor(() => expect(view.container.querySelector('.cd-stage-gl canvas')).toBeTruthy(), {timeout: 8000}).then(() => true, () => false);
   if (!gl) { console.log('[r2-scene] no WebGL here; the scene is not drawn, so its colour cannot be read'); return; }
   await waitFor(() => expect(stage(view)?.dataset.partColour).toBe(dark ? '#5ee0b0' : '#1a7f5e'));
  } finally { restore(); }
 }, HEAVY);
});
describe('the flat field lines run to the edge of the window', () => {
 const names = ['save', 'moveTo', 'lineTo'] as const;
 let spies: MockInstance[] = [];
 beforeEach(() => { spies = names.map(name => vi.spyOn(CanvasRenderingContext2D.prototype, name)); });
 afterEach(() => { for (const s of spies) s.mockRestore(); });
 /** The polylines of the last pass over the field canvas, in the figure's units. */
 function drawn() {
  const calls = spies.flatMap((spy, k) => spy.mock.contexts.map((ctx, i) => ({name: names[k], ctx: ctx as CanvasRenderingContext2D, order: spy.mock.invocationCallOrder[i], args: spy.mock.calls[i] as number[]})))
   .filter(c => c.ctx.canvas.closest('.cd-field-canvas')).sort((a, b) => a.order - b.order);
  const last = calls.map(c => c.name).lastIndexOf('save');
  const lines: {x: number; y: number}[][] = [];
  for (const c of calls.slice(last + 1)) {
   if (c.name === 'moveTo') lines.push([{x: c.args[0], y: c.args[1]}]);
   else if (c.name === 'lineTo' && lines.length) lines[lines.length - 1].push({x: c.args[0], y: c.args[1]});
  }
  return lines.filter(l => l.length > 1);
 }
 const outside = (q: {x: number; y: number}) => q.x < PLOT.x - 1 || q.x > PLOT.x + PLOT.width + 1 || q.y < PLOT.y - 1 || q.y > PLOT.y + PLOT.height + 1;
 for (const id of ['infinite', 'bisector'] as const) it(`${id}: a line that leaves the charge leaves the picture, rather than stopping in mid-air`, async () => {
  await page.viewport(1440, 900);
  await openLesson(id);
  await waitFor(() => expect(drawn().length).toBeGreaterThan(8));
  const lines = drawn();
  // Every line runs from the charge outward, so one end of it is at the charge and the other should
  // be past the edge of the window, where the canvas's clip trims it. On the infinite line they used
  // to end in a ragged column 180 px short of the right edge.
  const out = lines.filter(l => outside(l[0]) || outside(l[l.length - 1]));
  expect(out.length / lines.length, `${lines.length - out.length} of ${lines.length} lines end inside the window`).toBeGreaterThanOrEqual(.8);
 }, HEAVY);
});
describe('easy to confuse with', () => {
 it('sets its expressions at the size of the prose beside them, in the muted ink of what they are not', async () => {
  const restore = tokens(':root{--foreground:#102a3a;--muted-foreground:#8a99a3;--type-body:15px;--type-meta:13px}');
  try {
   const view = await openLesson('sheet');
   const open = view.container.querySelectorAll<HTMLDetailsElement>('details.exp-note')[1];
   open.open = true;
   fireEvent(open, new Event('toggle'));
   await waitFor(() => expect(view.container.querySelector('.exp-slip-math .katex')).toBeTruthy());
   const prose = view.container.querySelector<HTMLParagraphElement>('.exp-slip-note p')!;
   const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize), body = size(prose);
   // A fraction's numerator and denominator, but not an exponent: an exponent is meant to be small.
   const small: string[] = [];
   for (const frac of view.container.querySelectorAll('.exp-slip-math .mfrac')) {
    const walker = document.createTreeWalker(frac, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
     const el = node.parentElement!;
     // KaTeX pads its stacks with zero-width spaces set at a pixel; they are not type anyone reads.
     if (!/[^\s\u200b]/.test(node.textContent ?? '') || el.closest('.msupsub')) continue;
     if (size(el) < body - .5) small.push(`${node.textContent} at ${size(el).toFixed(1)}px`);
    }
   }
   expect(view.container.querySelectorAll('.exp-slip-math .mfrac').length).toBeGreaterThan(0);
   expect(small, `fraction parts set smaller than the ${body}px prose`).toEqual([]);
   // Fractional powers are written with a slash: no fraction stacked inside an exponent.
   expect(view.container.querySelectorAll('.exp-slip-math .msupsub .mfrac').length).toBe(0);
   // Not the prose's full ink: under the quantity's name, a wrong expression in it read as the answer.
   const math = view.container.querySelector('.exp-slip-math')!;
   expect(getComputedStyle(math).color).toBe('rgb(138, 153, 163)');
  } finally { restore(); }
 }, HEAVY);
});
describe('the lesson list', () => {
 it('says "disks", as every lesson does', async () => {
  const view = await openLesson('disk');
  const families = [...view.container.querySelectorAll('.exp-family-name')].map(h => h.textContent);
  expect(families).toContain('Rings, disks and arcs');
  expect(families.join(' ')).not.toMatch(/discs/);
 }, HEAVY);
});
