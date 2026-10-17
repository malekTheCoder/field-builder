import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import '../app/globals.css';
import Site, {newVisit} from '../src/home/Site';
import {gaussLesson} from '../src/gauss';
/* THE CHARGE INSIDE, CALLED OUT: the figure's Q_enc stands beside the Gaussian surface, never on it or on the charge,
 * with a hairline and an arrowhead to the charge; it is the short name (never a long formula, which is the board's),
 * and it is drawn at every angle the reader turns the figure to, not at some and not others. */
const STORE = 'field-builder:explorer:v1';
beforeEach(() => { newVisit(); localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}})); });
afterEach(async () => { cleanup(); localStorage.clear(); window.history.replaceState(null, '', '/'); await page.viewport(1280, 800); });
async function open(id: string) {
  await page.viewport(1280, 800);
  window.history.replaceState(null, '', `/?g=${id}`);
  const view = render(<Site />);
  await view.findByRole('button', {name: 'Watch it build'});
  return view;
}
type R = {x: number; y: number; width: number; height: number};
const nums = (s: string | null) => (s ?? '').split(',').map(Number);
const inside = (p: {x: number; y: number}, r: R) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
const apart = (a: R, b: R) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
const touches = (a: {x: number; y: number}, b: {x: number; y: number}, r: R) => { for (let t = 0; t <= 1; t += .02) if (inside({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t}, r)) return true; return false; };
/** The callout as drawn now, in the figure's own units. */
function callout(where: string) {
  const g = document.querySelectorAll<SVGGElement>('.gs-svg .gs-callout');
  expect(g.length, `${where}: Q_enc is drawn once`).toBe(1);
  const text = g[0].querySelector<SVGTextElement>('text.gs-inside-name')!, b = text.getBBox();
  const line = g[0].querySelector('line')!;
  const [sx, sy, sw, sh] = nums(g[0].getAttribute('data-surface')), [tx, ty] = nums(g[0].getAttribute('data-tip'));
  return {
    text: text.textContent ?? '', label: {x: b.x, y: b.y, width: b.width, height: b.height} as R, surface: {x: sx, y: sy, width: sw, height: sh} as R, tip: {x: tx, y: ty},
    from: {x: +line.getAttribute('x1')!, y: +line.getAttribute('y1')!},
  };
}
async function around(where: string, long: boolean) {
  const svg = document.querySelector<SVGSVGElement>('.gs-svg')!;
  svg.focus();
  for (let step = 0; step < 7; step++) {
    await waitFor(() => expect(document.querySelectorAll('.gs-svg .gs-callout').length).toBe(1));
    const here = `${where}, turn ${step}`, c = callout(here);
    // Short: the name, and at most a short "= …"; the halo's long formula is the board's alone.
    expect(c.text.length, `${here}: ${c.text}`).toBeLessThanOrEqual(12);
    if (long) expect(c.text, here).not.toContain('=');
    // Beside the surface, not on it.
    expect(apart(c.label, c.surface), `${here}: the label stands outside the surface`).toBe(true);
    // The hairline runs from the label to a charge inside the surface, and does not cross P's name.
    expect(inside(c.tip, c.surface), `${here}: the arrowhead is on the charge, inside the surface`).toBe(true);
    const p = document.querySelector<SVGTextElement>('.gs-svg text.gs-p-name');
    if (p) { const b = p.getBBox(); expect(touches(c.from, c.tip, {x: b.x, y: b.y, width: b.width, height: b.height}), `${here}: the leader crosses P's name`).toBe(false); }
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    if (step === 3) await userEvent.keyboard('{ArrowUp}{ArrowUp}');
  }
}
describe('the enclosed charge’s callout', () => {
  it('the halo’s Q_enc is the short name at every angle, never its arctan formula', async () => {
    const view = await open('hard');
    const halo = gaussLesson('hard')!.cases.find(k => k.figure.charge.kind === 'halo')!;
    fireEvent.click(within(view.container.querySelector<HTMLElement>('.gs-choice.is-cases')!).getByRole('button', {name: halo.label}));
    await around('hard, the halo', true);
    expect(document.querySelector('.gs-board')?.textContent).toContain('arctan');
  }, 60000);
  for (const id of ['spheres', 'lines']) {
    it(`${id}: the callout is present, short, beside the surface, at every angle`, async () => {
      await open(id);
      await around(id, false);
    }, 60000);
  }
  it('every case of the hard cases and the sheets is called out, and names no long formula', async () => {
    for (const id of ['hard', 'sheets']) {
      const view = await open(id);
      for (const k of gaussLesson(id)!.cases) {
        fireEvent.click(within(view.container.querySelector<HTMLElement>('.gs-choice.is-cases')!).getByRole('button', {name: k.label}));
        await waitFor(() => expect(document.querySelectorAll('.gs-svg .gs-callout').length).toBe(1));
        const c = callout(`${id}/${k.key}`);
        expect(c.text.length, `${id}/${k.key}: ${c.text}`).toBeLessThanOrEqual(12);
        expect(apart(c.label, c.surface), `${id}/${k.key}`).toBe(true);
      }
      cleanup(); newVisit(); window.history.replaceState(null, '', '/');
    }
  }, 90000);
});
