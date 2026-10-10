import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
import {workedSteps} from '../src/workbench/derivation';

afterEach(cleanup);
/* THE PANEL SAYS WHAT IT PROMISES, IN THE NAMES THE FIGURE USES.
 *
 * Each of these was a gap a student or a teacher found reading the panel: a potential lesson that
 * promised the field "falls out of one derivative" and never took it; a worked substitution that
 * renamed the board's α to u under a word the course had not taught; a board that wrote what
 * survives the cancellation but never the cancellation; new symbols left unsaid; and a model note
 * that told the ramp's reader its slider was a total charge. */
function panel(id: ProblemId) {
  return render(<EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS} continuum={0} progress={1} mode="divide"
    onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} />);
}
/** Open "Unfold the integration" and step through every step it has. */
function unfold(view: ReturnType<typeof panel>) {
  fireEvent.click(view.getByRole('button', {name: /Unfold the integration/}));
  for (let i = 0; i < 20 && view.queryByRole('button', {name: /Next step/}); i++) {
    fireEvent.click(view.getByRole('button', {name: /Next step/}));
  }
  expect(view.container.textContent).toContain('Every step accounted for.');
  const body = view.container.querySelector<HTMLElement>('.ew-worked-body')!;
  // The TeX each worked line was set from, which KaTeX keeps beside the rendering.
  const tex = [...body.querySelectorAll('annotation')].map(a => a.textContent ?? '');
  const prose = [...body.querySelectorAll('.ew-worked-step p')].map(p => p.textContent ?? '');
  // A worked step's sentence sets its symbols as math, as the board's remarks do: their TeX.
  const said = [...body.querySelectorAll('.ew-worked-step p annotation')].map(a => a.textContent ?? '');
  return {body, tex, prose, said};
}

describe('a potential lesson takes the derivative it promises', () => {
  it('v-disk: the integration, then the field back out of V under its own heading', () => {
    const {body, tex, prose} = unfold(panel('v-disk'));
    expect(body.querySelector('.ew-worked-sub')?.textContent).toBe('Differentiate back');
    expect(tex.some(t => t.includes('\\frac{dV}{dz}')), 'the derivative of V').toBe(true);
    expect(tex.some(t => t.startsWith('E_z=')), 'the field it recovers').toBe(true);
    expect(prose.some(p => p.includes('−dV/dz')), 'E = −dV/dz said in words').toBe(true);
    // After the integration, not before it: the heading follows the integral's own last line.
    const steps = [...body.querySelectorAll('.ew-worked-step, .ew-worked-sub')];
    const heading = steps.findIndex(s => s.classList.contains('ew-worked-sub'));
    // The panel's own integration -- the constant out, the substitution, the power rule, the bracket --
    // then the lesson's own steps: the heading follows all of them.
    expect(heading).toBe(workedSteps(getProblem('v-disk')).worked.length);
  });
  it('every potential lesson that carries a derivative shows it, and the arc, which has none, is unchanged', () => {
    for (const p of PROBLEMS.filter(q => q.quantity === 'V')) {
      const has = p.steps.some(s => s.kind === 'gradient');
      const {body} = unfold(panel(p.id));
      expect(body.querySelector('.ew-worked-sub') !== null, p.id).toBe(has);
      // Every step of the one list the page and the handout share, the differentiation included.
      const {worked, back} = workedSteps(p);
      expect(body.querySelectorAll('.ew-worked-step').length, p.id).toBe(worked.length + back.length);
      expect(back.length, p.id).toBe(p.steps.find(s => s.kind === 'gradient')?.worked?.length ?? 0);
      cleanup();
    }
    expect(PROBLEMS.find(p => p.id === 'v-arc')!.steps.some(s => s.kind === 'gradient')).toBe(false);
  });
});

describe('the bisector’s substitution keeps the board’s name for its angle', () => {
  it('α throughout, never u, and the conversion factor rather than "the Jacobian"', () => {
    const {tex, prose, said} = unfold(panel('bisector'));
    expect(tex.join(' ')).toContain('\\alpha');
    for (const t of tex) expect(t, t).not.toMatch(/(?<![A-Za-z\\])u(?![A-Za-z])/);
    for (const p of prose) {
      expect(p, p).not.toMatch(/\bu\b/);
      expect(p, p).not.toMatch(/Jacobian/i);
    }
    expect(said).toContain(String.raw`r\sec^2\alpha`);
  });
});

describe('the board writes the cancellation and says what its symbols mean', () => {
  it('the bisector’s cancel step writes E_y = 0, in ink: the pair it names is not a projection', () => {
    const view = panel('bisector');
    const cancel = view.container.querySelector<HTMLElement>('.db-step[data-step="cancel"] .db-cancels')!;
    expect(cancel).not.toBeNull();
    expect(cancel.querySelector('annotation')?.textContent).toContain('E_y=0');
    expect(cancel.querySelector('.fx')).toBeNull();
  });
  it('every lesson’s first line says in words how much charge a piece holds', () => {
    for (const p of PROBLEMS) {
      const view = panel(p.id);
      // In whichever of its paragraphs: the endless charges first say why they are cut by angle.
      const says = [...view.container.querySelectorAll<HTMLElement>('.db-step[data-step="pieces"] .db-say')];
      expect(says.length, p.id).toBeGreaterThan(0);
      const say = says.find(s => /charge per unit (length|area)/.test(s.textContent ?? ''));
      expect(say, p.id).toBeDefined();
      // Its symbols are set as math, like the line above them, not as stray Greek in the prose font.
      expect(say!.querySelector('.katex'), p.id).not.toBeNull();
      // And the limits are explained where they first appear: where each piece is, and where they run.
      expect(view.container.querySelector('.db-step[data-step="add"] .db-say')?.textContent, p.id).toMatch(/sits at its own .*numbered by .* run /);
      cleanup();
    }
  });
  it('a remark never ends on a lone symbol: "toward P." is held together', () => {
    // KaTeX sets a symbol as inline blocks, which a browser breaks before even after a no-break
    // space; the unit vector's sentence ended on a line holding nothing but "P." beside the figure.
    const view = panel('bisector');
    const held = [...view.container.querySelectorAll<HTMLElement>('.db-step[data-step="one"] .db-say .db-held')].find(h => (h.textContent ?? '').startsWith('toward'))!;
    expect(held).not.toBeNull();
    expect(getComputedStyle(held).whiteSpace).toBe('nowrap');
    expect(held.textContent).toMatch(/^toward\u00a0/);
    expect(held.textContent).toMatch(/\.$/);
    expect(held.querySelector('.katex')).not.toBeNull();
  });
  it('a second component that survives is said to in words, beside its formula', () => {
    const view = panel('endpoint');
    const also = view.container.querySelector<HTMLElement>('.db-also')!;
    expect(also.textContent).toMatch(/survives too\.$/);
    expect(also.querySelector('annotation')?.textContent).not.toContain('\\text');
  });
});

describe('the model note does not tell the ramp’s reader the slider is a total charge', () => {
  it('ramp: the charge slider is the peak density', () => {
    const view = panel('ramp');
    const note = view.container.querySelector('.ew-references-body')!.textContent!;
    // λ₀ set by KaTeX, as the board sets it: in the page's sans its subscript fell far below the λ.
    expect(note).toMatch(/peak density λ/);
    expect(view.container.querySelector('.ew-references-body .katex')).not.toBeNull();
    cleanup();
    expect(panel('bisector').container.querySelector('.ew-references-body')!.textContent).not.toMatch(/peak density/);
  });
});
