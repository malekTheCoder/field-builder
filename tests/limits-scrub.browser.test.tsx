import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {Assessment} from '../src/components/Assessment';
import Explorer from '../src/explorer/Explorer';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE LIMITING CASES ARE OPEN, AND THE PLOT IS THE CONTROL.
 *
 * Shut, the two endnotes were two grey lines at the foot of the lesson, and the plot they close on was
 * never seen. They start open now, and still fold away. And the plot moved only from a slider under it:
 * now a press anywhere on it brings the dot there, a drag carries it, a mouse scrubs it without a press,
 * the arrow keys walk it, and the slider, the thumbnail and a sentence for where the dot is all follow. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
const card = (id = 'bisector', mode = 'far') => {
 const problem = getProblem(id), limit = problem.limits.find(l => l.mode === mode)!;
 const view = render(<div style={{width: 560}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
 const handle = view.getByRole('slider', {name: 'Move along the plot'});
 const slider = view.getByRole('slider', {name: 'Explore limiting case'});
 const svg = view.container.querySelector<SVGSVGElement>('svg.comparison-plot')!;
 const dot = () => Number(view.container.querySelector('circle.comparison-dot')!.getAttribute('cx'));
 const p = () => [...view.container.querySelectorAll<SVGCircleElement>('.limit-mini circle')].map(c => c.getAttribute('cx')).join();
 const now = () => view.container.querySelector('.limit-now')!.textContent!;
 // A point a fraction f of the way along the plot's x axis, which runs from 40 to 452 of its 480 units.
 const at = (f: number) => { const r = svg.getBoundingClientRect(); return {clientX: r.left + r.width * (40 + 412 * f) / 480, clientY: r.top + 60}; };
 return {view, handle, slider, svg, dot, p, now, at};
};
const value = (el: Element) => Number(el.getAttribute('aria-valuenow'));

describe('the endnotes start open', () => {
 it('both are open on arrival, with the plot drawn, and either still folds away', async () => {
  const view = await openLesson('ring');
  const notes = [...view.container.querySelectorAll<HTMLDetailsElement>('details.exp-note')];
  expect(notes.length).toBe(2);
  for (const n of notes) expect(n.open, n.querySelector('summary')!.textContent!).toBe(true);
  await waitFor(() => expect(view.container.querySelector('.exp-note .assessment svg.comparison-plot')).toBeTruthy());
  expect(view.container.querySelector('.exp-slips .exp-slip')).toBeTruthy();
  fireEvent.click(view.getByText('Limiting cases'));
  await waitFor(() => expect(notes[0].open).toBe(false));
  // Folded, the plot is unmounted: nothing behind a closed disclosure is worked out.
  await waitFor(() => expect(view.container.querySelector('.assessment')).toBeNull());
 }, 15000);
});

describe('the plot is the control', () => {
 it('a press brings the dot to the pointer, a drag carries it, and the slider follows', async () => {
  const c = card();
  const before = c.dot(), thumb = c.p();
  const far = c.at(.8);
  await act(async () => { fireEvent.pointerDown(c.handle, {...far, button: 0, pointerId: 1, pointerType: 'touch'}); });
  // s is 1 + 29 x the fraction along the axis, on the slider's own step.
  expect(value(c.handle)).toBeCloseTo(1 + 29 * .8, 0);
  expect(value(c.slider)).toBe(value(c.handle));
  expect(c.dot()).toBeGreaterThan(before + 100);
  expect(c.p(), 'the thumbnail moves with the dot').not.toBe(thumb);
  await act(async () => { fireEvent.pointerMove(c.handle, {...c.at(.3), pointerId: 1, pointerType: 'touch'}); });
  expect(value(c.handle)).toBeCloseTo(1 + 29 * .3, 0);
  expect(value(c.slider)).toBe(value(c.handle));
  await act(async () => { fireEvent.pointerUp(c.handle, {...c.at(.3), pointerId: 1, pointerType: 'touch'}); });
  // Released, a touch that passes over the plot moves nothing.
  const held = value(c.handle);
  await act(async () => { fireEvent.pointerMove(c.handle, {...c.at(.9), pointerId: 1, pointerType: 'touch'}); });
  expect(value(c.handle)).toBe(held);
 });
 it('a mouse scrubs it without a press, and a press past either end stops at that end', async () => {
  const c = card('ring', 'far');
  await act(async () => { fireEvent.pointerMove(c.handle, {...c.at(.6), pointerType: 'mouse', pointerId: 2}); });
  expect(value(c.slider)).toBeCloseTo(1 + 29 * .6, 0);
  await act(async () => { fireEvent.pointerDown(c.handle, {...c.at(1.08), button: 0, pointerType: 'mouse', pointerId: 2}); });
  expect(value(c.slider)).toBe(30);
  await act(async () => { fireEvent.pointerMove(c.handle, {...c.at(-.2), buttons: 1, pointerType: 'mouse', pointerId: 2}); });
  expect(value(c.slider)).toBe(1);
 });
 it('the arrow keys walk it, Home and End take it to the ends, and the slider moves it back', async () => {
  const c = card();
  c.handle.focus();
  await userEvent.keyboard('{Home}');
  expect(value(c.handle)).toBe(1);
  const start = c.dot();
  await userEvent.keyboard('{ArrowRight}{ArrowRight}');
  expect(value(c.handle)).toBe(2);
  expect(value(c.slider)).toBe(2);
  expect(c.dot()).toBeGreaterThan(start);
  await userEvent.keyboard('{End}');
  expect(value(c.slider)).toBe(30);
  await userEvent.keyboard('{ArrowLeft}');
  expect(value(c.handle)).toBe(29.5);
  // And the other way: the slider under the plot drives the same dot.
  c.slider.focus();
  await userEvent.keyboard('{Home}');
  expect(value(c.handle)).toBe(1);
 });
 it('the sentence says where the dot is: the rod\'s size close in, a point charge far away', async () => {
  const c = card();
  c.handle.focus();
  await userEvent.keyboard('{Home}');
  expect(c.now()).toMatch(/size still shows/);
  expect(c.now()).toMatch(/weaker than a point charge/);
  // And the handle says it too, for a screen reader, as its value.
  expect(c.handle.getAttribute('aria-valuetext')).toBe(c.now());
  await userEvent.keyboard('{End}');
  expect(c.now()).toMatch(/looks like a point charge/);
 });
 it('the sentence carries no numeral, in any lesson, at either end or in between', async () => {
  for (const problem of [...PROBLEMS, getProblem('infinite', 'limit')]) for (const limit of problem.limits) {
   const {container, unmount} = render(<div style={{width: 560}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
   const handle = container.querySelector<HTMLElement>('.comparison-handle')!;
   for (const key of ['Home', 'PageUp', 'PageUp', 'PageUp', 'PageUp', 'PageUp', 'End']) {
    await act(async () => { fireEvent.keyDown(handle, {key}); });
    const text = container.querySelector('.limit-now')!.textContent!;
    expect(text, `${problem.id}/${limit.id} at ${key}`).toBeTruthy();
    expect(text, `${problem.id}/${limit.id} at ${key}`).not.toMatch(/[0-9]/);
   }
   unmount();
  }
 }, 20000);
});
