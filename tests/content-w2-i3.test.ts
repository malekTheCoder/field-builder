import {describe,it,expect} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import type {Problem} from '../src/problems/types';
import {artifactHtml,escapeHtml,lessonArtifact,mathml} from '../src/state/artifact';
import {boardLines,resultLines} from '../src/workbench/derivation';
/* WAVE 2, THIRD PASS · CONTENT: THE HANDOUT'S ANSWER IS THE PAGE'S, IN ONE ORDER.
 *
 * The copy's "The result" went a step back from its own working: on the rod on its axis and the arc the
 * Working ended in Q and the result said λ alone, the density those setups say is not held fixed. On the
 * bisector, the rod level with an end and the disk it restated the working's last line in the other
 * order, r² + (L/2)² under (L/2)² + r² -- and the lessons' own strings, the confusions and the gradients
 * kept that old order beside a panel that had moved on. The finite-rod route of the infinite line began
 * from a result nothing derived; the half line called a component along the line "perpendicular"; its
 * setup gave the field's lean for positive charge only; the rod's potential approximated V ≈ kQ/a under
 * a Check that rejects it; "the library" was printed on paper; and the copy struck its hats through
 * x̂ and ŷ and spaced every condition's colon as a relation. */
const plain=(s:string)=>s.replace(/\u00a0/g,' ');
const lessons=[...PROBLEMS,getProblem('infinite','linear')];
const copyOf=(p:Problem)=>p.id==='infinite'?lessonArtifact(getProblem('infinite','angular'),p):lessonArtifact(p);
const integrate=(p:Problem)=>p.steps.find(s=>s.kind==='integrate')!.worked!;
const gradient=(p:Problem)=>p.steps.find(s=>s.kind==='gradient');
/** The part of a copy between two of its headings. */
const section=(html:string,from:string,to:string)=>html.slice(html.indexOf(`<h2>${from}</h2>`),html.indexOf(`<h2>${to}</h2>`));

describe('the copy’s result is the panel’s answer',()=>{
 it('every lesson, both routes of the infinite line',()=>{
  for(const p of lessons)expect(copyOf(p).results,`${p.id}/${p.variable}`).toEqual(resultLines(p));
 });
 it('the lessons that hold Q fixed say their answer in Q under “The result”',()=>{
  for(const id of ['axial','arc','disk','v-disk','v-rod-bisector','v-rod-axial']){
   const html=artifactHtml(lessonArtifact(getProblem(id))),result=section(html,'The result','Checks');
   expect(result,id).toMatch(/kQ/);
   expect(result,id).toMatch(/<mi>Q<\/mi>/);
  }
 });
 it('no copy prints the old order anywhere, and nor does any lesson’s own string',()=>{
  const OLD=['r^2+(L/2)^2','r^2+L^2','z^2+R^2','r² + (L/2)²','r² + L²','z² + R²','r²+(L/2)²','r²+L²','z²+R²','(r/L)^2+1/4'];
  for(const p of lessons){
   const html=artifactHtml(copyOf(p)),json=plain(JSON.stringify(p));
   for(const old of OLD){
    expect(html.includes(escapeHtml(old)),`${p.id}/${p.variable} copy: ${old}`).toBe(false);
    expect(json.includes(JSON.stringify(old).slice(1,-1)),`${p.id}/${p.variable} lesson: ${old}`).toBe(false);
   }
  }
 });
 it('a working line the result restates is printed once: its sentence stays, its display is the result’s',()=>{
  for(const id of ['ring','v-arc','sheet','ramp','infinite']){
   const p=getProblem(id),a=lessonArtifact(p),html=artifactHtml(a),working=section(html,'Working','The result');
   const last=working.split('<div class="step">').at(-1)!;
   expect(last,id).not.toContain('display="block"');
   expect(last,id).toContain('<p>');
   expect(html.split('<h2>The result</h2>')[1],id).toContain('display="block"');
  }
  // A working line the result does not restate keeps its display: the endpoint's E = E_x x̂ + E_y ŷ.
  const working=section(artifactHtml(lessonArtifact(getProblem('endpoint'))),'Working','The result');
  expect(working.split('<div class="step">').at(-1)).toContain('display="block"');
 });
});

describe('the copy is set as a book sets it',()=>{
 it('no hat is the ASCII caret struck through its letter',()=>{
  for(const p of lessons)expect(artifactHtml(copyOf(p)),p.id).not.toContain('<mo>^</mo>');
  expect(artifactHtml(lessonArtifact(getProblem('endpoint')))).toContain('<mo>\u02c6</mo>');
  expect(artifactHtml(lessonArtifact(getProblem('semi')))).toContain('<mo>\u02c6</mo>');
 });
 it('a condition’s colon sits tight against it, a thin space after',()=>{
  const m=mathml(String.raw`a\gg L:\quad E_x\sim\frac{kQ}{(a+L/2)^2}`);
  expect(m).toContain('<mi>L</mi><mo lspace="0em" rspace="0.1667em">:</mo>');
  for(const p of lessons)expect(artifactHtml(copyOf(p)),p.id).not.toContain('<mo>:</mo>');
 });
 it('an aligned chain’s new equalities stand a gap apart; its continuations do not',()=>{
  const PAD='<mtd style="padding-top:0.45em">';
  const endpoint=mathml(resultLines(getProblem('endpoint'))[0]);
  // Four rows, three sized breaks: E_x, = kQ…, E_y, = −kQ/L….
  expect(endpoint.split('<mtr>').slice(1).map(r=>r.startsWith(PAD))).toEqual([false,true,true,true]);
  // The disk's (z > 0) continues the row above it, and the ramp's bracket its first term.
  expect(mathml(resultLines(getProblem('disk'))[0]).split('<mtr>').slice(1).map(r=>r.startsWith(PAD))).toEqual([false,true,true,false]);
  expect(mathml(resultLines(getProblem('ramp'))[0]).split('<mtr>').slice(1).map(r=>r.startsWith(PAD))).toEqual([false,true,false]);
  // A one-line display is left alone.
  expect(mathml(String.raw`E_x=\frac{kQ}{a(L+a)}`)).not.toContain('padding-top');
 });
});

describe('each lesson’s working says what it does',()=>{
 it('the finite-rod route evaluates the rod’s integral it has just printed',()=>{
  const route=getProblem('infinite','linear'),first=integrate(route)[0];
  expect(plain(first.text)).not.toMatch(/finite-line result/);
  expect(plain(first.text)).toMatch(/Evaluate it between \$\\pm L\/2\$, keeping \$\\lambda\$ rather than a fixed \$Q\$/);
  expect(first.tex).toContain(String.raw`k\lambda\left[\frac{y}{r\sqrt{y^2+r^2}}\right]_{-L/2}^{L/2}`);
  expect(integrate(route)[1].tex).toBe(String.raw`E_x(L)=\frac{k\lambda}{r\sqrt{1/4+(r/L)^2}}`);
  // The two forms agree, and tend to 2kλ/r.
  const k=1,lam=1,r=.7;
  for(const L of [1,4,40]){
   const evaluated=k*lam*(L/2/(r*Math.hypot(L/2,r))-(-L/2)/(r*Math.hypot(L/2,r))),divided=k*lam/(r*Math.sqrt(1/4+(r/L)**2));
   expect(evaluated/divided).toBeCloseTo(1,12);
  }
  expect(k*lam/(r*Math.sqrt(1/4+(r/4000)**2))/(2*k*lam/r)).toBeCloseTo(1,6);
 });
 it('the half line combines a component along the line with one perpendicular to it',()=>{
  const last=integrate(getProblem('semi')).at(-1)!;
  expect(plain(last.text)).toMatch(/^Combine the two components, the one along the line and the one perpendicular to it\./);
  expect(plain(last.text)).not.toMatch(/perpendicular components/);
  expect(last.tex).toContain(String.raw`\frac{\sqrt2\,k|\lambda|}{r}`);
 });
 it('the half line’s board gives the field’s lean for either sign of λ',()=>{
  // Said now where the board says why ΔE_x carries a minus, not in the problem, which keeps to the given, the
  // axes, the angle and the Find.
  const say=plain(boardLines(getProblem('semi')).find(l=>l.key==='cancel')!.say??'');
  expect(say).toMatch(/For positive charge the part along the line points back past the end, toward \$-x\$/);
  expect(say).toMatch(/hence the minus; for negative charge, toward \$\+x\$/);
 });
 it('the rod’s potential approximates far away as its own Check does, from the rod’s centre',()=>{
  const p=getProblem('v-rod-axial'),last=integrate(p).at(-1)!;
  expect(plain(last.text)).toContain(String.raw`\approx kQ/(a+L/2)`);
  expect(plain(last.text)).not.toMatch(/\$V\\approx kQ\/a\$/);
  expect(p.limits.find(l=>l.mode==='far')!.formula).toContain(String.raw`\frac{kQ}{a+L/2}`);
  // (kQ/L) ln(1 + L/a) against kQ/(a + L/2) and against kQ/a: the first error falls as (L/a)², the second as L/a.
  const k=1,Q=1,L=1,V=(a:number)=>k*Q/L*Math.log(1+L/a);
  for(const [a,bar] of [[3,4e-2],[10,4e-3],[30,4e-4]]){
   expect(Math.abs(V(a)*(a+L/2)/(k*Q)-1)).toBeLessThan(bar);
   expect(Math.abs(V(a)*a/(k*Q)-1)).toBeGreaterThan(L/(3*a));
  }
 });
 it('the sheet’s integral is the one its working goes on from: 2πkσ outside, z s ds inside',()=>{
  const p=getProblem('sheet'),a=lessonArtifact(p);
  expect(p.integralTex).toBe(String.raw`E_z=2\pi k\sigma\int_0^\infty\frac{zs\,ds}{(s^2+z^2)^{3/2}}`);
  expect(a.worked![0].tex.replace(/\s/g,'')).toContain(p.integralTex.replace(/^E_z=/,'').replace(/\s/g,''));
  // z s ds/(s² + z²)^{3/2} from 0 to ∞ is 1 whatever z is: the integral the α substitution turns into ∫ sin α dα.
  for(const z of [.3,1,4]){
   let sum=0;const n=200000,top=Math.PI/2*(1-1e-9);
   for(let i=0;i<n;i++){const t=(i+.5)/n*top,s=z*Math.tan(t);sum+=z*s/(s*s+z*z)**1.5*z/Math.cos(t)**2*top/n;}
   expect(sum).toBeCloseTo(1,4);
  }
 });
});

describe('nothing on paper points at the app',()=>{
 it('no lesson says “the library”, and none calls the exact curve the reader’s',()=>{
  for(const p of lessons){
   const json=plain(JSON.stringify(p));
   expect(json,p.id).not.toMatch(/\blibrary\b/i);
   expect(json,p.id).not.toMatch(/\byour exact\b/i);
  }
  const back=gradient(getProblem('v-disk'))!.worked!.at(-1)!;
  expect(plain(back.text)).toMatch(/the result of the lesson “Field on the axis of a disk”/);
  for(const [id,title] of [['v-rod-bisector','Field on the bisector of a rod'],['v-rod-axial','Field beyond the end of a rod']]){
   expect(plain(gradient(getProblem(id))!.hint),id).toContain(`the lesson “${title}”`);
   expect(PROBLEMS.some(q=>q.title===title),title).toBe(true);
  }
 });
});
