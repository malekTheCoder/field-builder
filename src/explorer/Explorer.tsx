'use client';
import {useState,useEffect,useRef,lazy,Suspense,type CSSProperties} from 'react';
import {animate,useReducedMotion} from 'motion/react';
import {ArrowLeft,ArrowRight,ChevronRight,CircleHelp,Download,GitBranch,Printer,RotateCcw,Sun,Moon,PanelLeft,Orbit,Braces} from 'lucide-react';
import {Sidebar,SidebarContent,SidebarProvider,SidebarMenu,SidebarMenuItem,SidebarMenuButton} from '@/components/ui/sidebar';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Slider} from '@/components/ui/slider';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {PROBLEMS,getProblem} from '../problems/definitions';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../problems/types';
import {pretty} from '../symbolic/physics';
import {activeIntervalIndex} from '../diagrams/sampling';
import {partitionCount} from '../diagrams/subdivision';
import {cleanParams,parseAssignment,serializeAssignment,type ExploreMode} from '../state/assignment';
import {ChargeDiagram} from '../diagrams/ChargeDiagram';
import {termsFor} from '../workbench/assembly';
import {phrase as phraseGuess,read as readGuess} from '../workbench/prediction';
import {EquationWorkbench} from '../components/EquationWorkbench';
import {Onboarding} from '../components/Onboarding';
import {MathText} from '../components/Math';
import {Assessment} from '../components/Assessment';
import {artifactHtml,downloadArtifact,printLesson} from '../state/artifact';
import {ProgressTransfer} from '../components/ProgressTransfer';
import {Hint} from '../components/Hint';
import './explorer.css';
import '../print.css';
const Practice=lazy(()=>import('../wizard/FieldBuilder'));
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
/** How long a parameter must hold still before it is written anywhere. Long enough that a
 * drag writes once at the end, short enough to survive a quick change and a reload. */
const SETTLE=220;
const STORAGE='field-builder:explorer:v1';
// Variable-first: every control is named by its symbol. The words are the
// gloss, the number is the consequence — so the symbol is set large in the
// display serif and the reading stays quiet and monospaced beside it.
// aria-label keeps the full phrase, which is what a screen reader wants.
function splitSymbol(label:string):[string,string]{const parts=label.split(' ');const last=parts[parts.length-1];return last.length<=2&&parts.length>1?[last,parts.slice(0,-1).join(' ')]:['',label]}
function Range({label,value,min,max,step=1,onChange,display}:{label:string;value:number;min:number;max:number;step?:number;onChange:(n:number)=>void;display?:string}){const [symbol,name]=splitSymbol(label);return <div className="exp-range"><div><span>{symbol&&<i className="exp-sym">{symbol}</i>}<span className="exp-name">{name}</span></span><output>{display??pretty(value)}</output></div><Slider aria-label={label} value={[value]} min={min} max={max} step={step} onValueChange={v=>onChange(Array.isArray(v)?v[0]:v)}/></div>}
export default function Explorer(){
 const [step,setStep]=useState(-1);const [predicting,setPredicting]=useState(false);const [guess,setGuess]=useState<{x:number;y:number}|null>(null);const [netScreen,setNetScreen]=useState({x:0,y:0});const [id,setId]=useState<ProblemId>('bisector');const [path,setPath]=useState('angular');const [mode,setMode]=useState<Mode>('divide');const [paramsMap,setParamsMap]=useState<Partial<Record<ProblemId,Params>>>({});const [dark,setDark]=useState(false);const [ready,setReady]=useState(false);const [storageOK,setStorageOK]=useState(true);const [onboarding,setOnboarding]=useState(false);const [seen,setSeen]=useState(false);const [library,setLibrary]=useState(false);const [sidebarOpen,setSidebarOpen]=useState(true);const [showNumbers,setShowNumbers]=useState(false);const [practice,setPractice]=useState(false);const [components,setComponents]=useState(false);const [pair,setPair]=useState(false);const [progress,setProgress]=useState(1);const [playing,setPlaying]=useState(false);const [selected,setSelected]=useState(3);const [bounds,setBounds]=useState<[number,number]>([0,100]);const [view,setView]=useState('explore');const [limitIndex,setLimitIndex]=useState(0);const [highlight,setHighlight]=useState('');const [status,setStatus]=useState('');const run=useRef<ReturnType<typeof animate>|null>(null);const morph=useRef<ReturnType<typeof animate>|null>(null);const reduced=useReducedMotion();const tourButton=useRef<HTMLButtonElement>(null);
 const p=getProblem(id,'angular'),derivationProblem=getProblem(id,path),params=paramsMap[id]??DEFAULT_PARAMS;const continuum=params.continuum;const count=partitionCount(params.slices,continuum);const geom=p.geometry,scalar=p.quantity==='V';const isInfinite=['infinite','semi','sheet'].includes(geom);const isRound=['ring','disk','arc'].includes(geom);
 // Storage is an external system; initialize after hydration and surface write failures without aborting the lesson.
 // oxlint-disable-next-line react/react-compiler
 useEffect(()=>{try{const raw=localStorage.getItem(STORAGE);const parsed=raw?JSON.parse(raw):null;const saved=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};const pm:Partial<Record<ProblemId,Params>>={};for(const pr of PROBLEMS)if(saved.params?.[pr.id])pm[pr.id]=cleanParams(saved.params[pr.id]);const url=parseAssignment(typeof location==='undefined'?'':location.search);const assigned=!!(url.id||url.mode||url.params||url.pair||url.components);if(url.id)setId(url.id);else if(PROBLEMS.some(p=>p.id===saved.id))setId(saved.id);setDark(saved.dark===true);setShowNumbers(saved.showNumbers===true);setSidebarOpen(saved.sidebarOpen!==false);if(url.params){const target=url.id??(PROBLEMS.some(p=>p.id===saved.id)?saved.id as ProblemId:'bisector');pm[target]=cleanParams({...(pm[target]??DEFAULT_PARAMS),...url.params});}setParamsMap(pm);if(url.mode)setMode(url.mode);if(url.pair)setPair(true);if(url.components)setComponents(true);setSeen(!!saved.seen);setOnboarding(assigned?false:!saved.seen);}catch{setStorageOK(false);setOnboarding(true)}setReady(true);return()=>{run.current?.stop();morph.current?.stop()}},[]);
 // oxlint-disable-next-line react/react-compiler -- Synchronize persisted preferences; quota/security errors update the save indicator.
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark]);
 // Persistence is debounced because a drag changes a parameter every frame. Writing the
 // whole parameter map to localStorage per frame is a synchronous serialize-and-store on
 // the main thread, and writing the URL per frame trips the browser's own rate limit --
 // Safari and Chrome throw SecurityError past 100 replaceState calls in 10 seconds, which
 // reached the error boundary and took the whole view down mid-drag. Only the settled
 // value is written; React clears the pending timer on every change.
 useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{try{localStorage.setItem(STORAGE,JSON.stringify({id,dark,params:paramsMap,seen,showNumbers,sidebarOpen}))}catch{setStorageOK(false)}},SETTLE);return()=>clearTimeout(t)},[id,dark,paramsMap,ready,seen,practice,showNumbers,sidebarOpen]);
 useEffect(()=>{if(!ready||typeof history==='undefined')return;
  const t=setTimeout(()=>{const q=serializeAssignment({id,mode,params,pair,components});const next=q?`?${q}`:location.pathname||'/';
   // Still guarded: a throw here would reach the error boundary and blank the lesson.
   if(`${location.search}`!==(q?`?${q}`:''))try{history.replaceState(null,'',next)}catch{/* rate-limited or blocked: the URL is a convenience, the lesson is not */}},SETTLE);
  return()=>clearTimeout(t)},[ready,id,mode,params,pair,components]);

 const activeIndex=playing?activeIntervalIndex(count,bounds,progress):Math.min(count-1,Math.max(0,selected));
 // Walking the derivation: each step lights one feature on the figure and adds its factor
 // to the integral, so the expression assembles as the explanation moves.
 const walkTerms=termsFor(p);
 const walking=step>=0;
 const walked=new Set(walkTerms.slice(0,step+1).map(t=>t.id));
 const walkHighlight=walking?walkTerms[Math.min(step,walkTerms.length-1)].figure:highlight;
 const walkFigure=walking?walkTerms[Math.min(step,walkTerms.length-1)].figure:'';
 // Each step of the walk puts the figure in the mode that shows what the step is about:
 // the pieces, then one contribution projected, then the interval being integrated.
 function walkTo(i:number){stop();const to=Math.max(0,Math.min(walkTerms.length-1,i));setStep(to);const f=walkTerms[to].figure;const next:Mode=f==='element'?'divide':f==='bounds'?'integrate':'project';setMode(next);if(next==='project'&&!scalar)setComponents(true);if(next==='integrate')setProgress(1);}
 function beginWalk(){walkTo(0);}
 function endWalk(){setStep(-1);setHighlight('');}
 function updateParams(partial:Partial<Params>){setParamsMap(old=>({...old,[id]:{...(old[id]??DEFAULT_PARAMS),...partial}}));}
 function stop(){run.current?.stop();setPlaying(false)}
 function changeDistribution(next:string){stop();morph.current?.stop();setStep(-1);setPredicting(false);setGuess(null);setId(next as ProblemId);setSelected(3);setProgress(1);setBounds([0,100]);setLibrary(false);setLimitIndex(0);setStatus('');setHighlight('');}
 function chooseMode(next:Mode){setMode(next);setView('explore');if(next==='project'&&!scalar)setComponents(true);if(next==='integrate'){setProgress(1);stop()}}
 function playSum(){if(playing){stop();return}setMode('sum');setView('explore');if(reduced){setProgress(1);setStatus('All contributions are now included.');return}setPlaying(true);const start=progress>=.999?0:progress;setProgress(start);
 // 7s linear: each ΔE has to be apprehended tip-to-tail. Ease would bunch the last pieces.
 run.current=animate(start,1,{duration:reduced?.3:7*(1-start),ease:'linear',onUpdate:setProgress,onComplete:()=>{setPlaying(false);setStatus('All contributions are now included.')}})}
 function continuumAnimation(){stop();morph.current?.stop();setMode('integrate');setProgress(1);if(reduced){updateParams({continuum:continuum>.99?0:1});return}
 // 2.4s ease: each dyadic doubling has to be seen as extra cuts on the same rod, not a new object.
 morph.current=animate(continuum,continuum>.99?0:1,{duration:reduced?.01:2.4,ease:[.22,.7,.2,1],onUpdate:v=>updateParams({continuum:v})})}
 function closeTour(){setOnboarding(false);setSeen(true)}
 function saveCopy(){downloadArtifact(`field-builder-${id}.html`,artifactHtml({title:p.title,subtitle:p.subtitle,setup:p.setup,integralTex:p.integralTex,resultTex:p.resultTex,params,svg:document.querySelector('.explorer-app .cd-svg')?.outerHTML??''}))}
 if(practice)return <><div className="practice-return"><button className="text-button" onClick={()=>setPractice(false)}><ArrowLeft size={16}/>Back to the visual workbench</button><span>The whole derivation, step by step · your exploration stays here</span></div><Suspense fallback={<div className="exp-loading">Preparing your equation workspace…</div>}><Practice initialProblem={id}/></Suspense></>;
 return <div className={`explorer-app ${showNumbers?'with-numbers':'symbolic-view'}`}><header className="exp-header"><button type="button" className="exp-brand" onClick={()=>setView('explore')}><span className="exp-logo">∫</span><span>field<span className="brand-light">builder</span></span></button><div className="exp-header-right"><button ref={tourButton} type="button" className="text-button tour-button" aria-label="Quick tour" onClick={()=>setOnboarding(true)}><CircleHelp size={16}/><span>Quick tour</span></button><Hint label="Print this lesson"><button type="button" className="icon-button no-print" onClick={printLesson} aria-label="Print this lesson"><Printer size={16}/></button></Hint><Hint label="Save an offline copy of this lesson"><button type="button" className="icon-button no-print" onClick={saveCopy} aria-label="Save an offline copy of this lesson"><Download size={16}/></button></Hint><ProgressTransfer/><Hint label={dark?'Switch to light theme':'Switch to dark theme'}><button className="icon-button" onClick={()=>setDark(!dark)} aria-label={dark?'Switch to light theme':'Switch to dark theme'}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></Hint><Hint label="View Field Builder on GitHub"><a className="icon-button repo-button" href="https://github.com/malekTheCoder/field-builder" target="_blank" rel="noreferrer" aria-label="View Field Builder on GitHub"><GitBranch size={16}/></a></Hint></div></header>
 <SidebarProvider className={`exp-shell ${sidebarOpen?'library-expanded':'library-collapsed'}`} style={{'--sidebar-width':'196px'} as CSSProperties}>{sidebarOpen&&<Sidebar collapsible="none" className="exp-sidebar"><SidebarContent><div className="exp-sidebar-title"><span className="eyebrow">Charge geometry</span></div><SidebarMenu>{PROBLEMS.map(pr=>{return <SidebarMenuItem key={pr.id}><SidebarMenuButton className={'exp-shape-button '+(id===pr.id?'active':'')} isActive={id===pr.id} onClick={()=>changeDistribution(pr.id)}><span className="shape-icon"><ShapeGlyph id={pr.id}/></span><span>{pr.short}</span></SidebarMenuButton></SidebarMenuItem>})}</SidebarMenu><div className="exp-nav-bottom"><Orbit size={26}/><p>One law.<br/>Every geometry.</p><MathText tex={scalar?String.raw`dV=\frac{k\,dQ}{r_i}`:String.raw`d\mathbf E=\frac{k\,dQ}{r_i^2}\hat{\mathbf r}_i`}/><span>{storageOK?'Your settings stay on this device.':'Settings are kept for this visit.'}</span></div></SidebarContent></Sidebar>}
 <main className="exp-main"><div className="exp-breadcrumb"><Hint label={sidebarOpen?'Hide the lesson list':'Show the lesson list'}><button type="button" className="exp-library-toggle" aria-expanded={sidebarOpen} aria-label={sidebarOpen?'Hide the lesson list':'Show the lesson list'} onClick={()=>setSidebarOpen(v=>!v)}><PanelLeft size={16}/></button></Hint><nav className="exp-crumbs" aria-label="Breadcrumb"><button type="button" className="exp-crumb-link" onClick={()=>setLibrary(true)}>Charge library</button><ChevronRight size={13} aria-hidden="true"/><span className="exp-crumb-here" aria-current="page">{p.short}</span></nav></div><div className="exp-heading"><div><h1>{p.title}</h1><p>{p.subtitle}</p></div><button className="secondary-button practice-button" onClick={()=>setPractice(true)}><Braces size={16}/>Read the full derivation<ArrowRight size={15}/></button></div>
 <div className="exp-view-row"><Tabs value={view} onValueChange={v=>{stop();setView(String(v))}} className="exp-views"><TabsList variant="line"><TabsTrigger value="explore">Explore &amp; build</TabsTrigger><TabsTrigger value="limits">Limiting cases</TabsTrigger></TabsList></Tabs></div>
 <div className="exp-workspace"><div className="exp-visual-column"><section className={'exp-diagram-card mode-'+mode+' focus-'+highlight} aria-label="Interactive field visualization"><div className="exp-diagram-heading"><div><MathText tex={p.coordinate}/></div></div><ChargeDiagram compact problem={p} params={params} setParams={updateParams} count={count} continuum={continuum} selected={activeIndex} onSelect={i=>{stop();setSelected(i)}} progress={progress} components={components||walkFigure==='projection'} pair={pair||walkFigure==='projection'} mode={mode} boundRange={bounds} onBoundRangeChange={setBounds} highlight={walkHighlight} predicting={predicting} prediction={guess} onPredict={setGuess} onNetScreen={setNetScreen}/><div className={"exp-walk"+(walking?" is-open":"")}>
  {!walking&&<button type="button" className="secondary-button exp-walk-start" onClick={beginWalk}>Walk me through the integral</button>}
  {walking&&<>
    <span className="exp-walk-count">{step+1} of {walkTerms.length}</span>
    <span className="exp-walk-text"><strong>{walkTerms[Math.min(step,walkTerms.length-1)].label}.</strong> {walkTerms[Math.min(step,walkTerms.length-1)].why}</span>
    {walkFigure==='element'&&<span className="exp-walk-extra"><Range label="Pieces N" value={params.slices} min={3} max={30} display={String(params.slices)} onChange={slices=>{morph.current?.stop();updateParams({slices,continuum:0})}}/><button type="button" className="text-button" onClick={continuumAnimation}>{continuum>.99?'Back to pieces':'Take the limit'}</button></span>}
    {step===walkTerms.length-1&&<button type="button" className="text-button" onClick={playSum}>{playing?'Pause':'Watch the sum add up'}</button>}
    <span className="exp-walk-actions">
      <button type="button" className="text-button" onClick={()=>walkTo(step-1)} disabled={step===0}>Previous</button>
      {step<walkTerms.length-1
        ?<button type="button" className="secondary-button" onClick={()=>walkTo(step+1)}>Next</button>
        :<button type="button" className="secondary-button" onClick={endWalk}>Done</button>}
      <button type="button" className="text-button" onClick={endWalk}>Close</button>
    </span>
  </>}
</div>
{!scalar&&<div className={"exp-predict"+(predicting?" is-open":"")}>
  {!predicting&&!guess&&<button type="button" className="text-button" onClick={()=>{setPredicting(true);setGuess(null)}}>Predict the field first</button>}
  {predicting&&<><span className="exp-predict-ask">Aim the dashed arrow the way you think the field points at P. Direction only — the strength is not something you can eyeball. The field stays hidden until you look.</span>
    <span className="exp-predict-actions"><button type="button" className="secondary-button" onClick={()=>setPredicting(false)}>Show the field</button>
    <button type="button" className="text-button" onClick={()=>{setPredicting(false);setGuess(null)}}>Skip</button></span></>}
  {!predicting&&guess&&<><span className="exp-predict-verdict">{phraseGuess(readGuess(guess,netScreen),params.charge>=0)}{' '}
    {/* The reason is the lesson's own symmetry argument: what cancels here, and why. That
        is the physics the prediction was for; a reading of the geometry alone is not. */}
    <span className="exp-predict-why">{p.symmetry.text}</span></span>
    <span className="exp-predict-actions"><button type="button" className="text-button" onClick={()=>{setPredicting(true)}}>Guess again</button>
    <button type="button" className="text-button" onClick={()=>setGuess(null)}>Clear</button></span></>}
</div>}</section>
 <section className="exp-parameters"><div className="parameter-grid">{geom!=='arc'&&<Range label={['ring','disk','sheet'].includes(geom)?'Height z':geom==='axial'?'End distance a':'Distance r'} value={params.distance} min={.5} max={6} step={.05} display={`${pretty(params.distance)} m`} onChange={distance=>updateParams({distance})}/>} {!isInfinite&&<Range label={isRound?'Radius R':'Length L'} value={isRound?params.size/2:params.size} min={isRound?.5:1} max={isRound?4:8} step={.05} display={`${pretty(isRound?params.size/2:params.size)} m`} onChange={v=>updateParams({size:isRound?v*2:v})}/>}<Range label={geom==='sheet'?'Surface density σ':geom==='ramp'?'Peak density λ₀':['infinite','semi'].includes(geom)?'Line density λ':'Total charge Q'} value={params.charge} min={-5} max={5} step={.1} display={`${pretty(params.charge)} ${geom==='sheet'?'nC/m²':['infinite','semi','ramp'].includes(geom)?'nC/m':'nC'}`} onChange={charge=>updateParams({charge})}/>{geom==='arc'&&<Range label="Arc angle φ" value={params.phi/Math.PI} min={.1} max={2} step={.01} display={`${pretty(params.phi/Math.PI)}π`} onChange={v=>updateParams({phi:v*Math.PI})}/>}<button onClick={()=>{stop();morph.current?.stop();updateParams({...DEFAULT_PARAMS});setProgress(1);setBounds([0,100]);setSelected(3)}} className="text-button exp-reset" aria-label="Reset geometry" title="Reset geometry"><RotateCcw size={13}/></button></div></section>
 {view==='explore'?null:<section className="exp-limit-panel"><div className="exp-control-title"><div><h2>{p.limits[limitIndex]?.title}</h2></div></div><Tabs value={String(limitIndex)} onValueChange={v=>setLimitIndex(Number(v))}><TabsList className="exp-limit-tabs">{p.limits.map((lim,i)=><TabsTrigger value={String(i)} key={lim.id}>{i===0?'First limit':i===1?'Another limit':'Bonus: maximum'}</TabsTrigger>)}</TabsList></Tabs><p>{p.limits[limitIndex]?.explanation}</p><Assessment key={id+limitIndex} problem={p} params={params} limit={p.limits[limitIndex]}/></section>}
 {id==='infinite'&&<div className="exp-method"><span>Explore another route to the same result</span><Tabs value={path} onValueChange={v=>{setPath(String(v));setBounds([0,100]);}}><TabsList><TabsTrigger value="angular">Angular substitution</TabsTrigger><TabsTrigger value="limit">Finite-line limit</TabsTrigger></TabsList></Tabs></div>}
 </div><EquationWorkbench key={p.id+"/"+p.variable+"/"+(derivationProblem?.variable??"")} problem={p} derivationProblem={derivationProblem} params={params} count={count} continuum={continuum} progress={progress} mode={mode} onModeChange={chooseMode} onHighlight={setHighlight} boundRange={bounds} onBoundRangeChange={setBounds} collected={walked} highlight={walkHighlight}/></div><output className="sr-only" aria-live="polite">{status}</output></main></SidebarProvider>
 <Onboarding returnFocus={tourButton} open={onboarding} onClose={closeTour} onExplore={closeTour}/><Dialog open={library} onOpenChange={setLibrary}><DialogContent className="exp-library-dialog"><DialogTitle>Choose your geometry</DialogTitle><DialogDescription>{PROBLEMS.length} lessons, including electric potential.</DialogDescription><div className="exp-library-grid">{PROBLEMS.map(pr=>{return <button key={pr.id} className={pr.id===id?'selected':''} onClick={()=>changeDistribution(pr.id)}><ShapeGlyph id={pr.id} size={26}/><strong>{pr.short}</strong><span>{pr.subtitle}</span></button>})}</div></DialogContent></Dialog></div>;
}
