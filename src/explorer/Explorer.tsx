'use client';
import {memo,useCallback,useId,useInsertionEffect,useMemo,useState,useEffect,useRef,type CSSProperties,type ReactNode} from 'react';
import {flushSync} from 'react-dom';
import {useReducedMotion} from 'motion/react';
import {ArrowLeft,ArrowRight,BookOpen,ChevronLeft,CircleHelp,Download,GitBranch,GraduationCap,Link as LinkIcon,Play,Printer,RotateCcw,Sun,Moon,PanelLeft,MoreHorizontal} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Sidebar,SidebarContent,SidebarProvider,SidebarMenu,SidebarMenuItem,SidebarMenuButton} from '@/components/ui/sidebar';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Slider} from '@/components/ui/slider';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {PROBLEMS,getProblem} from '../problems/definitions';
import {DEFAULT_PARAMS,type Params,type Problem,type ProblemId} from '../problems/types';
import {confusionTex} from '../symbolic/equivalence';
import {sheetPiece} from '../diagrams/camera';
import {activeIntervalIndex} from '../diagrams/sampling';
import {partitionCount} from '../diagrams/subdivision';
import {cleanParams,parseAssignment,serializeAssignment,type ExploreMode} from '../state/assignment';
import {ChargeDiagram} from '../diagrams/ChargeDiagram';
import {redrawLayer} from '../diagrams/snapshot';
import {boardLines,exactSum,resultLines} from '../workbench/derivation';
import {buildStages,motionAt,stageAt,stageStart,totalSeconds} from './buildRun';
import {BuildPlayer,drawingOnScreen,runClock} from './BuildPlayer';
import {EquationWorkbench} from '../components/EquationWorkbench';
import {Onboarding} from '../components/Onboarding';
import {StartHere} from '../components/StartHere';
import {isReady,PLANNED_LABEL,PLANNED_SECTIONS,SOON_NOTE} from '../problems/readiness';
import {MathText,Prose} from '../components/Math';
import {symbolic} from '../problems/prose';
import {Assessment} from '../components/Assessment';
import {artifactHtml,downloadArtifact,figureCopy,lessonArtifact,printLesson} from '../state/artifact';
import {Hint} from '../components/Hint';
import {LawsDialog,LawsReference} from '../components/Laws';
import {GAUSS,PlannedGlyph,ShapeGlyph,families} from './lessons';
import {Brand} from './Brand';
import {LessonIntro} from './LessonIntro';
import {lessonFor} from '../lessons';
import {GUIDE_HREF,inPlace,navigate} from '../state/route';
import './explorer.css';
import '../print.css';
export type Mode=ExploreMode;
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
/** The longest the run waits, as it opens, for the page's glide to the board's top (Explorer, `hold`): a
 * smooth scroll of three hundred pixels takes about a third of a second. */
const GLIDE_HOLD=600;
/** Where the reader's settings are kept: the last lesson, the theme, each lesson's values. The home page reads
 * it too, for the way back to the last lesson and for the theme. */
export const STORAGE='field-builder:explorer:v1';
/** How far the cut must have gone for the pieces to count as shrunk away: the figure's own threshold
 * (ChargeDiagram writes dQ and "In the limit" from here), so the board's answer arrives with them. */
const IN_THE_LIMIT=.999;
/** The lesson's title, where the focus goes when nothing else should have it (Explorer, `focusLesson`). */
const LESSON_TITLE='lesson-title';
/** The library's card for the open lesson, where the dialog puts the focus; the first card if none is. */
const libraryFocus=()=>document.querySelector<HTMLElement>('.exp-library-dialog [aria-current=page]')??true;
/** A lesson as it is opened from storage or from a link: with the charge CUT INTO PIECES. The run drives the
 * same state the controls do, and before the persistence fix a run left at its end was saved with its cut gone
 * (continuum 1) -- a student who had watched one opened that lesson ever after on a smooth rod "In the limit"
 * beside a board saying ΔQ, and the address, rewritten from that state, spread it to anyone the link was sent
 * to. Nothing at rest sets the cut but the run, so what is read never carries one. A teacher's link may still
 * ask for the parts or the mirror pair drawn (mode, pair, components): those are pictures the board agrees
 * with, and assignments are written with them. */
const atRest=(v:Partial<Params>):Params=>({...cleanParams(v),continuum:0});
/** EVERY WAY TO ANOTHER LESSON IS A LINK. Changing lesson pushes a history entry to ?p=<lesson>, so each of
 * these is a navigation in every sense but its element -- and as buttons a teacher could not Ctrl- or
 * middle-click a lesson open beside another, or copy its address, and a screen reader announced a way to
 * another page as a button. They are links to the lesson's address now. A plain click still switches the
 * lesson in place, without reloading the page; a click meant for a new tab or window is the browser's. */
const lessonHref=(id:ProblemId)=>`?p=${id}`;
/** The board's strut for a conclusion, the left side its rows stand under (`\phantom{E_z}`), with the thick space
 * a relation has after it; nothing where the board sets none. On a phone the conclusion goes under its line
 * (explorer.css), and its rows stood at the margin, under E_z rather than under the "=" they continue: the
 * ring's exact sum read as two equations with no left side. The transport sets the strut in front of them there,
 * invisible, as the board's aligned block does, so every row opens under the line's own "=". */
function strutOf(tex:string){
 // Only one the conclusion opens on: a strut further in stands for something else (a bracket's opening).
 const at=tex.match(/^\s*(?:\\begin\{aligned\})?\s*(\\phantom\{)/);if(!at)return undefined;
 const from=at[0].length-at[1].length;
 let depth=1,i=at[0].length;for(;i<tex.length&&depth>0;i++)depth+=tex[i]==='{'?1:tex[i]==='}'?-1:0;
 return depth?undefined:tex.slice(from,i)+String.raw`\;`;
}
/** No lines: one value, so a run that has not settled hands the transport the same empty list. */
const NONE:string[]=[];
/** A board line's conclusion as rows, each opening on its "=": the board's alignment -- an aligned block's
 * `&` and `\\`, and the strut before each "=" that stands for the line's left side -- is the board's, set
 * under its own line. Braces counted, not matched by pattern, so a strut with braces inside it goes whole. */
function rows(tex:string){
 const strut=(row:string)=>{const at=row.match(/^\s*&?\s*\\phantom\{/);if(!at)return row.replace(/^\s*&/,'');let depth=1,i=at[0].length;for(;i<row.length&&depth>0;i++)depth+=row[i]==='{'?1:row[i]==='}'?-1:0;return row.slice(i).replace(/^\s*&/,'')};
 const block=tex.trim().match(/^\\begin\{aligned\}([\s\S]*)\\end\{aligned\}$/);
 return (block?block[1].split(/\\\\(?:\[[^\]]*\])?/):[tex]).map(row=>strut(row).trim()).filter(row=>row.length>0);
}
/** A Greek letter in a sentence of the page's sans, set in the face the formulas use. Geist draws φ as
 * the stroked ϕ, so the limiting cases and the confusions wrote "every ϕ" in a line whose plot, slider
 * and formulas all set the curly φ -- one symbol in two shapes, beside each other. Lower case is italic,
 * as KaTeX sets it; capitals stand upright, as Δ does in every formula on the page. */
function greek(text:string){return text.split(/([\u0370-\u03ff\u1f00-\u1fff]+)/).map((part,i)=>i%2?<span key={i} className={'exp-greek'+(/^[\u0391-\u03a9]+$/.test(part)?' is-upright':'')}>{part}</span>:part)}
/** A sentence of the limiting cases or the confusions, its symbols in the face of the formulas under it.
 *
 * ONE SYMBOL, ONE FACE. Only the Greek letters were set as math, so "holds λ dy, with λ = Q/L" put an italic
 * serif λ beside an upright sans dy, Q and L, directly above a formula that sets all of them in KaTeX's italic:
 * r in two faces on one line, which no textbook does. A sentence written with $…$ spans is set by Prose, as the
 * setup and the unfolded integration are. One still written plain has its symbols found the way prose.ts holds
 * them together (`symbolic`): the Latin letters of a symbol go into KaTeX's italic, a function's name and the
 * digits stay upright, as KaTeX sets them. A lone "a", "A" or "I" is a word unless prose.ts held it to a symbol
 * beside it ("a ≪ L"), since "a uniform rod" is English. Words of three letters or more are never touched. */
function mathProse(text:string):ReactNode{
 if(text.includes('$'))return <Prose text={text}/>;
 let key=0;
 const latin=(part:string)=>part.split(/([A-Za-z]+[₀-₉ᵢᵧₓ²³′]*)/).map((run,i)=>{
  const letters=run.match(/^[A-Za-z]+/)?.[0]??'';
  return i%2&&letters.length<=2&&!FUNCTIONS.has(letters)?<span key={key++} className={'exp-greek'+(/[A-Z]$/.test(run)?' is-capital':'')}>{run}</span>:<span key={key++}>{greek(run)}</span>});
 // Held runs are joined by no-break spaces (prose.ts): a run of more than one piece is a formula.
 return text.split(/( )/).map(token=>{
  if(token===' ')return token;
  const pieces=token.split(/(\u00a0)/),held=pieces.length>1;
  return <span key={key++}>{pieces.map(p=>p==='\u00a0'?p:symbolic(p)&&(held||!/^[aAI]$/.test(p))?latin(p):<span key={key++}>{greek(p)}</span>)}</span>;
 });
}
const FUNCTIONS=new Set(['sin','cos','tan','sec','ln','log','exp','sgn']);
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
function confusions(p:Problem){return p.steps.flatMap((s,i)=>(s.fields??[]).map(f=>{const by=new Map<string,string[]>();for(const m of f.mistakes??[])by.set(m.message,[...(by.get(m.message)??[]),m.expression]);return {key:`${i}:${f.id}`,label:f.label,symbol:slipSymbol(f.label),notes:[...by].map(([message,expressions])=>({message,expressions}))}})).filter(g=>g.notes.length>0)}
// THE WRONG EXPRESSIONS READ AS THE ANSWERS. Each row set the quantity's name, then an expression in the prose's
// full ink -- "y-component dEᵧ" over a bold 0, "Total potential V" over σ/(2ε₀) -- with nothing on the row saying
// it was wrong but a summary two screens up, and a student skimming for their notes copied "dEᵧ = 0", the very
// slip the sentence beside it warns against. Each is now a relation to the quantity it is mistaken for, dEᵧ ≠ 0,
// in the muted ink, and where a quantity's name has no symbol of its own, under a "Not".
const SLIP_SUB:Record<string,string>={'ₓ':'_x','ᵧ':'_y','ᵢ':'_i','₀':'_0'},SLIP_GREEK:Record<string,string>={'α':String.raw`\alpha `,'θ':String.raw`\theta `,'φ':String.raw`\varphi `};
/** The quantity's own symbol, as TeX, where its name ends in one -- "Charge element dQ", "x-component integrand
 * dEₓ/dx", "Projection factor cos α" -- and not where the name ends in what it is a part of ("Axial component
 * of dE" is not dE). */
function slipSymbol(label:string){
 const m=label.match(/(?:^|\s)((?:cos|sin) [αθφ]|d?[A-Z][ₓᵧᵢ₀]?(?:\/d[a-zαθφ])?|rᵢ|d[a-z]\/d[αθφ])$/u);
 if(!m||/\sof\s+\S+$/.test(label))return null;
 return m[1].replace(/^(cos|sin) /,'\\$1').replace(/[ₓᵧᵢ₀]/g,c=>SLIP_SUB[c]).replace(/[αθφ]/g,c=>SLIP_GREEK[c]).trim();
}
// `describe` names the thing on the figure this slider moves. Pointing at the control -- hover,
// or tab to it -- lights that thing up, and the pairing is learned by looking. It matters more
// than it sounds: with the numbers stripped off, a slider labelled "r" says nothing at all to a
// reader who has not yet worked out which mark on the drawing is r, and the only way left to
// find out was to drag it and hunt for whatever moved.
// `reason` is how the value moved -- a drag, a press on the track, a key -- for the one slider that
// has to care.
// THE SLIDER ITSELF HAD NO NAME. Its aria-label went on Base UI's group around it, and the range
// input a screen reader lands on is named only by the group's aria-labelledby -- so every control
// was read as "slider, 3", with no word for what it moves and no unit. The full phrase is now a
// hidden label both of them point at, and `format` says what the number is in: read aloud as
// "3 meters", printed nowhere, since the page shows no numerals.
const METERS:Intl.NumberFormatOptions={style:'unit',unit:'meter',unitDisplay:'long'};
const DEGREES:Intl.NumberFormatOptions={style:'unit',unit:'degree',unitDisplay:'long',maximumFractionDigits:1};
// AND THE CHARGE WAS A BARE NUMBER. Lengths read "3 meters" and the arc "180 degrees", but Q, λ, σ and λ₀
// read "2", or "minus 0.1" -- of what, the reader was not told. Intl has no unit for charge, so these say
// their own, in the units the model is written in (symbolic/physics.ts): one and many.
type Spoken=readonly [one:string,many:string];
const NANOCOULOMBS:Spoken=['nanocoulomb','nanocoulombs'],PER_METER:Spoken=['nanocoulomb per meter','nanocoulombs per meter'],PER_SQUARE_METER:Spoken=['nanocoulomb per square meter','nanocoulombs per square meter'];
function Range({label,value,min,max,step=1,onChange,describe,onDescribe,format,unit}:{label:string;value:number;min:number;max:number;step?:number;onChange:(n:number,reason?:string)=>void;describe?:string;onDescribe?:(k:string)=>void;format?:Intl.NumberFormatOptions;unit?:Spoken}){const id=useId();const [symbol,name]=splitSymbol(label);const point=(on:boolean)=>{if(describe)onDescribe?.(on?describe:'')};const spoken=useMemo(()=>unit?(text:string,n:number)=>`${text} ${unit[Math.abs(n)===1?0:1]}`:undefined,[unit]);return <div className="exp-range" onPointerEnter={()=>point(true)} onPointerLeave={()=>point(false)} onFocusCapture={()=>point(true)} onBlurCapture={()=>point(false)}><div><span>{symbol&&<i className="exp-sym">{greek(symbol)}</i>}<span className="exp-name">{name}</span></span></div><span id={id} className="sr-only">{label}</span><Slider aria-label={label} aria-labelledby={id} format={format} getAriaValueText={spoken} value={[value]} min={min} max={max} step={step} onValueChange={(v,details)=>onChange(Array.isArray(v)?v[0]:v,details?.reason)}/></div>}
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
export default function Explorer({welcome}:{welcome?:boolean}={}){
 const [id,setId]=useState<ProblemId>('bisector');const [path,setPath]=useState('angular');const [mode,setMode]=useState<Mode>('divide');const [paramsMap,setParamsMap]=useState<Partial<Record<ProblemId,Params>>>({});const [dark,setDark]=useState(false);const [ready,setReady]=useState(false);const [storageOK,setStorageOK]=useState(true);const [onboarding,setOnboarding]=useState(false);const [hideTour,setHideTour]=useState(false);const [cued,setCued]=useState(false);const [library,setLibrary]=useState(false);const [sidebarOpen,setSidebarOpen]=useState(true);const [showNumbers,setShowNumbers]=useState(false);const [components,setComponents]=useState(false);const [pair,setPair]=useState(false);const [progress,setProgress]=useState(1);const [selected,setSelected]=useState<number|null>(null);const [bounds,setBounds]=useState<[number,number]>([0,100]);const [limitsOpen,setLimitsOpen]=useState(true);const [slipsOpen,setSlipsOpen]=useState(true);const [limitIndex,setLimitIndex]=useState(0);const [highlight,setHighlight]=useState('');const [status,setStatus]=useState('');const [building,setBuilding]=useState(false);const [runAt]=useState(runClock);const [buildIndex,setBuildIndex]=useState(0);const [buildShown,setBuildShown]=useState(false);const [runPiece,setRunPiece]=useState(.7);const [laws,setLaws]=useState(false);const [lessonOpen,setLessonOpen]=useState(false);const [cameFrom,setCameFrom]=useState<{id:ProblemId;from:string}|null>(null);const toolsButton=useRef<HTMLButtonElement>(null);const build=useRef<{stop:()=>void}|null>(null);const clock=useRef({at:0,stopAt:0});const buildC=useRef(-1);const buildStep=useRef(-1);const reduced=useReducedMotion();const routeLabel=useId(),endnotesHeading=useId();const tourButton=useRef<HTMLButtonElement>(null),watchButton=useRef<HTMLButtonElement>(null),walk=useRef<HTMLDivElement>(null),reveal=useRef(false);
 // Held per lesson: `getProblem` builds the infinite line afresh on every call, and a new problem
 // object is a changed prop to everything memoised below.
 const p=useMemo(()=>getProblem(id,'angular'),[id]),derivationProblem=useMemo(()=>getProblem(id,path),[id,path]),params=paramsMap[id]??DEFAULT_PARAMS;const continuum=params.continuum;const count=partitionCount(params.slices,continuum);const geom=p.geometry,scalar=p.quantity==='V';const isInfinite=['infinite','semi','sheet'].includes(geom);const isRound=['ring','disk','arc'].includes(geom);const lim=p.limits[Math.min(limitIndex,p.limits.length-1)];
 // Storage is an external system; initialize after hydration and surface write failures without aborting the lesson.
 // A LINK IS THE WHOLE LESSON IT NAMES. Its values used to be laid over what the student had saved for
 // that lesson -- and a link leaves out every value at its default, so each of those came from the
 // student's own storage: a teacher's ?p=ring&distance=4.5 opened, for a student who had been there before
 // class, with the charge reversed and twelve pieces, the field pointing down against up on the
 // projector, and their address bar then rewritten with the mixture. Values a link does not give are the
 // defaults the teacher saw. A reload is unchanged, since the address is rewritten from the state on
 // every settle. A link with values but no lesson is the first lesson's, which is the only one whose
 // address used to leave its name out (serializeAssignment).
 // THE TOUR OPENS EVERY TIME THE SITE DOES, until the reader ticks "Don't show this again" inside it.
 // Skipping, finishing or closing it is not that choice -- a reader who closed it to look at the page
 // gets it again next visit -- and the Walkthrough button opens it whenever asked, with the box still
 // there to untick. A saved `seen: true` is the old version of the same choice: it was written once a
 // reader had closed the tour or had the start-here cue, so they are not ambushed by a dialog they had
 // already dealt with.
 // EXCEPT ON A TEACHER'S LINK. A student sent to a lesson -- the ring, the charge reversed, twelve pieces
 // -- has come for that lesson, often in class with the projector on it; a four-page dialog in front of
 // it is the first thing they would have to get rid of. The address is rewritten to name the lesson on
 // every settle, though, so a reload, a bookmark or a restored tab carries a lesson too: a link is the
 // reader's own when it names the lesson they last left, with the values they left it at, and then the
 // tour opens as on any visit. The start-here cue still greets a teacher's link: the students it is
 // sent to are exactly the first-time readers it is for, and it blocks nothing -- it is hidden from
 // screen readers, cannot be clicked, and goes at the first input.
 // AND ONCE A VISIT, NOT ONCE A LESSON. The site now opens on its home page (home/Site.tsx), so a visit
 // reaches its first lesson from a card there rather than from the bare address: that lesson is offered
 // the tour as the bare address was (`welcome` true), and a lesson entered again in the same visit -- home
 // and back -- is not (`welcome` false). Mounted on its own, the lesson decides from its address as above.
 // What the site says of this arrival, as it was when the lesson mounted: read once, by the effect below.
 const welcomed=useRef(welcome);
 // AND A LINK IS READ WHETHER OR NOT STORAGE CAN BE. The link and the storage were read inside one try, so a
 // browser that refuses storage -- Safari blocking all cookies, a school's cookie policy, a class page that
 // embeds the site in a sandboxed frame -- threw on the first line and skipped the link with it: the
 // student opened the Finite line instead of the lesson the teacher assigned, the address was rewritten
 // over the teacher's link, and the catch opened the tour over the lesson the teacher had put on the projector.
 // Storage is read on its own now, and what it cannot give is simply not there; the link is the lesson
 // whatever storage does. Without storage the tour cannot remember "Don't show this again", so it opens as on
 // a first visit -- and, as everywhere, not over a teacher's link.
 /** A stage of the run the address names, waiting for the lesson it names to be the one on screen. */
 const linkedStage=useRef(0);
 // THE VIEW A LINK NAMES (view=2d or view=3d), for its own lesson only (a change of lesson lets it go), and the view the
 // figure is in, for the address.
 const [linkedView,setLinkedView]=useState<{id:ProblemId;view:'2d'|'3d'}|null>(null);
 const [inSpace,setInSpace]=useState<boolean|null>(null);
 /* oxlint-disable react/react-compiler -- Reads storage and the address once, after hydration. */
 useEffect(()=>{
  let raw:string|null=null;
  try{raw=localStorage.getItem(STORAGE)}catch{setStorageOK(false)}
  // A save that is not JSON is no save; storage itself is still working.
  const parsed=(()=>{try{return raw?JSON.parse(raw):null}catch{return null}})();
  const saved=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  const pm:Partial<Record<ProblemId,Params>>={};for(const pr of PROBLEMS)if(saved.params?.[pr.id]&&typeof saved.params[pr.id]==='object')pm[pr.id]=atRest(saved.params[pr.id]);
  const url=parseAssignment(typeof location==='undefined'?'':location.search);const linked=url.id??(url.params||url.stage?'bisector':undefined);
  if(linked&&isReady(linked)){setId(linked);pm[linked]=atRest({...DEFAULT_PARAMS,...url.params});if(url.stage)linkedStage.current=url.stage;if(url.view)setLinkedView({id:linked,view:url.view})}else if(PROBLEMS.some(p=>p.id===saved.id)&&isReady(saved.id))setId(saved.id);
  setDark(saved.dark===true);setShowNumbers(saved.showNumbers===true);setSidebarOpen(saved.sidebarOpen!==false);setParamsMap(pm);
  if(url.mode)setMode(url.mode);if(url.pair)setPair(true);if(url.components)setComponents(true);
  // Only "Don't show this again" keeps the tour shut. An old `seen: true` is from before that box,
  // and from before this tour: a returning reader meets the new tour and the box to stop it. They have
  // been here, though, so the start-here arrow is not drawn for them.
  const before=saved.seen===true,hide=saved.hideTour===true;
  const own=typeof saved.id==='string'&&serializeAssignment({id:linked,params:{...url.params,continuum:0}})===serializeAssignment({id:saved.id,params:{...saved.params?.[saved.id],continuum:0}});
  setHideTour(hide);setCued(saved.cued===true||before);setOnboarding(!hide&&(welcomed.current??(!linked||own)));
  setReady(true);return()=>{build.current?.stop();build.current=null}},[]);
 /* oxlint-enable react/react-compiler */
 // oxlint-disable-next-line react/react-compiler -- Synchronize persisted preferences; quota/security errors update the save indicator.
 // Not before the saved settings are read: the page's first commit has dark false, and toggling then took
 // off the dark class the document's head had already set from storage (index.html), flashing the light
 // ground for a frame on every load in the dark theme.
 useEffect(()=>{if(ready)document.documentElement.classList.toggle('dark',dark)},[dark,ready]);
 // Paper is white whatever the screen is. The print sheet keeps backgrounds (print-color-adjust:
 // exact), so the dark theme printed as pale text on slabs of ink -- the lesson goes to the
 // printer in the light theme and comes back as it was.
 //
 // AND THE FIELD'S LAYERS GO TO PAPER AS PICTURES. The ring, the disk, the sheet and their two potentials are
 // drawn in WebGL, whose buffer is not kept once it has gone to the screen: printed from the light theme,
 // those five lessons came out with floating letters over an empty figure -- no ring, no grid, no field lines,
 // no arrow -- and only the dark theme's switch to paper happened to make the scene draw again in time. Each
 // field layer is asked for its picture here (snapshot.ts: drawn afresh, in the paper's theme, and read in the
 // same task), and the picture is laid over it until the print is done. A picture rather than a redraw,
 // because Chrome's print preview lays the page out again when the paper, the scale or the margins change,
 // and no second beforeprint comes then.
 //
 // AND EVERY LIMITING CASE PRINTS. On screen they are tabs, and only the chosen one's panel is mounted; on
 // paper that was a strip of dead buttons over one check of two or three. While printing, each is a section
 // of its own (`printing`, below).
 const [printing,setPrinting]=useState(false);
 useEffect(()=>{
  const root=document.documentElement;let wasDark=false;
  const toPaper=()=>{
   wasDark=root.classList.contains('dark');if(wasDark)root.classList.remove('dark');
   flushSync(()=>setPrinting(true));
   // Copied canvas to canvas, in the task the layer drew in: an image made from the picture's address is
   // decoded later, and the page may already have gone to the printer by then.
   for(const layer of document.querySelectorAll<HTMLElement>('.explorer-app .cd-field-stage, .explorer-app .cd-field-canvas')){
    const from=layer.querySelector('canvas');
    if(!redrawLayer(layer)||!from?.width||!from.height)continue;
    const copy=document.createElement('canvas');copy.className='cd-print-snap';copy.setAttribute('aria-hidden','true');copy.width=from.width;copy.height=from.height;
    try{copy.getContext('2d')?.drawImage(from,0,0)}catch{continue}
    layer.appendChild(copy);layer.classList.add('is-print-snapped');
   }
  };
  const back=()=>{
   for(const img of document.querySelectorAll('.explorer-app .cd-print-snap'))img.remove();
   for(const layer of document.querySelectorAll('.explorer-app .is-print-snapped'))layer.classList.remove('is-print-snapped');
   if(wasDark)root.classList.add('dark');wasDark=false;
   setPrinting(false);
  };
  window.addEventListener('beforeprint',toPaper);window.addEventListener('afterprint',back);
  return()=>{window.removeEventListener('beforeprint',toPaper);window.removeEventListener('afterprint',back);};
 },[]);
 // Persistence is debounced because a drag changes a parameter every frame. Writing the
 // whole parameter map to localStorage per frame is a synchronous serialize-and-store on
 // the main thread, and writing the URL per frame trips the browser's own rate limit --
 // Safari and Chrome throw SecurityError past 100 replaceState calls in 10 seconds, which
 // reached the error boundary and took the whole view down mid-drag. Only the settled
 // value is written; React clears the pending timer on every change.
 //
 // WHAT IS SAVED IS WHAT CLOSE WOULD LEAVE, NOT A FRAME OF THE RUN. The run drives the same state the
 // controls do -- the mode, the mirror partner, the components, how far the cut has gone to the limit
 // -- and these two saved it like a setting. Mid-run the address bar read ?mode=sum, so a teacher who
 // copied it after demonstrating shared a frozen stage with no run on screen; a run left at its end
 // saved continuum=1, and every later visit opened on a smooth rod "In the limit" with the board still
 // saying ΔQ. While the run is open, both write the lesson as closing the run puts it back -- and what
 // was saved or linked before that fix is read back with its cut (atRest).
 useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{try{const saved=buildShown?{...paramsMap,[id]:{...params,continuum:0}}:paramsMap;localStorage.setItem(STORAGE,JSON.stringify({id,dark,params:saved,hideTour,cued,showNumbers,sidebarOpen}))}catch{setStorageOK(false)}},SETTLE);return()=>clearTimeout(t)},[id,dark,paramsMap,params,ready,hideTour,cued,showNumbers,sidebarOpen,buildShown]);
 // THE ADDRESS ALWAYS NAMES ITS LESSON. The first lesson at its defaults wrote no query at all, so a
 // teacher who shared the address bar for Finite line shared the bare home page, and every student who had
 // used the site before opened their own last lesson instead.
 //
 // AND A NEW LESSON IS A NEW PLACE IN THE HISTORY. Every change replaced the entry, so Back -- the
 // Chromebook's back key, a two-finger swipe -- went from the third lesson straight out of Field Builder
 // to the classroom page that linked it. A change of lesson now pushes an entry, and a slider still only
 // replaces the one it is in: one push per lesson, nowhere near the browser's rate limit.
 //
 // Worked out with the page rather than in the timer, so a frame of the run -- which writes the cut into the
 // values, and which the address leaves out -- no longer restarts the timer: only a change the address shows.
 //
 // AND WHILE THE RUN IS OPEN, THE STAGE IT IS ON. The one link a teacher wants to send -- "open the ring held at What
 // cancels" -- could not be made: the address carried nothing of the run, so pausing there and copying it shared the
 // lesson at rest. It names the stage now (stage=3), never a frame of it, and a link with one opens the run held on
 // that stage's finished frame (`linkedStage`, below). Closing the run takes it away again.
 // ...AND THE VIEW, where it is not the lesson's own, as every other value is left out at its default: view=3d for a rod,
 // a line or the arc turned into space, view=2d for a lesson that opens in space (the ring, the disk, the sheet) drawn
 // flat. A link without it opens each lesson its own way, as every link before it did.
 const opensInSpace=['ring','disk','sheet'].includes(geom);
 const view=inSpace===null||inSpace===opensInSpace?undefined:inSpace?'3d' as const:'2d' as const;
 const address=`?${serializeAssignment(buildShown?{id,params:{...params,continuum:0},stage:buildIndex+1,view}:{id,mode,params:{...params,continuum:0},pair,components,view})||`p=${id}`}`;
 useEffect(()=>{if(!ready||typeof history==='undefined')return;
  const t=setTimeout(()=>{
   // Still guarded: a throw here would reach the error boundary and blank the lesson.
   if(location.search!==address)try{const shown=parseAssignment(location.search).id;if(shown&&shown!==id)history.pushState(null,'',address);else history.replaceState(null,'',address)}catch{/* rate-limited or blocked: the URL is a convenience, the lesson is not */}},SETTLE);
  return()=>clearTimeout(t)},[ready,id,address]);
 // A LINK TO THE LESSON, FROM THE PAGE. The address bar was the only way to share one, and nothing said so: a
 // teacher presenting in full screen on a Chromebook, or preparing on a phone, never sees it. The link is the
 // one the address bar holds -- the lesson and every value that differs from its defaults, never a frame of
 // the run. Where the page may not write to the clipboard (a class page embedding it without permission) it
 // copies the old way, through a selection, and failing that says where the link is.
 const [copied,setCopied]=useState('');
 useEffect(()=>{if(!copied)return;const t=setTimeout(()=>setCopied(''),3200);return()=>clearTimeout(t)},[copied]);
 async function copyLink(){
  const url=location.origin+location.pathname+address;
  let ok=false;
  try{await navigator.clipboard.writeText(url);ok=true}catch{
   const back=document.activeElement instanceof HTMLElement?document.activeElement:null;
   // oxlint-disable-next-line typescript/no-deprecated -- the one way left where the clipboard API is refused.
   try{const t=document.createElement('textarea');t.value=url;t.setAttribute('readonly','');t.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(t);t.select();ok=document.execCommand('copy');t.remove()}catch{ok=false}
   back?.focus({preventScroll:true});
  }
  const said=ok?buildShown?`Link to this lesson, held at ${buildNow.name}, copied.`:'Link to this lesson copied.':'The link to this lesson is in the address bar.';
  setCopied(said);setStatus(said);
 }
 // Back and Forward return to the lesson the entry names, as it was then: the entry holds every value that
 // differed from the defaults when the reader left it.
 const revisit=useSteady(()=>{
  const url=parseAssignment(location.search),to=url.id??(url.params?'bisector':undefined);
  if(!to||!isReady(to))return;
  if(to!==id)changeDistribution(to);
  setParamsMap(old=>({...old,[to]:atRest({...DEFAULT_PARAMS,...url.params})}));
  if(url.mode)setMode(url.mode);if(url.pair)setPair(true);if(url.components)setComponents(true);if(url.stage){if(to===id)openLinked(url.stage);else linkedStage.current=url.stage}if(url.view)setLinkedView({id:to,view:url.view})
 });
 useEffect(()=>{window.addEventListener('popstate',revisit);return()=>window.removeEventListener('popstate',revisit)},[revisit]);
 // Each lesson names its own tab, so history, the tab strip and a screen reader's window title can
 // tell a ring from a sheet.
 useEffect(()=>{document.title=`${p.title} · Field Builder`},[p.title]);

 const stages=useMemo(()=>buildStages(p),[p]);
 const buildNow=stages[Math.min(buildIndex,stages.length-1)];
 // Open is its own state, not inferred from the clock. It used to be `building || buildAt > 0`,
 // and the first stage starts at exactly zero -- so clicking the first stage's marker, or pausing
 // on its opening frame, threw the reader out of the run and back to the start button.
 const buildOpen=buildShown;
 // The piece being added walks along the charge while the sum builds, so it is always plain
 // which piece is going in. Where the charge has a mirror about P's axis the figure adds a piece and its
 // mirror together, and works out from the stage's own progress which pair is going in and lights both
 // (see `pairs.ts`): the run's piece it is handed is all it needs from here.
 const following=buildOpen&&buildNow.key==='add';
 // The piece a lesson rests on until the reader picks one: the fourth, except on the sheet, whose
 // fourth ring is so far out that its far edge runs through P in the opening view and P reads as
 // lying in the sheet. The sheet rests on the largest ring still drawn clearly below P instead --
 // an angle at P, so lifting P hardly ever moves it to another ring. See `sheetPiece`.
 const restingPiece=geom==='sheet'?sheetPiece(count,params.distance):3;
 // The run shows its own piece, held at one place along the charge rather than at one index: the
 // limit multiplies the pieces, and a fixed index slid from most of the way along the rod to its
 // very end as they shrank.
 const activeIndex=following?activeIntervalIndex(count,bounds,progress):buildOpen?Math.min(count-1,Math.floor(runPiece*count)):Math.min(count-1,Math.max(0,selected??restingPiece));
 // While the run is open, the figure lights the factor the current stage puts into the integral
 // -- the distance as the first arrow is drawn, the angle as the parts cancel -- unless the
 // reader is pointing at something else, which always wins.
 const figureHighlight=highlight||(buildOpen?buildNow.term:'');
 // The line of the derivation the run has reached, for the player to carry where the panel is
 // out of sight -- and once the pieces have shrunk away, the integral done and its answer.
 // "Shrunk away" is the figure's own test (ChargeDiagram: dQ, dE and "In the limit" at .999). This page used
 // .99, so the board's answer, the transport's "Doing the integral gives this" and, on a phone, the page's
 // glide down to them all arrived about half a second before the figure stopped saying ΔQ, ΣΔE and "Cut into
 // pieces" -- and a pause or a drag let go in that half second left the two contradicting each other. The run
 // writes the cut as exactly 1 at the end of its motion, so the board and the figure now turn on one frame.
 const cutAway=continuum>=IN_THE_LIMIT,settledRun=buildIndex===stages.length-1&&cutAway;
 // EVERY STAGE'S ALGEBRA, HANDED OVER AT ONCE. The transport used to hold only the current stage's
 // line, and each line is a different height -- forty-six pixels, then sixty-four, then sixty-nine --
 // so on a phone the page moved under the reader at every stage, just as the figure started to move.
 // It now sets all five in one cell and shows the current one, the way it already sets its sentences.
 // What cancels carries the cancellation itself above what survives, as the board does: with only
 // ΔE_x under the heading "What cancels", a phone reader read ΔE_x as the part that cancels.
 // And a component that survives beside the one being built is set under it, as the board sets it: on the
 // lessons with no mirror partner, What cancels said both parts survive and showed one of them, and E_y
 // then arrived in the answer with no line for it.
 // And a line that finishes itself before the last stage finishes here too. Where the sum is exact -- the ring
 // and the two potentials whose pieces are all one distance from P -- Add them up ends on its own answer,
 // = (k/R)ΣΔQ_i = kQ/R, and the board writes it; the phone's transport said "the column is exactly the
 // potential at P" over the bare sum and never showed why. The last stage's finish is the settled chain's.
 // Without the board's alignment strut (\phantom{V}): it follows its line on the same row (BuildPlayer).
 // AND HOWEVER MANY ROWS IT HAS. Written in what every rᵢ is, the ring's exact sum is too wide for one row, and
 // the board sets it over two, an aligned block whose rows each open behind the strut; the strut was looked for
 // only at the very start of the line, so on the ring and its potential the transport ended Add them up on a
 // gap the width of E_z, and its rows stood under nothing. The rows go to the transport one by one (`rows`).
 // And under each line, what its new symbol stands for, as the board says it (BuildPlayer).
 const playerSteps=useMemo(()=>{const lines=boardLines(p);return lines.map((line,i)=>[...(line.cancels?[{cancels:line.cancels}]:[]),line.tex,...(line.finish&&i<lines.length-1?[{finish:rows(line.finish),strut:strutOf(line.finish)}]:[]),...(line.where?[{where:line.where}]:[]),...(line.also?[{also:line.also}]:[])])},[p]);
 // And once the pieces have shrunk away, how the integral comes out and its answer -- every line of
 // the answer, not the first: on the lessons whose answer has two components, the figure's arrow
 // labelled E leans, and an answer of E_x alone said it pointed along x. The answer is stated whether
 // or not the last line has a step of its own to finish on: four potential lessons leave their
 // integral unsimplified on the board, and ended on it here, so on a screen without the panel the run
 // never said what V is. The two go separately because a short window has room for the answer alone.
 const playerChain=useMemo(()=>{const finish=boardLines(p).at(-1)?.finish;return settledRun&&finish?[finish]:NONE},[p,settledRun]);
 const playerAnswer=useMemo(()=>settledRun?resultLines(p):NONE,[p,settledRun]);
 // Over the answer, where it came from, in the panel's words (EquationWorkbench): the pieces added up where
 // the sum was exact all along, the integral done everywhere else -- and, where the answer has an E_y the
 // run built no line for, that it is the surviving part added up the same way.
 const playerLead=useMemo(()=>{const two=['endpoint','ramp','semi'].includes(p.id);return (exactSum(p)?'Adding up the pieces gives this, exactly, however many there are.':two?'Doing the integrals gives this.':'Doing the integral gives this.')+(two?String.raw` $E_y$ is the surviving $\Delta E_y$ added up the same way.`:'')},[p]);
 // What the figure and the board are told about the run, held still until it actually changes.
 // The run's clock goes with it, and where the stage on screen starts and how long it lasts: a stage
 // that moves within itself reads its own moment off the clock, so a pause or a seek holds it there.
 // And the piece the run talks about, which the adding stage hands over to the chain.
 const figureBuild=useMemo(()=>buildOpen?{key:buildNow.key,name:buildNow.name,index:buildIndex,count:stages.length,paused:!building,clock:runAt,start:stageStart(stages,buildIndex),seconds:buildNow.seconds,piece:Math.min(count-1,Math.floor(runPiece*count))}:undefined,[buildOpen,buildNow,buildIndex,stages,building,runAt,runPiece,count]);
 const boardBuild=useMemo(()=>({open:buildOpen,index:buildIndex,playing:building,settled:cutAway}),[buildOpen,buildIndex,building,cutAway]);
 // The board, given only what it reads. It was handed the cut, the sum's progress and the mode as well, which it
 // reads none of (EquationWorkbench), and the lesson's values with the run's cut written into them -- so it
 // re-rendered whole on every frame of Add them up and Shrink them, about nine hundred a run, half a
 // millisecond each on a laptop and some four times that on a Chromebook, in the two stages that move most.
 // It reads the values only to check a bound typed against the charge's size, so they reach it without the cut.
 const {distance:bd,size:bs,charge:bq,phi:bp,slices:bn,element:be}=params;
 // And the limiting cases, open with the page now, take the same: handed the run's cut, the open card summed its
 // seventy samples again on every frame of Shrink them -- a fifth of a frame's cost there on a slow machine -- for a
 // sweep that reads none of it.
 const boardParams=useMemo(()=>({distance:bd,size:bs,charge:bq,phi:bp,slices:bn,element:be,continuum:0}),[bd,bs,bq,bp,bn,be]);
 const updateParams=useCallback((partial:Partial<Params>)=>{setParamsMap(old=>({...old,[id]:{...(old[id]??DEFAULT_PARAMS),...partial}}));},[id]);
 /** Whether the run came to rest by itself -- played to the end of what it was asked to play -- rather
  * than being stopped: the board looks again at the one and leaves the other alone (see the follow). */
 const stoppedByRun=useRef(false);
 /** A drag along the run's bar is under way: it moves the run without narrating or following it. */
 const [scrubbing,setScrubbing]=useState(false);const quiet=useRef(false);
 /** THE RUN WAITS FOR THE PAGE TO STOP MOVING. Opening the run glides the page up until the board reaches its
  * sticky top -- a hundred and eighty to three hundred pixels over a third of a second -- and the clock was
  * already running under it: the first cut is drawn at a fifth of a second, so the moment Cut it up is about
  * happened on a figure sliding up the screen. A glide the opening starts holds the clock (revealRun): for
  * `ms` from the next frame, or until the page says its scroll has ended, whichever is first. Kept in the
  * frames' own time, so a test that hands the run its frames sees the same short wait. A reader who pauses,
  * seeks or steps has taken the run in hand, and it no longer waits. */
 const hold=useRef({ms:0,until:0});
 function stop(){build.current?.stop();build.current=null;stoppedByRun.current=false;hold.current={ms:0,until:0};setBuilding(false)}
 function changeDistribution(next:string){stop();setId(next as ProblemId);setSelected(null);setProgress(1);setBounds([0,100]);setLibrary(false);setLimitIndex(0);setStatus('');setHighlight('');setCameFrom(null);endBuild();setLinkedView(null);}
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
  // a second says nothing at all. And only the stage's short line while it plays, the same words the
  // transport shows: the full caption is twenty-seven to fifty-four words, ten to twenty seconds of
  // speech against stages of five to eight, so one run queued over a minute of narration for half a
  // minute of figure and the voice fell further behind the picture at every stage. The caption is
  // read when the run holds still -- the rule the screen keeps, short while moving, whole when held.
  // Not while the bar is being dragged: a drag from the first stage to the last put the full caption of
  // every stage it crossed into the live region, about a hundred and fifty words queued for a second of
  // movement. The stage it is let go on is read whole, once.
  if(index!==buildStep.current){buildStep.current=index;if(!quiet.current)setStatus(`${stage.name}. ${stage.line}`)}
 }
 /** The run has stopped where it is: say the whole of what this stage shows.
  *
  * And at the end of a run played through, say that the answer has arrived and where. A sighted reader
  * sees it appear -- at the foot of the board, or under the figure where the board is a screen away --
  * but the board's answer is not a live region, so a screen reader's run ended on "make the pieces
  * smaller without end" and never said that it had produced anything. Where, not what: the answer is
  * read as math where it sits. */
 function holdStatus(ended=false){
  const caption=stageAt(stages,runAt.get()).stage.caption;
  // Where the answer is depends on the layout, not on a width: on a short wide window the board stays
  // beside the figure, and only there is it held to the window while the run is open.
  const panel=document.querySelector<HTMLElement>('.explorer-app .exp-workspace>.ew-panel');
  const under=!!panel&&getComputedStyle(panel).overflowY!=='auto';
  setStatus(ended?`${caption} The answer for the whole distribution is now ${under?'under the figure':'at the foot of the board'}.`:caption);
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
  * full length, either side of the axis, and are seen to cancel.
  *
  * The sheet's piece is its resting one, the largest ring still drawn clearly below P: three
  * quarters of the way out was the ring 54 to 72 degrees below P, whose far edge ran through P in the
  * opening view, so P looked as if it lay in the sheet for the whole run.
  *
  * And the run is the argument for the WHOLE distribution, so it opens on all of it. A bracket the
  * reader had dragged to half the rod stayed on, and the run's piece could sit outside it -- the
  * captions then said the sideways parts cancel and bend back to the axis, which a half-rod sum does
  * not do.
  *
  * And never the piece with no far end. On the endless lines the outermost piece is the angle running off to
  * infinity, and with three or four pieces the three-quarters rule landed on it: Cut it up bracketed, and One
  * piece talked about, a piece with no length to bracket, its tag climbing toward the title. The semi-infinite
  * line takes the one inside it. So does the infinite line from four pieces up, where that one's mirror is
  * another piece; at three its only bounded piece is the middle one, its own mirror, and What cancels would
  * have nothing to show -- there it keeps the outer angle, which has a partner. */
 function openRun(){if(buildShown)return;let i=geom==='ring'?Math.floor(count*(1-.5/(2*Math.PI)))%count:geom==='bisector'?count-1:geom==='sheet'?sheetPiece(count,params.distance):count-1-Math.floor((count-1)/4);
  if(geom==='semi'||geom==='infinite'&&count>3)i=Math.min(i,count-2);
  setRunPiece((i+.5)/count);setBounds([0,100]);setBuildShown(true)}
 function playBuild(from:number,until:number){
  roomBack(from);
  build.current?.stop();build.current=null;setHighlight('');openRun();
  setBuilding(true);setScrubbing(false);
  if(from===0)buildC.current=-1;
  clock.current={at:from,stopAt:until};
  stoppedByRun.current=false;
  const done=()=>{build.current=null;stoppedByRun.current=true;setBuilding(false);holdStatus(clock.current.at>=totalSeconds(stages)-.01)};
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
   const h=hold.current;if(h.ms>0)hold.current={ms:0,until:now+h.ms};
   if(now<hold.current.until){last=now;raf=requestAnimationFrame(frame);return}
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
  if(building){stop();holdStatus();return}
  const total=totalSeconds(stages),at=runAt.get();
  playBuild(at>=total-.01?0:at,total);
 }
 /** The button above the figure. It opens the run, then makes sure the transport it opened is
  * where the reader can reach it: focus moves to its play button, which is the control that was
  * just pressed, now in its new place -- and if the transport has opened below the bottom of the
  * window, the page moves up just far enough to show it, never so far that the figure's top goes. */
 function watch(){reveal.current=true;runBuild()}
 /** STEPPING BACK KEEPS THE ROOM UNDER THE BOARD. Once the run settles, the follow trims the room under the
  * board to nothing (--run-room), since the answer is the end of it. Going back -- Previous, an earlier stage,
  * Play again -- takes the answer away and starts closing the Shrink step's rows, and with no room under the
  * board the browser pulled the board's scroll back in that same frame: the whole board lurched a hundred
  * and thirty to a hundred and seventy pixels before the follow's glide began. So the room goes back to its
  * full default here, before the board is shorter, and the follow sizes it again once the rows have closed.
  * Only on a move back to an earlier stage or out of the settled answer: both always bring the follow. */
 function roomBack(at:number){
  if(!(at<runAt.get()-.001))return;
  const {index,stage,local}=stageAt(stages,at),cut=stage.continuum[0]+(stage.continuum[1]-stage.continuum[0])*motionAt(stage,local);
  if(!(index<buildIndex||settledRun&&cut<IN_THE_LIMIT))return;
  document.querySelector<HTMLElement>('.explorer-app .exp-workspace>.ew-panel')?.style.removeProperty('--run-room');
 }
 /** Go to a moment and hold still there: a click on a stage, or a drag along the bar. */
 function seekBuild(at:number,dragging=false){roomBack(at);stop();openRun();setHighlight('');setScrubbing(dragging);quiet.current=dragging;applyBuild(Math.max(0,Math.min(totalSeconds(stages),at)));quiet.current=false;if(!dragging)holdStatus()}
 /** Play one stage from its start and stop at its end -- from the derivation's lines and the
  * previous/next buttons, which is how a reader takes the argument one step at a time. Stopping a
  * hair before the end keeps the stage's own finished frame on screen, not the next one's first. */
 function stepBuild(i:number){const at=stageStart(stages,i),end=at+stages[i].seconds;playBuild(at,i===stages.length-1?end:end-.001)}
 /** The transport's Next and Previous, its keys and the clicker's: a run that is playing goes on playing from
  * the stage they go to, and one that is held plays that stage and holds again. They always played one stage
  * and stopped, so Next pressed while the whole run played quietly ended it after the next stage -- Shrink
  * them never came -- while a click on a stage paused and Play went on: three ways of moving, three outcomes,
  * and nothing on screen saying the playback had changed from the run to a step. A board line still plays
  * its one step: it says so. */
 function moveTo(i:number){if(building)playBuild(stageStart(stages,i),totalSeconds(stages));else stepBuild(i)}
 /** A link's stage: the run opened and held on the stage's finished frame -- where a stage played through stops
  * (stepBuild), and for the last, the answer arrived -- once the lesson the link names is the one on screen, as
  * a click on the stage and a drag to its end would leave it. Held, not playing: the teacher talks over it. */
 const openLinked=useSteady((n:number)=>{const i=Math.max(0,Math.min(stages.length,n)-1);seekBuild(i===stages.length-1?totalSeconds(stages):stageStart(stages,i)+stages[i].seconds-.001)});
 useEffect(()=>{const n=linkedStage.current;if(!ready||!n)return;linkedStage.current=0;openLinked(n)},[ready,stages,openLinked]);
 // Closing puts the figure back where the run found it, the partition included: a reader who
 // watched the pieces shrink away and then closed should not be left looking at a smooth rod
 // with no way to tell why it stopped being cut up.
 function endBuild(){build.current?.stop();build.current=null;setBuilding(false);setBuildShown(false);runAt.set(0);setBuildIndex(0);buildC.current=-1;buildStep.current=-1;setPair(false);setComponents(false);setMode('divide');setProgress(1);updateParams({continuum:0});}
 function chooseMode(next:Mode){setMode(next);if(next==='project'&&!scalar)setComponents(true);if(next==='integrate'){setProgress(1);stop()}}
 /** The skip link's target. With a written lesson, its title: the lesson's lead and "Read the lesson" sit between
  * the title and Watch it build, and the lead asks to be read before the build, so a skip straight to the button
  * jumped a keyboard and a screen reader past the very text the lesson starts with. The next Tab is "Read the
  * lesson", the one after it Watch it build. While the run is open, its play button, as before: the run is what
  * the reader is in the middle of. A geometry with no lesson yet goes to Watch it build. */
 function skipToLesson(e:{preventDefault():void}){e.preventDefault();const play=watchButton.current?null:walk.current?.querySelector<HTMLElement>('.bp-play');if(play)play.focus();else if(lesson||!watchButton.current)focusLesson();else watchButton.current.focus()}
 /** Put the focus on the lesson's title, without scrolling to it: where a jump to the lesson, or into another
  * lesson, leaves a keyboard and a screen reader.
  *
  * THE TITLE, NOT THE LESSON. The focus used to go to <main> itself, made focusable for it -- and that made
  * every click inside the lesson focus <main>, so the keys a reader pages with scrolled <main>'s scroller,
  * the window, and never the board held beside the figure: Space, Page Down and the arrows could not reach
  * the board's last three steps or its answer, a click on the board's own text notwithstanding. A focusable
  * title is not a scroller, and a click on text that is not inside anything focusable leaves the focus on the
  * page, where Chromium scrolls whatever was clicked. And <main> drew the page's focus halo round the whole
  * lesson, a thousand pixels square, and gave a screen reader an unnamed landmark to land on; the title says
  * where the reader is. */
 function focusLesson(){document.getElementById(LESSON_TITLE)?.focus({preventScroll:true})}
 /** Where the page was last sent, and until when it may still be gliding there. */
 const glide=useRef({to:0,until:0});
 /** Show the transport under the figure: scroll down just far enough for its bottom to clear the
  * window's, never so far that the drawing's own top goes. The drawing, not its card: on a short
  * window the card's heading row and the point's coordinates above the drawing may go, which is what
  * leaves room for the sentence that says what the stage is doing.
  *
  * Not only as the run opens. Below 1000 pixels the transport carries the algebra and grows with it,
  * and at the end it adds the integral and the answer -- about a hundred and fifty pixels that arrived
  * below the window, so the moment the run builds toward happened off-screen. It is looked at again on
  * every stage and when the run settles. It only ever scrolls down, and only while the transport runs
  * off the bottom, so a reader who has scrolled away to read the board is left there.
  *
  * At the settle the answer outranks the top of the drawing. On a Chromebook snapped to half its screen
  * (683 by 657) the transport's answer still ended below the window in every lesson, and the run ended,
  * as far as the reader could see, on the integral it set out to do. So once the pieces have shrunk away
  * the page may go on until the transport's own bar is at the top -- the figure has finished moving.
  *
  * And as the run opens beside the board, the page goes up until the board reaches its sticky top, if
  * the drawing can spare it. While the run is open the board is held to the window's height from that
  * top (explorer.css), but where the page had not yet scrolled it sat lower, and its last lines -- the
  * answer among them -- were under the window: a wheel over the board scrolled the board alone, so they
  * could not be reached without moving the pointer off it. Only as the run opens, so a reader who has
  * scrolled back up to the title is not pulled down again at the next stage. */
 //
 // AND A STEP BACK OUT OF THE ANSWER BRINGS THE DRAWING BACK. The settle may take the drawing's top off the
 // window so the answer fits; going back from it -- Previous, an earlier stage, Play again -- takes the answer
 // away and shrinks the transport, and the earlier stages replayed with the figure's top and the stage's own
 // name cut off while the window had room to spare under the shorter transport. Leaving the settle scrolls
 // back up toward the drawing's top, as far as the transport's foot allows.
 const revealRun=useSteady((opening:boolean,unsettled=false)=>{
  const player=walk.current;if(!player)return;
  const card=player.closest('.exp-diagram-card'),drawing=card?.querySelector('.cd-stage')??card;
  if(unsettled){
   const top=drawing?.getBoundingClientRect().top??0;
   if(top<0){const up=Math.max(top-12,-(window.innerHeight-(player.getBoundingClientRect().bottom+16)));if(up<-1)window.scrollBy({top:up,behavior:reduced?'auto':'smooth'})}
   return;
  }
  const over=player.getBoundingClientRect().bottom+16-window.innerHeight;
  // Only where the transport carries the answer: beside the board, on a short wide window, it does not.
  const answer=player.querySelector('.bp-answer'),carries=!!answer&&answer.getClientRects().length>0;
  const keep=settledRun&&carries?player.querySelector('.bp-bar')??drawing:drawing;
  const room=Math.max(0,(keep?.getBoundingClientRect().top??0)-12);
  const panel=opening?document.querySelector<HTMLElement>('.explorer-app .exp-workspace>.ew-panel'):null;
  const style=panel?getComputedStyle(panel):null;
  const lift=panel&&style?.overflowY==='auto'?panel.getBoundingClientRect().top-(parseFloat(style.top)||0):0;
  const want=Math.max(over,lift);
  if(!(want>1&&room>0))return;
  // A scroll this began a moment ago may still be gliding, and a new one replaces it: a stage clicked
  // just as the run opened cut the board's lift short. So the page aims at the further of the two.
  const y=window.scrollY,now=performance.now(),pending=now<glide.current.until?glide.current.to:y;
  const to=Math.min(Math.max(pending,y+want),y+room);
  if(to>y+1){window.scrollTo({top:to,behavior:reduced?'auto':'smooth'});glide.current={to,until:now+900};
   // The run's first moments wait for the glide the opening starts (see `hold`). An instant scroll -- reduced
   // motion -- has nothing to wait for.
   if(opening&&!reduced&&building){hold.current={ms:GLIDE_HOLD,until:0};window.addEventListener('scrollend',()=>{hold.current={ms:0,until:0}},{once:true})}}
 });
 const wasOpen=useRef(false),wasSettled=useRef(false);
 // A WINDOW THAT CHANGES SHAPE MID-RUN IS LOOKED AT AGAIN. A student who turned the phone sideways to see the
 // figure larger had the sentence and the controls drop under the window, beside a board now showing an
 // earlier step, and nothing caught up until the next stage began -- or at all, with the run paused. A change
 // of the window's shape, once it has stopped changing, counts as a move for the follow and the reveal below.
 // Its width, that is. A phone's browser resizes the window whenever its toolbar slides in or out, which it
 // does as the page is scrolled: counted, a student scrolling up to the title mid-run was pulled back down
 // to the transport at every turn of the thumb. Turning the phone, or snapping a window, changes the width.
 const [relaid,setRelaid]=useState(0);
 useEffect(()=>{
  if(!buildOpen)return;
  let t=0,wide=window.innerWidth;const on=()=>{window.clearTimeout(t);t=window.setTimeout(()=>{if(window.innerWidth===wide)return;wide=window.innerWidth;setRelaid(n=>n+1)},150)};
  window.addEventListener('resize',on);window.addEventListener('orientationchange',on);
  return()=>{window.clearTimeout(t);window.removeEventListener('resize',on);window.removeEventListener('orientationchange',on)};
 },[buildOpen]);
 // Not while the bar is being dragged: the page moving under a drag moves the bar out from under the
 // pointer. It looks once, when the drag is let go.
 useEffect(()=>{
  if(!buildOpen){wasOpen.current=false;wasSettled.current=false;return}
  if(scrubbing)return;
  const opening=!wasOpen.current;wasOpen.current=true;
  const unsettled=wasSettled.current&&!settledRun;wasSettled.current=settledRun;
  // Opened from the button: focus moves to the play button, the control that was just pressed, now
  // in its new place.
  if(reveal.current){reveal.current=false;walk.current?.querySelector<HTMLButtonElement>('.bp-play')?.focus({preventScroll:true})}
  revealRun(opening,unsettled);
 },[buildOpen,buildIndex,settledRun,scrubbing,revealRun,relaid]);
 // THE BOARD FOLLOWS THE RUN WHERE IT SITS BESIDE THE FIGURE. The panel grows from about seven
 // hundred pixels to sixteen hundred as its lines arrive, so on a laptop its sticky top could not keep
 // the current line on screen: during Add them up and Shrink them the line being written was below
 // the window, the transport's own copy of the algebra is hidden at that width, and the run's algebra
 // was visible nowhere. While the run is open the panel is held to the window's height (explorer.css)
 // and scrolled inside itself -- never the window, which would take the figure away -- so the current
 // line, and at the end the answer, is in view beside the figure that is drawing it. Looked at again
 // once the line's own reveal has settled, since it is still opening when this first runs.
 //
 // AND AGAIN WHEN THE RUN STOPS. The board is told whether the run plays or holds, and a held board
 // has drawn more than a playing one: it wrote the stage's note under its line, about a hundred and
 // thirty pixels, and a run played to its end held on Shrink them -- so the note arrived after the
 // answer had been brought into view and pushed it back under the window, cut through its fraction on
 // every laptop. Seeking never showed it, because a seek holds still from the start. What a held board
 // shows is the board's to decide, so the follow looks again whenever the run stops, and takes in a
 // step's foot, not only its top.
 //
 // BUT ONLY WHEN THE RUN STOPS ITSELF. Looking again whenever the run stopped included the reader
 // stopping it: a reader who wheeled the board back to an earlier line and pressed Pause to read it had
 // the board glide away from it, back to the current step, taking what they had paused for. The board
 // now looks when the run moves to another stage, settles, starts playing, or comes to rest by itself --
 // never when the reader pauses it, picks a piece, or drags along the bar (it looks once the drag ends).
 //
 // AND AT WHAT IS STILL OPENING. At the settle the answer appears while the line above it -- the Shrink
 // step's finished integral -- eases open over the next half second, so the answer was placed in view and
 // then pushed under the panel's foot, and chased back up when the second look came 650 ms later: at the
 // run's climax the answer arrived, sank out of sight and glided back. A line easing open already holds
 // its full height inside its clipped row, so the follow counts what each row has still to grow and aims
 // where the lines will be, not where they are.
 //
 // AND THE ROOM UNDER THE BOARD IS ONLY WHAT THE LINE NEEDS. The spacer that lets a line be brought to
 // the top as it opens was a whole window tall for the whole run (explorer.css), so a reader who wheeled
 // past the answer found the board all but empty: the last card at the top and five hundred pixels of
 // nothing. The follow sets it to what the place it scrolls to needs, and no more.
 const followed=useRef({index:-1,settled:false,relaid:0});
 useEffect(()=>{
  if(!buildOpen){followed.current={index:-1,settled:false,relaid};document.querySelector<HTMLElement>('.explorer-app .exp-workspace>.ew-panel')?.style.removeProperty('--run-room');return}
  if(scrubbing)return;
  const moved=followed.current.index!==buildIndex||followed.current.settled!==settledRun||followed.current.relaid!==relaid;
  followed.current={index:buildIndex,settled:settledRun,relaid};
  if(!moved&&!building&&!stoppedByRun.current)return;
  const follow=(final:boolean)=>{
   const panel=document.querySelector<HTMLElement>('.explorer-app .exp-workspace>.ew-panel');
   if(!panel||getComputedStyle(panel).overflowY!=='auto')return;
   // What of the panel is on screen: until the page has scrolled far enough for it to stick, its
   // foot can still be under the window's.
   const box=panel.getBoundingClientRect(),view=Math.min(panel.clientHeight,window.innerHeight-box.top-panel.clientTop);
   const at=(el:Element)=>{const r=el.getBoundingClientRect();return {top:r.top-box.top-panel.clientTop+panel.scrollTop,bottom:r.bottom-box.top-panel.clientTop+panel.scrollTop}};
   const step=panel.querySelector('.db-step.is-here'),result=settledRun?panel.querySelector('.ew-result.is-shown'):null;
   // Each row still easing open, where it is and how much it has still to grow.
   // Against the row that eases open round it (.db-then, .db-reveal), not the line itself: part way through
   // its opening the line is already taller than the row showing it, so measured against itself it said a
   // hundred and fifty pixels were still to come when a hundred were, and a second look inside the opening
   // sent the board a hundred pixels too far, to glide back at the re-check.
   const growing=[...panel.querySelectorAll<HTMLElement>('.db-then.is-shown>.db-then-in,.db-step:not(.is-next) .db-reveal>.db-body')].map(n=>({top:at(n).top,more:Math.max(0,n.scrollHeight-(n.parentElement??n).clientHeight)})).filter(g=>g.more>1);
   /** Where a point now on the board will be once every row above it has opened. */
   const later=(y:number)=>y+growing.reduce((sum,g)=>g.top<y?sum+g.more:sum,0);
   let to=panel.scrollTop;
   if(step){const now=at(step),s={top:later(now.top),bottom:later(now.bottom)};
    if(s.top<panel.scrollTop||s.top-panel.scrollTop>view*.4)to=Math.max(0,s.top-72);
    // Its foot too, as far as its head allows.
    if(s.bottom-to>view-16)to=Math.max(to,Math.min(s.top-16,s.bottom+16-view));
   }
   // The answer outranks the step's head: if the two cannot both be in view, the answer is.
   if(result){to=Math.max(to,later(at(result).bottom)+16-view)}
   // Room under the board's last card for the board to reach `to` (or to stay where it is, while it
   // glides there) -- what the board does not have of it yet -- and not a pixel more.
   // The first look only adds room, never takes it away: rows above may still be closing as it runs (a step
   // back), and room trimmed to the taller board would run out under the board as they finish. The second
   // look, once every row has settled, sizes it exactly.
   const last=panel.lastElementChild,end=last?at(last).bottom:panel.scrollHeight;
   const need=Math.ceil(Math.max(0,Math.max(to,panel.scrollTop)+view-end)),had=panel.style.getPropertyValue('--run-room');
   if(final||(had!==''&&need>parseFloat(had)))panel.style.setProperty('--run-room',`${need}px`);
   // AND ONCE THE BOARD HAS GLIDED BACK, THE ROOM IT GLIDED BACK FROM GOES. The first look is taken while the
   // page is still gliding down to the figure, with the board's foot under the window: it sees less of the board
   // than there will be and sends it too far. The second look then has to keep room for where the board has got
   // to, or it would jump there, and the board glided back up leaving that room as blank card under the answer
   // -- seventy pixels once the lesson's lead made the page's glide longer. Trimmed when the glide ends.
   if(final&&panel.scrollTop>to+2){panel.removeEventListener('scrollend',trim);trim=()=>{panel.style.setProperty('--run-room',`${Math.ceil(Math.max(0,Math.max(to,panel.scrollTop)+view-end))}px`)};panel.addEventListener('scrollend',trim,{once:true})}
   if(Math.abs(to-panel.scrollTop)>2)panel.scrollTo({top:to,behavior:reduced?'auto':'smooth'});
  };
  let trim=()=>{};
  follow(false);
  const again=window.setTimeout(()=>follow(true),reduced?0:650);
  return()=>{window.clearTimeout(again);document.querySelector<HTMLElement>('.explorer-app .exp-workspace>.ew-panel')?.removeEventListener('scrollend',trim)};
 },[buildOpen,buildIndex,settledRun,building,scrubbing,reduced,relaid]);
 // THE BOARD HELD AT REST SAYS THAT IT GOES ON. Held to the window beside the figure, it scrolls inside itself,
 // and the only sign was a thin scrollbar -- which macOS, iPadOS, ChromeOS and Android draw as nothing until
 // the board is scrolled. Its rounded foot fell under What cancels and read as a finished card, and wheeling
 // the page from the figure or the margin never brought up Add them up, Shrink them or the answer. While more
 // of the board lies below, its foot fades out (explorer.css, [data-more]). Not while the run is open: it
 // keeps the board on the line being written, and the room under it is always "more".
 // A data attribute, not a class: the board renders its own className, and would write over one set here.
 useEffect(()=>{
  const panel=document.querySelector<HTMLElement>('.explorer-app .exp-workspace>.ew-panel');
  if(!panel)return;
  if(buildOpen){panel.removeAttribute('data-more');return}
  let frame=0;
  const look=()=>{frame=0;const more=getComputedStyle(panel).overflowY==='auto'&&panel.scrollTop+panel.clientHeight<panel.scrollHeight-2;if(more!==panel.hasAttribute('data-more'))panel.toggleAttribute('data-more',more)};
  const soon=()=>{if(!frame)frame=requestAnimationFrame(look)};
  look();
  panel.addEventListener('scroll',soon,{passive:true});
  const sizes=new ResizeObserver(soon);sizes.observe(panel);for(const child of panel.children)sizes.observe(child);
  return()=>{cancelAnimationFrame(frame);panel.removeEventListener('scroll',soon);sizes.disconnect()};
 },[buildOpen,p,derivationProblem]);
 // Closing the run takes away the button that had the focus. It goes back to Watch it build, the
 // button the run replaced -- not to the top of the document, which is where it fell, leaving a
 // keyboard reader with no visible focus and a screen reader with no place. Only for Close itself:
 // changing lesson or re-cutting the charge also closes the run, and must not pull the focus.
 // Without scrolling, since the button is normally in view -- except on a phone on its side, where the
 // run had taken the page down to the transport and the focused button sat above the window with only
 // its ring's lower edge showing. There the page comes back to it -- with room above it for its ring,
 // which a scroll that only brought the button itself to the window's edge left cut off.
 const refocus=useRef(false);
 useEffect(()=>{if(!buildOpen&&refocus.current){refocus.current=false;const b=watchButton.current;b?.focus({preventScroll:true});const top=b?.getBoundingClientRect().top??0;if(top<12)window.scrollBy({top:Math.floor(top)-12,behavior:'auto'})}},[buildOpen]);
 // Steady versions of the handlers the memoised parts are given.
 // A piece the reader picks while the run is open becomes the run's piece: the run talks about the
 // piece they chose, and the choice outlives Close. It used to pause the run and change nothing on
 // screen, against the run's own promise that it drives the state the controls drive. (While the sum
 // builds, the walking piece follows the sum, so there a click still only pauses.)
 const choose=useSteady(changeDistribution),select=useSteady((i:number)=>{stop();if(buildOpen)setRunPiece((i+.5)/count);setSelected(i)}),pickMode=useSteady(chooseMode),step=useSteady(moveTo);
 // ONE LESSON HANDS THE READER TO THE NEXT, AND IT SHOWS. The lesson's last line swapped the page for the lesson
 // it named and jumped to the top: nothing said a new lesson had opened, the list's mark could be scrolled out of
 // sight, and there was no way back but the browser's. Now the page glides to the top (jumps, under reduced
 // motion), the focus is on the new title, the list brings the new lesson into view, and a line under the title
 // says where the reader came from and why, with the way back. A screen reader hears the same in the live region.
 // The lesson being left is written into the address first, so the browser's Back returns to it even when it
 // was opened from a bare address and has not been written yet.
 const handoff=useRef(false);
 const follow=useSteady((to:ProblemId,from:string)=>{
  const was=id;
  try{if(location.search!==address)history.replaceState(null,'',address)}catch{/* the address is a convenience */}
  changeDistribution(to);setCameFrom({id:was,from});handoff.current=true;
  setStatus(`${getProblem(to,path).title}. ${from}.`);
  window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});focusLesson();
 });
 const goBack=useSteady((to:ProblemId)=>{changeDistribution(to);handoff.current=true;setStatus(`Back to ${getProblem(to,path).title}.`);window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});focusLesson()});
 // The open lesson is in view in the list, whichever way it was opened: the list scrolls on its own, beside the
 // lesson, so a lesson far down it could be open with nothing in the column saying which.
 useEffect(()=>{
  const row=document.querySelector<HTMLElement>('.exp-lessons .exp-shape-button.active'),list=row?.closest<HTMLElement>('.exp-sidebar [data-slot=sidebar-content]'),column=list?.closest<HTMLElement>('.exp-sidebar');
  const glide=handoff.current;handoff.current=false;
  if(glide)focusLesson();
  if(!row||!list||!column||list.scrollHeight<=list.clientHeight+1)return;
  // Measured where the list will be once the page is at its top, under the header, since that is where it is
  // going: the part of the list the window shows there is what has to hold the row.
  const top=column.getBoundingClientRect().top+(glide?window.scrollY:0),shown=Math.max(80,Math.min(list.clientHeight,window.innerHeight-Math.max(0,top)-parseFloat(getComputedStyle(column).paddingTop||'0')));
  const at=row.getBoundingClientRect().top-list.getBoundingClientRect().top+list.scrollTop,h=row.offsetHeight;
  if(at>=list.scrollTop+8&&at+h<=list.scrollTop+shown-8)return;
  list.scrollTo({top:Math.max(0,Math.min(list.scrollHeight-list.clientHeight,at-(shown-h)/2)),behavior:glide&&!reduced?'smooth':'auto'});
 },[id,sidebarOpen,reduced]);
 // The lesson at the top (src/lessons): which geometry's, its disclosure, and its last line's way to the figure.
 // "Go to Watch it build" brings the button to the middle of the window and gives it the focus, so a keyboard
 // is on it and Enter starts the run; it does not start the run itself, which would play the first stage off
 // the screen while the page was still gliding down to it. With the run already open, to the figure.
 const lesson=useMemo(()=>lessonFor(id),[id]);
 const toggleLesson=useSteady(()=>setLessonOpen(v=>!v));
 // OPENING THE LESSON IS A DECISION ABOUT THIS LESSON, NOW. It was one flag for the whole site, kept in storage:
 // a student who opened one lesson's text met every lesson open on every later visit, four phone screens of
 // prose above the figure, and a teacher who read it once put it on the projector that way. The lead's whole
 // design is that the figure keeps the first screen until a reader asks for more, so each lesson opens shut.
 // oxlint-disable-next-line react/react-compiler -- Shuts the text when the lesson changes.
 useEffect(()=>{setLessonOpen(false)},[id]);
 const toBuild=useSteady(()=>{const target=watchButton.current??document.querySelector<HTMLElement>('.exp-diagram-card');if(!target)return;target.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});target.focus({preventScroll:true})});
 const play=useSteady(runBuild),seek=useSteady((at:number,dragging:boolean)=>seekBuild(at,dragging)),close=useSteady(()=>{refocus.current=true;endBuild()});
 // SPACE PAUSES THE RUN, AS IT DOES A VIDEO. A teacher presenting clicks the title or the blank beside the
 // figure to point at something, which puts the focus on the lesson itself, and then presses Space for
 // "pause, let's talk": the page scrolled a window down, the drawing went off the top, and the run went on
 // playing above the window. While the run is open, Space with the focus on nothing in particular -- or on
 // the drawing itself, which a drag to turn the 3D figure focuses -- plays and pauses it. Every control keeps
 // its own keys: a button, a slider, a piece of the figure, a summary.
 // Space alone. K did it too, and a single letter that acts on the page with no way to turn it off is the
 // shortcut a speech-input user dictating with nothing focused sets off by accident (WCAG 2.1.4).
 //
 // AND A PRESENTER'S CLICKER STEPS THE STAGES. A classroom clicker sends Page Down and Page Up (some send the
 // arrows), and with the focus on the lesson -- or on Play, after a mouse press -- Page Down scrolled the window
 // four hundred pixels, took the drawing off the top of the projector and left the stage where it was: in the
 // one mode where the page holds the figure in place on purpose. With the run open they now go to the next
 // stage and back, as the transport's own buttons do; Previous first goes back to the start of the stage it is
 // in, as a media player's does. Sliders keep Page Up and Page Down: Base UI moves a slider by them.
 //
 // ONLY WHILE THE DRAWING IS ON SCREEN, FOR THE PAGE KEYS. Below it -- the board under the figure on a
 // Chromebook in half its screen, a phone, a page zoomed to 200% -- they page, as anywhere else: they used to
 // play the next stage on a figure a screen above the window, and the page never moved. And from wherever the
 // focus is but a control with its own use for them: in the 3D lessons a drag to turn the figure focuses the
 // drawing, and after "play this step" a line of the board has it, and from both Page Down scrolled the window
 // a page -- the projector lost the figure and the stage stayed where it was. The arrows still act only with
 // the focus on nothing in particular: the figure turns by them, and a slider moves.
 const clicker=useSteady((dir:1|-1)=>{
  if(dir>0){if(buildIndex<stages.length-1)moveTo(buildIndex+1);return}
  moveTo(runAt.get()-stageStart(stages,buildIndex)>.6||buildIndex===0?buildIndex:buildIndex-1);
 });
 useEffect(()=>{
  if(!buildOpen)return;
  const key=(e:KeyboardEvent)=>{
   if(e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;
   const t=e.target instanceof Element?e.target:null;
   const idle=!t||t===document.body||t.id===LESSON_TITLE;
   if(e.key==='PageDown'||e.key==='PageUp'){
    if(!idle&&t?.closest('input,textarea,select,[contenteditable],[role=slider],.bp,[role=dialog],[role=menu],[role=listbox]'))return;
    if(!drawingOnScreen())return;
    e.preventDefault();if(!e.repeat)clicker(e.key==='PageDown'?1:-1);return;
   }
   if(e.key==='ArrowRight'||e.key==='ArrowLeft'){if(!idle)return;e.preventDefault();if(!e.repeat)clicker(e.key==='ArrowRight'?1:-1);return}
   if(e.key!==' '||e.repeat)return;
   if(!idle&&!(t instanceof SVGSVGElement&&t.closest('.exp-diagram-card .cd-stage')))return;
   e.preventDefault();play();
  };
  window.addEventListener('keydown',key);
  return()=>window.removeEventListener('keydown',key);
 },[buildOpen,play,clicker]);
 // A line of the board plays its stage on the figure. Below 1000 pixels the board is a screen or two
 // under the figure, so the stage played on a figure and a transport that were both out of sight and
 // the reader saw only the board's line change. The focus stays on the board, where the reader is
 // working.
 // The whole drawing, not half of it. The page went to the drawing only when less than half of it was
 // on screen, and in the 3D lessons P, the cancelling arrows and the stage's name sit in its top part:
 // with the top two-fifths scrolled away, "What cancels" played on a ring and a grid while the
 // cancellation happened above the window. Any of it off screen now brings it back -- to its top where
 // it is taller than the window, or where the top is what is missing; otherwise just its foot.
 const boardStep=useSteady((i:number)=>{
  stepBuild(i);
  const drawing=document.querySelector<HTMLElement>('.explorer-app .exp-diagram-card .cd-stage');
  if(!drawing)return;
  const r=drawing.getBoundingClientRect(),h=window.innerHeight;
  if(r.top<0||r.bottom>h)window.scrollBy({top:r.top<0||r.height>h-24?r.top-12:r.bottom-h+12,behavior:reduced?'auto':'smooth'});
 });
 // A NEW CUT KEEPS THE RUN'S PLACE. Moving the pieces slider while the run was open closed it: the transport
 // vanished, Watch it build came back, and nothing said why -- while the distance slider, beside it, left the
 // run playing. The run is a demonstration of these controls, so the cut changes under it as P's distance
 // does: the stage, the moment, how far the pieces have shrunk and the run's piece (a place along the
 // charge, not an index) all hold, and the figure is simply cut again.
 const recut=useSteady((slices:number)=>{updateParams(buildOpen?{slices}:{slices,continuum:0})}),resetGeometry=useSteady(()=>{stop();updateParams({...DEFAULT_PARAMS});setProgress(1);setBounds([0,100]);setSelected(null)});
 // The lesson list, the library and the sliders: none of them moves while the run plays, and the
 // list and the library are fifteen lessons, each with its drawn glyph, every one rebuilt per render.
 const lessonList=useMemo(()=>{
   // Families first, then a divider and the ones still being drawn. Kept in the list rather
   // than hidden: a reader can see the whole plan and tell that the gap is deliberate.
   // The link is rendered by SidebarMenuButton, which gives it the row's glyph and name as its content.
   // oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
   const item=(pr:typeof PROBLEMS[number])=>{const soon=!isReady(pr.id);return <SidebarMenuItem key={pr.id}><SidebarMenuButton className={'exp-shape-button '+(id===pr.id?'active':'')+(soon?' is-soon':'')} isActive={id===pr.id} aria-current={id===pr.id?'page':undefined} {...(soon?{disabled:true,'aria-disabled':true,title:SOON_NOTE}:{render:<a href={lessonHref(pr.id)}/>})} onClick={(e:React.MouseEvent)=>{if(soon||!inPlace(e))return;e.preventDefault();choose(pr.id)}}><span className="shape-icon"><ShapeGlyph id={pr.id}/></span><span>{pr.short}</span></SidebarMenuButton></SidebarMenuItem>};
   // The family's heading heads its list, and the list has no name of its own: named as well, every family
   // was read twice down the column -- "Straight rods, heading level 2", then "list, Straight rods".
   const group=(label:string,items:typeof PROBLEMS,soon=false)=><div className="exp-family" key={label}><h2 className="exp-family-name">{label}</h2><SidebarMenu className={soon?'exp-soon-group':undefined}>{items.map(item)}</SidebarMenu></div>;
   const soon=PROBLEMS.filter(pr=>!isReady(pr.id));
   // GAUSS'S LAW, COMING SOON: its planned lessons by name, as text. Not links and not disabled buttons, so Tab
   // goes from the last lesson straight on past them, and a screen reader reads a list of what is coming.
   const planned=PLANNED_SECTIONS.has(GAUSS.key)&&<div className="exp-family exp-planned" key={GAUSS.key}><h2 className="exp-family-name">{GAUSS.label} <span className="exp-soon-tag">{PLANNED_LABEL}</span></h2><SidebarMenu>{GAUSS.lessons.map(l=><SidebarMenuItem key={l.key}><div className="exp-planned-row" aria-disabled="true"><span className="shape-icon"><PlannedGlyph id={l.key}/></span><span>{l.name}</span></div></SidebarMenuItem>)}</SidebarMenu></div>;
   return <>{families(PROBLEMS.filter(pr=>isReady(pr.id))).map(g=>group(g.label,g.items))}{planned}{soon.length>0&&group('Coming soon',soon,true)}</>;
  },[id,choose]);
 const libraryCards=useMemo(()=>{
    // Named by the lesson's name alone, described by its sentence: read as one string, a card was
    // the name and then the whole subtitle before a reader could tell which card it was.
    const card=(pr:typeof PROBLEMS[number])=>{const soon=!isReady(pr.id);const inside=<><ShapeGlyph id={pr.id} size={26}/><strong id={`lib-${pr.id}`}>{pr.short}</strong><span id={`lib-${pr.id}-about`}>{soon?SOON_NOTE:pr.subtitle}</span></>;const named={className:'exp-library-card'+(pr.id===id?' selected':'')+(soon?' is-soon':''),'aria-labelledby':`lib-${pr.id}`,'aria-describedby':`lib-${pr.id}-about`};
     return soon?<button key={pr.id} type="button" {...named} disabled aria-disabled>{inside}</button>
      :<a key={pr.id} href={lessonHref(pr.id)} {...named} aria-current={pr.id===id?'page':undefined} onClick={e=>{if(!inPlace(e))return;e.preventDefault();choose(pr.id)}}>{inside}</a>};
    // Grouped exactly as the lesson list is, so the two pickers tell one story about the subject.
    const block=(label:string,items:typeof PROBLEMS)=><div className="exp-library-family" key={label}><h3 className="exp-family-name">{label}</h3><div className="exp-library-grid">{items.map(card)}</div></div>;
    const soon=PROBLEMS.filter(pr=>!isReady(pr.id));
    // Gauss's law, as in the list: named, marked, and never a link.
    const planned=PLANNED_SECTIONS.has(GAUSS.key)&&<div className="exp-library-family exp-planned" key={GAUSS.key}><h3 className="exp-family-name">{GAUSS.label} <span className="exp-soon-tag">{PLANNED_LABEL}</span></h3><div className="exp-library-grid">{GAUSS.lessons.map(l=><div key={l.key} className="exp-library-card is-planned" aria-disabled="true"><PlannedGlyph id={l.key} size={26}/><strong>{l.name}</strong><span>{l.about}</span></div>)}</div></div>;
    return <>{families(PROBLEMS.filter(pr=>isReady(pr.id))).map(g=>block(g.label,g.items))}{planned}{soon.length>0&&block('Coming soon',soon)}</>;
   },[id,choose]);
 const {distance,size,charge,phi,slices}=params;
 const parameterGrid=useMemo(()=><div className="parameter-grid">{geom!=='arc'&&<Range describe="distance" onDescribe={setHighlight} label={['ring','disk','sheet'].includes(geom)?'Height z':geom==='axial'?'End distance a':'Distance r'} format={METERS} value={distance} min={.5} max={6} step={.05} onChange={distance=>updateParams({distance})}/>} {!isInfinite&&<Range describe="size" onDescribe={setHighlight} label={isRound?'Radius R':'Length L'} format={METERS} value={isRound?size/2:size} min={isRound?.5:1} max={isRound?4:8} step={.05} onChange={v=>updateParams({size:isRound?v*2:v})}/>}<Range describe="charge" onDescribe={setHighlight} label={geom==='sheet'?'Surface density σ':geom==='ramp'?'Peak density λ₀':['infinite','semi'].includes(geom)?'Line density λ':'Total charge Q'} unit={geom==='sheet'?PER_SQUARE_METER:geom==='ramp'||['infinite','semi'].includes(geom)?PER_METER:NANOCOULOMBS} value={charge} min={-5} max={5} step={.1} onChange={(next,reason)=>updateParams({charge:snapCharge(next,charge,reason)})}/>{/* In degrees, on the same grid as before (a tenth of π to 2π in hundredths of π): run in
     units of π, the slider read "1.5" to a screen reader, which meant 1.5π and said nothing of it. */}{geom==='arc'&&<Range describe="angle" onDescribe={setHighlight} label="Arc angle φ" format={DEGREES} value={phi*180/Math.PI} min={18} max={360} step={1.8} onChange={v=>updateParams({phi:v*Math.PI/180})}/>}{/* How finely the charge is cut. It used to live inside one step of the walkthrough, so the
     one control that shows the sum closing in on the integral was three clicks deep. Named by what the run cuts:
     the disk, the sheet and the disk's potential are cut into rings -- the stage is "One ring", the board says
     "the N rings" -- and the slider under them alone said Pieces. */}<Range describe="pieces" onDescribe={setHighlight} label={geom==='disk'||geom==='sheet'?'Rings N':'Pieces N'} value={slices} min={3} max={30} onChange={recut}/><button onClick={resetGeometry} className="text-button exp-reset" aria-label="Reset geometry" title="Reset geometry"><RotateCcw size={13}/></button></div>,[geom,isInfinite,isRound,distance,size,charge,phi,slices,updateParams,recut,resetGeometry]);
 /** The offline copy, made in the light theme whatever the screen is in -- it is for paper, as the
  * print sheet is -- and put back the moment the figure has been read. */
 function saveCopy(){
  const root=document.documentElement,wasDark=root.classList.contains('dark');
  let figure='';
  if(wasDark)root.classList.remove('dark');
  try{const stage=document.querySelector('.explorer-app .cd-stage');figure=stage?figureCopy(stage):''}
  finally{if(wasDark)root.classList.add('dark')}
  // The paper names the live lesson it came from, values and all -- the same address "Copy a link" writes --
  // so a student holding it can open the setup it describes rather than the lesson's defaults.
  downloadArtifact(`field-builder-${id}.html`,artifactHtml({...lessonArtifact(p,derivationProblem,location.origin+location.pathname+address),svg:figure}));
 }
 // THE PAGE'S STATES ARE CLASSES SET HERE, NOT SELECTORS THAT LOOK DOWN THE PAGE FOR THEM. The rules
 // for the open run were written as `.exp-workspace:has(.exp-walk.is-open)`, and with them Chromium
 // re-matched the workspace on every change inside it -- each label moved, each arrow redrawn -- and
 // restyled the board's thousands of KaTeX nodes with it: the arc's What cancels, the lesson's central
 // moment, ran at twenty frames a second, and every stage boundary dropped frames. A class costs one
 // restyle when the run opens, settles or closes. (tests/page-styles.test.ts keeps :has out of the sheet.)
 // THE CUE WAITS FOR THE PAGE'S FACES. It is placed once, under Watch it build, and on a first visit it was
 // placed while the title was still set in the fallback face: when the serif arrived a moment later the title
 // took a second line, the button moved down thirty pixels, and the arrow's head was left inside its label --
 // "Watc‸ it build", the page's first instruction to a new student, for nine seconds.
 const [faces,setFaces]=useState(false);
 useEffect(()=>{let on=true;const f=requestAnimationFrame(()=>{(document.fonts?.ready??Promise.resolve()).then(()=>{if(on)setFaces(true)},()=>{if(on)setFaces(true)})});return()=>{on=false;cancelAnimationFrame(f)}},[]);
 const related=p.link&&isReady(p.link.id)?{...p.link,short:PROBLEMS.find(x=>x.id===p.link?.id)?.short??''}:null;
 const back=cameFrom&&isReady(cameFrom.id)?{...cameFrom,short:PROBLEMS.find(x=>x.id===cameFrom.id)?.short??''}:null;
 const running=buildOpen?' is-running'+(settledRun?' is-settled':''):'',cueing=ready&&!cued&&!onboarding;
 return <div className={`explorer-app ${showNumbers?'with-numbers':'symbolic-view'}${cueing?' is-cueing':''}`}>{/* Twenty tab stops -- the header, all fifteen
     lessons, the list toggle and the library -- stood between a keyboard and the lesson's one button.
     The first stop now goes straight to it (or to the run's play button, while the run is open). */}
 <a className="skip-link" href="#lesson" onClick={skipToLesson}>Skip to the lesson</a><header className="exp-header"><Brand/>{/* FIVE ACTIONS BECAME TWO AND A MENU. Walkthrough is how a reader starts, and the theme
     switch is read as often as the page is; print, save a copy and the repository are things
     a reader does at most once and never in the middle of a derivation, so they stop taking
     three of the five slots above the lesson. Every one keeps the name it had, so it is the
     same control in a quieter place. */}
 <div className="exp-header-right"><button ref={tourButton} type="button" className="text-button tour-button" aria-label="Walkthrough" onClick={()=>setOnboarding(true)}><CircleHelp size={16}/><span>Walkthrough</span></button><a className="text-button tour-button guide-link" href={GUIDE_HREF} aria-label="How to use this site" onClick={e=>{if(!inPlace(e))return;e.preventDefault();navigate(GUIDE_HREF)}}><GraduationCap size={16}/><span>How to use</span></a><Hint label={dark?'Switch to light theme':'Switch to dark theme'}><button className="icon-button" onClick={()=>setDark(!dark)} aria-label={dark?'Switch to light theme':'Switch to dark theme'}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></Hint><DropdownMenu><Hint label="Lesson tools"><DropdownMenuTrigger ref={toolsButton} className="icon-button no-print" aria-label="Lesson tools"><MoreHorizontal size={17}/></DropdownMenuTrigger></Hint><DropdownMenuContent className="exp-tools-menu" align="end" sideOffset={8}><DropdownMenuItem onClick={()=>setLaws(true)}><BookOpen size={15}/>The laws behind every lesson</DropdownMenuItem><DropdownMenuItem onClick={()=>{void copyLink()}}><LinkIcon size={15}/>Copy a link to this lesson</DropdownMenuItem><DropdownMenuItem onClick={printLesson}><Printer size={15}/>Print this lesson</DropdownMenuItem><DropdownMenuItem onClick={saveCopy}><Download size={15}/>Save an offline copy of this lesson</DropdownMenuItem><DropdownMenuItem render={<a href="https://github.com/malekTheCoder/field-builder" target="_blank" rel="noreferrer" aria-label="View Field Builder on GitHub"/>}><GitBranch size={15}/>View Field Builder on GitHub</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>
 <SidebarProvider className={`exp-shell ${sidebarOpen?'library-expanded':'library-collapsed'}`} style={{'--sidebar-width':'196px'} as CSSProperties}>{sidebarOpen&&<Sidebar collapsible="none" className="exp-sidebar"><SidebarContent><nav className="exp-lessons" aria-label="Lessons">{lessonList}</nav><div className="exp-nav-bottom"><p>One law.<br/>Every geometry.</p><MathText tex={scalar?String.raw`dV=\frac{k\,dQ}{r_i}`:String.raw`d\mathbf E=\frac{k\,dQ}{r_i^2}\hat{\mathbf r}_i`}/><LawsReference quantity={p.quantity} label="The laws behind it" className="text-button exp-laws-link"/><span>{storageOK?'Your settings stay on this device.':'Settings are kept for this visit.'}</span></div></SidebarContent></Sidebar>}
 <main id="lesson" className="exp-main"><div className="exp-breadcrumb"><Hint label={sidebarOpen?'Hide the lesson list':'Show the lesson list'}><button type="button" className="exp-library-toggle" aria-expanded={sidebarOpen} aria-label={sidebarOpen?'Hide the lesson list':'Show the lesson list'} onClick={()=>setSidebarOpen(v=>!v)}><PanelLeft size={16}/></button></Hint>{/* THE SAME LESSON WAS NAMED THREE TIMES IN THREE INCHES: lit in the list, as the tail of a
     breadcrumb, and then in full as the title. The crumb said it least well of the three, so
     the trail is now just the way back out to the library -- which on a narrow screen, where
     the list is not there at all, is the only way to another lesson. Its chevron makes it look like a
     way back; it says that it opens a picker. */}
<div className="exp-crumbs"><button type="button" className="exp-crumb-link" aria-haspopup="dialog" aria-expanded={library} onClick={()=>setLibrary(true)}><ChevronLeft size={13} aria-hidden="true"/>Charge library</button></div></div><div className={'exp-heading'+(lesson?' has-lesson':'')}><div><h1 id={LESSON_TITLE} tabIndex={-1}>{p.title}</h1>{/* Where the reader came from, while they are still here: gone the moment they go elsewhere or reload. */}{back&&<p className="exp-came-from"><span>{greek(back.from)}.</span> <a className="exp-came-back" href={lessonHref(back.id)} onClick={e=>{if(!inPlace(e))return;e.preventDefault();goBack(back.id)}}><ArrowLeft size={14} aria-hidden="true"/>Back to {back.short}</a></p>}{/* With a written lesson its lead says what the page finds, a line below: the subtitle said it a third time, with the panel's problem, before the figure, and on a short laptop its line was room the drawing lost. */}{!lesson&&<p>{p.subtitle}</p>}</div></div>
 {lesson&&<LessonIntro lesson={lesson} open={lessonOpen} onToggle={toggleLesson} onBuild={toBuild}/>}
 <div className={'exp-workspace'+running}><div className="exp-visual-column"><section className={'exp-diagram-card mode-'+mode+' focus-'+highlight+running+(buildOpen&&scrubbing?' is-scrubbing':'')} aria-label="Interactive field visualization"><div className="exp-diagram-heading"><div><MathText tex={p.coordinate}/></div>
  {/* THE LESSON'S ONE BUTTON, AT THE TOP OF ITS FIGURE. It sat under the figure and its toolbar,
      past the bottom of a laptop's window -- its top at 919 pixels on a 1440 by 900 screen -- so
      a first-time reader never saw the feature the lesson is built around. Here it is on the first
      screen at any size, opposite the point it is about; the transport it opens still plays under
      the figure, beside the controls it drives. */}
  {/* While the run is open the button is gone, and the row it held up shrank by four to eight
      pixels, moving the whole figure up as the run opened and down again on Close. An empty strut
      keeps the row's height. */}
  {buildOpen&&<span className="exp-watch-hold" aria-hidden="true"/>}
  {!buildOpen&&<div className="exp-watch">
   <span className="exp-watch-note">Five steps, about half a minute</span>
   <button ref={watchButton} type="button" className="exp-watch-button" onClick={watch} title="Five steps, about half a minute. Pause or step through at any point."><Play size={13} fill="currentColor" strokeWidth={0}/>Watch it build</button>
  </div>}
 </div><ChargeDiagram compact problem={p} params={params} setParams={updateParams} count={count} continuum={continuum} selected={activeIndex} onSelect={select} progress={progress} components={components} pair={pair} mode={mode} boundRange={bounds} onBoundRangeChange={setBounds} highlight={figureHighlight} build={figureBuild} view={linkedView?.id===id?linkedView.view:undefined} onViewChange={setInSpace}/>{/* ONE WAY IN. There used to be two buttons here -- "Watch it build" and "Walk me through the
      integral" -- which told the same argument twice, in different words, in different steps,
      and neither one touched the equation beside the figure. The run is now the walkthrough as
      well: it plays, pauses, scrubs and steps one stage at a time, and the derivation in the
      panel arrives with it. */}
  {buildOpen&&<div ref={walk} className="exp-walk is-open"><BuildPlayer stages={stages} clock={runAt} index={buildIndex} playing={building} math={playerSteps} chain={playerChain} answer={playerAnswer} lead={playerLead}
    onPlay={play} onSeek={seek} onStep={step} onClose={close}/></div>}
</section>
 <section className="exp-parameters">{parameterGrid}</section>
 {/* The sentence names the two tabs: without it they were an unnamed list of two. */}
 {id==='infinite'&&<div className="exp-method"><span id={routeLabel}>Explore another route to the same result</span><Tabs value={path} onValueChange={v=>{setPath(String(v));setBounds([0,100]);}}><TabsList aria-labelledby={routeLabel}><TabsTrigger value="angular">Angular substitution</TabsTrigger><TabsTrigger value="limit">Finite-line limit</TabsTrigger></TabsList></Tabs></div>}
 </div><Workbench key={p.id+"/"+p.variable+"/"+(derivationProblem?.variable??"")} problem={p} derivationProblem={derivationProblem} params={boardParams} onModeChange={pickMode} onHighlight={setHighlight} boundRange={bounds} onBoundRangeChange={setBounds} highlight={figureHighlight}
  build={boardBuild} onStep={boardStep}/></div>
 {/* The end of a derivation, not a peer of it. A limiting case is the check that the answer
     is physically right, and the confusions are a reference — both belong after the integral
     is built. BOTH START OPEN: shut, a reader scrolled past two grey lines and never saw the plot
     they close on; a reader can still fold either away, and a folded one unmounts.
     The plot is cheap to keep: an Assessment is memoised, so the run's frames and the page's other
     state do not reach it, and its seventy samples follow a parameter drag at low priority. */}
 {/* The endnotes have a heading a screen reader can jump to. Readers who skim by headings went from "Build the
     integral" to the end of the page: the two checks that close every lesson were reachable only by tabbing
     past every button on the board. One heading for the section, ahead of the disclosures rather than inside
     a summary, where some screen readers flatten a heading into the button's name; worded as its own line, so
     it does not read each summary's name a second time. */}
 <section className="exp-endnotes" aria-labelledby={endnotesHeading}>
  <h2 id={endnotesHeading} className="sr-only">Limiting cases and easy confusions</h2>
  <details className="exp-note" open={limitsOpen} onToggle={e=>setLimitsOpen(e.currentTarget.open)}>
   <summary><span>Limiting cases</span><small>Push the geometry to an extreme and watch whether the result still describes something real.</small></summary>
   {/* Each limiting case is a tab's own panel. The explanation and the plot that change under the tabs
       used to belong to none of them -- Base UI ties a tab to its content only through a panel, and
       there was none -- so a screen reader heard "tab, 1 of 3, selected" over an unnamed list and then
       a paragraph that was nobody's. The list is named, and each tab now controls what it shows.
       Only the chosen panel is mounted: an Assessment integrates seventy samples on every render. */}
   {limitsOpen&&<div className="exp-note-body">
    {/* On paper, every case under its own heading: tabs print as buttons nobody can press, over one panel. */}
    {printing&&p.limits.length>1
     ?p.limits.map((x,i)=><section key={x.id} className="exp-limit-print"><h3 className="exp-note-heading">{x.title}</h3><p className="exp-limit-why">{mathProse(x.explanation)}</p><Assessment key={id+i} problem={p} params={boardParams} limit={x}/></section>)
     :p.limits.length>1
     ?<Tabs value={String(limitIndex)} onValueChange={v=>setLimitIndex(Number(v))}><TabsList aria-label="Limiting cases" className="exp-limit-tabs">{p.limits.map((x,i)=><TabsTrigger value={String(i)} key={x.id}>{x.title}</TabsTrigger>)}</TabsList>
      {p.limits.map((x,i)=><TabsContent key={x.id} value={String(i)} className="exp-limit-panel"><p className="exp-limit-why">{mathProse(x.explanation)}</p><Assessment key={id+i} problem={p} params={boardParams} limit={x}/></TabsContent>)}</Tabs>
     :<><h3 className="exp-note-heading">{lim.title}</h3><p className="exp-limit-why">{mathProse(lim.explanation)}</p><Assessment key={id} problem={p} params={boardParams} limit={lim}/></>}
   </div>}
  </details>
  <details className="exp-note" open={slipsOpen} onToggle={e=>setSlipsOpen(e.currentTarget.open)}>
   <summary><span>Easy to confuse with</span><small>The expressions this geometry sits next to, and what each one would actually describe.</small></summary>
   {slipsOpen&&<div className="exp-note-body exp-slips">{confusions(p).map(g=><div className="exp-slip" key={g.key}>
    <span className="exp-slip-of">{g.label}</span>
    {g.notes.map(n=><div className="exp-slip-note" key={n.message}><span className="exp-slip-math">{!g.symbol&&<span className="exp-slip-not">Not</span>}{n.expressions.map(x=><MathText key={x} tex={g.symbol?String.raw`\displaystyle ${g.symbol}\ne ${confusionTex(x).replace(/^\\displaystyle\s*/,'')}`:confusionTex(x)}/>)}</span><p>{mathProse(n.message)}</p></div>)}
   </div>)}</div>}
  </details>
  {/* WHERE THIS LESSON LEADS. Each lesson names its neighbour -- take this rod to infinity, build a disk
      from these rings, the field this potential differentiates back to -- and the limiting cases send the
      reader there in words ("the Semi-infinite line lesson lays this line along x"), but nothing went
      there. The last line of the lesson does. */}
  {/* A card, not a line: the lesson's last word is where to go next, its shape, its name and why. */}
  {related&&<a className="exp-next" href={lessonHref(related.id)} aria-label={`Next: ${related.short}. ${related.text}`} onClick={e=>{if(!inPlace(e))return;e.preventDefault();follow(related.id,related.from)}}>
   <span className="exp-next-glyph"><ShapeGlyph id={related.id} size={22}/></span>
   <span className="exp-next-words"><span className="exp-next-kicker">Next</span><strong className="exp-next-to">{related.short}</strong><span className="exp-next-why">{greek(related.text)}</span></span>
   <ArrowRight className="exp-next-arrow" size={18} aria-hidden="true"/>
  </a>}
 </section>
 <output className="sr-only" aria-live="polite">{status}</output></main></SidebarProvider>
 {/* Said in the live region above; this is the same words for the eye, for a moment. */}
 {copied&&<p className="exp-copied no-print" aria-hidden="true">{copied}</p>}
 {/* The first-visit cue points at what the lesson is built around, not at the tour of it -- and waits
     for the tour to close, whose last page names the same button. */}{cueing&&faces&&<StartHere target={watchButton} onSettled={()=>setCued(true)}/>}<Onboarding returnFocus={tourButton} open={onboarding} onClose={()=>setOnboarding(false)} dontShow={hideTour} onDontShowChange={storageOK?setHideTour:undefined}/>{/* THE LAWS EVERY LESSON
     RESTS ON WERE WRITTEN ONCE AND SHOWN NOWHERE BUT THE TOUR'S SECOND PAGE. They are a reader's question in
     the middle of a lesson -- "which law is this again?" -- so they are under the formula the lesson list
     closes on, and, where the list is not drawn, in the lesson's tools. A potential lesson leads with V. */}<LawsDialog open={laws} onOpenChange={setLaws} quantity={p.quantity} returnFocus={toolsButton}/><Dialog open={library} onOpenChange={setLibrary}>{/* Opened on the lesson the reader is in, not on the first card: from the ring, the focus landed on
     Finite line, and a keyboard or a screen reader had to go looking for where they were. */}<DialogContent className="exp-library-dialog" initialFocus={libraryFocus}><DialogTitle>Choose your geometry</DialogTitle><DialogDescription>Every lesson, including electric potential.</DialogDescription><div className="exp-library-list">{libraryCards}</div></DialogContent></Dialog></div>;
}
