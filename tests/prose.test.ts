import {describe,it,expect} from 'vitest';
import katex from 'katex';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
/** Most of what is below is rendered as plain text (`<p>{message}</p>`), never through KaTeX. A raw TeX
 * macro leaking in shows the student a literal backslash, and so does a $ sign.
 * Two kinds of sentence are set by the page's Prose, which reads a $…$ span as TeX: the setup (Model
 * assumptions, and the offline copy) and the unfolded integration's steps. The integrate step's hint
 * is its first worked line. Those may carry $…$, and only there is TeX allowed, inside the spans. */
function prose(p:Problem):[string,string,boolean][]{
 const out:[string,string,boolean][]=[['subtitle',p.subtitle,false],['setup',p.setup,true],['kind',p.kind,false],['origin',p.origin,false],['alternateOrigin',p.alternateOrigin,false],['symmetry.text',p.symmetry.text,false],['symmetry.answer',p.symmetry.answer,false],['symmetry.axis',p.symmetry.axis,false]];
 p.symmetry.options.forEach((o,i)=>out.push([`symmetry.options[${i}]`,o,false]));
 p.symmetry.axes.forEach((o,i)=>out.push([`symmetry.axes[${i}]`,o,false]));
 p.steps.forEach((s,i)=>{out.push([`steps[${i}].title`,s.title,false],[`steps[${i}].text`,s.text,false],[`steps[${i}].hint`,s.hint,s.kind==='integrate']);
  s.worked?.forEach((w,j)=>out.push([`steps[${i}].worked[${j}].text`,w.text,true]));
  s.fields?.forEach(f=>{out.push([`steps[${i}].${f.id}.label`,f.label,false],[`steps[${i}].${f.id}.hint`,f.hint,false]);
   f.mistakes?.forEach((m,j)=>out.push([`steps[${i}].${f.id}.mistakes[${j}]`,m.message,false]));});});
 p.limits.forEach(l=>{out.push([`limits.${l.id}.title`,l.title,false],[`limits.${l.id}.prompt`,l.prompt,false],[`limits.${l.id}.answer`,l.answer,false],[`limits.${l.id}.explanation`,l.explanation,false],[`limits.${l.id}.reference`,l.reference,false]);
  l.choices.forEach((c,i)=>out.push([`limits.${l.id}.choices[${i}]`,c,false]));});
 return out;
}
const lessons=[...PROBLEMS,getProblem('infinite','finite')];
/** The words of a sentence, with its $…$ spans taken out. */
const words=(text:string)=>text.split('$').filter((_,i)=>i%2===0).join(' ');
describe('student-facing prose is prose, not raw TeX',()=>{
 for(const p of lessons)it(`${p.id}/${p.variable}`,()=>{
  for(const [where,text,marked] of prose(p)){
   if(!marked)expect(text,`${p.id} ${where}: ${text}`).not.toContain('$');
   expect(words(text),`${p.id} ${where}: ${text}`).not.toMatch(/\\[a-zA-Z]/);
   expect(text,`${p.id} ${where}: ${text}`).not.toContain('${');
  }
 });
});
// The unfolded steps set "so Eₓ = kλ(0 − 1/r)" in the sans face with Unicode subscripts, directly above
// the same symbols in KaTeX italic: one symbol in two faces on a projected step. They are written
// $…$ now, and every span must be TeX that KaTeX sets without an error box.
describe('the setup and the unfolded steps write their symbols as TeX that renders',()=>{
 for(const p of lessons)it(`${p.id}/${p.variable}`,()=>{
  for(const [where,text,marked] of prose(p)){
   if(!marked)continue;
   const parts=text.split('$');
   expect(parts.length%2,`${p.id} ${where}: an unclosed $ in “${text}”`).toBe(1);
   for(const tex of parts.filter((_,i)=>i%2))expect(()=>katex.renderToString(tex,{throwOnError:true,strict:'error'}),`${p.id} ${where}: ${tex}`).not.toThrow();
   // A formula left in the words would be set in the sans face beside its KaTeX twin. (A step's hint
   // is not shown on the page, so it may stay as written.)
   if(!where.endsWith('.hint'))expect(words(text),`${p.id} ${where}`).not.toMatch(/[=<>≤≥≈∼→] ?[A-Za-zα-ω0-9(]|[²³₀ₓᵧ√∫]/);
  }
 });
 it('the setup is the only place a reader is told what λ and σ are, so it defines every one the integral uses',()=>{
  for(const p of lessons){
   const used=[p.integralTex,p.secondaryIntegralTex??'',p.resultTex,p.secondaryResultTex??''].join(' ');
   for(const symbol of ['\\lambda_0','\\lambda','\\sigma'])
    if(used.includes(symbol))expect(p.setup,`${p.id}: the integral uses ${symbol}`).toContain(symbol);
  }
 });
});
