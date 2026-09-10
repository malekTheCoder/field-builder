import {cleanup,render,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import FieldBuilder from '../src/wizard/FieldBuilder';
import {exportProgress,freshLesson,freshProgress,PROGRESS_FILE,STORAGE_KEY} from '../src/state/progress';

afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState(null,'','/');});

const done=()=>({...freshLesson(),completed:[0,1,2,3,4,5,6,7],done:true,answers:{origin:'At the center of the rod'}});

describe('lesson progress transfer',()=>{
 it('downloads a JSON progress file from the explorer header',async()=>{
  localStorage.setItem('field-builder:explorer:v1',JSON.stringify({id:'bisector',seen:true,dark:false,sidebarOpen:true,params:{}}));
  const saved=freshProgress();saved.lessons['ring:1']=done();localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
  const {findByRole,getByRole}=render(<Explorer/>);expect(await findByRole('heading',{name:/A line of charge/})).toBeTruthy();
  const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:field-builder-progress');const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  const names:string[]=[];const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){names.push(this.download);});
  try{
   await userEvent.click(getByRole('button',{name:'Export lesson progress'}));
   await waitFor(()=>expect(names[0]).toBe(PROGRESS_FILE));
   const blob=create.mock.calls[0][0] as Blob;expect(blob.type).toContain('application/json');
   const parsed=JSON.parse(await blob.text());expect(parsed.kind).toBe('field-builder-progress');expect(parsed.lessons['ring:1'].done).toBe(true);expect(revoke).toHaveBeenCalled();
  }finally{click.mockRestore();create.mockRestore();revoke.mockRestore();}
 });
 it('imports a progress file in the wizard without wiping a lesson already on this device',async()=>{
  const local=freshProgress();local.lessons['ring:1']=done();localStorage.setItem(STORAGE_KEY,JSON.stringify(local));
  const {findByRole,container}=render(<FieldBuilder initialProblem="bisector"/>);
  expect(await findByRole('heading',{name:/A line of charge/})).toBeTruthy();
  await waitFor(()=>expect(container.textContent).toMatch(/1 of 15 lessons completed/));
  const incoming=freshProgress();incoming.lessons['bisector:1']=done();incoming.current='bisector';
  const input=container.querySelector('input[type="file"]') as HTMLInputElement;
  await userEvent.upload(input,new File([exportProgress(incoming)],'progress.json',{type:'application/json'}));
  await waitFor(()=>expect(container.textContent).toMatch(/2 of 15 lessons completed/));
  expect(container.querySelector('output.sr-only')?.textContent).toMatch(/Imported 1 lesson/);
 });
 it('leaves wizard progress in place when the chosen file is not progress JSON',async()=>{
  const local=freshProgress();local.lessons['ring:1']=done();localStorage.setItem(STORAGE_KEY,JSON.stringify(local));
  const {findByRole,container}=render(<FieldBuilder initialProblem="bisector"/>);
  expect(await findByRole('heading',{name:/A line of charge/})).toBeTruthy();
  await waitFor(()=>expect(container.textContent).toMatch(/1 of 15 lessons completed/));
  const input=container.querySelector('input[type="file"]') as HTMLInputElement;
  await userEvent.upload(input,new File(['<html>offline copy</html>'],'field-builder-ring.html',{type:'text/html'}));
  await waitFor(()=>expect(container.querySelector('output.sr-only')?.textContent).toMatch(/unchanged/));
  expect(container.textContent).toMatch(/1 of 15 lessons completed/);
 });
});
