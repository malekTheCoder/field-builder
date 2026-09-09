import type { Vec } from '../symbolic/physics';
export type CameraView = { yaw: number; pitch: number };
export const DEFAULT_CAMERA: Readonly<CameraView> = Object.freeze({ yaw: -.5, pitch: .6 });
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
export function keyboardCamera(view: CameraView, key: string): CameraView {
  if (key === 'Home') return { ...DEFAULT_CAMERA };
  const next = { ...view };
  if (key === 'ArrowLeft') next.yaw -= .12;
  if (key === 'ArrowRight') next.yaw += .12;
  if (key === 'ArrowUp') next.pitch += .08;
  if (key === 'ArrowDown') next.pitch -= .08;
  return clampCamera(next);
}
