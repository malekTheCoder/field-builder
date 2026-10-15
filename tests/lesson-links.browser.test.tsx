import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// Measured with the page's own type and sheet: whether the list's row is in view depends on both.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Site, {newVisit} from '../src/home/Site';
import {getProblem} from '../src/problems/definitions';
import type {ProblemId} from '../src/problems/types';

/* ONE LESSON HANDS THE READER TO THE NEXT, AND IT SHOWS.
 *
 * A lesson's last line ("Take this rod to infinity") swapped the page for the lesson it named and jumped to
 * the top, and nothing said so: the list's mark could be out of sight, and there was no way back but the
 * browser's. The owner: "it feels weird, I don't see it select a new one". Now it is a Next card; following
 * it puts the focus on the new title, brings the new lesson into view in the list, and says under the title
 * where the reader came from and why, with a link back. */
const STORE = 'field-builder:explorer:v1';
beforeEach(() => newVisit());
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 await page.viewport(1280, 800);
});
async function openLesson(id: ProblemId, width = 1280, height = 800) {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 window.history.replaceState(null, '', `/?p=${id}`);
 const view = render(<Site />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id).title));
 return view;
}
const title = () => document.querySelector('h1')?.textContent;
const cameFrom = () => document.querySelector('.exp-came-from');
const activeRow = () => document.querySelector<HTMLElement>('.exp-lessons [aria-current=page]');
/** Follow the lesson's Next card, from the bottom of the page where it sits. */
async function follow(view: ReturnType<typeof render>, to: ProblemId) {
 window.scrollTo(0, document.documentElement.scrollHeight);
 const card = view.getByRole('link', {name: new RegExp(`^Next: `)});
 expect(card.getAttribute('href')).toBe(`?p=${to}`);
 fireEvent.click(card);
 await waitFor(() => expect(title()).toBe(getProblem(to).title));
}

describe('the Next card', () => {
 it('ends the lesson with the next lesson\'s shape, its name and why', async () => {
  const view = await openLesson('bisector');
  const card = view.getByRole('link', {name: 'Next: Infinite line. Take this rod to infinity'});
  expect(card.classList.contains('exp-next')).toBe(true);
  expect(card.querySelector('[data-glyph=infinite]')).toBeTruthy();
  expect(card.querySelector('.exp-next-to')?.textContent).toBe(getProblem('infinite').short);
  expect(card.querySelector('.exp-next-why')?.textContent).toBe('Take this rod to infinity');
  // The last thing in the lesson, after the endnotes, as a card on the page's own surface.
  const endnotes = card.closest('.exp-endnotes')!;
  expect(endnotes.lastElementChild).toBe(card);
  expect(getComputedStyle(card).borderTopWidth).toBe('1px');
  expect(getComputedStyle(card).boxShadow).toBe('none');
 }, 15000);
});

describe('following it', () => {
 it('hands over: the focus is on the new title, the list shows it, and a line says where from and why', async () => {
  const view = await openLesson('bisector', 1280, 720);
  await follow(view, 'infinite');
  expect(document.activeElement?.id).toBe('lesson-title');
  expect(document.activeElement?.textContent).toBe(getProblem('infinite').title);
  // The line under the title, and the way back.
  expect(cameFrom()?.textContent).toContain('From the finite rod: hold λ fixed and let it run to infinity.');
  const back = view.getByRole('link', {name: `Back to ${getProblem('bisector').short}`});
  expect(back.closest('.exp-heading')).toBeTruthy();
  // A screen reader hears it.
  expect(document.querySelector('main#lesson > output[aria-live=polite]')?.textContent).toContain(getProblem('infinite').title);
  // The page is at its top, and the list's mark is on the new lesson.
  await waitFor(() => expect(window.scrollY).toBe(0), {timeout: 3000});
  expect(activeRow()?.textContent).toBe(getProblem('infinite').short);
  // Back to the lesson it came from: the line goes, and the focus is on that title.
  fireEvent.click(back);
  await waitFor(() => expect(title()).toBe(getProblem('bisector').title));
  expect(cameFrom()).toBeNull();
  expect(document.activeElement?.id).toBe('lesson-title');
  expect(activeRow()?.textContent).toBe(getProblem('bisector').short);
 }, 20000);

 it('brings a lesson far down the list into view, on a short window', async () => {
  const view = await openLesson('axial', 1366, 657);
  await follow(view, 'v-rod-axial');
  await waitFor(() => {
   const row = activeRow()!, box = row.getBoundingClientRect();
   const list = row.closest('[data-slot=sidebar-content]')!.getBoundingClientRect();
   expect(row.textContent).toBe(getProblem('v-rod-axial').short);
   expect(window.scrollY).toBe(0);
   expect(box.top, 'the row is above the window').toBeGreaterThanOrEqual(0);
   expect(box.bottom, 'the row is below the window').toBeLessThanOrEqual(window.innerHeight);
   expect(box.top).toBeGreaterThanOrEqual(list.top);
   expect(box.bottom).toBeLessThanOrEqual(list.bottom);
   // The list, not the page, moved to show it: at this height the last lesson is past the window's foot.
   expect(row.closest('[data-slot=sidebar-content]')!.scrollTop).toBeGreaterThan(0);
  }, {timeout: 3000});
  // Watch it build is still on the first screen with the line under the title.
  const watch = view.getByRole('button', {name: 'Watch it build'}).getBoundingClientRect();
  expect(watch.bottom, 'the line pushed Watch it build off the first screen').toBeLessThan(window.innerHeight);
 }, 20000);

 it('the browser\'s Back returns to the lesson it came from, and the line goes', async () => {
  const view = await openLesson('ring');
  await follow(view, 'disk');
  expect(cameFrom()?.textContent).toContain('From the ring: a disk is these rings, nested and added up.');
  // The new lesson's address is pushed once the page settles.
  await waitFor(() => expect(new URLSearchParams(location.search).get('p')).toBe('disk'), {timeout: 3000});
  window.history.back();
  await waitFor(() => expect(title()).toBe(getProblem('ring').title), {timeout: 3000});
  expect(cameFrom()).toBeNull();
  expect(activeRow()?.textContent).toBe(getProblem('ring').short);
 }, 20000);

 it('the line goes when the reader chooses another lesson', async () => {
  const view = await openLesson('v-ring');
  await follow(view, 'ring');
  expect(cameFrom()?.textContent).toContain('From the ring’s potential');
  fireEvent.click(view.getByRole('link', {name: getProblem('arc').short}));
  await waitFor(() => expect(title()).toBe(getProblem('arc').title));
  expect(cameFrom()).toBeNull();
 }, 20000);
});
