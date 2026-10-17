'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {ArrowRight,GraduationCap,Moon,Sun} from 'lucide-react';
import {getProblem} from '../problems/definitions';
import {isReady} from '../problems/readiness';
import type {ProblemId} from '../problems/types';
import {GUIDE_HREF,HOME_HREF,goHome,inPlace,navigate} from '../state/route';
import {GAUSS,PlannedGlyph,ShapeGlyph,plannedName} from '../explorer/lessons';
import {gaussHref,gaussLesson,isGaussReady} from '../gauss';
import {Brand,SiteLinks} from '../explorer/Brand';
import {STORAGE} from '../explorer/Explorer';
import {Prose} from '../components/Math';
import {Hint} from '../components/Hint';
import '../explorer/explorer.css';
import './guide.css';

/* HOW TO STUDY WITH THE SITE. The owner asked for a page that tells a student how to actually learn with
 * Field Builder and do well, and said it must not be a page about reading: the student has to quiz
 * themselves. So every step below is something to DO -- predict, explain out loud, write it first, check a
 * limit, redo it from a blank page -- and each says where on the lesson page it is done. The Walkthrough
 * already tours the buttons; this page is about the habits that turn watching a derivation into being able
 * to produce one in an exam, which is a different skill, and the one a student is marked on.
 *
 * Its claims are kept to what the page really does: the board under "Build the integral" plays its steps on
 * the figure rather than marking typed answers, so the guide asks for each step on paper first and the board
 * to check it; the wrong expressions a student is likely to write live under "Easy to confuse with".
 *
 * GAUSS'S LAW IS HALF THE SITE, and the guide said nothing of it. Its eleven lessons are the last leg of the order,
 * named as the lesson list names them; its board, "Apply Gauss's law", is worked the way "Build the integral" is;
 * and the exam checklist has its Gauss's law run beside the integral's, with a line on which to reach for. */

/** The theme, as the home page keeps it: the document's class, saved with the lesson's settings. Copied
 * rather than shared, so this page added nothing to Home.tsx but a link. */
const subscribeTheme=(on:()=>void)=>{const o=new MutationObserver(on);o.observe(document.documentElement,{attributes:true,attributeFilter:['class']});return()=>o.disconnect()};
const isDark=()=>document.documentElement.classList.contains('dark');
function setTheme(dark:boolean){
 document.documentElement.classList.toggle('dark',dark);
 try{const raw=localStorage.getItem(STORAGE),v=raw?JSON.parse(raw):{};localStorage.setItem(STORAGE,JSON.stringify({...(v&&typeof v==='object'&&!Array.isArray(v)?v:{}),dark}))}catch{/* kept for this visit */}
}
const open=(e:React.MouseEvent<HTMLAnchorElement>)=>{if(!inPlace(e))return;e.preventDefault();navigate(e.currentTarget.getAttribute('href')??'')};
/** A lesson as a shared link opens it: at its defaults, which is what the guide's words describe. */
const lessonHref=(id:ProblemId)=>`?p=${id}`;

/** THE WAY IN FROM ELSEWHERE: the home page puts it under its start buttons. Here, so its style comes with it. */
export function GuideLink(){
 return <a className="guide-entry" href={GUIDE_HREF} onClick={open}><GraduationCap size={16} aria-hidden="true"/><span><span className="guide-entry-kicker">New here?</span> How to study with this site</span><ArrowRight size={14} aria-hidden="true"/></a>;
}

/** The argument every lesson makes, with the symbol each step adds: the run's five stages (buildRun.ts). */
const IDEA:{name:string;text:string}[]=[
 {name:'Cut it up',text:String.raw`Cut the charge into small pieces. Each holds $\Delta Q=\lambda\,\Delta y$ and is nearly a point.`},
 {name:'One piece',text:String.raw`Coulomb’s law for that one piece: $\Delta E=k\,\Delta Q/r_i^2$, along the line from the piece through $P$.`},
 {name:'What cancels',text:'Pair each piece with its mirror, where it has one. The parts that are equal and opposite drop out.'},
 {name:'Add them up',text:String.raw`Add what survives, piece by piece, with its projection: $\sum k\,\Delta Q\cos\alpha/r_i^2$.`},
 {name:'Shrink them',text:String.raw`As $N\to\infty$ the pieces shrink. $\Delta y$ becomes $dy$, and the sum becomes the integral.`}];

/** THE STUDY LOOP. Each step is an action, then where on the lesson page it happens. Ordered as a first
 * session runs, so the list is also the plan for one sitting. */
const LOOP:{title:string;text:string;where:string}[]=[
 {title:'Read the lesson for the idea',
  text:'Open the lesson under the title and read it once, for its one idea, not to memorise it. Then look away and say that idea in a sentence of your own.',
  where:'Read the lesson, under the lesson’s title.'},
 {title:'Predict before you press play',
  text:String.raw`Before you watch, write down three guesses. Which parts will cancel? Which way will the field at $P$ point? What should it look like from very far away? A guess you wrote down and got wrong teaches you more than a right answer you only read.`,
  where:'Paper, before Watch it build.'},
 {title:'Watch it build, one stage at a time',
  text:'Pause after each of the five stages and explain out loud what changed and why, as if to a friend. If you cannot, step back a stage and watch it again. Explaining to yourself is what shows you the gap.',
  where:'Watch it build, then the pause and the stage arrows.'},
 {title:'Build the integral yourself first',
  text:String.raw`Cover the board and write each step on paper: $dQ$, one piece’s field, what survives, the bounds, the integral. Only then choose each step on the board and compare. When you unfold the integration, write your next line before you press for the next one. Where yours differs, find out why before you move on.`,
  where:'Build the integral, then Unfold the integration and Easy to confuse with.'},
 {title:'Check the limits',
  text:String.raw`Ask what your answer must become at the extremes. Far away, any finite charge must look like a point charge, $kQ/r^2$. A rod grown without end at fixed $\lambda$ must look like an infinite line, $2k\lambda/r$. Say what you expect, then push the figure there and see. This is how you catch your own mistakes in an exam.`,
  where:'Limiting cases, near the end of the lesson.'},
 {title:'Change one slider at a time',
  text:String.raw`Pick one thing: the distance, the size, or the sign of the charge. Predict what the field at $P$ will do, then move only that slider and check. One change at a time, so you know which cause made which effect.`,
  where:'The sliders under the figure.'},
 {title:'Do it from memory',
  text:'Close the page. On a blank sheet, draw the charge and $P$, and derive the result: the piece, what cancels, the integral, the answer, a limit check. Then print the handout and mark, in another colour, everything you missed.',
  where:'Lesson tools (the three dots), then Print this lesson.'},
 {title:'Come back, and mix them up',
  text:'A few days later, redo it from a blank page before you look at anything. When you practise, mix lessons, a rod, then a ring, then a potential, so you have to decide which method fits each, as an exam makes you.',
  where:'Any lesson, a few days later.'}];

/** THE ORDER, in four legs: the pattern on a rod, round shapes, shapes where less cancels, and the potential
 * last, once the field's version of each shape is known. Each line says only what is new. Gauss's law follows
 * as a fifth leg (GAUSS_ORDER). */
const ORDER:{leg:string;items:{id:ProblemId;text:string}[]}[]=[
 {leg:'The pattern, on a rod',items:[
  {id:'bisector',text:'Start here. The whole pattern, with mirror pieces that cancel along the rod.'},
  {id:'axial',text:'Every piece points the same way: nothing to project, and nothing cancels.'},
  {id:'infinite',text:String.raw`The rod never ends. Cut it by angle at $P$ and the integral stays finite.`}]},
 {leg:'Round shapes and a sheet',items:[
  {id:'ring',text:String.raw`Every piece is the same distance from $P$, so the sideways parts cancel all the way round.`},
  {id:'disk',text:'A disk is rings. The ring’s answer becomes the piece you add up.'},
  {id:'annulus',text:String.raw`A disk with a hole: the same rings, added from the hole’s edge $a$ out to the rim $b$.`},
  {id:'sheet',text:'A disk with no edge. The far rings make the larger fields, and the field never changes with height.'},
  {id:'arc',text:String.raw`Every piece is $R$ from $P$. How far the arc opens decides what survives.`},
  {id:'uneven-arc',text:String.raw`The semicircle again, its charge piled toward the middle: $\lambda(\theta)$ goes inside the integral, and the mirror pairs still cancel across the axis.`}]},
 {leg:'When less cancels',items:[
  {id:'endpoint',text:String.raw`No mirror pieces, so neither part cancels: one integral for $E_x$, one for $E_y$.`},
  {id:'offset',text:String.raw`$P$ between the middle and an end: the stretch that mirrors itself across $P$’s level cancels along the rod, and the leftover leans the field.`},
  {id:'ramp',text:String.raw`The density grows along the rod, so $\lambda(y)$ goes inside the integral.`},
  {id:'semi',text:String.raw`Half an infinite line. Nothing beyond the end cancels, and the field leans at exactly $\pi/4$.`}]},
 {leg:'Potential, last',items:[
  {id:'v-rod-bisector',text:'Each piece adds a number, not an arrow, so mirror pieces add instead of cancelling.'},
  {id:'v-rod-axial',text:'One plain integral, every piece the same sign, and a logarithm for the answer.'},
  {id:'v-ring',text:'Every piece the same distance away, so the pieces simply add. One derivative gives the ring’s field back.'},
  {id:'v-disk',text:'Rings again, adding numbers this time. Differentiate once to recover the disk’s field.'},
  {id:'v-arc',text:'The potential does not care how far the arc is bent round.'}]}];

/** THE FIFTH LEG: Gauss's law, after the integrals, in the lesson list's order (GAUSS in explorer/lessons), each
 * named as the list names it. A shortcut is only trusted once the long way is known, so it comes last. */
const GAUSS_ORDER:Record<string,string>={
 symmetry:'Before any surface, decide which way the field must point and where its size is the same. Only a sphere, a line or a plane pins both down.',
 flux:'What flux counts: the field crossing a tilted patch, then the net flow out of a whole closed surface.',
 inside:String.raw`Why a closed surface’s flux sees only the charge it holds, $Q_{\text{enc}}/\varepsilon_0$, whatever its shape.`,
 qenc:'The right side from a density: a ratio of volumes when it is uniform, thin shells added up when it is not.',
 spheres:'The law put to work: a shell, then a solid ball, with the field inside and outside each.',
 lines:'A cylinder round a line, a thick rod or a shell. Outside, its answer is the one the Infinite line lesson built piece by piece.',
 sheets:'A pillbox through a sheet or a slab, and why, outside them, the distance drops out.',
 conductors:'No field inside the metal: where its charge must sit, and what a hollow in it holds.',
 holes:'A hole is a whole object plus a negative one. Find each one’s field, by the law where its symmetry allows, and add them as arrows.',
 'runs-out':'The finite rod. The law still holds, but no surface makes it solvable, so you are back to the integral.',
 hard:'Charge out to infinity, densities that blow up, and the law run backwards, from a field to the charge behind it.'};

/** THE COMMON WRONG TURNS, each with the place on the page that shows it going right. */
const STUCK:{slip:string;text:string;where:string}[]=[
 {slip:String.raw`You forgot the projection, $\cos\alpha$`,
  text:String.raw`Only the part of each piece’s field that survives the cancelling gets added. Multiply by $\cos\alpha$ (or $\sin\alpha$) for that part, with $\alpha$ the angle at $P$.`,
  where:'What cancels, in Watch it build.'},
 {slip:String.raw`You used $Q$ where $\lambda\,dy$ belongs`,
  text:String.raw`$Q$ is the whole charge. Inside the integral, one piece holds only $dQ=\lambda\,dy$; the integral adds them back up to $Q$.`,
  where:'Cut it up, and the first step of the board.'},
 {slip:String.raw`You used $r$ where $r_i$ belongs`,
  text:String.raw`$r$ is how far $P$ is from the charge’s line. $r_i$ is how far one piece is from $P$, and it changes from piece to piece.`,
  where:'One piece, in Watch it build.'},
 {slip:'Your bounds are wrong',
  text:'The bounds are where the charge starts and ends, written in the variable you integrate over. A half rod, an arc, a disk from the centre out: draw them before you write them.',
  where:'Integration interval, under Build the integral.'},
 {slip:'Your potential falls off as an inverse square',
  text:String.raw`A piece’s potential is $k\,dQ/r_i$, one power, and a number with no direction, so there is no $\cos\alpha$, and with charge of one sign nothing cancels.`,
  where:'One piece, in any potential lesson.'},
 {slip:String.raw`You took $E$ out of the flux integral where it changes`,
  text:String.raw`Gauss’s law holds for every closed surface, but it gives you $E$ only where symmetry makes the field the same over the part of the surface it crosses. On any other surface the flux is still $Q_{\text{enc}}/\varepsilon_0$, but it cannot be divided out to give $E$.`,
  where:'The surface and Left side, in a Gauss lesson’s Watch it build.'},
 {slip:'You counted charge outside the surface',
  text:String.raw`Charge outside a closed surface sends as much flux in as out, so only $Q_{\text{enc}}$ goes on the right side. Its field on the surface is not zero, in general; the law still gives the whole field, but only where the symmetry holds for all of the charge.`,
  where:'Right side, in a Gauss lesson, and Why only the charge inside.'}];

/** THE CHECKLIST FOR A SHAPE NO LESSON HAS: the five stages, written as the steps an exam answer takes. Then the
 * same for Gauss's law (GAUSS_CHECK): its five stages and the check, for charge with the symmetry it needs. */
const GAUSS_CHECK:{step:string;text:string}[]=[
 {step:'Symmetry',text:'Turn the charge about its centre in any direction, or turn it about a line and slide it along that line, or slide and turn it within a plane. If it looks no different, the field must point straight out or in, and be the same wherever the charge looks the same. If not, build the integral.'},
 {step:'The surface',text:String.raw`Draw a closed surface through $P$ with that same symmetry: a sphere, a cylinder or a pillbox.`},
 {step:'Left side',text:String.raw`On each part of it the field is square to it and the same, runs along it, or is zero. The flux becomes $E$ times the area the field crosses.`},
 {step:'Right side',text:String.raw`Add only the charge inside, $Q_{\text{enc}}$, integrating a density if you are given one.`},
 {step:'Solve',text:String.raw`Set the two sides equal, $\Phi=Q_{\text{enc}}/\varepsilon_0$, and divide for $E$.`},
 {step:'Check',text:'Inside and outside answers agree at a boundary that carries no surface charge. Far from a ball with a finite net charge the field is a point charge’s. The sign follows the charge.'}];
const CHECKLIST:{step:string;text:string}[]=[
 {step:'Choose coordinates',text:String.raw`Lay the charge along an axis, put $P$ somewhere simple, and name the variable you will integrate over.`},
 {step:String.raw`Write $dQ$`,text:String.raw`$\lambda\,dy$ for a line, $\lambda R\,d\theta$ for an arc, $\sigma\,dA$ for a surface.`},
 {step:'One piece',text:String.raw`$dE=k\,dQ/r_i^2$, along the line from the piece through $P$. For a potential, $dV=k\,dQ/r_i$.`},
 {step:'Use symmetry',text:'Find each piece’s mirror. Drop what cancels, and keep the projection on what is left.'},
 {step:'Set the bounds',text:'Where the charge starts and where it ends, in your variable.'},
 {step:'Integrate',text:'Take the constants out first. A trigonometric substitution often turns a root into something simple.'},
 {step:'Check the limits',text:String.raw`Far away, a finite charge gives $kQ/r^2$. The sign follows the charge. The units are those of a field, or of a potential.`}];

export default function Guide(){
 const dark=useSyncExternalStore(subscribeTheme,isDark,()=>false);
 useEffect(()=>{document.title='How to study with this site · Field Builder'},[]);
 const themeLabel=dark?'Switch to light theme':'Switch to dark theme';
 const ready=(id:ProblemId)=>isReady(id);
 return <div className="guide">
  <a className="skip-link" href="#guide">Skip to the guide</a>
  <header className="exp-header"><Brand/><div className="exp-header-right"><SiteLinks current="guide"/><Hint label={themeLabel}><button type="button" className="icon-button" onClick={()=>setTheme(!dark)} aria-label={themeLabel}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></Hint></div></header>
  <main id="guide" tabIndex={-1} className="guide-main">
   <header className="guide-hero">
    <p className="guide-kicker">How to use this site</p>
    <h1 id="guide-title">How to study with Field Builder</h1>
    <p className="guide-lede">Watching a derivation feels like learning it. It is not the same thing. An exam asks you to produce one on a blank page, and the only way to get good at that is to practise doing it: guess, explain, write it yourself, check it, and come back to it. This page shows you how to use each lesson that way.</p>
    <nav className="guide-contents" aria-label="On this page"><ul>
     <li><a href="#guide-idea">The one idea</a></li><li><a href="#guide-loop">Working through a lesson</a></li><li><a href="#guide-order">An order to take them in</a></li>
     <li><a href="#guide-order-gauss">Gauss’s law</a></li><li><a href="#guide-stuck">When you are stuck</a></li><li><a href="#guide-exam">For any new shape</a></li><li><a href="#guide-teachers">For teachers</a></li></ul></nav>
   </header>

   <section id="guide-idea" className="guide-section" aria-labelledby="guide-idea-title">
    <h2 id="guide-idea-title">The one idea behind every lesson</h2>
    <p><Prose text={'Every integral lesson on this site solves the same problem. A charge is spread over some shape, and you want its field (or its potential) at a point $P$. Coulomb’s law only knows point charges, so you make the shape into point charges:'}/></p>
    <ol className="guide-idea">{IDEA.map(s=><li key={s.name}><strong>{s.name}</strong><span><Prose text={s.text}/></span></li>)}</ol>
    <p>Learn this pattern once and every shape is the same problem. What changes from lesson to lesson is what one piece looks like, and what cancels. So in each new lesson, ask those two questions first.</p>
    <p><Prose text={'The Gauss’s law lessons are the shortcut for the few shapes symmetric enough to allow one: a closed surface through $P$ instead of the sum. They come after the integrals, and the order below says why.'}/></p>
   </section>

   <section id="guide-loop" className="guide-section" aria-labelledby="guide-loop-title">
    <h2 id="guide-loop-title">Working through a lesson</h2>
    <p>Do these in order, with paper and a pencil beside you. A first careful pass through one lesson takes about half an hour; a redo from memory, later, about a quarter of an hour.</p>
    <ol className="guide-loop">{LOOP.map(s=><li key={s.title}><h3>{s.title}</h3><p><Prose text={s.text}/></p><p className="guide-where"><span>Where</span>{s.where}</p></li>)}</ol>
    <aside className="guide-gauss-note" aria-labelledby="guide-gauss-loop-title">
     <h3 id="guide-gauss-loop-title">In a Gauss’s law lesson</h3>
     <p>Work it the same way. There is no integral to build: the board beside the figure is <strong>Apply Gauss’s law</strong>, and it runs in the order you would write the answer, the symmetry, the surface, the left side, the right side, then solve. Cover it, write each step on paper first, and only then compare with the board, exactly as with Build the integral. Watch it build steps through the same five, so predict each before you play it. The lesson ends with Check the answer and Easy to confuse with, which there lists claims that sound right and are not.</p>
    </aside>
    <aside className="guide-why" aria-labelledby="guide-why-title">
     <h3 id="guide-why-title">Why this works better than rereading</h3>
     <p>Rereading feels productive because the page gets familiar, but recognising a derivation is a different skill from producing one. Each habit above makes you <em>produce</em>:</p>
     <ul>
      <li><strong>Testing yourself</strong> (writing it from memory) strengthens what you know far more than reading it again, and shows you what you do not know yet.</li>
      <li><strong>Predicting</strong> before you watch makes you notice exactly where the physics surprised you.</li>
      <li><strong>Explaining each step</strong> out loud finds the gaps that silent reading slides over.</li>
      <li><strong>Spacing</strong> your returns over days makes it last until the exam, not just until tomorrow.</li>
      <li><strong>Mixing lessons</strong> trains you to choose the method, which is the hard part of a new problem.</li>
     </ul>
     <p>All of these feel harder than rereading. That effort is the learning.</p>
    </aside>
   </section>

   <section id="guide-order" className="guide-section" aria-labelledby="guide-order-title">
    <h2 id="guide-order-title">An order to take them in</h2>
    <p>Each lesson leans on the ones before it. This order adds one new idea at a time.</p>
    <div className="guide-order">{ORDER.map(g=><div className="guide-leg" key={g.leg}><h3>{g.leg}</h3>
     <ol>{g.items.filter(x=>ready(x.id)).map(x=>{const p=getProblem(x.id);return <li key={x.id}><a className="guide-lesson" href={lessonHref(x.id)} onClick={open}>
      <span className="guide-glyph" aria-hidden="true"><ShapeGlyph id={x.id} size={20}/></span><span className="guide-lesson-words"><strong>{p.short}</strong><span><Prose text={x.text}/></span></span><ArrowRight className="guide-lesson-go" size={15} aria-hidden="true"/>
     </a></li>})}</ol></div>)}
     {/* The fifth leg, named as the lesson list names each lesson (GaussFamily: the built lesson's title). */}
     <div className="guide-leg" id="guide-order-gauss"><h3>Gauss’s law, after the integrals</h3>
      <p className="guide-leg-note">Take these once the integrals feel routine. Gauss’s law is quicker, but it only works for charge with enough symmetry, and you can only tell when it works if you know the long way it replaces.</p>
      <ol>{GAUSS.lessons.filter(l=>isGaussReady(l.key)).map(l=><li key={l.key}><a className="guide-lesson" href={gaussHref(l.key)} onClick={open}>
       <span className="guide-glyph" aria-hidden="true"><PlannedGlyph id={l.key} size={20}/></span><span className="guide-lesson-words"><strong>{plannedName(gaussLesson(l.key)?.title??l.name)}</strong><span><Prose text={GAUSS_ORDER[l.key]??l.about}/></span></span><ArrowRight className="guide-lesson-go" size={15} aria-hidden="true"/>
      </a></li>)}</ol></div></div>
   </section>

   <section id="guide-stuck" className="guide-section" aria-labelledby="guide-stuck-title">
    <h2 id="guide-stuck-title">When you are stuck</h2>
    <p>Most wrong answers come from a handful of slips. If your answer looks off, check these first, and look where each one points.</p>
    <ul className="guide-stuck">{STUCK.map(s=><li key={s.slip}><h3><Prose text={s.slip}/></h3><p><Prose text={s.text}/></p><p className="guide-where"><span>Look at</span>{s.where}</p></li>)}</ul>
    <p>Every lesson also ends with <strong>Easy to confuse with</strong>: in an integral lesson, the wrong expressions people write for that shape and what each one would really describe; in a Gauss’s law lesson, the claims that sound right and are not. Read it after you have written your own answer, not before.</p>
   </section>

   <section id="guide-exam" className="guide-section" aria-labelledby="guide-exam-title">
    <h2 id="guide-exam-title">For any new shape: an exam checklist</h2>
    <p>An exam will give you a shape no lesson had. Run the same pattern, in these steps, and you will always know what to write next.</p>
    <ol className="guide-check">{CHECKLIST.map(c=><li key={c.step}><strong><Prose text={c.step}/></strong><span><Prose text={c.text}/></span></li>)}</ol>
    <h3 className="guide-check-title">Or, where the charge has symmetry: Gauss’s law</h3>
    <p><Prose text={String.raw`Which to reach for? Gauss’s law is always true, but it hands you the field only when the charge’s symmetry makes $E$ the same, and square to the surface or along it, over each part of a closed surface you can draw: a ball or a shell whose charge depends only on the distance from its centre, an infinite line or cylinder, an infinite sheet or slab, and shapes made by adding or taking away these. A finite rod, a ring or a disk has no such surface, so build the integral; When symmetry runs out shows exactly where it fails. Where it works, pick the surface first:`}/></p>
    <ol className="guide-check">{GAUSS_CHECK.map(c=><li key={c.step}><strong>{c.step}</strong><span><Prose text={c.text}/></span></li>)}</ol>
   </section>

   <aside id="guide-teachers" className="guide-teachers" aria-labelledby="guide-teachers-title">
    <h2 id="guide-teachers-title">For teachers</h2>
    <ul>
     <li><strong>Link straight to a lesson.</strong> Every lesson’s address names it, such as <code>?p=ring</code> or <code>?g=spheres</code>, so a link opens that lesson. Copy a link to this lesson, in Lesson tools, keeps the values you set, and while Watch it build is open it keeps the stage too.</li>
     <li><strong>Print the handout.</strong> From Lesson tools, Print this lesson puts the lesson, the figure and the derivation on paper, ready for homework or a quiz from memory.</li>
     <li><strong>Project it in class.</strong> Pause Watch it build before each stage and ask the room to predict what comes next. This page has its own address, <code>?guide</code>, to share with a class.</li>
    </ul>
   </aside>

   <footer className="guide-foot">
    <a className="guide-start" href={lessonHref('bisector')} onClick={open}>Start with the finite line<ArrowRight size={16} aria-hidden="true"/></a>
    <a className="guide-home" href={HOME_HREF} onClick={e=>{if(!inPlace(e))return;e.preventDefault();goHome()}}>Back to every lesson</a>
   </footer>
  </main>
 </div>;
}
