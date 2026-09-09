import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA, ORBIT_RATE, clampCamera, depthFromScreen, keyboardCamera, orbitCamera, projectCamera, type CameraView } from '../src/diagrams/camera';
const length = (v: {x: number; y: number}) => Math.hypot(v.x, v.y);
describe('orthographic camera', () => {
  it('maps a positive z displacement up and its negative down', () => {
    const above = projectCamera({x: 0, y: 0, z: 2}, -.5, .6);
    const below = projectCamera({x: 0, y: 0, z: -2}, -.5, .6);
    expect(above.x).toBe(0);expect(above.y).toBeCloseTo(-2 * Math.cos(.6), 14);
    expect(below.y).toBe(-above.y);
  });
  it('has orthogonal unit screen axes for every camera rotation', () => {
    for (const yaw of [-Math.PI, -.5, 0, .9, Math.PI]) for (const pitch of [.15, .6, 1.3]) {
      const axes = [{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}].map(v => projectCamera(v,yaw,pitch));
      expect(axes.reduce((sum,v) => sum+v.x*v.x,0)).toBeCloseTo(1,14);
      expect(axes.reduce((sum,v) => sum+v.y*v.y,0)).toBeCloseTo(1,14);
      expect(axes.reduce((sum,v) => sum+v.x*v.y,0)).toBeCloseTo(0,14);
    }
  });
  it('preserves lengths within the image plane and never expands 3D lengths', () => {
    const yaw = -.7, pitch = .8;
    const horizontal = {x:Math.cos(yaw),y:Math.sin(yaw),z:0};
    const vertical = {x:Math.sin(yaw)*Math.sin(pitch),y:-Math.cos(yaw)*Math.sin(pitch),z:-Math.cos(pitch)};
    expect(projectCamera(horizontal,yaw,pitch).x).toBeCloseTo(1,14);expect(projectCamera(horizontal,yaw,pitch).y).toBeCloseTo(0,14);
    expect(length(projectCamera(vertical,yaw,pitch))).toBeCloseTo(1,14);
    const diagonal={x:3*horizontal.x+4*vertical.x,y:3*horizontal.y+4*vertical.y,z:4*vertical.z};
    expect(length(projectCamera(diagonal,yaw,pitch))).toBeCloseTo(5,14);
    for(const v of [{x:1,y:2,z:3},{x:-4,y:2,z:1},{x:0,y:0,z:5}])expect(length(projectCamera(v,yaw,pitch))).toBeLessThanOrEqual(Math.hypot(v.x,v.y,v.z)+1e-14);
  });
  it('keeps the same view after complete yaw turns', () => {
    const v={x:2,y:-3,z:4};const a=projectCamera(v,.2,.6),b=projectCamera(v,.2+4*Math.PI,.6);
    expect(a.x).toBeCloseTo(b.x,13);expect(a.y).toBeCloseTo(b.y,13);
    expect(clampCamera({yaw:7*Math.PI,pitch:9})).toEqual({yaw:-Math.PI,pitch:1.3});
    expect(clampCamera({yaw:-7*Math.PI,pitch:-2})).toEqual({yaw:-Math.PI,pitch:.15});
  });
  it('moves in keyboard increments and clamps pitch at either end', () => {
    expect(keyboardCamera(DEFAULT_CAMERA,'ArrowRight').yaw).toBeCloseTo(-.38,14);
    expect(keyboardCamera(DEFAULT_CAMERA,'ArrowLeft').yaw).toBeCloseTo(-.62,14);
    expect(keyboardCamera(DEFAULT_CAMERA,'ArrowUp').pitch).toBeCloseTo(.68,14);
    expect(keyboardCamera(DEFAULT_CAMERA,'ArrowDown').pitch).toBeCloseTo(.52,14);
    expect(keyboardCamera({yaw:0,pitch:1.29},'ArrowUp').pitch).toBe(1.3);
    expect(keyboardCamera({yaw:0,pitch:.16},'ArrowDown').pitch).toBe(.15);
  });
  it('accumulates pointer drag and stops at the tilt limits', () => {
    let view: CameraView = { ...DEFAULT_CAMERA };
    for (let i = 0; i < 5; i++) view = orbitCamera(view, 10, 0);
    expect(view.yaw).toBeCloseTo(DEFAULT_CAMERA.yaw + 50 * ORBIT_RATE, 12);expect(view.pitch).toBe(DEFAULT_CAMERA.pitch);
    const input = { yaw: .2, pitch: .6 };
    expect(orbitCamera(input, 0, 400).pitch).toBe(.15);expect(orbitCamera(input, 0, -400).pitch).toBe(1.3);
    expect(orbitCamera(orbitCamera(input, 0, 400), 0, 60).pitch).toBe(.15);
    expect(input).toEqual({ yaw: .2, pitch: .6 });
    expect(orbitCamera({ yaw: 3.1, pitch: .6 }, 100, 0).yaw).toBeCloseTo(3.1 + 100 * ORBIT_RATE - 2 * Math.PI, 12);
  });
  it('carries the near edge of the plane with the cursor', () => {
    // The rim point closest to the camera sits straight above the origin; a drag must take it along.
    const rim = { x: Math.cos(DEFAULT_CAMERA.yaw + Math.PI / 2), y: Math.sin(DEFAULT_CAMERA.yaw + Math.PI / 2), z: 0 };
    const near = (v: CameraView) => projectCamera(rim, v.yaw, v.pitch), start = near(DEFAULT_CAMERA);
    expect(start.x).toBeCloseTo(0, 14);expect(start.y).toBeLessThan(0);
    expect(near(orbitCamera(DEFAULT_CAMERA, 40, 0)).x).toBeGreaterThan(start.x);
    expect(near(orbitCamera(DEFAULT_CAMERA, -40, 0)).x).toBeLessThan(start.x);
    expect(near(orbitCamera(DEFAULT_CAMERA, 0, 40)).y).toBeGreaterThan(start.y);
    expect(near(orbitCamera(DEFAULT_CAMERA, 0, -40)).y).toBeLessThan(start.y);
  });
  it('recovers a z distance from the screen rise at every tilt', () => {
    const origin = 296, unit = 42;
    for (const pitch of [.15, .4, .6, 1, 1.3]) for (const yaw of [-Math.PI, -.5, 0, 1.1]) for (const d of [.5, 2.35, 6]) {
      const screen = projectCamera({ x: 0, y: 0, z: d }, yaw, pitch);
      expect(Math.abs(screen.x)).toBe(0); // z never leaves the vertical, so the rise alone inverts the projection
      expect(depthFromScreen(origin - (origin + unit * screen.y), unit, pitch)).toBeCloseTo(d, 12);
    }
    expect(depthFromScreen(30, 0, .6)).toBe(0);expect(depthFromScreen(30, 42, Math.PI / 2)).toBe(0);
  });
  it('resets with Home without mutating the input or default', () => {
    const input={yaw:2,pitch:1};expect(keyboardCamera(input,'Home')).toEqual(DEFAULT_CAMERA);
    expect(input).toEqual({yaw:2,pitch:1});expect(DEFAULT_CAMERA).toEqual({yaw:-.5,pitch:.6});
    expect(keyboardCamera(DEFAULT_CAMERA,'Escape')).toEqual(DEFAULT_CAMERA);
  });
});
