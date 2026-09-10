import { describe, expect, it } from 'vitest';
import { intervalKey, partitionCount, pieceKey, seamFractions, seamKey, splitFractions, splitProgress } from '../src/diagrams/subdivision';

describe('dyadic partition', () => {
 it('starts at the student’s N and only doubles', () => {
  expect(partitionCount(5, 0)).toBe(5);
  expect(partitionCount(5, 1)).toBe(160);
  const values = Array.from({ length: 11 }, (_, i) => partitionCount(5, i / 10));
  for (let i = 1; i < values.length; i++) expect(values[i] === values[i - 1] || values[i] === 2 * values[i - 1]).toBe(true);
 });
 it('grows the next mid-cut before the count doubles', () => {
  expect(splitProgress(5, 0)).toBe(0);
  expect(splitProgress(5, 1)).toBe(1);
  expect(partitionCount(5, .05)).toBe(partitionCount(5, .15));
  expect(splitProgress(5, .15)).toBeGreaterThan(splitProgress(5, .05));
 });
});

describe('stable seam identity', () => {
 it('keeps existing cuts when N doubles', () => {
  const coarse = new Set(seamFractions(4).map(seamKey));
  const fine = new Set(seamFractions(8).map(seamKey));
  for (const key of coarse) expect(fine.has(key)).toBe(true);
  expect(fine.size).toBeGreaterThan(coarse.size);
 });
 it('names equal dyadic cuts the same way', () => {
  expect(seamKey(.5)).toBe(seamKey(4 / 8));
  expect(seamKey(.25)).toBe(seamKey(1 / 4));
  expect(seamKey(.5)).not.toBe(seamKey(.25));
 });
 it('promotes split midpoints to seams on the next doubling', () => {
  const growing = new Set(splitFractions(4).map(seamKey));
  const next = new Set(seamFractions(8).map(seamKey));
  for (const key of growing) expect(next.has(key)).toBe(true);
 });
});

describe('interval identity', () => {
 it('keeps the surviving half of each piece when N doubles', () => {
  const parent = Array.from({ length: 4 }, (_, i) => intervalKey(i, 4));
  const child = Array.from({ length: 8 }, (_, i) => intervalKey(i, 8));
  expect(child[0]).toBe(parent[0]);
  expect(child[2]).toBe(parent[1]);
  expect(child[4]).toBe(parent[2]);
  expect(child[6]).toBe(parent[3]);
  expect(new Set(child).size).toBe(8);
 });
 it('gives children a binary-path prefix of their parent', () => {
  expect(pieceKey(0, 8).startsWith(pieceKey(0, 4))).toBe(true);
  expect(pieceKey(1, 8).startsWith(pieceKey(0, 4))).toBe(true);
  expect(pieceKey(2, 8).startsWith(pieceKey(1, 4))).toBe(true);
 });
});
