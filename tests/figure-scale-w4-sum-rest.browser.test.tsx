import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE SUM'S OWN VIEW, OUTSIDE THE RUN. A teacher's link to the sum -- `?mode=sum`, with or without the pair -- drew the
 * tip-to-tail chain on the four lessons with a mirror: on the bisector and the endless line an arch over P, on the
 * ring a zig-zag, on the arc a loop -- the picture the owner took out of Add them up. It is the run's finished Add
 * them up now: the sum along the axis, a tick across it where each pair's share ends. The lessons with no mirror keep
 * their chain. And the chain's joints, where it is drawn, stop short of the sum's arrowhead. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1440, 900); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string, search = '') {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 await waitFor(() => expect(view.container.querySelector<HTMLElement>('.charge-diagram')?.dataset.moving).toBe('false'), {timeout: 4000});
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
const svgOf = (v: View) => v.container.querySelector<SVGSVGElement>('.cd-svg')!;
const shaftOf = (g: Element | null) => { const [x1, y1, x2, y2] = (g as HTMLElement).dataset.shaft!.split(' ').map(Number); return {x1, y1, x2, y2}; };

describe('a link to the sum on a lesson with a mirror draws the pairs, not the chain', () => {
 for (const search of ['?p=bisector&mode=sum', '?p=bisector&mode=sum&pair=1', '?p=infinite&mode=sum', '?p=arc&mode=sum&pair=1', '?p=ring&mode=sum']) {
  it(search, async () => {
   const id = /p=(\w+)/.exec(search)![1];
   const v = await openLesson(id, search);
   const svg = svgOf(v);
   expect(svg.querySelector('.cd-sum-chain'), 'no tip-to-tail chain').toBeNull();
   expect(Number(svg.querySelector('[data-pair-ticks]')?.getAttribute('data-pair-ticks')), 'a tick where each pair\'s share ends').toBeGreaterThanOrEqual(1);
   // The sum lies along the axis through P: across the page on the rods and the arc, straight up the ring's axis.
   const s = shaftOf(svg.querySelector('.cd-sum-arrow .cd-vector'));
   if (id === 'ring') expect(Math.abs(s.x2 - s.x1), 'up the axis').toBeLessThan(1);
   else expect(Math.abs(s.y2 - s.y1), 'along the axis').toBeLessThan(1);
  }, 60000);
 }
 it('the lessons with no mirror keep their chain', async () => {
  const v = await openLesson('axial', '?p=axial&mode=sum');
  expect(svgOf(v).querySelector('.cd-sum-chain')).toBeTruthy();
  expect(svgOf(v).querySelector('[data-pair-ticks]')).toBeNull();
 }, 60000);
});

describe('the chain\'s joints', () => {
 it('Add them up on the rod with a foot: no joint on the sum\'s arrowhead', async () => {
  await new Promise(r => setTimeout(r, 280));
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'endpoint', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {endpoint: {...DEFAULT_PARAMS}}}));
  const v = render(<Explorer />);
  await v.findByRole('button', {name: 'Watch it build'});
  fireEvent.click(v.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(await v.findByRole('button', {name: /^Stage 4: /}));
  const track = v.container.querySelector<HTMLElement>('.bp-track')!, seg = [...v.container.querySelectorAll<HTMLElement>('.bp-seg')][3], box = seg.getBoundingClientRect(), x = box.left + .98 * box.width;
  fireEvent.pointerDown(track, {clientX: x - 6, button: 0, pointerId: 7}); fireEvent.pointerMove(track, {clientX: x, pointerId: 7}); fireEvent.pointerUp(track, {clientX: x, pointerId: 7}); fireEvent.click(seg, {clientX: x});
  await waitFor(() => expect(svgOf(v).querySelector('.cd-sum-arrow .cd-vector[data-shaft]')).toBeTruthy(), {timeout: 5000});
  await new Promise(r => setTimeout(r, 300));
  const tip = shaftOf(svgOf(v).querySelector('.cd-sum-arrow .cd-vector'));
  const joints = [...svgOf(v).querySelectorAll('.cd-sum-joint')];
  expect(joints.length, 'the chain\'s joints are drawn').toBeGreaterThan(0);
  for (const j of joints) expect(Math.hypot(Number(j.getAttribute('cx')) - tip.x2, Number(j.getAttribute('cy')) - tip.y2), 'a joint on the head').toBeGreaterThan(4);
 }, 60000);
});
