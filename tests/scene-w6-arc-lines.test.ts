import {describe, expect, it} from 'vitest';
import {fieldLines, lineHeads, planeField, traceLimit} from '../src/diagrams/fieldlines';
import {coarsen, sampleDistribution} from '../src/diagrams/sampling';
import {bodyFoot} from '../src/diagrams/vectorfield';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* THE ARC CUT NEARLY INTO A RING, IN THE FLAT FIGURE, WAVE 6.
 *
 * In the gap of an arc cut past about 1.75 pi the field on the axis is a twentieth of its strength at P, and just off the
 * axis it turns eighty degrees within a few centimetres. The tracer took fixed tenth-of-a-metre steps, so the last
 * chords before a line met the axis were eleven to thirty-two degrees off the field, the lines from the arc's two ends
 * met square, head on, at one point of empty space, and a head set on that elbow pointed twenty-four degrees off. Traced
 * as FieldCanvas traces it, and checked against a sum over twenty thousand pieces. Fails on the fixed-step tracer. */
const angle = (u: {x: number; y: number}, v: {x: number; y: number}) =>
 Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y))))) * 180 / Math.PI;
describe('the arc at 1.8 pi, both signs, R = 2 and 4', () => {
 for (const size of [4, 8]) for (const charge of [-2, 2]) it(`R = ${size / 2}, Q = ${charge}`, () => {
  const shape = {...DEFAULT_PARAMS, phi: 1.8 * Math.PI, charge, size, slices: 0, continuum: 0};
  const samples = sampleDistribution('arc', shape, 96), exact = sampleDistribution('arc', shape, 20000), coarse = coarsen(samples, 64);
  const R = Math.hypot(samples[0].position.x, samples[0].position.y);
  // FieldCanvas's options for this lesson: its reach, its step, a window about the size the figure shows.
  const reach = Math.max(2.5, shape.distance * 1.7, size);
  const span = Math.max(...coarse.map(s => Math.hypot(s.position.x, s.position.y, s.position.z)), 1), step = Math.min(reach, span) * .05;
  const bounds = {x0: -reach * 1.7, y0: -reach, x1: reach * 1.7, y1: reach}, limit = traceLimit(bounds, reach * 1.6);
  const lines = fieldLines(coarse, 15, {step, maxSteps: Math.min(1600, Math.max(420, Math.ceil(1.3 * limit / step))), outerLimit: limit, seedLimit: reach * .95, bounds,
   root: bodyFoot(coarse, 'wire'), finish: {samples, step: step / 4}});
  let near = 0;
  for (const line of lines) for (let i = 0; i + 1 < line.length; i++) {
   const a = line[i], b = line[i + 1];
   // Within a fifth of a metre of the axis, in the gap, and clear of the charge, whose own lumps the partition draws.
   if (Math.abs(a.y) > .2 || Math.abs(Math.hypot(a.x, a.y) - R) < .3) continue;
   near++;
   expect(angle({x: b.x - a.x, y: b.y - a.y}, planeField(exact, a)), `a chord at (${a.x.toFixed(2)}, ${a.y.toFixed(2)})`).toBeLessThan(10);
  }
  expect(near, 'chords near the axis').toBeGreaterThan(4);
  // Every head, laid on the screen as the canvas lays them, points along the field.
  const unit = 300 / reach, toScreen = (q: {x: number; y: number}) => ({x: 360 + q.x * unit, y: 215 - q.y * unit});
  let heads = 0;
  for (const line of lines) for (const h of lineHeads(line.map(toScreen), {x: 42, y: 54, width: 626, height: 317})) {
   const at = {x: (h.x - 360) / unit, y: (215 - h.y) / unit};
   if (Math.abs(Math.hypot(at.x, at.y) - R) < .3) continue;
   heads++;
   expect(angle({x: h.dx, y: -h.dy}, planeField(exact, at)), `the head at (${at.x.toFixed(2)}, ${at.y.toFixed(2)})`).toBeLessThan(5);
  }
  expect(heads).toBeGreaterThan(8);
 });
});
