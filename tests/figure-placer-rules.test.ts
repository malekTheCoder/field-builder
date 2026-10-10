import {describe, expect, it} from 'vitest';
import {boxSegmentDistance, nearestOnBox, placeLabels, segmentBoxes, type Box, type Segment} from '../src/diagrams/labels';
/* THREE RULES OF THE LABEL PLACER, each one a fault the run showed.
 *
 * With nowhere free, the least-bad spot was costed by overlap alone, so a name set across a five-unit
 * arrow cost almost nothing and ΔE_x was written on its own shaft. Re-solved from scratch every frame, a
 * name whose spots were near ties hopped between them. And the charge's tag, which always hangs from a line
 * back to its piece, had that line checked against other names only when it went past its reach. */
const shifted = (b: Box, n: {dx: number; dy: number}): Box => ({x: b.x + n.dx, y: b.y + n.dy, width: b.width, height: b.height});
const crosses = (b: Box, s: Segment) => boxSegmentDistance({x: b.x + 1, y: b.y + 1, width: b.width - 2, height: b.height - 2}, s) === 0;
describe('the placer', () => {
 it('with nothing free, sets a kept name anywhere before it sets it across an arrow', () => {
  // A name boxed in: an arrow runs through its own spot, another name stands right over it, and walls take
  // every other spot within reach. Costed by overlap alone, the arrow's thin stroke was the cheapest.
  const own: Box = {x: 100, y: 100, width: 30, height: 20};
  const shaft: Segment = {a: {x: 60, y: 110}, b: {x: 200, y: 110}};
  const other: Box = {x: 100, y: 80, width: 30, height: 20};
  const walls: Box[] = [{x: 60, y: 125, width: 140, height: 40}, {x: 40, y: 40, width: 50, height: 120}, {x: 135, y: 40, width: 60, height: 120}];
  // The arrow is a stroke to keep off, as the figure gives it: squares along it.
  const stroke = segmentBoxes(shaft.a, shaft.b, 5, {x: 0, y: 0, width: 300, height: 300});
  const out = placeLabels([{box: other, fixed: true}, {box: own, keep: true, shaft}], {frame: {width: 300, height: 300}, obstacles: [...walls, ...stroke], pad: 2, labelPad: 4, maxShift: 24, shafts: [shaft], leaderReach: 1});
  expect(crosses(shifted(own, out[1]), shaft), 'not written across the arrow').toBe(false);
 });
 it('holds a name where it stood last while its own spot is taken and that one is still free', () => {
  const own: Box = {x: 100, y: 100, width: 20, height: 16};
  const blocker: Box = {x: 98, y: 98, width: 24, height: 20};
  // Both above and below are free; the placer alone would go up first. Last time it stood below.
  const prefer = {x: 100, y: 124, width: 20, height: 16};
  const out = placeLabels([{box: own, prefer}], {frame: {width: 300, height: 300}, obstacles: [blocker], pad: 2, labelPad: 4, maxShift: 30});
  expect(out[0]).toEqual({dx: 0, dy: 24});
  // Its own spot comes back the moment it is free.
  expect(placeLabels([{box: own, prefer}], {frame: {width: 300, height: 300}, obstacles: [], pad: 2, labelPad: 4, maxShift: 30})[0]).toEqual({dx: 0, dy: 0});
 });
 it('keeps a tethered name\'s line off a name already placed, at every spot it tries', () => {
  const from = {x: 100, y: 200};
  const placedFirst: Box = {x: 108, y: 150, width: 40, height: 16};
  // Its own spot is right of the piece, beyond the first name: the line back to the piece would cross it.
  const tag: Box = {x: 120, y: 120, width: 24, height: 16};
  const out = placeLabels([{box: placedFirst, fixed: true}, {box: tag, from, tethered: true}], {frame: {width: 400, height: 300}, obstacles: [], pad: 2, labelPad: 4, maxShift: 30});
  if (out[1].hidden) return;
  const at = shifted(tag, out[1]), line = {a: from, b: nearestOnBox({x: at.x - 2, y: at.y - 2, width: at.width + 4, height: at.height + 4}, from)};
  expect(boxSegmentDistance(placedFirst, line)).toBeGreaterThanOrEqual(2);
 });
});
