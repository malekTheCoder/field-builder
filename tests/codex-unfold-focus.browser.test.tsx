import 'katex/dist/katex.min.css';
import '../app/globals.css';
import '../src/explorer/explorer.css';
import {cleanup, render} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';

// Next step inserts the next reading passage before the control. Leaving focus on that
// control hides the new passage from a keyboard reader; removing it at the final line
// used to lose focus entirely. Tab from the revealed passage must reach the next action.
afterEach(() => { cleanup(); history.replaceState(null, '', '/'); });
for (const [id, width] of [['bisector', 560], ['shell', 350], ['v-disk', 350]] as const) {
  it(`${id}: keyboard advancement focuses each new algebra step, including the last`, async () => {
    await page.viewport(width + 40, 844);
    const view = render(<div style={{width}}><EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS}
      onModeChange={() => {}} boundRange={[0, 100]} onBoundRangeChange={() => {}} /></div>);
    const unfold = view.getByRole('button', {name: 'Unfold the integration'});
    unfold.focus();
    await userEvent.keyboard('{Enter}');
    let count = 1;
    while (view.queryByRole('button', {name: 'Next step'})) {
      const next = view.getByRole('button', {name: 'Next step'});
      next.focus();
      await userEvent.keyboard('{Enter}');
      const steps = [...view.container.querySelectorAll<HTMLElement>('.ew-worked-step')];
      expect(steps).toHaveLength(++count);
      const latest = steps.at(-1)!;
      expect(document.activeElement, 'the revealed prose and equation are the next reading target').toBe(latest);
      expect(latest.querySelector('.katex-mathml math')).not.toBeNull();
      expect(latest.getAttribute('aria-labelledby')).toBe(latest.querySelector('p')?.id);
      if (view.queryByRole('button', {name: 'Next step'})) {
        await userEvent.keyboard('{Tab}');
        expect(document.activeElement).toBe(view.getByRole('button', {name: 'Next step'}));
      }
      expect(count).toBeLessThan(30);
    }
    expect(count).toBeGreaterThan(2);
    expect(view.getByText('Every step accounted for.')).toBeTruthy();
    if (id === 'v-disk') expect(view.getByRole('heading', {name: 'Differentiate back'})).toBeTruthy();
    const restart = view.getByRole('button', {name: 'Start the algebra again'});
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(restart);
    await userEvent.keyboard('{Enter}');
    const restarted = view.container.querySelectorAll<HTMLElement>('.ew-worked-step');
    expect(restarted).toHaveLength(1);
    expect(document.activeElement).toBe(restarted[0]);
    expect(view.queryByText('Every step accounted for.')).toBeNull();
    expect(view.queryByRole('heading', {name: 'Differentiate back'})).toBeNull();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(view.getByRole('button', {name: 'Next step'}));
  }, 20000);
}
it('Show every step leaves focus on its initiating control', async () => {
  const view = render(<EquationWorkbench problem={getProblem('bisector')} params={DEFAULT_PARAMS}
    onModeChange={() => {}} boundRange={[0, 100]} onBoundRangeChange={() => {}} />);
  const show = view.getByRole('button', {name: 'Show every step'});
  show.focus();
  await userEvent.keyboard('{Enter}');
  expect(document.activeElement).toBe(show);
  expect(view.queryByRole('button', {name: 'Next step'})).toBeNull();
  window.dispatchEvent(new Event('beforeprint'));
  expect(document.activeElement).toBe(show);
}, 15000);

it('the scrolling board never fades a focused algebra passage or action', async () => {
  const view = render(<div className="exp-workspace"><EquationWorkbench problem={getProblem('bisector')} params={DEFAULT_PARAMS}
    onModeChange={() => {}} boundRange={[0, 100]} onBoundRangeChange={() => {}} /></div>);
  const panel = view.container.querySelector<HTMLElement>('.ew-panel')!;
  panel.setAttribute('data-more', '');
  const unfold = view.getByRole('button', {name: 'Unfold the integration'});
  unfold.focus();
  await userEvent.keyboard('{Enter}');
  const next = view.getByRole('button', {name: 'Next step'});
  next.focus();
  expect(getComputedStyle(panel).maskImage).toBe('none');
  await userEvent.keyboard('{Enter}');
  expect(document.activeElement?.classList.contains('ew-worked-step')).toBe(true);
  expect(getComputedStyle(panel).maskImage).toBe('none');
}, 15000);
