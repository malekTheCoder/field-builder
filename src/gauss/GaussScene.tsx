'use client';
import {useEffect, useRef} from 'react';
import {cameraBasis, cameraPosition, frameTarget, frustum} from '../diagrams/three/orthoCamera';
import {CHARGE} from '../diagrams/three/FieldStage';
import {add, dot, norm, scale, sub, surfacePoint, unit as unitV, v3, type V3} from './physics';
import {arrowLength, type Built, type Look} from './scene';
import type {GaussCase} from './types';
/* THE GAUSS FIGURE IN SPACE: the charge, the closed surface round it and every patch's arrows as real objects in
 * a WebGL scene, under the SVG that carries the names, the view cube and the controls (GaussFigure). Built on the
 * integral lessons' 3D infrastructure: three.js loaded on demand inside an effect (it touches `window` at import,
 * and only a figure in space needs it), an orthographic camera placed from the same yaw and pitch the SVG
 * projects with (orthoCamera.ts), so a name stays on the thing it names, and the charge in the same colour the
 * integral lessons' scene gives it, whatever its sign.
 *
 * The scene is rebuilt only when what it holds changes (the case, the sign, the surface's size); a moment of the
 * run only changes what is shown and how strongly (`look`), and is drawn on demand, never on a loop. */
export type SceneProps = {
  kase: GaussCase; built: Built; look: Look;
  yaw: number; pitch: number; unit: number; origin: {x: number; y: number};
  /** Told once that the scene cannot start here, so the figure can draw its cross-section instead. */
  onUnavailable: (why?: 'lost') => void;
};
const FRAME = {width: 720, height: 430};
type Live = {update: (p: SceneProps) => void; dispose: () => void};
/** Every colour the scene paints, read from the page's own tokens so the two themes agree with the SVG. */
function palette() {
  const css = getComputedStyle(document.documentElement), get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {field: get('--field', '#0b6b63'), ink: get('--foreground', '#171717'), ghost: get('--ghost', '#6d8492'), paper: get('--diagram', '#ffffff'), muted: get('--muted-foreground', '#5e5e5e')};
}
export function GaussScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null), live = useRef<Live | null>(null), latest = useRef(props);
  useEffect(() => { latest.current = props; live.current?.update(props); });
  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let cancelled = false, disposed = false;
    void (async () => {
      const THREE = await import('three');
      if (cancelled || !host.current) return;
      const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearAlpha(0);
      mount.appendChild(renderer.domElement);
      Object.assign(renderer.domElement.style, {width: '100%', height: '100%', display: 'block'});
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 400);
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(4, -6, 9); scene.add(key);
      // The charge is matte and keeps its colour from every side, as in the integral lessons' scene.
      const bodyMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .88, metalness: 0, transparent: true, opacity: .9});
      const sheetMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .9, metalness: 0, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false});
      const insideMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, emissive: CHARGE.glow, roughness: .7, metalness: 0, transparent: true, opacity: 1, side: THREE.DoubleSide});
      // A Gaussian surface is imaginary: a faint skin that tints what is behind it and never hides it.
      const skinMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .1, side: THREE.DoubleSide, depthWrite: false});
      const edgeMaterial = new THREE.LineBasicMaterial({transparent: true, opacity: .5});
      const litMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false});
      const zeroMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false});
      const fieldFront = new THREE.MeshBasicMaterial(), fieldBack = new THREE.MeshBasicMaterial({transparent: true, opacity: .38});
      const normalFront = new THREE.MeshBasicMaterial(), normalBack = new THREE.MeshBasicMaterial({transparent: true, opacity: .3});
      const pointMaterial = new THREE.MeshBasicMaterial();
      const shaft = new THREE.CylinderGeometry(1, 1, 1, 10); shaft.translate(0, .5, 0);
      const head = new THREE.ConeGeometry(1, 1, 16); head.translate(0, .5, 0);
      const Y = new THREE.Vector3(0, 1, 0);
      const charge = new THREE.Group(), inside = new THREE.Group(), skin = new THREE.Group(), tints = new THREE.Group(), arrows = new THREE.Group(), spokes = new THREE.Group(), marks = new THREE.Group();
      scene.add(charge, inside, skin, tints, arrows, spokes, marks);
      // Translucent layers after the solids, so the depth buffer decides what is in front.
      skin.renderOrder = 2; tints.renderOrder = 3;
      type Arrow = {group: InstanceType<typeof THREE.Group>; shaft: InstanceType<typeof THREE.Mesh>; head: InstanceType<typeof THREE.Mesh>};
      const arrow = (front: InstanceType<typeof THREE.Material>): Arrow => {
        const group = new THREE.Group(), s = new THREE.Mesh(shaft, front), h = new THREE.Mesh(head, front);
        group.add(s, h);
        return {group, shaft: s, head: h};
      };
      /** Lay an arrow from `from` along `dir`, `length` long, its thickness fixed in pixels. */
      let px = 1 / 60;
      const lay = (a: Arrow, from: V3, dir: V3, length: number, bold = 1) => {
        if (!(length > 1e-4) || !(norm(dir) > 0)) { a.group.visible = false; return; }
        a.group.visible = true;
        const hl = Math.min(length * .45, 12 * px * bold), hr = 4.6 * px * bold, sr = 1.5 * px * bold;
        a.shaft.scale.set(sr, Math.max(1e-4, length - hl), sr);
        a.head.scale.set(hr, hl, hr); a.head.position.set(0, length - hl, 0);
        a.group.position.set(from.x, from.y, from.z);
        a.group.quaternion.setFromUnitVectors(Y, new THREE.Vector3(dir.x, dir.y, dir.z).normalize());
      };
      const clear = (g: InstanceType<typeof THREE.Group>) => { for (const child of g.children.slice()) { g.remove(child); child.traverse(o => { const m = o as InstanceType<typeof THREE.Mesh>; if (m.isMesh && m.geometry !== shaft && m.geometry !== head) m.geometry.dispose(); }); } };
      /** A patch as a mesh, sampled from its own parameters so a curved patch is curved. */
      const patchGeometry = (b: Built, i: number, lift = 1.004) => {
        const p = b.patches[i], [u0, u1, v0, v1] = p.uv, n = 6, pos: number[] = [], idx: number[] = [];
        for (let a = 0; a <= n; a++) for (let c = 0; c <= n; c++) {
          let q = surfacePoint(b.surface, p.part, u0 + (u1 - u0) * a / n, v0 + (v1 - v0) * c / n);
          // A hair off the skin, outward, so a tint is never fought over by the depth buffer.
          q = add(q, scale(p.normal, (lift - 1) * Math.max(b.surface.r, b.surface.h)));
          pos.push(q.x, q.y, q.z);
        }
        for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) { const k = a * (n + 1) + c; idx.push(k, k + 1, k + n + 2, k, k + n + 2, k + n + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
        return g;
      };
      let built: Built | null = null, structure = '';
      const patchArrows: {e: Arrow; n: Arrow; tint: InstanceType<typeof THREE.Mesh>}[] = [], spokeArrows: Arrow[] = [];
      let P: InstanceType<typeof THREE.Mesh> | null = null, pArrow: Arrow | null = null, insideMesh: InstanceType<typeof THREE.Object3D> | null = null;
      const rebuild = (p: SceneProps) => {
        const b = p.built;
        built = b;
        for (const g of [charge, inside, skin, tints, arrows, spokes, marks]) clear(g);
        patchArrows.length = 0; spokeArrows.length = 0;
        const c = b.charge, g = b.surface, reach = b.half * 2.2;
        // THE CHARGE, as a body: a point, a ball, a shell, a line, a sheet or a slab.
        if (c.kind === 'point') charge.add(new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 16), bodyMaterial));
        if (c.kind === 'ball') charge.add(new THREE.Mesh(new THREE.SphereGeometry(c.size, 48, 32), bodyMaterial));
        if (c.kind === 'shell') charge.add(new THREE.Mesh(new THREE.SphereGeometry(c.size, 48, 32), sheetMaterial));
        if (c.kind === 'line') { const m = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, reach * 2, 16), bodyMaterial); m.rotation.x = Math.PI / 2; charge.add(m); }
        if (c.kind === 'sheet') charge.add(new THREE.Mesh(new THREE.PlaneGeometry(reach * 1.4, reach * 1.4), sheetMaterial));
        if (c.kind === 'slab') { const m = new THREE.Mesh(new THREE.BoxGeometry(reach * 1.4, reach * 1.4, 2 * c.size), sheetMaterial); charge.add(m); }
        // THE CHARGE INSIDE, lit at the right side: the part of the charge the surface encloses.
        insideMesh = null;
        if (c.kind === 'point') insideMesh = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 16), insideMaterial);
        if (c.kind === 'ball') insideMesh = new THREE.Mesh(new THREE.SphereGeometry(Math.min(c.size, g.r) * 1.01, 48, 32), insideMaterial);
        // A shell's charge is all on its surface: enclosed whole once the surface is outside it, and not at all before.
        if (c.kind === 'shell' && g.r > c.size) insideMesh = new THREE.Mesh(new THREE.SphereGeometry(c.size * 1.01, 48, 32), insideMaterial);
        if (c.kind === 'line') { const m = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 2 * g.h, 16), insideMaterial); m.rotation.x = Math.PI / 2; insideMesh = m; }
        if (c.kind === 'sheet' || c.kind === 'slab') insideMesh = new THREE.Mesh(c.kind === 'sheet' ? new THREE.CircleGeometry(g.r, 48) : new THREE.CylinderGeometry(g.r, g.r, 2 * Math.min(g.h, c.size), 48), insideMaterial);
        if (insideMesh) { if (c.kind === 'slab') insideMesh.rotation.x = Math.PI / 2; inside.add(insideMesh); }
        // THE SURFACE: a faint skin, and the cuts between its patches.
        const parts = [...new Set(b.patches.map(q => q.part))];
        const full = (part: typeof parts[number]) => {
          const ranges = b.patches.filter(q => q.part === part).map(q => q.uv);
          return [Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1])), Math.min(...ranges.map(r => r[2])), Math.max(...ranges.map(r => r[3]))] as const;
        };
        for (const part of parts) {
          const [u0, u1, v0, v1] = full(part), n = 40, pos: number[] = [], idx: number[] = [];
          for (let a = 0; a <= n; a++) for (let k = 0; k <= n; k++) { const q = surfacePoint(g, part, u0 + (u1 - u0) * a / n, v0 + (v1 - v0) * k / n); pos.push(q.x, q.y, q.z); }
          for (let a = 0; a < n; a++) for (let k = 0; k < n; k++) { const i = a * (n + 1) + k; idx.push(i, i + 1, i + n + 2, i, i + n + 2, i + n + 1); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
          skin.add(new THREE.Mesh(geo, skinMaterial));
        }
        const cuts: number[] = [];
        for (const q of b.patches) {
          const [u0, u1, v0, v1] = q.uv, m = 16;
          const edge = (f: (t: number) => V3) => { for (let k = 0; k < m; k++) { const a = f(k / m), c2 = f((k + 1) / m); cuts.push(a.x, a.y, a.z, c2.x, c2.y, c2.z); } };
          edge(t => surfacePoint(g, q.part, u0, v0 + (v1 - v0) * t)); edge(t => surfacePoint(g, q.part, u1, v0 + (v1 - v0) * t));
          edge(t => surfacePoint(g, q.part, u0 + (u1 - u0) * t, v0)); edge(t => surfacePoint(g, q.part, u0 + (u1 - u0) * t, v1));
        }
        const cutGeometry = new THREE.BufferGeometry(); cutGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cuts, 3));
        skin.add(new THREE.LineSegments(cutGeometry, edgeMaterial));
        // EACH PATCH: its tint, its field arrow and its outward normal, dA.
        b.patches.forEach((q, i) => {
          const tint = new THREE.Mesh(patchGeometry(b, i), q.zero ? zeroMaterial : litMaterial);
          tints.add(tint);
          const e = arrow(fieldFront), nA = arrow(normalFront);
          arrows.add(e.group, nA.group);
          patchArrows.push({e, n: nA, tint});
        });
        for (let i = 0; i < b.spokes.length; i++) { const s = arrow(fieldFront); spokes.add(s.group); spokeArrows.push(s); }
        P = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), pointMaterial); marks.add(P);
        pArrow = arrow(fieldFront); marks.add(pArrow.group);
      };
      const structureOf = (b: Built) => `${b.charge.kind}:${b.charge.sign}:${b.charge.size}:${b.surface.kind}:${b.surface.r.toFixed(4)}:${b.surface.h.toFixed(4)}`;
      let colours: string | null = null;
      const apply = (p: SceneProps) => {
        const w = mount.clientWidth, h = mount.clientHeight;
        if (w < 2 || h < 2) return;
        const size = renderer.getSize(new THREE.Vector2());
        if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
        const s = structureOf(p.built);
        if (s !== structure) { structure = s; rebuild(p); }
        const theme = document.documentElement.className;
        if (theme !== colours) {
          colours = theme;
          const c = palette();
          skinMaterial.color.set(c.ink); edgeMaterial.color.set(c.ink); litMaterial.color.set(c.field); zeroMaterial.color.set(c.ghost);
          fieldFront.color.set(c.field); fieldBack.color.set(c.field); normalFront.color.set(c.muted); normalBack.color.set(c.muted); pointMaterial.color.set(c.ink);
          edgeMaterial.opacity = document.documentElement.classList.contains('dark') ? .6 : .45;
        }
        const f = frustum(FRAME.width, FRAME.height, p.unit);
        camera.left = f.left; camera.right = f.right; camera.top = f.top; camera.bottom = f.bottom;
        const target = frameTarget(p.origin, FRAME, p.unit, p.yaw, p.pitch), basis = cameraBasis(p.yaw, p.pitch), eye = cameraPosition(p.yaw, p.pitch, 120);
        camera.position.set(target.x + eye.x, target.y + eye.y, target.z + eye.z);
        camera.up.set(basis.up.x, basis.up.y, basis.up.z);
        camera.lookAt(target.x, target.y, target.z);
        camera.updateProjectionMatrix();
        px = 1 / p.unit;
        const b = built!, look = p.look, toCamera = basis.forward;
        // The layers of the moment.
        skin.visible = look.surface > .01;
        skinMaterial.opacity = .05 * look.surface; edgeMaterial.opacity = (document.documentElement.classList.contains('dark') ? .6 : .45) * look.surface;
        inside.visible = look.enclosed > .01;
        insideMaterial.opacity = look.enclosed;
        const lit = look.sweep * b.patches.length;
        b.patches.forEach((q, i) => {
          const a = patchArrows[i];
          if (!a) return;
          // Facing the camera or away from it: the far side's arrows are drawn fainter, behind the skin.
          // Faint too while the run solves for P, so the answer's arrow stands out from the patches'.
          const front = dot(q.normal, toCamera) > -.05 && look.stage !== 'solve';
          a.e.shaft.material = a.e.head.material = front ? fieldFront : fieldBack;
          a.n.shaft.material = a.n.head.material = front ? normalFront : normalBack;
          // dA: the outward normal, set a little off the patch's centre so it never lies under the field's arrow.
          const off = scale(sub(q.corners[0], q.center), .32), base = add(q.center, off);
          lay(a.n, base, q.normal, .34 * look.surface * Math.min(1, b.half / 3.2) * (look.surface > .01 ? 1 : 0));
          // E: from the patch's centre, as long as the field is strong, once the run has reached this patch.
          const reached = i < lit;
          const e = q.field, len = arrowLength(p.kase, norm(e)) * Math.min(1, Math.max(0, lit - i));
          lay(a.e, q.center, unitV(e), reached ? len : 0);
          a.tint.visible = reached && (q.zero || (look.stage === 'left' && i >= lit - 1));
        });
        spokes.visible = look.spokes > .01;
        b.spokes.forEach((sp, i) => {
          const a = spokeArrows[i]; if (!a) return;
          const len = arrowLength(p.kase, norm(sp.field)) * .85 * look.spokes, d = unitV(sp.field);
          lay(a, sub(sp.at, scale(d, len / 2)), d, len);
        });
        // P, and the field there once the run has solved for it.
        if (P) { P.visible = look.solve > .01 || look.stage === null; P.scale.setScalar(4.2 * px); P.position.set(b.P.x, b.P.y, b.P.z); }
        // The answer: the field at P, drawn bold once the run has solved for it, and at rest.
        if (pArrow) { const len = arrowLength(p.kase, norm(b.fieldAtP)) * look.solve; lay(pArrow, b.P, unitV(b.fieldAtP), look.stage === 'solve' || look.stage === null ? len : 0, 1.8); }
        renderer.render(scene, camera);
      };
      const canvas = renderer.domElement;
      const onLost = (ev: Event) => { ev.preventDefault(); if (!disposed) latest.current.onUnavailable('lost'); };
      canvas.addEventListener('webglcontextlost', onLost);
      const observer = new ResizeObserver(() => { if (!disposed) apply(latest.current); });
      observer.observe(mount);
      const themeWatch = new MutationObserver(() => { if (!disposed) apply(latest.current); });
      themeWatch.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
      apply(latest.current);
      mount.parentElement?.setAttribute('data-scene', 'ready');
      live.current = {
        update: p => { if (!disposed) apply(p); },
        dispose: () => {
          disposed = true; canvas.removeEventListener('webglcontextlost', onLost); observer.disconnect(); themeWatch.disconnect();
          for (const g of [charge, inside, skin, tints, arrows, spokes, marks]) clear(g);
          shaft.dispose(); head.dispose();
          for (const m of [bodyMaterial, sheetMaterial, insideMaterial, skinMaterial, edgeMaterial, litMaterial, zeroMaterial, fieldFront, fieldBack, normalFront, normalBack, pointMaterial]) m.dispose();
          renderer.dispose();
          if (canvas.parentNode === mount) mount.removeChild(canvas);
        },
      };
    })().catch(() => {
      if (cancelled) return;
      try { live.current?.dispose(); } catch { /* half built: nothing more to free */ }
      live.current = null;
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      latest.current.onUnavailable();
    });
    return () => { cancelled = true; live.current?.dispose(); live.current = null; };
  }, []);
  return <div className="cd-field-stage gs-scene" aria-hidden="true"><div ref={host} className="cd-stage-gl" /></div>;
}
export const _sceneVectors = {v3};
