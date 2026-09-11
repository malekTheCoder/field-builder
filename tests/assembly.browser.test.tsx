import {cleanup, render} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem, PROBLEMS} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
import {requiredTerms, termsFor, type TermId} from '../src/workbench/assembly';

afterEach(cleanup);
// Real Chromium: the figure computes hotspot positions from the live projection, and
// KaTeX has to actually render for the empty slots to be countable on screen.
const collectableFor = (id: ProblemId) => termsFor(getProblem(id)).map(t => ({figure: t.figure, label: t.label}));
function figure(id: ProblemId, collected: ReadonlySet<string>, onCollectFigure = vi.fn()) {
  const view = render(<ChargeDiagram problem={getProblem(id)} params={DEFAULT_PARAMS} setParams={vi.fn()}
    count={8} continuum={0} selected={3} onSelect={vi.fn()} progress={1} components={false} pair={false}
    mode="divide" boundRange={[0, 100]} onBoundRangeChange={vi.fn()}
    collectable={collectableFor(id)} collected={collected} onCollectFigure={onCollectFigure} />);
  return {view, onCollectFigure};
}
function panel(id: ProblemId, collected: ReadonlySet<TermId>) {
  return render(<EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS} count={8} continuum={0}
    progress={1} mode="divide" onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} collected={collected} />);
}
// KaTeX emits both MathML and HTML, so a rendered glyph appears twice in textContent.
const holes = (el: Element | null) => (el?.textContent?.match(/□/g) ?? []).length;

describe('building the integral off the figure', () => {
  it('puts one target on the figure for every factor, and none for a potential it does not have', () => {
    for (const p of PROBLEMS) {
      const {view} = figure(p.id, new Set());
      expect(view.container.querySelectorAll('.cd-hotspot').length, p.id).toBe(requiredTerms(p).length);
      cleanup();
    }
  });
  it('reports which feature was taken, and marks only that one', async () => {
    const {view, onCollectFigure} = figure('bisector', new Set());
    const spots = view.container.querySelectorAll<SVGGElement>('.cd-hotspot');
    await userEvent.click(spots[1]);
    expect(onCollectFigure).toHaveBeenCalledWith(termsFor(getProblem('bisector'))[1].figure);
    expect(view.container.querySelectorAll('.cd-hotspot.is-taken').length).toBe(0); // caller owns the state
    cleanup();
    const held = figure('bisector', new Set(['distance']));
    expect(held.view.container.querySelectorAll('.cd-hotspot.is-taken').length).toBe(1);
  });
  it('is reachable by keyboard, since the figure is the only way to take a factor', async () => {
    const {view, onCollectFigure} = figure('ring', new Set());
    const spot = view.container.querySelector<SVGGElement>('.cd-hotspot')!;
    expect(spot.getAttribute('tabindex')).toBe('0');
    spot.focus();
    await userEvent.keyboard('{Enter}');
    expect(onCollectFigure).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(' ');
    expect(onCollectFigure).toHaveBeenCalledTimes(2);
  });
  it('names the target by what it measures, and says when it is already in', () => {
    const {view} = figure('bisector', new Set(['element']));
    const labels = [...view.container.querySelectorAll('.cd-hotspot')].map(s => s.getAttribute('aria-label') ?? '');
    expect(labels[0]).toMatch(/already in the integral/);
    expect(labels[1]).toMatch(/^Take .+ into the integral$/);
    expect(view.container.querySelector('.cd-hotspot')?.getAttribute('aria-pressed')).toBe('true');
  });
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
