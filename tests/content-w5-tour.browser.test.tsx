import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {Onboarding} from '../src/components/Onboarding';
import {Laws} from '../src/components/Laws';
import {limitNow} from '../src/components/Assessment';
import {getProblem} from '../src/problems/definitions';
import {limitPlot} from '../src/symbolic/physics';
/* WAVE 5 · CONTENT: THE TOUR'S LAWS PAGE, THE LAWS' PROSE AND THE ARC'S SEMICIRCLE.
 *
 * The tour's second page, titled "Start from Coulomb's law", showed all four laws; on a laptop and on a phone
 * only the first two were in view, and nothing said the point charge's potential and the charge density were
 * below the fold of a dialog. It now shows the two it names and says where the other two are. The laws'
 * sentences broke "V" from "= kQ/r." at a phone's width; they are held as the lessons' are. And the arc's
 * semicircle card spoke of "the integral" as something a sum could be stronger than. */
afterEach(cleanup);
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

describe('the tour’s laws page', () => {
  it('shows the two laws its title names, and says where the other two are', async () => {
    const view = render(<Onboarding open onClose={() => {}} />);
    (view.baseElement.querySelector('[aria-label="Introduction page 2"]') as HTMLElement).click();
    await frame();
    const names = [...view.baseElement.querySelectorAll('.law-name')].map(n => n.textContent);
    expect(names).toEqual(['Coulomb’s law', 'Superposition']);
    expect(view.baseElement.querySelector('.laws-more')!.textContent).toBe('Two more, a point charge’s potential and charge density, are under “The laws behind every lesson”, in the ⋯ menu at the top of each lesson.');
  });
  it('everywhere else shows all four, with nothing to say about the rest', () => {
    const view = render(<Laws />);
    expect(view.container.querySelectorAll('.law')).toHaveLength(4);
    expect(view.container.querySelector('.laws-more')).toBeNull();
  });
  it('holds a formula in a law’s sentence together', () => {
    const view = render(<Laws />);
    const why = [...view.container.querySelectorAll('.law-why')].map(w => w.textContent ?? '').join(' ');
    expect(why).toContain('V = kQ/r');
  });
});

describe('the arc’s semicircle, built from point charges', () => {
  it('says what the sum is compared with: the semicircle’s field', () => {
    const arc = getProblem('arc'), half = arc.limits.find(l => l.mode === 'half')!, plot = limitPlot(arc, half);
    expect(limitNow(arc, half, plot, Math.PI / 2, 1, 0)).toBe('Few pieces: their field at P is stronger than the semicircle’s, the dashed line.');
    expect(limitNow(arc, half, plot, 1, 30, 1)).toBe('Many pieces: their sum lies on the semicircle’s field, the integral.');
    const full = arc.limits.find(l => l.mode === 'full')!;
    expect(limitNow(arc, full, limitPlot(arc, full), 4, 1, 0)).toBe('On a narrow arc the pieces’ fields point much the same way, so they mostly add.');
  });
});
