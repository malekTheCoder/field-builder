import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import Site, {newVisit} from '../src/home/Site';

afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); });
it('reveals the backwards density only at Solve and describes cut-face colours only in space', async () => {
  newVisit(); history.replaceState(null, '', '/?g=hard&case=backwards');
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
  const view = render(<Site />);
  await view.findByRole('heading', {level: 1});
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  const caption = () => view.container.querySelector('.gs-caption-stack > span')!.textContent;
  expect(caption()).not.toContain('density magnitude');
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 5: Solve'}));
  await waitFor(() => expect(caption()).toContain('density magnitude'));
  fireEvent.click(view.getByRole('button', {name: 'Cross-section'}));
  expect(caption()).not.toContain('cut faces');
}, 20000);
