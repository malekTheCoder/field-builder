import katex from 'katex';
import {describe, expect, it} from 'vitest';
import {LESSON_LIST, lessonFor} from '../src/lessons';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {artifactHtml, escapeHtml, lessonArtifact} from '../src/state/artifact';
import {hold} from '../src/problems/prose';
import {lesson as bisector} from '../src/lessons/bisector';
/* THE LESSONS AT THE TOP OF THE PAGE (src/lessons), held to the page's rules. Each one is a file written on its
 * own, often by a different hand from the board below it, so what the page promises is checked here for every
 * lesson there is: it belongs to a geometry, its mathematics sets, it prints no numerals as values, and it is a
 * lesson's length, not a paragraph's nor a chapter's. */
const ids = new Set<string>(PROBLEMS.map(p => p.id));
/** Every paragraph of a lesson, the lead first: the text a reader reads, symbols written $…$. */
const paragraphs = (l: (typeof LESSON_LIST)[number]) => [l.lead, ...l.sections.flatMap(s => s.body.filter((b): b is string => typeof b === 'string'))];
/** Every piece of TeX in a lesson: its displays and each $…$ span of its sentences. */
const texOf = (l: (typeof LESSON_LIST)[number]) => [...l.sections.flatMap(s => s.body.filter((b): b is {tex: string} => typeof b !== 'string').map(b => b.tex)),
  ...paragraphs(l).flatMap(t => t.split('$').filter((_, i) => i % 2))];
/** The words of a sentence with its symbols taken out. */
const words = (t: string) => t.split('$').filter((_, i) => !(i % 2)).join(' ');

describe('the lessons', () => {
  it('the finite line has one, and every lesson belongs to a geometry in the library', () => {
    expect(lessonFor('bisector')).toBeTruthy();
    expect(LESSON_LIST.length).toBeGreaterThan(0);
    for (const l of LESSON_LIST) expect(ids.has(l.id), `${l.id} is not a lesson in PROBLEMS`).toBe(true);
  });
  it('every equation sets in KaTeX, with no error and no unknown command', () => {
    for (const l of LESSON_LIST) {
      for (const t of paragraphs(l)) expect(t.split('$').length % 2, `${l.id}: an unclosed $ in "${t.slice(0, 60)}…"`).toBe(1);
      for (const tex of texOf(l)) expect(() => katex.renderToString(tex, {throwOnError: true, strict: 'error'}), `${l.id}: ${tex}`).not.toThrow();
    }
  });
  it('prints no numerals as values: a figure only inside a formula, as its structure', () => {
    for (const l of LESSON_LIST) {
      for (const t of paragraphs(l)) expect(words(t), `${l.id}: a numeral in "${t.slice(0, 60)}…"`).not.toMatch(/\d/);
      for (const s of l.sections) expect(s.heading, l.id).not.toMatch(/\d/);
    }
  });
  it('is a lesson’s length, teaches in sections, and shows its key equations as displays', () => {
    for (const l of LESSON_LIST) {
      const count = paragraphs(l).slice(1).map(t => words(t).split(/\s+/).filter(Boolean).length + (t.split('$').length - 1) / 2).reduce((a, b) => a + b, 0);
      expect(count, `${l.id}: ${count} words`).toBeGreaterThanOrEqual(200);
      expect(count, `${l.id}: ${count} words`).toBeLessThanOrEqual(520);
      expect(l.sections.length, l.id).toBeGreaterThanOrEqual(4);
      expect(new Set(l.sections.map(s => s.heading)).size, `${l.id}: two sections of one name`).toBe(l.sections.length);
      expect(l.sections.flatMap(s => s.body).filter(b => typeof b !== 'string').length, l.id).toBeGreaterThanOrEqual(3);
      // The lead is one or two sentences, not the lesson again.
      expect(words(l.lead).split(/[.!?](\s|$)/).filter(s => s.trim()).length, l.id).toBeLessThanOrEqual(3);
    }
  });
  it('names a textbook to read it in, with a free copy linked where there is one', () => {
    for (const l of LESSON_LIST) {
      expect(l.read.length, l.id).toBeGreaterThan(0);
      for (const r of l.read) {
        expect(r.book.trim() && r.where.trim(), l.id).toBeTruthy();
        if (r.url) expect(r.url, l.id).toMatch(/^https:\/\//);
      }
    }
  });
  it('holds a plain formula together, as the rest of the lesson’s prose is held', () => {
    // The lessons write their symbols $…$, but a plain "E = 0" in a later lesson's words would break after its
    // "=" without the hold every other sentence on the page has (prose.ts).
    const shown = lessonFor('bisector')!;
    expect(shown.lead).toBe(hold(bisector.lead));
    shown.sections.forEach((s, i) => s.body.forEach((b, j) => expect(b).toEqual(typeof b === 'string' ? hold(bisector.sections[i].body[j] as string) : bisector.sections[i].body[j])));
    expect(hold('so E = 0 here')).toContain('\u00a0');
  });
  it('leads the offline copy: the lead, the sections, their equations and the books, before the setup', () => {
    const l = lessonFor('bisector')!, html = artifactHtml(lessonArtifact(getProblem('bisector'))), at = (t: string) => html.indexOf(t);
    expect(at('<h2>The lesson</h2>')).toBeGreaterThan(at('<p class="lede">'));
    expect(at('<h2>The lesson</h2>')).toBeLessThan(at('<h2>Setup</h2>'));
    for (const s of l.sections) expect(html).toContain(`<h3 class="taught">${s.heading}</h3>`);
    for (const r of l.read) expect(html).toContain(escapeHtml(r.where));
    // Every display, set as MathML with its TeX riding along.
    for (const b of l.sections.flatMap(s => s.body)) if (typeof b !== 'string') expect(html).toContain(`<annotation encoding="application/x-tex">${escapeHtml(b.tex)}</annotation>`);
    // A geometry with no lesson yet prints none.
    const none = PROBLEMS.find(p => !lessonFor(p.id));
    if (none) expect(artifactHtml(lessonArtifact(none))).not.toContain('<h2>The lesson</h2>');
  });
});
