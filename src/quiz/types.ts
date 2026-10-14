import type {ProblemId} from '../problems/types';
import type {STAGE_WORDS} from '../state/assignment';

/* QUIZ YOURSELF. The owner wanted the quizzes to be their own place, not part of a lesson: the student picks
 * the shapes, questions are drawn from a bank for those shapes, and the end says what to look at again. Every
 * wrong choice in the bank is tied to a named misconception, so the feedback is rule-based and every word of
 * it can be checked for physics beforehand. Nothing is sent anywhere. */

/** The four kinds of question (docs/quiz-plan.md). */
export type Kind = 'predict' | 'setup' | 'check' | 'transfer';
/** A stage of Watch it build, by the word an address writes it in (`?p=ring&stage=cancel`). */
export type StageWord = typeof STAGE_WORDS[number];

/** Where to look to fix something: a lesson opened at a stage of Watch it build, or a lesson and a section of
 * its page. A section is a heading of the lesson's own text (Read the lesson), or one of the page's parts below
 * the build, `Limiting cases` and `Easy to confuse with`. */
export type Pointer = {lesson: ProblemId; stage: StageWord} | {lesson: ProblemId; section: string};

/** One choice. Its words are `text` (Prose: symbols in $…$) or a formula, `tex`. Exactly one choice of a
 * question is `correct`; every other names the misconception it comes from, and says in `why` what it gets
 * wrong, written to the student who chose it. */
export type Choice = {text?: string; tex?: string; correct?: true; misconception?: string; why?: string};

export type Question = {
  /** Stable for ever: history keeps it. `<lesson>-<word>`. */
  id: string;
  lesson: ProblemId;
  kind: Kind;
  /** The question, in Prose: symbols in $…$, no numerals outside them. */
  prompt: string;
  choices: Choice[];
  /** Why the right answer is right, shown after every answer. */
  explanation: string;
  /** Where the idea this question tests is taught. */
  review: Pointer;
};

export type Misconception = {
  id: string;
  /** Short, as the student would say it to themselves: "Forgot the projection". */
  name: string;
  /** One paragraph on the idea, in Prose. */
  idea: string;
  /** Where to look to fix it, by lesson; the first is the default. The end screen picks the one for the shape
   * it came up on, so a slip on the ring sends the student to the ring. */
  review: Pointer[];
};

/** One answered question. */
export type Answer = {id: string; choice: number; sure: boolean};
