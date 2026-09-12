'use client';
import {useEffect,useMemo,useRef} from 'react';
import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
import {fieldLines,type Plane} from './fieldlines';
import {arrowLength,vectorGrid} from './vectorfield';
import {meridianLines,spaceGrid,type Layout} from './field3d';
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
 /** Which plane the flat drawing is a cut through. The planar lessons live in z = 0; the
  * side view of a ring, a disk or a sheet is the cut y = 0 through the axis. */
 plane?:'xy'|'xz'; layout?:Layout;
 className?:string;
};
/** Tracing is far heavier than drawing, so it runs on the charge alone and is reused while
 * the camera, the highlight or the selected element change. */
export function FieldCanvas({samples,project,frame,lines=15,mode='lines',reach=6,plane='xy',layout='wire',className=''}:FieldCanvasProps){
 const canvas=useRef<HTMLCanvasElement>(null),box=useRef<HTMLDivElement>(null);
 const traced=useMemo(()=>{
  if(!samples.length)return [];
  // A hundred-element partition and a twenty-element one give the same field to well
  // within a line's width, and tracing is quadratic in the count.
  const stride=Math.max(1,Math.ceil(samples.length/64));
  const coarse=samples.filter((_,i)=>i%stride===0);
  const reach=Math.max(...coarse.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)),1);
  if(plane==='xz')return meridianLines(coarse,layout,lines,{step:reach*.05,maxSteps:420,outerLimit:reach*9}).map(line=>line.map(v=>({x:v.x,y:v.z})));
  return fieldLines(coarse,lines,{step:reach*.05,maxSteps:420,outerLimit:reach*9});
 },[samples,lines,plane,layout]);
 const arrows=useMemo(()=>{
  if(mode!=='vectors'||!samples.length)return [];
  const stride=Math.max(1,Math.ceil(samples.length/64));
  const coarse=samples.filter((_,i)=>i%stride===0);
  const spacing=reach/7;
  if(plane==='xz')return spaceGrid(coarse,reach,spacing,.12,'xz',layout).map(a=>({at:{x:a.at.x,y:a.at.z},dir:{x:a.dir.x,y:a.dir.z},magnitude:a.magnitude,weight:a.weight,spacing}));
  return vectorGrid(coarse,{x0:-reach,y0:-reach,x1:reach,y1:reach},spacing).map(a=>({...a,spacing}));
 },[samples,mode,reach,plane,layout]);
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
   el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);
   const ctx=el.getContext('2d');
   if(!ctx)return;
   ctx.setTransform(dpr*w/frame.width,0,0,dpr*h/frame.height,0,0);
   ctx.clearRect(0,0,frame.width,frame.height);
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
    return;
   }
   for(const line of traced){
    const screen=line.map(p=>project(plane==='xz'?{x:p.x,y:0,z:p.y}:{x:p.x,y:p.y,z:0}));
    ctx.beginPath();
    let drawing=false;
    for(const s of screen){
     if(!Number.isFinite(s.x)||!Number.isFinite(s.y)){drawing=false;continue;}
     if(drawing)ctx.lineTo(s.x,s.y);else{ctx.moveTo(s.x,s.y);drawing=true;}
    }
    ctx.stroke();
   }
  };
  frameId=requestAnimationFrame(draw);
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(frameId);frameId=requestAnimationFrame(draw);});
  observer.observe(host);
  return ()=>{cancelAnimationFrame(frameId);observer.disconnect();};
 },[traced,arrows,mode,plane,project,frame.width,frame.height]);
 return <div ref={box} className={`cd-field-canvas ${className}`} aria-hidden="true"><canvas ref={canvas}/></div>;
}
export type {Plane};
