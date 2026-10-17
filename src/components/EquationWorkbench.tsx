'use client';
import { Fragment, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MathText, Prose } from './Math';
import { DerivationBoard, type BoardState } from './DerivationBoard';
import { equivalent, safeParse } from '../symbolic/equivalence';
import { alongIntegralOf, backLead, componentOf, exactSum, partHasAlso, partResult, resultLines, workedSteps, type Term } from '../workbench/derivation';
import { buildStages } from '../explorer/buildRun';
import { bracketLines, bracketOf, ratio } from '../workbench/bracket';
import type { Params, Problem } from '../problems/types';
import './workbench.css';
type Mode = 'divide' | 'project' | 'sum' | 'integrate';
// continuum, progress and mode change every frame of the run, and the panel reads none of them: as
// required props they made the page pass per-frame values that defeated the memo. Kept as optional
// for callers that still hand them over.
export type EquationWorkbenchProps = {problem:Problem;derivationProblem?:Problem;params:Params;continuum?:number;progress?:number;mode?:Mode;onModeChange:(mode:Mode)=>void;onHighlight?:(name:string)=>void;boundRange:[number,number];onBoundRangeChange:(range:[number,number])=>void;
 /** Where "Watch it build" is, so the derivation can arrive in step with it. Absent means at rest. */
 build?:BoardState;
 /** Play one stage of the run, from the line of the derivation that stands for it. */
 onStep?:(index:number)=>void;
 /** The feature of the figure being pointed at elsewhere -- a slider, or the run's current stage. */
 highlight?:string};
const raw=String.raw;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** n times a symbol, written as a reader writes it -- L/4, 3π/2, -φ/4 -- not "(1/4)*L" or "2*pi",
 * which is what the form's fields used to hold. The parser reads these back: π, φ, ∞ and implied
 * products included. The minus is the keyboard's, as a reader editing the field would type it. */
function scaled(n:number,s:string){if(n===0)return'0';const[a,d]=ratio(n),m=Math.abs(a)===1?'':`${Math.abs(a)}`;return`${a<0?'-':''}${m}${s}${d===1?'':`/${d}`}`;}
/** A lesson's own bound, from the parser's spelling to the page's. */
const shown=(b:string)=>b.replace(/\*?\bphi\b/g,'φ').replace(/\*?\bpi\b/g,'π').replace(/Infinity/g,'∞');
function boundExpression(p:Problem,percent:number){const t=clamp(percent/100),g=p.geometry;if(t===0)return shown(p.bounds[0]);if(t===1)return shown(p.bounds[1]);if(g==='bisector'||(p.id==='infinite'&&p.variable==='y'))return scaled(t-.5,'L');if(g==='axial'||g==='endpoint'||g==='ramp')return scaled(t,'L');if(g==='ring')return scaled(2*t,'π');if(g==='arc')return scaled(t-.5,'φ');if(g==='uneven-arc')return scaled(t-.5,'π');if(g==='disk')return scaled(t,'R');if(p.id==='infinite')return scaled(t-.5,'π');if(Math.abs(t-.5)<1e-9)return g==='sheet'?'z':'r';return `${g==='sheet'?'z':'r'} tan(${scaled(t/2,'π')})`;}
function boundPercent(p:Problem,value:string,params:Params){if(equivalent(value,p.bounds[0],p).ok)return 0;if(equivalent(value,p.bounds[1],p).ok)return 100;const x=safeParse(value).compile().evaluate({L:params.size,R:params.size/2,z:params.distance,r:params.distance,a:params.distance,pi:Math.PI,phi:params.phi,Infinity});if(typeof x!=='number'||!Number.isFinite(x))throw Error('Use a bound inside this distribution.');const g=p.geometry;if(g==='bisector'||(p.id==='infinite'&&p.variable==='y'))return 100*(x/params.size+.5);if(g==='axial'||g==='endpoint'||g==='ramp')return 100*x/params.size;if(g==='ring')return 100*x/(2*Math.PI);if(g==='arc')return 100*(x/params.phi+.5);if(g==='uneven-arc')return 100*(x/Math.PI+.5);if(g==='disk')return 200*x/params.size;if(p.id==='infinite')return 100*(x/Math.PI+.5);return 200*Math.atan(x/Math.abs(params.distance))/Math.PI;}
/** Which factor a pointed-at feature of the figure, or a slider, stands behind. The length lights
 * the limits because the limits are written in it; the charge lights the piece's charge. */
const LIGHTS:Record<string,Term>={element:'element',charge:'element',distance:'distance',projection:'projection',bounds:'bounds',size:'bounds',angle:'bounds'};
const REST:BoardState={open:false,index:-1,playing:false,settled:true};
// THE ANSWER, NAMED AS ONE. Its box was headed "The whole distribution": a first-year reader did not take it for
// the answer, and "distribution" is a word they do not have yet. It says it is the answer, and for what, in the
// figure's own noun; the bracketed part's box says the same of the part.
const WHOLE:Record<string,string>={bisector:'rod',axial:'rod',endpoint:'rod',ramp:'rod',infinite:'line',semi:'line',ring:'ring',disk:'disk',sheet:'sheet',arc:'arc','uneven-arc':'semicircle'};
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
 // The form's own Apply leaves the fields as the reader wrote them: rewriting them from the range
 // turned a semi-infinite line's "r" into "r tan(π/4)" while the board, the integral and the
 // disclosure all said r.
 if(syncedRange[0]!==boundRange[0]||syncedRange[1]!==boundRange[1]){
  setSyncedRange(boundRange);
  // Once the range has moved from outside, the form's request is spent: coming back to the same range
  // by a drag is the figure's doing, and the fields follow it.
  if(!(asked&&asked[0]===boundRange[0]&&asked[1]===boundRange[1])){setBounds([boundExpression(p,boundRange[0]),boundExpression(p,boundRange[1])]);setFeedback('');setAsked(null);}
 }
 const g=p.geometry,scalar=p.quantity==='V',allBounds=boundRange[0]<=.001&&boundRange[1]>=99.999;
 const[from,to]=boundRange;
 // The bracket's limits, whether it keeps every piece's mirror, and its board, as the run's transport writes them
 // too (see `bracketOf`): the limits in the last line follow the brackets in the figure, and dragging one rewrites
 // the integral over the part of the charge it now covers.
 const bracket=useMemo(()=>bracketOf(q,[from,to]),[q,from,to]);
 const{lower,upper,keeps}=bracket;
 const stages=useMemo(()=>buildStages(q),[q]);
 const names=useMemo(()=>stages.map(s=>s.name),[stages]);
 const lines=useMemo(()=>bracketLines(q,bracket),[q,bracket]);
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
 // page's, in the page's sans: it was the one KaTeX-serif word left on the card. Slashed, as One piece
 // sets it: stacked, it was a second typesetting of one definition, two storeys beside a line of sans.
 const withK=<p className="ew-result-k">with <MathText tex={raw`k=1/(4\pi\varepsilon_0)`}/></p>;
 // The board builds one component and says once, in What cancels, that ΔE_y survives too; the answer
 // then printed a whole E_y -- the ramp's with a logarithm -- under "Doing the integral gives this", with
 // nothing to tie it to that sentence. One pointer back, where the answer has a second component.
 //
 // And the integral it is. The pointer said "added up the same way" and the answer printed E_y with no
 // integral to show how -- while Shrink them had written only E_x's factors, so sin α = y/√(y² + r²) was
 // never on the card at all. The lessons carry that integral, and the printed copy prints it; so does the
 // panel now, with the one factor the board never wrote.
 //
 // Set as the board sets E_x's finished line, constants inside and the d last: the lesson's own form put
 // the constant outside and dy in the numerator, so the two integrals "added up the same way" did not look
 // it, one above the other.
 const secondary=alongIntegralOf(q)?.tex??'';
 // Leading with the noun, as the board's sentences now do: a sentence never opens on a bare symbol.
 const surviving=!secondary?'':raw`The other component, $E_y$, is the surviving $\Delta E_y$ added up the same way, with $\sin\alpha=y/\sqrt{y^2+r^2}$:`;
 // WHERE THE ANSWER CAME FROM. On the ring and the two exact potentials Add ends "this sum is already
 // exact … The answer needs no integral", and the answer under it opened "Doing the integral gives this":
 // credit to the integral for what the card had just said the sum gave. There the integral agrees.
 const lead=exactSum(q)?'Adding up the pieces gives this, exactly, however many there are; the integral above agrees.':secondary?'Doing the integrals gives this.':'Doing the integral gives this.';
 // What the sign means, in words a first-year reader has: "signed field component" did not say that a
 // component can come out negative, or what that says. Two components are named as two.
 const both=['semi','endpoint','ramp'].includes(p.id);
 const sign=scalar?'The potential $V$ can come out negative: reversing the charge reverses its sign, and there is no direction to keep track of.'
  :both?'Both $E_x$ and $E_y$ can come out negative: each one’s sign says which way it points, and reversing the charge reverses both.'
  :`The component $${componentOf(q)}$ can come out negative: its sign says which way it points, and reversing the charge reverses it.`;
 // WHAT A BRACKET'S INTEGRAL IS. "Choose the whole distribution to get the closed form back" sat under a
 // board that, on the ring and the two exact potentials, had just finished on a closed form -- and told
 // every other reader that part of a charge cannot be integrated to an answer, which is false: it is the
 // same integral between other ends. And "closed form" is a word a first-year reader does not have.
 const part=componentOf(q);
 // On a lesson whose integral the board finishes in a bracket, the part's answer is that bracket between
 // the handles' own ends -- written, as the whole charge's answer is, not promised in words.
 // And E_y beside it wherever the board says ΔE_y survives: the part's answer used to be E_x alone.
 const partTex=useMemo(()=>partResult(q,lower,upper,keeps),[q,lower,upper,keeps]);
 const partBoth=partHasAlso(q,keeps);
 // What a bracket's value is, in words: "[F] from lo to hi" is said only inside Unfold, and a reader
 // who never opened it could not read the promised value off the block.
 const partNote=exactSum(q)
  ?raw`The integral above now adds up only the bracketed part of the charge, and its last line already gives that part’s $${part}$: every piece in it is ${g==='arc'?'$R$ from $P$':'the same distance away'}${scalar?'':', at the same angle'}.${scalar?'':' Its part across the axis no longer cancels, so that part’s field leans off the axis.'}`
  :raw`The integral above now adds up only the bracketed part of the charge. Done between these ends, it comes to that part’s $${part}$${partBoth?' and $E_y$, each':','} the bracket’s value at the upper end minus its value at the lower end:`;
 const partBack='The answer for the whole distribution comes back when the brackets are at the ends again.';
 const algebra=derivationProblem??q;
 // ONE LIST, FOR THE PAGE AND THE HANDOUT. Each lesson's Unfold starts from its board's last line --
 // the constant coming out, the substitution, the power rule, the bracket -- and goes on into the
 // lesson's own steps in the panel's rhythm and the answer's order; a potential's then differentiates
 // back. It was assembled here, and again in the printed copy, which fell behind on four lessons.
 const{worked:integration,back}=useMemo(()=>workedSteps(q,algebra),[q,algebra]);
 const steps=[...integration,...back];
 const workedRef=useRef<HTMLDivElement>(null);
 // The answer arrived under the integral with no word that it is that integral done, and the steps
 // sat under a muted disclosure further down that a reader who does not integrate never opened.
 // "Show every step" opened one step behind a "Next step" button; the bisector has eight.
 // An explicit 'smooth' overrides the page's reduced-motion scroll-behavior, so Unfold glided for readers
 // who had asked for none: the behaviour is chosen here.
 function unfold(){setWorked(true);setStepCount(steps.length);const still=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;requestAnimationFrame(()=>workedRef.current?.scrollIntoView({block:'nearest',behavior:still?'auto':'smooth'}));}
 // Why a potential is differentiated, said before it is: under the heading the first step talked of
 // symmetry and differentiated, and that the field is minus the derivative came only in the second.
 const why=backLead(q);
 function applyBounds(event:{preventDefault():void}){event.preventDefault();try{const a=boundPercent(p,bounds[0],params),b=boundPercent(p,bounds[1],params);if(a<-.000001||b>100.000001||a>=b)throw Error('Choose an increasing interval inside the distribution.');const range:[number,number]=[Math.max(0,a),Math.min(100,b)];setAsked(range);onBoundRangeChange(range);onModeChange('integrate');setFeedback(a===0&&b===100?'Whole distribution selected. Equivalent forms accepted.':'Interval applied. The integral and highlighted region now match.');}catch(e){setFeedback(e instanceof Error?e.message:'Check the expressions and try again.');}}
 function wholeBounds(){setAsked([0,100]);setBounds([shown(p.bounds[0]),shown(p.bounds[1])]);onBoundRangeChange([0,100]);setFeedback('Whole distribution selected.');}
 return <aside className="ew-panel" aria-label="Live equation workbench"><div className="ew-content">
 {/* THE PROBLEM, FIRST. What is given, where the axes are, what is held fixed and what to find was said in
     one place only, a closed disclosure at the panel's foot, so a student never read the arc's "Q is fixed
     as φ changes" -- which decides what the slider does -- or where the rod lies and where P is. Every
     problem a lecturer sets opens with that paragraph; so does the panel, above the derivation it sets. The
     route's own, as the handout's: the infinite line's finite-rod route starts from a rod. */}
 <section className="ew-problem" aria-labelledby={`${uid}-problem`}><h2 id={`${uid}-problem`} className="ew-problem-title">The problem</h2><p className="ew-problem-text"><Prose text={algebra.setup}/></p></section>
 {/* ONE SUBJECT. The panel used to open on a caption equation that changed with the figure's
     mode, then a template of blanks, then four rows of blanks under an instruction that did
     nothing. The derivation is now the panel's subject from its first line to the answer. */}
 <div className="ew-assembly">
  <h2 className="ew-section-title">Build the integral</h2>
  {/* One sentence in both states: swapping it for a shorter one when the run opened moved the whole
      board up forty pixels while the reader was watching the figure. */}
  {/* Pointing is for a mouse. On a touch screen every coloured symbol sits inside its step's button,
      so a tap plays the step -- which clears the highlight -- and the figure is above the panel anyway:
      the clause could not be followed as worded, so a screen that cannot hover does not show it. */}
  <p className="ew-lede">Five steps from one piece of charge to the whole, each adding one idea. Choose one to watch it on the figure<span className="ew-lede-hover">, or point at a coloured symbol to find it there</span>.</p>
  <DerivationBoard lines={lines} names={names} state={state} lit={LIGHTS[highlight]??''} onStep={playStep} onPoint={point}/>
 </div>
 {allBounds
  ?<div className={'ew-result'+(settled?' is-shown':'')} aria-hidden={settled?undefined:true}><span className="ew-result-label">{`The answer, whole ${WHOLE[g]??'charge'}`}</span>{secondary&&<><p className="ew-result-lead"><Prose text={surviving}/></p><MathText className="ew-result-integral" tex={secondary} block/></>}<p className="ew-result-lead">{lead} <button type="button" className="ew-result-unfold" onClick={unfold}>Show every step</button></p>{results.map(t=><MathText key={t} tex={t} block/>)}{withK}<p><Prose text={sign}/></p></div>
  :<div className="ew-result is-shown is-partial"><span className="ew-result-label">The answer for the bracketed part</span><p><Prose text={partNote}/></p>{partTex&&<><MathText className="ew-result-part" tex={partTex} block/><p>{partBack}</p></>}</div>}
 {/* THE SHELF: what a reader opens afterwards. The interval, the algebra worked out, and where
     the model comes from -- all closed until asked for, so the derivation stays the subject. */}
 <div className="ew-reference">
 <div className="ew-bounds"><button className="ew-disclosure" onClick={()=>setBoundsOpen(!boundsOpen)} aria-expanded={boundsOpen} aria-controls={`${uid}-bounds`}><span>Integration interval</span><span><MathText tex={allBounds?raw`${p.variableTex}\colon{${p.boundTex[0]}}\to{${p.boundTex[1]}}`:raw`${p.variableTex}\colon{${lower}}\to{${upper}}`}/><ChevronDown size={14}/></span></button>{boundsOpen&&<form id={`${uid}-bounds`} className="ew-bound-form" onSubmit={applyBounds}><p>Use symbols such as <MathText tex={p.boundTex[0]}/> and <MathText tex={p.boundTex[1]}/>. Equivalent expressions work, too.</p><div className="ew-bound-fields"><label htmlFor={`${uid}-lower`}>Lower bound<input id={`${uid}-lower`} value={bounds[0]} onChange={e=>setBounds([e.target.value,bounds[1]])} autoComplete="off" spellCheck={false}/></label><label htmlFor={`${uid}-upper`}>Upper bound<input id={`${uid}-upper`} value={bounds[1]} onChange={e=>setBounds([bounds[0],e.target.value])} autoComplete="off" spellCheck={false}/></label></div><div className="ew-bound-actions"><Button type="submit" size="sm">Apply interval</Button><Button type="button" variant="ghost" size="sm" onClick={wholeBounds}>Whole distribution</Button></div>{feedback&&<output className="ew-bound-feedback">{feedback}</output>}</form>}</div>
 <div className="ew-worked" ref={workedRef}><button className="ew-disclosure" onClick={()=>setWorked(!worked)} aria-expanded={worked} aria-controls={`${uid}-worked`}><span>Unfold the integration</span><ChevronDown size={15}/></button>{worked&&<div id={`${uid}-worked`} className="ew-worked-body"><p className="ew-context">{algebra.id==='infinite'&&algebra.variable==='y'?'Alternate derivation: start with a finite rod of length L, then let L grow at fixed λ. The live model above remains the infinite line.':allBounds?'Follow the algebra for the whole distribution, one step at a time.':'These steps derive the whole-distribution result. Your selected partial interval remains above.'}</p>{steps.slice(0,stepCount).map((step,i)=><Fragment key={`${p.id}-${p.variable}-${i}`}>{back.length>0&&i===integration.length&&<><h3 className="ew-worked-sub">Differentiate back</h3>{why&&<p className="ew-worked-why"><Prose text={why}/></p>}</>}<div className="ew-worked-step"><div><p><Prose text={step.text}/></p><MathText tex={step.tex} block/></div></div></Fragment>)}{stepCount<steps.length?<Button className="ew-next-step" variant="outline" onClick={()=>setStepCount(stepCount+1)}>Next step<ArrowDown size={14}/></Button>:<p className="ew-worked-done"><Check size={13}/>Every step accounted for.</p>}</div>}</div>
 <details className="ew-references"><summary className="ew-disclosure"><span>Model assumptions &amp; references</span><ChevronDown size={15}/></summary><div className="ew-references-body"><p><Prose text={p.id==='ramp'?raw`Finite distributions use total charge, except this rod: its charge slider sets the peak density $\lambda_0$. Unbounded distributions hold charge density fixed.`:'Finite distributions use total charge; unbounded distributions hold charge density fixed.'}/></p>{p.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={12}/></a>)}</div></details></div>
 </div></aside>;
}
