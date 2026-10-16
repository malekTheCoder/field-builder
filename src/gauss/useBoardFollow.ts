'use client';
import {useEffect, useRef, type RefObject} from 'react';
/* THE BOARD FOLLOWS THE RUN, AS THE INTEGRAL LESSONS' DOES (Explorer.tsx, "THE BOARD FOLLOWS THE RUN WHERE IT SITS
 * BESIDE THE FIGURE"). Beside the figure the board is held to the window while the run is open (explorer.css) and
 * scrolls inside itself, but nothing scrolled it on a Gauss page: it kept its top for the whole run while its lines
 * grew past the window, so from Right side on the line being written was under the card's foot, and the answer, the
 * run's whole point, was never on screen. Now the current step is brought into view as it opens, its foot too as far
 * as its head allows, and at the end the answer, which outranks the step's head. Gliding, or at once under Reduce
 * Motion, which steps the run and must not skip what it shows.
 *
 * Looked at when the run moves to another stage, settles, starts playing, or stops by itself; never when the reader
 * pauses it (they may have wheeled the board back to read an earlier line). Once, and again when the line's own
 * opening has settled, with the rows still easing open counted at the height they will have. The room under the board
 * (--run-room, the spacer that lets the last line come up beside the figure) is set to what that place needs and no
 * more, and trimmed again when a glide back up ends. */
export const BOARD = '.gs-page .exp-workspace>.ew-panel';
export function useBoardFollowsRun({open, index, settled, playing, reduced, stoppedByRun}: {
  open: boolean; index: number; settled: boolean; playing: boolean; reduced: boolean;
  /** Set when the run came to rest by itself, not by the reader's Pause. */
  stoppedByRun: RefObject<boolean>;
}) {
  const followed = useRef({index: -1, settled: false});
  useEffect(() => {
    const panelOf = () => document.querySelector<HTMLElement>(BOARD);
    if (!open) { followed.current = {index: -1, settled: false}; panelOf()?.style.removeProperty('--run-room'); return; }
    const moved = followed.current.index !== index || followed.current.settled !== settled;
    followed.current = {index, settled};
    if (!moved && !playing && !stoppedByRun.current) return;
    let trim = () => {};
    const follow = (final: boolean) => {
      const panel = panelOf();
      if (!panel || getComputedStyle(panel).overflowY !== 'auto') return;
      // What of the panel is on screen: until the page has scrolled far enough for it to stick, its foot can still
      // be under the window's.
      const box = panel.getBoundingClientRect(), view = Math.min(panel.clientHeight, window.innerHeight - box.top - panel.clientTop);
      const at = (el: Element) => { const r = el.getBoundingClientRect(); return {top: r.top - box.top - panel.clientTop + panel.scrollTop, bottom: r.bottom - box.top - panel.clientTop + panel.scrollTop}; };
      const step = panel.querySelector('.db-step.is-here'), result = settled ? panel.querySelector('.ew-result.is-shown') : null;
      // Each row still easing open, where it is and how much it has still to grow, measured against the row round it.
      const growing = [...panel.querySelectorAll<HTMLElement>('.db-then.is-shown>.db-then-in,.db-step:not(.is-next) .db-reveal>.db-body')]
        .map(n => ({top: at(n).top, more: Math.max(0, n.scrollHeight - (n.parentElement ?? n).clientHeight)})).filter(g => g.more > 1);
      const later = (y: number) => y + growing.reduce((sum, g) => g.top < y ? sum + g.more : sum, 0);
      let to = panel.scrollTop;
      if (step) {
        const now = at(step), s = {top: later(now.top), bottom: later(now.bottom)};
        if (s.top < panel.scrollTop || s.top - panel.scrollTop > view * .4) to = Math.max(0, s.top - 72);
        if (s.bottom - to > view - 16) to = Math.max(to, Math.min(s.top - 16, s.bottom + 16 - view));
      }
      // The answer outranks the step's head: if the two cannot both be in view, the answer is.
      if (result) to = Math.max(to, later(at(result).bottom) + 16 - view);
      const last = panel.lastElementChild, end = last ? at(last).bottom : panel.scrollHeight;
      const need = Math.ceil(Math.max(0, Math.max(to, panel.scrollTop) + view - end)), had = panel.style.getPropertyValue('--run-room');
      // The first look only adds room (until the first exact size, the sheet's default, a window's worth, stands);
      // the second, once every row has settled, sizes it exactly.
      if (final || (had !== '' && need > parseFloat(had))) panel.style.setProperty('--run-room', `${need}px`);
      if (final && panel.scrollTop > to + 2) {
        panel.removeEventListener('scrollend', trim);
        trim = () => { panel.style.setProperty('--run-room', `${Math.ceil(Math.max(0, Math.max(to, panel.scrollTop) + view - end))}px`); };
        panel.addEventListener('scrollend', trim, {once: true});
      }
      if (Math.abs(to - panel.scrollTop) > 2) panel.scrollTo({top: to, behavior: reduced ? 'auto' : 'smooth'});
    };
    follow(false);
    const again = window.setTimeout(() => follow(true), reduced ? 0 : 650);
    return () => { window.clearTimeout(again); panelOf()?.removeEventListener('scrollend', trim); };
  }, [open, index, settled, playing, reduced, stoppedByRun]);
}
