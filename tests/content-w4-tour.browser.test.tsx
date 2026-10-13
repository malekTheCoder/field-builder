import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import {Onboarding} from '../src/components/Onboarding';
/* THE WALKTHROUGH ADDS AS THE LESSONS ADD.
 *
 * Its "Add the electric-field contributions" page laid twelve contributions head to tail out of P, a
 * chain that dipped and came back, and said that Watch it build plays this argument -- while the run's
 * Add them up, on every symmetric lesson, adds the pieces in mirror pairs, the sum an arrow along the
 * axis with a tick per pair. The owner took the tip-to-tail arc out of the run because it confused
 * readers; the first picture of adding a student met was still that arc. The page now adds in mirror
 * pairs, from the middle out, the sum along the axis at every step. */
afterEach(cleanup);
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const sumPage = async () => {
  const view = render(<Onboarding open onClose={() => {}} />);
  (view.baseElement.querySelector('[aria-label="Introduction page 4"]') as HTMLElement).click();
  await frame();
  return view;
};
type V = Awaited<ReturnType<typeof sumPage>>;
/** Move the preview slider to `sweep` (0–100) from its start. */
const sweepTo = async (view: V, sweep: number) => {
  view.getByRole('slider', {name: 'Preview accumulated contributions'}).focus();
  await userEvent.keyboard('{Home}');
  for (let k = 0; k < sweep; k++) await userEvent.keyboard('{ArrowRight}');
  await frame();
};
const nums = (d: string) => [...d.matchAll(/-?[\d.]+/g)].map(m => Number(m[0]));
const P = () => {
  const c = document.querySelector('.ob-visual circle[r="6"]')!;
  return {x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))};
};
/** Each piece and the field it makes at P, by Coulomb's law (up to one constant). */
const pieces = (view: V) => [...view.baseElement.querySelectorAll<SVGGElement>('g.ob-piece')].map(g => {
  const x = Number(g.dataset.x), y = Number(g.dataset.y), p = P(), dx = p.x - x, dy = p.y - y, d3 = Math.hypot(dx, dy) ** 3;
  return {g, x, y, ex: dx / d3, ey: dy / d3, added: g.classList.contains('is-added')};
});
const sum = (view: V) => {
  const path = view.baseElement.querySelector('path.ob-sum');
  if (!path) return null;
  const [x, y, dx, dy] = nums(path.getAttribute('d')!);
  return {x, y, dx, dy};
};
// The slider's positions at which one more pair has gone in: the page rounds sweep × 6/100.
const AT = [17, 33, 50, 67, 83, 100];

describe('the tour’s sum page adds in mirror pairs', () => {
  it('each step adds a piece and its mirror, from the middle out, and the sum lies along the axis', async () => {
    const view = await sumPage();
    const p = P();
    let before = 0;
    for (const [k, sweep] of AT.entries()) {
      await sweepTo(view, sweep);
      const all = pieces(view), added = all.filter(q => q.added);
      expect(added.length, `${k + 1} pairs in`).toBe(2 * (k + 1));
      // Every piece in is paired with its mirror across P's level.
      for (const q of added) expect(added.some(o => Math.abs(o.x - q.x) < .01 && Math.abs((o.y - p.y) + (q.y - p.y)) < .2), `piece at ${q.y} has its mirror in`).toBe(true);
      // The pair that went in last is the farthest out: they go in from the middle.
      const out = Math.max(...added.map(q => Math.abs(q.y - p.y)));
      expect(out, `pair ${k + 1} is farther out than the last`).toBeGreaterThan(before);
      before = out;
      const s = sum(view)!;
      expect([s.x, s.y], 'the sum starts at P').toEqual([p.x, p.y]);
      expect(s.dy, 'the sum lies along the axis at every step').toBe(0);
      expect(s.dx).toBeGreaterThan(0);
    }
  }, 60000);
  it('the sum is as long as its pairs’ parts along the axis, at one scale, with a tick where each pair’s share ends', async () => {
    const view = await sumPage();
    const lengths: number[] = [], alongs: number[] = [];
    for (const [k, sweep] of AT.entries()) {
      await sweepTo(view, sweep);
      lengths.push(sum(view)!.dx);
      alongs.push(pieces(view).filter(q => q.added).reduce((t, q) => t + q.ex, 0));
      const ticks = [...view.baseElement.querySelectorAll('path.ob-tick')].map(t => nums(t.getAttribute('d')!)[0]);
      expect(ticks.length, `a tick per pair but the last, at ${k + 1} pairs`).toBe(k);
      // The ticks stand where the sum's head stood before each later pair.
      ticks.forEach((x, j) => expect(x - P().x, `tick ${j + 1}`).toBeCloseTo(lengths[j], 0));
    }
    // One scale: length over the parts along x is the same at every step.
    for (let k = 1; k < lengths.length; k++) expect(lengths[k] / alongs[k] / (lengths[0] / alongs[0]), `${k + 1} pairs`).toBeCloseTo(1, 3);
  }, 60000);
  it('the pair going in: two whole arrows from where the sum stood, mirror images, each away from its piece, closing on the sum’s head', async () => {
    const view = await sumPage();
    for (const sweep of [33, 67, 100]) {
      await sweepTo(view, sweep);
      const arrows = [...view.baseElement.querySelectorAll('path.ob-pair')].map(a => nums(a.getAttribute('d')!));
      expect(arrows.length, 'the pair’s two arrows').toBe(2);
      const [[x0, y0, x1, y1], [u0, v0, u1, v1]] = arrows, s = sum(view)!, ticks = view.baseElement.querySelectorAll('path.ob-tick');
      const from = ticks.length ? nums(ticks[ticks.length - 1].getAttribute('d')!)[0] : s.x;
      // Both leave the same point, on the axis where the sum's head stood before this pair: not one
      // from the other's tip.
      expect([x0, y0]).toEqual([u0, v0]);
      expect(x0).toBeCloseTo(from, 0);
      expect(y0).toBe(P().y);
      // Mirror images: equal parts along the axis, equal and opposite parts across it.
      expect(x1 - x0).toBeCloseTo(u1 - u0, 1);
      expect(y1 - y0).toBeCloseTo(-(v1 - v0), 1);
      expect(Math.abs(y1 - y0), 'their sideways parts are drawn, to cancel').toBeGreaterThan(3);
      // Together they reach the sum's new head: twice one arrow's part along the axis.
      expect(s.x + s.dx - x0).toBeCloseTo(2 * (x1 - x0), 0);
      // Each points away from its own lit piece, along Coulomb's line.
      const lit = view.baseElement.querySelectorAll<SVGGElement>('g.ob-piece[opacity="1"]');
      expect(lit.length).toBe(2);
      for (const [a0, b0, a1, b1] of arrows) {
        const piece = [...lit].find(g => Math.sign(Number(g.dataset.y) - P().y) === -Math.sign(b1 - b0))!;
        const away = Math.atan2(P().y - Number(piece.dataset.y), P().x - Number(piece.dataset.x));
        expect(Math.abs(Math.atan2(b1 - b0, a1 - a0) - away) * 180 / Math.PI).toBeLessThan(1);
      }
      // The rhombus's other two sides close on the sum's head.
      for (const side of view.baseElement.querySelectorAll('path.ob-side')) {
        const [, , hx, hy] = nums(side.getAttribute('d')!);
        expect(hx).toBeCloseTo(s.x + s.dx, 0);
        expect(hy).toBe(P().y);
      }
    }
  }, 60000);
  it('nothing on the page is laid head to tail', async () => {
    const view = await sumPage();
    expect(view.baseElement.querySelectorAll('path.ob-step, circle.ob-joint').length, 'no chain of contributions').toBe(0);
    const words = view.baseElement.querySelector('.ob-description')!.textContent + ' ' + view.baseElement.querySelector('.ob-hint')!.textContent;
    expect(words).not.toMatch(/head to tail|tip to tail/i);
    expect(words).toMatch(/mirror pairs/);
    expect(words).toMatch(/along the axis/);
    expect(view.baseElement.querySelector('.ob-visual')!.textContent).not.toMatch(/SMALL|CONTRIBUTIONS/);
  });
  it('its name sits clear of the sum and the pair going in', async () => {
    const view = await sumPage();
    for (const sweep of [17, 50, 100]) {
      await sweepTo(view, sweep);
      const strokes = [...view.baseElement.querySelectorAll<SVGPathElement>('path.ob-sum, path.ob-tick, path.ob-pair, path.ob-side')];
      for (const label of view.baseElement.querySelectorAll<SVGTextElement>('.ob-visual text.ob-label')) {
        const b = label.getBBox();
        for (let x = b.x; x <= b.x + b.width; x += 2) for (let y = b.y; y <= b.y + b.height; y += 2)
          for (const s of strokes) expect(s.isPointInStroke(new DOMPoint(x, y)), `“${label.textContent}” overlaps a stroke at ${x.toFixed(0)}, ${y.toFixed(0)}`).toBe(false);
      }
    }
  }, 60000);
});
