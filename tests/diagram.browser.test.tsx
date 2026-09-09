import {cleanup, render} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';

afterEach(cleanup);
// These run in real Chromium. jsdom cannot back them: the diagram reads
// getScreenCTM/DOMPoint for pointer maths and calls setPointerCapture on drag.
function mount(id: ProblemId, over: Partial<Params> = {}, props: Record<string, unknown> = {}) {
  const setParams = vi.fn(), onSelect = vi.fn(), onBoundRangeChange = vi.fn();
  const view = render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, ...over}} setParams={setParams}
    count={8} continuum={0} selected={3} onSelect={onSelect} progress={1} components={false} pair={false}
    mode="divide" boundRange={[0, 100]} onBoundRangeChange={onBoundRangeChange} {...props} />);
  return {view, setParams, onSelect, onBoundRangeChange};
}
const ALL: ProblemId[] = ['bisector', 'axial', 'infinite', 'ring', 'disk', 'semi', 'arc', 'sheet'];

describe('ChargeDiagram in a real browser', () => {
  it('renders a labelled svg for every one of the eight geometries', () => {
    for (const id of ALL) {
      const {view} = mount(id);
      const svg = view.container.querySelector('svg');
      expect(svg, id).toBeTruthy();
      expect(svg!.getAttribute('aria-label'), id).toContain(getProblem(id).title);
      // A geometry that silently draws nothing is the bug this guards against.
      expect(view.container.querySelectorAll('path,rect,circle,line').length, id).toBeGreaterThan(5);
      cleanup();
    }
  });
  // Regression guard: the svg root may gain its own arrow-key handler for camera
  // orbit. It must not swallow the keys these three inner controls already own.
  it('steps the selected charge element with arrow keys', async () => {
    const {view, onSelect} = mount('bisector');
    const piece = view.container.querySelector<SVGGElement>('.cd-piece.is-selected')!;
    piece.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenCalledWith(4);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onSelect).toHaveBeenLastCalledWith(2);
  });
  it('moves the observation point with arrow keys and exposes it as a slider', async () => {
    const {view, setParams} = mount('bisector', {distance: 3});
    const point = view.container.querySelector<SVGGElement>('[role="slider"][aria-label*="Observation"]')!;
    expect(point.getAttribute('aria-valuenow')).toBe('3');
    point.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(setParams).toHaveBeenCalledWith({distance: 3.1});
    await userEvent.keyboard('{ArrowLeft}');
    expect(setParams).toHaveBeenLastCalledWith({distance: 2.9});
  });
  it('moves integration bound handles with arrow keys', async () => {
    const {view, onBoundRangeChange} = mount('bisector', {}, {mode: 'integrate'});
    const handles = view.container.querySelectorAll<SVGGElement>('.cd-bound');
    expect(handles.length).toBe(2);
    handles[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onBoundRangeChange).toHaveBeenCalledWith([1, 100]);
    handles[1].focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onBoundRangeChange).toHaveBeenLastCalledWith([0, 99]);
  });
  it('keeps the observation point fixed at the centre for the arc', () => {
    const {view} = mount('arc');
    expect(view.container.querySelector('.cd-observation.is-fixed')).toBeTruthy();
    expect(view.container.querySelector('[role="slider"][aria-label*="Observation"]')).toBeNull();
  });
});
