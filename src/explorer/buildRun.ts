import type {Problem} from '../problems/types';
import {exactSum} from '../workbench/derivation';
/** The scripted run that answers "how do tiny pieces become one arrow?".
 *
 * Every ingredient of that answer was already in the app, and that was the problem: the
 * partition was behind a slider, the mirror partner behind a checkbox, the running sum behind a
 * button on the last step of the walkthrough, and the limit behind a link inside one of its
 * steps. Four controls, in four places, each showing one frame of an argument that only means
 * anything in order. A reader who did not already know the argument had no way to discover it.
 *
 * So this is the argument itself, as one run: cut it up, look at one piece, meet the piece's
 * mirror partner and watch the sideways parts kill each other, add what survives head to tail,
 * then make the pieces vanishingly small. It drives the same state the manual controls do -- no
 * second rendering path, so it cannot show something the figure cannot.
 *
 * Kept as plain data, so the choreography can be read, tested and retimed without running it. */
export type BuildStage = {
  key: string;
  /** Two or three words, for the marker a reader clicks to jump back to this stage. */
  name: string;
  /** Seconds this stage holds the screen. */
  seconds: number;
  mode: 'divide' | 'project' | 'sum' | 'integrate';
  /** Split each contribution into the part that survives and the part that dies. */
  components: boolean;
  /** Draw the mirror partner opposite the selected piece. */
  pair: boolean;
  /** How much of the running sum is drawn, across the stage. */
  sum: [number, number];
  /** How far the partition has gone toward the continuum, across the stage. */
  continuum: [number, number];
  /** The whole explanation, in the reader's language, read to a screen reader when the run holds on
   * this stage. It is not on the screen: it used to open under the board's step whenever the run
   * paused, and once each step's own remark was complete it said the same thing a second time. */
  caption: string;
  /** The same thing in one short sentence, for reading WHILE the figure moves. The long caption
   * used to be the only text, two or three sentences on a stage that lasted three seconds -- so
   * the run moved on before anyone could finish reading what it was showing. */
  line: string;
  /** The factor of the integral this stage puts in, which the figure lights while it plays. */
  term: 'element' | 'distance' | 'projection' | 'bounds' | '';
  /** The share of the stage spent moving; the rest holds the finished frame, so the reader sees
   * what the motion arrived at before the next stage starts. 1 means it moves all the way. */
  moves: number;
  /** How the motion is paced: 'linear' where every piece must be seen in turn (the sum), 'ease'
   * where one thing turns into another (the limit). */
  pace: 'linear' | 'ease';
};
/** What happens to the sideways parts, which is the whole point of the third stage and is
 * different in each geometry.
 *
 * Every one of these is true for a charge of EITHER sign -- the slider runs negative, and then
 * every arrow points the other way -- so they say "the part along the rod", "the part
 * perpendicular to it", never "pushes up" or "straight out". And none of them says which side the
 * chosen piece is on: the run picks it, and a reader may have picked it before that.
 *
 * Nor do they say a piece "acts on P" or pushes it "harder": P is a point, not a charge, and
 * nothing there is pushed. A piece MAKES A FIELD at P, and a bigger or smaller one. */
const CANCELS: Record<string, string> = {
  bisector: 'Now its mirror piece, the same distance from P on the other side of the x-axis. Its part along the rod is equal and opposite to the first piece’s, so those two cancel\u00a0— and what is left of both points the same way, perpendicular to the rod.',
  // Not "the piece": at an odd N -- the default five among them -- no piece's middle is half a turn
  // from another's, and the figure draws an arc of the piece's length centred straight across. That
  // length of ring is what cancels the piece's part, at any N.
  ring: 'Now the same length of ring straight across from it. Its part across the axis is equal and opposite, so the two cancel\u00a0— and what is left of both points along the axis.',
  arc: 'Now the piece at the mirror angle. Its part across the axis is equal and opposite, so those two cancel\u00a0— and what is left of both points along the axis.',
  infinite: 'Now the mirror piece on the other side of the perpendicular from P. Its part along the line is equal and opposite, so those cancel\u00a0— and what is left of both points perpendicular to the line.',
  // The board says how a ring cancels -- each bit's part across the axis undone by the bit straight
  // across -- so the note under it says what that leaves, rather than the same sentence again.
  disk: 'A disk is rings, and each ring has already cancelled its own sideways parts. Nothing sideways is left: each ring’s field at P points straight along the axis.',
  // The sheet cancels within each ring exactly as the disk does. What is different, and is the
  // thing a reader carrying the line lessons' story will get wrong, is the tail: cut at equal
  // angles from P, the rings make a BIGGER field the further out they are, not a smaller one.
  sheet: 'A sheet is rings too, and each ring has already cancelled its own sideways parts. Nothing is left over to cancel\u00a0— but notice the far rings. Cut at equal angles, each is weaker for its size, yet so much bigger that its field at P is bigger than the last one’s.',
  // The rod seen end-on is the most symmetric of all, not the least: turn it about P's line and
  // nothing changes, so no piece has a sideways part to begin with. The shared "no symmetry"
  // story below would deny the very symmetry that makes this field point along the axis.
  axial: 'Nothing is left to cancel: every piece sits on P’s own line, so each arrow already points along the axis\u00a0— there are no sideways parts at all.',
  // No partner at all: the line stops at the foot of the perpendicular, so the part along it
  // survives. Saying "every contribution points much the same way" was wrong here -- they fan
  // through a right angle -- and it hid the one consequence worth seeing.
  semi: 'Nothing cancels here. The line stops right below P, so there is no charge on the other side to undo the part along the line\u00a0— every piece keeps both of its parts, which is why this field leans instead of pointing perpendicular to the line.',
};
/** The cancellation in one sentence each, for reading while the arrows move. */
const CANCEL_LINES: Record<string, string> = {
  bisector: 'Its mirror piece contributes as much at P. The parts along the rod cancel; the perpendicular parts survive.',
  ring: 'The same length of ring straight across cancels the part across the axis. Only the part along it survives.',
  arc: 'The mirror piece cancels the part across the axis. Only the part along the axis survives.',
  infinite: 'The mirror piece cancels the part along the line. Only the part perpendicular to it survives.',
  disk: 'Each ring has already cancelled its own sideways parts. Only the part along the axis is left.',
  sheet: 'Each ring has already cancelled its own sideways parts. Only the part along the axis is left.',
  semi: 'Nothing cancels: no charge lies on the other side, so both parts survive and the field leans.',
  axial: 'Every piece is on the axis, so every contribution already points along it. Nothing to cancel.',
};
/* A scalar lesson must never borrow its field twin's cancellation story, even though it shares
 * the twin's geometry. V is a number; "the sideways parts cancel" is meaningless about it, and
 * teaching it here would plant the exact confusion these lessons exist to clear up.
 *
 * Nor may it say that numbers cannot cancel: they can, if they have opposite signs -- a dipole's
 * potential is zero all along its bisector while its field is not. What makes nothing cancel HERE
 * is that every lesson's charge has one sign, so every piece adds with that sign. */
const NO_CANCEL_V = (unit: string) => `Nothing cancels here. V is a number, not an arrow, so there is no direction in which one ${unit} could undo another\u00a0— and all of this charge has the same sign, so every ${unit} adds to V with that sign. V is simply the sum of what each ${unit} is worth.`;
// Shared by the rod level with one end and the ramp: level with the end of a rod the contributions
// fan through arctan(L/r), and this lesson's own L -> infinity limit lands them at 45 degrees. What
// the two share is the missing partner, so that is what this says -- the same correction the `semi`
// note above already made. (The axial rod has its own note: it lacks partners because it needs none.)
//
// "Every piece lies on the same side of P" meant nothing: P is a point. What is true, and what leaves
// each piece without a partner, is that the rod lies wholly above the x-axis, P's line.
const NO_CANCEL = 'Nothing cancels here. Every piece lies above the x-axis, the line through P, so no piece has a mirror partner below it to undo it, and every contribution survives in full. Cancellation is a gift of symmetry, and this geometry does not have it.';
/** Does the figure draw a mirror partner for this geometry? Mirrors `supportsPair` and
 * `scalarPartner` in the diagram: asking for a partner it will not draw would leave the stage
 * showing nothing. A potential lesson gets one wherever it has a partner at the same distance,
 * because there the contrast with the field is the lesson: the same piece cancels one and adds
 * to the other. */
const PAIRS = new Set(['bisector', 'infinite', 'ring', 'arc']);
const SCALAR_PAIRS = new Set(['bisector', 'ring', 'arc']);
const PARTNER_ADDS_V = 'Now its mirror piece. For the field, the sideways parts of these two would cancel, but nothing cancels in this potential: it has no direction, and all the charge has one sign. The mirror piece is the same distance from P, so it adds exactly the same amount, and both go on the column.';
// The ring's partner is a length of ring, not a piece (see CANCELS.ring): at an odd N it straddles two
// of the column's pieces, so it is not said to go on the column as one.
const PARTNER_ADDS_V_RING = 'Now the same length of ring straight across. For the field, the sideways parts of the two would cancel, but nothing cancels in this potential: it has no direction, and all the charge has one sign. It is the same distance from P, so it adds exactly as much to V.';
export function buildStages(p: Problem): BuildStage[] {
  const geometry = p.geometry, scalar = p.quantity === 'V';
  // A ring's field along its axis, and a ring's or an arc's potential, are exact at any cut: every
  // piece is the same distance from P (at the same angle), so each piece's share is exactly what the
  // sum says. The run said the chain and the column become the answer "once they shrink", teaching
  // that calculus corrects a ring's answer -- the opposite of the ring's lesson.
  const exact = exactSum(p);
  const pairs = scalar ? SCALAR_PAIRS.has(geometry) : PAIRS.has(geometry);
  // How big a field a piece makes at P is where the geometries genuinely differ, so it is not said
  // once for all of them. "Further away is weaker" is true of a fixed amount of charge and false of
  // the pieces several lessons draw: cut at equal angles from P, every piece of an infinite line
  // contributes EXACTLY as much; a sheet's rings make a bigger field further out, because they hold
  // more charge; and the ramp's far pieces hold more charge too.
  // THE LINES READ WHILE IT MOVES. One sentence each, short enough to finish before the stage
  // does. The long captions are still there, beside the algebra, for reading at rest.
  const unbounded = geometry === 'infinite' || geometry === 'semi';
  const surface = geometry === 'disk' || geometry === 'sheet';
  // A disk's and a sheet's pieces are rings, and the board calls them rings from first line to last.
  // The run did for two stages and then, from Add them up, called the same rings pieces.
  const unit = surface ? 'ring' : 'piece';
  // Each line follows its stage's name -- "Cut it up. …", set bold before it -- so it goes on from the
  // name rather than saying its verb again: "Cut it up. Cut the charge into…", "Add them up. Add every
  // piece's arrow…", "Shrink them. Shrink the pieces…".
  const lines = {
    // The sheet is cut at equal angles at P, not into thin rings: at five pieces its fourth ring runs
    // from about four to nine metres out and its fifth never ends, so "every bit of one ring is the
    // same distance from P" was false of it. The disk's rings are thin, and it is true of them.
    pieces: geometry === 'sheet' ? 'Rings that each take the same angle at P.'
      : surface ? 'Thin rings: every bit of one ring is the same distance from P.'
      : unbounded ? 'Pieces that each take up the same angle at P.'
      // A ring's or an arc's pieces need not be small: every bit of one is as far from P as every bit
      // of another (for the ring's field, at the same angle too), so a piece's share is exactly a
      // point charge's at any size. The run opened these by saying smallness was what made a piece a
      // point charge, then said the sum was exact however it was cut.
      : exact ? (geometry === 'arc' ? 'Pieces of any size: every bit of every piece is R from P.' : 'Pieces of any size: every bit of every piece is the same distance from P.')
      : 'Small pieces, each small enough to treat as a point charge.',
    // k times: a charge over a distance is not a potential, and the caption beside it says k.
    one: scalar ? (surface ? 'A thin ring adds k times its charge over its distance: all of it is equally far from P.'
        : 'It adds k times its charge over its distance to the potential at P: a number.')
      : unbounded ? 'Every equal-angle piece contributes exactly as much at P: the far ones hold more charge.'
      // Only cut at equal angles: cut into rings of equal width, a sheet's rings peak at s = z/√2.
      : geometry === 'sheet' ? 'Cut at equal angles, each farther ring is so much bigger that it makes a bigger ΔE at P.'
      : geometry === 'disk' ? 'A thin ring: every bit of it is the same distance from P, at the same angle to the axis.'
      // The ring's Cut it up says a piece's part along the axis is exactly a point charge's at any size;
      // "a piece's field lies along the line joining them" holds only of a small piece, so the two read
      // as one claim and contradicted each other. At three pieces a piece is a third of the ring, and its
      // own field leans in, 28.9° from the axis against the 33.7° drawn: what is exact is its part along
      // the axis, the only part the ring's sum keeps.
      : exact ? 'Drawn as a point charge’s, its field lies along the line to P. Its axial part is exact at any size.'
      : 'A piece’s field at P lies along the line joining them: more charge, bigger; farther, smaller.',
    cancel: scalar ? (pairs ? geometry === 'ring' ? 'The same length of ring straight across is just as far away, so it adds exactly as much. Nothing cancels.'
        : 'Its mirror piece is just as far away, so it adds exactly as much. Nothing here cancels.'
      : 'A potential has no direction, and this charge has one sign. Nothing cancels.')
      : CANCEL_LINES[geometry] ?? 'Nothing cancels: every piece is above the x-axis, so both parts of each survive.',
    // At a finite N the chain is the N-piece estimate -- the figure labels it ΣΔE and the board writes
    // it with ≈ -- and it can be far off: at N = 3 beside a long rod it is nearly three times the field.
    // It becomes the field only as the pieces shrink, which is the next stage, so it says so.
    add: exact ? (scalar ? 'Stack every piece’s contribution. The column is exactly the potential at P: every piece is the same distance away.'
        : 'Every piece’s arrow, tip to tail. The sum ends exactly at the field at P: every piece is equally far, at the same angle.')
      : scalar ? `Stack every ${unit}’s contribution. The column is their sum\u00a0— the potential at P once they shrink.`
      : `Every ${unit}’s arrow, tip to tail: the chain is their sum\u00a0— the field at P once they shrink.`,
    limit: exact ? 'Without end: the sum becomes an integral, and the answer does not move. It was already exact.'
      : `Without end: the sum becomes an integral, and the ${scalar ? 'potential' : 'field'} stops depending on the cut.`,
  };
  const piece = scalar ? `Each ${unit} adds its own number to the total: k times its charge over its distance. Direction does not come into it at all, which is what makes a potential so much easier to add up than a field.`
    : unbounded ? 'Each piece is cut to cover the same angle at P. That makes every one contribute exactly as much at P: the far pieces hold more charge, but they are farther away, and the two exactly offset.'
    : geometry === 'sheet' ? 'Each ring is cut to cover the same angle at P. The far rings are farther away, but they are so much bigger that each makes a bigger field at P, not a smaller one.'
    : geometry === 'disk' ? 'One thin ring at a time. Every bit of it is the same distance from P and makes the same angle with the axis\u00a0— which is what lets the whole ring be added up at once in the next step.'
    : exact ? 'Each piece is drawn as a point charge at its middle, its field along the line joining them. A large piece’s own field leans a little closer to the axis, but its part along the axis is exactly this one’s, and that is the only part that will count.'
    : 'Each piece makes a field at P along the line joining them. How big depends on how much charge it holds and how far away it is.';
  // A ring is not a point charge, and saying so is the honest start for a disk or a sheet: what
  // makes a ring easy is not that it is small, but that all of it is the same distance away.
  // The sheet's rings are not thin, and thin in ANGLE does not put their bits nearly one distance
  // from P either: at five pieces the fourth ring's bits run from 0.77 to 1.47 times its middle
  // distance, and the fifth never ends. What a thin angle buys is that the ring's FIELD at P is
  // nearly a thin ring's -- the same bridge the unbounded lines' pieces take.
  const cut = geometry === 'sheet'
    ? 'Start by cutting the sheet into rings that each take the same small angle at P. Each ring makes nearly the field at P of a thin ring at its middle angle\u00a0— even the outermost, which never ends\u00a0— and all of a thin ring is one distance away, which is what lets it be added up at once.'
    : surface
    ? 'Start by cutting the disk into thin rings. A ring is not a point charge, but every bit of it is the same distance from P\u00a0— and that is all the next steps need.'
    // Not "each one is a point charge": at every N the outermost piece is infinitely long. What a
    // thin enough angle buys is that the piece's FIELD at P is a point charge's.
    : unbounded
      ? `Start by cutting the line into pieces that each take up the same small angle at P. Made thin enough in angle, each piece makes the field at P that a point charge would\u00a0— and for a point charge the field is something we already know.`
      : exact
        ? `Start by cutting the ${geometry === 'arc' ? 'arc' : 'ring'} into pieces. They need not even be small: every bit of every piece is ${geometry === 'arc' ? 'R from P' : scalar ? 'the same distance from P' : 'the same distance from P at the same angle to the axis'}, so each piece’s ${scalar ? 'potential' : 'part along the axis'} is exactly a point charge’s\u00a0— and for a point charge the ${scalar ? 'potential' : 'field'} is something we already know.`
        : `Start by cutting the charge into pieces small enough that each one is just a point charge\u00a0— and for a point charge the ${scalar ? 'potential' : 'field'} is something we already know.`;
  // The chain is the arrows themselves, not their surviving parts: it is the sideways parts
  // undoing each other along the way that makes it bend back, where the geometry is symmetric.
  const stops = `where it stops is the sum of the N ${unit}s: the field at P once they shrink.`;
  // A ring is made thinner, not smaller.
  const shrink = surface ? 'rings thinner' : 'pieces smaller';
  const adds = exact
    ? 'Now add every piece’s arrow, tip to tail. The sideways parts undo each other along the way, so the chain bends back to the axis, and it ends exactly at the field at P: every piece is the same distance away at the same angle, so cutting finer changes nothing.'
    : geometry === 'axial' || surface
    ? `Now add every ${unit}’s arrow, tip to tail. They all point along the axis, so the chain runs straight, and ${stops}`
    : pairs
      ? `Now add every piece’s arrow, tip to tail. The sideways parts undo each other along the way, so the chain bends back to the axis, and ${stops}`
      : `Now add every piece’s arrow, tip to tail. Nothing undoes the sideways parts here, so the chain leans, and ${stops}`;
  return [
    // Long enough for the cuts to travel the length of the charge and for the line to be read.
    {key: 'pieces', name: 'Cut it up', seconds: 5, mode: 'divide', components: false, pair: false, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: 'element', line: lines.pieces, caption: cut},
    // One arrow and the distance it depends on. Not yet split into parts: that is the next idea,
    // and showing the parts here put two ideas on screen at once.
    {key: 'one', name: 'One piece', seconds: 6, mode: 'project', components: false, pair: false, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: 'distance', line: lines.one,
      caption: piece},
    {key: 'cancel', name: 'What cancels', seconds: pairs ? 6.5 : 5.5, mode: 'project', components: !scalar, pair: pairs, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: scalar ? '' : 'projection', line: lines.cancel,
      caption: scalar ? (pairs ? geometry === 'ring' ? PARTNER_ADDS_V_RING : PARTNER_ADDS_V : NO_CANCEL_V(unit)) : CANCELS[geometry] ?? NO_CANCEL},
    // The chain grows at an even pace -- easing would bunch the last pieces together -- and then
    // holds, finished, so the arrow it arrives at is seen before the pieces start to shrink.
    {key: 'add', name: 'Add them up', seconds: 8, mode: 'sum', components: false, pair: false, sum: [0, 1], continuum: [0, 0],
      moves: .8, pace: 'linear', term: 'bounds', line: lines.add,
      // An arrow chain for a field and a column for a potential: the same sum, one dimension
      // down. The field's caption talked about arrows bending, which a scalar has none of.
      caption: scalar
        ? exact
          ? 'Now stack every piece’s number on top of the last. The column can only grow one way\u00a0— there is no direction for it to bend back in\u00a0— and its height is already exactly the potential at P: every piece is the same distance away, so cutting finer changes nothing.'
          : `Now stack every ${unit}’s number on top of the last. The column can only grow one way\u00a0— there is no direction for it to bend back in\u00a0— and its height is the sum of the N ${unit}s: the potential at P once they shrink.`
        : adds},
    // Eased: one picture turning into another. It finishes early and holds on the integral.
    {key: 'limit', name: 'Shrink them', seconds: 6.5, mode: 'integrate', components: false, pair: false, sum: [1, 1], continuum: [0, 1],
      moves: .7, pace: 'ease', term: 'bounds', line: lines.limit,
      caption: exact
        ? scalar
          ? 'Finally, make the pieces smaller without end. Each segment of the column gets too thin to see and the sum becomes the integral, but the height does not move: every piece was already the same distance from P, so the sum was exact all along.'
          : 'Finally, make the pieces smaller without end. Each piece’s arrow shrinks to nothing while there are ever more of them, and the sum becomes the integral. The answer does not move: every piece was already the same distance from P at the same angle, so the sum was exact all along.'
        : scalar
        ? `Finally, make the ${shrink} without end. Each segment of the column gets too thin to see, the sum becomes the integral, and the height stops depending on how finely we chose to cut.`
        : `Finally, make the ${shrink} without end. Each ${unit}’s arrow shrinks to nothing while there are ever more of them, the sum becomes the integral, and the answer stops depending on how finely we chose to cut.`},
  ];
}
/** How far a stage's motion has got, `local` of the way through the stage: the moving share
 * stretched to fill, then held, and eased where the stage says so. */
export function motionAt(stage: BuildStage, local: number): number {
  const t = Math.max(0, Math.min(1, local / stage.moves));
  return stage.pace === 'ease' ? (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) : t;
}
export const totalSeconds = (stages: readonly BuildStage[]) => stages.reduce((t, s) => t + s.seconds, 0);
/** Which stage the run is in at `elapsed` seconds, and how far through that stage.
 *
 * Past the end it pins to the last stage, finished, so a run that overshoots its final frame
 * settles on the integral rather than snapping back to the first cut. */
export function stageAt(stages: readonly BuildStage[], elapsed: number): {index: number; stage: BuildStage; local: number} {
  let start = 0;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (elapsed < start + stage.seconds) {
      return {index: i, stage, local: Math.max(0, (elapsed - start) / stage.seconds)};
    }
    start += stage.seconds;
  }
  const i = stages.length - 1;
  return {index: i, stage: stages[i], local: 1};
}
/** Where a stage begins, in seconds — so a reader can jump straight to one. */
export function stageStart(stages: readonly BuildStage[], index: number): number {
  let t = 0;
  for (let i = 0; i < index && i < stages.length; i++) t += stages[i].seconds;
  return t;
}
