import 'katex/dist/katex.min.css';
import '../app/globals.css';
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Site from '../src/home/Site';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {serializeAssignment} from '../src/state/assignment';
const delay = (ms:number) => new Promise(r=>setTimeout(r,ms));
afterEach(()=>{cleanup();history.replaceState(null,'','/');localStorage.clear();});
// Nonintersection is too weak: an almost-touching "+L/2z" was one unreadable expression.
// Use the real page and a held run, because the early fade measures smaller label boxes.
for(const id of ['bisector','v-rod-bisector'] as const) for(const width of [390,1366]) for(const charge of [-5,5]) it(`${id} ${width} ${charge}: endpoint and axis have visible clearance`,async()=>{
 await page.viewport(width,width===390?844:657);await delay(80);
 const params={...DEFAULT_PARAMS,size:8,distance:.5,charge};
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id,hideTour:true,cued:true,dark:charge<0,sidebarOpen:true,params:{}}));
 history.replaceState(null,'',`/?${serializeAssignment({id,params,view:'3d'})}`);
 const view=render(<Site/>);
 const play=await view.findByRole('button',{name:'Watch it build'});
 await waitFor(()=>expect(view.container.querySelector('.cd-in-space')).toBeTruthy());
 fireEvent.click(play);fireEvent.click(view.getByRole('button',{name:'Pause'}));
 const track=view.container.querySelector('.bp-track')!,box=view.container.querySelector('.bp-seg')!.getBoundingClientRect(),x=box.left+box.width*.72;
 fireEvent.pointerDown(track,{clientX:x-16,button:0,pointerId:8});fireEvent.pointerMove(track,{clientX:x,pointerId:8});fireEvent.pointerUp(track,{clientX:x,pointerId:8});await delay(1500);
 const svg=view.container.querySelector('.cd-svg')!;
 const letters=[...svg.querySelectorAll('text')].filter(t=>!t.dataset.placerHidden&&getComputedStyle(t).opacity!=='0');
 const end=letters.find(t=>t.textContent==='+L/2')!,z=letters.find(t=>t.textContent==='z')!;
 expect(end).toBeTruthy();expect(z).toBeTruthy();
 const a=end.getBoundingClientRect(),b=z.getBoundingClientRect();
 const gapX=Math.max(a.left-b.right,b.left-a.right),gapY=Math.max(a.top-b.bottom,b.top-a.bottom);
 expect(Math.max(gapX,gapY)).toBeGreaterThanOrEqual(3);
},30000);
