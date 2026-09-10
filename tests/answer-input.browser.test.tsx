import {cleanup, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {useState} from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {AnswerInput} from '../src/components/AnswerInput';
import {equivalent, preview} from '../src/symbolic/equivalence';
import {getProblem} from '../src/problems/definitions';
import type {Answer} from '../src/problems/types';

afterEach(cleanup);
// AnswerInput now embeds MathLive, which only exists in a real browser. These
// tests pin the contract the wizard depends on end to end: whatever LaTeX the
// field emits must reach equivalent() and grade as the hand-typed ASCII did.
const problem = getProblem('bisector');
const distance = problem.steps[4].fields!.find(f => f.id === 'distance')!;

function Harness({field, palette = true, guided = false}: {field: Answer; palette?: boolean; guided?: boolean}) {
  const [value, setValue] = useState('');
  return <>
    <AnswerInput field={field} value={value} onChange={setValue} guided={guided} palette={palette} />
    <output data-testid="raw">{value}</output>
  </>;
}
// The handoff recipe: a real click gesture first, because in headless Chromium
// focus() alone never reaches MathLive's caret.
async function ready(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector('math-field')).toBeTruthy(), {timeout: 15000});
  await userEvent.click(container.querySelector<HTMLElement>('math-field')!);
}
const raw = (container: HTMLElement) => container.querySelector('[data-testid=raw]')!.textContent ?? '';
function drop(container: HTMLElement, latex: string) {
  const target = container.querySelector('.mathfield-drop')!, dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', latex);
  target.dispatchEvent(new DragEvent('dragover', {dataTransfer, bubbles: true, cancelable: true}));
  target.dispatchEvent(new DragEvent('drop', {dataTransfer, bubbles: true, cancelable: true}));
}

describe('AnswerInput wired to MathField', () => {
  it('accepts a correct expression dropped as a fact chip', async () => {
    const {container} = render(<Harness field={distance} />);
    await ready(container);
    drop(container, preview(distance.expected));
    await waitFor(() => expect(raw(container)).not.toBe(''));
    const latex = raw(container);
    expect(latex).toContain('sqrt');
    expect(equivalent(latex, distance.expected, problem).ok).toBe(true);
  });

  it('rejects a wrong expression built in the same field', async () => {
    const {container} = render(<Harness field={distance} />);
    await ready(container);
    // r alone is the classic mistake here: only the horizontal leg of the triangle.
    drop(container, preview('r'));
    await waitFor(() => expect(raw(container)).not.toBe(''));
    expect(equivalent(raw(container), distance.expected, problem).ok).toBe(false);
  });

  it('still inserts a fact chip on click', async () => {
    const {container} = render(<Harness field={distance} />);
    await ready(container);
    const chips = container.querySelectorAll<HTMLButtonElement>('.fact-chip');
    expect(chips.length).toBe(distance.options.length);
    chips[0].click();
    await waitFor(() => expect(raw(container)).not.toBe(''));
  });

  it('inserts a symbol-row key at the caret', async () => {
    const {container} = render(<Harness field={distance} palette={false} />);
    await ready(container);
    container.querySelector<HTMLButtonElement>('.symbol-key[aria-label=lambda]')!.click();
    await waitFor(() => expect(raw(container)).toContain('lambda'));
  });

  it('renders a live KaTeX preview under the blank without grading', async () => {
    const {container} = render(<Harness field={distance} palette={false} />);
    await ready(container);
    drop(container, preview(distance.expected));
    await waitFor(() => expect(container.querySelector('.live-preview .math, .live-preview .katex')).toBeTruthy());
    expect(container.querySelector('.feedback')).toBeNull();
    expect(container.querySelector('.live-preview.is-error')).toBeNull();
  });
  it('shows a safeParse error under the blank without grading', async () => {
    const {container} = render(<Harness field={distance} palette={false} />);
    await ready(container);
    drop(container, 'unknown');
    await waitFor(() => expect(container.querySelector('.live-preview.is-error')?.textContent).toMatch(/Unknown symbol/i));
    expect(container.querySelector('.feedback')).toBeNull();
  });
  it('leaves the guided multiple-choice path alone', async () => {
    const {container} = render(<Harness field={distance} palette={false} guided />);
    expect(container.querySelector('.math-options')).toBeTruthy();
    expect(container.querySelectorAll('.math-option').length).toBe(distance.options.length);
    // A math editor must never sit behind a multiple-choice question.
    await new Promise(r => setTimeout(r, 400));
    expect(container.querySelector('math-field')).toBeNull();
    expect(container.querySelector('.symbol-row')).toBeNull();
  });
});
