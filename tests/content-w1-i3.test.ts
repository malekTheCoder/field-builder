import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {K,limitPlot,potential} from '../src/symbolic/physics';
import {artifactHtml} from '../src/state/artifact';
import {resultLines} from '../src/workbench/derivation';
/* WAVE 1, THIRD PASS · CONTENT: WHAT THE CRITICS FOUND IN THE WORDS, CHECKED.
 *
 * A diagnosis that gave a false reason (the potential "easier" for its missing power of r), one that
 * taught a false rule (only a vector's components cancel), one that named the ends where it meant
 * the halves; a heading and its own diagnosis making two claims about one factor; legends and
 * captions that called a sum of point charges "your exact field"; one arrow for "tends to" and for
 * "behaves like"; sidebar names that did not say where P is; and a handout that printed E_y with no
 * integral it came from. */
const lessons=[...PROBLEMS,getProblem('infinite','limit')];
const plain=(s:string)=>s.replace(/ /g,' ');
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const said=(id:string,field:string,expression:string)=>{
 const m=fields(getProblem(id)).find(f=>f.id===field)?.mistakes?.find(x=>x.expression===expression);
 if(!m)throw Error(`${id} has no ${field} confusion for ${expression}`);
 return plain(m.message);
};
const limitOf=(id:string,mode:string)=>getProblem(id).limits.find(l=>l.mode===mode)!;
describe('the potential’s confusions give the true reason',()=>{
 it('the V integral is easier because V is a scalar, not because of the power of rᵢ',()=>{
  for(const id of ['v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial']){
   const text=said(id,'field','k*dQ/ri^2');
   expect(text,id).not.toMatch(/missing power/);
   expect(text,id).toMatch(/a number with no direction/);
   expect(text,id).toMatch(/not the power of rᵢ/);
  }
 });
 it('the bisector potential’s half answer is half the rod, not one end',()=>{
  const text=said('v-rod-bisector','result','k*lambda*log((L/2+sqrt((L/2)^2+r^2))/r)');
  expect(text).not.toMatch(/two ends contribute equally/);
  expect(text).toMatch(/potential of half the rod/);
  // And so it is: kλ ln((L/2 + √(L²/4 + r²))/r) is half the whole rod's potential, while the two
  // ends' terms of the antiderivative ln(y + √(y² + r²)) are not equal.
  const p={...DEFAULT_PARAMS},L=p.size,r=p.distance,lambda=p.charge*1e-9/L;
  const half=K*lambda*Math.log((L/2+Math.sqrt(L*L/4+r*r))/r);
  expect(potential('bisector',p)/half).toBeCloseTo(2,9);
  const end=(y:number)=>Math.log(y+Math.sqrt(y*y+r*r));
  expect(Math.abs(end(L/2)-end(0))-Math.abs(end(0)-end(-L/2))).toBeCloseTo(0,12);
  expect(Math.abs(end(L/2))).not.toBeCloseTo(Math.abs(end(-L/2)),3);
 });
});
describe('one claim per factor',()=>{
 it('the arc’s projection heading and its diagnosis agree on cos θ',()=>{
  const projection=fields(getProblem('arc')).find(f=>f.id==='projection')!;
  expect(projection.label).toBe('Projection factor cos θ');
  expect(said('arc','projection','sin(theta)')).toMatch(/uses cos θ, with the minus that the direction from the piece to the centre, −\(cos θ, sin θ\), carries/);
 });
 it('the ramp’s far E_y is vertical, along the rod, not “transverse”',()=>{
  const text=plain(limitOf('ramp','moment').explanation);
  expect(text).not.toMatch(/transverse/);
  expect(text).toMatch(/The vertical field, along the rod, is a first moment/);
 });
 it('the bisector’s vertical-part diagnosis carries the level piece’s caveat, as the endpoint’s does',()=>{
  expect(said('bisector','component2','0')).toMatch(/only the piece level with P has none/);
 });
});
describe('a sum of point charges is named as one',()=>{
 it('the sheet’s flat line and the arc potential’s are the pieces added up',()=>{
  const sheet=limitPlot(getProblem('sheet'),limitOf('sheet','scale'));
  expect(sheet.solid).toBe('The sheet’s rings, added up');
  expect(sheet.caption).toMatch(/added up ring by ring/);
  expect(limitPlot(getProblem('v-arc'),limitOf('v-arc','full')).solid).toBe('The arc’s pieces, added up');
 });
 it('on the infinite line and the sheet, the grown rod or disk is what settles, not “the exact field”',()=>{
  expect(limitPlot(getProblem('infinite'),limitOf('infinite','infinite')).caption).toMatch(/^On the dashed line a rod’s field equals the infinite line’s/);
  expect(limitPlot(getProblem('sheet'),limitOf('sheet','infinite')).caption).toMatch(/^On the dashed line a disk’s field equals the infinite sheet’s/);
  // The lessons whose own field grows into a limit keep the old sentence.
  for(const id of ['bisector','disk','endpoint'])expect(limitPlot(getProblem(id),limitOf(id,'infinite')).caption,id).toMatch(/the exact field equals/);
 });
 it('a growth law is named by how it grows, and the ring’s centre arrives level, the disk’s sloping',()=>{
  expect(limitPlot(getProblem('v-disk'),limitOf('v-disk','infinite')).line).toBe('grows as R');
  expect(limitPlot(getProblem('v-rod-bisector'),limitOf('v-rod-bisector','infinite')).line).toBe('grows as ln(L/r)');
  const ring=limitPlot(getProblem('v-ring'),limitOf('v-ring','center')).caption,disk=limitPlot(getProblem('v-disk'),limitOf('v-disk','center')).caption;
  expect(ring).not.toBe(disk);
  expect(ring).toMatch(/arrives there finite and level/);
  expect(disk).toMatch(/still sloping/);
 });
});
describe('“tends to” and “behaves like” are two arrows',()=>{
 it('every far case is an asymptote, ∼; → only where the limit is a constant',()=>{
  for(const p of lessons)for(const l of p.limits){
   if(l.mode==='far'||l.mode==='moment')expect(l.formula,`${p.id}/${l.id}`).not.toMatch(/\\to\b|\\longrightarrow/);
   if(l.mode==='far'||l.mode==='moment')expect(l.formula,`${p.id}/${l.id}`).toMatch(/\\sim/);
  }
  // The constant limits keep their arrow.
  expect(limitOf('ring','center').formula).toMatch(/\\to/);
  expect(limitOf('bisector','infinite').formula).toMatch(/\\to/);
 });
 it('no ASCII tilde in the words',()=>{
  for(const p of lessons){
   for(const l of p.limits)expect(l.explanation,`${p.id}/${l.id}`).not.toContain('~');
   for(const s of p.steps)for(const w of s.worked??[])expect(w.text,`${p.id} ${s.kind}`).not.toContain('~');
  }
 });
});
describe('the sidebar says which line and where P is',()=>{
 it('the endpoint and the two rod potentials',()=>{
  expect(getProblem('endpoint').short).toBe('Line · level with an end');
  expect(getProblem('v-rod-bisector').short).toBe('Finite line · potential');
  expect(getProblem('v-rod-axial').short).toBe('Line on axis · potential');
  for(const p of lessons)expect(p.short,p.id).not.toMatch(/off the end|^Axis/);
 });
});
describe('the sources',()=>{
 it('the semi-infinite line cites the textbook first, and the exam’s solutions as what they are',()=>{
  const s=getProblem('semi').sources;
  expect(s[0].title).toMatch(/^OpenStax · University Physics 2, §5\.5/);
  expect(s[1].title).toMatch(/May exam 2020–21.*partial solutions/);
  expect(s[1].title).not.toMatch(/worked derivation/);
 });
 it('every OpenStax title names the book',()=>{
  for(const p of lessons)for(const s of p.sources)if(s.url.startsWith('https://openstax.org/'))expect(s.title,`${p.id}: ${s.title}`).toMatch(/^OpenStax · University Physics 2, §/);
 });
});
describe('the offline copy prints the integral each result line comes from',()=>{
 it('a lesson with a separately built E_y prints its integral too',()=>{
  for(const id of ['semi','endpoint','ramp']){
   const p=getProblem(id);
   expect(p.secondaryIntegralTex,id).toMatch(/^E_y=.*\\int_0\^/);
   const html=artifactHtml({title:p.title,subtitle:p.subtitle,setup:p.setup,integralTex:p.integralTex,secondaryIntegralTex:p.secondaryIntegralTex,results:resultLines(p)});
   const tex=[...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)].map(m=>m[1]);
   expect(tex.filter(t=>t.includes('\\int')).length,id).toBeGreaterThanOrEqual(2);
   expect(html,id).toMatch(/<h2>The integrals<\/h2>/);
  }
  // One integral, one heading in the singular.
  const ring=getProblem('ring');
  expect(artifactHtml({title:'t',subtitle:'s',setup:ring.setup,integralTex:ring.integralTex,results:resultLines(ring)})).toMatch(/<h2>The integral<\/h2>/);
 });
 it('the setup’s symbols are set as maths, not printed as dollar signs',()=>{
  const p=getProblem('ring');
  const html=artifactHtml({title:p.title,subtitle:p.subtitle,setup:p.setup,integralTex:p.integralTex,results:resultLines(p)});
  const setup=html.match(/<h2>Setup<\/h2>\n<p>([\s\S]*?)<\/p>/)![1];
  expect(setup).not.toContain('$');
  expect(setup).toContain('<annotation encoding="application/x-tex">\\lambda=Q/(2\\pi R)</annotation>');
 });
});
