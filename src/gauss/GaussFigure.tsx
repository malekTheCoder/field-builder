'use client';
/* Inline SVG needs role=img to expose one named figure, and in space the figure IS the control the arrow keys
   turn, so it takes the focus: as the integral lessons' figure does (ChargeDiagram), for the same reasons. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex */
import {memo, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode} from 'react';
import {cameraBasis, projectPoint} from '../diagrams/three/orthoCamera';
import {nearestOnBox, placeLabels, type Box, type Segment} from '../diagrams/labels';
import {ViewCube} from '../diagrams/ViewCube';
import type {CameraView} from '../diagrams/camera';
import type {RunClock} from '../explorer/BuildPlayer';
import {useRenderedWidth} from '../components/useRenderedWidth';
import {useReducedMotion} from 'motion/react';
import {add, dot, enclosedCharge, isBall, norm, scale, sub, v3, type V3} from './physics';
import {moment, type GaussStage} from './run';
import {arrowEnds, build, chainOf, FIGURE_ORIGIN, lookAt, openingView, POINT_PX, REST, type Built, type Look, type Seg} from './scene';
import {GaussScene} from './GaussScene';
import {regionOf} from './instruments';
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
const ORIGIN = FIGURE_ORIGIN;
const opening = (c: GaussCase): CameraView => openingView(c);
const FLAT: CameraView = {yaw: 0, pitch: 0};
type Props = {
  kase: GaussCase; size: number; sign: 1 | -1;
  /** The lesson's other cases: the caption holds the room the longest of theirs needs, so choosing a case never
   * moves the controls under the reader's hand. */
  siblings?: readonly GaussCase[];
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
  const lo = g.low ?? -g.h, inSlab = (z: number) => Math.max(-R, Math.min(R, z));
  const tail = k === 'line' ? '= λL' : k === 'segment' ? '= 2λℓ' : k === 'halo' ? '= 4πρ₀a²(r − a arctan(r/a))' : k === 'cusp' ? (g.r < R ? '= 2πβr²' : '= 2πβR²')
    : k === 'oddslab' ? (inSlab(g.h) - inSlab(lo) < 1e-9 || g.h >= R ? '= 0' : '= ρ₀A(z² − a²)/2a') : k === 'sheet' || k === 'face' || k === 'plates' ? '= σA' : k === 'point' ? `= ${q}` : k === 'offset' ? (g.r > R ? `= ${q}` : '= 0')
    : isBall(k) ? (g.r >= R ? '= Q' : k === 'rising' ? '= Qr⁴/R⁴' : k === 'falling' ? '= Qr³(4R − 3r)/R⁴' : '= Qr³/R³')
    : k === 'shell' || k === 'metal' ? (g.r > R ? '= Q' : '= 0')
    : k === 'rod' ? (g.r >= R ? '= λL' : '= λLr²/R²') : k === 'tube' ? (g.r > R ? '= λL' : '= 0')
    : k === 'coax' ? (g.r <= R ? '= 0' : g.r < B ? '= λL' : '= λL − λL = 0')
    : k === 'cavity' ? (g.r < R ? '= q' : g.r <= B ? '= q − q = 0' : '= q − q + q = q')
    : k === 'tent' ? (g.h >= R ? '= ρ₀Aa' : '= 2ρ₀A(z − z²/2a)') : g.h >= R ? '= 2ρAa' : '= 2ρAz';
  const named = c.figure.charge.insideNames?.[regionOf(c, g.kind === 'pillbox' ? g.h : g.r)];
  return <>Q<tspan className="gs-sub" dy="5">enc</tspan><tspan dy="-5"> </tspan><tspan>{zeroUpright(named ?? tail)}</tspan></>;
}
/** The charge inside's name as plain text, for the room its label takes. */
function insideText(c: GaussCase, b: Built): string {
  const flat = (n: ReactNode): string => typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(flat).join('') : n && typeof n === 'object' && 'props' in n ? flat((n.props as {children?: ReactNode}).children) : '';
  return flat(insideName(c, b));
}
type NameSpec = {key: string; x: number; y: number; anchor: 'start' | 'middle' | 'end'; className: string; content: ReactNode; text: string;
  /** Its font size in the figure's units, once scaled for a small figure. */
  size: number; keep: boolean; from?: {x: number; y: number};
  /** It names an arrow, so it may be tried on the arrow's other side. */
  mirror?: boolean};
type PlacedName = NameSpec & {leader?: Segment};
/** The box a name's text takes, from its length: the serif's italic runs about six tenths of its size a letter. */
function nameBox(n: NameSpec): Box {
  const w = Math.max(1, n.text.length) * n.size * .56 + 4, h = n.size * 1.1;
  return {x: n.anchor === 'start' ? n.x - 2 : n.anchor === 'end' ? n.x - w + 2 : n.x - w / 2, y: n.y - h / 2, width: w, height: h};
}
/** Where each name goes: its own spot if that is clear, else the nearest clear one, the kept ones on a leader if they
 * must go further, the rest left out. In order: the first named hold their ground. */
function placeNames(specs: NameSpec[], strokes: Segment[], marks: Box[], answer?: Segment): PlacedName[] {
  if (!specs.length) return [];
  const boxes = specs.map(nameBox);
  // Only an arrow's name may go to the far side of what it names: the other side of an arrow still names it, but a
  // point's or a charge's name reflected through it landed on the charge.
  const nudges = placeLabels(specs.map((n, i) => ({box: boxes[i], keep: n.keep, ...(n.from ? {from: n.from} : {}), ...(n.from && n.mirror ? {mirror: n.from} : {}), ...(n.key === 'e-at-p' && answer ? {shaft: answer} : {})})),
    {frame: {width: 720, height: 430}, obstacles: marks, lines: strokes, pad: 2, labelPad: 5, maxShift: 46, leaderReach: 2.2});
  return specs.flatMap((n, i) => {
    const d = nudges[i];
    if (d.hidden) return [];
    const at = {x: n.x + d.dx, y: n.y + d.dy};
    if (!d.leader || !n.from) return [{...n, ...at}];
    const b = {x: boxes[i].x + d.dx, y: boxes[i].y + d.dy, width: boxes[i].width, height: boxes[i].height};
    return [{...n, ...at, leader: {a: n.from, b: nearestOnBox(b, n.from)}}];
  });
}
/** A name with its zeros, and its subscript zeros (ρ₀), set upright: the serif's italic zero reads as an o. */
function zeroUpright(text: string): ReactNode {
  // A subscript (ρ₀, or E_R as a lesson's own names write it) is dropped below the line and the text after it raised
  // back: a subscript zero set in place rode high and read as ρ⁰.
  const out: ReactNode[] = [];
  let low = false, k = 0;
  const put = (t: string, cls?: string, sub = false) => {
    if (!t) return;
    const dy = sub && !low ? 4 : !sub && low ? -4 : 0;
    low = sub;
    out.push(<tspan key={k++} className={cls} dy={dy || undefined}>{t}</tspan>);
  };
  for (const part of text.split(/([0₀]|_\w)/)) {
    if (part === '0') put('0', 'gs-zero');
    else if (part === '₀') put('0', 'gs-zero gs-sub', true);
    else if (part.startsWith('_') && part.length === 2) put(part.slice(1), 'gs-sub', true);
    else put(part);
  }
  return out;
}
/** What each piece of a superposition holds inside its own surface, as the board's right side writes it. */
function pieceText(k: GaussCase['figure']['charge']['kind'], i: number): string {
  if (k === 'ballhole') return i ? 'Q₂ = −ρ·4πr₂³/3' : 'Q₁ = ρ·4πr₁³/3';
  if (k === 'rodhole') return i ? 'Q₂ = −ρπr₂²L' : 'Q₁ = ρπr₁²L';
  return 'Q₁ = σA';
}
/** The sign marks on a charge: where each sits, and whether it has the charge's own sign or the opposite one (the
 * −λ of a coaxial pair's outer shell, the −σ plate, the −q a hollow's wall takes). */
function signMarks(c: GaussCase['figure']['charge']): {at: V3; own: boolean; disc?: boolean}[] {
  const R = c.size, B = c.outer ?? R * 2, own = (at: V3) => ({at, own: true}), other = (at: V3) => ({at, own: false}), disc = (at: V3) => ({at, own: true, disc: true});
  const round = (r: number, angles: number[]) => angles.map(t => v3(r * Math.sin(t), 0, r * Math.cos(t)));
  switch (c.kind) {
    case 'line': case 'rod': return [v3(0, 0, 1.7), v3(0, 0, -1.7), v3(0, 0, 2.4)].map(own);
    case 'tube': return [v3(-R, 0, 1.7), v3(R, 0, -1.7), v3(R, 0, 2.3)].map(own);
    case 'coax': return [...[v3(-R, 0, 1.75), v3(R, 0, -1.75)].map(own), ...[v3(-B, 0, -1.6), v3(B, 0, 1.6)].map(other)];
    case 'sheet': case 'face': return [v3(1.5, -1.2, 0), v3(-1.6, 1.3, 0), v3(1.9, 1.1, 0), v3(-1.3, -1.6, 0)].map(own);
    case 'plates': return [...[v3(1.6, -1.2, 0), v3(-1.7, 1.3, 0)].map(own), ...[v3(1.6, -1.2, -R), v3(-1.7, 1.3, -R)].map(other)];
    case 'metal': return round(R, [.6, 2.2, 3.7, 5.2]).map(own);
    case 'offset': return [disc(v3(0, 0, R))];
    case 'tent': return [v3(1.6, 0, 0), v3(-1.6, 0, 0)].map(own);
    case 'cavity': return [disc(v3(0, 0, 0)), ...round(R, [.9, 2.5, 4.1, 5.5]).map(other), ...round(B, [.5, 1.9, 3.3, 5.6]).map(own)];
    // A charge with a hole: its own sign on the charge, none in the hole, which is empty.
    case 'ballhole': return round(R * .72, [3.4, 4.3, 5.2, 2.5]).map(own);
    case 'rodhole': return [v3(-R * .55, 0, 1.7), v3(-R * .55, 0, -1.7)].map(own);
    case 'sheethole': return [v3(1.9, -1.4, 0), v3(-1.9, 1.5, 0), v3(2.1, 1.3, 0), v3(-1.6, -1.8, 0)].map(own);
    case 'segment': return [v3(0, 0, .2), v3(0, 0, -.35)].map(own);
    case 'oddslab': return [...[v3(2.3, 0, R * .5), v3(-2.3, 0, R * .5)].map(own), ...[v3(2.3, 0, -R * .5), v3(-2.3, 0, -R * .5)].map(other)];
    // A point charge's sign is set on its own disc, in the paper's colour: haloed over a small dot, it covered the
    // dot, and a minus read as an equals sign.
    default: return [disc(c.at ?? v3(0, 0, 0))];
  }
}
/** What the figure shows, said aloud: the charge with its sign said of the part it belongs to, where the closed
 * surface stands to it, from the same regions and enclosed charge the board's right side counts, and, where the
 * surface holds none, that it holds none. Never a default: "inside a closed cylinder" said of an infinite line, or
 * of a metal ball a sphere sits within, was false. */
export function describe(kase: GaussCase, b: Built, space: boolean): string {
  const c = kase.figure.charge, g = b.surface, k = c.kind, R = c.size, B = c.outer ?? R * 2, r = g.r, h = g.h;
  const sign = b.charge.sign, own = sign > 0 ? 'positive' : 'negative', other = sign > 0 ? 'negative' : 'positive';
  const signed = k === 'coax' ? `the inner shell ${own}, the outer ${other}` : k === 'plates' ? `the upper plate ${own}, the lower ${other}`
    : k === 'oddslab' ? `its upper half ${own}, its lower half ${other}` : k === 'cavity' ? `the charge in the hollow ${own}` : own;
  const relation = (() => {
    switch (k) {
      case 'point': return g.kind === 'cube' ? 'inside a closed cube' : 'at the centre of a closed sphere';
      case 'offset': return r > R ? 'inside a closed sphere, off its centre' : 'outside a closed sphere, which holds none of it';
      case 'ball': case 'rising': case 'falling': case 'cusp': return r >= R ? 'inside a closed sphere round all of it' : 'with a closed sphere cutting through it, round the part nearer the centre';
      case 'halo': return 'with a closed sphere round the part of it nearer the centre';
      case 'shell': return r > R ? 'inside a closed sphere round all of it' : 'with a closed sphere inside the shell';
      case 'metal': return r > R ? 'inside a closed sphere round all of it' : 'with a closed sphere inside the metal';
      case 'cavity': return r < R ? 'with a closed sphere inside the hollow, round the charge' : r <= B ? 'with a closed sphere inside the metal, round the hollow' : 'inside a closed sphere round the whole ball';
      case 'ballhole': return 'with a closed sphere about its centre, through it, and another about the hole';
      case 'line': return 'with a closed cylinder round a length of it';
      case 'segment': return h >= R ? 'inside a closed cylinder round all of it' : 'with a closed cylinder round the middle of it';
      case 'rod': return r >= R ? 'with a closed cylinder round a length of it' : 'with a closed cylinder inside it, round a length of its axis';
      case 'tube': return r > R ? 'with a closed cylinder round a length of it' : 'with a closed cylinder inside the shell';
      case 'coax': return r <= R ? 'with a closed cylinder inside the inner shell' : r < B ? 'with a closed cylinder between the shells, round a length of the inner one' : 'with a closed cylinder round a length of both shells';
      case 'rodhole': return 'with a closed cylinder about its axis, through it, and another about the hole';
      case 'sheet': return 'with a closed pillbox through it';
      case 'sheethole': return 'with a closed pillbox through it, about the hole';
      case 'slab': case 'tent': return h >= R ? 'with a closed pillbox through it, its faces outside it' : 'with a closed pillbox through its middle plane, its faces inside it';
      case 'oddslab': return 'with a closed pillbox through part of it';
      case 'face': return 'with a closed pillbox through its face, one end in the metal';
      case 'plates': return 'with a closed pillbox through the upper plate, its other end between the plates';
    }
  })();
  const none = !b.pieces && Math.abs(enclosedCharge(b.charge, g)) < 1e-12 ? ' The surface holds no net charge.' : '';
  return `${c.name.replace(/^./, x => x.toUpperCase())}, ${signed}, ${relation}.${none} ${space ? 'In space: drag, or use the arrow keys, to turn it; Home puts it back.' : 'The cross-section through the axis.'}`;
}
export const GaussFigure = memo(function GaussFigure({kase, size, sign, siblings, run, view, onView}: Props) {
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
  // A view picked on the cube is glided to, as the integral lessons' figure glides, and said aloud; with reduced
  // motion it is set at once.
  const reduced = useReducedMotion();
  const [announcement, setAnnouncement] = useState('');
  const glide = useRef(0);
  useEffect(() => () => cancelAnimationFrame(glide.current), []);
  const stopGlide = () => { cancelAnimationFrame(glide.current); glide.current = 0; };
  const glideTo = (to: CameraView, seconds = .5) => {
    stopGlide();
    const from = camera, turnOnce = 2 * Math.PI, dYaw = ((to.yaw - from.yaw + Math.PI) % turnOnce + turnOnce) % turnOnce - Math.PI, dPitch = to.pitch - from.pitch;
    if (reduced || seconds <= 0) { setCamera(to); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const f = Math.min(1, (now - t0) / (seconds * 1000)), e = f < .5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      setCamera(f >= 1 ? {...to} : {yaw: from.yaw + dYaw * e, pitch: from.pitch + dPitch * e});
      glide.current = f < 1 ? requestAnimationFrame(step) : 0;
    };
    glide.current = requestAnimationFrame(step);
  };
  const [failed, setFailed] = useState<false | 'failed' | 'lost'>(false);
  const space = view === '3d' && !failed;
  const cam = space ? camera : FLAT, unit = built.unit;
  const proj = (p: V3) => projectPoint(p, ORIGIN, unit, cam.yaw, cam.pitch);
  const [svgRef, width] = useRenderedWidth(720);
  // Names are held at a readable size as the figure shrinks on a phone, as the integral lessons' are.
  const k = Math.max(1, Math.min(1.9, 720 / Math.max(1, width) * .78));
  // TURNING THE FIGURE: a drag across it, the arrow keys, the view cube. Only in space.
  const drag = useRef<{x: number; y: number} | null>(null);
  const turn = (dYaw: number, dPitch: number) => { stopGlide(); turnBy(dYaw, dPitch); };
  const turnBy = (dYaw: number, dPitch: number) => setCamera(c => ({yaw: c.yaw + dYaw, pitch: Math.max(-.6, Math.min(1.3, c.pitch + dPitch))}));
  const orbit = space ? {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => { if (e.button !== 0) return; stopGlide(); drag.current = {x: e.clientX, y: e.clientY}; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* still turns */ } },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => { const d = drag.current; if (!d) return; turn(-(e.clientX - d.x) * .009, (e.clientY - d.y) * .009); drag.current = {x: e.clientX, y: e.clientY}; },
    onPointerUp: () => { drag.current = null; }, onPointerCancel: () => { drag.current = null; },
    onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
      const by: Record<string, [number, number]> = {ArrowLeft: [.14, 0], ArrowRight: [-.14, 0], ArrowUp: [0, .1], ArrowDown: [0, -.1]};
      if (by[e.key]) { e.preventDefault(); turn(...by[e.key]); } else if (e.key === 'Home') { e.preventDefault(); glideTo(opening(kase), .45); setAnnouncement('The opening view.'); }
    },
  } : {};
  const c = kase.figure.charge, g = built.surface;
  const stage = look.stage;
  // ---- the pieces of the drawing, in both views ----
  const lit = look.sweep * (space ? built.patches.length : built.slice.length);
  const showFieldNames = look.sweep > .5, showInside = look.enclosed > .02, showSolve = look.solve > .02 && (stage === 'solve' || stage === null);
  // An arrow's name goes at its free end: its tip, or for one laid tip-on (a field pointing in), its tail.
  const fieldLabelAt = (from: V3, e: V3, len: number, back = false) => { const ends = arrowEnds(from, e, len, back); return proj(back ? ends.from : ends.to); };
  const named = space ? built.namedPatch : nearestSeg(built.slice, g.kind === 'pillbox' ? v3(-g.r * .55, 0, g.h) : g.kind === 'cylinder' ? v3(-g.r, 0, g.h * .5) : v3(-g.r * .6, 0, g.r * .8));
  const namedFrom = space ? built.namedPatch.center : (named as Seg).mid;
  const namedNormalBase = space ? add(built.namedPatch.center, scale(sub(built.namedPatch.corners[0], built.namedPatch.center), .32)) : segBase(named as Seg);
  // The parts that carry nothing are named at their left edge: the top of a cylinder's end, the lower half of a pillbox's side.
  const zeroAt = built.patches.some(p => p.zero) ? (g.kind === 'cylinder' ? v3(-g.r * 1.06, 0, g.h) : v3(-g.r * 1.06, 0, c.kind === 'plates' ? g.h * .5 : g.low !== undefined ? (g.low + g.h) / 2 : -g.h * .5)) : undefined;
  const dAlen = .34 * Math.min(1, built.half / 3.2);
  const nameDA = proj(add(namedNormalBase, scale(space ? built.namedPatch.normal : (named as Seg).normal, dAlen + .16)));
  const namedField = space ? built.namedPatch.field : (named as Seg).field, nameE = fieldLabelAt(namedFrom, namedField, space ? built.namedPatch.span : (named as Seg).span ?? 0, space ? built.namedPatch.back : (named as Seg).back);
  // Where E and dA lie along each other and are drawn about as long, their names would land together: dA steps aside.
  const clash = Math.hypot(nameE.x - nameDA.x, nameE.y - nameDA.y) < 34;
  const pAt = proj(built.P);
  const eTip = fieldLabelAt(built.P, built.fieldAtP, built.spanAtP, built.backAtP);
  // The answer's arrow as laid: from P, or ending at P with its tail outside.
  const answer = arrowEnds(built.P, built.fieldAtP, built.spanAtP * look.solve, built.backAtP), answerFrom = proj(answer.from), answerTo = proj(answer.to);
  const axial = c.kind === 'line' || c.kind === 'rod' || c.kind === 'tube' || c.kind === 'coax' || c.kind === 'rodhole' || c.kind === 'segment', flat = c.kind === 'sheet' || c.kind === 'face' || c.kind === 'plates' || c.kind === 'sheethole';
  // The charge inside is named under it; under the part of a ball the sphere encloses; above a charge off the centre
  // when it is inside, and at the centre, beneath the r, when it is outside and nothing is.
  const offsetIn = c.kind === 'offset' && g.r > c.size;
  const round = !axial, insideAt = proj(axial ? v3(0, 0, -g.h * .55) : flat ? v3(0, 0, c.kind === 'plates' ? g.h * .5 : -g.h * .5)
    : c.kind === 'offset' ? v3(0, 0, offsetIn ? c.size + .48 : -.42) : c.kind === 'point' && c.at ? add(c.at, v3(0, 0, -.42)) : c.kind === 'tent' ? v3(0, 0, -(Math.min(g.h, c.size) + .32)) : c.kind === 'oddslab' ? v3(0, 0, (g.low ?? -g.h) - .32) : c.kind === 'halo' ? v3(0, 0, -(g.r + .3)) : c.kind === 'cusp' ? v3(0, 0, -(Math.max(c.size, g.r) + .35))
    : v3(0, 0, -(c.kind === 'point' ? .42 : c.kind === 'cavity' || c.kind === 'metal' ? Math.max(g.r, c.size) + .32 : isBall(c.kind) ? Math.min(c.size, g.r) + .4 : c.size + .4)));
  // A superposition names its two surfaces' radii r₁ and r₂, the whole charge's and the plug's.
  const plug = built.pieces?.[1]?.surface, sizeName = g.kind === 'pillbox' ? 'z' : g.kind === 'cube' ? 'a' : plug ? 'r₁' : 'r';
  const dimFrom = g.kind === 'pillbox' ? v3(-g.r - .28, 0, 0) : v3(0, 0, 0), dimTo = g.kind === 'pillbox' ? v3(-g.r - .28, 0, c.kind === 'plates' ? -g.h : g.h) : g.kind === 'cube' ? v3(-g.h, 0, 0) : built.P;
  const dimA = proj(dimFrom), dimB = proj(dimTo), dimMid = {x: (dimA.x + dimB.x) / 2, y: (dimA.y + dimB.y) / 2};
  // The plug's radius, from its centre (in the cut's plane) to P.
  const plugA = plug?.center ? proj(plug.center) : null, plugMid = plugA ? {x: (plugA.x + dimB.x) / 2, y: (plugA.y + dimB.y) / 2} : null;
  const glyph = sign > 0 ? '+' : '−';
  // Only the marks that fall inside the frame: an infinite line's, out along it, stood in the card's heading once the
  // figure was fitted to what it draws.
  const marks = signMarks(c).filter(m => { const q = proj(m.at); return q.x > 10 && q.x < 710 && q.y > 14 && q.y < 416; }), other = sign > 0 ? '−' : '+';
  const chargeName = c.symbol === '\\lambda' ? 'λ' : c.symbol === '\\sigma' ? 'σ' : c.symbol === '\\rho' ? 'ρ' : c.symbol;
  const chargeAt = proj(c.kind === 'line' || c.kind === 'rod' ? v3(0, 0, 2.2) : c.kind === 'segment' ? v3(0, 0, c.size + .3) : c.kind === 'point' && c.at ? add(c.at, v3(0, 0, .32)) : c.kind === 'rodhole' ? v3(-c.size * .55, 0, 2.2) : c.kind === 'tube' || c.kind === 'coax' ? v3(c.size, 0, 2.2) : flat ? v3(2.2, -1.9, 0) : c.kind === 'tent' || c.kind === 'oddslab' ? v3(2.2, -1.9, c.size * .5)
    : v3(0, 0, c.kind === 'ball' || c.kind === 'metal' || c.kind === 'shell' || c.kind === 'ballhole' || c.kind === 'cusp' || isBall(c.kind) ? c.size + .22 : c.kind === 'halo' ? c.size * 2 + .2 : c.kind === 'offset' ? c.size + .32 : .32));
  // A superposition's charge inside, piece by piece, where each is lit: the whole charge's, and the plug's.
  const pieceNames = built.pieces && showInside ? built.pieces.map((p, i) => {
    const s = p.surface, at = p.charge.at ?? v3(0, 0, 0);
    if (!s && i) return null;
    const where = c.kind === 'sheethole' ? v3(g.r + .25, 0, -.32) : c.kind === 'rodhole' ? v3(at.x + (i ? 0 : -Math.min(s!.r, p.charge.size)) , 0, -g.h - .3 - (i ? .42 : 0)) : i ? add(at, v3(0, 0, (c.hole?.radius ?? s!.r) + .3)) : v3(0, 0, -(Math.min(s!.r, p.charge.size) + .3));
    return {at: proj(where), text: pieceText(c.kind, i), anchor: 'middle' as const};
  }).filter(n => n !== null) : null;
  // ---- THE NAMES, PLACED OFF THE ARROWS AND OFF EACH OTHER ----
  // Each name asks for a spot beside what it names; the placer (diagrams/labels.ts, the integral lessons' own) keeps
  // it off every arrow's head and shaft, the sign marks, P and the view cube, and off the names placed before it. They
  // were set at fixed offsets, and E, dA and Q_enc landed on arrow heads in every figure; on a phone, all on the ball.
  // The names the figure is about (P, the E at P, the charge inside) are always drawn, on a leader if they must go
  // further; the rest give way where there is no room, and on a small figure the secondary ones are not drawn at all.
  const noField = norm(built.fieldAtP) < 1e-12;
  const small = k > 1.25, forward = cameraBasis(cam.yaw, cam.pitch).forward;
  const specs: NameSpec[] = [];
  const ask = (key: string, x: number, y: number, anchor: 'start' | 'middle' | 'end', className: string, content: ReactNode, text: string, size: number, keep: boolean, from?: {x: number; y: number}, mirror = false) =>
    specs.push({key, x, y, anchor, className, content, text, size: size * k, keep, from, mirror});
  if ((built.answerAtP || built.markP) && (stage === null || stage === 'solve')) ask('p', pAt.x + (g.kind === 'pillbox' ? 12 : 10), pAt.y + (g.kind === 'pillbox' ? 18 : 16), 'start', 'gs-p-name', 'P', 'P', 20.5, true, pAt);
  if (built.answerAtP && showSolve && look.solve > .6) {
    if (noField) ask('e-at-p', pAt.x + 24, pAt.y - 14, 'start', 'gs-field-name is-answer', <>E = <tspan className="gs-zero">0</tspan></>, 'E = 0', 21, true, pAt);
    else ask('e-at-p', eTip.x + 12, eTip.y - 10, 'start', 'gs-field-name is-answer', 'E', 'E', 21, true, eTip, true);
  }
  if (showInside && !pieceNames) ask('inside', insideAt.x + (round ? 0 : 16), insideAt.y, round ? 'middle' : 'start', 'gs-inside-name', insideName(kase, built), insideText(kase, built), 17.5, true, insideAt);
  pieceNames?.forEach((n, i) => ask(`piece${i}`, n.at.x, n.at.y, n.anchor, 'gs-inside-name', n.text, n.text, 17.5, true, n.at));
  if (stage === 'symmetry' || stage === 'surface') ask('charge', chargeAt.x + 14, chargeAt.y, 'start', 'gs-charge-name', chargeName, chargeName, 17.5, true, chargeAt);
  // At Solve the patches have done their work: their arrows are faint, and a dA named over them named nothing.
  const naming = showFieldNames && stage !== 'solve';
  if (naming && stage === 'left' && norm(namedField) > 1e-9) ask('e-patch', nameE.x + 12, nameE.y - 8, 'start', 'gs-field-name', 'E', 'E', 17.5, false, nameE, true);
  if (naming && !small) ask('da', clash && stage === 'left' ? nameDA.x - 8 : nameDA.x + 10, clash && stage === 'left' ? nameDA.y + 16 : nameDA.y - 8, clash && stage === 'left' ? 'end' : 'start', 'gs-normal-name', 'dA', 'dA', 17.5, false, nameDA, true);
  if (naming && zeroAt && look.sweep >= 1 - 1e-6) { const z = proj(zeroAt); ask('zero', z.x - 10, z.y + (g.kind === 'cylinder' ? -12 : 0), 'end', 'gs-zero-name', <>E · dA = <tspan className="gs-zero">0</tspan></>, 'E · dA = 0', 15, false, z); }
  if (look.surface > .5 && !small) ask('size', dimMid.x + (g.kind === 'pillbox' ? -14 : 0), dimMid.y + (g.kind === 'pillbox' ? 0 : -13), g.kind === 'pillbox' ? 'end' : 'middle', '', sizeName, sizeName, 17.5, false, dimMid);
  if (look.surface > .5 && plugMid && !small) ask('size2', plugMid.x + 12, plugMid.y - 12, 'middle', '', 'r₂', 'r₂', 17.5, false, plugMid);
  // What the names keep off: every arrow drawn at this moment, its head as a mark and its shaft as a line, the sign
  // marks, P, and the view cube.
  const strokes: Segment[] = [], marksAt: Box[] = [];
  const head = (space ? 12 * Math.max(1, 720 / Math.max(1, width)) : 10) + 2;
  const stroke = (a: V3, b: V3) => { const pa = proj(a), pb = proj(b); if (Math.hypot(pb.x - pa.x, pb.y - pa.y) < 1.5) return; strokes.push({a: pa, b: pb}); marksAt.push({x: pb.x - head / 2, y: pb.y - head / 2, width: head, height: head}); };
  const dAl = .34 * Math.min(1, built.half / 3.2) * look.surface;
  if (space) built.patches.forEach((q, i) => {
    if (dot(q.normal, forward) <= -.05) return;
    if (look.surface > .01) { const base = add(q.center, scale(sub(q.corners[0], q.center), .32)); stroke(base, add(base, scale(q.normal, dAl))); }
    const f = Math.max(0, Math.min(1, lit - i));
    if (f > 0 && q.span > 0) { const e = arrowEnds(q.center, q.field, q.span * f, q.back); stroke(e.from, e.to); }
  });
  else built.slice.forEach((q, i) => {
    if (look.surface > .01) { const base = segBase(q); stroke(base, add(base, scale(q.normal, dAl))); }
    const f = Math.max(0, Math.min(1, lit - i));
    if (f > 0 && (q.span ?? 0) > 0) { const e = arrowEnds(q.mid, q.field, (q.span ?? 0) * f, q.back); stroke(e.from, e.to); }
  });
  if (look.spokes > .01) for (const sp of space ? built.spokes : built.flatSpokes) if ((sp.span ?? 0) > 0) { const e = arrowEnds(sp.at, sp.field, (sp.span ?? 0) * look.spokes, sp.back); stroke(e.from, e.to); }
  if (showSolve && built.pieces) for (const link of chainOf(built)) stroke(link.from, add(link.from, scale(link.dir, link.length * look.solve)));
  const answerShaft = built.answerAtP && showSolve && norm(built.fieldAtP) > 1e-12 ? {a: answerFrom, b: answerTo} : undefined;
  if (answerShaft) stroke(answer.from, answer.to);
  if (stage !== 'solve') for (const m of marks) { const q = proj(m.at); marksAt.push({x: q.x - 9, y: q.y + (axial || flat ? -10 : 0) - 10, width: 18, height: 20}); }
  if ((built.answerAtP || built.markP) && (stage === null || stage === 'solve')) marksAt.push({x: pAt.x - 6, y: pAt.y - 6, width: 12, height: 12});
  if (space) marksAt.push({x: 612, y: 16, width: 100, height: 86});
  // The radius lines, and a line or rod of charge along its axis (its axis and, for a rod, its two edges as seen):
  // names keep off them as they keep off arrows, or Q_enc and dA were struck through by the charge they name.
  if (look.surface > .5) { strokes.push({a: dimA, b: dimB}); if (plugA) strokes.push({a: plugA, b: dimB}); }
  if (axial) {
    const right = cameraBasis(cam.yaw, cam.pitch).right, ends = c.kind === 'segment' ? c.size : 4;
    const along = (off: number, at: V3 = v3(0, 0, 0)) => strokes.push({a: proj(add(at, add(scale(right, off), v3(0, 0, -ends)))), b: proj(add(at, add(scale(right, off), v3(0, 0, ends))))});
    if (c.kind === 'line' || c.kind === 'segment') along(0);
    else for (const r of c.kind === 'coax' ? [c.size, c.outer ?? c.size * 2] : [c.size]) { along(r, c.kind === 'rodhole' ? v3(0, 0, 0) : undefined); along(-r); }
  }
  const placed = placeNames(specs, strokes, marksAt, answerShaft);
  const described = describe(kase, built, space);
  const reserve = useMemo(() => (siblings ?? []).filter(o => o.key !== kase.key).map(o => captionOf(o, build(o, o.figure.surface.size.initial, sign))), [siblings, kase.key, sign]);
  const atRest = Math.abs(camera.yaw - opening(kase).yaw) < 1e-6 && Math.abs(camera.pitch - opening(kase).pitch) < 1e-6;
  return <div className="gs-figure">
    <div className={'cd-stage gs-stage' + (space ? ' is-space' : ' is-flat')} data-stage={stage ?? 'rest'} data-sweep={look.sweep.toFixed(3)} data-solve={look.solve.toFixed(3)} style={{'--cd-k': k} as CSSProperties}>
      {space && <GaussScene kase={kase} built={built} look={look} yaw={camera.yaw} pitch={camera.pitch} unit={unit} origin={ORIGIN} onUnavailable={why => setFailed(why === 'lost' ? 'lost' : 'failed')} />}
      <svg ref={svgRef} className={'cd-svg gs-svg' + (space ? ' cd-orbitable' : '')} viewBox="0 0 720 430" role="img" tabIndex={space ? 0 : undefined} aria-label={described} {...orbit}>
        {!space && <Flat built={built} look={look} lit={lit} proj={proj} unknown={!!c.insideNames && c.kind === 'rising'} />}
        {/* Sign marks on the charge: the colour is the same for either sign, as everywhere on the site. */}
        {/* Kept through the right side, where the charge inside is counted: a coaxial pair's or a capacitor's two
            charges, lit, are told apart by their signs alone. */}
        {stage !== 'solve' && marks.map((m, i) => { const q = proj(m.at); return <text key={i} className={'gs-sign' + (m.disc ? ' is-on-disc' : '')} x={q.x.toFixed(1)} y={(q.y + (axial || flat ? -10 : 0) + (m.disc ? 1 : 0)).toFixed(1)} textAnchor="middle" dominantBaseline="middle">{m.own ? glyph : other}</text>; })}
        {/* The size the slider moves, from the centre (or the sheet) to the surface: its line here, its name placed below. */}
        {look.surface > .5 && <g className="gs-dimension"><line x1={dimA.x} y1={dimA.y} x2={dimB.x} y2={dimB.y} /></g>}
        {look.surface > .5 && plugA && plugMid && <g className="gs-dimension"><line x1={plugA.x} y1={plugA.y} x2={dimB.x} y2={dimB.y} /></g>}
        {(built.answerAtP || built.markP) && (stage === null || stage === 'solve') && <circle className="gs-p" cx={pAt.x} cy={pAt.y} r={4.5} />}
        {/* A superposition's two fields at P, the plug's from the tip of the whole charge's: they add to the answer. */}
        {showSolve && !space && built.pieces && (() => {
          return chainOf(built).map((link, i) => <Arrow key={i} a={proj(link.from)} b={proj(add(link.from, scale(link.dir, link.length * look.solve)))} className="gs-arrow gs-e is-piece" head={9} />);
        })()}
        {built.answerAtP && showSolve && !space && <Arrow a={answerFrom} b={answerTo} className="gs-arrow gs-e is-answer" head={12} />}
        {placed.map(n => <g key={n.key}>
          {n.leader && <line className="gs-leader" x1={n.leader.a.x.toFixed(1)} y1={n.leader.a.y.toFixed(1)} x2={n.leader.b.x.toFixed(1)} y2={n.leader.b.y.toFixed(1)} />}
          <Name x={n.x} y={n.y} anchor={n.anchor} className={n.className}>{n.content}</Name>
        </g>)}
        {space && <ViewCube view={camera} at={{x: 664, y: 58}} size={20} minFont={11 / k} onPick={(next, label) => { glideTo(next, .5); setAnnouncement(label); }} onSpin={(dx, dy) => turn(-dx * .009, dy * .009)} onStep={key => turn(key === 'ArrowLeft' ? .2 : key === 'ArrowRight' ? -.2 : 0, key === 'ArrowUp' ? .12 : key === 'ArrowDown' ? -.12 : 0)} />}
      </svg>
    </div>
    <div className="cd-toolbar">
      <div className="cd-view-modes" role="group" aria-label="How to view the figure">
        {([['3D', '3d', 'In space: drag, or use the arrow keys, to turn it'], ['Cross-section', '2d', 'The slice through the axis, flat']] as const).map(([label, value, title]) =>
          <button key={value} type="button" title={title} disabled={value === '3d' && failed === 'failed'} className={'cd-view-mode' + (view === value && !(value === '3d' && failed) ? ' is-on' : value === '2d' && failed ? ' is-on' : '')}
            aria-pressed={value === '2d' ? !space : space} onClick={() => { if (value === '3d') setFailed(f => f === 'lost' ? false : f); onView(value); }}>{label}</button>)}
      </div>
      {space && <p className="gs-turn-hint">Drag or use the arrow keys to turn it; Home puts it back.</p>}
      {/* Marked unavailable rather than disabled once the view is back: a disabled button drops the keyboard's focus to
          the page's top, so the next Tab started the page over. */}
      {space && <div className="cd-pad"><button type="button" className="text-button cd-orbit-reset" aria-disabled={atRest || undefined} onClick={() => { if (atRest) return; glideTo(opening(kase), .45); setAnnouncement('The opening view.'); }}>Reset view</button></div>}
      <output className="sr-only" aria-live="polite">{announcement}</output>
      {failed && <output className="cd-stage-unavailable">{failed === 'lost' ? 'The 3D view was interrupted, so the figure is drawn as its cross-section. Choose 3D to try again.' : 'The 3D view is not available on this device, so the figure is drawn as its cross-section.'}</output>}
    </div>
    {/* Every case's caption is laid in one cell, the others unseen, so the cell is as tall as the longest and choosing
        a case never moves the sliders under the reader's hand. */}
    <div className="cd-caption gs-caption"><span className="gs-caption-stack">
      <span>{captionOf(kase, built)}</span>
      {reserve.map((text, i) => <span key={i} aria-hidden="true" className="gs-caption-reserve">{text}</span>)}
    </span></div>
  </div>;
});
/** The figure's caption: what its arrows are, and anything about their lengths a reader comparing them needs. */
export function captionOf(kase: GaussCase, b: Built): string {
  if (b.pieces) return b.pieces[1]?.surface ? 'Each surface’s teal arrows are its own piece’s field: the whole charge’s, or the plug’s. Grey ones are the outward dA. At P the two pieces’ fields, thin, add to the answer, bold.'
    : 'The pillbox’s teal arrows are the whole sheet’s field, as if the hole were filled; grey ones are the outward dA. At P the whole sheet’s field and the disc’s, thin, add to the answer, bold.';
  const base = 'Teal arrows are the field E at each patch, grey ones the patch’s outward dA. Shaded patches carry no flux.';
  if (kase.figure.charge.kind === 'offset') return base + ' Here an arrow’s length grows as the square root of the field, so the strong near side fits the frame.';
  // Said only where it is true: in space, an arrow pointing at the reader is foreshortened, and looks shorter.
  const drawn = b.patches.filter(p => p.span > 0), crossed = drawn.filter(p => !p.zero), same = (list: typeof drawn) => list.length > 1 && list.every(p => Math.abs(p.span - list[0].span) < 1e-6);
  if (drawn.length === b.patches.length && same(drawn)) return base + ' Every arrow here is the same length: E has one size all over this surface.';
  if (crossed.length < drawn.length && same(crossed)) return base + ' Every arrow through the surface is the same length: E has one size wherever it crosses.';
  if (b.shortened) return base + ' Where the field has no room, the arrows are drawn shorter than it is: it is stronger there than they show.';
  return base;
}
/** The segment nearest a point, for the names. */
function nearestSeg(segs: Seg[], to: V3): Seg {
  const crossed = segs.filter(s => !s.zero), pool = crossed.length ? crossed : segs;
  return pool.reduce((best, s) => norm(sub(s.mid, to)) < norm(sub(best.mid, to)) ? s : best, pool[0]);
}
/** Where a segment's dA is drawn from: a little along it from its middle, so it does not lie under E. */
function segBase(s: Seg): V3 {
  const a = v3(s.a[0], 0, s.a[1]);
  if (s.arc) { const o = s.about ?? v3(0, 0, 0), t = Math.atan2(s.mid.x - o.x, s.mid.z - o.z) - .14; return v3(o.x + s.arc * Math.sin(t), 0, o.z + s.arc * Math.cos(t)); }
  return add(s.mid, scale(sub(a, s.mid), .4));
}
/** THE CROSS-SECTION: the plane through the axis, drawn flat. Every arrow in it lies in the plane, since every
 * one of these fields does there. */
function Flat({built, look, lit, proj, unknown}: {built: Built; look: Look; lit: number; proj: (p: V3) => {x: number; y: number};
  /** A charge the lesson asks the reader to find: its density is drawn only once the run solves for it. */
  unknown?: boolean}) {
  const c = built.charge, g = built.surface, u = built.unit, o = proj(v3(0, 0, 0));
  const R = c.size * u, B = (c.outer ?? c.size * 2) * u;
  // Two vertical lines at ±x from the axis: a cylindrical shell's cut, the whole height or the length the surface holds.
  const walls = (x: number, cls: string, half = 0) => <>{[-1, 1].map(k => <line key={k} className={cls} x1={o.x + k * x} y1={half ? o.y - half : -20} x2={o.x + k * x} y2={half ? o.y + half : 450} />)}</>;
  const ring = (r0: number, r1: number) => `M${o.x - r1} ${o.y}a${r1} ${r1} 0 1 0 ${2 * r1} 0a${r1} ${r1} 0 1 0 ${-2 * r1} 0Z` + (r0 > 0 ? `M${o.x - r0} ${o.y}a${r0} ${r0} 0 1 0 ${2 * r0} 0a${r0} ${r0} 0 1 0 ${-2 * r0} 0Z` : '');
  const gradient = useId().replace(/:/g, '');
  const at = c.kind === 'offset' ? proj(v3(0, 0, c.size)) : c.at ? proj(c.at) : o;
  const charge = c.kind === 'point' || c.kind === 'offset' ? <circle className="gs-charge" cx={at.x} cy={at.y} r={POINT_PX} />
    : c.kind === 'ball' ? <circle className="gs-charge is-body" cx={o.x} cy={o.y} r={R} />
    // A ball whose density varies with r is shaded as it does: darker where there is more charge.
    : (c.kind === 'rising' || c.kind === 'falling') && !(unknown && look.stage !== 'solve') ? <circle className="gs-charge is-body is-graded" cx={o.x} cy={o.y} r={R} style={{fill: `url(#${gradient})`}} />
    // Its density is what the case asks for: drawn plain, as not yet known, until the run solves for it.
    : c.kind === 'rising' || c.kind === 'falling' ? <circle className="gs-charge is-body is-unknown" cx={o.x} cy={o.y} r={R} />
    // Charge with no edge: shading that thins out as the density does, past the frame's edges.
    : c.kind === 'halo' ? <circle className="gs-charge is-cloud" cx={o.x} cy={o.y} r={10 * R} style={{fill: `url(#${gradient})`}} />
    : c.kind === 'cusp' ? <circle className="gs-charge is-body is-graded" cx={o.x} cy={o.y} r={R} style={{fill: `url(#${gradient})`}} />
    : c.kind === 'oddslab' ? <><rect className="gs-charge is-body" x={-20} y={o.y - R} width={760} height={2 * R} /><line className="gs-plug-line" x1={-20} y1={o.y} x2={740} y2={o.y} /></>
    : c.kind === 'tent' ? <rect className="gs-charge is-body is-graded" x={-20} y={o.y - R} width={760} height={2 * R} style={{fill: `url(#${gradient})`}} />
    : c.kind === 'shell' ? <circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={R} />
    : c.kind === 'line' ? <line className="gs-charge is-line" x1={o.x} y1={-20} x2={o.x} y2={450} />
    : c.kind === 'segment' ? <line className="gs-charge is-line" x1={o.x} y1={o.y - R} x2={o.x} y2={o.y + R} />
    : c.kind === 'sheet' ? <line className="gs-charge is-line" x1={-20} y1={o.y} x2={740} y2={o.y} />
    : c.kind === 'rod' ? <rect className="gs-charge is-body" x={o.x - R} y={-20} width={2 * R} height={470} />
    : c.kind === 'tube' ? walls(R, 'gs-charge is-line')
    : c.kind === 'coax' ? <>{walls(R, 'gs-charge is-line')}{walls(B, 'gs-charge is-line is-opposite')}</>
    // A conductor: the metal grey, its charge a line along its surfaces.
    : c.kind === 'metal' ? <><path className="gs-metal" d={ring(0, R)} /><circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={R} /></>
    : c.kind === 'cavity' ? <><path className="gs-metal" d={ring(R, B)} fillRule="evenodd" /><circle className="gs-charge is-shell is-opposite" cx={o.x} cy={o.y} r={R} /><circle className="gs-charge is-shell" cx={o.x} cy={o.y} r={B} /><circle className="gs-charge" cx={o.x} cy={o.y} r={POINT_PX} /></>
    : c.kind === 'face' ? <><rect className="gs-metal" x={-20} y={o.y} width={760} height={460 - o.y} /><line className="gs-charge is-line" x1={-20} y1={o.y} x2={740} y2={o.y} /></>
    : c.kind === 'plates' ? <><line className="gs-charge is-line" x1={-20} y1={o.y} x2={740} y2={o.y} /><line className="gs-charge is-line is-opposite" x1={-20} y1={o.y + R} x2={740} y2={o.y + R} /></>
    // A charge with a hole: the charge, and the hole in it as a gap the paper shows through.
    : c.kind === 'ballhole' && c.hole ? <><circle className="gs-charge is-body" cx={o.x} cy={o.y} r={R} /><circle className="gs-hole" cx={proj(c.hole.at).x} cy={proj(c.hole.at).y} r={c.hole.radius * u} /></>
    : c.kind === 'rodhole' && c.hole ? <><rect className="gs-charge is-body" x={o.x - R} y={-20} width={2 * R} height={470} /><rect className="gs-hole" x={proj(v3(c.hole.at.x - c.hole.radius, 0, 0)).x} y={-20} width={2 * c.hole.radius * u} height={470} /></>
    : c.kind === 'sheethole' && c.hole ? <><line className="gs-charge is-line" x1={-20} y1={o.y} x2={o.x - c.hole.radius * u} y2={o.y} /><line className="gs-charge is-line" x1={o.x + c.hole.radius * u} y1={o.y} x2={740} y2={o.y} /><line className="gs-plug-line" x1={o.x - c.hole.radius * u} y1={o.y} x2={o.x + c.hole.radius * u} y2={o.y} /></>
    : <rect className="gs-charge is-body" x={-20} y={o.y - R} width={760} height={2 * R} />;
  const H = g.h * u;
  // A superposition's pieces, each the part its own surface holds: the whole charge's, and the plug's.
  const pieceInside = built.pieces && look.enclosed > .02 && built.pieces.map((p, i) => {
    const q = p.charge, s = p.surface, at = proj(q.at ?? v3(0, 0, 0)), cls = 'gs-inside' + (i ? ' is-plug' : ' is-body');
    if (q.kind === 'ball' && s) return <circle key={i} className={cls} cx={at.x} cy={at.y} r={Math.min(q.size, s.r) * u} />;
    if (q.kind === 'rod' && s) { const w = Math.min(q.size, s.r) * u; return <rect key={i} className={cls} x={at.x - w} y={o.y - H} width={2 * w} height={2 * H} />; }
    if (q.kind === 'sheet') return <line key={i} className="gs-inside is-line" x1={o.x - g.r * u} y1={o.y} x2={o.x + g.r * u} y2={o.y} />;
    return null;
  });
  const inside = look.enclosed > .02 && (built.pieces ? <>{pieceInside}</> : c.kind === 'point' ? <circle className="gs-inside" cx={at.x} cy={at.y} r={POINT_PX + 4} />
    : c.kind === 'halo' ? <circle className="gs-inside is-body" cx={o.x} cy={o.y} r={g.r * u} />
    : c.kind === 'cusp' ? <circle className="gs-inside is-body" cx={o.x} cy={o.y} r={Math.min(c.size, g.r) * u} />
    : c.kind === 'oddslab' ? (() => { const z1 = Math.max(-c.size, Math.min(c.size, g.h)), z0 = Math.max(-c.size, Math.min(c.size, g.low ?? -g.h)); return z1 - z0 > 1e-3 && <rect className="gs-inside is-body" x={o.x - g.r * u} y={o.y - z1 * u} width={2 * g.r * u} height={(z1 - z0) * u} />; })()
    : c.kind === 'segment' ? <line className="gs-inside is-line" x1={o.x} y1={o.y - Math.min(c.size, g.h) * u} x2={o.x} y2={o.y + Math.min(c.size, g.h) * u} />
    : c.kind === 'offset' ? g.r > c.size && <circle className="gs-inside" cx={at.x} cy={at.y} r={POINT_PX + 4} />
    : isBall(c.kind) ? <circle className={'gs-inside ' + (c.kind === 'ball' ? 'is-body' : 'is-shell')} cx={o.x} cy={o.y} r={Math.min(c.size, g.r) * u} /> : c.kind === 'shell' || c.kind === 'metal' ? g.r > c.size && <circle className="gs-inside is-shell" cx={o.x} cy={o.y} r={R} />
    : c.kind === 'line' ? <line className="gs-inside is-line" x1={o.x} y1={o.y - H} x2={o.x} y2={o.y + H} />
    : c.kind === 'sheet' || c.kind === 'face' || c.kind === 'plates' ? <line className="gs-inside is-line" x1={o.x - g.r * u} y1={o.y} x2={o.x + g.r * u} y2={o.y} />
    : c.kind === 'rod' ? <rect className="gs-inside is-body" x={o.x - Math.min(c.size, g.r) * u} y={o.y - H} width={2 * Math.min(c.size, g.r) * u} height={2 * H} />
    : c.kind === 'tube' || c.kind === 'coax' ? g.r > c.size && <>{walls(R, 'gs-inside is-line', H)}{c.kind === 'coax' && g.r * u > B && walls(B, 'gs-inside is-line is-opposite', H)}</>
    : c.kind === 'cavity' ? <><circle className="gs-inside" cx={o.x} cy={o.y} r={POINT_PX + 4} />{g.r > c.size && <circle className="gs-inside is-shell is-opposite" cx={o.x} cy={o.y} r={R} />}{g.r * u > B && <circle className="gs-inside is-shell" cx={o.x} cy={o.y} r={B} />}</>
    : <rect className="gs-inside is-body" x={o.x - g.r * u} y={o.y - Math.min(g.h, c.size) * u} width={2 * g.r * u} height={2 * Math.min(g.h, c.size) * u} />);
  const dA = .34 * Math.min(1, built.half / 3.2);
  // The density's shading: from the centre out for a ball, from the middle plane out for the tent slab.
  // The halo's follows a²/(r² + a²) out to ten a; the cusp's 1/r, darkest at the centre.
  const stops = c.kind === 'rising' ? [[0, .08], [1, .95]] : c.kind === 'halo' ? [0, .05, .1, .2, .4, 1].map(f => [f, 1 / (1 + (10 * f) ** 2)]) : c.kind === 'cusp' ? [[0, 1], [.12, .7], [.35, .35], [1, .14]] : [[0, .95], [1, .08]];
  return <g className="gs-flat">
    {(c.kind === 'rising' || c.kind === 'falling' || c.kind === 'halo' || c.kind === 'cusp') && <defs><radialGradient id={gradient} cx="50%" cy="50%" r="50%">{stops.map(([at, op]) => <stop key={at} offset={at} style={{stopColor: 'var(--charge)', stopOpacity: op * .62}} />)}</radialGradient></defs>}
    {c.kind === 'tent' && <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">{[[0, .05], [.5, .6], [1, .05]].map(([at, op]) => <stop key={at} offset={at} style={{stopColor: 'var(--charge)', stopOpacity: op}} />)}</linearGradient></defs>}
    {/* The charge is cut to the plot: an infinite line or sheet runs to the frame's edge and no farther, never up
        through the card's heading. */}
    <defs><clipPath id={`${gradient}-plot`}><rect x={0} y={0} width={720} height={430} /></clipPath></defs>
    <g className="gs-charge-layer" clipPath={`url(#${gradient}-plot)`}>{charge}</g>
    {inside && <g style={{opacity: look.enclosed}} clipPath={`url(#${gradient}-plot)`}>{inside}</g>}
    {look.spokes > .01 && <g className="gs-spokes" style={{opacity: Math.min(1, look.spokes * 1.4)}}>{built.flatSpokes.map((s, i) => {
      const ends = arrowEnds(s.at, s.field, (s.span ?? 0) * look.spokes, s.back);
      return <Arrow key={i} a={proj(ends.from)} b={proj(ends.to)} className="gs-arrow gs-e" />;
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
      const ends = arrowEnds(s.mid, s.field, (s.span ?? 0) * f, s.back);
      return <Arrow key={s.key} a={proj(ends.from)} b={proj(ends.to)} className={'gs-arrow gs-e' + (s.zero ? ' is-along' : '')} />;
    })}</g>
  </g>;
}
