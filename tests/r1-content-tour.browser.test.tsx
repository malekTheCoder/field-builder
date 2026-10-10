import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {Onboarding} from '../src/components/Onboarding';
afterEach(() => { cleanup(); localStorage.clear(); });
/* THE TOUR'S PICTURES OBEY THE PHYSICS THEY INTRODUCE.
 *
 * The walkthrough's "add the contributions" page is the first picture of a field a student sees.
 * Its twelve positive pieces make a rod to the left of P, spanning P's level, so every contribution
 * points away from its piece -- down and right from the upper ones, up and right from the lower ones --
 * and their sum is the resultant of those. It was once drawn along +x with the small contributions
 * climbing upward from pieces that all sat above P: a picture of a field pointing at nothing. */
// The dialog's overlay swallows synthetic clicks; the handler under test is the button's own.
const press = async (button: Element) => { (button as HTMLElement).click(); await new Promise(r => setTimeout(r, 0)); };
const page = async (n: number) => {
  const view = render(<Onboarding open onClose={() => {}} />);
  await press(view.baseElement.querySelector(`[aria-label="Introduction page ${n}"]`)!);
  return view;
};
const P = {x: 215, y: 112};
describe('the walkthrough', () => {
  it('draws the vector sum where Coulomb’s law puts it: the resultant of the pieces added so far', async () => {
    const {baseElement} = await page(4);
    const sum = baseElement.querySelector('path.ob-sum');
    expect(sum, 'the sum arrow').not.toBeNull();
    const m = /^M([\d.]+) ([\d.]+)l(-?[\d.]+) (-?[\d.]+)$/.exec(sum!.getAttribute('d')!);
    expect(m, sum!.getAttribute('d')!).not.toBeNull();
    const [x0, y0, dx, dy] = m!.slice(1).map(Number);
    expect([x0, y0]).toEqual([P.x, P.y]);
    // The pieces are all to the left of P, so the field at P points right.
    expect(dx).toBeGreaterThan(0);
    // Its direction is the resultant of q(P − piece)/|P − piece|³ over the pieces drawn as added.
    const added = [...baseElement.querySelectorAll<SVGGElement>('g.ob-piece.is-added')];
    expect(added.length).toBeGreaterThan(0);
    const r = added.reduce((s, g) => {
      const ex = P.x - Number(g.dataset.x), ey = P.y - Number(g.dataset.y), d3 = Math.hypot(ex, ey) ** 3;
      return {x: s.x + ex / d3, y: s.y + ey / d3};
    }, {x: 0, y: 0});
    const off = Math.abs(Math.atan2(dy, dx) - Math.atan2(r.y, r.x)) * 180 / Math.PI;
    expect(off, `the arrow is ${off.toFixed(2)}° off the resultant`).toBeLessThan(2);
    // And the pieces really are where the drawing puts them: to the left of P, above and below its level.
    for (const g of added) expect(Number(g.dataset.x)).toBeLessThan(P.x);
    expect(added.some(g => Number(g.dataset.y) < P.y) && added.some(g => Number(g.dataset.y) > P.y)).toBe(true);
  });
  it('lays the small contributions head to tail, each heading away from its piece', async () => {
    const {baseElement} = await page(4);
    const pieces = baseElement.querySelectorAll<SVGGElement>('g.ob-piece');
    expect(pieces.length, 'twelve pieces, each with its contribution').toBe(12);
    let tail: number[] | null = null;
    for (const g of pieces) {
      const step = g.querySelector('path.ob-step')!.getAttribute('d')!;
      const [, x1, y1, x2, y2] = /^M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)$/.exec(step)!.map(Number);
      // Along P − piece: away from the piece, whichever side of P's level it sits.
      const away = Math.atan2(P.y - Number(g.dataset.y), P.x - Number(g.dataset.x)), drawn = Math.atan2(y2 - y1, x2 - x1);
      expect(Math.abs(drawn - away) * 180 / Math.PI, step).toBeLessThan(1);
      expect(x2, step).toBeGreaterThan(x1);
      // Each one starts where the last one ended.
      if (tail) expect([x1, y1], step).toEqual(tail);
      tail = [x2, y2];
    }
  });
  it('names the count of pieces with a symbol, not a numeral', async () => {
    const {baseElement} = await page(3);
    for (const label of baseElement.querySelectorAll('.ob-visual text')) expect(label.textContent, label.textContent ?? '').not.toMatch(/[0-9]/);
    expect(baseElement.querySelector('.ob-visual')!.textContent).toMatch(/N\s*PIECES/);
  });
  it('promises only what a field lesson shows, and ends by pointing at the run', async () => {
    const first = await page(1);
    expect(first.baseElement.querySelector('.ob-description')!.textContent).not.toMatch(/potential/);
    cleanup();
    const last = await page(4);
    expect(last.baseElement.querySelector('.ob-description')!.textContent).toMatch(/Watch it build/);
    expect(last.baseElement.querySelector('.ob-description')!.textContent).not.toMatch(/\bpush/i);
  });
});
