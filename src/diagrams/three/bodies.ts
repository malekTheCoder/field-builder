import type {ChargeSample} from '../../distributions/types';
import {openingCamera} from '../camera';
import {PLOT} from '../vectorfield';
/** What the 3D layer needs to know about the shape it is drawing, worked out from the same
 * samples the physics sums. Pure, so the decisions can be tested without a GPU. */
export type BodyKind='wire'|'disk'|'sheet';
/** Annulus radii for a surface, thinned to something a figure can actually show.
 *
 * A disk is a stack of rings, and that is the entire claim its lesson makes — but the
 * partition can run to two hundred, and two hundred circles is a grey wash rather than a
 * decomposition. Above a readable count the rings are sampled evenly so the spacing still
 * reads as uniform, and the selected one is always kept: it is the one being pointed at. */
export function visibleRadii(samples:readonly ChargeSample[],selected:number,limit=42):number[]{
 const radii=samples.map(s=>Math.abs(s.coordinate));
 if(radii.length===0)return [];
 const keepIndex=Math.max(0,Math.min(radii.length-1,Math.round(selected)));
 if(radii.length<=limit)return radii;
 const stride=Math.ceil(radii.length/limit);
 return radii.filter((_,i)=>i%stride===0||i===keepIndex);
}
/** How far a flat surface reaches. A disk stops at its own edge; a sheet has no edge, so it
 * runs past the frame and is faded out rather than given a false rim.
 *
 * A sheet used to be drawn at one and a half frames across, at a flat opacity, with a hard
 * circular edge. Past the frame the reader never saw the edge -- but they did see a slab of
 * even colour from corner to corner, which reads as an orange background rather than as a
 * plane going away from you. It is drawn a little smaller now and dissolved with distance
 * instead, so the picture's subject is the field and the sheet is its ground. */
export function bodyReach(kind:BodyKind,radius:number,frameWorld:number):number{
 if(kind==='sheet')return Math.max(frameWorld*.95,radius*3,4);
 return Math.max(.05,radius);
}
/** Where a sheet stops being solid and where nothing of it is left, as fractions of how far
 * it is drawn. The ramp begins inside the frame on purpose: a surface that only faded out
 * past the edge of the picture would still read as a slab filling it. */
export const SHEET_FADE={inner:.22,outer:.8};
/** How strongly the half of each sheet line under the plane is drawn, against 1 for the half above it:
 * enough to read as the field on the far face, little enough that the line is plainly seen to start at
 * the plane rather than run through it. See `sheetColumns`. */
export const SHEET_UNDER=.45;
/** A smooth 1 → 0 ramp -- solid up to `inner`, gone by `outer`.
 *
 * Every edge the scene cannot honestly draw uses this one curve: the sheet, the ground grid
 * and the axes all stop by dissolving, so the frame reads as a window onto something larger
 * rather than as the boundary of a small flat world. */
export function fadeOut(r:number,inner:number,outer:number):number{
 if(!(outer>inner))return r<=outer?1:0;
 const t=Math.min(1,Math.max(0,(r-inner)/(outer-inner)));
 return 1-t*t*(3-2*t);
}
/** How much of the sheet is left past the depth where it would rise to P: a trace, not nothing --
 * the plane goes on, and a plane that simply stopped would be a false edge on a sheet that has none. */
export const SHEET_FAR_LOW=.18;
/** THE SHEET'S FAR SIDE, PUSHED BACK. A flat plane seen from above rises up the screen the further
 * away it is: at the opening camera, any part of the sheet more than about 1.5 z away along the
 * line of sight is drawn at P's height or above it. Painted at full strength there, the plane
 * passed behind P exactly level with it, and P read as a point lying IN the sheet -- the one lesson
 * whose whole argument is that P is lifted off it.
 *
 * So the plane dims with depth, as far things do: solid while it is drawn clearly below P, faded
 * to a trace by the depth at which it would reach P's height. Depth is measured along the camera's
 * far direction in the plane, in metres from O. The pitch is never taken as higher than the opening
 * camera's, so tipping the view up does not pull the fade in under P; tipping it down, toward edge
 * on, lets the plane run further before it fades, because then it rises more slowly. */
export function sheetFarFade(height:number,pitch:number,unit:number,opening=openingCamera('sheet').pitch):{inner:number;outer:number}{
 const p=Math.max(.05,Math.min(pitch,opening)),perMetre=Math.sin(p)*unit;
 const rise=Math.cos(p)*Math.abs(height)*unit;
 // Solid until it is drawn 50 px below P; a trace by 20 px below. The span never closes to under
 // 30 px of screen, so a P set low over the sheet still gets a ramp rather than an edge.
 const inner=Math.max(0,(rise-50)/perMetre);
 return {inner,outer:Math.max(inner+30/perMetre,(rise-20)/perMetre)};
}
/** What is left of something on the sheet at `depth` metres along the far direction: all of it
 * near, `fade.low` (by default SHEET_FAR_LOW) far. */
export type FarFade={inner:number;outer:number;low?:number};
export const farAlpha=(depth:number,fade:FarFade)=>{const low=fade.low??SHEET_FAR_LOW;return low+(1-low)*fadeOut(depth,fade.inner,fade.outer);};
/** THE GAP THE CHARGE LEAVES ROUND P WHERE IT PASSES BEHIND IT, in units of the figure from P on the screen -- the
 * drafting gap a far line is given where it passes behind a near point.
 *
 * Tipping the view up brought the far side of the charge onto P in every lesson that stands P over it: the
 * sheet's chosen ring and the summed shading under P and the foot of the sum, the ring's far arc through P
 * and the chain, the disk's far rim through P's halo. P read as lying on the charge, or in it -- the one
 * thing each of those lessons says it is not. A translucent surface keeps `low` of itself within `inner`
 * and all of it from `outer`, smoothly between; an opaque wire, which cannot be faded, is cut clean within
 * `hard`. Wide enough to clear P's halo and the root of the net arrow with paper round them; narrow enough
 * that the charge is plainly still there, going on behind. The scene's shader draws exactly this curve
 * (see FieldStage's `patch`); `behindGap` is it, for the tests.
 *
 * IN UNITS OF THE FIGURE, NOT CSS PIXELS. In pixels the gap was the same size on a phone, where the whole
 * figure is drawn at half the scale, so there it ate twice as much of the charge: a ring tipped up lost a
 * quarter of its far arc and read as an open C, and the disk's chosen washer lost its whole far half.
 * Measured in the figure's own units it is the same share of the picture at any width (on a laptop a unit
 * is about a CSS pixel, so it is what it was there).
 *
 * AND RAMPED IN DEPTH, NOT CUT. Whether a point was behind P was a yes or no at one depth, and on a flat
 * surface the points at one depth lie on a straight line across the screen -- so the soft round gap had a
 * ruled floor wherever P stood near the surface or the view was tipped: a half-disc window punched in the
 * disk, the washer drawn as a U. Now the gap comes in over `depth` metres behind that depth (see
 * `gapDepth`), the outer radius' worth, so it has no edge in any direction. */
export const BEHIND_GAP={inner:22,outer:38,low:.08,hard:22} as const;
/** How much of the gap applies to a point `behind` metres further from the camera than the depth the gap
 * starts at, over a ramp `depth` metres deep: none in front of it, all of it a ramp's depth behind. */
export function gapDepth(behind:number,depth:number):number{
 if(!(depth>0))return behind>0?1:0;
 const t=Math.min(1,Math.max(0,behind/depth));
 return t*t*(3-2*t);
}
/** HOW MUCH OF THE GAP A SURFACE TAKES, from how far P stands off it: `height` is P's distance from the plane
 * in units of the figure. None while P is within the gap's outer radius of the plane, all of it from twice
 * that, smoothly between. Only a surface's: an opaque wire is cut as before.
 *
 * The gap is for P well off the charge with the charge's far side brought up onto it on the screen. With P
 * half a metre over a disk, the face under P on the screen is a few figure units behind it -- and the nearest,
 * strongest charge there is: the inner fifth of the disk gives half of E at P. The gap whitened a patch the
 * size of P's halo in the middle of a uniformly charged disk and the washer's far wall faded into it, so the
 * charge that matters most was drawn as missing. P hovering close over the face now leaves it whole, in every
 * view; P at its default height keeps the whole gap, in every view, the view from straight above included.
 * (P's height on the SCREEN would not do: from straight above it is nothing at any height.) */
export function gapLift(height:number):number{
 const t=Math.min(1,Math.max(0,height/BEHIND_GAP.outer-1));
 return t*t*(3-2*t);
}
/** How far behind P, in metres, the gap starts: twice the reach of P's halo (4.2 wire radii). Close under P
 * the charge is NEAR P, not behind it -- the sheet's smallest ring with P half a metre up is right under P on
 * the screen, and must stay. */
export const gapStart=(wr:number)=>2*4.2*wr;
/** How deep the gap's ramp in is, in metres, where `px` metres is one unit of the figure: the outer radius'
 * worth, so the gap comes in as gently in depth as it does across the screen. */
export const gapRamp=(px:number)=>BEHIND_GAP.outer*px;
/** What is left of a point of the charge `distance` figure units from P on the screen, with `behind` the
 * share of the gap its depth gives it (see `gapDepth`; true is all of it, false none). An opaque wire is
 * cut once it is more than half behind; a translucent part keeps `low` of itself at the middle, or `keep`
 * where it is the chosen piece (PIECE_FAR_LOW). */
export function behindGap(distance:number,behind:boolean|number,wire=false,gap:{inner:number;outer:number;low:number;hard:number}=BEHIND_GAP,keep:number|null=null):number{
 const k=behind===true?1:behind===false?0:Math.min(1,Math.max(0,behind));
 if(!(k>0))return 1;
 if(wire&&keep===null)return k>.5&&distance<gap.hard?0:1;
 const t=Math.min(1,Math.max(0,(distance-gap.inner)/(gap.outer-gap.inner))),low=keep??gap.low;
 return 1+(low+(1-low)*t*t*(3-2*t)-1)*k;
}
/** The chosen ring dims less than the plane under it: it is the piece being talked about, and its
 * far arc must still be plainly there -- only plainly behind P. And the same in the gap behind P: the
 * chosen piece, a wire's included, is dimmed to this there and never erased -- the disk's washer with P
 * just above it was drawn as a U, the piece the stage is about with half of it cut away. */
export const PIECE_FAR_LOW=.42;
/** AN OUTLINE ON THE SHEET GOES ENTIRELY ONCE IT IS BEHIND P: the walls of the chosen ring and the
 * circles the sheet is cut along. A tint dimmed to a trace stays a tint, but a line dimmed to the same
 * fraction is still a line -- and the outermost ring, which runs from s4 to the truncation, drew its far
 * wall at .42 as a strong arc right across the picture above P, so P read as sitting inside a ring of
 * the sheet in the very stage that sums the rings. The flat figure drops the far outlines for the same
 * reason. The plane keeps its trace (SHEET_FAR_LOW) and the ring's face its PIECE_FAR_LOW; the outline
 * is solid where it is drawn below P and gone by the depth at which it would rise level with it. */
export const OUTLINE_FAR_LOW=0;
/** HOW MUCH OF THE SHEET'S SUMMED SHADING IS DRAWN at a point `across` metres to the side of O on the
 * screen and `depth` metres along the camera's far direction: a disc spreading over the plane, not a
 * card. Faded only with depth, as the plane is, the shading -- twice the plane's strength -- ended in a
 * straight horizon just under P, and at its sides in the window's own edges: a pink rectangle with P
 * sitting on its top edge. So it is faded by an ellipse about O instead: out to `wide` metres to either
 * side, which keeps it inside the window, and only out to the plane's own far fade ahead of it (see
 * `sheetFarFade`), so it is gone by the depth at which the plane would rise to within 20 px of P. Its
 * edge is then a curve, drawn on the plane in perspective, and nothing of it is level with P. */
export function fillFade(across:number,depth:number,wide:number,far:FarFade):number{
 const m=Math.hypot(across/Math.max(1e-6,wide),depth/Math.max(1e-6,depth>0?far.outer:wide));
 return fadeOut(m,.55,1);
}
/** HOW STRONGLY THE SUMMED SHADING IS LAID, at its strongest: on the sheet, and a fifth more on the disk.
 * In the dark it is barely more than half as strong. At the light theme's strength, lit and without a
 * glow, it was the largest and brightest thing in the dark figure -- a grey-brown slab over the lower
 * half of the picture, the field lines faint through it, brighter than the plane at rest. */
export const fillAlpha=(dark:boolean)=>dark?.24:.42;
/** The far fade for one part of something lying on the sheet: its face, or its outline. */
export const pieceFade=(far:FarFade,part:'face'|'outline'):FarFade=>({...far,low:part==='face'?PIECE_FAR_LOW:OUTLINE_FAR_LOW});
/** How far the axes and the ground grid run, in whole metres: past the field, past the frame,
 * and never less than a few. Whole metres so the ticks land on round numbers. */
export const frameExtent=(reach:number,frameWorld:number)=>Math.ceil(Math.max(reach*1.15,frameWorld*.6,3));
/** Opacity for the flat surfaces. The old disk was drawn near-black and read as a hole
 * punched in the page; a charged surface should look like a surface you can see through to
 * the construction lines behind it. A sheet is quieter still: it covers the whole picture,
 * so what would be a reasonable tint on a disk is a wash over everything here. */
export const surfaceOpacity=(kind:BodyKind)=>kind==='sheet'?.22:.42;
/** The points a wire's body runs through: the sample positions, thinned so the tube stays
 * cheap when the partition is fine. The ends are always kept so the wire is never shortened. */
export function wirePath(samples:readonly ChargeSample[],limit=160):{x:number;y:number;z:number}[]{
 if(samples.length<2)return samples.map(s=>s.position);
 const stride=Math.ceil(samples.length/limit);
 const out=samples.filter((_,i)=>i%stride===0).map(s=>s.position);
 const last=samples[samples.length-1].position;
 if(out[out.length-1]!==last)out.push(last);
 return out;
}
/** HALF THE THICKNESS OF A SURFACE'S CHOSEN RING, in metres, for a piece as thick as `thick` would make
 * it: no thicker than a sixth of the ring's width, and never so thin that its walls are under a pixel and a
 * half tall (`px` metres is one unit of the figure), so they still catch the light. At a fixed thickness the
 * sheet's innermost ring with P half a metre up -- from O out to sixteen centimetres -- stood under P as a
 * lit cylinder, a puck sitting on the sheet rather than a piece of it. */
export const washerHalf=(thick:number,inner:number,outer:number,px:number)=>Math.max(.75*px,Math.min(thick*.62,.15*(outer-inner)));
/** Wire thickness in world units. Thin enough to read as a line of charge, thick enough to
 * take a highlight — and growing a little with the scene so it does not vanish on a big one. */
export const wireRadius=(reach:number)=>.036+.008*Math.min(3,reach/2);
/** Whether a body is drawn writing depth. A wire is a solid tube. A disk and a sheet are translucent,
 * and a translucent surface that writes depth deletes whatever lies behind it instead of tinting it:
 * the sheet hid every arrow and every line of the half-space under it, so its field -- away from
 * the sheet on BOTH sides -- was drawn on one side only. */
export const writesDepth=(kind:BodyKind)=>kind==='wire';
/** An arrowhead's length and half-width, in metres, for an arrow `length` long with a shaft `thick`
 * in radius, where `px` metres is one unit of the figure's viewBox. At least seven shaft radii and
 * nine units of the figure long, so it reads at any zoom; never more than .45 of its arrow, but for the
 * floor below; and at least half again as long as it is wide. The heads were cones about as long as they
 * were wide, and an arrow lying in the plane, seen from above, ended in a dot. */
export function arrowHead(length:number,thick:number,px:number,screen:number=px):{length:number;half:number}{
 const l=Math.min(length*.45,Math.max(thick*7,9*px));
 // A FLOOR FOR SHORT ARROWS, ON THE SCREEN. A head a fixed share of its arrow went to a smudge with it: a mirror pair
 // going into the sum at thirty pieces is a dozen pixels long, and its head was five long and three wide on a desk,
 // half that on a phone -- the width of the shaft, so the arrow read as a stub. So an arrow twelve screen pixels
 // long or more (`screen` metres a pixel) keeps a head at least six long, up to half the arrow, reaching two and a
 // half pixels each side of the shaft's line where that leaves it half again as long as wide: the flat figure's floor.
 if(!(length>=12*screen))return {length:l,half:Math.min(thick*2.2,l*.32)};
 const floor=Math.max(l,Math.min(6*screen,length*.5));
 return {length:floor,half:Math.max(Math.min(thick*2.2,floor*.32),Math.min(2.5*screen,floor/3))};
}
/** How strongly each point of a field line is drawn: full near the charge, fading out by a little
 * past the field's reach -- measured from the CHARGE, not from O. From O, the field of an infinite
 * line was drawn weaker along the line, which its symmetry forbids, and the axial rod's field was
 * faded round P and full at the rod's far end. `away` is the distance to the charge's body. */
export function lineStrength(away:number,reach:number):number{
 const far=Math.min(1,Math.max(0,(away-reach*.25)/(reach*1.1)));
 return 1-far*far;
}
/** HOW FAR THE CHAIN IS MOVED ASIDE FROM THE NET ARROW, in units of the figure, when it is `shown` units
 * long on the screen: not at all under `from` -- a stub on P moved aside reads as a sideways field at P --
 * and then three tenths of its length, never more than `most`. See FieldStage's `layChain`. */
export const CHAIN_ASIDE={from:30,most:10,share:.3} as const;
export const chainAside=(shown:number)=>shown<CHAIN_ASIDE.from?0:Math.min(CHAIN_ASIDE.most,CHAIN_ASIDE.share*shown);
/** HOW FAR THE SCENE DRAWS A CHARGE'S FIELD: its reach, and never short of P. `reach` is the figure's own
 * (a charge's size, a little over), and both the trace and the fade (see `lineStrength`) were tied to it
 * alone -- so with a rod or a ring a metre or two across and P five or six metres off, every line had
 * faded to nothing two to four metres short of P. The net arrow stood in empty space, and the picture
 * said the field does not reach the point the lesson is about, and that field lines end in mid-air; the
 * flat view of the same state runs its lines on past P. So the field is drawn out to 1.3 times P's
 * distance from the charge where that is further, rounded UP to a power of 1.25 so that dragging P
 * retraces only at each step, not on every frame. `away` is P's distance from the charge's body. */
export function lineReach(reach:number,away:number):number{
 const want=1.3*away;
 if(!(want>reach))return reach;
 return Math.max(reach,1.25**Math.ceil(Math.log(want)/Math.log(1.25)-1e-9));
}
type Point3={x:number;y:number;z:number};
/** WHERE THE SIGN IS WRITTEN ON A WIRE IN SPACE: points along the charge at equal steps of |dq|, so a
 * uniform wire is marked evenly and the ramp's marks crowd toward its heavy end and thin out toward
 * λ = 0 -- the density that lesson is about, which the tube alone drew as uniform. Only the part of
 * the charge within `window` of O is marked, so an endless line is marked along what the picture
 * shows, at the same spacing however far it runs; `step` is the spacing a uniform wire would have, in
 * metres. The flat figure writes its marks the same way (see ChargeDiagram's chargeMarks); in space
 * those are hidden, and nothing else in the scene said what sign the charge was. */
export type SignMark=Point3&{along:Point3};
export function signMarks(samples:readonly ChargeSample[],window:number,step:number,most=28):SignMark[]{
 const pool=samples.filter(s=>Math.hypot(s.position.x,s.position.y,s.position.z)<=window);
 if(pool.length<2||!(step>0))return pool.map(s=>({...s.position,along:{x:1,y:0,z:0}}));
 let length=0;
 for(let i=1;i<pool.length;i++){const a=pool[i-1].position,b=pool[i].position;length+=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);}
 // As few as one: a wire shorter than a step and a half gets a single mark. It used to get two whatever
 // its length, and on the narrowest arc the two marks -- each wider than the tube -- covered most of the
 // charge they were there to label.
 const count=Math.max(1,Math.min(most,Math.round(length/step)));
 const weights=pool.map(s=>Math.abs(s.dq)),total=weights.reduce((a,b)=>a+b,0);
 if(!(total>0))return [];
 // Cumulative charge at each sample's middle, and a position interpolated between samples for each target.
 const marks:SignMark[]=[];let i=0,before=weights[0]/2;
 for(let k=0;k<count;k++){
  const target=total*(k+.5)/count;
  while(i<pool.length-2&&before+(weights[i]+weights[i+1])/2<target){before+=(weights[i]+weights[i+1])/2;i++;}
  const span=(weights[i]+weights[i+1])/2,t=span>0?Math.max(0,Math.min(1,(target-before)/span)):.5,a=pool[i].position,b=pool[i+1].position;
  // And which way the wire runs there, for the mark to stand beside it (see `besideWire`).
  const d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)||1;
  marks.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,along:{x:(b.x-a.x)/d,y:(b.y-a.y)/d,z:(b.z-a.z)/d}});
 }
 return marks;
}
/** WHERE A WIRE'S SIGN MARK STANDS: BESIDE THE TUBE, NOT ON IT. The offset from its point on the wire, in
 * metres, in the plane of the screen (`right` and `up` are the screen's directions in the world).
 *
 * A mark is wider than the tube, and centred on it the glyph's turn against the wire decided whether it read
 * as a sign at all: where the ring ran up the screen a minus was a dark bar straight across it, so a negative
 * ring or rod at rest looked banded, or cut, and the bisector a ladder of clamps; where it ran across, the minus
 * lay along it as a seam. And the tube-coloured tile round each mark, lit flat, stuck out past the tube's own
 * shading. A plus or minus set beside a charged line is how a textbook writes it, and leaves the tube whole.
 *
 * Square to the wire as it is seen, at its point; on the side away from `away` -- the middle of a ring or an
 * arc, P for a straight rod -- and below it on the screen where neither side is away (a rod seen along the line
 * through P). Far enough that the glyph with its paper ring, `a` by `b` half sizes (and the same turned, for a
 * plus), clears a tube `clear` metres in radius, padding included. */
export function besideWire(at:Point3,along:Point3,away:Point3,right:Point3,up:Point3,a:number,b:number,plus:boolean,clear:number):Point3{
 const dot=(u:Point3,v:Point3)=>u.x*v.x+u.y*v.y+u.z*v.z,off={x:at.x-away.x,y:at.y-away.y,z:at.z-away.z};
 const tR=dot(along,right),tU=dot(along,up),t=Math.hypot(tR,tU),dR=dot(off,right),dU=dot(off,up),d=Math.hypot(dR,dU);
 let nR:number,nU:number;
 if(t<1e-6){[nR,nU]=d>1e-9?[dR/d,dU/d]:[0,-1];}
 else{
  nR=-tU/t;nU=tR/t;
  const side=nR*dR+nU*dU;
  if(Math.abs(side)>.02*d){if(side<0){nR=-nR;nU=-nU;}}
  else if(nU>1e-9||(Math.abs(nU)<=1e-9&&nR<0)){nR=-nR;nU=-nU;}
 }
 const reach=(p:number,q:number)=>Math.abs(nR)*p+Math.abs(nU)*q,k=clear+(plus?Math.max(reach(a,b),reach(b,a)):reach(a,b));
 return {x:(nR*right.x+nU*up.x)*k,y:(nR*right.y+nU*up.y)*k,z:(nR*right.z+nU*up.z)*k};
}
/** WHETHER THE CHOSEN RING'S SLAB STANDS IN FRONT OF A SIGN MARK drawn at `o` (lifted, in metres), `mark` metres
 * across its half: the washer from `band.inner` to `band.outer` and `half` metres either side of the plane, seen
 * along `toward` (toward the camera); `right` and `up` the screen's directions. Nine points over the inner half of
 * the mark are each followed toward the camera through the slab's thickness: the slab covers the mark where it
 * meets the middle one or a row's worth of them -- the tip of an arm brushing the washer's edge is not a mark cut
 * in half.
 *
 * Seen low, a mark just beyond the band's far edge is drawn over the raised washer, which is nearer the camera:
 * depth-tested, its lower half was cut away and it stood on the washer's top edge as an upturned T; drawn over
 * everything, it would sit on a piece it is behind. Such a mark is let go -- half a mark is worse than none. A
 * mark in the washer's hole, with the slab beyond it, and one in front of the washer, are kept. */
export function slabCovers(o:Point3,band:{inner:number;outer:number},half:number,toward:Point3,right:Point3,up:Point3,mark:number):boolean{
 if(!(Math.abs(toward.z)>1e-3)||!(half>0))return false;
 const meets=(sx:number,sy:number)=>{
  const q={x:o.x+(right.x*sx+up.x*sy)*mark,y:o.y+(right.y*sx+up.y*sy)*mark,z:o.z+(right.z*sx+up.z*sy)*mark};
  // How far toward the camera the ray from this point runs before it is past the slab's camera side.
  const out=((toward.z>0?half:-half)-q.z)/toward.z;
  if(!(out>0))return false;
  for(let k=0;k<=12;k++){
   const s=out*k/12,x=q.x+toward.x*s,y=q.y+toward.y*s,z=q.z+toward.z*s,r=Math.hypot(x,y);
   if(Math.abs(z)<=half&&r>=band.inner&&r<=band.outer)return true;
  }
  return false;
 };
 if(meets(0,0))return true;
 let count=0;
 for(const sx of [-.6,0,.6])for(const sy of [-.45,0,.45])if((sx||sy)&&meets(sx,sy))count++;
 return count>=3;
}
/** WHERE AN AXIS MAY NOT CARRY TICKS: the stretches of it, as ranges of its own coordinate, that P and
 * the arrows lying along it cover. P and its arrows sit on an axis in most lessons -- above a ring, a
 * disk or a sheet, beside a rod on its bisector or past its end -- and the scene's metre ticks, cut
 * across the axis, crossed the arrowheads lying along it and stood just before a name: a tick in front
 * of ΣΔE read as a minus sign, "−ΣΔE". The labels are the flat figure's, and its placer cannot see the
 * scene's ticks, so the ticks give way: within `minor` of P, and over every arrow from P that lies along
 * the axis (within three degrees), padded by `pad` at P's end and `tip` past the head, where the
 * arrow's name is set. `axis` is 0, 1 or 2 for x, y or z; an arrow is an offset from P. Nothing is
 * cleared on an axis P is not on. */
export function tickGaps(axis:0|1|2,point:Point3,arrows:readonly (Point3|null|undefined)[],minor:number,pad:number,tip=pad):[number,number][]{
 const c=(v:Point3)=>axis===0?v.x:axis===1?v.y:v.z,off=(v:Point3)=>Math.hypot(axis===0?0:v.x,axis===1?0:v.y,axis===2?0:v.z);
 const scale=Math.max(1,Math.hypot(point.x,point.y,point.z));
 if(off(point)>1e-6*scale)return [];
 const at=c(point),gaps:[number,number][]=[[at-minor,at+minor]],sin=Math.sin(3*Math.PI/180);
 for(const a of arrows){
  if(!a)continue;
  const l=Math.hypot(a.x,a.y,a.z);
  if(!(l>1e-9)||off(a)>sin*l)continue;
  const end=at+c(a);
  gaps.push(end>=at?[at-pad,end+tip]:[end-tip,at+pad]);
 }
 return gaps;
}
/** A field line's segments, cut where they cross the plane z = 0 and sorted by which side of it they
 * lie: `behind` is under the plane, which the camera -- never lower than a pitch of .15 -- always sees
 * through a disk or a sheet, and in front is everything else.
 *
 * The two halves are drawn differently because what lies under a stroke differs. Behind the surface,
 * a line is drawn first, opaque, its ink premixed with the paper, and the translucent surface tints it.
 * In front, the surface is under the stroke, and a stroke premixed with the PAPER is lighter than the
 * surface it crosses: every line in front of the disk was a pale scratch across it -- radial cuts, on
 * the lesson about cutting the disk into rings -- and in dark mode a navy stripe across the brown. So
 * the front half is real translucent ink, laid after the surfaces (see FieldStage). */
export function splitAtPlane(line:readonly Point3[]):{a:Point3;b:Point3;behind:boolean}[]{
 const out:{a:Point3;b:Point3;behind:boolean}[]=[];
 for(let i=0;i+1<line.length;i++){
  const a=line[i],b=line[i+1];
  if((a.z<0)!==(b.z<0)&&a.z!==b.z){
   const t=a.z/(a.z-b.z),m={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:0};
   out.push({a,b:m,behind:a.z<0},{a:m,b,behind:b.z<0});
  }else out.push({a,b,behind:(a.z+b.z)/2<0});
 }
 return out;
}
/** THE SHEET'S LINES ARE LAID BY THE SCREEN. A sunflower of roots is even on the plane, but the camera
 * looks down at a slant and an orthographic view throws depth away: every line is a vertical stroke on
 * the screen at its root's screen x, so a pattern even in the plane printed as an uneven scatter of
 * columns -- gaps from 6 to 166 pixels in a field that is the same everywhere, which is the one thing
 * this lesson's picture has to say.
 *
 * So the roots are columns, evenly spaced across the screen at `gap` viewBox units, symmetric about P
 * (which stands on the sheet's axis, at O's screen x) and never nearer it than `corridor`, so no line
 * runs through P or its label. Each column's root is put at a depth along the camera's far direction
 * in [`near`, `far`] metres, staggered so the roots do not print as a row -- on the solid near part of
 * the plane, where the reader can see the line leave it. Laid again whenever the view turns; nothing is
 * traced. `yaw` sets the screen's right and far directions in the plane; `unit` is viewBox units per
 * metre; `from` and `to` are the window's left and right edges as screen offsets from O. */
export const SHEET_COLUMNS={gap:34,corridor:14} as const;
export function sheetColumns(yaw:number,unit:number,from:number,to:number,near:number,far:number,gap:number=SHEET_COLUMNS.gap,corridor:number=SHEET_COLUMNS.corridor):{x:number;y:number}[]{
 const right={x:Math.cos(yaw),y:Math.sin(yaw)},ahead={x:-Math.sin(yaw),y:Math.cos(yaw)};
 const roots:{x:number;y:number}[]=[];
 const first=Math.floor((from-gap/2)/gap),last=Math.ceil((to-gap/2)/gap);
 for(let j=first;j<=last;j++){
  const s=gap/2+j*gap;
  if(Math.abs(s)<corridor||s<from-gap||s>to+gap)continue;
  // The golden-ratio sequence, by the column's own index, so a column keeps its root as the window moves.
  const k=((j*.6180339887+.31)%1+1)%1,depth=near+(far-near)*k,across=s/unit;
  roots.push({x:right.x*across+ahead.x*depth,y:right.y*across+ahead.y*depth});
 }
 return roots;
}
/** WHICH STROKE A PIECE OF A FIELD LINE IS DRAWN AS: `behind` is premixed with the paper and opaque,
 * the rest is translucent ink laid over whatever the scene has already drawn there (see FieldStage).
 *
 * A surface splits each line at its plane (see `splitAtPlane`). A wire's lines are never premixed. They
 * were, all of them, and a line passing in front of the tube or a cut piece repainted it in the colour
 * of the paper: a white nick the width of a cut across the orange, so Cut it up showed the five gaps of
 * a five-piece ring and four or five more that were not cuts, and in Shrink them a nick on the near side
 * read as a cut that never closed. As ink, a line over the paper is the same colour the premix was, and
 * over the tube it is a faint tint of the field's colour; a line behind the tube still fails the depth
 * test the tube writes, so it is still hidden there. */
export function strokeSide(kind:BodyKind,a:Point3,b:Point3):{a:Point3;b:Point3;behind:boolean}[]{
 return kind==='wire'?[{a,b,behind:false}]:splitAtPlane([a,b]);
}
/** THE RADII A DISK'S SIGN MARKS ARE LAID ON. They were a ring or two at fixed fractions of R, and the
 * chosen ring of the disk sat on one of them: its marks were drawn into the washer's walls and cut to a
 * ⊥, and nothing at all was written on the disk outside it -- the outer part of a charged disk carried no
 * sign. Now the marks are spread evenly over the parts of the disk the chosen ring does NOT cover, from a
 * fifth of the radius out to nine tenths of it, `clear` metres (a mark's half-size) clear of either wall
 * of `annulus`, the chosen ring. `unit` is viewBox units per metre: a ring of marks every sixty or so. */
export function diskSignRadii(R:number,unit:number,annulus:{inner:number;outer:number}|null,clear:number):number[]{
 const lo=.2*R,hi=.92*R,most=Math.max(2,Math.min(4,Math.round(R*unit/60)));
 const cut=annulus?[annulus.inner-clear,annulus.outer+clear] as const:null;
 // The free stretches of [lo, hi], and their total length.
 const free:[number,number][]=cut?[[lo,Math.min(hi,cut[0])],[Math.max(lo,cut[1]),hi]]:[[lo,hi]];
 const parts=free.filter(([a,b])=>b>a+1e-9),total=parts.reduce((s,[a,b])=>s+b-a,0);
 if(!(total>0))return [];
 // At equal steps of the free length, both ends included, so the outermost mark is out by the rim
 // whenever the chosen ring leaves room there.
 const at=(s:number)=>{for(const [a,b] of parts){if(s<=b-a+1e-9)return a+Math.min(s,b-a);s-=b-a;}return parts[parts.length-1][1];};
 const count=Math.max(1,Math.min(most,Math.round(total*unit/30)+1));
 return Array.from({length:count},(_,k)=>at(count>1?total*k/(count-1):total/2));
}
/** How far apart the disk's sign marks are laid on its face, in units of the figure: about the spacing a
 * wire's marks are laid at along it (see `signMarks`). */
export const DISK_SIGN_SPACING=28;
/** How many of the disk's sign marks, at least, are laid on the part of its face free for them: see `diskSignMarks`. */
export const DISK_SIGN_FREE=8;
/** WHERE THE DISK'S SIGN MARKS GO: a sunflower over its face, as the sheet's are laid (see `sheetSignRoots`),
 * one mark for every DISK_SIGN_SPACING-unit square of it, so they are as dense everywhere on the face as the
 * charge is. `half` is a mark's half size with its paper ring, in metres; `unit` is viewBox units per metre.
 *
 * THEY WERE RINGS OF MARKS, as many round each ring as its circumference held -- and no ring stood for the
 * band of the disk it was there for. At the default the disk's middle carried two marks and the thin band
 * outside the chosen washer nine, over equal areas: four and a half times denser at the rim. On a wire the
 * scene's marks ARE the charge's density (the ramp's crowd toward its heavy end), so the same convention said
 * σ peaks at the rim -- a conductor's charge, not this lesson's uniform disk.
 *
 * None within a fifth of R of the middle, where the axis and P's foot are, nor past nine tenths of it, where
 * the rim is; none on the chosen ring or within `half` of its walls; and none closer to another than a mark's
 * width and a little paper (2.6 half sizes), so the smallest disk carries no pile. A disk too small for any
 * gets one mark, off the chosen ring. */
export function diskSignMarks(R:number,unit:number,annulus:{inner:number;outer:number}|null,half:number):Point3[]{
 const lo=.2*R,hi=.92*R,cut=annulus?[annulus.inner-half,annulus.outer+half] as const:null;
 // A SMALL DISK IS MARKED MORE FINELY, NOT LESS. On a phone the disk is a sixth smaller in the figure's units, and with
 // the chosen washer across the middle of its radius -- five rings, the lesson's default -- the face round it held five
 // places for a mark, and the names gathered round O took all but one: a disk with a single plus. So as many are laid
 // as put at least DISK_SIGN_FREE on the face that is free for them, as evenly as ever, never closer than they may stand.
 const m=half*unit,free=(hi*hi-lo*lo-(cut?Math.max(0,Math.min(hi,cut[1])**2-Math.max(lo,cut[0])**2):0))/(R*R);
 const count=Math.max(1,Math.min(Math.round(Math.PI*(R*unit)**2/(2.6*m)**2),Math.max(Math.round(Math.PI*(R*unit)**2/DISK_SIGN_SPACING**2),free>0?Math.ceil(DISK_SIGN_FREE/free):0)));
 const golden=Math.PI*(3-Math.sqrt(5)),out:Point3[]=[];
 for(let k=0;k<count;k++){
  const r=R*Math.sqrt((k+.5)/count),a=k*golden+.3;
  if(r<lo||r>hi||(cut&&r>=cut[0]&&r<=cut[1]))continue;
  const at={x:r*Math.cos(a),y:r*Math.sin(a),z:0};
  if(out.some(o=>Math.hypot(o.x-at.x,o.y-at.y)*unit<2.6*m))continue;
  out.push(at);
 }
 // Too small for any: one, on the outermost free radius, off the chosen ring.
 if(!out.length){const radii=diskSignRadii(R,unit,annulus,half),r=radii.length?radii[radii.length-1]:0;out.push({x:r*Math.cos(.3),y:r*Math.sin(.3),z:0});}
 return out;
}
/** THE MARKS THAT CAN BE TOLD APART ON THE SCREEN: each kept unless it would be drawn within `gap` viewBox
 * units of one already kept, in the order given. Laid in space, marks a step apart along a wire land on top
 * of one another once the wire is turned end on, or is short beside a mark's width. */
export function apartOnScreen<T extends {at:Point3}>(marks:readonly T[],toScreen:(v:Point3)=>{x:number;y:number},gap:number):T[]{
 const kept:{x:number;y:number}[]=[],out:T[]=[];
 for(const mark of marks){
  const s=toScreen(mark.at);
  if(kept.some(k=>Math.hypot(k.x-s.x,k.y-s.y)<gap))continue;
  kept.push(s);out.push(mark);
 }
 return out;
}
/** The least distance between two of the sheet's sign marks on the screen, in viewBox units: about the
 * spacing the opening view lays them at. See FieldStage's `laySigns`. */
export const SHEET_SIGN_GAP=44;
/** HOW MUCH PAPER A SIGN MARK KEEPS FROM A NAME, in units of the figure, beyond the name's own padded box
 * (see `paintedLabels`) and the mark's half-size. With none, a mark could sit flush against a letter -- at
 * R = 4 the disk read "+P", "z +" and "+ s", a sign glued to each name -- since the placer, which sets the
 * names, cannot see the scene's marks. Six more units leave about ten between the ink of the two. */
export const NAME_MARGIN=6;
/** HOW MUCH MORE PAPER A MINUS KEEPS FROM A NAME IT STANDS LEVEL WITH, in units of the figure: about a letter's width.
 * See FieldStage's `laySigns`. */
export const LEVEL_MARGIN=12;
/** THE SHEET'S SIGN MARKS, LAID ON THE SHEET. They were laid on a lattice fixed to the screen -- a mark
 * every ninety units across and sixty up, from the window's bottom edge -- and only then turned into the
 * plane for the current view, so in a drag they stood still while the grid, the axes and the chosen ring
 * turned under them, as a screen overlay does: not marks on the sheet. Now they are a sunflower over the
 * plane (as `sheetRoots` lays the sheet's lines), which prints no rows from any yaw, spaced by `window`
 * metres -- quantised by the caller, so they are laid again only when the zoom really changes. A view
 * only decides how strongly each one is drawn. */
export function sheetSignRoots(window:number):Point3[]{
 const spacing=window/7.2,radius=window*1.1,count=Math.round(Math.PI*radius*radius/(spacing*spacing*1.15));
 const golden=Math.PI*(3-Math.sqrt(5)),out:Point3[]=[];
 for(let k=0;k<count;k++){const r=radius*Math.sqrt((k+.5)/count),a=k*golden+1.1;out.push({x:r*Math.cos(a),y:r*Math.sin(a),z:0});}
 return out;
}
/** How strongly each of the sheet's marks is drawn in one view: none outside the window (thirty units
 * clear of its sides, fourteen of its foot) or past where the plane starts to fade under P, and dimmed
 * with the plane's far side (see `sheetFarFade`). None on the chosen ring while it is drawn solid; once
 * it is only a wash, none on its two walls. `toScreen` puts a point in the figure's viewBox, `ahead` is
 * the camera's far direction in the plane, `clear` a mark's half-size in metres. Every root is returned,
 * hidden ones at alpha zero, so the positions are the roots whatever the view. */
export function sheetSigns(roots:readonly Point3[],toScreen:(v:Point3)=>{x:number;y:number},ahead:{x:number;y:number},far:FarFade,band:{inner:number;outer:number}|null,frameWorld:number,clear:number):{at:Point3;alpha:number}[]{
 const solid=!!band&&(band.outer-band.inner)/Math.max(1e-6,frameWorld*.5)<.3;
 return roots.map(at=>{
  const s=toScreen(at),depth=at.x*ahead.x+at.y*ahead.y,r=Math.hypot(at.x,at.y);
  const shown=s.x>=PLOT.x+30&&s.x<=PLOT.x+PLOT.width-30&&s.y<=PLOT.y+PLOT.height-14&&s.y>=PLOT.y&&depth<=far.inner;
  const onBand=!!band&&(solid?r>=band.inner-clear&&r<=band.outer+clear:Math.abs(r-band.inner)<=clear||Math.abs(r-band.outer)<=clear);
  return {at,alpha:shown&&!onBand?farAlpha(depth,far)*.8:0};
 });
}
type Flat={x:number;y:number};
const segmentPoint=(p:Flat,a:Flat,b:Flat)=>{
 const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l>0?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;
 return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
};
/** The least distance between two segments in the plane: zero where they cross. */
export function segmentGap(a:Flat,b:Flat,c:Flat,d:Flat):number{
 const cross=(o:Flat,p:Flat,q:Flat)=>(p.x-o.x)*(q.y-o.y)-(p.y-o.y)*(q.x-o.x);
 const d1=cross(a,b,c),d2=cross(a,b,d),d3=cross(c,d,a),d4=cross(c,d,b);
 if(((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0)))return 0;
 return Math.min(segmentPoint(a,c,d),segmentPoint(b,c,d),segmentPoint(c,a,b),segmentPoint(d,a,b));
}
/** Room kept clear round P and its arrows on the SCREEN, in viewBox units; see `latticeClear`. */
export const LATTICE_CLEAR={point:44,net:16,past:36,middle:14} as const;
/** WHETHER ONE OF THE 3D ARROWS MAY BE DRAWN, judged where the collisions happen: on the screen.
 *
 * The arrows round P were hidden by distance in space, and an orthographic view throws depth away: an
 * arrow a step behind P was drawn on P's name, ran into the E of ΣΔE and up the side of the height's
 * letter, and one lay on the net arrowhead while the next, just past its tip on the axis, read as the net
 * arrow going on. So an arrow, shaft and head, `tail` to `tip`, is hidden within `point` units of P on the
 * screen, within `net` units of the net arrow carried `past` units beyond its tip, and within `middle`
 * units of the middle of O to P, where the height is named. `right` and `up` are the screen's directions
 * in the world and `unit` its viewBox units per metre. */
export function latticeClear(tail:Point3,tip:Point3,point:Point3,net:Point3|null,screen:{right:Point3;up:Point3;unit:number},room:{point:number;net:number;past:number;middle:number}=LATTICE_CLEAR):boolean{
 const {right:R,up:U,unit}=screen,at=(v:Point3):Flat=>({x:(v.x*R.x+v.y*R.y+v.z*R.z)*unit,y:-(v.x*U.x+v.y*U.y+v.z*U.z)*unit});
 const a=at(tail),b=at(tip),P=at(point);
 if(segmentPoint(P,a,b)<room.point)return false;
 if(segmentPoint(at({x:point.x/2,y:point.y/2,z:point.z/2}),a,b)<room.middle)return false;
 if(net){
  const T=at({x:point.x+net.x,y:point.y+net.y,z:point.z+net.z}),l=Math.hypot(T.x-P.x,T.y-P.y);
  const end=l>1e-9?{x:T.x+(T.x-P.x)/l*room.past,y:T.y+(T.y-P.y)/l*room.past}:T;
  if(segmentGap(a,b,P,end)<room.net)return false;
 }
 return true;
}
/** THE ORDER THREE DRAWS IN, worked out the way its renderer does: a group's renderOrder is the group
 * order of everything under it, a mesh's own renderOrder orders it only among things of the same group
 * order, and an object straight under the scene has a group order of zero whatever its own renderOrder.
 * The translucent front strokes and heads were put straight under the scene with renderOrders of 4 and 5
 * so as to be drawn last; they were drawn FIRST, before the marks' group (order 2), and the chosen washer
 * -- translucent, but writing depth -- then painted out every stroke in front of it: the field read as
 * stopped by the chosen ring. Named objects only, each as [group order, renderOrder]. */
export type OrderNode={name?:string;isGroup?:boolean;renderOrder:number;children:readonly OrderNode[]};
export function drawOrder(root:OrderNode):Map<string,[number,number]>{
 const out=new Map<string,[number,number]>();
 const walk=(node:OrderNode,group:number)=>{
  for(const child of node.children){
   const g=child.isGroup?child.renderOrder:group;
   if(child.name)out.set(child.name,[g,child.renderOrder]);
   walk(child,g);
  }
 };
 walk(root,0);
 return out;
}
/** Whether something at draw order `a` is drawn after something at `b`, among the translucent things. */
export const drawnAfter=(a:readonly [number,number],b:readonly [number,number])=>a[0]!==b[0]?a[0]>b[0]:a[1]>b[1];
