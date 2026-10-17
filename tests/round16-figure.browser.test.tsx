import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Site, {newVisit} from '../src/home/Site';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';

afterEach(()=>{cleanup();history.replaceState(null,'','/');});
async function open(id:string,params:Partial<Params>={}){
 await page.viewport(1280,720);newVisit();history.replaceState(null,'',`/?p=${id}&view=2d&${new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]))}`);
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id,hideTour:true,cued:true,dark:false,sidebarOpen:true,params:{[id]:{...DEFAULT_PARAMS,...params}}}));
 const v=render(<Site/>);await v.findByRole('button',{name:'Watch it build'});
 await waitFor(()=>expect(v.container.querySelector('.cd-in-space')).toBeNull(),{timeout:5000});
 return v;
}
async function hold(v:Awaited<ReturnType<typeof open>>,stage:number){
 fireEvent.click(v.getByRole('button',{name:'Watch it build'}));
 const track=v.container.querySelector<HTMLElement>('.bp-track')!;
 const box=v.container.querySelectorAll<HTMLElement>('.bp-seg')[stage-1].getBoundingClientRect(),x=box.left+.97*box.width;
 fireEvent.pointerDown(track,{clientX:x-10,button:0,pointerId:7});fireEvent.pointerMove(track,{clientX:x,pointerId:7});fireEvent.pointerUp(track,{clientX:x,pointerId:7});
 await waitFor(()=>expect(v.container.querySelector('.charge-diagram')?.getAttribute('data-moving')).toBe('false'));
}
// A finite ring sum has a quadrature residue inside the shell. It belongs in the adding
// demonstration; logarithmically enlarging it at rest misrepresents the exactly zero field.
for(const charge of [2,-2])for(const slices of [5,30])it(`shell resting field is zero inside, Q=${charge}, N=${slices}`,async()=>{
 const v=await open('shell',{distance:1,charge,slices});
 expect(v.container.querySelector('.cd-zero')?.textContent).toBe('E = 0');
 expect(v.container.querySelector('[data-sum-arrow]')).toBeNull();
},20000);
for(const distance of [.5,1])it(`the ring's polar angle is marked with P inside the shell at z=${distance}`,async()=>{
 const v=await open('shell',{distance});await hold(v,2);
 expect(v.container.querySelector('[data-shell-angle] .cd-angle')?.textContent).toBe('θ');
},20000);
// A negative arc's field points along its construction radius. The later-painted radius
// used to cover the whole shaft, so its head floated without a visible contribution arrow.
for(const id of ['arc','uneven-arc'])it(`${id}: construction radius paints below the negative contribution`,async()=>{
 const v=await open(id,{charge:-2});await hold(v,2);
 const radius=v.container.querySelector('[data-arc-construction], .cd-triangle[data-kind=arc] > line')!;
 const vector=v.container.querySelector('.cd-grow .cd-vector')!;
 expect(radius).toBeTruthy();expect(vector).toBeTruthy();
 expect(radius.compareDocumentPosition(vector)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
},20000);
// The radius is a dimension, not the sloping construction's label: its ink must not
// straddle the very stroke it names, including the larger label scale on a phone.
for(const width of [1280,390])it(`shell radius label clears its own stroke at ${width}`,async()=>{
 const v=await open('shell',{distance:1});await page.viewport(width,width===390?844:720);await hold(v,2);
 await waitFor(()=>{
  const label=[...v.container.querySelectorAll<SVGTextElement>('.cd-dimension text')].find(t=>t.textContent==='R')!;
  const path=label.parentElement!.querySelector<SVGPathElement>('path')!,box=label.getBoundingClientRect();
  const matrix=path.getScreenCTM()!;
  for(let i=0;i<=100;i++){
   const p=path.getPointAtLength(path.getTotalLength()*i/100),q=new DOMPoint(p.x,p.y).matrixTransform(matrix);
   expect(q.x>box.left&&q.x<box.right&&q.y>box.top&&q.y<box.bottom).toBe(false);
  }
 });
},20000);
it('an on-skin link and keyboard crossing stay on the two physical sides',async()=>{
 const v=await open('shell',{distance:2});
 const height=v.getByRole('slider',{name:'Height z'});
 expect(Number(height.getAttribute('aria-valuenow'))).toBeCloseTo(2.05,8);
 fireEvent.keyDown(height,{key:'ArrowLeft'});
 await waitFor(()=>expect(Number(height.getAttribute('aria-valuenow'))).toBeCloseTo(1.95,8));
 fireEvent.keyDown(height,{key:'ArrowRight'});
 await waitFor(()=>expect(Number(height.getAttribute('aria-valuenow'))).toBeCloseTo(2.05,8));
},20000);
