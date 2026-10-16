'use client';
/* Inline SVG needs role=img to expose one named figure, and in space the figure IS the control the arrow keys
   turn, so it takes the focus: as the integral lessons' figure does (ChargeDiagram), for the same reasons. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex */
import {memo, useCallback, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode} from 'react';
import {projectPoint} from '../diagrams/three/orthoCamera';
import {ViewCube} from '../diagrams/ViewCube';
import type {CameraView} from '../diagrams/camera';
import type {RunClock} from '../explorer/BuildPlayer';
import {useRenderedWidth} from '../components/useRenderedWidth';
import {add, norm, scale, sub, unit as unitV, v3, type V3} from './physics';
import {moment, type GaussStage} from './run';
import {arrowLength, build, lookAt, REST, type Built, type Look, type Seg} from './scene';
import {GaussScene} from './GaussScene';
import type {GaussCase} from './types';
import '../diagrams/charge-diagram.css';
/* THE GAUSS FIGURE: the charge, a closed surface cut into patches, each patch's field E and its outward dA, the
 * patches that carry nothing lit as zero, the charge inside lit, and P. In space (GaussScene, WebGL, under this
 * SVG) or as the cross-section through the axis, drawn here in SVG; the two are drawn from one plan (scene.ts),
 * so they cannot disagree. The run's clock moves it through the recipe; at rest it shows the finished picture.
 *
 * The SVG carries what the scene cannot: the names (P, E, dA, r, the charge inside), the view cube, and the
 * keyboard. The page prints no numerals, and neither does the figure. */
export type FigureView = '3d' | '2d';
const ORIGIN = {x: 360, y: 222};
const opening = (c: GaussCase): CameraView => c.figure.surface.kind === 'pillbox' ? {yaw: -.5, pitch: .3} : {yaw: -.5, pitch: .34};
const FLAT: CameraView = {yaw: 0, pitch: 0};
type Props = {
  kase: GaussCase; size: number; sign: 1 | -1;
  /** The run, while it is open: its clock and stages, read here so a frame of it renders the figure alone. */
  run: {clock: RunClock; stages: readonly GaussStage[]} | null;
  view: FigureView; onView: (view: FigureView) => void;
};
/** A short arrow drawn in SVG from `a` to `b`, its head a filled triangle. */
function Arrow({a, b, className, head = 9}: {a: {x: number; y: number}; b: {x: number; y: number}; className: string; head?: number}) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < 1.5) return null;
  const ux = dx / len, uy = dy / len, h = Math.min(head, len * .5), w = h * .5;
  const bx = b.x - ux * h, by = b.y - uy * h;
  return <g className={className}><line x1={a.x} y1={a.y} x2={bx} y2={by} /><path d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)}L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}Z`} /></g>;
}
/** A name on the figure, in the figure's italic serif, held off what it names by a halo of paper. */
const Name = ({x, y, children, className = '', anchor = 'middle'}: {x: number; y: number; children: ReactNode; className?: string; anchor?: 'start' | 'middle' | 'end'}) =>
  <text className={'gs-name ' + className} x={x.toFixed(1)} y={y.toFixed(1)} textAnchor={anchor} dominantBaseline="middle">{children}</text>;
/** What the charge inside is called, as the board writes it. */
function insideName(c: GaussCase, b: Built): ReactNode {
  const k = c.figure.charge.kind, R = c.figure.charge.size, g = b.surface;
  // What is inside, as the right side writes it: all of a ball or a shell only once the surface is outside it.
  const tail = k === 'line' ? '= λL' : k === 'sheet' ? '= σA' : k === 'point' ? '= q' : k === 'ball' ? (g.r >= R ? '= Q' : '= Qr³/R³') : k === 'shell' ? (g.r > R ? '= Q' : '= 0')
    : g.h >= R ? '= 2ρAa' : '= 2ρAz';
  return <>Q<tspan className="gs-sub" dy="5">enc</tspan><tspan dy="-5"> </tspan><tspan>{tail}</tspan></>;
}
export const GaussFigure = memo(function GaussFigure({kase, size, sign, run, view, onView}: Props) {
  // THE RUN'S MOMENT, read from its clock here: a frame of the run renders this figure and nothing else on the page.
  // Held to a few hundred steps a stage, so a frame that moves nothing renders nothing.
  const subscribe = useCallback((on: () => void) => run ? run.clock.subscribe(on) : () => {}, [run]);
  const snap = useSyncExternalStore(subscribe, () => { if (!run) return ''; const m = moment(run.stages, run.clock.get()); return `${m.index}:${Math.round(m.progress * 400)}`; }, () => '');
  const look: Look = useMemo(() => {
    if (!run || !snap) return REST;
    const [i, p] = snap.split(':').map(Number);
    return lookAt({key: run.stages[i].key, progress: p / 400});
  }, [run, snap]);
  const built = useMemo(() => build(kase, size, sign), [kase, size, sign]);
  // Each case keeps the view the reader turned it to; a new case opens at its own.
  const [cams, setCams] = useState<Record<string, CameraView>>({});
  const camera = cams[kase.key] ?? opening(kase);
  const setCamera = (next: CameraView | ((c: CameraView) => CameraView)) => setCams(o => ({...o, [kase.key]: typeof next === 'function' ? next(o[kase.key] ?? opening(kase)) : next}));
  const [failed, setFailed] = useState<false | 'failed' | 'lost'>(false);
  const space = view === '3d' && !failed;
  const cam = space ? camera : FLAT, unit = built.unit;
  const proj = (p: V3) => projectPoint(p, ORIGIN, unit, cam.yaw, cam.pitch);
  const [svgRef, width] = useRenderedWidth(720);
  // Names are held at a readable size as the figure shrinks on a phone, as the integral lessons' are.
  const k = Math.max(1, Math.min(1.9, 720 / Math.max(1, width) * .78));
  // TURNING THE FIGURE: a drag across it, the arrow keys, the view cube. Only in space.
  const drag = useRef<{x: number; y: number} | null>(null);
  const turn = (dYaw: number, dPitch: number) => setCamera(c => ({yaw: c.yaw + dYaw, pitch: Math.max(-.6, Math.min(1.3, c.pitch + dPitch))}));
  const orbit = space ? {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => { if (e.button !== 0) return; drag.current = {x: e.clientX, y: e.clientY}; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* still turns */ } },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => { const d = drag.current; if (!d) return; turn(-(e.clientX - d.x) * .009, (e.clientY - d.y) * .009); drag.current = {x: e.clientX, y: e.clientY}; },
    onPointerUp: () => { drag.current = null; }, onPointerCancel: () => { drag.current = null; },
    onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
      const by: Record<string, [number, number]> = {ArrowLeft: [.14, 0], ArrowRight: [-.14, 0], ArrowUp: [0, .1], ArrowDown: [0, -.1]};
      if (by[e.key]) { e.preventDefault(); turn(...by[e.key]); } else if (e.key === 'Home') { e.preventDefault(); setCamera(opening(kase)); }
    },
  } : {};
  const c = kase.figure.charge, g = built.surface;
  const stage = look.stage;
  // ---- the pieces of the drawing, in both views ----
  const lit = look.sweep * (space ? built.patches.length : built.slice.length);
  const showFieldNames = look.sweep > .5, showInside = look.enclosed > .02, showSolve = look.solve > .02 && (stage === 'solve' || stage === null);
  const fieldLabelAt = (from: V3, e: V3) => { const len = arrowLength(kase, norm(e)), tip = add(from, scale(unitV(e), len)); return proj(tip); };
  const named = space ? built.namedPatch : nearestSeg(built.slice, g.kind === 'pillbox' ? v3(-g.r * .55, 0, g.h) : g.kind === 'cylinder' ? v3(-g.r, 0, g.h * .5) : v3(-g.r * .6, 0, g.r * .8));
  const namedFrom = space ? built.namedPatch.center : (named as Seg).mid;
  const namedNormalBase = space ? add(built.namedPatch.center, scale(sub(built.namedPatch.corners[0], built.namedPatch.center), .32)) : segBase(named as Seg);
  // The parts that carry nothing are named at their left edge: the top of a cylinder's end, the lower half of a pillbox's side.
  const zeroAt = built.patches.some(p => p.zero) ? (g.kind === 'cylinder' ? v3(-g.r * 1.06, 0, g.h) : v3(-g.r * 1.06, 0, -g.h * .5)) : undefined;
  const dAlen = .34 * Math.min(1, built.half / 3.2);
  const nameDA = proj(add(namedNormalBase, scale(space ? built.namedPatch.normal : (named as Seg).normal, dAlen + .16)));
  const nameE = fieldLabelAt(namedFrom, space ? built.namedPatch.field : (named as Seg).field);
  const pAt = proj(built.P);
  const eTip = fieldLabelAt(built.P, built.fieldAtP);
  const round = c.kind !== 'line', insideAt = proj(c.kind === 'line' ? v3(0, 0, -g.h * .55) : c.kind === 'sheet' ? v3(0, 0, -g.h * .5) : v3(0, 0, -(c.kind === 'point' ? .42 : c.size + .4)));
  const sizeName = g.kind === 'pillbox' ? 'z' : 'r';
  const dimFrom = g.kind === 'pillbox' ? v3(-g.r - .28, 0, 0) : v3(0, 0, 0), dimTo = g.kind === 'pillbox' ? v3(-g.r - .28, 0, g.h) : built.P;
  const dimA = proj(dimFrom), dimB = proj(dimTo), dimMid = {x: (dimA.x + dimB.x) / 2, y: (dimA.y + dimB.y) / 2};
  const glyph = sign > 0 ? '+' : '−';
  const marks: V3[] = c.kind === 'line' ? [v3(0, 0, 1.7), v3(0, 0, -1.7), v3(0, 0, 2.4)] : c.kind === 'sheet' ? [v3(1.5, -1.2, 0), v3(-1.6, 1.3, 0), v3(1.9, 1.1, 0), v3(-1.3, -1.6, 0)] : c.kind === 'ball' ? [v3(0, 0, 0)] : [v3(0, 0, 0)];
  const chargeName = c.symbol === '\\lambda' ? 'λ' : c.symbol === '\\sigma' ? 'σ' : c.symbol;
  const chargeAt = proj(c.kind === 'line' ? v3(0, 0, 2.2) : c.kind === 'sheet' ? v3(2.2, -1.9, 0) : v3(0, 0, c.kind === 'ball' ? c.size + .22 : .32));
  const described = `${c.name.replace(/^./, s => s.toUpperCase())}, ${sign > 0 ? 'positive' : 'negative'}, inside a closed ${g.kind === 'pillbox' ? 'pillbox' : g.kind}. ${space ? 'In space: drag, or use the arrow keys, to turn it; Home puts it back.' : 'The cross-section through the axis.'}`;
  return <div className="gs-figure">
    <div className={'cd-stage gs-stage' + (space ? ' is-space' : ' is-flat')} data-stage={stage ?? 'rest'} data-sweep={look.sweep.toFixed(3)} data-solve={look.solve.toFixed(3)} style={{'--cd-k': k} as CSSProperties}>
      {space && <GaussScene kase={kase} built={built} look={look} yaw={camera.yaw} pitch={camera.pitch} unit={unit} origin={ORIGIN} onUnavailable={why => setFailed(why === 'lost' ? 'lost' : 'failed')} />}
      <svg ref={svgRef} className={'cd-svg gs-svg' + (space ? ' cd-orbitable' : '')} viewBox="0 0 720 430" role="img" tabIndex={space ? 0 : undefined} aria-label={described} {...orbit}>
        {!space && <Flat built={built} kase={kase} look={look} lit={lit} proj={proj} />}
        {/* Sign marks on the charge: the colour is the same for either sign, as everywhere on the site. */}
        {(look.stage === null || look.stage === 'symmetry' || look.stage === 'surface') && marks.map((p, i) => { const q = proj(p); return <text key={i} className="gs-sign" x={q.x.toFixed(1)} y={(q.y + (c.kind === 'line' || c.kind === 'sheet' ? -10 : 0)).toFixed(1)} textAnchor="middle" dominantBaseline="middle">{glyph}</text>; })}
        {(stage === 'symmetry' || stage === 'surface') && <Name x={chargeAt.x + 14} y={chargeAt.y} anchor="start" className="gs-charge-name">{chargeName}</Name>}
        {/* The size the slider moves, from the centre (or the sheet) to the surface. */}
        {look.surface > .5 && <g className="gs-dimension"><line x1={dimA.x} y1={dimA.y} x2={dimB.x} y2={dimB.y} /><Name x={dimMid.x + (g.kind === 'pillbox' ? -14 : 0)} y={dimMid.y + (g.kind === 'pillbox' ? 0 : -13)}>{sizeName}</Name></g>}
        {showFieldNames && <>
          {stage === 'left' && <Name x={nameE.x + 12} y={nameE.y - 8} anchor="start" className="gs-field-name">E</Name>}
          <Name x={nameDA.x + 10} y={nameDA.y - 8} anchor="start" className="gs-normal-name">dA</Name>
        </>}
        {showFieldNames && zeroAt && look.sweep >= 1 - 1e-6 && (() => { const z = proj(zeroAt); return <Name x={z.x - 10} y={z.y + (g.kind === 'cylinder' ? -12 : 0)} anchor="end" className="gs-zero-name">E · dA = 0</Name>; })()}
        {showInside && <Name x={insideAt.x + (round ? 0 : 16)} y={insideAt.y} anchor={round ? 'middle' : 'start'} className="gs-inside-name">{insideName(kase, built)}</Name>}
        {(stage === null || stage === 'solve') && <>
          <circle className="gs-p" cx={pAt.x} cy={pAt.y} r={4.5} />
          <Name x={pAt.x + (g.kind === 'pillbox' ? 12 : 10)} y={pAt.y + (g.kind === 'pillbox' ? 18 : 16)} anchor="start" className="gs-p-name">P</Name>
        </>}
        {showSolve && !space && <Arrow a={pAt} b={{x: pAt.x + (eTip.x - pAt.x) * look.solve, y: pAt.y + (eTip.y - pAt.y) * look.solve}} className="gs-arrow gs-e is-answer" head={12} />}
        {showSolve && look.solve > .6 && <Name x={eTip.x + 12} y={eTip.y - 10} anchor="start" className="gs-field-name is-answer">E</Name>}
        {space && <ViewCube view={camera} at={{x: 664, y: 58}} size={20} minFont={11 / k} onPick={next => setCamera(next)} onSpin={(dx, dy) => turn(-dx * .009, dy * .009)} onStep={key => turn(key === 'ArrowLeft' ? .2 : key === 'ArrowRight' ? -.2 : 0, key === 'ArrowUp' ? .12 : key === 'ArrowDown' ? -.12 : 0)} />}
      </svg>
    </div>
    <div className="cd-toolbar">
      <div className="cd-view-modes" role="group" aria-label="How to view the figure">
        {([['3D', '3d', 'In space: drag, or use the arrow keys, to turn it'], ['Cross-section', '2d', 'The slice through the axis, flat']] as const).map(([label, value, title]) =>
          <button key={value} type="button" title={title} disabled={value === '3d' && failed === 'failed'} className={'cd-view-mode' + (view === value && !(value === '3d' && failed) ? ' is-on' : value === '2d' && failed ? ' is-on' : '')}
            aria-pressed={value === '2d' ? !space : space} onClick={() => { if (value === '3d') setFailed(f => f === 'lost' ? false : f); onView(value); }}>{label}</button>)}
      </div>
      {space && <div className="cd-pad"><button type="button" className="text-button cd-orbit-reset" onClick={() => setCamera(opening(kase))} disabled={Math.abs(camera.yaw - opening(kase).yaw) < 1e-6 && Math.abs(camera.pitch - opening(kase).pitch) < 1e-6}>Reset view</button></div>}
      {failed && <output className="cd-stage-unavailable">{failed === 'lost' ? 'The 3D view was interrupted, so the figure is drawn as its cross-section. Choose 3D to try again.' : 'The 3D view is not available on this device, so the figure is drawn as its cross-section.'}</output>}
    </div>
    <div className="cd-caption"><span>Teal arrows are the field E at each patch, grey ones the patch’s outward dA. Shaded patches carry no flux.</span></div>
  </div>;
});
/** The segment nearest a point, for the names. */
function nearestSeg(segs: Seg[], to: V3): Seg {
  const crossed = segs.filter(s => !s.zero), pool = crossed.length ? crossed : segs;
  return pool.reduce((best, s) => norm(sub(s.mid, to)) < norm(sub(best.mid, to)) ? s : best, pool[0]);
}
/** Where a segment's dA is drawn from: a little along it from its middle, so it does not lie under E. */
function segBase(s: Seg): V3 {
  const a = v3(s.a[0], 0, s.a[1]);
  if (s.arc) { const t = Math.atan2(s.mid.x, s.mid.z) - .14; return v3(s.arc * Math.sin(t), 0, s.arc * Math.cos(t)); }
  return add(s.mid, scale(sub(a, s.mid), .4));
}
/** THE CROSS-SECTION: the plane through the axis, drawn flat. Every arrow in it lies in the plane, since every
 * one of these fields does there. */
function Flat({built, kase, look, lit, proj}: {built: Built; kase: GaussCase; look: Look; lit: number; proj: (p: V3) => {x: number; y: number}}) {
  const c = built.charge, g = built.surface, u = built.unit, o = proj(v3(0, 0, 0));
  const charge = c.kind === 'point' ? <circle className="gs-charge" cx={o.x} cy={o.y} r={6} />
    : c.kind === 'ball' ? <circle className="gs-charge is-body" cx={o.x} cy={o.y} r={c.size * u} />
    : c.kind === 'shell' ? <circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={c.size * u} />
    : c.kind === 'line' ? <line className="gs-charge is-line" x1={o.x} y1={-20} x2={o.x} y2={450} />
    : c.kind === 'sheet' ? <line className="gs-charge is-line" x1={-20} y1={o.y} x2={740} y2={o.y} />
    : <rect className="gs-charge is-body" x={-20} y={o.y - c.size * u} width={760} height={2 * c.size * u} />;
  const inside = look.enclosed > .02 && (c.kind === 'point' ? <circle className="gs-inside" cx={o.x} cy={o.y} r={13} />
    : c.kind === 'ball' ? <circle className="gs-inside is-body" cx={o.x} cy={o.y} r={Math.min(c.size, g.r) * u} /> : c.kind === 'shell' ? g.r > c.size && <circle className="gs-inside is-shell" cx={o.x} cy={o.y} r={c.size * u} />
    : c.kind === 'line' ? <line className="gs-inside is-line" x1={o.x} y1={o.y - g.h * u} x2={o.x} y2={o.y + g.h * u} />
    : c.kind === 'sheet' ? <line className="gs-inside is-line" x1={o.x - g.r * u} y1={o.y} x2={o.x + g.r * u} y2={o.y} />
    : <rect className="gs-inside is-body" x={o.x - g.r * u} y={o.y - Math.min(g.h, c.size) * u} width={2 * g.r * u} height={2 * Math.min(g.h, c.size) * u} />);
  const dA = .34 * Math.min(1, built.half / 3.2);
  return <g className="gs-flat">
    <g className="gs-charge-layer">{charge}</g>
    {inside && <g style={{opacity: look.enclosed}}>{inside}</g>}
    {look.spokes > .01 && <g className="gs-spokes" style={{opacity: Math.min(1, look.spokes * 1.4)}}>{built.flatSpokes.map((s, i) => {
      const len = arrowLength(kase, norm(s.field)) * .85 * look.spokes, d = unitV(s.field), a = proj(sub(s.at, scale(d, len / 2))), b = proj(add(s.at, scale(d, len / 2)));
      return <Arrow key={i} a={a} b={b} className="gs-arrow gs-e" />;
    })}</g>}
    {look.surface > .01 && <g className="gs-surface" style={{opacity: look.surface}}>
      {built.slice.map((s, i) => {
        const a = proj(v3(s.a[0], 0, s.a[1])), b = proj(v3(s.b[0], 0, s.b[1])), reached = i < lit, here = look.stage === 'left' && reached && i >= lit - 1;
        const d = s.arc ? `M${a.x.toFixed(1)} ${a.y.toFixed(1)}A${(s.arc * u).toFixed(1)} ${(s.arc * u).toFixed(1)} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}` : `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        return <path key={s.key} d={d} className={'gs-seg' + (s.zero && reached ? ' is-zero' : '') + (here && !s.zero ? ' is-lit' : '')} data-zero={s.zero || undefined} />;
      })}
      {built.slice.map(s => <circle key={s.key} className="gs-cut" cx={proj(v3(s.a[0], 0, s.a[1])).x} cy={proj(v3(s.a[0], 0, s.a[1])).y} r={2.2} />)}
    </g>}
    {look.surface > .01 && <g className="gs-normals">{built.slice.map(s => { const base = segBase(s), a = proj(base), b = proj(add(base, scale(s.normal, dA * look.surface))); return <Arrow key={s.key} a={a} b={b} className="gs-arrow gs-n" head={7} />; })}</g>}
    <g className="gs-fields">{built.slice.map((s, i) => {
      const f = Math.max(0, Math.min(1, lit - i));
      if (!(f > 0)) return null;
      const len = arrowLength(kase, norm(s.field)) * f, a = proj(s.mid), b = proj(add(s.mid, scale(unitV(s.field), len)));
      return <Arrow key={s.key} a={a} b={b} className={'gs-arrow gs-e' + (s.zero ? ' is-along' : '')} />;
    })}</g>
  </g>;
}
