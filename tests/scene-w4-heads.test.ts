import {describe, expect, it} from 'vitest';
import {arrowHead} from '../src/diagrams/three/bodies';
/* A SHORT ARROW IN SPACE STILL ENDS IN A HEAD.
 *
 * The scene's heads were a fixed share of their arrow below about twenty units, so a mirror pair going into the
 * sum at thirty pieces -- a dozen pixels long -- ended in a head five long and three wide on a desk and half that
 * on a phone: the shaft's own width, a stub. They are floored now, in screen pixels, as the flat figure's are. */
const px = 1 / 42;
describe('the scene\'s arrowheads', () => {
 it('an arrow twelve screen pixels long or more has a head at least six long and five wide, longer than it is wide', () => {
  // A desk (a screen pixel is a unit of the figure) and a phone (one is about two).
  for (const screen of [px, 2.05 * px]) for (const thick of [.3 * px, .63 * px, 1.3 * px, 1.85 * px]) for (const k of [12, 14, 18, 24, 40, 90]) {
   const length = k * screen, h = arrowHead(length, thick, px, screen);
   expect(h.length / screen, `${k} px long`).toBeGreaterThanOrEqual(6 - 1e-9);
   expect(h.length).toBeLessThanOrEqual(length * .5 + 1e-12);
   expect(2 * h.half / screen, `${k} px long, a shaft ${(thick / px).toFixed(2)} units`).toBeGreaterThanOrEqual(4 - 1e-9);
   expect(h.length / (2 * h.half)).toBeGreaterThanOrEqual(1.5 - 1e-9);
  }
 });
 it('below twelve pixels, or with no screen size given, the head is as it was: a share of the arrow', () => {
  for (const k of [3, 8, 11.5]) {
   const h = arrowHead(k * px, .63 * px, px, px);
   expect(h.length).toBeCloseTo(k * px * .45, 12);
  }
  // Long arrows keep their own heads.
  const long = arrowHead(2.4, .045, px);
  expect(long.length).toBeCloseTo(Math.max(7 * .045, 9 * px), 12);
 });
});
