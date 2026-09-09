import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS,type Params} from '../src/problems/types';
import {K,EPS0,field,magnitude,sampleLimit} from '../src/symbolic/physics';
// The explorer's sliders are the only source of params, so mirror a realistic state:
// a 2 nC total charge on a 4 m object, observed 3 m away.
const p:Params={...DEFAULT_PARAMS,charge:2,size:4,distance:3};
const sweep=(problem=PROBLEMS[0],limit=problem.limits[0])=>Array.from({length:70},(_,i)=>sampleLimit(problem,p,limit,1+29*i/69));
describe('every limiting case compares like with like',()=>{
 for(const problem of PROBLEMS)for(const limit of problem.limits){
  it(`${problem.id}/${limit.id}: the reference curve is never plotted with the wrong sign`,()=>{
   for(const sign of [1,-1]){
    const q={...p,charge:2*sign};
    for(const t of [1,7.3,30]){const s=sampleLimit(problem,q,limit,t);
     expect(s.target,`${problem.id}/${limit.id} t=${t}`).toBeGreaterThanOrEqual(0);
     expect(s.actual).toBeGreaterThanOrEqual(0);
     expect(Number.isFinite(s.target)&&Number.isFinite(s.actual)).toBe(true);}
   }
  });
  it(`${problem.id}/${limit.id}: the exact field actually reaches the stated limit`,()=>{
   const s=sweep(problem,limit),last=s[s.length-1],first=s[0];
   if(limit.mode==='maximum'){ // the reference is the peak, not an endpoint
    expect(Math.max(...s.map(x=>x.actual))/last.target).toBeCloseTo(1,3);return;}
   if(limit.mode==='half'){expect(last.actual).toBeCloseTo(last.target,12);return;}
   if(last.target===0){expect(last.actual).toBeLessThan(first.actual*1e-3+1e-12);return;}
   const err=(x:{actual:number;target:number})=>Math.abs(x.actual/x.target-1);
   expect(err(last)).toBeLessThan(.05);
   expect(err(last)).toBeLessThanOrEqual(err(first));
  });
 }
});
describe('the limit panel uses the student’s own parameters', ()=>{
 it('a rod taken to infinity holds the rod’s OWN linear density, not the charge number',()=>{
  const problem=PROBLEMS[0],limit=problem.limits[1];
  const lambda=p.charge*1e-9/p.size; // Q = 2 nC spread over L = 4 m
  expect(sampleLimit(problem,p,limit,12).target).toBeCloseTo(2*K*lambda/p.distance,12);
 });
 it('an infinite-line problem keeps interpreting its charge slider as lambda',()=>{
  const problem=getProblem('infinite');
  expect(sampleLimit(problem,p,problem.limits[0],12).target).toBeCloseTo(2*K*p.charge*1e-9/p.distance,12);
 });
 it('a disk grown into a sheet holds the disk’s OWN surface density',()=>{
  const problem=PROBLEMS.find(x=>x.id==='disk')!,limit=problem.limits.find(l=>l.mode==='infinite')!;
  const sigma=p.charge*1e-9/(Math.PI*(p.size/2)**2);
  expect(sampleLimit(problem,p,limit,12).target).toBeCloseTo(sigma/(2*EPS0),12);
 });
 it('a sheet problem keeps interpreting its charge slider as sigma',()=>{
  const problem=PROBLEMS.find(x=>x.id==='sheet')!,limit=problem.limits.find(l=>l.mode==='infinite')!;
  expect(sampleLimit(problem,p,limit,12).target).toBeCloseTo(p.charge*1e-9/(2*EPS0),12);
 });
});
describe('the reference curve matches the formula printed above it',()=>{
 it('the axial rod is compared with kQ/a², exactly as its formula states',()=>{
  const problem=PROBLEMS.find(x=>x.id==='axial')!,limit=problem.limits[0];
  expect(limit.formula).toContain('kQ/a^2');
  for(const t of [1,4.5,30]){const s=sampleLimit(problem,p,limit,t);
   expect(s.target).toBeCloseTo(K*p.charge*1e-9/(t*p.size)**2,14);}
 });
 it('the ring peak reference is the analytic maximum 2kQ/(3√3 R²)',()=>{
  const problem=PROBLEMS.find(x=>x.id==='ring')!,limit=problem.limits.find(l=>l.mode==='maximum')!,R=p.size/2;
  expect(sampleLimit(problem,p,limit,10).target).toBeCloseTo(magnitude(field('ring',{...p,distance:R/Math.SQRT2})),12);
 });
 it('the half-ring reference is the field the arc formula gives at phi = pi',()=>{
  const problem=PROBLEMS.find(x=>x.id==='arc')!,limit=problem.limits.find(l=>l.mode==='half')!;
  expect(sampleLimit(problem,p,limit,1).target).toBeCloseTo(magnitude(field('arc',{...p,phi:Math.PI})),14);
 });
 it('the semi-infinite scale reference is √2 k|lambda|/r at the plotted distance',()=>{
  const problem=PROBLEMS.find(x=>x.id==='semi')!,limit=problem.limits[0];
  for(const t of [1,12,30])expect(sampleLimit(problem,p,limit,t).target).toBeCloseTo(Math.SQRT2*K*p.charge*1e-9/t,14);
 });
});
