import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* The figure's box and its type, in the page it ships in.
 *
 * Round one of the critique found the drawing's layers drifting apart on any window that was not
 * exactly the drawing's shape, and nearly every symbol in the figure set in 13px grey sans by a
 * rule that was only meant for prose. These pin both, measured off the rendered page. */
let width = 0, height = 0;
beforeAll(() => { width = window.innerWidth; height = window.innerHeight; });
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 await page.viewport(width, height);
});
async function openLesson(id: string) {
 // The Explorer saves the open lesson on a debounce; a pending save from the test before can land
 // on top of this one's storage, so wait it out first.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
const settle = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
describe('one 720 by 430 box for every layer', () => {
 // The SVG was letterboxed inside a wider box while the field canvas, the 3D scene, its ticks and
 // the label placer all filled the whole box: at 1920 by 820 the field lines were stretched a third
 // wider than the drawing they belong to.
 for (const [w, h] of [[1920, 820], [1440, 900], [390, 844]] as const) {
  it(`at ${w} by ${h}, the stage and the drawing are the same box, and that box is the drawing's shape`, async () => {
   await page.viewport(w, h);
   const view = await openLesson('bisector');
   await settle();
   const stage = view.container.querySelector<HTMLElement>('.cd-stage')!.getBoundingClientRect();
   const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!.getBoundingClientRect();
   expect(Math.abs(stage.width - svg.width), 'width').toBeLessThanOrEqual(1);
   expect(Math.abs(stage.height - svg.height), 'height').toBeLessThanOrEqual(1);
   expect(Math.abs(stage.left - svg.left), 'left').toBeLessThanOrEqual(1);
   expect(Math.abs(stage.top - svg.top), 'top').toBeLessThanOrEqual(1);
   expect(Math.abs(stage.width / stage.height / (720 / 430) - 1), `${stage.width} by ${stage.height}`).toBeLessThan(.01);
   // And the box still fits the window it is in: the height budget holds.
   expect(stage.height).toBeLessThanOrEqual(Math.min(.62 * h, 700) + 1);
  }, 20000);
 }
});
describe('one type scale for the symbols', () => {
 it('the axis letters, the lengths and the triangle\'s letters are all one size, and a size to read', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  await waitFor(() => expect(view.container.querySelector('.cd-triangle text')).toBeTruthy());
  const size = (sel: string) => parseFloat(getComputedStyle(view.container.querySelector(sel)!).fontSize);
  const axes = size('.cd-axes text'), dims = size('.cd-dimension text'), triangle = size('.cd-triangle text');
  expect(axes).toBeGreaterThanOrEqual(16);
  expect(dims).toBe(axes);
  expect(triangle).toBe(axes);
  // In the display face's italic, not in the prose face the default rule sets.
  const style = getComputedStyle(view.container.querySelector('.cd-axes text')!);
  expect(style.fontStyle).toBe('italic');
  // The origin is the one letter set upright: in the italic serif its O was a narrow oval read as zero.
  expect(getComputedStyle(view.container.querySelector('.cd-origin')!).fontStyle).toBe('normal');
 });
 it('the charge\'s marks are the charge\'s colour, and the ones on a filled piece are the ground\'s', async () => {
  const view = await openLesson('bisector');
  const figure = view.container.querySelector<HTMLElement>('.charge-diagram')!;
  // The colour the stylesheet names for charge, resolved where the marks are.
  const swatch = document.createElement('span');
  swatch.style.color = 'var(--charge, #b8460f)';
  figure.appendChild(swatch);
  const charge = getComputedStyle(swatch).color;
  swatch.remove();
  const marks = [...view.container.querySelectorAll<SVGTextElement>('.cd-plus text')];
  expect(marks.length).toBeGreaterThan(2);
  const plain = marks.filter(m => !m.classList.contains('is-on-fill'));
  expect(plain.length).toBeGreaterThan(0);
  for (const m of plain) expect(getComputedStyle(m).fill).toBe(charge);
  // The chosen piece is filled with the charge's colour; a mark on it would vanish in the same colour.
  const onFill = marks.filter(m => m.classList.contains('is-on-fill'));
  expect(onFill.length).toBeGreaterThan(0);
  for (const m of onFill) expect(getComputedStyle(m).fill).not.toBe(charge);
 });
});
describe('the side view of a ring, a disk or a sheet', () => {
 // P = (0, 0, z) and its slider is "Height z": the vertical axis of that view is z, not y.
 it('names its axes x and z', async () => {
  const view = await openLesson('bisector');
  for (const short of ['Ring of charge', 'Disk of charge', 'Infinite sheet']) {
   const entry = [...view.container.querySelectorAll<HTMLElement>('.exp-shape-button')].find(b => b.textContent === short)!;
   fireEvent.click(entry);
   await waitFor(() => expect(view.container.querySelector('.charge-diagram.cd-surface-kind')).toBeTruthy());
   fireEvent.click(view.getByRole('button', {name: '2D'}));
   await waitFor(() => expect(view.container.querySelector('.charge-diagram.cd-in-space')).toBeNull(), {timeout: 4000});
   const letters = [...view.container.querySelectorAll('.cd-axes text')].map(t => t.textContent);
   expect(letters, short).toEqual(['x', 'z']);
  }
 }, 45000);
});
describe('on a phone', () => {
 it('the axis letters and the lengths stay readable as the drawing shrinks', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('bisector');
  await settle();
  await waitFor(() => {
   for (const sel of ['.cd-axes text', '.cd-dimension text'])
    expect(view.container.querySelector(sel)!.getBoundingClientRect().height, sel).toBeGreaterThanOrEqual(11);
  });
 }, 20000);
});
