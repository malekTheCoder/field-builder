import type {ProblemId} from './types';
/** Which lessons are finished enough to put in front of someone.
 *
 * The site is shared before every geometry is done, so the ones that are not yet good enough are
 * listed but marked, rather than quietly missing. A reader can see the whole plan and knows the
 * gap is deliberate; nobody opens a lesson that would confuse them.
 *
 * This is the only place to change it. Adding an id hides that lesson behind the label; removing
 * one publishes it. Nothing else in the app needs touching either way.
 *
 * As it stands, the three unbounded geometries are held back. All three now draw a correct field
 * -- that was today's work -- but they are the ones whose partition runs to infinity, and their
 * figures still show it: an element of an infinite sheet is itself infinite, and drawing "one
 * ring of it" honestly means drawing something enormous and mostly off-screen. That wants a
 * different idea, not a smaller number. */
export const COMING_SOON: ReadonlySet<ProblemId> = new Set<ProblemId>(['infinite', 'semi', 'sheet']);
export const isReady = (id: ProblemId) => !COMING_SOON.has(id);
/** Said once, in the one place a reader meets it. */
export const SOON_NOTE = 'Being redrawn. The infinite geometries need a different picture of "one piece", and it is not ready yet.';
