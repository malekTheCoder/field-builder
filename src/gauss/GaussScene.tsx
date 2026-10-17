'use client';
import {useEffect, useRef} from 'react';
import {cameraBasis, cameraPosition, frameTarget, frustum} from '../diagrams/three/orthoCamera';
import {CHARGE} from '../diagrams/three/FieldStage';
import {add, dot, isBall, norm, scale, sub, surfacePoint, unit as unitV, v3, type V3} from './physics';
import {arrowEnds, chainOf, POINT_PX, surfaceOfPiece, type Built, type Look} from './scene';
import type {GaussCase} from './types';
import {densityFace, isGradedBall, type GradedBall} from './densityFace';
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
  return {contribution: get('--contribution', '#2f9089'), field: get('--field', '#0b6b63'), ink: get('--foreground', '#171717'), ghost: get('--ghost', '#6d8492'), paper: get('--diagram', '#ffffff'), muted: get('--muted-foreground', '#5e5e5e')};
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
      const densityMaterial = new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.DoubleSide});
      const densityFaces: {geometry: InstanceType<typeof THREE.BufferGeometry>; weights: number[]}[] = [];
      const cutMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .9, metalness: 0, transparent: true, opacity: .24, depthWrite: false});
      const sheetMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .9, metalness: 0, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false});
      const shellMaterial = new THREE.MeshLambertMaterial({color: CHARGE.body, transparent: true, opacity: .26, side: THREE.DoubleSide, depthWrite: false});
      const insideMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, emissive: CHARGE.glow, roughness: .7, metalness: 0, transparent: true, opacity: 1, side: THREE.DoubleSide});
      // A surface charge lit stays a skin: see-through, so a lit shell never looks like the solid ball beside it.
      const skinLitMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, emissive: CHARGE.glow, roughness: .7, metalness: 0, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false});
      // A charge of the opposite sign (a cable's outer shell, the −σ plate, the −q a hollow's wall takes, a slab's
      // lower half) is drawn as an open mesh, lit or not, so two charges of one colour are still told apart.
      const oppositeMaterial = new THREE.LineBasicMaterial({color: CHARGE.body, transparent: true, opacity: .62, depthWrite: false});
      const oppositeLitMaterial = new THREE.LineBasicMaterial({color: CHARGE.glow, transparent: true, opacity: 1, depthWrite: false});
      // A solid cylinder of charge: denser than a shell's skin, still clear enough to see a surface inside it.
      const rodMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .9, metalness: 0, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false});
      // Metal is neutral inside, so it is grey, not the charge's colour; its charge is a skin on its surfaces.
      const metalMaterial = new THREE.MeshStandardMaterial({roughness: .45, metalness: .25, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false});
      // A hole is empty: the paper's colour over the charge round it, so it reads as a gap, never as more charge.
      const holeMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .62, side: THREE.BackSide, depthWrite: false});
      // A charge with a hole is drawn thinner than a solid one, so both its surfaces and the arrows on them show through it.
      const cloudMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .9, metalness: 0, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false});
      // The outermost shell of a charge with no edge, fainter still, so the halo thins out to the frame rather than stops.
      const haloEdgeMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .9, metalness: 0, transparent: true, opacity: .06, side: THREE.DoubleSide, depthWrite: false});
      const holedMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, roughness: .9, metalness: 0, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false});
      // The plug a hole is filled with, lit at the right side: the charge's colour, thinner than the whole charge's.
      const plugMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, emissive: CHARGE.glow, roughness: .7, metalness: 0, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false});
      const rimMaterial = new THREE.LineDashedMaterial({dashSize: .08, gapSize: .06, transparent: true, opacity: .9});
      // The whole charge's part a superposition's surface holds, lit: see-through, so its own surface, the plug's and
      // the hole all show through it. And the two pieces' fields at P, thinner than the answer's but never faint.
      const pieceMaterial = new THREE.MeshStandardMaterial({color: CHARGE.body, emissive: CHARGE.glow, roughness: .7, metalness: 0, transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false});
      // The pieces lighter, in the contribution's teal, as the integral run draws its pieces; the answer drawn last and
      // over everything, so the translucent plug and ball round P never tint it into the arrows round it.
      const partMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .78, depthTest: false, depthWrite: false});
      const answerMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 1, depthTest: false, depthWrite: false});
      // A Gaussian surface is imaginary: a faint skin that tints what is behind it and never hides it.
      const skinMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .1, side: THREE.DoubleSide, depthWrite: false});
      const edgeMaterial = new THREE.LineBasicMaterial({transparent: true, opacity: .5});
      const litMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false});
      const zeroMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false});
      // An arrow is drawn at full weight where it lies near the screen's plane, so its length can be read; one that
      // points toward the reader or away is foreshortened, and is drawn quieter, so it is not read as a weaker field.
      const fieldFront = new THREE.MeshBasicMaterial(), fieldQuiet = new THREE.MeshBasicMaterial({transparent: true, opacity: .4}), fieldBack = new THREE.MeshBasicMaterial({transparent: true, opacity: .24});
      const normalFront = new THREE.MeshBasicMaterial(), normalQuiet = new THREE.MeshBasicMaterial({transparent: true, opacity: .32}), normalBack = new THREE.MeshBasicMaterial({transparent: true, opacity: .2});
      const pointMaterial = new THREE.MeshBasicMaterial({depthTest: false});
      // AN INFINITE SHEET FADES OUT, NEVER ENDS: cut square, a sheet, a slab or a metal face ended in a hard edge at the
      // card's sides, a rim the charge does not have. Its flat faces are faded by a radial ramp that begins well inside
      // the frame and is nearly gone at its edge, as the integral lessons' sheet fades (bodies.ts, fadeOut).
      const ramp = document.createElement('canvas'); ramp.width = ramp.height = 256;
      const pen = ramp.getContext('2d');
      // Gone before the frame's side: the sheet is 2.4 frame half-widths across, so the frame's side is at about 0.83 of its
      // radius, where the ramp used to be a third lit, and the glow ended there in a hard vertical edge.
      if (pen) { const r = pen.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, '#fff'); r.addColorStop(.42, '#fff'); r.addColorStop(.62, '#5a5a5a'); r.addColorStop(.78, '#000'); r.addColorStop(1, '#000'); pen.fillStyle = r; pen.fillRect(0, 0, 256, 256); }
      const fadeMap = new THREE.CanvasTexture(ramp);
      const faded = <M extends InstanceType<typeof THREE.MeshStandardMaterial>>(m: M) => { const f = m.clone() as M; f.alphaMap = fadeMap; f.transparent = true; return f; };
      const sheetFade = faded(sheetMaterial), cloudFade = faded(cloudMaterial), metalFade = faded(metalMaterial);
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
      const clear = (g: InstanceType<typeof THREE.Group>) => { for (const child of g.children.slice()) { g.remove(child); child.traverse(o => { const geo = (o as unknown as {geometry?: {dispose: () => void}}).geometry; if (geo && geo !== shaft && geo !== head) geo.dispose(); }); } };
      /** A patch as a mesh, sampled from its own parameters so a curved patch is curved. */
      const patchGeometry = (b: Built, i: number, lift = 1.004) => {
        const p = b.patches[i], on = surfaceOfPiece(b, p.piece), [u0, u1, v0, v1] = p.uv, n = 6, pos: number[] = [], idx: number[] = [];
        for (let a = 0; a <= n; a++) for (let c = 0; c <= n; c++) {
          let q = surfacePoint(on, p.part, u0 + (u1 - u0) * a / n, v0 + (v1 - v0) * c / n);
          // A hair off the skin, outward, so a tint is never fought over by the depth buffer.
          q = add(q, scale(p.normal, (lift - 1) * Math.max(b.surface.r, b.surface.h)));
          pos.push(q.x, q.y, q.z);
        }
        for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) { const k = a * (n + 1) + c; idx.push(k, k + 1, k + n + 2, k, k + n + 2, k + n + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
        return g;
      };
      /** A sphere, or a thick spherical shell, with a quarter cut away toward the opening camera so what is inside
       * shows: its outer surface, its inner one, and the two faces the cut leaves. The scene's z is up; three's
       * sphere is built about y, so it is turned, and its azimuth φ is the world's less a half turn. */
      const CUT_AT = Math.atan2(-.828, -.452), CUT_HALF = Math.PI / 4;
      const cutSphere = (r0: number, r1: number, material: InstanceType<typeof THREE.Material>, faces = true, coarse = false) => {
        const group = new THREE.Group(), from = CUT_AT + CUT_HALF - Math.PI, length = 2 * Math.PI - 2 * CUT_HALF;
        for (const r of r0 > 0 ? [r0, r1] : [r1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, coarse ? 18 : 48, coarse ? 10 : 32, from, length), material); m.rotation.x = Math.PI / 2; group.add(m); }
        if (faces) for (const psi of [CUT_AT - CUT_HALF, CUT_AT + CUT_HALF]) {
          const n = 24, pos: number[] = [], idx: number[] = [];
          for (let i = 0; i <= n; i++) for (let k = 0; k <= 1; k++) { const th = Math.PI * i / n, t = k ? r1 : r0; pos.push(t * Math.sin(th) * Math.cos(psi), t * Math.sin(th) * Math.sin(psi), t * Math.cos(th)); }
          for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
          group.add(new THREE.Mesh(geo, material));
        }
        return group;
      };
      // Each exposed radial face owns one colour at each radius, independent of how much charge lies behind
      // it in projection. The outer skin gives the ball its shape; it does not encode density. Basic material
      // keeps lighting from changing this quantitative ordering. Faces write depth so the rear skin cannot
      // paint over their density colours; the open quarter still exposes the Gaussian surface inside.
      // The separate enclosed-charge layer still lights up at the run's Right side stage.
      const colourDensityFaces = () => {
        const paper = new THREE.Color(palette().paper), strong = new THREE.Color(CHARGE.body);
        for (const face of densityFaces) {
          const colours = face.weights.flatMap(w => { const c = paper.clone().lerp(strong, .9 * w); return [c.r, c.g, c.b]; });
          face.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
        }
      };
      const gradedSphere = (kind: GradedBall, radius: number) => {
        const group = cutSphere(0, radius, cutMaterial, false);
        for (const angle of [CUT_AT - CUT_HALF, CUT_AT + CUT_HALF]) {
          const face = densityFace(kind, radius, angle), geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(face.positions, 3));
          geometry.setIndex(face.indices);
          densityFaces.push({geometry, weights: face.weights});
          group.add(new THREE.Mesh(geometry, densityMaterial));
        }
        colourDensityFaces();
        return group;
      };
      /** A cylinder about the z axis, open at its ends: a shell of charge, or a lit one. */
      const tube = (r: number, length: number, material: InstanceType<typeof THREE.Material>, coarse = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, coarse ? 20 : 48, coarse ? Math.max(2, Math.round(length * 2.4)) : 1, true), material); m.rotation.x = Math.PI / 2; return m; };
      /** A flat sheet of charge at height z. */
      const plane = (z: number, size: number, material: InstanceType<typeof THREE.Material>, coarse = false) => { const n = coarse ? Math.round(size * 2.4) : 1, m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, n, n), material); m.position.z = z; return m; };
      /** A charge of the opposite sign, as an open cage of lines: rings and lines along a cylinder, a grid on a plane,
       * parallels and meridians on a sphere cut open as the metal is. */
      const cage = (pts: number[], material: InstanceType<typeof THREE.Material>) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return new THREE.LineSegments(geo, material); };
      const cageTube = (r: number, length: number, material: InstanceType<typeof THREE.Material>) => {
        const pts: number[] = [], m = 48, around = 12, rings = Math.max(2, Math.round(length / .45));
        for (let k = 0; k <= rings; k++) { const z = -length / 2 + length * k / rings; for (let i = 0; i < m; i++) { const a = 2 * Math.PI * i / m, b2 = 2 * Math.PI * (i + 1) / m; pts.push(r * Math.cos(a), r * Math.sin(a), z, r * Math.cos(b2), r * Math.sin(b2), z); } }
        for (let i = 0; i < around; i++) { const a = 2 * Math.PI * (i + .5) / around; pts.push(r * Math.cos(a), r * Math.sin(a), -length / 2, r * Math.cos(a), r * Math.sin(a), length / 2); }
        return cage(pts, material);
      };
      const cagePlane = (z: number, size: number, material: InstanceType<typeof THREE.Material>) => {
        const pts: number[] = [], n = Math.max(4, Math.round(size / .5));
        for (let k = 0; k <= n; k++) { const t = -size / 2 + size * k / n; pts.push(t, -size / 2, z, t, size / 2, z, -size / 2, t, z, size / 2, t, z); }
        return cage(pts, material);
      };
      const cageSphere = (r: number, material: InstanceType<typeof THREE.Material>) => {
        const pts: number[] = [], from = CUT_AT + CUT_HALF, length = 2 * Math.PI - 2 * CUT_HALF, m = 40;
        const at = (th: number, ph: number) => [r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th)];
        for (let k = 1; k < 6; k++) { const th = Math.PI * k / 6; for (let i = 0; i < m; i++) pts.push(...at(th, from + length * i / m), ...at(th, from + length * (i + 1) / m)); }
        for (let j = 0; j <= 8; j++) { const ph = from + length * j / 8; for (let i = 0; i < m; i++) pts.push(...at(Math.PI * i / m, ph), ...at(Math.PI * (i + 1) / m, ph)); }
        return cage(pts, material);
      };
      let built: Built | null = null, structure = '';
      const patchArrows: {e: Arrow; n: Arrow; tint: InstanceType<typeof THREE.Mesh>}[] = [], spokeArrows: Arrow[] = [];
      let P: InstanceType<typeof THREE.Mesh> | null = null, pArrow: Arrow | null = null, insideMesh: InstanceType<typeof THREE.Object3D> | null = null;
      // A superposition's two fields at P, the plug's laid from the tip of the whole charge's: they add to the answer.
      const partArrows: Arrow[] = [];
      /** The point charges' discs, sized in pixels: scaled as the view's own scale moves from the one they were built at. */
      const dots: InstanceType<typeof THREE.Mesh>[] = [];
      /** A circle about the z axis at height z, dashed: the rim of a sheet's hole. */
      const rim = (r: number, z: number, at: V3 = v3(0, 0, 0)) => {
        const pts: number[] = [];
        for (let i = 0; i <= 96; i++) { const t = 2 * Math.PI * i / 96; pts.push(at.x + r * Math.cos(t), at.y + r * Math.sin(t), z); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        const line = new THREE.Line(geo, rimMaterial); line.computeLineDistances(); return line;
      };
      const rebuild = (p: SceneProps) => {
        const b = p.built;
        built = b;
        for (const g of [charge, inside, skin, tints, arrows, spokes, marks]) clear(g);
        patchArrows.length = 0; spokeArrows.length = 0; densityFaces.length = 0;
        const c = b.charge, g = b.surface, reach = b.half * 2.2;
        // A flat charge's width: its fade (above) begins about two thirds of the way to the frame's side and is all but
        // gone at it, whichever way the figure is turned. Its opposite-sign cage, which cannot fade, stops inside it.
        const wide = 2.4 * 360 / b.unit, cageWide = 1.7 * 360 / b.unit;
        // THE CHARGE, as a body: a point, a ball, a shell, a line, a sheet or a slab.
        // A point charge as large as the cross-section's disc, so its sign sits on it.
        const dot0 = POINT_PX / b.unit;
        // A point charge's disc holds its size on screen as the view glides out at the Symmetry stage (`apply`).
        dots.length = 0;
        const disc = (r: number, material: InstanceType<typeof THREE.Material>, at?: V3) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), material); if (at) m.position.set(at.x, at.y, at.z); dots.push(m); return m; };
        if (c.kind === 'point') charge.add(disc(dot0, bodyMaterial, c.at));
        // A finite rod: a line with ends.
        if (c.kind === 'segment') { const m = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 2 * c.size, 16), bodyMaterial); m.rotation.x = Math.PI / 2; charge.add(m); }
        if (c.kind === 'offset') charge.add(disc(dot0, bodyMaterial, v3(0, 0, c.size)));
        // A ball the Gaussian sphere cuts through is drawn translucent, so the sphere and its patches show inside it.
        if (isGradedBall(c.kind)) charge.add(gradedSphere(c.kind, c.size));
        else if (isBall(c.kind)) charge.add(new THREE.Mesh(new THREE.SphereGeometry(c.size, 48, 32), g.r < c.size ? cutMaterial : bodyMaterial));
        // A thin shell is a skin with nothing inside it: cut open toward the reader as the metal is, and matte, so its
        // hollow shows and a Gaussian sphere inside it is seen in empty space. Drawn whole, it came out a shaded ball,
        // the uniform ball beside it, and the lesson's point (no charge inside, no field there) was not to be seen.
        if (c.kind === 'shell') charge.add(cutSphere(0, c.size, shellMaterial, false));
        if (c.kind === 'line') { const m = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, reach * 2, 16), bodyMaterial); m.rotation.x = Math.PI / 2; charge.add(m); }
        if (c.kind === 'sheet') charge.add(new THREE.Mesh(new THREE.PlaneGeometry(wide, wide), sheetFade));
        if (c.kind === 'slab' || c.kind === 'tent') { const m = new THREE.Mesh(new THREE.BoxGeometry(wide, wide, 2 * c.size), sheetFade); charge.add(m); }
        // The slab whose charge changes sign: its upper half the charge's own, its lower half the opposite one.
        if (c.kind === 'oddslab') {
          const top = new THREE.Mesh(new THREE.BoxGeometry(wide, wide, c.size), sheetFade), low = new THREE.Mesh(new THREE.BoxGeometry(wide, wide, c.size), cloudFade);
          top.position.z = c.size / 2; low.position.z = -c.size / 2; charge.add(top, low, cagePlane(-c.size / 2, cageWide, oppositeMaterial), cagePlane(-c.size, cageWide, oppositeMaterial));
        }
        // Charge with no edge: shells of it, past the frame's edges, overlapping so the inside is the densest.
        // Only the shells that fit the frame: one past it was cut flat by the frame's top and bottom, a rim the charge
        // does not have. The densest part is still the most overlapped.
        if (c.kind === 'halo') [.36, .66, .97].forEach((f, i) => charge.add(new THREE.Mesh(new THREE.SphereGeometry(f * 205 / b.unit, 40, 28), i === 2 ? haloEdgeMaterial : cloudMaterial)));
        if (c.kind === 'cusp') charge.add(new THREE.Mesh(new THREE.SphereGeometry(c.size, 48, 32), g.r < c.size ? cutMaterial : bodyMaterial));
        const outer = c.outer ?? c.size * 2;
        if (c.kind === 'rod') charge.add(tube(c.size, reach * 2, rodMaterial));
        if (c.kind === 'tube') charge.add(tube(c.size, reach * 2, sheetMaterial));
        if (c.kind === 'coax') charge.add(tube(c.size, reach * 2, sheetMaterial), cageTube(outer, reach * 2, oppositeMaterial));
        // A conductor: grey metal, cut open, its charge a skin on its surface (and on a hollow's wall).
        if (c.kind === 'metal') charge.add(cutSphere(0, c.size, metalMaterial), cutSphere(0, c.size * 1.006, sheetMaterial, false));
        if (c.kind === 'cavity') charge.add(cutSphere(c.size, outer, metalMaterial), cageSphere(c.size * .994, oppositeMaterial), cutSphere(0, outer * 1.006, sheetMaterial, false), disc(dot0, bodyMaterial));
        if (c.kind === 'face') { const m = new THREE.Mesh(new THREE.BoxGeometry(wide, wide, reach * .5), metalFade); m.position.z = -reach * .25; charge.add(m, plane(.004, wide, sheetFade)); }
        if (c.kind === 'plates') charge.add(plane(0, wide, sheetFade), cagePlane(-c.size, cageWide, oppositeMaterial));
        // A charge with a hole: the charge, clear enough to see the surfaces inside it, and the hole as a gap in it.
        const hole = c.hole;
        if (c.kind === 'ballhole' && hole) {
          charge.add(new THREE.Mesh(new THREE.SphereGeometry(c.size, 48, 32), holedMaterial));
          const gap = new THREE.Mesh(new THREE.SphereGeometry(hole.radius, 40, 28), holeMaterial); gap.position.set(hole.at.x, hole.at.y, hole.at.z); gap.renderOrder = 1; charge.add(gap);
        }
        if (c.kind === 'rodhole' && hole) {
          charge.add(tube(c.size, reach * 2, holedMaterial));
          const gap = tube(hole.radius, reach * 2, holeMaterial); gap.position.set(hole.at.x, hole.at.y, 0); gap.renderOrder = 1; charge.add(gap);
        }
        if (c.kind === 'sheethole' && hole) {
          const w = wide / 2, shape = new THREE.Shape([new THREE.Vector2(-w, -w), new THREE.Vector2(w, -w), new THREE.Vector2(w, w), new THREE.Vector2(-w, w)]);
          const gap = new THREE.Path(); gap.absarc(hole.at.x, hole.at.y, hole.radius, 0, 2 * Math.PI, true); shape.holes.push(gap);
          // A shape's own coordinates are its uvs; the fade wants them across the square, nought to one.
          const flatGeo = new THREE.ShapeGeometry(shape, 64), at = flatGeo.getAttribute('position'), uv = flatGeo.getAttribute('uv');
          for (let i = 0; i < at.count; i++) uv.setXY(i, at.getX(i) / wide + .5, at.getY(i) / wide + .5);
          charge.add(new THREE.Mesh(flatGeo, sheetFade), rim(hole.radius, 0, hole.at));
        }
        // THE CHARGE INSIDE, lit at the right side: the part of the charge the surface encloses.
        insideMesh = null;
        if (c.kind === 'point') insideMesh = disc(dot0 * 1.3, insideMaterial, c.at);
        if (c.kind === 'segment') { const m = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 2 * Math.min(c.size, g.h), 16), insideMaterial); m.rotation.x = Math.PI / 2; insideMesh = m; }
        if (c.kind === 'offset' && g.r > c.size) insideMesh = disc(dot0 * 1.3, insideMaterial, v3(0, 0, c.size));
        // Inside a ball, the part enclosed sits just within the sphere, never over its patches.
        // A graded ball keeps its radial faces visible when the enclosed region lights up. A complete
        // opaque highlight sphere would cover them at rest and at Right side, erasing the density lesson.
        // Its open curved skin marks the enclosed region while the faces keep their local-density colours.
        if (isGradedBall(c.kind)) insideMesh = cutSphere(0, Math.min(c.size * 1.01, g.r * .985), insideMaterial, false);
        else if (isBall(c.kind)) insideMesh = new THREE.Mesh(new THREE.SphereGeometry(Math.min(c.size * 1.01, g.r * .985), 48, 32), insideMaterial);
        // A shell's charge is all on its surface: enclosed whole once the surface is outside it, and not at all before.
        if (c.kind === 'shell' && g.r > c.size) insideMesh = cutSphere(0, c.size * 1.01, skinLitMaterial, false);
        if (c.kind === 'line') { const m = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 2 * g.h, 16), insideMaterial); m.rotation.x = Math.PI / 2; insideMesh = m; }
        if (c.kind === 'sheet' || c.kind === 'slab' || c.kind === 'tent') insideMesh = new THREE.Mesh(c.kind === 'sheet' ? new THREE.CircleGeometry(g.r, 48) : new THREE.CylinderGeometry(g.r, g.r, 2 * Math.min(g.h, c.size), 48), insideMaterial);
        // A conductor's face, or a capacitor's σ plate: the disc of it the pillbox cuts out.
        if (c.kind === 'face' || c.kind === 'plates') insideMesh = new THREE.Mesh(new THREE.CircleGeometry(g.r, 48), insideMaterial);
        if (c.kind === 'rod') { const m = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(c.size, g.r) * 1.01, Math.min(c.size, g.r) * 1.01, 2 * g.h, 48), insideMaterial); m.rotation.x = Math.PI / 2; insideMesh = m; }
        // A shell's charge is on its surface, enclosed once the surface is outside it; a coaxial pair's, shell by shell.
        if ((c.kind === 'tube' || c.kind === 'coax') && g.r > c.size) { const grp = new THREE.Group(); grp.add(tube(c.size * 1.01, 2 * g.h, skinLitMaterial)); if (c.kind === 'coax' && g.r > outer) grp.add(cageTube(outer * 1.01, 2 * g.h, oppositeLitMaterial)); insideMesh = grp; }
        if (c.kind === 'metal' && g.r > c.size) insideMesh = cutSphere(0, c.size * 1.012, skinLitMaterial, false);
        // A charge in a hollow: the charge, then the hollow's wall with it, then the outer surface too.
        if (c.kind === 'cavity') {
          const grp = new THREE.Group(); grp.add(disc(dot0 * 1.3, insideMaterial));
          if (g.r > c.size) grp.add(cageSphere(c.size * .99, oppositeLitMaterial));
          if (g.r > outer) grp.add(cutSphere(0, outer * 1.012, skinLitMaterial, false));
          insideMesh = grp;
        }
        if (c.kind === 'halo' || c.kind === 'cusp') insideMesh = new THREE.Mesh(new THREE.SphereGeometry((c.kind === 'cusp' ? Math.min(c.size * 1.01, g.r * .985) : g.r * .985), 48, 32), insideMaterial);
        if (c.kind === 'oddslab') {
          const z1 = Math.max(-c.size, Math.min(c.size, g.h)), z0 = Math.max(-c.size, Math.min(c.size, g.low ?? -g.h));
          if (z1 - z0 > 1e-3) { const m = new THREE.Mesh(new THREE.CylinderGeometry(g.r * .985, g.r * .985, z1 - z0, 48), pieceMaterial); m.rotation.x = Math.PI / 2; m.position.z = (z0 + z1) / 2; inside.add(m); }
        }
        if (insideMesh) { if (c.kind === 'slab' || c.kind === 'tent') insideMesh.rotation.x = Math.PI / 2; inside.add(insideMesh); }
        // A superposition's two pieces, each the part of it its own surface holds: the whole charge's, and the plug's.
        b.pieces?.forEach((piece, i) => {
          const q = piece.charge, s = piece.surface, material = i ? plugMaterial : pieceMaterial, at = q.at ?? v3(0, 0, 0);
          if (q.kind === 'ball' && s) { const m = new THREE.Mesh(new THREE.SphereGeometry(Math.min(q.size, s.r) * .985, 40, 28), material); m.position.set(at.x, at.y, at.z); inside.add(m); }
          if (q.kind === 'rod' && s) { const m = tube(Math.min(q.size, s.r) * .985, 2 * s.h, material); m.position.set(at.x, at.y, 0); inside.add(m); }
          if (q.kind === 'sheet' && !i) inside.add(new THREE.Mesh(new THREE.CircleGeometry(g.r * .985, 48), material));
        });
        // THE SURFACE: a faint skin, and the cuts between its patches, on each surface a superposition draws.
        const parts = [...new Set(b.patches.map(q => `${q.piece ?? 0}|${q.part}`))];
        const full = (key: string) => {
          const ranges = b.patches.filter(q => `${q.piece ?? 0}|${q.part}` === key).map(q => q.uv);
          return [Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1])), Math.min(...ranges.map(r => r[2])), Math.max(...ranges.map(r => r[3]))] as const;
        };
        for (const key of parts) {
          const [which, part] = key.split('|') as [string, typeof b.patches[number]['part']], on = surfaceOfPiece(b, Number(which));
          const [u0, u1, v0, v1] = full(key), n = 40, pos: number[] = [], idx: number[] = [];
          for (let a = 0; a <= n; a++) for (let k = 0; k <= n; k++) { const q = surfacePoint(on, part, u0 + (u1 - u0) * a / n, v0 + (v1 - v0) * k / n); pos.push(q.x, q.y, q.z); }
          for (let a = 0; a < n; a++) for (let k = 0; k < n; k++) { const i = a * (n + 1) + k; idx.push(i, i + 1, i + n + 2, i, i + n + 2, i + n + 1); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
          skin.add(new THREE.Mesh(geo, skinMaterial));
        }
        const cuts: number[] = [];
        for (const q of b.patches) {
          const [u0, u1, v0, v1] = q.uv, m = 16, g = surfaceOfPiece(b, q.piece);
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
        P = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), pointMaterial); P.renderOrder = 10; marks.add(P);
        pArrow = arrow(answerMaterial); marks.add(pArrow.group);
        partArrows.length = 0;
        for (let i = 0; i < (b.pieces?.length ?? 0); i++) { const a = arrow(partMaterial); marks.add(a.group); partArrows.push(a); a.shaft.renderOrder = a.head.renderOrder = 8; }
        pArrow.shaft.renderOrder = pArrow.head.renderOrder = 9;
      };
      const structureOf = (b: Built) => `${b.charge.kind}:${b.charge.sign}:${b.charge.size}:${b.charge.outer ?? ''}:${b.surface.kind}:${b.surface.r.toFixed(4)}:${b.surface.h.toFixed(4)}`;
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
          colourDensityFaces();
          const c = palette();
          skinMaterial.color.set(c.ink); edgeMaterial.color.set(c.ink); litMaterial.color.set(c.field); zeroMaterial.color.set(c.ghost);
          metalMaterial.color.set(c.muted); metalFade.color.set(c.muted); holeMaterial.color.set(c.paper); rimMaterial.color.set(c.muted);
          fieldFront.color.set(c.field); fieldQuiet.color.set(c.field); fieldBack.color.set(c.field); partMaterial.color.set(c.contribution); answerMaterial.color.set(c.field); normalFront.color.set(c.muted); normalQuiet.color.set(c.muted); normalBack.color.set(c.muted); pointMaterial.color.set(c.ink);
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
        // The backwards problem asks the reader to discover rho. As in its cross-section, its face stays
        // plain until Solve; changing the stage toggles the existing material, never rebuilds the scene.
        const densityKnown = !p.kase.figure.charge.insideNames || look.stage === 'solve';
        if (densityMaterial.vertexColors !== densityKnown) {
          densityMaterial.vertexColors = densityKnown;
          densityMaterial.color.set(densityKnown ? 0xffffff : CHARGE.body);
          densityMaterial.needsUpdate = true;
        }
        for (const d of dots) d.scale.setScalar(b.unit / p.unit);
        // The layers of the moment.
        skin.visible = look.surface > .01;
        skinMaterial.opacity = .05 * look.surface; edgeMaterial.opacity = (document.documentElement.classList.contains('dark') ? .6 : .45) * look.surface;
        inside.visible = look.enclosed > .01;
        insideMaterial.opacity = look.enclosed; skinLitMaterial.opacity = .28 * look.enclosed; oppositeLitMaterial.opacity = .95 * look.enclosed; plugMaterial.opacity = .5 * look.enclosed; pieceMaterial.opacity = .45 * look.enclosed;
        const lit = look.sweep * b.patches.length;
        // How far an arrow along `dir` is foreshortened: 0 in the screen's plane, 1 pointing straight at the reader.
        const along = (dir: V3) => Math.abs(dot(unitV(dir), toCamera));
        const SEEN = .5;
        b.patches.forEach((q, i) => {
          const a = patchArrows[i];
          if (!a) return;
          // THE ARROWS THAT CAN BE COMPARED, AT FULL WEIGHT: those that lie near the screen's plane, round the
          // surface's rim as the reader sees it, found again as the figure turns. There equal fields are seen to be
          // drawn equal. The rest are quieter (thinner, lighter), and the far side's quieter still, behind the skin:
          // drawn at full weight, the foreshortened ones read as a weaker field, which they are not.
          // All faint while the run solves for P, so the answer's arrow stands out from the patches'.
          const solving = look.stage === 'solve', front = dot(q.normal, toCamera) > -.05;
          const eSeen = !solving && along(q.field) < SEEN, nSeen = !solving && along(q.normal) < SEEN;
          a.e.shaft.material = a.e.head.material = eSeen ? fieldFront : front && !solving ? fieldQuiet : fieldBack;
          a.n.shaft.material = a.n.head.material = nSeen ? normalFront : front && !solving ? normalQuiet : normalBack;
          // dA: the outward normal, set a little off the patch's centre so it never lies under the field's arrow.
          const off = scale(sub(q.corners[0], q.center), .32), base = add(q.center, off);
          lay(a.n, base, q.normal, .34 * look.surface * Math.min(1, b.half / 3.2) * (look.surface > .01 ? 1 : 0), nSeen ? 1 : .72);
          // E: from the patch's centre (or, pointing in, ending there, its tail outside), as long as the field is
          // strong, once the run has reached this patch.
          const reached = i < lit;
          const e = q.field, len = q.span * Math.min(1, Math.max(0, lit - i));
          lay(a.e, arrowEnds(q.center, e, len, q.back).from, unitV(e), reached ? len : 0, eSeen ? 1.1 : .75);
          a.tint.visible = reached && (q.zero || (look.stage === 'left' && i >= lit - 1));
        });
        spokes.visible = look.spokes > .01;
        b.spokes.forEach((sp, i) => {
          const a = spokeArrows[i]; if (!a) return;
          const len = (sp.span ?? 0) * look.spokes, d = unitV(sp.field);
          lay(a, arrowEnds(sp.at, sp.field, len, sp.back).from, d, len);
        });
        // P, and the field there once the run has solved for it.
        if (P) { P.visible = (b.answerAtP || !!b.markP) && (look.solve > .01 || look.stage === null); P.scale.setScalar(4.2 * px); P.position.set(b.P.x, b.P.y, b.P.z); }
        // The answer: the field at P, drawn bold once the run has solved for it, and at rest.
        if (pArrow) { const len = b.spanAtP * look.solve; lay(pArrow, arrowEnds(b.P, b.fieldAtP, len, b.backAtP).from, unitV(b.fieldAtP), b.answerAtP && (look.stage === 'solve' || look.stage === null) ? len : 0, b.pieces ? 2.2 : 1.8); }
        // A superposition's answer is two fields added: the whole charge's from P, the plug's from its tip.
        chainOf(b).forEach((link, i) => {
          const a = partArrows[i]; if (!a) return;
          lay(a, link.from, link.dir, look.stage === 'solve' || look.stage === null ? link.length * look.solve : 0, .75);
        });
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
          shaft.dispose(); head.dispose(); fadeMap.dispose();
          for (const m of [bodyMaterial, densityMaterial, cutMaterial, sheetMaterial, shellMaterial, insideMaterial, skinLitMaterial, oppositeMaterial, oppositeLitMaterial, rodMaterial, metalMaterial, holeMaterial, holedMaterial, cloudMaterial, plugMaterial, pieceMaterial, partMaterial, answerMaterial, haloEdgeMaterial, sheetFade, cloudFade, metalFade, rimMaterial, skinMaterial, edgeMaterial, litMaterial, zeroMaterial, fieldFront, fieldQuiet, fieldBack, normalFront, normalQuiet, normalBack, pointMaterial]) m.dispose();
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
