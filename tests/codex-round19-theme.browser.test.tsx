import {act,cleanup,fireEvent,render,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Site,{newVisit} from '../src/home/Site';
import {navigate} from '../src/state/route';
const key='field-builder:explorer:v1';
let original:typeof window.matchMedia;
const listeners=new Set<()=>void>();let matches=false;
beforeEach(()=>{
 newVisit();localStorage.clear();document.documentElement.classList.remove('dark');matches=false;listeners.clear();original=window.matchMedia;
 const q={get matches(){return matches},media:'(prefers-color-scheme: dark)',addEventListener(_n:string,f:()=>void){listeners.add(f)},removeEventListener(_n:string,f:()=>void){listeners.delete(f)},dispatchEvent(){return true},onchange:null};
 window.matchMedia=s=>s===q.media?q as unknown as MediaQueryList:original.call(window,s);
 localStorage.setItem(key,JSON.stringify({id:'bisector',hideTour:true,cued:true,params:{}}));
});
afterEach(()=>{cleanup();window.matchMedia=original;history.replaceState(null,'','/');vi.restoreAllMocks();newVisit()});
async function system(dark:boolean){await act(async()=>{matches=dark;listeners.forEach(f=>f())})}
for(const url of ['/','/?guide','/?quiz'])it(`${url} follows system changes until the reader chooses`,async()=>{
 history.replaceState(null,'',url);const v=render(<Site/>);await v.findByRole('heading',{level:1});
 await system(true);expect(document.documentElement.classList.contains('dark')).toBe(true);
 await system(false);expect(document.documentElement.classList.contains('dark')).toBe(false);
 expect(JSON.parse(localStorage.getItem(key)!).dark).toBeUndefined();
 fireEvent.click(v.getByRole('button',{name:'Switch to dark theme'}));
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(key)!).dark).toBe(true));
 await system(true);await system(false);expect(document.documentElement.classList.contains('dark')).toBe(true);
},15000);
it('retains an explicit utility-page choice across navigation when storage refuses writes',async()=>{
 history.replaceState(null,'','/');const v=render(<Site/>);await v.findByRole('heading',{level:1});
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('storage denied')});
 fireEvent.click(v.getByRole('button',{name:'Switch to dark theme'}));
 navigate('?guide');await v.findByRole('heading',{name:'How to study with Field Builder'});
 await system(true);await system(false);expect(document.documentElement.classList.contains('dark')).toBe(true);
},15000);
it('a later saved lesson choice replaces a prior utility-page choice',async()=>{
 history.replaceState(null,'','/');const v=render(<Site/>);await v.findByRole('heading',{level:1});
 fireEvent.click(v.getByRole('button',{name:'Switch to dark theme'}));
 localStorage.setItem(key,JSON.stringify({...JSON.parse(localStorage.getItem(key)!),dark:false}));
 navigate('?guide');await v.findByRole('heading',{name:'How to study with Field Builder'});
 await waitFor(()=>expect(document.documentElement.classList.contains('dark')).toBe(false));
},15000);
