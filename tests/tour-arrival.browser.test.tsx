import {cleanup, render, waitFor} from '@testing-library/react';
import {page, userEvent} from 'vitest/browser';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
/* THE TOUR OPENS EVERY TIME THE SITE DOES, until the reader says not to.
 *
 * It opened once, on a first visit, and a saved `seen` kept it shut from then on -- so a reader who
 * closed it to look at the page never met it again unless they went looking. It now opens on every
 * visit; only its own "Don't show this again" keeps it shut, and the header's Walkthrough opens it
 * regardless, with that box there to untick. A teacher's link opens on its lesson, not on the tour. */
const STORAGE = 'field-builder:explorer:v1';
const saved = () => JSON.parse(localStorage.getItem(STORAGE) ?? '{}');
/** The Explorer saves on a settle; a visit is over once what it wrote has landed. */
const settle = () => new Promise(r => setTimeout(r, 400));
async function visit(url = '/') {
 // Wide enough for Walkthrough to be in the header: narrower, it is a row in Lesson tools (page-w6-reach).
 await page.viewport(1280, 800);
 window.history.replaceState(null, '', url);
 const view = render(<Explorer />);
 // The lesson has mounted (the Walkthrough button is in the DOM whether or not a dialog hides it).
 await waitFor(() => expect(view.container.querySelector('.tour-button')).toBeTruthy());
 return view;
}
/** The tour, if it is open: the dialog whose title is its first page's. */
const tour = () => document.querySelector<HTMLElement>('.fb-onboarding');
async function leave(view: {unmount(): void}) { await settle(); view.unmount(); }
beforeEach(async () => { await settle(); localStorage.clear(); });
afterEach(() => { cleanup(); localStorage.clear(); window.history.replaceState(null, '', '/'); });

describe('the tour on arrival', () => {
 it('opens by itself on a first visit, and again on the next after it was skipped', async () => {
  let view = await visit();
  await waitFor(() => expect(tour()).toBeTruthy());
  await userEvent.click(view.getByRole('button', {name: 'Skip intro'}));
  await waitFor(() => expect(tour()).toBeNull());
  await leave(view);
  expect(saved().hideTour, 'skipping was saved as not wanting the tour').toBe(false);
  // The next visit -- the address now names the lesson, as the Explorer rewrites it on every settle.
  view = await visit(location.search ? `/${location.search}` : '/');
  await waitFor(() => expect(tour(), 'a skipped tour did not come back').toBeTruthy());
 }, 40000);

 it('stays shut after "Don\'t show this again", and Walkthrough still opens it with the box to untick', async () => {
  let view = await visit();
  await waitFor(() => expect(tour()).toBeTruthy());
  const box = view.getByRole('checkbox', {name: /Don.t show this again/});
  expect(box.getAttribute('aria-checked')).toBe('false');
  await userEvent.click(view.getByText(/Don.t show this again/));
  await waitFor(() => expect(box.getAttribute('aria-checked')).toBe('true'));
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(tour()).toBeNull());
  await leave(view);
  expect(saved().hideTour).toBe(true);
  view = await visit();
  // Long enough for the tour to have opened, had it been going to.
  await settle();
  expect(tour(), 'the tour opened after "Don\'t show this again"').toBeNull();
  await userEvent.click(view.getByRole('button', {name: 'Walkthrough'}));
  await waitFor(() => expect(tour()).toBeTruthy());
  const again = view.getByRole('checkbox', {name: /Don.t show this again/});
  expect(again.getAttribute('aria-checked')).toBe('true');
  // Unticked, the choice is undone: the next visit opens on the tour again.
  await userEvent.click(view.getByText(/Don.t show this again/));
  await waitFor(() => expect(again.getAttribute('aria-checked')).toBe('false'));
  await userEvent.keyboard('{Escape}');
  await leave(view);
  expect(saved().hideTour).toBe(false);
  await visit();
  await waitFor(() => expect(tour()).toBeTruthy());
 }, 40000);

 it('opens the new tour for a reader whose old `seen` is from before it', async () => {
  localStorage.setItem(STORAGE, JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
  const view = await visit();
  await waitFor(() => expect(tour()).toBeTruthy());
  expect(view.getByRole('checkbox', {name: /Don.t show this again/}).getAttribute('aria-checked')).toBe('false');
  // They have been here before, so the start-here arrow is not drawn for them.
  await userEvent.click(view.getByRole('button', {name: 'Skip intro'}));
  await settle();
  expect(document.querySelector('.start-here')).toBeNull();
  expect(saved().hideTour).toBe(false);
 }, 40000);

 it('does not open on a teacher\'s link, but does on the reader\'s own address for the lesson they left', async () => {
  let view = await visit('/?p=ring&Q=-3');
  await settle();
  expect(tour(), 'the tour covered an assigned lesson').toBeNull();
  expect(view.container.querySelector('h1')?.textContent).toMatch(/ring/i);
  await leave(view);
  // A reload of that page: the address names the lesson the reader left, with the values they left.
  view = await visit(`/${location.search}`);
  await waitFor(() => expect(tour(), 'a reload of the reader\'s own page did not open the tour').toBeTruthy());
  await userEvent.keyboard('{Escape}');
  await leave(view);
  // A different lesson's link is still a teacher's.
  await visit('/?p=sheet');
  await settle();
  expect(tour()).toBeNull();
 }, 40000);
});
