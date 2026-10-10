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
  /** The other component, where nothing cancels it, built from the line's own factors. */
  also?: (dQ: string, ri2: string) => string;
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
  /** The factors as expressions, for checking the algebra above. `dq` is the charge per unit of
   * the integration variable; `dir` is the signed factor that picks out the component. */
  check: {dq: string; r: string; dir: string};
};
/** Holds a word and the symbol after it on one line, so a remark never ends on a lone "P." */
const NB = ' ';
/** An em dash that never starts a line. Set with ordinary spaces either side, the browser broke
 * before it as readily as after, and a line began "— λ(y), r_i and cos α_i —"; a book never starts a
 * line with a dash. The space before it does not break, so the dash ends the line it is on. */
const DASH = `${NB}— `;
/** A point charge's field, said once where the board first uses it: what the formula is, what k is
 * -- which used to be defined only under the answer, after every line had used it -- and which way
 * it points. r̂ᵢ had a sentence of its own after the triangle's; it is the formula's direction, so it
 * is said with the formula, and the remark is a sentence shorter. */
const COULOMB = String.raw`A point charge’s field, from Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, pointing along $\hat{\mathbf r}_i$, the unit vector from the piece toward${NB}$P$.`;
// What the density means and how big a piece is: the two facts that turn "ΔQ =" into the line's
// right-hand side, which every lesson's own hint says and the board used to leave unsaid.
const PER_LENGTH = (d: string) => String.raw`$\lambda$ is the charge per unit length, so a piece $\Delta ${d}$ long holds $\lambda\,\Delta ${d}$.`;
// θ and φ were on the ring's and the arc's first line, ΔQ = λRΔθ with λ = Q/(Rφ), and θ was said two
// steps later, in What cancels -- on the potentials, which have no angle paragraph, never; φ was named
// only by the slider. So the first line says what each is.
const RADIANS = String.raw`$\lambda$ is the charge per unit length, and a piece $\Delta\theta$ wide is $R\,\Delta\theta$ long (angles in radians).`;
const ROUND_RING = String.raw`$\theta$ is a piece’s angle round the ring. ${RADIANS}`;
const ROUND_ARC = String.raw`$\theta$ is a piece’s angle round the arc from the${NB}$x$-axis, its line of symmetry, and $\varphi$ is the whole arc’s angle. ${RADIANS}`;
// Where r_i comes from. r_i = √(y² + r²) arrived with no triangle: y along the rod, r out to P,
// Pythagoras -- the one move a student has to make alone on the next problem, made silently.
const HYPOTENUSE = (along: string, out: string, from: string) =>
  String.raw`The piece is $${along}$ along the ${from} and $P$ is $${out}$ out from $${along}=0$: $r_i$ is the hypotenuse.`;
const ROD_Y = {dq: String.raw`\lambda\,dy`, piece: String.raw`\lambda\,\Delta y`, r: String.raw`\sqrt{y^2+r^2}`, r2: String.raw`y^2+r^2`, holds: PER_LENGTH('y'),
  at: HYPOTENUSE('y', 'r', 'rod')};
// "At x = L + a" never said what a is: P's distance past the rod's end.
const ROD_X = {dq: String.raw`\lambda\,dx`, piece: String.raw`\lambda\,\Delta x`, r: String.raw`L+a-x`, r2: String.raw`(L+a-x)^2`, holds: PER_LENGTH('x'),
  density: String.raw`\lambda=\frac{Q}{L}`, at: String.raw`$P$ is on the rod’s own line, a distance $a$ past its end at $x=L$, so at $x=L+a$; a piece at $x$ is $L+a-x$ from${NB}it.`};
const RING = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: String.raw`\sqrt{R^2+z^2}`, r2: String.raw`R^2+z^2`, holds: ROUND_RING,
  at: String.raw`Every piece is $R$ out from the axis and $P$ is $z$ up it: $r_i$ is the hypotenuse.`};
const DISK = {dq: String.raw`\sigma\,2\pi s\,ds`, piece: String.raw`\sigma\,2\pi s\,\Delta s`, r: String.raw`\sqrt{s^2+z^2}`, r2: String.raw`s^2+z^2`,
  holds: String.raw`$\sigma$ is the charge per unit area, and a thin ring’s area is circumference × width, $2\pi s\,\Delta s$.`,
  at: String.raw`The ring is $s$ out from the axis and $P$ is $z$ up it: $r_i$ is the hypotenuse.`,
  charge: String.raw`\Delta Q_i=\sigma\,2\pi s\,\Delta s`};
const ARC = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: 'R', r2: 'R^2', holds: ROUND_ARC,
  at: String.raw`$P$ is the arc’s centre, so every piece is $R$ away.`};
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
const ARROW = String.raw`The arrow $\Delta\mathbf E$, of size $\Delta E$,`;
const ANGLE_ROD = String.raw`$\alpha$ is the angle at${NB}$P$ between $r_i$ and the${NB}$x$-axis. ${ARROW} lies along $r_i$, so it makes the same angle with the axis: its part along $x$ is $\Delta E\cos\alpha$, the side next to${NB}$\alpha$.`;
// The partner's part, named as the figure names it, said under the cancellation that uses it: the
// cancellation opens its step, and ΔE_y in it used to be named only at the paragraph's end.
const MIRROR = (angle: string) => String.raw` Its mirror piece, at $-${angle}$, makes the same $\Delta E_x$.`;
const PAIR = (along: string) => String.raw`A piece’s part ${along}, $\Delta E_y$, and its mirror piece’s, $-\Delta E_y$.`;
const COS_ROD = {dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{r}{\sqrt{y^2+r^2}}`, dirIs: ANGLE_ROD};
// Level with one end, nothing cancels the part along the rod: it survives, pointing back past the
// end for a positive charge -- the second component every result for these lessons prints. Its sine
// is the other side of the same triangle, so the angle's sentence says that too, and why it is
// negative -- pointing at the line with the minus in it, which is drawn after the sentence: the line
// above it has no minus, and "hence the minus" sent a reader looking there.
const ALONG_ROD = (dQ: string, ri2: string) => String.raw`\Delta E_y=-\frac{k\,${dQ}}{${ri2}}${fx('projection', String.raw`\sin\alpha`)}`;
const ANGLE_ROD_END = ANGLE_ROD.replace(/\.$/, String.raw`; its part along the rod, $\Delta E\sin\alpha$, is the side opposite. For positive charge that part points down, away from the rod: hence the minus in $\Delta E_y$ below.`);
// The rods level with one end and the ramp: every piece is above P's line. "On the same side of P"
// meant nothing -- P is a point -- and what is missing is a partner BELOW that line. The last sentence
// is the one thing the run's note added; the note is gone, so the board says it.
const ABOVE = String.raw`Nothing cancels: every piece lies above the${NB}$x$-axis, so no piece has a mirror partner below it, and both parts of each survive. Cancellation needs a symmetry this geometry lacks.`;
const COS_AXIS = (s: string) => ({dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{z}{\sqrt{${s}^2+z^2}}`});
// A ring's piece and the piece half a turn round from it. ⊥ and θ+π were on the board with no word
// for either; the partner's part is −ΔE⊥, as the figure labels it. "Piece", as every other ring line
// says: "bit" is a part of one piece on the disk and the sheet, the next two lessons.
const ANGLE_RING = String.raw`$\alpha$ is the angle at${NB}$P$ between $r_i$ and the axis. ${ARROW} lies along $r_i$, so its part along the axis is $\Delta E\cos\alpha$.`;
const PAIR_RING = String.raw`A piece’s part across the axis is $\Delta\mathbf E_\perp$; the piece half a turn round, at $\theta+\pi$, makes $-\Delta\mathbf E_\perp$.`;
// A disk's or a sheet's rings, each of which cancels all the way round. What the board skipped was
// the step between the ring as a sum of bits and the ring as one charge: every bit of a thin ring is
// the same r_i away at the same α, so the bits' parts along the axis add up to the ring's charge,
// ΔQ = Σδq, times one factor. The caption says each ring has already cancelled; this says how.
const BITS = String.raw`Each bit’s field, of size $\delta E$, lies along its own $r_i$, so its part along the axis is $\delta E\cos\alpha$.`;
const ACROSS_RING = String.raw`Each bit’s part across the axis, $\delta\mathbf E_\perp$, is undone by the bit straight across the ring.`;
const ADDS = (whose: string) => String.raw`Every bit of the thin ring is the same $r_i$ away at the same $\alpha$, so the parts along the axis add to $k\,\Delta Q\cos\alpha/r_i^2$, where $\Delta Q=\sum\delta q$ is the ${whose} charge.`;
const ANGLE_RINGS = String.raw`$\alpha$ is the angle at${NB}$P$ between $r_i$ and the axis. ${BITS} ${ADDS('whole ring’s')}`;
// The sheet's sum is over the thin ring that stands in for each wide one -- see `SHEET` -- so of it
// the sum is exact. Over the wide ring's own bits, all put at r_i, it was 27% too big on the fourth
// ring at five pieces and infinite on the fifth: the divergence the first line had been rid of.
const ANGLE_SHEET = String.raw`${BITS} ${ADDS('thin ring’s')}`;
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
const STAND_IN = (what: string, as = 'a point charge') => String.raw`$\Delta Q$ stands for ${as} at the ${what}’s middle angle, whose field at${NB}$P$ is nearly the ${what}’s, even for the outermost ${what}, which never ends.`;
const BRIDGE = (angle: string, sits: string, along: string, rate: string) =>
  String.raw`$${angle}$ is the piece’s angle at${NB}$P$, from the perpendicular to the line, so the piece sits at $${sits}$, and $${rate}$ is how fast $${along}$ grows with $${angle}$: for the pieces near${NB}$P$, $${rate}\,\Delta${angle}$ is nearly the length $\Delta ${along}$ bracketed on the figure.`;
const SHEET = {...DISK, piece: String.raw`\sigma\,2\pi s\,z\sec^2\alpha\,\Delta\alpha`, pieceIs: String.raw`s=z\tan\alpha`, charge: undefined,
  holds: String.raw`$\alpha$ is the angle at${NB}$P$ between the axis and the line to the ring, so the ring sits at $s=z\tan\alpha$, and $z\sec^2\alpha$ is how fast $s$ grows with $\alpha$: for the rings near the axis, $z\sec^2\alpha\,\Delta\alpha$ is nearly the width $\Delta s$ bracketed on the figure. $\sigma$ is the charge per unit area, and a thin ring’s area is $2\pi s$ times its width. ${STAND_IN('ring', 'a thin ring of charge')}`,
  tail: String.raw`; and as the rings thin, the charge’s $z\sec^2\alpha\,\Delta\alpha$ becomes their width,${NB}$ds$`};
const PARTS: Record<ProblemId, Parts> = {
  bisector: {...ROD_Y, ...COS_ROD, dirIs: ANGLE_ROD + MIRROR(String.raw`\alpha`), pairSay: PAIR('along the rod'), mirror: {across: String.raw`\sin\alpha`, lost: 'along the rod'},
    simplify: true, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  endpoint: {...ROD_Y, ...COS_ROD, dirIs: ANGLE_ROD_END, also: ALONG_ROD, nothing: ABOVE, simplify: true, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // The charge element is written with a slash: in the last line it sits in a numerator, and a
  // fraction there is set at script size -- a y over an L too small to read.
  ramp: {...ROD_Y, dq: String.raw`\lambda_0\,(y/L)\,dy`, piece: String.raw`\lambda_0\frac{y}{L}\,\Delta y`, ...COS_ROD, dirIs: ANGLE_ROD_END, also: ALONG_ROD, nothing: ABOVE, simplify: true,
    holds: String.raw`$\lambda(y)$ is the charge per unit length where the piece is, so a piece $\Delta y$ long holds $\lambda(y)\,\Delta y$.`,
    charge: String.raw`\lambda(y)=\lambda_0 y/L`,
    check: {dq: 'lambda0*y/L', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // Seen from beyond its end, every piece already pushes straight along the axis: there is no
  // factor to pick a component out with, and writing "cos 0" would invent one. Nor is there a second
  // row: its finished line only moved the dx, a full display row with no algebra in it.
  axial: {...ROD_X, nothing: String.raw`Every piece lies on the axis through${NB}$P$, so each arrow already points along it: there is nothing sideways to cancel.`,
    simplify: false, check: {dq: 'lambda', r: 'L+a-x', dir: '1'}},
  infinite: {dq: String.raw`\lambda r\sec^2\theta\,d\theta`, piece: String.raw`\lambda r\sec^2\theta\,\Delta\theta`,
    r: String.raw`\frac{r}{\cos\theta}`, r2: String.raw`r^2\sec^2\theta`, dir: String.raw`\cos\theta`, dirOf: String.raw`\cos\theta`, pieceIs: String.raw`y=r\tan\theta`,
    at: String.raw`$r$ is the perpendicular from $P$ to the line, the side next to${NB}$\theta$, and $r_i$ is the hypotenuse.`,
    dirIs: String.raw`${ARROW} lies along $r_i$, so its part along $x$ is $\Delta E\cos\theta$, the side next to${NB}$\theta$.` + MIRROR(String.raw`\theta`),
    pairSay: PAIR('along the line'), mirror: {across: String.raw`\sin\theta`, lost: 'along the line'},
    holds: String.raw`${BRIDGE(String.raw`\theta`, String.raw`y=r\tan\theta`, 'y', String.raw`r\sec^2\theta`)} $\lambda$ is the charge per unit length. ${STAND_IN('piece')}`,
    tail: String.raw`; $\Delta Q_i$ and $\cos\theta_i$ already are`,
    simplify: true,
    check: {dq: 'lambda*r/cos(theta)^2', r: 'r/cos(theta)', dir: 'cos(theta)'}},
  // P sits above the end of the line, so the component along the line survives and points back
  // toward the end: a minus sign and the sine of the angle at P, measured from the perpendicular
  // P drops to the line -- as the lesson's own text measures it, and as the infinite line's θ is.
  semi: {dq: String.raw`\lambda\,dx`, piece: String.raw`\lambda r\sec^2\alpha\,\Delta\alpha`, r: String.raw`\sqrt{x^2+r^2}`, r2: String.raw`x^2+r^2`, pieceIs: String.raw`x=r\tan\alpha`,
    holds: String.raw`${BRIDGE(String.raw`\alpha`, String.raw`x=r\tan\alpha`, 'x', String.raw`r\sec^2\alpha`)} $\lambda$ is the charge per unit length. ${STAND_IN('piece')}`,
    at: HYPOTENUSE('x', 'r', 'line'),
    sign: '-', dir: String.raw`\sin\alpha`, dirOf: String.raw`\frac{x}{\sqrt{x^2+r^2}}`, simplify: true,
    also: (dQ, ri2) => String.raw`\Delta E_y=\frac{k\,${dQ}}{${ri2}}${fx('projection', String.raw`\cos\alpha`)}`,
    nothing: String.raw`Nothing cancels: the line stops right below${NB}$P$, so no piece has a mirror partner, and both parts of each survive${DASH}which is why the field leans.`,
    dirIs: String.raw`${ARROW} lies along $r_i$, so its part along the line is $\Delta E\sin\alpha$, the side opposite${NB}$\alpha$, and its part across the line is $\Delta E\cos\alpha$. For positive charge the part along the line points back past the end: hence the minus.`,
    tail: String.raw`; and as the pieces shrink, the charge’s $r\sec^2\alpha\,\Delta\alpha$ becomes their length,${NB}$dx$`,
    check: {dq: 'lambda', r: 'sqrt(x^2+r^2)', dir: '-x/sqrt(x^2+r^2)'}},
  ring: {...RING, ...COS_AXIS('R'), dirIs: ANGLE_RING, pairSay: PAIR_RING, mirror: {across: String.raw`\sin\alpha`, lost: 'across the axis'}, simplify: true,
    constant: {term: String.raw`\frac{k\lambda Rz}{(R^2+z^2)^{3/2}}`, whole: String.raw`\frac{k\,(\lambda\,2\pi R)\,z}{(R^2+z^2)^{3/2}}`,
      span: 'once round the ring', adds: String.raw`\int_0^{2\pi}d\theta=2\pi`, total: String.raw`\lambda\,2\pi R=Q`},
    check: {dq: 'lambda*R', r: 'sqrt(R^2+z^2)', dir: 'z/sqrt(R^2+z^2)'}},
  disk: {...DISK, ...COS_AXIS('s'), dirIs: ANGLE_RINGS, pairSay: ACROSS_RING, simplify: true, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  sheet: {...SHEET, ...COS_AXIS('s'), dirIs: ANGLE_SHEET, pairSay: ACROSS_RING, simplify: true, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  // P is the centre and the charge is on the far side of it, so the field there points back
  // across the centre: minus the cosine of the piece's own angle. Where θ is measured from is said
  // in the first line now, where θ first appears.
  arc: {...ARC, sign: '-', dir: String.raw`\cos\theta`, dirOf: String.raw`\cos\theta`, simplify: true,
    dirIs: String.raw`$P$ is the centre, so ${ARROW.replace('The', 'the')} lies along the radius, pointing for positive charge from the piece back through${NB}$P$: its part along $x$ is $-\Delta E\cos\theta$.` + MIRROR(String.raw`\theta`),
    pairSay: PAIR('across the axis'), mirror: {across: String.raw`\sin\theta`, lost: 'across the axis'},
    tail: String.raw`; $r_i$ is $R$ for every piece, a constant`,
    check: {dq: 'lambda*R', r: 'R', dir: '-cos(theta)'}},
  'v-ring': {...RING, simplify: true,
    constant: {term: String.raw`\frac{k\lambda R}{\sqrt{R^2+z^2}}`, whole: String.raw`\frac{k\,(\lambda\,2\pi R)}{\sqrt{R^2+z^2}}`,
      span: 'once round the ring', adds: String.raw`\int_0^{2\pi}d\theta=2\pi`, total: String.raw`\lambda\,2\pi R=Q`},
    check: {dq: 'lambda*R', r: 'sqrt(R^2+z^2)', dir: '1'}},
  'v-disk': {...DISK, simplify: false, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: '1'}},
  // With its limits, as the ring's is: "∫dθ = φ" with none is an indefinite integral, θ + C.
  'v-arc': {...ARC, simplify: true,
    constant: {term: String.raw`k\lambda`, whole: String.raw`\frac{k\,(\lambda R\varphi)}{R}`,
      span: 'along the whole arc', adds: String.raw`\int_{-\varphi/2}^{\varphi/2}d\theta=\varphi`, total: String.raw`\lambda R\varphi=Q`},
    check: {dq: 'lambda*R', r: 'R', dir: '1'}},
  'v-rod-bisector': {...ROD_Y, simplify: false, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: '1'}},
  'v-rod-axial': {...ROD_X, simplify: false, check: {dq: 'lambda', r: 'L+a-x', dir: '1'}},
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
/** Where a piece is and where the pieces run, for each geometry over its whole length: the limits
 * of the sum said in words. `run` is handed the two ends already written "variable = limit". */
const SPANS: Record<string, {each: string; run: (lo: string, hi: string) => string}> = {
  bisector: {each: 'Each piece sits at its own $y$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  axial: {each: 'Each piece sits at its own $x$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  endpoint: {each: 'Each piece sits at its own $y$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  ramp: {each: 'Each piece sits at its own $y$', run: (lo, hi) => `from one end, ${lo}, to the other, ${hi}`},
  // In the angle the infinite line is finite: its far ends are where θ reaches a right angle.
  infinite: {each: String.raw`Each piece sits at its own angle $\theta$`, run: (lo, hi) => `from ${lo}, far along the line one way, to ${hi}, far along it the other`},
  semi: {each: 'Each piece sits at its own $x$', run: lo => String.raw`from the end, ${lo}, on to $\infty$`},
  ring: {each: String.raw`Each piece sits at its own angle $\theta$ round the ring`, run: (lo, hi) => `from ${lo} once round to ${hi}`},
  arc: {each: String.raw`Each piece sits at its own angle $\theta$`, run: (lo, hi) => `from one end of the arc, ${lo}, to the other, ${hi}`},
  disk: {each: 'Each ring sits at its own radius $s$', run: (lo, hi) => `from the centre, ${lo}, to the rim, ${hi}`},
  sheet: {each: 'Each ring sits at its own radius $s$', run: lo => String.raw`from the centre, ${lo}, on to $\infty$`},
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
 * limits into "hi − lo" finished a centred arc on (φ/4 − −φ/4) and half a ring on (3π/2 − π/2). */
export function boardLines(p: Problem, bounds?: [string, string], opts: {keeps?: boolean; span?: string} = {}): BoardLine[] {
  const t = PARTS[p.id], scalar = p.quantity === 'V', lhs = componentOf(p), v = p.variableTex;
  const surface = p.geometry === 'disk' || p.geometry === 'sheet';
  const [lo, hi] = bounds ?? p.boundTex;
  const whole = !bounds || (lo === p.boundTex[0] && hi === p.boundTex[1]);
  const keeps = opts.keeps ?? (whole || (p.geometry !== 'ring' && lo === `-${hi}`));
  const dQ = fx('element', String.raw`\Delta Q`), ri = fx('distance', 'r_i');
  // The square inside the factor, so it stacks over the subscript as r_i^2 does anywhere else, takes
  // the distance's colour and is part of what lights. Outside the \htmlClass group it was set after
  // the subscript, in black, and a lit chip left it hanging off its edge.
  const ri2 = fx('distance', 'r_i^{2}');
  const sign = t.sign ?? '';
  // KaTeX already sets a thin space before an operator like cos; an explicit one doubled it, so a
  // coloured cos α sat twice as far from its fraction as an uncoloured sin α in the same card.
  const gap = (tex: string) => /^\\(cos|sin)/.test(tex) ? '' : String.raw`\,`;
  const dir = t.dir ? fx('projection', t.dir) : '';
  // One piece's contribution, written once and reused: the cancelling, adding and limiting lines
  // are this same expression with one thing changed, and the reader should see that it is.
  const one = scalar ? String.raw`\frac{k\,${dQ}}{${ri}}` : String.raw`${sign}\frac{k\,${dQ}}{${ri2}}${dir ? gap(t.dir!) + dir : ''}`;
  // The same contribution with every piece-dependent symbol indexed, for the sum over pieces. A
  // ring's bits are all at one angle, and the sentence under the sum says so: its α is not indexed.
  const angleVaries = !!t.dir && p.geometry !== 'ring';
  const nth = (tex: string) => angleVaries ? tex.replace(/\\(alpha|theta)$/, '\\$1_i') : tex;
  const dQi = fx('element', String.raw`\Delta Q_i`);
  const term = scalar ? String.raw`\frac{k\,${dQi}}{${ri}}` : String.raw`\frac{k\,${dQi}}{${ri2}}${t.dir ? gap(t.dir) + fx('projection', nth(t.dir)) : ''}`;
  // The sign stands before the sum and the integral, as a book sets it, not inside them.
  // Each limit braced: after the colon, a bare minus was spaced as a binary one, "y:  − L/2".
  const range = fx('bounds', String.raw`${v}\colon{${lo}}\to{${hi}}`);
  const integral = String.raw`\int_{${fx('bounds', lo)}}^{${fx('bounds', hi)}}`;
  const element = fx('element', t.dq);
  const substituted = scalar
    ? String.raw`\frac{k\,${element}}{${fx('distance', t.r)}}`
    : String.raw`\frac{k\,${element}}{${fx('distance', t.r2)}}${t.dirOf ? gap(t.dirOf) + fx('projection', t.dirOf) : ''}`;
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
  const distance = gloss(fx('distance', String.raw`r_i=${t.r}`));
  const POINT = String.raw`Each bit’s field is a point charge’s, from Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$.`;
  const bit = String.raw`$\delta q$ is one bit of the ring, and $\hat{\mathbf r}$ points from it toward${NB}$P$. ${POINT}`;
  // A potential lesson's second line drops a square and a unit vector from the field's, and a student
  // coming from the field lessons reads both as typos: so it says why, where they go missing.
  const POTENTIAL = String.raw`over $r_i$, not $r_i^2$, and with no direction: $\Delta V$ is a number, with nothing to split into parts.`;
  const toward = scalar
    ? surface
      ? String.raw`A ring is not a point, but treated as thin, every bit of it is $r_i$ from${NB}$P$, so it adds $k$ times its charge over its distance, with $k=1/(4\pi\varepsilon_0)$${DASH}${POTENTIAL} ${t.at}`
      : String.raw`A point charge’s potential is $k$ times its charge over its distance, with $k=1/(4\pi\varepsilon_0)$${DASH}${POTENTIAL} ${t.at}`
    : p.geometry === 'sheet'
      ? String.raw`$\delta q$ is one bit of the thin ring that stands in for this one: its bits hold $\Delta Q$ between them, all $r_i$ from${NB}$P$, and $\hat{\mathbf r}$ points from a bit toward${NB}$P$. ${POINT} The ring itself is wide and its bits are not all $r_i$ away, but it covers a small angle, so its field is nearly the thin ring’s: hence${NB}$\approx$.`
      : surface ? String.raw`${bit} ${t.at} If the ring is treated as thin, every bit of it is $r_i$ from${NB}$P$.`
      : String.raw`${COULOMB} ${t.at}`;
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
  const undone = t.mirror && p.geometry !== 'ring'
    ? String.raw`\Delta E_y+(-\Delta E_y)=0\;\Rightarrow\;E_y=0`
    : p.geometry === 'ring' ? String.raw`\Delta\mathbf E_\perp+(-\Delta\mathbf E_\perp)=\mathbf 0`
      : surface ? String.raw`\textstyle\sum_{\text{ring}}\delta\mathbf E_\perp=\mathbf 0` : undefined;
  // A bracket dragged off-centre -- or short of the whole ring -- leaves some pieces' partners
  // outside it. The board kept writing E_y = 0 over a figure whose ΣΔE visibly leaned: the upper half
  // of the rod leans 17°, a quarter-arc 45°. So there the cancellation is not written, the part that
  // survives is, and the remark says why.
  const lopsided = !scalar && !!t.mirror && !keeps;
  const across = t.mirror && String.raw`${p.geometry === 'ring' ? String.raw`|\Delta\mathbf E_\perp|=` : String.raw`\Delta E_y=-`}\frac{k\,${dQ}}{${ri2}}${fx('projection', t.mirror.across)}`;
  const offCentre = p.geometry === 'ring'
    ? `With the bracket short of the whole ring, some pieces’ partners lie outside it, so the part across the axis no longer cancels: the integral below builds $${lhs}$ alone.`
    : `With the bracket off-centre, some pieces’ mirrors lie outside it, so the part ${t.mirror?.lost} no longer cancels: the integral below builds $${lhs}$ alone.`;
  const cancel: BoardLine = scalar
    ? {key: 'cancel', tex: String.raw`\Delta V=\frac{k\,${dQ}}{${ri}}`,
      nothing: paired && keeps ? 'Its mirror piece adds the same; nothing cancels.' : 'No direction, and one sign of charge: nothing cancels.'}
    : t.dir
      ? {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`,
        where: t.dirOf !== t.dir ? gloss(fx('projection', String.raw`${t.dir}=${t.dirOf}`)) : undefined,
        // Why the part is that side of the triangle, said beside the formula.
        say: t.dirIs,
        cancels: lopsided ? undefined : gloss(undone),
        cancelsSay: lopsided ? undefined : t.pairSay,
        nothing: lopsided ? offCentre : t.nothing,
        also: gloss(lopsided ? across : t.also?.(dQ, ri2))}
      : {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`, nothing: t.nothing};
  // A ring's field is not one point charge's: each bit of it pushes along its own line to P, and
  // only around the whole ring do the sideways parts cancel. So the surface lessons write the ring
  // as the sum of its bits, and the next line is where that sum loses its sideways part. The sheet's
  // sum is over the bits of the thin ring that stands in for each wide one; the ≈ is the stand-in's.
  //
  // The unit vector is in ink: coloured, it offered itself to be pointed at, and the figure draws
  // nothing for it to light -- the one coloured symbol on the board that found nothing.
  const oneField = surface
    ? String.raw`\Delta\mathbf E${p.geometry === 'sheet' ? String.raw`\approx` : '='}\sum_{\text{${p.geometry === 'sheet' ? 'thin ring' : 'ring'}}}\frac{k\,${fx('element', String.raw`\delta q`)}}{${ri2}}\,\hat{\mathbf r}`
    : String.raw`\Delta\mathbf E=\frac{k\,${dQ}}{${ri2}}\,\hat{\mathbf r}_i`;
  // THE LIMITS, SAID AS WHAT THEY ARE. "The limits are where the charge starts and ends in the
  // variable you sum over" sat under a sum over i, not over y: the pieces are counted by i and placed
  // by y, and a reader who took the sentence at its word looked for y under the Σ. So it says where
  // each piece is, and where the first and the last of them are.
  // Dragging the brackets narrows the sum, and then it says which pieces it now runs over. How many
  // there are is N, the Pieces slider: the sum never said, and N → ∞ under Shrink them had nothing to
  // refer to. "So every piece is counted once" went: "from one end to the other" already says it.
  const at = (b: string) => `$${v}=${b}$`, span = SPANS[p.geometry], unit = surface ? 'ring' : 'piece';
  const placed = bounds && !whole
    ? `${span.each}; the bracketed ${unit}s, numbered by $i$, run from ${at(lo)} to ${at(hi)}, so each of them is counted once.`
    : `${span.each}; the $N$ ${unit}s, numbered by $i$, run ${span.run(at(lo), at(hi))}.`;
  // WHAT THE SUM IS, AND WHY "≈". The figure's chain adds whole arrows while the board adds one
  // part of each, and nothing said how the two are related, or why the sum is only nearly the field.
  const along = lhs === 'E_z' ? 'the axis' : '$x$';
  // Why only ≈. The disk's pieces were called thin rings from the first line, so "each ring is still
  // treated as one thin ring" gave the approximation as its own reason. What is approximate is that a
  // ring Δs wide has all its charge counted at one radius. The sheet's ring is the stand-in itself.
  const roughly = p.geometry === 'sheet' ? 'each ring is still treated as one thin ring'
    : surface ? String.raw`each ring is $\Delta s$ wide, but all its charge is counted at one radius $s$, one distance $r_i$ from${NB}$P$`
    : 'each piece is still treated as a point charge';
  const sumIs = constant
    ? ` Every piece is ${p.geometry === 'arc' ? '$R$ from' : 'the same distance from'}${NB}$P$${scalar ? '' : ' at the same angle'}, so this sum is already exact, however the ${p.geometry === 'arc' ? 'arc' : 'ring'} is cut.`
    : ` ${scalar ? 'The column on the figure stacks these numbers, and its height is this sum.' : `The chain on the figure adds the whole arrows, and how far it reaches along ${along} is this sum.`} It is only $\\approx$: ${roughly}.`;
  // THE RULE THE LAST LINE FOLLOWS. Before a sum can become an integral over y, everything in it
  // that changes from piece to piece has to be written in y. That is the one step a student has to
  // make alone to set up the next integral; the line made it silently, followable only by colour,
  // and then named the factors without writing what they become. So it writes them: r_i² = y² + r²,
  // cos α_i = r/√(y² + r²) -- and the ring's charge, where it grows with the ring's radius, which is
  // what makes a disk a disk and not a ring. A ring's bits are all one distance away at one angle,
  // and an arc's all R away: there the term never changes, comes out of the integral, and what is
  // left counts the pieces -- ∫dθ = 2π round the ring, and λ 2πR is Q.
  const swaps = [
    ...(t.charge ? [t.charge] : []),
    ...(t.r === 'R' ? [] : [scalar ? `r_i=${t.r}` : `r_i^2=${t.r2}`]),
    ...(angleVaries && t.dirOf !== t.dir ? [`${nth(t.dir!)}=${slash(t.dirOf!)}`] : []),
  ].map(f => `$${f}$`);
  const listed = swaps.length > 1 ? `${swaps.slice(0, -1).join(', ')} and ${swaps.at(-1)}` : swaps[0];
  const becomes = `the sum over ${unit}s becomes an integral over $${v}$`;
  // WHAT SHRINKING IS. The step named for it said only "Σᵢ → ∫, ΔQᵢ → dQ" and "then the sum becomes
  // an integral": the pieces never got thinner, Δy → dy was never written and N → ∞ never said, so
  // the integral read as a renaming rule rather than a limit, and dy arrived from nowhere. So the rule
  // opens on the limit. The semi-infinite line and the sheet are cut in an angle but integrated in x
  // and s: their own tail says what the piece's width becomes, so here they say N → ∞ alone.
  const ownCut = p.id !== 'semi' && p.id !== 'sheet';
  const thinner = `Make the ${unit}s thinner without end, $N\\to\\infty$${ownCut ? `: each $\\Delta ${v}$ becomes $d${v}$, and` : ', and'} ${becomes}.`;
  const rule = constant
    ? `Nothing changes from piece to piece: every piece is ${p.geometry === 'arc' ? '$R$ from' : 'the same $r_i$ from'}${NB}$P$${scalar ? '' : ', at the same $\\alpha$'}. So ${becomes} of a term that never changes, which comes outside it; ${whole
      // "∫dθ = 2π counts the pieces" read as there being 2π of them. It adds up their angles.
      ? `$${constant.adds}$ adds up the pieces’ angles, ${constant.span}, and $${constant.total}$.`
      : `$\\int_{${lo}}^{${hi}}d\\theta=${count}$ adds up the bracketed pieces’ angles.`}`
    : swaps.length
      ? `${thinner} For that, what changes from ${unit} to ${unit} is written in terms of $${v}$: ${listed}${t.tail ?? ''}.`
      : `${thinner} Only $${nth(t.dir!)}$ changes from ${unit} to ${unit}, and it is already in terms of $${v}$${t.tail ?? ''}.`;
  const r2 = t.r2.replace(/^\((.*)\)\^2$/, '$1');
  return [
    {key: 'pieces', tex: String.raw`${dQ}=${fx('element', t.piece)}`, where: gloss(t.pieceIs ?? t.density ?? p.densityTex), say: t.holds},
    // A vector, so it carries its direction: the unit vector the next line turns into a cosine.
    {key: 'one', tex: scalar ? String.raw`\Delta V=${one}` : oneField, where: distance, say: toward},
    cancel,
    // The limits arrive here, with the sum they bound, so this is where they are explained.
    {key: 'add', tex: String.raw`${lhs}${constant ? '=' : String.raw`\approx`}${sign}\sum_i ${term}`, where: range, say: placed + sumIs},
    // What shrinking does to the algebra, said in symbols: the sum over pieces becomes the integral
    // and each piece's charge becomes the charge element -- the one step the figure cannot show.
    {key: 'limit', tex: String.raw`${lhs}=${sign}${integral}${substituted}`,
      where: String.raw`\textstyle\sum_i\to\int,\quad ${fx('element', String.raw`\Delta Q_i\to dQ=${t.dq}`)}`, say: rule,
      finish: t.simplify ? simplified : undefined,
      merged: t.simplify && merges ? gloss(String.raw`(${r2})\sqrt{${r2}}=(${r2})^{3/2}`) : undefined},
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
const SET_OVER_TWO_LINES: Partial<Record<ProblemId, string[]>> = {
  // The board is in λ to its last line, and the answer under it was in Q: where λ went and Q came
  // from was said only in Unfold's last step. So it is said in λ first, then with λL = Q, as the disk
  // goes from k to ε₀.
  bisector: [String.raw`\begin{aligned}E_x&=\frac{k\lambda L}{r\sqrt{r^2+(L/2)^2}}\\&=\frac{kQ}{r\sqrt{r^2+(L/2)^2}}\end{aligned}`],
  // A \left…\right pair cannot span a line break, so the ramp's brackets are sized by hand -- as
  // tall as the fractions they hold, not the shorter \Big that left the closing one shrunken.
  ramp: [String.raw`E_x=\frac{k\lambda_0}{L}\left(1-\frac{r}{\sqrt{L^2+r^2}}\right)`,
    String.raw`\begin{aligned}E_y=-\frac{k\lambda_0}{L}\bigg[&\ln\frac{L+\sqrt{L^2+r^2}}{r}\\&-\frac{L}{\sqrt{L^2+r^2}}\bigg]\end{aligned}`],
  // Both components in λ, as the board integrated: E_x in Q above E_y in λ asked whether they were
  // two different charges.
  endpoint: [String.raw`E_x=\frac{k\lambda L}{r\sqrt{r^2+L^2}}`, String.raw`E_y=-k\lambda\left(\frac1r-\frac1{\sqrt{r^2+L^2}}\right)`],
  // The magnitude on a line of its own: it is not a signed component, and the note under the
  // components says they are signed.
  semi: [String.raw`E_x=-\frac{k\lambda}{r}`, String.raw`E_y=\frac{k\lambda}{r}`, String.raw`|\mathbf E|=\frac{\sqrt2\,k|\lambda|}{r}`],
  // The disk's field holds only above it, as its potential does, and both say so as the sheet does,
  // "(z > 0)": on a row of their own, because on one line it ran out of the panel. The condition
  // hangs under the right-hand side, after the "=", not under the "=" itself.
  disk: [String.raw`\begin{aligned}E_z&=2\pi k\sigma\left(1-\frac{z}{\sqrt{z^2+R^2}}\right)\\&=\frac{\sigma}{2\varepsilon_0}\left(1-\frac{z}{\sqrt{z^2+R^2}}\right)\\&\phantom{{}={}}(z>0)\end{aligned}`],
  sheet: [String.raw`E_z=2\pi k\sigma=\frac{\sigma}{2\varepsilon_0}\quad(z>0)`],
  'v-disk': [String.raw`\begin{aligned}V&=2\pi k\sigma\left(\sqrt{z^2+R^2}-z\right)\\&=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{z^2+R^2}-z\right)\\&\phantom{{}={}}(z>0)\end{aligned}`],
};
/** What the integral comes to, the built component first. */
export function resultLines(p: Problem): string[] {
  return SET_OVER_TWO_LINES[p.id] ?? [p.resultTex, ...(p.secondaryResultTex ? [p.secondaryResultTex] : [])];
}
/** The bisector's integral worked by the angle the board and the figure call α. It skipped the
 * identity that makes the substitution work (y² + r² = r² sec²α, so the denominator is r³ sec³α),
 * dropped kλ without a word and brought it back at the end, and never wrote ∫cos α dα = sin α or
 * where sin α comes from. Each of those is a line a student who does not yet integrate fluently
 * needs, so each is written. The lesson's own worked lines follow, from its evaluation at the ends. */
export const BISECTOR_UNFOLD: {text: string; tex: string}[] = [
  {text: String.raw`$k\lambda$ is the same for every piece, so it comes outside the integral.`,
    tex: String.raw`E_x=k\lambda\int_{-L/2}^{L/2}\frac{r\,dy}{(y^2+r^2)^{3/2}}`},
  {text: String.raw`Turn the changing distance into an angle. Hold $r$ fixed and put $y=r\tan\alpha$, so $dy=r\sec^2\alpha\,d\alpha$; then the denominator is a power of $\sec\alpha$.`,
    tex: String.raw`y^2+r^2=r^2(\tan^2\alpha+1)=r^2\sec^2\alpha`},
  {text: String.raw`The conversion factor, $r\sec^2\alpha$, supplies two powers of secant. One $\sec\alpha$ remains in the denominator: that is $\cos\alpha$ on top.`,
    tex: String.raw`\begin{aligned}\int\frac{r\,dy}{(y^2+r^2)^{3/2}}&=\int\frac{r\cdot r\sec^2\alpha}{r^3\sec^3\alpha}\,d\alpha\\&=\frac1r\int\cos\alpha\,d\alpha\end{aligned}`},
  {text: String.raw`Integrate: $\int\cos\alpha\,d\alpha=\sin\alpha$. Then return to the triangle, where $\sin\alpha=y/\sqrt{y^2+r^2}$.`,
    tex: String.raw`\frac1r\int\cos\alpha\,d\alpha=\frac{\sin\alpha}{r}=\frac{y}{r\sqrt{y^2+r^2}}`},
];
