import katex from 'katex';
import {snapshotLayer} from '../diagrams/snapshot';
import {PLOT} from '../diagrams/vectorfield';
import type {Problem} from '../problems/types';
import {resultLines, workedSteps} from '../workbench/derivation';

/** One step of worked algebra: a sentence with its symbols written $…$, and the line it arrives at. */
export type WorkedStep = {text: string; tex: string};

/** One of a lesson's limiting cases, as the copy prints it: its title, its formula and why. */
export type LessonCheck = {title: string; formula: string; explanation: string};

export type LessonArtifact = {
  title: string;
  subtitle: string;
  setup: string;
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
 * evaluation; on the infinite line's angular route, kλ/r taken out and ∫cos θ dθ = sin θ, then the
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
 * route the copy said "use y = r tan θ to sweep the whole line" and printed the θ integral, and then
 * worked a rod of length L that neither had mentioned. The page's own references show the route's
 * setup too. And the copy carries the lesson's limiting cases and its sources, which a handout is
 * the place for: it had neither, so a student holding it could check nothing and look nothing up. */
export function lessonArtifact(p: Problem, algebra: Problem = p): LessonArtifact {
  const {worked, back} = lessonWorking(p, algebra);
  return {title: p.title, subtitle: p.subtitle, setup: algebra.setup, coordinate: p.coordinate, integralTex: algebra.integralTex,
    secondaryIntegralTex: algebra.secondaryIntegralTex, results: resultLines(algebra),
    worked, back, derived: back.slice(-1).map(w => w.tex),
    checks: p.limits.map(l => ({title: l.title, formula: l.formula, explanation: l.explanation})), sources: p.sources};
}

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
  return parts.map((part, i) => {
    if (i % 2 === 0) return escapeHtml(i > 0 ? part.replace(/^[.,;:!?)’]+/, '') : part);
    const stop = /^[.,;:!?)’]+/.exec(parts[i + 1] ?? '')?.[0] ?? '';
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
 * together in five lessons' working. */
const ORDINARY_BEFORE = new RegExp(String.raw`(</(?:mi|mn|msub|msup|msubsup|mfrac|msqrt|mover|mrow)>)((?:<msup><mrow>)?${OPERATOR})`, 'g');
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
 * came out as a plain italic E, the same letter as the component E_x beside it. */
const BOLD = /<mi mathvariant="bold">([A-Za-z])<\/mi>/g;
const boldLetter = (c: string) => String.fromCodePoint((c <= 'Z' ? 0x1d400 : 0x1d41a) + c.charCodeAt(0) - (c <= 'Z' ? 65 : 97));
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
    .replace(BOLD, (_, c: string) => `<mi mathvariant="normal">${boldLetter(c)}</mi>`)
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

/** A self-contained HTML copy a student can save offline and print later. No network, no app chrome.
 *
 * IT WAS NOT FIT TO HAND OUT. The equations were TeX source in a monospaced box; the figure was the
 * SVG with none of the styles that draw it -- no axes, P a black blob, and no field at all, since
 * the field is not in the SVG; the "parameters" were the slider positions as raw floats, an arc
 * angle of 3.141592653589793 radians on a lesson about a rod; and the result stopped at E_x on the
 * lessons whose answer has an E_y too. Now: the figure as drawn, the setup, the integral and every
 * line of the result, set as mathematics. The numbers are gone with the parameter list -- the page
 * itself prints none, and the copy should not be where they come back. */
export function artifactHtml(a: LessonArtifact) {
  const figure = a.svg
    ? `<figure>${a.svg}${a.coordinate ? `<figcaption>${mathml(a.coordinate, false)}</figcaption>` : ''}</figure>`
    : '';
  // A potential lesson promises that "E falls out of one derivative"; the copy ended at V without it,
  // and then printed only the derivative's last line.
  const steps = (list: WorkedStep[]) => list.map(w => `<div class="step"><p>${proseHtml(w.text)}</p>\n${mathml(w.tex)}</div>`).join('\n');
  const derived = a.back?.length
    ? `<h2>The field, by differentiating</h2>\n${steps(a.back)}\n`
    : a.derived?.length
    ? `<h2>The field, by differentiating</h2>\n<div class="result">${a.derived.map(tex => mathml(tex)).join('\n')}</div>\n`
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
  const last = shown.at(-1), arrives = !!last && !!a.results.length && restates(a.results[0], last.tex);
  const working = shown.length
    ? `<h2>Working</h2>\n${steps(arrives ? shown.slice(0, -1) : shown)}${arrives ? `\n<div class="step"><p>${proseHtml(last!.text)}</p></div>` : ''}\n`
    : '';
  // The page writes "with k = 1/(4πε₀)" beside its result. The copy printed kQ/… with k never said --
  // and then, once it did say it, said it after the result, a page below the integral where k is
  // first used. It is said where the reader first meets it, under the integral.
  const constant = [a.integralTex, a.secondaryIntegralTex ?? '', ...a.results, ...(a.derived ?? []), ...[...(a.worked ?? []), ...(a.back ?? [])].map(w => w.tex), ...(a.checks ?? []).map(c => c.formula)].some(usesK)
    ? `<p class="where">Here ${mathml(String.raw`k=\dfrac{1}{4\pi\varepsilon_0}`, false)}.</p>\n`
    : '';
  // What the page checks the answer against, and where the physics is written up. A handout without
  // them gave a student nothing to test the result by and nowhere to read further.
  const checks = a.checks?.length
    ? `<h2>Checks</h2>\n${a.checks.map(c => `<div class="check"><h3>${escapeHtml(c.title)}</h3>\n${mathml(c.formula)}\n<p>${greekHtml(c.explanation)}</p></div>`).join('\n')}\n`
    : '';
  // A printed link is only its words, so the address is printed under them.
  const sources = a.sources?.length
    ? `<h2>Sources</h2>\n<ul class="sources">${a.sources.map(s => `<li><a href="${escapeHtml(s.url)}">${escapeHtml(s.title)}</a><span class="url">${escapeHtml(s.url)}</span></li>`).join('\n')}</ul>\n`
    : '';
  // The maths names its faces. The generic `math` family did not reach one with a MATH table in
  // Chromium, so the display integral came out at text size and \left( \right) never grew: a
  // handout that looked unset. STIX Two ships with macOS, Latin Modern with TeX, Cambria with Windows.
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(a.title)} · Field Builder</title>
<style>
@page { size: letter; margin: 12mm; }
html,body { background:#fff; color:#0e2333; font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; margin:0; }
main { max-width: 720px; margin: 0 auto; padding: 24px 18px 32px; }
.kicker { margin: 0 0 18px; color:#4a6274; font-size: 12px; }
h1 { font: 400 30px/1.15 Georgia, "Times New Roman", serif; margin: 0 0 8px; }
h2 { font: 400 20px/1.2 Georgia, "Times New Roman", serif; margin: 28px 0 8px; }
p { max-width: 62ch; margin: 0 0 10px; }
.lede { color:#4a6274; font-size: 16px; }
figure { margin: 22px 0 6px; break-inside: avoid; }
figure svg { display:block; width: 100%; height: auto; max-height: 440px; }
figcaption { margin-top: 4px; color:#4a6274; font-size: 15px; }
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
.step { break-inside: avoid; }
.nobr { white-space: nowrap; }
.step p { margin: 14px 0 2px; }
.where { margin-top: 12px; }
.note { margin: -4px 0 10px; }
.g { font-family: "STIX Two Math", "Latin Modern Math", "Cambria Math", serif; font-style: italic; }
.g.up { font-style: normal; }
h3 { font: 600 15px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 18px 0 2px; }
.check { break-inside: avoid; }
.check math[display="block"] { margin: 6px 0 8px; }
.sources { margin: 0; padding-left: 20px; }
.sources li { margin: 0 0 10px; }
.sources a { color: #0e2333; }
.url { display: block; color: #4a6274; font-size: 12px; overflow-wrap: anywhere; }
footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #d8e1e7; color: #4a6274; font-size: 12px; }
</style></head>
<body><main>
<p class="kicker">Field Builder · saved copy</p>
<h1>${escapeHtml(a.title)}</h1>
<p class="lede">${escapeHtml(a.subtitle)}</p>
${figure}
<h2>Setup</h2>
<p>${proseHtml(a.setup)}</p>
<h2>${a.secondaryIntegralTex ? 'The integrals' : 'The integral'}</h2>
${displays([a.integralTex, ...(a.secondaryIntegralTex ? [a.secondaryIntegralTex] : [])]).map(tex => mathml(tex)).join('\n')}
${note}${constant}${working}<h2>The result</h2>
<div class="result">${displays(a.results).map(tex => mathml(tex)).join('\n')}</div>
${derived}${checks}${sources}
<footer>Saved from Field Builder. The equations are MathML, so this page needs no network to read or print.</footer>
</main>
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
    if (el.tagName.toLowerCase() === 'title' || el.matches(SCREEN_ONLY)) { drop.push(clone); return; }
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
