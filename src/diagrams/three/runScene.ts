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
/** ONE STRETCH OF A PIECE IN A TONE OF ITS OWN: `lo` to `hi` along the charge (as `at`'s parameter), the
 * points along it, and whether it starts at the piece's start or ends at its end -- the only places it is
 * cut, since a piece split by tone is still one piece.
 *
 * A RING CUT AN ODD NUMBER OF WAYS GOES INTO THE SUM HALF A PIECE AT A TIME: each piece's mirror is the same
 * length of ring straight across, which is the last half of one piece and the first half of the next (see
 * `pairs.ts`). A piece was toned by whether all of it was in, so a piece half in was drawn as a pale ghost --
 * through the last pair and the stage's held final frame, while the sum's arrow already stood at the full E --
 * and the ring the lesson opens on (cut five ways) ended its sum saying a fifth of it was never added. */
export type RunPart={lo:number;hi:number;path:Vec[];tone:RunTone;head:boolean;tail:boolean};
export type RunArrows={
 /** The part of the chosen piece's arrow that survives the symmetry, from P. */
 keep:Vec|null;
 /** The other part, laid from `dropFrom` -- which is P itself, as the flat figure lays it: each part
  * is a side of the parallelogram the arrow is resolved along, drawn out of P where it can be seen.
  * Laid from the tip of the kept part instead, it ended under the arrowhead of the piece's own
  * arrow and could not be told from it. Where a partner is cancelling it, it is already shrunk by
  * the cancellation, so the scene draws exactly what the flat figure draws. */
 drop:Vec|null; dropFrom:Vec;
 /** The partner's whole arrow from P, and where its dropped part is laid from: P as well, for the
  * same reason, so the two sideways parts start together and shrink into P toward each other. */
 partner:Vec|null; partnerFrom:Vec|null; partnerDrop:Vec|null;
 /** WHAT THE MIRROR PIECE KEEPS: the partner's surviving part, laid on the piece's own surviving part
  * once the sideways parts have gone, tip to tail -- so the pair is seen to give twice the piece's
  * part along the axis, which is what the board writes. Null where the stage does not resolve the
  * arrow into parts, or there is no partner. It was never drawn in space: the scene ended What
  * cancels showing one piece's part where the pair gives two, and the flat copy of it is hidden in
  * space on the grounds that the scene draws the arrows. */
 partnerSurvivor:Vec|null;
 /** How far the two dropped parts have cancelled, 0 to 1: they fade as they shrink. Zero where
  * nothing is cancelling. */
 cancelled:number;
 /** Where the arrows start, as an offset from P: P itself, except while Add them up takes a mirror pair
  * into the sum, when the pair is laid from the tip of the sum so far (see `pairs.ts`). */
 from:Vec;
 /** How strongly the pair's whole arrows are drawn, 0 to 1: the pair going into the sum lets them go as
  * their parts across do, at the flat figure's rate, leaving the parts along the axis to be taken in.
  *
  * IT WAS A YES OR NO, at six tenths of the way through the cancellation, so in space both whole arrows
  * vanished on one frame while the flat figure's were still at a quarter strength: the two views told one
  * cancellation with two timings. */
 whole:number;
 /** WHETHER THIS IS A MIRROR PAIR GOING INTO THE SUM (Add them up), rather than one piece being explained.
  * The pair's mirror slides its part along the axis out from under the piece's, as the flat figure's
  * does, and the sum's arrow takes the two parts in as it grows over them. */
 pair:boolean;
 /** The piece's own whole arrow from `from`, while a pair with a mirror goes into the sum: the scene draws
  * it, fading with `whole`, in place of the figure's contribution arrow, which stopped at a fixed point of
  * the cancellation and could not fade. Null otherwise. */
 pieceWhole:Vec|null;
 /** How much of the two parts along the axis the sum's arrow has taken in, 0 to 1. See `keptSpans`. */
 taken:number;
};
/** One part along the axis as the scene lays it: from `from` (an offset from P) along `along`. */
export type KeptSpan={from:Vec;along:Vec};
const plusV=(a:Vec,b:Vec):Vec=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const lengthOf=(v:Vec)=>Math.hypot(v.x,v.y,v.z);
/** WHAT IS LEFT OF THE TWO PARTS ALONG THE AXIS, laid where the scene lays them: the piece's from the start of
 * the arrows, the mirror's on its tip.
 *
 * WHILE A PAIR GOES INTO THE SUM, THE SUM'S ARROW TAKES THEM IN. It grows from P to the tip of the sum so far
 * plus `taken` of the two parts, so its tip runs up through them -- and they used to be drawn whole until the
 * merge was over and then dropped at once: the piece's flat head, wider than the sum's shaft, stood on it as a
 * chevron a third of the way up, and the mirror's pale head sat on the sum's own, so the sum read as more than
 * one arrow. The flat figure fades them as they go in. Here each is laid only over the stretch the sum has not
 * reached yet, so the three arrows meet tip to tail and never overlap.
 *
 * The mirror's part slides out from under the piece's as the parts across cancel, as the flat figure's does
 * (from the start of the arrows, `cancelled` of the piece's part along); explaining one piece, What cancels
 * lays it on the piece's tip once the parts across are half gone, again as the flat figure does. */
export function keptSpans(a:RunArrows|null|undefined):{piece:KeptSpan|null;partner:KeptSpan|null}{
 if(!a?.keep)return {piece:null,partner:null};
 const keep=a.keep,mirror=a.partnerSurvivor,kl=lengthOf(keep),ml=mirror?lengthOf(mirror):0;
 const axis=kl>1e-12?keep:mirror&&ml>1e-12?mirror:null;
 if(!axis)return {piece:null,partner:null};
 const u=scaled(axis,1/lengthOf(axis)),taken=a.pair?Math.max(0,Math.min(1,a.taken)):0,consumed=taken*(kl+ml);
 const pieceGone=Math.min(consumed,kl),mirrorGone=Math.max(0,Math.min(ml,consumed-kl));
 const piece=kl-pieceGone>1e-12?{from:plusV(a.from,scaled(u,pieceGone)),along:scaled(u,kl-pieceGone)}:null;
 const shown=a.pair?!!mirror:!!mirror&&a.cancelled>.5;
 const base=plusV(a.from,a.pair?scaled(keep,Math.max(0,Math.min(1,a.cancelled))):keep);
 const partner=shown&&ml-mirrorGone>1e-12?{from:plusV(base,scaled(u,mirrorGone)),along:scaled(u,ml-mirrorGone)}:null;
 return {piece,partner};
}
/** How the dropped part of the chosen piece's arrow is drawn: dashed where a partner's part is
 * cancelling it, solid where nothing does.
 *
 * The dashed line is the figure's mark for a part that goes. With no mirror piece -- the rod seen
 * from beyond its end, the ramp, the semi-infinite line -- there is nothing to cancel the sideways
 * part, so it SURVIVES, and drawing it dashed told the reader the opposite of the stage's own line
 * ("both parts of each survive"). The flat figure draws it solid; so does the scene. One rule, read
 * by the scene to draw and by the stage's data to report, so the two cannot disagree. */
export const dropStyle=(a:RunArrows|null|undefined):'solid'|'dashed'|null=>!a?.drop?null:a.partner?'dashed':'solid';
export type RunScene={
 stage:string;
 kind:BodyKind; closed:boolean;
 pieces:RunPiece[];
 tones:RunTone[];
 /** A wire piece drawn in more than one tone, as its stretches, or null where it is drawn whole in its tone.
  * See `RunPart`. */
 parts:(RunPart[]|null)[];
 /** How much of the charge is drawn as already in the sum, and as lit (the chosen stretch and its partner),
  * each as a share of the whole of it: for the tests, which read the plan, not the pixels. */
 spans:{added:number;lit:number};
 selected:number;
 /** The chosen stretch where it is not a whole piece -- the half piece a ring cut an odd number of ways
  * puts into its last mirror pair -- or null. */
 selectedPath:Vec[]|null;
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
 /** The running sum, head to tail from P: offsets in world metres at the net arrow's scale. While
  * the pieces shrink it is resampled along its length to a fixed count of points (`LIMIT_CHAIN`):
  * the partition doubles to a hundred and sixty pieces, and past sixty-five the scene stops marking
  * the joins, so the chain arrives as the smooth curve the limit is, at a fixed cost. */
 chain:Vec[]|null;
 /** Whether the chain is drawn beside the net arrow rather than along it, decided once for the whole
  * stage from EVERY piece's field (see `chainBeside`) -- not from the links laid so far. With one
  * link, or none of the net arrow shown yet, any chain is "collinear" with itself: the ring's first
  * link was drawn ten units off P on a tie, and the whole chain jumped back onto P when the second
  * arrived. Decided by the pieces (see `fieldsCollinear`), a ring, an off-axis rod or an arc is not
  * beside at its default, and a disk, a sheet or the rod seen along its axis is beside from its first
  * link -- as is a short rod seen from far away, whose chain would otherwise hide in the net arrow. */
 chainBeside:boolean;
};
export type RunSceneInput={
 stage:string; kind:BodyKind; closed:boolean; n:number; selected:number;
 /** The chosen stretch as a range of `at`'s parameter, where it is not the whole piece `selected`. */
 selectedSpan?:readonly [number,number]|null;
 /** The point a fraction t of the way along the charge -- for a surface, the radius it has
  * reached as x. The same function the sampler partitions by, so a piece drawn here is exactly
  * the piece being summed. */
 at:(t:number)=>Vec;
 /** The partner: a whole piece, the arc straight across, a stretch given as a range of `at`'s parameter
  * (the ring's half piece straight across another), or none. */
 partner:number|'across'|{lo:number;hi:number}|null;
 weights:readonly number[];
 /** The stretches of a wire already in the sum, as ranges of `at`'s parameter, where the sum takes pieces in
  * by halves (the ring's mirror pairs); `weights` then say only which pieces are in whole. */
 added?:readonly (readonly [number,number])[]|null;
 summing:boolean;
 continuum:number; split:number;
 /** One piece's field, its partner's, and the two split into parts, in newtons per coulomb;
  * `scale` turns them into world metres at the figure's own magnification. Null when the stage
  * draws no single piece's arrow. */
 arrows:null|{scale:number;field:Vec;keep:Vec;drop:Vec;partner:Vec|null;partnerKeep:Vec;partnerDrop:Vec;components:boolean;cancelled:number;
  /** Where they start, as an offset from P in world metres; and how much of the parts along the axis is still
   * to be taken into the sum (they go at nothing). `fade` is given only while a mirror pair goes into the sum,
   * and marks the arrows as that pair: how strongly its whole arrows are drawn follows from `cancelled`. */
  from?:Vec;fade?:number};
 /** Every piece's field and the net arrow's scale, while the sum is being drawn. */
 chain:null|{scale:number;fields:readonly Vec[];weights:readonly number[]};
};
const scaled=(v:Vec,k:number):Vec=>({x:v.x*k,y:v.y*k,z:v.z*k});
const ORIGIN:Vec={x:0,y:0,z:0};
/** How many points the chain is drawn with while the pieces shrink: one more than the scene's
 * cut-off for marking joins, so it is always a curve there and never a necklace of beads. */
export const LIMIT_CHAIN=66;
/** The same polyline through `count` points evenly spaced along its length, its two ends exactly
 * where they were. Shorter chains are filled in along their own links, which changes nothing about
 * their shape; longer ones lose only detail far below a pixel. */
export function resample(path:readonly Vec[],count:number):Vec[]{
 if(path.length<2||count<2)return path.slice();
 const total=polylineLength(path);
 if(!(total>0))return path.slice();
 const out:Vec[]=[path[0]];
 let i=1,walked=0;
 for(let k=1;k<count-1;k++){
  const s=total*k/(count-1);
  while(i<path.length-1){
   const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
   if(walked+d>=s)break;
   walked+=d;i++;
  }
  const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),f=d>0?Math.max(0,Math.min(1,(s-walked)/d)):0;
  out.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f});
 }
 out.push(path[path.length-1]);
 return out;
}
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
 const across=input.partner==='across',span=typeof input.partner==='object'&&input.partner?input.partner:null;
 // The same choices the flat figure makes for its pieces' classes and opacities: the chosen piece
 // and its partner are lit; while summing, what is in the sum is coloured and what is still to come
 // waits faintly; while one piece is being explained, every other piece steps back.
 const tones=Array.from({length:n},(_,i):RunTone=>{
  if(i===selected||i===partnerIndex)return 'lit';
  if(stage==='add')return summing&&Math.abs(weights[i]??0)>0?'added':'dim';
  if(stage==='one'||stage==='cancel')return 'dim';
  return 'idle';
 });
 const partner=surface||(!across&&!span&&partnerIndex===null)?null
  :span?{path:stretch(at,span.lo,span.hi,n),across:true,index:null}
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
 // A PIECE ON P'S OWN LINE IS ITS OWN MIRROR, AND HAS NO PARTNER. Cut an odd number of ways, the middle
 // piece of the bisector, the infinite line and the arc sits level with P, and the mirror rule hands it
 // back itself. The body was already left out for it, but its arrows were not: the scene laid a second,
 // lighter copy of ΔE over the piece's own and stacked a second ΔE_x on the first, tip to tail -- so the
 // figure said one piece gives 2ΔE_x, when it has nothing to pair with and counts once. A reader gets
 // there by picking the piece nearest P. So such a piece is drawn exactly as a piece without a partner.
 const own=typeof input.partner==='number'&&input.partner===selected;
 const a=input.arrows&&own?{...input.arrows,partner:null}:input.arrows;
 // Exactly the flat figure's choices. With a partner, the dropped parts are drawn in the pair, where
 // they are seen to shrink away, whether or not the stage splits the arrow into parts -- a second,
 // full-length copy of the sideways part used to outlive the cancellation it was showing. Without
 // one, the dropped part is drawn only when the stage asks for the parts.
 // A mirror pair going into the sum carries how much of it is still to be taken in; the merge is kept as a
 // fraction (see `keptSpans`), where it used to be cut to a yes or no at its very end.
 const from=a?.from??ORIGIN,pair=a?.fade!==undefined,taken=pair?Math.max(0,Math.min(1,1-(a!.fade??1))):0,gone=taken>=1-1e-3;
 // The pair's whole arrows go as their parts across do, at the flat figure's rate (see ChargeDiagram's `pairDraw`).
 const whole=a&&pair?Math.max(0,Math.min(1,1-1.25*(a.partner?a.cancelled:0))):1;
 const arrows:RunArrows|null=a&&!tiny(a.field)?{
  keep:a.components&&!gone?scaled(a.keep,a.scale):null,
  dropFrom:from,
  drop:a.partner?scaled(a.drop,a.scale*(1-a.cancelled)):a.components?scaled(a.drop,a.scale):null,
  partner:a.partner?scaled(a.partner,a.scale):null,
  partnerFrom:a.partner?from:null,
  partnerSurvivor:a.partner&&a.components&&!gone?scaled(a.partnerKeep,a.scale):null,
  partnerDrop:a.partner?scaled(a.partnerDrop,a.scale*(1-a.cancelled)):null,
  cancelled:a.partner?a.cancelled:0,
  from,whole,pair,taken,
  // As the flat figure draws the pair: the piece's whole arrow only beside a mirror's.
  pieceWhole:pair&&a.partner&&whole>0?scaled(a.field,a.scale):null,
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
  else if(stage==='limit')chain=resample(chain,LIMIT_CHAIN);
 }
 const selectedPath=input.selectedSpan&&!surface?stretch(at,input.selectedSpan[0],input.selectedSpan[1],n):null;
 const parts=surface?pieces.map(()=>null):pieceParts(input,n,selected,tones);
 // What is drawn as in the sum and as lit, as shares of the charge.
 let added=0;
 tones.forEach((tone,i)=>{const own=parts[i];added+=own?own.filter(q=>q.tone==='added').reduce((s,q)=>s+q.hi-q.lo,0):tone==='added'?1/n:0;});
 const sel=input.selectedSpan&&!surface?Math.abs(input.selectedSpan[1]-input.selectedSpan[0]):1/n;
 const lit=sel+(partnerIndex!==null||across?1/n:span?Math.abs(span.hi-span.lo):0);
 return {stage,kind,closed,pieces,tones,parts,spans:{added,lit},selected,selectedPath,partner,open,split,seams,filled,arrows,chain,chainBeside:!!chain&&fieldsCollinear(input.chain!.fields)};
}
/** Each wire piece's stretches by tone, where it has more than one (see `RunPart`): the chosen stretch, where
 * it is not the whole chosen piece, is lit; whatever lies in a stretch already summed is coloured as added; the
 * rest keeps the tone a piece not chosen would have. */
function pieceParts(input:RunSceneInput,n:number,selected:number,tones:readonly RunTone[]):(RunPart[]|null)[]{
 const sums=input.added?.length?input.added:null,own=input.selectedSpan??null;
 if(!sums&&!own)return tones.map(()=>null);
 // A closed wire runs once round per unit of the parameter, and a stretch straight across can run past 1.
 const shifts=input.closed?[-1,0,1]:[0];
 const ranges=(list:readonly (readonly [number,number])[])=>list.flatMap(([lo,hi])=>shifts.map(k=>[Math.min(lo,hi)+k,Math.max(lo,hi)+k] as const));
 const summed=sums?ranges(sums):[],chosen=own?ranges([own]):[];
 const inside=(t:number,list:readonly (readonly [number,number])[])=>list.some(([lo,hi])=>t>lo&&t<hi);
 const plain=(i:number):RunTone=>input.stage==='add'?input.summing&&Math.abs(input.weights[i]??0)>0?'added':'dim':input.stage==='one'||input.stage==='cancel'?'dim':'idle';
 return tones.map((tone,i)=>{
  const lo=i/n,hi=(i+1)/n,mine=own&&i===selected;
  // A lit piece the run names whole (the chosen piece, the partner) is drawn whole.
  if(tone==='lit'&&!mine)return null;
  const cuts=new Set([lo,hi]);
  for(const [a,b] of [...summed,...(mine?chosen:[])])for(const c of [a,b])if(c>lo+1e-9&&c<hi-1e-9)cuts.add(c);
  const edges=[...cuts].sort((x,y)=>x-y),out:RunPart[]=[];
  for(let k=0;k+1<edges.length;k++){
   const a=edges[k],b=edges[k+1],mid=(a+b)/2;
   const t:RunTone=mine&&inside(mid,chosen)?'lit':inside(mid,summed)?'added':mine?plain(i):tone;
   const last=out[out.length-1];
   if(last&&last.tone===t){last.hi=b;continue;}
   out.push({lo:a,hi:b,path:[],tone:t,head:false,tail:false});
  }
  if(out.length===1&&out[0].tone===tone)return null;
  for(const q of out){q.path=stretch(input.at,q.lo,q.hi,n);q.head=Math.abs(q.lo-lo)<1e-9;q.tail=Math.abs(q.hi-hi)<1e-9;}
  return out;
 });
}
/** Whether the chain of the whole partition, laid head to tail, would be drawn inside the arrow it adds
 * up to: every link pointing forward along the sum, and the whole chain never straying more than `stray`
 * of the sum's length from the sum's line.
 *
 * DECIDED BY HOW FAR THE CHAIN STRAYS, NOT BY THE ANGLE OF ITS LINKS. It was every link within two
 * degrees of the sum -- and a short rod seen from far off, a small ring from high above, a narrow arc or
 * a short ramp have links three to twelve degrees off it, while the whole chain strays only two to four
 * per cent of the net arrow's length from its line: two to four pixels on a hundred-pixel arrow, inside
 * its shaft. Add them up then showed one arrow with bead nubs on it, and the stage's picture -- the
 * pieces' arrows laid tip to tail -- was gone. A chain that strays further than five per cent is seen
 * beside the net arrow where it is; the default rods, ring and arc stray seven to fifty. */
export function fieldsCollinear(fields:readonly Vec[],stray=.05):boolean{
 const sum=fields.reduce((a,f)=>({x:a.x+f.x,y:a.y+f.y,z:a.z+f.z}),{x:0,y:0,z:0}),n=Math.hypot(sum.x,sum.y,sum.z);
 if(!(n>1e-12))return false;
 let c={x:0,y:0,z:0},links=0;
 for(const f of fields){
  const l=Math.hypot(f.x,f.y,f.z);
  if(l<1e-12*n)continue;
  if(f.x*sum.x+f.y*sum.y+f.z*sum.z<=0)return false;
  c={x:c.x+f.x,y:c.y+f.y,z:c.z+f.z};links++;
  const off=Math.hypot(c.y*sum.z-c.z*sum.y,c.z*sum.x-c.x*sum.z,c.x*sum.y-c.y*sum.x)/n;
  if(off>stray*n)return false;
 }
 return links>0;
}
/** Whether the chain runs along the arrow it adds up to, so that drawn where it is it would vanish
 * inside that arrow's shaft.
 *
 * Where every piece pushes along one line -- above a disk or a sheet, down the axis of a rod -- the
 * head-to-tail chain is collinear with the net arrow, and in the scene it was laid exactly inside
 * the net arrow's thicker shaft: Add them up showed one dark shaft with a few beads on it, read as
 * ticks on the net arrow, on the very lessons that open in 3D. The flat figure moves such a chain
 * to one side for that reason; the scene does the same, by this test. `net` is the net arrow when
 * it is shown, which keeps the answer steady while the chain is still growing; otherwise the chain's
 * own end stands in for it. Every link must lie within `degrees` of it, pointing the same way. */
export function chainBeside(chain:readonly Vec[]|null|undefined,net:Vec|null|undefined,degrees=2):boolean{
 if(!chain||chain.length<2)return false;
 const first=chain[0],last=chain[chain.length-1];
 const along=net&&Math.hypot(net.x,net.y,net.z)>1e-12?net:{x:last.x-first.x,y:last.y-first.y,z:last.z-first.z};
 const n=Math.hypot(along.x,along.y,along.z);
 if(!(n>1e-12))return false;
 const sin=Math.sin(degrees*Math.PI/180);
 let links=0;
 for(let k=0;k+1<chain.length;k++){
  const a=chain[k],b=chain[k+1],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=Math.hypot(dx,dy,dz);
  if(l<1e-12)continue;
  const dot=(dx*along.x+dy*along.y+dz*along.z)/(l*n);
  const cx=dy*along.z-dz*along.y,cy=dz*along.x-dx*along.z,cz=dx*along.y-dy*along.x;
  if(dot<=0||Math.hypot(cx,cy,cz)/(l*n)>sin)return false;
  links++;
 }
 return links>0;
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
 * Each side of a cut gives up half its width, and no piece gives up more than `most` of its own
 * length at either end -- a fifth, unless the caller says less: on the unbounded lines the pieces differ
 * in length by a factor of hundreds, and one shared gap would cut the short ones away entirely. The cut
 * in the middle gives up at most `midMost` of the whole piece each side, which the caller sets to what
 * each half's end may give up once the piece has split, so the cut does not jump as it becomes a real
 * one. See `cutShare`. */
export function cutPiece(path:readonly Vec[],head:number,tail:number,mid=0,most=.2,midMost=most/2):Vec[][]{
 if(path.length<2)return [];
 const length=polylineLength(path);
 const side=(g:number)=>Math.min(Math.max(0,g)/2,length*most);
 if(mid>1e-6&&path.length>=3&&path.length%2===1){
  const m=(path.length-1)/2,inner=Math.min(mid/2,length*midMost);
  return [trim(path.slice(0,m+1),side(head),inner),trim(path.slice(m),inner,side(tail))].filter(p=>p.length>1);
 }
 const out=trim(path,side(head),side(tail));
 return out.length>1?[out]:[];
}
/** HOW MUCH OF ITS LENGTH A PIECE MAY GIVE UP AT EACH END, cut `n` ways. A fifth, until the pieces are many
 * and closing: in Shrink them, with eighty to a hundred and sixty pieces, a fifth at each end left gaps forty
 * to sixty per cent of a piece, and every short lit cylinder between them read as a turn of a coil spring
 * rather than as a piece of a wire whose seams are closing. Past forty pieces each end gives up at most six
 * hundredths, so the cuts are the hairline seams the flat figure draws while the pieces still multiply. */
export const cutShare=(n:number)=>n>40?.06:.2;
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
