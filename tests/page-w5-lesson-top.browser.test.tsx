import 'katex/dist/katex.min.css';
import '../app/globals.css';
import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
import Explorer, {STORAGE} from '../src/explorer/Explorer';
import Site, {newVisit} from '../src/home/Site';
import {getProblem} from '../src/problems/definitions';
/* THE PAGE AROUND THE LESSON'S LEAD (wave five). Where the focus lands on the way in, where the skip link goes,
 * that the lesson's text opens shut on every lesson, that the lead costs the drawing only a little of its size on
 * a short window, that the limits' and confusions' sentences set their symbols in the formulas' face, and that a
 * phone's transport hangs a conclusion's rows under the line's "=". */
beforeEach(() => newVisit());
afterEach(async () => {
  cleanup();
  window.history.replaceState(null, '', '/');
  window.scrollTo(0, 0);
  try { await cdp().send('Emulation.setEmulatedMedia', {media: '', features: []}); } catch { /* not emulating */ }
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

describe('the way in', () => {
  it('leaves the focus on the lesson’s title after a lesson is chosen at home, and after Back into one', async () => {
    localStorage.setItem(STORAGE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
    const view = render(<Site />);
    const start = await view.findByRole('link', {name: /Start with the finite line/});
    start.focus();
    await userEvent.keyboard('{Enter}');
    const title = await view.findByRole('heading', {level: 1, name: getProblem('bisector').title});
    await waitFor(() => expect(document.activeElement, 'the focus was left on the page itself').toBe(title));
    // Home, and Back into the lesson.
    window.history.back();
    await view.findByRole('heading', {level: 1, name: 'One law, every geometry.'});
    window.history.forward();
    const again = await view.findByRole('heading', {level: 1, name: getProblem('bisector').title});
    await waitFor(() => expect(document.activeElement).toBe(again));
  }, 15000);

  it('skips to the lesson’s title, so the next stops are Read the lesson and then Watch it build', async () => {
    const view = await openLesson('bisector');
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('Skip to the lesson');
    await userEvent.keyboard('{Enter}');
    expect(document.activeElement).toBe(view.getByRole('heading', {level: 1}));
    await userEvent.tab();
    expect(document.activeElement).toBe(view.getByRole('button', {name: 'Read the lesson'}));
    await userEvent.tab();
    expect(document.activeElement).toBe(view.getByRole('button', {name: 'Watch it build'}));
  });

  it('opens each lesson’s text shut, whatever was open before, and keeps no flag for it', async () => {
    const view = await openLesson('bisector', {lessonOpen: true});
    const read = view.getByRole('button', {name: 'Read the lesson'});
    expect(read.getAttribute('aria-expanded'), 'an old saved flag opened it').toBe('false');
    await userEvent.click(read);
    await waitFor(() => expect(view.getAllByRole('button', {name: 'Hide the lesson'}).length).toBeGreaterThan(0));
    // Saved settings never carry it.
    await waitFor(() => expect(saved().id).toBe('bisector'), {timeout: 2000});
    await new Promise(r => setTimeout(r, 400));
    expect(saved()).not.toHaveProperty('lessonOpen');
    // Another lesson and back: shut.
    await userEvent.click(within(view.getByRole('navigation', {name: 'Lessons'})).getByRole('link', {name: getProblem('ring').short}));
    await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('ring').title));
    await userEvent.click(within(view.getByRole('navigation', {name: 'Lessons'})).getByRole('link', {name: getProblem('bisector').short}));
    await waitFor(() => expect(view.getByRole('button', {name: 'Read the lesson'}).getAttribute('aria-expanded')).toBe('false'));
  }, 15000);

  it('says the problem once above the figure: no subtitle where the lead says it', async () => {
    const view = await openLesson('bisector');
    expect(view.container.querySelector('.exp-heading > div > p')).toBeNull();
    expect(view.container.querySelector('.exp-lesson-lead')?.textContent).toMatch(/^Find the field/);
  });
});

describe('the lead and the drawing on a short window', () => {
  for (const [w, h] of [[1366, 605], [1093, 526]] as const) {
    it(`keeps most of the drawing’s size at ${w} by ${h}`, async () => {
      await page.viewport(w, h);
      const stage = async (id: string) => {
        const view = await openLesson(id);
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 200));
        const height = view.container.querySelector('.cd-stage')!.getBoundingClientRect().height;
        cleanup();
        window.history.replaceState(null, '', '/');
        return height;
      };
      // The ring has no lead yet; when it has one, the infinite line or any other leadless lesson stands in.
      const withLead = await stage('bisector'), without = await stage('ring');
      expect(withLead / without, `${withLead} against ${without}`).toBeGreaterThanOrEqual(.8);
    }, 20000);
  }
});

describe('symbols in the limits’ and the confusions’ sentences', () => {
  it('sets Latin symbols in the formulas’ italic, and leaves the words alone', async () => {
    const view = await openLesson('bisector');
    const slips = [...view.container.querySelectorAll('.exp-slip-note p')];
    const holds = slips.find(p => /holds/.test(p.textContent ?? ''))!;
    expect(holds, 'the confusion about dQ').toBeTruthy();
    const italic = [...holds.querySelectorAll('.exp-greek')].map(s => s.textContent);
    expect(italic).toEqual(expect.arrayContaining(['dy', 'Q', 'L']));
    expect(italic).not.toContain('A');
    expect(italic.some(t => (t ?? '').length > 2 && !/[Ͱ-Ͽ]/.test(t ?? ''))).toBe(false);
    const why = view.container.querySelector('.exp-limit-why')!;
    const words = [...why.querySelectorAll('.exp-greek')].map(s => s.textContent);
    expect(words).toEqual(expect.arrayContaining(['r', 'P']));
  });
});

describe('a phone’s transport', () => {
  it('hangs the ring’s exact sum under its line’s "="', async () => {
    await page.viewport(390, 844);
    const view = await openLesson('ring');
    fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
    fireEvent.click(await view.findByRole('button', {name: 'Stage 4: Add them up'}));
    const pause = view.queryByRole('button', {name: 'Pause'});
    if (pause) fireEvent.click(pause);
    await document.fonts.ready;
    const step = await waitFor(() => { const s = view.container.querySelector<HTMLElement>('.bp-math-step.is-here'); if (!s?.querySelector('.bp-finish')) throw new Error('no finish'); return s; });
    const lineEq = step.querySelector(':scope > .math .mrel, :scope > .katex-display .mrel, :scope .mrel')!.getBoundingClientRect();
    const rows = [...step.querySelectorAll('.bp-finish-rows > *')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const eq = row.querySelector('.mrel')!.getBoundingClientRect();
      expect(Math.abs(eq.left - lineEq.left), `row "=" at ${eq.left}, the line's at ${lineEq.left}`).toBeLessThan(3);
    }
  }, 15000);
});

describe('the home page in a contrast theme', () => {
  it('keeps an edge on its main button', async () => {
    await cdp().send('Emulation.setEmulatedMedia', {features: [{name: 'forced-colors', value: 'active'}]});
    localStorage.setItem(STORAGE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
    const view = render(<Site />);
    const start = await view.findByRole('link', {name: /Start with the finite line/});
    expect(parseFloat(getComputedStyle(start).borderTopWidth)).toBeGreaterThan(0);
  });
});
