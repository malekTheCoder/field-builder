import type {Problem} from '../problems/types';
import {boardLines, partHasAlso, partResult, type BoardLine} from './derivation';
/** A BRACKET ON THE CHARGE, AS THE BOARD WRITES IT. The panel's board and the run's transport both write the
 * derivation over the part of the charge the figure's handles bracket: the limits in its last line, whether every
 * bracketed piece still has its mirror inside, and the part's answer. They used to be the panel's alone, and the
 * run reset the bracket to the whole charge as it opened, so the transport never needed them. A run now keeps the
 * reader's bracket (see `openRun` in the Explorer), and its transport writes what the panel writes. */
const raw = String.raw;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** n as a fraction with the smallest denominator that holds it. The handles snap to whole percents
 * and the half-turn lessons halve them, so 400 always does. There used to be a decimal fallback past
 * a denominator of 100, and the semi-infinite line and the sheet, whose t/2 wants 200, put "0.185π"
 * on the page. */
export function ratio(n: number): [number, number] { for (let d = 1; d <= 400; d++) if (Math.abs(n * d - Math.round(n * d)) < 1e-7) return [Math.round(n * d), d]; return [Math.round(n * 400), 400]; }
/** A dragged limit as the board writes it. Only an end of the charge, or a plain fraction of it --
 * the middle, a quarter, half a turn -- is written as a value. Anywhere else the handle has no name on
 * the figure, and the board calls it y₁ or y₂: the whole percents the handles snap to wrote
 * "−13L/100 → 31L/100" and "r tan(0.185π)", coefficients where the page writes symbols, and pushed
 * the last line off the side of the panel. The form's fields still hold the value. */
/** n times a symbol as the board writes it, or nothing where that needs a denominator above 4. */
function plain(n: number, s: string) { const [a, d] = ratio(n); if (d > 4) return null; if (a === 0) return '0'; const m = Math.abs(a) === 1 ? '' : `${Math.abs(a)}`; return `${a < 0 ? '-' : ''}${m}${s}${d === 1 ? '' : `/${d}`}`; }
export function limitTex(p: Problem, percent: number, which: 1 | 2) {
  const t = clamp(percent / 100), g = p.geometry;
  if (t <= 1e-5) return p.boundTex[0];
  if (t >= 1 - 1e-5) return p.boundTex[1];
  const nice = g === 'bisector' || (p.id === 'infinite' && p.variable === 'y') ? plain(t - .5, 'L')
    : g === 'axial' || g === 'endpoint' || g === 'ramp' ? plain(t, 'L')
    : g === 'ring' ? plain(2 * t, raw`\pi`)
    : g === 'arc' ? plain(t - .5, raw`\varphi`)
    : g === 'disk' ? plain(t, 'R')
    : p.id === 'infinite' ? plain(t - .5, raw`\pi`)
    // Half way out in angle, the semi-infinite line's piece is r along it and the sheet's ring z out.
    : Math.abs(t - .5) < 1e-9 ? (g === 'sheet' ? 'z' : 'r') : null;
  return nice ?? `${p.variableTex}_${which}`;
}
/** How much angle a bracket on a ring or an arc takes, named as the board names a limit: a bracketed
 * integral of a constant finishes on it, and pasting the limits into "hi − lo" wrote (φ/4 − −φ/4). */
export function spanTex(p: Problem, from: number, to: number) { const g = p.geometry, n = (to - from) / 100; return g === 'ring' ? plain(2 * n, raw`\pi`) ?? undefined : g === 'arc' ? plain(n, raw`\varphi`) ?? undefined : undefined; }
/** Whether a bracket, in percent of the charge, holds all of it. */
export const wholeBracket = (range: readonly [number, number]) => range[0] <= .001 && range[1] >= 99.999;
/** Does the bracket still hold every piece's mirror partner? Off-centre it does not, and the part
 * across the axis survives: the board said E_y = 0 over a figure whose ΣΔE leaned 17° on the upper
 * half of the rod, 45° on a quarter of the arc. A ring needs the whole turn. */
export const bracketKeeps = (p: Problem, [from, to]: readonly [number, number]) => wholeBracket([from, to]) || (p.geometry !== 'ring' && Math.abs(from + to - 100) < 1e-6);
export type Bracket = {whole: boolean; keeps: boolean; oneSided: boolean; below: boolean; above: boolean; lower: string; upper: string; span?: string};
export function bracketOf(p: Problem, range: readonly [number, number]): Bracket {
  const [from, to] = range, g = p.geometry, whole = wholeBracket(range);
  return {
    whole, keeps: bracketKeeps(p, range),
    // And does it hold none of them? Wholly on one side of the middle, or half the ring or less, no piece's
    // mirror is inside, and "some pieces' mirrors lie outside it" said too little.
    oneSided: !whole && (g === 'ring' ? to - from <= 50 + 1e-6 : to <= 50 + 1e-6 || from >= 50 - 1e-6),
    // And does it reach below the middle, where an angle measured from it is negative? Wholly above it,
    // the card explained a negative α that never occurs.
    below: from < 50 - 1e-6,
    // And above it: wholly below the middle, every bracketed piece's surviving part points the other way.
    above: to > 50 + 1e-6,
    lower: limitTex(p, from, 1), upper: limitTex(p, to, 2), span: spanTex(p, from, to),
  };
}
/** The board's lines over a bracket: the whole charge's where it is whole. */
export const bracketLines = (p: Problem, b: Bracket): BoardLine[] =>
  boardLines(p, b.whole ? undefined : [b.lower, b.upper], {keeps: b.keeps, span: b.span, oneSided: b.oneSided, below: b.below, above: b.above});
/** The bracketed part's answer, as the board writes it, where its integral has one. */
export const bracketAnswer = (p: Problem, b: Bracket) => partResult(p, b.lower, b.upper, b.keeps);
export const bracketAnswerBoth = (p: Problem, b: Bracket) => partHasAlso(p, b.keeps);
