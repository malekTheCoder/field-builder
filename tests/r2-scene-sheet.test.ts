import {describe, expect, it} from 'vitest';
import {openingCamera, projectCamera, sheetPiece, SURFACE_UNIT} from '../src/diagrams/camera';
import {farAlpha, sheetFarFade, SHEET_FAR_LOW} from '../src/diagrams/three/bodies';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE SHEET IN SPACE: P IS DRAWN ABOVE THE SHEET, NOT IN IT.
 *
 * In the opening view a flat ring of radius s rises sin(pitch)·s on the screen while P rises
 * cos(pitch)·z. The lesson rested on its fourth ring and the run talked about the ring three quarters
 * of the way out -- the same ring at five pieces, 54 to 72 degrees below P, out to 9.2 m at z = 3 --
 * so the ring's far edge ran straight through P, and the sheet's far region rose to P's height. In
 * the lesson whose whole argument is "lift P and nothing changes", P looked as if it lay in the sheet.
 *
 * These measure it on the screen, through the figure's own projection: P against the far edge of the
 * ring the lesson shows, sampled round the ring rather than worked out in closed form. */
const view = openingCamera('sheet'), unit = SURFACE_UNIT;
/** Screen y, in pixels from O, downward positive -- the SVG's own sense. */
const screenY = (v: {x: number; y: number; z: number}) => unit * projectCamera(v, view.yaw, view.pitch).y;
/** The cut the sheet is made with: ring i of n runs out to z·tan(90° · (i+1)/n), held short of the right angle. */
const outerEdge = (i: number, n: number, z: number) => z * Math.tan(Math.PI / 2 * Math.min(.999, (i + 1) / n));
/** The highest point of a flat ring of radius s on the screen: the smallest y round it. */
const farEdgeY = (s: number) => Math.min(...Array.from({length: 720}, (_, k) => screenY({x: s * Math.cos(k * Math.PI / 360), y: s * Math.sin(k * Math.PI / 360), z: 0})));
describe('the ring the sheet lesson shows', () => {
 it('at the opening camera, default height and five pieces, P is at least 20 px above its far edge -- at rest and in the run', () => {
  const z = DEFAULT_PARAMS.distance, n = DEFAULT_PARAMS.slices;
  const P = screenY({x: 0, y: 0, z});
  // At rest and in the run the lesson shows the same ring: see `sheetPiece` and the Explorer's openRun.
  const shown = sheetPiece(n, z);
  expect(farEdgeY(outerEdge(shown, n, z)) - P, `ring ${shown}`).toBeGreaterThanOrEqual(20);
  // And it is the largest such ring: the next one out would reach P's height.
  expect(farEdgeY(outerEdge(shown + 1, n, z)) - P).toBeLessThan(20);
  // The ring the lesson used to show, for the record: its far edge was within a few pixels of P.
  expect(farEdgeY(outerEdge(3, n, z)) - P).toBeLessThan(0);
 });
 it('stays clear of P at every count and every height a reader can set', () => {
  const crossing: string[] = [];
  for (let n = 3; n <= 30; n++) for (const z of [1.5, 2, 3, 4.5, 6]) {
   const i = sheetPiece(n, z), gap = farEdgeY(outerEdge(i, n, z)) - screenY({x: 0, y: 0, z});
   if (gap < 20) crossing.push(`n=${n} z=${z}: ring ${i} is ${gap.toFixed(1)} px below P`);
  }
  expect(crossing).toEqual([]);
 });
 it('is still a ring of the cut, not the innermost by default: the lesson has a ring of real width to show', () => {
  expect(sheetPiece(5, 3)).toBe(1);
  expect(sheetPiece(10, 3)).toBeGreaterThanOrEqual(3);
 });
});
describe('the sheet\'s far side', () => {
 const z = DEFAULT_PARAMS.distance, fade = sheetFarFade(z, view.pitch, unit);
 /** How far along the camera's far direction a point of the plane is, in metres. */
 const riseAt = (depth: number) => Math.sin(view.pitch) * depth * unit, P = Math.cos(view.pitch) * z * unit;
 it('is solid where the shown ring is, and down to a trace before it would be drawn level with P', () => {
  const ring = outerEdge(sheetPiece(DEFAULT_PARAMS.slices, z), DEFAULT_PARAMS.slices, z);
  expect(farAlpha(ring, fade)).toBeGreaterThan(.97);
  // The depth at which the plane is drawn 20 px below P, and at P itself.
  const below = (P - 20) / (Math.sin(view.pitch) * unit), level = P / (Math.sin(view.pitch) * unit);
  expect(riseAt(below)).toBeCloseTo(P - 20, 6);
  expect(farAlpha(below, fade)).toBeLessThanOrEqual(SHEET_FAR_LOW + 1e-9);
  expect(farAlpha(level, fade)).toBeLessThanOrEqual(SHEET_FAR_LOW + 1e-9);
  // Never to nothing: a sheet that stopped would be a false edge on a plane that has none.
  expect(farAlpha(1e3, fade)).toBeGreaterThan(0);
  // The near side is untouched.
  expect(farAlpha(-5, fade)).toBe(1);
 });
 it('does not pull in under P when the view is tipped up, and lets the plane run further when it is tipped down', () => {
  expect(sheetFarFade(z, 1.2, unit)).toEqual(fade);
  expect(sheetFarFade(z, .3, unit).outer).toBeGreaterThan(fade.outer);
 });
});
