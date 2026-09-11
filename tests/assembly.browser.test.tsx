import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
import {requiredTerms, termsFor, type TermId} from '../src/workbench/assembly';

afterEach(cleanup);
// Real Chromium: the figure computes hotspot positions from the live projection, and
// KaTeX has to actually render for the empty slots to be countable on screen.
function figure(id: ProblemId, highlight = '') {
  const view = render(<ChargeDiagram problem={getProblem(id)} params={DEFAULT_PARAMS} setParams={vi.fn()}
    count={8} continuum={0} selected={3} onSelect={vi.fn()} progress={1} components={false} pair={false}
    mode="divide" boundRange={[0, 100]} onBoundRangeChange={vi.fn()} highlight={highlight} />);
  return {view};
}
function panel(id: ProblemId, collected: ReadonlySet<TermId>, highlight = '') {
  return render(<EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS} count={8} continuum={0}
    progress={1} mode="divide" onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} collected={collected} highlight={highlight} />);
}
// KaTeX emits both MathML and HTML, so a rendered glyph appears twice in textContent.
const holes = (el: Element | null) => (el?.textContent?.match(/□/g) ?? []).length;

describe('building the integral off the figure', () => {
  it('fills one hole in the expression per factor collected, and none are left at the end', () => {
    const need = requiredTerms(getProblem('bisector'));
    const empty = panel('bisector', new Set());
    const start = holes(empty.container.querySelector('.ew-assembled'));
    expect(start).toBeGreaterThan(0);
    // Nothing is substituted until something has actually been taken.
    expect(empty.container.querySelector('.ew-substituted')).toBeNull();
    expect(empty.container.querySelector('.ew-assembled')?.className).not.toContain('is-built');
    cleanup();
    let previous = start;
    for (let i = 1; i <= need.length; i++) {
      const view = panel('bisector', new Set(need.slice(0, i)));
      const now = holes(view.container.querySelector('.ew-assembled'));
      expect(now, `after ${i}`).toBeLessThan(previous);
      previous = now;
      expect(view.container.querySelectorAll('.ew-slot.is-filled').length, `after ${i}`).toBe(i);
      cleanup();
    }
    expect(previous).toBe(0);
    const done = panel('bisector', new Set(need));
    expect(done.container.querySelector('.ew-assembled')?.className).toContain('is-built');
    expect(holes(done.container.querySelector('.ew-substituted'))).toBe(0);
    expect(done.container.querySelector('.ew-assembly-done')).not.toBeNull();
  });
  it('never offers a collect button inside the panel', () => {
    // The whole point is that a factor comes off the drawing. A button here that
    // filled its own slot would be the old reveal panel again.
    const view = panel('bisector', new Set());
    for (const b of view.container.querySelectorAll('.ew-slots button'))
      expect(b.textContent ?? '').not.toMatch(/take|add|reveal|show/i);
    expect(view.container.querySelector('.ew-slot-empty')?.textContent).toMatch(/figure/i);
  });
});

describe('the figure and the panel answer each other', () => {
  it('lights exactly the factor the pointed-at feature supplies', () => {
    const p = getProblem('bisector'), terms = termsFor(p);
    for (const t of terms) {
      const view = panel('bisector', new Set(), t.figure);
      const lit = [...view.container.querySelectorAll('.ew-slot.is-lit')];
      expect(lit.length, t.figure).toBe(1);
      expect(lit[0].querySelector('small')?.textContent, t.figure).toBe(t.label);
      cleanup();
    }
    // A feature that supplies no factor must not light anything at all.
    const none = panel('bisector', new Set(), 'not-a-feature');
    expect(none.container.querySelectorAll('.ew-slot.is-lit').length).toBe(0);
  });
  it('carries the pointed-at feature onto the figure so its construction can answer', () => {
    const lit = figure('bisector', 'distance');
    expect(lit.view.container.querySelector('.charge-diagram')?.className).toContain('cd-focus-distance');
    cleanup();
    const rest = figure('bisector');
    expect(rest.view.container.querySelector('.charge-diagram')?.className).not.toContain('cd-focus-distance');
  });
});
