/** Comparing a student's guess at the field against the field.
 *
 * This is deliberately not marking. Nothing here returns right or wrong, a score, or a
 * pass; it returns what is different between two arrows, in the terms the figure already
 * uses — a direction and a length. Committing to a guess and then seeing the answer laid
 * over it is the move that teaches, and it only works if being off is survivable.
 *
 * Sokoloff and Thornton's interactive lecture demonstrations get roughly twice the
 * normalized gain of a lecture from exactly this loop, and the commitment is the active
 * ingredient: a prediction you never made is one you cannot be surprised by. */
export type Plane={x:number;y:number};
export type Comparison={
 /** Unsigned angle between the two arrows, in degrees. 0 when parallel, 180 when opposed. */
 angle:number;
 /** Guess length over true length. 1 is the same length, 2 is twice as long. */
 ratio:number;
 /** True once the arrow is close enough that the remaining difference is not the lesson. */
 aligned:boolean;
 /** No arrow to compare against, because the field really is zero here. */
 vanishing:boolean;
};
const LEN=(v:Plane)=>Math.hypot(v.x,v.y);
/** Below this the field is zero as far as the drawing is concerned, and a direction for it
 * would be noise rather than physics. The ring's centre is the case that matters. */
const ZERO=1e-12;
export function compare(guess:Plane,truth:Plane):Comparison{
 const gl=LEN(guess),tl=LEN(truth);
 if(tl<=ZERO)return {angle:0,ratio:gl<=ZERO?1:Infinity,aligned:gl<=ZERO,vanishing:true};
 if(gl<=ZERO)return {angle:0,ratio:0,aligned:false,vanishing:false};
 const cos=Math.max(-1,Math.min(1,(guess.x*truth.x+guess.y*truth.y)/(gl*tl)));
 const angle=Math.acos(cos)*180/Math.PI,ratio=gl/tl;
 return {angle,ratio,aligned:angle<=8&&ratio>=.8&&ratio<=1.25,vanishing:false};
}
const near=(n:number)=>Math.abs(n-1)<.001;
/** How far round the dial the guess sits, in words a student can check against the figure. */
function turn(angle:number):string{
 if(angle<8)return 'pointing the same way';
 if(angle<30)return `about ${Math.round(angle)} degrees off`;
 if(angle<75)return `${Math.round(angle)} degrees off`;
 if(angle<105)return 'at right angles to it';
 if(angle<165)return `${Math.round(angle)} degrees off, most of the way round`;
 return 'pointing the opposite way';
}
/** How the lengths compare, as a ratio rather than a percentage error, because a ratio is
 * what the two arrows on the figure actually look like. */
function length(ratio:number):string{
 if(near(ratio))return 'the same length';
 if(ratio===0)return 'no length at all';
 if(!Number.isFinite(ratio))return 'a length where the field has none';
 if(ratio>1)return ratio>=1.9?`${ratio.toFixed(1)} times too long`:`${Math.round((ratio-1)*100)}% too long`;
 return ratio<=.55?`${(1/ratio).toFixed(1)} times too short`:`${Math.round((1-ratio)*100)}% too short`;
}
/** One sentence describing the gap. Never says correct, wrong, good or bad. */
export function describe(guess:Plane,truth:Plane):string{
 const c=compare(guess,truth);
 if(c.vanishing)return c.aligned
  ?'You drew no arrow, and there is no field here to draw — every contribution has a partner cancelling it.'
  :'The field here is zero: every contribution has a partner pointing the other way, so the arrows cancel exactly.';
 if(c.ratio===0)return 'No arrow to compare yet. Drag one out from P and the field will be drawn over it.';
 if(c.aligned)return 'Your arrow and the field agree, in direction and in length.';
 const sameWay=c.angle<8;
 if(sameWay)return `Right direction. Your arrow is ${length(c.ratio)}.`;
 if(near(c.ratio))return `Right length. Your arrow is ${turn(c.angle)}.`;
 return `Your arrow is ${turn(c.angle)}, and ${length(c.ratio)}.`;
}
/** The component of the guess along an axis the geometry cancels. A rod on its bisector has
 * no field along the rod, and expecting one is the misconception this whole family of
 * problems exists to dislodge — so it is worth naming when the guess contains it. */
export function strayComponent(guess:Plane,truth:Plane):number{
 const tl=LEN(truth);
 if(tl<=ZERO)return LEN(guess);
 const unit={x:truth.x/tl,y:truth.y/tl};
 const along=guess.x*unit.x+guess.y*unit.y;
 return Math.hypot(guess.x-along*unit.x,guess.y-along*unit.y);
}
