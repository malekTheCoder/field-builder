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
export type Nudge={dx:number;dy:number;hidden?:boolean;
 /** Placed past its reach, which a label it must keep may be when nothing within reach is free: it
  * then needs a leader back to what it names, or it is a name floating near nothing. */
 leader?:boolean};
/** A straight stroke from a to b: the shaft of an arrow a label names. */
export type Segment={a:{x:number;y:number};b:{x:number;y:number}};
/** A half-plane the label's centre must stay in: the side of `(x, y)` that `(nx, ny)` points to. */
export type HalfPlane={x:number;y:number;nx:number;ny:number};
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
 /** The shaft of the arrow this label names. A spot nearer some other arrow's shaft than this one's
  * is not offered: a name beside the wrong arrow is read as that arrow's name, which is worse than
  * a name that had to move further. */
 shaft?:Segment;
 /** Where the label's centre has to stay: the side of an axis its arrow lies on, say. A name moved
  * across the axis reads as naming whatever is on the other side of it. */
 within?:readonly HalfPlane[];
 /** Where a leader back to what it names would start, if it has to be placed past its reach. The leader
  * is a stroke like any other: a spot whose leader would cross another name is not offered, and once it
  * is drawn later names keep off it. A placer that knew only label boxes ran an angle's leader straight
  * through r_i. */
 from?:{x:number;y:number};
 /** It always hangs from a line back to `from`, wherever it goes -- the charge's tag does -- so every spot
  * it tries must keep that line off the names already placed, and the line is a stroke the names after it
  * keep off. Checked only for a far spot, the tag's line was redrawn through the radius' letter. */
 tethered?:boolean;
 /** Where it stood last time, if its own spot is taken: tried before any other. Re-solved from scratch on
  * every frame of a run, a name whose spots were near ties hopped between them from one frame to the next
  * -- P = O a hundred units out and back two frames apart. Held where it was while that is still free and
  * honest, it moves only when it has to. `leader` says the spot needed one. */
 prefer?:Box&{leader?:boolean};
};
export const overlaps=(a:Box,b:Box,pad:number,padY=pad)=>
 a.x-pad<b.x+b.width+pad&&b.x-pad<a.x+a.width+pad&&a.y-padY<b.y+b.height+padY&&b.y-padY<a.y+a.height+padY;
const shift=(b:Box,n:Nudge):Box=>({x:b.x+n.dx,y:b.y+n.dy,width:b.width,height:b.height});
const grow=(b:Box,x:number,y:number):Box=>({x:b.x-x,y:b.y-y,width:b.width+2*x,height:b.height+2*y});
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
 /** Clear space between two LABELS, where `pad` is the space between a label and a mark. Two words
  * two pixels apart on one baseline read as one phrase -- "ΔQ x = L" -- where a label two pixels
  * off a stroke is still plainly beside it. Left out, it is `pad`. */
 labelPad?:number;
 /** Every arrow's shaft in the picture, for the rule that a label stays nearer its own arrow than
  * any other. Only labels that name a `shaft` are held to it. */
 shafts?:readonly Segment[];
 /** The construction's lines -- from a piece to P, the triangle's legs -- which, like the arrows, no name may
  * be set across even where nothing is free: the arc's P = O was set on a phone with the mirror's line to P
  * through it, its overlap with that thin line costing next to nothing. */
 lines?:readonly Segment[];
 /** How much further than `maxShift` a label it must keep may go, as a multiple of it, when nothing
  * within reach is free. Its nudge then says it needs a leader. */
 leaderReach?:number;
};
/** How far a box is from a segment: zero where the segment touches or crosses it. */
export function boxSegmentDistance(b:Box,s:Segment):number{
 const {a,b:e}=s,x0=b.x,y0=b.y,x1=b.x+b.width,y1=b.y+b.height;
 const inBox=(p:{x:number;y:number})=>p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;
 if(inBox(a)||inBox(e))return 0;
 const dx=e.x-a.x,dy=e.y-a.y;
 // Crossing any edge of the box is touching it.
 const cross=(p:{x:number;y:number},q:{x:number;y:number})=>{
  // a + t(e - a) = p + u(q - p), by cross products.
  const sx=q.x-p.x,sy=q.y-p.y,d=dx*sy-dy*sx;
  if(Math.abs(d)<1e-12)return false;
  const wx=p.x-a.x,wy=p.y-a.y,t=(wx*sy-wy*sx)/d,u=(wx*dy-wy*dx)/d;
  return t>=0&&t<=1&&u>=0&&u<=1;
 };
 const c=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
 for(let i=0;i<4;i++)if(cross(c[i],c[(i+1)%4]))return 0;
 const toSeg=(p:{x:number;y:number})=>{const l=dx*dx+dy*dy,t=l>1e-12?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
 const toBox=(p:{x:number;y:number})=>Math.hypot(Math.max(x0-p.x,0,p.x-x1),Math.max(y0-p.y,0,p.y-y1));
 return Math.min(...c.map(toSeg),toBox(a),toBox(e));
}
/** Nudges grouped by how far they move, nearest first, keeping the order within each distance. */
function byDistance(nudges:readonly Nudge[]):Nudge[][]{
 const groups:Nudge[][]=[];let last=-1;
 for(const n of nudges){const d=Math.round(Math.hypot(n.dx,n.dy)*10);if(d!==last){groups.push([]);last=d;}groups[groups.length-1].push(n);}
 return groups;
}
const sameSegment=(s:Segment,t:Segment)=>Math.abs(s.a.x-t.a.x)<.6&&Math.abs(s.a.y-t.a.y)<.6&&Math.abs(s.b.x-t.b.x)<.6&&Math.abs(s.b.y-t.b.y)<.6;
/** One nudge per label, in the order given. Labels are placed in sequence, so an earlier
 * label holds its ground and a later one moves around it: pass them most-important first. */
export function placeLabels(labels:readonly Label[],options:PlaceOptions={}):Nudge[]{
 const {frame,obstacles=[],pad=1.5,step=9,maxShift,shafts=[],leaderReach=2}=options;
 // The construction's lines, and every leader drawn so far: a name is never set across one of them, and no
 // leader crosses one. Only the strokes were known, as squares, and a kept name with nowhere free was set across a
 // tag's line -- the disk's s struck through by the line to "ring ΔQ".
 const lines:Segment[]=[...(options.lines??[])];
 const labelPad=options.labelPad??pad;
 const capped=maxShift!==undefined;
 const tries=capped?reachCandidates(maxShift):candidates(step);
 // Past the reach, for a label it must keep: the same rings, out to `leaderReach` times as far.
 const far=capped?reachCandidates(maxShift*leaderReach,8).filter(n=>Math.hypot(n.dx,n.dy)>maxShift+1e-9):[];
 // What is already on the page, and whether it is a label: two labels need more air between them
 // than a label and a stroke do.
 const taken:{box:Box;label:boolean}[]=obstacles.map(box=>({box,label:false}));
 // Anchored labels claim their space before anything is allowed to move.
 for(const l of labels)if(l.fixed)taken.push({box:l.box,label:true});
 // Across, the full label margin: words side by side on one baseline read as one phrase. Up and down,
 // half of it, because a text box already carries its line's empty ascent and descent.
 const padY=Math.max(pad,labelPad/2);
 type Taken={box:Box;label:boolean};
 const free=(b:Box,near:readonly Taken[])=>!near.some(t=>t.label?overlaps(b,t.box,labelPad,padY):overlaps(b,t.box,pad));
 // How far from where it was searched from any spot tried can stand, and how far past its own box a
 // mark can still be in its way. Every stroke is cut into squares, so the picture holds hundreds of
 // marks; a label's search only ever meets the few near it, and asking all of them about every spot
 // tried cost a crowded stage several milliseconds a frame.
 const spread=(ns:readonly Nudge[])=>ns.reduce((m,n)=>Math.max(m,Math.abs(n.dx),Math.abs(n.dy)),0);
 const nearSpread=spread(tries),farSpread=spread(far),air=2*Math.max(pad,labelPad,padY)+1;
 const out:Nudge[]=[];
 for(const label of labels){
  if(label.fixed){out.push({dx:0,dy:0});continue;}
  const own=label.shaft,others=own?shafts.filter(s=>!sameSegment(s,own)):[];
  // A spot is honest if it is nearer its own arrow than any other, and on its own side of the lines
  // it must not cross.
  // How far a spot is from honest: nothing where it is nearer its own arrow than any other, by how much
  // nearer another arrow it stands where it is not.
  const dishonesty=(b:Box)=>{
   const c={x:b.x+b.width/2,y:b.y+b.height/2};
   if(label.within?.some(h=>(c.x-h.x)*h.nx+(c.y-h.y)*h.ny<0))return 1e3;
   if(!own||!others.length)return 0;
   const mine=boxSegmentDistance(b,own);
   // Not merely no nearer: plainly further, or the name reads as belonging to either.
   let worst=0;
   for(const s of others)worst=Math.max(worst,mine+3-boxSegmentDistance(b,s));
   return worst;
  };
  const honest=(b:Box)=>dishonesty(b)<=0;
  // Search from where the label asks to be -- unless that is outside the picture, in which
  // case search from the nearest spot inside it. Every candidate is rejected for leaving the
  // frame, so a label that STARTS outside has no candidate at all and would otherwise be left
  // exactly where it was, lost. Found by sweeping all fifteen lessons: the net field arrow can
  // grow long enough to carry its own label off the edge.
  const homes=[frame?clampInto(label.box,frame):label.box];
  if(capped&&label.mirror){const m=reflect(label.box,label.mirror);homes.push(frame?clampInto(m,frame):m);}
  if(capped)for(const alt of label.alternates??[])homes.push(frame?clampInto(alt,frame):alt);
  // Only the marks some spot it may try can reach: one further off neither blocks nor costs any of
  // them, so leaving it out changes nothing but the time.
  const reach=Math.max(nearSpread,capped&&label.keep?farSpread:0)+air;
  const span=label.prefer?[...homes,label.prefer]:homes;
  const x0=Math.min(...span.map(h=>h.x))-reach,x1=Math.max(...span.map(h=>h.x+h.width))+reach;
  const y0=Math.min(...span.map(h=>h.y))-reach,y1=Math.max(...span.map(h=>h.y+h.height))+reach;
  const near=taken.filter(t=>t.box.x<=x1&&t.box.x+t.box.width>=x0&&t.box.y<=y1&&t.box.y+t.box.height>=y0);
  let best:Nudge={dx:homes[0].x-label.box.x,dy:homes[0].y-label.box.y},bestCost=Infinity,placed=false,leader=false;
  // Near before far across EVERY place the label may stand, not one place at a time: a name that fits
  // as it is on the far side of its arrow, or past its tip, is better than one pushed a long way off
  // its first spot -- pushed far enough, it ends up beside some other arrow.
  // The leader a far spot would need, clear of every name already placed by half the air between names.
  // Nor across a line of the construction, or an arrow's shaft other than its own: a z set out on a leader that
  // crossed the line from P to the piece read as the name of that line, r_i. A crossing within a few units of
  // where the leader starts is where it leaves what it names, and is no crossing.
  const leaderClear=(moved:Box)=>{
   const from=label.from;
   if(!from)return true;
   const seg={a:from,b:nearestOnBox(grow(moved,2,2),from)};
   if(near.some(t=>t.label&&boxSegmentDistance(t.box,seg)<labelPad/2))return false;
   const len=Math.hypot(seg.b.x-seg.a.x,seg.b.y-seg.a.y);
   if(len<6)return true;
   const k=Math.min(.5,4/len),tail={a:{x:seg.a.x+(seg.b.x-seg.a.x)*k,y:seg.a.y+(seg.b.y-seg.a.y)*k},b:seg.b};
   return ![...lines,...(own?others:shafts)].some(l=>segmentsCross(tail,l));
  };
  // Whether a box -- a unit in from its edge, so a name merely touching an arrowhead is not counted --
  // has any arrow's shaft running through it.
  const crossesShaft=(b:Box)=>{const inner=grow(b,-1,-1);return inner.width>0&&inner.height>0&&(shafts.some(s=>boxSegmentDistance(inner,s)===0)||lines.some(s=>boxSegmentDistance(inner,s)===0));};
  const search=(rings:Nudge[],from:Box[],onLeader=false)=>{
   for(const ring of byDistance(rings))for(const home of from){
    for(const nudge of ring){
     const moved=shift(home,nudge);
     if(frame&&!inside(moved,frame))continue;
     const at={dx:moved.x-label.box.x,dy:moved.y-label.box.y};
     const ok=honest(moved)&&(!(onLeader||label.tethered)||leaderClear(moved));
     if(ok&&free(moved,near)){best=at;return true;}
     // Remember the least-bad option in case nothing is free: a label half over another is
     // still better than one dropped off the edge of the picture. A spot by the wrong arrow is
     // worse than any overlap.
     // Counted with the same air `free` asks for: a spot that merely touches another label costs
     // nothing by bare overlap, and a kept name with nowhere free was set flush against its neighbour
     // -- "z" hard under "−ΔE⊥" on a phone -- where a spot a little further off had room.
     // Summed only while it could still be the least bad: every term is at least nothing, so a sum
     // already past the best can only end past it.
     // And a spot laid across an arrow, its own included, is as bad as one by the wrong arrow. Costed by
     // overlap alone, a name set on a five-unit stroke cost almost nothing next to one near another name:
     // on a phone, with nothing free, ΔE_x was set on its own shaft, the shaft through the word and the
     // word's halo cutting the arrow in two.
     const bad=!ok||crossesShaft(moved);
     if(bad&&bestCost<=1e6)continue;
     let sum=0;
     for(const t of near){sum+=t.label?area(grow(moved,labelPad,padY),t.box):area(moved,t.box);if(sum>=bestCost)break;}
     if(sum>=bestCost)continue;
     // Among spots that are all bad, the one nearest to honest: a kept name with nowhere honest to go was
     // set beside the mirror's arrow when a spot hard by its own was there to take.
     const cost=sum+Math.hypot(at.dx,at.dy)*.01+(bad?1e6+100*Math.min(1e3,Math.max(0,dishonesty(moved))):0);
     if(cost<bestCost){bestCost=cost;best=at;}
    }
   }
   return false;
  };
  // Its own spot first, if that is free; then wherever it stood last, if that still is.
  const fits=(b:Box,onLeader:boolean)=>(!frame||inside(b,frame))&&honest(b)&&(!(onLeader||label.tethered)||leaderClear(b))&&free(b,near);
  const pref=label.prefer;
  // Still within the reach it was placed by: a spot that needed no leader, near one of the label's own spots;
  // one that did, near its first.
  const inReach=(b:Box&{leader?:boolean})=>!capped||(b.leader?Math.hypot(b.x-homes[0].x,b.y-homes[0].y)<=maxShift*leaderReach+1:homes.some(h=>Math.hypot(b.x-h.x,b.y-h.y)<=maxShift+1));
  if(pref&&!fits(homes[0],false)&&(!pref.leader||(capped&&label.keep))&&inReach(pref)&&fits(pref,!!pref.leader)){
   best={dx:pref.x-label.box.x,dy:pref.y-label.box.y};placed=true;leader=!!pref.leader;
  }
  if(!placed)placed=search(tries,homes);
  // A label it must keep, with nowhere free within reach: further out, on a leader back to it.
  if(!placed&&capped&&label.keep&&far.length){const keepBest=best,keepCost=bestCost;placed=search(far,homes.slice(0,1),true);if(placed)leader=true;else{best=keepBest;bestCost=keepCost;}}
  if(!placed&&capped&&!label.keep){out.push({dx:0,dy:0,hidden:true});continue;}
  out.push(leader?{...best,leader:true}:best);
  const at=shift(label.box,best);
  taken.push({box:at,label:true});
  // Its leader, as a stroke the names after it keep off -- and a line none may be set across.
  if((leader||label.tethered)&&label.from){
   const bounds=frame?{x:0,y:0,width:frame.width,height:frame.height}:{x:-1e5,y:-1e5,width:2e5,height:2e5};
   const end=nearestOnBox(grow(at,2,2),label.from);
   for(const box of segmentBoxes(label.from,end,3,bounds))taken.push({box,label:false});
   if(Math.hypot(end.x-label.from.x,end.y-label.from.y)>4)lines.push({a:label.from,b:end});
  }
 }
 return out;
}
/** Whether two segments cross or touch. */
export function segmentsCross(s:Segment,t:Segment):boolean{
 const d=(p:{x:number;y:number},q:{x:number;y:number},r:{x:number;y:number})=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const d1=d(t.a,t.b,s.a),d2=d(t.a,t.b,s.b),d3=d(s.a,s.b,t.a),d4=d(s.a,s.b,t.b);
 return d1*d2<=0&&d3*d4<=0&&!(d1===0&&d2===0&&d3===0&&d4===0);
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
