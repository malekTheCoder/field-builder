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
 * THE INFINITE SHEET came back last, on 2026-09-17, and needed the most. One ring is one angle at
 * P, drawn as a cross-section of cones, so every ring can be pointed at. The chosen ring is no
 * longer faded by distance: that fade dissolved the outermost ring, the single largest
 * contributor at about 31% of the field. The words were corrected, because the line lessons'
 * story is the opposite of the truth here -- on a sheet each ring cancels its own sideways pull,
 * and cut at equal angles the rings push HARDER the further out they are; the subtitle used to
 * say the rings "exactly trade off", when what trades off exactly is the height. And its drawn
 * field was rebuilt: the lines stopped in mid-air, because a surface's first step toward the
 * face was thrown away; a sixteen-point cloud drew sixteen spokes rather than a surface; and
 * coarsening merged the outer annuli into one ring and lost their pull. Surfaces are now summed
 * as exact charged rings, stop at half a step, and are never merged across a gap wider than the
 * budget asks for.
 *
 * THE FIVE POTENTIAL LESSONS came back on 2026-09-17. They were held back for telling a weaker
 * story than their field twins: they borrowed the twin's figure and put one thermometer bar
 * beside P, a total with no visible origin -- a chart, not an argument. They now have a picture
 * of their own. The field chains its pieces' ARROWS head to tail in the plane; the potential
 * chains its pieces' NUMBERS head to tail along a line, so the bar became a column of every
 * piece's own contribution. That is the same sum with one dimension taken away, which is the
 * whole difference between the two lessons made visible: a chain that can only run one way can
 * never bend back and cancel. On the ring and the arc the segments come out equal, because
 * every piece is the same distance away, and a mirror partner lights a second segment of the
 * same size -- adding, where the field lesson's partner cancels.
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
]);
export const isReady = (id: ProblemId) => !COMING_SOON.has(id);
/** Said once, in the one place a reader meets it, and kept short enough to sit under a name. */
export const SOON_NOTE = 'Being redrawn, and not ready to be read yet.';
