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
   * the run moved on before anyone could finish reading what it was showing. Plain text: the
   * marker's title and the screen reader's status read it. */
  line: string;
  /** The line as the transport sets it, every symbol in it written $…$ for the page's Prose. Printed
   * as plain text, the P, ΔE, k and R in it were upright sans under the figure's italic P and beside
   * the board's KaTeX one: three faces for one symbol on one screen, and "k times" read as a stray
   * letter. */
  prose: string;
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
  // Of the pieces and their mirrors, as the run's lines are (see `CANCEL_LINES`): a reader can choose the
  // run's piece, and at an odd N the middle one is its own mirror, with nothing drawn opposite it.
  bisector: 'Now the mirror pieces, each the same distance from P as its partner, on the other side of the x-axis. A piece’s part along the rod is equal and opposite to its mirror’s, so those two cancel\u00a0— and what is left of both points the same way, perpendicular to the rod.',
  // Not "the piece": at an odd N -- the default five among them -- no piece's middle is half a turn
  // from another's, and the figure draws an arc of the piece's length centred straight across. That
  // length of ring is what cancels the piece's part, at any N.
  ring: 'Now the same length of ring straight across from it. Its part across the axis is equal and opposite, so the two cancel\u00a0— and what is left of both points along the axis.',
  arc: 'Now the mirror pieces, at the mirror angles. A piece’s part across the axis is equal and opposite to its mirror’s, so those two cancel\u00a0— and what is left of both points along the axis.',
  infinite: 'Now the mirror pieces, on the other side of the perpendicular from P. A piece’s part along the line is equal and opposite to its mirror’s, so those cancel\u00a0— and what is left of both points perpendicular to the line.',
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
//
// Said of the pieces and their mirrors, not of "its mirror piece": a reader can choose the run's piece,
// and at an odd N the middle one is its own mirror, with no part along the rod to cancel. "Its mirror
// piece contributes as much at P" was then about a piece the figure does not draw.
const CANCEL_LINES: Record<string, string> = {
  bisector: 'Mirror pieces across the $x$-axis cancel each other’s parts along the rod; the perpendicular parts survive.',
  ring: 'The same length of ring straight across cancels the part across the axis. Only the part along it survives.',
  arc: 'Mirror pieces cancel each other’s parts across the axis. Only the parts along the axis survive.',
  infinite: 'Mirror pieces cancel each other’s parts along the line. Only the perpendicular parts survive.',
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
/** What a mirror pair does as it goes into the sum, in each lesson's own words for its two parts (see
 * `CANCEL_LINES`): true for either sign of charge, since it says which parts, not which way they point. */
const PAIR_PARTS: Record<string, string> = {
  bisector: 'the parts along the rod cancel, the perpendicular parts',
  infinite: 'the parts along the line cancel, the perpendicular parts',
  arc: 'the parts across the axis cancel, the parts along it',
};
const SCALAR_PAIRS = new Set(['bisector', 'ring', 'arc']);
const PARTNER_ADDS_V = 'Now its mirror piece. For the field, the sideways parts of these two would cancel, but nothing cancels in this potential: it has no direction, and all the charge has one sign. The mirror piece is the same distance from P, so it adds exactly the same amount, and both go on the column.';
// The ring's partner is a length of ring, not a piece (see CANCELS.ring): at an odd N it straddles two
// of the column's pieces, so it is not said to go on the column as one.
const PARTNER_ADDS_V_RING = 'Now the same length of ring straight across. For the field, the sideways parts of the two would cancel, but nothing cancels in this potential: it has no direction, and all the charge has one sign. It is the same distance from P, so it adds exactly as much to V.';
/** A no-break space, joining a word to the symbol after it so a line never ends on a lone "P." */
const NB = '\u00a0';
/** A line as plain text: its symbols unmarked, the few TeX names in them as the letters they are, and
 * the no-break space before a symbol an ordinary one -- only a line that is set needs it. */
const plain = (text: string) => text.replace(/\u00a0\$/g, ' $').replace(/\$([^$]*)\$/g, (_, tex: string) => tex.replace(/\\Delta\s*/g, 'Δ').replace(/\\cos\s*/g, 'cos ').replace(/\\theta/g, 'θ'));
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
  //
  // Every symbol in them is written $…$ (see `prose`), and a word is joined to the P after it.
  const P = `${NB}$P$`;
  const lines = {
    // The sheet is cut at equal angles at P, not into thin rings: at five pieces its fourth ring runs
    // from about four to nine metres out and its fifth never ends, so "every bit of one ring is the
    // same distance from P" was false of it. The disk's rings are thin, and it is true of them.
    //
    // And why by angle, which is the method's whole point and was said nowhere: an endless charge has no
    // last piece of equal width, but seen from P its angles stop.
    pieces: geometry === 'sheet' ? `Rings of equal angle at${P}: the sheet never ends, but its angles do.`
      : surface ? `Thin rings: every bit of one ring is the same distance from${P}.`
      : unbounded ? `Pieces of equal angle at${P}: the line never ends, but its angles do.`
      // A ring's or an arc's pieces need not be small: every bit of one is as far from P as every bit
      // of another (for the ring's field, at the same angle too), so a piece's share is exactly a
      // point charge's at any size. The run opened these by saying smallness was what made a piece a
      // point charge, then said the sum was exact however it was cut.
      //
      // For the ring's field the distance is not enough -- the arc's line below says so of the same
      // premise -- and what makes a piece's axial part exact is the angle too. Its caption said so; the
      // line, the one sentence a sighted reader sees, did not.
      : exact ? (geometry === 'arc' ? `Pieces of any size: every bit of every piece is $R$ from${P}.`
        : scalar ? `Pieces of any size: every bit of every piece is the same distance from${P}.`
        : `Pieces of any size: all of a piece is equally far from${P}, at one angle to the axis.`)
      // The arc's field: every bit IS R from P, so "small enough to be a point charge" left a reader
      // asking what goes wrong with a big piece. Direction does: the field turns along a piece.
      : geometry === 'arc' ? `Short pieces: every bit is $R$ from${P}, but the field’s direction turns along a piece.`
      // Small compared with what: a piece beside P is not a point charge however short it is said to be.
      // At r = ½ beside L = 8 and three pieces the bisector's chain is 2.7 times the field.
      : `Pieces small enough beside their distance from${P} to be nearly point charges.`,
    // k times: a charge over a distance is not a potential, and the caption beside it says k.
    one: scalar ? (surface ? `A thin ring adds $k$ times its charge over its distance: all of it is equally far from${P}.`
        : `It adds $k$ times its charge over its distance to the potential at${P}: a number.`)
      : unbounded ? `Every equal-angle piece contributes exactly as much at${P}: the far ones hold more charge.`
      // Only cut at equal angles: cut into rings of equal width, a sheet's rings peak at s = z/√2.
      : geometry === 'sheet' ? `Cut at equal angles, each farther ring is so much bigger that it makes a bigger $\\Delta E$ at${P}.`
      // Its own idea, not Cut it up's again ("every bit of one ring is the same distance from P"): the
      // bits are point charges, and a thin ring's are all one distance and one angle away.
      : geometry === 'disk' ? `Its bits are point charges, all one distance and one angle from${P}: the ring adds up at once.`
      // The ring's Cut it up says a piece's part along the axis is exactly a point charge's at any size;
      // "a piece's field lies along the line joining them" holds only of a small piece, so the two read
      // as one claim and contradicted each other. At three pieces a piece is a third of the ring, and its
      // own field leans in, 28.9° from the axis against the 33.7° drawn: what is exact is its part along
      // the axis, the only part the ring's sum keeps.
      : exact ? `Drawn as a point charge’s, its field lies along the line to${P}. Its axial part is exact at any size.`
      // Every piece of the arc is R from P and holds λRΔθ: the two things the generic line points at --
      // more charge, farther away -- are the two that do not vary here. Only direction does, which is
      // why the answer is 2kλ sin(φ/2)/R.
      : geometry === 'arc' ? `Every piece is $R$ from${P} and holds the same charge: the arrows differ only in direction.`
      : `A piece’s field at${P} lies along the line joining them: more charge, bigger; farther, smaller.`,
    cancel: scalar ? (pairs ? geometry === 'ring' ? 'The same length of ring straight across is just as far away, so it adds exactly as much. Nothing cancels.'
        : 'Each piece’s mirror is just as far away, so it adds exactly as much. Nothing here cancels.'
      : 'A potential has no direction, and this charge has one sign. Nothing cancels.')
      : CANCEL_LINES[geometry] ?? `Nothing cancels: every piece is above the${NB}$x$-axis, so both parts of each survive.`,
    // At a finite N the chain is the N-piece estimate -- the figure labels it ΣΔE and the board writes
    // it with ≈ -- and it can be far off: at N = 3 beside a long rod it is nearly three times the field.
    // It becomes the field only as the pieces shrink, which is the next stage, so it says so.
    // IN MIRROR PAIRS where the charge has a mirror about P's axis: the figure adds a piece and its mirror
    // together, so the sum is an arrow along the axis at every moment (see `pairs.ts` in the diagrams). Laid tip
    // to tail in order instead, the endless line's arrows made a great arch whose cancelling was never seen.
    // In the board's own components -- ΔE_y and ΔE_x, a ring's ΔE_⊥ and ΔE_z -- and short: the transport sets
    // every stage's line in one cell, and a longer one here pushed it off a phone held on its side.
    add: pairs && !scalar ? (exact ? `Pairs straight across: parts across the axis cancel, $z$ parts add, exactly to the field at${P}.`
        : `Mirror pairs: their $y$ parts cancel, their $x$ parts add. The sum: the field at${P} once they shrink.`)
      : exact ? (scalar ? `Stack every piece’s contribution. The column is exactly the potential at${P}: every piece is the same distance away.`
        : `Every piece’s arrow, tip to tail. The sum ends exactly at the field at${P}: every piece is equally far, at the same angle.`)
      : scalar ? `Stack every ${unit}’s contribution. The column is their sum — the potential at${P} once they shrink.`
      : `Every ${unit}’s arrow, tip to tail: the chain is their sum — the field at${P} once they shrink.`,
    // WHY THE SUM BECOMES THE ANSWER. "The field stops depending on the cut" was opaque ("the cut"?), and
    // said nothing of why: what Cut it up and Add them up called only nearly true -- a piece treated as a
    // point charge -- is what shrinking makes exact. Each lesson names its own approximation, as the
    // board's Add does.
    limit: exact ? 'Without end: the sum becomes an integral, and the answer does not move. It was already exact.'
      : geometry === 'arc' ? 'Without end: $\\cos\\theta$ stops changing across a piece, and the sum becomes the integral, exactly.'
      : geometry === 'sheet' ? 'Without end: treating each ring as a thin ring becomes exact, and the sum becomes the integral.'
      : surface ? 'Without end: counting each ring’s charge at one radius becomes exact, and the sum becomes the integral.'
      : 'Without end: treating each piece as a point charge becomes exact, and the sum becomes the integral.',
  };
  const piece = scalar ? `Each ${unit} adds its own number to the total: k times its charge over its distance. Direction does not come into it at all, which is what makes a potential so much easier to add up than a field.`
    : unbounded ? 'Each piece is cut to cover the same angle at P. That makes every one contribute exactly as much at P: the far pieces hold more charge, but they are farther away, and the two exactly offset.'
    : geometry === 'sheet' ? 'Each ring is cut to cover the same angle at P. The far rings are farther away, but they are so much bigger that each makes a bigger field at P, not a smaller one.'
    : geometry === 'disk' ? 'One thin ring at a time. Every bit of it is the same distance from P and makes the same angle with the axis\u00a0— which is what lets the whole ring be added up at once in the next step.'
    : exact ? 'Each piece is drawn as a point charge at its middle, its field along the line joining them. A large piece’s own field leans a little closer to the axis, but its part along the axis is exactly this one’s, and that is the only part that will count.'
    : geometry === 'arc' ? 'Each piece makes a field at P along the radius, pointing back through the centre for positive charge. Every piece is the same distance away and holds the same charge, so every arrow is the same size; only its direction changes round the arc.'
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
    ? 'Start by cutting the disk into thin rings, narrow beside their distance from P. A ring is not a point charge, but every bit of a thin one is the same distance from P\u00a0— and that is all the next steps need.'
    // Not "each one is a point charge": at every N the outermost piece is infinitely long. What a
    // thin enough angle buys is that the piece's FIELD at P is a point charge's.
    : unbounded
      ? `Start by cutting the line into pieces that each take up the same small angle at P. Made thin enough in angle, each piece makes the field at P that a point charge would\u00a0— and for a point charge the field is something we already know.`
      : exact
        ? `Start by cutting the ${geometry === 'arc' ? 'arc' : 'ring'} into pieces. They need not even be small: every bit of every piece is ${geometry === 'arc' ? 'R from P' : scalar ? 'the same distance from P' : 'the same distance from P at the same angle to the axis'}, so each piece’s ${scalar ? 'potential' : 'part along the axis'} is exactly a point charge’s\u00a0— and for a point charge the ${scalar ? 'potential' : 'field'} is something we already know.`
        // Short beside what: the arc's every bit is R from P, so what a long piece gets wrong is direction.
        : geometry === 'arc'
          ? 'Start by cutting the arc into pieces short compared with their distance from P, which is R. Every bit of a piece is R from P, but the bits’ fields point different ways, so only a short piece is nearly a point charge\u00a0— and for a point charge the field is something we already know.'
          : `Start by cutting the charge into pieces short compared with their distance from P: small enough that each one is nearly a point charge\u00a0— and for a point charge the ${scalar ? 'potential' : 'field'} is something we already know.`;
  // The chain is the arrows themselves, not their surviving parts: it is the sideways parts
  // undoing each other along the way that makes it bend back, where the geometry is symmetric.
  const stops = `where it stops is the sum of the N ${unit}s: the field at P once they shrink.`;
  // WHY THE LIMIT IS THE ANSWER, IN THE CAPTION TOO. The line was changed to name each lesson's own
  // approximation, the one that shrinking makes exact; the caption read to a screen reader still ended
  // "the answer stops depending on how finely we chose to cut", the reason the line had dropped. And it
  // said "smaller" where the board's rule and the line say "thinner".
  const exactNow = geometry === 'arc' ? 'taking cos θ at each piece’s middle, which was only nearly right, becomes exact, since cos θ stops changing across a piece'
    : geometry === 'sheet' ? 'treating each ring as a thin ring, which was only nearly right, becomes exact'
    : surface ? 'counting each ring’s charge at one radius, which was only nearly right, becomes exact'
    : 'treating each piece as a point charge, which was only nearly right, becomes exact';
  // The pairs' order, said: from the middle out on a rod, a line or an arc; round the ring, where every piece is
  // as near as every other.
  const adds = pairs && exact
    ? 'Now add the pieces in pairs, each with the same length of ring straight across from it. In each pair the parts across the axis cancel and the parts along it add, so the sum grows straight along the axis and ends exactly at the field at P: every piece is the same distance away at the same angle, so cutting finer changes nothing.'
    : pairs
    ? `Now add the pieces in mirror pairs, working out from the middle. In each pair ${PAIR_PARTS[geometry]} add, so the sum runs straight along the axis, pair by pair, and ${stops}`
    : exact
    ? 'Now add every piece’s arrow, tip to tail. The sideways parts undo each other along the way, so the chain bends back to the axis, and it ends exactly at the field at P: every piece is the same distance away at the same angle, so cutting finer changes nothing.'
    : geometry === 'axial' || surface
    ? `Now add every ${unit}’s arrow, tip to tail. They all point along the axis, so the chain runs straight, and ${stops}`
    : pairs
      ? `Now add every piece’s arrow, tip to tail. The sideways parts undo each other along the way, so the chain bends back to the axis, and ${stops}`
      : `Now add every piece’s arrow, tip to tail. Nothing undoes the sideways parts here, so the chain leans, and ${stops}`;
  return [
    // Long enough for the cuts to travel the length of the charge and for the line to be read.
    {key: 'pieces', name: 'Cut it up', seconds: 5, mode: 'divide', components: false, pair: false, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: 'element', line: plain(lines.pieces), prose: lines.pieces, caption: cut},
    // One arrow and the distance it depends on. Not yet split into parts: that is the next idea,
    // and showing the parts here put two ideas on screen at once.
    // A disk's and a sheet's second step is one ring -- its line and the board's say so -- and its name,
    // the figure's stage label and the transport's marker said "One piece".
    {key: 'one', name: surface ? 'One ring' : 'One piece', seconds: 6, mode: 'project', components: false, pair: false, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: 'distance', line: plain(lines.one), prose: lines.one,
      caption: piece},
    {key: 'cancel', name: 'What cancels', seconds: pairs ? 6.5 : 5.5, mode: 'project', components: !scalar, pair: pairs, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: scalar ? '' : 'projection', line: plain(lines.cancel), prose: lines.cancel,
      caption: scalar ? (pairs ? geometry === 'ring' ? PARTNER_ADDS_V_RING : PARTNER_ADDS_V : NO_CANCEL_V(unit)) : CANCELS[geometry] ?? NO_CANCEL},
    // The chain grows at an even pace -- easing would bunch the last pieces together -- and then
    // holds, finished, so the arrow it arrives at is seen before the pieces start to shrink.
    {key: 'add', name: 'Add them up', seconds: 8, mode: 'sum', components: false, pair: false, sum: [0, 1], continuum: [0, 0],
      moves: .8, pace: 'linear', term: 'bounds', line: plain(lines.add), prose: lines.add,
      // An arrow chain for a field and a column for a potential: the same sum, one dimension
      // down. The field's caption talked about arrows bending, which a scalar has none of.
      caption: scalar
        ? exact
          ? 'Now stack every piece’s number on top of the last. The column can only grow one way\u00a0— there is no direction for it to bend back in\u00a0— and its height is already exactly the potential at P: every piece is the same distance away, so cutting finer changes nothing.'
          : `Now stack every ${unit}’s number on top of the last. The column can only grow one way\u00a0— there is no direction for it to bend back in\u00a0— and its height is the sum of the N ${unit}s: the potential at P once they shrink.`
        : adds},
    // Eased: one picture turning into another. It finishes early and holds on the integral.
    {key: 'limit', name: 'Shrink them', seconds: 6.5, mode: 'integrate', components: false, pair: false, sum: [1, 1], continuum: [0, 1],
      moves: .7, pace: 'ease', term: 'bounds', line: plain(lines.limit), prose: lines.limit,
      caption: exact
        ? scalar
          ? 'Finally, make the pieces thinner without end. Each segment of the column gets too thin to see and the sum becomes the integral, but the height does not move: every piece was already the same distance from P, so the sum was exact all along.'
          : 'Finally, make the pieces thinner without end. Each piece’s arrow shrinks to nothing while there are ever more of them, and the sum becomes the integral. The answer does not move: every piece was already the same distance from P at the same angle, so the sum was exact all along.'
        : scalar
        ? `Finally, make the ${unit}s thinner without end. Each segment of the column gets too thin to see, and the sum becomes the integral: ${exactNow}.`
        : `Finally, make the ${unit}s thinner without end. Each ${unit}’s arrow shrinks to nothing while there are ever more of them, and the sum becomes the integral: ${exactNow}.`},
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
