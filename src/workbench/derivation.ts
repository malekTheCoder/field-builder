import katex from 'katex';
import type {Problem, ProblemId} from '../problems/types';
/** THE INTEGRAL, WRITTEN OUT THE WAY THE FIGURE BUILDS IT.
 *
 * "Watch it build" makes one argument on the figure in five stages: cut the charge up, look at
 * one piece, see what cancels, add what survives, shrink the pieces away. This is the same
 * argument on the page -- one line of algebra per stage, each line the previous one with exactly
 * one new idea in it -- so the equation is assembled in step with the picture instead of beside it.
 *
 * Every factor is tagged with the feature of the figure it comes from (`\htmlClass{fx fx-…}`), so
 * the page can colour it like that feature and point at it when the reader points at the factor.
 *
 * The TeX is written by hand rather than generated: generated TeX is correct and unreadable. What
 * keeps the hand-written lines honest is `check` -- the same factors as expressions, which
 * `tests/derivation.test.ts` multiplies together and compares with each lesson's own integrand. */
export type Term = 'element' | 'distance' | 'projection' | 'bounds';
export type StepKey = 'pieces' | 'one' | 'cancel' | 'add' | 'limit';
export type BoardLine = {
  key: StepKey;
  /** The line itself. */
  tex: string;
  /** What the new symbol in it stands for, set smaller beside it. */
  where?: string;
  /** A remark in words rather than symbols -- why nothing cancels, say, or what a new symbol
   * means. Set as prose, not TeX: KaTeX never breaks a \text{} run, so a sentence there ran off the
   * side of a narrow panel. A symbol inside it is written $…$ and set as math, in the same face as
   * the line above, so a λ in the sentence is the λ in the equation. */
  say?: string;
  /** What the cancellation's own symbols are, said directly under it. What cancels opens on
   * ΔE_y + (−ΔE_y) = 0, and ΔE_y used to be named only in the last clause of the paragraph four
   * lines further down: the step's headline was read before any of its symbols meant anything. */
  cancelsSay?: string;
  /** The last line's second half: the same integral with the algebra done, its "=" set under
   * the first line's so the two read as one chain. */
  finish?: string;
  /** Shrink them's other replacements, each one formula, set as a row under the integral and coloured
   * like the factor each one rewrites: the width becoming d, the distance and the direction put in the
   * integral's variable. Σ → ∫ and ΔQ → dQ were the only ones written as maths, and the two a student must
   * make alone on the next problem -- r_i² → y² + r², cos α_i → r/√(y² + r²) -- were inside a paragraph,
   * matched to their factors by colour alone. Separate items, so a narrow panel wraps between them. */
  swaps?: string[];
  /** What the second half did that a reader might not follow, set under it: a square times its
   * own square root is the three-halves power, which the finished line arrives at in silence. */
  merged?: string;
  /** The cancellation itself, in symbols: the part a piece and its mirror partner undo between
   * them. Set first in its step, which is named for it: the line after it is only what survives. */
  cancels?: string;
  /** Where nothing cancels, that said in words, in the cancellation's place. "What cancels" is the
   * step's own question, and a step that answered it only in a note shown while the run was paused
   * left a reader at rest with the angle's paragraph and no answer. */
  nothing?: string;
  /** What the surviving component's factor is in the lesson's variable, glossed under it: the sine the rods
   * level with an end build E_y with was first written in y under the answer, after Shrink them. */
  alsoWhere?: string;
  /** A second component that survives alongside the one being built, said once where it arises.
   * The TeX of the component only: the board says in words that it survives too. */
  also?: string;
};
type Parts = {
  /** The charge of one piece in the limit, without "dQ =". */
  dq: string;
  /** The same charge before the limit, as the figure gives it to a piece -- and, where the cut is
   * not in the lesson's own coordinate, what relates the two. */
  piece: string; pieceIs?: string;
  /** The density as the first line glosses it, where the lesson's own is set with a slash: the
   * sibling lessons stack it, and one definition should not have two typesettings. */
  density?: string;
  /** Distance from a piece to P, and its square written the way it is easiest to read. */
  r: string; r2: string;
  /** Where the piece is and where P is, in words: the triangle the distance is read off. */
  at: string;
  /** A field's component: the minus sign, the factor's symbol, and what that symbol stands for.
   * `dirIs` says in words why the component is that side of the triangle -- every lesson that has an
   * angle says it, beside the formula or in its place: a sentence in \text{} is set in the wrong
   * face and never wraps. */
  sign?: '-'; dir?: string; dirOf?: string; dirIs?: string;
  /** How much charge one piece holds, in words: what the density is and how big a piece is. */
  holds: string;
  /** Mirror partners: what the partner's part is called, and the part's words for the remark that
   * says when a dragged bracket leaves the partners outside it. */
  mirror?: {across: string; lost: string};
  /** The other component, where nothing cancels it, built from the line's own factors; and its factor
   * in the lesson's variable, glossed beside the built component's. */
  also?: (dQ: string, ri2: string) => string; alsoOf?: string;
  /** Where nothing cancels and there is no partner: why, in words. */
  nothing?: string;
  /** Show the integral once more with the algebra done: only where that changes what it looks like. */
  simplify: boolean;
  /** For the shrink line's rule: the charge per piece, where it changes from piece to piece, written
   * in the variable; and anything the list of replacements leaves to be said. */
  charge?: string; tail?: string;
  /** Where every piece is the same distance away at the same angle, the sum is exact at any cut and
   * the integrand is a constant: what it is, the line with the whole charge in it, and what the
   * integral of dθ comes to over the whole of it. */
  constant?: {term: string; whole: string; span: string; adds: string; total: string};
  /** The cancellation's symbols in words, where a piece and its mirror undo each other. */
  pairSay?: string;
  /** The mirror piece's sentence, said after the angle's only while the bracket holds every mirror. */
  mirrorSay?: string;
  /** Where the bracket is lopsided and the mirror's sentence goes, what then says the angle's sign. */
  signed?: string;
  /** And what says why the part that then survives is that side of the triangle, with that sign -- for
   * the pieces the bracket holds: above the middle, below it, or both. */
  survivor?: Survivor;
  /** The integral done, as a bracket to be taken between two ends: what stands before it, what is in
   * it, and the two as one expression for the tests, which differentiate it back to the integrand. Where
   * the bracket is dragged, the panel writes it between the bracket's own ends -- the part's answer, not
   * a promise of one. The exact lessons have none: their last line is already the value. */
  anti?: {pre: string; inner: string; check: string};
  /** The same for ΔE_y, the part along the charge, where it survives: always on the rods level with one
   * end and the semi-infinite line, and under a lopsided bracket on the lessons with mirror pieces. Its
   * derivative is the ΔE_y the board writes, put in the variable. `wide` sets the bracket over two rows,
   * as the ramp's answer is: its two terms are too long for one row of the panel. */
  antiAlso?: {pre: string; inner: string; check: string; wide?: [string, string]};
  /** E_y's own integral over the whole charge, set as the board sets E_x's finished line: the constants
   * inside, the variable's d last, the sign before the integral. The answer printed the lesson's own
   * form, constant outside and dy in the numerator, under "added up the same way" -- two integrals the
   * sentence called parallel that did not look it. `check` is its integrand, for the tests. */
  alongIntegral?: {tex: string; check: string};
  /** One piece, where the cut is at equal angles: why every piece then makes the same field at P. */
  equal?: string;
  /** What the finished line did in silence, where it is not the three-halves power. */
  merged?: string;
  /** The factors as expressions, for checking the algebra above. `dq` is the charge per unit of
   * the integration variable; `dir` is the signed factor that picks out the component. */
  check: {dq: string; r: string; dir: string};
};
/** Holds a word and the symbol after it on one line, so a remark never ends on a lone "P." */
const NB = ' ';
/** Where a remark moves on to its next idea: the board sets what follows as a paragraph of its own. */
export const BREAK = '\n\n';
/** A point charge's field, said once where the board first uses it: what the formula is, what k is
 * -- which used to be defined only under the answer, after every line had used it -- and which way
 * it points. r̂ᵢ had a sentence of its own after the triangle's; it is the formula's direction, so it
 * is said with the formula, and the remark is a sentence shorter. */
//
// And it says what the i is. r_i and r̂_i arrived here with an index while ΔQ had none, and what i
// counts was first said two steps later, in Add them up: the one subscript on the board defined after
// it was used.
//
// TWO FORMULAS ARE NEVER SEPARATED BY PUNCTUATION ALONE, AND NO SENTENCE OPENS ON A SYMBOL: the first
// rules of writing mathematics. "with k = 1/(4πε₀): r_i is the piece's distance" read as a ratio, and
// "…toward P. P is the arc's centre" ran one symbol into the next across a full stop. So a word stands
// in every such gap -- "Here r_i is", "so r_i is", "a distance r sec θ from P" -- and a sentence that
// defines a letter leads with the noun: "The density λ is", "A piece's angle round the ring is θ".
//
// And ΔE, the arrow written without its direction, is said to carry the charge's sign. What cancels
// calls it the arrow's size and then writes its part along x as ΔE cos α beside ΔE_x = k ΔQ cos α/r_i²,
// which is negative for a negative charge: read literally, with the slider below zero, that gave the
// wrong sign. The size is |ΔE|; ΔE itself is k ΔQ/r_i², and the sign says which way the arrow points.
const COULOMB = String.raw`A point charge’s field, from Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$. Here $r_i$ is the piece’s distance from${NB}$P$ (the $i$ numbers the pieces), and $\hat{\mathbf r}_i$ is the unit vector from the piece toward${NB}$P$.`;
//
// AND ITS SIZE IS SAID HERE, ONCE. What cancels used to open "The arrow ΔE, of size |ΔE|, lies along …":
// bold ΔE, |ΔE| and then ΔE cos α, three notations in one sentence, and a critic needed four reads. The
// plain letter is defined here, where the arrow first loses its direction, and so is its size.
const SIGNED = String.raw`Written without its direction, $\Delta E=k\,\Delta Q/r_i^2$ is negative when the charge is, and the arrow then points back toward the piece; its size is $|\Delta E|$.`;
// What the density means and how big a piece is: the two facts that turn "ΔQ =" into the line's
// right-hand side, which every lesson's own hint says and the board used to leave unsaid.
const PER_LENGTH = (d: string) => String.raw`The density $\lambda$ is the charge per unit length, so a piece $\Delta ${d}$ long holds $\lambda\,\Delta ${d}$.`;
// θ and φ were on the ring's and the arc's first line, ΔQ = λRΔθ with λ = Q/(Rφ), and θ was said two
// steps later, in What cancels -- on the potentials, which have no angle paragraph, never; φ was named
// only by the slider. So the first line says what each is.
const RADIANS = String.raw`The density $\lambda$ is the charge per unit length, and a piece $\Delta\theta$ wide is $R\,\Delta\theta$ long (angles in radians).`;
const ROUND_RING = String.raw`A piece’s angle round the ring is $\theta$. ${RADIANS}`;
const ROUND_ARC = String.raw`A piece’s angle round the arc is $\theta$, measured from the${NB}$x$-axis, its line of symmetry; the whole arc’s angle is $\varphi$. ${RADIANS}`;
// Where r_i comes from. r_i = √(y² + r²) arrived with no triangle: y along the rod, r out to P,
// Pythagoras -- the one move a student has to make alone on the next problem, made silently.
//
// PIECE i IS AT y_i FROM THE START. The board wrote r_i = √(y² + r²) here, an indexed left side and an
// unindexed right side, then ΔQ_i and α_i in Add and "r_i² = y_i² + r², in terms of y_i" in Shrink them: the
// i came and went, and a student could not tell whether One piece's y was already the integral's. On the rods
// the piece's position is y_i from its first appearance, so Shrink them's "y_i becomes the integral's y" is
// the one place the i goes away. (The lessons cut in an angle keep their own letters: their ΔQ is written
// in that angle, and its sec² is seen to cancel the distance's only while the two are written alike.)
//
// And r against r_i. Defined with r, r_i read to a weak student as "r for piece i", the same thing as r.
// One clause says which is fixed and which changes, and when they are equal.
const HYPOTENUSE = (along: string, out: string, from: string, indexed = true) => {
  const at = indexed ? `${along}_i` : along;
  return String.raw`${indexed ? `Piece${NB}$i$` : 'The piece'} is $${at}$ along the ${from} and $P$ is $${out}$ out from $${along}=0$, so $r_i$ is the hypotenuse.${BREAK}The letter $${out}$ with no $i$ is $P$’s own distance from the ${from}, the same for every piece, while $r_i$ changes from piece to piece and is $${out}$ only where $${at}=0$.`;
};
const ROD_Y = {dq: String.raw`\lambda\,dy`, piece: String.raw`\lambda\,\Delta y`, r: String.raw`\sqrt{y^2+r^2}`, r2: String.raw`y^2+r^2`, holds: PER_LENGTH('y'),
  at: HYPOTENUSE('y', 'r', 'rod')};
// "At x = L + a" never said what a is: P's distance past the rod's end.
const ROD_X = {dq: String.raw`\lambda\,dx`, piece: String.raw`\lambda\,\Delta x`, r: String.raw`L+a-x`, r2: String.raw`(L+a-x)^2`, holds: PER_LENGTH('x'),
  density: String.raw`\lambda=\frac{Q}{L}`, at: String.raw`The point $P$ is on the rod’s own line, a distance $a$ past its end at $x=L$, so at $x=L+a$; piece${NB}$i$, at $x_i$, is $L+a-x_i$ from${NB}it.`};
const RING = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: String.raw`\sqrt{R^2+z^2}`, r2: String.raw`R^2+z^2`, holds: ROUND_RING,
  at: String.raw`Every piece is $R$ out from the axis and $P$ is $z$ up it, so $r_i$ is the hypotenuse.`};
const DISK = {dq: String.raw`\sigma\,2\pi s\,ds`, piece: String.raw`\sigma\,2\pi s\,\Delta s`, r: String.raw`\sqrt{s^2+z^2}`, r2: String.raw`s^2+z^2`,
  // s and Δs were used here and first said to be a radius two steps later, in One piece: every other
  // lesson defines its letters in the first line that uses them.
  holds: String.raw`The density $\sigma$ is the charge per unit area. A thin ring of radius $s$ and width $\Delta s$ has area circumference × width, $2\pi s\,\Delta s$.`,
  at: String.raw`The ring is $s$ out from the axis and $P$ is $z$ up it, so $r_i$ is the hypotenuse.`,
  charge: String.raw`\Delta Q_i=\sigma\,2\pi s\,\Delta s`};
const ARC = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: 'R', r2: 'R^2', holds: ROUND_ARC,
  at: String.raw`The arc’s centre is $P$, so every piece is $R$ away.`};
// The angle the figure marks at P, between the perpendicular from P to the charge and the line to
// the piece. The lessons' own text calls it α, so the board does; only the infinite line, where it
// is the integration variable θ itself, and the arc, where θ is the piece's angle, say θ.
//
// α used to arrive in What cancels with no word for it, and nothing said why the part along x is
// "times cos α": the figure draws α between r_i and the axis, on the far side of P from the arrow.
// So the sentence says what α is and that the arrow lies along r_i, which is what puts the same
// angle between the arrow and the axis -- and which side of the triangle the component is.
//
// And the arrow is bold where its size is not: "ΔE lies along r_i … its part along x is ΔE cos α"
// switched from one to the other mid-sentence, and to a first-year reader they are one symbol. So the
// sentence that first uses the size says that the size is what the plain letter is.
//
// Its size is |ΔE|: ΔE itself carries the charge's sign (see `COULOMB`), and "of size ΔE" then gave a
// negative size to a negative charge.
const ARROW = String.raw`The arrow $\Delta\mathbf E$`;
// "Between r_i and the x-axis" and "lies along r_i" used r_i as a line, a sentence after One piece
// defined it as the piece's distance from P -- the reading `BITS` already corrected for the disk. So the
// line is named, and r_i is said to be its length.
//
// WHY THE ARROW'S ANGLE IS α. The figure marks α at P on the piece's side, between the line to the piece and
// the axis pointing back at the rod, while a positive charge's arrow leaves P on the far side: "so it makes
// the same angle with the axis … the side next to α" skipped the step a reader was missing, and the side
// next to the drawn α is the r leg, not ΔE_x. The arrow is that same line carried on through P, so the angle
// it makes there is the drawn α's opposite angle, and opposite angles are equal. Said of where a positive
// charge's arrow points: a negative charge's points back along the line, inside the drawn α itself.
//
// IN SHORT SENTENCES, AND "VERTICALLY OPPOSITE" BY NAME. It was one sentence that said the arrow's angle "is
// the one opposite α, so equal to it", and two clauses later "ΔE sin α is the side opposite": one word, an
// angle across a crossing and then a side of a triangle, and a first-year reader took both for the side.
// The fact the step rests on -- vertically opposite angles are equal -- was never named. Now it is.
//
// Indexed, as piece i's position is (see `HYPOTENUSE`): α_i is piece i's angle, the α the figure marks.
const ANGLE_ROD = String.raw`The angle $\alpha_i$ is the one at${NB}$P$ between the line to piece${NB}$i$ (length $r_i$) and the${NB}$x$-axis. ${ARROW} lies along that line, carried on through${NB}$P$.${BREAK}There the line crosses the axis, and vertically opposite angles are equal, so beyond${NB}$P$, where a positive charge’s arrow points, the arrow makes the angle $\alpha_i$ with the axis too. Its part along $x$ is $\Delta E\cos\alpha_i$, the side next to${NB}$\alpha_i$.`;
// The partner's part, named as the figure names it, said under the cancellation that uses it: the
// cancellation opens its step, and ΔE_y in it used to be named only at the paragraph's end.
//
// The mirror's sentence is held apart from the angle's, and said only while the bracket holds every
// mirror: off-centre, the step opened "the mirrors lie outside the bracket" and its paragraph ended
// "its mirror piece makes the same ΔE_x", two sentences of one card that contradicted each other.
const MIRROR = (angle: string) => String.raw` Its mirror piece, at $-${angle}$, makes the same $\Delta E_x$.`;
// A sentence with a verb, as the ring's and the disk's are: "A piece's part along the rod, ΔE_y, and
// its mirror piece's, −ΔE_y." was a legend with none.
const PAIR = (along: string) => String.raw`A piece’s part ${along} is $\Delta E_y$; its mirror piece makes $-\Delta E_y$.`;
const COS_ROD = {dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{r}{\sqrt{y^2+r^2}}`, dirIs: ANGLE_ROD};
// THE SINE, WRITTEN WHERE IT IS USED. Level with an end, What cancels writes ΔE_y = −k ΔQ sin α_i / r_i²
// "survives too" and glossed only the cosine: sin α in y arrived after Shrink them, under the answer, and a
// student building E_y from the board was stuck. It is glossed beside the cosine.
const SIN_ROD = String.raw`\sin\alpha=\frac{y}{\sqrt{y^2+r^2}}`;
// Level with one end, nothing cancels the part along the rod: it survives, pointing back past the
// end for a positive charge -- the second component every result for these lessons prints. Its sine
// is the other side of the same triangle, so the angle's sentence says that too, and why it is
// negative -- pointing at the line with the minus in it, which is drawn after the sentence: the line
// above it has no minus, and "hence the minus" sent a reader looking there.
const ALONG_ROD = (dQ: string, ri2: string) => String.raw`\Delta E_y=-\frac{k\,${dQ}}{${ri2}}${fx('projection', String.raw`\sin\alpha_i`)}`;
//
// A remark carries paragraph breaks, "\n\n", where it moves from one idea to the next: the board sets
// each paragraph apart (see `DerivationBoard`). Set as one block, the longest remarks ran to sixteen
// lines under a lede that promises "each adding one idea".
const ANGLE_ROD_END = ANGLE_ROD.replace(/\.$/, String.raw`; its part along the rod, $\Delta E\sin\alpha_i$, is the side opposite${NB}$\alpha_i$.${BREAK}For positive charge that part points down, away from the rod: hence the minus in $\Delta E_y$ below.`);
// THE PART THAT SURVIVES A LOPSIDED BRACKET, AND ITS MINUS. Off-centre the board writes
// ΔE_y = −k ΔQ sin α / r_i² "survives too", and the remark explained only the cosine: the sine was never
// said to be the other side of the triangle, and the minus never said at all -- while the rod level with
// one end, one lesson over, says both. Said, as there, where the survivor is written.
//
// And for the pieces the bracket holds. It said only "down for a piece above the x-axis", and under a
// bracket wholly below the middle every bracketed piece's ΔE_y -- and the figure's ΣΔE -- points UP: the
// reader's own case was left to a sign deduction. So the sentence follows the bracket: above the middle,
// below it, or across it, where it says both and that the one minus covers both.
type Survivor = (above: boolean, below: boolean) => string;
const SURVIVOR = (angle: string, along: string, pos = 'y'): Survivor => (above, below) => {
  const part = String.raw`Its part ${along}, $\Delta E\sin${angle}$, is the side opposite${NB}$${angle}$. For positive charge it points away from the piece`;
  const negative = String.raw`where $${angle}$, like $${pos}$, is negative`;
  return !below ? String.raw`${part}, down for a piece above the${NB}$x$-axis: hence the minus in $\Delta E_y$ below.`
    : !above ? String.raw`${part}, up for a piece below the${NB}$x$-axis, ${negative}: there $\sin${angle}<0$, and the minus in $\Delta E_y$ below makes $\Delta E_y$ point up.`
    : String.raw`${part}, down for a piece above the${NB}$x$-axis and up for one below it, ${negative}: the minus in $\Delta E_y$ below covers both.`;
};
// The rods level with one end and the ramp: every piece is above P's line. "On the same side of P"
// meant nothing -- P is a point -- and what is missing is a partner BELOW that line. The last sentence
// is the one thing the run's note added; the note is gone, so the board says it.
const ABOVE = String.raw`Nothing cancels: every piece lies above the${NB}$x$-axis, so no piece has a mirror partner below it, and both parts of each survive. Cancellation needs a symmetry this geometry lacks.`;
const COS_AXIS = (s: string) => ({dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{z}{\sqrt{${s}^2+z^2}}`});
// A ring's piece and the piece half a turn round from it. ⊥ and θ+π were on the board with no word
// for either; the partner's part is −ΔE⊥, as the figure labels it. "Piece", as every other ring line
// says: "bit" is a part of one piece on the disk and the sheet, the next two lessons.
//
// "The drawn arrow": One piece says a ring's piece is drawn as a point charge at its middle and that a
// long piece's own field leans closer to the axis. "The arrow lies along r_i" then stated as fact what
// is true only of the drawing -- and of the part along the axis, which is all this line keeps.
const ANGLE_RING = String.raw`The angle $\alpha$ is the one at${NB}$P$ between the line to the piece (length $r_i$) and the axis. ${ARROW.replace('The arrow', 'The drawn arrow')} lies along that line, so its part along the axis is $\Delta E\cos\alpha$.`;
// A ring's piece of any size, said where its field is first written. The board wrote "A point charge's
// field" for a third of a ring, set equal to one, while the run said the point charge is a drawing and
// only the axial part is exact, and Add said the sum is exact "however the ring is cut": the one line
// of the card its own run contradicted. Every bit of a piece is r_i away at the same angle to the axis,
// so its bits' parts along the axis add to exactly the point charge's; their parts across it point
// different ways round the ring and add to less (sin(Δθ/2)/(Δθ/2) of it: 0.83 at three pieces). The
// angle is said in words: α is defined in What cancels, the next step.
//
// The reason first, in its own sentences, and the drawing after it as an aside: as one sixty-word sentence
// that opened on the drawing and the lean, a reader read it three times to find the simple reason -- all
// of a piece is the same distance away at the same angle.
const ANY_SIZE = String.raw`A piece need not be small. All of it is $r_i$ from${NB}$P$, at the same angle to the axis, so its part along the axis is exactly a point charge’s at any size, and that part is the only one the sum keeps.${BREAK}The figure draws the piece as a point charge at its middle; a long piece’s own field leans a little closer to the axis than that arrow.`;
// Not "the piece half a turn round": the pieces' middles are at 2π(i + ½)/N, so at an odd N -- the
// default five among them -- half a turn from one middle is the cut between two pieces, and the figure
// draws there an arc of the piece's length centred straight across, lighting no whole piece. What
// cancels the piece's part is that length of ring, at any N; so that is what the board names.
const PAIR_RING = String.raw`A piece’s part across the axis is $\Delta\mathbf E_\perp$; the same length of ring half a turn round, centred at $\theta+\pi$, makes $-\Delta\mathbf E_\perp$.`;
// A disk's or a sheet's rings, each of which cancels all the way round. What the board skipped was
// the step between the ring as a sum of bits and the ring as one charge: every bit of a thin ring is
// the same r_i away at the same α, so the bits' parts along the axis add up to the ring's charge,
// ΔQ = Σδq, times one factor. The caption says each ring has already cancelled; this says how.
// "Lies along its own r_i" read as each bit having a distance of its own, one sentence before "every
// bit of the thin ring is the same r_i away": r_i is a distance on this board, so the line is named.
//
// Signed, as the rods' ΔE is (`SIGNED`): "of size δE … its part along the axis is δE cos α" made the size
// negative for a negative charge, or the part along the axis wrongly positive.
const BITS = String.raw`Each bit’s field lies along the line from that bit to${NB}$P$. Written without its direction, $\delta E=k\,\delta q/r_i^2$ carries the sign of the bit’s charge, so its part along the axis is $\delta E\cos\alpha$.`;
const ACROSS_RING = String.raw`A bit’s part across the axis is $\delta\mathbf E_\perp$; the bit straight across the ring makes $-\delta\mathbf E_\perp$, so round the whole ring they undo each other.`;
const ADDS = (whose: string) => String.raw`Every bit of the thin ring is the same $r_i$ away at the same $\alpha$, so the parts along the axis add to $k\,\Delta Q\cos\alpha/r_i^2$, where $\Delta Q=\sum\delta q$ is the ${whose} charge.`;
const ANGLE_RINGS = String.raw`The angle $\alpha$ is the one at${NB}$P$ between a line to the ring (length $r_i$) and the axis. ${BITS}${BREAK}${ADDS('whole ring’s')}`;
// The sheet's sum is over the thin ring that stands in for each wide one -- see `SHEET` -- so of it
// the sum is exact. Over the wide ring's own bits, all put at r_i, it was 27% too big on the fourth
// ring at five pieces and infinite on the fifth: the divergence the first line had been rid of.
const ANGLE_SHEET = String.raw`${BITS}${BREAK}${ADDS('thin ring’s')}`;
// THE EQUAL-ANGLE LESSONS. The infinite line, the semi-infinite line and the sheet are cut at equal
// angles at P, so their outer pieces are long -- at every N the outermost never ends. The board used
// to write a piece's charge as what it exactly is, λΔy; but the next three lines then used that ΔQ
// as a point charge, and the outermost one's λΔy is infinite: the sum on the board diverged at every
// N. What the figure gives each piece is the point charge at its middle angle, λ r sec²θ Δθ (see
// `src/distributions/infinite.ts`), and that charge's field at P is nearly the piece's -- within two
// percent at five pieces on the infinite line (half a percent on the semi-infinite line and the
// sheet, whose pieces span half the angle), the outermost too. So that is what ΔQ is defined as,
// said so in words, and every line after it holds as written. (It is not "ΔQ ≈ λ r sec²θ Δθ": of the
// outermost piece's charge that is false. It is a definition of the stand-in, which is what the
// figure draws.)
//
// The figure brackets the piece in the lesson's own coordinate -- Δy, Δx, Δs -- and its footer reads
// ΔQ = λΔy while the board's first line read λ r sec²θ Δθ, with nothing relating the two. So the
// sentence that says what sec² is says that too: near P, r sec²θ Δθ is nearly the bracket.
//
// The angle is also said here, where it first appears: y = r tan θ and sec² used to arrive in the
// first line with θ defined two steps later.
const STAND_IN = (what: string, as = 'a point charge') => String.raw`Here $\Delta Q$ stands for ${as} at the ${what}’s middle angle, whose field at${NB}$P$ is nearly the ${what}’s, even for the outermost ${what}, which never ends.`;
//
// sec is said too, where it first appears: One piece then wrote r_i = r/cos θ and Shrink them
// r_i² = r² sec²θ, which a reader with weak trigonometry took for two unrelated distances.
// The cosine braced, so it is set as an ordinary symbol after the slash: bare, KaTeX gave it an
// operator's space and the definition read "1/ cos θ".
const SEC = (angle: string) => String.raw`with $\sec${angle}=1/{\cos${angle}}$`;
// WHERE r sec²α Δα COMES FROM, IN THE FIGURE. It was "how fast x grows with α" -- a rate, a derivative,
// as the justification of the lesson's first line, for the reader who never understood calculus. It is
// geometry the figure draws: seen from P a piece Δα wide spans its distance times Δα across the line of
// sight, and the line meets the sight line slantwise, so along the line the piece is 1/cos α longer.
// (Δx cos α = r_i Δα with r_i = r sec α: Δx = r sec²α Δα.) Nearly the bracket only near P: an outer
// piece's bracket is far longer, and the outermost never ends.
//
// WHY THESE THREE ARE CUT BY ANGLE AT ALL. The first thing a student asks of the sheet is why it is not
// cut into rings of equal width, as the disk is; the board opened on the trigonometry instead, and the
// reason -- the method's whole point -- was hinted at three steps later, in Add. An endless charge has no
// last piece of equal width, but seen from P its angles stop: the infinite line spans half a turn, the
// semi-infinite line a quarter, the sheet's rings a right angle. So N equal angles cover all of it.
//
// Of the piece's own length, not "the length Δy bracketed on the figure": the run's bracketed piece is
// never one near P -- at three pieces it is the outermost, which never ends, and no bracket is drawn.
const BRIDGE = (angle: string, sits: string, along: string, rate: string, o: {why: string; from: string; dist: string; unit: string; line: string; where: string; long: string; size: string; near: string}) =>
  String.raw`${o.why} The ${o.unit}’s angle at${NB}$P$, ${o.from}, is $${angle}$, so the ${o.unit} sits at $${sits}$, a distance $${o.dist}$ from${NB}$P$, ${SEC(angle)}.${BREAK}Seen from${NB}$P$, a ${o.unit} $\Delta${angle}$ wide spans $${o.dist}\,\Delta${angle}$ across the line of sight, and the ${o.line} meets that sight line slantwise, so ${o.where} the ${o.unit} is $1/{\cos${angle}}$ times as ${o.long}: $${rate}\,\Delta${angle}$, which for a ${o.unit} near${o.near} is nearly its own ${o.size}, $\Delta ${along}$.`;
const ENDLESS_LINE = (turn: string) => `An endless line has no last piece of equal length, but seen from${NB}$P$ it spans only ${turn}, so it is cut into $N$ pieces of equal angle.`;
const ON_LINE = (angle: string, turn: string) => ({why: ENDLESS_LINE(turn), from: 'from the perpendicular to the line', dist: String.raw`r\sec${angle}`, unit: 'piece', line: 'line', where: 'along the line', long: 'long', size: 'length', near: `${NB}$P$`});
// The ring's charge grouped as the sentence under it says it: σ times the circumference, 2πs, times the
// width, z sec²α Δα. Ungrouped it read "σ 2πs z sec²α Δα", one run of letters with two lengths, s and z,
// side by side and nothing to say which went with which -- where the disk's σ 2πs Δs maps onto its words.
const SHEET = {...DISK, piece: String.raw`\sigma\,(2\pi s)(z\sec^2\alpha\,\Delta\alpha)`, pieceIs: String.raw`s=z\tan\alpha`, charge: undefined,
  holds: String.raw`${BRIDGE(String.raw`\alpha`, String.raw`s=z\tan\alpha`, 's', String.raw`z\sec^2\alpha`, {why: `An endless sheet has no last ring of equal width, but seen from${NB}$P$ its angles stop at a right angle, so it is cut into $N$ rings of equal angle.`, from: 'between the axis and the line to the ring', dist: String.raw`z\sec\alpha`, unit: 'ring', line: 'sheet', where: 'across the sheet', long: 'wide', size: 'width', near: ' the axis'})}${BREAK}The density $\sigma$ is the charge per unit area, and a thin ring’s area is its circumference, $2\pi s$, times its width. ${STAND_IN('ring', 'a thin ring of charge')}`,
  // One ring wrote r_i = √(s² + z²) with no triangle -- the one One piece on the board that never said
  // where its distance comes from -- while Cut it up had just called it z sec α: one distance, two
  // formulas, nothing joining them. The disk's triangle, and the bridge to Cut it up's name for it.
  at: String.raw`The ring is $s$ out from the axis and $P$ is $z$ up it, so $r_i$ is the hypotenuse, the $z\sec\alpha$ of Cut it up.`,
  tail: String.raw`; and in the charge, $z\sec^2\alpha\,\Delta\alpha$ becomes the width${NB}$ds$`};
const PARTS: Record<ProblemId, Parts> = {
  // Off-centre, the part along the rod survives as −k ΔQ sin α / r_i², right only for an α signed like
  // y -- which "its mirror piece, at −α" said, and which goes with it. So the sign is said instead (in
  // `SURVIVOR`), and the sine is written in y, as the part's E_y below the board is.
  bisector: {...ROD_Y, ...COS_ROD, dirIs: ANGLE_ROD, mirrorSay: MIRROR(String.raw`\alpha_i`), pairSay: PAIR('along the rod'), mirror: {across: String.raw`\sin\alpha`, lost: 'along the rod'},
    signed: String.raw`On the triangle, $\sin\alpha_i=y_i/\sqrt{y_i^2+r^2}$.`,
    survivor: SURVIVOR(String.raw`\alpha_i`, 'along the rod', 'y_i'),
    anti: {pre: String.raw`\frac{k\lambda}{r}`, inner: String.raw`\frac{y}{\sqrt{y^2+r^2}}`, check: 'k*lambda/r*y/sqrt(y^2+r^2)'},
    antiAlso: {pre: String.raw`k\lambda`, inner: String.raw`\frac1{\sqrt{y^2+r^2}}`, check: 'k*lambda/sqrt(y^2+r^2)'},
    simplify: true, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  endpoint: {...ROD_Y, ...COS_ROD, dirIs: ANGLE_ROD_END, also: ALONG_ROD, alsoOf: SIN_ROD, nothing: ABOVE, simplify: true,
    anti: {pre: String.raw`\frac{k\lambda}{r}`, inner: String.raw`\frac{y}{\sqrt{y^2+r^2}}`, check: 'k*lambda/r*y/sqrt(y^2+r^2)'},
    antiAlso: {pre: String.raw`k\lambda`, inner: String.raw`\frac1{\sqrt{y^2+r^2}}`, check: 'k*lambda/sqrt(y^2+r^2)'},
    alongIntegral: {tex: String.raw`E_y=-\int_0^L\frac{k\lambda y}{(y^2+r^2)^{3/2}}\,dy`, check: '-k*lambda*y/(y^2+r^2)^(3/2)'},
    check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // The charge element is written with a slash: in the last line it sits in a numerator, and a
  // fraction there is set at script size -- a y over an L too small to read. And so it is everywhere
  // on the card, the same way: the first line and its gloss stacked y/L, the last line bracketed it and
  // the rule wrote λ₀y/L bare, one density set three ways.
  ramp: {...ROD_Y, dq: String.raw`\lambda_0\,(y/L)\,dy`, piece: String.raw`\lambda_0\,(y/L)\,\Delta y`, density: String.raw`\lambda(y)=\lambda_0\,(y/L)`,
    ...COS_ROD, dirIs: ANGLE_ROD_END, also: ALONG_ROD, alsoOf: SIN_ROD, nothing: ABOVE, simplify: true,
    // λ₀ was said only by the slider and the closed Model assumptions: what it is, the density at the top.
    holds: String.raw`The density $\lambda(y)$ is the charge per unit length where the piece is, rising from zero at $y=0$ to $\lambda_0$ at the top, $y=L$, so a piece $\Delta y$ long holds $\lambda(y)\,\Delta y$.`,
    charge: String.raw`\lambda(y)=\lambda_0\,(y/L)`,
    anti: {pre: String.raw`\frac{k\lambda_0 r}{L}`, inner: String.raw`-\frac1{\sqrt{y^2+r^2}}`, check: '-k*lambda0*r/L/sqrt(y^2+r^2)'},
    antiAlso: {pre: String.raw`-\frac{k\lambda_0}{L}`, inner: String.raw`\ln\frac{y+\sqrt{y^2+r^2}}{r}-\frac{y}{\sqrt{y^2+r^2}}`,
      check: '-k*lambda0/L*(log((y+sqrt(y^2+r^2))/r)-y/sqrt(y^2+r^2))', wide: [String.raw`\ln\frac{y+\sqrt{y^2+r^2}}{r}`, String.raw`-\frac{y}{\sqrt{y^2+r^2}}`]},
    alongIntegral: {tex: String.raw`E_y=-\int_0^L\frac{k\lambda_0\,y^2}{L\,(y^2+r^2)^{3/2}}\,dy`, check: '-k*lambda0*y^2/(L*(y^2+r^2)^(3/2))'},
    check: {dq: 'lambda0*y/L', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // Seen from beyond its end, every piece already pushes straight along the axis: there is no
  // factor to pick a component out with, and writing "cos 0" would invent one. Nor is there a second
  // row: its finished line only moved the dx, a full display row with no algebra in it.
  //
  // But One piece writes ΔE = k ΔQ / r_i² r̂_i and the next line is ΔE_x = k ΔQ / r_i² with no factor at
  // all: every other lesson turns r̂_i into a named cosine or sine and says why, and here the unit vector
  // went without a word. It is the +x direction for every piece, so ΔE_x is the whole of ΔE.
  axial: {...ROD_X, nothing: String.raw`Every piece lies on the axis through${NB}$P$, short of it, so $\hat{\mathbf r}_i$ is the $+x$ direction for every piece and $\Delta E_x$ is the whole of $\Delta E$: there is nothing sideways to cancel.`,
    anti: {pre: String.raw`k\lambda`, inner: String.raw`\frac1{L+a-x}`, check: 'k*lambda/(L+a-x)'},
    simplify: false, check: {dq: 'lambda', r: 'L+a-x', dir: '1'}},
  // r sec α, the name Cut it up gives this distance and the one it defines sec for: One piece's gloss
  // wrote r/cos α, stacked, between a Cut it up that said "r sec α from P" and a remark and a Shrink
  // them that said r² sec²α -- one distance three ways in three adjacent steps.
  infinite: {dq: String.raw`\lambda r\sec^2\alpha\,d\alpha`, piece: String.raw`\lambda r\sec^2\alpha\,\Delta\alpha`,
    r: String.raw`r\sec\alpha`, r2: String.raw`r^2\sec^2\alpha`, dir: String.raw`\cos\alpha`, dirOf: String.raw`\cos\alpha`, pieceIs: String.raw`y=r\tan\alpha`,
    // Led by the noun, not a second "Here": the sentence before it, `COULOMB`'s, already opens "Here r_i is".
    at: String.raw`The perpendicular from $P$ to the line, of length $r$, is the side next to${NB}$\alpha$, and $r_i$ is the hypotenuse.`,
    dirIs: String.raw`${ARROW} lies along the line of sight to the piece, so its part along $x$ is $\Delta E\cos\alpha$, the side next to${NB}$\alpha$.`, mirrorSay: MIRROR(String.raw`\alpha`),
    pairSay: PAIR('along the line'), mirror: {across: String.raw`\sin\alpha`, lost: 'along the line'},
    survivor: SURVIVOR(String.raw`\alpha`, 'along the line'),
    anti: {pre: String.raw`\frac{k\lambda}{r}`, inner: String.raw`\sin\alpha`, check: 'k*lambda/r*sin(alpha)'},
    antiAlso: {pre: String.raw`\frac{k\lambda}{r}`, inner: String.raw`\cos\alpha`, check: 'k*lambda/r*cos(alpha)'},
    holds: String.raw`${BRIDGE(String.raw`\alpha`, String.raw`y=r\tan\alpha`, 'y', String.raw`r\sec^2\alpha`, ON_LINE(String.raw`\alpha`, 'half a turn'))}${BREAK}The density $\lambda$ is the charge per unit length. ${STAND_IN('piece')}`,
    // THE LESSON'S CLAIM, ON THE BOARD. The run says every equal-angle piece makes exactly as much
    // field at P, and the chain at Add is N equal links; the algebra that proves it -- the sec²α in
    // the charge over the sec²α in the distance -- happened only inside Shrink them's second row, with
    // no word, while the bisector's three-halves power had a gloss of its own.
    equal: String.raw`With $r_i^2=r^2\sec^2\alpha$, the $\sec^2\alpha$ in $\Delta Q$ cancels: every piece’s $\Delta E$ is $k\lambda\,\Delta\alpha/r$. A far piece holds more charge, and is farther away by exactly enough.`,
    // Inline, as every other gloss is: stacked, it was the one display fraction among the glosses, set
    // ten pixels under the Σ → ∫ gloss with the rule's paragraph four pixels under its denominator.
    merged: String.raw`\lambda r\sec^2\alpha/(r^2\sec^2\alpha)=\lambda/r`,
    tail: String.raw`, while $\Delta Q_i$ and $\cos\alpha_i$ already are`,
    simplify: true,
    check: {dq: 'lambda*r/cos(alpha)^2', r: 'r/cos(alpha)', dir: 'cos(alpha)'}},
  // P is level with the end of the line, as it is with the rod's end in the lesson it grows from, so the
  // component along the line survives and points back past the end: a minus sign and the sine of the
  // angle at P, measured from the perpendicular P drops to the line -- as the lesson's own text measures
  // it, and as the infinite line's α is. The part across the line, along x, is the cosine's, as on the rod.
  semi: {dq: String.raw`\lambda\,dy`, piece: String.raw`\lambda r\sec^2\alpha\,\Delta\alpha`, r: String.raw`\sqrt{y^2+r^2}`, r2: String.raw`y^2+r^2`, pieceIs: String.raw`y=r\tan\alpha`,
    holds: String.raw`${BRIDGE(String.raw`\alpha`, String.raw`y=r\tan\alpha`, 'y', String.raw`r\sec^2\alpha`, ON_LINE(String.raw`\alpha`, 'a quarter turn'))}${BREAK}The density $\lambda$ is the charge per unit length. ${STAND_IN('piece')}`,
    at: HYPOTENUSE('y', 'r', 'line', false),
    anti: {pre: String.raw`\frac{k\lambda}{r}`, inner: String.raw`\frac{y}{\sqrt{y^2+r^2}}`, check: 'k*lambda/r*y/sqrt(y^2+r^2)'},
    antiAlso: {pre: String.raw`k\lambda`, inner: String.raw`\frac1{\sqrt{y^2+r^2}}`, check: 'k*lambda/sqrt(y^2+r^2)'},
    alongIntegral: {tex: String.raw`E_y=-\int_0^\infty\frac{k\lambda y}{(y^2+r^2)^{3/2}}\,dy`, check: '-k*lambda*y/(y^2+r^2)^(3/2)'},
    equal: String.raw`Putting $y=r\tan\alpha$ makes $r_i^2=y^2+r^2=r^2\sec^2\alpha$, and the $\sec^2\alpha$ in $\Delta Q$ cancels: every piece’s $\Delta E$ is $k\lambda\,\Delta\alpha/r$. A far piece holds more charge, and is farther away by exactly enough.`,
    dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{r}{\sqrt{y^2+r^2}}`, simplify: true,
    also: (dQ, ri2) => String.raw`\Delta E_y=-\frac{k\,${dQ}}{${ri2}}${fx('projection', String.raw`\sin\alpha`)}`, alsoOf: String.raw`\sin\alpha=\frac{y}{\sqrt{y^2+r^2}}`,
    nothing: String.raw`Nothing cancels: the line starts level with${NB}$P$ and runs only upward, so no piece has a mirror partner below the${NB}$x$-axis, and both parts of each survive, which is why the field leans.`,
    dirIs: String.raw`${ARROW} lies along the line of sight to the piece, so its part across the line, along $x$, is $\Delta E\cos\alpha$, the side next to${NB}$\alpha$, and its part along the line is $\Delta E\sin\alpha$, the side opposite${NB}$\alpha$. For positive charge the part along the line points back past the end, toward $-y$: hence the minus in $\Delta E_y$ below; for negative charge, toward $+y$.`,
    tail: String.raw`; and in the charge, $r\sec^2\alpha\,\Delta\alpha$ becomes the length${NB}$dy$`,
    check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // The whole ring's charge is spelled 2πRλ, as the lesson's own Unfold one click down spells it: the
  // board's λ2πR beside "Use Q = 2πRλ" was one quantity in two spellings on one card.
  ring: {...RING, ...COS_AXIS('R'), dirIs: ANGLE_RING, pairSay: PAIR_RING, mirror: {across: String.raw`\sin\alpha`, lost: 'across the axis'}, simplify: true,
    constant: {term: String.raw`\frac{k\lambda Rz}{(R^2+z^2)^{3/2}}`, whole: String.raw`\frac{k\,(2\pi R\lambda)\,z}{(R^2+z^2)^{3/2}}`,
      span: 'once round the ring', adds: String.raw`\int_0^{2\pi}d\theta=2\pi`, total: String.raw`2\pi R\lambda=Q`},
    check: {dq: 'lambda*R', r: 'sqrt(R^2+z^2)', dir: 'z/sqrt(R^2+z^2)'}},
  disk: {...DISK, ...COS_AXIS('s'), dirIs: ANGLE_RINGS, pairSay: ACROSS_RING, simplify: true,
    anti: {pre: String.raw`2\pi k\sigma z`, inner: String.raw`-\frac1{\sqrt{s^2+z^2}}`, check: '-2*pi*k*sigma*z/sqrt(s^2+z^2)'},
    check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  sheet: {...SHEET, ...COS_AXIS('s'), dirIs: ANGLE_SHEET, pairSay: ACROSS_RING, simplify: true,
    anti: {pre: String.raw`2\pi k\sigma z`, inner: String.raw`-\frac1{\sqrt{s^2+z^2}}`, check: '-2*pi*k*sigma*z/sqrt(s^2+z^2)'},
    check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  // P is the centre and the charge is on the far side of it, so the field there points back
  // across the centre: minus the cosine of the piece's own angle. Where θ is measured from is said
  // in the first line now, where θ first appears.
  arc: {...ARC, sign: '-', dir: String.raw`\cos\theta`, dirOf: String.raw`\cos\theta`, simplify: true,
    // Why the angle is θ, which it never said: the radius to the piece makes θ with the x-axis, by θ's own
    // definition, and the arrow is that radius carried on through P -- so it makes θ with the axis on the
    // far side, pointing back, which is the minus.
    dirIs: String.raw`With $P$ at the centre, the radius to a piece at angle $\theta$ makes the angle $\theta$ with the${NB}$x$-axis. ${ARROW} lies along that radius carried on through${NB}$P$, pointing for positive charge from the piece back through${NB}$P$: its part along $x$ is $-\Delta E\cos\theta$.`, mirrorSay: MIRROR(String.raw`\theta`),
    pairSay: PAIR('across the axis'), mirror: {across: String.raw`\sin\theta`, lost: 'across the axis'},
    // The arc's θ is signed already -- round from the x-axis, its line of symmetry -- so the sentence says
    // the part's sign with it, for the pieces the bracket holds: it said nothing of θ < 0 at all.
    survivor: (above, below) => String.raw`Its part along $y$ is $-\Delta E\sin\theta$: the radius back through${NB}$P$ points ${[
      ...above ? [String.raw`down for a piece above the${NB}$x$-axis, where $\theta>0$`] : [],
      ...below ? [String.raw`up for ${above ? 'one' : 'a piece'} below ${above ? 'it' : String.raw`the${NB}$x$-axis`}, where $\theta<0$`] : []].join(', and ')}.`,
    anti: {pre: String.raw`-\frac{k\lambda}{R}`, inner: String.raw`\sin\theta`, check: '-k*lambda/R*sin(theta)'},
    antiAlso: {pre: String.raw`\frac{k\lambda}{R}`, inner: String.raw`\cos\theta`, check: 'k*lambda/R*cos(theta)'},
    tail: String.raw`, while $r_i$ is $R$ for every piece, a constant`,
    check: {dq: 'lambda*R', r: 'R', dir: '-cos(theta)'}},
  'v-ring': {...RING, simplify: true,
    constant: {term: String.raw`\frac{k\lambda R}{\sqrt{R^2+z^2}}`, whole: String.raw`\frac{k\,(2\pi R\lambda)}{\sqrt{R^2+z^2}}`,
      span: 'once round the ring', adds: String.raw`\int_0^{2\pi}d\theta=2\pi`, total: String.raw`2\pi R\lambda=Q`},
    check: {dq: 'lambda*R', r: 'sqrt(R^2+z^2)', dir: '1'}},
  'v-disk': {...DISK, simplify: false,
    anti: {pre: String.raw`2\pi k\sigma`, inner: String.raw`\sqrt{s^2+z^2}`, check: '2*pi*k*sigma*sqrt(s^2+z^2)'},
    check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: '1'}},
  // With its limits, as the ring's is: "∫dθ = φ" with none is an indefinite integral, θ + C.
  'v-arc': {...ARC, simplify: true,
    constant: {term: String.raw`k\lambda`, whole: String.raw`\frac{k\,(\lambda R\varphi)}{R}`,
      span: 'along the whole arc', adds: String.raw`\int_{-\varphi/2}^{\varphi/2}d\theta=\varphi`, total: String.raw`\lambda R\varphi=Q`},
    check: {dq: 'lambda*R', r: 'R', dir: '1'}},
  // Each logarithm of a pure number, as the lessons write theirs: a bracket differs from another by a
  // constant, so the length the argument is measured in is free, and r (or a) makes it a ratio.
  'v-rod-bisector': {...ROD_Y, simplify: false,
    anti: {pre: String.raw`k\lambda`, inner: String.raw`\ln\frac{y+\sqrt{y^2+r^2}}{r}`, check: 'k*lambda*log((y+sqrt(y^2+r^2))/r)'},
    check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: '1'}},
  'v-rod-axial': {...ROD_X, simplify: false,
    anti: {pre: String.raw`-k\lambda`, inner: String.raw`\ln\frac{L+a-x}{a}`, check: '-k*lambda*log((L+a-x)/a)'},
    check: {dq: 'lambda', r: 'L+a-x', dir: '1'}},
};
/** The factors of one lesson's integrand, as expressions -- for the tests, which multiply them. */
export const factorsOf = (p: Problem) => PARTS[p.id].check;
/** Mark a factor as coming from one feature of the figure. */
export function fx(term: Term, tex: string) { return String.raw`\htmlClass{fx fx-${term}}{${tex}}`; }
/** The component being built, as the figure and the result name it. */
export function componentOf(p: Problem): string {
  if (p.quantity === 'V') return 'V';
  return ['ring', 'disk', 'sheet'].includes(p.geometry) ? 'E_z' : 'E_x';
}
/** Is the sum on the board exact at any cut? Of a ring's field along its axis, and of a ring's or
 * an arc's potential, it is: every piece is the same distance from P (at the same angle), so each
 * piece's part is exactly k ΔQ cos α / r_i² (or k ΔQ / r_i) however it is cut. The board wrote ≈ and
 * the run said the answer arrives "once they shrink" -- teaching that calculus corrects a ring's
 * answer, the opposite of the ring's lesson. (The arc's field is not exact: the piece is not a point
 * seen from the centre, and its chord pulls the field in.) */
export const exactSum = (p: Problem) => !!PARTS[p.id].constant;
/** A dragged bracket's integral, done: the lesson's antiderivative written between the bracket's own
 * ends. "Part of the distribution" was set like the answer and held no formula -- "done between these
 * ends, the same integral gives that part's E_x" promised a value and showed none, where a lecturer
 * writes the bracket. Nothing for the exact lessons, whose last line already is the part's value. */
//
// AND E_y WHERE IT SURVIVES. The part's answer was E_x alone, while What cancels said ΔE_y "survives too"
// and the figure's sum visibly leaned: on the rods level with one end and the semi-infinite line under
// any bracket, and on the bisector, the infinite line and the arc under a lopsided one. The whole charge's
// answer for the first three gives E_y; under a bracket it vanished, and a reader took E_x for that part's
// field. `keeps` says whether the bracket still holds every mirror, as the board's `keeps` does.
export function partResult(p: Problem, lo: string, hi: string, keeps = true): string | undefined {
  const t = PARTS[p.id], a = t.anti;
  if (!a) return undefined;
  // Sized to what it holds, but never shorter than the fraction before it: \left[ round a bare sin θ
  // came out the height of a letter, under a kλ/r a storey taller, as Unfold's own \Big[ sin θ \Big] is not.
  const row = (lhs: string, b: {pre: string; inner: string; wide?: [string, string]}) => {
    const ends = `_{${lo}}^{${hi}}`;
    // Too long for one row, the bracket is set over two as the answer sets the ramp's: \bigg[ by hand,
    // since \left…\right cannot span a break, the second row hung under its first term.
    if (b.wide) return String.raw`${lhs}&=${b.pre}\bigg[${b.wide[0]}\\&\phantom{{}=${b.pre}\bigg[}${b.wide[1]}\bigg]${ends}`;
    const [open, close] = /\\frac|\\sqrt/.test(b.inner) ? [String.raw`\left[`, String.raw`\right]`] : [String.raw`\Bigl[`, String.raw`\Bigr]`];
    return String.raw`${lhs}&=${b.pre}${open}${b.inner}${close}${ends}`;
  };
  const y = t.antiAlso && (t.also || !keeps) ? t.antiAlso : undefined;
  if (!y) return row(componentOf(p), a).replace('&=', '=');
  // One aligned block in the answer's rhythm: the bare break is sized by `spaced`, as an inherited row's is.
  return spaced(String.raw`\begin{aligned}${row(componentOf(p), a)}\\${row('E_y', y)}\end{aligned}`);
}
/** Does the part's answer carry a second component? */
export const partHasAlso = (p: Problem, keeps = true) => !!PARTS[p.id].antiAlso && (!!PARTS[p.id].also || !keeps);
/** The same bracket's contents as one expression, for the tests: its derivative is the integrand. */
export const antiderivativeOf = (p: Problem) => PARTS[p.id].anti?.check;
/** And the bracket for E_y, whose derivative is the board's ΔE_y written in the variable. */
export const alongAntiderivativeOf = (p: Problem) => PARTS[p.id].antiAlso?.check;
/** E_y's integral over the whole charge, in the board's own convention, and its integrand for the tests. */
export const alongIntegralOf = (p: Problem) => PARTS[p.id].alongIntegral;
/** Where a piece is and where the pieces run, for each geometry over its whole length: the limits
 * of the sum said in words. `run` is handed the two ends already written "variable = limit". */
//
// WHERE PIECE i IS, INDEXED. "Each piece sits at its own y", then Shrink them's r_i² = y² + r²: an indexed
// left side set equal to an unindexed right side, and the one idea that turns Σ into ∫ -- that piece i's
// own position y_i becomes the y the integral runs over -- written nowhere. So the position is y_i from
// here to the rule, and the rule says what becomes of it. (One piece's gloss stays unindexed: it is about
// one piece, any piece.)
const SPANS: Record<string, {each: string; run: (lo: string, hi: string) => string}> = {
  bisector: {each: 'piece $i$ sits at $y_i$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  axial: {each: 'piece $i$ sits at $x_i$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  endpoint: {each: 'piece $i$ sits at $y_i$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  ramp: {each: 'piece $i$ sits at $y_i$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  // In the angle the infinite line is finite: its far ends are where α reaches a right angle.
  infinite: {each: String.raw`piece $i$ sits at the angle $\alpha_i$`, run: (lo, hi) => `from ${lo}, far along the line one way, to ${hi}, far along it the other`},
  semi: {each: 'piece $i$ sits at $y_i$', run: lo => String.raw`from the end, ${lo}, on to $\infty$`},
  ring: {each: String.raw`piece $i$ sits at the angle $\theta_i$ round the ring`, run: (lo, hi) => `from ${lo} once round to ${hi}`},
  arc: {each: String.raw`piece $i$ sits at the angle $\theta_i$`, run: (lo, hi) => `from one end of the arc, ${lo}, to the other, ${hi}`},
  disk: {each: 'ring $i$ sits at the radius $s_i$', run: (lo, hi) => `from the centre, ${lo}, to the rim, ${hi}`},
  sheet: {each: 'ring $i$ sits at the radius $s_i$', run: lo => String.raw`from the centre, ${lo}, on to $\infty$`},
};
/** A stacked fraction, written with a slash for a remark: set inline, the stacked one shrinks. */
const slash = (tex: string) => tex.replace(/^\\frac\{([^{}]*)\}\{(.*)\}$/, '$1/$2');
/** One line of algebra per stage of the run, in the stages' order.
 *
 * `bounds` overrides the limits of integration, so that dragging the brackets in the figure
 * rewrites the integral; left out, the line runs over the whole distribution. `keeps` says whether
 * the bracketed part still has every piece's mirror partner in it: off-centre, it does not, and the
 * part across the axis survives. Left out, it is worked out from the bounds as written. `span` is how
 * much angle a bracket on a ring or an arc takes, written as the panel names it (π, φ/2): pasting the
 * limits into "hi − lo" finished a centred arc on (φ/4 − −φ/4) and half a ring on (3π/2 − π/2).
 * `oneSided` says that no piece's mirror is in the bracket at all -- it lies wholly on one side of
 * the middle, or takes half the ring or less -- where "some pieces' mirrors lie outside it" said too
 * little. Left out, a bracket that starts or ends at the middle, 0, is one-sided. `below` says that the
 * bracket reaches below the middle, where an angle measured from it is negative; left out, it does when
 * its lower limit is negative or a handle's name. `above` says the same of the half above the middle;
 * left out, a bracket reaches above it unless its upper limit is the middle or below. */
export function boardLines(p: Problem, bounds?: [string, string], opts: {keeps?: boolean; span?: string; oneSided?: boolean; below?: boolean; above?: boolean} = {}): BoardLine[] {
  // The infinite line's board is written in α, the angle it is cut by. Handed the finite-rod route,
  // which integrates in y between −L/2 and L/2, it wrote a α integrand between y's limits and said
  // "written in terms of y: r_i² = r² sec²α". The panel always hands it the angular lesson; this says
  // so loudly, rather than mixing the two the day a route tab is wired to the board.
  if (p.id === 'infinite' && p.variable !== 'alpha') throw Error('The board builds the infinite line in α; pass the angular lesson.');
  const t = PARTS[p.id], scalar = p.quantity === 'V', lhs = componentOf(p), v = p.variableTex;
  const surface = p.geometry === 'disk' || p.geometry === 'sheet', unit = surface ? 'ring' : 'piece';
  const [lo, hi] = bounds ?? p.boundTex;
  const whole = !bounds || (lo === p.boundTex[0] && hi === p.boundTex[1]);
  const keeps = opts.keeps ?? (whole || (p.geometry !== 'ring' && lo === `-${hi}`));
  const oneSided = opts.oneSided ?? (p.geometry !== 'ring' && (lo === '0' || hi === '0'));
  const dQ = fx('element', String.raw`\Delta Q`), ri = fx('distance', 'r_i');
  // The square inside the factor, so it stacks over the subscript as r_i^2 does anywhere else, takes
  // the distance's colour and is part of what lights. Outside the \htmlClass group it was set after
  // the subscript, in black, and a lit chip left it hanging off its edge.
  const ri2 = fx('distance', 'r_i^{2}');
  const sign = t.sign ?? '';
  // KaTeX already sets a thin space before an operator like cos; an explicit one doubled it, so a
  // coloured cos α sat twice as far from its fraction as an uncoloured sin α in the same card.
  const gap = (tex: string) => /^\\(cos|sin)/.test(tex) ? '' : String.raw`\,`;
  // The same contribution with every piece-dependent symbol indexed, for the sum over pieces. A
  // ring's bits are all at one angle, and the sentence under the sum says so: its α is not indexed.
  const angleVaries = !!t.dir && p.geometry !== 'ring';
  const nth = (tex: string) => angleVaries ? tex.replace(/\\(alpha|theta)$/, '\\$1_i') : tex;
  // Where piece i sits, written y_i: the variable indexed wherever it stands alone (see `SPANS`).
  const indexed = (tex: string) => /^\\(theta|alpha)$/.test(v) ? tex.replace(new RegExp('\\' + v + '(?!_)', 'g'), `${v}_i`)
    : tex.replace(new RegExp(String.raw`(?<![\\a-zA-Z]|\\Delta\s?)${v}(?![a-zA-Z_])`, 'g'), `${v}_i`);
  // The rods index piece i's position, and its angle, from One piece on (see `HYPOTENUSE`).
  const rod = ['bisector', 'endpoint', 'ramp', 'axial', 'v-rod-bisector', 'v-rod-axial'].includes(p.id);
  const ofPiece = (tex: string) => rod ? indexed(tex) : tex;
  const angleOf = (tex: string) => rod ? nth(tex) : tex;
  const dir = t.dir ? fx('projection', angleOf(t.dir)) : '';
  // One piece's contribution, written once and reused: the cancelling, adding and limiting lines
  // are this same expression with one thing changed, and the reader should see that it is.
  const one = scalar ? String.raw`\frac{k\,${dQ}}{${ri}}` : String.raw`${sign}\frac{k\,${dQ}}{${ri2}}${dir ? gap(t.dir!) + dir : ''}`;
  const dQi = fx('element', String.raw`\Delta Q_i`);
  const term = scalar ? String.raw`\frac{k\,${dQi}}{${ri}}` : String.raw`\frac{k\,${dQi}}{${ri2}}${t.dir ? gap(t.dir) + fx('projection', nth(t.dir)) : ''}`;
  // The sign stands before the sum and the integral, as a book sets it, not inside them.
  // Each limit braced: a bare minus after a relation is spaced as a binary one.
  //
  // As the range it is. A lone "y: −L/2 → L/2" under a Σ with no limits was first read as an equation for y;
  // "−L/2 ≤ y ≤ L/2" is how a book says where a variable runs, and the sentence under it says the same in
  // words. (Words inside the gloss would be a \text{} run, which never wraps.) Short of infinity, never at it.
  // (The infinite line's ±π/2 are its two ends at infinity, so they are not reached either.)
  const endless = (b: string) => b === '\\infty' || (p.id === 'infinite' && /^-?\\pi\/2$/.test(b));
  const range = fx('bounds', String.raw`{${lo}}${endless(lo) ? '<' : String.raw`\le `}${v}${endless(hi) ? '<' : String.raw`\le `}{${hi}}`);
  const integral = String.raw`\int_{${fx('bounds', lo)}}^{${fx('bounds', hi)}}`;
  const element = fx('element', t.dq);
  // kλ, as the finished row under it and the answer set it: "k λ dy" over "kλr" spaced one product two ways
  // in one chain. (The thin space the lines above set after k is before a ΔQ, a symbol of its own; this line's
  // charge is the limit's, which always opens on its density, so it never takes one.)
  const substituted = scalar
    ? String.raw`\frac{k${element}}{${fx('distance', t.r)}}`
    : String.raw`\frac{k${element}}{${fx('distance', t.r2)}}${t.dirOf ? gap(t.dirOf) + fx('projection', t.dirOf) : ''}`;
  // The "=" hangs under the first line's: a phantom of the left side takes exactly its width, so
  // the two halves line up the way a chain of equalities is set in a book.
  const kernel = sign ? p.kernelTex.replace(/^-/, '') : p.kernelTex;
  const constant = t.constant;
  // How much angle the bracket takes: the panel's own name for it where it has one, else the two
  // limits subtracted -- a negative lower limit added, never "θ₂ − −φ/2".
  const count = opts.span ?? (lo === '0' ? hi : lo.startsWith('-') ? `${hi}+${lo.slice(1)}` : `${hi}-${lo}`);
  const bracket = (c: string) => /[-+/]/.test(c) ? `(${c})` : c;
  // A term that never changes comes out of the integral, and what is left adds up the pieces' angles:
  // over the whole ring that is λ 2πR, which is Q -- set in brackets so the reader sees the Q arrive.
  // Over part of it the angle is written before a fraction, as a book writes 2π kλ/r, not after it,
  // where "kλRz/(R²+z²)^{3/2} π" left the π hanging off the fraction.
  const counted = constant && (constant.term.startsWith('\\frac') ? String.raw`${bracket(count)}\,${constant.term}` : String.raw`${constant.term}\,${bracket(count)}`);
  const simplified = constant
    ? String.raw`\phantom{${lhs}}=${whole ? constant.whole : counted}`
    : String.raw`\phantom{${lhs}}=${sign}\int_{${lo}}^{${hi}}${kernel}\,d${v}`;
  // A square times its own square root is the three-halves power: the finished line used to arrive
  // at it with no word, and with every colour gone.
  const merges = !scalar && t.r === String.raw`\sqrt{${t.r2}}` && !!t.dirOf?.includes(t.r);
  const r2 = t.r2.replace(/^\((.*)\)\^2$/, '$1');
  const merged = t.merged ?? (merges ? String.raw`(${r2})\sqrt{${r2}}=(${r2})^{3/2}` : undefined);
  // The glosses are set in display style: in text style a fraction like Q/L shrinks to a size
  // nobody can read at the panel's type size, and these are what the new symbols mean.
  const gloss = (tex?: string) => tex && String.raw`\displaystyle ${tex}`;
  // How far a piece is from P, and the triangle that says so. A ring is not a point, but every bit
  // of a thin one is this far away -- said in words beside the distance, not in a \text{} inside it.
  // A disk's rings are Δs wide, so that holds of them as thin rings, which is the ≈ the Add line
  // names: at R = 4, z = ½ and five rings the innermost one's bits run from 0.78 to 1.47 r_i. The
  // sheet's are cut at equal angles and its outer ones are wide -- at five pieces the fourth ring's
  // bits run from 0.77 to 1.47 r_i and the fifth's never end -- so its sum is over the thin ring that
  // stands in for each (see `SHEET`): putting the wide ring's own bits at r_i made the fourth ring's
  // field 27% too big and the fifth's infinite.
  const distance = gloss(fx('distance', String.raw`r_i=${ofPiece(t.r)}`));
  const POINT = String.raw`Each bit’s field is a point charge’s, from Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$.`;
  // What δq is to ΔQ, said where δq first appears: the line opens on a sum of δq's, and that the ring's
  // charge is their sum was said only in What cancels, a step later.
  const bit = String.raw`A bit of the ring holds $\delta q$, a small share of the ring’s charge, $\Delta Q=\sum\delta q$, and $\hat{\mathbf r}$ points from it toward${NB}$P$. ${POINT}`;
  // What the i on r_i counts, where r_i first appears (see `COULOMB`).
  const numbers = String.raw`the $i$ numbers the ${unit}s`;
  // A potential lesson's second line drops a square and a unit vector from the field's, and a student
  // coming from the field lessons reads both as typos: so it says why, where they go missing.
  // k is defined last: "with k = 1/(4πε₀) -- over r_i, not r_i²" read as k over r_i.
  //
  // "Over its distance — over r_i, not r_i²" said "over" twice across a dash, and read as a false start.
  // So the distance is named once, and what it is not is said in a clause of its own.
  const POTENTIAL = String.raw`divided by its distance, $r_i$ (not $r_i^2$, as for the field), and a potential has no direction: $\Delta V$ is a number, with nothing to split into parts. Here $k=1/(4\pi\varepsilon_0)$, and ${numbers}.`;
  // A ring's or an arc's potential is exact at any cut, and the run's first line says pieces of any
  // size -- while One piece said only "a point charge's potential", and Add then called the sum exact
  // with nothing on the card saying why a large piece is a point charge's here. Every bit of one is the
  // same distance away; the field ring's One piece says its own version (`ANY_SIZE`).
  const anySize = scalar && constant
    ? `${BREAK}A piece need not be small: all of it is ${p.geometry === 'arc' ? '$R$' : '$r_i$'} from${NB}$P$, so this is exact at any size.`
    : '';
  const toward = scalar
    ? surface
      // "But treated as thin, every bit…" left "treated" hanging off nothing: the ring is what is treated.
      ? String.raw`A ring is not a point, but if it is treated as thin, every bit of it is $r_i$ from${NB}$P$, so it adds $k$ times its charge ${POTENTIAL} ${t.at}`
      : String.raw`A point charge’s potential is $k$ times its charge ${POTENTIAL} ${t.at}${anySize}`
    // ΔQ stands for the thin ring, as on the infinite and the semi-infinite line it stands for a point
    // charge, and ΔE is that stand-in's field: "=", as there. The board wrote ≈ here, = for the same ΔE
    // in What cancels and ≈ again in Add, the sign flipping on one approximation. Cut it up says the
    // stand-in's field is nearly the wide ring's, and Add keeps the one ≈ that comes of it.
    : p.geometry === 'sheet'
      ? String.raw`A bit of the thin ring that stands in for this one holds $\delta q$: the bits hold $\Delta Q$ between them, all $r_i$ from${NB}$P$ (${numbers}), and $\hat{\mathbf r}$ points from a bit toward${NB}$P$. ${POINT} ${t.at}`
      // What r_i is, and what i numbers, before the triangle that gives it: "r_i is the hypotenuse" came
      // first, a sentence before the ring was said to be r_i away at all.
      : surface ? String.raw`${bit} If the ring is treated as thin, every bit of it is $r_i$ from${NB}$P$ (${numbers}). ${t.at}`
      : String.raw`${COULOMB} ${t.at}${BREAK}${SIGNED}${t.equal ? BREAK + t.equal : ''}${p.geometry === 'ring' ? BREAK + ANY_SIZE : ''}`;
  // A potential's third line is its second line again, and that is the point: a number has no
  // direction, so there is nothing to project -- and with charge of one sign, no piece's number
  // can undo another's. (Charge of both signs could: a dipole's potential vanishes where its
  // field does not.) Where there is a mirror piece it is the same distance away and adds the same --
  // so long as the bracket still holds it.
  const paired = ['bisector', 'ring', 'arc'].includes(p.geometry);
  // The cancellation, written: the line itself is only the survivor. A piece and its mirror partner
  // carry equal and opposite sideways parts, labelled on the figure ΔE_y and −ΔE_y; a ring's bits do
  // it all the way round, which is the disk's and the sheet's cancellation too, one ring at a time.
  // In ink: it is not a projection, and coloured as one it lit the figure's angle triangle when
  // pointed at, while the pair it names is drawn in the contributions' teal.
  //
  // Each ends on what it means for the whole charge, as the rods' always did: the ring stopped at
  // "= 0" for one pair and the disk at one ring's sum, with no conclusion for the field.
  //
  // The sum over a ring is one Σ, set one way wherever it appears: its label beside the sign, as a
  // subscript. Under it, "thin ring" -- three times as wide as Σ -- pushed the fraction after it fifteen
  // pixels from the sign, and held to the sign's width it ran out of the left of a line that opens on
  // it. And the sheet's cancellation names the thin ring its One piece sums, not a plain "ring".
  const ringSum = String.raw`\sum\nolimits_{\text{${p.geometry === 'sheet' ? 'thin ring' : 'ring'}}}`;
  const none = String.raw`\;\Rightarrow\;\mathbf E_\perp=\mathbf 0`;
  const undone = t.mirror && p.geometry !== 'ring'
    ? String.raw`\Delta E_y+(-\Delta E_y)=0\;\Rightarrow\;E_y=0`
    : p.geometry === 'ring' ? String.raw`\Delta\mathbf E_\perp+(-\Delta\mathbf E_\perp)=\mathbf 0${none}`
      // The sum is over one ring's bits, so what it gives is that ring's ΔE⊥; that every ring's is zero is
      // what makes the whole charge's zero. "Σ δE⊥ = 0 ⇒ E⊥ = 0" jumped from one ring to the whole disk.
      : surface ? String.raw`${ringSum}\delta\mathbf E_\perp=\Delta\mathbf E_\perp=\mathbf 0${none}` : undefined;
  // A bracket dragged off-centre -- or short of the whole ring -- leaves some pieces' partners
  // outside it. The board kept writing E_y = 0 over a figure whose ΣΔE visibly leaned: the upper half
  // of the rod leans 17°, a quarter-arc 45°. So there the cancellation is not written, the part that
  // survives is, and the remark says why. On one side of the middle no mirror is inside at all, and
  // "some" said too little.
  const lopsided = !scalar && !!t.mirror && !keeps;
  // The rods' survivor is a signed component, which adds along the bracket. The ring's used to be
  // written |ΔE⊥| = … sin α "survives too": a magnitude, which cannot survive a sum, beside a sin α
  // the card never defined. On part of a ring the pieces' parts across the axis point different ways
  // round it: they still partly cancel, and only what is left leans the field. So the ring says that in
  // words, with its sine said where E_z's cosine is.
  const across = t.mirror && p.geometry !== 'ring' ? String.raw`\Delta E_y=-\frac{k\,${dQ}}{${ri2}}${fx('projection', angleOf(t.mirror.across))}` : undefined;
  // A size is never negative: |ΔQ|, or a negative charge's part had a negative size.
  const ringAcross = String.raw`Its part across the axis, of size $k\,|\Delta Q|\sin\alpha/r_i^2$ with $\sin\alpha=R/\sqrt{R^2+z^2}$, no longer meets its partner: across the bracket those parts only partly cancel, and the rest leans the field.`;
  // Which side of the middle the bracket reaches, for the survivor's sentence: on a bracket wholly above
  // it, "below the x-axis α is negative" explained a negative α that never occurs, and on one wholly
  // below it "down for a piece above the x-axis" described no piece the bracket holds.
  const below = opts.below ?? (lo.startsWith('-') || /_[12]$/.test(lo));
  const above = opts.above ?? !(hi === '0' || hi.startsWith('-'));
  // "The ring straight across every piece" read as one ring that is straight across: what lies outside
  // is the length of ring across from each piece, in `PAIR_RING`'s own words.
  const offCentre = p.geometry === 'ring'
    ? `With the bracket ${oneSided ? 'on half the ring or less, the length of ring straight across from each piece lies' : 'short of the whole ring, the length of ring straight across from some pieces lies'} outside it, so the part across the axis no longer cancels: the integral below builds $${lhs}$ alone.`
    // "Builds E_x alone" was the whole truth while the part's answer was E_x alone; it now writes E_y too
    // (see `partResult`), so the sentence says where, not that E_y is left out.
    : `With the bracket ${oneSided ? 'on one side of the middle, every piece’s mirror lies outside it' : 'off-centre, not every piece’s mirror is inside it'}, so the part ${t.mirror?.lost} no longer cancels: the integral below builds $${lhs}$${t.antiAlso ? ', and $E_y$ comes with the part’s answer' : ' alone'}.`;
  const cancel: BoardLine = scalar
    // Why, where there is a mirror: the field's twin cancelled the same piece one lesson earlier, and
    // "Its mirror piece adds the same; nothing cancels." gave no reason. The ring's is the same length of
    // ring straight across, as its field's is (see `PAIR_RING`).
    ? {key: 'cancel', tex: String.raw`\Delta V=\frac{k\,${dQ}}{${ri}}`,
      // And that the line is the one above: it is One piece's again, letter for letter, and a reader
      // looked for the difference that was not there.
      nothing: paired && keeps
        ? `${p.geometry === 'ring' ? 'The same length of ring straight across' : 'Its mirror piece'} is just as far away and its charge has the same sign, so it adds the same $\\Delta V$: nothing cancels, since a number has no sideways part, and $\\Delta V$ is unchanged from the step before.`
        // Not "as One piece wrote it": a step's name mid-sentence read as a typo, and on the printed copy
        // there is no run to name.
        : `No direction, and one sign of charge: nothing cancels, so $\\Delta V$ is unchanged from the step before.`}
    : t.dir
      ? {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`,
        where: t.dirOf !== t.dir ? gloss(fx('projection', String.raw`${angleOf(t.dir)}=${ofPiece(t.dirOf!)}`)) : undefined,
        // Why the part is that side of the triangle, said beside the formula -- and the mirror's
        // sentence only while the mirror is in the sum. Without it, the part that then survives is said
        // too, the other side of the same triangle, with why it carries a minus; and the angle's sign
        // where the bracket reaches below the middle.
        say: t.dirIs + ((lopsided
          ? p.geometry === 'ring' ? ' ' + ringAcross
            : (t.survivor ? BREAK + t.survivor(above, below) : '') + (t.signed ? ' ' + t.signed : '')
          : t.mirrorSay) ?? ''),
        cancels: lopsided ? undefined : gloss(undone),
        cancelsSay: lopsided ? undefined : t.pairSay,
        nothing: lopsided ? offCentre : t.nothing,
        also: gloss(lopsided ? across : t.also?.(dQ, ri2)),
        // The surviving component's factor, glossed under the line that uses it (`alsoOf`). Beside the
        // cosine's, the two fractions ran past a 240px board.
        alsoWhere: t.alsoOf && !lopsided ? gloss(fx('projection', `${angleOf(t.alsoOf.slice(0, t.alsoOf.indexOf('=')))}=${ofPiece(t.alsoOf.slice(t.alsoOf.indexOf('=') + 1))}`)) : undefined}
      : {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`, nothing: t.nothing};
  // A ring's field is not one point charge's: each bit of it pushes along its own line to P, and
  // only around the whole ring do the sideways parts cancel. So the surface lessons write the ring
  // as the sum of its bits, and the next line is where that sum loses its sideways part. The sheet's
  // sum is over the bits of the thin ring that stands in for each wide one, and ΔE is that ring's field.
  //
  // The unit vector is in ink: coloured, it offered itself to be pointed at, and the figure draws
  // nothing for it to light -- the one coloured symbol on the board that found nothing.
  const oneField = surface
    ? String.raw`\Delta\mathbf E=${ringSum}\frac{k\,${fx('element', String.raw`\delta q`)}}{${ri2}}\,\hat{\mathbf r}`
    : String.raw`\Delta\mathbf E=\frac{k\,${dQ}}{${ri2}}\,\hat{\mathbf r}_i`;
  // THE LIMITS, SAID AS WHAT THEY ARE. "The limits are where the charge starts and ends in the
  // variable you sum over" sat under a sum over i, not over y: the pieces are counted by i and placed
  // by y, and a reader who took the sentence at its word looked for y under the Σ. So it says where
  // each piece is, and where the first and the last of them are.
  // Dragging the brackets narrows the sum, and then it says which pieces it now runs over. How many
  // there are is N, the Pieces slider: the sum never said, and N → ∞ under Shrink them had nothing to
  // refer to. "So every piece is counted once" went: "from one end to the other" already says it.
  const at = (b: string) => `$${v}=${b}$`, span = SPANS[p.geometry];
  //
  // A dragged limit the board names y₁ or y₂ was named nowhere else: neither the panel nor the figure
  // said what y₂ is. It is where a handle stands, so the sentence says so. An end at infinity is "on to
  // ∞", as the whole charge's sentence says it -- "to x = ∞" set a point where there is none.
  const named = [lo, hi].filter(b => /_[12]$/.test(b));
  const handles = named.length === 2 ? ` Here $${lo}$ and $${hi}$ are where the bracket’s handles stand on the figure.`
    : named.length ? ` Here $${named[0]}$ is where the bracket’s handle stands on the figure.` : '';
  const placed = bounds && !whole
    ? `The bracketed ${unit}s are numbered by $i$, and ${span.each}; they run from ${at(lo)} ${hi === '\\infty' ? 'on to $\\infty$' : `to ${at(hi)}`}.${handles}`
    : `The $N$ ${unit}s are numbered by $i$, and ${span.each}; they run ${span.run(at(lo), at(hi))}.`;
  // WHAT THE SUM IS, AND WHY "≈". The figure's chain adds whole arrows while the board adds one
  // part of each, and nothing said how the two are related, or why the sum is only nearly the field.
  const along = lhs === 'E_z' ? 'the axis' : '$x$';
  // Where the charge has a mirror about P's axis, Watch it build adds its pieces in mirror pairs, and the sum is
  // an arrow along the axis rather than a chain (see `pairs.ts` in the diagrams).
  // Over a bracketed part there is no mirror to pair with, and the figure draws the chain.
  // At an odd N -- the default five -- the figure's first step is the middle piece alone (`pairOrder`), under a
  // remark that promised pairs: so the remark says why it needs no partner.
  const inPairs = whole && !scalar && (p.geometry === 'bisector' || p.geometry === 'infinite' || p.geometry === 'arc');
  // Why only ≈. The disk's pieces were called thin rings from the first line, so "each ring is still
  // treated as one thin ring" gave the approximation as its own reason. What is approximate is that a
  // ring Δs wide has all its charge counted at one radius. The sheet's ring is the stand-in itself.
  //
  // And small compared with what. "Each piece is still treated as a point charge" never said, and the
  // sliders reach r = ½ beside L = 8 at three pieces, where the bisector's sum is 2.7 times the field:
  // a piece is nearly a point charge only while it is short beside its distance from P. On the arc that
  // distance is R for every bit of every piece, which made "only ≈" a puzzle beside the ring's "already
  // exact": what goes wrong is direction -- cos θ changes across a piece and the sum takes it at the
  // middle, too big by (Δθ/2)/sin(Δθ/2), 1.7% at the default five pieces and 4.7% at three.
  const equalAngle = p.geometry === 'infinite' || p.geometry === 'semi';
  // "Short compared with", not "short beside": a reader took "beside" for "next to".
  const roughly = p.geometry === 'sheet' ? 'each ring is still treated as one thin ring'
    : surface ? String.raw`each ring is $\Delta s$ wide, but all its charge is counted at one radius $s$, one distance $r_i$ from${NB}$P$, which is close only while a ring is narrow compared with that distance`
    : p.geometry === 'arc' ? String.raw`every bit of a piece is $R$ from${NB}$P$, but the bits’ fields point different ways: $\cos\theta$ changes across the piece, and the sum takes it at the piece’s middle`
    : equalAngle ? 'each piece is still treated as a point charge'
    : String.raw`each piece is still treated as a point charge, which is close only while a piece is short compared with its distance from${NB}$P$`;
  // What makes the ≈ an = in the limit, for the rule under the integral: the same approximation, gone.
  const sharper = surface ? p.geometry === 'sheet'
    ? 'the thinner a ring in angle, the more nearly its field is its thin ring’s, and in the limit it is'
    : 'the thinner a ring, the more nearly all its charge sits at one radius, and in the limit it does'
    : p.geometry === 'arc' ? String.raw`the shorter a piece, the less $\cos\theta$ changes across it, and in the limit not at all`
    : equalAngle ? 'the thinner a piece in angle, the more nearly its field is its point charge’s, and in the limit it is'
    : 'the thinner a piece, the more nearly it is a point charge, and in the limit it is one';
  // WHY AN EXACT SUM NEEDS NO CALCULUS. Called exact and then integrated anyway, the ring's integral
  // read as ritual. The line that answers "why integrate?" is one line: the factor every term shares
  // comes out of the sum, and what is left adds up the charge.
  //
  // In what every r_i is, not "r_i": the i is bound by the sum, and outside it r_i names no piece, so
  // "kQ/r_i" read as an answer that depends on which piece -- beside an answer printed as kQ/√(R² + z²)
  // that the reader then matched by hand. And the cosine after its fraction, as every other line sets
  // it: "k cos α / r_i²" moved it into the numerator on one row of the chain and not the next.
  const same = p.geometry === 'arc' ? undefined : scalar ? t.r : t.r2;
  const shared = scalar ? (p.geometry === 'arc' ? 'k/R' : `k/${t.r}`) : String.raw`\bigl(k/(${t.r2})\bigr)\cos\alpha`;
  // The sheet's rings make a bigger field the farther out they are, and run on to ∞: a sum of ever
  // bigger terms that never ends, which a reader takes to be infinite. With s = z tan α each term is
  // k ΔQ cos α / r_i² = 2πkσ tan α cos α Δα = 2πkσ sin α Δα: bigger, but never more than 2πkσ Δα, and
  // there are N of them. (That the angles stop at a right angle is now Cut it up's first sentence, the
  // reason the sheet is cut by angle at all; here it was the second time of saying it.)
  const finite = p.geometry === 'sheet' && whole
    ? String.raw` With $s=z\tan\alpha$ each term is $2\pi k\sigma\sin\alpha_i\,\Delta\alpha$: bigger for the farther rings, but never more than $2\pi k\sigma\,\Delta\alpha$, and there are $N$ of them, so the endless sheet still adds to a finite field.`
    : '';
  // Its own paragraph: where the pieces are is one idea, what their sum is another.
  // WHERE E_y IS. At Add the figure's chain visibly leans, on the rods level with one end, the
  // semi-infinite line and under a lopsided bracket, and the board said only how far it reaches along x:
  // E_y's sum was first met in the answer block, two steps after "survives too".
  const reachY = !scalar && (!!t.also || lopsided)
    ? ` How far it reaches along $y$ is $E_y$, the $\\Delta E_y$ added the same way; ${whole ? 'its integral is written with the answer, below' : 'it is written with the part’s answer, below'}.`
    : '';
  const sumIs = constant
    ? `${BREAK}Every piece is ${p.geometry === 'arc' ? '$R$ from' : 'the same distance from'}${NB}$P$${scalar ? '' : ' at the same angle'}, so this sum is already exact, however the ${p.geometry === 'arc' ? 'arc' : 'ring'} is cut: ${same ? `every $r_i$ is the same, $${t.r}$,${scalar ? '' : ' and every $\\alpha$ the same,'} so $${shared}$ comes out of the sum` : `$${shared}$ is the same in every term and comes out of the sum`}, and $\\sum_i\\Delta Q_i$ is ${whole ? 'the whole charge $Q$. The answer needs no integral' : 'the bracketed part’s charge'}.`
    : `${BREAK}${scalar ? 'The column on the figure stacks these numbers, and its height is this sum.' : inPairs ? `The figure adds the whole arrows in mirror pairs, whose sideways parts cancel (a lone middle piece, on the $x$-axis, has none), so the sum it builds runs along ${along}, and how far it reaches is this sum.` : `The chain on the figure adds the whole arrows, and how far it reaches along ${along} is this sum.`}${reachY} It is only $\\approx$: ${roughly}.${finite}`;
  // THE EXACT SUM, DONE. Add said in words that the shared factor leaves the sum and Σ ΔQ_i is Q, so
  // "the answer needs no integral" -- and the line under it was still E_z = Σ k ΔQ_i cos α / r_i². The
  // board then integrated anyway, while the answer credited the sum: the claim was never shown. So the
  // line goes on to it, in symbols. Over part of the charge it stops at the part's Σ ΔQ_i.
  const cosine = String.raw`${gap(String.raw`\cos\alpha`)}${fx('projection', String.raw`\cos\alpha`)}`;
  // The arc's R is its distance too, and coloured as one: in ink it was the one place the colour code broke,
  // while the ring's √(R² + z²) beside the same "= k/… Σ ΔQ_i" was distance-blue.
  const over = (top: string) => String.raw`\frac{${top}}{${fx('distance', same ?? 'R')}}${scalar || !same ? '' : cosine}`;
  const out = constant && over('k');
  const charged = constant && over('kQ');
  // Written in what every r_i is, the chain is too wide for one row of the panel: its second "=" starts a
  // row of its own, under the first, each "=" still under the line's. The arc's too, though it would fit:
  // one exact lesson set its chain on one row and the others on two.
  const summed = !constant ? undefined
    : whole ? spaced(String.raw`\begin{aligned}\phantom{${lhs}}&=${out}\sum_i${dQi}\\\phantom{${lhs}}&=${charged}\end{aligned}`)
    : String.raw`\phantom{${lhs}}=${out}\sum_i${dQi}${whole ? `=${charged}` : ''}`;
  // THE RULE THE LAST LINE FOLLOWS. Before a sum can become an integral over y, everything in it
  // that changes from piece to piece has to be written in y. That is the one step a student has to
  // make alone to set up the next integral; the line made it silently, followable only by colour,
  // and then named the factors without writing what they become. So it writes them: r_i² = y² + r²,
  // cos α_i = r/√(y² + r²) -- and the ring's charge, where it grows with the ring's radius, which is
  // what makes a disk a disk and not a ring. A ring's bits are all one distance away at one angle,
  // and an arc's all R away: there the term never changes, comes out of the integral, and what is
  // left counts the pieces -- ∫dθ = 2π round the ring, and λ 2πR is Q.
  //
  // Each in where piece i sits, y_i (see `SPANS`): the rule then says that y_i becomes the integral's y.
  //
  // Each named by a noun, as a list of formulas is: "$ΔQ_i = …$, $r_i² = …$ and $cos α_i = …$" set three
  // formulas apart by commas alone, which read as one run of algebra.
  const swaps = [
    ...(t.charge ? [`the ${t.charge.startsWith(String.raw`\lambda`) ? 'density' : 'charge'} $${indexed(t.charge)}$`] : []),
    ...(t.r === 'R' ? [] : [scalar ? `the distance $${indexed(`r_i=${t.r}`)}$` : `the squared distance $${indexed(`r_i^2=${t.r2}`)}$`]),
    ...(angleVaries && t.dirOf !== t.dir ? [`the ${t.dir!.startsWith(String.raw`\sin`) ? 'sine' : 'cosine'} $${indexed(`${nth(t.dir!)}=${slash(t.dirOf!)}`)}$`] : []),
  ];
  const listed = swaps.length > 1 ? `${swaps.slice(0, -1).join(', ')} and ${swaps.at(-1)}` : swaps[0];
  // The same replacements as the integral makes them, for the row under it (see `BoardLine.swaps`): the
  // width becoming d -- where the lesson is cut in its own variable -- and, where the term changes from piece
  // to piece, the distance and the direction with y_i become y. An exact lesson's term never changes.
  const ownCutHere = p.id !== 'semi' && p.id !== 'sheet';
  const turned = [
    ...(ownCutHere ? [String.raw`\Delta ${v}\to d${v}`] : []),
    ...(constant || t.r === 'R' ? [] : [fx('distance', scalar ? String.raw`r_i\to ${t.r}` : String.raw`r_i^2\to ${t.r2}`)]),
    ...(!constant && angleVaries && t.dirOf !== t.dir ? [fx('projection', String.raw`${nth(t.dir!)}\to ${slash(t.dirOf!)}`)] : []),
  ];
  const becomes = `the sum over ${unit}s becomes an integral over $${v}$`;
  // WHAT SHRINKING IS. The step named for it said only "Σᵢ → ∫, ΔQᵢ → dQ" and "then the sum becomes
  // an integral": the pieces never got thinner, Δy → dy was never written and N → ∞ never said, so
  // the integral read as a renaming rule rather than a limit, and dy arrived from nowhere. So the rule
  // opens on the limit. The semi-infinite line and the sheet are cut in an angle but integrated in x
  // and s: their own tail says what the piece's width becomes, so here they say N → ∞ alone.
  const ownCut = p.id !== 'semi' && p.id !== 'sheet';
  const thinner = `Make the ${unit}s thinner without end, $N\\to\\infty$: ${ownCut ? `each $\\Delta ${v}$ becomes $d${v}$, ` : ''}${unit}${NB}$i$’s position $${v}_i$ becomes the integral’s $${v}$, and ${becomes}.`;
  // An exact lesson's rule said "Nothing changes from piece to piece … So the sum becomes an integral
  // of a term that never changes": it never said the pieces got thinner, and its "So" credited the
  // integral to the term being constant. The sum becomes an integral because Δθ → dθ, as everywhere;
  // the constant term is why the factor comes outside, and why ∫dθ gives what ΣΔθᵢ gave -- which is why
  // the run says the answer does not move.
  const rule = constant
    ? `${thinner}${BREAK}Nothing in the term changes from piece to piece (every piece is ${p.geometry === 'arc' ? '$R$ from' : 'the same $r_i$ from'}${NB}$P$${scalar ? '' : ', at the same $\\alpha$'}), so it comes outside, and ${whole
      // "∫dθ = 2π counts the pieces" read as there being 2π of them. It adds up their angles.
      ? `the integral $${constant.adds}$ adds up the pieces’ angles, ${constant.span}, just as $\\sum_i\\Delta\\theta_i$ did: the answer is the sum’s, and $${constant.total}$.`
      : `the integral $\\int_{${lo}}^{${hi}}d\\theta=${count}$ adds up the bracketed pieces’ angles, just as $\\sum_i\\Delta\\theta_i$ did.`}`
    // WHY THE ≈ BECOMES =. Add ended "it is only ≈: each piece is still treated as a point charge", and
    // the next line had "=" with no word for why: a reader who never understood why we integrate read
    // the integral as a renaming that is somehow exact. The approximation Add named is what shrinking
    // removes -- that is the reason to integrate -- so the rule ends by saying so.
    : `${thinner} ${swaps.length
      ? `What changes from ${unit} to ${unit} is written in terms of $${v}_i$: ${listed}${t.tail ?? ''}.`
      : `Only $${nth(t.dir!)}$ changes from ${unit} to ${unit}, and it is already in terms of $${v}_i$${t.tail ?? ''}.`}${BREAK}The $\\approx$ becomes $=$ here: ${sharper}.`;
  return [
    // One factor, not two: both sides are the element, and lit -- every run's first stage, or the charge
    // slider pointed at -- two chips' rings used up the relation's space and pinched the "=" between them.
    {key: 'pieces', tex: fx('element', String.raw`\Delta Q=${t.piece}`), where: gloss(t.pieceIs ?? t.density ?? p.densityTex), say: t.holds},
    // A vector, so it carries its direction: the unit vector the next line turns into a cosine.
    {key: 'one', tex: scalar ? String.raw`\Delta V=${one}` : oneField, where: distance, say: toward},
    cancel,
    // The limits arrive here, with the sum they bound, so this is where they are explained.
    {key: 'add', tex: String.raw`${lhs}${constant ? '=' : String.raw`\approx`}${sign}\sum_i ${term}`, finish: summed, where: range, say: placed + sumIs},
    // What shrinking does to the algebra, said in symbols: the sum over pieces becomes the integral
    // and each piece's charge becomes the charge element -- the one step the figure cannot show.
    {key: 'limit', tex: String.raw`${lhs}=${sign}${integral}${substituted}`,
      where: String.raw`\textstyle\sum_i\to\int,\quad ${fx('element', String.raw`\Delta Q_i\to dQ=${t.dq}`)}`, swaps: turned.length ? turned : undefined, say: rule,
      finish: t.simplify ? simplified : undefined,
      merged: t.simplify ? gloss(merged) : undefined},
  ];
}
/** Results too long for one line of the panel, set over two -- broken where the expression
 * itself breaks, rather than left to scroll sideways inside a box. */
//
// The lessons' own E_y lines end in "< 0", true only for a positive charge; the panel says the sign
// follows the charge, and the charge slider runs negative, so the board's results do not claim it.
//
// The disk, the sheet and the disk's potential are built in k -- the board ends on 2πkσ -- and their
// answers are in ε₀. The line from one to the other was never written, so a different constant
// appeared from nowhere under "with k = 1/4πε₀", which then defined a k the answer did not contain.
// So each says it in k first, then in ε₀, as the infinite line's always has.
// THE ANSWER IN ONE RHYTHM, AND IN THE BOARD'S ORDER. A chained result's rows sat 5 px apart, so one
// equality read as a tower of fractions, while the endpoint's, the ramp's and the semi-infinite line's
// components were separate blocks 23 px apart. Every result of more than one row is now one aligned
// block, its "=" signs in a column, with one gap between rows. And the terms come in the order the
// board's last line has them -- y² + r² at y = L/2 is (L/2)² + r², s² + z² at s = R is R² + z², L + a − x
// at x = 0 is L + a -- so the reader sees that line become the answer by substitution.
//
// ONE GAP, SIZED TO THE ROW IT FOLLOWS. KaTeX's \\[g] does not add g: it makes the row at least
// g + .36em deep, and a row whose fraction has a radical in its denominator is already about an em
// deep. So the one \\[.45em] every result used added nothing on the bisector, the endpoint, the ramp
// and the disk -- the .3em of line spacing, 5 px, between rows -- and a little on the semi-infinite
// line's shallower ones, while the board's own chain above sat 18 px apart. Each break is now as deep
// as its row needs to leave about .7em between one row's ink and the next's; tests/panel-rhythm.test.ts
// measures that with KaTeX's own metrics. A row that only continues the one above -- the ramp's
// bracket, the disk's (z > 0) -- keeps the plain line spacing.
const rowGap = (em: number) => String.raw`\\[${em}em]`;
// BETWEEN TWO COMPONENTS, A WIDER GAP. The endpoint's and the ramp's answers set E_y's first row the same
// .7em under E_x's last as each chain's rows are under each other, so two equations read as one chain of
// four rows. A second component starts a new equation, and stands farther off: about 1.2em of white. (The
// semi-infinite line's rows are shallower, so its breaks are a little less deep for the same white.)
const COMPONENT_GAP = rowGap(1.5);
const SET_OVER_TWO_LINES: Partial<Record<ProblemId, string[]>> = {
  // The board is in λ to its last line, and the answer under it was in Q: where λ went and Q came
  // from was said only in Unfold's last step. So it is said in λ first, then with λL = Q, as the disk
  // goes from k to ε₀.
  bisector: [String.raw`\begin{aligned}E_x&=\frac{k\lambda L}{r\sqrt{(L/2)^2+r^2}}${rowGap(1.2)}&=\frac{kQ}{r\sqrt{(L/2)^2+r^2}}\end{aligned}`],
  // A \left…\right pair cannot span a line break, so the ramp's brackets are sized by hand -- as
  // tall as the fractions they hold, not the shorter \Big that left the closing one shrunken. Its second
  // row hangs under the bracket's first term: a phantom of everything before it takes exactly its width.
  // That row continues one expression, so it follows at the plain line spacing, not the gap.
  ramp: [String.raw`\begin{aligned}E_x&=\frac{k\lambda_0}{L}\left(1-\frac{r}{\sqrt{L^2+r^2}}\right)${COMPONENT_GAP}E_y&=-\frac{k\lambda_0}{L}\bigg[\ln\frac{L+\sqrt{L^2+r^2}}{r}\\&\phantom{{}=-\frac{k\lambda_0}{L}\bigg[}-\frac{L}{\sqrt{L^2+r^2}}\bigg]\end{aligned}`],
  // Both components in λ, as the board integrated, and then both in Q, as the bisector's is: the rod
  // holds Q as L changes, and in λ alone E_x grows with L where at fixed Q it falls. (E_x in Q above
  // E_y in λ asked whether they were two different charges, so each is said in both.)
  endpoint: [String.raw`\begin{aligned}E_x&=\frac{k\lambda L}{r\sqrt{L^2+r^2}}${rowGap(1)}&=\frac{kQ}{r\sqrt{L^2+r^2}}${COMPONENT_GAP}E_y&=-k\lambda\left(\frac1r-\frac1{\sqrt{L^2+r^2}}\right)${rowGap(1)}&=-\frac{kQ}{L}\left(\frac1r-\frac1{\sqrt{L^2+r^2}}\right)\end{aligned}`],
  // The magnitude on a row of its own: it is not a signed component, and the note under the
  // components says they are signed.
  semi: [String.raw`\begin{aligned}E_x&=\frac{k\lambda}{r}${rowGap(1.25)}E_y&=-\frac{k\lambda}{r}${rowGap(1.25)}|\mathbf E|&=\frac{\sqrt2\,k|\lambda|}{r}\end{aligned}`],
  // The disk's field holds only above it, as its potential does, and both say so as the sheet does,
  // "(z > 0)": on a row of their own, because on one line it ran out of the panel. The condition
  // hangs under the right-hand side, after the "=", not under the "=" itself -- close under it, as a
  // condition is, not a gap away as the next equality is. (After the first row it ran 6 to 20px past a
  // 240 to 272px board; every row of the chain is about as wide.)
  //
  // AND IN Q, AS THE DISK'S SLIDER HOLDS IT. The disk's slider is its total charge, the sampler builds
  // σ = Q/(πR²) from it, and the panel's note says a finite charge holds Q -- yet both answers were in σ
  // alone. Read with σ fixed they rise with R (29 times for E_z, 48 for V, as R goes from ½ to 4 with P
  // 3 up), while dragging R at fixed Q makes both fall: E_z from 0.109 to 0.050 kQ, V from 0.331 to
  // 0.250 kQ. The trend the card taught was the figure's backwards, the inversion the arc and the rod
  // were rid of below. So a third row puts σ = Q/(πR²) in: 2πkσ is 2kQ/R², one change from the first row.
  disk: [String.raw`\begin{aligned}E_z&=2\pi k\sigma\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)${rowGap(1)}&=\frac{\sigma}{2\varepsilon_0}\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)${rowGap(1)}&=\frac{2kQ}{R^2}\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)\\&\phantom{{}={}}(z>0)\end{aligned}`],
  sheet: [String.raw`E_z=2\pi k\sigma=\frac{\sigma}{2\varepsilon_0}\quad(z>0)`],
  'v-disk': [String.raw`\begin{aligned}V&=2\pi k\sigma\left(\sqrt{R^2+z^2}-z\right)${rowGap(.7)}&=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{R^2+z^2}-z\right)${rowGap(.88)}&=\frac{2kQ}{R^2}\left(\sqrt{R^2+z^2}-z\right)\\&\phantom{{}={}}(z>0)\end{aligned}`],
  // THE LESSONS THAT HOLD Q AS THE SLIDER MOVES, SAID IN Q TOO. The arc, the rod on its axis and the two
  // rod potentials keep their total charge fixed as φ or L changes -- their setups say so -- and their
  // answers were in λ alone. Read with λ a constant, the arc's peaks at a semicircle, where sin(φ/2) is
  // largest, and the axial rod's grows with L; dragging the slider shows both only falling, since at
  // fixed Q they are 2kQ sin(φ/2)/(R²φ) and kQ/(a(L+a)). The bisector got "λ, then Q" for this reason.
  arc: [String.raw`\begin{aligned}E_x&=-\frac{2k\lambda}{R}\sin\frac\varphi2${rowGap(.75)}&=-\frac{2kQ}{R^2\varphi}\sin\frac\varphi2\end{aligned}`],
  // One change per "=", as the rod's potential is set: the common denominator, then λL = Q. Both in one
  // step was the move Unfold's last step already writes in two. The new row's break is bare, and sized
  // as an inherited row's is (`spaced`).
  axial: [String.raw`\begin{aligned}E_x&=k\lambda\left(\frac1a-\frac1{L+a}\right)${rowGap(1)}&=\frac{k\lambda L}{a(L+a)}\\&=\frac{kQ}{a(L+a)}\end{aligned}`],
  'v-rod-bisector': [String.raw`\begin{aligned}V&=2k\lambda\ln\frac{L/2+\sqrt{(L/2)^2+r^2}}{r}${rowGap(.75)}&=\frac{2kQ}{L}\ln\frac{L/2+\sqrt{(L/2)^2+r^2}}{r}\end{aligned}`],
  // One change per "=": λ becomes Q/L and the logarithm keeps its argument. Its second row rewrote that
  // too, as 1 + L/a -- the far-away limit's form, which a reader had to check against (L + a)/a alone.
  'v-rod-axial': [String.raw`\begin{aligned}V&=k\lambda\ln\frac{L+a}{a}${rowGap(.75)}&=\frac{kQ}{L}\ln\frac{L+a}{a}\end{aligned}`],
};
/** What the integral comes to, the built component first. */
export function resultLines(p: Problem): string[] {
  return (SET_OVER_TWO_LINES[p.id] ?? [p.resultTex, ...(p.secondaryResultTex ? [p.secondaryResultTex] : [])]).map(spaced);
}
type WorkedStep = {text: string; tex: string};
/** The bisector's integral worked by the angle the board and the figure call α. It skipped the
 * identity that makes the substitution work (y² + r² = r² sec²α, so the denominator is r³ sec³α),
 * dropped kλ without a word and brought it back at the end, and never wrote ∫cos α dα = sin α or
 * where sin α comes from. Each of those is a line a student who does not yet integrate fluently
 * needs, so each is written. The lesson's own worked lines follow, from its evaluation at the ends.
 *
 * Written for any pair of ends, because the rod level with one end does the same integral from 0 to
 * L: its Unfold crammed these four steps into one sentence of plain text, and a student who had just
 * followed the bisector lost the thread one lesson over. Only the first line carries the ends. */
export function rodUnfold(lo: string, hi: string): WorkedStep[] {
  return [
    {text: String.raw`The factor $k\lambda$ is the same for every piece, so it comes outside the integral.`,
      tex: String.raw`E_x=k\lambda\int_{${lo}}^{${hi}}\frac{r\,dy}{(y^2+r^2)^{3/2}}`},
    // Three facts it used without a word -- what sec is (no rod's card defines it), that tan α has
    // derivative sec²α, and 1 + tan²α = sec²α -- and never said this α is the figure's α at P, the one
    // whose cos α the board has just written as r/√(y² + r²): a weak student read a new, unrelated angle.
    // Named by what it is, not by a stage of the run: these steps are printed on the handout too.
    {text: String.raw`Turn the changing distance into an angle: the figure’s own angle $\alpha$, at${NB}$P$ between the line to the piece and the${NB}$x$-axis. On that triangle $\tan\alpha=y/r$, so $y=r\tan\alpha$ with $r$ fixed. As $\alpha$ changes, $dy=r\sec^2\alpha\,d\alpha$, since the derivative of $\tan\alpha$ is $\sec^2\alpha$, where $\sec\alpha=1/{\cos\alpha}$. Dividing $\sin^2\alpha+\cos^2\alpha=1$ by $\cos^2\alpha$ gives $1+\tan^2\alpha=\sec^2\alpha$, so the denominator becomes a power of $\sec\alpha$.`,
      tex: String.raw`y^2+r^2=r^2(\tan^2\alpha+1)=r^2\sec^2\alpha`},
    // The three-halves power said, not left to the eye -- (r² sec²α)^{3/2} is r³ sec³α -- and dy/dα named by
    // what it is, not "the conversion factor", a name the page gives it nowhere else.
    {text: String.raw`On top, $dy$ brings $r\sec^2\alpha$, two powers of $\sec\alpha$; below, $(r^2\sec^2\alpha)^{3/2}=r^3\sec^3\alpha$. One $\sec\alpha$ is left in the denominator: that is $\cos\alpha$ on top.`,
      tex: String.raw`\begin{aligned}\int\frac{r\,dy}{(y^2+r^2)^{3/2}}&=\int\frac{r\cdot r\sec^2\alpha}{r^3\sec^3\alpha}\,d\alpha${rowGap(1)}&=\frac1r\int\cos\alpha\,d\alpha\end{aligned}`},
    {text: String.raw`Integrate: $\int\cos\alpha\,d\alpha=\sin\alpha$. Then return to the triangle, where $\sin\alpha=y/\sqrt{y^2+r^2}$.`,
      tex: String.raw`\frac1r\int\cos\alpha\,d\alpha=\frac{\sin\alpha}{r}=\frac{y}{r\sqrt{y^2+r^2}}`},
  ];
}
export const BISECTOR_UNFOLD = rodUnfold('-L/2', 'L/2');
/** The endpoint's E_x: the bisector's four steps between its own ends, then the evaluation the lesson's
 * own first step carried in its second row -- the step these four replace -- before the lesson's steps
 * go on from "the lower bound sits at y = 0". */
export const ENDPOINT_UNFOLD: WorkedStep[] = [...rodUnfold('0', 'L'),
  {text: 'Evaluate that between the ends.', tex: String.raw`E_x=k\lambda\left[\frac{y}{r\sqrt{y^2+r^2}}\right]_0^L`}];
/** The infinite line's integral from the board's own last line. Unfold opened on "Substitute
 * y = r tan α" applied to r dy/(r² + y²)^{3/2}, a y-integral the board never wrote -- it was in α from
 * its first line -- and folded the two steps a student needs, kλ/r coming out and ∫cos α dα = sin α,
 * into "the entire y-axis maps to −π/2 to +π/2". The lesson's own last step, the evaluation, follows. */
export const INFINITE_UNFOLD: WorkedStep[] = [
  {text: String.raw`The factor $k\lambda/r$ is the same for every piece, so it comes outside the integral.`,
    tex: String.raw`E_x=\frac{k\lambda}{r}\int_{-\pi/2}^{\pi/2}\cos\alpha\,d\alpha`},
  {text: String.raw`Integrate: $\int\cos\alpha\,d\alpha=\sin\alpha$.`,
    tex: String.raw`E_x=\frac{k\lambda}{r}\Big[\sin\alpha\Big]_{-\pi/2}^{\pi/2}`},
];
/** THE SEMI-INFINITE LINE, IN THE ANGLE IT WAS BUILT IN. One piece proves the lesson's claim in α --
 * the sec²α in ΔQ cancels the one in the distance, so every piece makes kλΔα/r -- and the infinite line,
 * its sibling, finishes on ∫cos α dα. This one's Unfold did one component by u = y² + r² and then put
 * y = r tan α back for the other: α to y to α, two methods for two components of one integral, and never
 * the one-line α integral One piece set up. So both components are done in α, and the lesson's own last
 * step, combining them, follows. (y dy/(y² + r²)^{3/2} = r tan α · r sec²α dα / r³ sec³α = sin α dα/r.)
 *
 * A bracket that opens on a minus is \Bigl[ or \left[, never \Big[: KaTeX sets \Big as an ordinary
 * symbol, so the minus after it was spaced as a subtraction, "[ − cos α ]". */
export const SEMI_UNFOLD: WorkedStep[] = [
  // In the physics, not the run's stage names: "as in Cut it up … One piece's dα/r" meant nothing on the
  // printed handout, where there is no run, and capitalised mid-sentence it read as a typo on the page.
  {text: String.raw`With $k\lambda$ outside, put $y=r\tan\alpha$, where $\alpha$ is the angle at${NB}$P$ from the perpendicular to the line: $dy=r\sec^2\alpha\,d\alpha$ and $y^2+r^2=r^2\sec^2\alpha$, so the integrand is $\cos\alpha\,d\alpha/r$, each piece’s field written by its angle. As $y$ runs from $0$ to $\infty$, $\alpha$ runs from $0$ to $\pi/2$.`,
    tex: String.raw`\begin{aligned}E_x&=k\lambda\int_0^\infty\frac{r\,dy}{(y^2+r^2)^{3/2}}${rowGap(1)}&=\frac{k\lambda}{r}\int_0^{\pi/2}\cos\alpha\,d\alpha\end{aligned}`},
  {text: String.raw`Integrate: $\int\cos\alpha\,d\alpha=\sin\alpha$. Upper end minus lower end: $\sin(\pi/2)-\sin0=1$.`,
    tex: String.raw`E_x=\frac{k\lambda}{r}\Big[\sin\alpha\Big]_0^{\pi/2}=\frac{k\lambda}{r}`},
  {text: String.raw`The other component, $E_y$, is the same with $\sin\alpha$ in place of $\cos\alpha$, and a minus: $\int\sin\alpha\,d\alpha=-\cos\alpha$, and upper end minus lower end is $-\cos(\pi/2)+\cos0=1$.`,
    tex: String.raw`\begin{aligned}E_y&=-\frac{k\lambda}{r}\int_0^{\pi/2}\sin\alpha\,d\alpha${rowGap(.95)}&=-\frac{k\lambda}{r}\Bigl[-\cos\alpha\Bigr]_0^{\pi/2}=-\frac{k\lambda}{r}\end{aligned}`},
];
/** THE DISK, WITH THE STEPS A WEAK-CALCULUS READER CANNOT SUPPLY. Its Unfold said "2πkσz comes
 * outside the integral" over an indefinite ∫ s ds/(s² + z²)^{3/2} with neither, wrote
 * ½∫u^{-3/2}du = −1/√(s² + z²) with the power rule in between left out, and jumped to the evaluated
 * answer without the bracket it evaluates. Each is a line here; the lesson's own steps follow, from
 * √(z²) = |z|. */
export const DISK_UNFOLD: WorkedStep[] = [
  {text: String.raw`The factor $2\pi k\sigma z$ is the same for every ring: the height $z$ is fixed while $s$ runs over the rings. So it comes outside the integral.`,
    tex: String.raw`E_z=2\pi k\sigma z\int_0^R\frac{s\,ds}{(s^2+z^2)^{3/2}}`},
  {text: String.raw`Let $u=s^2+z^2$. With $z$ fixed, $du=2s\,ds$, so $s\,ds$ is $du/2$, and $1/u^{3/2}$ is $u^{-3/2}$.`,
    tex: String.raw`\int\frac{s\,ds}{(s^2+z^2)^{3/2}}=\frac12\int u^{-3/2}\,du`},
  {text: 'Raise the power by one and divide by the new power.',
    tex: String.raw`\begin{aligned}\frac12\int u^{-3/2}\,du&=\frac12\cdot\frac{u^{-1/2}}{-1/2}${rowGap(1)}&=-\frac1{\sqrt{s^2+z^2}}\end{aligned}`},
  {text: 'Upper end minus lower end.',
    tex: String.raw`\begin{aligned}E_z&=2\pi k\sigma z\left[-\frac1{\sqrt{s^2+z^2}}\right]_0^R${rowGap(1)}&=2\pi k\sigma z\left(\frac1{\sqrt{z^2}}-\frac1{\sqrt{R^2+z^2}}\right)\end{aligned}`},
];
/** The arc's integral from its board's last line. Its Unfold opened already integrated, −(kλ/R)[sin θ],
 * under "Integrate the angular projection", and finished on "Sine is odd" -- the two steps a reader
 * needs, kλ/R coming out and sin(−φ/2) = −sin(φ/2), named rather than written. */
export const ARC_UNFOLD: WorkedStep[] = [
  {text: String.raw`The factor $k\lambda/R$ is the same for every piece, so it comes outside the integral.`,
    tex: String.raw`E_x=-\frac{k\lambda}{R}\int_{-\varphi/2}^{\varphi/2}\cos\theta\,d\theta`},
  {text: String.raw`Integrate: $\int\cos\theta\,d\theta=\sin\theta$.`,
    tex: String.raw`E_x=-\frac{k\lambda}{R}\Big[\sin\theta\Big]_{-\varphi/2}^{\varphi/2}`},
  {text: String.raw`Upper end minus lower end: $\sin(-\varphi/2)=-\sin(\varphi/2)$, so the two ends add.`,
    tex: String.raw`\begin{aligned}E_x&=-\frac{k\lambda}{R}\left(\sin\frac\varphi2+\sin\frac\varphi2\right)${rowGap(.75)}&=-\frac{2k\lambda}{R}\sin\frac\varphi2\end{aligned}`},
];
/** The rod on its axis. "An antiderivative is positive: 1/(L + a − x)" hid du = −dx, the ends turning
 * round and ∫u^{-2}du = −u^{-1}: the minus signs a reader loses. Each is written.
 *
 * And it ends on the answer itself. The lesson's last step used to follow, opening "Upper minus lower"
 * on the very row the third step had just ended on, "Then upper end minus lower end": two identical lines
 * in a row, which a student reads as something missed. The fourth step does what that one added. */
export const AXIAL_UNFOLD: WorkedStep[] = [
  {text: String.raw`The factor $k\lambda$ is the same for every piece, so it comes outside the integral.`,
    tex: String.raw`E_x=k\lambda\int_0^L\frac{dx}{(L+a-x)^2}`},
  {text: String.raw`Let $u=L+a-x$, the piece’s distance from${NB}$P$. Then $du=-dx$, and as $x$ runs from $0$ to $L$, $u$ runs from $L+a$ down to $a$: the minus turns the ends round.`,
    tex: String.raw`E_x=k\lambda\int_{L+a}^{a}\frac{-du}{u^2}=k\lambda\int_a^{L+a}\frac{du}{u^2}`},
  {text: String.raw`Raise the power by one and divide by the new power: $\int u^{-2}\,du=-u^{-1}$. Then upper end minus lower end.`,
    tex: String.raw`\begin{aligned}E_x&=k\lambda\left[-\frac1u\right]_a^{L+a}${rowGap(1.05)}&=k\lambda\left(\frac1a-\frac1{L+a}\right)\end{aligned}`},
  {text: String.raw`Over a common denominator, $1/a-1/(L+a)=L/\bigl(a(L+a)\bigr)$, and $\lambda L=Q$. The nearer parts contribute more strongly; the result points away from a positive rod.`,
    tex: String.raw`E_x=\frac{k\lambda L}{a(L+a)}=\frac{kQ}{a(L+a)}`},
];
/** THE SHEET IN THE ANGLE IT WAS CUT BY. Its Unfold opened "Reuse the disk's antiderivative" on an
 * integral already evaluated -- another lesson's work, its constant never taken out, its substitution
 * not done, its power rule not said -- and finished on |z|, sgn z and z < 0 on a page whose model is
 * z > 0 throughout. Yet Add had already said each term is 2πkσ sin α_i Δα: in the lesson's own angle the
 * integral is one line, as the semi-infinite line's is. (z s ds / (s² + z²)^{3/2} with s = z tan α is
 * z · z tan α · z sec²α dα / z³ sec³α = sin α dα.) Gauss's pillbox, which the lesson's last step named,
 * is kept: it is the check a lecturer wants beside this. */
export const SHEET_UNFOLD: WorkedStep[] = [
  {text: String.raw`The factor $2\pi k\sigma$ is the same for every ring, so it comes outside the integral. Then name each ring by its angle $\alpha$ at $P$, between the axis and the line to the ring, so that $s=z\tan\alpha$: $ds=z\sec^2\alpha\,d\alpha$ and $s^2+z^2=z^2\sec^2\alpha$, so the integrand is $\sin\alpha\,d\alpha$. As $s$ runs from $0$ to $\infty$, $\alpha$ runs from $0$ to a right angle, $\pi/2$.`,
    tex: String.raw`\begin{aligned}E_z&=2\pi k\sigma\int_0^\infty\frac{zs\,ds}{(s^2+z^2)^{3/2}}${rowGap(1)}&=2\pi k\sigma\int_0^{\pi/2}\sin\alpha\,d\alpha\end{aligned}`},
  {text: String.raw`Integrate: $\int\sin\alpha\,d\alpha=-\cos\alpha$. Upper end minus lower end: $-\cos(\pi/2)+\cos0=1$.`,
    tex: String.raw`E_z=2\pi k\sigma\Bigl[-\cos\alpha\Bigr]_0^{\pi/2}=2\pi k\sigma`},
  {text: String.raw`With $k=1/(4\pi\varepsilon_0)$, $2\pi k\sigma=\sigma/(2\varepsilon_0)$: the same at every height above the sheet. Gauss’s law gives it too, from a pillbox through the sheet: $2EA=\sigma A/\varepsilon_0$.`,
    tex: String.raw`E_z=\frac{\sigma}{2\varepsilon_0}\quad(z>0)`},
];
// A ROOT IN THE DENOMINATOR IS A NEGATIVE POWER. Each "Let u = …" went from ∫ y dy/(y² + r²)^{3/2} to
// ½∫u^{−3/2}du without a word for the move a weak-calculus student cannot make: 1/u^{3/2} is u^{−3/2}.
// The rod level with one end does the same integral for its E_y, and its lesson's step wrote
// ½∫u^{−3/2}du = −u^{−1/2} with the power rule's middle row left out; it gets these two steps too.
const U_ROD: WorkedStep[] = [
  {text: String.raw`Let $u=y^2+r^2$. With $r$ fixed, $du=2y\,dy$, so $y\,dy$ is $du/2$, and $1/u^{3/2}$ is $u^{-3/2}$.`,
    tex: String.raw`\int\frac{y\,dy}{(y^2+r^2)^{3/2}}=\frac12\int u^{-3/2}\,du`},
  {text: 'Raise the power by one and divide by the new power.',
    tex: String.raw`\begin{aligned}\frac12\int u^{-3/2}\,du&=\frac12\cdot\frac{u^{-1/2}}{-1/2}${rowGap(1)}&=-\frac1{\sqrt{y^2+r^2}}\end{aligned}`},
];
/** The ramp's E_x, which is the disk's integral in other letters: its Unfold said "let u = y² + r²" and
 * jumped to the bracket, where the disk's two lessons over writes ½∫u^{-3/2}du and the power rule. The
 * same four steps here, ending on the bracket the lesson's own next step evaluates. */
export const RAMP_UNFOLD: WorkedStep[] = [
  {text: String.raw`The factor $k\lambda_0 r/L$ is the same for every piece: $r$ and $L$ are fixed while $y$ runs along the rod. So it comes outside the integral.`,
    tex: String.raw`E_x=\frac{k\lambda_0 r}{L}\int_0^L\frac{y\,dy}{(y^2+r^2)^{3/2}}`},
  ...U_ROD,
  {text: 'Evaluate it between the ends of the rod.',
    tex: String.raw`E_x=\frac{k\lambda_0 r}{L}\left[-\frac1{\sqrt{y^2+r^2}}\right]_0^L`},
];
/** THE RAMP'S ONE HARD INTEGRAL, IN THREE STEPS. Its E_y was one nine-line paragraph making five moves: it
 * said "put y = r tan α, as for a uniform rod's E_x", when this card's E_x was done with u = y² + r²; it
 * never showed r² tan²α · r sec²α / r³ sec³α = tan²α cos α; and its rows jumped from ∫(sec α − cos α)dα
 * to ln(sec α + tan α) − sin α without ∫sec α dα = ln(sec α + tan α), the one antiderivative a first-year
 * student does not know. Each move is a step here; the lesson's own evaluation follows. Its breaks are
 * bare, and sized as an inherited row's are (`spaced`), when the list is built. */
export const RAMP_EY_UNFOLD: WorkedStep[] = [
  {text: String.raw`The integrand of $E_y$, the part along the rod, carries $y^2$: one $y$ from the projection and one from the density. Put $y=r\tan\alpha$, with $\alpha$ the angle at${NB}$P$ between the line to the piece and the${NB}$x$-axis, so $\tan\alpha=y/r$. Then $dy=r\sec^2\alpha\,d\alpha$, since the derivative of $\tan\alpha$ is $\sec^2\alpha$, where $\sec\alpha=1/{\cos\alpha}$; and $y^2+r^2=r^2(\tan^2\alpha+1)=r^2\sec^2\alpha$, so $(y^2+r^2)^{3/2}=r^3\sec^3\alpha$. Last, $\tan^2\alpha=\sec^2\alpha-1$.`,
    tex: String.raw`\begin{aligned}&\int\frac{y^2\,dy}{(y^2+r^2)^{3/2}}\\&\quad=\int\frac{r^2\tan^2\alpha\cdot r\sec^2\alpha}{r^3\sec^3\alpha}\,d\alpha\\&\quad=\int\tan^2\alpha\cos\alpha\,d\alpha\\&\quad=\int(\sec\alpha-\cos\alpha)\,d\alpha\end{aligned}`},
  {text: String.raw`Integrate. One standard result is needed, $\int\sec\alpha\,d\alpha=\ln(\sec\alpha+\tan\alpha)$: differentiate the right side to check it. And $\int\cos\alpha\,d\alpha=\sin\alpha$.`,
    tex: String.raw`\begin{aligned}&\int(\sec\alpha-\cos\alpha)\,d\alpha\\&\quad=\ln(\sec\alpha+\tan\alpha)-\sin\alpha\end{aligned}`},
  {text: String.raw`Return to the triangle: $\sec\alpha=\sqrt{y^2+r^2}/r$ and $\tan\alpha=y/r$, so $\sec\alpha+\tan\alpha=\bigl(y+\sqrt{y^2+r^2}\bigr)/r$; and $\sin\alpha=y/\sqrt{y^2+r^2}$.`,
    tex: String.raw`\begin{aligned}&\ln(\sec\alpha+\tan\alpha)-\sin\alpha\\&\quad=\ln\frac{y+\sqrt{y^2+r^2}}{r}-\frac{y}{\sqrt{y^2+r^2}}\end{aligned}`},
];
/** THE DISK'S POTENTIAL, ITS POWER RULE WRITTEN. Its lesson now takes 2πkσ out and writes the bracket,
 * but its middle step still says "the integral is ∫du/(2√u) = √u" in one breath, where the disk's field
 * two lessons over writes ½∫u^{-3/2}du and the power raised. That step, in two, as there. (The rod level
 * with one end and the rod's potential on its axis now carry in their own lessons the constant coming
 * out, the substitution, the power rule or the logarithm, and the bracket; the panel inherits them
 * rather than writing them a second time.) */
export const V_DISK_POWER: WorkedStep[] = [
  {text: String.raw`Let $u=s^2+z^2$. With $z$ fixed, $du=2s\,ds$, so $s\,ds$ is $du/2$, and $1/\sqrt u$ is $u^{-1/2}$.`,
    tex: String.raw`\int\frac{s\,ds}{\sqrt{s^2+z^2}}=\frac12\int u^{-1/2}\,du`},
  {text: 'Raise the power by one and divide by the new power.',
    tex: String.raw`\begin{aligned}\frac12\int u^{-1/2}\,du&=\frac12\cdot\frac{u^{1/2}}{1/2}${rowGap(1)}&=\sqrt{s^2+z^2}\end{aligned}`},
];
/** The rod's potential on its bisector, whose kλ arrived in the lesson's second row unannounced. */
export const V_ROD_BISECTOR_UNFOLD: WorkedStep[] = [
  {text: String.raw`The factor $k\lambda$ is the same for every piece, so it comes outside the integral.`,
    tex: String.raw`V=k\lambda\int_{-L/2}^{L/2}\frac{dy}{\sqrt{y^2+r^2}}`},
];
// "EVERY STEP ACCOUNTED FOR", AND EVERY ROW OF THE ANSWER. The disk's answer and its potential's end on a
// row in Q -- the charge the slider holds -- and their Unfold stopped at σ/(2ε₀), short of it: the card
// claimed completeness and never derived its own last equality. One step more, in the lesson's terms.
export const DISK_Q: WorkedStep = {text: String.raw`The disk holds $Q$ spread over its area $\pi R^2$, so $\sigma=Q/(\pi R^2)$ and $2\pi k\sigma=2kQ/R^2$.`,
  tex: String.raw`E_z=\frac{2kQ}{R^2}\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)`};
export const V_DISK_Q: WorkedStep = {text: DISK_Q.text, tex: String.raw`V=\frac{2kQ}{R^2}\left(\sqrt{R^2+z^2}-z\right)`};
/** WHY DIFFERENTIATE. Under "Differentiate back" the first step talked of symmetry and differentiated;
 * that the field is minus the derivative arrived only in the second. A student does not know why they
 * are differentiating a potential, so the reason comes first, in the lesson's own variable. */
export function backLead(p: Problem): string | undefined {
  return p.id === 'v-ring' || p.id === 'v-disk' ? String.raw`The field along the axis is minus the rate $V$ changes along it, $E_z=-dV/dz$, so differentiating $V$ gives the field back.`
    : p.id === 'v-rod-bisector' ? String.raw`The field along the bisector is minus the rate $V$ changes as $P$ moves out along it, $E_x=-dV/dr$, so differentiating $V$ gives the field back.`
    : p.id === 'v-rod-axial' ? String.raw`The field along the rod’s line is minus the rate $V$ changes as $P$ moves out along it, $E_x=-dV/da$, so differentiating $V$ gives the field back.`
    : undefined;
}
// ROWS INHERITED FROM A LESSON'S OWN STEPS, IN THE PANEL'S RHYTHM. The answer's rows and the panel's
// own worked rows are each set about .7em apart (see `rowGap`); the lesson steps an Unfold goes on into
// kept bare \\ breaks, 2 to 5 px apart, so one equality read as a stack of fractions beside steps with
// proper gaps -- nine times on the rod's potential. Each bare break before a row that opens a new
// equality is sized as `rowGap` sizes the panel's: KaTeX makes a row at least g + .36em deep and adds a
// .3em jot, and lifts a short row to .84em, so g = depth + .04 − (.84 − height) leaves .7em of white. A
// row that continues the one above (&\quad+, &\quad−, &\quad\times, &\phantom) keeps the line spacing.
type Laid = {height: number; depth: number};
const layout = (katex as unknown as {__renderToHTMLTree?: (tex: string, o: object) => Laid}).__renderToHTMLTree;
const measure = (row: string): Laid | undefined => {
  try { return layout?.(row.replace(/&/g, ''), {displayMode: true, throwOnError: true, strict: 'ignore'}); } catch { return undefined; }
};
export function spaced(tex: string): string {
  const m = tex.match(/^\\begin\{aligned\}([\s\S]*)\\end\{aligned\}$/);
  if (!m) return tex;
  const parts = m[1].split(/(\\\\(?:\[[^\]]*\])?)/);
  for (let i = 1; i < parts.length; i += 2) {
    if (parts[i] !== '\\\\' || !/^[^&]*&(?:\\quad)?=/.test(parts[i + 1])) continue;
    const above = measure(parts[i - 1]), below = measure(parts[i + 1]);
    const g = above && below ? above.depth + .04 - Math.max(0, .84 - below.height) : 1;
    if (g > 0) parts[i] = rowGap(Math.round(g * 100) / 100);
  }
  return String.raw`\begin{aligned}${parts.join('')}\end{aligned}`;
}
// AND IN THE ANSWER'S ORDER. The answers were put in the board's order -- (L/2)² + r², L² + r², R² + z²,
// sin with its φ/2 stacked -- and only the disk's Unfold was brought into line, so on the bisector, the
// rod level with an end, the disk's potential and the arc the same answer stood twice on one card in two
// orders. One rule, for every inherited row.
const ORDER: [RegExp, string][] = [
  [/r\^2\+\(L\/2\)\^2/g, '(L/2)^2+r^2'], [/r\^2\+L\^2/g, 'L^2+r^2'], [/z\^2\+R\^2/g, 'R^2+z^2'],
  [/\\sin\(\\varphi\/2\)/g, String.raw`\sin\frac\varphi2`],
];
const ordered = (tex: string) => ORDER.reduce((t, [from, to]) => t.replace(from, to), tex);
const inherit = (steps: WorkedStep[]) => steps.map(s => ({text: s.text, tex: spaced(ordered(s.tex))}));
/** THE UNFOLD, BUILT ONCE. The panel assembled its list itself and the handout repeated the assembly,
 * which fell behind on four lessons: the copy a lecturer printed no longer matched the page. This is the
 * one list, for both: the panel's own steps from each board's last line, then the lesson's own steps from
 * where those end, in the panel's rhythm and the answer's order; and, for a potential, the differentiation
 * back to the field. `algebra` is the route the panel derives on -- the infinite line's finite-rod limit,
 * when that is the route chosen. */
export function workedSteps(p: Problem, algebra: Problem = p): {worked: WorkedStep[]; back: WorkedStep[]} {
  const original = algebra.steps.find(s => s.kind === 'integrate')?.worked ?? [];
  const g = p.geometry, id = p.id;
  // The disk's potential: its one-breath antiderivative becomes the substitution and the power rule.
  const power = original.findIndex(s => s.tex === String.raw`\int\frac{s\,ds}{\sqrt{s^2+z^2}}=\sqrt{s^2+z^2}`);
  // The ramp's E_y ends on two terms and never folds them back into the bracket its answer is set in:
  // one row more, as the answer sets it, its bracket's second half hung under the first.
  const fold = String.raw`\\&=-\frac{k\lambda_0}{L}\bigg[\ln\frac{L+\sqrt{L^2+r^2}}{r}\\&\phantom{{}=-\frac{k\lambda_0}{L}\bigg[}-\frac{L}{\sqrt{L^2+r^2}}\bigg]`;
  const folded = (s: WorkedStep) => s.tex.startsWith(String.raw`\begin{aligned}E_y&=-\frac{k\lambda_0}{L}\ln`) ? {...s, tex: s.tex.replace(/\\end\{aligned\}$/, `${fold}\\end{aligned}`)} : s;
  // The ramp's E_y: the lesson's one paragraph becomes three steps (`RAMP_EY_UNFOLD`).
  const ramped = original.findIndex(s => s.tex.includes(String.raw`\int\frac{y^2\,dy}{(y^2+r^2)^{3/2}}`) && s.tex.includes(String.raw`\ln(\sec\alpha+\tan\alpha)`));
  // The endpoint's E_y: its lesson's substitution, in one step with the power rule's middle row left out,
  // becomes the ramp's two; and its evaluation goes on into Q, as its answer does.
  const substituted = original.findIndex(s => s.tex.includes(String.raw`\frac12\int u^{-3/2}\,du`) && s.tex.includes('=-u^{-1/2}'));
  const inQ = (s: WorkedStep) => s.tex.startsWith(String.raw`\begin{aligned}E_y&=-k\lambda\int_0^L`)
    ? {text: `${s.text} With $\\lambda=Q/L$, the last row writes it in $Q$.`, tex: s.tex.replace(/\\end\{aligned\}$/, String.raw`\\&=-\frac{kQ}{L}\left(\frac1r-\frac1{\sqrt{L^2+r^2}}\right)\end{aligned}`)} : s;
  const endpointEy = substituted < 0 ? inherit(original.slice(1).map(inQ))
    : [...inherit(original.slice(1, substituted)), {...U_ROD[0], text: String.raw`Nothing cancels $E_y$, the part along the rod, so its integral has to be done. ${U_ROD[0].text}`}, U_ROD[1], ...inherit(original.slice(substituted + 1).map(inQ))];
  const worked = id === 'v-disk' && power >= 0 ? [...inherit(original.slice(0, power)), ...V_DISK_POWER, ...inherit(original.slice(power + 1)), V_DISK_Q]
    : id === 'v-rod-bisector' ? [...V_ROD_BISECTOR_UNFOLD, ...inherit(original)]
    : p.quantity === 'V' ? inherit(original)
    : g === 'bisector' ? [...BISECTOR_UNFOLD, ...inherit(original.slice(1))]
    : g === 'endpoint' ? [...ENDPOINT_UNFOLD, ...endpointEy]
    // The finite-rod route keeps the lesson's own steps: they are written in y, and so is it.
    : algebra.id === 'infinite' && algebra.variable !== 'y'
      // Its last row stacked, as the answer above it is: "2kλ/r = λ/(2πε₀r)" was the one inline fraction.
      ? [...INFINITE_UNFOLD, ...inherit(original.slice(2)).map(s => ({...s, tex: s.tex.replace(String.raw`E_x=2k\lambda/r=\lambda/(2\pi\varepsilon_0r)`, String.raw`E_x=\frac{2k\lambda}{r}=\frac{\lambda}{2\pi\varepsilon_0r}`)}))]
    : g === 'semi' ? [...SEMI_UNFOLD, ...inherit(original.slice(-1))]
    : g === 'disk' ? [...DISK_UNFOLD, ...inherit(original.slice(1)), DISK_Q]
    : g === 'sheet' ? SHEET_UNFOLD
    : g === 'arc' ? [...ARC_UNFOLD, ...inherit(original.slice(2))]
    : g === 'axial' ? AXIAL_UNFOLD
    : g === 'ramp' ? ramped < 0 ? [...RAMP_UNFOLD, ...inherit(original.slice(1).map(folded))]
      : [...RAMP_UNFOLD, ...inherit(original.slice(1, ramped)), ...inherit(RAMP_EY_UNFOLD), ...inherit(original.slice(ramped + 1).map(folded))]
    : inherit(original);
  return {worked, back: inherit(algebra.steps.find(s => s.kind === 'gradient')?.worked ?? [])};
}
