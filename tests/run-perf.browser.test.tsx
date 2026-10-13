import * as React from 'react';
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
 * this machine, so a budget it can meet is one the old code met too. So beside the budget these count
 * the three things that made the frames expensive, which do not depend on the machine: renders of
 * the figure while the run holds it still, equations rewritten, and field redraws while the pieces
 * shrink. THE COUNTS ARE THE REGRESSION GUARDS; the time is a backstop for anything they miss.
 *
 * AND THE TIME IS MEASURED AGAINST THIS MACHINE, IN THIS RUN. It used to be an absolute budget --
 * a frame at sixty a second times a CI factor -- and the CI runners differ about fourfold from one
 * to the next, so on a slow one the ring's Shrink them (p95 153 to 205 ms against 146) failed and
 * main stopped deploying while the same code passed on a fast one (57 ms). Now each test first
 * times a fixed piece of work (`calibrate`: a React render and commit of a few hundred SVG nodes,
 * then a layout read, the same kinds of work a frame of the run is made of) and each stage's p95
 * frame must come in under `UNITS` of it. Measured on a Mac, the Mac under a 2x and a 4x CPU
 * throttle, a Linux container on four CPUs and on little more than one, and the CI runner, the
 * worst stage (the disk's Add them up) stays at 3.4 to 5 units while the unit goes from 2.5 to 11 ms.
 *
 * Both sides are timed with React's owner stacks off (`quietOwnerStacks`). React's development
 * build gives each element it creates an Error, for the owner stack in its warnings, and a console
 * task -- but only the first ten thousand in each second of wall clock. A machine that runs the
 * frames quickly spends that allowance in a few frames and makes the rest cheaply; a slow one spends
 * it across all of them. So its cost grows faster than the machine slows down, and on CI it was most
 * of a frame: with it off (and the ring's hidden pieces kept between frames, ChargeDiagram's
 * `RingHits`) the ring's Shrink p95 there went from 57 ms to 11. No production build pays it. */
afterEach(() => {
 cleanup();
 // A URL left behind by the last test beats the storage the next one writes; see build-ui.
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string) {
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
/** The slowest frames, not the average: a run that is smooth on average and hitches once a
 * second is exactly what a reader sees as stutter. */
const percentile = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
/** What a stage's p95 frame may cost, in units of `calibrate` measured in the same test. The worst stage
 * measures about 5 (see above) on every machine tried, and 8 leaves it room on a noisy runner; a
 * stage gone several times slower fails on any machine. A smaller slip is the counts' to catch. */
const UNITS = 8;
/** The stages that hold the figure still from their first frame to their last: the run's clock is
 * the only thing moving, and it moves only the transport. */
const STILL = (id: string) => ['Cut it up', id === 'disk' ? 'One ring' : 'One piece'];
/** What cancels holds the figure still too, except while its two sideways parts shrink into P: that
 * is read off the run's clock, in the middle third of the stage, one render a frame. */
const shrinkFrames = (id: string) => { const s = buildStages(getProblem(id as never))[2]; return s.pair ? Math.ceil(.35 * s.seconds / .05) + 1 : 0; };
/** React's development build keeps a count of the owner stacks it has captured this second and
 * captures none past ten thousand: set past it, every element is created as a production build would,
 * without an Error or a console task. Set before each timed frame, since React resets the count once a
 * second (see the header). A React that renames this only times the frames as they were timed before. */
const internals = (React as unknown as Record<string, {recentlyCreatedOwnerStacks?: number} | undefined>).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const quietOwnerStacks = () => { if (typeof internals?.recentlyCreatedOwnerStacks === 'number') internals.recentlyCreatedOwnerStacks = 1e9; };
/** The fixed work: three hundred groups of a path and a number, every attribute changed on every render. */
function Calibration({k}: {k: number}) {
 return <svg viewBox="0 0 720 430">{Array.from({length: 300}, (_, i) => <g key={i} className={`c${(i + k) % 3}`} style={{opacity: ((i + k) % 10) / 10}}><path d={`M${i} ${k}L${i + 10} ${k + 5}`} /><text x={i * 2} y={k + i % 40}>{(i * (k + 1)) % 97}</text></g>)}</svg>;
}
/** HOW FAST THIS MACHINE IS RIGHT NOW: the median of twenty-four timed renders of `Calibration`, each
 * with a layout read after it, once six have warmed it up. In milliseconds. */
function calibrate(): number {
 const host = document.body.appendChild(document.createElement('div')), times: number[] = [];
 quietOwnerStacks();
 const view = render(<Calibration k={0} />, {container: host});
 for (let k = 1; k <= 30; k++) {
  quietOwnerStacks();
  const t0 = performance.now();
  view.rerender(<Calibration k={k} />);
  for (const t of [...host.querySelectorAll('text')].slice(0, 30)) t.getBBox();
  times.push(performance.now() - t0);
 }
 view.unmount();
 host.remove();
 return percentile(times.slice(6), .5);
}
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
 const frameAt = (t: number) => { quietOwnerStacks(); const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); };
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
   const scene = ['ring', 'disk'].includes(id) && await waitFor(() => expect(view.container.querySelector('.cd-stage-gl canvas')).toBeTruthy(), {timeout: 8000}).then(() => true, () => { console.log(`[run-perf] ${id}: no WebGL scene here; timing the page without it`); return false; });
   // Timed here, in the page the run plays in, just before it plays.
   const unit = calibrate();
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
   const costs = new Map<string, number[]>(), figureRenders = new Map<string, number>(), fieldDraws = new Map<string, number>(), sceneTraces = new Map<string, number>();
   // How many times the 3D scene has traced its field, as it writes on its own layer.
   const traces = () => Number(view.container.querySelector<HTMLElement>('.cd-field-stage')?.dataset.fieldBuilds ?? 0);
   for (let t = 0; t <= end + 200; t += 50) {
    const r0 = renders(), d0 = draws(), g0 = traces(), t0 = performance.now();
    frameAt(t);
    const dt = performance.now() - t0;
    const s = stage(view);
    costs.set(s, [...(costs.get(s) ?? []), dt]);
    figureRenders.set(s, (figureRenders.get(s) ?? 0) + renders() - r0);
    fieldDraws.set(s, (fieldDraws.get(s) ?? 0) + draws() - d0);
    sceneTraces.set(s, (sceneTraces.get(s) ?? 0) + traces() - g0);
   }
   // The frames ran back to back without yielding, so the records are still queued: take them.
   tally(watch.takeRecords());
   watch.disconnect();
   const all = [...costs.values()].flat();
   const report = [...costs].map(([s, xs]) => `${s.padEnd(13)} mean ${mean(xs).toFixed(2).padStart(6)} ms  p95 ${percentile(xs, .95).toFixed(2).padStart(6)} ms  max ${Math.max(...xs).toFixed(2).padStart(6)} ms  (${xs.length} frames, figure rendered ${figureRenders.get(s)}, field drawn ${fieldDraws.get(s)}${scene ? `, scene traced ${sceneTraces.get(s)}` : ''})`);
   console.log(`[run-perf] ${id}: a unit is ${unit.toFixed(2)} ms here; p95 in units ${[...costs].map(([s, xs]) => `${s}=${(percentile(xs, .95) / unit).toFixed(1)}`).join(' ')}\n  ${report.join('\n  ')}\n  ${'whole run'.padEnd(13)} mean ${mean(all).toFixed(2).padStart(6)} ms  p95 ${percentile(all, .95).toFixed(2).padStart(6)} ms  equations rewritten ${rewrites}`);
   // It did play through, so the frames timed are the run's and not a stalled page's.
   expect([...costs.keys()]).toEqual(expect.arrayContaining([...STILL(id), 'What cancels', 'Add them up', 'Shrink them']));
   for (const [s, xs] of costs) expect(percentile(xs, .95) / unit, `${id} / ${s}: p95 frame cost (${percentile(xs, .95).toFixed(1)} ms), in units of this machine's ${unit.toFixed(2)} ms`).toBeLessThan(UNITS);
   // No equation is rebuilt from its markup while the run plays: none of them changes as it moves.
   expect(rewrites, 'equations rewritten during the run').toBe(0);
   // A stage that holds the figure still does not redraw it. A couple of renders are allowed for
   // the stage's own arrival -- the one before it can hand over in its last frame -- but not one a frame.
   for (const s of STILL(id)) expect(figureRenders.get(s), `${id} / ${s}: renders of a figure held still`).toBeLessThanOrEqual(3);
   expect(figureRenders.get('What cancels'), `${id} / What cancels: renders beyond the shrink`).toBeLessThanOrEqual(3 + shrinkFrames(id));
   // And while the pieces shrink, the field is not redrawn for every new cut: it is traced once,
   // from the cut the stage ends on, however many times the pieces double on the way.
   expect(fieldDraws.get('Shrink them') ?? 0, `${id}: field redraws while the pieces shrink`).toBeLessThanOrEqual(2);
   // The same in space: the disk used to trace its field lines again at every doubling of the cut,
   // with frames of up to twenty milliseconds. Now it keeps the field it began the stage with and
   // traces once, from the finest cut, on the frame the stage ends on.
   if (scene) {
    expect(traces(), `${id}: the scene never traced its field`).toBeGreaterThan(0);
    expect(sceneTraces.get('Shrink them') ?? 0, `${id}: 3D field traces while the pieces shrink`).toBeLessThanOrEqual(1);
   }
  }, 240000);
 }
});
