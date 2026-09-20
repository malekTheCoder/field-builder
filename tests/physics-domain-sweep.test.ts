import {describe, expect, it} from 'vitest';
import {REGISTRY, type ProblemId} from '../src/distributions';
import type {Params} from '../src/problems/types';
/* EVERY CLOSED FORM, EVERYWHERE A READER CAN GO.
 *
 * The other physics files check the formulas at a handful of parameter values. This one walks the
 * whole domain the sliders can actually reach -- distance 0.5 to 6, length 1 to 8 (radius 0.5 to
 * 4), charge negative, tiny and large, and for the arc every opening angle from a sliver to the
 * closed circle -- because a formula that is right at r = 3, L = 4 can still lose its digits at
 * the corners, which is exactly what the cancellation faults in the rod formulas did.
 *
 * THE TEST IS NOT A TOLERANCE. Picking one would mean picking it per lesson, and the number that
 * passes today is the number that hides tomorrow's fault. Instead each closed form has to be the
 * LIMIT its own quadrature is heading for: the gap between them must SHRINK when the quadrature
 * is refined. A correct formula's residual falls with n; a wrong one's flattens out at whatever
 * it is wrong by, however fine the sum gets. That distinction is what is asserted here, so the
 * check needs no per-lesson bar and cannot be tuned into silence.
 *
 * It also keeps the two families honest about how differently they converge. A ring or a rod is
 * summed term by term and is at machine precision by n = 2000 -- the ring is in fact exact at any
 * n, since every point of it is the same distance from a point on its axis, so its "gap" is only
 * the rounding of the sum and GROWS slowly as more terms are added. A surface is summed as rings
 * of points, and `surfaceQuadrature` takes max(100, floor(sqrt(n))) of them by 160 around: n has
 * to go up FOUR-fold, and be past ten thousand, before the partition refines at all. Feeding it
 * 2000 and 8000 would compare a sum with itself and prove nothing, which is how the first draft
 * of this test managed to fail on every disk setting at once. The pairs below are chosen so each
 * family genuinely doubles its resolution.
 *
 * ITS TEETH ARE CHECKED HERE, by the last test in the file, which bends each family's formula by
 * a known amount and requires this same criterion to reject it. That used to be a comment saying
 * the mutation had been run by hand; a comment guarantees nothing.
 *
 * One consequence of the criterion is worth stating, because it reads like a hole and is not one.
 * A ring's sum is exact at every n, so when its formula is RIGHT the gap sits at rounding, below
 * the floor, and the shrink test never runs. That is not the ring going unchecked: bend the ring's
 * formula and the gap rises above the floor, and then it must shrink -- which an exact quadrature
 * can never make it do. Measured: 1 + 1e-9 on the ring fails this file. */
const near = (v: {x: number; y: number; z: number}) => Math.hypot(v.x, v.y, v.z);
const gap = (a: {x: number; y: number; z: number}, b: {x: number; y: number; z: number}) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const BASE: Params = {distance: 3, size: 4, charge: 2, phi: Math.PI, element: .65, slices: 5, continuum: 0};
type Field = (p: Params) => {x: number; y: number; z: number};
/** The rule itself, in one place, so the mutation test at the end can apply it unchanged to a
 * formula that is deliberately wrong. Returns the settings at which the formula is NOT what the
 * quadrature is converging to. */
function stalledSettings(id: ProblemId, field: Field): string[] {
  const d = REGISTRY[id], [n1, n2] = refinement(id), points = domain(id);
  const coarse = points.map(({p}) => d.quadrature(p, n1));
  const typical = Math.max(...coarse.map(near), 1e-30);
  const out: string[] = [];
  points.forEach(({p, at}, i) => {
    const fine = d.quadrature(p, n2), closed = field(p);
    if (near(fine) < 1e-9 * typical) {
      if (near(closed) > 1e-6 * typical) out.push(`${at}: quadrature says zero, the formula does not`);
      return;
    }
    const wide = gap(closed, coarse[i]), tight = gap(closed, fine);
    if (tight > FLOOR * near(fine) && tight > wide * .75)
      out.push(`${at}: gap ${wide.toExponential(2)} at n=${n1} and ${tight.toExponential(2)} at n=${n2}, relative ${(tight / near(fine)).toExponential(2)}`);
  });
  return out;
}
/** The reachable domain: exactly what the sliders in `Explorer.tsx` allow, corners included. */
const DISTANCE = [.5, .75, 1, 2, 3, 4.5, 6];
const SIZE = [1, 2, 4, 6, 8];
const CHARGE = [2, -5, .1];
const PHI = [.1 * Math.PI, Math.PI, 1.5 * Math.PI, 2 * Math.PI];
function domain(id: ProblemId): {p: Params; at: string}[] {
  const angled = id === 'arc' || id === 'v-arc';
  const out: {p: Params; at: string}[] = [];
  for (const distance of DISTANCE) for (const size of SIZE) for (const charge of CHARGE)
    for (const phi of angled ? PHI : [Math.PI])
      out.push({p: {...BASE, distance, size, charge, phi}, at: `r=${distance} L=${size} q=${charge}${angled ? ` phi=${(phi / Math.PI).toFixed(2)}pi` : ''}`});
  return out;
}
/** Two element counts that really are a refinement for this geometry, coarse then fine. */
const refinement = (id: ProblemId): [number, number] =>
  id === 'disk' || id === 'sheet' || id === 'v-disk' ? [40000, 160000] : [2000, 8000];
/** Where doubles stop being able to tell the closed form and the sum apart. Above the ring's
 * accumulated rounding at the counts used here, and far below any real disagreement. */
const FLOOR = 1e-11;
describe('every closed form is the limit of its own quadrature, everywhere the sliders reach', () => {
  for (const id of Object.keys(REGISTRY) as ProblemId[]) {
    const d = REGISTRY[id];
    it(`${id}: refining the sum closes the gap to the printed field`, () => {
      const stalled = stalledSettings(id, p => d.field(p));
      expect(stalled, `${id}: the gap to the quadrature stops shrinking at ${stalled.length} of ${domain(id).length} settings, so the formula is not what the sum converges to`).toEqual([]);
    }, 60000);
    if (d.potential) {
      it(`${id}: refining the sum closes the gap to the printed potential`, () => {
        const sum = (p: Params, n: number) => d.sample(p, n).reduce((a, s) => a + s.potential, 0);
        const stalled: string[] = [];
        for (const {p, at} of domain(id)) {
          const coarse = sum(p, 1000), fine = sum(p, 4000), closed = d.potential!(p);
          if (!Number.isFinite(fine) || Math.abs(fine) < 1e-30) continue;
          const wide = Math.abs(closed - coarse), tight = Math.abs(closed - fine);
          if (tight > FLOOR * Math.abs(fine) && tight > wide * .75)
            stalled.push(`${at}: gap ${wide.toExponential(2)} at n=1000 and ${tight.toExponential(2)} at n=4000`);
        }
        expect(stalled, `${id}: the gap to the summed potential stops shrinking at ${stalled.length} settings`).toEqual([]);
      }, 60000);
    }
  }
});
/** The smallest bend in each formula this file actually catches, measured by running the rule
 * above against a deliberately wrong formula and halving until it slips through.
 *
 * They differ by a hundredfold and the reason is the REFERENCE, not the formula. A bend smaller
 * than the quadrature's own residual hides inside it, so the resolving power is set by how well
 * each geometry's sum converges: a ring is exact and resolves a part in a billion, while a sheet
 * is summed as rings of points converging as 1/n and resolves five parts in a million. Writing
 * one number for all fifteen would have been a comfortable lie -- and was my first draft, which
 * claimed 1e-9 everywhere and was caught here by the axial and ramp rods refusing to fail. */
const RESOLVES: Record<string, number> = {
  bisector: 1e-9, ring: 1e-9, arc: 1e-9, endpoint: 1e-9, 'v-ring': 1e-9, 'v-arc': 1e-9, 'v-rod-bisector': 1e-9,
  axial: 1e-8, ramp: 1e-8, 'v-rod-axial': 1e-8,
  semi: 3e-8, infinite: 1e-7, disk: 1e-7, 'v-disk': 1e-7,
  sheet: 5e-6,
};
describe('and the rule above has teeth, checked rather than asserted', () => {
  // The same criterion, applied to formulas that are deliberately wrong by a known amount. If
  // these were to pass, every green run in the file above would mean nothing -- which is the state
  // a hand-run mutation note leaves you in as soon as nobody reruns it.
  const bend = (id: ProblemId, by: number): Field => p => {
    const v = REGISTRY[id].field(p);
    return {x: v.x * (1 + by), y: v.y * (1 + by), z: v.z * (1 + by)};
  };
  for (const id of Object.keys(REGISTRY) as ProblemId[]) {
    const by = RESOLVES[id];
    it(`catches ${id} scaled by 1 + ${by}`, () => {
      expect(RESOLVES[id], `${id} has no measured resolving power`).toBeGreaterThan(0);
      const caught = stalledSettings(id, bend(id, by));
      expect(caught.length, `${id} bent by ${by} slipped through every one of its settings`).toBeGreaterThan(0);
    }, 60000);
  }
  it('and does not cry wolf: every unbent formula passes the same rule', () => {
    // The other half of the claim. A criterion that rejected everything would also "have teeth".
    for (const id of Object.keys(REGISTRY) as ProblemId[])
      expect(stalledSettings(id, p => REGISTRY[id].field(p)), id).toEqual([]);
  }, 120000);
});
