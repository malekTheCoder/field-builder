import {describe, expect, it} from 'vitest';
import {REGISTRY} from '../src/distributions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {getProblem} from '../src/problems/definitions';
import {lessonFor} from '../src/lessons';
import {boardLines} from '../src/workbench/derivation';
import {limitPlot} from '../src/symbolic/physics';
import {readFileSync} from 'node:fs';
const assessment = readFileSync(new URL('../src/components/Assessment.tsx', import.meta.url), 'utf8');
import type {Question} from '../src/quiz/types';

const banks = import.meta.glob<{bank: Question[]}>('../src/quiz/bank/*.ts', {eager: true});
const questions = Object.values(banks).flatMap(b => b.bank ?? []);
const question = (id: string) => questions.find(q => q.id === id)!;
const plain = (v: unknown) => JSON.stringify(v).replaceAll('\u00a0', ' ');
const integrate = (f: (x: number) => number, a: number, b: number, n = 10000) => {
  const dx = (b - a) / n;
  return Array.from({length: n}, (_, i) => f(a + (i + .5) * dx) * dx).reduce((s, v) => s + v, 0);
};

/* These regressions couple authored explanations to independent signed examples. Formula-only
 * tests miss a correct solver whose feedback teaches the opposite inequality or wrong domain. */
describe('round seventeen: integral explanations respect signs, domains and approximation', () => {
  it('I17-1 assigns a representative charge to the unbounded outer cell, whose actual charge is infinite', () => {
    for (const id of ['infinite', 'semi', 'sheet'] as const) {
      expect(question(`${id}-dq`).prompt).toContain('representative');
      expect(plain(lessonFor(id))).toContain('unbounded charge');
    }
    for (const density of [-2, 2]) {
      const r = 3, da = Math.PI / 10, a = Math.PI / 2 - da, middle = a + da / 2;
      const dq = density * r / Math.cos(middle) ** 2 * da;
      const approximate = dq * Math.cos(middle) ** 2 / r ** 2;
      const exactMagnitude = 2 * Math.abs(density) / r * Math.sin(da / 2);
      expect(Math.abs(approximate) / exactMagnitude).toBeCloseTo(1, 2);
      expect(Math.abs(density * (1e8 - r * Math.tan(a)))).toBeGreaterThan(Math.abs(dq) * 1e6);
    }
  });

  it('I17-2 names the plotted potential magnitude and distinguishes it from the signed derivative', () => {
    for (const id of ['v-ring', 'v-disk'] as const) {
      const p = getProblem(id), limit = p.limits.find(l => l.mode === 'center')!, plot = limitPlot(p, limit);
      expect(assessment).toContain('the potential magnitude is');
      expect(plot.caption).toContain('signed V');
    }
    for (const q of [-5, 5]) {
      const V = (z: number) => q / Math.hypot(2, z), dz = 1e-5, z = 3;
      const E = q * z / (4 + z * z) ** 1.5;
      expect(-(V(z + dz) - V(z - dz)) / (2 * dz)).toBeCloseTo(E, 9);
      expect(Math.sign(-(Math.abs(V(z + dz)) - Math.abs(V(z - dz))) / (2 * dz))).toBe(1);
    }
    const p = getProblem('shell'), l = p.limits.find(l => l.mode === 'jump')!, plot = limitPlot(p, l);
    expect(assessment).toContain('smaller than |σ|/ε₀');
    expect(plot.y).toContain('|σ|');
  });

  it('I17-3 never calls a negative signed Coulomb expression a field size', () => {
    for (const id of ['v-ring-dv', 'v-rod-bisector-piece', 'v-arc-dv', 'shell-one-ring']) {
      expect(plain(question(id))).not.toMatch(/(?:That is|, the) (?:the )?size of (?:a |the )?(?:piece|point charge)’s field/);
    }
    expect(question('uneven-arc-compare').explanation).toContain('k|Q|');
    expect(question('offset-leftover').explanation).toContain('charge’s sign');
    expect(question('semi-what-cancels').explanation).toContain('$-\\Delta E\\sin\\alpha$');
    for (const q of [-5, 5]) {
      expect(Math.abs(-Math.PI * q / 16)).toBeGreaterThan(2 * Math.abs(q) / (4 * Math.PI));
      expect(Math.abs(q / 2 * Math.PI)).toBeGreaterThan(Math.abs(q / 2 * Math.PI / 2));
    }
  });

  it('I17-4 describes the magnitude of a varying density, not a false signed rise', () => {
    const ramp = plain(boardLines(getProblem('ramp'))), uneven = plain(boardLines(getProblem('uneven-arc')));
    expect(ramp).not.toContain('rising from zero');
    expect(uneven).toContain('magnitude falls to zero');
    expect(plain(question('ramp-far-ey'))).toContain('magnitude grows');
    for (const q of [-2, 2]) {
      expect(Math.abs(q)).toBeGreaterThan(Math.abs(q / 2));
      expect(Math.abs(q * Math.cos(Math.PI / 3))).toBeLessThan(Math.abs(q));
    }
  });

  it('I17-5 defines alpha geometrically at P, independent of the charge’s sign', () => {
    expect(getProblem('ring').setup).not.toContain('field’s angle');
    expect(plain(lessonFor('ring'))).toContain('downward');
    expect(plain(question('ring-projection'))).not.toContain('between the piece’s field');
    const R = 2, z = 3, alpha = Math.atan2(R, z);
    for (const q of [-5, 5]) {
      const signedField = q / (R * R + z * z);
      expect(signedField * Math.cos(alpha)).toBeCloseTo(q * z / (R * R + z * z) ** 1.5, 12);
    }
  });

  it('I17-6 accepts whole-vector addition and rejects adding unprojected magnitudes', () => {
    const q = question('infinite-what-survives');
    expect(plain(q)).not.toContain('Adding whole arrows');
    expect(q.choices.some(c => !c.correct && c.text?.includes('magnitudes'))).toBe(true);
    const a = {x: 3, y: 4}, b = {x: 3, y: -4};
    expect(Math.hypot(a.x + b.x, a.y + b.y)).toBe(6);
    expect(Math.hypot(a.x, a.y) + Math.hypot(b.x, b.y)).toBe(10);
  });

  it('I17-7 rejects negative radial bounds for their spurious cancellation, not double counting', () => {
    for (const id of ['disk-bounds', 'sheet-bounds']) {
      const q = question(id), wrong = q.choices.find(c => c.tex?.includes('_{-'))!;
      expect(wrong.why).toContain('cancel');
      expect(wrong.why).not.toContain('twice');
    }
    for (const sigma of [-5, 5]) {
      const f = (s: number) => 2 * Math.PI * sigma * 3 * s / (s * s + 9) ** 1.5;
      expect(integrate(f, -2, 2)).toBeCloseTo(0, 11);
      expect(Math.sign(integrate(f, 0, 2))).toBe(Math.sign(sigma));
      expect(integrate(a => sigma * Math.sin(a), -Math.PI / 2, Math.PI / 2)).toBeCloseTo(0, 11);
    }
  });

  it('I17-8 asks for a leading far-field law while acknowledging the actual zero limit', () => {
    for (const id of ['bisector', 'axial', 'ring', 'disk']) {
      const q = question(`${id}-far`);
      expect(q.prompt).toContain('leading');
      expect(q.choices.find(c => c.tex === '0')!.why).toContain('tends to zero');
    }
    for (const q of questions.filter(q => /-(near|centre|center)$/.test(q.id))) expect(q.prompt).not.toContain('far-field');
    for (const q of [-5, 5]) {
      const r = 1e6, E = q / (r * Math.hypot(2, r));
      expect(Math.abs(E)).toBeLessThan(1e-10);
      expect(E / (q / r ** 2)).toBeCloseTo(1, 10);
    }
  });

  it('I17-9 excludes the full circle from a direction question', () => {
    expect(question('arc-negative').prompt).toContain('not closed');
    expect(question('arc-bounds').choices.find(c => c.tex === String.raw`\int_{0}^{\varphi}\cdots\,d\theta`)!.why).toContain('full circle');
    for (const charge of [-5, 5]) {
      const E = REGISTRY.arc.quadrature({...DEFAULT_PARAMS, charge, phi: 2 * Math.PI}, 4000);
      expect(Math.hypot(E.x, E.y, E.z)).toBeLessThan(1e-12);
    }
  });

  it('I17-10 teaches equal and opposite components as the criterion for cancellation', () => {
    for (const id of ['endpoint-what-cancels', 'semi-what-cancels', 'offset-what-cancels']) {
      const text = question(id).explanation;
      expect(text).not.toContain('only against a mirror');
      expect(text).toContain('equal and opposite');
      if (id === 'endpoint-what-cancels') expect(text).toContain('would provide');
    }
    for (const q of [-5, 5]) {
      const a = 3;
      expect(q / a ** 2 - 4 * q / (2 * a) ** 2).toBe(0);
    }
  });
});

// Additional teaching steps, after the repair suite was green.
describe('round seventeen: make the physical setup explicit', () => {
  it('states that the sheet potential difference compares two points above the sheet', () => {
    const limit = getProblem('v-disk').limits.find(l => l.mode === 'infinite')!;
    expect(limit.explanation).toContain('between two points above the sheet');
    for (const sigma of [-5, 5]) {
      const R = 1e7, z1 = .5, z2 = 6;
      // k = 1: subtract finite-disk potentials before taking their infinite-radius limit.
      const deltaV = 2 * Math.PI * sigma * ((z2 * z2 - z1 * z1) / (Math.hypot(R, z2) + Math.hypot(R, z1)) - (z2 - z1));
      expect(deltaV / (-2 * Math.PI * sigma * (z2 - z1))).toBeCloseTo(1, 6);
    }
  });

  it('shows the surviving y integral before its evaluation for both one-sided rods', () => {
    for (const id of ['endpoint', 'ramp'] as const) {
      const section = lessonFor(id)!.sections.find(s => s.heading === 'Shrink them')!;
      const displays = section.body.filter(b => typeof b !== 'string').map(b => b.tex);
      expect(displays.some(t => t.startsWith('E_y=') && t.includes('\\int_0^L'))).toBe(true);
      for (const lambda of [-2, 2]) for (const L of [1, 8]) for (const r of [.5, 6]) {
        const numeric = integrate(y => -lambda * (id === 'ramp' ? y / L : 1) * y / (y * y + r * r) ** 1.5, 0, L);
        const exact = id === 'ramp'
          ? -lambda / L * (Math.asinh(L / r) - L / Math.hypot(L, r))
          : -lambda * (1 / r - 1 / Math.hypot(L, r));
        expect(numeric).toBeCloseTo(exact, 6);
      }
    }
  });

  it('gives potential its energy-per-charge meaning and SI units in the shared reference', () => {
    const laws = readFileSync(new URL('../src/components/Laws.tsx', import.meta.url), 'utf8');
    expect(laws).toContain('potential energy per unit test charge');
    expect(laws).toContain('volts (joules per coulomb)');
  });
});
