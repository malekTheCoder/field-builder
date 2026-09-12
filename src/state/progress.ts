import type {Params,Problem} from '../problems/types';
import {DEFAULT_PARAMS} from '../problems/types';
import {getProblem} from '../problems/definitions';
import {PROBLEM_IDS} from '../distributions';
export type LessonState={stage:number;answers:Record<string,string>;completed:number[];assisted:number[];hinted:number[];params:Params;boundRange:[number,number];worked:number;done:boolean};
export type ProgressData={version:1;current:string;level:1|2|3;path:string;dark:boolean;seenIntro:boolean;lessons:Record<string,LessonState>};
export function freshLesson():LessonState{return{stage:0,answers:{},completed:[],assisted:[],hinted:[],params:{...DEFAULT_PARAMS},boundRange:[20,80],worked:0,done:false};}
export function freshProgress():ProgressData{return{version:1,current:'bisector',level:1,path:'angular',dark:false,seenIntro:false,lessons:{}};}
export const STORAGE_KEY='field-builder:v1';
export const PROGRESS_KIND='field-builder-progress';
export const PROGRESS_FILE='field-builder-progress.json';
const problemIds=new Set<string>(PROBLEM_IDS);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clamp=(value:unknown,fallback:number,min:number,max:number,integer=false)=>{const n=typeof value==='number'&&Number.isFinite(value)?value:fallback;return Math.max(min,Math.min(max,integer?Math.floor(n):n));};
const stages=(value:unknown,n:number)=>Array.isArray(value)?[...new Set(value.filter((x):x is number=>Number.isInteger(x)&&x>=0&&x<n))]:[];
const idle=JSON.stringify(freshLesson());
/** The wizard keys a lesson as `id`, `id:level` or `id:level:path`; the id must be a known problem. */
export const lessonKey=(id:string,level:number,path:string)=>id+':'+level+(id==='infinite'?':'+path:'');
function readLesson(key:string,v:unknown):LessonState|undefined{
 const [id,,path]=key.split(':');
 // An old save always carried answers and a completed list; a new one carries only its place.
 // Either may be absent, but a field that is present and the wrong shape marks garbage.
 if(!problemIds.has(id)||!record(v)||('answers' in v&&!record(v.answers))||('completed' in v&&!Array.isArray(v.completed)))return;
 const n=getProblem(id,path).steps.length;
 const l=freshLesson();l.stage=clamp(v.stage,0,0,n-1,true);l.answers=record(v.answers)?Object.fromEntries(Object.entries(v.answers).filter(([,a])=>typeof a==='string')) as Record<string,string>:{};
 l.completed=stages(v.completed,n);l.assisted=stages(v.assisted,n);l.hinted=stages(v.hinted,n);l.done=v.done===true&&l.completed.length===n;l.worked=clamp(v.worked,0,0,10,true);
 if(record(v.params)){
  const ranges:Record<keyof Params,[number,number]>={distance:[.5,6],size:[1,8],charge:[-5,5],phi:[.2,2*Math.PI],element:[0,1],slices:[3,25],continuum:[0,1]};
  for(const key of Object.keys(ranges) as (keyof Params)[])l.params[key]=clamp(v.params[key],l.params[key],...ranges[key],key==='slices');
 }
 if(Array.isArray(v.boundRange)&&v.boundRange.length===2)l.boundRange=[clamp(v.boundRange[0],20,0,100),clamp(v.boundRange[1],80,0,100)];
 return l;
}
function readLessons(value:unknown){const lessons:Record<string,LessonState>={};if(record(value))for(const [key,v] of Object.entries(value)){const l=readLesson(key,v);if(l)lessons[key]=l;}return lessons;}
export function loadProgress(raw:string|null):ProgressData {
 try{
  const data=JSON.parse(raw??'null');if(!record(data)||data.version!==1||!record(data.lessons))return freshProgress();
  const output=freshProgress();output.current=typeof data.current==='string'&&problemIds.has(data.current)?data.current:'bisector';
  output.level=data.level===2||data.level===3?data.level:1;output.path=data.path==='limit'?'limit':'angular';output.dark=data.dark===true;output.seenIntro=data.seenIntro===true;output.lessons=readLessons(data.lessons);
  return output;
 }catch{return freshProgress();}
}
function isProgressFile(data:unknown):data is Record<string,unknown>{
 if(!record(data))return false;if(data.kind!=null&&data.kind!==PROGRESS_KIND)return false;if(data.version!=null&&data.version!==1)return false;
 if(data.kind===PROGRESS_KIND)return data.lessons==null||record(data.lessons);return data.version===1&&record(data.lessons);
}
/** Pretty JSON a student can move between Chromebooks. Idle lessons, theme, and unknown fields stay off the file. */
export function exportProgress(data:ProgressData):string{
 const lessons:Record<string,LessonState>={};for(const [key,l] of Object.entries(data.lessons)){const clean=readLesson(key,l);if(clean&&JSON.stringify(clean)!==idle)lessons[key]=clean;}
 return JSON.stringify({kind:PROGRESS_KIND,version:1,current:data.current,level:data.level,path:data.path,lessons},null,2);
}
export type ProgressImport={ok:boolean;data:ProgressData;imported:number};
/** Merge by lesson key. A bad file or bad sibling leaves every local lesson in place. */
export function importProgress(raw:string,existing:ProgressData):ProgressImport{
 try{
  const data=JSON.parse(raw.replace(/^\uFEFF/,''));if(!isProgressFile(data))return{ok:false,data:existing,imported:0};
  const incoming=readLessons(data.lessons??{});const next:ProgressData={...existing,lessons:{...existing.lessons,...incoming}};
  if(typeof data.current==='string'&&problemIds.has(data.current))next.current=data.current;
  if(data.level===1||data.level===2||data.level===3)next.level=data.level;if(data.path==='limit'||data.path==='angular')next.path=data.path;
  return{ok:true,data:next,imported:Object.keys(incoming).length};
 }catch{return{ok:false,data:existing,imported:0};}
}
export function downloadProgress(json:string,filename=PROGRESS_FILE){
 const blob=new Blob([json],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');
 a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
export function expectedAnswers(p:Problem):Record<string,string>{const answers:Record<string,string>={origin:p.origin,symmetry:p.symmetry.answer,axis:p.symmetry.axis,lower:p.bounds[0],upper:p.bounds[1],limit:p.limits[0].answer};p.steps.forEach(s=>s.fields?.forEach(f=>answers[f.id]=f.expected));return answers;}
