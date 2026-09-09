import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
/** Everything below is rendered as plain text (`<p>{step.text}</p>`), never through
 * KaTeX. A raw TeX macro leaking in shows the student a literal backslash. */
function prose(p:Problem):[string,string][]{
 const out:[string,string][]=[['subtitle',p.subtitle],['setup',p.setup],['kind',p.kind],['origin',p.origin],['alternateOrigin',p.alternateOrigin],['symmetry.text',p.symmetry.text],['symmetry.answer',p.symmetry.answer],['symmetry.axis',p.symmetry.axis]];
 p.symmetry.options.forEach((o,i)=>out.push([`symmetry.options[${i}]`,o]));
 p.symmetry.axes.forEach((o,i)=>out.push([`symmetry.axes[${i}]`,o]));
 p.steps.forEach((s,i)=>{out.push([`steps[${i}].title`,s.title],[`steps[${i}].text`,s.text],[`steps[${i}].hint`,s.hint]);
  s.worked?.forEach((w,j)=>out.push([`steps[${i}].worked[${j}].text`,w.text]));
  s.fields?.forEach(f=>{out.push([`steps[${i}].${f.id}.label`,f.label],[`steps[${i}].${f.id}.hint`,f.hint]);
   f.mistakes?.forEach((m,j)=>out.push([`steps[${i}].${f.id}.mistakes[${j}]`,m.message]));});});
 p.limits.forEach(l=>{out.push([`limits.${l.id}.title`,l.title],[`limits.${l.id}.prompt`,l.prompt],[`limits.${l.id}.answer`,l.answer],[`limits.${l.id}.explanation`,l.explanation],[`limits.${l.id}.reference`,l.reference]);
  l.choices.forEach((c,i)=>out.push([`limits.${l.id}.choices[${i}]`,c]));});
 return out;
}
describe('student-facing prose is prose, not raw TeX',()=>{
 for(const p of [...PROBLEMS,getProblem('infinite','finite')])it(`${p.id}/${p.variable}`,()=>{
  for(const [where,text] of prose(p)){
   expect(text,`${p.id} ${where}: ${text}`).not.toMatch(/\\[a-zA-Z]/);
   expect(text,`${p.id} ${where}: ${text}`).not.toContain('${');
  }
 });
});
