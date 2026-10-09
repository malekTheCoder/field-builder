import katex from 'katex';
import {snapshotLayer} from '../diagrams/snapshot';
import {PLOT} from '../diagrams/vectorfield';

export type LessonArtifact = {
  title: string;
  subtitle: string;
  setup: string;
  /** Where P is, in the lesson's own symbols: the caption under the figure. */
  coordinate?: string;
  integralTex: string;
  /** Every line of the result, the built component first -- E_x and E_y where there are both. */
  results: string[];
  svg?: string;
};

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** TeX as MathML: the browser sets it itself, with no script, no font files and no network, so a
 * copy opened on a train years later still reads as mathematics. The TeX rides along inside it as
 * an annotation, for anyone who wants to copy it. */
export function mathml(tex: string, display = true) {
  return katex.renderToString(tex, {output: 'mathml', displayMode: display, throwOnError: false, strict: 'ignore'});
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
math { font-size: 1.12em; }
math[display="block"] { margin: 10px 0 14px; }
.result math[display="block"] { margin: 6px 0; }
footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #d8e1e7; color: #4a6274; font-size: 12px; }
</style></head>
<body><main>
<p class="kicker">Field Builder · saved copy</p>
<h1>${escapeHtml(a.title)}</h1>
<p class="lede">${escapeHtml(a.subtitle)}</p>
${figure}
<h2>Setup</h2>
<p>${escapeHtml(a.setup)}</p>
<h2>The integral</h2>
${mathml(a.integralTex)}
<h2>The result</h2>
<div class="result">${a.results.map(tex => mathml(tex)).join('\n')}</div>
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
