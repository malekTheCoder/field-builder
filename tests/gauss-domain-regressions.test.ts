import {describe, expect, it} from 'vitest';
import {gaussLesson} from '../src/gauss';
import {bank as fluxBank} from '../src/quiz/bank/gauss-flux';
import {bank as holesBank} from '../src/quiz/bank/gauss-holes';
import {bank as qencBank} from '../src/quiz/bank/gauss-qenc';
import {EPS0, dot, fieldAt, norm, v3} from '../src/gauss/physics';

const raw = String.raw;
const kase = (id: string, key: string) => gaussLesson(id)!.cases.find(c => c.key === key)!;
const integrate = (f: (x: number) => number, lo: number, hi: number) => {
  const n = 2000, h = (hi - lo) / n;
  let sum = f(lo) + f(hi);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(lo + i * h);
  return h * sum / 3;
};

describe('Gauss teaching keeps a formula in the region where it applies', () => {
  for (const [id, key, bound] of [['qenc', 'shells', 'r\\le R'], ['qenc', 'slab', 'z\\le a'], ['spheres', 'rising', 'r\\le R']] as const) {
    it(`${id}/${key} limits the density integral and writes the exterior charge`, () => {
      const c = kase(id, key);
      expect(c.right.tex).toContain(bound);
      expect(c.right.tex).toContain(bound.replace('le', 'ge'));
      if (id === 'qenc' && key === 'shells') {
        const section = gaussLesson('qenc')!.sections.find(s => s.heading === 'Normalising when you are given Q')!;
        const prose = section.body.filter(b => typeof b === 'string').join(' ');
        expect(prose).toContain(raw`r\le R`);
        expect(prose).toContain(raw`r\ge R`);
        expect(prose).toContain(raw`Q_{\text{enc}}=Q`);
      }
    });
  }
  it('the backwards density vanishes beyond its ball, including the answer box', () => {
    const c = kase('hard', 'backwards');
    expect(c.right.tex).toContain(raw`r\ge R`);
    expect(c.solve.answer).toContain('r>R');
    expect(c.solve.answer).toContain('0,');
    expect(c.setup).toContain('no surface charge');
  });
  it('the odd slab charge is zero outside, instead of extending its density past the slab', () => {
    const c = kase('hard', 'odd');
    expect(c.right.tex).toContain(raw`|z|\ge a`);
    expect(c.solve.tex).toContain(raw`|z|\le a`);
  });
  it('distinguishes a genuinely frozen density from harmless dummy-variable renaming', () => {
    const question = qencBank.find(q => q.id === 'qenc-integral')!;
    const wrong = question.choices.find(c => c.why?.includes('fixed'))!;
    expect(wrong.tex).toContain(raw`\Big(1-\frac{r}{R}\Big)4\pi r'^2\,dr'`);
    // The old distractor was exactly the correct integral with its dummy renamed.
    // A fixed boundary density instead gives rho(r) times the inner volume and
    // undercounts a density whose magnitude decreases toward the surface.
    for (const rho0 of [2, -3]) for (const r of [.2, .6, .9]) {
      const R = 1;
      const shells = integrate(x => rho0 * (1 - x / R) * 4 * Math.PI * x * x, 0, r);
      const frozen = integrate(x => rho0 * (1 - r / R) * 4 * Math.PI * x * x, 0, r);
      expect(shells).toBeCloseTo(4 * Math.PI * rho0 * (r ** 3 / 3 - r ** 4 / (4 * R)), 10);
      expect(Math.abs(frozen)).toBeLessThan(Math.abs(shells));
    }
  });
  it('an external charge has a tangent circle on the sphere, although the field is nonzero there', () => {
    const r = 1.3, d = 2.15, z = r * r / d;
    const p = v3(Math.sqrt(r * r - z * z), 0, z);
    for (const sign of [1, -1] as const) {
      const e = fieldAt({kind: 'offset', size: d, sign}, p);
      expect(norm(e)).toBeGreaterThan(0);
      expect(Math.abs(dot(e, p) / r)).toBeLessThan(1e-14);
    }
    expect(kase('inside', 'outside').checks[0].text).not.toContain('Every patch has field crossing it');
  });
  it('the inverse-square exception keeps its central point charge', () => {
    for (const q of [2, -3]) {
      const r = .7, h = 1e-5, enclosed = (x: number) => 4 * Math.PI * EPS0 * x * x * q / (x * x);
      expect(enclosed(r)).toBeCloseTo(q, 12);
      expect((enclosed(r + h) - enclosed(r - h)) / (2 * h)).toBeCloseTo(0, 9);
    }
    const power = kase('hard', 'backwards').checks.find(c => c.title === 'Other powers')!;
    expect(power.text).toContain('n>-2');
    expect(power.text).toContain('point charge');
  });
  it('states the open patch’s normal when a surface angle determines signed flux', () => {
    expect(fluxBank.find(q => q.id === 'flux-angle-to-surface')!.prompt).toContain('normal');
  });
  it('keeps the fictitious filled ball distinct from the empty real hole', () => {
    const why = holesBank.find(q => q.id === 'holes-whole-ball')!.choices.find(c => c.misconception === 'local-density')!.why!;
    expect(why).toContain('filled ball');
    expect(why).not.toContain('There is no charge at');
  });
  it('allows the field at a finite rod’s middle to point inward', () => {
    expect(kase('runs-out', 'rod').symmetry.caption).toContain('negative');
  });
  it('describes a negative line as inward as well as a positive one as outward', () => {
    expect(kase('symmetry', 'line').symmetry.caption).toContain('inward');
  });
});
