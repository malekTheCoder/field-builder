import 'katex/dist/katex.min.css';
import '../app/globals.css';
import {cleanup,render} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {cdp,page,userEvent} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';

/* PRINT IS A BUTTON IN THE HEADER, NOT AN ITEM BEHIND THE THREE DOTS. Every lesson and the guide carry one; it
 * runs the same print path the menu item does, it is gone from the paper, and it never makes the header two lines. */
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
afterEach(async()=>{
 cleanup();vi.restoreAllMocks();history.replaceState(null,'','/');newVisit();localStorage.clear();
 document.documentElement.classList.remove('dark');
 await cdp().send('Emulation.setEmulatedMedia',{media:''});await page.viewport(1280,720);await delay(280);
});
async function open(route:string,width=1280){
 await page.viewport(width,720);newVisit();history.replaceState(null,'',route);
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,dark:false,sidebarOpen:true,params:{}}));
 const view=render(<Site/>);await view.findByRole('heading',{level:1});return view;
}
const header=(c:HTMLElement)=>c.querySelector<HTMLElement>('.exp-header')!;

it.each([
 ['an integral lesson','/?p=ring','Print this lesson'],
 ['a Gauss lesson','/?g=spheres','Print this lesson'],
 ['the study guide','/?guide','Print this page'],
])('%s has a visible Print button that prints',async(_name,route,label)=>{
 const view=await open(route);
 const print=vi.spyOn(window,'print').mockImplementation(()=>{});
 const button=view.getByRole('button',{name:label});
 expect(button.closest('.exp-header')).toBeTruthy();expect(button.checkVisibility()).toBe(true);
 expect(button.textContent).toBe('Print');expect(button.querySelector('svg')).toBeTruthy();
 expect(button.classList.contains('no-print')).toBe(true);
 button.focus();expect(document.activeElement).toBe(button);
 await userEvent.keyboard('{Enter}');expect(print).toHaveBeenCalledTimes(1);
 await userEvent.click(button);expect(print).toHaveBeenCalledTimes(2);
 await cdp().send('Emulation.setEmulatedMedia',{media:'print'});expect(button.checkVisibility()).toBe(false);
},20000);

it('the menu item stays beside the button on a lesson',async()=>{
 const view=await open('/?p=ring');
 await userEvent.click(view.getByRole('button',{name:'Lesson tools'}));
 expect(await view.findByRole('menuitem',{name:'Print this lesson'})).toBeTruthy();
},15000);

it.each([['/?p=ring'],['/?g=spheres'],['/?guide']])('%s keeps a one-line header from 360 up, with the word only where it fits',async route=>{
 for(const width of [360,375,399,400,480,700,701,800,801,1280]){
  const view=await open(route,width);
  const h=header(view.container);const button=h.querySelector<HTMLElement>('.print-button')!;
  const shown=button.checkVisibility();
  expect(shown,`${route} at ${width}`).toBe(width>=400);
  if(shown)expect(getComputedStyle(button.querySelector('span')!).display!=='none',`${route} word at ${width}`).toBe(width>800);
  expect(h.scrollWidth,`${route} header overflows at ${width}`).toBeLessThanOrEqual(h.clientWidth);
  const box=h.getBoundingClientRect();expect(box.height,`${route} header taller at ${width}`).toBeLessThanOrEqual(82.5);
  for(const el of h.querySelectorAll<HTMLElement>('.exp-header-right>*,.exp-brand')){
   if(!el.checkVisibility())continue;
   const r=el.getBoundingClientRect();expect(r.height,`${route} ${el.className} wraps at ${width}`).toBeLessThan(60);
   expect(r.right,`${route} ${el.className} past the edge at ${width}`).toBeLessThanOrEqual(width+0.5);
  }
  cleanup();
 }
},60000);

it('the quiz carries Print on its result page only',async()=>{
 const view=await open('/?quiz');
 expect(view.container.querySelector('.print-button')).toBeNull();
},15000);
