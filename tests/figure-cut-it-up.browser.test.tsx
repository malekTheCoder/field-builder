import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import '../app/globals.css';
import Explorer from '../src/explorer/Explorer';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
/* CUT IT UP CUTS THE CHARGE, ON EVERY LESSON, FLAT AND IN SPACE.
 *
 * "The Cut it up part of Watch it build does nothing for most lessons." It did nothing on any of them: the charge
 * was drawn in pieces, one of them lit and named ΔQ, from the stage's first frame, and the cuts it "made" were thin
 * marks in the charge's own colour laid exactly over the lines between pieces already there. In space the gaps
 * opened on the wall clock, two pixels wide, beside a piece already lit. The first frame and the last were the
 * same picture.
 *
 * So, frame by frame through the stage, with the run's frames in hand: the charge starts whole -- no cut made, no
 * piece named -- the cuts are made one after another, and it ends cut, every cut made, its piece named. Read from
 * what is painted (computed opacities, which the run's clock drives), and in space from what the scene says it has
 * drawn. No animation is switched off here: the animations are what is being tested. */
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Painted at all, all the way up: an ancestor at opacity 0 (the flat marks standing down in space) hides it. */
const opacity = (el: Element) => { let o = 1; for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
/** What the figure shows of the cutting: how many cuts are made out of how many, and whether the piece is named. */
function cutting(view: View) {
 const c = view.container, scene = c.querySelector<HTMLElement>('.cd-in-space .cd-field-stage[data-run-cutting]');
 const tag = c.querySelector('.cd-source-tag');
 const named = !!tag && opacity(tag) > .95, unnamed = !tag || opacity(tag) < .05;
 if (scene) {
  const [made, of] = scene.dataset.runCutting!.split(':')[0].split('/').map(Number);
  return {made, of, named: named && scene.dataset.runCutting!.endsWith('named'), unnamed: unnamed && scene.dataset.runCutting!.endsWith('cutting')};
 }
 const seams = [...c.querySelectorAll('.cd-stage-pieces .cd-seam:not(.is-growing)')];
 return {made: seams.filter(s => opacity(s) > .5).length, of: seams.length, named, unnamed};
}
describe('Cut it up goes from the whole charge to its pieces, and names one', () => {
 let queue: FrameRequestCallback[] = [];
 let realRaf: typeof window.requestAnimationFrame, realCancel: typeof window.cancelAnimationFrame;
 beforeEach(() => {
  queue = [];
  realRaf = window.requestAnimationFrame; realCancel = window.cancelAnimationFrame;
 });
 afterEach(() => { window.requestAnimationFrame = realRaf; window.cancelAnimationFrame = realCancel; });
 const frameAt = (t: number) => { const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); };
 const SPACE = new Set(['ring', 'disk', 'sheet', 'v-ring', 'v-disk']);
 const cases = [...PROBLEMS.map(p => [p.id, 'as it opens'] as const), ...[...SPACE].map(id => [id, 'flat'] as const)];
 for (const [id, how] of cases) it(`${id}, ${how}`, async () => {
  const view = await openLesson(id);
  if (how === 'flat') {
   fireEvent.click(view.getByRole('button', {name: '2D'}));
   await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeNull(), {timeout: 5000});
  }
  // In space, the scene is drawing before the run starts (its chunk arrives after the first paint). Where this
  // browser has no WebGL the figure draws itself flat, and the flat marks are read instead.
  if (view.container.querySelector('.cd-in-space')) await waitFor(() => expect(view.container.querySelector('.cd-stage-gl canvas') || !view.container.querySelector('.cd-in-space')).toBeTruthy(), {timeout: 10000});
  // The run's frames, in hand from here.
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  const seen: ReturnType<typeof cutting>[] = [];
  // The stage is five seconds long; a frame every fifty milliseconds, sampled every quarter second.
  for (let t = 0; t <= 4900; t += 50) {
   frameAt(t);
   if (t % 250 === 0) seen.push(cutting(view));
  }
  expect(view.container.querySelector('.cd-stage-label')?.textContent).toBe('Cut it up');
  const first = seen[0], last = seen[seen.length - 1];
  expect(first.of, `no cuts to make: ${JSON.stringify(seen)} ${view.container.querySelector('.cd-field-stage')?.outerHTML.slice(0, 400)}`).toBeGreaterThan(0);
  expect(first.made, 'the charge was already cut when the stage began').toBe(0);
  expect(first.unnamed, 'a piece was named before the charge was cut').toBe(true);
  expect(last.made, 'the stage ended with cuts still to make').toBe(last.of);
  expect(last.named, 'the stage ended with no piece named').toBe(true);
  // One after another, never all at once: some frame shows the charge part-way cut.
  expect(seen.some(s => s.made > 0 && s.made < s.of) || first.of === 1, 'every cut was made in the same frame').toBe(true);
  // And never undone along the way.
  for (let k = 1; k < seen.length; k++) expect(seen[k].made).toBeGreaterThanOrEqual(seen[k - 1].made);
 }, 60000);
});
