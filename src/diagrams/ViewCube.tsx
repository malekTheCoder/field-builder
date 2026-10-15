'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- inside an <svg> there is no <button> or
   <fieldset> to reach for; a role on a <polygon> is the only way to say what a face is. */
import {useRef, useState} from 'react';
import {projectCamera, type CameraView} from './camera';
/** The cube CAD tools put in a corner: it turns with the view, every face is named, a drag across
 * it spins the scene, and the arrows around it step the view a notch at a time.
 *
 * Dragging the figure is how you explore; this is how you get somewhere known. "Show me this
 * edge-on" and "show me it from above" are the two requests a reader of these figures has, and
 * neither is reliably reachable by dragging.
 *
 * It is drawn with the figure's own `projectCamera`, so it cannot drift from what it reports.
 *
 * WHERE THE FACE ANGLES COME FROM, since guessing them would be a bug that looks like a design
 * choice. The projection keeps two rows, r1 = (cos y, sin y, 0) and
 * r2 = (sin y sin p, −cos y sin p, −cos p); the direction it discards is r1 × r2, which is the
 * direction the camera looks along:
 *
 *     w = (−sin y cos p,  cos y cos p,  −sin p)
 *
 * To look straight at the face whose outward normal is n the camera must sit on +n, i.e. w = −n.
 * Solving that for each face gives the table below exactly. The four sides want p = 0, which the
 * camera clamp raises to its floor of 0.15, so a side view sits a hair above edge-on. */
type Face = {key: string; normal: [number, number, number]; view: CameraView; label: string; name: string};
const HALF_PI = Math.PI / 2;
export const CUBE_FACES: readonly Face[] = [
  // Not π/2. Looking exactly down the axis collapses all four side faces to zero-width slivers,
  // and the cube becomes a trap: nothing left to click but the face you are already on. 1.3 is
  // the camera clamp's own ceiling -- the highest a drag can reach anyway -- and it leaves the
  // sides a few pixels wide. The 2D button is there for a true plan view. There is no bottom
  // face: the clamp does not allow the camera under the plane, and every one of these lessons
  // keeps its charge in z = 0 and reads upside-down from below.
  {key: 'top', normal: [0, 0, 1], view: {yaw: -.5, pitch: 1.3}, label: 'TOP', name: 'Look down the axis'},
  {key: 'front', normal: [0, -1, 0], view: {yaw: 0, pitch: .15}, label: 'FRONT', name: 'Front, edge-on'},
  {key: 'back', normal: [0, 1, 0], view: {yaw: Math.PI, pitch: .15}, label: 'BACK', name: 'Back, edge-on'},
  {key: 'right', normal: [1, 0, 0], view: {yaw: HALF_PI, pitch: .15}, label: 'RIGHT', name: 'Right side, edge-on'},
  {key: 'left', normal: [-1, 0, 0], view: {yaw: -HALF_PI, pitch: .15}, label: 'LEFT', name: 'Left side, edge-on'},
];
/** Which way the camera sits, for deciding which faces are facing us. */
export function cameraDirection({yaw, pitch}: CameraView): [number, number, number] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [sy * cp, -cy * cp, sp];
}
type V3 = [number, number, number];
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const facing = (f: Face, d: readonly number[]) => dot(f.normal, d);
export const facesInFront = (view: CameraView) => {
  const d = cameraDirection(view);
  return CUBE_FACES.filter(f => facing(f, d) > .06);
};
/** The view that looks back along a direction from the cube's centre -- the inverse of
 * `cameraDirection`, clamped as the camera itself is. Straight down keeps the current turn: a top
 * view has no "front" of its own, and spinning the reader round on the way there is disorienting. */
export function viewToward(n: readonly number[], current: CameraView): CameraView {
  const len = Math.hypot(n[0], n[1], n[2]) || 1, x = n[0] / len, y = n[1] / len, z = n[2] / len;
  const flat = Math.hypot(x, y);
  return {yaw: flat < 1e-6 ? current.yaw : Math.atan2(x, -y), pitch: Math.max(.15, Math.min(1.3, Math.asin(z)))};
}
/* EVERY FACE, EDGE AND CORNER IS A TARGET, as on the cubes in Onshape and Fusion. A face is cut
 * into a three-by-three grid: the middle cell is the face, the cells along its sides are the edges
 * it shares, and the cells at its corners are the corners. A cell's target is the sum of the
 * normals it touches, so the edge between TOP and FRONT is the same target whichever face's cell
 * you hit, and lights on both. */
const BAND = .58;   // where the middle cell ends, as a fraction of the half-width
const STOPS = [[-1, -BAND], [-BAND, BAND], [BAND, 1]] as const;
type Cell = {face: Face; key: string; target: V3; poly: V3[]; centre: boolean};
const NAMES: Record<string, string> = {'0,0,1': 'top', '0,0,-1': 'bottom', '0,-1,0': 'front', '0,1,0': 'back', '1,0,0': 'right', '-1,0,0': 'left'};
function cellsOf(f: Face): Cell[] {
  const axis = f.normal.findIndex(c => c !== 0), s = f.normal[axis];
  const [u, v] = [0, 1, 2].filter(i => i !== axis);
  const out: Cell[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const at = (a: number, b: number): V3 => { const p: V3 = [0, 0, 0]; p[axis] = s; p[u] = a; p[v] = b; return p; };
    const [a0, a1] = STOPS[i], [b0, b1] = STOPS[j];
    const target: V3 = [...f.normal] as V3;
    if (i !== 1) target[u] = i === 0 ? -1 : 1;
    if (j !== 1) target[v] = j === 0 ? -1 : 1;
    out.push({face: f, key: target.join(','), target, centre: i === 1 && j === 1,
      poly: [at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]});
  }
  return out;
}
/** "Top front right corner", "Front left edge", "Top": what a target is called. */
function nameOf(target: V3): string {
  const parts = [[0, 0, target[2]], [0, target[1], 0], [target[0], 0, 0]]
    .filter(p => p.some(c => c !== 0)).map(p => NAMES[p.join(',')]);
  const kind = parts.length === 1 ? 'face' : parts.length === 2 ? 'edge' : 'corner';
  const words = parts.join(' ');
  return `${words[0].toUpperCase()}${words.slice(1)} ${kind}`;
}
export type ViewCubeProps = {
  view: CameraView; at: {x: number; y: number}; size?: number;
  /** The least a face's name may be set at, in the drawing's units: eleven pixels on the screen, whatever the figure's
   * scale. Floored in units, nine of them, it was eight pixels on a phone, where the figure is half size. */
  minFont?: number;
  onPick: (next: CameraView, label: string) => void;
  /** A drag across the cube spins the scene, as it does in every CAD tool. */
  onSpin?: (dx: number, dy: number) => void;
  onSpinStart?: () => void;
  /** The arrows around it, a notch at a time. */
  onStep?: (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => void;
};
/** How far a press may travel and still be a click rather than the start of a drag. */
const SLOP = 4;
export function ViewCube({view, at, size = 22, minFont = 0, onPick, onSpin, onSpinStart, onStep}: ViewCubeProps) {
  const [hover, setHover] = useState('');
  // A press on the cube is a click if it lets go where it started, and a drag if it moves: the whole
  // cube is something to grab -- faces included -- not just the margin round it.
  const press = useRef<{x: number; y: number; lastX: number; lastY: number; moved: boolean; target: V3 | null} | null>(null);
  const place = (p: readonly number[]) => {
    const q = projectCamera({x: p[0], y: p[1], z: p[2]}, view.yaw, view.pitch);
    return {x: at.x + q.x * size, y: at.y + q.y * size};
  };
  const point = (p: readonly number[]) => { const q = place(p); return `${q.x.toFixed(2)},${q.y.toFixed(2)}`; };
  const d = cameraDirection(view);
  // Back to front, so a nearer face paints over one behind it.
  const ordered = [...CUBE_FACES].sort((a, b) => facing(a, d) - facing(b, d)).filter(f => facing(f, d) > .06);
  const ring = size * 2.15;
  const steps = [
    {key: 'ArrowLeft' as const, at: {x: -ring, y: 0}, path: 'M3.5 -4.5 L-3 0 L3.5 4.5', title: 'Turn left'},
    {key: 'ArrowRight' as const, at: {x: ring, y: 0}, path: 'M-3.5 -4.5 L3 0 L-3.5 4.5', title: 'Turn right'},
    {key: 'ArrowUp' as const, at: {x: 0, y: -ring}, path: 'M-4.5 3.5 L0 -3 L4.5 3.5', title: 'Tilt up'},
    {key: 'ArrowDown' as const, at: {x: 0, y: ring}, path: 'M-4.5 -3.5 L0 3 L4.5 -3.5', title: 'Tilt down'},
  ];
  const pick = (target: V3) => onPick(viewToward(target, view), nameOf(target));
  const down = (ev: React.PointerEvent<SVGGElement>) => {
    if (ev.button !== 0 || (ev.target as Element).closest('.cd-cube-step')) return;
    ev.stopPropagation();
    const key = (ev.target as Element).closest<SVGElement>('[data-target]')?.dataset.target;
    press.current = {x: ev.clientX, y: ev.clientY, lastX: ev.clientX, lastY: ev.clientY, moved: false, target: key ? key.split(',').map(Number) as V3 : null};
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* no live pointer: the drag still works */ }
  };
  const move = (ev: React.PointerEvent<SVGGElement>) => {
    const p = press.current;
    if (!p) return;
    ev.stopPropagation();
    if (!p.moved && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < SLOP) return;
    if (!p.moved) { p.moved = true; setHover(''); onSpinStart?.(); }
    // Measured from the last event rather than read from movementX, which touch and some pens
    // leave at zero -- on those the cube took the press and turned nothing.
    onSpin?.(ev.clientX - p.lastX, ev.clientY - p.lastY);
    p.lastX = ev.clientX; p.lastY = ev.clientY;
  };
  const up = (ev: React.PointerEvent<SVGGElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    ev.stopPropagation();
    if (!p.moved && p.target) pick(p.target);
  };
  return <g className={'cd-cube' + (hover ? ' is-hovering' : '')} role="group" aria-label="Turn the figure to a named view"
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { press.current = null; }}
    onPointerLeave={() => { if (!press.current) setHover(''); }}>
    {/* The margin round the cube grabs too, so a drag that starts just off a face still turns it. */}
    <rect className="cd-cube-grab" x={at.x - size * 1.75} y={at.y - size * 1.75} width={size * 3.5} height={size * 3.5} />
    {ordered.map(f => {
      const towards = facing(f, d);
      // Shaded by how squarely it faces the camera, so adjacent faces have an edge between them;
      // opaque, so its name stays readable over a busy figure. In the page's ink, not the field's teal: the cube is a
      // control for the camera, and on this site colour is kept for the physics.
      const fill = `color-mix(in oklab, var(--foreground, #171717) ${(9 + 25 * towards).toFixed(0)}%, var(--diagram, #ffffff))`;
      return <g key={f.key} className="cd-cube-side" data-face={f.key}>
        {cellsOf(f).map(c => <polygon key={c.key} data-target={c.key}
          className={'cd-cube-cell' + (c.centre ? ' is-face' : c.key.split(',').filter(x => x !== '0').length === 3 ? ' is-corner' : ' is-edge') + (hover === c.key ? ' is-lit' : '')}
          points={c.poly.map(point).join(' ')} style={{fill}}
          onPointerEnter={() => { if (!press.current) setHover(c.key); }}>
          <title>{nameOf(c.target)}</title>
        </polygon>)}
        {/* The face's own outline, over its cells, so it reads as one face cut into targets. */}
        <polygon className="cd-cube-outline" points={[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
          const axis = f.normal.findIndex(c => c !== 0), [u, v] = [0, 1, 2].filter(i => i !== axis), p: number[] = [0, 0, 0];
          p[axis] = f.normal[axis]; p[u] = a; p[v] = b; return point(p);
        }).join(' ')} />
      </g>;
    })}
    {/* The names go on after every face is painted, so a nearer face cannot cover the end of one, and
        only on a face square enough on to read a word -- a name squeezed onto a sliver is worse than
        none -- never wider than its face. */}
    {ordered.map(f => {
      const towards = facing(f, d);
      if (towards <= .5) return null;
      const centre = place([f.normal[0] * 1.03, f.normal[1] * 1.03, f.normal[2] * 1.03]);
      const xs = [[-1, -1], [1, 1], [1, -1], [-1, 1]].map(([a, b]) => {
        const axis = f.normal.findIndex(c => c !== 0), [u, v] = [0, 1, 2].filter(i => i !== axis), p: number[] = [0, 0, 0];
        p[axis] = f.normal[axis]; p[u] = a; p[v] = b; return place(p).x;
      });
      const across = Math.max(...xs) - Math.min(...xs);
      // The caller scales `size` with the figure's labels on a phone, so the face -- and the name it
      // holds -- grows with them; scaling the type again on top of that would double it.
      // Up to .46 of the cube's size: at .44, on a phone, where the cube is no larger than it was before
      // the desktop's grew, TOP came out under eight pixels.
      // Never under `minFont`. A word that is a little too long for its face at that size is set narrower to fit
      // (`textLength`), by up to a fifth; one that would need more is left off the face, whose full name is still its
      // button's label. NEVER AN INITIAL: on this figure a bare F reads as force, R as the ring's radius and T as
      // time, and at 125% and 150% zoom FRONT went to F. Measured at .72 of an em a letter, which is what these bold
      // capitals take with their spacing: at .66 FRONT was set to run to its face's very edge at 1366 pixels wide.
      const room = .9 * across, len = f.label.length;
      const font = Math.max(minFont, Math.min(room / (.72 * len), Math.max(9, size * .46))), natural = .72 * len * font;
      if (natural > room / .8) return null;
      return <text key={f.key} className="cd-cube-label" x={centre.x.toFixed(2)} y={centre.y.toFixed(2)}
        textAnchor="middle" dominantBaseline="middle" {...natural > room ? {textLength: room.toFixed(2), lengthAdjust: 'spacingAndGlyphs'} : {}}
        style={{fontSize: `${font.toFixed(1)}px`}}>{f.label}</text>;
    })}
    {/* Keyboard: the faces in view, by name, in a row a Tab walks; the pointer has every edge and
        corner as well. */}
    {ordered.filter(f => facing(f, d) > .3).map(f => <rect key={f.key} className="cd-cube-key" tabIndex={0} role="button" aria-label={f.name}
      x={place(f.normal).x - 1} y={place(f.normal).y - 1} width="2" height="2"
      onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(f.view, f.name); } }} />)}
    {onStep && steps.map(st => <g key={st.key} className="cd-cube-step" role="button" tabIndex={0} aria-label={st.title}
      transform={`translate(${(at.x + st.at.x).toFixed(1)} ${(at.y + st.at.y).toFixed(1)}) scale(${(size / 22).toFixed(3)})`}
      onClick={ev => { ev.stopPropagation(); onStep(st.key); }}
      onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onStep(st.key); } }}>
      <title>{st.title}</title>
      {/* A target a finger can hit: the drawn step is fourteen pixels across on a phone. */}
      <circle className="cd-cube-hit" r="12.5" />
      <circle r="8.4" />
      <path d={st.path} />
    </g>)}
  </g>;
}
