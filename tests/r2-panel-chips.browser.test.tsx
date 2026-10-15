import {cleanup, render} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
// The page's own styles, imported the way src/main.tsx imports them: a chip is a box KaTeX's own
// stylesheet and the page's type scale lay out, and without them there is nothing true to measure.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
/* THE CHIPS CLEAR WHAT THEY SIT BESIDE, AND THE CARD SPEAKS IN ONE FACE.
 *
 * Pointing at a factor -- or a stage of the run arriving at it -- puts a tinted chip behind it. The
 * chip was an inline span, a line of text tall: lit, its edge ran through cos α = r/√(y²+r²), across
 * the fraction bar and the radical; the limits' chips sat on the hooks of the ∫ and touched the
 * integrand; and a ΔQ over a bar or an rᵢ under one ran its chip across the bar. And the card's
 * remarks were set in KaTeX's serif, right on top of the stage's note in the page's sans. */
afterEach(cleanup);
beforeAll(async () => {
  const still = document.createElement('style');
  still.textContent = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
  document.head.appendChild(still);
  await document.fonts.ready;
});
function panel(id: ProblemId, highlight = '') {
  return render(<EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS} continuum={0} progress={1} mode="divide"
    onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} highlight={highlight} />);
}
/** Whether a factor's chip is drawn, and how far its paint reaches past its box, up and down. */
function paint(el: Element) {
  const style = getComputedStyle(el);
  const tinted = style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
  const ring = style.boxShadow === 'none' ? 0 : Math.max(0, ...[...style.boxShadow.matchAll(/(-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px/g)]
    .map(m => Math.abs(+m[2]) + +m[4]));
  return {drawn: tinted || style.boxShadow !== 'none', ring};
}
const contains = (outer: DOMRect, inner: DOMRect) =>
  inner.left >= outer.left - .5 && inner.right <= outer.right + .5 && inner.top >= outer.top - .5 && inner.bottom <= outer.bottom + .5;

describe('a lit chip wraps the whole factor', () => {
  it('cos α = r/√(y²+r²), lit, holds its fraction bar and its radical inside the chip', () => {
    const view = panel('bisector', 'projection');
    const chip = view.container.querySelector<HTMLElement>('.db-step[data-step="cancel"] .db-where:not(.db-say) .fx-projection')!;
    expect(paint(chip).drawn).toBe(true);
    const box = chip.getBoundingClientRect();
    const bar = chip.querySelector('.frac-line')!.getBoundingClientRect(), root = chip.querySelector('.sqrt')!.getBoundingClientRect();
    expect(contains(box, bar), `bar ${bar.top}-${bar.bottom} in chip ${box.top}-${box.bottom}`).toBe(true);
    expect(contains(box, root), `radical ${root.top}-${root.bottom} in chip ${box.top}-${box.bottom}`).toBe(true);
  });
});

describe('a lit limit of integration is coloured, never chipped over the ∫', () => {
  it('in Shrink them no chip touches the integral sign, and the limits still answer in the line above', () => {
    const view = panel('bisector', 'bounds');
    const limit = view.container.querySelector('.db-step[data-step="limit"] .db-tex')!;
    const sign = limit.querySelector('.mop')!.getBoundingClientRect();
    const limits = limit.querySelectorAll('.msupsub .fx-bounds');
    expect(limits.length).toBe(2);
    for (const fx of limit.querySelectorAll('.fx')) {
      const {drawn, ring} = paint(fx);
      if (!drawn) continue;
      const r = fx.getBoundingClientRect();
      const clear = r.right + ring <= sign.left || r.left - ring >= sign.right || r.bottom + ring <= sign.top || r.top - ring >= sign.bottom;
      expect(clear, `${fx.className} "${fx.textContent}" is drawn over the ∫`).toBe(true);
    }
    // Lit, the limits are still in the limits' colour; and the range above them is chipped, so the
    // lit state is there to see.
    const range = view.container.querySelector('.db-step[data-step="add"] .db-where .fx-bounds')!;
    expect(paint(range).drawn).toBe(true);
    for (const fx of limits) expect(getComputedStyle(fx).color).toBe(getComputedStyle(range).color);
  });
});

describe('a chip over or under a fraction’s bar stays clear of the bar', () => {
  // Every factor of every lesson lit at once: the most chips the board ever draws.
  for (const p of PROBLEMS) {
    it(p.id, () => {
      const view = panel(p.id);
      view.container.querySelector('.db')!.classList.add('db-lit-element', 'db-lit-distance', 'db-lit-projection', 'db-lit-bounds');
      let checked = 0;
      for (const fx of view.container.querySelectorAll('.db .fx')) {
        const frac = fx.closest('.mfrac');
        if (!frac || fx.querySelector('.frac-line')) continue;
        const bar = [...frac.querySelectorAll('.frac-line')].find(b => b.closest('.mfrac') === frac)!.getBoundingClientRect();
        const r = fx.getBoundingClientRect(), {drawn, ring} = paint(fx);
        expect(drawn, `${p.id}: ${fx.className} is not lit`).toBe(true);
        const gap = r.top < bar.top ? bar.top - (r.bottom + ring) : (r.top - ring) - bar.bottom;
        expect(gap, `${p.id}: ${fx.className} "${fx.textContent}" reaches ${(-gap).toFixed(1)}px into its fraction’s bar`).toBeGreaterThanOrEqual(1);
        checked++;
      }
      expect(checked, p.id).toBeGreaterThan(0);
    });
  }
});

describe('the card speaks in one face', () => {
  it('a remark is set in the page’s sans, its symbols in KaTeX, each held whole', () => {
    const view = panel('v-ring');
    const say = view.container.querySelector<HTMLElement>('.db-step[data-step="cancel"] .db-say')!;
    // With its reason: the field's twin cancelled the same partner one lesson earlier.
    expect(say.textContent).toMatch(/^The same length of ring straight across is just as far away and its charge has the same sign, so it adds the same .*nothing cancels, since a number has no sideways part, and .* is unchanged from the step before\.$/);
    expect(getComputedStyle(say).fontFamily).toMatch(/Hanken Grotesk/);
    expect(getComputedStyle(say).fontFamily).not.toMatch(/KaTeX/);
    // As the note under it is, and the stage's caption.
    expect(getComputedStyle(say).fontFamily).toBe(getComputedStyle(view.container.querySelector('.ew-lede')!).fontFamily);
    cleanup();
    // A symbol in a remark is still KaTeX's, and never broken across a line: "y =" ended one line
    // and "L/2" began the next.
    const bisector = panel('bisector');
    const add = bisector.container.querySelector('.db-step[data-step="add"] .db-say')!;
    const syms = add.querySelectorAll('.db-sym');
    expect(syms.length).toBeGreaterThan(2);
    for (const sym of syms) {
      expect(sym.querySelector('.katex'), sym.textContent ?? '').not.toBeNull();
      expect(getComputedStyle(sym).whiteSpace).toBe('nowrap');
    }
  });
});
