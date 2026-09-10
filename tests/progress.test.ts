import {describe,it,expect} from 'vitest';
import katex from 'katex';
import {PROBLEMS,getProblem} from '../src/problems/definitions';
import {stageOf} from '../src/problems/types';
import {expectedAnswers,gradeStage,freshLesson,freshProgress,loadProgress,mastery} from '../src/state/progress';
const cases=[...PROBLEMS,getProblem('infinite','limit')];
describe('complete practice grading',()=>{
 for(const p of cases)it(`${p.id}/${p.variable}: all correct stages grade successfully`,()=>{
  const answers=expectedAnswers(p),limits=stageOf(p,'limits');
  for(let stage=0;stage<p.steps.length;stage++)expect(gradeStage(p,stage,answers).ok,`${stage}: ${gradeStage(p,stage,answers).text}`).toBe(true);
  for(let i=0;i<p.limits.length;i++)expect(gradeStage(p,limits,{...answers,limit:p.limits[i].answer},i).ok).toBe(true);
 });
 for(const p of cases)it(`${p.id}/${p.variable}: reversed and missing bounds receive feedback`,()=>{
  const answers=expectedAnswers(p),b=stageOf(p,'bounds'),reversed=gradeStage(p,b,{...answers,lower:p.bounds[1],upper:p.bounds[0]});expect(reversed.ok).toBe(false);expect(reversed.text).toContain('backwards');
  expect(gradeStage(p,b,{...answers,lower:''}).ok).toBe(false);
 });
 it('requires both surviving semi-infinite components and angular Jacobian',()=>{
  const p=getProblem('semi');expect(gradeStage(p,6,{...expectedAnswers(p),result2:'0'}).fieldId).toBe('result2');
  const inf=getProblem('infinite');expect(gradeStage(inf,4,{...expectedAnswers(inf),jacobian:'r'}).fieldId).toBe('jacobian');
 });
 it('diagnoses each ramp-rod misconception with its own message, in any spelling',()=>{
  const p=getProblem('ramp'),ok=expectedAnswers(p);
  const peak=gradeStage(p,1,{...ok,dq:'λ₀ dy'});expect(peak.ok).toBe(false);expect(peak.fieldId).toBe('dq');expect(peak.text).toContain('density at the far end only');
  const units=gradeStage(p,1,{...ok,dq:String.raw`Q\frac{y}{L}dy`});expect(units.ok).toBe(false);expect(units.text).toContain('λ₀L/2');
  const uniform=gradeStage(p,4,{...ok,kernel:'k*lambda0*r/(y^2+r^2)^(3/2)'});expect(uniform.ok).toBe(false);expect(uniform.text).toContain('uniform rod');
  const sign=gradeStage(p,4,{...ok,kernel2:'k*lambda0*y^2/(L*(y^2+r^2)^(3/2))'});expect(sign.ok).toBe(false);expect(sign.text).toContain('downward');
  const sameQ=gradeStage(p,6,{...ok,result:'k*Q/(r*sqrt(r^2+L^2))'});expect(sameQ.ok).toBe(false);expect(sameQ.text).toContain('same total charge');
  const twice=gradeStage(p,6,{...ok,result:'k*lambda0*L/(r*sqrt(r^2+L^2))'});expect(twice.ok).toBe(false);expect(twice.text).toContain('λ₀L/2');
  const imported=gradeStage(p,3,{...ok,symmetry:'The y-components cancel'});expect(imported.ok).toBe(false);expect(imported.text).toContain('both conditions fail');
  // Q is the grader's alias for λ₀L/2 here, so the correct answer survives being written through Q.
  expect(gradeStage(p,6,{...ok,result:'2*k*Q/L^2*(1-r/sqrt(L^2+r^2))'}).ok).toBe(true);
  expect(gradeStage(p,6,{...ok,result2:String.raw`-\frac{k\lambda_0}{L}\left(\ln\frac{L+\sqrt{L^2+r^2}}{r}-\frac{L}{\sqrt{L^2+r^2}}\right)`}).ok).toBe(true);
 });
 it('returns a helpful failure for stale stage and limit indexes',()=>{
  expect(gradeStage(PROBLEMS[0],9,{}).ok).toBe(false);expect(gradeStage(PROBLEMS[0],stageOf(PROBLEMS[0],'limits'),{},99).ok).toBe(false);
 });
 it('diagnoses the ring-potential misconceptions: 1/r², the field integrand, and E=0 implying V=0',()=>{
  const p=getProblem('v-ring'),ok=expectedAnswers(p);
  const coulomb=gradeStage(p,stageOf(p,'contribution'),{...ok,field:'k*dQ/ri^2'});expect(coulomb.ok).toBe(false);expect(coulomb.text).toContain('1/r²');
  const kernel=gradeStage(p,stageOf(p,'variable'),{...ok,kernel:'k*lambda*R*z/(R^2+z^2)^(3/2)'});expect(kernel.ok).toBe(false);expect(kernel.text).toContain('projection');
  const centre=gradeStage(p,stageOf(p,'integrate'),{...ok,result:'0'});expect(centre.ok).toBe(false);expect(centre.text).toContain('flat');
  const sign=gradeStage(p,stageOf(p,'gradient'),{...ok,gradient:'-k*Q*z/(R^2+z^2)^(3/2)'});expect(sign.ok).toBe(false);expect(sign.text).toContain('minus');
 });
 it('the remaining potential lessons reject the matching field integrand and a sign or log mistake',()=>{
  const p=getProblem('v-arc'),ok=expectedAnswers(p);
  const field=gradeStage(p,stageOf(p,'integrate'),{...ok,result:'-2*k*lambda*sin(phi/2)/R'});expect(field.ok).toBe(false);expect(field.text).toContain('opening angle');
  const zero=gradeStage(p,stageOf(p,'integrate'),{...ok,result:'0'});expect(zero.ok).toBe(false);expect(zero.text).toContain('flat');
  const cosine=gradeStage(p,stageOf(p,'variable'),{...ok,kernel:'-k*lambda*cos(theta)/R'});expect(cosine.ok).toBe(false);expect(cosine.text).toContain('cosine');
  const disk=getProblem('v-disk'),diskOk=expectedAnswers(disk);
  const diskKernel=gradeStage(disk,stageOf(disk,'variable'),{...diskOk,kernel:'k*z*sigma*2*pi*s/(s^2+z^2)^(3/2)'});expect(diskKernel.ok).toBe(false);expect(diskKernel.text).toContain('field integrand');
  const sheet=gradeStage(disk,stageOf(disk,'integrate'),{...diskOk,result:'sigma/(2*eps0)'});expect(sheet.ok).toBe(false);expect(sheet.text).toContain('diverges');
  const rod=getProblem('v-rod-bisector'),rodOk=expectedAnswers(rod);
  const rodKernel=gradeStage(rod,stageOf(rod,'variable'),{...rodOk,kernel:'k*lambda*r/(y^2+r^2)^(3/2)'});expect(rodKernel.ok).toBe(false);expect(rodKernel.text).toContain('projection');
  const half=gradeStage(rod,stageOf(rod,'integrate'),{...rodOk,result:'k*lambda*log((L/2+sqrt(L^2/4+r^2))/r)'});expect(half.ok).toBe(false);expect(half.text).toContain('half');
  const axial=getProblem('v-rod-axial'),axialOk=expectedAnswers(axial);
  const minus=gradeStage(axial,stageOf(axial,'integrate'),{...axialOk,result:'k*lambda*log(a/(a+L))'});expect(minus.ok).toBe(false);expect(minus.text).toContain('positive rod');
  const length=gradeStage(axial,stageOf(axial,'integrate'),{...axialOk,result:'k*lambda*log(a+L)'});expect(length.ok).toBe(false);expect(length.text).toContain('pure number');
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
 it('keeps the lessons the wizard actually saves, keyed by id, level and derivation path',()=>{
  // The wizard writes `bisector:2` and `infinite:1:limit`, never a bare id. Dropping those on reload silently discarded every student's progress.
  const p=freshProgress(),done={...freshLesson(),completed:[0,1,2,3,4,5,6,7],done:true};
  p.lessons['bisector:2']=done;p.lessons['infinite:1:limit']={...freshLesson(),stage:4,completed:[0,1,2,3]};p.lessons['garbage:1']=done;p.lessons['ring:9:nonsense']=freshLesson();
  const saved=loadProgress(JSON.stringify(p));
  expect(saved.lessons['bisector:2']).toEqual(done);expect(saved.lessons['infinite:1:limit'].stage).toBe(4);expect(saved.lessons['garbage:1']).toBeUndefined();expect(saved.lessons['ring:9:nonsense']).toEqual(freshLesson());
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
