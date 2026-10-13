import {cleanup, render} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {afterEach, describe, expect, it} from 'vitest';
import {Laws} from '../src/components/Laws';
/* THE LAWS PAGE CARRIES THE CHARGE DENSITY, AND SAYS WHY THE SUM IS ONLY ≈.
 *
 * Every lesson's first step is a piece's charge, λ Δy, λR Δθ, σ 2πs Δs, and that is where a class loses
 * the most marks; the reference a student is sent to had no row for it. And Superposition wrote
 * E = Σ ΔE_i while the board and the tour write ≈ for pieces treated as point charges. */
afterEach(cleanup);
const tex = (el: Element) => [...el.querySelectorAll('annotation')].map(a => a.textContent ?? '').join(' ');
describe('the laws', () => {
  it('a charge density row: dQ = λ dℓ = σ dA, with the lessons’ own dℓ and dA once opened', async () => {
    for (const quantity of ['E', 'V'] as const) {
      const {container, getByRole, unmount} = render(<Laws quantity={quantity} />);
      const row = [...container.querySelectorAll('.law')].find(r => /Charge density/.test(r.querySelector('.law-name')!.textContent ?? ''));
      expect(row, quantity).toBeDefined();
      expect(tex(row!.querySelector('.law-tex')!)).toContain(String.raw`dQ=\lambda\,d\ell=\sigma\,dA`);
      expect(row!.querySelector('.law-why')!.textContent).toMatch(/charge per unit length/);
      await userEvent.click(getByRole('button', {name: /Charge density/}));
      const more = tex(row!.querySelector('.law-detail')!);
      for (const t of [String.raw`d\ell=dy`, String.raw`d\ell=R\,d\theta`, String.raw`dA=2\pi s\,ds`, String.raw`\lambda(y)=\lambda_{0}`]) expect(more).toContain(t);
      expect(row!.querySelector('.law-detail')!.textContent).toMatch(/an angle is not a length/);
      unmount();
    }
  });
  it('superposition writes the sum of point-charge fields as ≈, and says why', () => {
    const {container} = render(<Laws />);
    const row = [...container.querySelectorAll('.law')].find(r => /Superposition/.test(r.textContent ?? ''))!;
    const t = tex(row.querySelector('.law-tex')!);
    expect(t).toMatch(/\\mathbf E\\approx\\sum_\{i\}\\Delta\\mathbf E_\{i\}/);
    expect(t).toContain(String.raw`\mathbf E=\int d\mathbf E`);
    expect(row.querySelector('.law-why')!.textContent).toMatch(/only ≈ because each piece’s field is taken to be a point charge’s/);
  });
});
