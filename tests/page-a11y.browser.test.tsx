import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
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
});
