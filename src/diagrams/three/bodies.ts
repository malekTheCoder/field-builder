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
/** How far a flat surface reaches. A disk stops at its own edge; a sheet has no edge, so it is
 * drawn past the frame and faded rather than given a false rim. */
export function bodyReach(kind:BodyKind,radius:number,frameWorld:number):number{
 if(kind==='sheet')return Math.max(frameWorld*1.5,radius*3,4);
 return Math.max(.05,radius);
}
/** Opacity for the flat surfaces. The old disk was drawn near-black and read as a hole
 * punched in the page; a charged surface should read as a surface you can see through to
 * the construction lines behind it. */
export const surfaceOpacity=(kind:BodyKind)=>kind==='sheet'?.28:.42;
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
