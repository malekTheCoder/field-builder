import {getProblem} from '../problems/definitions';
import type {ProblemId} from '../problems/types';
import {PROBLEM_IDS} from '../distributions';
import {gaussHref, gaussLesson} from '../gauss';
import type {GaussId} from '../gauss/types';
import {STAGE_KEYS, stageNames, type GaussStageKey} from '../gauss/run';
import {MISCONCEPTION} from './misconceptions';
import type {Answer, GaussPointer, Kind, Misconception, Pointer, Question, ShapeId, StageWord} from './types';
import {bank as bisector} from './bank/bisector';
import {bank as ring} from './bank/ring';
import {bank as infinite} from './bank/infinite';
import {bank as axial} from './bank/axial';
import {bank as endpoint} from './bank/endpoint';
import {bank as ramp} from './bank/ramp';
import {bank as semi} from './bank/semi';
import {bank as vRodBisector} from './bank/v-rod-bisector';
import {bank as vRodAxial} from './bank/v-rod-axial';
import {bank as disk} from './bank/disk';
import {bank as annulus} from './bank/annulus';
import {bank as sheet} from './bank/sheet';
import {bank as arc} from './bank/arc';
import {bank as vRing} from './bank/v-ring';
import {bank as vDisk} from './bank/v-disk';
import {bank as vArc} from './bank/v-arc';
import {bank as unevenArc} from './bank/uneven-arc';
import {bank as gSymmetry} from './bank/gauss-symmetry';
import {bank as gFlux} from './bank/gauss-flux';
import {bank as gInside} from './bank/gauss-inside';
import {bank as gQenc} from './bank/gauss-qenc';
import {bank as gSpheres} from './bank/gauss-spheres';
import {bank as gLines} from './bank/gauss-lines';
import {bank as gSheets} from './bank/gauss-sheets';
import {bank as gConductors} from './bank/gauss-conductors';
import {bank as gHoles} from './bank/gauss-holes';
import {bank as gRunsOut} from './bank/gauss-runs-out';
import {bank as gHard} from './bank/gauss-hard';

/* THE QUIZ'S ENGINE: pure functions, no React and no page, so every rule here is tested in node. It draws a
 * quiz from the shapes, kinds and length the student chose; scores it; finds the misconceptions behind the
 * wrong answers; builds a quiz weighted toward those; and keeps a small history in this browser so missed
 * questions come back first. Nothing here touches the network. */

/** The bank, by shape: the integral lessons by ProblemId, the Gauss's law lessons by GaussId (their files are
 * `bank/gauss-<id>.ts`). A shape with no bank yet is listed on the set-up screen as coming soon. */
export const BANKS: Partial<Record<ShapeId, Question[]>> = {
  bisector, ring, infinite,
  axial, endpoint, ramp, semi, 'v-rod-bisector': vRodBisector, 'v-rod-axial': vRodAxial,
  disk, annulus, sheet, arc, 'uneven-arc': unevenArc, 'v-ring': vRing, 'v-disk': vDisk, 'v-arc': vArc,
  symmetry: gSymmetry, flux: gFlux, inside: gInside, qenc: gQenc, spheres: gSpheres,
  lines: gLines, sheets: gSheets, conductors: gConductors, holes: gHoles, 'runs-out': gRunsOut, hard: gHard,
};
export const BANK: Question[] = Object.values(BANKS).flat();
export const QUESTION = new Map(BANK.map(q => [q.id, q]));
export const QUIZ_SHAPES = Object.keys(BANKS) as ShapeId[];

/* A SHAPE IS AN INTEGRAL LESSON OR A GAUSS LESSON. These say which, and give its names and its address, so
 * nothing else in the quiz needs to know there are two kinds. */
const INTEGRAL = new Set<string>(PROBLEM_IDS);
export const isGauss = (id: ShapeId): id is GaussId => !INTEGRAL.has(id);
export const isGaussPointer = (p: Pointer): p is GaussPointer => isGauss(p.lesson);
/** The name a list shows it by ("Ring of charge", "Spheres"). A Gauss name may hold `Q_enc`, which the page sets
 * as Q with enc below it (plannedName in explorer/lessons). */
export const shapeShort = (id: ShapeId) => isGauss(id) ? gaussLesson(id)!.short : getProblem(id).short;
export const shapeTitle = (id: ShapeId) => isGauss(id) ? gaussLesson(id)!.title : getProblem(id).title;
export const shapeHref = (id: ShapeId) => isGauss(id) ? gaussHref(id) : `?p=${id}`;

export const KINDS: {id: Kind; name: string; about: string}[] = [
  {id: 'predict', name: 'Predict', about: 'What cancels, which way the field points, how it changes.'},
  {id: 'setup', name: 'Set up', about: 'One piece’s charge and field, the projection, the bounds.'},
  {id: 'check', name: 'Check', about: 'Limiting cases: far away, up close, at the centre.'},
  {id: 'transfer', name: 'Transfer', about: 'What changes if P moves, the charge flips sign, or part of it goes.'},
];
export type Length = 'short' | 'medium' | 'long';
export const LENGTHS: {id: Length; name: string; count: number; about: string}[] = [
  {id: 'short', name: 'Short', count: 6, about: 'Six questions'},
  {id: 'medium', name: 'Medium', count: 12, about: 'Twelve questions'},
  {id: 'long', name: 'Long', count: 20, about: 'Twenty questions'},
];
export type Settings = {shapes: ShapeId[]; kinds: Kind[]; length: Length};
export const DEFAULT_SETTINGS: Settings = {shapes: [...QUIZ_SHAPES], kinds: KINDS.map(k => k.id), length: 'short'};

/** A question as it is asked: its choices in the order they are shown, as indices into its own list. */
export type Drawn = {question: Question; order: number[]};
export type Result = {question: Question; answer: Answer; right: boolean};
export type Rng = () => number;

export function shuffle<T>(xs: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const ask = (q: Question, rng: Rng): Drawn => ({question: q, order: shuffle(q.choices.map((_, i) => i), rng)});
export const correctIndex = (q: Question) => q.choices.findIndex(c => c.correct);

/** THE DRAW. Even across the chosen shapes, a question from each in turn, so a short quiz on three shapes is
 * two of each; within a shape, questions missed before come first, then ones never asked, each group shuffled.
 * The quiz then asks the missed ones first and the rest in a shuffled order, so the kinds and shapes mix. */
export function draw(settings: Settings, history: History = emptyHistory(), rng: Rng = Math.random, bank: Question[] = BANK): Drawn[] {
  const count = LENGTHS.find(l => l.id === settings.length)?.count ?? LENGTHS[0].count;
  const missed = new Set(history.missed), asked = new Set(history.asked);
  const pools = shuffle(settings.shapes, rng).map(shape => {
    const pool = bank.filter(q => q.lesson === shape && settings.kinds.includes(q.kind));
    const group = (q: Question) => missed.has(q.id) ? 0 : asked.has(q.id) ? 2 : 1;
    return [0, 1, 2].flatMap(g => shuffle(pool.filter(q => group(q) === g), rng));
  });
  const picked: Question[] = [];
  for (let round = 0; picked.length < count; round++) {
    const before = picked.length;
    for (const pool of pools) if (round < pool.length && picked.length < count) picked.push(pool[round]);
    if (picked.length === before) break;
  }
  return order(picked, missed, rng).map(q => ask(q, rng));
}
/** Missed questions first, then the rest, each shuffled. */
function order(qs: Question[], missed: Set<string>, rng: Rng) {
  return [...shuffle(qs.filter(q => missed.has(q.id)), rng), ...shuffle(qs.filter(q => !missed.has(q.id)), rng)];
}

/** "Retry the ones you missed": those questions again, in a new order, with their choices reshuffled. */
export function drawAgain(ids: string[], rng: Rng = Math.random): Drawn[] {
  return shuffle(ids.flatMap(id => QUESTION.get(id) ?? []), rng).map(q => ask(q, rng));
}

/** "Quiz again on my weak spots": from the same shapes and kinds, the questions whose wrong choices come from
 * the misconceptions that came up, weighted by how often each did; questions the student missed come first,
 * and the rest of the quiz is filled from the shapes as an ordinary draw would. */
export function drawWeak(settings: Settings, weights: Map<string, number>, history: History = emptyHistory(), rng: Rng = Math.random, bank: Question[] = BANK): Drawn[] {
  const count = LENGTHS.find(l => l.id === settings.length)?.count ?? LENGTHS[0].count;
  const missed = new Set(history.missed);
  const pool = bank.filter(q => settings.shapes.includes(q.lesson) && settings.kinds.includes(q.kind));
  const weight = (q: Question) => [...new Set(q.choices.flatMap(c => c.misconception ?? []))].reduce((s, m) => s + (weights.get(m) ?? 0), 0);
  const scored = shuffle(pool, rng).map(q => ({q, w: weight(q) + (missed.has(q.id) ? .5 : 0)}));
  const picked = scored.filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, count).map(x => x.q);
  if (picked.length < count) for (const d of draw(settings, history, rng, bank)) if (picked.length < count && !picked.includes(d.question)) picked.push(d.question);
  return order(picked, missed, rng).map(q => ask(q, rng));
}

export function grade(drawn: Drawn[], answers: Answer[]): Result[] {
  return answers.flatMap(a => {
    const d = drawn.find(x => x.question.id === a.id);
    return d ? [{question: d.question, answer: a, right: d.question.choices[a.choice]?.correct === true}] : [];
  });
}

export type ShapeScore = {lesson: ShapeId; right: number; total: number};
export function score(results: Result[]) {
  const byShape: ShapeScore[] = [];
  for (const r of results) {
    let s = byShape.find(x => x.lesson === r.question.lesson);
    if (!s) byShape.push(s = {lesson: r.question.lesson, right: 0, total: 0});
    s.total++; if (r.right) s.right++;
  }
  return {right: results.filter(r => r.right).length, total: results.length, byShape};
}

/** The misconception behind each wrong answer, counted, with the shapes it came up on. */
export type Tally = {misconception: Misconception; count: number; lessons: Map<ShapeId, number>; questions: Question[]};
export function tally(results: Result[]): Tally[] {
  const out = new Map<string, Tally>();
  for (const r of results) {
    if (r.right) continue;
    const id = r.question.choices[r.answer.choice]?.misconception, m = id ? MISCONCEPTION.get(id) : undefined;
    if (!m) continue;
    const t: Tally = out.get(m.id) ?? {misconception: m, count: 0, lessons: new Map(), questions: []};
    t.count++; t.lessons.set(r.question.lesson, (t.lessons.get(r.question.lesson) ?? 0) + 1); t.questions.push(r.question);
    out.set(m.id, t);
  }
  // Most often first; a tie goes to the one met first, which is the order the student saw them in.
  return [...out.values()].sort((a, b) => b.count - a.count);
}
/** Where to send the student for a misconception: its pointer for the shape it came up on most, so a slip on
 * the ring opens the ring; the misconception's own first pointer when it has none for that shape. */
export function pointerFor(t: Tally): Pointer {
  const shapes = [...t.lessons.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  for (const s of shapes) { const p = t.misconception.review.find(x => x.lesson === s); if (p) return p; }
  return t.misconception.review[0];
}
/** The two or three that came up most: three when there are three, never one counted once among many. */
export function weakSpots(results: Result[], most = 3): Tally[] {
  return tally(results).slice(0, most);
}

/** Wrong but sure is the most important thing to look at; right but guessing is worth a second look. */
export function confidence(results: Result[]) {
  return {wrongSure: results.filter(r => !r.right && r.answer.sure), rightGuessing: results.filter(r => r.right && !r.answer.sure)};
}

/** The lessons to revisit: each shape with a wrong answer, most wrong first, with where to look. */
export function toRevisit(results: Result[]): {lesson: ShapeId; wrong: number; pointers: Pointer[]}[] {
  const out: {lesson: ShapeId; wrong: number; pointers: Pointer[]}[] = [];
  for (const r of results) {
    if (r.right) continue;
    let x = out.find(o => o.lesson === r.question.lesson);
    if (!x) out.push(x = {lesson: r.question.lesson, wrong: 0, pointers: []});
    x.wrong++;
    if (!x.pointers.some(p => samePointer(p, r.question.review))) x.pointers.push(r.question.review);
  }
  return out.sort((a, b) => b.wrong - a.wrong);
}
export const samePointer = (a: Pointer, b: Pointer) => a.lesson === b.lesson && caseOf(a) === caseOf(b) && ('stage' in a ? 'stage' in b && a.stage === b.stage : 'section' in b && a.section === b.section);
const caseOf = (p: Pointer) => 'case' in p ? p.case : undefined;

/* HISTORY, in this browser only. Which questions are still missed (answered wrong and not since answered right),
 * which have been asked, and how often each misconception has come up. Read and written inside try/catch: with
 * storage blocked or full, a quiz still works, it only forgets. */
export const HISTORY_KEY = 'field-builder:quiz:v1';
export type History = {missed: string[]; asked: string[]; misconceptions: Record<string, number>};
export const emptyHistory = (): History => ({missed: [], asked: [], misconceptions: {}});
const ids = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && QUESTION.has(x)) : [];
export function readHistory(): History {
  try {
    const raw = localStorage.getItem(HISTORY_KEY), v = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== 'object') return emptyHistory();
    const m: Record<string, number> = {};
    if (v.misconceptions && typeof v.misconceptions === 'object')
      for (const [k, n] of Object.entries(v.misconceptions)) if (MISCONCEPTION.has(k) && typeof n === 'number' && Number.isFinite(n) && n > 0) m[k] = n;
    return {missed: ids(v.missed), asked: ids(v.asked), misconceptions: m};
  } catch { return emptyHistory(); }
}
export function writeHistory(h: History) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { /* kept for this visit only */ }
}
export function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* nothing kept to clear */ }
}
export const hasHistory = (h: History) => h.missed.length > 0 || h.asked.length > 0 || Object.keys(h.misconceptions).length > 0;
/** The history after a quiz: what was missed is added, what was answered right is no longer missed. */
export function record(h: History, results: Result[]): History {
  const missed = new Set(h.missed), asked = new Set(h.asked), m = {...h.misconceptions};
  for (const r of results) {
    asked.add(r.question.id);
    if (r.right) { missed.delete(r.question.id); continue; }
    missed.add(r.question.id);
    const id = r.question.choices[r.answer.choice]?.misconception;
    if (id) m[id] = (m[id] ?? 0) + 1;
  }
  return {missed: [...missed], asked: [...asked], misconceptions: m};
}

/* WHERE TO LOOK, in words and as an address. A stage opens the lesson with Watch it build held on that stage
 * (`?p=ring&stage=cancel`); a section opens the lesson, and the words say where on its page to look. */
export const STAGE_NAME: Record<StageWord, string> = {cut: 'Cut it up', piece: 'One piece', cancel: 'What cancels', add: 'Add them up', shrink: 'Shrink them'};
/** The parts of a lesson's page below the build that a pointer may name, besides the lesson's own headings. */
export const PAGE_SECTIONS = ['Limiting cases', 'Easy to confuse with'];
/** A stage's name as that lesson's own run says it: a disk, a sheet and the disk's potential are cut into
 * rings, and their second stage is One ring (src/explorer/buildRun.ts). */
export function stageName(lesson: ProblemId, stage: StageWord): string {
  const geometry = getProblem(lesson).geometry;
  return stage === 'piece' && (geometry === 'disk' || geometry === 'sheet' || geometry === 'annulus') ? 'One ring' : STAGE_NAME[stage];
}
/** A Gauss lesson's parts below its figure that a pointer may name, besides the lesson's own headings. */
export const GAUSS_PAGE_SECTIONS = ['Check the answer', 'Easy to confuse with'];
const GAUSS_STAGE_NAME = Object.fromEntries(STAGE_KEYS.map((k, i) => [k, stageNames()[i]])) as Record<GaussStageKey, string>;
/** What a pointer names on its lesson's page, in the page's own words: a stage of the run, or a section. */
export function pointerWord(p: Pointer): string {
  if (isGaussPointer(p)) return 'stage' in p ? GAUSS_STAGE_NAME[p.stage] : p.section;
  return 'stage' in p ? stageName(p.lesson, p.stage) : p.section;
}
/** WHERE TO LOOK IN A GAUSS LESSON. Its address opens it on the pointer's case and, for a stage, with Watch it build
 * held on that stage (`?g=spheres&case=shell&stage=right`), as an integral lesson's link opens its run; for a section,
 * the words say where on the page to look. The case is named in the title, where the lesson has a choice of them. */
function gaussPlace(p: GaussPointer): {href: string; title: string; where: string} {
  const lesson = gaussLesson(p.lesson)!, kase = p.case ? lesson.cases.find(c => c.key === p.case) : undefined;
  // A case's label may hold a comma of its own (Slab, densest at its middle), so it is quoted or bracketed.
  const named = kase && lesson.cases.length > 1 ? kase.label : '';
  const on = named ? ` on “${named}”` : '';
  const title = `${lesson.short}, ${pointerWord(p)}${named ? ` (${named})` : ''}`;
  const at = named ? {case: kase!.key} : {};
  if ('stage' in p) return {href: gaussHref(p.lesson, {...at, stage: p.stage}), title, where: `Opens the lesson${on}, at this stage of Watch it build.`};
  return {href: gaussHref(p.lesson, at), title,
    where: `Opens the lesson${on}. ${GAUSS_PAGE_SECTIONS.includes(p.section) ? `Look under ${p.section}, below the figure.` : `Press Read the lesson and look under ${p.section}.`}`};
}
export function place(p: Pointer): {href: string; title: string; where: string} {
  if (isGaussPointer(p)) return gaussPlace(p);
  const short = getProblem(p.lesson).short;
  if ('stage' in p) return {href: `?p=${p.lesson}&stage=${p.stage}`, title: `${short}, ${stageName(p.lesson, p.stage)}`, where: 'Opens the lesson at this stage of Watch it build.'};
  return {href: `?p=${p.lesson}`, title: `${short}, ${p.section}`,
    where: PAGE_SECTIONS.includes(p.section) ? `Opens the lesson. Look under ${p.section}, below the build.` : `Opens the lesson. Press Read the lesson and look under ${p.section}.`};
}

/** A count in words, for a page that prints no numerals. */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function inWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  return 'many';
}
