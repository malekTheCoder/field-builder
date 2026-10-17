import {describe, expect, it} from 'vitest';
import {buildStages, motionAt, stageAt, stageStart, totalSeconds} from '../src/explorer/buildRun';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {isReady} from '../src/problems/readiness';
import {sampleDistribution} from '../src/diagrams/sampling';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {exactSum} from '../src/workbench/derivation';
/* The choreography, checked as choreography.
 *
 * "Watch it build" is one animation that has to make one argument, in order: cut it up, look at
 * a piece, watch what cancels, add what is left, then shrink the pieces away. Every one of those
 * frames existed before, scattered across four controls in four places, which is exactly why
 * nobody found the argument. Keeping the script as data means these checks can read it without
 * running it, and a future retiming cannot quietly drop a stage or put them out of order. */
const ORDER = ['pieces', 'one', 'cancel', 'add', 'limit'];
describe('the build sequence tells the same story for every lesson', () => {
 for (const problem of PROBLEMS) {
  const stages = buildStages(problem);
  it(`${problem.id}: five stages, in the one order that makes the argument`, () => {
   expect(stages.map(s => s.key)).toEqual(ORDER);
   for (const s of stages) {
    expect(s.seconds, `${s.key} must hold the screen`).toBeGreaterThan(1);
    expect(s.name.length, `${s.key} needs a name for its marker`).toBeGreaterThan(2);
    // Long enough to say something, short enough to read while the figure moves.
    expect(s.caption.length).toBeGreaterThan(40);
    expect(s.caption.length).toBeLessThan(340);
   }
  });
  it(`${problem.id}: the pieces are only cut finer at the end`, () => {
   // The limit is the last idea, not a thing happening quietly under the earlier ones. If the
   // partition drifted during the cancellation stage, the two pieces being compared would not
   // be the same two pieces by the end of it.
   for (const s of stages.slice(0, -1)) expect(s.continuum, s.key).toEqual([0, 0]);
   expect(stages[4].continuum).toEqual([0, 1]);
  });
  it(`${problem.id}: the sum is drawn only while it is being added`, () => {
   expect(stages[3].sum).toEqual([0, 1]);
   expect(stages[3].mode).toBe('sum');
   for (const s of [stages[0], stages[1], stages[2]]) expect(s.sum[0]).toBe(s.sum[1]);
  });
 }
 it('only the geometries whose figure draws a mirror partner ask for one', () => {
  // Mirrors `supportsPair` in ChargeDiagram. Asking for a partner the figure will not draw
  // would leave the cancellation stage sitting on an unchanged picture for four seconds --
  // which is worse than not claiming anything, because the caption claims something.
  // The potential lessons with a partner at the same distance ask for one too: there the partner
  // ADDS, which is the contrast with the field. `tests/build-ui.browser.test.tsx` checks the figure
  // really lights it, so this list cannot promise a partner the drawing does not show.
  const asks = PROBLEMS.filter(p => buildStages(p)[2].pair).map(p => p.id).sort();
  expect(asks).toEqual(['arc', 'bisector', 'infinite', 'offset', 'ring', 'uneven-arc', 'v-arc', 'v-ring', 'v-rod-bisector']);
 });
 it('a scalar lesson never claims anything cancels', () => {
  // V is a number. There is no direction to cancel, and saying otherwise would teach the one
  // confusion these lessons exist to prevent.
  for (const p of PROBLEMS.filter(p => p.quantity === 'V')) {
   const stage = buildStages(p)[2];
   expect(stage.caption, p.id).toMatch(/nothing cancels|already cancelled/i);
   // A partner may be shown, but only ever as something that adds.
   if (stage.pair) expect(stage.caption, p.id).toMatch(/adds/);
  }
 });
 it('a scalar lesson never talks about arrows', () => {
  // A potential has no direction, so a caption about arrows bending or a chain of arrows is not
  // a simplification of the truth, it is a different lesson. The run used to tell it anyway.
  for (const p of PROBLEMS.filter(p => p.quantity === 'V')) for (const stage of buildStages(p)) {
   // The phrases that ASSERT arrows are being added, not the word itself: "V is a number, not an
   // arrow" is exactly right and a ban on the word would reject it.
   expect(stage.caption, `${p.id} · ${stage.key}`).not.toMatch(/each arrow|chain of arrows|arrow starting|bends the way|what survives/i);
  }
 });
 it('every lesson a reader can actually open runs for about half a minute, as the button says', () => {
  for (const p of PROBLEMS.filter(p => isReady(p.id))) {
   const total = totalSeconds(buildStages(p));
   expect(total, p.id).toBeGreaterThan(20);
   expect(total, p.id).toBeLessThan(36);
  }
 });
 it('the line shown while a stage plays can be read before the stage is over', () => {
  // The run used to carry only its long captions, two or three sentences on a three-second stage,
  // so it had always moved on before anyone finished reading. Each stage now has one short line
  // for reading while it moves, held to subtitle pace: 17 characters a second is the ceiling the
  // subtitling guides give for adult viewers, and these readers are watching a figure as well.
  for (const p of PROBLEMS) for (const s of buildStages(p)) {
   expect(s.line.length, `${p.id} · ${s.key}`).toBeGreaterThan(30);
   expect(s.line.length / s.seconds, `${p.id} · ${s.key}: "${s.line}"`).toBeLessThanOrEqual(17);
   // One sentence, or two very short ones -- never the paragraph it replaced.
   expect(s.line.length, `${p.id} · ${s.key}`).toBeLessThan(s.caption.length);
  }
 });
 it('every stage lights the factor it puts into the integral, and a potential lights no angle', () => {
  for (const p of PROBLEMS) {
   const terms = buildStages(p).map(s => s.term);
   expect(terms.slice(0, 2), p.id).toEqual(['element', 'distance']);
   expect(terms[2], p.id).toBe(p.quantity === 'V' ? '' : 'projection');
   expect(terms[3], p.id).toBe('bounds');
  }
 });
 it('motion fills its share of a stage and then holds the finished frame', () => {
  for (const s of buildStages(getProblem('bisector'))) {
   expect(s.moves, s.key).toBeGreaterThan(0);
   expect(s.moves, s.key).toBeLessThanOrEqual(1);
   expect(motionAt(s, 0), s.key).toBe(0);
   expect(motionAt(s, s.moves), s.key).toBeCloseTo(1, 12);
   expect(motionAt(s, 1), s.key).toBe(1);
   // Never backwards: a run that is moving forwards must not undo what it has drawn.
   let last = 0;
   for (let t = 0; t <= 1; t += .01) { const m = motionAt(s, t); expect(m, `${s.key} at ${t}`).toBeGreaterThanOrEqual(last - 1e-12); last = m; }
  }
 });
});
describe('finding a moment in the run', () => {
 const stages = buildStages(getProblem('bisector'));
 it('starts on the first frame of the first stage', () => {
  expect(stageAt(stages, 0)).toMatchObject({index: 0, local: 0});
 });
 it('each stage starts exactly where the last one ended', () => {
  let t = 0;
  stages.forEach((s, i) => {
   expect(stageStart(stages, i)).toBeCloseTo(t, 6);
   // The instant a stage begins belongs to that stage, not to the one before it.
   expect(stageAt(stages, t).index).toBe(i);
   expect(stageAt(stages, t).local).toBeCloseTo(0, 6);
   // And the instant before it belongs to the previous one, finished.
   if (i > 0) expect(stageAt(stages, t - 1e-6).index).toBe(i - 1);
   t += s.seconds;
  });
 });
 it('settles on the finished last stage rather than wrapping round', () => {
  // A run that overshoots its final frame -- a dropped frame, a slow tab -- must end on the
  // integral. Wrapping to zero would snap the figure back to the first cut at the exact moment
  // the reader is looking at the answer.
  const total = totalSeconds(stages);
  for (const t of [total, total + .5, total * 3]) {
   expect(stageAt(stages, t)).toMatchObject({index: stages.length - 1, local: 1});
  }
 });
});
/* The run's captions make quantitative claims, and a caption is the one place a reader takes a
 * number on trust. Each claim is checked here against the samplers the figure actually draws,
 * so rewording a caption cannot quietly make it false, and a change to a partition cannot
 * quietly falsify a caption. */
describe('what the captions claim is what the samplers do', () => {
 const n = 5, P = DEFAULT_PARAMS;
 const size = (v: {x: number; y: number; z: number}) => Math.hypot(v.x, v.y, v.z);
 for (const id of ['infinite', 'semi'] as const) {
  it(`${id}: every piece, cut at an equal angle, contributes exactly as much`, () => {
   const pushes = sampleDistribution(id, P, n).map(s => size(s.field));
   for (const push of pushes) expect(push / pushes[0]).toBeCloseTo(1, 9);
   expect(buildStages(getProblem(id))[1].caption).toMatch(/exactly as much at P/);
  });
 }
 it('sheet: the rings make a bigger field the further out they are', () => {
  // The claim the line lessons' story gets backwards. Cut at equal angles from P, contributions
  // go as sin(theta): 4.9, 14.2, 22.1, 27.9 and 30.9 percent at five pieces.
  const pushes = sampleDistribution('sheet', P, n).map(s => size(s.field));
  for (let i = 1; i < n; i++) expect(pushes[i], `ring ${i + 1} vs ring ${i}`).toBeGreaterThan(pushes[i - 1]);
  const total = pushes.reduce((a, b) => a + b, 0);
  expect(pushes[n - 1] / total).toBeGreaterThan(.3);
  expect(buildStages(getProblem('sheet'))[1].caption).toMatch(/bigger field at P, not a smaller one/);
  // Only when they are cut at equal angles: cut into rings of equal width, a sheet's contributions
  // peak at s = z/√2 and fall away beyond it. The short line read while the run moves says so too.
  expect(buildStages(getProblem('sheet'))[1].caption).toMatch(/same angle at P/);
  expect(buildStages(getProblem('sheet'))[1].line).toMatch(/^Cut at equal angles/);
  expect(buildStages(getProblem('sheet'))[2].caption).toMatch(/Cut at equal angles/);
 });
 it('sheet: cut at equal angles, its rings are not thin -- only thin in angle, which is what the run says', () => {
  // At five pieces the rings' edges are at about 0, 0.97, 2.18, 4.13 and 9.23 m with P 3 m up, and
  // the fifth never ends: "cut into thin rings, every bit of one ring the same distance from P" was
  // false of the outer ones. What holds is the bridge the unbounded lines take, made thin in ANGLE.
  const P3 = {...P, distance: 3};
  const edges = Array.from({length: n + 1}, (_, i) => 3 * Math.tan(Math.PI / 2 * i / n));
  expect(edges[3] - edges[2], 'the fourth ring is not thin').toBeGreaterThan(1.9);
  expect(sampleDistribution('sheet', P3, n).map(s => s.coordinate).at(-1)).toBeGreaterThan(edges[4]);
  const [cut] = buildStages(getProblem('sheet'));
  // The line goes on from the stage's name, "Cut it up.", rather than saying its verb again.
  // And why by angle at all: the sheet never ends, but seen from P its angles do.
  expect(cut.line).toBe('Rings of equal angle at P: the sheet never ends, but its angles do.');
  expect(cut.caption).toMatch(/same small angle at P/);
  // Nor does a thin angle put its bits nearly one distance from P: the fourth ring's run from 0.77
  // to 1.47 times its middle distance. What holds, the outermost too, is that its FIELD is nearly a
  // thin ring's.
  expect(cut.caption).toMatch(/nearly the field at P of a thin ring at its middle angle/);
  expect(cut.caption).not.toMatch(/bits are nearly the same distance/);
  for (const text of [cut.line, cut.caption]) expect(text).not.toMatch(/thin rings/);
  // The disk's rings are cut at equal widths, and it keeps its own words -- as the condition the limit
  // meets, not as a fact of the drawn rings: at three rings of R = 4 with P half a unit up, the inner one's
  // bits run from 0.5 to 1.42 from P.
  const [disk] = buildStages(getProblem('disk'));
  expect(disk.line).toMatch(/^The thinner a ring, the more nearly all of it is the same distance from P\./);
  expect(disk.caption).toMatch(/cutting the disk into thin rings/);
 });
 it('sheet: lifting P leaves the field unchanged, which the subtitle promises', () => {
  const at = (distance: number) => size(sampleDistribution('sheet', {...P, distance}, 4000).reduce(
   (sum, s) => ({x: sum.x + s.field.x, y: sum.y + s.field.y, z: sum.z + s.field.z}), {x: 0, y: 0, z: 0}));
  expect(at(6) / at(1.5)).toBeCloseTo(1, 3);
  expect(getProblem('sheet').subtitle).toMatch(/never changes/);
 });
 it('semi: with nothing to push back, the field leans at forty-five degrees', () => {
  const net = sampleDistribution('semi', P, 4000).reduce(
   (sum, s) => ({x: sum.x + s.field.x, y: sum.y + s.field.y, z: sum.z + s.field.z}), {x: 0, y: 0, z: 0});
  expect(Math.abs(net.x) / Math.abs(net.y)).toBeCloseTo(1, 2);
  expect(buildStages(getProblem('semi'))[2].caption).toMatch(/leans/);
 });
});
/* What the captions say about the argument itself, checked as claims: each of these was once
 * written false, in a sentence a confused reader would take on trust. */
describe('the captions say only what is true', () => {
 it('the rod seen end-on is not denied the symmetry that makes its field point along the axis', () => {
  // Turn it about P's line and nothing changes: no piece has a sideways part to begin with. The
  // caption it used to share said cancellation was "a gift of symmetry, and this geometry does not
  // have it" -- of the most symmetric rod in the library.
  const axial = buildStages(getProblem('axial'))[2].caption;
  expect(axial).not.toMatch(/does not have it/);
  expect(axial).not.toMatch(/symmetry, and this geometry/);
  expect(axial).toMatch(/no sideways parts/);
  // The rods level with one end really do lack a partner, and keep the note that says so.
  // And they say where the missing partner would be: below P's line. "The same side of P" meant
  // nothing -- P is a point.
  for (const id of ['endpoint', 'ramp'] as const) {
   const [, , cancel] = buildStages(getProblem(id));
   expect(cancel.caption, id).toMatch(/no piece has a mirror partner below it/);
   for (const text of [cancel.caption, cancel.line]) expect(text, id).not.toMatch(/same side of P/);
  }
 });
 it('the chain and the column are the sum of the N pieces, the field or potential only once they shrink', () => {
  // At a finite N the chain is the N-piece estimate the figure labels ΣΔE: a few percent off at five
  // pieces, and nearly three times the field at three pieces beside a long rod.
  // Except where it is not an estimate: see below.
  for (const p of PROBLEMS.filter(q => !exactSum(q))) {
   const add = buildStages(p)[3];
   for (const text of [add.line, add.caption]) {
    expect(text, `${p.id}: "${text}"`).toMatch(/sum/);
    expect(text, `${p.id}: "${text}"`).not.toMatch(/is the (field|potential) at P/);
    // A line that names the field or the potential says it is reached only as the pieces shrink, the
    // mirror-pair lines now among them: they ended on the lone middle piece and never said where the sum goes.
    if (text === add.caption || /field|potential/.test(text)) expect(text, `${p.id}: "${text}"`).toMatch(/(once|as) (they|the (piece|ring)s) shrink/);
   }
  }
 });
 it('a ring’s field, and a ring’s and an arc’s potential, are exact at any cut, and the run says so', () => {
  // Every piece is the same distance from P at the same angle, so the chain and the column are the
  // answer at three pieces as at thirty. "Once they shrink" taught that calculus corrects a ring's
  // answer -- the opposite of the ring's lesson.
  const P = DEFAULT_PARAMS;
  for (const id of ['ring', 'v-ring', 'v-arc'] as const) {
   const at = (n: number) => sampleDistribution(id, P, n).reduce((t, s) => t + (id === 'ring' ? s.field.z : s.potential), 0);
   for (const n of [3, 5, 30]) expect(at(n) / at(2000), `${id} at ${n}`).toBeCloseTo(1, 10);
   const [, , , add, limit] = buildStages(getProblem(id));
   for (const text of [add.line, add.caption]) {
    expect(text, `${id}: "${text}"`).toMatch(/exactly/);
    expect(text, `${id}: "${text}"`).not.toMatch(/once they shrink/);
   }
   for (const text of [limit.line, limit.caption]) {
    expect(text, `${id}: "${text}"`).toMatch(/does not move/);
    expect(text, `${id}: "${text}"`).not.toMatch(/stops depending/);
   }
  }
  // The arc's field is not exact -- the piece is not a point seen from the centre -- and keeps the
  // estimate's words.
  const arc = (n: number) => sampleDistribution('arc', P, n).reduce((t, s) => t + s.field.x, 0);
  expect(Math.abs(arc(5) / arc(2000) - 1)).toBeGreaterThan(1e-3);
  const arcAdd = buildStages(getProblem('arc'))[3];
  expect(arcAdd.caption).toMatch(/(once|as) (they|the pieces) shrink/);
  expect(arcAdd.line).not.toMatch(/exact/);
 });
 it('a potential’s piece adds k times its charge over its distance, and goes on the column the next stage names', () => {
  for (const p of PROBLEMS.filter(q => q.quantity === 'V')) {
   const [, one, cancel] = buildStages(p);
   // What is added, then what it is: "It adds k times its charge over its distance to the potential" had
   // no antecedent for "It", and "its distance to the potential" parsed first.
   expect(one.line, p.id).toMatch(/adds (k times its charge over its distance|a number to the potential at P: k times its charge over its distance)/);
   expect(one.line, p.id).not.toMatch(/^It /);
   expect(cancel.caption, p.id).not.toMatch(/pile/);
  }
  // A rod's mirror piece is one of the column's pieces. The ring's partner is a length of ring, which
  // at an odd N straddles two of them, so it is not said to go on the column as one.
  expect(buildStages(getProblem('v-rod-bisector'))[2].caption).toMatch(/both go on the column/);
  expect(buildStages(getProblem('v-ring'))[2].caption).not.toMatch(/both go on the column/);
 });
 it('an unbounded line is never cut into point charges, only into pieces whose field is a point charge’s', () => {
  // At every N the outermost piece is infinitely long. A thin angle makes its FIELD a point charge's.
  for (const id of ['infinite', 'semi'] as const) {
   const cut = buildStages(getProblem(id))[0].caption;
   expect(cut, id).not.toMatch(/is just a point charge/);
   expect(cut, id).toMatch(/thin enough in angle/);
  }
 });
 it('P is a point, not a charge: nothing acts on it, nothing pushes it harder or softer', () => {
  // A piece makes a field at P. Force words belong only where a test charge is named, and no
  // caption names one.
  for (const p of PROBLEMS) for (const s of buildStages(p)) for (const text of [s.line, s.caption]) {
   expect(text, `${p.id} · ${s.key}: "${text}"`).not.toMatch(/acts? on P|acts just as hard|\bharder\b|\bsofter\b|\bpush/i);
  }
 });
});
