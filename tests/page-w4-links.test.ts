import {describe, expect, it} from 'vitest';
import {cleanParams, parseAssignment, serializeAssignment} from '../src/state/assignment';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* A TEACHER'S LINK, IN THE UNITS AND WORDS A TEACHER USES.
 *
 * `phi` was radians while the slider is in degrees, so ?p=arc&phi=90 opened a closed ring with no field at P; and
 * no key opened a stage of the run, so "the ring, held at What cancels" could not be sent at all. */
const phi = (q: string) => parseAssignment(`?p=arc&phi=${q}`).params?.phi;
const deg = (d: number) => d * Math.PI / 180;

describe('phi', () => {
 it('a number past 2π, or marked deg, is degrees', () => {
  expect(phi('90')).toBeCloseTo(Math.PI / 2, 12);
  expect(phi('90deg')).toBeCloseTo(Math.PI / 2, 12);
  expect(phi('90%C2%B0')).toBeCloseTo(Math.PI / 2, 12);
  expect(phi('270 deg')).toBeCloseTo(deg(270), 12);
  expect(phi('360')).toBeCloseTo(2 * Math.PI, 12);
 });
 it('one marked pi is a multiple of π', () => {
  expect(phi('0.5pi')).toBeCloseTo(Math.PI / 2, 12);
  expect(phi('pi/2')).toBeCloseTo(Math.PI / 2, 12);
  expect(phi('3pi/2')).toBeCloseTo(1.5 * Math.PI, 12);
  expect(phi('2*pi')).toBeCloseTo(2 * Math.PI, 12);
  expect(phi('pi')).toBeCloseTo(Math.PI, 12);
  expect(phi('%CF%80%2F3')).toBeCloseTo(Math.PI / 3, 12);
 });
 it('a bare number up to 2π is radians, as every address the page wrote before', () => {
  // Exactly, not nearly: an old address opens the arc it always did.
  expect(phi('1.5707963267948966')).toBe(1.5707963267948966);
  expect(phi('3.141592653589793')).toBe(Math.PI);
  expect(phi(String(2 * Math.PI))).toBe(2 * Math.PI);
  expect(phi('0.6283185307179586')).toBe(.6283185307179586);
 });
 it('what is not an angle is no angle, and a degree out of range is held to the slider\'s', () => {
  for (const junk of ['', 'deg', 'pi/0', 'ninety', 'pi/x', '1e999']) expect(phi(junk), junk).toBeUndefined();
  expect(cleanParams({phi: phi('7')}).phi).toBeCloseTo(.1 * Math.PI, 12);
 });
 it('is written in whole degrees, marked, and read back as written', () => {
  expect(serializeAssignment({id: 'arc', params: {...DEFAULT_PARAMS, phi: Math.PI / 2}})).toBe('phi=90deg&p=arc');
  expect(serializeAssignment({id: 'arc', params: {...DEFAULT_PARAMS, phi: deg(93.6)}})).toContain('phi=94deg');
  for (const d of [18, 90, 135, 324, 360]) expect(parseAssignment('?' + serializeAssignment({id: 'arc', params: {...DEFAULT_PARAMS, phi: deg(d)}})).params?.phi).toBeCloseTo(deg(d), 12);
  // The default is still left out.
  expect(serializeAssignment({id: 'arc', params: DEFAULT_PARAMS})).toBe('p=arc');
 });
});

describe('stage', () => {
 it('a stage of the run, by its number or its word', () => {
  expect(parseAssignment('?p=ring&stage=3').stage).toBe(3);
  const words = ['cut', 'piece', 'cancel', 'add', 'shrink'];
  for (const [i, w] of words.entries()) expect(parseAssignment(`?p=ring&stage=${w}`).stage).toBe(i + 1);
  expect(parseAssignment('?p=ring&stage=Cancel%20').stage).toBe(3);
 });
 it('anything else is no stage', () => {
  for (const junk of ['0', '6', '2.5', '-1', 'middle', '']) expect(parseAssignment(`?p=ring&stage=${junk}`).stage, junk).toBeUndefined();
  expect(parseAssignment('?p=ring').stage).toBeUndefined();
 });
 it('is written as its number, and names the first lesson too', () => {
  expect(serializeAssignment({id: 'ring', params: DEFAULT_PARAMS, stage: 3})).toBe('stage=3&p=ring');
  // The first lesson at its defaults writes no query at all -- but a stage of it is not its defaults.
  expect(serializeAssignment({id: 'bisector', params: DEFAULT_PARAMS, stage: 5})).toBe('stage=5&p=bisector');
  expect(parseAssignment('?' + serializeAssignment({id: 'v-arc', params: {...DEFAULT_PARAMS, distance: 2}, stage: 4}))).toEqual({id: 'v-arc', params: {distance: 2}, stage: 4});
 });
});
