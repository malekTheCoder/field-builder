import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Site, {newVisit} from '../src/home/Site';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';

/* THE SITE HAS A FRONT PAGE. The bare address is the home page; an address that names a lesson opens it;
 * the name in the corner and Back both come home. */
const STORE = 'field-builder:explorer:v1';
const seen = (extra: object = {}) => localStorage.setItem(STORE, JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}, ...extra}));

// Each test is a visit of its own, as a page load is.
beforeEach(() => newVisit());
afterEach(async () => {
 cleanup();
 localStorage.clear();
 document.documentElement.classList.remove('dark');
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});

describe('the home page', () => {
 it('is what the bare address opens, even for a reader with a last lesson saved', async () => {
  seen({id: 'ring'});
  window.history.replaceState(null, '', '/');
  const {findByRole, getByRole, container} = render(<Site />);
  expect(await findByRole('heading', {level: 1, name: 'One law, every geometry.'})).toBeTruthy();
  expect(container.querySelector('.exp-workspace')).toBeNull();
  // Every family the lesson list has, each with its lessons as links to their own addresses.
  for (const family of ['Straight rods', 'Rings, disks and arcs', 'Charge with no end', 'The same shapes, as potential'])
   expect(getByRole('heading', {level: 3, name: family})).toBeTruthy();
  const ring = getByRole('link', {name: getProblem('ring').short});
  expect(ring.getAttribute('href')).toBe('?p=ring');
  expect(ring.querySelector('[data-glyph=ring]')).toBeTruthy();
  expect(getByRole('link', {name: /Start with the finite line/}).getAttribute('href')).toBe('?p=bisector');
  // The way back to where the reader was.
  expect(getByRole('link', {name: /Continue where you left off/}).textContent).toContain(getProblem('ring').short);
  // The page prints no numerals.
  expect(container.textContent).not.toMatch(/[0-9]/);
  expect(window.location.search).toBe('');
 });

 it('opens a lesson from its card, and Back comes home', async () => {
  seen();
  const {findByRole, getByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  await userEvent.click(getByRole('link', {name: getProblem('ring').short}));
  expect(await findByRole('heading', {level: 1, name: getProblem('ring').title})).toBeTruthy();
  expect(new URLSearchParams(window.location.search).get('p')).toBe('ring');
  window.history.back();
  expect(await findByRole('heading', {level: 1, name: 'One law, every geometry.'})).toBeTruthy();
 }, 15000);

 it('comes home from the name in the corner', async () => {
  seen();
  window.history.replaceState(null, '', '/?p=disk');
  const {findByRole, getByRole} = render(<Site />);
  expect(await findByRole('heading', {level: 1, name: getProblem('disk').title})).toBeTruthy();
  const home = getByRole('link', {name: 'Field Builder home'});
  await userEvent.click(home);
  expect(await findByRole('heading', {level: 1, name: 'One law, every geometry.'})).toBeTruthy();
  expect(window.location.search).toBe('');
  // On the home page the same link says it is the page the reader is on.
  expect(getByRole('link', {name: 'Field Builder home'}).getAttribute('aria-current')).toBe('page');
 }, 15000);

 it('opens a shared lesson link directly, with its values', async () => {
  seen({id: 'axial'});
  window.history.replaceState(null, '', '/?p=ring');
  const {findByRole, container} = render(<Site />);
  expect(await findByRole('heading', {level: 1, name: getProblem('ring').title})).toBeTruthy();
  expect(container.querySelector('.home')).toBeNull();
 });

 it('takes a lesson back with the values the reader left it with', async () => {
  seen({id: 'ring', params: {ring: {...DEFAULT_PARAMS, distance: 4.5}}});
  const {findByRole, getByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  const href = getByRole('link', {name: getProblem('ring').short}).getAttribute('href')!;
  expect(new URLSearchParams(href).get('distance')).toBe('4.5');
  expect(new URLSearchParams(href).get('p')).toBe('ring');
 });

 it('switches the theme and keeps it for the lessons', async () => {
  seen();
  const {findByRole, getByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  await userEvent.click(getByRole('button', {name: 'Switch to dark theme'}));
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(JSON.parse(localStorage.getItem(STORE)!).dark).toBe(true);
  await waitFor(() => expect(getByRole('button', {name: 'Switch to light theme'})).toBeTruthy());
 });

 // The tour opens once a visit. The visit now starts on the home page, so it is the first lesson entered
 // from there that is offered it -- and not every lesson after, each time the reader comes home and goes back.
 it('offers the tour on the first lesson of a visit, and not again on coming back', async () => {
  const tour = () => document.querySelector('.fb-onboarding');
  const {findByRole, getByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  expect(tour(), 'the tour opened over the home page').toBeNull();
  await userEvent.click(getByRole('link', {name: getProblem('arc').short}));
  await waitFor(() => expect(tour()).toBeTruthy());
  await userEvent.click(getByRole('button', {name: 'Skip intro'}));
  await waitFor(() => expect(tour()).toBeNull());
  await userEvent.click(getByRole('link', {name: 'Field Builder home'}));
  await findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  await userEvent.click(getByRole('link', {name: getProblem('disk').short}));
  expect(await findByRole('heading', {level: 1, name: getProblem('disk').title})).toBeTruthy();
  await new Promise(r => setTimeout(r, 400));
  expect(tour(), 'the tour came back within the same visit').toBeNull();
 }, 20000);

 it('fits a phone with no sideways scroll', async () => {
  await page.viewport(360, 740);
  seen();
  const {findByRole} = render(<Site />);
  await findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
 });
});
