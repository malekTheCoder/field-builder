import {describe,it,expect} from 'vitest';
import katex from 'katex';
import {readFileSync} from 'node:fs';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {limitPlot,sampleLimit,field} from '../src/symbolic/physics';
import {hold,symbolic} from '../src/problems/prose';
import {artifactHtml,escapeHtml,lessonArtifact,lessonWorking,mathml} from '../src/state/artifact';
import {ARC_UNFOLD,AXIAL_UNFOLD,BISECTOR_UNFOLD,DISK_UNFOLD,ENDPOINT_UNFOLD,INFINITE_UNFOLD,RAMP_UNFOLD,SEMI_UNFOLD,SHEET_UNFOLD,V_DISK_POWER,V_ROD_BISECTOR_UNFOLD} from '../src/workbench/derivation';
/* WAVE 2, SECOND PASS · CONTENT: THE HANDOUT SAYS ONLY WHAT IS ON PAPER, AND THE STEPS STAND APART.
 *
 * The copy's Checks read the on-screen plot aloud ("The plot adds up…", "the curve would settle…") to a
 * reader holding paper; it printed every lesson's integral and then the same display again as its
 * first working step; it set r sec²α as "rsec²α" and φ in two faces. The lessons' own worked rows sat
 * three pixels apart, the sheet's working leaned on the disk's, the infinite line ended on a slashed
 * 2kλ/r over a stacked one, v-rod-axial picked an antiderivative that held its own lower limit, and
 * the rod on its axis had no check at its near end. */
const plain=(s:string)=>s.replace(/\u00a0/g,' ');
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const said=(id:string,field:string,expression:string)=>plain(fields(getProblem(id)).filter(f=>f.id===field).flatMap(f=>f.mistakes??[]).find(m=>m.expression===expression)!.message);
const limitOf=(id:string,mode:string)=>getProblem(id).limits.find(l=>l.mode===mode)!;
const lessons=[...PROBLEMS,getProblem('infinite','linear')];
/** The panel's own Unfold steps: the panel lane words them, and they are checked in its tests. */
const PANEL=new Set([...ARC_UNFOLD,...AXIAL_UNFOLD,...BISECTOR_UNFOLD,...DISK_UNFOLD,...ENDPOINT_UNFOLD,...INFINITE_UNFOLD,...SEMI_UNFOLD,...SHEET_UNFOLD,...RAMP_UNFOLD,...V_DISK_POWER,...V_ROD_BISECTOR_UNFOLD]);

describe('the handout speaks only of what is on paper',()=>{
 const SCREEN=/\b(plot|curve|dashed|slider|thumbnail)\b/i,STAGES=/\b(Cut it up|One piece|What cancels|Add them up|Shrink them)\b/;
 for(const p of lessons)it(`${p.id}/${p.variable}: no check or worked step points at a plot or a stage of the run`,()=>{
  const a=lessonArtifact(p);
  for(const c of a.checks!)for(const text of [c.title,c.explanation]){
   expect(plain(text),`${p.id} check “${c.title}”`).not.toMatch(SCREEN);
   expect(plain(text),`${p.id} check “${c.title}”`).not.toMatch(STAGES);
  }
  // Every step the copy prints, the panel's own Unfold steps included: they are printed too, and the
  // semi-infinite line's and the sheet's once said "as in Cut it up" and "Add them up’s" on paper.
  for(const w of [...a.worked!,...a.back!])for(const text of [w.text,w.tex]){
   expect(plain(text),p.id).not.toMatch(SCREEN);
   expect(plain(text),p.id).not.toMatch(STAGES);
  }
 });
 it('the three that did now say it in physics',()=>{
  expect(plain(limitOf('infinite','scale').explanation)).toMatch(/So \|E\| times r never changes: doubling r halves the field\.$/);
  expect(plain(limitOf('arc','half').explanation)).toMatch(/toward −x\.$/);
  expect(plain(limitOf('ramp','far').explanation)).toMatch(/With λ₀L in its place the far field would come out twice too large\./);
  // Twice too large: the point-charge field from λ₀L against the true far field from Q = λ₀L/2.
  const ramp=getProblem('ramp'),far=limitOf('ramp','far'),x=sampleLimit(ramp,DEFAULT_PARAMS,far,30);
  expect(2*x.target/x.actual).toBeCloseTo(2,1);
  // The half-ring's N point charges are introduced by the caption under the plot that draws them.
  expect(limitPlot(getProblem('arc'),limitOf('arc','half')).caption).toMatch(/^The plot builds the semicircle from N point charges/);
 });
});

describe('the copy prints the integral once, its operators spaced and its Greek in one face',()=>{
 it('a first worked step that only repeats the integral becomes a note under it',()=>{
  let notes=0;
  for(const p of lessons){
   const a=lessonArtifact(p),html=artifactHtml(a),integral=escapeHtml(a.integralTex);
   // The display under the heading: the integral, or both integrals aligned as one where there are two.
   const shown=/<h2>The integrals?<\/h2>[\s\S]*?<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/.exec(html)![1];
   if(!a.secondaryIntegralTex)expect(shown,p.id).toBe(integral);
   expect(html.split(`<annotation encoding="application/x-tex">${shown}</annotation>`).length-1,`${p.id}/${p.variable}: the integral is printed once`).toBe(1);
   if(html.includes('<p class="note">')){
    notes++;
    expect(html.indexOf('<p class="note">'),p.id).toBeLessThan(html.indexOf('<h2>The result</h2>'));
    expect(html.indexOf('<p class="note">'),p.id).toBeGreaterThan(html.indexOf(`${integral}</annotation>`));
   }
  }
  expect(notes).toBeGreaterThanOrEqual(10);
 });
 it('r sec²α and r³ sec³α are set apart, and so is sec²α from the α after it',()=>{
  const THIN='<mspace width="0.1667em"/>';
  const m=mathml(String.raw`dy=r\sec^2\alpha\,d\alpha`);
  expect(m).toContain(`<mi>r</mi>${THIN}<msup><mrow><mi>sec</mi>`);
  expect(m).toMatch(new RegExp(`<mn>2</mn></msup>${THIN}<mi>α</mi>`));
  const f=mathml(String.raw`\frac{r\cdot r\sec^2\alpha}{r^3\sec^3\alpha}`);
  expect(f).toContain(`</msup>${THIN}<msup><mrow><mi>sec</mi>`);
  // After a relation the operator follows on directly, as TeX sets it.
  expect(mathml(String.raw`x=\sec^2\alpha`)).toContain('<mo>=</mo><msup><mrow><mi>sec</mi>');
  // No lesson's copy runs a symbol into a squared operator any more.
  for(const p of lessons)expect(artifactHtml(lessonArtifact(p)),p.id).not.toMatch(/<\/(?:mi|mn|msup)><msup><mrow><mi>(?:sec|tan|cos|sin)<\/mi>/);
 });
 it('the checks set φ and the other Greek letters in the formula’s face; capitals stay upright',()=>{
  const html=artifactHtml(lessonArtifact(getProblem('arc')));
  const checks=html.slice(html.indexOf('<h2>Checks</h2>'),html.indexOf('<h2>Sources</h2>'));
  const paragraphs=[...checks.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m=>m[1]);
  expect(paragraphs.length).toBeGreaterThan(0);
  for(const p of paragraphs)expect(p.replace(/<span class="g(?: up)?">[Ͱ-Ͽ]<\/span>/g,'')).not.toMatch(/[Ͱ-Ͽ]/);
  expect(checks).toContain('<span class="g">φ</span>');
  const disk=artifactHtml(lessonArtifact(getProblem('v-disk')));
  expect(disk).toContain('<span class="g up">Δ</span>');
  expect(html).toMatch(/\.g \{ font-family: "STIX Two Math"/);
 });
 it('an aligned block’s columns are set by the property Chromium reads',()=>{
  const html=artifactHtml(lessonArtifact(getProblem('arc')));
  expect(html).toContain('text-align: right; text-align: -webkit-right;');
  expect(html).toContain('text-align: left; text-align: -webkit-left;');
 });
});

/* The rows of an aligned block stand a gap apart -- the measure panel-rhythm uses for the panel's own
 * steps, here for the steps the lessons write. */
type Box={classes?:string[];children?:Box[];height?:number;depth?:number};
const tree=(tex:string)=>(katex as unknown as {__renderToHTMLTree:(t:string,o:object)=>Box}).__renderToHTMLTree(tex,{displayMode:true,throwOnError:true,strict:'ignore'});
function find(n:Box,cls:string):Box|undefined{
 if(n.classes?.includes(cls))return n;
 for(const c of n.children??[]){const f=find(c,cls);if(f)return f;}
}
function whites(tex:string){
 const body=tex.replace(/^\\begin\{aligned\}|\\end\{aligned\}$/g,'');
 const rows=body.split(/\\\\(?:\[[^\]]*\])?/);
 const column=find(tree(tex),'mtable')!.children!.find(c=>c.classes?.some(k=>k.startsWith('col-align')))!;
 const laid=find(column,'vlist')!.children!.map(w=>w.children![1]);
 const own=rows.map(r=>tree(r.replace(/&/g,'')));
 return rows.slice(1).map((row,i)=>({row,white:(laid[i].depth!-own[i].depth!)+(laid[i+1].height!-own[i+1].height!)}));
}
describe('the lessons’ own worked rows stand apart',()=>{
 it('every row that opens a new equality has about .7em of white above it',()=>{
  const bad:string[]=[];let seen=0;
  for(const p of lessons){
   const {worked,back}=lessonWorking(p);
   for(const w of [...worked,...back].filter(w=>!PANEL.has(w)&&w.tex.startsWith('\\begin{aligned}')))
    for(const {row,white} of whites(w.tex)){
     // A row that opens on "=" (or a label and "="), indented or not, is a new equality; a row that
     // goes on with "− …" or "× …", or hangs under a bracket, continues the one above at line spacing.
     if(!/^[^&]*&(?:\\quad\s*)?=/.test(row.trim()))continue;
     seen++;
     if(white<.55||white>.95)bad.push(`${p.id}: ${white.toFixed(2)}em above “${row.slice(0,50)}”`);
    }
  }
  expect(seen).toBeGreaterThan(15);
  expect(bad).toEqual([]);
 });
});

describe('the working says each step in the lesson’s own terms',()=>{
 it('the infinite line ends on stacked fractions, as its result does',()=>{
  for(const route of ['angular','linear']){
   const last=lessonWorking(getProblem('infinite',route)).worked.at(-1)!.tex;
   expect(last,route).toContain(String.raw`\frac{2k\lambda}{r}`);
   expect(last,route).not.toMatch(/\\lambda\/r|\/\(2\\pi/);
  }
 });
 it('the arc writes sin(φ/2) one way, its two last rows a gap apart',()=>{
  const steps=lessonWorking(getProblem('arc')).worked;
  for(const w of steps)expect(w.tex).not.toContain(String.raw`\sin(\varphi/2)`);
  expect(steps.at(-1)!.tex).toContain(String.raw`\sin\frac\varphi2\\[`);
 });
 it('no step calls a component “signed” or claims its sign with < 0 or > 0',()=>{
  for(const p of lessons)for(const w of [...lessonWorking(p).worked,...lessonWorking(p).back]){
   expect(plain(w.text),p.id).not.toMatch(/\bsigned\b/);
   expect(w.tex,p.id).not.toMatch(/E_[xyz]\s*[<>]\s*0/);
  }
  expect(plain(lessonWorking(getProblem('ring')).worked.at(-1)!.text)).toMatch(/^The component \$E_z\$ can come out negative: reversing \$z\$ or \$Q\$ reverses it\./);
 });
 // The page and the copy now show the panel's SHEET_UNFOLD, in the sheet's own angle; the lesson's own
 // steps are still the integrate step's hint and what the derivation checks read, and stand on their own.
 it('the sheet’s own steps stand on their own, at the z > 0 its model has',()=>{
  const steps=getProblem('sheet').steps.find(s=>s.kind==='integrate')!.worked!,all=steps.map(w=>plain(w.text)+' '+w.tex).join('\n');
  expect(all).not.toMatch(/disk|Gauss|pillbox|sgn|\|z\|/);
  expect(steps.some(w=>w.tex.includes(String.raw`\frac12\int u^{-3/2}\,du`))).toBe(true);
  expect(steps.at(-1)!.tex).toBe(String.raw`E_z=2\pi k\sigma=\frac{\sigma}{2\varepsilon_0}`);
  // The bracket at z > 0: 2πkσz (0 − (−1/z)) = 2πkσ, whatever z is.
  for(const z of [.3,2.2])expect(2*Math.PI*z*(0-(-1/Math.sqrt(z*z)))).toBeCloseTo(2*Math.PI,12);
 });
 it('the ramp’s E_y ends on the bracket the answer prints',()=>{
  const last=lessonWorking(getProblem('ramp')).worked.at(-1)!.tex;
  expect(last).toContain(String.raw`\bigg[\ln\frac{L+\sqrt{L^2+r^2}}{r}`);
  expect(last).toContain(String.raw`-\frac{L}{\sqrt{L^2+r^2}}\bigg]`);
 });
 it('v-rod-axial differentiates its logarithm without splitting it into logs of lengths',()=>{
  const back=lessonWorking(getProblem('v-rod-axial')).back;
  expect(plain(back[0].text)).toMatch(/differentiates to the top’s derivative over the top, minus the bottom’s over the bottom: here \$1\/\(L\+a\)-1\/a\$\./);
  expect(plain(back[0].text)).not.toMatch(/difference of two logarithms/);
 });
 it('the endpoint states E_y in Q as well, as it states E_x, and both forms agree',()=>{
  const p=getProblem('endpoint');
  expect(p.secondaryResultTex).toContain(String.raw`=-\frac{kQ}{L}\left(\frac1r-\frac1{\sqrt{L^2+r^2}}\right)`);
  const r=1.3,L=2.1,Q=2e-9,k=8.9875517923e9,e=field('endpoint',{...DEFAULT_PARAMS,distance:r,size:L,charge:Q*1e9});
  expect(-(k*Q/L)*(1/r-1/Math.hypot(r,L))/e.y).toBeCloseTo(1,6);
 });
});

describe('the words',()=>{
 it('the confusions read aloud without a stumble',()=>{
  expect(said('bisector','component2','0')).toMatch(/that pairing is what the run’s “What cancels” stage shows/);
  expect(said('arc','projection','sin(theta)')).toMatch(/The x-component uses cos θ, and with a minus sign: the direction from the piece to the centre is −\(cos θ, sin θ\)\.$/);
  expect(said('v-disk','result','k*Q/z')).toMatch(/^That is the point-charge potential, the far limit, valid only for z ≫ R\./);
  expect(said('v-disk','result','k*Q/z')).not.toMatch(/far-field/);
 });
 it('the limits say each thing once, in the lesson’s order of terms',()=>{
  expect(plain(limitOf('v-rod-axial','near').explanation)).toContain('ln((L + a)/a)');
  expect(plain(limitOf('v-arc','full').explanation)).not.toMatch(/E = 0\. E = 0/);
  expect(plain(limitOf('v-arc','full').explanation)).toMatch(/so E = 0 there\. That means V is level at the centre/);
  // A ring's own field at P is axial; it is its bits' fields that lean further over.
  expect(plain(limitOf('disk','infinite').explanation)).toMatch(/its bits’ fields more sideways, so its axial field is smaller/);
 });
 it('the sheet’s subtitle is one short sentence pair',()=>{
  expect(plain(getProblem('sheet').subtitle).length).toBeLessThan(150);
 });
 it('the laws say thin enough seen from P, and that Coulomb is the law the lessons build from',()=>{
  const laws=readFileSync(new URL('../src/components/Laws.tsx',import.meta.url),'utf8');
  expect(laws).toContain('each thin enough, seen from P, to count as a point');
  expect(laws).toContain('The only field law the lessons build from.');
  expect(laws).not.toContain('The only field law in the app');
  expect(laws).not.toMatch(/each small enough to count as a point|a bit small enough/);
 });
});

describe('a sign in front of a symbol is part of it',()=>{
 it('−dE, +dE and −(cos are symbols, and are held to the symbol after them',()=>{
  for(const t of ['−dE','+dE','−(cos','−dE,'])expect(symbolic(t),t).toBe(true);
  // The sign's symbol is held to the word before it too, so no line opens on a minus (content-w3-i1).
  expect(hold('the x-part of dE is −dE sin α.')).toBe('the x-part of dE is\u00a0−dE\u00a0sin\u00a0α.');
  expect(symbolic('−')).toBe(false);
 });
 it('no shown sentence breaks between a signed symbol and the symbol after it',()=>{
  for(const p of lessons){
   const texts=[...fields(p).flatMap(f=>(f.mistakes??[]).map(m=>m.message)),...p.limits.map(l=>l.explanation),p.symmetry.text];
   for(const text of texts.map(t=>t.split('$').filter((_,i)=>i%2===0).join(' ')))
    for(const [,a,b] of text.matchAll(/(\S+) (?=(\S+))/g))
     expect(/^[−+]/.test(a)&&!/[.,;:!?]$/.test(a)&&symbolic(a.replace(/^[−+]/,''))&&symbolic(b),`${p.id}: “${plain(a)} ${plain(b)}” can break`).toBe(false);
  }
 });
});

describe('the rod on its axis is checked at its near end too',()=>{
 const axial=getProblem('axial'),near=axial.limits.find(l=>l.id==='near')!;
 it('it has the case, as its potential twin does',()=>{
  expect(near).toBeDefined();
  expect(near.mode).toBe('near');
  expect(near.formula).toBe(String.raw`a\ll L:\quad E_x\sim\frac{k\lambda}{a}`);
  expect(plain(near.explanation)).toMatch(/semi-infinite line on its own axis/);
  const plot=limitPlot(axial,near);
  expect(plot.kind).toBe('ratio');
  expect(plot.caption).not.toMatch(/[0-9]/);
 });
 it('the field over kλ/a is L/(L + a): it climbs from a half to one as P reaches the end',()=>{
  const p={...DEFAULT_PARAMS},L=p.size;
  let last=0;
  for(const t of [1,2,5,12,30]){
   const s=sampleLimit(axial,p,near,t),a=L/t,ratio=s.actual/s.target;
   expect(ratio,`t=${t}`).toBeCloseTo(L/(L+a),10);
   expect(ratio).toBeGreaterThan(last);last=ratio;
  }
  expect(last).toBeGreaterThan(.96);
  expect(sampleLimit(axial,p,near,1).actual/sampleLimit(axial,p,near,1).target).toBeCloseTo(.5,10);
  // The field at the near end points away from a positive rod, along +x.
  expect(sampleLimit(axial,p,near,10).vector!.x).toBeGreaterThan(0);
 });
 it('the potential’s near case is unchanged: V against its logarithm',()=>{
  const v=getProblem('v-rod-axial'),vn=v.limits.find(l=>l.mode==='near')!;
  expect(limitPlot(v,vn).kind).toBe('growth');
 });
});
