import {cleanup, render} from '@testing-library/react';
import {page, userEvent} from 'vitest/browser';
import {afterEach, describe, expect, it} from 'vitest';
import '../app/globals.css';
import {Assessment} from '../src/components/Assessment';
import {Onboarding} from '../src/components/Onboarding';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {artifactHtml, lessonArtifact} from '../src/state/artifact';
afterEach(cleanup);
/* WAVE 3, FIRST PASS · CONTENT, AS DRAWN.
 *
 * A negative source's field at P points at the source, and in twelve of thirty limit thumbnails P's
 * arrow ran onto or straight across the charge: through the rod on the bisector and the infinite line,
 * onto the rod level with an end, through the ring, the disk and the sheet, over the arc -- and, at one
 * piece, over the lone point charge the half ring is built from. And on the handout every square root
 * ended in a blank 0.42em in Chromium, "(√(R² + z²)  − z)", while WebKit set it tight. */

/** The points of a path written as M/L pairs, as the arrow's shaft and head are. */
const points = (d: string) => {
  const n = [...d.matchAll(/-?[\d.]+/g)].map(m => Number(m[0]));
  return Array.from({length: n.length / 2}, (_, i) => [n[2 * i], n[2 * i + 1]] as const);
};
/** Every point of the arrow, a quarter unit apart, that lies on a drawn charge: in a charge-coloured
 * stroke, or inside a charge-filled shape. */
function onTheCharge(svg: SVGSVGElement): string[] {
  const arrow = svg.querySelector('.limit-arrow');
  if (!arrow) return [];
  const sources = [...svg.querySelectorAll<SVGGeometryElement>('path, ellipse, rect, circle')]
    .filter(el => !el.closest('.limit-arrow') && /var\(--charge\)/.test(`${el.getAttribute('stroke')} ${el.getAttribute('fill')}`));
  const hits: string[] = [];
  for (const path of arrow.querySelectorAll('path')) {
    const ps = points(path.getAttribute('d')!);
    for (let i = 1; i < ps.length; i++) {
      const [x0, y0] = ps[i - 1], [x1, y1] = ps[i], steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
      for (let k = 0; k <= steps; k++) {
        const pt = new DOMPoint(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps);
        for (const el of sources) {
          const filled = /var\(--charge\)/.test(el.getAttribute('fill') ?? '');
          if (el.isPointInStroke(pt) || (filled && el.isPointInFill(pt))) hits.push(`${el.tagName} at (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
        }
      }
    }
  }
  return hits;
}

describe('P’s arrow never runs onto the charge that makes it', () => {
  it('in every lesson’s every limit, for either sign, at both ends of the sweep and in between', async () => {
    let drawn = 0, negative = 0;
    for (const problem of [...PROBLEMS, getProblem('infinite', 'limit')]) for (const limit of problem.limits) for (const charge of [-2, 2]) {
      const {container, getByRole, unmount} = render(<div style={{width: 560}}><Assessment problem={problem} params={{...DEFAULT_PARAMS, charge}} limit={limit} /></div>);
      const slider = getByRole('slider', {name: 'Explore limiting case'});
      // The default position, s = 4, then both ends.
      for (const key of ['', '{Home}', '{End}']) {
        if (key) { slider.focus(); await userEvent.keyboard(key); }
        const svg = container.querySelector<SVGSVGElement>('.limit-mini svg')!;
        expect(onTheCharge(svg), `${problem.id}/${limit.id} q=${charge} ${key || 'default'}`).toEqual([]);
        if (svg.querySelector('.limit-arrow')) { drawn++; if (charge < 0) negative++; }
      }
      unmount();
    }
    // Stopping short is not leaving out: most negative arrows are still drawn.
    expect(drawn).toBeGreaterThan(100);
    expect(negative).toBeGreaterThan(40);
  }, 60000);
  it('a negative arc’s arrow is drawn at its centre, short of the arc, and clear of the lone piece', async () => {
    const arc = getProblem('arc');
    for (const limit of arc.limits) {
      const {container, getByRole, unmount} = render(<div style={{width: 560}}><Assessment problem={arc} params={{...DEFAULT_PARAMS, charge: -2}} limit={limit} /></div>);
      if (limit.mode === 'half') { const slider = getByRole('slider', {name: 'Explore limiting case'}); slider.focus(); await userEvent.keyboard('{Home}'); }
      const svg = container.querySelector<SVGSVGElement>('.limit-mini svg')!;
      expect(svg.querySelector('.limit-arrow'), limit.id).not.toBeNull();
      // Toward +x, at the arc, as a negative arc's field at its centre points.
      expect(Number(svg.querySelector('.limit-arrow')!.getAttribute('data-dx')), limit.id).toBeGreaterThan(.99);
      if (limit.mode === 'half') expect(svg.querySelectorAll('circle[fill="var(--charge)"]').length).toBe(1);
      unmount();
    }
  });
});

describe('the handout’s square roots end where their contents end', () => {
  it('in Chromium’s MathML, every msqrt’s right edge is within a pixel of its contents’', async () => {
    for (const id of ['v-disk', 'v-rod-bisector', 'endpoint', 'semi', 'bisector']) {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width:800px;height:2400px;border:0';
      document.body.appendChild(frame);
      frame.srcdoc = artifactHtml(lessonArtifact(getProblem(id)));
      await new Promise(r => frame.addEventListener('load', r, {once: true}));
      const doc = frame.contentDocument!;
      await doc.fonts.ready;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const roots = [...doc.querySelectorAll('msqrt')];
      expect(roots.length, id).toBeGreaterThan(0);
      for (const root of roots) {
        const at = `${id}: √(${root.textContent})`, right = Math.max(...[...root.children].map(c => c.getBoundingClientRect().right));
        // The room the root takes in its row: its box, less the margin that pulls what follows back in.
        const room = root.getBoundingClientRect().right + parseFloat(getComputedStyle(root).marginInlineEnd || '0');
        expect(Math.abs(room - right), at).toBeLessThan(1);
        // And what follows sits there: an ordinary symbol against the bar's end, an operator its own space off.
        const next = root.nextElementSibling;
        if (next && next.getBoundingClientRect().width > 0) {
          const gap = next.getBoundingClientRect().left - right, size = parseFloat(getComputedStyle(root).fontSize);
          expect(gap, `${at} then ${next.textContent}`).toBeLessThan(next.tagName.toLowerCase() === 'mo' ? .3 * size : 1);
        }
      }
      frame.remove();
    }
  }, 30000);
});

describe('the tour’s way on is always in view', () => {
  it('on a phone held sideways, a Chromebook and a phone held upright, Continue sits inside the dialog on every page', async () => {
    try {
      for (const [w, h] of [[844, 390], [1366, 657], [390, 844]] as const) {
        await page.viewport(w, h);
        const view = render(<Onboarding open onClose={() => {}} />);
        await new Promise(r => setTimeout(r, 200));
        for (const n of [1, 2, 3, 4]) {
          (view.baseElement.querySelector(`[aria-label="Introduction page ${n}"]`) as HTMLElement).click();
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const dialog = view.baseElement.querySelector<HTMLElement>('.fb-onboarding')!.getBoundingClientRect();
          const next = [...view.baseElement.querySelectorAll('button')].find(b => /Continue|Start exploring/.test(b.textContent ?? ''))!.getBoundingClientRect();
          expect(next.bottom, `${w}x${h} page ${n}`).toBeLessThanOrEqual(dialog.bottom);
          expect(next.top, `${w}x${h} page ${n}`).toBeGreaterThanOrEqual(dialog.top);
        }
        view.unmount();
      }
    } finally { await page.viewport(414, 896); }
  });
  it('its titles break in balance, and “electric-field” is never split at its hyphen', async () => {
    const view = render(<Onboarding open onClose={() => {}} />);
    const title = view.baseElement.querySelector<HTMLElement>('.ob-title')!;
    expect(getComputedStyle(title).textWrap || getComputedStyle(title).getPropertyValue('text-wrap-style')).toMatch(/balance/);
    (view.baseElement.querySelector('[aria-label="Introduction page 4"]') as HTMLElement).click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    expect(view.baseElement.querySelector('.ob-title')!.textContent).toBe('Add the electric\u2011field contributions.');
  });
});
