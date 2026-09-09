'use client';
import {useEffect,useImperativeHandle,useRef,useState} from 'react';
import './mathfield.css';
// MathLive ships as a custom element and touches `window` on import, so it is
// loaded lazily on the client. Until it resolves we render a plain text input
// with the same value, which keeps the field usable during SSR and if the
// bundle fails to arrive.
type MathFieldElement=HTMLElement&{value:string;smartFence?:boolean;smartMode?:boolean;mathVirtualKeyboardPolicy?:string;executeCommand?:(c:unknown)=>void};
declare module 'react'{namespace JSX{interface IntrinsicElements{'math-field':React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>,HTMLElement>}}}
let loader:Promise<unknown>|null=null;
// MathLive fetches its fonts and keypress sounds at runtime from directories it
// resolves relative to the document. Left at their defaults both 404, and the
// failed fetch leaves the element unfocusable. The fonts are the KaTeX faces we
// already ship, copied into public/; the sounds are switched off outright.
const load=()=>(loader??=import('mathlive').then(m=>{const E=m.MathfieldElement as unknown as {fontsDirectory:string|null;soundsDirectory:string|null};E.fontsDirectory='/mathlive-fonts';E.soundsDirectory=null;return m}));
/** Lets callers drop or click a fact chip straight into the caret position. */
export type MathFieldHandle={insert:(latex:string)=>void};
export type MathFieldProps={value:string;onChange:(latex:string)=>void;label:string;placeholder?:string;invalid?:boolean;id?:string;onEnter?:()=>void;ref?:React.Ref<MathFieldHandle>};
export function MathField({value,onChange,label,placeholder,invalid,id,onEnter,ref}:MathFieldProps){
 const host=useRef<MathFieldElement|null>(null),fallback=useRef<HTMLInputElement|null>(null),latest=useRef(onChange);latest.current=onChange;
 const [ready,setReady]=useState(false);
 useEffect(()=>{let live=true;load().then(()=>{if(live)setReady(true)}).catch(()=>{});return()=>{live=false}},[]);
 useEffect(()=>{
  const el=host.current;if(!el||!ready)return;
  // The virtual keyboard is what makes this worth having on a tablet, but it
  // must not spring open when a mouse user merely tabs through the form.
  el.smartFence=true;el.smartMode=false;el.mathVirtualKeyboardPolicy='auto';
  const handle=()=>latest.current(el.value);
  const keys=(ev:Event)=>{if((ev as KeyboardEvent).key==='Enter'){ev.preventDefault();onEnter?.()}};
  el.addEventListener('input',handle);el.addEventListener('keydown',keys);
  return()=>{el.removeEventListener('input',handle);el.removeEventListener('keydown',keys)};
 },[ready,onEnter]);
 // Only write back when the model and the field genuinely disagree, otherwise
 // every keystroke would reset the caret to the end of the expression.
 useEffect(()=>{const el=host.current;if(el&&ready&&el.value!==value)el.value=value},[value,ready]);
 // executeCommand fires beforeinput/input just as typing does, so the drop path
 // grades identically to a hand-built expression. The fallback simply appends.
 useImperativeHandle(ref,()=>({insert(latex){const el=host.current;if(el&&ready&&el.executeCommand){el.focus();el.executeCommand(['insert',latex]);latest.current(el.value)}else{fallback.current?.focus();latest.current(value?value+latex:latex)}}}),[ready,value]);
 if(!ready)return <input ref={fallback} id={id} aria-label={label} aria-invalid={invalid} className={'mathfield-fallback'+(invalid?' invalid':'')} value={value} placeholder={placeholder} spellCheck={false} autoComplete="off" onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onEnter?.()}}}/>;
 return <math-field ref={host as React.Ref<HTMLElement>} id={id} role="textbox" aria-label={label} aria-invalid={invalid||undefined} data-placeholder={placeholder} className={"mathfield"+(invalid?" invalid":"")}/>;
}
