import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {MISCONCEPTIONS} from '../src/quiz/misconceptions';
import {getProblem} from '../src/problems/definitions';
import {boardLines} from '../src/workbench/derivation';
import {lessonFor} from '../src/lessons';
import {buildStages} from '../src/explorer/buildRun';
import type {Question} from '../src/quiz/types';
const banks = import.meta.glob<{bank: Question[]}>('../src/quiz/bank/*.ts', {eager: true});
const questions = Object.values(banks).flatMap(b => b.bank ?? []);
const question = (id: string) => questions.find(q => q.id === id)!;
const idea = (id: string) => MISCONCEPTIONS.find(m => m.id === id)!.idea;
const plain = (v: unknown) => JSON.stringify(v).replaceAll('\u00a0', ' ');
const laws = readFileSync(new URL('../src/components/Laws.tsx', import.meta.url), 'utf8');
/* Formula solvers alone cannot catch a recap that teaches the wrong condition. Independent
 * counterexamples keep each prose contract tied to the physical reason it was changed. */
describe('round eighteen: shared integral teaching has the same scope as its equations', () => {
  it('I18-1 weights charge by its density and measure, not just interval length', () => {
    expect(idea('bounds')).not.toContain('Half the bounds gives half the charge');
    expect(idea('bounds')).toContain('equal mirror contributions');
    for (const q of [-5, 5]) {
      expect((q * .5 ** 2) / q).toBe(.25); // disk area, and ramp integral
      expect(2 * q * .5 ** 2).not.toBe(q);
    }
  });
  it('I18-2 bounds sheet magnitudes and makes negative charge reverse the half-line direction', () => {
    expect(plain(boardLines(getProblem('sheet')))).toContain('k|\\\\sigma|');
    expect(plain(question('semi-add-mirror'))).toContain('positive');
    expect(idea('sheet-double')).toContain('negative');
    expect(getProblem('ramp').subtitle).not.toContain('grows from zero');
    for (const sigma of [-5, 5]) {
      const term = 2 * Math.PI * sigma * Math.sin(Math.PI / 6) * .1;
      expect(Math.abs(term)).toBeLessThan(2 * Math.PI * Math.abs(sigma) * .1);
      expect(Math.sign(sigma / 3)).toBe(Math.sign(sigma));
    }
  });
  it('I18-3 diagnoses missing normalization rather than assigning a whole Q to every differential', () => {
    for (const id of ['ring-dq', 'arc-dq', 'v-arc-dv', 'axial-integral', 'bisector-dq']) {
      expect(plain(question(id))).not.toMatch(/(?:puts|gives).*(?:whole (?:rod|ring|arc)’s charge (?:in|to) every piece|each piece the whole|every piece the whole)/);
    }
    expect(plain(getProblem('bisector'))).not.toContain('Q dy would put the whole rod');
    for (const q of [-5, 5]) {
      const dtheta = .1, phi = Math.PI;
      expect(q * dtheta).not.toBe(q);
      expect(q / phi * dtheta).not.toBe(q * dtheta);
    }
  });
  it('I18-4 uses equal and opposite components, with mirrors as a sufficient construction', () => {
    expect(idea('cancel-survivor').toLowerCase()).toContain('equal and opposite');
    expect(idea('cancel-survivor')).not.toContain('only in pairs');
    for (const id of ['endpoint', 'ramp'] as const) {
      expect(plain(boardLines(getProblem(id)))).not.toContain('Cancellation needs a symmetry');
      expect(plain(buildStages(getProblem(id)))).not.toContain('Cancellation is a gift of symmetry');
    }
    for (const q of [-5, 5]) expect(q / 2 ** 2 - 4 * q / 4 ** 2).toBe(0);
  });
  it('I18-5 distinguishes exact superposition, exact coarse sums and unbounded representatives', () => {
    expect(laws).toContain('representative');
    expect(laws).toContain('exact at any cut');
    expect(laws).not.toContain('Every lesson makes the same three moves');
    expect(laws).toContain('Gauss');
    const q = -5, R = 2, z = 3, n = 8;
    const coarse = Array.from({length: n}, () => q / n * z / (R * R + z * z) ** 1.5).reduce((a, b) => a + b, 0);
    expect(coarse).toBeCloseTo(q * z / (R * R + z * z) ** 1.5, 14);
  });
  it('I18-6 limits the decreasing equal-width disk-ring argument to the far rim', () => {
    expect(idea('endless-field')).toContain('far rim');
    const kernel = (s: number) => s / (s * s + 1) ** 1.5;
    expect(kernel(.2)).toBeGreaterThan(kernel(.1));
    expect(kernel(20)).toBeLessThan(kernel(10));
  });
  it('I18-7 allows V/r for a reciprocal-distance potential, including an extended shell exterior', () => {
    for (const id of ['v-rod-bisector-gradient', 'v-rod-axial-gradient']) {
      expect(plain(question(id))).not.toMatch(/only for (?:a |one |a single )?point charge/);
      expect(plain(question(id))).toContain('1/r');
    }
    for (const q of [-5, 5]) { const r = 3; expect((q / r) / r).toBeCloseTo(q / r ** 2, 14); }
  });
  it('I18-8 does not guarantee a nonzero radial component everywhere off a ring axis', () => {
    const q = question('v-ring-off-axis');
    expect(plain(q)).not.toContain('the field has a sideways part');
    expect(plain(q)).toContain('can have');
    const rho = .6688515417414969, z = .5, n = 32768;
    let er = 0, ez = 0;
    for (let i = 0; i < n; i++) { const t = (i + .5) * 2 * Math.PI / n, dx = rho - Math.cos(t), d2 = dx * dx + Math.sin(t) ** 2 + z * z; er += dx / d2 ** 1.5 / n; ez += z / d2 ** 1.5 / n; }
    expect(Math.abs(er)).toBeLessThan(1e-12); expect(ez).toBeGreaterThan(.5);
  });
  it('I18-9 qualifies the leading monopole term for nonzero total charge', () => {
    expect(idea('far-limit')).toContain('nonzero total');
    expect(idea('far-limit')).toContain('neutral');
    const dipole = (r: number) => 1 / (r - 1) ** 2 - 1 / (r + 1) ** 2;
    expect(dipole(10)).toBeGreaterThan(0);
    expect(dipole(10000) / dipole(20000)).toBeCloseTo(8, 6);
  });
});

// Transfer checks: the two additions teach how to build the next integral, not a new formula to memorise.
describe('round eighteen: transferable integral setup', () => {
  it('normalizes a weighted charge element before computing a field', () => {
    expect(laws).toContain('Q=\\int_{\\text{source}}dQ');
    expect(laws).toContain('weight each length by its local density');
    const L = 3, n = 1000, dy = L / n;
    for (const rho of [-5, 5]) {
      let total = 0; for (let i = 0; i < n; i++) total += rho * (i + .5) * dy / L * dy;
      expect(total).toBeCloseTo(rho * L / 2, 12);
    }
  });
  it('explains why an exact coarse sum is still a useful integral setup', () => {
    for (const id of ['ring', 'v-ring', 'v-arc'] as const) {
      const shrink = lessonFor(id)!.sections.find(s => s.heading === 'Shrink them')!;
      expect(plain(shrink)).toMatch(/integral|Integrating/); expect(plain(shrink)).toContain('$dQ');
      expect(plain(shrink)).toMatch(/varies|vary|changes from ring/);
    }
  });
});
