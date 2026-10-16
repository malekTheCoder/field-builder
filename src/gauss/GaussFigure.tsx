'use client';
/* Inline SVG needs role=img to expose one named figure, and in space the figure IS the control the arrow keys
   turn, so it takes the focus: as the integral lessons' figure does (ChargeDiagram), for the same reasons. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex */
import {memo, useCallback, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode} from 'react';
import {projectPoint} from '../diagrams/three/orthoCamera';
import {ViewCube} from '../diagrams/ViewCube';
import type {CameraView} from '../diagrams/camera';
import type {RunClock} from '../explorer/BuildPlayer';
import {useRenderedWidth} from '../components/useRenderedWidth';
import {add, isBall, norm, scale, sub, unit as unitV, v3, type V3} from './physics';
import {moment, type GaussStage} from './run';
import {build, lookAt, REST, type Built, type Look, type Seg} from './scene';
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
  const k = c.figure.charge.kind, R = c.figure.charge.size, B = c.figure.charge.outer ?? R * 2, g = b.surface;
  // What is inside, as the right side writes it: all of a ball or a shell only once the surface is outside it.
  const q = c.figure.charge.symbol;
  const tail = k === 'line' ? '= λL' : k === 'sheet' || k === 'face' || k === 'plates' ? '= σA' : k === 'point' ? `= ${q}` : k === 'offset' ? (g.r > R ? `= ${q}` : '= 0')
    : isBall(k) ? (g.r >= R ? '= Q' : k === 'rising' ? '= Qr⁴/R⁴' : k === 'falling' ? '= Qr³(4R − 3r)/R⁴' : '= Qr³/R³')
    : k === 'shell' || k === 'metal' ? (g.r > R ? '= Q' : '= 0')
    : k === 'rod' ? (g.r >= R ? '= λL' : '= λLr²/R²') : k === 'tube' ? (g.r > R ? '= λL' : '= 0')
    : k === 'coax' ? (g.r <= R ? '= 0' : g.r < B ? '= λL' : '= λL − λL = 0')
    : k === 'cavity' ? (g.r < R ? '= q' : g.r <= B ? '= q − q = 0' : '= q − q + q = q')
    : k === 'tent' ? (g.h >= R ? '= ρ₀Aa' : '= 2ρ₀A(z − z²/2a)') : g.h >= R ? '= 2ρAa' : '= 2ρAz';
  return <>Q<tspan className="gs-sub" dy="5">enc</tspan><tspan dy="-5"> </tspan><tspan>{zeroUpright(tail)}</tspan></>;
}
/** A name with its zeros, and its subscript zeros (ρ₀), set upright: the serif's italic zero reads as an o. */
function zeroUpright(text: string): ReactNode {
  const parts = text.split(/([0₀])/);
  return parts.map((p, i) => p === '0' || p === '₀' ? <tspan key={i} className={'gs-zero' + (p === '₀' ? ' gs-sub' : '')}>0</tspan> : p);
}
/** The sign marks on a charge: where each sits, and whether it has the charge's own sign or the opposite one (the
 * −λ of a coaxial pair's outer shell, the −σ plate, the −q a hollow's wall takes). */
function signMarks(c: GaussCase['figure']['charge']): {at: V3; own: boolean}[] {
  const R = c.size, B = c.outer ?? R * 2, own = (at: V3) => ({at, own: true}), other = (at: V3) => ({at, own: false});
  const round = (r: number, angles: number[]) => angles.map(t => v3(r * Math.sin(t), 0, r * Math.cos(t)));
  switch (c.kind) {
    case 'line': case 'rod': return [v3(0, 0, 1.7), v3(0, 0, -1.7), v3(0, 0, 2.4)].map(own);
    case 'tube': return [v3(-R, 0, 1.7), v3(R, 0, -1.7), v3(R, 0, 2.3)].map(own);
    case 'coax': return [...[v3(-R, 0, 1.75), v3(R, 0, -1.75)].map(own), ...[v3(-B, 0, -1.6), v3(B, 0, 1.6)].map(other)];
    case 'sheet': case 'face': return [v3(1.5, -1.2, 0), v3(-1.6, 1.3, 0), v3(1.9, 1.1, 0), v3(-1.3, -1.6, 0)].map(own);
    case 'plates': return [...[v3(1.6, -1.2, 0), v3(-1.7, 1.3, 0)].map(own), ...[v3(1.6, -1.2, -R), v3(-1.7, 1.3, -R)].map(other)];
    case 'metal': return round(R, [.6, 2.2, 3.7, 5.2]).map(own);
    case 'offset': return [own(v3(0, 0, R))];
    case 'tent': return [v3(1.6, 0, 0), v3(-1.6, 0, 0)].map(own);
    case 'cavity': return [own(v3(0, 0, 0)), ...round(R, [.9, 2.5, 4.1, 5.5]).map(other), ...round(B, [.5, 1.9, 3.3, 5.6]).map(own)];
    default: return [own(v3(0, 0, 0))];
  }
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
  const fieldLabelAt = (from: V3, e: V3, len: number) => proj(add(from, scale(unitV(e), len)));
  const named = space ? built.namedPatch : nearestSeg(built.slice, g.kind === 'pillbox' ? v3(-g.r * .55, 0, g.h) : g.kind === 'cylinder' ? v3(-g.r, 0, g.h * .5) : v3(-g.r * .6, 0, g.r * .8));
  const namedFrom = space ? built.namedPatch.center : (named as Seg).mid;
  const namedNormalBase = space ? add(built.namedPatch.center, scale(sub(built.namedPatch.corners[0], built.namedPatch.center), .32)) : segBase(named as Seg);
  // The parts that carry nothing are named at their left edge: the top of a cylinder's end, the lower half of a pillbox's side.
  const zeroAt = built.patches.some(p => p.zero) ? (g.kind === 'cylinder' ? v3(-g.r * 1.06, 0, g.h) : v3(-g.r * 1.06, 0, c.kind === 'plates' ? g.h * .5 : -g.h * .5)) : undefined;
  const dAlen = .34 * Math.min(1, built.half / 3.2);
  const nameDA = proj(add(namedNormalBase, scale(space ? built.namedPatch.normal : (named as Seg).normal, dAlen + .16)));
  const namedField = space ? built.namedPatch.field : (named as Seg).field, nameE = fieldLabelAt(namedFrom, namedField, space ? built.namedPatch.span : (named as Seg).span ?? 0);
  // Where E and dA lie along each other and are drawn about as long, their names would land together: dA steps aside.
  const clash = Math.hypot(nameE.x - nameDA.x, nameE.y - nameDA.y) < 34;
  const pAt = proj(built.P);
  const eTip = fieldLabelAt(built.P, built.fieldAtP, built.spanAtP);
  const axial = c.kind === 'line' || c.kind === 'rod' || c.kind === 'tube' || c.kind === 'coax', flat = c.kind === 'sheet' || c.kind === 'face' || c.kind === 'plates';
  // The charge inside is named under it; under the part of a ball the sphere encloses; above a charge off the centre
  // when it is inside, and at the centre, beneath the r, when it is outside and nothing is.
  const offsetIn = c.kind === 'offset' && g.r > c.size;
  const round = !axial, insideAt = proj(axial ? v3(0, 0, -g.h * .55) : flat ? v3(0, 0, c.kind === 'plates' ? g.h * .5 : -g.h * .5)
    : c.kind === 'offset' ? v3(0, 0, offsetIn ? c.size + .48 : -.42) : c.kind === 'tent' ? v3(0, 0, -(Math.min(g.h, c.size) + .32))
    : v3(0, 0, -(c.kind === 'point' ? .42 : c.kind === 'cavity' || c.kind === 'metal' ? Math.max(g.r, c.size) + .32 : isBall(c.kind) ? Math.min(c.size, g.r) + .4 : c.size + .4)));
  const sizeName = g.kind === 'pillbox' ? 'z' : 'r';
  const dimFrom = g.kind === 'pillbox' ? v3(-g.r - .28, 0, 0) : v3(0, 0, 0), dimTo = g.kind === 'pillbox' ? v3(-g.r - .28, 0, c.kind === 'plates' ? -g.h : g.h) : built.P;
  const dimA = proj(dimFrom), dimB = proj(dimTo), dimMid = {x: (dimA.x + dimB.x) / 2, y: (dimA.y + dimB.y) / 2};
  const glyph = sign > 0 ? '+' : '−';
  const marks = signMarks(c), other = sign > 0 ? '−' : '+';
  const chargeName = c.symbol === '\\lambda' ? 'λ' : c.symbol === '\\sigma' ? 'σ' : c.symbol === '\\rho' ? 'ρ' : c.symbol;
  const chargeAt = proj(c.kind === 'line' || c.kind === 'rod' ? v3(0, 0, 2.2) : c.kind === 'tube' || c.kind === 'coax' ? v3(c.size, 0, 2.2) : flat ? v3(2.2, -1.9, 0) : c.kind === 'tent' ? v3(2.2, -1.9, c.size * .5)
    : v3(0, 0, c.kind === 'ball' || c.kind === 'metal' || c.kind === 'shell' || isBall(c.kind) ? c.size + .22 : c.kind === 'offset' ? c.size + .32 : .32));
  // Where the closed surface stands to the charge, said as it is: round all of it, cutting through it, inside a
  // shell, or beside a charge it leaves out.
  const enclosesAll = c.kind === 'offset' ? g.r > c.size : isBall(c.kind) ? g.r >= c.size : c.kind === 'shell' ? g.r > c.size : true;
  const relation = enclosesAll ? `inside a closed ${g.kind === 'pillbox' ? 'pillbox' : g.kind}` : c.kind === 'offset' ? 'outside a closed sphere' : c.kind === 'shell' ? 'round a closed sphere inside it' : 'with a closed sphere cutting through it';
  const described = `${c.name.replace(/^./, s => s.toUpperCase())}, ${sign > 0 ? 'positive' : 'negative'}, ${relation}. ${space ? 'In space: drag, or use the arrow keys, to turn it; Home puts it back.' : 'The cross-section through the axis.'}`;
  const noField = norm(built.fieldAtP) < 1e-12;
  return <div className="gs-figure">
    <div className={'cd-stage gs-stage' + (space ? ' is-space' : ' is-flat')} data-stage={stage ?? 'rest'} data-sweep={look.sweep.toFixed(3)} data-solve={look.solve.toFixed(3)} style={{'--cd-k': k} as CSSProperties}>
      {space && <GaussScene kase={kase} built={built} look={look} yaw={camera.yaw} pitch={camera.pitch} unit={unit} origin={ORIGIN} onUnavailable={why => setFailed(why === 'lost' ? 'lost' : 'failed')} />}
      <svg ref={svgRef} className={'cd-svg gs-svg' + (space ? ' cd-orbitable' : '')} viewBox="0 0 720 430" role="img" tabIndex={space ? 0 : undefined} aria-label={described} {...orbit}>
        {!space && <Flat built={built} look={look} lit={lit} proj={proj} />}
        {/* Sign marks on the charge: the colour is the same for either sign, as everywhere on the site. */}
        {(look.stage === null || look.stage === 'symmetry' || look.stage === 'surface') && marks.map((m, i) => { const q = proj(m.at); return <text key={i} className="gs-sign" x={q.x.toFixed(1)} y={(q.y + (axial || flat ? -10 : 0)).toFixed(1)} textAnchor="middle" dominantBaseline="middle">{m.own ? glyph : other}</text>; })}
        {(stage === 'symmetry' || stage === 'surface') && <Name x={chargeAt.x + 14} y={chargeAt.y} anchor="start" className="gs-charge-name">{chargeName}</Name>}
        {/* The size the slider moves, from the centre (or the sheet) to the surface. */}
        {look.surface > .5 && <g className="gs-dimension"><line x1={dimA.x} y1={dimA.y} x2={dimB.x} y2={dimB.y} /><Name x={dimMid.x + (g.kind === 'pillbox' ? -14 : 0)} y={dimMid.y + (g.kind === 'pillbox' ? 0 : Math.hypot(dimMid.x - nameDA.x - 10, dimMid.y - 13 - nameDA.y + 8) < 32 ? 16 : -13)}>{sizeName}</Name></g>}
        {showFieldNames && <>
          {stage === 'left' && norm(namedField) > 1e-9 && <Name x={nameE.x + 12} y={nameE.y - 8} anchor="start" className="gs-field-name">E</Name>}
          {stage === 'left' && clash && norm(namedField) > 1e-9 ? <Name x={nameDA.x - 8} y={nameDA.y + 16} anchor="end" className="gs-normal-name">dA</Name>
            : <Name x={nameDA.x + 10} y={nameDA.y - 8} anchor="start" className="gs-normal-name">dA</Name>}
        </>}
        {showFieldNames && zeroAt && look.sweep >= 1 - 1e-6 && (() => { const z = proj(zeroAt); return <Name x={z.x - 10} y={z.y + (g.kind === 'cylinder' ? -12 : 0)} anchor="end" className="gs-zero-name">E · dA = <tspan className="gs-zero">0</tspan></Name>; })()}
        {showInside && <Name x={insideAt.x + (round ? 0 : 16)} y={insideAt.y} anchor={round ? 'middle' : 'start'} className="gs-inside-name">{insideName(kase, built)}</Name>}
        {built.answerAtP && (stage === null || stage === 'solve') && <>
          <circle className="gs-p" cx={pAt.x} cy={pAt.y} r={4.5} />
          <Name x={pAt.x + (g.kind === 'pillbox' ? 12 : 10)} y={pAt.y + (g.kind === 'pillbox' ? 18 : 16)} anchor="start" className="gs-p-name">P</Name>
        </>}
        {built.answerAtP && showSolve && !space && <Arrow a={pAt} b={{x: pAt.x + (eTip.x - pAt.x) * look.solve, y: pAt.y + (eTip.y - pAt.y) * look.solve}} className="gs-arrow gs-e is-answer" head={12} />}
        {/* Where the field at P is zero (inside a shell) there is no arrow to name, so the name says so. */}
        {built.answerAtP && showSolve && look.solve > .6 && <Name x={eTip.x + 12} y={eTip.y - 10} anchor="start" className="gs-field-name is-answer">{noField ? <>E = <tspan className="gs-zero">0</tspan></> : 'E'}</Name>}
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
    <div className="cd-caption"><span>Teal arrows are the field E at each patch, grey ones the patch’s outward dA. Shaded patches carry no flux.{c.kind === 'offset' && ' Here an arrow’s length grows as the square root of the field, which changes too much over the sphere for one scale.'}</span></div>
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
function Flat({built, look, lit, proj}: {built: Built; look: Look; lit: number; proj: (p: V3) => {x: number; y: number}}) {
  const c = built.charge, g = built.surface, u = built.unit, o = proj(v3(0, 0, 0));
  const R = c.size * u, B = (c.outer ?? c.size * 2) * u;
  // Two vertical lines at ±x from the axis: a cylindrical shell's cut, the whole height or the length the surface holds.
  const walls = (x: number, cls: string, half = 0) => <>{[-1, 1].map(k => <line key={k} className={cls} x1={o.x + k * x} y1={half ? o.y - half : -20} x2={o.x + k * x} y2={half ? o.y + half : 450} />)}</>;
  const ring = (r0: number, r1: number) => `M${o.x - r1} ${o.y}a${r1} ${r1} 0 1 0 ${2 * r1} 0a${r1} ${r1} 0 1 0 ${-2 * r1} 0Z` + (r0 > 0 ? `M${o.x - r0} ${o.y}a${r0} ${r0} 0 1 0 ${2 * r0} 0a${r0} ${r0} 0 1 0 ${-2 * r0} 0Z` : '');
  const gradient = useId().replace(/:/g, '');
  const at = c.kind === 'offset' ? proj(v3(0, 0, c.size)) : o;
  const charge = c.kind === 'point' || c.kind === 'offset' ? <circle className="gs-charge" cx={at.x} cy={at.y} r={6} />
    : c.kind === 'ball' ? <circle className="gs-charge is-body" cx={o.x} cy={o.y} r={R} />
    // A ball whose density varies with r is shaded as it does: darker where there is more charge.
    : c.kind === 'rising' || c.kind === 'falling' ? <circle className="gs-charge is-body is-graded" cx={o.x} cy={o.y} r={R} style={{fill: `url(#${gradient})`}} />
    : c.kind === 'tent' ? <rect className="gs-charge is-body is-graded" x={-20} y={o.y - R} width={760} height={2 * R} style={{fill: `url(#${gradient})`}} />
    : c.kind === 'shell' ? <circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={R} />
    : c.kind === 'line' ? <line className="gs-charge is-line" x1={o.x} y1={-20} x2={o.x} y2={450} />
    : c.kind === 'sheet' ? <line className="gs-charge is-line" x1={-20} y1={o.y} x2={740} y2={o.y} />
    : c.kind === 'rod' ? <rect className="gs-charge is-body" x={o.x - R} y={-20} width={2 * R} height={470} />
    : c.kind === 'tube' ? walls(R, 'gs-charge is-line')
    : c.kind === 'coax' ? <>{walls(R, 'gs-charge is-line')}{walls(B, 'gs-charge is-line')}</>
    // A conductor: the metal grey, its charge a line along its surfaces.
    : c.kind === 'metal' ? <><path className="gs-metal" d={ring(0, R)} /><circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={R} /></>
    : c.kind === 'cavity' ? <><path className="gs-metal" d={ring(R, B)} fillRule="evenodd" /><circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={R} /><circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={B} /><circle className="gs-charge" cx={o.x} cy={o.y} r={6} /></>
    : c.kind === 'face' ? <><rect className="gs-metal" x={-20} y={o.y} width={760} height={460 - o.y} /><line className="gs-charge is-line" x1={-20} y1={o.y} x2={740} y2={o.y} /></>
    : c.kind === 'plates' ? <><line className="gs-charge is-line" x1={-20} y1={o.y} x2={740} y2={o.y} /><line className="gs-charge is-line" x1={-20} y1={o.y + R} x2={740} y2={o.y + R} /></>
    : <rect className="gs-charge is-body" x={-20} y={o.y - R} width={760} height={2 * R} />;
  const H = g.h * u;
  const inside = look.enclosed > .02 && (c.kind === 'point' ? <circle className="gs-inside" cx={o.x} cy={o.y} r={13} />
    : c.kind === 'offset' ? g.r > c.size && <circle className="gs-inside" cx={at.x} cy={at.y} r={13} />
    : isBall(c.kind) ? <circle className={'gs-inside ' + (c.kind === 'ball' ? 'is-body' : 'is-shell')} cx={o.x} cy={o.y} r={Math.min(c.size, g.r) * u} /> : c.kind === 'shell' || c.kind === 'metal' ? g.r > c.size && <circle className="gs-inside is-shell" cx={o.x} cy={o.y} r={R} />
    : c.kind === 'line' ? <line className="gs-inside is-line" x1={o.x} y1={o.y - H} x2={o.x} y2={o.y + H} />
    : c.kind === 'sheet' || c.kind === 'face' || c.kind === 'plates' ? <line className="gs-inside is-line" x1={o.x - g.r * u} y1={o.y} x2={o.x + g.r * u} y2={o.y} />
    : c.kind === 'rod' ? <rect className="gs-inside is-body" x={o.x - Math.min(c.size, g.r) * u} y={o.y - H} width={2 * Math.min(c.size, g.r) * u} height={2 * H} />
    : c.kind === 'tube' || c.kind === 'coax' ? g.r > c.size && <>{walls(R, 'gs-inside is-line', H)}{c.kind === 'coax' && g.r * u > B && walls(B, 'gs-inside is-line', H)}</>
    : c.kind === 'cavity' ? <><circle className="gs-inside" cx={o.x} cy={o.y} r={13} />{g.r > c.size && <circle className="gs-inside is-shell" cx={o.x} cy={o.y} r={R} />}{g.r * u > B && <circle className="gs-inside is-shell" cx={o.x} cy={o.y} r={B} />}</>
    : <rect className="gs-inside is-body" x={o.x - g.r * u} y={o.y - Math.min(g.h, c.size) * u} width={2 * g.r * u} height={2 * Math.min(g.h, c.size) * u} />);
  const dA = .34 * Math.min(1, built.half / 3.2);
  // The density's shading: from the centre out for a ball, from the middle plane out for the tent slab.
  const stops = c.kind === 'rising' ? [[0, .08], [1, .95]] : [[0, .95], [1, .08]];
  return <g className="gs-flat">
    {(c.kind === 'rising' || c.kind === 'falling') && <defs><radialGradient id={gradient} cx="50%" cy="50%" r="50%">{stops.map(([at, op]) => <stop key={at} offset={at} style={{stopColor: 'var(--charge)', stopOpacity: op * .62}} />)}</radialGradient></defs>}
    {c.kind === 'tent' && <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">{[[0, .05], [.5, .6], [1, .05]].map(([at, op]) => <stop key={at} offset={at} style={{stopColor: 'var(--charge)', stopOpacity: op}} />)}</linearGradient></defs>}
    <g className="gs-charge-layer">{charge}</g>
    {inside && <g style={{opacity: look.enclosed}}>{inside}</g>}
    {look.spokes > .01 && <g className="gs-spokes" style={{opacity: Math.min(1, look.spokes * 1.4)}}>{built.flatSpokes.map((s, i) => {
      const len = (s.span ?? 0) * look.spokes, d = unitV(s.field), a = proj(s.at), b = proj(add(s.at, scale(d, len)));
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
      const len = (s.span ?? 0) * f, a = proj(s.mid), b = proj(add(s.mid, scale(unitV(s.field), len)));
      return <Arrow key={s.key} a={a} b={b} className={'gs-arrow gs-e' + (s.zero ? ' is-along' : '')} />;
    })}</g>
  </g>;
}
