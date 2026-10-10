import {act, cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
// The global sheet carries the focus rings; without it a focus test measures the browser's defaults.
import '../app/globals.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
/* THE PAGE AROUND THE FIGURE, FOR A READER WHO DOES NOT USE A MOUSE OR DOES NOT SEE THE SCREEN.
 *
 * Every one of these was found by tabbing through the shipped page or reading it with a screen
 * reader's eyes: sliders announced as "slider, 3", a focus ring that never appeared, a focus that fell
 * to the top of the document when the run's buttons went away, twenty tab stops before the lesson,
 * every lesson read twice, narration twice as long as the run it narrated, and a progress bar that a
 * Windows contrast theme painted out. */
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 try { await cdp().send('Emulation.setEmulatedMedia', {media: '', features: []}); } catch { /* not emulating */ }
 await page.viewport(1280, 800);
});
async function openLesson(id: string, width = 1280, height = 800) {
 // At the default size of the test frame the lesson list is not drawn at all.
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
const stageNow = (view: {container: HTMLElement}) => view.container.querySelector('.cd-stage-label')?.textContent ?? '';
describe('the sliders', () => {
 it('each is named by what it moves, and says its value in a unit', async () => {
  const view = await openLesson('bisector');
  // The range input itself, which is what a screen reader lands on -- not only the group around it.
  expect(view.getByRole('slider', {name: 'Total charge Q'})).toBeTruthy();
  expect(view.getByRole('slider', {name: 'Pieces N'})).toBeTruthy();
  expect(view.getByRole('slider', {name: 'Distance r'}).getAttribute('aria-valuetext')).toMatch(/^[\d.]+ meters?$/);
  expect(view.getByRole('slider', {name: 'Length L'}).getAttribute('aria-valuetext')).toMatch(/^[\d.]+ meters?$/);
  // The arc's opening angle read "1" for a half-turn: it ran in units of π and never said so.
  fireEvent.click(view.getByRole('button', {name: 'Arc of charge'}));
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('arc').title));
  expect(view.getByRole('slider', {name: 'Arc angle φ'}).getAttribute('aria-valuetext')).toBe('180 degrees');
 });
 it('shows where the keyboard focus is', async () => {
  const view = await openLesson('bisector');
  view.getByRole('slider', {name: 'Distance r'}).focus();
  await userEvent.tab();
  const slider = view.getByRole('slider', {name: 'Length L'});
  expect(document.activeElement).toBe(slider);
  // The focus is on a hidden input inside the thumb, so the ring has to be drawn on the thumb.
  expect(getComputedStyle(slider.closest('[data-slot=slider-thumb]')!).outlineStyle).not.toBe('none');
 });
});
describe('the run keeps the keyboard where it was', () => {
 it('Next at the last stage keeps the focus, and Close hands it back to Watch it build', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  const next = view.getByRole('button', {name: 'Next stage'});
  next.focus();
  await userEvent.keyboard('{Enter}');
  expect(stageNow(view)).toBe('Shrink them');
  // Disabling the focused button dropped the focus to the document. It is marked unavailable instead,
  // and pressing it again does nothing.
  expect(document.activeElement).toBe(next);
  expect(next.getAttribute('aria-disabled')).toBe('true');
  await userEvent.keyboard('{Enter}');
  expect(stageNow(view)).toBe('Shrink them');
  view.getByRole('button', {name: 'Close'}).focus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(document.activeElement).toBe(view.getByRole('button', {name: 'Watch it build'})));
 });
 it('on a stage of its own, the arrow keys step from that stage and take the focus with them', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  const second = view.getByRole('button', {name: 'Stage 2: One piece'});
  second.focus();
  fireEvent.keyDown(second, {key: 'ArrowRight'});
  expect(stageNow(view)).toBe('What cancels');
  expect(document.activeElement).toBe(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 });
 it('says the stage in a line while it plays, and all of it once it holds', async () => {
  const view = await openLesson('bisector');
  const live = () => view.container.querySelector('.exp-main > output[aria-live]')?.textContent ?? '';
  const [first] = buildStages(getProblem('bisector'));
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  // The caption is three to five times the length of the line, and read on every stage it ran a
  // minute behind a half-minute run.
  expect(live()).toBe(`${first.name}. ${first.line}`);
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  expect(live()).toBe(first.caption);
 });
 it('says, at the end of a run played through, that the answer has arrived and where', async () => {
  // A sighted reader sees the answer appear; the board's answer is not a live region, and the run
  // ended for a screen reader on "make the pieces smaller without end".
  const view = await openLesson('bisector');
  const live = () => view.container.querySelector('.exp-main > output[aria-live]')?.textContent ?? '';
  const queue: FrameRequestCallback[] = [], realRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  try {
   fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
   fireEvent.click(view.getByRole('button', {name: 'Pause'}));
   fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
   expect(live()).not.toMatch(/now at the foot/);
   fireEvent.click(view.getByRole('button', {name: 'Play'}));
   for (let t = 0; t < 20000 && !view.queryByRole('button', {name: 'Play again'}); t += 50) { const due = queue.splice(0); act(() => { for (const cb of due) cb(t); }); }
  } finally {
   window.requestAnimationFrame = realRaf;
   // Anything still waiting on a frame -- the figure's own animations -- gets one, so nothing stalls.
   act(() => { for (const cb of queue.splice(0)) cb(performance.now()); });
  }
  expect(live()).toMatch(/The answer for the whole distribution is now at the foot of the board\.$/);
 }, 30000);
 it('takes the five stages as one tab stop, on the stage the run is at', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  view.getByRole('button', {name: 'Play'}).focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  await userEvent.tab();
  expect(document.activeElement).toBe(view.getByRole('button', {name: 'Close'}));
 });
 it('a swipe up the bar that drifts sideways scrolls; it does not seek', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 1: Cut it up'}));
  const track = view.container.querySelector<HTMLElement>('.bp-track')!;
  const third = view.getByRole('button', {name: 'Stage 3: What cancels'}).getBoundingClientRect();
  const x = third.left + third.width / 2, y = third.top + 8;
  fireEvent.pointerDown(track, {clientX: x, clientY: y, button: 0, pointerId: 4});
  fireEvent.pointerMove(track, {clientX: x + 6, clientY: y - 40, pointerId: 4});
  fireEvent.pointerCancel(track, {pointerId: 4});
  expect(stageNow(view)).toBe('Cut it up');
  // Along the bar, it still scrubs.
  fireEvent.pointerDown(track, {clientX: x - 20, clientY: y, button: 0, pointerId: 5});
  fireEvent.pointerMove(track, {clientX: x, clientY: y + 2, pointerId: 5});
  fireEvent.pointerUp(track, {clientX: x, clientY: y + 2, pointerId: 5});
  expect(stageNow(view)).toBe('What cancels');
 });
});
describe('getting around the page', () => {
 it('the first tab stop goes straight to the lesson', async () => {
  const view = await openLesson('bisector');
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.tab();
  expect(document.activeElement?.textContent).toBe('Skip to the lesson');
  await userEvent.keyboard('{Enter}');
  expect(document.activeElement).toBe(view.getByRole('button', {name: 'Watch it build'}));
 });
 it('names each lesson once, marks the open one, and is a navigation landmark of its own', async () => {
  const view = await openLesson('bisector');
  const lessons = view.getByRole('navigation', {name: 'Lessons'});
  // The glyph beside each name was an image with the same name: "Finite line Finite line".
  expect(within(lessons).getByRole('button', {name: 'Finite line'}).getAttribute('aria-current')).toBe('page');
  expect(within(lessons).getByRole('button', {name: 'Ring of charge'}).getAttribute('aria-current')).toBeNull();
  // The one link out to the library is not a breadcrumb trail.
  expect(view.queryByRole('navigation', {name: 'Breadcrumb'})).toBeNull();
  expect(document.title).toBe(`${getProblem('bisector').title} · Field Builder`);
  await userEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const dialog = await view.findByRole('dialog');
  expect(within(dialog).getByRole('button', {name: 'Finite line'}).getAttribute('aria-current')).toBe('page');
  const ring = within(dialog).getByRole('button', {name: 'Ring of charge'});
  expect(document.getElementById(ring.getAttribute('aria-describedby') ?? '')?.textContent).toBe(getProblem('ring').subtitle);
 });
 it('between 1001 and 1050 pixels, where the list is not drawn, its toggle is not offered', async () => {
  const view = await openLesson('bisector', 1024, 768);
  expect(getComputedStyle(view.container.querySelector('.exp-library-toggle')!).display).toBe('none');
 });
});
describe('in a Windows contrast theme', () => {
 it('the run\'s progress and the slider tracks still show', async () => {
  const view = await openLesson('bisector');
  await cdp().send('Emulation.setEmulatedMedia', {features: [{name: 'forced-colors', value: 'active'}]});
  expect(matchMedia('(forced-colors: active)').matches).toBe(true);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  const ground = getComputedStyle(view.container.querySelector('.exp-diagram-card')!).backgroundColor;
  // Drawn in backgrounds, all of them became the page colour.
  expect(getComputedStyle(view.container.querySelector('.bp-seg-fill')!).backgroundColor).not.toBe(ground);
  expect(getComputedStyle(view.container.querySelector('.bp-seg-bar')!).borderTopStyle).toBe('solid');
  expect(getComputedStyle(view.container.querySelector('.exp-range [data-slot=slider-range]')!).backgroundColor).not.toBe(ground);
  expect(getComputedStyle(view.container.querySelector('.exp-range [data-slot=slider-track]')!).borderTopStyle).toBe('solid');
 });
 it('the focused stage keeps a ring, drawn as an outline, which the theme does not remove', async () => {
  const view = await openLesson('bisector');
  await cdp().send('Emulation.setEmulatedMedia', {features: [{name: 'forced-colors', value: 'active'}]});
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  view.getByRole('button', {name: 'Play'}).focus();
  await userEvent.tab();
  const seg = document.activeElement as HTMLElement;
  expect(seg.matches('.bp-seg:focus-visible')).toBe(true);
  // A box-shadow ring is dropped by a contrast theme; an outline is drawn in a system colour.
  expect(getComputedStyle(seg.querySelector('.bp-seg-bar')!).outlineStyle).toBe('solid');
  // And one ring, not the page's square halo around the whole segment as well.
  expect(getComputedStyle(seg).boxShadow).toBe('none');
  expect(getComputedStyle(seg).outlineStyle).toBe('none');
 });
 it('the open lesson is marked by more than its weight', async () => {
  const view = await openLesson('infinite');
  await cdp().send('Emulation.setEmulatedMedia', {features: [{name: 'forced-colors', value: 'active'}]});
  const lessons = view.getByRole('navigation', {name: 'Lessons'});
  const open = getComputedStyle(within(lessons).getByRole('button', {name: 'Infinite line'}));
  const other = getComputedStyle(within(lessons).getByRole('button', {name: 'Semi-infinite line'}));
  // Waited for: the rows ease their colours over a fifth of a second, a contrast theme's included.
  await waitFor(() => {
   expect(open.backgroundColor).not.toBe(other.backgroundColor);
   expect(open.color).not.toBe(other.color);
   // And the other fourteen are not each boxed in the text colour.
   expect(other.borderTopColor).toBe(other.backgroundColor);
  });
 });
});
/** Contrast between two computed colours, as WCAG measures it. */
function contrast(a: string, b: string) {
 const lum = (c: string) => {
  const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(v => Number(v) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * bl;
 };
 const [x, y] = [lum(a), lum(b)];
 return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
describe('what is drawn to be seen can be seen', () => {
 for (const theme of ['light', 'dark'] as const) it(`the empty part of a slider and of the run's bar holds 3:1, ${theme}`, async () => {
  // At the muted grey the page sliders' tracks were 1.07:1 on the ground, and the stages still to come
  // on the run's bar 1.3:1: Pieces N at its least was a dot with no length, and the bar read as only as
  // long as the part already played.
  const view = await openLesson('bisector');
  if (theme === 'dark') fireEvent.click(view.getByRole('button', {name: 'Switch to dark theme'}));
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark'));
  const ground = getComputedStyle(document.body).backgroundColor;
  expect(contrast(getComputedStyle(view.container.querySelector('.exp-range [data-slot=slider-track]')!).backgroundColor, ground)).toBeGreaterThanOrEqual(3);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  const card = getComputedStyle(view.container.querySelector('.exp-diagram-card')!).backgroundColor;
  const empty = view.container.querySelectorAll('.bp-seg-bar')[3]!;
  expect(contrast(getComputedStyle(empty).backgroundColor, card)).toBeGreaterThanOrEqual(3);
  // The browser is told the theme too, so its own scrollbars -- the board's while the run is open --
  // are drawn for it.
  expect(getComputedStyle(document.documentElement).colorScheme).toBe(theme);
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  if (theme === 'dark') fireEvent.click(view.getByRole('button', {name: 'Switch to light theme'}));
 });
 it('a Greek letter in a sentence is the one in the formulas, not Geist\'s stroked ϕ', async () => {
  const view = await openLesson('arc');
  fireEvent.click(view.getByText('Limiting cases'));
  await waitFor(() => expect(view.container.querySelector('.exp-limit-why')).toBeTruthy());
  const note = view.container.querySelector('.exp-limit-why')!;
  const letters = [...note.querySelectorAll<HTMLElement>('.exp-greek')];
  expect(letters.map(l => l.textContent).join('')).toMatch(/φ/);
  for (const l of letters) expect(getComputedStyle(l).fontFamily).toMatch(/^KaTeX_(Math|Main)/);
 });
});
describe('the charge library', () => {
 it('opens on the lesson the reader is in', async () => {
  const view = await openLesson('ring');
  await userEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const dialog = await view.findByRole('dialog');
  await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', {name: 'Ring of charge'})));
 });
});
