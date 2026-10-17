import {cleanup, fireEvent, render, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import Site, {newVisit} from '../src/home/Site';
import {FieldPlot} from '../src/gauss/FieldPlot';
import {QencInstrument} from '../src/gauss/QencInstrument';
import {FieldProfile} from '../src/gauss/FieldProfile';
import {gaussLesson} from '../src/gauss';
import {fieldOf} from '../src/gauss/instruments';

beforeEach(() => {
  newVisit();
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
});
afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); });
const kase = (id: string, key: string) => gaussLesson(id)!.cases.find(c => c.key === key)!;
const curveYs = (path: Element) => [...path.getAttribute('d')!.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => Number(m[2]));

describe('signed Gauss instrument displays', () => {
  it('the page sign reverses both shell curves and the signed area, preserving the enclosed fraction', async () => {
    history.replaceState(null, '', '/?g=qenc');
    const view = render(<Site />);
    await view.findByRole('heading', {level: 1});
    const tool = view.container.querySelector<HTMLElement>('.gs-qenc')!;
    for (const profile of ['Uniform', 'Rising with r', 'Falling to zero']) {
      fireEvent.click(within(tool).getByRole('button', {name: profile}));
      fireEvent.click(view.getByRole('button', {name: 'Positive'}));
      const fraction = tool.querySelector('.gs-share-fill')!.getAttribute('width');
      const positiveBase = Number(tool.querySelector('.gs-baseline')!.getAttribute('y1'));
      const positive = ['.is-rho', '.is-dq', '.gs-fill'].map(selector => curveYs(tool.querySelector(selector)!));
      fireEvent.click(view.getByRole('button', {name: 'Negative'}));
      const negativeBase = Number(tool.querySelector('.gs-baseline')!.getAttribute('y1'));
      for (const [index, selector] of ['.is-rho', '.is-dq', '.gs-fill'].entries()) {
        const negative = curveYs(tool.querySelector(selector)!);
        expect(negative.some(y => y > negativeBase + 1)).toBe(true);
        for (const [j, y] of negative.entries()) expect(Math.abs(y - negativeBase - (positiveBase - positive[index][j]))).toBeLessThan(.11);
      }
      expect(tool.querySelector('.gs-share-fill')!.getAttribute('width')).toBe(fraction);
      expect(tool.querySelector('svg')!.getAttribute('aria-label')).toContain('negative');
      fireEvent.click(within(tool).getByRole('button', {name: /the mistake/}));
      expect(curveYs(tool.querySelector('.gs-fill')!).some(y => y > negativeBase + 1)).toBe(true);
      expect(tool.querySelector('.gs-share')).toBeNull();
      expect(tool.querySelector('svg')!.getAttribute('aria-label')).not.toContain('bar shows');
      expect(tool.querySelector('.gs-readout p')!.textContent).not.toContain('bar shows');
      fireEvent.click(within(tool).getByRole('button', {name: 'ρ · 4πr′² dr′'}));
    }
  }, 20000);

  it('keeps the total-charge label inside the SVG and clear of its bar at the largest phone symbol size', () => {
    const view = render(<QencInstrument sign={-1} />);
    const total = view.container.querySelector<SVGTextElement>('.gs-share-name:last-child')!;
    // The UI enlarges mathematical symbols up to 2.2 times their base size on a narrow drawing.
    // Exercise that real maximum in the otherwise unstyled browser suite as well.
    total.style.fontSize = `${17.5 * 2.2}px`;
    total.style.fontFamily = 'Georgia, serif';
    const box = total.getBBox();
    const bar = view.container.querySelector<SVGRectElement>('.gs-share-track')!.getBBox();
    expect(box.x + box.width).toBeLessThanOrEqual(640);
    expect(box.x).toBeGreaterThan(bar.x + bar.width + 8);
  });

  for (const sign of [1, -1] as const) {
    it(`marks an off-scale point field honestly for sign ${sign}`, () => {
      const point = kase('spheres', 'point');
      const view = render(<FieldPlot kase={point} size={.55} sign={sign} />);
      // r/R = .5 gives |E| = four times k|Q|/R², beyond this fixed scale.
      expect(Math.abs(fieldOf('point', .5, sign))).toBe(4);
      expect(view.container.querySelector('circle.gs-here')).toBeNull();
      expect(view.container.querySelector('.gs-offscale-marker')).not.toBeNull();
      expect(view.getByRole('img').getAttribute('aria-label')).toContain('beyond the plot');
      expect(view.container.querySelector('.gs-readout p')!.textContent).toContain('beyond the plot');
      view.rerender(<FieldPlot kase={point} size={1.65} sign={sign} />);
      const circle = view.container.querySelector('circle.gs-here')!;
      expect(circle).not.toBeNull();
      expect(Number(circle.getAttribute('cy'))).toBeCloseTo((sign > 0 ? 250 : 58) - 150 * fieldOf('point', 1.5, sign), 8);
      expect(view.container.querySelector('.gs-offscale-marker')).toBeNull();
    });
    it(`names the odd slab's coefficient, rather than treating its density as one sign (${sign})`, () => {
      const view = render(<FieldProfile kase={kase('hard', 'odd')} size={.4} sign={sign} />);
      expect(view.getByRole('img').getAttribute('aria-label')).toContain(`${sign > 0 ? 'positive' : 'negative'} ρ₀`);
      expect(view.getByRole('img').getAttribute('aria-label')).toContain('both signs');
    });
  }
  for (const key of ['ball', 'rising']) it(`describes the ${key} field's magnitude when charge is negative`, () => {
    const view = render(<FieldPlot kase={kase('spheres', key)} size={.5} sign={-1} />);
    expect(view.container.querySelector('.gs-readout p')!.textContent).toContain('magnitude');
    expect(view.getByRole('img').getAttribute('aria-label')).not.toContain('density rises');
  });
});
