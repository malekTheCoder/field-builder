import katex from 'katex';
import { useMemo } from 'react';
export function MathText({tex,block=false,className=''}:{tex:string;block?:boolean;className?:string}) {const html=useMemo(()=>katex.renderToString(tex,{throwOnError:false,displayMode:block,strict:'ignore',trust:false}),[tex,block]);return <span className={'math '+className} style={block?{display:'block'}:undefined} dangerouslySetInnerHTML={{__html:html}}/>}
