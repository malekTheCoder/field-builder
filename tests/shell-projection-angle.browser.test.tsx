import {cleanup,fireEvent,render,waitFor} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {page} from 'vitest/browser';
import Site,{newVisit} from '../src/home/Site';
import {shellRings} from '../src/distributions/shell';

afterEach(()=>{cleanup();history.replaceState(null,'','/');});
for(const width of [1280,390])for(const charge of [2,-2])it(`the shell inset names the signed projection’s supplementary angle at ${width}, Q=${charge}`,async()=>{
 await page.viewport(width,width===390?844:720);newVisit();history.replaceState(null,'',`/?p=shell&view=2d&distance=1&charge=${charge}&stage=2`);
 localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'shell',hideTour:true,cued:true,dark:charge<0,sidebarOpen:true,params:{}}));
 const v=render(<Site/>);await v.findByRole('heading',{level:1});
 for(const index of [0,4]){
  fireEvent.change(v.getByRole('slider',{name:'Selected charge element'}),{target:{value:String(index)}});
  await waitFor(()=>expect(v.container.querySelector('.charge-diagram')?.getAttribute('data-moving')).toBe('false'),{timeout:5000});
  // The definition is oriented: reverse the charge without changing the geometric
  // angle. A ring above P has cos(alpha)<0, hence an obtuse alpha; the acute
  // interior wedge in the flipped right triangle is its supplement.
  const ring=shellRings(2,charge*1e-9,1,5)[index],height=1-ring.position.z;
  const alpha=Math.acos(height/Math.hypot(ring.position.x,height));
  const over=height<0;
  expect(over?Math.PI-alpha:alpha).toBeLessThan(Math.PI/2);
  expect(Math.sign(ring.field.z/charge)).toBe(over?-1:1);
  const inset=v.container.querySelector<SVGGElement>('.cd-triangle[data-kind=schematic]')!;
  const label=inset.querySelector<SVGTextElement>('.cd-angle')!;
  expect(label.textContent).toBe(over?'π − α':'α');
  if(width===390)expect(inset.querySelector('.cd-triangle-note')?.textContent).toBe('Not to scale');
  // The longer supplement label must clear the triangle’s three strokes too.
  if(over)await waitFor(()=>{
   const path=inset.querySelector<SVGPathElement>('path')!,matrix=path.getScreenCTM()!,box=label.getBoundingClientRect();
   expect(path.getBBox().x + path.getBBox().width).toBeLessThan(668);
   expect(getComputedStyle(inset.querySelector('.cd-triangle-note')!).opacity).not.toBe('0');
   for(let i=0;i<=120;i++){
    const p=path.getPointAtLength(path.getTotalLength()*i/120),q=new DOMPoint(p.x,p.y).matrixTransform(matrix);
    expect(q.x>box.left&&q.x<box.right&&q.y>box.top&&q.y<box.bottom,'The supplementary angle label must clear the triangle strokes').toBe(false);
   }
  });
 }
},20000);
