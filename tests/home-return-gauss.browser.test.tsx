import 'katex/dist/katex.min.css';
import {cleanup,render,waitFor} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {userEvent} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';
import {navigate} from '../src/state/route';
const STORE='field-builder:explorer:v1';
afterEach(()=>{cleanup();localStorage.clear();history.replaceState(null,'','/');document.documentElement.classList.remove('dark')});
function visit(route:string){newVisit();history.replaceState(null,'',route);localStorage.setItem(STORE,JSON.stringify({id:'ring',hideTour:true,cued:true,dark:false,sidebarOpen:true,params:{}}));return render(<Site/>)}
it('returns to the last Gauss lesson and case, then remembers a later integral visit',async()=>{
 const r=visit('/?g=spheres&case=rising');await r.findByRole('heading',{level:1,name:'Spheres'});
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(STORE)!).lastGauss).toEqual({id:'spheres',case:'rising'}),{timeout:10000});
 await userEvent.click(r.getByRole('link',{name:'Field Builder home'}));
 const back=await r.findByRole('link',{name:/Return to your last lesson/});expect(back.getAttribute('href')).toBe('?g=spheres&case=rising');
 await userEvent.click(back);await r.findByRole('heading',{level:1,name:'Spheres'});
 expect(new URLSearchParams(location.search).get('case')).toBe('rising');
 navigate('?p=disk');await r.findByRole('heading',{level:1,name:'Field on the axis of a disk'});
 // Explorer debounces storage; allow the same slow-machine margin as the surrounding lesson flow.
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(STORE)!).lastLesson).toBe('integral'),{timeout:10000});
 await userEvent.click(r.getByRole('link',{name:'Field Builder home'}));
 expect((await r.findByRole('link',{name:/Continue where you left off/})).getAttribute('href')).toContain('p=disk');
 expect(r.queryByRole('link',{name:/Return to your last lesson/})).toBeNull();
},30000);
it('ignores invalid saved Gauss ids and cases without losing the legacy return link',async()=>{
 const r=visit('/');r.unmount();
 localStorage.setItem(STORE,JSON.stringify({id:'ring',lastLesson:'gauss',lastGauss:{id:'unknown'}}));
 newVisit();let v=render(<Site/>);expect((await v.findByRole('link',{name:/Continue where you left off/})).getAttribute('href')).toBe('?p=ring');v.unmount();
 localStorage.setItem(STORE,JSON.stringify({id:'ring',lastLesson:'gauss',lastGauss:{id:'spheres',case:'unknown'}}));
 newVisit();v=render(<Site/>);expect((await v.findByRole('link',{name:/Return to your last lesson/})).getAttribute('href')).toBe('?g=spheres');
},15000);
