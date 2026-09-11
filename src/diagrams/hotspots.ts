export type Spot={x:number;y:number};
export type Area={x0:number;y0:number;x1:number;y1:number};
/** Targets are placed on the feature each one measures, which is the point of them — but
 * on some geometries two features genuinely sit on top of each other. On the disk the
 * charge ring and the bounds bracket land 23px apart, closer than the 26px at which two
 * 13px circles touch, so one target hides the other and the figure stops being pointable.
 *
 * Rather than hand-tune offsets per geometry, overlapping targets are relaxed apart along
 * the line joining them: the smallest move that separates them, so each stays as near as
 * possible to the thing it names. */
export function spreadSpots(spots:readonly Spot[],minGap:number,area:Area,rounds=60):Spot[]{
 const out=spots.map(s=>({x:s.x,y:s.y}));
 const hold=(s:Spot)=>{s.x=Math.max(area.x0,Math.min(area.x1,s.x));s.y=Math.max(area.y0,Math.min(area.y1,s.y));};
 out.forEach(hold);
 // Relax a hair past the gap: the pass converges on it from below, and rounding the
 // result to whole-hundredths would otherwise land just under what was asked for.
 const target=minGap+.05;
 out.forEach(hold);
 for(let round=0;round<rounds;round++){
  let moved=false;
  for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++){
   const a=out[i],b=out[j];
   let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
   if(d>=target)continue;
   // Exactly coincident targets have no line to separate along, so pick one from the
   // pair's indices: arbitrary, but the same every render, which keeps the figure still.
   if(d<1e-9){const angle=(i*3+j)*1.1;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
   const push=(target-d)/(2*d);
   a.x-=dx*push;a.y-=dy*push;b.x+=dx*push;b.y+=dy*push;
   hold(a);hold(b);moved=true;
  }
  if(!moved)break;
 }
 // Sub-pixel coordinates would make the same figure render differently between passes.
 return out.map(s=>({x:Math.round(s.x*100)/100,y:Math.round(s.y*100)/100}));
}
/** Smallest centre-to-centre distance in a set; Infinity for fewer than two. */
export function closestPair(spots:readonly Spot[]):number{
 let worst=Infinity;
 for(let i=0;i<spots.length;i++)for(let j=i+1;j<spots.length;j++)worst=Math.min(worst,Math.hypot(spots[i].x-spots[j].x,spots[i].y-spots[j].y));
 return worst;
}
