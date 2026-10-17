import katex from 'katex';
import {snapshotLayer} from '../diagrams/snapshot';
import {PLOT} from '../diagrams/vectorfield';
import {buildStages} from '../explorer/buildRun';
import {getProblem} from '../problems/definitions';
import {symbolic} from '../problems/prose';
import {lessonFor, type Lesson} from '../lessons';
import type {Problem} from '../problems/types';
import {alongIntegralOf, boardLines, resultLines, workedSteps, type BoardLine} from '../workbench/derivation';

/** One step of worked algebra: a sentence with its symbols written $…$, and the line it arrives at. */
export type WorkedStep = {text: string; tex: string};

/** One of a lesson's limiting cases, as the copy prints it: its title, its formula and why. */
export type LessonCheck = {title: string; formula: string; explanation: string};

/** One stage of Build the integral, as the copy prints it: the stage's name, the run's one sentence for
 * it, and the line the board writes for it. */
export type BuildingStage = {name: string; gloss: string; line: BoardLine};

export type LessonArtifact = {
  title: string;
  subtitle: string;
  /** The live lesson's address, with the values it was saved at: printed under the title, so a student
   * holding the paper can open the same setup. */
  address?: string;
  setup: string;
  /** The lesson at the top of the page (src/lessons), printed where the page prints it: before everything else. */
  lesson?: Omit<Lesson, 'id'>;
  /** The five stages the board writes, from the cut to the integral. */
  building?: BuildingStage[];
  /** The other component's integral, where one survives, set as the panel's answer sets it under the
   * board's last line: with the sentence that says where it comes from. */
  along?: WorkedStep;
  /** Where P is, in the lesson's own symbols: the caption under the figure. */
  coordinate?: string;
  integralTex: string;
  /** The other component's integral, where the result has two components built separately. */
  secondaryIntegralTex?: string;
  /** Every line of the result, the built component first -- E_x and E_y where there are both. */
  results: string[];
  /** The working between the integral and the result: the steps Unfold the integration shows. */
  worked?: WorkedStep[];
  /** A potential lesson's field, differentiated back from V: the step its subtitle promises. */
  derived?: string[];
  /** The same, with its working, where the lesson has it: printed in place of `derived`. */
  back?: WorkedStep[];
  /** The limiting cases the page's "Does the physics make sense?" walks through. */
  checks?: LessonCheck[];
  /** Where the lesson's physics is written up: a textbook section, a problem it is set as. */
  sources?: {title: string; url: string}[];
  /** Where the integral and its working take another route from the build above them -- the infinite
   * line's finite-rod limit, after a build by angle -- the sentence that says so. */
  route?: string;
  svg?: string;
};

/** The integration a lesson's Unfold shows, step by step, and the differentiation after it.
 *
 * THE HANDOUT WENT FROM THE INTEGRAL STRAIGHT TO THE ANSWER. A lecturer prints or hands round this
 * copy; on the ramp, the rod level with an end and the rod's potential -- the lessons whose integrals
 * a first-year student cannot guess -- it showed the integral and then the result with nothing
 * between, while the page had every step behind "Unfold the integration".
 *
 * These are the steps the panel unfolds: on the bisector and the rod level with an end, the
 * substitution written out in full from the board's last line, then the lesson's own steps from its
 * evaluation; on the infinite line's angular route, kλ/r taken out and ∫cos α dα = sin α, then the
 * evaluation; on the semi-infinite line, both components in the angle One piece set up; on the disk,
 * the arc and the rod on its axis, the constant coming out, the power rule and the turned-round ends,
 * then the lesson's last steps. `algebra` is the route the panel derives on -- the infinite line's
 * finite-rod limit, when that is the route chosen.
 *
 * THE COPY PRINTED A DIFFERENT DERIVATION FROM THE PAGE. This list once carried only the first three
 * of those branches, while EquationWorkbench built its own with all seven: the handout did the
 * semi-infinite line's E_x by u = x² + r² and its E_y by x = r tan α -- the α to x to α route the panel
 * had dropped -- printed "Sine is odd" where the arc's panel writes sin(−φ/2) = −sin(φ/2), and gave the
 * disk three steps to the panel's six. A lecturer projecting the page and handing out the copy gave a
 * class two routes. There is now one list, `workedSteps`, built beside the board it continues; the
 * panel and the copy both read it. */
export function lessonWorking(p: Problem, algebra: Problem = p): {worked: WorkedStep[]; back: WorkedStep[]} {
  return workedSteps(p, algebra);
}

/** Everything the offline copy prints about a lesson, but its figure.
 *
 * THE RESULT IS THE PAGE'S ANSWER. The copy printed the lesson's own one line per component, chosen
 * for a page wider than the panel -- and so went a step back from where its own working had arrived.
 * On the rod on its axis and the arc the Working ends in Q, kQ/(a(L + a)) and −2kQ sin(φ/2)/(R²φ), and
 * "The result" under it said kλ(1/a − 1/(L + a)) and −(2kλ/R) sin(φ/2): λ alone, in the density those
 * lessons' setups say is not held fixed. And on the bisector, the rod level with an end and the disk it
 * restated the working's last line in the other order, r² + (L/2)² under (L/2)² + r². The panel's answer,
 * `resultLines`, says each in λ and then in Q, in the board's order; the copy prints that. Its split
 * rows -- the ramp's E_y hung under its bracket, the disk's (z > 0) under its right-hand side -- set on a
 * page seven hundred wide as they do in the panel.
 *
 * The setup and the integral are the route's, as the working is: on the infinite line's finite-rod
 * route the copy said "use y = r tan α to sweep the whole line" and printed the α integral, and then
 * worked a rod of length L that neither had mentioned. The page's own references show the route's
 * setup too. And the copy carries the lesson's limiting cases and its sources, which a handout is
 * the place for: it had neither, so a student holding it could check nothing and look nothing up.
 *
 * THE COPY LEFT OUT THE METHOD. It went from the setup straight to the integral: on the ring no
 * ΔQ = λR Δθ, no rᵢ = √(R² + z²), no cos α = z/rᵢ, nothing about the length of ring across that cancels
 * the sideways part; on the bisector nothing said E_y = 0, or why. Those five steps are what the board
 * writes, what the run is for, and what a problem set marks. So the copy prints them, from the board's
 * own lines and the run's own stage names and sentences -- read here, not written again, so the paper
 * says whatever the panel says -- and E_y's integral where it survives, as the panel's answer sets it.
 * The board is always the lesson's own: the infinite line's is built in α whichever route is unfolded.
 *
 * `address` is the live lesson's, values and all, as the page's own "Copy a link" writes it. */
export function lessonArtifact(p: Problem, algebra: Problem = p, address?: string): LessonArtifact {
  const {worked, back} = lessonWorking(p, algebra);
  // Handed the infinite line's finite-rod route as the lesson itself, the board is still the angular one.
  const q = p.id === 'infinite' && p.variable !== 'alpha' ? getProblem('infinite') : p;
  const stages = buildStages(q), lines = boardLines(q), along = alongIntegralOf(q), lesson = lessonFor(p.id);
  return {title: p.title, subtitle: p.subtitle, ...(address ? {address} : {}),
    ...(lesson ? {lesson: {lead: lesson.lead, sections: lesson.sections, read: lesson.read}} : {}), setup: algebra.setup,
    building: lines.map((line, i) => ({name: stages[i].name, gloss: stages[i].prose, line})),
    ...(along ? {along: {text: ALONG[q.id] ?? ALONG.rod, tex: along.tex}} : {}),
    coordinate: p.coordinate, integralTex: algebra.integralTex,
    secondaryIntegralTex: algebra.secondaryIntegralTex, results: resultLines(algebra),
    worked, back, derived: back.slice(-1).map(w => w.tex),
    checks: p.limits.map(l => ({title: l.title, formula: l.formula, explanation: l.explanation})), sources: p.sources,
    ...(algebra.variable !== q.variable ? {route: ROUTE} : {})};
}
/** TWO ROUTES, SAID TO BE TWO. On the infinite line's finite-rod route the copy built the integral by angle,
 * ending on ∫(kλ/r) cos α dα, and the next heading printed lim_{L→∞} kλ∫ r dy/(y² + r²)^{3/2} with working in
 * L, and nothing between them. The page says it is an alternate derivation; on paper that sentence was
 * missing, and the second integral read as a different problem or a printing error. */
const ROUTE = String.raw`This is the finite-line route: start with a rod of length $L$, then let $L$ grow at fixed $\lambda$. Above, the field is built by angle instead; both routes arrive at the same field.`;
/** Where E_y's integral comes from, said as the panel says it over the same integral (EquationWorkbench's
 * `surviving`): the factor the board never writes, the sine, named with it. The half line stands up the
 * y-axis as the rods do, so its sentence is theirs. */
const ALONG: Record<string, string> = {
  rod: String.raw`The other component, $E_y$, is the surviving $\Delta E_y$ added up the same way, with $\sin\alpha=y/\sqrt{y^2+r^2}$:`,
};

/** Two TeX strings that set the same display: braces and spaces are only grouping. */
const sameTex = (a: string, b: string) => a.replace(/[{}\s]/g, '') === b.replace(/[{}\s]/g, '');
/** Whether a result says everything a worked line says: the same line; the same rows, closing the
 * result's chain, as the ramp's E_y closes its E_x and E_y; or the same left-hand side and the same last
 * right-hand side with more equalities between them, as the sheet's E_z = 2πkσ = σ/(2ε₀) says its
 * working's E_z = σ/(2ε₀). A row's gap is only spacing. */
function restates(result: string, line: string) {
  if (sameTex(result, line)) return true;
  const bare = (t: string) => {
    const flat = t.replace(/[{}\s]/g, '').replace(/\\\\\[[^\]]*\]/g, '\\\\');
    return /^\\beginaligned([\s\S]*)\\endaligned$/.exec(flat)?.[1] ?? flat;
  };
  const r = bare(result), l = bare(line), cut = l.indexOf('=');
  if (r.endsWith(l) && (r.length === l.length || r.slice(0, -l.length).endsWith('\\\\'))) return true;
  if (cut > 0 && !r.includes('&') && r.startsWith(l.slice(0, cut + 1)) && r.endsWith(l.slice(cut))) return true;
  // Or one of an aligned result's rows: the disk's working ends on E_z = σ/(2ε₀)(1 − z/√(R² + z²)), and
  // its result is that row between 2πkσ(…) above and 2kQ/R²(…) below. Every right-hand side of the line
  // must be among the rows under its left-hand side; a continuation row, (z > 0) under the last, is not
  // an equality.
  if (l.includes('&') || cut <= 0) return false;
  const rows: [string, string][] = [];
  let lhs = '';
  for (const row of r.split('\\\\')) {
    const m = /^(.*?)&=(.*)$/.exec(row);
    if (!m) continue;
    if (m[1]) lhs = m[1];
    rows.push([lhs, m[2]]);
  }
  const [side, ...sides] = l.split('=');
  return sides.every(s => rows.some(([a, b]) => a === side && b === s));
}

/** A plain sentence, escaped, with its Greek letters in the face the formula above it uses. The
 * checks' sentences are set in the body's system sans, which draws φ as the stroked ϕ -- directly under
 * the curly φ of the formula they explain: "λ = Q/(Rϕ)" under −(2kQ/R²) sin(φ/2)/φ. The page fixed this
 * with its own greek(); the copy now does the same. Lower case is italic, as in the formula; a capital
 * -- the Δ of ΔV -- stays upright, as TeX sets it. */
export function greekHtml(text: string) {
  return escapeHtml(text).replace(/[Ͱ-Ͽ]+/g, run => run.split('').map(c => `<span class="g${c === c.toLowerCase() ? '' : ' up'}">${c}</span>`).join(''));
}

/** The operator names KaTeX sets upright: never a symbol's letters, however short. */
const OPERATOR_NAMES = new Set(['sin', 'cos', 'tan', 'sec', 'ln', 'log', 'exp', 'sgn']);
/** A sentence of the checks, its symbols in the face of the formula above it: the page's mathProse
 * (Explorer.tsx), for the copy.
 *
 * ONE SYMBOL, ONE FACE, ON PAPER TOO. The copy styled only the Greek, so "kQ/z²", "z < R" and "P" printed in
 * the body's upright sans under MathML that sets every one of them italic, where the page itself sets them
 * italic. A sentence written with $…$ spans is set as MathML, as the setup is. One written plain has its symbols
 * found as prose.ts holds them (`symbolic`): a run of one or two Latin letters goes italic, an operator's name
 * and the digits stay upright. A lone "a", "A" or "I" is a word unless prose.ts held it to a symbol beside it
 * ("a ≪ L"), since "a uniform rod" is English. */
export function symbolsHtml(text: string) {
  if (text.includes('$')) return proseHtml(text);
  const latin = (part: string) => part.split(/([A-Za-z]+[₀-₉ᵢᵧₓ²³′]*)/).map((run, i) => {
    const letters = /^[A-Za-z]+/.exec(run)?.[0] ?? '';
    return i % 2 && letters.length <= 2 && !OPERATOR_NAMES.has(letters) ? `<span class="g">${escapeHtml(run)}</span>` : greekHtml(run);
  }).join('');
  // Held runs are joined by no-break spaces (prose.ts): a run of more than one piece is a formula.
  return text.split(' ').map(token => {
    const pieces = token.split(' '), held = pieces.length > 1;
    return pieces.map(p => symbolic(p) && (held || !/^[aAI]$/.test(p)) ? latin(p) : greekHtml(p)).join(' ');
  }).join(' ');
}

/** Whether a lesson's sentence or display says what k is: k = 1/(4πε₀), in either way of writing the fraction. */
const K_SAID = /k\s*=\s*(?:\\[dt]?frac\{?1\}?\{4\\pi\s*\\varepsilon_0\}|1\/\(4\\pi\s*\\varepsilon_0\))/;
/** Whether the TeX writes Coulomb's constant: once the macro names are gone, any k left is a symbol. */
const usesK = (tex: string) => tex.replace(/\\[A-Za-z]+/g, '').includes('k');

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** TeX as MathML: the browser sets it itself, with no font files and no network, so a copy opened on
 * a train years later still reads as mathematics. (Its one script only tightens Chromium's square
 * roots; see FIT_ROOTS.) The TeX rides along inside it as an annotation, for anyone who wants to copy
 * it. */
export function mathml(tex: string, display = true) {
  return rowGaps(tex, scriptedFences(spaceOperators(katex.renderToString(tex, {output: 'mathml', displayMode: display, throwOnError: false, strict: 'ignore'}))));
}

/** A SIZED BRACKET WITH LIMITS ON IT CLOSES AT ITS FULL SIZE. KaTeX writes \Bigl[ … \Bigr]_0^{π/2} with
 * the closing bracket as the base of the scripts, <msubsup><mo minsize="1.8em">]</mo>…, and Chromium
 * sizes an operator only as a child of a row, not as a script's base: "[−cos α]" opened tall and closed
 * at text size, in the half line's, the infinite line's, the arc's and the disk's potential's working.
 * The opening bracket and what it holds are moved inside the base, as KaTeX writes \left[ … \right]_a^b,
 * so both brackets are children of one row and the limits sit after the pair. WebKit set it right
 * before, and sets it the same after. */
const CLOSING = /<msubsup>(<mo fence="(?:true|false)" stretchy="true" minsize="([^"]+)" maxsize="\2">([\])])<\/mo>)/g;
const PAIR: Record<string, string> = {']': '[', ')': '('};
export function scriptedFences(markup: string) {
  let out = markup;
  for (let m = CLOSING.exec(out); m; m = CLOSING.exec(out)) {
    const [whole, close, size, bracket] = m, before = out.slice(0, m.index);
    const opening = `<mo fence="true" stretchy="true" minsize="${size}" maxsize="${size}">${PAIR[bracket]}</mo>`;
    const from = Math.max(before.lastIndexOf(opening), before.lastIndexOf(opening.replace('fence="true"', 'fence="false"')));
    const inner = from < 0 ? '' : before.slice(from);
    // Only a run of siblings: every element opened between the two brackets is closed there too.
    const balanced = from >= 0 && (inner.match(/<[a-z][^>]*(?<!\/)>/g) ?? []).length === (inner.match(/<\/[a-z]+>/g) ?? []).length;
    if (!balanced) continue;
    out = `${before.slice(0, from)}<msubsup><mrow>${inner}${close}</mrow>${out.slice(m.index + whole.length)}`;
    CLOSING.lastIndex = from;
  }
  return out;
}

/** THE ROWS OF AN ALIGNED CHAIN, A GAP APART. A break sized \\[g] is where a new equality starts -- the
 * panel sets those about .7em apart -- and a bare \\ only continues the row above: the ramp's bracket
 * hung under its first term, the disk's (z > 0) under its right-hand side. KaTeX's MathML drops every
 * gap, and Chromium ignores the rowspacing it writes instead, so the copy's answers stood row on row,
 * E_x = kλL/(r√(L² + r²)) with its "= kQ/…" touching it from below. Each sized break becomes padding over
 * the row it opens; the continuations keep the plain line spacing. */
function rowGaps(tex: string, markup: string) {
  const body = /^\\begin\{aligned\}([\s\S]*)\\end\{aligned\}$/.exec(tex.trim())?.[1];
  if (!body || body.includes('\\begin') || (markup.match(/<mtable/g) ?? []).length !== 1) return markup;
  const breaks = [...body.matchAll(/\\\\(\[[^\]]*\])?/g)].map(m => !!m[1]);
  if ((markup.match(/<mtr>/g) ?? []).length !== breaks.length + 1) return markup;
  let row = -1;
  return markup.replace(/<mtr>([\s\S]*?)<\/mtr>/g, (whole, cells: string) => {
    row++;
    return row > 0 && breaks[row - 1] ? `<mtr>${cells.replace(/<mtd>/g, '<mtd style="padding-top:0.45em">')}</mtr>` : whole;
  });
}

/** A sentence with its symbols written $…$, as a lesson writes its setup: the words escaped, each
 * symbol set as inline MathML, so the λ in "so λ = Q/L" is the λ of the integral printed under it. */
export function proseHtml(text: string) {
  const parts = text.split('$');
  // The punctuation after a symbol stays on its line: a browser may break between an inline <math>
  // and the text after it, and the working printed "(sec α − cos α) dα" with its full stop starting
  // the next line.
  // AND SO DOES A HYPHENATED TAIL. "$x$-axis" printed as "x" at the end of one line and "-axis" at the
  // start of the next, in the ramp's problem box among others: forty-eight spans across the lessons and
  // problems ($x$-axis, $xy$-plane, $x$-parts). The page's Math.tsx already holds the tail with its
  // symbol; the copy now does too.
  const TAIL = /^(?:-[A-Za-z]+)?[.,;:!?)’]*/;
  return parts.map((part, i) => {
    if (i % 2 === 0) return escapeHtml(i > 0 ? part.replace(TAIL, '') : part);
    const stop = TAIL.exec(parts[i + 1] ?? '')?.[0] ?? '';
    return stop ? `<span class="nobr">${mathml(part, false)}${escapeHtml(stop)}</span>` : mathml(part, false);
  }).join('');
}

/** The operator names a lesson writes: ln, sin, cos and their kin, upright, as KaTeX marks them up. */
const OPERATOR = String.raw`<mi(?: mathvariant="normal")?>(?:ln|log|exp|sin|cos|tan|sec|sgn)</mi>`;
/** What may sit just before an operator and be set off from it: a symbol, a number, a fraction, a
 * root, a script or a closed group -- an ordinary atom, in TeX's terms. After a relation, an opening
 * bracket or a sign the operator follows on directly, as it does in TeX.
 * A squared operator is the same operator: KaTeX writes r sec²α as <mi>r</mi><msup><mrow><mi>sec</mi>…,
 * the operator one level down inside its script, and the copy printed "rsec²α" and "r³sec³α" run
 * together in five lessons' working.
 * And an operator opening a group is the same operator: the board lights cos α as one factor,
 * \htmlClass{…}{\cos\alpha}, which KaTeX writes as <mrow><mi>cos</mi>…, and in the copy's One piece and
 * Add them up "cos" touched the end of the fraction bar before it. */
const ORDINARY_BEFORE = new RegExp(String.raw`(</(?:mi|mn|msub|msup|msubsup|mfrac|msqrt|mover|mrow)>)((?:<msup><mrow>|<mrow>)?${OPERATOR})`, 'g');
/** After the operator's invisible function application, a symbol or a fraction is set off too; a
 * bracket is not: "ln(L/a)", but "sin θ". After a squared operator the application sits inside the
 * script, and the space goes after the whole of it: "sec²α", not "sec²α" run on. */
const ORDINARY_AFTER = new RegExp(String.raw`(${OPERATOR}<mo>⁡</mo>|<msup><mrow>${OPERATOR}<mo>⁡</mo></mrow><mn>[^<]*</mn></msup>)(?=<(?:mi|mn|mfrac|msub|msup|msubsup|msqrt)[ >])`, 'g');
const THIN = '<mspace width="0.1667em"/>';
/** A sign with nothing to its left to be the difference of: after a relation, an opening bracket, a
 * separating comma or the start of a group. KaTeX writes it as a plain <mo>, and MathML Core spaces
 * any <mo>− that is not first in its row as a binary operator -- so the copy printed "( − x, r)" and
 * "E_x = −  kλ/r", in five of eight lessons. TeX's rule is that such a sign is unary and sits tight
 * against what follows; it is written in, as zero space either side. */
const UNARY = /(<mo>(?:=|&lt;|&gt;|<|>|≈|∼|→|≤|≥|≠|≪|≫|∝)<\/mo>|<mo(?: [^>]*)?>(?:\(|\[|\{|,)<\/mo>|<mrow>|<mtd>)<mo>([−+])<\/mo>/g;
/** Bold upright letters by their Unicode code points. MathML Core ignores mathvariant="bold", so |𝐄|
 * came out as a plain italic E, the same letter as the component E_x beside it. And the zero vector, the
 * bold 0 the board's cancellations end on (E_⊥ = 0), which the copy now prints with them. */
const BOLD = /<(mi|mn) mathvariant="bold">([A-Za-z0-9])<\/\1>/g;
const boldLetter = (c: string) => String.fromCodePoint(c <= '9' ? 0x1d7ce + c.charCodeAt(0) - 48 : (c <= 'Z' ? 0x1d400 : 0x1d41a) + c.charCodeAt(0) - (c <= 'Z' ? 65 : 97));
/** A unit vector's hat. KaTeX writes \hat x as <mover accent="true"><mi>x</mi><mo>^</mo></mover>, the
 * ASCII caret, which Chromium sets at the height of a letter: x̂ and ŷ printed as letters with a caret
 * struck through them, in the rod level with an end's E = E_x x̂ + E_y ŷ and the half line's
 * (kλ/r)(−x̂ + ŷ). U+02C6, the modifier circumflex, is the accent itself and sits above the letter. (A
 * superscript is an <msup>, never an <mo>^, so nothing else is touched. U+0302, the combining
 * circumflex, lost the hat on ŷ altogether.) */
const CARET = /<mo>\^<\/mo>/g;
/** A condition's colon, "a ≪ L: E_x ∼ kQ/(a + L/2)", is punctuation: tight to what it ends, a thin space
 * after, as TeX's \colon sets it. KaTeX writes a bare ":" as an operator the browser spaces on both
 * sides, and its own \colon as a run of spaces that leaves a gap before the colon. */
const COLON = /<mo>:<\/mo>/g;
/** TeX puts a thin space between an operator name and the ordinary atoms beside it. MathML Core does
 * not: it gives the invisible function application no width, so the copy printed "kλln" run
 * together and "cosα" -- maths that looks unset on a handout. The space is written in. */
function spaceOperators(markup: string) {
  return markup.replace(ORDINARY_BEFORE, `$1${THIN}$2`).replace(ORDINARY_AFTER, `$1${THIN}`)
    .replace(UNARY, '$1<mo lspace="0em" rspace="0em">$2</mo>')
    .replace(BOLD, (_, tag: string, c: string) => `<${tag} mathvariant="normal">${boldLetter(c)}</${tag}>`)
    .replace(CARET, '<mo>\u02c6</mo>').replace(COLON, '<mo lspace="0em" rspace="0.1667em">:</mo>');
}

/** SEVERAL LINES, ONE DISPLAY. Lines printed as separate displays are each centred on their own: the
 * half line's E_x stood alone in the middle with its longer E_y line under it, and the two integrals of
 * the rod level with an end sat at two different places, their "=" signs nowhere near each other. Lines
 * that are each one equation are set as one aligned block at their first "=", a gap apart, as the page's
 * answer is; a line that is already a block of its own is left as it is. */
export function displays(lines: string[]): string[] {
  if (lines.length < 2 || lines.some(t => /\\begin|&/.test(t))) return lines;
  const at = (t: string) => {
    let depth = 0;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '{') depth++;
      else if (t[i] === '}') depth--;
      else if (t[i] === '=' && depth === 0) return i;
    }
    return -1;
  };
  if (lines.some(t => at(t) <= 0)) return lines;
  return [String.raw`\begin{aligned}${lines.map(t => `${t.slice(0, at(t))}&${t.slice(at(t))}`).join(String.raw`\\[0.75em]`)}\end{aligned}`];
}

/** CHROMIUM ENDS A SQUARE ROOT IN BLANK SPACE. Its MathML sets every <msqrt> box 0.42em wider than the
 * root it draws, past the end of the bar -- 2.9px on the taller radical, 7px on the usual one -- so the
 * handout printed "(√(R² + z²)  − z)", "√2  k|λ|" and "−1/√(L² + r²)  − (−1/r)": maths that looks unset,
 * on every potential and rod. WebKit sets the same roots tight, so no fixed margin is right in both:
 * each root is measured once the fonts are in, and pulled in by exactly the blank it ends with. Without
 * script the page reads as before, the gaps and all. */
const FIT_ROOTS = `(function(){function fit(){var roots=document.querySelectorAll('msqrt');for(var i=0;i<roots.length;i++){var root=roots[i],right=-Infinity;root.style.marginInlineEnd='';for(var j=0;j<root.children.length;j++)right=Math.max(right,root.children[j].getBoundingClientRect().right);var gap=root.getBoundingClientRect().right-right;if(gap>0.5&&gap<20)root.style.marginInlineEnd=(-gap)+'px';}}if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);else fit();})();`;

/** The board's lines carry the classes that light a factor on the page, \htmlClass{fx fx-…}{…}. Paper has
 * nothing to light, and KaTeX sets an untrusted \htmlClass as an error in red; the group stays a group.
 * And a range's \colon is the bare colon the copy already sets as punctuation (COLON): KaTeX's own writes
 * a space before it, and the bounds printed "y : −L/2 → L/2". */
const plain = (tex: string) => tex.replace(/\\htmlClass\{[^{}]*\}/g, '').replace(/\\colon/g, ':');

/** Where a line's first relation is, outside every brace: its "=", or the "≈" of a sum. */
function relationAt(tex: string): number {
  let depth = 0;
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '\\') {
      const name = /^\\([A-Za-z]+|.)/.exec(tex.slice(i))![0];
      if (depth === 0 && name === '\\approx') return i;
      i += name.length - 1;
    } else if (c === '=' && depth === 0) return i;
  }
  return -1;
}

/** A board line and its second half as one chain, each "=" under the first. The page sets the second half
 * under the first behind a phantom of the left-hand side, \phantom{E_x}=…, so that its "=" lines up;
 * printed as a display of its own, the phantom was a blank where the left-hand side should be. The exact
 * sums' second half is already two rows; each row is a row of the chain. */
export function chained(tex: string, finish?: string): string {
  const at = relationAt(tex);
  if (!finish || at <= 0) return tex;
  const body = /^\\begin\{aligned\}([\s\S]*)\\end\{aligned\}$/.exec(finish.trim())?.[1] ?? finish;
  const rows = body.split(/\\\\(?:\[[^\]]*\])?/).map(r => r.trim().replace(/^\\phantom\{[^{}]*\}/, '').replace(/^&/, '').trim()).filter(Boolean);
  return String.raw`\begin{aligned}${tex.slice(0, at)}&${tex.slice(at)}${rows.map(r => String.raw`\\[0.75em]&${r}`).join('')}\end{aligned}`;
}

/** A heading and the first block under it, kept on one sheet. Printed to Letter, the bisector's copy ended
 * its first sheet on "Working" with every step on the next, and its second on "Checks" with every check
 * on the third. `break-after: avoid` on a heading is the rule for this, but an engine may honour it only
 * between siblings; a heading inside one unbreakable block with what it heads holds in every engine. */
const keep = (head: string, blocks: string[]) => blocks.length ? `<div class="keep">${head}\n${blocks[0]}</div>\n${blocks.slice(1).map(b => `${b}\n`).join('')}` : '';

/** A self-contained HTML copy a student can save offline and print later. No network, no app chrome.
 *
 * IT WAS NOT FIT TO HAND OUT. The equations were TeX source in a monospaced box; the figure was the
 * SVG with none of the styles that draw it -- no axes, P a black blob, and no field at all, since
 * the field is not in the SVG; the "parameters" were the slider positions as raw floats, an arc
 * angle of 3.141592653589793 radians on a lesson about a rod; and the result stopped at E_x on the
 * lessons whose answer has an E_y too. Now: the figure as drawn, the setup, the integral and every
 * line of the result, set as mathematics. The numbers are gone with the parameter list -- the page
 * itself prints none, and the copy should not be where they come back. Its one address is the live
 * lesson's, under the title: a student holding the paper had no way back to the page it came from. */
export function artifactHtml(a: LessonArtifact) {
  // The textbook lesson comes first, and may already contain a result or the last line of a
  // differentiation. The old guards only compared the later Working with The result, so seven lessons’
  // copies printed a lesson's equation again. Keep its first display and point back by the
  // section's name. The explanation still stays in the working, and the link works offline;
  // on paper "above" and the section name are enough to find the equation.
  const displayKey = (tex: string) => mathml(tex).replace(/<annotation\b[\s\S]*?<\/annotation>/g, '').replace(/\s+/g, ' ');
  const taughtDisplays = new Map<string, {anchor: string; heading: string}>();
  for (const [si, section] of (a.lesson?.sections ?? []).entries()) for (const [bi, block] of section.body.entries()) {
    if (typeof block === 'string') continue;
    const key = displayKey(block.tex);
    if (!taughtDisplays.has(key)) taughtDisplays.set(key, {anchor: `lesson-equation-${si}-${bi}`, heading: section.heading});
  }
  const reference = (where: {anchor: string; heading: string}) => `<p class="equation-reference">This equation appears above in <a href="#${where.anchor}">${escapeHtml(where.heading)}</a>.</p>`;
  const display = (tex: string) => {
    const where = taughtDisplays.get(displayKey(tex));
    return where ? reference(where) : mathml(tex);
  };
  const lessonDisplay = (tex: string, si: number, bi: number) => {
    const where = taughtDisplays.get(displayKey(tex))!;
    return where.anchor === `lesson-equation-${si}-${bi}`
      ? mathml(tex).replace('<math ', `<math id="${where.anchor}" `)
      : reference(where);
  };
  const figure = a.svg
    ? `<figure>${a.svg}${a.coordinate ? `<figcaption>${mathml(a.coordinate, false)}</figcaption>` : ''}</figure>`
    : '';
  // The page writes "with k = 1/(4πε₀)" beside its result. The copy printed kQ/… with k never said --
  // and then, once it did say it, said it after the result, a page below the integral where k is
  // first used. It is said where the reader first meets it: in One piece, where the board first writes
  // it, or under the integral in a copy that has no board.
  const kNote = `<p class="where">Here ${mathml(String.raw`k=\dfrac{1}{4\pi\varepsilon_0}`, false)}.</p>`;
  // A lesson that says it already (the bisector's One piece: "Coulomb's law, with k = 1/(4πε₀)") is where
  // the reader met it; a second "Here k = …" under the integral, two sheets on, said it again.
  let kSaid = !!a.lesson?.sections.some(s => s.body.some(b => K_SAID.test(typeof b === 'string' ? b : b.tex)));
  // THE METHOD, STAGE BY STAGE (see `lessonArtifact`): each stage under its name, the run's one sentence
  // for it, then the board's line as the board sets it -- the cancellation over what survives, the line's
  // second half under its first, and what its new symbols mean under the line.
  const stage = (s: BuildingStage, last: boolean) => {
    const l = s.line, aside = (html: string) => `<p class="aside">${html}</p>`;
    // Where nothing cancels the board says so in full, and the run's sentence is the same thing said
    // shorter: printed one over the other, "Nothing cancels: every piece is above the x-axis" came twice.
    const parts = [`<h3>${escapeHtml(s.name)}</h3>`, ...(l.nothing ? [] : [`<p class="gloss">${proseHtml(s.gloss)}</p>`])];
    if (l.cancels) parts.push(mathml(plain(l.cancels)));
    if (l.cancelsSay) parts.push(aside(proseHtml(l.cancelsSay)));
    if (l.nothing) parts.push(aside(proseHtml(l.nothing)));
    parts.push(mathml(chained(plain(l.tex), l.finish && plain(l.finish))));
    // What the line's new symbols mean, centred under the line it explains, as a book sets a "where".
    for (const gloss of [l.where, l.swaps?.join(String.raw`,\qquad `), l.merged]) if (gloss) parts.push(`<p class="aside sym">${mathml(plain(gloss), false)}</p>`);
    if (l.also) parts.push(aside(`${mathml(plain(l.also), false)} survives too.`));
    if (l.alsoWhere) parts.push(`<p class="aside sym">${mathml(plain(l.alsoWhere), false)}</p>`);
    if (last && a.along) parts.push(`<p>${proseHtml(a.along.text)}</p>`, mathml(a.along.tex));
    if (!kSaid && [l.cancels, l.tex, l.finish, l.also].some(t => t && usesK(plain(t)))) { parts.push(kNote); kSaid = true; }
    return `<div class="stage">${parts.join('\n')}</div>`;
  };
  // WITH A LESSON, THE COPY TEACHES THE METHOD ONCE. The lesson at the top already goes through the setup and
  // the five stages under the same names, and the copy then printed Setup again and Building the integral
  // with the same five headings, the same step written a second time in the board's convention (ΔE as a
  // vector with r̂ᵢ, after the lesson's magnitude), and OpenStax listed twice: a student read the second
  // pass as a second method, or a printing error, and the bisector ran to five sheets. Where a lesson leads,
  // the build and the Setup heading go; the problem itself stays, as one boxed statement, so the copy still
  // says what is asked; and the sources join the lesson's books. Without a lesson the copy is as it was.
  const taughtFirst = !!a.lesson;
  const building = !taughtFirst && a.building?.length ? keep('<h2>Building the integral</h2>', a.building.map((s, i) => stage(s, i === a.building!.length - 1))) : '';
  // A potential lesson promises that "E falls out of one derivative"; the copy ended at V without it,
  // and then printed only the derivative's last line.
  const steps = (list: WorkedStep[]) => list.map(w => `<div class="step"><p>${proseHtml(w.text)}</p>\n${display(w.tex)}</div>`);
  const derived = a.back?.length
    ? keep('<h2>The field, by differentiating</h2>', steps(a.back))
    : a.derived?.length
    ? keep('<h2>The field, by differentiating</h2>', [`<div class="result">${a.derived.map(tex => display(tex)).join('\n')}</div>`])
    : '';
  // THE INTEGRAL WAS PRINTED TWICE. Most lessons' first worked step takes the constants outside, and
  // the integral the copy prints is already in that form: in eleven of sixteen copies the same display
  // stood under "The integral" and again as the first line of the working. The step's sentence -- why
  // the constants come out -- is kept, as a note under the integral, and the working starts after it.
  const repeats = !!a.worked?.length && sameTex(a.worked[0].tex, a.integralTex);
  // Where there are two integrals the note follows both, and says which one it is about. Between them,
  // "kλ is the same for every piece, so it comes outside the integral" read as a remark on the gap
  // between E_x's integral and E_y's -- and on the ramp E_y has kλ₀/L outside, not kλ₀r/L.
  const component = /^([A-Za-z])_([a-z])=/.exec(a.integralTex), opening = repeats ? a.worked![0].text : '';
  const said = a.secondaryIntegralTex && component ? `In $${component[1]}_${component[2]}$, ${/^[A-Z][a-z]/.test(opening) ? opening[0].toLowerCase() + opening.slice(1) : opening}` : opening;
  const note = repeats ? `<p class="note">${proseHtml(said)}</p>\n` : '';
  const shown = repeats ? a.worked!.slice(1) : a.worked ?? [];
  // AND THE ANSWER PRINTED TWICE. On the ring, the arc's potential and the infinite line the working's
  // last display is the result, and on the sheet the result is that line with 2πkσ = in front: the same
  // equation stood at the foot of the Working and again under "The result" a heading below it. The last
  // step's sentence -- why the answer is what it is -- keeps its place, and the display it arrives at is
  // the one under "The result".
  //
  // And where the last line is the result with a remark after it, as the ring's potential ends on
  // "V = kQ/√(R² + z²), V(0) = kQ/R": the lesson's Add them up ended on that V, the working's last
  // display repeated it, and The result printed it a third time, one under the other. Only the remark,
  // V(0) = kQ/R, stays under the step's sentence; the result says the rest.
  const last = shown.at(-1), arrives = !!last && !!a.results.length && restates(a.results[0], last.tex);
  const clauses = last && !last.tex.includes('\\begin') ? last.tex.split(/,\s*\\qquad\s*/) : [];
  const leads = !arrives && clauses.length > 1 && !!a.results.length && restates(a.results[0], clauses[0]);
  const closing = arrives
    ? [`<div class="step"><p>${proseHtml(last!.text)}</p></div>`]
    : leads
    ? [`<div class="step"><p>${proseHtml(last!.text)}</p>\n${display(clauses.slice(1).join(String.raw`,\qquad `))}</div>`]
    : [];
  const working = shown.length
    ? keep('<h2>Working</h2>', [...steps(arrives || leads ? shown.slice(0, -1) : shown), ...closing])
    : '';
  const constant = !kSaid && [a.integralTex, a.secondaryIntegralTex ?? '', ...a.results, ...(a.derived ?? []), ...[...(a.worked ?? []), ...(a.back ?? [])].map(w => w.tex), ...(a.checks ?? []).map(c => c.formula)].some(usesK)
    ? `${kNote}\n`
    : '';
  // What the page checks the answer against, and where the physics is written up. A handout without
  // them gave a student nothing to test the result by and nowhere to read further.
  const checks = a.checks?.length
    ? keep('<h2>Checks</h2>', a.checks.map(c => `<div class="check"><h3>${escapeHtml(c.title)}</h3>\n${mathml(c.formula)}\n<p>${symbolsHtml(c.explanation)}</p></div>`))
    : '';
  // The footer closes the copy with the sources it follows: printed on its own, it took the ring's
  // whole third sheet.
  const footer = '<footer>Saved from Field Builder. The equations are MathML, so this page needs no network to read or print.</footer>';
  // A printed link is only its words, so the address is printed under them.
  // A SOURCE THE LESSON ALREADY NAMES IS NOT LISTED AGAIN. The potentials' read row names "§7.3 …; §7.4,
  // Determining Field from Potential" under the §7.3 address only, so the problem's own §7.4 source passed
  // the address check and OpenStax stood first and fourth in one list. A source whose section a row of the
  // same publisher already names is that row.
  const readUrls = new Set((a.lesson?.read ?? []).map(r => r.url).filter(Boolean));
  const publisher = (t: string) => /^[^\s,·]+/.exec(t)?.[0] ?? '';
  const named = (s: {title: string}) => {
    const section = /§\d+\.\d+/.exec(s.title)?.[0];
    return !!section && (a.lesson?.read ?? []).some(r => publisher(r.book) === publisher(s.title) && r.where.includes(section));
  };
  const moreReading = taughtFirst ? (a.sources ?? []).filter(s => !readUrls.has(s.url) && !named(s)) : [];
  // And what is left is set as the lesson's rows are, the book in italics and then where in it: the
  // problems write "OpenStax · University Physics 2, §6.3, …", and under the rows' "OpenStax, University
  // Physics Volume 2, §5.5, …" the same book read as a different one in a different hand. A book a row
  // already names keeps that row's name for it.
  const cited = (title: string) => {
    const [maker, rest] = title.includes(' · ') ? title.split(' · ', 2) : ['', title];
    const cut = rest.indexOf(', ');
    const book = cut > 0 ? rest.slice(0, cut) : rest, where = cut > 0 ? rest.slice(cut + 2) : '';
    const row = maker ? (a.lesson?.read ?? []).find(r => publisher(r.book) === maker) : undefined;
    return {book: row?.book ?? (maker ? `${maker}, ${book}` : book), where};
  };
  const sources = taughtFirst
    ? `${footer}\n`
    : a.sources?.length
    ? keep('<h2>Sources</h2>', [`<ul class="sources">${a.sources.map(s => `<li><a href="${escapeHtml(s.url)}">${escapeHtml(s.title)}</a><span class="url">${escapeHtml(s.url)}</span></li>`).join('\n')}</ul>\n${footer}`])
    : `${footer}\n`;
  // THE LESSON LEADS THE COPY'S TEACHING, as it leads the page and the page's print: the lead, the teaching under its
  // headings with its equations set as the copy sets every other, and the books to read it in -- each with its
  // address printed, since on paper a link is only its words. Kept plain: no disclosure, no buttons. Its headings
  // are `taught`: some share a name with a stage of the build below (What cancels, Add them up), and are not it.
  // THE PROBLEM COMES FIRST, THEN THE LESSON. The figure and the boxed problem were printed after the whole
  // lesson and its reading list, so the handout stated what is asked only once it had answered it, and the
  // box read as a footnote to Purcell. Now: title, lede, figure, the problem, then the lesson that solves it.
  const taught = a.lesson
    ? `<section class="lesson">\n${keep('<h2>The lesson</h2>', [`<p class="lead">${proseHtml(a.lesson.lead)}</p>`,
      ...a.lesson.sections.map((s, si) => `<div class="keep"><h3 class="taught">${escapeHtml(s.heading)}</h3>\n${s.body.map((b, bi) => typeof b === 'string' ? `<p>${proseHtml(b)}</p>` : lessonDisplay(b.tex, si, bi)).join('\n')}</div>`),
      ...(a.lesson.read.length || moreReading.length ? [`<div class="keep"><h3 class="taught">Read it in a textbook</h3>\n<ul class="sources">${[...a.lesson.read.map(r => `<li>${r.url ? `<a href="${escapeHtml(r.url)}"><cite>${escapeHtml(r.book)}</cite></a>` : `<cite>${escapeHtml(r.book)}</cite>`}, ${escapeHtml(r.where)}${r.url ? `<span class="url">${escapeHtml(r.url)}</span>` : ''}</li>`),
        ...moreReading.map(s => { const c = cited(s.title); return `<li><a href="${escapeHtml(s.url)}"><cite>${escapeHtml(c.book)}</cite></a>${c.where ? `, ${escapeHtml(c.where)}` : ''}<span class="url">${escapeHtml(s.url)}</span></li>`; })].join('\n')}</ul></div>`] : [])])}</section>\n`
    : '';
  // The live lesson's address, in full: on paper a link is only what is printed.
  const address = a.address ? `<p class="address">The live lesson, as saved: <a href="${escapeHtml(a.address)}">${escapeHtml(a.address)}</a></p>\n` : '';
  // The maths names its faces. The generic `math` family did not reach one with a MATH table in
  // Chromium, so the display integral came out at text size and \left( \right) never grew: a
  // handout that looked unset. STIX Two ships with macOS, Latin Modern with TeX, Cambria with Windows.
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(a.title)} · Field Builder</title>
<style>
@page { size: letter; margin: 12mm; }
html,body { background:#fff; color:#171717; font: 16px/1.55 "Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif; margin:0; }
main { max-width: 720px; margin: 0 auto; padding: 24px 18px 32px; }
.kicker { margin: 0 0 18px; color:#5e5e5e; font-size: 12px; }
h1 { font: 600 30px/1.15 "Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: -0.015em; margin: 0 0 8px; }
h2 { font: 600 19px/1.25 "Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif; margin: 28px 0 8px; }
h2, h3 { break-after: avoid; }
.keep { break-inside: avoid; }
p { max-width: 62ch; margin: 0 0 10px; }
.lede { color:#5e5e5e; font-size: 16px; }
.address { color:#5e5e5e; font-size: 13px; overflow-wrap: anywhere; }
.address a { color: #171717; }
figure { margin: 22px 0 6px; break-inside: avoid; }
figure svg { display:block; width: 100%; height: auto; max-height: 440px; }
figcaption { margin-top: 4px; color:#5e5e5e; font-size: 15px; }
math { font-family: "STIX Two Math", "Latin Modern Math", "Cambria Math", math; font-size: 1.12em; }
math[display="block"] { margin: 10px 0 14px; }
.result math[display="block"] { margin: 6px 0; }
/* An aligned block is a two-column table: "E_x" | "= …". MathML Core reads neither KaTeX's
   columnspacing="0em" nor its columnalign="right left": Chromium pads every cell 0.4em each side and
   centres it, so "E_x   =" printed with a gap TeX never sets and each row's "=" sat at its own place.
   Written here as the CSS it stands for. */
mtable[columnalign^="right left"] > mtr > mtd { padding-left: 0; padding-right: 0; }
/* Chromium sets a cell's MathML content at its start whatever text-align says, so the shorter left
   column hung at the left with a gap before its "=" (E_x over E_x(π)). Its own -webkit-right moves it. */
mtable[columnalign^="right left"] > mtr > mtd:nth-child(odd) { text-align: right; text-align: -webkit-right; }
mtable[columnalign^="right left"] > mtr > mtd:nth-child(even) { text-align: left; text-align: -webkit-left; }
.step, .stage { break-inside: avoid; }
.nobr { white-space: nowrap; }
.step p { margin: 14px 0 2px; }
.where { margin-top: 12px; }
.note { margin: -4px 0 10px; }
.equation-reference { color:#5e5e5e; }
.equation-reference a { color:#171717; }
.problem { max-width: none; margin: 18px 0 6px; padding: 10px 14px; border: 1px solid #d4d4d4; border-radius: 6px; }
.route { color:#5e5e5e; }
.stage .gloss { margin: 0 0 4px; color:#5e5e5e; }
.stage .aside { margin: -6px 0 8px; }
.stage .sym { max-width: none; text-align: center; }
.stage .where { margin-top: 0; }
.g { font-family: "STIX Two Math", "Latin Modern Math", "Cambria Math", serif; font-style: italic; }
.g.up { font-style: normal; }
h3 { font: 600 16px/1.3 "Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif; margin: 18px 0 2px; }
.stage h3 { margin: 18px 0 4px; }
.check { break-inside: avoid; }
.check math[display="block"] { margin: 6px 0 8px; }
.sources { margin: 0; padding-left: 20px; }
.sources li { margin: 0 0 10px; }
.sources a { color: #171717; }
.lesson { margin: 18px 0 8px; padding-left: 14px; border-left: 2px solid #8fc0ba; }
.lesson h2 { margin-top: 0; }
.lesson .lead { font-size: 16px; }
.lesson cite { font-style: italic; }
.url { display: block; color: #5e5e5e; font-size: 12px; overflow-wrap: anywhere; }
footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #d4d4d4; color: #5e5e5e; font-size: 12px; }
</style></head>
<body><main>
<p class="kicker">Field Builder · saved copy</p>
<h1>${escapeHtml(a.title)}</h1>
<p class="lede">${escapeHtml(a.subtitle)}</p>
${address}${figure}
${taughtFirst ? `<p class="problem">${proseHtml(a.setup)}</p>\n${taught}` : keep('<h2>Setup</h2>', [`<p>${proseHtml(a.setup)}</p>`])}${building}${keep(`<h2>${a.secondaryIntegralTex ? 'The integrals' : 'The integral'}</h2>`, [displays([a.integralTex, ...(a.secondaryIntegralTex ? [a.secondaryIntegralTex] : [])]).map(tex => display(tex)).join('\n') + (a.route ? `\n<p class="note route">${proseHtml(a.route)}</p>` : '')])}${note}${constant}${working}${keep('<h2>The result</h2>', [`<div class="result">${displays(a.results).map(tex => display(tex)).join('\n')}</div>`])}${derived}${checks}${sources}</main>
<script>${FIT_ROOTS}</script>
</body></html>`;
}

/** Properties a child takes from its parent. Written on a child only where it differs, so the copy
 * stays small: everything else it inherits, exactly as it did on the page. */
const INHERITED = ['color', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'font-family', 'font-size', 'font-style', 'font-weight', 'letter-spacing',
  'text-anchor', 'dominant-baseline', 'paint-order', 'visibility', 'stroke-miterlimit', 'shape-rendering', 'marker-start', 'marker-mid', 'marker-end'];
/** Properties that are each element's own, with the value that means "nothing set". */
// `vector-effect` above all: the charge's own plane is drawn under a matrix that scales it forty
// times, and its strokes keep their width only because they are told not to scale.
const OWN: [string, string][] = [['opacity', '1'], ['stop-color', 'rgb(0, 0, 0)'], ['stop-opacity', '1'], ['filter', 'none'], ['transform', 'none'],
  ['vector-effect', 'none'], ['clip-path', 'none'], ['mask', 'none'], ['mix-blend-mode', 'normal']];
/** The figure's own controls -- the view cube and the gesture legend -- which act only on a screen
 * and are left off the copy, as they are off the printed page. */
const SCREEN_ONLY = '.cd-cube, .cd-help, [role=button]';
/** The corner that says what scale the run's arrows are at -- "Cut into pieces", "The piece's arrow drawn
 * larger", "In the limit" -- speaks to a stage of the run on the screen, and on paper it named nothing: a
 * copy saved at rest printed "Cut into pieces" under a figure that was not being cut. Found by its place,
 * and by its words should the place change. */
const RUN_NOTE = '.cd-footer[data-dim="pieces"]';
const isRunNote = (el: Element) => el.matches(RUN_NOTE) || (el.classList.contains('cd-footer') && /^(Cut into|In the limit)|drawn (larger|smaller)/.test(el.textContent ?? ''));

/** The figure as it is drawn, for the offline copy: the SVG with every style it is drawn with
 * written onto it, and the field under it -- the canvas of the flat view, or the 3D scene -- laid in
 * as a picture behind the drawing, in the same window the page clips it to.
 *
 * The styles are read from the live drawing, so the copy is the figure the reader was looking at,
 * stage and all, rather than a re-render that could disagree with it. Call it with the page in
 * the light theme: a copy is for paper. */
export function figureCopy(stage: Element): string {
  const svg = stage.querySelector('svg.cd-svg');
  if (!svg) return '';
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll('*')], clones = [copy, ...copy.querySelectorAll('*')];
  const computed = new Map<Element, CSSStyleDeclaration>();
  const style = (el: Element) => { let s = computed.get(el); if (!s) { s = getComputedStyle(el); computed.set(el, s); } return s; };
  const drop: Element[] = [];
  originals.forEach((el, i) => {
    const clone = clones[i];
    // Hover text names the pieces by number ("Piece 2 of 5"), and nothing in a copy can be hovered.
    if (el.tagName.toLowerCase() === 'title' || el.matches(SCREEN_ONLY) || isRunNote(el)) { drop.push(clone); return; }
    const own = style(el);
    if (own.display === 'none') { drop.push(clone); return; }
    const parent = el === svg ? null : el.parentElement && style(el.parentElement);
    const decls: string[] = [];
    for (const prop of INHERITED) {
      const value = own.getPropertyValue(prop);
      if (!value) continue;
      if (!parent || el.hasAttribute(prop) || parent.getPropertyValue(prop) !== value) decls.push(`${prop}:${value}`);
    }
    for (const [prop, none] of OWN) {
      const value = own.getPropertyValue(prop);
      if (!value || value === none) continue;
      decls.push(`${prop}:${value}`);
      if (prop === 'transform') decls.push(`transform-origin:${own.getPropertyValue('transform-origin')}`, `transform-box:${own.getPropertyValue('transform-box')}`);
    }
    if (decls.length) {
      const before = clone.getAttribute('style');
      clone.setAttribute('style', `${before ? before.replace(/;?\s*$/, ';') : ''}${decls.join(';')}`);
    }
  });
  for (const el of drop) el.remove();
  // The field, under the drawing, as the page layers it.
  const layers = [...stage.querySelectorAll('.cd-field-canvas, .cd-field-stage')].map(snapshotLayer).filter((u): u is string => !!u);
  if (layers.length) {
    const ns = 'http://www.w3.org/2000/svg';
    const defs = copy.querySelector('defs') ?? copy.insertBefore(document.createElementNS(ns, 'defs'), copy.firstChild);
    const clip = document.createElementNS(ns, 'clipPath');
    clip.setAttribute('id', 'fb-copy-window');
    const rect = document.createElementNS(ns, 'rect');
    for (const [k, v] of Object.entries({x: PLOT.x, y: PLOT.y, width: PLOT.width, height: PLOT.height, rx: PLOT.radius})) rect.setAttribute(k, String(v));
    clip.appendChild(rect);
    defs.appendChild(clip);
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('clip-path', 'url(#fb-copy-window)');
    const [, , width, height] = (copy.getAttribute('viewBox') ?? '0 0 720 430').split(/[\s,]+/).map(Number);
    for (const url of layers) {
      const image = document.createElementNS(ns, 'image');
      for (const [k, v] of Object.entries({href: url, x: '0', y: '0', width: String(width || 720), height: String(height || 430), preserveAspectRatio: 'none'})) image.setAttribute(k, v);
      group.appendChild(image);
    }
    copy.insertBefore(group, defs.nextSibling);
  }
  copy.removeAttribute('tabindex');
  return copy.outerHTML;
}

export function downloadArtifact(filename: string, html: string) {
  const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printLesson() {
  window.print();
}
