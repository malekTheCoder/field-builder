import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {limitPlot} from '../src/symbolic/physics';
import {confusionTex} from '../src/symbolic/equivalence';
import {artifactHtml,lessonArtifact,lessonWorking} from '../src/state/artifact';
import {lessonFor} from '../src/lessons';
import {ARC_UNFOLD,AXIAL_UNFOLD,DISK_UNFOLD,SEMI_UNFOLD} from '../src/workbench/derivation';
/* WAVE 2, FIRST PASS · CONTENT: ONE DERIVATION, ON THE PAGE AND ON PAPER, WITH EVERY STEP WRITTEN.
 *
 * The handout printed the working the panel had replaced on four lessons, and the linear route's
 * setup was the angular one; the potentials skipped the steps their field twins write out, at the
 * sign-error spots; the sheet left 0 − (−1/|z|) to the reader; the centre plots ran z backwards under
 * a label that said it ran forwards; the tour said fields "simply add"; and smaller things: a title
 * run unquoted into a sentence, one row printed twice, L/2 at seven pixels, a diagnosis that did not
 * say what the expression was, and formulas set two ways. */
const plain=(s:string)=>s.replace(/ /g,' ');
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const worked=(id:string,kind='integrate')=>getProblem(id).steps.find(s=>s.kind===kind)!.worked!;
const limitOf=(id:string,mode:string)=>getProblem(id).limits.find(l=>l.mode===mode)!;

describe('the offline copy prints the derivation the panel unfolds',()=>{
 it('semi, disk, arc and axial start from the panel’s own steps',()=>{
  for(const [id,unfold] of [['semi',SEMI_UNFOLD],['disk',DISK_UNFOLD],['arc',ARC_UNFOLD],['axial',AXIAL_UNFOLD]] as const){
   const {worked:w}=lessonWorking(getProblem(id));
   expect(w.slice(0,unfold.length),id).toEqual(unfold);
  }
 });
 it('none of the replaced working is printed: α to x to α, “Sine is odd”, “the two minus signs cancel”',()=>{
  const steps=(id:string)=>lessonWorking(getProblem(id)).worked.map(w=>plain(w.text)+' '+w.tex).join('\n');
  expect(steps('semi')).not.toMatch(/u=x\^2\+r\^2/);
  expect(steps('arc')).not.toMatch(/Sine is odd/);
  expect(steps('axial')).not.toMatch(/the two minus signs cancel/);
  // The disk's seven: the constant out, u, the power rule, the bracket, the lesson's own two, then the
  // row in Q its answer ends on (the panel's DISK_Q).
  expect(lessonWorking(getProblem('disk')).worked.length).toBe(DISK_UNFOLD.length+3);
  expect(steps('disk')).toContain('R^2+z^2');
 });
 it('on the finite-rod route the copy’s setup and integral are the route’s',()=>{
  const p=getProblem('infinite','angular'),route=getProblem('infinite','limit');
  const a=lessonArtifact(p,route);
  expect(a.setup).toBe(route.setup);
  expect(plain(a.setup)).toMatch(/Start with a rod of length \$L\$/);
  expect(a.setup).not.toMatch(/tan\\alpha/);
  expect(a.integralTex).toContain(String.raw`\lim_{L\to\infty}`);
  // It opens by evaluating the rod's integral it has just printed, not by quoting the rod's answer.
  expect(a.worked![0].text).toMatch(/Evaluate it between/);
  expect(a.worked![0].tex).toContain(String.raw`\right]_{-L/2}^{L/2}`);
  // The angular route keeps its own.
  expect(lessonArtifact(p).integralTex).toContain(String.raw`\cos\alpha`);
 });
 it('the copy carries the checks and the sources, and says what k is under the integral',()=>{
  for(const p of PROBLEMS){
   const html=artifactHtml(lessonArtifact(p));
   const at=(s:string)=>html.indexOf(s);
   expect(at('<h2>Checks</h2>'),p.id).toBeGreaterThan(at('<h2>The result</h2>'));
   for(const l of p.limits)expect(html,`${p.id}/${l.id}`).toContain(`<h3>${l.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</h3>`);
   // A copy led by a lesson lists its sources with the lesson's books (content-w5-copy).
   // A source whose section a lesson row already names is that row (content-w6-i1).
   if(lessonFor(p.id)){for(const s of p.sources){const sec=/§\d+\.\d+/.exec(s.title)?.[0];expect(html,`${p.id} ${s.title}`).toContain(sec&&lessonFor(p.id)!.read.some(r=>r.where.includes(sec))?sec:`href="${s.url}"`);}continue;}
   expect(at('<h2>Sources</h2>'),p.id).toBeGreaterThan(at('<h2>Checks</h2>'));
   for(const s of p.sources)expect(html,`${p.id} ${s.title}`).toContain(`href="${s.url}"`);
   // Said where the reader first meets k: the copy now builds the integral before printing it, and
   // its One piece is the board's first line with k in it (content-w4-handout).
   const k=at('<p class="where">Here ');
   expect(k,p.id).toBeGreaterThan(at('<h3>One '));
   expect(k,p.id).toBeLessThan(at('<h3>What cancels</h3>'));
   expect(html.split('<p class="where">Here ').length-1,`${p.id}: said once`).toBe(1);
   if(at('<h2>Working</h2>')>=0)expect(k,`${p.id}: k is said before the working uses it`).toBeLessThan(at('<h2>Working</h2>'));
   expect(k,p.id).toBeLessThan(at('<h2>The result</h2>'));
  }
 });
});

describe('the potentials and the rod level with an end write the steps their twins write',()=>{
 it('v-rod-axial: the constant out, the ends turned round, then the logarithm of the ends’ ratio',()=>{
  const steps=worked('v-rod-axial');
  expect(steps[0].tex).toBe(String.raw`V=k\lambda\int_0^L\frac{dx}{L+a-x}`);
  expect(plain(steps[1].text)).toMatch(/the minus turns the ends round/);
  expect(steps[1].tex).toContain(String.raw`=k\lambda\int_a^{L+a}\frac{du}{u}`);
  // The standard identity, ∫_a^b du/u = ln(b/a), not an antiderivative chosen to hold its own lower
  // limit (wave 2, iteration 2): the logarithm is still of a ratio.
  expect(steps[2].text).toContain(String.raw`$\int_a^b du/u=\ln(b/a)$`);
  expect(steps[2].tex).toBe(String.raw`V=k\lambda\int_a^{L+a}\frac{du}{u}=k\lambda\ln\frac{L+a}{a}`);
  expect(plain(steps[2].text)).not.toMatch(/ln\(u\/a\)|textbook antiderivative/);
  const L=1.7,a=.45,n=20000;
  let sum=0;for(let i=0;i<n;i++){const u=a+(i+.5)*L/n;sum+=L/n/u;}
  expect(sum).toBeCloseTo(Math.log((L+a)/a),6);
 });
 it('v-disk: 2πkσ comes outside, and the bracket is written before it is evaluated',()=>{
  const steps=worked('v-disk');
  expect(steps[0].tex).toBe(getProblem('v-disk').integralTex);
  expect(steps.some(w=>w.tex.includes(String.raw`\Bigl[\sqrt{s^2+z^2}\Bigr]_0^R`))).toBe(true);
 });
 it('endpoint: E_y’s antiderivative by the power rule, then the bracket where the two minus signs meet',()=>{
  const steps=worked('endpoint');
  const anti=steps.findIndex(w=>w.tex.includes(String.raw`\frac12\int u^{-3/2}\,du`));
  expect(anti).toBeGreaterThan(0);
  expect(steps[anti+1].tex).toContain(String.raw`-k\lambda\left[-\frac1{\sqrt{y^2+r^2}}\right]_0^L`);
  expect(plain(steps[anti+1].text)).toMatch(/minus from the projection meets the minus/);
  // The near end gives the larger term: the bracket is positive, so E_y has the sign of −λ.
  const r=.8,L=2.3;
  expect(-1/Math.hypot(L,r)-(-1/r)).toBeGreaterThan(0);
 });
 it('the sheet writes 2πkσz coming out and the subtraction 0 − (−1/z), at the z > 0 its model has',()=>{
  const steps=worked('sheet');
  expect(steps[0].tex).toContain(String.raw`2\pi k\sigma z\int_0^\infty`);
  const bracket=steps.find(w=>w.tex.includes(String.raw`\left(0+\frac1z\right)`))!;
  expect(plain(bracket.text)).toContain(String.raw`$0-(-1/z)=1/z$`);
 });
 it('the axial Unfold says “upper minus lower” once and prints no row twice',()=>{
  const steps=lessonWorking(getProblem('axial')).worked;
  expect(steps.filter(w=>/upper (?:end )?minus lower/i.test(w.text)).length).toBe(1);
  const rows=steps.flatMap(w=>w.tex.split(/\\\\|(?<!\\)=/).map(q=>q.replace(/&/g,'').trim())).filter(q=>q.length>12);
  expect(new Set(rows).size,rows.join('\n')).toBe(rows.length);
  expect(steps.at(-1)!.tex).toBe(String.raw`E_x=\frac{k\lambda L}{a(L+a)}=\frac{kQ}{a(L+a)}`);
 });
});

describe('the plots and checks say what they draw',()=>{
 it('the centre plots name the walk down the axis',()=>{
  for(const id of ['ring','v-ring','v-disk']){
   const plot=limitPlot(getProblem(id),limitOf(id,'center'));
   expect(plot.axis,id).toBe('P coming down the axis to the centre');
   expect(plot.to,id).toBe('the centre');
  }
 });
 it('the ring’s centre tab is titled in physics language',()=>{
  expect(limitOf('ring','center').title).toBe('At the centre, the field is zero');
 });
 it('the ramp: its far formula names |E|, as its plot divides; integrals carry their limits; E_y approaches',()=>{
  const far=limitOf('ramp','far'),moment=limitOf('ramp','moment');
  expect(far.formula).toContain(String.raw`|\mathbf E|\sim\frac{k|Q|}{r^2}`);
  expect(limitPlot(getProblem('ramp'),far).y).toMatch(/^\|E\|/);
  // In words: an integral quotient set in the sans face was illegible beside the KaTeX under it.
  expect(plain(far.explanation)).toContain('Q = λ₀L/2, not λ₀L');
  expect(plain(moment.explanation)).toContain('ȳ = 2L/3 is the centre of charge, the charge-weighted average height');
  for(const l of getProblem('ramp').limits)expect(l.explanation).not.toMatch(/∫/);
  expect(plain(moment.explanation)).not.toMatch(/falls to/);
  const m=fields(getProblem('ramp')).flatMap(f=>f.mistakes??[]).find(x=>x.expression==='Q*y/L*dy')!;
  expect(plain(m.message)).toMatch(/coulomb-metres/);
  expect(plain(m.message)).toContain('dQ = 2Qy dy/L²');
  // 2Qy/L² is the density: with Q = λ₀L/2 it is λ₀y/L.
  const lambda0=1.3,L=2.2,y=.7,Q=lambda0*L/2;
  expect(2*Q*y/L**2).toBeCloseTo(lambda0*y/L,14);
 });
 it('every far formula is set with \\frac, and the sheet’s grown disk is punctuated as the disk’s',()=>{
  for(const p of PROBLEMS)for(const l of p.limits.filter(q=>q.mode==='far'))
   expect(l.formula,`${p.id}`).toMatch(/\\sim\s*\\frac/);
  expect(limitOf('sheet','infinite').formula).toContain(String.raw`R\to\infty\;(\sigma\text{ fixed})`);
 });
 it('the infinite line writes (L/2)², as the finite line does, and says “tends to”',()=>{
  const p=getProblem('infinite','limit');
  expect(worked('infinite').length).toBeGreaterThan(0);
  const text=[...p.steps.flatMap(s=>(s.worked??[]).map(w=>w.tex)),...p.limits.map(l=>plain(l.explanation))].join('\n');
  expect(text).not.toMatch(/L\^2\/4|L²\/4/);
  // In the board's order, as the bisector's answer and the panel's ORDER rule write it.
  expect(text).toContain(String.raw`r\sqrt{(L/2)^2+r^2}`);
  expect(text).not.toContain(String.raw`r^2+(L/2)^2`);
  expect(plain(limitOf('infinite','infinite').explanation)).toMatch(/tends to 2kλ\/r/);
 });
});

describe('Easy to confuse with sets no fraction a storey down',()=>{
 it('L/2 and φ/2 are slashed, as the lessons write them, inside a fraction or not',()=>{
  const half=confusionTex('k*lambda*log((L/2+sqrt((L/2)^2+r^2))/r)');
  expect(half).toContain('L/2');
  expect(half).not.toMatch(/\\frac\{L\}\{2\}/);
  expect(confusionTex('2*k*lambda*log(L/2+sqrt((L/2)^2+r^2))')).not.toMatch(/\\frac\{L\}\{2\}/);
  expect(confusionTex('-k*lambda*sin(phi/2)/R')).toContain(String.raw`\varphi/2`);
  // A numeral over a numeral is still stacked: the slash is for one symbol over a numeral.
  expect(confusionTex('k*Q/(2*r)')).toContain(String.raw`\frac{k Q}{2 r}`);
  // And no stacked one-symbol-over-a-numeral fraction in any lesson's list.
  for(const p of PROBLEMS)for(const m of fields(p).flatMap(f=>f.mistakes??[])){
   const tex=confusionTex(m.expression);
   expect(tex,`${p.id} ${m.expression}`).not.toMatch(/\\frac\{(?:[A-Za-z]|\\[A-Za-z]+)\}\{\d+\}/);
  }
 });
});

describe('the words around the lessons',()=>{
 // The law page's own sentence, not the comments above it that quote what it used to say.
 const tour=/id:'law'[^}]*?description:'([^']*)'/.exec(readFileSync(new URL('../src/components/Onboarding.tsx',import.meta.url),'utf8'))![1];
 const laws=readFileSync(new URL('../src/components/Laws.tsx',import.meta.url),'utf8');
 it('the tour says fields add as vectors, and that each lesson builds its answer as an integral',()=>{
  expect(tour).not.toMatch(/simply add/);
  expect(tour).toMatch(/add as vectors/);
  expect(tour).not.toMatch(/ends in an integral rather than a formula/);
 });
 it('the laws lede is short sentences a back row can follow',()=>{
  const lede=/LAWS_LEDE='([^']*)'/.exec(laws)![1];
  expect(lede).not.toMatch(/;/);
  for(const sentence of lede.split(/(?<=\.)\s+/))expect(sentence.split(/\s+/).length,sentence).toBeLessThanOrEqual(30);
  expect(lede).toMatch(/a ring whose every bit is the same distance from P/);
 });
 it('the semi-infinite line quotes the lesson it names, and both it and the axial rod lead somewhere',()=>{
  expect(plain(getProblem('semi').setup)).toContain('the lesson “Field level with the end of a rod”,');
  expect(getProblem('semi').link).toMatchObject({id:'endpoint',text:'Cut this line back to a rod of length L'});
  expect(getProblem('axial').link).toMatchObject({id:'v-rod-axial',text:'The potential beyond this same rod'});
  for(const p of PROBLEMS)expect(p.link,p.id).toBeDefined();
 });
 it('a direction a symmetry note gives is said for positive charge',()=>{
  for(const id of ['bisector','axial','ring','semi','endpoint']){
   const text=plain(getProblem(id).symmetry.text);
   expect(text,id).toMatch(/positive charge/);
  }
  const kernel=fields(getProblem('infinite','limit')).find(f=>f.id==='kernel')!;
  expect(plain(kernel.hint)).toMatch(/cos α/);
  expect(kernel.hint).not.toMatch(/θ/);
 });
});
