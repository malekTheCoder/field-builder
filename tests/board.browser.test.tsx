import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import type {BoardState} from '../src/components/DerivationBoard';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
import {buildStages} from '../src/explorer/buildRun';

afterEach(cleanup);
// Counted, not changed: each time the board renders one of its lines, and each time the panel works
// its lines out. Both pass straight through to the real thing.
const counts = vi.hoisted(() => ({tex: 0, lines: 0}));
vi.mock('../src/components/Math', async importOriginal => {
  const real = await importOriginal<typeof import('../src/components/Math')>();
  return {...real, MathText: (props: Parameters<typeof real.MathText>[0]) => {
    if (props.className?.includes('db-tex')) counts.tex++;
    return real.MathText(props);
  }};
});
vi.mock('../src/workbench/derivation', async importOriginal => {
  const real = await importOriginal<typeof import('../src/workbench/derivation')>();
  return {...real, boardLines: (...args: Parameters<typeof real.boardLines>) => { counts.lines++; return real.boardLines(...args); }};
});
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
  it('pausing on a line adds nothing under it: its own remark is the explanation, and the run’s caption is not said twice', () => {
    // The caption used to open under a paused step. Once every remark was complete it restated it --
    // paused on What cancels at the rod's end, "nothing cancels" stood on the screen four times.
    for (const playing of [true, false]) {
      const view = panel('endpoint', {open: true, index: 2, playing, settled: true});
      expect(view.container.querySelector('.db-note')).toBeNull();
      const caption = buildStages(getProblem('endpoint'))[2].caption;
      expect(view.container.querySelector('.db')!.textContent).not.toContain(caption.slice(0, 40));
      // What the caption added that the step did not, the step now says itself.
      expect(view.container.querySelector('.db-step.is-here .db-nothing')?.textContent).toMatch(/Cancellation needs a symmetry this geometry lacks\.$/);
      cleanup();
    }
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

/** What a remark reads as on the page: its words and its symbols as drawn -- without the MathML copy
 * KaTeX keeps for screen readers, the zero-width spaces inside its subscripts, or the no-break
 * spaces that hold a word to its symbol. */
const read = (el: Element) => {
  const copy = el.cloneNode(true) as Element;
  for (const m of copy.querySelectorAll('.katex-mathml')) m.remove();
  return (copy.textContent ?? '').replace(/\u200b/g, '').replace(/\u00a0/g, ' ');
};
describe('every new symbol is said in words beside the line that brings it in', () => {
  it('the angle and the side of the triangle are said right under the ratio that uses them', () => {
    // α arrived in What cancels as cos α = r/√(y²+r²) with no word for it. The sentence now follows
    // that ratio directly, so the two are read together. (The semi-infinite line and the sheet say
    // what their angle is where it first appears, in Cut it up; here they say the triangle's side.)
    for (const id of ['bisector', 'ring', 'semi', 'sheet'] as const) {
      const view = panel(id);
      const body = view.container.querySelector('.db-step[data-step="cancel"] .db-body')!;
      const where = [...body.children].find(c => c.classList.contains('db-where') && !c.classList.contains('db-say') && !c.classList.contains('db-cancels'))!;
      const say = where.nextElementSibling as HTMLElement;
      expect(say.classList.contains('db-say'), id).toBe(true);
      // The line to the piece, of length r_i: r_i is a distance on this board, never a line.
      if (id === 'bisector' || id === 'ring') expect(read(say), id).toMatch(/^α is the angle at P between the line to the piece \(length ri\) and the/);
      expect(read(say), id).toMatch(/lies along/);
      cleanup();
    }
  });
  it('the last line says what shrinking is, then the rule: what changes from piece to piece, in terms of the variable', () => {
    const view = panel('bisector');
    const says = [...view.container.querySelectorAll<HTMLElement>('.db-step[data-step="limit"] .db-say')];
    // The limit first -- N → ∞, Δy → dy -- then written, not only named: what r_i² and cos α_i become in y.
    // And last, in a paragraph of its own, why the sum's ≈ is now an =: the approximation Add named is
    // the one shrinking removes.
    expect(says.map(read)).toEqual(['Make the pieces thinner without end, N→∞: each Δy becomes dy, and the sum over pieces becomes an integral over y. For that, what changes from piece to piece is written in terms of y: ri2=y2+r2 and cosαi=r/y2+r2.', 'The ≈ becomes = here: the thinner a piece, the more nearly it is a point charge, and in the limit it is one.']);
    // Its symbols are the board's, set as math.
    expect(says.reduce((n, s) => n + s.querySelectorAll('.katex').length, 0)).toBe(9);
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

describe('the run plays at the frame rate, and the panel does not', () => {
  /* The run re-renders the page every frame it plays, because the figure has to move: the partition,
   * the sum's progress, the parameters. The panel is handed all of it, and a new `build` object and
   * new callbacks with every frame -- but what is ON the panel changes only when the run enters a
   * stage, pauses or settles. So a frame that changes none of that must not work the derivation
   * out again, or render a single line of it. The infinite line is the lesson to check: the page
   * builds a new object for it on every render, so a memo keyed on the object would miss each time. */
  const at = (frame: number, extra: {index?: number; onStep?: (i: number) => void} = {}) =>
    <EquationWorkbench problem={getProblem('infinite')} params={{...DEFAULT_PARAMS, continuum: frame / 100}} continuum={frame / 100} progress={frame / 60}
      mode="sum" onModeChange={() => {}} onHighlight={() => {}} boundRange={[0, 100]} onBoundRangeChange={() => {}}
      build={{open: true, index: extra.index ?? 3, playing: true, settled: false}} onStep={extra.onStep ?? (() => {})} />;
  it('sixty frames inside one stage rebuild nothing on it', () => {
    const view = render(at(0));
    const tex = counts.tex, lines = counts.lines;
    expect(tex, 'the board rendered no lines on its first render').toBeGreaterThan(0);
    for (let frame = 1; frame <= 60; frame++) view.rerender(at(frame));
    expect(counts.lines - lines, 'derivations worked out again').toBe(0);
    expect(counts.tex - tex, 'lines of the board rendered again').toBe(0);
    // A frame that does move the run on still moves the board on...
    view.rerender(at(61, {index: 4}));
    expect(steps(view).find(s => s.className.includes('is-here'))?.dataset.step).toBe('limit');
    // ...and a line chosen after the page has handed down new callbacks plays through the newest.
    const onStep = vi.fn();
    view.rerender(at(62, {index: 4, onStep}));
    fireEvent.click(view.getByRole('button', {name: 'Cut it up: play this step on the figure'}));
    expect(onStep).toHaveBeenCalledWith(0);
  });
});
