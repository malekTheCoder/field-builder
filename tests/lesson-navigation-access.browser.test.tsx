import 'katex/dist/katex.min.css';
import '../app/globals.css';
import '@fontsource-variable/hanken-grotesk';
import {cleanup,render,waitFor,within} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {cdp,page,userEvent} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';

// Opening a lesson picker should locate the reader, and a touch screen can still have a keyboard.
// These test actual focus and visible boxes, rather than a CSS selector or an assumed input device.
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
afterEach(async()=>{
 cleanup();history.replaceState(null,'','/');newVisit();localStorage.clear();
 document.documentElement.classList.remove('dark');window.scrollTo(0,0);
 await cdp().send('Emulation.setTouchEmulationEnabled',{enabled:false});
 await delay(280);
});
async function open(route:string,width:number,height:number,dark:boolean){
 await page.viewport(width,height);newVisit();history.replaceState(null,'',route);
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,dark,sidebarOpen:true,params:{}}));
 const view=render(<Site/>);await view.findByRole('button',{name:'Watch it build'});await document.fonts.ready;
 return view;
}
for(const [width,height,dark] of [[1280,720,false],[390,844,true]] as const)it(`Gauss library locates the current lesson and returns focus at ${width}`,async()=>{
 const view=await open('/?g=hard',width,height,dark),trigger=view.getByRole('button',{name:'Charge library'});
 await userEvent.click(trigger);const dialog=await view.findByRole('dialog');
 const current=dialog.querySelector<HTMLElement>('[aria-current=page]')!;
 await waitFor(()=>expect(document.activeElement).toBe(current));
 const list=dialog.querySelector('.exp-library-list')!,close=within(dialog).getByRole('button',{name:'Close'});
 await waitFor(()=>{
  const card=current.getBoundingClientRect(),window=list.getBoundingClientRect();
  expect(card.top).toBeGreaterThanOrEqual(window.top-1);expect(card.bottom).toBeLessThanOrEqual(window.bottom+1);
 });
 const first=dialog.querySelector<HTMLElement>('.exp-library-list a')!;
 expect(close.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 first.focus();await userEvent.tab({shift:true});expect(document.activeElement).toBe(close);
 await userEvent.keyboard('{Escape}');await waitFor(()=>expect(view.queryByRole('dialog')).toBeNull());
 await waitFor(()=>expect(document.activeElement).toBe(trigger));
},20000);
for(const route of ['/?p=ring&view=3d','/?g=spheres'])for(const dark of [false,true])it(`touch-phone keyboard help reveals its focused summary: ${route}, dark=${dark}`,async()=>{
 await cdp().send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const view=await open(route,390,844,dark),details=view.container.querySelector<HTMLDetailsElement>('.cd-caption>.cd-controls')!,summary=details.querySelector('summary')!;
 expect(details.open).toBe(false);expect(details.getBoundingClientRect().width).toBeLessThanOrEqual(1);
 summary.focus();await userEvent.keyboard('{Shift}');
 expect(document.activeElement).toBe(summary);expect(summary.matches(':focus-visible')).toBe(true);
 expect(details.getBoundingClientRect().width).toBeGreaterThan(20);expect(details.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
 expect(getComputedStyle(details).clipPath).toBe('none');
 expect(getComputedStyle(summary).outlineStyle).not.toBe('none');
 await userEvent.keyboard('{Enter}');expect(details.open).toBe(true);
 expect(details.textContent).toContain('Tab moves between them');
 details.open=false;view.getByRole('button',{name:'Watch it build'}).focus();
 expect(details.getBoundingClientRect().width).toBeLessThanOrEqual(1);
},20000);
