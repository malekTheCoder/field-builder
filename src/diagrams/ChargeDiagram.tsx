'use client';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Params, Problem } from '../problems/types';
import { field, magnitude, pretty, type Vec } from '../symbolic/physics';
import { sampleDistribution, sumSamples, sumInterval, intervalWeights } from './sampling';
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
const zero: Vec = { x: 0, y: 0, z: 0 };
function pathThrough(points: Point[], close = false) { return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + (close ? 'Z' : ''); }
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
  const svg = useRef<SVGSVGElement>(null), dragging = useRef<string | null>(null), uid = useId().replace(/:/g, '');
  const [camera, setCamera] = useState<CameraView>(DEFAULT_CAMERA), orbitFrom = useRef<Point>({ x: 0, y: 0 });
  const reduced = !!useReducedMotion(), id = problem.id, surface = id === 'disk' || id === 'sheet', perspective = surface || id === 'ring';
  // An orbit drag re-renders on every pointer move; tweening the geometry behind it only adds lag.
  const still = reduced || dragging.current === 'orbit';
  const n = Math.max(3, Math.round(count)), R = p.size / 2, selectedIndex = clamp(Math.round(selected), 0, n - 1);
  const samples = useMemo(() => sampleDistribution(id, p, n), [id, p, n]);
  const sample = samples[selectedIndex], total = sumSamples(samples), weights = intervalWeights(n,boundRange,progress), partial = sumInterval(samples,boundRange,progress);
  const full = boundRange[0]===0 && boundRange[1]===100;
  const displayed = continuum>=.999 && progress>=.999 && full ? field(id,p) : partial;
  const O: Point = perspective ? { x: 315, y: 296 } : id === 'semi' ? { x: 300, y: 310 } : id === 'axial' ? { x: 130, y: 230 } : id === 'arc' ? { x: 375, y: 218 } : { x: 220, y: 216 };
  const unit = perspective ? 42 : id==='bisector' ? Math.min(45,140/R) : id==='arc' ? 40 : 35;
  const project = (v: Vec): Point => { if (!perspective) return { x: O.x + unit * v.x, y: O.y - unit * v.y }; const s = projectCamera(v, camera.yaw, camera.pitch); return { x: O.x + unit * s.x, y: O.y + unit * s.y }; };
  // Screen point a distance `length` out along a world direction, for the axes and the R/s bracket.
  const ray = (v: Vec, length: number): Point => { const s = projectCamera(v, camera.yaw, camera.pitch); return { x: O.x + length * s.x, y: O.y + length * s.y }; };
  const axisX = ray({ x: 1, y: 0, z: 0 }, 185), axisY = ray({ x: 0, y: 1, z: 0 }, 122);
  const axisTip = (a: Point, dx: number, dy: number): Point => ({ x: clamp(a.x + dx, 52, 652), y: clamp(a.y + dy, 70, 360) });
  const P = project(id === 'arc' ? zero : id === 'axial' ? { x: p.size + p.distance, y: 0, z: 0 } : id === 'semi' ? { x: 0, y: p.distance, z: 0 } : perspective ? { x: 0, y: 0, z: p.distance } : { x: p.distance, y: 0, z: 0 });
  const world = (t: number): Vec => {
    if (id === 'bisector') return { x: 0, y: p.size * (t - .5), z: 0 };
    if (id === 'axial') return { x: p.size * t, y: 0, z: 0 };
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
  const scaleValue = 10 ** Math.ceil(Math.log10(fieldNorm));
  const gain = 75 / scaleValue;
  const fieldScreen = (v: Vec, multiplier = 1): Point => { const k = gain * multiplier; if (!perspective) return { x: k * v.x, y: -k * v.y }; const s = projectCamera(v, camera.yaw, camera.pitch); return { x: k * s.x, y: k * s.y }; };
  const selectedGain = Math.max(1, Math.min(1000, 55 / Math.max(.001, Math.hypot(fieldScreen(sample.field).x, fieldScreen(sample.field).y))));
  const contribution = fieldScreen(sample.field, selectedGain);
  const projectedComponent = fieldScreen(perspective ? { x: 0, y: 0, z: sample.field.z } : { x: sample.field.x, y: 0, z: 0 }, selectedGain);
  const net = fieldScreen(displayed);
  const showContribution = mode !== 'divide' || !!highlight;
  const elementSymbol = continuum>=.999 ? 'dQ' : 'ΔQ';
  const fieldSymbol = continuum>=.999 ? 'dE' : 'ΔE';
  const partnerIndex = id === 'ring' ? (selectedIndex + Math.floor(n / 2)) % n : n - 1 - selectedIndex;
  const supportsPair = id === 'bisector' || id === 'infinite' || id === 'ring' || id === 'arc';
  // The exact opposite element is used for odd partitions too: symmetry is a
  // property of the source, not an artifact of whether n happens to be even.
  const partnerField = id === 'ring' ? { x: -sample.field.x, y: -sample.field.y, z: sample.field.z } : { x: sample.field.x, y: -sample.field.y, z: sample.field.z };
  const partnerPos = id === 'ring' ? project({ x: -sample.position.x, y: -sample.position.y, z: 0 }) : project(samples[partnerIndex].position);
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
    // stopPropagation keeps a grab on P or a bound from also starting an orbit on the root.
    onPointerDown: (ev: PointerEvent<SVGGElement>) => { ev.stopPropagation(); ev.currentTarget.setPointerCapture(ev.pointerId); dragging.current = name; },
    onPointerMove: move, onPointerUp: () => { dragging.current = null; }, onPointerCancel: () => { dragging.current = null; },
  });
  const onControl = (target: EventTarget | null) => target instanceof Element && !!target.closest('.cd-piece,.cd-observation,.cd-bound');
  const release = () => { if (dragging.current === 'orbit') dragging.current = null; };
  // Orbit is offered only where the projection is already pseudo-3D; the planar views carry
  // hardcoded axis labels and dimension brackets that a rotation would misplace.
  const orbit = {
    onPointerDown: (ev: PointerEvent<SVGSVGElement>) => { if (onControl(ev.target)) return; ev.currentTarget.setPointerCapture(ev.pointerId); dragging.current = 'orbit'; orbitFrom.current = eventPoint(ev); },
    onPointerMove: (ev: PointerEvent<SVGSVGElement>) => { if (dragging.current !== 'orbit') return; const cursor = eventPoint(ev); setCamera(v => orbitCamera(v, cursor.x - orbitFrom.current.x, cursor.y - orbitFrom.current.y)); orbitFrom.current = cursor; },
    onPointerUp: release, onPointerCancel: release,
    // The element stepper, the P slider and the bound handles all bind arrows and preventDefault
    // first; the bubbled event reaches the root only when no inner control claimed it.
    onKeyDown: (ev: KeyboardEvent<SVGSVGElement>) => { if (ev.defaultPrevented || onControl(ev.target) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(ev.key)) return; ev.preventDefault(); setCamera(v => keyboardCamera(v, ev.key)); },
  };
  const circlePoints = (radius: number, start = 0, end = Math.PI * 2) => Array.from({ length: 97 }, (_, i) => project({ x: radius * Math.cos(start + (end - start) * i / 96), y: radius * Math.sin(start + (end - start) * i / 96), z: 0 }));
  const radiusTip = ray({ x: 1, y: 0, z: 0 }, Math.min(surface ? sample.position.x : R, 7) * unit);
  const drawable = samples.map((s, i) => ({ s, i })).filter(({ s }) => visible(project(s.position)));
  const stride = Math.max(1, Math.ceil(drawable.length / 80));
  const renderSamples = drawable.filter(({ i }, j) => j % stride === 0 || i === selectedIndex);
  // A rod is one object. Slicing it should subdivide that bar, not scatter it into
  // separate floating chunks, so each piece runs edge to edge between the midpoints
  // of its neighbours and the seams fade as the partition approaches the continuum.
  // Midpoints rather than a fixed width because the unbounded sources sample the
  // line non-uniformly, and because `stride` thins the drawn pieces at large N.
  const rodLike = !surface && id !== 'ring' && id !== 'arc';
  const upright = id === 'bisector' || id === 'infinite';
  const along = (pt: Point) => upright ? pt.y : pt.x;
  const rodEnds: [number, number] = id === 'bisector' ? [O.y - R * unit, O.y + R * unit] : id === 'infinite' ? [55, 370] : id === 'axial' ? [O.x, O.x + p.size * unit] : [O.x, 670];
  const rodLow = Math.min(...rodEnds), rodHigh = Math.max(...rodEnds), rodHalf = 7;
  const axes = rodLike ? renderSamples.map(({ s }) => along(project(s.position))) : [];
  const ascending = axes.length < 2 || axes[axes.length - 1] >= axes[0];
  const spans = axes.map((a, j) => {
    const head = j ? (a + axes[j - 1]) / 2 : (ascending ? rodLow : rodHigh);
    const tail = j < axes.length - 1 ? (a + axes[j + 1]) / 2 : (ascending ? rodHigh : rodLow);
    return [Math.min(head, tail), Math.max(head, tail)] as [number, number];
  });
  // Charge marks belong to the rod, not to the partition: their spacing is fixed so
  // the rod does not appear to gain or lose charge as N changes.
  const chargeMarks = rodLike ? Array.from({ length: Math.max(0, Math.floor((rodHigh - rodLow) / 19)) }, (_, k) => rodLow + 19 * (k + .5)).filter(v => v < rodHigh) : [];
  const sourceLabel = surface ? `${elementSymbol} ${continuum>=.999?'=':'≈'} σ · 2πs ${continuum>=.999?'ds':'Δs'}` : id === 'ring' || id === 'arc' ? `${elementSymbol} = λR ${continuum>=.999?'dθ':'Δθ'}` : `${elementSymbol} = λ ${continuum>=.999?'dℓ':'Δℓ'}`;
  const sourceText = surface ? 'Whole annulus · transverse fields cancel' : id === 'infinite' || id === 'semi' ? 'Unbounded source · visible window shown' : id === 'arc' ? 'Observation point fixed at center' : 'Select a piece · drag P to explore';
  return <div className={"charge-diagram cd-focus-"+highlight}>
    <svg ref={svg} className={`cd-svg${perspective ? ' cd-orbitable' : ''}`} viewBox="0 0 720 430" tabIndex={perspective ? 0 : undefined} {...(perspective ? orbit : {})} aria-label={`${problem.title}. Interactive charge distribution and electric field visualization.${perspective ? ' Drag or use the arrow keys to rotate the view, Home to reset it.' : ''}`}>
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
        {surface && <><path d={pathThrough(circlePoints(id === 'sheet' ? 7 : R), true)} className="cd-surface" />{id === 'sheet' && <path d="M80 340l30 12m-8-16 30 12m444-78 30 12m-8-16 30 12" className="cd-continuation" />}</>}
        {rodLike && <rect x={upright ? O.x - rodHalf : rodLow} y={upright ? rodLow : O.y - rodHalf} width={upright ? rodHalf * 2 : rodHigh - rodLow} height={upright ? rodHigh - rodLow : rodHalf * 2} rx={id === 'bisector' || id === 'axial' ? rodHalf : 0} fill="var(--charge-fill)" stroke="var(--charge)" strokeWidth="1.5" />}
        {(id === 'ring' || id === 'arc') && <path d={pathThrough(circlePoints(R, id === 'arc' ? -p.phi / 2 : 0, id === 'arc' ? p.phi / 2 : 2 * Math.PI))} className="cd-charge-base" />}
        {renderSamples.map(({ s, i }) => {
          const pos = project(s.position), active = i === selectedIndex, accumulated = Math.abs(weights[i]) > 0 && (mode === 'sum' || mode === 'integrate');
          const inInterval = Math.abs(intervalWeights(n,boundRange,1)[i])>0;
          const opacity = !inInterval ? .14 : active ? 1 : accumulated ? .94 : .48 + continuum * .3;
          let shape;
          if (surface) shape = <motion.path initial={false} animate={{ d: pathThrough(circlePoints(s.position.x)) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth={active ? 4 : continuum > .8 ? 1 : 1.7} />;
          else if (id === 'ring' || id === 'arc') {
            const span = (id === 'ring' ? 2 * Math.PI : p.phi) / n * (1 - .18 * (1 - continuum));
            shape = <motion.path initial={false} animate={{ d: pathThrough(circlePoints(R, s.coordinate - span / 2, s.coordinate + span / 2)) }} transition={{ duration: still ? 0 : .18 }} fill="none" strokeWidth={active ? 10 : 7} />;
          } else {
            const [head, tail] = spans[renderSamples.findIndex(d => d.i === i)] ?? [along(pos) - 6, along(pos) + 6];
            const extent = Math.max(1, tail - head);
            shape = upright ? <rect x={pos.x - rodHalf} y={head} width={rodHalf * 2} height={extent} /> : <rect x={head} y={pos.y - rodHalf} width={extent} height={rodHalf * 2} />;
          }
          return <g key={i} className={`cd-piece ${active ? 'is-selected' : ''}`} style={{ opacity }} onClick={() => onSelect(i)} tabIndex={active ? 0 : -1} role="button" aria-label={`Charge element ${i + 1} of ${n}`} onKeyDown={ev => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { ev.preventDefault(); onSelect((i + 1) % n); } if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { ev.preventDefault(); onSelect((i + n - 1) % n); } }}>{shape}</g>;
        })}
        {rodLike && <g className="cd-plus" aria-hidden="true">{chargeMarks.map(v => <text key={v} x={upright ? O.x : v} y={(upright ? v : O.y) + 3.6} textAnchor="middle">+</text>)}</g>}
        {rodLike && continuum < .995 && <g style={{ opacity: .55 * (1 - continuum) }} aria-hidden="true">{spans.slice(1).map(([head], j) => upright
          ? <line key={j} x1={O.x - rodHalf} y1={head} x2={O.x + rodHalf} y2={head} stroke="var(--charge)" strokeWidth="1.1" />
          : <line key={j} x1={head} y1={O.y - rodHalf} x2={head} y2={O.y + rodHalf} stroke="var(--charge)" strokeWidth="1.1" />)}</g>}
        {!surface && supportsPair && pair && showContribution && <><line x1={partnerPos.x} y1={partnerPos.y} x2={P.x} y2={P.y} className="cd-construction cd-pair" /><circle cx={partnerPos.x} cy={partnerPos.y} r="9" className="cd-partner" /></>}
        {showContribution && <line x1={selectedPoint.x} y1={selectedPoint.y} x2={P.x} y2={P.y} className="cd-construction" />}
      </g>
      {id === 'infinite' && <g className="cd-infinity"><path d={`M${O.x-10} 73l20-9m-20 17 20-9M${O.x-10} 351l20-9m-20 17 20-9`} /><text x={O.x - 38} y="76">+∞</text><text x={O.x - 38} y="356">−∞</text></g>}
      {id === 'semi' && <g className="cd-infinity"><path d={`M628 ${O.y-10}l-9 20m17-20-9 20`} /><text x="641" y={O.y - 17}>∞</text></g>}
      {id === 'sheet' && <text x="544" y="354" className="cd-small">s → ∞</text>}
      {id === 'bisector' && <g className="cd-dimension"><path d={`M${O.x-39} ${O.y-R*unit}h-7m3.5 0V${O.y+R*unit}m-3.5 0h7`} /><text x={O.x-57} y={O.y+4}>L</text><text x={O.x+17} y={O.y-R*unit-8}>+L/2</text><text x={O.x+17} y={O.y+R*unit+20}>−L/2</text></g>}
      {id === 'axial' && <g className="cd-dimension"><path d={`M${O.x} ${O.y+31}H${O.x+p.size*unit}`} /><text x={O.x+p.size*unit/2} y={O.y+50}>L</text><text x={O.x+p.size*unit+3} y={O.y-19}>L</text><text x={(O.x+p.size*unit+P.x)/2} y={O.y+31}>a</text></g>}
      {perspective && <g className="cd-dimension"><path d={`M${O.x} ${O.y}L${radiusTip.x} ${radiusTip.y}`} /><text x={O.x+(radiusTip.x-O.x)*.6} y={O.y+(radiusTip.y-O.y)*.6+19}>{surface ? 's' : 'R'}</text><text x={O.x-20} y={(O.y+P.y)/2}>z</text></g>}
      {id === 'arc' && <g className="cd-dimension"><path d={pathThrough(circlePoints(R*.32, -p.phi/2, p.phi/2))} /><text x={O.x+R*unit*.32+9} y={O.y-9}>φ</text><line x1={O.x} y1={O.y} x2={O.x+R*unit} y2={O.y} /><text x={O.x+R*unit*.6} y={O.y+23}>R</text></g>}
      {(id === 'bisector' || id === 'infinite') && <g className="cd-dimension"><path d={`M${O.x+13} ${O.y+33}H${P.x-10}`} /><text x={(O.x+P.x)/2} y={O.y+52}>r</text></g>}
      {id === 'semi' && <text x={O.x+19} y={(P.y+O.y)/2} className="cd-small">r</text>}
      {id !== 'arc' && <text x={O.x-17} y={O.y+20} className="cd-origin">O</text>}
      {showContribution && <>
        {pair && supportsPair && <Vector from={P} to={plus(P, fieldScreen(partnerField, selectedGain))} color="var(--contribution)" dashed reduced={still} />}
        {components && <><Vector from={P} to={plus(P, projectedComponent)} color="var(--contribution)" width={1.3} dashed reduced={still} /><Vector from={plus(P, projectedComponent)} to={plus(P, contribution)} color="var(--contribution)" width={1.3} dashed reduced={still} /></>}
        <Vector from={P} to={plus(P, contribution)} color="var(--contribution)" width={1.8} label={surface ? fieldSymbol+'z' : fieldSymbol} reduced={still} />

      </>}
      <Vector from={P} to={plus(P, net)} width={3.5} label={continuum>=.999&&full&&progress>=.999?'E':'Σ ΔE'} reduced={still} />
      {magnitude(displayed) < 1e-8 && <text x={P.x-16} y={P.y-47} textAnchor="end" className="cd-zero">E = 0</text>}
      <g {...(id === 'arc' ? {} : handle('P'))} className={`cd-observation ${id === 'arc' ? 'is-fixed' : ''}`} role={id === 'arc' ? undefined : 'slider'} tabIndex={id === 'arc' ? undefined : 0} aria-label="Observation distance in meters" aria-valuemin={.5} aria-valuemax={6} aria-valuenow={p.distance} aria-valuetext={`${p.distance} meters`} onKeyDown={ev => { if (id !== 'arc' && ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(ev.key)) { ev.preventDefault(); setParams({ distance: Math.round(clamp(p.distance + (ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? .1 : -.1), .5, 6) * 10) / 10 }); } }}>
        <circle cx={P.x} cy={P.y} r="28" fill={`url(#${uid}point)`} /><circle cx={P.x} cy={P.y} r="16" className="cd-point-halo" /><circle cx={P.x} cy={P.y} r="5" className="cd-point" /><text x={P.x-10} y={P.y+31} className="cd-point-label">{id === 'arc' ? 'P = O' : 'P'}</text>
      </g>
      {showContribution && <g className="cd-source-tag"><line x1={source.x} y1={source.y} x2={source.x+(source.x>560?-22:22)} y2={source.y+(source.y<95?22:-20)} /><text x={source.x+(source.x>560?-27:27)} y={source.y+(source.y<95?27:-21)} textAnchor={source.x>560?'end':'start'}>{sourceVisible ? (surface ? 'ring '+elementSymbol : elementSymbol) : elementSymbol+' outside view'}</text></g>}
      {mode === 'integrate' && onBoundRangeChange && [0, 1].map(i => { const raw = project(world(boundRange[i]/100)); const point = { x: clamp(raw.x, 57, 650), y: clamp(raw.y, 66, 358) + ((id === 'ring' || (id === 'arc' && p.phi > 6.2)) ? (i ? 13 : -13) : 0) }; return <g key={i} {...handle(String(i))} className="cd-bound" tabIndex={0} role="slider" aria-label={`${i ? 'Upper' : 'Lower'} integration bound`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={boundRange[i]} onKeyDown={ev => { if (['ArrowRight','ArrowUp','ArrowLeft','ArrowDown'].includes(ev.key)) { ev.preventDefault(); const next: [number,number] = [...boundRange]; next[i] = clamp(next[i] + (ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? 1 : -1), 0, 100); onBoundRangeChange(next); } }}><circle cx={point.x} cy={point.y} r="17" fill="transparent" /><rect x={point.x-8} y={point.y-8} width="16" height="16" rx="4" /><text x={point.x+(i ? 18 : -18)} y={point.y+5} textAnchor={i ? 'start' : 'end'}>{i ? 'b' : 'a'}</text></g>; })}
      {showContribution && <g className="cd-triangle">
        {perspective ? <><path d="M538 135V73L619 135Z"/><path d="M538 127h8v8"/><text x="526" y="110">z</text><text x="575" y="151">{surface?'s':'R'}</text><text x="584" y="94">rᵢ</text><text x="548" y="93">α</text><text x="538" y="170" className="cd-triangle-note">Right triangle · schematic</text></> : id==='arc' ? <><line x1={P.x} y1={P.y} x2={selectedPoint.x} y2={selectedPoint.y}/><text x={P.x+30} y={P.y-12}>θ</text></> : id==='axial' ? <text x={(P.x+source.x)/2} y={P.y-39}>rᵢ = L + a − x</text> : <><path d={`M${source.x} ${source.y}L${source.x} ${P.y}L${P.x} ${P.y}`} /><text x={(source.x+P.x)/2+7} y={(source.y+P.y)/2-10}>rᵢ</text><text x={source.x-24} y={(source.y+P.y)/2}>{id==='semi'?'x':'y'}</text><text x={P.x-31} y={P.y-8}>α</text></>}
      </g>}
      <line x1="30" y1="387" x2="690" y2="387" className="cd-divider" />
      <text x="30" y="409" className="cd-footer">{sourceLabel}</text>
      <text x="690" y="409" textAnchor="end" className="cd-footer">{showContribution ? `${fieldSymbol} × ${pretty(selectedGain)} · E: ${pretty(scaleValue)} N/C per 75 px` : n > 80 ? `${n} numerical pieces · simplified display` : `${n} charge pieces`}</text>
    </svg>
    {perspective && <div className="cd-orbit-chrome"><span>Drag or arrow keys to rotate · Home to reset</span><button type="button" className="cd-orbit-reset" onClick={() => setCamera(DEFAULT_CAMERA)} disabled={camera.yaw === DEFAULT_CAMERA.yaw && camera.pitch === DEFAULT_CAMERA.pitch}>Reset view</button></div>}
    <div className="cd-caption"><span><i className="cd-dot" />{sourceText}</span><span>{!full?'Selected interval':mode === 'sum' || mode === 'integrate' ? `${Math.round(progress*100)}% accumulated` : continuum >= .999 ? 'Infinitesimal limit' : 'Finite elements'}</span></div>
  </div>;
}
