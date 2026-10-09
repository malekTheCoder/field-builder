'use client';
import { useId, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MathText } from './Math';
import { DerivationBoard, type BoardState } from './DerivationBoard';
import { equivalent, preview, safeParse } from '../symbolic/equivalence';
import { boardLines, resultLines, type Term } from '../workbench/derivation';
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
function fraction(n:number){for(let d=1;d<=100;d++)if(Math.abs(n*d-Math.round(n*d))<1e-7)return d===1?`${Math.round(n)}`:`${Math.round(n*d)}/${d}`;return `${Number(n.toFixed(4))}`;}
function scaled(n:number,s:string){return n===0?'0':n===1?s:n===-1?`-${s}`:`(${fraction(n)})*${s}`;}
function boundExpression(p:Problem,percent:number){const t=clamp(percent/100),g=p.geometry;if(t===0)return p.bounds[0];if(t===1)return p.bounds[1];if(g==='bisector'||(p.id==='infinite'&&p.variable==='y'))return scaled(t-.5,'L');if(g==='axial'||g==='endpoint'||g==='ramp')return scaled(t,'L');if(g==='ring')return scaled(2*t,'pi');if(g==='arc')return scaled(t-.5,'phi');if(g==='disk')return scaled(t,'R');if(p.id==='infinite')return scaled(t-.5,'pi');return `${g==='sheet'?'z':'r'}*tan(${scaled(t/2,'pi')})`;}
function boundPercent(p:Problem,value:string,params:Params){if(equivalent(value,p.bounds[0],p).ok)return 0;if(equivalent(value,p.bounds[1],p).ok)return 100;const x=safeParse(value).compile().evaluate({L:params.size,R:params.size/2,z:params.distance,r:params.distance,a:params.distance,pi:Math.PI,phi:params.phi,Infinity});if(typeof x!=='number'||!Number.isFinite(x))throw Error('Use a bound inside this distribution.');const g=p.geometry;if(g==='bisector'||(p.id==='infinite'&&p.variable==='y'))return 100*(x/params.size+.5);if(g==='axial'||g==='endpoint'||g==='ramp')return 100*x/params.size;if(g==='ring')return 100*x/(2*Math.PI);if(g==='arc')return 100*(x/params.phi+.5);if(g==='disk')return 200*x/params.size;if(p.id==='infinite')return 100*(x/Math.PI+.5);return 200*Math.atan(x/Math.abs(params.distance))/Math.PI;}
/** Which factor a pointed-at feature of the figure, or a slider, stands behind. The length lights
 * the limits because the limits are written in it; the charge lights the piece's charge. */
const LIGHTS:Record<string,Term>={element:'element',charge:'element',distance:'distance',projection:'projection',bounds:'bounds',size:'bounds',angle:'bounds'};
const REST:BoardState={open:false,index:-1,playing:false,settled:true};
export function EquationWorkbench({problem:p,derivationProblem,params,onModeChange,onHighlight,boundRange,onBoundRangeChange,build=REST,onStep,highlight=''}:EquationWorkbenchProps){
 const uid=useId();const[worked,setWorked]=useState(false);const[stepCount,setStepCount]=useState(1);const[boundsOpen,setBoundsOpen]=useState(false);const[bounds,setBounds]=useState<[string,string]>(p.bounds);const[feedback,setFeedback]=useState('');
 const[syncedRange,setSyncedRange]=useState(boundRange);
 if(syncedRange[0]!==boundRange[0]||syncedRange[1]!==boundRange[1]){setSyncedRange(boundRange);setBounds([boundExpression(p,boundRange[0]),boundExpression(p,boundRange[1])]);}
 const g=p.geometry,scalar=p.quantity==='V',allBounds=boundRange[0]<=.001&&boundRange[1]>=99.999;
 const lower=preview(boundExpression(p,boundRange[0])),upper=preview(boundExpression(p,boundRange[1]));
 const stages=buildStages(p);
 // The limits in the last line follow the brackets in the figure: drag one and the integral is
 // rewritten over the part of the charge it now covers.
 const lines=boardLines(p,allBounds?undefined:[lower,upper]);
 // The answer is where the derivation ends, so it waits for the run to get there -- and at rest,
 // with the derivation all on the page, it is simply the last thing on it.
 const settled=!build.open||(build.index===stages.length-1&&build.settled);
 const algebra=derivationProblem??p;const original=algebra.steps.find(s=>s.kind==='integrate')?.worked??[];
 const steps=g==='bisector'&&!scalar?[{text:'Turn the changing distance into an angle. Hold r fixed as the source position changes.',tex:raw`y=r\tan u,\quad dy=r\sec^2u\,du`},{text:'The Jacobian supplies two powers of secant. One remains in the denominator.',tex:raw`\int\frac{r\,dy}{(y^2+r^2)^{3/2}}=\frac1r\int\cos u\,du`},{text:'Integrate, then return to the original triangle.',tex:raw`\frac{\sin u}{r}=\frac{y}{r\sqrt{y^2+r^2}}`},...original.slice(1)]:original;
 function applyBounds(event:{preventDefault():void}){event.preventDefault();try{const a=boundPercent(p,bounds[0],params),b=boundPercent(p,bounds[1],params);if(a<-.000001||b>100.000001||a>=b)throw Error('Choose an increasing interval inside the distribution.');onBoundRangeChange([Math.max(0,a),Math.min(100,b)]);onModeChange('integrate');setFeedback(a===0&&b===100?'Whole distribution selected. Equivalent forms accepted.':'Interval applied. The integral and highlighted region now match.');}catch(e){setFeedback(e instanceof Error?e.message:'Check the expressions and try again.');}}
 return <aside className="ew-panel" aria-label="Live equation workbench"><div className="ew-content">
 {/* ONE SUBJECT. The panel used to open on a caption equation that changed with the figure's
     mode, then a template of blanks, then four rows of blanks under an instruction that did
     nothing. The derivation is now the panel's subject from its first line to the answer. */}
 <div className="ew-assembly">
  <h2 className="ew-section-title">Build the integral</h2>
  <p className="ew-lede">{build.open?'Each line adds one idea, in step with the figure.':'Five steps from one piece of charge to the whole. Choose one to watch it on the figure.'}</p>
  <DerivationBoard lines={lines} names={stages.map(s=>s.name)} notes={stages.map(s=>s.caption)} state={build} lit={LIGHTS[highlight]??''}
   onStep={onStep} onPoint={term=>onHighlight?.(term)}/>
 </div>
 {allBounds
  ?<div className={'ew-result'+(settled?' is-shown':'')} aria-hidden={settled?undefined:true}><span className="ew-result-label">The whole distribution</span>{resultLines(p).map(t=><MathText key={t} tex={t} block/>)}<p>{scalar?'Signed potential. Reverse the charge to reverse the sign; there is no direction to keep track of.':`Signed field component${['semi','endpoint','ramp'].includes(p.id)?'s':''}. Reversing the charge reverses the field.`}</p></div>
  :<div className="ew-result is-shown is-partial"><span className="ew-result-label">Part of the distribution</span><p>The integral above now runs over the bracketed part of the charge only. Choose the whole distribution to get the closed form back.</p></div>}
 <footer className="ew-footer"><MathText tex={raw`k=\frac1{4\pi\varepsilon_0}`}/></footer>
 {/* THE SHELF: what a reader opens afterwards. The interval, the algebra worked out, and where
     the model comes from -- all closed until asked for, so the derivation stays the subject. */}
 <div className="ew-reference">
 <div className="ew-bounds"><button className="ew-disclosure" onClick={()=>setBoundsOpen(!boundsOpen)} aria-expanded={boundsOpen} aria-controls={`${uid}-bounds`}><span>Integration interval</span><span><MathText tex={raw`${lower}\;\to\;${upper}`}/><ChevronDown size={14}/></span></button>{boundsOpen&&<form id={`${uid}-bounds`} className="ew-bound-form" onSubmit={applyBounds}><p>Use symbols such as <MathText tex={p.boundTex[0]}/> and <MathText tex={p.boundTex[1]}/>. Equivalent expressions work, too.</p><div className="ew-bound-fields"><label htmlFor={`${uid}-lower`}>Lower bound<input id={`${uid}-lower`} value={bounds[0]} onChange={e=>setBounds([e.target.value,bounds[1]])} autoComplete="off" spellCheck={false}/></label><label htmlFor={`${uid}-upper`}>Upper bound<input id={`${uid}-upper`} value={bounds[1]} onChange={e=>setBounds([bounds[0],e.target.value])} autoComplete="off" spellCheck={false}/></label></div><div className="ew-bound-actions"><Button type="submit" size="sm">Apply interval</Button><Button type="button" variant="ghost" size="sm" onClick={()=>{setBounds(p.bounds);onBoundRangeChange([0,100]);setFeedback('Whole distribution selected.');}}>Whole distribution</Button></div>{feedback&&<output className="ew-bound-feedback">{feedback}</output>}</form>}</div>
 <div className="ew-worked"><button className="ew-disclosure" onClick={()=>setWorked(!worked)} aria-expanded={worked} aria-controls={`${uid}-worked`}><span>Unfold the integration</span><ChevronDown size={15}/></button>{worked&&<div id={`${uid}-worked`} className="ew-worked-body"><p className="ew-context">{algebra.id==='infinite'&&algebra.variable==='y'?'Alternate derivation: start with a finite rod of length L, then let L grow at fixed λ. The live model above remains the infinite line.':allBounds?'Follow the algebra for the whole distribution, one transformation at a time.':'These steps derive the whole-distribution result. Your selected partial interval remains above.'}</p>{steps.slice(0,stepCount).map((step,i)=><div className="ew-worked-step" key={`${p.id}-${p.variable}-${i}`}><div><p>{step.text}</p><MathText tex={step.tex} block/></div></div>)}{stepCount<steps.length?<Button className="ew-next-step" variant="outline" onClick={()=>setStepCount(stepCount+1)}>Next transformation<ArrowDown size={14}/></Button>:<p className="ew-worked-done"><Check size={13}/>Every transformation accounted for.</p>}</div>}</div>
 <details className="ew-references"><summary className="ew-disclosure"><span>Model assumptions &amp; references</span><ChevronDown size={15}/></summary><div className="ew-references-body"><p>{p.setup}</p><p>Geometry uses meters. Finite distributions use total charge; unbounded distributions hold charge density fixed.</p>{p.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={12}/></a>)}</div></details></div>
 </div></aside>;
}
