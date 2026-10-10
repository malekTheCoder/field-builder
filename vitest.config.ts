import react from '@vitejs/plugin-react';
import {playwright} from '@vitest/browser-playwright';
import {realpathSync} from 'node:fs';
import {dirname} from 'node:path';
import {defineConfig} from 'vitest/config';
const root = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
// A git worktree links node_modules to the main checkout's. Vite serves nothing outside the
// project root, so in a worktree the fonts in that linked folder were refused: KaTeX and the
// page fell back to system faces, and every test that measures where a label lands measured a
// different font -- passing in the worktree and failing on main. Allow wherever the link points.
const modules = (() => { try { return dirname(realpathSync(`${root}/node_modules`)); } catch { return root; } })();
// Two projects. `unit` keeps the fast node suite for pure physics/geometry logic.
// `browser` runs real Chromium via Playwright, because the SVG interactions rely
// on getScreenCTM, DOMPoint and setPointerCapture, none of which jsdom implements.
export default defineConfig({
  test: {
    projects: [
      {test: {name: 'unit', environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 10000}},
      {
        plugins: [react()],
        resolve: {alias: {'@': root}},
        server: {fs: {allow: [root, modules]}},
        test: {
          name: 'browser', include: ['tests/**/*.browser.test.tsx'], testTimeout: 20000,
          // Focus, the active element and the document are global to a page, so browser
          // files cannot be isolated from each other by running them at once. Concurrently
          // the focus-trap test intermittently sees focus land outside the dialog; run
          // serially it passes every time. Correctness over a second of wall clock.
          fileParallelism: false,
          browser: {enabled: true, provider: playwright(), headless: true, screenshotFailures: false, instances: [{browser: 'chromium'}]},
        },
      },
    ],
  },
});
