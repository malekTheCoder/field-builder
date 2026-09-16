import type { Vec } from '../symbolic/physics';
export type CameraView = { yaw: number; pitch: number };
export const DEFAULT_CAMERA: Readonly<CameraView> = Object.freeze({ yaw: -.5, pitch: .6 });
/** Where each family of lessons opens in space, because one angle does not suit all of them.
 *
 * A rod, an arc and a ring lie in the z = 0 plane and the interesting thing is their SHAPE, so
 * they want the camera well above it, looking down enough to read the outline. A disk or a
 * sheet is a flat expanse whose whole story is the field standing off its face, so a high
 * camera flattens the one thing worth seeing; they want to be nearer edge-on. P on the axis of
 * a ring is the same case.
 *
 * Keyed by the geometry, not the lesson, so a potential lesson opens the way its field twin
 * does. `Home` and Reset return here, not to a single global pose. */
const OPENING: Record<string, CameraView> = {
  // A rod, an arc or a ring lies flat in z = 0 and what matters is its SHAPE, so these look well
  // down on the plane: a low camera turns a rod into a line and an arc into a line segment.
  arc: {yaw: -.42, pitch: .78}, bisector: {yaw: -.42, pitch: .82}, axial: {yaw: -.42, pitch: .82},
  endpoint: {yaw: -.42, pitch: .8}, ramp: {yaw: -.42, pitch: .8},
  infinite: {yaw: -.42, pitch: .82}, semi: {yaw: -.42, pitch: .82},
  // The three with P on an axis keep the shallower standard angle. Lower would show the field
  // standing off the face better, and it cannot go there: P and the z axis are the same vertical
  // line on screen, so below about pitch .6 the axis letter lands on P and the placer cannot move
  // it -- an axis letter that shifts stops naming its axis. Use the view cube's side faces to go
  // edge-on deliberately; that is what it is for.
  disk: {yaw: -.5, pitch: .6}, sheet: {yaw: -.5, pitch: .6}, ring: {yaw: -.5, pitch: .6},
};
export const openingCamera = (geometry: string): CameraView => ({...(OPENING[geometry] ?? DEFAULT_CAMERA)});
/** Orthographic projection into screen coordinates; world +z points upward. */
export function projectCamera(v: Vec, yaw: number, pitch: number): { x: number; y: number } {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { x: cy * v.x + sy * v.y, y: sy * sp * v.x - cy * sp * v.y - cp * v.z };
}
export function clampCamera(view: CameraView): CameraView {
  const yaw = Number.isFinite(view.yaw) ? view.yaw : DEFAULT_CAMERA.yaw;
  const pitch = Number.isNaN(view.pitch) ? DEFAULT_CAMERA.pitch : view.pitch;
  const turn = 2 * Math.PI;
  return { yaw: ((yaw + Math.PI) % turn + turn) % turn - Math.PI, pitch: Math.max(.15, Math.min(1.3, pitch)) };
}
/** Radians of orbit per screen unit of pointer travel. */
export const ORBIT_RATE = .006;
/** Accumulates one pointer step. Dragging carries the near edge of the plane with the cursor:
 * rightward drag turns it right, downward drag lowers it back toward edge-on. */
export function orbitCamera(view: CameraView, dx: number, dy: number): CameraView {
  return clampCamera({ yaw: view.yaw + ORBIT_RATE * dx, pitch: view.pitch - ORBIT_RATE * dy });
}
/** Inverse of projectCamera along world z. The z axis projects to screen x = 0 for every yaw,
 * so the vertical rise alone recovers the distance: one unit of z rises cos(pitch) * scale. */
export function depthFromScreen(rise: number, scale: number, pitch: number): number {
  const perUnit = scale * Math.cos(pitch);
  return Math.abs(perUnit) < 1e-6 ? 0 : rise / perUnit;
}
/** Arrow keys orbit in fixed increments; Home restores the standard viewpoint. */
export function keyboardCamera(view: CameraView, key: string, home: CameraView = DEFAULT_CAMERA): CameraView {
  // Home returns to where THIS lesson opens, which is not the same angle for all of them.
  if (key === 'Home') return { ...home };
  const next = { ...view };
  if (key === 'ArrowLeft') next.yaw -= .12;
  if (key === 'ArrowRight') next.yaw += .12;
  if (key === 'ArrowUp') next.pitch += .08;
  if (key === 'ArrowDown') next.pitch -= .08;
  return clampCamera(next);
}
