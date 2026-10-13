import type {ProblemId} from '../problems/types';
/* A LESSON BEFORE THE LESSON. Each page opened on a figure and a board that build the integral one step at a
 * time -- and nothing on it said, before the first step, what the integral is for or why it works. A student
 * who had not met the method in a lecture met it there for the first time, one control at a time. So each
 * geometry has a short lesson at its top, taught in a textbook's order: the setup, the cut into pieces, one
 * piece's field by Coulomb's law, what the symmetry cancels, the one variable, the integral and what its answer
 * says. It is read before the build, printed with it, and it names the textbook sections that teach the same.
 *
 * The words are the site's own, never a book's: "from a textbook" means the standard material in a textbook's
 * order, with the sections to read named under it. Its symbols, names and signs are the board's below it, word
 * for word -- the same α, the same rᵢ, the same λ -- so a reader meets each symbol once, not twice. */

/** A block of a lesson's body: a paragraph, its symbols written $…$ and set as math by the page's Prose, or a
 * display equation on a line of its own. */
export type LessonBlock = string | {tex: string};
/** One step of the argument, under its own heading. */
export type LessonSection = {heading: string; body: LessonBlock[]};
/** A textbook section that teaches this lesson's material. `where` is the chapter or section as the book numbers
 * it -- the chapter alone where the section's number is not certain. `url` only for a free, stable copy. */
export type Reading = {book: string; where: string; url?: string};
export type Lesson = {
  /** The lesson's geometry: the id of its entry in PROBLEMS. */
  id: ProblemId;
  /** One or two sentences, always on the page: what this lesson finds, and the one idea that makes it work. */
  lead: string;
  /** The teaching itself, read before the build: a few hundred words, the key equations as displays. */
  sections: LessonSection[];
  /** Where to read the same material in a textbook. */
  read: Reading[];
};
