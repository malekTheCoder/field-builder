'use client';
import {useEffect,useRef} from 'react';
import type {ChargeSample} from '../../distributions/types';
import type {Vec} from '../../symbolic/physics';
import {cameraBasis,cameraPosition,frameTarget,frustum,tickStep} from './orthoCamera';
import {bodyReach,fadeOut,farAlpha,frameExtent,PIECE_FAR_LOW,SHEET_FADE,sheetFarFade,surfaceOpacity,visibleRadii,wirePath,wireRadius,type BodyKind,type FarFade} from './bodies';
import {spaceGrid,spaceLines,type Layout} from '../field3d';
import {coarsen} from '../sampling';
import {arrowLength,PLOT} from '../vectorfield';
import {SNAPSHOT_EVENT,type SnapshotDetail} from '../snapshot';
import {cutPiece,dropStyle,type RunScene} from './runScene';
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
 samples:readonly ChargeSample[]; selected:number;
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
 point:Vec; element:{path:Vec[]}|{annulus:{inner:number;outer:number}}|null;
 net:Vec|null; contribution:Vec|null;
 /** During an orbit the SVG moves from motion values without re-rendering, so reading yaw
  * and pitch from props would leave the body behind the drawing. While `animating`, the
  * stage reads the live view every frame instead. */
 animating?:boolean; getView?:()=>{yaw:number;pitch:number};
 /** "Watch it build", while it is open: what the scene draws of each stage. See `runScene`. */
 run?:RunScene|null;
};
/** The cuts are made in order along the charge, at the same pace as the flat figure's
 * `.cd-stage-pieces .cd-seam` animation, so a reader who flips between 2D and 3D sees one run. */
const CUT={spread:1.5,delay:.2,each:.42};
const CUT_MS=(CUT.spread+CUT.delay+CUT.each)*1000+60;
type Live={dispose:()=>void;update:(p:FieldStageProps)=>void};
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
 const a=p.samples[0]?.position,b=p.samples[p.samples.length-1]?.position;
 const at=(v?:{x:number;y:number;z:number})=>v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`:'-';
 return `${p.samples.length}:${at(a)}:${at(b)}`;
};
/** The window the SVG clips its own drawing to, as a clip on this layer: the WebGL scene is a
 * rectangle the size of the whole figure, and without it the sheet's plane, the ground grid and
 * the field lines painted over the rule and the caption under the picture and out to the card's
 * edges. In percentages of the 720 by 430 frame, which is the box this layer fills. */
const pct=(v:number,of:number)=>`${(100*v/of).toFixed(3)}%`;
export const STAGE_CLIP=`inset(${pct(PLOT.y,430)} ${pct(720-PLOT.x-PLOT.width,720)} ${pct(430-PLOT.y-PLOT.height,430)} ${pct(PLOT.x,720)} round ${pct(PLOT.radius,720)} / ${pct(PLOT.radius,430)})`;
export function FieldStage(props:FieldStageProps){
 const host=useRef<HTMLDivElement>(null),live=useRef<Live|null>(null),latest=useRef(props);
 useEffect(()=>{latest.current=props;live.current?.update(props);});
 useEffect(()=>{
  const mount=host.current;
  if(!mount)return;
  let cancelled=false;
  void (async()=>{
   const [THREE,{mergeGeometries},{LineSegments2},{LineSegmentsGeometry},{LineMaterial}]=await Promise.all([import('three'),import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    import('three/examples/jsm/lines/LineSegments2.js'),import('three/examples/jsm/lines/LineSegmentsGeometry.js'),import('three/examples/jsm/lines/LineMaterial.js')]);
   if(cancelled||!host.current)return;
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
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
   const bodyMaterial=new THREE.MeshStandardMaterial({roughness:.42,metalness:.06,side:THREE.DoubleSide});
   // A sheet is the same material with its alpha painted into the mesh, so it can dissolve
   // instead of ending. `alphaTest` matters as much as the fade does: without it the faded-out
   // rim still writes depth, and an invisible plate goes on hiding the field lines behind it.
   const sheetMaterial=new THREE.MeshStandardMaterial({roughness:.42,metalness:.06,side:THREE.DoubleSide,transparent:true,vertexColors:true,alphaTest:.012});
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
   const lineMaterial=new LineMaterial({color:0xffffff,linewidth:1.1,vertexColors:true,transparent:true,depthWrite:false,worldUnits:false});
   const arrowMaterial=new THREE.MeshStandardMaterial({roughness:.5,metalness:0,color:0xffffff,transparent:true});
   const body=new THREE.Group(),slices=new THREE.Group(),field=new THREE.Group(),marks=new THREE.Group();
   scene.add(body,slices,field,marks);
   // P is a small solid with a soft halo; the element is a brighter, thicker length of the
   // wire; each arrow is a shaft and a head that keep their proportions at any length.
   const pointMaterial=new THREE.MeshStandardMaterial({roughness:.35,metalness:.05});
   const haloMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.16,depthWrite:false});
   const elementMaterial=new THREE.MeshStandardMaterial({roughness:.4,metalness:.05,transparent:true,vertexColors:true,alphaTest:.012});
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
   field.renderOrder=1;slices.renderOrder=1;marks.renderOrder=2;
   let elementKey='';
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
    for(const [g,alpha] of parts)fadeGeometry(g,fade?.inner??0,fade?.outer??0,alpha,far);
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
   const fadeGeometry=(g:Geometry,inner:number,outer:number,base=1,far:FarFade|null=null,scale=1)=>{
    const position=g.getAttribute('position') as Attribute|undefined;
    if(!position)return g;
    const old=g.getAttribute('color') as Attribute|undefined,reuse=!!old&&old.itemSize===4&&old.count===position.count;
    const colours=reuse?old!.array as Float32Array:new Float32Array(position.count*4);
    for(let i=0;i<position.count;i++){
     const x=position.getX(i),y=position.getY(i);
     const a=(outer>inner?fadeOut(Math.hypot(x,y),inner,outer):1)*(far?farAlpha(y*scale,far):1);
     colours[i*4]=1;colours[i*4+1]=1;colours[i*4+2]=1;colours[i*4+3]=a*base;
    }
    if(reuse)old!.needsUpdate=true;else g.setAttribute('color',new THREE.BufferAttribute(colours,4));
    return g;
   };
   const buildElement=(e:NonNullable<FieldStageProps['element']>,radius:number,fade:{inner:number;outer:number}|null,frameWorld:number,far:FarFade|null=null)=>{
    element.geometry.dispose();
    if('annulus' in e){
     element.geometry=washer(e.annulus.inner,e.annulus.outer,radius*.62,fade,frameWorld,far);
     return;
    }
    const points=e.path.map(v=>new THREE.Vector3(v.x,v.y,v.z));
    // A straight rod's element is two points, which CatmullRom cannot curve; a ring's is
    // thirteen along the real arc, so the piece bends exactly as the wire does.
    element.geometry=fadeGeometry(points.length>1
     ?new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal'),Math.max(8,points.length*2),radius,14,false)
     :new THREE.BufferGeometry(),0,0);
   };
   const arrow=(material:InstanceType<typeof THREE.Material>)=>{
    const g=new THREE.Group(),shaft=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,10,1),material),head=new THREE.Mesh(new THREE.ConeGeometry(1,1,16),material);
    g.add(shaft,head);return {group:g,shaft,head};
   };
   const netArrow=arrow(netMaterial),partArrow=arrow(partMaterial);
   marks.add(point,halo,element,netArrow.group,partArrow.group);
   const Y=new THREE.Vector3(0,1,0),tmpQ=new THREE.Quaternion(),tmpV=new THREE.Vector3();
   /** Lay an arrow from `from` along `dir` for `length`, with a head that never outgrows it. */
   const layArrow=(a:ReturnType<typeof arrow>,from:Vec,dir:Vec,length:number,thick:number)=>{
    const l=Math.hypot(dir.x,dir.y,dir.z);
    if(!(length>1e-4)||l<1e-9){a.group.visible=false;return;}
    a.group.visible=true;
    const u=tmpV.set(dir.x/l,dir.y/l,dir.z/l);tmpQ.setFromUnitVectors(Y,u);
    const headLen=Math.min(length*.45,thick*4.2),shaftLen=Math.max(length-headLen,1e-4);
    a.shaft.quaternion.copy(tmpQ);a.shaft.scale.set(thick,shaftLen,thick);a.shaft.position.set(from.x+u.x*shaftLen/2,from.y+u.y*shaftLen/2,from.z+u.z*shaftLen/2);
    a.head.quaternion.copy(tmpQ);a.head.scale.set(thick*2.6,headLen,thick*2.6);a.head.position.set(from.x+u.x*(shaftLen+headLen/2),from.y+u.y*(shaftLen+headLen/2),from.z+u.z*(shaftLen+headLen/2));
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
   const tubes=(list:readonly {points:readonly Vec[];rgba:readonly number[]}[],radius:number,radial=10)=>{
    const pos:number[]=[],nor:number[]=[],col:number[]=[],idx:number[]=[];
    const t=new THREE.Vector3(),n=new THREE.Vector3(),b=new THREE.Vector3(),aside=new THREE.Vector3();
    const ring=(c:Vec,normal:{x:number;y:number;z:number}|null,rgba:readonly number[])=>{
     for(let j=0;j<radial;j++){
      const angle=2*Math.PI*j/radial,cs=Math.cos(angle),sn=Math.sin(angle);
      const dx=n.x*cs+b.x*sn,dy=n.y*cs+b.y*sn,dz=n.z*cs+b.z*sn;
      pos.push(c.x+dx*radius,c.y+dy*radius,c.z+dz*radius);
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
      if(i===0||i===m-1){
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
   const pieceMaterial=new THREE.MeshStandardMaterial({roughness:.42,metalness:.06,vertexColors:true});
   const ghostMaterial=new THREE.MeshStandardMaterial({roughness:.42,metalness:.06,vertexColors:true,transparent:true,depthWrite:false});
   const pieceSolid=new THREE.Mesh(new THREE.BufferGeometry(),pieceMaterial),pieceGhost=new THREE.Mesh(new THREE.BufferGeometry(),ghostMaterial);
   // The part of a surface already summed: a disc out to where the sum has reached, over the body.
   const fillMaterial=new THREE.MeshStandardMaterial({roughness:.5,metalness:0,side:THREE.DoubleSide,transparent:true,vertexColors:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
   const fill=new THREE.Mesh(new THREE.BufferGeometry(),fillMaterial);
   // A surface's cuts, as the circles it is cut along.
   // Coloured per vertex so the sheet's far cuts can dim with the sheet they are cut in.
   const cutMaterial=new THREE.LineBasicMaterial({transparent:true,vertexColors:true}),growMaterial=new THREE.LineBasicMaterial({transparent:true,vertexColors:true});
   const cuts=new THREE.Group();
   const runBodies=new THREE.Group();runBodies.add(pieceSolid,fill,cuts,pieceGhost);scene.add(runBodies);
   // The mirror partner: the same material and weight as the chosen piece it answers.
   const partnerBody=new THREE.Mesh(new THREE.BufferGeometry(),elementMaterial);
   // The parts of one piece's arrow. The part that survives is solid, like the arrow it came from;
   // the parts that go, and the partner's arrow, are dashed, as they are in the flat figure. The
   // two parts that cancel have their own material, because they fade as they shrink.
   const dashMaterial=new THREE.MeshBasicMaterial();
   const fadeMaterial=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false});
   const DASHES=64,dashGeometry=new THREE.CylinderGeometry(1,1,1,8,1),headGeometry=new THREE.ConeGeometry(1,1,14);
   const dashed=(material:InstanceType<typeof THREE.Material>)=>{
    const dashes=new THREE.InstancedMesh(dashGeometry,material,DASHES),head=new THREE.Mesh(headGeometry,material),group=new THREE.Group();
    // Instances move every frame of the cancellation; a bounding sphere cached from the first
    // frame would cull them wherever they had moved to.
    dashes.frustumCulled=false;dashes.count=0;group.add(dashes,head);group.visible=false;
    return {group,dashes,head};
   };
   // The dropped part with nothing to cancel it survives, and is drawn as the survivor it is: a
   // second solid arrow, as thick as the kept part, in the same ink. See `dropStyle`.
   const keepArrow=arrow(partMaterial),dropArrow=arrow(partMaterial),pairDropArrow=dashed(fadeMaterial),partnerArrow=dashed(dashMaterial),partnerDropArrow=dashed(fadeMaterial);
   const dashM=new THREE.Matrix4(),dashP=new THREE.Vector3(),dashS=new THREE.Vector3();
   /** A dashed arrow: dashes along the shaft and a solid head, so it is plainly an arrow and
    * plainly not one of the solid ones. */
   const layDashed=(a:ReturnType<typeof dashed>,from:Vec,dir:Vec|null,thick:number)=>{
    const length=dir?Math.hypot(dir.x,dir.y,dir.z):0;
    if(!dir||!(length>1e-4)){a.group.visible=false;return;}
    a.group.visible=true;
    const u=tmpV.set(dir.x/length,dir.y/length,dir.z/length);tmpQ.setFromUnitVectors(Y,u);
    const headLen=Math.min(length*.45,thick*4.6),shaftLen=Math.max(length-headLen,0);
    const dash=thick*4.2,period=dash+thick*3.4,count=Math.min(DASHES,Math.max(shaftLen>1e-4?1:0,Math.round((shaftLen+thick*3.4)/period)));
    for(let k=0;k<count;k++){
     const s0=shaftLen*k/count,s1=Math.min(shaftLen,s0+Math.min(dash,shaftLen/count)),mid=(s0+s1)/2;
     dashP.set(from.x+u.x*mid,from.y+u.y*mid,from.z+u.z*mid);dashS.set(thick,Math.max(1e-4,s1-s0),thick);
     dashM.compose(dashP,tmpQ,dashS);a.dashes.setMatrixAt(k,dashM);
    }
    a.dashes.count=count;a.dashes.instanceMatrix.needsUpdate=true;
    a.head.quaternion.copy(tmpQ);a.head.scale.set(thick*2.4,headLen,thick*2.4);
    a.head.position.set(from.x+u.x*(shaftLen+headLen/2),from.y+u.y*(shaftLen+headLen/2),from.z+u.z*(shaftLen+headLen/2));
   };
   // The chain: every piece's arrow laid tip to tail, as links, with a bead where each one joins.
   const LINKS=256,chainMaterial=new THREE.MeshBasicMaterial(),jointMaterial=new THREE.MeshStandardMaterial({roughness:.35,metalness:0});
   const chainLinks=new THREE.InstancedMesh(dashGeometry,chainMaterial,LINKS),chainJoints=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,10),jointMaterial,LINKS);
   chainLinks.frustumCulled=false;chainJoints.frustumCulled=false;chainLinks.count=0;chainJoints.count=0;
   marks.add(partnerBody,keepArrow.group,dropArrow.group,pairDropArrow.group,partnerArrow.group,partnerDropArrow.group,chainLinks,chainJoints);
   const linkA=new THREE.Vector3(),linkQ=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1);
   const layChain=(from:Vec,chain:readonly Vec[]|null,thick:number)=>{
    const links=chain?Math.min(LINKS,chain.length-1):0;
    let drawn=0;
    for(let k=0;k<links;k++){
     const a=chain![k],b=chain![k+1],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=Math.hypot(dx,dy,dz);
     if(l<1e-6)continue;
     linkQ.setFromUnitVectors(Y,linkA.set(dx/l,dy/l,dz/l));
     dashP.set(from.x+a.x+dx/2,from.y+a.y+dy/2,from.z+a.z+dz/2);dashS.set(thick,l,thick);
     dashM.compose(dashP,linkQ,dashS);chainLinks.setMatrixAt(drawn++,dashM);
    }
    chainLinks.count=drawn;chainLinks.instanceMatrix.needsUpdate=true;
    // Beads only while they can be told apart, as in the flat figure, which stops marking the joins
    // past sixty-five pieces: past that they are a bead necklace, not a chain of arrows.
    const beads=chain&&chain.length<=65?chain.length-1:0;
    for(let k=0;k<beads;k++){
     const c=chain![k+1];dashP.set(from.x+c.x,from.y+c.y,from.z+c.z);
     dashM.compose(dashP,linkQ.identity(),dashS.copy(one).multiplyScalar(thick*2.2));chainJoints.setMatrixAt(k,dashM);
    }
    chainJoints.count=beads;chainJoints.instanceMatrix.needsUpdate=true;
   };
   // A unit arrow along +y, from 0 to 1: shaft then head, merged so one instanced draw covers
   // the whole lattice.
   const shaft=new THREE.CylinderGeometry(.05,.05,.66,7);shaft.translate(0,.33,0);
   const head=new THREE.ConeGeometry(.17,.34,12);head.translate(0,.83,0);
   const arrowGeometry=mergeGeometries([shaft,head])!;shaft.dispose();head.dispose();
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
   scene.add(grid,axes);
   let frameKey='';
   const buildFrame=(extent:number)=>{
    // Both the axes and the grid are cut into short pieces and faded per vertex, so they run
    // out into the background instead of stopping at a square boundary the reader can see.
    // A line drawn end to end would take the fade as one straight interpolation and the whole
    // middle of the picture would dim with it.
    const a:number[]=[],ac:number[]=[],g:number[]=[],gc:number[]=[];
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
      push(a,ac,t*x-ux*tick,t*y-uy*tick,t*z-uz*tick,t*x+ux*tick,t*y+uy*tick,t*z+uz*tick);
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
    axes.geometry.dispose();grid.geometry.dispose();
    axes.geometry=new THREE.BufferGeometry()
     .setAttribute('position',new THREE.Float32BufferAttribute(a,3))
     .setAttribute('color',new THREE.Float32BufferAttribute(ac,4));
    grid.geometry=new THREE.BufferGeometry()
     .setAttribute('position',new THREE.Float32BufferAttribute(g,3))
     .setAttribute('color',new THREE.Float32BufferAttribute(gc,4));
   };
   let bodyKey='',fieldKey='',sliceKey='',tracedFrom='',sheetFarKey='',disposed=false;
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
     body.add(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.min(320,Math.max(64,points.length*2)),wireRadius(p.reach),14,p.closed),bodyMaterial));
     return;
    }
    // A disk and a sheet are both flat surfaces; only how they end differs. A disk stops at
    // its rim, and is given one. A sheet has no edge to draw, so it is drawn out past the
    // frame with its alpha ramping to nothing: forty rings of vertices, because the ramp is
    // carried by the mesh and a fan of one ring would interpolate it in straight lines.
    if(p.kind==='sheet'){
     body.add(new THREE.Mesh(fadeGeometry(new THREE.RingGeometry(0,1,128,40),SHEET_FADE.inner,SHEET_FADE.outer),sheetMaterial));
     sheetFarKey='';
     return;
    }
    body.add(new THREE.Mesh(new THREE.CircleGeometry(1,128),bodyMaterial));
    body.add(new THREE.Line(unitCircle(),pickedMaterial));
   };
   let builds=0;
   const buildField=(p:FieldStageProps,tint:InstanceType<typeof THREE.Color>,pale:InstanceType<typeof THREE.Color>,ink:InstanceType<typeof THREE.Color>,paper:InstanceType<typeof THREE.Color>)=>{
    clearGroup(field);
    // Counted where the tests can read it: a retrace is the costly thing, and how often one happens
    // does not depend on how fast the machine is.
    builds++;mount.parentElement?.setAttribute('data-field-builds',String(builds));
    if(p.fieldView==='off'||!p.samples.length)return;
    const layout:Layout=p.kind==='wire'?'wire':'surface';
    // A surface's annuli are each summed as a whole ring, about four point charges' arithmetic
    // apiece, so fewer of them.
    // No halving for surfaces any more. Each annulus used to be spread into sixteen point charges
    // before it could be summed, so a surface cost sixteen times a wire per element and its budget
    // was cut in half to pay for it. An annulus is one ring evaluation now, through elliptic
    // integrals, and the halving was left behind: it was holding the SHEET's spatial field at 72
    // elements against the flat view's 192. Measured on the sheet: 1.15% off the converged field
    // and leaning 0.49 degrees from the vertical it is supposed to be, against 0.26% and 0.09
    // degrees at the full budget -- for three milliseconds more on a trace that is rebuilt only
    // when the charge changes, never on a camera frame. The disk is unaffected either way:
    // its partition is the reader's own piece count, which coarsening never reaches.
    const few=coarsen(p.samples,p.detail??48);
    if(p.fieldView==='lines'){
     // Both limits come from the PICTURE, not from how far the charge happens to extend.
     //
     // A line was allowed to run to 3.2 reaches while the frame shows about one, so most of
     // every line was drawn outside the view and what crossed the frame was its middle -- long
     // sweeps entering one edge and leaving another, with no visible root on the charge. Ending
     // them a little past the frame keeps the part that is about this charge. Seeds stay inside
     // it for the separate reason that the sheet's charge is mostly in huge outer rings.
     // The step is the smaller of the picture and the charge, as the flat view already did. A
     // step set by the picture alone is far too coarse for a small charge inside a big frame:
     // on the disk it was 0.24 m for a radius of 2, twice the distance a line is launched from
     // the face, so the first chord of every line was taken before the line had cleared it.
     const span=Math.max(...few.map(c=>Math.hypot(c.position.x,c.position.y,c.position.z)),.5);
     const lines=spaceLines(few,layout,16,{step:Math.min(p.reach,span)*.04,maxSteps:420,outerLimit:p.reach*1.6,seedLimit:p.reach*.95});
     const vertex=new THREE.Vector3(),c=new THREE.Color(),positions:number[]=[],colours:number[]=[];
     for(const line of lines)for(let i=0;i+1<line.length;i++){
      const a=line[i],b=line[i+1];
      positions.push(a.x,a.y,a.z,b.x,b.y,b.z);
      for(const v of [a,b]){
       vertex.set(v.x,v.y,v.z);
       // Fade with distance from the charge: strong near it, gone by the edge of the reach.
       // Fading with distance says the field is weakening, which is true of every charge here
       // except the one whose entire lesson is that it does not: an infinite sheet's field is
       // the same however far away you stand. Fading its lines out would teach the opposite of
       // what the page says, so the sheet's keep their colour and the drawing's edge ends them.
       const far=p.kind==='sheet'?0:Math.min(1,Math.max(0,(vertex.length()-p.reach*.45)/(p.reach*1.1)));
       c.copy(ink).lerp(paper,far*far);
       colours.push(c.r,c.g,c.b);
      }
     }
     if(!positions.length)return;
     const hairlines=new LineSegments2(new LineSegmentsGeometry().setPositions(positions).setColors(colours),lineMaterial);
     // Every segment is an instance of one quad, which three cannot bound from the quad alone.
     hairlines.frustumCulled=false;
     field.add(hairlines);
     return;
    }
    const spacing=p.reach/3;
    const arrows=spaceGrid(few,p.reach,spacing,.14,undefined,layout);
    if(!arrows.length)return;
    const mesh=new THREE.InstancedMesh(arrowGeometry,arrowMaterial,arrows.length);
    const m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),pos=new THREE.Vector3(),dir=new THREE.Vector3(),scl=new THREE.Vector3(),colour=new THREE.Color();
    arrows.forEach((a,i)=>{
     const length=arrowLength(a.weight,spacing),thick=spacing*.11;
     dir.set(a.dir.x,a.dir.y,a.dir.z);
     pos.set(a.at.x-a.dir.x*length/2,a.at.y-a.dir.y*length/2,a.at.z-a.dir.z*length/2);
     q.setFromUnitVectors(up,dir);scl.set(thick,length,thick);
     m.compose(pos,q,scl);mesh.setMatrixAt(i,m);
     // Weight reads twice, as length and as colour, so a strong arrow is unmistakable even
     // where the lattice is dense.
     colour.copy(pale).lerp(tint,a.weight);mesh.setColorAt(i,colour);
    });
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    field.add(mesh);
   };
   // When the first stage began, so its cuts can be made one after another rather than all at once.
   // Restarted whenever the run comes back to that stage, as the flat figure's animation is.
   let cutStart=-Infinity,runStage='',piecesKey='',partnerKey='',cutsKey='',fillKey='';
   const reducedMotion=()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
   /** How far the cut a fraction `t` along the charge has opened, 0 to 1. Reduced motion makes
    * every cut at once, as the flat figure does: the cuts are the argument, the stagger is not. */
   const cutShown=(t:number,now:number)=>{
    if(runStage!=='pieces')return 1;
    const k=Math.max(0,Math.min(1,((now-cutStart)/1000-(t*CUT.spread+CUT.delay))/CUT.each));
    return 1-(1-k)**3;
   };
   const cutting=()=>runStage==='pieces'&&performance.now()-cutStart<CUT_MS;
   const quantise=(v:number,steps=40)=>Math.round(v*steps)/steps;
   const toneColour=(tone:string,positive:boolean)=>new THREE.Color(tone==='added'?(positive?0xd9834b:0x4b9bd9):(positive?0xf0975c:0x5cb8f0));
   const applyRun=(p:FieldStageProps,wr:number,positive:boolean,dark:boolean,spread:number,thick:number,far:FarFade|null,yaw:number)=>{
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
    const cutOf=(i:number,path:readonly Vec[])=>{const e=ends(i);return cutPiece(path,e.head,e.tail,midWidth);};
    const opened=wire&&run!.open>.004;
    // A cut wire is drawn as its pieces, not as one body with marks on it.
    body.visible=!opened;
    const signature=(v:Vec|undefined)=>v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`:'-';
    const nextPieces=opened?`${n}:${run!.tones.join('')}:${Array.from({length:n},(_,i)=>{const e=ends(i);return `${(e.head/step).toFixed(0)},${(e.tail/step).toFixed(0)}`;}).join(';')}:${(midWidth/step).toFixed(0)}:${signature(pieceOf(0)?.[0])}:${signature(pieceOf(n-1)?.at(-1))}:${wr.toFixed(4)}:${positive}`:'';
    if(nextPieces!==piecesKey){
     piecesKey=nextPieces;
     const solid:{points:Vec[];rgba:number[]}[]=[],ghost:{points:Vec[];rgba:number[]}[]=[];
     if(opened)run!.tones.forEach((tone,i)=>{
      const path=pieceOf(i);
      if(!path)return;
      const c=toneColour(tone,positive),rgba=[c.r,c.g,c.b,tone==='dim'?.26:1];
      for(const points of cutOf(i,path))(tone==='dim'?ghost:solid).push({points,rgba});
     });
     pieceSolid.geometry.dispose();pieceGhost.geometry.dispose();
     pieceSolid.geometry=tubes(solid,wr,12);pieceGhost.geometry=tubes(ghost,wr*.97,12);
    }
    pieceSolid.visible=opened;pieceGhost.visible=opened;
    // The chosen piece, cut exactly as the others are: drawn whole it bridged its own two gaps and
    // looked longer than the pieces round it.
    const selectedPath=opened&&p.element&&'path' in p.element?pieceOf(run!.selected):null;
    if(selectedPath){
     const key=`r:${nextPieces}:${run!.selected}:${thick.toFixed(4)}`;
     if(elementKey!==key){
      element.geometry.dispose();
      element.geometry=tubes(cutOf(run!.selected,selectedPath).map(points=>({points,rgba:[1,1,1,1]})),thick,14);
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
    const nextCuts=seams.map(s=>`${s.radius.toFixed(4)}:${s.grow<1?'g':'c'}`).join(';')+farKey;
    if(nextCuts!==cutsKey){
     cutsKey=nextCuts;clearGroup(cuts);
     for(const s of seams){
      const radius=Math.max(.01,s.radius),circle=unitCircle(96),position=circle.getAttribute('position') as Attribute,rgba=new Float32Array(position.count*4);
      for(let i=0;i<position.count;i++){rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=1;rgba[i*4+3]=far?farAlpha(position.getY(i)*radius,far):1;}
      circle.setAttribute('color',new THREE.BufferAttribute(rgba,4));
      const loop=new THREE.Line(circle,s.grow<1?growMaterial:cutMaterial);
      loop.scale.setScalar(radius);loop.position.z=wr*.06;loop.userData.at=s.at;cuts.add(loop);
     }
    }
    // Each circle is drawn round as its cut is made, a knife going once round the surface.
    for(const loop of cuts.children)(loop as InstanceType<typeof THREE.Line>).geometry.setDrawRange(0,Math.ceil(97*cutShown(Number(loop.userData.at)||0,now)));
    const lineColour=positive?0xc2703a:0x3a7fc2;
    cutMaterial.color.set(lineColour);cutMaterial.opacity=.8*(run?.open??0);
    growMaterial.color.set(lineColour);growMaterial.opacity=.8*(run?.open??0)*(run?.split??0);
    // How far the sum has reached across a surface. A sheet's sum reaches past the picture, so its
    // shading dissolves exactly as the sheet under it does rather than ending at a hard rim.
    const filled=run&&!wire?run.filled:null;
    const reach=p.kind==='sheet'?spread:Math.max(.01,p.radius);
    const nextFill=filled!==null?`${p.kind}:${quantise(Math.min(filled,reach)/reach,400)}:${spread.toFixed(3)}:${positive}:${farKey}`:'';
    if(nextFill!==fillKey){
     fillKey=nextFill;fill.geometry.dispose();
     const r=Math.max(.001,Math.min(filled??0,reach));
     fill.geometry=filled===null?new THREE.BufferGeometry()
      :p.kind==='sheet'?fadeGeometry(new THREE.RingGeometry(0,r,128,24),SHEET_FADE.inner*spread,SHEET_FADE.outer*spread,.42,far)
      :fadeGeometry(new THREE.RingGeometry(0,r,128,4),0,0,.5);
    }
    fill.visible=filled!==null;fill.position.z=wr*.03;fill.rotation.z=far?yaw:0;
    fillMaterial.color.copy(toneColour('added',positive));
    for(const m of [pieceMaterial,ghostMaterial]){m.emissive.set(positive?0x3a1c08:0x08243a);m.emissiveIntensity=dark?.85:.35;}
    // The arrows at P, all at the figure's own scale.
    const arrows=run?.arrows??null,P=p.point,plus=(a:Vec,b:Vec):Vec=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
    if(arrows?.keep)layArrow(keepArrow,P,arrows.keep,Math.hypot(arrows.keep.x,arrows.keep.y,arrows.keep.z),wr*.62);else keepArrow.group.visible=false;
    // The dropped part: solid where it survives, dashed and fading where a partner cancels it.
    const drop=dropStyle(arrows);
    if(drop==='solid'&&arrows?.drop)layArrow(dropArrow,plus(P,arrows.dropFrom),arrows.drop,Math.hypot(arrows.drop.x,arrows.drop.y,arrows.drop.z),wr*.62);else dropArrow.group.visible=false;
    layDashed(pairDropArrow,plus(P,arrows?.dropFrom??P),drop==='dashed'?arrows!.drop:null,wr*.3);
    layDashed(partnerArrow,P,arrows?.partner??null,wr*.4);
    layDashed(partnerDropArrow,plus(P,arrows?.partnerKeep??P),arrows?.partnerDrop??null,wr*.3);
    // The pair that cancels fades as it shrinks, never quite to nothing until it is gone.
    fadeMaterial.opacity=Math.max(.12,1-(arrows?.cancelled??0));
    layChain(P,run?.chain??null,wr*.6);
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
    const eye=cameraPosition(view.yaw,view.pitch,120),up=cameraBasis(view.yaw,view.pitch).up;
    camera.position.set(target.x+eye.x,target.y+eye.y,target.z+eye.z);
    camera.up.set(up.x,up.y,up.z);
    camera.lookAt(target.x,target.y,target.z);
    camera.updateProjectionMatrix();
    // The theme lives on the document, not in props: one source of truth, and it stays
    // correct when the toggle flips without this component re-rendering.
    const dark=document.documentElement.classList.contains('dark');
    const tint=cssColor('--field',dark?0x5fd3c4:0x0b6b63),pale=tint.clone().lerp(new THREE.Color(dark?0x0f1a1c:0xffffff),.62);
    const paper=cssColor('--diagram',dark?0x172936:0xffffff);
    lineInk(tint);
    const positive=p.charge>=0;
    const shape=sampleKey(p);
    // A disk and a sheet are drawn at unit size and scaled, so how finely they are cut says
    // nothing about their body; it was rebuilt at every doubling of the limit regardless.
    const bodyShape=p.kind==='wire'?shape:`${p.kind}:${p.closed}`;
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
    const nextFar=far?`${(far.inner/spread).toFixed(3)}:${(far.outer/spread).toFixed(3)}`:'';
    if(sheet&&far&&nextFar!==sheetFarKey){fadeGeometry(sheet.geometry,SHEET_FADE.inner,SHEET_FADE.outer,1,far,spread);sheetFarKey=nextFar;}
    // Rebuild the rings only when the partition actually changes; scaling is free, geometry
    // is not, and this runs on every camera frame during an orbit.
    const radii=p.kind==='disk'?visibleRadii(p.samples,p.selected):[];
    const nextSlices=radii.length?`${radii.length}:${radii[radii.length-1].toFixed(4)}`:'none';
    if(sliceKey!==nextSlices){
     clearGroup(slices);sliceKey=nextSlices;
     for(const r of radii){const loop=new THREE.Line(unitCircle(96),sliceMaterial);loop.scale.setScalar(Math.max(.01,r));slices.add(loop);}
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
    const nextField=`${p.fieldView}:${p.kind}:${from}:${p.reach.toFixed(2)}:${positive}:${dark}:${inkSource}:${paper.getHexString()}`;
    if(fieldKey!==nextField){buildField(p,tint,pale,inkColour,paper);fieldKey=nextField;tracedFrom=from;}
    // The marks: cheap to place every frame, so they always sit on the live geometry.
    const wr=wireRadius(p.reach);
    point.position.set(p.point.x,p.point.y,p.point.z);point.scale.setScalar(wr*1.7);
    halo.position.copy(point.position);halo.scale.setScalar(wr*4.2);
    const thick=wr*1.5;
    // The run goes first: while it has the wire cut up, it builds the chosen piece itself.
    // The sheet's chosen ring dims on its far side with the sheet, though less: see PIECE_FAR_LOW.
    const pieceFar=far&&p.element&&'annulus' in p.element?{...far,low:PIECE_FAR_LOW}:null;
    element.rotation.z=pieceFar?view.yaw:0;
    if(applyRun(p,wr,positive,dark,spread,thick,far,view.yaw))element.visible=true;
    else if(p.element){
     element.visible=true;
     const key='annulus' in p.element
      ?`a:${p.element.annulus.inner.toFixed(4)}:${p.element.annulus.outer.toFixed(4)}:${thick.toFixed(4)}:${frameWorld.toFixed(2)}:${pieceFar?`${pieceFar.inner.toFixed(2)},${pieceFar.outer.toFixed(2)}`:''}`
      :`p:${thick.toFixed(4)}:${p.element.path.map(v=>`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`).join(';')}`;
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
    if(p.net)layArrow(netArrow,p.point,p.net,Math.hypot(p.net.x,p.net.y,p.net.z),wr*.75);else netArrow.group.visible=false;
    // One element's contribution is the field AT P due to that element, so it is laid from P.
    if(p.contribution)layArrow(partArrow,p.point,p.contribution,Math.hypot(p.contribution.x,p.contribution.y,p.contribution.z),wr*.55);else partArrow.group.visible=false;
    for(const m of [bodyMaterial,sheetMaterial]){
     m.color.set(positive?0xf0975c:0x5cb8f0);
     m.emissive.set(positive?0x3a1c08:0x08243a);
     m.emissiveIntensity=dark?.85:.35;
    }
    bodyMaterial.transparent=p.kind!=='wire';
    bodyMaterial.opacity=p.kind==='wire'?1:surfaceOpacity(p.kind);
    sheetMaterial.opacity=surfaceOpacity('sheet');
    sliceMaterial.color.set(positive?0xc2703a:0x3a7fc2);
    pickedMaterial.color.set(positive?0xf0975c:0x5cb8f0);
    // As wide as the flat figure's lines, which are 1.1 of its 720 units across: the same hairline
    // at any size the figure is drawn, and at any zoom, since the width is in pixels.
    lineMaterial.resolution.set(w,h);lineMaterial.linewidth=1.1*w/p.frame.width;
    // During the build the field is background to the one piece being explained, and at full
    // strength its lines drown the thin construction drawn over them.
    lineMaterial.opacity=inkAlpha*(p.quiet?.35:1);arrowMaterial.opacity=p.quiet?.2:1;
    pointMaterial.color.copy(tint);pointMaterial.emissive.copy(tint);pointMaterial.emissiveIntensity=dark?.7:.3;
    haloMaterial.color.copy(tint);
    elementMaterial.color.set(positive?0xc2703a:0x3a7fc2);elementMaterial.emissive.set(positive?0xc2703a:0x3a7fc2);elementMaterial.emissiveIntensity=dark?.34:.14;
    netMaterial.color.copy(tint);netMaterial.emissive.copy(tint);netMaterial.emissiveIntensity=dark?.6:.25;
    // The flat figure's contribution colour, which is what every label of one piece's arrow is set in.
    partMaterial.color.copy(cssColor('--contribution',dark?0x35a9a2:0x2f9089));
    mount.parentElement?.setAttribute('data-part-colour',`#${partMaterial.color.getHexString()}`);
    // The parts, the partner's arrow and the chain are all one piece's arrow or a sum of them, so
    // they wear its colour; the beads where the chain joins are pale, like the flat figure's.
    for(const m of [dashMaterial,fadeMaterial,chainMaterial])m.color.copy(partMaterial.color);
    jointMaterial.color.copy(partMaterial.color).lerp(new THREE.Color(dark?0x172936:0xffffff),.7);jointMaterial.emissive.copy(tint);jointMaterial.emissiveIntensity=dark?.25:.06;
    axisMaterial.color.set(dark?0x9fb3c1:0x4a6172);gridMaterial.color.set(dark?0x9fb3c1:0x4a6172);
    renderer.render(scene,camera);
   };
   const observer=new ResizeObserver(()=>{if(!disposed)apply(latest.current);});
   observer.observe(mount);
   apply(latest.current);
   // The offline copy: drawn now, in whatever theme the page has just been put in, and read in the
   // same task -- a WebGL buffer is not kept once it has gone to the screen -- then drawn again.
   const root=mount.parentElement;
   const snapshot=(ev:Event)=>{
    if(disposed)return;
    apply(latest.current);
    try{(ev as CustomEvent<SnapshotDetail>).detail.url=renderer.domElement.toDataURL('image/png');}catch{/* a lost context: the copy goes without the scene */}
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
    dispose:()=>{
     disposed=true;cancelAnimationFrame(frameId);cancelAnimationFrame(cutFrame);observer.disconnect();root?.removeEventListener(SNAPSHOT_EVENT,snapshot);
     clearGroup(body);clearGroup(slices);clearGroup(field);clearGroup(cuts);arrowGeometry.dispose();
     for(const mesh of [point,halo,element,netArrow.shaft,netArrow.head,partArrow.shaft,partArrow.head,keepArrow.shaft,keepArrow.head,dropArrow.shaft,dropArrow.head,pieceSolid,pieceGhost,fill,partnerBody,chainJoints])mesh.geometry.dispose();
     dashGeometry.dispose();headGeometry.dispose();
     for(const m of [bodyMaterial,sheetMaterial,sliceMaterial,pickedMaterial,lineMaterial,arrowMaterial,axisMaterial,gridMaterial,pointMaterial,haloMaterial,elementMaterial,netMaterial,partMaterial,
      pieceMaterial,ghostMaterial,fillMaterial,cutMaterial,growMaterial,dashMaterial,fadeMaterial,chainMaterial,jointMaterial])m.dispose();
     axes.geometry.dispose();grid.geometry.dispose();
     renderer.dispose();
     if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);
    },
   };
  })();
  return ()=>{cancelled=true;live.current?.dispose();live.current=null;};
 },[]);
 // NO NUMBERS ON THE AXES. The ticks carried metre values, the only numerals left on the page, and
 // they landed on the net arrow, the chain and the potential column. The marks stay in the scene,
 // so the axes still read as rulers; the values can come back on the owner's word -- the layout
 // that placed them is `axisTickLabels`, still in orthoCamera and still tested.
 return <div className="cd-field-stage" aria-hidden="true" style={{clipPath:STAGE_CLIP}} {...runData(props.run)}>
  <div ref={host} className="cd-stage-gl"/>
 </div>;
}
/** What the scene has been asked to draw of the run, written on the stage itself.
 *
 * Read by the tests, and only by them: a browser on a build machine is not promised a WebGL
 * context, so they cannot count meshes, but they can read the plan the meshes are built from --
 * which is the thing that went wrong before, when the plan simply had no partner and no pieces
 * already added in it. Words and counts, nothing a reader sees. */
function runData(run:RunScene|null|undefined):Record<string,string>{
 if(!run)return {};
 const count=(tone:string)=>String(run.tones.filter(t=>t===tone).length);
 const a=run.arrows,arrows=a?[a.keep&&'keep',a.drop&&'drop',a.partner&&'partner',a.partnerDrop&&'partner-drop'].filter(Boolean).join(' '):'';
 const end=run.chain?.[run.chain.length-1];
 return {
  'data-run-stage':run.stage,'data-run-cut':run.open>.004?'open':'closed',
  'data-run-pieces':String(run.pieces.length),'data-run-tones':run.tones.map(t=>t[0]).join(''),
  'data-run-lit':count('lit'),'data-run-added':count('added'),'data-run-dim':count('dim'),
  ...(run.partner?{'data-run-partner':run.partner.across?'across':'piece'}:{}),
  ...(run.seams.length?{'data-run-seams':String(run.seams.length)}:{}),
  ...(run.filled!==null?{'data-run-filled':'true'}:{}),
  ...(arrows?{'data-run-arrows':arrows}:{}),
  // How the dropped part is drawn: 'solid' where it survives, 'dashed' where a partner cancels it.
  ...(dropStyle(a)?{'data-run-drop':dropStyle(a)!}:{}),
  ...(run.chain&&end?{'data-run-chain':String(run.chain.length),'data-run-chain-end':`${end.x} ${end.y} ${end.z}`}:{}),
 };
}
