import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
/* WHAT THE LESSONS SAY, CHECKED AS SENTENCES.
 *
 * Every string below reaches the page as plain text: the confusions list ("Easy to confuse with"),
 * the limiting cases' explanations, the unfolded integration's sentences, a lesson's subtitle and its
 * setup. None of it goes through KaTeX, so raw notation shows as typed, and none of it is checked by
 * the physics suites, which read the formulas, not the words around them. */
const lessons=[...PROBLEMS,getProblem('infinite','limit')];
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const messages=(p:Problem)=>fields(p).flatMap(f=>(f.mistakes??[]).map(m=>m.message));
/** Everything a reader can see in words. */
function shown(p:Problem):[string,string][]{
 const out:[string,string][]=[['subtitle',p.subtitle],['setup',p.setup]];
 p.limits.forEach(l=>out.push([`limit ${l.id}`,l.explanation],[`limit ${l.id} title`,l.title]));
 p.steps.forEach(s=>s.worked?.forEach((w,i)=>out.push([`${s.kind} worked[${i}]`,w.text])));
 fields(p).forEach(f=>{if(f.mistakes?.length)out.push([`${f.id} label`,f.label]);f.mistakes?.forEach(m=>out.push([`${f.id} confusion ${m.expression}`,m.message]));});
 return out;
}
describe('the confusions list says what each expression would describe',()=>{
 // A bare distractor used to be listed with the step's hint as its "diagnosis": fourteen entries
 // read "Evaluate the antiderivative at the upper bound minus the lower bound", whatever they were.
 for(const p of lessons)it(`${p.id}/${p.variable}: no entry is the step’s hint dressed up as a diagnosis`,()=>{
  for(const f of fields(p))for(const m of f.mistakes??[])expect(m.message,`${p.id} ${f.id}: ${m.expression}`).not.toBe(f.hint);
  for(const s of p.steps)for(const m of (s.fields??[]).flatMap(f=>f.mistakes??[]))expect(m.message,`${p.id} ${s.kind}: ${m.expression}`).not.toBe(s.hint);
 });
 for(const p of PROBLEMS.filter(x=>x.quantity==='E'))it(`${p.id}: every field lesson has a confusions list to show`,()=>{
  expect(messages(p).length,`${p.id} would open an empty list`).toBeGreaterThanOrEqual(5);
 });
 it('the infinite line speaks of λ and θ, not of the finite rod’s Q, L and α',()=>{
  for(const p of [getProblem('infinite'),getProblem('infinite','limit')])for(const m of messages(p)){
   expect(m).not.toMatch(/entire rod|Divide by L|α/);
  }
  expect(fields(getProblem('infinite')).find(f=>f.id==='projection')!.hint).not.toContain('called α');
 });
 it('the semi-infinite line does not call its projection “the one entered above”',()=>{
  const semi=getProblem('semi');
  for(const m of messages(semi))expect(m).not.toContain('entered above');
  expect(semi.steps.find(s=>s.kind==='variable')!.hint).not.toContain('entered above');
 });
 it('the diagnoses the critique named are specific',()=>{
  const said=(id:string,expression:string)=>fields(getProblem(id)).flatMap(f=>f.mistakes??[]).find(m=>m.expression===expression)?.message??'';
  expect(said('ring','R/sqrt(R^2+z^2)'),'the ring’s sin α').toMatch(/sin α/);
  expect(said('v-ring','k*Q/R'),'V at the centre').toMatch(/centre/);
  expect(said('v-rod-bisector','2*k*lambda/r'),'the infinite line’s field').toMatch(/field of an infinite line/);
  expect(said('disk','sigma/(eps0)*(1-z/sqrt(z^2+R^2))'),'twice the disk’s field').toMatch(/Twice/);
 });
});
describe('the explanations are true',()=>{
 it('an element’s potential goes as 1/rᵢ; the logarithm comes from adding them along the rod',()=>{
  for(const p of PROBLEMS)for(const l of p.limits)expect(l.explanation,`${p.id}/${l.id}`).not.toMatch(/goes as ln/);
  expect(getProblem('v-rod-axial').limits.find(l=>l.mode==='near')!.explanation).toMatch(/k dQ\/rᵢ/);
 });
 it('the semi-infinite line’s bracket is evaluated, not described as positive',()=>{
  const first=getProblem('semi').steps.find(s=>s.kind==='integrate')!.worked![0].text;
  expect(first).not.toMatch(/comes out positive/);
  expect(first).toContain('kλ(0 − 1/r) = −kλ/r');
 });
});
describe('the words hold for either sign of charge, and speak of fields, not forces',()=>{
 // The charge slider runs from negative to positive.
 for(const p of lessons)it(`${p.id}/${p.variable}`,()=>{
  expect(p.setup,`${p.id} setup`).not.toMatch(/positive (charge|rod|line|surface|uniform)|uniform positive|Positive uniform|Total positive/);
  for(const [where,text] of shown(p)){
   expect(text,`${p.id} ${where}`).not.toMatch(/\bpush/i);
   // A direction stated as a fact, with no sign attached, is wrong half the time.
   expect(text,`${p.id} ${where}`).not.toMatch(/45° (left|below)(?![^.]*positive)/);
  }
 });
});
describe('prose shown as plain text carries no raw notation',()=>{
 for(const p of lessons)it(`${p.id}/${p.variable}: no _ or ^ outside KaTeX`,()=>{
  for(const [where,text] of shown(p))expect(text,`${p.id} ${where}: ${text}`).not.toMatch(/[_^]/);
 });
});
