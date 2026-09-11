import type {Problem} from '../problems/types';
import {preview} from '../symbolic/equivalence';
/** The integral a student assembles, in the order the figure hands the pieces over.
 *
 * The authored `kernelTex` is the *simplified* integrand — the thing you get after
 * combining and cancelling. Handing a student that directly is what the old panel
 * did, and it skips the only step that is actually hard: recognising that each
 * factor is a measurable feature of the picture. So the expression is rebuilt here
 * as Coulomb's law for one piece, with a slot per factor, and the simplification is
 * shown only once every slot is filled from the figure. */
export type TermId='element'|'distance'|'projection'|'bounds';
export type Term={id:TermId;label:string;tex:string;figure:string;why:string};
const SLOT=String.raw`\square`;
/** A scalar potential has no direction to project, so its integrand is one factor shorter. */
export const isScalar=(p:Problem)=>p.quantity==='V';
/** These strings are read aloud and rendered as plain text, never through KaTeX, so a
 * macro like `\theta` would reach the student as a literal backslash. */
const LETTER:Record<string,string>={theta:'θ',phi:'φ',alpha:'α',lambda:'λ',sigma:'σ'};
const spoken=(tex:string)=>LETTER[tex.replace(/^\\/,'')]??tex.replace(/^\\/,'');
export function termsFor(p:Problem):Term[]{
 const v=spoken(p.variableTex),scalar=isScalar(p);
 const out:Term[]=[
  {id:'element',label:'Charge in one piece',tex:p.dqTex,figure:'element',
   why:`The highlighted piece of the distribution carries this much charge. Everything else in the integral describes where it sits, not how much of it there is.`},
  {id:'distance',label:'Distance to P',tex:String.raw`r_i=${preview(p.distance)}`,figure:'distance',
   why:`The dashed line from the piece to P. It is the hypotenuse of the triangle in the figure, and it changes as ${v} runs along the distribution — which is exactly why it cannot come outside the integral.`},
 ];
 if(!scalar)out.push({id:'projection',label:'Surviving direction',tex:String.raw`\cos\theta=${preview(p.projection)}`,figure:'projection',
  why:`Only the component along the surviving axis adds up. This factor is the ratio of two sides of the same triangle, so it is fixed by the geometry you can see.`});
 out.push({id:'bounds',label:'Where the charge starts and ends',tex:String.raw`${p.boundTex[0]}\;\rightarrow\;${p.boundTex[1]}`,figure:'bounds',
  why:`The brackets on the figure. They have to sweep the whole distribution exactly once — no more, and no less.`});
 return out;
}
/** Coulomb's law for a single piece, with an empty slot for every factor not yet taken
 * from the figure. `have` grows as the student collects; nothing is ever graded. */
export function assembledTex(p:Problem,have:ReadonlySet<TermId>):string{
 const scalar=isScalar(p),sym=have.has('element')?String.raw`dQ`:SLOT;
 const dist=have.has('distance')?String.raw`r_i`:SLOT;
 const lower=have.has('bounds')?p.boundTex[0]:SLOT,upper=have.has('bounds')?p.boundTex[1]:SLOT;
 const lhs=scalar?'V':`${p.kind.includes('axis')||p.geometry==='ring'||p.geometry==='disk'||p.geometry==='sheet'?'E_z':'E_x'}`;
 const body=scalar?String.raw`\frac{${sym}}{${dist}}`
  :String.raw`\frac{${sym}}{${dist}^{2}}\,${have.has('projection')?String.raw`\cos\theta`:SLOT}`;
 return String.raw`${lhs}=k\int_{${lower}}^{${upper}}${body}`;
}
/** Substituting what each symbol stands for — the step between the structure and the
 * simplified kernel. Only meaningful once the pieces exist. */
export function substitutedTex(p:Problem,have:ReadonlySet<TermId>):string{
 const scalar=isScalar(p);
 const sym=have.has('element')?p.dqTex.replace(/^d?Q\s*=\s*/,''):SLOT;
 const dist=have.has('distance')?`(${preview(p.distance)})`:SLOT;
 const lower=have.has('bounds')?p.boundTex[0]:SLOT,upper=have.has('bounds')?p.boundTex[1]:SLOT;
 const body=scalar?String.raw`\frac{${sym}}{${dist}}`
  :String.raw`\frac{${sym}}{${dist}^{2}}\,${have.has('projection')?`(${preview(p.projection)})`:SLOT}`;
 return String.raw`k\int_{${lower}}^{${upper}}${body}`;
}
export const requiredTerms=(p:Problem):TermId[]=>termsFor(p).map(t=>t.id);
export const isComplete=(p:Problem,have:ReadonlySet<TermId>)=>requiredTerms(p).every(id=>have.has(id));
/** How far the build has come, for the progress affordance. 0..1. */
export function completion(p:Problem,have:ReadonlySet<TermId>):number{
 const need=requiredTerms(p);
 return need.length?need.filter(id=>have.has(id)).length/need.length:0;
}
/** The diagram feature that mints a term, and the reverse. Both directions are needed:
 * clicking the figure fills a slot, and focusing a slot lights up the figure. */
export function figureOf(p:Problem,id:TermId):string{return termsFor(p).find(t=>t.id===id)?.figure??'';}
export function termOfFigure(p:Problem,figure:string):TermId|null{return termsFor(p).find(t=>t.figure===figure)?.id??null;}
