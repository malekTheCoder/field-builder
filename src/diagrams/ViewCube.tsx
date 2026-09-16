'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- inside an <svg> there is no <button> or
   <fieldset> to reach for; a role on a <polygon> is the only way to say what a face is. */
import {projectCamera, type CameraView} from './camera';
/** The little cube CAD tools put in a corner: it turns with the view, and you click a face to
 * look straight at it.
 *
 * Dragging is how you explore; this is how you get somewhere known. "Show me this edge-on" and
 * "show me it from above" are the two requests a reader of these figures actually has, and
 * neither is a thing you can reliably reach by dragging.
 *
 * It is drawn with the same `projectCamera` as the figure, so it cannot disagree with what it
 * is reporting -- no second copy of the projection to drift.
 *
 * WHERE THE FACE ANGLES COME FROM, since guessing them would have been a bug that looks like a
 * design choice. The projection keeps two rows, r1 = (cos y, sin y, 0) and
 * r2 = (sin y sin p, −cos y sin p, −cos p); the direction it discards is r1 × r2, which is the
 * direction the camera looks along:
 *
 *     w = (−sin y cos p,  cos y cos p,  −sin p)
 *
 * To look straight at the face whose outward normal is n, the camera must sit on +n, i.e.
 * w = −n. Solving that for each face gives the table below exactly. The top face wants
 * p = π/2; the four sides want p = 0, which the camera clamp raises to its floor of 0.15, so a
 * side view is very slightly above edge-on rather than exactly on it. There is no bottom face:
 * the clamp does not allow the camera under the plane, which is deliberate -- every one of these
 * lessons has its charge in the z = 0 plane and reads upside-down from below. */
type Face = {key: string; normal: [number, number, number]; view: CameraView; label: string};
const HALF_PI = Math.PI / 2;
export const CUBE_FACES: readonly Face[] = [
  // Not π/2. Looking exactly down the axis collapses all four side faces to zero-width slivers,
  // and the cube becomes a trap: nothing left to click but the face you are already on. 1.3 is
  // the camera clamp's own ceiling -- the highest a drag can reach anyway -- and it leaves the
  // sides a few pixels wide. The 2D button is there for a true plan view.
  {key: 'top', normal: [0, 0, 1], view: {yaw: -.5, pitch: 1.3}, label: 'Look down the axis'},
  {key: 'front', normal: [0, -1, 0], view: {yaw: 0, pitch: .15}, label: 'Front, edge-on'},
  {key: 'back', normal: [0, 1, 0], view: {yaw: Math.PI, pitch: .15}, label: 'Back, edge-on'},
  {key: 'right', normal: [1, 0, 0], view: {yaw: HALF_PI, pitch: .15}, label: 'Right side, edge-on'},
  {key: 'left', normal: [-1, 0, 0], view: {yaw: -HALF_PI, pitch: .15}, label: 'Left side, edge-on'},
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
export const facesInFront = (view: CameraView) => {
  const d = cameraDirection(view);
  return CUBE_FACES.filter(f => f.normal[0] * d[0] + f.normal[1] * d[1] + f.normal[2] * d[2] > .06);
};
export function ViewCube({view, at, size = 21, onPick}: {
  view: CameraView; at: {x: number; y: number}; size?: number; onPick: (next: CameraView, label: string) => void;
}) {
  const place = (p: readonly [number, number, number]) => {
    const s = projectCamera({x: p[0], y: p[1], z: p[2]}, view.yaw, view.pitch);
    return `${(at.x + s.x * size).toFixed(2)},${(at.y + s.y * size).toFixed(2)}`;
  };
  // Back-to-front, so a face nearer the camera is drawn over one behind it.
  const d = cameraDirection(view);
  const ordered = [...CUBE_FACES].sort((a, b) =>
    (a.normal[0] * d[0] + a.normal[1] * d[1] + a.normal[2] * d[2]) - (b.normal[0] * d[0] + b.normal[1] * d[1] + b.normal[2] * d[2]));
  return <g className="cd-cube" role="group" aria-label="Turn the figure to a named view">
    {ordered.map(f => {
      const towards = f.normal[0] * d[0] + f.normal[1] * d[1] + f.normal[2] * d[2];
      if (towards <= .06) return null;      // facing away: not drawn, and not clickable
      return <polygon key={f.key} className="cd-cube-face" data-face={f.key} tabIndex={0} role="button"
        aria-label={f.label} points={corners(f.normal).map(place).join(' ')}
        style={{opacity: .32 + .55 * towards}}
        onClick={() => onPick(f.view, f.label)}
        onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(f.view, f.label); } }}>
        <title>{f.label}</title>
      </polygon>;
    })}
  </g>;
}
