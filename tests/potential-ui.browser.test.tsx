import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {stageOf} from '../src/problems/types';

afterEach(cleanup);

describe('potential lessons in the live UI', () => {
 it('the workbench accumulates a scalar and has no projection or symmetry row', () => {
  const {queryByText, getAllByText, container} = render(<EquationWorkbench problem={getProblem('v-ring')} params={DEFAULT_PARAMS} continuum={1} progress={1} mode="project" onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} />);
  expect(getAllByText('One scalar contribution').length).toBeGreaterThan(0);
  expect(container.querySelector('.ew-assembled')?.textContent ?? '').toContain('V');
  expect(queryByText('Which directions survive?')).toBeNull();
  expect(queryByText('Signed projection')).toBeNull();
 });
 // The shape of these two derivations, which the walk-through reads step by step. The page that
 // used to render them as its own view is gone; the claims about the lessons themselves are not.
 it('the ring potential runs eight steps, ending in differentiate-back, with no symmetry step',()=>{
  const p = getProblem('v-ring');
  expect(stageOf(p, 'symmetry')).toBe(-1);expect(stageOf(p, 'gradient')).toBe(7);expect(p.steps).toHaveLength(8);
 });
 it('the arc potential has no gradient step, because E is not along its axis',()=>{
  const p = getProblem('v-arc');
  expect(stageOf(p, 'gradient')).toBe(-1);expect(p.steps).toHaveLength(7);
 });
 it('the explorer library lists the potential lessons and draws a scalar gauge on the ring', async () => {
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'v-ring', seen: true, dark: false, sidebarOpen: true, showNumbers: true, params: {}}));
  const {findAllByText, queryByText, container} = render(<Explorer />);
  // Dismiss the tour if hydration still opens it; the saved `seen` flag should already skip it.
  const tour = queryByText("Let’s start") ?? queryByText("Let’s build a field") ?? queryByText('Skip');
  if (tour) tour.click();
  expect((await findAllByText('Ring · potential')).length).toBeGreaterThan(0);
  expect((await findAllByText('Disk · potential')).length).toBeGreaterThan(0);
  expect((await findAllByText('Arc · potential')).length).toBeGreaterThan(0);
  await waitFor(() => expect(container.querySelector('.cd-gauge')).toBeTruthy());
  expect(container.querySelector('.cd-vector')).toBeNull();
 });
});
