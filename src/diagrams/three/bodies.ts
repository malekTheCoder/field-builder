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
/** The chosen ring dims less than the plane under it: it is the piece being talked about, and its
 * far arc must still be plainly there -- only plainly behind P. */
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
type Point3={x:number;y:number;z:number};
/** WHERE THE SIGN IS WRITTEN ON A WIRE IN SPACE: points along the charge at equal steps of |dq|, so a
 * uniform wire is marked evenly and the ramp's marks crowd toward its heavy end and thin out toward
 * λ = 0 -- the density that lesson is about, which the tube alone drew as uniform. Only the part of
 * the charge within `window` of O is marked, so an endless line is marked along what the picture
 * shows, at the same spacing however far it runs; `step` is the spacing a uniform wire would have, in
 * metres. The flat figure writes its marks the same way (see ChargeDiagram's chargeMarks); in space
 * those are hidden, and nothing else in the scene said what sign the charge was. */
export function signMarks(samples:readonly ChargeSample[],window:number,step:number,most=28):Point3[]{
 const pool=samples.filter(s=>Math.hypot(s.position.x,s.position.y,s.position.z)<=window);
 if(pool.length<2||!(step>0))return pool.map(s=>s.position);
 let length=0;
 for(let i=1;i<pool.length;i++){const a=pool[i-1].position,b=pool[i].position;length+=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);}
 const count=Math.max(2,Math.min(most,Math.round(length/step)));
 const weights=pool.map(s=>Math.abs(s.dq)),total=weights.reduce((a,b)=>a+b,0);
 if(!(total>0))return [];
 // Cumulative charge at each sample's middle, and a position interpolated between samples for each target.
 const marks:Point3[]=[];let i=0,before=weights[0]/2;
 for(let k=0;k<count;k++){
  const target=total*(k+.5)/count;
  while(i<pool.length-2&&before+(weights[i]+weights[i+1])/2<target){before+=(weights[i]+weights[i+1])/2;i++;}
  const span=(weights[i]+weights[i+1])/2,t=span>0?Math.max(0,Math.min(1,(target-before)/span)):.5,a=pool[i].position,b=pool[i+1].position;
  marks.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
 }
 return marks;
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
