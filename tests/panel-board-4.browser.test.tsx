import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
// The page's own styles: a size, a leading and a fit are what these measure.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import '../src/components/workbench.css';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {MathText} from '../src/components/Math';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type ProblemId} from '../src/problems/types';
import {ARC_UNFOLD, AXIAL_UNFOLD, DISK_UNFOLD, ENDPOINT_UNFOLD, INFINITE_UNFOLD, SEMI_UNFOLD} from '../src/workbench/derivation';
/* THE PANEL AROUND THE BOARD, ROUND FOUR.
 *
 * Each was a critic's finding on the real page: an exact sum's answer credited to an integral the card
 * had just said it did not need; "signed field component" under every answer; the interval set with
 * thick spaces and no variable, under a board that writes "y: −L/2 → L/2"; Unfold's lines a size above
 * the board line they continue, at a looser leading; and the run's line under the figure printing P, ΔE
 * and k in the page's upright sans beside the figure's italic P and the board's KaTeX one. */
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
beforeAll(async () => {
  const still = document.createElement('style');
  still.textContent = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
  document.head.appendChild(still);
  await document.fonts.ready;
});
const panel = (id: ProblemId, width = 360) => render(<div style={{width}}><EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS}
  onModeChange={vi.fn()} boundRange={[0, 100]} onBoundRangeChange={vi.fn()} /></div>);
const px = (el: Element | null) => parseFloat(getComputedStyle(el!).fontSize);

describe('the answer says where it came from', () => {
  it('an exact sum’s answer is the sum’s, which the integral agrees with; every other is the integral’s', () => {
    for (const id of ['ring', 'v-ring', 'v-arc'] as const) {
      const lead = panel(id).container.querySelector('.ew-result-lead')!.textContent!;
      expect(lead, id).not.toMatch(/Doing the integral/);
      expect(lead, id).toMatch(/^Adding up the pieces gives this, exactly, however many there are; the integral above agrees\./);
      expect(lead, id).toMatch(/Show every step/);
      cleanup();
    }
    expect(panel('bisector').container.querySelector('.ew-result-lead')!.textContent).toMatch(/^Doing the integral gives this\./);
  });
  it('what the sign means, in words, under every answer', () => {
    for (const id of ['bisector', 'endpoint', 'ring', 'sheet', 'v-disk'] as const) {
      const notes = [...panel(id).container.querySelectorAll('.ew-result > p:not(.ew-result-lead):not(.ew-result-k)')].map(p => p.textContent).join(' ');
      expect(notes, id).not.toMatch(/Signed/);
      expect(notes, id).toMatch(/can come out negative/);
      if (id === 'endpoint') expect(notes).toMatch(/reverses both/);
      cleanup();
    }
  });
  it('the interval is set as the board sets its range: the variable, a colon, a plain arrow', () => {
    const label = panel('bisector').container.querySelector('.ew-bounds .ew-disclosure annotation')!.textContent!;
    expect(label).toBe(String.raw`y\colon{-L/2}\to{L/2}`);
  });
});

describe('the shelf continues the board', () => {
  it('Unfold’s lines are never larger than the board’s, and its sentences at the board’s leading', async () => {
    for (const width of [300, 360]) {
      const view = panel('bisector', width);
      fireEvent.click(view.getByRole('button', {name: 'Show every step'}));
      await document.fonts.ready;
      const board = px(view.container.querySelector('.db-step[data-step="limit"] .db-tex .katex'));
      const worked = view.container.querySelectorAll('.ew-worked-step > div > .math .katex');
      expect(worked.length).toBeGreaterThan(3);
      for (const k of worked) expect(px(k), `at ${width}px`).toBeLessThanOrEqual(board + .01);
      const p = view.container.querySelector('.ew-worked-step p')!;
      expect(parseFloat(getComputedStyle(p).lineHeight) / px(p)).toBeCloseTo(1.5, 2);
      cleanup();
    }
  });
  it('every worked step the panel writes fits 272px', async () => {
    const all = {ENDPOINT_UNFOLD, INFINITE_UNFOLD, SEMI_UNFOLD, DISK_UNFOLD, ARC_UNFOLD, AXIAL_UNFOLD};
    const view = render(<div className="ew-worked-body" style={{width: 272}}>{Object.entries(all).flatMap(([name, steps]) => steps.map((l, i) =>
      <div className="ew-worked-step" key={`${name}-${i}`} data-where={`${name} ${i + 1}`}><div><MathText tex={l.tex} block /></div></div>))}</div>);
    await document.fonts.ready;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const bad: string[] = [];
    for (const step of view.container.querySelectorAll<HTMLElement>('.ew-worked-step')) {
      const math = step.querySelector<HTMLElement>('.math')!;
      if (math.scrollWidth > math.clientWidth + 1) bad.push(`${step.dataset.where}: ${math.scrollWidth}px in ${math.clientWidth}px`);
    }
    expect(bad).toEqual([]);
  }, 30000);
  it('each lesson’s Unfold opens on the board’s last line and goes on into the lesson’s own steps', () => {
    for (const [id, first, later] of [
      ['semi', /Take .* outside and put back/, /Combine the perpendicular components/],
      ['disk', /is the same for every ring/, /At the lower bound/],
      ['arc', /is the same for every piece, so it comes outside the integral/, /Using the total charge/],
      ['axial', /is the same for every piece, so it comes outside the integral/, /The nearer parts contribute more strongly/],
    ] as const) {
      const view = panel(id);
      fireEvent.click(view.getByRole('button', {name: 'Show every step'}));
      const steps = [...view.container.querySelectorAll('.ew-worked-step')].map(s => s.textContent!);
      expect(steps[0], id).toMatch(first);
      expect(steps.join(' '), id).toMatch(later);
      cleanup();
    }
  });
});

describe('the run’s line sets its symbols as the board does', () => {
  it('P in the transport is KaTeX’s italic P, not the page’s sans', async () => {
    await new Promise(r => setTimeout(r, 280));
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const view = render(<Explorer />);
    await view.findByRole('button', {name: 'Watch it build'});
    await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem('bisector').title));
    fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
    fireEvent.click(view.getByRole('button', {name: 'Pause'}));
    for (const n of [1, 2]) {
      fireEvent.click(view.getByRole('button', {name: new RegExp(`^Stage ${n}: `)}));
      const line = await waitFor(() => view.container.querySelector<HTMLElement>('.bp-line')!);
      expect([...line.querySelectorAll('.katex-mathml annotation')].map(a => a.textContent), `stage ${n}`).toContain('P');
      // The words around it carry no bare P.
      const words = [...line.childNodes].filter(n => n.nodeType === Node.TEXT_NODE || (n as Element).tagName === 'STRONG').map(n => n.textContent).join(' ');
      expect(words, `stage ${n}`).not.toMatch(/(^|\s)P(\s|[.,:]|$)/);
    }
  }, 30000);
});
