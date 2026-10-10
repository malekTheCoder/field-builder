import katex from 'katex';
import { useMemo, type ReactNode } from 'react';
// `trusted` lets the page's OWN TeX mark a factor with a class (`\htmlClass`), so it can be coloured
// and pointed at like the feature of the figure it comes from. Never for anything a reader typed:
// that is still rendered with trust off.
const CLASSES_ONLY=(context:{command:string})=>context.command==='\\htmlClass';
// THE MARKUP OBJECT IS MEMOISED WITH THE STRING, not rebuilt per render. React 19 compares
// `dangerouslySetInnerHTML` by the identity of the object, not by its `__html`, so a fresh
// `{__html}` every render re-parsed every equation's markup into the page on every render --
// sixteen equations torn down and rebuilt sixty times a second while "Watch it build" played,
// and the layout that followed each one paid for all of them again.
export function MathText({tex,block=false,className='',trusted=false}:{tex:string;block?:boolean;className?:string;trusted?:boolean}) {const inner=useMemo(()=>({__html:katex.renderToString(tex,{throwOnError:false,displayMode:block,strict:'ignore',trust:trusted?CLASSES_ONLY:false})}),[tex,block,trusted]);// KaTeX markup is injected as raw HTML, and the server and client serialisations
// of it differ in ways React reports as a hydration mismatch even though the
// rendered maths is identical. Suppressing the check here is the fix; without it
// every equation on the page logs a mismatch and the dev overlay drowns in them.
return <span className={'math '+className} style={block?{display:'block'}:undefined} suppressHydrationWarning dangerouslySetInnerHTML={inner}/>}
/** A relation in plain text -- "r > 0", "y = r tan α" -- held together, so a line never breaks
 * inside one: "where z >" ended a line of the shelf and "0, differentiate" began the next. Only for
 * text that is not yet marked up with $…$; marked-up text sets the relation as math. */
const holdRelations=(text:string)=>text.replace(/ ([=<>→≈≤≥]) /g,' $1 ');
/** A remark in words, with any symbol in it -- written $…$ -- set as math: the λ in the sentence is
 * then the λ in the equation above it, in the same face, rather than a Greek letter from whatever
 * font the browser found. The words still wrap; only a symbol is held together. Here rather than on
 * the board because the shelf under it speaks the same way: its worked steps and model notes wrote
 * "r sec²α" and "dy → dα" in the page's sans beside KaTeX lines, one symbol in two faces. */
export function Prose({text}:{text:string}){
 const parts=text.split('$');
 const out:ReactNode[]=[];
 for(let i=0;i<parts.length;i++){
  if(!(i%2)){out.push(holdRelations(parts[i]));continue;}
  // KaTeX sets a symbol as inline blocks, and a browser will break a line before one even after
  // a no-break space -- so a sentence ended on a lone "P." on a line of its own. A word joined to
  // its symbol that way is held to it, with the punctuation after, in one unbreakable run -- and
  // with the rest of a hyphenated word, which broke after its hyphen: "the x-" ending one line and
  // "axis." starting the next.
  // And a symbol is never broken inside: KaTeX lets a line break after an "=", and "y = L/2" was
  // set as "y =" at the end of one line and "L/2" at the start of the next.
  const before=typeof out.at(-1)==='string'?(out.at(-1) as string).match(/^([\s\S]*?)(\S+ )$/):null;
  if(!before){out.push(<MathText key={i} className="db-sym" tex={parts[i]}/>);continue;}
  const after=parts[i+1]?.match(/^(?:-[A-Za-z]+)?[.,;:]*/)?.[0]??'';
  out[out.length-1]=before[1];
  out.push(<span key={i} className="db-held">{before[2]}<MathText className="db-sym" tex={parts[i]}/>{after}</span>);
  if(after)parts[i+1]=parts[i+1].slice(after.length);
 }
 return out;
}
