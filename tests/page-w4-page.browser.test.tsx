import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own sheet and faces: an ink and a typeface are what these read.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* THE PAGE AROUND THE FIGURE, ROUND FOUR.
 *
 * "Easy to confuse with" set every wrong expression in full ink under the quantity's name, so skimmed it read as
 * the answer sheet; the disk's, the sheet's and the disk potential's slider said Pieces under a run that cuts them
 * into rings; and the arc's slider set its φ as the stroked ϕ, beside formulas that set the curly φ. */
afterEach(async () => {
 cleanup();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
const STORE = 'field-builder:explorer:v1';
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id as never).title));
 return view;
}
async function slips(id: string) {
 const view = await openLesson(id);
 // Easy to confuse with starts open: a click on its summary would fold it away.
 await waitFor(() => expect(view.container.querySelector('.exp-slip-math .katex')).toBeTruthy());
 return view;
}
const rows = (view: Awaited<ReturnType<typeof openLesson>>) => [...view.container.querySelectorAll('.exp-slip')].map(s => ({
 of: s.querySelector('.exp-slip-of')!.textContent!,
 not: [...s.querySelectorAll('.exp-slip-not')].length,
 tex: [...s.querySelectorAll('.exp-slip-math annotation')].map(a => a.textContent ?? ''),
}));

describe('easy to confuse with reads as warnings', () => {
 it('each expression is set as what the quantity is not, in the muted ink', async () => {
  const view = await slips('bisector');
  const all = rows(view);
  const dEy = all.find(r => r.of === 'y-component dEᵧ')!;
  // "dEᵧ 0" under its name was copied down as dEᵧ = 0, the very slip the sentence beside it warns against.
  expect(dEy.tex).toContain(String.raw`\displaystyle dE_y\ne 0`);
  expect(all.find(r => r.of === 'A piece’s charge dQ')!.tex.every(t => t.startsWith(String.raw`\displaystyle dQ\ne `))).toBe(true);
  expect(all.find(r => r.of === 'The factor cos α')!.tex.every(t => t.startsWith(String.raw`\displaystyle \cos\alpha\ne `))).toBe(true);
  expect(all.find(r => r.of === 'Total x-component Eₓ')!.tex.every(t => t.startsWith(String.raw`\displaystyle E_x\ne `))).toBe(true);
  // Every row of this lesson has a symbol to set it against.
  for (const r of all) { expect(r.not, r.of).toBe(0); for (const t of r.tex) expect(t, r.of).toMatch(/\\ne /); }
  const math = view.container.querySelector('.exp-slip-math')!, prose = view.container.querySelector('.exp-slip-note p')!;
  expect(getComputedStyle(math).color).not.toBe(getComputedStyle(prose).color);
 }, 20000);
 it('where the quantity\'s name has no symbol, its expressions follow a "Not"', async () => {
  const view = await slips('v-disk');
  const all = rows(view);
  const area = all.find(r => r.of === 'A ring’s area')!;
  expect(area.not).toBeGreaterThan(0);
  for (const t of area.tex) expect(t).not.toMatch(/\\ne/);
  // "Recovered axial field" is the field, not any one symbol of it.
  expect(all.find(r => r.of === 'Recovered axial field')!.not).toBeGreaterThan(0);
  // And dV is dV.
  expect(all.find(r => r.of === 'Contribution dV')!.tex.every(t => t.startsWith(String.raw`\displaystyle dV\ne `))).toBe(true);
 }, 20000);
 it('a name that ends in what the quantity is part of is not taken for its symbol', async () => {
  const view = await slips('ring');
  const axial = rows(view).find(r => r.of === 'Axial component of dE');
  expect(axial, 'the ring no longer has this row, so this checks nothing').toBeTruthy();
  for (const t of axial!.tex) expect(t).not.toMatch(/dE\\ne/);
  expect(axial!.not).toBeGreaterThan(0);
 }, 20000);
});

describe('the pieces slider names what the run cuts', () => {
 for (const [id, name] of [['disk', 'Rings N'], ['sheet', 'Rings N'], ['v-disk', 'Rings N'], ['ring', 'Pieces N'], ['bisector', 'Pieces N']] as const) it(`${id}: ${name}`, async () => {
  const view = await openLesson(id);
  expect(view.getByRole('slider', {name})).toBeTruthy();
 }, 20000);
});

describe('the arc\'s slider sets φ as the formulas do', () => {
 it('in the KaTeX face, curly, not the display serif\'s stroked ϕ', async () => {
  const view = await openLesson('arc');
  const sym = [...view.container.querySelectorAll('.exp-parameters .exp-sym')].find(s => s.textContent === 'φ')!;
  expect(sym, 'no φ on the slider').toBeTruthy();
  expect(getComputedStyle(sym.querySelector('.exp-greek')!).fontFamily).toMatch(/^KaTeX_Math/);
 }, 20000);
});
