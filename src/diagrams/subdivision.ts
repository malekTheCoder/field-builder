/** Visual and sampled partition for N→∞. Counts double so a refinement is extra
 *  mid-cuts on the pieces already drawn, not a newly indexed set of blobs. */
export const PARTITION_CAP = 200;
const gcd = (a: number, b: number): number => { while (b) { const t = a % b; a = b; b = t; } return a; };
function startAndGenerations(slices: number, cap: number): { start: number; maxGen: number } {
 const start = Math.max(3, Math.round(Number.isFinite(slices) ? slices : 3));
 const top = Math.max(start, Math.round(Number.isFinite(cap) ? cap : PARTITION_CAP));
 return { start, maxGen: Math.max(0, Math.floor(Math.log2(top / start))) };
}
/** Dyadic N: slices, 2×slices, … up to the largest power of two that still fits under the cap. */
export function partitionCount(slices: number, continuum: number, cap = PARTITION_CAP): number {
 const { start, maxGen } = startAndGenerations(slices, cap);
 const t = Math.max(0, Math.min(1, Number.isFinite(continuum) ? continuum : 0));
 if (maxGen === 0) return start;
 const k = Math.min(maxGen, Math.floor(t * maxGen + 1e-12));
 return start * (2 ** k);
}
/** Growth of the next mid-cut inside the current generation, 0…1. */
export function splitProgress(slices: number, continuum: number, cap = PARTITION_CAP): number {
 const { maxGen } = startAndGenerations(slices, cap);
 if (maxGen === 0) return 1;
 const g = Math.max(0, Math.min(1, Number.isFinite(continuum) ? continuum : 0)) * maxGen;
 const k = Math.floor(g + 1e-12);
 if (k >= maxGen) return 1;
 return Math.min(1, g - k);
}
/** Reduced-fraction identity for a cut at t ∈ (0,1). A seam at 1/2 is the same
 *  node whether the partition is 4 or 200, so doubling N inserts midpoints. */
export function seamKey(t: number): string {
 const den = 1 << 12;
 const num = Math.round(Math.min(1 - 1 / den, Math.max(1 / den, t)) * den);
 const g = gcd(num, den);
 return `${num / g}/${den / g}`;
}
export function seamFractions(n: number): number[] {
 const count = Math.max(1, Math.round(n));
 return Array.from({ length: Math.max(0, count - 1) }, (_, k) => (k + 1) / count);
}
/** Midpoints of the current bins — the cuts the next doubling will promote to seams. */
export function splitFractions(n: number): number[] {
 const count = Math.max(1, Math.round(n));
 return Array.from({ length: count }, (_, i) => (i + .5) / count);
}
/** React identity for the interval that starts at i/n. Surviving halves keep this key. */
export function intervalKey(i: number, n: number): string {
 const N = Math.max(1, Math.round(n)), index = Math.max(0, Math.min(N - 1, Math.round(i)));
 return index === 0 ? '0' : seamKey(index / N);
}
/** Binary path of the interval containing sample i. Children of a split share a prefix. */
export function pieceKey(i: number, n: number): string {
 const N = Math.max(1, Math.round(n)), index = Math.max(0, Math.min(N - 1, Math.round(i))), mid = (index + .5) / N, width = 1 / N;
 let lo = 0, hi = 1, id = '';
 while (hi - lo > width + 1e-15 && id.length < 20) {
  const m = (lo + hi) / 2;
  if (mid < m) { hi = m; id += '0'; } else { lo = m; id += '1'; }
 }
 return id || '0';
}
