import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {REGISTRY} from '../src/distributions';
import {K,potential,sampleLimit,limitPlot} from '../src/symbolic/physics';
import {artifactHtml,mathml} from '../src/state/artifact';
/* WAVE 1, SECOND PASS · CONTENT: WHAT THE LESSONS SAY, CHECKED AGAINST THE NEXT CRITICS.
 *
 * Each block is one finding: a textbook link that opened a chemistry lab manual, a centre that was
 * said to cancel for the wrong reason, a diverging potential drawn levelling off, potentials sent to
 * +∞ for a negative charge, arc diagnoses that forgot the pieces past a quarter turn, a Q given to a
 * line that has none, a disk grown without saying what is held fixed, a far case that explained a
 * slip instead of the limit, an error order misstated, an arrow with two meanings, and an offline
 * copy whose maths ran together. */
const lessons=[...PROBLEMS,getProblem('infinite','limit')];
const plain=(s:string)=>s.replace(/ /g,' ');
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const said=(id:string,field:string,expression:string)=>{
 const m=fields(getProblem(id)).find(f=>f.id===field)?.mistakes?.find(x=>x.expression===expression);
 if(!m)throw Error(`${id} has no ${field} confusion for ${expression}`);
 return plain(m.message);
};
const limitOf=(id:string,mode:string)=>{const p=getProblem(id),l=p.limits.find(x=>x.mode===mode);if(!l)throw Error(`${id} has no ${mode} case`);return l;};
describe('a citation outside OpenStax opens the book it names',()=>{
 // Pearson resolves the product id, not the slug. Checked by fetching each page: its heading read
 //   P200000006974 -> "Laboratory Manual for General, Organic, and Biological Chemistry, 3rd edition"
 //   P200000006998 -> "Physics for Scientists and Engineers: A Strategic Approach with Modern Physics,
 //                     5th edition", whose contents put The Electric Field at chapter 23 (and chapter
 //                     26, the old citation's number, at Potential and Field).
 //   Maynooth MP204 PDF -> the 2020-21 May exam with solutions; its pp. 8-10 work Question 1(b), the
 //                     semi-infinite line on the positive x-axis, field at (0, L, 0).
 // OpenStax links are held to their § by the slug test in content-w1; these are pinned by hand.
 const PINNED:Record<string,RegExp>={
  'https://www.pearson.com/en-us/subject-catalog/p/physics-for-scientists-and-engineers-a-strategic-approach-with-modern-physics/P200000006998/9780136956297':/^Knight · Physics for Scientists and Engineers, 5th ed\., ch\. 23 /,
  // An exam's own partial solutions, which warn of typographical errors: named as what they are, and
  // listed after the textbook, never as a lesson's first authority.
  'https://www.pks.mpg.de/~haque/maynooth_MP204/MP204_2021s2_mainfinal_withsolns_a.pdf':/^Maynooth University MP204, May exam 2020–21, Q1\(b\), with the lecturers’ partial solutions \(pp\. 8–10\)$/,
 };
 it('every non-OpenStax source is one of the pinned, checked pages, under its checked title',()=>{
  for(const p of lessons)for(const s of p.sources){
   if(s.url.startsWith('https://openstax.org/'))continue;
   expect(Object.keys(PINNED),`${p.id}: ${s.url}`).toContain(s.url);
   expect(s.title,`${p.id}: ${s.url}`).toMatch(PINNED[s.url]);
  }
 });
 it('the lab manual’s product id is gone',()=>{
  for(const p of lessons)for(const s of p.sources)expect(s.url,p.id).not.toMatch(/P200000006974/);
  expect(getProblem('ramp').sources.map(s=>s.url)).toContain('https://www.pearson.com/en-us/subject-catalog/p/physics-for-scientists-and-engineers-a-strategic-approach-with-modern-physics/P200000006998/9780136956297');
 });
});
describe('the ring’s centre cancels because each field lies in the plane, not because partners exist',()=>{
 it('the explanation and the caption give the in-plane reason, and agree with the peak tab',()=>{
  const centre=limitOf('ring','center'),text=plain(centre.explanation);
  expect(text).not.toMatch(/every element has an opposite partner/);
  expect(text).toMatch(/field lies flat in the ring’s plane/);
  // Partners cancel the sideways parts at every height; what shrinks to zero is the axial part.
  expect(text).toMatch(/Above the centre the partners still cancel the sideways parts/);
  expect(text).toMatch(/z\/rᵢ/);
  const caption=limitPlot(getProblem('ring'),centre).caption;
  expect(caption).not.toMatch(/every element has a partner opposite\.$/);
  expect(caption).toMatch(/field lies in the ring’s plane and its partner opposite cancels it/);
 });
});
describe('the potential beside the rod’s end is drawn growing, against its logarithm',()=>{
 const problem=getProblem('v-rod-axial'),near=limitOf('v-rod-axial','near'),plot=limitPlot(problem,near);
 it('is a growth plot: both curves climb across the sweep and close up, never one ratio falling to one',()=>{
  expect(plot.kind).toBe('growth');
  expect(plot.y).toMatch(/\|V\| and k\|λ\| ln\(L\/a\), scaled/);
  const s=Array.from({length:70},(_,i)=>sampleLimit(problem,DEFAULT_PARAMS,near,30**(i/69)));
  for(let i=1;i<s.length;i++){
   expect(s[i].actual,`V at ${i}`).toBeGreaterThan(s[i-1].actual);
   expect(s[i].target,`logarithm at ${i}`).toBeGreaterThan(s[i-1].target);
  }
  // At a = L the logarithm is zero (where the ratio was infinite), and V is kλ ln 2.
  const lambda=Math.abs(DEFAULT_PARAMS.charge/DEFAULT_PARAMS.size)*1e-9;
  expect(s[0].target).toBe(0);
  expect(s[0].actual).toBeCloseTo(K*lambda*Math.log(2),12);
  // They draw together: V − kλ ln(L/a) = kλ ln((L + a)/L), which falls towards zero with a.
  const gap=s.map(x=>x.actual-x.target);
  for(let i=1;i<gap.length;i++)expect(gap[i]).toBeLessThan(gap[i-1]);
  expect(gap[69]).toBeCloseTo(K*lambda*Math.log(1+1/30),12);
  expect(plot.caption).toMatch(/Both grow without end/);
  expect(plot.caption).not.toMatch(/settles/);
 });
});
describe('a diverging potential goes to |V| → ∞, with the sign of the charge',()=>{
 for(const [id,mode] of [['v-rod-axial','near'],['v-rod-bisector','infinite'],['v-disk','infinite']] as const)it(`${id}/${mode}`,()=>{
  const l=limitOf(id,mode);
  expect(l.formula,id).not.toMatch(/V\\sim[^,]*\\to\\infty/);
  expect(l.formula,id).toMatch(/\|V\|\\to\\infty$/);
  expect(plain(l.explanation),id).not.toMatch(/\bV → ∞|\) → ∞/);
  expect(plain(l.explanation),id).toMatch(/V keeps the sign of [λσ]|\|V\| → ∞/);
  // And it is so: a negative rod or disk sends V to minus infinity, not plus.
  const p=getProblem(id),down=sampleLimit(p,{...DEFAULT_PARAMS,charge:-DEFAULT_PARAMS.charge},l,30);
  expect(down.actual).toBeGreaterThan(0);
 });
 it('the sign really follows the charge',()=>{
  expect(potential('axial',{...DEFAULT_PARAMS,charge:-2,distance:.01})).toBeLessThan(0);
 });
});
describe('the arc’s diagnoses hold on an arc wider than a semicircle',()=>{
 it('at φ = 1.7π a piece at θ = 0.8π makes a field at the centre toward +x, for positive charge',()=>{
  const p={...DEFAULT_PARAMS,phi:1.7*Math.PI,charge:2},samples=REGISTRY.arc.sample(p,170);
  const piece=samples.reduce((best,s)=>Math.abs(s.coordinate-.8*Math.PI)<Math.abs(best.coordinate-.8*Math.PI)?s:best);
  expect(Math.abs(piece.coordinate-.8*Math.PI)).toBeLessThan(.02);
  expect(piece.field.x).toBeGreaterThan(0);
  // It is still −dE cos θ: the sign comes from cos θ, which is negative past a quarter turn.
  const dE=Math.hypot(piece.field.x,piece.field.y);
  expect(piece.field.x/(-dE*Math.cos(piece.coordinate))).toBeCloseTo(1,12);
  // And the sum over the arc is still toward −x: never enough pushing back to cancel.
  const total=samples.reduce((s,x)=>s+x.field.x,0);
  expect(total).toBeLessThan(0);
 });
 it('no arc message says every x-component points one way, or always toward −x',()=>{
  const arc=getProblem('arc');
  for(const f of fields(arc))for(const m of f.mistakes??[]){
   const text=plain(m.message);
   expect(text,`${f.id} ${m.expression}`).not.toMatch(/all point the same way|points back across the arc, toward −x/);
  }
  expect(said('arc','component','dE*cos(theta)')).toMatch(/toward \+x for pieces beyond that/);
  expect(said('arc','kernel','k*lambda*cos(theta)/R')).toMatch(/−cos θ for every piece/);
  expect(said('arc','result','0')).toMatch(/only an arc wider than a semicircle has pieces giving the other/);
 });
});
describe('a line with no total charge is never promised a Q',()=>{
 it('no unbounded lesson says Q appears in the result',()=>{
  for(const id of ['infinite','semi','sheet'])for(const path of ['angular','limit']){
   const p=id==='infinite'?getProblem(id,path):getProblem(id);
   for(const f of fields(p))for(const m of f.mistakes??[])expect(plain(m.message),`${id} ${f.id} ${m.expression}`).not.toMatch(/Q appears/);
  }
  expect(said('semi','field','k*Q/ri^2')).toMatch(/An endless line has no finite total charge/);
  expect(said('semi','field','k*Q/ri^2')).toMatch(/dQ = λ dx/);
  // The finite lessons keep the old diagnosis: there, Q does appear once every element is added.
  expect(said('ring','field','k*Q/ri^2')).toMatch(/Q appears once every element has been added up/);
 });
});
describe('a grown object says what is held fixed',()=>{
 it('the disk grows into a sheet at fixed σ, and says why the sum converges',()=>{
  const l=limitOf('disk','infinite'),text=plain(l.explanation);
  expect(l.title).toBe('Grow the disk into an infinite sheet');
  expect(l.formula).toContain(String.raw`(\sigma\text{ fixed})`);
  expect(text).toMatch(/Hold σ fixed/);
  expect(text).toMatch(/at fixed Q it would thin out/);
  expect(text).not.toMatch(/compensate/);
  // The far ring's share: 2πkσ z s ds/(s² + z²)^{3/2} → 2πkσ z ds/s² once s ≫ z.
  expect(text).toMatch(/2πkσz ds\/s²/);
  const s=1e4,z=1,exact=2*Math.PI*z*s/(s*s+z*z)**1.5,approx=2*Math.PI*z/(s*s);
  expect(exact/approx).toBeCloseTo(1,6);
 });
 it('the endpoint’s line grows at fixed λ, and points to the semi-infinite lesson’s swapped axes',()=>{
  const l=limitOf('endpoint','infinite');
  expect(l.formula).toContain(String.raw`(\lambda\text{ fixed})`);
  expect(plain(l.explanation)).toMatch(/x and y trade places and the same field reads \(kλ\/r\)\(−x̂ \+ ŷ\) there/);
  expect(plain(getProblem('semi').setup)).toContain('This is the rod of Line · level with an end, grown without end and laid along $x$');
  // The sidebar names the lesson it points at.
  expect(getProblem('endpoint').short).toBe('Line · level with an end');
  expect(getProblem('semi').sources[0].url).toMatch(/^https:\/\/openstax\.org\//);
 });
});
describe('the far cases explain the limit, and state its error correctly',()=>{
 it('the ramp’s far case says only the total charge matters far away, and what λ₀L would do',()=>{
  const text=plain(limitOf('ramp','far').explanation);
  expect(text).toMatch(/only its total charge does/);
  expect(text).not.toMatch(/never converges|at every distance/);
  expect(text).toMatch(/settle at one half/);
  // So it would: with λ₀L in place of Q = λ₀L/2 the plotted ratio tends to one half.
  const ramp=getProblem('ramp'),far=limitOf('ramp','far'),x=sampleLimit(ramp,DEFAULT_PARAMS,far,30);
  expect(x.actual/(2*x.target)).toBeCloseTo(.5,2);
 });
 it('measured from the centre the point-charge form is off by order (L/a)², not “good to second order”',()=>{
  for(const id of ['axial','v-rod-axial']){
   const text=plain(limitOf(id,'far').explanation);
   expect(text,id).not.toMatch(/good to second order/);
   expect(text,id).toMatch(/off only by a term of order \(L\/a\)²/);
  }
  // kQ/(a(a+L)) ÷ kQ/(a+L/2)² = 1 + L²/(4a(a+L)): the relative error falls as (L/a)².
  const L=1,err=(a:number)=>(a+L/2)**2/(a*(a+L))-1;
  expect(err(100)/err(200)).toBeCloseTo(4,1);
 });
});
describe('one arrow, one meaning',()=>{
 it('the infinite line’s scale case is an equation at two distances, not r → 2r',()=>{
  for(const path of ['angular','limit']){
   const l=getProblem('infinite',path).limits.find(x=>x.mode==='scale')!;
   expect(l.formula).not.toMatch(/\\to/);
   expect(l.formula).toBe(String.raw`E_x(r)=\frac{2k\lambda}{r},\quad E_x(2r)=\frac{2k\lambda}{2r}=\frac{k\lambda}{r}`);
  }
 });
});
describe('confusions are typeset as a textbook would',()=>{
 it('the ramp’s uniform-rod confusion is one fraction, not a fraction in a numerator',()=>{
  const m=fields(getProblem('ramp')).find(f=>f.id==='result')!.mistakes!.map(x=>x.expression);
  expect(m).toContain('k*lambda0*L/(2*r*sqrt(r^2+L^2))');
  expect(m).not.toContain('k*(lambda0*L/2)/(r*sqrt(r^2+L^2))');
 });
 it('v-disk writes σ/(2ε₀), never σ/2ε₀',()=>{
  for(const p of lessons)for(const s of p.steps)for(const text of [s.hint,...(s.fields??[]).flatMap(f=>[f.hint,...(f.mistakes??[]).map(m=>m.message)])])
   expect(plain(text),p.id).not.toMatch(/σ\/2ε₀/);
 });
});
describe('the offline copy sets its maths',()=>{
 it('names a maths face, and puts TeX’s thin space beside an operator name',()=>{
  const html=artifactHtml({title:'t',subtitle:'s',setup:'u',integralTex:String.raw`V=k\lambda\ln\left(\frac{a+L}{a}\right)`,results:[String.raw`dE\cos\alpha`]});
  expect(html).toMatch(/math \{ font-family: "STIX Two Math", "Latin Modern Math", "Cambria Math", math;/);
  // kλ ln: a space after the λ, none before the bracket.
  expect(mathml(String.raw`k\lambda\ln\left(\frac{a+L}{a}\right)`)).toMatch(/<mi>λ<\/mi><mspace width="0.1667em"\/><mi>ln<\/mi><mo>⁡<\/mo><mrow><mo fence="true">\(/);
  // cos α: a space after the function application, before the symbol.
  expect(mathml(String.raw`dE\cos\alpha`)).toMatch(/<mi>E<\/mi><mspace width="0.1667em"\/><mi>cos<\/mi><mo>⁡<\/mo><mspace width="0.1667em"\/><mi>α<\/mi>/);
  // After a relation or at the start, nothing is added.
  expect(mathml(String.raw`=\ln x`)).toMatch(/<mo>=<\/mo><mi>ln<\/mi>/);
 });
});
