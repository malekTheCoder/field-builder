'use client';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
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
import {LawsDialog} from '../components/Laws';
import {GuideLink} from '../guide/Guide';
import {QuizLink} from '../quiz/Quiz';
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
 'The same shapes, as potential':'The shapes again, adding numbers instead of arrows: with charge of one sign, nothing cancels.'};

/** The argument every lesson makes, in the five steps of its run (explorer/buildRun.ts). */
const STEPS:{name:string;text:string}[]=[
 {name:'Cut it up',text:'Cut the charge into pieces, each small enough to act as a point.'},
 {name:'One piece',text:'Write what one piece does at P, as if it were a point charge.'},
 {name:'What cancels',text:'Pair each piece with its mirror, where it has one, and see what cancels.'},
 {name:'Add them up',text:'Add what survives, piece by piece along the charge.'},
 {name:'Shrink them',text:'Make the pieces smaller without end. The sum becomes the integral.'}];

/** The picture the site is about, drawn once: a rod cut into pieces, and the argument of every lesson in one
 * frame. The top piece and its mirror at the bottom are the same distance from P, so their arrows there are
 * the same length: their up and down parts are equal and opposite, and cancel; their parts along the axis
 * point the same way, and add. The arrow beneath is this pair’s share of E, not the whole rod’s field;
 * the other pieces still have to be added. The two slant distances use r_i, as the lesson does: r is
 * reserved for the perpendicular distance from the rod to P. It replaced a
 * tip-to-tail chain of all five arrows, which zigzagged and said nothing about cancelling. */
function Cover(){
 const P={x:226,y:150},rod=86,pieces=[70,110,150,190,230],top=0,bottom=4,L=86;
 const dx=P.x-rod,dy=P.y-pieces[top],r=Math.hypot(dx,dy),ux=dx/r,uy=dy/r;
 const along=L*ux,across=L*uy,pair=2*along,below=72;
 const head=(x:number,y:number,hx:number,hy:number,s:number)=>`M${x} ${y}L${x-hx*s-hy*s*.55} ${y-hy*s+hx*s*.55}L${x-hx*s+hy*s*.55} ${y-hy*s-hx*s*.55}Z`;
 const arrow=(x0:number,y0:number,hx:number,hy:number,len:number,cls:string,s:number)=>{const x=x0+hx*len,y=y0+hy*len;return <g className={cls}><path d={`M${x0} ${y0}L${x-hx*s*.6} ${y-hy*s*.6}`}/><path className="home-head" d={head(x,y,hx,hy,s)}/></g>};
 const kx=P.x+along;
 return <svg className="home-cover" viewBox="28 40 404 232" aria-hidden="true">
  <line className="home-axis" x1={rod-26} y1={P.y} x2={428} y2={P.y}/>
  {pieces.map((y,i)=>i!==top&&i!==bottom&&<line key={i} className="home-ray" x1={rod} y1={y} x2={P.x} y2={P.y}/>)}
  <line className="home-ray is-chosen" x1={rod} y1={pieces[top]} x2={P.x} y2={P.y}/>
  <line className="home-ray is-chosen" x1={rod} y1={pieces[bottom]} x2={P.x} y2={P.y}/>
  <text className="home-label home-r" x={(rod+P.x)/2+4} y={(pieces[top]+P.y)/2-10}>r<tspan fontSize="65%" baselineShift="sub">i</tspan></text>
  <text className="home-label home-r" x={(rod+P.x)/2+4} y={(pieces[bottom]+P.y)/2+24}>r<tspan fontSize="65%" baselineShift="sub">i</tspan></text>
  {pieces.map((y,i)=><rect key={i} className={'home-piece'+(i===top||i===bottom?' is-chosen':'')} x={rod-7} y={y-18} width={14} height={36} rx={4}/>)}
  <text className="home-label home-dq" x={rod-20} y={pieces[top]+6} textAnchor="end"><tspan className="is-upright">Δ</tspan>Q</text>
  <text className="home-label home-dq" x={rod-20} y={pieces[bottom]+6} textAnchor="end"><tspan className="is-upright">Δ</tspan>Q</text>
  {/* Each piece's arrow at P: the top piece's leans down, its mirror's leans up. */}
  {arrow(P.x,P.y,ux,uy,L,'home-part is-chosen',7)}
  {arrow(P.x,P.y,ux,-uy,L,'home-part is-chosen',7)}
  {/* Their parts across the axis: equal, opposite, struck through -- they cancel. */}
  {arrow(kx,P.y,0,1,across,'home-cancel',6)}
  {arrow(kx,P.y,0,-1,across,'home-cancel',6)}
  <line className="home-strike" x1={kx-9} y1={P.y-across/2-7} x2={kx+9} y2={P.y-across/2+7}/>
  <line className="home-strike" x1={kx-9} y1={P.y+across/2-7} x2={kx+9} y2={P.y+across/2+7}/>
  <text className="home-note" x={kx+16} y={P.y-across/2+5}>cancel</text>
  <text className="home-label home-de" x={kx+12} y={P.y+across+8}><tspan className="is-upright">Δ</tspan>E</text>
  <text className="home-label home-de" x={kx+12} y={P.y-across+4}><tspan className="is-upright">Δ</tspan>E</text>
  {/* Their parts along the axis add: two of them, laid end to end, is this pair's share of E. */}
  <line className="home-tie" x1={P.x} y1={P.y} x2={P.x} y2={P.y+below}/><line className="home-tie" x1={P.x+pair} y1={P.y} x2={P.x+pair} y2={P.y+below}/>
  {arrow(P.x,P.y+below,1,0,pair,'home-net',10)}
  <text className="home-note" x={P.x+pair/2} y={P.y+below+24} textAnchor="middle">this pair’s share of <tspan fontStyle="italic">E</tspan></text>
  <circle className="home-p" cx={P.x} cy={P.y} r={4.5}/>
  <text className="home-label" x={P.x-8} y={P.y-12} textAnchor="end">P</text>
 </svg>;
}

export default function Home(){
 const raw=useSyncExternalStore(subscribeStorage,readSaved,()=>null);
 const [laws,setLaws]=useState(false),lawButton=useRef<HTMLButtonElement>(null);
 const saved=useMemo(()=>parseSaved(raw),[raw]);
 const dark=useSyncExternalStore(subscribeTheme,isDark,()=>false);
 useEffect(()=>{document.title='Field Builder · Electric fields and potential, derived'},[]);
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
     {/* "One law" is the claim the page makes, so it opens the law: Coulomb's, with superposition, the
         reference every lesson's ⋯ menu opens, said the same way here. */}
     <h1 id="home-title" aria-label="One law, every geometry."><button ref={lawButton} type="button" className="home-law" onClick={()=>setLaws(true)} aria-haspopup="dialog">One law</button>, every geometry.</h1>
     <LawsDialog open={laws} onOpenChange={setLaws} returnFocus={lawButton}/>
     <p className="home-lede">Build the integral for the field and the potential of continuous charge, such as rods, rings, disks and sheets, by cutting the charge into pieces and adding up what each piece does at P.</p>
     <div className="home-actions">
      <a className="home-start" href={lessonAddress(start.id,saved)} onClick={open}>Start with the finite line<ArrowRight size={16} aria-hidden="true"/></a>
      {last&&<a className="home-continue" href={lessonAddress(last.id,saved)} onClick={open}><ShapeGlyph id={last.id} size={18}/><span className="home-continue-words"><span className="home-continue-kicker">Continue where you left off</span><span className="home-continue-to">{last.short}</span></span><ArrowRight size={15} aria-hidden="true"/></a>}
     </div>
     <div className="home-more"><GuideLink/><QuizLink/></div>
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
