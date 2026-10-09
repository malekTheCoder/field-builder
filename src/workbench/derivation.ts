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
  /** The last line's second half: the same integral with the algebra done, its "=" set under
   * the first line's so the two read as one chain. */
  finish?: string;
  /** The cancellation itself, in symbols: the part a piece and its mirror partner undo between
   * them. The line above is only the survivor, and a survivor alone never shows what died. */
  cancels?: string;
  /** A second component that survives alongside the one being built, said once where it arises.
   * The TeX of the component only: the board says in words that it survives too. */
  also?: string;
};
type Parts = {
  /** The charge of one piece in the limit, without "dQ =". */
  dq: string;
  /** The same charge before the limit, as the figure cuts it -- and, where the cut is not in the
   * lesson's own coordinate, what relates the two. */
  piece: string; pieceIs?: string;
  /** Distance from a piece to P, and its square written the way it is easiest to read. */
  r: string; r2: string;
  /** A field's component: the minus sign, the factor's symbol, and what that symbol stands for --
   * or, where the symbol is the piece's own coordinate and needs no formula, what it measures, in
   * words: a sentence in \text{} is set in the wrong face and never wraps. */
  sign?: '-'; dir?: string; dirOf?: string; dirIs?: string;
  /** How much charge one piece holds, in words: what the density is and how big a piece is. */
  holds: string;
  /** The angle the mirror partner sits at, for writing the cancellation -- where there is one. */
  mirror?: string;
  /** The other component, where nothing cancels it. */
  also?: string;
  /** Show the integral once more with the algebra done: only where that changes what it looks like. */
  simplify: boolean;
  /** The factors as expressions, for checking the algebra above. `dq` is the charge per unit of
   * the integration variable; `dir` is the signed factor that picks out the component. */
  check: {dq: string; r: string; dir: string};
};
/** Holds a word and the symbol after it on one line, so a remark never ends on a lone "P." */
const NB = '\u00a0';
// What the density means and how big a piece is: the two facts that turn "ΔQ =" into the line's
// right-hand side, which every lesson's own hint says and the board used to leave unsaid.
const PER_LENGTH = (d: string) => String.raw`$\lambda$ is the charge per unit length, so a piece $\Delta ${d}$ long holds $\lambda\,\Delta ${d}$.`;
const ROUND = String.raw`$\lambda$ is the charge per unit length, and an arc of angle $\Delta\theta$ has length $R\,\Delta\theta$.`;
const ROD_Y = {dq: String.raw`\lambda\,dy`, piece: String.raw`\lambda\,\Delta y`, r: String.raw`\sqrt{y^2+r^2}`, r2: String.raw`y^2+r^2`, holds: PER_LENGTH('y')};
const ROD_X = {dq: String.raw`\lambda\,dx`, piece: String.raw`\lambda\,\Delta x`, r: String.raw`L+a-x`, r2: String.raw`(L+a-x)^2`, holds: PER_LENGTH('x')};
const RING = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: String.raw`\sqrt{R^2+z^2}`, r2: String.raw`R^2+z^2`, holds: ROUND};
const DISK = {dq: String.raw`\sigma\,2\pi s\,ds`, piece: String.raw`\sigma\,2\pi s\,\Delta s`, r: String.raw`\sqrt{s^2+z^2}`, r2: String.raw`s^2+z^2`,
  holds: String.raw`$\sigma$ is the charge per unit area, and a thin ring’s area is circumference × width, $2\pi s\,\Delta s$.`};
const ARC = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: 'R', r2: 'R^2', holds: ROUND};
// The angle the figure marks at P, between the perpendicular from P to the charge and the line to
// the piece. The lessons' own text calls it α, so the board does; only the infinite line, where it
// is the integration variable θ itself, and the arc, where θ is the piece's angle, say θ.
const COS_ROD = {dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{r}{\sqrt{y^2+r^2}}`};
// Level with one end, nothing cancels the part along the rod: it survives, pointing back past the
// end for a positive charge -- the second component every result for these lessons prints.
const ALONG_ROD = String.raw`\Delta E_y=-\frac{k\,\Delta Q}{r_i^{2}}\sin\alpha`;
const COS_AXIS = (s: string) => ({dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{z}{\sqrt{${s}^2+z^2}}`});
const PARTS: Record<ProblemId, Parts> = {
  bisector: {...ROD_Y, ...COS_ROD, mirror: String.raw`\alpha`, simplify: true, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  endpoint: {...ROD_Y, ...COS_ROD, also: ALONG_ROD, simplify: true, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // The charge element is written with a slash: in the last line it sits in a numerator, and a
  // fraction there is set at script size -- a y over an L too small to read.
  ramp: {...ROD_Y, dq: String.raw`\lambda_0\,(y/L)\,dy`, piece: String.raw`\lambda_0\frac{y}{L}\,\Delta y`, ...COS_ROD, also: ALONG_ROD, simplify: true,
    holds: String.raw`$\lambda(y)$ is the charge per unit length where the piece is, so a piece $\Delta y$ long holds $\lambda(y)\,\Delta y$.`,
    check: {dq: 'lambda0*y/L', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // Seen from beyond its end, every piece already pushes straight along the axis: there is no
  // factor to pick a component out with, and writing "cos 0" would invent one.
  axial: {...ROD_X, simplify: true, check: {dq: 'lambda', r: 'L+a-x', dir: '1'}},
  // Cut at equal angles, y = r tan θ. The piece's charge is written as what it exactly is, λΔy, and
  // the sec² of that substitution appears only in the limit, where dQ = λ r sec²θ dθ is exact too.
  // It used to be written ΔQ ≈ λ r sec²θ Δθ, which is false: at every N the outermost piece is
  // infinitely long. What a thin angle approximates is the piece's FIELD at P, not its charge: a
  // segment's field at P points along the bisector of its angle, and its size is 2kλ sin(Δθ/2)/r
  // against the point model's kλΔθ/r -- within two percent at five pieces, the outermost included.
  // So the remark says what the sum below is a sum of, which keeps its ≈ true at the ends too.
  infinite: {dq: String.raw`\lambda r\sec^2\theta\,d\theta`, piece: String.raw`\lambda\,\Delta y`,
    r: String.raw`\frac{r}{\cos\theta}`, r2: String.raw`r^2\sec^2\theta`, dir: String.raw`\cos\theta`, dirOf: String.raw`\cos\theta`,
    pieceIs: String.raw`y=r\tan\theta`, dirIs: String.raw`$\theta$ is the piece’s angle at${NB}$P$, from the perpendicular to the line.`, mirror: String.raw`\theta`,
    holds: String.raw`$\lambda$ is the charge per unit length. Thin in angle, each piece makes nearly the field at${NB}$P$ of a point charge $\lambda r\sec^2\theta\,\Delta\theta$ — even the outermost, which never ends.`,
    simplify: true,
    check: {dq: 'lambda*r/cos(theta)^2', r: 'r/cos(theta)', dir: 'cos(theta)'}},
  // P sits above the end of the line, so the component along the line survives and points back
  // toward the end: a minus sign and the sine of the angle at P, measured from the perpendicular
  // P drops to the line -- as the lesson's own text measures it, and as the infinite line's θ is.
  semi: {dq: String.raw`\lambda\,dx`, piece: String.raw`\lambda\,\Delta x`, r: String.raw`\sqrt{x^2+r^2}`, r2: String.raw`x^2+r^2`, holds: PER_LENGTH('x'),
    sign: '-', dir: String.raw`\sin\alpha`, dirOf: String.raw`\frac{x}{\sqrt{x^2+r^2}}`, also: String.raw`\Delta E_y=\frac{k\,\Delta Q}{r_i^{2}}\cos\alpha`, simplify: true,
    check: {dq: 'lambda', r: 'sqrt(x^2+r^2)', dir: '-x/sqrt(x^2+r^2)'}},
  ring: {...RING, ...COS_AXIS('R'), simplify: true, check: {dq: 'lambda*R', r: 'sqrt(R^2+z^2)', dir: 'z/sqrt(R^2+z^2)'}},
  disk: {...DISK, ...COS_AXIS('s'), simplify: true, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  sheet: {...DISK, ...COS_AXIS('s'), simplify: true, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  // P is the centre and the charge is on the far side of it, so the field there points back
  // across the centre: minus the cosine of the piece's own angle.
  arc: {...ARC, sign: '-', dir: String.raw`\cos\theta`, dirOf: String.raw`\cos\theta`, dirIs: String.raw`$\theta$ is the piece’s angle round the arc.`, mirror: String.raw`\theta`, simplify: true,
    check: {dq: 'lambda*R', r: 'R', dir: '-cos(theta)'}},
  'v-ring': {...RING, simplify: false, check: {dq: 'lambda*R', r: 'sqrt(R^2+z^2)', dir: '1'}},
  'v-disk': {...DISK, simplify: false, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: '1'}},
  'v-arc': {...ARC, simplify: true, check: {dq: 'lambda*R', r: 'R', dir: '1'}},
  'v-rod-bisector': {...ROD_Y, simplify: false, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: '1'}},
  'v-rod-axial': {...ROD_X, simplify: false, check: {dq: 'lambda', r: 'L+a-x', dir: '1'}},
};
/** The factors of one lesson's integrand, as expressions -- for the tests, which multiply them. */
export const factorsOf = (p: Problem) => PARTS[p.id].check;
/** Mark a factor as coming from one feature of the figure. */
export const fx = (term: Term, tex: string) => String.raw`\htmlClass{fx fx-${term}}{${tex}}`;
/** The component being built, as the figure and the result name it. */
export function componentOf(p: Problem): string {
  if (p.quantity === 'V') return 'V';
  return ['ring', 'disk', 'sheet'].includes(p.geometry) ? 'E_z' : 'E_x';
}
/** One line of algebra per stage of the run, in the stages' order.
 *
 * `bounds` overrides the limits of integration, so that dragging the brackets in the figure
 * rewrites the integral; left out, the line runs over the whole distribution. */
export function boardLines(p: Problem, bounds?: [string, string]): BoardLine[] {
  const t = PARTS[p.id], scalar = p.quantity === 'V', lhs = componentOf(p);
  const surface = p.geometry === 'disk' || p.geometry === 'sheet';
  const [lo, hi] = bounds ?? p.boundTex;
  const dQ = fx('element', String.raw`\Delta Q`), ri = fx('distance', 'r_i');
  const sign = t.sign ?? '';
  const dir = t.dir ? fx('projection', t.dir) : '';
  // One piece's contribution, written once and reused: the cancelling, adding and limiting lines
  // are this same expression with one thing changed, and the reader should see that it is.
  const one = scalar ? String.raw`\frac{k\,${dQ}}{${ri}}` : String.raw`${sign}\frac{k\,${dQ}}{${ri}^{2}}${dir ? String.raw`\,${dir}` : ''}`;
  // The same contribution with every piece-dependent symbol indexed, for the sum over pieces.
  const nth = (tex: string) => tex.replace(/\\(alpha|theta)$/, '\\$1_i');
  const dQi = fx('element', String.raw`\Delta Q_i`);
  const term = scalar ? String.raw`\frac{k\,${dQi}}{${ri}}` : String.raw`${sign}\frac{k\,${dQi}}{${ri}^{2}}${t.dir ? String.raw`\,${fx('projection', nth(t.dir))}` : ''}`;
  const range = fx('bounds', String.raw`${p.variableTex}:\;${lo}\;\to\;${hi}`);
  const integral = String.raw`\int_{${fx('bounds', lo)}}^{${fx('bounds', hi)}}`;
  const element = fx('element', t.dq);
  const substituted = scalar
    ? String.raw`\frac{k\,${element}}{${fx('distance', t.r)}}`
    : String.raw`${sign}\frac{k\,${element}}{${fx('distance', t.r2)}}${t.dirOf ? String.raw`\,${fx('projection', t.dirOf)}` : ''}`;
  // The "=" hangs under the first line's: a phantom of the left side takes exactly its width, so
  // the two halves line up the way a chain of equalities is set in a book.
  const simplified = String.raw`\phantom{${lhs}}=\int_{${lo}}^{${hi}}${p.kernelTex}\,d${p.variableTex}`;
  // The glosses are set in display style: in text style a fraction like Q/L shrinks to a size
  // nobody can read at the panel's type size, and these are what the new symbols mean.
  const gloss = (tex?: string) => tex && String.raw`\displaystyle ${tex}`;
  // How far a piece is from P. A ring is not a point, but every bit of it is this far away -- said
  // in words beside the distance, not in a \text{} inside it.
  const distance = gloss(fx('distance', String.raw`r_i=${t.r}`));
  const toward = scalar
    ? surface ? String.raw`A ring is not a point, but every bit of it is $r_i$ from${NB}$P$.` : undefined
    : surface ? String.raw`$\delta q$ is one bit of the ring, and $\hat{\mathbf r}$ points from that bit toward${NB}$P$. Every bit is $r_i$ away.`
      : String.raw`$\hat{\mathbf r}_i$ is the unit vector from the piece toward${NB}$P$.`;
  // A potential's third line is its second line again, and that is the point: a number has no
  // direction, so there is nothing to project -- and with charge of one sign, no piece's number
  // can undo another's. (Charge of both signs could: a dipole's potential vanishes where its
  // field does not.) Where there is a mirror piece it is the same distance away and adds the same.
  const paired = ['bisector', 'ring', 'arc'].includes(p.geometry);
  // The cancellation, written: the line itself is only the survivor. A piece and its mirror partner
  // at the opposite angle carry equal and opposite sideways parts; a ring's bits do it all the way
  // round, which is the disk's and the sheet's cancellation too, one ring at a time.
  const undone = t.mirror
    ? String.raw`\Delta E_y(${t.mirror})+\Delta E_y(-${t.mirror})=0\;\Rightarrow\;E_y=0`
    : p.geometry === 'ring' ? String.raw`\Delta\mathbf E_\perp(\theta)+\Delta\mathbf E_\perp(\theta+\pi)=\mathbf 0`
      : surface ? String.raw`\textstyle\sum_{\text{ring}}\delta\mathbf E_\perp=\mathbf 0` : undefined;
  const cancel: BoardLine = scalar
    ? {key: 'cancel', tex: String.raw`\Delta V=\frac{k\,${dQ}}{${ri}}`,
      say: paired ? 'Its mirror piece adds the same; nothing cancels.' : 'No direction, and one sign of charge: nothing cancels.'}
    : t.dir
      ? {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`,
        where: t.dirOf !== t.dir ? gloss(fx('projection', String.raw`${t.dir}=${t.dirOf}`)) : undefined,
        say: t.dirOf !== t.dir ? undefined : t.dirIs,
        cancels: undone && gloss(fx('projection', undone)),
        also: t.also && gloss(t.also)}
      : {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`, say: 'Already along the axis.'};
  // A ring's field is not one point charge's: each bit of it pushes along its own line to P, and
  // only around the whole ring do the sideways parts cancel. So the surface lessons write the ring
  // as the sum of its bits, and the next line is where that sum loses its sideways part.
  const oneField = surface
    ? String.raw`\Delta\mathbf E=\sum_{\text{ring}}\frac{k\,\delta q}{${ri}^{2}}\,${fx('projection', String.raw`\hat{\mathbf r}`)}`
    : String.raw`\Delta\mathbf E=\frac{k\,${dQ}}{${ri}^{2}}\,${fx('projection', String.raw`\hat{\mathbf r}_i`)}`;
  return [
    {key: 'pieces', tex: String.raw`${dQ}=${fx('element', t.piece)}`, where: gloss(t.pieceIs ?? p.densityTex), say: t.holds},
    // A vector, so it carries its direction: the unit vector the next line turns into a cosine.
    {key: 'one', tex: scalar ? String.raw`\Delta V=${one}` : oneField, where: distance, say: toward},
    cancel,
    // The limits arrive here, with the sum they bound, so this is where they are explained.
    {key: 'add', tex: String.raw`${lhs}\approx\sum_i ${term}`, where: range,
      say: 'The limits are where the charge starts and ends in the variable you sum over, so every piece is counted once.'},
    // What shrinking does to the algebra, said in symbols: the sum over pieces becomes the integral
    // and each piece's charge becomes the charge element -- the one step the figure cannot show.
    {key: 'limit', tex: String.raw`${lhs}=${integral}${substituted}`,
      where: String.raw`\textstyle\sum_i\to\int,\quad ${fx('element', String.raw`\Delta Q_i\to dQ=${t.dq}`)}`,
      finish: t.simplify ? simplified : undefined},
  ];
}
/** Results too long for one line of the panel, set over two -- broken where the expression
 * itself breaks, rather than left to scroll sideways inside a box. */
//
// The lessons' own E_y lines end in "< 0", true only for a positive charge; the panel says the sign
// follows the charge, and the charge slider runs negative, so the board's results do not claim it.
const SET_OVER_TWO_LINES: Partial<Record<ProblemId, string[]>> = {
  // A \left…\right pair cannot span a line break, so the ramp's brackets are sized by hand -- as
  // tall as the fractions they hold, not the shorter \Big that left the closing one shrunken.
  ramp: [String.raw`E_x=\frac{k\lambda_0}{L}\left(1-\frac{r}{\sqrt{L^2+r^2}}\right)`,
    String.raw`\begin{aligned}E_y=-\frac{k\lambda_0}{L}\bigg[&\ln\frac{L+\sqrt{L^2+r^2}}{r}\\&-\frac{L}{\sqrt{L^2+r^2}}\bigg]\end{aligned}`],
  endpoint: [String.raw`E_x=\frac{kQ}{r\sqrt{r^2+L^2}}`, String.raw`E_y=-k\lambda\left(\frac1r-\frac1{\sqrt{r^2+L^2}}\right)`],
  // The condition hangs under the right-hand side, after the "=", not under the "=" itself.
  'v-disk': [String.raw`\begin{aligned}V&=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{z^2+R^2}-z\right)\\&\phantom{{}={}}\text{for }z>0\end{aligned}`],
};
/** What the integral comes to, the built component first. */
export function resultLines(p: Problem): string[] {
  return SET_OVER_TWO_LINES[p.id] ?? [p.resultTex, ...(p.secondaryResultTex ? [p.secondaryResultTex] : [])];
}
