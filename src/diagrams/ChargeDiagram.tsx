'use client';
/* Inline SVG needs role=img to expose one named figure; an HTML img cannot contain the interactive drawing. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
/* In 3D the figure carries `tabIndex` as well, which the rule below reads as a focusable
   non-interactive element. It is deliberate, and the alternatives are worse for the reader.
   The figure IS the control -- it is what the arrow keys turn -- so it has to be reachable by
   focus, and routing that through some neighbouring button is exactly the bug this replaced.
   `role="application"` would satisfy the rule and cost more: it switches a screen reader out of
   reading mode over the whole figure. `role="img"` already collapses the drawing to its
   accessible name, and that name now states the gestures, so what a screen reader is told
   matches what the keys do. */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex */
import { createContext, memo, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { animate, frame, motion, useMotionValue, useReducedMotion } from 'motion/react';
import type { Params, Problem } from '../problems/types';
import { field, magnitude, pretty, potential, type Vec } from '../symbolic/physics';
import { sampleDistribution, sumSamples, sumInterval, intervalWeights, sumPotential, activeIntervalIndex } from './sampling';
import { intervalKey, partitionCount, seamFractions, seamKey, splitFractions, splitProgress } from './subdivision';
import { clampCamera, depthFromScreen, keyboardCamera, openingCamera, orbitCamera, projectCamera, surfaceUnit, type CameraView } from './camera';
import { ViewCube } from './ViewCube';
import { nearestOnBox, placeLabels, segmentBoxes, type Box, type HalfPlane, type Segment } from './labels';
import { area, rayMeetsLine, rayToEdge, rayToLine, sub as vsub, unit as direction, wedgePath, type Line } from './fan';
import { FieldCanvas } from './FieldCanvas';
import { FieldStage } from './three/FieldStage';
import { runScene } from './three/runScene';
import './charge-diagram.css';
import './camera.css';

type Point = { x: number; y: number };
export type ChargeDiagramProps = {
  problem: Problem; params: Params; setParams: (p: Partial<Params>) => void;
  count: number; continuum: number; selected: number; onSelect: (i: number) => void;
  progress: number; components: boolean; pair: boolean;
  mode: 'divide' | 'project' | 'sum' | 'integrate';
  highlight?: string; boundRange?: [number, number]; onBoundRangeChange?: (r: [number, number]) => void;
  /** Start the control drawer closed: on a page that already carries its own controls, the
   * drawer is a second copy of them. */
  compact?: boolean;
  /** Where "Watch it build" is, when it is running or paused. The figure uses it to make each
   * stage visibly different -- see the comment at `building` below. */
  build?: {
    key: string; name: string; index: number; count: number; paused?: boolean;
    /** The run's own clock, in seconds, and where the current stage starts and how long it lasts.
     * A stage whose figure moves within it -- What cancels -- reads its own time off this, so a
     * pause, a seek or a replay shows the frame the clock is at rather than one a timer reached. */
    clock?: { get(): number; subscribe(listener: () => void): () => void };
    start?: number; seconds?: number;
    /** The piece the run talks about, by index -- held by the run while the adding stage walks a
     * different piece along the charge. */
    piece?: number;
  };
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
/** Where the pair that cancels is, `local` of the way through What cancels: whole for the first two
 * fifths, so the reader sees both before they go; shrinking, eased, until three quarters; then gone,
 * and held gone, with only their ghosts left to say what was there. */
export function cancelCurve(local: number): number {
  const t = clamp((local - .4) / .35, 0, 1);
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
/** A limit of integration as plain text, from the TeX the lesson writes it in: −L/2, 2π, φ/2, ∞.
 * A true minus sign, not a hyphen. */
export function plainBound(tex: string): string {
  return tex.replace(/\\varphi/g, 'φ').replace(/\\phi/g, 'φ').replace(/\\pi/g, 'π').replace(/\\infty/g, '∞').replace(/\\theta/g, 'θ')
    .replace(/\\[,;!]/g, '').replace(/\s+/g, '').replace(/-/g, '−');
}
/** Which side of an arrow along `dir` is AWAY from `ref`, as Vector's `side` counts sides: a name
 * beside a piece's arrow goes on the outside of the angle it makes with the part that survives,
 * not into the gap between them. Undefined when the two are too nearly in line to have sides. */
function awayFrom(dir: Point, ref: Point): number | undefined {
  const cross = dir.x * ref.y - dir.y * ref.x, scale = Math.hypot(dir.x, dir.y) * Math.hypot(ref.x, ref.y);
  return scale > 1e-9 && Math.abs(cross) > .08 * scale ? (cross > 0 ? -1 : 1) : undefined;
}
const plus = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scaleVec = (v: Vec, k: number): Vec => ({ x: v.x * k, y: v.y * k, z: v.z * k });
const zero: Vec = { x: 0, y: 0, z: 0 };
function pathThrough(points: Point[], close = false) { return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + (close ? 'Z' : ''); }
function worldArc(radius: number, start = 0, end = Math.PI * 2): Point[] {
  return Array.from({ length: 97 }, (_, i) => { const t = start + (end - start) * i / 96; return { x: radius * Math.cos(t), y: radius * Math.sin(t) }; });
}
/** Orthographic xy-plane → screen. Ring/disk/sheet live in z = 0, so one SVG matrix orbits them without a React render. */
function planeMatrix(yaw: number, pitch: number, origin: Point, unit: number): string {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), sp = Math.sin(pitch);
  return `matrix(${unit * cy} ${unit * sy * sp} ${unit * sy} ${-unit * cy * sp} ${origin.x} ${origin.y})`;
}
/** A symbol with a real subscript. Written as one string -- "ΔE_x" -- so a caller can say what a
 * label reads, and set as a lowered, smaller tspan, because "ΔEx" on one baseline reads as a
 * product, and the Unicode subscript letters (rᵢ) render at half the size of everything else. */
export type Sym = string;
/** How far a subscript drops, in ems of its own (72%) size: about a fifth of the main letter's em.
 * `baseline-shift: sub` dropped it nearly half an em, so its top sat below the main letter's middle
 * and "ΔE_y" read as ΔE with a stray y under it. `tail` is text that follows the subscript, set back
 * on the main baseline. */
const SUB_DROP = .3;
/** A function's name -- sec, cos -- set upright among the italic symbols, as a textbook sets it: in the
 * italic it reads as the product s·e·c. */
function upright(text: string) {
  const parts = text.split(/\b(sec|cos|sin|tan)\b/);
  return parts.length < 2 ? text : parts.map((t, i) => i % 2 ? <tspan key={i} fontStyle="normal">{t}</tspan> : t);
}
function SymbolText({ symbol, tail }: { symbol: Sym; tail?: string }) {
  const cut = symbol.indexOf('_');
  if (cut < 0) return <>{upright(symbol)}{tail}</>;
  return <>{symbol.slice(0, cut)}<tspan className="cd-sub" dy={`${SUB_DROP}em`} fontSize="72%">{symbol.slice(cut + 1)}</tspan>{tail !== undefined && <tspan dy={`${-SUB_DROP * .72}em`}>{tail}</tspan>}</>;
}
/** Where a label sits beside a point, a short way out in direction `dir`, anchored so that its
 * nearest edge -- not its middle -- is `gap` away. A label hung from its middle has half its own
 * width or height reaching back toward the thing it names, and lands on it. */
function besidePoint(at: Point, dir: Point, gap: number, size = SYM, descent = .39): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const anchor = dir.x > .38 ? 'start' : dir.x < -.38 ? 'end' : 'middle';
  // Text is positioned by its baseline, and a line of the display serif at `size` reaches about
  // 0.98 size above it and 0.39 below: the box the label placer measures, so what is placed here
  // is what it sees. A subscript, dropped a fifth of an em at 72% size, takes the bottom to about
  // half an em: `descent` says so for a label that has one.
  const y = at.y + dir.y * gap + (dir.y > .38 ? .98 * size : dir.y < -.38 ? -descent * size : .3 * size);
  return { x: at.x + dir.x * gap, y, anchor };
}
/** The figure's symbol size and P's, in the drawing's own units, as `charge-diagram.css` sets them
 * before the phone counter-scale; and that counter-scale, for anything laid out beside a point. */
const SYM = 17.5, SYM_P = 20.5;
/** How strongly the ghost of a part that has cancelled is drawn: there, but plainly gone. At a quarter,
 * as two-unit dashes, the held end of What cancels -- the frame a reader stops on to read the board --
 * showed the two names floating over arrows nobody could see. */
const GHOST = .45;
/** A length the lesson gives -- r, z, R, s, L, a, φ -- is named wherever it is drawn: the placer may move
 * its letter, never drop it. */
const GIVEN = { 'data-priority': 1, 'data-keep': 'true' } as const;
/** Where the arc's angle φ is marked, as a share of its radius: at a half it ran through P's own name. */
const PHI_AT = .75;
/** How far into Add them up -- as the sum's own progress, whose motion fills four fifths of the
 * stage -- the run's piece has shrunk to its true length: fifteen percent of the stage. Then it fades
 * over the next stretch. */
const ADD_SHRINK = .15 / .8, ADD_FADE = .08;
/** The shortest the run's net arrow is drawn, where stopping it short of the charge would leave less:
 * long enough to carry its name. Shorter than that it crosses the charge instead, painted over it. */
const RUN_FLOOR = 70;
/** Where the band under the plot begins: the divider and the footer's two lines are below it, and no name
 * of the scene's goes there. Free to the placer, it put O, R and s on the divider on a phone, where they
 * read as the first words of the footer, and the charge's tag between the footer's two halves. */
const FOOTER_BAND = 378;
const LabelScale = createContext(1);
/** How far along its shaft an arrow named beside it is named: three fifths of the way out, where the
 * arrows leaving P have spread apart. At the middle a name stood nearer the arrow's tail, among the
 * strokes round P -- and on a dimension bar's tick where one ended level with P. */
const MID_AT = .6;
/** The mirror piece's arrows: the piece's own colour, lighter, and solid -- a whole contribution. */
const PARTNER_TINT = 'color-mix(in oklab, var(--contribution) 52%, var(--diagram))';
/** One arrow, drawn from `from` to `to`, and named BESIDE ITS OWN SHAFT -- out to one side of its
 * middle -- rather than past its tip. A name at the tip was read as naming whatever arrow ended
 * nearest it: "ΔE" landed beside the part that survives and was taken for its name.
 *
 * `side` picks which side of the shaft: +1 is the side a quarter turn clockwise on screen. Left
 * out, the label goes above a shaft that lies across the page and right of one that stands up.
 * `at: 'tip'` names it past its tip instead, for an arrow that sits INSIDE an angle -- the part
 * that survives, between a piece's arrow and its partner's -- where beside the shaft is the gap
 * between two other arrows. */
function Vector({ from, to, color = 'var(--field)', width = 2.5, dashed = false, label, side, at = 'mid', reduced = false, ghost = false, dash = '6 4', keep = false, priority = 1, fade = 1, muted = false, clip }: { from: Point; to: Point; color?: string; width?: number; dashed?: boolean; label?: Sym; side?: number; at?: 'mid' | 'tip'; reduced?: boolean; ghost?: boolean; dash?: string;
  /** A clip path for the stroke alone, never the name: the plot's window, as a last guard. */
  clip?: string;
  /** The name is one of the terms the stage on screen is about: the placer must not hide it. */
  keep?: boolean; priority?: number;
  /** How strongly the stroke is drawn, and whether the name is muted: a ghost of a part that has gone. */
  fade?: number; muted?: boolean }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y), angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.min(7.5, length * .34), a = { x: to.x - head * Math.cos(angle - .45), y: to.y - head * Math.sin(angle - .45) }, b = { x: to.x - head * Math.cos(angle + .45), y: to.y - head * Math.sin(angle + .45) };
  const u = length > 1e-6 ? { x: (to.x - from.x) / length, y: (to.y - from.y) / length } : { x: 1, y: 0 };
  // The default side: above a shaft lying across the page, right of one standing up.
  const s = side ?? (Math.abs(u.x) >= Math.abs(u.y) ? (u.x > 0 ? -1 : 1) : (u.y > 0 ? -1 : 1));
  const normal = { x: -u.y * s, y: u.x * s };
  const k = useContext(LabelScale);
  const descent = label?.includes('_') ? .52 : .39;
  const tipSpot = besidePoint(to, u, 9, SYM * k, descent), midSpot = besidePoint({ x: from.x + (to.x - from.x) * MID_AT, y: from.y + (to.y - from.y) * MID_AT }, normal, 7, SYM * k, descent);
  const spot = at === 'tip' ? tipSpot : midSpot, other = at === 'tip' ? midSpot : tipSpot;
  // The middle of the shaft is the point the placer reflects the label through when its own side is
  // taken: the other side of the same shaft still names the same arrow. Past that, the other way of
  // naming an arrow -- past its tip for one named beside its shaft, and the reverse -- is tried.
  const pivot = at === 'tip' ? to : { x: from.x + (to.x - from.x) * MID_AT, y: from.y + (to.y - from.y) * MID_AT };
  // The shaft it is drawn along, where it is going rather than where its glide has got to: the label
  // placer keeps every name nearer its own arrow than any other.
  const shaft = `${from.x.toFixed(1)} ${from.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
  // The stroke's strength is set on a plain group round it, never in a motion element's `style`: motion
  // reads an SVG element's style into its own state once, when it mounts, and later renders did not
  // change it. A ghost of a part that cancelled mounts as the cancelling starts, at a strength of
  // nothing, and stayed at nothing for the rest of the stage -- its name floated over no arrow -- and a
  // net arrow drawn flat and then turned into space stayed painted over the scene's own.
  return <g className={'cd-vector' + (dashed ? ' is-dashed' : '')} style={{ color }} opacity={length < .2 ? 0 : 1} data-shaft={length >= 2 ? shaft : undefined}>
    <g clipPath={clip} opacity={ghost ? 0 : fade} data-stroke-opacity={(ghost ? 0 : fade).toFixed(3)}>
    <motion.line initial={false} animate={{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }} transition={{ duration: reduced ? 0 : .13, ease: 'easeOut' }} stroke="currentColor" strokeWidth={width} strokeDasharray={dashed ? dash : undefined} />
    <motion.path initial={false} animate={{ d: `M${a.x},${a.y}L${to.x},${to.y}L${b.x},${b.y}` }} transition={{ duration: reduced ? 0 : .13 }} fill="none" stroke="currentColor" strokeWidth={width} />
    </g>
    {label && length > 10 && <text x={spot.x} y={spot.y} textAnchor={spot.anchor} className={'cd-vector-label' + (muted ? ' is-muted' : '')} fill="currentColor" data-symbol={label}
      data-mirror={`${pivot.x.toFixed(1)} ${pivot.y.toFixed(1)}`} data-alt={`${other.x.toFixed(1)} ${other.y.toFixed(1)} ${other.anchor}`} data-priority={priority} data-keep={keep ? 'true' : undefined} data-shaft={shaft}><SymbolText symbol={label} /></text>}
  </g>;
}
function ViewHelp({ x, y }: { x: number; y: number }) {
  // Drawn into the figure rather than written beside it: a reader who has never orbited a 3D
  // view does not know that dragging turns it, and a sentence in the chrome is read last if at
  // all. It still has to stay out of the way of the thing it is about.
  //
  // It used to be a three-row panel on a filled, rounded slab: a drawn mouse with a turning
  // arrow, a wheel with an up-down arrow, and four key caps. At the size the figure is actually
  // read at those glyphs are eight pixels tall -- not a mouse and a wheel, just scribble -- and
  // the slab behind them punched an opaque hole through the field lines in the top right
  // corner. It read as a second card pasted onto the picture, which is the one thing a legend
  // must not do.
  //
  // Same three promises, one quiet line of type, nothing painted behind it. Each promise is
  // still its own `.cd-help-text`, in order, because the gesture tests read them off the
  // rendered figure and check that every one of them is true -- that covenant is why the
  // broken arrow keys were eventually caught, and it is unchanged.
  // One <text> with a tspan per promise, anchored at its END: tspans are the one thing in SVG
  // that does flow, so the line sets itself and hangs off `x` without anything measuring it.
  // Placing each promise by a guessed width instead put "scroll to zoom" through the tail of
  // "drag to turn".
  return <g className="cd-help" aria-hidden="true">
    <text x={x} y={y} textAnchor="end" dominantBaseline="middle">
      <tspan className="cd-help-text">drag to turn</tspan>
      {/* Not on a phone or a touch screen, where none of the two is true: see `.cd-help-more`. */}
      <tspan className="cd-help-more">
        {' \u00b7 '}
        <tspan className="cd-help-text">scroll to zoom</tspan>
        {' \u00b7 '}
        <tspan className="cd-help-text">arrow keys</tspan>
      </tspan>
    </text>
  </g>;
}
/** The geometries whose partition runs to infinity, so that refining it moves the far elements
 * further out rather than filling the picture in. */
const UNBOUNDED = new Set(['infinite', 'semi', 'sheet']);
/** Memoised, because while "Watch it build" plays the page around the figure re-renders on every
 * frame and most of those frames change nothing the figure draws: three of the five stages hold
 * every prop still, and the other two hold it still once their motion has finished. Each render
 * here also lays the labels out again, which measures every label on the page; skipping the render
 * skips that too. The props are compared one by one, so anything that does change still redraws. */
export const ChargeDiagram = memo(function ChargeDiagram({ problem, params: p, setParams, count, continuum, selected, onSelect, progress, components, pair, mode, boundRange = [0, 100], onBoundRangeChange, highlight = '', compact = false, build }: ChargeDiagramProps) {
  const cameraControl = useRef<HTMLButtonElement>(null);
  const svg = useRef<SVGSVGElement>(null), plane = useRef<SVGGElement>(null), dragging = useRef<string | null>(null), uid = useId().replace(/:/g, '');
  // The plot's window, as a clip for the strokes the run draws out of P: a last guard, beneath the scale
  // that is fitted to keep them in it.
  const plotClip = `url(#${uid}clip)`;
  const opening = openingCamera(problem.geometry);
  const yawMv = useMotionValue(opening.yaw), pitchMv = useMotionValue(opening.pitch);
  const [camera, setCamera] = useState<CameraView>(opening), orbitFrom = useRef<Point>({ x: 0, y: 0 });
  const glideId = useRef(0), syncId = useRef(0), spin = useRef({ yaw: 0, pitch: 0, at: 0 });
  const [gliding, setGliding] = useState(false);
  // oxlint-disable-next-line react/react-compiler -- deliberately impure: it is a stopwatch
  const root = useRef<HTMLDivElement>(null), renders = useRef(0), renderStart = performance.now();
  // Render count and cost are exposed on the root for the perf tests and for measuring in
  // the browser: the cheapest way to know whether a frame is slow because of React or
  // because of something after it.
  useLayoutEffect(() => { renders.current += 1; if (root.current) { root.current.dataset.renders = String(renders.current); root.current.dataset.renderMs = (performance.now() - renderStart).toFixed(1); } });
  // LABELS THAT STAY READABLE ON A PHONE. The drawing is laid out at 720 units and scaled to fit, so
  // at 390px every label shrank with it: a dimension letter came out seven pixels tall. Below the
  // layout width the labels are counter-scaled -- not all the way, which would set them as large on a
  // phone as on a desktop and crowd a drawing half the size, but enough to keep every symbol at a
  // readable size. Quantised, so a window being dragged wider re-lays the labels a few times, not
  // on every pixel.
  //
  // At most half as large again, though. Counter-scaled the whole way to 1.9, a phone's labels came
  // out so large against the drawing that What cancels had nowhere to put them all: the label placer
  // either hid the names the stage is about or stacked them on each other. At 1.5 a symbol on a phone
  // is still about thirteen pixels.
  //
  // The view cube is the exception. Its face names are set to fit the face, so the cube itself has to
  // grow the whole way for "FRONT" to stay eight pixels tall; it sits in a corner of its own.
  const stageBox = useRef<HTMLDivElement>(null);
  const [labelScale, setLabelScale] = useState(1), [cubeScale, setCubeScale] = useState(1);
  // Under about 480 pixels the figure has no room for prose inside it: the schematic's note goes.
  const [narrow, setNarrow] = useState(false);
  // Measured once before the first paint, so the figure is never drawn at one scale and then
  // redrawn at another, and watched after that for the window changing.
  useLayoutEffect(() => {
    const el = stageBox.current;
    if (!el) return;
    const fit = (width: number) => {
      if (width < 2) return;
      const k = Math.pow(720 / width, .72);
      setLabelScale(Math.round(clamp(k, 1, 1.5) * 20) / 20); setCubeScale(Math.round(clamp(k, 1, 1.9) * 20) / 20); setNarrow(width < 480);
    };
    fit(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(entries => fit(entries[0]?.contentRect.width ?? 0));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const [spatial, setSpatial] = useState<boolean | null>(null);
  const ZOOM_MIN = .45, ZOOM_MAX = 3.2;
  const [zoomWanted, setZoom] = useState(1);
  const [fieldView, setFieldView] = useState<'lines' | 'vectors' | 'off'>('lines');
  const reduced = !!useReducedMotion(), id = problem.geometry, scalar = problem.quantity === 'V', surface = id === 'disk' || id === 'sheet', perspective = surface || id === 'ring';
  // The ramp is the endpoint rod with a non-uniform density: same layout, different charge.
  const footed = id === 'endpoint' || id === 'ramp', ramp = id === 'ramp';
  // The lessons whose piece has a mirror partner that cancels its sideways part.
  const supportsPair = !scalar && (id === 'bisector' || id === 'infinite' || id === 'ring' || id === 'arc');
  // Looking straight down the z axis IS the flat drawing of a planar lesson: projectCamera
  // at yaw 0 and pitch a quarter turn reproduces the old planar projection to within 4e-16.
  // For a ring, a disk or a sheet the flat drawing is the textbook side view instead, the
  // plane nearly edge-on and P above it. So 2D and 3D are one projection with the camera
  // either locked or free, rather than two to keep in step.
  const FLAT: CameraView = perspective ? { yaw: 0, pitch: .15 } : { yaw: 0, pitch: Math.PI / 2 };
  // null means "whatever this geometry is normally drawn as"; the toggle sets it explicitly.
  const inSpace = spatial ?? perspective;
  const view = inSpace ? camera : FLAT;
  // Where the two parts that survive are laid TIP TO TAIL, adding, as What cancels ends -- on the rods, the
  // arc and the ring alike, and in space as the scene lays them. On a phone, where the names are set half as
  // large again, the fan round a rod's part has no room beside its middle for the name the stacked pair
  // pushes there, and ΔE_x went onto its own shaft: there the mirror's survivor stands BESIDE the piece's,
  // from P, and the piece's part keeps its name past its tip. (The ring's fan is narrower still, but beside
  // it the mirror's copy took the spot past the tip and pushed ΔE_z up into the axis' letter.)
  const stackSurvivors = inSpace || perspective || labelScale < 1.2;
  // How far out to draw the field, in world metres: past P and past the charge, capped so a
  // long rod does not shrink its own field to a smear.
  // How far out to draw the field is set by the CHARGE, never by where P happens to be.
  // Tying it to P meant every drag rebuilt every streamline and every arrow -- a third of a
  // second of tracing, mid-gesture -- to change nothing but how far the scenery extended.
  // The charge does not move while P does, so the field it makes does not either.
  const fieldReach = Math.round(Math.min(9, Math.max(3.5, p.size * 1.5)) * 2) / 2;
  // An orbit drag writes a SVG matrix from motion values; setState would rebuild the tree every frame.
  const [activeDrag,setActiveDrag] = useState(false);
  const still = reduced || activeDrag || gliding, moving = activeDrag || gliding;
  // Reported on the root beside `data-renders`, because `moving` gates two things a reader
  // would notice if they stuck: the label placer and the figure's own animation. A glide that
  // was interrupted used to leave it set for the rest of the session, and nothing said so.
  useLayoutEffect(() => { if (root.current) root.current.dataset.moving = String(moving); });
  const n = Math.max(3, Math.round(count)), R = p.size / 2;
  // The run's own piece, and whether Add them up is still handing it over to the chain (see `handOver`
  // below): for that first stretch the piece lit, joined to P and named is the run's piece, whose arrow
  // is the one shrinking -- not the first piece going into the sum, which would put a piece's name on
  // another piece's arrow.
  const runPiece = build?.piece !== undefined ? clamp(Math.round(build.piece), 0, n - 1) : -1;
  const handsOver = build?.key === 'add' && problem.quantity !== 'V' && runPiece >= 0;
  const handingOver = handsOver && progress < ADD_SHRINK + ADD_FADE;
  // ...and the sum itself starts once the hand-over is done, on the rest of the stage. Driven by the stage's
  // own progress, the first piece's link grew into the chain from the first frame, and the second's, under
  // the run's piece lit and named -- and when the hand-over ended the walk began at the second piece, so the
  // first was never lit at all: the first arrow of the sum arrived from an unmarked piece.
  const sumProgress = handsOver ? clamp((progress - ADD_SHRINK - ADD_FADE) / (1 - ADD_SHRINK - ADD_FADE), 0, 1) : progress;
  const selectedIndex = handingOver ? runPiece : handsOver ? activeIntervalIndex(n, boundRange, sumProgress) : clamp(Math.round(selected), 0, n - 1);
  // The charge's own shape, without the two fields that say how it is cut. The samplers read the
  // distance, the size, the charge and the angle, and never `slices` or `continuum`: those reach
  // them only as `n`, which is passed beside this. Keyed on the whole params object instead, the
  // run's last stage -- which writes a new `continuum` every frame -- re-cut the charge on every
  // frame into exactly the pieces it already had, and handed the field a new array each time.
  const { distance: pDistance, size: pSize, charge: pCharge, phi: pPhi, element: pElement } = p;
  const shape = useMemo<Params>(() => ({ distance: pDistance, size: pSize, charge: pCharge, phi: pPhi, element: pElement, slices: 0, continuum: 0 }), [pDistance, pSize, pCharge, pPhi, pElement]);
  const samples = useMemo(() => sampleDistribution(id, shape, n), [id, shape, n]);
  // What the FIELD is drawn from, which is not the same thing as what the reader is shown.
  //
  // The pieces on the figure are the partition being summed, and the reader chooses how many.
  // The field lines are meant to be the field of the CHARGE -- the rod, the ring, the plane --
  // and on the three unbounded lessons those two came apart badly. Their substitution puts five
  // pieces at y = 0, ±2.18 and ±9.23 metres: a genuinely lumpy object, whose field near the
  // middle is a lump's and not a line's. Every drawn line stopped 1.2 m clear of the wire,
  // because 1.2 m really is as close as five lumps can be trusted, and an infinite line was
  // drawn with a hole around it.
  //
  // That lumpiness is an artifact of a change of variable made for integrating, not a feature of
  // the charge. So the field is traced from a partition fine enough to BE the geometry, while the
  // pieces, the marks and the integral all stay at the reader's own N.
  //
  // On every lesson, not only those three. A bounded partition at small N is lumpy too: a ring cut
  // into five drew the field of five point charges, not one of its lines reaching the ring, two
  // of them floating with both ends in empty space, and a closed arc showed almost no field. Ninety-
  // six pieces is the ring to well within a line's width; the tracers coarsen it to their budgets.
  const fieldSamples = useMemo(() => sampleDistribution(id, shape, Math.max(n, UNBOUNDED.has(id) ? 400 : 96)), [id, shape, n]);
  // WHILE THE RUN SHRINKS THE PIECES, the flat field is traced from the charge as that stage will
  // leave it -- cut as finely as it ends up cut -- rather than as it happens to be cut at this
  // moment. The stage doubles the pieces five or six times as it plays, and every doubling handed
  // the tracer a new charge, so every streamline was traced again mid-animation: a hitch at each
  // doubling, in the one stage whose whole point is that the answer stops depending on the cut.
  // The field of the charge does not depend on how it is cut -- which is what the lines are drawn
  // for, as above -- so it is traced once, as the stage begins, behind a construction that has
  // already faded the field back to scenery, and it is the field the stage's last frame arrives at.
  // The four stages before it cut nothing, and draw exactly what they always drew.
  // The flat canvas only. In space the disk draws its slices from the samples it is handed, and
  // those must stay the reader's own pieces.
  const runCut = build?.key === 'limit' && !UNBOUNDED.has(id) ? partitionCount(p.slices, 1) : 0;
  const canvasSamples = useMemo(() => runCut ? sampleDistribution(id, shape, runCut) : fieldSamples, [id, shape, runCut, fieldSamples]);
  const sample = samples[selectedIndex], total = sumSamples(samples), weights = intervalWeights(n,boundRange,sumProgress), partial = sumInterval(samples,boundRange,sumProgress);
  const wholeWeights = intervalWeights(n,boundRange,1);
  const full = boundRange[0]===0 && boundRange[1]===100;
  // The drawn arrow is the field itself only once every piece is in and the pieces are gone.
  const finished = continuum>=.999 && progress>=.999 && full;
  const displayed = finished ? field(id,p) : partial;
  const summing = mode === 'sum' || mode === 'integrate';
  // A zero worth printing is a sum of every piece that comes to nothing -- the arc closed into a
  // ring -- never the empty sum the adding stage starts from.
  const zeroField = magnitude(displayed) < 1e-8 && full && (finished || progress >= .999 || !summing);
  const vExact = scalar ? potential(id, p) : 0;
  const vNow = scalar ? (continuum>=.999 && progress>=.999 && full ? vExact : sumPotential(samples, boundRange, progress)) : 0;
  const vScale = Math.max(Math.abs(vExact), Math.abs(vNow), ...samples.map(s => Math.abs(s.potential)), 1e-12);
  const dVmax = Math.max(...samples.map(s => Math.abs(s.potential)), 1e-20);
  const running = !!build;
  const [announcement,setAnnouncement] = useState(''), pending = useRef(''), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previous = useRef({id,distance:p.distance,size:p.size,charge:p.charge,phi:p.phi,n,selectedIndex,progress,continuum,lower:boundRange[0],upper:boundRange[1]});
  useEffect(()=>{
    const old=previous.current,next={id,distance:p.distance,size:p.size,charge:p.charge,phi:p.phi,n,selectedIndex,progress,continuum,lower:boundRange[0],upper:boundRange[1]};
    previous.current=next;
    // While the run plays, the page says what each stage is, and the run moves the sum, the cut and the
    // piece every few frames: announced as well, they talked over the stage's own narration every half
    // second -- nineteen times in one run. The reader's own changes are still announced.
    const cause=old.id!==id?problem.title:old.distance!==p.distance?`Observation distance ${pretty(p.distance)} meters`:old.lower!==next.lower||old.upper!==next.upper?`Integration interval ${next.lower} to ${next.upper} percent of the source coordinate`:running?'':old.progress!==progress?`${Math.round(progress*100)} percent of the interval accumulated`:old.n!==n||old.continuum!==continuum?`Partition refined${continuum>=.999?', continuous limit':''}`:old.selectedIndex!==selectedIndex?`Charge element selected. ${scalar?`Contribution ${pretty(sample.potential)} volts`:`Contribution magnitude ${pretty(magnitude(sample.field))} newtons per coulomb`}`:old.size!==p.size||old.charge!==p.charge||old.phi!==p.phi?'Charge distribution adjusted':'';
    if(!cause)return;
    pending.current=`${cause}. ${scalar ? `Net potential ${pretty(vNow)} volts.` : `Net field magnitude ${pretty(magnitude(displayed))} newtons per coulomb.`}`;
    // A trailing throttle reads the latest state during a drag, without indefinitely deferring speech.
    if(!timer.current)timer.current=setTimeout(()=>{setAnnouncement(pending.current);timer.current=null;},500);
  },[id,p.distance,p.size,p.charge,p.phi,n,selectedIndex,progress,continuum,boundRange,problem.title,sample.field,sample.potential,displayed,scalar,vNow,running]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  // Each geometry puts its origin where its own labels need it, which is not the middle.
  //
  // On a phone the labels are set half as large again against the same drawing, and the room the arrows
  // at P have toward the frame went to their names: on the ring, whose arrows rise from a P near the top,
  // the parts that cancel came out ten pixels long, and on the rods with a foot, whose arrows fall from a
  // P near the bottom, not much more. So on a phone those drawings stand a little further from the edge
  // P's arrows run to.
  // Seen flat, the ring lies nearly edge-on, a dozen units deep, and can stand lower still.
  const lift = narrow ? (perspective ? (inSpace ? 20 : 40) : footed ? -15 : 0) : 0;
  const originAt1: Point = perspective ? { x: 315, y: 296 + lift } : footed ? { x: 210, y: 250 + lift } : id === 'semi' ? { x: 300, y: 310 } : id === 'axial' ? { x: 130, y: 230 } : id === 'arc' ? { x: 375, y: 218 } : { x: 220, y: 216 };
  // Pixels per metre, times whatever the reader has zoomed to. The projection, the canvas
  // and the 3D frustum all read this, so one multiply zooms the whole figure and no layer
  // can disagree with another about scale.
  // Pixels per metre, fitted to what the lesson actually has to show.
  //
  // Most geometries only have to fit their charge, and did. The axis lesson has to fit the
  // rod AND the gap out to P -- seven metres at the default, more than twice anything else
  // -- and was given the smallest scale of all, a flat 35, so its rod drew at a fifth of
  // the frame with dead space beyond it. The arc was fixed at 40 regardless of its radius.
  // Both are fitted now: the span that must be visible, into the room available for it.
  //
  // Quantised to five-pixel steps so that dragging P, which changes the span, steps the
  // scale occasionally instead of resizing the drawing continuously under the cursor.
  const fit = (span: number, room: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, Math.round(room / Math.max(.5, span) / 5) * 5));
  // The ring, the disk and the sheet: see `surfaceUnit`.
  const baseUnit = perspective ? surfaceUnit(p.distance, (inSpace ? opening : FLAT).pitch)
    : footed ? Math.min(45, 150 / p.size)
    : id === 'bisector' ? Math.min(45, 140 / R)
    : id === 'axial' ? fit(p.size + p.distance, 400, 20, 70)
    : id === 'arc' ? fit(2 * R, 300, 25, 65)
    // The semi-infinite line stands P straight up from its end, and at a fixed 35 a P six metres up sat
    // under the plot's top edge with its arrows squeezed into the corner and two thirds of the picture
    // empty. Fitted to P's height, as the ring, the disk and the sheet are.
    : id === 'semi' ? Math.min(35, Math.max(18, Math.floor(150 / Math.max(.5, p.distance) / 5) * 5))
    : 35;
  // Where P lives, and the line it is allowed to move along: from `pivot`, `axisDir` per unit of `distance`.
  const axisDir: Vec = id === 'arc' ? zero : id === 'axial' ? { x: 1, y: 0, z: 0 } : id === 'semi' ? { x: 0, y: 1, z: 0 } : perspective ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const pivot: Vec = id === 'axial' ? { x: p.size, y: 0, z: 0 } : zero;
  const pWorld: Vec = { x: pivot.x + axisDir.x * p.distance, y: pivot.y + axisDir.y * p.distance, z: pivot.z + axisDir.z * p.distance };
  // Zoom magnifies the picture about the two things the picture is ABOUT -- the charge and P
  // -- rather than about the drawing origin.
  //
  // Scaling `unit` alone scales everything about that origin, and the origin is wherever a
  // geometry's labels wanted it, not the middle of anything. So the further a feature sat
  // from it, the faster zooming threw that feature out of the frame, and P sits further from
  // it than anything else does. Measured on the ring at full zoom: P was forty pixels above
  // the top edge, its halo cut in half by the frame, while the charge overflowed the width.
  // Zooming in hid the one point the whole figure exists to describe.
  //
  // Anchoring halfway between them holds that midpoint still and moves both outwards at the
  // same rate, which is the most of both that any magnification can keep. Where P sits on the
  // charge, as on the arc, the anchor is the origin and this changes nothing.
  const pAt1 = (() => { const s = projectCamera(pWorld, view.yaw, view.pitch); return { x: originAt1.x + baseUnit * s.x, y: originAt1.y + baseUnit * s.y }; })();
  const anchor: Point = { x: (originAt1.x + pAt1.x) / 2, y: (originAt1.y + pAt1.y) / 2 };
  // How far in this lesson can be zoomed before the frame stops holding its subject.
  //
  // The scale is already fitted so each lesson fills its frame at rest, which leaves the wide
  // ones almost no room: the axial rod spans seven metres, charge to P, and at three times
  // that nothing could hold both ends. There is no panning, so past this point zooming only
  // pushes the physics out of sight -- the plus key stops instead, which is honest, and the
  // minus key always has somewhere to go.
  const MARGIN = 26;
  const room = (centre: number, half: number, extent: number) =>
    Math.abs(half) < .5 ? Infinity : Math.min((extent - MARGIN - centre) / Math.abs(half), (centre - MARGIN) / Math.abs(half));
  const roomX = room(anchor.x, pAt1.x - anchor.x, 720), roomY = room(anchor.y, pAt1.y - anchor.y, 430);
  const fits = roomX < roomY ? roomX : roomY;
  const zoomCeiling = fits > ZOOM_MAX ? ZOOM_MAX : fits < 1 ? 1 : fits;
  const zoom = zoomWanted < zoomCeiling ? zoomWanted : zoomCeiling;
  const O: Point = zoom === 1 ? originAt1
    : { x: anchor.x + zoom * (originAt1.x - anchor.x), y: anchor.y + zoom * (originAt1.y - anchor.y) };
  // Pixels per metre, times whatever the reader has zoomed to. The projection, the canvas and
  // the 3D frustum all read this, so one multiply zooms every layer and none can disagree.
  const unit = baseUnit * zoom;
  // Kept as one function for as long as the view holds still. The field canvas redraws whenever it
  // is handed a new projection, and a fresh closure every render meant a full redraw of every
  // streamline on every frame of the run -- reallocating the canvas to do it -- for a picture that
  // had not moved.
  // The compiler lint cannot prove that five numbers will not be mutated later; they are numbers.
  const { x: Ox, y: Oy } = O, { yaw: viewYaw, pitch: viewPitch } = view;
  // oxlint-disable-next-line react/react-compiler
  const project = useCallback((v: Vec): Point => { const s = projectCamera(v, viewYaw, viewPitch); return { x: Ox + unit * s.x, y: Oy + unit * s.y }; }, [Ox, Oy, unit, viewYaw, viewPitch]);
  // Screen point a distance `length` out along a world direction, for the axes and the R/s bracket.
  const ray = (v: Vec, length: number): Point => { const s = projectCamera(v, view.yaw, view.pitch); return { x: O.x + length * s.x, y: O.y + length * s.y }; };
  const axisX = ray({ x: 1, y: 0, z: 0 }, 185), axisY = ray({ x: 0, y: 1, z: 0 }, 122);
  const axisTip = (a: Point, dx: number, dy: number): Point => ({ x: clamp(a.x + dx, 52, 652), y: clamp(a.y + dy, 70, 360) });
  const P = project(pWorld);
  const world = (t: number): Vec => {
    if (id === 'bisector') return { x: 0, y: p.size * (t - .5), z: 0 };
    if (id === 'axial') return { x: p.size * t, y: 0, z: 0 };
    if (footed) return { x: 0, y: p.size * t, z: 0 };
    if (id === 'infinite') return { x: 0, y: p.distance * Math.tan(Math.PI * (clamp(t, .001, .999) - .5)), z: 0 };
    if (id === 'semi') return { x: p.distance * Math.tan(Math.PI * clamp(t, 0, .999) / 2), y: 0, z: 0 };
    if (surface) return { x: id === 'disk' ? R * t : p.distance * Math.tan(Math.PI * clamp(t, 0, .999) / 2), y: 0, z: 0 };
    const theta = id === 'ring' ? 2 * Math.PI * t : p.phi * (t - .5);
    return { x: R * Math.cos(theta), y: R * Math.sin(theta), z: 0 };
  };
  // The wire's shape, from the geometry itself at a resolution that reads as smooth. Not
  // from the samples: those are the partition, and a ring cut into five pieces is still a
  // ring, not a pentagon.
  const bodyPath = surface ? undefined : Array.from({ length: 129 }, (_, k) => world(k / 128));
  // A rod or a line, drawn flat as a bar this many units either side of its axis.
  const rodLike = !surface && id !== 'ring' && id !== 'arc', rodHalf = 7;
  // Where the charge is, seen from P: the middle of the rod, the ring's centre, the arc's own middle.
  const chargeCentre: Vec = id === 'arc' ? world(.5) : id === 'axial' ? { x: p.size / 2, y: 0, z: 0 } : footed ? { x: 0, y: p.size / 2, z: 0 } : zero;
  const toCharge = vsub(project(chargeCentre), P);
  // The diameter lying across the screen: (cos yaw, sin yaw, 0) is exactly the direction the camera maps
  // to screen-horizontal. See the fan below.
  const across: Vec = { x: Math.cos(view.yaw), y: Math.sin(view.yaw), z: 0 };
  // Where a ring of a disk or a sheet is pointed at: where it crosses that diameter, level with O and so
  // below P in every view. Its point on the world x axis rose above P in space, at yaw -0.5, so the line
  // from P to a far ring of the sheet climbed to the frame's top while its tag sat on a wedge below: the
  // line and the tag named two different places.
  const selectedPoint = project(surface ? scaleVec(across, Math.abs(sample.position.x)) : sample.position), visible = (v: Point) => v.x > 45 && v.x < 665 && v.y > 58 && v.y < 365;
  const selectedOnFrame = visible(selectedPoint);
  const clampToFrame = (v: Point): Point => ({ x: clamp(v.x, 52, 657), y: clamp(v.y, 62, 362) });
  // A common numeric scale applies to net and component arrows. The selected
  // element has an explicitly stated magnification so tiny dE remains inspectable.
  const pieceNorm = Math.max(...samples.map(s => magnitude(s.field)), 1e-30);
  // THE RUN'S OWN CUT: the pieces it starts from, before Shrink them doubles them. Everything the run
  // scales by is read off these, so that no doubling can change the scale of an arrow on screen.
  const runStart = build && !scalar ? partitionCount(p.slices, 0) : 0;
  const runSamples = useMemo(() => runStart && runStart !== n ? sampleDistribution(id, shape, runStart) : samples, [id, shape, runStart, n, samples]);
  // While the run plays, the scale is set by the field itself, which does not depend on how the
  // charge is cut. Taken from the sum of the pieces instead, it was re-rounded to a power of two
  // every time the limit doubled the pieces, and the arrow could halve or double in a frame while
  // the field it drew moved by a percent. A field that is zero by symmetry -- the arc closed into a
  // ring -- has no scale of its own, so the pieces set it: the pieces of the run's FIRST cut. Read
  // off the pieces of the moment, the scale doubled every time Shrink them halved them, so each link
  // of the chain stayed fifty to a hundred pixels long while their number went to a hundred and
  // ninety-two, and the closed chain was drawn as a curve thousands of pixels round, through P and
  // out of the card. At the first cut's scale the links shorten as they multiply, as the stage says.
  const exactField = !scalar && build ? field(id, p) : zero;
  const runNorm = Math.max(...runSamples.map(s => magnitude(s.field)), 1e-30);
  const runSum = build && !scalar ? sumSamples(runSamples) : zero;
  const fieldNorm = build && !scalar ? (magnitude(exactField) > 1e-6 * runNorm ? magnitude(exactField) : Math.max(magnitude(runSum), runNorm, 1e-9))
    : Math.max(magnitude(total), pieceNorm, 1e-9);
  const scaleValue = 2 ** Math.ceil(Math.log2(fieldNorm));
  // WHILE THE RUN PLAYS, THE ARROWS ARE THE SUBJECT, so they are drawn as large as the frame
  // allows. At the resting scale the finished field is a hundred pixels at most and the chain of
  // contributions that builds it is a squiggle beside P -- the one stage whose whole point is that
  // chain had nothing to look at. The run scales every field arrow by one factor, chosen so the
  // finished field reaches toward the frame's edge in its own direction, so the chain, the net
  // arrow and the field it converges to stay in proportion with each other throughout.
  //
  // Measured in the view the figure OPENS in, not the one it is turned to: a scale read off the
  // live screen grew and shrank the arrows' real lengths as the reader orbited, so turning the
  // figure in 3D appeared to change the field.
  //
  // ...AND NEVER SO LARGE THAT ANY OF THEM LEAVES THE PICTURE. Fitting the net alone was not enough
  // where the pieces mostly cancel: on an arc closed nearly into a ring each piece's field is many
  // times the net, so the piece, its parts and the chain that winds round before it closes ran
  // hundreds of pixels past the frame, through the footer and off the card. So every partial sum of
  // the chain, every piece's own arrow and the net are fitted inside the plot, a little in from its
  // edge, and the scale may fall below one to do it. And a field that points AT the charge -- any
  // negative charge -- is stretched only to just short of it: stretched to the frame's edge, its head
  // was buried in the rod or the disk and the placer hid the very name the stage ends on.
  /** How far along a world direction from P, in screen units of the view `ref`, the charge is first met:
   * a point of the wire within a stroke's width of the ray, the face of a disk or a sheet, or the
   * centre a ring's arrows point at. Infinity where the ray meets nothing, or runs at the camera. */
  const chargeAhead = (v: Vec, ref: CameraView): number => {
    const len = magnitude(v);
    if (len < 1e-30) return Infinity;
    const u: Vec = { x: v.x / len, y: v.y / len, z: v.z / len };
    const s = projectCamera(u, ref.yaw, ref.pitch), perMetre = unit * Math.hypot(s.x, s.y);
    if (perMetre < 1e-6) return Infinity;
    const tolerance = (rodLike && !inSpace ? rodHalf + 4 : 8) / unit;
    let t = Infinity;
    for (const q of [...(bodyPath ?? []), zero]) {
      const d = { x: q.x - pWorld.x, y: q.y - pWorld.y, z: q.z - pWorld.z }, along = d.x * u.x + d.y * u.y + d.z * u.z;
      if (along <= 1e-9 || along >= t) continue;
      if (Math.hypot(d.x - along * u.x, d.y - along * u.y, d.z - along * u.z) < tolerance) t = along;
    }
    // A disk's or a sheet's face: where the ray crosses z = 0, inside the rim.
    if (surface && Math.abs(u.z) > 1e-9) {
      const along = -pWorld.z / u.z, x = pWorld.x + along * u.x, y = pWorld.y + along * u.y;
      if (along > 1e-9 && (id === 'sheet' || Math.hypot(x, y) <= R)) t = Math.min(t, along);
    }
    return t * perMetre;
  };
  const runScale = (() => {
    if (!build || scalar) return 1;
    const ref = inSpace ? opening : FLAT, base = 100 / scaleValue;
    const at = projectCamera(pWorld, ref.yaw, ref.pitch), from = { x: O.x + unit * at.x, y: O.y + unit * at.y };
    const screen = (v: Vec): Point => { const s = projectCamera(v, ref.yaw, ref.pitch); return { x: base * s.x, y: base * s.y }; };
    const netV = screen(magnitude(runSum) >= magnitude(exactField) ? runSum : exactField), length = Math.hypot(netV.x, netV.y);
    let want = 1;
    if (length >= 1) {
      const edge = rayToEdge(from, { x: netV.x / length, y: netV.y / length }, { x: 42, y: 54, width: 626, height: 317 });
      want = clamp((Math.hypot(edge.x - from.x, edge.y - from.y) - 46) / length, 1, 2.6);
    }
    const reach: Point[] = [netV];
    let partialSum: Vec = zero;
    for (const s of runSamples) { partialSum = { x: partialSum.x + s.field.x, y: partialSum.y + s.field.y, z: partialSum.z + s.field.z }; reach.push(screen(partialSum), screen(s.field)); }
    // Thirty in from the plot's edge -- or, for a P that sits nearer the edge than that, two fifths of
    // the way to it -- so an arrowhead and the name beside it are inside the window too.
    const room = (lo: number, hi: number, c: number, d: number) => d > 1e-9 ? Math.max(hi - 30 - c, .4 * (hi - c)) / d : d < -1e-9 ? Math.max(c - lo - 30, .4 * (c - lo)) / -d : Infinity;
    let cap = Infinity;
    for (const v of reach) cap = Math.min(cap, room(42, 668, from.x, v.x), room(54, 371, from.y, v.y));
    // Short of the charge, where the net points toward it -- in the world, not on the screen. Tested on
    // the screen, the far rim of a ring or a disk, which in space projects ABOVE P whenever P is lower
    // than about two thirds of the radius, stopped an arrow pointing straight up, away from the charge, at
    // a rim that lies behind P: the net of a ring with P a metre up was six pixels long and nameless. And
    // where P really is close to the charge, half the gap was all it was given -- nine pixels on a rod
    // with P half a metre out. So the ray is followed in space, and the stop is never shorter than a
    // readable arrow: shorter than that, the net crosses the charge, painted over it, and keeps its name.
    // The floor is for the shorter of the two the stages end on -- the cut's sum and the field -- since with P
    // close in the five pieces' sum can be twice the field, and the field drawn at half the floor.
    if (length >= 1) {
      const hit = chargeAhead(magnitude(runSum) >= magnitude(exactField) ? runSum : exactField, ref);
      const shorter = Math.hypot(screen(magnitude(runSum) >= magnitude(exactField) ? exactField : runSum).x, screen(magnitude(runSum) >= magnitude(exactField) ? exactField : runSum).y);
      const floor = RUN_FLOOR * (shorter >= .2 * length ? length / shorter : 1);
      if (Number.isFinite(hit)) cap = Math.min(cap, Math.max(hit - 28, floor) / length);
    }
    return clamp(Math.min(want, cap), .02, 2.6);
  })();
  const gain = 100 / scaleValue * runScale;
  const fieldScreen = (v: Vec, multiplier = 1): Point => { const k = gain * multiplier; const s = projectCamera(v, view.yaw, view.pitch); return { x: k * s.x, y: k * s.y }; };
  // One piece's arrow is magnified to a readable length: at rest so that whichever piece is clicked
  // can be read, and while the run plays so that One piece and What cancels always have an arrow to
  // look at, with its parts and their names.
  //
  // In the run the magnification used to be one for the whole lesson, set by the STRONGEST piece, so
  // that a nearer piece would be seen to act harder. On a long rod or a wide disk that made the run's
  // own piece -- an end piece, far off -- a dot: five pixels on the bisector with P half a metre out,
  // too short to carry a name, with parts of a pixel. Everywhere else it silently magnified the piece
  // two to five times against the chain it then joined, so the ring's one piece came out longer than
  // the whole sum. So the piece is drawn from its OWN field, at a readable length, and the change of
  // scale is made where it can be seen: as Add them up begins, the piece's arrow shrinks to its true
  // length at the scale the chain is drawn at, and only then lets the chain have the picture.
  //
  // ...never so long that the piece's arrows, or its partner's, run out of the picture past the room
  // their names need -- measured, like the scale above, in the view the figure opens in, so that
  // turning the view does not change it.
  // The top of the vertical axis, where its letter goes: low enough on a phone, where the letters are
  // set larger, to clear the stage's name above the frame.
  // On a phone a little lower again: the letter's top stood two pixels under the stage's name, and the two
  // read as one phrase, "What cancels z".
  const axisTop = Math.max(66, 48 + .98 * SYM * labelScale + (narrow ? 6 : 0));
  const roomFor = (f: Vec) => {
    if (!build || scalar) return Infinity;
    const ref = inSpace ? opening : FLAT, at = projectCamera(pWorld, ref.yaw, ref.pitch), from = { x: O.x + unit * at.x, y: O.y + unit * at.y };
    const mirror = id === 'ring' ? { x: -f.x, y: -f.y, z: f.z } : { x: f.x, y: -f.y, z: f.z };
    // And the parts each is resolved into, which What cancels draws as arrows of their own and names
    // past their tips: room for the whole arrow along its slant still let the part straight up from
    // P run to within a name's height of the frame, and its name climbed into the stage's title.
    const parts = (v: Vec): Vec[] => perspective ? [{ x: 0, y: 0, z: v.z }, { x: v.x, y: v.y, z: 0 }] : [{ x: v.x, y: 0, z: 0 }, { x: 0, y: v.y, z: 0 }];
    // AND THE TWO SURVIVING PARTS LAID TIP TO TAIL, as What cancels ends: twice the piece's own part, from
    // P. Fitted one arrow at a time, the second ran past the plot's edge with its head cut off -- on the
    // ring's side view up the z axis into its letter, where it read as the axis' own arrowhead -- and for
    // a negative ring down through the ring and O.
    const stacked: Vec[] = supportsPair && stackSurvivors ? [scaleVec(parts(f)[0], 2)] : [];
    let cap = Infinity;
    for (const v of stacked) {
      const hit = chargeAhead(v, ref), s = projectCamera(v, ref.yaw, ref.pitch), len = gain * Math.hypot(s.x, s.y);
      if (Number.isFinite(hit) && len > 1e-9) cap = Math.min(cap, Math.max(24, hit - 24) / len);
    }
    for (const v of [f, mirror, ...parts(f), ...parts(mirror), ...stacked]) {
      const s = projectCamera(v, ref.yaw, ref.pitch), len = gain * Math.hypot(s.x, s.y);
      if (len < 1e-9) continue;
      // The stacked pair carries no name of its own past its tip: room for its head, and clear air under the
      // axis' letter -- ending against it, it read as the axis' own arrowhead.
      const margin = stacked.includes(v) ? 24 : 34 * labelScale;
      // The top of the plot less the vertical axis' own letter, which stands there: a part drawn up that
      // axis -- the ring's along its axis, the arc's across it -- put its name on the letter.
      const top = axisTop + .39 * SYM * labelScale + 4;
      const edge = rayToEdge(from, { x: gain * s.x / len, y: gain * s.y / len }, { x: 42, y: top, width: 626, height: 371 - top });
      cap = Math.min(cap, Math.max(40, Math.hypot(edge.x - from.x, edge.y - from.y) - margin) / len);
    }
    return cap;
  };
  /** The run's magnification for a piece whose field is `f`: its own arrow about 108 pixels long. */
  // A little longer on a phone, where the names it carries are set larger against the same drawing.
  // Never below its true length, unless even that would not fit: then as long as the room allows. A floor
  // of one regardless drew the arc's piece, closed nearly into a ring, nine hundred pixels long.
  const runGain = (f: Vec) => { const fit = roomFor(f); return clamp(108 * clamp(labelScale, 1, 1.35) / Math.max(1e-30, gain * magnitude(f)), Math.min(1, fit), Math.min(1000, fit)); };
  const selectedGain = build && !scalar
    ? runGain(sample.field)
    : Math.max(1, Math.min(1000, 55 / Math.max(.001, Math.hypot(fieldScreen(sample.field).x, fieldScreen(sample.field).y))));
  // THE CHANGE OF SCALE, SEEN. The first stretch of Add them up draws the run's piece shrinking from
  // the length it had in the two stages before to its true length beside the chain; then it fades,
  // and the sum it is part of takes over. The sum's own arrow waits until it has gone, so no frame
  // shows one piece drawn longer than the sum it belongs to.
  const handOver = handingOver ? (() => {
    const f = samples[runPiece].field, k = clamp(progress / ADD_SHRINK, 0, 1), e = 1 - Math.pow(1 - k, 3);
    const multiplier = runGain(f) + (1 - runGain(f)) * e;
    return { field: f, multiplier, vector: fieldScreen(f, multiplier), opacity: clamp(1 - (progress - ADD_SHRINK) / ADD_FADE, 0, 1) };
  })() : null;
  const contribution = fieldScreen(sample.field, selectedGain);
  const net = fieldScreen(displayed);
  // The chain of every piece's arrow, tip to tail. Drawn through "Shrink them" too, recomputed at
  // the partition of the moment: the stage says each piece's arrow shrinks while there are ever more
  // of them, and the chain is where that is seen -- its links multiply and shorten into a smooth
  // curve while its end stays on the tip of the field. It used to vanish on the stage's first frame.
  const chaining = !scalar && (mode === 'sum' || build?.key === 'limit');
  const chainPoints: Point[] = [];
  let chainEnds = '', chainBeside = false;
  if (chaining) {
    let cursor = P;
    chainPoints.push(P);
    for (let i = 0; i < samples.length; i++) {
      const w = weights[i];
      if (w === 0) continue;
      cursor = plus(cursor, fieldScreen(scaleVec(samples[i].field, w)));
      chainPoints.push(cursor);
    }
    // Where every piece pushes the same way -- along the rod's own axis, along the axis of a disk --
    // the chain lies exactly on the field's arrow, and its joints stacked on the arrowhead and on the
    // axis' letter. It is drawn a little to one side of the arrow instead, parallel to it.
    const u = (id === 'axial' || surface) && chainPoints.length > 1 ? direction(vsub(chainPoints[chainPoints.length - 1], P)) : null;
    if (u) {
      chainBeside = true;
      // Above an arrow lying across the page, right of one standing up: perpendicular either way.
      const side = Math.abs(u.x) >= Math.abs(u.y)
        ? (u.x > 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x })
        : (u.y < 0 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x });
      for (let k = 0; k < chainPoints.length; k++) chainPoints[k] = { x: chainPoints[k].x + side.x * 10, y: chainPoints[k].y + side.y * 10 };
      // ...with a short stroke across each end, back to the arrow's line: a bare parallel line beside E read
      // as a doubled, mis-registered stroke, not as the sum it stands for laid off alongside it.
      const a = chainPoints[0], b = chainPoints[chainPoints.length - 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) > 6) chainEnds = [a, b].map(q => `M${(q.x - side.x * 10).toFixed(1)} ${(q.y - side.y * 10).toFixed(1)}L${(q.x + side.x * 4).toFixed(1)} ${(q.y + side.y * 4).toFixed(1)}`).join('');
    }
  }
  // Pointing at one piece's CHARGE lights the piece and names it; it does not need the arrow and
  // the construction lines, which belong to the distance and the direction. The run's first stage
  // lights the charge while it cuts, and drawing the arrow there would show the second stage early.
  const showContribution = mode !== 'divide' || (!!highlight && highlight !== 'element' && highlight !== 'pieces');
  // The selected element, as the shape it actually is.
  //
  // It used to be handed over as a point, a direction and a length, which the scene drew as
  // one straight cylinder. On a rod that is right; on a ring with five pieces it is a chord
  // across seventy-two degrees, which reads as a tangent line laid against the ring rather
  // than a piece of it. A wire's element is a PATH now, sampled along the real geometry the
  // same `world(t)` the flat drawing uses, so a curved wire gives a curved piece.
  //
  // A surface's element is not a length at all: it is the annulus between two radii, and it
  // had no body in the scene, only a hairline stroke lying flat over a lit solid.
  const sceneElement = (() => {
    // The band's edges are the partition's own, not one average width shared by every piece.
    // A disk is cut at even radii, so a single step was right for it and hid the fault; the
    // sheet is cut at |z|·tan(πt/2), where the outer rings are vastly wider than the inner
    // ones, and a shared step drew the selected band nowhere near the ring being summed.
    // `world` is the same function the sampler partitions by, so these edges are that ring's.
    if (surface) return { annulus: { inner: Math.abs(world(selectedIndex / n).x), outer: Math.abs(world((selectedIndex + 1) / n).x) } };
    const lo = selectedIndex / n, hi = (selectedIndex + 1) / n;
    return { path: Array.from({ length: 13 }, (_, k) => world(lo + (hi - lo) * k / 12)) };
  })();
  // THE ANGULAR FAN, for the geometries whose charge runs off the page.
  //
  // These lessons cut the distribution the way their own derivation does -- equal steps in the
  // theta of y = r tan theta -- which is the right partition and the reason the improper integral
  // is tractable: every piece then contributes an identical |dE|. It also puts the outer pieces
  // hundreds of metres away. The figure used to draw them literally, as bands 33 000 pixels long
  // inside a 626-pixel window, so the first move of the lesson -- point at one piece -- had no
  // target. Windowing the drawing does not help; the piece's own centre of charge is outside the
  // window too, so there is nothing there to label.
  //
  // What is always in the picture is the ANGLE the piece subtends at P. A piece is drawn as the
  // wedge between two rays out of P, and the outermost rays lie down along the wire rather than
  // diverging, because that is where the charge went. The reader sees the infinite line resolved
  // into a finite fan -- which is the substitution, drawn instead of asserted.
  //
  // Directions come from `world`, the same function the sampler partitions by, so the fan cannot
  // drift from the pieces it names. Projection is linear, so a screen direction is the projected
  // world direction and no clipping in world space is needed.
  const fanned = (id === 'infinite' || id === 'semi' || id === 'sheet') && continuum < .995;
  // The sheet is cut into RINGS, and a ring's seam is a circle round the axis, so its fan is a
  // cross-section: the rays from P to where each seam crosses one diameter, on both sides. The
  // diameter is the one lying across the screen -- (cos yaw, sin yaw, 0) is exactly the direction
  // the camera maps to screen-horizontal -- so the cut always faces the reader and its angles are
  // the least foreshortened the view allows. Seen this way the sheet's whole argument is on the
  // page: each ring is one angle below P, and lifting P leaves the angles alone while the rings
  // they take in grow, which is why the field does not depend on the height.
  const fan = (() => {
    if (!fanned) return null;
    const rect = { x: 42, y: 54, width: 626, height: 317 };
    const sides = id === 'sheet' ? [1, -1] : [0];
    // The charge's own line on screen: the wire, or the diameter of the sheet the cut is taken along.
    // Every wedge and every ray stops at it, because the piece it stands for does.
    const chargeLine: Line = { point: O, dir: vsub(project(id === 'sheet' ? across : id === 'semi' ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }), project(zero)) };
    const wedges: { index: number; key: string; points: string; middle: Point | null }[] = [];
    const rays: { key: string; end: Point }[] = [];
    for (const side of sides) {
      const suffix = side > 0 ? ':r' : side < 0 ? ':l' : '';
      const seam = (t: number): Vec => side === 0 ? world(t) : scaleVec(across, side * Math.abs(world(t).x));
      const edges = Array.from({ length: n + 1 }, (_, i) => direction(vsub(project(seam(i / n)), P)));
      for (let i = 0; i < n; i++) {
        const a = edges[i], b = edges[i + 1];
        if (!a || !b) continue;
        const poly = wedgePath(P, a, b, rect, chargeLine);
        // A wedge with no area is one pointing away from the picture: nothing to draw, nothing to
        // click. Drawing it anyway would pin a sliver to the nearest edge and call it a piece.
        if (poly.length < 3 || area(poly) < 40) continue;
        const centre = side === 0 ? samples[i].position : scaleVec(across, side * Math.abs(samples[i].position.x));
        wedges.push({ index: i, key: intervalKey(i, n) + suffix, points: poly.map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' '), middle: direction(vsub(project(centre), P)) });
      }
      // Only the rays that reach the charge on the page: one that runs on to the frame's edge is the
      // edge of no angle drawn here, and the outermost two made a line through P.
      edges.forEach((d, i) => { const end = d ? rayMeetsLine(P, d, rect, chargeLine) : null; if (end) rays.push({ key: seamKey(i / n) + suffix, end }); });
    }
    return { wedges, rays, line: chargeLine };
  })();
  // WHERE THE ELEMENT IS NAMED. Normally on the charge itself. When the charge is off the page --
  // which for an unbounded lesson is not a failure but the truth about where that piece lies --
  // the name goes on its wedge instead, a little way out from P along the middle of the angle the
  // piece subtends. The reader is pointed at something real and on screen, rather than told the
  // piece is "outside view", which named nothing and was the reason these lessons were held back.
  const selectedWedge = fan?.wedges.find(w => w.index === selectedIndex) ?? null;
  // Out along the middle of the angle, but never past the charge the angle ends at.
  const wedgeAnchor = selectedWedge?.middle ? (() => { const m = selectedWedge.middle, hit = fan?.line ? rayToLine(P, m, { x: 42, y: 54, width: 626, height: 317 }, fan.line) : null, reach = hit ? Math.min(92, .62 * Math.hypot(hit.x - P.x, hit.y - P.y)) : 92; return clampToFrame({ x: P.x + m.x * reach, y: P.y + m.y * reach }); })() : null;
  // Whether the sheet's chosen ring is drawn as an outline: only while its far edge stays clearly below P
  // on the screen. Add them up walks the piece out to rings tens of metres across, whose outlines ran
  // through P or above it -- a thick charged line through the point the lesson lifts OFF the sheet. Past
  // that, the lit wedge stands for the ring, as it does for a ring off the page.
  const ringOutlined = id !== 'sheet' || O.y - unit * Math.sin(view.pitch) * Math.abs(sample.position.x) >= P.y + 20;
  const sourceVisible = selectedOnFrame || !!wedgeAnchor;
  const source = selectedOnFrame || !wedgeAnchor ? clampToFrame(selectedPoint) : wedgeAnchor;
  // WATCH IT BUILD, AS SOMETHING YOU CAN SEE. The run's stages used to change almost nothing in
  // the picture: the first was identical to the resting view, the next two added a few thin
  // dashed lines near P under full-strength field lines, and the finished ΣΔE arrow sat on screen
  // from the first frame, so the stage that builds it had nothing to show. All that visibly
  // happened was the last stage's morph -- "it does nothing, and then it goes to the final stage".
  // So while it runs: the field steps back, the answer stays off screen until it is being built,
  // the pieces that are not being talked about fade, and the first stage actually makes the cuts.
  const building = build?.key ?? '';
  const hideAnswer = building === 'pieces' || building === 'one' || building === 'cancel';
  // The sum's own arrow, once nothing is drawn that it could be mistaken for, or be shorter than.
  const netShown = !scalar && !hideAnswer && !handOver;
  const cutAt = (t: number) => ({ '--t': t.toFixed(3) }) as CSSProperties;
  const elementSymbol = continuum>=.999 ? 'dQ' : 'ΔQ';
  const fieldSymbol = continuum>=.999 ? 'dE' : 'ΔE';
  const partnerIndex = id === 'ring' ? (selectedIndex + Math.floor(n / 2)) % n : n - 1 - selectedIndex;
  // Cut into an odd number of pieces, a ring has no piece straight across from any other: the point
  // opposite a piece's middle falls on a cut. Lighting piece i + floor(n/2) lit one 144 degrees
  // away whose sideways push does not cancel at all. So the mirror is drawn as what it is -- an arc
  // of the same length, centred straight across -- and no whole piece is lit in its place.
  const mirrorArc = id === 'ring' && n % 2 === 1;
  // A potential lesson has a mirror partner wherever its field twin does, and showing it is the
  // point: the piece that CANCELS the field's sideways push ADDS the same amount to V.
  const scalarPartner = scalar && pair && (id === 'bisector' || id === 'ring' || id === 'arc');
  // The partner piece is marked on the charge whenever its arrow is being shown.
  const partnerLit = (building === 'cancel' || pair) && (supportsPair || scalarPartner);
  // HOW FAR THE TWO SIDEWAYS PARTS HAVE CANCELLED, 0 to 1.
  //
  // Inside the run it is read off the run's own clock: the stage's first two fifths hold the pair
  // whole, the next third shrinks it into P, and the rest holds the result. It used to be a timer
  // started when the pair appeared -- a second's wait, then a second's shrink -- which ran on
  // regardless of the run: paused at the stage's start, the pair was gone two seconds later; the
  // stage's held last frame, and most of its six seconds, showed only what survives, under a caption
  // saying the parts cancel; and replaying the stage, or stepping back into it, never showed the pair
  // again, because nothing had changed to restart the timer. On the clock, a paused frame is the
  // frame the clock is at, and every way into the stage starts it whole.
  //
  // Reduced motion needs nothing of its own here: the run's clock steps in beats for it, so the pair
  // is seen whole, then at a few lengths on its way in, then gone -- stepped, never skipped.
  const cancelClock = build?.key === 'cancel' && build.clock && (build.seconds ?? 0) > 0 && supportsPair && pair ? build : null;
  // The time into the stage, for the cuts and the arrows' growth that the stylesheet draws: see `.cd-clocked`
  // in charge-diagram.css. Written straight to the root as the clock moves, never through a render.
  const runClock = build?.clock, stageStartsAt = build?.start ?? 0, runSeconds = build?.seconds ?? 0;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!runClock) { el.style.removeProperty('--cd-local'); return; }
    const write = () => el.style.setProperty('--cd-local', `${clamp(runClock.get() - stageStartsAt, 0, runSeconds > 0 ? runSeconds : Infinity).toFixed(3)}s`);
    write();
    return runClock.subscribe(write);
  }, [runClock, stageStartsAt, runSeconds]);
  const [clockT, setClockT] = useState(0);
  useLayoutEffect(() => {
    if (!cancelClock?.clock) return;
    const { clock } = cancelClock, start = cancelClock.start ?? 0, seconds = cancelClock.seconds ?? 1;
    const read = () => setClockT(cancelCurve(clamp((clock.get() - start) / seconds, 0, 1)));
    read();
    return clock.subscribe(read);
  }, [cancelClock]);
  // Outside the run -- the pair asked for by hand -- there is no clock, and a timer is the honest
  // thing: held whole for a second, so the two sideways parts can be read, equal, opposite and
  // named, and only then shrunk into P toward each other until they meet and are gone.
  const [timerT, setTimerT] = useState(0);
  const inRun = !!build;
  useEffect(() => {
    if (inRun || !supportsPair || !pair) {
      const t = requestAnimationFrame(() => setTimerT(0));
      return () => cancelAnimationFrame(t);
    }
    // Reduced motion does not skip the cancelling: both sideways parts are shown, still, for a
    // beat, and then they are gone -- otherwise the pair that cancels was never seen at all.
    if (reduced) {
      const show = requestAnimationFrame(() => setTimerT(0));
      const t = window.setTimeout(() => setTimerT(1), 1400);
      return () => { cancelAnimationFrame(show); window.clearTimeout(t); };
    }
    const show = requestAnimationFrame(() => setTimerT(0));
    const ctrl = animate(0, 1, { delay: 1, duration: 1.2, ease: [.45, 0, .3, 1], onUpdate: setTimerT });
    return () => { cancelAnimationFrame(show); ctrl.stop(); };
  }, [pair, supportsPair, reduced, id, inRun]);
  const cancelT = !supportsPair || !pair ? 0 : inRun ? (cancelClock ? clockT : 0) : timerT;
  // The exact opposite element is used for odd partitions too: symmetry is a
  // property of the source, not an artifact of whether n happens to be even.
  const partnerField = id === 'ring' ? { x: -sample.field.x, y: -sample.field.y, z: sample.field.z } : { x: sample.field.x, y: -sample.field.y, z: sample.field.z };
  const partnerPos = id === 'ring' ? project({ x: -sample.position.x, y: -sample.position.y, z: 0 }) : project(samples[partnerIndex].position);
  const keep = perspective ? { x: 0, y: 0, z: sample.field.z } : { x: sample.field.x, y: 0, z: 0 };
  const drop = perspective ? { x: sample.field.x, y: sample.field.y, z: 0 } : { x: 0, y: sample.field.y, z: 0 };
  const partnerKeep = perspective ? { x: 0, y: 0, z: partnerField.z } : { x: partnerField.x, y: 0, z: 0 };
  const partnerDrop = perspective ? { x: partnerField.x, y: partnerField.y, z: 0 } : { x: 0, y: partnerField.y, z: 0 };
  const liveDrop = fieldScreen(scaleVec(drop, 1 - cancelT), selectedGain);
  const livePartnerDrop = fieldScreen(scaleVec(partnerDrop, 1 - cancelT), selectedGain);
  const keepScreen = fieldScreen(keep, selectedGain), partnerKeepScreen = fieldScreen(partnerKeep, selectedGain);
  // The parts, in the names the derivation gives them: the component it builds survives, and the
  // other one is what a mirror piece cancels -- y along a rod or the arc's chord, the part across the
  // axis of a ring, which the board calls perpendicular.
  const keepSymbol: Sym = `${fieldSymbol}_${perspective ? 'z' : 'x'}`;
  const dropSymbol: Sym = `${fieldSymbol}_${perspective ? '\u22a5' : 'y'}`;
  const pieceSymbol: Sym = surface ? keepSymbol : fieldSymbol;
  const pairing = pair && supportsPair;
  // The mirror's surviving part, drawn on once the sideways parts have gone: see where it is drawn.
  const partnerKeepShown = pairing && components && cancelT > .5 && Math.hypot(partnerKeepScreen.x, partnerKeepScreen.y) > 2;
  // THE TERMS THE STAGE ON SCREEN IS ABOUT, which the label placer may move but never hide: in One
  // piece the piece's arrow, its distance and its charge; in What cancels the parts it is resolved
  // into, the angle that resolves it and the distance again. These are the names the board's line is
  // written in, and on a phone the placer used to hide half of them to make room.
  const stageOne = building === 'one', stageCancel = building === 'cancel';
  const dropScreen = fieldScreen(drop, selectedGain), partnerDropScreen = fieldScreen(partnerDrop, selectedGain);
  const partnerScreen = fieldScreen(partnerField, selectedGain);
  const hasDrop = Math.hypot(dropScreen.x, dropScreen.y) > 1;
  // Where the mirror's survivor starts: the tip of the piece's, or beside it at P, a few units over on the
  // mirror's side (see `stackSurvivors`).
  const partnerKeepFrom = (() => {
    if (stackSurvivors) return plus(P, keepScreen);
    const u = direction(keepScreen);
    if (!u) return P;
    const n = { x: -u.y, y: u.x }, toward = n.x * partnerScreen.x + n.y * partnerScreen.y >= 0 ? 1 : -1;
    return { x: P.x + n.x * 6 * toward, y: P.y + n.y * 6 * toward };
  })();
  const keepNamedMid = partnerKeepShown && stackSurvivors;
  // Where the piece's arrow is not resolved into parts -- a ring of a disk, the rod seen end on -- its
  // own arrow is the part that survives, and its name is the stage's term.
  const pieceTerm = stageOne || (stageCancel && !(components && hasDrop));
  // Fully drawn while they shrink, gone once they have met.
  const transverseOpacity = clamp((1 - cancelT) * 6, 0, 1);
  function eventPoint(ev: PointerEvent): Point {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return P;
    const point = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }
  function move(ev: PointerEvent) {
    if (!dragging.current) return;
    const cursor = eventPoint(ev);
    if (dragging.current === 'P') {
      // In space the axis P moves along is foreshortened by the camera, so a screen delta
      // is the wrong ruler. The cursor is dropped onto the projected axis instead: the
      // parameter of the closest point on that line is the distance, in any view.
      const base = project(pivot), tip = project({ x: pivot.x + axisDir.x, y: pivot.y + axisDir.y, z: pivot.z + axisDir.z });
      const dx = tip.x - base.x, dy = tip.y - base.y, dd = dx * dx + dy * dy;
      const alongAxis = dd > 1e-6 ? ((cursor.x - base.x) * dx + (cursor.y - base.y) * dy) / dd : p.distance;
      const distance = inSpace ? alongAxis : perspective ? depthFromScreen(O.y - cursor.y, unit, view.pitch) : id === 'semi' ? (O.y - cursor.y) / unit : id === 'axial' ? p.distance + (cursor.x - P.x) / unit : (cursor.x - O.x) / unit;
      setParams({ distance: Math.round(clamp(distance, .5, 6) * 20) / 20 });
    } else {
      // Find the nearest coordinate along the projected distribution. Endpoints
      // of unbounded domains live at the visible continuation marks.
      let best = 0, bestDistance = Infinity;
      for (let j = 0; j <= 100; j++) {
        const raw = project(world(j / 100));
        const point = { x: clamp(raw.x, 57, 650), y: clamp(raw.y, 66, 358) };
        const distance = Math.hypot(cursor.x - point.x, cursor.y - point.y);
        if (distance < bestDistance - .001 || (dragging.current === '1' && Math.abs(distance - bestDistance) < .001)) { bestDistance = distance; best = j; }
      }
      const next: [number, number] = [...boundRange];
      next[Number(dragging.current)] = best;
      onBoundRangeChange?.(next);
    }
  }
  const handle = (name: string) => ({
    // react-compiler flags the ref writes below as refs-during-render because these
    // handlers are built while rendering. They only ever run from pointer events, which
    // is exactly what a ref is for; the alternative is state that would re-render the
    // whole diagram on every pointer move.
    /* oxlint-disable react/react-compiler */
    // stopPropagation keeps a grab on P or a bound from also starting an orbit on the root.
    onPointerDown: (ev: PointerEvent<SVGGElement>) => { ev.stopPropagation(); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* no live pointer to capture: the drag still starts */ } dragging.current = name; setActiveDrag(true); },
    onPointerMove: move, onPointerUp: () => { dragging.current = null; setActiveDrag(false); }, onPointerCancel: () => { dragging.current = null; setActiveDrag(false); }, onLostPointerCapture: () => { dragging.current = null; setActiveDrag(false); },
    /* oxlint-enable react/react-compiler */
  });
  const zoomBy = (factor: number) => setZoom(z => clamp(Math.min(z, zoomCeiling) * factor, ZOOM_MIN, zoomCeiling));
  // Scroll zooms. It used to rotate, which is why turning the figure felt wrong: the one
  // gesture every 3D tool spends on getting closer was spinning the scene instead.
  // React delegates wheel to the root, where the listener is passive, so preventDefault is
  // ignored and the page scrolls as well as the figure zooming. The only way to claim the
  // gesture is a non-passive listener on the element itself.
  const wheelZoom = useRef<(ev: WheelEvent) => void>(() => {});
  // ...but only a wheel that has somewhere to zoom to. One that would push the zoom past its limit is the
  // page's: a student two-finger scrolling down the page toward the board, with the pointer over the figure,
  // had the scroll swallowed for good once the figure was as small as it goes.
  useEffect(() => { wheelZoom.current = ev => {
    if (ev.deltaY === 0) return;
    if (ev.deltaY < 0 ? zoom >= zoomCeiling - 1e-6 : zoom <= ZOOM_MIN + 1e-6) return;
    ev.preventDefault(); zoomBy(Math.exp(-ev.deltaY * .0016));
  }; });
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => wheelZoom.current(ev);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  /** One nudge of the view, shared by the on-screen pad and the arrow keys. */
  const nudge = (key: string) => { stopGlide(); commitView(keyboardCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }, key, opening)); };
  const resetView = () => { setZoom(1); glideTo(openingCamera(problem.geometry), .45); };
  /** The view keys, wherever they are pressed from. Shared by the figure and by the pad below
   * it, so a reader who has just pressed a pad button and then reaches for an arrow gets what
   * the button's own tooltip promised them rather than a scrolled page.
   *
   * Safe on the pad: `role="group"` carries no roving-focus convention -- that belongs to
   * toolbars, tablists and radio groups -- so nothing here takes arrow keys away from anyone
   * driving this by screen reader. Anything that owns its own arrows, a slider or a dragged
   * handle in the figure, is skipped. */
  const viewKeys = (ev: KeyboardEvent<Element>) => {
    if (ev.defaultPrevented || onControl(ev.target) || ev.target instanceof HTMLInputElement) return;
    // Zoom works flat as well as in space -- the pad offers it in both -- but there is nothing
    // to turn in a view that is already looking straight down the axis.
    if (['+', '=', '-', '_'].includes(ev.key)) { ev.preventDefault(); zoomBy(ev.key === '-' || ev.key === '_' ? 1 / 1.18 : 1.18); return; }
    if (ev.key === 'Home') { ev.preventDefault(); setZoom(1); if (inSpace) nudge(ev.key); return; }
    if (!inSpace || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    ev.preventDefault(); nudge(ev.key);
  };
  const onControl = (target: EventTarget | null) => target instanceof Element && !!target.closest('.cd-piece,.cd-observation,.cd-bound,.cd-cube');
  const commitView = (next: CameraView) => { yawMv.set(next.yaw); pitchMv.set(next.pitch); setCamera(next); };
  /* oxlint-disable react/react-compiler */
  // One React render per animation frame at most, however many pointer or wheel events
  // arrive in between. The motion values always hold the live view; this catches the
  // rest of the drawing up to them.
  const syncCamera = () => { if (syncId.current) return; syncId.current = requestAnimationFrame(() => { syncId.current = 0; setCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }); }); };
  // Cancelling the frame is not enough: `gliding` feeds `moving`, and `moving` is what holds
  // off the label placer and the net-arrow report. Leaving it set meant one interrupted glide
  // -- an arrow key during Reset view, or during the 2D-to-3D turn -- silently stopped the
  // labels being placed for the rest of the session, and left the 3D stage holding a frame
  // loop forever. Easy to hit now that the arrow keys reach the view from the pad as well.
  const stopGlide = () => { if (glideId.current) cancelAnimationFrame(glideId.current); glideId.current = 0; setGliding(false); };
  // Ease the camera to a view rather than cutting to it. Yaw takes the short way round.
  const glideTo = (to: CameraView, seconds: number, done?: () => void) => {
    stopGlide();
    const from = { yaw: yawMv.get(), pitch: pitchMv.get() }, turn = 2 * Math.PI;
    const dYaw = ((to.yaw - from.yaw + Math.PI) % turn + turn) % turn - Math.PI, dPitch = to.pitch - from.pitch;
    if (reduced || seconds <= 0) { commitView(to); done?.(); return; }
    setGliding(true);
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / (seconds * 1000)), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const v = { yaw: from.yaw + dYaw * e, pitch: from.pitch + dPitch * e };
      yawMv.set(v.yaw); pitchMv.set(v.pitch); setCamera(v);
      if (k < 1) glideId.current = requestAnimationFrame(step); else { glideId.current = 0; setGliding(false); done?.(); }
    };
    glideId.current = requestAnimationFrame(step);
  };
  // A flung view keeps turning and settles, the way a globe does. The velocity is the
  // pointer's over its last step; a pointer that paused before letting go flings nothing.
  const coast = () => {
    const v = spin.current, speed = Math.hypot(v.yaw, v.pitch);
    if (reduced || performance.now() - v.at > 80 || speed < .0004) { commitView({ yaw: yawMv.get(), pitch: pitchMv.get() }); return; }
    stopGlide(); setGliding(true);
    let last = performance.now(), vy = v.yaw, vp = v.pitch;
    const step = (now: number) => {
      const dt = Math.min(48, now - last); last = now;
      const next = clampCamera({ yaw: yawMv.get() + vy * dt, pitch: pitchMv.get() + vp * dt });
      const decay = Math.exp(-dt / 170); vy *= decay; vp *= decay;
      yawMv.set(next.yaw); pitchMv.set(next.pitch); setCamera(next);
      if (Math.hypot(vy, vp) > .00003) glideId.current = requestAnimationFrame(step); else { glideId.current = 0; setGliding(false); }
    };
    glideId.current = requestAnimationFrame(step);
  };
  const release = () => { if (dragging.current === 'orbit') { dragging.current = null; coast(); } setActiveDrag(false); };
  // A NEW LESSON OPENS ITS OWN WAY. The Explorer keeps this one figure mounted from lesson to
  // lesson -- remounting it would drop the WebGL context and the shared morph between lessons --
  // so the view the reader left the last lesson in used to carry straight into the next: the ring
  // opened at the rod's camera, "Reset view" lit up on arrival, and a 2D toggle or a zoom leaked
  // from one lesson into every one after it. On a change of geometry the view goes back to where
  // THIS geometry opens, unzoomed, drawn the way it is normally drawn.
  const seenGeometry = useRef(problem.geometry);
  /* oxlint-disable react-hooks/exhaustive-deps -- keyed on the lesson alone: the view helpers are
     rebuilt every render, and re-running this on each of those would pin the view in place. */
  useLayoutEffect(() => {
    if (seenGeometry.current === problem.geometry) return;
    seenGeometry.current = problem.geometry;
    stopGlide();
    commitView(openingCamera(problem.geometry));
    setZoom(1);
    setSpatial(null);
  }, [problem.geometry]);
  /* oxlint-enable react-hooks/exhaustive-deps */
  // Orbit follows the 2D/3D choice rather than the geometry. The planar lessons carry axis
  // labels and dimension brackets pinned to fixed screen coordinates, so those are withheld
  // in 3D rather than allowed to drift away from what they measure.
  // Springs would lag a 1:1 drag; motion values + frame.render write the SVG matrix without setState.
  // The figure itself takes focus, so the arrow keys and +/- reach it. This used to focus the
  // `.cd-camera-control` button instead, which is inside the `.cd-controls` disclosure -- and
  // that disclosure is CLOSED on the Explorer page (`compact`). A closed <details> keeps its
  // content INERT FOR FOCUS even where CSS has forced it visible with a real layout box, so
  // `.focus()` on it silently did nothing, focus stayed on <body>, and every arrow key went to
  // the page while the drawn legend went on promising they turned the view. Do not route the
  // figure's keyboard reach through anything that can be collapsed.
  const orbit = {
    onPointerDown: (ev: PointerEvent<SVGSVGElement>) => { if (onControl(ev.target)) return; stopGlide(); ev.currentTarget.focus(); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* no live pointer to capture: the drag still starts */ } dragging.current = 'orbit'; setActiveDrag(true); orbitFrom.current = { x: ev.clientX, y: ev.clientY }; spin.current = { yaw: 0, pitch: 0, at: performance.now() }; },
    onPointerMove: (ev: PointerEvent<SVGSVGElement>) => {
      if (dragging.current !== 'orbit') return;
      const t0 = performance.now();
      const next = orbitCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }, ev.clientX - orbitFrom.current.x, ev.clientY - orbitFrom.current.y);
      orbitFrom.current = { x: ev.clientX, y: ev.clientY };
      const now = performance.now(), dt = Math.max(1, now - spin.current.at);
      spin.current = { yaw: (next.yaw - yawMv.get()) / dt, pitch: (next.pitch - pitchMv.get()) / dt, at: now };
      yawMv.set(next.yaw); pitchMv.set(next.pitch); syncCamera();
      const paint = () => {
        plane.current?.setAttribute('transform', planeMatrix(yawMv.get(), pitchMv.get(), O, unit));
        const s = projectCamera(pWorld, yawMv.get(), pitchMv.get());
        const px = O.x + unit * s.x, py = O.y + unit * s.y;
        svg.current?.querySelectorAll('[data-orbit-p]').forEach(el => {
          if (el instanceof SVGCircleElement) { el.setAttribute('cx', String(px)); el.setAttribute('cy', String(py)); }
          else if (el instanceof SVGTextElement) { el.setAttribute('x', String(px + Number(el.dataset.dx ?? 0))); el.setAttribute('y', String(py + Number(el.dataset.dy ?? 0))); }
        });
      };
      paint();
      frame.render(paint, false, true);
      if (svg.current) svg.current.dataset.orbitMs = (performance.now() - t0).toFixed(3);
    },
    onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release,
    onKeyDown: (ev: KeyboardEvent<SVGSVGElement>) => viewKeys(ev),
  };
  /* oxlint-enable react/react-compiler */
  /** An angle at a vertex: a short arc between its two sides, and its name on the line halving it,
   * so the label sits inside the angle it names whichever way that angle happens to open. Returns the
   * drawing and the arc's points, which the label placer keeps every other name off. */
  const angleMark = (at: Point, alongA: Point, alongB: Point, name: string, term = false, sides?: { a?: number; b?: number; r0?: number; w?: number }) => {
    const a = direction(vsub(alongA, at)), b = direction(vsub(alongB, at));
    if (!a || !b) return null;
    const mid = direction({ x: a.x + b.x, y: a.y + b.y }) ?? a, sweep = a.x * b.y - a.y * b.x > 0 ? 1 : 0;
    const opening = Math.acos(clamp(a.x * b.x + a.y * b.y, -1, 1));
    // Kept whenever it is drawn: an arc with no name says there is an angle and not which one.
    const size = SYM * labelScale, keep = { 'data-keep': 'true', 'data-priority': term ? 2.5 : 1 };
    // INSIDE THE ANGLE, JUST PAST ITS ARC -- and the arc reaches out to it. It is measured as one italic
    // letter with a little of its line's ascent and descent, not the whole line box the type sits in:
    // measured by the line box, with eight units clear of each side, the bisector's thirty degrees could
    // not hold an α anywhere on a phone, and the letter went outside on a leader that ran through r_i or
    // across the rod -- read as the angle at O. Not by the bare ink either: the display serif's line runs
    // well above and below an α, and a box that tight let r_i cross the lower part of the letter's own.
    // The sides run as far as `sides` says, which for the rod's triangle is to the rod: past the rod's
    // foot the letter would stand nearer the right angle than the angle it names.
    const w = (sides?.w ?? .62) * size, h = .95 * size, margin = 3;
    const lenA = sides?.a ?? Math.hypot(alongA.x - at.x, alongA.y - at.y), lenB = sides?.b ?? Math.hypot(alongB.x - at.x, alongB.y - at.y);
    const towardB = { x: -a.y, y: a.x }, nA = towardB.x * b.x + towardB.y * b.y >= 0 ? towardB : { x: a.y, y: -a.x };
    const towardA = { x: -b.y, y: b.x }, nB = towardA.x * a.x + towardA.y * a.y >= 0 ? towardA : { x: b.y, y: -b.x };
    const fits = (c: Point) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([sx, sy]) => {
      const q = { x: c.x + sx * w / 2 - at.x, y: c.y + sy * h / 2 - at.y };
      return q.x * nA.x + q.y * nA.y >= margin && q.x * nB.x + q.y * nB.y >= margin && q.x * a.x + q.y * a.y <= lenA - margin && q.x * b.x + q.y * b.y <= lenB - margin;
    });
    // How far the letter's box reaches back toward the vertex along the halving line.
    const back = Math.abs(mid.x) * w / 2 + Math.abs(mid.y) * h / 2;
    // Out past P's halo and the arrowheads round it: drawn at nineteen pixels, the arc and its letter sat
    // on the halo's rim and under the tails of the arrows leaving P.
    const R0 = sides?.r0 ?? 34, shorter = Math.min(lenA, lenB);
    let d: number | null = null;
    for (let t = R0 + 3 + back; t <= Math.max(lenA, lenB); t += 1.5) if (fits({ x: at.x + mid.x * t, y: at.y + mid.y * t })) { d = t; break; }
    const arcAt = (R: number) => {
      const points = Array.from({ length: 9 }, (_, i) => { const t = Math.atan2(a.y, a.x) + (sweep ? 1 : -1) * opening * i / 8; return { x: at.x + R * Math.cos(t), y: at.y + R * Math.sin(t) }; });
      return { points, node: <path className="cd-angle-arc" d={`M${(at.x + a.x * R).toFixed(1)} ${(at.y + a.y * R).toFixed(1)}A${R.toFixed(1)} ${R.toFixed(1)} 0 0 ${sweep} ${(at.x + b.x * R).toFixed(1)} ${(at.y + b.y * R).toFixed(1)}`} /> };
    };
    if (d !== null) {
      // The arc is drawn out to just inside the letter, the way a narrow angle is lettered in a textbook:
      // drawn at a fixed 34 while its letter stood three times as far out, mid-triangle, the letter read
      // as naming the corner at the rod. Never past the shorter side.
      const R = Math.min(Math.max(R0, d - back - 4), Math.max(16, shorter * .85)), arc = arcAt(R);
      const c = { x: at.x + mid.x * d, y: at.y + mid.y * d };
      // Fixed: it has the one place inside its angle, worked out here, and the label placer moving it
      // was how it ended up outside the wedge. Everything else is placed round it.
      return { node: <>{arc.node}<text className="cd-angle" x={c.x.toFixed(1)} y={(c.y + .3 * size).toFixed(1)} textAnchor="middle" data-anchor="fixed" {...keep}>{name}</text></>, arc: arc.points, leader: null,
        box: { x: c.x - w / 2, y: c.y - h / 2, width: w, height: h } };
    }
    // Too narrow to hold its own letter anywhere along its sides: the letter goes just outside, past the
    // side that runs toward the charge -- the other side is r_i, whose name stands beside it -- on a short
    // leader from the middle of the arc.
    const R = Math.min(R0, Math.max(16, shorter * .85)), arc = arcAt(R);
    const away = sweep ? -1 : 1, off = { x: a.x * Math.cos(.38) - away * a.y * Math.sin(.38), y: a.y * Math.cos(.38) + away * a.x * Math.sin(.38) };
    const reachOut = R + 5 + Math.abs(off.x) * w / 2 + Math.abs(off.y) * h / 2;
    const c = { x: at.x + off.x * reachOut, y: at.y + off.y * reachOut }, from = { x: at.x + mid.x * R, y: at.y + mid.y * R };
    const box = { x: c.x - w / 2, y: c.y - h / 2, width: w, height: h }, to = nearestOnBox({ x: box.x - 1, y: box.y - 1, width: box.width + 2, height: box.height + 2 }, from);
    return { node: <>{arc.node}<line className="cd-angle-leader" x1={from.x.toFixed(1)} y1={from.y.toFixed(1)} x2={to.x.toFixed(1)} y2={to.y.toFixed(1)} /><text className="cd-angle" x={c.x.toFixed(1)} y={(c.y + .3 * size).toFixed(1)} textAnchor="middle" data-anchor="fixed" {...keep}>{name}</text></>, arc: arc.points, leader: [from, to] as [Point, Point], box };
  };
  const circlePoints = (radius: number, start = 0, end = Math.PI * 2) => Array.from({ length: 97 }, (_, i) => project({ x: radius * Math.cos(start + (end - start) * i / 96), y: radius * Math.sin(start + (end - start) * i / 96), z: 0 }));
  const radiusTip = ray({ x: 1, y: 0, z: 0 }, Math.min(surface ? sample.position.x : R, 7) * unit);
  // THE DISK'S OWN RADIUS. Its answer is written in R, and the figure lettered only s -- the radius of the
  // chosen ring, on the line from O to it -- so in Shrink them, with a handle at each end of that line, s
  // read as the disk's radius. R is its own dimension, out to the rim at another azimuth, toward the reader
  // and to the left, clear of the s line and of both axes in either view.
  const rim = id === 'disk' ? (() => {
    const tip = ray({ x: -Math.SQRT1_2, y: -Math.SQRT1_2, z: 0 }, R * unit), d = direction(vsub(tip, O));
    if (!d) return null;
    const below = d.x >= 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x }, out = below.y >= 0 ? below : { x: -below.x, y: -below.y };
    const at = (f: number, sgn: number) => besidePoint({ x: O.x + (tip.x - O.x) * f, y: O.y + (tip.y - O.y) * f }, { x: out.x * sgn, y: out.y * sgn }, 7, SYM * labelScale);
    const spot = at(.6, 1), alt = [at(.6, -1), at(.85, 1), at(.85, -1), at(.4, 1)].map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`).join(';');
    return { tip, spot, alt, mid: { x: O.x + (tip.x - O.x) * .6, y: O.y + (tip.y - O.y) * .6 } };
  })() : null;
  // A rod or ring is one object. Doubling N inserts mid-cuts on pieces that already
  // exist (stable intervalKey / seamKey), instead of remounting a newly indexed set.
  const upright = id === 'bisector' || id === 'infinite' || footed;
  const along = (pt: Point) => upright ? pt.y : pt.x;
  const rodEnds: [number, number] = id === 'bisector' ? [O.y - R * unit, O.y + R * unit] : footed ? [O.y - p.size * unit, O.y] : id === 'infinite' ? [55, 370] : id === 'axial' ? [O.x, O.x + p.size * unit] : [O.x, 640];
  const rodLow = Math.min(...rodEnds), rodHigh = Math.max(...rodEnds);
  /** Where a line from a piece of a rod toward `to` leaves the rod, a little clear of its edge. The
   * dashed lines from a piece and its partner to P began at the piece's middle, which is where its +
   * mark sits, and a charge-coloured dash through a + is a minus sign. Seen flat only: in space the
   * scene draws the rod and the marks are not painted. */
  const offRod = (from: Point, to: Point, index?: number): Point => {
    const u = direction(vsub(to, from));
    if (!rodLike || inSpace || !u) return from;
    const across = Math.abs(upright ? u.x : u.y), alongRod = Math.abs(upright ? u.y : u.x), dist = Math.hypot(to.x - from.x, to.y - from.y);
    if (across < .15) return from;
    // Out past the rod's edge...
    let t = Math.min((rodHalf + 5) / across, dist / 2);
    // ...but never past the end of the piece's own stretch of rod. A steep line leaves the rod a long way
    // along it, and started there it began beside another piece -- r_i ending at the second piece while ΔQ
    // and Δy named the first -- so it starts inside the rod instead, under the + marks, which carry rings of
    // the ground colour and are painted over it. Never on the piece's own +, though: a little clear of it.
    if (index !== undefined && alongRod > 1e-6) {
      const [lo, hi] = spanOf(index), c = along(from), half = Math.min(c - Math.max(lo, rodLow - 6), Math.min(hi, rodHigh + 6) - c);
      t = Math.min(t, Math.max(8 * labelScale, (half - 1) / alongRod));
    }
    return { x: from.x + u.x * t, y: from.y + u.y * t };
  };
  const split = partitionCount(p.slices, continuum) === n ? splitProgress(p.slices, continuum) : 0;
  const family = surface ? 'surface' : (id === 'ring' || id === 'arc') ? 'round' : 'rod';
  // How far out the disk's sum has reached: the OUTER edge of the furthest ring in it, as far as that ring
  // is in. It stopped at that ring's middle, so at the end of Add them up the shading covered nine tenths
  // of the disk -- under-reporting the charge already summed, and disagreeing with the scene.
  let fillR = sample.position.x;
  if (id === 'disk' && (mode === 'sum' || mode === 'integrate')) {
    fillR = 0;
    for (let i = 0; i < n; i++) if (Math.abs(weights[i]) > 0) fillR = Math.max(fillR, R * (i + Math.min(1, Math.abs(weights[i]))) / n);
  }
  function rodPath() {
    const x = upright ? O.x - rodHalf : rodLow, y = upright ? rodLow : O.y - rodHalf;
    const w = upright ? rodHalf * 2 : rodHigh - rodLow, h = upright ? rodHigh - rodLow : rodHalf * 2;
    const r = (id === 'bisector' || id === 'axial' || footed) ? rodHalf : 0;
    if (!r) return `M${x},${y}h${w}v${h}h${-w}z`;
    return `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}z`;
  }
  function seamStroke(t: number, grow = 1) {
    const raw = project(world(t)), g = Math.max(.08, Math.min(1, grow));
    if (rodLike) {
      const a = along(raw);
      if (a < rodLow - 4 || a > rodHigh + 4) return null;
      return upright
        ? <line x1={O.x - rodHalf * g} y1={a} x2={O.x + rodHalf * g} y2={a} />
        : <line x1={a} y1={O.y - rodHalf * g} x2={a} y2={O.y + rodHalf * g} />;
    }
    if (id === 'ring' || id === 'arc') {
      const dx = raw.x - O.x, dy = raw.y - O.y, len = Math.hypot(dx, dy) || 1, h = 8 * g;
      return <line x1={raw.x - dx / len * h} y1={raw.y - dy / len * h} x2={raw.x + dx / len * h} y2={raw.y + dy / len * h} />;
    }
    return null;
  }
  // Charge marks belong to the rod, not to the partition: their spacing is fixed so
  // the rod does not appear to gain or lose charge as N changes.
  // For the ramp the marks are placed by cumulative charge, F(y) = (y/L)², so they crowd toward the top: the marks are the charge.
  // One mark per piece, skipping pieces when they are too narrow to hold one. The marks
  // used to be laid at a fixed pixel pitch that knew nothing about where the rod is cut, so
  // shortening the rod slid them onto the divider lines. Anchoring them to piece centres
  // means a mark can never land on a cut, whatever the length or the count.
  const pieceSpan = (rodHigh - rodLow) / Math.max(1, n);
  // The marks' pitch grows with their size: on a phone they are set larger, and at the desktop pitch
  // each one's line of type ran into the next.
  const pitch = (ramp ? 26 : 19) * labelScale;
  const markStride = Math.max(1, Math.ceil(pitch / Math.max(1, pieceSpan)));
  const markCount = Math.max(0, Math.floor((rodHigh - rodLow) / pitch));
  // The ramp keeps a density-weighted placement, because crowding IS the lesson there, but
  // any mark that lands on a cut is dropped rather than drawn over it.
  const cuts = Array.from({ length: Math.max(0, n - 1) }, (_, i) => rodLow + pieceSpan * (i + 1));
  const clearOfCuts = (v: number) => cuts.every(c => Math.abs(v - c) > 5 * labelScale);
  // THE BREAK MARKS where a line that never ends is cut off by the frame: two short strokes across it,
  // a little way in from each edge -- at the edge they crowded the axis letter, the ∞ and the limit's
  // arrow into one corner.
  const breaks: [Point, Point][] = id === 'infinite'
    ? [80, 88, 348, 356].map(y => [{ x: O.x - 10, y }, { x: O.x + 10, y: y - 9 }] as [Point, Point])
    : id === 'semi' ? [0, 17].map(dx => [{ x: rodHigh - 12 + dx, y: O.y - 10 }, { x: rodHigh - 21 + dx, y: O.y + 10 }] as [Point, Point]) : [];
  // A mark under a break reads as part of it: the marks stop either side of each break.
  const clearOfBreaks = (v: number) => breaks.every(([a, b]) => { const lo = Math.min(along(a), along(b)), hi = Math.max(along(a), along(b)); return v < lo - 7 * labelScale || v > hi + 7 * labelScale; });
  // ...but never so many dropped that a piece is left with none: at a phone's size only the top two of five
  // pieces kept a +, and three of five read as uncharged -- the middle one holds five ninths of the top's.
  // A piece with no mark of its own gets one at its middle.
  const rampMarks = () => {
    const kept = Array.from({ length: markCount }, (_, k) => rodHigh - (rodHigh - rodLow) * Math.sqrt((k + .5) / markCount)).filter(clearOfCuts);
    if (continuum >= .999) return kept;
    for (let i = 0; i < n; i++) {
      const lo = rodLow + pieceSpan * i, hi = lo + pieceSpan;
      if (hi - lo >= 9 * labelScale && !kept.some(v => v > lo && v < hi)) kept.push((lo + hi) / 2);
    }
    return kept;
  };
  const chargeMarks = !rodLike ? []
    : ramp ? rampMarks()
    // An unbounded line gets its marks from the WINDOW rather than from the partition, so they
    // run evenly to both edges of the picture and keep running at the same spacing. The repetition
    // is the claim: it says the line is the same everywhere, which is what "infinite" actually
    // means here and is the one thing a truncated drawing has to get across. Tying them to the
    // five pieces instead gave three marks bunched near the middle, which says nothing.
    : fanned ? Array.from({ length: markCount }, (_, k) => rodLow + (rodHigh - rodLow) * (k + .5) / markCount).filter(v => clearOfCuts(v) && clearOfBreaks(v))
    : Array.from({ length: Math.max(1, n) }, (_, i) => rodLow + pieceSpan * (i + .5)).filter((_, i) => i % markStride === 0);
  // Which marks sit on a piece painted in the charge's own colour -- the chosen piece and its
  // mirror partner -- so they can be drawn in the ground colour there instead of vanishing into it.
  const spanOf = (i: number): [number, number] => { const a = along(project(world(i / n))), b = along(project(world((i + 1) / n))); return [Math.min(a, b), Math.max(a, b)]; };
  const filledSpans = rodLike ? [spanOf(selectedIndex), ...(partnerLit && partnerIndex !== selectedIndex ? [spanOf(partnerIndex)] : [])] : [];
  const onFill = (v: number) => filledSpans.some(([a, b]) => v > a + 1 && v < b - 1);
  // Written as the derivation beside it writes it, in the lesson's own coordinate: a reader who
  // sees ΔQ = λΔy in the panel should not find ΔQ = λΔℓ under the figure and wonder what ℓ is.
  const coordinate = id === 'axial' || id === 'semi' ? 'x' : 'y', d = continuum >= .999 ? 'd' : 'Δ';
  // Written as a symbol and what follows it, so the ramp's λ₀ is a real subscript: see SymbolText.
  // THE EQUAL-ANGLE LESSONS' PIECE, while it is a piece: what the board defines ΔQ as, the point charge at
  // the piece's middle angle -- λ r sec²θ Δθ -- not λΔy. The same symbol named two different charges, the
  // footer's infinite for the outermost piece, and a student computed λΔy. Once the pieces are gone the two
  // agree, and the limit's dQ = λ dy is written in the coordinate again.
  const standIn = UNBOUNDED.has(id) && continuum < .999;
  const sourceLabel: { symbol: Sym; tail?: string } = standIn
    ? (id === 'sheet' ? { symbol: `${elementSymbol} = σ · 2πs z sec²α Δα` } : { symbol: `${elementSymbol} = λr sec²${id === 'infinite' ? 'θ Δθ' : 'α Δα'}` })
    : surface ? { symbol: `${elementSymbol} = σ · 2πs ${d}s` } : id === 'ring' || id === 'arc' ? { symbol: `${elementSymbol} = λR ${d}θ` } : ramp ? { symbol: `${elementSymbol} = λ_0`, tail: `(y/L) ${d}y` } : { symbol: `${elementSymbol} = λ ${d}${coordinate}` };
  const sourceText = id === 'disk' ? 'One ring sweeps out the disk' : id === 'sheet' ? 'A section of a sheet that never ends · one ring is one angle at P' : surface ? 'Whole annulus · transverse fields cancel' : id === 'infinite' ? 'A section of a line that never ends · one piece is one angle at P' : id === 'semi' ? 'A section of a line with one end · one piece is one angle at P' : id === 'arc' ? 'Observation point fixed at the centre' : 'One piece at a time · the integral adds them all';
  // THE ARC'S φ, inside its own grey arc and on the far side of the axis from the run's piece -- whose angle θ
  // is marked on the near side -- half way round from that piece's mirror to the arc's end. Set just above
  // the axis, beside θ's wedge, the two letters read as a pair, φ as another name for θ; on a phone it fell
  // under the axis beside R, and read as the arc's length, Rφ.
  const arcLetters = id === 'arc' && !inSpace ? (() => {
    const ref = runPiece >= 0 ? samples[runPiece] : sample, own = Math.atan2(ref.position.y, ref.position.x);
    const side = own > 0 ? -1 : 1, half = p.phi / 2, size = SYM * labelScale;
    const at = (deg: number, f: number) => { const q = project({ x: R * f * Math.cos(deg), y: R * f * Math.sin(deg), z: 0 }); return { x: q.x, y: q.y + .3 * size, anchor: 'middle' }; };
    const a = side * (Math.abs(own) + half) / 2;
    const phi = at(a, PHI_AT - .17);
    const phiAlt = [at(a, PHI_AT - .3), at(a + side * .2, PHI_AT - .17), at(a - side * .2, PHI_AT - .17), at(a, PHI_AT - .42)].map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)} middle`).join(';');
    // On its own side of the axis, and to the right of P, where the field's arrows are not.
    const phiWithin = `${(O.x + 4).toFixed(1)} 0 1 0;0 ${(O.y - side * 2).toFixed(1)} 0 ${-side}`;
    // R further out along its radius, or nearer O, before it is moved anywhere else.
    const rAlt = [.75, .25].map(f => `${(O.x + R * unit * f).toFixed(1)} ${(O.y + 23).toFixed(1)} start`).join(';');
    return { phi, phiAlt, phiWithin, rAlt };
  })() : null;
  // Where the origin is named: beside O, clear of the charge drawn through it and of the brackets.
  const originLabel = upright ? { x: O.x - rodHalf - 6, y: O.y + 20 } : { x: O.x - 7, y: O.y + 21 };
  // The sheet's rim on the line across the screen, for the marks that say it goes on: flat view only.
  const sheetRim = (() => {
    const l = project({ x: -6.6, y: 0, z: 0 }), r = project({ x: 6.6, y: 0, z: 0 });
    return { left: { x: clamp(l.x, 62, 640), y: l.y }, right: { x: clamp(r.x, 80, 646), y: r.y } };
  })();
  // A dimension bar: a line beside what it measures with a short tick across each end.
  type Dim = { key: string; dim: string; a: Point; b: Point; path: string; name: string; label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } | null; extension?: [Point, Point]; alt?: string };
  const dimBar = (key: string, dim: string, a: Point, b: Point, name: string, side: 1 | -1, tick = 5): Dim => {
    const u = direction(vsub(b, a)) ?? { x: 1, y: 0 }, nrm = { x: -u.y, y: u.x };
    const t = (q: Point) => `M${(q.x - nrm.x * tick).toFixed(1)} ${(q.y - nrm.y * tick).toFixed(1)}L${(q.x + nrm.x * tick).toFixed(1)} ${(q.y + nrm.y * tick).toFixed(1)}`;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, out = { x: nrm.x * side, y: nrm.y * side };
    return { key, dim, a, b, path: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}${t(a)}${t(b)}`, name, label: besidePoint(mid, out, 7, SYM * labelScale) };
  };
  // THE PIECE'S OWN LENGTH, Δy. The only y the figure drew was the leg from the piece to the axis, which is
  // the coordinate; the piece's length was never marked, so a student weak on calculus took y for Δy and
  // could not see where λΔy came from. A textbook brackets the element: a short dimension along the chosen
  // piece, on the side away from P, named in the lesson's own coordinate -- dy once the pieces have gone.
  // In Cut it up and One piece, and whenever the board points at the charge element.
  const pieceLength = (() => {
    if (inSpace || !(upright || id === 'semi') || !(building === 'pieces' || building === 'one' || highlight === 'element')) return null;
    const [lo, hi] = spanOf(selectedIndex);
    if (lo < rodLow - 1 || hi > rodHigh + 1 || hi - lo < 7) return null;
    const name = `${continuum >= .999 ? 'd' : '\u0394'}${coordinate}`, size = SYM * labelScale;
    // Its letter stays on the bracket's side of the rod, past either end of the bracket if its middle is
    // taken: reflected through the bracket, which stands against the rod, it landed across the rod from
    // the bracket on a phone, beside the other side of the piece.
    const spot = (q: { x: number; y: number; anchor: string }) => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`;
    if (upright) {
      const x = O.x - rodHalf - 7;
      const alt = [besidePoint({ x, y: lo }, { x: -.45, y: -.9 }, 5, size), besidePoint({ x, y: hi }, { x: -.45, y: .9 }, 5, size)].map(spot).join(';');
      return { name, path: `M${x} ${lo.toFixed(1)}V${hi.toFixed(1)}M${x - 4} ${lo.toFixed(1)}h8M${x - 4} ${hi.toFixed(1)}h8`, label: { x: x - 7, y: (lo + hi) / 2 + .3 * size, anchor: 'end' as const }, mirror: { x, y: (lo + hi) / 2 }, ends: [{ x, y: lo }, { x, y: hi }] as [Point, Point],
        alt, within: `${(O.x - rodHalf).toFixed(1)} 0 -1 0` };
    }
    const y = O.y + rodHalf + 7;
    const alt = [besidePoint({ x: lo, y }, { x: -.9, y: .45 }, 5, size), besidePoint({ x: hi, y }, { x: .9, y: .45 }, 5, size)].map(spot).join(';');
    return { name, path: `M${lo.toFixed(1)} ${y}H${hi.toFixed(1)}M${lo.toFixed(1)} ${y - 4}v8M${hi.toFixed(1)} ${y - 4}v8`, label: { x: (lo + hi) / 2, y: y + 6 + .98 * size, anchor: 'middle' as const }, mirror: { x: (lo + hi) / 2, y }, ends: [{ x: lo, y }, { x: hi, y }] as [Point, Point],
      alt, within: `0 ${(O.y + rodHalf).toFixed(1)} 0 1` };
  })();
  // L's bracket stands further out while the piece's is drawn, so the two letters do not meet.
  const lOut = pieceLength && upright ? 22 : 0;
  const dims: Dim[] = [];
  if (id === 'bisector' || footed) {
    // L's bracket stands left of the rod; its letter sits left of the bracket and up from the x
    // axis, which runs through the bracket's middle on the bisector.
    const top = id === 'bisector' ? O.y - R * unit : O.y - p.size * unit, bottom = id === 'bisector' ? O.y + R * unit : O.y;
    const bar = dimBar('L', 'size', { x: O.x - 40 - lOut, y: top }, { x: O.x - 40 - lOut, y: bottom }, 'L', 1);
    const at = id === 'bisector' ? top + (bottom - top) * .73 : (top + bottom) / 2;
    dims.push({ ...bar, label: { x: O.x - 48 - lOut, y: at + .3 * SYM * labelScale, anchor: 'end' } });
  }
  // EVERY ARROW DRAWN FROM P, as points along it, for the bars measuring r to stay clear of: a bar
  // laid at a fixed offset put its tick under the head of a part pointing straight down from P.
  const fromP: Point[] = (() => {
    const drawn: Point[] = [];
    if (showContribution && !scalar && mode !== 'sum' && building !== 'limit') {
      drawn.push(contribution);
      if (components && hasDrop) { drawn.push(keepScreen); if (!pairing) drawn.push(dropScreen); }
      if (pairing) { drawn.push(partnerScreen); if (hasDrop) drawn.push(dropScreen, partnerDropScreen); }
    }
    // Only the one piece's arrows, which hold still within a stage: the sum's grow every frame, and a
    // bar that followed them would never settle.
    const out: Point[] = [];
    for (const v of drawn) for (let k = 0; k <= 16; k++) out.push({ x: P.x + v.x * k / 16, y: P.y + v.y * k / 16 });
    return out;
  })();
  // WHILE THE PIECE'S ARROW IS RESOLVED INTO PARTS, THE TRIANGLE'S LEG ALONG THE AXIS IS r, and is named
  // as r. The separate bar had to drop below the part pointing down from P, which put it at the mirror
  // piece's height on the bisector -- its tick in the partner's dashed ring, ΔE_y's name stranded under it
  // -- and on the footed rods stopped it short of P. The other stages keep the bar.
  // The semi-infinite line too, whose leg stands up from the rod to P: its bar had to stand left of everything
  // drawn from P, so it jumped from stage to stage and in What cancels stood far out past ΔE_x's tip, while
  // the leg that IS r went unlettered.
  const rOnLeg = !inSpace && !scalar && (id === 'bisector' || id === 'infinite' || footed || id === 'semi') && components && hasDrop && showContribution
    && building !== 'add' && building !== 'limit' && selectedOnFrame && (id === 'semi' ? O.y - P.y : P.x - O.x) >= rodHalf + 6;
  if ((id === 'bisector' || id === 'infinite' || footed) && !rOnLeg) {
    // r, from the rod to P, on a bar below the axis that stops at P rather than running into it --
    // and below anything drawn down from P over that stretch, sixteen units clear of its lowest point.
    // From the rod's edge -- or its axis, for a P closer in than the edge's tick could stand.
    const rodGap = P.x - O.x < rodHalf + 6 ? 0 : rodHalf + 3;
    const x0 = O.x + rodHalf - 3, x1 = P.x + 10;
    const low = fromP.reduce((m, q) => q.x >= x0 && q.x <= x1 ? Math.max(m, q.y) : m, -Infinity);
    const y = Math.max(O.y + 36, low + 16);
    if (y + 9 + 1.37 * SYM * labelScale <= FOOTER_BAND) dims.push(dimBar('r', 'distance', { x: O.x + rodGap, y }, { x: P.x, y }, 'r', 1));
    else {
      // No room below them -- P low in the frame, as level with a rod's end: the bar stays where it was
      // and stops short of whatever comes down from P, its last stretch a thin extension line under it.
      const at = O.y + 36, end = { x: P.x - 10, y: at };
      dims.push({ ...dimBar('r', 'distance', { x: O.x + rodGap, y: at }, end, 'r', 1), extension: [end, { x: P.x, y: at }] });
    }
  }
  if (id === 'axial') {
    // L and a on one baseline under the axis, each with its own bar and ticks.
    dims.push(dimBar('L', 'size', { x: O.x, y: O.y + 34 }, { x: O.x + p.size * unit, y: O.y + 34 }, 'L', 1));
    dims.push(dimBar('a', 'distance', { x: O.x + p.size * unit, y: O.y + 34 }, { x: P.x, y: O.y + 34 }, 'a', 1));
  }
  if (id === 'semi' && !rOnLeg) {
    // Left of P's line, at one place in every stage. It used to stand left of whatever was drawn from P across
    // that stretch, and so moved with every stage's arrows; the one stage whose arrow lies across it -- What
    // cancels, ΔE_x along the level of P -- letters the leg r instead.
    const x = O.x - 40;
    dims.push(dimBar('r', 'distance', { x, y: O.y }, { x, y: P.y }, 'r', -1));
  }
  if (perspective && !inSpace) dims.push(dimBar('z', 'distance', { x: O.x - 30, y: O.y }, { x: O.x - 30, y: P.y }, 'z', -1));
  if (perspective && inSpace) {
    // In space the bar would cross an axis on either side, so z is a letter alone: beside the axis,
    // between P and where the plane's far edge crosses it, clear of both.
    const outline = id === 'sheet' ? [] : circlePoints(R).filter(q => q.y < O.y - 2);
    const crossing = outline.reduce((best, q) => Math.abs(q.x - O.x) < Math.abs(best.x - O.x) ? q : best, { x: Infinity, y: O.y });
    const lowY = Number.isFinite(crossing.x) && crossing.y > P.y + 30 ? crossing.y : O.y;
    const y = (P.y + 14 + lowY - 4) / 2;
    // Higher or lower along the same stretch, on either side, before it would need a leader: anywhere
    // beside the axis between P and the plane names the same height -- and so does the stretch inside
    // the ring, from its far edge down to O, where the lines from P to the piece and its partner have
    // already spread apart. Between P and the far edge they leave the axis no room at all on a ring.
    const at = (y: number) => (y + .3 * SYM * labelScale).toFixed(1);
    // Close to the axis, too: the two lines from P spread from it, and the nearer the axis the longer
    // the stretch between them that a letter fits in.
    const stops = [.3, .5, .7].map(f => P.y + 14 + (lowY - 4 - P.y - 14) * f).concat(O.y - lowY > 34 ? [(lowY + O.y) / 2] : []);
    const alt = stops.flatMap(y => [`${O.x + 6} ${at(y)} start`, `${O.x - 6} ${at(y)} end`]).join(';');
    dims.push({ key: 'z', dim: 'distance', a: { x: O.x, y: lowY }, b: { x: O.x, y: P.y }, path: '', name: 'z', label: { x: O.x + 6, y: y + .3 * SYM * labelScale, anchor: 'start' }, alt });
  }
  // The potential's column: every piece's contribution stacked, beside P on the side the charge is not.
  const gauge = scalar ? (() => {
    // Clear of the axis P sits on by more than the width of a label, so the column reads as standing
    // beside P rather than along the axis.
    const w = 12, leftSide = id === 'arc', gap = 28, x = leftSide ? P.x - gap - w : P.x + gap, fine = n > 64;
    // HOW TALL. At most 88 units, and ALWAYS the way the potential's sign points: the direction is the
    // column's only sign, since ΔV, ΣΔV and V carry none, and a column for a positive V that stood
    // below P where the room above was short was drawn exactly as a negative one is. Never out of the
    // plot, either: in space P can sit high in the frame, and the column climbed over the frame's top.
    // So it is scaled to the room there is that way, and where that is short its name moves in beside
    // the column's far end, handing the column the room the name would have taken past it.
    const labelRoom = 1.37 * SYM * labelScale + 10;
    const natural = (vExact || vNow || samples[0]?.potential || 1) >= 0 ? 1 : -1;
    const roomNamed = natural > 0 ? P.y - 54 - labelRoom : 371 - P.y - labelRoom;
    // Beside the far end, the name is centred on it: the column stops short of the plot's edge by half the
    // name's height.
    const beside = roomNamed < 40, roomBare = (natural > 0 ? P.y - 54 : 371 - P.y) - .7 * SYM * labelScale - 2;
    const perVolt = clamp(beside ? roomBare : roomNamed, 16, 88) / vScale;
    let at = 0;
    const slots = samples.map((s, i) => { const h = s.potential * perVolt; const slot = { i, lo: at, hi: at + h }; at += h; return slot; });
    let got = 0;
    // At rest, outside the run, the column is the whole sum, filled: five near-empty slots with one faint
    // tint read as "the potential at P is about nothing". The run fills it piece by piece in Add them up.
    const filling = summing || !build;
    const filled = filling ? samples.map((s, i) => { const h = s.potential * perVolt * (weights[i] ?? 0); const slot = { i, lo: got, hi: got + h }; got += h; return slot; }).filter(sl => Math.abs(sl.hi - sl.lo) > .02) : [];
    const box = (lo: number, hi: number) => ({ y: Math.min(P.y - lo, P.y - hi), height: Math.max(.6, Math.abs(hi - lo)) });
    const lit = new Set<number>([selectedIndex, ...(scalarPartner && !mirrorArc ? [partnerIndex] : [])]);
    // ONE PIECE, AND ITS MIRROR, ON THE PILE. In the run's second and third stages the lit blocks are
    // stacked from the rule at P -- the piece, then its mirror straight on top of it -- with nothing
    // under them: "both go on the pile", drawn. They used to be lit where each would eventually sit in
    // the finished column, which put the piece and its mirror at opposite ends with a gap between,
    // floating over a column too faint to see.
    const stacked = !!build && (building === 'one' || building === 'cancel') && !fine;
    let litRuns: { key: string; lo: number; hi: number }[];
    if (stacked) {
      const own = slots[selectedIndex].hi - slots[selectedIndex].lo;
      litRuns = [{ key: String(selectedIndex), lo: 0, hi: own }];
      if (scalarPartner && mirrorArc) {
        // A ring cut an odd number of ways has no piece straight across: its mirror is half of one
        // piece and half of the next -- as tall together as the chosen piece, every bit of a ring
        // being the same distance from P -- and the two halves go on the pile as one block.
        const j = (selectedIndex + Math.floor(n / 2)) % n, k = (j + 1) % n;
        litRuns.push({ key: 'mirror', lo: own, hi: own + (slots[j].hi - slots[j].lo) / 2 + (slots[k].hi - slots[k].lo) / 2 });
      } else if (scalarPartner && partnerIndex !== selectedIndex) litRuns.push({ key: String(partnerIndex), lo: own, hi: own + slots[partnerIndex].hi - slots[partnerIndex].lo });
    } else {
      litRuns = [...lit].filter(i => slots[i]).map(i => ({ key: String(i), lo: slots[i].lo, hi: slots[i].hi }));
      // A ring cut an odd number of ways has no piece straight across: its mirror is the second half
      // of one piece and the first half of the next, which in the column are the top half of one slot
      // and the bottom half of the one above it -- one run, as tall as the chosen piece's own slot,
      // because every bit of a ring is the same distance from P. Leaving it unlit said "both go on the
      // pile" over a column with one piece lit.
      if (scalarPartner && mirrorArc && !fine) {
        const j = (selectedIndex + Math.floor(n / 2)) % n, k = (j + 1) % n;
        const mid = (i: number) => (slots[i].lo + slots[i].hi) / 2;
        if (k > j) litRuns.push({ key: 'mirror', lo: mid(j), hi: mid(k) });
        else litRuns.push({ key: 'mirror', lo: mid(j), hi: slots[j].hi }, { key: 'mirror-wrap', lo: slots[k].lo, hi: mid(k) });
      }
    }
    const top = stacked ? litRuns[litRuns.length - 1].hi : summing ? got : at;
    // What the column is, named as the stage has it: one piece's ΔV, then that and its mirror's, then
    // the sum, then -- once the pieces are gone -- V.
    const name = finished ? 'V' : stacked ? (litRuns.length > 1 ? '\u0394V + \u0394V' : '\u0394V') : '\u03a3 \u0394V';
    const extent = stacked ? Math.abs(top) : Math.max(Math.abs(at), Math.abs(got));
    return { w, x, leftSide, fine, slots, filled, filling, box, lit, litRuns, at, got, top, up: top >= 0, stacked, name, extent, beside };
  })() : null;
  // WHAT SCALE THE FIGURE IS AT, said in its corner. In One piece and What cancels the run's piece is
  // drawn at its own scale -- on the bisector longer than the whole sum at rest -- and Add them up shrinks
  // it to its true length in under a second: a reader who paused or stepped never learned the first arrow
  // was enlarged. So the corner says so, in words, while it is.
  const scaleNote = (() => {
    if (continuum >= .999) return 'In the limit';
    if (handingOver) return 'Cut into pieces \u00b7 back to scale';
    if (build && !scalar && (building === 'one' || building === 'cancel') && showContribution) {
      const g = runGain(sample.field);
      if (g > 1.25) return 'One piece, drawn larger';
      if (g < .8) return 'One piece, drawn smaller';
    }
    return 'Cut into pieces';
  })();
  // WHERE P IS NAMED. Beside the dot, on whichever side nothing else at P is using: not toward the
  // charge, not along the field's arrow or a piece's, not along the construction line, and not along
  // the axis P sits on -- which for a ring or a disk seen in space is straight down onto the plane.
  // Among the directions left, the one furthest from all of those, leaning to the upper left.
  const haloR = building ? 9 : 16;
  const drawingPiece = showContribution && !scalar && mode !== 'sum' && building !== 'limit';
  const pDirections = (() => {
    const busy: Point[] = [];
    const add = (v: Point | null | undefined) => { const u = v ? direction(v) : null; if (u) busy.push(u); };
    add(toCharge);
    if (netShown) add(net);
    if (drawingPiece) {
      add(contribution);
      if (pairing) { add(partnerScreen); if (hasDrop) { add(dropScreen); add(partnerDropScreen); } }
      else if (components && hasDrop) add(dropScreen);
    }
    if (showContribution && building !== 'limit' && selectedOnFrame) add(vsub(selectedPoint, P));
    if ((pairing && showContribution) || scalarPartner) add(vsub(partnerPos, P));
    if (chainPoints.length > 1) { add(vsub(chainPoints[1], P)); add(vsub(chainPoints[chainPoints.length - 1], P)); }
    const through: Vec[] = id === 'arc' ? [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }] : [perspective ? { x: 0, y: 0, z: 1 } : id === 'semi' ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }];
    for (const v of through) { const d = vsub(project(v), project(zero)); add(d); add({ x: -d.x, y: -d.y }); }
    // ...and the column itself, beside P and up or down from it: P = O set by the column on the arc stood
    // between the column's name and its blocks.
    if (gauge) { add({ x: gauge.leftSide ? -1 : 1, y: 0 }); add({ x: gauge.leftSide ? -1 : 1, y: gauge.up ? -1 : 1 }); add({ x: 0, y: gauge.up ? -1 : 1 }); }
    // The bars beneath P and beside it.
    if (!inSpace && (id === 'bisector' || id === 'infinite' || footed || id === 'axial')) add({ x: 0, y: 1 });
    if (!inSpace && perspective) add({ x: -1, y: 0 });
    // Up-left first, then the other diagonals, then the sides: the order a hand would letter a point.
    //
    // ABOVE P, AND ONLY ABOVE, over a ring, a disk or a sheet seen in space. Below P is down the axis
    // onto the plane, and a P lettered there -- or reflected there by the label placer, when its own
    // corner was taken -- reads as a point lying in the ring, next to the ring's own letters.
    // The arc's P is its centre, O, where every arrow starts: up-left, clear of the angle's arc and the
    // radius, both drawn on the right.
    const upper = perspective && inSpace;
    // A potential's arc has its column there instead, up from P on the left: P = O goes below it, not between
    // the column and its name.
    const order = id === 'arc' ? (scalar ? [-135, -112.5, -157.5, -90, 135, 112.5, 157.5] : [-135, -112.5, -157.5, -90]) : upper ? [-135, -45, -112.5, -67.5, -157.5, -22.5, -90] : [-135, -45, 180, 0, 135, 45, -90, 90, -157.5, -112.5, -67.5, -22.5, 157.5, 112.5, 67.5, 22.5];
    const scored = order.map((deg, rank) => {
      const u = { x: Math.cos(deg * Math.PI / 180), y: Math.sin(deg * Math.PI / 180) };
      const clear = busy.reduce((m, b) => Math.min(m, Math.acos(clamp(u.x * b.x + u.y * b.y, -1, 1))), Math.PI);
      return { u, score: clear - rank * .004 };
    }).sort((a, b) => b.score - a.score);
    return { scored, upper };
  })();
  // Where else the element's name may go, if its own corner is taken: the other corner on the same
  // side first, then the far side of the piece -- where a rod has its length bracket, which a leader
  // would have to cross.
  const tagAlternates = (() => {
    const side = source.x > 560 ? -1 : 1, up = source.y < 95 ? 27 : -21, down = source.y < 95 ? -21 : 30;
    const at = (sx: number, dy: number) => `${(source.x + sx * 27).toFixed(1)} ${(source.y + dy).toFixed(1)} ${sx > 0 ? 'start' : 'end'}`;
    return [at(side, down), at(-side, up), at(-side, down)].join(';');
  })();
  // On a rod, the tag stays level with its own piece, give or take a piece's length and its own height:
  // pushed further along the rod, on a phone, it stood beside the fourth piece of five on a five-pixel stub
  // of a line, and named that piece.
  const tagWithin = rodLike && selectedOnFrame && !inSpace ? (() => {
    const band = pieceSpan / 2 + 30 * labelScale, c = upright ? source.y : source.x;
    return upright ? `0 ${(c - band).toFixed(1)} 0 1;0 ${(c + band).toFixed(1)} 0 -1` : `${(c - band).toFixed(1)} 0 1 0;${(c + band).toFixed(1)} 0 -1 0`;
  })() : undefined;
  // THE LIMITS' HANDLES, worked out here so the label placer knows where they are.
  const boundNames = problem.boundTex.map(plainBound) as [string, string];
  const onPage = (q: Point) => q.x >= 57 && q.x <= 650 && q.y >= 66 && q.y <= 358;
  const bounds = (() => {
    type Handle = { key: string; handle: string; at: Point; edge: string | null; name: string; label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }; alt?: string };
    if (mode !== 'integrate' || !onBoundRangeChange) return [] as Handle[];
    const ends = [0, 1].map(i => ({ i, t: boundRange[i] / 100, raw: project(world(boundRange[i] / 100)), whole: boundRange[i] === (i ? 100 : 0) }));
    // Named only where nothing else already names that end: a rod's ends carry their own marks (±L/2,
    // y = L, x = L), a line's run off as ±∞, and the centre of a disk is O. A ring's and an arc's ends
    // are angles nothing else names, and the sheet's edge is the edge of the page.
    // The ramp's ends carry its density, λ = λ₀ and λ = 0, not its coordinate: its limits are named in y.
    // And the sheet's outer end is named only in space: flat, "s → ∞" already names it, and a second ∞
    // beside the first crowded the corner.
    // The disk's ends are named too: its centre's O is the origin, not a limit, and at the limit the two
    // handles stood unnamed either side of the s line, which then read as the disk's own radius. Where the
    // bare value would read as one more mark -- the arc's φ/2 beside its φ, the disk's R beside its radius,
    // the ramp's L -- the limit is written as a value of the variable it limits, as the ring's is.
    const naming = id === 'ring' || id === 'arc' || id === 'sheet' || ramp || id === 'disk';
    const prefixed = ramp || id === 'arc' || id === 'disk';
    const named = (i: number) => naming && ends[i].whole && !(id === 'sheet' && (i === 0 || !inSpace)) ? (prefixed ? `${plainBound(problem.variableTex)} = ${boundNames[i]}` : boundNames[i]) : '';
    // A closed ring at its full range: its two limits are one point, so one handle -- named for both
    // limits as values of the angle, "θ = 0, 2π". Written "0 = 2π" it read as an equation, and a false one.
    if (id === 'ring' && ends[0].whole && ends[1].whole) {
      const at = ends[1].raw, out = direction(vsub(at, O)) ?? { x: 0, y: 1 };
      return [{ key: 'closed', handle: '1', at, edge: null, name: `${plainBound(problem.variableTex)} = ${boundNames[0]}, ${boundNames[1]}`, label: besidePoint(at, out, 14, SYM * labelScale) }];
    }
    const tangent = (t: number) => direction(vsub(project(world(clamp(t + .003, 0, 1))), project(world(clamp(t - .003, 0, 1))))) ?? { x: 1, y: 0 };
    const out: Handle[] = [];
    for (const e of ends) {
      if (onPage(e.raw)) {
        const tan = tangent(e.t), outward = e.i ? tan : { x: -tan.x, y: -tan.y };
        const along = besidePoint(e.raw, outward, 13, SYM * labelScale);
        // A rod standing on its foot has its ends' names to the side, out away from the axis: along the rod
        // they stood on the y axis' letter above the top and on the axis below O, the placer hid both, and
        // the stage that sets the limits left them unnamed.
        const label = footed && !inSpace ? besidePoint(e.raw, { x: 1, y: 0 }, 13, SYM * labelScale) : along;
        out.push({ key: e.i ? 'upper' : 'lower', handle: String(e.i), at: e.raw, edge: null, name: named(e.i), label, alt: label === along ? undefined : `${along.x.toFixed(1)} ${along.y.toFixed(1)} ${along.anchor}` });
        continue;
      }
      // Off the page: walk in from the other limit to where the charge leaves the frame on its way
      // here, and put an arrow on the frame's edge pointing on toward it.
      const from = ends[1 - e.i].t;
      let lastIn: Point | null = null, firstOut: Point | null = null;
      for (let k = 0; k <= 240; k++) {
        const q = project(world(from + (e.t - from) * k / 240));
        if (onPage(q)) { lastIn = q; firstOut = null; } else if (lastIn && !firstOut) firstOut = q;
      }
      if (!lastIn || !firstOut) continue;
      const dir = direction(vsub(firstOut, lastIn));
      if (!dir) continue;
      const tip = rayToEdge(lastIn, dir, { x: 57, y: 66, width: 593, height: 292 });
      const n = { x: -dir.y, y: dir.x }, inward = n.x * (360 - tip.x) + n.y * (215 - tip.y) >= 0 ? n : { x: -n.x, y: -n.y };
      // On a line that never ends, the arrow stands a little to one side of the line -- away from the ∞
      // that names that end -- rather than on top of the break marks and the name.
      // The sheet's, seen flat, stands above its x axis and well in from the edge: on the axis, or just
      // over it beside the axis' letter, it read as the axis' own arrowhead.
      const aside = id === 'infinite' ? { x: 22, y: 0 } : id === 'semi' ? { x: 0, y: 20 } : id === 'sheet' && !inSpace ? { x: -34, y: -18 } : { x: 0, y: 0 };
      tip.x += aside.x; tip.y += aside.y;
      const base = { x: tip.x - dir.x * 12, y: tip.y - dir.y * 12 };
      const edge = `M${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${(base.x + n.x * 6).toFixed(1)} ${(base.y + n.y * 6).toFixed(1)}L${(base.x - n.x * 6).toFixed(1)} ${(base.y - n.y * 6).toFixed(1)}Z`;
      out.push({ key: e.i ? 'upper' : 'lower', handle: String(e.i), at: tip, edge, name: named(e.i), label: besidePoint({ x: tip.x - dir.x * 8, y: tip.y - dir.y * 8 }, inward, 12, SYM * labelScale) });
    }
    return out;
  })();
  // THE RIGHT TRIANGLE THE DISTANCE AND THE ANGLE ARE READ OFF, worked out here so the labels can be
  // kept off its legs. Drawn in screen space, so it is only true in the flat view -- in 3D its corner
  // and its angle are wherever the screen puts them, not where the geometry does -- and only for a
  // piece that is itself on the page: an off-page piece's triangle drawn to its wedge would label legs
  // that are not its y or x at all. A ring, a disk or a sheet has a schematic triangle instead.
  //
  // A potential has a distance and no angle: its lessons get the triangle's distance -- r_i, and the y
  // it is worked out from -- in One piece and whenever the board points at the distance, never the
  // angle, which a number with no direction does not need.
  //
  // A rod or a line turned into space keeps one thing of its triangle: the name of the distance, beside
  // the line from the piece to P. That line is a true segment in any view -- the middle of what is drawn
  // is the drawing of its middle -- where the right angle and the angle at P are only true seen flat.
  // The rod seen along its axis has no such line (it lies along the rod), and the arc names no r_i.
  const triangleShown = showContribution && building !== 'add' && building !== 'limit'
    && (!scalar || building === 'one' || highlight === 'distance')
    && (perspective || (selectedOnFrame && (!inSpace || (id !== 'axial' && id !== 'arc'))));
  const termSize = SYM * labelScale;
  // The distance's name is the term while a stage is about it, and whenever the board points at it.
  const distanceTerm = stageOne || stageCancel || highlight === 'distance';
  const termAttrs = (term: boolean) => term ? { 'data-keep': 'true', 'data-priority': 2 } : {};
  const triangle = (() => {
    if (!triangleShown) return null;
    if (perspective) {
      // The schematic, top right: z up its left side, R or s along its foot, r_i its slope. Each letter
      // is set beside the middle of its own leg, outside the triangle, so none of them sits on a line.
      // It grows with the labels on a phone: at the desktop's size its four letters, set half as large
      // again, had no room round it, and α -- which has to go inside, at the top -- fell out of the
      // bottom of it and stood beside the z leg instead, naming the wrong thing.
      const k = labelScale, top = { x: 619 - 81 * k, y: 73 }, corner = { x: 619 - 81 * k, y: 73 + 62 * k }, end = { x: 619, y: 73 + 62 * k };
      const zSpot = besidePoint({ x: corner.x, y: (top.y + corner.y) / 2 }, { x: -1, y: 0 }, 7, termSize);
      const baseSpot = besidePoint({ x: (corner.x + end.x) / 2, y: corner.y }, { x: 0, y: 1 }, 6, termSize);
      const slope = direction({ x: end.y - top.y, y: -(end.x - top.x) }) ?? { x: .6, y: -.8 };
      const riSpot = besidePoint({ x: (top.x + end.x) / 2, y: (top.y + end.y) / 2 }, slope, 7, termSize, .52);
      return { kind: 'schematic' as const, legs: [[top, corner], [corner, end], [top, end]] as [Point, Point][], arc: [] as Point[], zSpot, baseSpot, riSpot, top, corner, end };
    }
    if (inSpace) {
      // Above the line to P, and below it if that side is taken: either side names the same segment.
      const hyp = { x: (source.x + P.x) / 2, y: (source.y + P.y) / 2 }, along = direction(vsub(P, source)) ?? { x: 1, y: 0 };
      const normal = along.x >= 0 ? { x: along.y, y: -along.x } : { x: -along.y, y: along.x };
      return { kind: 'slope' as const, legs: [] as [Point, Point][], arc: [] as Point[], hyp, riSpot: besidePoint(hyp, normal, 7, termSize, .52) };
    }
    if (id === 'arc') {
      if (scalar) return null;
      const mark = scalar ? null : angleMark(P, { x: Math.min(656, P.x + R * unit), y: P.y }, selectedPoint, 'θ', stageCancel);
      const hyp = { x: (P.x + selectedPoint.x) / 2, y: (P.y + selectedPoint.y) / 2 }, d = direction(vsub(selectedPoint, P));
      const away = d ? (-d.y < 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x }) : null;
      const riSpot = away ? besidePoint(hyp, away, 7, termSize, .52) : null;
      return { kind: 'arc' as const, legs: [[P, selectedPoint]] as [Point, Point][], arc: mark?.arc ?? [], mark, hyp, riSpot };
    }
    if (id === 'axial') {
      // On the rod seen along its axis the distance from a piece to P runs ALONG the rod, so a dashed
      // line from one to the other lay right over the rod's remaining pieces and turned their + marks
      // into minus signs. It is a dimension instead, just above the rod: from the piece to P.
      const y = O.y - rodHalf - 14, a = { x: source.x, y }, b = { x: P.x, y };
      return { kind: 'axial' as const, legs: [[a, b]] as [Point, Point][], arc: [] as Point[], a, b };
    }
    // The rods and the lines. The right angle is at the foot of the perpendicular from P to the charge;
    // the angle the board takes the cosine or sine of is at P, between that perpendicular and the line
    // to the piece -- marked there with an arc and named as the board names it: θ where it is the
    // infinite line's own variable, α everywhere else.
    //
    // The leg along the charge is drawn BESIDE it, on P's side, not down its middle: drawn on the rod's
    // own axis it ran through every + on the way and turned each one into a minus sign.
    //
    // P CLOSE IN. The leg stands a fixed twelve units off the rod's axis, so with P nearer than that -- a
    // long rod and P half a metre out -- the foot fell PAST P: the arc's first side pointed away from the
    // rod and marked 180° − α, and the square and the leg stood on the wrong side of P. The angle's first
    // side is the true perpendicular toward the charge now, whatever the leg does; the leg comes in to
    // stay short of P, and where there is no room for it at all it is left out.
    const flat = id === 'semi';
    const side = flat ? (Math.sign(P.y - O.y) || -1) : (Math.sign(P.x - O.x) || 1);
    const reach = flat ? Math.abs(P.y - O.y) : Math.abs(P.x - O.x), hasLeg = reach >= rodHalf + 6, off = Math.min(rodHalf + 5, reach - 4);
    const foot = flat ? { x: P.x, y: O.y + side * off } : { x: O.x + side * off, y: P.y };
    const towardCharge = flat ? { x: P.x, y: P.y - side * 40 } : { x: P.x - side * 40, y: P.y };
    // THE LEG IS THE PIECE'S COORDINATE: it runs from P's level to the piece's own, with a short extension line
    // across to the piece, the way a drawing dimensions a point. It used to stop where the line from the piece
    // met it, which for a steep line was well short -- the y drawn as eight or nine tenths of the piece's y,
    // less on a long rod with P close in.
    const met = offRod(source, P, selectedIndex);
    const start = flat ? { x: source.x, y: foot.y } : { x: foot.x, y: source.y };
    const extension: [Point, Point] = flat ? [start, { x: source.x, y: O.y + side * rodHalf }] : [start, { x: O.x + side * rodHalf, y: source.y }];
    const legLength = hasLeg ? Math.hypot(foot.x - start.x, foot.y - start.y) : 0;
    const toP = direction(vsub(P, foot)), toStart = direction(vsub(start, foot));
    const square = hasLeg && toP && toStart && legLength > 12 ? `M${(foot.x + toP.x * 8).toFixed(1)} ${(foot.y + toP.y * 8).toFixed(1)}L${(foot.x + toP.x * 8 + toStart.x * 8).toFixed(1)} ${(foot.y + toP.y * 8 + toStart.y * 8).toFixed(1)}L${(foot.x + toStart.x * 8).toFixed(1)} ${(foot.y + toStart.y * 8).toFixed(1)}` : '';
    // r_i beside the middle of the slope, on the side away from the right angle.
    const hyp = { x: (source.x + P.x) / 2, y: (source.y + P.y) / 2 }, along = direction(vsub(P, source)) ?? { x: 1, y: 0 };
    let normal = { x: -along.y, y: along.x };
    if (normal.x * (foot.x - hyp.x) + normal.y * (foot.y - hyp.y) > 0) normal = { x: -normal.x, y: -normal.y };
    const riSpot = besidePoint(hyp, normal, 7, termSize, .52);
    // The leg's own letter, beside its middle inside the triangle; failing that, across the charge.
    const legMid = { x: (start.x + foot.x) / 2, y: (start.y + foot.y) / 2 };
    const legSpot = besidePoint(legMid, flat ? { x: 0, y: side } : { x: side, y: 0 }, 6, termSize);
    // Failing that, further along its own leg, a quarter and three quarters of the way, still inside the
    // triangle -- and never across the rod: there, with the + marks between, it named the rod's far side.
    const legAt = (f: number) => besidePoint({ x: start.x + (foot.x - start.x) * f, y: start.y + (foot.y - start.y) * f }, flat ? { x: 0, y: side } : { x: side, y: 0 }, 6, termSize);
    const legAlt = [legAt(.25), legAt(.75)].map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`).join(';');
    const legWithin = flat ? `0 ${(O.y + side * rodHalf).toFixed(1)} 0 ${side}` : `${(O.x + side * rodHalf).toFixed(1)} 0 ${side} 0`;
    // Its sides run to the leg, and along r_i to where the line to the piece starts.
    // Its first side runs all the way to the rod's axis, which is where the angle is measured from. Shorter,
    // the angle's letter could not stand inside it once P was within a metre or so, and went under the axis
    // on a leader beside O, where it read as an angle at O. With a positive charge nothing is drawn inside the
    // angle -- the arrows leave P the other way -- so its arc may stand closer in to P as well.
    const mark = scalar ? null : angleMark(P, towardCharge, source, id === 'infinite' ? 'θ' : 'α', stageCancel, { a: reach, b: Math.hypot(met.x - P.x, met.y - P.y), r0: p.charge > 0 ? Math.max(16, Math.min(34, .4 * reach)) : 34 });
    // r on the leg from the foot to P, below it -- the far side from the angle -- when it replaces the bar.
    // A little nearer the rod than the middle: nearer P, the mirror piece's line to P has closed in under
    // the leg, and the angle's letter stands over it.
    const at = (f: number) => ({ x: foot.x + (P.x - foot.x) * f, y: foot.y + (P.y - foot.y) * f }), under = flat ? { x: -1, y: 0 } : { x: 0, y: 1 };
    const baseMid = at(.5), rSpot = besidePoint(at(.38), under, 6, termSize);
    const rAlt = [.25, .55].map(f => besidePoint(at(f), under, 6, termSize)).map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`).join(';');
    return { kind: 'rod' as const, legs: (hasLeg ? [[start, foot], [foot, P]] : []) as [Point, Point][], arc: mark?.arc ?? [], mark, flat, foot, start, extension, square, riSpot, hyp, legMid, legSpot, legAlt, legWithin, legLength, hasLeg, baseMid, rSpot, rAlt };
  })();
  // THE PIECE'S ANGLE, Δθ, where the lesson is cut by angle and the angle is what is integrated: across the
  // chosen wedge at P on the lines that never end, as Cut it up makes the cuts -- "one piece is one angle",
  // and the board writes the piece's charge in Δθ -- and across the chosen piece at the arc's centre as it is
  // cut, where the footer and the board write λR Δθ. Nothing on the figure named the variable
  // being integrated over. After Cut it up the lines' wedge has θ itself at P, and the triangle, to carry; on
  // the arc, the line to the piece's middle -- r_i -- halves the piece's angle and would run through its letter.
  const pieceAngle = (() => {
    if (inSpace || continuum >= .999) return null;
    const lines = fanned && id !== 'sheet' && building === 'pieces' && !!selectedWedge, arc = id === 'arc' && building === 'pieces';
    if (!lines && !arc) return null;
    const a = project(world(selectedIndex / n)), b = project(world((selectedIndex + 1) / n));
    const name = `${continuum >= .999 ? 'd' : '\u0394'}${id === 'semi' ? 'α' : 'θ'}`;
    const mark = angleMark(P, a, b, name, false, { r0: arc ? Math.max(34, .45 * R * unit) : 58, w: 1.3 });
    return mark ? { ...mark, rays: arc ? [a, b] : [] } : null;
  })();
  // On the infinite line the triangle's leg is lettered y right under the axis' own y, inside the top wedge
  // beside ΔQ: two y's a few lines apart, naming the same coordinate. While the leg's is drawn -- it is the
  // one the board writes -- the axis' gives way; and while the piece's Δy is, which put the axis' y between
  // Δy and ΔQ ("Δy y ΔQ"). The semi-infinite line's x does the same for its leg's x.
  const legLettered = triangle?.kind === 'rod' && triangle.legLength > 14;
  // WHAT LABELS MUST NOT SIT ON, beyond each other: the charge, every arrow, the chain, the axes, P
  // and the potential's column. A stroke is covered by small squares along it rather than by its
  // bounding box, which for a ring is the whole inside of the ring and for a slanted arrow a quadrant.
  const FRAME_BOX: Box = { x: 0, y: 0, width: 720, height: 430 };
  const obstacleBoxes: Box[] = [];
  // ...and the construction's lines as lines, for the rule that no name is set across one: see `lines` in
  // labels.ts.
  const constructionLines: Segment[] = [];
  {
    // Squares as far apart as they are wide, so they abut: eight apart, a four-unit stroke left gaps half
    // its length between its squares, and the corner of a name could stand in one with the line through it --
    // P = O across the mirror's line to P, on a phone, with Linux's metrics.
    const seg = (a: Point, b: Point, w: number) => { segmentBoxes(a, b, w, FRAME_BOX, obstacleBoxes, Math.max(2.5, Math.min(8, w))); };
    const line = (pts: Point[], w: number) => { for (let k = 1; k < pts.length; k++) seg(pts[k - 1], pts[k], w); };
    if (bodyPath) line(bodyPath.map(project), rodLike && !inSpace ? rodHalf * 2 + 2 : 12);
    else if (id === 'disk') line(circlePoints(R), 8);
    // A surface's chosen ring, which the scene draws as a band right across the picture.
    if (surface && sceneElement.annulus) for (const r of [sceneElement.annulus.inner, sceneElement.annulus.outer]) if (r > .02) line(circlePoints(r), 5);
    const arrow = (from: Point, d: Point, w: number) => {
      if (Math.hypot(d.x, d.y) < 2) return;
      const to = plus(from, d);
      seg(from, to, w);
      obstacleBoxes.push({ x: to.x - 7, y: to.y - 7, width: 14, height: 14 });
    };
    if (netShown) arrow(P, net, 7);
    if (drawingPiece) {
      arrow(P, contribution, 5);
      if (pairing) { arrow(P, partnerScreen, 5); if (hasDrop && (transverseOpacity > 0 || cancelT > 0)) { arrow(P, cancelT > 0 ? dropScreen : liveDrop, 5); arrow(P, cancelT > 0 ? partnerDropScreen : livePartnerDrop, 5); } }
      if (components && hasDrop) { arrow(P, keepScreen, 5); if (!pairing) arrow(P, dropScreen, 5); }
    }
    if (handOver) arrow(P, handOver.vector, 5);
    if (partnerKeepShown && drawingPiece) arrow(partnerKeepFrom, partnerKeepScreen, 5);
    line(chainPoints, 5);
    for (const d of dims) if (d.path) seg(d.a, d.b, 6);
    // And each bar's end ticks, with the air two names keep between them: a name set just off a tick read
    // as the bar's -- "ΔE" by r's top tick on the semi-infinite line, by z's on the ring seen flat.
    for (const d of dims) if (d.path) for (const q of [d.a, d.b]) obstacleBoxes.push({ x: q.x - 7, y: q.y - 7, width: 14, height: 14 });
    if (pieceLength) seg(pieceLength.ends[0], pieceLength.ends[1], 9);
    // The construction: the dashed lines from the piece and its partner to P, the triangle's legs and
    // the arc of its angle. A name laid across a line it does not name reads as crossed out.
    if (showContribution && building !== 'limit' && id !== 'axial') { seg(selectedPoint, P, 4); constructionLines.push({ a: selectedPoint, b: P }); }
    if (!surface && ((supportsPair && pair) || scalarPartner) && showContribution) { seg(partnerPos, P, 4); constructionLines.push({ a: partnerPos, b: P }); }
    if (triangle) {
      for (const [a, b] of triangle.legs) { seg(a, b, 4); constructionLines.push({ a, b }); }
      line(triangle.arc, 4);
      if ((triangle.kind === 'rod' || triangle.kind === 'arc') && triangle.mark?.leader) seg(triangle.mark.leader[0], triangle.mark.leader[1], 3);
    }
    if (pieceAngle) { line(pieceAngle.arc, 4); if (pieceAngle.leader) seg(pieceAngle.leader[0], pieceAngle.leader[1], 3); for (const q of pieceAngle.rays) seg(P, q, 3); }
    for (const [a, b] of breaks) seg(a, b, 5);
    // The arc's angle and radius, and a ring's or a disk's radius: dimensions drawn outside `dims`.
    if (id === 'arc' && !inSpace) { line(circlePoints(R * PHI_AT, -p.phi / 2, p.phi / 2), 4); seg(O, { x: O.x + R * unit, y: O.y }, 4); }
    if (perspective) seg(O, radiusTip, 4);
    if (rim) seg(O, rim.tip, 4);
    // The chosen ring of a disk or a sheet, in every view: the scene draws it in space, the flat view
    // as an outline, and a name on it reads as naming it.
    if (surface && showContribution && ringOutlined) line(circlePoints(Math.max(.001, sample.position.x)), 5);
    if (inSpace) { seg({ x: 2 * O.x - axisX.x, y: 2 * O.y - axisX.y }, axisX, 3); seg({ x: 2 * O.x - axisY.x, y: 2 * O.y - axisY.y }, axisY, 3); seg({ x: O.x, y: O.y + 27 }, { x: O.x, y: 60 }, 3); }
    // Not while the arc's two sideways parts lie along its y axis: the axes step back for them (see
    // `.cd-arc-pair`), and a faint axis under a name was what drove their names out onto leaders.
    else if (!(id === 'arc' && pairing)) { seg({ x: 64, y: O.y }, { x: 656, y: O.y }, 3); seg({ x: O.x, y: 365 }, { x: O.x, y: 60 }, 3); }
    obstacleBoxes.push({ x: P.x - haloR - 1, y: P.y - haloR - 1, width: 2 * haloR + 2, height: 2 * haloR + 2 });
    obstacleBoxes.push({ x: 0, y: FOOTER_BAND, width: 720, height: 430 - FOOTER_BAND });
    // The view cube and the four steps round it, which grow with the labels on a phone.
    if (inSpace) { const c = 62 * cubeScale, r = (2.1 * 22 + 8.4) * cubeScale; obstacleBoxes.push({ x: c - r, y: c - r, width: 2 * r, height: 2 * r }); }
    if (gauge) {
      const reach = Math.max(gauge.extent, 12);
      obstacleBoxes.push({ x: gauge.x - 6, y: gauge.up ? P.y - reach - 4 : P.y - 4, width: gauge.w + 12, height: reach + 8 });
    }
  }
  // THE AXIS LETTERS IN SPACE slide along their own axes. Pinned at the tip, x sat under the field's
  // arrowhead at rest, beside ΔE_x as the parts cancelled and beside E at the end -- and, being an
  // axis letter, it was never moved. Now it takes the first spot along the outer part of its axis, on
  // either side of the line, that nothing else is drawn on: at the tip, then on out along the axis --
  // which the scene draws right across the plot, so out there is still its end -- and only then back
  // in toward the middle. It never leaves its axis, so it still names it.
  //
  // On the bisector P stands on the x axis itself, and every arrow of the run leaves P along it: the
  // spots round the tip were all under arrows, and the letter took a gap between two of them, where it
  // read as one more arrow's name.
  const axisLetter = (tip: Point) => {
    const size = SYM * labelScale, w = .62 * size, h = 1.37 * size;
    const along = direction(vsub(tip, O)) ?? { x: 1, y: 0 }, across = { x: -along.y, y: along.x }, length = Math.hypot(tip.x - O.x, tip.y - O.y);
    const spots: Point[] = [];
    for (const f of [1, 1.12, 1.25, 1.4, 1.55, 1.7, 1.85, 2, 2.2, 2.4, 2.6, .9, .8, .7, .62, .55]) for (const sgn of [1, -1]) spots.push({ x: O.x + along.x * length * f + across.x * sgn * 14, y: O.y + along.y * length * f + across.y * sgn * 14 });
    const inPlot = (c: Point) => c.x - w / 2 > 46 && c.x + w / 2 < 664 && c.y - h / 2 > 58 && c.y + h / 2 < 367;
    // A little air round it as well: just clear of an arrowhead, it still read as that arrow's name.
    const m = 5, clear = (c: Point) => !obstacleBoxes.some(b => c.x - w / 2 - m < b.x + b.width && b.x < c.x + w / 2 + m && c.y - h / 2 - m < b.y + b.height && b.y < c.y + h / 2 + m);
    const c = spots.find(q => inPlot(q) && clear(q)) ?? spots.find(inPlot) ?? spots[0];
    return { x: c.x.toFixed(1), y: (c.y + .3 * size).toFixed(1), textAnchor: 'middle' as const };
  };
  const axisLetters = inSpace ? { x: axisLetter(axisX), y: axisLetter(axisY) } : null;
  // P's name, once everything it must stay off is known. Beside the dot in the best of the directions
  // above -- and if the arrows leaving P fill that side close in, a little further out along the same
  // direction, where they have diverged, on a short leader back to the dot: the arc's P = O has every
  // arrow of the stage starting at it.
  // Where the stage's own letters at P will stand -- the angle's, and r_i's beside the line to the
  // piece -- for P's name to leave free. P is lettered first, and on a phone it used to take the one
  // place the angle's letter fits, which then went to the far side of the rod on a leader across it.
  const reserved: Box[] = [];
  if (triangle && (triangle.kind === 'rod' || triangle.kind === 'arc') && triangle.mark?.box) reserved.push(triangle.mark.box);
  if (pieceAngle?.box) reserved.push(pieceAngle.box);
  if (triangle && (triangle.kind === 'rod' || triangle.kind === 'slope' || (triangle.kind === 'arc' && triangle.riSpot))) {
    const q = triangle.riSpot!, w = (triangle.kind === 'arc' ? 3 : 1.1) * termSize;
    reserved.push({ x: q.x - (q.anchor === 'end' ? w : q.anchor === 'middle' ? w / 2 : 0), y: q.y - .98 * termSize, width: w, height: 1.5 * termSize });
  }
  const pLabel = (() => {
    const { scored, upper } = pDirections, size = SYM_P * labelScale;
    const width = (id === 'arc' ? 2.45 : .72) * size;
    const boxAt = (spot: { x: number; y: number; anchor: string }): Box => ({ x: spot.x - (spot.anchor === 'end' ? width : spot.anchor === 'middle' ? width / 2 : 0), y: spot.y - .98 * size, width, height: 1.37 * size });
    const clear = (b: Box) => b.x > 46 && b.y > 58 && b.x + b.width < 664 && b.y + b.height < 367
      && !obstacleBoxes.some(o => o.width !== 2 * haloR + 2 && b.x < o.x + o.width && o.x < b.x + b.width && b.y < o.y + o.height && o.y < b.y + b.height)
      && !reserved.some(o => b.x < o.x + o.width + 4 && o.x - 4 < b.x + b.width && b.y < o.y + o.height + 2 && o.y - 2 < b.y + b.height);
    let best = { u: scored[0].u, gap: haloR + 3 }, bestCost = Infinity;
    scored.slice(0, 5).forEach((c, rank) => {
      for (let gap = haloR + 3; gap <= 84; gap += 3) {
        if (!clear(boxAt(besidePoint(P, c.u, gap, size)))) continue;
        const cost = gap + rank * 6;
        if (cost < bestCost) { bestCost = cost; best = { u: c.u, gap }; }
        break;
      }
    });
    const spot = besidePoint(P, best.u, best.gap, size);
    // The next best of the same directions, for the placer to try before anything else.
    const alternates = upper ? scored.slice(1, 4).map(c => { const q = besidePoint(P, c.u, haloR + 3, size); return `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`; }).join(';') : '';
    // A name set out past the arrows hangs from a leader to the dot, so it still plainly names it.
    const box = boxAt(spot), from = { x: P.x + best.u.x * (haloR + 2), y: P.y + best.u.y * (haloR + 2) };
    const leader = best.gap > haloR + 16 ? { from, to: nearestOnBox({ x: box.x - 2, y: box.y - 2, width: box.width + 4, height: box.height + 4 }, from) } : null;
    return { dx: spot.x - P.x, dy: spot.y - P.y, anchor: spot.anchor, mirror: !upper, alternates, leader };
  })();
  // Keep the labels off each other, and off everything above.
  //
  // Every label sits at an offset chosen for one arrangement of the geometry, and those offsets go
  // on being what they were when the geometry moves. So they are laid out where they ask to be and
  // then whichever ones actually collide are nudged to the nearest free spot -- but only a short
  // way: past about 24px a label stops naming what it was put beside, so it tries the far side of
  // the arrow or point it names instead, and failing that it is not drawn. Marks that ARE their
  // place -- the charge's + signs, the view cube's faces, the axis letters, the footer and the
  // stage's name -- are never moved; they are things to avoid. A label with a leader takes its
  // leader with it.
  //
  // After layout, and not while anything is moving: a drag would pay for a second layout pass
  // every frame to reposition labels nobody is reading mid-gesture.
  // Where each name stood after the last pass, relative to what it names, for the placer to try first when
  // its own spot is taken: see `prefer` in labels.ts.
  const held = useRef(new Map<string, { ox: number; oy: number; leader?: boolean }>());
  useLayoutEffect(() => {
    const root = svg.current;
    if (!root || moving) return;
    const texts = [...root.querySelectorAll<SVGTextElement>('text')].filter(t => !t.closest('.cd-help'));
    // Measure with any previous nudge removed, so the desired position is what is measured and a
    // label does not creep further on every pass.
    for (const t of texts) {
      t.removeAttribute('transform');
      if (t.dataset.placerHidden) { t.style.removeProperty('opacity'); delete t.dataset.placerHidden; }
      delete t.dataset.placerLeader;
    }
    for (const l of root.querySelectorAll<SVGLineElement>('.cd-source-tag line')) l.style.removeProperty('opacity');
    const leaders = root.querySelector<SVGGElement>('.cd-label-leaders');
    leaders?.replaceChildren();
    const frameRect = root.getBoundingClientRect();
    if (frameRect.width < 2 || frameRect.height < 2) return;
    const sx = 720 / frameRect.width, sy = 430 / frameRect.height;
    // Client rects, not getBBox: only the screen box puts every label in one space.
    const toFrame = (r: DOMRect): Box => ({ x: (r.left - frameRect.left) * sx, y: (r.top - frameRect.top) * sy, width: r.width * sx, height: r.height * sy });
    const anchored = (t: SVGTextElement) => t.dataset.anchor === 'fixed' || !!t.closest('.cd-plus, .cd-cube') || t.classList.contains('cd-footer') || t.classList.contains('cd-stage-label');
    // Not drawn at all, so neither placed nor avoided: a bracket withheld in space, an arrow of no
    // length, the rod's flat marks once the scene draws the rod.
    const gone = (t: SVGTextElement) => !t.textContent?.trim() || !!t.closest('.is-hidden,[opacity="0"]') || (inSpace && !perspective && !!t.closest('.cd-plus'));
    // An anchored mark that is not a word -- the charge's + signs, the cube's faces -- is avoided as a
    // mark; an anchored word -- an axis letter, the stage's name -- as a word, with a word's margin.
    const fixedMarks: Box[] = [], fixedWords: Box[] = [];
    const segment = (v?: string): Segment | undefined => {
      const n = v?.split(' ').map(Number);
      return n && n.length === 4 && n.every(Number.isFinite) ? { a: { x: n[0], y: n[1] }, b: { x: n[2], y: n[3] } } : undefined;
    };
    // Every arrow's shaft, for the rule that a name stays nearer its own arrow than any other.
    const shafts = [...root.querySelectorAll<SVGGElement>('.cd-vector[data-shaft]')]
      .filter(g => !g.closest('[opacity="0"]')).map(g => segment(g.dataset.shaft)).filter((v): v is Segment => !!v);
    // And the side of an axis an arrow lies on, in the flat view, where the axes are lines across the
    // page: an arrow that leaves P downward keeps its name below the axis P sits on.
    const sides = (shaft?: Segment): HalfPlane[] | undefined => {
      if (!shaft || inSpace) return undefined;
      const out: HalfPlane[] = [], { a, b } = shaft;
      if (Math.abs(a.y - O.y) < 30 && Math.abs(b.y - O.y) > 6) out.push({ x: 0, y: O.y, nx: 0, ny: Math.sign(b.y - O.y) });
      if (Math.abs(a.x - O.x) < 30 && Math.abs(b.x - O.x) > 6) out.push({ x: O.x, y: 0, nx: Math.sign(b.x - O.x), ny: 0 });
      return out;
    };
    const point = (v?: string) => { const m = v?.split(' ').map(Number); return m && m.length === 2 && m.every(Number.isFinite) ? { x: m[0], y: m[1] } : undefined; };
    const movers: { t: SVGTextElement; box: Box; alternates: Box[]; mirror?: Point; keep: boolean; priority: number; order: number; shaft?: Segment; within?: HalfPlane[]; from?: Point; tethered: boolean }[] = [];
    // A label's own box in the drawing's units, from its text alone. Not its client rect: while an
    // arrow grows out of P its name grows with it, and a name measured a tenth of its size on the
    // stage's first frame was placed as if it were a dot -- and nothing moves it again once the
    // growing stops. Every label but the cube's lives in the drawing's own coordinates, so its box
    // there is its place in the figure.
    const ownBox = (t: SVGTextElement): Box | null => {
      if (t.closest('.cd-cube')) { const r = t.getBoundingClientRect(); return r.width < .5 || r.height < .5 ? null : toFrame(r); }
      try { const b = t.getBBox(); return b.width < .5 || b.height < .5 ? null : { x: b.x, y: b.y, width: b.width, height: b.height }; } catch { return null; }
    };
    texts.forEach((t, order) => {
      if (gone(t)) return;
      const box = ownBox(t);
      if (!box) return;
      if (anchored(t)) { (t.closest('.cd-plus, .cd-cube') ? fixedMarks : fixedWords).push(box); return; }
      // Another place the label may stand, given as the x, y and anchor it would be drawn with there:
      // its box there is this one, re-anchored and moved by the change of baseline.
      const alternates: Box[] = [];
      for (const alt of (t.dataset.alt ?? '').split(';').filter(Boolean)) {
        const [ax, ay, anchor] = alt.trim().split(' ');
        const x = Number(ax), y = Number(ay), y0 = Number(t.getAttribute('y'));
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(y0)) continue;
        alternates.push({ x: x - box.width * (anchor === 'end' ? 1 : anchor === 'middle' ? .5 : 0), y: box.y + (y - y0), width: box.width, height: box.height });
      }
      const shaft = segment(t.dataset.shaft);
      // A label may also carry its own sides to stay on, as "x y nx ny" half-planes: the piece's length on
      // the bracket's side of the rod, the leg's letter on the leg's.
      const own = (t.dataset.within ?? '').split(';').map(h => h.trim().split(' ').map(Number)).filter(h => h.length === 4 && h.every(Number.isFinite)).map(([x, y, nx, ny]) => ({ x, y, nx, ny }));
      const within = [...(sides(shaft) ?? []), ...own];
      movers.push({ t, box, alternates, mirror: point(t.dataset.mirror), keep: t.dataset.keep === 'true', priority: Number(t.dataset.priority ?? 0), order, shaft, within: within.length ? within : undefined, from: point(t.dataset.leaderFrom) ?? point(t.dataset.mirror), tethered: !!t.dataset.leader && !!t.dataset.leaderFrom });
    });
    // The point the figure is about first, then the stage's own terms, then the given lengths and the
    // arrows' names, then everything else.
    movers.sort((a, b) => b.priority - a.priority || a.order - b.order);
    const keyOf = (t: SVGTextElement) => `${t.getAttribute('class') ?? ''}|${t.textContent ?? ''}|${t.dataset.symbol ?? ''}`;
    const anchorOf = (m: typeof movers[number]) => point(m.t.dataset.hold) ?? m.mirror ?? { x: m.box.x + m.box.width / 2, y: m.box.y + m.box.height / 2 };
    const prefer = (m: typeof movers[number]) => {
      const was = held.current.get(keyOf(m.t)), a = anchorOf(m);
      return was ? { x: a.x + was.ox - m.box.width / 2, y: a.y + was.oy - m.box.height / 2, width: m.box.width, height: m.box.height, leader: was.leader } : undefined;
    };
    // `.cd-help` itself, not the slab that used to be drawn behind it, and the cube as a whole.
    const dom = [...root.querySelectorAll<SVGGraphicsElement>('.cd-point, .cd-help, .cd-cube')].map(el => toFrame(el.getBoundingClientRect())).filter(b => b.width > 0);
    // THE REACH GROWS WITH THE LABELS. On a phone they are set up to nearly twice as large against a
    // drawing that is not, and a fixed 24 units -- a third of a letter there -- left nowhere to go, so
    // the placer hid the very names the board's line was written in.
    const reach = 24 * labelScale;
    const placed = placeLabels([...fixedWords.map(box => ({ box, fixed: true })), ...movers.map(m => ({ box: m.box, mirror: m.mirror, alternates: m.alternates, keep: m.keep, shaft: m.shaft, within: m.within, from: m.from, tethered: m.tethered, prefer: prefer(m) }))],
      { frame: { width: 720, height: 430 }, obstacles: [...fixedMarks, ...dom, ...obstacleBoxes], pad: 2, labelPad: 8, maxShift: reach, shafts, lines: constructionLines });
    const nudges = placed.slice(fixedWords.length);
    movers.forEach((m, k) => {
      const nudge = nudges[k], key = keyOf(m.t), a = anchorOf(m);
      if (nudge.hidden) held.current.delete(key);
      else held.current.set(key, { ox: m.box.x + nudge.dx + m.box.width / 2 - a.x, oy: m.box.y + nudge.dy + m.box.height / 2 - a.y, leader: nudge.leader });
      if (nudge.hidden) { m.t.style.opacity = '0'; m.t.dataset.placerHidden = 'true'; }
      else if (nudge.dx || nudge.dy) m.t.setAttribute('transform', `translate(${nudge.dx.toFixed(2)} ${nudge.dy.toFixed(2)})`);
      // A name it had to take further than its reach goes on a thin leader back to what it names, the
      // way the charge's tag does.
      const from = point(m.t.dataset.leaderFrom) ?? m.mirror;
      if (nudge.leader && !nudge.hidden && leaders && from) {
        const end = nearestOnBox({ x: m.box.x + nudge.dx - 2, y: m.box.y + nudge.dy - 2, width: m.box.width + 4, height: m.box.height + 4 }, from);
        const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        leader.setAttribute('x1', from.x.toFixed(2)); leader.setAttribute('y1', from.y.toFixed(2));
        leader.setAttribute('x2', end.x.toFixed(2)); leader.setAttribute('y2', end.y.toFixed(2));
        leaders.appendChild(leader);
        m.t.dataset.placerLeader = 'true';
      }
      if (!m.t.dataset.leader) return;
      const leader = m.t.parentElement?.querySelector('line');
      if (!leader) return;
      if (nudge.hidden) { leader.style.opacity = '0'; return; }
      // The leader runs from the piece to the nearest edge of its label, wherever the label went.
      const end = nearestOnBox({ x: m.box.x + nudge.dx - 2, y: m.box.y + nudge.dy - 2, width: m.box.width + 4, height: m.box.height + 4 }, { x: Number(leader.getAttribute('x1')), y: Number(leader.getAttribute('y1')) });
      leader.setAttribute('x2', end.x.toFixed(2));
      leader.setAttribute('y2', end.y.toFixed(2));
    });
  });
  return <div ref={root} className={"charge-diagram cd-focus-"+highlight+(inSpace?" cd-in-space":"")+(perspective?" cd-surface-kind":" cd-wire-kind")+(building?" cd-building cd-stage-"+building:"")+(build?.paused?" cd-paused":"")+(build?.clock?" cd-clocked":"")+(hideAnswer?" cd-hide-total":"")+(narrow?" cd-narrow":"")+(id === 'arc' && pairing ? " cd-arc-pair" : "")}
    data-element-annulus={sceneElement.annulus ? `${sceneElement.annulus.inner},${sceneElement.annulus.outer}` : undefined} style={{ "--cd-k": labelScale } as CSSProperties}>
    {/* Field under construction, sharing one box so the two coordinate spaces cannot
        drift. Planar lessons only for now: the perspective geometries need their lines
        traced in three dimensions and sorted against the surface, a different job. */}
    <div ref={stageBox} className="cd-stage">
    {!inSpace && !scalar && fieldView !== 'off' && <FieldCanvas samples={canvasSamples} detail={UNBOUNDED.has(id) ? 192 : 64} project={project} frame={{ width: 720, height: 430 }} mode={fieldView} reach={Math.max(2.5, p.distance * 1.7, p.size)}
      plane={perspective ? 'xz' : 'xy'} layout={surface ? 'surface' : 'wire'} />}
    {inSpace && <FieldStage quiet={!!building} kind={id === 'disk' ? 'disk' : id === 'sheet' ? 'sheet' : 'wire'} closed={id === 'ring'} samples={UNBOUNDED.has(id) ? fieldSamples : samples} fieldSamples={fieldSamples} detail={UNBOUNDED.has(id) ? 144 : 48} selected={selectedIndex}
      radius={R} distance={p.distance} yaw={view.yaw} pitch={view.pitch} fieldView={scalar ? 'off' : fieldView} reach={fieldReach}
      bodyPath={bodyPath} point={pWorld} element={sceneElement} net={netShown ? scaleVec(displayed, gain / unit) : null} contribution={handOver ? scaleVec(handOver.field, handOver.multiplier * gain / unit) : scalar || !showContribution || mode === 'sum' || building === 'limit' ? null : scaleVec(sample.field, selectedGain * gain / unit)}
      unit={unit} frame={{ width: 720, height: 430 }} origin={O} charge={p.charge} animating={moving}
      getView={() => ({ yaw: yawMv.get(), pitch: pitchMv.get() })}
      // The run, for the scene to draw as bodies: the same partition, partner, sum and arrows the
      // flat marks below are drawn from, at the same scale, so the two can never tell it differently.
      run={build ? runScene({ stage: building, kind: id === 'disk' ? 'disk' : id === 'sheet' ? 'sheet' : 'wire', closed: id === 'ring', n, selected: selectedIndex, at: world,
        partner: partnerLit ? (mirrorArc ? 'across' : partnerIndex) : null, weights, summing: mode === 'sum' || mode === 'integrate', continuum, split,
        arrows: !scalar && showContribution && mode !== 'sum' && building !== 'limit' ? { scale: selectedGain * gain / unit, field: sample.field, keep, drop, partner: pair && supportsPair ? partnerField : null, partnerKeep, partnerDrop, components, cancelled: cancelT } : null,
        chain: chaining ? { scale: gain / unit, fields: samples.map(s => s.field), weights } : null }) : null} />}
    <LabelScale.Provider value={labelScale}>
    <svg ref={svg} className={`cd-svg${inSpace ? ' cd-orbitable' : ''}${scalar ? ' cd-scalar' : ''}`} viewBox="0 0 720 430" role="img" tabIndex={inSpace ? 0 : undefined} {...(inSpace ? orbit : {})} aria-label={`${problem.title}. Interactive charge distribution and ${scalar ? 'electric potential' : 'electric field'} visualization.${inSpace ? ' Drag or use the arrow keys to rotate the view, plus and minus to zoom, Home to reset it.' : ''}`}>
      <defs>
        <pattern id={`${uid}grid`} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="var(--grid)" /></pattern>
        <clipPath id={`${uid}clip`}><rect x="42" y="54" width="626" height="317" rx="10" /></clipPath>
        {/* The rod's own outline, rounded ends and all, for its pieces to be cut to: square pieces
            poked out of the rounded caps at both ends. */}
        {rodLike && <clipPath id={`${uid}rod`}><path d={rodPath()} /></clipPath>}
        {/* The ramp's density as the limit leaves it: the charge's colour at λ₀, fading to nothing at λ = 0. */}
        {ramp && <linearGradient id={`${uid}ramp`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--charge)" stopOpacity=".62" /><stop offset="1" stopColor="var(--charge)" stopOpacity="0" /></linearGradient>}
        <radialGradient id={`${uid}point`}><stop stopColor="var(--field)" stopOpacity=".2" /><stop offset="1" stopColor="var(--field)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect className="cd-grid" x="20" y="48" width="680" height="336" rx="12" fill={`url(#${uid}grid)`} opacity=".55" />
      <g className="cd-axes" clipPath={inSpace ? `url(#${uid}clip)` : undefined}>
        {/* Projected axes whenever the view can turn, so they rotate with what they measure;
            the flat pair is only right when the camera is locked. */}
        {inSpace ? <><path d={`M${2 * O.x - axisX.x} ${2 * O.y - axisX.y}L${axisX.x} ${axisX.y} M${2 * O.x - axisY.x} ${2 * O.y - axisY.y}L${axisY.x} ${axisY.y} M${O.x} ${O.y + 27}V60`} /><text data-anchor="fixed" data-axis="x" {...(axisLetters?.x ?? axisTip(axisX, 13, 5))}>x</text><text data-anchor="fixed" data-axis="y" {...(axisLetters?.y ?? axisTip(axisY, 13, 5))}>y</text><text data-anchor="fixed" x={O.x + 18} y={axisTop + 1}>z</text></> : <><path d={`M64 ${O.y}H656 M${O.x} 365V60`} />{!(id === 'semi' && legLettered) && <text data-anchor="fixed" x="662" y={id === 'axial' ? O.y + 24 : O.y - 9} textAnchor="middle">x</text>}{!(id === 'infinite' && (legLettered || pieceLength)) && <text data-anchor="fixed" data-axis={perspective ? 'z' : 'y'} x={O.x + (perspective ? 18 : id === 'infinite' ? 13 : 11)} y={id === 'infinite' ? (94 + .98 * SYM * labelScale).toFixed(1) : axisTop}>{perspective ? 'z' : 'y'}</text>}</>}
      </g>
      <g clipPath={`url(#${uid}clip)`}>
        {/* Painted first, under everything: it is the frame the rest of the figure sits in, not a
            mark on top of it. Each wedge carries the same selection as the band it stands for, so
            a piece whose charge is off the page is still something a reader can click. */}
        {fan && <g className={'cd-fan' + (mode === 'divide' || mode === 'project' ? '' : ' is-quiet')}>
          {fan.wedges.map(w => <polygon key={w.key} data-wedge-key={w.key} className={'cd-wedge' + (w.index % 2 ? ' is-odd' : '') + (w.index === selectedIndex ? ' is-selected' : '')}
            points={w.points} onPointerDown={ev => { ev.stopPropagation(); onSelect(w.index); }}><title>{`Piece ${w.index + 1} of ${n}`}</title></polygon>)}
          {fan.rays.map(r => <line key={r.key} className="cd-ray" x1={P.x} y1={P.y} x2={r.end.x.toFixed(1)} y2={r.end.y.toFixed(1)} style={{ opacity: 1 - continuum }} />)}
        </g>}
        {perspective && <g ref={plane} className="cd-orbit-plane" transform={planeMatrix(view.yaw, view.pitch, O, unit)}>
          {id === 'sheet' && <g opacity={inSpace ? 0 : 1}><motion.path layoutId="fb-source-surface" data-source-body="true" data-dim="charge" initial={false} animate={{ d: pathThrough(worldArc(7), true) }} transition={{ duration: still ? 0 : .45 }} className="cd-surface" /></g>}
          {id === 'disk' && <>
            <g opacity={inSpace ? 0 : 1}><motion.path layoutId="fb-source-surface" data-source-body="true" data-dim="charge" initial={false} animate={{ d: pathThrough(worldArc(R), true) }} transition={{ duration: still ? 0 : .45 }} className="cd-surface" /></g>
            {/* The shaded disk is the part already SUMMED, so it is drawn only while summing. Before
                that it shaded the whole inner disk behind the chosen ring -- area πs², the very
                mistake this lesson's own hint warns against -- when the piece is the thin ring. */}
            {(mode === 'sum' || mode === 'integrate') && <motion.path className="cd-disk-sweep" data-disk-sweep="true" initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, fillR)), true) }} transition={{ duration: still ? 0 : .2 }} />}
            <g className="cd-piece is-selected" data-piece-key={intervalKey(selectedIndex, n)} style={{ pointerEvents: 'none' }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, sample.position.x))) }} transition={{ duration: still ? 0 : .2 }} fill="none" strokeWidth="4" /></g>
          </>}
          {id === 'ring' && <>
            {/* In space the stage draws the ring as a body with real depth, so the flat band
                would only be a second copy lying on top. It stays in the tree because the
                shared layout animation between lessons is keyed to it. */}
            <g opacity={inSpace ? 0 : 1}><motion.path layoutId={`fb-source-${family}`} data-source-body="true" data-dim="charge" initial={false} animate={{ d: pathThrough(worldArc(R)) }} transition={{ duration: still ? 0 : .45 }} className="cd-charge-base" /></g>
            {samples.map((_, i) => {
              const active = i === selectedIndex, accumulated = Math.abs(weights[i]) > 0 && (mode === 'sum' || mode === 'integrate');
              const inInterval = Math.abs(wholeWeights[i]) > 0;
              const opacity = !inInterval ? .14 : active ? 1 : accumulated ? .94 : building === 'add' ? .16 : .48 + continuum * .3;
              const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n, identity = intervalKey(i, n);
              return <g key={identity} data-piece-key={identity} className={`cd-piece ${active ? 'is-selected' : ''}${partnerLit && i === partnerIndex && !active && !mirrorArc ? ' is-partner' : ''}${accumulated && !active ? ' is-added' : ''}`} style={{ opacity, ...cutAt(i / n) }} onPointerDown={ev => { ev.stopPropagation(); onSelect(i); }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(R, a0, a1)) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth={active ? 10 : 7} /></g>;
            })}
            {mirrorArc && partnerLit && (() => { const a0 = 2 * Math.PI * selectedIndex / n + Math.PI, a1 = 2 * Math.PI * (selectedIndex + 1) / n + Math.PI;
              return <g className="cd-piece is-partner cd-mirror-arc" data-mirror-arc="true" style={{ pointerEvents: 'none' }}><path d={pathThrough(worldArc(R, a0, a1))} fill="none" strokeWidth={7} /></g>; })()}
            {continuum < .995 && <g className="cd-seams" aria-hidden="true" style={{ opacity: .7 * (1 - continuum) }}>
              {seamFractions(n).map(t => { const theta = 2 * Math.PI * t, h = 8 / unit, c = Math.cos(theta), s = Math.sin(theta); return <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam"><line x1={(R - h) * c} y1={(R - h) * s} x2={(R + h) * c} y2={(R + h) * s} /></g>; })}
              {split > .04 && split < .995 && splitFractions(n).map(t => { const theta = 2 * Math.PI * t, h = 8 * split / unit, c = Math.cos(theta), s = Math.sin(theta); return <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam is-growing" style={{ opacity: split }}><line x1={(R - h) * c} y1={(R - h) * s} x2={(R + h) * c} y2={(R + h) * s} /></g>; })}
            </g>}
          </>}
        </g>}
        {id === 'sheet' && !inSpace && <path d={[sheetRim.left, sheetRim.right].map(q => `M${(q.x - 15).toFixed(1)} ${(q.y - 6).toFixed(1)}l12 12m6 -12 12 12`).join('')} className="cd-continuation" />}
        {id === 'sheet' && showContribution && ringOutlined && <g className="cd-orbit-plane" transform={planeMatrix(view.yaw, view.pitch, O, unit)}><g className="cd-piece is-selected" data-piece-key={intervalKey(selectedIndex, n)} style={{ pointerEvents: 'none' }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, sample.position.x))) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth="4" /></g></g>}
        {!perspective && rodLike && <g opacity={inSpace ? 0 : 1}><motion.path layoutId={`fb-source-${family}`} data-source-body="true" data-dim="charge" className={ramp ? 'cd-source-rod is-ramp' : 'cd-source-rod'} initial={false} animate={{ d: rodPath() }} transition={{ duration: still ? 0 : .45 }} /></g>}
        {!perspective && id === 'arc' && <motion.path layoutId={`fb-source-${family}`} data-source-body="true" data-dim="charge" initial={false} animate={{ d: pathThrough(circlePoints(R, -p.phi / 2, p.phi / 2)) }} transition={{ duration: still ? 0 : .45 }} className="cd-charge-base" />}
        {!perspective && samples.map((s, i) => {
          const pos = project(s.position), active = i === selectedIndex, accumulated = Math.abs(weights[i]) > 0 && (mode === 'sum' || mode === 'integrate');
          const inInterval = Math.abs(wholeWeights[i])>0;
          const opacity = !inInterval ? .14 : active ? 1 : accumulated ? .94 : building === 'add' ? .16 : .48 + continuum * .3;
          const heat = scalar && !active ? .28 + .72 * Math.abs(s.potential) / dVmax : 1;
          const identity = intervalKey(i, n);
          // A piece's outline goes as the pieces shrink, and a piece too thin to have an inside has
          // none: outlined at the limit, a line of a hundred and sixty pieces three pixels wide was a
          // ladder of outlines, not a line of charge. Unoutlined, narrow pieces run together into the
          // one continuous bar the limit is. (An arc's piece IS its stroke, so it keeps it.)
          let outline = id === 'arc' ? 1 : Math.max(0, Math.min(1, (1 - continuum) / .99));
          let shape;
          if (id === 'arc') {
            const a0 = p.phi * (i / n - .5), a1 = p.phi * ((i + 1) / n - .5);
            shape = <motion.path initial={false} animate={{ d: pathThrough(circlePoints(R, a0, a1)) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth={active ? 10 : 7} />;
          } else {
            const head = along(project(world(i / n))), tail = along(project(world((i + 1) / n)));
            // Windowed to the drawn rod, not to where the charge actually reaches. An unbounded
            // lesson's outer piece runs to hundreds of metres, which came out as a band 33 000
            // pixels long inside a 626-pixel window -- not a piece of charge a reader can see but
            // a wash of colour behind the whole figure that happens to be clipped. It is cut off
            // at the rod's own ends, where the continuation marks already say it goes on.
            const lo = Math.max(Math.min(head, tail), rodLow - 6), hi = Math.min(Math.max(head, tail), rodHigh + 6);
            const extent = Math.max(1, hi - lo);
            if (hi < rodLow - 8 || lo > rodHigh + 8) return null;
            if (extent < 3) outline = 0;
            const shade = ramp && !active ? { fillOpacity: .08 + .92 * s.position.y / p.size } : undefined;
            shape = upright ? <rect x={pos.x - rodHalf} y={lo} width={rodHalf * 2} height={extent} clipPath={`url(#${uid}rod)`} {...shade} /> : <rect x={lo} y={pos.y - rodHalf} width={extent} height={rodHalf * 2} clipPath={`url(#${uid}rod)`} />;
          }
          return <g key={identity} data-piece-key={identity} className={`cd-piece ${active ? 'is-selected' : ''}${partnerLit && i === partnerIndex && !active ? ' is-partner' : ''}${accumulated && !active ? ' is-added' : ''}`} style={{ opacity: opacity * heat, strokeOpacity: active ? 1 : outline, ...cutAt(i / n) }} onPointerDown={ev => { ev.stopPropagation(); onSelect(i); }}>{shape}</g>;
        })}
        {/* THE RAMP IN THE LIMIT. The pieces are its density while it is cut: each one shaded by its λ. As
            they shrink away their shading goes with them, and the climax of the run was an empty tube with
            the axis down it -- no sign of the charge, or of its rising density. The limit is a density
            that rises continuously, so it is drawn as one, coming in as the pieces go. */}
        {/* ...and drawn from the start, faintly: while it is cut, each piece is filled alike, so the one thing the
            lesson is about -- that the top piece holds far more than the bottom one -- was shown only by how
            the + marks crowd, and at a phone's size not at all. */}
        {ramp && !inSpace && <path className="cd-ramp-density" d={rodPath()} fill={`url(#${uid}ramp)`} style={{ opacity: .75 + .25 * clamp((continuum - .2) / .8, 0, 1), pointerEvents: 'none' }} />}
        {!perspective && continuum < .995 && <g className="cd-seams" aria-hidden="true" style={{ opacity: .7 * (1 - continuum) }}>
          {seamFractions(n).map(t => { const mark = seamStroke(t, 1); return mark ? <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam" style={cutAt(t)}>{mark}</g> : null; })}
          {split > .04 && split < .995 && splitFractions(n).map(t => { const mark = seamStroke(t, split); return mark ? <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam is-growing" style={{ opacity: split }}>{mark}</g> : null; })}
        </g>}
        {!surface && ((supportsPair && pair) || scalarPartner) && showContribution && (() => { const a = offRod(partnerPos, P, partnerIndex);
          // A dashed ring round the mirror piece, on a field lesson, only blotted a piece already lit dark with
          // its own arrow at P: it is kept where nothing else at P says which piece is the mirror -- a
          // potential's, whose pieces have no arrows.
          return <><line x1={a.x} y1={a.y} x2={P.x} y2={P.y} className="cd-construction cd-pair" />{scalar && <circle cx={partnerPos.x} cy={partnerPos.y} r="9" className="cd-partner" />}</>; })()}
        {/* Not on the rod seen along its axis, where it would lie along the rod itself: there the
            distance is a dimension above the rod, drawn with the triangle. */}
        {showContribution && building !== 'limit' && id !== 'axial' && (() => { const a = offRod(selectedPoint, P, selectedIndex); return <line x1={a.x} y1={a.y} x2={P.x} y2={P.y} className="cd-construction" />; })()}
      </g>
      {/* Where a line that never ends leaves the frame: break marks across it, a little way in, and its
          end named beside them, hung off their left so the name and the marks never touch. */}
      {id === 'infinite' && <g className="cd-infinity"><path d={breaks.map(([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join('')} />
        <text className="cd-end" x={O.x - 16} y={(80 + .3 * SYM * labelScale).toFixed(1)} textAnchor="end">+∞</text><text className="cd-end" x={O.x - 16} y={(348 + .3 * SYM * labelScale).toFixed(1)} textAnchor="end">−∞</text></g>}
      {id === 'semi' && <g className="cd-infinity"><path d={breaks.map(([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join('')} /><text className="cd-end" x={rodHigh - 4} y={O.y - 17}>∞</text></g>}
      {id === 'sheet' && !inSpace && <text x={sheetRim.right.x} y={sheetRim.right.y + 24} textAnchor="end" className="cd-end" {...GIVEN}>s → ∞</text>}
      {/* DIMENSIONS, drawn as a draftsman draws them: a bar beside what it measures, a tick at each
          end, its letter beside the bar's middle -- and every one of them off the axes, the charge
          and P, which used to have the letters L and r lying on their lines. */}
      {dims.map(d => <g key={d.key} data-dim={d.dim} className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}>
        <path d={d.path} />
        {d.extension && <line className="cd-extension" x1={d.extension[0].x} y1={d.extension[0].y} x2={d.extension[1].x} y2={d.extension[1].y} />}
        {d.label && <text x={d.label.x} y={d.label.y} textAnchor={d.label.anchor} data-mirror={`${((d.a.x + d.b.x) / 2).toFixed(1)} ${((d.a.y + d.b.y) / 2).toFixed(1)}`} data-alt={d.alt} {...GIVEN}>{d.name}</text>}
      </g>)}
      {id === 'bisector' && <g data-dim="size" className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><text className="cd-end" x={O.x+17} y={O.y-R*unit-8}>+L/2</text><text className="cd-end" x={O.x+17} y={Math.min(O.y+R*unit+20, 366)}>−L/2</text></g>}
      {footed && <g data-dim="size" className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><text className={ramp ? 'cd-end cd-density-end' : 'cd-end'} x={O.x+17} y={O.y-p.size*unit-8}>{ramp ? <SymbolText symbol="λ = λ_0" /> : 'y = L'}</text><text className={ramp ? 'cd-end cd-density-end' : 'cd-end'} x={O.x+19} y={O.y-9}>{ramp ? 'λ = 0' : 'y = 0'}</text></g>}
      {/* The rod's far end, by its coordinate: "L" here as well as under the bar was two L's. */}
      {/* Under the tick where the L and a bars meet, below the axis: above it, on the line the piece's
          ΔQ is written on, the two read as one phrase. */}
      {id === 'axial' && <g data-dim="size" className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><text className="cd-end" x={O.x+p.size*unit} y={O.y + 34 + 8 + .98 * SYM * labelScale} textAnchor="middle" data-mirror={`${(O.x+p.size*unit).toFixed(1)} ${(O.y + 34).toFixed(1)}`}>x = L</text></g>}
      {/* The radius, named beside its middle -- or nearer either end, above or below it, where the middle
          is taken: flat, a sheet's chosen ring is an ellipse that hems the radius in at its middle. */}
      {rim && <g data-dim="size" data-rim="true" className="cd-dimension"><path d={`M${O.x.toFixed(1)} ${O.y.toFixed(1)}L${rim.tip.x.toFixed(1)} ${rim.tip.y.toFixed(1)}`} />
        <text x={rim.spot.x.toFixed(1)} y={rim.spot.y.toFixed(1)} textAnchor={rim.spot.anchor} data-mirror={`${rim.mid.x.toFixed(1)} ${rim.mid.y.toFixed(1)}`} data-alt={rim.alt} {...GIVEN}>R</text></g>}
      {perspective && <g data-dim={id === 'disk' ? undefined : 'size'} className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={`M${O.x} ${O.y}L${radiusTip.x} ${radiusTip.y}`} /><text x={O.x+(radiusTip.x-O.x)*.6} y={O.y+(radiusTip.y-O.y)*.6+19} data-mirror={`${(O.x+(radiusTip.x-O.x)*.6).toFixed(1)} ${(O.y+(radiusTip.y-O.y)*.6).toFixed(1)}`}
        data-alt={[.35, .85].flatMap(f => [19, -8].map(dy => `${(O.x + (radiusTip.x - O.x) * f).toFixed(1)} ${(O.y + (radiusTip.y - O.y) * f + dy).toFixed(1)} start`)).join(';')} {...GIVEN}>{surface ? 's' : 'R'}</text></g>}
      {id === 'arc' && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><g data-dim="angle"><path className="cd-phi-arc" d={pathThrough(circlePoints(R*PHI_AT, -p.phi/2, p.phi/2))} />{arcLetters && <text x={arcLetters.phi.x.toFixed(1)} y={arcLetters.phi.y.toFixed(1)} textAnchor="middle" data-alt={arcLetters.phiAlt} data-within={arcLetters.phiWithin} {...GIVEN}>φ</text>}</g>
        <g data-dim="size"><line x1={O.x} y1={O.y} x2={O.x+R*unit} y2={O.y} /><text x={O.x+R*unit*.45} y={O.y+23} data-alt={arcLetters?.rAlt} {...GIVEN}>R</text></g></g>}
      {pieceLength && <g className="cd-piece-length" data-piece-length={pieceLength.name}>
        <path d={pieceLength.path} />
        <text x={pieceLength.label.x.toFixed(1)} y={pieceLength.label.y.toFixed(1)} textAnchor={pieceLength.label.anchor} data-mirror={`${pieceLength.mirror.x.toFixed(1)} ${pieceLength.mirror.y.toFixed(1)}`} data-alt={pieceLength.alt} data-within={pieceLength.within} {...termAttrs(true)}>{pieceLength.name}</text>
      </g>}
      {/* Placed, not pinned: where every name of a term wants the room, O is the one that gives way. */}
      {id !== 'arc' && <text data-at={`${O.x.toFixed(2)} ${O.y.toFixed(2)}`} x={originLabel.x} y={originLabel.y} textAnchor="end" className="cd-origin" data-mirror={`${O.x.toFixed(1)} ${O.y.toFixed(1)}`}>O</text>}
      {/* One piece's arrow, its parts and its mirror partner. They grow out of P as they arrive
          rather than appearing at full length, so it is plain where each one starts. Left out
          while the run shrinks the pieces away: the stage is about the whole sum by then, and one
          piece's arrow beside it is the previous stage's picture. */}
      {showContribution && !scalar && mode !== 'sum' && building !== 'limit' && <>
        {/* WHAT CANCELS, AS SOMETHING YOU CAN SEE. Each piece's sideways part is a real arrow out of P
            -- the side of the parallelogram the piece's arrow is resolved along -- named, as thick as
            the arrows it belongs to, and dashed because it is the part that goes. They hold still
            long enough to be read, then shrink into P toward each other until they meet and are gone.
            They used to be 1.4-pixel slivers hung under the arrowheads at the tips of the parts that
            survive, about twenty pixels long and faded within the second, so the cancellation the
            caption describes was asserted and never seen. */}
        {pairing && <g className="cd-grow cd-grow-pair" style={{ transformOrigin: `${P.x}px ${P.y}px` }}>
          {/* The mirror piece's own arrow, solid like the piece's -- it is a whole contribution, of which only
              the sideways part goes -- in a lighter tint, so the two are told apart. Dashed, it read as the
              figure's style for what cancels: as if the mirror piece contributed nothing. */}
          <Vector from={P} to={plus(P, partnerScreen)} clip={plotClip} color={PARTNER_TINT} width={1.8} reduced={still} />
          {hasDrop && <>
            {/* Named while whole. Once they start to go, the names stay where they were, on the ghosts
                below, rather than riding the shrinking tips into P and piling up on it. */}
            <g data-cancel-transverse="piece" opacity={transverseOpacity}>
              <Vector from={P} to={plus(P, liveDrop)} clip={plotClip} color="var(--contribution)" width={2.4} dashed label={cancelT > 0 ? undefined : dropSymbol} at="tip" reduced={still} keep={stageCancel} priority={2} />
            </g>
            <g data-cancel-transverse="partner" opacity={transverseOpacity}>
              <Vector from={P} to={plus(P, livePartnerDrop)} clip={plotClip} color="var(--contribution)" width={2.4} dashed label={cancelT > 0 ? undefined : '\u2212' + dropSymbol} at="tip" reduced={still} keep={stageCancel} priority={2} />
            </g>
          </>}
        </g>}
        {/* WHAT WAS THERE. As the pair goes, a faint ghost of each part stays at full length, still
            named: a paused frame, the stage's held last frame, a printed copy -- each still shows the
            two parts that cancelled, not only the one that survived them. Outside `.cd-grow-pair`, so
            in space, where the scene's own pair has shrunk to nothing, it is still drawn. */}
        {pairing && hasDrop && cancelT > 0 && <g className="cd-cancel-ghost" data-cancel-ghost={cancelT.toFixed(3)}>
          <Vector from={P} to={plus(P, dropScreen)} clip={plotClip} color="var(--contribution)" width={2.4} dashed dash="3 3" label={dropSymbol} at="tip" reduced={still} keep={stageCancel} priority={2} fade={GHOST * cancelT} muted />
          <Vector from={P} to={plus(P, partnerDropScreen)} clip={plotClip} color="var(--contribution)" width={2.4} dashed dash="3 3" label={'\u2212' + dropSymbol} at="tip" reduced={still} keep={stageCancel} priority={2} fade={GHOST * cancelT} muted />
        </g>}
        {/* The part that survives, solid and named with the component the derivation builds. Without
            a mirror piece the other part survives too, so it is drawn the same way, solid and named:
            dashed is kept for the parts that cancel, and nothing else. Where there is no other part
            -- the rod seen along its axis, a ring of a disk -- the piece's own arrow already is the
            part that survives, and a second arrow on top of it would only be a second name. */}
        {components && hasDrop && <g className="cd-grow cd-grow-parts" style={{ transformOrigin: `${P.x}px ${P.y}px` }}>
          <Vector from={P} to={plus(P, keepScreen)} clip={plotClip} color="var(--contribution)" width={2.4} label={keepSymbol} at={keepNamedMid ? 'mid' : 'tip'} side={keepNamedMid ? awayFrom(keepScreen, partnerScreen) : undefined} reduced={still} keep={stageCancel} priority={2} />
          {!pairing && <Vector from={P} to={plus(P, dropScreen)} clip={plotClip} color="var(--contribution)" width={2.4} label={dropSymbol} at="tip" reduced={still} keep={stageCancel} priority={2} />}
        </g>}
        {/* AND WHAT THE MIRROR PIECE KEEPS, laid on after the piece's own: once the sideways parts have gone,
            the two parts that survive are seen adding, tip to tail -- the "perpendicular parts survive",
            plural, that the caption says -- or, on a phone, standing side by side (see `stackSurvivors`).
            In the mirror's lighter tint, so the one named is the piece's. */}
        {/* The piece's own surviving part is then named beside its middle, on the side away from the mirror's
            whole arrow: past its tip it stood on the mirror's survivor, and on the mirror's side it was nearer
            the mirror's arrow than its own, and read as that arrow's name. */}
        {partnerKeepShown && <g className="cd-partner-keep" data-partner-keep="true" opacity={clamp((cancelT - .5) * 2, 0, 1)}>
          <Vector from={partnerKeepFrom} to={plus(partnerKeepFrom, partnerKeepScreen)} clip={plotClip} color={PARTNER_TINT} width={2.4} reduced={still} />
        </g>}
        <g className="cd-grow" style={{ transformOrigin: `${P.x}px ${P.y}px` }}><Vector from={P} to={plus(P, contribution)} clip={plotClip} color="var(--contribution)" width={1.8} label={pieceSymbol} side={awayFrom(contribution, components && hasDrop ? keepScreen : net)} reduced={still} ghost={inSpace} keep={pieceTerm} priority={pieceTerm ? 2 : 1} /></g>
      </>}
      {/* A chain laid beside the field's arrow goes as the pieces shrink: once it coincides with E it is a
          second bar alongside it, with a tick at each end -- a dimension, not a sum -- and E's name went beside
          the bar instead of the arrow. */}
      {!scalar && chainPoints.length > 1 && <path className="cd-sum-chain" data-sum-chain={String(chainPoints.length)} d={pathThrough(chainPoints)} fill="none" clipPath={plotClip} style={chainBeside ? { opacity: clamp((1 - continuum) / .7, 0, 1) } : undefined} />}
      {!scalar && chainEnds && chainPoints.length > 1 && <path className="cd-sum-chain cd-sum-chain-ends" d={chainEnds} fill="none" clipPath={plotClip} style={{ opacity: clamp((1 - continuum) / .7, 0, 1) }} />}
      {building === 'add' && !scalar && chainPoints.length > 1 && chainPoints.length <= 65 && chainPoints.slice(1).map((c, k) => Math.hypot(c.x - chainPoints[k].x, c.y - chainPoints[k].y) < 8 ? null : <circle key={k} className="cd-sum-joint" cx={c.x} cy={c.y} r="2.8" />)}
      {/* The run's piece, shrinking to its true length as the sum begins: the scale it was drawn at
          in the two stages before was its own, and this is where that is said, by showing it. */}
      {handOver && <g className="cd-hand-over" data-hand-over={handOver.multiplier.toFixed(3)} opacity={handOver.opacity}>
        <Vector from={P} to={plus(P, handOver.vector)} clip={plotClip} color="var(--contribution)" width={2.4} label={handOver.opacity > .5 ? pieceSymbol : undefined} reduced ghost={inSpace} />
      </g>}
      {inSpace && <ViewCube view={view} at={{ x: 62 * cubeScale, y: 62 * cubeScale }} size={22 * cubeScale}
        onPick={(next, label) => { stopGlide(); setZoom(1); glideTo(next, .5); setAnnouncement(label); }}
        onSpinStart={() => { stopGlide(); setActiveDrag(true); }}
        onSpin={(dx, dy) => { const next = orbitCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }, dx * 1.7, dy * 1.7); commitView(next); }}
        onStep={key => nudge(key)} />}
      {/* `x` is the line's RIGHT edge: it hangs off the figure's top right corner, clear of the
          view cube in the opposite one and above everything the drawing puts in the middle. While
          the run is open the stage's name has the top of the figure, and the legend steps aside. */}
      {inSpace && !build && <ViewHelp x={690} y={30} />}
      {/* The sum the stage builds, and the field it ends on: named whenever they are the stage's result. */}
      {netShown && <Vector from={P} to={plus(P, net)} width={3.5} label={finished ? 'E' : '\u03a3 \u0394E'} side={awayFrom(net, toCharge)} reduced={still} ghost={inSpace} keep={!building || building === 'add' || building === 'limit'} priority={building === 'add' || building === 'limit' ? 2 : 1} clip={plotClip} />}
      {/* "E = 0" only where the arrow it stands for is the field: the finished integral, or a sum of
          every piece. At the start of "Add them up" the sum is empty, and an empty sum is not a field
          of zero -- it printed "E = 0" beside P on every field lesson, where the field is not. */}
      {/* The answer, when it is nothing: kept, because it is the whole of what the stage ends on. */}
      {!scalar && !hideAnswer && zeroField && <text x={P.x-16} y={P.y-47} textAnchor="end" className="cd-zero" data-keep="true" data-priority="2">E = 0</text>}
      {/* THE POTENTIAL'S OWN PICTURE: the pieces' contributions, stacked.
          The field chains its pieces' arrows head to tail in the plane; the potential chains its
          pieces' NUMBERS head to tail along a line. It is the same sum with one dimension taken
          away, and that is the whole difference between the two lessons made visible: a chain
          that can only run one way can never bend back and cancel.

          It used to be one thermometer bar beside P, which showed a total with no visible
          origin -- a chart, not an argument. Now every piece owns a segment of the column, in
          order, so the reader sees V is literally the pieces piled up; the chosen segment is lit;
          the sum fills the column the way the field's chain grows; and a mirror partner lights a
          second segment of the same size, adding where the field lesson's partner cancels.
          On the ring and the arc the segments come out all equal, because every piece is the
          same distance away -- the reason those two potentials need no integral at all. */}
      {scalar && gauge && <g className="cd-gauge" aria-hidden="true" data-stack={String(n)}>
          {/* Where the column stands: a short rule level with P, so it reads as the potential AT P
              growing up from nothing. It used to be a long guide line through P, which crossed the
              ring and its R, stood beside the y axis on the arc, and in space read as a second axis. */}
          <line className="cd-gauge-base" x1={gauge.x - 5} y1={P.y} x2={gauge.x + gauge.w + 5} y2={P.y} />
          {gauge.stacked ? null : gauge.fine
            ? <rect className="cd-stack-slot" x={gauge.x} width={gauge.w} {...gauge.box(0, gauge.at)} />
            : gauge.slots.map(sl => <rect key={sl.i} data-stack-slot={sl.i} className={'cd-stack-slot' + (gauge.lit.has(sl.i) ? ' is-lit' : '')} x={gauge.x} width={gauge.w} {...gauge.box(sl.lo, sl.hi)}
                onPointerDown={ev => { ev.stopPropagation(); onSelect(sl.i); }} />)}
          {gauge.filling && (gauge.fine
            ? <rect className="cd-stack-fill" x={gauge.x} width={gauge.w} {...gauge.box(0, gauge.got)} />
            : gauge.filled.map(sl => <rect key={sl.i} className={'cd-stack-fill' + (gauge.lit.has(sl.i) ? ' is-lit' : '')} x={gauge.x} width={gauge.w} {...gauge.box(sl.lo, sl.hi)} />))}
          {!summing && showContribution && gauge.litRuns.map(run => <rect key={run.key} data-stack-lit={run.key} className="cd-stack-fill is-lit" x={gauge.x} width={gauge.w} {...gauge.box(run.lo, run.hi)} />)}
          <text className={gauge.name === '\u03a3 \u0394V' ? 'is-sum' : undefined} x={gauge.leftSide ? gauge.x - 7 : gauge.x + gauge.w + 7} textAnchor={gauge.leftSide ? 'end' : 'start'} y={gauge.beside ? P.y - gauge.top + .3 * SYM * labelScale : gauge.up ? P.y - Math.max(12, gauge.top) - 6 : P.y - Math.min(-12, gauge.top) + 16}
            data-gauge-name="true" data-within={`0 ${P.y.toFixed(1)} 0 ${gauge.up ? -1 : 1}`} {...(gauge.name === '\u03a3 \u0394V' && hideAnswer ? {} : { 'data-keep': 'true', 'data-priority': 2 })}>{gauge.name}</text>
        </g>}
      {/* Leaders for names the placer had to take past their reach: filled by the placer, never by React. */}
      <g className="cd-label-leaders" aria-hidden="true" />
      <g {...(id === 'arc' ? {} : handle('P'))} className={`cd-observation ${id === 'arc' ? 'is-fixed' : ''}`}>
        <circle data-orbit-p="true" cx={P.x} cy={P.y} r="28" className="cd-point-glow" fill={`url(#${uid}point)`} style={{ opacity: inSpace || building ? 0 : 1 }} /><circle data-orbit-p="true" cx={P.x} cy={P.y} r={haloR} className="cd-point-halo" style={{ opacity: inSpace ? 0 : 1 }} /><circle data-orbit-p="true" cx={P.x} cy={P.y} r="5" className="cd-point" style={{ opacity: inSpace ? 0 : 1 }} />
        {/* Beside the dot, on the side nothing else is using: away from the charge, the field's arrow,
            the construction and the axis P sits on. It used to hang a fixed 31px below P, which in
            every view of a ring or a disk is down the axis and onto the plane -- read as a point ON
            the ring. */}
        {pLabel.leader && <line className="cd-point-leader" x1={pLabel.leader.from.x.toFixed(1)} y1={pLabel.leader.from.y.toFixed(1)} x2={pLabel.leader.to.x.toFixed(1)} y2={pLabel.leader.to.y.toFixed(1)} />}
        <text data-orbit-p="true" data-dx={pLabel.dx.toFixed(2)} data-dy={pLabel.dy.toFixed(2)} x={P.x + pLabel.dx} y={P.y + pLabel.dy} textAnchor={pLabel.anchor} className="cd-point-label" data-leader={pLabel.leader ? 'true' : undefined} data-hold={`${P.x.toFixed(1)} ${P.y.toFixed(1)}`}
          data-priority="3" data-keep="true" data-mirror={pLabel.mirror ? `${P.x.toFixed(1)} ${P.y.toFixed(1)}` : undefined} data-alt={pLabel.alternates || undefined}>{id === 'arc' ? <>P = <tspan className="cd-origin-o">O</tspan></> : 'P'}</text>
      </g>
      {(showContribution || building === 'pieces' || highlight === 'element') && <g className="cd-source-tag"><line x1={source.x} y1={source.y} x2={source.x+(source.x>560?-22:22)} y2={source.y+(source.y<95?22:-20)} /><text data-leader="true" data-leader-from={`${source.x.toFixed(1)} ${source.y.toFixed(1)}`} data-within={tagWithin} x={source.x+(source.x>560?-27:27)} y={source.y+(source.y<95?27:-21)} textAnchor={source.x>560?'end':'start'} data-alt={tagAlternates} {...termAttrs(stageOne || building === 'add')}>{sourceVisible ? (surface ? 'ring '+elementSymbol : elementSymbol) : elementSymbol+' outside view'}</text></g>}
      {/* THE LIMITS OF INTEGRATION, named as the lesson writes them -- -L/2 and L/2, 0 and 2pi -- and
          only while a handle sits on a limit: dragged in, it is wherever the reader put it, which has
          no name. They used to be "a" and "b" everywhere, which on the rod seen along its axis is
          also the gap to P, so two different a's stood in one figure. A closed ring's two ends are
          one point, so they are one handle until they are dragged apart; a limit that lies off the
          page is an arrow at the edge pointing to it, not a handle pinned in the frame's corner. */}
      {pieceAngle && <g className="cd-piece-angle" data-piece-angle={pieceAngle.box ? 'true' : undefined}>
        {pieceAngle.rays.map((q, k) => <line key={k} className="cd-piece-ray" x1={P.x.toFixed(1)} y1={P.y.toFixed(1)} x2={q.x.toFixed(1)} y2={q.y.toFixed(1)} />)}
        {pieceAngle.node}
      </g>}
      {/* The triangle the distance and the angle are read off: see `triangle` above. */}
      {triangle && <g className="cd-triangle">
        {triangle.kind === 'schematic' && (() => { const { zSpot, baseSpot, riSpot, top, corner, end } = triangle;
          // The angle at the top, inside it, centred where the wedge is wide enough to hold it: the wedge
          // there opens at half the top angle, whose tangent is the foot over the height, 81 over 62.
          const half = Math.atan2(81, 62) / 2, h = 1.37 * termSize, d = Math.max(30, (h / 2 + 3) / Math.sin(half));
          const alpha = { x: top.x + Math.sin(half) * d, y: top.y + Math.cos(half) * d + .3 * termSize };
          const at = (q: Point) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`, mid = (a: Point, b: Point) => at({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          const arcEnd = { x: top.x + 17 * Math.sin(2 * half), y: top.y + 17 * Math.cos(2 * half) };
          return <>
            <path d={`M${at(corner)}L${at(top)}L${at(end)}Z`}/><path className="cd-right-angle" d={`M${corner.x.toFixed(1)} ${(corner.y - 8).toFixed(1)}h8v8`}/>
            {!scalar && <path className="cd-angle-arc" d={`M${top.x.toFixed(1)} ${(top.y + 17).toFixed(1)}A17 17 0 0 0 ${at(arcEnd)}`}/>}
            <text x={zSpot.x.toFixed(1)} y={zSpot.y.toFixed(1)} textAnchor={zSpot.anchor} data-mirror={mid(top, corner)} {...GIVEN}>z</text>
            <text x={baseSpot.x.toFixed(1)} y={baseSpot.y.toFixed(1)} textAnchor={baseSpot.anchor} data-mirror={mid(corner, end)} {...GIVEN}>{surface ? 's' : 'R'}</text>
            <text x={riSpot.x.toFixed(1)} y={riSpot.y.toFixed(1)} textAnchor={riSpot.anchor} data-mirror={mid(top, end)} className="cd-ri" {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" /></text>
            {!scalar && <text className="cd-angle" x={alpha.x.toFixed(1)} y={alpha.y.toFixed(1)} textAnchor="middle" {...(stageCancel ? termAttrs(true) : GIVEN)}>α</text>}
            <text x={corner.x.toFixed(1)} y={(baseSpot.y + 18).toFixed(1)} className="cd-triangle-note">Right triangle · schematic</text>
          </>; })()}
        {triangle.kind === 'slope' && <text x={triangle.riSpot.x.toFixed(1)} y={triangle.riSpot.y.toFixed(1)} textAnchor={triangle.riSpot.anchor} data-mirror={`${triangle.hyp.x.toFixed(1)} ${triangle.hyp.y.toFixed(1)}`} className="cd-ri" {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" /></text>}
        {triangle.kind === 'arc' && <><line x1={P.x} y1={P.y} x2={selectedPoint.x} y2={selectedPoint.y}/>{triangle.mark?.node}
          {/* The line from the piece to P is r_i, and on the arc every r_i is R: the board writes the field
              with r_i, and the figure drew the line unnamed. On the side of it away from θ. */}
          {triangle.riSpot && <text x={triangle.riSpot.x.toFixed(1)} y={triangle.riSpot.y.toFixed(1)} textAnchor={triangle.riSpot.anchor} data-mirror={`${triangle.hyp.x.toFixed(1)} ${triangle.hyp.y.toFixed(1)}`} className="cd-ri" {...(stageOne ? termAttrs(true) : { 'data-priority': 1 })}><SymbolText symbol="r_i" tail=" = R" /></text>}</>}
        {triangle.kind === 'axial' && (() => { const { a, b } = triangle;
          return <>
            <path className="cd-ri-bar" d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}M${a.x.toFixed(1)} ${(a.y - 4).toFixed(1)}v8M${b.x.toFixed(1)} ${(b.y - 4).toFixed(1)}v8`} />
            <text x={((a.x + b.x) / 2).toFixed(1)} y={(a.y - 8 - .39 * termSize).toFixed(1)} textAnchor="middle" data-mirror={`${((a.x + b.x) / 2).toFixed(1)} ${a.y.toFixed(1)}`} {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" tail=" = L + a − x" /></text>
          </>; })()}
        {triangle.kind === 'rod' && (() => { const { start, foot, extension, square, riSpot, hyp, legMid, legSpot, legAlt, legWithin, legLength, flat, mark, hasLeg, baseMid, rSpot, rAlt } = triangle;
          return <>
            {hasLeg && <path d={`M${start.x.toFixed(1)} ${start.y.toFixed(1)}L${foot.x.toFixed(1)} ${foot.y.toFixed(1)}L${P.x.toFixed(1)} ${P.y.toFixed(1)}`} />}
            {hasLeg && legLength > 4 && <path className="cd-extension-tick" d={`M${extension[0].x.toFixed(1)} ${extension[0].y.toFixed(1)}L${extension[1].x.toFixed(1)} ${extension[1].y.toFixed(1)}`} />}
            {square && <path className="cd-right-angle" d={square} />}
            <text x={riSpot.x.toFixed(1)} y={riSpot.y.toFixed(1)} textAnchor={riSpot.anchor} data-mirror={`${hyp.x.toFixed(1)} ${hyp.y.toFixed(1)}`} className="cd-ri" {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" /></text>
            {legLength > 14 && <text x={legSpot.x.toFixed(1)} y={legSpot.y.toFixed(1)} textAnchor={legSpot.anchor} data-mirror={`${legMid.x.toFixed(1)} ${legMid.y.toFixed(1)}`}
              data-alt={legAlt} data-within={legWithin} {...(scalar ? termAttrs(distanceTerm) : { 'data-priority': 1 })}>{flat ? 'x' : 'y'}</text>}
            {rOnLeg && hasLeg && <text x={rSpot.x.toFixed(1)} y={rSpot.y.toFixed(1)} textAnchor={rSpot.anchor} data-dim="distance" data-mirror={`${baseMid.x.toFixed(1)} ${baseMid.y.toFixed(1)}`} data-alt={rAlt} {...GIVEN}>r</text>}
            {mark?.node}
          </>; })()}
      </g>}
      {/* THE CHARGE'S OWN MARKS, painted over the construction and the triangle rather than under them,
          each with a thin ring of the ground colour: a dashed stroke laid through a + turned it into a
          minus sign. Their size goes with the labels', so on a phone they are still marks. */}
      {rodLike && <g data-dim="charge" className="cd-plus" aria-hidden="true">{chargeMarks.map(v => <text key={v} className={onFill(v) ? 'is-on-fill' : undefined} x={upright ? O.x : v} y={(upright ? v : O.y) + 4.5 * labelScale} textAnchor="middle">{p.charge < 0 ? '\u2212' : '+'}</text>)}</g>}
      {/* The limits' handles, painted over the charge's marks: a + printed on a handle read as a mark of
          the handle's. */}
      {mode === 'integrate' && onBoundRangeChange && bounds.map(b => <g key={b.key} {...handle(b.handle)} className={'cd-bound' + (b.edge ? ' is-edge' : '')} data-bound={b.key}>
        <circle cx={b.at.x} cy={b.at.y} r="17" fill="transparent" />
        {b.edge ? <path d={b.edge} /> : <rect x={b.at.x-7} y={b.at.y-7} width="14" height="14" rx="3.5" />}
        {/* The stage that sets the limits keeps their names: the placer may move them, never drop them. */}
        {b.name && <text x={b.label.x} y={b.label.y} textAnchor={b.label.anchor} data-alt={b.alt} {...(building === 'limit' ? { 'data-priority': 2, 'data-keep': 'true' } : { 'data-priority': 0 })} data-mirror={`${b.at.x.toFixed(1)} ${b.at.y.toFixed(1)}`}>{b.name}</text>}
      </g>)}
      <line x1="30" y1="387" x2="690" y2="387" className="cd-divider" />
      <text x="30" y="409" className="cd-footer cd-footer-math"><SymbolText symbol={sourceLabel.symbol} tail={sourceLabel.tail} /></text>
      {build && <text key={build.key} data-anchor="fixed" data-build-stage={build.key} className="cd-stage-label" x="360" y="34" textAnchor="middle">{build.name}</text>}
      <text x="690" y="409" textAnchor="end" className="cd-footer" data-dim="pieces">{scaleNote}</text>
    </svg>
    </LabelScale.Provider>
    </div>
    {/* EVERYTHING BUT THE DRAWING NOW SITS UNDER IT, in two rows grouped by the question they
        answer. The view strip used to run ABOVE the figure, so the first thing inside the
        figure card was a row of buttons and the picture came second -- on a phone the reader
        met 39px of chrome before meeting the charge. A figure's controls belong under the
        figure, the way a caption does.

        Row one is every "how do I look at it" control: the projection, what to draw around the
        charge, and the zoom pad with the way home. Row two is the figure's own sentence, with
        the keyboard footnote as its fine print. Three rows became two, and neither of them
        stands between the reader and the charge any more. */}
    <div className="cd-toolbar">
    <div className="cd-view-modes" role="group" aria-label="How to view the figure">
      {([['2D', false], ['3D', true]] as const).map(([label, wants]) => <button key={label} type="button" title={wants ? 'In space: drag, scroll or use the arrow keys to turn it' : 'Flat, looking straight down the axis'}
        className={`cd-view-mode${inSpace === wants ? ' is-on' : ''}`} aria-pressed={inSpace === wants}
        onClick={() => {
          if (wants === inSpace) return;
          stopGlide();
          if (wants) { yawMv.set(FLAT.yaw); pitchMv.set(FLAT.pitch); setCamera({ ...FLAT }); setSpatial(true); glideTo(openingCamera(problem.geometry), .8); }
          else glideTo(FLAT, .65, () => setSpatial(false));
        }}>{label}</button>)}
    </div>
    {/* What each view can honestly claim. In a flat slice of a field in space the lines' spacing goes
        as 1/r while the field goes as 1/r², so "crowded means stronger" was false; and the arrows are
        log-weighted, so "each arrow is the field where it sits" was false too. */}
    {!scalar && <div className="cd-view-modes" role="group" aria-label="How to show the field around the charge">
      {([['Field lines', 'lines', 'Lines show the field’s direction; in a flat slice their spacing only hints at strength'], ['Arrows', 'vectors', 'Arrows point along the field; length grows with strength on a log scale'], ['Off', 'off', 'Just the construction']] as const).map(([label, value, title]) => <button key={value} type="button" title={title}
        className={`cd-view-mode${fieldView === value ? ' is-on' : ''}`} aria-pressed={fieldView === value}
        onClick={() => setFieldView(value)}>{label}</button>)}
    </div>}
    <div className="cd-pad" role="group" aria-label="Move the view">
      {/* The four turn keys used to live here too. The view cube inside the figure now carries
          them, with the same names, and two controls doing one job is one too many -- the pad
          keeps zoom and the way home. */}
      <button type="button" className="cd-pad-key" title="Zoom out (minus key, or scroll)" aria-label="Zoom out" onKeyDown={viewKeys} onClick={() => zoomBy(1 / 1.18)} disabled={zoom <= ZOOM_MIN + 1e-6}>&minus;</button>
      <button type="button" className="cd-pad-key" title="Zoom in (plus key, or scroll)" aria-label="Zoom in" onKeyDown={viewKeys} onClick={() => zoomBy(1.18)} disabled={zoom >= zoomCeiling - 1e-6}>+</button>
      <button type="button" className="text-button cd-orbit-reset" onKeyDown={viewKeys} onClick={resetView} disabled={zoom === 1 && camera.yaw === opening.yaw && camera.pitch === opening.pitch}>Reset view</button>
    </div>
    </div>
    <div className="cd-caption"><span>{sourceText}</span>
    <details className="cd-controls" open={!compact}><summary>Keyboard help</summary>{/* A footnote on the caption line, not a fourth section. It used to be called "Diagram controls", which promised a second control panel and delivered the sliders the page already carries -- so a reader who opened it found the distance slider twice and concluded one of them was a different thing. It is the keyboard and screen-reader path: name it that, and the duplicates read as what they are, the same controls reachable another way. The drawn legend says how to turn and zoom; this says what a drawing cannot -- what Tab reaches, what Home and End do -- and says it to a reader who cannot see the legend at all. */}<p id={`${uid}help`}>The same controls the figure and the page carry, reachable from the keyboard — not a second set. Tab moves between them; arrow keys adjust one, Home and End take it to its limits. P and the integration bounds also drag in the figure.{inSpace?' The figure takes focus too: arrow keys turn it, plus and minus zoom, Home puts it back.':''}</p>
    <div className="cd-control-grid">
      {inSpace&&<button ref={cameraControl} type="button" className="cd-camera-control" aria-describedby={`${uid}camera-help`} onKeyDown={ev=>{if(['+','=','-','_'].includes(ev.key)){ev.preventDefault();zoomBy(ev.key==='-'||ev.key==='_'?1/1.18:1.18);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(ev.key)){ev.preventDefault();if(ev.key==='Home')setZoom(1);nudge(ev.key);}}} onClick={resetView}>Rotate view with arrow keys<span id={`${uid}camera-help`}>Left/right rotate; up/down tilt; Home or Enter resets.</span></button>}
      <label>Which piece is drawn<input type="range" aria-label="Selected charge element" min={0} max={n-1} step={1} value={selectedIndex} onChange={ev=>onSelect(Number(ev.target.value))}/></label>
      {id!=='arc'&&<label>Observation distance<input type="range" aria-label="Observation distance in meters" aria-valuetext={`${pretty(p.distance)} meters`} min={.5} max={6} step={.1} value={p.distance} onChange={ev=>setParams({distance:Number(ev.target.value)})}/></label>}
      {/* No percentage printed: this page reasons about the integral in symbols, and a reader who
          is told "63%" starts reading the figure as an arithmetic result. The handles in the
          figure carry a and b, and `aria-valuetext` still says the number to a screen reader,
          which has no figure to read it off. */}
      {mode==='integrate'&&onBoundRangeChange&&[0,1].map(i=><label key={i}>{i?'Upper':'Lower'} bound<input type="range" aria-label={`${i?'Upper':'Lower'} integration bound`} aria-valuetext={`${boundRange[i]} percent of the source coordinate`} min={0} max={100} step={1} value={boundRange[i]} onChange={ev=>{const next:[number,number]=[...boundRange];next[i]=Number(ev.target.value);onBoundRangeChange(next);}}/></label>)}
    </div></details></div>
    <output className="cd-announcement" aria-live="polite" aria-atomic="true">{announcement}</output>

  </div>;
});
