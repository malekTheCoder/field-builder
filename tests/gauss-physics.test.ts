import {describe, expect, it} from 'vitest';
import {EPS0, carriesNothing, crossedArea, dot, enclosedCharge, fieldAt, norm, numericFlux, patches, solvedField, starFlux, surfacePoint, sub, v3, type Charge, type Surface} from '../src/gauss/physics';
import {build, drawnFlux, lookAt, REST, slice} from '../src/gauss/scene';
import {CANDIDATES, MOVES, START, blob, enclosedOf, fluxTex, flowRound, isInside, moveBy, proposed, samples, survives, type Charged} from '../src/gauss/instruments';
import {GAUSS_LESSONS} from '../src/gauss';
/* THE GAUSS LESSONS' PHYSICS, HELD TO NUMBERS. Every closed form the board writes, every arrow the figure draws
 * and every patch it lights as zero comes from src/gauss/physics.ts; here each is checked against a numerical flux
 * integral or the definition it stands for, for both signs of the charge and across the sliders' ranges. */
const close = (a: number, b: number, rel = 1e-6) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
const SIGNS = [1, -1] as const;
const CASES: [Charge['kind'], number, Surface][] = [
  ['point', 0, {kind: 'sphere', r: 1.7, h: 0}], ['ball', 1, {kind: 'sphere', r: 2.3, h: 0}], ['ball', 1, {kind: 'sphere', r: .6, h: 0}],
  ['shell', 1, {kind: 'sphere', r: .6, h: 0}], ['shell', 1, {kind: 'sphere', r: 1.6, h: 0}], ['line', 0, {kind: 'cylinder', r: 1.3, h: 1.1}],
  ['sheet', 0, {kind: 'pillbox', r: .9, h: .8}], ['slab', .5, {kind: 'pillbox', r: .9, h: .3}], ['slab', .5, {kind: 'pillbox', r: .9, h: 1.2}],
];

describe('Gauss’s law, numerically, for every distribution and both signs', () => {
  for (const [kind, size, g] of CASES) for (const sign of SIGNS) it(`${kind} in a ${g.kind} (${sign > 0 ? '+' : '−'})`, () => {
    const c: Charge = {kind, sign, size};
    // The left side by brute force equals the right side over ε₀.
    close(numericFlux(c, g, 120), enclosedCharge(c, g) / EPS0, 1e-6);
    // The solve gives the field's component on the crossed part, exactly.
    const P = g.kind === 'pillbox' ? v3(0, 0, g.h) : v3(g.r, 0, 0), n = g.kind === 'pillbox' ? v3(0, 0, 1) : v3(1, 0, 0);
    close(solvedField(c, g), dot(fieldAt(c, P), n), 1e-12);
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
      // The field at P is the solved one, along the normal, with the charge's sign.
      close(dot(b.fieldAtP, b.normalAtP), solvedField(b.charge, b.surface), 1e-12);
      expect(Math.sign(dot(b.fieldAtP, b.normalAtP))).toBe(sign);
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
