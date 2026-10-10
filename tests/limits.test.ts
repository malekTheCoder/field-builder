import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS,type Params} from '../src/problems/types';
import {K,EPS0,field,magnitude,sampleLimit,limitPlot} from '../src/symbolic/physics';
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
   if(last.target===0){expect(last.actual).toBeLessThan(first.actual*1e-3+1e-12);return;}
   const err=(x:{actual:number;target:number})=>Math.abs(x.actual/x.target-1);
   // A constancy demonstration has nothing to approach: it is on the line from the first sample. Nor
   // has a law: the line's pieces, added up, fall on 2kλ/r from the start.
   const kind=limitPlot(problem,limit).kind;
   if(kind==='constant'||kind==='law'){for(const x of s)expect(err(x)).toBeLessThan(1e-5);return;}
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
  expect(sampleLimit(problem,p,problem.limits.find(l=>l.mode==='infinite')!,12).target).toBeCloseTo(2*K*p.charge*1e-9/p.distance,12);
  // Its own 1/r case reads the same slider as λ: at P = t metres the reference is 2kλ/t.
  expect(sampleLimit(problem,p,problem.limits.find(l=>l.mode==='scale')!,12).target).toBeCloseTo(2*K*p.charge*1e-9/12,12);
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
 it('the axial rod is compared with kQ/(a + L/2)², from its centre, exactly as its formula states',()=>{
  const problem=PROBLEMS.find(x=>x.id==='axial')!,limit=problem.limits[0];
  expect(limit.formula).toContain('\\frac{kQ}{(a+L/2)^2}');
  for(const t of [1,4.5,30]){const s=sampleLimit(problem,p,limit,t);
   expect(s.target).toBeCloseTo(K*p.charge*1e-9/(t*p.size+p.size/2)**2,14);}
 });
 it('the ring peak reference is the analytic maximum 2kQ/(3√3 R²)',()=>{
  const problem=PROBLEMS.find(x=>x.id==='ring')!,limit=problem.limits.find(l=>l.mode==='maximum')!,R=p.size/2;
  expect(sampleLimit(problem,p,limit,10).target).toBeCloseTo(magnitude(field('ring',{...p,distance:R/Math.SQRT2})),12);
 });
 it('the half-ring reference is the field the arc formula gives at phi = pi',()=>{
  const problem=PROBLEMS.find(x=>x.id==='arc')!,limit=problem.limits.find(l=>l.mode==='half')!;
  expect(sampleLimit(problem,p,limit,1).target).toBeCloseTo(magnitude(field('arc',{...p,phi:Math.PI})),14);
 });
 it('the semi-infinite line keeps its two components equal, and its size falls as the 1/r its formula prints',()=>{
  const problem=PROBLEMS.find(x=>x.id==='semi')!,limit=problem.limits[0];
  for(const t of [1,12,30]){const s=sampleLimit(problem,p,limit,t);
   expect(s.actual/s.target,`t=${t}`).toBeCloseTo(1,9);
   // A point-charge sum, not the closed form: within its own quadrature error of √2k|λ|/r.
   expect(Math.hypot(s.actual,s.target)/(Math.SQRT2*K*p.charge*1e-9/t)).toBeCloseTo(1,4);}
 });
});
// A curve that is the reference formula plotted against itself sits on the reference at every t and
// proves nothing: the semi-infinite line's |E| against √2kλ/r, the sheet's σ/2ε₀ against σ/2ε₀, the
// half ring's closed form against 2kQ/(πR²), the arc's kQ/R against kQ/R. A case whose point IS
// that nothing changes says so (kind 'constant') and is computed as a point-charge sum instead.
describe('no limit is a formula plotted against itself',()=>{
 const CONSTANT=['semi/scale','sheet/scale','infinite/scale','v-arc/full'];
 for(const problem of PROBLEMS)for(const limit of problem.limits)it(`${problem.id}/${limit.id}`,()=>{
  const kind=limitPlot(problem,limit).kind,s=sweep(problem,limit);
  if(kind==='constant'||kind==='law'){expect(CONSTANT,`${problem.id}/${limit.id} calls itself a constancy demonstration`).toContain(`${problem.id}/${limit.id}`);return;}
  // Somewhere on the sweep the exact value is visibly not the reference.
  const apart=Math.max(...s.map(x=>x.target>0?Math.abs(x.actual/x.target-1):x.actual>0?1:0));
  expect(apart,`${problem.id}/${limit.id} never leaves its reference`).toBeGreaterThan(1e-3);
 });
 it('the constancy demonstrations are point-charge sums, so they are flat only to quadrature accuracy',()=>{
  const sheet=getProblem('sheet'),semi=getProblem('semi'),arc=getProblem('v-arc'),line=getProblem('infinite');
  const ratio=(pr:typeof sheet,mode:string,t:number)=>{const x=sampleLimit(pr,p,pr.limits.find(l=>l.mode===mode)!,t);return x.actual/x.target;};
  // Midpoint sums: close to one, and not one to the last bit.
  expect(ratio(sheet,'scale',12)).toBeCloseTo(1,5);expect(ratio(sheet,'scale',12)).not.toBe(1);
  expect(ratio(semi,'scale',12)).toBeCloseTo(1,9);
  expect(ratio(arc,'full',12)).toBeCloseTo(1,9);
  expect(ratio(line,'scale',12)).toBeCloseTo(1,5);expect(ratio(line,'scale',12)).not.toBe(1);
 });
 it('the half ring is built from point charges that settle onto 2kλ/R',()=>{
  const arc=getProblem('arc'),half=arc.limits.find(l=>l.mode==='half')!;
  const err=(t:number)=>{const x=sampleLimit(arc,p,half,t);return x.actual/x.target-1;};
  // One piece at the arc's middle gives kQ/R², π/2 times 2kQ/(πR²); thirty are within a part in a thousand.
  expect(err(1)).toBeCloseTo(Math.PI/2-1,10);
  expect(Math.abs(err(30))).toBeLessThan(1e-3);
  expect(Math.abs(err(10))).toBeLessThan(Math.abs(err(3)));
 });
});
describe('the thumbnail’s arrow is the lesson’s own field, sign included',()=>{
 for(const problem of PROBLEMS.filter(x=>x.quantity==='E'))for(const limit of problem.limits)it(`${problem.id}/${limit.id}: reversing the charge reverses the arrow`,()=>{
  for(const t of [1,7.3,30]){
   const up=sampleLimit(problem,p,limit,t).vector,down=sampleLimit(problem,{...p,charge:-p.charge},limit,t).vector;
   expect(up,`${problem.id}/${limit.id} has an arrow to draw`).toBeDefined();
   for(const axis of ['x','y','z'] as const)expect(down![axis]).toBeCloseTo(-up![axis],20);
  }
 });
 it('a rod level with P’s end tilts towards 45° as it grows, and flattens as P moves far away',()=>{
  const endpoint=getProblem('endpoint'),angle=(mode:string,t:number,charge=p.charge)=>{
   const v=sampleLimit(endpoint,{...p,charge},endpoint.limits.find(l=>l.mode===mode)!,t).vector!;return Math.atan2(v.y,v.x)*180/Math.PI;};
  // At L = 30r the tilt is within a degree and a half of 45° below the axis, and closing in.
  expect(Math.abs(angle('infinite',30)+45)).toBeLessThan(1.5);
  expect(Math.abs(angle('infinite',30)+45)).toBeLessThan(Math.abs(angle('infinite',1)+45));
  expect(Math.abs(angle('far',30))).toBeLessThan(2);
  // Negative charge: the same line, pointing back at the rod.
  expect(Math.abs(angle('infinite',30,-p.charge)-135)).toBeLessThan(1.5);
 });
});
describe('the limit plots speak in symbols, not numerals',()=>{
 for(const problem of PROBLEMS)for(const limit of problem.limits)it(`${problem.id}/${limit.id}`,()=>{
  const plot=limitPlot(problem,limit);
  const shown=[plot.y,plot.axis,plot.from,plot.to,plot.line,plot.solid??'',plot.caption??'',...(plot.marks??[]).map(m=>m.label)];
  for(const text of shown)expect(text,`${problem.id}/${limit.id}`).not.toMatch(/[0-9]/);
 });
});
// A potential with no limit was drawn as V over its growth law: a curve that fell and flattened onto
// one, which a student read as V levelling off -- the opposite of the tab's point. It is now drawn as
// what it is, V and the growth law themselves, rising together.
describe('a potential that grows without end is drawn growing',()=>{
 for(const id of ['v-rod-bisector','v-disk'])it(`${id}: V and its growth law both rise across the whole sweep`,()=>{
  const problem=getProblem(id),limit=problem.limits.find(l=>l.mode==='infinite')!,plot=limitPlot(problem,limit);
  expect(plot.kind).toBe('growth');
  expect(plot.caption).toMatch(/^Both keep growing without end, in step: V has no limit to settle on\./);
  // The rod's logarithm is swept on a log axis, where it is a straight line, and the caption says so.
  if(id==='v-rod-bisector')expect(plot.caption).toMatch(/log scale, on which a logarithm is a straight line: V grows only as ln\(L\/r\)/);
  // The sweep the panel draws: seventy points, logarithmic, as Assessment samples it.
  const s=Array.from({length:70},(_,i)=>sampleLimit(problem,p,limit,30**(i/69)));
  for(let i=1;i<s.length;i++){
   expect(s[i].actual,`${id} V at sample ${i}`).toBeGreaterThan(s[i-1].actual);
   expect(s[i].target,`${id} growth law at sample ${i}`).toBeGreaterThan(s[i-1].target);
  }
  // Neither curve levels off: the last stretch of the sweep still climbs a good part of the way.
  const late=(k:'actual'|'target')=>(s[69][k]-s[52][k])/s[69][k];
  expect(late('actual')).toBeGreaterThan(.2);
  expect(late('target')).toBeGreaterThan(.2);
 });
});
// THE INFINITE LINE'S SCALING IS DRAWN, NOT DIVIDED OUT. "Double r and E halves" was a flat ratio on a
// dashed line, the same picture as the sheet's "the field does not change": two opposite scalings in
// one drawing. It is now the field itself falling on 2kλ/r, with a point charge's steeper fall beside it.
describe('the infinite line’s field is drawn halving, beside a point charge’s quartering',()=>{
 const line=getProblem('infinite'),limit=line.limits.find(l=>l.mode==='scale')!,plot=limitPlot(line,limit);
 it('is a law plot of |E| itself, with the point charge’s fall as its second curve',()=>{
  expect(plot.kind).toBe('law');
  expect(plot.y).toBe('|E|, scaled');
  expect(plot.second).toMatch(/point charge/);
  expect(plot.caption).toMatch(/double r and it halves/);
  expect(plot.caption).not.toMatch(/^Flat/);
 });
 it('doubling r halves the summed field and quarters the ghost, from one shared start',()=>{
  for(const t of [1,2.5,7]){
   const a=sampleLimit(line,p,limit,t),b=sampleLimit(line,p,limit,2*t);
   expect(b.actual/a.actual,`t=${t}`).toBeCloseTo(.5,4);
   expect(b.second!/a.second!,`t=${t}`).toBeCloseTo(.25,12);
  }
  const start=sampleLimit(line,p,limit,1);
  expect(start.second!/start.actual).toBeCloseTo(1,4);
 });
 it('the sheet keeps its flat plot: the two lessons no longer share one picture',()=>{
  const sheet=getProblem('sheet'),flat=limitPlot(sheet,sheet.limits.find(l=>l.mode==='scale')!);
  expect(flat.kind).toBe('constant');
  expect(flat.kind).not.toBe(plot.kind);
 });
});
// The arc opens at fixed Q, which is what its plot holds: reasoned at fixed λ, sin(φ/2) peaks at the
// semicircle, and a student predicted a hump the curve does not have.
describe('the arc closing into a circle is reasoned at the fixed Q its plot holds',()=>{
 const arc=getProblem('arc'),full=arc.limits.find(l=>l.mode==='full')!;
 const words=(s:string)=>s.replace(/ /g,' ');
 it('the formula, the explanation and the axis say Q is fixed',()=>{
  expect(full.formula).toContain(String.raw`(Q\text{ fixed})`);
  expect(full.formula).toContain(String.raw`\frac{\sin(\varphi/2)}{\varphi}`);
  expect(words(full.explanation)).toMatch(/total charge Q stays fixed/);
  expect(words(full.explanation)).toMatch(/At fixed λ the field would instead grow until the semicircle/);
  expect(limitPlot(arc,full).axis).toMatch(/with Q fixed/);
  const v=getProblem('v-arc');
  expect(limitPlot(v,v.limits.find(l=>l.mode==='full')!).axis).toMatch(/with Q fixed/);
 });
 it('at fixed Q the field only falls; at fixed λ it would peak at the semicircle',()=>{
  const s=Array.from({length:70},(_,i)=>sampleLimit(arc,p,full,1+29*i/69).actual);
  for(let i=1;i<s.length;i++)expect(s[i],`sample ${i}`).toBeLessThan(s[i-1]);
  // At fixed λ the field goes as sin(φ/2): largest at φ = π, smaller on either side.
  const fixedLambda=(phi:number)=>Math.sin(phi/2);
  expect(fixedLambda(Math.PI)).toBeGreaterThan(fixedLambda(.5*Math.PI));
  expect(fixedLambda(Math.PI)).toBeGreaterThan(fixedLambda(1.5*Math.PI));
 });
});
