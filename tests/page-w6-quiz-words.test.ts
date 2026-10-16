import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
/* A FIELD DOES NOT PUSH A POINT. The lessons were held to this long ago (r1-content-prose, r2-content-truth): P is a
 * place where the field is asked for, not a charge, and "each positive piece pushes P" blurs the field into a force
 * on something that is not there. The quiz, written later, said it again in its feedback ("every piece pushes P
 * down a little", "the far rings push harder"). Its words are held to the same rule; the code's own `.push(` is not
 * a word. And the guide's potential mistake says what cancels honestly: opposite charges do cancel in V. */
const root = new URL('../src/quiz/', import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []; });
describe('the quiz\'s words', () => {
 it('never say a piece pushes P', () => {
  const found = files(root).flatMap(f => readFileSync(f, 'utf8').replace(/\.push\(/g, '').split('\n').map((line, i) => ({f, i, line}))
   .filter(({line}) => /\bpush(es|ed|ing)?\b/i.test(line)).map(({f, i}) => `${f.slice(root.length)}:${i + 1}`));
  expect(found).toEqual([]);
 });
 it('the guide does not say nothing ever cancels in a potential', () => {
  const guide = readFileSync(new URL('../src/guide/Guide.tsx', import.meta.url), 'utf8');
  expect(guide).not.toMatch(/no \$\\cos\\alpha\$ and nothing cancels/);
  expect(guide).toMatch(/with charge of one sign nothing cancels/);
 });
});
