'use client';
import {useId,useRef,useState} from 'react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {MathText} from './Math';
import {MathField,type MathFieldHandle} from './MathField';
import {preview} from '../symbolic/equivalence';
import type {Answer} from '../problems/types';
export function Choices({value,onChange,options,label}:{value:string;onChange:(s:string)=>void;options:string[];label:string}){const id=useId();return <RadioGroup value={value} onValueChange={v=>onChange(String(v))} aria-label={label} className="choices">{options.map((o,i)=><label key={o} htmlFor={id+i} className={'option '+(value===o?'selected':'')}><RadioGroupItem id={id+i} value={o}/><span>{o}</span></label>)}</RadioGroup>}
// The symbols this course actually needs, in one row so a tablet user never has
// to hunt through the virtual keyboard. `\int` is deliberately absent: no answer
// field in the wizard is an integral, and safeParse rejects it, so offering the
// sign would only manufacture wrong answers.
const SYMBOLS:[string,string,string][]=[['λ',String.raw`\lambda`,'lambda'],['σ',String.raw`\sigma`,'sigma'],['ε₀',String.raw`\varepsilon_0`,'epsilon nought'],['θ',String.raw`\theta`,'theta'],['φ',String.raw`\phi`,'phi'],['π',String.raw`\pi`,'pi'],['√',String.raw`\sqrt{#?}`,'square root'],['⁄',String.raw`\frac{#?}{#?}`,'fraction'],['xⁿ',String.raw`^{#?}`,'exponent']];
export function AnswerInput({field,value,onChange,guided,error,palette=false,onEnter}:{field:Answer;value:string;onChange:(s:string)=>void;guided:boolean;error?:boolean;palette?:boolean;onEnter?:()=>void}){
 const id=useId();const mf=useRef<MathFieldHandle|null>(null);const [over,setOver]=useState(false);
 const options=[...field.options].sort((a,b)=>{const hash=(s:string)=>{let n=7;for(let i=0;i<s.length;i++)n=(n*31+s.charCodeAt(i))|0;return n};return hash(a)-hash(b)});
 // Chips travel as LaTeX. normalize() folds \frac/\sqrt back, so a dropped fact
 // grades exactly like the ASCII form the plain input used to carry.
 const insert=(latex:string)=>{if(latex)mf.current?.insert(latex)};
 return <div className={'answer-field '+(error?'invalid':'')}><label className="answer-label" htmlFor={id}>{field.label}</label>{guided&&!palette?<RadioGroup value={value} onValueChange={v=>onChange(String(v))} aria-label={field.label} className="math-options">{options.map((o,i)=><label key={o} htmlFor={id+i} className={'math-option '+(value===o?'selected':'')}><RadioGroupItem id={id+i} value={o}/><MathText tex={preview(o)}/></label>)}</RadioGroup>:<>
  {/* Capture phase: MathLive owns drag handling inside the custom element, so the blank must claim the chip before it gets there. */}
  <div className={'mathfield-drop'+(over?' over':'')} onDragOverCapture={e=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)} onDropCapture={e=>{e.preventDefault();e.stopPropagation();setOver(false);insert(e.dataTransfer.getData('text/plain'))}}>
   <MathField ref={mf} id={id} label={field.label} value={value} onChange={onChange} invalid={error} onEnter={onEnter} placeholder={palette?'Drop a fact here, or build an expression':'Build an expression…'}/>
  </div>
  <fieldset className="symbol-row" aria-label={'Symbols for '+field.label} style={{border:0,padding:0,margin:0,minWidth:0}}>{SYMBOLS.map(([glyph,latex,name])=><button key={name} type="button" className="symbol-key" aria-label={name} title={name} onMouseDown={e=>e.preventDefault()} onClick={()=>insert(latex)}>{glyph}</button>)}</fieldset>
  {palette&&<div className="palette" aria-label={'Facts for '+field.label}>{options.map(o=><button key={o} className="fact-chip" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',preview(o))} onClick={()=>insert(preview(o))} title="Drag this fact into the blank, or click to use it"><MathText tex={preview(o)}/></button>)}</div>}
 </>}</div>;
}
