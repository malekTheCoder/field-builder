import {describe, expect, it} from 'vitest';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {isReady} from '../src/problems/readiness';

/* Every lesson's Next card goes to a lesson that is there, and the line it leaves under that lesson's title
 * says where the reader came from in words: no numerals, no em dashes, and in the shape the page sets it in. */
describe('the lessons\' links', () => {
 const linked = [...PROBLEMS, getProblem('infinite')].filter(p => p.link);
 it('every lesson leads somewhere', () => {
  expect(linked.length).toBeGreaterThanOrEqual(PROBLEMS.length);
 });
 for (const p of linked) it(`${p.id} → ${p.link!.id}`, () => {
  const {id, text, from} = p.link!;
  expect(id).not.toBe(p.id);
  expect(isReady(id)).toBe(true);
  expect(PROBLEMS.some(x => x.id === id)).toBe(true);
  // "From <where>: <why>", the page adds the full stop.
  expect(from).toMatch(/^From [^:]+: \S/);
  expect(from.endsWith('.')).toBe(false);
  for (const words of [text, from]) {
   expect(words).not.toMatch(/[0-9]/);
   expect(words).not.toMatch(/—/);
  }
 });
});
