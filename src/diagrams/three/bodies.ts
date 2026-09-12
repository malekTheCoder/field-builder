import type {ChargeSample} from '../../distributions/types';
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
