import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
/* NO EM DASHES ON THE SITE. The owner asked for every one to go: sentences that leaned on a dash now
 * use a comma, a colon, brackets or a full stop. Comments may still use them, since no reader sees
 * those; everything else under src and app, and the page shell, may not. The one escaped dash left is
 * Math.tsx's, which only keeps a dash someone else's text brings from starting a line. */
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css|html)$/.test(name) ? [path] : [];
});
const uncommented = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1').replace(/<!--[\s\S]*?-->/g, '');
describe('the site', () => {
  it('shows no em dash', () => {
    const found = [...files('src'), ...files('app'), 'index.html'].flatMap(path => {
      const text = uncommented(readFileSync(path, 'utf8'));
      const dashes = (text.match(/—/g) ?? []).length + (path.endsWith('Math.tsx') ? 0 : (text.match(/\\u2014|&mdash;|&#8212;/g) ?? []).length);
      return dashes ? [`${path}: ${dashes}`] : [];
    });
    expect(found).toEqual([]);
  });
});
