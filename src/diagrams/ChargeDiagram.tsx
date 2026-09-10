'use client';
/* Inline SVG needs role=img to expose one named figure; an HTML img cannot contain the interactive drawing. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { animate, frame, motion, useMotionValue, useReducedMotion } from 'motion/react';
import type { Params, Problem } from '../problems/types';
import { field, magnitude, pretty, potential, type Vec } from '../symbolic/physics';
import { sampleDistribution, sumSamples, sumInterval, intervalWeights, sumPotential } from './sampling';
import { intervalKey, partitionCount, seamFractions, seamKey, splitFractions, splitProgress } from './subdivision';
import { DEFAULT_CAMERA, depthFromScreen, keyboardCamera, orbitCamera, projectCamera, type CameraView } from './camera';
import './charge-diagram.css';
import './camera.css';

type Point = { x: number; y: number };
export type ChargeDiagramProps = {
  problem: Problem; params: Params; setParams: (p: Partial<Params>) => void;
  count: number; continuum: number; selected: number; onSelect: (i: number) => void;
  progress: number; components: boolean; pair: boolean;
  mode: 'divide' | 'project' | 'sum' | 'integrate';
  highlight?: string; boundRange?: [number, number]; onBoundRangeChange?: (r: [number, number]) => void;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
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
function Vector({ from, to, color = 'var(--field)', width = 2.5, dashed = false, label, reduced = false }: { from: Point; to: Point; color?: string; width?: number; dashed?: boolean; label?: string; reduced?: boolean }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y), angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.min(7, length * .32), a = { x: to.x - head * Math.cos(angle - .45), y: to.y - head * Math.sin(angle - .45) }, b = { x: to.x - head * Math.cos(angle + .45), y: to.y - head * Math.sin(angle + .45) };
  return <g className="cd-vector" style={{ color }} opacity={length < .2 ? 0 : 1}>
    <motion.line initial={false} animate={{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }} transition={{ duration: reduced ? 0 : .13, ease: 'easeOut' }} stroke="currentColor" strokeWidth={width} strokeDasharray={dashed ? '4 4' : undefined} />
    <motion.path initial={false} animate={{ d: `M${a.x},${a.y}L${to.x},${to.y}L${b.x},${b.y}` }} transition={{ duration: reduced ? 0 : .13 }} fill="none" stroke="currentColor" strokeWidth={width} />
    {label && length > 10 && <text x={to.x + (to.x < from.x ? -9 : 9)} y={to.y - 9} textAnchor={to.x < from.x ? 'end' : 'start'} className="cd-vector-label" fill="currentColor">{label}</text>}
  </g>;
}
export function ChargeDiagram({ problem, params: p, setParams, count, continuum, selected, onSelect, progress, components, pair, mode, boundRange = [0, 100], onBoundRangeChange, highlight = '' }: ChargeDiagramProps) {
  const cameraControl = useRef<HTMLButtonElement>(null);
  const svg = useRef<SVGSVGElement>(null), plane = useRef<SVGGElement>(null), dragging = useRef<string | null>(null), uid = useId().replace(/:/g, '');
  const yawMv = useMotionValue(DEFAULT_CAMERA.yaw), pitchMv = useMotionValue(DEFAULT_CAMERA.pitch);
  const [camera, setCamera] = useState<CameraView>(DEFAULT_CAMERA), orbitFrom = useRef<Point>({ x: 0, y: 0 });
  const root = useRef<HTMLDivElement>(null), renders = useRef(0);
  useLayoutEffect(() => { renders.current += 1; if (root.current) root.current.dataset.renders = String(renders.current); });
  const reduced = !!useReducedMotion(), id = problem.geometry, scalar = problem.quantity === 'V', surface = id === 'disk' || id === 'sheet', perspective = surface || id === 'ring';
  // The ramp is the endpoint rod with a non-uniform density: same layout, different charge.
  const footed = id === 'endpoint' || id === 'ramp', ramp = id === 'ramp';
  // An orbit drag writes a SVG matrix from motion values; setState would rebuild the tree every frame.
  const [activeDrag,setActiveDrag] = useState(false);
  const still = reduced || activeDrag;
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
  const unit = perspective ? 42 : footed ? Math.min(45,150/p.size) : id==='bisector' ? Math.min(45,140/R) : id==='arc' ? 40 : 35;
  const project = (v: Vec): Point => { if (!perspective) return { x: O.x + unit * v.x, y: O.y - unit * v.y }; const s = projectCamera(v, camera.yaw, camera.pitch); return { x: O.x + unit * s.x, y: O.y + unit * s.y }; };
  // Screen point a distance `length` out along a world direction, for the axes and the R/s bracket.
  const ray = (v: Vec, length: number): Point => { const s = projectCamera(v, camera.yaw, camera.pitch); return { x: O.x + length * s.x, y: O.y + length * s.y }; };
  const axisX = ray({ x: 1, y: 0, z: 0 }, 185), axisY = ray({ x: 0, y: 1, z: 0 }, 122);
  const axisTip = (a: Point, dx: number, dy: number): Point => ({ x: clamp(a.x + dx, 52, 652), y: clamp(a.y + dy, 70, 360) });
  const P = project(id === 'arc' ? zero : id === 'axial' ? { x: p.size + p.distance, y: 0, z: 0 } : id === 'semi' ? { x: 0, y: p.distance, z: 0 } : perspective ? { x: 0, y: 0, z: p.distance } : { x: p.distance, y: 0, z: 0 });
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
  const fieldScreen = (v: Vec, multiplier = 1): Point => { const k = gain * multiplier; if (!perspective) return { x: k * v.x, y: -k * v.y }; const s = projectCamera(v, camera.yaw, camera.pitch); return { x: k * s.x, y: k * s.y }; };
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
  const showContribution = mode !== 'divide' || !!highlight;
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
    if (dragging.current === 'P') {
      const distance = perspective ? depthFromScreen(O.y - cursor.y, unit, camera.pitch) : id === 'semi' ? (O.y - cursor.y) / unit : id === 'axial' ? p.distance + (cursor.x - P.x) / unit : (cursor.x - O.x) / unit;
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
    onPointerDown: (ev: PointerEvent<SVGGElement>) => { ev.stopPropagation(); ev.currentTarget.setPointerCapture(ev.pointerId); dragging.current = name; setActiveDrag(true); },
    onPointerMove: move, onPointerUp: () => { dragging.current = null; setActiveDrag(false); }, onPointerCancel: () => { dragging.current = null; setActiveDrag(false); }, onLostPointerCapture: () => { dragging.current = null; setActiveDrag(false); },
    /* oxlint-enable react/react-compiler */
  });
  const onControl = (target: EventTarget | null) => target instanceof Element && !!target.closest('.cd-piece,.cd-observation,.cd-bound');
  const commitView = (next: CameraView) => { yawMv.set(next.yaw); pitchMv.set(next.pitch); setCamera(next); };
  /* oxlint-disable react/react-compiler */
  const release = () => { if (dragging.current === 'orbit') { dragging.current = null; commitView({ yaw: yawMv.get(), pitch: pitchMv.get() }); } setActiveDrag(false); };
  // Orbit is offered only where the projection is already pseudo-3D; the planar views carry
  // hardcoded axis labels and dimension brackets that a rotation would misplace.
  // Springs would lag a 1:1 drag; motion values + frame.render write the SVG matrix without setState.
  const orbit = {
    onPointerDown: (ev: PointerEvent<SVGSVGElement>) => { if (onControl(ev.target)) return; cameraControl.current?.focus(); ev.currentTarget.setPointerCapture(ev.pointerId); dragging.current = 'orbit'; setActiveDrag(true); orbitFrom.current = { x: ev.clientX, y: ev.clientY }; },
    onPointerMove: (ev: PointerEvent<SVGSVGElement>) => {
      if (dragging.current !== 'orbit') return;
      const t0 = performance.now();
      const next = orbitCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }, ev.clientX - orbitFrom.current.x, ev.clientY - orbitFrom.current.y);
      orbitFrom.current = { x: ev.clientX, y: ev.clientY };
      yawMv.set(next.yaw); pitchMv.set(next.pitch);
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
    onKeyDown: (ev: KeyboardEvent<SVGSVGElement>) => { if (ev.defaultPrevented || onControl(ev.target) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(ev.key)) return; ev.preventDefault(); commitView(keyboardCamera({ yaw: yawMv.get(), pitch: pitchMv.get() }, ev.key)); },
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
  const markCount = Math.max(0, Math.floor((rodHigh - rodLow) / (ramp ? 26 : 19)));
  const chargeMarks = !rodLike ? [] : ramp ? Array.from({ length: markCount }, (_, k) => rodHigh - (rodHigh - rodLow) * Math.sqrt((k + .5) / markCount)) : Array.from({ length: markCount }, (_, k) => rodLow + 19 * (k + .5)).filter(v => v < rodHigh);
  const sourceLabel = surface ? `${elementSymbol} ${continuum>=.999?'=':'≈'} σ · 2πs ${continuum>=.999?'ds':'Δs'}` : id === 'ring' || id === 'arc' ? `${elementSymbol} = λR ${continuum>=.999?'dθ':'Δθ'}` : ramp ? `${elementSymbol} = λ₀(y/L) ${continuum>=.999?'dy':'Δy'}` : `${elementSymbol} = λ ${continuum>=.999?'dℓ':'Δℓ'}`;
  const sourceText = id === 'disk' ? 'One ring sweeps out the disk' : surface ? 'Whole annulus · transverse fields cancel' : id === 'infinite' || id === 'semi' ? 'Unbounded source · visible window shown' : id === 'arc' ? 'Observation point fixed at center' : 'Select a piece · drag P to explore';
  const gaugeH = scalar ? 88 * vNow / vScale : 0, dvH = scalar ? 36 * sample.potential / dVmax : 0;
  return <div ref={root} className={"charge-diagram cd-focus-"+highlight}>
    <svg ref={svg} className={`cd-svg${perspective ? ' cd-orbitable' : ''}${scalar ? ' cd-scalar' : ''}`} viewBox="0 0 720 430" role="img" {...(perspective ? orbit : {})} aria-label={`${problem.title}. Interactive charge distribution and ${scalar ? 'electric potential' : 'electric field'} visualization.${perspective ? ' Drag or use the arrow keys to rotate the view, Home to reset it.' : ''}`}>
      <defs>
        <pattern id={`${uid}grid`} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="var(--grid)" /></pattern>
        <clipPath id={`${uid}clip`}><rect x="42" y="54" width="626" height="317" rx="10" /></clipPath>
        <radialGradient id={`${uid}point`}><stop stopColor="var(--field)" stopOpacity=".2" /><stop offset="1" stopColor="var(--field)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="20" y="48" width="680" height="336" rx="12" fill={`url(#${uid}grid)`} opacity=".55" />
      <text x="30" y="29" className="cd-kicker">{perspective ? 'AXIAL VIEW · xy PLANE IN PERSPECTIVE' : ''}</text>
      <g className="cd-scale"><line x1="585" y1="25" x2="635" y2="25" /><path d="M585 21V29 M635 21V29" /><text x="610" y="43" textAnchor="middle">{pretty(50 / unit)} m</text></g>
      <g className="cd-axes" clipPath={perspective ? `url(#${uid}clip)` : undefined}>
        {perspective ? <><path d={`M${2 * O.x - axisX.x} ${2 * O.y - axisX.y}L${axisX.x} ${axisX.y} M${2 * O.x - axisY.x} ${2 * O.y - axisY.y}L${axisY.x} ${axisY.y} M${O.x} ${O.y + 27}V60`} /><text {...axisTip(axisX, 13, 5)}>x</text><text {...axisTip(axisY, 13, 5)}>y</text><text x={O.x + 10} y="67">z</text></> : <><path d={`M64 ${O.y}H656 M${O.x} 365V60`} /><text x="664" y={O.y + 5}>x</text><text x={O.x + 11} y="64">y</text></>}
      </g>
      <g clipPath={`url(#${uid}clip)`}>
        {perspective && <g ref={plane} className="cd-orbit-plane" transform={planeMatrix(camera.yaw, camera.pitch, O, unit)}>
          {id === 'sheet' && <motion.path layoutId="fb-source-surface" data-source-body="true" initial={false} animate={{ d: pathThrough(worldArc(7), true) }} transition={{ duration: still ? 0 : .45 }} className="cd-surface" />}
          {id === 'disk' && <>
            <motion.path layoutId="fb-source-surface" data-source-body="true" initial={false} animate={{ d: pathThrough(worldArc(R), true) }} transition={{ duration: still ? 0 : .45 }} className="cd-surface" />
            <motion.path className="cd-disk-sweep" data-disk-sweep="true" initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, fillR)), true) }} transition={{ duration: still ? 0 : .2 }} />
            <g className="cd-piece is-selected" data-piece-key={intervalKey(selectedIndex, n)} style={{ pointerEvents: 'none' }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, fillR))) }} transition={{ duration: still ? 0 : .2 }} fill="none" strokeWidth="4" /></g>
          </>}
          {id === 'ring' && <>
            <motion.path layoutId={`fb-source-${family}`} data-source-body="true" initial={false} animate={{ d: pathThrough(worldArc(R)) }} transition={{ duration: still ? 0 : .45 }} className="cd-charge-base" />
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
        {id === 'sheet' && showContribution && <g className="cd-orbit-plane" transform={planeMatrix(camera.yaw, camera.pitch, O, unit)}><g className="cd-piece is-selected" data-piece-key={intervalKey(selectedIndex, n)} style={{ pointerEvents: 'none' }}><motion.path initial={false} animate={{ d: pathThrough(worldArc(Math.max(.001, sample.position.x))) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth="4" /></g></g>}
        {!perspective && rodLike && <motion.path layoutId={`fb-source-${family}`} data-source-body="true" className={ramp ? 'cd-charge-base' : 'cd-source-rod'} initial={false} animate={{ d: rodPath() }} transition={{ duration: still ? 0 : .45 }} />}
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
      {id === 'bisector' && <g className="cd-dimension"><path d={`M${O.x-39} ${O.y-R*unit}h-7m3.5 0V${O.y+R*unit}m-3.5 0h7`} /><text x={O.x-57} y={O.y+4}>L</text><text x={O.x+17} y={O.y-R*unit-8}>+L/2</text><text x={O.x+17} y={O.y+R*unit+20}>−L/2</text></g>}
      {footed && <g className="cd-dimension"><path d={`M${O.x-39} ${O.y-p.size*unit}h-7m3.5 0V${O.y}m-3.5 0h7`} /><text x={O.x-57} y={O.y-p.size*unit/2+4}>L</text><text x={O.x+17} y={O.y-p.size*unit-8}>{ramp ? 'y = L · λ = λ₀' : 'y = L'}</text><text x={O.x+19} y={O.y-9}>{ramp ? 'y = 0 · λ = 0' : 'y = 0'}</text></g>}
      {id === 'axial' && <g className="cd-dimension"><path d={`M${O.x} ${O.y+31}H${O.x+p.size*unit}`} /><text x={O.x+p.size*unit/2} y={O.y+50}>L</text><text x={O.x+p.size*unit+3} y={O.y-19}>L</text><text x={(O.x+p.size*unit+P.x)/2} y={O.y+31}>a</text></g>}
      {perspective && <g className="cd-dimension"><path d={`M${O.x} ${O.y}L${radiusTip.x} ${radiusTip.y}`} /><text x={O.x+(radiusTip.x-O.x)*.6} y={O.y+(radiusTip.y-O.y)*.6+19}>{surface ? 's' : 'R'}</text><text x={O.x-20} y={(O.y+P.y)/2}>z</text></g>}
      {id === 'arc' && <g className="cd-dimension"><path d={pathThrough(circlePoints(R*.32, -p.phi/2, p.phi/2))} /><text x={O.x+R*unit*.32+9} y={O.y-9}>φ</text><line x1={O.x} y1={O.y} x2={O.x+R*unit} y2={O.y} /><text x={O.x+R*unit*.6} y={O.y+23}>R</text></g>}
      {(id === 'bisector' || id === 'infinite' || footed) && <g className="cd-dimension"><path d={`M${O.x+13} ${O.y+33}H${P.x-10}`} /><text x={(O.x+P.x)/2} y={O.y+52}>r</text></g>}
      {id === 'semi' && <text x={O.x+19} y={(P.y+O.y)/2} className="cd-small">r</text>}
      {id !== 'arc' && <text x={O.x-17} y={O.y+20} className="cd-origin">O</text>}
      {showContribution && !scalar && mode !== 'sum' && <>
        {pair && supportsPair && <>
          <Vector from={P} to={plus(P, fieldScreen(partnerField, selectedGain))} color="var(--contribution)" dashed reduced={still} />
          <g data-cancel-transverse="true" opacity={Math.max(.12, 1 - cancelT)}>
            <Vector from={plus(P, keepScreen)} to={plus(P, plus(keepScreen, liveDrop))} color="var(--contribution)" width={1.4} dashed reduced={still} />
            <Vector from={plus(P, partnerKeepScreen)} to={plus(P, plus(partnerKeepScreen, livePartnerDrop))} color="var(--contribution)" width={1.4} dashed reduced={still} />
          </g>
        </>}
        {components && <><Vector from={P} to={plus(P, projectedComponent)} color="var(--contribution)" width={1.3} dashed reduced={still} /><Vector from={plus(P, projectedComponent)} to={plus(P, contribution)} color="var(--contribution)" width={1.3} dashed reduced={still} /></>}
        <Vector from={P} to={plus(P, contribution)} color="var(--contribution)" width={1.8} label={surface ? fieldSymbol+'z' : fieldSymbol} reduced={still} />
      </>}
      {!scalar && mode === 'sum' && chainPoints.length > 1 && <path className="cd-sum-chain" data-sum-chain={String(chainPoints.length)} d={pathThrough(chainPoints)} fill="none" />}
      {!scalar && <Vector from={P} to={plus(P, net)} width={3.5} label={continuum>=.999&&full&&progress>=.999?'E':'Σ ΔE'} reduced={still} />}
      {!scalar && magnitude(displayed) < 1e-8 && <text x={P.x-16} y={P.y-47} textAnchor="end" className="cd-zero">E = 0</text>}
      {scalar && <g className="cd-gauge" aria-hidden="true">
        <line x1={P.x+26} y1={P.y-92} x2={P.x+26} y2={P.y+92} />
        <rect x={P.x+21} y={gaugeH < 0 ? P.y : P.y - gaugeH} width="10" height={Math.abs(gaugeH)} rx="2" />
        {showContribution && <rect x={P.x+38} y={dvH < 0 ? P.y : P.y - dvH} width="6" height={Math.abs(dvH)} rx="1" className="cd-gauge-dv" />}
        <text x={P.x+42} y={P.y - Math.max(14, Math.abs(gaugeH) + 8)}>{continuum>=.999&&full&&progress>=.999?'V':'Σ ΔV'}</text>
        <text x={P.x+42} y={P.y - Math.max(14, Math.abs(gaugeH) + 8) + 16} className="cd-gauge-readout">{pretty(vNow)} V</text>
      </g>}
      <g {...(id === 'arc' ? {} : handle('P'))} className={`cd-observation ${id === 'arc' ? 'is-fixed' : ''}`}>
        <circle data-orbit-p="true" cx={P.x} cy={P.y} r="28" fill={`url(#${uid}point)`} /><circle data-orbit-p="true" cx={P.x} cy={P.y} r="16" className="cd-point-halo" /><circle data-orbit-p="true" cx={P.x} cy={P.y} r="5" className="cd-point" /><text data-orbit-p="true" x={P.x-10} y={P.y+31} className="cd-point-label">{id === 'arc' ? 'P = O' : 'P'}</text>
      </g>
      {showContribution && <g className="cd-source-tag"><line x1={source.x} y1={source.y} x2={source.x+(source.x>560?-22:22)} y2={source.y+(source.y<95?22:-20)} /><text x={source.x+(source.x>560?-27:27)} y={source.y+(source.y<95?27:-21)} textAnchor={source.x>560?'end':'start'}>{sourceVisible ? (surface ? 'ring '+elementSymbol : elementSymbol) : elementSymbol+' outside view'}</text></g>}
      {mode === 'integrate' && onBoundRangeChange && [0, 1].map(i => { const raw = project(world(boundRange[i]/100)); const point = { x: clamp(raw.x, 57, 650), y: clamp(raw.y, 66, 358) + ((id === 'ring' || (id === 'arc' && p.phi > 6.2)) ? (i ? 13 : -13) : 0) }; return <g key={i} {...handle(String(i))} className="cd-bound"><circle cx={point.x} cy={point.y} r="17" fill="transparent" /><rect x={point.x-8} y={point.y-8} width="16" height="16" rx="4" /><text x={point.x+(i ? 18 : -18)} y={point.y+5} textAnchor={i ? 'start' : 'end'}>{i ? 'b' : 'a'}</text></g>; })}
      {showContribution && !scalar && <g className="cd-triangle">
        {perspective ? <><path d="M538 135V73L619 135Z"/><path d="M538 127h8v8"/><text x="526" y="110">z</text><text x="575" y="151">{surface?'s':'R'}</text><text x="584" y="94">rᵢ</text><text x="548" y="93">α</text><text x="538" y="170" className="cd-triangle-note">Right triangle · schematic</text></> : id==='arc' ? <><line x1={P.x} y1={P.y} x2={selectedPoint.x} y2={selectedPoint.y}/><text x={P.x+30} y={P.y-12}>θ</text></> : id==='axial' ? <text x={(P.x+source.x)/2} y={P.y-39}>rᵢ = L + a − x</text> : <><path d={`M${source.x} ${source.y}L${source.x} ${P.y}L${P.x} ${P.y}`} /><text x={(source.x+P.x)/2+7} y={(source.y+P.y)/2-10}>rᵢ</text><text x={source.x-24} y={(source.y+P.y)/2}>{id==='semi'?'x':'y'}</text><text x={P.x-31} y={P.y-8}>α</text></>}
      </g>}
      <line x1="30" y1="387" x2="690" y2="387" className="cd-divider" />
      <text x="30" y="409" className="cd-footer">{sourceLabel}</text>
      <text x="690" y="409" textAnchor="end" className="cd-footer">{scalar ? `${continuum>=.999?'dV':'ΔV'} · V: ${pretty(vNow)} V` : showContribution ? `${fieldSymbol} × ${pretty(selectedGain)} · E: ${pretty(scaleValue)} N/C per 100 px` : `${n} charge pieces`}</text>
    </svg>
    <details className="cd-controls" open><summary>Diagram controls and keyboard help</summary><p id={`${uid}help`}>Tab moves between controls. Arrow keys adjust the focused control; Home and End select its limits. You can also drag P and the integration bounds in the figure.</p>
    <div className="cd-control-grid">
      {perspective&&<button ref={cameraControl} type="button" className="cd-camera-control" aria-describedby={`${uid}camera-help`} onKeyDown={ev=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(ev.key)){ev.preventDefault();commitView(keyboardCamera({yaw:yawMv.get(),pitch:pitchMv.get()},ev.key));}}} onClick={()=>commitView({...DEFAULT_CAMERA})}>Rotate view with arrow keys<span id={`${uid}camera-help`}>Left/right rotate; up/down tilt; Home or Enter resets.</span></button>}
      <label>Charge element {selectedIndex+1} of {n}<input type="range" aria-label="Selected charge element" min={0} max={n-1} step={1} value={selectedIndex} onChange={ev=>onSelect(Number(ev.target.value))}/></label>
      {id!=='arc'&&<label>Observation distance: {pretty(p.distance)} m<input type="range" aria-label="Observation distance in meters" aria-valuetext={`${pretty(p.distance)} meters`} min={.5} max={6} step={.1} value={p.distance} onChange={ev=>setParams({distance:Number(ev.target.value)})}/></label>}
      {mode==='integrate'&&onBoundRangeChange&&[0,1].map(i=><label key={i}>{i?'Upper':'Lower'} bound: {boundRange[i]}%<input type="range" aria-label={`${i?'Upper':'Lower'} integration bound`} aria-valuetext={`${boundRange[i]} percent of the source coordinate`} min={0} max={100} step={1} value={boundRange[i]} onChange={ev=>{const next:[number,number]=[...boundRange];next[i]=Number(ev.target.value);onBoundRangeChange(next);}}/></label>)}
    </div></details>
    <output className="cd-announcement" aria-live="polite" aria-atomic="true">{announcement}</output>
    {perspective && <div className="cd-orbit-chrome"><span>Drag to rotate, or use the view control above</span><button type="button" className="cd-orbit-reset" onClick={() => commitView({...DEFAULT_CAMERA})} disabled={camera.yaw === DEFAULT_CAMERA.yaw && camera.pitch === DEFAULT_CAMERA.pitch}>Reset view</button></div>}
    <div className="cd-caption"><span><i className="cd-dot" />{sourceText}</span><span>{!full?'Selected interval':mode === 'sum' || mode === 'integrate' ? `${Math.round(progress*100)}% accumulated` : continuum >= .999 ? 'Infinitesimal limit' : 'Finite elements'}</span></div>
  </div>;
}
