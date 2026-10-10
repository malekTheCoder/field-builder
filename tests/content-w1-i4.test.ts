import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {K,limitPlot,potential,sampleLimit,DOUBLINGS} from '../src/symbolic/physics';
import {confusionTex} from '../src/symbolic/equivalence';
import {artifactHtml,lessonArtifact,lessonWorking} from '../src/state/artifact';
import {BISECTOR_UNFOLD} from '../src/workbench/derivation';
import {readFileSync} from 'node:fs';
/* WAVE 1, FOURTH PASS · CONTENT: THE WORKING SHOWN, THE HANDOUT COMPLETE, THE RULES KEPT.
 *
 * Two Unfolds asserted the antiderivatives a student cannot guess, and one did a derivative in words;
 * a confusion said "you cannot take the logarithm of a length" beside an Unfold that took two; the
 * arc's half ring was written in a λ that the lesson's own setup makes change; the semi-infinite
 * line's α was described on the other side of P; the handout went from the integral to the answer;
 * and smaller things: setups that never asked the question, colour words in a static list, a thin
 * space between every factor of the confusions. */
const plain=(s:string)=>s.replace(/ /g,' ');
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const worked=(id:string,kind='integrate')=>getProblem(id).steps.find(s=>s.kind===kind)!.worked!;
/** A central difference, for checking that an antiderivative differentiates back to its integrand. */
const d=(f:(x:number)=>number,x:number,h=1e-5)=>(f(x+h)-f(x-h))/(2*h);

describe('the Unfold derives the antiderivatives a student cannot guess',()=>{
 it('the ramp’s ∫y²dy/(y²+r²)^{3/2}: y = r tan α, sec α − cos α, back on the triangle, zero at y = 0',()=>{
  const steps=worked('ramp'),step=steps.find(w=>w.tex.includes(String.raw`\int(\sec\alpha-\cos\alpha)\,d\alpha`))!;
  expect(step,'the substitution is written').toBeDefined();
  expect(plain(step.text)).toContain(String.raw`$y=r\tan\alpha$`);
  expect(step.tex).toContain(String.raw`\ln(\sec\alpha+\tan\alpha)-\sin\alpha`);
  expect(step.tex).toContain(String.raw`\ln\frac{y+\sqrt{y^2+r^2}}{r}-\frac{y}{\sqrt{y^2+r^2}}`);
  // The displayed antiderivative is the integrand's, and it is zero at the lower end.
  const r=1.7,F=(y:number)=>Math.log((y+Math.hypot(y,r))/r)-y/Math.hypot(y,r);
  for(const y of [.2,.9,2.4,6])expect(d(F,y)).toBeCloseTo(y*y/(y*y+r*r)**1.5,8);
  expect(F(0)).toBe(0);
  // The substitution's own claims: tan²α cos α = sec α − cos α, and ln(sec α + tan α) − sin α is F.
  for(const a of [.2,.7,1.2]){
   expect(Math.tan(a)**2*Math.cos(a)).toBeCloseTo(1/Math.cos(a)-Math.cos(a),12);
   const y=r*Math.tan(a);
   expect(Math.log(1/Math.cos(a)+Math.tan(a))-Math.sin(a)).toBeCloseTo(F(y),12);
  }
  expect(plain(steps.at(-1)!.text)).toMatch(/the whole antiderivative is zero/);
  expect(plain(steps.at(-1)!.text)).not.toMatch(/ln r/);
 });
 it('the rod’s potential: ∫dy/√(y²+r²) = ∫sec α dα = ln((y + √(y²+r²))/r)',()=>{
  const first=worked('v-rod-bisector')[0];
  expect(plain(first.text)).toContain(String.raw`$y=r\tan\alpha$`);
  expect(first.tex).toContain(String.raw`\int\sec\alpha\,d\alpha`);
  expect(first.tex).toContain(String.raw`\ln\frac{y+\sqrt{y^2+r^2}}{r}`);
  const r=2.3,F=(y:number)=>Math.log((y+Math.hypot(y,r))/r);
  for(const y of [-1.5,.3,4])expect(d(F,y)).toBeCloseTo(1/Math.hypot(y,r),8);
 });
 it('its derivative is written out, not described: both fractions, then their common denominator',()=>{
  const tex=worked('v-rod-bisector','gradient')[0].tex;
  expect(tex).toContain(String.raw`\frac{k\lambda\,r/\sqrt{(L/2)^2+r^2}}{\sqrt{(L/2)^2+r^2}+L/2}`);
  expect(tex).toContain(String.raw`-\frac{k\lambda\,r/\sqrt{(L/2)^2+r^2}}{\sqrt{(L/2)^2+r^2}-L/2}`);
  expect(tex).toContain(String.raw`\cdot\frac{-L}{r^2}`);
  // Each line of it, numerically: the bracket is −L/r², and the whole is dV/dr.
  const p={...DEFAULT_PARAMS},L=p.size,r=p.distance,lambda=p.charge*1e-9/L,S=Math.hypot(L/2,r);
  expect(1/(S+L/2)-1/(S-L/2)).toBeCloseTo(-L/(r*r),12);
  const V=(x:number)=>potential('bisector',{...p,distance:x});
  expect(K*lambda*(r/S)*(-L/(r*r))/d(V,r,1e-4)).toBeCloseTo(1,6);
 });
 it('no worked step asks the reader to check an antiderivative it never derives',()=>{
  for(const p of PROBLEMS)for(const s of p.steps)for(const w of s.worked??[])
   expect(plain(w.text),`${p.id} ${s.kind}`).not.toMatch(/check (?:the antiderivative )?by differentiating|differentiate it to check/i);
 });
 it('the semi-infinite line names which rod’s integrand its E_y reuses',()=>{
  const text=plain(worked('semi')[2].text);
  expect(text).not.toMatch(/the finite rod’s/);
  expect(text).toContain(String.raw`$r/(x^2+r^2)^{3/2}$`);
  expect(text).toMatch(/when \$P\$ is level with its end/);
 });
 it('the axial rod shows both minus signs and the common denominator',()=>{
  const steps=worked('axial');
  expect(plain(steps[0].text)).toMatch(/the two minus signs cancel/);
  expect(plain(steps[0].text)).not.toMatch(/is positive/);
  expect(plain(steps[2].text)).toContain(String.raw`$\lambda L=Q$`);
  const a=.7,L=2.9;expect(1/a-1/(L+a)).toBeCloseTo(L/(a*(L+a)),12);
 });
});
describe('the working sets every symbol as TeX, in the face of the line under it',()=>{
 for(const p of [...PROBLEMS,getProblem('infinite','limit')])it(`${p.id}${p.variable==='y'&&p.id==='infinite'?' (finite rod)':''}`,()=>{
  const {worked,back}=lessonWorking(p,p);
  for(const w of [...worked,...back]){
   const words=w.text.replace(/\$[^$]*\$/g,'');
   expect(words,`${p.id}: ${w.text}`).not.toMatch(/[α-ωΑ-Ω₀-₉ₓᵧᵢ²³√∫=]/);
  }
 });
});
describe('every logarithm is of a pure number, and the rule about it says only what is true',()=>{
 /** The argument of every \ln in a TeX string: a \frac, or a bracketed group, or a bare symbol. */
 const logArguments=(tex:string)=>[...tex.matchAll(/\\ln\b/g)].map(m=>{
  let rest=tex.slice(m.index!+3).replace(/^\s*(?:\\!)?\s*(?:\\left|\\bigl|\\Bigl)?\s*/,'');
  if(!rest.startsWith('('))return rest.slice(0,6);
  let depth=0,i=0;for(;i<rest.length;i++){if(rest[i]==='(')depth++;else if(rest[i]===')'&&--depth===0)break;}
  rest=rest.slice(1,i);
  return rest;
 });
 /** A pure number: a fraction, a ratio written with a slash, one plus a ratio, or a trigonometric sum. */
 const pure=(arg:string)=>arg.startsWith('\\frac')||/^\\(?:sec|tan|sin|cos)/.test(arg)||arg.startsWith('1+')||/^[^()]*\/[^()]*$/.test(arg.replace(/\([^()]*\)/g,''));
 for(const p of PROBLEMS)it(p.id,()=>{
  const {worked,back}=lessonWorking(p);
  const texts=[...worked,...back].flatMap(w=>[w.tex,...[...w.text.matchAll(/\$([^$]*)\$/g)].map(m=>m[1])]);
  for(const tex of [...texts,p.resultTex,p.secondaryResultTex??''])for(const arg of logArguments(tex))
   expect(pure(arg),`${p.id}: ln of “${arg}” in ${tex}`).toBe(true);
  for(const f of fields(p))for(const m of f.mistakes??[])expect(m.message).not.toMatch(/cannot take the logarithm of a length/);
 });
 it('the confusions say a final answer cannot be a log of a length, and why',()=>{
  for(const [id,expression] of [['v-rod-bisector','2*k*lambda*log(L/2+sqrt((L/2)^2+r^2))'],['v-rod-axial','k*lambda*log(L+a)']]){
   const m=fields(getProblem(id)).flatMap(f=>f.mistakes??[]).find(x=>x.expression===expression)!;
   expect(m,`${id} ${expression}`).toBeDefined();
   expect(plain(m.message)).toMatch(/A final answer cannot be the logarithm of a length: change metres to centimetres/);
  }
 });
});
describe('the arc’s semicircle is written at the lesson’s fixed Q',()=>{
 const arc=getProblem('arc'),half=arc.limits.find(l=>l.mode==='half')!;
 it('in the tab’s formula, its explanation and the Unfold',()=>{
  expect(half.formula).toContain(String.raw`-\frac{2kQ}{\pi R^2}`);
  expect(plain(half.explanation)).toMatch(/λ = Q\/\(πR\)/);
  expect(worked('arc').at(-1)!.tex).toContain(String.raw`E_x(\pi)&=-\frac{2kQ}{\pi R^2}`);
 });
 it('which is the value its plot settles on, and −2kλ/R only with the semicircle’s own λ',()=>{
  const p={...DEFAULT_PARAMS},R=p.size/2,Q=Math.abs(p.charge)*1e-9;
  expect(sampleLimit(arc,p,half,30).target/(2*K*Q/(Math.PI*R*R))).toBeCloseTo(1,12);
  // At a quarter circle, λ = Q/(Rφ) is twice the semicircle's: its −2kλ/R would be twice the field.
  const quarter=Q/(R*Math.PI/2);expect(2*K*quarter/R/(2*K*Q/(Math.PI*R*R))).toBeCloseTo(2,12);
 });
});
describe('the semi-infinite line’s α is where the figure draws it',()=>{
 const setup=plain(getProblem('semi').setup);
 it('at P, from the perpendicular down to the line’s end, and the same α at +y for the field',()=>{
  expect(setup).not.toMatch(/measured from \$\+y\$ toward \$-x\$/);
  expect(setup).toMatch(/The angle \$\\alpha\$ is at \$P\$, between the perpendicular down to the line’s end and the line to an element/);
  expect(setup).toContain(String.raw`$x=r\tan\alpha$`);
  expect(setup).not.toMatch(/Line · level with an end/);
  // And it is so: the element at x = r tan α, seen from P = (0, r).
  const r=1.3;for(const a of [.3,.9,1.3]){
   const x=r*Math.tan(a),down=[0,-1],toElement=[x,-r],field=[-x,r];
   const angle=(u:number[],v:number[])=>Math.acos((u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)));
   expect(angle(down,toElement)).toBeCloseTo(a,12);
   expect(angle([0,1],field)).toBeCloseTo(a,12);
   expect(field[0]).toBeLessThan(0);
  }
 });
});
describe('every setup asks its question',()=>{
 for(const p of PROBLEMS)it(p.id,()=>{
  expect(plain(p.setup)).toMatch(p.quantity==='E'?/Find the electric field at \$P/:/Find (?:the potential|\$V\$) at \$P/);
 });
 it('the infinite line on its finite-rod route too',()=>{
  expect(plain(getProblem('infinite','limit').setup)).toMatch(/Find the electric field at \$P\$/);
 });
 it('the rods on their own axis say what Q is',()=>{
  for(const id of ['axial','v-rod-axial'])expect(plain(getProblem(id).setup),id).toContain('The rod carries a fixed total charge $Q$, so $\\lambda=Q/L$.');
 });
});
describe('the static confusion list describes no colour and no motion',()=>{
 for(const p of PROBLEMS)it(p.id,()=>{
  for(const f of fields(p))for(const m of f.mistakes??[])
   expect(plain(m.message),`${p.id} ${f.id} ${m.expression}`).not.toMatch(/orange|green|purple|\bslide\b|\bwatch\b|moves up|as the .* moves/i);
 });
});
describe('the confusions are typeset by the lessons’ hand',()=>{
 it('factors side by side; a thin space only before a differential or after a bracket',()=>{
  expect(confusionTex('pi*s^2*ds')).toBe('\\displaystyle \\pi {s}^{2}\\,ds');
  expect(confusionTex('2*pi*R*ds')).toBe('\\displaystyle 2 \\pi R\\,ds');
  expect(confusionTex('k*R*dQ/(s^2+z^2)^(3/2)')).toContain('\\frac{k R\\,dQ}');
  for(const p of PROBLEMS)for(const f of fields(p))for(const m of f.mistakes??[]){
   const tex=confusionTex(m.expression);
   for(const at of tex.matchAll(/\\,/g)){
    const after=tex.slice(at.index!+2),before=tex.slice(0,at.index);
    expect(/^d(?:[A-Za-z]|\\theta|\\ell)/.test(after)||/\\right[)\]]$/.test(before),`${m.expression}: ${tex}`).toBe(true);
   }
  }
 });
 it('rᵢ² stacks its power over its subscript',()=>{
  expect(confusionTex('k*Q/ri^2')).toContain('r_i^{2}');
  expect(confusionTex('k*Q/ri^2')).not.toContain('{r_i}^');
 });
});
describe('the semi-infinite line’s limit plot names its one curve',()=>{
 const semi=getProblem('semi'),plot=limitPlot(semi,semi.limits[0]);
 it('a sum of the line’s pieces, flat as a ratio, with the halving in the arrow',()=>{
  expect(plot.solid).toBe('The line’s pieces, added up');
  expect(plot.solid).not.toMatch(/two components|Your field/);
  expect(plot.caption).toMatch(/arrow at P shortens: double r and it halves/);
  const p={...DEFAULT_PARAMS},a=sampleLimit(semi,p,semi.limits[0],3),b=sampleLimit(semi,p,semi.limits[0],6);
  expect(b.actual/a.actual).toBeCloseTo(.5,3);
  expect(a.actual/a.target).toBeCloseTo(1,3);
 });
});
describe('the infinite line’s law plot marks r doubling',()=>{
 const line=getProblem('infinite'),limit=line.limits.find(l=>l.mode==='scale')!,plot=limitPlot(line,limit);
 it('at equal steps of the log axis, unlabelled, and the field halves from each to the next',()=>{
  expect(plot.marks!.map(m=>m.t)).toEqual(DOUBLINGS);
  for(const m of plot.marks!)expect(m.label).toBe('');
  for(let i=1;i<DOUBLINGS.length;i++)expect(Math.log(DOUBLINGS[i])-Math.log(DOUBLINGS[i-1])).toBeCloseTo(Math.log(2),12);
  const at=DOUBLINGS.map(t=>sampleLimit(line,DEFAULT_PARAMS,limit,t));
  for(let i=1;i<at.length;i++){
   expect(at[i].actual/at[i-1].actual).toBeCloseTo(.5,4);
   expect(at[i].second!/at[i-1].second!).toBeCloseTo(.25,12);
  }
  expect(plot.caption).toMatch(/Each stem stands one more doubling of r out and is half as tall as the one before it/);
 });
 it('its reason is the angle every distance sees, not more of the line coming into view',()=>{
  const text=plain(limit.explanation);
  expect(text).not.toMatch(/comes into view/);
  expect(text).toMatch(/From every distance the line fills the same angle at P/);
  // The stretch inside a fixed angle grows as r, so its field falls as 1/r: the same window,
  // θ from 0.2 to 0.4, at r and at 2r.
  const window=(r:number)=>{let e=0;const n=2000;for(let i=0;i<n;i++){const t=.2+.2*(i+.5)/n,y=r*Math.tan(t),dy=r/Math.cos(t)**2*.2/n;e+=dy*r/(y*y+r*r)**1.5;}return e;};
  expect(window(2)/window(1)).toBeCloseTo(.5,9);
 });
});
describe('the laws page says which law each lesson starts from',()=>{
 const laws=readFileSync(new URL('../src/components/Laws.tsx',import.meta.url),'utf8');
 it('Coulomb starts the field lessons; V = kQ/r the potential ones',()=>{
  expect(laws).not.toMatch(/Every derivation starts/);
  expect(laws).toMatch(/Every field lesson starts by applying it/);
  expect(laws).toMatch(/The potential lessons start from its scalar partner, V = kQ\/r/);
  const lede=/LAWS_LEDE='([^']*)'/.exec(laws)![1];
  expect(lede).not.toMatch(/Coulomb’s law gives the field of each piece/);
  expect(lede).toMatch(/\(on the potential lessons, its potential\)/);
 });
});
describe('the potential subtitles promise only the axial field',()=>{
 it('v-ring and v-disk',()=>{
  expect(getProblem('v-ring').subtitle).toMatch(/the axial field falls out of one derivative/);
  expect(getProblem('v-disk').subtitle).toMatch(/the disk’s field on its axis/);
 });
});
describe('the offline copy carries the working, set as mathematics',()=>{
 const copy=(id:string)=>artifactHtml(lessonArtifact(getProblem(id)));
 it('the ramp’s E_y antiderivative is printed between its integral and its result',()=>{
  const html=copy('ramp'),working=html.indexOf('<h2>Working</h2>');
  expect(working).toBeGreaterThan(html.indexOf('<h2>The integrals</h2>'));
  expect(working).toBeLessThan(html.indexOf('<h2>The result</h2>'));
  expect(html).toContain('\\ln(\\sec\\alpha+\\tan\\alpha)-\\sin\\alpha');
  // One line per component: the panel's two-row split is not printed on a page wide enough for one.
  expect(html).toContain(getProblem('ramp').secondaryResultTex!);
 });
 it('the bisector’s working is the Unfold’s: the substitution in full, then the lesson’s own steps',()=>{
  const {worked}=lessonWorking(getProblem('bisector'));
  expect(worked.slice(0,BISECTOR_UNFOLD.length)).toEqual(BISECTOR_UNFOLD);
  // The lesson's own last step, in the panel's rhythm and the answer's order: (L/2)² + r², a gap between rows.
  const last=getProblem('bisector').steps.find(s=>s.kind==='integrate')!.worked!.at(-1)!;
  expect(worked.at(-1)!.text).toBe(last.text);
  expect(worked.at(-1)!.tex).toContain('(L/2)^2+r^2');
  expect(worked.at(-1)!.tex).not.toContain('r^2+(L/2)^2');
  expect(copy('bisector')).toContain('<h2>Working</h2>');
 });
 it('a potential lesson prints its whole differentiation, not only the last line',()=>{
  const html=copy('v-rod-bisector'),back=getProblem('v-rod-bisector').steps.find(s=>s.kind==='gradient')!.worked!;
  const section=html.slice(html.indexOf('<h2>The field, by differentiating</h2>'));
  expect(section).toContain('\\cdot\\frac{-L}{r^2}');
  expect(section.match(/<div class="step">/g)?.length).toBe(back.length);
 });
 it('no minus after a relation or a bracket is spaced as a difference; bold letters are bold glyphs',()=>{
  for(const p of PROBLEMS){
   const html=artifactHtml(lessonArtifact(p));
   expect(html,p.id).not.toMatch(/<mo>(?:=|&lt;|&gt;|∼|→)<\/mo><mo>[−+]<\/mo>/);
   expect(html,p.id).not.toMatch(/<mo(?: [^>]*)?>[([]<\/mo><mo>[−+]<\/mo>/);
   expect(html,p.id).not.toMatch(/mathvariant="bold"/);
  }
  expect(artifactHtml(lessonArtifact(getProblem('semi')))).toContain('𝐄');
 });
});
