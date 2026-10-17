import {K} from './constants';
import {coulombSum,pointSample,type Distribution} from './types';
import type {Params} from '../problems/types';
/** THE ROD WITH P OFF ITS BISECTOR. A uniform rod of length L on the y-axis, P = (r, 0) out from it, the origin at
 * P's foot on the rod's line, and P a height h above the rod's middle: the rod runs from y₁ = −h − L/2 to
 * y₂ = L/2 − h. `height` is h, held to |h| ≤ L/2 so P stays level with some part of the rod: h = 0 is the bisector's
 * rod and h = −L/2 the frame of the rod level with its lower end, y₁ = 0 and y₂ = L.
 *
 * E_x = (kλ/r)(sin α₂ − sin α₁) and E_y = (kλ/r)(cos α₂ − cos α₁), with sin αᵢ = yᵢ/√(yᵢ² + r²): α is signed like y.
 * Since y₁ ≤ 0 ≤ y₂ the two sines never cancel; the two cosines do, both nearly one far away, so E_y is written
 * without the loss: 1/h₂ − 1/h₁ = (y₁² − y₂²)/(h₁h₂(h₁ + h₂)) = 2hL/(h₁h₂(h₁ + h₂)), and E_y = 2kQh/(h₁h₂(h₁ + h₂)).
 * Far away that is kQh/r³, the field along the rod of Q gathered at the rod's middle, a height h below P. */
export const offsetEnds=(p:Params)=>{const L=p.size,half=L/2,h=Math.max(-half,Math.min(half,Number.isFinite(p.height)?p.height:0));return{h,y1:-h-half,y2:half-h,L,m:half-Math.abs(h)};};
/** HOW THE ROD IS CUT. The part of the rod that mirrors itself across P's level, from y = −m to m with m the nearer
 * end's distance from that level, is cut on its own, so every piece in it has its mirror piece; the rest, on the far
 * side, is cut on its own too. Their pieces' numbers are shared in proportion to the two parts' lengths, at least two
 * in the mirrored stretch, so it always has a pair, and one in the leftover, wherever each has any length, and they are worked out from the reader's own N (`slices`): the run's Shrink
 * them doubles N, and doubling the reader's split keeps every cut where it was, a mid-cut added in each piece. A count
 * that is not a doubling of the reader's N -- the field's fine cut, the tests' -- is split in proportion afresh.
 *
 * Returned in order up the rod: the lower part first. `mirror` is where the mirrored part's pieces start and how many
 * there are; the leftover's are the others. */
export function offsetCut(p:Params,n:number){
 const {h,y1,y2,L,m}=offsetEnds(p),count=Math.max(1,Math.round(n));
 const base=Number.isFinite(p.slices)?Math.max(3,Math.round(p.slices)):0;
 const k=base>0&&count%base===0&&Number.isInteger(Math.log2(count/base))?count/base:1,of=count/k;
 const left=L-2*m,share=(N:number)=>m<=1e-9*L?0:left<=1e-9*L?N:Math.max(Math.min(2,N-1),Math.min(N-1,Math.round(N*2*m/L)));
 // One piece is the whole rod, its middle not P's level unless h = 0: no stretch of it is its own mirror.
 if(count<2)return {h,y1,y2,L,m,count,cut:y2,lower:count,mirror:{start:0,count:0},leftover:count};
 const mirrored=share(of)*k,leftover=count-mirrored;
 // P above the middle (h > 0): the leftover is below the mirrored part; below it, above.
 const below=h>0?leftover:mirrored,lowerLength=h>0?left:2*m;
 const cut=y1+lowerLength;
 return {h,y1,y2,L,m,count,cut,lower:below,mirror:{start:h>0?leftover:0,count:mirrored},leftover};
}
/** The point a fraction t of the way along the cut: piece i runs from t = i/N to (i + 1)/N, so the two parts' pieces
 * are each even in length and the map from t to y is kinked where they meet. */
export function offsetAt(c:ReturnType<typeof offsetCut>,t:number):number{
 const tc=c.lower/c.count;
 if(c.lower<=0)return c.cut+(c.y2-c.cut)*t;
 if(c.lower>=c.count)return c.y1+(c.cut-c.y1)*t;
 return t<=tc?c.y1+(c.cut-c.y1)*t/tc:c.cut+(c.y2-c.cut)*(t-tc)/(1-tc);
}
/** And back: the fraction t at which the cut reaches the height y, held to the rod. */
export function offsetT(c:ReturnType<typeof offsetCut>,y:number):number{
 const tc=c.lower/c.count,v=Math.max(c.y1,Math.min(c.y2,y));
 if(c.lower<=0)return c.y2>c.cut?(v-c.cut)/(c.y2-c.cut):0;
 if(c.lower>=c.count)return c.cut>c.y1?(v-c.y1)/(c.cut-c.y1):0;
 return v<=c.cut?tc*(v-c.y1)/(c.cut-c.y1):tc+(1-tc)*(v-c.cut)/(c.y2-c.cut);
}
/** A piece's mirror across P's level, or −1 for a piece of the leftover, or for the middle piece of an odd
 * mirrored part, level with P, which is its own. */
export function offsetPartner(c:ReturnType<typeof offsetCut>,i:number):number{
 const {start,count}=c.mirror;
 if(i<start||i>=start+count)return -1;
 const j=start+count-1-(i-start);
 return j===i?-1:j;
}
export const offset:Distribution={id:'offset',substitutions:{Q:'lambda*L'},
 field(p){const {h,y1,y2,L}=offsetEnds(p),d=p.distance,q=p.charge*1e-9,h1=Math.hypot(y1,d),h2=Math.hypot(y2,d);
  return{x:K*q/(L*d)*(y2/h2-y1/h1),y:2*K*q*h/(h1*h2*(h1+h2)),z:0};},
 quadrature(p,n){const {y1,L}=offsetEnds(p),q=p.charge*1e-9,d=p.distance;return coulombSum(add=>{for(let i=0;i<n;i++){const y=y1+(i+.5)*L/n;add(q/n,d,-y,0);}});},
 // Each piece holds its own stretch's charge, λ times its length, at its middle: the two parts' pieces differ a little
 // in length, so not every piece holds Q/N.
 // Its share of Q is its part's length over its part's count, over L: worked out from the two parts' lengths, not from
 // the difference of its two ends, which lost a digit or two to rounding wherever the rod was scaled.
 sample(p,n){const c=offsetCut(p,n),q=p.charge*1e-9,d=p.distance,lowLen=c.cut-c.y1,highLen=c.y2-c.cut;
  return Array.from({length:c.count},(_,i)=>{const a=offsetAt(c,i/c.count),b=offsetAt(c,(i+1)/c.count),y=c.count===1?-c.h:(a+b)/2,share=i<c.lower?lowLen/c.lower:highLen/(c.count-c.lower);return pointSample({x:0,y,z:0},{x:d,y:0,z:0},q*share/c.L,y);});},
};
