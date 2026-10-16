import katex from 'katex';
import {describe, expect, it} from 'vitest';
import {GAUSS_LESSONS, gaussIdOf, gaussLesson, isGaussReady} from '../src/gauss';
import {GAUSS} from '../src/explorer/lessons';
import {GAUSS_READY} from '../src/problems/readiness';
import {boardLines, gaussStages, moment, runSeconds, spoken, stageStart} from '../src/gauss/run';
import {viewOf} from '../src/state/route';
import type {GaussLesson} from '../src/gauss/types';
/* THE GAUSS LESSONS, HELD TO THE PAGE'S RULES as the integral lessons are (tests/lessons.test.ts): every formula
 * sets, the words print no numerals, the run says the recipe in five short lines a screen reader can say, and
 * the section lists the plan's eleven lessons in its order, with the ready ones built. */
const BEATS = ['symmetry', 'surface', 'left', 'right', 'solve'] as const;
const words = (t: string) => t.split('$').filter((_, i) => !(i % 2)).join(' ');
const spans = (t: string) => t.split('$').filter((_, i) => i % 2);
function prose(l: GaussLesson): string[] {
  return [l.lead, l.about, ...l.sections.flatMap(s => s.body.filter((b): b is string => typeof b === 'string')), ...l.traps.flatMap(t => [t.wrong, t.right]),
    ...l.cases.flatMap(c => [c.setup, ...BEATS.flatMap(k => [c[k].line, c[k].say ?? '']), ...c.checks.flatMap(x => [x.title, x.text])])];
}
function tex(l: GaussLesson): string[] {
  return [...l.sections.flatMap(s => s.body.filter((b): b is {tex: string} => typeof b !== 'string').map(b => b.tex)),
    ...l.cases.flatMap(c => [...BEATS.map(k => c[k].tex), c.solve.answer, ...c.checks.flatMap(x => x.tex ? [x.tex] : [])]),
    ...prose(l).flatMap(spans)];
}

describe('the Gauss section', () => {
  it('lists the plan’s eleven lessons, in its order', () => {
    expect(GAUSS.lessons.map(l => l.name)).toEqual(['Symmetry first', 'Flux, the idea', 'Why only the charge inside', 'Q_enc from a density', 'Spheres',
      'Lines and cylinders', 'Sheets and slabs', 'Conductors', 'Holes by superposition', 'When symmetry runs out', 'The hard cases']);
  });
  it('publishes the built lessons, at ?g=, and nothing it has not built', () => {
    expect([...GAUSS_READY].sort()).toEqual(['flux', 'lines', 'symmetry']);
    for (const id of GAUSS_READY) { expect(gaussLesson(id), id).toBeTruthy(); expect(isGaussReady(id)).toBe(true); }
    expect(isGaussReady('spheres')).toBe(false);
    expect(viewOf('?g=symmetry')).toBe('gauss');
    expect(viewOf('?g=flux')).toBe('gauss');
    expect(viewOf('?g=spheres')).toBe('home');
    expect(viewOf('?g=nonsense')).toBe('home');
    // A lesson's own address still wins.
    expect(viewOf('?p=ring&g=flux')).toBe('lesson');
    expect(gaussIdOf('?g=flux')).toBe('flux');
    for (const l of GAUSS_LESSONS) expect(GAUSS.lessons.some(p => p.key === l.id), l.id).toBe(true);
  });
});

for (const l of GAUSS_LESSONS) describe(`the Gauss lesson ${l.id}`, () => {
  it('sets every formula in KaTeX', () => {
    for (const t of prose(l)) expect(t.split('$').length % 2, `an unclosed $ in "${t.slice(0, 60)}"`).toBe(1);
    for (const t of tex(l)) expect(() => katex.renderToString(t, {throwOnError: true, strict: 'error'}), t).not.toThrow();
  });
  it('prints no numerals as values, and no em dash', () => {
    for (const t of prose(l)) expect(words(t), t.slice(0, 60)).not.toMatch(/\d/);
    for (const c of l.cases) for (const k of BEATS) expect(c[k].caption, `${c.key} ${k}`).not.toMatch(/\d/);
    for (const s of l.sections) expect(s.heading).not.toMatch(/\d/);
    expect(JSON.stringify(l)).not.toMatch(/—/);
  });
  it('is a lesson’s length, in sections, with displays and a read list', () => {
    const count = l.sections.flatMap(s => s.body).filter((b): b is string => typeof b === 'string').map(t => words(t).split(/\s+/).filter(Boolean).length).reduce((a, b) => a + b, 0);
    expect(count).toBeGreaterThanOrEqual(250);
    expect(count).toBeLessThanOrEqual(900);
    expect(l.sections.length).toBeGreaterThanOrEqual(4);
    expect(l.sections.flatMap(s => s.body).filter(b => typeof b !== 'string').length).toBeGreaterThanOrEqual(2);
    expect(l.read.some(r => r.book.startsWith('OpenStax') && r.url?.startsWith('https://openstax.org/books/university-physics-volume-2/pages/6-'))).toBe(true);
    expect(l.read.some(r => r.book.startsWith('Griffiths'))).toBe(true);
    expect(l.traps.length).toBeGreaterThanOrEqual(2);
  });
  for (const c of l.cases) it(`runs the recipe for ${c.key} in five short lines, said aloud without TeX`, () => {
    const stages = gaussStages(c);
    expect(stages.map(s => s.name)).toEqual(['Symmetry', 'The surface', 'Left side', 'Right side', 'Solve']);
    for (const s of stages) {
      // Each line is read while the figure moves: one short sentence, under ninety characters as written.
      expect(words(s.prose).length + spans(s.prose).join('').length / 2, s.prose).toBeLessThanOrEqual(90);
      expect(s.line, s.line).not.toMatch(/[\\${}]/);
    }
    expect(boardLines(c).map(b => b.tex)).toEqual(BEATS.map(k => c[k].tex));
    expect(c.checks.length).toBeGreaterThanOrEqual(2);
    // The run's clock: each stage has its own stretch, and the last holds at the end.
    const total = runSeconds(stages);
    expect(total).toBeGreaterThan(20);
    for (let i = 0; i < stages.length; i++) expect(moment(stages, stageStart(stages, i) + .01).index).toBe(i);
    expect(moment(stages, total).progress).toBe(1);
  });
});

describe('the run’s words aloud', () => {
  it('turns the lines’ TeX back into symbols', () => {
    expect(spoken(String.raw`Each patch carries $E_r\,dA$; adding them adds the areas, to $4\pi r^2$.`)).toBe('Each patch carries E r dA; adding them adds the areas, to 4π r².');
    expect(spoken(String.raw`The charge inside is $Q_{\text{enc}}=\lambda L$.`)).toBe('The charge inside is Q enc=λ L.');
  });
});
