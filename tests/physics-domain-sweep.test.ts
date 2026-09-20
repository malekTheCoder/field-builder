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
 * ITS TEETH, CHECKED BY MUTATION rather than assumed: scaling the rod-on-its-bisector field by
 * 1 + 1e-9 fails this file, as does scaling the disk's by 1 + 5e-6, and each takes its potential
 * twin down with it. Redo that before ever trusting a green run here. */
const near = (v: {x: number; y: number; z: number}) => Math.hypot(v.x, v.y, v.z);
const gap = (a: {x: number; y: number; z: number}, b: {x: number; y: number; z: number}) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const BASE: Params = {distance: 3, size: 4, charge: 2, phi: Math.PI, element: .65, slices: 5, continuum: 0};
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
    const [n1, n2] = refinement(id);
    it(`${id}: refining the sum closes the gap to the printed field`, () => {
      const points = domain(id);
      // The scale to call something zero by: the biggest field anywhere in this lesson's domain.
      // A closed arc has exactly no field at its centre, and there the gap and the answer are both
      // at the last bit of a double -- a ratio between them would be noise divided by noise.
      const coarse = points.map(({p}) => d.quadrature(p, n1));
      const typical = Math.max(...coarse.map(near), 1e-30);
      const stalled: string[] = [];
      points.forEach(({p, at}, i) => {
        const fine = d.quadrature(p, n2), closed = d.field(p);
        if (near(fine) < 1e-9 * typical) {
          // Nothing to converge to: assert the formula agrees that there is no field here.
          expect(near(closed), `${id} ${at}: quadrature says zero, the formula does not`).toBeLessThan(1e-6 * typical);
          return;
        }
        const wide = gap(closed, coarse[i]), tight = gap(closed, fine);
        // Four times the elements must close the gap by at least half, unless it has already
        // reached the floor where doubles stop being able to tell the two apart.
        // Four times the elements must close the gap by a quarter at least, unless it has already
        // reached the floor. Surfaces converge as 1/n and so gain a clear factor; the wires are at
        // the floor long before this and never reach the comparison.
        if (tight > FLOOR * near(fine) && tight > wide * .75)
          stalled.push(`${at}: gap ${wide.toExponential(2)} at n=${n1} and ${tight.toExponential(2)} at n=${n2}, relative ${(tight / near(fine)).toExponential(2)}`);
      });
      expect(stalled, `${id}: the gap to the quadrature stops shrinking at ${stalled.length} of ${points.length} settings, so the formula is not what the sum converges to`).toEqual([]);
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
