import { describe, expect, it } from 'vitest';
import { sampleDistribution, sumSamples, intervalWeights, sumInterval, activeIntervalIndex, type ChargeSample } from '../src/diagrams/sampling';
import { field, magnitude } from '../src/symbolic/physics';
import { DEFAULT_PARAMS, type ProblemId } from '../src/problems/types';
const ids: ProblemId[] = ['bisector','axial','infinite','ring','disk','semi','arc','sheet','endpoint'];
describe('physical charge sampling', () => {
  for (const id of ids) it(`${id} converges to its analytic vector field`, () => {
    for (const distance of [.5, 3, 6]) {
      const p = { ...DEFAULT_PARAMS, distance };
      const exact = field(id, p), actual = sumSamples(sampleDistribution(id, p, 2000));
      const error = magnitude({ x: exact.x-actual.x, y: exact.y-actual.y, z: exact.z-actual.z });
      expect(error / Math.max(magnitude(exact), 1e-10)).toBeLessThan(1e-5);
    }
  });
  it('conserves finite total charge and equal finite line pieces', () => {
    for (const id of ['bisector','axial','ring','disk','arc','endpoint'] as ProblemId[]) {
      const samples = sampleDistribution(id, DEFAULT_PARAMS, 37);
      expect(samples.reduce((s,v) => s+v.dq,0)).toBeCloseTo(DEFAULT_PARAMS.charge*1e-9, 18);
    }
  });
  it('accumulates zero, a fractional first element, and the complete field', () => {
    const samples = sampleDistribution('semi', DEFAULT_PARAMS, 12);
    expect(sumSamples(samples, 0)).toEqual({x:0,y:0,z:0});
    expect(sumSamples(samples, -1)).toEqual({x:0,y:0,z:0});
    expect(sumSamples(samples, 1/24).x).toBeCloseTo(samples[0].field.x/2, 12);
    expect(sumSamples(samples, 2)).toEqual(sumSamples(samples));
    expect(sumSamples(samples, 1).x).toBeLessThan(0);
    expect(sumSamples(samples, 1).y).toBeGreaterThan(0);
  });
  it('a full arc cancels for odd and even partitions', () => {
    for (const n of [3,4,13,80,200]) expect(magnitude(sumSamples(sampleDistribution('arc', {...DEFAULT_PARAMS,phi:2*Math.PI}, n)))).toBeLessThan(1e-12);
  });
  it('annulus samples have no transverse field and sheet stays independent of height', () => {
    const near = sumSamples(sampleDistribution('sheet', {...DEFAULT_PARAMS,distance:.5}, 60));
    const far = sumSamples(sampleDistribution('sheet', {...DEFAULT_PARAMS,distance:6}, 60));
    expect(near.x).toBe(0); expect(near.y).toBe(0); expect(near.z).toBeCloseTo(far.z, 10);
    for (const s of sampleDistribution('disk', DEFAULT_PARAMS, 25)) { expect(s.field.x).toBe(0); expect(s.field.y).toBe(0); }
  });
  it('includes both tails of an infinite line through finite angular midpoints', () => {
    const samples = sampleDistribution('infinite', DEFAULT_PARAMS, 7);
    expect(samples[0].coordinate).toBeGreaterThan(-Math.PI/2);
    expect(samples[6].coordinate).toBeLessThan(Math.PI/2);
    expect(samples.every(s => Number.isFinite(s.dq) && Number.isFinite(s.field.x))).toBe(true);
    expect(sumSamples(samples).y).toBeCloseTo(0,12);
  });
});

describe('directed interval sweep', () => {
  const fixture: ChargeSample[] = [1, 2, 4, 8].map((v, i) => ({
    position: { x: i, y: 0, z: 0 }, coordinate: i, dq: 1,
    field: { x: v, y: -2 * v, z: 3 * v },
  }));
  it('zero-width intervals contribute nothing, including inside a bin', () => {
    for (const bound of [0, 12.5, 50, 99, 100]) {
      expect(intervalWeights(5, [bound, bound])).toEqual([0, 0, 0, 0, 0]);
      expect(sumInterval(fixture, [bound, bound])).toEqual({ x: 0, y: 0, z: 0 });
    }
  });
  it('clips both partial endpoint bins without changing source density', () => {
    expect(intervalWeights(4, [12.5, 87.5])).toEqual([.5, 1, 1, .5]);
    expect(sumInterval(fixture, [12.5, 87.5])).toEqual({ x: 10.5, y: -21, z: 31.5 });
    const inside = intervalWeights(4, [30, 40]);
    expect(inside[1]).toBeCloseTo(.4, 14);expect(inside.filter((_, i) => i !== 1)).toEqual([0, 0, 0]);
  });
  it('accumulates forward from the selected lower endpoint', () => {
    expect(intervalWeights(4, [25, 75], .25)).toEqual([0, .5, 0, 0]);
    expect(intervalWeights(4, [25, 75], .75)).toEqual([0, 1, .5, 0]);
    expect(sumInterval(fixture, [25, 75], .25)).toEqual({ x: 1, y: -2, z: 3 });
  });
  it('reversed playback begins at the high endpoint, with negative weights', () => {
    expect(intervalWeights(4, [75, 25], .25)).toEqual([0, 0, -.5, 0]);
    expect(intervalWeights(4, [75, 25], .75)).toEqual([0, -.5, -1, 0]);
    expect(sumInterval(fixture, [75, 25], .25)).toEqual({ x: -2, y: 4, z: -6 });
    const forward = sumInterval(fixture, [12.5, 87.5]);
    expect(sumInterval(fixture, [87.5, 12.5])).toEqual({ x: -forward.x, y: -forward.y, z: -forward.z });
  });
  it('conserves interval length and directed accumulated charge', () => {
    for (const n of [3, 5, 37, 200]) for (const bounds of [[13, 89], [89, 13], [0, 100]] as [number, number][]) for (const progress of [0, .13, .5, 1]) {
      const weights = intervalWeights(n, bounds, progress);
      expect(weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(n * (bounds[1] - bounds[0]) / 100 * progress, 12);
      expect(weights.reduce((sum, w) => sum + Math.abs(w), 0)).toBeCloseTo(n * Math.abs(bounds[1] - bounds[0]) / 100 * progress, 12);
      expect(weights.every(w => Math.abs(w) <= 1)).toBe(true);
    }
  });
  it('recovers existing full-distribution sums and continuous playback', () => {
    for (const id of ids) {
      const samples = sampleDistribution(id, DEFAULT_PARAMS, 37);
      for (const progress of [0, .13, .5, 1]) expect(sumInterval(samples, [0, 100], progress)).toEqual(sumSamples(samples, progress));
    }
    expect(sumInterval(fixture, [20, 80], .5 - 1e-9).x).toBeCloseTo(sumInterval(fixture, [20, 80], .5 + 1e-9).x, 6);
  });
  it('clamps bounds and progress and handles empty partitions', () => {
    expect(intervalWeights(4, [-100, 200], 2)).toEqual([1, 1, 1, 1]);
    expect(intervalWeights(4, [0, 100], -1)).toEqual([0, 0, 0, 0]);
    expect(intervalWeights(0, [0, 100])).toEqual([]);
    expect(sumInterval([], [0, 100])).toEqual({ x: 0, y: 0, z: 0 });
    expect(activeIntervalIndex(0, [0, 100], 1)).toBe(0);
  });
  it('tracks the directed frontier and retains an included bin at completion', () => {
    expect(activeIntervalIndex(4, [25, 75], 0)).toBe(1);
    expect(activeIntervalIndex(4, [25, 75], .25)).toBe(1);
    expect(activeIntervalIndex(4, [25, 75], .5)).toBe(2);
    expect(activeIntervalIndex(4, [25, 75], 1)).toBe(2);
    expect(activeIntervalIndex(4, [75, 25], 0)).toBe(2);
    expect(activeIntervalIndex(4, [75, 25], .25)).toBe(2);
    expect(activeIntervalIndex(4, [75, 25], .5)).toBe(1);
    expect(activeIntervalIndex(4, [75, 25], 1)).toBe(1);
    expect(activeIntervalIndex(5, [50, 50], .5)).toBe(2);
    expect(activeIntervalIndex(4, [0, 100], 1)).toBe(3);
    expect(activeIntervalIndex(4, [100, 0], 1)).toBe(0);
  });
});
