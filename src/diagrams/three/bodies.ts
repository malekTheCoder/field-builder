import type {ChargeSample} from '../../distributions/types';
import {openingCamera} from '../camera';
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
/** The sheet's field lines in space (see `sheetRoots`): this many on each face, rooted over a disc
 * this fraction of the picture's width in metres -- far enough out that the field fills the window,
 * and dimmed with the plane on its far side, so a line rising from where the plane has faded to a
 * trace is a trace too rather than a line beginning in mid-air. */
export const SHEET_LINES={count:22,radius:.45};
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
/** The chosen ring dims less than the plane under it: it is the piece being talked about, and its
 * far arc must still be plainly there -- only plainly behind P. */
export const PIECE_FAR_LOW=.42;
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
 * nine units of the figure long, so it reads at any zoom; never more than .45 of its arrow; and at
 * least half again as long as it is wide. The heads were cones about as long as they were wide, and
 * an arrow lying in the plane, seen from above, ended in a dot. */
export function arrowHead(length:number,thick:number,px:number):{length:number;half:number}{
 const l=Math.min(length*.45,Math.max(thick*7,9*px));
 return {length:l,half:Math.min(thick*2.2,l*.32)};
}
/** How strongly each point of a field line is drawn: full near the charge, fading out by a little
 * past the field's reach -- measured from the CHARGE, not from O. From O, the field of an infinite
 * line was drawn weaker along the line, which its symmetry forbids, and the axial rod's field was
 * faded round P and full at the rod's far end. `away` is the distance to the charge's body. */
export function lineStrength(away:number,reach:number):number{
 const far=Math.min(1,Math.max(0,(away-reach*.25)/(reach*1.1)));
 return 1-far*far;
}
