import {describe, expect, it} from 'vitest';
import {parseAssignment, serializeAssignment} from '../src/state/assignment';
/* A LINK CAN SAY HOW THE FIGURE IS DRAWN: view=2d, flat, or view=3d, in space. Old links, without it, open each lesson
 * its own way, as they always did. */
describe('view in a link', () => {
 it('is read as a teacher might type it, and anything else is no view', () => {
  expect(parseAssignment('?p=bisector&view=3d').view).toBe('3d');
  expect(parseAssignment('?p=ring&view=2D').view).toBe('2d');
  expect(parseAssignment('?p=ring&view=%203d%20').view).toBe('3d');
  for (const bad of ['4d', 'flat', '', 'space']) expect(parseAssignment(`?p=ring&view=${bad}`).view, bad).toBeUndefined();
 });
 it('is written when given, and round-trips', () => {
  const q = serializeAssignment({id: 'bisector', view: '3d'});
  expect(q).toBe('view=3d&p=bisector');
  expect(parseAssignment(q)).toEqual({id: 'bisector', view: '3d'});
  expect(parseAssignment(serializeAssignment({id: 'ring', stage: 3, view: '2d'}))).toEqual({id: 'ring', stage: 3, view: '2d'});
 });
 it('leaves old links as they were', () => {
  expect(parseAssignment('?p=ring&stage=3')).toEqual({id: 'ring', stage: 3});
  expect(serializeAssignment({id: 'ring'})).toBe('p=ring');
  expect(serializeAssignment({id: 'bisector'})).toBe('');
 });
});
