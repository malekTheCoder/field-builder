import katex from 'katex';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getProblem, PROBLEMS} from '../src/problems/definitions';
import {isReady} from '../src/problems/readiness';
import {lessonFor} from '../src/lessons';
import {STAGE_WORDS} from '../src/state/assignment';
import {viewOf} from '../src/state/route';
import {gaussLesson, isGaussReady} from '../src/gauss';
import {STAGE_KEYS} from '../src/gauss/run';
import {MISCONCEPTION, MISCONCEPTIONS} from '../src/quiz/misconceptions';
import {BANK, BANKS, GAUSS_PAGE_SECTIONS, HISTORY_KEY, PAGE_SECTIONS, QUIZ_SHAPES, isGauss, isGaussPointer, pointerWord, shapeHref, clearHistory, confidence, draw, drawAgain, drawWeak, emptyHistory, grade, inWords, place, pointerFor, readHistory, record, score, tally, toRevisit, weakSpots, writeHistory, type Drawn} from '../src/quiz/engine';
import type {Answer, Pointer, Question} from '../src/quiz/types';
import type {ProblemId} from '../src/problems/types';

/* QUIZ YOURSELF, the bank and the engine. The bank's rules (docs/quiz-plan.md): exactly one right choice, a
 * named misconception and a reason on every wrong one, a real place to look for every question and every
 * misconception, TeX that KaTeX sets strictly, no numerals outside $…$ and no em dashes. The engine's: an even
 * draw that keeps to the kinds and the length, missed questions first, and a tally of what went wrong. */

/** A seeded generator, so a draw is the same every run. */
const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
/** Every visible string of a question, as written: prose with $…$, and TeX. */
const prose = (q: Question) => [q.prompt, q.explanation, ...q.choices.flatMap(c => [c.text ?? '', c.why ?? ''])];
const texOf = (q: Question) => [...prose(q).flatMap(t => t.split('$').filter((_, i) => i % 2)), ...q.choices.flatMap(c => c.tex ?? [])];
const outsideMath = (t: string) => t.split('$').filter((_, i) => i % 2 === 0).join(' ');
const pointerIsReal = (p: Pointer) => {
 if (isGaussPointer(p)) {
  // A Gauss lesson, ready; its case, if it names one, one of the lesson's; a stage of the run, which belongs to a
  // case, so it names one where there is a choice; or a heading of its text or a part below its figure.
  const l = gaussLesson(p.lesson);
  if (!l || !isGaussReady(p.lesson)) return `${p.lesson} is not a live Gauss lesson`;
  if (p.case !== undefined && !l.cases.some(c => c.key === p.case)) return `${p.lesson} has no case ${p.case}`;
  if ('stage' in p) return !(STAGE_KEYS as readonly string[]).includes(p.stage) ? `${p.stage} is not a stage` : l.cases.length > 1 && !p.case ? `${p.lesson}: a stage needs its case` : '';
  return l.sections.some(s => s.heading === p.section) || GAUSS_PAGE_SECTIONS.includes(p.section) ? '' : `${p.lesson} has no section ${p.section}`;
 }
 if (!PROBLEMS.some(x => x.id === p.lesson) || !isReady(p.lesson)) return `${p.lesson} is not a live lesson`;
 if ('stage' in p) return (STAGE_WORDS as readonly string[]).includes(p.stage) ? '' : `${p.stage} is not a stage`;
 const headings = lessonFor(p.lesson)?.sections.map(s => s.heading) ?? [];
 if (p.section === 'Limiting cases' && !getProblem(p.lesson).limits?.length) return `${p.lesson} has no limiting cases`;
 return headings.includes(p.section) || PAGE_SECTIONS.includes(p.section) ? '' : `${p.lesson} has no section ${p.section}`;
};

describe('the bank', () => {
 it('has eight to ten questions for each of its shapes, with unique ids, and all four kinds', () => {
  // Every shape with a bank is a live lesson: every integral lesson has its bank, and the Gauss lessons with one
  // are ready ones.
  const integral = QUIZ_SHAPES.filter(id => !isGauss(id)), gauss = QUIZ_SHAPES.filter(isGauss);
  for (const shape of integral) expect(PROBLEMS.some(p => p.id === shape) && isReady(shape as ProblemId), shape).toBe(true);
  expect([...integral].sort()).toEqual(PROBLEMS.map(p => p.id).sort());
  for (const shape of gauss) expect(isGaussReady(shape), shape).toBe(true);
  expect(gauss.length).toBeGreaterThanOrEqual(5);
  for (const [shape, qs] of Object.entries(BANKS)) {
   expect(qs!.length, shape).toBeGreaterThanOrEqual(8); expect(qs!.length, shape).toBeLessThanOrEqual(10);
   expect(qs!.every(q => q.lesson === shape && q.id.startsWith(shape + '-')), shape).toBe(true);
   expect(new Set(qs!.map(q => q.kind)).size, shape).toBe(4);
  }
  expect(new Set(BANK.map(q => q.id)).size).toBe(BANK.length);
 });
 it('gives every question exactly one right choice, and every wrong one a real misconception and a reason', () => {
  for (const q of BANK) {
   expect(q.choices.filter(c => c.correct).length, q.id).toBe(1);
   expect(q.choices.length, q.id).toBeGreaterThanOrEqual(3);
   for (const c of q.choices) {
    expect(!!c.text !== !!c.tex, `${q.id}: a choice is words or a formula`).toBe(true);
    if (c.correct) { expect(c.misconception, q.id).toBeUndefined(); continue; }
    expect(MISCONCEPTION.has(c.misconception ?? ''), `${q.id}: ${c.misconception}`).toBe(true);
    expect((c.why ?? '').length, `${q.id}: a wrong choice says why`).toBeGreaterThan(30);
   }
   expect(q.explanation.length, q.id).toBeGreaterThan(40);
   // no two choices the same
   expect(new Set(q.choices.map(c => c.text ?? c.tex)).size, q.id).toBe(q.choices.length);
  }
 });
 it('points every question and every misconception at a real lesson, stage or section', () => {
  for (const q of BANK) expect(pointerIsReal(q.review), q.id).toBe('');
  for (const m of MISCONCEPTIONS) { expect(m.review.length, m.id).toBeGreaterThan(0); for (const p of m.review) expect(pointerIsReal(p), m.id).toBe(''); }
  expect(new Set(MISCONCEPTIONS.map(m => m.id)).size).toBe(MISCONCEPTIONS.length);
 });
 it('sets every formula with KaTeX in strict mode', () => {
  const all = [...BANK.flatMap(texOf), ...MISCONCEPTIONS.flatMap(m => [m.name, m.idea].flatMap(t => t.split('$').filter((_, i) => i % 2)))];
  expect(all.length).toBeGreaterThan(100);
  for (const tex of all) expect(() => katex.renderToString(tex, {strict: 'error', throwOnError: true}), tex).not.toThrow();
  for (const t of [...BANK.flatMap(prose), ...MISCONCEPTIONS.flatMap(m => [m.name, m.idea])]) expect(t.split('$').length % 2, `unbalanced $ in: ${t}`).toBe(1);
 });
 it('prints no numerals outside its formulas, and no em dash anywhere', () => {
  const words = [...BANK.flatMap(prose), ...MISCONCEPTIONS.flatMap(m => [m.name, m.idea])];
  for (const t of words) { expect(outsideMath(t), t).not.toMatch(/[0-9]/); expect(t, t).not.toMatch(/—/); }
  for (const q of BANK) for (const p of [q.review, ...q.choices.flatMap(() => [])]) expect(place(p).title + place(p).where).not.toMatch(/[0-9—]/);
 });
 it('uses every misconception in the catalogue', () => {
  const used = new Set(BANK.flatMap(q => q.choices.flatMap(c => c.misconception ?? [])));
  expect(MISCONCEPTIONS.map(m => m.id).filter(id => !used.has(id))).toEqual([]);
 });
 it('names the stage the lesson’s own run names: One ring for the shapes cut into rings', () => {
  for (const id of ['disk', 'sheet', 'v-disk'] as const) expect(place({lesson: id, stage: 'piece'}).title).toBe(`${getProblem(id).short}, One ring`);
  for (const id of ['ring', 'arc', 'v-ring', 'v-arc'] as const) expect(place({lesson: id, stage: 'piece'}).title).toBe(`${getProblem(id).short}, One piece`);
 });
});

describe('the draw', () => {
 const kinds = ['predict', 'setup', 'check', 'transfer'] as const;
 it('draws evenly across the chosen shapes, to the chosen length', () => {
  for (let seed = 1; seed < 30; seed++) {
   const d = draw({shapes: ['bisector', 'ring', 'infinite'], kinds: [...kinds], length: 'short'}, emptyHistory(), seeded(seed));
   expect(d.length).toBe(6);
   for (const s of ['bisector', 'ring', 'infinite']) expect(d.filter(x => x.question.lesson === s).length).toBe(2);
   expect(new Set(d.map(x => x.question.id)).size).toBe(6);
  }
  const medium = draw({shapes: ['bisector', 'ring'], kinds: [...kinds], length: 'medium'}, emptyHistory(), seeded(3));
  expect(medium.length).toBe(12); expect(medium.filter(x => x.question.lesson === 'ring').length).toBe(6);
  // Long asks more than one shape holds: it stops when the shape runs out.
  expect(draw({shapes: ['ring'], kinds: [...kinds], length: 'long'}, emptyHistory(), seeded(4)).length).toBe(BANKS.ring!.length);
 });
 it('keeps to the chosen kinds', () => {
  const d = draw({shapes: ['bisector', 'ring', 'infinite'], kinds: ['check'], length: 'long'}, emptyHistory(), seeded(5));
  expect(d.length).toBe(Math.min(20, BANK.filter(q => q.kind === 'check' && ['bisector', 'ring', 'infinite'].includes(q.lesson)).length));
  expect(d.every(x => x.question.kind === 'check')).toBe(true);
  expect(draw({shapes: ['ring'], kinds: [], length: 'short'}, emptyHistory(), seeded(5))).toEqual([]);
 });
 it('shuffles: different seeds give different orders, and the choices are shuffled too', () => {
  const ids = (s: number) => draw({shapes: ['bisector', 'ring', 'infinite'], kinds: [...kinds], length: 'medium'}, emptyHistory(), seeded(s)).map(x => x.question.id).join();
  expect(new Set([1, 2, 3, 4, 5].map(ids)).size).toBeGreaterThan(1);
  const firsts = new Set<number>();
  for (let s = 1; s < 20; s++) for (const x of draw({shapes: ['ring'], kinds: [...kinds], length: 'short'}, emptyHistory(), seeded(s))) { expect([...x.order].sort((a, b) => a - b)).toEqual(x.question.choices.map((_, i) => i)); firsts.add(x.order[0]); }
  expect(firsts.size).toBeGreaterThan(1);
 });
 it('puts the questions missed before first', () => {
  const missed = ['ring-centre', 'infinite-dq'];
  for (let seed = 1; seed < 20; seed++) {
   const d = draw({shapes: ['bisector', 'ring', 'infinite'], kinds: [...kinds], length: 'short'}, {...emptyHistory(), missed}, seeded(seed));
   expect(new Set(d.slice(0, 2).map(x => x.question.id))).toEqual(new Set(missed));
  }
 });
 it('retries exactly the missed questions', () => {
  const d = drawAgain(['ring-centre', 'bisector-dq', 'nope'], seeded(2));
  expect(d.map(x => x.question.id).sort()).toEqual(['bisector-dq', 'ring-centre']);
 });
 it('weights a weak-spots quiz toward the misconceptions that came up', () => {
  const d = drawWeak({shapes: ['bisector', 'ring', 'infinite'], kinds: [...kinds], length: 'short'}, new Map([['jacobian', 3]]), emptyHistory(), seeded(7));
  expect(d.length).toBe(6);
  const withJacobian = BANK.filter(q => ['bisector', 'ring', 'infinite'].includes(q.lesson) && q.choices.some(c => c.misconception === 'jacobian')).map(q => q.id);
  expect(withJacobian.length).toBeGreaterThanOrEqual(3);
  for (const id of withJacobian) expect(d.map(x => x.question.id)).toContain(id);
 });
});

/** Answer a drawn quiz: wrong (with the first wrong choice) for the ids given, right for the rest. */
function answer(d: Drawn[], wrong: Record<string, string>, sure: (id: string) => boolean = () => true): Answer[] {
 return d.map(x => {
  const q = x.question, m = wrong[q.id];
  const choice = m ? q.choices.findIndex(c => c.misconception === m) : q.choices.findIndex(c => c.correct);
  return {id: q.id, choice, sure: sure(q.id)};
 });
}

describe('scoring and feedback', () => {
 const d = drawAgain(['bisector-integrand', 'ring-projection', 'infinite-what-survives', 'infinite-result', 'ring-centre', 'bisector-far'], seeded(1));
 const results = grade(d, answer(d, {'bisector-integrand': 'projection', 'infinite-what-survives': 'projection', 'infinite-result': 'projection', 'ring-centre': 'ring-point'}, id => id !== 'bisector-integrand' && id !== 'bisector-far'));
 it('scores by shape', () => {
  const s = score(results);
  expect(s.right).toBe(2); expect(s.total).toBe(6);
  const by = Object.fromEntries(s.byShape.map(b => [b.lesson, [b.right, b.total]]));
  expect(by).toEqual({bisector: [1, 2], ring: [1, 2], infinite: [0, 2]});
 });
 it('tallies the misconceptions, most often first, and sends each to the shape it came up on most', () => {
  const t = tally(results);
  expect(t.map(x => [x.misconception.id, x.count])).toEqual([['projection', 3], ['ring-point', 1]]);
  expect(pointerFor(t[0])).toEqual({lesson: 'infinite', stage: 'cancel'});
  expect(pointerFor(t[1]).lesson).toBe('ring');
  expect(weakSpots(results).length).toBe(2);
 });
 it('flags wrong but sure, and right but guessing', () => {
  const c = confidence(results);
  expect(c.wrongSure.map(r => r.question.id).sort()).toEqual(['infinite-result', 'infinite-what-survives', 'ring-centre']);
  expect(c.rightGuessing.map(r => r.question.id)).toEqual(['bisector-far']);
 });
 it('lists the lessons to revisit, most missed first', () => {
  const r = toRevisit(results);
  expect(r[0].lesson).toBe('infinite');
  expect(r.slice(1).map(x => x.lesson).sort()).toEqual(['bisector', 'ring']);
  expect(r[0].pointers.length).toBe(2);
 });
 it('says counts in words', () => {
  expect([0, 1, 6, 12, 20, 21, 45].map(inWords)).toEqual(['zero', 'one', 'six', 'twelve', 'twenty', 'twenty-one', 'forty-five']);
 });
});

describe('history', () => {
 const store = new Map<string, string>();
 beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }});
 });
 afterEach(() => { vi.unstubAllGlobals(); });
 it('records what was missed, forgets it once answered right, and counts misconceptions', () => {
  const d = drawAgain(['ring-centre', 'ring-dq'], seeded(1));
  let h = record(emptyHistory(), grade(d, answer(d, {'ring-centre': 'ring-point', 'ring-dq': 'whole-charge'})));
  expect(h.missed.sort()).toEqual(['ring-centre', 'ring-dq']);
  expect(h.misconceptions).toEqual({'ring-point': 1, 'whole-charge': 1});
  h = record(h, grade(d, answer(d, {'ring-dq': 'piece-length'})));
  expect(h.missed).toEqual(['ring-dq']);
  expect(h.misconceptions).toEqual({'ring-point': 1, 'whole-charge': 1, 'piece-length': 1});
  writeHistory(h);
  expect(readHistory()).toEqual(h);
  clearHistory();
  expect(store.has(HISTORY_KEY)).toBe(false);
  expect(readHistory()).toEqual(emptyHistory());
 });
 it('reads damaged or foreign history as empty, and keeps only what it knows', () => {
  store.set(HISTORY_KEY, '{not json'); expect(readHistory()).toEqual(emptyHistory());
  store.set(HISTORY_KEY, JSON.stringify({missed: ['ring-centre', 'gone', 3], asked: 'x', misconceptions: {'ring-point': 2, nope: 4, sign: -1}}));
  expect(readHistory()).toEqual({missed: ['ring-centre'], asked: [], misconceptions: {'ring-point': 2}});
 });
 it('works with no storage at all', () => {
  vi.stubGlobal('localStorage', {getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); }});
  expect(readHistory()).toEqual(emptyHistory());
  expect(() => { writeHistory(emptyHistory()); clearHistory(); }).not.toThrow();
 });
});

describe('the address', () => {
 it('?quiz is the quiz; a lesson still wins', () => {
  expect(viewOf('?quiz')).toBe('quiz');
  expect(viewOf('?quiz=ring')).toBe('quiz');
  expect(viewOf('?quiz&p=ring')).toBe('lesson');
  expect(viewOf('?guide')).toBe('guide');
  expect(viewOf('')).toBe('home');
 });
 it('opens a Gauss lesson at ?g=, and says which case and which stage or section to look at', () => {
  expect(shapeHref('spheres')).toBe('?g=spheres');
  expect(shapeHref('ring')).toBe('?p=ring');
  expect(viewOf(shapeHref('flux'))).toBe('gauss');
  const stage = place({lesson: 'spheres', stage: 'right', case: 'shell'});
  expect(stage.href).toBe('?g=spheres');
  // The case by the label the lesson's picker gives it.
  const shell = gaussLesson('spheres')!.cases.find(c => c.key === 'shell')!.label;
  expect(stage.title).toBe(`Spheres, Right side (${shell})`);
  expect(stage.where).toBe(`Opens the lesson. Choose “${shell}”, then press Watch it build and step to Right side.`);
  // A lesson with one case names none.
  expect(place({lesson: 'flux', stage: 'left'}).title).toBe('Flux, the idea, Left side');
  expect(place({lesson: 'flux', section: 'Easy to confuse with'}).where).toBe('Opens the lesson. Look under Easy to confuse with, below the figure.');
  expect(place({lesson: 'qenc', section: 'Normalising when you are given Q'}).where).toBe('Opens the lesson. Press Read the lesson and look under Normalising when you are given Q.');
  expect(pointerWord({lesson: 'symmetry', stage: 'surface', case: 'line'})).toBe('The surface');
  expect(pointerWord({lesson: 'ring', stage: 'cancel'})).toBe('What cancels');
 });
 it('opens a stage by its word, as the lesson reads it', () => {
  expect(place({lesson: 'ring', stage: 'cancel'}).href).toBe('?p=ring&stage=cancel');
  expect(place({lesson: 'ring', stage: 'cancel'}).title).toBe(`${getProblem('ring').short}, What cancels`);
  expect(viewOf(place({lesson: 'bisector', stage: 'cut'}).href)).toBe('lesson');
 });
});
