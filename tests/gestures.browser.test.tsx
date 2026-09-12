import {cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem, PROBLEMS} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';

afterEach(cleanup);
/* Holding the figure to the promises it makes.
 *
 * The figure draws a legend into its own top right corner: a mouse being dragged, a wheel
 * being scrolled, four arrow key caps. Those three pictures are promises, and the arrow-key
 * one was false for as long as it had been drawn -- focus never reached the figure, so every
 * press went to the page instead.
 *
 * It survived because of WHERE the tests looked. `ChargeDiagram` takes a `compact` prop that
 * collapses its controls disclosure, the Explorer passes it on every page a reader ever sees, and until
 * this bug not one test had ever set it. The whole shipped configuration was unexercised.
 *
 * So: mount it the way the Explorer does, read the promises off the rendered legend, and
 * check each one. Adding a row to that legend without implementing the gesture fails here. */
function mount(id: ProblemId, over: Partial<Params> = {}) {
  const setParams = vi.fn();
  const view = render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS, ...over}} setParams={setParams}
    count={5} continuum={0} selected={2} onSelect={vi.fn()} progress={1} components={false} pair={false}
    mode="divide" boundRange={[0, 100]} onBoundRangeChange={vi.fn()} compact />);
  const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
  const reset = view.getByRole('button', {name: 'Reset view'}) as HTMLButtonElement;
  // The charge plane's matrix is built from yaw, pitch and the zoom together, and a drag
  // writes it straight to the attribute, so it witnesses every gesture the moment it happens.
  // Two witnesses that look obvious are not: P does not move under a left/right turn on this
  // lesson, because it sits on the very axis yaw turns about; and the Reset button only
  // settles once the 450ms glide it starts has finished.
  const facing = () => view.container.querySelector('.cd-orbit-plane')!.getAttribute('transform')!;
  return {view, svg, reset, facing, setParams};
}
const drag = (el: Element, from: [number, number], to: [number, number]) => {
  fireEvent.pointerDown(el, {clientX: from[0], clientY: from[1], pointerId: 1, buttons: 1});
  fireEvent.pointerMove(el, {clientX: to[0], clientY: to[1], pointerId: 1, buttons: 1});
  fireEvent.pointerUp(el, {clientX: to[0], clientY: to[1], pointerId: 1});
};

describe('the gestures the figure advertises', () => {
  it('advertises exactly the three this file checks', () => {
    const {view} = mount('ring');
    const promises = [...view.container.querySelectorAll('.cd-help-text')].map(t => t.textContent!.trim());
    // If you add a row to the legend, add a check below and then add it here. A promise drawn
    // into the picture and never tested is how the arrow keys came to be broken for so long.
    expect(promises).toEqual(['drag to turn', 'scroll to zoom', 'arrow keys']);
  });
  it('drag to turn', () => {
    const {svg, reset, facing} = mount('ring');
    const square = facing();
    expect(reset.disabled).toBe(true);
    drag(svg, [300, 200], [380, 240]);
    expect(facing(), 'dragging the figure did not move the camera').not.toBe(square);
  });
  it('scroll to zoom, without also scrolling the page', () => {
    const {svg, reset, facing} = mount('ring');
    const square = facing();
    // The listener is attached by hand with {passive:false}, because React's delegated wheel
    // handler is passive and cannot preventDefault -- which is the whole point here. A reader
    // zooming the figure must not have the page slide out from under them at the same time.
    // fireEvent returns false when the handler called preventDefault, and flushes the state
    // update that follows; a bare dispatchEvent leaves React's render for some later tick.
    const notCancelled = fireEvent.wheel(svg, {deltaY: -240});
    expect(notCancelled, 'the page would scroll as well as the figure zooming').toBe(false);
    expect(reset.disabled, 'the wheel did not zoom').toBe(false);
    expect(facing(), 'the wheel did not zoom').not.toBe(square);
  });
  it('arrow keys, from wherever a reader last touched the figure', async () => {
    const {svg, reset} = mount('ring');
    fireEvent.pointerDown(svg, {clientX: 60, clientY: 60, pointerId: 1});
    fireEvent.pointerUp(svg, {pointerId: 1});
    expect(document.activeElement, 'touching the figure left focus on the body').toBe(svg);
    fireEvent.keyDown(svg, {key: 'ArrowRight'});
    expect(reset.disabled).toBe(false);
    fireEvent.keyDown(svg, {key: 'Home'});
    expect(reset.disabled).toBe(true);
  });
  it('zooms from the keyboard too, which the pad tooltips promise', () => {
    const {svg, reset, facing} = mount('ring');
    const square = facing();
    fireEvent.pointerDown(svg, {clientX: 60, clientY: 60, pointerId: 1});
    fireEvent.pointerUp(svg, {pointerId: 1});
    fireEvent.keyDown(svg, {key: '='});
    expect(reset.disabled).toBe(false);
    const closer = facing();
    expect(closer).not.toBe(square);
    fireEvent.keyDown(svg, {key: '-'});
    expect(facing()).not.toBe(closer);
  });
  it('arrow keys reach the view from the pad as well, which its tooltips promise', () => {
    // Every turn key on the pad is captioned with the arrow key that does the same thing. A
    // reader who presses one button and then reaches for an arrow should get what the caption
    // said, not a scrolled page. `role="group"` carries no roving-focus convention -- that is
    // toolbars and tablists -- so nothing is taken from anyone driving this by screen reader.
    const {view, facing} = mount('ring');
    const button = view.getByRole('button', {name: 'Turn left'}) as HTMLButtonElement;
    button.focus();
    expect(document.activeElement).toBe(button);
    const before = facing();
    fireEvent.keyDown(button, {key: 'ArrowUp'});
    expect(facing(), 'the arrow key did not reach the view from the pad').not.toBe(before);
  });
  it('leaves the sliders their own arrow keys', () => {
    // The controls drawer steps its sliders with arrows. Turning the camera instead would be
    // a worse bug than the one this all started with.
    const {view, facing} = mount('ring');
    const details = view.container.querySelector('details.cd-controls')!;
    details.setAttribute('open', '');
    const slider = view.container.querySelector<HTMLInputElement>('input[type="range"]')!;
    slider.focus();
    const before = facing();
    const notCancelled = fireEvent.keyDown(slider, {key: 'ArrowRight'});
    expect(notCancelled, 'the camera swallowed the slider key').toBe(true);
    expect(facing(), 'an arrow on a slider turned the camera').toBe(before);
  });
  it('every button on the pad does what its label says', () => {
    const {view, facing} = mount('ring');
    // Not reset between presses: Reset starts a glide rather than landing, so the next press
    // would be measured against a camera still on its way home.
    let before = facing();
    for (const label of ['Turn left', 'Tilt up', 'Tilt down', 'Turn right', 'Zoom in', 'Zoom out']) {
      const button = view.getByRole('button', {name: label}) as HTMLButtonElement;
      expect(button.disabled, `${label} was disabled`).toBe(false);
      fireEvent.click(button);
      const after = facing();
      expect(after, `${label} changed nothing`).not.toBe(before);
      before = after;
    }
  });
  it('drag P to move it, which the hint beside the figure promises', () => {
    const {view, setParams} = mount('bisector', {distance: 3});
    const point = view.container.querySelector<SVGGElement>('.cd-observation')!;
    drag(point, [300, 200], [300, 260]);
    expect(setParams, 'dragging P reported no new distance').toHaveBeenCalled();
  });
  it('keeps P in the picture all the way to full zoom, on every lesson', () => {
    // Zooming used to scale the drawing about each geometry's own origin, which is wherever
    // that geometry's labels wanted it and not the middle of anything. The further a feature
    // sat from that origin the faster zoom threw it out of the frame, and P sits further from
    // it than anything else. On the ring at full zoom P was forty pixels ABOVE the top edge,
    // its halo cut in half by the frame -- zooming in hid the one point the figure is about.
    const lost: string[] = [];
    for (const id of PROBLEMS.map(x => x.id)) {
      const {view} = mount(id);
      const svg = view.container.querySelector<SVGSVGElement>('.cd-svg')!;
      const zoomIn = view.getByRole('button', {name: 'Zoom in'}) as HTMLButtonElement;
      for (let i = 0; i < 40 && !zoomIn.disabled; i++) fireEvent.click(zoomIn);
      expect(zoomIn.disabled, `${id} never reached full zoom`).toBe(true);
      const frame = svg.getBoundingClientRect();
      const halo = view.container.querySelector('.cd-point-halo')!.getBoundingClientRect();
      // The whole halo, not merely the dot: half a mark hanging off the edge is what this
      // looked like when it was wrong.
      if (halo.top < frame.top || halo.bottom > frame.bottom || halo.left < frame.left || halo.right > frame.right)
        lost.push(`${id}: P at ${Math.round(halo.x - frame.x)},${Math.round(halo.y - frame.y)} in ${Math.round(frame.width)}x${Math.round(frame.height)}`);
      cleanup();
    }
    expect(lost, `${lost.length} lessons lose P when zoomed in`).toEqual([]);
  });
  it('says the same things to a screen reader, which cannot see the legend', () => {
    const {svg} = mount('ring');
    const spoken = svg.getAttribute('aria-label')!;
    for (const promise of ['arrow keys', 'zoom', 'Drag']) expect(spoken, promise).toContain(promise);
    // The legend itself is decorative: it repeats in pictures what the label says in words.
    expect(svg.querySelector('.cd-help')!.getAttribute('aria-hidden')).toBe('true');
  });
});
