'use client';
/* The inline SVG is a named figure, not an external bitmap. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useId, useState, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, MoveHorizontal, Plus, Scissors, Sigma } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MathText } from './Math';
import { Laws } from './Laws';
import { useRenderedWidth } from './useRenderedWidth';
import './workbench.css';
import './onboarding.css';
// Second page states the physics the other three pages are the method for: a student who has been
// shown the slicing and the summing without being told which law is being summed is doing algebra
// for no stated reason. It is the one page with no preview to drive, so it carries no figure.
// Fields add AS VECTORS: "the fields of many charges simply add" was the one sentence on the site that
// licensed adding magnitudes, the classic first-year error in exactly these problems. And no lesson
// "ends in an integral rather than a formula" -- each ends in a formula; the integral is how it gets there.
const pages=[{id:'move',title:'Explore the electric field.',description:'Drag the observation point P. Change the charge and its geometry. The field and its equation respond together.',hint:'Try moving P. This rod’s field weakens as you move away.',icon:MoveHorizontal},{id:'law',title:'Start from Coulomb’s law.',description:'Coulomb’s law gives the field of a single point charge. Superposition says the fields of many charges add as vectors. Together they are why each lesson builds its answer as an integral, instead of quoting a formula to memorise.',hint:'',icon:Sigma},{id:'slice',title:'Divide the charge distribution.',description:'Split the charge into small pieces, then keep refining. Each ΔQ shrinks as the count grows. In the continuous limit, it becomes dQ.',hint:'Try refining the rod. More pieces, less charge in each.',icon:Scissors},{id:'sum',title:'Add the electric\u2011field contributions.',description:'Each piece adds a small field at P, pointing away from the piece when its charge is positive. Taken in mirror pairs, their sideways parts cancel, and what is left adds along the axis, pair by pair, to the total field. In every lesson, the Watch it build button on the figure plays this argument one stage at a time.',hint:'Try sweeping through the pairs. Watch the sum grow along the axis.',icon:Plus}];
// THE SUM PAGE OBEYS COULOMB. Twelve positive pieces make a rod standing to the left of P, spanning
// P's level, so each one's field at P points away from it and the nearer pieces count for more:
// ΔE ∝ (P − piece)/|P − piece|³.
// AND IT ADDS AS THE LESSONS ADD. It laid the twelve contributions head to tail out of P, a chain that
// dipped below P's level and came back, and said "Watch it build plays this argument" -- while every
// symmetric lesson's Add them up adds its pieces in mirror pairs, the sum an arrow along the axis with
// a tick per pair. The owner dropped the tip-to-tail arc from the run because it confused readers, and
// it was still the first picture of adding a new student saw; arriving at the run, they took the pairs
// for a different stage. So the page now adds as the run does: the pieces go in mirror pairs from the
// middle out (pairs.ts), each pair's two arrows leave the sum's head as one picture -- a rhombus whose
// sideways half-diagonals are the equal and opposite parts that cancel -- and the sum grows along the
// axis by the pair's two parts along it, everything at one scale.
// The rod stands near the figure's left edge, so the sum has the width of the figure to grow in: at
// P's old place, a third of the way in, the last pair's arrows were a dozen pixels long on a phone.
const SUM_P={x:130,y:112},SUM_ROD={x:40,top:22,bottom:202};
const SUM_PIECES=Array.from({length:12},(_,i)=>{const x=SUM_ROD.x,y=SUM_ROD.top+(SUM_ROD.bottom-SUM_ROD.top)*(i+.5)/12,dx=SUM_P.x-x,dy=SUM_P.y-y,d3=Math.hypot(dx,dy)**3;return{x,y,ex:dx/d3,ey:dy/d3};});
/** Each piece's share of the rod: a segment with a sliver of gap to the next. */
const SUM_SEG=(SUM_ROD.bottom-SUM_ROD.top)/12;
/** The mirror pairs in the order the run adds them, from the middle out: [below P's level, above it]. */
const SUM_PAIRS=Array.from({length:6},(_,k)=>[6+k,5-k] as const);
/** Which pair each piece goes in with. */
const SUM_PAIR_OF=SUM_PIECES.map((_,i)=>SUM_PAIRS.findIndex(pair=>pair.includes(i)));
// One scale for the pieces' arrows and the sum, so the sum is what its pairs add to: the whole of it
// runs 320 units out from P, as far as the figure has room for.
const SUM_SCALE=320/SUM_PIECES.reduce((s,p)=>s+p.ex,0);
/** Where the sum's head is once the first k pairs are in: each pair adds its two parts along x. */
const SUM_HEADS=SUM_PAIRS.reduce<number[]>((at,[a,b])=>[...at,at[at.length-1]+(SUM_PIECES[a].ex+SUM_PIECES[b].ex)*SUM_SCALE],[SUM_P.x]);
// The sum's and the pairs' arrowheads are a fixed size in the figure's units (onboard-sum, onboard-pair).
// Scaled with its stroke, as the first page's arrow is, the sum's head was longer than the last pair's
// whole share of the sum, and covered the pair going in.
/** The tour's figure is 480 units wide, about 320 px on a phone: its labels are held near ten pixels. */
const VIEW=480;
export function Onboarding({open,onClose,onExplore,returnFocus}:{open:boolean;onClose:()=>void;onExplore?:()=>void;returnFocus?:RefObject<HTMLElement|null>}){
 // The sum page opens on the whole sum, its last pair still drawn going in; the slider takes it back
 // apart, a pair at a time.
 const[page,setPage]=useState(0),[distance,setDistance]=useState(45),[refinement,setRefinement]=useState(15),[sweep,setSweep]=useState(100);
 // Pages are addressed by name, not index, so inserting one cannot silently repoint a figure.
 // THE ROD'S FIELD FALLS AS A ROD'S DOES. The drawn rod is 133 units long, and P walks out from 96
 // to 224 units. Its field on the bisector goes as L/(r√(r² + L²/4)), so the arrow shrinks to under
 // a quarter of its length; it was drawn falling as 1/r, the infinite line's law, on a student's
 // first picture of a rod. The arrow leaves P's ring rather than its centre, so a short one stays seen.
 const content=pages[page],kind=content.id,Icon=content.icon,last=page===pages.length-1,slices=Math.round(4+refinement*.56),px=178+distance*1.28,fieldLength=992000/((px-82)*Math.sqrt((px-82)**2+4422));
 // The pairs added so far; the last of them is the one drawn going in, from where the sum stood before it.
 const added=Math.round(sweep*.06),from=SUM_HEADS[Math.max(0,added-1)],head=SUM_HEADS[added];
 const [svgRef,width]=useRenderedWidth(VIEW),scale=width/VIEW,label=Math.max(11,10/scale),plus=Math.max(12,10/scale),sliderLabel=useId();
 const labelStyle={fontSize:`${label.toFixed(2)}px`};
 // Tab order is DOM order: preview slider, page dots, Skip intro (or Previous), Continue / Start exploring, then Close. Tab wraps inside the dialog. On close, DialogPopup.finalFocus returns to Explorer's Quick tour button.
 return <Dialog open={open} onOpenChange={value=>{if(!value){setPage(0);onClose();}}}><DialogContent className="fb-onboarding" finalFocus={returnFocus}>
 {kind!=='law'&&<div className="ob-visual"><svg ref={svgRef} viewBox="0 0 480 205" role="img" aria-label={content.hint}><defs><marker id="onboard-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="var(--field)"/></marker><marker id="onboard-sum" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L12,5 L0,10Z" fill="var(--field)"/></marker><marker id="onboard-pair" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3.5 L0,7" fill="var(--contribution)"/></marker><pattern id="onboard-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".75" fill="var(--grid)"/></pattern></defs><rect width="480" height="205" fill="url(#onboard-grid)"/>
 {kind==='move'&&<><path d="M82 35V168" stroke="var(--charge)" strokeWidth="11" strokeLinecap="round"/>{[50,75,100,125,150].map(y=><g key={y}><text x="82" y={y} textAnchor="middle" dominantBaseline="central" className="ob-plus" style={{fill:'var(--diagram)',fontSize:plus,fontWeight:700}}>+</text><path d={`M88 ${y} L${px} 102`} stroke="var(--contribution)" strokeDasharray="3 5" opacity=".38"/></g>)}<path d={`M${px+8} 102h${fieldLength}`} stroke="var(--field)" strokeWidth="3" markerEnd="url(#onboard-arrow)"/><circle cx={px} cy="102" r="8" fill="var(--card)" stroke="var(--field)" strokeWidth="3"/><circle cx={px} cy="102" r="17" fill="none" stroke="var(--field)" opacity=".15"/><text x={px-5} y="76" className="ob-math">P</text><text x={px+fieldLength} y="86" className="ob-math">E</text><path d={`M82 185H${px}`} stroke="var(--ghost)"/><text x={(82+px)/2} y="178" className="ob-math">r</text></>}
 {kind==='slice'&&<><text x="45" y="57" className="ob-label" style={labelStyle}>SAME TOTAL CHARGE</text>{Array.from({length:slices},(_,i)=><rect key={i} x={45+i*390/slices} y="84" width={Math.max(1,390/slices-Math.max(.7,2.8-refinement/40))} height="33" rx={refinement>60?1:3} fill={i===Math.floor(slices*.55)?'var(--charge)':'var(--charge-fill)'} stroke="var(--charge)" strokeOpacity=".75" strokeWidth=".7"/>)}<path d={`M${45+(Math.floor(slices*.55)+.5)*390/slices} 124v18`} stroke="var(--charge)"/><text x={45+(Math.floor(slices*.55)+.5)*390/slices} y="164" textAnchor="middle" className="ob-math">ΔQ</text><text x="45" y="189" className="ob-label" style={labelStyle}><tspan style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:Math.max(14,label),letterSpacing:0}}>N</tspan> PIECES</text><text x="435" y="189" textAnchor="end" className="ob-label" style={labelStyle}>{refinement>90?'APPROACHING THE LIMIT':'ΔQ = Q / N'}</text></>}
 {/* The pieces go in by pairs: the pair going in is lit, with its lines to P dashed as the run draws them;
 the pairs already in stay lit more faintly, and the rest wait, faint. */}
 {kind==='sum'&&<>{SUM_PIECES.map((p,i)=>{const pair=SUM_PAIR_OF[i],into=pair<added,lit=pair===added-1;return <g key={i} className={into?'ob-piece is-added':'ob-piece'} opacity={lit?1:into?.55:.15} data-x={p.x} data-y={p.y.toFixed(1)} data-pair={pair}>{lit&&<path className="ob-ray" d={`M${p.x+7} ${p.y.toFixed(1)}L${SUM_P.x} ${SUM_P.y}`} stroke="var(--charge)" strokeDasharray="4 4" opacity=".7"/>}<rect x={p.x-5.5} y={(p.y-SUM_SEG/2+1).toFixed(1)} width="11" height={(SUM_SEG-2).toFixed(1)} rx="2" fill="var(--charge)"/><text x={p.x} y={p.y.toFixed(1)} textAnchor="middle" dominantBaseline="central" className="ob-plus" style={{fill:'var(--diagram)',fontSize:Math.min(plus,SUM_SEG),fontWeight:700}}>+</text></g>})}
 {/* The sum, an arrow along the axis from P, with a tick where each pair's share of it ends. */}
 {added>0&&<path className="ob-sum" d={`M${SUM_P.x} ${SUM_P.y}l${(head-SUM_P.x).toFixed(2)} 0`} stroke="var(--field)" strokeWidth="3.5" markerEnd="url(#onboard-sum)"/>}{SUM_HEADS.slice(1,added).map(x=><path key={x} className="ob-tick" d={`M${x.toFixed(1)} ${SUM_P.y-6}v12`} stroke="var(--field)" strokeWidth="2"/>)}
 {/* The pair going in: each piece's whole arrow, from where the sum stood, and the rhombus they close on
     its new head. Its sideways half-diagonals are the two parts across the axis, equal and opposite, and
     its long diagonal, along the axis, is what the pair adds to the sum. */}
 {added>0&&SUM_PAIRS[added-1].map(i=>{const p=SUM_PIECES[i],tx=from+p.ex*SUM_SCALE,ty=SUM_P.y+p.ey*SUM_SCALE;return <g key={i} className="ob-pair-arrow" data-piece={i}><path className="ob-side" d={`M${tx.toFixed(1)} ${ty.toFixed(1)}L${head.toFixed(1)} ${SUM_P.y}`} stroke="var(--contribution)" strokeDasharray="3 3" opacity=".65"/><path className="ob-pair" d={`M${from.toFixed(1)} ${SUM_P.y}L${tx.toFixed(1)} ${ty.toFixed(1)}`} stroke="var(--contribution)" strokeWidth="2.2" markerEnd="url(#onboard-pair)"/></g>})}
 <circle cx={SUM_P.x} cy={SUM_P.y} r="6" fill="var(--card)" stroke="var(--field)" strokeWidth="2"/><text x={SUM_P.x} y={SUM_P.y-14} textAnchor="middle" className="ob-math">P</text><text x={SUM_P.x+16} y={SUM_P.y-24} className="ob-label" style={labelStyle}>THEIR VECTOR SUM</text></>}
 </svg><div className="ob-mini-control"><Icon size={15}/><span id={sliderLabel} className="sr-only">{kind==='move'?'Preview observation-point distance':kind==='slice'?'Preview number of charge pieces':'Preview accumulated contributions'}</span><Slider aria-labelledby={sliderLabel} aria-label={kind==='move'?'Preview observation-point distance':kind==='slice'?'Preview number of charge pieces':'Preview accumulated contributions'} min={0} max={100} value={[kind==='move'?distance:kind==='slice'?refinement:sweep]} onValueChange={v=>{const n=Array.isArray(v)?v[0]:v;if(kind==='move')setDistance(n);else if(kind==='slice')setRefinement(n);else setSweep(n);}}/><span>{kind==='move'?'Move P':kind==='slice'?'Refine':'Add up'}</span></div></div>}
 <div className="ob-copy" key={page}><DialogTitle className="ob-title">{content.title}</DialogTitle><DialogDescription className="ob-description">{content.description}</DialogDescription>{kind==='law'?<Laws lede={false}/>:<><div className="ob-formula"><MathText tex={kind==='move'?String.raw`\text{geometry}\ \longrightarrow\ \mathbf E(P)`:kind==='slice'?String.raw`N\to\infty\qquad\Delta Q\to dQ`:String.raw`\mathbf E\approx\sum_i\Delta\mathbf E_i\quad\longrightarrow\quad\mathbf E=\int d\mathbf E`}/></div><p className="ob-hint">{content.hint}</p></>}</div>
 <div className="ob-footer"><div className="ob-dots" aria-label="Introduction pages">{pages.map((p,index)=><button key={p.id} className={index===page?'active':''} onClick={()=>setPage(index)} aria-label={`Introduction page ${index+1}`} aria-current={index===page?'step':undefined}/>)}</div><div className="ob-actions">{page>0?<Button variant="ghost" onClick={()=>setPage(page-1)} aria-label="Previous introduction page"><ArrowLeft size={16}/></Button>:<Button variant="ghost" onClick={()=>{setPage(0);onClose();}}>Skip intro</Button>}<Button onClick={()=>{if(last){setPage(0);onExplore?.();onClose();}else setPage(page+1);}}>{last?'Start exploring':'Continue'}<ArrowRight size={15}/></Button></div></div>
 </DialogContent></Dialog>;
}
