import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {buildStages} from '../src/explorer/buildRun';
import {lessonFor} from '../src/lessons';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {artifactHtml, lessonArtifact, mathml} from '../src/state/artifact';
/* WAVE 5 · CONTENT: THE METHOD ONCE, THE ROUTES NAMED, AND THE WORDS THAT SAID MORE THAN IS TRUE.
 *
 * A copy led by a lesson taught the five stages, then printed Setup and Building the integral with the same five
 * headings again, and OpenStax twice: a second pass a student read as a second method. The infinite line's
 * finite-rod route printed its integral in L straight after a build by angle, with nothing saying they were two
 * routes. "cos" touched the fraction bar before it wherever the board lit cos α as one factor. The tour said
 * mirror pairs cancel the sideways parts "in every lesson", the classic slip on the rods that have no mirror.
 * And smaller things: integral quotients set as sans text, a ring called a piece, a setup that put an upright
 * rod "on the x-axis", and a formula run into the next sentence's symbol. */
const plain = (s: string) => s.replace(/\u00a0/g, ' ');
const count = (html: string, s: string) => html.split(s).length - 1;
const led = PROBLEMS.filter(p => lessonFor(p.id));

describe('a copy led by a lesson teaches the method once', () => {
  it('there is a lesson to test against', () => expect(led.length).toBeGreaterThan(0));
  it('each stage heading once, no build and no second Setup, the problem boxed once', () => {
    for (const p of led) {
      const html = artifactHtml(lessonArtifact(p));
      expect(html, p.id).not.toContain('<h2>Building the integral</h2>');
      expect(html, p.id).not.toContain('<h2>Setup</h2>');
      expect(count(html, '<p class="problem">'), p.id).toBe(1);
      for (const s of buildStages(p)) expect(count(html, `>${s.name}</h3>`), `${p.id}: ${s.name}`).toBeLessThanOrEqual(1);
      // The integral, its working, its result and its checks all stay.
      for (const h of ['<h2>The integral', '<h2>The result</h2>', '<h2>Checks</h2>']) expect(html, `${p.id}: ${h}`).toContain(h);
    }
  });
  it('no address is listed twice, and every source is still there, with the lesson’s books', () => {
    for (const p of led) {
      const html = artifactHtml(lessonArtifact(p)), books = html.slice(html.indexOf('Read it in a textbook</h3>'), html.indexOf('</section>'));
      expect(html, p.id).not.toContain('<h2>Sources</h2>');
      for (const href of new Set([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]))) expect(count(html, `href="${href}"`), `${p.id}: ${href}`).toBe(1);
      // A source whose section a lesson row already names (the potentials' §7.4) is that row, not a second line.
      for (const s of p.sources) {
        const section = /§\d+\.\d+/.exec(s.title)?.[0];
        if (section && lessonFor(p.id)!.read.some(r => r.where.includes(section))) expect(books, `${p.id}: ${s.title}`).toContain(section);
        else expect(books, `${p.id}: ${s.title}`).toContain(`href="${s.url}"`);
      }
    }
  });
  it('k is said once: where the lesson says it, or under the integral', () => {
    for (const p of led) {
      const html = artifactHtml(lessonArtifact(p));
      const inLesson = /k=1\/\(4\\pi\\varepsilon_0\)|k=\\[dt]?frac\{1\}\{4\\pi\\varepsilon_0\}/.test(html.slice(0, html.indexOf('</section>')));
      expect(count(html, '<p class="where">Here '), p.id).toBe(inLesson ? 0 : 1);
    }
  });
  it('a copy with no lesson is as it was: Setup, the build, Sources', () => {
    const p = PROBLEMS.find(q => !lessonFor(q.id));
    if (!p) return;
    const html = artifactHtml(lessonArtifact(p));
    for (const h of ['<h2>Setup</h2>', '<h2>Building the integral</h2>', '<h2>Sources</h2>']) expect(html, h).toContain(h);
    expect(html).not.toContain('<p class="problem">');
  });
});

describe('the infinite line’s two routes are said to be two', () => {
  it('the finite-rod route says it is one, under its integral; the angular route says nothing', () => {
    const limit = getProblem('infinite', 'limit'), angular = getProblem('infinite');
    const html = artifactHtml(lessonArtifact(limit)), integral = html.slice(html.indexOf('<h2>The integral'), html.indexOf('<h2>Working</h2>'));
    expect(integral).toMatch(/<p class="note route">This is the finite-line route: start with a rod of length/);
    expect(integral).toMatch(/both routes arrive at the same field\./);
    // Under the integral it introduces, not over it.
    expect(integral.indexOf('lim_')).toBeLessThan(integral.indexOf('class="note route"'));
    expect(artifactHtml(lessonArtifact(angular))).not.toContain('class="note route"');
    for (const p of PROBLEMS) expect(lessonArtifact(p).route, p.id).toBeUndefined();
  });
});

describe('an operator name after a fraction is set off from it', () => {
  it('cos lit as one factor, after the fraction bar', () => {
    expect(mathml(String.raw`\Delta E_x=\frac{k\,\Delta Q}{r_i^2}{\cos\alpha}`)).toMatch(/<\/mfrac><mspace width="0\.1667em"\/><mrow><mi>cos<\/mi>/);
    // And after a relation it follows on directly, as TeX sets it.
    expect(mathml(String.raw`x={\cos\alpha}`)).not.toMatch(/<mo>=<\/mo><mspace/);
  });
  it('in the bisector’s copy, nowhere does cos touch a fraction', () => {
    expect(artifactHtml(lessonArtifact(getProblem('bisector')))).not.toMatch(/<\/mfrac>(?:<mrow>)?<mi>cos<\/mi>/);
  });
});

describe('the tour says pairs cancel only where there are pairs', () => {
  const tour = readFileSync(new URL('../src/components/Onboarding.tsx', import.meta.url), 'utf8');
  const sum = /\{id:'sum',title:'[^']*',description:'([^']*)'/.exec(tour)![1];
  it('names the rod it draws, and what happens with no mirror', () => {
    expect(sum).not.toMatch(/In every lesson/);
    expect(sum).toMatch(/On this rod the pieces come in mirror pairs/);
    expect(sum).toMatch(/no mirror about P, as on a rod level with its end, both parts survive/);
    expect(sum).toMatch(/Each lesson’s Watch it build plays its own argument/);
  });
  it('the laws page shows the two laws its title names', () => {
    expect(tour).toMatch(/<Laws lede=\{false\} only=\{\['coulomb','superposition'\]\}\/>/);
  });
});

describe('the lessons’ words', () => {
  it('the ramp’s limits say their integrals in words', () => {
    for (const l of getProblem('ramp').limits) expect(l.explanation, l.id).not.toMatch(/[∫ᴸ]/);
    const moment = plain(getProblem('ramp').limits.find(l => l.id === 'moment')!.explanation);
    expect(moment).toMatch(/ȳ = 2L\/3 is the centre of charge, the charge-weighted average height: the density magnitude grows toward the top, so the average sits above the middle\./);
  });
  it('the arc’s semicircle card is about the plot it draws', () => {
    const half = getProblem('arc').limits.find(l => l.mode === 'half')!;
    expect(half.title).toBe('A semicircle, built from point charges');
    expect(plain(half.explanation)).toMatch(/^Open the arc to a semicircle, φ = π, and build it from N point charges\. One, at the arc’s middle, gives magnitude k\|Q\|\/R², stronger than the semicircle’s field by a factor π\/2/);
    expect(half.explanation).not.toMatch(/familiar/);
  });
  it('the disk, the sheet and the disk’s potential call their unit a ring', () => {
    for (const id of ['disk', 'sheet', 'v-disk'] as const) {
      const labels = getProblem(id).steps.flatMap(s => s.fields ?? []).map(f => f.label);
      expect(labels, id).toContain('A ring’s charge dQ');
      expect(labels, id).toContain('Ring-to-P distance rᵢ');
      expect(labels.join(' '), id).not.toMatch(/A piece’s charge|Piece-to-P/);
    }
    const rod = getProblem('bisector').steps.flatMap(s => s.fields ?? []).map(f => f.label);
    expect(rod).toContain('A piece’s charge dQ');
  });
  it('an upright rod stands on the y-axis', () => {
    for (const id of ['endpoint', 'ramp'] as const) {
      expect(getProblem(id).setup, id).toMatch(/stands upright on the \$y\$-axis, its lower end at the origin/);
      expect(getProblem(id).setup, id).not.toMatch(/on the \$x\$-axis at the origin/);
    }
  });
  it('no sentence of the bisector’s working opens on a symbol after a formula', () => {
    const steps = getProblem('bisector').steps.flatMap(s => s.worked ?? []).map(w => w.text);
    expect(steps.join(' ')).toMatch(/Using \$Q=\\lambda L\$ gives the answer in \$Q\$\. The component \$E_x\$ can come out negative/);
    expect(steps.join(' ')).not.toMatch(/\$\. \$/);
  });
});
