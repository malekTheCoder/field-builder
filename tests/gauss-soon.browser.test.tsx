import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import '../app/globals.css';
import Site, {newVisit} from '../src/home/Site';
import {getProblem} from '../src/problems/definitions';
import {GAUSS} from '../src/explorer/lessons';
import {GAUSS_READY} from '../src/problems/readiness';

/* GAUSS'S LAW, PART BUILT. The section is shown where the lessons are offered -- the home page, the lesson list and
 * the library -- with all its planned lessons named. The ready ones (GAUSS_READY) are links to `?g=<id>`; the rest
 * are marked "Coming soon", and none of those is a link or a stop for Tab: they are words, and the lessons around
 * them keep working as before. */
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
const READY = GAUSS.lessons.filter(l => GAUSS_READY.has(l.key)), SOON = GAUSS.lessons.filter(l => !GAUSS_READY.has(l.key));
function expectInert(el: Element) {
 expect(el.matches(FOCUSABLE) || el.querySelectorAll(FOCUSABLE).length > 0, 'a planned lesson can take the focus').toBe(false);
 expect(el.closest('a,button')).toBeNull();
}

describe('Gauss\'s law on the home page', () => {
 it('is a family of its own, its ready lessons links and the rest marked coming soon', async () => {
  seen();
  const view = render(<Site />);
  await view.findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  const heading = view.getByRole('heading', {level: 3, name: /^Gauss’s law/});
  const family = heading.closest('.home-family')!;
  const cards = [...family.querySelectorAll('.home-card')];
  expect(cards.length).toBe(GAUSS.lessons.length);
  for (const l of READY) {
   const link = view.getByRole('link', {name: new RegExp(l.name.replace('Q_enc', 'Qenc'))});
   expect(link.getAttribute('href')).toBe(`?g=${l.key}`);
   expect(family.contains(link)).toBe(true);
  }
  const soon = cards.filter(c => c.getAttribute('aria-disabled') === 'true');
  expect(soon.length).toBe(SOON.length);
  for (const [i, card] of soon.entries()) {
   expect(card.textContent).toContain(SOON[i].name.replace('Q_enc', 'Qenc'));
   expect(card.textContent).toContain('Coming soon');
   expectInert(card);
  }
  // After the families that are open, and the page still prints no numerals.
  const families = [...view.container.querySelectorAll('.home-family')];
  expect(families.at(-1)).toBe(family);
  expect(view.container.textContent).not.toMatch(/[0-9]/);
  // A ready lesson opens.
  fireEvent.click(view.getByRole('link', {name: new RegExp(READY[0].name)}));
  await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe(READY[0].name));
 }, 20000);
});

describe('Gauss\'s law in the lesson', () => {
 it('is a group in the lesson list: the ready lessons are links, and Tab passes over the rest', async () => {
  seen();
  window.history.replaceState(null, '', '/?p=bisector');
  const view = render(<Site />);
  await view.findByRole('button', {name: 'Watch it build'});
  await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe(getProblem('bisector').title));
  const list = view.getByRole('navigation', {name: 'Lessons'});
  const heading = within(list).getByRole('heading', {level: 2, name: /^Gauss’s law/});
  const group = heading.closest('.exp-family')!;
  expect(group.textContent).toContain('Coming soon');
  const rows = group.querySelectorAll('[aria-disabled=true]');
  expect(rows.length).toBe(SOON.length);
  for (const row of rows) expectInert(row);
  const links = within(group as HTMLElement).getAllByRole('link');
  expect(links.map(a => a.getAttribute('href'))).toEqual(READY.map(l => `?g=${l.key}`));
  // Tab goes from the last ready Gauss lesson out of the list, past the planned ones.
  const last = links.at(-1)!;
  last.focus();
  await userEvent.tab();
  expect([...rows].some(r => r.contains(document.activeElement)), 'Tab stopped on a planned lesson').toBe(false);
  expect(document.activeElement).not.toBe(last);
  // And a lesson in the list still opens.
  fireEvent.click(within(list).getByRole('link', {name: getProblem('ring').short}));
  await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
 }, 20000);

 it('is a block in the library, its ready cards links and the rest not', async () => {
  seen();
  window.history.replaceState(null, '', '/?p=bisector');
  const view = render(<Site />);
  await view.findByRole('button', {name: 'Watch it build'});
  fireEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const dialog = await view.findByRole('dialog');
  const heading = within(dialog).getByRole('heading', {level: 3, name: /^Gauss’s law/});
  const block = heading.closest('.exp-library-family')!;
  const planned = block.querySelectorAll('.exp-library-card[aria-disabled=true]');
  expect(planned.length).toBe(SOON.length);
  for (const card of planned) expectInert(card);
  expect(within(block as HTMLElement).getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(READY.map(l => `?g=${l.key}`));
 }, 20000);
});
