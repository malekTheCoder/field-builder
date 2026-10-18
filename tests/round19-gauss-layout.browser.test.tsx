import {cleanup,fireEvent,render} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {QencInstrument} from '../src/gauss/QencInstrument';
import {FluxInstrument} from '../src/gauss/FluxInstrument';
afterEach(cleanup);
for(const sign of[1,-1]as const)it(`keeps density curve names separate at maximum phone symbol size, sign ${sign}`,()=>{
 const v=render(<QencInstrument sign={sign}/>);
 for(const profile of['Uniform','Rising with r','Falling to zero']){
  fireEvent.click(v.getByRole('button',{name:profile}));
  const boxes=[...v.container.querySelectorAll<SVGTextElement>('.gs-rho-name,.gs-dq-name')].map(t=>{
   t.style.fontSize=`${17.5*2.2}px`;t.style.fontFamily='Georgia, serif';t.style.fontStyle='italic';return t.getBBox();
  });
  const[a,b]=boxes,dx=Math.max(a.x-b.x-b.width,b.x-a.x-a.width),dy=Math.max(a.y-b.y-b.height,b.y-a.y-a.height);
  expect(Math.max(dx,dy),profile).toBeGreaterThan(6);
 }
});
it('contains the full surface range and flow ticks with one stable scale',()=>{
 const v=render(<FluxInstrument/>);fireEvent.click(v.getByRole('tab',{name:'A closed surface'}));
 const svg=v.container.querySelector<SVGSVGElement>('.gs-closed-svg')!,extent=svg.viewBox.baseVal;
 const at=v.container.querySelector('.gs-q')!.getAttribute('transform');
 for(const key of['End','Home']){
  fireEvent.keyDown(v.getByRole('slider',{name:'Size of the surface'}),{key});
  const b=v.container.querySelector<SVGGraphicsElement>('.gs-blob')!.getBBox();
  expect(b.y).toBeGreaterThan(13);expect(b.y+b.height).toBeLessThan(extent.height-13);
  expect(v.container.querySelector('.gs-q')!.getAttribute('transform')).toBe(at);
  for(const flow of v.container.querySelectorAll<SVGGraphicsElement>('.gs-flow > g')){
   const f=flow.getBBox();expect(f.y).toBeGreaterThan(0);expect(f.y+f.height).toBeLessThan(extent.height);
  }
 }
 // Charges remain inside the viewport, including their names, at every keyboard drag corner.
 const charge=v.getByRole('button',{name:/^q₁,/});
 for(const [horizontal,vertical]of[['ArrowLeft','ArrowUp'],['ArrowRight','ArrowDown']]){
  for(let i=0;i<20;i++){fireEvent.keyDown(charge,{key:horizontal,shiftKey:true});fireEvent.keyDown(charge,{key:vertical,shiftKey:true});}
  const text=charge.querySelector<SVGTextElement>('.gs-q-name')!;text.style.fontSize=`${17*2.2}px`;text.style.fontFamily='Georgia, serif';
  const b=charge.getBoundingClientRect(),s=svg.getBoundingClientRect();
  expect(b.left).toBeGreaterThanOrEqual(s.left);expect(b.right).toBeLessThanOrEqual(s.right);
  expect(b.top).toBeGreaterThanOrEqual(s.top);expect(b.bottom).toBeLessThanOrEqual(s.bottom);
 }
},20000);
