import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {userEvent} from 'vitest/browser';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

/* THE HANDOUT'S FIGURE IS ONE PIECE'S. The offline copy carried the figure as it stood, which at rest is the
 * resting frame -- the field, P and the cut, no piece singled out -- under a page that teaches the method from one
 * piece, its distance and its arrow. It is drawn as One piece draws it now: the run's piece, its rᵢ and its ΔE,
 * apart from the page, which does not change under the reader. */
async function savedFigure(id: string) {
  localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
  const view = render(<Explorer />);
  expect(await view.findByRole('heading', {name: getProblem(id as never).title})).toBeTruthy();
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:field-builder-copy');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    await userEvent.click(view.getByRole('button', {name: 'Lesson tools'}));
    await userEvent.click(await view.findByRole('menuitem', {name: 'Save an offline copy of this lesson'}));
    await vi.waitFor(() => expect(create).toHaveBeenCalled(), {timeout: 8000});
    const html = await (create.mock.calls[0][0] as Blob).text();
    return {view, svg: new DOMParser().parseFromString(html, 'text/html').querySelector('figure svg')!};
  } finally {
    click.mockRestore();
    create.mockRestore();
    revoke.mockRestore();
  }
}
describe('the offline copy draws One piece', () => {
  for (const id of ['bisector', 'ring', 'arc']) it(id, async () => {
    const {view, svg} = await savedFigure(id);
    expect(svg, 'the copy has a figure').toBeTruthy();
    expect(svg.querySelector('.cd-stage-label')?.textContent, 'the stage drawn').toMatch(/^One (piece|ring)$/);
    expect(svg.querySelector('.is-selected'), 'the piece singled out').toBeTruthy();
    expect(svg.querySelector('[data-ri]'), 'its distance, the line to P').toBeTruthy();
    expect([...svg.querySelectorAll('.cd-vector-label')].some(t => t.getAttribute('data-symbol') === 'ΔE'), 'its arrow, named ΔE').toBe(true);
    // The page is as it was: at rest, no stage, and nothing left behind off screen.
    expect(view.container.querySelector('.charge-diagram.cd-building'), 'the live figure was put in a stage').toBeNull();
    expect(document.querySelector('.fb-copy-figure'), 'the copy\'s figure was left in the page').toBeNull();
  }, 30000);
});
