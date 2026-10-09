import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import type {BoardState} from '../src/components/DerivationBoard';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
import {buildStages} from '../src/explorer/buildRun';

afterEach(cleanup);
/* THE PANEL IS THE DERIVATION.
 *
 * It replaced a row of blanks under "Every factor is already drawn. Click it in the figure." --
 * which was not true: clicking the figure filled nothing. These pin what the panel promises now:
 * the whole derivation at rest, the lines arriving with the run while it plays, every line a way
 * to play its stage, and every factor answering for the feature of the figure it comes from.
 * Real Chromium, because KaTeX has to actually lay the lines out for any of this to be visible. */
function panel(id: ProblemId, build?: BoardState, extra: {highlight?: string; onStep?: (i: number) => void; onHighlight?: (t: string) => void} = {}) {
  return render(<EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS} continuum={0} progress={1} mode="divide"
    onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} build={build} {...extra} />);
}
const steps = (view: {container: HTMLElement}) => [...view.container.querySelectorAll<HTMLElement>('.db-step')];
const shown = (el: Element) => (el as HTMLElement).checkVisibility({opacityProperty: true}) && el.getBoundingClientRect().height > 1;

describe('at rest, the panel is the whole derivation', () => {
  it('five steps, named like the run, each one showing its line', () => {
    const view = panel('bisector');
    const names = buildStages(getProblem('bisector')).map(s => s.name);
    expect(steps(view).map(s => s.querySelector('.db-name')?.textContent)).toEqual(names);
    for (const step of steps(view)) {
      expect(step.className).toContain('is-rest');
      expect(shown(step.querySelector('.db-tex .katex')!), step.dataset.step).toBe(true);
    }
    // ...ending in the answer, not a blank where the answer will go.
    expect(view.container.querySelector('.ew-result.is-shown')).not.toBeNull();
    // And the panel never again tells a reader to click the figure to fill something in.
    expect(view.container.textContent).not.toMatch(/Click it in the figure/i);
    expect(view.container.textContent).not.toContain('□');
  });
  it('a potential lesson builds V, with no angle anywhere in it', () => {
    const view = panel('v-ring');
    expect(view.container.querySelector('.db')?.textContent).toContain('V');
    expect(view.container.querySelector('.db .fx-projection')).toBeNull();
  });
});

describe('while the run plays, the derivation arrives with it', () => {
  it('lines already shown, the line being built, and the lines still to come', () => {
    const view = panel('bisector', {open: true, index: 2, playing: true, settled: false});
    expect(steps(view).map(s => s.className.match(/is-(\w+)/)?.[1])).toEqual(['done', 'done', 'here', 'next', 'next']);
    const [, , here, next] = steps(view);
    expect(here.querySelector('.db-head')?.getAttribute('aria-current')).toBe('step');
    // A line still to come is its name only: its algebra is not visible yet, and not read out.
    expect(next.querySelector('.db-reveal')?.getAttribute('aria-hidden')).toBe('true');
    // The answer waits for the end of the argument.
    expect(view.container.querySelector('.ew-result.is-shown')).toBeNull();
  });
  it('pausing on a line opens its explanation; playing keeps it out of the way', () => {
    const playing = panel('bisector', {open: true, index: 1, playing: true, settled: false});
    expect(playing.container.querySelector('.db-note')).toBeNull();
    cleanup();
    const paused = panel('bisector', {open: true, index: 1, playing: false, settled: false});
    const note = paused.container.querySelector('.db-step.is-here .db-note');
    expect(note?.textContent).toBe(buildStages(getProblem('bisector'))[1].caption);
  });
  it('the last line finishes its algebra, and the answer appears, only once the pieces have shrunk away', () => {
    const shrinking = panel('bisector', {open: true, index: 4, playing: true, settled: false});
    expect(shrinking.container.querySelector('.db-then.is-shown')).toBeNull();
    expect(shrinking.container.querySelector('.ew-result.is-shown')).toBeNull();
    cleanup();
    const done = panel('bisector', {open: true, index: 4, playing: false, settled: true});
    expect(done.container.querySelector('.db-then.is-shown')).not.toBeNull();
    expect(done.container.querySelector('.ew-result.is-shown')).not.toBeNull();
  });
});

describe('the panel and the figure answer each other', () => {
  it('choosing a line plays that stage', () => {
    const onStep = vi.fn();
    const view = panel('bisector', undefined, {onStep});
    fireEvent.click(view.getByRole('button', {name: 'What cancels: play this step on the figure'}));
    expect(onStep).toHaveBeenCalledWith(2);
  });
  it('pointing at a factor lights the feature it is read off', () => {
    const onHighlight = vi.fn();
    const view = panel('bisector', undefined, {onHighlight});
    for (const term of ['element', 'distance', 'projection', 'bounds']) {
      const factor = view.container.querySelector(`.db .fx-${term}`)!;
      expect(factor, term).not.toBeNull();
      fireEvent.pointerOver(factor);
      expect(onHighlight).toHaveBeenLastCalledWith(term);
    }
  });
  it('pointing at the figure or a slider lights the factors it stands behind', () => {
    for (const [feature, term] of [['distance', 'distance'], ['size', 'bounds'], ['charge', 'element'], ['projection', 'projection']]) {
      const view = panel('bisector', undefined, {highlight: feature});
      expect(view.container.querySelector('.db')?.className, feature).toContain(`db-lit-${term}`);
      // Lit, not merely tagged: the factor is visibly marked.
      const lit = view.container.querySelector<HTMLElement>(`.db .fx-${term}`)!;
      expect(getComputedStyle(lit).backgroundColor, feature).not.toBe('rgba(0, 0, 0, 0)');
      cleanup();
    }
  });
  it('carries the pointed-at feature onto the figure so its construction can answer', () => {
    const at = (highlight: string) => render(<ChargeDiagram problem={getProblem('bisector')} params={DEFAULT_PARAMS} setParams={vi.fn()}
      count={8} continuum={0} selected={3} onSelect={vi.fn()} progress={1} components={false} pair={false}
      mode="divide" boundRange={[0, 100]} onBoundRangeChange={vi.fn()} highlight={highlight} />);
    const lit = at('distance');
    expect(lit.container.querySelector('.charge-diagram')?.className).toContain('cd-focus-distance');
    // The distance is drawn so it can be lit: pointing at it puts the line from the piece to P on.
    expect(lit.container.querySelector('.cd-construction')).not.toBeNull();
    cleanup();
    // Pointing at a piece's charge names the piece and lights it, and does not draw the arrow.
    const charge = at('element');
    expect(charge.container.querySelector('.cd-source-tag')).not.toBeNull();
    expect(charge.container.querySelector('.cd-construction')).toBeNull();
  });
});
