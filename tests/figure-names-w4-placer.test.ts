import {describe, expect, it} from 'vitest';
import {boxSegmentDistance, placeLabels, type Box, type Segment} from '../src/diagrams/labels';
/* FOUR RULES THE PLACER WAS MISSING, each one a name the run showed by the wrong thing.
 *
 * A spot was "free" when no box was in it, so a name whose arrow was not cut into boxes near it took a spot with
 * that arrow running through it -- ΔE_x across its own shaft and the axis. A radius' letter was held to nothing but
 * its reach, and settled by the line from P to the piece, r_i's line. A leg drawn in two strokes counted its own
 * second stroke as another line, so its letter had nowhere honest to go. And with nothing free, a kept name's
 * least-bad spot was costed by area alone, so it was set on another name's letters -- the sum's name on P's. */
const shifted = (b: Box, n: {dx: number; dy: number}): Box => ({x: b.x + n.dx, y: b.y + n.dy, width: b.width, height: b.height});
const crosses = (b: Box, s: Segment) => boxSegmentDistance({x: b.x + 1, y: b.y + 1, width: b.width - 2, height: b.height - 2}, s) === 0;
const meet = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const frame = {width: 400, height: 300};
describe('the placer', () => {
 it('never takes a spot a line runs through as free, though no box is in it', () => {
  // A name whose own spot has a line of the construction straight through it -- a line the caller did not cut into
  // squares there.
  const own: Box = {x: 100, y: 100, width: 30, height: 20};
  const line: Segment = {a: {x: 115, y: 60}, b: {x: 115, y: 160}};
  const out = placeLabels([{box: own, keep: true}], {frame, pad: 2, labelPad: 8, maxShift: 24, lines: [line]});
  expect(crosses(shifted(own, out[0]), line), 'not set across the line').toBe(false);
 });
 it('holds the name of a line to that line, not to the construction beside it', () => {
  // A radius from (100, 200) to (250, 200), its letter asked for above it -- where a line from P to the piece runs
  // closer than the radius does. Left free, it stayed by that line.
  const radius: Segment = {a: {x: 100, y: 200}, b: {x: 250, y: 200}};
  const toPiece: Segment = {a: {x: 140, y: 150}, b: {x: 260, y: 165}};
  const own: Box = {x: 170, y: 168, width: 12, height: 18};
  const out = placeLabels([{box: own, keep: true, shaft: radius, amongLines: true}], {frame, pad: 2, labelPad: 8, maxShift: 30, lines: [toPiece, radius]});
  const at = shifted(own, out[0]);
  expect(boxSegmentDistance(at, radius) + 3, 'nearer its own line than the line to the piece').toBeLessThanOrEqual(boxSegmentDistance(at, toPiece));
 });
 it('counts a stroke that is part of a name\'s own line as its own', () => {
  // A leg drawn dashed from its foot to where r_i meets it, and as a hairline on past: one line, two strokes.
  const leg: Segment = {a: {x: 100, y: 100}, b: {x: 100, y: 200}};
  const parts: Segment[] = [{a: {x: 100, y: 160}, b: {x: 100, y: 200}}, {a: {x: 100, y: 100}, b: {x: 100, y: 160}}];
  const own: Box = {x: 106, y: 140, width: 12, height: 18};
  const out = placeLabels([{box: own, keep: true, shaft: leg, amongLines: true}], {frame, pad: 2, labelPad: 8, maxShift: 24, lines: parts});
  expect(out[0], 'left where it asked to be').toEqual({dx: 0, dy: 0});
 });
 it('with nothing free, sets a kept name across a stroke before it sets it on another name', () => {
  // P's name is placed first, and the sum's asks for the same spot; every other spot within its reach has a stroke
  // through it. Costed by area, the spot on P's letters was the cheapest of all.
  const p: Box = {x: 90, y: 90, width: 20, height: 20};
  const strokes: Segment[] = [{a: {x: 0, y: 85}, b: {x: 200, y: 85}}, {a: {x: 0, y: 115}, b: {x: 200, y: 115}}, {a: {x: 85, y: 0}, b: {x: 85, y: 200}}, {a: {x: 115, y: 0}, b: {x: 115, y: 200}}];
  const out = placeLabels([{box: p, fixed: true}, {box: {...p}, keep: true}], {frame: {width: 200, height: 200}, pad: 2, labelPad: 8, maxShift: 24, shafts: strokes, leaderReach: 1});
  expect(meet(shifted(p, out[1]), p), 'not on P\'s name').toBe(false);
 });
});
