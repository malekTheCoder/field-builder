import {describe,expect,it} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import {artifactHtml,lessonArtifact} from '../src/state/artifact';

// Textbook lessons now lead every copy. Repeating their result later in the worked derivation
// made six handouts print an identical display twice, despite the older working/result guard.
const displays=(html:string)=>[...html.matchAll(/<math\b[^>]*display="block"[\s\S]*?<\/math>/g)].map(([m])=>m.replace(/ id="[^"]*"/g,'').replace(/<annotation\b[\s\S]*?<\/annotation>/g,'').replace(/\s+/g,' '));

describe('one displayed equation per offline copy',()=>{
 for(const problem of [...PROBLEMS,getProblem('infinite','limit')])it(`${problem.id} ${problem.variable} keeps each display once`,()=>{
  const html=artifactHtml(lessonArtifact(problem)),all=displays(html);
  expect(all.length).toBeGreaterThan(5);
  expect(all.length-new Set(all).size).toBe(0);
 });
 it('a repeated result points back by its lesson section and preserves the working',()=>{
  for(const id of ['infinite','ring','v-ring','v-disk','v-rod-bisector','v-rod-axial'] as const){
   const a=lessonArtifact(getProblem(id)),html=artifactHtml(a);
   const refs=[...html.matchAll(/<p class="equation-reference">[\s\S]*?<a href="#([^"]+)">([^<]+)<\/a>[\s\S]*?<\/p>/g)];
   expect(refs.length,id).toBeGreaterThan(0);
   for(const [,anchor,heading] of refs){
    expect(html,id).toContain(`id="${anchor}"`);
    expect(a.lesson!.sections.some(s=>s.heading===heading),`${id}: ${heading}`).toBe(true);
   }
   expect(html,id).toContain('<h2>The result</h2>');
   expect(html,id).toContain('<h2>Working</h2>');
   if(a.back?.length)expect(html,id).toContain('<h2>The field, by differentiating</h2>');
  }
 });
});
