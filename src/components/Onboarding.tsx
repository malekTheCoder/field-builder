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
// Second page states the physics the other three pages are the method for: a student who has been
// shown the slicing and the summing without being told which law is being summed is doing algebra
// for no stated reason. It is the one page with no preview to drive, so it carries no figure.
const pages=[{id:'move',title:'Explore the electric field.',description:'Drag the observation point P. Change the charge and its geometry. The field and its equation respond together.',hint:'Try moving P. This rod’s field weakens as you move away.',icon:MoveHorizontal},{id:'law',title:'Start from Coulomb’s law.',description:'Coulomb’s law gives the field of a single point charge. Superposition says the fields of many charges simply add. Those two facts are why every lesson here ends in an integral rather than a formula to memorise.',hint:'',icon:Sigma},{id:'slice',title:'Divide the charge distribution.',description:'Split the charge into small pieces, then keep refining. Each ΔQ shrinks as the count grows. In the continuous limit, it becomes dQ.',hint:'Try refining the rod. More pieces, less charge in each.',icon:Scissors},{id:'sum',title:'Add the electric-field contributions.',description:'Each piece adds a small field at P, pointing away from the piece when its charge is positive. Laid head to tail, the contributions sum to the total field. In every lesson, the Watch it build button on the figure plays this argument one stage at a time.',hint:'Try sweeping through the charge. Watch the contributions add.',icon:Plus}];
// THE SUM PAGE OBEYS COULOMB. Twelve positive pieces sit above and to the left of P, so each one's
// field at P points away from it, down and to the right, and the nearer pieces push harder:
// ΔE ∝ (P − piece)/|P − piece|³. The small arrows are those contributions laid head to tail, OUT OF
// P, and the arrow at P is the polygon's closing side: from P to the chain's head, so it tilts down
// with the chain as the slider adds pieces in. The chain once started in the figure's far corner and
// ended in mid-air, beside a separate arrow at P, and the reader had to judge by eye that two
// unconnected things were equal -- on the page that states the argument every lesson rests on.
const SUM_P={x:265,y:125},SUM_PIECES=Array.from({length:12},(_,i)=>{const x=49.5+i*13,y=55,dx=SUM_P.x-x,dy=SUM_P.y-y,d3=Math.hypot(dx,dy)**3;return{x,y,ex:dx/d3,ey:dy/d3};});
// One scale for the chain and the resultant, so the arrow at P is as long as the chain it sums.
const SUM_SCALE=122/SUM_PIECES.reduce((s,p)=>s+Math.hypot(p.ex,p.ey),0);
const SUM_CHAIN=SUM_PIECES.reduce<{x:number;y:number}[]>((at,p)=>[...at,{x:at[at.length-1].x+p.ex*SUM_SCALE,y:at[at.length-1].y+p.ey*SUM_SCALE}],[SUM_P]);
// The chain starts shallow (the far pieces push nearly sideways) and steepens, so it bows out above
// the closing side -- but only a little, since every piece's field points roughly the same way, so the chain
// is drawn in the contributions' colour and the closing side in the field's, and the thin polygon
// still reads as two things. Each is named on its own side: the sum below and to the left of the
// full chord, the contributions above and to the right, clear of the chain.
const SUM_HEAD=SUM_CHAIN[SUM_CHAIN.length-1],SUM_CHORD=Math.hypot(SUM_HEAD.x-SUM_P.x,SUM_HEAD.y-SUM_P.y);
const SUM_LABEL={x:(SUM_P.x+SUM_HEAD.x)/2-16*(SUM_HEAD.y-SUM_P.y)/SUM_CHORD,y:(SUM_P.y+SUM_HEAD.y)/2+16*(SUM_HEAD.x-SUM_P.x)/SUM_CHORD};
/** The tour's figure is 480 units wide, about 320 px on a phone: its labels are held near ten pixels. */
const VIEW=480;
export function Onboarding({open,onClose,onExplore,returnFocus}:{open:boolean;onClose:()=>void;onExplore?:()=>void;returnFocus?:RefObject<HTMLElement|null>}){
 // The sum page opens on the whole polygon. Every piece's field points roughly the same way, so a
 // part of the chain lies almost on its own closing side; only the whole chain bows clear of it.
 const[page,setPage]=useState(0),[distance,setDistance]=useState(45),[refinement,setRefinement]=useState(15),[sweep,setSweep]=useState(100);
 // Pages are addressed by name, not index, so inserting one cannot silently repoint a figure.
 // THE ROD'S FIELD FALLS AS A ROD'S DOES. The drawn rod is 133 units long, and P walks out from 96
 // to 224 units. Its field on the bisector goes as L/(r√(r² + L²/4)), so the arrow shrinks to under
 // a quarter of its length; it was drawn falling as 1/r, the infinite line's law, on a student's
 // first picture of a rod. The arrow leaves P's ring rather than its centre, so a short one stays seen.
 const content=pages[page],kind=content.id,Icon=content.icon,last=page===pages.length-1,slices=Math.round(4+refinement*.56),px=178+distance*1.28,fieldLength=992000/((px-82)*Math.sqrt((px-82)**2+4422));
 // The contributions added so far, and their resultant: the arrow at P, closing the chain.
 const added=Math.round(sweep*.12),head=SUM_CHAIN[added];
 const [svgRef,width]=useRenderedWidth(VIEW),scale=width/VIEW,label=Math.max(11,10/scale),plus=Math.max(12,10/scale),sliderLabel=useId();
 const labelStyle={fontSize:`${label.toFixed(2)}px`};
 // Tab order is DOM order: preview slider, page dots, Skip intro (or Previous), Continue / Start exploring, then Close. Tab wraps inside the dialog. On close, DialogPopup.finalFocus returns to Explorer's Quick tour button.
 return <Dialog open={open} onOpenChange={value=>{if(!value){setPage(0);onClose();}}}><DialogContent className="fb-onboarding" finalFocus={returnFocus}>
 {kind!=='law'&&<div className="ob-visual"><svg ref={svgRef} viewBox="0 0 480 205" role="img" aria-label={content.hint}><defs><marker id="onboard-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="var(--field)"/></marker><pattern id="onboard-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".75" fill="var(--grid)"/></pattern></defs><rect width="480" height="205" fill="url(#onboard-grid)"/>
 {kind==='move'&&<><path d="M82 35V168" stroke="var(--charge)" strokeWidth="11" strokeLinecap="round"/>{[50,75,100,125,150].map(y=><g key={y}><text x="82" y={y} textAnchor="middle" dominantBaseline="central" className="ob-plus" style={{fill:'var(--diagram)',fontSize:plus,fontWeight:700}}>+</text><path d={`M88 ${y} L${px} 102`} stroke="var(--contribution)" strokeDasharray="3 5" opacity=".38"/></g>)}<path d={`M${px+8} 102h${fieldLength}`} stroke="var(--field)" strokeWidth="3" markerEnd="url(#onboard-arrow)"/><circle cx={px} cy="102" r="8" fill="var(--card)" stroke="var(--field)" strokeWidth="3"/><circle cx={px} cy="102" r="17" fill="none" stroke="var(--field)" opacity=".15"/><text x={px-5} y="76" className="ob-math">P</text><text x={px+fieldLength} y="86" className="ob-math">E</text><path d={`M82 185H${px}`} stroke="var(--ghost)"/><text x={(82+px)/2} y="178" className="ob-math">r</text></>}
 {kind==='slice'&&<><text x="45" y="57" className="ob-label" style={labelStyle}>SAME TOTAL CHARGE</text>{Array.from({length:slices},(_,i)=><rect key={i} x={45+i*390/slices} y="84" width={Math.max(1,390/slices-Math.max(.7,2.8-refinement/40))} height="33" rx={refinement>60?1:3} fill={i===Math.floor(slices*.55)?'var(--charge)':'var(--charge-fill)'} stroke="var(--charge)" strokeOpacity=".75" strokeWidth=".7"/>)}<path d={`M${45+(Math.floor(slices*.55)+.5)*390/slices} 124v18`} stroke="var(--charge)"/><text x={45+(Math.floor(slices*.55)+.5)*390/slices} y="164" textAnchor="middle" className="ob-math">ΔQ</text><text x="45" y="189" className="ob-label" style={labelStyle}><tspan style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:Math.max(14,label),letterSpacing:0}}>N</tspan> PIECES</text><text x="435" y="189" textAnchor="end" className="ob-label" style={labelStyle}>{refinement>90?'APPROACHING THE LIMIT':'ΔQ = Q / N'}</text></>}
 {kind==='sum'&&<>{SUM_PIECES.map((p,i)=><g key={i} className={i<added?'ob-piece is-added':'ob-piece'} opacity={i<added?1:.15} data-x={p.x} data-y={p.y}><rect x={p.x-4.5} y="43" width="9" height="24" rx="2" fill="var(--charge)"/><path d={`M${p.x} 78L${SUM_P.x} ${SUM_P.y}`} stroke="var(--contribution)" opacity=".45"/><path className="ob-step" d={`M${SUM_CHAIN[i].x.toFixed(1)} ${SUM_CHAIN[i].y.toFixed(1)}L${SUM_CHAIN[i+1].x.toFixed(1)} ${SUM_CHAIN[i+1].y.toFixed(1)}`} stroke="var(--contribution)" strokeWidth={i%2?2.4:3.2} strokeOpacity={i%2?.65:1}/></g>)}{added>0&&<path className="ob-sum" d={`M${SUM_P.x} ${SUM_P.y}l${(head.x-SUM_P.x).toFixed(2)} ${(head.y-SUM_P.y).toFixed(2)}`} stroke="var(--field)" strokeWidth="3.5" markerEnd="url(#onboard-arrow)"/>}<circle cx={SUM_P.x} cy={SUM_P.y} r="6" fill="var(--card)" stroke="var(--field)" strokeWidth="2"/><text x="260" y="106" className="ob-math">P</text><text x="468" y={(136-1.3*label).toFixed(1)} textAnchor="end" className="ob-label" style={labelStyle}>SMALL</text><text x="468" y="136" textAnchor="end" className="ob-label" style={labelStyle}>CONTRIBUTIONS</text><text x={SUM_LABEL.x.toFixed(1)} y={(SUM_LABEL.y+label*.36).toFixed(1)} textAnchor="end" className="ob-label" style={labelStyle}>THEIR VECTOR SUM</text></>}
 </svg><div className="ob-mini-control"><Icon size={15}/><span id={sliderLabel} className="sr-only">{kind==='move'?'Preview observation-point distance':kind==='slice'?'Preview number of charge pieces':'Preview accumulated contributions'}</span><Slider aria-labelledby={sliderLabel} aria-label={kind==='move'?'Preview observation-point distance':kind==='slice'?'Preview number of charge pieces':'Preview accumulated contributions'} min={0} max={100} value={[kind==='move'?distance:kind==='slice'?refinement:sweep]} onValueChange={v=>{const n=Array.isArray(v)?v[0]:v;if(kind==='move')setDistance(n);else if(kind==='slice')setRefinement(n);else setSweep(n);}}/><span>{kind==='move'?'Move P':kind==='slice'?'Refine':'Add up'}</span></div></div>}
 <div className="ob-copy" key={page}><DialogTitle className="ob-title">{content.title}</DialogTitle><DialogDescription className="ob-description">{content.description}</DialogDescription>{kind==='law'?<Laws lede={false}/>:<><div className="ob-formula"><MathText tex={kind==='move'?String.raw`\text{geometry}\ \longrightarrow\ \mathbf E(P)`:kind==='slice'?String.raw`N\to\infty\qquad\Delta Q\to dQ`:String.raw`\mathbf E\approx\sum_i\Delta\mathbf E_i\quad\longrightarrow\quad\mathbf E=\int d\mathbf E`}/></div><p className="ob-hint">{content.hint}</p></>}</div>
 <div className="ob-footer"><div className="ob-dots" aria-label="Introduction pages">{pages.map((p,index)=><button key={p.id} className={index===page?'active':''} onClick={()=>setPage(index)} aria-label={`Introduction page ${index+1}`} aria-current={index===page?'step':undefined}/>)}</div><div className="ob-actions">{page>0?<Button variant="ghost" onClick={()=>setPage(page-1)} aria-label="Previous introduction page"><ArrowLeft size={16}/></Button>:<Button variant="ghost" onClick={()=>{setPage(0);onClose();}}>Skip intro</Button>}<Button onClick={()=>{if(last){setPage(0);onExplore?.();onClose();}else setPage(page+1);}}>{last?'Start exploring':'Continue'}<ArrowRight size={15}/></Button></div></div>
 </DialogContent></Dialog>;
}
