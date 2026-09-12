import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import FieldBuilder from '../src/wizard/FieldBuilder';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, STAGE_LABELS} from '../src/problems/types';
import {stageOf} from '../src/problems/types';

afterEach(cleanup);

describe('potential lessons in the live UI', () => {
 it('the workbench accumulates a scalar and has no projection or symmetry row', () => {
  const {queryByText, getAllByText, container} = render(<EquationWorkbench problem={getProblem('v-ring')} params={DEFAULT_PARAMS} count={8} continuum={1} progress={1} mode="project" onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} />);
  expect(getAllByText('One scalar contribution').length).toBeGreaterThan(0);
  expect(container.querySelector('.ew-assembled')?.textContent ?? '').toContain('V');
  expect(queryByText('Which directions survive?')).toBeNull();
  expect(queryByText('Signed projection')).toBeNull();
 });
 it('the ring potential wizard is eight steps including differentiate-back, with no symmetry', async () => {
  const p = getProblem('v-ring');
  expect(stageOf(p, 'symmetry')).toBe(-1);expect(stageOf(p, 'gradient')).toBe(7);expect(p.steps).toHaveLength(8);
  const {findByRole, getByLabelText, queryByLabelText} = render(<FieldBuilder initialProblem="v-ring" />);
  expect(await findByRole('heading', {name: p.title})).toBeTruthy();
  expect(getByLabelText(`Step A: ${STAGE_LABELS.origin}`)).toBeTruthy();
  expect(getByLabelText(`Step H: ${STAGE_LABELS.gradient}`)).toBeTruthy();
  expect(queryByLabelText(`Step D: ${STAGE_LABELS.symmetry}`)).toBeNull();
 });
 it('the arc potential wizard has no gradient step', async () => {
  const p = getProblem('v-arc');
  expect(stageOf(p, 'gradient')).toBe(-1);expect(p.steps).toHaveLength(7);
  const {findByRole, getByLabelText, queryByLabelText} = render(<FieldBuilder initialProblem="v-arc" />);
  expect(await findByRole('heading', {name: p.title})).toBeTruthy();
  expect(getByLabelText(`Step G: ${STAGE_LABELS.limits}`)).toBeTruthy();
  expect(queryByLabelText(`Step H: ${STAGE_LABELS.gradient}`)).toBeNull();
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
