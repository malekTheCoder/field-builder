import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {isReady} from '../src/problems/readiness';
/* The run, in the page it actually plays in.
 *
 * The unit tests read the script; these check that playing it moves the figure. That is the
 * claim worth defending, because the whole design of the feature is that it drives the SAME
 * state the manual controls drive -- so if the wiring drifts, the animation starts showing
 * something a reader can no longer reach by hand, and the demonstration stops demonstrating
 * the controls. Each stage is checked by what appears in the drawing, not by what the caption
 * says about it. */
afterEach(() => {
 cleanup();
 // The Explorer writes the open lesson into the address bar, and a URL left behind by the last
 // test BEATS the storage the next one writes -- `parseAssignment` wins over the saved id. Left
 // unreset, every test after one that ran the build opened that test's lesson instead of its own.
 window.history.replaceState(null, '', '/');
});
async function openLesson(id: string) {
 // The Explorer saves the lesson you were on, on a 220ms debounce. A test that writes its own
 // lesson into storage and mounts immediately can have the PREVIOUS test's pending save land on
 // top of it, and then it is quietly running against the wrong geometry -- which is how the
 // check below first "failed": it opened the rod-on-axis lesson and got the bisector.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 // And say so plainly if it ever happens again, rather than asserting about a figure that is
 // not the one the test named. Waited for, not asserted once: the lesson comes from an effect
 // that reads storage after the first paint, so a single check here races it.
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
/** Jump to a stage by its marker, which is also how a reader moves around the run. */
const jump = (view: Awaited<ReturnType<typeof openLesson>>, n: number, name: string) => {
 fireEvent.click(view.getByRole('button', {name: `Stage ${n}: ${name}`}));
};
/** What the figure itself says it is showing. */
const footer = (view: {container: HTMLElement}) =>
 [...view.container.querySelectorAll('.cd-footer')].map(e => e.textContent).join(' ');
describe('watch it build', () => {
 it('opens the run, and closing it puts the figure back', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  // The five markers are the run's shape, visible from the first frame: a reader can see how
  // long the argument is and step around it, rather than being held by an animation.
  expect(view.getAllByRole('button', {name: /^Stage \d: /}).length).toBe(5);
  // Close puts the figure back, the partition included -- otherwise a reader who watched the
  // pieces shrink away is left looking at a smooth rod with no way to tell why it stopped
  // being cut up.
  jump(view, 5, 'Shrink them');
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  await waitFor(() => expect(footer(view)).toContain('In the limit'), {timeout: 9000});
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(view.queryByRole('button', {name: /^Stage \d: /})).toBeNull());
  expect(view.getByRole('button', {name: 'Watch it build'})).toBeTruthy();
  await waitFor(() => expect(footer(view)).toContain('Cut into pieces'));
 });
 it('the cancellation stage puts a mirror partner on the figure, and the next stage takes it away', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 3, 'What cancels');
  // The two transverse arrows that shrink into each other. Their presence is the claim the
  // caption makes; without them the stage asserts a cancellation it never showed.
  await waitFor(() => expect(view.container.querySelector('[data-cancel-transverse]')).toBeTruthy());
  jump(view, 4, 'Add them up');
  await waitFor(() => expect(view.container.querySelector('[data-cancel-transverse]')).toBeNull());
 });
 it('the adding stage starts from nothing, so the chain is seen to grow', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 4, 'Add them up');
  // Jumping here lands on the first frame of the sum: no contributions in yet. A stage that
  // opened on the finished chain would show the answer and skip the argument for it.
  await waitFor(() => expect(view.container.querySelector('[data-sum-chain]')).toBeNull());
 });
 it('only the last stage takes the pieces to the limit', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 4, 'Add them up');
  // The figure says which it is showing, in its own corner.
  expect(footer(view)).toContain('Cut into pieces');
  // Landing on a stage lands on its FIRST frame, here and everywhere: the pieces have not
  // shrunk yet. Playing from there is what takes them to the limit, and a reader who clicks
  // the last marker should still get to watch the shrinking rather than arrive after it.
  jump(view, 5, 'Shrink them');
  expect(footer(view)).toContain('Cut into pieces');
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  await waitFor(() => expect(footer(view)).toContain('In the limit'), {timeout: 9000});
 });
 it('a lesson with nothing to cancel still runs, and draws no partner', async () => {
  // The rod seen from beyond its end: every piece lies the same side of P, so there is no
  // partner and the stage says so. It must still play -- an argument with a hole in it is
  // worse than one that names the hole.
  const view = await openLesson('axial');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 3, 'What cancels');
  expect(view.container.querySelector('[data-cancel-transverse]')).toBeNull();
  jump(view, 5, 'Shrink them');
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  await waitFor(() => expect(footer(view)).toContain('In the limit'), {timeout: 9000});
 });
});
describe('every stage changes the figure, not just the caption', () => {
 // Reported as "it does nothing, and then after a bit it goes to the final stages". The run was
 // advancing, but its stages barely touched the picture: stage one was identical to the resting
 // view, two and three added a few thin lines near P under full-strength field lines, and the
 // finished answer sat on screen from the first frame. Only the last stage's morph could be seen.
 // These pin what each stage now does to the FIGURE, checked in the drawing itself.
 const answerShown = (view: {container: HTMLElement}) =>
  [...view.container.querySelectorAll('.cd-vector-label')].some(l => /Σ|^E$/.test(l.textContent ?? ''));
 const stageLabel = (view: {container: HTMLElement}) => view.container.querySelector('.cd-stage-label')?.textContent ?? '';
 // The figure names the stage; the marker strip says which one of the five it is. The label used
 // to carry "3 of 5" as well -- a numeral on a page that has none, saying what the markers beside
 // it already showed.
 it('names the stage inside the figure, where the reader is looking', async () => {
  const view = await openLesson('bisector');
  expect(stageLabel(view)).toBe('');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(stageLabel(view)).toBe('Cut it up'));
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(stageLabel(view)).toBe('What cancels'));
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(stageLabel(view)).toBe(''));
 });
 it('keeps the answer off screen until the stage that builds it', async () => {
  const view = await openLesson('bisector');
  // At rest the net field is drawn, as it always has been.
  expect(answerShown(view)).toBe(true);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  for (const [n, name] of [[1, 'Cut it up'], [2, 'One piece'], [3, 'What cancels']] as const) {
   jump(view, n, name);
   await waitFor(() => expect(answerShown(view), `stage ${n} shows the answer before it is built`).toBe(false));
  }
  jump(view, 4, 'Add them up');
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  await waitFor(() => expect(answerShown(view)).toBe(true), {timeout: 6000});
 });
 it('makes the cuts in the first stage, one after another along the charge', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(view.container.querySelector('.cd-stage-pieces')).toBeTruthy());
  const seams = [...view.container.querySelectorAll<SVGGElement>('.cd-seam')];
  expect(seams.length).toBe(4);
  for (const seam of seams) expect(getComputedStyle(seam).animationName).toBe('cd-cut');
  // Staggered: each cut lands later than the one before it.
  const delays = seams.map(seam => parseFloat(getComputedStyle(seam).animationDelay));
  for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeGreaterThan(delays[i - 1]);
 });
 it('marks the mirror partner on the charge in the cancelling stage', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(view.container.querySelector('.cd-piece.is-partner')).toBeTruthy());
  jump(view, 4, 'Add them up');
  await waitFor(() => expect(view.container.querySelector('.cd-piece.is-partner')).toBeNull());
 });
 it('walks the highlight along the charge as each piece is added', async () => {
  // Nothing used to say which piece was going in; the selection stayed where it was.
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 4, 'Add them up');
  fireEvent.click(view.getByRole('button', {name: 'Play'}));
  const seen = new Set<string>();
  await waitFor(() => {
   const key = view.container.querySelector<SVGGElement>('.cd-piece.is-selected')?.dataset.pieceKey;
   if (key) seen.add(key);
   expect(seen.size).toBeGreaterThanOrEqual(3);
  }, {timeout: 8000, interval: 50});
  expect(view.container.querySelectorAll('.cd-sum-joint').length).toBeGreaterThan(0);
 });
});
describe('with reduced motion asked for', () => {
 // This was broken in the shipped build and no test saw it. Reduced motion made the run jump to
 // its own last frame and stop -- and since it was then at the end, Play restarted it at the end
 // and landed there again, so the whole feature was stuck on the answer with no way back. The
 // setting asks for no SMOOTH movement, not for no lesson.
 let real: typeof window.matchMedia;
 beforeEach(() => {
  real = window.matchMedia;
  window.matchMedia = ((q: string) => q.includes('prefers-reduced-motion')
   ? {matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} as unknown as MediaQueryList
   : real.call(window, q)) as typeof window.matchMedia;
 });
 afterEach(() => { window.matchMedia = real; });
 it('still starts at the first cut instead of landing on the answer', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  await waitFor(() => expect(view.getByRole('button', {name: /^Stage 1: /})).toBeTruthy());
  // The run opens on the pieces, not on the finished integral.
  expect(footer(view)).toContain('Cut into pieces');
  expect(view.container.querySelector('.exp-walk-text')?.textContent ?? '').toContain('Cut it up');
 });
 it('still advances through the stages, in steps', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  // Where the run has got to is the marked stage in the strip: the words "2 of 5" were the only
  // counting on the page and went with the rest of the numerals. The strip says the same thing --
  // the same five stages, and which one is current -- so the claim is unchanged.
  const stageNow = () => view.container.querySelector('.exp-build-dot[aria-current="step"]')?.getAttribute('aria-label') ?? '';
  expect(view.container.querySelectorAll('.exp-build-dot').length).toBe(5);
  await waitFor(() => expect(stageNow()).toMatch(/^Stage 1: /));
  await waitFor(() => expect(stageNow()).toMatch(/^Stage 2: /), {timeout: 9000});
  await waitFor(() => expect(stageNow()).toMatch(/^Stage 3: /), {timeout: 9000});
 });
});
describe('the potential has a picture of its own', () => {
 // A potential lesson used to put one thermometer bar beside P -- a total with no visible
 // origin. It now stacks every piece's contribution into a column, so V is seen to be the pieces
 // piled up. These check the column against the physics it claims to show.
 const segments = (view: {container: HTMLElement}) =>
  [...view.container.querySelectorAll<SVGRectElement>('[data-stack-slot]')].map(r => Number(r.getAttribute('height')));
 it('the ring stacks equal segments, because every piece is the same distance away', async () => {
  const view = await openLesson('v-ring');
  const heights = segments(view);
  expect(heights.length).toBe(5);
  for (const h of heights) expect(h / heights[0]).toBeCloseTo(1, 6);
 });
 it('the rod does not, because its pieces are not, and by exactly the ratio of their distances', async () => {
  // The middle of a rod on its bisector is nearer P than its ends, so its segments must differ --
  // otherwise the equal ring segments above would prove nothing. Equal charge per piece means
  // each segment goes as 1/distance, so the middle-to-end ratio is the end-to-middle distance
  // ratio: at L = 4 and r = 3 with five pieces, sqrt(3^2 + 1.6^2) / 3.
  const view = await openLesson('v-rod-bisector');
  const heights = segments(view);
  const middle = heights[2], end = heights[0];
  expect(heights[4] / end).toBeCloseTo(1, 6);
  expect(middle).toBe(Math.max(...heights));
  expect(middle / end).toBeCloseTo(Math.hypot(3, 1.6) / 3, 4);
 });
 it('the mirror stage lights two segments of the same size: the partner adds', async () => {
  const view = await openLesson('v-rod-bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(view.container.querySelectorAll('[data-stack-lit]').length).toBe(2));
  const lit = [...view.container.querySelectorAll('[data-stack-lit]')].map(r => Number(r.getAttribute('height')));
  expect(lit[0] / lit[1]).toBeCloseTo(1, 6);
  // And the partner itself is marked on the charge, not just in the column.
  expect(view.container.querySelector('.cd-partner')).toBeTruthy();
 });
 it('a potential with no partner at the same distance lights only its own segment', async () => {
  const view = await openLesson('v-rod-axial');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  jump(view, 3, 'What cancels');
  await waitFor(() => expect(view.container.querySelectorAll('[data-stack-lit]').length).toBe(1));
  expect(view.container.querySelector('.cd-partner')).toBeNull();
 });
});
describe('a slider says what it moves', () => {
 // Stripping the numbers off the site left the controls saying only "r", "L", "Q". True, and
 // unreadable until you know which mark on the figure each letter names -- and the only way
 // left to find out was to drag one and hunt for whatever changed. Pointing at a control now
 // lights the thing it moves.
 const lit = (view: {container: HTMLElement}) => view.container.querySelector('.charge-diagram')?.className ?? '';
 it('pointing at a slider lights the feature it controls, and looking away puts it back', async () => {
  const view = await openLesson('bisector');
  const rod = view.getByRole('group', {name: 'Length L'});
  expect(lit(view)).not.toContain('cd-focus-size');
  fireEvent.pointerOver(rod);
  await waitFor(() => expect(lit(view)).toContain('cd-focus-size'));
  // And the feature it names is actually in the drawing, not just a class nothing matches.
  expect(view.container.querySelector('[data-dim="size"]')).toBeTruthy();
  fireEvent.pointerOut(rod, {relatedTarget: document.body});
  await waitFor(() => expect(lit(view)).not.toContain('cd-focus-size'));
  // Reaching it by keyboard has to work too, or the pairing is only there for a mouse.
  view.getAllByRole('slider').find(t => t.closest('[aria-label="Length L"]'))?.focus();
  await waitFor(() => expect(lit(view)).toContain('cd-focus-size'));
 });
 it('every slider of every lesson points at something that is actually drawn', async () => {
  // Written as an invariant rather than a list, because the list is the part that rots: a new
  // geometry, or a slider that appears only for one, would slip past a fixed table of labels.
  // The claim is simply that pointing at ANY control lights a feature, and that the feature it
  // names exists in that lesson's figure. It caught the first real gap: a ring, a disk and an
  // arc have no marks strung along them, so the charge slider was lighting nothing at all.
  //
  // One mount, walked lesson to lesson through the library the way a reader moves -- which is
  // also the only way to avoid racing the Explorer's own debounced save of which lesson you
  // were on.
  const view = await openLesson('bisector');
  for (const lesson of PROBLEMS.filter(pr => isReady(pr.id))) {
   const entry = [...view.container.querySelectorAll<HTMLElement>('.exp-shape-button')].find(b => b.textContent === lesson.short);
   expect(entry, `${lesson.short} is not in the library`).toBeTruthy();
   fireEvent.click(entry!);
   await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(lesson.title));
   const controls = [...view.container.querySelectorAll<HTMLElement>('.exp-range [data-slot="slider"][aria-label]')];
   expect(controls.length, `${lesson.id} has no parameter sliders`).toBeGreaterThan(1);
   for (const control of controls) {
    const name = control.getAttribute('aria-label');
    fireEvent.pointerOver(control);
    await waitFor(() => expect(lit(view), `${lesson.id} · ${name}`).toMatch(/cd-focus-\w/));
    const dim = /cd-focus-(\w+)/.exec(lit(view))?.[1];
    expect(view.container.querySelector(`[data-dim="${dim}"]`), `${lesson.id} · ${name} lights nothing in the figure`).toBeTruthy();
    fireEvent.pointerOut(control, {relatedTarget: document.body});
    await waitFor(() => expect(lit(view), `${lesson.id} · ${name}`).not.toMatch(/cd-focus-\w/));
   }
  }
 });
});
