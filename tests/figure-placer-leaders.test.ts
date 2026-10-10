import {describe, expect, it} from 'vitest';
import {boxSegmentDistance, nearestOnBox, placeLabels, type Box} from '../src/diagrams/labels';
/* A LEADER IS A STROKE.
 *
 * A name the placer had to take past its reach goes on a thin leader back to what it names. The placer
 * used to know only the name's box: it chose a far spot whose leader ran straight through another name
 * -- the angle's α through "rᵢ" on a phone -- and the names placed after it sat on the leader.
 *
 * The scene: a name boxed in by strokes on every side, so that within its reach it has nowhere to go,
 * and the first free spot past its reach is straight out to the right, on a leader along y = 110. */
const own: Box = {x: 100, y: 100, width: 14, height: 20}, from = {x: 107, y: 110};
const strokes: Box[] = [
 {x: 104, y: 107, width: 6, height: 6}, // what it names, under its own spot
 {x: 126, y: 40, width: 2, height: 140}, {x: 80, y: 40, width: 2, height: 140}, // right and left
 {x: 60, y: 78, width: 120, height: 2}, {x: 60, y: 140, width: 120, height: 2}, // above and below
];
const options = {frame: {width: 400, height: 300}, obstacles: strokes, pad: 2, labelPad: 2, maxShift: 24};
const shifted = (b: Box, n: {dx: number; dy: number}): Box => ({x: b.x + n.dx, y: b.y + n.dy, width: b.width, height: b.height});
const leaderOf = (at: Box) => ({a: from, b: nearestOnBox({x: at.x - 2, y: at.y - 2, width: at.width + 4, height: at.height + 4}, from)});
describe('the placer\'s leaders', () => {
 it('a name placed after a leader keeps off it', () => {
  const later: Box = {x: 116, y: 108, width: 4, height: 4};
  const out = placeLabels([{box: own, keep: true, from}, {box: later, keep: true}], options);
  expect(out[0].leader, 'the boxed-in name went out on a leader').toBe(true);
  expect(boxSegmentDistance(shifted(later, out[1]), leaderOf(shifted(own, out[0])))).toBeGreaterThan(0);
 });
 it('a name already placed is never crossed by a later name\'s leader', () => {
  const placedFirst: Box = {x: 116, y: 108, width: 4, height: 4};
  const out = placeLabels([{box: placedFirst, keep: true}, {box: own, keep: true, from}], options);
  // Straight out to the right, its leader would run through the name placed first: it goes where its
  // leader is clear of it, or is not put on a leader at all.
  if (out[1].leader) expect(boxSegmentDistance(shifted(placedFirst, out[0]), leaderOf(shifted(own, out[1])))).toBeGreaterThanOrEqual(1);
 });
});
