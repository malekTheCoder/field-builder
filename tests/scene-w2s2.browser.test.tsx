import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {snapshotLayer} from '../src/diagrams/snapshot';
import {boxGap, LINE_HEAD, paintedLabels} from '../src/diagrams/fieldlines';
import {BEHIND_GAP, NAME_MARGIN} from '../src/diagrams/three/bodies';
/* THE SCENE IN THE EXPLORER AS IT SHIPS, WAVE 2, ITERATION 2.
 *
 * The gap the charge leaves behind P was sized in CSS pixels, so on a phone it ate twice the charge: a ring tipped up
 * lost a quarter of its far arc, and a plus was left standing alone in the air where the arc had been. On a wire,
 * each sign mark's paper ring cut a white band across the tube, so the ring at rest read as cut into fifteen pieces.
 * Two 3D lines running together on the screen each carried a head at the same place. And the chain in Add them up
 * did not say which link the piece just lit had added. */
afterEach(async () => {
 cleanup();
 document.documentElement.classList.remove('dark');
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
async function turn(view: View, key: string, times: number) {
 const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
 fireEvent.pointerDown(svg, {clientX: 60, clientY: 60, pointerId: 1});
 fireEvent.pointerUp(svg, {pointerId: 1});
 svg.focus();
 for (let i = 0; i < times; i++) await userEvent.keyboard(`{${key}}`);
 // Long enough for the view's glide to settle, so P read off the stage is where the picture has it.
 await frames(40);
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
/** The scene's own picture, through the offline copy's snapshot, as RGBA at points in CSS pixels across the stage. */
async function pixels(view: View, at: readonly [number, number][]): Promise<Uint8ClampedArray[]> {
 const s = stage(view)!, url = snapshotLayer(s);
 expect(url, 'the scene gave no picture').toBeTruthy();
 const img = new Image();
 await new Promise<void>((resolve, reject) => {img.onload = () => resolve(); img.onerror = reject; img.src = url!;});
 const canvas = document.createElement('canvas');
 canvas.width = img.width; canvas.height = img.height;
 const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
 ctx.drawImage(img, 0, 0);
 const k = img.width / s.querySelector<HTMLElement>('.cd-stage-gl')!.clientWidth;
 return at.map(([x, y]) => ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data);
}
const sceneP = (view: View) => stage(view)!.dataset.sceneP!.split(' ').map(Number) as [number, number];

describe('the gap behind P is the figure\'s size, on a phone too', () => {
 it('ring on a phone, tipped up: the tube passes behind P with a gap the figure\'s size, not a quarter of the ring', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('ring');
  await inSpace(view);
  await turn(view, 'ArrowUp', 6);
  const [px, py] = sceneP(view), k = unitPx(view), grid: [number, number][] = [];
  for (let dy = -30; dy <= 30; dy += 1) for (let dx = -30; dx <= 30; dx += 1) if (Math.abs(dx) >= 2 && Math.hypot(dx, dy) >= 5 && Math.hypot(dx, dy) <= 30) grid.push([px + dx, py + dy]);
  const ink = await pixels(view, grid);
  // The tube: opaque and orange (red well above blue).
  const tube = grid.filter((_, i) => ink[i][3] > 230 && ink[i][0] - ink[i][2] > 60).map(([x, y]) => Math.hypot(x - px, y - py));
  expect(tube.length, 'the tube passes near P').toBeGreaterThan(0);
  const nearest = Math.min(...tube);
  // Cut within the hard radius in the figure's units -- about ten CSS pixels here, where it was twenty-two.
  expect(nearest).toBeGreaterThanOrEqual(BEHIND_GAP.hard * k - 2);
  expect(nearest).toBeLessThan(BEHIND_GAP.hard * k + 6);
 }, HEAVY);
 it('and no sign mark is left standing where the gap took the tube away', async () => {
  await page.viewport(390, 844);
  const view = await openLesson('ring');
  await inSpace(view);
  await turn(view, 'ArrowUp', 6);
  const [px, py] = sceneP(view), k = unitPx(view), P = {x: px / k, y: py / k};
  const marks = (stage(view)!.dataset.signScreen ?? '').split(' ').filter(Boolean).map(s => s.split(',').map(Number));
  expect(marks.length).toBeGreaterThan(3);
  for (const [x, y] of marks) expect(Math.hypot(x - P.x, y - P.y), `mark at ${x},${y}; P at ${P.x.toFixed(1)},${P.y.toFixed(1)}`).toBeGreaterThanOrEqual(BEHIND_GAP.outer - 1);
 }, HEAVY);
 it('the disk with P half a metre up: down the column beside P the face comes in smoothly, with no ruled floor', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('disk', {distance: .5});
  await inSpace(view);
  await frames(10);
  const [px, py] = sceneP(view), k = unitPx(view), column: [number, number][] = [];
  for (let dy = 0; dy <= 40; dy++) column.push([px - 25 * k, py + dy]);
  const ink = await pixels(view, column), alpha = ink.map(p => p[3]);
  // Its lower envelope over seven rows, so a field line or an axis crossing the column, a few pixels wide and only
  // ever adding ink, is not taken for the face: a ruled floor is a step that stays.
  const smooth = alpha.map((_, i) => Math.min(...alpha.slice(Math.max(0, i - 3), i + 4)));
  const steps = smooth.slice(1).map((a, i) => Math.abs(a - smooth[i]));
  expect(Math.max(...steps), alpha.join(' ')).toBeLessThanOrEqual(20);
 }, HEAVY);
});

describe('a sign mark on a wire is printed on the tube, not cut into it', () => {
 it('ring at rest: the marks are ringed with the tube, and no paper is laid round them', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('ring');
  await inSpace(view);
  await frames(10);
  expect(stage(view)!.dataset.signRing).toBe('tube');
  const k = unitPx(view), marks = (stage(view)!.dataset.signScreen ?? '').split(' ').filter(Boolean).map(s => s.split(',').map(Number));
  expect(marks.length).toBeGreaterThan(5);
  const around: [number, number][] = [];
  for (const [x, y] of marks) for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) around.push([(x + dx) * k, (y + dy) * k]);
  const ink = await pixels(view, around);
  // Opaque and nearly white is the paper ring that cut the tube; the tube and the ink are orange and brown.
  const paper = ink.filter(p => p[3] > 200 && p[0] > 232 && p[1] > 232 && p[2] > 232).length;
  expect(paper).toBe(0);
 }, HEAVY);
});

describe('two lines running together on the screen do not carry two heads', () => {
 for (const id of ['bisector', 'axial', 'endpoint', 'ramp', 'ring', 'arc', 'disk']) it(`${id}: at rest and turned, no two heads within a head and a half`, async () => {
  const view = await openLesson(id);
  await inSpace(view);
  await frames(6);
  const pairs = () => {
   const heads = (stage(view)!.dataset.lineHeads ?? '').split(' ').filter(Boolean).map(s => s.split(',').map(Number));
   const close: string[] = [];
   for (let i = 0; i < heads.length; i++) for (let j = i + 1; j < heads.length; j++) if (Math.hypot(heads[i][0] - heads[j][0], heads[i][1] - heads[j][1]) < 1.5 * LINE_HEAD.length) close.push(`${heads[i][0]},${heads[i][1]}`);
   return {count: heads.length, close};
  };
  const rest = pairs();
  expect(rest.count).toBeGreaterThan(4);
  expect(rest.close).toEqual([]);
  await turn(view, 'ArrowLeft', 6);
  expect(pairs().close).toEqual([]);
 }, HEAVY);
});

describe('the newest link of the chain is marked in space', () => {
 for (const id of ['ring', 'disk']) it(`${id}: in Add them up the walk's newest link is drawn as its own arrow; in Shrink them it is not`, async () => {
  const view = await openLesson(id);
  await inSpace(view);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(stage(view)?.dataset.runStage).toBe('pieces'));
  scrub(view, 3, .5);
  await frames(8);
  expect(stage(view)!.dataset.runStage).toBe('add');
  expect(stage(view)!.dataset.runNewest).toBe('true');
  scrub(view, 4, .5);
  await frames(8);
  expect(stage(view)!.dataset.runStage).toBe('limit');
  expect(stage(view)!.dataset.runNewest).toBe('false');
 }, HEAVY);
});

describe('the disk\'s sign marks keep clear of the names', () => {
 it('R = 4 with P half a metre up: every mark is a margin of paper away from every name', async () => {
  await page.viewport(1440, 900);
  const view = await openLesson('disk', {size: 8, distance: .5});
  await inSpace(view);
  await frames(10);
  const names = paintedLabels(view.container.querySelector('svg.cd-svg'));
  const marks = (stage(view)!.dataset.signScreen ?? '').split(' ').filter(Boolean).map(s => s.split(',').map(Number));
  expect(marks.length).toBeGreaterThan(5);
  // The mark's own half-size is 5.85 units of the figure (see `laySigns`).
  for (const [x, y] of marks) expect(boxGap({x, y}, names), `mark at ${x},${y}`).toBeGreaterThanOrEqual(5.85 + NAME_MARGIN - .5);
 }, HEAVY);
});
