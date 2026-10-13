import {describe, expect, it} from 'vitest';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {limitPlot} from '../src/symbolic/physics';
/* ONE WORD FOR ONE THING, AND NAMES IN ONE PATTERN.
 *
 * The run, the board and the tour cut the charge into pieces; "Easy to confuse with" and the limiting
 * cases then spoke of elements and slices, one note using both for the same thing, and headed a row
 * "Projection factor", a name the board never uses. The disk's potential promised "rings of potential",
 * and its back-derivation asserted E_z = −dV/dz with no reason. And "Finite line" was the one rod lesson
 * whose name did not say where P is. */
const lessons = [...PROBLEMS, getProblem('infinite', 'limit')];
/** Everything a lesson shows in words: its subtitle and setup, its notes, its limits and their plots. */
const shown = (id: string) => {
  const p = lessons.find(q => q.id === id)!;
  return [p.subtitle, p.setup,
    ...p.steps.flatMap(s => [...(s.worked ?? []).map(w => w.text), ...(s.fields ?? []).flatMap(f => [f.label, ...(f.mistakes ?? []).map(m => m.message)])]),
    ...p.limits.flatMap(l => [l.title, l.prompt, l.explanation, limitPlot(p, l).caption])];
};
describe('one word for one thing', () => {
  it('a piece is a piece: no element, no slice, in anything a lesson shows', () => {
    for (const p of lessons) for (const text of shown(p.id)) expect(text, p.id).not.toMatch(/\belements?\b|\bslices?\b|element’s/i);
  });
  it('the factor is named as the board names it', () => {
    for (const p of lessons) for (const s of p.steps) for (const f of s.fields ?? []) {
      expect(f.label, `${p.id}/${f.id}`).not.toMatch(/Projection/);
      if (f.id === 'projection' && p.id !== 'axial') expect(f.label, `${p.id}`).toMatch(/^The (y )?factor cos [αθ]$/);
    }
    expect(getProblem('bisector').steps.flatMap(s => s.fields ?? []).find(f => f.id === 'dq')!.label).toBe('A piece’s charge dQ');
    expect(getProblem('bisector').steps.flatMap(s => s.fields ?? []).find(f => f.id === 'distance')!.label).toBe('Piece-to-P distance rᵢ');
  });
});
describe('the disk’s potential', () => {
  it('is of rings of charge, and its field is minus V’s slope for a reason said', () => {
    const v = getProblem('v-disk');
    expect(v.subtitle).toMatch(/potentials of concentric rings of charge/);
    expect(v.subtitle).not.toMatch(/rings of potential/);
    const back = v.steps.find(s => s.kind === 'gradient')!.worked!;
    expect(back.at(-1)!.text).toMatch(/E_z=-dV\/dz/);
    expect(back.at(-1)!.text).toMatch(/points the way \$V\$ falls fastest/);
  });
});
describe('the lessons’ names in one pattern', () => {
  it('every rod says where P is; a rod’s potential is its name with “· potential”', () => {
    for (const id of ['bisector', 'axial', 'endpoint', 'ramp']) expect(getProblem(id).short, id).toMatch(/^Line · /);
    expect(getProblem('bisector').short).toBe('Line · beside its middle');
    expect(getProblem('v-rod-bisector').short).toBe(`${getProblem('bisector').short} · potential`);
    expect(getProblem('v-rod-axial').short).toBe(`${getProblem('axial').short} · potential`);
    for (const p of PROBLEMS.filter(q => q.quantity === 'V')) expect(p.short, p.id).toMatch(/ · potential$/);
  });
});
