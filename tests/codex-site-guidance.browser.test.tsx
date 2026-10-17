import 'katex/dist/katex.min.css';
import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
import Site, {newVisit} from '../src/home/Site';
import globalCss from '../app/globals.css?raw';

const STORE = 'field-builder:explorer:v1';
function open(route: string, dark = false) {
 newVisit();
 history.replaceState(null, '', route);
 localStorage.setItem(STORE, JSON.stringify({id:'bisector',hideTour:true,cued:true,dark,sidebarOpen:true,params:{}}));
 document.documentElement.classList.toggle('dark', dark);
 return render(<Site/>);
}
afterEach(async () => {
 cleanup();
 localStorage.clear();
 history.replaceState(null, '', '/');
 document.documentElement.classList.remove('dark');
 await cdp().send('Emulation.setEmulatedMedia', {media: ''});
 await page.viewport(1280,800);
});

// These are method boundaries a student has to choose for themselves: a rod's piece is not every piece,
// a scalar potential has no projection and no inverse-square far limit, and Gauss may still require Qenc's
// integral. Check the rendered formula sources as well as the words, so losing a math block is a failure.
describe('the guide separates the methods it teaches', () => {
 it('shows the field and potential limits, the charge measure, and Gauss’s remaining integral', async () => {
  const r = open('/?guide');
  await r.findByRole('heading',{level:1,name:'How to study with Field Builder'});
  const idea = document.getElementById('guide-idea')!;
  expect(idea.textContent).toContain('uniformly charged rod');
  const tex = (el: Element) => [...el.querySelectorAll('annotation[encoding="application/x-tex"]')].map(a=>a.textContent).join('\n');
  expect(tex(idea)).toContain('dQ=\\sigma\\,dA');
  expect(tex(idea)).toContain('dQ=\\rho\\,d\\mathcal{V}');
  expect(tex(idea)).toContain('dV=k\\,dQ/r_i');
  expect(idea.textContent).toContain('without a projection');
  const exam = document.getElementById('guide-exam')!;
  expect(tex(exam)).toContain('E_r\\approx kQ/r^2');
  expect(tex(exam)).toContain('V\\approx kQ/r');
  expect(exam.textContent).toContain('If the net charge is zero');
  expect(exam.textContent).toContain('law remains true but cannot determine the field on its own');
  expect(document.querySelector('.guide-gauss-note')!.textContent).toContain('enclosed charge may still require integrating a density');
  expect(document.getElementById('guide-teachers')!.textContent).toContain('Teachers do not receive scores');
 },15000);
 it('names the integral run and gives Gauss its own way in', async () => {
  const r = open('/');
  await r.findByRole('heading',{level:1,name:'One law, every geometry.'});
  expect(r.getByRole('heading',{name:'How an integral lesson goes'})).toBeTruthy();
  const link = r.getByRole('link',{name:'Start with symmetry'});
  expect(link.getAttribute('href')).toBe('?g=symmetry');
  await userEvent.click(link);
  expect(await r.findByRole('heading',{level:1,name:'Symmetry first'})).toBeTruthy();
 },15000);
});

describe('every reading page prints on white paper from the dark theme', () => {
 for (const route of ['home','guide','quiz']) it(`${route} uses readable paper ink and keeps its screen choice`,async()=>{
  // The ordinary browser project omits Tailwind processing. Use the shipped theme declarations, not made-up
  // test colours, so this exercises the print cascade against the same .dark variables as the styled site.
  const theme=document.createElement('style');
  theme.textContent=[...globalCss.matchAll(/(?:^|[}\s])(:root|\.dark)\s*\{([^}]*)\}/g)].map(m=>`${m[1]}{${m[2]}}`).join('\n');
  document.head.appendChild(theme);
  try{
   const r=open(route==='home'?'/':`/?${route}`,true);
   await r.findByRole('heading',{level:1});
   const root=document.documentElement;
   expect(getComputedStyle(root).getPropertyValue('--foreground').trim()).toBe('#f2f2f2');
   window.dispatchEvent(new Event('beforeprint'));
   await cdp().send('Emulation.setEmulatedMedia',{media:'print'});
   expect(getComputedStyle(root).getPropertyValue('--foreground').trim()).toBe('#171717');
   expect(getComputedStyle(root).getPropertyValue('--card').trim()).toBe('#fff');
   if(route==='guide')expect(getComputedStyle(document.querySelector('.guide-where>span')!).color).toBe('rgb(23, 23, 23)');
   if(route==='quiz'){
    expect(getComputedStyle(document.querySelector('.quiz-group')!).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(document.querySelector<HTMLElement>('.quiz-start-row')!.checkVisibility()).toBe(false);
   }
   await cdp().send('Emulation.setEmulatedMedia',{media:''});
   window.dispatchEvent(new Event('afterprint'));
   expect(root.classList.contains('dark')).toBe(true);
   expect(getComputedStyle(root).getPropertyValue('--foreground').trim()).toBe('#f2f2f2');
   expect(JSON.parse(localStorage.getItem(STORE)!).dark).toBe(true);
  }finally{theme.remove()}
 },15000);
});
