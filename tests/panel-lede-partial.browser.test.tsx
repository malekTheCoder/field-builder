import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {cdp} from 'vitest/browser';
// The page's own styles: a size and a display are what these measure.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
/* THE PANEL AROUND THE BOARD, ROUND THREE.
 *
 * Each was a critic's finding on the real page: the lede told a phone reader to point at a symbol a
 * tap would instead play; the part-of-the-distribution card said the closed form needs the whole
 * charge, under a board that had just finished on one; the answer printed an E_y the board had only
 * said survives; the glosses' math was set a size below the symbols in the sentences under them; and
 * the infinite line's Unfold opened on a y-integral its board never wrote. */
afterEach(async () => {
  cleanup();
  try { await cdp().send('Emulation.setTouchEmulationEnabled', {enabled: false}); } catch { /* not emulating */ }
});
beforeAll(async () => {
  const still = document.createElement('style');
  still.textContent = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
  document.head.appendChild(still);
  await document.fonts.ready;
});
const panel = (id: ProblemId, boundRange: [number, number] = [0, 100], highlight = '') => render(<EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS}
  onModeChange={vi.fn()} boundRange={boundRange} onBoundRangeChange={vi.fn()} highlight={highlight} />);

describe('the lede asks only for what the screen can do', () => {
  it('a screen that can hover is told to point; one that cannot is not', async () => {
    const view = panel('bisector');
    const clause = view.container.querySelector<HTMLElement>('.ew-lede-hover')!;
    expect(clause.textContent).toMatch(/point at a coloured symbol/);
    expect(matchMedia('(hover: none)').matches).toBe(false);
    expect(getComputedStyle(clause).display).not.toBe('none');
    // A touch screen: Chromium's touch emulation answers (hover: none), as a phone does.
    await cdp().send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
    expect(matchMedia('(hover: none)').matches, 'emulated a touch screen').toBe(true);
    expect(getComputedStyle(clause).display).toBe('none');
    // The sentence still ends properly without it.
    expect(view.container.querySelector('.ew-lede')!.textContent).toMatch(/watch it on the figure.*\.$/);
  });
});

describe('a bracket’s card says what its integral is', () => {
  it('never "closed form"; on the exact lessons, that the last line already gives the part’s answer', () => {
    for (const id of ['bisector', 'ring', 'v-ring', 'v-arc', 'ramp', 'semi'] as const) {
      const view = panel(id, [0, 50]);
      const text = view.container.querySelector('.ew-result.is-partial')!.textContent!;
      expect(text, id).not.toMatch(/closed form/);
      expect(text, id).toMatch(/adds up only the bracketed part of the charge/);
      if (['ring', 'v-ring', 'v-arc'].includes(id)) expect(text, id).toMatch(/its last line already gives that part’s/);
      // Not a promise of a value but the value: the lesson's bracket between the handles' own ends.
      else {
        expect(text, id).toMatch(/Done between these ends, it comes to that part’s/);
        expect(view.container.querySelector('.ew-result.is-partial .ew-result-part annotation')?.textContent, id).toMatch(/\\(right|Bigr)\]_\{/);
      }
      // Only a field leans: a potential has no part across the axis.
      if (id === 'ring') expect(text).toMatch(/part across the axis no longer cancels/);
      if (id === 'v-ring' || id === 'v-arc') expect(text, id).not.toMatch(/across the axis/);
      cleanup();
    }
  });
});

describe('the answer points back at the board', () => {
  it('a second component is the surviving ΔE_y added up', () => {
    for (const id of ['endpoint', 'ramp', 'semi'] as const) {
      const view = panel(id), lead = view.container.querySelector('.ew-result-lead')!;
      // Where E_x's integral is, and that E_y is built the same way, then its integral, before the answer.
      expect(lead.textContent, id).toMatch(/^The integral for .* is the last line above\. The surviving .* adds up the same way, to .*:$/);
      expect(lead.querySelectorAll('.katex').length, id).toBeGreaterThanOrEqual(3);
      const integral = lead.nextElementSibling!;
      expect(integral.classList.contains('ew-result-integral'), id).toBe(true);
      expect(integral.querySelector('annotation')!.textContent, id).toMatch(/^E_y=.*\\int_0/);
      expect(integral.nextElementSibling!.textContent, id).toMatch(/^Doing the integrals gives this\./);
      cleanup();
    }
    expect(panel('bisector').container.querySelector('.ew-result-lead')!.textContent).not.toMatch(/surviving/);
  });
});

describe('a gloss is not quieter than the sentence under it', () => {
  it('a gloss’s math is set at least as large as a remark’s symbols', () => {
    for (const id of ['bisector', 'disk', 'ramp'] as const) {
      const view = panel(id);
      const size = (el: Element | null) => parseFloat(getComputedStyle(el!).fontSize);
      for (const key of ['one', 'add', 'limit']) {
        const card = view.container.querySelector(`.db-step[data-step="${key}"]`)!;
        const gloss = card.querySelector('.math.db-where:not(.db-cancels) .katex');
        const remark = card.querySelector('.db-say .db-sym .katex');
        expect(size(gloss), `${id} ${key}`).toBeGreaterThanOrEqual(size(remark) - .01);
        // Still under its line.
        expect(size(gloss), `${id} ${key}`).toBeLessThan(size(card.querySelector('.db-tex .katex')));
      }
      cleanup();
    }
  });
});

describe('Cut it up is one chip', () => {
  it('lit, the "=" sits inside one chip rather than pinched between two', () => {
    const view = panel('bisector', [0, 100], 'charge');
    const tex = view.container.querySelector('.db-step[data-step="pieces"] .db-tex')!;
    const chips = tex.querySelectorAll('.fx-element');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toMatch(/=/);
  });
});

describe('Unfold starts where the board ends', () => {
  it('the infinite line, in α', () => {
    const view = panel('infinite');
    fireEvent.click(view.getByRole('button', {name: 'Show every step'}));
    const first = view.container.querySelector('.ew-worked-step')!;
    expect(first.textContent).toMatch(/is the same for every piece, so it comes outside the integral/);
    expect(first.querySelector('.katex-display annotation')?.textContent).toContain('\\cos\\alpha\\,d\\alpha');
    expect(view.container.querySelector('.ew-worked-body')!.textContent).not.toMatch(/Substitute y = r tan α/);
  });
  it('the rod level with one end, in the bisector’s steps, with "step" for a step', () => {
    const view = panel('endpoint');
    fireEvent.click(view.getByRole('button', {name: 'Show every step'}));
    const body = view.container.querySelector('.ew-worked-body')!;
    expect(body.textContent).toMatch(/Turn the changing distance into an angle/);
    expect(body.textContent).toMatch(/Every step accounted for\./);
    expect(body.textContent).not.toMatch(/transformation/);
  });
});
