import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
/* THE FIRST SECONDS OF A LOAD SAY SOMETHING. The whole site is one script, and on a class's shared network it took
 * seconds to arrive and run, while #root was empty: a white window a teacher could not tell from a broken link. The
 * published page (index.html) now carries the name and a "Loading" line inside #root, which React replaces on mount,
 * and both entries say so in a <noscript> when script is off. */
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
describe('the page before the script runs', () => {
 it('index.html shows the name and a loading line inside #root, in either theme', () => {
  const root = html.match(/<div id="root">([\s\S]*?)<\/div><script/)?.[1] ?? '';
  expect(root).toMatch(/role="status"/);
  expect(root).toMatch(/Field Builder/);
  expect(root).toMatch(/Loading/);
  // Its own colours, light and dark, since the app's sheet has not arrived yet.
  expect(html).toMatch(/html\.dark \.fb-boot\{/);
 });
 it('both entries say the site needs JavaScript when it is off', () => {
  expect(html).toMatch(/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
  expect(layout).toMatch(/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
 });
 it('carries no numerals and no em dashes in what it shows', () => {
  const shown = (html.match(/<body>([\s\S]*?)<script type="module"/)?.[1] ?? '').replace(/<[^>]*>/g, ' ');
  expect(shown).toMatch(/Loading/);
  expect(shown).not.toMatch(/\d|—/);
 });
});
