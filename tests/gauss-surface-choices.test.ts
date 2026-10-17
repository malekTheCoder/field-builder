import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {SURFACE_CHOICES} from '../src/gauss/surfaceChoices';

const dot = (a: number[], b: number[]) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const length = (a: number[]) => Math.hypot(...a);
const ball = (p: number[], q: number) => p.map(x => q * x / length(p) ** 3);
const line = (p: number[], lambda: number) => [2 * lambda * p[0] / (p[0] ** 2 + p[1] ** 2), 2 * lambda * p[1] / (p[0] ** 2 + p[1] ** 2), 0];
const parallel = (a: number[], b: number[]) => Math.abs(dot(a, b)) / (length(a) * length(b));
/* Independent field formulas use k=1, hence epsilon_0=1/(4 pi). Equal-area sphere samples and cylindrical
 * wall samples check the flux reductions for signed sources; they do not call the lesson's field helpers. */
describe('choosing surfaces from symmetry', () => {
  it('offers one direct reduction per symmetry, with valid TeX and no numeric prose', () => {
    for (const choices of Object.values(SURFACE_CHOICES)) {
      expect(choices).toHaveLength(3);
      expect(choices.filter(c => c.tex)).toHaveLength(1);
      for (const c of choices) {
        const prose = c.label + c.description + c.reason.replace(/\$[^$]+\$/g, '');
        expect(prose).not.toMatch(/[\d—]/);
        for (const math of [c.tex, ...[...c.reason.matchAll(/\$([^$]+)\$/g)].map(m => m[1])]) if (math) expect(() => katex.renderToString(math, {throwOnError: true})).not.toThrow();
      }
    }
  });
  for (const sign of [1, -1]) {
    it(`concentric sphere has one signed normal field and the correct flux (${sign})`, () => {
      const r = 1.7, count = 80 * 120;
      let flux = 0;
      for (let i = 0; i < 80; i++) for (let j = 0; j < 120; j++) {
        const z = -1 + 2 * (i + .5) / 80, phi = 2 * Math.PI * (j + .5) / 120;
        const n = [Math.sqrt(1 - z * z) * Math.cos(phi), Math.sqrt(1 - z * z) * Math.sin(phi), z];
        const field = ball(n.map(x => r * x), sign);
        expect(dot(field, n)).toBeCloseTo(sign / r ** 2, 12);
        flux += dot(field, n) * 4 * Math.PI * r ** 2 / count;
      }
      expect(flux).toBeCloseTo(4 * Math.PI * sign, 10);
    });
    it(`coaxial cylinder has wall flux and zero cap flux (${sign})`, () => {
      const r = 1.3, L = 2.1;
      let wall = 0;
      for (let j = 0; j < 120; j++) {
        const theta = 2 * Math.PI * (j + .5) / 120, n = [Math.cos(theta), Math.sin(theta), 0];
        const field = line(n.map(x => r * x), sign);
        wall += dot(field, n) * 2 * Math.PI * r * L / 120;
        expect(dot(line([r * .6, r * .2, L / 2], sign), [0, 0, 1])).toBe(0);
        expect(dot(line([r * .6, r * .2, -L / 2], sign), [0, 0, -1])).toBe(0);
      }
      expect(wall).toBeCloseTo(4 * Math.PI * sign * L, 10);
    });
    it(`straddling sheet faces add; same-side faces cancel despite nonzero E (${sign})`, () => {
      const A = 1.7, above = [0, 0, 2 * Math.PI * sign], below = [0, 0, -2 * Math.PI * sign];
      const across = A * (dot(above, [0, 0, 1]) + dot(below, [0, 0, -1]));
      expect(across).toBeCloseTo(4 * Math.PI * sign * A, 12);
      expect(A * (dot(above, [0, 0, 1]) + dot(above, [0, 0, -1]))).toBe(0);
      expect(length(above)).toBeGreaterThan(0);
    });
  }
  it('the offset sphere and cube do not have one normal field value', () => {
    const offsetNear = ball([.8, 0, 0], 1), offsetFar = ball([-1.6, 0, 0], 1);
    expect(dot(offsetNear, [1, 0, 0])).not.toBeCloseTo(dot(offsetFar, [-1, 0, 0]), 3);
    expect(dot(ball([1, 0, 0], 1), [1, 0, 0])).not.toBeCloseTo(dot(ball([1, .8, 0], 1), [1, 0, 0]), 3);
  });
  it('a sphere on a line has varying field magnitude even though its actual normal component is constant', () => {
    const equator = [1, 0, 0], latitude = [.6, 0, .8];
    expect(length(line(equator, 1))).not.toBeCloseTo(length(line(latitude, 1)), 3);
    expect(parallel(line(latitude, 1), latitude)).toBeLessThan(.9);
    expect(dot(line(equator, 1), equator)).toBeCloseTo(dot(line(latitude, 1), latitude), 12);
    expect(SURFACE_CHOICES.line.find(c => c.id === 'line-sphere')!.reason).toContain('Symmetry alone');
  });
  it('offset cylinder wall fields vary and need not align with the wall normal', () => {
    expect(length(line([1.4, 0, 0], 1))).not.toBeCloseTo(length(line([-.6, 0, 0], 1)), 3);
    expect(parallel(line([.4, 1, 0], 1), [0, 1, 0])).toBeLessThan(.95);
  });
});
