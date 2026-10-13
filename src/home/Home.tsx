'use client';
import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {ArrowRight,GitBranch,Moon,Sun} from 'lucide-react';
import {PROBLEMS} from '../problems/definitions';
import {isReady} from '../problems/readiness';
import {DEFAULT_PARAMS,type Params,type ProblemId} from '../problems/types';
import {serializeAssignment} from '../state/assignment';
import {inPlace,navigate} from '../state/route';
import {families,ShapeGlyph} from '../explorer/lessons';
import {Brand} from '../explorer/Brand';
import {STORAGE} from '../explorer/Explorer';
import {Hint} from '../components/Hint';
import '../explorer/explorer.css';
import './home.css';

/** What the Explorer saved, as it saved it: read, never trusted. */
type Saved={id?:ProblemId;params?:Partial<Record<ProblemId,Partial<Params>>>};
function readSaved():string|null{try{return localStorage.getItem(STORAGE)}catch{return null}}
function parseSaved(raw:string|null):Saved{try{const v=raw?JSON.parse(raw):null;return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
const subscribeStorage=(on:()=>void)=>{window.addEventListener('storage',on);return()=>window.removeEventListener('storage',on)};
/** The theme is the document's class: the saved one is on it before the first paint (index.html), and the
 * Explorer keeps it there. Watched rather than copied, so the home page and the lesson never disagree. */
const subscribeTheme=(on:()=>void)=>{const o=new MutationObserver(on);o.observe(document.documentElement,{attributes:true,attributeFilter:['class']});return()=>o.disconnect()};
const isDark=()=>document.documentElement.classList.contains('dark');
function setTheme(dark:boolean){
 document.documentElement.classList.toggle('dark',dark);
 try{const saved=parseSaved(readSaved());localStorage.setItem(STORAGE,JSON.stringify({...saved,dark}))}catch{/* kept for this visit */}
}

/** A lesson's address, carrying the values the reader left it with: opening it from here is going back to
 * it, as choosing it in the lesson list is. A lesson never visited opens as a shared link does, at its
 * defaults. Never with the cut gone to the limit: what is opened is a lesson at rest. */
function lessonAddress(id:ProblemId,saved:Saved){
 const kept=saved.params?.[id];
 return `?${serializeAssignment({id,params:kept&&typeof kept==='object'?{...DEFAULT_PARAMS,...kept,continuum:0}:undefined})||`p=${id}`}`;
}

/** One line under each family's name: what the shapes in it share, which is what the family teaches. */
const FAMILY_NOTE:Record<string,string>={
 'Straight rods':'One straight rod, with P in different places. Where P stands decides what cancels.',
 'Rings, disks and arcs':'Charge curved round P, and a disk built from rings.',
 'Charge with no end':'Lines and a sheet that never end, and still give a finite field at P.',
 'The same shapes, as potential':'The shapes again, adding numbers instead of arrows, so nothing can cancel.'};

/** The argument every lesson makes, in the five steps of its run (explorer/buildRun.ts). */
const STEPS:{name:string;text:string}[]=[
 {name:'Cut it up',text:'Cut the charge into pieces, each small enough to act as a point.'},
 {name:'One piece',text:'Write what one piece does at P, as if it were a point charge.'},
 {name:'What cancels',text:'Pair each piece with its mirror, where it has one, and see what cancels.'},
 {name:'Add them up',text:'Add what survives, piece by piece along the charge.'},
 {name:'Shrink them',text:'Make the pieces smaller without end. The sum becomes the integral.'}];

/** The picture the site is about, drawn once: a rod cut into pieces, one piece and its distance to P, and the
 * arrows of every piece added tip to tail at P -- the middle piece first, then each mirror pair, so the sum is
 * back on the axis after every pair, as the lessons add them -- with the field they make, E, beneath. To
 * scale: each piece's arrow falls off as the inverse square of its distance, so even the cover says nothing
 * that is not so. */
function Cover(){
 const P={x:226,y:150},rod=86,pieces=[70,110,150,190,230],chosen=0,unit=38,order=[2,1,3,0,4];
 const arrows=pieces.map(y=>{const dx=P.x-rod,dy=P.y-y,r=Math.hypot(dx,dy),len=unit*(dx/r)**2;return {ux:dx/r,uy:dy/r,len}});
 const head=(x:number,y:number,ux:number,uy:number,s:number)=>`M${x} ${y}L${x-ux*s-uy*s*.55} ${y-uy*s+ux*s*.55}L${x-ux*s+uy*s*.55} ${y-uy*s-ux*s*.55}Z`;
 const arrow=(x0:number,y0:number,ux:number,uy:number,len:number,key:string|number,cls:string,s:number)=>{const x=x0+ux*len,y=y0+uy*len;return <g key={key} className={cls}><path d={`M${x0} ${y0}L${x-ux*s*.6} ${y-uy*s*.6}`}/><path className="home-head" d={head(x,y,ux,uy,s)}/></g>};
 let at={x:P.x,y:P.y};
 const chain=order.map(i=>{const a=arrows[i],from=at;at={x:from.x+a.ux*a.len,y:from.y+a.uy*a.len};return arrow(from.x,from.y,a.ux,a.uy,a.len,i,'home-part'+(i===chosen?' is-chosen':''),6)});
 const net=at.x-P.x,below=24;
 return <svg className="home-cover" viewBox="28 40 404 222" aria-hidden="true">
  <line className="home-axis" x1={rod-26} y1={P.y} x2={428} y2={P.y}/>
  {pieces.map((y,i)=>i!==chosen&&<line key={i} className="home-ray" x1={rod} y1={y} x2={P.x} y2={P.y}/>)}
  <line className="home-ray is-chosen" x1={rod} y1={pieces[chosen]} x2={P.x} y2={P.y}/>
  <text className="home-label home-r" x={(rod+P.x)/2+4} y={(pieces[chosen]+P.y)/2-10}>r</text>
  {pieces.map((y,i)=><rect key={i} className={'home-piece'+(i===chosen?' is-chosen':'')} x={rod-7} y={y-18} width={14} height={36} rx={4}/>)}
  <text className="home-label home-dq" x={rod-20} y={pieces[chosen]+6} textAnchor="end"><tspan className="is-upright">Δ</tspan>Q</text>
  {chain}
  <line className="home-tie" x1={P.x} y1={P.y} x2={P.x} y2={P.y+below}/><line className="home-tie" x1={at.x} y1={at.y} x2={at.x} y2={P.y+below}/>
  {arrow(P.x,P.y+below,1,0,net,'net','home-net',10)}
  <circle className="home-p" cx={P.x} cy={P.y} r={4.5}/>
  <text className="home-label" x={P.x-8} y={P.y-12} textAnchor="end">P</text>
  <text className="home-label home-e" x={P.x+net+8} y={P.y+below+6}>E</text>
 </svg>;
}

export default function Home(){
 const raw=useSyncExternalStore(subscribeStorage,readSaved,()=>null);
 const saved=useMemo(()=>parseSaved(raw),[raw]);
 const dark=useSyncExternalStore(subscribeTheme,isDark,()=>false);
 useEffect(()=>{document.title='Field Builder — Electric fields and potential, derived'},[]);
 const last=saved.id&&PROBLEMS.some(p=>p.id===saved.id)&&isReady(saved.id)?PROBLEMS.find(p=>p.id===saved.id):undefined;
 const open=(e:React.MouseEvent<HTMLAnchorElement>)=>{if(!inPlace(e))return;e.preventDefault();navigate(e.currentTarget.getAttribute('href')??'')};
 const start=PROBLEMS.find(p=>p.id==='bisector')??PROBLEMS[0];
 const groups=families(PROBLEMS.filter(p=>isReady(p.id)));
 const themeLabel=dark?'Switch to light theme':'Switch to dark theme';
 return <div className="home">
  <a className="skip-link" href="#home-lessons">Skip to the lessons</a>
  <header className="exp-header"><Brand current/><div className="exp-header-right"><Hint label={themeLabel}><button type="button" className="icon-button" onClick={()=>setTheme(!dark)} aria-label={themeLabel}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></Hint></div></header>
  <main id="home" tabIndex={-1} className="home-main">
   <section className="home-hero" aria-labelledby="home-title">
    <div className="home-hero-text">
     <p className="home-kicker">Electric fields and potential, derived</p>
     <h1 id="home-title">One law, every geometry.</h1>
     <p className="home-lede">Build the integral for the field and the potential of continuous charge — rods, rings, disks and sheets — by cutting the charge into pieces and adding up what each piece does at P.</p>
     <div className="home-actions">
      <a className="home-start" href={lessonAddress(start.id,saved)} onClick={open}>Start with the finite line<ArrowRight size={16} aria-hidden="true"/></a>
      {last&&<a className="home-continue" href={lessonAddress(last.id,saved)} onClick={open}><span>Continue where you left off</span><span className="home-continue-to"><ShapeGlyph id={last.id} size={16}/>{last.short}</span></a>}
     </div>
    </div>
    <div className="home-hero-figure"><Cover/></div>
   </section>
   <section className="home-how" aria-labelledby="home-how-title">
    <h2 id="home-how-title" className="home-section-title">How every lesson goes</h2>
    <ol className="home-steps">{STEPS.map(s=><li key={s.name}><strong>{s.name}</strong><span>{s.text}</span></li>)}</ol>
   </section>
   <section id="home-lessons" tabIndex={-1} className="home-lessons" aria-labelledby="home-lessons-title">
    <h2 id="home-lessons-title" className="home-section-title">Every lesson</h2>
    {groups.map(g=><div className="home-family" key={g.label}>
     <div className="home-family-head"><h3>{g.label}</h3>{FAMILY_NOTE[g.label]&&<p>{FAMILY_NOTE[g.label]}</p>}</div>
     <ul className="home-grid">{g.items.map(pr=><li key={pr.id}><a className="home-card" href={lessonAddress(pr.id,saved)} onClick={open} aria-labelledby={`home-${pr.id}`} aria-describedby={`home-${pr.id}-about`}>
      <span className="home-glyph"><ShapeGlyph id={pr.id} size={24}/></span><strong id={`home-${pr.id}`}>{pr.short}</strong><span id={`home-${pr.id}-about`} className="home-card-about">{pr.subtitle}</span>
     </a></li>)}</ul>
    </div>)}
   </section>
   <footer className="home-foot"><p>One law. Every geometry.</p><span>Your settings stay on this device.</span><a href="https://github.com/malekTheCoder/field-builder" target="_blank" rel="noreferrer"><GitBranch size={14} aria-hidden="true"/>Field Builder on GitHub</a></footer>
  </main>
 </div>;
}
