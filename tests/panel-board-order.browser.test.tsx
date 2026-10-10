import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
// The page's own styles: a face, a chip and a padding are what these measure.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import type {BoardState} from '../src/components/DerivationBoard';
import {buildStages} from '../src/explorer/buildRun';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
/* THE PANEL READS IN THE ORDER IT IS NAMED, AND SAYS ONLY WHAT IS TRUE OF THE BRACKET.
 *
 * Each of these was a critic's finding on the real page: What cancels opened on the part that
 * survives; the run's lit chip sat in a finished step; a drag on the figure left "Whole distribution
 * selected" under "Part of the distribution"; an off-centre bracket still wrote E_y = 0; the note set
 * P in a second face; and the shelf's sentences set their symbols as plain sans. */
afterEach(cleanup);
beforeAll(async () => {
  const still = document.createElement('style');
  still.textContent = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
  document.head.appendChild(still);
  await document.fonts.ready;
});
type Extra = {build?: BoardState; highlight?: string; boundRange?: [number, number]; onBoundRangeChange?: (r: [number, number]) => void};
const ui = (id: ProblemId, extra: Extra = {}) => <EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS} continuum={0} progress={1} mode="divide"
  onModeChange={vi.fn()} boundRange={extra.boundRange ?? [0, 100]} onBoundRangeChange={extra.onBoundRangeChange ?? vi.fn()} build={extra.build} highlight={extra.highlight} />;
const panel = (id: ProblemId, extra: Extra = {}) => render(ui(id, extra));
const cancelBody = (view: {container: HTMLElement}) => view.container.querySelector('.db-step[data-step="cancel"] .db-body')!;

describe('What cancels opens on the cancellation, or on why nothing cancels', () => {
  for (const id of ['bisector', 'ring', 'disk', 'endpoint', 'semi', 'axial', 'v-ring', 'v-rod-axial'] as const) {
    it(id, () => {
      const body = cancelBody(panel(id));
      const order = [...body.children].map(c => c.classList.contains('db-cancels') ? 'cancels' : c.classList.contains('db-tex') ? 'tex' : '');
      expect(order.indexOf('cancels'), id).toBe(0);
      expect(order.indexOf('tex'), id).toBe(1);
    });
  }
  it('where nothing cancels, it says so in words, at rest', () => {
    const view = panel('endpoint');
    expect(cancelBody(view).querySelector('.db-nothing')?.textContent).toMatch(/^Nothing cancels: every piece lies above the/);
  });
});

describe('while the run plays, the lit chip is in the step being played', () => {
  it('at Shrink them, the finished Add them up step is not chipped', () => {
    const view = panel('bisector', {build: {open: true, index: 4, playing: false, settled: true}, highlight: 'bounds'});
    expect(view.container.querySelector('.db')!.className).not.toMatch(/db-lit-/);
    expect(view.container.querySelector('.db-step.is-here')!.className).toContain('db-lit-bounds');
    const range = view.container.querySelector<HTMLElement>('.db-step[data-step="add"] .db-where .fx-bounds')!;
    expect(getComputedStyle(range).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
  it('at What cancels, the current cos α lights and the finished One piece r̂ does not', () => {
    const view = panel('bisector', {build: {open: true, index: 2, playing: false, settled: true}, highlight: 'projection'});
    const here = view.container.querySelector<HTMLElement>('.db-step.is-here .db-tex .fx-projection')!;
    const done = view.container.querySelector<HTMLElement>('.db-step[data-step="one"] .fx-projection')!;
    expect(getComputedStyle(here).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(done).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
  it('the lede is the same sentence open and at rest, so the board does not jump when the run opens', () => {
    const rest = panel('bisector').container.querySelector('.ew-lede')!.textContent;
    cleanup();
    const open = panel('bisector', {build: {open: true, index: 0, playing: true, settled: false}}).container.querySelector('.ew-lede')!.textContent;
    expect(open).toBe(rest);
  });
});

describe('the note under a paused stage sets P in the remark’s face, and reads as the caption does', () => {
  it('bisector, One piece', () => {
    const view = panel('bisector', {build: {open: true, index: 1, playing: false, settled: true}});
    const note = view.container.querySelector<HTMLElement>('.db-step.is-here .db-note')!;
    expect(note.textContent).toBe(buildStages(getProblem('bisector'))[1].caption);
    const p = note.querySelector<HTMLElement>('var.db-var')!;
    expect(p.textContent).toBe('P');
    expect(getComputedStyle(p).fontFamily).toMatch(/KaTeX_Math/);
    // Its italic correction: "from P on" never reads "from Pon".
    expect(parseFloat(getComputedStyle(p).paddingRight)).toBeGreaterThan(0);
  });
});

describe('the bracket', () => {
  const open = (view: {getByRole: (r: string, o: {name: RegExp}) => HTMLElement}) => fireEvent.click(view.getByRole('button', {name: /Integration interval/}));
  const inputs = (view: {container: HTMLElement}) => [...view.container.querySelectorAll<HTMLInputElement>('.ew-bound-fields input')];
  it('a drag from outside clears the form’s last answer; the form’s own range keeps it', () => {
    const changed = vi.fn();
    const view = panel('bisector', {onBoundRangeChange: changed});
    open(view);
    fireEvent.click(view.getByRole('button', {name: 'Apply interval'}));
    expect(view.container.querySelector('.ew-bound-feedback')?.textContent).toMatch(/Whole distribution selected/);
    // The handles move on the figure: the form's answer to a question nobody asked any more goes.
    view.rerender(ui('bisector', {boundRange: [37, 81], onBoundRangeChange: changed}));
    expect(view.container.querySelector('.ew-bound-feedback')).toBeNull();
    expect(view.container.querySelector('.ew-result-label')?.textContent).toBe('Part of the distribution');
    // The form asks for a range itself, and the range comes back: its answer stays.
    const [lo, hi] = inputs(view);
    fireEvent.change(lo, {target: {value: '0'}});
    fireEvent.change(hi, {target: {value: 'L/2'}});
    fireEvent.click(view.getByRole('button', {name: 'Apply interval'}));
    expect(changed).toHaveBeenLastCalledWith([50, 100]);
    view.rerender(ui('bisector', {boundRange: [50, 100], onBoundRangeChange: changed}));
    expect(view.container.querySelector('.ew-bound-feedback')?.textContent).toMatch(/Interval applied/);
  });
  it('the fields hold what a reader writes: 2π, not 2*pi -- and that is accepted', () => {
    const changed = vi.fn();
    const view = panel('ring', {onBoundRangeChange: changed});
    open(view);
    expect(inputs(view).map(i => i.value)).toEqual(['0', '2π']);
    fireEvent.click(view.getByRole('button', {name: 'Apply interval'}));
    expect(changed).toHaveBeenLastCalledWith([0, 100]);
    cleanup();
    const dragged = panel('bisector', {boundRange: [25, 100]});
    open(dragged);
    expect(inputs(dragged)[0].value).toBe('-L/4');
    cleanup();
    const sheet = panel('sheet', {boundRange: [37, 81]});
    open(sheet);
    expect(inputs(sheet).map(i => i.value)).toEqual(['z tan(37π/200)', 'z tan(81π/200)']);
  });
  it('off-centre, the board stops writing E_y = 0 and says the part across the axis survives', () => {
    const view = panel('bisector', {boundRange: [50, 100]});
    const body = cancelBody(view);
    expect(body.querySelector('.db-cancels:not(.db-nothing)')).toBeNull();
    expect(body.querySelector('.db-nothing')?.textContent).toMatch(/no longer cancels/);
    expect(body.querySelector('.db-also')?.textContent).toMatch(/survives too\.$/);
    expect(view.container.querySelector('.ew-result.is-partial')?.textContent).toMatch(/no longer cancels/);
    cleanup();
    // Centred, every partner is inside: the cancellation stands.
    const centred = panel('bisector', {boundRange: [25, 75]});
    expect(cancelBody(centred).querySelector('.db-cancels:not(.db-nothing) annotation')?.textContent).toContain('E_y=0');
    expect(centred.container.querySelector('.ew-result.is-partial')?.textContent).not.toMatch(/no longer cancels/);
  });
});

describe('the answer and the shelf speak as the board does', () => {
  it('"with" is the page’s word, the definition KaTeX’s; and the steps are one click from the answer', () => {
    const view = panel('disk');
    const k = view.container.querySelector<HTMLElement>('.ew-result-k')!;
    expect(getComputedStyle(k).fontFamily).toMatch(/Geist/);
    expect(k.querySelector('.katex')).not.toBeNull();
    expect(view.container.querySelector('.ew-worked-body')).toBeNull();
    fireEvent.click(view.getByRole('button', {name: 'Show every step'}));
    expect(view.container.querySelector('.ew-worked-body')).not.toBeNull();
  });
  it('a worked step’s symbols are set as math, and a model note never breaks inside a relation', () => {
    const view = panel('bisector');
    fireEvent.click(view.getByRole('button', {name: /Unfold the integration/}));
    const first = view.container.querySelector('.ew-worked-step p')!;
    expect(first.querySelector('.katex'), 'kλ set as math').not.toBeNull();
    expect(first.textContent).not.toMatch(/\$/);
    cleanup();
    const vdisk = panel('v-disk');
    expect(vdisk.container.querySelector('.ew-references-body p')!.textContent).toContain('z > 0');
  });
});
