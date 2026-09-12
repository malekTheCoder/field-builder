'use client';
import {useEffect,useRef} from 'react';
import type {ChargeSample} from '../../distributions/types';
import type {Vec} from '../../symbolic/physics';
import {cameraBasis,cameraPosition,frameTarget,frustum} from './orthoCamera';
import {bodyReach,surfaceOpacity,visibleRadii,wirePath,wireRadius,type BodyKind} from './bodies';
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
 point:Vec; element:{position:Vec;along:Vec;length:number}|null;
 net:Vec|null; contribution:Vec|null;
 /** During an orbit the SVG moves from motion values without re-rendering, so reading yaw
  * and pitch from props would leave the body behind the drawing. While `animating`, the
  * stage reads the live view every frame instead. */
 animating?:boolean; getView?:()=>{yaw:number;pitch:number};
};
type Live={dispose:()=>void;update:(p:FieldStageProps)=>void};
const sampleKey=(p:FieldStageProps)=>{
 const a=p.samples[0]?.position,b=p.samples[p.samples.length-1]?.position;
 const at=(v?:{x:number;y:number;z:number})=>v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`:'-';
 return `${p.kind}:${p.closed}:${p.samples.length}:${at(a)}:${at(b)}:${p.radius.toFixed(3)}`;
};
export function FieldStage(props:FieldStageProps){
 const host=useRef<HTMLDivElement>(null),live=useRef<Live|null>(null),latest=useRef(props);
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
   const elementMaterial=new THREE.MeshStandardMaterial({roughness:.4,metalness:.05});
   const netMaterial=new THREE.MeshStandardMaterial({roughness:.45,metalness:.05});
   const partMaterial=new THREE.MeshStandardMaterial({roughness:.45,metalness:.05});
   const point=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),pointMaterial),halo=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),haloMaterial);
   const element=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,14,1),elementMaterial);
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
   const axisMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:.7});
   const gridMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:.13});
   const axes=new THREE.LineSegments(new THREE.BufferGeometry(),axisMaterial),grid=new THREE.LineSegments(new THREE.BufferGeometry(),gridMaterial);
   scene.add(grid,axes);
   let frameKey='';
   const buildFrame=(extent:number)=>{
    const a:number[]=[],g:number[]=[],tick=.07;
    for(const [x,y,z] of [[1,0,0],[0,1,0],[0,0,1]] as const){
     a.push(-extent*x,-extent*y,-extent*z,extent*x,extent*y,extent*z);
     for(let t=-Math.floor(extent);t<=Math.floor(extent);t++){if(t===0)continue;
      // a tick lies across the axis, in the plane of the grid where it can
      const [ux,uy,uz]=z?[1,0,0]:[0,0,1];
      a.push(t*x-ux*tick,t*y-uy*tick,t*z-uz*tick,t*x+ux*tick,t*y+uy*tick,t*z+uz*tick);}
    }
    for(let t=-Math.floor(extent);t<=Math.floor(extent);t++){g.push(t,-extent,0,t,extent,0,-extent,t,0,extent,t,0);}
    axes.geometry.dispose();grid.geometry.dispose();
    axes.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(a,3));
    grid.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(g,3));
   };
   let bodyKey='',fieldKey='',sliceKey='',disposed=false;
   const cssColor=(name:string,fallback:number)=>{
    try{const v=getComputedStyle(mount).getPropertyValue(name).trim();if(/^#|^rgb|^hsl/.test(v))return new THREE.Color(v);}catch{/* unreadable: fall through to the fallback */}
    return new THREE.Color(fallback);
   };
   const buildBody=(p:FieldStageProps)=>{
    clearGroup(body);
    if(p.kind==='wire'){
     const points=wirePath(p.samples).map(v=>new THREE.Vector3(v.x,v.y,v.z));
     if(points.length<2)return;
     const curve=new THREE.CatmullRomCurve3(points,p.closed,'centripetal');
     body.add(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.min(240,points.length*3),wireRadius(p.reach),12,p.closed),bodyMaterial));
     return;
    }
    // A disk and a sheet are both flat surfaces; only how far they reach differs, and a
    // sheet gets no rim because it has no edge.
    body.add(new THREE.Mesh(new THREE.CircleGeometry(1,128),bodyMaterial));
    if(p.kind==='disk')body.add(new THREE.Line(unitCircle(),pickedMaterial));
   };
   const coarse=(samples:readonly ChargeSample[],limit:number)=>{const stride=Math.max(1,Math.ceil(samples.length/limit));return samples.filter((_,i)=>i%stride===0);};
   const buildField=(p:FieldStageProps,tint:InstanceType<typeof THREE.Color>,pale:InstanceType<typeof THREE.Color>,dark:boolean)=>{
    clearGroup(field);
    if(p.fieldView==='off'||!p.samples.length)return;
    const layout:Layout=p.kind==='wire'?'wire':'surface';
    // A surface's annuli are spread into rings of points before summing, so fewer of them.
    const few=coarse(p.samples,layout==='wire'?48:24);
    if(p.fieldView==='lines'){
     const lines=spaceLines(few,layout,16,{step:p.reach*.04,maxSteps:320,outerLimit:p.reach*3.2});
     const bg=new THREE.Color(dark?0x0f1a1c:0xffffff),near=tint.clone().lerp(pale,.3),vertex=new THREE.Vector3(),c=new THREE.Color();
     const tubes=lines.map(line=>{
      const curve=new THREE.CatmullRomCurve3(line.map(v=>new THREE.Vector3(v.x,v.y,v.z)),false,'centripetal');
      const tube=new THREE.TubeGeometry(curve,Math.min(180,line.length),.003+p.reach*.0028,5,false);
      // Fade with distance from the charge: strong near it, gone by the edge of the reach.
      const position=tube.getAttribute('position'),colours=new Float32Array(position.count*3);
      for(let i=0;i<position.count;i++){
       vertex.fromBufferAttribute(position,i);
       const far=Math.min(1,Math.max(0,(vertex.length()-p.reach*.45)/(p.reach*1.1)));
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
    const extent=Math.ceil(Math.max(p.reach*1.15,frameWorld*.6,3));
    if(frameKey!==String(extent)){buildFrame(extent);frameKey=String(extent);}
    body.scale.setScalar(p.kind==='wire'?1:bodyReach(p.kind,p.radius,frameWorld));
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
    if(p.element&&p.kind==='wire'){
     element.visible=true;
     const e=p.element,al=Math.hypot(e.along.x,e.along.y,e.along.z)||1;
     tmpQ.setFromUnitVectors(Y,tmpV.set(e.along.x/al,e.along.y/al,e.along.z/al));
     element.quaternion.copy(tmpQ);element.scale.set(wr*1.45,Math.max(e.length,wr*2),wr*1.45);element.position.set(e.position.x,e.position.y,e.position.z);
    }else element.visible=false;
    if(p.net)layArrow(netArrow,p.point,p.net,Math.hypot(p.net.x,p.net.y,p.net.z),wr*.75);else netArrow.group.visible=false;
    // One element's contribution is the field AT P due to that element, so it is laid from P.
    if(p.contribution)layArrow(partArrow,p.point,p.contribution,Math.hypot(p.contribution.x,p.contribution.y,p.contribution.z),wr*.55);else partArrow.group.visible=false;
    bodyMaterial.color.set(positive?0xf0975c:0x5cb8f0);
    bodyMaterial.emissive.set(positive?0x3a1c08:0x08243a);
    bodyMaterial.transparent=p.kind!=='wire';
    bodyMaterial.opacity=p.kind==='wire'?1:surfaceOpacity(p.kind);
    bodyMaterial.emissiveIntensity=dark?.85:.35;
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
   let frameId=0;
   const follow=()=>{if(disposed)return;if(latest.current.animating){apply(latest.current);frameId=requestAnimationFrame(follow);}else frameId=0;};
   const wake=()=>{if(!disposed&&!frameId&&latest.current.animating)frameId=requestAnimationFrame(follow);};
   live.current={
    update:p=>{if(disposed)return;apply(p);wake();},
    dispose:()=>{
     disposed=true;cancelAnimationFrame(frameId);observer.disconnect();
     clearGroup(body);clearGroup(slices);clearGroup(field);arrowGeometry.dispose();
     for(const mesh of [point,halo,element,netArrow.shaft,netArrow.head,partArrow.shaft,partArrow.head])mesh.geometry.dispose();
     for(const m of [bodyMaterial,sliceMaterial,pickedMaterial,lineMaterial,arrowMaterial,axisMaterial,gridMaterial,pointMaterial,haloMaterial,elementMaterial,netMaterial,partMaterial])m.dispose();
     axes.geometry.dispose();grid.geometry.dispose();
     renderer.dispose();
     if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);
    },
   };
  })();
  return ()=>{cancelled=true;live.current?.dispose();live.current=null;};
 },[]);
 return <div ref={host} className="cd-field-stage" aria-hidden="true"/>;
}
