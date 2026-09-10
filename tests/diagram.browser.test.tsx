import {cleanup, fireEvent, render} from '@testing-library/react';
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
const ALL: ProblemId[] = ['bisector', 'axial', 'infinite', 'ring', 'disk', 'semi', 'arc', 'sheet', 'endpoint', 'ramp'];

describe('ChargeDiagram in a real browser', () => {
  it('renders a labelled svg for every one of the ten geometries', () => {
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
  it('potential problems reuse the shared layout and show a scalar gauge, not field arrows', () => {
    for (const id of ['v-ring', 'v-disk', 'v-arc', 'v-rod-bisector', 'v-rod-axial'] as const) {
      const {view} = mount(id);
      const svg = view.container.querySelector('svg');
      expect(svg!.getAttribute('aria-label'), id).toContain('electric potential');
      expect(view.container.querySelector('.cd-gauge'), id).toBeTruthy();
      expect(view.container.querySelector('.cd-vector'), id).toBeNull();
      expect(view.container.querySelectorAll('path,rect,circle,line').length, id).toBeGreaterThan(5);
      cleanup();
    }
  });
  // Regression guard: the svg root may gain its own arrow-key handler for camera
  // orbit. It must not swallow the keys these three inner controls already own.
  it('steps the selected charge element with arrow keys', async () => {
    const {view, onSelect} = mount('bisector');
    const piece = view.container.querySelector<HTMLInputElement>('input[aria-label="Selected charge element"]')!;
    piece.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenCalledWith(4);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onSelect).toHaveBeenLastCalledWith(2);
  });
  it('moves the observation point with arrow keys and exposes it as a slider', async () => {
    const {view, setParams} = mount('bisector', {distance: 3});
    const point = view.container.querySelector<SVGGElement>('input[type="range"][aria-label*="Observation"]')!;
    expect((point as unknown as HTMLInputElement).value).toBe('3');
    point.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(setParams).toHaveBeenCalledWith({distance: 3.1});
    await userEvent.keyboard('{ArrowLeft}');
    expect(setParams).toHaveBeenLastCalledWith({distance: 2.9});
  });
  it('moves integration bound handles with arrow keys', async () => {
    const {view, onBoundRangeChange} = mount('bisector', {}, {mode: 'integrate'});
    const handles = view.container.querySelectorAll<HTMLInputElement>('input[aria-label$="integration bound"]');
    expect(handles.length).toBe(2);
    handles[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onBoundRangeChange).toHaveBeenCalledWith([1, 100]);
    handles[1].focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onBoundRangeChange).toHaveBeenLastCalledWith([0, 99]);
  });
  it('orbits with arrow keys, resets with Home, and leaves nested controls independent', async () => {
    const {view, setParams} = mount('ring');
    const svg = view.container.querySelector<HTMLButtonElement>('.cd-camera-control')!;
    const reset = view.getByRole('button', {name: 'Reset view'}) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    svg.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(reset.disabled).toBe(false);
    await userEvent.keyboard('{Home}');
    expect(reset.disabled).toBe(true);
    const point = view.container.querySelector<HTMLInputElement>('input[aria-label*="Observation"]')!;
    point.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(setParams).toHaveBeenCalledWith({distance: 3.1});
    expect(reset.disabled).toBe(true);
  });
  it('keeps existing seam and piece identities when the partition doubles', () => {
    const {view} = mount('bisector', {slices: 4}, {count: 4, continuum: 0});
    const keys = (sel: string) => [...view.container.querySelectorAll(sel)].map(el => el.getAttribute(sel.includes('seam') ? 'data-seam' : 'data-piece-key'));
    const coarseSeams = keys('[data-seam]');
    const coarsePieces = keys('[data-piece-key]');
    expect(coarseSeams.length).toBe(3);
    expect(coarsePieces.length).toBe(4);
    expect(view.container.querySelector('[data-source-body]')).toBeTruthy();
    cleanup();
    const fine = mount('bisector', {slices: 4}, {count: 8, continuum: 0});
    const fineSeams = [...fine.view.container.querySelectorAll('[data-seam]')].map(el => el.getAttribute('data-seam'));
    const finePieces = [...fine.view.container.querySelectorAll('[data-piece-key]')].map(el => el.getAttribute('data-piece-key'));
    for (const key of coarseSeams) expect(fineSeams, String(key)).toContain(key);
    for (const key of coarsePieces) expect(finePieces, String(key)).toContain(key);
    expect(fineSeams.length).toBeGreaterThan(coarseSeams.length);
    expect(finePieces.length).toBeGreaterThan(coarsePieces.length);
  });
  it('tiles a ring from existing arcs instead of shrinking gaps', () => {
    const {view} = mount('ring', {slices: 4}, {count: 4, continuum: 0});
    const coarse = [...view.container.querySelectorAll('[data-piece-key]')].map(el => el.getAttribute('data-piece-key'));
    expect(coarse.length).toBe(4);
    cleanup();
    const fine = mount('ring', {slices: 4}, {count: 8, continuum: 0});
    const next = [...fine.view.container.querySelectorAll('[data-piece-key]')].map(el => el.getAttribute('data-piece-key'));
    for (const key of coarse) expect(next).toContain(key);
    expect(next.length).toBe(8);
  });
  it('grows a tip-to-tail chain in sum mode instead of drawing every arrow at once', () => {
    const empty = mount('bisector', {}, {mode: 'sum', progress: 0});
    expect(empty.view.container.querySelector('[data-sum-chain]')).toBeNull();
    cleanup();
    const partial = mount('bisector', {}, {mode: 'sum', progress: .4});
    const n = Number(partial.view.container.querySelector('[data-sum-chain]')?.getAttribute('data-sum-chain'));
    expect(n).toBeGreaterThan(2);
    expect(n).toBeLessThan(9);
    cleanup();
    const full = mount('bisector', {}, {mode: 'sum', progress: 1});
    expect(Number(full.view.container.querySelector('[data-sum-chain]')?.getAttribute('data-sum-chain'))).toBe(9);
  });
  it('animates cancellation only where a symmetric partner exists', () => {
    const {view} = mount('bisector', {}, {pair: true, mode: 'project'});
    expect(view.container.querySelector('[data-cancel-transverse]')).toBeTruthy();
    cleanup();
    for (const id of ['axial', 'semi', 'endpoint', 'ramp'] as const) {
      const next = mount(id, {}, {pair: true, mode: 'project'});
      expect(next.view.container.querySelector('[data-cancel-transverse]'), id).toBeNull();
      cleanup();
    }
    const ring = mount('ring', {}, {pair: true, mode: 'project'});
    expect(ring.view.container.querySelector('[data-cancel-transverse]')).toBeTruthy();
  });
  it('sweeps one disk ring rather than stacking independent rings', () => {
    const {view} = mount('disk', {}, {count: 8, mode: 'sum', progress: .5});
    expect(view.container.querySelector('[data-disk-sweep]')).toBeTruthy();
    expect(view.container.querySelectorAll('[data-piece-key]').length).toBe(1);
  });
  it('orbits from motion values without a React render per pointermove', () => {
    const {view} = mount('ring');
    const root = view.container.querySelector('.charge-diagram')!;
    const svg = view.container.querySelector('svg')!;
    const plane = view.container.querySelector('.cd-orbit-plane')!;
    const before = plane.getAttribute('transform');
    fireEvent.pointerDown(svg, {clientX: 400, clientY: 200, pointerId: 1, buttons: 1});
    const afterDown = Number(root.getAttribute('data-renders'));
    for (let i = 1; i <= 10; i++) fireEvent.pointerMove(svg, {clientX: 400 + i * 12, clientY: 200, pointerId: 1, buttons: 1});
    expect(Number(root.getAttribute('data-renders'))).toBe(afterDown);
    expect(plane.getAttribute('transform')).not.toBe(before);
    expect(svg.getAttribute('data-orbit-ms')).toBeTruthy();
  });
  it('keeps the observation point fixed at the centre for the arc', () => {
    const {view} = mount('arc');
    expect(view.container.querySelector('.cd-observation.is-fixed')).toBeTruthy();
    expect(view.container.querySelector('input[type="range"][aria-label*="Observation"]')).toBeNull();
  });
});
