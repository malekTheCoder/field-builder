import 'katex/dist/katex.min.css';
import {cleanup, render, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Site, {newVisit} from '../src/home/Site';
import {getProblem, PROBLEMS} from '../src/problems/definitions';
import {BANK, BANKS, DEFAULT_SETTINGS, HISTORY_KEY, QUESTION, QUIZ_SHAPES, isGauss, shapeShort} from '../src/quiz/engine';
import type {ShapeId} from '../src/quiz/types';
import {GAUSS} from '../src/explorer/lessons';
import {isGaussReady} from '../src/gauss';
import {MISCONCEPTION} from '../src/quiz/misconceptions';

/* QUIZ YOURSELF, in the page: set up, take, the end screen's weak spots and their links, retry, history and
 * its clearing, the keyboard on its own, and a phone's width. The quiz keeps its place in the history entry's
 * state, which is also how these tests know which question is on screen. */
const STORE = 'field-builder:explorer:v1';
const seen = () => localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
const words = (el: Element) => { const c = el.cloneNode(true) as Element; c.querySelectorAll('.katex').forEach(k => k.remove()); return c.textContent ?? ''; };
type Snap = {items: {id: string; order: number[]}[]; index: number};
const snap = () => (history.state as {quiz: Snap}).quiz;
/** A shape's tick box is named as the page sets its name: Q_enc reads as Qenc, Q with enc below it. */
const shapeName = (id: ShapeId) => shapeShort(id).replace('Q_enc', 'Qenc');
/** The question on screen, and the radio for each of its choices, in the order shown. */
function onScreen() {
 const s = snap(), item = s.items[s.index], q = QUESTION.get(item.id)!;
 const radios = [...document.querySelectorAll<HTMLInputElement>('.quiz-choices input[type=radio]')];
 return {q, item, radioFor: (choice: number) => radios[item.order.indexOf(choice)]};
}

beforeEach(() => newVisit());
afterEach(async () => {
 cleanup();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});

async function openQuiz() {
 seen();
 window.history.replaceState(null, '', '/?quiz');
 const r = render(<Site />);
 expect(await r.findByRole('heading', {level: 1, name: 'Test what you understand'})).toBeTruthy();
 return r;
}
/** Untick every shape but these, from the set-up screen's default of every shape with a bank. */
async function keepOnly(r: ReturnType<typeof render>, keep: string[]) {
 for (const id of QUIZ_SHAPES) if (!keep.includes(id)) await userEvent.click(r.getByRole('checkbox', {name: shapeName(id)}));
}
/** Answer the question on screen: with the given misconception's choice, or right; sure or guessing. */
async function answer(r: ReturnType<typeof render>, wrong: string | null, sure: boolean) {
 const {q, radioFor} = onScreen();
 const choice = wrong ? q.choices.findIndex(c => c.misconception === wrong) : q.choices.findIndex(c => c.correct);
 await userEvent.click(radioFor(choice));
 await userEvent.click(r.getByRole('radio', {name: sure ? 'Sure' : 'Guessing'}));
 await userEvent.click(r.getByRole('button', {name: 'Check my answer'}));
 const verdict = await r.findByRole('heading', {level: 3, name: wrong ? 'Not quite' : 'Right'});
 await waitFor(() => expect(document.activeElement).toBe(verdict));
 return q;
}

describe('quiz yourself', () => {
 it('is reached from the home page, at ?quiz, with its own title', async () => {
  seen();
  const r = render(<Site />);
  await r.findByRole('heading', {level: 1, name: 'One law, every geometry.'});
  const link = r.getByRole('link', {name: /Quiz yourself/});
  expect(link.getAttribute('href')).toBe('?quiz');
  await userEvent.click(link);
  expect(await r.findByRole('heading', {level: 1, name: 'Test what you understand'})).toBeTruthy();
  expect(window.location.search).toBe('?quiz');
  expect(document.title).toBe('Quiz yourself · Field Builder');
 });

 it('sets up with every shape that has a bank ready and the rest coming soon, every kind on, and no numerals', async () => {
  const r = await openQuiz();
  for (const id of QUIZ_SHAPES) {
   const box = r.getByRole('checkbox', {name: shapeName(id)}) as HTMLInputElement;
   expect(box.disabled).toBe(false); expect(box.checked).toBe(true);
  }
  // The Gauss's law family sits beside the integral ones: its lessons with a bank are ticked, the rest coming soon.
  expect(r.getByText('Gauss’s law', {selector: '.quiz-family-name'})).toBeTruthy();
  const soon = [...PROBLEMS.filter(x => !BANKS[x.id]).map(p => p.id as ShapeId), ...GAUSS.lessons.map(l => l.key).filter(isGaussReady).filter(id => !BANKS[id])];
  expect(soon.some(isGauss)).toBe(true);
  for (const id of soon) expect((r.getByRole('checkbox', {name: shapeName(id)}) as HTMLInputElement).disabled, id).toBe(true);
  expect(r.getAllByRole('checkbox').filter(b => (b as HTMLInputElement).disabled).length).toBe(soon.length);
  for (const k of ['Predict', 'Set up', 'Check', 'Transfer']) expect((r.getByRole('checkbox', {name: new RegExp(`^${k}`)}) as HTMLInputElement).checked).toBe(true);
  expect((r.getByRole('radio', {name: /^Short/}) as HTMLInputElement).checked).toBe(true);
  expect(words(r.container)).not.toMatch(/[0-9]/);
  // Nothing chosen: it says so, and does not start.
  await keepOnly(r, []);
  await userEvent.click(r.getByRole('button', {name: /Start the quiz/}));
  expect(r.container.querySelector('.quiz-nudge')!.textContent).toBe('Choose at least one shape.');
  expect(r.queryByRole('button', {name: 'Check my answer'})).toBeNull();
 });

 it('takes a short quiz, and the end shows the weak spots, the confidence flags and the right links', async () => {
  const r = await openQuiz();
  await keepOnly(r, ['ring']);
  await userEvent.click(r.getByRole('button', {name: /Start the quiz/}));
  await waitFor(() => expect(document.activeElement?.id).toBe('quiz-question'));
  expect(snap().items.length).toBe(6);
  // Checking with nothing chosen asks for an answer first.
  await userEvent.click(r.getByRole('button', {name: 'Check my answer'}));
  expect(r.container.querySelector('.quiz-nudge')!.textContent).toBe('Choose an answer first.');
  const missed: string[] = [], slips: string[] = [];
  for (let i = 0; i < 6; i++) {
   const {q} = onScreen();
   expect(q.lesson).toBe('ring');
   const wrong = i < 2 ? q.choices.find(c => !c.correct)!.misconception! : null;
   await answer(r, wrong, i !== 2);
   if (wrong) {
    missed.push(q.id); slips.push(wrong);
    // What this choice gets wrong, and why the right one is right.
    const chosen = q.choices.find(c => c.misconception === wrong)!;
    expect(r.getByText('What your answer gets wrong')).toBeTruthy();
    expect(words(r.container.querySelector('.quiz-why-wrong')!)).toContain(words(Object.assign(document.createElement('div'), {textContent: chosen.why!.replace(/\$[^$]*\$/g, '')})).slice(0, 10));
   }
   expect(r.getByText('Why the right answer is right')).toBeTruthy();
   expect(r.container.querySelector('.quiz-choice.is-right')).toBeTruthy();
   expect(words(r.container)).not.toMatch(/[0-9]/);
   await userEvent.click(r.getByRole('button', {name: i < 5 ? /Next question/ : /See how it went/}));
  }
  const end = await r.findByRole('heading', {level: 1, name: 'How it went'});
  await waitFor(() => expect(document.activeElement).toBe(end));
  expect(r.container.textContent).toContain('You answered four of six right.');
  expect(words(r.container)).not.toMatch(/[0-9]/);
  // Weak spots: each misconception behind a wrong answer, named, with a link into the ring's lesson.
  const weak = r.getByRole('heading', {level: 2, name: 'Your weak spots'}).closest('section')!;
  for (const id of slips) expect(weak.textContent).toContain(MISCONCEPTION.get(id)!.name.replace(/\$[^$]*\$/g, '').trim().slice(0, 8));
  const links = within(weak as HTMLElement).getAllByRole('link');
  expect(links.length).toBe(new Set(slips).size);
  for (const a of links) expect(a.getAttribute('href')).toMatch(/^\?p=ring(&stage=(cut|piece|cancel|add|shrink))?$/);
  // Confidence: both wrong answers were sure; the third, right, was a guess.
  const conf = r.getByRole('heading', {level: 2, name: 'How sure you were'}).closest('section')!;
  expect(within(conf as HTMLElement).getByRole('heading', {name: 'Wrong, but you were sure'})).toBeTruthy();
  expect(conf.querySelectorAll('.is-urgent .quiz-flag-list li').length).toBe(2);
  expect(within(conf as HTMLElement).getByRole('heading', {name: 'Right, but you were guessing'})).toBeTruthy();
  // Lessons to revisit, and the history kept.
  expect(r.getByRole('link', {name: getProblem('ring').title}).getAttribute('href')).toBe('?p=ring');
  expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!).missed.sort()).toEqual([...missed].sort());

  // Following a weak spot's link opens the lesson; Back returns to this end screen.
  await userEvent.click(links[0]);
  expect(await r.findByRole('heading', {level: 1, name: getProblem('ring').title})).toBeTruthy();
  window.history.back();
  expect(await r.findByRole('heading', {level: 1, name: 'How it went'})).toBeTruthy();

  // Retry the ones you missed: exactly those two.
  await userEvent.click(r.getByRole('button', {name: /Retry the ones you missed/}));
  await waitFor(() => expect(snap().items.map(x => x.id).sort()).toEqual([...missed].sort()));
  for (let i = 0; i < 2; i++) { await answer(r, null, true); await userEvent.click(r.getByRole('button', {name: i ? /See how it went/ : /Next question/})); }
  await r.findByRole('heading', {level: 1, name: 'How it went'});
  expect(r.container.textContent).toContain('You answered two of two right.');
  expect(r.getByText('No wrong answers, so no weak spots this time.')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!).missed).toEqual([]);

  // Clear my history.
  await userEvent.click(r.getByRole('button', {name: /Clear my history/}));
  expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
  expect(r.getByText('Your history is cleared.')).toBeTruthy();
 }, 30000);

 it('brings missed questions back first, and quizzes again on the weak spots', async () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify({missed: ['infinite-dq'], asked: ['infinite-dq'], misconceptions: {jacobian: 1}}));
  const r = await openQuiz();
  expect(r.container.querySelector('.quiz-history')!.textContent).toContain('One question you missed before will come first.');
  // The three shapes this test was written on: on every shape, more questions than fit carry the Jacobian.
  await keepOnly(r, ['bisector', 'ring', 'infinite']);
  await userEvent.click(r.getByRole('button', {name: /Start the quiz/}));
  await waitFor(() => expect(snap().items[0].id).toBe('infinite-dq'));
  await answer(r, 'jacobian', true);
  for (let i = 1; i < 6; i++) { await userEvent.click(r.getByRole('button', {name: /Next question/})); await answer(r, null, true); }
  await userEvent.click(r.getByRole('button', {name: /See how it went/}));
  const weak = (await r.findByRole('heading', {level: 2, name: 'Your weak spots'})).closest('section')!;
  expect(weak.textContent).toContain('Dropped the Jacobian');
  expect(weak.textContent).toContain('and in an earlier one too');
  expect(within(weak as HTMLElement).getByRole('link').getAttribute('href')).toBe('?p=infinite&stage=cut');
  await userEvent.click(r.getByRole('button', {name: 'Quiz again on my weak spots'}));
  await waitFor(() => expect(snap().items.length).toBe(6));
  const ids = snap().items.map(x => x.id);
  for (const id of ['infinite-dq', 'infinite-equal-pieces', 'bisector-substitution']) expect(ids).toContain(id);
 }, 30000);

 it('can be taken with the keyboard alone', async () => {
  const r = await openQuiz();
  r.getByRole('button', {name: /Start the quiz/}).focus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(document.activeElement?.id).toBe('quiz-question'));
  for (let i = 0; i < 2; i++) {
   // Into the choices, an arrow to choose, on to how sure, an arrow there, on to Check.
   await userEvent.tab();
   expect((document.activeElement as HTMLInputElement).type).toBe('radio');
   await userEvent.keyboard('{ArrowDown}');
   expect(document.querySelectorAll('.quiz-choices input:checked').length).toBe(1);
   await userEvent.tab();
   expect(document.activeElement?.closest('.quiz-sure')).toBeTruthy();
   await userEvent.keyboard(' ');
   expect(document.querySelectorAll('.quiz-sure input:checked').length).toBe(1);
   await userEvent.tab();
   expect(document.activeElement?.textContent).toBe('Check my answer');
   await userEvent.keyboard('{Enter}');
   await waitFor(() => expect(document.activeElement?.id).toBe('quiz-verdict'));
   // The verdict is announced as well as focused.
   expect(r.container.querySelector('.quiz-feedback output')!.textContent).toMatch(/^(Right|Not quite)\.$/);
   await userEvent.tab();
   expect(document.activeElement?.textContent).toMatch(/Next question/);
   await userEvent.keyboard('{Enter}');
   await waitFor(() => expect(document.activeElement?.id).toBe('quiz-question'));
  }
 }, 20000);

 it('fits a phone: no sideways scroll on set up, a question, its feedback, or the end', async () => {
  await page.viewport(390, 800);
  const r = await openQuiz();
  const fits = () => { const w = document.documentElement.clientWidth, wide = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > w + 1).map(e => `${e.tagName}.${e.className}`).slice(0, 8); expect(document.documentElement.scrollWidth, wide.join(' | ')).toBeLessThanOrEqual(w); };
  fits();
  await userEvent.click(r.getByRole('button', {name: /Start the quiz/}));
  for (let i = 0; i < 6; i++) {
   fits();
   await answer(r, i % 2 ? null : onScreen().q.choices.find(c => !c.correct)!.misconception!, true);
   fits();
   await userEvent.click(r.getByRole('button', {name: i < 5 ? /Next question/ : /See how it went/}));
  }
  await r.findByRole('heading', {level: 1, name: 'How it went'});
  fits();
 }, 30000);
 it('fits a phone with every question in the bank, answered wrong, and its feedback open', async () => {
  await page.viewport(390, 800);
  seen();
  const over: string[] = [];
  for (const q of BANK) {
   const wrong = q.choices.findIndex(c => !c.correct), order = q.choices.map((_, i) => i);
   window.history.replaceState({quiz: {phase: 'take', settings: DEFAULT_SETTINGS, items: [{id: q.id, order}], index: 0, answers: [], pick: {choice: wrong, sure: true, checked: true}}}, '', '/?quiz');
   newVisit();
   const r = render(<Site />);
   await r.findByRole('heading', {level: 3, name: 'Not quite'});
   const w = document.documentElement.clientWidth;
   if (document.documentElement.scrollWidth > w) over.push(`${q.id}: ${[...document.querySelectorAll('.quiz-main *')].filter(e => e.getBoundingClientRect().right > w + 1).map(e => e.closest('p,h2,label,div')?.className + ' ' + (e.closest('p,h2,label')?.textContent ?? '').slice(0, 60)).slice(0, 2).join(' | ')}`);
   cleanup();
  }
  expect(over).toEqual([]);
 }, 30000);
});
