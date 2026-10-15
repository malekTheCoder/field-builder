import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The transport's algebra is laid out by its sheet, in the page's faces: rows sharing a row is what is measured.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {boardLines} from '../src/workbench/derivation';
/* THE TRANSPORT CARRIES THE BOARD'S ALGEBRA WHERE THE BOARD IS A SCROLL AWAY.
 *
 * The board writes the ring's exact sum over two rows, an aligned block whose rows each open behind a strut the
 * width of E_z; the transport looked for the strut only at the very start, so it ended Add them up on a gap and
 * two rows standing under nothing -- and, stacked, they made the ring's cell a row taller at every stage. And on
 * a phone the run never said what rᵢ or α is: the board's gloss under each line was the board's alone. */
afterEach(async () => {
 cleanup();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 await page.viewport(1280, 800);
});
const STORE = 'field-builder:explorer:v1';
async function openRun(id: string, width = 390, height = 844) {
 await page.viewport(width, height);
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id as never).title));
 await document.fonts.ready;
 fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
 fireEvent.click(view.getByRole('button', {name: 'Pause'}));
 return view;
}
type View = Awaited<ReturnType<typeof openRun>>;
const tex = (el: Element) => [...el.querySelectorAll('.katex-mathml annotation')].map(a => a.textContent ?? '');
const stage = (view: View, i: number) => view.container.querySelectorAll('.bp-math-step')[i];

describe('Add them up ends on the board\'s own answer, however many rows it has', () => {
 for (const id of ['ring', 'v-ring', 'v-arc'] as const) it(id, async () => {
  const view = await openRun(id);
  const rows = tex(stage(view, 3).querySelector('.bp-finish-rows')!);
  // Each row opens on its "=", with none of the board's alignment left in it.
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
   expect(row, 'a row that does not open on its "="').toMatch(/^=/);
   expect(row, 'the board\'s alignment came with it').not.toMatch(/\\phantom|\\begin|&|\\\\/);
  }
  // And the last is the board's last: the whole charge, kQ.
  const board = boardLines(getProblem(id)).find(l => l.key === 'add')!.finish!;
  expect(board.replace(/\s/g, '')).toContain(rows.at(-1)!.replace(/\s/g, ''));
  expect(rows.at(-1)).toMatch(/kQ/);
 }, 20000);
 it('on a wide phone the ring\'s chain is one row under its line, not two', async () => {
  // Where both fit. At 390 they do not once each opens under the line's "=" (page-w5-lesson-top), and two rows
  // that read as the board's beat one that starts under the line's left side.
  const view = await openRun('ring', 560, 844);
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  const rows = [...stage(view, 3).querySelectorAll<HTMLElement>('.bp-finish-rows>.math')].map(r => r.getBoundingClientRect());
  expect(rows.length, 'the board no longer writes this sum over two rows, so this checks nothing').toBe(2);
  // Stacked, they made the ring's cell -- every stage's -- a row taller than any other lesson's.
  expect(Math.abs(rows[1].top - rows[0].top)).toBeLessThan(4);
  expect(rows[1].left).toBeGreaterThan(rows[0].right);
 }, 20000);
});

describe('on a phone the run says what its new symbols stand for', () => {
 it('rᵢ at One piece and cos α at What cancels, beside the line, and not once the run has settled', async () => {
  const view = await openRun('bisector');
  const lines = boardLines(getProblem('bisector'));
  fireEvent.click(view.getByRole('button', {name: 'Stage 2: One piece'}));
  const one = stage(view, 1).querySelector('.bp-where');
  expect(one, 'One piece never says what rᵢ is').toBeTruthy();
  expect(tex(one!)[0]).toBe(lines[1].where);
  expect(tex(one!)[0]).toMatch(/r_i=\\sqrt\{y_i\^2\+r\^2\}/);
  fireEvent.click(view.getByRole('button', {name: 'Stage 3: What cancels'}));
  const cancel = stage(view, 2).querySelector('.bp-where')!;
  expect(tex(cancel)[0]).toMatch(/\\cos\\alpha_i=\\frac\{r\}/);
  expect(cancel.checkVisibility()).toBe(true);
  // A gloss: smaller than its line and in the muted ink, and set apart from it.
  const line = [...stage(view, 2).children].find(c => c.classList.contains('math') && !c.classList.contains('bp-where') && !c.classList.contains('bp-cancels'))!;
  expect(parseFloat(getComputedStyle(cancel).fontSize)).toBeLessThan(parseFloat(getComputedStyle(line).fontSize));
  expect(getComputedStyle(cancel).color).not.toBe(getComputedStyle(line).color);
  // The cancellation keeps a row of its own, above.
  const cancels = stage(view, 2).querySelector('.bp-cancels')!.getBoundingClientRect();
  expect(cancels.bottom).toBeLessThanOrEqual(line.getBoundingClientRect().top + 1);
  // Settled, the integral and the answer follow the last line directly, as one chain.
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Shrink them'}));
  const track = view.container.querySelector<HTMLElement>('.bp-track')!, box = track.getBoundingClientRect();
  fireEvent.pointerDown(track, {clientX: box.right - 8, button: 0, pointerId: 7});
  fireEvent.pointerMove(track, {clientX: box.right, pointerId: 7});
  fireEvent.pointerUp(track, {clientX: box.right, pointerId: 7});
  await waitFor(() => expect(view.container.querySelector('.bp-answer')).toBeTruthy());
  expect(stage(view, 4).querySelector('.bp-where')!.checkVisibility()).toBe(false);
 }, 20000);
 it('the ring\'s sum: its range beside the line, the chain under both, never between them', async () => {
  const view = await openRun('ring');
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  const step = stage(view, 3);
  const where = step.querySelector('.bp-where')!.getBoundingClientRect(), finish = step.querySelector('.bp-finish')!.getBoundingClientRect();
  expect(where.bottom, '"θ: 0 → 2π = …" read as one relation').toBeLessThanOrEqual(finish.top + 1);
 }, 20000);
});
