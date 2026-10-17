import {describe, expect, it} from 'vitest';
import {densityFace} from '../src/gauss/densityFace';
import {density, qencFraction} from '../src/gauss/instruments';

describe('graded-ball cut faces show local density, not shell charge or projected thickness', () => {
  for (const kind of ['rising', 'falling'] as const) for (const radius of [.4, 1.1, 2.3]) {
    it(`${kind} at R=${radius} samples the same normalized density at every true radial vertex`, () => {
      const azimuth = -.7, face = densityFace(kind, radius, azimuth);
      const peak = density(kind, kind === 'rising' ? 1 : 0);
      expect(face.positions.length).toBe(face.weights.length * 3);
      for (let i = 0; i < face.weights.length; i++) {
        const [x, y, z] = face.positions.slice(i * 3, i * 3 + 3), r = Math.hypot(x, y, z);
        expect(r).toBeLessThanOrEqual(radius + 1e-12);
        expect(x * Math.sin(azimuth) - y * Math.cos(azimuth)).toBeCloseTo(0, 12);
        expect(face.weights[i]).toBeCloseTo(Math.abs(density(kind, Math.min(1, r / radius))) / peak, 12);
        expect(face.weights[i]).toBeGreaterThanOrEqual(0);
        expect(face.weights[i]).toBeLessThanOrEqual(1);
      }
      expect(face.weights[0]).toBe(kind === 'rising' ? 0 : 1);
      expect(face.weights.at(-1)).toBe(kind === 'rising' ? 1 : 0);
      expect(face.indices.every(index => index >= 0 && index < face.weights.length)).toBe(true);
      // Recover enclosed charge by putting shell area back, for either sign and at both interior/exterior limits.
      for (const sign of [1, -1]) for (const r of [.2, .6, 1, 1.4]) {
        const top = Math.min(r, 1), n = 2000, h = top / n;
        let charge = 0;
        for (let j = 0; j < n; j++) {
          const x = (j + .5) * h;
          charge += sign * density(kind, x) * 4 * Math.PI * x * x * h;
        }
        expect(charge).toBeCloseTo(sign * qencFraction(kind, r), 6);
      }
    });
  }
});
