'use client';
/* An inline SVG chart is one named image, and has no tag of its own that says so: the role says it. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useId, useMemo} from 'react';
import {MathText, Prose} from '../components/Math';
import {boundaries} from './physics';
import {fieldAlong, profile, profileReach, profileStart, regionOf} from './instruments';
import type {GaussCase} from './types';
/* THE FIELD AGAINST DISTANCE: the instrument under Lines and cylinders, Sheets and slabs and The hard cases. Every radius (or face
 * height) the slider could give the surface is a Gaussian surface of its own, with its own enclosed charge and so
 * its own field at P; the curve is all of them at once, and the dot is the one the slider has chosen. Drag the
 * slider and the dot rides the curve: up a straight line inside a solid rod, down a 1/r curve outside it, along a
 * flat line for a sheet, whose answer has no height in it. Drawn from the same exact field as the figure
 * (instruments.ts `profile`), a region at a time, so a jump onto a shell of charge is a gap.
 *
 * The page prints no numerals: the axes are named by their symbols and the charge's surfaces by their letters. */
const W = 640, H = 270, LEFT = 64, RIGHT = 600, TOP = 30, BOTTOM = 222;
export function FieldProfile({kase, size, sign}: {kase: GaussCase; size: number; sign: 1 | -1}) {
  const uid = useId();
  const pieces = useMemo(() => profile(kase, sign), [kase, sign]);
  const X = profileReach(kase), s = kase.figure.surface, pillbox = s.kind === 'pillbox';
  const variable = s.label.split(' ').at(-1) ?? 'r';
  // The scale: the largest field the slider's range can reach, so a line's field, which grows without end at the
  // axis, is clipped above its curve's start rather than squashing the rest flat.
  const ymax = useMemo(() => {
    const lo = s.size.min > 0 ? s.size.min * .55 : profileStart(kase), vals = pieces.flatMap(p => p.points.filter(q => q.x >= lo).map(q => Math.abs(q.e)));
    return (Math.max(0, ...vals) || 1) * 1.15;
  }, [pieces, s.size.min, kase]);
  const x0 = profileStart(kase), px = (x: number) => LEFT + (RIGHT - LEFT) * (x - x0) / (X - x0);
  // The field's axis stands at the middle (zero) when the slider reaches below it.
  const yx = x0 < 0 ? px(0) : LEFT;
  // Positive fields rise from the axis; for a negative charge they hang below it, the axis at the top.
  // A field that runs against the charge's sign somewhere (a slab whose charge changes sign) hangs from an axis in the
  // middle of the frame, or at the top where it only ever runs against it.
  const along = pieces.flatMap(p => p.points.map(q => q.e * sign)), against = along.some(v => v < -1e-12), withIt = along.some(v => v > 1e-12);
  const half = (BOTTOM - TOP) / 2, base = against ? (withIt ? TOP + half : sign > 0 ? TOP : BOTTOM) : sign > 0 ? BOTTOM : TOP, py = (e: number) => base - (BOTTOM - TOP) * Math.max(-4, Math.min(4, e / ymax));
  const paths = pieces.map(p => `M${p.points.map(q => `${px(q.x).toFixed(1)} ${py(q.e).toFixed(1)}`).join('L')}`);
  // A stretch whose field comes from adding fields, not from a Gaussian surface, is dashed and says so.
  const added = pieces.map((_, i) => !!s.regions?.[i]?.superposition);
  const bounds = boundaries(kase.figure.charge).filter(b => b < X && b > x0), names = kase.figure.charge.bounds ?? [];
  const here = fieldAlong(kase, sign, size), hx = px(size), hy = py(here);
  const region = s.regions?.[regionOf(kase, size)];
  const what = pillbox ? 'height' : 'radius';
  // The field's symbol as the board writes it: E_z for the slab whose charge changes sign, whose answer is signed along z.
  const axisSub = kase.figure.charge.kind === 'oddslab' ? 'z' : pillbox ? '⊥' : 'r';
  const described = `The field's component at P against the surface's ${what} ${variable}, for ${kase.figure.charge.name}, ${sign > 0 ? 'positive' : 'negative'}. The dot marks the ${what} the slider has chosen${region ? `: ${region.name}` : ''}.`;
  return <section className="gs-instrument gs-profile" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">The field against {variable}</h2>
      <p className="gs-instrument-lede">{pillbox
        ? `Every height of the pillbox is a Gaussian surface of its own; the curve is the field at its face for all of them. Move the height slider above and the dot rides along it: where the line is flat, the answer has no ${variable} in it.`
        : `Every radius of the ${s.kind === 'sphere' ? 'sphere' : 'cylinder'} is a Gaussian surface of its own; the curve is the field at P for all of them. Move the radius slider above and the dot rides along it, region by region.`}</p>
    </div>
    <svg className="gs-instrument-svg gs-profile-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={described}>
      <line className="gs-axis" x1={LEFT} y1={base} x2={RIGHT + 14} y2={base} />
      <line className="gs-axis" x1={yx} y1={TOP - 12} x2={yx} y2={BOTTOM + 8} />
      <text className="gs-name gs-axis-name" x={RIGHT + 20} y={base + (sign > 0 ? 4 : -4)} dominantBaseline="middle">{variable}</text>
      <text className="gs-name gs-axis-name gs-field-name" x={yx - 12} y={base === TOP ? TOP - 22 : TOP - 4} textAnchor="end" dominantBaseline="middle">E<tspan className="gs-sub" dy="5">{axisSub}</tspan></text>
      {bounds.map((b, i) => <g key={i} className="gs-bound">
        <line x1={px(b)} y1={TOP - 6} x2={px(b)} y2={BOTTOM + 4} />
        <text className="gs-name gs-bound-name" x={px(b)} y={sign > 0 ? BOTTOM + 22 : TOP - 18} textAnchor="middle" dominantBaseline="middle">{names[i] ?? ''}</text>
      </g>)}
      {/* The slider's reach, faint, under the curve: the sizes the surface can take. */}
      {/* Named where it lies under the curve; where the curve hangs from it, it would lie under the other labels, unnamed. */}
      {base === BOTTOM && <><line className="gs-reach" x1={px(s.size.min)} y1={base} x2={px(s.size.max)} y2={base} />
        <text className="gs-added-name" x={(px(s.size.min) + px(s.size.max)) / 2} y={BOTTOM + 40} textAnchor="middle">the slider’s range</text></>}
      {/* A field that grows without end at the axis leaves through the top of the plot, rather than being flattened. */}
      <clipPath id={`${uid}-clip`}><rect x={LEFT} y={TOP - 14} width={RIGHT - LEFT + 14} height={BOTTOM - TOP + 28} /></clipPath>
      <g clipPath={`url(#${uid}-clip)`}>{paths.map((d, i) => <path key={i} className={'gs-curve' + (added[i] ? ' is-added' : '')} d={d} />)}</g>
      {pieces.map((p, i) => added[i] && <text key={i} className="gs-added-name" x={px((p.from + p.to) / 2)} y={base + (sign > 0 ? -12 : 20)} textAnchor="middle">by superposition</text>)}
      <line className="gs-drop" x1={hx} y1={base} x2={hx} y2={hy} />
      <circle className="gs-dot" cx={hx} cy={hy} r={6} />
    </svg>
    <div className="gs-readout">
      {region ? <><MathText tex={region.tex} block /><p aria-live="polite"><Prose text={region.say} /></p></> : <MathText tex={kase.solve.answer} block />}
    </div>
  </section>;
}
