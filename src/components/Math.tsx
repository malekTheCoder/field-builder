import katex from 'katex';
import { useMemo } from 'react';
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
