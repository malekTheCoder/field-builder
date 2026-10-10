import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {snapshotLayer} from '../src/diagrams/snapshot';
import {boxGap, meetsBoxes, paintedLabels, type Box} from '../src/diagrams/fieldlines';
/* THE SCENE IN THE EXPLORER AS IT SHIPS, WAVE 2, ITERATION 1.
 *
 * Tipping the view up put P on the charge: the sheet's chosen ring under P, the ring's far arc through P's
 * halo. Add them up opened with the chain moved aside while it was a stub, a sideways stroke at P on the two
 * lessons where nothing sideways survives. Switching the page to dark left the scene in the light theme
 * until something else moved the view, because the page sets the theme in an effect that runs after the
 * scene's own. The window's edge fade, made for the endless sheet, dissolved the disk's chosen washer. And
 * the field's arrows, its lines' heads and the charge's sign marks were set on the figure's names. */
afterEach(async () => {
 cleanup();
 document.documentElement.classList.remove('dark');
 // A URL left behind by one test beats the storage the next one writes; see build-ui's note.
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLesson(id: string, params: Record<string, number> = {}, dark = false) {
 // The Explorer saves on a 220ms debounce, and the previous test's pending save must not land on
 // top of this one's lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Each mounts the whole Explorer with its 3D scene: a second or two here, about 6.5 times that on
 * the build machine. */
const HEAVY = 60000;
const stage = (view: View) => view.container.querySelector<HTMLElement>('.cd-field-stage');
const frames = (n = 4) => new Promise<void>(r => {let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);});
async function inSpace(view: View) {
 if (!view.container.querySelector('.cd-in-space')) {
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
 }
 await waitFor(() => expect(stage(view)?.dataset.sceneP).toBeTruthy(), {timeout: 20000});
}
/** Hold the run at a fraction of the way through one stage, as a reader dragging the bar does. */
function scrub(view: View, n: number, fraction: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[n].getBoundingClientRect(), x = r.left + fraction * r.width;
 fireEvent.pointerDown(track, {clientX: x + (fraction > .5 ? -16 : 16), button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
async function openRun(view: View) {
 await inSpace(view);
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('pieces'));
}
/** Turn the view with the figure's own arrow keys. */
async function turn(view: View, key: string, times: number) {
 const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
 fireEvent.pointerDown(svg, {clientX: 60, clientY: 60, pointerId: 1});
 fireEvent.pointerUp(svg, {pointerId: 1});
 svg.focus();
 for (let i = 0; i < times; i++) await userEvent.keyboard(`{${key}}`);
 await frames(6);
}
/** How much the scene has drawn at points round P, as alpha out of 255: the scene's own picture, taken
 * through the offline copy's snapshot, which draws it afresh and hands it back. `at` are offsets from P in
 * CSS pixels. */
async function inkRound(view: View, at: readonly [number, number][], over = false): Promise<number[]> {
 const s = stage(view)!, [px, py] = s.dataset.sceneP!.split(' ').map(Number);
 const url = snapshotLayer(s);
 expect(url, 'the scene gave no picture').toBeTruthy();
 const img = new Image();
 await new Promise<void>((resolve, reject) => {img.onload = () => resolve(); img.onerror = reject; img.src = url!;});
 const canvas = document.createElement('canvas');
 canvas.width = img.width; canvas.height = img.height;
 const ctx = canvas.getContext('2d')!;
 ctx.drawImage(img, 0, 0);
 const gl = s.querySelector<HTMLElement>('.cd-stage-gl')!, k = img.width / gl.clientWidth;
 return at.map(([dx, dy]) => {
  const [r, g, b, a] = ctx.getImageData(Math.round((px + dx) * k), Math.round((py + dy) * k), 1, 1).data;
  if (!over) return a;
  // How dark the scene is there, laid on white paper: alpha alone counts every translucent layer stacked on
  // the next, however pale each one is.
  const on = (c: number) => c * a / 255 + 255 * (1 - a / 255);
  return 255 - (.299 * on(r) + .587 * on(g) + .114 * on(b));
 });
}
/** Points on an arc below P, `radius` CSS pixels out: the middle value is what the surface is there, whatever
 * field line, axis or tick happens to cross one or two of them. */
const arc = (radius: number): [number, number][] => Array.from({length: 15}, (_, i) => {const a = (20 + i * 10) * Math.PI / 180; return [radius * Math.cos(a), radius * Math.sin(a)];});
const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
/** CSS pixels to a unit of the figure's 720-unit viewBox, as the page is laid out now. */
const unitPx = (view: View) => view.container.querySelector('svg.cd-svg')!.getBoundingClientRect().width / 720;
/** The figure's names where they are painted now, in its viewBox, unpadded. */
const names = (view: View): Box[] => paintedLabels(view.container.querySelector('svg.cd-svg'), 0);
/** "x0,y0,x1,y1 x0,y0,x1,y1 ..." as segments. */
const segments = (list?: string) => (list ?? '').split(' ').filter(Boolean).map(s => s.split(',').map(Number)).map(([x0, y0, x1, y1]) => ({a: {x: x0, y: y0}, b: {x: x1, y: y1}}));

describe('the charge behind P leaves a gap round it', () => {
 // THE CHOSEN RING IS DIMMED BEHIND P, NOT ERASED (wave 2, iteration 2): it keeps PIECE_FAR_LOW of itself in the
 // gap, so a piece the stage is about is never cut away -- the disk's washer with P just above it was drawn as a
 // U. So what is measured is how dark the scene is round P against the ring away from it, on paper: the plane
 // and everything else under P still give way, and the ring there is plainly fainter than where it is whole.
 it('the sheet tipped up: the ring is dimmed just below P, and the plane is gone there', async () => {
  const view = await openLesson('sheet');
  await inSpace(view);
  await turn(view, 'ArrowUp', 6);
  // The gap is measured in the figure's own units now (see BEHIND_GAP), so the arcs are too.
  const k = unitPx(view), near = await inkRound(view, arc(18 * k), true), far = await inkRound(view, arc(60 * k), true);
  expect(median(near), `darkness round P: ${near.map(v => v.toFixed(0)).join(' ')}; away: ${far.map(v => v.toFixed(0)).join(' ')}`).toBeLessThan(.6 * Math.max(...far));
  // Further from P the chosen ring is drawn as strongly as ever.
  const away = await inkRound(view, arc(60 * k));
  expect(Math.max(...away), `alpha away from P: ${away.join(' ')}`).toBeGreaterThan(150);
 }, HEAVY);
 it('the sheet walked out to its third ring: its far rim passes behind P dimmed', async () => {
  const view = await openLesson('sheet');
  await openRun(view);
  scrub(view, 3, .55);
  await frames(8);
  const k = unitPx(view), near = await inkRound(view, arc(18 * k), true), far = await inkRound(view, arc(60 * k), true);
  expect(median(near), `darkness round P: ${near.map(v => v.toFixed(0)).join(' ')}; away: ${far.map(v => v.toFixed(0)).join(' ')}`).toBeLessThan(.6 * Math.max(...far));
 }, HEAVY);
 it('the ring of the potential seen from above: its far arc is cut where it passes behind P', async () => {
  // The view the critic found it in: the far arc passed about seventeen pixels above P, on its halo.
  await page.viewport(1440, 900);
  const view = await openLesson('v-ring');
  await inSpace(view);
  await turn(view, 'ArrowUp', 6);
  // Every pixel within forty of P, off the z axis that runs through it and outside P's own dot: the nearest
  // one the tube paints is just outside the gap, so the tube does pass close by P, and is cut there.
  const grid: [number, number][] = [];
  for (let dy = -40; dy <= 40; dy += 1) for (let dx = -40; dx <= 40; dx += 1) if (Math.abs(dx) >= 3 && Math.hypot(dx, dy) >= 9 && Math.hypot(dx, dy) <= 40) grid.push([dx, dy]);
  const ink = await inkRound(view, grid);
  const nearest = Math.min(...grid.filter((_, i) => ink[i] > 230).map(([dx, dy]) => Math.hypot(dx, dy)));
  expect(nearest).toBeGreaterThanOrEqual(21);
  expect(nearest).toBeLessThanOrEqual(30);
 }, HEAVY);
});

describe('Add them up does not open with a sideways stub at P', () => {
 for (const id of ['sheet', 'disk']) it(`${id}: the first links stay on P, and the chain is moved aside by less than a third of its length`, async () => {
  const view = await openLesson(id);
  await openRun(view);
  scrub(view, 3, .25);
  await frames(6);
  await waitFor(() => expect(stage(view)?.dataset.runChainShown).toBeTruthy());
  const shift = Number(stage(view)!.dataset.runChainShift), shown = Number(stage(view)!.dataset.runChainShown);
  expect(shift, `shown ${shown}`).toBeLessThanOrEqual(.3 * shown + 1e-9);
  scrub(view, 3, .8);
  await frames(6);
  await waitFor(() => expect(Number(stage(view)?.dataset.runChainShown)).toBeGreaterThan(30));
  // Once it is long enough to be buried in the net arrow, it is beside it.
  expect(Number(stage(view)!.dataset.runChainShift)).toBeGreaterThan(0);
  // And as the pieces shrink it comes back onto the net arrow: at the end of the run it is the integral.
  scrub(view, 4, .995);
  await frames(8);
  await waitFor(() => expect(Number(stage(view)?.dataset.runChainShift)).toBeLessThan(.5));
 }, HEAVY);
});

describe('the scene follows the theme as soon as it changes', () => {
 it('ring: switched to dark, the scene is drawn as a page loaded in dark draws it', async () => {
  let view = await openLesson('ring');
  await inSpace(view);
  const light = stage(view)!.dataset.lineInk;
  expect(stage(view)!.dataset.sceneTheme).toBe('light');
  // The page sets the theme in an effect that runs after the scene's own, so to the scene a switch is the
  // document's class changing with nothing of its own re-rendering. That alone must redraw it.
  document.documentElement.classList.add('dark');
  await frames(2);
  const switched = stage(view)!.dataset.lineInk, part = stage(view)!.dataset.partColour;
  expect(switched).not.toBe(light);
  expect(stage(view)!.dataset.sceneTheme).toBe('dark');
  // And through the page's own button, back and forth.
  document.documentElement.classList.remove('dark');
  await frames(2);
  expect(stage(view)!.dataset.lineInk).toBe(light);
  fireEvent.click(view.getByRole('button', {name: 'Switch to dark theme'}));
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
  await frames(2);
  expect(stage(view)!.dataset.lineInk).toBe(switched);
  cleanup();
  document.documentElement.classList.remove('dark');
  window.history.replaceState(null, '', '/');
  view = await openLesson('ring', {}, true);
  await inSpace(view);
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
  await frames(4);
  expect(stage(view)!.dataset.lineInk).toBe(switched);
  expect(stage(view)!.dataset.partColour).toBe(part);
 }, HEAVY);
});

describe('the window\'s edge fade is the endless sheet\'s alone', () => {
 it('on the disk the chosen washer and the summed shading are not dissolved at the window\'s edge', async () => {
  const view = await openLesson('disk', {size: 8});
  await inSpace(view);
  expect(stage(view)!.dataset.edgeFade).toBe('0');
  cleanup();
  window.history.replaceState(null, '', '/');
  const sheet = await openLesson('sheet');
  await inSpace(sheet);
  expect(stage(sheet)!.dataset.edgeFade).toBe('1');
 }, HEAVY);
});

describe('the field and the charge\'s marks give way to the names', () => {
 it('3D arrows on the sheet turned left and on the ring: none runs through a name', async () => {
  for (const id of ['sheet', 'ring']) {
   const view = await openLesson(id);
   await inSpace(view);
   fireEvent.click(view.getByRole('button', {name: 'Arrows'}));
   if (id === 'sheet') await turn(view, 'ArrowLeft', 6);
   await waitFor(() => expect(stage(view)?.dataset.latticeScreen).toBeTruthy());
   await frames(6);
   const boxes = names(view), arrows = segments(stage(view)!.dataset.latticeScreen);
   expect(arrows.length).toBeGreaterThan(10);
   expect(boxes.length).toBeGreaterThan(3);
   const through = arrows.filter(s => meetsBoxes(s.a, s.b, boxes));
   expect(through, id).toEqual([]);
   cleanup();
   window.history.replaceState(null, '', '/');
  }
 }, HEAVY);
 it('3D lines round the disk: no head sits on a name', async () => {
  const view = await openLesson('disk');
  await inSpace(view);
  await waitFor(() => expect(stage(view)?.dataset.lineHeads).toBeTruthy());
  await frames(6);
  const boxes = names(view), heads = (stage(view)!.dataset.lineHeads ?? '').split(' ').filter(Boolean).map(h => h.split(',').map(Number));
  expect(heads.length).toBeGreaterThan(8);
  for (const [x, y, dx, dy] of heads) expect(meetsBoxes({x: x - dx * 3.25, y: y - dy * 3.25}, {x: x + dx * 3.25, y: y + dy * 3.25}, boxes), `${x},${y}`).toBe(false);
 }, HEAVY);
 for (const id of ['semi', 'bisector']) it(`flat ${id}: no arrow and no head runs through a name`, async () => {
  for (const mode of ['Arrows', 'Field lines']) {
   const view = await openLesson(id);
   fireEvent.click(view.getByRole('button', {name: mode}));
   const canvas = () => view.container.querySelector<HTMLElement>('.cd-field-canvas');
   await waitFor(() => expect(canvas()?.dataset.fieldMarks).toBeTruthy());
   await frames(6);
   const boxes = names(view), marks = segments(canvas()!.dataset.fieldMarks);
   expect(marks.length).toBeGreaterThan(mode === 'Arrows' ? 40 : 6);
   expect(marks.filter(s => meetsBoxes(s.a, s.b, boxes)), `${id} ${mode}`).toEqual([]);
   cleanup();
   window.history.replaceState(null, '', '/');
  }
 }, HEAVY);
 it('on a phone the disk writes no sign on a name, on P or on the sum', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('disk');
  await inSpace(view);
  await waitFor(() => expect(stage(view)?.dataset.signScreen).toBeTruthy());
  await frames(8);
  const boxes = names(view), marks = (stage(view)!.dataset.signScreen ?? '').split(' ').filter(Boolean).map(m => m.split(',').map(Number));
  expect(marks.length).toBeGreaterThan(4);
  for (const [x, y] of marks) expect(boxGap({x, y}, boxes), `${x},${y}`).toBeGreaterThanOrEqual(5.85);
 }, HEAVY);
});
