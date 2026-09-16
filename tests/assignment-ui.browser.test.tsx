import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {isReady} from '../src/problems/readiness';
import {getProblem} from '../src/problems/definitions';

afterEach(() => {
 cleanup();
 window.history.replaceState(null, '', '/');
});

describe('assignable URL state', () => {
 it('opens a teacher assignment from the query string and keeps other saved params', async () => {
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'axial', seen: true, dark: false, sidebarOpen: true, showNumbers: true, params: {axial: {...DEFAULT_PARAMS, distance: 5}}}));
  window.history.replaceState(null, '', '/?p=ring&mode=sum&r=2');
  const {findByRole, container} = render(<Explorer />);
  expect(await findByRole('heading', {name: /Field on the axis of a ring/})).toBeTruthy();
  await waitFor(() => expect(container.querySelector('.cd-vector')).toBeTruthy());
  expect(container.querySelector('.exp-diagram-card.mode-sum')).toBeTruthy();
  await waitFor(() => {
   const saved = JSON.parse(localStorage.getItem('field-builder:explorer:v1')!);
   expect(saved.params.axial.distance).toBe(5);
  });
 });
 // A link handed out before a lesson was held back must not open it anyway. The assignment is
 // ignored and the reader lands somewhere finished, rather than on the page we decided was not
 // ready to be read. Written against `readiness.ts`, so publishing v-ring retires this check
 // instead of leaving a stale assertion that the site hides a lesson it no longer hides.
 it.skipIf(isReady('v-ring'))('ignores an assignment pointing at a lesson that is not ready', async () => {
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
  window.history.replaceState(null, '', '/?p=v-ring&mode=sum');
  const {findByRole, container} = render(<Explorer />);
  expect(await findByRole('heading', {name: getProblem('bisector').title})).toBeTruthy();
  expect(container.querySelector('.cd-gauge')).toBeNull();
 });
 it('ignores a malformed problem id and still clamps numbers', async () => {
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
  window.history.replaceState(null, '', '/?p=not-a-lesson&mode=explode&distance=99');
  const {findByRole} = render(<Explorer />);
  expect(await findByRole('heading', {name: getProblem('bisector').title})).toBeTruthy();
  await waitFor(() => expect(location.search).toContain('distance=6'));
 });
});
