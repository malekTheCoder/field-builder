import {act, cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import '../app/globals.css';
import Site, {newVisit} from '../src/home/Site';
import {GAUSS} from '../src/explorer/lessons';
/* THE GAUSS LESSONS ON THE PAGE: their addresses, the lesson list's links to them and its "Coming soon" for the
 * rest, the run's five stages, the flux instrument's readout (which moves only when a charge crosses), the
 * keyboard, Reduce Motion, and a phone's width. Each test mounts the whole site at the lesson's address, as a
 * reader arrives, and puts the address back after (a stale ?g= would open the wrong page in the next test). */
const STORE = 'field-builder:explorer:v1';
beforeEach(() => { newVisit(); localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}})); });
afterEach(async () => { cleanup(); localStorage.clear(); window.history.replaceState(null, '', '/'); await page.viewport(1280, 800); });
async function open(id: string, w = 1280, h = 800) {
  await page.viewport(w, h);
  window.history.replaceState(null, '', `/?g=${id}`);
  const view = render(<Site />);
  await view.findByRole('button', {name: 'Watch it build'});
  return view;
}
/** Hand the run its frames: requestAnimationFrame queued, and released a tenth of a second at a time. */
function frames() {
  const real = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
  let queue: FrameRequestCallback[] = [], now = 1000;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => { queue = []; };
  return {
    run: (seconds: number) => act(() => { for (let k = 0; k < seconds * 10 + 1; k++) { const q = queue; queue = []; now += 100; for (const cb of q) cb(now); } }),
    restore: () => { window.requestAnimationFrame = real; window.cancelAnimationFrame = cancel; },
  };
}
const stage = () => document.querySelector<HTMLElement>('.gs-stage');

describe('a Gauss lesson’s address', () => {
  it('opens the lesson it names, and a lesson not ready opens the home page', async () => {
    const view = await open('symmetry');
    expect(view.getByRole('heading', {level: 1}).textContent).toBe('Symmetry first');
    expect(document.title).toContain('Symmetry first');
    cleanup(); newVisit();
    window.history.replaceState(null, '', '/?g=spheres');
    const home = render(<Site />);
    expect(await home.findByRole('heading', {level: 1, name: 'One law, every geometry.'})).toBeTruthy();
  }, 20000);
  it('the list offers the ready lessons as links and the rest as words Tab passes over', async () => {
    const view = await open('flux');
    const list = view.getByRole('navigation', {name: 'Lessons'});
    const heading = within(list).getByRole('heading', {level: 2, name: /^Gauss’s law/});
    const family = heading.closest('.exp-family')!;
    const links = within(family as HTMLElement).getAllByRole('link');
    expect(links.map(a => a.getAttribute('href'))).toEqual(['?g=symmetry', '?g=flux', '?g=lines', '?g=sheets', '?g=conductors']);
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(family.querySelectorAll('.exp-planned-row[aria-disabled=true]').length).toBe(GAUSS.lessons.length - 5);
    for (const row of family.querySelectorAll('.exp-planned-row')) expect(row.querySelector('a,button,[tabindex]')).toBeNull();
    expect(family.textContent).toContain('Coming soon');
    // Following one opens it, title focused.
    fireEvent.click(links[0]);
    await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe('Symmetry first'));
    expect(location.search).toBe('?g=symmetry');
    // And an integral lesson in the same list opens the integral lesson.
    fireEvent.click(within(list).getByRole('link', {name: 'Ring of charge'}));
    await waitFor(() => expect(document.querySelector('h1')?.textContent).not.toBe('Symmetry first'));
    expect(location.search).toBe('?p=ring');
    // Let the integral lesson settle (its address and its save are debounced) before the next test mounts the site.
    await new Promise(r => setTimeout(r, 600));
  }, 20000);
});

describe('Watch it build, the Gauss way', () => {
  it('plays the recipe in five stages, the board writing one line each, and the answer at the end', async () => {
    const f = frames();
    try {
      const view = await open('symmetry');
      fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
      const names = ['Symmetry', 'The surface', 'Left side', 'Right side', 'Solve'];
      await waitFor(() => expect(view.getByRole('button', {name: 'Stage 1: Symmetry'})).toBeTruthy());
      names.forEach((n, i) => expect(view.getByRole('button', {name: `Stage ${i + 1}: ${n}`})).toBeTruthy());
      expect(stage()?.dataset.stage).toBe('symmetry');
      const answer = () => document.querySelector('.gs-board .ew-result');
      expect(answer()?.classList.contains('is-shown')).toBe(false);
      f.run(6);
      expect(stage()?.dataset.stage).toBe('surface');
      f.run(6);
      expect(stage()?.dataset.stage).toBe('left');
      // The left side takes the patches one at a time.
      const sweep = Number(stage()?.dataset.sweep);
      expect(sweep).toBeGreaterThan(0); expect(sweep).toBeLessThan(1);
      f.run(30);
      expect(stage()?.dataset.stage).toBe('solve');
      expect(Number(stage()?.dataset.solve)).toBe(1);
      expect(answer()?.classList.contains('is-shown')).toBe(true);
      expect(view.getByRole('button', {name: 'Play again'})).toBeTruthy();
      // The board's lines are the stages', and each plays its stage on the figure.
      fireEvent.click(view.getByRole('button', {name: 'Right side: play this step on the figure'}));
      expect(stage()?.dataset.stage).toBe('right');
      // Closing puts the figure at rest and the focus back on Watch it build.
      fireEvent.click(view.getByRole('button', {name: 'Close'}));
      f.run(.2);
      expect(stage()?.dataset.stage).toBe('rest');
    } finally { f.restore(); }
  }, 30000);
});

describe('the flux instrument', () => {
  it('names the charges inside, and changes only when one crosses, by keyboard', async () => {
    const view = await open('flux');
    const readout = () => document.querySelector<HTMLElement>('.gs-flux .gs-readout')!.dataset.inside;
    expect(readout()).toBe('q1,q3');
    const q2 = view.getByRole('button', {name: /^q₂, negative, outside/});
    q2.focus();
    const seen: string[] = [readout()!];
    for (let k = 0; k < 24; k++) { await userEvent.keyboard('{ArrowLeft}'); const now = readout()!; if (now !== seen.at(-1)) seen.push(now); }
    expect(seen).toEqual(['q1,q3', 'q1,q2,q3']);
    expect(view.getByRole('button', {name: /^q₂, negative, inside/})).toBeTruthy();
    expect(document.querySelector('.gs-flux .gs-readout .katex')?.textContent).toContain('q2');
  }, 20000);
  it('takes a drag out of the surface, and the flux loses that charge', async () => {
    const view = await open('flux');
    const readout = () => document.querySelector<HTMLElement>('.gs-flux .gs-readout')!.dataset.inside;
    const q1 = view.getByRole('button', {name: /^q₁, positive, inside/});
    const svg = document.querySelector<SVGSVGElement>('.gs-closed-svg')!;
    const at = (x: number, y: number) => { const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!); return {clientX: p.x, clientY: p.y}; };
    fireEvent.pointerDown(q1, {button: 0, pointerId: 1, ...at(284, 142)});
    // Inside, the readout holds still while the charge moves about.
    fireEvent.pointerMove(svg, {pointerId: 1, ...at(296, 150)});
    expect(readout()).toBe('q1,q3');
    fireEvent.pointerMove(svg, {pointerId: 1, ...at(60, 40)});
    fireEvent.pointerUp(svg, {pointerId: 1});
    expect(readout()).toBe('q3');
  }, 20000);
});

describe('the symmetry instrument', () => {
  let real: typeof window.matchMedia;
  beforeEach(() => {
    real = window.matchMedia;
    window.matchMedia = ((q: string) => q.includes('prefers-reduced-motion')
      ? {matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} as unknown as MediaQueryList
      : real.call(window, q)) as typeof window.matchMedia;
  });
  afterEach(() => { window.matchMedia = real; });
  it('under Reduce Motion, steps a flip through its halfway frame and says the leaning field is impossible', async () => {
    const view = await open('symmetry');
    fireEvent.click(view.getByRole('button', {name: 'Line'}));
    fireEvent.click(view.getByRole('button', {name: 'Leaning along the line'}));
    fireEvent.click(view.getByRole('button', {name: 'Mirror square to the line'}));
    const verdict = () => document.querySelector('.gs-verdict')?.textContent ?? '';
    expect(verdict()).toBe('Choose a move.');
    await waitFor(() => expect(verdict()).toContain('impossible'), {timeout: 4000});
    fireEvent.click(view.getByRole('button', {name: 'Straight out or in'}));
    fireEvent.click(view.getByRole('button', {name: 'Mirror square to the line'}));
    await waitFor(() => expect(verdict()).toContain('allows it'), {timeout: 4000});
    // The run beside it is the line's now.
    expect(document.querySelector('.gs-board .ew-problem-text')?.textContent).toContain('infinite straight line');
  }, 20000);
  it('under Reduce Motion, the run steps through every stage rather than landing on the answer', async () => {
    const view = await open('flux');
    fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
    const seen = new Set<string>();
    await waitFor(() => { seen.add(`${stage()?.dataset.stage}:${stage()?.dataset.sweep}`); expect(stage()?.dataset.stage).toBe('left'); }, {timeout: 15000, interval: 40});
    expect([...seen].some(s => s.startsWith('symmetry'))).toBe(true);
    expect([...seen].some(s => s.startsWith('surface'))).toBe(true);
    await waitFor(() => { const s = Number(stage()?.dataset.sweep); seen.add(String(s)); expect(s).toBeGreaterThan(.2); }, {timeout: 8000, interval: 40});
    expect(Number(stage()?.dataset.sweep)).toBeLessThan(1);
  }, 30000);
});

describe('on a phone', () => {
  it('fits 390 pixels with no sideways scroll, on the first two lessons', async () => {
    for (const id of ['symmetry', 'flux']) {
      const view = await open(id, 390, 844);
      await new Promise(r => setTimeout(r, 200));
      expect(document.documentElement.scrollWidth, id).toBeLessThanOrEqual(390);
      view.unmount(); newVisit();
    }
  }, 30000);
  it('fits 390 pixels with no sideways scroll, on Lines, Sheets and Conductors', async () => {
    for (const id of ['lines', 'sheets', 'conductors']) {
      const view = await open(id, 390, 844);
      await new Promise(r => setTimeout(r, 200));
      expect(document.documentElement.scrollWidth, id).toBeLessThanOrEqual(390);
      view.unmount(); newVisit();
    }
  }, 30000);
});

describe('the field against distance', () => {
  it('rides the slider region by region: inside the rod, then outside it, said aloud', async () => {
    const view = await open('lines');
    fireEvent.click(view.getByRole('button', {name: 'Solid rod'}));
    const readout = () => document.querySelector('.gs-profile .gs-readout')?.textContent ?? '';
    const slider = view.getByRole('slider', {name: 'Radius r'});
    expect(slider.getAttribute('aria-valuetext')).toBe('inside the rod');
    expect(readout()).toContain('Inside the rod');
    slider.focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(slider.getAttribute('aria-valuetext')).toBe('outside the rod'));
    expect(readout()).toContain('Outside');
    // The board's problem is the rod's, and the figure's charge inside follows the slider.
    expect(document.querySelector('.gs-board .ew-problem-text')?.textContent).toContain('solid rod');
    expect(document.querySelector('.gs-inside-name')?.textContent).toContain('λL');
  }, 20000);
  it('ends Lines on Next: Sheets and slabs, with the Infinite line to compare beside it', async () => {
    const view = await open('lines');
    const next = view.getByRole('link', {name: /^Next: Sheets and slabs/});
    expect(next.getAttribute('href')).toBe('?g=sheets');
    const compare = view.getByRole('link', {name: /^Compare: /});
    expect(compare.getAttribute('href')).toBe('?p=infinite');
    fireEvent.click(next);
    await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe('Sheets and slabs'));
    expect(view.getByRole('link', {name: /^Next: Conductors/}).getAttribute('href')).toBe('?g=conductors');
    expect(view.getByRole('link', {name: /^Compare: /}).getAttribute('href')).toBe('?p=sheet');
  }, 20000);
});

describe('the integral lessons point to Gauss’s law', () => {
  it('the Infinite line and the Infinite sheet each offer the same answer by Gauss’s law', async () => {
    for (const [p, g] of [['infinite', 'lines'], ['sheet', 'sheets']]) {
      await page.viewport(1280, 800);
      window.history.replaceState(null, '', `/?p=${p}`);
      const view = render(<Site />);
      await view.findByRole('button', {name: 'Watch it build'});
      expect(view.getByRole('link', {name: 'The same answer by Gauss’s law'}).getAttribute('href')).toBe(`?g=${g}`);
      // Let the integral lesson settle (its address and its save are debounced) before the next mount.
      await new Promise(r => setTimeout(r, 600));
      view.unmount(); newVisit(); window.history.replaceState(null, '', '/');
    }
  }, 30000);
});

describe('a charge in a hollow', () => {
  it('moves by keyboard, and the wall’s charge follows it; an empty hollow has nothing on its wall', async () => {
    const view = await open('conductors');
    const readout = () => document.querySelector<HTMLElement>('.gs-cavity .gs-readout')!;
    expect(readout().dataset.off).toBe('yes');
    expect(readout().querySelector('annotation')?.textContent).toBe(String.raw`q_{\text{wall}}=-q,\qquad q_{\text{outer}}=q`);
    const q = view.getByRole('button', {name: /^Charge q, positive, off centre/});
    q.focus();
    await userEvent.keyboard('{Home}');
    expect(readout().dataset.off).toBe('no');
    expect(view.getByRole('button', {name: /^Charge q, positive, at the centre/})).toBeTruthy();
    // The sign of the charge follows the page's sign.
    fireEvent.click(view.getByRole('button', {name: 'Negative'}));
    expect(view.getByRole('button', {name: /^Charge q, negative/})).toBeTruthy();
    fireEvent.click(view.getByRole('button', {name: 'Nothing'}));
    expect(readout().dataset.wall).toBe('none');
    expect(view.queryByRole('button', {name: /^Charge q/})).toBeNull();
  }, 20000);
});
