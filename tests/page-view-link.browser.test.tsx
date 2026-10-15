import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* A SHARED LINK OPENS THE FIGURE IN 3D OR 2D.
 *
 * Whether the figure was drawn flat or in space lived only in the figure, so a teacher who turned the rod into space to
 * show the class sent a link that opened it flat. view=3d and view=2d say which now, the address writes it where the
 * view is not the lesson's own, and Copy a link carries it. */
afterEach(async () => {
 cleanup();
 vi.restoreAllMocks();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLink(search: string, id: string) {
 await page.viewport(1280, 800);
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLink>>;
const inSpace = (view: View) => view.container.querySelector('.charge-diagram')!.classList.contains('cd-in-space');
describe('view= in a link', () => {
 it('view=3d opens a rod in space, and the address keeps it', async () => {
  const view = await openLink('?p=bisector&view=3d', 'bisector');
  await waitFor(() => expect(inSpace(view)).toBe(true));
  await waitFor(() => expect(new URLSearchParams(location.search).get('view')).toBe('3d'), {timeout: 3000});
 }, 30000);
 it('view=2d opens the ring flat', async () => {
  const view = await openLink('?p=ring&view=2d', 'ring');
  await waitFor(() => expect(inSpace(view)).toBe(false));
  await new Promise(r => setTimeout(r, 400));
  expect(inSpace(view), 'and stays flat').toBe(false);
 }, 30000);
 it('an old link opens each lesson its own way, and its address gains nothing', async () => {
  const ring = await openLink('?p=ring', 'ring');
  await waitFor(() => expect(inSpace(ring)).toBe(true));
  await new Promise(r => setTimeout(r, 600));
  expect(location.search).toBe('?p=ring');
  cleanup();
  const rod = await openLink('?p=axial', 'axial');
  expect(inSpace(rod)).toBe(false);
 }, 30000);
 it('Copy a link carries the view once the reader turns the rod into 3D', async () => {
  const view = await openLink('?p=axial', 'axial');
  const write = vi.fn(() => Promise.resolve());
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({writeText: write} as unknown as Clipboard);
  fireEvent.click(view.getByRole('button', {name: '3D'}));
  await waitFor(() => expect(inSpace(view)).toBe(true));
  await userEvent.click(view.getByRole('button', {name: 'Lesson tools'}));
  await userEvent.click(await view.findByRole('menuitem', {name: 'Copy a link to this lesson'}));
  await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
  const url = new URL((write.mock.calls[0] as unknown as [string])[0]);
  expect(url.searchParams.get('view')).toBe('3d');
  expect(url.searchParams.get('p')).toBe('axial');
 }, 30000);
});
