import {describe, expect, it} from 'vitest';
import {buildStages} from '../src/explorer/buildRun';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {artifactHtml, chained, lessonArtifact} from '../src/state/artifact';
import {alongIntegralOf, boardLines} from '../src/workbench/derivation';
/* THE OFFLINE COPY CARRIES THE METHOD, AND A WAY BACK.
 *
 * The copy went from the setup straight to the integral: on the ring no ΔQ = λR Δθ, no rᵢ, no cos α, no
 * word of what cancels; on the bisector nothing said E_y = 0. Those five steps are what the board writes
 * and what a problem set marks. It now builds the integral stage by stage from the board's own lines and
 * the run's own names and sentences, prints E_y's integral as the panel's answer sets it, keeps each
 * heading with what it heads across a page break, and prints the live lesson's address under its title. */
const tex = (html: string) => [...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
const plain = (t: string) => t.replace(/\\htmlClass\{[^{}]*\}/g, '').replace(/\\colon/g, ':');
const between = (html: string, from: string, to: string) => html.slice(html.indexOf(from), html.indexOf(to));
const lessons = [...PROBLEMS, getProblem('infinite', 'limit')];

describe('the copy builds the integral as the board does', () => {
  it('a section between the setup and the integral, one heading per stage of the run, in order', () => {
    for (const p of lessons) {
      const html = artifactHtml(lessonArtifact(p)), at = (s: string) => html.indexOf(s);
      expect(at('<h2>Building the integral</h2>'), p.id).toBeGreaterThan(at('<h2>Setup</h2>'));
      expect(at('<h2>Building the integral</h2>'), p.id).toBeLessThan(at('<h2>The integral'));
      const section = between(html, '<h2>Building the integral</h2>', '<h2>The integral');
      const names = [...section.matchAll(/<h3>([^<]*)<\/h3>/g)].map(m => m[1]);
      expect(names, p.id).toEqual(buildStages(p.id === 'infinite' ? getProblem('infinite') : p).map(s => s.name.replace(/&/g, '&amp;')));
    }
  });
  it('each stage prints the board’s own lines, its cancellation and its glosses, with nothing left to light', () => {
    for (const p of PROBLEMS) {
      const html = artifactHtml(lessonArtifact(p)), section = between(html, '<h2>Building the integral</h2>', '<h2>The integral');
      const shown = tex(section).join('\n');
      for (const line of boardLines(p)) {
        expect(shown, `${p.id}/${line.key}`).toContain(plain(line.tex).slice(plain(line.tex).search(/=|\\approx/)));
        for (const t of [line.where, line.merged, line.cancels, line.also]) if (t) expect(shown, `${p.id}/${line.key}`).toContain(plain(t));
      }
      expect(section, p.id).not.toMatch(/htmlClass|katex-error|\\colon/);
      // The bounds' colon is punctuation, set tight.
      expect(section, p.id).toMatch(/<mo lspace="0em" rspace="0\.1667em">:<\/mo>/);
    }
  });
  it('the line’s second half is a row of one chain under its first, never a phantom over a blank', () => {
    for (const p of PROBLEMS) {
      const html = artifactHtml(lessonArtifact(p));
      expect(tex(html).join('\n'), p.id).not.toMatch(/\\phantom\{[A-Za-z_]*\}=/);
    }
    expect(chained(String.raw`E_x=\int A`, String.raw`\phantom{E_x}=\int B`)).toBe(String.raw`\begin{aligned}E_x&=\int A\\[0.75em]&=\int B\end{aligned}`);
    expect(chained(String.raw`E_z=\sum_i A`, String.raw`\begin{aligned}\phantom{E_z}&=B\\[1.32em]\phantom{E_z}&=C\end{aligned}`))
      .toBe(String.raw`\begin{aligned}E_z&=\sum_i A\\[0.75em]&=B\\[0.75em]&=C\end{aligned}`);
    expect(chained(String.raw`E_x\approx\sum_i A`)).toBe(String.raw`E_x\approx\sum_i A`);
  });
  it('E_y’s integral, where it survives, as the panel’s answer sets it, after the board’s last line', () => {
    for (const id of ['endpoint', 'ramp', 'semi'] as const) {
      const p = getProblem(id), html = artifactHtml(lessonArtifact(p)), section = between(html, '<h3>Shrink them</h3>', '<h2>The integral');
      expect(tex(section), id).toContain(alongIntegralOf(p)!.tex);
      expect(section, id).toMatch(/The other component, /);
    }
    for (const id of ['bisector', 'ring', 'arc', 'disk']) expect(artifactHtml(lessonArtifact(getProblem(id))), id).not.toMatch(/The other component, /);
  });
  it('the run’s sentence leads each stage, except where the board already says in full that nothing cancels', () => {
    const p = getProblem('bisector'), html = artifactHtml(lessonArtifact(p));
    for (const s of buildStages(p)) expect(html, s.key).toContain(`<h3>${s.name}</h3>\n<p class="gloss">`);
    const end = artifactHtml(lessonArtifact(getProblem('endpoint')));
    expect(end).toMatch(/<h3>What cancels<\/h3>\n<p class="aside">Nothing cancels/);
  });
});
describe('the copy prints as a handout', () => {
  it('every heading is kept with the block under it, and the footer closes the sources', () => {
    for (const p of PROBLEMS) {
      const html = artifactHtml(lessonArtifact(p));
      for (const h2 of html.matchAll(/<h2>([^<]*)<\/h2>/g)) expect(html.slice(h2.index - 18, h2.index), `${p.id}: ${h2[1]}`).toBe('<div class="keep">');
      expect(html, p.id).toMatch(/<div class="keep"><h2>Sources<\/h2>\n<ul class="sources">[\s\S]*?<\/ul>\n<footer>[^<]*<\/footer><\/div>/);
      expect(html, p.id).toMatch(/\.keep \{ break-inside: avoid; \}/);
    }
  });
  it('the live lesson’s address is printed under the title, when the page hands it over', () => {
    const p = getProblem('arc'), url = 'https://field.malekswilam.dev/?p=arc&phi=90deg&Q=-2';
    const html = artifactHtml(lessonArtifact(p, p, url));
    const address = /<p class="address">([\s\S]*?)<\/p>/.exec(html)![1];
    expect(address).toContain(`<a href="https://field.malekswilam.dev/?p=arc&amp;phi=90deg&amp;Q=-2">https://field.malekswilam.dev/?p=arc&amp;phi=90deg&amp;Q=-2</a>`);
    expect(html.indexOf('<p class="address">')).toBeGreaterThan(html.indexOf('<p class="lede">'));
    expect(html.indexOf('<p class="address">')).toBeLessThan(html.indexOf('<h2>Setup</h2>'));
    expect(artifactHtml(lessonArtifact(p))).not.toMatch(/class="address"/);
  });
});
