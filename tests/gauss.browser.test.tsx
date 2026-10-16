import {act, cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import '../app/globals.css';
import Site, {newVisit} from '../src/home/Site';
import {GAUSS} from '../src/explorer/lessons';
import {GAUSS_READY} from '../src/problems/readiness';
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
    window.history.replaceState(null, '', '/?g=nonsense');
    const home = render(<Site />);
    expect(await home.findByRole('heading', {level: 1, name: 'One law, every geometry.'})).toBeTruthy();
  }, 20000);
  it('the list offers the ready lessons as links and the rest as words Tab passes over', async () => {
    const view = await open('flux');
    const ready = GAUSS.lessons.filter(l => GAUSS_READY.has(l.key));
    const list = view.getByRole('navigation', {name: 'Lessons'});
    const heading = within(list).getByRole('heading', {level: 2, name: /^Gauss’s law/});
    const family = heading.closest('.exp-family')!;
    const links = within(family as HTMLElement).getAllByRole('link');
    expect(links.map(a => a.getAttribute('href'))).toEqual(ready.map(l => `?g=${l.key}`));
    expect(links.map(a => a.getAttribute('href'))).toEqual(expect.arrayContaining(['?g=symmetry', '?g=flux', '?g=inside']));
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(family.querySelectorAll('.exp-planned-row[aria-disabled=true]').length).toBe(GAUSS.lessons.length - ready.length);
    for (const row of family.querySelectorAll('.exp-planned-row')) expect(row.querySelector('a,button,[tabindex]')).toBeNull();
    if (GAUSS.lessons.length > ready.length) expect(family.textContent).toContain('Coming soon');
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
    // The instrument opens on the flat patch, the idea the lesson starts from; the closed surface is its second tab.
    fireEvent.click(view.getByRole('tab', {name: 'A closed surface'}));
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
    // The instrument opens on the flat patch, the idea the lesson starts from; the closed surface is its second tab.
    fireEvent.click(view.getByRole('tab', {name: 'A closed surface'}));
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

describe('why only the charge inside', () => {
  it('carries the charge out: the stacked flux is q/ε₀ inside and zero outside, and says the crossing', async () => {
    const view = await open('inside');
    const readout = () => document.querySelector('.gs-inside-tool .gs-readout .katex')?.textContent ?? '';
    expect(readout()).toContain('q');
    const slider = view.getByRole('slider', {name: /Distance of the charge from the centre/});
    slider.focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(readout()).toMatch(/Φ\s*=\s*0/));
    expect(document.querySelector('.gs-inside-tool output')?.textContent).toContain('out of the sphere');
    // Outside, some bands carry flux back: the second column is drawn, and the net line sits on the baseline.
    expect(document.querySelectorAll('.gs-inside-tool .gs-stack.is-back').length).toBeGreaterThan(0);
    const net = document.querySelector<SVGLineElement>('.gs-inside-tool .gs-net')!, base = document.querySelector<SVGLineElement>('.gs-inside-tool .gs-baseline')!;
    expect(Math.abs(Number(net.getAttribute('y1')) - Number(base.getAttribute('y1')))).toBeLessThan(.5);
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(readout()).toContain('q'));
    expect(document.querySelectorAll('.gs-inside-tool .gs-stack.is-back').length).toBe(0);
  }, 20000);
  it('runs the outside case to a flux of zero, with no field at P to draw', async () => {
    const f = frames();
    try {
      const view = await open('inside');
      fireEvent.click(view.getByRole('button', {name: 'Charge outside'}));
      expect(document.querySelector('.gs-board .ew-problem-text')?.textContent).toContain('outside a sphere');
      expect(document.querySelector('.gs-p')).toBeNull();
      fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
      f.run(30);
      expect(stage()?.dataset.stage).toBe('solve');
      expect(document.querySelector('.gs-board .ew-result .katex')?.textContent).toMatch(/Φ\s*=\s*0/);
      expect(document.querySelector('.gs-board .ew-result p')?.textContent).toContain('Zero for either sign');
      expect(document.querySelector('.gs-p')).toBeNull();
    } finally { f.restore(); }
  }, 30000);
});

describe('Q_enc from a density', () => {
  it('builds Q_enc shell by shell: the upper limit is r inside the ball and R outside, and ρ dr′ is not a charge', async () => {
    await open('qenc');
    const tool = document.querySelector<HTMLElement>('.gs-qenc')!;
    const integral = () => tool.querySelectorAll('.gs-readout .katex')[1]?.textContent ?? '';
    expect(integral()).toContain('Qenc');
    expect(tool.querySelectorAll('.gs-shell.is-inside').length).toBeGreaterThan(0);
    const before = tool.querySelectorAll('.gs-shell.is-inside').length;
    within(tool).getByRole('slider', {name: /Radius of the Gaussian sphere/}).focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(tool.querySelector('.gs-readout p')?.textContent).toContain('no charge beyond R'));
    expect(tool.querySelectorAll('.gs-shell.is-inside').length).toBeGreaterThan(before);
    expect(tool.querySelectorAll('.gs-shell:not(.is-inside)').length).toBe(0);
    fireEvent.click(within(tool).getByRole('button', {name: /the mistake/}));
    expect(integral()).toContain('≠');
    expect(tool.querySelector('.gs-readout p')?.textContent).toContain('not a charge');
    // The density picker changes the readout's density.
    fireEvent.click(within(tool).getByRole('button', {name: 'Rising with r'}));
    expect(tool.querySelector('.gs-readout .katex')?.textContent).toContain('ρ0');
  }, 20000);
});

describe('Spheres', () => {
  it('the plot follows the case and the slider: the shell’s jump, no field inside it, one curve outside', async () => {
    const view = await open('spheres');
    fireEvent.click(view.getByRole('button', {name: 'Thin shell'}));
    const plot = document.querySelector<HTMLElement>('.gs-plot')!;
    expect(plot.querySelector('.gs-jump')).toBeTruthy();
    expect(plot.querySelector('.gs-readout p')?.textContent).toContain('Outside R');
    const slider = view.getByRole('slider', {name: 'Radius r'});
    slider.focus();
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(plot.querySelector('.gs-readout p')?.textContent).toContain('Inside the shell'));
    // At rest the figure names the field at P, which inside the shell is zero.
    expect([...document.querySelectorAll('.gs-figure .gs-field-name.is-answer')].map(n => n.textContent)).toContain('E = 0');
    fireEvent.click(view.getByRole('button', {name: 'Uniform ball'}));
    expect(plot.querySelector('.gs-jump')).toBeNull();
    expect(plot.querySelector('.gs-meet')).toBeTruthy();
    expect(document.querySelector('.gs-board .ew-problem-text')?.textContent).toContain('spread evenly through its volume');
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
    // While the move plays the line says what is happening, never "choose a move" over a move under way.
    expect(verdict()).toBe('Mirror square to the line: the field is carried with the charge.');
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
  it('fits 390 pixels with no sideways scroll, on every ready lesson', async () => {
    for (const id of GAUSS.lessons.filter(l => GAUSS_READY.has(l.key)).map(l => l.key)) {
      const view = await open(id, 390, 844);
      await new Promise(r => setTimeout(r, 200));
      expect(document.documentElement.scrollWidth, id).toBeLessThanOrEqual(390);
      view.unmount(); newVisit();
    }
  }, 30000);
  it('fits 390 pixels with no sideways scroll, on Lines, Sheets and Conductors', async () => {
    for (const id of ['lines', 'sheets', 'conductors', 'holes', 'runs-out', 'hard']) {
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

describe('a hole to move', () => {
  it('centres by keyboard and the field in the hole goes; the rod and the two pieces are a click away; Conductors leads here', async () => {
    const view = await open('holes');
    const readout = () => document.querySelector<HTMLElement>('.gs-holes .gs-readout')!;
    expect(readout().dataset.centred).toBe('no');
    expect(readout().querySelector('annotation')?.textContent).toBe(String.raw`\vec E_{\text{hole}}=\frac{\rho\,\vec d}{3\varepsilon_0}`);
    const hole = view.getByRole('button', {name: /^The hole, off centre, up and to the right/});
    hole.focus();
    await userEvent.keyboard('{Home}');
    expect(readout().dataset.centred).toBe('yes');
    await userEvent.keyboard('{ArrowLeft}');
    expect(view.getByRole('button', {name: /^The hole, off centre, to the left/})).toBeTruthy();
    fireEvent.click(view.getByRole('button', {name: 'A rod, end on'}));
    expect(readout().dataset.shape).toBe('rod');
    expect(readout().querySelector('annotation')?.textContent).toContain(String.raw`2\varepsilon_0`);
    fireEvent.click(view.getByRole('button', {name: 'Show the two pieces'}));
    expect(document.querySelectorAll('.gs-holes .gs-arrow.is-part').length).toBe(2);
    // The figure's two cases, and the board's answer for each.
    fireEvent.click(view.getByRole('button', {name: 'Sheet with a hole'}));
    expect(document.querySelector('.gs-board .ew-problem-text')?.textContent).toContain('round hole');
    expect(view.getByRole('link', {name: /^Compare: /}).getAttribute('href')).toBe('?p=disk');
  }, 20000);
  it('follows Conductors', async () => {
    const view = await open('conductors');
    expect(view.getByRole('link', {name: /^Next: Holes by superposition/}).getAttribute('href')).toBe('?g=holes');
  }, 20000);
});

describe('a charge in a cube', () => {
  it('shares the flux unequally off centre and equally at the centre, by keyboard; the run ends on the flux, with P marked and no field drawn at it', async () => {
    const view = await open('runs-out');
    const readout = () => document.querySelector<HTMLElement>('.gs-cube .gs-readout')!;
    expect(readout().dataset.centred).toBe('no');
    expect(readout().dataset.largest).toBe('right');
    const q = view.getByRole('button', {name: /^Charge q, positive, off centre in the cube/});
    q.focus();
    await userEvent.keyboard('{Home}');
    expect(readout().dataset.centred).toBe('yes');
    expect(readout().querySelector('annotation')?.textContent).toContain(String.raw`\frac{q}{6\varepsilon_0}`);
    await userEvent.keyboard('{ArrowLeft}');
    expect(readout().dataset.largest).toBe('left');
    // The board's answer is a flux, and the figure draws no solved field at P.
    expect(document.querySelector('.gs-board .ew-result-label')?.textContent).toContain('flux out through the closed cylinder');
    expect(document.querySelector('.gs-p')).toBeTruthy();
    expect(document.querySelector('.gs-field-name.is-answer')).toBeNull();
    expect(view.getByRole('link', {name: /^Compare: /}).getAttribute('href')).toBe('?p=bisector');
    fireEvent.click(view.getByRole('button', {name: 'Charge in a cube'}));
    expect(document.querySelector('.gs-board .ew-result-label')?.textContent).toContain('flux out through the cube');
  }, 20000);
  it('follows Holes by superposition', async () => {
    const view = await open('holes');
    expect(view.getByRole('link', {name: /^Next: When symmetry runs out/}).getAttribute('href')).toBe('?g=runs-out');
  }, 20000);
});

describe('the hard cases', () => {
  it('the sign-changing slab: the slider runs from below the slab to above it, region by region, said aloud', async () => {
    const view = await open('hard');
    fireEvent.click(view.getByRole('button', {name: 'A slab whose charge changes sign'}));
    const slider = view.getByRole('slider', {name: 'Height z'});
    expect(slider.getAttribute('aria-valuetext')).toBe('inside the slab');
    slider.focus();
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(slider.getAttribute('aria-valuetext')).toBe('below the slab'));
    expect(document.querySelector('.gs-profile .gs-readout')?.textContent).toContain('adding them');
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(slider.getAttribute('aria-valuetext')).toBe('above the slab'));
    // Backwards: the answer is a density.
    fireEvent.click(view.getByRole('button', {name: 'Given the field, find the charge'}));
    expect(document.querySelector('.gs-board .ew-result-label')?.textContent).toBe('The answer, the density at r');
  }, 20000);
  it('ends the section on a card home, and follows When symmetry runs out', async () => {
    const view = await open('hard');
    expect(view.getByRole('link', {name: /^Next: Every lesson/}).getAttribute('href')).toBe('./');
    cleanup(); newVisit();
    const prev = await open('runs-out');
    expect(prev.getByRole('link', {name: /^Next: The hard cases/}).getAttribute('href')).toBe('?g=hard');
  }, 20000);
});

describe('the figure’s round of fixes', () => {
  const label = () => document.querySelector('.gs-svg')?.getAttribute('aria-label') ?? '';
  it('says where the surface stands from the enclosed charge, never "inside" by default', async () => {
    let view = await open('symmetry');
    fireEvent.click(view.getByRole('button', {name: 'Line'}));
    expect(label()).toContain('a closed cylinder round a length of it');
    expect(label()).not.toContain('inside a closed cylinder');
    view.unmount(); newVisit();
    view = await open('conductors');
    // The opening sphere is in the metal, and the figure's Q_enc there is zero: the label says both.
    expect(label()).toContain('a closed sphere inside the metal');
    expect(label()).toContain('holds no net charge');
    fireEvent.click(view.getByRole('button', {name: /^A charge in a hollow/}));
    fireEvent.click(view.getByRole('button', {name: 'Negative'}));
    expect(label()).toContain('the charge in the hollow negative');
  }, 20000);
  it('keeps the focus on Reset view once the view is back, and a turned view stays with its own lesson', async () => {
    const view = await open('symmetry');
    fireEvent.click(view.getByRole('button', {name: 'Line'}));
    const reset = () => view.getByRole('button', {name: 'Reset view'});
    expect(reset().getAttribute('aria-disabled')).toBe('true');
    (document.querySelector('.gs-svg') as SVGSVGElement).focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await waitFor(() => expect(reset().getAttribute('aria-disabled')).toBeNull());
    reset().focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(reset().getAttribute('aria-disabled')).toBe('true'));
    expect(document.activeElement).toBe(reset());
    // Turned again, then another lesson: it opens at its own view, not this one's.
    (document.querySelector('.gs-svg') as SVGSVGElement).focus();
    await userEvent.keyboard('{ArrowLeft}');
    fireEvent.click(view.getAllByRole('link').find(a => a.getAttribute('href') === '?g=lines')!);
    await waitFor(() => expect(document.querySelector('h1')?.textContent).toContain('Lines'));
    expect(view.getByRole('button', {name: 'Reset view'}).getAttribute('aria-disabled')).toBe('true');
  }, 20000);
  it('leads the lesson list with the Gauss family', async () => {
    await open('sheets');
    expect(document.querySelector('.exp-lessons .exp-family-name')?.textContent).toContain('Gauss');
  }, 20000);
  it('opens the flux instrument on the flat patch, its words its own', async () => {
    const view = await open('flux');
    expect(document.querySelector('.gs-flux .gs-instrument-title')?.textContent).toBe('Tilt the patch');
    fireEvent.click(view.getByRole('tab', {name: 'A closed surface'}));
    expect(document.querySelector('.gs-flux .gs-instrument-title')?.textContent).toBe('Move the charges');
  }, 20000);
  it('starts Carry it out from the case chosen, and holds the caption’s height as the case changes', async () => {
    const view = await open('inside');
    const height = () => (document.querySelector('.gs-caption') as HTMLElement).getBoundingClientRect().height;
    const first = height();
    expect(document.querySelector('.gs-caption')?.textContent).toContain('Every arrow here is the same length');
    fireEvent.click(view.getByRole('button', {name: 'Charge outside'}));
    expect(view.getByRole('button', {name: /^The charge q, outside the sphere/})).toBeTruthy();
    expect(height()).toBe(first);
    fireEvent.click(view.getByRole('button', {name: 'Charge off centre'}));
    expect(height()).toBe(first);
    fireEvent.click(view.getByRole('button', {name: 'Charge at the centre'}));
    expect(view.getByRole('button', {name: /^The charge q, at the centre/})).toBeTruthy();
  }, 20000);
  it('cuts an infinite charge to the plot in the cross-section', async () => {
    const view = await open('lines');
    fireEvent.click(view.getByRole('button', {name: 'Cross-section'}));
    const layer = document.querySelector('.gs-charge-layer')!;
    expect(layer.getAttribute('clip-path')).toMatch(/^url\(#/);
    // The clip is the plot's own frame, so the line stops at its edge, under the card's heading.
    const id = layer.getAttribute('clip-path')!.slice(5, -1), rect = document.getElementById(id)?.querySelector('rect');
    expect([rect?.getAttribute('y'), rect?.getAttribute('height')]).toEqual(['0', '430']);
  }, 20000);
  it('on a phone, a step played from the board brings the figure into view', async () => {
    const view = await open('symmetry', 390, 844);
    const step = view.getByRole('button', {name: 'Right side: play this step on the figure'});
    step.scrollIntoView();
    await new Promise(r => setTimeout(r, 50));
    fireEvent.click(step);
    await waitFor(() => { const r = document.querySelector('.gs-page .exp-diagram-card .cd-stage')!.getBoundingClientRect(); expect(r.top).toBeGreaterThanOrEqual(-1); expect(r.bottom).toBeLessThanOrEqual(845); }, {timeout: 4000});
  }, 20000);
});
