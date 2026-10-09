import {describe, expect, it} from 'vitest';
import {artifactHtml, escapeHtml} from '../src/state/artifact';
import {getProblem} from '../src/problems/definitions';
import {resultLines} from '../src/workbench/derivation';

/** The copy the "Save an offline copy" item writes, for the lesson as the Explorer hands it over. */
const copyOf = (id: Parameters<typeof getProblem>[0]) => {
  const p = getProblem(id);
  return artifactHtml({title: p.title, subtitle: p.subtitle, setup: p.setup, coordinate: p.coordinate, integralTex: p.integralTex,
    results: resultLines(p), svg: '<svg class="cd-svg" viewBox="0 0 720 430"><circle r="2"/></svg>'});
};
/** The page with every `<annotation>` taken out: what a reader sees, not the TeX riding along. */
const shown = (html: string) => html.replace(/<annotation[\s\S]*?<\/annotation>/g, '');

describe('offline lesson artifact', () => {
  it('embeds the title, the figure and escaped text, on letter paper', () => {
    const html = artifactHtml({
      title: 'A line <of> charge',
      subtitle: 'Perpendicular bisector',
      setup: 'A thin rod of length L. <script>alert(1)</script>',
      integralTex: String.raw`E_x=\int dE_x`,
      results: [String.raw`E_x=\frac{kQ}{r}`],
      svg: '<svg class="cd-svg" viewBox="0 0 10 10"><circle r="2"/></svg>',
    });
    expect(html).toContain(escapeHtml('A line <of> charge'));
    expect(html).toContain('size: letter');
    expect(html).toContain('<svg class="cd-svg"');
    expect(html).toContain(escapeHtml('<script>alert(1)</script>'));
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('sets the equations as MathML, not as TeX source in a box', () => {
    const html = copyOf('bisector');
    expect(html).toContain('<math');
    // The TeX survives only as the annotation inside each formula, for copying; none is on show.
    expect(shown(html)).not.toMatch(/\\frac|\\int|\\sqrt/);
    expect(html).not.toContain('<pre>');
  });

  it('prints no parameter list and no numbers: the page itself prints none', () => {
    const html = copyOf('bisector');
    expect(html).not.toMatch(/Parameters/);
    expect(html).not.toMatch(/<li>/);
    expect(html).not.toMatch(/3\.14159/);
    // Outside the mathematics, the only figures are in the stylesheet and the setup's own words.
    const prose = shown(html).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<math[\s\S]*?<\/math>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '');
    const setup = getProblem('bisector').setup;
    const words = prose.replace(escapeHtml(setup), '').replace(/<[^>]*>/g, ' ');
    expect(words).toMatch(/Field on the bisector/);
    expect(words).not.toMatch(/\d/);
  });

  it('gives every line of the result, so the rod seen off its end keeps its E_y', () => {
    const html = copyOf('endpoint');
    const annotations = [...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)].map(m => m[1]);
    expect(annotations.some(t => t.startsWith('E_x'))).toBe(true);
    expect(annotations.some(t => t.startsWith('E_y'))).toBe(true);
    expect(copyOf('semi')).toMatch(/<annotation encoding="application\/x-tex">E_y/);
  });
});
