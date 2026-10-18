import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {shellField} from '../src/distributions/shell';
import {K} from '../src/distributions/constants';
import {lesson as offsetLesson} from '../src/lessons/offset';
import {lesson as shellLesson} from '../src/lessons/shell';
import {lesson as unevenLesson} from '../src/lessons/uneven-arc';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {bank as arcBank} from '../src/quiz/bank/arc';
import {bank as diskBank} from '../src/quiz/bank/disk';
import {bank as holesBank} from '../src/quiz/bank/gauss-holes';
import {field, limitPlot} from '../src/symbolic/physics';

/** A plot of |E| must not say the signed field grows, falls or drops. For one sign that component moves the other way. */
const caption = (id: string, mode: string) => {
  const problem = getProblem(id as 'ring');
  return limitPlot(problem, problem.limits.find(l => l.mode === mode)!).caption;
};

it('limit captions name the magnitude, which is what the axis draws', () => {
  expect(caption('ring', 'center')).toMatch(/field’s magnitude falls to zero/);
  expect(caption('ring', 'center')).toMatch(/not moved farther away/);
  expect(caption('arc', 'full')).toMatch(/magnitude only falls/);
  expect(caption('v-arc', 'full')).toMatch(/magnitude falls to zero/);
  expect(caption('uneven-arc', 'even')).toMatch(/magnitude at P falls onto/);
  expect(caption('shell', 'inside')).toMatch(/magnitude grows as P comes in/);
  expect(caption('shell', 'inside')).toMatch(/magnitude drops to zero/);
  expect(caption('infinite', 'scale')).toMatch(/magnitude falls along the dashed/);
  expect(caption('infinite', 'scale')).toMatch(/double r and it halves/);
  for (const text of [caption('ring', 'center'), caption('arc', 'full'), caption('shell', 'inside'), caption('infinite', 'scale'), caption('uneven-arc', 'even')]) {
    expect(text).not.toMatch(/the field falls|the field only falls|the field grows|the field at P falls/);
  }
});

it('the scrub says magnitude where the signed field would move the other way', () => {
  const src = readFileSync(new URL('../src/components/Assessment.tsx', import.meta.url), 'utf8');
  expect(src).toContain('The curve of |E| rises towards the peak');
  expect(src).toContain('the potential holds while the field’s magnitude falls');
  expect(src).toContain('the field’s magnitude at the centre falls towards zero');
  expect(src).not.toContain('while the field falls');
  expect(src).toContain('the field’s magnitude grows as P comes in toward the shell');
  expect(src).not.toContain('the field grows as P comes in');
  expect(src).toContain('its magnitude falls as r grows');
  expect(src).not.toContain('it falls as r grows');
});

it('for the sign the old verb got wrong, the signed component moves opposite the magnitude', () => {
  const q = -1e-9;
  const far = shellField(2, q, 8), near = shellField(2, q, 4);
  expect(near).toBeLessThan(far);
  expect(Math.abs(near)).toBeGreaterThan(Math.abs(far));
  expect(shellField(2, q, 2)).toBeGreaterThan(shellField(2, q, 2.01));
  expect(shellField(2, q, 2)).toBeCloseTo(K * q / (2 * 4), 12);
  const p = {...DEFAULT_PARAMS, charge: -2};
  const peak = field('ring', {...p, distance: p.size / 2 / Math.SQRT2}).z;
  const centre = field('ring', {...p, distance: 0}).z;
  expect(centre).toBeGreaterThan(peak);
  expect(Math.abs(peak)).toBeGreaterThan(Math.abs(centre));
  const positive = {...DEFAULT_PARAMS, charge: 2};
  const narrow = field('arc', {...positive, phi: Math.PI / 6}).x;
  const wide = field('arc', {...positive, phi: Math.PI}).x;
  expect(narrow).toBeLessThan(0);
  expect(wide).toBeGreaterThan(narrow);
  expect(Math.abs(wide)).toBeLessThan(Math.abs(narrow));
  const close = field('infinite', {...p, distance: 1}).x, farther = field('infinite', {...p, distance: 2}).x;
  expect(farther).toBeCloseTo(close / 2, 12);
  expect(farther).toBeGreaterThan(close);
  const eps0 = 1 / (4 * Math.PI), ball = (rho: number, r: number) => rho * r / (3 * eps0);
  expect(ball(-1, 2)).toBeLessThan(ball(-1, 1));
  expect(Math.abs(ball(-1, 2))).toBeGreaterThan(Math.abs(ball(-1, 1)));
  const point = (charge: number, r: number) => K * charge / (r * r);
  expect(point(q, .5)).toBeLessThan(point(q, 2));
  expect(Math.abs(point(q, .5))).toBeGreaterThan(Math.abs(point(q, 2)));
});

it('quiz explanations that describe those curves name the magnitude, and the disk limit keeps σ’s sign', () => {
  const near = diskBank.find(q => q.id === 'disk-near')!;
  const why = near.choices.map(c => c.why ?? '').join('\n');
  expect(why).toContain('field magnitude grows without end');
  expect(why).not.toContain('field grows without end');
  expect(near.explanation).toContain(String.raw`with the sign of $\sigma$`);
  const holes = holesBank.find(q => q.id === 'holes-whole-ball')!.choices.map(c => c.why ?? '').join('\n');
  expect(holes).toContain('magnitude grows in step with $r_1$');
  expect(holes).toContain(String.raw`sign of $\rho$`);
  expect(holes).not.toContain('the field grows in step');
  const arcWhy = arcBank.find(q => q.id === 'arc-open')!.choices.map(c => c.why ?? '').join('\n');
  expect(arcWhy).toContain('magnitude only falls');
  expect(arcWhy).not.toContain('the field only falls');
  const words = getProblem('arc').limits.find(l => l.mode === 'full')!.explanation;
  expect(words).toMatch(/magnitude only falls/);
  expect(words).toMatch(/the magnitude would instead grow until the semicircle/);
  expect(words).not.toMatch(/the field would instead grow|the field only falls/);
});

it('the shell writes its surface mean, the offset names the arrow’s direction, and the uneven factor is the quotient', () => {
  const shell = shellLesson.sections.flatMap(s => s.body).map(b => typeof b === 'string' ? b : b.tex).join('\n');
  expect(shell).toContain(String.raw`\sigma/(2\varepsilon_0)`);
  expect(shell).toContain('lone sheet');
  expect(shell).toContain('for either sign');
  const offset = offsetLesson.sections.flatMap(s => s.body).filter((b): b is string => typeof b === 'string').join('\n');
  expect(offset).toContain('toward it for a negative one');
  const uneven = unevenLesson.sections.flatMap(s => s.body).map(b => typeof b === 'string' ? b : b.tex).join('\n');
  expect(uneven).toContain(String.raw`\frac{\pi^2}{8}`);
});
