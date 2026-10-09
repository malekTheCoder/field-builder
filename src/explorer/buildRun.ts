import type {Problem} from '../problems/types';
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
  /** The whole explanation, in the reader's language: read at the reader's own pace, beside the
   * line of algebra this stage adds, and announced to a screen reader as the stage begins. */
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
 * different in each geometry. Written short: it is read while something is moving. */
const CANCELS: Record<string, string> = {
  bisector: 'Now the piece mirrored below it. That one pushes P up by exactly as much as the first pushes it down, so those two cancel — and what is left of both points the same way, straight out from the rod.',
  ring: 'Now the piece straight across the ring. It pushes P sideways by exactly as much, the other way, so the two sideways pushes cancel — and what is left of both points along the axis.',
  arc: 'Now the piece at the mirror angle. One pushes P up and the other pushes it down by the same amount, so those cancel — and what is left of both points along the axis.',
  infinite: 'Now the piece mirrored on the far side. It pushes P along the line by exactly as much, the other way, so those cancel — and what is left of both points straight out from the line.',
  disk: 'A disk is rings, and every ring has already cancelled its own sideways push against itself. There is nothing sideways left to draw: each ring pushes P straight along the axis.',
  // The sheet cancels within each ring exactly as the disk does. What is different, and is the
  // thing a reader carrying the line lessons' story will get wrong, is the tail: cut at equal
  // angles from P, the rings push HARDER the further out they are, not softer.
  sheet: 'A sheet is rings too, and each ring has already cancelled its own sideways push. Nothing is left over to cancel — but notice the far rings. Each is weaker for its size, yet so much bigger that it pushes harder than the last.',
  // No partner at all: the line stops at the foot of the perpendicular, so the sideways push
  // survives. Saying "every contribution points much the same way" was wrong here -- they fan
  // through a right angle -- and it hid the one consequence worth seeing.
  semi: 'Nothing cancels here. The line stops right below P, so there is no charge on the other side to push back — every sideways push survives along with its outward one, which is why this field leans instead of pointing straight out.',
};
/** The cancellation in one sentence each, for reading while the arrows move. */
const CANCEL_LINES: Record<string, string> = {
  bisector: 'Its mirror piece pushes just as hard. The sideways parts cancel; only the outward parts survive.',
  ring: 'The piece across the ring cancels the sideways push. Only the part along the axis survives.',
  arc: 'The mirror piece cancels the push across the axis. Only the part along the axis survives.',
  infinite: 'The mirror piece cancels the push along the line. Only the part straight out survives.',
  disk: 'Each ring has already cancelled its own sideways push. Only the part along the axis is left.',
  sheet: 'Each ring has already cancelled its own sideways push. Only the part along the axis is left.',
  semi: 'Nothing cancels: no charge lies on the other side, so both parts survive and the field leans.',
  axial: 'Every piece is on the axis, so every push already points along it. Nothing to cancel.',
};
/* A scalar lesson must never borrow its field twin's cancellation story, even though it shares
 * the twin's geometry. V is a number; "the sideways parts cancel" is meaningless about it, and
 * teaching it here would plant the exact confusion these lessons exist to clear up. */
const NO_CANCEL_V = 'Nothing cancels here, and nothing can: V is a number, not an arrow, so there is no direction in which one piece could undo another. Every piece simply adds what it is worth, and a positive charge always adds something positive.';
// Shared by the axial rod, the end-on rod and the ramp. Only the axial rod's contributions
// really point the same way: level with the end of a rod they fan through arctan(L/r), and this
// lesson's own L -> infinity limit lands them at 45 degrees. What all three share is the missing
// partner, so that is what this says -- the same correction the `semi` note above already made.
const NO_CANCEL = 'Nothing cancels here. Every piece lies on the same side of P, so no piece has a partner to undo it and every contribution survives in full. Cancellation is a gift of symmetry, and this geometry does not have it.';
/** Does the figure draw a mirror partner for this geometry? Mirrors `supportsPair` and
 * `scalarPartner` in the diagram: asking for a partner it will not draw would leave the stage
 * showing nothing. A potential lesson gets one wherever it has a partner at the same distance,
 * because there the contrast with the field is the lesson: the same piece cancels one and adds
 * to the other. */
const PAIRS = new Set(['bisector', 'infinite', 'ring', 'arc']);
const SCALAR_PAIRS = new Set(['bisector', 'ring', 'arc']);
const PARTNER_ADDS_V = 'Now its mirror partner. For the field these two would cancel each other sideways, but nothing cancels in a potential. The partner is the same distance from P, so it adds exactly the same amount, and both go on the pile.';
export function buildStages(p: Problem): BuildStage[] {
  const geometry = p.geometry, scalar = p.quantity === 'V';
  const pairs = scalar ? SCALAR_PAIRS.has(geometry) : PAIRS.has(geometry);
  // How hard a piece pushes is where the geometries genuinely differ, so it is not said once for
  // all of them. "A piece further away pushes more weakly" is true of a unit of charge and false
  // of the pieces these lessons actually draw on the unbounded geometries: cut at equal angles
  // from P, every piece of an infinite line pushes EXACTLY as hard, and a sheet's rings push
  // harder the further out they are.
  // THE LINES READ WHILE IT MOVES. One sentence each, short enough to finish before the stage
  // does. The long captions are still there, beside the algebra, for reading at rest.
  const unbounded = geometry === 'infinite' || geometry === 'semi';
  const surface = geometry === 'disk' || geometry === 'sheet';
  const lines = {
    pieces: surface ? `Cut the ${geometry === 'disk' ? 'disk' : 'sheet'} into thin rings. Every bit of one ring is the same distance from P.`
      : unbounded ? 'Cut the line into pieces that each take up the same angle at P.'
      : 'Cut the charge into small pieces, each small enough to treat as a point charge.',
    one: scalar ? 'One piece adds a number to the potential at P: more the closer it is.'
      : unbounded ? 'Every equal-angle piece pushes on P exactly as hard: the far ones hold more charge.'
      : geometry === 'sheet' ? 'The far rings are farther away, but so much bigger that they push harder.'
      : 'One piece pushes on P along the line joining them, more weakly the farther it is.',
    cancel: scalar ? (pairs ? 'Its mirror piece is just as far away, so it adds exactly as much. A number cannot cancel.' : 'A potential is a number, not an arrow. There is nothing to cancel.')
      : CANCEL_LINES[geometry] ?? 'Nothing cancels: every piece is on the same side of P, so both parts of every push survive.',
    add: scalar ? 'Stack every piece’s contribution. The column’s height is the potential at P.'
      : 'Add every surviving push, tip to tail. Where the chain ends is the field at P.',
    limit: `Shrink the pieces without end. The sum becomes an integral, and the ${scalar ? 'potential' : 'field'} stops depending on the cut.`,
  };
  const piece = scalar ? 'Each piece adds its own number to the total, and that number depends only on how far away the piece is. Direction does not come into it at all, which is what makes a potential so much easier to add up than a field.'
    : geometry === 'infinite' || geometry === 'semi' ? 'Each piece is cut to cover the same angle at P. That makes every one push exactly as hard: the far pieces hold more charge, but they are further away, and the two cancel.'
    : geometry === 'sheet' ? 'Each ring is cut to cover the same angle at P. The far rings are further away, but they are so much bigger that they push harder, not softer.'
    : 'Each piece pushes on P in its own direction. How hard depends on how much charge it holds and how far away it is.';
  return [
    // Long enough for the cuts to travel the length of the charge and for the line to be read.
    {key: 'pieces', name: 'Cut it up', seconds: 5, mode: 'divide', components: false, pair: false, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: 'element', line: lines.pieces,
      caption: `Start by cutting the charge into pieces small enough that each one is just a point charge — and for a point charge the ${scalar ? 'potential' : 'field'} is something we already know.`},
    // One arrow and the distance it depends on. Not yet split into parts: that is the next idea,
    // and showing the parts here put two ideas on screen at once.
    {key: 'one', name: 'One piece', seconds: 5.5, mode: 'project', components: false, pair: false, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: 'distance', line: lines.one,
      caption: piece},
    {key: 'cancel', name: 'What cancels', seconds: pairs ? 6.5 : 5.5, mode: 'project', components: !scalar, pair: pairs, sum: [1, 1], continuum: [0, 0],
      moves: 1, pace: 'linear', term: scalar ? '' : 'projection', line: lines.cancel,
      caption: scalar ? (pairs ? PARTNER_ADDS_V : NO_CANCEL_V) : CANCELS[geometry] ?? NO_CANCEL},
    // The chain grows at an even pace -- easing would bunch the last pieces together -- and then
    // holds, finished, so the arrow it arrives at is seen before the pieces start to shrink.
    {key: 'add', name: 'Add them up', seconds: 8, mode: 'sum', components: false, pair: false, sum: [0, 1], continuum: [0, 0],
      moves: .8, pace: 'linear', term: 'bounds', line: lines.add,
      // An arrow chain for a field and a column for a potential: the same sum, one dimension
      // down. The field's caption talked about arrows bending, which a scalar has none of.
      caption: scalar
        ? 'Now stack every piece’s number on top of the last. The column can only grow one way — there is no direction for it to bend back in — and its height is the potential at P.'
        : 'Now add what survives, piece by piece, each arrow starting where the last one ended. The chain bends the way the geometry does, and where it stops is the field at P.'},
    // Eased: one picture turning into another. It finishes early and holds on the integral.
    {key: 'limit', name: 'Shrink them', seconds: 6.5, mode: 'integrate', components: false, pair: false, sum: [1, 1], continuum: [0, 1],
      moves: .7, pace: 'ease', term: 'bounds', line: lines.limit,
      caption: scalar
        ? 'Finally, make the pieces smaller without end. Each segment of the column gets too thin to see, the sum becomes the integral, and the height stops depending on how finely we chose to cut.'
        : 'Finally, make the pieces smaller without end. The chain of arrows becomes a smooth curve, the sum becomes the integral, and the answer stops depending on how finely we chose to cut.'},
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
