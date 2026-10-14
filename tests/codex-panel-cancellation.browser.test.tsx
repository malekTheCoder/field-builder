import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import {cleanup,render} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {page} from 'vitest/browser';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
afterEach(async()=>{cleanup();await page.viewport(1280,800);});
describe('a cancellation conclusion stays together on a narrow board',()=>{
 it('keeps the final equals sign and zero on the same line, with room inside the panel',async()=>{
  await page.viewport(390,844);
  for(const id of ['sheet','disk','ring','bisector'] as const){
   const view=render(<div style={{width:358}}><EquationWorkbench problem={getProblem(id)} params={DEFAULT_PARAMS}
    onModeChange={vi.fn()} boundRange={[0,100]} onBoundRangeChange={vi.fn()}
    build={{open:true,index:2,playing:false,settled:true}}/></div>);
   await document.fonts.ready;
   const math=view.container.querySelector<HTMLElement>('.db-cancels')!;
   const symbols=[...math.querySelectorAll<HTMLElement>('.katex-html .mrel, .katex-html .mord')];
   for(const [i,zero] of symbols.entries()){
    if(zero.textContent!=='0')continue;
    const equals=symbols.slice(0,i).filter(e=>e.textContent==='=').at(-1)!;
    const a=equals.getBoundingClientRect(),b=zero.getBoundingClientRect();
    expect(Math.abs((a.top+a.bottom-b.top-b.bottom)/2),`${id}: orphaned zero`).toBeLessThan(8);
   }
   expect(math.scrollWidth-math.clientWidth,`${id}: cancellation overflow`).toBeLessThanOrEqual(3);
   cleanup();
  }
 },20000);
});
