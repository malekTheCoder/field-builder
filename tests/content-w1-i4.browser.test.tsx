import '../app/globals.css';
import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import {Assessment} from '../src/components/Assessment';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {artifactHtml, lessonArtifact} from '../src/state/artifact';
afterEach(cleanup);
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
/* WAVE 1, FOURTH PASS · CONTENT, IN THE BROWSER: a phone legend whose items wrapped inside themselves,
 * a half line whose limit card promised halving that nothing on it showed, a law plot whose halving
 * could not be read off it, and a handout whose aligned equations each set their "=" at a place of
 * its own. */
describe('a limit legend wraps whole items on a phone', () => {
  for (const [id, mode] of [['v-arc', 'full'], ['infinite', 'scale'], ['semi', 'scale']] as const) it(`${id}/${mode} at 354 px`, async () => {
    const problem = getProblem(id), limit = problem.limits.find(l => l.mode === mode)!;
    const view = render(<div style={{width: 354}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
    await frame();
    const items = [...view.container.querySelectorAll<HTMLElement>('.comparison-labels > span')];
    expect(items.length).toBeGreaterThan(1);
    const line = parseFloat(getComputedStyle(items[0]).fontSize) * 1.8;
    for (const item of items) expect(item.getBoundingClientRect().height, `“${item.textContent}” wraps inside itself`).toBeLessThan(line);
    // Each dot stays on the line of its own words.
    for (const item of items) {
      const dot = item.querySelector('i')!.getBoundingClientRect(), box = item.getBoundingClientRect();
      expect(dot.top >= box.top - .5 && dot.bottom <= box.bottom + .5).toBe(true);
    }
  });
});
describe('the half line’s limit card shows the halving its words promise', () => {
  it('the arrow at P shortens as P walks out, while the ratio stays flat', async () => {
    const semi = getProblem('semi');
    const view = render(<div style={{width: 560}}><Assessment problem={semi} params={DEFAULT_PARAMS} limit={semi.limits[0]} /></div>);
    await frame();
    const arrow = () => {
      const d = view.container.querySelector('.limit-mini .limit-arrow path')?.getAttribute('d');
      if (!d) return 0;
      const [x1, y1, x2, y2] = [...d.matchAll(/-?[\d.]+/g)].map(m => Number(m[0]));
      return Math.hypot(x2 - x1, y2 - y1);
    };
    const slider = view.getByRole('slider', {name: 'Explore limiting case'});
    slider.focus(); await userEvent.keyboard('{Home}'); await frame();
    const near = arrow();
    expect(near).toBeGreaterThan(20);
    await userEvent.keyboard('{PageUp}');
    await frame();
    const farther = arrow();
    expect(farther).toBeGreaterThan(0);
    expect(farther).toBeLessThan(near * .8);
    expect(view.container.querySelector('.comparison-labels')!.textContent).toContain('The line’s pieces, added up');
    expect(view.container.querySelector('svg.comparison-plot')!.getAttribute('aria-label')).toMatch(/\|Eₓ\| .* newtons per coulomb, \|Eᵧ\| .* newtons per coulomb\./);
  });
});
describe('the infinite line’s law plot stands a stem at each doubling', () => {
  it('four stems, each half as tall as the one before', async () => {
    const line = getProblem('infinite'), limit = line.limits.find(l => l.mode === 'scale')!;
    const view = render(<div style={{width: 560}}><Assessment problem={line} params={DEFAULT_PARAMS} limit={limit} /></div>);
    await frame();
    const stems = [...view.container.querySelectorAll('line.comparison-level')].map(l => Number(l.getAttribute('y1')) - Number(l.getAttribute('y2')));
    expect(stems.length).toBe(4);
    for (let i = 1; i < stems.length; i++) expect(stems[i] / stems[i - 1]).toBeCloseTo(.5, 2);
  });
});
describe('the handout’s aligned equations line up on their “=”', () => {
  it('every row’s relation starts the right-hand column, in every block of the rod potential’s copy', async () => {
    const holder = document.createElement('iframe');
    holder.style.cssText = 'width:820px;height:2000px';
    holder.srcdoc = artifactHtml(lessonArtifact(getProblem('v-rod-bisector')));
    document.body.appendChild(holder);
    await new Promise(r => holder.addEventListener('load', r, {once: true}));
    const doc = holder.contentDocument!;
    const tables = [...doc.querySelectorAll('mtable[columnalign^="right left"]')];
    expect(tables.length).toBeGreaterThan(2);
    for (const table of tables) {
      const lefts = [...table.querySelectorAll(':scope > mtr > mtd:nth-child(2)')].map(td => {
        const first = td.querySelector('mo');
        return first ? Math.round(td.getBoundingClientRect().left - first.getBoundingClientRect().left) : 0;
      });
      // The right-hand cells start at one x, and their content starts at the cell's left edge.
      const cells = [...table.querySelectorAll(':scope > mtr > mtd:nth-child(2)')].map(td => Math.round(td.getBoundingClientRect().left));
      expect(new Set(cells).size).toBe(1);
      const starts = [...table.querySelectorAll(':scope > mtr > mtd:nth-child(2)')].map(td => Math.round((td.firstElementChild as Element).getBoundingClientRect().left - td.getBoundingClientRect().left));
      for (const s of starts) expect(s, `content starts ${s}px into its cell`).toBeLessThanOrEqual(1);
      expect(lefts.length).toBeGreaterThan(0);
    }
    holder.remove();
  });
});
