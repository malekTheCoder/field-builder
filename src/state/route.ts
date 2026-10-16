import {isReady} from '../problems/readiness';
import {parseAssignment} from './assignment';
import {gaussIdOf} from '../gauss';

/** Which page an address is: a lesson when it names one (or carries the values of the first, as an
 * old link with no lesson in it does -- see Explorer's reading of the address), the study guide when it
 * says `?guide`, the quiz when it says `?quiz`, the home page otherwise. Every lesson's address names it (`?p=ring`), so a teacher's link
 * still opens its lesson directly; and a lesson wins over the guide, so no lesson link can be taken from it. */
export type View = 'home' | 'lesson' | 'gauss' | 'guide' | 'quiz';
export function viewOf(search: string): View {
  const a = parseAssignment(search);
  if ((a.id && isReady(a.id)) || a.params) return 'lesson';
  // A Gauss lesson (`?g=symmetry`), when it is ready (src/gauss): a page of its own, beside the integral lessons.
  if (gaussIdOf(search)) return 'gauss';
  const q = new URLSearchParams(search);
  return q.has('guide') ? 'guide' : q.has('quiz') ? 'quiz' : 'home';
}
/** The study guide's address: a page of its own a teacher can link to, as a lesson's is. */
export const GUIDE_HREF = '?guide';
/** Quiz yourself: a page of its own, never part of a lesson. `?quiz=ring` opens it with that shape ticked. */
export const QUIZ_HREF = '?quiz';

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
