/* Inline SVG needs an image role for its accessible chart name; it cannot be replaced with an external img. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
'use client';
import {Fragment,useId,useMemo,useState,type ReactNode} from 'react';
import {Slider} from '@/components/ui/slider';
import type {Problem,ProblemId,Params,Limit} from '../problems/types';
import {pretty,sampleLimit,limitPlot,halfPieces,type LimitPlot,type LimitSample,type Vec} from '../symbolic/physics';
export {sampleLimit};
import {MathText} from './Math';
import {useRenderedWidth} from './useRenderedWidth';
const NOWRAP={whiteSpace:'nowrap'} as const;
const CHARGE={stroke:'var(--charge)',fill:'none',strokeLinecap:'round'} as const,RAIL={stroke:'var(--border)',strokeDasharray:'3 4',fill:'none'} as const;
/** P, and the field it feels at this point of the sweep: the direction of the lesson's own field,
 *  sign included, on the silhouette's axes (x right and y up; z to the right for the axial views,
 *  which lie on their side). The arrow keeps one length, except where the plotted field falls
 *  away, where `scale` shrinks it with it.
 *  `floor` is the top edge of a source drawn just under P, and `wall` the right-hand end of one
 *  drawn just to its left: an arrow pointing at it stops short of it. A negative half line's field
 *  at P points down onto the line, and drawn its full length it ran straight across the charge and
 *  out below it -- a field passing through the line. Where there is no room at all, as P reaches a
 *  negative rod's end, there is no arrow rather than one laid over the charge. */
function Observer({x,y,vector,axial=false,scale=1,floor,wall}:{x:number;y:number;vector?:Vec;axial?:boolean;scale?:number;floor?:number;wall?:number}){
 const sx=vector?(axial?vector.z:vector.x):0,sy=vector?(axial?0:-vector.y):0,m=Math.hypot(sx,sy),ux0=m>0?sx/m:0,uy0=m>0?sy/m:0;
 const len=Math.min(26*Math.min(1,scale),floor!==undefined&&uy0>0?(floor-y-uy0*7)/uy0:Infinity,wall!==undefined&&ux0<0?(x+ux0*7-wall)/-ux0:Infinity);
 const show=m>0&&Number.isFinite(m)&&len>2.5,ux=show?sx/m:0,uy=show?sy/m:0,bx=x+ux*7,by=y+uy*7,tx=bx+ux*len,ty=by+uy*len;
 return <g><circle cx={x} cy={y} r="4" fill="var(--foreground)"/>{show&&<g className="limit-arrow" data-dx={ux.toFixed(4)} data-dy={uy.toFixed(4)} stroke="var(--field)" strokeWidth="2" fill="none" strokeLinecap="round">
  <path d={`M${bx.toFixed(1)} ${by.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`}/>
  <path d={`M${(tx-ux*5-uy*3.5).toFixed(1)} ${(ty-uy*5+ux*3.5).toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${(tx-ux*5+uy*3.5).toFixed(1)} ${(ty-uy*5-ux*3.5).toFixed(1)}`}/></g>}</g>;
}
/** A rod and P drawn in the proportions the sweep is at, inside a frame `room` long beside the rod and
 *  `far` long out to P. THE THUMBNAIL CONTRADICTED ITS AXIS: at "L ∼ r" a rod being grown towards
 *  infinity was a three-pixel dot a hundred pixels from P, which is the point-charge picture, and
 *  even at L = 12r it was drawn shorter than r. Now the drawing is one scale throughout.
 *  · `far` (and the ramp's first moment): r = tL. While P fits, the rod keeps its length and P walks
 *    out; once P reaches the frame's end, P stays and the rod shrinks -- a camera pulling back.
 *  · `grow`: L = tr, with P a short way off. The rod outgrows the frame almost at once (most of
 *    the sweep has L ≫ r), and from then on it runs off both edges, `unbounded`, with its run-off
 *    marks. */
function rodScale(mode:Limit['mode'],t:number,room:number,far:number,near:number):{length:number;gap:number;unbounded:boolean}{
 if(mode==='far'||mode==='moment'){const gap=Math.min(far,room*t);return{length:gap/t,gap,unbounded:false};}
 if(mode==='infinite'){const length=near*t;return{length:Math.min(length,room+4),gap:near,unbounded:length>room};}
 return{length:room,gap:far,unbounded:false};
}
/** Silhouette of the geometry the plot above is actually sweeping: source in charge colour, P as a
 *  filled dot with the field it feels. Decorative -- every number is in the plot's aria-label and
 *  the table under it. */
function LimitFigure({id,mode,t,vector,scale,arrow}:{id:ProblemId;mode:Limit['mode'];t:number;vector?:Vec;scale:number;arrow:boolean}){
 const P=(x:number,y:number,axial=false,floor?:number,wall?:number)=><Observer x={x} y={y} vector={arrow?vector:undefined} axial={axial} scale={scale} floor={floor} wall={wall}/>;
 if(id==='bisector'||id==='infinite'){
  // The infinite line moving P away: the whole line, and P walking out from it -- along the plot's
  // own logarithmic axis, so P is where the dot on the curve is.
  if(mode==='scale'){const x=76+130*Math.log(t)/Math.log(30);return <><path d={`M64 25H${x}`} {...RAIL}/><path d="M64 -4V52" {...CHARGE} strokeWidth="7"/><path d="M57 6l14-4M57 44l14 4" {...CHARGE}/>{P(x,25)}</>}
  // Centred on P's level: the rod's whole length L against P's distance r, half above and half below.
  const {length,gap,unbounded}=rodScale(mode,t,42,134,30),h=Math.max(1.5,length/2);
  return <><path d={`M64 25H${64+gap-8}`} {...RAIL}/><path d={`M64 ${25-h}V${25+h}`} {...CHARGE} strokeWidth="7"/>{unbounded&&<path d="M57 6l14-4M57 44l14 4" {...CHARGE}/>}{P(64+gap,25)}</>}
 // On its own line: the rod's length L against the gap a. Far away the two share the frame's
 // length in the proportion a = tL; walking in, the rod keeps its length and the gap closes on it.
 if(id==='axial'){const w=mode==='near'?85:Math.max(4,170/(1+t)),x=mode==='near'?129+85/t:214;return <><path d={`M${44+w} 25H${x-8}`} {...RAIL}/><path d={`M44 25h${w}`} {...CHARGE} strokeWidth="7"/>{P(x,25,false,undefined,44+w+5)}</>}
 // The half line moving P away: P walks out along the plot's own logarithmic axis, as on the whole
 // line, so P is where the dot on the curve is. P STARTS A CLEAR GAP ABOVE THE LINE'S END. It began
 // at y = 32, its dot touching the line's 7-unit stroke (top edge 34.5) at the start of the sweep and
 // grazing it at the slider's default -- P drawn on the line, in a lesson about P a distance r above
 // its end. A negative line's arrow, which points down at the line, stops at its top edge.
 if(id==='semi'){const y=24-16*Math.log(t)/Math.log(30);return <><path d="M108 38H246" {...CHARGE} strokeWidth="7"/><path d="M238 31l9 7-9 7" {...CHARGE}/><path d={`M108 38V${y+6}`} {...RAIL}/>{P(108,y,false,33)}</>}
 if(id==='endpoint'||id==='ramp'){
  const {length,gap,unbounded}=rodScale(mode,t,32,94,24),h=Math.max(3,length);
  return <><path d={`M104 34H${104+gap-8}`} {...RAIL}/>
   {/* The ramp is a wedge: empty at the foot, widest at the top. */}
   {id==='ramp'?<path d={`M104 34L100 ${34-h}h8Z`} {...CHARGE} fill="var(--charge)" strokeWidth="1.5"/>:<path d={`M104 34V${34-h}`} {...CHARGE} strokeWidth="7"/>}
   {unbounded&&<path d="M97 12l7-6 7 6" {...CHARGE}/>}{P(104+gap,34)}</>}
 if(id==='arc'){
  // The field's half ring is drawn as the N point charges the plot is summing.
  if(mode==='half'){const n=halfPieces(t);return <>{Array.from({length:n},(_,i)=>{const s=-Math.PI/2+Math.PI*(i+.5)/n;return <circle key={i} cx={(152+17*Math.cos(s)).toFixed(1)} cy={(25-17*Math.sin(s)).toFixed(1)} r={n>16?1.6:2.3} fill="var(--charge)"/>})}{P(152,25)}</>}
  const a=mode==='full'?2*Math.PI*t/30:Math.PI,d=Array.from({length:49},(_,i)=>{const s=-a/2+a*i/48;return `${i?'L':'M'}${(152+17*Math.cos(s)).toFixed(1)},${(25-17*Math.sin(s)).toFixed(1)}`}).join(' ');
  return <><path d={d} {...CHARGE} strokeWidth="5"/>{P(152,25)}</>}
 // RING, DISK AND SHEET SHARE AN AXIAL VIEW, LAID ON ITS SIDE: the axis runs across the frame, the
 // source stands edge-on at its left, and P sits out along the axis. Drawn upright, P sat above the
 // source in a frame 48 units tall, and the field at P -- which lies along the axis -- ran off the
 // top: the thumbnail showed a dot and a tick. On its side the arrow has the frame's width.
 // Every case is drawn to its sweep's own scale, P's distance z against the radius R:
 //  · far, z = 2tR: the ring keeps its size while P walks out, then, once P reaches the frame's
 //    end, P stays and the ring shrinks -- the camera pulling back, as for the rods. (It was once
 //    drawn three times too close, and froze from t ≈ 8 while z/R ran on to sixty.)
 //  · the peak, z from the centre out to 3R; the centre, z falling to zero: R is held, P moves.
 //  · a disk grown into a sheet, R = tz: P is held and the disk outgrows the frame, running off
 //    both edges with its run-off marks, as a rod grown into a line does.
 //  · the sheet itself, z = t: P walks out from a plane that runs off both edges.
 const S=66,Y=24,filled=id!=='ring',FRAME=21;
 const [radius,gap]=mode==='far'?(g=>[Math.max(1.5,g/(2*t)),g])(Math.min(150,2*FRAME*t))
  :mode==='maximum'?[20,20*3*(t-1)/29]
  :mode==='center'?[20,20*(arrow?Math.SQRT1_2*(1-(t-1)/29):1-t/30)]
  :mode==='infinite'?[18*t,18]
  :[Infinity,5*t];
 // Seen almost edge-on, a disk is a narrow ellipse; once it is taller than the frame it is a band.
 const unbounded=radius>FRAME,rx=.28*Math.min(radius,FRAME);
 return <><path d={`M${S} ${Y}H${S+Math.max(gap,6)}`} {...RAIL}/>
  {unbounded
   ?<>{filled&&<rect x={S-rx} y="-4" width={2*rx} height="56" fill="color-mix(in srgb,var(--charge) 20%,transparent)"/>}<path d={filled?`M${S-rx} -4V52M${S+rx} -4V52`:`M${S} -4V52`} {...CHARGE} strokeWidth={filled?2.5:3}/><path d={`M${S-7} 8l7-6 7 6M${S-7} 40l7 6 7-6`} {...CHARGE}/></>
   :<ellipse cx={S} cy={Y} rx={rx} ry={radius} {...CHARGE} fill={filled?'color-mix(in srgb,var(--charge) 20%,transparent)':'none'} strokeWidth={filled?2.5:3.5}/>}
  {P(S+gap,Y,true)}</>
}
/** Room above and below a thumbnail's 48-unit frame, for the arrows that lean out of it. */
const THUMB_PAD:Partial<Record<ProblemId,[number,number]>>={semi:[18,4],endpoint:[0,20],ramp:[0,20]};
// The plot's frame, in the SVG's own units.
const X0=40,X1=452,TOP=34,BASE=165,WIDTH=480;
/** What the plotted curve is at one sample: the exact value over the reference, or, where the
 * reference is zero, the exact value over its largest on the sweep. A growth plot, or a law one,
 * draws the exact value itself, over the one constant both of its curves share. */
const twoCurves=(plot:LimitPlot)=>plot.kind==='growth'||plot.kind==='law';
const plotted=(plot:LimitPlot,s:LimitSample,largest:number)=>plot.kind==='decay'||twoCurves(plot)?s.actual/largest:s.target>0?s.actual/s.target:Infinity;
/** The vertical window. A ratio is drawn close up around its line at one -- the approach is the whole
 * story, and from zero it would be a few pixels of rise and then a flat line on top of the reference.
 * A start that runs off to infinity (a reference that is itself zero there) is cut at twice the line.
 * A level line drawn beside a field that falls to zero needs the whole height, down to the axis. */
function yWindow(plot:LimitPlot,values:number[]):[number,number]{
 if(plot.second||plot.kind==='decay'||plot.kind==='peak'||twoCurves(plot))return [0,1.08];
 if(plot.kind==='constant')return [.5,1.5];
 const finite=values.filter(Number.isFinite),lo=Math.min(1,...finite),hi=Math.min(2,Math.max(1,...finite)),pad=Math.max(hi-lo,.02)*.1;
 return [lo-pad,hi+pad];
}
/** A label with its Greek letters set in the face the formulas use. The sans face draws U+03C6 as the
 * stroked ϕ, while KaTeX and the slider set the curly φ: two glyphs for one angle in one card.
 * The list is written out, not var(--serif): that token reads a font variable that is not set
 * everywhere, and one unset variable voids the whole declaration -- back to the stroked ϕ. */
const GREEK={fontFamily:'KaTeX_Math, "Source Serif 4", Georgia, serif',fontStyle:'italic'} as const;
function Sym({text}:{text:string}):ReactNode{
 return text.split(/([α-ωΑ-Ω])/).map((part,i)=>i%2?<tspan key={i} className="comparison-sym" style={GREEK}>{part}</tspan>:<Fragment key={i}>{part}</Fragment>);
}
/** The same, for the caption under the plot, which is HTML: "at every ϕ" in the sans face sat
 * under an axis that names the curly φ. */
function SymText({text}:{text:string}):ReactNode{
 return text.split(/([α-ωΑ-Ω])/).map((part,i)=>i%2?<span key={i} className="comparison-sym" style={GREEK}>{part}</span>:<Fragment key={i}>{part}</Fragment>);
}
/** A limit's formula with its condition on a line of its own: "r ≫ L:" and, under it, the relation.
 * The condition is everything before the formula's first ":\quad", which is how every limit writes it.
 * Its colon is set as punctuation, \colon: TeX's ":" is a relation, spaced on both sides, and at the
 * end of a line it left "(λ fixed) :" with a gap before the colon. */
export function twoLines(tex:string):string{
 const at=tex.indexOf(':\\quad');
 return at<0?tex:String.raw`\begin{aligned}&${tex.slice(0,at)}\colon\\[0.15em]&\quad ${tex.slice(at+6).trim()}\end{aligned}`;
}
export function Assessment({problem,params,limit}:{problem:Problem;params:Params;limit:Limit}){
 const [s,setS]=useState(4),sliderLabel=useId();const scalar=problem.quantity==='V',qty=scalar?'potential':'field',units=scalar?'volts':'newtons per coulomb';
 const plot=useMemo(()=>limitPlot(problem,limit),[problem,limit]);
 // An approach to infinity, or to many pieces, is swept on a logarithmic axis: distance ten times the
 // size sits halfway, not a third of the way, and the approach gets the width of the plot.
 // A law is drawn on one too: doubling r is then one step of the same width wherever it is taken,
 // and each step halves the curve -- on a linear axis from one to thirty every halving after the
 // first crowded into the left tenth of the plot.
 // The half line's flat ratio is swept on one too, beside the whole line's law: its thumbnail's
 // arrow shrinks as 1/r, and that shrinking is spread evenly along the slider instead of spent in its
 // first tenth.
 const semi=problem.geometry==='semi'&&limit.mode==='scale';
 // EXCEPT A POTENTIAL THAT GROWS AS R. On a log axis the disk's V ∼ σR/(2ε₀), dashed and labelled
 // "grows as R", bent up like an exponential: the picture said the opposite of its label. Swept
 // linearly it is the straight line it is. The two logarithms keep the log axis, where a logarithm is
 // the straight line -- and every log axis now says it is one, or the rod's ln(L/r), drawn straight,
 // read as V growing in proportion to L.
 const linearGrowth=plot.kind==='growth'&&problem.geometry==='disk';
 const log=(limit.mode==='far'||limit.mode==='moment'||limit.mode==='infinite'||limit.mode==='near'||(limit.mode==='half'&&!scalar)||plot.kind==='law'||semi)&&!linearGrowth;
 const axisName=log?`${plot.axis} (log scale)`:plot.axis;
 const tAt=(i:number)=>log?30**(i/69):1+29*i/69,xAt=(u:number)=>X0+(log?Math.log(u)/Math.log(30):(u-1)/29)*(X1-X0);
 // The slider moves along the plot's own axis, so its thumb and the dot on the curve stay in step.
 const t=log?30**((s-1)/29):s;
 // Seventy samples of the sweep, some of them point-charge sums: worked out once per geometry, not per slider tick.
 const samples=useMemo(()=>Array.from({length:70},(_,i)=>sampleLimit(problem,params,limit,log?30**(i/69):1+29*i/69)),[problem,params,limit,log]);
 const val=useMemo(()=>sampleLimit(problem,params,limit,t),[problem,params,limit,t]);
 // A growth plot shares one constant between its two curves -- the larger of their end values -- so
 // neither is stretched to look like the other and both stay inside the window.
 const growth=plot.kind==='growth',shared=twoCurves(plot),largest=Math.max(...samples.map(s=>shared?Math.max(s.actual,s.target):s.actual),Number.MIN_VALUE),values=samples.map(s=>plotted(plot,s,largest));
 // The field drawn beside a potential, or the point charge's fall beside the line's, scaled to its
 // own largest on the sweep.
 const largestSecond=Math.max(...samples.map(s=>s.second??0),Number.MIN_VALUE),second=plot.second?samples.map(s=>(s.second??0)/largestSecond):null;
 const [lo,hi]=yWindow(plot,values),reference=plot.kind==='decay'?0:1;
 // Type held at about ten pixels however narrow the plot is drawn. Once it has grown, the axis name
 // takes a row of its own under the two end labels, which it would otherwise run into.
 const [svgRef,width]=useRenderedWidth(WIDTH),grow=Math.max(1,10*WIDTH/(10.5*width)),size=(n:number)=>({fontSize:`${(n*grow).toFixed(2)}px`});
 const stacked=grow>1.05,axisY=stacked?193+13*grow:193,height=stacked?Math.ceil(axisY+4*grow):205;
 // On a phone the card is under four hundred pixels wide, and a formula with a condition before it --
 // "L → ∞ (λ fixed): V ∼ 2kλ ln(L/r), |V| → ∞" -- ran past its edge, the rest behind a sideways scroll no
 // one finds: the rod's potential read "|V| →" with no ∞. There the condition takes a line of its own
 // and the relation is set under it, indented, as a book sets "For L → ∞:" before its result.
 const formula=width<460?twoLines(limit.formula):limit.formula;
 // Past the top of the window the curve runs out of the plot, clipped, rather than along its edge.
 const yAt=(v:number)=>BASE-(Math.min(Math.max(Number.isFinite(v)?v:3*hi,lo),3*hi)-lo)/(hi-lo)*(BASE-TOP),clip='limit-clip-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const trace=(vs:number[])=>vs.map((v,i)=>`${i?'L':'M'}${xAt(tAt(i)).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
 const path=trace(values),guide=shared?samples.map(s=>s.target/largest):null;
 // A level line is named at its right end, except a decay's: that comes down onto its line at the
 // right, so it is named at the left, where the curve is high above it. The growth law is a curve,
 // not a level, so its name sits beside it a little past the middle, on the side away from the
 // exact curve: below it where the exact value runs above, above it where the exact value runs under.
 // A law falls, and its exact curve lies on it, so neither side of it is clear by the middle: there
 // the ghost runs just under it. Its name goes early and above, to the right, in the open corner a
 // falling curve leaves.
 const law=plot.kind==='law',named=guide?Math.round(samples.length*(law?.3:.55)):0,under=guide&&!law?guide[named]<values[named]:false;
 const lineLabel:{x:number;y:number;anchor:'start'|'end'}=guide
  ?law?{x:xAt(tAt(named))+10,y:yAt(guide[named])-10,anchor:'start'}
  :{x:xAt(tAt(named))+(under?6:-6),y:yAt(guide[named])+(under?15:-7),anchor:under?'start':'end'}
  :{x:plot.kind==='decay'?X0+8:X1,y:yAt(reference)-7,anchor:plot.kind==='decay'?'start':'end'};
 // The thumbnail's frame is 48 units tall. Where P's arrow leans out of it -- up and to the left
 // above a half line's end, down and away beside a rod standing on P's level -- the frame grows by
 // just that much, at the same scale, rather than cutting the arrow off at its edge.
 const arrow=!scalar||!!second,pad=arrow?THUMB_PAD[problem.geometry]??[0,0]:[0,0];
 // The thumbnail's arrow is the field: beside a potential that is the second curve; on a law, the
 // exact curve itself, shrinking as P walks out.
 const here=plotted(plot,val,largest),secondHere=second?(val.second??0)/largestSecond:0;
 // The half line's curve is a ratio, flat by design, but the field it is a ratio of halves as r
 // doubles: the arrow carries that, or nothing on the card shrinks under "doubling r halves each".
 const scale=second&&scalar?secondHere:plot.kind==='decay'||law||semi?val.actual/largest:plot.kind==='peak'?val.actual/val.target:1;
 // Where r has doubled on a law's plot, a level tick on the curve: each one half the height of the last.
 const atMarks=useMemo(()=>plot.kind==='law'?(plot.marks??[]).map(m=>sampleLimit(problem,params,limit,m.t).actual):[],[plot,problem,params,limit]),levels=atMarks.map(v=>v/largest);
 // What the plot's two numbers are, for a screen reader: on the half line they are its two components.
 const [exactName,referenceName]=semi?['|Eₓ|','|Eᵧ|']:[`Exact ${qty}`,growth?'growth law':'reference'];
 return <div className="assessment"><MathText tex={formula} block/>
 {/* Whole items wrap: at phone width each wrapped inside itself, "added / up", and the last one's
     dot was left alone on a line above its words. */}
 <div className="comparison-labels" style={{flexWrap:'wrap',rowGap:4}}><span style={NOWRAP}><i className="legend-dot field"/>{plot.solid??`Your exact ${qty}`}</span>{plot.second&&<span style={NOWRAP}><i className="legend-dot" style={{background:'var(--ghost)'}}/>{plot.second}</span>}<span style={NOWRAP}><i className="legend-dot"/>{/^[a-z]{2,}/.test(plot.line)?plot.line[0].toUpperCase()+plot.line.slice(1):plot.line}</span></div>
 <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${height}`} className="comparison-plot" role="img" data-kind={plot.kind} aria-label={`${scalar?'Electric potential':'Electric field'} comparison for ${limit.title}: ${plot.y}, against ${axisName} from ${plot.from} to ${plot.to}. ${exactName} ${pretty(val.actual)} ${units}, ${referenceName} ${pretty(val.target)}${semi?' '+units:''}.`}>
  <path d={`M${X0} ${TOP-8}V${BASE}H${X1+5}`} stroke="var(--ghost)" fill="none"/>
  {(plot.marks??[]).map(m=><g key={m.t} className="comparison-mark"><line x1={xAt(m.t)} x2={xAt(m.t)} y1={TOP} y2={BASE} stroke="var(--border)" strokeDasharray="2 4"/>{m.label&&<text x={xAt(m.t)} y="179" textAnchor="middle" style={size(10.5)}>{m.label}</text>}</g>)}
  <text x={lineLabel.x} y={lineLabel.y} textAnchor={lineLabel.anchor} className="comparison-line" style={size(10.5)}><Sym text={plot.line}/></text>
  <clipPath id={clip}><rect x={X0} y={TOP-6} width={X1-X0+6} height={BASE-TOP+8}/></clipPath>
  {/* A stem from the axis up to the curve at each doubling: side by side, each is half the last. A
      tick on the curve itself sat on a line of its own colour and read as a kink in it. */}
  {levels.map((v,i)=><line key={i} className="comparison-level" x1={xAt(plot.marks![i].t)} x2={xAt(plot.marks![i].t)} y1={BASE} y2={yAt(v)} stroke="var(--field)" strokeOpacity=".45" strokeWidth="3"/>)}
  {second&&<path d={trace(second)} className="comparison-second" clipPath={`url(#${clip})`} stroke="var(--ghost)" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>}
  <path d={path} clipPath={`url(#${clip})`} stroke="var(--field)" strokeWidth="2.7" fill="none" strokeLinejoin="round"/>
  {/* The reference, level line or growth law, is drawn over the exact curve: where the two run
      together its dashes stay visible on top. Under it, a flat case's dashes sat beneath the solid
      line the whole way across, and "stays on the dashed line" pointed at a line no one could see. */}
  {!guide&&<line className="comparison-reference" x1={X0} x2={X1} y1={yAt(reference)} y2={yAt(reference)} stroke="var(--charge)" strokeWidth="2" strokeDasharray="6 4"/>}
  {guide&&<path d={trace(guide)} className="comparison-guide" clipPath={`url(#${clip})`} stroke="var(--charge)" strokeWidth="2" strokeDasharray="6 4" fill="none" strokeLinejoin="round"/>}
  {second&&<circle cx={xAt(t)} cy={yAt(secondHere)} r="4" fill="var(--ghost)" clipPath={`url(#${clip})`}/>}
  <circle cx={xAt(t)} cy={yAt(here)} r="5" fill="var(--field)" clipPath={`url(#${clip})`}/>
  <text x="7" y="17" className="comparison-y" style={size(11.5)}><Sym text={plot.y}/></text>
  <text x={X0} y="193" className="comparison-end" style={size(10.5)}><Sym text={plot.from}/></text><text x={X1} y="193" textAnchor="end" className="comparison-end" style={size(10.5)}><Sym text={plot.to}/></text>
  <text x={(X0+X1)/2} y={axisY} textAnchor="middle" className="comparison-axis" style={size(10.5)}><Sym text={axisName}/></text>
 </svg>
 {/* A table box sizes to its content whatever width it is given, so sr-only's one pixel did not hold
     it: it laid out five hundred pixels wide and a phone page scrolled sideways as soon as Limiting
     cases opened. The block around it does honour one pixel and hidden overflow, and clips it. */}
 <div className="sr-only"><table className="sr-only"><caption>{limit.title}: {semi?'|Eₓ| versus |Eᵧ|':`exact ${qty} versus reference`}</caption><thead><tr><th scope="col">t</th><th scope="col">{semi?'|Eₓ|':'exact'}</th><th scope="col">{semi?'|Eᵧ|':'reference'}</th></tr></thead><tbody>{samples.map((s,i)=><tr key={i}><td>{tAt(i)}</td><td>{s.actual}</td><td>{s.target}</td></tr>)}</tbody></table></div>
 <div className="limit-mini" aria-hidden="true"><svg viewBox={`0 ${-pad[0]} 260 ${48+pad[0]+pad[1]}`} style={pad[0]+pad[1]?{height:`${(44+(pad[0]+pad[1])*200/260).toFixed(1)}px`}:undefined}><LimitFigure id={problem.geometry} mode={limit.mode} t={t} vector={val.vector} scale={scale} arrow={arrow}/></svg></div>
 {/* aria-label on the slider lands on its group, not on the range input a keyboard reaches: the
     input is named by pointing at a hidden label, as the page's own sliders are. */}
 <span id={sliderLabel} className="sr-only">Explore limiting case</span>
 <Slider aria-label="Explore limiting case" aria-labelledby={sliderLabel} min={1} max={30} step={.1} value={[s]} onValueChange={v=>setS((v as number[])[0])}/>
 <p className="numerical-check"><SymText text={plot.caption}/></p></div>;
}
