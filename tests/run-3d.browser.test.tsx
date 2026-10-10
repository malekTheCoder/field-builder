import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {openingCamera} from '../src/diagrams/camera';
/* WATCH IT BUILD, IN SPACE.
 *
 * The ring, the disk and the sheet open in 3D, so for them the scene IS the run -- and a physics
 * review found it was missing half of it. On a rod turned into space the flat pieces are hidden
 * (they are laid out for the flat view), and with them went the mirror partner in "What cancels"
 * and the filling-in of "Add them up"; the cuts were drawn in a column far from the tilted rod;
 * and on every lesson the parts of the arrow and the chain were flat marks painted over the scene.
 *
 * The scene now draws each stage as bodies, from a plan the stage writes on itself. These read
 * that plan back rather than counting meshes, because a headless browser on a build machine is not
 * promised a WebGL context -- and the plan is exactly what was wrong: it had no partner in it, no
 * pieces already added, no cuts. Where the flat copies stand down in space, that is checked too, so
 * nothing is drawn twice and nothing is drawn nowhere. */
afterEach(() => {
 cleanup();
 // A URL left behind by one test beats the storage the next one writes; see build-ui's note.
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string, params: Record<string, number> = {}) {
 // The Explorer saves on a 220ms debounce, and the previous test's pending save must not land on
 // top of this one's lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {[id]: {...DEFAULT_PARAMS, ...params}}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLesson>>;
/** Each of these mounts the whole Explorer with its 3D scene, which takes 1-1.7 s here and about
 * 6.5 times that on the build machine -- over the browser project's 20 s limit for the one that
 * opens three lessons (3 s here). So every test carries its own, generous, limit. */
const HEAVY = 60000;
const jump = (view: View, n: number, name: string) => fireEvent.click(view.getByRole('button', {name: `Stage ${n}: ${name}`}));
/** Hold the run at a fraction of the way through one stage, as a reader dragging the bar does. */
function scrub(view: View, stage: number, fraction: number) {
 const track = view.container.querySelector<HTMLElement>('.bp-track')!;
 const r = view.container.querySelectorAll<HTMLElement>('.bp-seg')[stage].getBoundingClientRect(), x = r.left + fraction * r.width;
 fireEvent.pointerDown(track, {clientX: x + (fraction > .5 ? -16 : 16), button: 0, pointerId: 7});
 fireEvent.pointerMove(track, {clientX: x, pointerId: 7});
 fireEvent.pointerUp(track, {clientX: x, pointerId: 7});
}
const scene = (view: View) => view.container.querySelector<HTMLElement>('.cd-field-stage');
const plan = (view: View, key: string) => scene(view)?.dataset[key];
/** Whether the flat figure still paints this mark, all the way up its ancestors. */
const painted = (el: Element | null) => {
 for (let node = el; node && node !== document.body; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < .02) return false;
 return !!el;
};
async function openRun(view: View) {
 if (!view.container.querySelector('.cd-in-space')) {
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
 }
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 await waitFor(() => expect(plan(view, 'runStage')).toBe('pieces'));
}
describe('the run in space', () => {
 it('a ring is cut into pieces with gaps between them, and the flat pieces stand down', async () => {
  const view = await openLesson('ring');
  await openRun(view);
  expect(plan(view, 'runCut')).toBe('open');
  expect(plan(view, 'runPieces')).toBe('5');
  // While the pieces are being cut, none of them has stepped back yet.
  expect(plan(view, 'runDim')).toBe('0');
  // The scene draws the pieces, so the flat ones are not painted over it a second time -- and the
  // flat cuts, which were a second set of marks on the ring, go with them.
  expect(painted(view.container.querySelector('.cd-piece path'))).toBe(false);
  expect(painted(view.container.querySelector('.cd-seams'))).toBe(false);
 }, HEAVY);
 it('a ring cut an odd number of ways lights the arc straight across, in the scene', async () => {
  const view = await openLesson('ring');
  await openRun(view);
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(plan(view, 'runPartner')).toBe('across'));
  // The mirror is an arc of the same length, not a piece: only the chosen piece is lit as a piece,
  // and every other one has stepped back.
  expect(plan(view, 'runLit')).toBe('1');
  expect(plan(view, 'runDim')).toBe('4');
  // The flat figure still has the mirror arc for its own view, but in space it is the scene's.
  expect(view.container.querySelector('[data-mirror-arc]')).toBeTruthy();
  expect(painted(view.container.querySelector('[data-mirror-arc] path'))).toBe(false);
  // The parts of the arrow: the part that survives, the part that goes, and the partner's arrow
  // with its own part that goes -- the two that cancel.
  expect(plan(view, 'runArrows')?.split(' ').sort()).toEqual(['drop', 'keep', 'partner', 'partner-drop']);
  expect(painted(view.container.querySelector('.cd-grow-pair .cd-vector'))).toBe(false);
  // And the next stage takes the partner away again.
  jump(view, 4, 'Add them up');
  await waitFor(() => expect(plan(view, 'runPartner')).toBeUndefined());
 }, HEAVY);
 it('a ring\'s chosen piece lies across the screen, so its sideways part is seen at full length', async () => {
  // Three quarters of the way round is the near side of the ring, where the sideways parts point
  // straight down the line of sight and the cancelling shrank to a few pixels. Whatever the count,
  // the chosen piece is now the one the opening view's screen-across direction runs through -- or
  // the one opposite it, which is the same diameter.
  for (const slices of [5, 6, 7]) {
   const view = await openLesson('ring', {slices});
   await openRun(view);
   const chosen = (plan(view, 'runTones') ?? '').indexOf('l');
   const centre = 2 * Math.PI * (chosen + .5) / slices, across = openingCamera('ring').yaw;
   // How far apart the two diameters are, whichever end of each is counted.
   const turn = ((centre - across) % Math.PI + Math.PI) % Math.PI, apart = Math.min(turn, Math.PI - turn);
   expect(apart, `${slices} pieces`).toBeLessThanOrEqual(Math.PI / slices + 1e-9);
   cleanup();
   window.history.replaceState(null, '', '/');
  }
 }, HEAVY);
 it('a ring cut an even number of ways lights the whole piece straight across', async () => {
  const view = await openLesson('ring', {slices: 6});
  await openRun(view);
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(plan(view, 'runPartner')).toBe('piece'));
  expect(plan(view, 'runLit')).toBe('2');
  // Straight across: the two lit pieces are half a turn apart.
  const lit = (plan(view, 'runTones') ?? '').split('').flatMap((t, i) => t === 'l' ? [i] : []);
  expect(lit).toHaveLength(2);
  expect(lit[1] - lit[0]).toBe(3);
 }, HEAVY);
 it('a ring fills in as it is summed, and its chain is drawn at the flat figure\'s own scale', async () => {
  const view = await openLesson('ring');
  await openRun(view);
  jump(view, 4, 'Add them up');
  scrub(view, 3, .5);
  await waitFor(() => expect(Number(plan(view, 'runAdded'))).toBeGreaterThan(0));
  // What is still to come waits faintly; what is in the sum is coloured.
  expect(Number(plan(view, 'runDim'))).toBeGreaterThan(0);
  expect(Number(plan(view, 'runChain'))).toBeGreaterThan(2);
  // The flat chain is still in the tree, drawn in the same view; the scene's chain must end where
  // it does. The scene's is in metres and the flat one in pixels, so the view is read back off the
  // figure itself: its x and y axes are drawn a fixed number of pixels long along their projected
  // directions, O is labelled, and P sits at its own height straight up the z axis.
  const flat = view.container.querySelector<SVGPathElement>('[data-sum-chain]')!;
  expect(painted(flat)).toBe(false);
  const points = [...(flat.getAttribute('d') ?? '').matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));
  const first = points[0], last = points[points.length - 1];
  const origin = view.container.querySelector<SVGTextElement>('.cd-origin')!;
  // The origin's label says where O is, rather than leaving it to be worked back from an offset.
  const [ox, oy] = (origin.dataset.at ?? '').split(' ').map(Number);
  const O = {x: ox, y: oy};
  const axes = [...(view.container.querySelector('.cd-axes path')?.getAttribute('d') ?? '').matchAll(/-?[\d.]+/g)].map(m => Number(m[0]));
  const px = {x: (axes[2] - O.x) / 185, y: (axes[3] - O.y) / 185}, py = {x: (axes[6] - O.x) / 122, y: (axes[7] - O.y) / 122};
  const cp = Math.sqrt(1 - (px.y ** 2 + py.y ** 2));
  const height = Number(view.container.querySelector<HTMLInputElement>('input[aria-label="Observation distance in meters"]')!.value);
  const unit = Math.hypot(first.x - O.x, first.y - O.y) / (height * cp);
  const [x, y, z] = (plan(view, 'runChainEnd') ?? '').split(' ').map(Number);
  const drawn = {x: x * px.x + y * py.x, y: x * px.y + y * py.y - z * cp};
  expect(drawn.x * unit).toBeCloseTo(last.x - first.x, 0);
  expect(drawn.y * unit).toBeCloseTo(last.y - first.y, 0);
 }, HEAVY);
 it('the cuts close as the pieces shrink, and the ring is whole again in the limit', async () => {
  const view = await openLesson('ring');
  await openRun(view);
  jump(view, 5, 'Shrink them');
  scrub(view, 4, .45);
  await waitFor(() => expect(Number(plan(view, 'runPieces'))).toBeGreaterThan(5));
  expect(plan(view, 'runCut')).toBe('open');
  scrub(view, 4, .99);
  await waitFor(() => expect(plan(view, 'runCut')).toBe('closed'));
 }, HEAVY);
 it('closing the run takes all of it out of the scene', async () => {
  const view = await openLesson('ring');
  await openRun(view);
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(plan(view, 'runStage')).toBeUndefined());
  expect(scene(view)).toBeTruthy();
 }, HEAVY);
});
describe('a rod turned into space', () => {
 it('is cut where it lies, not in a column beside it', async () => {
  const view = await openLesson('bisector');
  await openRun(view);
  expect(plan(view, 'runPieces')).toBe('5');
  expect(plan(view, 'runCut')).toBe('open');
  // The flat cuts are ticks across an upright rod at a fixed screen column; in space they hung a
  // long way from the tilted rod. They are not painted there -- at rest as well as in the run.
  expect(painted(view.container.querySelector('.cd-seams'))).toBe(false);
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(plan(view, 'runStage')).toBeUndefined());
  expect(painted(view.container.querySelector('.cd-seams'))).toBe(false);
 }, HEAVY);
 it('shows the mirror partner in "What cancels" -- it used to vanish with the flat pieces', async () => {
  const view = await openLesson('bisector');
  await openRun(view);
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(plan(view, 'runPartner')).toBe('piece'));
  // The flat partner is in the tree and not painted; the scene's is lit, as a whole piece, the
  // mirror image of the chosen one along the rod.
  expect(view.container.querySelector('.cd-piece.is-partner')).toBeTruthy();
  const tones = plan(view, 'runTones') ?? '';
  const lit = tones.split('').flatMap((t, i) => t === 'l' ? [i] : []);
  expect(lit).toHaveLength(2);
  expect(lit[0] + lit[1]).toBe(tones.length - 1);
  expect(plan(view, 'runArrows')?.split(' ').sort()).toEqual(['drop', 'keep', 'partner', 'partner-drop']);
 }, HEAVY);
 it('fills in the pieces already added in "Add them up" -- that vanished too', async () => {
  const view = await openLesson('bisector');
  await openRun(view);
  jump(view, 4, 'Add them up');
  scrub(view, 3, .5);
  await waitFor(() => expect(Number(plan(view, 'runAdded'))).toBeGreaterThan(0));
  expect(Number(plan(view, 'runDim'))).toBeGreaterThan(0);
  expect(view.container.querySelector('.cd-piece.is-added')).toBeTruthy();
 }, HEAVY);
});
describe('a surface in space', () => {
 it('the disk is cut along circles, and shades only what has been summed', async () => {
  const view = await openLesson('disk');
  await openRun(view);
  expect(plan(view, 'runSeams')).toBe('4');
  jump(view, 2, 'One ring');
  await waitFor(() => expect(plan(view, 'runStage')).toBe('one'));
  // The chosen piece is a thin ring; nothing inside it is shaded until it is summed.
  expect(plan(view, 'runFilled')).toBeUndefined();
  jump(view, 4, 'Add them up');
  scrub(view, 3, .5);
  await waitFor(() => expect(plan(view, 'runFilled')).toBe('true'));
  // The scene shades it, so the flat sweep stands down rather than painting a second disc.
  expect(painted(view.container.querySelector('[data-disk-sweep]'))).toBe(false);
 }, HEAVY);
 it('the sheet is cut along circles too, and fills in ring by ring', async () => {
  const view = await openLesson('sheet');
  await openRun(view);
  expect(plan(view, 'runSeams')).toBe('4');
  jump(view, 4, 'Add them up');
  scrub(view, 3, .5);
  await waitFor(() => expect(plan(view, 'runFilled')).toBe('true'));
 }, HEAVY);
 it('a potential lesson lights the partner that adds, and draws no arrows at all', async () => {
  const view = await openLesson('v-ring');
  await openRun(view);
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(plan(view, 'runPartner')).toBe('across'));
  expect(plan(view, 'runArrows')).toBeUndefined();
  jump(view, 4, 'Add them up');
  scrub(view, 3, .5);
  await waitFor(() => expect(Number(plan(view, 'runAdded'))).toBeGreaterThan(0));
  expect(plan(view, 'runChain')).toBeUndefined();
 }, HEAVY);
});
describe('the mirror piece in space is a whole contribution, and what it keeps is laid on', () => {
 // The mirror's arrow was dashed for the whole of What cancels -- the figure's mark for what goes --
 // and its surviving part was never drawn, so the stage ended showing one piece's part along the axis
 // where the pair gives two. The ring opens in 3D, so that was its default What cancels.
 for (const id of ['ring', 'bisector']) it(`${id}: solid, and its surviving part laid on once the sideways parts have gone`, async () => {
  const view = await openLesson(id);
  await openRun(view);
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(plan(view, 'runPartner')).toBeTruthy());
  expect(plan(view, 'runPartnerStyle')).toBe('solid');
  // At the start nothing has gone yet, so there is nothing to lay on.
  expect(plan(view, 'runArrows')?.split(' ')).not.toContain('partner-keep');
  scrub(view, 2, .97);
  await waitFor(() => expect(plan(view, 'runArrows')?.split(' ')).toContain('partner-keep'));
  expect(plan(view, 'runPartnerStyle')).toBe('solid');
 }, HEAVY);
 // Cut five ways, the bisector's middle piece is level with P and is its own mirror. The scene drew a
 // lighter copy of its ΔE over its own and a second ΔE_x laid on the first: one piece counted twice.
 // A reader gets there by picking the piece nearest P, which during the run becomes the run's piece.
 it('a piece on P\'s own line has no mirror, and nothing is laid on its part twice', async () => {
  const view = await openLesson('bisector');
  await openRun(view);
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(plan(view, 'runStage')).toBe('cancel'));
  fireEvent.change(view.container.querySelector<HTMLInputElement>('input[aria-label="Selected charge element"]')!, {target: {value: '2'}});
  scrub(view, 2, .97);
  await waitFor(() => expect(plan(view, 'runTones')).toBe('ddldd'));
  expect(plan(view, 'runPartner')).toBeUndefined();
  const arrows = plan(view, 'runArrows')?.split(' ') ?? [];
  expect(arrows).toContain('keep');
  expect(arrows).not.toContain('partner');
  expect(arrows).not.toContain('partner-keep');
 }, HEAVY);
});
describe('the chain in space is drawn beside the net arrow by the lesson, not by its first link', () => {
 // With one link and no net arrow yet, any chain is collinear with itself: the ring's first link hung
 // beside P on a tie, and the whole chain jumped back onto P when the second arrived.
 for (const [id, beside] of [['ring', false], ['bisector', false], ['disk', true]] as const) it(`${id}: ${beside ? 'beside' : 'on P'} from its first link to its last`, async () => {
  const view = await openLesson(id);
  await openRun(view);
  jump(view, 4, 'Add them up');
  // From the first link: the sum starts once the run's piece has been handed over, a quarter of the way in.
  for (const at of [.35, .6]) {
   scrub(view, 3, at);
   await waitFor(() => expect(Number(plan(view, 'runChain') ?? 0)).toBeGreaterThan(1));
   expect(plan(view, 'runChainBeside'), `${id} at ${at}`).toBe(beside ? 'true' : undefined);
  }
 }, HEAVY);
});
describe('the charge\'s sign is said in space', () => {
 it('a negative ring reads as negative, with no field drawn to say so', async () => {
  const view = await openLesson('v-ring', {charge: -2});
  await waitFor(() => expect(scene(view)?.dataset.chargeSign).toBe('\u2212'));
  cleanup();
  window.history.replaceState(null, '', '/');
  const plus = await openLesson('v-ring');
  await waitFor(() => expect(scene(plus)?.dataset.chargeSign).toBe('+'));
 }, HEAVY);
});

