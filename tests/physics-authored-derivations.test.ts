import {describe,it,expect,afterAll} from 'vitest';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import {safeParse,equivalent} from '../src/symbolic/equivalence';
import {field,potential,magnitude,sampleLimit,K,EPS0} from '../src/symbolic/physics';
import {sampleDistribution,sumSamples} from '../src/diagrams/sampling';
import {REGISTRY} from '../src/distributions';
import {DEFAULT_PARAMS,type Params,type Problem,type ProblemId} from '../src/problems/types';
// ---------------------------------------------------------------------------
// The worked derivation is self-consistent, dimensional and true.
//
// Every other physics suite in this repo reads NUMBERS out of src/distributions.
// This one reads the STRINGS out of src/problems — the element, the distance, the
// projection, the antiderivative, the printed TeX, the symmetry claim, the limit
// prose — and holds each of them against the others and against calculus. Those
// strings are the lesson. Today nothing checks them: ground-truth hard-codes its own
// element per row, independent-integration only ever evaluates `result`, and the
// derivation UI test only checks that KaTeX renders. So a lesson can teach a wrong
// projection, display an antiderivative missing a term, print one formula and grade
// another, or assert a symmetry the geometry does not have, and every test stays green.
//
// Concretely, this file would catch:
//  · a `projection` Answer typed as x/rᵢ instead of r/rᵢ — the distractor test filters by
//    exact string, so a projection typed as one of its own distractors still grades;
//  · the ramp's ∫y²dy/(y²+r²)^{3/2} displayed as ln(y+√(y²+r²)) with the −y/√(y²+r²)
//    term dropped: it still renders, and `result` is authored separately so it stays right;
//  · a factor of 2 lost between two lines of a worked chain;
//  · resultTex edited without result — the student is shown one formula and graded on another;
//  · a stray L or R inside a closed form, which simultaneous scaling of lengths, charges
//    and k exposes in a single evaluation with no integrator at all;
//  · a far-field limit whose ASYMPTOTE is right and whose SHAPE is wrong — R vs 2R inside
//    a root leaves kQ/d² intact and changes the approach coefficient by 4×;
//  · a symmetry claim copy-pasted onto a geometry that does not have it. The sheet's
//    symmetry object is spread from the disk's and the infinite line's from the bisector's.
//
// NOTHING here derives an expected value from field() or potential(). The antiderivatives
// are differentiated by central difference; the definite integrals are the composite
// Simpson written below; the limit coefficients are hand Taylor expansions of the textbook
// closed forms, recorded next to the algebra that produced them.
// ---------------------------------------------------------------------------

const FIELD_IDS=['bisector','axial','infinite','ring','disk','semi','arc','sheet','endpoint','ramp'] as const;
const ALL_IDS=[...FIELD_IDS,'v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial'] as const;
/** The finite path of the infinite-line lesson is a sixteenth Problem that never reaches PROBLEMS. */
const FINITE=getProblem('infinite','finite');
const VARIANTS:{key:string;p:Problem}[]=[...ALL_IDS.map(id=>({key:id,p:getProblem(id)})),{key:'infinite·finite',p:FINITE}];
/** stderr, not console.log: vitest swallows console output written from a hook.
 * Run with AUTHORED_REPORT=1 to see how much of the corpus each pass actually reached. */
const ledger:[string,unknown][]=[];
afterAll(()=>{if(process.env.AUTHORED_REPORT)process.stderr.write('\n'+ledger.map(([k,v])=>`${k.padEnd(34)} ${JSON.stringify(v)}`).join('\n')+'\n');});
/** P, transcribed from each lesson's own setup sentence. Used only to place the mirror planes. */
const OBSERVER:Record<string,(p:Params)=>[number,number,number]>={
 bisector:p=>[p.distance,0,0],axial:p=>[p.size+p.distance,0,0],infinite:p=>[p.distance,0,0],
 ring:p=>[0,0,p.distance],disk:p=>[0,0,p.distance],sheet:p=>[0,0,p.distance],
 semi:p=>[0,p.distance,0],arc:()=>[0,0,0],endpoint:p=>[p.distance,0,0],ramp:p=>[p.distance,0,0],
};

// ===========================================================================
// 1 · TeX → machine expression
// ===========================================================================
// src/symbolic/equivalence.normalize already understands braced \frac, \sqrt{…}, \lambda,
// \sigma, \varepsilon_0, \pi, \theta, \varphi, \infty, \ln and |…|. What it does NOT
// understand is the unbraced spellings the lessons actually use — \frac1a, \frac z{…},
// \frac L a, \cos\theta, \sec^2\theta, \sqrt2, \operatorname{asinh}. This is the one fixed
// rewrite table that closes that gap, and it is deliberately dumb: it adds bracketing,
// never algebra.

/** The next LaTeX argument at `i`: a balanced {…} or (…), a \command, or one character. */
function atom(s:string,i:number):[string,number]{
 while(s[i]===' ')i++;
 if(s[i]==='{'||s[i]==='('){
  const open=s[i],shut=open==='{'?'}':')';let depth=0;
  for(let j=i;j<s.length;j++){
   if(s[j]===open)depth++;
   else if(s[j]===shut&&--depth===0)return [open==='{'?s.slice(i+1,j):s.slice(i,j+1),j+1];
  }
  throw Error(`unbalanced ${open} in ${s}`);
 }
 const cmd=/^\\[a-zA-Z]+/.exec(s.slice(i));
 if(cmd)return [cmd[0],i+cmd[0].length];
 return [s[i]??'',i+1];
}
/** Rewrite `\cmd` plus n unbraced arguments, repeatedly, until none are left. */
function expandCommand(s:string,cmd:RegExp,arity:number,build:(args:string[])=>string):string{
 for(let guard=0;guard<80;guard++){
  const m=cmd.exec(s);if(!m)break;
  const args:string[]=[];let i=m.index+m[0].length;
  for(let a=0;a<arity;a++){const [arg,next]=atom(s,i);args.push(arg);i=next;}
  s=s.slice(0,m.index)+build([...args,...m.slice(1)])+s.slice(i);
 }
 return s;
}
function deTex(input:string):string{
 let s=input;
 s=s.replace(/\\(?:left|right|bigl|bigr|Bigl|Bigr|big|Big)/g,'');
 s=s.replace(/\\[,;!: ]/g,' ');
 s=s.replace(/\\text\{[^{}]*\}|\\mathrm\{[^{}]*\}|\\mathbf\s*/g,'');
 s=s.replace(/\\bar\s*y/g,'d');                     // the ramp's centre of charge ȳ: a length
 s=s.replace(/√/g,'\\sqrt');                        // limit.reference spells roots with the glyph
 s=expandCommand(s,/\\[dt]?frac(?![a-zA-Z])/,2,a=>`((${a[0]})/(${a[1]}))`);
 s=expandCommand(s,/\\sqrt(?![a-zA-Z])/,1,a=>`sqrt(${a[0]})`);
 // asinh(L/2r) is the one genuinely ambiguous spelling in the corpus. It means L/(2r):
 // the other reading, (L/2)·r, is not even dimensionally a rod's potential.
 s=expandCommand(s,/\\operatorname\{asinh\}/,1,a=>{
  const x=a[0].replace(/^\(|\)$/g,'').replace(/^L\/2\s*r$/,'L/(2*r)');
  return `log((${x})+sqrt((${x})^2+1))`;
 });
 s=expandCommand(s,/\\operatorname\{sgn\}/,1,a=>`((${a[0]})/abs(${a[0]}))`);
 for(const fn of ['sin','cos','tan','sec']){
  s=expandCommand(s,new RegExp(`\\\\${fn}\\^(\\d+)`),1,a=>`${fn}(${a[0]})^${a[1]}`);
  s=expandCommand(s,new RegExp(`\\\\${fn}(?![a-zA-Z])`),1,a=>`${fn}(${a[0]})`);
 }
 // A surviving [ … ] is a display bracket the caller did not need to evaluate as one; mathjs
 // would read it as an array index and refuse the whole expression.
 return s.replace(/\[/g,'(').replace(/]/g,')').trim();
}
/** A `\hat x` vector clause, read one component at a time. */
const hat=(s:string,axis:'x'|'y'|'z')=>s.replace(/\\hat\s*([xyz])/g,(_,c:string)=>c===axis?'(1)':'(0)');
/** Split on a separator that is not inside braces or parentheses. */
function splitTop(s:string,sep:string):string[]{
 const out:string[]=[];let depth=0,start=0;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='{'||c==='(')depth++;else if(c==='}'||c===')')depth--;
  else if(c===sep&&depth===0){out.push(s.slice(start,i));start=i+1;}
 }
 out.push(s.slice(start));
 return out.map(q=>q.trim()).filter(Boolean);
}
/** Remove the differential of `variable` from an integrand, leaving the function. An empty
 * (or bare-minus) numerator is what `\frac{dx}{…}` and `\frac{-du}{u}` leave behind. */
const dropDifferential=(s:string,variable:string)=>s
 .replace(new RegExp(`(?:\\\\,)?\\s*d\\\\?${variable}(?![a-zA-Z])`,'g'),'')
 .replace(/\{\s*-\s*\}/g,'{-1}').replace(/\{\s*\}/g,'{1}');

// ===========================================================================
// 2 · Scopes: one consistent set of numbers per lesson
// ===========================================================================
type Scope=Record<string,number>;
type Setting={kk:number;eps0:number;L:number;R:number;dist:number;phi:number;charge:number;diff:number};
const BASE:Setting={kk:K,eps0:EPS0,L:4,R:2,dist:3,phi:2.3,charge:1,diff:.017};
/** Where the integration variable is parked, as a fraction of the geometry's own scale, so
 * that scaling every length by one factor moves it too. */
function spotOf(p:Problem,o:Setting):number{
 const g=p.geometry;
 if(g==='infinite')return p.variable==='theta'?.43:.23*o.L;
 switch(g){
  case 'bisector':return .23*o.L;
  case 'endpoint':case 'ramp':return .37*o.L;
  case 'axial':return .41*o.L;
  case 'semi':return 1.7*o.dist;
  case 'sheet':return 1.3*o.dist;
  case 'ring':return 1.9;
  case 'arc':return .19*o.phi;
  default:return .61*o.R;                                       // the disk sweeps its radius
 }
}
/** `charge` is whatever that lesson's slider carries: Q, λ, λ₀ or σ, in coulombs. */
function scopeFor(p:Problem,o:Setting):Scope{
 const g=p.geometry,{kk,eps0,L,R,dist,phi,charge,diff}=o;
 const angular=p.variable==='theta'&&g==='infinite';
 const sc:Scope={pi:Math.PI,Infinity,k:kk,eps0,L,R,phi,r:dist,z:dist,a:dist,d:dist,
  dx:diff,dy:diff,dz:diff,ds:diff,dr:diff,dl:diff,dtheta:.011,dA:diff*diff,
  Q:Number.NaN,lambda:Number.NaN,lambda0:Number.NaN,sigma:Number.NaN,
  x:0,y:0,s:0,theta:0,alpha:0,ri:0,dQ:0,dE:0,dV:0,V:0};
 const v=spotOf(p,o);
 if(p.variable==='theta')sc.theta=v;else if(p.variable==='x')sc.x=v;else if(p.variable==='y')sc.y=v;else sc.s=v;
 switch(g){
  case 'bisector':sc.Q=charge;sc.lambda=charge/L;sc.ri=Math.hypot(sc.y,dist);break;
  case 'axial':sc.Q=charge;sc.lambda=charge/L;sc.ri=L+dist-sc.x;break;
  case 'endpoint':sc.Q=charge;sc.lambda=charge/L;sc.ri=Math.hypot(sc.y,dist);break;
  case 'ramp':sc.lambda0=charge;sc.Q=charge*L/2;sc.ri=Math.hypot(sc.y,dist);break;
  case 'ring':sc.Q=charge;sc.lambda=charge/(2*Math.PI*R);sc.ri=Math.hypot(R,dist);break;
  case 'arc':sc.Q=charge;sc.lambda=charge/(R*phi);sc.ri=R;break;
  case 'disk':sc.Q=charge;sc.sigma=charge/(Math.PI*R*R);sc.ri=Math.hypot(sc.s,dist);break;
  case 'sheet':sc.sigma=charge;sc.ri=Math.hypot(sc.s,dist);break;              // no total Q exists
  case 'semi':sc.lambda=charge;sc.ri=Math.hypot(sc.x,dist);break;              // no total Q exists
  case 'infinite':sc.lambda=charge;sc.Q=charge*L;                              // REGISTRY's scope convention
   if(angular){sc.y=dist*Math.tan(sc.theta);sc.ri=dist/Math.cos(sc.theta);sc.dy=dist/Math.cos(sc.theta)**2*sc.dtheta;}
   else sc.ri=Math.hypot(sc.y,dist);break;
 }
 sc.alpha=Math.acos(Math.min(1,Math.abs(dist)/sc.ri));   // the adjacent side is always the standoff
 // The dependent differentials, derived rather than assigned, so they scale on their own.
 sc.dQ=g==='disk'||g==='sheet'?sc.sigma*2*Math.PI*sc.s*sc.ds:(Number.isFinite(sc.lambda0)?sc.lambda0*sc.y/L:sc.lambda)*sc.dl;
 sc.dE=kk*sc.dQ/(sc.ri*sc.ri);sc.dV=kk*sc.dQ/sc.ri;sc.V=sc.dV;
 return sc;
}
function ev(expr:string,scope:Scope):number{
 const value=safeParse(expr).compile().evaluate({...scope}) as unknown;
 if(typeof value!=='number')throw Error(`"${expr}" is not a number`);
 return value;
}
const evTex=(tex:string,scope:Scope)=>ev(deTex(tex),scope);
const close=(got:number,want:number,tol:number)=>Math.abs(got-want)<=tol*Math.max(Math.abs(want),Number.MIN_VALUE);

// ===========================================================================
// 3 · Independent quadrature and differentiation
// ===========================================================================
/** Composite Simpson on a fixed panel count; these integrands are smooth, so 2¹² panels sit
 * far inside the 1e−6 bar the worked-chain comparisons use. */
function simpson(f:(t:number)=>number,a:number,b:number,panels=1<<12):number{
 const h=(b-a)/panels;let sum=f(a)+f(b);
 for(let i=1;i<panels;i++)sum+=f(a+i*h)*(i%2?4:2);
 return sum*h/3;
}
/** Octave-doubled tail. Every unbounded integrand here falls off at least as 1/x², so the
 * part beyond 2⁵⁰ scales is under 1e−15 of the whole. */
function simpsonTail(f:(t:number)=>number,a:number,scale:number):number{
 let sum=simpson(f,a,a+scale),lo=a+scale;
 for(let i=0;i<50;i++){const hi=lo+scale*2**i;sum+=simpson(f,lo,hi,1<<10);lo=hi;}
 return sum;
}
/** d/dv by central difference. h = 1e−6·max(1,|v|) balances the O(h²) truncation against the
 * O(ε/h) cancellation; both land near 1e−10, an order inside the 1e−7 bar used below. */
function ddv(expr:string,variable:string,v:number,scope:Scope):number{
 const h=1e-6*Math.max(1,Math.abs(v));
 return (ev(expr,{...scope,[variable]:v+h})-ev(expr,{...scope,[variable]:v-h}))/(2*h);
}

// ===========================================================================
// CASE 1 · the kernel factorises into the Answer strings the student is graded on
// ===========================================================================
// kernel = ±k · (dQ/element) · (element/dvariable) · projection / distance^n. Every factor on
// the right is a string the student is graded against; the kernel is the string the student is
// graded against one step later. Nothing today relates them — the integral tests go straight
// from `kernel` to `result`.
const answerOf=(p:Problem,id:string)=>{
 for(const step of p.steps)for(const f of step.fields??[])if(f.id===id)return f;
 return undefined;
};
const need=(p:Problem,id:string)=>{const a=answerOf(p,id);if(!a)throw Error(`${p.id} has no ${id} Answer`);return a;};
/** element / d(variable): R for an arc-length element swept in θ, 2πs for an annulus swept in
 * s, 1 when the element already carries the integration differential, and the lesson's own
 * `jacobian` Answer when the substitution changes variable outright. */
function perVariable(p:Problem):string{
 const jac=answerOf(p,'jacobian');
 if(jac)return jac.expected;                                  // infinite/angular: dy = r sec²θ dθ
 return `(${need(p,'element').expected})/d${p.variable}`;
}
function builtKernel(p:Problem,projection:string):string{
 const dq=need(p,'dq').expected,element=need(p,'element').expected;
 const power=p.quantity==='E'?2:1;
 const sign=p.geometry==='arc'&&p.quantity==='E'?'-1*':'';    // the arc's cosine factor points to −x
 const proj=p.quantity==='E'?`*(${projection})`:'';
 return `${sign}k*(${dq})/(${element})*(${perVariable(p)})${proj}/(${p.distance})^${power}`;
}
describe('the kernel factorises into the Answer strings the student is asked for',()=>{
 for(const {key,p} of VARIANTS)it(`${key}: k·(dQ/element)·(element/dv)·projection/rᵢⁿ is the graded integrand`,()=>{
  // The semi-infinite line is the exception, and an authored one: its `projection` Answer is
  // labelled "Positive y-projection factor", so it factorises the SECONDARY kernel.
  const target=p.geometry==='semi'?need(p,'kernel2').expected:p.kernel;
  const built=builtKernel(p,answerOf(p,'projection')?.expected??'1');
  const check=equivalent(built,target,p);
  expect(check.error,`${key} parse: ${built}`).toBeUndefined();
  expect(check.ok,`${key}\n  built ${built}\n  authored ${target}`).toBe(true);
 });
 // endpoint, ramp and semi integrate a second component too. Its projection is the OTHER leg of
 // the same right triangle, written here from the geometry rather than copied out of the lesson.
 const SECOND:Record<string,[string,'kernel'|'kernel2']>={
  endpoint:['-y/(sqrt(y^2+r^2))','kernel2'],ramp:['-y/(sqrt(y^2+r^2))','kernel2'],
  semi:['-x/(sqrt(x^2+r^2))','kernel'],
 };
 for(const [id,[projection,which]] of Object.entries(SECOND))it(`${id}: the other component factorises the same way`,()=>{
  const p=getProblem(id),built=builtKernel(p,projection);
  const target=which==='kernel'?p.kernel:need(p,'kernel2').expected;
  expect(equivalent(built,target,p).ok,`${id}\n  built ${built}\n  authored ${target}`).toBe(true);
 });
 it('the semi-infinite line grades a projection that belongs to its OTHER component',()=>{
  const p=getProblem('semi');
  // Written out: the graded projection r/√(x²+r²) reproduces kernel2 (E_y) and the
  // x-projection −x/√(x²+r²) reproduces kernel (E_x). Both hold. What does not hold is the
  // step's own labelling, since `kernel` is the integrand that same step asks for.
  expect(equivalent('k*lambda*(-x/sqrt(x^2+r^2))/(x^2+r^2)',p.kernel,p).ok,'x-projection ⇒ kernel').toBe(true);
  expect(equivalent('k*lambda*(r/sqrt(x^2+r^2))/(x^2+r^2)',need(p,'kernel2').expected,p).ok,'y-projection ⇒ kernel2').toBe(true);
  expect(need(p,'projection').expected).toBe('r/sqrt(x^2+r^2)');
  expect(equivalent(`k*lambda*(${need(p,'projection').expected})/(x^2+r^2)`,p.kernel,p).ok,
   'the graded projection does NOT factorise the graded kernel of its own step').toBe(false);
  expect(need(p,'projection').label,'only the label says so').toContain('y-projection');
 });
});

// ===========================================================================
// CASE 2 · every displayed antiderivative really differentiates to its integrand
// ===========================================================================
// An antiderivative with a dropped term still renders, and `result` is authored separately so
// it stays right. Differentiating the displayed F is the only check there is.
type Bracket={pre:string;F:string;lo:string;hi:string};
function bracketOf(tex:string):Bracket|null{
 let open=tex.indexOf('\\left['),F='',rest='',pre='';
 if(open>=0){
  const shut=tex.indexOf('\\right]',open);if(shut<0)return null;
  pre=tex.slice(0,open);F=tex.slice(open+6,shut);rest=tex.slice(shut+7);
 }else{
  open=tex.indexOf('[');if(open<0)return null;
  const shut=tex.indexOf(']',open);if(shut<0)return null;
  pre=tex.slice(0,open);F=tex.slice(open+1,shut);rest=tex.slice(shut+1);
 }
 if(rest[0]!=='_')return null;
 const [lo,after]=atom(rest,1);
 if(rest[after]!=='^')return null;
 const [hi]=atom(rest,after+1);
 return {pre,F,lo,hi};
}
/** Indefinite `\int <integrand> = F`: the FTC identity, with no bounds to evaluate. */
function indefiniteOf(tex:string):{integrand:string;F:string}|null{
 if(!/\\int(?!_)/.test(tex))return null;
 const parts=splitTop(tex,'=');
 const first=parts.find(q=>/\\int(?!_)/.test(q));
 const last=parts[parts.length-1];
 if(!first||/\\int/.test(last))return null;
 return {integrand:first.replace(/\\int/g,''),F:last};
}
/** Five points strictly inside the bounds; an unbounded end is swept over two decades. */
function samplePoints(lo:number,hi:number,scale:number):number[]{
 if(!Number.isFinite(hi))return [.3,1,3,10,30].map(t=>Math.max(lo,0)+t*scale);
 const a=Number.isFinite(lo)?lo:hi-30*scale;
 return [.13,.29,.5,.71,.87].map(t=>a+t*(hi-a));
}
describe('every antiderivative a worked step displays differentiates back to its integrand',()=>{
 for(const {key,p} of VARIANTS){
  const worked=p.steps.flatMap(s=>(s.worked??[]).map((w,i)=>({kind:s.kind,i,tex:w.tex})));
  for(const w of worked){
   const indefinite=indefiniteOf(w.tex);
   if(indefinite)it(`${key} · ${w.kind}[${w.i}] · d/d${p.variable} of the displayed F is the displayed integrand`,()=>{
    const scope=scopeFor(p,BASE),variable=p.variable;
    const integrand=deTex(dropDifferential(indefinite.integrand,variable)),F=deTex(indefinite.F);
    const lo=evTex(p.boundTex[0],scope),hi=evTex(p.boundTex[1],scope);
    for(const v of samplePoints(lo,hi,BASE.dist)){
     const slope=ddv(F,variable,v,scope),want=ev(integrand,{...scope,[variable]:v});
     expect(close(slope,want,1e-7),`${key} ${w.kind}[${w.i}] at ${variable}=${v}: dF/dv ${slope}, integrand ${want}`).toBe(true);
    }
   });
   const piece=splitTop(w.tex,'=').find(q=>bracketOf(q));
   if(!piece)continue;
   const b=bracketOf(piece)!;
   it(`${key} · ${w.kind}[${w.i}] · the bracketed antiderivative differentiates to the kernel it evaluates`,()=>{
    const scope=scopeFor(p,BASE),variable=p.variable;
    const product=`(${deTex(b.pre)||'1'})*(${deTex(b.F)})`;
    const lo=evTex(b.lo,scope),hi=evTex(b.hi,scope);
    // Which of the lesson's integrands this line claims to have integrated: the transverse one
    // when the line is labelled E_y, the primary one otherwise.
    const kernel=w.tex.startsWith('E_y')?need(p,'kernel2').expected:p.kernel;
    for(const v of samplePoints(lo,hi,BASE.dist)){
     const slope=ddv(product,variable,v,scope),want=ev(kernel,{...scope,[variable]:v});
     expect(close(slope,want,1e-7),`${key} ${w.kind}[${w.i}] at ${variable}=${v}: d(pre·F)/dv ${slope}, kernel ${want}`).toBe(true);
    }
   });
  }
 }
 // The disk's u-substitution is the one worked line that leaves the lesson's own variable.
 // ∫ s ds/(s²+z²)^{3/2} = ½∫u^{−3/2}du with u = s²+z², du = 2s ds: the chain rule, checked.
 it('the disk writes ½∫u^(−3/2)du for ∫s ds/(s²+z²)^(3/2), and the chain rule agrees',()=>{
  const scope=scopeFor(getProblem('disk'),BASE);
  for(const s of [.3,.9,1.4,1.9]){
   const u=s*s+scope.z*scope.z;
   expect(close(.5*u**-1.5*(2*s),s/u**1.5,1e-14),`s=${s}`).toBe(true);
  }
  expect(getProblem('disk').steps.find(q=>q.kind==='integrate')?.worked?.[0].tex).toContain('u^{-3/2}');
 });
 // v-rod-axial displays ∫_{L+a}^{a}(−du)/u rather than an antiderivative in x. The same
 // identity the other way round: u = L + a − x carries x: 0→L onto u: L+a→a with du = −dx.
 it('the axial potential’s u-substitution reverses the limits and the sign together',()=>{
  const {L,a}=scopeFor(getProblem('v-rod-axial'),BASE);
  const inU=simpson(u=>-1/u,L+a,a),inX=simpson(x=>1/(L+a-x),0,L);
  expect(close(inU,inX,1e-12),`∫(−du)/u ${inU} vs ∫dx/(L+a−x) ${inX}`).toBe(true);
  expect(close(inU,Math.log((a+L)/a),1e-12),'and both are ln((a+L)/a)').toBe(true);
 });
});

// ===========================================================================
// CASE 3 · every displayed '=' is true, and every chain ends at the graded result
// ===========================================================================
// The worked derivation is the lesson, and today it is only checked to render.
const LABEL=/^\s*\|?\s*(?:\\lim_\{[^{}]*\}\s*)?(?:\\mathbf\s*|\\bar\s*)?(?:d?[EVQ](?:_[xyz])?|[a-z]|\\[a-zA-Z]+)\s*\|?\s*(?:\([^()]*\))?\s*$|^\\[dt]?frac\{d[A-Za-z_]+\}\{d[a-z]\}$/;
const DERIVATIVE=/^(-?)\\[dt]?frac\{dV\}\{d([a-z])\}$/;
const ANNOTATION=/[<>]|\\neq?(?![a-zA-Z])/;
type Clause={label:string|null;pieces:string[]};
function clausesOf(tex:string):Clause[]{
 return tex.split(/,\s*\\q?quad|\\q?quad/).map(q=>q.trim()).filter(Boolean).map(text=>{
  const pieces=splitTop(text,'=');
  const label=pieces.length>1&&LABEL.test(pieces[0])?pieces.shift()!:null;
  return {label,pieces};
 });
}
type Piece={value:number;kind:'expression'|'bracket'|'integral'|'vector'|'derivative'};
/** Evaluate one '='-piece: a displayed derivative, a bracket, a definite integral, a vector,
 * or an ordinary expression. */
function pieceValue(piece:string,p:Problem,scope:Scope):Piece{
 const d=DERIVATIVE.exec(piece.trim());
 if(d)return {value:(d[1]==='-'?-1:1)*ddv(p.result,d[2],scope[d[2]],scope),kind:'derivative'};
 const b=bracketOf(piece);
 if(b){
  const pre=deTex(b.pre)||'1',F=deTex(b.F),lo=evTex(b.lo,scope),hi=evTex(b.hi,scope);
  const at=(v:number)=>ev(F,{...scope,[p.variable]:v});
  // An infinite endpoint is approached from 1e12 standoffs out: every F here settles like 1/v
  // or faster, so the residue is under 1e−12 of the bracket's own value.
  const value=ev(pre,scope)*((Number.isFinite(hi)?at(hi):at(1e12*scope.r))-(Number.isFinite(lo)?at(lo):at(-1e12*scope.r)));
  return {value,kind:'bracket'};
 }
 if(/\\int_/.test(piece)){
  const cut=piece.indexOf('\\int_');
  const pre=deTex(piece.slice(0,cut))||'1',rest=piece.slice(cut+5);
  const [loTex,i1]=atom(rest,0);
  if(rest[i1]!=='^')throw Error(`no upper limit in ${piece}`);
  const [hiTex,i2]=atom(rest,i1+1);
  const body=rest.slice(i2);
  const variable=/d\\?([a-z]+)/.exec(body)?.[1]??p.variable;
  const name=variable==='u'?'s':variable;                    // u is the axial potential's dummy
  const integrand=deTex(dropDifferential(body,variable)).replace(/\bu\b/g,'s')||'1';
  const lo=evTex(loTex,scope),hi=evTex(hiTex,scope);
  const f=(t:number)=>ev(integrand,{...scope,[name]:t});
  const value=ev(pre,scope)*(Number.isFinite(hi)?simpson(f,lo,hi):simpsonTail(f,lo,scope.r));
  return {value,kind:'integral'};
 }
 if(/\\hat/.test(piece)){
  const vec=(['x','y','z'] as const).map(axis=>ev(deTex(hat(piece,axis)),scope));
  return {value:Math.hypot(...vec),kind:'vector'};
 }
 return {value:evTex(piece,scope),kind:'expression'};
}
/** What a labelled clause claims, produced here rather than read off the same string. */
function claimOf(label:string,p:Problem,scope:Scope):number|null{
 if(/^\s*\|/.test(label)||label.startsWith('\\mathbf'))
  return Math.hypot(ev(p.result,scope),p.secondaryResult?ev(p.secondaryResult,scope):0);
 if(label.startsWith('E_y'))return p.secondaryResult?ev(p.secondaryResult,scope):null;
 if(/^Q$/.test(label))return scope.Q;
 if(/^E_x\(\\pi\)$/.test(label))return ev(p.result,{...scope,phi:Math.PI});
 if(/^V\(0\)$/.test(label))return ev(p.result,{...scope,z:0});
 if(/\\varphi\s*=\s*2?\s*\\pi/.test(label))return ev(p.result,{...scope,phi:/2\s*\\pi/.test(label)?2*Math.PI:Math.PI});
 if(/\\lim/.test(label))return ev(p.result,scope);
 const derivative=/^\\[dt]?frac\{dV\}\{d([a-z])\}$/.exec(label);
 if(derivative)return ddv(p.result,derivative[1],scope[derivative[1]],scope);
 return null;
}
const CHAINS=/^(?:E_[xz]|V)\s*$/;
describe('every displayed “=” in a worked chain is true, and the chain ends at the graded result',()=>{
 const tally={expression:0,bracket:0,integral:0,vector:0,derivative:0,antiderivative:0,annotation:0,definition:0,claim:0,skipped:0};
 const SETTINGS:Setting[]=[BASE,
  {...BASE,L:6.4,R:1.3,dist:1.15,phi:1.1,charge:-2.2},
  {...BASE,L:1.1,R:3.7,dist:5.9,phi:5.4,charge:.45},
  {...BASE,L:9.3,R:.6,dist:.8,phi:Math.PI,charge:3.1},
  {...BASE,L:2.7,R:4.4,dist:2.05,phi:.62,charge:-1.4}];
 for(const {key,p} of VARIANTS)for(const step of p.steps.filter(s=>s.worked?.length))
  it(`${key} · ${step.kind} · every “=” holds and the chain terminates at the graded answer`,()=>{
   for(const setting of SETTINGS){
    const scope=scopeFor(p,setting);
    let chain:number|null=null;
    for(const [wi,w] of (step.worked??[]).entries()){
     if(indefiniteOf(w.tex)){tally.antiderivative++;continue;}               // verified by CASE 2
     for(const clause of clausesOf(w.tex)){
      if(!clause.pieces.length){tally.skipped++;continue;}
      if(clause.pieces.every(q=>ANNOTATION.test(q))){tally.annotation++;continue;}
      if(clause.pieces.some(q=>/\bE_[xyz]\b/.test(q)&&!DERIVATIVE.test(q.trim()))){tally.definition++;continue;}
      const values=clause.pieces.map(q=>{const got=pieceValue(q,p,scope);tally[got.kind]++;return got;});
      for(let i=1;i<values.length;i++){
       // Simpson, not algebra, on one side of the sign: 1e−6 is its own convergence, not a
       // concession. Every other pair is held to the parser's own 1e−9.
       const tol=values[i].kind==='integral'||values[i-1].kind==='integral'?1e-6:1e-9;
       expect(close(values[i].value,values[i-1].value,tol),
        `${key} ${step.kind}[${wi}] “${clause.pieces[i-1]}” = “${clause.pieces[i]}”: ${values[i-1].value} vs ${values[i].value}`).toBe(true);
      }
      const last=values[values.length-1].value;
      const claim=clause.label?claimOf(clause.label,p,scope):null;
      if(claim!==null){
       tally.claim++;
       expect(close(last,claim,1e-6),`${key} ${step.kind}[${wi}] ${clause.label}: displayed ${last}, independent ${claim}`).toBe(true);
      }else if(clause.label&&CHAINS.test(clause.label.replace(/\([^()]*\)/,''))){
       if(chain!==null)expect(close(last,chain,1e-6),`${key} ${step.kind}[${wi}] breaks the chain: ${chain}, then ${last}`).toBe(true);
       chain=last;
      }
     }
    }
    // The finite path of the infinite line is the deliberate exception: its chain is E_x(L) at
    // FINITE L, and only the \lim clause equals the lesson's own result. See CASE 11.
    if(step.kind==='integrate'&&chain!==null&&key!=='infinite·finite')
     expect(close(chain,ev(p.result,scope),1e-6),`${key} chain ends at ${chain}, result says ${ev(p.result,scope)}`).toBe(true);
    if(step.kind==='gradient'&&chain!==null)
     expect(close(chain,ev(need(p,'gradient').expected,scope),1e-6),`${key} gradient chain ends at ${chain}`).toBe(true);
   }
  });
 it('nothing in the corpus was silently skipped',()=>{
  ledger.push(['worked clauses',tally]);
  expect(tally.skipped,JSON.stringify(tally)).toBe(0);
  expect(tally.expression+tally.bracket+tally.integral,JSON.stringify(tally)).toBeGreaterThan(100);
  expect(tally.bracket,'bracket evaluations').toBeGreaterThan(0);
  expect(tally.integral,'Simpson evaluations').toBeGreaterThan(0);
  expect(tally.derivative,'displayed −dV/dz evaluations').toBeGreaterThan(0);
 });
 // The two rewrites the chains lean on hardest, pinned with their own numbers so a reader can
 // see exactly which misreading they exclude.
 it('2kλ ln((L/2+√(L²/4+r²))/r) really is 2kλ asinh(L/(2r)), and not 2kλ asinh(L·r/2)',()=>{
  const L=3.8,r=1.9,written=Math.log((L/2+Math.sqrt(L*L/4+r*r))/r);
  expect(close(written,Math.asinh(L/(2*r)),1e-15),`${written} vs ${Math.asinh(L/(2*r))}`).toBe(true);
  expect(2*written).toBeCloseTo(1.76275,5);
  expect(2*Math.asinh(L/2*r),'the misreading').toBeCloseTo(3.99102,5);
 });
 it('the Q-substitution steps are ordinary identities under each lesson’s own density',()=>{
  for(const [id,written,machine] of [['bisector','k*lambda*L','k*Q'],['ring','2*pi*lambda*R','Q'],
   ['arc','lambda*R*phi','Q'],['disk','sigma*pi*R^2','Q'],['ramp','lambda0*L/2','Q']] as const)
   expect(equivalent(written,machine,getProblem(id)).ok,`${id}: ${written} = ${machine}`).toBe(true);
 });
});

// ===========================================================================
// CASE 4 · the printed TeX is the same expression as the graded machine string
// ===========================================================================
// Nothing today relates any tex string to its machine string. Edit one without the other and
// the student reads one formula while being graded against a different one.
const TRAILING=/\\quad\s*\([\s\S]*$|,\s*\\q?quad[\s\S]*$|[<>]\s*0\s*$/;
const texRhs=(tex:string)=>{
 const pieces=splitTop(tex.replace(TRAILING,''),'=');
 return pieces.filter((q,i)=>!(i===0&&pieces.length>1&&LABEL.test(q)));
};
describe('every printed TeX formula is the same expression as the graded machine string',()=>{
 const buckets={agree:0,disagree:[] as string[],unparseable:[] as string[]};
 const pair=(what:string,tex:string,machine:string,p:Problem)=>{
  for(const piece of texRhs(tex)){
   let rewritten='';
   try{rewritten=deTex(piece);}catch(e){buckets.unparseable.push(`${what}: ${piece} (${String(e)})`);continue;}
   const check=equivalent(rewritten,machine,p);
   if(check.error){buckets.unparseable.push(`${what}: ${piece} → ${rewritten} (${check.error})`);continue;}
   if(check.ok)buckets.agree++;else buckets.disagree.push(`${what}: ${piece} → ${rewritten} ≠ ${machine}`);
  }
 };
 for(const {key,p} of VARIANTS)it(`${key}: printed and graded agree`,()=>{
  const before=buckets.disagree.length+buckets.unparseable.length;
  pair(`${key} result`,p.resultTex,p.result,p);
  if(p.secondaryResult&&p.secondaryResultTex)pair(`${key} secondaryResult`,p.secondaryResultTex,p.secondaryResult,p);
  pair(`${key} kernel`,p.kernelTex,p.kernel,p);
  pair(`${key} dq`,p.dqTex,p.dq,p);
  if(p.densityTex.includes('='))pair(`${key} density`,p.densityTex,p.density,p);
  for(const [i,b] of p.boundTex.entries())pair(`${key} bound[${i}]`,b,p.bounds[i],p);
  for(const step of p.steps)for(const f of step.fields??[])if(f.tex.trim())pair(`${key} ${f.id}`,f.tex,f.expected,p);
  expect(buckets.disagree.length+buckets.unparseable.length,
   `${key}\n${[...buckets.disagree,...buckets.unparseable].slice(before).join('\n')}`).toBe(before);
 });
 it('every pair was classified, and there are enough of them to matter',()=>{
  ledger.push(['printed/graded pairs',buckets.agree]);
  expect(buckets.unparseable,'unparseable after the rewrite table').toEqual([]);
  expect(buckets.disagree,'printed ≠ graded').toEqual([]);
  expect(buckets.agree).toBeGreaterThan(90);
 });
 it('asinh(L/2r) is read as L/(2r); the other reading is not a rod’s potential at all',()=>{
  const p=getProblem('v-rod-bisector'),scope=scopeFor(p,BASE);
  const shown=evTex(String.raw`2k\lambda\operatorname{asinh}(L/2r)`,scope);
  expect(close(shown,ev(p.result,scope),1e-12),`${shown} vs ${ev(p.result,scope)}`).toBe(true);
 });
});

// ===========================================================================
// CASE 5 · dimensional consistency under simultaneous scaling
// ===========================================================================
// A stray L or R is visible in ONE evaluation, needs no integrator, and reaches the strings the
// integral tests never touch: limit tails, worked steps, kernel2, the finite-path result and
// the sheet's inherited kernel.
const SCALE={kappa:7,charge:3,length:2.5};
/** The charge slider carries different units per lesson: Q (C), λ (C/m), σ (C/m²). */
const chargeExponent=(p:Problem)=>p.geometry==='sheet'?2:p.geometry==='infinite'||p.geometry==='semi'||p.geometry==='ramp'?1:0;
function scaledSetting(p:Problem,from=BASE):Setting{
 const {kappa,charge,length}=SCALE;
 return {kk:from.kk*kappa,eps0:from.eps0/kappa,L:from.L*length,R:from.R*length,dist:from.dist*length,
  phi:from.phi,charge:from.charge*charge/length**chargeExponent(p),diff:from.diff*length};
}
type Dim=[k:number,q:number,s:number];
const ratioOf=(expr:string,p:Problem)=>{
 const base=ev(expr,scopeFor(p,BASE));
 return base===0?null:ev(expr,scopeFor(p,scaledSetting(p)))/base;
};
function expectDimension(expr:string,p:Problem,want:Dim,what:string):void{
 const base=ev(expr,scopeFor(p,BASE));
 if(base===0)return;                                    // 0 scales as anything; nothing to check
 expect(Number.isFinite(base),`${what}: "${expr}" is not finite at the base scope (${base})`).toBe(true);
 const ratio=ev(expr,scopeFor(p,scaledSetting(p)))/base;
 const predicted=SCALE.kappa**want[0]*SCALE.charge**want[1]*SCALE.length**want[2];
 expect(close(ratio,predicted,1e-12),
  `${what}: "${expr}" scales by ${ratio}; k^${want[0]}·q^${want[1]}·L^${want[2]} predicts ${predicted}`).toBe(true);
}
describe('dimensional consistency of every authored formula, by simultaneous scaling',()=>{
 const E:Dim=[1,1,-2],V:Dim=[1,1,-1];
 it('the anchor: kQ/(r√(r²+L²/4)) is 0.09245 at k=Q=1, L=4, r=3, and 0.310632 once scaled',()=>{
  const p=getProblem('bisector'),unit:Setting={...BASE,kk:1,eps0:1/(4*Math.PI),charge:1};
  expect(ev(p.result,scopeFor(p,unit))).toBeCloseTo(.0924500,7);
  expect(ev(p.result,scopeFor(p,scaledSetting(p,unit)))).toBeCloseTo(.310632,6);
  expect(ratioOf(p.result,p)!).toBeCloseTo(SCALE.kappa*SCALE.charge/SCALE.length**2,12);
 });
 for(const {key,p} of VARIANTS)it(`${key}: every authored string carries the units it claims`,()=>{
  const answer=p.quantity==='E'?E:V;
  // dE/dv drops one power of length when the sweep variable is a length, none when it is an angle.
  const kernel:Dim=[answer[0],answer[1],answer[2]-(p.variable==='theta'?0:1)];
  const area=p.geometry==='disk'||p.geometry==='sheet';
  expectDimension(p.result,p,answer,`${key} result`);
  if(p.secondaryResult)expectDimension(p.secondaryResult,p,answer,`${key} secondaryResult`);
  expectDimension(p.kernel,p,kernel,`${key} kernel`);
  const k2=answerOf(p,'kernel2');if(k2)expectDimension(k2.expected,p,kernel,`${key} kernel2`);
  expectDimension(p.dq,p,[0,1,0],`${key} dq`);
  expectDimension(p.density,p,[0,1,area?-2:-1],`${key} density`);
  expectDimension(p.distance,p,[0,0,1],`${key} distance`);
  expectDimension(need(p,'element').expected,p,[0,0,area?2:1],`${key} element`);
  const projection=answerOf(p,'projection');
  if(projection)expectDimension(projection.expected,p,[0,0,0],`${key} projection`);
  const jac=answerOf(p,'jacobian');
  if(jac)expectDimension(jac.expected,p,[0,0,1],`${key} jacobian`);
  const gradient=answerOf(p,'gradient');
  if(gradient)expectDimension(gradient.expected,p,E,`${key} gradient`);
  for(const step of p.steps)for(const f of step.fields??[]){
   if(f.id==='field')expectDimension(f.expected,p,answer,`${key} ${f.id}`);
   if(f.id.startsWith('component'))expectDimension(f.expected,p,E,`${key} ${f.id}`);
   if(f.id==='result'||f.id==='result2')expectDimension(f.expected,p,answer,`${key} ${f.id}`);
  }
 });
 it('every limit formula tail carries the units its own clause claims',()=>{
  const unparsed:string[]=[];let checked=0;
  for(const {key,p} of VARIANTS)for(const limit of p.limits){
   const claim=limit.formula.replace(/^[\s\S]*?:/,'');
   for(const clause of claim.split(/,\s*\\q?quad|\\q?quad/).flatMap(q=>q.split(/\\Rightarrow/))){
    const pieces=splitTop(clause,'=').flatMap(q=>q.split(/\\longrightarrow|\\to(?![a-zA-Z])|\\sim|\\neq?(?![a-zA-Z])/)).map(q=>q.trim()).filter(Boolean);
    // `z = R/√2` and `ȳ = 2L/3` state a length; `Q = λ₀L/2` a charge; every other clause states
    // the lesson's own answer.
    const head=pieces[0];
    const want:Dim=/^(?:z|\\bar\s*y|d)$/.test(head)?[0,0,1]:/^Q$/.test(head)?[0,1,0]:p.quantity==='E'?E:V;
    for(const text of pieces){
     if(LABEL.test(text)||/\\infty/.test(text)||/[<>]/.test(text)||/\bE\b/.test(deTex(text)))continue;
     try{if(evTex(hat(text,'x'),scopeFor(p,BASE))===0)continue;}
     catch(e){unparsed.push(`${key}/${limit.id}: ${text} (${String(e)})`);continue;}
     expectDimension(deTex(hat(text,'x')),p,want,`${key}/${limit.id} tail`);checked++;
    }
   }
  }
  ledger.push(['limit tails',checked]);
  expect(unparsed,'limit tails that survived the rewrite table unparsed').toEqual([]);
  expect(checked,'limit tails checked').toBeGreaterThan(20);
 });
 it('every worked clause is dimensionally uniform across its own “=”',()=>{
  let compared=0;
  for(const {key,p} of VARIANTS)for(const step of p.steps)for(const [wi,w] of (step.worked??[]).entries()){
   if(indefiniteOf(w.tex))continue;
   for(const clause of clausesOf(w.tex)){
    const plain=clause.pieces.filter(q=>!/\\int|\\hat|\\mathbf|\bE_[xyz]\b|\\frac\{dV\}/.test(q)&&!bracketOf(q)&&!ANNOTATION.test(q));
    if(plain.length<2)continue;
    const ratios=plain.map(q=>ratioOf(deTex(q),p)).filter((x):x is number=>x!==null);
    for(let i=1;i<ratios.length;i++){
     expect(close(ratios[i],ratios[0],1e-12),`${key} ${step.kind}[${wi}]: “${plain[0]}” and “${plain[i]}” scale differently`).toBe(true);
     compared++;
    }
   }
  }
  ledger.push(['worked pieces scaled',compared]);
  expect(compared,'worked pieces compared').toBeGreaterThanOrEqual(7);
 });
});

// ===========================================================================
// CASE 6 · the symmetry claim names exactly the components that vanish
// ===========================================================================
// independent-integration's DIRECTION table is a hand transcription that never reads
// problem.symmetry; the sheet's symmetry object is spread from the disk's and the infinite
// line's from the bisector's, so a swapped answer string is invisible today.
type Axis='x'|'y'|'z';
const ZERO_FROM_ANSWER:Record<string,Axis[]>={
 'The y-components cancel':['y','z'],
 'No opposing components; all add':['y','z'],
 'The y-components cancel; x adds':['y','z'],
 'Transverse components cancel; z adds':['x','y'],
 'Each ring’s transverse components cancel':['x','y'],
 'Neither component cancels':['z'],
};
const ZERO_FROM_TEX:[RegExp,Axis[]][]=[
 [/E_x=E_y=0/,['x','y']],
 [/E_x\\ne0/,['z']],
 [/E_y\\ne0/,['z']],
 [/E_y=0/,['y','z']],
];
const sorted=(a:Axis[])=>[...a].sort().join('');
describe('the symmetry claim names exactly the components the geometry annihilates',()=>{
 const SETTINGS:Partial<Params>[]=[
  {charge:2.4,distance:1.9,size:3.8,phi:2.3},{charge:-1.7,distance:.8,size:5.5,phi:.9},
  {charge:3.1,distance:-2.1,size:3.8,phi:4.4},{charge:-.6,distance:4.2,size:1.2,phi:Math.PI}];
 for(const {key,p} of VARIANTS){
  if(p.quantity!=='E')continue;
  it(`${key}: answer, tex, the sample set’s mirror planes and the closed form agree`,()=>{
   expect(p.symmetry.options,`${key} answer is offered`).toContain(p.symmetry.answer);
   expect(p.symmetry.axes,`${key} axis is offered`).toContain(p.symmetry.axis);
   const fromAnswer=ZERO_FROM_ANSWER[p.symmetry.answer];
   expect(fromAnswer,`${key}: unmapped symmetry answer "${p.symmetry.answer}"`).toBeTruthy();
   const fromTex=ZERO_FROM_TEX.find(([re])=>re.test(p.symmetry.tex))?.[1];
   expect(fromTex,`${key}: unmapped symmetry tex "${p.symmetry.tex}"`).toBeTruthy();
   expect(sorted(fromTex!),`${key}: tex and answer disagree`).toBe(sorted(fromAnswer));
   // Derived from the charge layout alone. E·n̂ vanishes when the whole configuration —
   // sources AND P — is invariant under the reflection n → 2Pₙ − n, because then every
   // element's normal contribution is matched by an equal and opposite one. The disk and the
   // sheet are partitioned into whole annuli, whose transverse field is identically zero by
   // construction, so their invariance is asserted on the elements themselves.
   const id=p.geometry as ProblemId;
   const at:Params={...DEFAULT_PARAMS,charge:2.4,distance:1.9,size:3.8,phi:2.3};
   const samples=sampleDistribution(id,at,64),P=OBSERVER[id](at);
   const annuli=id==='disk'||id==='sheet';
   const derived:Axis[]=[];
   const point=(s:(typeof samples)[number])=>[s.position.x,s.position.y,s.position.z,s.dq];
   const span=Math.max(1,...samples.flatMap(s=>point(s).slice(0,3).map(Math.abs)));
   // Paired by proximity rather than by sorting: two coordinates that agree to 1e−16 can
   // sort either way round, which would call a real symmetry broken.
   const pairsUp=(rows:number[][],mirrored:number[][])=>{
    const taken=mirrored.map(()=>false);
    return rows.every(row=>{
     const j=mirrored.findIndex((other,i)=>!taken[i]
      &&row.slice(0,3).every((c,k)=>Math.abs(c-other[k])<=1e-12*span)&&close(row[3],other[3],1e-12));
     if(j<0)return false;taken[j]=true;return true;
    });
   };
   for(const [n,axis] of (['x','y','z'] as const).entries()){
    if(annuli&&axis!=='z'){if(samples.every(s=>s.field[axis]===0))derived.push(axis);continue;}
    if(pairsUp(samples.map(point),samples.map(s=>point(s).map((c,i)=>i===n?2*P[n]-c:c))))derived.push(axis);
   }
   expect(sorted(derived),`${key}: the sample set's mirror planes say ${sorted(derived)}, the lesson says ${sorted(fromAnswer)}`).toBe(sorted(fromAnswer));
   // And what the app actually produces, at four settings including a negative charge and (for
   // the planar lessons) a point below the plane.
   for(const extra of SETTINGS){
    if((extra.distance??1)<0&&!['ring','disk','sheet'].includes(id))continue;
    const where={...DEFAULT_PARAMS,...extra};
    const exact=field(id,where),scale=magnitude(exact),sum=sumSamples(sampleDistribution(id,where,512));
    for(const axis of ['x','y','z'] as const){
     const vanishes=fromAnswer.includes(axis);
     expect(exact[axis]===0,`${key} ${axis} closed form at ${JSON.stringify(extra)}`).toBe(vanishes);
     if(vanishes)expect(Math.abs(sum[axis])/scale,`${key} ${axis} sampled sum`).toBeLessThan(1e-13);
    }
   }
  });
 }
});

// ===========================================================================
// CASE 7 · far limits are approached at the multipole order and coefficient
// ===========================================================================
// A value-only limit check passes a closed form whose asymptote is right and whose SHAPE is
// wrong: R vs 2R inside a root leaves kQ/d² intact and changes the approach coefficient by 4×.
// The coefficient is the only place the lesson's stated geometry is testable. Each number
// below is the first correction of the textbook closed form, expanded here:
//   bisector  kQ/(r√(r²+L²/4))          = kQ/r²(1 − L²/8r² + …)      ⇒ −1/8   in L
//   axial     kQ/(a(a+L))               = kQ/a²(1 − L/a + …)         ⇒ −1     in L
//   ring      kQz/(R²+z²)^{3/2}         = kQ/z²(1 − 3R²/2z² + …)     ⇒ −3/2   in R
//   disk      (σ/2ε₀)(1 − z/√(z²+R²))   = kQ/z²(1 − 3R²/4z² + …)     ⇒ −3/4   in R
//   endpoint  |E| = kQ/r²(1 − L²/2r² + ½(L/2r)²)                     ⇒ −3/8   in L
//   ramp      |E| = kQ/r²(1 − 3L²/4r² + ½(2L/3r)²)                   ⇒ −19/36 in L
//   v-bis     2kλ asinh(L/2r) = kQ/r(1 − L²/24r² + …)                ⇒ −1/24  in L
//   v-axial   kλ ln(1+L/a)    = kQ/a(1 − L/2a + …)                   ⇒ −1/2   in L
//   v-ring    kQ/√(R²+z²)     = kQ/z(1 − R²/2z² + …)                 ⇒ −1/2   in R
//   v-disk    (σ/2ε₀)(√(z²+R²) − z) = kQ/z(1 − R²/4z² + …)           ⇒ −1/4   in R
const FAR:Record<string,{c:number;p:1|2;param:'L'|'R';magnitude?:boolean}>={
 bisector:{c:-1/8,p:2,param:'L'},axial:{c:-1,p:1,param:'L'},ring:{c:-3/2,p:2,param:'R'},
 disk:{c:-3/4,p:2,param:'R'},endpoint:{c:-3/8,p:2,param:'L',magnitude:true},
 ramp:{c:-19/36,p:2,param:'L',magnitude:true},'v-rod-bisector':{c:-1/24,p:2,param:'L'},
 'v-rod-axial':{c:-1/2,p:1,param:'L'},'v-ring':{c:-1/2,p:2,param:'R'},'v-disk':{c:-1/4,p:2,param:'R'},
};
describe('“far” limits are approached at the predicted order and coefficient, not merely reached',()=>{
 const AT:Params={...DEFAULT_PARAMS,charge:2,size:4,distance:3,phi:2.3};
 for(const [id,expected] of Object.entries(FAR))it(`${id}: the first correction is ${expected.c.toFixed(4)} in ${expected.param}`,()=>{
  const p=getProblem(id),geom=p.geometry as ProblemId;
  expect(p.limits.some(l=>l.mode==='far'),`${id} has a far limit`).toBe(true);
  const scale=expected.param==='L'?AT.size:AT.size/2;
  const errors=[200,400].map(t=>{
   const where={...AT,distance:t*AT.size};
   const q=Math.abs(REGISTRY[geom].total?.(where)??where.charge*1e-9);
   const asymptote=p.quantity==='V'?K*q/where.distance:K*q/where.distance**2;
   const closed=p.quantity==='V'?Math.abs(potential(geom,where))
    :expected.magnitude?magnitude(field(geom,where)):Math.abs(field(geom,where)[geom==='ring'||geom==='disk'?'z':'x']);
   // The lesson's own printed string, evaluated without touching field() or potential().
   const scope=scopeFor(p,{...BASE,L:where.size,R:where.size/2,dist:where.distance,phi:where.phi,charge:where.charge*1e-9});
   return {e:closed/asymptote-1,printed:Math.abs(ev(p.result,scope))/asymptote-1,t};
  });
  for(const {e,printed,t} of errors){
   const lever=(t*AT.size/scale)**expected.p;
   expect(close(e*lever,expected.c,5e-3),`${id} at d = ${t}·size: coefficient ${e*lever}, Taylor says ${expected.c}`).toBe(true);
   // endpoint and ramp are graded on |E|, which their single printed component cannot match.
   if(!expected.magnitude)expect(close(printed*lever,expected.c,5e-3),
    `${id} printed-string coefficient ${printed*lever}`).toBe(true);
  }
  // Doubling the distance must divide the deviation by 2^p. What is left over is the NEXT
  // order, O(size/d), so a first-order lesson lands about 0.25 % short of the clean power.
  const ratio=errors[0].e/errors[1].e;
  expect(Math.abs(ratio-2**expected.p),`${id}: e(200)/e(400) = ${ratio}, expected ${2**expected.p}`)
   .toBeLessThan(expected.p===2?2e-3:1e-2);
 });
 it('each far tail evaluates to exactly the reference its own sweep plots',()=>{
  for(const id of Object.keys(FAR)){
   const p=getProblem(id),limit=p.limits.find(l=>l.mode==='far')!;
   const {target}=sampleLimit(p,AT,limit,30);
   const scope=scopeFor(p,{...BASE,L:AT.size,R:AT.size/2,dist:30*AT.size,phi:AT.phi,charge:AT.charge*1e-9});
   const tail=limit.formula.replace(/^[\s\S]*?:/,'').split(/\\longrightarrow|\\to\b|\\sim/).pop()!.split(/,\s*\\q?quad/)[0];
   const shown=Math.abs(evTex(tail,scope));
   expect(close(shown,target,1e-9),`${id}: the plotted reference is ${target}, the printed tail is ${shown}`).toBe(true);
  }
 });
 it('the collinear lessons are still percent-level short at the end of their own sweep',()=>{
  // Documented, not lamented. An asymmetric geometry's leading correction is O(L/d), so at the
  // last point of the ASSESS sweep the axial rod sits 3.2 % and its potential 1.6 % below the
  // point charge, while every symmetric lesson is inside 0.2 %.
  const shortfall=(id:string)=>{const p=getProblem(id),l=p.limits.find(q=>q.mode==='far')!;
   const {actual,target}=sampleLimit(p,AT,l,30);return 1-actual/target;};
  expect(shortfall('axial')).toBeCloseTo(1/31,4);
  expect(shortfall('v-rod-axial')).toBeCloseTo(.0163,3);
  for(const id of ['bisector','ring','disk','endpoint','ramp','v-ring','v-disk','v-rod-bisector'])
   expect(Math.abs(shortfall(id)),`${id}`).toBeLessThan(2e-3);
 });
});

// ===========================================================================
// CASE 8 · density-fixed limits approach their reference at the predicted order and sign
// ===========================================================================
// These are the limits nothing integrates independently anywhere; they are only ever checked
// app-against-app. The expansion coefficient — and its SIGN — is the truth, and a wrong
// constant inside a log (ln(L/r) vs ln(2L/r)) is invisible to a ratio test, because the ratio
// still tends to 1.
describe('density-fixed limits approach their reference at the predicted order and sign',()=>{
 const P:Params={...DEFAULT_PARAMS,charge:2,size:4,distance:3,phi:2.3};
 it('bisector · L → ∞ at fixed λ: E/(2kλ/r) − 1 = −2(r/L)², from below',()=>{
  const r=1.5,lambda=.7e-9;
  for(const ratio of [200,400]){
   const at={...P,distance:r,size:ratio*r,charge:lambda*ratio*r*1e9};
   const c=(field('bisector',at).x/(2*K*lambda/r)-1)*ratio**2;
   expect(close(c,-2,1e-3),`L/r = ${ratio}: ${c}`).toBe(true);
  }
 });
 it('disk · R → ∞ at fixed σ: E/(σ/2ε₀) − 1 = −z/R, from below',()=>{
  const z=1.5,sigma=.4e-9;
  for(const ratio of [200,400]){
   const R=ratio*z,at={...P,distance:z,size:2*R,charge:sigma*Math.PI*R*R*1e9};
   const c=(field('disk',at).z/(sigma/(2*EPS0))-1)*ratio;
   expect(close(c,-1,1e-3),`R/z = ${ratio}: ${c}`).toBe(true);
  }
 });
 it('v-disk · R → ∞ at fixed σ: V − σR/2ε₀ → −σz/2ε₀, a finite intercept',()=>{
  // σ/(2ε₀)(√(z²+R²) − z − R) = −2πkσz(1 − z/2R + …): first order, so 0.3 % is the bar.
  const z=1.5,sigma=1e-9;
  for(const ratio of [200,400]){
   const R=ratio*z,at={...P,distance:z,size:2*R,charge:sigma*Math.PI*R*R*1e9};
   const want=-2*Math.PI*K*sigma*z*(1-1/(2*ratio));
   const intercept=potential('v-disk',at)-sigma*R/(2*EPS0);
   expect(close(intercept,want,3e-3),`R/z = ${ratio}: ${intercept} vs ${want}`).toBe(true);
  }
  expect(-2*Math.PI*1.5,'normalised to k = σ = 1, z = 1.5').toBeCloseTo(-9.42478,5);
 });
 it('v-rod-bisector · L → ∞ at fixed λ: V − 2kλ ln(L/r) → +2kλ(r/L)², from ABOVE',()=>{
  const r=1.5,lambda=.9e-9;
  for(const ratio of [200,400]){
   const at={...P,distance:r,size:ratio*r,charge:lambda*ratio*r*1e9};
   // asinh x = ln 2x + 1/(4x²) − …, so a finite rod sits ABOVE the infinite-line form.
   const c=(potential('v-rod-bisector',at)-2*K*lambda*Math.log(ratio))/(K*lambda)*ratio**2;
   expect(close(c,2,1e-3),`L/r = ${ratio}: ${c}`).toBe(true);
   expect(c,'approached from above').toBeGreaterThan(0);
  }
 });
 it('v-rod-axial · a → 0 at fixed λ: V − kλ ln(L/a) → +kλ·a/L',()=>{
  const L=4,lambda=.8e-9;
  for(const ratio of [400,800]){
   const at={...P,distance:L/ratio,size:L,charge:lambda*L*1e9};
   const c=(potential('v-rod-axial',at)-K*lambda*Math.log(ratio))/(K*lambda)*ratio;
   expect(close(c,1,3e-3),`a/L = 1/${ratio}: ${c}`).toBe(true);
  }
 });
 it('endpoint · L → ∞ at fixed λ: |E|/(√2 kλ/r) − 1 = −r/2L, from below',()=>{
  const r=1.5,lambda=.6e-9;
  for(const ratio of [200,400]){
   const at={...P,distance:r,size:ratio*r,charge:lambda*ratio*r*1e9};
   const c=(magnitude(field('endpoint',at))/(Math.SQRT2*K*lambda/r)-1)*ratio;
   expect(close(c,-.5,3e-3),`L/r = ${ratio}: ${c}`).toBe(true);
  }
 });
 it('ring · the peak at z = R/√2 is a maximum with curvature −4/3 in (δ/R)²',()=>{
  // ln E = ln z − (3/2)ln(R²+z²); (ln E)″ at z² = R²/2 is −8/3R², so E(z₀+δ)/E(z₀) − 1 →
  // −(4/3)(δ/R)². The next order is O(δ/R), which is why 1 % is the bar rather than 1e−3.
  const at={...P,size:4},R=at.size/2,z0=R/Math.SQRT2;
  const peak=field('ring',{...at,distance:z0}).z;
  for(const n of [200,400]){
   const delta=R/n;
   for(const sign of [1,-1])expect(field('ring',{...at,distance:z0+sign*delta}).z,`δ = ${sign}R/${n}`).toBeLessThan(peak);
   const c=(field('ring',{...at,distance:z0+delta}).z/peak-1)*n*n;
   expect(close(c,-4/3,1e-2),`δ = R/${n}: ${c}`).toBe(true);
  }
 });
 it('ring · near the centre E_z → kQz/R³ with a −3z²/2R² correction',()=>{
  const at={...P,size:4},R=at.size/2,q=at.charge*1e-9;
  for(const n of [200,400]){
   const z=R/n,c=(field('ring',{...at,distance:z}).z/(K*q*z/R**3)-1)*n*n;
   expect(close(c,-1.5,1e-3),`z = R/${n}: ${c}`).toBe(true);
  }
 });
 it('v-ring · near the centre V → kQ/R with a −z²/2R² correction',()=>{
  const at={...P,size:4},R=at.size/2,q=at.charge*1e-9;
  for(const n of [200,400]){
   const z=R/n,c=(potential('v-ring',{...at,distance:z})/(K*q/R)-1)*n*n;
   expect(close(c,-.5,1e-3),`z = R/${n}: ${c}`).toBe(true);
  }
 });
 it('v-disk · near the centre V → 2kQ/R with slope −σ/2ε₀ = −2kQ/R²',()=>{
  const at={...P,size:4},R=at.size/2,q=at.charge*1e-9;
  for(const n of [200,400]){
   const z=R/n,slope=(potential('v-disk',{...at,distance:z})-2*K*q/R)/z;
   expect(close(slope,-2*K*q/(R*R),1e-2),`z = R/${n}: ${slope} vs ${-2*K*q/(R*R)}`).toBe(true);
  }
  expect(close(2*K*q/(R*R),at.charge*1e-9/(Math.PI*R*R)/(2*EPS0),1e-14),'2kQ/R² is σ/2ε₀').toBe(true);
 });
 it('semi · both components halve when r doubles, exactly',()=>{
  for(const r of [.7,3.3]){const a=field('semi',{...P,distance:r}),b=field('semi',{...P,distance:2*r});
   for(const axis of ['x','y'] as const)expect(close(b[axis],a[axis]/2,1e-14),`${axis} at r = ${r}`).toBe(true);}
 });
 it('sheet · the field does not change when z doubles, exactly',()=>{
  for(const z of [.4,2.6])expect(field('sheet',{...P,distance:2*z}).z).toBe(field('sheet',{...P,distance:z}).z);
 });
 it('arc · the half ring is exactly 2kQ/(πR²)',()=>{
  const at={...P,phi:Math.PI,size:4},R=at.size/2,q=at.charge*1e-9;
  expect(close(magnitude(field('arc',at)),2*K*q/(Math.PI*R*R),1e-14)).toBe(true);
 });
 it('every density-fixed tail evaluates to the reference its own sweep plots',()=>{
  const cases:[string,string,'tail'|'reference'][]=[
   ['bisector','infinite','tail'],['infinite','infinite','tail'],['disk','infinite','tail'],
   ['sheet','infinite','tail'],['sheet','scale','reference'],['endpoint','infinite','tail'],
   ['semi','scale','reference'],['v-disk','infinite','tail'],['v-rod-bisector','infinite','tail'],
   ['v-rod-axial','near','tail']];
  const at:Params={...DEFAULT_PARAMS,charge:2,size:4,distance:1.5,phi:2.3};
  for(const [id,mode,source] of cases){
   const p=getProblem(id),limit=p.limits.find(l=>l.mode===mode)!;
   const {target}=sampleLimit(p,at,limit,30);
   // sampleLimit sweeps the geometry itself, so the printed tail has to be read at the SWEPT
   // size, not at the slider's.
   const swept=mode==='near'?{L:at.size,dist:at.size/30,R:at.size/2}
    :mode==='scale'?{L:at.size,dist:30,R:at.size/2}          // 'scale' simply puts P at t metres
    :p.geometry==='disk'||p.geometry==='sheet'?{L:at.size,dist:at.distance,R:30*at.distance}
    :{L:30*at.distance,dist:at.distance,R:at.size/2};
   const slider=p.geometry==='sheet'||p.geometry==='infinite'||p.geometry==='semi'?at.charge*1e-9
    :p.geometry==='disk'?at.charge*1e-9/(Math.PI*(at.size/2)**2)*Math.PI*swept.R**2
    :at.charge*1e-9/at.size*swept.L;
   const scope=scopeFor(p,{...BASE,L:swept.L,R:swept.R,dist:swept.dist,phi:at.phi,charge:slider});
   const text=source==='reference'?limit.reference
    :limit.formula.replace(/^[\s\S]*?:/,'').split(/\\longrightarrow|\\to\b|\\sim/).filter(q=>!/^\s*\\infty/.test(q)).pop()!.split(/,\s*\\q?quad/)[0];
   // A vector tail (the endpoint's kλ/r(x̂ − ŷ)) is plotted as a magnitude, so read it as one.
   const shown=/\\hat/.test(text)
    ?Math.hypot(...(['x','y','z'] as const).map(axis=>evTex(hat(text,axis),scope)))
    :Math.abs(evTex(text,scope));
   expect(close(shown,target,1e-9),`${id}/${mode}: printed ${shown}, plotted ${target} (from "${text}")`).toBe(true);
  }
 });
});

// ===========================================================================
// CASE 9 · substitutions, density strings and dq = density × element
// ===========================================================================
// ground-truth hard-codes the element string per row, so the `element` Answer itself is
// unverified, and only axial/arc/ring substitutions are ever exercised.
describe('REGISTRY substitutions, density strings and dq = density × element',()=>{
 it('every Q-substitution reproduces the total charge under the lesson’s own density',()=>{
  const at:Params={...DEFAULT_PARAMS,charge:2,size:4,distance:3,phi:2.3};
  const L=at.size,R=at.size/2,Q=at.charge*1e-9;
  const cases:[string,number][]=[
   ['bisector',Q],['axial',Q],['endpoint',Q],['v-rod-bisector',Q],['v-rod-axial',Q],
   ['ring',Q],['v-ring',Q],['arc',Q],['v-arc',Q],['disk',Q],['v-disk',Q],
   ['ramp',Q*L/2],                                              // λ₀L/2, not λ₀L: the ramp is half empty
   ['infinite',Q*L]];                                           // λL: a scope convention, see below
  for(const [id,want] of cases){
   const p=getProblem(id),substitution=REGISTRY[id as ProblemId].substitutions?.Q;
   expect(substitution,`${id} declares a Q substitution`).toBeTruthy();
   const scope=scopeFor(p,{...BASE,L,R,dist:at.distance,phi:at.phi,charge:Q});
   expect(close(ev(substitution!,scope),want,1e-12),`${id}: ${substitution} = ${ev(substitution!,scope)}, expected ${want}`).toBe(true);
  }
  // 2 nC/m peaking over a 4 m rod is 4 nC in total, and the registry agrees.
  expect(REGISTRY.ramp.total!({...at,charge:2,size:4})).toBeCloseTo(4e-9,20);
  expect(REGISTRY.disk.substitutions!.Q).toBe('sigma*pi*R^2');
 });
 it('the unbounded lessons declare no total charge at all',()=>{
  expect(REGISTRY.semi.substitutions).toBeUndefined();
  expect(REGISTRY.sheet.substitutions).toBeUndefined();
  // The infinite line DOES declare Q = λL even though L is not one of its sliders. That is a
  // grading convention — it lets a student write kQ/L where kλ is meant — not a claim that an
  // endless line has a total charge.
  expect(REGISTRY.infinite.substitutions!.Q).toBe('lambda*L');
  expect(getProblem('infinite').density).toBe('lambda');
 });
 it('k is 1/(4πε₀) to the last digit the app’s own constants allow',()=>{
  expect(close(ev('1/(4*pi*eps0)',{pi:Math.PI,eps0:EPS0}),K,1e-14)).toBe(true);
  // CODATA ε₀ re-entered by hand: 1/(4π·8.8541878128e−12) = 8.9875517923e9 N·m²/C².
  expect(close(K,1/(4*Math.PI*8.8541878128e-12),1e-15)).toBe(true);
  expect(K/1e9).toBeCloseTo(8.9875517923,9);
 });
 for(const {key,p} of VARIANTS){
  it(`${key}: dQ is exactly the density times the element the same step asks for`,()=>{
   const built=`(${p.density})*(${need(p,'element').expected})`;
   expect(equivalent(built,p.dq,p).ok,`${key}: ${built} vs ${p.dq}`).toBe(true);
  });
  if(p.geometry!=='ramp')it(`${key}: the density string is the lesson’s own λ or σ`,()=>{
   const symbol=p.geometry==='disk'||p.geometry==='sheet'?'sigma':'lambda';
   expect(equivalent(p.density,symbol,p).ok,`${key}: ${p.density} vs ${symbol}`).toBe(true);
  });
 }
 it('the ramp is the one lesson whose density is not a constant',()=>{
  const p=getProblem('ramp');
  expect(equivalent(p.density,'lambda0',p).ok,'λ(y) = λ₀y/L is not λ₀').toBe(false);
  expect(equivalent(p.density,'lambda0*y/L',p).ok).toBe(true);
 });
});

// ===========================================================================
// CASE 10 · the displayed integral is the displayed bounds and the displayed kernel
// ===========================================================================
// The integral line is the one line the student copies; its limits and integrand are typed
// separately from `bounds` and `kernel`, and are only ever checked to render.
const canon=(s:string)=>s.replace(/[{}\s]|\\[,;!:]/g,'');
describe('integralTex’s limits are boundTex, boundTex is bounds, and its integrand is kernelTex',()=>{
 for(const {key,p} of VARIANTS){
  it(`${key}: the printed limits are the lesson’s own bounds`,()=>{
   const cut=p.integralTex.indexOf('\\int_');
   expect(cut,`${key} integralTex has no \\int_`).toBeGreaterThanOrEqual(0);
   const rest=p.integralTex.slice(cut+5);
   const [lo,i1]=atom(rest,0);
   expect(rest[i1],`${key} has no ^`).toBe('^');
   const [hi]=atom(rest,i1+1);
   expect(canon(lo),`${key} lower limit`).toBe(canon(p.boundTex[0]));
   expect(canon(hi),`${key} upper limit`).toBe(canon(p.boundTex[1]));
  });
  it(`${key}: prefactor × integrand is the printed kernel`,()=>{
   const cut=p.integralTex.indexOf('\\int_');
   const pre=p.integralTex.slice(0,cut).replace(/^[^=]*=/,'').replace(/\\lim_\{[^{}]*\}/,'');
   const rest=p.integralTex.slice(cut+5);
   const [,i1]=atom(rest,0);const [,i2]=atom(rest,i1+1);
   const built=`(${deTex(pre)||'1'})*(${deTex(dropDifferential(rest.slice(i2),p.variable))||'1'})`;
   expect(equivalent(built,deTex(p.kernelTex),p).ok,`${key}\n  integral ${built}\n  kernelTex ${deTex(p.kernelTex)}`).toBe(true);
  });
  for(const [i] of p.boundTex.entries())it(`${key}: boundTex[${i}] is bounds[${i}]`,()=>{
   expect(equivalent(deTex(p.boundTex[i]),p.bounds[i],p).ok,`${p.boundTex[i]} vs ${p.bounds[i]}`).toBe(true);
  });
 }
 it('every lesson in the library was covered',()=>{
  expect(PROBLEMS).toHaveLength(15);
  expect(VARIANTS).toHaveLength(16);
 });
});

// ===========================================================================
// CASE 11 · the infinite lesson's inherited finite path and inherited prose
// ===========================================================================
// infiniteFrom() builds this lesson by spreading the bisector, so nothing notices a hint that
// contradicts the lesson's own bounds — and nothing today records that ∫kernel ≠ result is
// INTENDED on the finite path, so a future "fix" could break the derivation.
describe('the infinite lesson’s inherited finite path, and its inherited prose',()=>{
 it('the finite path’s integral is the finite rod, not the lesson’s own result',()=>{
  const scope=scopeFor(FINITE,{...BASE,L:7.3,dist:1.9,charge:.9e-9});
  const {L,r,lambda,k}=scope;
  const integral=simpson(y=>ev(FINITE.kernel,{...scope,y}),-L/2,L/2);
  const rodForm=2*k*lambda*(L/2)/(r*Math.sqrt(r*r+L*L/4));
  expect(close(integral,rodForm,1e-6),`∫kernel ${integral} vs kλL/(r√(r²+L²/4)) ${rodForm}`).toBe(true);
  expect(close(integral,ev(FINITE.result,scope),1e-3),'and it is NOT 2kλ/r at finite L').toBe(false);
  // The finite path takes L → ∞ AFTER integrating, and the shortfall is the bisector's own
  // −2(r/L)², since 2kλ/r · (1 + 4r²/L²)^(−1/2) is what a rod of length L really gives.
  for(const ratio of [200,400]){
   const wide=scopeFor(FINITE,{...BASE,L:ratio*1.9,dist:1.9,charge:.9e-9});
   const finite=simpson(y=>ev(FINITE.kernel,{...wide,y}),-wide.L/2,wide.L/2);
   const c=(finite/ev(FINITE.result,wide)-1)*ratio**2;
   expect(close(c,-2,1e-3),`L/r = ${ratio}: ${c}`).toBe(true);
  }
 });
 it('the finite path’s overridden result is not one of its own distractors',()=>{
  const answer=need(FINITE,'result');
  expect(answer.expected).toBe(FINITE.result);
  for(const option of answer.options.filter(o=>o!==answer.expected))
   expect(equivalent(option,answer.expected,FINITE).ok,`distractor "${option}" grades as correct`).toBe(false);
 });
 it('the sanity-check step names the limit the lesson actually plots',()=>{
  const p=getProblem('infinite'),limits=p.steps.find(s=>s.kind==='limits')!;
  expect(p.limits.map(l=>l.mode)).toEqual(['infinite']);
  // The only comparison this lesson offers is L → ∞ at fixed λ against 2kλ/r, so the bisector's
  // hint promises a far-field limit this lesson does not have. Compared against that inherited
  // string, not against a keyword: a sentence may perfectly well use the word "negligible" to
  // say that nothing here IS negligible, and a test that bans the word would reject the fix.
  const inherited=getProblem('bisector').steps.find(s=>s.kind==='limits')!.hint;
  expect(limits.hint,`inherited from the bisector: "${limits.hint}"`).not.toBe(inherited);
 });
 it('the frame-of-reference step names the bounds the angular path actually uses',()=>{
  const p=getProblem('infinite');
  expect(p.variable,'the angular path is the default').toBe('theta');
  expect(p.boundTex,'and it really does sweep ±π/2').toEqual(['-\\pi/2','\\pi/2']);
  expect(p.steps[0].hint,`inherited from the bisector: "${p.steps[0].hint}"`).not.toContain('−L/2 to +L/2');
 });
 it('an endless line has no centre and no lower end',()=>{
  const p=getProblem('infinite');
  expect(p.origin,'inherited from the bisector').not.toBe('At the center of the rod');
  expect(p.alternateOrigin,'inherited from the bisector').not.toBe('At the lower end');
 });
});
