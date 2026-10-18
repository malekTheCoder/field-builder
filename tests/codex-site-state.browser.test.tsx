import 'katex/dist/katex.min.css';
import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Site, {newVisit} from '../src/home/Site';
import {QUESTION, BANKS, DEFAULT_SETTINGS, HISTORY_KEY} from '../src/quiz/engine';

beforeEach(async()=>{
 newVisit();localStorage.clear();document.documentElement.classList.remove('dark');
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,dark:false,sidebarOpen:true,params:{}}));
 await page.viewport(1280,720);
});
afterEach(()=>{cleanup();history.replaceState(null,'','/');localStorage.clear()});
it('does not invent an earlier misconception when returning to the first finished quiz',async()=>{
 history.replaceState(null,'','/?quiz=ring');
 const r=render(<Site/>);
 await userEvent.click(await r.findByRole('button',{name:/Start the quiz/}));
 for(let i=0;i<6;i++){
  const s=history.state.quiz,item=s.items[s.index],q=QUESTION.get(item.id)!;
  const choice=q.choices.findIndex(c=>i===0?!c.correct:!!c.correct);
  const radios=r.container.querySelectorAll<HTMLInputElement>('.quiz-choices input');
  await userEvent.click(radios[item.order.indexOf(choice)]);
  await userEvent.click(r.getByRole('radio',{name:'Sure'}));
  await userEvent.click(r.getByRole('button',{name:'Check my answer'}));
  await userEvent.click(r.getByRole('button',{name:i===5?/See how it went/:/Next question/}));
 }
 await r.findByRole('heading',{name:'How it went'});
 const before=r.container.querySelector('.quiz-spot-count')!.textContent;
 expect(before).not.toContain('earlier');
 await userEvent.click(r.container.querySelector<HTMLAnchorElement>('.quiz-spots .quiz-place a')!);
 await r.findByRole('heading',{level:1,name:/ring/i});
 history.back();
 await r.findByRole('heading',{name:'How it went'});
 expect(r.container.querySelector('.quiz-spot-count')!.textContent).toBe(before);
},30000);
it('lands a directly loaded teacher link on the teacher section',async()=>{
 history.replaceState(null,'','/?guide#guide-teachers');
 window.scrollTo({top:0});
 const r=render(<Site/>);
 await r.findByRole('heading',{name:'For teachers'});
 await new Promise(resolve=>setTimeout(resolve,200));
 const top=document.getElementById('guide-teachers')!.getBoundingClientRect().top;
 expect(top).toBeGreaterThanOrEqual(0);
 expect(top).toBeLessThan(720);
 await waitFor(()=>expect(document.activeElement?.id).toBe('guide-teachers'));
},15000);
it('keeps system dark on a Gauss lesson without saving it as a reader choice',async()=>{
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,sidebarOpen:true,params:{}}));
 document.documentElement.classList.add('dark');
 const original=window.matchMedia;
 window.matchMedia=(q:string)=>q==='(prefers-color-scheme: dark)'?{matches:true,media:q,addEventListener(){},removeEventListener(){},dispatchEvent(){return true},onchange:null} as unknown as MediaQueryList:original.call(window,q);
 try{
  history.replaceState(null,'','/?g=spheres');
  const r=render(<Site/>);
  await r.findByRole('heading',{level:1,name:/Spheres/});
  await new Promise(resolve=>setTimeout(resolve,100));
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(JSON.parse(localStorage.getItem('field-builder:explorer:v1')!).dark).toBeUndefined();
 }finally{window.matchMedia=original}
},15000);

// Restored results need evidence from before the attempt, including for snapshots written by an older version.
for(const prior of [undefined,{}, {'projection':2}])it(`restores only genuine earlier quiz evidence: ${JSON.stringify(prior)}`,async()=>{
 const q=BANKS.ring!.find(q=>q.choices.some(c=>c.misconception==='projection'))!;
 const choice=q.choices.findIndex(c=>c.misconception==='projection');
 localStorage.setItem(HISTORY_KEY,JSON.stringify({missed:[q.id],asked:[q.id],misconceptions:{projection:3}}));
 const quiz={phase:'end',settings:{...DEFAULT_SETTINGS,shapes:['ring']},items:[{id:q.id,order:q.choices.map((_,i)=>i)}],index:0,answers:[{id:q.id,choice,sure:true}],pick:{choice,sure:true,checked:true},priorMisconceptions:prior};
 history.replaceState({quiz},'','/?quiz=ring');
 let r=render(<Site/>);await r.findByRole('heading',{name:'How it went'});
 expect(r.container.querySelector('.quiz-spot-count')!.textContent!.includes('earlier')).toBe(!!prior?.projection);
 r.unmount();newVisit();r=render(<Site/>);await r.findByRole('heading',{name:'How it went'});
 expect(r.container.querySelector('.quiz-spot-count')!.textContent!.includes('earlier')).toBe(!!prior?.projection);
},15000);

it('preserves cross-page fragment focus and ignores invalid destinations safely',async()=>{
 history.replaceState(null,'','/');const r=render(<Site/>);
 await r.findByRole('heading',{level:1});
 const {navigate}=await import('../src/state/route');
 navigate('?guide#guide-order-gauss');
 await waitFor(()=>expect(document.activeElement?.id).toBe('guide-order-gauss'));
 expect(document.getElementById('guide-order-gauss')!.getBoundingClientRect().top).toBeLessThan(720);
 r.unmount();
 for(const hash of ['#not-a-section','#%ZZ']){
  newVisit();history.replaceState(null,'','/?guide'+hash);
  const v=render(<Site/>);await v.findByRole('heading',{level:1,name:'How to study with Field Builder'});
  expect(document.getElementById('guide-teachers')).toBeTruthy();v.unmount();
 }
},15000);

it('follows both system themes until a user override, which survives system changes',async()=>{
 const original=window.matchMedia;const listeners=new Set<()=>void>();let matches=false;
 const query={get matches(){return matches},media:'(prefers-color-scheme: dark)',addEventListener(_name:string,on:()=>void){listeners.add(on)},removeEventListener(_name:string,on:()=>void){listeners.delete(on)},addListener(){},removeListener(){},dispatchEvent(){return true},onchange:null};
 window.matchMedia=q=>q===query.media?query as unknown as MediaQueryList:original.call(window,q);
 try{
  localStorage.setItem('field-builder:explorer:v1',JSON.stringify({hideTour:true,cued:true}));
  history.replaceState(null,'','/?g=spheres');const r=render(<Site/>);
  await r.findByRole('heading',{level:1,name:/Spheres/});
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  matches=true;listeners.forEach(on=>on());
  await waitFor(()=>expect(document.documentElement.classList.contains('dark')).toBe(true));
  expect(JSON.parse(localStorage.getItem('field-builder:explorer:v1')!).dark).toBeUndefined();
  await userEvent.click(r.getByRole('button',{name:'Switch to light theme'}));
  await waitFor(()=>expect(JSON.parse(localStorage.getItem('field-builder:explorer:v1')!).dark).toBe(false));
  matches=false;listeners.forEach(on=>on());matches=true;listeners.forEach(on=>on());
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  r.unmount();newVisit();const again=render(<Site/>);
  await again.findByRole('heading',{level:1,name:/Spheres/});
  expect(document.documentElement.classList.contains('dark')).toBe(false);
 }finally{window.matchMedia=original}
},15000);
