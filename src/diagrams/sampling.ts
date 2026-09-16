import type { Params, ProblemId } from '../problems/types';
import { REGISTRY } from '../distributions';
import type { Vec } from '../symbolic/physics';
export type { Vec } from '../symbolic/physics';
export type { ChargeSample } from '../distributions/types';
import type { ChargeSample } from '../distributions/types';
/** Midpoint quadrature in SI units. Infinite domains include the tangent Jacobian.
 * Disk/sheet elements are whole annuli; transverse fields have already canceled.
 * The per-geometry partitions live in src/distributions/. */
export function sampleDistribution(id: ProblemId, p: Params, count: number): ChargeSample[] {
  const n = Math.max(1, Math.min(10000, Math.round(Number.isFinite(count) ? count : 1)));
  return REGISTRY[id].sample(p, n);
}
/** Fractional last-element weights keep accumulation playback continuous. */
export function sumSamples(samples: ChargeSample[], progress = 1): Vec {
  const through = Math.max(0, Math.min(1, progress)) * samples.length;
  return samples.reduce((sum, sample, i) => {
    const weight = Math.max(0, Math.min(1, through - i));
    return { x: sum.x + sample.field.x * weight, y: sum.y + sample.field.y * weight, z: sum.z + sample.field.z * weight };
  }, { x: 0, y: 0, z: 0 });
}

const clampUnit = (value: number) => Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
function intervalSweep(count: number, bounds: [number, number], progress: number) {
  const n = Number.isFinite(count) ? Math.max(0, Math.min(10000, Math.round(count))) : 0;
  const a = clampUnit(bounds[0] / 100) * n;
  const b = clampUnit(bounds[1] / 100) * n;
  const fraction = clampUnit(progress);
  return { n, a, b, end: a + (b - a) * fraction, fraction };
}
/** Signed overlap of each midpoint quadrature bin with the directed sweep.
 * An interval may begin/end inside a bin; its unused fraction contributes zero.
 * These are quadrature weights, so refinements retain the original source density. */
export function intervalWeights(count: number, bounds: [number, number], progress = 1): number[] {
  const { n, a, end } = intervalSweep(count, bounds, progress);
  const lower = Math.min(a, end), upper = Math.max(a, end), direction = Math.sign(end - a);
  return Array.from({ length: n }, (_, i) => {
    const overlap = Math.max(0, Math.min(i + 1, upper) - Math.max(i, lower));
    return overlap === 0 ? 0 : direction * overlap;
  });
}
/** Vector sum over a → a + (b − a) progress, including fractional endpoint bins. */
export function sumInterval(samples: ChargeSample[], bounds: [number, number], progress = 1): Vec {
  const weights = intervalWeights(samples.length, bounds, progress);
  return samples.reduce((sum, sample, i) => {
    const weight = weights[i] ?? 0;
    return { x: sum.x + sample.field.x * weight, y: sum.y + sample.field.y * weight, z: sum.z + sample.field.z * weight };
  }, { x: 0, y: 0, z: 0 });
}
/** Scalar counterpart of sumInterval: the potential accumulated over the same directed sweep. */
export function sumPotential(samples: ChargeSample[], bounds: [number, number] = [0, 100], progress = 1): number {
  const weights = intervalWeights(samples.length, bounds, progress);
  return samples.reduce((sum, sample, i) => sum + sample.potential * (weights[i] ?? 0), 0);
}
/** Bin at the sweep frontier. At completion, retain the last included bin.
 * Zero-width intervals select their containing bin; an empty partition returns 0. */
export function activeIntervalIndex(count: number, bounds: [number, number], progress: number): number {
  const { n, a, b, end, fraction } = intervalSweep(count, bounds, progress);
  if (n === 0) return 0;
  let index: number;
  if (a === b) index = Math.floor(a);
  else if (fraction === 1) index = b > a ? Math.ceil(end) - 1 : Math.floor(end);
  else index = b > a ? Math.floor(end) : Math.ceil(end) - 1;
  return Math.max(0, Math.min(n - 1, index));
}
/** Fewer elements to sum from, without changing the charge they stand for.
 *
 * Tracing is quadratic in the element count, so the drawing works from a reduced set. That set
 * used to be `filter((_, i) => i % stride === 0)`, which is not a coarser partition of the same
 * charge -- it is a SAMPLE of it, and it lies in two ways.
 *
 * It keeps every stride-th element's `dq` and discards the rest, so the drawn charge is 1/stride
 * of the real one. Direction survives that, magnitude does not. And when the stride does not
 * divide the count it drops the tail: at 200 elements the stride is 4 and the last three are
 * simply gone, so a rod drawn on its own bisector is a little shorter at one end than the other
 * and its field is quietly asymmetric.
 *
 * Merging instead of skipping fixes both. Consecutive elements are grouped and each group
 * becomes one element carrying the group's whole charge, placed at its centre of charge -- which
 * is where a group of point charges actually acts from, so the far field is unchanged and the
 * near field is the honest field of a coarser cut. Total charge, full span and symmetry all
 * survive. */
export function coarsen(samples: readonly ChargeSample[], limit: number): ChargeSample[] {
  if (limit < 1 || samples.length <= limit) return [...samples];
  const groups = Math.min(limit, samples.length);
  const out: ChargeSample[] = [];
  for (let g = 0; g < groups; g++) {
    const from = Math.floor(g * samples.length / groups), to = Math.floor((g + 1) * samples.length / groups);
    const part = samples.slice(from, Math.max(to, from + 1));
    let dq = 0, wx = 0, wy = 0, wz = 0, wc = 0, weight = 0;
    for (const s of part) {
      const w = Math.abs(s.dq);
      dq += s.dq; weight += w;
      wx += w * s.position.x; wy += w * s.position.y; wz += w * s.position.z; wc += w * s.coordinate;
    }
    // An uncharged run has no centre of charge; fall back to the middle of the run.
    const mid = part[Math.floor(part.length / 2)];
    const at = weight > 0
      ? {position: {x: wx / weight, y: wy / weight, z: wz / weight}, coordinate: wc / weight}
      : {position: {...mid.position}, coordinate: mid.coordinate};
    out.push({...mid, ...at, dq});
  }
  return out;
}
