import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
/* RULES OF THE PAGE'S STYLE SHEET THAT A BROWSER TEST CANNOT SEE FAIL.
 *
 * Each of these was a defect a reader met: a run that stuttered at its central moment, a bar that a
 * thumb could not scroll the page over, and light scrollbars on the dark theme. */
const sheet = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
describe('the explorer\'s sheet', () => {
 it('looks for no state down the page with :has()', () => {
  // `.exp-workspace:has(.exp-walk.is-open)` made Chromium re-match the workspace on every change
  // inside it while the run played -- every label, every arrow -- and restyle the board's KaTeX with
  // it: the arc's What cancels ran at twenty frames a second. Removing the rule at run time does not
  // help (the browser keeps its invalidation flags), so it must never be in the sheet. The states it
  // looked for are classes the Explorer sets: is-running, is-settled, is-cueing.
  expect(sheet('../src/explorer/explorer.css')).not.toMatch(/:has\(/);
 });
 it('lets a vertical swipe over the run\'s bar scroll the page', () => {
  expect(sheet('../src/explorer/explorer.css')).toMatch(/\.bp-track\{[^}]*touch-action:pan-y/);
 });
});
describe('the global sheet', () => {
 it('tells the browser which theme it is in, so its own scrollbars match', () => {
  const css = sheet('../app/globals.css');
  expect(css).toMatch(/:root\s*\{\s*color-scheme:\s*light/);
  expect(css).toMatch(/\.dark\s*\{\s*color-scheme:\s*dark/);
 });
});
