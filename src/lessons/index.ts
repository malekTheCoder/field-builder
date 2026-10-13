/// <reference types="vite/client" />
import {hold} from '../problems/prose';
import type {ProblemId} from '../problems/types';
import type {Lesson, LessonBlock} from './types';
export type {Lesson, LessonBlock, LessonSection, Reading} from './types';
/* EVERY FILE BESIDE THIS ONE IS A LESSON. A lesson is one file, `src/lessons/<id>.ts`, exporting `lesson`, and it is
 * found here by its name: nothing else is edited to add one. Lessons are written in parallel, one geometry each,
 * and a list every author had to add a line to was a conflict on every merge. The file's `lesson.id` is the
 * lesson it belongs to, checked against PROBLEMS by tests/lessons.test.ts; a geometry with no file shows no
 * lesson, and the page above its figure is as it was. */
const files = import.meta.glob<Lesson>(['./*.ts', '!./index.ts', '!./types.ts'], {eager: true, import: 'lesson'});
/** A lesson as the page shows it: its sentences held as the rest of the lesson's are (prose.ts), so "E_y = 0" or
 * "kQ/r²" written in plain words never breaks across a line. A $…$ span passes through untouched. */
const held = (l: Lesson): Lesson => ({...l, lead: hold(l.lead),
  sections: l.sections.map(s => ({...s, body: s.body.map((b: LessonBlock) => typeof b === 'string' ? hold(b) : b)}))});
const LESSONS = new Map<string, Lesson>(Object.values(files).filter(Boolean).map(l => [l.id, held(l)]));
/** The lesson at the top of a geometry's page, or nothing where none is written yet. */
export function lessonFor(id: ProblemId): Lesson | undefined {
  return LESSONS.get(id);
}
/** Every lesson written, in no particular order: for the tests that hold all of them to the same rules. */
export const LESSON_LIST: Lesson[] = [...LESSONS.values()];
