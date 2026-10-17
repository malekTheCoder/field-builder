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
  bisector: 'Now the mirror pieces, each the same distance from P as its partner, on the other side of the x-axis. A piece’s part along the rod is equal and opposite to its mirror’s, so those two cancel, and what is left of both points the same way, perpendicular to the rod.',
  // Only part of this rod has mirrors: the stretch that reaches as far beyond P's level on the long side as the nearer
  // end does on the short side. The rest is the leftover, and it is the whole of what the lesson adds to the bisector.
  offset: 'Now the mirror pieces, each as far from P as its partner across the x-axis. Only the stretch reaching as far beyond P’s level on the long side as the near end does on the short side has them: there a pair’s parts along the rod cancel, and their perpendicular parts add. The leftover has no mirrors, so its pieces keep both parts.',
  // Not "the piece": at an odd N -- the default five among them -- no piece's middle is half a turn
  // from another's, and the figure draws an arc of the piece's length centred straight across. That
  // length of ring is what cancels the piece's part, at any N.
  ring: 'Now the same length of ring straight across from it. Its sideways part is equal and opposite, so the two cancel, and what is left of both points along the axis.',
  arc: 'Now the mirror pieces, at the mirror angles. A piece’s part across the axis is equal and opposite to its mirror’s, so those two cancel, and what is left of both points along the axis.',
  // WHAT THE UNEVEN DENSITY CHANGES. Not what cancels: cos(−θ) = cos θ, so a piece and its mirror still hold equal
  // charges and cancel exactly as the even arc's do. What changes is how much each pair is worth -- the heavy pairs sit
  // near the axis, where nearly all of a piece's field points along it, and the light ones near the ends, whose fields
  // lie mostly across the axis, are the ones that cancel most. So less of the charge is spent on cancelling.
  'uneven-arc': 'Now the mirror pieces. Since cos(−θ) = cos θ, a piece and its mirror hold the same charge: their parts across the axis cancel. The density changes how much a pair adds, not what cancels: a heavy pair’s pieces near the axis point almost along it, so little cancels; a light pair’s near an end point almost across it, and mostly cancel.',
  infinite: 'Now the mirror pieces, on the other side of the perpendicular from P. A piece’s part along the line is equal and opposite to its mirror’s, so those cancel, and what is left of both points perpendicular to the line.',
  // The board says how a ring cancels -- each bit's part across the axis undone by the bit straight
  // across -- so the note under it says what that leaves, rather than the same sentence again.
  disk: 'A disk is rings, and each ring has already cancelled its own sideways parts. Nothing sideways is left: each ring’s field at P points straight along the axis.',
  // The hole takes whole rings away, so what is left cancels round each ring exactly as the disk's does.
  annulus: 'An annulus is rings too, and each ring left round the hole is still whole, so it has already cancelled its own sideways parts. Nothing sideways is left: each ring’s field at P points straight along the axis.',
  // The sheet cancels within each ring exactly as the disk does. What is different, and is the
  // thing a reader carrying the line lessons' story will get wrong, is the tail: cut at equal
  // angles from P, the rings make a BIGGER field the further out they are, not a smaller one.
  sheet: 'A sheet is rings too, and each ring has already cancelled its own sideways parts. Nothing is left over to cancel. But notice the far rings. Cut at equal angles, each is weaker for its size, yet so much bigger that its field at P is bigger than the last one’s.',
  // The rod seen end-on is the most symmetric of all, not the least: turn it about P's line and
  // nothing changes, so no piece has a sideways part to begin with. The shared "no symmetry"
  // story below would deny the very symmetry that makes this field point along the axis.
  axial: 'Nothing is left to cancel: every piece sits on P’s own line, so each arrow already points along the axis. There are no sideways parts at all.',
  // No partner at all: the line stops at the foot of the perpendicular, so the part along it
  // survives. Saying "every contribution points much the same way" was wrong here -- they fan
  // through a right angle -- and it hid the one consequence worth seeing.
  semi: 'Nothing cancels here. The line starts level with P and runs only upward, so there is no charge below to undo the part along the line. Every piece keeps both of its parts, which is why this field leans instead of pointing perpendicular to the line.',
};
/** The cancellation in one sentence each, for reading while the arrows move. */
//
// Said of the pieces and their mirrors, not of "its mirror piece": a reader can choose the run's piece,
// and at an odd N the middle one is its own mirror, with no part along the rod to cancel. "Its mirror
// piece contributes as much at P" was then about a piece the figure does not draw.
//
// EACH UNDER NINETY CHARACTERS. The transport sets every stage's line in one cell, as tall as the
// tallest, so one line that wrapped to four on a phone made every stage of that lesson hold four lines
// of text under the bar; several ended on a one-word runt ("survive.", "integral."). A line is one short
// sentence for reading while the figure moves: `tests/panel-w3.test.ts` holds each to ninety.
//
// ONE WORD FOR ONE THING ON THE ROUND LESSONS. The ring's lines said "across" of the partner (straight
// across the ring) and of the part it cancels (across the axis), in one sentence; and "axial", a word the
// page never defines. The partner is half a turn round, the part it cancels is sideways -- the board's
// word -- and what survives is the part along the axis.
const CANCEL_LINES: Record<string, string> = {
  bisector: 'Mirror pieces cancel each other’s parts along the rod; the perpendicular parts survive.',
  offset: 'Mirror pieces cancel their parts along the rod; the leftover’s pieces keep theirs.',
  // Of the piece's part, not of "the ring half a turn round", which named the whole ring as the partner. Nor
  // "the piece half a turn round": at an odd N that is the cut between two pieces (see `PAIR_RING` on the board).
  ring: 'Each piece’s sideways part is undone half a turn round; the part along the axis survives.',
  arc: 'Mirror pieces cancel each other’s parts across the axis; the parts along it survive.',
  'uneven-arc': 'Mirror pieces hold equal charge: across the axis they cancel; along it they survive.',
  infinite: 'Mirror pieces cancel each other’s parts along the line; the perpendicular parts survive.',
  disk: 'Each ring’s sideways parts already cancel round it: only the part along the axis is left.',
  annulus: 'The hole leaves whole rings, whose sideways parts cancel: the part along the axis is left.',
  sheet: 'Each ring’s sideways parts already cancel round it: only the part along the axis is left.',
  semi: 'Nothing cancels: with no charge past the end, both parts survive and the field leans.',
  axial: 'Every piece is on the axis, so every arrow already points along it: nothing to cancel.',
};
/* A scalar lesson must never borrow its field twin's cancellation story, even though it shares
 * the twin's geometry. V is a number; "the sideways parts cancel" is meaningless about it, and
 * teaching it here would plant the exact confusion these lessons exist to clear up.
 *
 * Nor may it say that numbers cannot cancel: they can, if they have opposite signs -- a dipole's
 * potential is zero all along its bisector while its field is not. What makes nothing cancel HERE
 * is that every lesson's charge has one sign, so every piece adds with that sign. */
const NO_CANCEL_V = (unit: string) => `Nothing cancels here. V is a number, not an arrow, so there is no direction in which one ${unit} could undo another, and all of this charge has the same sign, so every ${unit} adds to V with that sign. V is simply the sum of what each ${unit} is worth.`;
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
const PAIRS = new Set(['bisector', 'offset', 'infinite', 'ring', 'arc', 'uneven-arc']);
/** What a mirror pair does as it goes into the sum, in each lesson's own words for its two parts (see
 * `CANCEL_LINES`): true for either sign of charge, since it says which parts, not which way they point.
 * And which way the sum then runs, named: "straight along the axis" never said which axis on the rod and
 * the line, which lie ON the y-axis and never define "the axis" -- heard by a screen reader, it could be
 * the rod's own, the opposite of what happens. The arc's board defines its axis as its line of symmetry.
 * Along it, not "out" along it: for a negative charge the sum runs in toward the rod. */
const PAIR_PARTS: Record<string, {parts: string; runs: string}> = {
  bisector: {parts: 'the parts along the rod cancel, the perpendicular parts', runs: 'straight along the x-axis, perpendicular to the rod'},
  infinite: {parts: 'the parts along the line cancel, the perpendicular parts', runs: 'straight along the x-axis, perpendicular to the line'},
  arc: {parts: 'the parts across the axis cancel, the parts along it', runs: 'straight along the axis'},
  'uneven-arc': {parts: 'the parts across the axis cancel, the parts along it', runs: 'straight along the axis'},
};
const SCALAR_PAIRS = new Set(['bisector', 'ring', 'arc']);
// Of the mirror pieces, as the field's captions are: at an odd N the run's piece can be the middle one,
// its own mirror, with nothing drawn opposite it, and "Now its mirror piece" described a piece the
// figure rightly leaves out.
const PARTNER_ADDS_V = 'Now the mirror pieces. For the field, the sideways parts of a piece and its mirror would cancel, but nothing cancels in this potential: it has no direction, and all the charge has one sign. Each mirror piece is the same distance from P as its partner, so it adds exactly the same amount, and both go on the column.';
// The ring's partner is a length of ring, not a piece (see CANCELS.ring): at an odd N it straddles two
// of the column's pieces, so it is not said to go on the column as one.
const PARTNER_ADDS_V_RING = 'Now the same length of ring straight across. For the field, the sideways parts of the two would cancel, but nothing cancels in this potential: it has no direction, and all the charge has one sign. It is the same distance from P, so it adds exactly as much to V.';
/** A no-break space, joining a word to the symbol after it so a line never ends on a lone "P." */
const NB = '\u00a0';
/** A line as plain text: its symbols unmarked, the few TeX names in them as the letters they are, and
 * the no-break space before a symbol an ordinary one -- only a line that is set needs it. */
const plain = (text: string) => text.replace(/\u00a0\$/g, ' $').replace(/\$([^$]*)\$/g, (_, tex: string) => tex.replace(/\\Delta\s*/g, 'Δ').replace(/\\cos\s*/g, 'cos ').replace(/\\theta/g, 'θ').replace(/\\alpha/g, 'α').replace(/\\to\s*/g, '→').replace(/\\infty/g, '∞'));
/** THE PART OF THE CHARGE THE RUN IS ABOUT, where the reader bracketed one: the run used to throw the bracket away
 * as it opened, so its lines could always speak of the whole charge. It keeps it now, and adds up what the reader
 * chose -- so where only part is bracketed, every line from What cancels on is about that part. `keeps` says every
 * bracketed piece's mirror is bracketed too; `mirrorIn` says the run's own piece's is. */
export type RunBracket = {keeps: boolean; mirrorIn: boolean};
export function buildStages(p: Problem, bracket?: RunBracket): BuildStage[] {
  const geometry = p.geometry, scalar = p.quantity === 'V';
  // A ring's field along its axis, and a ring's or an arc's potential, are exact at any cut: every
  // piece is the same distance from P (at the same angle), so each piece's share is exactly what the
  // sum says. The run said the chain and the column become the answer "once they shrink", teaching
  // that calculus corrects a ring's answer -- the opposite of the ring's lesson.
  const pairs = scalar ? SCALAR_PAIRS.has(geometry) : PAIRS.has(geometry);
  // Part of the charge: its sum is no longer what the whole lesson's lines say it is. A field's part across the axis
  // survives wherever a bracketed piece's mirror is outside, and then a ring's sum is exact only along the axis --
  // the part across it is not -- so the bracketed ring is told as any other charge is. A potential has no part
  // across, and every bit of a ring or an arc is still one distance from P: those stay exact.
  const part = !!bracket;
  const exact = exactSum(p) && (!part || scalar);
  // The mirror is drawn in What cancels only where it lies inside the bracket.
  const mirrored = pairs && (!part || bracket.mirrorIn);
  // How big a field a piece makes at P is where the geometries genuinely differ, so it is not said
  // once for all of them. "Further away is weaker" is true of a fixed amount of charge and false of
  // the pieces several lessons draw: cut at equal angles from P, every piece of an infinite line
  // contributes EXACTLY as much; a sheet's rings make a bigger field further out, because they hold
  // more charge; and the ramp's far pieces hold more charge too.
  // THE LINES READ WHILE IT MOVES. One sentence each, short enough to finish before the stage
  // does. The long captions are still there, beside the algebra, for reading at rest.
  const unbounded = geometry === 'infinite' || geometry === 'semi';
  const surface = geometry === 'disk' || geometry === 'sheet' || geometry === 'annulus';
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
    //
    // THE CONDITION, NOT THE FACT. These lines are read while the figure shows the pieces the sliders cut,
    // and the sliders reach three rings on a disk of R = 4 with P half a unit up: its inner "thin ring"
    // spans s = 0 to 1.33, its bits 0.5 to 1.42 from P. "Thin rings: every bit … is the same distance"
    // was false of the picture under it. What is true at every setting is the rule the limit uses.
    pieces: geometry === 'sheet' ? `Rings of equal angle at${P}: the sheet never ends, but its angles do.`
      : surface ? `The thinner a ring, the more nearly all of it is the same distance from${P}.`
      : unbounded ? `Pieces of equal angle at${P}: the line never ends, but its angles do.`
      // A ring's or an arc's pieces need not be small: every bit of one is as far from P as every bit
      // of another (for the ring's field, at the same angle too), so a piece's share is exactly a
      // point charge's at any size. The run opened these by saying smallness was what made a piece a
      // point charge, then said the sum was exact however it was cut.
      //
      // For the ring's field the distance is not enough -- the arc's line below says so of the same
      // premise -- and what makes a piece's axial part exact is the angle too. Its caption said so; the
      // line, the one sentence a sighted reader sees, did not.
      //
      // Said of the whole ring, which is what the reason is about: "all of a piece is equally far from P"
      // left a reader asking what "all of a piece" was.
      : exact ? (geometry === 'arc' ? `Pieces of any size: every bit of every piece is $R$ from${P}.`
        : scalar ? `Pieces of any size: every bit of every piece is the same distance from${P}.`
        : `All of the ring is one distance and one angle from${P}, so pieces need not be small.`)
      // The arc's field: every bit IS R from P, so "small enough to be a point charge" left a reader
      // asking what goes wrong with a big piece. Direction does: the field turns along a piece.
      : geometry === 'arc' ? `Short pieces: every bit is $R$ from${P}, but the field’s direction turns along a piece.`
      // And the density changes along one too: it is the piece's charge, as well as its direction, taken at its middle.
      : geometry === 'uneven-arc' ? `Short pieces: all $R$ from${P}, but the density and the direction change along one.`
      // Small compared with what: a piece beside P is not a point charge however short it is said to be.
      // At r = ½ beside L = 8 and three pieces the bisector's chain is 2.7 times the field -- and there the
      // drawn pieces are five times their distance from P, so the line says when a piece is nearly a point
      // charge, not that these are. "Compared with", not "beside": that read as "next to".
      : `A piece short compared with its distance from${P} is nearly a point charge.`,
    // k times: a charge over a distance is not a potential, and the caption beside it says k.
    one: scalar ? (surface ? `A thin ring adds $k$ times its charge over its distance: all of it is equally far from${P}.`
        // "It adds k times its charge over its distance to the potential at P" had no antecedent for "It",
        // and "its distance to the potential" parsed first. What is added, then what it is.
        : `Each piece adds a number to the potential at${P}: $k$ times its charge over its distance.`)
      // Both halves of the reason: "the far ones hold more charge" alone would make them contribute MORE.
      : unbounded ? `Equal-angle pieces make the same $|\\Delta E|$ at${P}: far ones hold more charge, but are farther.`
      // Only cut at equal angles: cut into rings of equal width, a sheet's rings peak at s = z/√2.
      : geometry === 'sheet' ? `Cut at equal angles, each farther ring is so much bigger that it makes a bigger $\\Delta E$ at${P}.`
      // Its own idea, not Cut it up's again ("every bit of one ring is the same distance from P"): the
      // bits are point charges, and a thin ring's are all one distance and one angle away -- a thin ring's,
      // not every drawn ring's: at three rings the inner one is a third of the disk wide.
      // "One angle from P" was not a thing a student could picture: the angle is the line's to the axis.
      : geometry === 'disk' || geometry === 'annulus' ? `Every bit of a thin ring is equally far from${P}, at the same angle: it adds up at once.`
      // The ring's Cut it up says a piece's part along the axis is exactly a point charge's at any size;
      // "a piece's field lies along the line joining them" holds only of a small piece, so the two read
      // as one claim and contradicted each other. At three pieces a piece is a third of the ring, and its
      // own field leans in, 28.9° from the axis against the 33.7° drawn: what is exact is its part along
      // the axis, the only part the ring's sum keeps.
      //
      // "Drawn as a point charge's field" asked "drawn as a point charge's what?", and "axial" is a word the
      // page never defines: the part along the axis, as the board says it.
      : exact ? `Treated as a point charge, a piece’s part along the axis is exact at any size.`
      // Every piece of the arc is R from P and holds λRΔθ: the two things the generic line points at --
      // more charge, farther away -- are the two that do not vary here. Only direction does, which is
      // why the answer is 2kλ sin(φ/2)/R.
      : geometry === 'arc' ? `Every piece is $R$ from${P} and holds the same charge: the arrows differ only in direction.`
      // The one thing the even arc's line rules out, back: the pieces near the axis hold more charge.
      : geometry === 'uneven-arc' ? `Every piece is $R$ from${P}, but those near the axis hold more: their arrows are longer.`
      : `A piece’s field lies along the line to${P}: more charge, bigger; farther, smaller.`,
    cancel: scalar ? (part && pairs && !bracket.mirrorIn ? 'Its mirror is outside the bracket, so it is not added; and a potential has no direction.'
      : pairs ? geometry === 'ring' ? 'An equal length of ring opposite is just as far away and adds as much: nothing cancels.'
        : 'Each piece’s mirror is just as far away and adds exactly as much: nothing cancels.'
      : 'A potential has no direction, and this charge has one sign. Nothing cancels.')
      : part && pairs && !bracket.mirrorIn ? `Its mirror is outside the bracket: nothing undoes its sideways part, and both survive.`
      : part && pairs && !bracket.keeps ? `Its mirror is bracketed too, and their sideways parts cancel; unpaired pieces keep theirs.`
      : CANCEL_LINES[geometry] ?? `Nothing cancels: every piece is above the${NB}$x$-axis, so both parts of each survive.`,
    // At a finite N the chain is the N-piece estimate -- the figure labels it ΣΔE and the board writes
    // it with ≈ -- and it can be far off: at N = 3 beside a long rod it is nearly three times the field.
    // It becomes the field only as the pieces shrink, which is the next stage, so it says so.
    // IN MIRROR PAIRS where the charge has a mirror about P's axis: the figure adds a piece and its mirror
    // together, so the sum is an arrow along the axis at every moment (see `pairs.ts` in the diagrams). Laid tip
    // to tail in order instead, the endless line's arrows made a great arch whose cancelling was never seen.
    // In the board's own components -- ΔE_y and ΔE_x, a ring's ΔE_⊥ and ΔE_z -- and short: the transport sets
    // every stage's line in one cell, and a longer one here pushed it off a phone held on its side.
    //
    // Each one full sentence: "Mirror pairs: … The sum: the field at P once they shrink." had no verb in its
    // second half and made "they" the pairs, and the ring's "z parts add, exactly to the field" read as adding
    // TO the field. "Sum to" says what is meant.
    //
    // THE LONE MIDDLE PIECE. At an odd N -- the default five among them -- the figure adds the middle piece
    // first and alone (`pairOrder`), and the line under it said "Mirror pairs": a reader looked for the
    // partner it promised and found none. It needs none: it sits on the x-axis, level with P, and has no y
    // part to cancel. Ninety characters hold that or "as the pieces shrink", not both; the board under the
    // line and the caption still say the sum is only nearly the field, and Shrink them says it becomes it.
    //
    // "Once they shrink" made "they" the pairs, or the parts, and the sum seem to shrink: the sum is the
    // subject, and the pieces are what shrink.
    add: part ? (scalar ? (exact ? `Stack each bracketed piece’s number: the column is exactly that part’s potential at${P}.`
        : `Stack each bracketed ${unit}’s number: it becomes that part’s potential at${P} as they shrink.`)
        : `Bracketed ${unit}s’ arrows, tip to tail, add up to that part’s field at${P} as they shrink.`)
      // The rod off its bisector: its pairs, then its leftover whole -- and the lean that leftover makes.
      : geometry === 'offset' && !scalar ? `Mirror pairs go in along $x$, then the leftover pieces whole: the sum leans.`
      : pairs && !scalar ? (exact ? `Pairs half a turn apart: sideways parts cancel; $z$ parts sum to exactly the field at${P}.`
        // Ending on what the sum reaches, not on the lone middle piece: the board under the line and the
        // caption say why that piece needs no partner, and the line closed on that footnote without ever
        // saying where the sum goes.
        : `Mirror pairs’ $y$ parts cancel; the sum runs along $x$: the field at${P} once the pieces shrink.`)
      : exact ? (scalar ? `Stack every piece’s contribution. The column is exactly the potential at${P}.`
        : `Every piece’s arrow, tip to tail. The sum ends exactly at the field at${P}: every piece is equally far, at the same angle.`)
      : scalar ? `Stack every ${unit}’s number: their sum becomes the potential at${P} as the ${unit}s shrink.`
      : `Every ${unit}’s arrow, tip to tail: their sum becomes the field at${P} as the ${unit}s shrink.`,
    // WHY THE SUM BECOMES THE ANSWER. "The field stops depending on the cut" was opaque ("the cut"?), and
    // said nothing of why: what Cut it up and Add them up called only nearly true -- a piece treated as a
    // point charge -- is what shrinking makes exact. Each lesson names its own approximation, as the
    // board's Add does.
    //
    // Opened on the board's own N → ∞, not "Without end": two disclosures down, the bisector's limiting case
    // lets the rod "extend without end", and the sidebar's family is "Charge with no end". A reader took the
    // run's phrase for the rod growing endless, and "becomes exact" could not be followed from there.
    limit: part ? (exact ? 'As $N\\to\\infty$, the sum becomes the integral over the bracket, already exact.'
        : 'As $N\\to\\infty$, the sum becomes the integral over the bracket, exactly.')
      : exact ? 'As $N\\to\\infty$, the sum becomes an integral, and the answer, already exact, does not move.'
      : geometry === 'arc' || geometry === 'uneven-arc' ? 'As $N\\to\\infty$, $\\cos\\theta$ stops changing across a piece: the sum is the integral, exactly.'
      : geometry === 'sheet' ? 'As $N\\to\\infty$, treating each ring as a thin ring becomes exact: the sum is the integral.'
      : surface ? 'As $N\\to\\infty$, counting each ring at one radius becomes exact: the sum is the integral.'
      : 'As $N\\to\\infty$, treating each piece as a point charge becomes exact: the sum is the integral.',
  };
  const piece = scalar ? `Each ${unit} adds its own number to the total: k times its charge over its distance. Direction does not come into it at all, which is what makes a potential so much easier to add up than a field.`
    : unbounded ? 'Each piece is cut to cover the same angle at P. That makes every one contribute exactly as much at P: the far pieces hold more charge, but they are farther away, and the two exactly offset.'
    : geometry === 'sheet' ? 'Each ring is cut to cover the same angle at P. The far rings are farther away, but they are so much bigger that each makes a bigger field at P, not a smaller one.'
    : geometry === 'disk' || geometry === 'annulus' ? 'One thin ring at a time. Every bit of it is the same distance from P and makes the same angle with the axis, which is what lets the whole ring be added up at once in the next step.'
    : exact ? 'Each piece is drawn as a point charge at its middle, its field along the line joining them. A large piece’s own field leans a little closer to the axis, but its part along the axis is exactly this one’s, and that is the only part that will count.'
    : geometry === 'arc' ? 'Each piece makes a field at P along the radius, pointing from the piece through P and on, for positive charge. Every piece is the same distance away and holds the same charge, so every arrow is the same size; only its direction changes round the arc.'
    : geometry === 'uneven-arc' ? 'Each piece makes a field at P along the radius, pointing from the piece through P and on, for positive charge. Every piece is the same distance away, but not every one holds the same charge: the density is largest in size on the axis and nothing at the two ends, so the arrows are longest in the middle and shrink toward the ends.'
    : 'Each piece makes a field at P along the line joining them. How big depends on how much charge it holds and how far away it is.';
  // A ring is not a point charge, and saying so is the honest start for a disk or a sheet: what
  // makes a ring easy is not that it is small, but that all of it is the same distance away.
  // The sheet's rings are not thin, and thin in ANGLE does not put their bits nearly one distance
  // from P either: at five pieces the fourth ring's bits run from 0.77 to 1.47 times its middle
  // distance, and the fifth never ends. What a thin angle buys is that the ring's FIELD at P is
  // nearly a thin ring's -- the same bridge the unbounded lines' pieces take.
  const cut = geometry === 'sheet'
    ? 'Start by cutting the sheet into rings that each take the same small angle at P. Each ring makes nearly the field at P of a thin ring at its middle angle (even the outermost, which never ends), and all of a thin ring is one distance away, which is what lets it be added up at once.'
    : geometry === 'annulus'
    ? 'Start by cutting the annulus into thin rings, from the hole’s edge out to the rim, narrow compared with their distance from P. There is no charge in the hole, so no ring there. A ring is not a point charge, but every bit of a thin one is the same distance from P, and that is all the next steps need.'
    : surface
    ? 'Start by cutting the disk into thin rings, narrow compared with their distance from P. A ring is not a point charge, but every bit of a thin one is the same distance from P, and that is all the next steps need.'
    // Not "each one is a point charge": at every N the outermost piece is infinitely long. What a
    // thin enough angle buys is that the piece's FIELD at P is a point charge's.
    : unbounded
      ? `Start by cutting the line into pieces that each take up the same small angle at P. Made thin enough in angle, each piece makes the field at P that a point charge would, and for a point charge the field is something we already know.`
      : exact
        ? `Start by cutting the ${geometry === 'arc' ? 'arc' : 'ring'} into pieces. They need not even be small: every bit of every piece is ${geometry === 'arc' ? 'R from P' : scalar ? 'the same distance from P' : 'the same distance from P at the same angle to the axis'}, so each piece’s ${scalar ? 'potential' : 'part along the axis'} is exactly a point charge’s, and for a point charge the ${scalar ? 'potential' : 'field'} is something we already know.`
        // Short beside what: the arc's every bit is R from P, so what a long piece gets wrong is direction.
        : geometry === 'arc'
          ? 'Start by cutting the arc into pieces short compared with their distance from P, which is R. Every bit of a piece is R from P, but the bits’ fields point different ways, so only a short piece is nearly a point charge, and for a point charge the field is something we already know.'
        : geometry === 'uneven-arc'
          ? 'Start by cutting the semicircle into pieces short compared with R, their distance from P. Every bit of a piece is R from P, but along a piece the bits’ fields turn and the density changes, so only a short piece is nearly a point charge, and for a point charge the field is something we already know.'
          : `Start by cutting the charge into pieces short compared with their distance from P: small enough that each one is nearly a point charge, and for a point charge the ${scalar ? 'potential' : 'field'} is something we already know.`;
  // The chain is the arrows themselves, not their surviving parts: it is the sideways parts
  // undoing each other along the way that makes it bend back, where the geometry is symmetric.
  // Named as the figure names it once every piece is in, so the caption says what the arrow's label means: the sum
  // is the field at P only nearly, with N pieces treated as point charges, and exactly in the limit.
  const stops = `where it stops, the sum E ≈ Σ ΔE, is nearly the field at P, and exactly it once they shrink.`;
  // WHY THE LIMIT IS THE ANSWER, IN THE CAPTION TOO. The line was changed to name each lesson's own
  // approximation, the one that shrinking makes exact; the caption read to a screen reader still ended
  // "the answer stops depending on how finely we chose to cut", the reason the line had dropped. And it
  // said "smaller" where the board's rule and the line say "thinner".
  // Thinner in angle where the cut is by angle at P: the outermost piece of an endless line, and the
  // sheet's outermost ring, never ends at any N, so it grows no thinner in length.
  const thinner = unbounded || geometry === 'sheet' ? 'grow ever thinner in angle' : 'grow ever thinner';
  const exactNow = geometry === 'arc' || geometry === 'uneven-arc' ? 'taking cos θ at each piece’s middle, which was only nearly right, becomes exact, since cos θ stops changing across a piece'
    : geometry === 'sheet' ? 'treating each ring as a thin ring, which was only nearly right, becomes exact'
    : surface ? 'counting each ring’s charge at one radius, which was only nearly right, becomes exact'
    : 'treating each piece as a point charge, which was only nearly right, becomes exact';
  // The pairs' order, said: from the middle out on a rod, a line or an arc; round the ring, where every piece is
  // as near as every other.
  const adds = part
    ? `Now add the arrows of the bracketed ${unit}s, tip to tail.${pairs ? bracket.keeps ? ' Each one’s mirror is bracketed too, so the sideways parts undo each other along the way and the chain bends back to the axis.' : ' A piece whose mirror lies outside the bracket keeps its sideways part, so the chain leans.' : ''} Where it stops is the sum of the bracketed ${unit}s: that part’s field at P once they shrink.`
    : geometry === 'offset' && !scalar
    ? `Now add the mirrored stretch in pairs from the middle out: their parts along the rod cancel, so the sum runs along the x-axis. Then add the leftover pieces whole, nearest P’s level first. Nothing cancels theirs, so the sum leans, and ${stops}`
    : pairs && exact
    ? 'Now add the pieces in pairs, each with the same length of ring straight across from it. In each pair the sideways parts cancel and the parts along the axis add, so the sum, E = Σ ΔE, grows straight along the axis to exactly the field at P: every piece is the same distance away at the same angle, so cutting finer changes nothing.'
    : pairs
    ? `Now add the pieces in mirror pairs from the middle out; a lone middle piece has no sideways part. In each pair ${PAIR_PARTS[geometry].parts} add, so the sum runs ${PAIR_PARTS[geometry].runs}, and ${stops}`
    : exact
    ? 'Now add every piece’s arrow, tip to tail. The sideways parts undo each other along the way, so the chain bends back to the axis, and it ends exactly at the field at P, E = Σ ΔE: every piece is the same distance away at the same angle, so cutting finer changes nothing.'
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
    {key: 'cancel', name: 'What cancels', seconds: pairs ? 6.5 : 5.5, mode: 'project', components: !scalar, pair: mirrored, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: scalar ? '' : 'projection', line: plain(lines.cancel), prose: lines.cancel,
      caption: scalar ? (part && pairs && !bracket.mirrorIn ? `${NO_CANCEL_V(unit)} This ${unit}’s mirror lies outside the bracket, so it is not part of the sum.` : pairs ? geometry === 'ring' ? PARTNER_ADDS_V_RING : PARTNER_ADDS_V : NO_CANCEL_V(unit))
        : part && pairs && !bracket.mirrorIn ? 'Only the bracketed part of the charge is added, and this piece’s mirror lies outside the bracket. Nothing there undoes the piece’s sideways part, so both of its parts survive.'
        : part && pairs && !bracket.keeps ? `${CANCELS[geometry]} But only the bracketed part is added, and a bracketed piece whose mirror lies outside it has nothing to undo its sideways part, which survives.`
        : CANCELS[geometry] ?? NO_CANCEL},
    // The chain grows at an even pace -- easing would bunch the last pieces together -- and then
    // holds, finished, so the arrow it arrives at is seen before the pieces start to shrink.
    {key: 'add', name: 'Add them up', seconds: 8, mode: 'sum', components: false, pair: false, sum: [0, 1], continuum: [0, 0],
      moves: .8, pace: 'linear', term: 'bounds', line: plain(lines.add), prose: lines.add,
      // An arrow chain for a field and a column for a potential: the same sum, one dimension
      // down. The field's caption talked about arrows bending, which a scalar has none of.
      caption: scalar
        ? part
          ? `Now stack the number of each bracketed ${unit} on top of the last. The column can only grow one way (there is no direction for it to bend back in), and its height is ${exact ? 'already exactly the bracketed part’s potential at P: every piece is the same distance away, so cutting finer changes nothing' : `the sum of the bracketed ${unit}s: that part’s potential at P once they shrink`}.`
          : exact
          ? 'Now stack every piece’s ΔV on top of the last. The column can only grow one way (there is no direction for it to bend back in), and its height, marked V = Σ ΔV, is already exactly the potential at P: every piece is the same distance away, so cutting finer changes nothing.'
          : `Now stack every ${unit}’s ΔV on top of the last. The column can only grow one way (there is no direction for it to bend back in), and its height, marked V ≈ Σ ΔV, is the sum of the N ${unit}s’ ΔV: nearly the potential at P, and exactly it once they shrink.`
        : adds},
    // Eased: one picture turning into another. It finishes early and holds on the integral.
    {key: 'limit', name: 'Shrink them', seconds: 6.5, mode: 'integrate', components: false, pair: false, sum: [1, 1], continuum: [0, 1],
      moves: .7, pace: 'ease', term: 'bounds', line: plain(lines.limit), prose: lines.limit,
      caption: (exact
        ? scalar
          ? 'Finally, as N → ∞ the pieces grow ever thinner. Each segment of the column gets too thin to see and the sum becomes the integral, but the height does not move: every piece was already the same distance from P, so the sum was exact all along.'
          : 'Finally, as N → ∞ the pieces grow ever thinner. Each piece’s arrow shrinks to nothing while there are ever more of them, and the sum becomes the integral. The answer does not move: every piece was already the same distance from P at the same angle, so the sum was exact all along.'
        : scalar
        ? `Finally, as N → ∞ the ${unit}s ${thinner}. Each segment of the column gets too thin to see, and the sum becomes the integral: ${exactNow}.`
        : `Finally, as N → ∞ the ${unit}s ${thinner}. Each ${unit}’s arrow shrinks to nothing while there are ever more of them, and the sum becomes the integral: ${exactNow}.`) + (part ? ' The integral runs over the bracket only, and its answer is the bracketed part’s.' : '')},
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
