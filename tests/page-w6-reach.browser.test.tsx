import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, describe, expect, it, onTestFinished} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
// Measured with the page's own type and sheet: whether a header link wraps depends on both.
import '@fontsource-variable/hanken-grotesk';
import '../app/globals.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* WAVE SIX, THE PAGE: WHAT A READER COULD NOT REACH, AND WHAT THE KEYS DID THAT THEY SHOULD NOT.
 *
 * Space started the run a screen above a reader who had scrolled down to the board; Escape did not leave the run;
 * a lesson chosen from the list was opened in silence; the library's Close came after every card; on a phone the
 * guide and the quiz could not be reached from a lesson, and between about five hundred and seven hundred pixels
 * "How to use" broke over two lines; a teacher had no sign the teacher's tools existed; the page ignored a phone
 * set to dark; a laptop zoomed to 200% lost the run's sentence; and the run's controls were small for a finger. */
const STORE = 'field-builder:explorer:v1';
afterEach(async () => {
 cleanup();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 document.documentElement.classList.remove('dark');
 try { await cdp().send('Emulation.setEmulatedMedia', {media: '', features: []}); } catch { /* not emulating */ }
 await page.viewport(1280, 800);
});
async function openLesson(id: string, width = 1280, height = 800, saved: Record<string, unknown> = {dark: false}) {
 await page.viewport(width, height);
 // The previous test's debounced save must land before this one writes its own lesson.
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id, hideTour: true, cued: true, sidebarOpen: true, params: {}, ...saved}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('the run\'s keys', () => {
 it('Space pages the window when the drawing is scrolled away, and does not start the run', async () => {
  const view = await openLesson('bisector', 390, 844);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(await view.findByRole('button', {name: 'Pause'}));
  await view.findByRole('button', {name: 'Play'});
  const stage = view.container.querySelector('.exp-diagram-card .cd-stage')!;
  window.scrollTo(0, stage.getBoundingClientRect().bottom + window.scrollY + 300);
  await sleep(50);
  expect(stage.getBoundingClientRect().bottom, 'the drawing is still on screen').toBeLessThan(0);
  (document.activeElement as HTMLElement | null)?.blur();
  const before = window.scrollY;
  await userEvent.keyboard(' ');
  await sleep(300);
  expect(view.queryByRole('button', {name: 'Pause'}), 'Space played a run nobody could see').toBeNull();
  expect(view.getByRole('button', {name: 'Play'})).toBeTruthy();
  expect(window.scrollY, 'Space did not page the window').toBeGreaterThan(before);
 }, 30000);
 it('Escape from the transport closes the run and hands the focus back to Watch it build', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  const pause = await view.findByRole('button', {name: 'Pause'});
  pause.focus();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(view.queryAllByRole('button', {name: /^Stage \d: /})).toHaveLength(0));
  await waitFor(() => expect(document.activeElement).toBe(view.getByRole('button', {name: 'Watch it build'})));
  expect(location.search).not.toMatch(/stage=/);
 }, 30000);
 it('Escape from the lesson itself closes the run too, but not while a menu is open', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(await view.findByRole('button', {name: 'Pause'}));
  await userEvent.click(view.getByRole('button', {name: 'Lesson tools'}));
  await view.findByRole('menuitem', {name: 'Print this lesson'});
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(view.queryByRole('menuitem', {name: 'Print this lesson'})).toBeNull());
  expect(view.getAllByRole('button', {name: /^Stage \d: /}), 'the menu\'s Escape closed the run as well').toHaveLength(5);
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(view.queryAllByRole('button', {name: /^Stage \d: /})).toHaveLength(0));
 }, 30000);
});

describe('choosing a lesson', () => {
 it('from the list, a screen reader is told it is open, and the focus stays in the list', async () => {
  const view = await openLesson('bisector');
  const link = view.getByRole('link', {name: 'Arc of charge'});
  link.focus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('arc').title));
  const said = [...view.container.querySelectorAll('output[aria-live]')].map(o => o.textContent);
  expect(said).toContain(`${getProblem('arc').title} is open.`);
  expect(document.activeElement).toBe(view.getByRole('link', {name: 'Arc of charge'}));
 }, 20000);
 it('the library\'s Close comes before its cards, one Shift+Tab from the card it opens on', async () => {
  const view = await openLesson('ring', 900, 800);
  fireEvent.click(view.getByRole('button', {name: 'Charge library'}));
  const dialog = await view.findByRole('dialog');
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  const close = within(dialog).getByRole('button', {name: 'Close'});
  const firstCard = dialog.querySelector('.exp-library-list a, .exp-library-list button')!;
  expect(close.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING, 'Close is after the cards').toBeTruthy();
  (firstCard as HTMLElement).focus();
  await userEvent.tab({shift: true});
  expect(document.activeElement).toBe(close);
 }, 20000);
});

describe('the header on every width', () => {
 const menuItems = async (view: Awaited<ReturnType<typeof openLesson>>) => {
  await userEvent.click(view.getByRole('button', {name: 'Lesson tools'}));
  await view.findByRole('menuitem', {name: 'Print this lesson'});
  return view.getAllByRole('menuitem').map(m => m.textContent);
 };
 for (const width of [320, 360, 390]) it(`at ${width} pixels the walkthrough, the guide and the quiz are named rows in Lesson tools`, async () => {
  const view = await openLesson('bisector', width, 800);
  // This harness mounts Explorer without Site, so navigation does not unmount the lesson.
  // Let its initial address debounce settle before testing an outgoing link, or that pending
  // timer can overwrite the test's destination after the click; Site cancels it by unmounting.
  await waitFor(() => expect(new URLSearchParams(location.search).get('p')).toBe('bisector'), {timeout: 10000});
  // The header holds the theme and the menu alone, and does not run past the window.
  expect(view.queryByRole('button', {name: 'Walkthrough'})).toBeNull();
  expect(view.queryByRole('link', {name: 'Quiz yourself'})).toBeNull();
  // (The header's own width: this project does not build the app's sr-only rule, whose hidden tables run the page wide.)
  const header = view.container.querySelector('.exp-header')!;
  expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  const items = await menuItems(view);
  expect(items.slice(0, 3)).toEqual(['Walkthrough', 'How to use this site', 'Quiz yourself']);
  expect(view.getByRole('menuitem', {name: 'How to use this site'}).getAttribute('href')).toBe('?guide');
  await userEvent.click(view.getByRole('menuitem', {name: 'Quiz yourself'}));
  await waitFor(() => expect(location.search).toBe('?quiz'));
 }, 20000);
 it('on a phone the walkthrough opens from the menu and gives the focus back to it', async () => {
  const view = await openLesson('bisector', 390, 844);
  await menuItems(view);
  await userEvent.click(view.getByRole('menuitem', {name: 'Walkthrough'}));
  await view.findByRole('dialog');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(view.getByRole('button', {name: 'Lesson tools'})));
 }, 20000);
 for (const width of [701, 760, 1000, 1280]) it(`at ${width} pixels each of the three is named on one line in the header, and not in the menu`, async () => {
  const view = await openLesson('bisector', width, 800);
  const links = [view.getByRole('button', {name: 'Walkthrough'}), view.getByRole('link', {name: 'How to use this site'}), view.getByRole('link', {name: 'Quiz yourself'})];
  for (const l of links) {
   expect(l.textContent!.length, 'an icon with no name').toBeGreaterThan(3);
   expect(l.getBoundingClientRect().height, `${l.textContent} broke over two lines`).toBeLessThanOrEqual(40);
  }
  const header = view.container.querySelector('.exp-header')!;
  expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  const items = await menuItems(view);
  expect(items).not.toContain('Quiz yourself');
  expect(items).not.toContain('Walkthrough');
 }, 20000);
 it('the teacher\'s tools are named as theirs, at every width', async () => {
  for (const width of [390, 1280]) {
   const view = await openLesson('ring', width, 800);
   await menuItems(view);
   const row = view.getByRole('menuitem', {name: 'Teaching with this? Links, print and projector tips'});
   expect(row.getAttribute('href')).toBe('?guide#guide-teachers');
   cleanup();
  }
 }, 30000);
});

describe('the theme', () => {
 const systemDark = async () => cdp().send('Emulation.setEmulatedMedia', {media: '', features: [{name: 'prefers-color-scheme', value: 'dark'}]});
 it('with no choice saved, follows a system set to dark, and saves nothing until one is made', async () => {
  await systemDark();
  const view = await openLesson('bisector', 1280, 800, {});
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
  await sleep(400);
  expect(JSON.parse(localStorage.getItem(STORE) ?? '{}').dark, 'the system\'s theme was saved as a choice').toBeUndefined();
  fireEvent.click(view.getByRole('button', {name: 'Switch to light theme'}));
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  await waitFor(() => expect(JSON.parse(localStorage.getItem(STORE) ?? '{}').dark).toBe(false), {timeout: 2000});
 }, 20000);
 it('a saved choice wins over the system', async () => {
  await systemDark();
  await openLesson('bisector', 1280, 800, {dark: false});
  await sleep(100);
  expect(document.documentElement.classList.contains('dark')).toBe(false);
 }, 20000);
});

describe('a laptop zoomed to 200%', () => {
 it('keeps the run\'s sentence (640 by 360, a mouse)', async () => {
  const view = await openLesson('bisector', 640, 360);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(await view.findByRole('button', {name: 'Pause'}));
  const line = view.container.querySelector<HTMLElement>('.bp-line')!;
  expect(getComputedStyle(view.container.querySelector('.bp-lines')!).display).not.toBe('none');
  expect(line.getBoundingClientRect().width, 'the sentence is drawn').toBeGreaterThan(100);
 }, 20000);
});

/** The page's touch rules, applied as a touch screen would apply them: read from the sheet rather than by emulating
 * one, since Chromium keeps answering as a touch screen after its emulation is switched off (page-wip-carry). Only
 * the rules with no other condition, so the phone-on-its-side rules do not land on this window too. */
function asIfCoarse() {
 const rules = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules]; } catch { return []; } })
  .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule && /^\(any-pointer:\s*coarse\)$/.test(r.conditionText.trim()))
  .flatMap(r => [...r.cssRules].map(x => x.cssText));
 const style = document.createElement('style');
 style.textContent = rules.join('\n');
 document.head.appendChild(style);
 onTestFinished(() => { style.remove(); });
}
const pad = (el: Element) => {
 const box = el.getBoundingClientRect(), s = getComputedStyle(el, '::before');
 const on = s.content !== 'none' && s.position === 'absolute';
 return on ? {left: box.left + parseFloat(s.left), right: box.right - parseFloat(s.right), top: box.top + parseFloat(s.top), bottom: box.bottom - parseFloat(s.bottom)} : {left: box.left, right: box.right, top: box.top, bottom: box.bottom};
};
describe('on a touch screen', () => {
 it('Watch it build, the zoom keys and the run\'s buttons are a finger\'s size, and no margin covers the next button', async () => {
  const view = await openLesson('bisector', 390, 844);
  asIfCoarse();
  await sleep(50);
  expect(view.getByRole('button', {name: 'Watch it build'}).getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  const zoom = [view.getByRole('button', {name: 'Zoom out'}), view.getByRole('button', {name: 'Zoom in'})].map(pad);
  for (const z of zoom) expect(z.bottom - z.top).toBeGreaterThanOrEqual(40);
  expect(zoom[1].left).toBeGreaterThanOrEqual(zoom[0].right);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(await view.findByRole('button', {name: 'Pause'}));
  const steps = [view.getByRole('button', {name: 'Previous stage'}), view.getByRole('button', {name: 'Next stage'})].map(pad);
  for (const s of [...steps, pad(view.getByRole('button', {name: 'Close'}))]) expect(s.bottom - s.top).toBeGreaterThanOrEqual(40);
  expect(steps[1].left, 'Previous\'s margin covers Next').toBeGreaterThanOrEqual(steps[0].right);
 }, 30000);
});
