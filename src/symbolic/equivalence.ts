import {parse,type MathNode,type SymbolNode,type FunctionNode,type OperatorNode,type ConstantNode} from 'mathjs';
import type {Problem} from '../problems/types';
import {REGISTRY} from '../distributions';
const allowedFunctions=new Set(['sqrt','sin','cos','tan','sec','abs','log']);
const allowedSymbols=new Set(['d','Q','L','R','r','a','z','x','y','s','theta','alpha','phi','lambda','lambda0','sigma','eps0','pi','k','ri','dQ','dE','dV','V','dx','dy','dz','ds','dr','dl','dtheta','dalpha','dA','Infinity']);
export function normalize(input:string):string {
 // Both ln and log denote the natural logarithm; bases are intentionally unsupported.
 // λ₀ is the peak density of a non-uniform rod: one symbol, never λ times zero.
 let s=input.replace(/\\(?:ln|log)\b|\bln\b/g,'log').trim().replace(/^(?:E_[xyz]|dE_[xyz]|dQ|dE|E|[A-Za-z_]+)\s*=/,'').replace(/−|–/g,'-').replace(/(?:λ|\\lambda|\blambda)\s*(?:₀|_(?:\{0\}|0))/g,' lambda0 ').replace(/λ|\\lambda/g,' lambda ').replace(/σ|\\sigma/g,' sigma ').replace(/ε₀|ε0|\\(?:var)?epsilon(?:_(?:\{0\}|0)|0)?/g,' eps0 ').replace(/π|\\pi/g,' pi ').replace(/θ|\\theta/g,' theta ').replace(/α|\\alpha/g,' alpha ').replace(/φ|ϕ|\\varphi|\\phi/g,' phi ').replace(/∞|\\infty|\binf\b/gi,'Infinity').replace(/r[′']/g,'s').replace(/r_\{i\}|r_i|rᵢ/g,'ri').replace(/ℓ/g,'l').replace(/\bd\s+(theta|alpha|x|y|z|s|r|l)\b/g,'d$1').replace(/\\(?:left|right|,|;|!)/g,'').replace(/\\(?:cdot|times)|·|×/g,'*').replace(/²/g,'^2').replace(/³/g,'^3');
 // Innermost braces are reduced first, preserving nested fractions and roots.
 for(let i=0;i<20;i++){const next=s.replace(/\\(?:dfrac|tfrac|frac)\{([^{}]*)\}\{([^{}]*)\}/g,'(($1)/($2))').replace(/\\sqrt\{([^{}]*)\}/g,'sqrt($1)').replace(/\^\{([^{}]*)\}/g,'^($1)');if(next===s)break;s=next;}
 s=s.replace(/\\(sin|cos|tan|sec|sqrt)/g,'$1').replace(/[{}]/g,m=>m==='{'?'(':')').replace(/\|([^|]+)\|/g,'abs($1)').replace(/\bD([xyzs])\b/g,'d$1').trim();
 // Explicit products avoid mathjs's special implicit-division precedence:
 // Q/L dy means (Q/L)*dy, as it does when writing a charge element.
 const words=[...allowedSymbols,...allowedFunctions].sort((a,b)=>b.length-a.length);
 const tokens=(s.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|\S/g)??[]).flatMap(token=>{
  if(!/^[A-Za-z]+$/.test(token)||words.includes(token))return[token];
  const parts:string[]=[];let rest=token;while(rest){const word=words.find(w=>rest.startsWith(w));if(!word)return[token];parts.push(word);rest=rest.slice(word.length);}return parts;
 });
 return tokens.map((token,i)=>{const previous=tokens[i-1];const endsAtom=previous&&(/^[\w.]+$/.test(previous)||previous===')');const startsAtom=/^[\w.]+$/.test(token)||token==='(';return (endsAtom&&startsAtom&&!allowedFunctions.has(previous)?'*':'')+token;}).join('');
}
export function safeParse(input:string):MathNode {
 if(input.length>350)throw Error('Keep the expression under 350 characters.');
 const node=parse(normalize(input));let count=0;
 const visit=(n:MathNode,depth:number)=>{
  if(++count>100||depth>20)throw Error('This expression is too complex. Split it into smaller steps.');
  if(!['OperatorNode','SymbolNode','ConstantNode','ParenthesisNode','FunctionNode'].includes(n.type))throw Error('Enter a single mathematical expression.');
  if(n.type==='SymbolNode'&&!allowedSymbols.has((n as SymbolNode).name)&&!allowedFunctions.has((n as SymbolNode).name))throw Error(`Unknown symbol ${(n as SymbolNode).name}. Use the symbols shown in the model.`);
  if(n.type==='FunctionNode'&&(!allowedFunctions.has(((n as FunctionNode).fn as SymbolNode).name)||(n as FunctionNode).args.length!==1))throw Error('Use only sqrt, sin, cos, tan, sec, abs, or ln (natural log), with one argument.');
  if(n.type==='OperatorNode'){
   if(!['+','-','*','/','^'].includes((n as OperatorNode).op))throw Error('Use arithmetic operators only.');
   if((n as OperatorNode).op==='^'){
    const exponent=(n as OperatorNode).args[1] as MathNode;
    let nestedPower=false;exponent.traverse(child=>{if(child.type==='OperatorNode'&&(child as OperatorNode).op==='^')nestedPower=true;});
    if(nestedPower)throw Error('Nested exponents are not needed for this model.');
   }
  }
  if(n.type==='ConstantNode'&&(typeof (n as ConstantNode).value!=='number'||((n as ConstantNode).value!==Infinity&&(!Number.isFinite((n as ConstantNode).value)||Math.abs((n as ConstantNode).value)>1e8))))throw Error('Use finite numeric or symbolic constants.');
  n.forEach(child=>visit(child,depth+1));
 };visit(node,0);return node;
}
function substitutions(problem:Problem):Record<string,string>{return{k:'1/(4*pi*eps0)',...REGISTRY[problem.id].substitutions};}
function expand(node:MathNode,p:Problem){const sub=substitutions(p);return node.transform(n=>n.type==='SymbolNode'&&sub[(n as SymbolNode).name]?parse(sub[(n as SymbolNode).name]):n);}
export type Check={ok:boolean;error?:string;method?:'symbolic'|'numeric'};
function infinitySign(node:MathNode):number|null {const value=node.toString().replace(/[()\s]/g,'');return value==='Infinity'||value==='+Infinity'?1:value==='-Infinity'?-1:null;}
// Every symbol is sampled independently. A fixed seed makes grading reproducible
// without the algebraic correlations introduced by linear sample sequences.
function samples(){let seed=0x51f15e;return()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return(seed+.5)/4294967296;};}
// Independent draws of rᵢ, y, θ false-fail equivalent forms near a singularity
// (cos θ → 0, rᵢ → 0). After the generic positives, pin each geometry's own
// identities so a correct ring, axial, or angular rewrite still grades.
function constrain(scope:Record<string,number>,p:Problem,random:()=>number){
 const g=p.geometry,adjacent=(a:number,h:number)=>Math.acos(Math.min(1,Math.abs(a)/h));
 if(g==='ring'){scope.theta=random()*2*Math.PI;scope.ri=Math.hypot(scope.R,scope.z);scope.alpha=adjacent(scope.z,scope.ri);return}
 if(g==='axial'){scope.x=.05*scope.L+random()*.9*scope.L;scope.ri=scope.L+scope.a-scope.x;return}
 if(g==='infinite'&&p.variable==='alpha'){scope.alpha=(random()*2-1)*.4*Math.PI;scope.y=scope.r*Math.tan(scope.alpha);scope.ri=scope.r/Math.cos(scope.alpha);return}
 if(g==='infinite'||g==='bisector'){scope.y=(random()*2-1)*scope.L/2;scope.ri=Math.hypot(scope.y,scope.r);scope.alpha=adjacent(scope.r,scope.ri);return}
 if(g==='semi'){scope.x=scope.r*Math.tan(random()*.4*Math.PI/2);scope.ri=Math.hypot(scope.x,scope.r);scope.alpha=adjacent(scope.r,scope.ri);return}
 if(g==='endpoint'||g==='ramp'){scope.y=.05*scope.L+random()*.9*scope.L;scope.ri=Math.hypot(scope.y,scope.r);scope.alpha=adjacent(scope.r,scope.ri);return}
 if(g==='disk'){scope.s=random()*scope.R;scope.ri=Math.hypot(scope.s,scope.z);scope.alpha=adjacent(scope.z,scope.ri);return}
 if(g==='sheet'){scope.s=Math.abs(scope.z)*Math.tan(random()*.4*Math.PI);scope.ri=Math.hypot(scope.s,scope.z);scope.alpha=adjacent(scope.z,scope.ri);return}
 if(g==='arc'){scope.theta=(random()-.5)*scope.phi;scope.ri=scope.R;}
 // The semicircle with uneven charge runs θ over the half turn, and every piece is R from the centre.
 if(g==='uneven-arc'){scope.theta=(random()-.5)*Math.PI*.95;scope.ri=scope.R;}
}
export function equivalent(input:string,expected:string,p:Problem):Check{
 if(!input.trim())return {ok:false,error:'Add an expression first.'};
 try{
  const a=expand(safeParse(input),p),b=expand(safeParse(expected),p);
  const ai=infinitySign(a),bi=infinitySign(b);
  if(ai!==null||bi!==null)return{ok:ai!==null&&ai===bi,method:'symbolic'};
  const ac=a.compile(),bc=b.compile(),random=samples();
  for(let i=0;i<32;i++){
   const positive=()=>Math.exp(-1.6+random()*3.2);
   const scope:Record<string,number>={pi:Math.PI,Infinity};
   for(const symbol of allowedSymbols)if(!(symbol in scope))scope[symbol]=positive();
   // Geometry stays in the problem's stated domain; signed densities catch
   // magnitude/component confusion. Differentials and dE remain positive.
   scope.x=random()*scope.L*.95;scope.y=(random()*2-1)*scope.L;
   scope.theta=(random()-.5)*Math.PI*.95;scope.alpha=random()*Math.PI/2;
   scope.phi=.2+random()*(2*Math.PI-.2);scope.s=random()*scope.R;
   scope.lambda*=i%2?-1:1;scope.lambda0*=i%2?-1:1;scope.sigma*=i%2?-1:1;
   constrain(scope,p,random);
   const av=ac.evaluate(scope),bv=bc.evaluate(scope);
   if(typeof av!=='number'||typeof bv!=='number'||!Number.isFinite(av)||!Number.isFinite(bv))return{ok:false};
   // No absolute floor: tiny but incorrect fields must not grade as zero.
   if(Math.abs(av-bv)>1e-9*Math.max(Math.abs(av),Math.abs(bv),Number.MIN_VALUE))return{ok:false};
  }
  return{ok:true,method:a.toString()===b.toString()?'symbolic':'numeric'};
 }catch(e){return{ok:false,error:e instanceof Error?e.message:'Use a mathematical expression.'};}
}
// How the model's symbols are set in display. Left to itself mathjs prints a name it does not know
// letter by letter -- dθ as d·t·h·e·t·a, rᵢ as r·i, ε₀ as e·p·s·0 -- and sets L, s, ds and dV upright,
// because it reads them as units (litres, seconds, deciseconds, decivolts). The lessons write them as
// a textbook does: italic, with Greek letters and subscripts. φ is the lessons' φ, \varphi.
const TEX_NAMES:Record<string,string>={theta:'\\theta',alpha:'\\alpha',phi:'\\varphi',lambda:'\\lambda',lambda0:'\\lambda_0',sigma:'\\sigma',eps0:'\\varepsilon_0',pi:'\\pi',ri:'r_i',dtheta:'d\\theta',dalpha:'d\\alpha',dl:'d\\ell',Infinity:'\\infty'};
// No padding space: the bound labels' tidy() reads "\frac{-L}{2}" as -L/2 only with nothing between
// the brace and the name. The one command a name can directly follow is \cdot, spaced below.
const nameTex=(node:SymbolNode)=>TEX_NAMES[node.name]??node.name;
// sin θ, as a textbook sets it, not sin (θ): a trigonometric function of one symbol drops its
// brackets, and its power moves onto the function, cos³θ, where {cos θ}³ would read as cos(θ³).
const TRIG=new Set(['sin','cos','tan','sec']);
const trigOfSymbol=(node:MathNode):[string,SymbolNode]|null=>{if(node.type!=='FunctionNode')return null;const f=node as FunctionNode,name=(f.fn as SymbolNode).name;return TRIG.has(name)&&f.args.length===1&&f.args[0].type==='SymbolNode'?[name,f.args[0] as SymbolNode]:null;};
const symbolTex=(node:MathNode,options?:object):string|undefined=>{
 if(node.type==='SymbolNode')return nameTex(node as SymbolNode);
 const trig=trigOfSymbol(node);
 if(trig)return `\\${trig[0]} ${nameTex(trig[1])}`;
 if(node.type==='OperatorNode'&&(node as OperatorNode).op==='^'){const [base,power]=(node as OperatorNode).args,inner=trigOfSymbol(base);if(inner)return `\\${inner[0]}^{${power.toTex(options)}} ${nameTex(inner[1])}`;}
 return undefined;
};
/** Display-only TeX for an expression: the confusions list, and the dragged bounds' labels. Products
 * are set by juxtaposition with a thin space, as the lessons write them, except in two places: before
 * a numeral, where juxtaposition would read as one number, and after a numeric fraction, where the
 * bound labels' tidy() reads "\frac{1}{2}\cdot L" as L/2 and needs the \cdot to find it. */
export function preview(input:string):string {try{return texOf(safeParse(input));}catch{return String.raw`\text{Keep typing…}`;}}
const texOf=(node:MathNode)=>node.toTex({parenthesis:'auto',implicit:'hide',handler:symbolTex}).replace(/\\cdot/g,'\\cdot ').replace(/(\\frac\{-?\d+\}\{\d+\})?\\cdot (?!\s*\d)/g,(m:string,fraction?:string)=>fraction?m:'\\,');
/** The expression with the minus that leads it taken off, or null when nothing leads with one. mathjs
 * binds a unary minus tighter than a product, so −kλ/r is ((−k)·λ)/r: the minus sits on the first
 * factor of the numerator, however deep, and it is found by following first factors down. */
function withoutLeadingMinus(node:MathNode):MathNode|null{
 if(node.type!=='OperatorNode')return null;
 const o=node as OperatorNode;
 if(o.fn==='unaryMinus')return o.args[0];
 if(o.op!=='*'&&o.op!=='/')return null;
 const first=withoutLeadingMinus(o.args[0]);
 if(!first)return null;
 const copy=o.clone() as OperatorNode;
 copy.args[0]=first;
 return copy;
}
/** An expression in "Easy to confuse with", set to be read.
 *
 * Those expressions ARE the section: each is the wrong turn a sentence beside it diagnoses. Set
 * inline they came out in text style -- a fraction's numerator and denominator at seven tenths of
 * the size, and (s² + z²)^{3/2} with a stacked ³⁄₂ at script-script size, under half the size of the
 * prose next to it. So they are set in display style, as a textbook sets a formula it is talking
 * about, and a fraction in an exponent is written with a slash, which is how it is printed and the
 * only way it can be read at exponent size. `preview` itself is unchanged: the bound labels parse it.
 *
 * And a leading minus is set before the fraction, −kλ/r, as the lessons write it: mathjs puts it in
 * the numerator, \frac{-k\lambda}{r}, which no textbook prints and which sat beside the lesson's own
 * −\frac{k\lambda}{r} as a second way of writing one expression. Only a minus that leads the whole
 * expression is moved, so a product can never read as a difference.
 *
 * One symbol over a numeral is set with a slash, L/2 and φ/2, as every lesson writes it. Display
 * style reaches only the outer fraction; one storey down TeX drops to text style, so the half rod's
 * ln((L/2 + √((L/2)² + r²))/r) set its L/2 stacked at about seven pixels inside the numerator,
 * directly above the next entry's stacked full-size L/2 -- unreadable projected, and two typesettings
 * of one quantity, neither of them the lesson's. */
export function confusionTex(input:string):string{
 let shown:string;
 try{const node=safeParse(input),bare=withoutLeadingMinus(node);shown=bare?'-'+texOf(bare):texOf(node);}
 catch{shown=String.raw`\text{Keep typing…}`;}
 return '\\displaystyle '+slashHalves(tight(shown)).replace(/\^\{\\frac\{(-?\d+)\}\{(\d+)\}\}/g,'^{$1/$2}');
}
/** The brace-balanced group opening at tex[i]: its contents and the index just past its closing brace. */
function braced(tex:string,i:number):[string,number]|null{
 if(tex[i]!=='{')return null;
 for(let j=i,depth=0;j<tex.length;j++){if(tex[j]==='{')depth++;else if(tex[j]==='}'&&--depth===0)return [tex.slice(i+1,j),j+1];}
 return null;
}
/** One symbol: a letter, or a macro such as \varphi. */
const ONE_SYMBOL=/^(?:[A-Za-z]|\\[A-Za-z]+)$/;
/** \frac{X}{d}, X one symbol and d a numeral, written X/d wherever it sits. */
function slashHalves(tex:string):string{
 let out='',i=0;
 while(i<tex.length){
  if(tex.startsWith('\\frac',i)&&!/[A-Za-z]/.test(tex[i+5]??'')){
   const top=braced(tex,i+5),bottom=top&&braced(tex,top[1]);
   if(top&&bottom){
    const [num,den]=[top[0].trim(),bottom[0].trim()];
    out+=ONE_SYMBOL.test(num)&&/^\d+$/.test(den)?`${num}/${den}`:`\\frac{${slashHalves(top[0])}}{${slashHalves(bottom[0])}}`;
    i=bottom[1];
    continue;
   }
  }
  out+=tex[i++];
 }
 return out;
}
/** Factors set as a textbook sets them: side by side. texOf puts a thin space at every product, so the
 * list printed "π s² ds", "2 π R ds" and "k R dQ" with a gap between each factor, beside a board and
 * an Unfold that set 2πR ds and kR dQ -- the reference list looked typeset by a different hand. The
 * thin space stays only where TeX writes one: before a differential (λ dy, k dQ, R dθ) and after a
 * closing bracket. And rᵢ² is r_i^{2}, its power stacked over its subscript, not {r_i}^{2}, where the
 * power waits until the subscript has finished. */
function tight(tex:string):string{
 return tex.replace(/\\,(?!d(?:[A-Za-z]|\\theta|\\alpha|\\ell))/g,(m:string,at:number)=>/\\right[)\]]$/.test(tex.slice(0,at))?m:' ')
  .replace(/\{r_i\}\^/g,'r_i^');
}
export function feedback(input:string,field:import('../problems/types').Answer,p:Problem):{text:string;highlight:string}{for(const m of field.mistakes??[]){if(equivalent(input,m.expression,p).ok)return{text:m.message,highlight:m.highlight??'element'};}return{text:field.hint,highlight:field.id.includes('component')?'components':field.id==='distance'?'distance':'element'};}
