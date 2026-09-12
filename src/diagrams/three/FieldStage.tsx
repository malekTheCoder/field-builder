'use client';
import {useEffect,useRef} from 'react';
import type {ChargeSample} from '../../distributions/types';
import type {Vec} from '../../symbolic/physics';
import {axisTickLabels,cameraBasis,cameraPosition,frameTarget,frustum,projectPoint,tickStep} from './orthoCamera';
import {bodyReach,fadeOut,frameExtent,SHEET_FADE,surfaceOpacity,visibleRadii,wirePath,wireRadius,type BodyKind} from './bodies';
import {spaceGrid,spaceLines,type Layout} from '../field3d';
import {arrowLength} from '../vectorfield';
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
 /** The wire's own shape, sampled from the geometry rather than from the partition. A ring
  * is a ring however many pieces it has been cut into, and building the body from the
  * samples made a five-piece ring render as a fifteen-sided polygon. */
 bodyPath?:readonly Vec[];
 yaw:number; pitch:number;
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
};
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
export function FieldStage(props:FieldStageProps){
 const host=useRef<HTMLDivElement>(null),live=useRef<Live|null>(null),latest=useRef(props),ticksHost=useRef<HTMLDivElement>(null);
 useUncluttered(ticksHost,!props.animating);
 useEffect(()=>{latest.current=props;live.current?.update(props);});
 useEffect(()=>{
  const mount=host.current;
  if(!mount)return;
  let cancelled=false;
  void (async()=>{
   const [THREE,{mergeGeometries}]=await Promise.all([import('three'),import('three/examples/jsm/utils/BufferGeometryUtils.js')]);
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
   // The field: tubes for lines, one instanced mesh for arrows. Both lit, so they sit in the
   // same space as the body rather than floating over it like an overlay.
   // Per-vertex colour lets each line fade into the background as it leaves the picture,
   // instead of stopping dead at the frame edge.
   const lineMaterial=new THREE.MeshStandardMaterial({roughness:.6,metalness:0,transparent:true,opacity:.78,vertexColors:true,depthWrite:false});
   const arrowMaterial=new THREE.MeshStandardMaterial({roughness:.5,metalness:0,color:0xffffff});
   const body=new THREE.Group(),slices=new THREE.Group(),field=new THREE.Group(),marks=new THREE.Group();
   scene.add(body,slices,field,marks);
   // P is a small solid with a soft halo; the element is a brighter, thicker length of the
   // wire; each arrow is a shaft and a head that keep their proportions at any length.
   const pointMaterial=new THREE.MeshStandardMaterial({roughness:.35,metalness:.05});
   const haloMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.16,depthWrite:false});
   const elementMaterial=new THREE.MeshStandardMaterial({roughness:.4,metalness:.05,transparent:true,vertexColors:true,alphaTest:.012});
   const netMaterial=new THREE.MeshStandardMaterial({roughness:.45,metalness:.05});
   const partMaterial=new THREE.MeshStandardMaterial({roughness:.45,metalness:.05});
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
   const washer=(inner:number,outer:number,half:number,fade:{inner:number;outer:number}|null,frameWorld:number)=>{
    const ri=Math.max(1e-3,inner),ro=Math.max(ri+half*.6,outer),segments=128;
    // A band you can see across is drawn solid. A band wider than the picture is drawn as its
    // two edges with a tint between them, because painting it solid is a wash over everything
    // rather than a ring -- which is exactly what a sheet's outermost ring did to its lesson.
    const across=Math.min(1,(ro-ri)/Math.max(1e-6,frameWorld*.5));
    const faceAlpha=1-.86*across*across;
    const parts:[Geometry,number][]=[
     [new THREE.RingGeometry(ri,ro,segments,1).translate(0,0,half),faceAlpha],
     [new THREE.RingGeometry(ri,ro,segments,1).rotateX(Math.PI).translate(0,0,-half),faceAlpha],
     [new THREE.CylinderGeometry(ro,ro,half*2,segments,1,true).rotateX(Math.PI/2),1],
     [invert(new THREE.CylinderGeometry(ri,ri,half*2,segments,1,true).rotateX(Math.PI/2)),1],
    ];
    for(const [g,alpha] of parts)fadeGeometry(g,fade?.inner??0,fade?.outer??0,alpha);
    const merged=mergeGeometries(parts.map(([g])=>g));
    parts.forEach(([g])=>g.dispose());
    return merged??new THREE.BufferGeometry();
   };
   /** Alpha per vertex, so one material covers a solid element on a disk and a dissolving one
    * on a sheet. A sheet's rings run out past the picture; the outermost is enormous, and
    * painted flat it floods the frame with the charge's colour. It fades with its surface. */
   const fadeGeometry=(g:Geometry,inner:number,outer:number,base=1)=>{
    const position=g.getAttribute('position') as Attribute|undefined;
    if(!position)return g;
    const colours=new Float32Array(position.count*4);
    for(let i=0;i<position.count;i++){
     const a=outer>inner?fadeOut(Math.hypot(position.getX(i),position.getY(i)),inner,outer):1;
     colours[i*4]=1;colours[i*4+1]=1;colours[i*4+2]=1;colours[i*4+3]=a*base;
    }
    g.setAttribute('color',new THREE.BufferAttribute(colours,4));
    return g;
   };
   const buildElement=(e:NonNullable<FieldStageProps['element']>,radius:number,fade:{inner:number;outer:number}|null,frameWorld:number)=>{
    element.geometry.dispose();
    if('annulus' in e){
     element.geometry=washer(e.annulus.inner,e.annulus.outer,radius*.62,fade,frameWorld);
     return;
    }
    const points=e.path.map(v=>new THREE.Vector3(v.x,v.y,v.z));
    // A straight rod's element is two points, which CatmullRom cannot curve; a ring's is
    // thirteen along the real arc, so the piece bends exactly as the wire does.
    element.geometry=fadeGeometry(points.length>1
     ?new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal'),Math.max(8,points.length*2),radius,14,false)
     :new THREE.BufferGeometry(),0,0);
   };
   const arrow=(material:InstanceType<typeof THREE.MeshStandardMaterial>)=>{
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
    // Every fifth tick is the one that carries a number, so it is cut longer. The rest are the
    // metre marks between them.
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
   let bodyKey='',fieldKey='',sliceKey='',disposed=false;
   const cssColor=(name:string,fallback:number)=>{
    try{const v=getComputedStyle(mount).getPropertyValue(name).trim();if(/^#|^rgb|^hsl/.test(v))return new THREE.Color(v);}catch{/* unreadable: fall through to the fallback */}
    return new THREE.Color(fallback);
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
     return;
    }
    body.add(new THREE.Mesh(new THREE.CircleGeometry(1,128),bodyMaterial));
    body.add(new THREE.Line(unitCircle(),pickedMaterial));
   };
   const coarse=(samples:readonly ChargeSample[],limit:number)=>{const stride=Math.max(1,Math.ceil(samples.length/limit));return samples.filter((_,i)=>i%stride===0);};
   const buildField=(p:FieldStageProps,tint:InstanceType<typeof THREE.Color>,pale:InstanceType<typeof THREE.Color>,dark:boolean)=>{
    clearGroup(field);
    if(p.fieldView==='off'||!p.samples.length)return;
    const layout:Layout=p.kind==='wire'?'wire':'surface';
    // A surface's annuli are spread into rings of points before summing, so fewer of them.
    const few=coarse(p.samples,layout==='wire'?48:24);
    if(p.fieldView==='lines'){
     // Lines may RUN well past the drawing, but must not BEGIN past it: the sheet's charge is
     // mostly in its huge outer rings, so seeding as far as a line may travel put every line
     // off the picture.
     const lines=spaceLines(few,layout,16,{step:p.reach*.04,maxSteps:320,outerLimit:p.reach*3.2,seedLimit:p.reach*.9});
     const bg=new THREE.Color(dark?0x0f1a1c:0xffffff),near=tint.clone().lerp(pale,.3),vertex=new THREE.Vector3(),c=new THREE.Color();
     const tubes=lines.map(line=>{
      const curve=new THREE.CatmullRomCurve3(line.map(v=>new THREE.Vector3(v.x,v.y,v.z)),false,'centripetal');
      const tube=new THREE.TubeGeometry(curve,Math.min(180,line.length),.003+p.reach*.0028,5,false);
      // Fade with distance from the charge: strong near it, gone by the edge of the reach.
      const position=tube.getAttribute('position'),colours=new Float32Array(position.count*3);
      for(let i=0;i<position.count;i++){
       vertex.fromBufferAttribute(position,i);
       // Fading with distance says the field is weakening, which is true of every charge here
       // except the one whose entire lesson is that it does not: an infinite sheet's field is
       // the same however far away you stand. Fading its lines out would teach the opposite of
       // what the page says, so the sheet's keep their colour and the drawing's edge ends them.
       const far=p.kind==='sheet'?0:Math.min(1,Math.max(0,(vertex.length()-p.reach*.45)/(p.reach*1.1)));
       c.copy(near).lerp(bg,far*far);
       colours[i*3]=c.r;colours[i*3+1]=c.g;colours[i*3+2]=c.b;
      }
      tube.setAttribute('color',new THREE.BufferAttribute(colours,3));
      return tube;
     });
     if(!tubes.length)return;
     const merged=mergeGeometries(tubes);tubes.forEach(t=>t.dispose());
     if(merged)field.add(new THREE.Mesh(merged,lineMaterial));
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
    const positive=p.charge>=0;
    const shape=sampleKey(p);
    if(bodyKey!==shape){buildBody(p);bodyKey=shape;}
    const frameWorld=Math.max(f.right-f.left,f.top-f.bottom);
    const extent=frameExtent(p.reach,frameWorld);
    if(frameKey!==String(extent)){buildFrame(extent);frameKey=String(extent);}
    const spread=bodyReach(p.kind,p.radius,frameWorld);
    body.scale.setScalar(p.kind==='wire'?1:spread);
    // The sheet's fade is written into its mesh as fractions of the unit disk, so the world
    // radii the same ramp has to hit come back out of the scale it is drawn at.
    const fade=p.kind==='sheet'?{inner:spread*SHEET_FADE.inner,outer:spread*SHEET_FADE.outer}:null;
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
    const nextField=`${p.fieldView}:${shape}:${p.reach.toFixed(2)}:${positive}:${dark}`;
    if(fieldKey!==nextField){buildField(p,tint,pale,dark);fieldKey=nextField;}
    // The marks: cheap to place every frame, so they always sit on the live geometry.
    const wr=wireRadius(p.reach);
    point.position.set(p.point.x,p.point.y,p.point.z);point.scale.setScalar(wr*1.7);
    halo.position.copy(point.position);halo.scale.setScalar(wr*4.2);
    if(p.element){
     element.visible=true;
     const thick=wr*1.5;
     const key='annulus' in p.element
      ?`a:${p.element.annulus.inner.toFixed(4)}:${p.element.annulus.outer.toFixed(4)}:${thick.toFixed(4)}:${frameWorld.toFixed(2)}:${fade?`${fade.inner.toFixed(3)}-${fade.outer.toFixed(3)}`:'solid'}`
      :`p:${thick.toFixed(4)}:${p.element.path.map(v=>`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`).join(';')}`;
     if(elementKey!==key){buildElement(p.element,thick,fade,frameWorld);elementKey=key;}
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
    lineMaterial.emissive.copy(tint);lineMaterial.emissiveIntensity=dark?.4:.12;
    pointMaterial.color.copy(tint);pointMaterial.emissive.copy(tint);pointMaterial.emissiveIntensity=dark?.7:.3;
    haloMaterial.color.copy(tint);
    elementMaterial.color.set(0xb8460f);elementMaterial.emissive.set(0x5a2208);elementMaterial.emissiveIntensity=dark?.9:.45;
    netMaterial.color.copy(tint);netMaterial.emissive.copy(tint);netMaterial.emissiveIntensity=dark?.6:.25;
    partMaterial.color.copy(tint.clone().lerp(new THREE.Color(0xffffff),.25));partMaterial.emissive.copy(tint);partMaterial.emissiveIntensity=dark?.35:.12;
    axisMaterial.color.set(dark?0x9fb3c1:0x4a6172);gridMaterial.color.set(dark?0x9fb3c1:0x4a6172);
    renderer.render(scene,camera);
   };
   const observer=new ResizeObserver(()=>{if(!disposed)apply(latest.current);});
   observer.observe(mount);
   apply(latest.current);
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
   live.current={
    update:p=>{if(disposed)return;apply(p);wake();},
    dispose:()=>{
     disposed=true;cancelAnimationFrame(frameId);observer.disconnect();
     clearGroup(body);clearGroup(slices);clearGroup(field);arrowGeometry.dispose();
     for(const mesh of [point,halo,element,netArrow.shaft,netArrow.head,partArrow.shaft,partArrow.head])mesh.geometry.dispose();
     for(const m of [bodyMaterial,sheetMaterial,sliceMaterial,pickedMaterial,lineMaterial,arrowMaterial,axisMaterial,gridMaterial,pointMaterial,haloMaterial,elementMaterial,netMaterial,partMaterial])m.dispose();
     axes.geometry.dispose();grid.geometry.dispose();
     renderer.dispose();
     if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);
    },
   };
  })();
  return ()=>{cancelled=true;live.current?.dispose();live.current=null;};
 },[]);
 // The numbers on the axis ticks. They are laid out from the same projection the WebGL camera
 // is built from, so each one lands exactly on the tick it names at any camera angle -- and
 // they are written in the page rather than into the scene, because text drawn in WebGL is a
 // bitmap that blurs when the figure is scaled, ignores the theme, and turns edge-on with the
 // axis it belongs to. They are HTML rather than a second SVG on purpose: the figure's own
 // `<svg>` is what the rest of the app reaches for by tag name, and it must stay the first one.
 const frameWorld=Math.max(props.frame.width,props.frame.height)/Math.max(1e-6,props.unit);
 const at=projectPoint(props.point,props.origin,props.unit,props.yaw,props.pitch);
 const net=props.net,tip=net&&projectPoint({x:props.point.x+net.x,y:props.point.y+net.y,z:props.point.z+net.z},
  props.origin,props.unit,props.yaw,props.pitch);
 const ticks=axisTickLabels({extent:frameExtent(props.reach,frameWorld),origin:props.origin,frame:props.frame,
  unit:props.unit,yaw:props.yaw,pitch:props.pitch,
  // P with the letter under it, and the head of the net arrow with its Σ over it. Both ride
  // the z axis on a ring, a disk or a sheet, so a tick number lands on one of them whenever
  // the observation distance or the arrow's length happens to reach a round number.
  avoid:[{x:at.x,y:at.y+14,r:34},...(tip?[{x:tip.x,y:tip.y-10,r:30}]:[])]});
 return <div className="cd-field-stage" aria-hidden="true">
  <div ref={host} className="cd-stage-gl"/>
  <div ref={ticksHost} className="cd-stage-ticks">
   {ticks.map(t=><span key={t.key} className="cd-stage-tick"
    style={{left:`${100*t.x/props.frame.width}%`,top:`${100*t.y/props.frame.height}%`}}>{t.text}</span>)}
  </div>
 </div>;
}
/** Drop any number that has landed on something the figure already drew.
 *
 * The rules that place the numbers keep them off each other, off the origin and off P, and
 * that is the whole of what this layer can know on its own. The rest of the figure's writing
 * -- the axis letters, the dimension brackets, the drawn gesture legend -- belongs to the SVG
 * above, which lays its labels out against each other and nudges whichever ones collide. Where
 * those land is not predictable from here, so what is left over is measured instead: anything
 * still overlapping is simply not drawn. A number fewer costs the reader nothing; a number
 * written across an L costs them the L.
 *
 * A passive effect, because every layout effect in the figure has run by the time one does --
 * including that nudging pass, whose result is what has to be measured. */
function useUncluttered(host:{current:HTMLDivElement|null},still:boolean){
 const later=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  const cull=()=>{
   const root=host.current;
   if(!root)return;
   const numbers=[...root.children] as HTMLElement[];
   const svg=root.closest('.cd-stage')?.querySelector('svg');
   const hidden=new Set<HTMLElement>();
   if(svg){
    // A label the figure has faded out -- a dimension bracket in space, say -- still has a box,
    // and counting it as an obstacle would cull numbers around writing nobody can see. Opacity
    // is usually set on the group rather than the text, so a few levels up are checked too.
    const faded=(el:Element)=>{
     let node:Element|null=el;
     for(let depth=0;depth<4&&node;depth++){
      const style=getComputedStyle(node);
      if(style.visibility==='hidden'||!(Number(style.opacity)>.05))return true;
      node=node.parentElement;
     }
     return false;
    };
    const taken=[...svg.querySelectorAll('text,.cd-help-back')]
     .filter(el=>(el.textContent??'x').trim()!==''&&!faded(el))
     .map(el=>el.getBoundingClientRect()).filter(b=>b.width>0&&b.height>0);
    for(const n of numbers){
     const b=n.getBoundingClientRect();
     // Six pixels of air, not zero: two labels that merely miss each other still read as one
     // smudge, and the figure's own placer moves its labels a pixel or two after this runs.
     if(taken.some(t=>Math.min(b.right,t.right)-Math.max(b.left,t.left)>-6&&Math.min(b.bottom,t.bottom)-Math.max(b.top,t.top)>-6))hidden.add(n);
    }
   }
   for(const n of numbers){
    const want=hidden.has(n)?'hidden':'';
    if(n.style.visibility!==want)n.style.visibility=want;
   }
  };
  // Measured as soon as the view is still. Mid-gesture nobody is reading the numbers and the
  // pass costs a style and a layout flush -- about six milliseconds of it -- so while the
  // figure reports itself moving the pass is pushed to the trailing edge of the motion. That
  // is also what keeps the numbers honest if that report ever sticks on: a stuck flag then
  // delays the pass by a seventh of a second rather than cancelling it for good.
  if(still){cull();return;}
  if(later.current)clearTimeout(later.current);
  later.current=setTimeout(cull,140);
  return ()=>{if(later.current)clearTimeout(later.current);};
 });
}
