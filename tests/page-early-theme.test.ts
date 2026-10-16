import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe, expect, it} from 'vitest';
/* THE SAVED THEME IS SET BEFORE THE FIRST PAINT. It used to wait for React to mount and read storage, so a
 * reader in the dark theme saw the light ground on every load. The published page (index.html) and the
 * server layout (app/layout.tsx) both carry one line in their head that reads the same saved setting the
 * Explorer writes; these run that line against a stored setting and check what it does. */
const STORE = 'field-builder:explorer:v1';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const explorer = readFileSync(new URL('../src/explorer/Explorer.tsx', import.meta.url), 'utf8');
function run(script: string, stored: string | null, throws = false, system: 'light' | 'dark' | 'none' = 'light') {
 const classes = new Set<string>();
 const document = {documentElement: {classList: {add: (c: string) => classes.add(c)}}};
 const localStorage = {getItem: (k: string) => { if (throws) throw new Error('blocked'); return k === STORE ? stored : null; }};
 const matchMedia = (q: string) => { if (system === 'none') throw new Error('no matchMedia'); return {matches: system === 'dark' && /prefers-color-scheme:\s*dark/.test(q)}; };
 // Run as the page's head runs it: a script with nothing but the page's globals to hand.
 const globals = {localStorage, document, matchMedia};
 runInNewContext(script, globals);
 // And it leaves nothing behind in the page's globals.
 expect(Object.keys(globals)).toEqual(['localStorage', 'document', 'matchMedia']);
 return classes.has('dark');
}
const fromHtml = html.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>[\s\S]*?<\/head>/)?.[1] ?? '';
const fromLayout = layout.match(/const EARLY_THEME = "([^"]*)"/)?.[1] ?? '';
describe('the theme before the page mounts', () => {
 for (const [where, script] of [['index.html', fromHtml], ['app/layout.tsx', fromLayout]] as const) it(`${where} sets the saved dark theme, and only that`, () => {
  expect(script, `${where} has no early theme line in its head`).toMatch(/dark/);
  expect(run(script, JSON.stringify({dark: true, id: 'ring'}))).toBe(true);
  expect(run(script, JSON.stringify({dark: false}))).toBe(false);
  expect(run(script, null)).toBe(false);
  // Storage refused or corrupt is the light page, never an error before anything has drawn.
  expect(run(script, '{not json')).toBe(false);
  expect(run(script, null, true)).toBe(false);
 });
 /* A FIRST VISIT ON A PHONE SET TO DARK GETS THE DARK PAGE. With nothing saved the page was always light. Now
  * the system decides until the reader presses the toggle, whose saved choice wins either way. */
 for (const [where, script] of [['index.html', fromHtml], ['app/layout.tsx', fromLayout]] as const) it(`${where} follows the system until a theme is chosen`, () => {
  expect(run(script, null, false, 'dark')).toBe(true);
  expect(run(script, JSON.stringify({id: 'ring'}), false, 'dark')).toBe(true);
  expect(run(script, '{not json', false, 'dark')).toBe(true);
  expect(run(script, null, true, 'dark'), 'storage refused is no choice: the system decides').toBe(true);
  expect(run(script, JSON.stringify({dark: false}), false, 'dark'), 'a saved light choice wins').toBe(false);
  expect(run(script, JSON.stringify({dark: true}), false, 'light')).toBe(true);
  expect(run(script, null, false, 'none'), 'no way to ask is the light page, never an error').toBe(false);
 });
 it('the Explorer saves a theme only once one is chosen', () => {
  expect(explorer).toMatch(/dark:themeChosen\.current\?dark:undefined/);
  expect(explorer).toMatch(/matchMedia\(DARK_QUERY\)/);
 });
 for (const [where, src] of [['index.html', html], ['app/layout.tsx', layout]] as const) it(`${where} tints the browser bar for both themes`, () => {
  expect(src).toMatch(/name="theme-color" media="\(prefers-color-scheme: light\)" content="#f2f2f2"/);
  expect(src).toMatch(/name="theme-color" media="\(prefers-color-scheme: dark\)" content="#101010"/);
 });
 it('reads the key the Explorer saves under', () => {
  expect(explorer).toContain(`const STORAGE='${STORE}'`);
 });
});
