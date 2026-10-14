'use client';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {ArrowRight,Check,ClipboardCheck,Moon,RotateCcw,Sun,X} from 'lucide-react';
import {getProblem,PROBLEMS} from '../problems/definitions';
import {isReady} from '../problems/readiness';
import type {ProblemId} from '../problems/types';
import {HOME_HREF,QUIZ_HREF,goHome,inPlace,navigate} from '../state/route';
import {FAMILIES,ShapeGlyph} from '../explorer/lessons';
import {Brand} from '../explorer/Brand';
import {STORAGE} from '../explorer/Explorer';
import {MathText,Prose} from '../components/Math';
import {Hint} from '../components/Hint';
import {BANKS,DEFAULT_SETTINGS,KINDS,LENGTHS,QUESTION,STAGE_NAME,clearHistory,confidence,correctIndex,draw,drawAgain,drawWeak,grade,hasHistory,inWords,place,pointerFor,readHistory,record,score,toRevisit,weakSpots,writeHistory,type Drawn,type History,type Result,type Settings} from './engine';
import {MISCONCEPTION} from './misconceptions';
import type {Answer,Choice,Kind,Pointer} from './types';
import '../explorer/explorer.css';
import './quiz.css';

/* QUIZ YOURSELF, a page of its own at `?quiz` (docs/quiz-plan.md). Three screens: set up (which shapes, which
 * kinds of question, how long), the quiz itself (one question at a time, Sure or Guessing, then why), and the
 * end (how each shape went, the misconceptions behind the wrong answers with the place on the site that fixes
 * each, and what to do next). The questions and every word of feedback are in the bank; this file only asks
 * them. It prints no numerals: counts are in words, and how a shape went is a bar.
 *
 * The quiz in progress is kept in this history entry's state, so a weak spot's lesson link can be followed and
 * Back returns to the same end screen, and a reload keeps the place. A new visit to `?quiz` starts at set up. */

const subscribeTheme=(on:()=>void)=>{const o=new MutationObserver(on);o.observe(document.documentElement,{attributes:true,attributeFilter:['class']});return()=>o.disconnect()};
const isDark=()=>document.documentElement.classList.contains('dark');
function setTheme(dark:boolean){
 document.documentElement.classList.toggle('dark',dark);
 try{const raw=localStorage.getItem(STORAGE),v=raw?JSON.parse(raw):{};localStorage.setItem(STORAGE,JSON.stringify({...(v&&typeof v==='object'&&!Array.isArray(v)?v:{}),dark}))}catch{/* kept for this visit */}
}
const open=(e:React.MouseEvent<HTMLAnchorElement>)=>{if(!inPlace(e))return;e.preventDefault();navigate(e.currentTarget.getAttribute('href')??'')};

/** THE WAY IN FROM THE HOME PAGE, beside the guide's: a quiet line, not a third button. */
export function QuizLink(){
 return <a className="quiz-entry" href={QUIZ_HREF} onClick={open}><ClipboardCheck size={16} aria-hidden="true"/><span><span className="quiz-entry-kicker">Ready to test it?</span> Quiz yourself</span><ArrowRight size={14} aria-hidden="true"/></a>;
}

/** A choice as it is set: a formula, or words with symbols in them. */
const ChoiceBody=({c}:{c:Choice})=>c.tex?<MathText tex={c.tex}/>:<Prose text={c.text??''}/>;
/** A place on the site to look, as a link with a line on what it opens. */
function Place({p}:{p:Pointer}){const x=place(p);return <span className="quiz-place"><a href={x.href} onClick={open}><ShapeGlyph id={p.lesson} size={15}/>{x.title}<ArrowRight size={13} aria-hidden="true"/></a><small>{x.where}</small></span>}
/** How a shape went, in words, for a page that shows no numerals. */
function howItWent(right:number,total:number){
 if(right===total)return 'All right';
 if(right===0)return 'None right';
 const f=right/total;
 return f>=.75?'Nearly all right':f>.5?'More than half right':f===.5?'Half right':'Fewer than half right';
}

type Phase='setup'|'take'|'end';
type Pick={choice:number|null;sure:boolean|null;checked:boolean};
type Snapshot={phase:Phase;settings:Settings;items:{id:string;order:number[]}[];index:number;answers:Answer[];pick:Pick};
const FRESH:Pick={choice:null,sure:null,checked:false};
/** The quiz kept in this history entry, read back only if it still makes sense against the bank. */
function restore():Snapshot|null{
 try{
  const s=(history.state as {quiz?:Snapshot}|null)?.quiz;
  if(!s||!['setup','take','end'].includes(s.phase)||!Array.isArray(s.items))return null;
  if(!s.items.every(i=>QUESTION.has(i.id)&&Array.isArray(i.order)&&i.order.length===QUESTION.get(i.id)!.choices.length))return null;
  return s;
 }catch{return null}
}

export default function Quiz(){
 const dark=useSyncExternalStore(subscribeTheme,isDark,()=>false);
 const kept=useMemo(()=>restore(),[]);
 const [phase,setPhase]=useState<Phase>(kept?.phase??'setup');
 const [settings,setSettings]=useState<Settings>(()=>{
  if(kept)return kept.settings;
  // `?quiz=ring` opens with that shape ticked: a lesson can link straight to a quiz on itself.
  const asked=(new URLSearchParams(location.search).get('quiz')??'').split(',').filter(id=>id in BANKS) as ProblemId[];
  return asked.length?{...DEFAULT_SETTINGS,shapes:asked}:DEFAULT_SETTINGS;
 });
 const [drawn,setDrawn]=useState<Drawn[]>(()=>kept?kept.items.map(i=>({question:QUESTION.get(i.id)!,order:i.order})):[]);
 const [index,setIndex]=useState(kept?.index??0);
 const [answers,setAnswers]=useState<Answer[]>(kept?.answers??[]);
 const [pick,setPick]=useState<Pick>(kept?.pick??FRESH);
 const [hist,setHist]=useState<History>(()=>readHistory());
 /** The history as it was before this quiz was recorded: what "has come up before" is measured against. */
 const [before,setBefore]=useState<History>(hist);
 const [nudge,setNudge]=useState('');
 const [cleared,setCleared]=useState(false);
 const focus=useRef<string|null>(null);

 useEffect(()=>{document.title='Quiz yourself · Field Builder'},[]);
 // Keep the quiz in this history entry, so Back from a lesson link returns to it.
 useEffect(()=>{
  const snap:Snapshot={phase,settings,items:drawn.map(d=>({id:d.question.id,order:d.order})),index,answers,pick};
  try{history.replaceState({...history.state,quiz:snap},'')}catch{/* kept in memory only */}
 },[phase,settings,drawn,index,answers,pick]);
 // Focus follows the quiz: the new question, the verdict, the end, so a keyboard or a screen reader is never
 // left on a button that has gone.
 useEffect(()=>{const id=focus.current;if(!id)return;focus.current=null;document.getElementById(id)?.focus({preventScroll:false})});

 const begin=(d:Drawn[])=>{setDrawn(d);setIndex(0);setAnswers([]);setPick(FRESH);setNudge('');setBefore(hist);setPhase('take');focus.current='quiz-question';window.scrollTo({top:0})};
 const start=(e:{preventDefault():void})=>{
  e.preventDefault();
  if(!settings.shapes.length){setNudge('Choose at least one shape.');return}
  if(!settings.kinds.length){setNudge('Choose at least one kind of question.');return}
  const d=draw(settings,hist);
  if(!d.length){setNudge('No questions match that choice yet. Try more kinds of question.');return}
  begin(d);
 };
 const current=drawn[index];
 const check=()=>{
  if(pick.choice===null){setNudge('Choose an answer first.');return}
  if(pick.sure===null){setNudge('Say whether you are sure or guessing first.');return}
  setNudge('');
  setAnswers(a=>[...a,{id:current.question.id,choice:pick.choice!,sure:pick.sure!}]);
  setPick(p=>({...p,checked:true}));focus.current='quiz-verdict';
 };
 const next=()=>{
  if(index+1<drawn.length){setIndex(index+1);setPick(FRESH);focus.current='quiz-question';return}
  const results=grade(drawn,answers),h=record(hist,results);
  writeHistory(h);setBefore(hist);setHist(h);setCleared(false);setPhase('end');focus.current='quiz-end';window.scrollTo({top:0});
 };
 const forget=()=>{clearHistory();const h={missed:[],asked:[],misconceptions:{}};setHist(h);setBefore(h);setCleared(true)};
 const toSetup=()=>{setPhase('setup');setDrawn([]);setAnswers([]);setPick(FRESH);setNudge('');focus.current='quiz-title';window.scrollTo({top:0})};

 const themeLabel=dark?'Switch to light theme':'Switch to dark theme';
 return <div className="quiz">
  <a className="skip-link" href="#quiz">Skip to the quiz</a>
  <header className="exp-header"><Brand/><div className="exp-header-right"><Hint label={themeLabel}><button type="button" className="icon-button" onClick={()=>setTheme(!dark)} aria-label={themeLabel}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></Hint></div></header>
  <main id="quiz" tabIndex={-1} className="quiz-main">
   {phase==='setup'&&<SetUp settings={settings} setSettings={s=>{setSettings(s);setNudge('')}} onStart={start} nudge={nudge} hist={hist} onForget={forget} cleared={cleared}/>}
   {phase==='take'&&current&&<Take drawn={current} index={index} total={drawn.length} pick={pick} setPick={p=>{setPick(p);setNudge('')}} onCheck={check} onNext={next} nudge={nudge} last={index+1===drawn.length}/>}
   {phase==='end'&&<End results={grade(drawn,answers)} before={before} onRetry={ids=>begin(drawAgain(ids))}
     onWeak={w=>begin(drawWeak(settings,w,hist))} onNew={toSetup} onForget={forget} cleared={cleared} hist={hist}/>}
  </main>
 </div>;
}

/* ---------- Set up ---------- */
function SetUp({settings,setSettings,onStart,nudge,hist,onForget,cleared}:{settings:Settings;setSettings:(s:Settings)=>void;onStart:(e:{preventDefault():void})=>void;nudge:string;hist:History;onForget:()=>void;cleared:boolean}){
 const toggle=<T,>(list:T[],x:T)=>list.includes(x)?list.filter(y=>y!==x):[...list,x];
 const live=new Set(PROBLEMS.filter(p=>isReady(p.id)).map(p=>p.id));
 const missed=hist.missed.filter(id=>settings.shapes.includes(QUESTION.get(id)!.lesson)).length;
 return <>
  <header className="quiz-hero">
   <p className="quiz-kicker">Quiz yourself</p>
   <h1 id="quiz-title" tabIndex={-1}>Test what you understand</h1>
   <p className="quiz-lede">Choose the shapes to be quizzed on. Each question asks you to predict, set up, check or carry an idea to a new case, and every answer tells you why. At the end you see which ideas tripped you up, and exactly where on the site to fix each one.</p>
  </header>
  <form className="quiz-setup" onSubmit={onStart} noValidate>
   <fieldset className="quiz-group">
    <legend>Shapes</legend>
    <p className="quiz-help">Questions for three shapes are written so far. The rest are on their way.</p>
    {FAMILIES.map(f=>{const ids=f.ids.filter(id=>live.has(id));if(!ids.length)return null;return <div className="quiz-family" key={f.label}>
     <p className="quiz-family-name" id={`quiz-fam-${f.ids[0]}`}>{f.label}</p>
     <ul className="quiz-shapes" aria-labelledby={`quiz-fam-${f.ids[0]}`}>{ids.map(id=>{const ready=!!BANKS[id],p=getProblem(id);return <li key={id}>
      <label className={'quiz-shape'+(ready?'':' is-soon')}>
       <input type="checkbox" checked={ready&&settings.shapes.includes(id)} disabled={!ready} onChange={()=>setSettings({...settings,shapes:toggle(settings.shapes,id)})} aria-describedby={ready?undefined:'quiz-soon'}/>
       <span className="quiz-shape-glyph"><ShapeGlyph id={id} size={18}/></span><span className="quiz-shape-name">{p.short}</span>{!ready&&<span className="quiz-soon" aria-hidden="true">Coming soon</span>}
      </label></li>})}</ul></div>})}
    <span id="quiz-soon" className="sr-only">Coming soon</span>
   </fieldset>
   <fieldset className="quiz-group">
    <legend>Kinds of question</legend>
    <ul className="quiz-kinds">{KINDS.map(k=><li key={k.id}><label className="quiz-option">
     <input type="checkbox" checked={settings.kinds.includes(k.id)} onChange={()=>setSettings({...settings,kinds:toggle<Kind>(settings.kinds,k.id)})}/>
     <strong>{k.name}</strong><small><Prose text={k.about.replace(/\bP\b/,'$P$')}/></small></label></li>)}</ul>
   </fieldset>
   <fieldset className="quiz-group">
    <legend>Length</legend>
    <div className="quiz-lengths">{LENGTHS.map(l=><label className="quiz-option quiz-length" key={l.id}>
     <input type="radio" name="quiz-length" checked={settings.length===l.id} onChange={()=>setSettings({...settings,length:l.id})}/>
     <strong>{l.name}</strong><small>{l.about}</small></label>)}</div>
   </fieldset>
   <div className="quiz-start-row">
    <button type="submit" className="quiz-primary">Start the quiz<ArrowRight size={16} aria-hidden="true"/></button>
    <output className="quiz-nudge">{nudge}</output>
   </div>
  </form>
  <HistoryNote hist={hist} onForget={onForget} cleared={cleared} note={missed?`${capital(inWords(missed))} ${missed===1?'question':'questions'} you missed before will come first.`:undefined}/>
 </>;
}
const capital=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);

/** What the browser keeps, and the button that forgets it. */
function HistoryNote({hist,onForget,cleared,note}:{hist:History;onForget:()=>void;cleared:boolean;note?:string}){
 return <aside className="quiz-history" aria-label="Your quiz history">
  <p>{note?<>{note} </>:null}Your answers stay in this browser and are never sent anywhere. Questions you miss come back first next time.</p>
  {hasHistory(hist)?<button type="button" className="quiz-quiet" onClick={onForget}><RotateCcw size={14} aria-hidden="true"/>Clear my history</button>
   :<output className="quiz-history-state">{cleared?'Your history is cleared.':''}</output>}
 </aside>;
}

/* ---------- Taking it ---------- */
function Take({drawn,index,total,pick,setPick,onCheck,onNext,nudge,last}:{drawn:Drawn;index:number;total:number;pick:Pick;setPick:(p:Pick)=>void;onCheck:()=>void;onNext:()=>void;nudge:string;last:boolean}){
 const q=drawn.question,right=correctIndex(q),p=getProblem(q.lesson);
 const chosen=pick.choice===null?null:q.choices[pick.choice];
 const wasRight=pick.checked&&pick.choice===right;
 const done=index+(pick.checked?1:0);
 const name=`quiz-${q.id}`;
 const kind=KINDS.find(k=>k.id===q.kind)!.name;
 return <section className="quiz-take" aria-labelledby="quiz-question">
  <progress className="quiz-progress" aria-label="Progress through the quiz" max={total} value={done} aria-valuetext={`${capital(inWords(done))} of ${inWords(total)} answered`}/>
  <p className="quiz-meta"><span className="quiz-meta-shape"><ShapeGlyph id={q.lesson} size={16}/>{p.short}</span><span className="quiz-meta-kind">{kind}</span></p>
  <h2 id="quiz-question" tabIndex={-1} className="quiz-prompt"><Prose text={q.prompt}/></h2>
  <fieldset className="quiz-choices" disabled={pick.checked}>
   <legend className="sr-only">Choose an answer</legend>
   {drawn.order.map(i=>{const c=q.choices[i],mine=pick.choice===i,state=pick.checked?(i===right?'is-right':mine?'is-wrong':'is-other'):mine?'is-picked':'';
    return <label key={i} className={'quiz-choice '+state}>
     <input type="radio" name={name} checked={mine} onChange={()=>setPick({...pick,choice:i})}/>
     <span className="quiz-choice-body"><ChoiceBody c={c}/></span>
     {pick.checked&&i===right&&<span className="quiz-tag is-right"><Check size={14} aria-hidden="true"/>Right answer</span>}
     {pick.checked&&mine&&i!==right&&<span className="quiz-tag is-wrong"><X size={14} aria-hidden="true"/>Your answer</span>}
    </label>})}
  </fieldset>
  {!pick.checked?<>
   <fieldset className="quiz-sure">
    <legend>How sure are you?</legend>
    <div>{[true,false].map(s=><label key={String(s)} className={'quiz-pill'+(pick.sure===s?' is-on':'')}>
     <input type="radio" name={`${name}-sure`} checked={pick.sure===s} onChange={()=>setPick({...pick,sure:s})}/>{s?'Sure':'Guessing'}</label>)}</div>
   </fieldset>
   <div className="quiz-start-row">
    <button type="button" className="quiz-primary" onClick={onCheck}>Check my answer</button>
    <output className="quiz-nudge">{nudge}</output>
   </div>
  </>:<div className={'quiz-feedback '+(wasRight?'is-right':'is-wrong')}>
   <output className="sr-only">{wasRight?'Right.':'Not quite.'}</output>
   <h3 id="quiz-verdict" tabIndex={-1}>{wasRight?<><Check size={18} aria-hidden="true"/>Right</>:<><X size={18} aria-hidden="true"/>Not quite</>}</h3>
   {!wasRight&&chosen&&<div className="quiz-why-wrong">
    <p className="quiz-label">What your answer gets wrong</p>
    <p><Prose text={chosen.why??''}/></p>
    {chosen.misconception&&<p className="quiz-misc">This is the slip called <strong><Prose text={misconceptionName(chosen.misconception)}/></strong>. The end of the quiz says where to fix it.</p>}
   </div>}
   <div className="quiz-why-right">
    <p className="quiz-label">Why the right answer is right</p>
    <p><Prose text={q.explanation}/></p>
   </div>
   <p className="quiz-taught">Taught in {place(q.review).title}.</p>
   <button type="button" className="quiz-primary" onClick={onNext}>{last?'See how it went':'Next question'}<ArrowRight size={16} aria-hidden="true"/></button>
  </div>}
 </section>;
}
const misconceptionName=(id:string)=>MISCONCEPTION.get(id)?.name??'';

/* ---------- The end ---------- */
function End({results,before,onRetry,onWeak,onNew,onForget,cleared,hist}:{results:Result[];before:History;onRetry:(ids:string[])=>void;onWeak:(w:Map<string,number>)=>void;onNew:()=>void;onForget:()=>void;cleared:boolean;hist:History}){
 const s=score(results),spots=weakSpots(results),conf=confidence(results),revisit=toRevisit(results);
 const missed=results.filter(r=>!r.right).map(r=>r.question.id);
 const weights=new Map(spots.map(t=>[t.misconception.id,t.count+(before.misconceptions[t.misconception.id]??0)*.5]));
 const list=(rs:Result[]):ReactNode=><ul className="quiz-flag-list">{rs.map(r=><li key={r.question.id}><p><Prose text={r.question.prompt}/></p><Place p={r.question.review}/></li>)}</ul>;
 return <section className="quiz-end" aria-labelledby="quiz-end">
  <header className="quiz-hero">
   <p className="quiz-kicker">Quiz yourself</p>
   <h1 id="quiz-end" tabIndex={-1}>How it went</h1>
   <p className="quiz-lede">You answered {inWords(s.right)} of {inWords(s.total)} right.{s.right===s.total?' Every one. Try a longer quiz, or more shapes, next.':''}</p>
  </header>

  <section className="quiz-card" aria-labelledby="quiz-by-shape">
   <h2 id="quiz-by-shape">By shape</h2>
   <ul className="quiz-bars">{s.byShape.map(b=><li key={b.lesson}>
    <span className="quiz-bar-name"><ShapeGlyph id={b.lesson} size={16}/>{getProblem(b.lesson).short}</span>
    <span className="quiz-bar" aria-hidden="true"><span style={{width:`${b.right/b.total*100}%`}}/></span><span className="sr-only">{capital(inWords(b.right))} of {inWords(b.total)} right.</span>
    <span className="quiz-bar-words">{howItWent(b.right,b.total)}</span>
   </li>)}</ul>
  </section>

  <section className="quiz-card" aria-labelledby="quiz-weak">
   <h2 id="quiz-weak">Your weak spots</h2>
   {spots.length?<ol className="quiz-spots">{spots.map(t=><li key={t.misconception.id}>
    <h3><Prose text={t.misconception.name}/></h3>
    <p><Prose text={t.misconception.idea}/></p>
    <p className="quiz-spot-count">Came up {t.count===1?'once':t.count===2?'twice':`${inWords(t.count)} times`} in this quiz{before.misconceptions[t.misconception.id]?', and in an earlier one too':''}.</p>
    <Place p={pointerFor(t)}/>
   </li>)}</ol>:<p className="quiz-empty">No wrong answers, so no weak spots this time.</p>}
  </section>

  {(conf.wrongSure.length>0||conf.rightGuessing.length>0)&&<section className="quiz-card" aria-labelledby="quiz-confidence">
   <h2 id="quiz-confidence">How sure you were</h2>
   {conf.wrongSure.length>0&&<div className="quiz-flag is-urgent"><h3>Wrong, but you were sure</h3><p>Look at these first. A wrong idea you are sure of is the one that costs marks in an exam, because nothing makes you check it.</p>{list(conf.wrongSure)}</div>}
   {conf.rightGuessing.length>0&&<div className="quiz-flag"><h3>Right, but you were guessing</h3><p>Worth a second look, so the next right answer is one you know.</p>{list(conf.rightGuessing)}</div>}
  </section>}

  <section className="quiz-card" aria-labelledby="quiz-next">
   <h2 id="quiz-next">What next</h2>
   <div className="quiz-actions">
    {missed.length>0&&<button type="button" className="quiz-primary" onClick={()=>onRetry(missed)}>Retry the ones you missed<ArrowRight size={16} aria-hidden="true"/></button>}
    {spots.length>0&&<button type="button" className="quiz-secondary" onClick={()=>onWeak(weights)}>Quiz again on my weak spots</button>}
    <button type="button" className="quiz-secondary" onClick={onNew}>Start a new quiz</button>
   </div>
   {revisit.length>0&&<><h3 className="quiz-sub">Lessons to revisit</h3><ul className="quiz-revisit">{revisit.map(x=><li key={x.lesson}>
    <a className="quiz-lesson" href={`?p=${x.lesson}`} onClick={open}><span className="quiz-shape-glyph"><ShapeGlyph id={x.lesson} size={18}/></span><strong>{getProblem(x.lesson).title}</strong><ArrowRight size={15} aria-hidden="true"/></a>
    <p className="quiz-revisit-where">Look at {x.pointers.map(p=>'stage' in p?STAGE_NAME[p.stage]:p.section).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}.</p>
   </li>)}</ul></>}
  </section>
  <HistoryNote hist={hist} onForget={onForget} cleared={cleared}/>
  <footer className="quiz-foot"><a href={HOME_HREF} onClick={e=>{if(!inPlace(e))return;e.preventDefault();goHome()}}>Back to every lesson</a></footer>
 </section>;
}
