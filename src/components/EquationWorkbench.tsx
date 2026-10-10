'use client';
import { Fragment, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MathText, Prose } from './Math';
import { DerivationBoard, type BoardState } from './DerivationBoard';
import { equivalent, safeParse } from '../symbolic/equivalence';
import { BISECTOR_UNFOLD, boardLines, resultLines, type Term } from '../workbench/derivation';
import { buildStages } from '../explorer/buildRun';
import type { Params, Problem } from '../problems/types';
import './workbench.css';
type Mode = 'divide' | 'project' | 'sum' | 'integrate';
export type EquationWorkbenchProps = {problem:Problem;derivationProblem?:Problem;params:Params;continuum:number;progress:number;mode:Mode;onModeChange:(mode:Mode)=>void;onHighlight?:(name:string)=>void;boundRange:[number,number];onBoundRangeChange:(range:[number,number])=>void;
 /** Where "Watch it build" is, so the derivation can arrive in step with it. Absent means at rest. */
 build?:BoardState;
 /** Play one stage of the run, from the line of the derivation that stands for it. */
 onStep?:(index:number)=>void;
 /** The feature of the figure being pointed at elsewhere -- a slider, or the run's current stage. */
 highlight?:string};
const raw=String.raw;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** n as a fraction with the smallest denominator that holds it. The handles snap to whole percents
 * and the half-turn lessons halve them, so 400 always does. There used to be a decimal fallback past
 * a denominator of 100, and the semi-infinite line and the sheet, whose t/2 wants 200, put "0.185π"
 * on the page. */
function ratio(n:number):[number,number]{for(let d=1;d<=400;d++)if(Math.abs(n*d-Math.round(n*d))<1e-7)return[Math.round(n*d),d];return[Math.round(n*400),400];}
/** n times a symbol, written as a reader writes it -- L/4, 3π/2, -φ/4 -- not "(1/4)*L" or "2*pi",
 * which is what the form's fields used to hold. The parser reads these back: π, φ, ∞ and implied
 * products included. The minus is the keyboard's, as a reader editing the field would type it. */
function scaled(n:number,s:string){if(n===0)return'0';const[a,d]=ratio(n),m=Math.abs(a)===1?'':`${Math.abs(a)}`;return`${a<0?'-':''}${m}${s}${d===1?'':`/${d}`}`;}
/** A lesson's own bound, from the parser's spelling to the page's. */
const shown=(b:string)=>b.replace(/\*?\bphi\b/g,'φ').replace(/\*?\bpi\b/g,'π').replace(/Infinity/g,'∞');
function boundExpression(p:Problem,percent:number){const t=clamp(percent/100),g=p.geometry;if(t===0)return shown(p.bounds[0]);if(t===1)return shown(p.bounds[1]);if(g==='bisector'||(p.id==='infinite'&&p.variable==='y'))return scaled(t-.5,'L');if(g==='axial'||g==='endpoint'||g==='ramp')return scaled(t,'L');if(g==='ring')return scaled(2*t,'π');if(g==='arc')return scaled(t-.5,'φ');if(g==='disk')return scaled(t,'R');if(p.id==='infinite')return scaled(t-.5,'π');return `${g==='sheet'?'z':'r'} tan(${scaled(t/2,'π')})`;}
/** A dragged limit as the board writes it. Only an end of the charge, or a plain fraction of it --
 * the middle, a quarter, half a turn -- is written as a value. Anywhere else the handle has no name on
 * the figure, and the board calls it y₁ or y₂: the whole percents the handles snap to wrote
 * "−13L/100 → 31L/100" and "r tan(0.185π)", coefficients where the page writes symbols, and pushed
 * the last line off the side of the panel. The form's fields still hold the value. */
function limitTex(p:Problem,percent:number,which:1|2){
 const t=clamp(percent/100),g=p.geometry;
 if(t<=1e-5)return p.boundTex[0];
 if(t>=1-1e-5)return p.boundTex[1];
 const plain=(n:number,s:string)=>{const[a,d]=ratio(n);if(d>4)return null;if(a===0)return'0';const m=Math.abs(a)===1?'':`${Math.abs(a)}`;return`${a<0?'-':''}${m}${s}${d===1?'':`/${d}`}`;};
 const nice=g==='bisector'||(p.id==='infinite'&&p.variable==='y')?plain(t-.5,'L')
  :g==='axial'||g==='endpoint'||g==='ramp'?plain(t,'L')
  :g==='ring'?plain(2*t,raw`\pi`)
  :g==='arc'?plain(t-.5,raw`\varphi`)
  :g==='disk'?plain(t,'R')
  :p.id==='infinite'?plain(t-.5,raw`\pi`)
  // Half way out in angle, the semi-infinite line's piece is r along it and the sheet's ring z out.
  :Math.abs(t-.5)<1e-9?(g==='sheet'?'z':'r'):null;
 return nice??`${p.variableTex}_${which}`;
}
function boundPercent(p:Problem,value:string,params:Params){if(equivalent(value,p.bounds[0],p).ok)return 0;if(equivalent(value,p.bounds[1],p).ok)return 100;const x=safeParse(value).compile().evaluate({L:params.size,R:params.size/2,z:params.distance,r:params.distance,a:params.distance,pi:Math.PI,phi:params.phi,Infinity});if(typeof x!=='number'||!Number.isFinite(x))throw Error('Use a bound inside this distribution.');const g=p.geometry;if(g==='bisector'||(p.id==='infinite'&&p.variable==='y'))return 100*(x/params.size+.5);if(g==='axial'||g==='endpoint'||g==='ramp')return 100*x/params.size;if(g==='ring')return 100*x/(2*Math.PI);if(g==='arc')return 100*(x/params.phi+.5);if(g==='disk')return 200*x/params.size;if(p.id==='infinite')return 100*(x/Math.PI+.5);return 200*Math.atan(x/Math.abs(params.distance))/Math.PI;}
/** Which factor a pointed-at feature of the figure, or a slider, stands behind. The length lights
 * the limits because the limits are written in it; the charge lights the piece's charge. */
const LIGHTS:Record<string,Term>={element:'element',charge:'element',distance:'distance',projection:'projection',bounds:'bounds',size:'bounds',angle:'bounds'};
const REST:BoardState={open:false,index:-1,playing:false,settled:true};
/** The lessons whose cancellation is a piece and its mirror, which a bracket off-centre -- or, on the
 * ring, short of the whole turn -- leaves outside. */
const MIRRORED=['bisector','infinite','arc','ring'];
export function EquationWorkbench({problem:p,derivationProblem,params,onModeChange,onHighlight,boundRange,onBoundRangeChange,build=REST,onStep,highlight=''}:EquationWorkbenchProps){
 // THE PANEL RE-RENDERS EVERY FRAME OF THE RUN, because the page does: the figure has to move. What
 // is on the panel changes only when the run enters a stage, pauses or settles, or a bracket moves.
 // So everything below that costs anything is memoised on what it actually reads -- the bounds go
 // through mathjs twice, the board is thirty-odd KaTeX lines -- and the board itself is memoised.
 // One lesson is one object for this panel's life: the infinite line's is rebuilt on every render
 // of the page, so the memos key on the one held here rather than on whatever object arrived.
 const[held,setHeld]=useState(p);const same=held.id===p.id&&held.variable===p.variable;if(!same)setHeld(p);const q=same?held:p;
 const uid=useId();const[worked,setWorked]=useState(false);const[stepCount,setStepCount]=useState(1);const[boundsOpen,setBoundsOpen]=useState(false);const[bounds,setBounds]=useState<[string,string]>(()=>[boundExpression(p,boundRange[0]),boundExpression(p,boundRange[1])]);const[feedback,setFeedback]=useState('');
 const[syncedRange,setSyncedRange]=useState(boundRange);
 // The range the form itself just asked for, so the answer to "Apply interval" survives the range
 // coming back -- and only that range. A drag on the figure, or the bound slider, moves the range
 // from outside: the fields follow it, and the form's last answer is cleared, or "Whole distribution
 // selected" sat under a block headed "Part of the distribution".
 const[asked,setAsked]=useState<[number,number]|null>(null);
 if(syncedRange[0]!==boundRange[0]||syncedRange[1]!==boundRange[1]){
  setSyncedRange(boundRange);setBounds([boundExpression(p,boundRange[0]),boundExpression(p,boundRange[1])]);
  if(!(asked&&asked[0]===boundRange[0]&&asked[1]===boundRange[1]))setFeedback('');
 }
 const g=p.geometry,scalar=p.quantity==='V',allBounds=boundRange[0]<=.001&&boundRange[1]>=99.999;
 const[from,to]=boundRange;
 const lower=useMemo(()=>limitTex(q,from,1),[q,from]);
 const upper=useMemo(()=>limitTex(q,to,2),[q,to]);
 // Does the bracket still hold every piece's mirror partner? Off-centre it does not, and the part
 // across the axis survives: the board said E_y = 0 over a figure whose ΣΔE leaned 17° on the upper
 // half of the rod, 45° on a quarter of the arc. A ring needs the whole turn.
 const keeps=allBounds||(g!=='ring'&&Math.abs(from+to-100)<1e-6);
 const lopsided=!keeps&&!scalar&&MIRRORED.includes(g);
 const stages=useMemo(()=>buildStages(q),[q]);
 const names=useMemo(()=>stages.map(s=>s.name),[stages]);
 const notes=useMemo(()=>stages.map(s=>s.caption),[stages]);
 // The limits in the last line follow the brackets in the figure: drag one and the integral is
 // rewritten over the part of the charge it now covers.
 const lines=useMemo(()=>boardLines(q,allBounds?undefined:[lower,upper],{keeps}),[q,allBounds,lower,upper,keeps]);
 const results=useMemo(()=>resultLines(q),[q]);
 // The board's state is rebuilt only when one of its fields changes, not with every new object the
 // page passes down, and its callbacks are fixed for the panel's life and call whatever is current.
 const{open,index,playing,settled:arrived}=build;
 const state=useMemo(()=>({open,index,playing,settled:arrived}),[open,index,playing,arrived]);
 const latest=useRef({onStep,onHighlight});useLayoutEffect(()=>{latest.current={onStep,onHighlight}});
 const playStep=useCallback((i:number)=>latest.current.onStep?.(i),[]),point=useCallback((term:Term|'')=>latest.current.onHighlight?.(term),[]);
 // The answer is where the derivation ends, so it waits for the run to get there -- and at rest,
 // with the derivation all on the page, it is simply the last thing on it.
 const settled=!open||(index===stages.length-1&&arrived);
 // What k stands for, said once more as part of the answer it is needed to read. Every answer now
 // contains a k: the disk's, the sheet's and the disk potential's say it in k before they say it in
 // ε₀, so the line no longer defines a k that the formula above it does not have. Its word is the
 // page's, in the page's sans: it was the one KaTeX-serif word left on the card.
 const withK=<p className="ew-result-k">with <MathText tex={raw`k=\dfrac{1}{4\pi\varepsilon_0}`}/></p>;
 const algebra=derivationProblem??p;const original=algebra.steps.find(s=>s.kind==='integrate')?.worked??[];
 // The bisector's angle is α on the board and on the figure, so it is α here too -- it was u, a
 // second name for the same angle, under a word ("Jacobian") the course has not taught yet.
 const integration=g==='bisector'&&!scalar?[...BISECTOR_UNFOLD,...original.slice(1)]:original;
 // A potential lesson promises the field "falls out of one derivative", and its lesson carries that
 // derivative worked out -- which this list used to stop short of. It follows the integration,
 // under its own heading, wherever the lesson has one.
 const back=algebra.steps.find(s=>s.kind==='gradient')?.worked??[];
 const steps=[...integration,...back];
 const workedRef=useRef<HTMLDivElement>(null);
 // The answer arrived under the integral with no word that it is that integral done, and the steps
 // sat under a muted disclosure further down that a reader who does not integrate never opened.
 function unfold(){setWorked(true);requestAnimationFrame(()=>workedRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'}));}
 function applyBounds(event:{preventDefault():void}){event.preventDefault();try{const a=boundPercent(p,bounds[0],params),b=boundPercent(p,bounds[1],params);if(a<-.000001||b>100.000001||a>=b)throw Error('Choose an increasing interval inside the distribution.');const range:[number,number]=[Math.max(0,a),Math.min(100,b)];setAsked(range);onBoundRangeChange(range);onModeChange('integrate');setFeedback(a===0&&b===100?'Whole distribution selected. Equivalent forms accepted.':'Interval applied. The integral and highlighted region now match.');}catch(e){setFeedback(e instanceof Error?e.message:'Check the expressions and try again.');}}
 function wholeBounds(){setAsked([0,100]);setBounds([shown(p.bounds[0]),shown(p.bounds[1])]);onBoundRangeChange([0,100]);setFeedback('Whole distribution selected.');}
 return <aside className="ew-panel" aria-label="Live equation workbench"><div className="ew-content">
 {/* ONE SUBJECT. The panel used to open on a caption equation that changed with the figure's
     mode, then a template of blanks, then four rows of blanks under an instruction that did
     nothing. The derivation is now the panel's subject from its first line to the answer. */}
 <div className="ew-assembly">
  <h2 className="ew-section-title">Build the integral</h2>
  {/* One sentence in both states: swapping it for a shorter one when the run opened moved the whole
      board up forty pixels while the reader was watching the figure. */}
  <p className="ew-lede">Five steps from one piece of charge to the whole, each adding one idea. Choose one to watch it on the figure, or point at a coloured symbol to find it there.</p>
  <DerivationBoard lines={lines} names={names} notes={notes} state={state} lit={LIGHTS[highlight]??''} onStep={playStep} onPoint={point}/>
 </div>
 {allBounds
  ?<div className={'ew-result'+(settled?' is-shown':'')} aria-hidden={settled?undefined:true}><span className="ew-result-label">The whole distribution</span><p className="ew-result-lead">Doing the integral gives this. <button type="button" className="ew-result-unfold" onClick={unfold}>Show every step</button></p>{results.map(t=><MathText key={t} tex={t} block/>)}{withK}<p>{scalar?'Signed potential. Reverse the charge to reverse the sign; there is no direction to keep track of.':`Signed field component${['semi','endpoint','ramp'].includes(p.id)?'s':''}. Reversing the charge reverses the field.`}</p></div>
  :<div className="ew-result is-shown is-partial"><span className="ew-result-label">Part of the distribution</span><p>The integral above now runs over the bracketed part of the charge only.{lopsided?<> With the bracket {g==='ring'?'short of the whole ring':'off-centre'}, the part across the axis no longer cancels: the integral builds <MathText tex={g==='ring'?'E_z':'E_x'}/> alone, and the other part survives too.</>:null} Choose the whole distribution to get the closed form back.</p></div>}
 {/* THE SHELF: what a reader opens afterwards. The interval, the algebra worked out, and where
     the model comes from -- all closed until asked for, so the derivation stays the subject. */}
 <div className="ew-reference">
 <div className="ew-bounds"><button className="ew-disclosure" onClick={()=>setBoundsOpen(!boundsOpen)} aria-expanded={boundsOpen} aria-controls={`${uid}-bounds`}><span>Integration interval</span><span><MathText tex={allBounds?raw`${p.boundTex[0]}\;\to\;${p.boundTex[1]}`:raw`${lower}\;\to\;${upper}`}/><ChevronDown size={14}/></span></button>{boundsOpen&&<form id={`${uid}-bounds`} className="ew-bound-form" onSubmit={applyBounds}><p>Use symbols such as <MathText tex={p.boundTex[0]}/> and <MathText tex={p.boundTex[1]}/>. Equivalent expressions work, too.</p><div className="ew-bound-fields"><label htmlFor={`${uid}-lower`}>Lower bound<input id={`${uid}-lower`} value={bounds[0]} onChange={e=>setBounds([e.target.value,bounds[1]])} autoComplete="off" spellCheck={false}/></label><label htmlFor={`${uid}-upper`}>Upper bound<input id={`${uid}-upper`} value={bounds[1]} onChange={e=>setBounds([bounds[0],e.target.value])} autoComplete="off" spellCheck={false}/></label></div><div className="ew-bound-actions"><Button type="submit" size="sm">Apply interval</Button><Button type="button" variant="ghost" size="sm" onClick={wholeBounds}>Whole distribution</Button></div>{feedback&&<output className="ew-bound-feedback">{feedback}</output>}</form>}</div>
 <div className="ew-worked" ref={workedRef}><button className="ew-disclosure" onClick={()=>setWorked(!worked)} aria-expanded={worked} aria-controls={`${uid}-worked`}><span>Unfold the integration</span><ChevronDown size={15}/></button>{worked&&<div id={`${uid}-worked`} className="ew-worked-body"><p className="ew-context">{algebra.id==='infinite'&&algebra.variable==='y'?'Alternate derivation: start with a finite rod of length L, then let L grow at fixed λ. The live model above remains the infinite line.':allBounds?'Follow the algebra for the whole distribution, one transformation at a time.':'These steps derive the whole-distribution result. Your selected partial interval remains above.'}</p>{steps.slice(0,stepCount).map((step,i)=><Fragment key={`${p.id}-${p.variable}-${i}`}>{back.length>0&&i===integration.length&&<h3 className="ew-worked-sub">Differentiate back</h3>}<div className="ew-worked-step"><div><p><Prose text={step.text}/></p><MathText tex={step.tex} block/></div></div></Fragment>)}{stepCount<steps.length?<Button className="ew-next-step" variant="outline" onClick={()=>setStepCount(stepCount+1)}>Next transformation<ArrowDown size={14}/></Button>:<p className="ew-worked-done"><Check size={13}/>Every transformation accounted for.</p>}</div>}</div>
 <details className="ew-references"><summary className="ew-disclosure"><span>Model assumptions &amp; references</span><ChevronDown size={15}/></summary><div className="ew-references-body"><p><Prose text={p.setup}/></p><p>{p.id==='ramp'?'Geometry uses meters. Finite distributions use total charge, except this rod: its charge slider sets the peak density λ₀. Unbounded distributions hold charge density fixed.':'Geometry uses meters. Finite distributions use total charge; unbounded distributions hold charge density fixed.'}</p>{p.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={12}/></a>)}</div></details></div>
 </div></aside>;
}
