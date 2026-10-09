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
/** How far to move a label, or -- when it has a reach and nowhere within it is free -- that it is
 * better not drawn at all. */
export type Nudge={dx:number;dy:number;hidden?:boolean};
export type Label={
 box:Box;
 /** Anchored labels never move and are only obstacles: an axis letter that shifts is worse
  * than two dimension labels that touch, because it stops naming its axis. */
 fixed?:boolean;
 /** The point the label names: the middle of an arrow's shaft, the point beside which it sits.
  * When nothing near the label's own spot is free, the spot reflected through this point is tried
  * next -- the other side of the same arrow still names that arrow. */
 mirror?:{x:number;y:number};
 /** Other places it may stand, tried after its own spot and its mirror image, in order: past the tip
  * of an arrow named beside its shaft, say, where the shaft has a neighbour on both sides. */
 alternates?:readonly Box[];
 /** Never hidden. Placed in the least-bad spot if nothing is free: the name of the point the whole
  * figure is about is worth an overlap. */
 keep?:boolean;
};
const overlaps=(a:Box,b:Box,pad:number)=>
 a.x-pad<b.x+b.width+pad&&b.x-pad<a.x+a.width+pad&&a.y-pad<b.y+b.height+pad&&b.y-pad<a.y+a.height+pad;
const shift=(b:Box,n:Nudge):Box=>({x:b.x+n.dx,y:b.y+n.dy,width:b.width,height:b.height});
const area=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
const inside=(b:Box,frame:{width:number;height:number})=>b.x>=0&&b.y>=0&&b.x+b.width<=frame.width&&b.y+b.height<=frame.height;
/** The nearest position that fits inside the frame. A label bigger than the frame is pinned
 * to the top left rather than centred, so at least its first characters are readable. */
const clampInto=(b:Box,frame:{width:number;height:number}):Box=>({
 ...b,
 x:Math.max(0,Math.min(b.x,frame.width-b.width)),
 y:Math.max(0,Math.min(b.y,frame.height-b.height)),
});
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
/** Where to try when a label has a reach: rings at a quarter, a half, three quarters and all of the
 * reach, sixteen directions each, every one of them exactly that far -- so the reach is a promise,
 * not a square whose corners go half as far again. Same preference as `candidates`: stay put, then
 * up, down, sideways, and the diagonals last. */
export function reachCandidates(reach:number,rings=4):Nudge[]{
 const out:Nudge[]=[{dx:0,dy:0}];
 const order=[-90,90,180,0,-135,-45,135,45,-112.5,-67.5,112.5,67.5,-157.5,-22.5,157.5,22.5];
 for(let r=1;r<=rings;r++){
  const d=reach*r/rings;
  for(const deg of order){const a=deg*Math.PI/180;out.push({dx:Math.round(Math.cos(a)*d*100)/100,dy:Math.round(Math.sin(a)*d*100)/100});}
 }
 return out;
}
const reflect=(b:Box,m:{x:number;y:number}):Box=>({x:2*m.x-b.x-b.width,y:2*m.y-b.y-b.height,width:b.width,height:b.height});
export type PlaceOptions={
 frame?:{width:number;height:number};
 /** Marks the labels must also avoid — the observation point, the charge itself. */
 obstacles?:readonly Box[];
 /** Clear space demanded around each label, so two do not merely fail to touch. */
 pad?:number;
 step?:number;
 /** How far any label may be moved from where it asked to be. Past it a label stops reading as the
  * name of what it was put beside, so it is tried on the far side of its `mirror` point instead,
  * and failing that it is hidden rather than left floating somewhere else (unless it must `keep`).
  * Left out, labels may go as far as the search reaches and are never hidden. */
 maxShift?:number;
};
/** One nudge per label, in the order given. Labels are placed in sequence, so an earlier
 * label holds its ground and a later one moves around it: pass them most-important first. */
export function placeLabels(labels:readonly Label[],options:PlaceOptions={}):Nudge[]{
 const {frame,obstacles=[],pad=1.5,step=9,maxShift}=options;
 const capped=maxShift!==undefined;
 const tries=capped?reachCandidates(maxShift):candidates(step);
 const taken:Box[]=[...obstacles];
 // Anchored labels claim their space before anything is allowed to move.
 for(const l of labels)if(l.fixed)taken.push(l.box);
 const out:Nudge[]=[];
 for(const label of labels){
  if(label.fixed){out.push({dx:0,dy:0});continue;}
  // Search from where the label asks to be -- unless that is outside the picture, in which
  // case search from the nearest spot inside it. Every candidate is rejected for leaving the
  // frame, so a label that STARTS outside has no candidate at all and would otherwise be left
  // exactly where it was, lost. Found by sweeping all fifteen lessons: the net field arrow can
  // grow long enough to carry its own label off the edge.
  const homes=[frame?clampInto(label.box,frame):label.box];
  if(capped&&label.mirror){const m=reflect(label.box,label.mirror);homes.push(frame?clampInto(m,frame):m);}
  if(capped)for(const alt of label.alternates??[])homes.push(frame?clampInto(alt,frame):alt);
  let best:Nudge={dx:homes[0].x-label.box.x,dy:homes[0].y-label.box.y},bestCost=Infinity,placed=false;
  search:for(const home of homes){
   for(const nudge of tries){
    const moved=shift(home,nudge);
    if(frame&&!inside(moved,frame))continue;
    const from={dx:moved.x-label.box.x,dy:moved.y-label.box.y};
    if(!taken.some(t=>overlaps(moved,t,pad))){best=from;placed=true;break search;}
    // Remember the least-bad option in case nothing is free: a label half over another is
    // still better than one dropped off the edge of the picture.
    const cost=taken.reduce((sum,t)=>sum+area(moved,t),0)+Math.hypot(from.dx,from.dy)*.01;
    if(cost<bestCost){bestCost=cost;best=from;}
   }
  }
  if(!placed&&capped&&!label.keep){out.push({dx:0,dy:0,hidden:true});continue;}
  out.push(best);
  taken.push(shift(label.box,best));
 }
 return out;
}
/** A stroke as obstacles: squares of side `width` every `step` along the segment from a to b, kept
 * to the part of it inside `frame`. A stroke is a thin thing at an angle, and its bounding box is a
 * fat one -- the box of a diagonal arrow covers a whole quadrant around P and would keep every label
 * out of it. A ring's box is the whole inside of the ring. Squares along the line cover the line. */
export function segmentBoxes(a:{x:number;y:number},b:{x:number;y:number},width:number,frame:Box,out:Box[]=[],step=8):Box[]{
 // Liang–Barsky: the part of the segment inside the frame, so a line that runs a mile off the page
 // costs what its visible part costs.
 let t0=0,t1=1;
 const dx=b.x-a.x,dy=b.y-a.y;
 const edges:[number,number][]=[[-dx,a.x-frame.x],[dx,frame.x+frame.width-a.x],[-dy,a.y-frame.y],[dy,frame.y+frame.height-a.y]];
 for(const [p,q] of edges){
  if(Math.abs(p)<1e-12){if(q<0)return out;continue;}
  const r=q/p;
  if(p<0){if(r>t1)return out;if(r>t0)t0=r;}
  else{if(r<t0)return out;if(r<t1)t1=r;}
 }
 const x0=a.x+dx*t0,y0=a.y+dy*t0,x1=a.x+dx*t1,y1=a.y+dy*t1;
 const k=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/step));
 for(let i=0;i<=k;i++){
  const x=x0+(x1-x0)*i/k,y=y0+(y1-y0)*i/k;
  out.push({x:x-width/2,y:y-width/2,width,height:width});
 }
 return out;
}
/** The point of a box nearest to `p`: where a leader from p should stop so that it touches its label
 * and goes no further into it. */
export function nearestOnBox(b:Box,p:{x:number;y:number}):{x:number;y:number}{
 return {x:Math.max(b.x,Math.min(b.x+b.width,p.x)),y:Math.max(b.y,Math.min(b.y+b.height,p.y))};
}
/** Pairs that still overlap after placement, for a test to assert on and for a caller that
 * wants to know it ran out of room. */
export function collisions(boxes:readonly Box[],pad=0):[number,number][]{
 const hits:[number,number][]=[];
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(overlaps(boxes[i],boxes[j],pad))hits.push([i,j]);
 return hits;
}
