import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {page} from 'vitest/browser';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';

afterEach(async () => { cleanup(); await page.viewport(1280, 800); });
function mount(id: ProblemId, size = 4, charge = 2) {
 return render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, size, charge}} setParams={vi.fn()}
  count={5} continuum={0} selected={3} onSelect={vi.fn()} progress={1} components={false} pair={false} mode="divide" compact />);
}
/** The SVG hit geometry and the WebGL scene share this world-to-figure transform. A circle's projected vertical
 * radius is R hypot(b,d), not the radius of its axis-aligned bounding box before the camera turns it. */
function rim(container: HTMLElement, radius: number) {
 const plane = container.querySelector<SVGGElement>('.cd-orbit-plane')!;
 const m = plane.transform.baseVal.consolidate()!.matrix;
 return {top: m.f - radius * Math.hypot(m.b, m.d), bottom: m.f + radius * Math.hypot(m.b, m.d),
  left: m.e - radius * Math.hypot(m.a, m.c), right: m.e + radius * Math.hypot(m.a, m.c)};
}
function expectRimInside(container: HTMLElement, radius: number, context: string) {
 const r = rim(container, radius);
 // The plot ends at 371. Ten units keep the tube, signs and rim clear of its clipping edge.
 expect(r.bottom, `${context}: the near rim is clipped by the footer`).toBeLessThanOrEqual(361.1);
 expect(r.top, `${context}: the far rim crosses the stage heading`).toBeGreaterThanOrEqual(53.9);
 expect(r.left, `${context}: left rim`).toBeGreaterThanOrEqual(41.9);
 expect(r.right, `${context}: right rim`).toBeLessThanOrEqual(668.1);
}
describe('orbiting a bounded round charge keeps its whole rim in the plot', () => {
 it('ring, disk and both potentials keep their near edge at high camera angles, with either charge sign', async () => {
  for (const width of [1440, 390]) {
   await page.viewport(width, 900);
   for (const id of ['ring', 'disk', 'v-ring', 'v-disk'] as const) for (const charge of [-2, 2]) {
    const view = mount(id, 4, charge), svg = view.container.querySelector('.cd-svg')!;
    for (let k = 0; k < 9; k++) fireEvent.keyDown(svg, {key: 'ArrowUp'});
    expectRimInside(view.container, 2, `${id}, ${width}, Q=${charge}`);
    cleanup();
   }
  }
 }, 60000);
 it('zoom stops before the rim leaves the plot, including the largest ring and disk', async () => {
  for (const id of ['ring', 'disk'] as const) for (const size of [1, 4, 8]) {
   const view = mount(id, size), svg = view.container.querySelector('.cd-svg')!;
   for (let k = 0; k < 9; k++) fireEvent.keyDown(svg, {key: 'ArrowUp'});
   const zoom = view.getByRole('button', {name: 'Zoom in'});
   for (let k = 0; k < 14 && !zoom.hasAttribute('disabled'); k++) fireEvent.click(zoom);
   expect(zoom.hasAttribute('disabled'), 'zoom reaches a finite ceiling').toBe(true);
   expectRimInside(view.container, size / 2, `${id}, size=${size}`);
   cleanup();
  }
 }, 60000);
});
