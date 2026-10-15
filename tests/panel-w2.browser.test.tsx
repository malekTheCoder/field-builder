import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
// The page's own styles: line counts, faces and displays are what these measure.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
import type {BoardState} from '../src/components/DerivationBoard';
/* THE PANEL, WAVE TWO, ON THE PAGE.
 *
 * The longest remarks were one block of sixteen lines under a lede that promises "each adding one
 * idea"; an exact sum's conclusion waited for a stage that never settles; the bound fields were set in a
 * mono face whose zero reads as ∅; a wrapped reference left its ↗ on the title's first line. */
afterEach(cleanup);
beforeAll(async () => {
  const still = document.createElement('style');
  still.textContent = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
  document.head.appendChild(still);
  await document.fonts.ready;
});
const panel = (id: ProblemId, build?: BoardState) => render(<div style={{width: 340}}><EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS}
  onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} build={build} /></div>);
const lines = (el: HTMLElement) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));

describe('a remark is set in paragraphs, one idea each', () => {
  it('the equal-angle Cut it up is three paragraphs, a little apart, none of them a wall', async () => {
    for (const id of ['sheet', 'infinite', 'semi', 'ring'] as const) {
      const view = panel(id);
      await document.fonts.ready;
      const says = [...view.container.querySelectorAll<HTMLElement>('.db-say:not(.db-pair):not(.db-nothing):not(.db-also)')];
      for (const say of says) expect(lines(say), `${id}: ${say.textContent!.slice(0, 50)}`).toBeLessThanOrEqual(9);
      if (id !== 'ring') {
        const cut = [...view.container.querySelectorAll<HTMLElement>('.db-step[data-step="pieces"] .db-say')];
        expect(cut, id).toHaveLength(3);
        expect(parseFloat(getComputedStyle(cut[1]).marginTop), id).toBeGreaterThan(4);
        expect(parseFloat(getComputedStyle(cut[0]).marginTop), id).toBe(0);
      }
      cleanup();
    }
  });
});

describe('an exact sum arrives with its conclusion', () => {
  it('the ring’s Add shows its shared factor coming out while the run is on that step', () => {
    const view = panel('ring', {open: true, index: 3, playing: false, settled: false});
    const then = view.container.querySelector('.db-step[data-step="add"] .db-then')!;
    expect(then.classList.contains('is-shown')).toBe(true);
    expect(then.querySelector('annotation')!.textContent).toMatch(/\\sum_i.*=\\frac\{kQ/);
    // The last step's second half still waits for the run to settle on it.
    const later = panel('ring', {open: true, index: 4, playing: true, settled: false});
    expect(later.container.querySelector('.db-step[data-step="limit"] .db-then')!.classList.contains('is-shown')).toBe(false);
  });
});

describe('the shelf’s small type', () => {
  it('the bound fields are set in the page’s sans, not a mono face whose zero reads as ∅', () => {
    const view = panel('sheet');
    fireEvent.click(view.getByRole('button', {name: /Integration interval/}));
    const input = view.getByLabelText('Lower bound');
    expect(getComputedStyle(input).fontFamily.toLowerCase()).not.toMatch(/mono/);
    expect(getComputedStyle(input).fontVariantNumeric).toMatch(/tabular-nums/);
  });
  it('a reference’s ↗ follows its last word, and a model note’s last line is balanced', () => {
    const view = panel('sheet');
    fireEvent.click(view.getByText(/model assumptions/i));
    const link = view.container.querySelector<HTMLElement>('.ew-references a')!;
    expect(getComputedStyle(link).display).toBe('block');
    expect(getComputedStyle(link.querySelector('svg')!).display).toBe('inline');
    const note = view.container.querySelector<HTMLElement>('.ew-references-body p')!;
    const style = getComputedStyle(note) as CSSStyleDeclaration & {textWrapStyle?: string; textWrap?: string};
    expect(style.textWrapStyle ?? style.textWrap).toMatch(/pretty/);
  });
  // The problem is no longer in it: it opens the panel, where a student reads it (panel-w4-problem).
  it('the shelf’s last disclosure names what it holds', () => {
    const view = panel('sheet');
    expect(view.container.querySelector('.ew-references summary')!.textContent).toBe('Model assumptions & references');
  });
});

describe('Unfold, wave three', () => {
  it('jumps rather than glides for a reader who asked for less motion, and says why a potential is differentiated first', async () => {
    // An explicit 'smooth' overrides the page's own reduced-motion scroll-behavior, so the panel chooses.
    const scrolled: unknown[] = [];
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(o => { scrolled.push(o); });
    const media = vi.spyOn(window, 'matchMedia').mockImplementation(q => ({matches: /reduce/.test(q), media: q, onchange: null,
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false}) as unknown as MediaQueryList);
    try {
      const view = panel('v-ring');
      fireEvent.click(view.getByRole('button', {name: 'Show every step'}));
      await new Promise(r => requestAnimationFrame(r));
      expect(scrolled.at(-1)).toEqual({block: 'nearest', behavior: 'auto'});
      // Under "Differentiate back", the reason comes before the first derivative: E_z = −dV/dz.
      const sub = view.container.querySelector('.ew-worked-sub')!;
      expect(sub.nextElementSibling!.classList.contains('ew-worked-why')).toBe(true);
      expect(sub.nextElementSibling!.textContent).toMatch(/^The field along the axis is minus the rate .* so differentiating .* gives the field back\.$/);
    } finally { scroll.mockRestore(); media.mockRestore(); }
  });
});
