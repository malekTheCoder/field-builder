import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../src/static-fonts.css';
import {cleanup, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';

let frame:HTMLIFrameElement|null=null;
afterEach(async()=>{cleanup();frame?.remove();frame=null;vi.restoreAllMocks();history.replaceState(null,'','/');localStorage.clear();document.documentElement.classList.remove('dark');await cdp().send('Emulation.setEmulatedMedia',{media:''})});
// Exercise the actual download from a desktop, then read that one file at phone width. A responsive
// page alone cannot rescue labels baked into a desktop SVG at half their intended reading size.
for(const id of ['bisector','ring','shell'])it(`keeps ${id}'s saved figure legible on a phone, with an embedded reading face`,async()=>{
 await page.viewport(1280,720);newVisit();history.replaceState(null,'',`/?p=${id}&Q=-2`);
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',hideTour:true,cued:true,dark:true,sidebarOpen:true,params:{}}));
 const r=render(<Site/>);await r.findByRole('heading',{level:1});await document.fonts.ready;
 const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:field-builder-copy');
 vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 await userEvent.click(r.getByRole('button',{name:'Lesson tools'}));
 await userEvent.click(await r.findByRole('menuitem',{name:'Save an offline copy of this lesson'}));
 await vi.waitFor(()=>expect(create).toHaveBeenCalled(),{timeout:10000});
 const html=await(create.mock.calls[0][0] as Blob).text();r.unmount();
 frame=document.createElement('iframe');frame.style.cssText='width:390px;height:844px;border:0';
 const loaded=new Promise<void>(resolve=>{frame!.onload=()=>resolve()});frame.srcdoc=html;document.body.appendChild(frame);await loaded;
 const doc=frame.contentDocument!,win=frame.contentWindow!;await doc.fonts.ready;
 expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(390);
 expect([...doc.fonts].some(f=>f.family.includes('Hanken')&&f.status==='loaded')).toBe(true);
 expect(win.getComputedStyle(doc.querySelector('h1')!).fontFamily).toContain('Hanken');
 const names=[...doc.querySelectorAll<SVGTextElement>('svg .cd-point-label,svg .cd-vector-label,svg [data-ri] text,svg .cd-triangle text')].filter(t=>t.getBBox().width>0&&win.getComputedStyle(t).visibility!=='hidden');
 expect(names.length).toBeGreaterThan(3);
 for(const label of names){
  const m=label.getScreenCTM()!;
  const pixels=parseFloat(win.getComputedStyle(label).fontSize)*Math.hypot(m.a,m.b);
  expect(pixels,`${label.textContent} rendered font size`).toBeGreaterThanOrEqual(11);
 }
 const raster=doc.querySelector('figure svg image');
 expect(raster,'the field or WebGL figure is in the saved file').toBeTruthy();
 const pixels=new Image();pixels.src=raster!.getAttribute('href')??raster!.getAttribute('xlink:href')!;
 await pixels.decode();
 expect(pixels.naturalWidth,'the compact layout still has enough raster detail for desktop or paper').toBeGreaterThanOrEqual(720);
 const footer=doc.querySelector('footer')!;expect(footer.checkVisibility()).toBe(true);
 await cdp().send('Emulation.setEmulatedMedia',{media:'print'});
 expect(footer.checkVisibility(),'format metadata must not orphan a printed sheet').toBe(false);
 await cdp().send('Emulation.setEmulatedMedia',{media:''});
},30000);
