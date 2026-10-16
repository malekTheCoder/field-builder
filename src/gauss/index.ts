/// <reference types="vite/client" />
import {hold} from '../problems/prose';
import {GAUSS_READY} from '../problems/readiness';
import type {GaussCase, GaussId, GaussLesson} from './types';
export type {GaussCase, GaussId, GaussLesson} from './types';
/* EVERY FILE IN ./lessons IS A GAUSS LESSON, found here by its name as src/lessons/index.ts finds the integral
 * lessons: a new lesson is one new file, and nothing else is edited to add it but the readiness switch
 * (GAUSS_READY in src/problems/readiness.ts), which says when it is good enough to put in front of a reader. */
const files = import.meta.glob<GaussLesson>('./lessons/*.ts', {eager: true, import: 'lesson'});
/** A sentence as the page shows it: short formulas held together, as every lesson's are (prose.ts). */
const held = (l: GaussLesson): GaussLesson => ({...l, lead: hold(l.lead),
  sections: l.sections.map(s => ({...s, body: s.body.map(b => typeof b === 'string' ? hold(b) : b)})),
  cases: l.cases.map((c): GaussCase => ({...c, setup: hold(c.setup)}))});
const LESSONS = new Map<string, GaussLesson>(Object.values(files).filter(Boolean).map(l => [l.id, held(l)]));
/** Every Gauss lesson written, ready or not: for the tests that hold them all to the same rules. */
export const GAUSS_LESSONS: GaussLesson[] = [...LESSONS.values()];
/** A Gauss lesson by its id, or nothing where none is written. */
export const gaussLesson = (id: string): GaussLesson | undefined => LESSONS.get(id);
/** A Gauss lesson a reader may open: written, and switched on in readiness.ts. */
export const isGaussReady = (id: string | null | undefined): id is GaussId => !!id && GAUSS_READY.has(id) && LESSONS.has(id);
/** A Gauss lesson's own address. `?g=` rather than `?p=`: a `p` names a Problem, and every reader of the
 * address (the Explorer, the assignment parser, the quiz) would have to learn to skip these. */
export const gaussHref = (id: string) => `?g=${id}`;
/** The Gauss lesson an address names, if it names a ready one. */
export function gaussIdOf(search: string): GaussId | null {
  const id = new URLSearchParams(search).get('g');
  return isGaussReady(id) ? id : null;
}
