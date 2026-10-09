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
  /** The last line's second half: the same integral with the algebra done. */
  finish?: string;
};
type Parts = {
  /** The charge of one piece in the limit, without "dQ =". */
  dq: string;
  /** The same charge before the limit, as the figure cuts it. */
  piece: string;
  /** Distance from a piece to P, and its square written the way it is easiest to read. */
  r: string; r2: string;
  /** A field's component: the minus sign, the factor's symbol, and what that symbol stands for. */
  sign?: '-'; dir?: string; dirOf?: string;
  /** Show the integral once more with the algebra done: only where that changes what it looks like. */
  simplify: boolean;
  /** The factors as expressions, for checking the algebra above. `dq` is the charge per unit of
   * the integration variable; `dir` is the signed factor that picks out the component. */
  check: {dq: string; r: string; dir: string};
};
const ROD_Y = {dq: String.raw`\lambda\,dy`, piece: String.raw`\lambda\,\Delta y`, r: String.raw`\sqrt{y^2+r^2}`, r2: String.raw`y^2+r^2`};
const ROD_X = {dq: String.raw`\lambda\,dx`, piece: String.raw`\lambda\,\Delta x`, r: String.raw`L+a-x`, r2: String.raw`(L+a-x)^2`};
const RING = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: String.raw`\sqrt{R^2+z^2}`, r2: String.raw`R^2+z^2`};
const DISK = {dq: String.raw`\sigma\,2\pi s\,ds`, piece: String.raw`\sigma\,2\pi s\,\Delta s`, r: String.raw`\sqrt{s^2+z^2}`, r2: String.raw`s^2+z^2`};
const ARC = {dq: String.raw`\lambda R\,d\theta`, piece: String.raw`\lambda R\,\Delta\theta`, r: 'R', r2: 'R^2'};
// The angle the figure marks at P. On the planar lessons it is measured from the triangle's leg
// through P and called θ, as the figure labels it; the round lessons already use θ to run round
// the charge, so the angle at P is α there, as their schematic triangle labels it.
const COS_ROD = {dir: String.raw`\cos\theta`, dirOf: String.raw`\frac{r}{\sqrt{y^2+r^2}}`};
const COS_AXIS = (s: string) => ({dir: String.raw`\cos\alpha`, dirOf: String.raw`\frac{z}{\sqrt{${s}^2+z^2}}`});
const PARTS: Record<ProblemId, Parts> = {
  bisector: {...ROD_Y, ...COS_ROD, simplify: true, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  endpoint: {...ROD_Y, ...COS_ROD, simplify: true, check: {dq: 'lambda', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  ramp: {...ROD_Y, dq: String.raw`\lambda_0\frac{y}{L}\,dy`, piece: String.raw`\lambda_0\frac{y}{L}\,\Delta y`, ...COS_ROD, simplify: true,
    check: {dq: 'lambda0*y/L', r: 'sqrt(y^2+r^2)', dir: 'r/sqrt(y^2+r^2)'}},
  // Seen from beyond its end, every piece already pushes straight along the axis: there is no
  // factor to pick a component out with, and writing "cos 0" would invent one.
  axial: {...ROD_X, simplify: true, check: {dq: 'lambda', r: 'L+a-x', dir: '1'}},
  // Cut at equal angles: the piece's own charge carries the Jacobian of y = r tan θ, which is the
  // whole reason this improper integral comes out finite.
  infinite: {dq: String.raw`\lambda r\sec^2\theta\,d\theta`, piece: String.raw`\lambda\,\Delta y=\lambda r\sec^2\theta\,\Delta\theta`,
    r: String.raw`\frac{r}{\cos\theta}`, r2: String.raw`r^2\sec^2\theta`, dir: String.raw`\cos\theta`, dirOf: String.raw`\cos\theta`, simplify: true,
    check: {dq: 'lambda*r/cos(theta)^2', r: 'r/cos(theta)', dir: 'cos(theta)'}},
  // P sits above the end of the line, so the component along the line survives and points back
  // toward the end: a minus sign and the cosine of the angle at P measured from the line.
  semi: {dq: String.raw`\lambda\,dx`, piece: String.raw`\lambda\,\Delta x`, r: String.raw`\sqrt{x^2+r^2}`, r2: String.raw`x^2+r^2`,
    sign: '-', dir: String.raw`\cos\theta`, dirOf: String.raw`\frac{x}{\sqrt{x^2+r^2}}`, simplify: true,
    check: {dq: 'lambda', r: 'sqrt(x^2+r^2)', dir: '-x/sqrt(x^2+r^2)'}},
  ring: {...RING, ...COS_AXIS('R'), simplify: true, check: {dq: 'lambda*R', r: 'sqrt(R^2+z^2)', dir: 'z/sqrt(R^2+z^2)'}},
  disk: {...DISK, ...COS_AXIS('s'), simplify: true, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  sheet: {...DISK, ...COS_AXIS('s'), simplify: true, check: {dq: 'sigma*2*pi*s', r: 'sqrt(s^2+z^2)', dir: 'z/sqrt(s^2+z^2)'}},
  // P is the centre and the charge is on the far side of it, so the field there points back
  // across the centre: minus the cosine of the piece's own angle.
  arc: {...ARC, sign: '-', dir: String.raw`\cos\theta`, dirOf: String.raw`\cos\theta`, simplify: true, check: {dq: 'lambda*R', r: 'R', dir: '-cos(theta)'}},
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
  const [lo, hi] = bounds ?? p.boundTex;
  const dQ = fx('element', String.raw`\Delta Q`), ri = fx('distance', 'r_i');
  const sign = t.sign ?? '';
  const dir = t.dir ? fx('projection', t.dir) : '';
  // One piece's contribution, written once and reused: the cancelling, adding and limiting lines
  // are this same expression with one thing changed, and the reader should see that it is.
  const one = scalar ? String.raw`\frac{k\,${dQ}}{${ri}}` : String.raw`${sign}\frac{k\,${dQ}}{${ri}^{2}}${dir ? String.raw`\,${dir}` : ''}`;
  const range = fx('bounds', String.raw`${p.variableTex}:\;${lo}\;\to\;${hi}`);
  const integral = String.raw`\int_{${fx('bounds', lo)}}^{${fx('bounds', hi)}}`;
  const element = fx('element', t.dq);
  const substituted = scalar
    ? String.raw`\frac{k\,${element}}{${fx('distance', t.r)}}`
    : String.raw`${sign}\frac{k\,${element}}{${fx('distance', t.r2)}}${t.dirOf ? String.raw`\,${fx('projection', t.dirOf)}` : ''}`;
  const simplified = String.raw`=\int_{${lo}}^{${hi}}${p.kernelTex}\,d${p.variableTex}`;
  // The glosses are set in display style: in text style a fraction like Q/L shrinks to a size
  // nobody can read at the panel's type size, and these are what the new symbols mean.
  const gloss = (tex?: string) => tex && String.raw`\displaystyle ${tex}`;
  // A potential's third line is its second line again, and that is the point: a number has no
  // direction, so there is nothing to project and nothing for a mirror piece to cancel. Where
  // there is a mirror piece, it is the same distance away and adds exactly as much.
  const paired = ['bisector', 'ring', 'arc'].includes(p.geometry);
  const cancel: BoardLine = scalar
    ? {key: 'cancel', tex: String.raw`\Delta V=\frac{k\,${dQ}}{${ri}}`, where: paired ? String.raw`\text{its mirror piece adds the same}` : String.raw`\text{no direction, nothing to cancel}`}
    : t.dir
      ? {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`, where: t.dirOf !== t.dir ? gloss(fx('projection', String.raw`${t.dir}=${t.dirOf}`)) : undefined}
      : {key: 'cancel', tex: String.raw`\Delta ${lhs}=${one}`, where: String.raw`\text{already along the axis}`};
  return [
    {key: 'pieces', tex: String.raw`${dQ}=${fx('element', t.piece)}`, where: gloss(p.densityTex)},
    // A vector, so it carries its direction: the unit vector the next line turns into a cosine.
    {key: 'one', tex: scalar ? String.raw`\Delta V=${one}` : String.raw`\Delta\mathbf E=\frac{k\,${dQ}}{${ri}^{2}}\,${fx('projection', String.raw`\hat{\mathbf r}_i`)}`, where: gloss(fx('distance', String.raw`r_i=${t.r}`))},
    cancel,
    {key: 'add', tex: String.raw`${lhs}\approx\sum ${one}`, where: range},
    {key: 'limit', tex: String.raw`${lhs}=${integral}${substituted}`, finish: t.simplify ? simplified : undefined},
  ];
}
/** Results too long for one line of the panel, set over two -- broken where the expression
 * itself breaks, rather than left to scroll sideways inside a box. */
const SET_OVER_TWO_LINES: Partial<Record<ProblemId, string[]>> = {
  ramp: [String.raw`E_x=\frac{k\lambda_0}{L}\left(1-\frac{r}{\sqrt{L^2+r^2}}\right)`,
    String.raw`\begin{aligned}E_y=-\frac{k\lambda_0}{L}\Big[&\ln\frac{L+\sqrt{L^2+r^2}}{r}\\&-\frac{L}{\sqrt{L^2+r^2}}\Big]<0\end{aligned}`],
  'v-disk': [String.raw`\begin{aligned}V&=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{z^2+R^2}-z\right)\\&\text{for }z>0\end{aligned}`],
};
/** What the integral comes to, the built component first. */
export function resultLines(p: Problem): string[] {
  return SET_OVER_TWO_LINES[p.id] ?? [p.resultTex, ...(p.secondaryResultTex ? [p.secondaryResultTex] : [])];
}
