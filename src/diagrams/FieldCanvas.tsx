'use client';
import {useEffect,useMemo,useRef} from 'react';
import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
import {fieldLines,type Plane} from './fieldlines';
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
 className?:string;
};
/** Tracing is far heavier than drawing, so it runs on the charge alone and is reused while
 * the camera, the highlight or the selected element change. */
export function FieldCanvas({samples,project,frame,lines=15,className=''}:FieldCanvasProps){
 const canvas=useRef<HTMLCanvasElement>(null),box=useRef<HTMLDivElement>(null);
 const traced=useMemo(()=>{
  if(!samples.length)return [];
  // A hundred-element partition and a twenty-element one give the same field to well
  // within a line's width, and tracing is quadratic in the count.
  const stride=Math.max(1,Math.ceil(samples.length/64));
  const coarse=samples.filter((_,i)=>i%stride===0);
  const reach=Math.max(...coarse.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)),1);
  return fieldLines(coarse,lines,{step:reach*.05,maxSteps:420,outerLimit:reach*9});
 },[samples,lines]);
 useEffect(()=>{
  const el=canvas.current,host=box.current;
  if(!el||!host)return;
  let frameId=0;
  const draw=()=>{
   const rect=host.getBoundingClientRect();
   if(rect.width<2||rect.height<2)return;
   const dpr=Math.min(window.devicePixelRatio||1,2);
   el.width=Math.round(rect.width*dpr);el.height=Math.round(rect.height*dpr);
   el.style.width=`${rect.width}px`;el.style.height=`${rect.height}px`;
   const ctx=el.getContext('2d');
   if(!ctx)return;
   ctx.setTransform(dpr*rect.width/frame.width,0,0,dpr*rect.height/frame.height,0,0);
   ctx.clearRect(0,0,frame.width,frame.height);
   // The lines are scenery for the construction on top, so they are drawn thin and faint.
   // Reading a value off them is not the point; seeing the shape of the field is.
   ctx.lineWidth=1.1;ctx.lineCap='round';ctx.lineJoin='round';
   ctx.strokeStyle=getComputedStyle(host).getPropertyValue('--field-line').trim()||'rgba(120,160,175,.5)';
   for(const line of traced){
    const screen=line.map(p=>project({x:p.x,y:p.y,z:0}));
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
 },[traced,project,frame.width,frame.height]);
 return <div ref={box} className={`cd-field-canvas ${className}`} aria-hidden="true"><canvas ref={canvas}/></div>;
}
export type {Plane};
