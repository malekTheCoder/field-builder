'use client';
import {useEffect, useRef, useState} from 'react';
/** A hand-drawn arrow, once, pointing at the one control a first-time reader should press.
 *
 * The tour used to open itself on arrival. A dialog in front of a page nobody has seen yet asks
 * to be dismissed before it can be read, and dismissing is what most people do — so the tour was
 * least likely to be read exactly when it was most useful. This points at it instead and leaves
 * the page alone: the reader can take the walkthrough, or start moving sliders and come back.
 *
 * It appears once. The flag is the same `seen` the tour has always set, so a reader who takes the
 * walkthrough never sees the arrow, and one who ignores it is not asked twice. */
export function StartHere({target, label = 'start here', onSettled}: {
  target: React.RefObject<HTMLElement | null>;
  label?: string;
  onSettled?: () => void;
}) {
  const [box, setBox] = useState<{left: number; top: number} | null>(null);
  const [showing, setShowing] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const settled = useRef(onSettled);
  useEffect(() => { settled.current = onSettled; });
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const place = () => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      // Centred under the control and clamped to the window, so it cannot hang off the edge on
      // a narrow screen the way a fixed offset would.
      const half = (wrap.current?.offsetWidth ?? 120) / 2;
      setBox({left: Math.min(Math.max(r.left + r.width / 2, half + 12), window.innerWidth - half - 12), top: r.bottom + 10});
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    const show = setTimeout(() => setShowing(true), 450);
    // It goes as soon as the reader does anything at all: the arrow is an offer, not a gate.
    const dismiss = () => setShowing(false);
    for (const ev of ['pointerdown', 'keydown', 'wheel'] as const) window.addEventListener(ev, dismiss, {passive: true});
    const give = setTimeout(dismiss, 9000);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(show); clearTimeout(give);
      window.removeEventListener('resize', place);
      for (const ev of ['pointerdown', 'keydown', 'wheel'] as const) window.removeEventListener(ev, dismiss);
    };
  }, [target]);
  // Once the arrow has had its turn -- shown, then dismissed -- the caller writes the flag and it
  // never returns. Only on that transition: `showing` is false before the arrow appears too, and
  // reporting then told the caller it was finished half a second before it started, which
  // unmounted it on the spot and it was never seen at all.
  const shown = useRef(false);
  useEffect(() => { if (showing) shown.current = true; else if (shown.current) settled.current?.(); }, [showing]);
  if (!box) return null;
  return <div ref={wrap} className={`start-here${showing ? ' is-visible' : ''}`} style={{left: box.left, top: box.top}} aria-hidden="true">
    <svg className="start-here-arrow" viewBox="0 0 36 54" width="34" height="52" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 52 C8 43 28 35 18 26 C8 17 28 9 18 3" />
      <path d="M12 10 L18 2 L24 10" />
    </svg>
    <p className="start-here-text">{label}</p>
  </div>;
}
