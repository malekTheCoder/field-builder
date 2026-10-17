import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
/* TEXT IN THE GHOST GREY. The Gauss figure set "E · dA = 0", the ρ name and its curves' names in --ghost, the neutral
 * of the dashed cancelled strokes: 3.91:1 on the light card at twelve to fifteen pixels, under the 4.5 small text
 * needs. Text takes --ghost-ink, the same neutral darkened; strokes keep --ghost. */
const sheet = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const lum = (hex: string) => {
 const c = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
 return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
describe('the ghost grey as text', () => {
 const globals = sheet('../app/globals.css');
 const [light, dark] = [...globals.matchAll(/--ghost-ink:#([0-9a-f]{6})/g)].map(m => m[1]);
 it('is defined for both themes and reads at 4.5:1 on the card and the page', () => {
  expect(contrast(light, 'ffffff')).toBeGreaterThanOrEqual(4.5);
  expect(contrast(light, 'f2f2f2')).toBeGreaterThanOrEqual(4.5);
  expect(contrast(dark, '1a1a1a')).toBeGreaterThanOrEqual(4.5);
  expect(contrast(dark, '101010')).toBeGreaterThanOrEqual(4.5);
 });
 it('is what the Gauss figure sets its names in', () => {
  const gauss = sheet('../src/gauss/gauss.css');
  for (const rule of ['.gs-zero-name', '.gs-rho-name', '.gs-curve-name']) {
   const body = gauss.match(new RegExp(rule.replace('.', '\\.') + '\\{([^}]*)\\}'))?.[1] ?? '';
   expect(body, rule).toMatch(/fill:var\(--ghost-ink\)/);
  }
 });
});
