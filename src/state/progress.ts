import type {Params,Problem} from '../problems/types';
import {DEFAULT_PARAMS} from '../problems/types';
import {getProblem} from '../problems/definitions';
import {PROBLEM_IDS} from '../distributions';
import {equivalent,feedback} from '../symbolic/equivalence';
export type LessonState={stage:number;answers:Record<string,string>;completed:number[];assisted:number[];hinted:number[];params:Params;boundRange:[number,number];worked:number;done:boolean};
export type ProgressData={version:1;current:string;level:1|2|3;path:string;dark:boolean;seenIntro:boolean;lessons:Record<string,LessonState>};
export function freshLesson():LessonState{return{stage:0,answers:{},completed:[],assisted:[],hinted:[],params:{...DEFAULT_PARAMS},boundRange:[20,80],worked:0,done:false};}
export function freshProgress():ProgressData{return{version:1,current:'bisector',level:1,path:'angular',dark:false,seenIntro:false,lessons:{}};}
export const STORAGE_KEY='field-builder:v1';
const problemIds=new Set<string>(PROBLEM_IDS);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clamp=(value:unknown,fallback:number,min:number,max:number,integer=false)=>{const n=typeof value==='number'&&Number.isFinite(value)?value:fallback;return Math.max(min,Math.min(max,integer?Math.floor(n):n));};
const stages=(value:unknown,n:number)=>Array.isArray(value)?[...new Set(value.filter((x):x is number=>Number.isInteger(x)&&x>=0&&x<n))]:[];
/** The wizard keys a lesson as `id`, `id:level` or `id:level:path`; the id must be a known problem. */
export const lessonKey=(id:string,level:number,path:string)=>id+':'+level+(id==='infinite'?':'+path:'');
export function loadProgress(raw:string|null):ProgressData {
 try{
  const data=JSON.parse(raw??'null');if(!record(data)||data.version!==1||!record(data.lessons))return freshProgress();
  const output=freshProgress();output.current=typeof data.current==='string'&&problemIds.has(data.current)?data.current:'bisector';
  output.level=data.level===2||data.level===3?data.level:1;output.path=data.path==='limit'?'limit':'angular';output.dark=data.dark===true;output.seenIntro=data.seenIntro===true;
  for(const [key,v] of Object.entries(data.lessons)){
   const [id,,path]=key.split(':');
   if(!problemIds.has(id)||!record(v)||!record(v.answers)||!Array.isArray(v.completed))continue;
   const n=getProblem(id,path).steps.length;
   const l=freshLesson();l.stage=clamp(v.stage,0,0,n-1,true);l.answers=Object.fromEntries(Object.entries(v.answers).filter(([,a])=>typeof a==='string')) as Record<string,string>;
   l.completed=stages(v.completed,n);l.assisted=stages(v.assisted,n);l.hinted=stages(v.hinted,n);l.done=v.done===true&&l.completed.length===n;l.worked=clamp(v.worked,0,0,10,true);
   if(record(v.params)){
    const ranges:Record<keyof Params,[number,number]>={distance:[.5,6],size:[1,8],charge:[-5,5],phi:[.2,2*Math.PI],element:[0,1],slices:[3,25],continuum:[0,1]};
    for(const key of Object.keys(ranges) as (keyof Params)[])l.params[key]=clamp(v.params[key],l.params[key],...ranges[key],key==='slices');
   }
   if(Array.isArray(v.boundRange)&&v.boundRange.length===2)l.boundRange=[clamp(v.boundRange[0],20,0,100),clamp(v.boundRange[1],80,0,100)];
   output.lessons[key]=l;
  }
  return output;
 }catch{return freshProgress();}
}
/** Points per step: the whole lesson is worth 100, a hinted step 72 % of its share, a revealed step 40 %. Eight steps give the 12.5 / 9 / 5 the wizard prints. */
export const points=(n:number)=>({full:100/n,hinted:72/n,assisted:40/n});
export function mastery(l:LessonState,n=8){const s=points(n);return Math.round(l.completed.reduce((sum,i)=>sum+(l.assisted.includes(i)?s.assisted:l.hinted.includes(i)?s.hinted:s.full),0));}
export type Grade={ok:boolean;text:string;highlight?:string;fieldId?:string};
export function gradeStage(p:Problem,stage:number,a:Record<string,string>,limitIndex=0):Grade {
 if(!Number.isInteger(stage)||stage<0||stage>=p.steps.length)return{ok:false,text:'Choose a valid practice step.'};
 const kind=p.steps[stage].kind;
 if(kind==='origin')return a.origin===p.origin?{ok:true,text:'A clear coordinate system. Now choose one element.'}:{ok:false,text:'That origin is valid, but changes the coordinate labels and bounds. Use the suggested origin for the coordinate convention in this lesson.',highlight:'origin'};
 if(kind==='symmetry'){if(a.symmetry!==p.symmetry.answer)return{ok:false,text:p.symmetry.text,highlight:'components'};if(a.axis!==p.symmetry.axis)return{ok:false,text:'Choose the reflection or pairing shown by the ghost element. '+p.symmetry.text,highlight:'components'};return{ok:true,text:p.symmetry.text};}
 if(kind==='bounds'){const [lo,hi]=p.bounds,g=p.geometry;if(equivalent(a.lower??'',hi,p).ok&&equivalent(a.upper??'',lo,p).ok)return{ok:false,text:'Those bounds run backwards. Reverse them to cover the charge in the positive coordinate direction; otherwise the integral changes sign.',highlight:'bounds'};if(!equivalent(a.lower??'',lo,p).ok||!equivalent(a.upper??'',hi,p).ok){const text=g==='ring'?'A full ring needs a complete revolution: 0 to 2π. 0 to π covers only half.':g==='disk'?'The ring element already includes its full circumference. Integrate its radius s from 0 to R, not to 2π or to the diameter 2R.':g==='arc'?'This arc extends from −φ/2 to +φ/2. Use its actual angular extent, not a full circle unless φ = 2π.':p.id==='infinite'&&p.variable==='theta'?'y = r tan θ maps the entire line to angles from −π/2 to +π/2.':g==='sheet'?'The sheet is built from complete rings. Their radii run from 0 to infinity.':'Match the highlighted brackets to the full distribution, using the chosen origin. '+(g==='bisector'?'The total length is L, so the ends are −L/2 and +L/2.':'');return{ok:false,text,highlight:'bounds'};}return{ok:true,text:'The limits cover every element exactly once.'};}
 if(kind==='limits'){const limit=p.limits[limitIndex];if(!limit)return{ok:false,text:'Choose a valid physical limit.'};return a.limit===limit.answer?{ok:true,text:limit.explanation}:{ok:false,text:limit.explanation,highlight:'limit'};}
 for(const f of p.steps[stage].fields??[]){const result=equivalent(a[f.id]??'',f.expected,p);if(!result.ok){const fb=feedback(a[f.id]??'',f,p);return{ok:false,text:result.error??fb.text,highlight:fb.highlight,fieldId:f.id};}}
 const scalar=p.quantity==='V';
 return{ok:true,text:kind==='element'?'Exactly. Density × a length (or area) gives a charge.':kind==='contribution'?scalar?'One scalar contribution: a charge over a distance, with no direction to keep track of.':'Coulomb’s law and the vector projection agree with the diagram.':kind==='variable'?'Every changing quantity is now expressed in one integration variable.':kind==='gradient'?'The field you derived by projection falls out of the potential in one line of differentiation.':scalar?'Your integral gives the correct potential. Let’s test its physical behavior.':'Your integral gives the correct field. Let’s test its physical behavior.'};
}
export function expectedAnswers(p:Problem):Record<string,string>{const answers:Record<string,string>={origin:p.origin,symmetry:p.symmetry.answer,axis:p.symmetry.axis,lower:p.bounds[0],upper:p.bounds[1],limit:p.limits[0].answer};p.steps.forEach(s=>s.fields?.forEach(f=>answers[f.id]=f.expected));return answers;}
