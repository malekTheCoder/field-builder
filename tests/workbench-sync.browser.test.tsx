import {cleanup, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {afterEach, expect, it, vi} from 'vitest';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';

afterEach(cleanup);
const view = (boundRange: [number, number]) => (
  <EquationWorkbench problem={getProblem('bisector')} params={DEFAULT_PARAMS} count={8} continuum={1} progress={1}
    mode="integrate" onModeChange={vi.fn()} boundRange={boundRange} onBoundRangeChange={vi.fn()} />
);
// The editable bound fields follow the diagram's bracket handles. That used to be an
// effect; it now happens during render, so this pins the behaviour rather than the
// mechanism -- moving a handle must rewrite the text a student sees.
it('rewrites the bound expressions when the handles move', async () => {
  const {container, rerender} = render(view([0, 100]));
  await userEvent.click([...container.querySelectorAll('button')].find(b => /Integration interval/i.test(b.textContent ?? ''))!);
  const values = () => [...container.querySelectorAll('input')].map(i => (i as HTMLInputElement).value);
  await waitFor(() => expect(values()).toEqual(['-L/2', 'L/2']));
  rerender(view([50, 100]));
  await waitFor(() => expect(values()).toEqual(['0', 'L/2']));
  rerender(view([0, 100]));
  await waitFor(() => expect(values()).toEqual(['-L/2', 'L/2']));
});
// A typed edit must survive re-renders that do not move the handles, otherwise the
// field would fight the student mid-keystroke.
it('leaves a typed bound alone while the handles stay put', async () => {
  const {container, rerender} = render(view([0, 100]));
  await userEvent.click([...container.querySelectorAll('button')].find(b => /Integration interval/i.test(b.textContent ?? ''))!);
  const first = () => container.querySelector('input')! as HTMLInputElement;
  await waitFor(() => expect(first().value).toBe('-L/2'));
  await userEvent.fill(first(), '-L/4');
  expect(first().value).toBe('-L/4');
  rerender(view([0, 100]));
  await waitFor(() => expect(first().value).toBe('-L/4'));
});
