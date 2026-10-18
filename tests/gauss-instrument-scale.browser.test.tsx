import {cleanup, render} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {InsideInstrument} from '../src/gauss/InsideInstrument';
import {CubeInstrument} from '../src/gauss/CubeInstrument';
import {insideBands} from '../src/gauss/instruments';
afterEach(cleanup);
/* A floor makes unlike small fields look equal; a silent cap does the same to large fields.
 * Check the drawn vectors against independent Coulomb magnitudes, not a drawing helper. */
for(const sign of[1,-1]as const)it(`carries truthful field lengths and marked overflow for sign ${sign}`,()=>{
 const v=render(<InsideInstrument sign={sign} start={2.1}/>);
 const arrows=[...v.container.querySelectorAll<SVGGElement>('.gs-arrow')];
 expect(arrows).toHaveLength(16);
 for(const [i,a]of arrows.entries()){
  const band=insideBands(2.1,sign)[Math.floor(i/2)];
  const expected=30/(1+2.1**2-2*2.1*Math.cos(band.mid));
  const shaft=a.querySelector('line')!,tip=a.querySelector('path')!.getAttribute('d')!.match(/^M([\d.e+-]+) ([\d.e+-]+)/)!;
  const dx=Number(tip[1])-Number(shaft.getAttribute('x1')),dy=Number(tip[2])-Number(shaft.getAttribute('y1')),length=Math.hypot(dx,dy);
  const radial={x:Math.cos(band.mid)-2.1,y:(i%2===0?-1:1)*Math.sin(band.mid)},r=Math.hypot(radial.x,radial.y);
  expect(dx/length).toBeCloseTo(sign*radial.x/r,3);expect(dy/length).toBeCloseTo(sign*radial.y/r,3);
  expect(length).toBeCloseTo(expected,1);
  expect(a.querySelector('.gs-arrow-break')).toBeNull();
 }
 v.rerender(<InsideInstrument key="near" sign={sign} start={.96}/>);
 expect(v.container.querySelectorAll('.gs-arrow-break')).toHaveLength(4);
 expect(v.container.textContent).toContain('Broken shafts');
});
it('separates the cube edge name from its bar name at the maximum phone type size',()=>{
 const v=render(<CubeInstrument sign={-1}/>);
 const labels=[...v.container.querySelectorAll<SVGTextElement>('.gs-bar-name')];
 for(const t of labels)t.style.fontSize=`${14*2.2}px`;
 const rights=labels.filter(t=>t.textContent==='Right');
 const [a,b]=rights.map(t=>t.getBBox());
 expect(b.x-(a.x+a.width)).toBeGreaterThan(12);
});
