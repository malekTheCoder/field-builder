import {describe, expect, it} from 'vitest';
import {PROBLEMS} from '../src/problems/definitions';
import {buildStages} from '../src/explorer/buildRun';
import {sampleDistribution} from '../src/diagrams/sampling';
import {pairOrder} from '../src/diagrams/pairs';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {K} from '../src/distributions/constants';
import {BISECTOR_UNFOLD, BREAK, boardLines} from '../src/workbench/derivation';
/* THE PANEL, WAVE FOUR: WHAT THE RUN AND THE BOARD SAY, TRUE AT EVERY SETTING.
 *
 * A student and a physicist read every run line and remark at the sliders' ends and with the charge
 * negative. Cut it up stated as a fact that the drawn pieces were small, where the sliders draw them five
 * times their distance from P; "Without end" opened Shrink them, read as the rod growing endless; the run
 * said "Mirror pairs" over a middle piece going in alone; the ring used "across" for two things and
 * "axial" for a third; a disk's bit and a ring's bracket had a signed "size"; the arrow's angle α was said
 * to be the drawn one with the step between them skipped; Unfold left the three-halves power to the eye.
 * Where a sentence claims something about numbers, the numbers are checked too. */
const lesson = (id: string) => PROBLEMS.find(p => p.id === id)!;
const step = (id: string, key: string, bounds?: [string, string], opts: {keeps?: boolean; oneSided?: boolean} = {}) =>
  boardLines(lesson(id), bounds, opts).find(l => l.key === key)!;
/** Every sentence a reader sees for a lesson: the run's lines and captions, and the board's words. */
const words = (id: string) => [
  ...buildStages(lesson(id)).flatMap(s => [s.line, s.caption]),
  ...boardLines(lesson(id)).flatMap(l => [l.say, l.nothing, l.cancelsSay].filter((t): t is string => !!t)),
];

describe('Cut it up says when a piece is nearly a point charge, not that the drawn ones are', () => {
  const rods = ['bisector', 'axial', 'endpoint', 'ramp', 'v-rod-bisector', 'v-rod-axial'];
  it('at r = ½, L = 8 and three pieces the bisector’s pieces are five times their distance from P', () => {
    const P = {...DEFAULT_PARAMS, distance: .5, size: 8};
    const pieces = sampleDistribution('bisector', P, 3);
    const length = P.size / 3, nearest = Math.min(...pieces.map(s => Math.hypot(P.distance - s.position.x, s.position.y)));
    expect(length / nearest).toBeGreaterThan(5);
    for (const id of rods) {
      const [cut] = buildStages(lesson(id));
      expect(cut.line, id).toBe('Pieces of rod: one short compared with its distance from P is nearly a point charge.');
      expect(cut.line, id).not.toMatch(/small enough|Pieces small/);
    }
  });
  it('at R = 4, z = ½ and three rings the disk’s inner ring is not one distance from P: the line is the condition', () => {
    const R = 4, z = .5, ds = R / 3;
    expect(Math.hypot(ds, z) / z).toBeGreaterThan(2.8);
    for (const id of ['disk', 'v-disk']) {
      const [cut, one] = buildStages(lesson(id));
      expect(cut.line, id).toMatch(/^The thinner a ring, the more nearly all of it is the same distance from P\.$/);
      expect(cut.line, id).not.toMatch(/^Thin rings:/);
      // A thin ring's, and said so a student can picture it: "one angle from P" was not.
      if (id === 'disk') expect(one.line).toMatch(/^Every bit of a thin ring is equally far from P, at the same angle/);
    }
  });
  it('"compared with", never "beside", in any line, caption or remark', () => {
    for (const p of PROBLEMS) for (const text of words(p.id)) expect(text, `${p.id}: ${text.slice(0, 70)}`).not.toMatch(/\bbeside\b/);
  });
});

describe('Shrink them opens on the board’s N → ∞', () => {
  it('every lesson’s line, as plain text and as set', () => {
    for (const p of PROBLEMS) {
      const limit = buildStages(p)[4];
      expect(limit.line, p.id).toMatch(/^As N→∞, /);
      expect(limit.prose, p.id).toMatch(/^As \$N\\to\\infty\$, /);
      for (const s of buildStages(p)) expect(s.line, `${p.id} · ${s.key}`).not.toMatch(/Without end/i);
    }
  });
});

describe('Add them up says the middle piece goes in alone', () => {
  for (const id of ['bisector', 'infinite', 'arc'] as const) it(`${id}: at the default odd N the first step is the middle piece, with no y part, alone`, () => {
    // The figure's own order: the middle piece first, with no partner.
    const order = pairOrder(id, DEFAULT_PARAMS.slices)!;
    expect(DEFAULT_PARAMS.slices % 2).toBe(1);
    expect(order[0].b).toBeNull();
    // And it has no y part to cancel, for either sign of charge.
    for (const charge of [2, -3.7]) {
      const pieces = sampleDistribution(id, {...DEFAULT_PARAMS, charge}, DEFAULT_PARAMS.slices);
      const middle = pieces[(DEFAULT_PARAMS.slices - 1) / 2];
      expect(Math.abs(middle.field.y / middle.field.x), `${id} at ${charge}`).toBeLessThan(1e-9);
    }
    const add = buildStages(lesson(id))[3];
    // The line ends on what the sum reaches; the lone middle piece is said by the caption and the board.
    expect(add.line).toBe('Mirror pairs’ y parts cancel; the sum runs along x: the field at P once the pieces shrink.');
    expect(add.caption).toMatch(/a lone middle piece has no sideways part/);
    expect(step(id, 'add').say).toContain('(a lone middle piece, on the $x$-axis, has none)');
  });
  it('the other lessons’ sums become the field or the potential as the pieces shrink, with the sum the subject', () => {
    for (const p of PROBLEMS) {
      const line = buildStages(p)[3].line;
      expect(line, p.id).not.toMatch(/once they shrink/);
      if (/tip to tail|number:/.test(line)) expect(line, p.id).toMatch(/their sum becomes the (field|potential) at P as the (piece|ring)s shrink\.$/);
    }
  });
});

describe('the ring: one word for one thing', () => {
  it('the partner is half a turn round, the part it cancels sideways, and nothing is "axial"', () => {
    const stages = buildStages(lesson('ring'));
    for (const s of stages) {
      expect(s.line, s.key).not.toMatch(/axial|across the axis|straight across/);
      // A caption may name the partner straight across, but then calls the part it cancels sideways.
      for (const sentence of s.caption.split(/(?<=\.) /)) if (/straight across/.test(sentence)) expect(sentence, s.key).not.toMatch(/across the axis/);
    }
    expect(stages[0].line).toBe('All of the ring is one distance and one angle from P, so pieces need not be small.');
    expect(stages[1].line).toBe('Treated as a point charge, a piece’s part along the axis is exact at any size.');
    // Of each piece's part: "the ring half a turn round" named the whole ring as the partner.
    expect(stages[2].line).toMatch(/^Each piece’s sideways part is undone half a turn round/);
    expect(stages[3].line).toMatch(/^Pairs half a turn apart: sideways parts cancel/);
    for (const id of ['disk', 'sheet']) expect(buildStages(lesson(id))[2].line, id).not.toMatch(/axial/);
  });
  it('One piece gives the reason first, in sentences of their own, and the drawing as an aside', () => {
    const paras = step('ring', 'one').say!.split(BREAK);
    const reason = paras.find(p => p.startsWith('A piece need not be small.'))!;
    expect(reason).toBeDefined();
    for (const sentence of reason.split(/(?<=\.) /)) expect(sentence.split(/\s+/).length, sentence).toBeLessThan(40);
    expect(paras.at(-1)).toMatch(/^The figure draws the piece as a point charge at its middle/);
  });
});

describe('a size is never negative: ΔE and δE carry the charge’s sign', () => {
  it('a disk’s or a sheet’s bit: δE = k δq / r_i² is signed, and its part along the axis is δE cos α for a negative charge too', () => {
    for (const id of ['disk', 'sheet']) {
      const say = step(id, 'cancel').say!;
      expect(say, id).toContain(String.raw`$\delta E=k\,\delta q/r_i^2$ carries the sign of the bit’s charge`);
      expect(say, id).not.toMatch(/of size \$\\delta E\$/);
    }
    // One bit of a negative ring of radius s, P a height z up the axis: its field's z part is δE cos α.
    const s = 1.3, z = .7, dq = -2e-9, r = Math.hypot(s, z), dE = K * dq / r ** 2, cos = z / r;
    const along = K * dq * z / r ** 3;
    expect(along).toBeLessThan(0);
    expect(along / (dE * cos)).toBeCloseTo(1, 12);
  });
  it('a ring under a bracket: the size of its sideways part is k|ΔQ| sin α / r_i²', () => {
    const say = step('ring', 'cancel', ['0', '\\pi'], {oneSided: true}).say!;
    expect(say).toContain(String.raw`of size $k\,|\Delta Q|\sin\alpha/r_i^2$`);
  });
});

describe('why the arrow’s angle is α: it is the same line carried on through P', () => {
  it('the rods say so, and the part along x is ΔE cos α with ΔE signed, for either charge', () => {
    for (const id of ['bisector', 'endpoint', 'ramp']) {
      const say = step(id, 'cancel').say!;
      // "Vertically opposite", by name: "the one opposite α" was read as the side opposite α, two clauses on.
      expect(say, id).toMatch(/lies along that line, carried on through.*\$P\$\.\s+There the line crosses the axis, and vertically opposite angles are equal, so beyond.*\$P\$, where a positive charge’s arrow points, the arrow makes the angle \$\\alpha_i\$ with the axis too\./);
      expect(say, id).not.toMatch(/the one opposite/);
      expect(say, id).toContain(String.raw`Its part along $x$ is $\Delta E\cos\alpha_i$, the side next to`);
    }
    // Every piece of the bisector, either sign: the sampled field's x part is k ΔQ cos α / r_i², ΔQ signed.
    for (const charge of [2, -3.7]) for (const piece of sampleDistribution('bisector', {...DEFAULT_PARAMS, charge}, 7)) {
      const dx = DEFAULT_PARAMS.distance - piece.position.x, ri = Math.hypot(dx, piece.position.y), cos = DEFAULT_PARAMS.distance / ri;
      expect(piece.field.x / (K * piece.dq / ri ** 2 * cos), `charge ${charge}`).toBeCloseTo(1, 10);
    }
  });
  it('the arc says the radius to the piece makes θ with the x-axis, and the arrow is that radius carried on through P', () => {
    const say = step('arc', 'cancel').say!;
    expect(say).toMatch(/^With \$P\$ at the centre, the radius to a piece at angle \$\\theta\$ makes the angle \$\\theta\$ with the.*\$x\$-axis\./);
    expect(say).toMatch(/lies along that radius carried on through.*\$P\$/);
    expect(say).toMatch(/back through/);
  });
});

describe('Unfold, the rod’s substitution', () => {
  it('names the figure’s own angle and writes the three-halves power out', () => {
    const [, sub, power] = BISECTOR_UNFOLD;
    expect(sub.text).toMatch(/the figure’s own angle \$\\alpha\$/);
    expect(power.text).toContain(String.raw`$(r^2\sec^2\alpha)^{3/2}=r^3\sec^3\alpha$`);
    expect(power.text).not.toMatch(/conversion factor/);
    // (r² sec²α)^{3/2} = r³ sec³α for every α the rod reaches, either side of the axis.
    for (const a of [-1.2, -.3, .4, 1.3]) expect((3 ** 2 / Math.cos(a) ** 2) ** 1.5 / (3 ** 3 / Math.abs(Math.cos(a)) ** 3)).toBeCloseTo(1, 12);
  });
});
