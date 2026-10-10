'use client';
import {useCallback,useState} from 'react';
/** An SVG's rendered width, so its type can be held at a readable size. A figure drawn in a fixed
 * viewBox scales with its box: the limit plot is about 354 px wide on a phone for its 480 units, and
 * the tour's figure about 320 px for its 480, so 11-unit labels came out at 7.3 px. A component
 * divides the size it wants on screen by the scale this gives, and holds its labels there.
 *
 * The ref is a callback, not an object read once on mount: the tour's figure comes and goes with
 * its pages (the laws page has none), and an effect run when the dialog first mounted -- closed,
 * with no figure in it -- would never have measured anything. `initial` is the width assumed before
 * the first measurement, and where there is no ResizeObserver: the viewBox's own, so a desktop
 * render never starts out enlarged. */
export function useRenderedWidth(initial:number){
 const [width,setWidth]=useState(initial);
 const ref=useCallback((svg:SVGSVGElement|null)=>{
  if(!svg||typeof ResizeObserver==='undefined')return;
  const measure=()=>{const w=svg.getBoundingClientRect().width;if(w>0)setWidth(w);};
  measure();const watch=new ResizeObserver(measure);watch.observe(svg);
  return ()=>watch.disconnect();
 },[]);
 return [ref,width] as const;
}
