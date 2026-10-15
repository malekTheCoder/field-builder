import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {hold} from '../src/problems/prose';
import {K,field,magnitude,sampleLimit,limitPlot,RING_PEAK_T,RING_EDGE_T} from '../src/symbolic/physics';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {readFileSync} from 'node:fs';
import {artifactHtml} from '../src/state/artifact';
import {resultLines} from '../src/workbench/derivation';
/* WAVE 1 · CONTENT: WHAT THE LESSONS SAY, CHECKED AGAINST WHAT A CRITIC FOUND.
 *
 * Each block is one finding: a dead textbook link, a plot whose left end was labelled with a place it
 * never reached, a curve called "your exact field" that was a different object's, a case that repeated
 * the derivation instead of checking it, two tabs that drew the same flat line, diagnoses that were
 * wrong for a negative charge, a "magnitude" that carried a sign, and the prose that broke short
 * equations across lines and mixed two spellings. */
const lessons=[...PROBLEMS,getProblem('infinite','limit')];
const plain=(s:string)=>s.replace(/ /g,' ');
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const said=(id:string,field:string,expression:string)=>{
 const m=fields(getProblem(id)).find(f=>f.id===field)?.mistakes?.find(x=>x.expression===expression);
 if(!m)throw Error(`${id} has no ${field} confusion for ${expression}`);
 return plain(m.message);
};
/** Every sentence a reader sees as plain text. */
function shown(p:Problem):[string,string][]{
 const out:[string,string][]=[['title',p.title],['subtitle',p.subtitle],['setup',p.setup]];
 p.limits.forEach(l=>out.push([`limit ${l.id} title`,l.title],[`limit ${l.id}`,l.explanation]));
 p.steps.forEach(s=>s.worked?.forEach((w,i)=>out.push([`${s.kind} worked[${i}]`,w.text])));
 fields(p).forEach(f=>{out.push([`${f.id} label`,f.label]);f.mistakes?.forEach(m=>out.push([`${f.id} ${m.expression}`,m.message]));});
 return out;
}
describe('every source’s section is the section its link opens',()=>{
 for(const p of lessons)it(p.id,()=>{
  for(const s of p.sources){
   const section=s.title.match(/§(\d+)\.(\d+)/);
   if(!section)continue;
   expect(s.url,`${p.id}: “${s.title}”`).toMatch(new RegExp(`/pages/${section[1]}-${section[2]}-`));
  }
 });
 it('the potential lessons cite OpenStax §7.3, where the ring, disk and line potentials are worked',()=>{
  for(const id of ['v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial']){
   const s=getProblem(id).sources[0];
   expect(s.title,id).toMatch(/§7\.3$/);
   expect(s.url,id).toBe('https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential');
  }
  // §7.4 is cited only where a lesson differentiates back, which is what that section does.
  for(const p of PROBLEMS)expect(p.sources.some(s=>/7-4-/.test(s.url)),p.id).toBe(p.steps.some(s=>s.kind==='gradient'));
 });
});
describe('the ring’s peak is swept from the centre',()=>{
 const ring=getProblem('ring'),peak=ring.limits.find(l=>l.mode==='maximum')!,centre=ring.limits.find(l=>l.mode==='center')!;
 it('the curve starts at zero, under the label “the centre”, and its landmarks sit at R/√2 and R',()=>{
  const p={...DEFAULT_PARAMS},R=p.size/2;
  expect(limitPlot(ring,peak).from).toBe('the centre');
  expect(sampleLimit(ring,p,peak,1).actual).toBe(0);
  // At the landmarks the sweep is at z = R/√2, the peak itself, and at z = R.
  expect(sampleLimit(ring,p,peak,RING_PEAK_T).actual/sampleLimit(ring,p,peak,RING_PEAK_T).target).toBeCloseTo(1,12);
  expect(sampleLimit(ring,p,peak,RING_EDGE_T).actual).toBeCloseTo(magnitude(field('ring',{...p,distance:R})),20);
  expect(limitPlot(ring,peak).marks!.map(m=>m.t)).toEqual([RING_PEAK_T,RING_EDGE_T]);
  expect(limitPlot(ring,peak).caption).not.toMatch(/just inside/);
 });
 it('the field at the centre is swept down from the peak, so it only falls, as its caption says',()=>{
  const s=Array.from({length:70},(_,i)=>sampleLimit(ring,DEFAULT_PARAMS,centre,1+29*i/69).actual);
  for(let i=1;i<s.length;i++)expect(s[i],`sample ${i}`).toBeLessThan(s[i-1]);
  expect(s[69]).toBe(0);
  expect(limitPlot(ring,centre).from).toBe('the peak');
 });
});
describe('a curve is called the student’s exact field only when it is',()=>{
 it('the infinite line’s rod and the sheet’s disk are named as a rod and a disk',()=>{
  expect(limitPlot(getProblem('infinite'),getProblem('infinite').limits.find(l=>l.mode==='infinite')!).solid).toBe('A rod of length L');
  expect(limitPlot(getProblem('sheet'),getProblem('sheet').limits.find(l=>l.mode==='infinite')!).solid).toBe('A disk of radius R');
 });
 it('on the bisector and the disk the growing object is the lesson’s own, and keeps the default name',()=>{
  for(const id of ['bisector','disk','endpoint'])expect(limitPlot(getProblem(id),getProblem(id).limits.find(l=>l.mode==='infinite')!).solid,id).toBeUndefined();
 });
});
describe('the infinite line checks its own 1/r, and defines the L it borrows',()=>{
 for(const path of ['angular','limit'])it(path,()=>{
  const p=getProblem('infinite',path);
  expect(p.limits.map(l=>l.mode)).toEqual(['scale','infinite']);
  const scale=p.limits[0],rod=p.limits[1];
  expect(scale.title).toBe('Double r and E halves');
  expect(plain(scale.explanation)).toMatch(/1\/r and never steepens to a point charge’s 1\/r²/);
  // Doubling r halves the summed field: a point-charge sum, not the closed form.
  const at=(t:number)=>sampleLimit(p,DEFAULT_PARAMS,scale,t).actual;
  expect(at(2)/at(1)).toBeCloseTo(.5,6);expect(at(24)/at(12)).toBeCloseTo(.5,6);
  expect(sampleLimit(p,DEFAULT_PARAMS,scale,12).target).toBeCloseTo(2*K*DEFAULT_PARAMS.charge*1e-9/12,20);
  // The rod case says what L is before using it, and no longer repeats the derivation.
  expect(plain(rod.explanation)).toMatch(/A rod of length L/);
  expect(rod.explanation).not.toMatch(/[Dd]ividing/);
 });
});
describe('the arc’s potential draws the field vanishing beside it',()=>{
 const arc=getProblem('v-arc');
 it('one case, two curves: V flat on kQ/R, |E| falling to zero as the arc closes',()=>{
  expect(arc.limits.map(l=>l.mode)).toEqual(['full']);
  const full=arc.limits[0],plot=limitPlot(arc,full);
  expect(plot.second).toBeDefined();
  const s=Array.from({length:70},(_,i)=>sampleLimit(arc,DEFAULT_PARAMS,full,1+29*i/69));
  for(const x of s)expect(x.actual/x.target).toBeCloseTo(1,9);
  expect(s[69].second!/s[0].second!).toBeLessThan(1e-12);
  for(let i=1;i<s.length;i++)expect(s[i].second!).toBeLessThan(s[i-1].second!);
 });
 it('says V sits at kQ/R with the sign of Q, not “high”',()=>{
  for(const p of lessons)for(const [where,text] of shown(p))expect(text,`${p.id} ${where}`).not.toMatch(/high value/);
  expect(plain(arc.limits[0].explanation)).toMatch(/sign of Q/);
 });
});
describe('v-ring’s confusions diagnose the expression, for either sign',()=>{
 it('kQ/z is a point charge at the centre, right only far away',()=>{
  expect(said('v-ring','result','k*Q/z')).toMatch(/point charge at the centre/);
  expect(said('v-ring','result','k*Q/z')).toMatch(/z ≫ R/);
 });
 it('0 is the scalar cancelled like a vector',()=>{
  expect(said('v-ring','result','0')).toMatch(/Potential is a scalar/);
  // Not "only the components of a vector cancel": a dipole's V is zero all along its bisector.
  // What keeps this ring's dV from cancelling is that its charge has one sign.
  expect(said('v-ring','result','0')).not.toMatch(/Only the components of a vector cancel/);
  expect(said('v-ring','result','0')).toMatch(/charge of the same sign/);
  expect(said('v-ring','result','0')).toMatch(/Potentials cancel only between charges of opposite sign/);
 });
 it('kQ/R: it is |V| that is smaller further up, since V is negative for a negative ring',()=>{
  expect(said('v-ring','result','k*Q/R')).toMatch(/\|V\| is smaller/);
 });
});
describe('the words name what the algebra does',()=>{
 it('dE is one element’s field, signed with dQ, not a magnitude',()=>{
  for(const p of lessons)for(const f of fields(p))expect(f.label,p.id).not.toMatch(/Magnitude/);
  expect(fields(getProblem('bisector')).find(f=>f.id==='field')!.label).toBe('One piece’s field dE');
 });
 it('a disk is concentric rings in one plane, not a stack along the axis',()=>{
  expect(getProblem('disk').subtitle).toMatch(/concentric rings/);
  expect(getProblem('v-disk').subtitle).toMatch(/concentric rings/);
  for(const p of lessons)expect(p.subtitle,p.id).not.toMatch(/stack/i);
 });
 it('the disk’s result says where it holds, as the sheet’s and the disk potential’s do',()=>{
  expect(getProblem('disk').resultTex).toMatch(/\(z>0\)$/);
 });
 it('E_y’s sign is left to λ in the data, not fixed to “< 0”',()=>{
  for(const id of ['endpoint','ramp'])expect(getProblem(id).secondaryResultTex,id).not.toMatch(/<0/);
 });
 it('the semi-infinite line and the ramp say where P is, on their own page',()=>{
  const semi=getProblem('semi'),ramp=getProblem('ramp');
  expect(semi.title).toBe('Field level with the end of a semi-infinite line');
  expect(plain(semi.subtitle)).toMatch(/P sits beside the end; nothing beyond it cancels the part along the line/);
  expect(plain(semi.setup)).toContain(String.raw`A uniform line charge, density $\lambda$, lies on the $y$-axis`);
  expect(ramp.subtitle).not.toMatch(/same/);
  expect(plain(ramp.subtitle)).toMatch(/P is level with the rod’s empty end/);
 });
 it('the ramp’s E_x remark sits under E_x, and its E_y block holds only E_y',()=>{
  const worked=getProblem('ramp').steps.find(s=>s.kind==='integrate')!.worked!;
  expect(worked[1].tex).toMatch(/E_x/);expect(plain(worked[1].text)).toMatch(/weaker than a uniform rod/);
  const last=worked[worked.length-1];
  expect(last.tex).not.toMatch(/Q&=/);
  // The antiderivative is written with a ratio for its logarithm, so the lower end gives zero, not ln r.
  expect(plain(last.text)).toMatch(/^Evaluate from \$0\$ to \$L\$\. .*the whole antiderivative is zero\.$/);
  expect(said('ramp','dq','lambda0*dy')).not.toMatch(/thinner/);
  expect(said('ramp','dq','lambda0*dy')).toMatch(/density is only λ\(y\)/);
 });
 it('the endpoint derives its antiderivative, and the disk says where 2πkσz and σ/(2ε₀) come from',()=>{
  const endpoint=getProblem('endpoint').steps.find(s=>s.kind==='integrate')!.worked!;
  expect(plain(endpoint[0].text)).toContain(String.raw`Substitute $y=r\tan\alpha$`);
  expect(endpoint[0].text).not.toMatch(/centred rod uses/);
  const disk=getProblem('disk').steps.find(s=>s.kind==='integrate')!.worked!;
  expect(plain(disk[0].text)).toContain(String.raw`$2\pi k\sigma z$ comes outside the integral`);
  expect(plain(disk[disk.length-1].text)).toContain(String.raw`$2\pi k\sigma=\sigma/(2\varepsilon_0)$`);
 });
 it('stale or imprecise diagnoses are gone',()=>{
  expect(said('bisector','component2','0')).not.toMatch(/next step/);
  expect(said('bisector','component2','0')).toMatch(/the run’s “What cancels” stage/);
  expect(said('sheet','kernel','k*z*sigma/(s^2+z^2)^(3/2)')).toMatch(/circumference, 2πs/);
  for(const p of lessons)for(const [where,text] of shown(p))expect(text,`${p.id} ${where}`).not.toMatch(/green/);
  expect(said('bisector','field','k*dQ/ri')).toBe(said('ring','field','k*dQ/ri'));
 });
 it('the semi-infinite case’s formula states the flat ratio its plot draws',()=>{
  const l=getProblem('semi').limits[0];
  expect(l.formula).toContain(String.raw`|E_x|=|E_y|`);
  expect(plain(l.explanation)).toMatch(/doubling r halves each of them/);
 });
});
describe('the page shows no numerals outside its formulas',()=>{
 it('no numeric angle and no numeric k',()=>{
  for(const p of lessons)for(const [where,text] of shown(p))expect(text,`${p.id} ${where}`).not.toMatch(/°/);
  for(const p of lessons)for(const l of p.limits)expect([l.answer,...l.choices].join(' '),`${p.id}/${l.id}`).not.toMatch(/°/);
 });
});
describe('one spelling: British',()=>{
 const US=/\b(center|centers|centered|canceled|canceling|meters|color)\b/i;
 for(const p of lessons)it(p.id,()=>{
  for(const [where,text] of shown(p))expect(text,`${p.id} ${where}`).not.toMatch(US);
  for(const l of p.limits){const plot=limitPlot(p,l);for(const text of [plot.y,plot.axis,plot.from,plot.to,plot.line,plot.caption,plot.solid??'',plot.second??''])expect(text,`${p.id}/${l.id} plot`).not.toMatch(US);}
  for(const s of p.steps)for(const text of [s.text,s.hint,s.title])expect(text,`${p.id} ${s.kind}`).not.toMatch(US);
 });
});
describe('short equations in prose do not break across lines',()=>{
 it('the helper holds relations, operators, coordinates and symbol pairs, and leaves words breakable',()=>{
  expect(hold('so E = 0 means V is flat')).toBe('so E = 0 means V is flat');
  expect(hold('ΔV = −σ Δz/(2ε₀) here')).toBe('ΔV = −σ Δz/(2ε₀) here');
  expect(hold('P = (0, 0, z), z > 0.')).toBe('P = (0, 0, z), z > 0.');
  expect(hold('it is 2kλ ln(r₂/r₁). A line')).toBe('it is 2kλ ln(r₂/r₁). A line');
  expect(hold('the field of a long rod')).toBe('the field of a long rod');
 });
 for(const p of lessons)it(`${p.id}/${p.variable}: no breaking space beside “=” or “→”, and no held run longer than a short formula`,()=>{
  const texts=[p.subtitle,p.setup,...p.steps.flatMap(s=>[s.text,...(s.worked??[]).map(w=>w.text),...(s.fields??[]).flatMap(f=>(f.mistakes??[]).map(m=>m.message))]),...p.limits.map(l=>l.explanation)];
  // A $…$ span is TeX, set by the page's Prose as one unbreakable formula: only the words around it
  // are held by no-break spaces, and only they are checked here.
  for(const text of texts.map(t=>t.split('$').filter((_,i)=>i%2===0).join(' '))){
   expect(text,text).not.toMatch(/ [=→]|[=→] /);
   for(const run of text.split(/[ \n]/))expect(run.length,`${p.id}: “${plain(run)}”`).toBeLessThanOrEqual(32);
  }
 });
});
describe('the laws page and the offline copy',()=>{
 it('the lede and Coulomb’s row say a piece may be a ring, not always a point',()=>{
  // Read as source: the component pulls in the dialog, which the node suite cannot resolve.
  const laws=readFileSync(new URL('../src/components/Laws.tsx',import.meta.url),'utf8');
  expect(laws.match(/a ring whose every bit is the same distance from P/g)?.length,'the lede and Coulomb’s row').toBe(2);
  expect(laws).not.toMatch(/one piece of charge small enough to count as a point/);
  // Symbols only: k is defined, not approximated.
  // The superposition row writes E ≈ Σ ΔE_i for pieces treated as points; what may never be ≈ is k.
  expect(laws).not.toMatch(/8\.99|k\s*\\approx/);
  expect(laws).toMatch(/on a symmetry axis, where E has only its part along the axis, is a single derivative/);
 });
 it('the offline copy defines k where its formulas use it, and a potential lesson carries its field',()=>{
  const v=getProblem('v-ring'),derived=v.steps.find(s=>s.kind==='gradient')!.worked!.slice(-1).map(w=>w.tex);
  const html=artifactHtml({title:v.title,subtitle:v.subtitle,setup:v.setup,integralTex:v.integralTex,results:resultLines(v),derived});
  expect(html).toMatch(/The field, by differentiating/);
  expect(html).toContain('<annotation encoding="application/x-tex">E_z=-\\frac{dV}{dz}');
  expect(html).toMatch(/<p class="where">Here <span class="katex"><math/);
  expect(html).toContain('k=\\dfrac{1}{4\\pi\\varepsilon_0}');
  // No k anywhere in what the copy prints: no definition either.
  const bare=artifactHtml({title:'t',subtitle:'s',setup:'u',integralTex:String.raw`E_z=\frac{\sigma}{2\varepsilon_0}`,results:[String.raw`E_z=\frac{\sigma}{2\varepsilon_0}`]});
  expect(bare).not.toMatch(/class="where"/);
 });
});
