import type {BoardLine, StepKey} from '../workbench/derivation';
import type {BoardBeat, GaussCase} from './types';
/* THE GAUSS RUN, AS DATA: five stages, the recipe said in order, the way Watch it build says the integral's
 * (src/explorer/buildRun.ts). Symmetry, The surface, Left side, Right side, Solve. The transport is the
 * integral lessons' own BuildPlayer, so it plays, pauses, scrubs and steps the same way; the figure reads the
 * run's clock and draws each stage's moment (`moment`), and the board writes one line per stage. */
export type GaussStageKey = 'symmetry' | 'surface' | 'left' | 'right' | 'solve';
export const STAGE_KEYS: readonly GaussStageKey[] = ['symmetry', 'surface', 'left', 'right', 'solve'];
const NAMES: Record<GaussStageKey, string> = {symmetry: 'Symmetry', surface: 'The surface', left: 'Left side', right: 'Right side', solve: 'Solve'};
/** How long each stage holds the screen, in seconds: about half a minute in all, as Watch it build. The left
 * side is the longest, since the figure takes the surface's patches one at a time. */
const SECONDS: Record<GaussStageKey, number> = {symmetry: 5, surface: 4.5, left: 6.5, right: 4.5, solve: 5};
/** The share of each stage spent moving; the rest holds the finished frame. */
const MOVES = .72;
export type GaussStage = {key: GaussStageKey; name: string; seconds: number; prose: string; caption: string; line: string};
const beatOf = (c: GaussCase, k: GaussStageKey): BoardBeat => c[k];
export function gaussStages(c: GaussCase): GaussStage[] {
  return STAGE_KEYS.map(key => {const b = beatOf(c, key); return {key, name: NAMES[key], seconds: SECONDS[key], prose: b.line, caption: b.caption, line: spoken(b.line)};});
}
export const runSeconds = (stages: readonly GaussStage[]) => stages.reduce((t, s) => t + s.seconds, 0);
export const stageStart = (stages: readonly GaussStage[], i: number) => stages.slice(0, i).reduce((t, s) => t + s.seconds, 0);
/** Which stage the run is in at `t` seconds, and how far through its motion: 0 as it opens, 1 once its
 * motion is done (it then holds). Eased, so a thing arriving slows into place. */
export function moment(stages: readonly GaussStage[], t: number): {index: number; key: GaussStageKey; progress: number} {
  let start = 0;
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i], end = start + s.seconds;
    if (t < end - 1e-9 || i === stages.length - 1) {
      const f = Math.max(0, Math.min(1, (t - start) / (s.seconds * MOVES)));
      return {index: i, key: s.key, progress: f * f * (3 - 2 * f)};
    }
    start = end;
  }
  return {index: 0, key: 'symmetry', progress: 0};
}
/** The board's keys: DerivationBoard keys its steps by the integral run's names, which are only keys here. */
const BOARD_KEYS: readonly StepKey[] = ['pieces', 'one', 'cancel', 'add', 'limit'];
/** One board line per stage: the beat's TeX, and under it what its new symbols mean. */
export function boardLines(c: GaussCase): BoardLine[] {
  return STAGE_KEYS.map((k, i) => {const b = beatOf(c, k); return {key: BOARD_KEYS[i], tex: b.tex, ...(b.say ? {say: b.say} : {})};});
}
export const stageNames = () => STAGE_KEYS.map(k => NAMES[k]);

/** A line written with $…$ symbols, as a screen reader should hear it: the TeX turned back into the symbols it
 * sets. Only what the Gauss lines use. */
export function spoken(text: string): string {
  return text.split('$').map((part, i) => i % 2 ? texWords(part) : part).join('');
}
/** The symbols a Gauss line may set, as the characters they print. */
const SYMBOLS: Record<string, string> = {varepsilon: 'ε', epsilon: 'ε', lambda: 'λ', sigma: 'σ', rho: 'ρ', pi: 'π', perp: '⊥', theta: 'θ', Phi: 'Φ', alpha: 'α',
  beta: 'β', eta: 'η', ell: 'ℓ', Omega: 'Ω', Delta: 'Δ', oint: '∮', int: '∫', sum: 'Σ', cdot: '·', times: '×', pm: '±', to: '→', Rightarrow: '⇒', le: '≤',
  ge: '≥', ll: '≪', gg: '≫', approx: '≈', propto: '∝', infty: '∞', nabla: '∇', partial: '∂', ldots: '…', cos: 'cos', sin: 'sin', arctan: 'arctan'};
const SUPER: Record<string, string> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', n: 'ⁿ', '+': '⁺', '-': '⁻'};
const SUB: Record<string, string> = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄'};
const raise = (p: string) => p.split('').every(ch => SUPER[ch]) ? p.split('').map(ch => SUPER[ch]).join('') : `^(${p})`;
function texWords(tex: string): string {
  let s = tex;
  s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2').replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  s = s.replace(/\\(?:Big|big|left|right)\b/g, '').replace(/\\q?quad\b/g, ' ');
  s = s.replace(/\\vec\s*([A-Za-z])/g, '$1').replace(/\\hat\{\\mathbf\s*([a-z])\}/g, '$1̂').replace(/\\mathbf\{?([A-Za-z])\}?/g, '$1');
  s = s.replace(/\\(?:text|mathrm)\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\([A-Za-z]+)/g, (m, w: string) => SYMBOLS[w] ?? w);
  // A subscript: a digit prints below the line (ρ₀, r₁), a word or letter is said after its symbol (Q enc, E r).
  s = s.replace(/_\{?([0-4])\}?/g, (_, d: string) => SUB[d] + ' ').replace(/_\{([^{}]*)\}/g, ' $1 ').replace(/_([^\s{}])/g, ' $1 ');
  s = s.replace(/\^\{([^{}]*)\}/g, (_, p: string) => raise(p)).replace(/\^([0-9n])/g, (_, p: string) => SUPER[p]);
  s = s.replace(/\\[,;!]|\\ /g, ' ').replace(/[{}]/g, '').replace(/\\/g, '').replace(/=/g, ' = ');
  // A subscript digit ends its symbol: a space before the next one, none before a bracket or an operator.
  s = s.replace(/([₀-₄]) (?=[)\]/²³⁴^'·,])/g, '$1');
  s = s.replace(/ -(?=\S)/g, ' - ');
  return s.replace(/\s+/g, ' ').trim();
}
