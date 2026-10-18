'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import Explorer from '../explorer/Explorer';
import Home from './Home';
import Guide from '../guide/Guide';
import Quiz from '../quiz/Quiz';
import GaussLesson from '../gauss/GaussLesson';
import {subscribeAddress,viewOf,type View} from '../state/route';

/** How the lesson on screen was reached in this visit: from the address the page was opened at, as the first
 * lesson entered from the home page, or as a later one. The tour opens once a visit (Explorer, `welcome`), so
 * the lesson needs to know which. Kept per page load, moved on only when the address does; read through the
 * same store as the view, so a render never changes it. */
type Arrival='address'|'first'|'again';
const visit={search:null as string|null,view:'home' as View,lessons:0,arrival:'address' as Arrival,key:''};
/** A new visit, as a page load starts one: for tests, which mount the site many times in one page. */
export function newVisit(){Object.assign(visit,{search:null,view:'home',lessons:0,arrival:'address',key:''})}
function snapshot(){
 const search=location.search;
 if(search!==visit.search){
  const view=viewOf(search),entering=view==='lesson'&&(visit.search===null||visit.view!=='lesson');
  if(entering){visit.arrival=visit.search===null?'address':visit.lessons===0?'first':'again';visit.lessons++}
  visit.search=search;visit.view=view;visit.key=`${view}|${visit.arrival}`;
 }
 return visit.key;
}

/** THE SITE HAS A FRONT PAGE. The root address opened straight into a lesson -- the last one this browser
 * had open -- so there was nowhere to say what the site is, or to see every lesson at once, and the name in
 * the corner went nowhere. The address decides: one that names a lesson (`?p=ring`, as every lesson's own
 * address and every shared link does) opens that lesson directly; the bare address is the home page. Moving
 * between them is a history entry like any other, so Back from a lesson comes home.
 *
 * The Explorer itself still opens a lesson whenever it is mounted -- this is the only place that decides
 * whether it is. On the server there is no address to read, so nothing is drawn until the page knows. */
export default function Site(){
 const key=useSyncExternalStore(subscribeAddress,snapshot,()=>null);
 const [view,arrival]=(key?.split('|')??[null,null]) as [View|null,Arrival|null];
 // A move between the two starts the new page at its top, with the focus on it, as a page load would --
 // not part way down the old page's scroll, with the focus gone with the link that was pressed.
 // On a lesson, its title (Explorer, `focusLesson`), not <main id="lesson">: <main> is not focusable there, on
 // purpose, so the focus silently stayed on <body> and a screen reader said nothing after a lesson was chosen.
 const shown=useRef<View|null>(null);
 useEffect(()=>{
  const before=shown.current;shown.current=view;
  if(view===null||before===view)return;
  // A link to a part of the new page (the lesson's "Teaching with this?" goes to the guide's part for teachers)
  // opens at that part, with the focus on it, as a page loaded at that address would.
  const part=(()=>{try{return location.hash.length>1?document.getElementById(decodeURIComponent(location.hash.slice(1))):null}catch{return null}})();
  if(part){
   // A directly opened fragment has no target until React mounts this page. Handle that first arrival too.
   // Fonts can then change the height above it: keep the focused destination aligned when they settle,
   // unless the reader has moved focus or navigation has replaced this page in the meantime.
   const hash=location.hash;let active=true;
   if(!part.hasAttribute('tabindex'))part.setAttribute('tabindex','-1');
   part.scrollIntoView({block:'start'});part.focus({preventScroll:true});
   void (document.fonts?.ready??Promise.resolve()).then(()=>{if(active&&location.hash===hash&&document.activeElement===part)part.scrollIntoView({block:'start'})});
   return()=>{active=false};
  }
  if(before===null)return;
  window.scrollTo({top:0,behavior:'auto'});
  document.getElementById(view==='lesson'||view==='gauss'?'lesson-title':view)?.focus({preventScroll:true});
 },[view]);
 return view===null?null:view==='home'?<Home/>:view==='guide'?<Guide/>:view==='quiz'?<Quiz/>:view==='gauss'?<GaussLesson/>:<Explorer welcome={arrival==='address'?undefined:arrival==='first'}/>;
}
