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
import type { Params, Problem, ProblemId } from '../problems/types';
import { field, magnitude, pretty, potential, type Vec } from '../symbolic/physics';
import { sampleDistribution, sumSamples, sumInterval, intervalWeights, sumPotential, activeIntervalIndex } from './sampling';
import { intervalKey, partitionCount, seamFractions, seamKey, splitFractions, splitProgress } from './subdivision';
import { acrossAxis, alongAxis, pairOrder, pairPhase, pairPlan, pairShares, pairStepAt, pairSum } from './pairs';
import { clampCamera, depthFromScreen, keyboardCamera, openingCamera, orbitCamera, projectCamera, surfaceUnit, type CameraView } from './camera';
import { ViewCube } from './ViewCube';
import { nearestOnBox, placeLabels, segmentBoxes, type Box, type HalfPlane, type Segment } from './labels';
import { area, rayMeetsLine, rayToEdge, rayToLine, sub as vsub, unit as direction, wedgePath, type Line } from './fan';
import { FieldCanvas } from './FieldCanvas';
import { FieldStage } from './three/FieldStage';
import { fieldsCollinear, runScene } from './three/runScene';
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
const scaleVec2 = (v: Point, k: number): Point => ({ x: v.x * k, y: v.y * k });
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
 * italic it reads as the product s·e·c. Its square goes with it: set back in the italic after an upright
 * "sec", the ² stood a letter's width off it, "sec ²θ".
 *
 * And the capital Greek, Δ and Σ, upright as the board's KaTeX sets them: the figure's slanted ΔE beside
 * the board's upright one were two different glyphs for one symbol, side by side.
 *
 * And α and φ in the board's own face. In the figure's serif, at its italic weight, α is a single-storey "a"
 * with a tail -- the footer's "λr sec²α Δα" read "sec²a Δa" right above the board's "sin α", on the lesson
 * whose axis has a real a -- and φ is the stroked form where the board's \varphi is the curly one: two glyphs
 * for one angle on one screen. KaTeX_Math is the face the board sets them in, and the page has it loaded. */
function setUpright(text: string) {
  const parts = text.split(/(\b(?:sec|cos|sin|tan)\b²?|[ΔΣ]|[αφ])/);
  return parts.length < 2 ? text : parts.map((t, i) => !(i % 2) ? t : /^[αφ]$/.test(t) ? <tspan key={i} className="cd-greek">{t}</tspan> : <tspan key={i} fontStyle="normal">{t}</tspan>);
}
function SymbolText({ symbol, tail }: { symbol: Sym; tail?: string }) {
  const cut = symbol.indexOf('_');
  if (cut < 0) return <>{setUpright(symbol)}{tail}</>;
  return <>{setUpright(symbol.slice(0, cut))}<tspan className="cd-sub" dy={`${SUB_DROP}em`} fontSize="72%">{symbol.slice(cut + 1)}</tspan>{tail !== undefined && <tspan dy={`${-SUB_DROP * .72}em`}>{tail}</tspan>}</>;
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
/** Where the band above the plot ends: the stage's name is set there while the run plays. */
const TITLE_BAND = 48;
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
function Vector({ from, to, color = 'var(--field)', width = 2.5, dashed = false, label, side, at = 'mid', reduced = false, ghost = false, dash = '6 4', keep = false, priority = 1, fade = 1, muted = false, clip, alts }: { from: Point; to: Point; color?: string; width?: number; dashed?: boolean; label?: Sym; side?: number; at?: 'mid' | 'tip'; reduced?: boolean; ghost?: boolean; dash?: string;
  /** A clip path for the stroke alone, never the name: the plot's window, as a last guard. */
  clip?: string;
  /** Further places its name may stand, "x y anchor;…", tried after the two it always has. */
  alts?: string;
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
    {/* Named down to a stub where the name is past the tip and is the stage's term: with P close to the end of
        a long rod, What cancels' surviving ΔE_x is six pixels long, and it went unnamed beside a named ΔE_y in
        the stage that says both parts survive. Beside its middle a name needs a shaft to stand beside. */}
    {label && length > (at === 'tip' && keep ? 4 : 10) && <text x={spot.x} y={spot.y} textAnchor={spot.anchor} className={'cd-vector-label' + (muted ? ' is-muted' : '')} fill="currentColor" data-symbol={label}
      data-mirror={`${pivot.x.toFixed(1)} ${pivot.y.toFixed(1)}`} data-alt={`${other.x.toFixed(1)} ${other.y.toFixed(1)} ${other.anchor}${alts ? ';' + alts : ''}`} data-priority={priority} data-keep={keep ? 'true' : undefined} data-shaft={shaft}><SymbolText symbol={label} /></text>}
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
/** HOW LONG THE RESTING ARROW IS, for a field of size `e` on a lesson whose fields run from `lo` to `hi`.
 *
 * It used to be the field over the next power of two above it, times a hundred: every resting arrow was
 * fifty to a hundred pixels whatever the field, with a jump of two at every power of two. Moving P away
 * could lengthen E, and adding charge could halve it -- the bisector's arrow was longer with P six metres
 * out than half a metre out, though the field there is forty times weaker -- and the sheet's σ slider, in
 * the lesson about σ alone setting the field, ran backwards across each jump. With no numbers on the page
 * the arrow's length is the only measure of the field a reader has, so it is now a length that grows with
 * the field and only with it: on a log scale, since the fields span four orders of ten, from the weakest
 * the lesson's sliders reach to the strongest. Fixed per lesson, so no slider can move the scale under the
 * arrow; below the weakest it shrinks in proportion, so a field of nothing is an arrow of nothing. */
export const REST_SHORT = 32, REST_LONG = 100;
export function restLength(e: number, [lo, hi]: readonly [number, number]): number {
  if (!(e > 0)) return 0;
  if (e <= lo) return REST_SHORT * e / lo;
  return REST_SHORT + (REST_LONG - REST_SHORT) * clamp(Math.log(e / lo) / Math.log(hi / lo), 0, 1);
}
/** The weakest and strongest field, or potential, a lesson's sliders can make: over every distance and size
 * the sliders reach, at the least charge and the most. Worked out once per lesson, from the closed forms. */
const RANGES = new Map<string, readonly [number, number]>();
export function lessonRange(id: ProblemId, kind: 'E' | 'V'): readonly [number, number] {
  const key = `${kind}:${id}`, known = RANGES.get(key);
  if (known) return known;
  let lo = Infinity, hi = 0;
  const phis = id === 'arc' && kind === 'E' ? [.1, .25, .5, .75, 1, 1.25, 1.5, 1.75, 1.9].map(f => f * Math.PI) : [Math.PI];
  const at = (q: Params) => kind === 'E' ? magnitude(field(id, q)) : Math.abs(potential(id, q));
  for (let d = .5; d <= 6.001; d += .25) for (let s = 1; s <= 8.001; s += .5) for (const phi of phis) {
    const q: Params = { distance: d, size: s, charge: 5, phi, element: .5, slices: 5, continuum: 0 };
    const strong = at(q), weak = at({ ...q, charge: .1 });
    if (strong > hi) hi = strong;
    if (weak > 0 && weak < lo) lo = weak;
  }
  const range = Number.isFinite(lo) && hi > lo ? [lo, hi] as const : [1, 10] as const;
  RANGES.set(key, range);
  return range;
}
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
  // A DEVICE THAT CANNOT DRAW IN SPACE GETS THE FLAT FIGURE. The scene needs WebGL, which a blocklisted GPU or a
  // policy can refuse; the stage then failed alone, and the figure above it stayed in space -- cube, axis letters,
  // the piece's wedge and its name floating round a note in an empty plot, ring, disk and sheet opening that way.
  // Once the stage says it cannot start (`onUnavailable`), the figure is drawn flat for good, with 3D turned off
  // and a line under the toolbar saying why.
  const [noScene, setNoScene] = useState(false);
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
  const inSpace = !noScene && (spatial ?? perspective);
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
  // THE SUM IN MIRROR PAIRS (see `pairs.ts`). Laid tip to tail in the order the pieces sit, a symmetric
  // charge's arrows arched over the axis -- on the endless line a half polygon with the field as its chord --
  // and the sideways parts cancelled only at the arch's far end, unseen. So where the charge has a mirror about
  // P's axis and the whole of it is summed, the run adds a piece and its mirror together: their sideways parts
  // go, their parts along the axis go in, and the sum is an arrow along the axis at every moment. The ring
  // goes round from the run's own piece. Over part of the charge -- the brackets dragged in -- nothing is
  // paired, and the sum is the chain.
  const pairedRun = !!build && supportsPair && boundRange[0] === 0 && boundRange[1] === 100 && (build.key === 'add' || build.key === 'limit');
  const pairStart = id === 'ring' && runPiece >= 0 ? runPiece : 0;
  const pairSlots = useMemo(() => pairedRun ? pairOrder(id, n, pairStart) : null, [pairedRun, id, n, pairStart]);
  const pairAt = pairSlots && handsOver && !handingOver ? pairStepAt(pairSlots.length, sumProgress) : null;
  const pairSlot = pairAt && pairSlots ? pairSlots[pairAt.k] : null;
  // The ring's last pair at an odd count is two half pieces: neither is a whole piece to light.
  const halfPair = pairSlot?.a.kind === 'half';
  // In Shrink them the piece the stage names dQ and brackets dy is a general one, well inside the charge. The run's
  // piece -- three quarters of the way along, or the end piece on the bisector -- became, as the pieces thinned,
  // the last sliver under the upper limit's handle: dQ and dy stood on "+L/2", and the general piece read as the
  // limit.
  const interior = (i: number) => clamp(i, Math.ceil(.15 * n), Math.max(Math.ceil(.15 * n), Math.floor(.85 * n) - 1));
  const selectedIndex = handingOver ? runPiece : pairSlot ? pairSlot.a.of : handsOver ? activeIntervalIndex(n, boundRange, sumProgress)
    : build?.key === 'limit' ? interior(clamp(Math.round(selected), 0, n - 1)) : clamp(Math.round(selected), 0, n - 1);
  const partnerIndex = id === 'ring' ? (selectedIndex + Math.floor(n / 2)) % n : n - 1 - selectedIndex;
  // A PIECE THAT IS ITS OWN MIRROR -- the middle one of an odd number, level with P -- has no partner: its
  // sideways part is nothing already. Paired with itself, it was drawn with a phantom mirror -- its ΔE twice,
  // a pair line over r_i, and a second ΔE_x laid on the first, so one piece showed twice its field, with α
  // lettered on an angle of nothing -- reached by picking the middle piece, or with no click at all from a
  // teacher's link at seven pieces. (The ring cut an odd number of ways has a mirror arc instead: see below.)
  const selfMirror = id !== 'ring' && partnerIndex === selectedIndex;
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
  // The pairs with their fields, and where the sum has got to: every step before this one in, and as much of
  // this one's part along the axis as the sum's arrow has taken. A piece is coloured in once all of it is in --
  // the ring's lengths straight across go in half a piece at a time -- and not while it is lit as the pair.
  const pairSteps = useMemo(() => pairSlots ? pairPlan(id, samples, pairStart) : null, [pairSlots, id, samples, pairStart]);
  const pairNow = pairSteps && pairAt ? { ...pairAt, ...pairPhase(pairAt.u), step: pairSteps[pairAt.k] } : null;
  const pairSoFar = pairNow && pairSteps ? pairSum(pairSteps, pairNow.k) : zero;
  const sample = samples[selectedIndex], total = sumSamples(samples);
  const weights = pairNow && pairSteps ? pairShares(pairSteps, n, pairNow.k).map(s => s > .999 ? 1 : 0) : intervalWeights(n,boundRange,sumProgress);
  const partial = pairNow && pairSteps ? pairSum(pairSteps, pairNow.k, pairNow.merge) : sumInterval(samples,boundRange,sumProgress);
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
  // While the run plays, one scale for the whole run, taken from its first cut as the field's is: read off the sum of
  // the moment, the column was drawn at one height per volt while it filled and rescaled as the last block went in --
  // every block below it shrinking by a few percent -- and back again as Shrink them began.
  const runOpen = !!build;
  const vRunCut = useMemo(() => runOpen && scalar ? sampleDistribution(id, shape, partitionCount(p.slices, 0)) : null, [runOpen, scalar, id, shape, p.slices]);
  const vScale = vRunCut ? Math.max(Math.abs(vExact), Math.abs(sumPotential(vRunCut)), ...vRunCut.map(s => Math.abs(s.potential)), 1e-12)
    : Math.max(Math.abs(vExact), Math.abs(vNow), ...samples.map(s => Math.abs(s.potential)), 1e-12);
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
  const baseUnit = perspective ? surfaceUnit(p.distance, (inSpace ? opening : FLAT).pitch, id === 'sheet' ? 0 : R, 371 - 10 - originAt1.y)
    : footed ? Math.min(45, 150 / p.size)
    : id === 'bisector' ? Math.min(45, 140 / R)
    : id === 'axial' ? fit(p.size + p.distance, 400, 20, 70)
    : id === 'arc' ? fit(2 * R, 300, 25, 65)
    // The semi-infinite line stands P straight up from its end, and at a fixed 35 a P six metres up sat
    // under the plot's top edge with its arrows squeezed into the corner and two thirds of the picture
    // empty. Fitted to P's height, as the ring, the disk and the sheet are.
    : id === 'semi' ? Math.min(35, Math.max(18, Math.floor(150 / Math.max(.5, p.distance) / 5) * 5))
    // The endless line has no length but r, so its picture is the same at every r: while the run plays, P stands at
    // least seventy units off it. At thirty-five per metre, P half a metre out stood seventeen units from the rod,
    // with θ and Δθ set on the rod over its + marks and the r bar a four-unit "H". Not at rest, where P is dragged:
    // a scale that followed P there would hold P still under the pointer while the drag ran away with r.
    : id === 'infinite' && build ? clamp(Math.round(70 / Math.max(.5, p.distance) / 5) * 5, 35, 140)
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
  // The ring's last pair at an odd count is two half pieces, and the line from P and the tag go to the lit half's own
  // middle: to the whole piece's, they ended at the end of the lit half, while the arrows at the tip were the half's.
  const halfMiddle = (span: { lo: number; hi: number }) => world((span.lo + span.hi) / 2);
  const selectedPoint = project(surface ? scaleVec(across, Math.abs(sample.position.x)) : halfPair && pairSlot ? halfMiddle(pairSlot.a) : sample.position), visible = (v: Point) => v.x > 45 && v.x < 665 && v.y > 58 && v.y < 365;
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
    // Where the sum goes in mirror pairs, what it reaches is the pairs' running sum along the axis and each
    // pair's arrows drawn from its tip -- not the arch the chain would have made, which is never drawn.
    const runPairs = supportsPair && full ? pairPlan(id, runSamples, id === 'ring' && runPiece >= 0 ? Math.floor((runPiece + .5) / n * runSamples.length) : 0) : null;
    if (runPairs) for (const st of runPairs) {
      for (const f of [st.fa, st.fb ?? zero, alongAxis(id, st.fa)]) reach.push(screen({ x: partialSum.x + f.x, y: partialSum.y + f.y, z: partialSum.z + f.z }));
      partialSum = { x: partialSum.x + st.along.x, y: partialSum.y + st.along.y, z: partialSum.z + st.along.z };
      reach.push(screen(partialSum));
    }
    for (const s of runSamples) { if (!runPairs) { partialSum = { x: partialSum.x + s.field.x, y: partialSum.y + s.field.y, z: partialSum.z + s.field.z }; reach.push(screen(partialSum)); } reach.push(screen(s.field)); }
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
  // AT REST, the field's own size sets the arrow's length, on the lesson's fixed scale: see `restLength`. The
  // run keeps its own scale above, fitted to the frame, since there the arrows are the subject.
  const restRange = build || scalar ? null : lessonRange(id, 'E'), restNorm = magnitude(total);
  const gain = restRange ? (restNorm > 0 ? restLength(restNorm, restRange) / restNorm : REST_SHORT / restRange[0]) : 100 / scaleValue * runScale;
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
    const stacked: Vec[] = supportsPair && stackSurvivors && !selfMirror ? [scaleVec(parts(f)[0], 2)] : [];
    let cap = Infinity;
    for (const v of stacked) {
      const hit = chargeAhead(v, ref), s = projectCamera(v, ref.yaw, ref.pitch), len = gain * Math.hypot(s.x, s.y);
      if (Number.isFinite(hit) && len > 1e-9) cap = Math.min(cap, Math.max(24, hit - 24) / len);
    }
    for (const v of [f, ...(selfMirror ? [] : [mirror]), ...parts(f), ...(selfMirror ? [] : parts(mirror)), ...stacked]) {
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
  // THE FIELD ITSELF, BESIDE THE PIECES' SUM, where the two plainly differ. At rest the arrow at P is the sum of
  // the reader's N pieces, drawn over field lines traced from the whole charge -- and with P close to a rod's end
  // and the rod cut in three, that sum points thirty degrees off the line through P, while a student is taught
  // that E is tangent to it, and nothing on the figure showed the field the lines belong to. So where the sum is
  // more than three degrees or eight percent off, E is drawn too, faintly, from P at the same scale. At the
  // defaults the two agree and nothing changes.
  const trueField = (() => {
    if (build || scalar || finished || !full || mode === 'sum' || mode === 'integrate') return null;
    const e = field(id, p), a = magnitude(displayed), b = magnitude(e);
    if (b < 1e-12 || a < 1e-12) return null;
    const off = Math.acos(clamp((e.x * displayed.x + e.y * displayed.y + e.z * displayed.z) / (a * b), -1, 1));
    return off > 3 * Math.PI / 180 || Math.abs(a / b - 1) > .08 ? fieldScreen(e) : null;
  })();
  // The chain of every piece's arrow, tip to tail. Drawn through "Shrink them" too, recomputed at
  // the partition of the moment: the stage says each piece's arrow shrinks while there are ever more
  // of them, and the chain is where that is seen -- its links multiply and shorten into a smooth
  // curve while its end stays on the tip of the field. It used to vanish on the stage's first frame.
  // Not where the run adds in mirror pairs: there the sum is drawn as the pairs and the arrow they build.
  const chaining = !scalar && !pairedRun && (mode === 'sum' || build?.key === 'limit');
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
    // So too wherever the pieces push so nearly the same way that the chain would lie inside the arrow's shaft
    // -- a short rod with P far off, a small ring seen from high above -- by the rule the scene lays it beside
    // by: within one part in twenty of the sum's line. Left on the line there, Add them up showed one arrow with a
    // row of dots on it, and no sum; and the flat view and the scene told it two ways.
    const u = (id === 'axial' || surface || fieldsCollinear(samples.map(s => s.field))) && chainPoints.length > 1 ? direction(vsub(chainPoints[chainPoints.length - 1], P)) : null;
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
  const newestLink = chainPoints.length > 1 && Math.hypot(chainPoints[chainPoints.length - 1].x - chainPoints[chainPoints.length - 2].x, chainPoints[chainPoints.length - 1].y - chainPoints[chainPoints.length - 2].y) > 6
    ? [chainPoints[chainPoints.length - 2], chainPoints[chainPoints.length - 1]] as [Point, Point] : null;
  // THE PAIR GOING IN, drawn from the tip of the sum so far, as What cancels drew a pair at P: the piece's arrow
  // and its mirror's, each resolved into its part along the axis and its part across (dashed). The parts across
  // shrink to nothing toward each other, the mirror's part along the axis slides out to lie tip to tail on the
  // piece's, and the sum's arrow, drawn over them, grows along the axis to take both in. The whole arrows go as
  // their parts across do. The middle piece of an odd count lies on the axis: its arrow is all along it.
  //
  // DRAWN LARGER WHILE IT ARRIVES, where at the sum's own scale it would be a burst of arrowheads. Each pair is two Nths of
  // the sum: on the ring, cut finely, or with a strong charge, its arrows came out one arrowhead long, and the parts across
  // shrinking toward each other -- the whole of the stage's argument -- read as a star over P. So a pair shorter than about
  // forty-four units is drawn at that length as it arrives and cancels, and eases to its true length as the sum takes it
  // in, so what goes in is what the sum grows by; the corner says so while it is enlarged. Never past the plot's edge,
  // nor up into the vertical axis' letter: on the ring the pair rises up the z axis, and a head ending on the z read as
  // the axis' own arrowhead (see `roomFor`).
  const pairGain = pairNow ? (() => {
    const f = fieldScreen(pairNow.step.fa), own = Math.hypot(f.x, f.y);
    if (own < 1e-6) return 1;
    const from = plus(P, fieldScreen(pairSoFar)), top = axisTop + .39 * SYM * labelScale + 4;
    let cap = Infinity;
    // ...the parts along the axis too, which line up tip to tail as the parts across go: on the ring, twice the piece's
    // part up the axis is longer than the piece's whole arrow.
    for (const v of [pairNow.step.fa, pairNow.step.fb ?? zero, pairNow.step.along]) {
      const s = fieldScreen(v), len = Math.hypot(s.x, s.y);
      if (len < 1e-6) continue;
      const edge = rayToEdge(from, { x: s.x / len, y: s.y / len }, { x: 52, y: top, width: 606, height: 361 - top });
      cap = Math.min(cap, Math.max(0, Math.hypot(edge.x - from.x, edge.y - from.y) - 12) / len);
    }
    return Math.max(1, Math.min(44 * labelScale / own, cap));
  })() : 1;
  const pairM = pairNow ? pairGain + (1 - pairGain) * pairNow.merge : 1;
  const pairDraw = pairNow ? (() => {
    const { step, grow, cancel, merge } = pairNow;
    const m = pairM;
    const from = plus(P, fieldScreen(pairSoFar)), g = (v: Vec, k = 1) => fieldScreen(v, grow * k * m);
    const aKeep = g(alongAxis(id, step.fa)), bKeep = step.fb ? g(alongAxis(id, step.fb)) : null;
    const aDrop = g(acrossAxis(id, step.fa), 1 - cancel), bDrop = step.fb ? g(acrossAxis(id, step.fb), 1 - cancel) : null;
    const across = Math.hypot(fieldScreen(acrossAxis(id, step.fa)).x, fieldScreen(acrossAxis(id, step.fa)).y);
    return { from, a: g(step.fa), b: step.fb ? g(step.fb) : null, aKeep, bKeep, aDrop, bDrop, bKeepFrom: plus(from, scaleVec2(aKeep, cancel)),
      hasDrop: !!step.fb && across > 1, whole: clamp(1 - cancel * 1.25, 0, 1), dropFade: clamp((1 - cancel) * 6, 0, 1), keepFade: 1 - merge };
  })() : null;
  // A TICK ACROSS THE SUM'S ARROW WHERE EACH PAIR'S SHARE ENDS: long steps for the near pairs, short for the far.
  // In Shrink them they crowd and fade as the pieces multiply, as the chain's links used to. Not at the arrow's
  // own tip, where its head is, nor closer than a few units to the last one drawn.
  //
  // ONLY WHERE THE ARROW IS. Past half a turn the arc's far pairs push back: the sum runs out and comes back, and
  // its earlier ends were left as ticks on bare axis past the arrow's head -- at φ = 2π, beside "E = 0", ticks
  // marking shares of an arrow that is not there. A share the sum went past and came back from is drawn as what
  // it is, a part that has gone: a ghost of the axis out to the farthest the sum reached, dashed and faint as
  // What cancels draws its ghosts, its ticks on it. And never closer than ten units, where a ring cut thirty ways
  // packed seven across the arrow into a fishbone.
  const pairTicks = (() => {
    const none = { d: '', ghost: '', ghostTicks: '' };
    if (!pairSteps) return none;
    const ends = pairNow ? pairNow.k : build?.key === 'limit' ? pairSteps.length : 0;
    const u = direction(fieldScreen(id === 'ring' ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }));
    if (!u || ends < 1) return none;
    const nrm = { x: -u.y, y: u.x }, tipV = fieldScreen(displayed), tipA = tipV.x * u.x + tipV.y * u.y;
    const at = (a: number) => ({ x: P.x + u.x * a, y: P.y + u.y * a });
    const tick = (a: number) => { const c = at(a); return `M${(c.x - nrm.x * 6).toFixed(1)} ${(c.y - nrm.y * 6).toFixed(1)}L${(c.x + nrm.x * 6).toFixed(1)} ${(c.y + nrm.y * 6).toFixed(1)}`; };
    const along = Array.from({ length: ends }, (_, j) => { const c = fieldScreen(pairSum(pairSteps, j + 1)); return c.x * u.x + c.y * u.y; });
    // The way the arrow points, or with no arrow to speak of, the way the sum went.
    const far = along.reduce((m, a) => Math.abs(a) > Math.abs(m) ? a : m, 0), sign = Math.abs(tipA) >= 9 ? Math.sign(tipA) : Math.sign(far) || 1;
    const reach = Math.abs(tipA) >= 9 ? Math.abs(tipA) : 0;
    let d = '', lastOn = 0, ghostTicks = '', lastOver = -Infinity;
    for (const a of along) {
      const s = a * sign;
      if (s > 4 && s < reach - 9 && s - lastOn >= 10) { d += tick(s * sign); lastOn = s; }
    }
    const farthest = Math.max(0, ...along.map(a => a * sign));
    if (farthest < reach + 9) return { d, ghost: '', ghostTicks: '' };
    for (const a of [...along].sort((x, y) => x * sign - y * sign)) {
      const s = a * sign;
      if (s > reach + 6 && s - lastOver >= 10) { ghostTicks += tick(s * sign); lastOver = s; }
    }
    const g0 = at(sign * (reach + 3)), g1 = at(sign * farthest);
    return { d, ghost: `M${g0.x.toFixed(1)} ${g0.y.toFixed(1)}L${g1.x.toFixed(1)} ${g1.y.toFixed(1)}`, ghostTicks };
  })();
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
    // The ring's last pair at an odd count lights half a piece, not the piece.
    const lo = halfPair && pairSlot ? pairSlot.a.lo : selectedIndex / n, hi = halfPair && pairSlot ? pairSlot.a.hi : (selectedIndex + 1) / n;
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
  // THE FAN'S RAYS AFTER CUT IT UP. Faint, they ran through θ, α, x, y and r_i in every stage after it, two to six
  // crossings a frame. One piece and What cancels draw the piece's own triangle, whose angle the rays only cut across,
  // so there they go; in Add them up the chosen wedge's own two stay, as lines no name is set across, to say which
  // angle the tag names when its piece is off the page -- with them gone, ΔQ hung on the dashed line to P in empty space.
  const chosenRays = new Set(fan ? [selectedIndex, selectedIndex + 1].flatMap(i => id === 'sheet' ? [seamKey(i / n) + ':r', seamKey(i / n) + ':l'] : [seamKey(i / n)]) : []);
  const raysShown = fan ? fan.rays.filter(r => !build || build.key === 'pieces' || (build.key === 'add' && chosenRays.has(r.key))) : [];
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
  // ...and at rest, while one piece's arrow is resolved into its parts: in the view whose subject is the parts,
  // Σ ΔE ran along the same line as the part that survives and covered it, and the placer hid the surviving
  // part's name while the part that cancels kept its own -- the component the derivation keeps was the one
  // thing on the figure with no name. The sum comes back when the reader asks to add.
  const hideAnswer = building === 'pieces' || building === 'one' || building === 'cancel' || (!build && mode === 'project' && components);
  // The sum's own arrow, once nothing is drawn that it could be mistaken for, or be shorter than.
  const netShown = !scalar && !hideAnswer && !handOver;
  // E BESIDE THE SUM, where the two point the same way. Drawn from P along the sum's own line, the field's arrow lay
  // inside the sum's shaft: shorter, its head sat halfway along the sum's arrow and its name was hidden -- one arrow
  // with two heads -- and longer, its name stood beside the sum's and the two read as one label, "Σ ΔE E". So it is
  // laid off ten units to the side, on the side away from the sum's name, with a short tick back to the line at each
  // end, as the chain is laid beside the field it sums to.
  const trueOffset = (() => {
    if (!trueField || !netShown) return null;
    const a = direction(net), b = direction(trueField);
    if (!a || !b || a.x * b.x + a.y * b.y < Math.cos(6 * Math.PI / 180)) return null;
    const s = awayFrom(net, toCharge) ?? (Math.abs(a.x) >= Math.abs(a.y) ? (a.x > 0 ? -1 : 1) : (a.y > 0 ? -1 : 1));
    return { x: a.y * s * 10, y: -a.x * s * 10 };
  })();
  const trueFrom = trueOffset ? plus(P, trueOffset) : P;
  const cutAt = (t: number) => ({ '--t': t.toFixed(3) }) as CSSProperties;
  const elementSymbol = continuum>=.999 ? 'dQ' : 'ΔQ';
  const fieldSymbol = continuum>=.999 ? 'dE' : 'ΔE';
  // Cut into an odd number of pieces, a ring has no piece straight across from any other: the point
  // opposite a piece's middle falls on a cut. Lighting piece i + floor(n/2) lit one 144 degrees
  // away whose sideways push does not cancel at all. So the mirror is drawn as what it is -- an arc
  // of the same length, centred straight across -- and no whole piece is lit in its place.
  const mirrorArc = id === 'ring' && n % 2 === 1;
  // A potential lesson has a mirror partner wherever its field twin does, and showing it is the
  // point: the piece that CANCELS the field's sideways push ADDS the same amount to V.
  const scalarPartner = scalar && pair && !selfMirror && (id === 'bisector' || id === 'ring' || id === 'arc');
  // The partner piece is marked on the charge whenever its arrow is being shown.
  // ...and while the run adds in mirror pairs, the pair going in: both of its pieces lit together.
  const pairLit = !!pairSlot?.b && !halfPair;
  const partnerLit = ((building === 'cancel' || pair) && !selfMirror && (supportsPair || scalarPartner)) || pairLit;
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
  //
  // ONLY FOR AS LONG AS SOMETHING READS IT. A custom property on the root restyles every element under it, labels and
  // footer included, and it was written on every tick of the clock in every stage -- one to three milliseconds of style
  // a frame, the most of any single cost in One piece -- while the cuts are done in two and a half seconds and the
  // arrows have grown in one. So the time is held at the end of what the stage's stylesheet animates, and written only
  // when it changes.
  const runClock = build?.clock, stageStartsAt = build?.start ?? 0, runSeconds = build?.seconds ?? 0;
  const clockedSpan = building === 'pieces' ? 2.6 : building === 'one' || building === 'cancel' ? 1 : 0;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!runClock) { el.style.removeProperty('--cd-local'); return; }
    let last = '';
    const write = () => {
      const t = `${clamp(runClock.get() - stageStartsAt, 0, Math.min(clockedSpan, runSeconds > 0 ? runSeconds : Infinity)).toFixed(3)}s`;
      if (t !== last) { last = t; el.style.setProperty('--cd-local', t); }
    };
    write();
    return runClock.subscribe(write);
  }, [runClock, stageStartsAt, runSeconds, clockedSpan]);
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
  const partnerPos = halfPair && pairSlot?.b ? project(halfMiddle(pairSlot.b)) : id === 'ring' ? project({ x: -sample.position.x, y: -sample.position.y, z: 0 }) : project(samples[partnerIndex].position);
  // The pair going in has a line from each of its two to P -- the two half pieces of the ring's last pair as well.
  const pairLines = pairLit || (halfPair && !!pairSlot?.b);
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
  const pairing = pair && supportsPair && !selfMirror;
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
    // Without scrolling: a press on a figure half under the window's edge scrolled the page under the drag.
    onPointerDown: (ev: PointerEvent<SVGSVGElement>) => { if (onControl(ev.target)) return; stopGlide(); ev.currentTarget.focus({ preventScroll: true }); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* no live pointer to capture: the drag still starts */ } dragging.current = 'orbit'; setActiveDrag(true); orbitFrom.current = { x: ev.clientX, y: ev.clientY }; spin.current = { yaw: 0, pitch: 0, at: performance.now() }; },
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
    // An angle of nothing is not marked: the middle piece level with P has none, and its letter on two sides
    // lying along each other named an angle that is not there.
    if (opening < 2 * Math.PI / 180) return null;
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
      return { node: <>{arc.node}<text className="cd-angle" x={c.x.toFixed(1)} y={(c.y + .3 * size).toFixed(1)} textAnchor="middle" data-anchor="fixed" {...keep}>{setUpright(name)}</text></>, arc: arc.points, leader: null,
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
    return { node: <>{arc.node}<line className="cd-angle-leader" x1={from.x.toFixed(1)} y1={from.y.toFixed(1)} x2={to.x.toFixed(1)} y2={to.y.toFixed(1)} /><text className="cd-angle" x={c.x.toFixed(1)} y={(c.y + .3 * size).toFixed(1)} textAnchor="middle" data-anchor="fixed" {...keep}>{setUpright(name)}</text></>, arc: arc.points, leader: [from, to] as [Point, Point], box };
  };
  const circlePoints = (radius: number, start = 0, end = Math.PI * 2) => Array.from({ length: 97 }, (_, i) => project({ x: radius * Math.cos(start + (end - start) * i / 96), y: radius * Math.sin(start + (end - start) * i / 96), z: 0 }));
  const radiusTip = ray({ x: 1, y: 0, z: 0 }, Math.min(surface ? sample.position.x : R, 7) * unit);
  // THE DISK'S OWN RADIUS. Its answer is written in R, and the figure lettered only s -- the radius of the
  // chosen ring, on the line from O to it -- so in Shrink them, with a handle at each end of that line, s
  // read as the disk's radius. R is its own dimension, out to the rim at another azimuth, toward the reader
  // and to the left, clear of the s line and of both axes in either view.
  // Seen flat, the radius at that azimuth foreshortens to a stub at O, and R stood beside the z bar, which then read
  // as having two names. There R is a dimension of its own under the disk's left half, true length side-on, as a
  // drawing dimensions the radius of a part seen edge-on: see `dims`.
  // (Where there is no room for it under the disk -- a phone, with the flat disk lifted toward the footer -- the radius
  // at that azimuth is kept.)
  const flatR = id === 'disk' && !inSpace ? (() => { const y = O.y + R * unit * Math.abs(Math.sin(view.pitch)) + 16; return y + 9 + 1.37 * SYM * labelScale <= FOOTER_BAND ? y : null; })() : null;
  const rim = id === 'disk' && flatR === null ? (() => {
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
  // DRAWN AS A DRAFTSMAN DRAWS A BREAK: the ground between each pair of strokes, right across the rod, so the
  // line is plainly cut there -- and each stroke on a ring of the ground. Charge-coloured strokes laid on a piece
  // filled with the charge's colour vanished into it, all but their tips: on the endless line the run's piece is
  // the outermost one, and its "+∞" named a break nobody could see.
  const breakGaps = breaks.map((_, k) => k % 2 ? null : breaks[k + 1]).map((next, k) => {
    if (!next) return null;
    const first = breaks[k], across = (q: Point) => upright ? q.x - O.x : q.y - O.y;
    const on = ([a, b]: [Point, Point], c: number): Point => { const t = (c - across(a)) / (across(b) - across(a)); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };
    const w = rodHalf + 2;
    return [on(first, -w), on(first, w), on(next, w), on(next, -w)].map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  }).filter((g): g is string => !!g);
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
    // Clear of the breaks here too: in the limit the line's marks come from the partition, and a + stood between
    // the two strokes of each break, its ground ring cutting one of them in two.
    : Array.from({ length: Math.max(1, n) }, (_, i) => rodLow + pieceSpan * (i + .5)).filter((v, i) => i % markStride === 0 && clearOfBreaks(v));
  const arcMarks = id === 'arc' && !inSpace ? (() => {
    const per = Math.abs(p.phi) * R * unit / n, stride = Math.max(1, Math.ceil(19 * labelScale / Math.max(1, per)));
    // Not under the y axis' letter, where an arc that reaches round to the axis ends.
    const k = labelScale, letter = { x0: O.x + 11 - 3, x1: O.x + 11 + .8 * SYM * k + 3, y0: axisTop - .98 * SYM * k - 3, y1: axisTop + .45 * SYM * k + 3 };
    const clearOfAxisLetter = (q: Point) => q.x + 7 * k < letter.x0 || q.x - 7 * k > letter.x1 || q.y + 6 * k < letter.y0 || q.y - 13 * k > letter.y1;
    return Array.from({ length: n }, (_, i) => i).filter(i => i % stride === 0).map(i => ({ key: intervalKey(i, n), at: project(world((i + .5) / n)), lit: i === selectedIndex || (partnerLit && i === partnerIndex) })).filter(m => clearOfAxisLetter(m.at));
  })() : [];
  // Which marks sit on a piece painted in the charge's own colour -- the chosen piece and its
  // mirror partner -- so they can be drawn in the ground colour there instead of vanishing into it.
  const spanOf = (i: number): [number, number] => { const a = along(project(world(i / n))), b = along(project(world((i + 1) / n))); return [Math.min(a, b), Math.max(a, b)]; };
  const filledSpans = rodLike && !ramp ? [spanOf(selectedIndex), ...(partnerLit && partnerIndex !== selectedIndex ? [spanOf(partnerIndex)] : [])] : [];
  const onFill = (v: number) => filledSpans.some(([a, b]) => v > a + 1 && v < b - 1);
  // Written as the derivation beside it writes it, in the lesson's own coordinate: a reader who
  // sees ΔQ = λΔy in the panel should not find ΔQ = λΔℓ under the figure and wonder what ℓ is.
  const coordinate = id === 'axial' || id === 'semi' ? 'x' : 'y', d = continuum >= .999 ? 'd' : 'Δ';
  // Written as a symbol and what follows it, so the ramp's λ₀ is a real subscript: see SymbolText.
  // THE EQUAL-ANGLE LESSONS' PIECE, while it is a piece: what the board defines ΔQ as, the point charge at
  // the piece's middle angle -- λ r sec²θ Δθ -- not λΔy. The same symbol named two different charges, the
  // footer's infinite for the outermost piece, and a student computed λΔy. Once the pieces are gone the two
  // agree, and the limit's dQ is written in the variable the board integrates over: the coordinate again on the
  // semi-infinite line and the sheet, whose boards integrate in x and s -- and on the endless line θ, whose
  // board's integral is over θ: written dQ = λ dy there, two dQ's stood on one screen at the moment the
  // student decides what to integrate over.
  // No middle dot in σ 2πs: the board sets the two side by side, and one definition was set two ways.
  const standIn = UNBOUNDED.has(id) && (continuum < .999 || id === 'infinite');
  const sourceLabel: { symbol: Sym; tail?: string } = standIn
    ? (id === 'sheet' ? { symbol: `${elementSymbol} = σ 2πs z sec²α ${d}α` } : { symbol: `${elementSymbol} = λr sec²${id === 'infinite' ? `θ ${d}θ` : `α ${d}α`}` })
    : surface ? { symbol: `${elementSymbol} = σ 2πs ${d}s` } : id === 'ring' || id === 'arc' ? { symbol: `${elementSymbol} = λR ${d}θ` } : ramp ? { symbol: `${elementSymbol} = λ_0`, tail: `(y/L) ${d}y` } : { symbol: `${elementSymbol} = λ ${d}${coordinate}` };
  const sourceText = id === 'disk' ? 'One ring sweeps out the disk' : id === 'sheet' ? 'A section of a sheet that never ends · one ring is one angle at P' : surface ? 'Whole annulus · transverse fields cancel' : id === 'infinite' ? 'A section of a line that never ends · one piece is one angle at P' : id === 'semi' ? 'A section of a line with one end · one piece is one angle at P' : id === 'arc' ? 'Observation point fixed at the centre' : id === 'ring' ? 'One piece at a time · every piece is the same distance from P' : 'One piece at a time · the integral adds them all';
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
    // R IS ITS OWN RADIUS, out to the arc's lower end, with a tick at each end, lettered beside its middle on the
    // side away from φ. It used to lie along the x axis, with no stroke of its own, and its letter stood inside
    // the grey φ mark -- a second, inner arc concentric with the charge -- and read as that mark's radius; the
    // radius slider lit only a stretch of the axis.
    const lowEnd = -half, rTip = project({ x: R * Math.cos(lowEnd), y: R * Math.sin(lowEnd), z: 0 });
    const rDir = direction(vsub(rTip, O)) ?? { x: 0, y: 1 };
    const awayW = project({ x: Math.cos(lowEnd - Math.PI / 2), y: Math.sin(lowEnd - Math.PI / 2), z: 0 }), away = direction(vsub(awayW, project(zero))) ?? { x: -1, y: 0 };
    const rAt = (f: number, sgn: number) => besidePoint({ x: O.x + (rTip.x - O.x) * f, y: O.y + (rTip.y - O.y) * f }, { x: away.x * sgn, y: away.y * sgn }, 7, size);
    const rSpot = rAt(.5, 1), rAlt = [rAt(.3, 1), rAt(.7, 1), rAt(.5, -1)].map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`).join(';');
    const nrm = { x: -rDir.y, y: rDir.x }, tick = (q: Point) => `M${(q.x - nrm.x * 5).toFixed(1)} ${(q.y - nrm.y * 5).toFixed(1)}L${(q.x + nrm.x * 5).toFixed(1)} ${(q.y + nrm.y * 5).toFixed(1)}`;
    const rPath = `M${O.x.toFixed(1)} ${O.y.toFixed(1)}L${rTip.x.toFixed(1)} ${rTip.y.toFixed(1)}${tick(O)}${tick(rTip)}`;
    // φ's mark, an angle's dimension: a hairline arc with an arrowhead at each end, pointing out to the sides it
    // measures between.
    const rho = R * PHI_AT, headAt = (end: number, along: number) => {
      const tip = project({ x: rho * Math.cos(end), y: rho * Math.sin(end), z: 0 }), back = project({ x: rho * Math.cos(end - along * .12), y: rho * Math.sin(end - along * .12), z: 0 });
      const u = direction(vsub(tip, back)) ?? { x: 1, y: 0 }, n2 = { x: -u.y, y: u.x };
      return `M${(tip.x - u.x * 7 + n2.x * 3.5).toFixed(1)} ${(tip.y - u.y * 7 + n2.y * 3.5).toFixed(1)}L${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${(tip.x - u.x * 7 - n2.x * 3.5).toFixed(1)} ${(tip.y - u.y * 7 - n2.y * 3.5).toFixed(1)}`;
    };
    const phiHeads = half * 2 < 2 * Math.PI - .05 ? headAt(half, 1) + headAt(-half, -1) : '';
    return { phi, phiAlt, phiWithin, rAlt, rSpot, rTip, rPath, phiHeads };
  })() : null;
  // Where the origin is named: beside O, clear of the charge drawn through it and of the brackets.
  const originLabel = upright ? { x: O.x - rodHalf - 6, y: O.y + 20 } : { x: O.x - 7, y: O.y + 21 };
  // The sheet's rim on the line across the screen, for the marks that say it goes on: flat view only.
  const sheetRim = (() => {
    const l = project({ x: -6.6, y: 0, z: 0 }), r = project({ x: 6.6, y: 0, z: 0 });
    return { left: { x: clamp(l.x, 62, 640), y: l.y }, right: { x: clamp(r.x, 80, 646), y: r.y } };
  })();
  // A dimension bar: a line beside what it measures with a short tick across each end.
  type Dim = { key: string; dim: string; a: Point; b: Point; path: string; name: string; label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } | null; extension?: [Point, Point]; alt?: string; within?: string };
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
  //
  // AND IN SHRINK THEM, where the board says each Δy becomes dy: the step a student weak on calculus most needs
  // to see -- the piece becoming the differential -- was only in the footer. A piece too narrow to bracket by
  // then gets a bracket of a fixed, readable width centred on it, named dy. (Not on the endless line, whose
  // board integrates over θ: its dθ is marked at P, below.)
  const shrinking = building === 'limit';
  //
  // ON THE AXIS LESSON, AND ON THE DISK AND THE SHEET, TOO. Their footers and boards say "a piece Δx long" and "a ring
  // of width Δs", and the sheet's board sends the reader to "the width Δs bracketed on the figure": nothing was
  // bracketed. The axis lesson's is under the rod, as the semi-infinite line's is; a ring's is across its width,
  // along the line its radius s is drawn on, on the side away from P -- a true segment in space as well as flat.
  // Not the sheet's outermost ring, which has no outer edge.
  const pieceLength = (() => {
    if (!(building === 'pieces' || building === 'one' || shrinking || highlight === 'element')) return null;
    const size = SYM * labelScale, spot = (q: { x: number; y: number; anchor: string }) => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`;
    // The axis lesson's in space too, on the rod as projected: its bracket, under the rod seen flat, is drawn by the flat
    // view's fixed rows, and was simply left out once the view turned -- with the Δx the footer writes ΔQ in.
    const projected = surface || (inSpace && id === 'axial');
    if (projected) {
      if (id === 'sheet' && selectedIndex >= n - 1) return null;
      const end = (t: number) => project(surface ? { x: Math.abs(world(t).x), y: 0, z: 0 } : world(t));
      let a = end(selectedIndex / n), b = end((selectedIndex + 1) / n);
      if (!visible(a) || !visible(b)) return null;
      const u = direction(vsub(b, a));
      if (!u) return null;
      const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (Math.hypot(b.x - a.x, b.y - a.y) < 12) { if (!shrinking) return null; a = { x: middle.x - u.x * 6, y: middle.y - u.y * 6 }; b = { x: middle.x + u.x * 6, y: middle.y + u.y * 6 }; }
      let nrm = { x: -u.y, y: u.x };
      // Away from P; on the rod, which P stands in line with, on its lower side, away from r_i's bracket.
      if (surface ? nrm.x * (P.x - middle.x) + nrm.y * (P.y - middle.y) > 0 : nrm.y < 0) nrm = { x: -nrm.x, y: -nrm.y };
      const at = (q: Point, k = 9): Point => ({ x: q.x + nrm.x * k, y: q.y + nrm.y * k }), A = at(a), B = at(b), M = at(middle);
      const tick = (q: Point) => `M${(q.x - nrm.x * 4).toFixed(1)} ${(q.y - nrm.y * 4).toFixed(1)}l${(nrm.x * 8).toFixed(1)} ${(nrm.y * 8).toFixed(1)}`;
      const label = besidePoint(M, nrm, 5, size), ends = [direction({ x: nrm.x - u.x, y: nrm.y - u.y }) ?? nrm, direction({ x: nrm.x + u.x, y: nrm.y + u.y }) ?? nrm];
      return { name: `${continuum >= .999 ? 'd' : '\u0394'}${surface ? 's' : coordinate}`, path: `M${A.x.toFixed(1)} ${A.y.toFixed(1)}L${B.x.toFixed(1)} ${B.y.toFixed(1)}${tick(A)}${tick(B)}`, label, mirror: M, ends: [A, B] as [Point, Point],
        alt: [besidePoint(A, ends[0], 5, size), besidePoint(B, ends[1], 5, size)].map(spot).join(';'), within: `${at(middle, 4).x.toFixed(1)} ${at(middle, 4).y.toFixed(1)} ${nrm.x.toFixed(3)} ${nrm.y.toFixed(3)}` };
    }
    if (inSpace || !(upright || id === 'semi' || id === 'axial') || (shrinking && id === 'infinite')) return null;
    let [lo, hi] = spanOf(selectedIndex);
    if (lo < rodLow - 1 || hi > rodHigh + 1) return null;
    if (hi - lo < 12) { if (!shrinking) return null; const c = (lo + hi) / 2; lo = c - 6; hi = c + 6; }
    const name = `${continuum >= .999 ? 'd' : '\u0394'}${coordinate}`;
    // Its letter stays on the bracket's side of the rod, past either end of the bracket if its middle is
    // taken: reflected through the bracket, which stands against the rod, it landed across the rod from
    // the bracket on a phone, beside the other side of the piece.
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
  // On a phone, where the letters are half as large again, by as much again: at 22 the Δy's middle spot did not fit
  // between the two brackets, and Δy jumped past the end of its bracket onto the next piece.
  // While the run is open they stand there in every stage, not only while the bracket is drawn: dimension lines that
  // jumped twenty units at three stage changes read as lengths that changed.
  const lOut = (pieceLength || build) && upright ? 22 + 26 * (labelScale - 1) : 0;
  // And the axis lesson's L and a bars stand lower, under the piece's bracket.
  const barY = O.y + 34 + ((pieceLength || build) && id === 'axial' ? 20 + 18 * (labelScale - 1) : 0);
  // THE ROD'S ENDS, while the limits are the subject -- Add them up, which runs the sum from one end to the
  // other, and Shrink them, which turns the ends into the integral's limits. At no priority and with nowhere
  // else to go, a rod's end names were the first the placer dropped: with P close in, "x = L" was hidden in
  // every frame of the axis lesson, Shrink them included, and the bisector lost +L/2 in One piece and
  // −L/2 under the r bar's tick. Kept then, with places past each end and across the rod to go to.
  const limitsTerm = building === 'add' || building === 'limit' || highlight === 'bounds' || (!build && mode === 'integrate');
  const endAttrs = limitsTerm ? { 'data-keep': 'true', 'data-priority': 2 } : {};
  const rodEndAlt = (() => {
    const spot = (x: number, y: number, anchor: string) => `${x.toFixed(1)} ${y.toFixed(1)} ${anchor}`;
    if (id === 'axial') {
      const x = O.x + p.size * unit;
      return { top: [spot(x, O.y - rodHalf - 10, 'middle'), spot(x + 10, barY + 8 + 1.9 * SYM * labelScale, 'middle')].join(';'), bottom: '', topWithin: undefined, bottomWithin: undefined };
    }
    const top = id === 'bisector' ? O.y - R * unit : O.y - p.size * unit, bottom = id === 'bisector' ? O.y + R * unit : O.y;
    const under = id === 'bisector' ? Math.min(bottom + 20, 366) : O.y - 9;
    return {
      // On P's side of the rod only: across it, an end's name stood by L's bracket and read as a second name for it.
      // And past its own end, never beside the rod: the spot twenty units in from the top stood level with the first
      // cut, beside the piece Cut it up lights, and "+L/2" read as that piece's lower edge, the piece running on past
      // the rod's end. Further above, or out to the right, instead -- or with nowhere, hidden with the other end.
      top: [spot(O.x + 17, top - 28, 'start'), spot(O.x + 60, top - 8, 'start'), spot(O.x + 17, top - 48, 'start')].join(';'),
      bottom: [spot(O.x + 17, Math.min(under + 22, 368), 'start'), ...(id === 'bisector' ? [spot(O.x + 60, Math.min(bottom + 20, 366), 'start')] : [spot(O.x + 17, O.y + 24, 'start')])].join(';'),
      topWithin: `${(O.x + rodHalf).toFixed(1)} 0 1 0;0 ${top.toFixed(1)} 0 -1`,
      bottomWithin: `${(O.x + rodHalf).toFixed(1)} 0 1 0${id === 'bisector' ? `;0 ${bottom.toFixed(1)} 0 1` : ''}`,
    };
  })();
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
    // Its letter stays on P's side of the rod: with P close in, moved across the rod it named the charge's
    // far side, with the rod and its + marks between it and its bar.
    const within = `${(O.x + rodHalf).toFixed(1)} 0 1 0`;
    if (y + 9 + 1.37 * SYM * labelScale <= FOOTER_BAND) dims.push({ ...dimBar('r', 'distance', { x: O.x + rodGap, y }, { x: P.x, y }, 'r', 1), within });
    else {
      // No room below them -- P low in the frame, as level with a rod's end: the bar stays where it was
      // and stops short of whatever comes down from P, its last stretch a thin extension line under it.
      const at = O.y + 36, end = { x: P.x - 10, y: at };
      dims.push({ ...dimBar('r', 'distance', { x: O.x + rodGap, y: at }, end, 'r', 1), extension: [end, { x: P.x, y: at }], within });
    }
  }
  if (id === 'axial') {
    // L and a on one baseline under the axis, each with its own bar and ticks.
    dims.push(dimBar('L', 'size', { x: O.x, y: barY }, { x: O.x + p.size * unit, y: barY }, 'L', 1));
    dims.push(dimBar('a', 'distance', { x: O.x + p.size * unit, y: barY }, { x: P.x, y: barY }, 'a', 1));
  }
  if (id === 'semi' && !rOnLeg) {
    // Left of P's line, at one place in every stage. It used to stand left of whatever was drawn from P across
    // that stretch, and so moved with every stage's arrows; the one stage whose arrow lies across it -- What
    // cancels, ΔE_x along the level of P -- letters the leg r instead.
    const x = O.x - 40;
    dims.push(dimBar('r', 'distance', { x, y: O.y }, { x, y: P.y }, 'r', -1));
  }
  if (perspective && !inSpace) dims.push(dimBar('z', 'distance', { x: O.x - 30, y: O.y }, { x: O.x - 30, y: P.y }, 'z', -1));
  if (flatR !== null) dims.push({ ...dimBar('R', 'size', { x: O.x - R * unit, y: flatR }, { x: O.x, y: flatR }, 'R', 1), within: `0 ${flatR.toFixed(1)} 0 1` });
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
    // ON THE SIDE OF THE AXIS AWAY FROM THE LINE TO THE PIECE. z and r_i are both the distance's blue, and set
    // beside that line -- the only blue stroke near it, the axis being faint scenery -- z read as its name.
    // The line is lettered r_i now (see `riInSpace`), and z keeps to the other side, beside a stroke of its own
    // from O up the axis to P.
    const lineSide = showContribution && building !== 'limit' ? Math.sign(Math.round(selectedPoint.x - O.x)) : 0;
    const sides = lineSide > 0 ? [-1] : lineSide < 0 ? [1] : [1, -1];
    const alt = stops.flatMap(y => sides.map(sg => `${O.x + 6 * sg} ${at(y)} ${sg > 0 ? 'start' : 'end'}`)).join(';');
    dims.push({ key: 'z', dim: 'distance', a: O, b: { x: O.x, y: P.y }, path: `M${O.x.toFixed(1)} ${O.y.toFixed(1)}L${O.x.toFixed(1)} ${P.y.toFixed(1)}`, name: 'z',
      label: { x: O.x + 6 * sides[0], y: y + .3 * SYM * labelScale, anchor: sides[0] > 0 ? 'start' : 'end' }, alt, within: lineSide ? `${O.x.toFixed(1)} 0 ${-lineSide} 0` : undefined });
  }
  // The potential's column: every piece's contribution stacked, beside P on the side the charge is not.
  const gauge = scalar ? (() => {
    // Clear of the axis P sits on by more than the width of a label, so the column reads as standing
    // beside P rather than along the axis.
    const w = 12, leftSide = id === 'arc', gap = 28, fine = n > 64;
    let x = leftSide ? P.x - gap - w : P.x + gap;
    // HOW TALL. At most 88 units, and ALWAYS the way the potential's sign points: the direction is the
    // column's only sign, since ΔV, ΣΔV and V carry none, and a column for a positive V that stood
    // below P where the room above was short was drawn exactly as a negative one is. Never out of the
    // plot, either: in space P can sit high in the frame, and the column climbed over the frame's top.
    // So it is scaled to the room there is that way, and where that is short its name moves in beside
    // the column's far end, handing the column the room the name would have taken past it.
    const labelRoom = 1.37 * SYM * labelScale + 10;
    const natural = (vExact || vNow || samples[0]?.potential || 1) >= 0 ? 1 : -1;
    // NEVER DOWN THROUGH THE CHARGE THAT MAKES IT. A negative potential stacks down from P, and on the ring and
    // the disk the charge lies below P: sized by the frame alone, the column ran down through the disk's face,
    // across the chosen ring, onto the ring itself. Its floor is the top of the drawn ring or disk under it, a
    // little above; where that leaves too little to read, the column stands out past the rim instead.
    let floor = 371;
    if (natural < 0 && (id === 'ring' || id === 'disk')) {
      const rim = circlePoints(R), top = (x0: number) => {
        let best = Infinity;
        for (let k = 1; k < rim.length; k++) {
          const a = rim[k - 1], b = rim[k];
          for (const at of [x0 - 6, x0, x0 + w / 2, x0 + w, x0 + w + 6]) if ((a.x - at) * (b.x - at) <= 0 && Math.abs(b.x - a.x) > 1e-9) best = Math.min(best, a.y + (b.y - a.y) * (at - a.x) / (b.x - a.x));
        }
        return best;
      };
      floor = Math.min(371, top(x) - 8);
      if (floor - P.y < 24 + labelRoom) { x = Math.max(x, Math.max(...rim.map(q => q.x)) + 12); floor = Math.min(371, top(x) - 8); }
    }
    const roomNamed = natural > 0 ? P.y - 54 - labelRoom : floor - P.y - labelRoom;
    // Beside the far end, the name is centred on it: the column stops short of the plot's edge by half the
    // name's height.
    const beside = roomNamed < 40, roomBare = (natural > 0 ? P.y - 54 : floor - P.y) - .7 * SYM * labelScale - 2;
    // AS TALL AS THE POTENTIAL IS LARGE. Filled to the room there was, whatever V was, the column -- the
    // potential lessons' only picture of V -- drew Q = 0.5 and Q = 5 as the same picture, and P half a metre
    // from the rod and six metres off as the same height: the lessons' own limits, V falling as kQ/r and
    // growing without end near the rod, could not be seen. So its height grows with V on the lesson's fixed
    // log scale, as the field's arrow does (see `restLength`), from 24 units to 88, and the room only caps it.
    // Read off the exact V, which no stage of the run changes, so Add them up and Shrink them share one scale.
    const room = Math.max(16, beside ? roomBare : roomNamed), [vLo, vHi] = lessonRange(id, 'V'), vRef = Math.abs(vExact);
    const tall = 24 + 64 * clamp(Math.log(Math.max(vRef, 1e-30) / vLo) / Math.log(vHi / vLo), 0, 1);
    const perVolt = Math.min(vRef > 1e-30 ? Math.min(tall, room) / vRef : Infinity, Math.min(88, room) / vScale);
    let at = 0;
    const slots = samples.map((s, i) => { const h = s.potential * perVolt; const slot = { i, lo: at, hi: at + h }; at += h; return slot; });
    let got = 0;
    // At rest, outside the run, the column is the whole sum, filled: five near-empty slots with one faint
    // tint read as "the potential at P is about nothing". The run fills it piece by piece in Add them up.
    const filling = summing || !build;
    const filled = filling ? samples.map((s, i) => { const h = s.potential * perVolt * (weights[i] ?? 0); const slot = { i, lo: got, hi: got + h }; got += h; return slot; }).filter(sl => Math.abs(sl.hi - sl.lo) > .02) : [];
    // The thin line of the ground between slots fades with the slot: at a hundred and sixty slots, mid-Shrink, every
    // slot kept its one-unit stroke and the answer's own column washed out, pale and striped, for a second before
    // snapping solid at the limit.
    const box = (lo: number, hi: number) => ({ y: Math.min(P.y - lo, P.y - hi), height: Math.max(.6, Math.abs(hi - lo)), style: { strokeOpacity: clamp((Math.abs(hi - lo) - 1) / 4, 0, 1) } });
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
    // For the whole of the pair's step, by the gain it arrives at: read off the easing, the corner went back to "Cut into
    // pieces" for the last quarter of every pair and on again with the next -- ten times in the stage on a ring cut twenty ways.
    if (pairNow && pairGain > 1.25) return 'This pair drawn larger';
    if (build && !scalar && (building === 'one' || building === 'cancel') && showContribution) {
      // Said of what changed -- the arrows, not the piece, which is the size it was -- and of both pieces where
      // What cancels draws the mirror's too; on the disk, the sheet and their potential the piece is a ring.
      const g = runGain(sample.field), what = stageCancel && pairing ? 'Both pieces\u2019 arrows' : surface ? 'The ring\u2019s arrow' : 'The piece\u2019s arrow';
      if (g > 1.25) return `${what} drawn larger`;
      if (g < .8) return `${what} drawn smaller`;
    }
    // AT REST TOO, wherever the piece's arrow is drawn beside the sum: stretched to a readable length whatever its own,
    // one piece of five came out as long as the whole field -- on the disk exactly as long, on the same line -- under a
    // corner that said only "Cut into pieces". A teacher's link to the parts, or a hover on the board, shows it so.
    if (!build && !scalar && showContribution && mode !== 'sum' && selectedGain > 1.25) return surface ? 'The ring\u2019s arrow drawn larger' : 'The piece\u2019s arrow drawn larger';
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
    if ((pairing && showContribution) || scalarPartner || pairLines) add(vsub(partnerPos, P));
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
    // While the pairs go in, the sum runs left from P and every pair arrives at its tip: the first clear spot up and to
    // the left stood right over the pair's junction, and the pair arrived "at P = O" while the dot itself, fifty units
    // on, had no name. Right of the axis too then, where the sum never goes.
    const order = id === 'arc' ? (scalar ? [-135, -112.5, -157.5, -90, 135, 112.5, 157.5] : pairDraw ? [-67.5, -45, -22.5, -135, -112.5, -157.5, -90] : [-135, -112.5, -157.5, -90]) : upper ? [-135, -45, -112.5, -67.5, -157.5, -22.5, -90] : [-135, -45, 180, 0, 135, 45, -90, 90, -157.5, -112.5, -67.5, -22.5, 157.5, 112.5, 67.5, 22.5];
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
  // And never above the plot: with the piece off its top, the tag hangs from the frame's edge, and the spots
  // above that are the stage title's row.
  const tagWithin = [`0 ${(54 + .69 * SYM * labelScale).toFixed(1)} 0 1`, ...(rodLike && selectedOnFrame && !inSpace ? (() => {
    const band = pieceSpan / 2 + 30 * labelScale, c = upright ? source.y : source.x;
    return upright ? [`0 ${(c - band).toFixed(1)} 0 1`, `0 ${(c + band).toFixed(1)} 0 -1`] : [`${(c - band).toFixed(1)} 0 1 0`, `${(c + band).toFixed(1)} 0 -1 0`];
  })() : [])].join(';');
  // THE LIMITS' HANDLES, worked out here so the label placer knows where they are.
  const handlesShown = mode === 'integrate' && !!onBoundRangeChange;
  // Whether the stage asks for the triangle the distance and the angle are read off (see `triangle`): the limits'
  // handles need to know, to keep off the schematic one in the corner.
  const triangleWanted = showContribution && building !== 'add' && building !== 'limit' && (!scalar || building === 'one' || highlight === 'distance');
  // AND IN ADD THEM UP, THE LIMITS' NAMES. The board says the sum runs "from θ = −φ/2 to θ = φ/2", "once round from
  // θ = 0", "from y = 0 to y = L", and the figure named no end of the charge until the next stage: the walk plainly
  // started at one end, and nothing said which. Named there as they will be in Shrink them, with no handle.
  const rangeNamed = !handlesShown && building === 'add' && full;
  const boundNames = problem.boundTex.map(plainBound) as [string, string];
  const onPage = (q: Point) => q.x >= 57 && q.x <= 650 && q.y >= 66 && q.y <= 358;
  const bounds = (() => {
    type Handle = { key: string; handle: string; at: Point; edge: string | null; name: string; label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }; alt?: string;
      /** Whether its mark is drawn: in Add them up only its name is, and off-page ends lose their arrow in the run. */
      mark: boolean };
    if (!handlesShown && !rangeNamed) return [] as Handle[];
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
    // The axis lesson's near end is its origin, lettered O, and the sheet's centre too: the board says "from
    // x = 0" and "s: 0 → ∞", and the handle there stood unnamed. Named as values of the variable, as the disk's
    // are. The sheet's far end, in space, is "s → ∞": a bare ∞ on the end of the x axis read as that axis'
    // arrowhead, and as x → ∞.
    const naming = id === 'ring' || id === 'arc' || ramp || id === 'disk';
    const prefixed = ramp || id === 'arc' || id === 'disk', variable = plainBound(problem.variableTex);
    // The half line's near end is its origin too, and was left out: its board integrates ∫₀^∞ dx, and its handle at O
    // carried only O while the axis lesson's identical end read "x = 0". And the endless line's ends are where θ goes:
    // its board's limits are −π/2 and π/2, and the figure lit two bare arrows and a ±∞ the board never writes. Named
    // "θ → ±π/2", since no piece of the line is at either.
    const named = (i: number) => !ends[i].whole ? ''
      : id === 'sheet' ? (i === 0 ? `${variable} = 0` : inSpace ? `${variable} → ∞` : '')
      : id === 'axial' || id === 'semi' ? (i === 0 ? `${variable} = 0` : id === 'semi' && inSpace ? `${variable} → ∞` : '')
      : id === 'infinite' ? `${variable} → ${boundNames[i]}`
      : naming ? (prefixed ? `${variable} = ${boundNames[i]}` : boundNames[i]) : '';
    // A closed ring at its full range: its two limits are one point, so one handle -- named for both
    // limits as values of the angle, "θ = 0, 2π". Written "0 = 2π" it read as an equation, and a false one.
    if (id === 'ring' && ends[0].whole && ends[1].whole) {
      const at = ends[1].raw, out = direction(vsub(at, O)) ?? { x: 0, y: 1 };
      return [{ key: 'closed', handle: '1', at, edge: null, name: `${plainBound(problem.variableTex)} = ${boundNames[0]}, ${boundNames[1]}`, label: besidePoint(at, out, 14, SYM * labelScale), mark: handlesShown }];
    }
    // The arc closed into a ring: its ends are one point too, and two handles were drawn on it, each named outward
    // along its own end's tangent -- which, once the ends meet, put −φ/2 above the axis and φ/2 below it, the wrong
    // way round for the θ the figure measures counter-clockwise. One handle, named for both.
    if (id === 'arc' && p.phi >= 2 * Math.PI - 1e-6 && ends[0].whole && ends[1].whole) {
      const at = ends[1].raw, out = direction(vsub(at, O)) ?? { x: -1, y: 0 };
      return [{ key: 'closed', handle: '1', at, edge: null, name: `${variable} = ±${boundNames[1].replace(/^[+]/, '')}`, label: besidePoint(at, out, 14, SYM * labelScale), mark: handlesShown }];
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
        out.push({ key: e.i ? 'upper' : 'lower', handle: String(e.i), at: e.raw, edge: null, name: named(e.i), label, alt: label === along ? undefined : `${along.x.toFixed(1)} ${along.y.toFixed(1)} ${along.anchor}`, mark: handlesShown });
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
      // In space too, off the projected axis it would otherwise end on.
      // WHILE THE RUN PLAYS no arrow is drawn where an end's own name already says it goes on -- the half line's ∞, the
      // sheet's "s → ∞": beside the break, with no shaft and no name, it was an arrowhead floating in the air. Nobody drags
      // a limit then. The sheet's name in space goes on its own axis at the frame's edge, not eighteen units off it in the
      // sky, where it named nothing a reader could see. The endless line keeps its arrows, named for θ.
      const quiet = !!build && (id === 'semi' || id === 'sheet');
      // THE ENDLESS LINES' ARROWS IN SPACE STAY ON THEIR LINE. Their asides are the flat view's -- across a line that
      // stands up the page, or lies along it -- and in space, with the line on a diagonal, they put each arrow some
      // twenty units off the line, beside nothing. On the line, at the frame, the arrow is where the line goes on;
      // and its head is drawn longer than it is wide there, where a head as wide as it is long read as "►" pointing
      // across the line, not along it. (Seen flat, the lines are upright or level, and keep their asides.)
      const onLine = inSpace && (id === 'infinite' || id === 'semi');
      // AND THE SHEET'S KEEPS OUT OF THE SAME-TRIANGLE INSET. The sheet's x axis runs out under the top right corner, where
      // the schematic triangle stands (see `triangle`), and its arrow, set aside toward the middle, and "s → ∞" were drawn
      // inside it: by the inset's own s, as if the triangle's leg ran on to infinity, the arrow on its caption. Set aside
      // to the axis' other side instead, and failing that walked back along it, until neither touches the inset's box --
      // its legs, its letters and the caption under them.
      const size = SYM * labelScale, k = labelScale, inset = id === 'sheet' && inSpace && !quiet && perspective && triangleWanted
        ? { x: 619 - 111 * k, y: 56, width: 101 + 111 * k, height: 23 + 62 * k + 1.37 * size + (narrow ? 4 : 30) } : null;
      const hits = (q: Point, w: number, h: number) => !!inset && q.x - w / 2 < inset.x + inset.width && inset.x < q.x + w / 2 && q.y - h / 2 < inset.y + inset.height && inset.y < q.y + h / 2;
      const end = { ...tip };
      let toward = inward;
      const place = () => {
        const aside = onLine ? { x: 0, y: 0 } : id === 'infinite' ? { x: 22, y: 0 } : id === 'semi' ? { x: 0, y: 20 } : id === 'sheet' ? (inSpace ? (quiet ? { x: 0, y: 0 } : { x: toward.x * 18, y: toward.y * 18 }) : { x: -34, y: -18 }) : { x: 0, y: 0 };
        tip.x = end.x + aside.x; tip.y = end.y + aside.y;
      };
      const at = () => besidePoint({ x: tip.x - dir.x * 8, y: tip.y - dir.y * 8 }, toward, 12, size);
      const clash = () => { const l = at(), w = 3.2 * size; return hits(tip, 18, 18) || hits({ x: l.anchor === 'start' ? l.x + w / 2 : l.anchor === 'end' ? l.x - w / 2 : l.x, y: l.y - .35 * size }, w, 1.4 * size); };
      place();
      if (clash()) { toward = { x: -inward.x, y: -inward.y }; place(); }
      for (let step = 0; step < 120 && clash() && onPage({ x: end.x - dir.x * 4, y: end.y - dir.y * 4 }); step++) { end.x -= dir.x * 4; end.y -= dir.y * 4; place(); }
      const headLength = onLine ? 14 : 12, headHalf = onLine ? 4 : 6, base = { x: tip.x - dir.x * headLength, y: tip.y - dir.y * headLength };
      const edge = `M${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${(base.x + n.x * headHalf).toFixed(1)} ${(base.y + n.y * headHalf).toFixed(1)}L${(base.x - n.x * headHalf).toFixed(1)} ${(base.y - n.y * headHalf).toFixed(1)}Z`;
      out.push({ key: e.i ? 'upper' : 'lower', handle: String(e.i), at: tip, edge, name: named(e.i), label: at(), mark: handlesShown && !quiet });
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
  //
  // AND THE ARC AND THE ROD SEEN ALONG ITS AXIS KEEP THEIRS. Turned into space they lost every term the board
  // boxes for the stage -- θ and r_i = R, x and r_i = L + a − x -- on the grounds that the rod's line to P lies
  // along the rod and the arc names no r_i; but the arc does name it, and both are drawn by true segments: the
  // arc's θ lies between the x axis and the line to the piece, both drawn through the projection, and the rod's
  // brackets run beside the rod as it is projected.
  const triangleShown = triangleWanted && (perspective || selectedOnFrame);
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
      // ...AND THE LINE FROM P TO THE PIECE, ON THE FIGURE, IS r_i: the board's term was only in the corner's
      // schematic, and the one blue stroke in the scene went unnamed -- on a phone the letter beside it was R.
      // Beside its middle, on the side away from the axis, where z is not. Kept on a desktop; on a phone, where the
      // ring's names crowd round it and the schematic's r_i stands in the corner, it gives way rather than set
      // itself against P's name.
      const lineHyp = { x: (selectedPoint.x + P.x) / 2, y: (selectedPoint.y + P.y) / 2 }, lineDir = direction(vsub(selectedPoint, P));
      const lineOut = lineDir ? (() => { const nrm = { x: -lineDir.y, y: lineDir.x }; return nrm.x * (lineHyp.x - O.x) >= 0 ? nrm : { x: -nrm.x, y: -nrm.y }; })() : null;
      const riOnLine = lineOut && selectedOnFrame && Math.hypot(selectedPoint.x - P.x, selectedPoint.y - P.y) > 40 ? { spot: besidePoint(lineHyp, lineOut, 7, termSize, .52), hyp: lineHyp, side: Math.sign(lineOut.x) || 1 } : null;
      return { kind: 'schematic' as const, legs: [[top, corner], [corner, end], [top, end]] as [Point, Point][], arc: [] as Point[], zSpot, baseSpot, riSpot, top, corner, end, riOnLine };
    }
    if (inSpace && id !== 'arc' && id !== 'axial') {
      // Above the line to P, and below it if that side is taken: either side names the same segment.
      const hyp = { x: (source.x + P.x) / 2, y: (source.y + P.y) / 2 }, along = direction(vsub(P, source)) ?? { x: 1, y: 0 };
      const normal = along.x >= 0 ? { x: along.y, y: -along.x } : { x: -along.y, y: along.x };
      return { kind: 'slope' as const, legs: [] as [Point, Point][], arc: [] as Point[], hyp, riSpot: besidePoint(hyp, normal, 7, termSize, .52) };
    }
    // The arc's potential too: its board writes r_i = R and integrates over θ, and the figure drew the line to
    // the piece unnamed and no θ at all -- where the field's arc, on the same geometry, draws both.
    if (id === 'arc') {
      const mark = angleMark(P, inSpace ? project({ x: R, y: 0, z: 0 }) : { x: Math.min(656, P.x + R * unit), y: P.y }, selectedPoint, 'θ', stageCancel);
      const hyp = { x: (P.x + selectedPoint.x) / 2, y: (P.y + selectedPoint.y) / 2 }, d = direction(vsub(selectedPoint, P));
      const away = d ? (-d.y < 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x }) : null;
      const riSpot = away ? besidePoint(hyp, away, 7, termSize, .52) : null;
      return { kind: 'arc' as const, legs: [[P, selectedPoint]] as [Point, Point][], arc: mark?.arc ?? [], mark, hyp, riSpot };
    }
    if (id === 'axial') {
      // On the rod seen along its axis the distance from a piece to P runs ALONG the rod, so a dashed
      // line from one to the other lay right over the rod's remaining pieces and turned their + marks
      // into minus signs. It is a dimension instead, just above the rod: from the piece to P.
      //
      // AND THE PIECE'S OWN x, ON THE SAME LINE, from O to the piece: the bar reads O —x— piece —(L + a − x)— P. The
      // piece's coordinate was drawn nowhere, and right under r_i = L + a − x stood "x = L", the rod's end: a
      // student substituted the only x in sight and found every piece a away.
      //
      // In space both run beside the rod as it is projected, on its upper side on the screen, as they do seen flat.
      const u = (inSpace ? direction(vsub(project({ x: 1, y: 0, z: 0 }), O)) : null) ?? { x: 1, y: 0 }, up = u.x >= 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x };
      const k = (inSpace ? 4 : rodHalf) + 14, on = (q: Point) => { const t = (q.x - O.x) * u.x + (q.y - O.y) * u.y; return { x: O.x + u.x * t + up.x * k, y: O.y + u.y * t + up.y * k }; };
      const a = on(source), b = on(P), o = on(O), xShown = (a.x - o.x) * u.x + (a.y - o.y) * u.y > 14;
      // Ticks across each bar, and each letter beside its bar's middle, away from the rod: seen flat, straight up.
      const f = (q: Point) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`, tick = (q: Point) => `M${f({ x: q.x + up.x * 4, y: q.y + up.y * 4 })}l${(-up.x * 8).toFixed(1)} ${(-up.y * 8).toFixed(1)}`;
      const mid = (p: Point, q: Point) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }), lift = inSpace ? 4 : rodHalf;
      return { kind: 'axial' as const, legs: (xShown ? [[a, b], [o, a]] : [[a, b]]) as [Point, Point][], arc: [] as Point[], a, b, o, xShown,
        xBar: `M${f(o)}L${f(a)}${tick(o)}`, riBar: `M${f(a)}L${f(b)}${tick(a)}${tick(b)}`, xName: besidePoint(mid(o, a), up, 8, termSize), riName: besidePoint(mid(a, b), up, 8, termSize),
        xWithin: `${f({ x: O.x + up.x * lift, y: O.y + up.y * lift })} ${up.x.toFixed(3)} ${up.y.toFixed(3)}` };
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
    //
    // AND THE TRIANGLE CLOSES: r_i is drawn from where it crosses the leg's line, and the leg runs dashed from the
    // right angle to that crossing, then on as a hairline -- a draftsman's extension line -- to the piece's level.
    // The leg stands off the rod, so the line from the piece met it short of the leg's end: the dashed leg ran on
    // past the hypotenuse to a tick, up to sixty units on the semi-infinite line, and with P close in r_i began
    // inside the rod and crossed the leg in an X. The board's r_i² = r² + y² is about a closed triangle.
    const across = (q: Point) => flat ? q.y : q.x, legAt0 = across(foot), cross = (legAt0 - across(source)) / (across(P) - across(source));
    const met = hasLeg && cross > 0 && cross < 1 ? { x: source.x + (P.x - source.x) * cross, y: source.y + (P.y - source.y) * cross } : offRod(source, P, selectedIndex);
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
    const legAlt = [legAt(.25), legAt(.75), legAt(.12), legAt(.88)].map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`).join(';');
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
    // ...and never past the mirror's line to P, which closes in under the leg toward P: set beyond it, on a phone, r
    // read as the length of that line -- the mirror's r_i. Between the two, or, failing that, above the leg inside the
    // triangle beside the right angle.
    const above = { x: -under.x, y: -under.y };
    const rAlt = [...[.25, .55, .2].map(f => besidePoint(at(f), under, 6, termSize)), besidePoint(at(.3), above, 6, termSize)].map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)} ${q.anchor}`).join(';');
    const mirrorFrom = pairing ? offRod(partnerPos, P, partnerIndex) : null, mirrorDir = mirrorFrom ? direction(vsub(mirrorFrom, P)) : null;
    const rWithin = mirrorDir ? (() => { let m = { x: -mirrorDir.y, y: mirrorDir.x }; if (m.x * (baseMid.x - P.x) + m.y * (baseMid.y - P.y) < 0) m = { x: -m.x, y: -m.y }; return `${P.x.toFixed(1)} ${P.y.toFixed(1)} ${m.x.toFixed(3)} ${m.y.toFixed(3)}`; })() : undefined;
    return { kind: 'rod' as const, legs: (hasLeg ? [[met, foot], [foot, P], ...(Math.hypot(start.x - met.x, start.y - met.y) > 1 ? [[met, start]] : [])] : []) as [Point, Point][], arc: mark?.arc ?? [], mark, flat, foot, start, met, extension, square, riSpot, hyp, legMid, legSpot, legAlt, legWithin, legLength, hasLeg, baseMid, rSpot, rAlt, rWithin };
  })();
  // THE PIECE'S ANGLE, Δθ, where the lesson is cut by angle and the angle is what is integrated: across the
  // chosen wedge at P on the lines that never end, as Cut it up makes the cuts -- "one piece is one angle",
  // and the board writes the piece's charge in Δθ -- and across the chosen piece at the arc's centre as it is
  // cut, where the footer and the board write λR Δθ. Nothing on the figure named the variable
  // being integrated over. After Cut it up the lines' wedge has θ itself at P, and the triangle, to carry; on
  // the arc, the line to the piece's middle -- r_i -- halves the piece's angle and would run through its letter.
  //
  // In Shrink them too, where the board's line is Δθ → dθ: on the arc, and on the endless line, whose board
  // integrates over θ. The piece's angle by then is a degree or less, so the mark is drawn six degrees wide about
  // it, a token of the piece's angle rather than a measure of it, and named dθ.
  //
  // THE SHEET'S Δα: its rings are cut by angle at P, and the footer and the board's first line write the ring's
  // charge in Δα, but nothing on the figure was Δα. Marked across the chosen ring's wedge, on the diameter lying
  // across the screen, in either view: the rays from P are true segments in space as well.
  const pieceAngle = (() => {
    const sheetCut = id === 'sheet' && fanned && building === 'pieces';
    // The arc's Δθ and dθ in space as well: its rays from P = O to the piece's ends are true segments in any view.
    if (inSpace && !sheetCut && id !== 'arc') return null;
    const lines = (fanned && id !== 'sheet' && building === 'pieces' && !!selectedWedge) || (id === 'infinite' && shrinking) || sheetCut, arc = id === 'arc' && (building === 'pieces' || shrinking);
    if (!lines && !arc) return null;
    const onScreen = (t: number) => project(id === 'sheet' ? scaleVec(across, Math.abs(world(t).x)) : world(t));
    let a = onScreen(selectedIndex / n), b = onScreen((selectedIndex + 1) / n);
    const da = direction(vsub(a, P)), db = direction(vsub(b, P));
    if (!da || !db) return null;
    const between = Math.acos(clamp(da.x * db.x + da.y * db.y, -1, 1)), least = 6 * Math.PI / 180;
    if (shrinking && between < least) {
      // Widened about the piece's own middle direction, to six degrees.
      const mid = direction({ x: da.x + db.x, y: da.y + db.y }) ?? da, sweep = da.x * db.y - da.y * db.x >= 0 ? 1 : -1, h = least / 2;
      const turn = (u: Point, t: number) => ({ x: u.x * Math.cos(t) - u.y * Math.sin(t), y: u.x * Math.sin(t) + u.y * Math.cos(t) });
      const reach = arc ? (inSpace ? (Math.hypot(a.x - P.x, a.y - P.y) + Math.hypot(b.x - P.x, b.y - P.y)) / 2 : R * unit) : Math.abs((O.x - P.x) / Math.max(1e-6, Math.abs(mid.x))) || 100;
      a = plus(P, scaleVec2(turn(mid, -sweep * h), reach)); b = plus(P, scaleVec2(turn(mid, sweep * h), reach));
    }
    // On the endless line in the limit there is no fan: the angle's own sides are drawn, from P to the line.
    const toLine = (q: Point) => { const u = direction(vsub(q, P)); if (!u || Math.abs(u.x) < 1e-6) return q; const t = (O.x - P.x) / u.x; return t > 0 ? { x: P.x + u.x * t, y: P.y + u.y * t } : q; };
    const name = `${continuum >= .999 ? 'd' : '\u0394'}${id === 'semi' || id === 'sheet' ? 'α' : 'θ'}`;
    // The sheet's from its outer side: too narrow to hold Δα, its letter goes past the side it starts from, and from the
    // inner side that was across the z axis, beside the z bar's letter, with its arc on the other side of the axis.
    const mark = id === 'sheet' ? angleMark(P, b, a, name, shrinking, { r0: 58, w: 1.3 }) : angleMark(P, a, b, name, shrinking, { r0: arc ? Math.max(34, .45 * R * unit) : 58, w: 1.3 });
    // And its two sides drawn at the arc's own weight: among the fan's hairlines nothing said which angle Δα was.
    const wedgeSides = fan ? fan.rays.filter(r => chosenRays.has(r.key) && (id !== 'sheet' || r.key.endsWith(':r'))).map(r => r.end) : [];
    return mark ? { ...mark, rays: arc ? [a, b] : id === 'infinite' && shrinking ? [toLine(a), toLine(b)] : wedgeSides } : null;
  })();
  // THE RING'S Δθ, as Cut it up makes the cuts: the footer writes ΔQ = λR Δθ and the board calls θ a piece's angle
  // round the ring, and nothing on the figure was θ or Δθ. In the ring's own plane, so it is drawn through the
  // projection: hairlines from O to the chosen piece's two ends, and the arc between them at a little under half
  // the radius, lettered. In space only, where the ring opens: seen flat it is nearly edge-on, and an angle in its
  // plane would be a sliver.
  const ringAngle = (() => {
    if (id !== 'ring' || !inSpace || building !== 'pieces') return null;
    const a0 = 2 * Math.PI * selectedIndex / n, a1 = 2 * Math.PI * (selectedIndex + 1) / n, at = (r: number, t: number) => project({ x: r * Math.cos(t), y: r * Math.sin(t), z: 0 });
    const arc = circlePoints(.45 * R, a0, a1), mid = at(.45 * R, (a0 + a1) / 2), out = direction(vsub(mid, O)) ?? { x: 0, y: 1 };
    const spot = besidePoint(mid, out, 5, SYM * labelScale);
    return { rays: [at(R, a0), at(R, a1)], arc, mid, spot, name: `${continuum >= .999 ? 'd' : '\u0394'}θ` };
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
  let cubeBox: Box | null = null;
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
    // ...and the band between them, which the scene fills: with only its two edges known, s and Δα were set on the band
    // itself, dark ink on its brown or a white blot of halo. Circles no more than six units apart cover it.
    if (surface && inSpace && sceneElement.annulus) {
      const { inner, outer } = sceneElement.annulus, k = Math.min(12, Math.ceil((outer - inner) * unit / 6));
      for (let j = 1; j < k; j++) line(circlePoints(Math.min(9, inner + (outer - inner) * j / k)), 6);
    }
    const arrow = (from: Point, d: Point, w: number) => {
      if (Math.hypot(d.x, d.y) < 2) return;
      const to = plus(from, d);
      seg(from, to, w);
      obstacleBoxes.push({ x: to.x - 7, y: to.y - 7, width: 14, height: 14 });
    };
    if (netShown) arrow(P, net, 7);
    if (netShown && trueField) arrow(trueFrom, trueField, 4);
    if (drawingPiece) {
      arrow(P, contribution, 5);
      if (pairing) { arrow(P, partnerScreen, 5); if (hasDrop && (transverseOpacity > 0 || cancelT > 0)) { arrow(P, cancelT > 0 ? dropScreen : liveDrop, 5); arrow(P, cancelT > 0 ? partnerDropScreen : livePartnerDrop, 5); } }
      if (components && hasDrop) { arrow(P, keepScreen, 5); if (!pairing) arrow(P, dropScreen, 5); }
    }
    if (handOver) arrow(P, handOver.vector, 5);
    if (pairDraw) {
      arrow(pairDraw.from, pairDraw.aKeep, 5);
      if (pairDraw.b) { arrow(pairDraw.from, pairDraw.a, 5); arrow(pairDraw.from, pairDraw.b, 5); }
      if (pairDraw.bKeep) arrow(pairDraw.bKeepFrom, pairDraw.bKeep, 5);
    }
    if (partnerKeepShown && drawingPiece) arrow(partnerKeepFrom, partnerKeepScreen, 5);
    line(chainPoints, 5);
    // A bar is a line no name may be set across, even with nowhere free: a kept −L/2 on the bisector's short
    // rod stood across the r bar's tick and read as where r is measured from.
    for (const d of dims) if (d.path) { seg(d.a, d.b, 6); constructionLines.push({ a: d.a, b: d.b }); }
    // The limits' handles, which a name painted over hid: "s = 0" sat on its own handle at the disk's centre.
    for (const b of bounds) if (!b.edge && b.mark) obstacleBoxes.push({ x: b.at.x - 9, y: b.at.y - 9, width: 18, height: 18 });
    // ...and the arrows at the frame's edge, where a limit is off the page: a name set on one hid it.
    for (const b of bounds) if (b.edge && b.mark) obstacleBoxes.push({ x: b.at.x - 8, y: b.at.y - 8, width: 16, height: 16 });
    // And each bar's end ticks, with the air two names keep between them: a name set just off a tick read
    // as the bar's -- "ΔE" by r's top tick on the semi-infinite line, by z's on the ring seen flat.
    for (const d of dims) if (d.path) for (const q of [d.a, d.b]) obstacleBoxes.push({ x: q.x - 7, y: q.y - 7, width: 14, height: 14 });
    if (pieceLength) seg(pieceLength.ends[0], pieceLength.ends[1], 9);
    // The construction: the dashed lines from the piece and its partner to P, the triangle's legs and
    // the arc of its angle. A name laid across a line it does not name reads as crossed out.
    if (showContribution && building !== 'limit' && id !== 'axial') { seg(selectedPoint, P, 4); constructionLines.push({ a: selectedPoint, b: P }); }
    if (!surface && (pairing || scalarPartner || pairLines) && showContribution) { seg(partnerPos, P, 4); constructionLines.push({ a: partnerPos, b: P }); }
    if (triangle) {
      for (const [a, b] of triangle.legs) { seg(a, b, 4); constructionLines.push({ a, b }); }
      line(triangle.arc, 4);
      if ((triangle.kind === 'rod' || triangle.kind === 'arc') && triangle.mark?.leader) seg(triangle.mark.leader[0], triangle.mark.leader[1], 3);
    }
    if (ringAngle) { line(ringAngle.arc, 4); for (const q of ringAngle.rays) seg(O, q, 3); }
    if (pieceAngle) { line(pieceAngle.arc, 4); if (pieceAngle.leader) seg(pieceAngle.leader[0], pieceAngle.leader[1], 3); for (const q of pieceAngle.rays) seg(P, q, 3); }
    for (const [a, b] of breaks) seg(a, b, 5);
    // The chosen wedge's rays, once they are all of the fan that is drawn: see `raysShown`.
    if (fan && build && building !== 'pieces') for (const r of raysShown) { seg(P, r.end, 3); constructionLines.push({ a: P, b: r.end }); }
    // The arc's angle and radius, and a ring's or a disk's radius: dimensions drawn outside `dims`.
    if (id === 'arc' && !inSpace && arcLetters) { line(circlePoints(R * PHI_AT, -p.phi / 2, p.phi / 2), 4); if (!pairing) { seg(O, arcLetters.rTip, 4); constructionLines.push({ a: O, b: arcLetters.rTip }); } }
    if (perspective) seg(O, radiusTip, 4);
    if (rim) seg(O, rim.tip, 4);
    // The chosen ring of a disk or a sheet, in every view: the scene draws it in space, the flat view
    // as an outline, and a name on it reads as naming it.
    if (surface && (showContribution || building === 'pieces') && ringOutlined) line(circlePoints(Math.max(.001, sample.position.x)), 5);
    if (inSpace) { seg({ x: 2 * O.x - axisX.x, y: 2 * O.y - axisX.y }, axisX, 3); seg({ x: 2 * O.x - axisY.x, y: 2 * O.y - axisY.y }, axisY, 3); seg({ x: O.x, y: O.y + 27 }, { x: O.x, y: 60 }, 3); }
    // Not while the arc's two sideways parts lie along its y axis: the axes step back for them (see
    // `.cd-arc-pair`), and a faint axis under a name was what drove their names out onto leaders.
    else if (!(id === 'arc' && pairing)) { seg({ x: 64, y: O.y }, { x: 656, y: O.y }, 3); seg({ x: O.x, y: 365 }, { x: O.x, y: 60 }, 3); }
    obstacleBoxes.push({ x: P.x - haloR - 1, y: P.y - haloR - 1, width: 2 * haloR + 2, height: 2 * haloR + 2 });
    obstacleBoxes.push({ x: 0, y: FOOTER_BAND, width: 720, height: 430 - FOOTER_BAND });
    // ...and the stage's title row above the plot. Free to the placer, it took the names of things near the
    // plot's top edge: with P far from the endless line the run's piece is off the top of the page, and its
    // ΔQ was set beside "Cut it up" on the title's own baseline; on a phone the ramp's "y = L" read
    // "y = L  Shrink them".
    obstacleBoxes.push({ x: 0, y: 0, width: 720, height: TITLE_BAND });
    // The view cube and the four steps round it, which grow with the labels on a phone.
    if (inSpace) { const c = 62 * cubeScale, r = (2.1 * 22 + 8.4) * cubeScale; obstacleBoxes.push(cubeBox = { x: c - r, y: c - r, width: 2 * r, height: 2 * r }); }
    if (gauge && building !== 'pieces') {
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
    for (const f of [1, 1.12, 1.25, 1.4, 1.55, 1.7, 1.85, 2, 2.2, 2.4, 2.6, .9, .8, .7, .62, .55, .48, .41, .35, .29]) for (const sgn of [1, -1]) spots.push({ x: O.x + along.x * length * f + across.x * sgn * 14, y: O.y + along.y * length * f + across.y * sgn * 14 });
    const inPlot = (c: Point) => c.x - w / 2 > 46 && c.x + w / 2 < 664 && c.y - h / 2 > 58 && c.y + h / 2 < 367;
    // A little air round it as well: just clear of an arrowhead, it still read as that arrow's name.
    const m = 5, clear = (c: Point) => !obstacleBoxes.some(b => c.x - w / 2 - m < b.x + b.width && b.x < c.x + w / 2 + m && c.y - h / 2 - m < b.y + b.height && b.y < c.y + h / 2 + m);
    // AND NEVER UNDER THE VIEW CUBE. With nothing clear, it took the first spot in the plot whatever lay there: on a
    // phone the rod on the x axis has its y axis running up under the cube, which is painted over it, and y was
    // simply gone. Now it takes the spot that the fewest obstacles cover, and the cube, which hides what it covers,
    // counts for more than the rest. Never the axis' other half: unlettered, that is the way y does not run.
    const covered = (c: Point) => obstacleBoxes.reduce((sum, b) => sum + (b === cubeBox ? 4 : 1) * Math.max(0, Math.min(c.x + w / 2 + m, b.x + b.width) - Math.max(c.x - w / 2 - m, b.x)) * Math.max(0, Math.min(c.y + h / 2 + m, b.y + b.height) - Math.max(c.y - h / 2 - m, b.y)), 0);
    const c = spots.find(q => inPlot(q) && clear(q)) ?? spots.filter(inPlot).reduce<Point | null>((best, q) => !best || covered(q) < covered(best) - 1e-6 ? q : best, null) ?? spots[0];
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
  if (triangle?.kind === 'schematic' && triangle.riOnLine) { const q = triangle.riOnLine.spot, w = 1.1 * termSize; reserved.push({ x: q.x - (q.anchor === 'end' ? w : q.anchor === 'middle' ? w / 2 : 0), y: q.y - .98 * termSize, width: w, height: 1.5 * termSize }); }
  if (triangle && (triangle.kind === 'rod' || triangle.kind === 'slope' || (triangle.kind === 'arc' && triangle.riSpot))) {
    const q = triangle.riSpot!, w = (triangle.kind === 'arc' ? 3 : 1.1) * termSize;
    reserved.push({ x: q.x - (q.anchor === 'end' ? w : q.anchor === 'middle' ? w / 2 : 0), y: q.y - .98 * termSize, width: w, height: 1.5 * termSize });
  }
  // THE ARC'S P IS LETTERED PLAIN "P" IN WHAT CANCELS, AND WHILE THE PAIRS GO IN. Every way up and to the left of it is
  // taken in What cancels -- the mirror's arrow, the ghost of the part that went -- and "P = O", three times the width,
  // went out seventy units on a leader that ran into P beside the ghost's own leader: two thin lines and a dashed arrow
  // converging on P, read as more arrows. While the pairs go in, the only room that wide was over the pair's junction at
  // the sum's tip, and the pair arrived "at P = O". That P is O is said at rest and in the stages before.
  const pPlain = id === 'arc' && (stageCancel || !!pairDraw);
  // Where a pair arrives, while the pairs go in: P's name is nearer P than that, or it names the junction.
  const junction = pairDraw && Math.hypot(pairDraw.from.x - P.x, pairDraw.from.y - P.y) > 4 ? pairDraw.from : null;
  if (junction) reserved.push({ x: junction.x - haloR - 6, y: junction.y - haloR - 6, width: 2 * haloR + 12, height: 2 * haloR + 12 });
  const pLabel = (() => {
    const { scored, upper } = pDirections, size = SYM_P * labelScale;
    const width = (id === 'arc' && !pPlain ? 2.45 : .72) * size;
    const boxAt = (spot: { x: number; y: number; anchor: string }): Box => ({ x: spot.x - (spot.anchor === 'end' ? width : spot.anchor === 'middle' ? width / 2 : 0), y: spot.y - .98 * size, width, height: 1.37 * size });
    const nearerP = (b: Box) => { if (!junction) return true; const c = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; return Math.hypot(c.x - P.x, c.y - P.y) + 4 < Math.hypot(c.x - junction.x, c.y - junction.y); };
    const clear = (b: Box) => b.x > 46 && b.y > 58 && b.x + b.width < 664 && b.y + b.height < 367 && nearerP(b)
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
    if (!root) return;
    // Emptied while anything moves, when the names hold their last places and the field under them does not.
    const knock = root.querySelector<SVGGElement>('.cd-label-knock');
    knock?.replaceChildren();
    if (moving) return;
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
    const fixedMarks: Box[] = [], fixedWords: Box[] = [], knockWords: Box[] = [];
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
      if (anchored(t)) {
        (t.closest('.cd-plus, .cd-cube') ? fixedMarks : fixedWords).push(box);
        if (!t.closest('.cd-plus, .cd-cube') && !t.classList.contains('cd-footer') && !t.classList.contains('cd-stage-label')) knockWords.push(box);
        return;
      }
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
    // WHICH NAME IS WHICH, from one pass to the next: the group it is drawn in, the control it answers to, its
    // own class and text -- and, among names alike in all of those, its place in the drawing. Keyed by its
    // class and text alone, the height bar's z and the schematic triangle's z were one name, and the
    // schematic's z took the bar's held place: inside the triangle, under the angle's arc, with α pushed out
    // beside the z leg -- "the leg is α, the angle is z", with cos α = z/r_i on the board beside it.
    const keys = new Map<SVGTextElement, string>(), alike = new Map<string, number>();
    for (const m of movers) {
      const base = `${m.t.parentElement?.closest('[class*="cd-"]')?.getAttribute('class') ?? ''}|${m.t.closest('[data-dim]')?.getAttribute('data-dim') ?? ''}|${m.t.getAttribute('class') ?? ''}|${m.t.textContent ?? ''}|${m.t.dataset.symbol ?? ''}`;
      const k = alike.get(base) ?? 0;
      alike.set(base, k + 1);
      keys.set(m.t, `${base}|${k}`);
    }
    // The point the figure is about first, then the stage's own terms, then the given lengths and the
    // arrows' names, then everything else.
    movers.sort((a, b) => b.priority - a.priority || a.order - b.order);
    const keyOf = (t: SVGTextElement) => keys.get(t) ?? '';
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
    // A ROD'S TWO ENDS GO TOGETHER. Where one end's name had to go and the other stayed, the rod went from named
    // to half-named and back from stage to stage -- +L/2 gone in One piece while −L/2 stood -- and a lone −L/2
    // read as where the rod starts. Both or neither.
    // The endless line's +∞ and −∞ too. Not a rod standing on its foot, whose foot is the lettered O: there the rule
    // took y = L, or the ramp's λ = λ₀, down with a y = 0 that had run into P, and the ramp never said which end is
    // densest -- the reason for the rule, a lone −L/2 read as where the rod starts, does not hold for a rod whose
    // start is O.
    for (const g of root.querySelectorAll<SVGGElement>('.cd-dimension, .cd-infinity')) {
      if (footed && g.classList.contains('cd-dimension')) continue;
      const ends = [...g.querySelectorAll<SVGTextElement>(':scope > text.cd-end')];
      if (ends.length === 2 && ends.some(t => t.dataset.placerHidden) && ends.some(t => !t.dataset.placerHidden && t.dataset.keep !== 'true'))
        for (const t of ends) { t.style.opacity = '0'; t.dataset.placerHidden = 'true'; }
    }
    // A PATCH OF THE GROUND UNDER EVERY NAME, over the field lines. The canvas lies under the drawing and a name's halo
    // follows only its own letters, so the lines ran on between and round them -- through Σ ΔE, through "λ = λ₀" twice,
    // through P -- where a printed figure sets each name in a patch knocked out of the hatching. Under the drawing's own
    // marks, which all still paint over it: it covers the canvas and nothing else. Flat views only, where the lines are
    // the canvas; in space the scene is.
    if (knock) {
      const patch = (b: Box) => {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', (b.x - 2).toFixed(1)); r.setAttribute('y', (b.y - 2).toFixed(1));
        r.setAttribute('width', (b.width + 4).toFixed(1)); r.setAttribute('height', (b.height + 4).toFixed(1)); r.setAttribute('rx', '3');
        knock.appendChild(r);
      };
      for (const b of knockWords) patch(b);
      movers.forEach((m, k) => { if (!m.t.dataset.placerHidden && !m.t.closest('.cd-cube')) patch({ ...m.box, x: m.box.x + nudges[k].dx, y: m.box.y + nudges[k].dy }); });
    }
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
      bodyPath={bodyPath} point={pWorld} element={sceneElement} net={netShown ? scaleVec(displayed, gain / unit) : null} contribution={handOver ? scaleVec(handOver.field, handOver.multiplier * gain / unit) : pairNow ? (pairNow.step.fb && pairNow.cancel < .6 ? scaleVec(pairNow.step.fa, pairNow.grow * pairM * gain / unit) : null) : scalar || !showContribution || mode === 'sum' || building === 'limit' ? null : scaleVec(sample.field, selectedGain * gain / unit)}
      contributionFrom={pairNow ? scaleVec(pairSoFar, gain / unit) : null}
      unit={unit} frame={{ width: 720, height: 430 }} origin={O} charge={p.charge} animating={moving}
      getView={() => ({ yaw: yawMv.get(), pitch: pitchMv.get() })} onUnavailable={() => setNoScene(true)}
      // The run, for the scene to draw as bodies: the same partition, partner, sum and arrows the
      // flat marks below are drawn from, at the same scale, so the two can never tell it differently.
      run={build ? runScene({ stage: building, kind: id === 'disk' ? 'disk' : id === 'sheet' ? 'sheet' : 'wire', closed: id === 'ring', n, selected: selectedIndex, at: world,
        selectedSpan: halfPair && pairSlot ? [pairSlot.a.lo, pairSlot.a.hi] : null, mirrored: supportsPair,
        partner: partnerLit ? (mirrorArc ? 'across' : partnerIndex) : halfPair && pairSlot?.b ? { lo: pairSlot.b.lo, hi: pairSlot.b.hi } : null, weights, summing: mode === 'sum' || mode === 'integrate', continuum, split,
        // The stretches the pairs before this one have put in: the ring cut an odd number of ways takes pieces in by halves.
        added: pairNow && pairSteps ? pairSteps.slice(0, pairNow.k).flatMap(s => s.b ? [[s.a.lo, s.a.hi], [s.b.lo, s.b.hi]] as [number, number][] : [[s.a.lo, s.a.hi]] as [number, number][]) : null,
        // The pair going in, laid from the tip of the sum so far at the sum's own scale: see `pairDraw`.
        arrows: pairNow ? { scale: pairNow.grow * pairM * gain / unit, field: pairNow.step.fa, keep: alongAxis(id, pairNow.step.fa), drop: acrossAxis(id, pairNow.step.fa), partner: pairNow.step.fb,
            partnerKeep: pairNow.step.fb ? alongAxis(id, pairNow.step.fb) : zero, partnerDrop: pairNow.step.fb ? acrossAxis(id, pairNow.step.fb) : zero, components: true, cancelled: pairNow.cancel,
            from: scaleVec(pairSoFar, gain / unit), fade: 1 - pairNow.merge }
          : !scalar && showContribution && mode !== 'sum' && building !== 'limit' ? { scale: selectedGain * gain / unit, field: sample.field, keep, drop, partner: pairing ? partnerField : null, partnerKeep, partnerDrop, components, cancelled: cancelT } : null,
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
      {/* The names' patches over the field lines, filled by the placer: see its last pass. */}
      {!inSpace && !scalar && fieldView !== 'off' && <g className="cd-label-knock" aria-hidden="true" />}
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
          {raysShown.map(r => <line key={r.key} className={'cd-ray' + (chosenRays.has(r.key) ? ' is-chosen' : '')} x1={P.x} y1={P.y} x2={r.end.x.toFixed(1)} y2={r.end.y.toFixed(1)} style={{ opacity: 1 - continuum }} />)}
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
              const active = i === selectedIndex && !halfPair, accumulated = Math.abs(weights[i]) > 0 && (mode === 'sum' || mode === 'integrate');
              const inInterval = Math.abs(wholeWeights[i]) > 0;
              const opacity = !inInterval ? .14 : active ? 1 : accumulated ? .94 : building === 'add' ? .16 : .48 + continuum * .3;
              const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n, identity = intervalKey(i, n);
              return <g key={identity} data-piece-key={identity} className={`cd-piece ${active ? 'is-selected' : ''}${partnerLit && i === partnerIndex && !active && !mirrorArc ? ' is-partner' : ''}${accumulated && !active ? ' is-added' : ''}`} style={{ opacity, ...cutAt(i / n) }} onPointerDown={ev => { ev.stopPropagation(); onSelect(i); }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(R, a0, a1)) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth={active ? 10 : 7} /></g>;
            })}
            {/* The ring's last pair at an odd count: two half pieces, straight across from each other. */}
            {halfPair && pairSlot?.b && [pairSlot.a, pairSlot.b].map((span, k) => <g key={k} className={`cd-piece ${k ? 'is-partner' : 'is-selected'} cd-half-piece`} data-half-piece={k ? 'partner' : 'piece'} style={{ pointerEvents: 'none' }}>
              <path d={pathThrough(worldArc(R, 2 * Math.PI * span.lo, 2 * Math.PI * span.hi))} fill="none" strokeWidth={k ? 7 : 10} /></g>)}
            {mirrorArc && partnerLit && (() => { const a0 = 2 * Math.PI * selectedIndex / n + Math.PI, a1 = 2 * Math.PI * (selectedIndex + 1) / n + Math.PI;
              return <g className="cd-piece is-partner cd-mirror-arc" data-mirror-arc="true" style={{ pointerEvents: 'none' }}><path d={pathThrough(worldArc(R, a0, a1))} fill="none" strokeWidth={7} /></g>; })()}
            {continuum < .995 && <g className="cd-seams" aria-hidden="true" style={{ opacity: .7 * (1 - continuum) }}>
              {seamFractions(n).map(t => { const theta = 2 * Math.PI * t, h = 8 / unit, c = Math.cos(theta), s = Math.sin(theta); return <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam"><line x1={(R - h) * c} y1={(R - h) * s} x2={(R + h) * c} y2={(R + h) * s} /></g>; })}
              {split > .04 && split < .995 && splitFractions(n).map(t => { const theta = 2 * Math.PI * t, h = 8 * split / unit, c = Math.cos(theta), s = Math.sin(theta); return <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam is-growing" style={{ opacity: split }}><line x1={(R - h) * c} y1={(R - h) * s} x2={(R + h) * c} y2={(R + h) * s} /></g>; })}
            </g>}
          </>}
        </g>}
        {id === 'sheet' && !inSpace && <path d={[sheetRim.left, sheetRim.right].map(q => `M${(q.x - 15).toFixed(1)} ${(q.y - 6).toFixed(1)}l12 12m6 -12 12 12`).join('')} className="cd-continuation" />}
        {/* In Cut it up too, where the tag says "ring ΔQ" and the sentence speaks of rings: with no ring drawn the tag
            named a point on the x axis. */}
        {id === 'sheet' && (showContribution || building === 'pieces') && ringOutlined && <g className="cd-orbit-plane" transform={planeMatrix(view.yaw, view.pitch, O, unit)}><g className="cd-piece is-selected" data-piece-key={intervalKey(selectedIndex, n)} style={{ pointerEvents: 'none' }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, sample.position.x))) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth="4" /></g></g>}
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
            // The chosen piece by its density like the rest, and marked by its outline: filled solid in the charge's colour,
            // the second piece from the top read as the densest of all, darker than the λ₀ end above it.
            const shade = ramp ? { fillOpacity: .08 + .92 * s.position.y / p.size } : undefined;
            shape = upright ? <rect x={pos.x - rodHalf} y={lo} width={rodHalf * 2} height={extent} clipPath={`url(#${uid}rod)`} {...shade} /> : <rect x={lo} y={pos.y - rodHalf} width={extent} height={rodHalf * 2} clipPath={`url(#${uid}rod)`} />;
          }
          return <g key={identity} data-piece-key={identity} className={`cd-piece ${active ? 'is-selected' : ''}${ramp ? ' is-density' : ''}${partnerLit && i === partnerIndex && !active ? ' is-partner' : ''}${accumulated && !active ? ' is-added' : ''}`} style={{ opacity: opacity * heat, strokeOpacity: active ? 1 : outline, ...cutAt(i / n) }} onPointerDown={ev => { ev.stopPropagation(); onSelect(i); }}>{shape}</g>;
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
        {!surface && (pairing || scalarPartner || pairLines) && showContribution && (() => { const a = offRod(partnerPos, P, partnerIndex);
          // A dashed ring round the mirror piece, on a field lesson, only blotted a piece already lit dark with
          // its own arrow at P: it is kept where nothing else at P says which piece is the mirror -- a
          // potential's, whose pieces have no arrows.
          return <><line x1={a.x} y1={a.y} x2={P.x} y2={P.y} className="cd-construction cd-pair" />{scalar && <circle cx={partnerPos.x} cy={partnerPos.y} r="9" className="cd-partner" />}</>; })()}
        {/* Not on the rod seen along its axis, where it would lie along the rod itself: there the
            distance is a dimension above the rod, drawn with the triangle. */}
        {showContribution && building !== 'limit' && id !== 'axial' && (() => { const a = triangle?.kind === 'rod' && triangle.hasLeg ? triangle.met : offRod(selectedPoint, P, selectedIndex); return <line x1={a.x} y1={a.y} x2={P.x} y2={P.y} className="cd-construction" data-ri="true" />; })()}
      </g>
      {/* Where a line that never ends leaves the frame: break marks across it, a little way in, and its
          end named beside them, hung off their left so the name and the marks never touch. */}
      {id === 'infinite' && <g className="cd-infinity">{breakGaps.map(g => <polygon key={g} className="cd-break-gap" points={g} />)}<path className="cd-break-under" d={breaks.map(([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join('')} /><path d={breaks.map(([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join('')} />
        {/* Kept while the limits are the subject, and hidden together or not at all:
            on a phone +∞ gave way in What cancels and Shrink them while −∞ stood, and the line seemed to end at the top. */}
        <text className="cd-end" x={O.x - 16} y={(80 + .3 * SYM * labelScale).toFixed(1)} textAnchor="end" {...endAttrs}>+∞</text><text className="cd-end" x={O.x - 16} y={(348 + .3 * SYM * labelScale).toFixed(1)} textAnchor="end" {...endAttrs}>−∞</text></g>}
      {id === 'semi' && <g className="cd-infinity">{breakGaps.map(g => <polygon key={g} className="cd-break-gap" points={g} />)}<path className="cd-break-under" d={breaks.map(([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join('')} /><path d={breaks.map(([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join('')} /><text className="cd-end" x={rodHigh - 4} y={O.y - 17} {...endAttrs}>∞</text></g>}
      {id === 'sheet' && !inSpace && <text x={sheetRim.right.x} y={sheetRim.right.y + 24} textAnchor="end" className="cd-end" {...GIVEN}>s → ∞</text>}
      {/* DIMENSIONS, drawn as a draftsman draws them: a bar beside what it measures, a tick at each
          end, its letter beside the bar's middle -- and every one of them off the axes, the charge
          and P, which used to have the letters L and r lying on their lines. */}
      {dims.map(d => <g key={d.key} data-dim={d.dim} className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}>
        <path d={d.path} />
        {d.extension && <line className="cd-extension" x1={d.extension[0].x} y1={d.extension[0].y} x2={d.extension[1].x} y2={d.extension[1].y} />}
        {d.label && <text x={d.label.x} y={d.label.y} textAnchor={d.label.anchor} data-mirror={`${((d.a.x + d.b.x) / 2).toFixed(1)} ${((d.a.y + d.b.y) / 2).toFixed(1)}`} data-alt={d.alt} data-within={d.within} {...GIVEN}>{d.name}</text>}
      </g>)}
      {id === 'bisector' && <g data-dim="size" className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><text className="cd-end" x={O.x+17} y={O.y-R*unit-8} data-alt={rodEndAlt.top} data-within={rodEndAlt.topWithin} {...endAttrs}>+L/2</text><text className="cd-end" x={O.x+17} y={Math.min(O.y+R*unit+20, 366)} data-alt={rodEndAlt.bottom} data-within={rodEndAlt.bottomWithin} {...endAttrs}>−L/2</text></g>}
      {footed && <g data-dim="size" className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><text className={ramp ? 'cd-end cd-density-end' : 'cd-end'} x={O.x+17} y={O.y-p.size*unit-8} data-alt={rodEndAlt.top} data-within={rodEndAlt.topWithin} {...(ramp ? {} : endAttrs)}>{ramp ? <SymbolText symbol="λ = λ_0" /> : 'y = L'}</text><text className={ramp ? 'cd-end cd-density-end' : 'cd-end'} x={O.x+19} y={O.y-9} data-alt={rodEndAlt.bottom} data-within={rodEndAlt.bottomWithin} {...(ramp ? {} : endAttrs)}>{ramp ? 'λ = 0' : 'y = 0'}</text></g>}
      {/* The rod's far end, by its coordinate: "L" here as well as under the bar was two L's. */}
      {/* Under the tick where the L and a bars meet, below the axis: above it, on the line the piece's
          ΔQ is written on, the two read as one phrase. */}
      {id === 'axial' && <g data-dim="size" className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><text className="cd-end" x={O.x+p.size*unit} y={barY + 8 + .98 * SYM * labelScale} textAnchor="middle" data-mirror={`${(O.x+p.size*unit).toFixed(1)} ${barY.toFixed(1)}`} data-alt={rodEndAlt.top} {...endAttrs}>x = L</text></g>}
      {/* The radius, named beside its middle -- or nearer either end, above or below it, where the middle
          is taken: flat, a sheet's chosen ring is an ellipse that hems the radius in at its middle. */}
      {rim && <g data-dim="size" data-rim="true" className="cd-dimension"><path d={`M${O.x.toFixed(1)} ${O.y.toFixed(1)}L${rim.tip.x.toFixed(1)} ${rim.tip.y.toFixed(1)}`} />
        <text x={rim.spot.x.toFixed(1)} y={rim.spot.y.toFixed(1)} textAnchor={rim.spot.anchor} data-mirror={`${rim.mid.x.toFixed(1)} ${rim.mid.y.toFixed(1)}`} data-alt={rim.alt} {...GIVEN}>R</text></g>}
      {perspective && <g data-dim={id === 'disk' ? undefined : 'size'} className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={`M${O.x} ${O.y}L${radiusTip.x} ${radiusTip.y}`} /><text x={O.x+(radiusTip.x-O.x)*.6} y={O.y+(radiusTip.y-O.y)*.6+19} data-mirror={`${(O.x+(radiusTip.x-O.x)*.6).toFixed(1)} ${(O.y+(radiusTip.y-O.y)*.6).toFixed(1)}`}
        // Not past .85 of the way out on the flat sheet, where "s → ∞" stands under the axis' end: as the walk went out,
        // s took that place right under it and the two read as one garbled name, "s / s → ∞".
        data-alt={(id === 'sheet' && !inSpace ? [.35, .6] : [.35, .85]).flatMap(f => [19, -8].map(dy => `${(O.x + (radiusTip.x - O.x) * f).toFixed(1)} ${(O.y + (radiusTip.y - O.y) * f + dy).toFixed(1)} start`)).join(';')} {...GIVEN}>{surface ? 's' : 'R'}</text></g>}
      {id === 'arc' && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><g data-dim="angle"><path className="cd-phi-arc" d={pathThrough(circlePoints(R*PHI_AT, -p.phi/2, p.phi/2)) + (arcLetters?.phiHeads ?? '')} />{arcLetters && <text x={arcLetters.phi.x.toFixed(1)} y={arcLetters.phi.y.toFixed(1)} textAnchor="middle" data-alt={arcLetters.phiAlt} data-within={arcLetters.phiWithin} {...GIVEN}>{setUpright('φ')}</text>}</g>
        {/* Not while the pair is drawn: the radius runs to the arc's lower end, on the y axis at the default φ, which is
            the line the two sideways parts are drawn on -- R's letter stood beside ΔE_y's shaft and took ΔE_y's place,
            and ΔE_y went out by the arc's end, read as the end's name. r_i = R names the radius in that stage. */}
        {arcLetters && !pairing && <g data-dim="size" data-arc-radius="true"><path d={arcLetters.rPath} /><text x={arcLetters.rSpot.x.toFixed(1)} y={arcLetters.rSpot.y.toFixed(1)} textAnchor={arcLetters.rSpot.anchor} data-mirror={`${((O.x + arcLetters.rTip.x) / 2).toFixed(1)} ${((O.y + arcLetters.rTip.y) / 2).toFixed(1)}`} data-alt={arcLetters.rAlt} {...GIVEN}>R</text></g>}</g>}
      {pieceLength && <g className="cd-piece-length" data-piece-length={pieceLength.name}>
        <path d={pieceLength.path} />
        <text x={pieceLength.label.x.toFixed(1)} y={pieceLength.label.y.toFixed(1)} textAnchor={pieceLength.label.anchor} data-mirror={`${pieceLength.mirror.x.toFixed(1)} ${pieceLength.mirror.y.toFixed(1)}`} data-alt={pieceLength.alt} data-within={pieceLength.within} {...termAttrs(true)}>{setUpright(pieceLength.name)}</text>
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
          {/* On the arc, a place right of its tip as well, inside the angle φ: every other place it had was up by P's
              name, and it went out on a leader that ran into P beside P's own. */}
          <Vector from={P} to={plus(P, partnerDropScreen)} clip={plotClip} color="var(--contribution)" width={2.4} dashed dash="3 3" label={'\u2212' + dropSymbol} at="tip" reduced={still} keep={stageCancel} priority={2} fade={GHOST * cancelT} muted
            alts={id === 'arc' ? `${(P.x + partnerDropScreen.x + 8).toFixed(1)} ${(P.y + partnerDropScreen.y + 4 + .3 * SYM * labelScale).toFixed(1)} start` : undefined} />
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
      {/* THE LINK THE WALK HAS JUST ADDED, in the piece's own colour and with its own head: the lit piece has its ΔQ and
          its line to P, and every link of the chain was the same teal with the same joints, so nothing matched "this
          piece" to "this arrow" and the chain read as a growing wiggle. The column of a potential marks its newest
          block the same way. */}
      {building === 'add' && !scalar && !handOver && newestLink && <g className="cd-sum-newest" data-sum-newest="true"><Vector from={newestLink[0]} to={newestLink[1]} color="var(--contribution)" width={3.6} reduced ghost={inSpace} clip={plotClip} /></g>}
      {!scalar && chainEnds && chainPoints.length > 1 && <path className="cd-sum-chain cd-sum-chain-ends" d={chainEnds} fill="none" clipPath={plotClip} style={{ opacity: clamp((1 - continuum) / .7, 0, 1) }} />}
      {building === 'add' && !scalar && chainPoints.length > 1 && chainPoints.length <= 65 && chainPoints.slice(1, -1).map((c, k) => Math.hypot(c.x - chainPoints[k].x, c.y - chainPoints[k].y) < 8 ? null : <circle key={k} className="cd-sum-joint" cx={c.x} cy={c.y} r="2.8" />)}
      {/* THE PAIR GOING IN, at the tip of the sum so far (see `pairDraw`): the mirror's whole arrow in its lighter
          tint under the piece's, their parts across dashed, and their parts along the axis -- the mirror's laid
          first, so the piece's is on top while the two coincide. In space the scene draws them as bodies. */}
      {pairDraw && pairNow && !inSpace && <g className="cd-pair-step" data-pair-step={pairNow.k} data-pair-from={`${pairDraw.from.x.toFixed(1)} ${pairDraw.from.y.toFixed(1)}`} data-pair-cancel={pairNow.cancel.toFixed(3)} data-pair-merge={pairNow.merge.toFixed(3)}>
        {pairDraw.b && <g data-pair-whole="partner" opacity={pairDraw.whole}><Vector from={pairDraw.from} to={plus(pairDraw.from, pairDraw.b)} clip={plotClip} color={PARTNER_TINT} width={1.8} reduced /></g>}
        {pairDraw.b && <g data-pair-whole="piece" opacity={pairDraw.whole}><Vector from={pairDraw.from} to={plus(pairDraw.from, pairDraw.a)} clip={plotClip} color="var(--contribution)" width={1.8} reduced /></g>}
        {pairDraw.hasDrop && pairDraw.bDrop && <>
          <g data-pair-across="piece" opacity={pairDraw.dropFade}><Vector from={pairDraw.from} to={plus(pairDraw.from, pairDraw.aDrop)} clip={plotClip} color="var(--contribution)" width={2.4} dashed reduced /></g>
          <g data-pair-across="partner" opacity={pairDraw.dropFade}><Vector from={pairDraw.from} to={plus(pairDraw.from, pairDraw.bDrop)} clip={plotClip} color="var(--contribution)" width={2.4} dashed reduced /></g>
        </>}
        {pairDraw.bKeep && <g data-pair-along="partner" opacity={pairDraw.keepFade}><Vector from={pairDraw.bKeepFrom} to={plus(pairDraw.bKeepFrom, pairDraw.bKeep)} clip={plotClip} color={PARTNER_TINT} width={2.4} reduced /></g>}
        <g data-pair-along="piece" opacity={pairDraw.keepFade}><Vector from={pairDraw.from} to={plus(pairDraw.from, pairDraw.aKeep)} clip={plotClip} color="var(--contribution)" width={2.4} reduced /></g>
      </g>}
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
      {/* While the pairs go in, the sum is named once it is long enough to carry its name clear of P's: a first
          pair's share is a stub beside P, and its name stood on P's own. */}
      {/* By the name's own size: on a phone it is half as large again, and a sum just long enough at the desktop's
          size centred its name back over P's. And while the pairs go in, on the side of the arrow away from P's name --
          past its tip is where the pair arrives. */}
      {netShown && <g className="cd-sum-arrow" data-sum-arrow="true"><Vector from={P} to={plus(P, net)} width={3.5} label={finished ? 'E' : pairNow && Math.hypot(net.x, net.y) < 34 * labelScale ? undefined : '\u03a3 \u0394E'} side={awayFrom(net, toCharge) ?? (pairNow ? awayFrom(net, { x: pLabel.dx, y: pLabel.dy }) : undefined)} reduced={still} ghost={inSpace} keep={!building || building === 'add' || building === 'limit'} priority={building === 'add' || building === 'limit' ? 2 : 1} clip={plotClip} /></g>}
      {/* Each pair's share of the sum, marked across its arrow. */}
      {netShown && pairTicks.d && <path className="cd-pair-ticks" data-pair-ticks={String((pairTicks.d.match(/M/g) ?? []).length)} d={pairTicks.d} fill="none" clipPath={plotClip} style={build?.key === 'limit' ? { opacity: clamp((1 - continuum) / .7, 0, 1) } : undefined} />}
      {/* Where the sum went before the far pairs brought it back: see `pairTicks`. */}
      {netShown && pairTicks.ghost && <g className="cd-pair-overshoot" data-pair-overshoot={String((pairTicks.ghostTicks.match(/M/g) ?? []).length)} clipPath={plotClip} style={build?.key === 'limit' ? { opacity: clamp((1 - continuum) / .7, 0, 1) } : undefined}>
        <path className="cd-pair-overshoot-line" d={pairTicks.ghost} fill="none" /><path className="cd-pair-overshoot-ticks" d={pairTicks.ghostTicks} fill="none" /></g>}
      {netShown && trueField && <g className="cd-true-field" data-true-field="true">
        {trueOffset && <path className="cd-true-field-ends" d={[P, plus(P, trueField)].map(q => `M${q.x.toFixed(1)} ${q.y.toFixed(1)}l${(trueOffset.x * 1.4).toFixed(1)} ${(trueOffset.y * 1.4).toFixed(1)}`).join('')} />}
        <Vector from={trueFrom} to={plus(trueFrom, trueField)} width={2.2} label="E" at="tip" reduced={still} fade={.8} clip={plotClip} keep priority={2} /></g>}
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
      {/* Not in Cut it up: there nothing is on the pile yet, and a faint empty column with its name taken away
          stood beside P unexplained. */}
      {scalar && gauge && building !== 'pieces' && <g className="cd-gauge" aria-hidden="true" data-stack={String(n)}>
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
            data-gauge-name="true" data-within={`0 ${P.y.toFixed(1)} 0 ${gauge.up ? -1 : 1}`} {...(gauge.name === '\u03a3 \u0394V' && hideAnswer ? {} : { 'data-keep': 'true', 'data-priority': 2 })}>{setUpright(gauge.name)}</text>
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
          data-priority="3" data-keep="true" data-mirror={pLabel.mirror ? `${P.x.toFixed(1)} ${P.y.toFixed(1)}` : undefined} data-alt={pLabel.alternates || undefined}>{id === 'arc' && !pPlain ? <>P = <tspan className="cd-origin-o">O</tspan></> : 'P'}</text>
      </g>
      {(showContribution || building === 'pieces' || highlight === 'element') && <g className="cd-source-tag"><line x1={source.x} y1={source.y} x2={source.x+(source.x>560?-22:22)} y2={source.y+(source.y<95?22:-20)} /><text data-leader="true" data-leader-from={`${source.x.toFixed(1)} ${source.y.toFixed(1)}`} data-within={tagWithin} x={source.x+(source.x>560?-27:27)} y={source.y+(source.y<95?27:-21)} textAnchor={source.x>560?'end':'start'} data-alt={tagAlternates} {...(stageCancel ? (perspective ? termAttrs(true) : { 'data-priority': 1 }) : termAttrs(building === 'pieces' || stageOne || building === 'add' || building === 'limit' || highlight === 'element'))}>{sourceVisible ? (surface ? <><tspan className="cd-word">ring </tspan><SymbolText symbol={elementSymbol} /></> : <SymbolText symbol={elementSymbol} />) : <><SymbolText symbol={elementSymbol} /><tspan className="cd-word"> outside view</tspan></>}</text></g>}
      {/* THE LIMITS OF INTEGRATION, named as the lesson writes them -- -L/2 and L/2, 0 and 2pi -- and
          only while a handle sits on a limit: dragged in, it is wherever the reader put it, which has
          no name. They used to be "a" and "b" everywhere, which on the rod seen along its axis is
          also the gap to P, so two different a's stood in one figure. A closed ring's two ends are
          one point, so they are one handle until they are dragged apart; a limit that lies off the
          page is an arrow at the edge pointing to it, not a handle pinned in the frame's corner. */}
      {ringAngle && <g className="cd-piece-angle" data-ring-angle="true">
        {ringAngle.rays.map((q, k) => <line key={k} className="cd-piece-ray" x1={O.x.toFixed(1)} y1={O.y.toFixed(1)} x2={q.x.toFixed(1)} y2={q.y.toFixed(1)} />)}
        <path className="cd-angle-arc" d={pathThrough(ringAngle.arc)} />
        <text x={ringAngle.spot.x.toFixed(1)} y={ringAngle.spot.y.toFixed(1)} textAnchor={ringAngle.spot.anchor} data-mirror={`${ringAngle.mid.x.toFixed(1)} ${ringAngle.mid.y.toFixed(1)}`} {...termAttrs(true)}><SymbolText symbol={ringAngle.name} /></text>
      </g>}
      {pieceAngle && <g className="cd-piece-angle" data-piece-angle={pieceAngle.box ? 'true' : undefined}>
        {pieceAngle.rays.map((q, k) => <line key={k} className="cd-piece-ray" x1={P.x.toFixed(1)} y1={P.y.toFixed(1)} x2={q.x.toFixed(1)} y2={q.y.toFixed(1)} />)}
        {pieceAngle.node}
      </g>}
      {/* The triangle the distance and the angle are read off: see `triangle` above. */}
      {triangle && <g className="cd-triangle" data-kind={triangle.kind}>
        {triangle.kind === 'schematic' && (() => { const { zSpot, baseSpot, riSpot, top, corner, end } = triangle;
          // The angle at the top, inside it, centred where the wedge is wide enough to hold it: the wedge
          // there opens at half the top angle, whose tangent is the foot over the height, 81 over 62.
          const half = Math.atan2(81, 62) / 2, h = 1.37 * termSize, d = Math.max(30, (h / 2 + 3) / Math.sin(half));
          const alpha = { x: top.x + Math.sin(half) * d, y: top.y + Math.cos(half) * d + .3 * termSize };
          const at = (q: Point) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`, mid = (a: Point, b: Point) => at({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          const arcEnd = { x: top.x + 17 * Math.sin(2 * half), y: top.y + 17 * Math.cos(2 * half) };
          // Each side's letter stays outside the triangle on its own side's side: moved anywhere inside, it
          // stood under the angle's arc and read as the angle. The angle's letter is the one place inside, worked
          // out here, and is fixed there as an angle's letter is.
          const slope = direction({ x: end.y - top.y, y: -(end.x - top.x) }) ?? { x: .6, y: -.8 };
          return <>
            <path d={`M${at(corner)}L${at(top)}L${at(end)}Z`}/><path className="cd-right-angle" d={`M${corner.x.toFixed(1)} ${(corner.y - 8).toFixed(1)}h8v8`}/>
            {!scalar && <path className="cd-angle-arc" d={`M${top.x.toFixed(1)} ${(top.y + 17).toFixed(1)}A17 17 0 0 0 ${at(arcEnd)}`}/>}
            <text x={zSpot.x.toFixed(1)} y={zSpot.y.toFixed(1)} textAnchor={zSpot.anchor} data-mirror={mid(top, corner)} data-within={`${corner.x.toFixed(1)} 0 -1 0`} {...GIVEN}>z</text>
            <text x={baseSpot.x.toFixed(1)} y={baseSpot.y.toFixed(1)} textAnchor={baseSpot.anchor} data-mirror={mid(corner, end)} data-within={`0 ${corner.y.toFixed(1)} 0 1`} {...GIVEN}>{surface ? 's' : 'R'}</text>
            <text x={riSpot.x.toFixed(1)} y={riSpot.y.toFixed(1)} textAnchor={riSpot.anchor} data-mirror={mid(top, end)} data-within={`${top.x.toFixed(1)} ${top.y.toFixed(1)} ${slope.x.toFixed(3)} ${slope.y.toFixed(3)}`} className="cd-ri" {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" /></text>
            {!scalar && <text className="cd-angle" x={alpha.x.toFixed(1)} y={alpha.y.toFixed(1)} textAnchor="middle" data-anchor="fixed" {...(stageCancel ? termAttrs(true) : GIVEN)}>{setUpright('α')}</text>}
            <text x={corner.x.toFixed(1)} y={(baseSpot.y + 18).toFixed(1)} className="cd-triangle-note">Same triangle · not to scale</text>

          </>; })()}
        {triangle.kind === 'slope' && <text x={triangle.riSpot.x.toFixed(1)} y={triangle.riSpot.y.toFixed(1)} textAnchor={triangle.riSpot.anchor} data-mirror={`${triangle.hyp.x.toFixed(1)} ${triangle.hyp.y.toFixed(1)}`} className="cd-ri" {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" /></text>}
        {triangle.kind === 'arc' && <><line x1={P.x} y1={P.y} x2={selectedPoint.x} y2={selectedPoint.y}/>{triangle.mark?.node}
          {/* The line from the piece to P is r_i, and on the arc every r_i is R: the board writes the field
              with r_i, and the figure drew the line unnamed. On the side of it away from θ. */}
          {triangle.riSpot && <text x={triangle.riSpot.x.toFixed(1)} y={triangle.riSpot.y.toFixed(1)} textAnchor={triangle.riSpot.anchor} data-mirror={`${triangle.hyp.x.toFixed(1)} ${triangle.hyp.y.toFixed(1)}`} className="cd-ri" {...(stageOne ? termAttrs(true) : { 'data-priority': 1 })}><SymbolText symbol="r_i" tail=" = R" /></text>}</>}
        {triangle.kind === 'axial' && (() => { const { a, b, o } = triangle;
          return <>
            {triangle.xShown && <g data-piece-coordinate="true"><path className="cd-x-bar" d={triangle.xBar} />
              <text x={triangle.xName.x.toFixed(1)} y={triangle.xName.y.toFixed(1)} textAnchor={triangle.xName.anchor} data-mirror={`${((o.x + a.x) / 2).toFixed(1)} ${((o.y + a.y) / 2).toFixed(1)}`} data-within={triangle.xWithin} {...(stageOne ? termAttrs(true) : GIVEN)}>x</text></g>}
            <path className="cd-ri-bar" d={triangle.riBar} />
            <text x={triangle.riName.x.toFixed(1)} y={triangle.riName.y.toFixed(1)} textAnchor={triangle.riName.anchor} data-mirror={`${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}`} {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" tail=" = L + a − x" /></text>
          </>; })()}
        {triangle.kind === 'rod' && (() => { const { start, foot, met, extension, square, riSpot, hyp, legMid, legSpot, legAlt, legWithin, legLength, flat, mark, hasLeg, baseMid, rSpot, rAlt, rWithin } = triangle;
          return <>
            {hasLeg && <path data-leg="true" d={`M${met.x.toFixed(1)} ${met.y.toFixed(1)}L${foot.x.toFixed(1)} ${foot.y.toFixed(1)}L${P.x.toFixed(1)} ${P.y.toFixed(1)}`} />}
            {hasLeg && legLength > 4 && <path className="cd-extension-tick" data-leg-extension="true" d={`M${met.x.toFixed(1)} ${met.y.toFixed(1)}L${start.x.toFixed(1)} ${start.y.toFixed(1)}L${extension[1].x.toFixed(1)} ${extension[1].y.toFixed(1)}`} />}
            {square && <path className="cd-right-angle" d={square} />}
            <text x={riSpot.x.toFixed(1)} y={riSpot.y.toFixed(1)} textAnchor={riSpot.anchor} data-mirror={`${hyp.x.toFixed(1)} ${hyp.y.toFixed(1)}`} data-within={legWithin} className="cd-ri" {...termAttrs(distanceTerm)}><SymbolText symbol="r_i" /></text>
            {legLength > 14 && <text x={legSpot.x.toFixed(1)} y={legSpot.y.toFixed(1)} textAnchor={legSpot.anchor} data-mirror={`${legMid.x.toFixed(1)} ${legMid.y.toFixed(1)}`}
              data-alt={legAlt} data-within={legWithin} {...(distanceTerm ? termAttrs(true) : { 'data-priority': 1 })}>{flat ? 'x' : 'y'}</text>}
            {rOnLeg && hasLeg && <text x={rSpot.x.toFixed(1)} y={rSpot.y.toFixed(1)} textAnchor={rSpot.anchor} data-dim="distance" data-mirror={`${baseMid.x.toFixed(1)} ${baseMid.y.toFixed(1)}`} data-alt={rAlt} data-within={rWithin} {...GIVEN}>r</text>}
            {mark?.node}
          </>; })()}
      </g>}
      {/* r_i on the line from P to the piece, in its own group: it is the scene's, not the schematic's. */}
      {triangle?.kind === 'schematic' && triangle.riOnLine && <g className="cd-ri-line">
        <text x={triangle.riOnLine.spot.x.toFixed(1)} y={triangle.riOnLine.spot.y.toFixed(1)} textAnchor={triangle.riOnLine.spot.anchor} data-ri-line="true"
              data-mirror={`${triangle.riOnLine.hyp.x.toFixed(1)} ${triangle.riOnLine.hyp.y.toFixed(1)}`} data-within={`${O.x.toFixed(1)} 0 ${triangle.riOnLine.side} 0`} className="cd-ri" {...(narrow ? { 'data-priority': 1 } : termAttrs(distanceTerm))}><SymbolText symbol="r_i" /></text>
      </g>}
      {/* THE CHARGE'S OWN MARKS, painted over the construction and the triangle rather than under them,
          each with a thin ring of the ground colour: a dashed stroke laid through a + turned it into a
          minus sign. Their size goes with the labels', so on a phone they are still marks. */}
      {/* Not under a limit's handle: the last + at each end of the rod stood half under it. */}
      {rodLike && <g data-dim="charge" className="cd-plus" aria-hidden="true">{chargeMarks.filter(v => !bounds.some(b => b.mark && !b.edge && Math.hypot((upright ? O.x : v) - b.at.x, (upright ? v : O.y) - b.at.y) < 13 * labelScale)).map(v => <text key={v} className={onFill(v) ? 'is-on-fill' : undefined} x={upright ? O.x : v} y={(upright ? v : O.y) + 4.5 * labelScale} textAnchor="middle">{p.charge < 0 ? '\u2212' : '+'}</text>)}</g>}
      {/* The arc's sign, as the rods carry theirs: one mark on each piece's middle, fewer where the pieces are too
          short to hold one each. It carried none, and on the arc's potential the column's direction -- up from P
          or down -- depends on a sign nothing on the figure gave. */}
      {arcMarks.length > 0 && <g data-dim="charge" className="cd-plus" aria-hidden="true">{arcMarks.map(m => <text key={m.key} className={m.lit ? 'is-on-fill' : undefined} x={m.at.x.toFixed(1)} y={(m.at.y + 4.5 * labelScale).toFixed(1)} textAnchor="middle">{p.charge < 0 ? '\u2212' : '+'}</text>)}</g>}
      {/* The limits' handles, painted over the charge's marks: a + printed on a handle read as a mark of
          the handle's. */}
      {handlesShown && bounds.map(b => <g key={b.key} {...handle(b.handle)} className={'cd-bound' + (b.edge && b.mark ? ' is-edge' : '')} data-bound={b.key}>
        <circle cx={b.at.x} cy={b.at.y} r="17" fill="transparent" />
        {b.mark && (b.edge ? <path d={b.edge} /> : <rect x={b.at.x-7} y={b.at.y-7} width="14" height="14" rx="3.5" />)}
        {/* The stage that sets the limits keeps their names: the placer may move them, never drop them. */}
        {b.name && <text x={b.label.x} y={b.label.y} textAnchor={b.label.anchor} data-alt={b.alt} {...(building === 'limit' ? { 'data-priority': 2, 'data-keep': 'true' } : { 'data-priority': 0 })} data-mirror={`${b.at.x.toFixed(1)} ${b.at.y.toFixed(1)}`}>{setUpright(b.name)}</text>}
      </g>)}
      {/* ...and in Add them up, the same names with no handle: see `rangeNamed`. */}
      {rangeNamed && bounds.map(b => b.name ? <g key={b.key} className="cd-bound cd-bound-name" data-bound-name={b.key}>
        <text x={b.label.x} y={b.label.y} textAnchor={b.label.anchor} data-alt={b.alt} data-priority={2} data-keep="true" data-mirror={`${b.at.x.toFixed(1)} ${b.at.y.toFixed(1)}`}>{setUpright(b.name)}</text>
      </g> : null)}
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
      {([['2D', false], ['3D', true]] as const).map(([label, wants]) => <button key={label} type="button" disabled={wants && noScene} title={wants && noScene ? 'The 3D view is not available on this device' : wants ? 'In space: drag, scroll or use the arrow keys to turn it' : 'Flat, looking straight down the axis'}
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
    {/* An <output>: a status, announced as it appears. */}
    {noScene && <output className="cd-stage-unavailable">The 3D view is not available on this device.</output>}
    </div>
    <div className="cd-caption"><span>{sourceText}</span>
    <details className="cd-controls" open={!compact}><summary>Keyboard help</summary>{/* A footnote on the caption line, not a fourth section. It used to be called "Diagram controls", which promised a second control panel and delivered the sliders the page already carries -- so a reader who opened it found the distance slider twice and concluded one of them was a different thing. It is the keyboard and screen-reader path: name it that, and the duplicates read as what they are, the same controls reachable another way. The drawn legend says how to turn and zoom; this says what a drawing cannot -- what Tab reaches, what Home and End do -- and says it to a reader who cannot see the legend at all. */}<p id={`${uid}help`}>The same controls the figure and the page carry, reachable from the keyboard — not a second set. Tab moves between them; arrow keys adjust one, Home and End (Search with ← and → on a Chromebook) take it to its limits. P and the integration bounds also drag in the figure.{inSpace?' The figure takes focus too: arrow keys turn it, plus and minus zoom, Home puts it back.':''}</p>
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
