'use client';
import {useEffect,useRef,useState} from 'react';
import type {ChargeSample} from '../../distributions/types';
import type {Vec} from '../../symbolic/physics';
import {cameraBasis,cameraPosition,frameTarget,frustum,tickStep} from './orthoCamera';
import {apartOnScreen,ARROW_INSET,arrowHead,fitInWindow,besideWire,LEVEL_MARGIN,slabCovers,BEHIND_GAP,gapDepth,gapLift,gapShrink,gapRamp,gapStart,NAME_MARGIN,PIECE_FAR_LOW,SHEET_SIGN_GAP,bodyReach,CHAIN_ASIDE,chainAside,keepAside,diskSignMarks,drawOrder,fadeOut,farAlpha,fillAlpha,fillFade,frameExtent,latticeClear,lineReach,segmentGap,lineStrength,pieceFade,SHEET_FADE,sheetSignRoots,sheetSigns,signMarks,strokeSide,tickGaps,SHEET_UNDER,sheetColumns,sheetFarFade,sheetInk,sheetSides,surfaceOpacity,visibleRadii,washerHalf,washWall,wirePath,wireRadius,writesDepth,type BodyKind,type FarFade} from './bodies';
import {endlessAxis,endlessBody,endlessRay,latticeBody,latticeCore,latticeFrame,radialLines,rayField,rayLines,sheetLines,shellLines,shellOf,spaceLines,traceTo,type Layout} from '../field3d';
import {boxGap,controlBox,HEAD_ROOM,LINE_HEAD,lineHeads,meetsBoxes,paintedLabels,seedPool,touchesLabels,type Box} from '../fieldlines';
import {coarsen} from '../sampling';
import {arrowLength,bodyDistance,PLOT} from '../vectorfield';
import {SNAPSHOT_EVENT,type SnapshotDetail} from '../snapshot';
import {cutPiece,cutShare,dropStyle,keptSpans,type RunScene,type RunTone} from './runScene';
/** The 3D half of the figure: the charge as a real body with depth, and the field around it
 * in space, under the SVG that carries every label and every control.
 *
 * Three.js is loaded on demand, inside an effect, for two reasons. It touches `window` at
 * import time, so a static import breaks server rendering; and only a lesson switched into
 * space needs it, so the flat view never pays for it.
 *
 * The camera is built from the same yaw and pitch the SVG projects with, through a basis a
 * test pins against `projectCamera`. That is what keeps a label on the thing it labels. */
export type FieldStageProps={
 /** Which body to build. A wire runs through its samples; a disk or a sheet is a surface. */
 kind:BodyKind; closed:boolean; radius:number; distance:number;
 /** The annulus's hole, its inner radius in metres: a disk with no charge inside it. Left out, a whole disk. */
 hole?:number;
 samples:readonly ChargeSample[]; selected:number;
 /** What the FIELD is traced from, where that is not the reader's own pieces: a partition fine
  * enough to be the charge itself (see ChargeDiagram). The pieces -- a disk's rings, the run's cuts
  * -- stay `samples`; five lumps of a ring are not where its field lines come from. */
 fieldSamples?:readonly ChargeSample[];
 /** How many elements the tracer may sum from; see FieldCanvas. */
 detail?:number;
 /** The wire's own shape, sampled from the geometry rather than from the partition. A ring
  * is a ring however many pieces it has been cut into, and building the body from the
  * samples made a five-piece ring render as a fifteen-sided polygon. */
 bodyPath?:readonly Vec[];
 yaw:number; pitch:number;
 /** Push the field back so a construction drawn over it can be read: the lines and their
  * arrows fade to a trace while "Watch it build" is taking the reader through one piece. */
 quiet?:boolean;
 /** Pixels per world unit, and the viewBox the SVG above is drawn in. */
 unit:number; frame:{width:number;height:number};
 /** Where the SVG puts the world origin in viewBox units; the 3D body must agree. */
 origin:{x:number;y:number};
 charge:number;
 /** How to show the field, and how far out to draw it, in world metres. */
 fieldView:'lines'|'vectors'|'off'; reach:number;
 /** The observation point, the element being pointed at, and the two arrows the lesson is
  * about, all in world metres. In space these are bodies in the scene rather than marks
  * drawn flat over it; the SVG keeps the labels and the handles. */
 /** A wire's element is the stretch of wire it occupies; a surface's is the annulus between
  * two radii. Neither is a straight segment, and drawing one as a segment on a ring reads as
  * a tangent line lying against it rather than a piece of it. */
 point:Vec; element:{path:Vec[]}|{annulus:{inner:number;outer:number}}|{band:{lo:number;hi:number}}|null;
 net:Vec|null; contribution:Vec|null;
 /** Where the contribution starts, as an offset from P: P itself, except while the run's Add them up takes
  * a mirror pair into the sum from the tip of the sum so far. */
 contributionFrom?:Vec|null;
 /** During an orbit the SVG moves from motion values without re-rendering, so reading yaw
  * and pitch from props would leave the body behind the drawing. While `animating`, the
  * stage reads the live view every frame instead. */
 animating?:boolean; getView?:()=>{yaw:number;pitch:number};
 /** "Watch it build", while it is open: what the scene draws of each stage. See `runScene`. */
 run?:RunScene|null;
 /** The run's own clock, while it is in Cut it up, and the moment that stage began: the cuts are made, and the
  * piece is named, at the time the run is at -- held by a pause, moved by a seek, stepped by Reduced Motion's
  * beats -- as the flat figure's are (`--cd-local`). Without it they are made on the wall clock. */
 cutClock?:{get():number;subscribe(listener:()=>void):()=>void;start:number}|null;
 /** Told, once, that the scene cannot start here -- no WebGL context, or its chunk never arrived -- so the
  * figure can draw itself flat instead. Without it the stage says so itself, over its empty layer. */
 onUnavailable?:(why?:'lost')=>void;
 /** The radius of an arc about the origin whose density is λ₀ cos θ, θ from +x: the uneven semicircle. Its wire, its
  * pieces and its chosen piece are then as thick as the charge they hold, thinning to a thread at the two ends, as
  * the flat figure's band does. Absent, a wire is one thickness throughout. */
 taper?:number;
};
/** The cuts are made in order along the charge, at the same pace as the flat figure's
 * `.cd-stage-pieces .cd-seam` animation, so a reader who flips between 2D and 3D sees one run. */
const CUT={spread:1.5,delay:.2,each:.42};
/** When the cutting is done and the chosen piece is lit and named, in seconds into Cut it up: the flat figure's
 * `cd-pick` and the ΔQ tag's fade start at the same moment. Until then the charge is cut, not yet pointed at. */
const NAMED_AT=2;
/** THE CHARGE IS THE SAME COLOUR WHATEVER ITS SIGN. The scene used to paint a negative charge blue,
 * while the flat figure, the piece tags, the construction lines and every dQ on the board stay the
 * charge's own orange for both signs and say the sign with plus and minus marks -- so turning a
 * negative lesson into space recoloured its charge, with nothing to say that blue meant negative,
 * and at rest the orange flat marks over the blue ring made a muddy brown ring with an orange piece
 * that turned blue once the run began. The sign is in the marks and in which way the field runs:
 * every field line carries an arrowhead now, out of a positive charge and into a negative one.
 * The body, the line work (cuts, rings, the chosen piece), the pieces already added, and the glow. */
export const CHARGE={body:0xf0975c,line:0xc2703a,added:0xd9834b,glow:0x3a1c08} as const;
const CUT_MS=Math.max((CUT.spread+CUT.delay+CUT.each)*1000,NAMED_AT*1000)+60;
type Live={dispose:()=>void;update:(p:FieldStageProps)=>void;tick?:()=>void};
const sampleKey=(p:FieldStageProps)=>{
 if(p.bodyPath?.length){
  const f=p.bodyPath[0],l=p.bodyPath[p.bodyPath.length-1];
  return `${p.kind}:${p.closed}:${p.bodyPath.length}:${f.x.toFixed(3)},${f.y.toFixed(3)},${f.z.toFixed(3)}:${l.x.toFixed(3)},${l.y.toFixed(3)},${l.z.toFixed(3)}:${p.radius.toFixed(3)}`;
 }
 const a=p.samples[0]?.position,b=p.samples[p.samples.length-1]?.position;
 const at=(v?:{x:number;y:number;z:number})=>v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`:'-';
 return `${p.kind}:${p.closed}:${p.samples.length}:${at(a)}:${at(b)}:${p.radius.toFixed(3)}`;
};
/** What the field is traced from: the pieces themselves. The body of a wire is drawn from its own
 * path, which a new cut does not change, so the body's key cannot stand in for this one -- a ring
 * re-cut from five pieces to ten went on showing the field of the five. */
const chargeKey=(p:FieldStageProps)=>{
 const traced=p.fieldSamples??p.samples;
 const a=traced[0]?.position,b=traced[traced.length-1]?.position;
 const at=(v?:{x:number;y:number;z:number})=>v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`:'-';
 return `${traced.length}:${at(a)}:${at(b)}`;
};
/** The window the SVG clips its own drawing to, as a clip on this layer: the WebGL scene is a
 * rectangle the size of the whole figure, and without it the sheet's plane, the ground grid and
 * the field lines painted over the rule and the caption under the picture and out to the card's
 * edges. In percentages of the 720 by 430 frame, which is the box this layer fills. */
const pct=(v:number,of:number)=>`${(100*v/of).toFixed(3)}%`;
export const STAGE_CLIP=`inset(${pct(PLOT.y,430)} ${pct(720-PLOT.x-PLOT.width,720)} ${pct(430-PLOT.y-PLOT.height,430)} ${pct(PLOT.x,720)} round ${pct(PLOT.radius,720)} / ${pct(PLOT.radius,430)})`;
export function FieldStage(props:FieldStageProps){
 const host=useRef<HTMLDivElement>(null),live=useRef<Live|null>(null),latest=useRef(props);
 // A SCENE THAT CANNOT START SAYS SO. The 3D layer is a chunk fetched on demand and a WebGL context, and
 // either can fail: a chunk that does not arrive, a school machine whose GPU is blocklisted or whose
 // acceleration a policy has turned off. Nothing caught it, and the ring, the disk and the sheet -- which
 // open in space -- showed their labels floating over an empty figure, with an unhandled rejection and
 // no word of why. Now the figure says the 3D view is unavailable here and that 2D still works.
 //
 // AND THE FIGURE GOES FLAT. Saying so was not enough: the stage failed alone, so the figure above it went on
 // drawing in space -- the view cube, a lone z, the chosen piece's wedge and its ΔQ round a note in an empty
 // plot, and the run narrating pieces nobody could see. The figure is told (`onUnavailable`) and draws the
 // flat view, which needs no WebGL and shows the same lesson; the note is then the figure's, under its
 // toolbar. A stage with nobody to tell still says it here.
 const [failed,setFailed]=useState(false);
 // A CONTEXT THE BROWSER TAKES BACK. A GPU reset, a driver update, too many tabs drawing at once: the browser may take
 // the WebGL context away at any moment, and the scene went blank with nothing to say so -- an empty card where the
 // figure was. The figure is told (`onUnavailable('lost')`) and draws itself flat, with a line saying why and 3D left
 // on offer to try again; a stage with nobody to tell says so itself, and draws again if the context comes back.
 const [lost,setLost]=useState(false);
 useEffect(()=>{latest.current=props;live.current?.update(props);});
 const cutClock=props.cutClock;
 useEffect(()=>cutClock?.subscribe(()=>live.current?.tick?.()),[cutClock]);
 useEffect(()=>{
  const mount=host.current;
  if(!mount)return;
  let cancelled=false;
  void (async()=>{
   const [THREE,{mergeGeometries},{LineSegments2},{LineSegmentsGeometry},{LineMaterial}]=await Promise.all([import('three'),import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    import('three/examples/jsm/lines/LineSegments2.js'),import('three/examples/jsm/lines/LineSegmentsGeometry.js'),import('three/examples/jsm/lines/LineMaterial.js')]);
   if(cancelled||!host.current)return;
   // A stencil, for the translucent part of the field lines: see `once`.
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true,powerPreference:'high-performance'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
   renderer.setClearAlpha(0);
   mount.appendChild(renderer.domElement);
   renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.style.display='block';
   const scene=new THREE.Scene();
   const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,400);
   // Soft three-point lighting. A charged body has no real material, so the goal is only to
   // make curvature and the near and far sides readable, not to look photographic.
   scene.add(new THREE.AmbientLight(0xffffff,1.35));
   const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(4,6,9);scene.add(key);
   const rim=new THREE.DirectionalLight(0x9ad8ff,.85);rim.position.set(-6,-3,-4);scene.add(rim);
   // The surfaces are translucent so the construction lines behind them stay readable: the
   // old disk was drawn near-opaque and read as a hole punched in the page.
   //
   // A TRANSLUCENT SURFACE TINTS WHAT IS BEHIND IT; IT DOES NOT DELETE IT. The disk and the sheet
   // wrote depth like solids, so everything traced below them -- half the field -- was thrown away
   // by the depth test wherever they covered it. On the sheet that was the whole lower half-space:
   // every arrow of a symmetric lattice pointed up, and the lesson's fact, a field pointing away on
   // BOTH sides, was half missing. So a surface never writes depth (set per kind in `apply`, since a
   // wire is drawn with the same material and is solid). The field is drawn opaque, in the pass
   // before it, so the plane is composited over exactly the part of the field that lies behind it.
   // THE CHARGE IS MATTE. Its parts were a little glossy, and the key light's sheen whitened them only near
   // the opening view: the sheet's chosen ring was salmon there and rust a few turns round, so one piece
   // read as two colours. Rough and not metallic, a face keeps its colour from every side and the walls
   // and the tube's round still shade.
   const MATTE={roughness:.88,metalness:0} as const;
   const bodyMaterial=new THREE.MeshStandardMaterial({...MATTE,side:THREE.DoubleSide});
   // A sheet is the same material with its alpha painted into the mesh, so it can dissolve
   // instead of ending.
   const sheetMaterial=new THREE.MeshStandardMaterial({roughness:.42,metalness:.06,side:THREE.DoubleSide,transparent:true,vertexColors:true,alphaTest:.012,depthWrite:writesDepth('sheet')});
   const sliceMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:.5});
   const pickedMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:1});
   // The field: hairlines for lines, one instanced mesh for arrows.
   //
   // THE LINES ARE THE FLAT FIGURE'S LINES. They were lit tubes, three quarters opaque and tinted
   // darker the nearer they came, and in space they read as heavy grey cables that outweighed the
   // ring they came from and the arrows the lesson is about -- while the same field drawn flat is a
   // hairline in the figure's own field colour at under half strength. They are drawn the same way
   // here: the same colour, the same alpha, the same width in pixels, at any zoom.
   // Per-vertex colour still lets each line fade into the paper as it leaves the picture.
   //
   // And they are drawn OPAQUE, in the line's colour already mixed with the paper, not as a
   // translucent ink. Each traced step is its own quad with round caps, so where two steps meet the
   // caps overlap and a translucent line is blended there twice: its contrast swung by about two to
   // one every three or four pixels, and every field line read as dotted -- the drafting mark for a
   // hidden line. Premixed and opaque, an overlap is the same colour twice, and the lines can write
   // depth, which is what lets a translucent surface lie over the half of the field behind it.
   const lineMaterial=new LineMaterial({color:0xffffff,linewidth:1.1,vertexColors:true,worldUnits:false});
   // The lattice of arrows, unlit and premixed for the same reasons, and in the flat arrows' ink: it
   // was lit slate grey, the colour the lines and the contribution arrows were both taken out of.
   const arrowMaterial=new THREE.MeshBasicMaterial({color:0xffffff}),latticeHeadMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
   // Each field line's arrowhead: a flat triangle turned to face the camera about the line's own
   // direction, in the line's colour. See `lineHeads`.
   const lineHeadMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
   // THE PART OF A LINE IN FRONT OF A SURFACE IS TRANSLUCENT INK (see `splitAtPlane`): its colour as it
   // is, its strength as a per-vertex alpha patched into the line shader, laid after the surfaces so it
   // is blended over whatever the disk, the sheet or the summed fill has made of the paper there. A
   // stencil lets each pixel take that ink once -- the round caps of neighbouring steps overlap, and
   // blended twice there the line read as dotted, which is why the lines were made opaque in the first
   // place. The heads are drawn first under the same rule, so a line does not darken its own head.
   const once=(m:InstanceType<typeof THREE.Material>)=>{
    m.stencilWrite=true;m.stencilRef=1;m.stencilFunc=THREE.NotEqualStencilFunc;
    m.stencilZPass=THREE.ReplaceStencilOp;m.stencilFail=THREE.KeepStencilOp;m.stencilZFail=THREE.KeepStencilOp;
   };
   const frontLineMaterial=new LineMaterial({color:0xffffff,linewidth:1.1,vertexColors:true,worldUnits:false,transparent:true,depthWrite:false});
   frontLineMaterial.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('void main() {','attribute float instanceInkStart;\nattribute float instanceInkEnd;\nvarying float vInk;\nvoid main() {\n\tvInk = ( position.y < 0.5 ) ? instanceInkStart : instanceInkEnd;');
    shader.fragmentShader=shader.fragmentShader.replace('void main() {','varying float vInk;\nvoid main() {').replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );','gl_FragColor = vec4( diffuseColor.rgb, alpha * vInk );');
   };
   const frontHeadMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false});
   once(frontLineMaterial);once(frontHeadMaterial);
   // THE OVERLAY IS A GROUP OF ITS OWN, drawn after the marks. What is laid over everything else -- the
   // translucent part of the field lines and their heads, and the sign marks -- was put straight under
   // the scene with high renderOrders, but three sorts by the GROUP's order first, and anything straight
   // under the scene is in group order zero: it was drawn before the marks, and the chosen washer, which
   // writes depth, painted out every line in front of it and buried the marks under it. See `drawOrder`.
   const body=new THREE.Group(),slices=new THREE.Group(),field=new THREE.Group(),marks=new THREE.Group(),overlay=new THREE.Group();
   scene.add(body,slices,field,marks,overlay);
   body.name='body';field.name='field';marks.name='marks';overlay.name='overlay';
   // P is a small solid with a soft halo; the element is a brighter, thicker length of the
   // wire; each arrow is a shaft and a head that keep their proportions at any length.
   const pointMaterial=new THREE.MeshStandardMaterial({roughness:.35,metalness:.05});
   const haloMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.16,depthWrite:false});
   const elementMaterial=new THREE.MeshStandardMaterial({...MATTE,transparent:true,vertexColors:true,alphaTest:.012});
   const netMaterial=new THREE.MeshStandardMaterial({roughness:.45,metalness:.05});
   // ONE PIECE'S ARROW IS THE LABEL'S INK. It was the field colour washed a quarter of the way to
   // white and then lit, and on screen it came out slate grey -- rgb(95, 125, 128) against the teal
   // of its own label and of every contribution arrow in the flat figure, so the arrow and its name
   // read as two different things. The arrows are a few pixels across, too thin for shading to say
   // anything about their shape, so they are drawn unlit, in exactly the colour of their label.
   const partMaterial=new THREE.MeshBasicMaterial();
   const point=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),pointMaterial),halo=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),haloMaterial);
   // Rebuilt, not transformed: an arc of tube and an annulus are different geometries, and
   // neither can be reached by scaling a cylinder.
   const element=new THREE.Mesh(new THREE.BufferGeometry(),elementMaterial);
   // The marks are drawn after the body and the field, so what is in front is decided by the
   // depth buffer rather than by which translucent thing three happened to sort first.
   field.renderOrder=1;slices.renderOrder=1;marks.renderOrder=2;overlay.renderOrder=3;
   element.name='element';
   let elementKey='';
   // The uneven semicircle's taper (see `taper`), read from the props on every update.
   let taperR=0;
   /** How thick the wire is at a point of it, against its full thickness: the density there, cos θ, with a floor so the
    * ends stay a thread rather than vanish. One everywhere on a wire with no taper. */
   const taperAt=(c:{x:number;y:number})=>taperR>0?.12+.88*Math.max(0,Math.cos(Math.atan2(c.y,c.x))):1;
   /** A tube built round an arc about the origin, thinned to the density: each vertex is moved toward the arc's own
    * point under it, R out at the vertex's own angle, by the taper there. */
   const taperTube=<G extends InstanceType<typeof THREE.BufferGeometry>>(g:G):G=>{
    if(!(taperR>0))return g;
    const pos=g.getAttribute('position') as InstanceType<typeof THREE.BufferAttribute>;
    for(let i=0;i<pos.count;i++){
     const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),phi=Math.atan2(y,x),cx=taperR*Math.cos(phi),cy=taperR*Math.sin(phi),f=taperAt({x:cx,y:cy});
     pos.setXYZ(i,cx+(x-cx)*f,cy+(y-cy)*f,z*f);
    }
    pos.needsUpdate=true;return g;
   };
   type Geometry=NonNullable<ReturnType<typeof mergeGeometries>>;
   type Attribute=InstanceType<typeof THREE.BufferAttribute>;
   /** Turn a geometry inside out: normals the other way, triangles wound the other way.
    * A cylinder's wall always faces outward, and an annulus needs one that faces in. */
   const invert=(g:Geometry)=>{
    const n=g.getAttribute('normal') as Attribute;
    for(let i=0;i<n.count;i++)n.setXYZ(i,-n.getX(i),-n.getY(i),-n.getZ(i));
    const index=g.getIndex();
    if(index)for(let i=0;i<index.count;i+=3){const t=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,t);}
    return g;
   };
   /** The selected ring of a surface, as a solid.
    *
    * It is an annulus, not a point and not a circle: a band of the disk between two radii,
    * and the whole claim the disk's lesson makes is that the disk is a stack of these. Drawn
    * as a flat ring it lay exactly in the plane of the surface it came from, which is both a
    * z-fight -- the radial stripes that used to flicker across it -- and a lie about what it
    * is. It is given the thickness of the wire lesson's element tube instead, so it is the
    * same kind of object: a piece of the charge, lifted enough to be seen, with walls that
    * catch the light at any angle the camera can reach. */
   let washerInk:{face:number;wall:number;edge:number}|null=null;
   const washer=(inner:number,outer:number,half:number,fade:{inner:number;outer:number}|null,frameWorld:number,far:FarFade|null)=>{
    const ri=Math.max(1e-3,inner),ro=Math.max(ri+half*.6,outer),segments=128;
    // A band you can see across is drawn solid. A band wider than the picture is drawn as its
    // two edges with a tint between them, because painting it solid is a wash over everything
    // rather than a ring -- which is exactly what a sheet's outermost ring did to its lesson.
    //
    // The tint has to be light well before the band is the width of the picture. It used to fall
    // as 1 - .86 across^2, so a ring spanning two thirds of the frame still painted at 65% -- and
    // once the sheet's chosen ring stopped being faded by distance, the lesson OPENED on a salmon
    // slab over most of the figure. Now any band a disk could produce (under 15% of the frame)
    // stays solid, and anything wider is its edges plus a quiet tint by the time it reaches half.
    const across=Math.min(1,(ro-ri)/Math.max(1e-6,frameWorld*.5));
    const faceAlpha=.14+.86*Math.max(0,1-Math.max(0,across-.15)/.35)**2;
    const parts:[Geometry,number][]=[
     [new THREE.RingGeometry(ri,ro,segments,1).translate(0,0,half),faceAlpha],
     [new THREE.RingGeometry(ri,ro,segments,1).rotateX(Math.PI).translate(0,0,-half),faceAlpha],
     [new THREE.CylinderGeometry(ro,ro,half*2,segments,1,true).rotateX(Math.PI/2),1],
     [invert(new THREE.CylinderGeometry(ri,ri,half*2,segments,1,true).rotateX(Math.PI/2)),1],
    ];
    // Its walls are an outline, and on the sheet an outline goes entirely once it is behind P; its faces
    // are a tint, and keep a trace. See `pieceFade`.
    // A band wider than the picture is drawn as a light wash, and a wash behind P goes with the outline:
    // the outermost ring's far face was a faint card edge arcing over P.
    const wash=faceAlpha<.5;
    // ...and a wash's walls are laid no stronger than its face, dissolving as the shading round it does (see `washWall`).
    const wall=wash&&far?(x:number,y:number)=>washWall(faceAlpha,x,y,frameWorld*.45,far):null;
    // AND A WASH'S FACE ENDS ON THE SAME ELLIPSE (see `fillFade`). Faded only behind P, a ring wider than the picture
    // filled it to the window's sides, where the window's own fade cut it square: a rounded-rectangle slab with the
    // ring's outline inside it, not a ring. Dissolving as the shading round it does, it ends on a curve in the plane.
    const side=wash&&far?(x:number,y:number)=>fillFade(x,y,frameWorld*.45,far):null;
    parts.forEach(([g,alpha],i)=>fadeGeometry(g,fade?.inner??0,fade?.outer??0,i>1&&wall?1:alpha,far&&(i>1||wash)?pieceFade(far,'outline'):far,1,i>1?wall:side));
    // The strongest each is laid, for the tests: a wall stronger than its face is a dark mark over a light wash. And the
    // strongest the face is laid at the window's sides, which a wash must not reach (in local units, which are metres).
    const peak=(g:Geometry,beyond=0)=>{const c=g.getAttribute('color') as Attribute,q=g.getAttribute('position') as Attribute;let m=0;for(let i=0;i<c.count;i++)if(Math.abs(q.getX(i))>=beyond)m=Math.max(m,c.getW(i));return m;};
    const sideAt=frameWorld*.45;
    washerInk={face:Math.max(peak(parts[0][0]),peak(parts[1][0])),wall:Math.max(peak(parts[2][0]),peak(parts[3][0])),edge:Math.max(peak(parts[0][0],sideAt),peak(parts[1][0],sideAt))};
    const merged=mergeGeometries(parts.map(([g])=>g));
    parts.forEach(([g])=>g.dispose());
    return merged??new THREE.BufferGeometry();
   };
   /** Alpha per vertex, so one material can carry a ramp: the sheet's own surface dissolves with
    * distance, and every line and axis in the scene stops the same way.
    *
    * `far` dims the sheet's far side as well (see `sheetFarFade`): local +y is the camera's far
    * direction once the mesh is turned by the yaw, and `scale` turns local units into metres. The
    * ramp is repainted into the buffer it already has, since it moves with the camera's pitch. */
   const fadeGeometry=(g:Geometry,inner:number,outer:number,base=1,far:FarFade|null=null,scale=1,extra:((x:number,y:number)=>number)|null=null)=>{
    const position=g.getAttribute('position') as Attribute|undefined;
    if(!position)return g;
    const old=g.getAttribute('color') as Attribute|undefined,reuse=!!old&&old.itemSize===4&&old.count===position.count;
    const colours=reuse?old!.array as Float32Array:new Float32Array(position.count*4);
    for(let i=0;i<position.count;i++){
     const x=position.getX(i),y=position.getY(i);
     const a=(outer>inner?fadeOut(Math.hypot(x,y),inner,outer):1)*(far?farAlpha(y*scale,far):1)*(extra?extra(x*scale,y*scale):1);
     colours[i*4]=1;colours[i*4+1]=1;colours[i*4+2]=1;colours[i*4+3]=a*base;
    }
    if(reuse)old!.needsUpdate=true;else g.setAttribute('color',new THREE.BufferAttribute(colours,4));
    return g;
   };
   /** A band of the spherical shell between two angles from the top, lifted a hair off the skin so it never fights it.
    * Three's sphere runs its angle from +y; turned a quarter about x, that is the shell's +z. */
   const shellBand=(R:number,lo:number,hi:number,lift=1.012,rings=6,alpha=.8)=>fadeGeometry(new THREE.SphereGeometry(R*lift,128,rings,0,2*Math.PI,lo,Math.max(1e-4,hi-lo)).rotateX(Math.PI/2),0,0,alpha);
   let shellR=1;
   const buildElement=(e:NonNullable<FieldStageProps['element']>,radius:number,fade:{inner:number;outer:number}|null,frameWorld:number,far:FarFade|null=null)=>{
    element.geometry.dispose();
    if('band' in e){element.geometry=shellBand(shellR,e.band.lo,e.band.hi);mount.parentElement?.removeAttribute('data-scene-washer-ink');return;}
    if('annulus' in e){
     element.geometry=washer(e.annulus.inner,e.annulus.outer,washerHalf(radius,e.annulus.inner,e.annulus.outer,px),fade,frameWorld,far);
     if(washerInk)mount.parentElement?.setAttribute('data-scene-washer-ink',`${washerInk.face.toFixed(4)} ${washerInk.wall.toFixed(4)} ${washerInk.edge.toFixed(4)}`);
     return;
    }
    mount.parentElement?.removeAttribute('data-scene-washer-ink');
    const points=e.path.map(v=>new THREE.Vector3(v.x,v.y,v.z));
    // A straight rod's element is two points, which CatmullRom cannot curve; a ring's is
    // thirteen along the real arc, so the piece bends exactly as the wire does.
    element.geometry=fadeGeometry(points.length>1
     ?taperTube(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal'),Math.max(8,points.length*2),radius,14,false))
     :new THREE.BufferGeometry(),0,0);
   };
   // AN ARROWHEAD IS A FLAT TRIANGLE, turned about the arrow to face the camera. It was a cone, squat
   // (about as long as it was wide) and drawn in one flat colour: an arrow lying in the plane seen
   // from above showed the cone's base as a disc, its tip a pixel or two past the rim, and One
   // piece's arrow ended in a dot, the sum in a ball on a stick. A triangle standing in the plane of
   // the arrow and the line of sight is the flat figure's arrowhead from any angle the camera takes.
   const flatHead=new THREE.BufferGeometry();
   flatHead.setAttribute('position',new THREE.Float32BufferAttribute([0,.5,0,-.5,-.5,0,.5,-.5,0],3));
   flatHead.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
   const arrow=(material:InstanceType<typeof THREE.Material>)=>{
    const g=new THREE.Group(),shaft=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,10,1),material),head=new THREE.Mesh(flatHead,material);
    g.add(shaft,head);return {group:g,shaft,head};
   };
   const netArrow=arrow(netMaterial),partArrow=arrow(partMaterial);
   marks.add(point,halo,element,netArrow.group,partArrow.group);
   const Y=new THREE.Vector3(0,1,0),tmpQ=new THREE.Quaternion(),tmpV=new THREE.Vector3(),gapAt=new THREE.Vector3();
   // Toward the camera and up the screen, kept current by `apply`; and the size of one unit of the
   // figure's viewBox in metres, so a head can be given a size on the screen.
   const toCamera=new THREE.Vector3(0,0,1),screenUp=new THREE.Vector3(0,1,0);
   let px=.02,cssPx=.02;
   const hx=new THREE.Vector3(),hz=new THREE.Vector3(),hm=new THREE.Matrix4();
   /** Stand a flat head along `u`, centred on `centre`, facing the camera as squarely as it can. An
    * arrow pointing straight at the camera has no direction on the screen, and its head goes edge on. */
   const faceHead=(head:InstanceType<typeof THREE.Mesh>,u:InstanceType<typeof THREE.Vector3>,centre:Vec,length:number,half:number)=>{
    hz.copy(toCamera).addScaledVector(u,-toCamera.dot(u));
    if(hz.lengthSq()<1e-8)hz.copy(screenUp).addScaledVector(u,-screenUp.dot(u));
    hz.normalize();hx.crossVectors(u,hz);
    hm.makeBasis(hx,u,hz);head.quaternion.setFromRotationMatrix(hm);
    head.scale.set(half*2,length,1);head.position.set(centre.x,centre.y,centre.z);
   };
   /** See `arrowHead`. */
   const headSize=(length:number,thick:number)=>{const h=arrowHead(length,thick,px,cssPx);return {l:h.length,half:h.half};};
   /** Lay an arrow from `from` along `dir` for `length`, with a head that never outgrows it. */
   const layArrow=(a:ReturnType<typeof arrow>,from:Vec,dir:Vec,length:number,thick:number)=>{
    const l=Math.hypot(dir.x,dir.y,dir.z);
    if(!(length>1e-4)||l<1e-9){a.group.visible=false;return;}
    a.group.visible=true;
    const u=tmpV.set(dir.x/l,dir.y/l,dir.z/l);tmpQ.setFromUnitVectors(Y,u);
    const head=headSize(length,thick),shaftLen=Math.max(length-head.l,1e-4);
    a.shaft.quaternion.copy(tmpQ);a.shaft.scale.set(thick,shaftLen,thick);a.shaft.position.set(from.x+u.x*shaftLen/2,from.y+u.y*shaftLen/2,from.z+u.z*shaftLen/2);
    faceHead(a.head,u,{x:from.x+u.x*(shaftLen+head.l/2),y:from.y+u.y*(shaftLen+head.l/2),z:from.z+u.z*(shaftLen+head.l/2)},head.l,head.half);
   };
   // ---- WATCH IT BUILD, AS BODIES ------------------------------------------------------------
   // Every stage of the run used to be the flat figure's, painted over the scene: the cuts, the
   // mirror partner, the pieces already added, the parts of the arrow and the chain. On a rod turned
   // into space most of that was not painted at all, because the flat pieces are laid out for the
   // flat view. These are the same things as objects in the scene, so they turn with it, sit behind
   // and in front of what they really are behind and in front of, and read in any view.
   /** Tubes along polylines, one colour each, closed at both ends and merged into one geometry.
    *
    * By hand rather than through TubeGeometry: in the limit there are a hundred and sixty pieces,
    * cut in two while the next doubling grows, rebuilt as the gaps close -- and a Catmull-Rom curve
    * and its Frenet frames for every one of them, every few frames, is the slow part of the scene.
    * A polyline with frames carried along it is all a short piece needs. The ends are capped,
    * because a cut tube is hollow, and a hollow piece seen end-on reads as a pipe. */
   //
   // With `soft`, the ends are left open. Lit as faces, a hundred closing cuts each drew a dark line across
   // the tube, and mid-shrink the ring read as a ribbed hose rather than as cuts closing. By then a piece
   // is a few times longer than it is wide and is never seen end on, so its open end shows only the paper
   // through the gap: a hairline, which is what a closing cut is.
   const tubes=(list:readonly {points:readonly Vec[];rgba:readonly number[]}[],radius:number,radial=10,soft=false)=>{
    const pos:number[]=[],nor:number[]=[],col:number[]=[],idx:number[]=[];
    const t=new THREE.Vector3(),n=new THREE.Vector3(),b=new THREE.Vector3(),aside=new THREE.Vector3();
    const ring=(c:Vec,normal:{x:number;y:number;z:number}|null,rgba:readonly number[])=>{
     const thin=taperAt(c);
     for(let j=0;j<radial;j++){
      const angle=2*Math.PI*j/radial,cs=Math.cos(angle),sn=Math.sin(angle);
      const dx=n.x*cs+b.x*sn,dy=n.y*cs+b.y*sn,dz=n.z*cs+b.z*sn;
      pos.push(c.x+dx*radius*thin,c.y+dy*radius*thin,c.z+dz*radius*thin);
      if(normal)nor.push(normal.x,normal.y,normal.z);else nor.push(dx,dy,dz);
      col.push(rgba[0],rgba[1],rgba[2],rgba[3]);
     }
    };
    const frame=(pts:readonly Vec[],i:number,first:boolean)=>{
     const a=pts[Math.max(0,i-1)],c=pts[Math.min(pts.length-1,i+1)];
     t.set(c.x-a.x,c.y-a.y,c.z-a.z).normalize();
     // Carried along rather than recomputed, so the tube does not twist: the last normal, with
     // the new tangent's share taken out.
     if(!first)n.addScaledVector(t,-n.dot(t));
     if(first||n.lengthSq()<1e-12)n.crossVectors(t,Math.abs(t.x)<.9?aside.set(1,0,0):aside.set(0,1,0));
     n.normalize();b.crossVectors(t,n);
    };
    for(const {points,rgba} of list){
     // A step of no length has no direction to frame, and trimming can leave one at a cut.
     const pts=points.filter((p,i)=>i===0||Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y,p.z-points[i-1].z)>1e-7);
     if(pts.length<2)continue;
     const m=pts.length;
     let previous=-1;
     for(let i=0;i<m;i++){
      frame(pts,i,i===0);
      const here=pos.length/3;
      ring(pts[i],null,rgba);
      // Wound so the outside faces out: the lit side is the side the camera sees.
      if(previous>=0)for(let j=0;j<radial;j++){
       const a=previous+j,a2=previous+(j+1)%radial,c=here+j,d=here+(j+1)%radial;
       idx.push(a,a2,c,a2,d,c);
      }
      previous=here;
      // A cap at each end, on the same frame as the ring it closes so the two meet edge to edge.
      if(!soft&&(i===0||i===m-1)){
       const sign=i===0?-1:1,centre=pos.length/3,normal={x:t.x*sign,y:t.y*sign,z:t.z*sign};
       pos.push(pts[i].x,pts[i].y,pts[i].z);nor.push(normal.x,normal.y,normal.z);col.push(rgba[0],rgba[1],rgba[2],rgba[3]);
       ring(pts[i],normal,rgba);
       for(let j=0;j<radial;j++){
        const v=centre+1+j,w=centre+1+(j+1)%radial;
        if(sign<0)idx.push(centre,w,v);else idx.push(centre,v,w);
       }
      }
     }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,4));
    g.setIndex(idx);
    return g;
   };
   // The pieces of a cut wire. Solid ones are opaque; the ones that have stepped back are drawn
   // see-through and do not write depth, so a field line or the partner behind one is not cut out.
   // BOTH SIDES, so an open end is not a window. Past forty pieces the cuts are left open (see `tubes`), and
   // seen at a slant into an open end the reader looked through the hollow tube to the paper behind it: each
   // hairline cut showed as a white band a tube's width across, and the closing wire read as a coil spring.
   // Drawn on both sides, the far wall's inside closes the view in the tube's own colour, and a cut is as
   // wide as it is.
   const pieceMaterial=new THREE.MeshStandardMaterial({...MATTE,vertexColors:true,side:THREE.DoubleSide});
   const ghostMaterial=new THREE.MeshStandardMaterial({...MATTE,vertexColors:true,transparent:true,depthWrite:false});
   const pieceSolid=new THREE.Mesh(new THREE.BufferGeometry(),pieceMaterial),pieceGhost=new THREE.Mesh(new THREE.BufferGeometry(),ghostMaterial);
   // The part of a surface already summed: a disc out to where the sum has reached, over the body.
   const fillMaterial=new THREE.MeshStandardMaterial({roughness:.5,metalness:0,side:THREE.DoubleSide,transparent:true,vertexColors:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
   const fill=new THREE.Mesh(new THREE.BufferGeometry(),fillMaterial);
   // THE SHEET DISSOLVES BEFORE THE WINDOW DOES. Faded only with distance from O, it was still a third
   // to a half there at the bottom corners of the picture, where the plane comes nearest -- so the
   // window's own rounded corners became the sheet's visible edge, and "a sheet that never ends" read
   // as a card pasted into the card. The plane and its shading are faded on the screen as well, to
   // nothing within a few units of every edge of the window, which is how the grid and the axes end.
   //
   // ONLY ON THE SHEET. The fade is for the one charge that does not end; on the disk it dissolved the chosen
   // washer and the summed shading over the last forty units above the window's foot while the disk under
   // them, which is not faded, was cut hard by the clip -- a brown gradient that read as a hole or a shadow
   // in the washer. `uEdgeOn` is 1 on the sheet and 0 on everything else.
   const edge={uEdgeRect:{value:new THREE.Vector4(0,0,1,1)},uEdgeFeather:{value:1},uEdgeOn:{value:0}};
   // A GAP ROUND P IN WHATEVER OF THE CHARGE LIES BEHIND IT (see BEHIND_GAP). Any part of a surface, its
   // rings, its cuts or its summed shading that is FARTHER from the camera than P, and drawn within a few
   // pixels of it, is let go, smoothly; any part of a wire or its pieces is cut clean, since an opaque tube
   // cannot be faded. In every view, not only the opening one: the sheet's far fade (see `sheetFarFade`)
   // is fitted to the opening camera, and tipping the view up brought the far rim onto P. What lies in front
   // of P is never touched. `uGapP` is P in drawing-buffer pixels with the depth the gap starts at; `uGapDepth`
   // how deep its ramp in is, as window depth (see `gapDepth`); `uGapRamp` the soft ramp's two radii and the
   // strength left inside it, and the hard cut's radius, in drawing-buffer pixels sized from the figure's own
   // units (see BEHIND_GAP); `uGapOn` is 1 for a surface and 2 for a wire. `uGapKeep`, each material's own, is
   // what the chosen piece keeps of itself in the gap (PIECE_FAR_LOW), and below zero for everything else.
   const gap={uGapP:{value:new THREE.Vector3(0,0,2)},uGapOn:{value:0},uGapLift:{value:1},uGapDepth:{value:1e-3},uGapRamp:{value:new THREE.Vector4(BEHIND_GAP.inner,BEHIND_GAP.outer,BEHIND_GAP.low,BEHIND_GAP.hard)}};
   const EDGE_GLSL='if(uEdgeOn>.5){vec2 fc=gl_FragCoord.xy;float e=clamp(min(min(fc.x-uEdgeRect.x,uEdgeRect.z-fc.x),min(fc.y-uEdgeRect.y,uEdgeRect.w-fc.y))/uEdgeFeather,0.,1.);gl_FragColor.a*=e*e*(3.-2.*e);}';
   // A WIRE IN THE GAP IS DIMMED, NOT CUT. It was cut clean within the hard radius, the drafting gap a far line is given
   // behind a near point -- and a ring tipped up, with P over its far rim, came out as an open C, a closed loop of charge
   // with a piece missing. An opaque tube cannot be faded, so where it has the paper's colour to hand (the charge's own
   // body and pieces: see `cubeFade`) it is mixed toward the paper, to PIECE_FAR_LOW of itself, as the chosen piece is:
   // still plainly behind P, still plainly closed. `WIRE_GAP` is replaced per material.
   const GAP_GLSL='if(uGapOn>.5){float k=smoothstep(uGapP.z,uGapP.z+uGapDepth,gl_FragCoord.z)*uGapLift;if(k>0.){float d=distance(gl_FragCoord.xy,uGapP.xy);'
    +'if(uGapOn>1.5&&uGapKeep<0.){WIRE_GAP}else gl_FragColor.a*=mix(1.,mix(uGapKeep<0.?uGapRamp.z:uGapKeep,1.,smoothstep(uGapRamp.x,uGapRamp.y,d)),k);}}';
   const WIRE_CUT='if(k>.5&&d<uGapRamp.w)discard;',WIRE_DIM=`if(k>.5&&d<uGapRamp.w)gl_FragColor.rgb=mix(uPaper,gl_FragColor.rgb,${PIECE_FAR_LOW.toFixed(3)});`;
   // THE CHARGE GOES UNDER THE VIEW CUBE BY FADING INTO THE PAPER. The cube and its four buttons stand inside the
   // window at its top-left corner, and the infinite and the semi-infinite lines run up the picture into that corner:
   // an orange rod passing under a grey control, its end cut by the cube's face, looked unfinished, as a mark drawn
   // under a button does. The window's own edge fade does not reach it -- the cube is inside the window -- so the charge
   // has a fade of its own round the cube's box (see `controlBox`): mixed into the paper over twenty-four units of the
   // figure as it comes up to the box, and gone under it, as the rod's far end dissolves at the window's edge. A solid
   // wire cannot be made see-through, so it is mixed with the paper; a translucent piece loses its alpha too.
   // `uCubeRect` is the box in drawing-buffer pixels, upward as gl_FragCoord counts them; off (`uCubeOn` 0) in 2D.
   const cubeFade={uCubeRect:{value:new THREE.Vector4(0,0,0,0)},uCubeFeather:{value:1},uCubeOn:{value:0},uPaper:{value:new THREE.Color(1,1,1)}};
   const CUBE_GLSL='if(uCubeOn>.5){vec2 fc=gl_FragCoord.xy;vec2 o=max(max(uCubeRect.xy-fc,fc-uCubeRect.zw),vec2(0.));float c=smoothstep(0.,uCubeFeather,length(o));gl_FragColor.rgb=mix(uPaper,gl_FragColor.rgb,c);gl_FragColor.a*=c;}';
   /** Patch a material's fragment shader with the window's edge fade and the gap round P, or only the gap,
    * and what it keeps of itself there (`keep`, below zero for all but the chosen piece); and, for the charge's
    * own body and pieces, the fade round the view cube (`cube`). Named in the program cache by which, since three
    * would otherwise share one compiled program between materials whose patches differ only in what they capture. */
   const patch=(m:InstanceType<typeof THREE.Material>,edgeFade:boolean,keep=-1,cube=false)=>{
    const own={uGapKeep:{value:keep}};
    m.onBeforeCompile=shader=>{
     Object.assign(shader.uniforms,gap,own,edgeFade?edge:{},cube?cubeFade:{});
     shader.fragmentShader=shader.fragmentShader.replace('void main() {',`${edgeFade?'uniform vec4 uEdgeRect;\nuniform float uEdgeFeather;\nuniform float uEdgeOn;\n':''}${cube?'uniform vec4 uCubeRect;\nuniform float uCubeFeather;\nuniform float uCubeOn;\nuniform vec3 uPaper;\n':''}uniform vec3 uGapP;\nuniform float uGapOn;\nuniform float uGapLift;\nuniform float uGapDepth;\nuniform float uGapKeep;\nuniform vec4 uGapRamp;\nvoid main() {`)
      .replace('#include <opaque_fragment>',`#include <opaque_fragment>\n${edgeFade?EDGE_GLSL:''}\n${GAP_GLSL.replace('WIRE_GAP',cube?WIRE_DIM:WIRE_CUT)}\n${cube?CUBE_GLSL:''}`);
    };
    m.customProgramCacheKey=()=>`field-stage:${edgeFade?'edge+gap':'gap'}:${keep<0?'cut':'keep'}${cube?':cube':''}`;
   };
   // And the chosen piece: the sheet's outermost ring reaches past every edge of the window, and its face
   // painted the whole top of the picture out to the window's rounded corners. It, and the mirror piece
   // drawn in its material, keep PIECE_FAR_LOW of themselves in the gap behind P (see BEHIND_GAP).
   patch(sheetMaterial,true);patch(fillMaterial,true);patch(elementMaterial,true,PIECE_FAR_LOW,true);
   // The body itself -- a disk, its rim and its rings, or a wire's tube -- and the cuts made across a surface
   // in the run: only the gap. And the charge's own body and its pieces, the fade round the view cube.
   for(const m of [sliceMaterial,pickedMaterial])patch(m,false);
   for(const m of [bodyMaterial,pieceMaterial,ghostMaterial])patch(m,false,-1,true);
   /** The sheet's summed shading out to radius `r`: a disc faded by an ellipse about O (see `fillFade`),
    * in the mesh's own frame, which is turned by the yaw so its +y is the camera's far direction. */
   const fillGeometry=(r:number,wide:number,far:FarFade|null,peak:number)=>{
    const g=new THREE.RingGeometry(0,r,128,32),position=g.getAttribute('position') as Attribute,rgba=new Float32Array(position.count*4);
    for(let i=0;i<position.count;i++){rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=1;rgba[i*4+3]=peak*(far?fillFade(position.getX(i),position.getY(i),wide,far):1);}
    g.setAttribute('color',new THREE.BufferAttribute(rgba,4));
    return g;
   };
   // A surface's cuts, as the circles it is cut along.
   // Coloured per vertex so the sheet's far cuts can dim with the sheet they are cut in.
   const cutMaterial=new THREE.LineBasicMaterial({transparent:true,vertexColors:true}),growMaterial=new THREE.LineBasicMaterial({transparent:true,vertexColors:true});
   patch(cutMaterial,false);patch(growMaterial,false);
   const cuts=new THREE.Group();
   const runBodies=new THREE.Group();runBodies.add(pieceSolid,fill,cuts,pieceGhost);scene.add(runBodies);
   // The mirror partner: the same material and weight as the chosen piece it answers.
   const partnerBody=new THREE.Mesh(new THREE.BufferGeometry(),elementMaterial);
   // The parts of one piece's arrow. The part that survives is solid, like the arrow it came from;
   // the parts that go are dashed, as they are in the flat figure, and have their own material,
   // because they fade as they shrink.
   //
   // THE MIRROR PIECE'S ARROW IS SOLID. It was dashed for the whole stage, in the same teal as the
   // sideways parts that cancel -- the figure's mark for what goes -- so the scene said the mirror
   // piece contributes nothing, while the board says its part along the axis adds. It is a whole
   // contribution, of which only the sideways part goes: solid, in the flat figure's lighter tint for
   // it (the contribution colour 52% of the way from the paper), and once the sideways parts have gone
   // its own surviving part is laid on the piece's, tip to tail, fading in as the flat one does.
   const fadeMaterial=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false});
   // The pair's two whole arrows fade as their parts across cancel (see `RunArrows.whole`), so the mirror's is
   // see-through, at full strength everywhere else; and the piece's own whole arrow, while a pair goes into the
   // sum, is drawn by the run in a fading copy of the part colour. The same program as the other see-through
   // unlit marks, so nothing new is compiled when the run reaches them.
   const partnerMaterial=new THREE.MeshBasicMaterial({transparent:true}),partnerKeepMaterial=new THREE.MeshBasicMaterial();
   const wholeMaterial=new THREE.MeshBasicMaterial({transparent:true});
   const DASHES=64,dashGeometry=new THREE.CylinderGeometry(1,1,1,8,1);
   const dashed=(material:InstanceType<typeof THREE.Material>)=>{
    const dashes=new THREE.InstancedMesh(dashGeometry,material,DASHES),head=new THREE.Mesh(flatHead,material),group=new THREE.Group();
    // Instances move every frame of the cancellation; a bounding sphere cached from the first
    // frame would cull them wherever they had moved to.
    dashes.frustumCulled=false;dashes.count=0;group.add(dashes,head);group.visible=false;
    return {group,dashes,head};
   };
   // The dropped part with nothing to cancel it survives, and is drawn as the survivor it is: a
   // second solid arrow, as thick as the kept part, in the same ink. See `dropStyle`.
   let partnerKeepFade=1;
   const keepArrow=arrow(partMaterial),dropArrow=arrow(partMaterial),pairDropArrow=dashed(fadeMaterial),partnerArrow=arrow(partnerMaterial),partnerKeepArrow=arrow(partnerKeepMaterial),partnerDropArrow=dashed(fadeMaterial),wholeArrow=arrow(wholeMaterial);wholeArrow.group.visible=false;
   const dashM=new THREE.Matrix4(),dashP=new THREE.Vector3(),dashS=new THREE.Vector3();
   /** A dashed arrow: dashes along the shaft and a solid head, so it is plainly an arrow and
    * plainly not one of the solid ones. */
   const layDashed=(a:ReturnType<typeof dashed>,from:Vec,dir:Vec|null,thick:number)=>{
    const length=dir?Math.hypot(dir.x,dir.y,dir.z):0;
    if(!dir||!(length>1e-4)){a.group.visible=false;return;}
    a.group.visible=true;
    const u=tmpV.set(dir.x/length,dir.y/length,dir.z/length);tmpQ.setFromUnitVectors(Y,u);
    const {l:headLen,half}=headSize(length,thick),shaftLen=Math.max(length-headLen,0);
    const dash=thick*4.2,period=dash+thick*3.4,count=Math.min(DASHES,Math.max(shaftLen>1e-4?1:0,Math.round((shaftLen+thick*3.4)/period)));
    for(let k=0;k<count;k++){
     const s0=shaftLen*k/count,s1=Math.min(shaftLen,s0+Math.min(dash,shaftLen/count)),mid=(s0+s1)/2;
     dashP.set(from.x+u.x*mid,from.y+u.y*mid,from.z+u.z*mid);dashS.set(thick,Math.max(1e-4,s1-s0),thick);
     dashM.compose(dashP,tmpQ,dashS);a.dashes.setMatrixAt(k,dashM);
    }
    a.dashes.count=count;a.dashes.instanceMatrix.needsUpdate=true;
    faceHead(a.head,u,{x:from.x+u.x*(shaftLen+headLen/2),y:from.y+u.y*(shaftLen+headLen/2),z:from.z+u.z*(shaftLen+headLen/2)},headLen,half);
   };
   // The chain: every piece's arrow laid tip to tail, as links, with a bead where each one joins.
   // The beads are the links' own ink, unlit: they were lit spheres washed most of the way to white,
   // and came out as grey nubs along a teal chain.
   const LINKS=256,chainMaterial=new THREE.MeshBasicMaterial(),jointMaterial=new THREE.MeshBasicMaterial();
   const chainLinks=new THREE.InstancedMesh(dashGeometry,chainMaterial,LINKS),chainJoints=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,10),jointMaterial,LINKS);
   chainLinks.frustumCulled=false;chainJoints.frustumCulled=false;chainLinks.count=0;chainJoints.count=0;
   // THE LINK THE WALK HAS JUST ADDED, as the flat figure marks it: in the piece's own colour, heavier, with its
   // own head, while the links before it stand back to a lighter tint. In space the flat chain is hidden and
   // this is the chain, and every link was the same teal: nothing matched "this piece", lit on the charge, to
   // "this arrow", and the chain read as a growing wiggle.
   const newestMaterial=new THREE.MeshBasicMaterial(),newestArrow=arrow(newestMaterial);newestArrow.group.visible=false;
   // The two hairlines that tie a pair's parts back to the axis where they are laid beside the sum (see `KEEP_ASIDE`).
   const tieMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.55,depthWrite:false});
   const ties=[new THREE.Mesh(dashGeometry,tieMaterial),new THREE.Mesh(dashGeometry,tieMaterial)];
   for(const t of ties)t.visible=false;
   marks.add(partnerBody,keepArrow.group,dropArrow.group,pairDropArrow.group,partnerArrow.group,partnerKeepArrow.group,partnerDropArrow.group,wholeArrow.group,chainLinks,chainJoints,newestArrow.group,...ties);
   const linkA=new THREE.Vector3(),linkQ=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),aside=new THREE.Vector3(),across=new THREE.Vector3(),screenRight=new THREE.Vector3(1,0,0);
   /** One straight link of the chain, from a to b (offsets from P), drawn as a rod. */
   const link=(from:Vec,a:Vec,b:Vec,thick:number,at:number)=>{
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=Math.hypot(dx,dy,dz);
    if(l<1e-6)return at;
    linkQ.setFromUnitVectors(Y,linkA.set(dx/l,dy/l,dz/l));
    dashP.set(from.x+a.x+dx/2,from.y+a.y+dy/2,from.z+a.z+dz/2);dashS.set(thick,l,thick);
    dashM.compose(dashP,linkQ,dashS);chainLinks.setMatrixAt(at,dashM);
    return at+1;
   };
   const layChain=(from:Vec,chain:readonly Vec[]|null,thick:number,net:Vec|null,beside:boolean,settle=1,newest=false)=>{
    // Moved to one side of the net arrow where it would lie inside it (see `RunScene.chainBeside`): ten
    // units of the figure, as the flat chain is moved -- right of an arrow standing up on the screen,
    // above one lying across it -- and tied back to P by a hairline, so it still visibly starts there.
    //
    // NOT WHILE THE CHAIN IS SHORT. On its first link the chain is a stub a few units long and the net arrow
    // is not drawn yet, so there was nothing to bury it in; moved ten units aside and tied back, the only
    // mark at P was a short sideways stroke ending in a knob -- on the disk and the sheet, the two lessons
    // whose point is that nothing sideways survives, a sideways field at P. So the chain stays on P until it
    // is thirty units long on the screen, and is then moved aside by at most three tenths of that length.
    //
    // AND IT COMES BACK ONTO THE NET ARROW AS THE PIECES SHRINK (`settle`, the cuts still open): the chain of
    // infinitely many infinitesimal pieces IS the integral, so it ends inside E rather than as a second bar
    // standing beside E at full strength, with a tick at its end, read as a dimension line or a double shaft.
    let shift:Vec={x:0,y:0,z:0};
    const end=chain?.[chain.length-1],shown=end?Math.hypot(end.x*screenRight.x+end.y*screenRight.y+end.z*screenRight.z,end.x*screenUp.x+end.y*screenUp.y+end.z*screenUp.z)/px:0;
    if(chain&&end&&beside&&shown>=CHAIN_ASIDE.from&&settle>.02){
     const u=linkA.set(net?.x??end.x,net?.y??end.y,net?.z??end.z).normalize();
     const upright=Math.abs(u.dot(screenUp))>=Math.abs(u.dot(screenRight));
     aside.copy(upright?screenRight:screenUp).addScaledVector(u,-(upright?screenRight:screenUp).dot(u));
     if(aside.lengthSq()<1e-10)aside.copy(across.crossVectors(u,toCamera));
     aside.normalize().multiplyScalar(chainAside(shown)*settle*px);
     shift={x:aside.x,y:aside.y,z:aside.z};
    }
    // How far aside the chain is drawn, and how long it is on the screen, in units of the figure: for the tests.
    const stage=mount.parentElement;
    if(chain&&end){stage?.setAttribute('data-run-chain-shift',(Math.hypot(shift.x,shift.y,shift.z)/px).toFixed(2));stage?.setAttribute('data-run-chain-shown',shown.toFixed(2));}
    else{stage?.removeAttribute('data-run-chain-shift');stage?.removeAttribute('data-run-chain-shown');}
    const moved=(v:Vec):Vec=>({x:v.x+shift.x,y:v.y+shift.y,z:v.z+shift.z});
    const links=chain?Math.min(LINKS-1,chain.length-1):0;
    // The newest link, where it is long enough on the screen to carry a head (six units, as the flat figure's).
    const last=links?{a:moved(chain![links-1]),b:moved(chain![links])}:null;
    const lastShown=last?Math.hypot((last.b.x-last.a.x)*screenRight.x+(last.b.y-last.a.y)*screenRight.y+(last.b.z-last.a.z)*screenRight.z,(last.b.x-last.a.x)*screenUp.x+(last.b.y-last.a.y)*screenUp.y+(last.b.z-last.a.z)*screenUp.z)/px:0;
    const marked=newest&&!!last&&lastShown>6;
    let drawn=0;
    if(links&&(shift.x||shift.y||shift.z))drawn=link(from,chain![0],moved(chain![0]),thick*.45,drawn);
    for(let k=0;k<links-(marked?1:0);k++)drawn=link(from,moved(chain![k]),moved(chain![k+1]),thick,drawn);
    chainLinks.count=drawn;chainLinks.instanceMatrix.needsUpdate=true;
    if(marked){
     const d={x:last!.b.x-last!.a.x,y:last!.b.y-last!.a.y,z:last!.b.z-last!.a.z};
     layArrow(newestArrow,{x:from.x+last!.a.x,y:from.y+last!.a.y,z:from.z+last!.a.z},d,Math.hypot(d.x,d.y,d.z),thick*1.3);
    }else newestArrow.group.visible=false;
    stage?.setAttribute('data-run-newest',marked?'true':'false');
    // Beads only while they can be told apart, as in the flat figure, which stops marking the joins
    // past sixty-five pieces: past that they are a bead necklace, not a chain of arrows. Not on the
    // last join, either: that is the sum's own arrowhead, which a bead sat on and hid.
    const beads=chain&&chain.length<=65?chain.length-2:0;
    for(let k=0;k<beads;k++){
     const c=moved(chain![k+1]);dashP.set(from.x+c.x,from.y+c.y,from.z+c.z);
     dashM.compose(dashP,linkQ.identity(),dashS.copy(one).multiplyScalar(thick*1.7));chainJoints.setMatrixAt(k,dashM);
    }
    chainJoints.count=Math.max(0,beads);chainJoints.instanceMatrix.needsUpdate=true;
   };
   // The lattice's arrows: an instanced shaft, a unit cylinder along +y, and an instanced flat head --
   // the same camera-facing triangle as every other arrow here. They were a cone merged onto the shaft,
   // squat, and an arrow short or pointing at the camera ended in a round blob: a pin, not an arrow.
   const arrowGeometry=new THREE.CylinderGeometry(1,1,1,7);
   const unitCircle=(segments=128)=>new THREE.BufferGeometry().setFromPoints(
    Array.from({length:segments+1},(_,i)=>{const t=2*Math.PI*i/segments;return new THREE.Vector3(Math.cos(t),Math.sin(t),0);}));
   const clearGroup=(group:InstanceType<typeof THREE.Group>)=>{
    while(group.children.length){
     const child=group.children[group.children.length-1];
     group.remove(child);
     (child as {geometry?:{dispose:()=>void}}).geometry?.dispose();
    }
   };
   // Axes with metre ticks, and a faint grid on the plane the charge lies in, so the scene
   // carries its own sense of scale and depth the way a graphing calculator's does. The SVG
   // keeps the axis letters; its axis strokes are hidden while the scene draws these.
   const axisMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:.78,vertexColors:true});
   const gridMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:.2,vertexColors:true});
   const axes=new THREE.LineSegments(new THREE.BufferGeometry(),axisMaterial),grid=new THREE.LineSegments(new THREE.BufferGeometry(),gridMaterial);
   // The ticks are their own strokes, so the ones under P and its arrows can be let go: see `tickGaps`.
   const ticks=new THREE.LineSegments(new THREE.BufferGeometry(),axisMaterial);
   scene.add(grid,axes,ticks);
   let tickMeta:{axis:0|1|2;t:number;base:[number,number]}[]=[],tickMinor=1,tickKey='';
   let frameKey='';
   const buildFrame=(extent:number)=>{
    // Both the axes and the grid are cut into short pieces and faded per vertex, so they run
    // out into the background instead of stopping at a square boundary the reader can see.
    // A line drawn end to end would take the fade as one straight interpolation and the whole
    // middle of the picture would dim with it.
    const a:number[]=[],ac:number[]=[],g:number[]=[],gc:number[]=[],k:number[]=[],kc:number[]=[],meta:typeof tickMeta=[];
    const inner=extent*.42;
    const push=(list:number[],colours:number[],x1:number,y1:number,z1:number,x2:number,y2:number,z2:number)=>{
     list.push(x1,y1,z1,x2,y2,z2);
     for(const [x,y,z] of [[x1,y1,z1],[x2,y2,z2]]){
      colours.push(1,1,1,fadeOut(Math.hypot(x,y,z),inner,extent));
     }
    };
    // Every fifth tick is a major one, cut longer, so the axes read as rulers without a number on
    // them. The rest are the metre marks between them.
    const step=tickStep(extent),minor=step>=5?step/5:1;
    const count=Math.floor(extent/minor+1e-9);
    for(const [x,y,z] of [[1,0,0],[0,1,0],[0,0,1]] as const){
     for(let i=-count;i<count;i++){
      const t0=i*minor,t1=(i+1)*minor;
      push(a,ac,t0*x,t0*y,t0*z,t1*x,t1*y,t1*z);
     }
     for(let i=-count;i<=count;i++){
      if(i===0)continue;
      const t=i*minor,long=Math.abs(t/step-Math.round(t/step))<1e-9;
      // a tick lies across the axis, in the plane of the grid where it can
      const [ux,uy,uz]=z?[1,0,0]:[0,0,1],tick=long?.17:.075;
      push(k,kc,t*x-ux*tick,t*y-uy*tick,t*z-uz*tick,t*x+ux*tick,t*y+uy*tick,t*z+uz*tick);
      meta.push({axis:x?0:y?1:2,t,base:[kc[kc.length-5],kc[kc.length-1]]});
     }
    }
    for(let i=-count;i<=count;i++){
     const t=i*minor;
     for(let j=-count;j<count;j++){
      const u0=j*minor,u1=(j+1)*minor;
      push(g,gc,t,u0,0,t,u1,0);
      push(g,gc,u0,t,0,u1,t,0);
     }
    }
    axes.geometry.dispose();grid.geometry.dispose();ticks.geometry.dispose();
    ticks.geometry=new THREE.BufferGeometry()
     .setAttribute('position',new THREE.Float32BufferAttribute(k,3))
     .setAttribute('color',new THREE.Float32BufferAttribute(kc,4));
    tickMeta=meta;tickMinor=minor;tickKey='';
    axes.geometry=new THREE.BufferGeometry()
     .setAttribute('position',new THREE.Float32BufferAttribute(a,3))
     .setAttribute('color',new THREE.Float32BufferAttribute(ac,4));
    grid.geometry=new THREE.BufferGeometry()
     .setAttribute('position',new THREE.Float32BufferAttribute(g,3))
     .setAttribute('color',new THREE.Float32BufferAttribute(gc,4));
   };
   /** Let go of the ticks under P and the arrows lying along an axis with it (see `tickGaps`): the net
    * arrow, one piece's arrow, the part of it that survives with the mirror's laid on, and the chain. */
   const clearTicks=(p:FieldStageProps)=>{
    const a=p.run?.arrows,end=p.run?.chain?.at(-1)??null;
    // Laid from the start of the arrows, which is the tip of the sum while a mirror pair goes into it.
    const o=a?.from??{x:0,y:0,z:0},s=a?.partnerSurvivor??{x:0,y:0,z:0};
    const kept=a?.keep?{x:o.x+a.keep.x+s.x,y:o.y+a.keep.y+s.y,z:o.z+a.keep.z+s.z}:null;
    // Not the contribution while a mirror pair goes into the sum: the run draws that pair itself (see `wholeArrow`) and
    // the contribution is not drawn, so its ticks were let go along a line from P it never lay on.
    const arrows=[p.net,a?.pair?null:p.contribution,kept,a?.partner,end];
    const sig=(v:Vec|null|undefined)=>v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`:'-';
    const key=`${sig(p.point)}|${arrows.map(sig).join('|')}|${px.toFixed(5)}|${tickMeta.length}`;
    if(key===tickKey)return;
    tickKey=key;
    const gaps=[0,1,2].map(axis=>tickGaps(axis as 0|1|2,p.point,arrows,tickMinor*.75,8*px,24*px));
    const colour=ticks.geometry.getAttribute('color') as Attribute|undefined;
    if(!colour)return;
    tickMeta.forEach((m,i)=>{
     const hidden=gaps[m.axis].some(([lo,hi])=>m.t>=lo&&m.t<=hi);
     colour.setW(i*2,hidden?0:m.base[0]);colour.setW(i*2+1,hidden?0:m.base[1]);
    });
    colour.needsUpdate=true;
   };
   // THE SIGN, WRITTEN ON THE CHARGE. The flat figure writes + or − along its charge; in space those
   // marks are hidden (they are laid out for the flat view), the charge is one colour for both signs,
   // and the only thing left to say which sign it was were the field lines' heads -- which a potential
   // lesson, or Field Off, does not draw. A negative ring looked exactly like a positive one. So the
   // scene writes the sign itself: small glyphs facing the camera, in the charge's line colour, along a
   // wire at equal steps of charge (see `signMarks`) and in a sparse pattern over a surface. Laid again
   // when the view turns, since each faces the camera. At rest only: in the run the pieces are the
   // subject, and the marks over cut and stepped-back pieces were clutter.
   // THE FIGURE'S NAMES, where the placer has set them (see `paintedLabels`): the sign marks, the arrows and
   // the lines' heads give way to them. The arrows of the Arrows view ran through the x on the sheet, a
   // head sat on the y beside the disk, and on a phone the disk's R was printed over a plus -- the placer
   // cannot see the scene, which is drawn under the SVG, so it is the scene that moves. Read again only
   // when a name may have moved (see `nameWatch`); `namesKey` is them rounded, for the keys below.
   const labelLayer=()=>mount.parentElement?.parentElement?.querySelector('svg.cd-svg')??null;
   let names:Box[]=[],namesKey='',namesDirty=true,namesFrame=0,cube:Box|null=null;
   const readNames=()=>{
    if(!namesDirty)return;
    namesDirty=false;names=paintedLabels(labelLayer());cube=controlBox(labelLayer());
    namesKey=[...names,...cube?[cube]:[]].map(b=>`${b.x.toFixed(0)},${b.y.toFixed(0)},${b.width.toFixed(0)},${b.height.toFixed(0)}`).join(';');
   };
   // Last of all, in the overlay: they are the charge's label, and are ringed with the paper to be read over
   // whatever they lie on, the chosen piece and the field lines included. On a wire they stand beside the tube
   // (see `besideWire`), ringed with the paper as a surface's are: centred on it, a mark was wider than the tube,
   // and a minus across it read as a cut.
   //
   // NOT DEPTH-TESTED. Beside the tube a mark stands in open space, where field lines pass in front of it, and a
   // line nearer the camera cut a minus into two dashes -- the scene's own "− −". A label is read over what lies
   // in front of it as well as behind; where something must hide a mark -- P, its arrow, the gap behind P, the
   // chosen washer's slab -- the mark is let go instead (see `laySigns`).
   const signMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:false});
   const signs=new THREE.Mesh(new THREE.BufferGeometry(),signMaterial);signs.frustumCulled=false;signs.renderOrder=4;signs.name='signs';
   overlay.add(signs);
   let signKey='';
   const laySigns=(p:FieldStageProps,frameWorld:number,far:FarFade|null,yaw:number,pitch:number,wr:number,positive:boolean,paper:InstanceType<typeof THREE.Color>,dark:boolean,target:Vec)=>{
    // `at` is where the mark is drawn; `foot` the point of the charge it stands for, which on a wire is beside it.
    const centres:{at:Vec;foot:Vec;alpha:number;along?:Vec}[]=[];
    const h=4.6*px,t=1*px,ring=1.25*px;
    // The chosen ring of a disk or a sheet: no mark is written on it (see `diskSignMarks`, `sheetSigns`).
    const band=p.element&&'annulus' in p.element?p.element.annulus:null;
    const R=screenRight,U=screenUp,toScreen=(v:Vec)=>{const dx=v.x-target.x,dy=v.y-target.y,dz=v.z-target.z;return {x:360+(dx*R.x+dy*R.y+dz*R.z)*p.unit,y:215-(dx*U.x+dy*U.y+dz*U.z)*p.unit};};
    // No two marks within a mark's width and a little paper of each other ON THE SCREEN, whatever the
    // view: a wire turned end on, or one short beside a mark, stacked its marks into a blot over the
    // charge they label (see `apartOnScreen`). In viewBox units, as `h` and `ring` are in metres.
    const apart=2.6*(h+ring)*p.unit;
    const thick=Math.max(wr*1.5,wr+1.25*cssPx);
    if(p.kind==='wire'){
     const source=p.fieldSamples??p.samples;
     // Beside the tube, on the side away from the middle of a curved wire, or from P beside a straight one; far
     // enough to clear the chosen piece's thicker sleeve with a pixel and a half of paper (see `besideWire`).
     const points=source.map(s=>s.position),first=points[0],last=points[points.length-1];
     const chord=first&&last?Math.hypot(last.x-first.x,last.y-first.y,last.z-first.z):0;
     let bow=0;
     if(chord>1e-9){
      const ux=(last.x-first.x)/chord,uy=(last.y-first.y)/chord,uz=(last.z-first.z)/chord;
      for(const q of points){const dx=q.x-first.x,dy=q.y-first.y,dz=q.z-first.z,along=dx*ux+dy*uy+dz*uz;bow=Math.max(bow,Math.hypot(dx-ux*along,dy-uy*along,dz-uz*along));}
     }
     const curved=!(chord>1e-9)||bow>.02*chord;
     const middle=points.reduce((m,q)=>({x:m.x+q.x/points.length,y:m.y+q.y/points.length,z:m.z+q.z/points.length}),{x:0,y:0,z:0});
     const away=curved?middle:p.point;
     const marks=signMarks(source,poolWindow(frameWorld),34/p.unit).map(m=>{
      const o=besideWire(m,m.along,away,R,U,h+ring,t+ring,positive,thick+1.5*cssPx);
      return {at:{x:m.x+o.x,y:m.y+o.y,z:m.z+o.z},foot:{x:m.x,y:m.y,z:m.z},alpha:1,along:m.along};
     });
     // A mark every forty units of the figure, and the closed ring's every forty units round it.
     centres.push(...apartOnScreen(marks,toScreen,apart));
    }else if(p.kind==='disk'){
     // A sunflower over the face, as dense everywhere as the charge is (see `diskSignMarks`).
     centres.push(...apartOnScreen(diskSignMarks(Math.max(.01,p.radius),p.unit,band,h+ring,p.hole??0).map(at=>({at,foot:at,alpha:1})),toScreen,apart));
    }else if(far){
     // On the sheet: a sunflower laid on the plane itself, so the marks turn and tilt with it; a view
     // decides only which of them are drawn, and how strongly.
     //
     // And no closer than SHEET_SIGN_GAP on the screen. Laid evenly on the plane, they were drawn closer and
     // closer together as the view was turned down toward edge on -- fifty-one marks a median twenty-seven
     // units apart, bracketing the names on the construction lines from P -- where the opening view has
     // twenty-two, about forty-eight apart. The sunflower runs outward from O, so the marks kept are the
     // ones nearest the middle of the picture.
     const shown=sheetSigns(sheetSignRoots(poolWindow(frameWorld)),toScreen,{x:-Math.sin(yaw),y:Math.cos(yaw)},far,band,frameWorld,h+ring).filter(c=>c.alpha>.02);
     centres.push(...apartOnScreen(shown.map(c=>({...c,foot:c.at})),toScreen,SHEET_SIGN_GAP));
    }
    // AND NONE ON A NAME, ON P OR ON THE NET ARROW: a mark within its own half-size of a name's padded box,
    // of P's halo or of the arrow's shaft is let go. The marks are laid over everything else in the scene,
    // so one on the far arc of a ring seen from above was drawn on P's halo, or across the sum at P.
    readNames();
    const mark=(h+ring)*p.unit,P=toScreen(p.point),tip=p.net?toScreen({x:p.point.x+p.net.x,y:p.point.y+p.net.y,z:p.point.z+p.net.z}):P;
    const halo=Math.max(14,4.2*wr*p.unit+3);
    // NOR WHERE THE GAP BEHIND P HAS TAKEN THE CHARGE AWAY (see BEHIND_GAP). The marks are the overlay's, which
    // the gap does not reach, so a ring tipped up kept a plus standing alone in the air in the stretch cut out
    // beside P -- a sign with no charge under it, which reads as a point charge. One more than half behind P,
    // by the shader's own depth ramp, and within the gap's outer radius and its own half-size, is let go: by
    // the point of the charge it stands for, or by where it is drawn beside it.
    const startBehind=gapStart(wr),ramp=gapRamp(px),reach=BEHIND_GAP.outer*gapShrink(pitch,p.kind)+mark/2;
    const behindP=(v:Vec)=>gap.uGapLift.value*gapDepth((p.point.x-v.x)*toCamera.x+(p.point.y-v.y)*toCamera.y+(p.point.z-v.z)*toCamera.z-startBehind,ramp);
    // Lifted toward the camera, which in this orthographic view moves a mark on the screen not at all and
    // decides only what it is in front of: on a wire, clear of the chosen piece's thicker tube (half again
    // the wire's radius); on a surface, clear of the chosen ring's slab, which stands .93 of a radius off the
    // plane and is met along the line of sight that much further up the slope.
    const wire=p.kind==='wire',lift=wire?wr*2.1:Math.max(wr*1.3,wr*1.2/Math.max(.15,Math.abs(toCamera.z)));
    // NOR WHERE THE CHOSEN RING'S SLAB STANDS IN FRONT OF IT. Seen low, a mark just beyond the band's far edge is
    // drawn over the raised washer, which is nearer the camera, and the depth test cut its lower half away: it
    // stood on the washer's top edge as an upturned T. Nine points over the mark are each followed toward the
    // camera through the slab's thickness; a mark any of them meets the slab from is let go -- half a mark is
    // worse than none. A mark in the washer's hole, with the slab behind it, is kept.
    const slab=band&&!wire?washerHalf(thick,band.inner,band.outer,px):0;
    const behindSlab=(o:Vec)=>!!band&&!wire&&slabCovers(o,band,slab,toCamera,R,U,mark/2/p.unit);
    // NOR, ON A SURFACE, ON O OR ON THE LINE FROM O UP TO P: the first of the sheet's sunflower sat at O, under P,
    // with the axis through its upright where P's construction lines meet the plane -- an origin crosshair, not
    // one of the charge's signs.
    const O=toScreen({x:0,y:0,z:0});
    // AND A MINUS NEVER STANDS LEVEL WITH A NAME, close by. Beside a letter on its own line a minus is read as part of
    // what is written: the bisector's mark beside O, with a negative charge, read "O −" -- a margin that parts a plus
    // from a letter does not part a dash. Level with a name, it keeps a letter's width more clear of it -- moved a third
    // of a step or so along its wire where that clears it, rather than leaving a gap in the wire's row of signs.
    // Level: across the middle of the name's line, where a dash beside a letter reads as one more character.
    const level=(c:{x:number;y:number})=>!positive&&names.some(b=>c.y>b.y+.2*b.height&&c.y<b.y+.8*b.height&&Math.max(b.x-c.x,c.x-(b.x+b.width))<mark+NAME_MARGIN+LEVEL_MARGIN);
    const blocked=(at:Vec,footAt:Vec,levelToo:boolean)=>{
     const c=toScreen(at),foot=toScreen(footAt),fromP=Math.min(Math.hypot(c.x-P.x,c.y-P.y),Math.hypot(foot.x-P.x,foot.y-P.y));
     const o={x:at.x+toCamera.x*lift,y:at.y+toCamera.y*lift,z:at.z+toCamera.z*lift};
     // And a clear margin round every name, not only the name's own box: at R = 4 the disk's marks sat flush
     // against P, z, s and R, and the figure read "+P", "z +", "+ s".
     // Nor under the view cube or its buttons, nor against them (see `controlBox`).
     return boxGap(c,names)<mark+NAME_MARGIN||(!!cube&&boxGap(c,[cube])<mark/2)||(levelToo&&level(c))||Math.hypot(c.x-P.x,c.y-P.y)<mark+halo||segmentGap(c,c,P,tip)<mark+3||(fromP<reach&&behindP(footAt)>.5)
      ||(!wire&&segmentGap(c,c,O,P)<mark+7)||behindSlab(o);
    };
    const slide=(v:Vec,u:Vec,d:number):Vec=>({x:v.x+u.x*d,y:v.y+u.y*d,z:v.z+u.z*d}),step=34/p.unit;
    for(let i=centres.length-1;i>=0;i--){
     const m=centres[i];
     if(!blocked(m.at,m.foot,true))continue;
     const u=m.along,moved=u&&!blocked(m.at,m.foot,false)?[.3,-.3,.45,-.45].map(d=>({at:slide(m.at,u,d*step),foot:slide(m.foot,u,d*step)})).find(q=>!blocked(q.at,q.foot,true)):undefined;
     if(moved)centres[i]={...m,...moved};else centres.splice(i,1);
    }
    // How many marks are written, and where on the screen, for the tests; and the points of the charge they stand
    // for, which on a wire are beside them.
    const shown=centres.filter(c=>c.alpha>.02);
    mount.parentElement?.setAttribute('data-sign-marks',String(shown.length));
    mount.parentElement?.setAttribute('data-sign-screen',shown.map(c=>{const q=toScreen(c.at);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;}).join(' '));
    mount.parentElement?.setAttribute('data-sign-feet',shown.map(c=>{const q=toScreen(c.foot);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;}).join(' '));
    // The flat figure's marks: the charge's deep orange, ringed with the paper so they read over whatever they
    // lie on -- the size of the flat figure's thirteen-pixel plus.
    const positions:number[]=[],colours:number[]=[];
    const ink=new THREE.Color(dark?0xf0a070:0xb8460f);
    const quad=(o:Vec,a:number,b:number,c:InstanceType<typeof THREE.Color>,alpha:number)=>{
     const ux=screenRight,uy=screenUp,corner=(sx:number,sy:number)=>[o.x+ux.x*a*sx+uy.x*b*sy,o.y+ux.y*a*sx+uy.y*b*sy,o.z+ux.z*a*sx+uy.z*b*sy];
     const [p0,p1,p2,p3]=[corner(-1,-1),corner(1,-1),corner(1,1),corner(-1,1)];
     positions.push(...p0,...p1,...p2,...p0,...p2,...p3);
     for(let n=0;n<6;n++)colours.push(c.r,c.g,c.b,alpha);
    };
    for(const {at,alpha} of shown){
     const o={x:at.x+toCamera.x*lift,y:at.y+toCamera.y*lift,z:at.z+toCamera.z*lift};
     // The ring first, then the mark over it: drawn in order, at one depth.
     quad(o,h+ring,t+ring,paper,alpha);
     if(positive)quad(o,t+ring,h+ring,paper,alpha);
     quad(o,h,t,ink,alpha);
     if(positive)quad(o,t,h,ink,alpha);
    }
    signs.geometry.dispose();
    signs.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setAttribute('color',new THREE.Float32BufferAttribute(colours,4));
    // What the marks are ringed with, for the tests: the paper, on a wire as on a surface.
    mount.parentElement?.setAttribute('data-sign-ring','paper');
   };
   let themeKey='\u0000',themeTint=new THREE.Color(),themePaper=new THREE.Color(),themePart=new THREE.Color();
   let bodyKey='',fieldKey='',sliceKey='',tracedFrom='',sheetFarKey='',disposed=false,farFrom='',chargeFar=0;
   // How far a point is from the charge the field is drawn from, kept with `chargeFar` until the charge changes.
   let chargeAway:(x:number,y:number,z:number)=>number=()=>Infinity;
   /** Where the arrows stand: about the charge and P together, not about O (see `latticeFrame`); an endless
    * charge round O, P and as much of itself as P's distance calls for (see `endlessBody`). */
   const latticeFor=(p:FieldStageProps)=>{
    const source=p.fieldSamples??p.samples,endless=p.kind==='sheet'||chargeFar>p.reach*3;
    return latticeFrame(endless?endlessBody(p.kind,source,p.point,p.reach):[...latticeBody(p.kind,p.radius,p.bodyPath,source),p.point],p.reach);
   };
   const cssColor=(name:string,fallback:number)=>{
    try{const v=getComputedStyle(mount).getPropertyValue(name).trim();if(/^#|^rgb|^hsl/.test(v))return new THREE.Color(v);}catch{/* unreadable: fall through to the fallback */}
    return new THREE.Color(fallback);
   };
   /** The flat figure's line colour, which is a mix (the field colour at under half strength) that
    * three cannot parse. A one-pixel canvas can: it is the same parser the flat lines are drawn
    * with, so the two layers are the same ink by construction. Kept until the token changes. */
   let inkSource='',inkColour=new THREE.Color(),inkAlpha=.42;
   const lineInk=(tint:InstanceType<typeof THREE.Color>)=>{
    let raw='';
    try{raw=getComputedStyle(mount).getPropertyValue('--field-line').trim();}catch{/* unreadable: the fallback below */}
    const source=`${raw}|${tint.getHexString()}`;
    if(source===inkSource)return;
    inkSource=source;inkColour=tint.clone();inkAlpha=.42;
    try{
     const pixel=document.createElement('canvas');pixel.width=pixel.height=1;
     const ctx=pixel.getContext('2d',{willReadFrequently:true});
     if(!ctx||!raw)return;
     ctx.fillStyle='rgba(1, 2, 3, 0.5)';ctx.fillStyle=raw;
     if(ctx.fillStyle==='rgba(1, 2, 3, 0.5)')return;
     ctx.fillRect(0,0,1,1);
     const [r,g,b,a]=ctx.getImageData(0,0,1,1).data;
     if(a>0){inkColour=new THREE.Color().setRGB(r/255,g/255,b/255,THREE.SRGBColorSpace);inkAlpha=a/255;}
    }catch{/* no 2D canvas: the field colour at the flat figure's strength */}
   };
   const buildBody=(p:FieldStageProps)=>{
    clearGroup(body);
    if(p.kind==='wire'){
     const source=p.bodyPath?.length?p.bodyPath:wirePath(p.samples);
     const points=source.map(v=>new THREE.Vector3(v.x,v.y,v.z));
     if(points.length<2)return;
     const curve=new THREE.CatmullRomCurve3(points,p.closed,'centripetal');
     body.add(new THREE.Mesh(taperTube(new THREE.TubeGeometry(curve,Math.min(320,Math.max(64,points.length*2)),wireRadius(p.reach),14,p.closed)),bodyMaterial));
     return;
    }
    // A disk and a sheet are both flat surfaces; only how they end differs. A disk stops at
    // its rim, and is given one. A sheet has no edge to draw, so it is drawn out past the
    // frame with its alpha ramping to nothing: forty rings of vertices, because the ramp is
    // carried by the mesh and a fan of one ring would interpolate it in straight lines.
    // The spherical shell: a see-through skin of unit radius, scaled to the shell's, with its equator drawn round it.
    if(p.kind==='shell'){
     body.add(new THREE.Mesh(new THREE.SphereGeometry(1,72,48),bodyMaterial));
     return;
    }
    if(p.kind==='sheet'){
     body.add(new THREE.Mesh(fadeGeometry(new THREE.RingGeometry(0,1,128,40),SHEET_FADE.inner,SHEET_FADE.outer),sheetMaterial));
     sheetFarKey='';
     return;
    }
    // An annulus is the disk's face with its middle cut out, and an edge round the hole as well as the rim.
    const hole=p.kind==='disk'&&p.hole&&p.radius>0?Math.min(.999,p.hole/p.radius):0;
    body.add(new THREE.Mesh(hole>0?new THREE.RingGeometry(hole,1,128,1):new THREE.CircleGeometry(1,128),bodyMaterial));
    body.add(new THREE.Line(unitCircle(),pickedMaterial));
    if(hole>0){const edge=new THREE.Line(unitCircle(),pickedMaterial);edge.scale.setScalar(hole);body.add(edge);}
   };
   let builds=0,laid=0;
   // What the field was last built as, kept so that its colour, its arrowheads and the arrows hidden
   // round P can follow the paper, the quiet run and the camera without tracing anything again.
   // `strength` is per point of each traced line; the strokes are the lines cut into the part behind a
   // surface, drawn opaque, and the part in front of it, drawn as translucent ink (see `splitAtPlane`).
   type Strokes={positions:number[];strength:number[];mesh:InstanceType<typeof LineSegments2>|null};
   let traced:Vec[][]=[],strength:number[][]=[],back:Strokes={positions:[],strength:[],mesh:null},front:Strokes={positions:[],strength:[],mesh:null};
   let frontInk:InstanceType<typeof THREE.InstancedInterleavedBuffer>|null=null;
   let lattice:{at:Vec;dir:Vec;weight:number}[]=[],latticeMesh:InstanceType<typeof THREE.InstancedMesh>|null=null,latticeHeads:InstanceType<typeof THREE.InstancedMesh>|null=null,latticeSpacing=1;
   const lineHeadMesh=new THREE.Mesh(new THREE.BufferGeometry(),lineHeadMaterial),frontHeadMesh=new THREE.Mesh(new THREE.BufferGeometry(),frontHeadMaterial);
   // The heads in front of a surface, and every wire's, are ink laid in the overlay, before the strokes.
   lineHeadMesh.frustumCulled=false;lineHeadMesh.renderOrder=1;frontHeadMesh.frustumCulled=false;frontHeadMesh.renderOrder=1;frontHeadMesh.name='front-heads';
   scene.add(lineHeadMesh);overlay.add(frontHeadMesh);
   let paintKey='',headsKey='',latticeKey='',sheetKey='';
   /** Ink laid on paper at strength `a`, mixed as the flat canvas mixes a translucent stroke -- in
    * sRGB -- so the scene's opaque lines are the flat figure's colour, not a darker linear blend. */
   const inkRGB={r:0,g:0,b:0},paperRGB={r:0,g:0,b:0};
   const mixInk=(out:InstanceType<typeof THREE.Color>,paper:InstanceType<typeof THREE.Color>,ink:InstanceType<typeof THREE.Color>,a:number)=>{
    paper.getRGB(paperRGB,THREE.SRGBColorSpace);ink.getRGB(inkRGB,THREE.SRGBColorSpace);
    return out.setRGB(paperRGB.r+(inkRGB.r-paperRGB.r)*a,paperRGB.g+(inkRGB.g-paperRGB.g)*a,paperRGB.b+(inkRGB.b-paperRGB.b)*a,THREE.SRGBColorSpace);
   };
   /** The window an endless line's lines are seeded across, rounded up to a power of 1.25 so a small
    * zoom does not trace the field again; see `seedPool`. */
   const poolWindow=(frameWorld:number)=>1.25**Math.ceil(Math.log(Math.max(1e-3,frameWorld*.6))/Math.log(1.25)-1e-9);
   const dropStrokes=()=>{
    for(const k of [back,front])if(k.mesh){field.remove(k.mesh);overlay.remove(k.mesh);k.mesh.geometry.dispose();}
    back={positions:[],strength:[],mesh:null};front={positions:[],strength:[],mesh:null};frontInk=null;
   };
   /** Cut the traced lines into their two kinds of stroke and build a mesh for each: see `strokeSide`.
    * Only a surface has a part behind it; every line round a wire is ink. */
   const layStrokes=(kind:BodyKind)=>{
    dropStrokes();
    traced.forEach((line,l)=>{
     const k=strength[l];
     for(let i=0;i+1<line.length;i++){
      const at=(v:Vec)=>v===line[i]?k[i]:v===line[i+1]?k[i+1]:(k[i]+k[i+1])/2;
      const parts=strokeSide(kind,line[i],line[i+1]);
      for(const {a,b,behind} of parts){
       const into=behind?back:front;
       into.positions.push(a.x,a.y,a.z,b.x,b.y,b.z);into.strength.push(at(a),at(b));
      }
     }
    });
    if(back.positions.length){
     back.mesh=new LineSegments2(new LineSegmentsGeometry().setPositions(back.positions),lineMaterial);
     // Every segment is an instance of one quad, which three cannot bound from the quad alone.
     back.mesh.frustumCulled=false;field.add(back.mesh);
    }
    if(front.positions.length){
     const g=new LineSegmentsGeometry().setPositions(front.positions);
     frontInk=new THREE.InstancedInterleavedBuffer(new Float32Array(front.positions.length/3),2,1);
     g.setAttribute('instanceInkStart',new THREE.InterleavedBufferAttribute(frontInk,1,0));
     g.setAttribute('instanceInkEnd',new THREE.InterleavedBufferAttribute(frontInk,1,1));
     front.mesh=new LineSegments2(g,frontLineMaterial);
     front.mesh.frustumCulled=false;front.mesh.renderOrder=2;front.mesh.name='front-strokes';overlay.add(front.mesh);
    }
    laid++;paintKey='';headsKey='';
    reportOrder();
   };
   /** The order the scene is really drawn in, where the tests can read it: see `drawOrder`. */
   const reportOrder=()=>{
    const order=drawOrder(scene as unknown as Parameters<typeof drawOrder>[0]);
    mount.parentElement?.setAttribute('data-scene-order',[...order].map(([name,[g,r]])=>`${name}:${g}.${r}`).join(' '));
   };
   /** The sheet's lines, laid by the screen (see `sheetColumns`): again whenever the view turns or the
    * picture moves, which costs a few dozen straight segments and no tracing. The halves under the plane
    * are drawn at under half strength, so each line is seen to leave the sheet at its root rather than
    * run through it as one stroke with a head pointing each way and nothing between them. */
   const laySheet=(p:FieldStageProps,frameWorld:number,yaw:number,pitch:number,far:FarFade)=>{
    const lift=Math.max(.05,Math.sin(pitch))*p.unit;
    const near=Math.max(-frameWorld,(p.origin.y-(PLOT.y+PLOT.height))/lift*.82),deepest=Math.max(near*.15,far.inner*.85);
    const roots=sheetColumns(yaw,p.unit,PLOT.x-p.origin.x,PLOT.x+PLOT.width-p.origin.x,near,deepest);
    traced=sheetLines(roots,frameWorld*3,p.charge>=0?1:-1);
    // By the half, not the point: each half is one straight segment, and a strength given per point
    // would be blended along it from the root, three pictures long, and never seen to change.
    strength=traced.map(line=>{const under=line.some(v=>v.z<-1e-9);return line.map(()=>under?SHEET_UNDER:1);});
    layStrokes('sheet');
   };
   const buildField=(p:FieldStageProps,wr:number,frameWorld:number,drawn:number,lit:{centre:Vec;spacing:number}|null)=>{
    clearGroup(field);dropStrokes();latticeMesh=null;latticeHeads=null;traced=[];strength=[];lattice=[];paintKey='';headsKey='';latticeKey='';sheetKey='';
    // Counted where the tests can read it: a retrace is the costly thing, and how often one happens
    // does not depend on how fast the machine is.
    builds++;mount.parentElement?.setAttribute('data-field-builds',String(builds));
    const source=p.fieldSamples??p.samples;
    // How finely the charge the field is traced from is cut, for the tests: see ChargeDiagram.
    mount.parentElement?.setAttribute('data-field-samples',String(source.length));
    if(p.fieldView==='off'||!source.length)return;
    const layout:Layout=p.kind==='wire'?'wire':p.kind==='shell'?'shell':'surface';
    // A surface's annuli are each summed as a whole ring, about four point charges' arithmetic
    // apiece, so fewer of them.
    // No halving for surfaces any more. Each annulus used to be spread into sixteen point charges
    // before it could be summed, so a surface cost sixteen times a wire per element and its budget
    // was cut in half to pay for it. An annulus is one ring evaluation now, through elliptic
    // integrals, and the halving was left behind: it was holding the SHEET's spatial field at 72
    // elements against the flat view's 192. Measured on the sheet: 1.15% off the converged field
    // and leaning 0.49 degrees from the vertical it is supposed to be, against 0.26% and 0.09
    // degrees at the full budget -- for three milliseconds more on a trace that is rebuilt only
    // when the charge changes, never on a camera frame.
    const few=coarsen(source,p.detail??48);
    // The semi-infinite line's field is its closed form, not the partition's: see `rayField`.
    const window=poolWindow(frameWorld),ray=p.kind==='wire'&&!p.closed?endlessRay(source,window):null;
    if(p.fieldView==='lines'){
     // Both limits come from the PICTURE, not from how far the charge happens to extend.
     //
     // A line was allowed to run to 3.2 reaches while the frame shows about one, so most of
     // every line was drawn outside the view and what crossed the frame was its middle -- long
     // sweeps entering one edge and leaving another, with no visible root on the charge. Ending
     // them where the drawing has faded them (see `traceTo`) keeps the part that is about this
     // charge. Seeds stay inside the picture for the separate reason that the sheet's charge is
     // mostly in huge outer rings.
     // The step is the smaller of the picture and the charge, as the flat view already did. A
     // step set by the picture alone is far too coarse for a small charge inside a big frame:
     // on the disk it was 0.24 m for a radius of 2, twice the distance a line is launched from
     // the face, so the first chord of every line was taken before the line had cleared it.
     //
     // The sheet is not traced at all: see `sheetLines`, and `laySheet` for where its lines stand.
     if(p.kind==='sheet')return;
     const span=Math.max(...few.map(c=>Math.hypot(c.position.x,c.position.y,c.position.z)),.5);
     // An endless line starts lines all along the part of it the picture shows, not only within the
     // field's reach of O: see `seedPool`. The semi-infinite line's lines all came from beside O.
     const pool=seedPool(few,16,p.reach*.95,window);
     // Drawn out past P, however small the charge (see `lineReach`): traced that far, and faded by it.
     const away=bodyDistance(few,layout);
     // The infinite line's field is drawn from Gauss, not traced: see `radialLines`. The semi-infinite
     // line's is traced through its closed form (see `rayLines`), at a step fine beside P's height. Every
     // other wire, the ring too, turns its seeds by the golden angle from one station to the next (see
     // `spaceLines`).
     const axis=p.kind==='wire'&&!p.closed?endlessAxis(few,window):null;
     // The ray's step: a twenty-fifth of the picture or of the charge, as for any wire, but never more
     // than a sixth of P's height, where the field turns round the line's end.
     const height=away(p.point.x,p.point.y,p.point.z),fine=Math.max(.03,.15*height);
     // The spherical shell's are drawn, not traced: straight out of the skin, none inside (see `shellLines`).
     const sphere=p.kind==='shell'?shellOf(source):null;
     traced=sphere?shellLines(sphere.R,Math.max(26,pool.count),drawn*1.4,sphere.q>=0?1:-1)
      :axis?radialLines(axis,pool.count,wr,drawn*1.4,p.charge>=0?1:-1)
      :ray?rayLines(ray,pool.count,window,Math.max(wr*2.5,Math.min(p.reach*.95*.06,.5*height)),wr,
       traceTo(few,layout,drawn,Math.min(span,fine/.04),{crowd:p.reach*.95*.012}))
      :spaceLines(few,layout,pool.count,traceTo(few,layout,drawn,span,{seedLimit:p.reach*.95,seedPool:pool.pool,root:{inset:p.kind==='wire'?wr:0},twist:p.kind==='wire',
       // A wire's lines are traced on in on the charge itself before they are curved into the tube.
       ...(p.kind==='wire'?{finish:{samples:source}}:{})}));
     mount.parentElement?.setAttribute('data-field-drawn',drawn.toFixed(3));
     // Fade with distance FROM THE CHARGE: strong near it, gone by the edge of the reach. Measured
     // from O it said an infinite line's field weakens along the line, which its symmetry forbids,
     // and drew the axial rod's field faded round P and full at the rod's far end.
     //
     // Fading with distance says the field is weakening, which is true of every charge here except
     // the one whose entire lesson is that it does not: an infinite sheet's field is the same however
     // far away you stand. So the sheet's lines keep their colour, and what they do dim with is the
     // plane's own depth cue (see `sheetFarFade`), repainted as the camera turns.
     strength=traced.map(line=>line.map(v=>lineStrength(away(v.x,v.y,v.z),drawn)));
     layStrokes(p.kind);
     return;
    }
    // The arrows are a readable subset of the lattice (see `latticeCore`), and the ones round P are
    // hidden as P moves (see `paintLattice`).
    // Centred on the charge and P together, not on O: see `latticeFor`.
    if(!lit)return;
    lattice=latticeCore(few,p.reach,layout,lit.centre,lit.spacing,ray?rayField(ray):undefined);latticeSpacing=lit.spacing;
    if(!lattice.length)return;
    latticeMesh=new THREE.InstancedMesh(arrowGeometry,arrowMaterial,lattice.length);
    latticeHeads=new THREE.InstancedMesh(flatHead,latticeHeadMaterial,lattice.length);
    // They move with the camera; a bounding sphere cached from the first frame would cull them.
    latticeMesh.frustumCulled=false;latticeHeads.frustumCulled=false;
    field.add(latticeMesh,latticeHeads);
   };
   /** How strongly a point of the field is drawn once the sheet's far side has dimmed it (see
    * `sheetFarFade`); `far` is only ever given on the sheet. */
   const farShade=(k:number,x:number,y:number,far:FarFade|null,sy:number,cy:number)=>far?k*farAlpha(-x*sy+y*cy,far):k;
   /** The field's colour: behind a surface every vertex mixed with the paper, in front of one the ink
    * itself at the vertex's strength; and every arrow, mixed with the paper. */
   const paintField=(quiet:boolean,ink:InstanceType<typeof THREE.Color>,paper:InstanceType<typeof THREE.Color>,far:FarFade|null,yaw:number)=>{
    // During the build the field is background to the one piece being explained, and at full
    // strength its lines drown the thin construction drawn over them.
    const q=quiet?.35:1,c=new THREE.Color(),sy=Math.sin(yaw),cy=Math.cos(yaw);
    if(back.mesh){
     const colours=new Float32Array(back.strength.length*3),P=back.positions;
     back.strength.forEach((k,i)=>{mixInk(c,paper,ink,inkAlpha*q*farShade(k,P[i*3],P[i*3+1],far,sy,cy));colours[i*3]=c.r;colours[i*3+1]=c.g;colours[i*3+2]=c.b;});
     (back.mesh.geometry as InstanceType<typeof LineSegmentsGeometry>).setColors(colours);
    }
    if(front.mesh&&frontInk){
     const colours=new Float32Array(front.strength.length*3),alphas=frontInk.array as Float32Array,P=front.positions;
     front.strength.forEach((k,i)=>{colours[i*3]=ink.r;colours[i*3+1]=ink.g;colours[i*3+2]=ink.b;alphas[i]=inkAlpha*q*farShade(k,P[i*3],P[i*3+1],far,sy,cy);});
     (front.mesh.geometry as InstanceType<typeof LineSegmentsGeometry>).setColors(colours);
     frontInk.needsUpdate=true;
    }
    if(latticeMesh){
     // The flat arrows' ink and weighting -- strength reads twice, as length and as colour -- at about
     // twice the flat arrows' strength, since a shaft a pixel wide carries half the ink of their stroke.
     lattice.forEach((a,i)=>{mixInk(c,paper,ink,Math.min(1,2*inkAlpha*(.28+.62*a.weight))*(quiet?.45:1));latticeMesh!.setColorAt(i,c);latticeHeads?.setColorAt(i,c);});
     if(latticeMesh.instanceColor)latticeMesh.instanceColor.needsUpdate=true;
     if(latticeHeads?.instanceColor)latticeHeads.instanceColor.needsUpdate=true;
    }
   };
   /** Lay the arrows, leaving out the ones that would sit on P, its name or the net arrow: on the screen
    * (see `latticeClear`), and, in space, within a little under half a step of P or a quarter of a step of
    * the net arrow's shaft. That used to be 1.2 steps and .6 of one -- a ball two and a half to three
    * metres across, which took out the region each lesson is about: no arrow inside the arc round P, none
    * in the gap between the axial rod's end and P, none inside a low ring -- while the flat arrows fill
    * all three. Each head is turned to face the camera, so this runs again when the view turns. */
   const paintLattice=(point:Vec,net:Vec|null,unit:number,target:Vec)=>{
    if(!latticeMesh||!latticeHeads)return;
    const m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),pos=new THREE.Vector3(),dir=new THREE.Vector3(),scl=new THREE.Vector3();
    const n=net??{x:0,y:0,z:0},nn=n.x*n.x+n.y*n.y+n.z*n.z;
    const offNet=(v:Vec)=>{
     const t=nn>0?Math.max(0,Math.min(1,((v.x-point.x)*n.x+(v.y-point.y)*n.y+(v.z-point.z)*n.z)/nn)):0;
     return Math.hypot(v.x-point.x-n.x*t,v.y-point.y-n.y*t,v.z-point.z-n.z*t);
    };
    const thick=latticeSpacing*.006,near=Math.max(latticeSpacing*.45,30*px),aside=Math.max(latticeSpacing*.25,10*px),shown:string[]=[],screens:string[]=[];
    const screen={right:screenRight,up:screenUp,unit};
    const R=screenRight,U=screenUp,toScreen=(v:Vec)=>{const dx=v.x-target.x,dy=v.y-target.y,dz=v.z-target.z;return {x:360+(dx*R.x+dy*R.y+dz*R.z)*unit,y:215-(dx*U.x+dy*U.y+dz*U.z)*unit};};
    lattice.forEach((a,i)=>{
     const length=arrowLength(a.weight,latticeSpacing)*.6;
     const tail={x:a.at.x-a.dir.x*length/2,y:a.at.y-a.dir.y*length/2,z:a.at.z-a.dir.z*length/2},tip={x:a.at.x+a.dir.x*length/2,y:a.at.y+a.dir.y*length/2,z:a.at.z+a.dir.z*length/2};
     // Nor through a name (see `names`).
     const clear=Math.hypot(a.at.x-point.x,a.at.y-point.y,a.at.z-point.z)>=near&&offNet(a.at)>=aside&&latticeClear(tail,tip,point,net,screen)&&!meetsBoxes(toScreen(tail),toScreen(tip),names,1);
     if(clear){
      shown.push(`${a.at.x.toFixed(2)},${a.at.y.toFixed(2)},${a.at.z.toFixed(2)}`);
      const s0=toScreen(tail),s1=toScreen(tip);screens.push(`${s0.x.toFixed(1)},${s0.y.toFixed(1)},${s1.x.toFixed(1)},${s1.y.toFixed(1)}`);
     }
     // As long as the flat arrows' barbs, never more than two fifths of the arrow, and half again as
     // long as it is wide.
     const headLength=Math.min(length*.4,7*px),half=headLength/3,shaftLength=Math.max(1e-4,length-headLength);
     dir.set(a.dir.x,a.dir.y,a.dir.z);
     const from=tail;
     pos.set(from.x+a.dir.x*shaftLength/2,from.y+a.dir.y*shaftLength/2,from.z+a.dir.z*shaftLength/2);
     q.setFromUnitVectors(up,dir);scl.set(clear?thick:0,clear?shaftLength:0,clear?thick:0);
     m.compose(pos,q,scl);latticeMesh!.setMatrixAt(i,m);
     // The head, as `faceHead` stands one, into an instance.
     hz.copy(toCamera).addScaledVector(dir,-toCamera.dot(dir));
     if(hz.lengthSq()<1e-8)hz.copy(screenUp).addScaledVector(dir,-screenUp.dot(dir));
     hz.normalize();hx.crossVectors(dir,hz);hm.makeBasis(hx,dir,hz);q.setFromRotationMatrix(hm);
     const c=shaftLength+headLength/2;
     pos.set(from.x+a.dir.x*c,from.y+a.dir.y*c,from.z+a.dir.z*c);scl.set(clear?half*2:0,clear?headLength:0,1);
     m.compose(pos,q,scl);latticeHeads!.setMatrixAt(i,m);
    });
    latticeMesh.instanceMatrix.needsUpdate=true;latticeHeads.instanceMatrix.needsUpdate=true;
    // Where the arrows that are drawn stand, for the tests.
    mount.parentElement?.setAttribute('data-lattice-shown',shown.join(' '));
    // And where they are drawn on the screen, tail to tip, in the figure's units.
    mount.parentElement?.setAttribute('data-lattice-screen',screens.join(' '));
   };
   /** Each field line's arrowheads, placed on the part of it the reader can see (see `lineHeads`) and
    * turned to face the camera, in the line's own colour there -- premixed behind a surface, the ink
    * itself in front of one, as the strokes are. Rebuilt when the view moves: a few dozen triangles,
    * against a trace that is never repeated for a camera frame. */
   const layLineHeads=(quiet:boolean,ink:InstanceType<typeof THREE.Color>,paper:InstanceType<typeof THREE.Color>,target:Vec,unit:number,far:FarFade|null,yaw:number,kind:BodyKind)=>{
    const positions:number[]=[],colours:number[]=[],frontPositions:number[]=[],frontColours:number[]=[],c=new THREE.Color(),side=new THREE.Vector3(),u=new THREE.Vector3(),drawnHeads:string[]=[];
    const R=screenRight,U=screenUp,len=LINE_HEAD.length/unit,half=LINE_HEAD.half/unit,sy=Math.sin(yaw),cy=Math.cos(yaw);
    const toScreen=(v:Vec)=>{const dx=v.x-target.x,dy=v.y-target.y,dz=v.z-target.z;return {x:360+(dx*R.x+dy*R.y+dz*R.z)*unit,y:215-(dx*U.x+dy*U.y+dz*U.z)*unit};};
    // AND NOT ON A HEAD ALREADY LAID. Two lines in space can run together on the screen, one in front of the
    // other, and each was given its own head where they merged: a quarter of the 3D states drew a stacked ">>"
    // or a doubled stroke. Each head placed is booked as a box half again its length across, and the next
    // line's heads slide along their own line clear of it, or are let go, as they do round a name.
    const placed:Box[]=[],room=HEAD_ROOM*LINE_HEAD.length;
    traced.forEach((line,l)=>{
     for(const h of lineHeads(line.map(toScreen),PLOT,180,28,6,placed.length?[...names,...placed]:names)){
      placed.push({x:h.x-room/2,y:h.y-room/2,width:room,height:room});
      drawnHeads.push(`${h.x.toFixed(1)},${h.y.toFixed(1)},${h.dx.toFixed(3)},${h.dy.toFixed(3)}`);
      const a=line[h.segment],b=line[h.segment+1];
      u.set(b.x-a.x,b.y-a.y,b.z-a.z).normalize();
      side.crossVectors(u,toCamera);
      if(side.lengthSq()<1e-10)continue;
      side.normalize().multiplyScalar(half);
      const at={x:a.x+(b.x-a.x)*h.t,y:a.y+(b.y-a.y)*h.t,z:a.z+(b.z-a.z)*h.t};
      const tip=[at.x+u.x*len/2,at.y+u.y*len/2,at.z+u.z*len/2],tail=[at.x-u.x*len/2,at.y-u.y*len/2,at.z-u.z*len/2];
      const k=inkAlpha*(quiet?.35:1)*farShade(strength[l]?.[h.segment]??1,at.x,at.y,far,sy,cy),inFront=kind==='wire'||at.z>=0;
      (inFront?frontPositions:positions).push(tip[0],tip[1],tip[2],tail[0]+side.x,tail[1]+side.y,tail[2]+side.z,tail[0]-side.x,tail[1]-side.y,tail[2]-side.z);
      if(inFront)for(let n=0;n<3;n++)frontColours.push(ink.r,ink.g,ink.b,k);
      else{mixInk(c,paper,ink,k);for(let n=0;n<3;n++)colours.push(c.r,c.g,c.b);}
     }
    });
    // Where the heads stand on the screen and which way they point, in the figure's units: for the tests.
    mount.parentElement?.setAttribute('data-line-heads',drawnHeads.join(' '));
    lineHeadMesh.geometry.dispose();frontHeadMesh.geometry.dispose();
    lineHeadMesh.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
    frontHeadMesh.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(frontPositions,3)).setAttribute('color',new THREE.Float32BufferAttribute(frontColours,4));
   };
   // When the first stage began, so its cuts can be made one after another rather than all at once.
   // Restarted whenever the run comes back to that stage, as the flat figure's animation is.
   let cutStart=-Infinity,runStage='',piecesKey='',partnerKey='',cutsKey='',fillKey='';
   const reducedMotion=()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
   /** How far the cut a fraction `t` along the charge has opened, 0 to 1. On the run's clock, Reduced Motion's
    * beats step through the cuts, as the flat figure's do. Off it, Reduced Motion makes every cut at once. */
   const cutShown=(t:number,now:number)=>{
    if(runStage!=='pieces')return 1;
    const k=Math.max(0,Math.min(1,(cutLocal(now)-(t*CUT.spread+CUT.delay))/CUT.each));
    return 1-(1-k)**3;
   };
   /** Seconds into Cut it up: on the run's clock where there is one, or else since the stage was first drawn. */
   const cutLocal=(now:number)=>{const c=latest.current.cutClock;return c?c.get()-c.start:(now-cutStart)/1000;};
   // The wall clock's cuts carry a loop of their own; the run's clock wakes the scene itself (see `tick`).
   const cutting=()=>runStage==='pieces'&&!latest.current.cutClock&&performance.now()-cutStart<CUT_MS;
   let ticked=-1;
   const quantise=(v:number,steps=40)=>Math.round(v*steps)/steps;
   const toneColour=(tone:string)=>new THREE.Color(tone==='added'?CHARGE.added:CHARGE.body);
   const applyRun=(p:FieldStageProps,wr:number,positive:boolean,dark:boolean,spread:number,thick:number,far:FarFade|null,yaw:number,frameWorld:number)=>{
    const run=p.run??null,now=performance.now();
    const stage=run?.stage??'';
    if(stage!==runStage){if(stage==='pieces')cutStart=reducedMotion()?-Infinity:now;runStage=stage;}
    const wire=!!run&&run.kind==='wire',n=run?.pieces.length??0;
    // The width of a cut: a few wire radii, so a gap is unmistakably a gap at the default size and
    // still a gap on a rod cut thirty ways.
    //
    // Snapped to a forty-eighth of that. In the limit the gaps close continuously while the pieces
    // double and their mid-cuts grow, and every change of width is a rebuild of up to a hundred and
    // sixty pieces; snapped, the closing is still smooth to the eye and costs a few dozen rebuilds.
    const full=wr*3.2,step=full/48,snap=(v:number)=>Math.round(v/step)*step;
    const gapWidth=full*(run?.open??0),midWidth=snap(full*(run?.open??0)*(run?.split??0));
    const gap=(t:number)=>snap(gapWidth*cutShown(t,now));
    const ends=(i:number)=>({
     head:run!.closed||i>0?gap(i/n):0,
     // The ring's last cut is its first: the cut at a full turn is the cut at zero.
     tail:run!.closed||i<n-1?gap(run!.closed&&i===n-1?0:(i+1)/n):0,
    });
    const pieceOf=(i:number)=>{const piece=run!.pieces[i];return piece&&'path' in piece?piece.path:null;};
    // The mid-cut is the one the next doubling makes, so it is held to what each half may give up then.
    const cutOf=(i:number,path:readonly Vec[])=>{const e=ends(i);return cutPiece(path,e.head,e.tail,midWidth,cutShare(n),cutShare(2*n)/2);};
    const opened=wire&&run!.open>.004;
    // A cut wire is drawn as its pieces, not as one body with marks on it.
    body.visible=!opened;
    const signature=(v:Vec|undefined)=>v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`:'-';
    const partsKey=run?.parts.map((q,i)=>q?`${i}${q.map(s=>`${s.tone[0]}${s.lo.toFixed(4)}-${s.hi.toFixed(4)}`).join(',')}`:'').join('')??'';
    const nextPieces=opened?`${n}:${run!.tones.join('')}:${partsKey}:${Array.from({length:n},(_,i)=>{const e=ends(i);return `${(e.head/step).toFixed(0)},${(e.tail/step).toFixed(0)}`;}).join(';')}:${(midWidth/step).toFixed(0)}:${signature(pieceOf(0)?.[0])}:${signature(pieceOf(n-1)?.at(-1))}:${wr.toFixed(4)}:${positive}:${taperR}`:'';
    if(nextPieces!==piecesKey){
     piecesKey=nextPieces;
     const solid:{points:Vec[];rgba:number[]}[]=[],ghost:{points:Vec[];rgba:number[]}[]=[];
     const lay=(tone:RunTone,list:Vec[][])=>{const c=toneColour(tone),rgba=[c.r,c.g,c.b,tone==='dim'?.26:1];for(const points of list)(tone==='dim'?ghost:solid).push({points,rgba});};
     if(opened)run!.tones.forEach((tone,i)=>{
      const path=pieceOf(i);
      if(!path)return;
      // A piece in more than one tone (see `RunPart`) is drawn as its stretches, cut only at its own two ends: the
      // place one tone meets the next is not a cut. Each end gives up what the whole piece's would.
      const own=run!.parts[i];
      if(own){const e=ends(i);for(const q of own)lay(q.tone,cutPiece(q.path,q.head?e.head:0,q.tail?e.tail:0,0,cutShare(n)/(n*Math.max(1e-6,q.hi-q.lo))));return;}
      lay(tone,cutOf(i,path));
     });
     pieceSolid.geometry.dispose();pieceGhost.geometry.dispose();
     // Past forty pieces the cuts are closing toward the continuum: see `tubes`.
     pieceSolid.geometry=tubes(solid,wr,12,n>40);pieceGhost.geometry=tubes(ghost,wr*.97,12,n>40);
    }
    pieceSolid.visible=opened;pieceGhost.visible=opened;
    // The chosen piece, cut exactly as the others are: drawn whole it bridged its own two gaps and
    // looked longer than the pieces round it.
    // ...or the stretch the run names in its place: the half piece a ring cut an odd number of ways puts
    // into its last mirror pair, which has no cut of its own to respect.
    const own=opened?run!.selectedPath:null;
    const selectedPath=opened&&p.element&&'path' in p.element?own??pieceOf(run!.selected):null;
    if(selectedPath){
     const key=`r:${nextPieces}:${run!.selected}:${own?`${signature(own[0])}:${signature(own.at(-1))}`:''}:${thick.toFixed(4)}`;
     if(elementKey!==key){
      element.geometry.dispose();
      element.geometry=tubes((own?[own]:cutOf(run!.selected,selectedPath)).map(points=>({points,rgba:[1,1,1,1]})),thick,14,n>40);
      elementKey=key;
     }
    }
    // The partner: a whole piece, cut like the rest -- or, on a ring cut an odd number of ways, the
    // arc straight across, which is not a piece and so has no cuts of its own to respect.
    const partner=run?.partner??null;
    const nextPartner=partner?`${partner.across}:${partner.index}:${signature(partner.path[0])}:${signature(partner.path.at(-1))}:${opened?nextPieces:'whole'}:${thick.toFixed(4)}`:'';
    if(nextPartner!==partnerKey){
     partnerKey=nextPartner;
     partnerBody.geometry.dispose();
     const paths=!partner?[]:partner.index!==null&&opened?cutOf(partner.index,partner.path):[partner.path];
     partnerBody.geometry=tubes(paths.map(points=>({points,rgba:[1,1,1,1]})),thick,14);
    }
    partnerBody.visible=!!partner;
    // A surface's cuts replace the resting rings while the run is open: they are the partition being
    // summed, at its edges, rather than one circle through the middle of every ring.
    slices.visible=!run||wire;
    const seams=run&&!wire?run.seams:[];
    // On the sheet the cuts far behind P dim with the plane they are cut in, or the circles alone
    // would go on drawing a ring level with P. Turned with the camera, as the sheet is.
    const farKey=far?`${far.inner.toFixed(2)},${far.outer.toFixed(2)}`:'';
    cuts.rotation.z=far?yaw:0;
    const nextCuts=seams.map(s=>`${s.radius.toFixed(4)}:${(s.z??0).toFixed(4)}:${s.grow<1?'g':'c'}`).join(';')+farKey;
    if(nextCuts!==cutsKey){
     cutsKey=nextCuts;clearGroup(cuts);
     for(const s of seams){
      const radius=Math.max(.01,s.radius),circle=unitCircle(96),position=circle.getAttribute('position') as Attribute,rgba=new Float32Array(position.count*4);
      for(let i=0;i<position.count;i++){rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=1;rgba[i*4+3]=far?farAlpha(position.getY(i)*radius,pieceFade(far,'outline')):1;}
      circle.setAttribute('color',new THREE.BufferAttribute(rgba,4));
      const loop=new THREE.Line(circle,s.grow<1?growMaterial:cutMaterial);
      loop.scale.setScalar(radius);loop.position.z=s.z??wr*.06;loop.userData.at=s.at;cuts.add(loop);
     }
    }
    // Each circle is drawn round as its cut is made, a knife going once round the surface.
    for(const loop of cuts.children)(loop as InstanceType<typeof THREE.Line>).geometry.setDrawRange(0,Math.ceil(97*cutShown(Number(loop.userData.at)||0,now)));
    const lineColour=CHARGE.line;
    cutMaterial.color.set(lineColour);cutMaterial.opacity=.8*(run?.open??0);
    growMaterial.color.set(lineColour);growMaterial.opacity=.8*(run?.open??0)*(run?.split??0);
    // How far the sum has reached across a surface. A sheet's sum reaches past the picture, so its
    // shading dissolves exactly as the sheet under it does rather than ending at a hard rim.
    const filled=run&&!wire?run.filled:null;
    // The shell's sum has reached an angle from the top, not a radius: its shading is the cap of the sphere down to it.
    const reach=p.kind==='sheet'?spread:p.kind==='shell'?Math.PI:Math.max(.01,p.radius);
    const nextFill=filled!==null?`${p.kind}:${quantise(Math.min(filled,reach)/reach,400)}:${spread.toFixed(3)}:${frameWorld.toFixed(2)}:${positive}:${farKey}:${dark}:${(p.hole??0).toFixed(4)}`:'';
    if(nextFill!==fillKey){
     fillKey=nextFill;fill.geometry.dispose();
     const r=Math.max(.001,Math.min(filled??0,reach));
     fill.geometry=filled===null?new THREE.BufferGeometry()
      :p.kind==='sheet'?fillGeometry(r,frameWorld*.45,far,fillAlpha(dark))
      :p.kind==='shell'?shellBand(p.radius,0,r,1.006,48,fillAlpha(dark)*.9)
      // An annulus's sum starts at its hole's edge: the shading never covers the hole, where nothing was added.
      :fadeGeometry(new THREE.RingGeometry(Math.min(p.hole??0,r*.999),r,128,4),0,0,fillAlpha(dark)*1.2);
    }
    fill.visible=filled!==null;fill.position.z=p.kind==='shell'?0:wr*.03;fill.rotation.z=far?yaw:0;
    // In the dark it glows a little, as the sheet under it does, rather than sitting on it as a grey slab.
    fillMaterial.color.copy(toneColour('added'));fillMaterial.emissive.set(CHARGE.glow);fillMaterial.emissiveIntensity=dark?.25:0;
    for(const m of [pieceMaterial,ghostMaterial]){m.emissive.set(CHARGE.glow);m.emissiveIntensity=dark?.85:.35;}
    // The arrows at P, all at the figure's own scale.
    const arrows=run?.arrows??null,P=p.point,plus=(a:Vec,b:Vec):Vec=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
    // From P -- or, while a mirror pair goes into the sum, from the tip of the sum so far.
    const at=plus(P,arrows?.from??{x:0,y:0,z:0}),size=(v:Vec)=>Math.hypot(v.x,v.y,v.z);
    // The parts along the axis, laid over only what the sum's arrow has not reached yet (see `keptSpans`), and let
    // go once what is left of one is shorter than its own head: a sliver of shaft under a full head is a chevron.
    // `back` sets one behind the other along the line of sight, which moves it nowhere on the screen: the
    // mirror's part slides out from UNDER the piece's, as the flat figure lays it, rather than over it.
    const spans=keptSpans(arrows,p.net);
    // A PAIR THAT TAKES AWAY FROM THE SUM IS LAID BESIDE IT. Past half a turn the arc's last pairs point back
    // along the axis: laid from the sum's tip backward, their two parts lay on the sum's own shaft, in the same
    // teal and thinner, so all that showed was a reversed head halfway down ΣΔE, and the pair taking twice its
    // part away could not be seen. Moved to one side on the screen (below an arrow lying across it, left of
    // one standing up: the chain is laid on the other side), by three tenths of their length, at least six
    // units and at most ten, and tied back to the axis at both ends by a hairline, so they plainly act there.
    const takesAway=!!(arrows?.pair&&p.net&&arrows.keep)&&p.net!.x*arrows!.keep!.x+p.net!.y*arrows!.keep!.y+p.net!.z*arrows!.keep!.z<0;
    let shift:Vec={x:0,y:0,z:0};
    const first=spans.piece??spans.partner,last=spans.partner??spans.piece;
    if(takesAway&&first&&last){
     const end={x:last.from.x+last.along.x,y:last.from.y+last.along.y,z:last.from.z+last.along.z};
     const reach={x:end.x-first.from.x,y:end.y-first.from.y,z:end.z-first.from.z},rl=size(reach);
     if(rl>1e-9){
      const u=linkA.set(reach.x/rl,reach.y/rl,reach.z/rl),upright=Math.abs(u.dot(screenUp))>=Math.abs(u.dot(screenRight));
      const side=upright?screenRight:screenUp;
      aside.copy(side).multiplyScalar(-1).addScaledVector(u,side.dot(u));
      if(aside.lengthSq()<1e-10)aside.copy(across.crossVectors(u,toCamera));
      const shown=Math.hypot(reach.x*screenRight.x+reach.y*screenRight.y+reach.z*screenRight.z,reach.x*screenUp.x+reach.y*screenUp.y+reach.z*screenUp.z)/px;
      aside.normalize().multiplyScalar(keepAside(shown)*px);
      shift={x:aside.x,y:aside.y,z:aside.z};
      // The two ties: from the axis to each end of what is left of the pair, beside it.
      [first.from,end].forEach((q,i)=>{
       const t=ties[i];t.visible=true;
       t.quaternion.setFromUnitVectors(Y,tmpV.set(shift.x,shift.y,shift.z).normalize());
       t.scale.set(Math.max(wr*.18,.45*cssPx),size(shift),Math.max(wr*.18,.45*cssPx));
       t.position.set(P.x+q.x+shift.x/2,P.y+q.y+shift.y/2,P.z+q.z+shift.z/2);
      });
     }
    }
    if(!(shift.x||shift.y||shift.z))for(const t of ties)t.visible=false;
    tieMaterial.color.copy(partMaterial.color);
    mount.parentElement?.setAttribute('data-run-keep-aside',(size(shift)/px).toFixed(2));
    const layPart=(a:ReturnType<typeof arrow>,span:{from:Vec;along:Vec}|null,full:number,thickness:number,back=0)=>{
     const l=span?size(span.along):0;
     if(!span||!(l>1e-6)||(arrows?.pair&&l<headSize(full,thickness).l)){a.group.visible=false;return;}
     layArrow(a,{x:P.x+shift.x+span.from.x-toCamera.x*back,y:P.y+shift.y+span.from.y-toCamera.y*back,z:P.z+shift.z+span.from.z-toCamera.z*back},span.along,l,thickness);
    };
    layPart(keepArrow,spans.piece,arrows?.keep?size(arrows.keep):0,wr*.62);
    // The dropped part: solid where it survives, dashed and fading where a partner cancels it.
    const drop=dropStyle(arrows);
    if(drop==='solid'&&arrows?.drop)layArrow(dropArrow,plus(P,arrows.dropFrom),arrows.drop,Math.hypot(arrows.drop.x,arrows.drop.y,arrows.drop.z),wr*.62);else dropArrow.group.visible=false;
    // The pair that cancels is never thinner than about two pixels across: on a phone the scene's
    // metres shrink with the figure, and the dashed pair came out a faint pixel wide over the grid.
    const pair=Math.max(wr*.3,.9*cssPx);
    layDashed(pairDropArrow,plus(P,arrows?.dropFrom??P),drop==='dashed'?arrows!.drop:null,pair);
    // The pair's whole arrows, going as their parts across do (see `RunArrows.whole`): the mirror's, and while a
    // pair goes into the sum the piece's own, drawn here in place of the figure's contribution arrow.
    const whole=arrows?.whole??1,slim=Math.max(wr*.45,.8*cssPx);
    if(arrows?.partner&&whole>.01)layArrow(partnerArrow,at,arrows.partner,size(arrows.partner),slim);else partnerArrow.group.visible=false;
    if(arrows?.pieceWhole&&whole>.01)layArrow(wholeArrow,at,arrows.pieceWhole,size(arrows.pieceWhole),slim);else wholeArrow.group.visible=false;
    partnerMaterial.opacity=whole;wholeMaterial.opacity=whole;
    // How long the pair's two whole arrows are on the screen, in units of the figure: for the tests (see `spacePairGain`).
    const shownOf=(v:Vec)=>Math.hypot(v.x*screenRight.x+v.y*screenRight.y+v.z*screenRight.z,v.x*screenUp.x+v.y*screenUp.y+v.z*screenUp.z)/px;
    if(arrows?.pair&&arrows.pieceWhole&&arrows.partner)mount.parentElement?.setAttribute('data-run-pair-shown',`${shownOf(arrows.pieceWhole).toFixed(2)} ${shownOf(arrows.partner).toFixed(2)}`);
    else mount.parentElement?.removeAttribute('data-run-pair-shown');
    layDashed(partnerDropArrow,plus(P,arrows?.partnerFrom??P),arrows?.partnerDrop??null,pair);
    // What the mirror keeps: on the tip of what the piece keeps once the sideways parts are half gone, fading in,
    // while one piece is explained; sliding out from under the piece's while a pair goes into the sum.
    layPart(partnerKeepArrow,spans.partner,arrows?.partnerSurvivor?size(arrows.partnerSurvivor):0,wr*.62,arrows?.pair?wr*2.4:0);
    partnerKeepFade=arrows?.pair?1:Math.min(1,Math.max(0,((arrows?.cancelled??0)-.5)*2));
    // The pair that cancels fades as it shrinks, never quite to nothing until it is gone.
    fadeMaterial.opacity=Math.max(.12,1-(arrows?.cancelled??0));
    layChain(P,run?.chain??null,wr*.6,p.net,!!run?.chainBeside,run?.stage==='limit'?run.open:1,run?.stage==='add');
    return !!selectedPath;
   };
   const apply=(p:FieldStageProps)=>{
    // clientWidth for the same reason the 2D layer uses it: a bounding rect carries page
    // zoom, and sizing a drawing buffer from it makes the buffer grow with the zoom.
    const w=mount.clientWidth,h=mount.clientHeight;
    if(w<2||h<2)return;
    // Assigning a canvas its own size still clears it and reallocates the drawing buffer,
    // so the size is only written when it has actually changed.
    const size=renderer.getSize(new THREE.Vector2());
    if(size.x!==w||size.y!==h)renderer.setSize(w,h,false);
    const f=frustum(p.frame.width,p.frame.height,p.unit);
    camera.left=f.left;camera.right=f.right;camera.top=f.top;camera.bottom=f.bottom;
    const view=p.animating&&p.getView?p.getView():{yaw:p.yaw,pitch:p.pitch};
    // Look at the point the SVG has at the centre of its frame, not at the world origin:
    // each geometry puts its origin where its own labels need it.
    const target=frameTarget(p.origin,p.frame,p.unit,view.yaw,view.pitch);
    const basis=cameraBasis(view.yaw,view.pitch),eye=cameraPosition(view.yaw,view.pitch,120),up=basis.up;
    // Kept for the marks that are turned to face the camera: the arrowheads and the chain's side.
    toCamera.set(basis.forward.x,basis.forward.y,basis.forward.z);screenUp.set(up.x,up.y,up.z);screenRight.set(basis.right.x,basis.right.y,basis.right.z);
    px=1/p.unit;cssPx=px*p.frame.width/w;
    camera.position.set(target.x+eye.x,target.y+eye.y,target.z+eye.z);
    camera.up.set(up.x,up.y,up.z);
    camera.lookAt(target.x,target.y,target.z);
    camera.updateProjectionMatrix();
    // The theme lives on the document, not in props: one source of truth, and it stays
    // correct when the toggle flips without this component re-rendering.
    //
    // Read once per theme, not on every frame: during the run this runs on every frame, and a computed
    // style read after the SVG has changed makes the browser work out the page's styles there and then.
    const dark=document.documentElement.classList.contains('dark');
    const theme=document.documentElement.className;
    if(theme!==themeKey){
     themeKey=theme;
     themeTint=cssColor('--field',dark?0x5fd3c4:0x0b6b63);themePaper=cssColor('--diagram',dark?0x172936:0xffffff);
     themePart=cssColor('--contribution',dark?0x35a9a2:0x2f9089);
     lineInk(themeTint);
     // The ink the lines are drawn in and the paper they are mixed with, where a test can compare a theme
     // switched to with the same theme loaded.
     mount.parentElement?.setAttribute('data-line-ink',`#${inkColour.getHexString()}/${inkAlpha.toFixed(3)} on #${themePaper.getHexString()}`);
     mount.parentElement?.setAttribute('data-scene-theme',dark?'dark':'light');
    }
    const tint=themeTint,paper=themePaper;
    const positive=p.charge>=0;
    taperR=p.taper??0;shellR=p.radius;
    // The shell's chosen band is seen all the way round, its far half through the skin.
    elementMaterial.side=p.kind==='shell'?THREE.DoubleSide:THREE.FrontSide;
    const shape=`${sampleKey(p)}:${taperR}`;
    // A disk and a sheet are drawn at unit size and scaled, so how finely they are cut says
    // nothing about their body; it was rebuilt at every doubling of the limit regardless.
    const bodyShape=p.kind==='wire'?shape:`${p.kind}:${p.closed}:${p.hole&&p.radius>0?(p.hole/p.radius).toFixed(4):0}`;
    if(bodyKey!==bodyShape){buildBody(p);bodyKey=bodyShape;}
    const frameWorld=Math.max(f.right-f.left,f.top-f.bottom);
    const extent=frameExtent(p.reach,frameWorld);
    if(frameKey!==String(extent)){buildFrame(extent);frameKey=String(extent);}
    const spread=bodyReach(p.kind,p.radius,frameWorld);
    body.scale.setScalar(p.kind==='wire'?1:spread);
    // The sheet's far side dims with depth, so the plane behind P is never drawn level with it; see
    // `sheetFarFade`. The sheet is round, so turning it by the yaw costs nothing and puts its local
    // +y on the camera's far direction; the ramp is repainted only when the pitch, the height or the
    // zoom moves it.
    const far=p.kind==='sheet'?sheetFarFade(p.point.z,view.pitch,p.unit):null;
    body.rotation.z=far?view.yaw:0;
    const sheet=far?body.children[0] as InstanceType<typeof THREE.Mesh>|undefined:undefined;
    // And to either side it ends on an ellipse, inside the window, not on the window's square edge (see `sheetSides`):
    // about the window's middle, which is not O's, and dissolved by twenty units short of its sides. Local x on the
    // turned sheet is the screen's right in the plane, in units of the sheet's own scale.
    const middle=far?(PLOT.x+PLOT.width/2-360)/p.unit+(target.x*basis.right.x+target.y*basis.right.y+target.z*basis.right.z):0,sides=(PLOT.width/2-20)/p.unit;
    const nextFar=far?`${(far.inner/spread).toFixed(3)}:${(far.outer/spread).toFixed(3)}:${middle.toFixed(3)}:${sides.toFixed(3)}`:'';
    if(sheet&&far&&nextFar!==sheetFarKey){fadeGeometry(sheet.geometry,SHEET_FADE.inner,SHEET_FADE.outer,1,far,spread,(x,y)=>sheetSides(x-middle,y,sides));sheetFarKey=nextFar;}
    // Rebuild the rings only when the partition actually changes; scaling is free, geometry
    // is not, and this runs on every camera frame during an orbit.
    const radii=p.kind==='disk'?visibleRadii(p.samples,p.selected):[];
    // The shell's rings at rest, each round the sphere at its own middle angle, as the flat figure draws them, no more than forty.
    const shellCuts=p.kind==='shell'?(()=>{const n=p.samples.length,stride=Math.max(1,Math.ceil(n/40));return Array.from({length:n},(_,k)=>(k+.5)*Math.PI/n).filter((_,k)=>k%stride===0);})():[];
    const nextSlices=p.kind==='shell'?`shell:${shellCuts.length}:${p.radius.toFixed(4)}`:radii.length?`${radii.length}:${radii[radii.length-1].toFixed(4)}`:'none';
    if(sliceKey!==nextSlices){
     clearGroup(slices);sliceKey=nextSlices;
     for(const r of radii){const loop=new THREE.Line(unitCircle(96),sliceMaterial);loop.scale.setScalar(Math.max(.01,r));slices.add(loop);}
     for(const t of shellCuts){const loop=new THREE.Line(unitCircle(96),sliceMaterial);loop.scale.setScalar(Math.max(.01,p.radius*Math.sin(t)*1.004));loop.position.z=p.radius*Math.cos(t)*1.004;slices.add(loop);}
    }
    // The field is the expensive part -- tracing is quadratic in the sample count -- so it is
    // rebuilt only when what it depends on changes, never on a camera frame.
    //
    // WHILE THE PIECES SHRINK it is not retraced at all. The last stage of the run doubles the cut
    // five or six times, and every doubling is a new charge to trace: on the disk, a frame of up to
    // twenty milliseconds at each one, in the stage whose whole point is that the answer stops
    // depending on the cut. The field of the charge does not depend on how it is cut, so the stage
    // keeps the field it began with and traces once more, from the finest cut, on the frame it ends
    // on -- the field the flat figure's last frame arrives at too.
    const charge=chargeKey(p);
    const shrinking=!!p.run&&p.run.stage==='limit'&&p.run.open>0&&tracedFrom!=='';
    const from=shrinking?tracedFrom:charge;
    // The sheet's lines are not traced (see `sheetLines`), and are drawn out to three pictures, so
    // they are laid again when the zoom changes the picture; nothing else about the field depends on it.
    const wr=wireRadius(p.reach);
    // An endless line is seeded across the window, so its lines are laid again when the window grows
    // past the last power of 1.25 (see `poolWindow`); a bounded charge's never depend on the zoom.
    if(charge!==farFrom){
     farFrom=charge;const source=p.fieldSamples??p.samples;
     chargeFar=Math.max(0,...source.map(s=>Math.hypot(s.position.x,s.position.y,s.position.z)));
     chargeAway=p.kind==='shell'?bodyDistance(source,'shell'):bodyDistance(coarsen(source,p.detail??48),p.kind==='wire'?'wire':'surface');
    }
    const endless=p.kind==='wire'&&chargeFar>poolWindow(frameWorld);
    // How far the lines run, and where the arrows stand, both follow P (see `lineReach`, `latticeFrame`):
    // in steps, so a drag retraces only when one is crossed.
    const drawn=p.fieldView==='lines'&&p.kind!=='sheet'?lineReach(p.reach,chargeAway(p.point.x,p.point.y,p.point.z)):p.reach;
    const lit=p.fieldView==='vectors'?latticeFor(p):null;
    const litKey=lit?`:${lit.centre.x.toFixed(3)},${lit.centre.y.toFixed(3)},${lit.centre.z.toFixed(3)},${lit.spacing.toFixed(4)}`:'';
    const nextField=`${p.fieldView}:${p.kind}:${from}:${p.reach.toFixed(2)}:${drawn.toFixed(3)}${litKey}:${positive}${p.kind==='sheet'?`:${frameWorld.toFixed(1)}`:endless?`:${poolWindow(frameWorld).toFixed(3)}`:''}`;
    if(fieldKey!==nextField){buildField(p,wr,frameWorld,drawn,lit);fieldKey=nextField;tracedFrom=from;}
    // The sheet's lines are laid by the screen, so they follow the view (see `laySheet`).
    if(p.kind==='sheet'&&p.fieldView==='lines'&&far){
     const nextSheet=`${builds}:${view.yaw.toFixed(4)}:${view.pitch.toFixed(3)}:${p.unit.toFixed(3)}:${p.origin.x.toFixed(1)},${p.origin.y.toFixed(1)}:${far.inner.toFixed(2)}:${frameWorld.toFixed(1)}`;
     if(sheetKey!==nextSheet){laySheet(p,frameWorld,view.yaw,view.pitch,far);sheetKey=nextSheet;}
    }
    // Its colour follows the paper and the quiet run, and its arrowheads the camera, without a retrace.
    const quiet=!!p.quiet;
    const nextPaint=`${builds}:${laid}:${quiet}:${inkSource}:${inkAlpha}:${paper.getHexString()}${far?`:${far.inner.toFixed(2)},${far.outer.toFixed(2)},${view.yaw.toFixed(3)}`:''}`;
    if(paintKey!==nextPaint){paintField(quiet,inkColour,paper,far,view.yaw);paintKey=nextPaint;headsKey='';}
    // The names first, where they stand now: the heads, the arrows and the marks give way to them.
    readNames();
    const nextHeads=`${builds}:${laid}:${view.yaw.toFixed(4)}:${view.pitch.toFixed(4)}:${p.unit.toFixed(3)}:${target.x.toFixed(3)},${target.y.toFixed(3)},${target.z.toFixed(3)}:${namesKey}`;
    if(headsKey!==nextHeads){layLineHeads(quiet,inkColour,paper,target,p.unit,far,view.yaw,p.kind);headsKey=nextHeads;}
    const nextLattice=latticeMesh?`${builds}:${p.point.x.toFixed(3)},${p.point.y.toFixed(3)},${p.point.z.toFixed(3)}:${p.net?`${p.net.x.toFixed(3)},${p.net.y.toFixed(3)},${p.net.z.toFixed(3)}`:'-'}:${view.yaw.toFixed(4)}:${view.pitch.toFixed(4)}:${p.unit.toFixed(3)}:${target.x.toFixed(3)},${target.y.toFixed(3)},${target.z.toFixed(3)}:${namesKey}`:'';
    if(latticeKey!==nextLattice){paintLattice(p.point,p.net,p.unit,target);latticeKey=nextLattice;}
    // The marks: cheap to place every frame, so they always sit on the live geometry.
    point.position.set(p.point.x,p.point.y,p.point.z);point.scale.setScalar(wr*1.7);
    halo.position.copy(point.position);halo.scale.setScalar(wr*4.2);
    // The chosen piece half again as thick as the wire, and never less than a pixel and a quarter thicker on
    // the screen, each side: on a phone the scene's metres shrink with the figure, and the chosen piece of a
    // ring cut into five came out a fraction of a pixel thicker than the pieces round it -- in Cut it up,
    // nothing to find. On a desktop the two agree.
    const thick=Math.max(wr*1.5,wr+1.25*cssPx);
    // The run goes first: while it has the wire cut up, it builds the chosen piece itself.
    // The sheet's chosen ring dims on its far side with the sheet, though less: see PIECE_FAR_LOW.
    const pieceFar=far&&p.element&&'annulus' in p.element?pieceFade(far,'face'):null;
    element.rotation.z=pieceFar?view.yaw:0;
    if(applyRun(p,wr,positive,dark,spread,thick,far,view.yaw,frameWorld))element.visible=true;
    else if(p.element){
     element.visible=true;
     const key='band' in p.element?`b:${p.element.band.lo.toFixed(5)}:${p.element.band.hi.toFixed(5)}:${p.radius.toFixed(4)}`:'annulus' in p.element
      ?`a:${p.element.annulus.inner.toFixed(4)}:${p.element.annulus.outer.toFixed(4)}:${thick.toFixed(4)}:${frameWorld.toFixed(2)}:${pieceFar?`${pieceFar.inner.toFixed(2)},${pieceFar.outer.toFixed(2)}`:''}`
      :`p:${thick.toFixed(4)}:${taperR}:${p.element.path.map(v=>`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`).join(';')}`;
     // THE CHOSEN PIECE IS NEVER FADED BY DISTANCE, even on the sheet, where the plane around it
     // is. It used to take the sheet's own ramp -- solid to a fifth of the way out, gone by four
     // fifths -- and so the outermost ring, which runs from about 9 m to the truncation, was
     // dissolved to nothing before it reached the edge of the picture. That ring is the single
     // largest contributor to the field: cut at equal angles from P, a sheet's rings push HARDER
     // the further out they are, and at five pieces the last one carries about 31% of E. Fog that
     // hides the piece doing the most work is not a depth cue; it is concealment.
     //
     // The plane may fade, because the plane is ground. The piece being pointed at stays, and its
     // width alone decides how strongly it is tinted, so a huge washer is a light wash rather than
     // a slab. The one exception is depth, not distance: the arc of a ring BEHIND P is dimmed, never
     // to less than PIECE_FAR_LOW, so a ring whose far edge projects above P reads as behind it
     // rather than through it. Its near side and its sides keep their full strength.
     if(elementKey!==key){buildElement(p.element,thick,null,frameWorld,pieceFar);elementKey=key;}
    }else element.visible=false;
    // Cut it up lights the chosen piece only once every cut is made, as the flat figure names it: before that the
    // charge is being cut, and a piece already lit said it had been cut before the stage began.
    const unnamed=p.run?.stage==='pieces'&&cutLocal(performance.now())<NAMED_AT;
    if(unnamed)element.visible=false;
    // How far Cut it up has got, said on the stage for a test to read: the cuts made so far, and whether the piece
    // is named yet. Nothing a reader sees; the drawing is a canvas.
    if(p.run?.stage==='pieces'){
     const n=p.run.pieces.length,ts=Array.from({length:p.closed?n:n-1},(_,k)=>(p.closed?k:k+1)/n),now=performance.now();
     const made=`${ts.filter(t=>cutShown(t,now)>.5).length}/${ts.length}:${unnamed?'cutting':'named'}`;
     if(mount.parentElement?.getAttribute('data-run-cutting')!==made)mount.parentElement?.setAttribute('data-run-cutting',made);
    }else mount.parentElement?.removeAttribute('data-run-cutting');
    // AT REST, CUT SHORT RATHER THAN CUT OFF: an arrow from P whose tip the view has turned out of the window is drawn
    // only as long as keeps its head inside it (see `fitInWindow`). Not in the run, where the arrows are laid tip to
    // tail -- the chain ends on the sum's head -- and one of them shortened alone would come apart from the others.
    const Rs=screenRight,Us=screenUp,onScreen=(v:Vec)=>{const dx=v.x-target.x,dy=v.y-target.y,dz=v.z-target.z;return {x:360+(dx*Rs.x+dy*Rs.y+dz*Rs.z)*p.unit,y:215-(dx*Us.x+dy*Us.y+dz*Us.z)*p.unit};};
    const fitted=(from:Vec,v:Vec,thickness:number)=>{
     const l=Math.hypot(v.x,v.y,v.z);
     if(p.run||!(l>1e-9))return l;
     const u={x:v.x/l,y:v.y/l,z:v.z/l},along={x:(u.x*Rs.x+u.y*Rs.y+u.z*Rs.z)*p.unit,y:-(u.x*Us.x+u.y*Us.y+u.z*Us.z)*p.unit};
     return fitInWindow(onScreen(from),along,l,PLOT,ARROW_INSET,headSize(l,thickness).l*1.25+3*thickness);
    };
    if(p.net){
     const l=fitted(p.point,p.net,wr*.75),full=Math.hypot(p.net.x,p.net.y,p.net.z);
     layArrow(netArrow,p.point,p.net,l,wr*.75);
     // Where the net arrow's tip is drawn, in units of the figure, and how much of it is drawn: for the tests.
     const k=full>0?l/full:1,tip=onScreen({x:p.point.x+p.net.x*k,y:p.point.y+p.net.y*k,z:p.point.z+p.net.z*k});
     mount.parentElement?.setAttribute('data-scene-net-tip',`${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`);
     mount.parentElement?.setAttribute('data-scene-net-fit',k.toFixed(3));
    }else{netArrow.group.visible=false;mount.parentElement?.removeAttribute('data-scene-net-tip');mount.parentElement?.removeAttribute('data-scene-net-fit');}
    // One element's contribution is the field AT P due to that element, so it is laid from P.
    // While a mirror pair goes into the sum the run draws the piece's whole arrow itself, fading (see `wholeArrow`).
    if(p.contribution&&!p.run?.arrows?.pair){
     const from=p.contributionFrom?{x:p.point.x+p.contributionFrom.x,y:p.point.y+p.contributionFrom.y,z:p.point.z+p.contributionFrom.z}:p.point;
     layArrow(partArrow,from,p.contribution,fitted(from,p.contribution,wr*.55),wr*.55);
    }else partArrow.group.visible=false;
    for(const m of [bodyMaterial,sheetMaterial]){
     m.color.set(CHARGE.body);
     m.emissive.set(CHARGE.glow);
     m.emissiveIntensity=dark?.85:.35;
    }
    // In the dark the sheet is the charge colour itself, unlit, not a lit tan greyed by the navy: see `sheetInk`.
    const ink=sheetInk(dark);
    if(ink.unlit){sheetMaterial.color.set(0x000000);sheetMaterial.emissive.set(ink.colour??CHARGE.body);sheetMaterial.emissiveIntensity=1;}
    bodyMaterial.transparent=p.kind!=='wire';bodyMaterial.depthWrite=writesDepth(p.kind);
    bodyMaterial.opacity=p.kind==='wire'?1:surfaceOpacity(p.kind);
    sheetMaterial.opacity=ink.opacity;
    sliceMaterial.color.set(CHARGE.line);
    pickedMaterial.color.set(CHARGE.body);
    // As wide as the flat figure's lines, which are 1.1 of its 720 units across: the same hairline
    // at any size the figure is drawn, and at any zoom, since the width is in pixels.
    for(const m of [lineMaterial,frontLineMaterial]){m.resolution.set(w,h);m.linewidth=1.1*w/p.frame.width;}
    // The window in drawing-buffer pixels, upward from the bottom as gl_FragCoord counts them, and a
    // fade forty units of the figure wide.
    const W=renderer.domElement.width,H=renderer.domElement.height,sx=W/p.frame.width,sy=H/p.frame.height;
    edge.uEdgeRect.value.set(PLOT.x*sx,H-(PLOT.y+PLOT.height)*sy,(PLOT.x+PLOT.width)*sx,H-PLOT.y*sy);edge.uEdgeFeather.value=40*sx;
    // P on the screen, in drawing-buffer pixels with its depth, for the gap a surface leaves round it where
    // it passes behind (see `gap`); and in CSS pixels across the stage, where a test can find it.
    camera.updateMatrixWorld();
    const ndc=gapAt.set(p.point.x,p.point.y,p.point.z).project(camera);
    // Only what is well behind P: further than twice the reach of P's halo. Close under P the charge is
    // NEAR P, not behind it, and the sheet's smallest ring with P half a metre up -- right under P on the
    // screen -- went with the gap. From there it comes in over the outer radius' worth of depth (see
    // `gapDepth`), and its radii are the figure's units in drawing-buffer pixels (see BEHIND_GAP).
    const depthSpan=camera.far-camera.near,behind=gapStart(wr)/depthSpan;
    gap.uGapP.value.set((ndc.x+1)/2*W,(ndc.y+1)/2*H,(ndc.z+1)/2+behind);
    gap.uGapDepth.value=gapRamp(px)/depthSpan;
    // Smaller from above, on a surface, where P stands over the charge rather than in front of a far rim: see `gapShrink`.
    const shrink=gapShrink(view.pitch,p.kind);
    gap.uGapRamp.value.set(BEHIND_GAP.inner*shrink*sx,BEHIND_GAP.outer*shrink*sx,BEHIND_GAP.low,BEHIND_GAP.hard*sx);
    mount.parentElement?.setAttribute('data-gap-shrink',shrink.toFixed(3));
    gap.uGapOn.value=p.kind==='wire'?2:1;
    // A surface leaves no gap while P hovers close over it (see `gapLift`).
    gap.uGapLift.value=p.kind==='wire'?1:gapLift(Math.abs(p.point.z)*p.unit);
    mount.parentElement?.setAttribute('data-gap-lift',gap.uGapLift.value.toFixed(3));
    edge.uEdgeOn.value=p.kind==='sheet'?1:0;
    // The view cube's box, for the charge's fade under it (see `cubeFade`); `cube` was read with the names above.
    cubeFade.uCubeOn.value=cube?1:0;cubeFade.uPaper.value.copy(paper);cubeFade.uCubeFeather.value=24*sx;
    if(cube)cubeFade.uCubeRect.value.set(cube.x*sx,H-(cube.y+cube.height)*sy,(cube.x+cube.width)*sx,H-cube.y*sy);
    mount.parentElement?.setAttribute('data-cube-fade',cube?`${cube.x.toFixed(1)} ${cube.y.toFixed(1)} ${cube.width.toFixed(1)} ${cube.height.toFixed(1)}`:'off');
    mount.parentElement?.setAttribute('data-edge-fade',String(edge.uEdgeOn.value));
    // And O, in the same CSS pixels, for the tests that keep the marks off the line from O up to P.
    const o=gapAt.set(0,0,0).project(camera);
    mount.parentElement?.setAttribute('data-scene-o',`${((o.x+1)/2*w).toFixed(1)} ${((1-o.y)/2*h).toFixed(1)}`);
    // `ndc` is `gapAt` itself, so P goes back into it before it is read again below.
    gapAt.set(p.point.x,p.point.y,p.point.z).project(camera);
    // And the net arrow from P in metres, for the tests that check nothing else is laid along it.
    if(p.net)mount.parentElement?.setAttribute('data-scene-net',`${p.net.x} ${p.net.y} ${p.net.z}`);else mount.parentElement?.removeAttribute('data-scene-net');
    mount.parentElement?.setAttribute('data-scene-p',`${((ndc.x+1)/2*w).toFixed(1)} ${((1-ndc.y)/2*h).toFixed(1)}`);
    // The charge's colour, where a test can read it: the same for both signs (see CHARGE).
    mount.parentElement?.setAttribute('data-charge-colour',`#${bodyMaterial.color.getHexString()}`);
    // And its sign, which the scene now writes on it (see `laySigns`).
    mount.parentElement?.setAttribute('data-charge-sign',positive?'+':'\u2212');
    signs.visible=!p.run;
    const nextSigns=signs.visible?`${paper.getHexString()}:${dark}:${shape}:${chargeKey(p)}:${positive}:${view.yaw.toFixed(4)}:${view.pitch.toFixed(4)}:${p.unit.toFixed(3)}:${p.origin.x.toFixed(1)},${p.origin.y.toFixed(1)}:${frameWorld.toFixed(2)}:${p.radius.toFixed(3)}:${far?far.inner.toFixed(2):''}:${p.element&&'annulus' in p.element?`${p.element.annulus.inner.toFixed(3)},${p.element.annulus.outer.toFixed(3)}`:''}:${namesKey}:${p.point.x.toFixed(3)},${p.point.y.toFixed(3)},${p.point.z.toFixed(3)}:${p.net?`${p.net.x.toFixed(3)},${p.net.y.toFixed(3)},${p.net.z.toFixed(3)}`:'-'}`:'';
    if(signs.visible&&nextSigns!==signKey){laySigns(p,frameWorld,far,view.yaw,view.pitch,wr,positive,paper,dark,target);signKey=nextSigns;}
    pointMaterial.color.copy(tint);pointMaterial.emissive.copy(tint);pointMaterial.emissiveIntensity=dark?.7:.3;
    haloMaterial.color.copy(tint);
    elementMaterial.color.set(CHARGE.line);elementMaterial.emissive.set(CHARGE.line);elementMaterial.emissiveIntensity=dark?.34:.14;
    netMaterial.color.copy(tint);netMaterial.emissive.copy(tint);netMaterial.emissiveIntensity=dark?.6:.25;
    // The flat figure's contribution colour, which is what every label of one piece's arrow is set in.
    partMaterial.color.copy(themePart);
    mount.parentElement?.setAttribute('data-part-colour',`#${partMaterial.color.getHexString()}`);
    // The parts, the partner's arrow and the chain are all one piece's arrow or a sum of them, so
    // they wear its colour; the beads where the chain joins are pale, like the flat figure's.
    for(const m of [fadeMaterial,chainMaterial,newestMaterial,wholeMaterial])m.color.copy(partMaterial.color);
    // While the walk adds links, the ones already laid stand back, as the flat chain does at .55, and the newest
    // is the piece's colour itself (see `newestMaterial`).
    if(p.run?.stage==='add')mixInk(chainMaterial.color,paper,partMaterial.color,.55);
    // The mirror's lighter tint, as the flat figure mixes it: see PARTNER_TINT in ChargeDiagram.
    mixInk(partnerMaterial.color,paper,partMaterial.color,.52);
    // WHAT THE MIRROR KEEPS FADES IN BY ITS COLOUR, NOT ITS ALPHA. It lies along the axis, and on the bisector the
    // axis runs through P down the middle of it: see-through while it faded in, its pale shaft showed the darker
    // axis stroke down its centre, and the one arrow read as two thin parallel strokes. Laid opaque and writing depth, in a colour
    // that comes in from the paper's, it looks the same over the paper and covers the axis under it.
    mixInk(partnerKeepMaterial.color,paper,partnerMaterial.color,partnerKeepFade);
    jointMaterial.color.copy(partMaterial.color);
    axisMaterial.color.set(dark?0x9fb3c1:0x4a6172);gridMaterial.color.set(dark?0x9fb3c1:0x4a6172);
    clearTicks(p);
    renderer.render(scene,camera);
   };
   // Cancelled, so the browser may give the context back (`webglcontextrestored`); three rebuilds its own state then.
   const canvas=renderer.domElement;
   const onLost=(ev:Event)=>{ev.preventDefault();if(disposed)return;mount.parentElement?.setAttribute('data-scene-lost','true');setLost(true);latest.current.onUnavailable?.('lost');};
   const onRestored=()=>{if(disposed)return;mount.parentElement?.removeAttribute('data-scene-lost');setLost(false);apply(latest.current);};
   canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
   const observer=new ResizeObserver(()=>{if(!disposed)apply(latest.current);});
   observer.observe(mount);
   // THE SCENE IS DRAWN AGAIN WHEN THE THEME CHANGES, not only when the figure renders. The page switches the
   // theme with a class on the document, set in an effect of its own -- and React runs a parent's effects
   // after its children's, so this scene drew that render in the OLD theme and nothing drew it again: switched
   // to dark, the field lines stayed the light theme's teal mixed with white paper, bright white strokes on
   // the dark figure, until something else happened to move the view. Now the switch itself is watched.
   const themeWatch=new MutationObserver(()=>{if(!disposed)apply(latest.current);});
   themeWatch.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
   // And when a name moves: the placer sets the names after the render that drew this scene, and the run's
   // stages show and hide them by a class on the figure. Drawn again on the next frame, unless a render in
   // between has already read them.
   const namesMoved=()=>{
    if(disposed)return;
    namesDirty=true;
    if(!namesFrame)namesFrame=requestAnimationFrame(()=>{namesFrame=0;if(!disposed&&namesDirty)apply(latest.current);});
   };
   const nameWatch=new MutationObserver(records=>{if(touchesLabels(records))namesMoved();}),stageWatch=new MutationObserver(namesMoved);
   const labelSvg=labelLayer(),figure=mount.closest('.charge-diagram');
   if(labelSvg)nameWatch.observe(labelSvg,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['transform','x','y','style','opacity','class']});
   if(figure)stageWatch.observe(figure,{attributes:true,attributeFilter:['class']});
   reportOrder();
   apply(latest.current);
   // The offline copy: drawn now, in whatever theme the page has just been put in, and read in the
   // same task -- a WebGL buffer is not kept once it has gone to the screen -- then drawn again.
   const root=mount.parentElement;
   const snapshot=(ev:Event)=>{
    if(disposed)return;
    apply(latest.current);
    const asked=(ev as CustomEvent<SnapshotDetail>).detail;asked.drawn=true;if(!asked.drawOnly)try{asked.url=renderer.domElement.toDataURL('image/png');}catch{/* a lost context: the copy goes without the scene */}
    requestAnimationFrame(()=>{if(!disposed)apply(latest.current);});
   };
   root?.addEventListener(SNAPSHOT_EVENT,snapshot);
   // A frame loop only while the view is actually moving; idle lessons cost nothing.
   let frameId=0,idle=0,lastView='';
   // The loop also parks itself when the view stops changing, whatever the flag says.
   //
   // `animating` is a report from the figure above, and a report can get stuck: interrupt one
   // of its glides and it goes on saying the view is moving for the rest of the session, which
   // held this scene at sixty full redraws a second on an idle page. A gesture moves the view
   // on every frame of itself, and the next render wakes the loop again, so parking after a
   // fifth of a second of a view that has not moved costs a real one nothing.
   const follow=()=>{
    if(disposed)return;
    const p=latest.current;
    if(!p.animating){frameId=0;return;}
    const view=p.getView?p.getView():{yaw:p.yaw,pitch:p.pitch};
    const key=`${view.yaw.toFixed(5)},${view.pitch.toFixed(5)}`;
    idle=key===lastView?idle+1:0;lastView=key;
    if(idle>12){frameId=0;return;}
    apply(p);
    frameId=requestAnimationFrame(follow);
   };
   const wake=()=>{if(!disposed&&!frameId&&latest.current.animating){idle=0;frameId=requestAnimationFrame(follow);}};
   // The cuts of the first stage are made over two seconds in which nothing else need change, so
   // they carry a loop of their own, and it stops as soon as the last cut is open.
   let cutFrame=0;
   const cutLoop=()=>{cutFrame=0;if(disposed)return;apply(latest.current);if(cutting())cutFrame=requestAnimationFrame(cutLoop);};
   const wakeCuts=()=>{if(!disposed&&!cutFrame&&cutting())cutFrame=requestAnimationFrame(cutLoop);};
   wakeCuts();
   live.current={
    update:p=>{if(disposed)return;apply(p);wake();wakeCuts();},
    // The run's clock moved: redraw only while Cut it up is still cutting or yet to name its piece, and only when
    // the time it has reached has changed.
    tick:()=>{if(disposed||runStage!=='pieces')return;const t=Math.max(0,Math.min(CUT_MS/1000,cutLocal(0)));if(t===ticked)return;ticked=t;apply(latest.current);},
    dispose:()=>{
     disposed=true;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);cancelAnimationFrame(frameId);cancelAnimationFrame(cutFrame);observer.disconnect();themeWatch.disconnect();nameWatch.disconnect();stageWatch.disconnect();cancelAnimationFrame(namesFrame);root?.removeEventListener(SNAPSHOT_EVENT,snapshot);
     clearGroup(body);clearGroup(slices);clearGroup(field);clearGroup(cuts);arrowGeometry.dispose();
     for(const mesh of [point,halo,element,netArrow.shaft,netArrow.head,partArrow.shaft,partArrow.head,keepArrow.shaft,keepArrow.head,dropArrow.shaft,dropArrow.head,partnerArrow.shaft,partnerKeepArrow.shaft,wholeArrow.shaft,newestArrow.shaft,pieceSolid,pieceGhost,fill,partnerBody,chainJoints])mesh.geometry.dispose();
     dashGeometry.dispose();flatHead.dispose();
     lineHeadMesh.geometry.dispose();frontHeadMesh.geometry.dispose();signs.geometry.dispose();dropStrokes();
     for(const m of [bodyMaterial,sheetMaterial,sliceMaterial,pickedMaterial,lineMaterial,frontLineMaterial,frontHeadMaterial,arrowMaterial,latticeHeadMaterial,signMaterial,lineHeadMaterial,axisMaterial,gridMaterial,pointMaterial,haloMaterial,elementMaterial,netMaterial,partMaterial,
      pieceMaterial,ghostMaterial,fillMaterial,cutMaterial,growMaterial,partnerMaterial,partnerKeepMaterial,wholeMaterial,fadeMaterial,chainMaterial,newestMaterial,jointMaterial,tieMaterial])m.dispose();
     axes.geometry.dispose();grid.geometry.dispose();ticks.geometry.dispose();
     renderer.dispose();
     if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);
    },
   };
  })().catch(()=>{
   if(cancelled)return;
   try{live.current?.dispose();}catch{/* half built: nothing more to free */}
   live.current=null;
   while(mount.firstChild)mount.removeChild(mount.firstChild);
   mount.parentElement?.setAttribute('data-scene-failed','true');
   setFailed(true);
   latest.current.onUnavailable?.();
  });
  return ()=>{cancelled=true;live.current?.dispose();live.current=null;};
 },[]);
 // NO NUMBERS ON THE AXES. The ticks carried metre values, the only numerals left on the page, and
 // they landed on the net arrow, the chain and the potential column. The marks stay in the scene,
 // so the axes still read as rulers; the values can come back on the owner's word -- the layout
 // that placed them is `axisTickLabels`, still in orthoCamera and still tested.
 return <>
  <div className="cd-field-stage" aria-hidden="true" style={{clipPath:STAGE_CLIP}} {...runData(props.run,props.net)}>
   <div ref={host} className="cd-stage-gl"/>
  </div>
  {(failed||lost)&&!props.onUnavailable&&<output className="cd-stage-unavailable" style={{display:'block',position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',margin:0,padding:'.5em .9em',maxWidth:'80%',textAlign:'center',
   font:'500 14px/1.4 var(--font-ui),system-ui,sans-serif',color:'var(--muted-foreground,#4a6172)',background:'var(--diagram,#fff)',borderRadius:8,pointerEvents:'none',zIndex:2}}>
   {lost?'The 3D view was interrupted. It comes back when the browser restores it; the 2D view shows the same figure.':'The 3D view is not available on this device. The 2D view shows the same figure.'}
  </output>}
 </>;
}
/** What the scene has been asked to draw of the run, written on the stage itself.
 *
 * Read by the tests, and only by them: a browser on a build machine is not promised a WebGL
 * context, so they cannot count meshes, but they can read the plan the meshes are built from --
 * which is the thing that went wrong before, when the plan simply had no partner and no pieces
 * already added in it. Words and counts, nothing a reader sees. */
function runData(run:RunScene|null|undefined,net?:Vec|null):Record<string,string>{
 if(!run)return {};
 const count=(tone:string)=>String(run.tones.filter(t=>t===tone).length);
 const a=run.arrows,spans=keptSpans(a,net),arrows=a?[a.keep&&'keep',a.drop&&'drop',a.partner&&'partner',a.partnerDrop&&'partner-drop',spans.partner&&'partner-keep'].filter(Boolean).join(' '):'';
 // The parts along the axis as laid, as distances along the arrows' line from P: where each starts and ends.
 const u=a?.keep??a?.partnerSurvivor,ul=u?Math.hypot(u.x,u.y,u.z):0;
 const along=(v:Vec)=>ul>0?(v.x*u!.x+v.y*u!.y+v.z*u!.z)/ul:0;
 const span=(name:string,q:{from:Vec;along:Vec}|null)=>q?`${name} ${along(q.from).toFixed(5)} ${(along(q.from)+Math.hypot(q.along.x,q.along.y,q.along.z)).toFixed(5)}`:'';
 const end=run.chain?.[run.chain.length-1];
 return {
  'data-run-stage':run.stage,'data-run-cut':run.open>.004?'open':'closed',
  'data-run-pieces':String(run.pieces.length),'data-run-tones':run.tones.map(t=>t[0]).join(''),
  'data-run-lit':count('lit'),'data-run-added':count('added'),'data-run-dim':count('dim'),
  ...(run.partner?{'data-run-partner':run.partner.across?'across':'piece'}:{}),
  ...(run.seams.length?{'data-run-seams':String(run.seams.length)}:{}),
  ...(run.filled!==null?{'data-run-filled':'true'}:{}),
  ...(arrows?{'data-run-arrows':arrows}:{}),
  // Where they start, where that is not P: the tip of the sum, while a mirror pair goes into it.
  ...(a&&(a.from.x||a.from.y||a.from.z)?{'data-run-arrows-from':`${a.from.x} ${a.from.y} ${a.from.z}`}:{}),
  // How the dropped part is drawn: 'solid' where it survives, 'dashed' where a partner cancels it.
  ...(dropStyle(a)?{'data-run-drop':dropStyle(a)!}:{}),
  // While a mirror pair goes into the sum: how much of its parts along the axis the sum has taken in, and what is
  // left of them where the scene lays them (see `keptSpans`).
  ...(a?.pair?{'data-run-taken':a.taken.toFixed(4),'data-run-whole':a.whole.toFixed(4),'data-run-keep-span':[span('piece',spans.piece),span('partner',spans.partner)].filter(Boolean).join(';')}:{}),
  // How much of the charge is drawn as in the sum, and as lit, as shares of it (see `RunPart`).
  'data-run-added-span':run.spans.added.toFixed(5),'data-run-lit-span':run.spans.lit.toFixed(5),
  // The mirror piece's own arrow is a whole contribution, drawn solid; see `partnerMaterial`.
  ...(a?.partner?{'data-run-partner-style':'solid'}:{}),
  ...(run.chain&&end?{'data-run-chain':String(run.chain.length),'data-run-chain-end':`${end.x} ${end.y} ${end.z}`}:{}),
  // Whether the chain is drawn beside the net arrow rather than along it, inside its shaft.
  ...(run.chain&&run.chainBeside?{'data-run-chain-beside':'true'}:{}),
 };
}
