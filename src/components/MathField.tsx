'use client';
import {useEffect,useId,useImperativeHandle,useRef,useState} from 'react';
import './mathfield.css';
// MathLive ships as a custom element and touches `window` on import, so it is
// loaded lazily on the client. Until it resolves we render a plain text input
// with the same value, which keeps the field usable during SSR and if the
// bundle fails to arrive.
type MathFieldElement=HTMLElement&{value:string;smartFence?:boolean;smartMode?:boolean;mathVirtualKeyboardPolicy?:string;executeCommand?:(c:unknown)=>void};
// oxlint-disable-next-line typescript/no-namespace -- React custom-element JSX types require module/namespace augmentation.
declare module 'react'{namespace JSX{interface IntrinsicElements{'math-field':React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>,HTMLElement>}}}
import {loadMathLive} from './mathlive-loader';
/** Lets callers drop or click a fact chip straight into the caret position. */
export type MathFieldHandle={insert:(latex:string)=>void};
export type MathFieldProps={value:string;onChange:(latex:string)=>void;label:string;placeholder?:string;invalid?:boolean;id?:string;onEnter?:()=>void;ref?:React.Ref<MathFieldHandle>};
export function MathField({value,onChange,label,placeholder,invalid,id,onEnter,ref}:MathFieldProps){
 const host=useRef<MathFieldElement|null>(null),fallback=useRef<HTMLInputElement|null>(null),latest=useRef(onChange);useEffect(()=>{latest.current=onChange},[onChange]);
 const [ready,setReady]=useState(false),[plain,setPlain]=useState(false),[failed,setFailed]=useState(false),[focused,setFocused]=useState(false),[attempt,setAttempt]=useState(0);const help=useId();const rich=ready&&!plain&&!focused;
 useEffect(()=>{let live=true;const timer=window.setTimeout(()=>{if(live)setFailed(true)},10000);loadMathLive().then(()=>{if(live){setReady(true);setFailed(false)}}).catch(()=>{if(live)setFailed(true)});return()=>{live=false;clearTimeout(timer)}},[attempt]);
 useEffect(()=>{
  const el=host.current;if(!el||!rich)return;
  // The virtual keyboard is what makes this worth having on a tablet, but it
  // must not spring open when a mouse user merely tabs through the form.
  el.smartFence=true;el.smartMode=false;el.mathVirtualKeyboardPolicy='auto';
  const handle=()=>latest.current(el.value);
  const keys=(ev:Event)=>{if((ev as KeyboardEvent).key==='Enter'){ev.preventDefault();onEnter?.()}};
  el.addEventListener('input',handle);el.addEventListener('keydown',keys);
  return()=>{el.removeEventListener('input',handle);el.removeEventListener('keydown',keys)};
 },[rich,onEnter]);
 // Only write back when the model and the field genuinely disagree, otherwise
 // every keystroke would reset the caret to the end of the expression.
 useEffect(()=>{const el=host.current;if(el&&rich&&el.value!==value)el.value=value},[value,rich]);
 // executeCommand fires beforeinput/input just as typing does, so the drop path
 // grades identically to a hand-built expression. The fallback simply appends.
 useImperativeHandle(ref,()=>({insert(latex){const el=host.current;if(el&&rich&&el.executeCommand){el.focus();el.executeCommand(['insert',latex]);latest.current(el.value)}else{const input=fallback.current;const start=input?.selectionStart??value.length,end=input?.selectionEnd??start;input?.focus();latest.current(value.slice(0,start)+latex+value.slice(end))}}}),[rich,value]);
// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- MathLive is a custom element with its own editable shadow DOM, so its host needs textbox semantics.
 return <><div>{!rich?<input ref={fallback} id={id} aria-label={label} aria-describedby={help} aria-invalid={invalid} className={'mathfield-fallback'+(invalid?' invalid':'')} value={value} placeholder={placeholder} spellCheck={false} autoComplete="off" onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onEnter?.()}}}/>:<math-field ref={host as React.Ref<HTMLElement>} id={id} role="textbox" aria-label={label} aria-invalid={invalid||undefined} data-placeholder={placeholder} className={"mathfield"+(invalid?" invalid":"")}/>}</div><div className="mathfield-options">{!rich&&<small id={help}>{failed?'Math keyboard unavailable. ':''}Type expressions such as Q/L, sqrt(x), or pi. Enter checks your answer.</small>}<button type="button" onClick={()=>{setPlain(!plain);setFocused(false)}}>{plain?'Use math keyboard':'Use plain text'}</button>{failed&&!ready&&<button type="button" onClick={()=>{setFailed(false);setAttempt(x=>x+1)}}>Retry math keyboard</button>}</div></>;
}
