/* Inline SVG needs an image role for its accessible chart name; it cannot be replaced with an external img. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
'use client';
import {useId,useMemo,useState} from 'react';
import {Slider} from '@/components/ui/slider';
import type {Problem,ProblemId,Params,Limit} from '../problems/types';
import {pretty,sampleLimit,limitPlot,halfPieces,type LimitPlot,type LimitSample,type Vec} from '../symbolic/physics';
export {sampleLimit};
import {MathText} from './Math';
const CHARGE={stroke:'var(--charge)',fill:'none',strokeLinecap:'round'} as const,RAIL={stroke:'var(--border)',strokeDasharray:'3 4',fill:'none'} as const;
/** P, and the field it feels at this point of the sweep: the direction of the lesson's own field,
 *  sign included, on the silhouette's axes (x right and y up; z up for the axial views). The arrow
 *  keeps one length, except where the plotted field falls away, where `scale` shrinks it with it. */
function Observer({x,y,vector,axial=false,scale=1}:{x:number;y:number;vector?:Vec;axial?:boolean;scale?:number}){
 const sx=vector?(axial?0:vector.x):0,sy=vector?(axial?-vector.z:-vector.y):0,m=Math.hypot(sx,sy),len=26*Math.min(1,scale);
 const show=m>0&&Number.isFinite(m)&&len>2.5,ux=show?sx/m:0,uy=show?sy/m:0,bx=x+ux*7,by=y+uy*7,tx=bx+ux*len,ty=by+uy*len;
 return <g><circle cx={x} cy={y} r="4" fill="var(--foreground)"/>{show&&<g className="limit-arrow" data-dx={ux.toFixed(4)} data-dy={uy.toFixed(4)} stroke="var(--field)" strokeWidth="2" fill="none" strokeLinecap="round">
  <path d={`M${bx.toFixed(1)} ${by.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`}/>
  <path d={`M${(tx-ux*5-uy*3.5).toFixed(1)} ${(ty-uy*5+ux*3.5).toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${(tx-ux*5+uy*3.5).toFixed(1)} ${(ty-uy*5-ux*3.5).toFixed(1)}`}/></g>}</g>;
}
/** Silhouette of the geometry the plot above is actually sweeping: source in charge colour, P as a
 *  filled dot with the field it feels. Decorative -- every number is in the plot's aria-label and
 *  the table under it. */
function LimitFigure({id,mode,t,vector,scale,scalar}:{id:ProblemId;mode:Limit['mode'];t:number;vector?:Vec;scale:number;scalar:boolean}){
 const k=mode==='far'||mode==='moment'?Math.max(.13,1/t):mode==='infinite'?Math.min(1,t/12):1,unbounded=mode==='infinite'&&k>.92;
 const P=(x:number,y:number,axial=false)=><Observer x={x} y={y} vector={scalar?undefined:vector} axial={axial} scale={scale}/>;
 if(id==='bisector'||id==='infinite'){const h=id==='infinite'?22:Math.max(3,22*k);return <><path d="M64 25H190" {...RAIL}/><path d={`M64 ${25-h}V${25+h}`} {...CHARGE} strokeWidth="7"/>{(id==='infinite'||unbounded)&&<path d="M57 6l14-4M57 44l14 4" {...CHARGE}/>}{P(198,25)}</>}
 // Approaching the rod's end, P walks in towards it; otherwise it stands off and the rod shrinks.
 if(id==='axial'){const w=Math.max(9,120*k),x=mode==='near'?164+40/t:204;return <><path d={`M${44+w} 25H${x-8}`} {...RAIL}/><path d={`M44 25h${w}`} {...CHARGE} strokeWidth="7"/>{P(x,25)}</>}
 if(id==='semi'){const y=32-16*Math.min(1,(t-1)/29);return <><path d="M108 38H246" {...CHARGE} strokeWidth="7"/><path d="M238 31l9 7-9 7" {...CHARGE}/><path d={`M108 38V${y+6}`} {...RAIL}/>{P(108,y)}</>}
 if(id==='endpoint'){const h=Math.max(3,26*k);return <><path d="M104 34H190" {...RAIL}/><path d={`M104 34V${34-h}`} {...CHARGE} strokeWidth="7"/>{unbounded&&<path d="M97 12l7-6 7 6" {...CHARGE}/>}{P(198,34)}</>}
 // The ramp is a wedge: empty at the foot, widest at the top. The moment limit isolates the downward component.
 if(id==='ramp'){const h=Math.max(3,26*k);return <><path d="M104 34H190" {...RAIL}/><path d={`M104 34L100 ${34-h}h8Z`} {...CHARGE} fill="var(--charge)" strokeWidth="1.5"/>{P(198,34)}</>}
 if(id==='arc'){
  // The field's half ring is drawn as the N point charges the plot is summing.
  if(mode==='half'&&!scalar){const n=halfPieces(t);return <>{Array.from({length:n},(_,i)=>{const s=-Math.PI/2+Math.PI*(i+.5)/n;return <circle key={i} cx={(152+17*Math.cos(s)).toFixed(1)} cy={(25-17*Math.sin(s)).toFixed(1)} r={n>16?1.6:2.3} fill="var(--charge)"/>})}{P(152,25)}</>}
  const a=mode==='full'?2*Math.PI*t/30:mode==='half'?Math.PI*(1+(t-1)/29):Math.PI,d=Array.from({length:49},(_,i)=>{const s=-a/2+a*i/48;return `${i?'L':'M'}${(152+17*Math.cos(s)).toFixed(1)},${(25-17*Math.sin(s)).toFixed(1)}`}).join(' ');
  return <><path d={d} {...CHARGE} strokeWidth="5"/>{P(152,25)}</>}
 // Ring, disk and sheet share an axial view: the source lies in a plane, P sits above it on the axis.
 const filled=id!=='ring',plane=id==='sheet'&&mode==='scale';
 const rx=filled&&mode==='infinite'?24+98*k:Math.max(4,(filled?36:32)*k),ry=Math.max(2,(filled?10:9)*(filled&&mode==='infinite'?1:k));
 const h=mode==='center'?3+18*(1-t/30):mode==='maximum'?4+17*Math.min(1,t/30):plane?7+14*Math.min(1,(t-1)/29):21;
 return <><path d={`M130 36V${41-h}`} {...RAIL}/>{plane?<><path d="M8 36H252" {...CHARGE} strokeWidth="3"/><path d="M8 36l9-6m-9 6 9 6m235-6-9-6m9 6-9 6" {...CHARGE}/></>:<ellipse cx="130" cy="36" rx={rx} ry={ry} {...CHARGE} fill={filled?'color-mix(in srgb,var(--charge) 20%,transparent)':'none'} strokeWidth={filled?2.5:5}/>}{P(130,36-h,true)}</>
}
// The plot's frame, in the SVG's own units.
const X0=40,X1=452,TOP=34,BASE=165;
/** What the plotted curve is at one sample: the exact value over the reference, or, where the
 * reference is zero, the exact value over its largest on the sweep. */
const plotted=(plot:LimitPlot,s:LimitSample,largest:number)=>plot.kind==='decay'?s.actual/largest:s.target>0?s.actual/s.target:Infinity;
/** The vertical window. A ratio is drawn close up around its line at one -- the approach is the whole
 * story, and from zero it would be a few pixels of rise and then a flat line on top of the reference.
 * A start that runs off to infinity (a reference that is itself zero there) is cut at twice the line. */
function yWindow(plot:LimitPlot,values:number[]):[number,number]{
 if(plot.kind==='decay'||plot.kind==='peak')return [0,1.08];
 if(plot.kind==='constant')return [.5,1.5];
 const finite=values.filter(Number.isFinite),lo=Math.min(1,...finite),hi=Math.min(2,Math.max(1,...finite)),pad=Math.max(hi-lo,.02)*.1;
 return [lo-pad,hi+pad];
}
export function Assessment({problem,params,limit}:{problem:Problem;params:Params;limit:Limit}){
 const [s,setS]=useState(4);const scalar=problem.quantity==='V',qty=scalar?'potential':'field',units=scalar?'volts':'newtons per coulomb';
 const plot=useMemo(()=>limitPlot(problem,limit),[problem,limit]);
 // An approach to infinity, or to many pieces, is swept on a logarithmic axis: distance ten times the
 // size sits halfway, not a third of the way, and the approach gets the width of the plot.
 const log=limit.mode==='far'||limit.mode==='moment'||limit.mode==='infinite'||limit.mode==='near'||(limit.mode==='half'&&!scalar);
 const tAt=(i:number)=>log?30**(i/69):1+29*i/69,xAt=(u:number)=>X0+(log?Math.log(u)/Math.log(30):(u-1)/29)*(X1-X0);
 // The slider moves along the plot's own axis, so its thumb and the dot on the curve stay in step.
 const t=log?30**((s-1)/29):s;
 // Seventy samples of the sweep, some of them point-charge sums: worked out once per geometry, not per slider tick.
 const samples=useMemo(()=>Array.from({length:70},(_,i)=>sampleLimit(problem,params,limit,log?30**(i/69):1+29*i/69)),[problem,params,limit,log]);
 const val=useMemo(()=>sampleLimit(problem,params,limit,t),[problem,params,limit,t]);
 const largest=Math.max(...samples.map(s=>s.actual),Number.MIN_VALUE),values=samples.map(s=>plotted(plot,s,largest));
 const [lo,hi]=yWindow(plot,values),reference=plot.kind==='decay'?0:1;
 // Past the top of the window the curve runs out of the plot, clipped, rather than along its edge.
 const yAt=(v:number)=>BASE-(Math.min(Math.max(Number.isFinite(v)?v:3*hi,lo),3*hi)-lo)/(hi-lo)*(BASE-TOP),clip='limit-clip-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const path=values.map((v,i)=>`${i?'L':'M'}${xAt(tAt(i)).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
 const here=plotted(plot,val,largest),scale=plot.kind==='decay'?val.actual/largest:plot.kind==='peak'?val.actual/val.target:1;
 return <div className="assessment"><MathText tex={limit.formula} block/>
 <div className="comparison-labels"><span><i className="legend-dot field"/>{plot.solid??`Your exact ${qty}`}</span><span><i className="legend-dot"/>{/^[a-z]{2,}/.test(plot.line)?plot.line[0].toUpperCase()+plot.line.slice(1):plot.line}</span></div>
 <svg viewBox="0 0 480 205" className="comparison-plot" role="img" data-kind={plot.kind} aria-label={`${scalar?'Electric potential':'Electric field'} comparison for ${limit.title}: ${plot.y}, against ${plot.axis} from ${plot.from} to ${plot.to}. Exact ${qty} ${pretty(val.actual)} ${units}, reference ${pretty(val.target)}.`}>
  <path d={`M${X0} ${TOP-8}V${BASE}H${X1+5}`} stroke="var(--ghost)" fill="none"/>
  {(plot.marks??[]).map(m=><g key={m.label}><line x1={xAt(m.t)} x2={xAt(m.t)} y1={TOP} y2={BASE} stroke="var(--border)" strokeDasharray="2 4"/><text x={xAt(m.t)} y="179" textAnchor="middle">{m.label}</text></g>)}
  <line x1={X0} x2={X1} y1={yAt(reference)} y2={yAt(reference)} stroke="var(--charge)" strokeWidth="2" strokeDasharray="6 4"/>
  {/* A decay comes down onto its line at the right, so it is named at the left, where the curve is high above it. */}
  <text x={plot.kind==='decay'?X0+8:X1} y={yAt(reference)-7} textAnchor={plot.kind==='decay'?'start':'end'} className="comparison-line">{plot.line}</text>
  <clipPath id={clip}><rect x={X0} y={TOP-6} width={X1-X0+6} height={BASE-TOP+8}/></clipPath>
  <path d={path} clipPath={`url(#${clip})`} stroke="var(--field)" strokeWidth="2.7" fill="none" strokeLinejoin="round"/>
  <circle cx={xAt(t)} cy={yAt(here)} r="5" fill="var(--field)" clipPath={`url(#${clip})`}/>
  <text x="7" y="17" className="comparison-y">{plot.y}</text>
  <text x={X0} y="193" className="comparison-end">{plot.from}</text><text x={X1} y="193" textAnchor="end" className="comparison-end">{plot.to}</text>
  <text x={(X0+X1)/2} y="193" textAnchor="middle">{plot.axis}</text>
 </svg>
 <table className="sr-only"><caption>{limit.title}: exact {qty} versus reference</caption><thead><tr><th scope="col">t</th><th scope="col">exact</th><th scope="col">reference</th></tr></thead><tbody>{samples.map((s,i)=><tr key={i}><td>{tAt(i)}</td><td>{s.actual}</td><td>{s.target}</td></tr>)}</tbody></table>
 <div className="limit-mini" aria-hidden="true"><svg viewBox="0 0 260 48"><LimitFigure id={problem.geometry} mode={limit.mode} t={t} vector={val.vector} scale={scale} scalar={scalar}/></svg></div>
 <Slider aria-label="Explore limiting case" min={1} max={30} step={.1} value={[s]} onValueChange={v=>setS((v as number[])[0])}/>
 <p className="numerical-check">{plot.caption}</p></div>;
}
