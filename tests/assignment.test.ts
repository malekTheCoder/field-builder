import { describe, expect, it } from 'vitest';
import { cleanParams, parseAssignment, serializeAssignment } from '../src/state/assignment';
import { DEFAULT_PARAMS } from '../src/problems/types';

describe('assignment URLs', () => {
 it('reads a teacher link and ignores junk', () => {
  const a = parseAssignment('?p=ring&mode=sum&r=2&N=8&pair=1&garbage=nope&distance=not-a-number');
  expect(a.id).toBe('ring');
  expect(a.mode).toBe('sum');
  expect(a.params?.distance).toBe(2);
  expect(a.params?.slices).toBe(8);
  expect(a.pair).toBe(true);
  expect(a.params?.size).toBeUndefined();
 });
 it('rejects unknown problems and modes without throwing', () => {
  expect(parseAssignment('?p=not-a-lesson&mode=explode')).toEqual({});
  expect(parseAssignment('%%%')).toEqual({});
  expect(parseAssignment('')).toEqual({});
 });
 it('clamps params to the live ranges', () => {
  expect(cleanParams({ distance: 99, slices: 1, charge: -4 }).distance).toBe(6);
  expect(cleanParams({ distance: 99, slices: 1 }).slices).toBe(3);
  expect(cleanParams({}).distance).toBe(DEFAULT_PARAMS.distance);
 });
 it('round-trips a compact query and omits defaults', () => {
  const q = serializeAssignment({ id: 'v-ring', mode: 'integrate', params: { distance: 2, size: 4, charge: 2, phi: Math.PI, element: .65, slices: 5, continuum: 0 } });
  expect(q).toContain('p=v-ring');
  expect(q).toContain('mode=integrate');
  expect(q).toContain('distance=2');
  expect(q).not.toContain('size=');
  const back = parseAssignment('?' + q);
  expect(back.id).toBe('v-ring');
  expect(back.mode).toBe('integrate');
  expect(back.params?.distance).toBe(2);
 });
 it('does not write a query for the default bisector', () => {
  expect(serializeAssignment({ id: 'bisector', mode: 'divide', params: DEFAULT_PARAMS })).toBe('');
 });
});
