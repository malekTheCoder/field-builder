import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {EPS0, ballFraction, bandFlux, boundaries, carriesNothing, crossedArea, dot, enclosedCharge, fieldAt, inducedCharges, norm, numericFlux, patches, pointOn, solvedField, starFlux, surfacePoint, sub, throughPatch, v3, wallDensity, type Charge, type Surface} from '../src/gauss/physics';
import {arrowLength, build, chainOf, drawnFlux, lookAt, REST, slice} from '../src/gauss/scene';
import {BANDS, CANDIDATES, CAVITY, MOVES, SPHERE_KINDS, START, bandShares, blob, cavityField, cavityLines, cavityTex, density, enclosedOf, fieldAlong, fieldOf, fluxTex, flowRound, insideBands, insideTex, isInside, moveBy, profile, profileReach, proposed, qencFraction, qencTex, regionOf, samples, shellCharge, survives, wallMarks, type Charged} from '../src/gauss/instruments';
import {GAUSS_LESSONS, gaussLesson} from '../src/gauss';
import {diskField, elliptic, lensArea, lensVolume, piecesOf, ringField} from '../src/gauss/physics';
import {HOLE, holeAt, holeField, holePieces, holeTex} from '../src/gauss/instruments';
import {REGISTRY} from '../src/distributions';
import {EPS0 as SI_EPS0} from '../src/distributions/constants';
import type {Params} from '../src/problems/types';
/* THE GAUSS LESSONS' PHYSICS, HELD TO NUMBERS. Every closed form the board writes, every arrow the figure draws
 * and every patch it lights as zero comes from src/gauss/physics.ts; here each is checked against a numerical flux
 * integral or the definition it stands for, for both signs of the charge and across the sliders' ranges. */
const close = (a: number, b: number, rel = 1e-6) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
const SIGNS = [1, -1] as const;
const CASES: [Charge['kind'], number, Surface][] = [
  ['point', 0, {kind: 'sphere', r: 1.7, h: 0}], ['ball', 1, {kind: 'sphere', r: 2.3, h: 0}], ['ball', 1, {kind: 'sphere', r: .6, h: 0}],
  ['shell', 1, {kind: 'sphere', r: .6, h: 0}], ['shell', 1, {kind: 'sphere', r: 1.6, h: 0}], ['line', 0, {kind: 'cylinder', r: 1.3, h: 1.1}],
  ['sheet', 0, {kind: 'pillbox', r: .9, h: .8}], ['slab', .5, {kind: 'pillbox', r: .9, h: .3}], ['slab', .5, {kind: 'pillbox', r: .9, h: 1.2}],
  // Lines and cylinders: a solid rod inside and out, a shell inside and out.
  ['rod', 1, {kind: 'cylinder', r: .55, h: 1.1}], ['rod', 1, {kind: 'cylinder', r: 2.2, h: .8}], ['tube', 1, {kind: 'cylinder', r: .6, h: 1.1}], ['tube', 1, {kind: 'cylinder', r: 1.9, h: 1.1}],
  // Sheets and slabs: a capacitor's plates, the pillbox round the σ plate. Conductors: a metal face.
  ['plates', 1.2, {kind: 'pillbox', r: .85, h: .5}], ['plates', 1.2, {kind: 'pillbox', r: .85, h: 1.02}], ['face', 0, {kind: 'pillbox', r: .85, h: .7}],
  // Conductors: a metal ball, the surface in the metal and outside it.
  ['metal', 1, {kind: 'sphere', r: .6, h: 0}], ['metal', 1, {kind: 'sphere', r: 2.1, h: 0}],
];
/** Cases with a second size: a coaxial pair (a, b) and a charge in a metal ball's hollow (a, b), in each region. */
const TWO: [Charge['kind'], number, number, Surface][] = [
  ['coax', .8, 1.7, {kind: 'cylinder', r: .5, h: 1.1}], ['coax', .8, 1.7, {kind: 'cylinder', r: 1.25, h: 1.1}], ['coax', .8, 1.7, {kind: 'cylinder', r: 2.3, h: 1.1}],
  ['cavity', .65, 1.35, {kind: 'sphere', r: .4, h: 0}], ['cavity', .65, 1.35, {kind: 'sphere', r: 1, h: 0}], ['cavity', .65, 1.35, {kind: 'sphere', r: 2.2, h: 0}],
];

describe('Gauss’s law, numerically, for every distribution and both signs', () => {
  for (const [kind, size, outer, g] of [...CASES.map(([k, s, g]) => [k, s, undefined, g] as const), ...TWO]) for (const sign of SIGNS) it(`${kind} in a ${g.kind} of size ${g.kind === 'pillbox' ? g.h : g.r} (${sign > 0 ? '+' : '−'})`, () => {
    const c: Charge = {kind, sign, size, ...(outer ? {outer} : {})};
    // The left side by brute force equals the right side over ε₀.
    close(numericFlux(c, g, 120), enclosedCharge(c, g) / EPS0, 1e-6);
    // The solve gives the field's component on the crossed part, exactly.
    const {at: P, normal: n} = pointOn(g, c);
    close(solvedField(c, g), dot(fieldAt(c, P), n), 1e-12);
    // P is on the surface, and its normal is the outward one there.
    if (g.kind === 'pillbox') { close(Math.abs(P.z), g.h, 1e-12); close(Math.sign(P.z), n.z, 1e-12); } else close(Math.hypot(P.x, P.y), g.r, 1e-12);
    // And the figure's own patches, summed, carry exactly that flux.
    const drawn = patches(g).reduce((t, p) => t + dot(fieldAt(c, p.center), p.normal) * p.area, 0);
    close(drawn, enclosedCharge(c, g) / EPS0, 1e-9);
  });
  it('the closed forms are the textbook ones: kQ/r², 2kλ/r, σ/2ε₀, ρz/ε₀ (k = 1)', () => {
    close(fieldAt({kind: 'point', sign: 1, size: 0}, v3(0, 2, 0)).y, 1 / 4);
    close(fieldAt({kind: 'line', sign: 1, size: 0}, v3(0, 2, 7)).y, 2 / 2);
    close(fieldAt({kind: 'sheet', sign: -1, size: 0}, v3(3, 1, 5)).z, -1 / (2 * EPS0));
    close(fieldAt({kind: 'slab', sign: 1, size: .5}, v3(0, 0, .2)).z, .2 / EPS0);
    // Inside a uniform ball the field grows linearly, and meets kQ/R² at the surface.
    close(fieldAt({kind: 'ball', sign: 1, size: 2}, v3(1, 0, 0)).x, 1 / 8);
    close(fieldAt({kind: 'ball', sign: 1, size: 2}, v3(2, 0, 0)).x, 1 / 4);
    expect(norm(fieldAt({kind: 'shell', sign: 1, size: 2}, v3(.5, .5, .5)))).toBe(0);
  });
  it('the sheet’s field jumps by σ/ε₀ across it', () => {
    const c: Charge = {kind: 'sheet', sign: 1, size: 0};
    close(fieldAt(c, v3(0, 0, 1e-6)).z - fieldAt(c, v3(0, 0, -1e-6)).z, 1 / EPS0);
  });
  it('the crossed area is the one the left side writes: 4πr², 2πrL, 2A', () => {
    close(crossedArea({kind: 'sphere', r: 2, h: 0}), 16 * Math.PI);
    close(crossedArea({kind: 'cylinder', r: 2, h: 1.5}), 2 * Math.PI * 2 * 3);
    close(crossedArea({kind: 'pillbox', r: 1, h: .4}), 2 * Math.PI);
  });
  it('lights as zero exactly the patches E lies along: a cylinder’s ends, a pillbox’s side', () => {
    const line: Charge = {kind: 'line', sign: -1, size: 0}, sheet: Charge = {kind: 'sheet', sign: 1, size: 0}, ball: Charge = {kind: 'ball', sign: 1, size: 1};
    for (const p of patches({kind: 'cylinder', r: 1.2, h: 1})) expect(carriesNothing(line, p), p.key).toBe(p.part !== 'wall');
    for (const p of patches({kind: 'pillbox', r: .8, h: .9})) expect(carriesNothing(sheet, p), p.key).toBe(p.part === 'wall');
    for (const p of patches({kind: 'sphere', r: 2, h: 0})) expect(carriesNothing(ball, p)).toBe(false);
  });
  it('cuts each surface into patches that tile it: the areas add to the whole', () => {
    close(patches({kind: 'sphere', r: 1.3, h: 0}).reduce((t, p) => t + p.area, 0), 4 * Math.PI * 1.3 ** 2, 1e-12);
    close(patches({kind: 'cylinder', r: 1.3, h: .7}).reduce((t, p) => t + p.area, 0), 2 * Math.PI * 1.3 * 1.4 + 2 * Math.PI * 1.3 ** 2, 1e-12);
    // Every corner lies on the surface, and every normal is outward and of unit length.
    for (const g of [{kind: 'sphere', r: 1.3, h: 0}, {kind: 'cylinder', r: 1.1, h: .8}, {kind: 'pillbox', r: .9, h: .5}] as Surface[]) for (const p of patches(g)) {
      close(norm(p.normal), 1, 1e-12);
      const [u0, u1, v0, v1] = p.uv, mid = surfacePoint(g, p.part, (u0 + u1) / 2, (v0 + v1) / 2);
      expect(dot(sub(mid, g.kind === 'sphere' ? v3(0, 0, 0) : v3(0, 0, mid.z * (p.part === 'wall' ? 1 : 0))), p.normal)).toBeGreaterThan(0);
    }
  });
});

describe('the flux through any closed surface, and a charge outside', () => {
  it('is q/ε₀ through a lumpy surface round a charge off its centre, and zero for one outside', () => {
    const lumpy = (az: number, pol: number) => 1.5 * (1 + .16 * Math.cos(3 * az + .4) + .08 * Math.sin(2 * az)) * (1 + .1 * Math.cos(2 * pol));
    close(starFlux([{at: v3(.3, -.2, .1), q: 1}], v3(0, 0, 0), lumpy, 220) * EPS0, 1, 2e-4);
    close(starFlux([{at: v3(.3, -.2, .1), q: -1}], v3(0, 0, 0), lumpy, 220) * EPS0, -1, 2e-4);
    expect(Math.abs(starFlux([{at: v3(3, 0, 0), q: 1}], v3(0, 0, 0), lumpy, 220))).toBeLessThan(2e-3);
  });
  it('the instrument’s readout is the enclosed charges over ε₀, checked by quadrature through its own surface', () => {
    for (const s of [1, 1.75, 2.6]) {
      const charges = START.map(c => ({at: v3(c.at.x, c.at.y, 0), q: c.sign}));
      const numeric = starFlux(charges, v3(0, 0, 0), (az, pol) => s * (1 + Math.sin(pol) ** 2 * (blob(az, 1) - 1)), 240) * EPS0;
      const named = enclosedOf(START, s).reduce((t, c) => t + c.sign, 0);
      close(numeric, named, 3e-3);
    }
  });
  it('the readout names the charges inside, and only changes when one crosses the surface', () => {
    const s = 1.75;
    expect(fluxTex(START, s)).toBe(String.raw`\Phi=\frac{q_1+q_3}{\varepsilon_0}`);
    // Walk q₂ in from outside in small steps: the readout changes once, exactly where it crosses.
    let charges: Charged[] = START.map(c => ({...c}));
    const seen: string[] = [];
    let crossings = 0, wasIn = isInside(charges[1].at, s);
    for (let k = 0; k <= 60; k++) {
      charges = charges.map(c => c.key === 'q2' ? {...c, at: {x: 2.55 - k * .045, y: 1.05 - k * .02}} : c);
      const tex = fluxTex(charges, s), now = isInside(charges[1].at, s);
      if (now !== wasIn) crossings++;
      if (seen.at(-1) !== tex) seen.push(tex);
      wasIn = now;
    }
    expect(crossings).toBe(1);
    expect(seen).toEqual([String.raw`\Phi=\frac{q_1+q_3}{\varepsilon_0}`, String.raw`\Phi=\frac{q_1+q_2+q_3}{\varepsilon_0}`]);
    // Moving a charge about inside, or growing the surface without reaching another, changes nothing.
    const inside = START.map(c => c.key === 'q1' ? {...c, at: {x: -.2, y: -.1}} : c);
    expect(fluxTex(inside, s)).toBe(fluxTex(START, s));
    expect(fluxTex(START, 1.9)).toBe(fluxTex(START, s));
    // With nothing inside it says zero.
    expect(fluxTex(START, .3)).toBe(String.raw`\Phi=0`);
  });
  it('a charge outside makes a field all over the surface, in on one side and out on the other', () => {
    const lone: Charged[] = [{...START[1]}];
    const flow = flowRound(lone, 1.75, 60);
    expect(flow.some(f => f.through > 0)).toBe(true);
    expect(flow.some(f => f.through < 0)).toBe(true);
    expect(flow.every(f => Math.abs(f.through) > 0)).toBe(true);
  });
});

describe('Symmetry first’s instrument', () => {
  it('lets only the field straight out survive every move, for either sign', () => {
    for (const sign of SIGNS) for (const sym of ['sphere', 'line', 'plane'] as const) for (const c of CANDIDATES[sym]) {
      const kept = MOVES[sym].map(m => survives(sym, c.key, m, sign));
      if (c.key === 'straight') expect(kept.every(Boolean), `${sym} straight`).toBe(true);
      else expect(kept.some(k => !k), `${sym} ${c.key} survives every move`).toBe(true);
    }
  });
  it('kills each forbidden part with the move the lesson names', () => {
    const line = MOVES.line, plane = MOVES.plane;
    expect(survives('line', 'tilted', line.find(m => m.key === 'mirror-square')!)).toBe(false);
    expect(survives('line', 'tilted', line.find(m => m.key === 'mirror-holds')!)).toBe(true);
    expect(survives('line', 'swirl', line.find(m => m.key === 'mirror-holds')!)).toBe(false);
    expect(survives('line', 'swirl', line.find(m => m.key === 'mirror-square')!)).toBe(true);
    expect(survives('plane', 'oneway', plane.find(m => m.key === 'flip')!)).toBe(false);
    expect(survives('plane', 'tilted', plane.find(m => m.key === 'turn')!)).toBe(false);
  });
  it('every move leaves the sample points where they were, as a set, so the comparison is point by point', () => {
    for (const sym of ['sphere', 'line', 'plane'] as const) for (const m of MOVES[sym]) {
      const pts = samples(sym);
      for (const p of pts) expect(pts.some(q => norm(sub(moveBy(m, 1, p), q)) < 1e-9), `${sym} ${m.key}`).toBe(true);
    }
  });
  it('proposes fields of the charge’s sign', () => {
    expect(proposed('line', 'straight', -1, v3(1, 0, 0)).x).toBeLessThan(0);
    expect(proposed('plane', 'straight', 1, v3(0, 0, -1)).z).toBeLessThan(0);
  });
});

describe('the figure’s plan', () => {
  for (const lesson of GAUSS_LESSONS) for (const c of lesson.cases) for (const sign of SIGNS) it(`${lesson.id} ${c.key} (${sign > 0 ? '+' : '−'}) draws the physics`, () => {
    for (const size of [c.figure.surface.size.min, c.figure.surface.size.initial, c.figure.surface.size.max]) {
      const b = build(c, size, sign);
      if (b.pieces) {
        // A charge with a hole: each piece's own surface carries that piece's flux, Q_enc/ε₀, and its field at P is
        // the one its own surface solves for; the field drawn at P is the two added.
        b.pieces.forEach((piece, i) => {
          const mine = b.patches.filter(p => (p.piece ?? 0) === i);
          if (!piece.surface) { expect(mine.length).toBe(0); return; }
          close(mine.reduce((t, p) => t + p.through * p.area, 0), piece.enclosed / EPS0, 1e-9);
          close(piece.enclosed, enclosedCharge(piece.charge, piece.surface), 1e-12);
          const n = pointOn(piece.surface, piece.charge).normal, o = piece.surface.center ?? v3(0, 0, 0), local = sub(b.P, o);
          const normal = piece.surface.kind === 'pillbox' ? n : piece.surface.kind === 'sphere' ? v3(local.x / norm(local), local.y / norm(local), local.z / norm(local)) : v3(local.x / Math.hypot(local.x, local.y), local.y / Math.hypot(local.x, local.y), 0);
          close(dot(piece.fieldAtP, normal), piece.enclosed / EPS0 / crossedArea(piece.surface, piece.charge), 1e-9);
          expect(Math.sign(piece.enclosed)).toBe(i ? -sign : sign);
          // P is on the piece's surface.
          if (piece.surface.kind === 'sphere') close(norm(local), piece.surface.r, 1e-12);
        });
        const sum = b.pieces.reduce((e, p) => v3(e.x + p.fieldAtP.x, e.y + p.fieldAtP.y, e.z + p.fieldAtP.z), v3(0, 0, 0));
        close(norm(sub(sum, b.fieldAtP)), 0, 1e-9);
        for (const [i, piece] of b.pieces.entries()) if (piece.surface) {
          const zero = new Set(b.patches.filter(p => (p.piece ?? 0) === i && p.zero).map(p => p.part));
          expect(new Set(slice(piece.charge, piece.surface).filter(s => s.zero).map(s => s.part))).toEqual(zero);
        }
        const order = b.slice.map(s => s.zero);
        expect(order.indexOf(true) === -1 || order.slice(order.indexOf(true)).every(Boolean)).toBe(true);
        continue;
      }
      close(drawnFlux(b), enclosedCharge(b.charge, b.surface) / EPS0, 1e-9);
      if (b.answerAtP) {
      // The field at P is the solved one, along the normal, with the charge's sign.
      close(dot(b.fieldAtP, b.normalAtP), solvedField(b.charge, b.surface), 1e-12);
      // With the charge inside's sign: zero where the surface encloses nothing (in metal, in a hollow shell, outside a cable).
      const inside = enclosedCharge(b.charge, b.surface);
      expect(Math.sign(dot(b.fieldAtP, b.normalAtP)) || 0).toBe(Math.abs(inside) > 1e-12 ? Math.sign(inside) : 0);
      if (Math.abs(inside) > 1e-12) expect(Math.sign(inside)).toBe(sign);
      } else {
        // A charge off the centre: no field at P is solved for, and the run ends on the flux.
        expect(b.charge.kind).toBe('offset');
      }
      // The cross-section's segments carry the same zero parts as the patches, and are in the run's order.
      const zero = new Set(b.patches.filter(p => p.zero).map(p => p.part));
      expect(new Set(slice(b.charge, b.surface).filter(s => s.zero).map(s => s.part))).toEqual(zero);
      const order = b.slice.map(s => s.zero);
      expect(order.indexOf(true) === -1 || order.slice(order.indexOf(true)).every(Boolean)).toBe(true);
    }
  });
  it('at rest shows the whole picture, and each stage keeps what the stages before it built', () => {
    expect(lookAt(null)).toEqual(REST);
    expect(lookAt({key: 'symmetry', progress: 1}).surface).toBe(0);
    expect(lookAt({key: 'left', progress: .5}).sweep).toBe(.5);
    expect(lookAt({key: 'right', progress: 0}).sweep).toBe(1);
    expect(lookAt({key: 'solve', progress: .3}).enclosed).toBe(1);
  });
});

/* LINES AND CYLINDERS, SHEETS AND SLABS, CONDUCTORS: each answer the board writes, against the field the figure
 * draws, both signs; the agreement with the integral lessons' own sums; the continuity and the jumps the checks
 * name; and the two instruments' physics. k = 1, so ε₀ = 1/(4π), and every charge is of unit size. */
const at = (c: Charge, x: number, y = 0, z = 0) => fieldAt(c, v3(x, y, z));
describe('the closed forms of Lines and cylinders, Sheets and slabs and Conductors, both signs', () => {
  for (const s of SIGNS) it(`are the board’s answers (${s > 0 ? '+' : '−'})`, () => {
    const lambda = s, sigma = s, rho = s, q = s, Q = s;
    // The line: λ/(2πε₀r), which is 2kλ/r.
    for (const r of [.3, 1, 2.4]) close(at({kind: 'line', sign: s, size: 0}, r, 0, .7).x, lambda / (2 * Math.PI * EPS0 * r), 1e-12);
    // The solid rod: λr/(2πε₀R²) inside, λ/(2πε₀r) outside, along any radius.
    const rod: Charge = {kind: 'rod', sign: s, size: 1.3};
    for (const r of [.2, .9, 1.29]) close(at(rod, 0, r, -.4).y, lambda * r / (2 * Math.PI * EPS0 * 1.3 ** 2), 1e-12);
    for (const r of [1.31, 2, 3]) close(at(rod, 0, r).y, lambda / (2 * Math.PI * EPS0 * r), 1e-12);
    // ρ = λ/(πR²): inside, ρr/(2ε₀), against a ball's ρr/(3ε₀).
    close(at(rod, .7).x, rho / (Math.PI * 1.3 ** 2) * .7 / (2 * EPS0), 1e-12);
    // The shell: nothing inside, the line's outside.
    const tube: Charge = {kind: 'tube', sign: s, size: 1};
    expect(norm(at(tube, .3, .5, 2))).toBe(0);
    close(at(tube, 1.6).x, lambda / (2 * Math.PI * EPS0 * 1.6), 1e-12);
    // The coaxial pair: only between.
    const coax: Charge = {kind: 'coax', sign: s, size: .8, outer: 1.7};
    expect(norm(at(coax, .5))).toBe(0); expect(norm(at(coax, 2.2))).toBe(0);
    close(at(coax, 1.2).x, lambda / (2 * Math.PI * EPS0 * 1.2), 1e-12);
    // The slab: ρz/ε₀ inside, ρa/ε₀ outside; the sheet σ/(2ε₀) at every height.
    const slab: Charge = {kind: 'slab', sign: s, size: .6};
    close(at(slab, 0, 0, .25).z, rho * .25 / EPS0, 1e-12); close(at(slab, 0, 0, 1.4).z, rho * .6 / EPS0, 1e-12); close(at(slab, 0, 0, -1.4).z, -rho * .6 / EPS0, 1e-12);
    for (const z of [.1, 1, 5]) close(at({kind: 'sheet', sign: s, size: 0}, 0, 0, z).z, sigma / (2 * EPS0), 1e-12);
    // The capacitor: σ/ε₀ between, from the σ plate toward the −σ one; nothing outside.
    const plates: Charge = {kind: 'plates', sign: s, size: 1.2};
    for (const z of [-.1, -.6, -1.1]) close(at(plates, .3, -.2, z).z, -sigma / EPS0, 1e-12);
    for (const z of [.2, 2, -1.3, -3]) expect(norm(at(plates, 0, 0, z))).toBe(0);
    // A conductor's face: σ/ε₀ just outside, square to it; nothing in the metal.
    close(at({kind: 'face', sign: s, size: 0}, .4, .1, .05).z, sigma / EPS0, 1e-12);
    expect(norm(at({kind: 'face', sign: s, size: 0}, 0, 0, -.3))).toBe(0);
    // The metal ball: nothing in the metal, kQ/r² outside; σ/ε₀ just outside its surface.
    const metal: Charge = {kind: 'metal', sign: s, size: 1};
    expect(norm(at(metal, .3, .4, .5))).toBe(0);
    close(at(metal, 2.5).x, Q / (4 * Math.PI * EPS0 * 2.5 ** 2), 1e-12);
    close(at(metal, 1 + 1e-9).x, Q / (4 * Math.PI * 1 ** 2) / EPS0, 1e-6);
    // A charge in a hollow: q's field in the hollow and outside, none in the metal.
    const cavity: Charge = {kind: 'cavity', sign: s, size: .65, outer: 1.35};
    close(at(cavity, .4).x, q / (4 * Math.PI * EPS0 * .4 ** 2), 1e-12); expect(norm(at(cavity, 1))).toBe(0); close(at(cavity, 0, 0, 2).z, q / (4 * Math.PI * EPS0 * 4), 1e-12);
  });

  it('agree with the integral lessons’ own sums: the Infinite line’s 2kλ/r and the Infinite sheet’s σ/2ε₀', () => {
    for (const charge of [3, -3]) for (const distance of [.05, .2, .6]) {
      const p = {distance, size: 1, charge, phi: 0, element: 0, slices: 0, continuum: 0} as Params, lambda = charge * 1e-9;
      // The integral lesson adds Coulomb's law over the line's pieces; Gauss's law says λ/(2πε₀r).
      close(REGISTRY.infinite.quadrature(p, 20000).x, lambda / (2 * Math.PI * SI_EPS0 * distance), 1e-6);
      close(REGISTRY.sheet.quadrature(p, 40000).z, lambda / (2 * SI_EPS0), 2e-3);
      // And the figure's field, in its own units, has the same shape: 2kλ/r.
      close(at({kind: 'line', sign: Math.sign(charge) as 1 | -1, size: 0}, distance).x * distance, Math.sign(charge) * 2, 1e-12);
    }
  });

  it('are continuous across a volume charge’s edge, and jump by σ/ε₀ across a surface charge', () => {
    const e = 1e-9;
    // Continuous: the rod at R, the slab at its face.
    const rod: Charge = {kind: 'rod', sign: 1, size: 1.3}, slab: Charge = {kind: 'slab', sign: -1, size: .6};
    close(at(rod, 1.3 - e).x, at(rod, 1.3 + e).x, 1e-6); close(at(slab, 0, 0, .6 - e).z, at(slab, 0, 0, .6 + e).z, 1e-6);
    for (const s of SIGNS) {
      // A shell of λ at R holds σ = λ/(2πR): the jump is σ/ε₀.
      const R = 1.1, sigmaShell = s / (2 * Math.PI * R);
      close(at({kind: 'tube', sign: s, size: R}, R + e).x - at({kind: 'tube', sign: s, size: R}, R - e).x, sigmaShell / EPS0, 1e-6);
      // The coaxial pair: the inner shell's σ/ε₀, and the outer shell's −λ gives its own, opposite, σ/ε₀.
      const coax: Charge = {kind: 'coax', sign: s, size: .8, outer: 1.7};
      close(at(coax, .8 + e).x - at(coax, .8 - e).x, s / (2 * Math.PI * .8) / EPS0, 1e-6);
      close(at(coax, 1.7 + e).x - at(coax, 1.7 - e).x, -s / (2 * Math.PI * 1.7) / EPS0, 1e-6);
      // Each capacitor plate: E_z above minus below is that plate's σ over ε₀.
      const plates: Charge = {kind: 'plates', sign: s, size: 1.2};
      close(at(plates, 0, 0, e).z - at(plates, 0, 0, -e).z, s / EPS0, 1e-9);
      close(at(plates, 0, 0, -1.2 + e).z - at(plates, 0, 0, -1.2 - e).z, -s / EPS0, 1e-9);
      // A conductor's face: from nothing to σ/ε₀.
      close(at({kind: 'face', sign: s, size: 0}, 0, 0, e).z - at({kind: 'face', sign: s, size: 0}, 0, 0, -e).z, s / EPS0, 1e-9);
    }
  });

  it('the capacitor is two sheets added, and the cable two shells', () => {
    const sheet = (h: number, sg: 1 | -1) => at({kind: 'sheet', sign: sg, size: 0}, 0, 0, h).z;
    const tube = (R: number, sg: 1 | -1, r: number) => at({kind: 'tube', sign: sg, size: R}, r).x;
    for (const s of SIGNS) {
      // σ at z = 0 plus −σ at z = −d, each a sheet's field about its own plane.
      for (const z of [.7, -.4, -1.5]) close(at({kind: 'plates', sign: s, size: 1.2}, 0, 0, z).z, sheet(z, s) + sheet(z + 1.2, s > 0 ? -1 : 1), 1e-12);
      for (const r of [.4, 1.2, 2.5]) close(at({kind: 'coax', sign: s, size: .8, outer: 1.7}, r).x, tube(.8, s, r) + tube(1.7, s > 0 ? -1 : 1, r), 1e-12);
    }
  });

  it('the one-sided pillboxes cross one face: a conductor’s and a capacitor plate’s', () => {
    const g: Surface = {kind: 'pillbox', r: .85, h: .5};
    for (const kind of ['face', 'plates'] as const) {
      const c: Charge = {kind, sign: 1, size: 1.2};
      close(crossedArea(g, c), Math.PI * .85 ** 2, 1e-12);
      const crossed = patches(g).filter(p => !carriesNothing(c, p));
      expect(new Set(crossed.map(p => p.part))).toEqual(new Set([kind === 'face' ? 'top' : 'bottom']));
    }
    close(crossedArea(g, {kind: 'sheet'}), 2 * Math.PI * .85 ** 2, 1e-12);
  });
});

describe('no arrow is drawn where there is no field', () => {
  for (const lesson of GAUSS_LESSONS) for (const c of lesson.cases) it(`${lesson.id} ${c.key}: arrows stop short of metal, a cable’s outside, a far plate`, () => {
    for (const sign of SIGNS) for (const size of [c.figure.surface.size.min, c.figure.surface.size.initial, c.figure.surface.size.max]) {
      const b = build(c, size, sign);
      // A superposition's patches carry their own piece's field, and are held to it.
      const own = (piece?: number) => (piece !== undefined && b.pieces ? b.pieces[piece].charge : b.charge);
      const arrows = [...b.patches.map(p => ({at: p.center, field: p.field, span: p.span, charge: own(p.piece)})), ...b.slice.map(s => ({at: s.mid, field: s.field, span: s.span ?? 0, charge: own(s.piece)})),
        ...b.spokes.map(s => ({at: s.at, field: s.field, span: s.span ?? 0, charge: b.charge})), ...b.flatSpokes.map(s => ({at: s.at, field: s.field, span: s.span ?? 0, charge: b.charge})), {at: b.P, field: b.fieldAtP, span: b.spanAtP, charge: b.charge},
        ...(b.pieces ?? []).map(p => ({at: b.P, field: p.fieldAtP, span: p.spanAtP, charge: p.charge}))];
      for (const a of arrows) {
        if (norm(a.field) < 1e-12) { expect(a.span).toBe(0); continue; }
        const d = v3(a.field.x / norm(a.field), a.field.y / norm(a.field), a.field.z / norm(a.field));
        for (let k = 0; k <= 20; k++) {
          const e = fieldAt(a.charge, v3(a.at.x + d.x * a.span * k / 20, a.at.y + d.y * a.span * k / 20, a.at.z + d.z * a.span * k / 20));
          expect(norm(e), `${size} ${sign}`).toBeGreaterThan(0);
          expect(dot(e, d)).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('the field-against-distance instrument', () => {
  const cases = GAUSS_LESSONS.filter(l => l.instrument === 'profile').flatMap(l => l.cases);
  for (const c of cases) for (const sign of SIGNS) it(`${c.key} (${sign > 0 ? '+' : '−'}): its dot is the run’s answer, region by region`, () => {
    const s = c.figure.surface;
    for (const x of [s.size.min, s.size.initial, s.size.max]) {
      const b = build(c, x, sign);
      close(fieldAlong(c, sign, x), solvedField(b.charge, b.surface), 1e-12);
    }
    // One region more than the charge has surfaces, each named, and its surfaces lettered.
    const bounds = boundaries(c.figure.charge);
    if (s.regions) { expect(s.regions.length).toBe(bounds.length + 1); expect(c.figure.charge.bounds?.length).toBe(bounds.length); }
    else expect(bounds.length).toBe(0);
    // The curve is split at the surfaces and reaches past the slider's end; its pieces carry the charge's sign.
    const pieces = profile(c, sign);
    expect(pieces.length).toBe(bounds.filter(b => b < profileReach(c)).length + 1);
    expect(profileReach(c)).toBeGreaterThan(s.size.max);
    for (const p of pieces) for (const pt of p.points) expect(pt.e * sign).toBeGreaterThanOrEqual(0);
  });
  it('is flat for the sheet, whatever the height: the answer has no z in it', () => {
    const sheet = gaussLesson('symmetry')!.cases.find(c => c.figure.charge.kind === 'sheet')!;
    for (const v of profile(sheet, 1).flatMap(p => p.points.map(q => q.e))) close(v, 1 / (2 * EPS0), 1e-12);
  });
  it('names the region each size is in', () => {
    const rod = gaussLesson('lines')!.cases.find(c => c.key === 'rod')!, coax = gaussLesson('lines')!.cases.find(c => c.key === 'coax')!;
    expect(regionOf(rod, .5)).toBe(0); expect(regionOf(rod, 1.5)).toBe(1);
    expect([.5, 1.2, 2].map(x => coax.figure.surface.regions![regionOf(coax, x)].name)).toEqual(['inside both shells', 'between the shells', 'outside both shells']);
  });
  it('every case with regions, in every lesson, has them in step with the charge’s surfaces', () => {
    for (const l of GAUSS_LESSONS) for (const c of l.cases) if (c.figure.surface.regions) expect(c.figure.surface.regions.length, `${l.id} ${c.key}`).toBe(boundaries(c.figure.charge).length + 1);
  });
});

describe('the charge-in-a-hollow instrument', () => {
  it('the wall’s density adds up to −q over the wall, wherever q sits, and is even only at the centre', () => {
    const a = 1;
    for (const q of [1, -1]) for (const d of [0, .3, .6, .78]) {
      // ∫σ dA over the sphere of radius a, by the midpoint rule in θ.
      const n = 20000; let total = 0;
      for (let i = 0; i < n; i++) { const th = Math.PI * (i + .5) / n; total += wallDensity(q, d, a, th) * 2 * Math.PI * a * a * Math.sin(th) * Math.PI / n; }
      close(total, -q, 1e-6);
      if (d === 0) close(wallDensity(q, 0, a, .3), wallDensity(q, 0, a, 2.5), 1e-12);
      else expect(Math.abs(wallDensity(q, d, a, 0))).toBeGreaterThan(Math.abs(wallDensity(q, d, a, Math.PI)));
    }
    expect(inducedCharges(1, 0)).toEqual({wall: -1, outer: 1});
    expect(inducedCharges(-1, 2)).toEqual({wall: 1, outer: 1});
  });
  it('the wall’s density is ε₀ times the field there, and the field meets the wall square on: the image solution is right', () => {
    const a = CAVITY.a;
    for (const q of [{x: .4, y: .25}, {x: -.6, y: 0}, {x: 0, y: .7}]) {
      const d = Math.hypot(q.x, q.y), toward = Math.atan2(q.y, q.x);
      for (const th of [0, .7, 1.9, Math.PI]) {
        const t = toward + th, n = {x: Math.cos(t), y: Math.sin(t)}, p = {x: (a - 1e-7) * n.x, y: (a - 1e-7) * n.y};
        const e = cavityField(q, p, a), along = e.x * n.x + e.y * n.y, across = -e.x * n.y + e.y * n.x;
        // Square on: no part along the wall, which is a conductor's surface.
        expect(Math.abs(across)).toBeLessThan(1e-4 * Math.abs(along));
        // σ = ε₀E·n̂ with n̂ out of the metal, into the hollow (toward the centre): −ε₀E_r, for a unit q.
        close(-EPS0 * along, wallDensity(1, d, a, th), 1e-4);
      }
    }
  });
  it('its field lines leave q and every one ends on the wall; its marks crowd where the wall’s charge does', () => {
    for (const q of [{x: .45, y: .2}, {x: CAVITY.reach, y: 0}, {x: -.3, y: -.5}]) {
      const lines = cavityLines(q, 12), marks = wallMarks(q, 12);
      for (const l of lines) { close(Math.hypot(l[0].x - q.x, l[0].y - q.y), 0, 1e-12); close(Math.hypot(l.at(-1)!.x, l.at(-1)!.y), CAVITY.a, 1e-9); }
      // One mark for every line, at its end: no line ends on bare wall, and no mark has no line.
      expect(marks.length).toBe(lines.length);
      lines.forEach((l, i) => { const e = l.at(-1)!; close(Math.cos(Math.atan2(e.y, e.x) - marks[i]), 1, 1e-12); });
      // Both crowd on the charge's side, as the wall's density does.
      const toward = Math.atan2(q.y, q.x), near = marks.filter(t => Math.cos(t - toward) > Math.SQRT1_2).length, far = marks.filter(t => Math.cos(t - toward) < -Math.SQRT1_2).length;
      expect(near).toBeGreaterThan(far);
      expect(Math.abs(wallDensity(1, Math.hypot(q.x, q.y), CAVITY.a, 0))).toBeGreaterThan(Math.abs(wallDensity(1, Math.hypot(q.x, q.y), CAVITY.a, Math.PI)));
      // The charge stays clear of the wall's marks.
      expect(Math.hypot(q.x, q.y)).toBeLessThanOrEqual(CAVITY.reach);
    }
    expect(CAVITY.reach).toBeLessThan(CAVITY.a - .2);
    // The instrument's hollow is the figure's, in proportion.
    const hollow = gaussLesson('conductors')?.cases.find(c => c.key === 'cavity');
    if (hollow) close(CAVITY.b / CAVITY.a, hollow.figure.charge.outer! / hollow.figure.charge.size, 1e-2);
    // At the centre they are even.
    const even = wallMarks({x: 0, y: 0}, 12).map(t => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((x, y) => x - y);
    for (let i = 1; i < even.length; i++) close(even[i] - even[i - 1], 2 * Math.PI / 12, 1e-3);
  });
  it('its readout names the wall’s and the outside’s charges', () => {
    expect(cavityTex(true, false)).toBe(String.raw`q_{\text{wall}}=-q,\qquad q_{\text{outer}}=q`);
    expect(cavityTex(true, true)).toBe(String.raw`q_{\text{wall}}=-q,\qquad q_{\text{outer}}=Q+q`);
    expect(cavityTex(false, false)).toBe(String.raw`q_{\text{wall}}=0,\qquad q_{\text{outer}}=0`);
  });
});

describe('a point charge off the sphere’s centre (Why only the charge inside)', () => {
  /** E·n̂ over a band of the sphere by Simpson’s rule in θ, the field taken from fieldAt alone: independent of bandFlux. */
  const simpson = (c: Charge, R: number, t0: number, t1: number, n = 4000) => {
    const f = (t: number) => { const p = v3(R * Math.sin(t), 0, R * Math.cos(t)); return dot(fieldAt(c, p), v3(Math.sin(t), 0, Math.cos(t))) * 2 * Math.PI * R * R * Math.sin(t); };
    const h = (t1 - t0) / n; let sum = f(t0) + f(t1);
    for (let i = 1; i < n; i++) sum += f(t0 + i * h) * (i % 2 ? 4 : 2);
    return sum * h / 3;
  };
  for (const sign of SIGNS) for (const [d, R] of [[.8, 1.25], [.8, 2.6], [2.15, .8], [2.15, 1.7], [0, 1.3]] as const) it(`d ${d}, r ${R} (${sign > 0 ? '+' : '−'}): q/ε₀ inside, zero outside, band by band`, () => {
    const c: Charge = {kind: 'offset', sign, size: d}, g: Surface = {kind: 'sphere', r: R, h: 0};
    const want = d < R ? sign / EPS0 : 0;
    close(enclosedCharge(c, g) / EPS0, want, 1e-12);
    // By brute force over the whole sphere, from E alone.
    close(simpson(c, R, 0, Math.PI), want, 1e-7);
    close(numericFlux(c, g, 200), want, 3e-3);
    // Each band's closed form against the brute force over that band.
    for (let i = 0; i < 8; i++) { const t0 = Math.PI * i / 8, t1 = Math.PI * (i + 1) / 8; close(bandFlux(sign, d, R, t0, t1), simpson(c, R, t0, t1, 800), 1e-7); }
    // The drawn patches carry their exact share, and add to the flux exactly.
    const ps = patches(g);
    close(ps.reduce((t, p) => t + throughPatch(c, p) * p.area, 0), want, 1e-9);
    // Outside: the patches facing q carry flux against q's sign, those beyond it with it. Inside: all with it.
    for (const p of ps) {
      const t = throughPatch(c, p) * sign;
      if (d < R) expect(t, p.key).toBeGreaterThan(0);
      else if (p.uv[1] <= Math.acos(R / d)) expect(t, p.key).toBeLessThan(0);
      else if (p.uv[0] >= Math.acos(R / d)) expect(t, p.key).toBeGreaterThan(0);
    }
    // The field is nowhere zero on the sphere, inside or out.
    for (const p of ps) expect(norm(fieldAt(c, p.center))).toBeGreaterThan(1e-3);
  });
  it('the instrument’s bands add to q/ε₀ inside and to zero outside, and say so', () => {
    for (let k = 0; k <= 35; k++) {
      const d = k * .06, shares = bandShares(d), total = shares.reduce((t, x) => t + x, 0);
      expect(shares.length).toBe(BANDS);
      close(total, d < 1 ? 1 : 0, 1e-9);
      if (d < 1) for (const x of shares) expect(x).toBeGreaterThan(0);
      else { expect(shares[0]).toBeLessThan(0); expect(shares[BANDS - 1]).toBeGreaterThan(0); }
      expect(insideTex(d)).toBe(d < 1 ? String.raw`\Phi=\frac{q}{\varepsilon_0}` : String.raw`\Phi=0`);
      // Its fluxes are q's: the same shares of q/ε₀ for either sign, and each band's field is the charge's own.
      for (const sign of SIGNS) insideBands(d, sign).forEach((b, i) => {
        close(b.flux * EPS0 * sign, shares[i], 1e-12);
        const e = fieldAt({kind: 'offset', sign, size: d}, b.normal);
        close(b.field.x, e.x, 1e-12); close(b.field.z, e.z, 1e-12);
      });
    }
    // Its slider's steps never land on the sphere, where the charge would be neither inside nor out.
    for (let k = 0; k <= 35; k++) expect(Math.abs(k * .06 - 1)).toBeGreaterThan(.01);
  });
});

describe('Q_enc from a density, and the spheres: every right side against its own integral', () => {
  /** Simpson's rule, for the density integrals: independent of the closed forms. */
  const simpson = (f: (x: number) => number, a: number, b: number, n = 2000) => {
    if (b <= a) return 0;
    const h = (b - a) / n; let sum = f(a) + f(b);
    for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 ? 4 : 2);
    return sum * h / 3;
  };
  const R = 1.1, a = .7;
  /** The densities as the lessons write them, ρ₀ fixed from Q = 1 by integrating over the ball numerically. */
  const shapes: Record<'ball' | 'rising' | 'falling', (r: number) => number> = {ball: () => 1, rising: r => r / R, falling: r => 1 - r / R};
  const rho0 = (k: keyof typeof shapes) => 1 / simpson(r => shapes[k](r) * 4 * Math.PI * r * r, 0, R);
  it('normalises ρ₀ as the boards say: Q/(4/3 πR³), Q/πR³, 3Q/πR³', () => {
    close(rho0('ball'), 3 / (4 * Math.PI * R ** 3), 1e-9);
    close(rho0('rising'), 1 / (Math.PI * R ** 3), 1e-9);
    close(rho0('falling'), 3 / (Math.PI * R ** 3), 1e-9);
    // The instrument's densities are the same, in units of R and Q.
    close(density('uniform', .4), 3 / (4 * Math.PI), 1e-12); close(density('rising', .4), .4 / Math.PI, 1e-12); close(density('falling', .4), .6 * 3 / Math.PI, 1e-12);
  });
  for (const kind of ['ball', 'rising', 'falling'] as const) for (const sign of SIGNS) it(`${kind} (${sign > 0 ? '+' : '−'}): Q_enc by shells, the flux, E inside and out, continuous at R`, () => {
    const c: Charge = {kind, sign, size: R}, r0 = rho0(kind);
    for (const r of [.35, .6, .8, 1, R * .999, R, 1.3, 2.2]) {
      const g: Surface = {kind: 'sphere', r, h: 0};
      const shells = sign * simpson(x => r0 * shapes[kind](x) * 4 * Math.PI * x * x, 0, Math.min(r, R));
      close(enclosedCharge(c, g), shells, 1e-9);
      // The left side by brute force, from E alone.
      close(numericFlux(c, g, 120), shells / EPS0, 1e-6);
      // And the closed forms the boards write: kQr/R³, kQ(4r − 3r²/R)/R³, kQr²/R⁴ inside; kQ/r² outside.
      const inside = kind === 'ball' ? r / R ** 3 : kind === 'rising' ? r * r / R ** 4 : (4 * r - 3 * r * r / R) / R ** 3;
      close(fieldAt(c, v3(r, 0, 0)).x, sign * (r <= R ? inside : 1 / (r * r)), 1e-12);
    }
    // Continuous at R, from either side.
    close(fieldAt(c, v3(R * (1 - 1e-9), 0, 0)).x, fieldAt(c, v3(R * (1 + 1e-9), 0, 0)).x, 1e-6);
  });
  it('the falling ball’s field peaks inside, at 2R/3, at four thirds of kQ/R², and the outer half of the radius holds most of the charge', () => {
    const c: Charge = {kind: 'falling', sign: 1, size: R};
    let best = 0, at = 0;
    for (let i = 1; i <= 4000; i++) { const r = R * i / 4000, e = fieldAt(c, v3(r, 0, 0)).x; if (e > best) { best = e; at = r; } }
    close(at, 2 * R / 3, 1e-3);
    close(best, 4 / 3 / (R * R), 1e-6);
    expect(1 - ballFraction('falling', R / 2, R)).toBeGreaterThan(.5);
  });
  for (const sign of SIGNS) it(`the shell (${sign > 0 ? '+' : '−'}): nothing inside and no field there, all of Q outside, a jump of σ/ε₀`, () => {
    const c: Charge = {kind: 'shell', sign, size: R};
    for (const r of [.45, .8, 1.05]) { close(numericFlux(c, {kind: 'sphere', r, h: 0}, 60), 0, 1e-12); for (const p of patches({kind: 'sphere', r, h: 0})) expect(norm(fieldAt(c, p.center))).toBe(0); }
    for (const r of [1.2, 2.4]) close(numericFlux(c, {kind: 'sphere', r, h: 0}, 60), sign / EPS0, 1e-9);
    const sigma = 1 / (4 * Math.PI * R * R);
    close(fieldAt(c, v3(R * (1 + 1e-12), 0, 0)).x - fieldAt(c, v3(R * (1 - 1e-12), 0, 0)).x, sign * sigma / EPS0, 1e-9);
  });
  for (const sign of SIGNS) it(`the tent slab (${sign > 0 ? '+' : '−'}): Q_enc by slices doubled, E inside and out, continuous at a, a sheet from outside`, () => {
    const c: Charge = {kind: 'tent', sign, size: a};
    for (const z of [.2, .45, .69, a, .9, 1.5]) {
      const g: Surface = {kind: 'pillbox', r: .85, h: z}, A = Math.PI * .85 * .85;
      // Slices from −z to z, the absolute value and all, by brute force.
      const slices = sign * simpson(t => (Math.abs(t) <= a ? 1 - Math.abs(t) / a : 0) * A, -z, z, 4000);
      close(enclosedCharge(c, g), slices, 1e-6);
      close(numericFlux(c, g, 80), slices / EPS0, 1e-6);
      // (ρ₀/ε₀)(z − z²/2a) inside, ρ₀a/2ε₀ outside; mirrored below.
      const want = z <= a ? (z - z * z / (2 * a)) / EPS0 : a / (2 * EPS0);
      close(fieldAt(c, v3(.3, -.2, z)).z, sign * want, 1e-12);
      close(fieldAt(c, v3(.3, -.2, -z)).z, -sign * want, 1e-12);
    }
    close(fieldAt(c, v3(0, 0, a * (1 - 1e-9))).z, fieldAt(c, v3(0, 0, a * (1 + 1e-9))).z, 1e-6);
    // From outside, a sheet of the slab's whole charge per area, ρ₀a: σ/2ε₀.
    close(fieldAt(c, v3(0, 0, 3)).z, sign * (a / 2) / EPS0, 1e-12);
  });
});

describe('Shell by shell, the Q_enc instrument', () => {
  it('fills to the charge inside: its shells’ charge integrates to the fraction, all of Q once past R', () => {
    for (const p of ['uniform', 'rising', 'falling'] as const) for (const x of [.1, .5, .8, 1, 1.3]) {
      let sum = 0; const n = 4000, top = Math.min(x, 1);
      for (let i = 0; i < n; i++) sum += shellCharge(p, (i + .5) * top / n) * top / n;
      close(sum, qencFraction(p, x), 1e-6);
      if (x >= 1) close(qencFraction(p, x), 1, 1e-12);
    }
  });
  it('writes its readout for where the sphere is, and the mistake as not a charge', () => {
    expect(qencTex('falling', .5).integral).toBe(String.raw`Q_{\text{enc}}=\int_0^{r}\rho_0\Big(1-\frac{r'}{R}\Big)4\pi r'^2\,dr'=Q\Big(\frac{4r^3}{R^3}-\frac{3r^4}{R^4}\Big)`);
    expect(qencTex('rising', 1.2).integral).toBe(String.raw`Q_{\text{enc}}=\int_0^{R}\rho_0\frac{r'}{R}\,4\pi r'^2\,dr'=Q`);
    expect(qencTex('uniform', .5, true).integral).toContain(String.raw`\neq Q_{\text{enc}}`);
    for (const p of ['uniform', 'rising', 'falling'] as const) for (const x of [.5, 1.2]) for (const m of [false, true]) {
      const t = qencTex(p, x, m);
      for (const s of [t.density, t.integral]) expect(() => katex.renderToString(s, {throwOnError: true, strict: 'error'}), s).not.toThrow();
    }
  });
});

describe('The field against r, the spheres instrument', () => {
  it('draws one curve outside R and four inside, for either sign', () => {
    for (const sign of SIGNS) {
      for (const r of [1.2, 1.7, 2.4]) for (const k of SPHERE_KINDS) close(fieldOf(k, r, sign), sign / (r * r), 1e-12);
      for (const r of [.3, .7]) {
        close(fieldOf('shell', r, sign), 0, 1e-12);
        close(fieldOf('ball', r, sign), sign * r, 1e-12);
        close(fieldOf('rising', r, sign), sign * r * r, 1e-12);
        close(fieldOf('point', r, sign), sign / (r * r), 1e-12);
      }
    }
  });
});

/* HOLES BY SUPERPOSITION: a charge with a hole is the whole charge plus a plug of the opposite charge, and every
 * field the lesson draws is checked against a brute-force sum over the real, holed charge; the disc the sheet's hole
 * takes away against a sum over its area; the field in the hole against ρd⃗/(nε₀); both signs. ρ = σ = 1 here. */
describe('holes by superposition', () => {
  const ball = (s: 1 | -1): Charge => ({kind: 'ballhole', sign: s, size: 1.7, hole: {radius: .6, at: v3(.702, 0, .384)}, amount: 4 / 3 * Math.PI * 1.7 ** 3});
  const rod = (s: 1 | -1): Charge => ({kind: 'rodhole', sign: s, size: 1.75, hole: {radius: .65, at: v3(.85, 0, 0)}, amount: Math.PI * 1.75 ** 2});
  const sheet = (s: 1 | -1): Charge => ({kind: 'sheethole', sign: s, size: 0, hole: {radius: 1, at: v3(0, 0, 0)}});
  it('the elliptic integrals and a ring’s field are exact', () => {
    // K and E against the midpoint rule.
    for (const m of [.1, .5, .9]) {
      let K = 0, E = 0; const n = 200000;
      for (let i = 0; i < n; i++) { const t = Math.PI / 2 * (i + .5) / n, s = Math.sqrt(1 - m * Math.sin(t) ** 2); K += Math.PI / 2 / n / s; E += Math.PI / 2 / n * s; }
      close(elliptic(m).K, K, 1e-8); close(elliptic(m).E, E, 1e-8);
    }
    // A ring against its charge summed round it.
    for (const [a, s, z] of [[1, .5, .3], [1, 1.5, -.2], [.7, .2, .9]]) {
      let es = 0, ez = 0; const n = 20000;
      for (let i = 0; i < n; i++) { const t = 2 * Math.PI * (i + .5) / n, dx = s - a * Math.cos(t), dy = -a * Math.sin(t), r = Math.hypot(dx, dy, z); es += dx / r ** 3 / n; ez += z / r ** 3 / n; }
      const f = ringField(1, a, s, z); close(f.s, es, 1e-9); close(f.z, ez, 1e-9);
    }
  });
  it('the disc’s field, off its axis and on it, against a sum over its area, and the Disk lesson’s closed form', () => {
    for (const p of [v3(.3, .1, .4), v3(1.4, 0, .3), v3(.9, .2, -.25)]) {
      const e = {x: 0, y: 0, z: 0}, nr = 500, nt = 500;
      for (let i = 0; i < nr; i++) { const a = (i + .5) / nr; for (let j = 0; j < nt; j++) { const t = 2 * Math.PI * (j + .5) / nt, dA = a / nr * 2 * Math.PI / nt, dx = p.x - a * Math.cos(t), dy = p.y - a * Math.sin(t), r = Math.hypot(dx, dy, p.z); e.x += dA * dx / r ** 3; e.y += dA * dy / r ** 3; e.z += dA * p.z / r ** 3; } }
      const f = diskField(1, p);
      close(f.x, e.x, 2e-4); close(f.y, e.y, 2e-4); close(f.z, e.z, 2e-4);
    }
    // On the axis: 2πkσ(1 − z/√(z² + b²)), which is σ/(2ε₀)(1 − z/√(z² + b²)).
    for (const z of [.2, .7, 2]) close(diskField(1.3, v3(0, 0, z)).z, (1 / (2 * EPS0)) * (1 - z / Math.hypot(z, 1.3)), 1e-12);
    // Just off the axis it agrees with on it.
    close(diskField(1, v3(1e-6, 0, .5)).z, diskField(1, v3(0, 0, .5)).z, 1e-6);
  });
  it('the field in a ball’s hole is ρd⃗/(3ε₀), the same everywhere in it, both signs; and in a rod’s, ρd⃗/(2ε₀)', () => {
    for (const s of SIGNS) {
      const d = v3(.702, 0, .384);
      for (const p of [v3(.5, 0, .3), v3(.9, .1, .5), v3(.702, -.3, .384), v3(.4, .2, .2)]) {
        const e = fieldAt(ball(s), p);
        close(e.x, s * d.x / (3 * EPS0), 1e-12); close(e.y, 0, 1e-12); close(e.z, s * d.z / (3 * EPS0), 1e-12);
      }
      for (const p of [v3(1.1, 0, .4), v3(.7, .3, -1), v3(1.3, -.2, 2)]) {
        const e = fieldAt(rod(s), p);
        close(e.x, s * .85 / (2 * EPS0), 1e-12); close(e.y, 0, 1e-12); close(e.z, 0, 1e-12);
      }
    }
  });
  it('the ball with a hole, against a brute-force sum over its holed volume, in the hole, in the charge and outside', () => {
    const c = ball(1), h = .05, pts = [v3(.6, .1, .25), v3(-.9, .3, -.4), v3(2.4, .5, 1.1)];
    const sums = pts.map(() => v3(0, 0, 0));
    for (let x = -1.7 + h / 2; x < 1.7; x += h) for (let y = -1.7 + h / 2; y < 1.7; y += h) for (let z = -1.7 + h / 2; z < 1.7; z += h) {
      if (x * x + y * y + z * z > 1.7 ** 2 || (x - .702) ** 2 + y * y + (z - .384) ** 2 < .36) continue;
      pts.forEach((p, i) => { const dx = p.x - x, dy = p.y - y, dz = p.z - z, r = Math.hypot(dx, dy, dz), q = h ** 3 / r ** 3; sums[i] = v3(sums[i].x + q * dx, sums[i].y + q * dy, sums[i].z + q * dz); });
    }
    pts.forEach((p, i) => { const e = fieldAt(c, p); expect(norm(sub(e, sums[i])) / norm(e)).toBeLessThan(2e-2); });
  }, 20000);
  it('the rod with a hole, against a brute-force sum of lines over its holed cross-section', () => {
    const c = rod(-1), h = .01, pts = [v3(1, .1, 0), v3(-1, .4, 0), v3(2.5, -1, 0)];
    const sums = pts.map(() => v3(0, 0, 0));
    for (let x = -1.75 + h / 2; x < 1.75; x += h) for (let y = -1.75 + h / 2; y < 1.75; y += h) {
      if (x * x + y * y > 1.75 ** 2 || (x - .85) ** 2 + y * y < .65 ** 2) continue;
      // A line of λ = −h² per unit length: −2h²/s along ŝ.
      pts.forEach((p, i) => { const dx = p.x - x, dy = p.y - y, s2 = dx * dx + dy * dy; sums[i] = v3(sums[i].x - 2 * h * h * dx / s2, sums[i].y - 2 * h * h * dy / s2, 0); });
    }
    pts.forEach((p, i) => { const e = fieldAt(c, p); expect(norm(sub(e, sums[i])) / norm(e)).toBeLessThan(1e-2); });
  });
  it('the sheet with a hole on its axis is σz/(2ε₀√(z² + b²)), both signs; zero in the hole’s plane', () => {
    for (const s of SIGNS) for (const z of [.25, .6, 1.6, -.8]) close(fieldAt(sheet(s), v3(0, 0, z)).z, s * z / (2 * EPS0 * Math.hypot(z, 1)), 1e-12);
    expect(Math.abs(fieldAt(sheet(1), v3(0, 0, 1e-9)).z)).toBeLessThan(1e-6);
  });
  it('the real flux through a surface about the whole charge’s centre is the real charge it holds: the shared volumes are right', () => {
    for (const s of SIGNS) {
      for (const r of [.5, 1.1, 1.4, 2.2]) close(numericFlux(ball(s), {kind: 'sphere', r, h: 0}, 120) * EPS0, enclosedCharge(ball(s), {kind: 'sphere', r, h: 0}), 1e-4);
      for (const r of [.5, 1.2, 2]) close(numericFlux(rod(s), {kind: 'cylinder', r, h: .8}, 120) * EPS0, enclosedCharge(rod(s), {kind: 'cylinder', r, h: .8}), 1e-4);
      // A pillbox in the sheet's hole holds nothing, though the field crosses it; one wider than the hole holds the ring round it.
      for (const r of [.5, 1.4]) close(numericFlux(sheet(s), {kind: 'pillbox', r, h: .5}, 40) * EPS0, enclosedCharge(sheet(s), {kind: 'pillbox', r, h: .5}), 2e-4);
    }
    close(enclosedCharge(sheet(1), {kind: 'pillbox', r: .5, h: .5}), 0, 1e-12);
    // The shared volume and area against their limits.
    close(lensVolume(1, .5, 0), 4 / 3 * Math.PI * .125, 1e-12); expect(lensVolume(1, .5, 1.6)).toBe(0);
    close(lensArea(1, 1, 0), Math.PI, 1e-12); expect(lensArea(1, .5, 1.6)).toBe(0);
    // Half-overlapping equal discs: 2r²acos(d/2r) − (d/2)√(4r² − d²).
    close(lensArea(1, 1, 1), 2 * Math.acos(.5) - .5 * Math.sqrt(3), 1e-12);
  }, 20000);
  it('splits into the whole charge and a plug of the opposite sign and the same density', () => {
    for (const s of SIGNS) {
      const [whole, plug] = piecesOf(ball(s))!;
      expect(whole.sign).toBe(s); expect(plug.sign).toBe(-s);
      // Same density: amount over volume is the same for both.
      close(whole.amount! / whole.size ** 3, plug.amount! / plug.size ** 3, 1e-12);
    }
    expect(piecesOf({kind: 'ball', sign: 1, size: 1})).toBeNull();
  });
  it('the instrument’s field is the ball’s or the rod’s with its hole, cut through both centres: uniform in the hole', () => {
    const hole = {x: .3, y: .2};
    for (const s of SIGNS) for (const shape of ['ball', 'rod'] as const) {
      for (const p of [{x: .3, y: .2}, {x: .5, y: .1}, {x: .2, y: .45}]) { const e = holeField(shape, hole, p, s); close(e.x, s * .3, 1e-12); close(e.y, s * .2, 1e-12); }
      // Its pieces add to it, anywhere.
      for (const p of [{x: -.6, y: .3}, {x: 1.2, y: -.4}, {x: .4, y: .3}]) { const [a, b] = holePieces(shape, hole, p, s), e = holeField(shape, hole, p, s); close(a.x + b.x, e.x, 1e-12); close(a.y + b.y, e.y, 1e-12); }
    }
    // Against the figure's own field, in units of ρR/(nε₀): a ball of R = 1 with ρ = 1 has ρ/(3ε₀) = 4π/3.
    const c: Charge = {kind: 'ballhole', sign: 1, size: 1, hole: {radius: HOLE.b, at: v3(.3, 0, .2)}, amount: 4 / 3 * Math.PI};
    for (const p of [{x: -.6, y: .3}, {x: 1.2, y: -.4}, {x: .4, y: .3}]) { const e = fieldAt(c, v3(p.x, 0, p.y)), f = holeField('ball', {x: .3, y: .2}, p); close(e.x, f.x * 4 * Math.PI / 3, 1e-9); close(e.z, f.y * 4 * Math.PI / 3, 1e-9); }
    // The hole stays inside the charge, and the readout names the factor.
    const far = holeAt({x: 3, y: 0}); expect(far.x + HOLE.b).toBeLessThan(1);
    expect(holeTex('ball', false)).toContain('3\\varepsilon_0'); expect(holeTex('rod', false)).toContain('2\\varepsilon_0'); expect(holeTex('ball', true)).toContain('=0');
  });
});
describe('holes by superposition: the figure adds the pieces honestly', () => {
  const holes = gaussLesson('holes');
  for (const c of holes?.cases ?? []) for (const sign of SIGNS) it(`${c.key} (${sign > 0 ? '+' : '−'}): the pieces' arrows at P add, tip to tail, to the answer's, on one scale, and no arrow is cut short`, () => {
    const s = c.figure.surface.size;
    for (let k = 0; k <= 20; k++) {
      const size = s.min + (s.max - s.min) * k / 20, b = build(c, size, sign);
      const chain = chainOf(b), last = chain[chain.length - 1];
      const end = v3(last.from.x + last.dir.x * last.length, last.from.y + last.dir.y * last.length, last.from.z + last.dir.z * last.length);
      // The chain's sideways step, where the two lie along one line, is the only gap between its end and the answer's tip.
      const sideways = chain.reduce((t, l, i) => { const prev = i ? chain[i - 1] : null, start = prev ? v3(prev.from.x + prev.dir.x * prev.length, prev.from.y + prev.dir.y * prev.length, prev.from.z + prev.dir.z * prev.length) : b.P; return v3(t.x + l.from.x - start.x, t.y + l.from.y - start.y, t.z + l.from.z - start.z); }, v3(0, 0, 0));
      const tip = v3(b.P.x + b.fieldAtP.x / norm(b.fieldAtP) * b.spanAtP + sideways.x, b.P.y + b.fieldAtP.y / norm(b.fieldAtP) * b.spanAtP + sideways.y, b.P.z + b.fieldAtP.z / norm(b.fieldAtP) * b.spanAtP + sideways.z);
      expect(norm(sub(end, tip))).toBeLessThan(1e-9);
      for (const p of b.pieces!) close(p.spanAtP, arrowLength(c, norm(p.fieldAtP)), 1e-12);
      close(b.spanAtP, arrowLength(c, norm(b.fieldAtP)), 1e-12);
      // Never held to the figure's longest or shortest arrow, so the scale is linear.
      for (const l of [...b.pieces!.map(p => p.spanAtP), b.spanAtP]) { expect(l).toBeLessThan(1.6); expect(l).toBeGreaterThan(.06); }
      // Every patch that carries flux keeps its full length: none runs past where its own piece's field turns round.
      for (const p of b.patches.filter(q => !q.zero)) close(p.span, arrowLength(c, norm(p.field)), 1e-9);
    }
  });
});
