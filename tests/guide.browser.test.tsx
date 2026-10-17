import {cleanup, render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Site, {newVisit} from '../src/home/Site';
import {getProblem} from '../src/problems/definitions';
import {GAUSS} from '../src/explorer/lessons';
import {gaussLesson} from '../src/gauss';

/* THE STUDY GUIDE. `?guide` opens a page on how to learn with the site; its lessons open from it, the home
 * page and every lesson's header lead to it, and it holds the site's rules: no numerals in its words, and
 * no sideways scroll on a phone. */
const STORE = 'field-builder:explorer:v1';
const seen = () => localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
const TITLE = 'How to study with Field Builder';
// Its words without its formulas: a formula's structure may hold a numeral, as every lesson's does.
const words = (el: Element) => { const c = el.cloneNode(true) as Element; c.querySelectorAll('.katex').forEach(k => k.remove()); return c.textContent ?? ''; };

beforeEach(() => newVisit());
afterEach(async () => {
 cleanup();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});

describe('the study guide', () => {
 it('is what ?guide opens, with every section and every lesson in its order', async () => {
  seen();
  window.history.replaceState(null, '', '/?guide');
  const {findByRole, getByRole, container} = render(<Site />);
  expect(await findByRole('heading', {level: 1, name: TITLE})).toBeTruthy();
  expect(document.title).toBe('How to study with this site · Field Builder');
  for (const name of ['The one idea behind every lesson', 'Working through a lesson', 'An order to take them in', 'When you are stuck', 'For any new shape: an exam checklist', 'For teachers'])
   expect(getByRole('heading', {level: 2, name})).toBeTruthy();
  // All fifteen lessons, each once, each a link to its own address, starting with the finite line.
  const all = [...container.querySelectorAll<HTMLAnchorElement>('a.guide-lesson')];
  const lessons = all.filter(a => a.getAttribute('href')!.startsWith('?p='));
  expect(lessons.length).toBe(16);
  expect(new Set(lessons.map(a => a.getAttribute('href'))).size).toBe(16);
  expect(lessons[0].getAttribute('href')).toBe('?p=bisector');
  expect(lessons[0].textContent).toContain(getProblem('bisector').short);
  expect(lessons.at(-1)!.getAttribute('href')).toMatch(/^\?p=v-/);
  // Then Gauss's law, after the integrals: all eleven, in the lesson list's order and by its names.
  const gauss = all.filter(a => a.getAttribute('href')!.startsWith('?g='));
  expect(all.slice(15)).toEqual(gauss);
  expect(gauss.map(a => a.getAttribute('href'))).toEqual(GAUSS.lessons.map(l => `?g=${l.key}`));
  for (const a of gauss) expect(a.querySelector('strong')!.textContent).toBe(gaussLesson(a.getAttribute('href')!.slice(3))!.title.replace('Q_enc', 'Qenc'));
  expect(getByRole('heading', {level: 3, name: 'Or, where the charge has symmetry: Gauss’s law'})).toBeTruthy();
  expect(words(container), 'the guide prints a numeral').not.toMatch(/[0-9]/);
  expect(container.textContent).not.toContain('—');
 });

 it('opens a lesson from its list, and Back returns to the guide', async () => {
  seen();
  window.history.replaceState(null, '', '/?guide');
  const {findByRole, getByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: TITLE});
  await userEvent.click(getByRole('link', {name: new RegExp(`^${getProblem('ring').short}`)}));
  expect(await findByRole('heading', {level: 1, name: getProblem('ring').title})).toBeTruthy();
  expect(new URLSearchParams(window.location.search).get('p')).toBe('ring');
  window.history.back();
  expect(await findByRole('heading', {level: 1, name: TITLE})).toBeTruthy();
 }, 15000);

 it('is reached from the home page, and the name in the corner goes back', async () => {
  seen();
  const {findByRole, getByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  const link = getByRole('link', {name: /How to study with this site/});
  expect(link.getAttribute('href')).toBe('?guide');
  await userEvent.click(link);
  expect(await findByRole('heading', {level: 1, name: TITLE})).toBeTruthy();
  expect(window.location.search).toBe('?guide');
  await userEvent.click(getByRole('link', {name: 'Field Builder home'}));
  expect(await findByRole('heading', {level: 1, name: 'One law, every geometry.'})).toBeTruthy();
  expect(window.location.search).toBe('');
 }, 15000);

 it('is reached from a lesson’s header', async () => {
  seen();
  window.history.replaceState(null, '', '/?p=disk');
  const {findByRole, getByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: getProblem('disk').title});
  await userEvent.click(getByRole('link', {name: 'How to use this site'}));
  expect(await findByRole('heading', {level: 1, name: TITLE})).toBeTruthy();
  expect(window.location.search).toBe('?guide');
 }, 15000);

 it('fits a phone with no sideways scroll', async () => {
  await page.viewport(390, 800);
  seen();
  window.history.replaceState(null, '', '/?guide');
  const {findByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: TITLE});
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
 });
});
