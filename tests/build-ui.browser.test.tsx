import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
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
afterEach(cleanup);
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
 // not the one the test named.
 expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title);
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
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(view.queryByRole('button', {name: /^Stage \d: /})).toBeNull());
  expect(view.getByRole('button', {name: 'Watch it build'})).toBeTruthy();
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
