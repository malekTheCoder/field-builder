import {describe, expect, it} from 'vitest';
import {ARROW_INSET, behindGap, BEHIND_GAP, fitInWindow, gapShrink, PIECE_FAR_LOW, SHEET_DARK_INK, sheetInk, sheetSides} from '../src/diagrams/three/bodies';
import {PLOT} from '../src/diagrams/vectorfield';
/* THE SCENE LANE, WAVE 6: what the critics found, pinned where it can be without a GPU.
 *
 * Turned up over the bisector, the field's arrow ran out of the window and lost its head. The sheet seen from above
 * kept the whole gap round P and bleached a hole in its chosen ring. The dark sheet was a grey-brown slab with the
 * window's straight sides. A ring tipped up was cut open at P like a C. Each of these fails on the code before. */
describe('an arrow from P keeps its head inside the window', () => {
 const from = {x: 300, y: 80};
 it('is cut short where it would leave, and no shorter than a head and a little shaft', () => {
  // Straight up the screen, forty units a metre, three metres: it would end a hundred units above the window.
  const l = fitInWindow(from, {x: 0, y: -40}, 3, PLOT, ARROW_INSET, .2);
  expect(from.y - 40 * l).toBeGreaterThanOrEqual(PLOT.y + ARROW_INSET - 1e-9);
  expect(l).toBeCloseTo((from.y - PLOT.y - ARROW_INSET) / 40, 9);
  expect(fitInWindow({x: 300, y: PLOT.y + ARROW_INSET + 1}, {x: 0, y: -40}, 3, PLOT, ARROW_INSET, .2), 'the floor').toBe(.2);
 });
 it('is left alone inside the window, and where P itself is outside it', () => {
  expect(fitInWindow({x: 300, y: 200}, {x: 0, y: -40}, 1, PLOT, ARROW_INSET, .2)).toBe(1);
  expect(fitInWindow({x: 300, y: 20}, {x: 0, y: -40}, 3, PLOT, ARROW_INSET, .2)).toBe(3);
 });
});
describe('the sheet seen from above', () => {
 it('keeps its notch from the side and only about P\'s halo of a gap from above, as the disk does', () => {
  expect(gapShrink(.6, 'sheet')).toBe(1);
  expect(gapShrink(1.25, 'sheet')).toBeLessThan(.5);
  expect(gapShrink(1.25, 'sheet')).toBeCloseTo(gapShrink(1.25, 'disk'), 12);
 });
});
describe('the sheet ends on a curve, inside the window', () => {
 it('is whole about the middle and gone by its sides, ahead and behind too', () => {
  expect(sheetSides(0, 0, 5)).toBe(1);
  expect(sheetSides(5, 0, 5)).toBe(0);
  expect(sheetSides(-5, 0, 5)).toBe(0);
  expect(sheetSides(0, 12.5, 5)).toBe(0);
  expect(sheetSides(2, 0, 5)).toBe(1);
  expect(sheetSides(4, 0, 5)).toBeGreaterThan(0);
  expect(sheetSides(4, 0, 5)).toBeLessThan(sheetSides(3.5, 0, 5));
 });
 it('in the dark is laid in a deeper orange, more saturated over the navy ground than the charge colour was', () => {
  const navy = [23, 41, 54], over = (hex: number, a: number) => [hex >> 16, (hex >> 8) & 255, hex & 255].map((c, i) => a * c + (1 - a) * navy[i]);
  const saturation = (rgb: number[]) => (Math.max(...rgb) - Math.min(...rgb)) / Math.max(...rgb);
  const ink = sheetInk(true);
  expect(ink.colour).toBe(SHEET_DARK_INK);
  expect(saturation(over(SHEET_DARK_INK, ink.opacity))).toBeGreaterThan(1.3 * saturation(over(0xf0975c, .36)));
 });
});
describe('a ring seen from above is not cut open at P', () => {
 it('the wire behind P is dimmed to what the chosen piece keeps, never cut', () => {
  expect(behindGap(0, true, true)).toBe(PIECE_FAR_LOW);
  expect(behindGap(BEHIND_GAP.hard - .5, true, true)).toBe(PIECE_FAR_LOW);
  expect(behindGap(BEHIND_GAP.hard + .5, true, true)).toBe(1);
 });
});
