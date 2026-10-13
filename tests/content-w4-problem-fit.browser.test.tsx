import {cleanup, render, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
// The page's own styles: what is measured is where the panel's first step lands on a real screen.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import '../src/static-fonts.css';
import Explorer from '../src/explorer/Explorer';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
/* THE PROBLEM IS SAID IN A FEW LINES, SO THE METHOD STILL STARTS ON THE FIRST SCREEN.
 *
 * The panel now opens on the lesson's problem statement, above Cut it up. Every setup was written for a
 * closed disclosure no one read, and one of them, the semi-infinite line's, had grown to a paragraph:
 * the vector from a piece to P, the side its field leans to, the lesson it comes from. Opened at the top
 * of the panel it was 357px tall on a laptop and pushed Cut it up below a 1280×720 screen, so a student
 * met a wall of text and no first step. What the board already says -- where α is, why ΔE_x carries a
 * minus, why the field leans -- is said there, at the step it belongs to; the problem keeps the given, the
 * axes, the angle and the Find. Held here for every lesson at the laptop size. */
const QUIET = '*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let quiet: HTMLStyleElement;
beforeAll(async () => { quiet = document.createElement('style'); quiet.textContent = QUIET; document.head.appendChild(quiet); await page.viewport(1280, 720); });
afterAll(async () => { quiet.remove(); await page.viewport(1280, 800); });
afterEach(() => { cleanup(); localStorage.clear(); window.history.replaceState(null, '', '/'); });

describe('the problem leaves the first step on the first screen', () => {
  it('every lesson at 1280×720: Cut it up starts above the fold', async () => {
    for (const p of PROBLEMS) {
      await new Promise(r => setTimeout(r, 280));
      localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: p.id, hideTour: true, cued: true, dark: false, sidebarOpen: true, params: {}}));
      const view = render(<Explorer />);
      await view.findByRole('button', {name: 'Watch it build'});
      await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(p.id).title));
      await document.fonts.ready;
      window.scrollTo(0, 0);
      const cut = view.container.querySelector<HTMLElement>('.db-step[data-step="pieces"]');
      expect(cut, p.id).toBeTruthy();
      expect(cut!.getBoundingClientRect().top + 24, p.id).toBeLessThanOrEqual(window.innerHeight);
      cleanup();
    }
  }, 180000);
});
