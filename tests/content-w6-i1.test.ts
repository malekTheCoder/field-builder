import {describe, expect, it} from 'vitest';
import {LESSON_LIST as LESSONS, lessonFor} from '../src/lessons';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {artifactHtml, lessonArtifact, proseHtml} from '../src/state/artifact';
import {field, K, limitPlot, sampleLimit} from '../src/symbolic/physics';
/* WAVE 6 · CONTENT, ROUND ONE: THE HANDOUT STATES ITS PROBLEM FIRST, AND THE BOOKS ARE CITED ONE WAY.
 *
 * The offline copy printed the problem box after the whole lesson and its reading list; "$x$-axis" broke as
 * "x" / "-axis"; OpenStax was listed twice in the potentials, in two styles; v-ring's working printed its
 * result a third time. Griffiths' line segment was cited by its 3rd-edition example number, and §2.1.4 under
 * three names. The semi-infinite line's lead never said what is found, and its only limiting case was a flat
 * line on its reference. And small inconsistencies: the gradient step in two places, two names for one step,
 * a limit title in two sentences, the ramp contradicting itself on where its field is weaker. */
const p0 = {...DEFAULT_PARAMS, distance: 1.5};
const led = PROBLEMS.filter(p => lessonFor(p.id));

describe('the copy', () => {
  it('states the problem, after the figure, before the lesson that solves it', () => {
    for (const p of led) {
      const html = artifactHtml(lessonArtifact(p));
      const problem = html.indexOf('<p class="problem">'), lesson = html.indexOf('<section class="lesson">');
      expect(problem, p.id).toBeGreaterThan(0);
      expect(problem, p.id).toBeLessThan(lesson);
    }
  });
  it('holds a hyphenated tail with its symbol', () => {
    const html = proseHtml('P is on the $x$-axis, and the $xy$-plane.');
    expect(html).toMatch(/<span class="nobr">(?:(?!<\/span>)[\s\S])*?<\/math><\/span>-axis,<\/span>/);
    expect(html).toMatch(/<span class="nobr">(?:(?!<\/span>)[\s\S])*?<\/math><\/span>-plane\.<\/span>/);
    expect(html).not.toMatch(/-axis,-axis|-plane\.-plane/);
    expect(html.match(/-axis/g)).toHaveLength(1);
  });
  it('lists each book once, in the lesson rows’ style', () => {
    for (const p of led) {
      const html = artifactHtml(lessonArtifact(p));
      const books = html.slice(html.indexOf('Read it in a textbook</h3>'), html.indexOf('</section>'));
      const items = books.split('<li>').slice(1);
      expect(items.filter(i => i.includes('OpenStax')).length, `${p.id}: OpenStax rows`).toBeLessThanOrEqual(p.id === 'sheet' ? 2 : 1);
      // No source line in the problems' "Publisher · Book" hand.
      expect(books, p.id).not.toContain(' · ');
      for (const i of items) expect(i, p.id).toMatch(/<cite>/);
    }
  });
  it('v-ring prints its potential once in the working and once as the result, not twice in a row', () => {
    const html = artifactHtml(lessonArtifact(getProblem('v-ring')));
    const working = html.slice(html.indexOf('<h2>Working</h2>'), html.indexOf('<h2>The result</h2>'));
    expect(working).toContain('The potential is even in');
    // The remark survives, the restated V does not: the working's last display is only V(0) = kQ/R.
    const lastStep = working.slice(working.lastIndexOf('<div class="step">'));
    expect(lastStep).toContain('<math');
    expect(lastStep).not.toMatch(/<msqrt>/);
  });
});

describe('the textbooks are cited one way', () => {
  const griffiths = LESSONS.flatMap(l => l.read.filter(r => r.book.startsWith('Griffiths')).map(r => [l.id, r.where] as const));
  it('Griffiths’ line segment is Example 2.2 of the current editions', () => {
    const bisector = griffiths.find(([id]) => id === 'bisector')![1];
    expect(bisector).toMatch(/Example 2\.2/);
    expect(bisector).toMatch(/Example 2\.1 in the 3rd edition/);
  });
  it('each Griffiths section has one name', () => {
    for (const [id, where] of griffiths) {
      if (where.includes('§2.1')) expect(where, id).toMatch(/^§2\.1\.4, (Continuous Charge Distributions|Example 2\.2)/);
      if (where.includes('§2.3')) expect(where, id).toBe('§2.3, Electric Potential');
    }
    const openstax = LESSONS.flatMap(l => l.read.filter(r => r.book.startsWith('OpenStax')).map(r => r.where));
    for (const w of openstax) expect(w).not.toContain('; and §');
  });
});

describe('the lessons', () => {
  it('every lead says what is found', () => {
    for (const l of LESSONS) expect(l.lead, l.id).toMatch(/^Find the (field|potential)/);
  });
  it('the four potentials that differentiate back do so before saying what the answer says', () => {
    for (const id of ['v-ring', 'v-disk', 'v-rod-bisector', 'v-rod-axial']) {
      const h = lessonFor(id as never)!.sections.map(s => s.heading);
      expect(h.indexOf('Differentiate back'), id).toBeGreaterThan(0);
      expect(h.indexOf('Differentiate back'), id).toBe(h.indexOf('What the answer says') - 1);
      expect(h.at(-1), id).toBe('What the answer says');
    }
  });
  it('one step, one name: nothing cancels', () => {
    for (const l of LESSONS) expect(l.sections.map(s => s.heading), l.id).not.toContain('Nothing to cancel');
  });
  it('the arc’s field points away from its middle, not "away from the arc"', () => {
    const arc = lessonFor('arc')!.sections.find(s => s.heading === 'What the answer says')!.body.filter(b => typeof b === 'string').join(' ');
    expect(arc).not.toMatch(/away from the arc;/);
    expect(arc).toMatch(/away from the middle of the arc/);
  });
});

describe('the problems’ words', () => {
  it('limit titles are one phrase', () => {
    for (const p of PROBLEMS) for (const l of p.limits) expect(l.title, `${p.id}/${l.id}`).not.toMatch(/\.\s+\S/);
  });
  it('the ramp says its E_x is weaker at every distance, nowhere only "up close"', () => {
    const ramp = getProblem('ramp'), all = JSON.stringify(ramp);
    expect(all).not.toMatch(/weaker up close|up close \$E_x\$ is weaker/);
    expect(all).toMatch(/at every distance/);
    // And it is: the ramp's E_x over a uniform rod's of the same Q is 2c/(1 + c) < 1, c = r/√(L² + r²).
    for (const r of [0.05, 0.5, 2, 20]) {
      const L = 1, s = Math.hypot(L, r), ramped = (1 - r / s) / L, uniform = L / (2 * r * s);
      expect(ramped / uniform).toBeLessThan(1);
    }
  });
  it('another lesson is named by its title in quotes', () => {
    const endpoint = getProblem('endpoint').limits.find(l => l.mode === 'infinite')!;
    expect(endpoint.explanation).toContain('the lesson “Field level with the end of a semi-infinite line”');
    expect(getProblem('semi').title).toBe('Field level with the end of a semi-infinite line');
  });
});

describe('the semi-infinite line has a case that converges', () => {
  const semi = getProblem('semi'), limit = semi.limits.find(l => l.mode === 'infinite')!;
  it('a rod of length L beside its end, growing into the line', () => {
    expect(limit).toBeDefined();
    expect(limit.title).toBe('Near the end of a long rod');
    const plot = limitPlot(semi, limit);
    expect(plot.line).toBe('semi-infinite line');
    expect(plot.solid).toBe('A rod of length L');
    const err = (t: number) => {const s = sampleLimit(semi, p0, limit, t); return Math.abs(s.actual / s.target - 1);};
    expect(err(30)).toBeLessThan(err(3));
    // E_y closes as r/L, so at L = 30r the rod is within a couple of per cent.
    expect(err(30)).toBeLessThan(.02);
    // The target is the line's own field, √2 k|λ|/r, with the slider read as λ.
    expect(sampleLimit(semi, p0, limit, 12).target).toBeCloseTo(Math.SQRT2 * K * p0.charge * 1e-9 / p0.distance, 12);
  });
  it('the explanation’s rod formulas are the rod’s field', () => {
    // E_x = kλL/(r√(L² + r²)), E_y = −kλ(1/r − 1/√(L² + r²)) for the rod level with its end.
    const lambda = 0.7, r = 1.3, L = 5.1, endpoint = field('endpoint', {...p0, charge: lambda * L, size: L, distance: r});
    const s = Math.hypot(L, r), k = K * lambda * 1e-9;
    expect(endpoint.x).toBeCloseTo(k * L / (r * s), 9);
    expect(endpoint.y).toBeCloseTo(-k * (1 / r - 1 / s), 9);
  });
});
