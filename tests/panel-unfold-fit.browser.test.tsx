import {cleanup, render} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
// The page's own styles, as tests/r1-content-unfold-fit.browser.test.tsx loads them: the unfold sets
// its maths in the body size, and measured in a default font a line fits or not for no real reason.
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import '../src/static-fonts.css';
import '../src/components/workbench.css';
import {MathText} from '../src/components/Math';
import {PROBLEMS} from '../src/problems/definitions';
import {BISECTOR_UNFOLD, workedSteps} from '../src/workbench/derivation';
/* THE BISECTOR'S WORKED SUBSTITUTION FITS THE PANEL.
 *
 * Its lines are the panel's own, not a lesson's, so the content lane's sweep of every lesson's worked
 * lines never sees them. Rewritten to write every identity it uses -- y² + r² = r² sec²α, the secant
 * powers cancelling, ∫cos α dα = sin α -- they are longer, and the narrowest the panel is beside the
 * figure is 272px. */
afterEach(cleanup);
it('every line of the bisector’s worked substitution fits 272px', async () => {
  const view = render(<div className="ew-worked-body" style={{width: 272}}>{BISECTOR_UNFOLD.map((l, i) =>
    <div className="ew-worked-step" key={i} data-where={i}><div><MathText tex={l.tex} block /></div></div>)}</div>);
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const bad: string[] = [];
  for (const step of view.container.querySelectorAll<HTMLElement>('.ew-worked-step')) {
    const math = step.querySelector<HTMLElement>('.math')!;
    if (math.scrollWidth > math.clientWidth + 1) bad.push(`line ${step.dataset.where}: ${math.scrollWidth}px in ${math.clientWidth}px`);
  }
  expect(bad).toEqual([]);
}, 30000);
/* And every lesson's: the panel's own steps for the sheet, the ramp, the rod level with an end and the
 * three potentials are new, the inherited rows now carry gaps, and the ramp's last step gained a row --
 * any of which could push a line past the 272px the panel is beside the figure. */
it('every line of every lesson’s Unfold fits 272px', async () => {
  const steps = PROBLEMS.flatMap(p => {const {worked, back} = workedSteps(p); return [...worked, ...back].map((s, i) => ({id: `${p.id} ${i + 1}`, tex: s.tex}));});
  const view = render(<div className="ew-worked-body" style={{width: 272}}>{steps.map(s =>
    <div className="ew-worked-step" key={s.id} data-where={s.id}><div><MathText tex={s.tex} block /></div></div>)}</div>);
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const bad: string[] = [];
  for (const step of view.container.querySelectorAll<HTMLElement>('.ew-worked-step')) {
    const math = step.querySelector<HTMLElement>('.math')!;
    if (math.scrollWidth > math.clientWidth + 1) bad.push(`${step.dataset.where}: ${math.scrollWidth}px in ${math.clientWidth}px`);
  }
  expect(steps.length).toBeGreaterThan(60);
  expect(bad).toEqual([]);
}, 30000);
