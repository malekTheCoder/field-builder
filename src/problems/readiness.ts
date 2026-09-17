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
 * THE INFINITE SHEET is what is left, and now only for one reason: its drawn FIELD. The lines stop
 * in mid-air above the plane -- no drawn chord comes within 0.3 m of the face -- and they wander
 * sideways a little past the bar, so six checks in `physics-drawn-field-truth.test.ts` fail.
 *
 * Everything else was fixed on 2026-09-17. One ring is one angle at P, drawn as a cross-section
 * of cones, so every ring can be pointed at. The chosen ring is no longer faded by distance --
 * it used to be, which dissolved the outermost ring, the single largest contributor at about
 * 31% of the field. And the words were corrected: the lines' story is the opposite of the
 * truth here. On a line the far pieces push just as hard and almost entirely sideways; on a
 * sheet each ring cancels its own sideways pull, and cut at equal angles the rings push HARDER
 * the further out they are. The subtitle used to say the rings "exactly trade off", which reads
 * as "every ring contributes the same" and is false; what trades off exactly is the height.
 *
 * THE POTENTIAL LESSONS (the five v-*) are held back because they are telling a weaker story than
 * their field twins. V is a scalar: there is no direction to add, nothing cancels, and the figure
 * that makes the field lessons work -- watch the sideways parts kill each other -- has nothing to
 * show. They currently borrow their twin's picture and draw a gauge beside it, which is a chart,
 * not an argument. They come back when they have a picture of their own.
 *
 * THE TWO LINE LESSONS came back on 2026-09-17. They were held back because a reader could not
 * point at one piece: the partition is equal steps in the theta of y = r tan theta, which is the
 * right partition and the reason the improper integral is tractable, but it put the outer pieces
 * hundreds of metres away and the figure drew them as bands 33 000 pixels long. A piece is now
 * the WEDGE between two rays out of P, which is on screen however far out its charge lies -- the
 * substitution drawn instead of asserted. `tests/framing.browser.test.tsx` holds the bar they had
 * to clear, and every physics check that was skipped for them now runs.
 */
export const COMING_SOON: ReadonlySet<ProblemId> = new Set<ProblemId>([
  'sheet',
  'v-ring', 'v-disk', 'v-arc', 'v-rod-bisector', 'v-rod-axial',
]);
export const isReady = (id: ProblemId) => !COMING_SOON.has(id);
/** Said once, in the one place a reader meets it, and kept short enough to sit under a name. */
export const SOON_NOTE = 'Being redrawn, and not ready to be read yet.';
