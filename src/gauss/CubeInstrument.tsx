'use client';
/* A figure that is one named group, a charge in an SVG that is a control: neither has a tag of its own inside an
   <svg>, so the role says it. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode} from 'react';
import {MathText} from '../components/Math';
import {v3} from './physics';
import {FACES, cubeAt, cubeShares, type Face, type Pt} from './instruments';
/* A CHARGE IN A CUBE: the instrument under When symmetry runs out. A cube cut through its middle, and a point charge in
 * the cut to drag about (or move with the arrow keys). Beside it, each face's share of the flux, as a bar: the share
 * is the part of the sky the face fills as seen from the charge (instruments.ts `cubeShares`, exact). Move the charge
 * and the shares change, the near face's growing; their sum, the bar under them, never does. Only with the charge at
 * the centre are the six equal, and only there does symmetry alone say what each is: a sixth.
 *
 * The page prints no numerals: the bars are lengths, all on one scale, the sum's full width the whole flux. */
const C = {x: 160, y: 172}, U = 120, BAR = {x: 390, w: 220, top: 50, gap: 34};
const toScreen = (p: Pt) => ({x: C.x + U * p.x, y: C.y - U * p.y});
const NAMES: Record<Face, string> = {top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right', front: 'Front', back: 'Back'};
export function CubeInstrument({sign}: {sign: 1 | -1}) {
  const uid = useId();
  const [q, setQ] = useState<Pt>({x: .45, y: .25});
  const [said, setSaid] = useState('');
  const svg = useRef<SVGSVGElement>(null), grabbed = useRef(false);
  const shares = useMemo(() => cubeShares(v3(q.x, 0, q.y)), [q]);
  const centred = Math.hypot(q.x, q.y) < .02;
  const order = [...FACES].sort((a, b) => shares[b] - shares[a]);
  // Faces that tie are named together: on a line of symmetry two faces take the same share.
  const most = order.filter(f => shares[f] > shares[order[0]] - 1e-9), least = order.filter(f => shares[f] < shares[order[5]] + 1e-9);
  const named = (fs: Face[]) => `${fs.map(f => NAMES[f].toLowerCase()).join(' and ')} face${fs.length > 1 ? 's' : ''}`;
  const place = (to: Pt) => {
    const held = cubeAt(to), next = Math.hypot(held.x, held.y) < .05 ? {x: 0, y: 0} : held, was = Math.hypot(q.x, q.y) < .02, now = Math.hypot(next.x, next.y) < .02;
    setQ(next);
    if (was !== now) { setSaid(now ? 'The charge is at the centre: the six faces share the flux equally.' : 'The charge is off centre: the faces share the flux unequally, and the sum is unchanged.'); return; }
    // Said aloud when the face taking the most, or the least, changes.
    const s = cubeShares(v3(next.x, 0, next.y)), o = [...FACES].sort((a, b) => s[b] - s[a]);
    if (!now && (o[0] !== order[0] || o[5] !== order[5])) setSaid(`The ${NAMES[o[0]].toLowerCase()} face now takes the largest share, the ${NAMES[o[5]].toLowerCase()} the smallest; the sum is unchanged.`);
  };
  const toWorld = (e: PointerEvent) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return {x: (p.x - C.x) / U, y: (C.y - p.y) / U};
  };
  const keys = (e: KeyboardEvent) => {
    const step = e.shiftKey ? .25 : .08, d: Record<string, Pt> = {ArrowLeft: {x: -step, y: 0}, ArrowRight: {x: step, y: 0}, ArrowUp: {x: 0, y: step}, ArrowDown: {x: 0, y: -step}};
    if (e.key === 'Home') { e.preventDefault(); place({x: 0, y: 0}); return; }
    const by = d[e.key];
    if (!by) return;
    e.preventDefault();
    place({x: q.x + by.x, y: q.y + by.y});
  };
  const p = toScreen(q), glyph = sign > 0 ? '+' : '−';
  // The cut's four edges, drawn as thick as their faces' shares: the near face heavy, the far one light.
  const edge = (f: Face) => 26 * shares[f];
  const corner = (x: number, y: number) => toScreen({x, y});
  const [tl, tr, br, bl] = [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)];
  return <section className="gs-instrument gs-cube" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">A charge in a cube</h2>
      <p className="gs-instrument-lede">A cube cut through its middle, with a charge in the cut: the square is the cut, its edges the top, bottom, left and right faces, each drawn as thick as its share; the front face is toward you and the back away from you. Drag the charge, or move it with the arrow keys: each face’s share of the flux changes, and their sum never does. Home puts it at the centre.</p>
    </div>
    <svg ref={svg} className="gs-instrument-svg gs-cube-svg" viewBox="0 0 640 344" role="group" aria-labelledby={`${uid}-what`}
      onPointerMove={e => { if (!grabbed.current) return; const w = toWorld(e); if (w) place(w); }}
      onPointerUp={() => { grabbed.current = false; }} onPointerCancel={() => { grabbed.current = false; }}>
      <title id={`${uid}-what`}>{`A cube cut through its middle with a ${sign > 0 ? 'positive' : 'negative'} charge ${centred ? 'at its centre: the six faces share the flux equally' : `off centre: the ${named(most)} take${most.length > 1 ? '' : 's'} the largest share and the ${named(least)} the smallest`}. The shares always add to the whole flux.`}</title>
      <g className="gs-cube-cut" aria-hidden="true">
        <rect className="gs-cube-face" x={tl.x} y={tl.y} width={2 * U} height={2 * U} />
        <line className="gs-cube-edge" x1={tl.x} y1={tl.y} x2={tr.x} y2={tr.y} strokeWidth={edge('top')} />
        <line className="gs-cube-edge" x1={bl.x} y1={bl.y} x2={br.x} y2={br.y} strokeWidth={edge('bottom')} />
        <line className="gs-cube-edge" x1={tl.x} y1={tl.y} x2={bl.x} y2={bl.y} strokeWidth={edge('left')} />
        <line className="gs-cube-edge" x1={tr.x} y1={tr.y} x2={br.x} y2={br.y} strokeWidth={edge('right')} />
        <circle className="gs-centre" cx={C.x} cy={C.y} r={2.5} />
        {/* Each edge named for the face it is, so a bar can be found on the square. */}
        <text className="gs-bar-name" x={(tl.x + tr.x) / 2} y={tl.y - 14} textAnchor="middle">Top</text>
        <text className="gs-bar-name" x={(bl.x + br.x) / 2} y={bl.y + 22} textAnchor="middle">Bottom</text>
        <text className="gs-bar-name" x={tl.x - 12} y={(tl.y + bl.y) / 2} textAnchor="end" dominantBaseline="middle">Left</text>
        <text className="gs-bar-name" x={tr.x + 12} y={(tr.y + br.y) / 2} dominantBaseline="middle">Right</text>
      </g>
      <g className="gs-q is-inside" role="button" tabIndex={0} aria-roledescription="draggable charge"
        aria-label={`Charge q, ${sign > 0 ? 'positive' : 'negative'}, ${centred ? 'at the centre of' : 'off centre in'} the cube. Arrow keys move it; Home puts it at the centre.`}
        transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} onKeyDown={keys}
        onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); grabbed.current = true; (e.currentTarget as SVGGElement).focus({preventScroll: true}); try { svg.current?.setPointerCapture(e.pointerId); } catch { /* still drags */ } }}>
        <circle className="gs-q-hit" r={22} />
        <circle className="gs-q-body" r={13} />
        <text className="gs-q-sign" textAnchor="middle" dominantBaseline="central">{glyph}</text>
      </g>
      {/* Each face's share, on one scale: the whole bar's width is the whole flux. */}
      <g aria-hidden="true">{FACES.map((f, i) => {
        const y = BAR.top + i * BAR.gap;
        return <g key={f}>
          <text className="gs-bar-name" x={BAR.x - 10} y={y + 9} textAnchor="end" dominantBaseline="middle">{NAMES[f]}</text>
          <rect className="gs-bar-track" x={BAR.x} y={y} width={BAR.w} height={18} rx={3} />
          <rect className="gs-bar" x={BAR.x} y={y} width={BAR.w * shares[f]} height={18} rx={3} />
          {/* A sixth, where every bar would end with the charge at the centre. */}
          <line className="gs-bar-sixth" x1={BAR.x + BAR.w / 6} y1={y - 2} x2={BAR.x + BAR.w / 6} y2={y + 20} />
        </g>;
      })}
        <text className="gs-bar-name" x={BAR.x - 10} y={BAR.top + 6 * BAR.gap + 13} textAnchor="end" dominantBaseline="middle">All six</text>
        <g>{FACES.reduce<{x: number; out: ReactNode[]}>((acc, f, i) => { const w = BAR.w * shares[f]; acc.out.push(<rect key={f} className={'gs-bar is-sum' + (i % 2 ? ' is-alt' : '')} x={BAR.x + acc.x} y={BAR.top + 6 * BAR.gap + 4} width={w} height={18} />); acc.x += w; return acc; }, {x: 0, out: []}).out}</g>
      </g>
    </svg>
    <div className="gs-readout" data-centred={centred ? 'yes' : 'no'} data-largest={order[0]}>
      <MathText tex={centred ? String.raw`\Phi_{\text{face}}=\frac{q}{6\varepsilon_0}\ \text{each},\qquad\Phi=\frac{q}{\varepsilon_0}` : String.raw`\Phi_{\text{top}}+\dots+\Phi_{\text{back}}=\frac{q}{\varepsilon_0}`} block />
      <p>{centred
        ? 'At the centre the six faces are alike as seen from the charge, so they share the flux equally. That is symmetry at work, not an integral.'
        : `Off centre the faces differ: the ${named(most)} take${most.length > 1 ? '' : 's'} the most and the ${named(least)} the least, and finding any one share means doing its integral. Front and back always match, since the charge stays in the mirror plane between them. Gauss’s law still fixes the sum.`}</p>
      <output className="sr-only" aria-live="polite">{said}</output>
    </div>
  </section>;
}
