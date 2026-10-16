'use client';
/* A named group of toggles, a figure that is one named group, a charge in an SVG that is a control: none has a tag
   of its own inside an <svg>, or an HTML one that would say the same, so the role says it. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {MathText} from '../components/Math';
import {CAVITY, cavityLines, cavityTex, wallMarks, type Pt} from './instruments';
/* A CHARGE IN A HOLLOW, TO MOVE ABOUT: the instrument under Conductors. A metal ball, cut through its centre, with a
 * round hollow in it and a charge q inside the hollow. Drag q about (or move it with the arrow keys): the wall's −q
 * crowds toward it, and the field lines from q end on that charge, every one of them; the outer surface's charge
 * stays spread evenly whatever q does, because the metal between has no field in it and screens the outside from
 * the hollow. Take q out and the wall has nothing on it, and the hollow no field. Give the metal a net charge Q and
 * it all goes to the outside, with q.
 *
 * The wall's marks are placed where its charge is (the image solution's density, physics.ts `wallDensity`), as many
 * as the outer surface's, since the two charges are equal and opposite. Lengths in units of the hollow's radius. */
const C = {x: 320, y: 168}, U = 64, MARKS = 12;
const toScreen = (p: Pt) => ({x: C.x + U * p.x, y: C.y - U * p.y});
/** A small arrowhead between two screen points, at their middle, pointing from the first to the second for a
 * positive charge and back for a negative one. */
function head(a: {x: number; y: number}, b: {x: number; y: number}, sign: 1 | -1) {
  const dx = (b.x - a.x) * sign, dy = (b.y - a.y) * sign, l = Math.hypot(dx, dy);
  if (l < 1e-6) return null;
  const ux = dx / l, uy = dy / l, m = {x: (a.x + b.x) / 2 + ux * 4, y: (a.y + b.y) / 2 + uy * 4}, h = 8, w = 4;
  return <path className="gs-cavity-head" d={`M${m.x.toFixed(1)} ${m.y.toFixed(1)}L${(m.x - ux * h - uy * w).toFixed(1)} ${(m.y - uy * h + ux * w).toFixed(1)}L${(m.x - ux * h + uy * w).toFixed(1)} ${(m.y - uy * h - ux * w).toFixed(1)}Z`} />;
}
const pathOf = (pts: Pt[]) => `M${pts.map(p => { const s = toScreen(p); return `${s.x.toFixed(1)} ${s.y.toFixed(1)}`; }).join('L')}`;
export function CavityInstrument({sign}: {sign: 1 | -1}) {
  const uid = useId();
  const [q, setQ] = useState<Pt>({x: .38, y: .22});
  const [hasCharge, setHasCharge] = useState(true), [net, setNet] = useState(false);
  const [said, setSaid] = useState('');
  const svg = useRef<SVGSVGElement>(null), grabbed = useRef(false);
  const {a, b, reach} = CAVITY;
  const lines = useMemo(() => hasCharge ? cavityLines(q, MARKS) : [], [q, hasCharge]);
  const wall = useMemo(() => hasCharge ? wallMarks(q, MARKS) : [], [q, hasCharge]);
  const glyph = sign > 0 ? '+' : '−', opposite = sign > 0 ? '−' : '+';
  const off = Math.hypot(q.x, q.y) > .08;
  /** Move q, held inside the hollow, short of its wall. */
  const place = (to: Pt) => {
    const d = Math.hypot(to.x, to.y), k = d > reach ? reach / d : 1, next = {x: to.x * k, y: to.y * k};
    setQ(next);
    const wasOff = Math.hypot(q.x, q.y) > .08, nowOff = Math.hypot(next.x, next.y) > .08;
    if (wasOff !== nowOff) setSaid(nowOff ? 'The charge is off centre: the wall’s charge crowds toward it, and the outer surface’s stays even.' : 'The charge is at the centre: the wall’s charge is spread evenly too.');
  };
  const toWorld = (e: PointerEvent) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return {x: (p.x - C.x) / U, y: (C.y - p.y) / U};
  };
  const keys = (e: KeyboardEvent) => {
    const step = e.shiftKey ? .25 : .08, d: Record<string, Pt> = {ArrowLeft: {x: -step, y: 0}, ArrowRight: {x: step, y: 0}, ArrowUp: {x: 0, y: step}, ArrowDown: {x: 0, y: -step}};
    const by = d[e.key];
    if (e.key === 'Home') { e.preventDefault(); place({x: 0, y: 0}); return; }
    if (!by) return;
    e.preventDefault();
    place({x: q.x + by.x, y: q.y + by.y});
  };
  const ring = (r: number) => `M${C.x - r * U} ${C.y}a${r * U} ${r * U} 0 1 0 ${2 * r * U} 0a${r * U} ${r * U} 0 1 0 ${-2 * r * U} 0Z`;
  const outerCharged = hasCharge || net;
  const outerMarks = Array.from({length: MARKS}, (_, i) => 2 * Math.PI * (i + .25) / MARKS);
  const tex = cavityTex(hasCharge, net);
  const p = toScreen(q);
  const outerWords = hasCharge ? (net ? 'Q plus q' : 'q') : (net ? 'Q' : 'nothing');
  return <section className="gs-instrument gs-cavity" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">A charge in a hollow</h2>
      <p className="gs-instrument-lede">A metal ball cut through its centre, with a hollow inside it. Drag the charge about the hollow, or move it with the arrow keys: the wall’s charge follows it, and the outside’s stays even, its field unchanged.</p>
    </div>
    <div className="gs-choices">
      <div className="cd-view-modes" role="group" aria-label="In the hollow">{([['A charge q', true], ['Nothing', false]] as const).map(([label, v]) => <button key={label} type="button" className={'cd-view-mode' + (hasCharge === v ? ' is-on' : '')} aria-pressed={hasCharge === v} onClick={() => setHasCharge(v)}>{label}</button>)}</div>
      <div className="cd-view-modes" role="group" aria-label="The metal’s own charge">{([['Neutral metal', false], ['Metal carrying Q', true]] as const).map(([label, v]) => <button key={label} type="button" className={'cd-view-mode' + (net === v ? ' is-on' : '')} aria-pressed={net === v} onClick={() => setNet(v)}>{label}</button>)}</div>
    </div>
    <svg ref={svg} className="gs-instrument-svg gs-cavity-svg" viewBox="0 0 640 336" role="group" aria-labelledby={`${uid}-what`}
      onPointerMove={e => { if (!grabbed.current) return; const w = toWorld(e); if (w) place(w); }}
      onPointerUp={() => { grabbed.current = false; }} onPointerCancel={() => { grabbed.current = false; }}>
      <title id={`${uid}-what`}>{`A metal ball with a hollow inside. ${hasCharge ? `A charge q in the hollow, ${off ? 'off centre' : 'at the centre'}; the hollow’s wall carries minus q` : 'Nothing in the hollow, and nothing on its wall'}; the outer surface carries ${outerWords}, spread evenly. No field in the metal.`}</title>
      <path className="gs-metal" d={ring(b) + ring(a)} fillRule="evenodd" />
      <circle className="gs-surface-line" cx={C.x} cy={C.y} r={b * U} />
      <circle className="gs-surface-line" cx={C.x} cy={C.y} r={a * U} />
      {/* Outside: the field of the outer surface's charge, straight out from the centre, the same wherever q sits. */}
      {outerCharged && <g aria-hidden="true">{outerMarks.map((t, i) => {
        const from = toScreen({x: (b + .24) * Math.cos(t), y: (b + .24) * Math.sin(t)}), to = toScreen({x: (b + .5) * Math.cos(t), y: (b + .5) * Math.sin(t)});
        // With Q on the metal the outside's sign is Q + q's, which could be either: no head then.
        return <g key={i}><line className="gs-cavity-out" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />{!net && head(from, to, sign)}</g>;
      })}</g>}
      {/* In the hollow: field lines from q, each ending on the wall's charge. */}
      <g aria-hidden="true">{lines.map((l, i) => { const k = Math.floor(l.length * .55); return <g key={i}><path className="gs-cavity-line" d={pathOf(l)} />{l.length > 4 && head(toScreen(l[k - 1]), toScreen(l[k + 1]), sign)}</g>; })}</g>
      {/* The marks: the wall's charge where it crowds, the outer surface's spread evenly. */}
      <g aria-hidden="true">{wall.map((t, i) => { const s = toScreen({x: (a - .1) * Math.cos(t), y: (a - .1) * Math.sin(t)}); return <text key={i} className="gs-sign gs-sign-small" x={s.x.toFixed(1)} y={s.y.toFixed(1)} textAnchor="middle" dominantBaseline="central">{opposite}</text>; })}</g>
      <g aria-hidden="true">{outerCharged && outerMarks.map((t, i) => {
        const s = toScreen({x: (b + .11) * Math.cos(t + Math.PI / MARKS), y: (b + .11) * Math.sin(t + Math.PI / MARKS)});
        return hasCharge && !net ? <text key={i} className="gs-sign gs-sign-small" x={s.x.toFixed(1)} y={s.y.toFixed(1)} textAnchor="middle" dominantBaseline="central">{glyph}</text>
          : <circle key={i} className="gs-mark-dot" cx={s.x} cy={s.y} r={3.4} />;
      })}</g>
      <text className="gs-name gs-metal-name" x={C.x + (a + b) / 2 * U * Math.cos(-2.35)} y={C.y - (a + b) / 2 * U * Math.sin(-2.35)} textAnchor="middle" dominantBaseline="middle">E = <tspan className="gs-zero">0</tspan></text>
      <text className="gs-name gs-charge-name" x={C.x + b * U * .78} y={C.y - b * U * .78 - 6} textAnchor="start">{hasCharge ? (net ? 'Q + q' : 'q') : net ? 'Q' : ''}</text>
      {hasCharge && <g className="gs-q is-inside" role="button" tabIndex={0} aria-roledescription="draggable charge"
        aria-label={`Charge q, ${sign > 0 ? 'positive' : 'negative'}, ${off ? 'off centre in' : 'at the centre of'} the hollow. Arrow keys move it; Home puts it at the centre.`}
        transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} onKeyDown={keys}
        onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); grabbed.current = true; (e.currentTarget as SVGGElement).focus({preventScroll: true}); try { svg.current?.setPointerCapture(e.pointerId); } catch { /* still drags */ } }}>
        <circle className="gs-q-hit" r={22} />
        <circle className="gs-q-body" r={13} />
        <text className="gs-q-sign" textAnchor="middle" dominantBaseline="central">{glyph}</text>
        <text className="gs-name gs-q-name" x={17} y={-16}>q</text>
      </g>}
    </svg>
    <div className="gs-readout" data-wall={hasCharge ? 'minus-q' : 'none'} data-off={off && hasCharge ? 'yes' : 'no'}>
      <MathText tex={tex} block />
      <p>{hasCharge ? 'A surface drawn in the metal round the hollow has no field on it, so it encloses nothing: the wall holds −q. What is left over sits on the outside.' : 'With nothing in the hollow, a surface in the metal round it encloses nothing, and the wall’s net charge is zero; round and empty, it carries none anywhere. The hollow has no field: the metal shields it.'}</p>
      <output className="sr-only" aria-live="polite">{said}</output>
    </div>
  </section>;
}
