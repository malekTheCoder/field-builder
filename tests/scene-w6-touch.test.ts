import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
/* THE FIGURE IN SPACE ON A TOUCH SCREEN, WAVE 6.
 *
 * `.cd-orbitable{touch-action:none}` gave every swipe that began on the 3D figure to the orbit, and on a phone the
 * figure is nearly the screen's width: the page could only be scrolled from a sixteen-pixel gutter. A coarse pointer
 * now lets a vertical swipe scroll the page; the handles inside keep their own touch-action:none. */
const sheet = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
describe('the figure in space, under a finger', () => {
 it('lets a vertical swipe scroll the page, and keeps the handles dragging every way', () => {
  expect(sheet('../src/diagrams/camera.css')).toMatch(/@media\s*\(any-pointer:\s*coarse\)\s*\{\s*\.cd-orbitable\{[^}]*touch-action:pan-y/);
  const figure = sheet('../src/diagrams/charge-diagram.css');
  for (const handle of ['cd-observation', 'cd-bound', 'cd-cube']) expect(figure, handle).toMatch(new RegExp(`\\.${handle}\\{[^}]*touch-action:none`));
 });
});
