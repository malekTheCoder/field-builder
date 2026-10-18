import {cleanup,fireEvent,render,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {page} from 'vitest/browser';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
afterEach(()=>cleanup());
function frame(container:HTMLElement){
 const dot=container.querySelector<SVGCircleElement>('.cd-point')!;
 return {x:dot.cx.baseVal.value,y:dot.cy.baseVal.value,unit:Number(container.querySelector<HTMLElement>('.charge-diagram')!.dataset.unit)};
}
for(const id of ['axial','v-rod-axial'] as const)for(const width of [1440,390])it(`${id} at ${width}: the full axial span stays inside throughout orbit at one scale`,async()=>{
 await page.viewport(width,844);
 for(const [size,distance] of [[1,.5],[8,6],[4,3]])for(const charge of [-2,2]){
  const v=render(<ChargeDiagram problem={getProblem(id)} params={{...DEFAULT_PARAMS,size,distance,charge}} setParams={vi.fn()} count={5} continuum={0} selected={3} onSelect={vi.fn()} progress={1} components={false} pair={false} mode="divide" compact view="3d"/>);
  await waitFor(()=>expect(v.container.querySelector('.cd-in-space')).toBeTruthy(),{timeout:5000});
  const svg=v.container.querySelector('.cd-svg')!;const initial=frame(v.container);
  for(let i=0;i<18;i++)fireEvent.keyDown(svg,{key:'ArrowLeft'});
  for(let i=0;i<6;i++)fireEvent.keyDown(svg,{key:'ArrowUp'});
  await waitFor(()=>expect(frame(v.container).x).toBeLessThan(355),{timeout:4000});
  for(let i=0;i<28;i++){
   fireEvent.keyDown(svg,{key:'ArrowRight'});
   const f=frame(v.container);
   expect(f.x).toBeGreaterThanOrEqual(62);expect(f.x).toBeLessThanOrEqual(648);
   expect(f.y).toBeGreaterThanOrEqual(74);expect(f.y).toBeLessThanOrEqual(351);
   expect(f.unit).toBeCloseTo(initial.unit,4);
  }
  cleanup();
 }
},60000);
