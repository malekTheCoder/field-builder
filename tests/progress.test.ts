import {describe,it,expect} from 'vitest';
import katex from 'katex';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import {expectedAnswers,gradeStage,freshLesson,freshProgress,loadProgress,mastery} from '../src/state/progress';
const cases=[...PROBLEMS,getProblem('infinite','limit')];
describe('complete practice grading',()=>{
 for(const p of cases)it(`${p.id}/${p.variable}: all correct stages grade successfully`,()=>{
  const answers=expectedAnswers(p);for(let stage=0;stage<8;stage++)expect(gradeStage(p,stage,answers).ok,`${stage}: ${gradeStage(p,stage,answers).text}`).toBe(true);
  for(let i=0;i<p.limits.length;i++)expect(gradeStage(p,7,{...answers,limit:p.limits[i].answer},i).ok).toBe(true);
 });
 for(const p of cases)it(`${p.id}/${p.variable}: reversed and missing bounds receive feedback`,()=>{
  const answers=expectedAnswers(p),reversed=gradeStage(p,5,{...answers,lower:p.bounds[1],upper:p.bounds[0]});expect(reversed.ok).toBe(false);expect(reversed.text).toContain('backwards');
  expect(gradeStage(p,5,{...answers,lower:''}).ok).toBe(false);
 });
 it('requires both surviving semi-infinite components and angular Jacobian',()=>{
  const p=getProblem('semi');expect(gradeStage(p,6,{...expectedAnswers(p),result2:'0'}).fieldId).toBe('result2');
  const inf=getProblem('infinite');expect(gradeStage(inf,4,{...expectedAnswers(inf),jacobian:'r'}).fieldId).toBe('jacobian');
 });
 it('returns a helpful failure for stale stage and limit indexes',()=>{
  expect(gradeStage(PROBLEMS[0],9,{}).ok).toBe(false);expect(gradeStage(PROBLEMS[0],7,{},99).ok).toBe(false);
 });
});
describe('formula content integrity',()=>{
 for(const p of cases)it(`${p.id}/${p.variable}: every displayed formula renders without control characters`,()=>{
  const tex=[p.variableTex,p.densityTex,p.dqTex,p.kernelTex,p.integralTex,p.resultTex,...p.secondaryResultTex?[p.secondaryResultTex]:[],...p.boundTex,p.symmetry.tex,...p.limits.map(l=>l.formula),...p.steps.flatMap(s=>[...s.fields?.map(f=>f.tex)??[],...s.worked?.map(w=>w.tex)??[]])];
  for(const formula of tex){for(let index=0;index<formula.length;index++)expect(formula.charCodeAt(index)).toBeGreaterThanOrEqual(32);expect(()=>katex.renderToString(formula,{throwOnError:true,strict:'error'}),formula).not.toThrow();}
 });
 it('preserves actual TeX commands for angles, bounds, and symmetry',()=>{
  expect(getProblem('ring').variableTex).toBe(String.raw`\theta`);expect(getProblem('ring').boundTex[1]).toBe(String.raw`2\pi`);
  expect(getProblem('sheet').boundTex[1]).toBe(String.raw`\infty`);expect(getProblem('axial').symmetry.tex).toContain(String.raw`\quad`);
 });
});
describe('saved progress survives reload and malformed storage',()=>{
 it('roundtrips valid completed progress',()=>{
  const p=freshProgress(),lesson=freshLesson();lesson.completed=[0,1,2,3,4,5,6,7];lesson.done=true;lesson.params.charge=-2;p.lessons.arc=lesson;p.current='arc';p.level=3;p.seenIntro=true;expect(loadProgress(JSON.stringify(p))).toEqual(p);expect(mastery(lesson)).toBe(100);
 });
 it('does not turn duplicate completion entries into mastery',()=>{
  const p=freshProgress();p.lessons.bisector={...freshLesson(),completed:[0,0,0,0,0,0,0,0],done:true};const saved=loadProgress(JSON.stringify(p));expect(saved.lessons.bisector.completed).toEqual([0]);expect(saved.lessons.bisector.done).toBe(false);
 });
 it('sanitizes invalid ids, values, indexes and parameter ranges',()=>{
  const raw={...freshProgress(),current:'garbage',lessons:{unknown:freshLesson(),ring:{...freshLesson(),stage:3.8,completed:[0,7,-1,8,1.5],assisted:[-1,2.5,3,3],params:{distance:1e9,size:-5,charge:-99,slices:3.8,element:2},answers:{result:'x',bad:9}}}};
  const saved=loadProgress(JSON.stringify(raw));expect(saved.current).toBe('bisector');expect(saved.lessons.unknown).toBeUndefined();expect(saved.lessons.ring.stage).toBe(3);expect(saved.lessons.ring.assisted).toEqual([3]);expect(saved.lessons.ring.params).toMatchObject({distance:6,size:1,charge:-5,slices:3,element:1});expect(saved.lessons.ring.answers).toEqual({result:'x'});
 });
 for(const raw of [null,'invalid','null','[]','{"version":1,"lessons":null}','{"version":1,"lessons":[]}'])it(`falls back for ${raw}`,()=>{expect(loadProgress(raw)).toEqual(freshProgress());});
 it('ignores one malformed lesson without discarding valid siblings',()=>{
  const raw={...freshProgress(),lessons:{bisector:{answers:null,completed:[]},ring:freshLesson()}};expect(loadProgress(JSON.stringify(raw)).lessons).toEqual({ring:freshLesson()});
 });
});
