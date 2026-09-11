'use client';
import {useEffect,useRef} from 'react';
import type {ChargeSample} from '../../distributions/types';
import {cameraBasis,cameraPosition,frameTarget,frustum} from './orthoCamera';
import {bodyReach,surfaceOpacity,visibleRadii,type BodyKind} from './bodies';
/** The 3D half of the figure: the charge as a real body with depth, under the SVG that
 * carries every label and every control.
 *
 * Three.js is loaded on demand, inside an effect, for two reasons. It touches `window` at
 * import time, so a static import breaks server rendering; and only the three perspective
 * lessons need it, so the other twelve should not pay for it.
 *
 * The camera is built from the same yaw and pitch the SVG projects with, through a basis a
 * test pins against `projectCamera`. That is what keeps a label on the thing it labels. */
export type FieldStageProps={
/** Which body to build, its radius in world metres, and the observation height. */
 kind:BodyKind; radius:number; distance:number;
 /** The partition, so a disk can show the rings it is a stack of. */
 samples:readonly ChargeSample[]; selected:number;
 yaw:number; pitch:number;
 /** Pixels per world unit, and the viewBox the SVG above is drawn in. */
 unit:number; frame:{width:number;height:number};
 /** Where the SVG puts the world origin in viewBox units; the 3D body must agree. */
 origin:{x:number;y:number};
 /** Charge sign drives the colour: the same orange the SVG uses, cooling when negative. */
 charge:number;
 /** During an orbit the SVG moves from motion values without re-rendering, so reading yaw
  * and pitch from props would leave the body behind the drawing. While `animating`, the
  * stage reads the live view every frame instead. */
 animating?:boolean; getView?:()=>{yaw:number;pitch:number};
};
type Live={dispose:()=>void;update:(p:FieldStageProps)=>void};
export function FieldStage(props:FieldStageProps){
 const host=useRef<HTMLDivElement>(null),live=useRef<Live|null>(null),latest=useRef(props);
 useEffect(()=>{latest.current=props;live.current?.update(props);});
 useEffect(()=>{
  const mount=host.current;
  if(!mount)return;
  let cancelled=false;
  void (async()=>{
   const THREE=await import('three');
   if(cancelled||!host.current)return;
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
   renderer.setClearAlpha(0);
   mount.appendChild(renderer.domElement);
   renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.style.display='block';
   const scene=new THREE.Scene();
   const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,400);
   // Soft three-point lighting. A charged ring has no real material, so the goal is only
   // to make its curvature and its near and far halves readable, not to look photographic.
   scene.add(new THREE.AmbientLight(0xffffff,1.35));
   const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(4,6,9);scene.add(key);
   const rim=new THREE.DirectionalLight(0x9ad8ff,.85);rim.position.set(-6,-3,-4);scene.add(rim);
   // One material for the charged body, one for the rings a surface is built from. The
   // surfaces are translucent so the construction lines behind them stay readable: the old
   // disk was drawn near-opaque and read as a hole punched in the page.
   const bodyMaterial=new THREE.MeshStandardMaterial({roughness:.42,metalness:.06,side:THREE.DoubleSide});
   const sliceMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:.5});
   const pickedMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:1});
   const body=new THREE.Group();scene.add(body);
   const slices=new THREE.Group();scene.add(slices);
   let builtFor:BodyKind|null=null;
   const unitCircle=(segments=128)=>new THREE.BufferGeometry().setFromPoints(
    Array.from({length:segments+1},(_,i)=>{const t=2*Math.PI*i/segments;return new THREE.Vector3(Math.cos(t),Math.sin(t),0);}));
   const clearGroup=(group:InstanceType<typeof THREE.Group>)=>{
    while(group.children.length){
     const child=group.children[group.children.length-1];
     group.remove(child);
     (child as {geometry?:{dispose:()=>void}}).geometry?.dispose();
    }
   };
   const buildBody=(kind:BodyKind)=>{
    clearGroup(body);builtFor=kind;
    if(kind==='ring'){body.add(new THREE.Mesh(new THREE.TorusGeometry(1,.055,20,220),bodyMaterial));return;}
    // A disk and a sheet are both flat surfaces; only how far they reach differs, and a
    // sheet gets no rim because it has no edge.
    body.add(new THREE.Mesh(new THREE.CircleGeometry(1,128),bodyMaterial));
    if(kind==='disk')body.add(new THREE.Line(unitCircle(),pickedMaterial));
   };
   // The axis the field is measured along, drawn faintly so the SVG's own axis reads on top.
   const axisMaterial=new THREE.LineBasicMaterial({transparent:true,opacity:.55});
   const axis=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-6),new THREE.Vector3(0,0,6)]),axisMaterial);
   scene.add(axis);
   let disposed=false;
   const apply=(p:FieldStageProps)=>{
    const rect=mount.getBoundingClientRect();
    if(rect.width<2||rect.height<2)return;
    renderer.setSize(rect.width,rect.height,false);
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
    if(builtFor!==p.kind)buildBody(p.kind);
    const frameWorld=Math.max(f.right-f.left,f.top-f.bottom);
    body.scale.setScalar(bodyReach(p.kind,p.radius,frameWorld));
    // Rebuild the rings only when the partition actually changes; scaling is free, geometry
    // is not, and this runs on every camera frame during an orbit.
    const radii=p.kind==='disk'?visibleRadii(p.samples,p.selected):[];
    const key=radii.length?`${radii.length}:${radii[radii.length-1].toFixed(4)}`:'none';
    if(slices.userData.key!==key){
     clearGroup(slices);slices.userData.key=key;
     for(const r of radii){const loop=new THREE.Line(unitCircle(96),sliceMaterial);loop.scale.setScalar(Math.max(.01,r));slices.add(loop);}
    }
    const positive=p.charge>=0;
    bodyMaterial.color.set(positive?0xf0975c:0x5cb8f0);
    bodyMaterial.emissive.set(positive?0x3a1c08:0x08243a);
    bodyMaterial.transparent=p.kind!=='ring';
    bodyMaterial.opacity=p.kind==='ring'?1:surfaceOpacity(p.kind);
    sliceMaterial.color.set(positive?0xc2703a:0x3a7fc2);
    pickedMaterial.color.set(positive?0xf0975c:0x5cb8f0);
    // The theme lives on the document, not in props: one source of truth, and it stays
    // correct when the toggle flips without this component re-rendering.
    const dark=document.documentElement.classList.contains('dark');
    bodyMaterial.emissiveIntensity=dark?.85:.35;
    axisMaterial.color.set(dark?0x8ea4b4:0x52697a);
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
     clearGroup(body);clearGroup(slices);bodyMaterial.dispose();sliceMaterial.dispose();pickedMaterial.dispose();axis.geometry.dispose();axisMaterial.dispose();
     renderer.dispose();
     if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);
    },
   };
  })();
  return ()=>{cancelled=true;live.current?.dispose();live.current=null;};
 },[]);
 return <div ref={host} className="cd-field-stage" aria-hidden="true"/>;
}
