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
