import 'katex/dist/katex.min.css';
import '../app/globals.css';
import '../src/components/workbench.css';
import '@fontsource-variable/hanken-grotesk';
import {cleanup,render} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {Prose} from '../src/components/Math';

afterEach(cleanup);
function punctuationBox(host:HTMLElement,character:string){
 const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  if(node.parentElement?.closest('.math'))continue;
  const at=node.textContent?.indexOf(character)??-1;
  if(at<0)continue;
  const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+1);
  return range.getBoundingClientRect();
 }
 throw new Error(`Missing punctuation ${character}`);
}
// A formula is an inline block; without a shared wrapper, browsers can strand its
// opening punctuation on the preceding line even though ordinary words never do that.
for(const [text,open,close] of [['Inside ($z<R$).','(',')'],['Inside [$z<R$].','[',']']])it(`keeps adjacent punctuation on the formula's line: ${text}`,async()=>{
 const view=render(<p style={{width:70,fontFamily:'Hanken Grotesk Variable',fontSize:16,lineHeight:'24px'}}><Prose text={text}/></p>);
 await document.fonts.ready;
 const host=view.container.querySelector('p')!,math=host.querySelector('.katex-html')!.getBoundingClientRect();
 expect(Math.abs(punctuationBox(host,open).top-math.top)).toBeLessThan(12);
 expect(Math.abs(punctuationBox(host,close).top-math.top)).toBeLessThan(12);
 expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth+1);
},15000);
