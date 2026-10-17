import 'katex/dist/katex.min.css';
import '../app/globals.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../src/static-fonts.css';
import {cleanup,render,waitFor} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {cdp,page,userEvent} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';
const names=['Turn left','Turn right','Tilt up','Tilt down'];
afterEach(async()=>{cleanup();history.replaceState(null,'','/');localStorage.clear();document.documentElement.classList.remove('dark');await cdp().send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp().send('Emulation.setEmulatedMedia',{media:'',features:[]});await page.viewport(1280,800)});
for(const route of ['/?p=ring&view=3d','/?g=spheres'])it(`${route} gives a touch phone full camera targets and uses the existing steps`,async()=>{
 await page.viewport(390,844);await cdp().send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 // The same direct step must work with reduced motion; it should not acquire a separate animation path.
 await cdp().send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 newVisit();history.replaceState(null,'',route);localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,dark:false,sidebarOpen:true,params:{}}));
 const v=render(<Site/>);await v.findByRole('heading',{level:1});await document.fonts.ready;await waitFor(()=>expect(v.container.querySelector('.cd-cube')).toBeTruthy());
 expect(matchMedia('(any-pointer:coarse)').matches).toBe(true);
 for(const name of names){
  const button=v.getByRole('button',{name}) as HTMLButtonElement;expect(button.tagName).toBe('BUTTON');
  button.scrollIntoView({block:'center'});
  const card=v.container.querySelector('.exp-diagram-card')!.getBoundingClientRect();
  const box=button.getBoundingClientRect();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.left).toBeGreaterThanOrEqual(card.left);expect(box.right).toBeLessThanOrEqual(card.right);expect(box.top).toBeGreaterThanOrEqual(card.top);expect(box.bottom).toBeLessThanOrEqual(card.bottom);
  // At the corners as well as the centre, the whole visible target belongs to this button.
  for(const x of [box.left+2,box.right-2])for(const y of [box.top+2,box.bottom-2])expect(document.elementFromPoint(x,y)?.closest('button')).toBe(button);
 }
 const outline=()=>v.container.querySelector('.cd-cube-side[data-face=top] .cd-cube-outline')!.getAttribute('points');
 const before=outline();await userEvent.click(v.getByRole('button',{name:'Turn left'}));await waitFor(()=>expect(outline()).not.toBe(before));
 // This project does not compile Tailwind's sr-only table utility; measure the changed card here.
 // Whole-page overflow is checked separately with the styled configuration.
 expect(v.container.querySelector('.exp-diagram-card')!.getBoundingClientRect().width).toBeLessThanOrEqual(390);
 // A wider touch viewport still needs enough room for the row and the Gauss turning hint.
 await page.viewport(650,844);
 const wider=v.container.querySelector('.exp-diagram-card')!.getBoundingClientRect();
 for(const name of names){const box=v.getByRole('button',{name}).getBoundingClientRect();expect(box.left).toBeGreaterThanOrEqual(wider.left);expect(box.right).toBeLessThanOrEqual(wider.right);}
 // Desktop keeps the original arrows; the hidden phone row must not add another tab stop.
 await page.viewport(1280,720);await waitFor(()=>expect(getComputedStyle(v.container.querySelector('.cd-touch-steps')!).display).toBe('none'));
 for(const name of names)expect(v.getByRole('button',{name}).classList.contains('cd-cube-step')).toBe(true);
},20000);
