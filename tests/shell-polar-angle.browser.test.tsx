import {cleanup,render,waitFor} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {page} from 'vitest/browser';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
afterEach(()=>{cleanup();history.replaceState(null,'','/');});
// An overlap-only guard can pass by suppressing theta. The polar coordinate still exists
// when P is close to the shell, so require both its visible letter and clearance of P.
for(const width of [1280,390])for(const view of ['2d','3d'] as const)for(const charge of [2,-2])it(`close small shell keeps theta clear of P at ${width}, ${view}, Q=${charge}`,async()=>{
 await page.viewport(width,width===390?844:720);
 const r=render(<div style={{width:width===390?358:680}}><ChargeDiagram problem={getProblem('shell')} params={{...DEFAULT_PARAMS,distance:.6,size:1,charge}} setParams={()=>{}} count={5} continuum={0} selected={1} onSelect={()=>{}} progress={1} components={false} pair={false} mode="divide" boundRange={[0,100]} view={view}/></div>);
 await document.fonts.ready;
 await waitFor(()=>{
  const theta=r.container.querySelector<SVGTextElement>('[data-shell-angle] .cd-angle')!;
  expect(theta?.textContent).toBe('θ');expect(getComputedStyle(theta).visibility).not.toBe('hidden');expect(Number(getComputedStyle(theta).opacity)).toBeGreaterThan(.05);
  const radius=[...r.container.querySelectorAll<SVGTextElement>('.cd-dimension text')].find(t=>t.textContent==='R')!;
  expect(getComputedStyle(theta).fontSize,'theta uses the shared readable symbol scale').toBe(getComputedStyle(radius).fontSize);
  expect(getComputedStyle(theta).fontFamily).toBe(getComputedStyle(radius).fontFamily);expect(getComputedStyle(theta).fontStyle).toBe('italic');
  const b=theta.getBoundingClientRect();expect(b.width).toBeGreaterThan(0);expect(b.height).toBeGreaterThan(0);
  for(const mark of r.container.querySelectorAll('.cd-point,.cd-point-halo')){
   const p=mark.getBoundingClientRect();
   expect(b.left<p.right&&b.right>p.left&&b.top<p.bottom&&b.bottom>p.top,'theta must clear the observation point and its halo').toBe(false);
  }
 });
},15000);
