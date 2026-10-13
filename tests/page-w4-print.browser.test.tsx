import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cdp, page} from 'vitest/browser';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* ON PAPER, ROUND FOUR: the second limiting case's heading sat fourteen pixels under the first's caption, closer
 * than its own explanation sits under it; and going to paper, every field layer encoded a PNG of itself that
 * nobody read -- the page copies the canvas itself. */
afterEach(async () => {
 cleanup();
 vi.restoreAllMocks();
 localStorage.clear();
 window.history.replaceState(null, '', '/');
 try { await cdp().send('Emulation.setEmulatedMedia', {media: ''}); } catch { /* not emulating */ }
 window.dispatchEvent(new Event('afterprint'));
 await page.viewport(1280, 800);
});
async function openLesson(id: string) {
 await page.viewport(1280, 800);
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe(getProblem(id as never).title));
 return view;
}

describe('on paper', () => {
 it('each limiting case starts a section, further from the case above than from its own explanation', async () => {
  const view = await openLesson('bisector');
  fireEvent.click(view.getByText('Limiting cases'));
  await waitFor(() => expect(view.getByRole('tablist', {name: 'Limiting cases'})).toBeTruthy());
  window.dispatchEvent(new Event('beforeprint'));
  await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
  const [first, second] = [...view.container.querySelectorAll<HTMLElement>('.exp-limit-print')];
  expect(second, 'one case only here, so this checks nothing').toBeTruthy();
  const between = second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
  const own = second.querySelector('.exp-limit-why')!.getBoundingClientRect().top - second.querySelector('h3')!.getBoundingClientRect().bottom;
  expect(between).toBeGreaterThanOrEqual(1.5 * own);
 }, 20000);
 it('a field layer is drawn afresh for paper without being encoded as a picture nobody reads', async () => {
  const view = await openLesson('ring');
  const layer = await waitFor(() => { const l = view.container.querySelector<HTMLElement>('.cd-field-stage'); expect(l?.querySelector('canvas')).toBeTruthy(); return l!; });
  await new Promise(r => setTimeout(r, 300));
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
  window.dispatchEvent(new Event('beforeprint'));
  expect(layer.querySelector('canvas.cd-print-snap'), 'no picture was laid over the layer').toBeTruthy();
  expect(encode).not.toHaveBeenCalled();
 }, 20000);
});
