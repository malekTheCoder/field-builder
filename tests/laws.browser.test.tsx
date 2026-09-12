import {cleanup, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {afterEach, describe, expect, it} from 'vitest';
import {Laws, LawsReference} from '../src/components/Laws';
import {Onboarding} from '../src/components/Onboarding';
afterEach(() => { cleanup(); localStorage.clear(); });
// Same executable direction as tests/derivation.browser.test.tsx: a reference explains, never marks.
const JUDGED = /\b(correct|incorrect|wrong|score|scored|mastery|graded|grade|try again|check this step|reveal)\b/i;
const judged = (text: string) => text.match(JUDGED)?.[0] ?? '';
// KaTeX keeps the source TeX in a MathML annotation, so the physics itself can be asserted
// rather than the glyphs it happened to lay out.
const tex = (row: Element) => row.querySelector('.law-tex annotation')?.textContent ?? '';
const rows = (root: {querySelectorAll: (selector: string) => Iterable<Element>}) => [...root.querySelectorAll('.law')];
const inside = (dialog: Element, node: Element | null) => !!node && (dialog === node || dialog.contains(node));

describe('the laws a lesson rests on', () => {
  it('states Coulomb, superposition and the scalar potential, with the real expressions', () => {
    const {container} = render(<Laws />);
    const [coulomb, superposition, potential] = rows(container);
    expect(coulomb.textContent).toMatch(/Coulomb/);
    expect(tex(coulomb)).toContain(String.raw`\frac{kQ}{r^{2}}`);
    expect(tex(coulomb)).toContain(String.raw`\hat{\mathbf r}`);
    expect(superposition.textContent).toMatch(/Superposition/);
    // The sum turning into an integral is the whole method; if that line ever goes, so does the reason.
    expect(tex(superposition)).toContain(String.raw`\sum`);
    expect(tex(superposition)).toContain(String.raw`\int d\mathbf E`);
    expect(potential.textContent).toMatch(/Potential/);
    expect(tex(potential)).toContain(String.raw`V=\frac{kQ}{r}`);
  });
  it('leads with the scalar law on a potential lesson', () => {
    const {container} = render(<Laws quantity="V" />);
    expect(rows(container)[0].querySelector('.law-name')!.textContent).toMatch(/Potential/);
    expect(rows(container).length).toBe(3);
  });
  it('names Coulomb with the constant and the force it came from, once asked', async () => {
    const {container, getByRole} = render(<Laws />);
    expect(container.querySelector('.law-detail')).toBeNull();
    const button = getByRole('button', {name: /Coulomb/});
    await userEvent.click(button);
    const detail = container.querySelector('.law-detail')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(detail.getAttribute('id')).toBe(button.getAttribute('aria-controls'));
    const extra = [...detail.querySelectorAll('annotation')].map(a => a.textContent ?? '').join(' ');
    expect(extra).toContain(String.raw`q_{1}q_{2}`);
    expect(extra).toContain(String.raw`4\pi\varepsilon_{0}`);
    await userEvent.click(button);
    expect(container.querySelector('.law-detail')).toBeNull();
  });
  it('carries no word of judgement, opened or closed', async () => {
    const {container, getByRole} = render(<Laws />);
    expect(judged(container.textContent ?? '')).toBe('');
    for (const name of [/Coulomb/, /Superposition/, /Potential/]) {
      await userEvent.click(getByRole('button', {name}));
      const word = judged(container.textContent ?? '');
      expect(word, `the laws say "${word}"`).toBe('');
    }
    // Nothing here is answerable: no blanks, no choices, no button offering to mark anything.
    expect(container.querySelector('input, textarea, [role=radio]')).toBeNull();
  });
});

describe('the tour introduces the laws before the method', () => {
  // The dialog is portalled, so every assertion here reads baseElement, not the render container.
  // Activated directly rather than through a simulated pointer: rendered straight into a
  // test with `open`, rather than opened from its trigger, the dialog's own inert backdrop
  // lies over the buttons and swallows a synthetic click before it reaches them. The
  // handler under test is the same one either way.
  const press = async (button: HTMLElement) => { button.click(); await new Promise(r => setTimeout(r, 0)); };
  it('reaches a law page that says what each law buys you here', async () => {
    const {baseElement, getByRole} = render(<Onboarding open onClose={() => {}} />);
    await press(getByRole('button', {name: /Continue/}));
    expect(baseElement.querySelector('.ob-title')!.textContent).toMatch(/Coulomb/);
    expect(rows(baseElement).length).toBe(3);
    // A reason, not a recital: superposition is presented as the permission to add.
    expect(baseElement.querySelector('.laws')!.textContent).toMatch(/integral/i);
    expect(judged(baseElement.textContent ?? '')).toBe('');
    // The page carries the laws instead of a preview figure, and the tour still ends where it did.
    expect(baseElement.querySelector('.ob-visual')).toBeNull();
    for (let i = 0; i < 2; i++) await press(getByRole('button', {name: /Continue/}));
    expect(getByRole('button', {name: /Start exploring/})).toBeTruthy();
  });
  it('keeps tab inside the dialog once the law page adds its buttons', async () => {
    const {getByRole, findByRole} = render(<Onboarding open onClose={() => {}} />);
    await press(getByRole('button', {name: /Continue/}));
    const dialog = await findByRole('dialog');
    getByRole('button', {name: /Coulomb/}).focus();
    for (let i = 0; i < 12; i++) {
      await userEvent.tab();
      expect(inside(dialog, document.activeElement as Element | null), `tab ${i} left the dialog`).toBe(true);
    }
  });
});

describe('the laws stay reachable after the tour', () => {
  it('opens the same three laws from a lesson and hands focus back', async () => {
    const {getByRole, findByRole, queryByRole} = render(<LawsReference quantity="V" />);
    const trigger = getByRole('button', {name: /laws behind this/i});
    await userEvent.click(trigger);
    const dialog = await findByRole('dialog');
    expect(rows(dialog).length).toBe(3);
    expect(dialog.querySelector('.law-name')!.textContent).toMatch(/Potential/);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
