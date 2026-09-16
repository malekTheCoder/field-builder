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
 * Two groups are held back, for two different reasons.
 *
 * THE UNBOUNDED GEOMETRIES (infinite, semi, sheet) all draw a correct field now -- that was
 * today's work, and the numbers agree with an independent integrator. What is not right is the
 * PICTURE of one piece: an element of something infinite is itself unbounded, so "one piece,
 * highlighted" means drawing something enormous and mostly off the frame. Two of the infinite
 * line's five pieces, and one of the semi-infinite line's, sit outside the picture entirely. The
 * whole lesson is built on being able to point at one piece, and here you cannot. That wants a
 * different idea -- a broken axis, a piece that stands for the tail -- not a smaller number.
 *
 * THE POTENTIAL LESSONS (the five v-*) are held back because they are telling a weaker story than
 * their field twins. V is a scalar: there is no direction to add, nothing cancels, and the figure
 * that makes the field lessons work -- watch the sideways parts kill each other -- has nothing to
 * show. They currently borrow their twin's picture and draw a gauge beside it, which is a chart,
 * not an argument. They come back when they have a picture of their own. */
export const COMING_SOON: ReadonlySet<ProblemId> = new Set<ProblemId>([
  'infinite', 'semi', 'sheet',
  'v-ring', 'v-disk', 'v-arc', 'v-rod-bisector', 'v-rod-axial',
]);
export const isReady = (id: ProblemId) => !COMING_SOON.has(id);
/** Said once, in the one place a reader meets it, and kept short enough to sit under a name. */
export const SOON_NOTE = 'Being redrawn, and not ready to be read yet.';
