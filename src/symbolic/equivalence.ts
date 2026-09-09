import {parse,type MathNode,type SymbolNode,type FunctionNode,type OperatorNode,type ConstantNode} from 'mathjs';
import type {Problem} from '../problems/types';
const allowedFunctions=new Set(['sqrt','sin','cos','tan','sec','abs']);
const allowedSymbols=new Set(['Q','L','R','r','a','z','x','y','s','theta','alpha','phi','lambda','sigma','eps0','pi','k','ri','dQ','dE','dx','dy','ds','dr','dtheta','dA','Infinity']);
export function normalize(input:string):string {
 let s=input.trim().replace(/^(?:E_[xyz]|dE_[xyz]|dQ|dE|E|[A-Za-z_]+)\s*=/,'').replace(/−|–/g,'-').replace(/λ|\\lambda/g,' lambda ').replace(/σ|\\sigma/g,' sigma ').replace(/ε₀|ε0|\\varepsilon_?\{?0\}?|\\epsilon_?\{?0\}?/g,' eps0 ').replace(/π|\\pi/g,' pi ').replace(/θ|\\theta/g,' theta ').replace(/α|\\alpha/g,' alpha ').replace(/φ|ϕ|\\varphi|\\phi/g,' phi ').replace(/∞|\\infty|\binf\b/gi,'Infinity').replace(/r[′']/g,'s').replace(/r_\{i\}|r_i|rᵢ/g,'ri').replace(/\bd\s+(theta|x|y|s|r)\b/g,'d$1').replace(/\\(?:left|right|,|;|!)/g,'').replace(/\\(?:cdot|times)|·|×/g,'*').replace(/²/g,'^2').replace(/³/g,'^3');
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
  if(n.type==='FunctionNode'&&(!allowedFunctions.has(((n as FunctionNode).fn as SymbolNode).name)||(n as FunctionNode).args.length!==1))throw Error('Use only sqrt, sin, cos, tan, sec, or abs, with one argument.');
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
function substitutions(problem:Problem):Record<string,string>{const values:Record<string,string>={k:'1/(4*pi*eps0)'};if(problem.id==='ring')values.Q='lambda*2*pi*R';else if(problem.id==='arc')values.Q='lambda*R*phi';else if(problem.id==='disk')values.Q='sigma*pi*R^2';else if(problem.id==='bisector'||problem.id==='axial'||problem.id==='infinite')values.Q='lambda*L';return values;}
function expand(node:MathNode,p:Problem){const sub=substitutions(p);return node.transform(n=>n.type==='SymbolNode'&&sub[(n as SymbolNode).name]?parse(sub[(n as SymbolNode).name]):n);}
export type Check={ok:boolean;error?:string;method?:'symbolic'|'numeric'};
function infinitySign(node:MathNode):number|null {const value=node.toString().replace(/[()\s]/g,'');return value==='Infinity'||value==='+Infinity'?1:value==='-Infinity'?-1:null;}
// Every symbol is sampled independently. A fixed seed makes grading reproducible
// without the algebraic correlations introduced by linear sample sequences.
function samples(){let seed=0x51f15e;return()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return(seed+.5)/4294967296;};}
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
   scope.lambda*=i%2?-1:1;scope.sigma*=i%2?-1:1;
   const av=ac.evaluate(scope),bv=bc.evaluate(scope);
   if(typeof av!=='number'||typeof bv!=='number'||!Number.isFinite(av)||!Number.isFinite(bv))return{ok:false};
   // No absolute floor: tiny but incorrect fields must not grade as zero.
   if(Math.abs(av-bv)>1e-9*Math.max(Math.abs(av),Math.abs(bv),Number.MIN_VALUE))return{ok:false};
  }
  return{ok:true,method:a.toString()===b.toString()?'symbolic':'numeric'};
 }catch(e){return{ok:false,error:e instanceof Error?e.message:'Use a mathematical expression.'};}
}
export function preview(input:string):string {try{return safeParse(input).toTex({parenthesis:'auto',implicit:'hide'});}catch{return String.raw`\text{Keep typing…}`;}}
export function feedback(input:string,field:import('../problems/types').Answer,p:Problem):{text:string;highlight:string}{for(const m of field.mistakes??[]){if(equivalent(input,m.expression,p).ok)return{text:m.message,highlight:m.highlight??'element'};}return{text:field.hint,highlight:field.id.includes('component')?'components':field.id==='distance'?'distance':'element'};}
