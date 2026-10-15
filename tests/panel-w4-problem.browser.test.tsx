import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
// The page's own styles: faces, colours and widths are what these measure.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
/* THE PROBLEM, AT THE TOP OF THE PANEL.
 *
 * What is given, where the axes are, what is held fixed and what to find was rendered in one place: a
 * closed disclosure at the panel's foot, "The problem, model assumptions & references". A student never
 * read the arc's "Q is fixed as φ changes", which decides what its slider does, or where the rod lies and
 * where P is. Every problem a lecturer sets opens with that paragraph, and so does the panel now. */
afterEach(cleanup);
beforeAll(async () => {
  const still = document.createElement('style');
  still.textContent = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
  document.head.appendChild(still);
  await document.fonts.ready;
});
const panel = (id: ProblemId, width = 340, path?: string) => render(<div style={{width}}><EquationWorkbench problem={getProblem(id)}
  derivationProblem={path ? getProblem(id, path) : undefined} params={DEFAULT_PARAMS} onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} /></div>);

describe('the panel opens on the problem', () => {
  it('every lesson: "The problem" first, its setup set as prose with its symbols as math, above Cut it up and out of any disclosure', async () => {
    for (const p of PROBLEMS) {
      const view = panel(p.id);
      const region = view.getByRole('region', {name: 'The problem'});
      expect(view.container.querySelector('.ew-content')!.firstElementChild, p.id).toBe(region);
      expect(region.closest('details'), p.id).toBeNull();
      expect(region.checkVisibility(), p.id).toBe(true);
      const text = region.querySelector<HTMLElement>('.ew-problem-text')!;
      // The setup's own words, every symbol typeset: no "$" left, and its relations held whole.
      expect(text.textContent, p.id).not.toMatch(/\$/);
      expect(text.querySelectorAll('.katex').length, p.id).toBeGreaterThan(1);
      expect(text.textContent, p.id).toMatch(/Find /);
      const cut = view.container.querySelector('.db-step[data-step="pieces"]')!;
      expect(region.getBoundingClientRect().bottom, p.id).toBeLessThanOrEqual(cut.getBoundingClientRect().top);
      cleanup();
    }
  }, 60000);
  it('the foot disclosure keeps the model note and the sources, and no longer the problem', () => {
    const view = panel('arc');
    const summary = view.container.querySelector('.ew-references summary')!;
    expect(summary.textContent).toBe('Model assumptions & references');
    fireEvent.click(summary);
    const body = view.container.querySelector('.ew-references-body')!.textContent!;
    expect(body).not.toMatch(/Find the electric field|centre of curvature/);
    expect(body).toMatch(/Finite distributions use total charge/);
    // The arc's "Q is fixed as φ changes" is on the page, in the open.
    expect(view.container.querySelector('.ew-problem-text')!.textContent).toMatch(/The total charge Q+ is fixed as/);
  });
  it('the infinite line’s finite-rod route states its own problem', () => {
    const text = panel('infinite', 340, 'limit').container.querySelector('.ew-problem-text')!.textContent!;
    expect(text).toMatch(/Start with a rod of length L/);
    expect(text).not.toMatch(/r tan α/);
  });
});

describe('set as the panel sets its prose', () => {
  it('in the remarks’ sans and size, in ink rather than the gloss’s grey, under a name in the steps’ serif', () => {
    const view = panel('bisector');
    const text = view.container.querySelector<HTMLElement>('.ew-problem-text')!, say = view.container.querySelector<HTMLElement>('.db-say')!;
    expect(getComputedStyle(text).fontFamily).toBe(getComputedStyle(say).fontFamily);
    expect(getComputedStyle(text).fontSize).toBe(getComputedStyle(say).fontSize);
    expect(getComputedStyle(text).color).not.toBe(getComputedStyle(say).color);
    expect(getComputedStyle(text).color).toBe(getComputedStyle(view.container.querySelector('.ew-section-title')!).color);
    const title = view.container.querySelector<HTMLElement>('.ew-problem-title')!, step = view.container.querySelector<HTMLElement>('.db-title')!;
    expect(getComputedStyle(title).fontFamily).toBe(getComputedStyle(step).fontFamily);
    expect(getComputedStyle(title).fontSize).toBe(getComputedStyle(step).fontSize);
  });
  it('short beside the panel: the rod’s problem is five lines at most at the laptop’s 290px measure', () => {
    const text = panel('bisector').container.querySelector<HTMLElement>('.ew-problem-text')!;
    expect(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)).toBeLessThan(5.5);
  });
  it('on a phone nothing runs past the panel’s edge, and no symbol breaks inside', async () => {
    for (const p of PROBLEMS) {
      const view = panel(p.id, 358);
      const box = view.container.querySelector<HTMLElement>('.ew-problem')!, right = box.getBoundingClientRect().right;
      expect(box.scrollWidth, p.id).toBeLessThanOrEqual(box.clientWidth);
      for (const k of box.querySelectorAll('.katex')) expect(k.getBoundingClientRect().right, `${p.id}: ${k.textContent}`).toBeLessThanOrEqual(right + .5);
      // A held symbol is one line tall: a relation never wraps inside.
      for (const k of box.querySelectorAll<HTMLElement>('.db-sym')) expect(k.getClientRects().length, `${p.id}: ${k.textContent}`).toBe(1);
      cleanup();
    }
  }, 60000);
});
