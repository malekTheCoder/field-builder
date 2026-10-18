import 'katex/dist/katex.min.css';
import '../app/globals.css';
import {cleanup,fireEvent,render} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {cdp,page} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';
async function open(route:string){
 newVisit();history.replaceState(null,'',route);
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,dark:false,sidebarOpen:true,params:{}}));
 const view=render(<Site/>);await view.findByRole('heading',{level:1});return view;
}
afterEach(async()=>{vi.restoreAllMocks();cleanup();localStorage.clear();history.replaceState(null,'','/');document.documentElement.classList.remove('dark');await cdp().send('Emulation.setEmulatedMedia',{media:''});await page.viewport(1280,800)});
for(const route of ['/?p=shell','/?g=hard&case=odd'])it(`${route} keeps a printed misconception with its correction`,async()=>{
 const v=await open(route);await cdp().send('Emulation.setEmulatedMedia',{media:'print'});
 const note=v.container.querySelector('.exp-note:has(.exp-slips)')!;
 expect(getComputedStyle(note.querySelector('summary')!).breakAfter).toBe('avoid');
 expect(getComputedStyle(note.querySelector('.exp-slip-of')!).breakAfter).toBe('avoid');
 expect(getComputedStyle(note.querySelector('.exp-slip-note')!).breakInside).toBe('avoid');
 // Gauss has one compact wrong-claim/correction pair; integral groups can be longer than a page.
 expect(getComputedStyle(note.querySelector('.exp-slip')!).breakInside).toBe(route.includes('?g=')?'avoid':'auto');
},15000);
it('the completed quiz prints whole study items, not whole oversized cards or screen navigation',async()=>{
 vi.spyOn(Math,'random').mockReturnValue(.5);
 const v=await open('/?quiz=shell');fireEvent.click(v.getByRole('button',{name:'Start the quiz'}));
 for(let n=0;n<20&&v.container.querySelector('.quiz-take');n++){
  // With a fixed shuffle, the final choice deliberately produces feedback to paginate.
  fireEvent.click([...v.container.querySelectorAll<HTMLInputElement>('.quiz-choice input')].at(-1)!);
  fireEvent.click(v.getByRole('radio',{name:'Sure'}));fireEvent.click(v.getByRole('button',{name:'Check my answer'}));
  fireEvent.click(v.getByRole('button',{name:/^(Next question|See how it went)$/}));
 }
 const footer=v.container.querySelector<HTMLElement>('.quiz-foot')!;expect(footer).toBeTruthy();expect(footer.checkVisibility()).toBe(true);
 await cdp().send('Emulation.setEmulatedMedia',{media:'print'});expect(footer.checkVisibility()).toBe(false);
 const items=[...v.container.querySelectorAll('.quiz-spots>li,.quiz-flag-list>li')];expect(items.length).toBeGreaterThan(0);
 for(const item of items){expect(getComputedStyle(item).breakInside).toBe('avoid');expect(item.querySelector('.quiz-place a')).toBeTruthy();}
 for(const card of v.container.querySelectorAll('.quiz-card')){expect(getComputedStyle(card).breakInside).toBe('auto');expect(getComputedStyle(card.querySelector('h2')!).breakAfter).toBe('avoid');}
},15000);
it('the problem heading keeps its setup after the printed surface exercise',async()=>{
 const v=await open('/?g=symmetry');await cdp().send('Emulation.setEmulatedMedia',{media:'print'});
 expect(getComputedStyle(v.container.querySelector('.ew-problem-title')!).breakAfter).toBe('avoid');
 expect(getComputedStyle(v.container.querySelector('.ew-problem')!).breakInside).toBe('avoid');
},15000);
for(const route of ['/?p=shell','/?g=hard&case=odd'])it(`${route} keeps the board heading with its first derivation step on paper`,async()=>{
 const view=await open(route);await cdp().send('Emulation.setEmulatedMedia',{media:'print'});
 // The first step stays whole; without this join, the shell printed its board heading at the foot
 // of one page and every step on the next. The same heading introduces the Gauss board.
 expect(getComputedStyle(view.container.querySelector('.ew-section-title')!).breakAfter).toBe('avoid');
 expect(getComputedStyle(view.container.querySelector('.db-step')!).breakInside).toBe('avoid');
},15000);
