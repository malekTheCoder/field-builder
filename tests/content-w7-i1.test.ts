import {describe, expect, it} from 'vitest';
import {lessonFor} from '../src/lessons';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {symbolsHtml} from '../src/state/artifact';
import {confusionTex} from '../src/symbolic/equivalence';
import {limitPlot} from '../src/symbolic/physics';
/* WAVE 7 · CONTENT, ROUND ONE: THE FOUR NEW LESSONS SPEAK OF THEMSELVES.
 *
 * The semicircle with uneven charge borrowed the even arc's notes whole: a piece "carries λR dθ", a λ it never
 * defines, and pieces beyond a quarter turn, "which only an arc wider than a semicircle has". Its projection and
 * the shell's were graded as "The factor cos α" where nothing named α. The shell's inside answer was labelled
 * "…, z < R", which "Easy to confuse with" read as the symbol R: "R ≠ kQ/z²". Its confusions set "sin θz" and
 * "dQR". The annulus called its thin rings "thin annuli" in a lesson about the annulus. The rod off its middle
 * called the rod level with its end "the end-on rod", the site's name for the axial one, and its symmetry text
 * had a sentence no one could read aloud. The copy set its checks' Latin symbols upright. */
const fields = (p: Problem) => p.steps.flatMap(s => s.fields ?? []);
const notes = (p: Problem) => fields(p).flatMap(f => (f.mistakes ?? []).map(m => ({label: f.label, ...m})));
const lessonText = (id: string) => lessonFor(id as Problem['id'])!.sections.flatMap(s => s.body).map(b => typeof b === 'string' ? b : b.tex).join('\n');
const plain = (s: string) => s.replace(/ /g, ' ');

describe('the semicircle with uneven charge', () => {
  const p = getProblem('uneven-arc');
  it('never speaks of a uniform λ or of an arc wider than a semicircle', () => {
    for (const n of notes(p)) {
      expect(plain(n.message), n.expression).not.toMatch(/λR dθ|λ dθ|wider than a semicircle/);
    }
    const dtheta = notes(p).find(n => n.expression === 'dtheta')!;
    expect(plain(dtheta.message)).toContain('λ₀ cos θ R dθ');
    const x = notes(p).find(n => n.expression === 'dE*cos(theta)')!;
    expect(plain(x.message)).toMatch(/Every piece of the semicircle is within a quarter turn of \+x/);
  });
  it('grades its projection as the factor cos θ, the symbol its lesson uses', () => {
    expect(fields(p).find(f => f.id === 'projection')!.label).toBe('The factor cos θ');
  });
  it('gives its built-from-point-charges answer with its direction (merged with the signed-physics round)', () => {
    const half = p.limits.find(l => l.id === 'half')!;
    expect(half.answer).toBe('−πkQ/(4R²)');
    expect(half.choices).toContain(half.answer);
  });
  it('writes its total charge as an integral between the arc’s ends', () => {
    expect(lessonText('uneven-arc')).toContain(String.raw`Q=\int_{-\pi/2}^{\pi/2}\lambda_0\cos\theta\,R\,d\theta=2\lambda_0R`);
  });
});

describe('every lesson that grades a cos α says what α is', () => {
  it('in its setup or its lesson', () => {
    for (const p of PROBLEMS) {
      const projection = fields(p).find(f => f.id === 'projection');
      if (!projection || !/α/.test(projection.label)) continue;
      const lesson = lessonFor(p.id) ? lessonText(p.id) : '';
      expect(p.setup.includes(String.raw`\alpha`) || lesson.includes(String.raw`\alpha`), p.id).toBe(true);
    }
    expect(getProblem('shell').setup).toContain(String.raw`makes the angle $\alpha$ with the axis`);
    expect(lessonText('shell')).toContain(String.raw`\cos\alpha=(z-R\cos\theta)/r_i`);
  });
});

describe('the spherical shell', () => {
  const p = getProblem('shell');
  it('labels its inside answer with no condition that reads as a symbol', () => {
    const inside = fields(p).find(f => f.id === 'inside')!;
    expect(inside.label).toBe('Total z-component inside the shell');
    // A label ending in a lone capital is read by "Easy to confuse with" as the quantity's symbol.
    for (const f of fields(p)) expect(f.label, f.label).not.toMatch(/[<>=]\s*\S+$/);
  });
  it('sets its confusions in a textbook’s order: no sin θz, no dQR, no dQz', () => {
    for (const q of PROBLEMS) for (const n of notes(q)) {
      const tex = confusionTex(n.expression);
      expect(tex, `${q.id}: ${n.expression}`).not.toMatch(/\\sin \\theta [a-zA-Z]\b(?!\\)/);
      expect(tex, `${q.id}: ${n.expression}`).not.toMatch(/dQ [A-Za-z]/);
    }
  });
  it('brings the constant out in front of the integral, as it says', () => {
    const integrate = p.steps.find(s => s.kind === 'integrate')!;
    expect(integrate.worked![0].tex).toMatch(/^\\begin\{aligned\}E_z&=2\\pi k\\sigma R\^2\\int_0\^\\pi/);
  });
});

describe('the annulus', () => {
  const p = getProblem('annulus');
  it('calls its thin rings rings, not annuli', () => {
    for (const q of PROBLEMS) {
      for (const s of q.steps) {
        expect(plain(s.text), q.id).not.toMatch(/thin annulus/);
        expect(plain(s.hint), q.id).not.toMatch(/^An annulus is a narrow strip/);
      }
    }
    expect(plain(p.steps.find(s => s.kind === 'element')!.text)).toContain('Each thin ring is complete');
  });
  it('says which term becomes one with no hole, in the form on display', () => {
    const hole = plain(p.limits.find(l => l.id === 'hole')!.explanation);
    expect(hole).toContain('the first term, z/√(a² + z²), becomes z/√(z²) = 1');
    expect(lessonText('annulus')).toContain(String.raw`the first term, $z/\sqrt{a^2+z^2}$, becomes $z/\sqrt{z^2}=1$`);
  });
  it('reads the hole’s radius plainly, and warns that the Gauss lesson calls it b', () => {
    const run = plain(p.limits.find(l => l.id === 'infinite')!.explanation);
    expect(run).not.toMatch(/disk of radius a the hole took out/);
    expect(run).toMatch(/the hole’s radius is called b/);
    expect(lessonText('annulus')).toMatch(/whose hole has radius \$b\$/);
  });
});

describe('the rod off its middle', () => {
  const p = getProblem('offset');
  it('folds the rod in a sentence that can be read aloud', () => {
    expect(plain(p.symmetry.text)).not.toMatch(/reaching as far beyond/);
    expect(plain(p.symmetry.text)).toMatch(/Call m the nearer end’s distance from that level: the stretch from y = −m to y = m lands on itself/);
  });
  it('says that one piece’s part along the rod is not zero', () => {
    const zero = notes(p).find(n => n.label.startsWith('y-component integrand') && n.expression === '0')!;
    expect(plain(zero.message)).toMatch(/^Each piece’s part along the rod is not zero/);
  });
  it('names the rod level with its end as that, not as the end-on rod', () => {
    const plot = limitPlot(p, p.limits.find(l => l.id === 'end')!);
    expect(plot.y).not.toMatch(/end-on/);
    expect(plot.y).toBe('|E| ÷ field level with an end');
  });
  it('says how the far card’s two distances relate', () => {
    const plot = limitPlot(p, p.limits.find(l => l.id === 'far')!);
    expect(plain(plot.caption)).toMatch(/With it d ≫ L, since d = √\(r² \+ h²\)/);
    expect(plot.caption).not.toMatch(/\d/);
  });
  it('displays the integral its Eᵧ comes from', () => {
    expect(lessonText('offset')).toContain(String.raw`E_y=-\int_{y_1}^{y_2}\frac{k\lambda\,dy}{y^2+r^2}\cdot\frac{y}{\sqrt{y^2+r^2}}`);
  });
});

describe('the copy’s checks', () => {
  it('set their Latin symbols in the formulas’ italic, as the page does', () => {
    const html = symbolsHtml('Outside, the field is kQ/z², and inside, z < R.');
    expect(html).toContain('<span class="g">kQ</span>/<span class="g">z²</span>');
    expect(html).toContain('<span class="g">z</span> &lt; <span class="g">R</span>');
    expect(html).toMatch(/^Outside, the field/);
  });
  it('leave a lone a as a word unless it is held to a symbol, and operators upright', () => {
    expect(symbolsHtml('a uniform rod')).toBe('a uniform rod');
    expect(symbolsHtml('a ≪ L')).toContain('<span class="g">a</span>');
    expect(symbolsHtml('sin θ')).not.toContain('<span class="g">sin');
  });
  it('set a sentence written in $…$ as MathML', () => {
    expect(symbolsHtml('radius $a$')).toContain('<math');
  });
});
