import {describe, expect, it} from 'vitest';
import {REGISTRY, K} from '../src/distributions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {getProblem} from '../src/problems/definitions';
import {lessonFor} from '../src/lessons';
import {bank as sheet} from '../src/quiz/bank/sheet';
import {bank as semi} from '../src/quiz/bank/semi';
import {bank as shell} from '../src/quiz/bank/shell';
import {bank as ramp} from '../src/quiz/bank/ramp';
import {bank as bisector} from '../src/quiz/bank/bisector';
import {limitPlot} from '../src/symbolic/physics';

/* A formula can pass its numerical check while the sentence teaching its sign is false.
 * These tests put negative charge through the concrete claim, then hold the authored explanation
 * to that claim. This catches the regressions that a closed-form-versus-quadrature suite cannot. */
const fields = (id: Parameters<typeof getProblem>[0]) => getProblem(id).steps.flatMap(s => s.fields ?? []);
const plain = (id: Parameters<typeof lessonFor>[0]) => JSON.stringify(lessonFor(id)).replaceAll('\u00a0', ' ');
const qText = (q: {explanation: string; choices: unknown[]}) => JSON.stringify(q).replaceAll('\u00a0', ' ');

describe('round sixteen: the integral lesson’s words agree with its signed physics', () => {
  it('the sheet’s equal-angle pieces grow in magnitude, even though negative signed components decrease', () => {
    for (const charge of [-5, 5]) {
      const pieces = REGISTRY.sheet.sample({...DEFAULT_PARAMS, charge}, 30);
      for (let i = 1; i < pieces.length; i++) {
        expect(Math.abs(pieces[i].field.z)).toBeGreaterThan(Math.abs(pieces[i - 1].field.z));
        expect(Math.sign(pieces[i].field.z - pieces[i - 1].field.z)).toBe(Math.sign(charge));
      }
    }
    const far = sheet.find(q => q.id === 'sheet-far-rings') ?? sheet[0];
    expect(far.explanation).toContain('magnitude grows');
    expect(qText(far)).not.toContain('$2\\\\pi k\\\\sigma\\\\sin\\\\alpha\\\\,\\\\Delta\\\\alpha$ grows');
  });

  it('the half line’s x-part points toward negative charge, while the components remain equal in magnitude', () => {
    for (const charge of [-5, 5]) for (const distance of [.5, 6]) {
      const E = REGISTRY.semi.quadrature({...DEFAULT_PARAMS, charge, distance}, 4000);
      expect(Math.sign(E.x)).toBe(Math.sign(charge));
      expect(E.y / E.x).toBeCloseTo(-1, 10);
    }
    expect(semi.find(q => q.id === 'semi-equal')!.explanation).toContain('toward a negative one');
  });

  it('the shell’s one-ring direction includes the sign of its charge, not only its position', () => {
    for (const charge of [-5, 5]) {
      const p = {...DEFAULT_PARAMS, charge, distance: .8, size: 4};
      const pieces = REGISTRY.shell.sample(p, 30);
      const signs = new Set<number>();
      for (const piece of pieces) {
        const dz = p.distance - piece.position.z;
        expect(Math.sign(piece.field.z)).toBe(Math.sign(piece.dq * dz));
        signs.add(Math.sign(piece.field.z));
      }
      expect([...signs].sort((a, b) => a - b)).toEqual([-1, 1]);
    }
    expect(shell.find(q => q.id === 'shell-what-cancels')!.explanation).toContain('$\\Delta Q\\,(z-R\\cos\\theta)$');
  });

  it('a negative ramp has decreasing signed density and opposite signs for its two field components', () => {
    for (const charge of [-5, 5]) {
      const pieces = REGISTRY.ramp.sample({...DEFAULT_PARAMS, charge}, 30);
      expect(Math.sign(pieces.at(-1)!.dq - pieces[0].dq)).toBe(Math.sign(charge));
      const E = REGISTRY.ramp.quadrature({...DEFAULT_PARAMS, charge}, 4000);
      expect(Math.sign(E.x)).toBe(Math.sign(charge));
      expect(Math.sign(E.y)).toBe(-Math.sign(charge));
    }
    expect(ramp.find(q => q.id === 'ramp-negative')!.explanation).toContain('$E_y$ the opposite sign');
    expect(ramp.find(q => q.id === 'ramp-total')!.explanation).toContain('changes evenly');
    expect(plain('ramp')).not.toContain('rising steadily');
  });

  it('the endpoint and ramp rods occupy the y-axis in both setup prose and sampled positions', () => {
    for (const id of ['endpoint', 'ramp'] as const) {
      for (const piece of REGISTRY[id].sample(DEFAULT_PARAMS, 30)) {
        expect(piece.position.x).toBe(0);
        expect(piece.position.y).toBeGreaterThan(0);
      }
      expect(plain(id)).toContain('along the $y$-axis');
      expect(plain(id)).not.toContain('on the $x$-axis at the origin');
    }
  });

  it('the uneven semicircle diagnoses its own varying density and uses theta for its projection', () => {
    const fs = fields('uneven-arc');
    expect(fs.find(f => f.id === 'projection')!.label).toBe('The factor cos θ');
    expect(fs.find(f => f.id === 'element')!.mistakes!.find(m => m.expression === 'dtheta')!.message.replaceAll('\u00a0', ' ')).toContain('λ₀ cos θ R dθ');
    expect(fs.find(f => f.id === 'component')!.mistakes!.find(m => m.expression === 'dE*cos(theta)')!.message).not.toContain('wider than a semicircle');
    for (const charge of [-5, 5]) {
      const p = {...DEFAULT_PARAMS, charge};
      expect(Math.abs(REGISTRY['uneven-arc'].quadrature(p, 4000).x)).toBeLessThan(K * Math.abs(charge) * 1e-9 / (p.size / 2) ** 2);
    }
    expect(plain('uneven-arc')).toContain('k|Q|/R^2');
  });

  it('the shell quiz uses the same dimensionless bracket as the lesson, and defines the projection angle', () => {
    for (const R of [.5, 4]) for (const z of [.3 * R, 1.2 * R, 6 * R]) {
      const fraction = (theta: number) => (R - z * Math.cos(theta)) / Math.sqrt(R * R + z * z - 2 * z * R * Math.cos(theta));
      expect(fraction(Math.PI) - fraction(0)).toBeCloseTo(z > R ? 2 : 0, 11);
    }
    expect(shell.find(q => q.id === 'shell-outside')!.explanation).toContain('$1-(-1)=2$');
    expect(shell.find(q => q.id === 'shell-inside')!.explanation).toContain('$(R-z)/(R-z)=1$');
    expect(getProblem('shell').setup).toContain('the projection angle $\\alpha$ is at $P$');
    const oneRing = lessonFor('shell')!.sections.find(s => s.heading === 'One ring')!;
    expect(oneRing.body.some(b => typeof b === 'string' && b.includes(String.raw`\cos\alpha=(z-R\cos\theta)/r_i`))).toBe(true);
    expect(fields('shell').find(f => f.id === 'inside')!.label).not.toMatch(/\bR$/);
  });

  it('the off-middle rod permits the zero middle case and teaches both component integrals', () => {
    for (const charge of [-5, 5]) {
      const E = REGISTRY.offset.quadrature({...DEFAULT_PARAMS, charge, height: 0}, 4000);
      expect(Math.abs(E.y)).toBeLessThan(1e-12);
    }
    expect(getProblem('offset').symmetry.tex).not.toContain('\\ne0');
    expect(lessonFor('offset')!.sections.flatMap(s => s.body).filter(b => typeof b !== 'string').map(b => b.tex)).toContain(String.raw`E_y=-\int_{y_1}^{y_2}\frac{k\lambda\,dy}{y^2+r^2}\cdot\frac{y}{\sqrt{y^2+r^2}}`);
    expect(bisector.find(q => q.id === 'bisector-raise-p')!.review).toEqual({lesson: 'offset', stage: 'cancel'});
    expect(limitPlot(getProblem('offset'), getProblem('offset').limits.find(l => l.mode === 'end')!).y).not.toContain('end-on');
  });
});
