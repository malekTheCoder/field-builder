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
function run(script: string, stored: string | null, throws = false) {
 const classes = new Set<string>();
 const document = {documentElement: {classList: {add: (c: string) => classes.add(c)}}};
 const localStorage = {getItem: (k: string) => { if (throws) throw new Error('blocked'); return k === STORE ? stored : null; }};
 // Run as the page's head runs it: a script with nothing but the page's globals to hand.
 runInNewContext(script, {localStorage, document});
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
 it('reads the key the Explorer saves under', () => {
  expect(explorer).toContain(`const STORAGE='${STORE}'`);
 });
});
