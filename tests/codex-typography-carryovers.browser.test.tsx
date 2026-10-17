import 'katex/dist/katex.min.css';
import '../app/globals.css';
import '@fontsource-variable/hanken-grotesk';
import '../src/static-fonts.css';
import {cleanup,render} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {userEvent} from 'vitest/browser';
import {EquationWorkbench} from '../src/components/EquationWorkbench';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {artifactHtml,lessonArtifact} from '../src/state/artifact';
afterEach(cleanup);

it('the shell’s sum and integral stay on one line at narrow board widths, including keyboard and pointer activation',async()=>{
 for(const width of [322,342,358]){
  const onStep=vi.fn();
  const r=render(<div style={{width}}><EquationWorkbench problem={getProblem('shell')} params={DEFAULT_PARAMS} onModeChange={()=>{}} boundRange={[0,100]} onBoundRangeChange={()=>{}} onStep={onStep}/></div>);
  await document.fonts.ready;
  const step=r.container.querySelector<HTMLElement>('.db-step[data-step="limit"]')!;
  const terms=[...step.querySelectorAll<HTMLElement>('.db-where .katex-html .mop')];
  const sum=terms.find(el=>el.textContent?.includes('∑'))!,integral=terms.find(el=>el.textContent==='∫')!;
  expect(sum,`${width}: sum`).toBeDefined();expect(integral,`${width}: integral`).toBeDefined();
  const a=sum.getBoundingClientRect(),b=integral.getBoundingClientRect();
  // The two operators share a line; a broken relation puts their centres a full line apart.
  expect(Math.abs((a.top+a.bottom-b.top-b.bottom)/2),`${width}: sum-to-integral relation wraps`).toBeLessThan(10);
  for(const el of step.querySelectorAll<HTMLElement>('.db-where .math'))expect(el.scrollWidth,`${width}: clipped replacement`).toBeLessThanOrEqual(el.clientWidth+1);
  const button=r.getByRole('button',{name:'Shrink them: play this step on the figure'});
  button.focus();await userEvent.keyboard('{Enter}');expect(onStep).toHaveBeenLastCalledWith(4);
  await userEvent.click(step.querySelector('.fx-element')!);expect(onStep).toHaveBeenCalledTimes(2);
  cleanup();
 }
},20000);

it('offline Checks give Latin symbols the equation’s face while preserving words',async()=>{
 const frame=document.createElement('iframe');frame.srcdoc=artifactHtml(lessonArtifact(getProblem('shell')));document.body.appendChild(frame);
 try{
  await new Promise(r=>frame.addEventListener('load',r,{once:true}));const doc=frame.contentDocument!;await doc.fonts.ready;
  const paras=[...doc.querySelectorAll('.check p')];const symbols=paras.flatMap(p=>[...p.querySelectorAll<HTMLElement>('.g')]);
  for(const token of ['kQ','z²','z','R','P'])expect(symbols.some(s=>s.textContent===token),`${token} should use the mathematical face`).toBe(true);
  expect(symbols.some(s=>s.textContent==='a')).toBe(false);
  for(const symbol of symbols){expect(getComputedStyle(symbol).fontFamily).toContain('Math');if(!symbol.classList.contains('up'))expect(getComputedStyle(symbol).fontStyle).toBe('italic');}
  expect(paras[0].textContent).toContain('Most charges look like a point charge');
 }finally{frame.remove();}
},15000);
