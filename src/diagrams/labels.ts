/** Keeping the figure's labels off each other.
 *
 * Every label in the drawing sits at an offset chosen by hand for one arrangement of the
 * geometry — `r` below the axis, `ΔQ` beside the element, `L` against the bracket. Move the
 * rod, change the distance, switch the lesson, and those offsets go on being what they were:
 * measured across all fifteen lessons at three parameter settings each, twelve of them put
 * two labels on top of each other and three pushed one off the edge of the frame.
 *
 * Hand-tuning each offset again would fix those readings and break at the next parameter
 * value, because the problem is not that any particular number is wrong — it is that no
 * label knows what else is on the page. So nothing is re-tuned. Labels are laid out where
 * they ask to be, and whichever ones actually collide are nudged to the nearest free spot.
 *
 * Pure, so the placement can be tested without a browser: the caller measures, this decides. */
export type Box={x:number;y:number;width:number;height:number};
export type Nudge={dx:number;dy:number};
export type Label={
 box:Box;
 /** Anchored labels never move and are only obstacles: an axis letter that shifts is worse
  * than two dimension labels that touch, because it stops naming its axis. */
 fixed?:boolean;
};
const overlaps=(a:Box,b:Box,pad:number)=>
 a.x-pad<b.x+b.width+pad&&b.x-pad<a.x+a.width+pad&&a.y-pad<b.y+b.height+pad&&b.y-pad<a.y+a.height+pad;
const shift=(b:Box,n:Nudge):Box=>({x:b.x+n.dx,y:b.y+n.dy,width:b.width,height:b.height});
const area=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
const inside=(b:Box,frame:{width:number;height:number})=>b.x>=0&&b.y>=0&&b.x+b.width<=frame.width&&b.y+b.height<=frame.height;
/** Where to try, in order: stay put, then rings of eight directions at growing distance.
 * Staying put is always first, so a label that is already clear is never moved — the figure
 * should look hand-placed, because it was, right up until two labels wanted the same spot. */
export function candidates(step=9,rings=4):Nudge[]{
 const out:Nudge[]=[{dx:0,dy:0}];
 for(let r=1;r<=rings;r++){
  const d=step*r;
  // Vertical first: a label displaced up or down still reads as belonging to what it names,
  // where one displaced sideways can drift onto a neighbour's feature.
  for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]] as const)out.push({dx:dx*d,dy:dy*d});
 }
 return out;
}
export type PlaceOptions={
 frame?:{width:number;height:number};
 /** Marks the labels must also avoid — the observation point, the charge itself. */
 obstacles?:readonly Box[];
 /** Clear space demanded around each label, so two do not merely fail to touch. */
 pad?:number;
 step?:number;
};
/** One nudge per label, in the order given. Labels are placed in sequence, so an earlier
 * label holds its ground and a later one moves around it: pass them most-important first. */
export function placeLabels(labels:readonly Label[],options:PlaceOptions={}):Nudge[]{
 const {frame,obstacles=[],pad=1.5,step=9}=options;
 const tries=candidates(step);
 const taken:Box[]=[...obstacles];
 // Anchored labels claim their space before anything is allowed to move.
 for(const l of labels)if(l.fixed)taken.push(l.box);
 const out:Nudge[]=[];
 for(const label of labels){
  if(label.fixed){out.push({dx:0,dy:0});continue;}
  let best:Nudge={dx:0,dy:0},bestCost=Infinity,placed=false;
  for(const nudge of tries){
   const moved=shift(label.box,nudge);
   if(frame&&!inside(moved,frame))continue;
   if(!taken.some(t=>overlaps(moved,t,pad))){best=nudge;placed=true;break;}
   // Remember the least-bad option in case nothing is free: a label half over another is
   // still better than one dropped off the edge of the picture.
   const cost=taken.reduce((sum,t)=>sum+area(moved,t),0)+Math.hypot(nudge.dx,nudge.dy)*.01;
   if(cost<bestCost){bestCost=cost;best=nudge;}
  }
  out.push(best);
  taken.push(shift(label.box,best));
  void placed;
 }
 return out;
}
/** Pairs that still overlap after placement, for a test to assert on and for a caller that
 * wants to know it ran out of room. */
export function collisions(boxes:readonly Box[],pad=0):[number,number][]{
 const hits:[number,number][]=[];
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(overlaps(boxes[i],boxes[j],pad))hits.push([i,j]);
 return hits;
}
