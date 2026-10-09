import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {buildStages, totalSeconds} from '../src/explorer/buildRun';
/* WHAT ONE FRAME OF THE RUN COSTS, stage by stage.
 *
 * "Watch it build" is the centre of the page, and it was the one part of it that stuttered. Every
 * frame of the run set half a dozen pieces of state, and every one of them re-rendered the whole
 * Explorer -- the lesson list, the sliders, the figure with its label layout, the board -- and each
 * of those renders rewrote every equation on the page from its markup, because the object holding
 * that markup was new each time. The last stage re-cut the charge on every frame as well, and handed
 * the field canvas a new charge to trace at every doubling. Measured on the machine this was written
 * on, a frame cost ten milliseconds on average and twenty to thirty at the slowest; nobody could see
 * it in a test, because nothing timed it.
 *
 * These drive the run frame by frame at a steady fifty milliseconds, exactly as the transport tests
 * do, and time each frame's whole synchronous cost: the render, the commit, the layout effects that
 * measure the labels, and whatever the frame before it queued (the field canvas draws on the next
 * frame). The figures go to the console per stage, so a regression says WHERE it is.
 *
 * A time budget alone cannot hold the line, though: CI runs about six and a half times slower than
 * this machine, so a budget it can meet is one the old code met too. So beside the generous budget
 * these count the three things that made the frames expensive, which do not depend on the machine:
 * renders of the figure while the run holds it still, equations rewritten, and field redraws while
 * the pieces shrink. */
afterEach(() => {
 cleanup();
 // A URL left behind by the last test beats the storage the next one writes; see build-ui.
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string) {
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
/** The slowest frames, not the average: a run that is smooth on average and hitches once a
 * second is exactly what a reader sees as stutter. */
const percentile = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
/** One frame at sixty a second is what a frame may cost here, at the 95th percentile; CI gets its
 * margin on top. The run measures a few milliseconds at worst on this machine, so this is slack for
 * a slow runner, not a target -- the counts below are what pin the fixes in place. */
const FRAME_MS = 1000 / 60;
const CI_FACTOR = 6.5;
/** The stages that hold the figure still from their first frame to their last: the run's clock is
 * the only thing moving, and it moves only the transport. */
const STILL = ['Cut it up', 'One piece', 'What cancels'];
describe('a frame of the run is cheap enough to be smooth', () => {
 let queue: FrameRequestCallback[] = [];
 let realRaf: typeof window.requestAnimationFrame, realCancel: typeof window.cancelAnimationFrame;
 let clears: MockInstance<CanvasRenderingContext2D['clearRect']>;
 beforeEach(() => {
  queue = [];
  realRaf = window.requestAnimationFrame; realCancel = window.cancelAnimationFrame;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
  // Every redraw of the field canvas starts by clearing it, so counting the clears counts redraws.
  // The spy calls through: the canvas is still drawn.
  clears = vi.spyOn(CanvasRenderingContext2D.prototype, 'clearRect');
 });
 afterEach(() => {
  window.requestAnimationFrame = realRaf; window.cancelAnimationFrame = realCancel;
  clears.mockRestore();
 });
 const frameAt = (t: number) => { const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); };
 const stage = (view: {container: HTMLElement}) => view.container.querySelector('.cd-stage-label')?.textContent ?? '';
 const draws = () => clears.mock.contexts.filter(c => (c as CanvasRenderingContext2D).canvas.closest('.cd-field-canvas')).length;
 // The ring and the disk open in space, so their frames include the WebGL stage as well; the rod
 // and the infinite line are flat, and draw their field on the canvas.
 for (const id of ['bisector', 'ring', 'disk', 'infinite'] as const) {
  it(`${id}: every stage under budget`, async () => {
   const view = await openLesson(id);
   // The 3D scene loads three.js on its own schedule; time it once it is there, or the frames
   // measured would be the cheaper ones of a page that has not drawn its scene yet.
   // Waited for, not required: a runner with no WebGL at all still has every other cost to time.
   if (['ring', 'disk'].includes(id)) await waitFor(() => expect(view.container.querySelector('.cd-stage-gl canvas')).toBeTruthy(), {timeout: 8000}).catch(() => console.log(`[run-perf] ${id}: no WebGL scene here; timing the page without it`));
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   const figure = view.container.querySelector<HTMLElement>('.charge-diagram')!;
   const renders = () => Number(figure.dataset.renders);
   // An equation rewritten in place shows up as its own children being replaced. Mounting a new
   // one does not: its markup is set before it is attached.
   let rewrites = 0;
   const tally = (records: MutationRecord[]) => { for (const r of records) if (r.type === 'childList' && r.target instanceof Element && r.target.matches('.math')) rewrites++; };
   const watch = new MutationObserver(tally);
   watch.observe(view.container, {subtree: true, childList: true});
   const end = totalSeconds(buildStages(getProblem(id))) * 1000;
   const costs = new Map<string, number[]>(), figureRenders = new Map<string, number>(), fieldDraws = new Map<string, number>();
   for (let t = 0; t <= end + 200; t += 50) {
    const r0 = renders(), d0 = draws(), t0 = performance.now();
    frameAt(t);
    const dt = performance.now() - t0;
    const s = stage(view);
    costs.set(s, [...(costs.get(s) ?? []), dt]);
    figureRenders.set(s, (figureRenders.get(s) ?? 0) + renders() - r0);
    fieldDraws.set(s, (fieldDraws.get(s) ?? 0) + draws() - d0);
   }
   // The frames ran back to back without yielding, so the records are still queued: take them.
   tally(watch.takeRecords());
   watch.disconnect();
   const all = [...costs.values()].flat();
   const report = [...costs].map(([s, xs]) => `${s.padEnd(13)} mean ${mean(xs).toFixed(2).padStart(6)} ms  p95 ${percentile(xs, .95).toFixed(2).padStart(6)} ms  max ${Math.max(...xs).toFixed(2).padStart(6)} ms  (${xs.length} frames, figure rendered ${figureRenders.get(s)}, field drawn ${fieldDraws.get(s)})`);
   console.log(`[run-perf] ${id}\n  ${report.join('\n  ')}\n  ${'whole run'.padEnd(13)} mean ${mean(all).toFixed(2).padStart(6)} ms  p95 ${percentile(all, .95).toFixed(2).padStart(6)} ms  equations rewritten ${rewrites}`);
   // It did play through, so the frames timed are the run's and not a stalled page's.
   expect([...costs.keys()]).toEqual(expect.arrayContaining(['Cut it up', 'One piece', 'What cancels', 'Add them up', 'Shrink them']));
   for (const [s, xs] of costs) expect(percentile(xs, .95), `${id} / ${s}: p95 frame cost, ms`).toBeLessThan(FRAME_MS * CI_FACTOR);
   // No equation is rebuilt from its markup while the run plays: none of them changes as it moves.
   expect(rewrites, 'equations rewritten during the run').toBe(0);
   // A stage that holds the figure still does not redraw it. A couple of renders are allowed for
   // the stage's own arrival -- the one before it can hand over in its last frame -- but not one a frame.
   for (const s of STILL) expect(figureRenders.get(s), `${id} / ${s}: renders of a figure held still`).toBeLessThanOrEqual(3);
   // And while the pieces shrink, the field is not redrawn for every new cut: it is traced once,
   // from the cut the stage ends on, however many times the pieces double on the way.
   expect(fieldDraws.get('Shrink them') ?? 0, `${id}: field redraws while the pieces shrink`).toBeLessThanOrEqual(2);
  }, 240000);
 }
});
