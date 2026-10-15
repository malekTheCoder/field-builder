import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {hold} from '../src/problems/prose';
import {limitPlot,sampleLimit} from '../src/symbolic/physics';
import {artifactHtml,displays,lessonArtifact,mathml,scriptedFences} from '../src/state/artifact';
import {SEMI_UNFOLD,SHEET_UNFOLD,workedSteps} from '../src/workbench/derivation';
/* WAVE 3, FIRST PASS · CONTENT.
 *
 * The page and the handout said "only the far end contributes" of a rod whose nearest pieces contribute
 * most, and the semi-infinite line's and the sheet's working said "as in Cut it up" on paper. Six far
 * checks were one sentence about "the object's size" that said neither why nor how fast. "Easy to
 * confuse with" named one quantity three ways and told the reader what to do under a heading that
 * promises descriptions. The arc pointed on to a ring's axis it never meets; the rod on its axis named
 * its reference by the words another lesson uses for another field. And the handout set its two
 * integrals and its result lines apart, centred one by one, its note between the integrals, its sized
 * brackets closing at text size. */
const plain=(s:string)=>s.replace(/\u00a0/g,' ');
const lessons=[...PROBLEMS,getProblem('infinite','linear')];
const fields=(p:Problem)=>p.steps.flatMap(s=>s.fields??[]);
const shown=(p:Problem)=>fields(p).filter(f=>(f.mistakes??[]).length>0);
const label=(id:string,field:string)=>fields(getProblem(id)).find(f=>f.id===field)!.label;
const unfold=(id:string)=>workedSteps(getProblem(id)).worked.map(w=>plain(w.text));

describe('an antiderivative’s limits are not the rod’s ends',()=>{
 it('no worked step says an end of the rod “contributes”, and the endpoint says the near pieces give most',()=>{
  for(const id of ['bisector','endpoint','ramp','infinite'])for(const text of unfold(id)){
   expect(text,id).not.toMatch(/far end contributes|ends contribute|lower end contributes|end contributes/);
  }
  const endpoint=unfold('endpoint');
  expect(endpoint.some(t=>/only its value at the upper limit, \$y=L\$, is left\. That is a fact about the antiderivative, not the rod: the pieces nearest \$P\$ still give the largest share of the field\./.test(t))).toBe(true);
  expect(unfold('bisector').some(t=>/its values at the two limits are equal and opposite, and subtracting doubles the upper one/.test(t))).toBe(true);
  expect(unfold('ramp').some(t=>/At the lower limit the bracket is \$-1\/r\$, so subtracting it adds \$1\/r\$/.test(t))).toBe(true);
  // And so they do: kλr/(y² + r²)^{3/2}, the endpoint's integrand, is largest at y = 0, nearest P.
  const integrand=(y:number,r=1)=>r/(y*y+r*r)**1.5;
  for(const y of [.2,.5,1,2])expect(integrand(y)).toBeLessThan(integrand(0));
  // The bracket's lower limit: −1/√(0 + r²) = −1/r, so subtracting it adds 1/r.
  const r=.7,L=2;expect((-1/Math.hypot(L,r))-(-1/r)).toBeCloseTo(1/r-1/Math.hypot(L,r),12);
 });
});

describe('the Unfold the handout prints names no stage of the run',()=>{
 it('the semi-infinite line and the sheet put α back in their own words, and their algebra holds',()=>{
  for(const w of [...SEMI_UNFOLD,...SHEET_UNFOLD])expect(w.text).not.toMatch(/Cut it up|One piece|What cancels|Add them up|Shrink them/);
  // The panel's wording: the angle named by what it is, and the minus already outside said so.
  expect(SEMI_UNFOLD[0].text).toMatch(/With \$-k\\lambda\$ outside, put .*the angle at.*from the perpendicular to the line/);
  expect(SHEET_UNFOLD[0].text).toMatch(/its angle \$\\alpha\$ at \$P\$, between the axis and the line to the ring/);
  // x dx/(x² + r²)^{3/2} with x = r tan α is sin α dα/r; z s ds/(s² + z²)^{3/2} with s = z tan α is sin α dα.
  for(const a of [.1,.6,1.3]){
   const r=.8,x=r*Math.tan(a),dx=r/Math.cos(a)**2;
   expect(x*dx/(x*x+r*r)**1.5).toBeCloseTo(Math.sin(a)/r,12);
   const z=1.7,s=z*Math.tan(a),ds=z/Math.cos(a)**2;
   expect(z*s*ds/(s*s+z*z)**1.5).toBeCloseTo(Math.sin(a),12);
  }
 });
});

describe('every far check says why the object looks like a point, and how good the point is',()=>{
 const ORDER:Record<string,string>={bisector:'(L/r)²',ring:'(R/z)²',disk:'(R/z)²',endpoint:'(L/r)²','v-ring':'(R/z)²','v-disk':'(R/z)²','v-rod-bisector':'(L/r)²'};
 it('no far explanation is the old generic sentence, and each names its order',()=>{
  // The ramp's far check has its own point to make, which charge the far field counts: Q = λ₀L/2.
  for(const p of lessons.filter(p=>p.id!=='ramp'))for(const l of p.limits.filter(l=>l.mode==='far')){
   expect(plain(l.explanation),p.id).not.toMatch(/the object’s size becomes negligible/);
   expect(plain(l.explanation),p.id).toMatch(/of order \((?:L\/r|R\/z|L\/a)\)²/);
  }
  for(const [id,order] of Object.entries(ORDER))expect(plain(getProblem(id).limits.find(l=>l.mode==='far')!.explanation),id).toContain(`of order ${order}`);
 });
 it('and the order is true: the page’s own sampler’s error falls by about nine when the distance triples',()=>{
  for(const id of Object.keys(ORDER)){
   const p=getProblem(id),far=p.limits.find(l=>l.mode==='far')!;
   const err=(t:number)=>{const s=sampleLimit(p,DEFAULT_PARAMS,far,t);return Math.abs(s.actual/s.target-1);};
   const ratio=err(10)/err(30);
   expect(ratio,id).toBeGreaterThan(7.5);
   expect(ratio,id).toBeLessThan(10.5);
  }
 });
});

describe('“Easy to confuse with” names each quantity once, its symbol last, and describes',()=>{
 it('one name for each kind of quantity',()=>{
  for(const p of lessons)for(const f of shown(p)){
   if(f.id==='projection')expect(f.label,p.id).toMatch(/^The (?:y )?factor cos [αθ]$/);
   if(f.id==='kernel'&&p.quantity==='E')expect(f.label,p.id).toMatch(/^(?:x-component integrand dEₓ\/d[xyθαs]|z-component integrand)$/);
   if(f.id==='kernel2')expect(f.label,p.id).toMatch(/^y-component integrand dEᵧ\/d[xy]$/);
   if(f.id==='kernel'&&p.quantity==='V')expect(f.label,p.id).toMatch(/^Integrand dV\/d[xyθs]$/);
   if(f.id==='result'&&p.quantity==='E')expect(f.label,p.id).toMatch(/^Total (?:x-component Eₓ|z-component)$/);
   if(f.id==='result2')expect(f.label,p.id).toBe('Total y-component Eᵧ');
  }
  expect(label('bisector','projection')).toBe('The factor cos α');
  expect(label('infinite','projection')).toBe('The factor cos α');
  expect(fields(getProblem('infinite','linear')).find(f=>f.id==='projection')!.label).toBe('The factor cos α');
  expect(label('infinite','kernel')).toBe('x-component integrand dEₓ/dα');
  expect(label('v-rod-bisector','kernel')).toBe('Integrand dV/dy');
 });
 it('no diagnosis tells the reader what to do',()=>{
  const IMPERATIVE=/(?:^|[.:;] )(?:Use|Multiply|Drop|Carry|Include|Divide|Keep|Remember|Add|Take|Put)\b/;
  for(const p of lessons)for(const f of shown(p))for(const m of f.mistakes!)expect(plain(m.message),`${p.id}/${f.id} ${m.expression}`).not.toMatch(IMPERATIVE);
  const said=(id:string,field:string,expression:string)=>plain(fields(getProblem(id)).find(f=>f.id===field&&f.mistakes?.some(m=>m.expression===expression))!.mistakes!.find(m=>m.expression===expression)!.message);
  expect(said('bisector','dq','Q*dy')).toMatch(/^Q dy would put the whole rod’s charge in one piece/);
  expect(said('bisector','component','dE')).toBe('dE is the whole slanted arrow. Only dE cos α of it lies along x.');
  expect(said('arc','dq','lambda*dtheta')).toMatch(/^λ dθ is a charge per length times an angle, which is not a charge/);
 });
});

describe('links and references name what they lead to',()=>{
 it('the arc leads on to the potential at its own centre',()=>{
  expect(getProblem('arc').link).toEqual({id:'v-arc',text:'The potential at this same centre, which the opening angle never changes'});
  expect(getProblem('v-arc').link!.id).toBe('arc');
 });
 it('the rod on its axis names its near reference by its formula, not as the semi-infinite line lesson’s field',()=>{
  const axial=getProblem('axial'),near=axial.limits.find(l=>l.mode==='near')!,plot=limitPlot(axial,near);
  expect(`${plot.y} ${plot.line} ${plot.caption}`).not.toMatch(/semi-infinite/i);
  expect(plot.y).toBe('|E| ÷ k|λ|/a');
  expect(plot.line).toMatch(/^k\|λ\|\/a, a half line on its axis$/);
  // The off-the-end lesson keeps its own name for its own √2 k|λ|/r.
  expect(limitPlot(getProblem('endpoint'),getProblem('endpoint').limits.find(l=>l.mode==='infinite')!).line).toBe('semi-infinite line');
  // And the reference is k|λ|/a: the sampled ratio tends to one as a ≪ L.
  const s=sampleLimit(axial,DEFAULT_PARAMS,near,30);
  expect(s.actual/s.target).toBeCloseTo(30/31,6);
 });
 it('the hints that ship say the physics accurately',()=>{
  const hints=(id:string)=>[...getProblem(id).steps.map(s=>plain(s.hint)),...fields(getProblem(id)).map(f=>plain(f.hint))];
  expect(hints('v-ring').join(' ')).not.toMatch(/minus from the chain rule/);
  expect(hints('v-ring').some(h=>/the power −½ brings down a minus, and the chain rule a factor 2z/.test(h))).toBe(true);
  expect(hints('ring').join(' ')).not.toMatch(/points inward in the ring plane/);
  expect(hints('endpoint').join(' ')).not.toMatch(/every finite L/);
 });
});

describe('the handout sets its maths as one piece',()=>{
 it('two integrals are one display, aligned at “=”, and the note follows both and says which it is about',()=>{
  for(const id of ['endpoint','ramp']){
   const html=artifactHtml(lessonArtifact(getProblem(id))),part=html.slice(html.indexOf('<h2>The integrals</h2>'),html.indexOf('<h2>Working</h2>'));
   expect((part.match(/display="block"/g)??[]).length,id).toBe(1);
   expect(part,id).toMatch(/E_x&amp;=[\s\S]*E_y&amp;=/);
   const note=part.indexOf('<p class="note">');
   expect(note,id).toBeGreaterThan(part.indexOf('display="block"'));
   expect(part.slice(note),id).toMatch(/^<p class="note">In (?:<span class="nobr">)?<span class="katex"><math[^>]*><semantics><mrow><msub><mi>E<\/mi><mi>x<\/mi><\/msub>/);
  }
  expect(displays(['E_x=1','E_y=\\frac{a}{b}'])).toEqual([String.raw`\begin{aligned}E_x&=1\\[0.75em]E_y&=\frac{a}{b}\end{aligned}`]);
  // A block is left as it is, and so is a single line.
  expect(displays([String.raw`\begin{aligned}a&=b\end{aligned}`,'c=d'])).toHaveLength(2);
  expect(displays(['c=d'])).toEqual(['c=d']);
 });
 it('a working display the answer repeats as one of its rows is printed once, under the result',()=>{
  for(const id of ['disk','v-disk']){
   const html=artifactHtml(lessonArtifact(getProblem(id))),working=html.slice(html.indexOf('<h2>Working</h2>'),html.indexOf('<h2>The result</h2>'));
   const last=working.split('<div class="step">').at(-1)!;
   expect(last,id).not.toContain('display="block"');
   expect(last,id).toMatch(/<p>/);
  }
  // The rod on its axis now shows kλL/(a(L + a)) among its answer's rows too (one change per "="), so its
  // last display is the answer's and is printed once, under the result. The rod level with one end keeps
  // its last display, E = E_x x̂ + E_y ŷ: a line the answer's rows do not show is never dropped.
  const last=(id:string)=>{const html=artifactHtml(lessonArtifact(getProblem(id)));return html.slice(html.indexOf('<h2>Working</h2>'),html.indexOf('<h2>The result</h2>')).split('<div class="step">').at(-1)!;};
  expect(last('axial')).not.toContain('display="block"');
  expect(last('endpoint')).toContain('display="block"');
 });
 it('a sized bracket with limits closes inside the same row as it opens',()=>{
  const m=mathml(String.raw`E_x=-\frac{k\lambda}{r}\Bigl[-\cos\alpha\Bigr]_0^{\pi/2}`);
  expect(m).not.toMatch(/<msubsup><mo [^>]*minsize/);
  expect(m).toMatch(/<msubsup><mrow><mo fence="true" stretchy="true" minsize="1.8em" maxsize="1.8em">\[<\/mo>[\s\S]*<mo fence="true" stretchy="true" minsize="1.8em" maxsize="1.8em">\]<\/mo><\/mrow><mn>0<\/mn>/);
  for(const p of lessons)expect(artifactHtml(lessonArtifact(p.id==='infinite'?getProblem('infinite'):p,p)),p.id).not.toMatch(/<msubsup><mo [^>]*minsize/);
  // Markup with nothing to move is left alone.
  const plainBracket='<mrow><mi>x</mi></mrow>';
  expect(scriptedFences(plainBracket)).toBe(plainBracket);
 });
 it('the copy carries the one script that tightens Chromium’s square roots, and nothing else',()=>{
  const html=artifactHtml(lessonArtifact(getProblem('v-disk')));
  expect(html.match(/<script>/g)).toHaveLength(1);
  expect(html).toMatch(/<script>\(function\(\)\{function fit\(\)\{var roots=document\.querySelectorAll\('msqrt'\)/);
  expect(html).not.toMatch(/<script src|fetch\(|XMLHttpRequest/);
 });
});

describe('no line of prose opens on a minus',()=>{
 it('a symbol that opens on a sign is held to the word before it',()=>{
  expect(hold('points away from the arc, toward −x.')).toBe('points away from the arc, toward\u00a0−x.');
  expect(plain(getProblem('arc').limits.find(l=>l.mode==='half')!.explanation)).toMatch(/toward −x\.$/);
  expect(getProblem('arc').limits.find(l=>l.mode==='half')!.explanation).toMatch(/toward\u00a0−x\.$/);
  // A sentence's punctuation still lets the line break after it.
  expect(hold('so it halves. −x is')).toBe('so it halves. −x is');
 });
});
