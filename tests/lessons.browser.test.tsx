import 'katex/dist/katex.min.css';
import '../app/globals.css';
import {cleanup, render, waitFor, within} from '@testing-library/react';
import {afterEach, describe, expect, it, onTestFinished} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
import Explorer, {STORAGE} from '../src/explorer/Explorer';
import {lessonFor} from '../src/lessons';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
/* THE LESSON AT THE TOP OF THE LESSON (LessonIntro.tsx). Its lead is always on the page, under the title and
 * above the figure; the teaching opens and shuts under one button, shut by default so the figure keeps the first
 * screen, and the reader's choice is remembered; on paper it prints whole and open whatever the button says. */
afterEach(async () => {
  cleanup();
  window.history.replaceState(null, '', '/');
  window.scrollTo(0, 0);
  try { await cdp().send('Emulation.setEmulatedMedia', {media: ''}); } catch { /* not emulating */ }
  await page.viewport(1280, 800);
});
async function openLesson(id: string, saved: Record<string, unknown> = {}) {
  // The previous test's debounced save must land before this one writes its own lesson.
  await new Promise(r => setTimeout(r, 280));
  localStorage.setItem(STORAGE, JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}, ...saved}));
  const view = render(<Explorer />);
  await view.findByRole('button', {name: 'Watch it build'});
  await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
  return view;
}
const saved = () => JSON.parse(localStorage.getItem(STORAGE) ?? '{}');

describe('the lesson at the top', () => {
  it('shows its lead under the title and above the figure, with the teaching shut', async () => {
    const view = await openLesson('bisector');
    const lesson = view.getByRole('region', {name: 'The lesson'});
    const lead = lesson.querySelector('.exp-lesson-lead')!;
    expect(lead.checkVisibility()).toBe(true);
    expect(lead.textContent).toMatch(/mirror piece/);
    // Set as math, not as dollar signs.
    expect(lead.textContent).not.toContain('$');
    expect(lead.querySelector('.katex')).toBeTruthy();
    const title = view.getByRole('heading', {level: 1}), card = view.container.querySelector('.exp-diagram-card')!;
    expect(title.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lead.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const toggle = within(lesson).getByRole('button', {name: 'Read the lesson'});
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(within(lesson).queryByRole('heading', {name: 'What cancels'})).toBeNull();
  });

  it('opens and shuts from the keyboard, and remembers which', async () => {
    const view = await openLesson('bisector');
    const lesson = view.getByRole('region', {name: 'The lesson'});
    const toggle = within(lesson).getByRole('button', {name: 'Read the lesson'});
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('true'));
    expect(toggle.textContent).toBe('Hide the lesson');
    const body = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(body.checkVisibility()).toBe(true);
    for (const s of lessonFor('bisector')!.sections) expect(within(lesson).getByRole('heading', {level: 3, name: s.heading}).checkVisibility()).toBe(true);
    expect(within(lesson).getByRole('heading', {level: 3, name: 'Read it in a textbook'})).toBeTruthy();
    expect(body.querySelectorAll('.exp-lesson-display .katex-display').length).toBeGreaterThanOrEqual(3);
    // Remembered, in the Explorer's own saved settings.
    await waitFor(() => expect(saved().lessonOpen).toBe(true), {timeout: 2000});
    cleanup();
    const again = render(<Explorer />);
    await again.findByRole('button', {name: 'Watch it build'});
    const reopened = again.getAllByRole('button', {name: 'Hide the lesson', expanded: true})[0];
    expect(reopened.closest('.exp-lesson')).toBeTruthy();
    // Shut with Space, and remembered shut.
    reopened.focus();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(again.getByRole('button', {name: 'Read the lesson'}).getAttribute('aria-expanded')).toBe('false'));
    await waitFor(() => expect(saved().lessonOpen).toBe(false), {timeout: 2000});
  }, 15000);

  it('ends on the way to the build, and its foot hands the focus back to the top', async () => {
    const view = await openLesson('bisector', {lessonOpen: true});
    const lesson = view.getByRole('region', {name: 'The lesson'});
    await userEvent.click(within(lesson).getByRole('button', {name: 'Go to Watch it build'}));
    await waitFor(() => expect(document.activeElement).toBe(view.getByRole('button', {name: 'Watch it build'})));
    // Hidden from its foot, the focus goes to the top's button, not to nothing.
    const foot = within(lesson).getAllByRole('button', {name: 'Hide the lesson'}).at(-1)!;
    expect(foot.closest('.exp-lesson-next')).toBeTruthy();
    await userEvent.click(foot);
    const top = within(lesson).getByRole('button', {name: 'Read the lesson'});
    await waitFor(() => expect(document.activeElement).toBe(top));
  }, 15000);

  it('leaves the figure and Watch it build on a laptop’s first screen while it is shut', async () => {
    await page.viewport(1280, 720);
    const view = await openLesson('bisector');
    const box = view.getByRole('button', {name: 'Watch it build'}).getBoundingClientRect();
    expect(box.bottom).toBeLessThan(window.innerHeight);
    // And at a Chromebook's height the drawing is held to what the lead leaves of the window.
    await page.viewport(1366, 657);
    await document.fonts.ready;
    await waitFor(() => expect(view.container.querySelector('.cd-stage')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 1));
  }, 15000);

  it('prints whole and open at the top, with the screen’s buttons left off, whatever the disclosure says', async () => {
    const view = await openLesson('bisector');
    const lesson = view.getByRole('region', {name: 'The lesson'});
    const toggle = within(lesson).getByRole('button', {name: 'Read the lesson'});
    const body = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(body.checkVisibility()).toBe(false);
    await page.viewport(816, 1056);
    await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
    expect(body.checkVisibility(), 'the shut lesson does not print').toBe(true);
    expect(lesson.querySelector<HTMLElement>('.exp-lesson-lead')!.checkVisibility()).toBe(true);
    expect(toggle.checkVisibility(), 'Read the lesson prints').toBe(false);
    expect(lesson.querySelector<HTMLElement>('.exp-lesson-next')!.checkVisibility(), 'the way to the build prints').toBe(false);
    // A book's address is printed under it: on paper a link is only its words.
    expect(lesson.querySelector<HTMLElement>('.exp-lesson-url')!.checkVisibility()).toBe(true);
    // At the top: before the figure.
    expect(lesson.getBoundingClientRect().bottom).toBeLessThanOrEqual(view.container.querySelector('.exp-diagram-card')!.getBoundingClientRect().top);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 24);
    await cdp().send('Emulation.setEmulatedMedia', {media: ''});
    expect(body.checkVisibility(), 'printing opened it on the screen').toBe(false);
  }, 15000);

  it('fits a phone: no sideways scroll, open or shut', async () => {
    await page.viewport(390, 844);
    // The limit plot's data table is hidden by the app's sr-only rule, which this project does not build here;
    // unclipped, it alone runs the page wider than a phone (print.browser.test.tsx does the same).
    const srOnly = document.createElement('style');
    srOnly.textContent = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border-width:0}';
    document.head.appendChild(srOnly);
    onTestFinished(() => { srOnly.remove(); });
    const view = await openLesson('bisector', {lessonOpen: true});
    await document.fonts.ready;
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    expect(view.container.querySelector('.exp-lesson')!.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    // Every equation fits whole: none scrolls sideways inside itself either.
    for (const d of view.container.querySelectorAll<HTMLElement>('.exp-lesson-display')) expect(d.scrollWidth, d.textContent ?? '').toBeLessThanOrEqual(d.clientWidth + 1);
  }, 15000);

  it('shows nothing above a geometry whose lesson is not written yet', async () => {
    const none = PROBLEMS.find(p => !lessonFor(p.id));
    if (!none) return;
    const view = await openLesson(none.id);
    expect(view.container.querySelector('.exp-lesson')).toBeNull();
    expect(view.queryByRole('button', {name: 'Read the lesson'})).toBeNull();
  });
});
