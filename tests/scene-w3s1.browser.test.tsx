import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {snapshotLayer} from '../src/diagrams/snapshot';
import {segmentGap} from '../src/diagrams/three/bodies';
/* THE SCENE IN THE EXPLORER AS IT SHIPS, WAVE 3, ITERATION 1.
 *
 * In Add them up the sum's arrow grew up through a mirror pair's parts along the axis, which were drawn whole to the
 * end of the merge: a chevron on the sum's shaft and a pale second head on its tip. A ring cut an odd number of ways
 * ended its sum with a stretch drawn as never added. A minus centred on a wire read as a cut across it. The gap
 * behind P whitened the middle of a disk P hovers half a metre over. And the sheet's first sign sat at O, under P,
 * as an origin crosshair. Each of these fails on the code before this change. */
afterEach(async () => {
 cleanup();
 // A URL left behind by one test beats the storage the next one writes; see build-ui's note.
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 // The Explorer saves on a 220ms debounce, and the previous test's pending save must not land on top of this one.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Each mounts the whole Explorer with its 3D scene: a second or two here, about 6.5 times that on the build machine. */
const HEAVY = 90000;
const stage = (view: View) => view.container.querySelector<HTMLElement>('.cd-field-stage');
const frames = (n = 4) => new Promise<void>(r => {let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);});
async function inSpace(view: View) {
 if (!view.container.querySelector('.cd-in-space')) {
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
 }
 await waitFor(() => expect(stage(view)?.dataset.sceneP).toBeTruthy(), {timeout: 20000});
}
async function turn(view: View, key: string, times: number) {
 const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
 fireEvent.pointerDown(svg, {clientX: 60, clientY: 60, pointerId: 1});
 fireEvent.pointerUp(svg, {pointerId: 1});
 svg.focus();
 for (let i = 0; i < times; i++) await userEvent.keyboard(`{${key}}`);
 await frames(40);
}
async function openRun(view: View) {
 await inSpace(view);
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('pieces'));
}
function scrub(view: View, n: number, fraction: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[n].getBoundingClientRect(), x = r.left + fraction * r.width;
 fireEvent.pointerDown(track, {clientX: x + (fraction > .5 ? -16 : 16), button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
/** CSS pixels to a unit of the figure's 720-unit viewBox. */
const unitPx = (view: View) => view.container.querySelector('svg.cd-svg')!.getBoundingClientRect().width / 720;
const point = (view: View, key: 'sceneP' | 'sceneO') => stage(view)!.dataset[key]!.split(' ').map(Number) as [number, number];
const list = (raw?: string) => (raw ?? '').split(' ').filter(Boolean).map(s => s.split(',').map(Number) as [number, number]);
/** The scene's own picture, through the offline copy's snapshot, as RGB laid on white paper at points in CSS pixels. */
async function pixels(view: View, at: readonly [number, number][]): Promise<number[][]> {
 const s = stage(view)!, url = snapshotLayer(s);
 expect(url, 'the scene gave no picture').toBeTruthy();
 const img = new Image();
 await new Promise<void>((resolve, reject) => {img.onload = () => resolve(); img.onerror = reject; img.src = url!;});
 const canvas = document.createElement('canvas');
 canvas.width = img.width; canvas.height = img.height;
 const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
 ctx.drawImage(img, 0, 0);
 const k = img.width / s.querySelector<HTMLElement>('.cd-stage-gl')!.clientWidth;
 return at.map(([x, y]) => {
  const [r, g, b, a] = ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
  return [r, g, b].map(c => c * a / 255 + 255 * (1 - a / 255)).concat(a);
 });
}

describe('the sum takes a mirror pair in as it grows over it, in space', () => {
 for (const id of ['ring', 'bisector']) it(`${id}: what is left of the pair's parts along the axis never lies under the sum's arrow`, async () => {
  const view = await openLesson(id);
  await openRun(view);
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  let merging = 0, fading = 0;
  for (let f = .3; f <= .96; f += .022) {
   scrub(view, 3, f);
   await frames(2);
   const s = stage(view)!.dataset;
   if (s.runTaken === undefined) continue;
   const taken = Number(s.runTaken), whole = Number(s.runWhole);
   if (taken > .05 && taken < .95) merging++;
   if (whole > .05 && whole < .95) fading++;
   const [x, y, z] = (s.sceneNet ?? '0 0 0').split(' ').map(Number), net = Math.hypot(x, y, z);
   for (const span of (s.runKeepSpan ?? '').split(';').filter(Boolean)) {
    const [name, start, end] = span.split(' ');
    expect(Number(start), `${id} at ${f.toFixed(3)}: ${name} starts under the sum (${net.toFixed(4)})`).toBeGreaterThanOrEqual(net - 1e-4);
    expect(Number(end)).toBeGreaterThan(Number(start));
   }
   // Once all of the pair is in, nothing of it is left drawn along the sum.
   if (taken >= .999) expect(s.runKeepSpan ?? '').toBe('');
  }
  expect(merging, 'frames caught mid-merge').toBeGreaterThan(0);
  expect(fading, 'frames caught with the whole arrows part-way gone').toBeGreaterThan(0);
 }, HEAVY);
 for (const slices of [3, 5, 7]) it(`ring cut ${slices} ways: at the end of the sum every stretch is in it or lit`, async () => {
  const view = await openLesson('ring', {slices});
  await openRun(view);
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  scrub(view, 3, .99);
  await waitFor(() => expect(stage(view)!.dataset.runStage).toBe('add'));
  await frames(4);
  const s = stage(view)!.dataset;
  expect(Number(s.runAddedSpan) + Number(s.runLitSpan)).toBeCloseTo(1, 4);
  expect(Number(s.runAddedSpan)).toBeGreaterThan(.5);
 }, HEAVY);
});

describe('a wire\'s sign stands beside it, and the tube is whole under every mark', () => {
 for (const [id, charge] of [['ring', -2], ['v-ring', -2], ['bisector', -2], ['ring', 2]] as const) it(`${id} with Q ${charge < 0 ? '< 0' : '> 0'}, at rest`, async () => {
  await page.viewport(1440, 900);
  const view = await openLesson(id, {charge});
  await inSpace(view);
  await frames(10);
  const s = stage(view)!.dataset, k = unitPx(view);
  expect(s.signRing).toBe('paper');
  const marks = list(s.signScreen), feet = list(s.signFeet);
  expect(marks.length).toBeGreaterThan(3);
  expect(feet.length).toBe(marks.length);
  // Each mark is off the tube: its middle further from the wire than the tube's half width and the glyph's half.
  marks.forEach(([x, y], i) => expect(Math.hypot(x - feet[i][0], y - feet[i][1]), `mark ${i}`).toBeGreaterThan(4.6 + 2));
  // And the tube under each is the tube: opaque orange, lit or in shade -- not the paper ring, which is white, nor
  // the ink, a deep orange with a third of its red in green. (An axis or a line may cross one or two of them.)
  const under = await pixels(view, feet.map(([x, y]) => [x * k, y * k] as [number, number]));
  const tube = under.filter(([r, g, b, a]) => a > 200 && r > b + 40 && g / r > .5 && g / r < .75).length;
  expect(tube, under.map(p => p.map(Math.round).join(',')).join(' ')).toBeGreaterThanOrEqual(Math.ceil(.75 * feet.length));
 }, HEAVY);
});

describe('P hovering over a disk leaves its face whole', () => {
 for (const size of [4, 8]) it(`disk R ${size / 2}, P half a metre up: no gap is cut in the face round P`, async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('disk', {distance: .5, size});
  await inSpace(view);
  fireEvent.click(view.getByRole('button', {name: 'Off'}));
  await frames(12);
  expect(stage(view)!.dataset.gapLift).toBe('0.000');
  const k = unitPx(view), [px, py] = point(view, 'sceneP'), [ox, oy] = point(view, 'sceneO');
  // The disk on the screen: an ellipse about O, R across and R sin(pitch) up, at the scale P's height gives.
  const pitch = .6, unit = Math.hypot(px - ox, py - oy) / k / (.5 * Math.cos(pitch)), R = size / 2;
  const grid: [number, number][] = [];
  for (let dy = -38; dy <= 38; dy += 2) for (let dx = -38; dx <= 38; dx += 2) {
   const d = Math.hypot(dx, dy), x = px / k + dx, y = py / k + dy;
   // In the gap's band round P, clear of P's own halo, and well inside the disk.
   if (d < 16 || d > 38 || ((x - ox / k) / (R * unit)) ** 2 + ((y - oy / k) / (R * Math.sin(pitch) * unit)) ** 2 > .8) continue;
   grid.push([x * k, y * k]);
  }
  expect(grid.length).toBeGreaterThan(40);
  const ink = await pixels(view, grid);
  // The bare face alone is drawn at about two fifths, its lightest bands at about a third; in the gap it fell to a
  // twelfth of that.
  const faint = ink.map((p, i) => [...p, (grid[i][0] - px) / k, (grid[i][1] - py) / k]).filter(p => p[3] < 40);
  expect(faint.length, `${faint.length} of ${ink.length} faint: ${faint.map(p => p.map(Math.round).join(',')).join(' ')} O-P ${((ox - px) / k).toFixed(1)},${((oy - py) / k).toFixed(1)}`).toBe(0);
 }, HEAVY);
 it('and at its own height P keeps the whole gap', async () => {
  const view = await openLesson('disk');
  await inSpace(view);
  await frames(6);
  expect(stage(view)!.dataset.gapLift).toBe('1.000');
 }, HEAVY);
});

describe('no sign mark on the sheet stands at O or on the line up to P', () => {
 for (const up of [0, 6]) it(`the sheet at rest${up ? `, tipped up ${up} times` : ''}`, async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('sheet');
  await inSpace(view);
  if (up) await turn(view, 'ArrowUp', up);
  await frames(10);
  const k = unitPx(view), [px, py] = point(view, 'sceneP'), [ox, oy] = point(view, 'sceneO');
  const P = {x: px / k, y: py / k}, O = {x: ox / k, y: oy / k};
  const marks = list(stage(view)!.dataset.signScreen);
  expect(marks.length).toBeGreaterThan(5);
  for (const [x, y] of marks) expect(segmentGap({x, y}, {x, y}, O, P), `mark at ${x},${y}; O at ${O.x.toFixed(1)},${O.y.toFixed(1)}`).toBeGreaterThanOrEqual(12);
 }, HEAVY);
});
