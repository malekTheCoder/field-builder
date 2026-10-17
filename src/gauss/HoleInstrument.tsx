'use client';
/* A named group of toggles, a figure that is one named group, a hole in an SVG that is a control: none has a tag of
   its own inside an <svg>, or an HTML one that would say the same, so the role says it. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {MathText} from '../components/Math';
import {HOLE, holeAt, holeField, holePieces, holeTex, type HoleShape, type Pt} from './instruments';
/* MOVE THE HOLE: the instrument under Holes by superposition. A ball of uniform charge, cut through its centre and
 * the centre of a round hole in it (or a rod seen end on, with a hole drilled along it), and the field at points all
 * over the cut, from the whole charge's field less the plug's (instruments.ts `holeField`). Drag the hole about, or
 * move it with the arrow keys: every arrow in the hole is the same, and it turns and grows with d⃗, the step from the
 * charge's centre to the hole's. Centre the hole and the field in it is gone. "Show the two pieces" draws, at one
 * point of the hole, the whole charge's field and the plug's, tip to tail, adding to that same arrow.
 *
 * One scale for every arrow, for both shapes, so equal fields are drawn equal: with the same ρ and radius a rod's field
 * inside is half as big again as a ball's (ρr/(2ε₀) against ρr/(3ε₀)), and is drawn so. One cap for every arrow, set so
 * that no arrow reaches it: equal fields are drawn equal inside the hole and out. Lengths in units of the charge's
 * radius. */
const C = {x: 320, y: 172}, U = 138, SCALE = 32, CAP = 44;
const toScreen = (p: Pt) => ({x: C.x + U * p.x, y: C.y - U * p.y});
function Arrow({a, b, className, head = 7}: {a: Pt; b: Pt; className: string; head?: number}) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < 1.5) return null;
  const ux = dx / len, uy = dy / len, h = Math.min(head, len * .5), w = h * .55, bx = b.x - ux * h, by = b.y - uy * h;
  return <g className={className}><line x1={a.x} y1={a.y} x2={bx} y2={by} /><path d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)}L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}Z`} /></g>;
}
/** A field arrow centred on a point of the grid, on the one scale, in screen units (y down). */
/** Which way the hole lies from the centre, in words: so a screen reader hears which way d, and the field, points. */
function towards(h: Pt): string {
  const up = h.y > .03 ? 'up' : h.y < -.03 ? 'down' : '', side = h.x > .03 ? 'to the right' : h.x < -.03 ? 'to the left' : '';
  return `${[up, side].filter(Boolean).join(' and ') || 'just'} of the centre`;
}
function arrowAt(p: Pt, e: Pt, cap = CAP): {a: Pt; b: Pt} | null {
  const m = Math.hypot(e.x, e.y);
  if (m < 1e-9) return null;
  const len = Math.min(cap, SCALE * m), s = toScreen(p), ux = e.x / m, uy = -e.y / m;
  return {a: {x: s.x - ux * len / 2, y: s.y - uy * len / 2}, b: {x: s.x + ux * len / 2, y: s.y + uy * len / 2}};
}
export function HoleInstrument({sign}: {sign: 1 | -1}) {
  const uid = useId();
  const [shape, setShape] = useState<HoleShape>('ball');
  const [hole, setHole] = useState<Pt>({x: .3, y: .2});
  const [pieces, setPieces] = useState(false);
  const [said, setSaid] = useState('');
  const svg = useRef<SVGSVGElement>(null), grabbed = useRef(false), offset = useRef<Pt>({x: 0, y: 0});
  const b = HOLE.b, centred = Math.hypot(hole.x, hole.y) < .02;
  // In units of ρR/(3ε₀) for both shapes: a rod's own unit, ρR/(2ε₀), is half as big again.
  const k = shape === 'ball' ? 1 : 1.5, times = (e: Pt) => ({x: k * e.x, y: k * e.y});
  const field = (p: Pt) => times(holeField(shape, hole, p, sign));
  const grid = useMemo(() => {
    const out: {p: Pt; inHole: boolean}[] = [];
    for (let i = -4; i <= 4; i++) for (let j = -3; j <= 3; j++) {
      const p = {x: i / 3, y: j / 3}, inHole = Math.hypot(p.x - hole.x, p.y - hole.y) < b - .02;
      // Clear of the hole's rim, where an arrow would straddle two fields.
      if (!inHole && Math.abs(Math.hypot(p.x - hole.x, p.y - hole.y) - b) < .06) continue;
      out.push({p, inHole});
    }
    return out;
  }, [hole, b]);
  // Points in the hole's own grid too, so a small hole still shows its field: on a ring round its centre.
  const inner = useMemo(() => Array.from({length: 4}, (_, i) => ({x: hole.x + .65 * b * Math.cos(i * Math.PI / 2 + Math.PI / 4), y: hole.y + .65 * b * Math.sin(i * Math.PI / 2 + Math.PI / 4)})), [hole, b]);
  const probe = {x: hole.x + .45 * b, y: hole.y - .5 * b};
  /** Move the hole, held inside the charge, and onto the centre when it comes within a hair of it. */
  const place = (to: Pt) => {
    const held = holeAt(to), next = Math.hypot(held.x, held.y) < .02 ? {x: 0, y: 0} : held;
    const was = Math.hypot(hole.x, hole.y) < .02, now = Math.hypot(next.x, next.y) < .02;
    setHole(next);
    if (was !== now) setSaid(now ? 'The hole is centred: there is no field in it.' : `The hole is off centre, ${towards(next)}: the field in it is the same everywhere, ${sign > 0 ? 'along' : 'against'} d.`);
  };
  const toWorld = (e: PointerEvent) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return {x: (p.x - C.x) / U, y: (C.y - p.y) / U};
  };
  const keys = (e: KeyboardEvent) => {
    const step = e.shiftKey ? .15 : .05, d: Record<string, Pt> = {ArrowLeft: {x: -step, y: 0}, ArrowRight: {x: step, y: 0}, ArrowUp: {x: 0, y: step}, ArrowDown: {x: 0, y: -step}};
    if (e.key === 'Home') { e.preventDefault(); place({x: 0, y: 0}); return; }
    const by = d[e.key];
    if (!by) return;
    e.preventDefault();
    place({x: hole.x + by.x, y: hole.y + by.y});
  };
  const o = toScreen({x: 0, y: 0}), h = toScreen(hole);
  const [e1, e2] = holePieces(shape, hole, probe, sign).map(times), sum = field(probe);
  const ps = toScreen(probe), tip1 = {x: ps.x + SCALE * e1.x, y: ps.y - SCALE * e1.y}, tip2 = {x: tip1.x + SCALE * e2.x, y: tip1.y - SCALE * e2.y};
  const name = shape === 'ball' ? 'ball' : 'rod';
  return <section className="gs-instrument gs-holes" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">Move the hole</h2>
      <p className="gs-instrument-lede">{shape === 'ball' ? 'A charged ball cut through its centre and the centre of a hole in it.' : 'A charged rod cut square to its axis, with a hole drilled along it.'} Drag the hole, or move it with the arrow keys: every arrow in the hole is the same, and it follows d, the step from the {shape === 'ball' ? 'ball’s centre' : 'rod’s axis'} to the hole’s. Try it on a ball or on a rod, whichever case the figure above shows.</p>
    </div>
    <div className="gs-choices">
      {/* Named for what it does here, and named on the page: called "The charge" it read as the figure's own case
          picker above it, under the same name, and the two disagreed (Sheet with a hole above, A ball here). */}
      <div className="gs-choice-group"><span id={`${uid}-on`} className="gs-choices-name">Try it on</span>
      <div className="cd-view-modes" role="group" aria-labelledby={`${uid}-on`}>{([['A ball', 'ball'], ['A rod, end on', 'rod']] as const).map(([label, v]) => <button key={v} type="button" className={'cd-view-mode' + (shape === v ? ' is-on' : '')} aria-pressed={shape === v} onClick={() => setShape(v)}>{label}</button>)}</div></div>
      <div className="gs-choice-group"><span id={`${uid}-at`} className="gs-choices-name">At one point of the hole</span>
      <div className="cd-view-modes" role="group" aria-labelledby={`${uid}-at`}>{([['The field', false], ['Show the two pieces', true]] as const).map(([label, v]) => <button key={label} type="button" className={'cd-view-mode' + (pieces === v ? ' is-on' : '')} aria-pressed={pieces === v} onClick={() => setPieces(v)}>{label}</button>)}</div></div>
    </div>
    <svg ref={svg} className="gs-instrument-svg gs-hole-svg" viewBox="0 0 640 344" role="group" aria-labelledby={`${uid}-what`}
      onPointerMove={e => { if (!grabbed.current) return; const w = toWorld(e); if (w) place({x: w.x - offset.current.x, y: w.y - offset.current.y}); }}
      onPointerUp={() => { grabbed.current = false; }} onPointerCancel={() => { grabbed.current = false; }}>
      <title id={`${uid}-what`}>{`A ${name} of ${sign > 0 ? 'positive' : 'negative'} charge with a round hole in it, ${centred ? 'centred: there is no field in the hole' : `off centre: the field in the hole is the same everywhere, ${sign > 0 ? 'along' : 'against'} d`}.`}</title>
      <circle className="gs-charge is-body" cx={o.x} cy={o.y} r={U} />
      <circle className="gs-hole" cx={h.x} cy={h.y} r={b * U} />
      <g aria-hidden="true">{grid.filter(g => !g.inHole).map((g, i) => { const a = arrowAt(g.p, field(g.p)); return a && <Arrow key={i} a={a.a} b={a.b} className="gs-arrow gs-e is-faint" />; })}</g>
      <g aria-hidden="true">{(pieces ? [] : inner).map((p, i) => { const a = arrowAt(p, field(p)); return a && <Arrow key={i} a={a.a} b={a.b} className="gs-arrow gs-e is-hole" head={8} />; })}</g>
      {pieces && <g aria-hidden="true">
        <Arrow a={ps} b={tip1} className="gs-arrow gs-e is-part" head={8} />
        <Arrow a={tip1} b={tip2} className="gs-arrow gs-e is-part" head={8} />
        <Arrow a={ps} b={{x: ps.x + SCALE * sum.x, y: ps.y - SCALE * sum.y}} className="gs-arrow gs-e is-answer" head={10} />
        <circle className="gs-p" cx={ps.x} cy={ps.y} r={3.5} />
        <text className="gs-name gs-field-name" x={(ps.x + tip1.x) / 2 - 10} y={(ps.y + tip1.y) / 2 - 8} textAnchor="end">E₁</text>
        <text className="gs-name gs-field-name" x={(tip1.x + tip2.x) / 2 + 10} y={(tip1.y + tip2.y) / 2} textAnchor="start">E₂</text>
      </g>}
      {/* d: from the charge's centre to the hole's. */}
      {!centred && <g aria-hidden="true"><Arrow a={o} b={h} className="gs-arrow gs-dvec" head={8} /><text className="gs-name gs-dvec-name" x={(o.x + h.x) / 2 - 12} y={(o.y + h.y) / 2 - 10} textAnchor="end">d</text></g>}
      <circle className="gs-centre" cx={o.x} cy={o.y} r={3} aria-hidden="true" />
      <g className="gs-q gs-hole-handle" role="button" tabIndex={0} aria-roledescription="draggable hole"
        aria-label={`The hole, ${centred ? 'centred' : `off centre, ${towards(hole)}`} in the ${name}. Arrow keys move it; Home centres it.`}
        transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)})`} onKeyDown={keys}
        onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); grabbed.current = true; const w = toWorld(e); offset.current = w ? {x: w.x - hole.x, y: w.y - hole.y} : {x: 0, y: 0}; (e.currentTarget as SVGGElement).focus({preventScroll: true}); try { svg.current?.setPointerCapture(e.pointerId); } catch { /* still drags */ } }}>
        <circle className="gs-q-hit" r={b * U} />
        <circle className="gs-hole-grip" r={5} />
      </g>
    </svg>
    <div className="gs-readout" data-centred={centred ? 'yes' : 'no'} data-shape={shape}>
      <MathText tex={holeTex(shape, centred)} block />
      <p>{centred
        ? `A hole at the ${name}’s centre: the whole ${name}’s field and the plug’s cancel at every point in it, as for any empty hollow centred in a round charge.`
        : `The whole ${name}’s field runs along the radius from its ${shape === 'ball' ? 'centre' : 'axis'}, and the plug’s along the radius from the hole’s, the other way, since its charge is opposite. Added, they give a field that is the same everywhere in the hole, ${sign > 0 ? 'along' : 'against'} d.`}</p>
      <output className="sr-only" aria-live="polite">{said}</output>
    </div>
  </section>;
}
