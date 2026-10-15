import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
/* THE PALETTE'S PROMISES, COMPUTED RATHER THAN CLAIMED.
 *
 * The design language (docs/redesign-plan.md) is pure greys, one teal accent that never fills anything, and an
 * ink button. Each of those is a promise about contrast that a later change to one hex can quietly break: the
 * page's text on its ground is AAA, the muted grey and the accent are AA on every surface they sit on, a control's
 * edge and the slider's track hold 3:1, and the accent's hairline stays a hairline. Read from the sheet itself,
 * both themes, so the test checks the values that ship. */
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function tokens(selector: ':root' | '.dark') {
 const out: Record<string, string> = {};
 const re = selector === ':root' ? /(?:^|[}\s]):root\s*\{([^}]*)\}/g : /(?:^|[}\s])\.dark\s*\{([^}]*)\}/g;
 for (const m of css.matchAll(re)) for (const d of m[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+)/g)) out[d[1]] = d[2].trim();
 return out;
}
const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function luminance(hex: string) {
 let h = hex.replace('#', '');
 if (h.length === 3) h = h.split('').map(x => x + x).join('');
 const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
 return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

for (const theme of [':root', '.dark'] as const) describe(`the ${theme === ':root' ? 'light' : 'dark'} theme's tokens`, () => {
 const light = tokens(':root'), t = theme === ':root' ? light : {...light, ...tokens('.dark')};
 /** A token's hex, following one var() hop. */
 const hex = (name: string): string => {
  const v = t[name];
  expect(v, `--${name} is not defined`).toBeTruthy();
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (ref) return hex(ref[1]);
  expect(v, `--${name} is not a hex colour`).toMatch(/^#[0-9a-f]{3,6}$/i);
  return v;
 };
 const ratio = (a: string, b: string) => contrast(hex(a), hex(b));
 it('builds every neutral from pure greys', () => {
  for (const name of ['background', 'card', 'muted', 'border', 'border-strong', 'muted-foreground', 'foreground', 'diagram', 'cta', 'on-cta']) {
   const h = hex(name).replace('#', '');
   const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
   expect(full.slice(0, 2) === full.slice(2, 4) && full.slice(2, 4) === full.slice(4, 6), `--${name} ${hex(name)} is not a grey`).toBe(true);
  }
 });
 it('sets reading text on the ground and the cards at AAA', () => {
  for (const ground of ['background', 'card', 'diagram']) expect(ratio('foreground', ground), `ink on --${ground}`).toBeGreaterThanOrEqual(7);
 });
 it('keeps the muted grey and the teal accent at AA on every surface they sit on', () => {
  for (const ground of ['background', 'card', 'muted']) {
   expect(ratio('muted-foreground', ground), `muted on --${ground}`).toBeGreaterThanOrEqual(4.5);
   expect(ratio('primary', ground), `the accent on --${ground}`).toBeGreaterThanOrEqual(4.5);
  }
 });
 it('labels the ink button at AAA, in both themes', () => {
  expect(ratio('on-cta', 'cta')).toBeGreaterThanOrEqual(7);
  expect(ratio('on-cta', 'cta-hover')).toBeGreaterThanOrEqual(7);
  // The button is told from the ground it sits on by more than its label.
  for (const ground of ['background', 'card']) expect(ratio('cta', ground), `the button on --${ground}`).toBeGreaterThanOrEqual(3);
 });
 it('draws a control\'s edge and the run\'s track at 3:1 against the ground and the card', () => {
  for (const ground of ['background', 'card']) {
   expect(ratio('border-strong', ground), `control edge on --${ground}`).toBeGreaterThanOrEqual(3);
   expect(ratio('exp-track', ground), `track on --${ground}`).toBeGreaterThanOrEqual(3);
  }
 });
 it('keeps the hairlines quiet, the accent\'s one step stronger than the grey\'s', () => {
  for (const ground of ['background', 'card']) {
   const line = ratio('border', ground), rule = ratio('rule', ground);
   expect(line, `--border on --${ground}`).toBeLessThan(1.6);
   expect(rule, `--rule on --${ground}`).toBeGreaterThan(line);
   expect(rule, `--rule on --${ground}`).toBeLessThanOrEqual(2.2);
  }
 });
 it('keeps the figure\'s physics colours saturated: the charge, a piece\'s part and the field are not greys', () => {
  for (const name of ['charge', 'field', 'contribution']) {
   const h = hex(name).replace('#', '');
   expect(new Set([h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)]).size, `--${name}`).toBeGreaterThan(1);
  }
 });
});
