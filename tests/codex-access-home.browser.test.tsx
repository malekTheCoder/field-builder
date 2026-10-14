import {cleanup,render} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import Home from '../src/home/Home';

afterEach(()=>{cleanup();localStorage.clear();document.documentElement.classList.remove('dark');});

it('the home example uses the lesson’s piece-distance symbol and identifies a pair subtotal',()=>{
 const {container}=render(<Home/>),cover=container.querySelector('.home-cover')!;
 // The two orange rays reach off-axis pieces: these are r_i, not the perpendicular r the
 // first lesson asks students to hold fixed. The lower arrow adds just these two pieces.
 expect([...cover.querySelectorAll('.home-r')].map(e=>e.textContent)).toEqual(['ri','ri']);
 expect(cover.textContent).toContain('this pair’s share of E');
 expect(cover.querySelector('.home-e')).toBeNull();
});

it('the home subtotal is precisely the two visible contributions at one scale',()=>{
 const {container}=render(<Home/>),cover=container.querySelector('.home-cover')!;
 const start=(g:Element)=>g.querySelector('path')!.getAttribute('d')!.match(/[-+]?\d+(?:\.\d+)?/g)!.map(Number).slice(0,2);
 const tip=(g:Element)=>g.querySelector('.home-head')!.getAttribute('d')!.match(/[-+]?\d+(?:\.\d+)?/g)!.map(Number).slice(0,2);
 const components=[...cover.querySelectorAll('.home-part')].map(g=>{const a=start(g),b=tip(g);return[b[0]-a[0],b[1]-a[1]];});
 const a=start(cover.querySelector('.home-net')!),b=tip(cover.querySelector('.home-net')!);
 expect(b[0]-a[0]).toBeCloseTo(components[0][0]+components[1][0],10);
 expect(components[0][1]+components[1][1]).toBeCloseTo(0,10);
 expect(b[1]-a[1]).toBe(0);
});

it('the shared outline allows ring pieces and both fields and potentials',()=>{
 const {container}=render(<Home/>),outline=container.querySelector('.home-steps')!.textContent!;
 // Disk, sheet and disk-potential lessons reuse a whole thin ring’s result. Treating that
 // ring as a point charge is precisely the shortcut the disk lesson warns against.
 expect(outline).not.toMatch(/each small enough to act as a point|as if it were a point charge/);
 expect(outline).toMatch(/thin rings/);
 expect(outline).toMatch(/field or potential/);
 expect(outline).toMatch(/a result already built/);
});
