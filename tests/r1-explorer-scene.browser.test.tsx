import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {PLOT} from '../src/diagrams/vectorfield';
/* THE LAYERS UNDER THE FIGURE STAY INSIDE ITS WINDOW, AND CARRY NO NUMBERS.
 *
 * The field canvas and the 3D scene are rectangles the size of the whole figure, while the SVG
 * drawn over them clips itself to a rounded window above the caption. Unclipped, the field lines
 * struck through the caption and ran out to the edges of the card, and on the sheet the plane and
 * its grid painted over everything below the picture. And the 3D axes carried metre values -- the
 * only numerals left on the page, landing on the net arrow and the potential column. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
describe('the 3D scene', () => {
 for (const id of ['ring', 'disk', 'sheet', 'bisector'] as const) it(`${id}: no numbers on the axes, and the scene is cut to the window`, async () => {
  const view = await openLesson(id);
  // The rod opens flat; turned into space it draws the same scene the round shapes open in.
  if (id === 'bisector') fireEvent.click(view.getByRole('button', {name: '3D'}));
  const stage = await waitFor(() => { const el = view.container.querySelector<HTMLElement>('.cd-field-stage'); expect(el).toBeTruthy(); return el!; });
  // Whether or not this browser has WebGL: the numbers were written in the page, not the scene.
  await new Promise(r => setTimeout(r, 120));
  expect(view.container.querySelectorAll('.cd-stage-tick').length).toBe(0);
  expect(stage.textContent ?? '').not.toMatch(/\d/);
  // The window, in percentages of the frame the layer fills: the same rectangle the SVG clips to.
  const clip = getComputedStyle(stage).clipPath;
  expect(clip).toMatch(/^inset\(/);
  const [top, right, bottom, left] = clip.slice(6).split(/\s+/).slice(0, 4).map(parseFloat);
  expect(top).toBeCloseTo(100 * PLOT.y / 430, 2);
  expect(left).toBeCloseTo(100 * PLOT.x / 720, 2);
  expect(right).toBeCloseTo(100 * (720 - PLOT.x - PLOT.width) / 720, 2);
  expect(bottom).toBeCloseTo(100 * (430 - PLOT.y - PLOT.height) / 430, 2);
 }, 15000);
});
describe('the flat field', () => {
 // Spies call through, so the canvas is still drawn; they only remember what was asked of it.
 const names = ['clip', 'stroke', 'save', 'restore', 'moveTo'] as const;
 let spies: MockInstance[] = [];
 beforeEach(() => { spies = names.map(name => vi.spyOn(CanvasRenderingContext2D.prototype, name)); });
 afterEach(() => { for (const s of spies) s.mockRestore(); });
 /** Every call made of the field canvas, in the order it was made. */
 const log = () => spies.flatMap((spy, k) => spy.mock.contexts.map((ctx, i) => ({name: names[k], ctx: ctx as CanvasRenderingContext2D, order: spy.mock.invocationCallOrder[i], args: spy.mock.calls[i] as number[]})))
  .filter(c => c.ctx.canvas.closest('.cd-field-canvas')).sort((a, b) => a.order - b.order);
 const calls = () => log().map(c => c.name);
 const moves = () => log().filter(c => c.name === 'moveTo').map(c => ({x: c.args[0], y: c.args[1]}));
 for (const view of ['Field lines', 'Arrows'] as const) it(`${view}: the canvas is clipped to the window before anything is drawn`, async () => {
  const lesson = await openLesson('arc');
  if (view === 'Arrows') fireEvent.click(lesson.getByRole('button', {name: 'Arrows'}));
  await waitFor(() => expect(calls().filter(c => c === 'stroke').length).toBeGreaterThan(3));
  // Every pass clips first and puts the state back after.
  const passes = calls().filter(c => c !== 'moveTo').join(' ').split('save').slice(1);
  expect(passes.length).toBeGreaterThan(0);
  for (const pass of passes) {
   const order = pass.trim().split(' ');
   if (!order.includes('stroke')) continue;
   expect(order.indexOf('clip'), pass).toBeGreaterThanOrEqual(0);
   expect(order.indexOf('clip')).toBeLessThan(order.indexOf('stroke'));
   expect(order.at(-1)).toBe('restore');
  }
 }, 15000);
 it('arrows cover the window the infinite line is seen through, not a square of its reach', async () => {
  // The picture of a line that never ends is far wider than it is tall, and the lattice used to
  // stop a third of the way across it.
  await page.viewport(1440, 900);
  const lesson = await openLesson('infinite');
  // Only what is drawn as arrows: the lines drawn before them run to the edges of the window anyway.
  for (const spy of spies) spy.mockClear();
  fireEvent.click(lesson.getByRole('button', {name: 'Arrows'}));
  await waitFor(() => expect(moves().length).toBeGreaterThan(40));
  const xs = moves().map(m => m.x);
  expect(Math.max(...xs), 'the arrows stop short of the right of the window').toBeGreaterThan(PLOT.x + .85 * PLOT.width);
  expect(Math.min(...xs), 'the arrows stop short of the left of the window').toBeLessThan(PLOT.x + .15 * PLOT.width);
 }, 15000);
});
