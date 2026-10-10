'use client';
import {useEffect,useMemo,useRef} from 'react';
import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
import {covers,fieldLines,LINE_HEAD as HEAD,lineHeads,seedPool,traceLimit,traceWindow,type Plane,type PlaneRect} from './fieldlines';
import {coarsen} from './sampling';
import {arrowLength,bodyFoot,latticeArea,PLOT,vectorGrid,visibleArea} from './vectorfield';
import {meridianLines,sheetLines,spaceGrid,type Layout} from './field3d';
import {SNAPSHOT_EVENT,type SnapshotDetail} from './snapshot';
/** The field itself, under the construction drawing.
 *
 * SVG is the right medium for the things that must stay crisp and reachable — labels,
 * brackets, the charge elements a student tabs through. It is the wrong medium for a
 * hundred long curves that are redrawn as the geometry moves. So the field goes on a
 * canvas underneath and the constructions stay in SVG on top, each doing what only it can.
 *
 * Both layers share one projection and one coordinate space, so they cannot drift apart. */
export type FieldCanvasProps={
 samples:readonly ChargeSample[];
 /** World → viewBox units. The same function the SVG draws with. */
 project:(v:Vec)=>{x:number;y:number};
 /** The SVG's viewBox, so the canvas can map into the identical space. */
 frame:{width:number;height:number};
 lines?:number;
 /** Lines show where the field goes; arrows show how hard it pushes at a chosen place. */
 mode?:'lines'|'vectors';
 /** World extent the arrows cover, and how far apart to place them. */
 reach?:number;
 /** How many elements the tracer may sum from. The default suits a bounded charge; the three
  * unbounded geometries need more, because their far elements are lumps and it is the MERGE
  * target, not the truncation, that limits how radial their drawn field is. Measured on the
  * infinite line at 6.7 m out: 64 elements is 1.54° off radial, 128 is 0.66°, 256 is 0.28°. */
 detail?:number;
 /** Which plane the flat drawing is a cut through. The planar lessons live in z = 0; the
  * side view of a ring, a disk or a sheet is the cut y = 0 through the axis. */
 plane?:'xy'|'xz'; layout?:Layout;
 className?:string;
};
/** The last few traces, by everything a trace depends on.
 *
 * The last stage of "Watch it build" hands the tracer the run's own cut of the charge, and leaving
 * it -- closing the run, or stepping back a stage -- hands back the reader's. A memo remembers only
 * the one it was last given, so every such step traced the reader's field again from scratch, on
 * the very frame it changed, and every replay traced the run's again. Kept here, going back to a
 * charge the page has already drawn costs a lookup. Small, because the charges a page moves
 * between are few; the oldest goes first. */
const TRACES=new Map<string,Plane[][]>();
const TRACES_KEPT=6;
/** Tracing is far heavier than drawing, so it runs on the charge alone and is reused while
 * the camera, the highlight or the selected element change. */
export function FieldCanvas({samples,project,frame,lines=15,mode='lines',reach=6,detail=64,plane='xy',layout='wire',className=''}:FieldCanvasProps){
 const canvas=useRef<HTMLCanvasElement>(null),box=useRef<HTMLDivElement>(null);
 // Tracing depends on the charge alone -- positions and dq -- never on where P is. For
 // twelve of the fifteen geometries those are identical from frame to frame while P is
 // dragged, so keying the trace on the array's identity retraced every streamline for
 // nothing. This summarises the charge instead; the three unbounded lessons genuinely do
 // move their charge with P, and their key changes, so they still retrace.
 const chargeKey=useMemo(()=>{let h=17;for(const s of samples){h=(h*31+Math.round(s.position.x*1e4))|0;h=(h*31+Math.round(s.position.y*1e4))|0;h=(h*31+Math.round(s.position.z*1e4))|0;h=(h*31+Math.round(s.dq*1e18))|0;}return `${samples.length}:${h}`},[samples]);
 /* Both memos below key on `chargeKey`, not on `samples`. That is the whole point: the
    array is rebuilt every frame while P is dragged, but the charge it describes is not, and
    depending on the array retraced every streamline for nothing. */
 /* oxlint-disable react-hooks/exhaustive-deps */
 /* oxlint-disable react/react-compiler */
 // The part of the plane the window shows, in world metres: where the lines must reach, and what
 // the arrows cover. Keyed by the rectangle, rounded, so a projection rebuilt without moving costs
 // nothing.
 const area=useMemo(()=>visibleArea(project,plane),[project,plane]);
 const areaKey=area?[area.x0,area.y0,area.x1,area.y1].map(v=>v.toFixed(2)).join(','):'';
 // Lines run on past every edge of the window, not to a circle about O (see `traceLimit`). The
 // window they are traced for has room round it, and is kept for as long as it still covers what
 // the figure shows: zooming in keeps the lines already traced, which the clip trims, and only a
 // window that really grows or moves past them is traced again.
 const base=`${chargeKey}|${lines}|${plane}|${layout}|${reach}|${detail}`;
 const held=useRef<{base:string;traced:PlaneRect|null}>({base:'',traced:null});
 if(held.current.base!==base||!covers(held.current.traced,area))held.current={base,traced:area?traceWindow(area):null};
 const tracedFor=held.current.traced,limit=traceLimit(tracedFor,reach*1.6);
 const traceKey=`${base}|${tracedFor?[tracedFor.x0,tracedFor.y0,tracedFor.x1,tracedFor.y1].map(v=>v.toFixed(2)).join(','):'-'}`;
 const traced=useMemo(()=>{
  if(!samples.length)return [];
  const kept=TRACES.get(traceKey);
  if(kept){TRACES.delete(traceKey);TRACES.set(traceKey,kept);return kept;}
  // A hundred-element partition and a twenty-element one give the same field to well
  // within a line's width, and tracing is quadratic in the count.
  const coarse=coarsen(samples,detail);
  // `reach` here is the PICTURE's half-width, the prop. It used to be shadowed by the charge's
  // own extent, and on the three unbounded lessons that is hundreds of metres -- so the step
  // was metres long, lines were allowed to run for kilometres, and every seed landed far
  // outside the frame. The infinite line and the semi-infinite line drew no visible field at
  // all. The charge's span is still worth knowing, for nothing but a floor under the step.
  const chargeSpan=Math.max(...coarse.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)),1);
  const step=Math.min(reach,chargeSpan)*.05;
  // Enough steps to get there: a line covers about a step per step, and bends a little on the way.
  const opts={step,maxSteps:Math.min(1600,Math.max(420,Math.ceil(1.3*limit/step))),outerLimit:limit,seedLimit:reach*.95,...(tracedFor?{bounds:tracedFor}:{})};
  // Each line is finished on the charge it comes from rather than an element spacing short of it,
  // where the tracer has to stop; see `bodyFoot`.
  // A side view of a surface starts its lines across the whole window, not only the field's reach:
  // an infinite sheet's field fills the picture (see TraceOptions.seedSpan).
  const seedSpan=plane==='xz'&&tracedFor?Math.max(Math.abs(tracedFor.x0),Math.abs(tracedFor.x1)):undefined;
  // An endless line starts lines all along the part of it the window shows; see `seedPool`.
  const shown=tracedFor?Math.max(Math.abs(tracedFor.x0),Math.abs(tracedFor.x1),Math.abs(tracedFor.y0),Math.abs(tracedFor.y1)):0;
  const pool=seedPool(coarse,lines,opts.seedLimit,shown);
  // THE SHEET'S SIDE VIEW IS DRAWN AS THE SCENE DRAWS IT: from Gauss, not traced. Traced, its lines
  // crossed the coarse far annuli of a partition cut for integrating, and a uniform field came out with
  // S-bends of up to five pixels where the lines left the plane and gaps varying by a fifth toward the
  // edges -- at small heights, on the lesson whose point is a field the same everywhere. A surface whose
  // charge runs on far past the picture's reach is that sheet: its lines are straight normals, evenly
  // spaced across the whole window, as many to a metre as the traced ones were, and ordered by the
  // sign of the charge.
  const endless=plane==='xz'&&layout==='surface'&&!!tracedFor&&chargeSpan>reach*3;
  const fresh=endless?sideSheet(coarse,lines,opts.seedLimit,tracedFor!)
   :plane==='xz'?meridianLines(coarse,layout,lines,{...opts,root:{},seedSpan}).map(line=>line.map(v=>({x:v.x,y:v.z}))):fieldLines(coarse,pool.count,{...opts,seedPool:pool.pool,root:bodyFoot(coarse,'wire')});
  TRACES.set(traceKey,fresh);
  for(const old of TRACES.keys()){if(TRACES.size<=TRACES_KEPT)break;TRACES.delete(old);}
  return fresh;
 },[traceKey]);
 // The arrows cover the part of the plane the window shows, not a square of the field's reach: the
 // two only agree when the picture happens to be square in metres, and on the infinite line it is
 // nearly three times as wide as it is tall, so the lattice stopped a third of the way across.
 const arrows=useMemo(()=>{
  if(mode!=='vectors'||!samples.length)return [];
  const coarse=coarsen(samples,detail);
  const square={x0:-reach,y0:-reach,x1:reach,y1:reach};
  // On the side view the lattice sits half a step off the axis and off the charge's plane, as it
  // always has: on either, a symmetric field is zero or points along the line an arrow would hide.
  const lattice=latticeArea(area??square,reach/7,plane==='xz'?.5:0),spacing=lattice.spacing;
  if(plane==='xz')return spaceGrid(coarse,reach,spacing,.12,'xz',layout,lattice.area).map(a=>({at:{x:a.at.x,y:a.at.z},dir:{x:a.dir.x,y:a.dir.z},magnitude:a.magnitude,weight:a.weight,spacing}));
  return vectorGrid(coarse,lattice.area,spacing).map(a=>({...a,spacing}));
 },[chargeKey,mode,reach,plane,layout,detail,areaKey]);
 /* oxlint-enable react/react-compiler */
 /* oxlint-enable react-hooks/exhaustive-deps */
 useEffect(()=>{
  const el=canvas.current,host=box.current;
  if(!el||!host)return;
  let frameId=0;
  const draw=()=>{
   // clientWidth, not getBoundingClientRect: the rect is in visual pixels and so includes
   // any page zoom or CSS transform above us. Writing that back as the element's CSS size
   // feeds the zoom into the element itself, and the canvas grows every pass — it reached
   // 5280px inside a 2031px box before this was caught. The CSS already sizes the element
   // at 100%; only the backing store is set here.
   const w=host.clientWidth,h=host.clientHeight;
   if(w<2||h<2)return;
   const dpr=Math.min(window.devicePixelRatio||1,2);
   // Only when it has actually changed: assigning a canvas its own size still throws away its
   // drawing buffer and allocates a new one, and the size is the same on every redraw but a resize.
   // A kept buffer keeps its drawing state too, so the alpha is put back with the transform.
   const W=Math.round(w*dpr),H=Math.round(h*dpr);
   if(el.width!==W)el.width=W;
   if(el.height!==H)el.height=H;
   const ctx=el.getContext('2d');
   if(!ctx)return;
   ctx.setTransform(dpr*w/frame.width,0,0,dpr*h/frame.height,0,0);ctx.globalAlpha=1;
   ctx.clearRect(0,0,frame.width,frame.height);
   // Inside the window the SVG draws in, and nowhere else. The lines are traced past the edge of
   // the picture on purpose, so they leave it rather than stopping short -- and uncut, they went on
   // through the rule and the caption under the figure and out to the edges of the card.
   ctx.save();
   ctx.beginPath();ctx.roundRect(PLOT.x,PLOT.y,PLOT.width,PLOT.height,PLOT.radius);ctx.clip();
   // The lines are scenery for the construction on top, so they are drawn thin and faint.
   // Reading a value off them is not the point; seeing the shape of the field is.
   ctx.lineWidth=1.1;ctx.lineCap='round';ctx.lineJoin='round';
   const stroke=getComputedStyle(host).getPropertyValue('--field-line').trim()||'rgba(120,160,175,.5)';
   ctx.strokeStyle=stroke;
   if(mode==='vectors'){
    const lift=(q:Plane):Vec=>plane==='xz'?{x:q.x,y:0,z:q.y}:{x:q.x,y:q.y,z:0};
    for(const a of arrows){
     const half=arrowLength(a.weight,a.spacing)/2;
     const tail=project(lift({x:a.at.x-a.dir.x*half,y:a.at.y-a.dir.y*half}));
     const head=project(lift({x:a.at.x+a.dir.x*half,y:a.at.y+a.dir.y*half}));
     if(![tail.x,tail.y,head.x,head.y].every(Number.isFinite))continue;
     // Weight reads twice — once as length, once as weight of line — so a strong arrow is
     // unmistakable even where the grid is dense.
     ctx.globalAlpha=.28+.62*a.weight;ctx.lineWidth=.9+1.3*a.weight;
     const dx=head.x-tail.x,dy=head.y-tail.y,len=Math.hypot(dx,dy)||1;
     const ux=dx/len,uy=dy/len,barb=Math.min(5.5,len*.42);
     ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(head.x,head.y);
     ctx.moveTo(head.x-barb*(ux*.87-uy*.5),head.y-barb*(uy*.87+ux*.5));
     ctx.lineTo(head.x,head.y);
     ctx.lineTo(head.x-barb*(ux*.87+uy*.5),head.y-barb*(uy*.87-ux*.5));
     ctx.stroke();
    }
    ctx.globalAlpha=1;
    ctx.restore();
    return;
   }
   // The heads in the line's own ink, filled: a small arrowhead the way the line runs, which is the
   // way the field points -- out of a positive charge, into a negative one. See `lineHeads`. They are
   // gathered into one path and filled once, after the lines, so the canvas's own path holds only
   // the lines.
   const heads=new Path2D();
   for(const line of traced){
    const screen=line.map(p=>project(plane==='xz'?{x:p.x,y:0,z:p.y}:{x:p.x,y:p.y,z:0}));
    ctx.beginPath();
    let drawing=false;
    for(const s of screen){
     if(!Number.isFinite(s.x)||!Number.isFinite(s.y)){drawing=false;continue;}
     if(drawing)ctx.lineTo(s.x,s.y);else{ctx.moveTo(s.x,s.y);drawing=true;}
    }
    ctx.stroke();
    for(const h of lineHeads(screen,PLOT)){
     const tipX=h.x+h.dx*HEAD.length/2,tipY=h.y+h.dy*HEAD.length/2,backX=h.x-h.dx*HEAD.length/2,backY=h.y-h.dy*HEAD.length/2;
     heads.moveTo(tipX,tipY);
     heads.lineTo(backX-h.dy*HEAD.half,backY+h.dx*HEAD.half);heads.lineTo(backX+h.dy*HEAD.half,backY-h.dx*HEAD.half);
     heads.closePath();
    }
   }
   ctx.fillStyle=stroke;ctx.fill(heads);
   ctx.restore();
  };
  frameId=requestAnimationFrame(draw);
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(frameId);frameId=requestAnimationFrame(draw);});
  observer.observe(host);
  // The offline copy: drawn now, in whatever theme the page has just been put in, then put back.
  const snapshot=(ev:Event)=>{
   cancelAnimationFrame(frameId);draw();
   try{(ev as CustomEvent<SnapshotDetail>).detail.url=el.toDataURL('image/png');}catch{/* a tainted or lost canvas: the copy goes without its field */}
   frameId=requestAnimationFrame(draw);
  };
  host.addEventListener(SNAPSHOT_EVENT,snapshot);
  return ()=>{cancelAnimationFrame(frameId);observer.disconnect();host.removeEventListener(SNAPSHOT_EVENT,snapshot);};
 },[traced,arrows,mode,plane,project,frame.width,frame.height]);
 // How finely the charge the field is traced from is cut, for the tests: see ChargeDiagram.
 return <div ref={box} className={`cd-field-canvas ${className}`} aria-hidden="true" data-field-samples={samples.length}><canvas ref={canvas}/></div>;
}
export type {Plane};
/** The infinite sheet's side view: straight lines square to the plane, one every `4 span / lines`
 * metres -- the spacing the traced side view had -- placed symmetrically about the axis, across the
 * whole of `window` and out past its top and bottom, each ordered along the field. In the cut y = 0's
 * own coordinates, x across and z up. */
export function sideSheet(samples:readonly ChargeSample[],lines:number,span:number,window:PlaneRect):Plane[][]{
 const gap=4*span/Math.max(1,lines),reach=Math.max(Math.abs(window.x0),Math.abs(window.x1)),count=Math.ceil(reach/gap);
 const charge=samples.reduce((q,s)=>q+s.dq,0),length=Math.max(Math.abs(window.y0),Math.abs(window.y1))*1.2;
 const roots=Array.from({length:2*count},(_,j)=>({x:(j-count+.5)*gap,y:0}));
 return sheetLines(roots,length,charge>=0?1:-1).map(line=>line.map(v=>({x:v.x,y:v.z})));
}
