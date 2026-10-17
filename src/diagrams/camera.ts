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
  arc: {yaw: -.42, pitch: .78}, 'uneven-arc': {yaw: -.42, pitch: .78}, bisector: {yaw: -.42, pitch: .82}, offset: {yaw: -.42, pitch: .82}, axial: {yaw: -.42, pitch: .82},
  endpoint: {yaw: -.42, pitch: .8}, ramp: {yaw: -.42, pitch: .8},
  infinite: {yaw: -.42, pitch: .82}, semi: {yaw: -.42, pitch: .82},
  // The three with P on an axis keep the shallower standard angle. Lower would show the field
  // standing off the face better, and it cannot go there: P and the z axis are the same vertical
  // line on screen, so below about pitch .6 the axis letter lands on P and the placer cannot move
  // it -- an axis letter that shifts stops naming its axis. Use the view cube's side faces to go
  // edge-on deliberately; that is what it is for.
  disk: {yaw: -.5, pitch: .6}, annulus: {yaw: -.5, pitch: .6}, sheet: {yaw: -.5, pitch: .6}, ring: {yaw: -.5, pitch: .6},
};
export const openingCamera = (geometry: string): CameraView => ({...(OPENING[geometry] ?? DEFAULT_CAMERA)});
/** Pixels per metre the ring, the disk and the sheet open at: the figure's `baseUnit` for the
 * three lessons drawn in perspective, before any zoom. */
export const SURFACE_UNIT = 42;
/** THE SAME, FITTED TO HOW HIGH P IS. At a fixed 42 per metre P rose 42·cos(pitch) units for every
 * metre it was lifted, so at z = 4.5 the arrows the run draws up from P sat on the stage's title and
 * at z = 6 P itself left the plot -- while the lower two thirds of the picture stood empty. Every
 * other lesson fits its scale to what it has to show; these three now do too: SURFACE_UNIT while P,
 * seen at `pitch`, stands no more than 125 units above O -- every height up to the default -- and
 * below that in steps of five, so a drag rescales the picture now and then, not continuously. */
export function surfaceUnit(height: number, pitch: number, radius = 0, below = 65): number {
  const fit = 125 / Math.max(.5, Math.abs(height) * Math.cos(pitch));
  const tall = fit >= SURFACE_UNIT ? SURFACE_UNIT : Math.floor(fit / 5) * 5;
  // AND TO HOW WIDE THE RING OR THE DISK IS. Fitted to P's height alone, a radius of four metres ran the rim's
  // near side off the bottom of the plot -- sin(pitch)·R below O, and O stands only `below` units above the
  // plot's foot -- clipped flat, its + marks sliced, the disk read as cut off; and across, past either side.
  // The scale comes down until the near rim stands inside the plot and the whole ring across it.
  if (!(radius > 0)) return Math.max(18, tall);
  const sin = Math.abs(Math.sin(pitch)), low = sin > 1e-6 ? below / (radius * sin) : Infinity, wide = 300 / radius;
  return Math.max(18, Math.min(tall, Math.floor(low / 5) * 5, Math.floor(wide / 5) * 5));
}
/** How far below P, on screen, the far edge of the sheet's chosen ring must stay. */
export const SHEET_CLEARANCE = 24;
/** WHICH RING OF THE SHEET TO TALK ABOUT: the largest one whose far edge, at the opening camera,
 * still lies clearly below P on the screen.
 *
 * Every lesson used to open on its fourth piece, and the run on the piece three quarters of the
 * way along. On the sheet that is the ring 54 to 72 degrees below P -- out to 9.2 m at z = 3 --
 * and in the opening view a flat ring of radius s rises sin(pitch)·s on the screen while P rises
 * cos(pitch)·z. So the ring's far edge ran straight through P, the line from P to it lay nearly
 * flat, and P looked as if it sat IN the sheet: in the one lesson whose whole argument is that
 * lifting P off the sheet changes nothing.
 *
 * The camera cannot simply go lower (see OPENING). The ring can come in: the sheet is cut at equal
 * angles from P, so a ring is an angle, and the angle whose far edge stays below P does not depend
 * on how far P is lifted -- only, a little, on the margin. At the default height and five pieces it
 * is the ring 18 to 36 degrees below P. */
export function sheetPiece(count: number, height: number, unit?: number, view: CameraView = openingCamera('sheet'), clear = SHEET_CLEARANCE): number {
  const n = Math.max(1, Math.round(count)), z = Math.abs(height), scale = unit ?? surfaceUnit(height, view.pitch);
  const room = Math.cos(view.pitch) * z * scale - clear;
  let best = 0;
  for (let i = 0; i < n; i++) {
    // The same cut the sampler makes: s = z tan(pi t / 2), held short of the right angle.
    const outer = z * Math.tan(Math.PI / 2 * Math.min(.999, (i + 1) / n));
    if (Math.sin(view.pitch) * outer * scale <= room) best = i; else break;
  }
  return best;
}
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
