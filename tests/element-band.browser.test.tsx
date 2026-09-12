import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS, type Params, type ProblemId} from '../src/problems/types';

afterEach(cleanup);
/* The band drawn for one piece of a surface has to be the piece being summed.
 *
 * A disk is cut at even radii and a sheet at |z|·tan(pi t/2), where the outer rings are vastly
 * wider than the inner ones. The drawing used one averaged width for every band, which is
 * exactly right for the disk -- and that is why it went unnoticed -- and badly wrong for the
 * sheet, where the highlighted band sat nowhere near the ring whose charge it stood for.
 *
 * So this does not check the arithmetic against a copy of itself. It takes the ring the app
 * actually sums, from the sampler, and asks whether the band drawn around it contains it. */
const SURFACES: ProblemId[] = ['disk', 'sheet', 'v-disk'];
function bandFor(id: ProblemId, over: Partial<Params>, count: number, selected: number) {
  const params = {...DEFAULT_PARAMS, ...over};
  const {container} = render(<ChargeDiagram problem={getProblem(id)} params={params} setParams={vi.fn()}
    count={count} continuum={0} selected={selected} onSelect={vi.fn()} progress={1} components={false}
    pair={false} mode="divide" boundRange={[0, 100]} onBoundRangeChange={vi.fn()} compact />);
  const raw = container.querySelector<HTMLElement>('.charge-diagram')!.dataset.elementAnnulus;
  const band = raw ? raw.split(',').map(Number) : null;
  const samples = sampleDistribution(id, params, count);
  return {band, samples, params};
}

describe('the band drawn for one ring of a surface', () => {
  it('contains the ring it stands for, on every piece of every surface', () => {
    const wrong: string[] = [];
    for (const id of SURFACES) for (const count of [4, 5, 11]) for (const distance of [1, 3, 6]) {
      for (let selected = 0; selected < count; selected++) {
        const {band, samples} = bandFor(id, {distance}, count, selected);
        expect(band, `${id} drew no band`).not.toBeNull();
        const [inner, outer] = band!;
        const ring = Math.abs(samples[selected].coordinate);
        if (!(inner <= ring && ring <= outer))
          wrong.push(`${id} n=${count} z=${distance} piece ${selected}: ring at ${ring.toFixed(3)} outside [${inner.toFixed(3)}, ${outer.toFixed(3)}]`);
        cleanup();
      }
    }
    expect(wrong, `${wrong.length} bands miss their own charge`).toEqual([]);
  });
  it('tiles the surface: each band starts where the last one ended', () => {
    for (const id of SURFACES) for (const count of [4, 7]) {
      let previousOuter = 0;
      for (let selected = 0; selected < count; selected++) {
        const {band} = bandFor(id, {distance: 2}, count, selected);
        const [inner, outer] = band!;
        expect(inner, `${id} piece ${selected} does not start where piece ${selected - 1} ended`).toBeCloseTo(previousOuter, 9);
        expect(outer, `${id} piece ${selected} has no width`).toBeGreaterThan(inner);
        previousOuter = outer;
        cleanup();
      }
    }
  });
  it('still cuts the disk at even radii, which is what made the fault invisible', () => {
    const count = 6, R = DEFAULT_PARAMS.size / 2;
    for (let selected = 0; selected < count; selected++) {
      const {band} = bandFor('disk', {}, count, selected);
      expect(band![0]).toBeCloseTo(R * selected / count, 9);
      expect(band![1]).toBeCloseTo(R * (selected + 1) / count, 9);
      cleanup();
    }
  });
  it('widens the sheet outwards, because a tan cut is not an even one', () => {
    // The visible claim of the lesson: the far rings are enormous, which is how an infinite
    // sheet keeps contributing however far out you look. An even cut would deny it.
    const count = 6;
    const widths: number[] = [];
    for (let selected = 0; selected < count; selected++) {
      const {band} = bandFor('sheet', {distance: 3}, count, selected);
      widths.push(band![1] - band![0]);
      cleanup();
    }
    for (let i = 1; i < widths.length; i++) expect(widths[i], `band ${i} is no wider than ${i - 1}`).toBeGreaterThan(widths[i - 1]);
    expect(widths[widths.length - 1] / widths[0], 'the outer band should dwarf the inner one').toBeGreaterThan(10);
  });
});
