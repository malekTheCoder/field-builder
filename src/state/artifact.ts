import katex from 'katex';
import {snapshotLayer} from '../diagrams/snapshot';
import {PLOT} from '../diagrams/vectorfield';
import type {Problem} from '../problems/types';
import {BISECTOR_UNFOLD,ENDPOINT_UNFOLD,INFINITE_UNFOLD} from '../workbench/derivation';

/** One step of worked algebra: a sentence with its symbols written $…$, and the line it arrives at. */
export type WorkedStep = {text: string; tex: string};

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
  svg?: string;
};

/** The integration a lesson's Unfold shows, step by step, and the differentiation after it.
 *
 * THE HANDOUT WENT FROM THE INTEGRAL STRAIGHT TO THE ANSWER. A lecturer prints or hands round this
 * copy; on the ramp, the rod level with an end and the rod's potential -- the lessons whose integrals
 * a first-year student cannot guess -- it showed the integral and then the result with nothing
 * between, while the page had every step behind "Unfold the integration".
 *
 * These are the steps the panel unfolds (EquationWorkbench builds the same list): on the bisector and
 * the rod level with an end, the substitution written out in full from the board's last line, then
 * the lesson's own steps from its evaluation; on the infinite line's angular route, kλ/r taken out
 * and ∫cos θ dθ = sin θ, then the evaluation. `algebra` is the route the panel derives on -- the
 * infinite line's finite-rod limit, when that is the route chosen. */
export function lessonWorking(p: Problem, algebra: Problem = p): {worked: WorkedStep[]; back: WorkedStep[]} {
  const original = algebra.steps.find(s => s.kind === 'integrate')?.worked ?? [];
  const g = p.geometry, scalar = p.quantity === 'V';
  const worked = scalar ? original
    : g === 'bisector' ? [...BISECTOR_UNFOLD, ...original.slice(1)]
    : g === 'endpoint' ? [...ENDPOINT_UNFOLD, ...original.slice(1)]
    : algebra.id === 'infinite' && algebra.variable !== 'y' ? [...INFINITE_UNFOLD, ...original.slice(2)]
    : original;
  return {worked, back: algebra.steps.find(s => s.kind === 'gradient')?.worked ?? []};
}

/** Everything the offline copy prints about a lesson, but its figure. The result is the lesson's own
 * one line per component: the panel splits the ramp's E_y and the disk's field over two rows to fit
 * a column under three hundred pixels wide, and on a page of seven hundred the split bracket hung
 * half its contents off to the right of the line above. */
export function lessonArtifact(p: Problem, algebra: Problem = p): LessonArtifact {
  const {worked, back} = lessonWorking(p, algebra);
  return {title: p.title, subtitle: p.subtitle, setup: p.setup, coordinate: p.coordinate, integralTex: p.integralTex,
    secondaryIntegralTex: p.secondaryIntegralTex, results: [p.resultTex, ...(p.secondaryResultTex ? [p.secondaryResultTex] : [])],
    worked, back, derived: back.slice(-1).map(w => w.tex)};
}

/** Whether the TeX writes Coulomb's constant: once the macro names are gone, any k left is a symbol. */
const usesK = (tex: string) => tex.replace(/\\[A-Za-z]+/g, '').includes('k');

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** TeX as MathML: the browser sets it itself, with no script, no font files and no network, so a
 * copy opened on a train years later still reads as mathematics. The TeX rides along inside it as
 * an annotation, for anyone who wants to copy it. */
export function mathml(tex: string, display = true) {
  return spaceOperators(katex.renderToString(tex, {output: 'mathml', displayMode: display, throwOnError: false, strict: 'ignore'}));
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
 * bracket or a sign the operator follows on directly, as it does in TeX. */
const ORDINARY_BEFORE = new RegExp(String.raw`(</(?:mi|mn|msub|msup|msubsup|mfrac|msqrt|mover|mrow)>)(${OPERATOR})`, 'g');
/** After the operator's invisible function application, a symbol or a fraction is set off too; a
 * bracket is not: "ln(L/a)", but "sin θ". */
const ORDINARY_AFTER = new RegExp(String.raw`(${OPERATOR}<mo>⁡</mo>)(?=<(?:mi|mn|mfrac|msub|msup|msubsup|msqrt)[ >])`, 'g');
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
/** TeX puts a thin space between an operator name and the ordinary atoms beside it. MathML Core does
 * not: it gives the invisible function application no width, so the copy printed "kλln" run
 * together and "cosα" -- maths that looks unset on a handout. The space is written in. */
function spaceOperators(markup: string) {
  return markup.replace(ORDINARY_BEFORE, `$1${THIN}$2`).replace(ORDINARY_AFTER, `$1${THIN}`)
    .replace(UNARY, '$1<mo lspace="0em" rspace="0em">$2</mo>')
    .replace(BOLD, (_, c: string) => `<mi mathvariant="normal">${boldLetter(c)}</mi>`);
}

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
  const working = a.worked?.length ? `<h2>Working</h2>\n${steps(a.worked)}\n` : '';
  // The page writes "with k = 1/(4πε₀)" beside its result. The copy printed kQ/… with k never said.
  const constant = [a.integralTex, a.secondaryIntegralTex ?? '', ...a.results, ...(a.derived ?? []), ...[...(a.worked ?? []), ...(a.back ?? [])].map(w => w.tex)].some(usesK)
    ? `<p class="where">Throughout, ${mathml(String.raw`k=\dfrac{1}{4\pi\varepsilon_0}`, false)}.</p>\n`
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
mtable[columnalign^="right left"] > mtr > mtd:nth-child(odd) { text-align: right; }
mtable[columnalign^="right left"] > mtr > mtd:nth-child(even) { text-align: left; }
.step { break-inside: avoid; }
.nobr { white-space: nowrap; }
.step p { margin: 14px 0 2px; }
.where { margin-top: 12px; }
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
${mathml(a.integralTex)}
${a.secondaryIntegralTex ? `${mathml(a.secondaryIntegralTex)}\n` : ''}${working}<h2>The result</h2>
<div class="result">${a.results.map(tex => mathml(tex)).join('\n')}</div>
${derived}${constant}
<footer>Saved from Field Builder. The equations are MathML, so this page needs no network to read or print.</footer>
</main></body></html>`;
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
