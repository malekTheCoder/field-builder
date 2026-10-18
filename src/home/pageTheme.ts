import {useEffect,useSyncExternalStore} from 'react';
import {STORAGE} from '../explorer/Explorer';

// Utility pages used to observe only the document class, so a live system change worked in a
// lesson but stopped working in the guide, quiz or home page. The document remains the shared
// rendered theme; only an explicit click is saved. Keep a click for this visit even if storage
// refuses writes, and let a new page load (or the tests' newVisit) read the saved choice afresh.
let visitChoice:boolean|undefined;
export function resetPageTheme(){visitChoice=undefined}
const subscribe=(on:()=>void)=>{const o=new MutationObserver(on);o.observe(document.documentElement,{attributes:true,attributeFilter:['class']});return()=>o.disconnect()};
const isDark=()=>document.documentElement.classList.contains('dark');
function saved(){try{const v=JSON.parse(localStorage.getItem(STORAGE)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
function choice(){const v=saved().dark;return visitChoice??(typeof v==='boolean'?v:undefined)}
function choose(dark:boolean){
 visitChoice=dark;document.documentElement.classList.toggle('dark',dark);
 try{localStorage.setItem(STORAGE,JSON.stringify({...saved(),dark}));visitChoice=undefined}catch{/* Explicit choice still lasts for this visit. */}
}
export function usePageTheme(){
 const dark=useSyncExternalStore(subscribe,isDark,()=>false);
 useEffect(()=>{
  const q=window.matchMedia('(prefers-color-scheme: dark)');
  const follow=()=>document.documentElement.classList.toggle('dark',choice()??q.matches);
  follow();q.addEventListener('change',follow);return()=>q.removeEventListener('change',follow);
 },[]);
 return [dark,choose] as const;
}
