import {afterEach, describe, expect, it} from 'vitest';
import {figureCopy} from '../src/state/artifact';
/* THE COPY'S FIGURE DROPS THE RUN'S SCALE NOTE.
 *
 * The figure's corner says what scale the run's arrows are at -- "Cut into pieces", "The piece's arrow
 * drawn larger", "In the limit". On paper it named nothing: a copy saved at rest printed "Cut into pieces"
 * under a figure that was not being cut. The source's own footer, ΔQ = λ Δy, stays. */
afterEach(() => document.body.replaceChildren());
const stage = (note: string, dim = 'pieces') => {
  const holder = document.createElement('div');
  holder.className = 'cd-stage';
  holder.innerHTML = `<svg class="cd-svg" viewBox="0 0 720 430"><text x="30" y="409" class="cd-footer cd-footer-math">ΔQ = λ Δy</text><text x="690" y="409" class="cd-footer" ${dim ? `data-dim="${dim}"` : ''}>${note}</text><text class="cd-stage-label" x="360" y="34">One piece</text></svg>`;
  document.body.appendChild(holder);
  return holder;
};
describe('the offline copy’s figure', () => {
  for (const note of ['Cut into pieces', 'The piece’s arrow drawn larger', 'This pair drawn larger', 'In the limit', 'Cut into rings']) it(`leaves out “${note}”`, () => {
    const copy = figureCopy(stage(note));
    expect(copy).not.toContain(note);
    expect(copy, 'the source’s footer stays').toContain('ΔQ = λ Δy');
    expect(copy, 'and the stage’s name').toContain('One piece');
  });
  it('by its words too, should the corner lose its place', () => {
    expect(figureCopy(stage('Both pieces’ arrows drawn larger', ''))).not.toContain('drawn larger');
  });
});
