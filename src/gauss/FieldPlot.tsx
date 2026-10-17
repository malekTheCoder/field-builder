'use client';
/* A figure that is one named image: inline SVG needs role=img to say so. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useId, type CSSProperties} from 'react';
import {MathText} from '../components/Math';
import {useRenderedWidth} from '../components/useRenderedWidth';
import {fieldOf, SPHERE_KINDS, type SphereKind} from './instruments';
import type {GaussCase} from './types';
/* THE FIELD AGAINST r, FOR EVERY SPHERE AT ONCE. The four spheres of the lesson carry the same charge Q, and the
 * three with a size have the same radius R: a point charge, a thin shell, a uniform ball, a ball whose density rises
 * as r. Outside R their fields are one curve, kQ/r²; inside they part: the point's grows without bound, the shell's
 * is zero, the uniform ball's grows as r and the rising ball's as r². The case chosen above is drawn bold, and a line
 * follows the figure's slider, so the plot and the figure always show the same sphere at the same r.
 *
 * Where a finite density meets the outside, the curves join; across the shell's surface charge the field jumps,
 * by σ/ε₀, which is marked. Drawn for the charge's sign: a negative Q turns every curve over, below the axis. */
const P0 = 70, P1 = 612, MAX = 2.4, X = (x: number) => P0 + (P1 - P0) * x / MAX;
/** kQ/R² is this many units tall; the point charge's curve leaves the top. */
const PER = 150;
const NAMES: Record<SphereKind, string> = {point: 'point', shell: 'shell', ball: 'uniform ball', rising: 'ρ ∝ r'};
/** Where each curve is named, in units of R along r, and which side of it. */
const NAMED: Record<SphereKind, {x: number; dy: number; anchor: 'start' | 'end'}> = {point: {x: .9, dy: 0, anchor: 'end'}, shell: {x: .45, dy: 18, anchor: 'start'}, ball: {x: .5, dy: -14, anchor: 'end'}, rising: {x: .62, dy: 18, anchor: 'start'}};
/** What the sphere encloses, and the field, in the region the slider is in: for the readout. */
function region(k: SphereKind, x: number): {tex: string; words: string} {
  const raw = String.raw;
  if (k === 'point') return {tex: raw`Q_{\text{enc}}=Q,\quad E_r=\frac{kQ}{r^2}`, words: 'Every sphere round the point encloses all of its charge.'};
  if (x >= 1) return {tex: raw`Q_{\text{enc}}=Q,\quad E_r=\frac{kQ}{r^2}`, words: 'Outside R the sphere encloses all of Q, and every one of the four makes the same field: a point charge’s.'};
  if (k === 'shell') return {tex: raw`Q_{\text{enc}}=0,\quad E_r=0`, words: 'Inside the shell the sphere encloses none of its charge, and the field is zero everywhere there.'};
  if (k === 'ball') return {tex: raw`Q_{\text{enc}}=Q\,\frac{r^3}{R^3},\quad E_r=\frac{kQr}{R^3}`, words: 'Inside the uniform ball the sphere encloses the fraction r³/R³ of the charge, and the field’s magnitude grows in proportion to r.'};
  return {tex: raw`Q_{\text{enc}}=Q\,\frac{r^4}{R^4},\quad E_r=\frac{kQr^2}{R^4}`, words: 'Inside the ball whose density is proportional to r, little charge lies near the centre: the sphere encloses r⁴/R⁴ of it, and the field’s magnitude grows as r².'};
}

export function FieldPlot({kase, size, sign}: {kase: GaussCase; size: number; sign: 1 | -1}) {
  const uid = useId(), clipId = `${uid.replace(/:/g, '')}-clip`;
  const [measure, width] = useRenderedWidth(640);
  const k = Math.max(1, Math.min(2.2, 640 / Math.max(1, width) * .86));
  const kind = (SPHERE_KINDS as readonly string[]).includes(kase.figure.charge.kind) ? kase.figure.charge.kind as SphereKind : 'ball';
  // The point charge has no R of its own: it is drawn against the others', the radius the figure gives them.
  const R = kase.figure.charge.size || 1.1, x = size / R;
  // A positive charge's curves rise from a baseline low in the frame; a negative one's fall from one high in it.
  const base = sign > 0 ? 250 : 58, Y = (e: number) => base - PER * e;
  const path = (kd: SphereKind) => {
    const pts: string[] = [];
    // Sampled finely, and either side of R exactly, so the shell's step is drawn where it is.
    const xs = [...Array.from({length: 241}, (_, i) => MAX * i / 240), 1 - 1e-9, 1 + 1e-9].filter(v => v > .02).sort((a, b) => a - b);
    // Held a little past the frame, where the clip cuts it: the point charge's curve leaves the top and does not
    // run along it.
    for (const v of xs) pts.push(`${X(v).toFixed(1)} ${Y(Math.max(-2, Math.min(2, fieldOf(kd, v, sign)))).toFixed(1)}`);
    return `M${pts.join('L')}`;
  };
  // A marker is a value, not decoration: never clamp it to a fabricated finite field. The point-charge
  // curve can leave this stable scale. Its edge arrow then identifies the selected radius without
  // pretending that the field has flattened; an in-range selection keeps its exact dot on the curve.
  const here = fieldOf(kind, x, sign), offScale = Y(here) < 16 || Y(here) > 292;
  const scaleWords = offScale ? 'The selected field is beyond the plot’s vertical scale; the edge arrow marks its radius. ' : '';
  const edge = sign > 0 ? 16 : 292;
  const now = region(kind, x);
  const name = NAMES[kind];
  return <section className="gs-instrument gs-plot" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">The field against r</h2>
      <p className="gs-instrument-lede">All four have the same total charge Q; three also have the same radius R. Outside R their fields are one curve; inside, they part. The bold curve is the case chosen above, and the line follows its slider.</p>
    </div>
    <svg ref={measure} className="gs-instrument-svg gs-plot-svg" viewBox="0 0 640 300" role="img" style={{'--cd-k': k} as CSSProperties}
      aria-label={`The radial field against r for a point charge, a thin shell, a uniform ball and a ball whose density is proportional to r, all of the same ${sign > 0 ? 'positive' : 'negative'} charge. The ${name} is drawn bold, with the sphere ${kind === 'point' ? 'at r' : x < 1 ? 'inside R' : 'outside R'}. ${scaleWords}${now.words}`}>
      <line className="gs-baseline" x1={P0} x2={P1 + 4} y1={base} y2={base} />
      <line className="gs-plot-axis" x1={P0} x2={P0} y1={sign > 0 ? base : base - 6} y2={sign > 0 ? 24 : 284} />
      <text className="gs-name" x={P0 - 10} y={sign > 0 ? 30 : 278} textAnchor="end" dominantBaseline="middle">E<tspan className="gs-sub" dy="5">r</tspan></text>
      <text className="gs-name" x={P1 + 4} y={base + (sign > 0 ? 24 : -16)} textAnchor="end">r</text>
      <line className="gs-edge" x1={X(1)} x2={X(1)} y1={sign > 0 ? base : base} y2={sign > 0 ? 34 : 274} />
      <text className="gs-name" x={X(1)} y={base + (sign > 0 ? 24 : -16)} textAnchor="middle">R</text>
      <defs><clipPath id={clipId}><rect x={P0 - 4} y={16} width={P1 - P0 + 12} height={276} /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        {SPHERE_KINDS.filter(kd => kd !== kind).map(kd => <path key={kd} className="gs-curve is-other" d={path(kd)} />)}
        <path className="gs-curve is-on" d={path(kind)} />
      </g>
      {/* The jump across the shell's surface charge, and where a finite density meets the outside. */}
      {kind === 'shell' && <g className="gs-jump">
        <line x1={X(1) + 12} x2={X(1) + 12} y1={Y(0)} y2={Y(sign)} />
        <text className="gs-ui-name" x={X(1) + 20} y={(Y(0) + Y(sign)) / 2} dominantBaseline="middle">σ/ε₀</text>
      </g>}
      {(kind === 'ball' || kind === 'rising') && <circle className="gs-meet" cx={X(1)} cy={Y(sign)} r={5} />}
      {SPHERE_KINDS.map(kd => { const n = NAMED[kd], e = fieldOf(kd, n.x, sign); return <text key={kd} className={'gs-curve-name' + (kd === kind ? ' is-on' : '')} x={X(n.x) + (n.anchor === 'end' ? -8 : 8)} y={kd === 'shell' ? base + sign * n.dy : Y(e) + sign * n.dy} textAnchor={n.anchor} dominantBaseline="middle">{NAMES[kd]}</text>; })}
      <text className="gs-curve-name" x={X(2.05)} y={Y(fieldOf('ball', 2.05, sign)) - sign * 18} textAnchor="middle">all four: kQ/r²</text>
      <line className="gs-at" x1={X(x)} x2={X(x)} y1={sign > 0 ? base + 4 : base - 4} y2={sign > 0 ? 30 : 278} />
      {offScale
        ? <path className="gs-here gs-offscale-marker" d={`M${X(x)} ${edge}l-7 ${sign * 12}h14Z`} />
        : <circle className="gs-here" cx={X(x)} cy={Y(here)} r={5.5} />}
    </svg>
    <div className="gs-readout"><MathText tex={now.tex} block /><p>{scaleWords}{now.words}</p></div>
  </section>;
}
