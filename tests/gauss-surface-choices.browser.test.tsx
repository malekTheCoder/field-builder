import {cleanup, fireEvent, render, within} from '@testing-library/react';
import {afterEach, beforeEach, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import Site, {newVisit} from '../src/home/Site';
import {ChooseSurface} from '../src/gauss/ChooseSurface';
import {SURFACE_CHOICES} from '../src/gauss/surfaceChoices';

beforeEach(() => {newVisit(); localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));});
afterEach(() => {cleanup(); localStorage.clear(); history.replaceState(null, '', '/');});
for (const sym of ['sphere', 'line', 'plane'] as const) it(`explains all ${sym} choices without claiming Gauss's law fails`, () => {
  const view = render(<ChooseSurface sym={sym} />);
  const live = view.container.querySelector('[aria-live]')!;
  expect(live.textContent).toContain('Choose a surface');
  for (const choice of SURFACE_CHOICES[sym]) {
    const button = view.getByRole('button', {name: `${choice.label} ${choice.description}`});
    fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(view.getAllByRole('button').filter(b => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    if (choice.tex) {
      expect(live.querySelector('.katex-display annotation')!.textContent).toBe(choice.tex);
      expect(live.textContent).toContain('Reversing charge reverses the flux');
    } else expect(live.textContent).toContain('Gauss’s law remains true on this closed surface.');
  }
  expect(view.container.querySelector('.gs-surface-print')!.textContent).toContain(SURFACE_CHOICES[sym][0].label);
});
it('native keyboard selection keeps focus on the chosen surface', async () => {
  const view = render(<ChooseSurface sym="sphere" />);
  const button = view.getAllByRole('button')[1]; button.focus();
  await userEvent.keyboard('{Enter}');
  expect(document.activeElement).toBe(button);
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(view.container.querySelector('[aria-live]')!.textContent).toContain('Distance from the charge’s centre');
}, 15000);
it('changing the source symmetry resets the exercise while reversing charge preserves its geometry', async () => {
  history.replaceState(null, '', '/?g=symmetry&case=sphere');
  const view = render(<Site />); await view.findByRole('heading', {level: 1});
  const tool = () => view.container.querySelector<HTMLElement>('.gs-surface')!;
  fireEvent.click(within(tool()).getByRole('button', {name: /Concentric sphere/}));
  fireEvent.click(view.getByRole('button', {name: 'Negative'}));
  expect(within(tool()).getByRole('button', {name: /Concentric sphere/}).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(view.getByRole('button', {name: /^Line$/}));
  expect(tool().querySelector('[aria-live]')!.textContent).toContain('Choose a surface');
  expect(within(tool()).getByRole('button', {name: /Coaxial cylinder/}).getAttribute('aria-pressed')).toBe('false');
}, 20000);
