import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
/* THE LIMITING-CASE TABS ARE ALL READABLE, FROM THEIR FIRST LETTER.
 *
 * The list was held to one row and centred, so three long titles -- the ring's -- ran out past both
 * ends of it, and the first lost its opening words off the left edge: "ar away, a point charge
 * emerges". They wrap now.
 *
 * This project does not build the app's utility classes, and the overflow came from them: the list
 * is an inline flex row that centres its tabs, and each tab refuses to wrap its words. So the same
 * rules are set here, in the same cascade layer the app keeps them in, under the stylesheet that
 * has to win against them. */
const UTILITIES = `@layer utilities{
 [data-slot=tabs-list]{display:inline-flex;width:fit-content;align-items:center;justify-content:center;height:2rem;padding:3px}
 [data-slot=tabs-trigger]{display:inline-flex;flex:1 1 0%;align-items:center;justify-content:center;height:calc(100% - 1px);white-space:nowrap;padding:2px 6px;font-size:14px}
}`;
let sheet: HTMLStyleElement;
beforeEach(() => { sheet = document.createElement('style'); sheet.textContent = UTILITIES; document.head.insertBefore(sheet, document.head.firstChild); });
afterEach(async () => {
 cleanup();
 sheet.remove();
 window.history.replaceState(null, '', '/');
 await page.viewport(1280, 800);
});
async function openLesson(id: string) {
 await new Promise(r => setTimeout(r, 280));
 localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id, seen: true, dark: false, sidebarOpen: true, params: {}}));
 const view = render(<Explorer />);
 await view.findByRole('button', {name: 'Watch it build'});
 await waitFor(() => expect(view.container.querySelector('h1')?.textContent, 'opened the wrong lesson').toBe(getProblem(id as never).title));
 return view;
}
describe('limiting cases', () => {
 for (const [w, h] of [[1440, 900], [1060, 900]] as const) it(`every tab starts inside the list at ${w} by ${h}`, async () => {
  await page.viewport(w, h);
  const view = await openLesson('ring');
  // Limiting cases starts open: a click on its summary would fold it away.
  const list = await waitFor(() => { const el = view.container.querySelector<HTMLElement>('.exp-limit-tabs'); expect(el).toBeTruthy(); return el!; });
  const box = list.getBoundingClientRect();
  const tabs = [...list.querySelectorAll<HTMLElement>('[data-slot=tabs-trigger]')];
  expect(tabs.length).toBe(3);
  for (const tab of tabs) {
   const t = tab.getBoundingClientRect();
   expect(t.left, `"${tab.textContent}" starts left of its list`).toBeGreaterThanOrEqual(box.left - .5);
   expect(t.right, `"${tab.textContent}" ends right of its list`).toBeLessThanOrEqual(box.right + .5);
   // And none of its words is cut: the tab is as wide as what it says.
   expect(tab.scrollWidth).toBeLessThanOrEqual(tab.clientWidth + 1);
  }
 }, 15000);
});
