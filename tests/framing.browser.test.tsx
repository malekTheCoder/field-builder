import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem, PROBLEMS} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';

afterEach(cleanup);
/* Does each lesson actually use the picture it is given?
 *
 * "For line on axis, why's it so short, is that normal?" -- it was not. That lesson has the
 * most to show of any of them, a rod plus the gap out to P, and it had been handed the
 * smallest scale of the lot, a flat 35 pixels per metre, so its rod drew across a fifth of
 * the frame with dead space beyond it. The scales are fitted now, per lesson, to the span
 * each one has to fit. Nothing checked that they stayed fitted.
 *
 * These are deliberately loose. The point is not to pin a composition -- that would fight
 * every future change to the drawing -- but to catch a lesson that has quietly become a speck
 * in the corner, or one whose subject has wandered off the edge. */
function mount(id: ProblemId, over: Partial<Params> = {}) {
  return render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, ...over}} setParams={vi.fn()}
    count={5} continuum={0} selected={2} onSelect={vi.fn()} progress={1} components={false} pair={false}
    mode="divide" boundRange={[0, 100]} onBoundRangeChange={vi.fn()} compact />);
}
/** How much of the frame the charge and P span between them, as a fraction of each side. */
function subjectSpan(container: HTMLElement) {
  const svg = container.querySelector<SVGSVGElement>('.cd-svg')!;
  const frame = svg.getBoundingClientRect();
  const parts = [...container.querySelectorAll('[data-source-body], .cd-piece, .cd-point')]
    .map(el => el.getBoundingClientRect()).filter(r => r.width > 0 || r.height > 0);
  if (!parts.length) return null;
  const left = Math.min(...parts.map(r => r.left)), right = Math.max(...parts.map(r => r.right));
  const top = Math.min(...parts.map(r => r.top)), bottom = Math.max(...parts.map(r => r.bottom));
  return {
    across: (right - left) / frame.width,
    down: (bottom - top) / frame.height,
    frame,
  };
}

describe('how each lesson fills its frame', () => {
  it('never draws its subject as a speck in the corner', () => {
    const thin: string[] = [];
    for (const id of PROBLEMS.map(p => p.id)) {
      const {container} = mount(id);
      const span = subjectSpan(container);
      expect(span, `${id} drew no charge and no P`).not.toBeNull();
      // The larger of the two directions, because an upright rod is legitimately narrow and a
      // flat one legitimately short. Something has to be using the frame.
      //
      // Measured when this was written: the bounded lessons run 36% (endpoint, ramp) to 69%
      // (axial, the one that was complained about at 19%), and the three unbounded ones fill
      // it entirely by design. So the floor sits below the tightest real reading with room to
      // spare, and well above the regression it exists to catch.
      const filled = Math.max(span!.across, span!.down);
      if (filled < .3) thin.push(`${id}: ${Math.round(filled * 100)}% of the frame`);
      cleanup();
    }
    expect(thin, `${thin.length} lessons draw too small to read`).toEqual([]);
  });
  it('holds the subject in the frame at rest, in the view each lesson opens in', () => {
    const lost: string[] = [];
    for (const id of PROBLEMS.map(p => p.id)) {
      const {container} = mount(id);
      const svg = container.querySelector<SVGSVGElement>('.cd-svg')!;
      const frame = svg.getBoundingClientRect();
      const halo = container.querySelector('.cd-point-halo')!.getBoundingClientRect();
      if (halo.top < frame.top || halo.bottom > frame.bottom || halo.left < frame.left || halo.right > frame.right)
        lost.push(`${id}: P at ${Math.round(halo.x - frame.x)},${Math.round(halo.y - frame.y)}`);
      cleanup();
    }
    expect(lost, `${lost.length} lessons open with P outside the picture`).toEqual([]);
  });
  it('keeps P readable when it is dragged to either end of its travel', () => {
    // P's distance is the one parameter a reader drags continuously, and the scale is refitted
    // as they do. Both ends of that travel have to stay drawable.
    const lost: string[] = [];
    for (const id of PROBLEMS.map(p => p.id)) for (const distance of [.5, 6]) {
      const {container} = mount(id, {distance});
      const svg = container.querySelector<SVGSVGElement>('.cd-svg')!;
      const frame = svg.getBoundingClientRect();
      const dot = container.querySelector('.cd-point')!.getBoundingClientRect();
      if (dot.left < frame.left || dot.right > frame.right || dot.top < frame.top || dot.bottom > frame.bottom)
        lost.push(`${id} at ${distance}m: P at ${Math.round(dot.x - frame.x)},${Math.round(dot.y - frame.y)}`);
      cleanup();
    }
    expect(lost, `${lost.length} readings put P outside the picture`).toEqual([]);
  });
});
