import {isReady} from '../problems/readiness';
import {parseAssignment} from './assignment';

/** Which page an address is: a lesson when it names one (or carries the values of the first, as an
 * old link with no lesson in it does -- see Explorer's reading of the address), the home page otherwise.
 * Every lesson's address names it (`?p=ring`), so a teacher's link still opens its lesson directly. */
export type View = 'home' | 'lesson';
export function viewOf(search: string): View {
  const a = parseAssignment(search);
  return (a.id && isReady(a.id)) || a.params ? 'lesson' : 'home';
}

/** A move made by the page itself. `pushState` fires no event of its own, so the page that switches
 * between home and lesson is told by this one; Back and Forward arrive as `popstate`. */
const NAVIGATE = 'field-builder:navigate';

/** Go to `href` inside the page, as a link would, without loading it again. */
export function navigate(href: string) {
  try { history.pushState(null, '', href); } catch { location.assign(href); return; }
  window.dispatchEvent(new Event(NAVIGATE));
}

/** The home page's address: this page with nothing after it. Relative, so the site works wherever it is
 * served from -- the published domain, a folder, a file on disk. */
export const HOME_HREF = './';
export function goHome() { navigate(location.pathname); }

/** Told whenever the address changes, by the page or by the browser's own Back and Forward. */
export function subscribeAddress(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE, onChange);
  return () => { window.removeEventListener('popstate', onChange); window.removeEventListener(NAVIGATE, onChange); };
}

/** A plain click: one meant for this tab. A click with a modifier, or with the middle button, is the
 * browser's -- a new tab, a new window -- and the link's address is what it opens there. */
export const inPlace = (e: {button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean}) =>
  e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
