import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
/* ROUND 2: WHAT THE LESSONS SAY IS TRUE, AND SAID IN THEIR OWN SYMBOLS.
 *
 * Each block is one finding a critic made against the words of a lesson: a diagnosis that named the
 * wrong thing, a confusion that cited a symbol the lesson never defines, force language in the first
 * sentence a student reads, limits written in a d nobody defined, an unfold a first-year cannot
 * follow, subtitles that never say where P is, and a derivative taken back without saying why it
 * is the whole field. */
const lessons=[...PROBLEMS,getProblem('infinite','limit')];
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const mistakes=(p:Problem)=>fields(p).flatMap(f=>(f.mistakes??[]).map(m=>({id:f.id,...m})));
const said=(id:string,field:string,expression:string)=>{
 const m=mistakes(getProblem(id)).find(x=>x.id===field&&x.expression===expression);
 if(!m)throw Error(`${id} has no ${field} confusion for ${expression}`);
 return m.message;
};
describe('half an infinite line is not half the field',()=>{
 // Seen from the foot of the perpendicular, one half of the line makes √2·kλ/r at 45°. Only its
 // perpendicular part is kλ/r; the semi-infinite lesson exists to teach exactly that.
 for(const path of ['angular','limit'])it(`${path}: kλ/r is one half’s perpendicular part, not its field`,()=>{
  const m=said('infinite','result','k*lambda/r');
  expect(getProblem('infinite',path).steps.flatMap(s=>s.fields??[]).find(f=>f.id==='result')!.mistakes!.map(x=>x.message)).toContain(m);
  expect(m).not.toMatch(/field of one half/);
  expect(m).toMatch(/perpendicular part of one half’s field/);
  expect(m).toMatch(/other half cancels/);
 });
 it('agrees with the semi-infinite lesson, where each component of the half line is kλ/r',()=>{
  expect(said('semi','result','-2*k*lambda/r')).toMatch(/Each component of this half line comes to kλ\/r/);
 });
});
describe('a single element or an integrand is never zero by symmetry; only a sum is',()=>{
 it('no element- or integrand-level 0 calls itself the symmetric answer',()=>{
  for(const p of lessons)for(const m of mistakes(p))if((m.id.startsWith('component')||m.id.startsWith('kernel'))&&m.expression==='0')
   expect(m.message,`${p.id} ${m.id}`).not.toMatch(/centred rod’s answer|would give zero here|Zero would need/);
 });
 it('one element’s vertical part is never zero, even on a centred rod',()=>{
  for(const id of ['endpoint','ramp']){
   const m=said(id,'component2','0');
   expect(m,id).toMatch(/never zero/);
   expect(m,id).toMatch(/cancels only against a partner below P/);
  }
  // The centred rod's own entry says the same thing.
  expect(said('bisector','component2','0')).toMatch(/is not zero/);
 });
 it('an integrand is odd on the symmetric geometry, not zero: only its integral vanishes',()=>{
  for(const [id,field] of [['endpoint','kernel2'],['semi','kernel']] as const){
   const m=said(id,field,'0');
   expect(m,id).toMatch(/integrand is not zero/);
   expect(m,id).toMatch(/odd in [xy]/);
   expect(m,id).toMatch(/integral cannot vanish/);
  }
 });
 it('the result-level entries, where zero really is the symmetric answer, stay',()=>{
  expect(said('semi','result','0')).toMatch(/right for a line running both ways/);
  expect(said('endpoint','result2','0')).toMatch(/Only a rod centred on P’s level/);
 });
});
describe('the sheet’s confusions use only the sheet’s own symbols',()=>{
 it('no confusion on the sheet cites R, which the sheet never defines',()=>{
  const sheet=getProblem('sheet');
  expect(sheet.setup).not.toMatch(/\bR\b/);
  for(const m of mistakes(sheet)){
   expect(m.message,`${m.id}: ${m.expression}`).not.toMatch(/\bR\b/);
   expect(m.expression,m.id).not.toMatch(/\bR\b/);
  }
  expect(said('sheet','field','k*dQ/z^2')).toMatch(/straight below P/);
 });
 it('the disk keeps its own R confusion: it has an outer radius to mistake',()=>{
  expect(said('disk','field','k*R*dQ/(s^2+z^2)^(3/2)')).toMatch(/R is not this ring’s radius/);
 });
});
describe('a piece makes a field at P; nothing acts on P',()=>{
 // P is a point, not a charge. Every string a lesson carries, whatever part of the page shows it.
 for(const p of lessons)it(`${p.id}/${p.variable}`,()=>{
  expect(JSON.stringify(p),p.id).not.toMatch(/\bacts? on P\b|\bpush(es|ed)?\b|\bharder\b/);
 });
 it('the sheet’s subtitle says the rings make the same field at P',()=>{
  expect(getProblem('sheet').subtitle).toMatch(/makes exactly the same field at P as before/);
 });
});
describe('far limits are written in each lesson’s own symbols',()=>{
 for(const p of lessons)for(const l of p.limits)it(`${p.id}/${l.id}`,()=>{
  for(const text of [l.formula,l.explanation]){
   expect(text).not.toContain('\\text{size}');
   // kQ/d only where the lesson says what d is.
   if(/kQ\/d(?![a-zA-Z])/.test(text))expect(l.explanation,`${p.id}/${l.id} uses d without defining it`).toMatch(/\bd = /);
  }
 });
 it('the ring and the disk speak of z and R, the potentials of z or r',()=>{
  for(const id of ['ring','disk'])expect(getProblem(id).limits.find(l=>l.mode==='far')!.formula,id).toBe(String.raw`z\gg R:\quad E_z\to kQ/z^2`);
  for(const id of ['v-ring','v-disk'])expect(getProblem(id).limits.find(l=>l.mode==='far')!.explanation,id).toMatch(/kQ\/z\b/);
  expect(getProblem('v-rod-bisector').limits.find(l=>l.mode==='far')!.explanation).toMatch(/kQ\/r\b/);
 });
});
describe('the bisector potential’s unfold is first-year calculus, every formula in TeX',()=>{
 const p=getProblem('v-rod-bisector');
 const integrate=p.steps.find(s=>s.kind==='integrate')!,gradient=p.steps.find(s=>s.kind==='gradient')!;
 it('no asinh anywhere in the lesson',()=>{
  expect(JSON.stringify(p)).not.toMatch(/asinh/);
 });
 it('no formula in the plain text of the worked steps or the derivative',()=>{
  const plain=[...integrate.worked!.map(w=>w.text),...gradient.worked!.map(w=>w.text),gradient.text,gradient.hint];
  for(const text of plain)expect(text).not.toMatch(/=/);
 });
 it('the evaluation at both ends and the difference of squares are their own lines',()=>{
  const tex=integrate.worked!.map(w=>w.tex);
  expect(tex.some(t=>t.includes(String.raw`\ln\bigl(L/2+\sqrt{L^2/4+r^2}\bigr)`)&&t.includes(String.raw`\ln\bigl(-L/2+\sqrt{L^2/4+r^2}\bigr)`)),'top minus bottom').toBe(true);
  expect(tex.some(t=>/\\times\\bigl\(\\sqrt\{L\^2\/4\+r\^2\}\+L\/2\\bigr\)=r\^2/.test(t)),'(√A − L/2)(√A + L/2) = r²').toBe(true);
  expect(tex[tex.length-1]).toContain(String.raw`2k\lambda\ln\frac{L/2+\sqrt{L^2/4+r^2}}{r}`);
 });
 it('the derivative is taken of the logarithm and lands on the bisector field',()=>{
  const tex=gradient.worked!.map(w=>w.tex).join(' ');
  expect(tex).toContain(String.raw`\frac{dV}{dr}`);
  expect(tex).toContain(String.raw`-\frac{k\lambda L}{r\sqrt{L^2/4+r^2}}`);
 });
});
describe('the rod potentials’ subtitles say where P is',()=>{
 for(const id of ['v-rod-bisector','v-rod-axial'])it(id,()=>{
  const s=getProblem(id).subtitle;
  expect(s).toMatch(/\bP\b/);
  expect(s).not.toMatch(/=|substitution|diverge|logarithm/);
  expect(s).toMatch(/adds a number/);
 });
 it('the bisector potential says what it is the bisector of',()=>{
  expect(getProblem('v-rod-bisector').title).toBe('Potential on the bisector of a rod');
  expect(getProblem('v-rod-bisector').short,'the sidebar name is unchanged').toBe('Line · potential');
 });
});
describe('“Differentiate back” says why −dV is the whole field, and only there',()=>{
 const where:Record<string,RegExp>={'v-ring':/axis/,'v-disk':/axis/,'v-rod-bisector':/bisector/,'v-rod-axial':/line/};
 for(const [id,place] of Object.entries(where))it(id,()=>{
  const first=getProblem(id).steps.find(s=>s.kind==='gradient')!.worked![0].text;
  expect(first).toMatch(/symmetry leaves E with only its/);
  expect(first).toMatch(/so that part is the whole field there/);
  expect(first).toMatch(/V known only on the (axis|bisector|line) cannot give E off it/);
  expect(first.match(/V known only on the (\w+)/)![1]).toMatch(place);
 });
});
