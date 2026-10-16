'use client';
import {memo,useId,useLayoutEffect,useRef} from 'react';
import {ChevronDown,ExternalLink} from 'lucide-react';
import {MathText,Prose} from '../components/Math';
import type {Lesson} from '../lessons';
/* THE LESSON AT THE TOP OF THE LESSON (src/lessons). Its lead is always there, under the title: what the page
 * finds and the one idea that finds it. The teaching itself folds away -- shut by default, so the figure and
 * Watch it build stay on a laptop's first screen -- and opens in place, where it is read before the build.
 * Shut, it is still on the page: hidden on the screen only, so paper prints it whole whatever the disclosure
 * says (print.css), as a handout leads with the lesson.
 *
 * Its own component, memoised, so the sixty frames a second of "Watch it build" never reach its equations. */
export const LessonIntro=memo(function LessonIntro({lesson,open,onToggle,onBuild}:{lesson:Pick<Lesson,'lead'|'sections'|'read'>;open:boolean;onToggle:()=>void;onBuild:()=>void}){
 const uid=useId(),bodyId=`${uid}-body`,headingId=`${uid}-heading`;
 const toggle=useRef<HTMLButtonElement>(null),root=useRef<HTMLElement>(null);
 // THE FIGURE MAKES ROOM FOR THE LEAD. On a short laptop window the drawing is held to the window less the page
 // above it (explorer.css, --lesson-room), and the lead is part of that page now: at 1366 by 657 it put the
 // drawing's foot, and the ΔQ its footer names, under the window. Its height is measured while it is shut, at
 // any width and whatever the lesson's lead -- and not while it is open, when the figure is a page further down
 // and a drawing that shrank as the lesson opened would only be one more thing moving.
 useLayoutEffect(()=>{
  const el=root.current,main=el?.closest<HTMLElement>('.exp-main');
  if(!el||!main||open)return;
  const measure=()=>main.style.setProperty('--lesson-room',`${Math.ceil(el.offsetHeight+parseFloat(getComputedStyle(el).marginBottom||'0'))}px`);
  measure();
  const watch=new ResizeObserver(measure);watch.observe(el);
  return()=>watch.disconnect();
 },[open]);
 // And gives it back when the lesson goes: a geometry with no lesson yet has no lead above its figure.
 useLayoutEffect(()=>{const main=root.current?.closest<HTMLElement>('.exp-main');return()=>{main?.style.removeProperty('--lesson-room')}},[]);
 // Hidden from the foot of the lesson, the button that was pressed is gone with it: the focus goes back to the
 // one at the top, and the page with it, rather than to the end of a page that has just shrunk under it.
 const hideFromFoot=()=>{onToggle();toggle.current?.focus()};
 return <section ref={root} className={'exp-lesson'+(open?' is-open':'')} aria-labelledby={headingId}>
  <h2 id={headingId} className="sr-only">The lesson</h2>
  <p className="exp-lesson-lead"><Prose text={lesson.lead}/></p>
  <button ref={toggle} type="button" className="exp-lesson-toggle no-print" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}><ChevronDown size={15} aria-hidden="true"/>{open?'Hide the lesson':'Read the lesson'}</button>
  <div id={bodyId} className={'exp-lesson-body'+(open?'':' is-shut')}>
   {lesson.sections.map(s=><section key={s.heading} className="exp-lesson-section"><h3>{s.heading}</h3>
    {s.body.map((b,i)=>typeof b==='string'?<p key={i}><Prose text={b}/></p>:<MathText key={i} block className="exp-lesson-display" tex={b.tex}/>)}</section>)}
   <section className="exp-lesson-section exp-lesson-read"><h3>Read it in a textbook</h3>
    <ul>{lesson.read.map((r,i)=><li key={i}>{r.url?<a href={r.url} target="_blank" rel="noreferrer">{r.book}<ExternalLink size={12} aria-hidden="true"/></a>:<cite>{r.book}</cite>}<span>{r.where}</span>{r.url&&<span className="exp-lesson-url">{r.url}</span>}</li>)}</ul>
   </section>
   {/* The lesson ends where the page's one button begins: the same argument, built one stage at a time on the
       figure. Named for where it goes, not "Watch it build" a second time -- two buttons of one name doing two
       different things. */}
   <div className="exp-lesson-next no-print"><p>Now build it, one stage at a time, on the figure.</p>
    <button type="button" className="exp-lesson-go" onClick={onBuild}>Go to Watch it build</button>
    <button type="button" className="exp-lesson-toggle" aria-expanded={open} aria-controls={bodyId} onClick={hideFromFoot}><ChevronDown size={15} aria-hidden="true"/>Hide the lesson</button>
   </div>
  </div>
 </section>;
});
