'use client';
import {useRef,useState} from 'react';
import {FolderInput,FolderOutput} from 'lucide-react';
import {Hint} from './Hint';
import {downloadProgress,exportProgress,importProgress,loadProgress,STORAGE_KEY,type ProgressData} from '../state/progress';
export function ProgressTransfer({data,onChange}:{data?:ProgressData;onChange?:(next:ProgressData)=>void}={}){
 const input=useRef<HTMLInputElement>(null),[status,setStatus]=useState('');
 const snapshot=()=>data??loadProgress(typeof localStorage==='undefined'?null:localStorage.getItem(STORAGE_KEY));
 const commit=(next:ProgressData)=>{if(onChange)onChange(next);else try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{setStatus('Progress could not be saved on this device.');}};
 function save(){downloadProgress(exportProgress(snapshot()));setStatus('Lesson progress downloaded as JSON.');}
 async function read(file:File){
  try{
   const result=importProgress(await file.text(),snapshot());
   if(!result.ok){setStatus('That file is not Field Builder progress. Your saved lessons are unchanged.');return;}
   commit(result.data);
   setStatus(result.imported?`Imported ${result.imported} lesson${result.imported===1?'':'s'}. Other saved lessons were kept.`:'No lesson progress in that file. Your saved lessons are unchanged.');
  }catch{setStatus('Could not read that file. Your saved lessons are unchanged.');}
 }
 return <><Hint label="Export lesson progress"><button type="button" className="icon-button no-print" onClick={save} aria-label="Export lesson progress"><FolderOutput size={16}/></button></Hint><Hint label="Import lesson progress"><button type="button" className="icon-button no-print" onClick={()=>input.current?.click()} aria-label="Import lesson progress"><FolderInput size={16}/></button></Hint><input ref={input} type="file" accept="application/json,.json" className="sr-only" aria-hidden="true" tabIndex={-1} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void read(file);}}/><output className="sr-only" aria-live="polite">{status}</output></>;
}
