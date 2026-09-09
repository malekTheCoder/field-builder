import react from '@vitejs/plugin-react';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';
// Two projects. `unit` keeps the fast node suite for pure physics/geometry logic.
// `browser` runs real Chromium via Playwright, because the SVG interactions rely
// on getScreenCTM, DOMPoint and setPointerCapture, none of which jsdom implements.
export default defineConfig({
  test: {
    projects: [
      {test: {name: 'unit', environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 10000}},
      {
        plugins: [react()],
        resolve: {alias: {'@': new URL('.', import.meta.url).pathname.replace(/\/$/, '')}},
        test: {
          name: 'browser', include: ['tests/**/*.browser.test.tsx'], testTimeout: 20000,
          browser: {enabled: true, provider: playwright(), headless: true, screenshotFailures: false, instances: [{browser: 'chromium'}]},
        },
      },
    ],
  },
});
