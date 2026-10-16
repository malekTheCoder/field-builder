import {describe, expect, it} from 'vitest';
import {EPS0, bandFlux, boundaries, carriesNothing, crossedArea, dot, enclosedCharge, fieldAt, inducedCharges, norm, numericFlux, patches, pointOn, solvedField, starFlux, surfacePoint, sub, throughPatch, v3, wallDensity, type Charge, type Surface} from '../src/gauss/physics';
import {build, drawnFlux, lookAt, REST, slice} from '../src/gauss/scene';
import {BANDS, CANDIDATES, CAVITY, MOVES, START, bandShares, blob, cavityField, cavityLines, cavityTex, enclosedOf, fieldAlong, fluxTex, flowRound, insideBands, insideTex, isInside, moveBy, profile, profileReach, proposed, regionOf, samples, survives, wallMarks, type Charged} from '../src/gauss/instruments';
import {GAUSS_LESSONS, gaussLesson} from '../src/gauss';
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
      const arrows = [...b.patches.map(p => ({at: p.center, field: p.field, span: p.span})), ...b.slice.map(s => ({at: s.mid, field: s.field, span: s.span ?? 0})),
        ...b.spokes.map(s => ({at: s.at, field: s.field, span: s.span ?? 0})), ...b.flatSpokes.map(s => ({at: s.at, field: s.field, span: s.span ?? 0})), {at: b.P, field: b.fieldAtP, span: b.spanAtP}];
      for (const a of arrows) {
        if (norm(a.field) < 1e-12) { expect(a.span).toBe(0); continue; }
        const d = v3(a.field.x / norm(a.field), a.field.y / norm(a.field), a.field.z / norm(a.field));
        for (let k = 0; k <= 20; k++) {
          const e = fieldAt(b.charge, v3(a.at.x + d.x * a.span * k / 20, a.at.y + d.y * a.span * k / 20, a.at.z + d.z * a.span * k / 20));
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
