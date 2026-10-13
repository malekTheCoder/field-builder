import {describe, expect, it} from 'vitest';
import {placeLabels} from '../src/diagrams/labels';
import {orderedBounds} from '../src/diagrams/subdivision';
/* The figure's fifth wave, the parts with no browser in them: the integration handles that may not cross, and two
 * rules of the label placer -- the band across the top no name may enter, and the axes no name may straddle. */
describe('the integration handles keep the interval increasing', () => {
 // Crossed, every piece weighed −1 and the figure drew ΣΔE as minus the field, into a positive rod, while the board
 // refused the same interval ("Choose an increasing interval"). Equal, it drew no sum at all.
 it('stops a handle one step short of the other', () => {
  expect(orderedBounds([0, 50], 0, 80)).toEqual([49, 50]);
  expect(orderedBounds([30, 100], 1, 20)).toEqual([30, 31]);
  expect(orderedBounds([30, 100], 1, 30)).toEqual([30, 31]);
  expect(orderedBounds([0, 100], 0, 40)).toEqual([40, 100]);
  expect(orderedBounds([0, 100], 1, 60)).toEqual([0, 60]);
 });
 it('stays on the coordinate', () => {
  expect(orderedBounds([0, 100], 0, -5)).toEqual([0, 100]);
  expect(orderedBounds([0, 100], 1, 140)).toEqual([0, 100]);
  expect(orderedBounds([0, 100], 0, Number.NaN)).toEqual([0, 100]);
 });
});
describe('the placer', () => {
 const frame = {width: 720, height: 378};
 it('never sets a name in the band across the top, kept or not, when the frame says where the plot starts', () => {
  // A kept limit asking to stand in the title row: as an obstacle the row was one cost among others.
  const label = {box: {x: 300, y: 20, width: 60, height: 16}, keep: true};
  const [n] = placeLabels([label], {frame: {...frame, top: 48}, maxShift: 24});
  expect(label.box.y + n.dy).toBeGreaterThanOrEqual(48);
  const [loose] = placeLabels([label], {frame, maxShift: 24});
  expect(loose.dy, 'without the band it stays where it asked').toBe(0);
 });
 it('never lays a name across an axis, where a spot beside it is free', () => {
  const axis = {a: {x: 0, y: 200}, b: {x: 720, y: 200}};
  const label = {box: {x: 300, y: 192, width: 40, height: 16}, keep: true};
  const [n] = placeLabels([label], {frame, maxShift: 24, rules: [axis]});
  const b = {y: label.box.y + n.dy, height: label.box.height};
  const core = {top: b.y + .15 * b.height, bottom: b.y + .85 * b.height};
  expect(core.top > 200 || core.bottom < 200, `centre band ${core.top}..${core.bottom} across y = 200`).toBe(true);
  const [loose] = placeLabels([label], {frame, maxShift: 24});
  expect(loose.dy, 'with no rule it stays on the axis').toBe(0);
 });
 it('lets a name touch an axis with the tail of a letter', () => {
  // The axis through the bottom tenth of the box: the descender's room, not the letters.
  const axis = {a: {x: 0, y: 206}, b: {x: 720, y: 206}};
  const [n] = placeLabels([{box: {x: 300, y: 191, width: 40, height: 16}}], {frame, maxShift: 24, rules: [axis]});
  expect(n).toEqual({dx: 0, dy: 0});
 });
});
