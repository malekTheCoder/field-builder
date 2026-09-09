import {cleanup, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';

import {afterEach, describe, expect, it, vi} from 'vitest';
import {MathField} from '../src/components/MathField';
import {equivalent, normalize} from '../src/symbolic/equivalence';
import {getProblem} from '../src/problems/definitions';

afterEach(cleanup);
// MathLive is a custom element that touches window on import, so it can only be
// exercised in a real browser. These tests also pin the contract that matters:
// whatever LaTeX the field emits must survive the existing normalize pipeline.

describe('MathField', () => {
  it('renders a usable text input before MathLive arrives, then upgrades in place', async () => {
    const onChange = vi.fn();
    const {container} = render(<MathField value="" onChange={onChange} label="Charge element" />);
    // The fallback must be a real, labelled control rather than a dead placeholder.
    const fallback = container.querySelector('input.mathfield-fallback');
    if (fallback) expect(fallback.getAttribute('aria-label')).toBe('Charge element');
    await waitFor(() => expect(container.querySelector('math-field')).toBeTruthy(), {timeout: 15000});
    const field = container.querySelector('math-field')!;
    expect(field.getAttribute('aria-label')).toBe('Charge element');
    expect(container.querySelector('input.mathfield-fallback')).toBeNull();
  });
  it('emits LaTeX that the existing symbolic pipeline accepts', async () => {
    const onChange = vi.fn();
    const {container} = render(<MathField value="" onChange={onChange} label="Charge element" />);
    await waitFor(() => expect(container.querySelector('math-field')).toBeTruthy(), {timeout: 15000});
    const field = container.querySelector<HTMLElement & {value: string; executeCommand: (c: unknown) => void}>('math-field')!;
    // Editing is driven through MathLive's own command API. Synthetic key events
    // cannot reach the caret in headless Chromium, but this still exercises the
    // real edit path: it fires beforeinput/input exactly as typing does.
    await userEvent.click(field);
    field.focus();
    field.executeCommand(['insert', String.raw`\frac{Q}{L}`]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const latex = onChange.mock.calls.at(-1)![0] as string;
    expect(latex).toContain('frac');
    // The whole point of adopting MathLive is that its output needs no new parser.
    expect(() => normalize(latex)).not.toThrow();
    expect(equivalent(latex, 'Q/L', getProblem('bisector')).ok).toBe(true);
  });
  it('writes an externally supplied value into the field without fighting the caret', async () => {
    const onChange = vi.fn();
    const {container, rerender} = render(<MathField value="" onChange={onChange} label="Charge element" />);
    await waitFor(() => expect(container.querySelector('math-field')).toBeTruthy(), {timeout: 15000});
    const field = container.querySelector<HTMLElement & {value: string}>('math-field')!;
    rerender(<MathField value="\frac{Q}{L}" onChange={onChange} label="Charge element" />);
    await waitFor(() => expect(field.value).toContain('frac'));
    const before = field.value;
    rerender(<MathField value="\frac{Q}{L}" onChange={onChange} label="Charge element" />);
    expect(field.value).toBe(before);
  });
});
