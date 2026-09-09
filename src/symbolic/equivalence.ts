import {parse,simplify,type MathNode} from 'mathjs';
import type {Problem} from '../problems/types';
const allowedFunctions=new Set(['sqrt','sin','cos','tan','sec','abs']);
const allowedSymbols=new Set(['Q','L','R','r','a','z','x','y','s','theta','alpha','phi','lambda','sigma','eps0','pi','k','ri','dQ','dE','dx','dy','ds','dr','dtheta','dA','Infinity']);
export function normalize(input:string):string {
 let s=input.trim().replace(/^[A-Za-z_]+\s*=/,'').replace(/−|–/g,'-').replace(/λ|\\lambda/g,' lambda ').replace(/σ|\\sigma/g,' sigma ').replace(/ε₀|ε0|\\varepsilon_?\{?0\}?|\\epsilon_?\{?0\}?/g,' eps0 ').replace(/π|\\pi/g,' pi ').replace(/θ|\\theta/g,' theta ').replace(/α|\\alpha/g,' alpha ').replace(/φ|\\phi/g,' phi ').replace(/∞|\\infty|\binf\b/gi,'Infinity').replace(/r[′']/g,'s').replace(/d\s*s(?=\b)/g,'ds').replace(/r[_ᵢ]i?|r_i/g,'ri').replace(/\bd\s*theta\b/g,'dtheta').replace(/\\(?:left|right|,|;|!)/g,'').replace(/\\(?:cdot|times)|·|×/g,'*').replace(/²/g,'^2').replace(/³/g,'^3');
 // Accept the common LaTeX forms, including nested fractions.
 for(let i=0;i<6;i++){const next=s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,'(($1)/($2))').replace(/\\sqrt\{([^{}]*)\}/g,'sqrt($1)').replace(/\^\{([^{}]*)\}/g,'^($1)');if(next===s)break;s=next;}
 s=s.replace(/\\(sin|cos|tan|sec|sqrt)/g,'$1').replace(/[{}]/g,m=>m==='{'?'(':')').replace(/\|([^|]+)\|/g,'abs($1)').replace(/\b([dD])([xyzs])\b/g,(_,d,v)=>'d'+v).replace(/\s+/g,' ').trim();return s;
}
export function safeParse(input:string):MathNode {
 if(input.length>350)throw Error('Keep the expression under 350 characters.');const node=parse(normalize(input));let count=0;
 node.traverse(n=>{if(++count>100)throw Error('This expression is too long.');if(n.type==='SymbolNode'&&!allowedSymbols.has((n as any).name)&&!allowedFunctions.has((n as any).name))throw Error(`Unknown symbol ${(n as any).name}. Use the symbols shown in the lesson.`);if(!['OperatorNode','SymbolNode','ConstantNode','ParenthesisNode','FunctionNode'].includes(n.type))throw Error('Enter a single mathematical expression.');if(n.type==='FunctionNode'&&!allowedFunctions.has((n as any).fn.name))throw Error('Use only sqrt, sin, cos, tan, sec, or abs.');if(n.type==='OperatorNode'&&!['+','-','*','/','^'].includes((n as any).op))throw Error('Use arithmetic operators only.');if(n.type==='ConstantNode'&&Math.abs(Number((n as any).value))>1e8)throw Error('Use symbolic constants instead of very large numbers.');});return node;
}
function substitutions(problem:Problem):Record<string,string>{return {k:'1/(4*pi*eps0)',Q:problem.id==='ring'?'lambda*2*pi*R':problem.id==='arc'?'lambda*R*phi':problem.id==='disk'||problem.id==='sheet'?'sigma*pi*R^2':'lambda*L'};}
function expand(node:MathNode,p:Problem){const sub=substitutions(p);return node.transform(n=>n.type==='SymbolNode'&&sub[(n as any).name]?parse(sub[(n as any).name]):n);}
export type Check={ok:boolean;error?:string;method?:'symbolic'|'numeric'};
export function equivalent(input:string,expected:string,p:Problem):Check{
 if(!input.trim())return {ok:false,error:'Add an expression first.'};try{const a=expand(safeParse(input),p),b=expand(safeParse(expected),p);if(a.toString()===b.toString())return{ok:true,method:'symbolic'};
 if(['Infinity','-Infinity'].includes(b.toString()))return {ok:a.toString()===b.toString(),method:'symbolic'};
 try{const difference=simplify(`(${a.toString()})-(${b.toString()})`);if(difference.toString()==='0')return{ok:true,method:'symbolic'};}catch{/* Positive-domain evaluation handles square-root identities the simplifier cannot settle. */}
 const ac=a.compile(),bc=b.compile();let checked=0;for(let i=0;i<16;i++){const scope:Record<string,number>={pi:Math.PI,Infinity,eps0:.6+i*.087,L:2.1+i*.37,R:.8+i*.19,r:.43+i*.31,z:.6+i*.23,a:.4+i*.17,x:.23+i*.08,y:(i%2?-1:1)*(.1+i*.11),s:.15+i*.12,theta:-.9+i*.13,alpha:.12+i*.076,phi:.4+i*.32,lambda:1.3+i*.29,sigma:.7+i*.16,ri:1.4+i*.17,dQ:.04+i*.009,dE:.2+i*.017,dx:.03+i*.005,dy:.017+i*.003,ds:.019+i*.004,dr:.021+i*.006,dtheta:.013+i*.005,dA:.011+i*.002};const av=ac.evaluate(scope),bv=bc.evaluate(scope);if(typeof av!=='number'||typeof bv!=='number'||!Number.isFinite(av)||!Number.isFinite(bv))return{ok:false};if(Math.abs(av-bv)>1e-8*Math.max(Math.abs(av),Math.abs(bv),1e-8))return{ok:false};checked++;}return{ok:checked===16,method:'numeric'};
 }catch(e){return{ok:false,error:e instanceof Error?e.message:'Use a mathematical expression.'};}}
export function preview(input:string):string {try{return safeParse(input).toTex({parenthesis:'auto',implicit:'hide'});}catch{return String.raw`\text{Keep typing…}`;}}
export function feedback(input:string,field:import('../problems/types').Answer,p:Problem):{text:string;highlight:string}{for(const m of field.mistakes??[]){if(equivalent(input,m.expression,p).ok)return{text:m.message,highlight:m.highlight??'element'};}return{text:field.hint,highlight:field.id.includes('component')?'components':field.id==='distance'?'distance':'element'};}
