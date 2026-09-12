import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem, PROBLEMS} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';

afterEach(cleanup);
/* The sweep that started the label job, kept as a guard.
 *
 * `tests/labels.test.ts` proves the placer separates boxes. That is not the same claim as
 * "no lesson shows two labels on top of each other", which is what was actually wrong:
 * twelve of the fifteen did at some parameter value and three pushed a label off the frame.
 * Nothing there was a bug in a placement rule -- every offset was individually reasonable --
 * so only a sweep over real renders can say whether the figure is clean.
 *
 * Real Chromium, because the placer measures with getBoundingClientRect: a label inside the
 * orbiting plane carries that plane's transform, and only the screen box puts every label in
 * one space. jsdom reports zero for all of it and the sweep would pass by measuring nothing. */
const SETTINGS: {name: string; over: Partial<Params>}[] = [
  {name: 'defaults', over: {}},
  {name: 'P close, source small', over: {distance: .6, size: 1}},
  {name: 'P far, source long', over: {distance: 6, size: 8}},
  {name: 'many pieces', over: {slices: 18}},
  {name: 'continuum', over: {continuum: 1, slices: 12}},
  {name: 'quarter turn', over: {phi: Math.PI / 2, element: .1}},
];
type Box = {t: string; left: number; top: number; right: number; bottom: number};
function labelBoxes(root: Element): Box[] {
  // The drawn gesture legend is excluded here exactly as the placer excludes it: it is three
  // deliberately stacked rows whose line boxes share a couple of pixels of leading, and it is
  // pinned to a corner rather than laid out against the drawing.
  return [...root.querySelectorAll<SVGGraphicsElement>('text')]
    .filter(t => !t.closest('.cd-help') && t.textContent!.trim() !== '' && Number(getComputedStyle(t).opacity) > .05)
    .map(t => { const r = t.getBoundingClientRect(); return {t: t.textContent!.trim().slice(0, 30), left: r.left, top: r.top, right: r.right, bottom: r.bottom}; })
    .filter(b => b.right - b.left > 0 && b.bottom - b.top > 0);
}
const overlap = (a: Box, b: Box) =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
function mount(id: ProblemId, over: Partial<Params>, props: Record<string, unknown> = {}) {
  return render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, ...over}} setParams={vi.fn()}
    count={over.slices ?? DEFAULT_PARAMS.slices} continuum={over.continuum ?? 0} selected={1} onSelect={vi.fn()}
    progress={1} components={false} pair={false} mode="divide" boundRange={[0, 100]} onBoundRangeChange={vi.fn()} {...props} />);
}
const ALL: ProblemId[] = PROBLEMS.map(p => p.id);

describe('labels across every lesson', () => {
  it('never puts two of them on top of each other', () => {
    const bad: string[] = [];
    for (const id of ALL) for (const {name, over} of SETTINGS) {
      const {container} = mount(id, over);
      const boxes = labelBoxes(container);
      expect(boxes.length, `${id} / ${name} drew no labels at all`).toBeGreaterThan(0);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++)
        // Zero tolerance on contact, not on the placer's own padding: the pad is there to be
        // spent when the frame is tight, and spending it is a success, not a near miss.
        if (overlap(boxes[i], boxes[j])) bad.push(`${id} / ${name}: "${boxes[i].t}" over "${boxes[j].t}"`);
      cleanup();
    }
    expect(bad, `${bad.length} colliding pairs`).toEqual([]);
  });
  it('keeps every one of them inside the picture', () => {
    const lost: string[] = [];
    for (const id of ALL) for (const {name, over} of SETTINGS) {
      const {container} = mount(id, over);
      const svg = container.querySelector('svg')!;
      const frame = svg.getBoundingClientRect();
      // A label reaching the very edge still reads; one past it is gone. Half its own height
      // of slack, since the frame has no border drawn at that line anyway.
      const slack = 8;
      for (const b of labelBoxes(container))
        if (b.left < frame.left - slack || b.right > frame.right + slack || b.top < frame.top - slack || b.bottom > frame.bottom + slack)
          lost.push(`${id} / ${name}: "${b.t}"`);
      cleanup();
    }
    expect(lost, `${lost.length} labels off the frame`).toEqual([]);
  });
  it('leaves the observation point readable, since a label over P hides the whole question', () => {
    const covered: string[] = [];
    for (const id of ALL) for (const {name, over} of SETTINGS) {
      const {container} = mount(id, over);
      const marks = [...container.querySelectorAll<SVGGraphicsElement>('.cd-point, .cd-point-halo')]
        .map(el => el.getBoundingClientRect()).filter(r => r.width > 0);
      for (const b of labelBoxes(container)) for (const m of marks) {
        // P's own letter is allowed to sit on P. Nothing else is.
        if (b.t === 'P' || b.t === 'P = O') continue;
        if (overlap(b, {t: '', left: m.left, top: m.top, right: m.right, bottom: m.bottom})) covered.push(`${id} / ${name}: "${b.t}" over P`);
      }
      cleanup();
    }
    expect(covered, `${covered.length} labels over P`).toEqual([]);
  });
});
