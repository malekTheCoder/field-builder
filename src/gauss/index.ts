/// <reference types="vite/client" />
import {hold} from '../problems/prose';
import {GAUSS_READY} from '../problems/readiness';
import type {GaussCase, GaussId, GaussLesson} from './types';
import {STAGE_KEYS, type GaussStageKey} from './run';
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
/** Where on a Gauss lesson's page an address opens: one of its cases, and a stage of Watch it build held on its
 * finished frame, as an integral lesson's `&stage=` opens its run. */
export type GaussPlace = {case?: string; stage?: GaussStageKey};
/** A Gauss lesson's own address. `?g=` rather than `?p=`: a `p` names a Problem, and every reader of the
 * address (the Explorer, the assignment parser, the quiz) would have to learn to skip these. With a case and a
 * stage, `?g=spheres&case=shell&stage=right`: the link a teacher or the quiz sends lands on what it names. */
export const gaussHref = (id: string, at: GaussPlace = {}) => `?g=${id}${at.case ? `&case=${encodeURIComponent(at.case)}` : ''}${at.stage ? `&stage=${at.stage}` : ''}`;
/** The case and the stage an address names for `lesson`: the case by its key, the stage by its word (symmetry,
 * surface, left, right, solve) or its place in the run, one to five. Anything the lesson does not have is left out:
 * the lesson's first case, and the run closed. */
export function gaussPlaceOf(search: string, lesson: GaussLesson): {caseKey: string; stage: number | null} {
  const q = new URLSearchParams(search), key = q.get('case'), raw = (q.get('stage') ?? '').trim().toLowerCase();
  const kase = lesson.cases.find(c => c.key === key) ?? lesson.cases[0];
  const word = STAGE_KEYS.indexOf(raw as GaussStageKey), n = word >= 0 ? word + 1 : /^[1-9]$/.test(raw) ? Number(raw) : 0;
  return {caseKey: kase.key, stage: n >= 1 && n <= STAGE_KEYS.length ? n : null};
}
/** The Gauss lesson an address names, if it names a ready one. */
export function gaussIdOf(search: string): GaussId | null {
  const id = new URLSearchParams(search).get('g');
  return isGaussReady(id) ? id : null;
}
