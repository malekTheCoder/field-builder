/* Inline SVG needs an image role for its accessible chart name; it cannot be replaced with an external img. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
'use client';
import {Fragment,memo,useDeferredValue,useId,useMemo,useState,type KeyboardEvent,type PointerEvent,type ReactNode} from 'react';
import {Slider} from '@/components/ui/slider';
import type {Problem,ProblemId,Params,Limit} from '../problems/types';
import {pretty,sampleLimit,limitPlot,halfPieces,RING_PEAK_T,type LimitPlot,type LimitSample,type Vec} from '../symbolic/physics';
export {sampleLimit};
import {MathText} from './Math';
import {useRenderedWidth} from './useRenderedWidth';
const NOWRAP={whiteSpace:'nowrap'} as const;
const CHARGE={stroke:'var(--charge)',fill:'none',strokeLinecap:'round'} as const,RAIL={stroke:'var(--border)',strokeDasharray:'3 4',fill:'none'} as const;
/** P, and the field it feels at this point of the sweep: the direction of the lesson's own field,
 *  sign included, on the silhouette's axes (x right and y up; z to the right for the axial views,
 *  which lie on their side). The arrow keeps one length, except where the plotted field falls
 *  away, where `scale` shrinks it with it.
 *  `floor` is the top edge of a source drawn just under P, `wall` the right-hand edge of one drawn to
 *  its left and `right` the left-hand edge of one drawn to its right: an arrow pointing at it stops
 *  short of it. A negative source's field at P points at the source, and drawn its full length it ran
 *  straight across the charge -- a field passing through its own source. That was stopped for the half
 *  line and the rod on its axis only; twelve of thirty thumbnails still drew it, across the rod on the
 *  bisector and the infinite line, onto the rod level with an end, through the ring, the disk and the
 *  sheet, and over the arc -- where, at one piece, the arrow covered the lone point charge the plot is
 *  building. Every source now says where its near edge is.
 *  Where there is no room at all, as P reaches a negative rod's end, there is no arrow rather than one
 *  laid over the charge; and a stopped arrow too short to show a shaft before its head is left out
 *  too, rather than drawn as a lone head beside P. */
const BLOCKED_MIN=6;
function Observer({x,y,vector,axial=false,scale=1,floor,wall,right}:{x:number;y:number;vector?:Vec;axial?:boolean;scale?:number;floor?:number;wall?:number;right?:number}){
 const sx=vector?(axial?vector.z:vector.x):0,sy=vector?(axial?0:-vector.y):0,m=Math.hypot(sx,sy),ux0=m>0?sx/m:0,uy0=m>0?sy/m:0;
 const free=26*Math.min(1,scale),len=Math.min(free,floor!==undefined&&uy0>0?(floor-y-uy0*7)/uy0:Infinity,wall!==undefined&&ux0<0?(x+ux0*7-wall)/-ux0:Infinity,right!==undefined&&ux0>0?(right-x-ux0*7)/ux0:Infinity);
 const show=m>0&&Number.isFinite(m)&&len>(len<free?BLOCKED_MIN:2.5),ux=show?sx/m:0,uy=show?sy/m:0,bx=x+ux*7,by=y+uy*7,tx=bx+ux*len,ty=by+uy*len;
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
 const P=(x:number,y:number,axial=false,floor?:number,wall?:number,right?:number)=><Observer x={x} y={y} vector={arrow?vector:undefined} axial={axial} scale={scale} floor={floor} wall={wall} right={right}/>;
 // A stopped arrow keeps this much clear of the charge's edge: touching it, the head read as part of it.
 const CLEAR=2.5;
 if(id==='bisector'||id==='infinite'){
  // The infinite line moving P away: the whole line, and P walking out from it -- along the plot's
  // own logarithmic axis, so P is where the dot on the curve is.
  if(mode==='scale'){const x=76+130*Math.log(t)/Math.log(30);return <><path d={`M64 25H${x}`} {...RAIL}/><path d="M64 -4V52" {...CHARGE} strokeWidth="7"/><path d="M57 6l14-4M57 44l14 4" {...CHARGE}/>{P(x,25,false,undefined,64+3.5+CLEAR)}</>}
  // Centred on P's level: the rod's whole length L against P's distance r, half above and half below.
  const {length,gap,unbounded}=rodScale(mode,t,42,134,30),h=Math.max(1.5,length/2);
  return <><path d={`M64 25H${64+gap-8}`} {...RAIL}/><path d={`M64 ${25-h}V${25+h}`} {...CHARGE} strokeWidth="7"/>{unbounded&&<path d="M57 6l14-4M57 44l14 4" {...CHARGE}/>}{P(64+gap,25,false,undefined,64+3.5+CLEAR)}</>}
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
   {unbounded&&<path d="M97 12l7-6 7 6" {...CHARGE}/>}{P(104+gap,34,false,undefined,(id==='ramp'?108.75:107.5)+CLEAR)}</>}
 if(id==='arc'){
  // A negative arc's field at its centre points at the arc. At a radius of 17 a stopped arrow had no room
  // between P's dot and the arc's inner edge; at 20.5 it has a short shaft, and the arc still fits the
  // frame's 48 units with its stroke.
  const R=20.5,inner=152+R-2.5-CLEAR;
  // The field's half ring is drawn as the N point charges the plot is summing.
  if(mode==='half'){const n=halfPieces(t);return <>{Array.from({length:n},(_,i)=>{const s=-Math.PI/2+Math.PI*(i+.5)/n;return <circle key={i} cx={(152+R*Math.cos(s)).toFixed(1)} cy={(25-R*Math.sin(s)).toFixed(1)} r={n>16?1.6:2.3} fill="var(--charge)"/>})}{P(152,25,false,undefined,undefined,inner)}</>}
  const a=mode==='full'?2*Math.PI*t/30:Math.PI,d=Array.from({length:49},(_,i)=>{const s=-a/2+a*i/48;return `${i?'L':'M'}${(152+R*Math.cos(s)).toFixed(1)},${(25-R*Math.sin(s)).toFixed(1)}`}).join(' ');
  return <><path d={d} {...CHARGE} strokeWidth="5"/>{P(152,25,false,undefined,undefined,inner)}</>}
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
 // The source's near edge on the axis: its ellipse's (or band's) right-hand side, half its stroke out.
 const edge=unbounded&&!filled?S+1.5:S+rx+(filled?1.25:1.75);
 return <><path d={`M${S} ${Y}H${S+Math.max(gap,6)}`} {...RAIL}/>
  {unbounded
   ?<>{filled&&<rect x={S-rx} y="-4" width={2*rx} height="56" fill="color-mix(in srgb,var(--charge) 20%,transparent)"/>}<path d={filled?`M${S-rx} -4V52M${S+rx} -4V52`:`M${S} -4V52`} {...CHARGE} strokeWidth={filled?2.5:3}/><path d={`M${S-7} 8l7-6 7 6M${S-7} 40l7 6 7-6`} {...CHARGE}/></>
   :<ellipse cx={S} cy={Y} rx={rx} ry={radius} {...CHARGE} fill={filled?'color-mix(in srgb,var(--charge) 20%,transparent)':'none'} strokeWidth={filled?2.5:3.5}/>}
  {P(S+gap,Y,true,undefined,edge+CLEAR)}</>
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
/** The slider's range, and where a point on the plot's x axis falls on it. Both axes, log and linear,
 * put the slider's s at the same fraction (s − 1)/29 of the plot's width, so a pointer's x converts
 * straight to s. Held to the slider's own step, so the two always agree. */
const S_MIN=1,S_MAX=30,snap=(v:number)=>Math.round(Math.min(S_MAX,Math.max(S_MIN,v))*10)/10;
/** Where the scrub reads as having arrived. A ratio within a hundredth of its line lies on it to the
 * eye at any window the plot draws; one more than a twentieth off is plainly not there yet. A falling
 * field is "zero" a fiftieth of its largest from the axis. */
const ARRIVED=.01,APART=.05,ZERO=.02;
type Moment='start'|'middle'|'end';
/** What the source is called in a sentence. */
const SOURCE:Record<ProblemId,string>={bisector:'rod',axial:'rod',endpoint:'rod',ramp:'rod',ring:'ring',disk:'disk',arc:'arc',infinite:'line',semi:'half line',sheet:'sheet'} as Record<ProblemId,string>;
/** ONE SENTENCE FOR WHERE THE SCRUB IS, in words and symbols only. The caption under the card says how
 * to read the whole plot; this says what is true at the dot -- close in, on the way, or arrived -- so
 * dragging along the curve reads as the argument it is: "close up the rod's size still shows", "far
 * away it looks like a point charge". Where the curve converges on its line, which of the three it is
 * comes from the plotted values themselves, and so does "weaker" or "stronger": nothing here claims an
 * arrival the curve has not made. A law, a level line and a growth are read by where along the sweep
 * the dot is; the ring's peak by whether the dot is on it.
 * `here` is the curve's plotted value at the dot, `t` the sweep's own position, `u` how far along the
 * slider it is, from nought to one, and `gap` how far apart, in the plot's units, the dot and the line
 * are drawn: a curve within a hundredth of its line can still sit visibly off it in a window drawn
 * close around the approach, and "lies on the dashed line" is said only where it does. */
export function limitNow(problem:Problem,limit:Limit,plot:LimitPlot,here:number,t:number,u:number,gap=0):string{
 const g=problem.geometry,scalar=problem.quantity==='V',src=SOURCE[g]??'charge',qty=scalar?'potential':'field';
 const cmp=(than:string)=>scalar?`${here<1?'smaller':'larger'} than ${than}`:`${here<1?'weaker':'stronger'} than ${than}`;
 const along:Moment=u<.25?'start':u>.75?'end':'middle';
 const off=plot.kind==='decay'?here:Number.isFinite(here)?Math.abs(here-1):Infinity;
 // Not arrived, the start holds while the curve is plainly apart from its line, and never past the
 // middle of the sweep: from there on the approach is under way, however slow.
 const converged:Moment=plot.kind==='decay'?(here<ZERO?'end':here>.85?'start':'middle'):off<ARRIVED&&gap<3?'end':u<.2||(off>=APART&&u<.5)?'start':'middle';
 const pick=(m:Moment,[a,b,c]:[string,string,string])=>m==='start'?a:m==='middle'?b:c;
 switch(limit.mode){
  case 'far':return pick(converged,[
   `Close in, the ${src}’s size still shows: its ${qty} is ${cmp('a point charge’s')}.`,
   `Farther out, the ${src} looks more and more like a point charge: the curve is closing on the dashed line.`,
   `Far away, the ${src} looks like a point charge: the curve lies on the dashed line.`]);
  case 'moment':return pick(converged,[
   `Close in, how the rod’s charge is spread still shows: its vertical field is ${cmp('the first-moment field')}.`,
   'Farther out, how the charge is spread matters less and less: the curve is closing on the dashed line.',
   'Far away, only the rod’s charge and its centre of charge matter: the vertical field is the first-moment field.']);
  case 'infinite':{
   const disk=g==='disk'||g==='sheet',grown=disk?'disk':'rod',big=disk?'Wider and wider':'Longer and longer',ideal=disk?'an infinite sheet':g==='endpoint'?'a semi-infinite line':'an infinite line';
   if(scalar)return pick(along,[
    `A ${disk?'small disk':'short rod'}: V and its dashed growth law have only begun to climb.`,
    `As the ${grown} grows, V keeps growing, and so does the law beside it.`,
    `However ${disk?'wide':'long'} the ${grown} grows, V keeps growing in step with its law: there is no limit to settle on.`]);
   return pick(converged,[
    `Still finite, the ${grown}’s field at P is ${cmp(ideal+'’s')}.`,
    `${big}, the ${grown} looks more and more like ${ideal} from P: its distant parts add less and less.`,
    `${disk?'Wide':'Long'} enough, the ${grown} looks like ${ideal} from P: the curve lies on the dashed line.`]);}
  case 'center':
   if(scalar)return pick(converged,[
    `Up the axis, P is farther from every piece: the potential is ${here<1?'below':'above'} its centre value.`,
    'Coming down, P nears every piece at once: the potential climbs towards its centre value.',
    g==='disk'?'At the centre the curve meets the dashed line, finite but still sloping: just above the disk the field is not zero.'
     :'Near the centre the curve meets the dashed line, finite and level: at the centre the field is zero.']);
   return pick(converged,[
    'Near the peak, the parts of the pieces’ fields along the axis add up.',
    'Coming down, more of each piece’s field lies in the ring’s plane, where its partner opposite cancels it; the part along the axis shrinks.',
    'At the centre every piece’s field lies in the ring’s plane and is cancelled by its partner opposite: the field is zero.']);
  case 'near':
   if(scalar)return pick(along,[
    'Out near a ∼ L, V and k|λ| ln(L/a) are still apart.',
    'Walking in, both grow, and the gap between them closes.',
    'Close up, the charge at the rod’s near end dominates: V and k|λ| ln(L/a) grow without end, together.']);
   return pick(converged,[
    `The rod’s far end is still close enough to show: with no charge beyond it, the field is ${cmp('k|λ|/a')}.`,
    'Walking in, the rod looks more and more like a half line from P: its far end counts for less and less.',
    'Close up, the rod looks like a half line from P: the far end no longer matters.']);
  case 'maximum':return here>.98?'At the marked peak, inside z = R: the field on the axis is as strong as it gets.'
   :t<RING_PEAK_T?(here<.5?'Near the centre the pieces’ fields mostly cancel: the field on the axis is weak.':'Rising towards the peak: the pieces’ fields lean out of the ring’s plane, so less of each cancels.')
   :'Past the peak, P is moving away from every piece: the field weakens again.';
  case 'full':
   if(scalar)return pick(along,[
    'Every piece is the same distance R from the centre, so the potential is kQ/R.',
    'Opening the arc moves no piece nearer or farther: the potential holds while the field falls.',
    'Closing towards a full circle: the potential is still kQ/R, while the field at the centre falls towards zero.']);
   return pick(converged,[
    'A narrow arc’s pieces’ fields point much the same way, so they mostly add.',
    'Opening the arc spreads its pieces’ fields in direction: more and more of them cancel.',
    'Closed into a full circle, every piece is cancelled by the one opposite: the field at the centre is zero.']);
  case 'half':return pick(converged,[
   `Few pieces: their sum is ${cmp('the integral')}.`,
   'More pieces: the sum is closing on the integral.',
   'Many pieces: the sum lies on the integral.']);
  case 'scale':
   if(g==='sheet')return pick(along,[
    'Close to the sheet, the field is the sheet field.',
    'Farther up, still the same field: the sheet runs on past any distance.',
    'Far above, still the same field: an infinite sheet has no size to look small against.']);
   if(g==='infinite')return pick(along,[
    'Close to the line the field is strong, and it falls as r grows.',
    'Double r and the field halves; a point charge’s would drop to a quarter.',
    'Far out the field still only halves with each doubling of r: an infinite line never shrinks to a point charge.']);
   return pick(along,[
    'Near the line’s end, the two parts are already equal: the field leans halfway between their two directions.',
    'Farther out, the arrow at P shortens but does not turn: the two parts stay equal.',
    'Far out, the same direction, only weaker: a half line has no size to look small against.']);
 }
}
function AssessmentView({problem,params:live,limit}:{problem:Problem;params:Params;limit:Limit}){
 // A parameter drag on the figure re-renders the page many times a second, and this card sums seventy
 // samples of the sweep for each new set of parameters. They follow at React's low priority, so the
 // figure's drag is never held up by a plot further down the page.
 const params=useDeferredValue(live);
 const [s,setS]=useState(4),[scrubbing,setScrubbing]=useState(false),sliderLabel=useId(),nowId=useId();const scalar=problem.quantity==='V',qty=scalar?'potential':'field',units=scalar?'volts':'newtons per coulomb';
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
 // And on a desktop the colon is punctuation. KaTeX sets a bare ":" as a relation, a thick space either
 // side, so every condition on a projector read "a ≪ L :", "(σ fixed) :", "r > 0 :" -- the panel's own
 // bounds, and twoLines here, write \colon. The strings keep ":\quad", which twoLines and the
 // formula-tail parser both find.
 const formula=width<460?twoLines(limit.formula):limit.formula.replace(':\\quad','\\colon\\quad');
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
 // THE PLOT IS THE CONTROL. Press anywhere on it and the dot comes to that point of the sweep; drag
 // and it follows, the slider under it in step; with a mouse it follows the pointer without a press.
 // Focused, the arrow keys walk it, Shift or Page for a tenth of the sweep at a time.
 // On a touch screen a sideways drag scrubs and an upward one still scrolls the page.
 // The handle lies over the plot; the plot's own matrix turns a pointer's x into the SVG's units.
 const sAt=(handle:HTMLElement,clientX:number)=>{const m=handle.parentElement?.querySelector<SVGSVGElement>('svg.comparison-plot')?.getScreenCTM();return m&&m.a?snap(S_MIN+(S_MAX-S_MIN)*((clientX-m.e)/m.a-X0)/(X1-X0)):s;};
 const press=(e:PointerEvent<HTMLDivElement>)=>{if(e.button!==0)return;
  // A pointer the browser no longer tracks cannot be captured; the press still moves the dot.
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* no live pointer */}
  setScrubbing(true);setS(sAt(e.currentTarget,e.clientX));};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(scrubbing||e.pointerType==='mouse')setS(sAt(e.currentTarget,e.clientX));};
 const release=(e:PointerEvent<HTMLDivElement>)=>{if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setScrubbing(false);};
 const key=(e:KeyboardEvent<HTMLDivElement>)=>{
  const fine=.5,coarse=(S_MAX-S_MIN)/10,step=e.shiftKey?coarse:fine;
  const next=e.key==='ArrowRight'||e.key==='ArrowUp'?s+step:e.key==='ArrowLeft'||e.key==='ArrowDown'?s-step:e.key==='PageUp'?s+coarse:e.key==='PageDown'?s-coarse:e.key==='Home'?S_MIN:e.key==='End'?S_MAX:null;
  if(next===null)return;
  e.preventDefault();setS(snap(next));
 };
 // What the curve is compared with, at each sample and at the dot: its level line, or the near rod's
 // growth law. ONLY WHERE THE GAP IS THE LESSON. A ratio, and the rod's V against k|λ| ln(L/a), close on
 // their lines, and the room between is what a limit removes. Elsewhere a gap says something false:
 // under a field falling to zero the "gap" is the area under |E|, which reads as a potential difference;
 // the line's law against its point-charge ghost is a lens that narrows to the right, the opposite of
 // "never shrinks to a point charge"; the rod and disk grown without end share one scale, so their gap
 // reads as an arrival that never comes; and the ring's peak is touched once, not approached.
 // A level case keeps its ring on the line, under the dot that lies on it.
 const refHere=guide?val.target/largest:reference;
 const dotX=xAt(t),dotY=yAt(here),refY=yAt(refHere);
 const compares=plot.kind==='ratio'||plot.kind==='constant'||(growth&&limit.mode==='near'),gapShown=compares&&Math.abs(refY-dotY)>4;
 const gapArea=plot.kind!=='ratio'&&!(growth&&limit.mode==='near')?null:(()=>{
  const ref=values.map((_,i)=>guide?guide[i]:reference),widest=Math.max(...values.map((v,i)=>Math.abs(yAt(v)-yAt(ref[i]))));
  if(widest<2)return null;
  const back=ref.map((v,i)=>`L${xAt(tAt(i)).toFixed(1)},${yAt(v).toFixed(1)}`).reverse().join(' ');
  return `${path} ${back} Z`;
 })();
 const now=limitNow(problem,limit,plot,here,t,(s-S_MIN)/(S_MAX-S_MIN),Math.abs(refY-dotY));
 const [exactName,referenceName]=semi?['|Eₓ|','|Eᵧ|']:[`Exact ${qty}`,growth?'growth law':'reference'];
 return <div className="assessment"><MathText tex={formula} block/>
 {/* Whole items wrap: at phone width each wrapped inside itself, "added / up", and the last one's
     dot was left alone on a line above its words. */}
 <div className="comparison-labels" style={{flexWrap:'wrap',rowGap:4}}><span style={NOWRAP}><i className="legend-dot field"/>{plot.solid??`The exact ${qty}`}</span>{plot.second&&<span style={NOWRAP}><i className="legend-dot" style={{background:'var(--ghost)'}}/>{plot.second}</span>}<span style={NOWRAP}><i className="legend-dot"/>{/^[a-z]{2,}/.test(plot.line)?plot.line[0].toUpperCase()+plot.line.slice(1):plot.line}</span></div>
 {/* The plot stays an image with its numbers in its name; the hand that moves it is a slider laid over
     it, named for what it does and voicing the sentence under the thumbnail as its value. */}
 <div className="comparison-scrub" data-scrubbing={scrubbing||undefined} style={{position:'relative',maxWidth:560}}>
 <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${height}`} className="comparison-plot" role="img" data-kind={plot.kind} aria-describedby={nowId}
  aria-label={`${scalar?'Electric potential':'Electric field'} comparison for ${limit.title}: ${plot.y}, against ${axisName} from ${plot.from} to ${plot.to}. ${exactName} ${pretty(val.actual)} ${units}, ${referenceName} ${pretty(val.target)}${semi?' '+units:''}.`}>
  <path d={`M${X0} ${TOP-8}V${BASE}H${X1+5}`} stroke="var(--ghost)" fill="none"/>
  {(plot.marks??[]).map(m=><g key={m.t} className="comparison-mark"><line x1={xAt(m.t)} x2={xAt(m.t)} y1={TOP} y2={BASE} stroke="var(--border)" strokeDasharray="2 4"/>{m.label&&<text x={xAt(m.t)} y="179" textAnchor="middle" style={size(10.5)}>{m.label}</text>}</g>)}
  <text x={lineLabel.x} y={lineLabel.y} textAnchor={lineLabel.anchor} className="comparison-line" style={size(10.5)}><Sym text={plot.line}/></text>
  <clipPath id={clip}><rect x={X0} y={TOP-6} width={X1-X0+6} height={BASE-TOP+8}/></clipPath>
  {/* THE GAP, SHADED. What the card compares is the room between the curve and what it is compared
      with: tinted along the whole sweep, it is wide where the source's shape still shows and closes
      to nothing where the limit has arrived. */}
  {gapArea&&<path className="comparison-gap-area" d={gapArea} clipPath={`url(#${clip})`} fill="color-mix(in srgb,var(--field) 11%,transparent)"/>}
  {/* Where the dot is, a hairline across the plot: the reader scrubs along it. */}
  <line className="comparison-cursor" x1={dotX} x2={dotX} y1={TOP-6} y2={BASE} stroke="var(--foreground)" strokeOpacity={scrubbing?.32:.16} strokeWidth="1"/>
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
  {/* At the dot, the gap itself: a bracket from the curve to the line, and a ring where the line is. */}
  {gapShown&&<path className="comparison-gap" d={`M${dotX-3.5} ${dotY.toFixed(1)}h7M${dotX} ${dotY.toFixed(1)}V${refY.toFixed(1)}M${dotX-3.5} ${refY.toFixed(1)}h7`} stroke="var(--foreground)" strokeOpacity=".62" strokeWidth="1.6" fill="none" clipPath={`url(#${clip})`}/>}
  {compares&&<circle className="comparison-on-line" cx={dotX} cy={refY} r="4" fill="var(--diagram)" stroke="var(--charge)" strokeWidth="2" clipPath={`url(#${clip})`}/>}
  {second&&<circle cx={xAt(t)} cy={yAt(secondHere)} r="4" fill="var(--ghost)" clipPath={`url(#${clip})`}/>}
  <circle className="comparison-dot" cx={dotX} cy={dotY} r={scrubbing?6.5:5.5} fill="var(--field)" stroke="var(--diagram)" strokeWidth="2" clipPath={`url(#${clip})`}/>
  <text x="7" y="17" className="comparison-y" style={size(11.5)}><Sym text={plot.y}/></text>
  <text x={X0} y="193" className="comparison-end" style={size(10.5)}><Sym text={plot.from}/></text><text x={X1} y="193" textAnchor="end" className="comparison-end" style={size(10.5)}><Sym text={plot.to}/></text>
  <text x={(X0+X1)/2} y={axisY} textAnchor="middle" className="comparison-axis" style={size(10.5)}><Sym text={axisName}/></text>
 </svg>
 <div className="comparison-handle" role="slider" tabIndex={0} aria-label="Move along the plot" aria-orientation="horizontal"
  aria-valuemin={S_MIN} aria-valuemax={S_MAX} aria-valuenow={s} aria-valuetext={now}
  style={{position:'absolute',inset:0,touchAction:'pan-y',cursor:scrubbing?'grabbing':'ew-resize'}}
  onPointerDown={press} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={()=>setScrubbing(false)} onKeyDown={key}/>
 </div>
 {/* A table box sizes to its content whatever width it is given, so sr-only's one pixel did not hold
     it: it laid out five hundred pixels wide and a phone page scrolled sideways as soon as Limiting
     cases opened. The block around it does honour one pixel and hidden overflow, and clips it. */}
 <div className="sr-only"><table className="sr-only"><caption>{limit.title}: {semi?'|Eₓ| versus |Eᵧ|':`exact ${qty} versus reference`}</caption><thead><tr><th scope="col">t</th><th scope="col">{semi?'|Eₓ|':'exact'}</th><th scope="col">{semi?'|Eᵧ|':'reference'}</th></tr></thead><tbody>{samples.map((s,i)=><tr key={i}><td>{tAt(i)}</td><td>{s.actual}</td><td>{s.target}</td></tr>)}</tbody></table></div>
 <div className="limit-mini" aria-hidden="true"><svg viewBox={`0 ${-pad[0]} 260 ${48+pad[0]+pad[1]}`} style={pad[0]+pad[1]?{height:`${(44+(pad[0]+pad[1])*200/260).toFixed(1)}px`}:undefined}><LimitFigure id={problem.geometry} mode={limit.mode} t={t} vector={val.vector} scale={scale} arrow={arrow}/></svg></div>
 {/* What is true where the dot is, in words. Polite, and it changes only at the three moments of the
     sweep, so a drag is not read out tick by tick. */}
 <p id={nowId} className="limit-now" aria-live="polite"><SymText text={now}/></p>
 {/* aria-label on the slider lands on its group, not on the range input a keyboard reaches: the
     input is named by pointing at a hidden label, as the page's own sliders are. */}
 <span id={sliderLabel} className="sr-only">Explore limiting case</span>
 <Slider aria-label="Explore limiting case" aria-labelledby={sliderLabel} min={S_MIN} max={S_MAX} step={.1} value={[s]} onValueChange={v=>setS((v as number[])[0])}/>
 <p className="numerical-check"><SymText text={plot.caption}/></p></div>;
}
/** Memoised: the page re-renders on every frame of a run and every tick of a drag, and this card's
 * props -- the lesson, its parameters, the case -- change on none of them. */
export const Assessment=memo(AssessmentView);
