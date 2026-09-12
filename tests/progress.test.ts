import {describe,it,expect} from 'vitest';
import katex from 'katex';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import {freshLesson,freshProgress,loadProgress,exportProgress,importProgress,PROGRESS_KIND} from '../src/state/progress';
const cases=[...PROBLEMS,getProblem('infinite','limit')];
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
  const p=freshProgress(),lesson=freshLesson();lesson.completed=[0,1,2,3,4,5,6,7];lesson.done=true;lesson.params.charge=-2;p.lessons.arc=lesson;p.current='arc';p.level=3;p.seenIntro=true;expect(loadProgress(JSON.stringify(p))).toEqual(p);
 });
 it('keeps the lessons the wizard actually saves, keyed by id, level and derivation path',()=>{
  // The wizard writes `bisector:2` and `infinite:1:limit`, never a bare id. Dropping those on reload silently discarded every student's progress.
  const p=freshProgress(),done={...freshLesson(),completed:[0,1,2,3,4,5,6,7],done:true};
  p.lessons['bisector:2']=done;p.lessons['infinite:1:limit']={...freshLesson(),stage:4,completed:[0,1,2,3]};p.lessons['garbage:1']=done;p.lessons['ring:9:nonsense']=freshLesson();
  const saved=loadProgress(JSON.stringify(p));
  expect(saved.lessons['bisector:2']).toEqual(done);expect(saved.lessons['infinite:1:limit'].stage).toBe(4);expect(saved.lessons['garbage:1']).toBeUndefined();expect(saved.lessons['ring:9:nonsense']).toEqual(freshLesson());
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
describe('progress export and import between devices',()=>{
 const done=()=>({...freshLesson(),completed:[0,1,2,3,4,5,6,7],done:true,answers:{origin:'At the center of the rod'}});
 it('writes a short readable file without theme, intro flags, idle lessons, or extra keys',()=>{
  const p=freshProgress();p.dark=true;p.seenIntro=true;p.current='ring';p.level=2;p.lessons['ring:2']=done();p.lessons['bisector:1']=freshLesson();
  const parsed=JSON.parse(exportProgress(p));expect(parsed.kind).toBe(PROGRESS_KIND);expect(Object.keys(parsed).sort()).toEqual(['current','kind','lessons','level','path','version']);
  expect(parsed.dark).toBeUndefined();expect(parsed.seenIntro).toBeUndefined();expect(parsed.lessons['ring:2'].done).toBe(true);expect(parsed.lessons['bisector:1']).toBeUndefined();
  expect(exportProgress(p)).toContain('\n  ');expect(parsed.version).toBe(1);expect(JSON.stringify(parsed)).not.toMatch(/apiKey|token|password/);
 });
 it('round-trips worked lessons through export then import',()=>{
  const p=freshProgress();p.current='arc';p.level=3;p.path='angular';p.lessons['arc:3']=done();p.lessons['infinite:1:limit']={...freshLesson(),stage:4,completed:[0,1,2,3]};
  const back=importProgress(exportProgress(p),freshProgress());expect(back.ok).toBe(true);expect(back.imported).toBe(2);
  expect(back.data.current).toBe('arc');expect(back.data.level).toBe(3);expect(back.data.lessons['arc:3']).toEqual(p.lessons['arc:3']);expect(back.data.lessons['infinite:1:limit'].stage).toBe(4);
 });
 it('merges by lesson key and leaves unrelated local lessons in place',()=>{
  const local=freshProgress();local.dark=true;local.seenIntro=true;local.current='bisector';local.lessons['ring:1']=done();local.lessons['bisector:1']={...freshLesson(),stage:2,completed:[0,1]};
  const incoming=freshProgress();incoming.current='arc';incoming.level=2;incoming.dark=false;incoming.lessons['arc:2']=done();incoming.lessons['bisector:1']=done();
  const file=exportProgress(incoming);const result=importProgress(file,local);
  expect(result.ok).toBe(true);expect(result.data.lessons['ring:1']).toEqual(local.lessons['ring:1']);expect(result.data.lessons['arc:2'].done).toBe(true);
  expect(result.data.lessons['bisector:1'].done).toBe(true);expect(result.data.current).toBe('arc');expect(result.data.level).toBe(2);expect(result.data.dark).toBe(true);expect(result.data.seenIntro).toBe(true);
 });
 it('drops secrets and unknown fields from a hand-edited file',()=>{
  const local=freshProgress();local.lessons['ring:1']=done();
  const raw=JSON.stringify({kind:PROGRESS_KIND,version:1,apiKey:'sk-live-secret',token:'ghp_secret',current:'bisector',lessons:{'bisector:1':{...done(),password:'hunter2',answers:{origin:'At the center of the rod',note:12}},'garbage:1':done()}});
  const result=importProgress(raw,local);expect(result.ok).toBe(true);expect(JSON.stringify(result.data)).not.toMatch(/sk-live-secret|ghp_secret|hunter2/);
  expect(result.data.lessons['ring:1']).toEqual(local.lessons['ring:1']);expect(result.data.lessons['bisector:1'].answers).toEqual({origin:'At the center of the rod'});expect(result.data.lessons['garbage:1']).toBeUndefined();
 });
 it('keeps every local lesson when the file is malformed, the wrong kind, or a printable HTML copy',()=>{
  const local=freshProgress();local.lessons['ring:1']=done();local.current='ring';
  for(const raw of ['not-json','<html>lesson copy</html>','[]','null','{"version":2,"lessons":{}}','{"kind":"other","version":1,"lessons":{"bisector:1":{"done":true}}}','{"version":1,"lessons":null}','{"version":1,"lessons":[]}']){
   const result=importProgress(raw,local);expect(result.ok,raw).toBe(false);expect(result.imported).toBe(0);expect(result.data).toEqual(local);
  }
 });
 it('imports valid siblings from a file that also contains a broken lesson',()=>{
  const local=freshProgress();local.lessons['ring:1']=done();
  const raw=JSON.stringify({kind:PROGRESS_KIND,version:1,lessons:{bisector:{answers:null,completed:[]},'arc:1':done(),'unknown:1':done()}});
  const result=importProgress(raw,local);expect(result.ok).toBe(true);expect(result.imported).toBe(1);expect(result.data.lessons['ring:1']).toEqual(local.lessons['ring:1']);expect(result.data.lessons['arc:1'].done).toBe(true);expect(result.data.lessons.bisector).toBeUndefined();
 });
 it('accepts a raw localStorage dump and ignores a leading BOM',()=>{
  const dump=freshProgress();dump.lessons['v-ring:1']=done();dump.current='v-ring';
  const result=importProgress('\uFEFF'+JSON.stringify(dump),freshProgress());expect(result.ok).toBe(true);expect(result.data.lessons['v-ring:1'].done).toBe(true);expect(result.data.current).toBe('v-ring');
 });
 it('does not wipe local lessons when the file is valid but empty',()=>{
  const local=freshProgress();local.lessons['ring:1']=done();
  const result=importProgress(JSON.stringify({kind:PROGRESS_KIND,version:1,lessons:{}}),local);expect(result.ok).toBe(true);expect(result.imported).toBe(0);expect(result.data.lessons['ring:1']).toEqual(local.lessons['ring:1']);
 });
});
