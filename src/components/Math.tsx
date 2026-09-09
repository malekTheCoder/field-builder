import katex from 'katex';
import { useMemo } from 'react';
export function MathText({tex,block=false,className=''}:{tex:string;block?:boolean;className?:string}) {const html=useMemo(()=>katex.renderToString(tex,{throwOnError:false,displayMode:block,strict:'ignore',trust:false}),[tex,block]);// KaTeX markup is injected as raw HTML, and the server and client serialisations
// of it differ in ways React reports as a hydration mismatch even though the
// rendered maths is identical. Suppressing the check here is the fix; without it
// every equation on the page logs a mismatch and the dev overlay drowns in them.
return <span className={'math '+className} style={block?{display:'block'}:undefined} suppressHydrationWarning dangerouslySetInnerHTML={{__html:html}}/>}
