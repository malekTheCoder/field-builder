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
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { animate, frame, motion, useMotionValue, useReducedMotion } from 'motion/react';
import type { Params, Problem } from '../problems/types';
import { field, magnitude, pretty, potential, type Vec } from '../symbolic/physics';
import { sampleDistribution, sumSamples, sumInterval, intervalWeights, sumPotential } from './sampling';
import { intervalKey, partitionCount, seamFractions, seamKey, splitFractions, splitProgress } from './subdivision';
import { DEFAULT_CAMERA, clampCamera, depthFromScreen, keyboardCamera, orbitCamera, projectCamera, type CameraView } from './camera';
import { placeLabels, type Box } from './labels';
import { FieldCanvas } from './FieldCanvas';
import { FieldStage } from './three/FieldStage';
import './charge-diagram.css';
import './camera.css';

type Point = { x: number; y: number };
export type ChargeDiagramProps = {
  problem: Problem; params: Params; setParams: (p: Partial<Params>) => void;
  count: number; continuum: number; selected: number; onSelect: (i: number) => void;
  progress: number; components: boolean; pair: boolean;
  mode: 'divide' | 'project' | 'sum' | 'integrate';
  highlight?: string; boundRange?: [number, number]; onBoundRangeChange?: (r: [number, number]) => void;
  /** Predict-first. While `predicting`, the field is withheld and the guess is draggable.
   * Afterwards the guess stays on the figure beside the field so the two can be compared. */
  predicting?: boolean; prediction?: Point | null; onPredict?: (offset: Point) => void;
  /** The net arrow as drawn, so a guess can be compared against what is actually on screen. */
  onNetScreen?: (offset: Point) => void;
  /** Start the control drawer closed: on a page that already carries its own controls, the
   * drawer is a second copy of them. */
  compact?: boolean;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
/** How long the predicted arrow is drawn, in viewBox units. One length for every guess:
 * the prediction is a direction, and a length that varied would read as a claim. */
const GUESS_LENGTH = 64;
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
function Vector({ from, to, color = 'var(--field)', width = 2.5, dashed = false, label, reduced = false, ghost = false }: { from: Point; to: Point; color?: string; width?: number; dashed?: boolean; label?: string; reduced?: boolean; ghost?: boolean }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y), angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.min(7, length * .32), a = { x: to.x - head * Math.cos(angle - .45), y: to.y - head * Math.sin(angle - .45) }, b = { x: to.x - head * Math.cos(angle + .45), y: to.y - head * Math.sin(angle + .45) };
  return <g className="cd-vector" style={{ color }} opacity={length < .2 ? 0 : 1}>
    <motion.line initial={false} animate={{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }} transition={{ duration: reduced ? 0 : .13, ease: 'easeOut' }} stroke="currentColor" strokeWidth={width} strokeDasharray={dashed ? '4 4' : undefined} style={{ opacity: ghost ? 0 : 1 }} />
    <motion.path initial={false} animate={{ d: `M${a.x},${a.y}L${to.x},${to.y}L${b.x},${b.y}` }} transition={{ duration: reduced ? 0 : .13 }} fill="none" stroke="currentColor" strokeWidth={width} style={{ opacity: ghost ? 0 : 1 }} />
    {label && length > 10 && <text x={to.x + (to.x < from.x ? -9 : 9)} y={to.y - 9} textAnchor={to.x < from.x ? 'end' : 'start'} className="cd-vector-label" fill="currentColor">{label}</text>}
  </g>;
}
function ViewHelp({ x, y }: { x: number; y: number }) {
  // Drawn into the figure rather than written beside it: a reader who has never orbited a
  // 3D view does not know that dragging turns it, and a sentence in the chrome is read last
  // if at all. A mouse with a turning arrow, a wheel with an up-down arrow, and four key
  // caps say it without a sentence. One row per gesture, so nothing crowds anything.
  const ROW = 16;
  const cap = (kx: number, glyph: string) => <g key={glyph}>
    <rect x={kx} y={-6.5} width="9" height="9" rx="2" />
    <text x={kx + 4.5} y={.4} textAnchor="middle" dominantBaseline="middle">{glyph}</text>
  </g>;
  const row = (i: number, art: React.ReactNode, label: string) =>
    <g transform={`translate(0 ${i * ROW})`}>
      <g className="cd-help-art">{art}</g>
      <text className="cd-help-text" x="48" y="1" dominantBaseline="middle">{label}</text>
    </g>;
  return <g className="cd-help" transform={`translate(${x} ${y})`} aria-hidden="true">
    <rect className="cd-help-back" x="-8" y="-13" width="132" height="54" rx="8" />
    {row(0, <><rect x="1" y="-9" width="12" height="17" rx="6" /><line x1="7" y1="-9" x2="7" y2="-3" />
      <path d="M19 1a8 8 0 0 1 11-6" /><path d="M30-8.2l.5 3.2-3.2.5" /></>, 'drag to turn')}
    {row(1, <><rect x="1" y="-9" width="12" height="17" rx="6" /><line x1="7" y1="-5" x2="7" y2="-1" strokeWidth="2.2" />
      <path d="M24-8v14" /><path d="M21.5-5.5L24-8l2.5 2.5" /><path d="M21.5 3.5L24 6l2.5-2.5" /></>, 'scroll to zoom')}
    {row(2, <>{[cap(1, '\u2190'), cap(11, '\u2191'), cap(21, '\u2193'), cap(31, '\u2192')]}</>, 'arrow keys')}
  </g>;
}
export function ChargeDiagram({ problem, params: p, setParams, count, continuum, selected, onSelect, progress, components, pair, mode, boundRange = [0, 100], onBoundRangeChange, highlight = '', predicting, prediction, onPredict, onNetScreen, compact = false }: ChargeDiagramProps) {
  const cameraControl = useRef<HTMLButtonElement>(null);
  const svg = useRef<SVGSVGElement>(null), plane = useRef<SVGGElement>(null), dragging = useRef<string | null>(null), uid = useId().replace(/:/g, '');
  const yawMv = useMotionValue(DEFAULT_CAMERA.yaw), pitchMv = useMotionValue(DEFAULT_CAMERA.pitch);
  const [camera, setCamera] = useState<CameraView>(DEFAULT_CAMERA), orbitFrom = useRef<Point>({ x: 0, y: 0 });
  const glideId = useRef(0), syncId = useRef(0), spin = useRef({ yaw: 0, pitch: 0, at: 0 });
  const [gliding, setGliding] = useState(false);
  // oxlint-disable-next-line react/react-compiler -- deliberately impure: it is a stopwatch
  const root = useRef<HTMLDivElement>(null), renders = useRef(0), renderStart = performance.now();
  // Render count and cost are exposed on the root for the perf tests and for measuring in
  // the browser: the cheapest way to know whether a frame is slow because of React or
  // because of something after it.
  useLayoutEffect(() => { renders.current += 1; if (root.current) { root.current.dataset.renders = String(renders.current); root.current.dataset.renderMs = (performance.now() - renderStart).toFixed(1); } });
  const [spatial, setSpatial] = useState<boolean | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fieldView, setFieldView] = useState<'lines' | 'vectors' | 'off'>('lines');
  const reduced = !!useReducedMotion(), id = problem.geometry, scalar = problem.quantity === 'V', surface = id === 'disk' || id === 'sheet', perspective = surface || id === 'ring';
  // The ramp is the endpoint rod with a non-uniform density: same layout, different charge.
  const footed = id === 'endpoint' || id === 'ramp', ramp = id === 'ramp';
  // Looking straight down the z axis IS the flat drawing of a planar lesson: projectCamera
  // at yaw 0 and pitch a quarter turn reproduces the old planar projection to within 4e-16.
  // For a ring, a disk or a sheet the flat drawing is the textbook side view instead, the
  // plane nearly edge-on and P above it. So 2D and 3D are one projection with the camera
  // either locked or free, rather than two to keep in step.
  const FLAT: CameraView = perspective ? { yaw: 0, pitch: .15 } : { yaw: 0, pitch: Math.PI / 2 };
  // null means "whatever this geometry is normally drawn as"; the toggle sets it explicitly.
  const inSpace = spatial ?? perspective;
  const view = inSpace ? camera : FLAT;
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
  const n = Math.max(3, Math.round(count)), R = p.size / 2, selectedIndex = clamp(Math.round(selected), 0, n - 1);
  const samples = useMemo(() => sampleDistribution(id, p, n), [id, p, n]);
  const sample = samples[selectedIndex], total = sumSamples(samples), weights = intervalWeights(n,boundRange,progress), partial = sumInterval(samples,boundRange,progress);
  const wholeWeights = intervalWeights(n,boundRange,1);
  const full = boundRange[0]===0 && boundRange[1]===100;
  const displayed = continuum>=.999 && progress>=.999 && full ? field(id,p) : partial;
  const vExact = scalar ? potential(id, p) : 0;
  const vNow = scalar ? (continuum>=.999 && progress>=.999 && full ? vExact : sumPotential(samples, boundRange, progress)) : 0;
  const vScale = Math.max(Math.abs(vExact), Math.abs(vNow), ...samples.map(s => Math.abs(s.potential)), 1e-12);
  const dVmax = Math.max(...samples.map(s => Math.abs(s.potential)), 1e-20);
  const [announcement,setAnnouncement] = useState(''), pending = useRef(''), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previous = useRef({id,distance:p.distance,size:p.size,charge:p.charge,phi:p.phi,n,selectedIndex,progress,continuum,lower:boundRange[0],upper:boundRange[1]});
  useEffect(()=>{
    const old=previous.current,next={id,distance:p.distance,size:p.size,charge:p.charge,phi:p.phi,n,selectedIndex,progress,continuum,lower:boundRange[0],upper:boundRange[1]};
    previous.current=next;
    const cause=old.id!==id?problem.title:old.distance!==p.distance?`Observation distance ${pretty(p.distance)} meters`:old.lower!==next.lower||old.upper!==next.upper?`Integration interval ${next.lower} to ${next.upper} percent of the source coordinate`:old.progress!==progress?`${Math.round(progress*100)} percent of the interval accumulated`:old.n!==n||old.continuum!==continuum?`${n} charge elements${continuum>=.999?', continuous limit':''}`:old.selectedIndex!==selectedIndex?`Charge element ${selectedIndex+1} of ${n}. ${scalar?`Contribution ${pretty(sample.potential)} volts`:`Contribution magnitude ${pretty(magnitude(sample.field))} newtons per coulomb`}`:old.size!==p.size||old.charge!==p.charge||old.phi!==p.phi?'Charge distribution adjusted':'';
    if(!cause)return;
    pending.current=`${cause}. ${scalar ? `Net potential ${pretty(vNow)} volts.` : `Net field magnitude ${pretty(magnitude(displayed))} newtons per coulomb.`}`;
    // A trailing throttle reads the latest state during a drag, without indefinitely deferring speech.
    if(!timer.current)timer.current=setTimeout(()=>{setAnnouncement(pending.current);timer.current=null;},500);
  },[id,p.distance,p.size,p.charge,p.phi,n,selectedIndex,progress,continuum,boundRange,problem.title,sample.field,sample.potential,displayed,scalar,vNow]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const O: Point = perspective ? { x: 315, y: 296 } : footed ? { x: 210, y: 300 } : id === 'semi' ? { x: 300, y: 310 } : id === 'axial' ? { x: 130, y: 230 } : id === 'arc' ? { x: 375, y: 218 } : { x: 220, y: 216 };
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
  const baseUnit = perspective ? 42
    : footed ? Math.min(45, 150 / p.size)
    : id === 'bisector' ? Math.min(45, 140 / R)
    : id === 'axial' ? fit(p.size + p.distance, 510, 20, 70)
    : id === 'arc' ? fit(2 * R, 300, 25, 65)
    : 35;
  const unit = baseUnit * zoom;
  const project = (v: Vec): Point => { const s = projectCamera(v, view.yaw, view.pitch); return { x: O.x + unit * s.x, y: O.y + unit * s.y }; };
  // Screen point a distance `length` out along a world direction, for the axes and the R/s bracket.
  const ray = (v: Vec, length: number): Point => { const s = projectCamera(v, view.yaw, view.pitch); return { x: O.x + length * s.x, y: O.y + length * s.y }; };
  const axisX = ray({ x: 1, y: 0, z: 0 }, 185), axisY = ray({ x: 0, y: 1, z: 0 }, 122);
  const axisTip = (a: Point, dx: number, dy: number): Point => ({ x: clamp(a.x + dx, 52, 652), y: clamp(a.y + dy, 70, 360) });
  // Where P lives, and the line it is allowed to move along: from `pivot`, `axisDir` per unit of `distance`.
  const axisDir: Vec = id === 'arc' ? zero : id === 'axial' ? { x: 1, y: 0, z: 0 } : id === 'semi' ? { x: 0, y: 1, z: 0 } : perspective ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const pivot: Vec = id === 'axial' ? { x: p.size, y: 0, z: 0 } : zero;
  const pWorld: Vec = { x: pivot.x + axisDir.x * p.distance, y: pivot.y + axisDir.y * p.distance, z: pivot.z + axisDir.z * p.distance };
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
  const selectedPoint = project(sample.position), visible = (v: Point) => v.x > 45 && v.x < 665 && v.y > 58 && v.y < 365;
  const sourceVisible = visible(selectedPoint);
  const source = { x: clamp(selectedPoint.x, 52, 657), y: clamp(selectedPoint.y, 62, 362) };
  // A common numeric scale applies to net and component arrows. The selected
  // element has an explicitly stated magnification so tiny dE remains inspectable.
  const fieldNorm = Math.max(magnitude(total), ...samples.map(s => magnitude(s.field)), 1e-9);
  const scaleValue = 2 ** Math.ceil(Math.log2(fieldNorm));
  const gain = 100 / scaleValue;
  const fieldScreen = (v: Vec, multiplier = 1): Point => { const k = gain * multiplier; const s = projectCamera(v, view.yaw, view.pitch); return { x: k * s.x, y: k * s.y }; };
  const selectedGain = Math.max(1, Math.min(1000, 55 / Math.max(.001, Math.hypot(fieldScreen(sample.field).x, fieldScreen(sample.field).y))));
  const contribution = fieldScreen(sample.field, selectedGain);
  const projectedComponent = fieldScreen(perspective ? { x: 0, y: 0, z: sample.field.z } : { x: sample.field.x, y: 0, z: 0 }, selectedGain);
  const net = fieldScreen(displayed);
  const chainPoints: Point[] = [];
  if (!scalar && mode === 'sum') {
    let cursor = P;
    chainPoints.push(P);
    for (let i = 0; i < samples.length; i++) {
      const w = weights[i];
      if (w === 0) continue;
      cursor = plus(cursor, fieldScreen(scaleVec(samples[i].field, w)));
      chainPoints.push(cursor);
    }
  }
  // Report the net arrow in the units it is drawn in. Keyed on the rounded value so an
  // unchanged arrow does not re-notify every render, and held in a ref so a caller that
  // passes a fresh closure each render does not restart the effect.
  // Key repeat delivers a burst faster than React re-renders, so reading the guess from
  // props would make every press in the burst compute from the same stale start and all
  // land on the same angle. The live value is mirrored here and advanced immediately.
  const liveGuess = useRef<Point | null>(prediction ?? null);
  useEffect(() => { liveGuess.current = prediction ?? null; }, [prediction]);
  const netCallback = useRef(onNetScreen);
  useEffect(() => { netCallback.current = onNetScreen; });
  const netKey = `${net.x.toFixed(2)},${net.y.toFixed(2)}`;
  // Not while the view is turning: the caller stores this in state, and a report per camera
  // frame re-rendered the whole panel, KaTeX and all, on every frame of an orbit. It is
  // reported once the motion settles, which is the only time a comparison is read anyway.
  useEffect(() => { if (moving) return; const [x, y] = netKey.split(',').map(Number); netCallback.current?.({ x, y }); }, [netKey, moving]);
  // Keep the labels off each other.
  //
  // Every label sits at an offset chosen by hand for one arrangement of the geometry, and
  // those offsets go on being what they were when the geometry moves: measured across all
  // fifteen lessons, twelve put two labels on top of each other at some parameter value.
  // Re-tuning each offset would fix a reading and break the next one, because the fault is
  // that no label knows what else is on the page. So they are laid out where they ask to be
  // and then whichever ones actually collide are nudged to the nearest free spot.
  //
  // After layout, and not while anything is moving: a drag would pay for a second layout
  // pass every frame to reposition labels nobody is reading mid-gesture.
  useLayoutEffect(() => {
    const root = svg.current;
    if (!root || moving) return;
    const texts = [...root.querySelectorAll<SVGGraphicsElement>('text')].filter(t => !t.closest('.cd-help'));
    if (!texts.length) return;
    // Measure with any previous nudge removed, so the desired position is what is measured
    // and a label does not creep further on every pass.
    for (const t of texts) t.removeAttribute('transform');
    const frameRect = root.getBoundingClientRect();
    if (frameRect.width < 2 || frameRect.height < 2) return;
    const sx = 720 / frameRect.width, sy = 430 / frameRect.height;
    // Client rects, not getBBox: a label inside the orbiting plane is measured in that
    // plane's coordinates, and only the screen box puts every label in one space.
    const toFrame = (r: DOMRect): Box => ({ x: (r.left - frameRect.left) * sx, y: (r.top - frameRect.top) * sy, width: r.width * sx, height: r.height * sy });
    const labels = texts.map(t => ({ box: toFrame(t.getBoundingClientRect()), fixed: t.dataset.anchor === 'fixed' }));
    const obstacles = [...root.querySelectorAll<SVGGraphicsElement>('.cd-point, .cd-point-halo')].map(el => toFrame(el.getBoundingClientRect()));
    const nudges = placeLabels(labels, { frame: { width: 720, height: 430 }, obstacles, pad: 2 });
    texts.forEach((t, i) => {
      const { dx, dy } = nudges[i];
      if (dx || dy) t.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    });
  });
  // The wire's shape, from the geometry itself at a resolution that reads as smooth. Not
  // from the samples: those are the partition, and a ring cut into five pieces is still a
  // ring, not a pentagon.
  const bodyPath = surface ? undefined : Array.from({ length: 129 }, (_, k) => world(k / 128));
  const showContribution = mode !== 'divide' || !!highlight;
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
    if (surface) {
      const radii = samples.map(s => Math.abs(s.coordinate));
      const here = radii[selectedIndex], step = radii.length > 1 ? Math.abs((radii[radii.length - 1] - radii[0]) / (radii.length - 1)) : here;
      return { annulus: { inner: Math.max(0, here - step / 2), outer: here + step / 2 } };
    }
    const lo = selectedIndex / n, hi = (selectedIndex + 1) / n;
    return { path: Array.from({ length: 13 }, (_, k) => world(lo + (hi - lo) * k / 12)) };
  })();
  const elementSymbol = continuum>=.999 ? 'dQ' : 'ΔQ';
  const fieldSymbol = continuum>=.999 ? 'dE' : 'ΔE';
  const partnerIndex = id === 'ring' ? (selectedIndex + Math.floor(n / 2)) % n : n - 1 - selectedIndex;
  const supportsPair = !scalar && (id === 'bisector' || id === 'infinite' || id === 'ring' || id === 'arc');
  const [cancelT, setCancelT] = useState(0);
  const cancelRun = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    cancelRun.current?.stop();
    if (!supportsPair || !pair) {
      const t = requestAnimationFrame(() => setCancelT(0));
      return () => cancelAnimationFrame(t);
    }
    if (reduced) {
      const t = requestAnimationFrame(() => setCancelT(1));
      return () => cancelAnimationFrame(t);
    }
    // 1.15s: long enough to see the two transverse arrows shrink onto the surviving axis.
    const ctrl = animate(0, 1, { duration: 1.15, ease: [.22, .7, .2, 1], onUpdate: setCancelT });
    cancelRun.current = ctrl;
    return () => ctrl.stop();
  }, [pair, supportsPair, reduced, id]);
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
  const keepScreen = fieldScreen(keep, selectedGain);
  const partnerKeepScreen = fieldScreen(partnerKeep, selectedGain);
  function eventPoint(ev: PointerEvent): Point {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return P;
    const point = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }
  function move(ev: PointerEvent) {
    if (!dragging.current) return;
    const cursor = eventPoint(ev);
    if (dragging.current === 'predict') {
      // Direction only. The length is fixed because nobody can predict the magnitude of E
      // at a point, so letting the arrow grow would collect an answer to a question that
      // was never asked and then look like a wrong one.
      const dx = cursor.x - P.x, dy = cursor.y - P.y, len = Math.hypot(dx, dy);
      const next = len > 1 ? { x: dx / len * GUESS_LENGTH, y: dy / len * GUESS_LENGTH } : { x: GUESS_LENGTH, y: 0 };
      liveGuess.current = next; onPredict?.(next); return;
    }
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
  const ZOOM_MIN = .45, ZOOM_MAX = 3.2;
  const zoomBy = (factor: number) => setZoom(z => clamp(z * factor, ZOOM_MIN, ZOOM_MAX));
  // Scroll zooms. It used to rotate, which is why turning the figure felt wrong: the one
  // gesture every 3D tool spends on getting closer was spinning the scene instead.
  // React delegates wheel to the root, where the listener is passive, so preventDefault is
  // ignored and the page scrolls as well as the figure zooming. The only way to claim the
  // gesture is a non-passive listener on the element itself.
  const wheelZoom = useRef<(ev: WheelEvent) => void>(() => {});
  useEffect(() => { wheelZoom.current = ev => { ev.preventDefault(); zoomBy(Math.exp(-ev.deltaY * .0016)); }; });
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => wheelZoom.current(ev);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  /** One nudge of the view, shared by the on-screen pad and the arrow keys. */
  const nudge = (key: string) => { stopGlide(); commitView(keyboardCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }, key)); };
  const resetView = () => { setZoom(1); glideTo({ ...DEFAULT_CAMERA }, .45); };
  const onControl = (target: EventTarget | null) => target instanceof Element && !!target.closest('.cd-piece,.cd-observation,.cd-bound');
  const commitView = (next: CameraView) => { yawMv.set(next.yaw); pitchMv.set(next.pitch); setCamera(next); };
  /* oxlint-disable react/react-compiler */
  // One React render per animation frame at most, however many pointer or wheel events
  // arrive in between. The motion values always hold the live view; this catches the
  // rest of the drawing up to them.
  const syncCamera = () => { if (syncId.current) return; syncId.current = requestAnimationFrame(() => { syncId.current = 0; setCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }); }); };
  const stopGlide = () => { if (glideId.current) cancelAnimationFrame(glideId.current); glideId.current = 0; };
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
        const s = projectCamera({ x: 0, y: 0, z: p.distance }, yawMv.get(), pitchMv.get());
        const px = O.x + unit * s.x, py = O.y + unit * s.y;
        svg.current?.querySelectorAll('[data-orbit-p]').forEach(el => {
          if (el instanceof SVGCircleElement) { el.setAttribute('cx', String(px)); el.setAttribute('cy', String(py)); }
          else if (el instanceof SVGTextElement) { el.setAttribute('x', String(px - 10)); el.setAttribute('y', String(py + 31)); }
        });
      };
      paint();
      frame.render(paint, false, true);
      if (svg.current) svg.current.dataset.orbitMs = (performance.now() - t0).toFixed(3);
    },
    onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release,
    onKeyDown: (ev: KeyboardEvent<SVGSVGElement>) => {
      if (ev.defaultPrevented || onControl(ev.target)) return;
      if (['+', '=', '-', '_'].includes(ev.key)) { ev.preventDefault(); zoomBy(ev.key === '-' || ev.key === '_' ? 1 / 1.18 : 1.18); return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(ev.key)) return;
      ev.preventDefault(); if (ev.key === 'Home') setZoom(1); nudge(ev.key);
    },
  };
  /* oxlint-enable react/react-compiler */
  const circlePoints = (radius: number, start = 0, end = Math.PI * 2) => Array.from({ length: 97 }, (_, i) => project({ x: radius * Math.cos(start + (end - start) * i / 96), y: radius * Math.sin(start + (end - start) * i / 96), z: 0 }));
  const radiusTip = ray({ x: 1, y: 0, z: 0 }, Math.min(surface ? sample.position.x : R, 7) * unit);
  // A rod or ring is one object. Doubling N inserts mid-cuts on pieces that already
  // exist (stable intervalKey / seamKey), instead of remounting a newly indexed set.
  const rodLike = !surface && id !== 'ring' && id !== 'arc';
  const upright = id === 'bisector' || id === 'infinite' || footed;
  const along = (pt: Point) => upright ? pt.y : pt.x;
  const rodEnds: [number, number] = id === 'bisector' ? [O.y - R * unit, O.y + R * unit] : footed ? [O.y - p.size * unit, O.y] : id === 'infinite' ? [55, 370] : id === 'axial' ? [O.x, O.x + p.size * unit] : [O.x, 670];
  const rodLow = Math.min(...rodEnds), rodHigh = Math.max(...rodEnds), rodHalf = 7;
  const split = partitionCount(p.slices, continuum) === n ? splitProgress(p.slices, continuum) : 0;
  const family = surface ? 'surface' : (id === 'ring' || id === 'arc') ? 'round' : 'rod';
  let fillR = sample.position.x;
  if (id === 'disk' && (mode === 'sum' || mode === 'integrate')) {
    fillR = 0;
    for (let i = 0; i < n; i++) if (Math.abs(weights[i]) > 0) fillR = Math.max(fillR, samples[i].position.x);
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
  const markStride = Math.max(1, Math.ceil((ramp ? 26 : 19) / Math.max(1, pieceSpan)));
  const markCount = Math.max(0, Math.floor((rodHigh - rodLow) / (ramp ? 26 : 19)));
  // The ramp keeps a density-weighted placement, because crowding IS the lesson there, but
  // any mark that lands on a cut is dropped rather than drawn over it.
  const cuts = Array.from({ length: Math.max(0, n - 1) }, (_, i) => rodLow + pieceSpan * (i + 1));
  const clearOfCuts = (v: number) => cuts.every(c => Math.abs(v - c) > 5);
  const chargeMarks = !rodLike ? []
    : ramp ? Array.from({ length: markCount }, (_, k) => rodHigh - (rodHigh - rodLow) * Math.sqrt((k + .5) / markCount)).filter(clearOfCuts)
    : Array.from({ length: Math.max(1, n) }, (_, i) => rodLow + pieceSpan * (i + .5)).filter((_, i) => i % markStride === 0);
  const sourceLabel = surface ? `${elementSymbol} ${continuum>=.999?'=':'≈'} σ · 2πs ${continuum>=.999?'ds':'Δs'}` : id === 'ring' || id === 'arc' ? `${elementSymbol} = λR ${continuum>=.999?'dθ':'Δθ'}` : ramp ? `${elementSymbol} = λ₀(y/L) ${continuum>=.999?'dy':'Δy'}` : `${elementSymbol} = λ ${continuum>=.999?'dℓ':'Δℓ'}`;
  const sourceText = id === 'disk' ? 'One ring sweeps out the disk' : surface ? 'Whole annulus · transverse fields cancel' : id === 'infinite' || id === 'semi' ? 'Unbounded source · visible window shown' : id === 'arc' ? 'Observation point fixed at center' : 'One piece at a time · the integral adds them all';
  const gaugeH = scalar ? 88 * vNow / vScale : 0, dvH = scalar ? 36 * sample.potential / dVmax : 0;
  return <div ref={root} className={"charge-diagram cd-focus-"+highlight+(inSpace?" cd-in-space":"")+(perspective?" cd-surface-kind":" cd-wire-kind")}>
    {/* Field under construction, sharing one box so the two coordinate spaces cannot
        drift. Planar lessons only for now: the perspective geometries need their lines
        traced in three dimensions and sorted against the surface, a different job. */}
    <div className="cd-toolbar">
    <div className="cd-view-modes" role="group" aria-label="How to view the figure">
      {([['2D', false], ['3D', true]] as const).map(([label, wants]) => <button key={label} type="button" title={wants ? 'In space: drag, scroll or use the arrow keys to turn it' : 'Flat, looking straight down the axis'}
        className={`cd-view-mode${inSpace === wants ? ' is-on' : ''}`} aria-pressed={inSpace === wants}
        onClick={() => {
          if (wants === inSpace) return;
          stopGlide();
          if (wants) { yawMv.set(FLAT.yaw); pitchMv.set(FLAT.pitch); setCamera({ ...FLAT }); setSpatial(true); glideTo({ ...DEFAULT_CAMERA }, .8); }
          else glideTo(FLAT, .65, () => setSpatial(false));
        }}>{label}</button>)}
    </div>
    {!scalar && <div className="cd-view-modes" role="group" aria-label="How to show the field around the charge">
      {([['Field lines', 'lines', 'Crowded lines mean a stronger field'], ['Arrows', 'vectors', 'Each arrow is the field where it sits'], ['Off', 'off', 'Just the construction']] as const).map(([label, value, title]) => <button key={value} type="button" title={title}
        className={`cd-view-mode${fieldView === value ? ' is-on' : ''}`} aria-pressed={fieldView === value}
        onClick={() => setFieldView(value)}>{label}</button>)}
    </div>}
    {/* The pad and the drawn help say the same thing two ways: one to click, one to read. */}
    {/* Arrow keys are NOT bound here on purpose: inside a group of buttons they belong to
        moving between the buttons, and stealing them for the camera would mislead anyone
        driving this by screen reader. The figure is the thing that owns the arrow keys. */}
    <div className="cd-pad" role="group" aria-label="Move the view">
      {inSpace && ([['ArrowLeft', '\u2190', 'Turn left'], ['ArrowUp', '\u2191', 'Tilt up'], ['ArrowDown', '\u2193', 'Tilt down'], ['ArrowRight', '\u2192', 'Turn right']] as const)
        .map(([key, glyph, title]) => <button key={key} type="button" className="cd-pad-key" title={`${title} (${key.replace('Arrow', '')} arrow key)`} aria-label={title} onClick={() => nudge(key)}>{glyph}</button>)}
      <button type="button" className="cd-pad-key" title="Zoom out (minus key, or scroll)" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.18)} disabled={zoom <= ZOOM_MIN + 1e-6}>&minus;</button>
      <button type="button" className="cd-pad-key" title="Zoom in (plus key, or scroll)" aria-label="Zoom in" onClick={() => zoomBy(1.18)} disabled={zoom >= ZOOM_MAX - 1e-6}>+</button>
      <button type="button" className="text-button cd-orbit-reset" onClick={resetView} disabled={zoom === 1 && camera.yaw === DEFAULT_CAMERA.yaw && camera.pitch === DEFAULT_CAMERA.pitch}>Reset view</button>
    </div>
    <span className="cd-view-hint">{inSpace ? 'Drag to turn · scroll to zoom · drag P to move it' : 'Scroll to zoom · drag P to move it'}</span>
    </div>
    <div className="cd-stage">
    {!inSpace && !scalar && fieldView !== 'off' && <FieldCanvas samples={samples} project={project} frame={{ width: 720, height: 430 }} mode={fieldView} reach={Math.max(2.5, p.distance * 1.7, p.size)}
      plane={perspective ? 'xz' : 'xy'} layout={surface ? 'surface' : 'wire'} />}
    {inSpace && <FieldStage kind={id === 'disk' ? 'disk' : id === 'sheet' ? 'sheet' : 'wire'} closed={id === 'ring'} samples={samples} selected={selectedIndex}
      radius={R} distance={p.distance} yaw={view.yaw} pitch={view.pitch} fieldView={scalar ? 'off' : fieldView} reach={fieldReach}
      bodyPath={bodyPath} point={pWorld} element={sceneElement} net={scalar || predicting ? null : scaleVec(displayed, gain / unit)} contribution={scalar || !showContribution ? null : scaleVec(sample.field, selectedGain * gain / unit)}
      unit={unit} frame={{ width: 720, height: 430 }} origin={O} charge={p.charge} animating={moving}
      getView={() => ({ yaw: yawMv.get(), pitch: pitchMv.get() })} />}
    <svg ref={svg} className={`cd-svg${inSpace ? ' cd-orbitable' : ''}${scalar ? ' cd-scalar' : ''}`} viewBox="0 0 720 430" role="img" tabIndex={inSpace ? 0 : undefined} {...(inSpace ? orbit : {})} aria-label={`${problem.title}. Interactive charge distribution and ${scalar ? 'electric potential' : 'electric field'} visualization.${inSpace ? ' Drag or use the arrow keys to rotate the view, plus and minus to zoom, Home to reset it.' : ''}`}>
      <defs>
        <pattern id={`${uid}grid`} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="var(--grid)" /></pattern>
        <clipPath id={`${uid}clip`}><rect x="42" y="54" width="626" height="317" rx="10" /></clipPath>
        <radialGradient id={`${uid}point`}><stop stopColor="var(--field)" stopOpacity=".2" /><stop offset="1" stopColor="var(--field)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="20" y="48" width="680" height="336" rx="12" fill={`url(#${uid}grid)`} opacity=".55" />
      <text x="30" y="29" className="cd-kicker">{perspective ? 'AXIAL VIEW · xy PLANE IN PERSPECTIVE' : ''}</text>
      <g className="cd-scale"><line x1="585" y1="25" x2="635" y2="25" /><path d="M585 21V29 M635 21V29" /><text x="610" y="43" textAnchor="middle">{pretty(50 / unit)} m</text></g>
      <g className="cd-axes" clipPath={inSpace ? `url(#${uid}clip)` : undefined}>
        {/* Projected axes whenever the view can turn, so they rotate with what they measure;
            the flat pair is only right when the camera is locked. */}
        {inSpace ? <><path d={`M${2 * O.x - axisX.x} ${2 * O.y - axisX.y}L${axisX.x} ${axisX.y} M${2 * O.x - axisY.x} ${2 * O.y - axisY.y}L${axisY.x} ${axisY.y} M${O.x} ${O.y + 27}V60`} /><text data-anchor="fixed" {...axisTip(axisX, 13, 5)}>x</text><text data-anchor="fixed" {...axisTip(axisY, 13, 5)}>y</text><text data-anchor="fixed" x={O.x + 10} y="67">z</text></> : <><path d={`M64 ${O.y}H656 M${O.x} 365V60`} /><text data-anchor="fixed" x="664" y={O.y + 5}>x</text><text data-anchor="fixed" x={O.x + 11} y="64">y</text></>}
      </g>
      <g clipPath={`url(#${uid}clip)`}>
        {perspective && <g ref={plane} className="cd-orbit-plane" transform={planeMatrix(view.yaw, view.pitch, O, unit)}>
          {id === 'sheet' && <motion.path layoutId="fb-source-surface" data-source-body="true" initial={false} animate={{ d: pathThrough(worldArc(7), true) }} transition={{ duration: still ? 0 : .45 }} className="cd-surface" style={{ opacity: inSpace ? 0 : 1 }} />}
          {id === 'disk' && <>
            <motion.path layoutId="fb-source-surface" data-source-body="true" initial={false} animate={{ d: pathThrough(worldArc(R), true) }} transition={{ duration: still ? 0 : .45 }} className="cd-surface" style={{ opacity: inSpace ? 0 : 1 }} />
            <motion.path className="cd-disk-sweep" data-disk-sweep="true" initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, fillR)), true) }} transition={{ duration: still ? 0 : .2 }} />
            <g className="cd-piece is-selected" data-piece-key={intervalKey(selectedIndex, n)} style={{ pointerEvents: 'none' }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, fillR))) }} transition={{ duration: still ? 0 : .2 }} fill="none" strokeWidth="4" /></g>
          </>}
          {id === 'ring' && <>
            {/* In space the stage draws the ring as a body with real depth, so the flat band
                would only be a second copy lying on top. It stays in the tree because the
                shared layout animation between lessons is keyed to it. */}
            <motion.path layoutId={`fb-source-${family}`} data-source-body="true" initial={false} animate={{ d: pathThrough(worldArc(R)) }} transition={{ duration: still ? 0 : .45 }} className="cd-charge-base" style={{ opacity: inSpace ? 0 : 1 }} />
            {samples.map((_, i) => {
              const active = i === selectedIndex, accumulated = Math.abs(weights[i]) > 0 && (mode === 'sum' || mode === 'integrate');
              const inInterval = Math.abs(wholeWeights[i]) > 0;
              const opacity = !inInterval ? .14 : active ? 1 : accumulated ? .94 : .48 + continuum * .3;
              const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n, identity = intervalKey(i, n);
              return <g key={identity} data-piece-key={identity} className={`cd-piece ${active ? 'is-selected' : ''}`} style={{ opacity }} onPointerDown={ev => { ev.stopPropagation(); onSelect(i); }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(R, a0, a1)) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth={active ? 10 : 7} /></g>;
            })}
            {continuum < .995 && <g className="cd-seams" aria-hidden="true" style={{ opacity: .7 * (1 - continuum) }}>
              {seamFractions(n).map(t => { const theta = 2 * Math.PI * t, h = 8 / unit, c = Math.cos(theta), s = Math.sin(theta); return <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam"><line x1={(R - h) * c} y1={(R - h) * s} x2={(R + h) * c} y2={(R + h) * s} /></g>; })}
              {split > .04 && split < .995 && splitFractions(n).map(t => { const theta = 2 * Math.PI * t, h = 8 * split / unit, c = Math.cos(theta), s = Math.sin(theta); return <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam is-growing" style={{ opacity: split }}><line x1={(R - h) * c} y1={(R - h) * s} x2={(R + h) * c} y2={(R + h) * s} /></g>; })}
            </g>}
          </>}
        </g>}
        {id === 'sheet' && <path d="M80 340l30 12m-8-16 30 12m444-78 30 12m-8-16 30 12" className="cd-continuation" />}
        {id === 'sheet' && showContribution && <g className="cd-orbit-plane" transform={planeMatrix(view.yaw, view.pitch, O, unit)}><g className="cd-piece is-selected" data-piece-key={intervalKey(selectedIndex, n)} style={{ pointerEvents: 'none' }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, sample.position.x))) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth="4" /></g></g>}
        {!perspective && rodLike && <motion.path layoutId={`fb-source-${family}`} data-source-body="true" className={ramp ? 'cd-charge-base' : 'cd-source-rod'} style={{ opacity: inSpace ? 0 : 1 }} initial={false} animate={{ d: rodPath() }} transition={{ duration: still ? 0 : .45 }} />}
        {!perspective && id === 'arc' && <motion.path layoutId={`fb-source-${family}`} data-source-body="true" initial={false} animate={{ d: pathThrough(circlePoints(R, -p.phi / 2, p.phi / 2)) }} transition={{ duration: still ? 0 : .45 }} className="cd-charge-base" />}
        {!perspective && samples.map((s, i) => {
          const pos = project(s.position), active = i === selectedIndex, accumulated = Math.abs(weights[i]) > 0 && (mode === 'sum' || mode === 'integrate');
          const inInterval = Math.abs(wholeWeights[i])>0;
          const opacity = !inInterval ? .14 : active ? 1 : accumulated ? .94 : .48 + continuum * .3;
          const heat = scalar && !active ? .28 + .72 * Math.abs(s.potential) / dVmax : 1;
          const identity = intervalKey(i, n);
          let shape;
          if (id === 'arc') {
            const a0 = p.phi * (i / n - .5), a1 = p.phi * ((i + 1) / n - .5);
            shape = <motion.path initial={false} animate={{ d: pathThrough(circlePoints(R, a0, a1)) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth={active ? 10 : 7} />;
          } else {
            const head = along(project(world(i / n))), tail = along(project(world((i + 1) / n)));
            const lo = Math.min(head, tail), hi = Math.max(head, tail), extent = Math.max(1, hi - lo);
            if (hi < rodLow - 8 || lo > rodHigh + 8) return null;
            const shade = ramp && !active ? { fillOpacity: .08 + .92 * s.position.y / p.size } : undefined;
            shape = upright ? <rect x={pos.x - rodHalf} y={lo} width={rodHalf * 2} height={extent} {...shade} /> : <rect x={lo} y={pos.y - rodHalf} width={extent} height={rodHalf * 2} />;
          }
          return <g key={identity} data-piece-key={identity} className={`cd-piece ${active ? 'is-selected' : ''}`} style={{ opacity: opacity * heat }} onPointerDown={ev => { ev.stopPropagation(); onSelect(i); }}>{shape}</g>;
        })}
        {rodLike && <g className="cd-plus" aria-hidden="true">{chargeMarks.map(v => <text key={v} x={upright ? O.x : v} y={(upright ? v : O.y) + 3.6} textAnchor="middle">{p.charge < 0 ? '−' : '+'}</text>)}</g>}
        {!perspective && continuum < .995 && <g className="cd-seams" aria-hidden="true" style={{ opacity: .7 * (1 - continuum) }}>
          {seamFractions(n).map(t => { const mark = seamStroke(t, 1); return mark ? <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam">{mark}</g> : null; })}
          {split > .04 && split < .995 && splitFractions(n).map(t => { const mark = seamStroke(t, split); return mark ? <g key={seamKey(t)} data-seam={seamKey(t)} className="cd-seam is-growing" style={{ opacity: split }}>{mark}</g> : null; })}
        </g>}
        {!surface && supportsPair && pair && showContribution && <><line x1={partnerPos.x} y1={partnerPos.y} x2={P.x} y2={P.y} className="cd-construction cd-pair" /><circle cx={partnerPos.x} cy={partnerPos.y} r="9" className="cd-partner" /></>}
        {showContribution && <line x1={selectedPoint.x} y1={selectedPoint.y} x2={P.x} y2={P.y} className="cd-construction" />}
      </g>
      {id === 'infinite' && <g className="cd-infinity"><path d={`M${O.x-10} 73l20-9m-20 17 20-9M${O.x-10} 351l20-9m-20 17 20-9`} /><text x={O.x - 38} y="76">+∞</text><text x={O.x - 38} y="356">−∞</text></g>}
      {id === 'semi' && <g className="cd-infinity"><path d={`M628 ${O.y-10}l-9 20m17-20-9 20`} /><text x="641" y={O.y - 17}>∞</text></g>}
      {id === 'sheet' && <text x="544" y="354" className="cd-small">s → ∞</text>}
      {id === 'bisector' && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={`M${O.x-39} ${O.y-R*unit}h-7m3.5 0V${O.y+R*unit}m-3.5 0h7`} /><text x={O.x-57} y={O.y+4}>L</text><text x={O.x+17} y={O.y-R*unit-8}>+L/2</text><text x={O.x+17} y={O.y+R*unit+20}>−L/2</text></g>}
      {footed && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={`M${O.x-39} ${O.y-p.size*unit}h-7m3.5 0V${O.y}m-3.5 0h7`} /><text x={O.x-57} y={O.y-p.size*unit/2+4}>L</text><text x={O.x+17} y={O.y-p.size*unit-8}>{ramp ? 'y = L · λ = λ₀' : 'y = L'}</text><text x={O.x+19} y={O.y-9}>{ramp ? 'y = 0 · λ = 0' : 'y = 0'}</text></g>}
      {id === 'axial' && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={`M${O.x} ${O.y+31}H${O.x+p.size*unit}`} /><text x={O.x+p.size*unit/2} y={O.y+50}>L</text><text x={O.x+p.size*unit+3} y={O.y-19}>L</text><text x={(O.x+p.size*unit+P.x)/2} y={O.y+31}>a</text></g>}
      {perspective && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={`M${O.x} ${O.y}L${radiusTip.x} ${radiusTip.y}`} /><text x={O.x+(radiusTip.x-O.x)*.6} y={O.y+(radiusTip.y-O.y)*.6+19}>{surface ? 's' : 'R'}</text><text x={O.x-20} y={(O.y+P.y)/2}>z</text></g>}
      {id === 'arc' && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={pathThrough(circlePoints(R*.32, -p.phi/2, p.phi/2))} /><text x={O.x+R*unit*.32+9} y={O.y-9}>φ</text><line x1={O.x} y1={O.y} x2={O.x+R*unit} y2={O.y} /><text x={O.x+R*unit*.6} y={O.y+23}>R</text></g>}
      {(id === 'bisector' || id === 'infinite' || footed) && <g className={`cd-dimension${inSpace && !perspective ? ' is-hidden' : ''}`}><path d={`M${O.x+13} ${O.y+33}H${P.x-10}`} /><text x={(O.x+P.x)/2} y={O.y+52}>r</text></g>}
      {id === 'semi' && <text x={O.x+19} y={(P.y+O.y)/2} className="cd-small">r</text>}
      {id !== 'arc' && <text data-anchor="fixed" x={O.x-17} y={O.y+20} className="cd-origin">O</text>}
      {showContribution && !scalar && mode !== 'sum' && <>
        {pair && supportsPair && <>
          <Vector from={P} to={plus(P, fieldScreen(partnerField, selectedGain))} color="var(--contribution)" dashed reduced={still} />
          <g data-cancel-transverse="true" opacity={Math.max(.12, 1 - cancelT)}>
            <Vector from={plus(P, keepScreen)} to={plus(P, plus(keepScreen, liveDrop))} color="var(--contribution)" width={1.4} dashed reduced={still} />
            <Vector from={plus(P, partnerKeepScreen)} to={plus(P, plus(partnerKeepScreen, livePartnerDrop))} color="var(--contribution)" width={1.4} dashed reduced={still} />
          </g>
        </>}
        {components && <><Vector from={P} to={plus(P, projectedComponent)} color="var(--contribution)" width={1.3} dashed reduced={still} /><Vector from={plus(P, projectedComponent)} to={plus(P, contribution)} color="var(--contribution)" width={1.3} dashed reduced={still} /></>}
        <Vector from={P} to={plus(P, contribution)} color="var(--contribution)" width={1.8} label={surface ? fieldSymbol+'z' : fieldSymbol} reduced={still}  ghost={inSpace} />
      </>}
      {!scalar && mode === 'sum' && chainPoints.length > 1 && <path className="cd-sum-chain" data-sum-chain={String(chainPoints.length)} d={pathThrough(chainPoints)} fill="none" />}
      {inSpace && <ViewHelp x={578} y={34} />}
      {!scalar && !predicting && <Vector from={P} to={plus(P, net)} width={3.5} label={continuum>=.999&&full&&progress>=.999?'E':'Σ ΔE'} reduced={still} ghost={inSpace} />}
      {!scalar && (predicting || prediction) && (() => {
        // The guess is drawn in the same place and the same units as the field it will be
        // compared against, so the comparison is the one the student can see rather than a
        // number they have to trust.
        const tip = plus(P, prediction ?? { x: GUESS_LENGTH, y: 0 });
        return <g className={`cd-guess${predicting ? ' is-drawing' : ''}`}>
          <Vector from={P} to={tip} color="var(--charge)" width={2.6} dashed label="your direction" reduced={still} />
          {predicting && <g {...handle('predict')} className="cd-guess-grip" role="slider" tabIndex={0}
            aria-label="Which way the field points at P. Drag, or turn it with the arrow keys."
            aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round((Math.atan2(-(tip.y - P.y), tip.x - P.x) * 180 / Math.PI + 360) % 360)}
            onKeyDown={ev => {
              // Built during render, but only ever read inside the event: a ref is exactly
              // the right tool for a value that must survive a burst of key repeats.
              // All four arrows turn it, none resize it: there is only one thing to set.
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
              ev.preventDefault();
              /* oxlint-disable-next-line react/react-compiler */
              const step = ev.shiftKey ? 1 : 6, here = liveGuess.current ?? { x: GUESS_LENGTH, y: 0 };
              const ang = Math.atan2(here.y, here.x);
              const turn = ang + (ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : -1) * step * Math.PI / 180;
              const next = { x: Math.cos(turn) * GUESS_LENGTH, y: Math.sin(turn) * GUESS_LENGTH };
              liveGuess.current = next; onPredict?.(next);
            }}>
            <circle cx={tip.x} cy={tip.y} r="15" />
          </g>}
        </g>;
      })()}
      {!scalar && magnitude(displayed) < 1e-8 && <text x={P.x-16} y={P.y-47} textAnchor="end" className="cd-zero">E = 0</text>}
      {scalar && <g className="cd-gauge" aria-hidden="true">
        <line x1={P.x+26} y1={P.y-92} x2={P.x+26} y2={P.y+92} />
        <rect x={P.x+21} y={gaugeH < 0 ? P.y : P.y - gaugeH} width="10" height={Math.abs(gaugeH)} rx="2" />
        {showContribution && <rect x={P.x+38} y={dvH < 0 ? P.y : P.y - dvH} width="6" height={Math.abs(dvH)} rx="1" className="cd-gauge-dv" />}
        <text x={P.x+42} y={P.y - Math.max(14, Math.abs(gaugeH) + 8)}>{continuum>=.999&&full&&progress>=.999?'V':'Σ ΔV'}</text>
        <text x={P.x+42} y={P.y - Math.max(14, Math.abs(gaugeH) + 8) + 16} className="cd-gauge-readout">{pretty(vNow)} V</text>
      </g>}
      <g {...(id === 'arc' ? {} : handle('P'))} className={`cd-observation ${id === 'arc' ? 'is-fixed' : ''}`}>
        <circle data-orbit-p="true" cx={P.x} cy={P.y} r="28" fill={`url(#${uid}point)`} style={{ opacity: inSpace ? 0 : 1 }} /><circle data-orbit-p="true" cx={P.x} cy={P.y} r="16" className="cd-point-halo" style={{ opacity: inSpace ? 0 : 1 }} /><circle data-orbit-p="true" cx={P.x} cy={P.y} r="5" className="cd-point" style={{ opacity: inSpace ? 0 : 1 }} /><text data-orbit-p="true" x={P.x-10} y={P.y+31} className="cd-point-label">{id === 'arc' ? 'P = O' : 'P'}</text>
      </g>
      {showContribution && <g className="cd-source-tag"><line x1={source.x} y1={source.y} x2={source.x+(source.x>560?-22:22)} y2={source.y+(source.y<95?22:-20)} /><text x={source.x+(source.x>560?-27:27)} y={source.y+(source.y<95?27:-21)} textAnchor={source.x>560?'end':'start'}>{sourceVisible ? (surface ? 'ring '+elementSymbol : elementSymbol) : elementSymbol+' outside view'}</text></g>}
      {mode === 'integrate' && onBoundRangeChange && [0, 1].map(i => { const raw = project(world(boundRange[i]/100)); const point = { x: clamp(raw.x, 57, 650), y: clamp(raw.y, 66, 358) + ((id === 'ring' || (id === 'arc' && p.phi > 6.2)) ? (i ? 13 : -13) : 0) }; return <g key={i} {...handle(String(i))} className="cd-bound"><circle cx={point.x} cy={point.y} r="17" fill="transparent" /><rect x={point.x-8} y={point.y-8} width="16" height="16" rx="4" /><text x={point.x+(i ? 18 : -18)} y={point.y+5} textAnchor={i ? 'start' : 'end'}>{i ? 'b' : 'a'}</text></g>; })}
      {showContribution && !scalar && <g className="cd-triangle">
        {perspective ? <><path d="M538 135V73L619 135Z"/><path d="M538 127h8v8"/><text x="526" y="110">z</text><text x="575" y="151">{surface?'s':'R'}</text><text x="584" y="94">rᵢ</text><text x="548" y="93">α</text><text x="538" y="170" className="cd-triangle-note">Right triangle · schematic</text></> : id==='arc' ? <><line x1={P.x} y1={P.y} x2={selectedPoint.x} y2={selectedPoint.y}/><text x={P.x+30} y={P.y-12}>θ</text></> : id==='axial' ? <text x={(P.x+source.x)/2} y={P.y-39}>rᵢ = L + a − x</text> : <><path d={`M${source.x} ${source.y}L${source.x} ${P.y}L${P.x} ${P.y}`} /><text x={(source.x+P.x)/2+7} y={(source.y+P.y)/2-10}>rᵢ</text><text x={source.x-24} y={(source.y+P.y)/2}>{id==='semi'?'x':'y'}</text><text x={P.x-31} y={P.y-8}>α</text></>}
      </g>}
      <line x1="30" y1="387" x2="690" y2="387" className="cd-divider" />
      <text x="30" y="409" className="cd-footer">{sourceLabel}</text>
      <text x="690" y="409" textAnchor="end" className="cd-footer">{scalar ? `${continuum>=.999?'dV':'ΔV'} · V: ${pretty(vNow)} V` : showContribution ? `${fieldSymbol} × ${pretty(selectedGain)} · E: ${pretty(scaleValue)} N/C per 100 px` : continuum>=.999 ? 'Cut into infinitely many' : `Cut into ${n} pieces`}</text>
    </svg>
    </div>
    <details className="cd-controls" open={!compact}><summary>Diagram controls and keyboard help</summary>{/* The drawn legend in the figure says how to turn and zoom it. This stays for the things a drawing cannot show -- what Tab reaches, what Home and End do -- and for a screen reader, which cannot see the legend at all. */}<p id={`${uid}help`}>Tab moves between controls. Arrow keys adjust the focused control; Home and End select its limits. You can also drag P and the integration bounds in the figure.{inSpace?' The figure itself takes focus: arrow keys turn it, plus and minus zoom, Home puts it back.':''}</p>
    <div className="cd-control-grid">
      {inSpace&&<button ref={cameraControl} type="button" className="cd-camera-control" aria-describedby={`${uid}camera-help`} onKeyDown={ev=>{if(['+','=','-','_'].includes(ev.key)){ev.preventDefault();zoomBy(ev.key==='-'||ev.key==='_'?1/1.18:1.18);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(ev.key)){ev.preventDefault();if(ev.key==='Home')setZoom(1);nudge(ev.key);}}} onClick={resetView}>Rotate view with arrow keys<span id={`${uid}camera-help`}>Left/right rotate; up/down tilt; Home or Enter resets.</span></button>}
      <label>Which piece is drawn: {selectedIndex+1} of {n}<input type="range" aria-label="Selected charge element" min={0} max={n-1} step={1} value={selectedIndex} onChange={ev=>onSelect(Number(ev.target.value))}/></label>
      {id!=='arc'&&<label>Observation distance: {pretty(p.distance)} m<input type="range" aria-label="Observation distance in meters" aria-valuetext={`${pretty(p.distance)} meters`} min={.5} max={6} step={.1} value={p.distance} onChange={ev=>setParams({distance:Number(ev.target.value)})}/></label>}
      {mode==='integrate'&&onBoundRangeChange&&[0,1].map(i=><label key={i}>{i?'Upper':'Lower'} bound: {boundRange[i]}%<input type="range" aria-label={`${i?'Upper':'Lower'} integration bound`} aria-valuetext={`${boundRange[i]} percent of the source coordinate`} min={0} max={100} step={1} value={boundRange[i]} onChange={ev=>{const next:[number,number]=[...boundRange];next[i]=Number(ev.target.value);onBoundRangeChange(next);}}/></label>)}
    </div></details>
    <output className="cd-announcement" aria-live="polite" aria-atomic="true">{announcement}</output>

    <div className="cd-caption"><span><i className="cd-dot" />{sourceText}</span><span>{!full?'Selected interval':mode === 'sum' || mode === 'integrate' ? `${Math.round(progress*100)}% accumulated` : continuum >= .999 ? 'Infinitesimal limit' : ''}</span></div>
  </div>;
}
