import type {Vec} from '../../symbolic/physics';
import type {BodyKind} from './bodies';
/** WATCH IT BUILD, AS THE SCENE DRAWS IT.
 *
 * Ring, disk and sheet open in space, so for them the 3D scene IS the run, and it used to know
 * almost nothing about it. It drew the charge as one unbroken body and the chosen piece on top;
 * everything else the run is made of -- the cuts, the mirror partner, the pieces already added,
 * the parts of the arrow that survive and the parts that die, the chain -- was the flat figure's,
 * painted over the scene from a fixed screen position or not painted at all. On a rod turned into
 * space the flat pieces are hidden outright (their rectangles are laid out for the flat view and
 * come out as a staircase beside a tilted rod), so the partner and the filling-in simply vanished,
 * and the cuts were drawn in a vertical column a long way from the rod they were cutting.
 *
 * So this works out, from the same state the flat figure is drawn from, what the scene has to
 * show at each moment of the run: the partition as pieces with real gaps between them, how
 * strongly each one is drawn, which stretch of charge is the mirror partner, how far a surface
 * has been summed, and every arrow at P in world units at the figure's own scale.
 *
 * Pure, so it can be tested without a GPU -- and the browser tests read the same plan back off
 * the stage, because a headless browser on a build machine is not guaranteed a WebGL context. */
export type RunPiece={path:Vec[]}|{annulus:{inner:number;outer:number}};
/** How strongly a piece is drawn. `lit` is the piece being talked about (and its partner), drawn
 * by the scene's own element body; `added` is already in the sum; `idle` is waiting for nothing in
 * particular; `dim` has stepped back so the lit pieces can be read. */
export type RunTone='lit'|'added'|'idle'|'dim';
export type RunArrows={
 /** The part of the chosen piece's arrow that survives the symmetry, from P. */
 keep:Vec|null;
 /** The part that is dropped, laid from `dropFrom` -- the tip of the kept part, whether or not the
  * kept part itself is drawn. Where a partner is cancelling it, it is already shrunk by the
  * cancellation, so the scene draws exactly what the flat figure draws. */
 drop:Vec|null; dropFrom:Vec;
 /** The partner's whole arrow from P, and its dropped part laid from the tip of its kept part. */
 partner:Vec|null; partnerKeep:Vec|null; partnerDrop:Vec|null;
 /** How far the two dropped parts have cancelled, 0 to 1: they fade as they shrink. Zero where
  * nothing is cancelling. */
 cancelled:number;
};
export type RunScene={
 stage:string;
 kind:BodyKind; closed:boolean;
 pieces:RunPiece[];
 tones:RunTone[];
 selected:number;
 /** The mirror partner as a stretch of wire: a whole piece, or -- for a ring cut into an odd
  * number of pieces, where no piece sits straight across -- an arc of the same length centred
  * opposite. Null where the stage shows no partner, or the geometry has none. */
 partner:{path:Vec[];across:boolean;index:number|null}|null;
 /** How wide open the cuts are, 1 while the charge is cut up and 0 in the limit: the gaps close
  * as the pieces shrink, so the pieces become the continuous charge again rather than vanishing. */
 open:number;
 /** How far the next doubling's mid-cuts have grown, 0 to 1. */
 split:number;
 /** A surface's cuts, as radii: the circles the partition is made along. `at` is how far along the
  * charge each one is, which is the order the first stage makes them in; `grow` is how far a cut
  * the next doubling is making has got. */
 seams:{radius:number;grow:number;at:number}[];
 /** How far out a surface has been summed, in metres, or null where nothing is being summed. */
 filled:number|null;
 arrows:RunArrows|null;
 /** The running sum, head to tail from P: offsets in world metres at the net arrow's scale. */
 chain:Vec[]|null;
};
export type RunSceneInput={
 stage:string; kind:BodyKind; closed:boolean; n:number; selected:number;
 /** The point a fraction t of the way along the charge -- for a surface, the radius it has
  * reached as x. The same function the sampler partitions by, so a piece drawn here is exactly
  * the piece being summed. */
 at:(t:number)=>Vec;
 /** The partner: a whole piece, the arc straight across, or none. */
 partner:number|'across'|null;
 weights:readonly number[];
 summing:boolean;
 continuum:number; split:number;
 /** One piece's field, its partner's, and the two split into parts, in newtons per coulomb;
  * `scale` turns them into world metres at the figure's own magnification. Null when the stage
  * draws no single piece's arrow. */
 arrows:null|{scale:number;field:Vec;keep:Vec;drop:Vec;partner:Vec|null;partnerKeep:Vec;partnerDrop:Vec;components:boolean;cancelled:number};
 /** Every piece's field and the net arrow's scale, while the sum is being drawn. */
 chain:null|{scale:number;fields:readonly Vec[];weights:readonly number[]};
};
const scaled=(v:Vec,k:number):Vec=>({x:v.x*k,y:v.y*k,z:v.z*k});
const tiny=(v:Vec)=>Math.hypot(v.x,v.y,v.z)<1e-9;
/** Points along one stretch of the charge, from parameter `lo` to `hi`.
 *
 * Always an odd count, so the middle point is exactly the parameter midpoint -- which is where
 * the next doubling cuts. On the unbounded lines the parameter runs through a tangent, so the
 * arc-length middle and the parameter middle are different places, and only the parameter one is
 * where the sampler will actually split the piece. */
export function stretch(at:(t:number)=>Vec,lo:number,hi:number,n:number):Vec[]{
 const half=n<=12?6:n<=48?2:1;
 return Array.from({length:2*half+1},(_,k)=>at(lo+(hi-lo)*k/(2*half)));
}
export function runScene(input:RunSceneInput):RunScene{
 const {stage,kind,closed,at,weights,summing}=input;
 const n=Math.max(1,Math.round(input.n)),selected=Math.max(0,Math.min(n-1,Math.round(input.selected)));
 const surface=kind!=='wire';
 const pieces:RunPiece[]=Array.from({length:n},(_,i)=>surface
  ?{annulus:{inner:Math.abs(at(i/n).x),outer:Math.abs(at((i+1)/n).x)}}
  :{path:stretch(at,i/n,(i+1)/n,n)});
 const partnerIndex=typeof input.partner==='number'&&input.partner!==selected?input.partner:null;
 const across=input.partner==='across';
 // The same choices the flat figure makes for its pieces' classes and opacities: the chosen piece
 // and its partner are lit; while summing, what is in the sum is coloured and what is still to come
 // waits faintly; while one piece is being explained, every other piece steps back.
 const tones=Array.from({length:n},(_,i):RunTone=>{
  if(i===selected||i===partnerIndex)return 'lit';
  if(stage==='add')return summing&&Math.abs(weights[i]??0)>0?'added':'dim';
  if(stage==='one'||stage==='cancel')return 'dim';
  return 'idle';
 });
 const partner=surface||(!across&&partnerIndex===null)?null
  // Half a turn on, for the ring: `at` runs once round per unit, so t + 1/2 is straight across.
  :across?{path:stretch(at,selected/n+.5,(selected+1)/n+.5,n),across,index:null}
  :{path:stretch(at,partnerIndex!/n,(partnerIndex!+1)/n,n),across,index:partnerIndex};
 const open=Math.max(0,Math.min(1,1-input.continuum));
 const split=open>0?Math.max(0,Math.min(1,input.split)):0;
 // A surface's cuts. Too many circles is a grey wash rather than a partition -- the same reason
 // the resting disk thins its rings -- so past a readable count they are sampled evenly.
 const seams:RunScene['seams']=[];
 if(surface&&open>0){
  const stride=Math.max(1,Math.ceil(n/48));
  for(let k=1;k<n;k++)if(k%stride===0)seams.push({radius:Math.abs(at(k/n).x),grow:1,at:k/n});
  if(split>.04&&n*2<=48)for(let i=0;i<n;i++)seams.push({radius:Math.abs(at((i+.5)/n).x),grow:split,at:(i+.5)/n});
 }
 // How far out the sum has reached: the edge of the last piece in it, partly in where the sum is
 // partway through a piece -- so the shading grows smoothly, the way the chain in front of P does.
 const through=summing?weights.reduce((s,w)=>s+Math.abs(w),0):0;
 const filled=surface&&summing&&through>0?Math.abs(at(Math.min(1,through/n)).x):null;
 const a=input.arrows;
 // Exactly the flat figure's choices. With a partner, the dropped parts are drawn in the pair, where
 // they are seen to shrink away, whether or not the stage splits the arrow into parts -- a second,
 // full-length copy of the sideways part used to outlive the cancellation it was showing. Without
 // one, the dropped part is drawn only when the stage asks for the parts.
 const arrows:RunArrows|null=a&&!tiny(a.field)?{
  keep:a.components?scaled(a.keep,a.scale):null,
  dropFrom:scaled(a.keep,a.scale),
  drop:a.partner?scaled(a.drop,a.scale*(1-a.cancelled)):a.components?scaled(a.drop,a.scale):null,
  partner:a.partner?scaled(a.partner,a.scale):null,
  partnerKeep:a.partner?scaled(a.partnerKeep,a.scale):null,
  partnerDrop:a.partner?scaled(a.partnerDrop,a.scale*(1-a.cancelled)):null,
  cancelled:a.partner?a.cancelled:0,
 }:null;
 let chain:Vec[]|null=null;
 if(input.chain){
  const {scale,fields,weights:w}=input.chain;
  let cursor:Vec={x:0,y:0,z:0};
  chain=[cursor];
  for(let i=0;i<fields.length;i++){
   const k=w[i]??0;
   if(k===0)continue;
   cursor={x:cursor.x+fields[i].x*k*scale,y:cursor.y+fields[i].y*k*scale,z:cursor.z+fields[i].z*k*scale};
   chain.push(cursor);
  }
  if(chain.length<2)chain=null;
 }
 return {stage,kind,closed,pieces,tones,selected,partner,open,split,seams,filled,arrows,chain};
}
/** What is left of one piece of a wire once it is cut.
 *
 * A cut is a gap in the wire, not a mark on it: the pieces come apart, which is what "cut it up"
 * says, and in the limit the gaps close and the wire is whole again -- which is what the integral
 * says about the pieces. `head`, `tail` and `mid` are the full widths of the cuts at the piece's
 * start, at its end and at its middle, in metres; zero is no cut, which is how an open wire keeps
 * its outer ends and so its length. The middle cut is the one the next doubling makes, growing
 * the way the flat figure grows its mid-cuts, so a piece about to split is drawn as two halves.
 *
 * Each side of a cut gives up half its width, and no piece gives up more than a fifth of its own
 * length at either end: on the unbounded lines the pieces differ in length by a factor of hundreds,
 * and one shared gap would cut the short ones away entirely. */
export function cutPiece(path:readonly Vec[],head:number,tail:number,mid=0):Vec[][]{
 if(path.length<2)return [];
 const length=polylineLength(path);
 const side=(g:number)=>Math.min(Math.max(0,g)/2,length*.2);
 if(mid>1e-6&&path.length>=3&&path.length%2===1){
  const m=(path.length-1)/2,inner=Math.min(mid/2,length*.1);
  return [trim(path.slice(0,m+1),side(head),inner),trim(path.slice(m),inner,side(tail))].filter(p=>p.length>1);
 }
 const out=trim(path,side(head),side(tail));
 return out.length>1?[out]:[];
}
export function polylineLength(path:readonly Vec[]):number{
 let length=0;
 for(let i=1;i<path.length;i++)length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y,path[i].z-path[i-1].z);
 return length;
}
/** The polyline with `head` metres taken off its start and `tail` off its end. */
export function trim(path:readonly Vec[],head:number,tail:number):Vec[]{
 const length=polylineLength(path);
 if(!(length>head+tail))return [];
 const at=(s:number):{point:Vec;index:number}=>{
  let walked=0;
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
   if(walked+d>=s||i===path.length-1){
    const f=d>0?Math.max(0,Math.min(1,(s-walked)/d)):0;
    return {point:{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f},index:i};
   }
   walked+=d;
  }
  return {point:path[path.length-1],index:path.length-1};
 };
 const start=at(head),end=at(length-tail);
 return [start.point,...path.slice(start.index,end.index),end.point];
}
