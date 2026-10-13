import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
// The page's own styles: a chip, a colour and a face are what these measure.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
/* THE PANEL, MEASURED WHERE THE CRITICS SAW IT GO WRONG.
 *
 * A lit chip at the start of a gloss was cut flat by the box that clips it, and a chip holding a
 * fraction was shorter than the fraction; the cancellation What cancels is named for was the quietest
 * math on its card; Shrink them's glosses came in the reverse order of their lines; Apply rewrote the
 * reader's "r" as "r tan(π/4)"; the finite-line route showed the angular route's setup; the steps
 * still to come were under 4.5:1. Note: continuum, progress and mode are left out on purpose -- the
 * panel reads none of them, and they are optional now. */
afterEach(cleanup);
beforeAll(async () => {
  const still = document.createElement('style');
  still.textContent = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
  document.head.appendChild(still);
  await document.fonts.ready;
});
type Extra = {highlight?: string; boundRange?: [number, number]; onBoundRangeChange?: (r: [number, number]) => void; path?: string};
const ui = (id: ProblemId, extra: Extra = {}) => <EquationWorkbench problem={getProblem(id)} derivationProblem={extra.path ? getProblem(id, extra.path) : undefined}
  params={DEFAULT_PARAMS} onModeChange={vi.fn()} boundRange={extra.boundRange ?? [0, 100]} onBoundRangeChange={extra.onBoundRangeChange ?? vi.fn()} highlight={extra.highlight} />;
const panel = (id: ProblemId, extra: Extra = {}) => render(ui(id, extra));
const LIT: Record<string, string> = {projection: 'projection', distance: 'distance', bounds: 'bounds', element: 'element'};

describe('a lit chip is drawn whole', () => {
  // The lessons whose glosses open on a coloured factor: rᵢ = …, cos α = …, y: 0 → L, ΔQ = ….
  for (const id of ['bisector', 'infinite', 'ramp', 'semi', 'sheet', 'arc'] as const) {
    it(id, () => {
      for (const term of Object.keys(LIT)) {
        const view = panel(id, {highlight: term});
        for (const chip of view.container.querySelectorAll<HTMLElement>(`.db-where .fx-${term}, .db-tex .fx-${term}`)) {
          // A limit in the ∫'s hooks says it is lit by colour alone.
          if (chip.closest('.msupsub')) continue;
          // Only a box that clips: math set inline in a sentence ("ΔE_y = … survives too") is an
          // inline span, which overflow does not apply to.
          const math = chip.closest<HTMLElement>('.math')!;
          if (getComputedStyle(math).display === 'inline') continue;
          const box = math.getBoundingClientRect(), r = chip.getBoundingClientRect();
          // The ring is 2px round the chip: all of it inside the box that clips.
          expect(r.left - 2, `${id} ${term} left`).toBeGreaterThanOrEqual(box.left - .5);
          expect(r.top - 2, `${id} ${term} top`).toBeGreaterThanOrEqual(box.top - .5);
          expect(r.bottom + 2, `${id} ${term} bottom`).toBeLessThanOrEqual(box.bottom + .5);
          // A chip holding a fraction covers it: KaTeX sizes a fraction's table to its glyphs' heights
          // and depths, and the numerator's top is inside the chip's.
          const frac = chip.querySelector('.mfrac .vlist-t');
          if (frac) expect(frac.getBoundingClientRect().top, `${id} ${term} fraction top`).toBeGreaterThanOrEqual(r.top - .5);
        }
        cleanup();
      }
    });
  }
});

describe('the cards read in order, and their headline is in ink', () => {
  it('What cancels: the cancellation in the line’s ink, a size up from a gloss; "nothing cancels" stays a remark', () => {
    const view = panel('bisector');
    const body = view.container.querySelector('.db-step[data-step="cancel"] .db-body')!;
    const cancels = body.querySelector<HTMLElement>('.db-cancels')!, line = body.querySelector<HTMLElement>('.db-tex')!, gloss = body.querySelector<HTMLElement>('.db-where:not(.db-cancels):not(.db-say)')!;
    expect(getComputedStyle(cancels).color).toBe(getComputedStyle(line).color);
    expect(getComputedStyle(cancels).color).not.toBe(getComputedStyle(gloss).color);
    const size = (el: Element) => parseFloat(getComputedStyle(el.querySelector('.katex')!).fontSize);
    expect(size(cancels)).toBeGreaterThan(size(gloss) + 1);
    cleanup();
    const end = panel('endpoint');
    const nothing = end.container.querySelector<HTMLElement>('.db-nothing')!;
    expect(getComputedStyle(nothing).color).toBe(getComputedStyle(end.container.querySelector('.db-step[data-step="cancel"] .db-say:not(.db-nothing)')!).color);
  });
  it('Shrink them: the chain, then each gloss in the order of the line it explains, then the rule', () => {
    const body = panel('bisector').container.querySelector('.db-step[data-step="limit"] .db-body')!;
    const order = [...body.querySelectorAll('.db-tex, .db-then-tex, .db-where')].map(el =>
      el.classList.contains('db-tex') ? 'line' : el.classList.contains('db-then-tex') ? 'finish' : el.classList.contains('db-merged') ? 'merged' : el.classList.contains('db-say') ? 'rule' : el.classList.contains('db-swaps') ? 'swaps' : 'where');
    // The rule is two paragraphs: what shrinking does, then why the ≈ is now an =.
    // The swaps -- Δy → dy, r_i² → y² + r², cos α_i → r/√(y² + r²) -- under Σ → ∫ and ΔQ → dQ, before the merged power.
    expect(order).toEqual(['line', 'finish', 'where', 'swaps', 'merged', 'rule', 'rule']);
  });
  it('the answer’s k is the one One piece defines, set the same way', () => {
    const view = panel('bisector');
    expect(view.container.querySelector('.ew-result-k annotation')?.textContent).toBe(String.raw`k=1/(4\pi\varepsilon_0)`);
    // And the bisector's answer says λL before it says Q.
    const answer = [...view.container.querySelectorAll('.ew-result > .math annotation')].map(a => a.textContent).join(' ');
    expect(answer.indexOf('k\\lambda L')).toBeGreaterThan(-1);
    expect(answer.indexOf('k\\lambda L')).toBeLessThan(answer.indexOf('kQ'));
  });
});

describe('the shelf answers for the route and the reader', () => {
  it('Apply leaves the reader’s limit as written; a drag to half way names it as the board does', () => {
    const changed = vi.fn();
    const view = panel('semi', {onBoundRangeChange: changed});
    fireEvent.click(view.getByRole('button', {name: /Integration interval/}));
    const [lo, hi] = [...view.container.querySelectorAll<HTMLInputElement>('.ew-bound-fields input')];
    fireEvent.change(lo, {target: {value: '0'}});
    fireEvent.change(hi, {target: {value: 'r'}});
    fireEvent.click(view.getByRole('button', {name: 'Apply interval'}));
    expect(changed).toHaveBeenLastCalledWith([0, 50]);
    view.rerender(ui('semi', {boundRange: [0, 50], onBoundRangeChange: changed}));
    const upper = () => view.container.querySelectorAll<HTMLInputElement>('.ew-bound-fields input')[1].value;
    expect(upper()).toBe('r');
    // From outside, half way out in angle is r too, not r tan(π/4).
    view.rerender(ui('semi', {boundRange: [0, 60], onBoundRangeChange: changed}));
    view.rerender(ui('semi', {boundRange: [0, 50], onBoundRangeChange: changed}));
    expect(upper()).toBe('r');
  });
  it('the finite-line route’s problem is its own, not the angular route’s', () => {
    const view = panel('infinite', {path: 'limit'});
    // The problem now opens the panel, out of the closed disclosure it used to hide in.
    const note = view.container.querySelector('.ew-problem-text')!.textContent!;
    expect(note).toMatch(/Start with a rod of length L/);
    expect(note).not.toMatch(/r tan θ/);
  });
  it('the summary takes the page’s focus ring, not the browser’s', () => {
    const summary = panel('bisector').container.querySelector<HTMLElement>('.ew-references > summary')!;
    summary.focus({focusVisible: true} as FocusOptions);
    expect(getComputedStyle(summary).outlineWidth).toBe('3px');
  });
});

describe('a step still to come is readable', () => {
  /** A colour as the canvas paints it, so oklab and color-mix come back as sRGB. */
  const rgb = (css: string) => {
    const c = document.createElement('canvas').getContext('2d')!;
    c.fillStyle = css; c.fillRect(0, 0, 1, 1);
    return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };
  const lum = (c: number[]) => {
    const [r, g, b] = c.map(v => { const s = v / 255; return s <= .03928 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  for (const dark of [false, true]) {
    it(dark ? 'dark' : 'light', () => {
      document.documentElement.classList.toggle('dark', dark);
      try {
        const view = render(<EquationWorkbench problem={getProblem('bisector')} params={DEFAULT_PARAMS} onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()}
          build={{open: true, index: 1, playing: true, settled: false}} />);
        const name = view.container.querySelector<HTMLElement>('.db-step.is-next .db-title')!;
        const card = getComputedStyle(view.container.querySelector('.ew-panel')!).backgroundColor;
        const [a, b] = [lum(rgb(getComputedStyle(name).color)), lum(rgb(card))];
        const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      } finally {
        document.documentElement.classList.remove('dark');
      }
    });
  }
});
