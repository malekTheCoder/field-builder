import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {getProblem} from '../src/problems/definitions';
import {lessonFor} from '../src/lessons';
import {boardLines} from '../src/workbench/derivation';
import {buildStages} from '../src/explorer/buildRun';
import type {Question} from '../src/quiz/types';
const banks = import.meta.glob<{bank: Question[]}>('../src/quiz/bank/*.ts', {eager: true});
const questions = Object.values(banks).flatMap(b => b.bank ?? []);
const question = (id: string) => questions.find(q => q.id === id)!;
const plain = (v: unknown) => JSON.stringify(v).replaceAll('\u00a0', ' ');

/* These are transfer claims, so check the counterexample as well as the actual authored surface.
 * Exact model answers alone cannot reject a false universal rule in otherwise correct feedback. */
describe('round nineteen: integral teaching preserves its conditions', () => {
  it('I19-1 scopes the far inverse-square rule to a nonzero total charge', () => {
    for (const id of ['bisector', 'axial', 'disk', 'endpoint', 'offset', 'annulus', 'ring']) {
      const q = plain(question(`${id}-far`));
      expect(q, id).not.toMatch(/any finite charge|A finite charge’s field|A field from a finite charge/);
      expect(q, id).toMatch(/nonzero|this (?:rod|disk|ring|annulus)/i);
    }
    const caption = readFileSync(new URL('../src/components/Assessment.tsx', import.meta.url), 'utf8');
    expect(caption).not.toContain('as any charge’s field is from far off');
    expect(caption).toContain('nonzero total charge');
    for (const sign of [-1, 1]) {
      const dipole = (r: number) => sign * (1 / (r - 1) ** 2 - 1 / (r + 1) ** 2);
      expect(dipole(10000) / dipole(20000)).toBeCloseTo(8, 6);
      expect(Math.sign(dipole(10000))).toBe(sign);
    }
  });
  it('I19-2 names the dimensionless annulus factor, not the reciprocal-distance term', () => {
    const q = question('annulus-no-hole');
    expect(q.explanation).toContain('factor');
    expect(q.explanation).not.toContain('first term');
    expect(question('annulus-result').choices.find(c => c.correct)!.tex).toContain('\\frac{1}{\\sqrt{a^2+z^2}}');
    const a = 0, z = 2;
    expect(1 / Math.hypot(a, z)).toBe(.5);
    expect(z / Math.hypot(a, z)).toBe(1);
  });
  it('I19-3 keeps the offset sum on the axis when no unpaired stretch remains', () => {
    const p = getProblem('offset'), stage = buildStages(p).find(s => s.key === 'add')!;
    expect(stage.prose).toContain('any unpaired');
    expect(stage.caption).toContain('h = 0');
    expect(plain(boardLines(p))).toContain('$h=0$');
    expect(plain(lessonFor('offset')!.sections.find(s => s.heading === 'Add them up'))).toContain('$h=0$');
    for (const q of [-5, 5]) {
      let ey = 0; const L = 4, r = 3, n = 10000;
      for (let i = 0; i < n; i++) {const y = -L / 2 + (i + .5) * L / n; ey += -q / n * y / (r * r + y * y) ** 1.5;}
      expect(Math.abs(ey)).toBeLessThan(1e-14);
    }
  });
  it('I19-4 teaches the component method without excluding an independent direction argument', () => {
    const q = question('endpoint-own-integral');
    expect(q.prompt).toContain('arbitrary piece');
    expect(q.explanation).not.toContain('Neither sum can be read off');
    expect(q.explanation).toContain('Here we');
    expect(lessonFor('endpoint')!.lead).not.toContain('each need an integral');
    for (const charge of [-5, 5]) for (const [r, L] of [[3, 4], [.5, 8], [6, 1]]) {
      let ex = 0, ey = 0; const n = 20000;
      for (let i = 0; i < n; i++) {const y = (i + .5) * L / n, f = charge / n / (r * r + y * y) ** 1.5; ex += f * r; ey -= f * y;}
      expect(ey / ex).toBeCloseTo(-Math.tan(Math.atan(L / r) / 2), 7);
    }
  });
  it('I19-5 distinguishes the growing axial near-field magnitude from its sign', () => {
    const near = getProblem('axial').limits.find(l => l.id === 'near')!;
    expect(near.explanation).toContain('magnitude grows');
    expect(near.explanation).not.toContain('kλ/a grows without');
    expect(near.explanation).not.toContain('It grows as');
    for (const lambda of [-1, 1]) {
      const values = [1, .1, .01].map(a => lambda * (1 / a - 1 / (4 + a)));
      expect(Math.abs(values[2])).toBeGreaterThan(Math.abs(values[1]));
      expect(Math.sign(values[2])).toBe(Math.sign(lambda));
      expect(values[2] / (lambda / .01)).toBeCloseTo(1, 2);
    }
  });
});


// An energy application is useful only if it keeps source and test charge distinct.
it('uses the ring potential for signed test-charge energy changes at a fixed source', () => {
  const meaning = plain(lessonFor('v-ring')!.sections.find(s => s.heading === 'What the answer says'));
  expect(meaning).toContain('small test charge');
  expect(meaning).toContain('charge $Q$ fixed');
  expect(meaning).toContain('while leaving $V$ unchanged');
  const R = 2, n = 12000;
  for (const Q of [-5, 5]) for (const probe of [-.2, .2]) for (const [za, zb] of [[.5, 3], [3, .5]]) {
    const V = (z: number) => Q / Math.hypot(R, z);
    const energy = probe * (V(zb) - V(za));
    // Integrate the force's work along the axis independently, with k set to one.
    let work = 0; const dz = (zb - za) / n;
    for (let i = 0; i < n; i++) { const z = za + (i + .5) * dz; work += probe * Q * z / (R * R + z * z) ** 1.5 * dz; }
    expect(energy).toBeCloseTo(-work, 8);
    expect(Math.sign(energy)).toBe(-Math.sign(Q * probe * (zb - za)));
    expect(-probe * (V(zb) - V(za))).toBe(-energy);
  }
});
