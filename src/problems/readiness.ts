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
 * THE INFINITE SHEET is what is left. Its drawing is now fixable the same way the two line
 * lessons were -- one piece is one angle at P -- but its STORY is not the lines'. On a line the
 * far pieces push just as hard and almost entirely sideways, so they cancel against their mirror
 * partners; that is the argument the whole lesson makes. On a sheet the annuli are already axial,
 * nothing cancels, and the contributions INCREASE outward: at five pieces the outermost, unbounded
 * annulus is the single largest contributor at about 31% of the field. Reusing the lines'
 * narration here would teach the opposite of the truth. It also means `SHEET_FADE` in
 * `three/bodies.ts` currently dissolves the biggest contributor to nothing, which has to go.
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
