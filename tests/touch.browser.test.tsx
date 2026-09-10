import {cleanup, fireEvent, render} from '@testing-library/react';
import {page} from 'vitest/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';

afterEach(async () => {
  cleanup();
  document.documentElement.classList.remove('dark');
  await page.viewport(1280, 800);
});

function mount(id: ProblemId, over: Partial<Params> = {}, props: Record<string, unknown> = {}) {
  const setParams = vi.fn(), onSelect = vi.fn(), onBoundRangeChange = vi.fn();
  const view = render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, ...over}} setParams={setParams}
    count={8} continuum={0} selected={3} onSelect={onSelect} progress={1} components={false} pair={false}
    mode="divide" boundRange={[0, 100]} onBoundRangeChange={onBoundRangeChange} {...props} />);
  return {view, setParams, onSelect, onBoundRangeChange};
}

function dragTouch(el: Element, dx: number, dy: number) {
  const r = el.getBoundingClientRect();
  const x = r.x + r.width / 2, y = r.y + r.height / 2;
  fireEvent.pointerDown(el, {pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: x, clientY: y, buttons: 1});
  fireEvent.pointerMove(el, {pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: x + dx, clientY: y + dy, buttons: 1});
  fireEvent.pointerUp(el, {pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: x + dx, clientY: y + dy});
}

const IDS: ProblemId[] = ['bisector', 'ring', 'disk', 'axial'];
const VIEWPORTS = [[768, 1024], [390, 844]] as const;

describe('touch and tablet diagram drags', () => {
  for (const [w, h] of VIEWPORTS) {
    for (const dark of [false, true]) {
      it(`drags P and bound handles by touch at ${w}×${h} ${dark ? 'dark' : 'light'}`, async () => {
        await page.viewport(w, h);
        document.documentElement.classList.toggle('dark', dark);
        if (dark) await new Promise(r => setTimeout(r, 250));
        for (const id of IDS) {
          const p = mount(id, {distance: 3});
          const svg = p.view.container.querySelector('.cd-svg');
          expect(svg, id).toBeTruthy();
          expect(svg!.getBoundingClientRect().width, id).toBeGreaterThan(40);
          const observation = p.view.container.querySelector('.cd-observation')!;
          const alongZ = id === 'ring' || id === 'disk';
          dragTouch(observation, alongZ ? 0 : 70, alongZ ? -50 : 0);
          expect(p.setParams.mock.calls.length, `${id} P`).toBeGreaterThan(0);
          cleanup();
          const b = mount(id, {}, {mode: 'integrate'});
          const bound = b.view.container.querySelector('.cd-bound')!;
          expect(bound, `${id} bound`).toBeTruthy();
          dragTouch(bound, 36, 36);
          expect(b.onBoundRangeChange.mock.calls.length, `${id} bound`).toBeGreaterThan(0);
          cleanup();
        }
      });
    }
  }
});
