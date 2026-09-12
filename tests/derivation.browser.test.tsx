import {cleanup, render} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {afterEach, describe, expect, it} from 'vitest';
import FieldBuilder from '../src/wizard/FieldBuilder';
import {PROBLEMS} from '../src/problems/definitions';
afterEach(() => { cleanup(); localStorage.clear(); });
// The direction, made executable: the derivation is read and shown, never marked.
const JUDGED = /\b(correct|incorrect|wrong|score|scored|mastery|graded|grade|try again|check this step|reveal)\b/i;
const judged = (text: string) => text.match(JUDGED)?.[0] ?? '';
describe('the derivation reader', () => {
  it('shows every step of a lesson worked, with nothing to answer and nothing marked', async () => {
    const {container, findByRole, getByRole, queryByRole} = render(<FieldBuilder initialProblem="bisector" />);
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const steps = container.querySelectorAll('.stage-progress button').length;
    expect(steps).toBeGreaterThan(3);
    for (let i = 0; i < steps; i++) {
      // No blanks, no check button, no feedback region, no radio choices to get right.
      // A hidden file input belongs to progress import; sliders are exploration, not answers.
      expect(container.querySelector('input:not([type=range]):not([type=file]):not([type=hidden]), math-field, textarea')).toBeNull();
      expect(queryByRole('button', {name: /check (this|the|my) (step|answer|derivation)|grade/i})).toBeNull();
      expect(container.querySelector('output.feedback')).toBeNull();
      expect(container.querySelectorAll('[role=radio]').length).toBe(0);
      const card = container.querySelector('.stage-card')!;
      expect(judged(card.textContent ?? ''), `step ${i} says "${judged(card.textContent ?? '')}"`).toBe('');
      if (i < steps - 1) await userEvent.click(getByRole('button', {name: /Continue/}));
    }
    // Reaching the end is acknowledged, not scored.
    expect(container.querySelector('.completion-card')).not.toBeNull();
    expect(container.querySelector('.completion-card')!.textContent).not.toMatch(/\d+\s*\/\s*100/);
    expect(getByRole('button', {name: /Next lesson/})).toBeTruthy();
  });
  it('lets a reader jump to any step directly, in any order', async () => {
    const {container, findByRole} = render(<FieldBuilder initialProblem="ring" />);
    expect(await findByRole('heading', {name: /ring/i})).toBeTruthy();
    const buttons = container.querySelectorAll<HTMLButtonElement>('.stage-progress button');
    for (const b of buttons) expect(b.disabled).toBe(false);
    await userEvent.click(buttons[buttons.length - 1]);
    expect(buttons[buttons.length - 1].getAttribute('aria-current')).toBe('step');
    await userEvent.click(buttons[0]);
    expect(buttons[0].getAttribute('aria-current')).toBe('step');
  });
  it('assembles the integral in the side panel as steps are reached, without a score', async () => {
    const {container, findByRole, getByRole} = render(<FieldBuilder initialProblem="bisector" />);
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const panel = () => container.querySelector('.equation-panel')!;
    const complete = () => panel().querySelectorAll('.construction-row.complete').length;
    const before = complete();
    await userEvent.click(getByRole('button', {name: /Continue/}));
    await userEvent.click(getByRole('button', {name: /Continue/}));
    expect(complete()).toBeGreaterThan(before);
    expect(judged(panel().textContent ?? '')).toBe('');
  });
  it('carries every lesson without a word of judgement anywhere on the page', async () => {
    for (const p of PROBLEMS) {
      const {container, findByRole, getByRole} = render(<FieldBuilder initialProblem={p.id} />);
      expect(await findByRole('heading', {name: new RegExp(p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))})).toBeTruthy();
      const steps = container.querySelectorAll('.stage-progress button').length;
      for (let i = 0; i < steps; i++) {
        const word = judged(container.querySelector('main')!.textContent ?? '');
        expect(word, `${p.id} step ${i} says "${word}"`).toBe('');
        if (i < steps - 1) await userEvent.click(getByRole('button', {name: /Continue/}));
      }
      cleanup();
    }
  }, 60000);
});
