'use client';
import {memo,useCallback,useInsertionEffect,useMemo,useState,useEffect,useRef,type CSSProperties} from 'react';
import {useReducedMotion} from 'motion/react';
import {ChevronLeft,CircleHelp,Download,GitBranch,Play,Printer,RotateCcw,Sun,Moon,PanelLeft,MoreHorizontal} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Sidebar,SidebarContent,SidebarProvider,SidebarMenu,SidebarMenuItem,SidebarMenuButton} from '@/components/ui/sidebar';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Slider} from '@/components/ui/slider';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {PROBLEMS,getProblem} from '../problems/definitions';
import {DEFAULT_PARAMS,type Params,type Problem,type ProblemId} from '../problems/types';
import {preview} from '../symbolic/equivalence';
import {activeIntervalIndex} from '../diagrams/sampling';
import {partitionCount} from '../diagrams/subdivision';
import {cleanParams,parseAssignment,serializeAssignment,type ExploreMode} from '../state/assignment';
import {ChargeDiagram} from '../diagrams/ChargeDiagram';
import {boardLines,resultLines} from '../workbench/derivation';
import {buildStages,motionAt,stageAt,stageStart,totalSeconds} from './buildRun';
import {BuildPlayer,runClock} from './BuildPlayer';
import {EquationWorkbench} from '../components/EquationWorkbench';
import {Onboarding} from '../components/Onboarding';
import {StartHere} from '../components/StartHere';
import {isReady,SOON_NOTE} from '../problems/readiness';
import {MathText} from '../components/Math';
import {Assessment} from '../components/Assessment';
import {artifactHtml,downloadArtifact,figureCopy,printLesson} from '../state/artifact';
import {Hint} from '../components/Hint';
import './explorer.css';
import '../print.css';
export type Mode=ExploreMode;
// Drawn rather than borrowed from the icon set: the generic shapes gave the ring
// and the arc the same circle, which is precisely the distinction a student is
// here to learn. Each glyph is the actual geometry, with P marked where the
// choice of observation point is what defines the problem.
const GLYPHS:Record<ProblemId,React.ReactNode>={
 bisector:<><path d="M7 3.5v11M4.6 3.5h4.8M4.6 14.5h4.8"/><circle cx="14" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 axial:<><path d="M3 9h7.5M3 6.6v4.8M10.5 6.6v4.8"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 infinite:<><path d="M9 1.6v14.8M6.6 4L9 1.6 11.4 4M6.6 14L9 16.4 11.4 14"/><circle cx="14.4" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 ring:<circle cx="9" cy="9" r="5.8"/>,
 disk:<circle cx="9" cy="9" r="5.8" fill="currentColor" fillOpacity=".28"/>,
 semi:<><path d="M4 12.4h10.2M12.2 10.4l2.2 2-2.2 2"/><circle cx="4" cy="5.4" r="1.3" fill="currentColor" stroke="none"/></>,
 arc:<><path d="M4.2 13.8A6.8 6.8 0 0 1 13.8 4.2"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 sheet:<path d="M1.8 12.4 6.6 6.6h9.6l-4.8 5.8Z"/>,
 endpoint:<><path d="M6 3.4v9.2M3.6 3.4h4.8"/><circle cx="14" cy="12.6" r="1.3" fill="currentColor" stroke="none"/></>,
 ramp:<><path d="M6 12.6 3.8 3.4h4.4Z" fill="currentColor" fillOpacity=".3"/><circle cx="14" cy="12.6" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-ring':<circle cx="9" cy="9" r="5.8"/>,
 'v-disk':<circle cx="9" cy="9" r="5.8" fill="currentColor" fillOpacity=".28"/>,
 'v-arc':<><path d="M4.2 13.8A6.8 6.8 0 0 1 13.8 4.2"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-rod-bisector':<><path d="M7 3.5v11M4.6 3.5h4.8M4.6 14.5h4.8"/><circle cx="14" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-rod-axial':<><path d="M3 9h7.5M3 6.6v4.8M10.5 6.6v4.8"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/></>};
// The inline SVG is a named figure, not an external bitmap.
// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
function ShapeGlyph({id,size=18}:{id:ProblemId;size?:number}){const label=PROBLEMS.find(p=>p.id===id)?.short??id;return <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>{GLYPHS[id]}</svg>}
// FIFTEEN NAMES IN ONE COLUMN SAID NOTHING ABOUT THE SUBJECT. Scanning it, a reader could not
// see that four of them are the same rod looked at from four places, that three never end, or
// that the last five are the first shapes over again with the arrows replaced by numbers --
// which is the single most useful thing the list could have told them. The families are the
// lesson, so the list is grouped by them and each group says its own name.
const FAMILIES:{label:string;ids:ProblemId[]}[]=[
 {label:'Straight rods',ids:['bisector','axial','endpoint','ramp']},
 {label:'Rings, discs and arcs',ids:['ring','disk','arc']},
 {label:'Charge with no end',ids:['infinite','semi','sheet']},
 {label:'The same shapes, as potential',ids:['v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial']}];
/** Group a set of lessons into the families above, keeping each family's stated order and
 *  dropping families nothing landed in. Anything the table has not heard of still appears, in
 *  a trailing group of its own: a new geometry must never go missing because this list is stale. */
function families(list:Problem[]){const rest=new Set(list.map(p=>p.id));
 const groups=FAMILIES.map(f=>({label:f.label,items:f.ids.flatMap(id=>{const p=list.find(x=>x.id===id);if(!p)return[];rest.delete(id);return[p]})})).filter(g=>g.items.length>0);
 const extra=list.filter(p=>rest.has(p.id));
 return extra.length>0?[...groups,{label:'More geometries',items:extra}]:groups}
/** How long a parameter must hold still before it is written anywhere. Long enough that a
 * drag writes once at the end, short enough to survive a quick change and a reload. */
const SETTLE=220;
/** One beat of the stepped run, in milliseconds, for readers who have asked for reduced motion.
 * Real time still matches the smooth run -- a beat of timeline per beat of clock -- so the same
 * words stay on screen for the same length of time; there are simply forty-odd frames instead of
 * five hundred, and none of them tweens. */
const REDUCED_BEAT=450;
/** The most one frame may move the run on, in milliseconds. Well above a real frame at any rate
 * a screen refreshes, so it never slows a run someone is watching; small enough that a run
 * interrupted for twenty seconds resumes a tenth of a second later rather than at the end. */
const MAX_STEP=100;
const STORAGE='field-builder:explorer:v1';
// Variable-first: every control is named by its symbol. The words are the
// gloss, the number is the consequence — so the symbol is set large in the
// display serif and the reading stays quiet and monospaced beside it.
// aria-label keeps the full phrase, which is what a screen reader wants.
function splitSymbol(label:string):[string,string]{const parts=label.split(' ');const last=parts[parts.length-1];return last.length<=2&&parts.length>1?[last,parts.slice(0,-1).join(' ')]:['',label]}
// The confusions each lesson already names, gathered from every worked quantity in it.
// They were authored as the diagnosis for a wrong answer; offered up front they are simply
// the neighbouring expressions and what each of them would actually describe.
// Deduplicated by message on purpose: a lesson often gives four distractors one diagnosis,
// and printing that sentence four times reads as noise instead of as one idea.
function confusions(p:Problem){return p.steps.flatMap((s,i)=>(s.fields??[]).map(f=>{const by=new Map<string,string[]>();for(const m of f.mistakes??[])by.set(m.message,[...(by.get(m.message)??[]),m.expression]);return {key:`${i}:${f.id}`,label:f.label,notes:[...by].map(([message,expressions])=>({message,expressions}))}})).filter(g=>g.notes.length>0)}
// `describe` names the thing on the figure this slider moves. Pointing at the control -- hover,
// or tab to it -- lights that thing up, and the pairing is learned by looking. It matters more
// than it sounds: with the numbers stripped off, a slider labelled "r" says nothing at all to a
// reader who has not yet worked out which mark on the drawing is r, and the only way left to
// find out was to drag it and hunt for whatever moved.
// `reason` is how the value moved -- a drag, a press on the track, a key -- for the one slider that
// has to care.
function Range({label,value,min,max,step=1,onChange,describe,onDescribe}:{label:string;value:number;min:number;max:number;step?:number;onChange:(n:number,reason?:string)=>void;describe?:string;onDescribe?:(k:string)=>void}){const [symbol,name]=splitSymbol(label);const point=(on:boolean)=>{if(describe)onDescribe?.(on?describe:'')};return <div className="exp-range" onPointerEnter={()=>point(true)} onPointerLeave={()=>point(false)} onFocusCapture={()=>point(true)} onBlurCapture={()=>point(false)}><div><span>{symbol&&<i className="exp-sym">{symbol}</i>}<span className="exp-name">{name}</span></span></div><Slider aria-label={label} value={[value]} min={min} max={max} step={step} onValueChange={(v,details)=>onChange(Array.isArray(v)?v[0]:v,details?.reason)}/></div>}
/** NO CHARGE IS NOT A LESSON. The charge slider runs through zero, and at zero every sentence the
 * run says -- this charge all has one sign, its mirror piece acts just as hard -- is about nothing,
 * over a figure with no field in it. So the slider steps over zero rather than stopping on it:
 * a key press carries on to the other side, the way it was going; a drag that comes to rest on
 * zero stays on the side it came from, so a pointer held there does not flicker between the two. */
function snapCharge(next:number,current:number,reason?:string){
 if(!(Math.abs(next)<.05))return next;
 const pointer=reason==='drag'||reason==='track-press';
 const side=!pointer&&next!==current?Math.sign(next-current):Math.sign(current)||1;
 return side*.1;
}
// A FRAME OF "WATCH IT BUILD" USED TO RE-RENDER THE WHOLE PAGE. The run sets the same state the
// manual controls set, so every frame re-rendered everything that state reaches -- and, because
// every handler was written inline, everything else as well: a fresh function is a changed prop.
// The lesson list, the sliders, the library, the figure and the board were all redrawn sixty times
// a second to move one bar and, at most, one arrow. So the parts that a frame does not change are
// memoised, and the handlers they are given keep one identity for the life of the page.
/** A callback that keeps one identity but always runs the latest render's code. Refreshed before
 * any effect can call it; never called while rendering. */
function useSteady<A extends unknown[],R>(fn:(...args:A)=>R):(...args:A)=>R{const ref=useRef(fn);useInsertionEffect(()=>{ref.current=fn});return useCallback((...args:A)=>ref.current(...args),[])}
/** The board re-renders when what it shows changes, not whenever the page does. */
const Workbench=memo(EquationWorkbench);
export default function Explorer(){
 const [id,setId]=useState<ProblemId>('bisector');const [path,setPath]=useState('angular');const [mode,setMode]=useState<Mode>('divide');const [paramsMap,setParamsMap]=useState<Partial<Record<ProblemId,Params>>>({});const [dark,setDark]=useState(false);const [ready,setReady]=useState(false);const [storageOK,setStorageOK]=useState(true);const [onboarding,setOnboarding]=useState(false);const [seen,setSeen]=useState(false);const [library,setLibrary]=useState(false);const [sidebarOpen,setSidebarOpen]=useState(true);const [showNumbers,setShowNumbers]=useState(false);const [components,setComponents]=useState(false);const [pair,setPair]=useState(false);const [progress,setProgress]=useState(1);const [selected,setSelected]=useState(3);const [bounds,setBounds]=useState<[number,number]>([0,100]);const [limitsOpen,setLimitsOpen]=useState(false);const [slipsOpen,setSlipsOpen]=useState(false);const [limitIndex,setLimitIndex]=useState(0);const [highlight,setHighlight]=useState('');const [status,setStatus]=useState('');const [building,setBuilding]=useState(false);const [runAt]=useState(runClock);const [buildIndex,setBuildIndex]=useState(0);const [buildShown,setBuildShown]=useState(false);const [runPiece,setRunPiece]=useState(.7);const build=useRef<{stop:()=>void}|null>(null);const clock=useRef({at:0,stopAt:0});const buildC=useRef(-1);const buildStep=useRef(-1);const reduced=useReducedMotion();const tourButton=useRef<HTMLButtonElement>(null),watchButton=useRef<HTMLButtonElement>(null),walk=useRef<HTMLDivElement>(null),reveal=useRef(false);
 // Held per lesson: `getProblem` builds the infinite line afresh on every call, and a new problem
 // object is a changed prop to everything memoised below.
 const p=useMemo(()=>getProblem(id,'angular'),[id]),derivationProblem=useMemo(()=>getProblem(id,path),[id,path]),params=paramsMap[id]??DEFAULT_PARAMS;const continuum=params.continuum;const count=partitionCount(params.slices,continuum);const geom=p.geometry,scalar=p.quantity==='V';const isInfinite=['infinite','semi','sheet'].includes(geom);const isRound=['ring','disk','arc'].includes(geom);const lim=p.limits[Math.min(limitIndex,p.limits.length-1)];
 // Storage is an external system; initialize after hydration and surface write failures without aborting the lesson.
 // oxlint-disable-next-line react/react-compiler
 useEffect(()=>{try{const raw=localStorage.getItem(STORAGE);const parsed=raw?JSON.parse(raw):null;const saved=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};const pm:Partial<Record<ProblemId,Params>>={};for(const pr of PROBLEMS)if(saved.params?.[pr.id])pm[pr.id]=cleanParams(saved.params[pr.id]);const url=parseAssignment(typeof location==='undefined'?'':location.search);const assigned=!!(url.id||url.mode||url.params||url.pair||url.components);if(url.id&&isReady(url.id))setId(url.id);else if(PROBLEMS.some(p=>p.id===saved.id)&&isReady(saved.id))setId(saved.id);setDark(saved.dark===true);setShowNumbers(saved.showNumbers===true);setSidebarOpen(saved.sidebarOpen!==false);if(url.params){const target=url.id??(PROBLEMS.some(p=>p.id===saved.id)?saved.id as ProblemId:'bisector');pm[target]=cleanParams({...(pm[target]??DEFAULT_PARAMS),...url.params});}setParamsMap(pm);if(url.mode)setMode(url.mode);if(url.pair)setPair(true);if(url.components)setComponents(true);setSeen(!!saved.seen||assigned);setOnboarding(false);}catch{setStorageOK(false);setOnboarding(true)}setReady(true);return()=>{build.current?.stop();build.current=null}},[]);
 // oxlint-disable-next-line react/react-compiler -- Synchronize persisted preferences; quota/security errors update the save indicator.
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark]);
 // Paper is white whatever the screen is. The print sheet keeps backgrounds (print-color-adjust:
 // exact), so the dark theme printed as pale text on slabs of ink -- the lesson goes to the
 // printer in the light theme and comes back as it was.
 useEffect(()=>{
  if(!dark)return;
  const toPaper=()=>document.documentElement.classList.remove('dark');
  const back=()=>document.documentElement.classList.add('dark');
  window.addEventListener('beforeprint',toPaper);window.addEventListener('afterprint',back);
  return()=>{window.removeEventListener('beforeprint',toPaper);window.removeEventListener('afterprint',back);};
 },[dark]);
 // Persistence is debounced because a drag changes a parameter every frame. Writing the
 // whole parameter map to localStorage per frame is a synchronous serialize-and-store on
 // the main thread, and writing the URL per frame trips the browser's own rate limit --
 // Safari and Chrome throw SecurityError past 100 replaceState calls in 10 seconds, which
 // reached the error boundary and took the whole view down mid-drag. Only the settled
 // value is written; React clears the pending timer on every change.
 useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{try{localStorage.setItem(STORAGE,JSON.stringify({id,dark,params:paramsMap,seen,showNumbers,sidebarOpen}))}catch{setStorageOK(false)}},SETTLE);return()=>clearTimeout(t)},[id,dark,paramsMap,ready,seen,showNumbers,sidebarOpen]);
 useEffect(()=>{if(!ready||typeof history==='undefined')return;
  const t=setTimeout(()=>{const q=serializeAssignment({id,mode,params,pair,components});const next=q?`?${q}`:location.pathname||'/';
   // Still guarded: a throw here would reach the error boundary and blank the lesson.
   if(`${location.search}`!==(q?`?${q}`:''))try{history.replaceState(null,'',next)}catch{/* rate-limited or blocked: the URL is a convenience, the lesson is not */}},SETTLE);
  return()=>clearTimeout(t)},[ready,id,mode,params,pair,components]);


 const stages=useMemo(()=>buildStages(p),[p]);
 const buildNow=stages[Math.min(buildIndex,stages.length-1)];
 // Open is its own state, not inferred from the clock. It used to be `building || buildAt > 0`,
 // and the first stage starts at exactly zero -- so clicking the first stage's marker, or pausing
 // on its opening frame, threw the reader out of the run and back to the start button.
 const buildOpen=buildShown;
 // The piece being added walks along the charge while the sum builds, so it is always plain
 // which piece is going in.
 const following=buildOpen&&buildNow.key==='add';
 // The run shows its own piece, held at one place along the charge rather than at one index: the
 // limit multiplies the pieces, and a fixed index slid from most of the way along the rod to its
 // very end as they shrank.
 const activeIndex=following?activeIntervalIndex(count,bounds,progress):buildOpen?Math.min(count-1,Math.floor(runPiece*count)):Math.min(count-1,Math.max(0,selected));
 // While the run is open, the figure lights the factor the current stage puts into the integral
 // -- the distance as the first arrow is drawn, the angle as the parts cancel -- unless the
 // reader is pointing at something else, which always wins.
 const figureHighlight=highlight||(buildOpen?buildNow.term:'');
 // The line of the derivation the run has reached, for the player to carry where the panel is
 // out of sight -- and once the pieces have shrunk away, the integral done and its answer.
 const cutAway=continuum>=.99,settledRun=buildIndex===stages.length-1&&cutAway;
 const playerMath=useMemo(()=>{if(!buildOpen)return [];const line=boardLines(p)[buildIndex];if(!line)return [];
  // Every line of the result, not the first: on the lessons whose answer has two components, the
  // figure's arrow labelled E leans, and an answer of E_x alone said it pointed along x.
  // The result is stated whether or not the last line has a step of its own to finish on: four
  // potential lessons leave their integral unsimplified on the board, and ended on it here, so on a
  // screen without the panel the run never said what V is.
  return settledRun?[line.tex,...(line.finish?[line.finish]:[]),...resultLines(p)]:[line.tex];},[buildOpen,p,buildIndex,settledRun]);
 // What the figure and the board are told about the run, held still until it actually changes.
 // The run's clock goes with it, and where the stage on screen starts and how long it lasts: a stage
 // that moves within itself reads its own moment off the clock, so a pause or a seek holds it there.
 // And the piece the run talks about, which the adding stage hands over to the chain.
 const figureBuild=useMemo(()=>buildOpen?{key:buildNow.key,name:buildNow.name,index:buildIndex,count:stages.length,paused:!building,clock:runAt,start:stageStart(stages,buildIndex),seconds:buildNow.seconds,piece:Math.min(count-1,Math.floor(runPiece*count))}:undefined,[buildOpen,buildNow,buildIndex,stages,building,runAt,runPiece,count]);
 const boardBuild=useMemo(()=>({open:buildOpen,index:buildIndex,playing:building,settled:cutAway}),[buildOpen,buildIndex,building,cutAway]);
 const updateParams=useCallback((partial:Partial<Params>)=>{setParamsMap(old=>({...old,[id]:{...(old[id]??DEFAULT_PARAMS),...partial}}));},[id]);
 function stop(){build.current?.stop();build.current=null;setBuilding(false)}
 function changeDistribution(next:string){stop();setId(next as ProblemId);setSelected(3);setProgress(1);setBounds([0,100]);setLibrary(false);setLimitIndex(0);setStatus('');setHighlight('');endBuild();}
 // WATCH IT BUILD. The five stages are data (`buildRun.ts`); this is the projector. It drives
 // exactly the state the manual controls drive -- mode, the mirror partner, how much of the sum
 // is drawn, how fine the partition is -- so the run can never show a figure the reader cannot
 // then reach by hand, which is the point: it is a demonstration of the controls, not a film
 // playing next to them.
 function applyBuild(elapsed:number){
  const {index,stage,local}=stageAt(stages,elapsed);const t=motionAt(stage,local);
  // The clock moves only the transport. Everything below is set every frame but changes the page
  // only when its value does -- React drops a state update that leaves the value as it was -- so a
  // frame that holds the figure still renders the bar and nothing else.
  runAt.set(elapsed);setBuildIndex(index);
  setMode(stage.mode);setComponents(stage.components);setPair(stage.pair);
  setProgress(stage.sum[0]+(stage.sum[1]-stage.sum[0])*t);
  // The partition is written into params, so it is written only when it actually moves --
  // otherwise every frame of the four stages that hold it still would re-save the lesson.
  const c=stage.continuum[0]+(stage.continuum[1]-stage.continuum[0])*t;
  if(Math.abs(c-buildC.current)>.004||((c===0||c===1)&&buildC.current!==c)){buildC.current=c;updateParams({continuum:c})}
  // Announced on entering a stage, not every frame: a live region repeating itself sixty times
  // a second says nothing at all.
  if(index!==buildStep.current){buildStep.current=index;setStatus(stage.caption)}
 }
 /** Play the run from `from` seconds until `until`, then hold there.
  *
  * THE RUN ADVANCES BY FRAMES, NOT BY THE CLOCK. It used to be a 21-second tween, which asks the
  * clock where it should be -- so if frames stopped for any reason (another tab, power saving, a
  * browser that throttles a page it thinks nobody is looking at, a busy moment), the next frame
  * computed that the whole run had elapsed and drew the last stage. The reader clicked "Watch it
  * build", saw nothing move, and then found it finished and frozen on "Shrink them".
  *
  * Now each frame moves the run on by the time since the last frame, but never by more than
  * MAX_STEP: at sixty frames a second that is the same pace, and after a pause it is one small
  * step, so the run picks up where it left off instead of skipping to the answer. Where it has got
  * to lives in a ref rather than in the closure, so scrubbing can move it while it plays. */
 /** The piece the run talks about: off the middle, so it always has a mirror piece that is not
  * itself -- with an odd count the middle piece is its own mirror, and the cancelling stage would
  * have nothing to show -- and three quarters of the way along, where its sideways part is large
  * enough to see cancel. Chosen as the run opens; the reader's own choice comes back on close.
  *
  * On a rod seen from its bisector, three quarters of the way along was not far enough. At five
  * pieces it is the piece at y = 0.8 m, which P sees fifteen degrees off the perpendicular: its
  * sideways part is a quarter of its arrow, and "What cancels" cancelled almost nothing anyone could
  * see. The end piece is seen at twenty-eight degrees and its sideways part is nearly half the arrow,
  * so the bisector -- and its potential, drawn on the same rod -- talks about the last piece, whose
  * mirror is the first. The infinite line keeps the old rule: its outermost piece is an angle that
  * runs off the picture. The arc keeps it too.
  *
  * A ring has no "along": every piece has a partner straight across, and what decides whether the
  * cancelling can be seen is which way that diameter lies on the screen. Three quarters of the way
  * round is the near side, so the two sideways parts pointed straight along the line of sight and
  * shrank to a few pixels in both views. The ring's piece is the one lying across the screen in the
  * view the ring opens in -- yaw -0.5, about 331 degrees round -- so its sideways parts are drawn at
  * full length, either side of the axis, and are seen to cancel. */
 function openRun(){if(buildShown)return;const i=geom==='ring'?Math.floor(count*(1-.5/(2*Math.PI)))%count:geom==='bisector'?count-1:count-1-Math.floor((count-1)/4);setRunPiece((i+.5)/count);setBuildShown(true)}
 function playBuild(from:number,until:number){
  build.current?.stop();build.current=null;setHighlight('');openRun();
  setBuilding(true);
  if(from===0)buildC.current=-1;
  clock.current={at:from,stopAt:until};
  const done=()=>{build.current=null;setBuilding(false)};
  // REDUCED MOTION IS NOT "SKIP THE LESSON". It used to be: the run jumped straight to its last
  // frame and stopped, and because it was then already at the end, Play restarted it at the end
  // and landed on the same frame again. The setting asks for no SMOOTH movement, not for no
  // argument, so the run steps instead: the same stages in the same order over the same time,
  // advanced in discrete beats with nothing tweening between them.
  if(reduced){
   applyBuild(from);
   const beat=window.setInterval(()=>{const c=clock.current;c.at=Math.min(c.stopAt,c.at+REDUCED_BEAT/1000);applyBuild(c.at);if(c.at>=c.stopAt){window.clearInterval(beat);done()}},REDUCED_BEAT);
   build.current={stop:()=>window.clearInterval(beat)};
   return;
  }
  let last=-1,raf=0;
  const frame=(now:number)=>{
   if(last<0)last=now;
   const c=clock.current;
   c.at=Math.min(c.stopAt,c.at+Math.min(now-last,MAX_STEP)/1000);last=now;
   applyBuild(c.at);
   if(c.at>=c.stopAt){done();return}
   raf=requestAnimationFrame(frame);
  };
  applyBuild(from);
  raf=requestAnimationFrame(frame);
  build.current={stop:()=>cancelAnimationFrame(raf)};
 }
 /** Play, pause, or play again from the top once it has played out. */
 function runBuild(){
  if(building){stop();return}
  const total=totalSeconds(stages),at=runAt.get();
  playBuild(at>=total-.01?0:at,total);
 }
 /** The button above the figure. It opens the run, then makes sure the transport it opened is
  * where the reader can reach it: focus moves to its play button, which is the control that was
  * just pressed, now in its new place -- and if the transport has opened below the bottom of the
  * window, the page moves up just far enough to show it, never so far that the figure's top goes. */
 function watch(){reveal.current=true;runBuild()}
 /** Go to a moment and hold still there: a click on a stage, or a drag along the bar. */
 function seekBuild(at:number){stop();openRun();setHighlight('');applyBuild(Math.max(0,Math.min(totalSeconds(stages),at)))}
 /** Play one stage from its start and stop at its end -- from the derivation's lines and the
  * previous/next buttons, which is how a reader takes the argument one step at a time. Stopping a
  * hair before the end keeps the stage's own finished frame on screen, not the next one's first. */
 function stepBuild(i:number){const at=stageStart(stages,i),end=at+stages[i].seconds;playBuild(at,i===stages.length-1?end:end-.001)}
 // Closing puts the figure back where the run found it, the partition included: a reader who
 // watched the pieces shrink away and then closed should not be left looking at a smooth rod
 // with no way to tell why it stopped being cut up.
 function endBuild(){build.current?.stop();build.current=null;setBuilding(false);setBuildShown(false);runAt.set(0);setBuildIndex(0);buildC.current=-1;buildStep.current=-1;setPair(false);setComponents(false);setMode('divide');setProgress(1);updateParams({continuum:0});}
 function chooseMode(next:Mode){setMode(next);if(next==='project'&&!scalar)setComponents(true);if(next==='integrate'){setProgress(1);stop()}}
 function closeTour(){setOnboarding(false);setSeen(true)}
 useEffect(()=>{
  if(!buildOpen||!reveal.current)return;
  reveal.current=false;
  const player=walk.current;
  if(!player)return;
  player.querySelector<HTMLButtonElement>('.bp-play')?.focus({preventScroll:true});
  const box=player.getBoundingClientRect(),top=player.closest('.exp-diagram-card')?.getBoundingClientRect().top??0;
  const over=box.bottom+16-window.innerHeight;
  if(over>0)window.scrollBy({top:Math.min(over,Math.max(0,top-12)),behavior:reduced?'auto':'smooth'});
 },[buildOpen,reduced]);
 // Steady versions of the handlers the memoised parts are given.
 const choose=useSteady(changeDistribution),select=useSteady((i:number)=>{stop();setSelected(i)}),pickMode=useSteady(chooseMode),step=useSteady(stepBuild);
 const play=useSteady(runBuild),seek=useSteady((at:number)=>seekBuild(at)),close=useSteady(endBuild);
 const recut=useSteady((slices:number)=>{if(buildOpen)endBuild();updateParams({slices,continuum:0})}),resetGeometry=useSteady(()=>{stop();updateParams({...DEFAULT_PARAMS});setProgress(1);setBounds([0,100]);setSelected(3)});
 // The lesson list, the library and the sliders: none of them moves while the run plays, and the
 // list and the library are fifteen lessons, each with its drawn glyph, every one rebuilt per render.
 const lessonList=useMemo(()=>{
   // Families first, then a divider and the ones still being drawn. Kept in the list rather
   // than hidden: a reader can see the whole plan and tell that the gap is deliberate.
   const item=(pr:typeof PROBLEMS[number])=>{const soon=!isReady(pr.id);return <SidebarMenuItem key={pr.id}><SidebarMenuButton className={'exp-shape-button '+(id===pr.id?'active':'')+(soon?' is-soon':'')} isActive={id===pr.id} disabled={soon} aria-disabled={soon} title={soon?SOON_NOTE:undefined} onClick={()=>{if(!soon)choose(pr.id)}}><span className="shape-icon"><ShapeGlyph id={pr.id}/></span><span>{pr.short}</span></SidebarMenuButton></SidebarMenuItem>};
   const group=(label:string,items:typeof PROBLEMS,soon=false)=><div className="exp-family" key={label}><h2 className="exp-family-name">{label}</h2><SidebarMenu aria-label={label} className={soon?'exp-soon-group':undefined}>{items.map(item)}</SidebarMenu></div>;
   const soon=PROBLEMS.filter(pr=>!isReady(pr.id));
   return <>{families(PROBLEMS.filter(pr=>isReady(pr.id))).map(g=>group(g.label,g.items))}{soon.length>0&&group('Coming soon',soon,true)}</>;
  },[id,choose]);
 const libraryCards=useMemo(()=>{
    const card=(pr:typeof PROBLEMS[number])=>{const soon=!isReady(pr.id);return <button key={pr.id} className={(pr.id===id?'selected':'')+(soon?' is-soon':'')} disabled={soon} aria-disabled={soon} onClick={()=>{if(!soon)choose(pr.id)}}><ShapeGlyph id={pr.id} size={26}/><strong>{pr.short}</strong><span>{soon?SOON_NOTE:pr.subtitle}</span></button>};
    // Grouped exactly as the lesson list is, so the two pickers tell one story about the subject.
    const block=(label:string,items:typeof PROBLEMS)=><div className="exp-library-family" key={label}><h3 className="exp-family-name">{label}</h3><div className="exp-library-grid">{items.map(card)}</div></div>;
    const soon=PROBLEMS.filter(pr=>!isReady(pr.id));
    return <>{families(PROBLEMS.filter(pr=>isReady(pr.id))).map(g=>block(g.label,g.items))}{soon.length>0&&block('Coming soon',soon)}</>;
   },[id,choose]);
 const {distance,size,charge,phi,slices}=params;
 const parameterGrid=useMemo(()=><div className="parameter-grid">{geom!=='arc'&&<Range describe="distance" onDescribe={setHighlight} label={['ring','disk','sheet'].includes(geom)?'Height z':geom==='axial'?'End distance a':'Distance r'} value={distance} min={.5} max={6} step={.05} onChange={distance=>updateParams({distance})}/>} {!isInfinite&&<Range describe="size" onDescribe={setHighlight} label={isRound?'Radius R':'Length L'} value={isRound?size/2:size} min={isRound?.5:1} max={isRound?4:8} step={.05} onChange={v=>updateParams({size:isRound?v*2:v})}/>}<Range describe="charge" onDescribe={setHighlight} label={geom==='sheet'?'Surface density σ':geom==='ramp'?'Peak density λ₀':['infinite','semi'].includes(geom)?'Line density λ':'Total charge Q'} value={charge} min={-5} max={5} step={.1} onChange={(next,reason)=>updateParams({charge:snapCharge(next,charge,reason)})}/>{geom==='arc'&&<Range describe="angle" onDescribe={setHighlight} label="Arc angle φ" value={phi/Math.PI} min={.1} max={2} step={.01} onChange={v=>updateParams({phi:v*Math.PI})}/>}{/* How finely the charge is cut. It used to live inside one step of the walkthrough, so the
     one control that shows the sum closing in on the integral was three clicks deep. */}<Range describe="pieces" onDescribe={setHighlight} label="Pieces N" value={slices} min={3} max={30} onChange={recut}/><button onClick={resetGeometry} className="text-button exp-reset" aria-label="Reset geometry" title="Reset geometry"><RotateCcw size={13}/></button></div>,[geom,isInfinite,isRound,distance,size,charge,phi,slices,updateParams,recut,resetGeometry]);
 /** The offline copy, made in the light theme whatever the screen is in -- it is for paper, as the
  * print sheet is -- and put back the moment the figure has been read. */
 function saveCopy(){
  const root=document.documentElement,wasDark=root.classList.contains('dark');
  let figure='';
  if(wasDark)root.classList.remove('dark');
  try{const stage=document.querySelector('.explorer-app .cd-stage');figure=stage?figureCopy(stage):''}
  finally{if(wasDark)root.classList.add('dark')}
  downloadArtifact(`field-builder-${id}.html`,artifactHtml({title:p.title,subtitle:p.subtitle,setup:p.setup,coordinate:p.coordinate,integralTex:p.integralTex,results:resultLines(p),svg:figure}));
 }
 return <div className={`explorer-app ${showNumbers?'with-numbers':'symbolic-view'}`}><header className="exp-header"><div className="exp-brand"><span className="exp-logo">∫</span><span>field<span className="brand-light">builder</span></span></div>{/* FIVE ACTIONS BECAME TWO AND A MENU. Walkthrough is how a reader starts, and the theme
     switch is read as often as the page is; print, save a copy and the repository are things
     a reader does at most once and never in the middle of a derivation, so they stop taking
     three of the five slots above the lesson. Every one keeps the name it had, so it is the
     same control in a quieter place. */}
 <div className="exp-header-right"><button ref={tourButton} type="button" className="text-button tour-button" aria-label="Walkthrough" onClick={()=>setOnboarding(true)}><CircleHelp size={16}/><span>Walkthrough</span></button><Hint label={dark?'Switch to light theme':'Switch to dark theme'}><button className="icon-button" onClick={()=>setDark(!dark)} aria-label={dark?'Switch to light theme':'Switch to dark theme'}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></Hint><DropdownMenu><Hint label="Lesson tools"><DropdownMenuTrigger className="icon-button no-print" aria-label="Lesson tools"><MoreHorizontal size={17}/></DropdownMenuTrigger></Hint><DropdownMenuContent className="exp-tools-menu" align="end" sideOffset={8}><DropdownMenuItem onClick={printLesson}><Printer size={15}/>Print this lesson</DropdownMenuItem><DropdownMenuItem onClick={saveCopy}><Download size={15}/>Save an offline copy of this lesson</DropdownMenuItem><DropdownMenuItem render={<a href="https://github.com/malekTheCoder/field-builder" target="_blank" rel="noreferrer" aria-label="View Field Builder on GitHub"/>}><GitBranch size={15}/>View Field Builder on GitHub</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>
 <SidebarProvider className={`exp-shell ${sidebarOpen?'library-expanded':'library-collapsed'}`} style={{'--sidebar-width':'196px'} as CSSProperties}>{sidebarOpen&&<Sidebar collapsible="none" className="exp-sidebar"><SidebarContent>{lessonList}<div className="exp-nav-bottom"><p>One law.<br/>Every geometry.</p><MathText tex={scalar?String.raw`dV=\frac{k\,dQ}{r_i}`:String.raw`d\mathbf E=\frac{k\,dQ}{r_i^2}\hat{\mathbf r}_i`}/><span>{storageOK?'Your settings stay on this device.':'Settings are kept for this visit.'}</span></div></SidebarContent></Sidebar>}
 <main className="exp-main"><div className="exp-breadcrumb"><Hint label={sidebarOpen?'Hide the lesson list':'Show the lesson list'}><button type="button" className="exp-library-toggle" aria-expanded={sidebarOpen} aria-label={sidebarOpen?'Hide the lesson list':'Show the lesson list'} onClick={()=>setSidebarOpen(v=>!v)}><PanelLeft size={16}/></button></Hint>{/* THE SAME LESSON WAS NAMED THREE TIMES IN THREE INCHES: lit in the list, as the tail of a
     breadcrumb, and then in full as the title. The crumb said it least well of the three, so
     the trail is now just the way back out to the library -- which on a narrow screen, where
     the list is not there at all, is the only way to another lesson. */}
<nav className="exp-crumbs" aria-label="Breadcrumb"><button type="button" className="exp-crumb-link" onClick={()=>setLibrary(true)}><ChevronLeft size={13} aria-hidden="true"/>Charge library</button></nav></div><div className="exp-heading"><div><h1>{p.title}</h1><p>{p.subtitle}</p></div></div>
 <div className="exp-workspace"><div className="exp-visual-column"><section className={'exp-diagram-card mode-'+mode+' focus-'+highlight} aria-label="Interactive field visualization"><div className="exp-diagram-heading"><div><MathText tex={p.coordinate}/></div>
  {/* THE LESSON'S ONE BUTTON, AT THE TOP OF ITS FIGURE. It sat under the figure and its toolbar,
      past the bottom of a laptop's window -- its top at 919 pixels on a 1440 by 900 screen -- so
      a first-time reader never saw the feature the lesson is built around. Here it is on the first
      screen at any size, opposite the point it is about; the transport it opens still plays under
      the figure, beside the controls it drives. */}
  {!buildOpen&&<div className="exp-watch">
   <span className="exp-watch-note">Five steps, about half a minute</span>
   <button ref={watchButton} type="button" className="exp-watch-button" onClick={watch} title="Five steps, about half a minute. Pause or step through at any point."><Play size={13} fill="currentColor" strokeWidth={0}/>Watch it build</button>
  </div>}
 </div><ChargeDiagram compact problem={p} params={params} setParams={updateParams} count={count} continuum={continuum} selected={activeIndex} onSelect={select} progress={progress} components={components} pair={pair} mode={mode} boundRange={bounds} onBoundRangeChange={setBounds} highlight={figureHighlight} build={figureBuild}/>{/* ONE WAY IN. There used to be two buttons here -- "Watch it build" and "Walk me through the
      integral" -- which told the same argument twice, in different words, in different steps,
      and neither one touched the equation beside the figure. The run is now the walkthrough as
      well: it plays, pauses, scrubs and steps one stage at a time, and the derivation in the
      panel arrives with it. */}
  {buildOpen&&<div ref={walk} className="exp-walk is-open"><BuildPlayer stages={stages} clock={runAt} index={buildIndex} playing={building} math={playerMath}
    onPlay={play} onSeek={seek} onStep={step} onClose={close}/></div>}
</section>
 <section className="exp-parameters">{parameterGrid}</section>
 {id==='infinite'&&<div className="exp-method"><span>Explore another route to the same result</span><Tabs value={path} onValueChange={v=>{setPath(String(v));setBounds([0,100]);}}><TabsList><TabsTrigger value="angular">Angular substitution</TabsTrigger><TabsTrigger value="limit">Finite-line limit</TabsTrigger></TabsList></Tabs></div>}
 </div><Workbench key={p.id+"/"+p.variable+"/"+(derivationProblem?.variable??"")} problem={p} derivationProblem={derivationProblem} params={params} continuum={continuum} progress={progress} mode={mode} onModeChange={pickMode} onHighlight={setHighlight} boundRange={bounds} onBoundRangeChange={setBounds} highlight={figureHighlight}
  build={boardBuild} onStep={step}/></div>
 {/* The end of a derivation, not a peer of it. A limiting case is the check that the answer
     is physically right, and the confusions are a reference — both belong after the integral
     is built, and both stay shut until asked for so the page does not get busier.
     The bodies are mounted only while open: an Assessment integrates 70 samples on every
     render, which a parameter drag would otherwise pay for behind a closed disclosure. */}
 <section className="exp-endnotes">
  <details className="exp-note" open={limitsOpen} onToggle={e=>setLimitsOpen(e.currentTarget.open)}>
   <summary><span>Limiting cases</span><small>Push the geometry to an extreme and watch whether the result still describes something real.</small></summary>
   {limitsOpen&&<div className="exp-note-body">
    {p.limits.length>1
     ?<Tabs value={String(limitIndex)} onValueChange={v=>setLimitIndex(Number(v))}><TabsList className="exp-limit-tabs">{p.limits.map((x,i)=><TabsTrigger value={String(i)} key={x.id}>{x.title}</TabsTrigger>)}</TabsList></Tabs>
     :<h3 className="exp-note-heading">{lim.title}</h3>}
    <p>{lim.explanation}</p>
    <Assessment key={id+limitIndex} problem={p} params={params} limit={lim}/>
   </div>}
  </details>
  <details className="exp-note" open={slipsOpen} onToggle={e=>setSlipsOpen(e.currentTarget.open)}>
   <summary><span>Easy to confuse with</span><small>The expressions this geometry sits next to, and what each one would actually describe.</small></summary>
   {slipsOpen&&<div className="exp-note-body exp-slips">{confusions(p).map(g=><div className="exp-slip" key={g.key}>
    <span className="exp-slip-of">{g.label}</span>
    {g.notes.map(n=><div className="exp-slip-note" key={n.message}><span className="exp-slip-math">{n.expressions.map(x=><MathText key={x} tex={preview(x)}/>)}</span><p>{n.message}</p></div>)}
   </div>)}</div>}
  </details>
 </section>
 <output className="sr-only" aria-live="polite">{status}</output></main></SidebarProvider>
 {/* The first-visit cue points at what the lesson is built around, not at the tour of it. */}{ready&&!seen&&!onboarding&&<StartHere target={watchButton} onSettled={()=>setSeen(true)}/>}<Onboarding returnFocus={tourButton} open={onboarding} onClose={closeTour} onExplore={closeTour}/><Dialog open={library} onOpenChange={setLibrary}><DialogContent className="exp-library-dialog"><DialogTitle>Choose your geometry</DialogTitle><DialogDescription>Every lesson, including electric potential.</DialogDescription>{libraryCards}</DialogContent></Dialog></div>;
}
