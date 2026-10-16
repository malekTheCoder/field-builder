'use client';
/* A figure that is one named image: inline SVG needs role=img to say so. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useCallback, useId, useRef, useState, type CSSProperties, type PointerEvent} from 'react';
import {useRenderedWidth} from '../components/useRenderedWidth';
import {MathText} from '../components/Math';
import {BANDS, bandShares, insideBands, insideTex} from './instruments';
import {GaussRange} from './GaussRange';
/* CARRY A CHARGE OUT OF A SPHERE. A point charge on the axis of a sphere, and the sphere cut into bands about that
 * axis, each with its exact flux (instruments.ts, insideBands). Slide the charge from the centre out through the
 * surface: while it is inside, every band carries flux of the charge's own sign and the stack beside the sphere
 * reaches q/ε₀; once it is out, the bands facing it carry flux the other way, exactly as much as the bands beyond
 * it, and the stack falls back to zero. The arrows on the bands are the field itself, never zero.
 *
 * The slider is the control, and says aloud when the charge crosses; the charge can be dragged along the axis too.
 * Its steps never land on the sphere itself, where the flux would be neither. */
const C = {x: 190, y: 150}, U = 105, STEP = .06, MAX = 2.1;
/** The stack: shares of q/ε₀, from the baseline up. */
const BASE = 262, TOP = 82, PER = BASE - TOP, COL_A = 486, COL_B = 532, COL_W = 30;
const at = (th: number, upper: boolean) => ({x: C.x + U * Math.cos(th), y: C.y + (upper ? -1 : 1) * U * Math.sin(th)});
function Arrow({a, b, className, head = 8}: {a: {x: number; y: number}; b: {x: number; y: number}; className: string; head?: number}) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < 1.5) return null;
  const ux = dx / len, uy = dy / len, h = Math.min(head, len * .5), w = h * .5, bx = b.x - ux * h, by = b.y - uy * h;
  return <g className={className}><line x1={a.x} y1={a.y} x2={bx} y2={by} /><path d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)}L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}Z`} /></g>;
}
/** Where the charge is, in words: for the slider and the crossing. */
const whereWords = (d: number) => d < STEP / 2 ? 'at the centre' : d < 1 ? 'inside the sphere' : 'outside the sphere';

/** Where the charge starts, for the case chosen above: at the centre, off it, or outside the sphere, so the
 * instrument opens on the picture the figure and the board are about. */
export const insideStart = (key: string) => key === 'centred' ? 0 : key === 'outside' ? 1.62 : .48;
export function InsideInstrument({sign, start = .48}: {sign: 1 | -1; start?: number}) {
  const [d, setD] = useState(start);
  const [said, setSaid] = useState('');
  const svg = useRef<SVGSVGElement | null>(null), grabbing = useRef(false);
  // Its names held at a readable size as it shrinks on a phone, as the figure's are.
  const [measure, width] = useRenderedWidth(640);
  const setSvg = useCallback((el: SVGSVGElement | null) => { svg.current = el; return measure(el); }, [measure]);
  const k = Math.max(1, Math.min(2.2, 640 / Math.max(1, width) * .86));
  const uid = useId();
  const place = (next: number) => {
    // On the slider's own grid, so a drag never stops on the sphere either.
    const snapped = Math.max(0, Math.min(MAX, Math.round(next / STEP) * STEP));
    if ((snapped < 1) !== (d < 1)) setSaid(snapped < 1 ? 'The charge crossed into the sphere: the flux is q over epsilon nought.' : 'The charge crossed out of the sphere: the flux is zero.');
    setD(snapped);
  };
  const bands = insideBands(d, sign), shares = bandShares(d);
  const inside = d < 1, out = sign > 0 ? 'out' : 'in', back = sign > 0 ? 'in' : 'out';
  // The stack: the bands carrying flux of q's sign rise from the baseline; those carrying it the other way hang from
  // the top of them; the net is where the second column ends.
  const up = shares.map((s, i) => ({s, i})).filter(b => b.s > 1e-9), down = shares.map((s, i) => ({s, i})).filter(b => b.s < -1e-9);
  const upTotal = up.reduce((t, b) => t + b.s, 0), net = shares.reduce((t, s) => t + s, 0);
  type Block = {i: number; y: number; h: number};
  const upRects = up.reduce<Block[]>((all, b) => { const h = b.s * PER, from = all.at(-1)?.y ?? BASE; return [...all, {i: b.i, y: from - h, h}]; }, []);
  const downRects = down.reduce<Block[]>((all, b) => { const last = all.at(-1), from = last ? last.y + last.h : BASE - upTotal * PER; return [...all, {i: b.i, y: from, h: -b.s * PER}]; }, []);
  const netY = BASE - net * PER;
  const q = {x: C.x + U * d, y: C.y};
  const glyph = sign > 0 ? '+' : '−';
  const words = d < STEP / 2 ? `At the centre every band carries flux ${out}, the same per unit area on each, and together they carry q/ε₀.`
    : inside ? `Inside, every band carries flux ${out}, more of it through the half of the sphere facing the charge, and together they carry q/ε₀.`
    : `Outside, the bands facing the charge carry flux ${back} and the bands beyond it carry flux ${out}: the two cancel, and the net flux is zero.`;
  const toD = (e: PointerEvent) => { const m = svg.current?.getScreenCTM(); if (!m) return null; return (new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).x - C.x) / U; };
  // The far arrows are drawn to the field's size, held between a stub and a fixed length, as the figure's are.
  const len = (e: number) => Math.max(9, Math.min(48, 30 * e));
  return <section className="gs-instrument gs-inside-tool" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">Carry it out</h2>
      <p className="gs-instrument-lede">Slide the charge along the axis and out through the sphere. Each band of the sphere carries its own flux, stacked on the right: they add to q/ε₀ while the charge is inside, and to zero once it is out.</p>
    </div>
    <svg ref={setSvg} className="gs-instrument-svg gs-inside-svg" viewBox="0 0 640 300" role="group" style={{'--cd-k': k} as CSSProperties}
      aria-label={`A sphere cut into ${BANDS === 8 ? 'eight' : 'several'} bands round an axis, and a ${sign > 0 ? 'positive' : 'negative'} point charge on the axis, ${whereWords(d)}. ${words}`}
      onPointerMove={e => { if (!grabbing.current) return; const n = toD(e); if (n !== null) place(n); }}
      onPointerUp={() => { grabbing.current = false; }} onPointerCancel={() => { grabbing.current = false; }}>
      <line className="gs-axis" x1={C.x - U - 40} y1={C.y} x2={C.x + U * MAX + 22} y2={C.y} />
      {/* The bands, above and below the axis: solid where they carry flux of q's sign, dashed where they carry it back. */}
      {bands.map(b => [true, false].map(upper => {
        const a = at(b.th0, upper), c = at(b.th1, upper);
        return <path key={`${b.i}${upper}`} className={'gs-band' + (shares[b.i] < 0 ? ' is-back' : '')} d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)}A${U} ${U} 0 0 ${upper ? 0 : 1} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`} />;
      }))}
      {bands.map(b => [true, false].map(upper => { const p = at(b.th0, upper); return b.i > 0 && <circle key={`c${b.i}${upper}`} className="gs-cut" cx={p.x} cy={p.y} r={2.4} />; }))}
      {/* The field at each band's middle: its own direction, never zero. */}
      {bands.map(b => [true, false].map(upper => {
        const p = at(b.mid, upper), e = Math.hypot(b.field.x, b.field.z), l = len(e);
        // In the plane: z runs along the axis (to the right), x across it (up for the upper half).
        const dir = {x: b.field.z / e, y: (upper ? -1 : 1) * b.field.x / e};
        return <Arrow key={`e${b.i}${upper}`} a={p} b={{x: p.x + dir.x * l, y: p.y + dir.y * l}} className="gs-arrow gs-e is-flow" head={7} />;
      }))}
      <circle className="gs-centre" cx={C.x} cy={C.y} r={2.6} />
      <g className={'gs-q' + (inside ? ' is-inside' : '')} transform={`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`}
        role="button" tabIndex={0} aria-roledescription="draggable charge" aria-label={`The charge q, ${whereWords(d)}. Left and right arrow keys move it along the axis; Home puts it at the centre.`}
        onKeyDown={e => { const by = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (e.key === 'Home') { e.preventDefault(); place(0); } else if (by) { e.preventDefault(); place(d + by * STEP * (e.shiftKey ? 5 : 1)); } }}
        onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); grabbing.current = true; (e.currentTarget as SVGGElement).focus({preventScroll: true}); try { svg.current?.setPointerCapture(e.pointerId); } catch { /* still drags */ } }}>
        <circle className="gs-q-hit" r={22} />
        <circle className="gs-q-body" r={13} />
        <text className="gs-q-sign" textAnchor="middle" dominantBaseline="central">{glyph}</text>
        <text className="gs-name gs-q-name" x={16} y={-18}>q</text>
      </g>
      {/* The stack. */}
      <line className="gs-level" x1={COL_A - 14} x2={COL_B + COL_W + 14} y1={TOP} y2={TOP} />
      <text className="gs-ui-name" x={COL_A - 20} y={TOP} textAnchor="end" dominantBaseline="middle">q/ε₀</text>
      <line className="gs-baseline" x1={COL_A - 14} x2={COL_B + COL_W + 14} y1={BASE} y2={BASE} />
      {upRects.map((r, k) => <rect key={`u${r.i}`} className={'gs-stack' + (k % 2 ? ' is-alt' : '')} x={COL_A} y={r.y} width={COL_W} height={Math.max(0, r.h)} />)}
      {downRects.map((r, k) => <rect key={`d${r.i}`} className={'gs-stack is-back' + (k % 2 ? ' is-alt' : '')} x={COL_B} y={r.y} width={COL_W} height={Math.max(0, r.h)} />)}
      <line className="gs-net" x1={COL_A - 8} x2={COL_B + COL_W + 8} y1={netY} y2={netY} />
      <text className="gs-ui-name" x={COL_B + COL_W + 14} y={netY} dominantBaseline="middle">net</text>
      <text className="gs-stack-name" x={COL_A + COL_W / 2} y={BASE + 22} textAnchor="middle">{out}</text>
      <text className="gs-stack-name" x={COL_B + COL_W / 2} y={BASE + 22} textAnchor="middle">{back}</text>
    </svg>
    <div className="gs-readout"><MathText tex={insideTex(d)} block /><p>{words}</p><output className="sr-only" aria-live="polite">{said}</output></div>
    <GaussRange label="Distance of the charge from the centre d" value={d} min={0} max={MAX} step={STEP} onChange={place} valueText={whereWords} />
  </section>;
}
