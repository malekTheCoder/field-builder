import 'katex/dist/katex.min.css';
import '../app/globals.css';
import {cleanup,render} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {cdp,page,userEvent} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';

const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
afterEach(async()=>{
 cleanup();history.replaceState(null,'','/');newVisit();localStorage.clear();
 document.documentElement.classList.remove('dark');
 await cdp().send('Emulation.setEmulatedMedia',{media:''});await delay(280);
});
async function open(route:string){
 await page.viewport(1280,720);newVisit();history.replaceState(null,'',route);
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,dark:false,sidebarOpen:true,params:{}}));
 const view=render(<Site/>);await view.findByRole('heading',{level:1});return view;
}
// A paper handout has no browser address bar. Its return address must work when typed, including
// from a local file or test host, and must name the actual case after an on-page case change.
it('an integral handout prints a canonical lesson address without the numerical slider state',async()=>{
 const view=await open('/?p=ring&charge=-2&distance=2.5&view=2d');
 const note=view.container.querySelector<HTMLElement>('.print-lesson-link');expect(note).toBeTruthy();
 expect(note!.checkVisibility()).toBe(false);
 const link=note!.querySelector('a')!;
 expect(link.href).toBe('https://learnem.malekswilam.dev/?p=ring');expect(link.textContent).toBe(link.href);
 await cdp().send('Emulation.setEmulatedMedia',{media:'print'});
 expect(note!.checkVisibility()).toBe(true);expect(getComputedStyle(note!).breakAfter).toBe('avoid');
 expect(note!.getBoundingClientRect().top).toBeGreaterThanOrEqual(view.getByRole('heading',{level:1}).getBoundingClientRect().bottom);
},15000);
it('a Gauss handout keeps the currently selected case in its canonical return address',async()=>{
 const view=await open('/?g=spheres&case=rising&stage=right');
 const note=view.container.querySelector<HTMLElement>('.print-lesson-link');expect(note).toBeTruthy();
 expect(note!.checkVisibility()).toBe(false);
 const link=note!.querySelector('a')!;expect(link.href).toBe('https://learnem.malekswilam.dev/?g=spheres&case=rising');
 await userEvent.click(view.getByRole('button',{name:'Thin shell'}));
 expect(link.href).toBe('https://learnem.malekswilam.dev/?g=spheres&case=shell');expect(link.textContent).toBe(link.href);
 await cdp().send('Emulation.setEmulatedMedia',{media:'print'});expect(note!.checkVisibility()).toBe(true);
},15000);
