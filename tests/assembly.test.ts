import {describe,expect,it} from 'vitest';
import {PROBLEMS} from '../src/problems/definitions';
import {assembledTex,completion,figureOf,isComplete,isScalar,requiredTerms,substitutedTex,termOfFigure,termsFor} from '../src/workbench/assembly';
import type {TermId} from '../src/workbench/assembly';
const SLOT='\\square';
const all=(ids:TermId[])=>new Set<TermId>(ids);
describe('integral assembly',()=>{
 it('offers a projection factor for a field and not for a potential',()=>{
  for(const p of PROBLEMS){
   const ids=requiredTerms(p);
   expect(ids,p.id).toContain('element');expect(ids,p.id).toContain('distance');expect(ids,p.id).toContain('bounds');
   // A scalar has no direction to resolve, so a cos factor there would be a lie.
   expect(ids.includes('projection'),p.id).toBe(!isScalar(p));
   expect(isScalar(p),p.id).toBe(p.quantity==='V');
  }
 });
 it('starts as an empty structure and fills one slot at a time',()=>{
  for(const p of PROBLEMS){
   const need=requiredTerms(p),empty=assembledTex(p,new Set());
   // Every factor starts as a visible hole, so the shape of the answer is legible
   // before any of it is known.
   expect(empty.split(SLOT).length-1,p.id).toBe(need.length+1); // +1: bounds fill two slots
   expect(empty,p.id).toContain('\\int');
   let have=new Set<TermId>();
   let holes=empty.split(SLOT).length-1;
   for(const id of need){
    have=new Set([...have,id]);
    const next=assembledTex(p,have).split(SLOT).length-1;
    expect(next,`${p.id}/${id}`).toBeLessThan(holes);
    holes=next;
   }
   expect(holes,p.id).toBe(0);
  }
 });
 it('is complete only when every required piece has been taken from the figure',()=>{
  for(const p of PROBLEMS){
   const need=requiredTerms(p);
   expect(isComplete(p,new Set()),p.id).toBe(false);
   expect(completion(p,new Set()),p.id).toBe(0);
   for(const drop of need){
    const missingOne=all(need.filter(id=>id!==drop));
    expect(isComplete(p,missingOne),`${p.id} without ${drop}`).toBe(false);
    expect(completion(p,missingOne)).toBeCloseTo((need.length-1)/need.length,12);
   }
   expect(isComplete(p,all(need)),p.id).toBe(true);
   expect(completion(p,all(need)),p.id).toBe(1);
  }
 });
 it('substitutes what each symbol stands for once the piece is in hand',()=>{
  for(const p of PROBLEMS){
   const need=requiredTerms(p),full=substitutedTex(p,all(need));
   expect(full,p.id).not.toContain(SLOT);
   // The substituted form names the integration variable; the structural form does not
   // have to, which is the whole point of showing both.
   expect(full,p.id).toContain('\\int');
   expect(substitutedTex(p,new Set()),p.id).toContain(SLOT);
   expect(assembledTex(p,all(need)),p.id).not.toContain(SLOT);
  }
 });
 it('links every term to a figure feature in both directions',()=>{
  for(const p of PROBLEMS){
   for(const t of termsFor(p)){
    expect(t.figure,`${p.id}/${t.id}`).toBeTruthy();
    expect(figureOf(p,t.id),`${p.id}/${t.id}`).toBe(t.figure);
    expect(termOfFigure(p,t.figure),`${p.id}/${t.figure}`).toBe(t.id);
    expect(t.tex.length,`${p.id}/${t.id}`).toBeGreaterThan(0);
    // Every piece has to justify itself against the picture, not just name itself.
    expect(t.why.length,`${p.id}/${t.id}`).toBeGreaterThan(40);
    expect(t.label.length,`${p.id}/${t.id}`).toBeGreaterThan(0);
   }
   expect(termOfFigure(p,'nothing-in-the-figure'),p.id).toBeNull();
   // A potential has no projection term, so asking for its figure yields nothing
   // rather than pointing at a feature that is not on screen.
   if(isScalar(p))expect(figureOf(p,'projection'),p.id).toBe('');
   else expect(figureOf(p,'projection'),p.id).not.toBe('');
  }
 });
 it('never leaks a raw TeX macro into a spoken explanation',()=>{
  for(const p of PROBLEMS)for(const t of termsFor(p)){
   expect(t.why,`${p.id}/${t.id}`).not.toMatch(/\\[a-zA-Z]+/);
   expect(t.label,`${p.id}/${t.id}`).not.toMatch(/\\[a-zA-Z]+/);
  }
 });
});
