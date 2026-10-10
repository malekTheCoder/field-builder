import type {Problem} from './types';
/* SHORT EQUATIONS IN PROSE ARE HELD TOGETHER.
 *
 * A lesson's sentences reach the page as plain text -- the limiting cases' explanations, the unfolded
 * integration, the confusions list, the setup -- and a browser breaks plain text at any space. So
 * "E = 0 means V is flat" was set with "E =" ending one line and "0" starting the next, and "ΔV =
 * −σ Δz/(2ε₀)" came apart in two places, on a phone and on a projector alike. The plot captions
 * already held "r ≫ L" with no-break spaces; the sentences did not.
 *
 * Writing U+00A0 by hand into a hundred strings would be invisible in the source and undone by the
 * next edit, so it is done here, once, for every lesson. Two kinds of space are held:
 *  · the spaces either side of a relation or an operator between two terms: x = 0, z > 0, a + L;
 *  · the space between two symbols: k dQ, λ dy, 2kλ ln(r₂/r₁), cos θ.
 * A space after a sentence's or a clause's punctuation is never held, so a held run is a formula,
 * not a paragraph, and the words around it still wrap.
 *
 * The setup and the unfolded integration go further: the page sets them through Prose, which reads a
 * $…$ span as TeX, so their symbols are written that way and come out in the face of the equation
 * under them. "Eₓ = kλ(0 − 1/r)" in the sans face, directly above the same symbols in KaTeX, was one
 * symbol in two faces on a projected step. The limits' explanations and the confusions are still
 * plain paragraphs, and are held here. */
const OPERATOR=/(\S) ([=→≈∼~≫≪≤≥<>≠×·÷/+−]) (?=\S)/g;
/** Greek letters, sub- and superscripts and the calculus marks: any of them makes a token a symbol. */
const MATHY=/[α-ωΑ-ΩΔ∂√∫∞₀-₉ᵢᵧₓ²³′]/;
const FUNCTIONS=new Set(['sin','cos','tan','sec','ln','log']);
/** Whether a whitespace-delimited token is a symbol or a formula rather than a word. A sign in front
 * is part of the symbol: "−dE", "+dE" and "−(cos" were read as words, so "the x-part of dE is −dE"
 * ended one line and "sin α." began the next. */
export function symbolic(token:string):boolean{
 const core=token.replace(/^[−+]?[(“‘]*/,'').replace(/[.,;:!?)”’]+$/,'');
 if(!core)return false;
 if(MATHY.test(core))return true;
 if(/^[A-Za-z]$/.test(core)||/^d[A-Za-z]$/.test(core)||FUNCTIONS.has(core))return true;
 // kQ/R, Q/L, L/2, 1/r: letters and a fraction bar or a power, with no word in them.
 return /[A-Za-z]/.test(core)&&/[/^0-9]/.test(core)&&!/[a-z]{3}/.test(core);
}
/** The text with its short formulas held together by no-break spaces. A span written $…$ is TeX, set
 * as math by the page's Prose (the unfolded integration, the setup) and held there as one unit: it
 * is passed through untouched, so no no-break space lands inside a formula KaTeX has to read. */
export function hold(text:string):string{
 return text.split('$').map((part,i)=>i%2?part:holdWords(part)).join('$');
}
function holdWords(text:string):string{
 // A point's coordinates are one thing: P = (0, 0, z), never "(0," on one line and "0, z)" on the next.
 const held=text.replace(/\([^()\s]+(?:, [^()\s]+)+\)/g,tuple=>tuple.replace(/ /g,' ')).replace(OPERATOR,'$1 $2 ');
 // Between two symbols, unless the first closes a sentence or a clause.
 return held.replace(/(\S+) (?=(\S+))/g,(whole,a:string,b:string)=>!/[.,;:!?]$/.test(a)&&symbolic(a.split(' ').at(-1)!)&&symbolic(b.split(' ')[0])?a+' ':whole);
}
/** Every sentence of a lesson that is shown as plain text, held. Titles, labels and the answers a
 * choice is compared against are left as written. */
export function heldProblem(p:Problem):Problem{
 return {...p,subtitle:hold(p.subtitle),setup:hold(p.setup),symmetry:{...p.symmetry,text:hold(p.symmetry.text)},
  steps:p.steps.map(s=>({...s,text:hold(s.text),hint:hold(s.hint),
   ...s.worked?{worked:s.worked.map(w=>({...w,text:hold(w.text)}))}:{},
   ...s.fields?{fields:s.fields.map(f=>({...f,hint:hold(f.hint),...f.mistakes?{mistakes:f.mistakes.map(m=>({...m,message:hold(m.message)}))}:{}}))}:{}})),
  limits:p.limits.map(l=>({...l,explanation:hold(l.explanation),prompt:hold(l.prompt)}))};
}
