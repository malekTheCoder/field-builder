import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* A TEACHER'S LINK OPENS THE STAGE IT NAMES, AND THE PAGE WRITES ONE.
 *
 * Pausing the run at What cancels and copying the address shared the lesson at rest -- the address carried nothing
 * of the run -- and there was no key to write by hand. And an arc's angle written as the slider reads it, phi=90,
 * was taken for radians: a closed ring, with no field at P. */
afterEach(async () => {
 cleanup();
 vi.restoreAllMocks();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 window.scrollTo(0, 0);
 await page.viewport(1280, 800);
});
const STORE = 'field-builder:explorer:v1';
async function openLink(search: string, id: string) {
 await page.viewport(1280, 800);
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem(STORE, JSON.stringify({id: 'bisector', hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
 window.history.replaceState(null, '', '/' + search);
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id as never).title));
 return view;
}
type View = Awaited<ReturnType<typeof openLink>>;
const here = (view: View) => view.container.querySelector('.bp-seg.is-here')?.getAttribute('aria-label');
const fill = (view: View) => Number(view.container.querySelector<HTMLElement>('.bp-seg.is-here .bp-seg-fill')?.style.transform.match(/scaleX\(([\d.]+)\)/)?.[1]);

describe('stage= opens the run held on that stage\'s finished frame', () => {
 it('the ring at What cancels: held, not playing, its stage finished, and the address keeps it', async () => {
  const view = await openLink('?p=ring&stage=3', 'ring');
  await waitFor(() => expect(here(view)).toBe('Stage 3: What cancels'));
  // Held: the teacher talks over it.
  expect(view.getByRole('button', {name: 'Play'})).toBeTruthy();
  expect(view.queryByRole('button', {name: 'Pause'})).toBeNull();
  expect(fill(view)).toBeGreaterThan(.99);
  // The stage's own picture: the mirror piece and the parts drawn, as at the end of What cancels.
  expect(view.container.querySelector('.exp-diagram-card.mode-project')).toBeTruthy();
  // Past the address's settle it still names the stage, so a reload or a copy opens it again.
  await new Promise(r => setTimeout(r, 400));
  expect(new URLSearchParams(location.search).get('stage')).toBe('3');
  expect(new URLSearchParams(location.search).get('p')).toBe('ring');
  // Another stage is another address.
  fireEvent.click(view.getByRole('button', {name: 'Stage 2: One piece'}));
  await waitFor(() => expect(new URLSearchParams(location.search).get('stage')).toBe('2'));
  // Closed, the address is the lesson's again.
  fireEvent.click(view.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(location.search).toBe('?p=ring'));
 }, 20000);
 it('the last stage by its word opens on the answer', async () => {
  const view = await openLink('?p=bisector&stage=shrink', 'bisector');
  await waitFor(() => expect(view.container.querySelector('.exp-diagram-card.is-settled')).toBeTruthy());
  expect(here(view)).toBe('Stage 5: Shrink them');
  expect(view.getByRole('button', {name: 'Play again'})).toBeTruthy();
  await waitFor(() => expect(view.container.querySelector('.cd-footer[data-dim="pieces"]')?.textContent).toBe('In the limit'));
  await new Promise(r => setTimeout(r, 400));
  expect(location.search).toBe('?stage=5&p=bisector');
 }, 20000);
 it('a stage that is no stage opens the lesson at rest', async () => {
  const view = await openLink('?p=ring&stage=9', 'ring');
  await new Promise(r => setTimeout(r, 400));
  expect(view.getByRole('button', {name: 'Watch it build'})).toBeTruthy();
  expect(location.search).toBe('?p=ring');
 }, 20000);
 it('the link copied from a held run opens that stage, and says so', async () => {
  const view = await openLink('?p=v-arc', 'v-arc');
  const write = vi.fn(() => Promise.resolve());
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({writeText: write} as unknown as Clipboard);
  fireEvent.click(view.getByRole('button', {name: 'Watch it build'}));
  fireEvent.click(view.getByRole('button', {name: 'Pause'}));
  fireEvent.click(view.getByRole('button', {name: 'Stage 4: Add them up'}));
  await userEvent.click(view.getByRole('button', {name: 'Lesson tools'}));
  await userEvent.click(await view.findByRole('menuitem', {name: 'Copy a link to this lesson'}));
  await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
  const url = new URL((write.mock.calls[0] as unknown as [string])[0]);
  expect(url.searchParams.get('stage')).toBe('4');
  expect(url.searchParams.get('p')).toBe('v-arc');
  await waitFor(() => expect(document.querySelector('.exp-copied')?.textContent).toBe('Link to this lesson, held at Add them up, copied.'));
 }, 45000);
});

describe('phi in a link', () => {
 const angle = (view: View) => view.getByRole('slider', {name: 'Arc angle φ'}).getAttribute('aria-valuenow');
 it('an address the page wrote before, in radians, opens the same arc', async () => {
  const view = await openLink('?p=arc&phi=1.5707963267948966', 'arc');
  await waitFor(() => expect(angle(view)).toBe('90'));
  // And is written again as the slider reads it.
  await waitFor(() => expect(location.search).toBe('?phi=90deg&p=arc'));
 }, 20000);
 it('phi=90, as a teacher writes a quarter arc, is a quarter arc and not a closed ring', async () => {
  const view = await openLink('?p=arc&phi=90', 'arc');
  await waitFor(() => expect(angle(view)).toBe('90'));
 }, 20000);
});
