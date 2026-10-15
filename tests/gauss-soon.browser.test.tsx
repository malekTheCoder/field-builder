import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import '../app/globals.css';
import Site, {newVisit} from '../src/home/Site';
import {getProblem} from '../src/problems/definitions';
import {GAUSS} from '../src/explorer/lessons';

/* GAUSS'S LAW, COMING SOON. The next part of the subject is shown where the lessons are offered -- the home
 * page, the lesson list and the library -- with its planned lessons named and marked, and none of them is a
 * link or a stop for Tab: they are words, and the lessons around them keep working as before. */
const STORE = 'field-builder:explorer:v1';
const seen = (extra: object = {}) => localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}, ...extra}));
beforeEach(() => newVisit());
afterEach(async () => {
 cleanup();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]';
function expectInert(section: Element) {
 expect(section.querySelectorAll(FOCUSABLE).length, 'a planned lesson can take the focus').toBe(0);
 for (const row of section.querySelectorAll('[aria-disabled=true]')) expect(row.closest('a,button')).toBeNull();
}

describe('Gauss\'s law on the home page', () => {
 it('is a family of its own, marked coming soon, its lessons named and not links', async () => {
  seen();
  const view = render(<Site />);
  await view.findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  const heading = view.getByRole('heading', {level: 3, name: /^Gauss’s law/});
  expect(heading.textContent).toContain('Coming soon');
  const family = heading.closest('.home-family')!;
  const cards = family.querySelectorAll('.home-card');
  expect(cards.length).toBe(GAUSS.lessons.length);
  for (const [i, card] of [...cards].entries()) {
   expect(card.getAttribute('aria-disabled')).toBe('true');
   expect(card.textContent).toContain(GAUSS.lessons[i].name);
   expect(card.textContent).toContain('Coming soon');
  }
  expectInert(family);
  // None of its names is offered as a link anywhere on the page.
  for (const l of GAUSS.lessons) expect(view.queryByRole('link', {name: new RegExp(l.name)})).toBeNull();
  // After the families that are open, and the page still prints no numerals.
  const families = [...view.container.querySelectorAll('.home-family')];
  expect(families.at(-1)).toBe(family);
  expect(view.container.textContent).not.toMatch(/[0-9]/);
 }, 15000);
});

describe('Gauss\'s law in the lesson', () => {
 it('is a group in the lesson list that Tab passes over', async () => {
  seen();
  window.history.replaceState(null, '', '/?p=bisector');
  const view = render(<Site />);
  await view.findByRole('button', {name: 'Watch it build'});
  await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe(getProblem('bisector').title));
  const list = view.getByRole('navigation', {name: 'Lessons'});
  const heading = within(list).getByRole('heading', {level: 2, name: /^Gauss’s law/});
  expect(heading.textContent).toContain('Coming soon');
  const group = heading.closest('.exp-family')!;
  expect(group.querySelectorAll('[aria-disabled=true]').length).toBe(GAUSS.lessons.length);
  expectInert(group);
  // The lessons before it are still links, and Tab goes from the last of them out of the list, past Gauss.
  const links = within(list).getAllByRole('link');
  const last = links.at(-1)!;
  expect(last.textContent).toBe(getProblem('v-rod-axial').short);
  last.focus();
  await userEvent.tab();
  expect(group.contains(document.activeElement), 'Tab stopped on a planned lesson').toBe(false);
  expect(document.activeElement).not.toBe(last);
  // And a lesson in the list still opens.
  fireEvent.click(within(list).getByRole('link', {name: getProblem('ring').short}));
  await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
 }, 20000);

 it('is a block in the library, its cards not links', async () => {
  seen();
  window.history.replaceState(null, '', '/?p=bisector');
  const view = render(<Site />);
  await view.findByRole('button', {name: 'Watch it build'});
  fireEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const dialog = await view.findByRole('dialog');
  const heading = within(dialog).getByRole('heading', {level: 3, name: /^Gauss’s law/});
  const block = heading.closest('.exp-library-family')!;
  expect(block.querySelectorAll('.exp-library-card[aria-disabled=true]').length).toBe(GAUSS.lessons.length);
  expectInert(block);
 }, 20000);
});
