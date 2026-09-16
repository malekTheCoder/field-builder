'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- inside an <svg> there is no <button> or
   <fieldset> to reach for; a role on a <polygon> is the only way to say what a face is. */
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
/** The four corners of a face of the unit cube, in order around it. */
function corners(n: readonly [number, number, number]): [number, number, number][] {
  const axis = n.findIndex(c => c !== 0), s = n[axis];
  const [u, v] = [0, 1, 2].filter(i => i !== axis);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
    const p: [number, number, number] = [0, 0, 0];
    p[axis] = s; p[u] = a; p[v] = b;
    return p;
  });
}
/** Which way the camera sits, for deciding which faces are facing us. */
export function cameraDirection({yaw, pitch}: CameraView): [number, number, number] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [sy * cp, -cy * cp, sp];
}
const facing = (f: Face, d: readonly [number, number, number]) =>
  f.normal[0] * d[0] + f.normal[1] * d[1] + f.normal[2] * d[2];
export const facesInFront = (view: CameraView) => {
  const d = cameraDirection(view);
  return CUBE_FACES.filter(f => facing(f, d) > .06);
};
export type ViewCubeProps = {
  view: CameraView; at: {x: number; y: number}; size?: number;
  onPick: (next: CameraView, label: string) => void;
  /** A drag across the cube spins the scene, as it does in every CAD tool. */
  onSpin?: (dx: number, dy: number) => void;
  onSpinStart?: () => void;
  /** The arrows around it, a notch at a time. */
  onStep?: (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => void;
};
export function ViewCube({view, at, size = 22, onPick, onSpin, onSpinStart, onStep}: ViewCubeProps) {
  const place = (p: readonly [number, number, number]) => {
    const s = projectCamera({x: p[0], y: p[1], z: p[2]}, view.yaw, view.pitch);
    return {x: at.x + s.x * size, y: at.y + s.y * size};
  };
  const point = (p: readonly [number, number, number]) => {
    const q = place(p); return `${q.x.toFixed(2)},${q.y.toFixed(2)}`;
  };
  const d = cameraDirection(view);
  // Back to front, so a nearer face paints over one behind it.
  const ordered = [...CUBE_FACES].sort((a, b) => facing(a, d) - facing(b, d));
  const ring = size * 2.1;
  const steps = [
    {key: 'ArrowLeft' as const, at: {x: -ring, y: 0}, path: 'M3.5 -4.5 L-3 0 L3.5 4.5', title: 'Turn left'},
    {key: 'ArrowRight' as const, at: {x: ring, y: 0}, path: 'M-3.5 -4.5 L3 0 L-3.5 4.5', title: 'Turn right'},
    {key: 'ArrowUp' as const, at: {x: 0, y: -ring}, path: 'M-4.5 3.5 L0 -3 L4.5 3.5', title: 'Tilt up'},
    {key: 'ArrowDown' as const, at: {x: 0, y: ring}, path: 'M-4.5 -3.5 L0 3 L4.5 -3.5', title: 'Tilt down'},
  ];
  return <g className="cd-cube" role="group" aria-label="Turn the figure to a named view">
    {/* A drag anywhere over the cube spins the scene. It sits under the faces, so a click still
        lands on whichever face was clicked. */}
    {onSpin && <rect className="cd-cube-grab" x={at.x - size * 1.6} y={at.y - size * 1.6}
      width={size * 3.2} height={size * 3.2}
      onPointerDown={ev => { ev.stopPropagation(); try { (ev.target as Element).setPointerCapture(ev.pointerId); } catch { /* no live pointer: the drag still starts */ } onSpinStart?.(); }}
      onPointerMove={ev => { if (ev.buttons) { ev.stopPropagation(); onSpin(ev.movementX, ev.movementY); } }} />}
    {ordered.map(f => {
      const towards = facing(f, d);
      if (towards <= .06) return null;      // facing away: not drawn, and not clickable
      const centre = place([f.normal[0] * 1.03, f.normal[1] * 1.03, f.normal[2] * 1.03]);
      return <g key={f.key} className="cd-cube-side" data-face={f.key}>
        {/* Shaded by how squarely it faces the camera. Every face painted the same made the cube
            read as one flat blob, because adjacent faces had no edge between them. */}
        <polygon className="cd-cube-face" tabIndex={0} role="button" aria-label={f.name}
          points={corners(f.normal).map(point).join(' ')}
          style={{fillOpacity: (.26 + .55 * towards).toFixed(3)}}
          onClick={ev => { ev.stopPropagation(); onPick(f.view, f.name); }}
          onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(f.view, f.name); } }}>
          <title>{f.name}</title>
        </polygon>
        {/* Only on a face square enough on to read a word. A name squeezed onto a sliver is worse
            than no name. */}
        {towards > .55 && <text className="cd-cube-label" x={centre.x.toFixed(2)} y={centre.y.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          style={{fontSize: `${(size * .29).toFixed(1)}px`}}>{f.label}</text>}
      </g>;
    })}
    {onStep && steps.map(s => <g key={s.key} className="cd-cube-step" role="button" tabIndex={0} aria-label={s.title}
      transform={`translate(${(at.x + s.at.x).toFixed(1)} ${(at.y + s.at.y).toFixed(1)})`}
      onClick={ev => { ev.stopPropagation(); onStep(s.key); }}
      onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onStep(s.key); } }}>
      <title>{s.title}</title>
      <circle r={(size * .38).toFixed(1)} />
      <path d={s.path} />
    </g>)}
  </g>;
}
