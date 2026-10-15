'use client';
import {memo, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X} from 'lucide-react';
import {MathText, Prose} from '../components/Math';
import type {BuildStage} from './buildRun';
/** Where the run is, in seconds -- kept as a little store rather than as state on the page.
 *
 * It changes on every frame the run plays, and nothing draws it but this transport: the figure and
 * the board follow what the clock MEANS -- which stage, how much of the sum, how fine the cut --
 * and those change far less often. Held as state on the Explorer, it re-rendered the whole page
 * sixty times a second -- the lesson list, the sliders, the figure, the board -- to move one bar
 * along. Held here, a frame that only moves the bar re-renders only the bar.
 *
 * Read through state set by a listener, not `useSyncExternalStore`: that renders a store's change
 * on a lane of its own, so on a frame that moves the figure too, the bar and the figure would be
 * two separate renders and two separate commits, and could reach the screen a frame apart. */
export type RunClock = {get: () => number; set: (seconds: number) => void; subscribe: (listener: () => void) => () => void};
export function runClock(): RunClock {
  let at = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => at,
    set: seconds => { if (seconds === at) return; at = seconds; for (const listener of listeners) listener(); },
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
/** THE RUN'S TRANSPORT: a play button, a progress bar cut into the run's stages, and one line
 * saying what is happening now.
 *
 * It used to be five dots and two words. A reader could not tell how long the run was, how far
 * through it they were, or what the moving picture was in the middle of showing -- the dots said
 * which stage, not how much of it was left, and the only text was a paragraph too long to read
 * before the stage was over.
 *
 * Now the bar is the run drawn to scale: each stage gets a share of the width equal to its share
 * of the time, and fills as it plays, so the length of the whole thing and where you are in it are
 * both visible at a glance -- without a clock, on a page that prints no numbers. It is also how you
 * move around: click a stage to go to its start, or drag along the bar to scrub through the run. */
/** A line of the transport's algebra: TeX, or a second component that survives beside the one being
 * built, which the board says in words ("… survives too") and so does this -- or the line's own conclusion,
 * row by row, each `= …`, which follows it on the same row where the transport is wide enough (Explorer,
 * playerSteps) -- or what the line's new symbol stands for, set smaller beside it as the board sets it under
 * it -- or the cancellation that opens What cancels, on a row of its own. */
export type PlayerLine = string | {also: string} | {finish: readonly string[]; strut?: string} | {where: string} | {cancels: string};
type Props = {
  stages: readonly BuildStage[];
  /** Seconds into the run, as the store above: read here and nowhere else on the page. */
  clock: RunClock;
  index: number;
  playing: boolean;
  /** Every stage's lines of algebra, for the screens where the panel holding them is out of sight. */
  math?: readonly (readonly PlayerLine[])[];
  /** Once the run has settled: how the last integral comes out, and the answer. */
  chain?: readonly string[];
  answer?: readonly string[];
  /** What the answer is said to be, over it: the integral done, or -- where the sum was already exact -- the
   * pieces added up. Prose, so its symbols are set as math. */
  lead?: string;
  onPlay: () => void;
  /** Go to a moment, holding still there. `scrubbing` is true while a drag is still under way. */
  onSeek: (seconds: number, scrubbing: boolean) => void;
  /** Play one stage through and stop at its end. */
  onStep: (index: number) => void;
  onClose: () => void;
};
const NO_MATH: readonly (readonly PlayerLine[])[] = [], NO_LINES: readonly string[] = [];
/** Whether the drawing the run plays on is on screen -- its middle inside the window. Page Down and Page Up
 * step the run only then. They used to step it always, and a reader who had scrolled down to read the board
 * under the figure (a Chromebook in half its screen, a phone, a page zoomed to 200%) could not page: each
 * press played the next stage on a figure a screen above the window, and the page stayed where it was.
 * With no drawing to look at -- a transport mounted on its own -- the keys step, as they always did. */
export function drawingOnScreen(card?: Element | null): boolean {
  const stage = (card ?? document.querySelector('.explorer-app .exp-diagram-card'))?.querySelector('.cd-stage');
  if (!stage) return true;
  const d = stage.getBoundingClientRect();
  return d.bottom > d.height / 2 && d.top < window.innerHeight - d.height / 2;
}
const INTEGRAL_DONE = 'Doing the integral gives this.';
/** k as the panel defines it under its answer: the run's answer is written in it. */
const K_IS = String.raw`k=1/(4\pi\varepsilon_0)`;
/** Memoised so that the page re-rendering around it -- which it does whenever the figure moves --
 * does not redraw it; the clock alone moves it on every frame. */
export const BuildPlayer = memo(function BuildPlayer({stages, clock, index, playing, math = NO_MATH, chain = NO_LINES, answer = NO_LINES, lead = INTEGRAL_DONE, onPlay, onSeek, onStep, onClose}: Props) {
  const starts = useMemo(() => stages.map((_, i) => stages.slice(0, i).reduce((t, s) => t + s.seconds, 0)), [stages]);
  const total = stages.reduce((t, s) => t + s.seconds, 0);
  const fillOf = (seconds: number, i: number) => Math.max(0, Math.min(1, (seconds - starts[i]) / stages[i].seconds));
  /** THE BAR GLIDES AT THE CLOCK'S OWN RATE. Its fill and its knob were drawn by a render of this transport on every
   * tick of the clock -- a React state update scheduled from the run's frame, committed later, and on a frame where
   * the figure was also being redrawn (Add them up, Shrink them, a drag along the bar) committed with it, after it:
   * the bar moved in steps of whatever the figure took to draw, and on a slow frame skipped. Now each tick writes the
   * fill's scale and the knob's offset straight onto them, in the frame the clock moved, as transforms: nothing is
   * laid out and nothing waits on a render. Only what changes by stages -- which are done, whether the run has
   * ended -- is state, and it renders only when one of those changes. */
  const track = useRef<HTMLDivElement>(null);
  const shape = (seconds: number) => starts.map((_, i) => fillOf(seconds, i) >= 1 ? 1 : 0).join('') + (seconds >= total - .01 ? 'e' : '');
  const [, setShape] = useState(() => shape(clock.get()));
  const glide = useRef(0), jumping = useRef(0);
  useLayoutEffect(() => {
    const draw = () => {
      const seconds = clock.get(), el = track.current;
      if (el) el.querySelectorAll<HTMLElement>('.bp-seg').forEach((seg, i) => {
        const f = fillOf(seconds, i);
        const fill = seg.querySelector<HTMLElement>('.bp-seg-fill'), knob = seg.querySelector<HTMLElement>('.bp-knob-track');
        if (fill) fill.style.transform = `scaleX(${f})`;
        if (knob) knob.style.transform = `translateX(${(f * 100).toFixed(3)}%)`;
      });
      // The jump is the first move after a click; any move after it is the run playing on, or a drag, and is not eased.
      if (jumping.current === 2) { jumping.current = 0; el?.classList.remove('is-jumping'); } else if (jumping.current === 1) jumping.current = 2;
      setShape(shape(seconds));
    };
    // Subscribed before the browser can run another frame: layout effects run inside the commit.
    return clock.subscribe(draw);
  });
  const at = clock.get();
  const ended = !playing && at >= total - .01;
  /** A click on a stage, or a step, jumps the bar: that one move eases, briefly. Playing and scrubbing never do --
   * an eased bar trails the clock it shows. Reduced Motion drops the ease (globals.css). */
  const jump = () => {
    const el = track.current;
    if (!el) return;
    el.classList.add('is-jumping');
    jumping.current = 1;
    window.clearTimeout(glide.current);
    glide.current = window.setTimeout(() => { jumping.current = 0; el.classList.remove('is-jumping'); }, 260);
  };
  // The algebra changes with the stage, not with the clock, so it is not rebuilt with every frame.
  // EVERY STAGE'S ALGEBRA IS SET, AND ONLY THE CURRENT STAGE'S SHOWS -- as with the sentences above it,
  // and for the same reason: each stage's line is a different height, and on a phone the page under
  // the transport moved by that difference at every stage, just as the figure began to move. The cell
  // is as tall as the tallest of them until the run settles, which adds the answer once.
  // The finished integral and the answer are set apart, so a window with room for one line of algebra
  // can keep the answer alone (explorer.css).
  const mathBlock = useMemo(() => math.length > 0 && <div className={'bp-math' + (answer.length > 0 ? ' is-settled' : '')}>
    <div className="bp-math-steps">
      {/* A conclusion follows its line on the same row where there is room, wrapping under it where there is not:
          stacked, it made the cell a line taller for every stage, and the algebra's foot went under the window
          on a projector, where the drawing is sized to leave the cell its room. Its rows after the first hang
          under the first, each opening on its "=", so a chain of two reads as the board's.
          And what a new symbol stands for -- rᵢ = √(y² + r²), cos α = r/√(y² + r²) -- follows its line the same
          way. Only the board said it, a scroll below on a phone, so the run there never said what α or rᵢ is. */}
      {math.map((lines, i) => <div key={i} className={'bp-math-step' + (i === index ? ' is-here' : '')} aria-hidden={i === index ? undefined : true}>
        {lines.map(line => typeof line === 'string'
          ? <MathText key={line} tex={line} block trusted />
          : 'finish' in line
            ? <div key={`finish:${line.finish.join('|')}`} className={'bp-finish' + (line.strut ? ' has-strut' : '')}>
              {/* The board's left side, unseen, drawn only where the conclusion goes under its line (explorer.css). */}
              {line.strut && <span className="bp-strut" aria-hidden="true"><MathText tex={line.strut} block trusted /></span>}
              <div className="bp-finish-rows">{line.finish.map(tex => <MathText key={tex} tex={tex} block trusted />)}</div>
            </div>
            : 'where' in line
              ? <MathText key={`where:${line.where}`} className="bp-where" tex={line.where} trusted />
              : 'cancels' in line
                ? <MathText key={`cancels:${line.cancels}`} className="bp-cancels" tex={line.cancels} block trusted />
                : <p key={`also:${line.also}`} className="bp-say"><MathText tex={line.also} trusted /> survives too.</p>)}
      </div>)}
    </div>
    {chain.length > 0 && <div className="bp-chain">{chain.map(tex => <MathText key={tex} tex={tex} block trusted />)}</div>}
    {/* The answer as the panel gives it: said to be the integral done, and with its k defined. Under the
        finished integral, a phone reader met answer rows with no word saying what they were, in a k the
        transport never defined. And said as the panel says it: on the ring and the exact potentials the run had
        just said the sum needs no integral, and "Doing the integral gives this" then credited the integral. */}
    {answer.length > 0 && <div className="bp-answer"><p className="bp-say bp-lead"><Prose text={lead} /></p>{answer.map(tex => <MathText key={tex} tex={tex} block trusted />)}<p className="bp-say bp-k">with <MathText tex={K_IS} /></p></div>}
  </div>, [math, chain, answer, index, lead]);
  const segments = useRef<(HTMLButtonElement | null)[]>([]);
  const press = useRef<{x: number; y: number; moved: boolean} | null>(null), dragged = useRef(false);
  /** The moment under a point on the bar: find the stage it is over, then how far along it. */
  const momentAt = (clientX: number) => {
    const boxes = segments.current.map(el => el?.getBoundingClientRect());
    for (let i = 0; i < stages.length; i++) {
      const box = boxes[i];
      if (!box) continue;
      const next = boxes[i + 1];
      // The gap between two segments belongs to the earlier one, so the bar has no dead spots.
      if (clientX < (next ? next.left : Infinity) || i === stages.length - 1) {
        const f = Math.max(0, Math.min(1, (clientX - box.left) / Math.max(1, box.width)));
        return starts[i] + f * stages[i].seconds;
      }
    }
    return 0;
  };
  // A press only becomes a scrub once it has moved. Capturing the pointer straight away would
  // steal the click from the stage button under it, so a plain click still means "go to the start
  // of this stage" -- the keyboard's meaning too -- and only a drag scrubs.
  // And only a drag ALONG the bar. The bar lets a touch screen scroll the page up and down over it
  // (touch-action:pan-y, explorer.css): it sits mid-screen, where a thumb rests while the run plays,
  // and a swipe there scrolled nothing. A swipe that drifts a few pixels sideways on its way up is
  // still a scroll, not a seek, so a press turns into a scrub only when it has gone further across
  // than up or down; the browser takes the rest and cancels the press.
  const pointer = {
    onPointerDown: (ev: PointerEvent<HTMLDivElement>) => { dragged.current = false; if (ev.button === 0) press.current = {x: ev.clientX, y: ev.clientY, moved: false}; },
    onPointerMove: (ev: PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      if (!p) return;
      const dx = Math.abs(ev.clientX - p.x), dy = Math.abs(ev.clientY - p.y);
      if (!p.moved && (dx < 4 || dx <= dy)) return;
      if (!p.moved) { p.moved = dragged.current = true; try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* the drag still scrubs without capture */ } }
      onSeek(momentAt(ev.clientX), true);
    },
    onPointerUp: (ev: PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      press.current = null;
      if (p?.moved) onSeek(momentAt(ev.clientX), false);
    },
    // A drag the browser takes back still ends: the page stops treating the run as being scrubbed.
    onPointerCancel: () => { const p = press.current; press.current = null; if (p?.moved) onSeek(clock.get(), false); },
  };
  // The arrow keys step between stages from anywhere in the transport, as they do in a media
  // player's chapter list. The figure keeps its own arrow keys: these only act while the focus is
  // here, on one of the run's own buttons.
  // On a stage's own segment they step from THAT stage, and the focus goes with them, as in a list
  // of tabs. They used to step from wherever the run was playing and leave the focus behind, so the
  // focus ring sat on one stage while the run moved to another.
  // A presenter's clicker sends Page Down and Page Up: they are the arrows here too, so a clicker pressed
  // after a click on Play steps the run rather than scrolling the figure off the projector.
  // Only while the drawing is on screen, though (drawingOnScreen): below it they page, as they do anywhere.
  //
  // ONE PRESS PAST THE END DOES NOTHING. At the last stage "next" was the last stage again, so a presenter's
  // clicker pressed once more at the climax -- or Arrow Right on Play -- replayed Shrink them from its start:
  // the answer left the board and the figure went back to "Cut into pieces". Next is marked unavailable there,
  // and the keys now agree with it; the focus stays where it is.
  const keys = (ev: KeyboardEvent<HTMLDivElement>) => {
    const forward = ev.key === 'ArrowRight' || ev.key === 'PageDown';
    if (!forward && ev.key !== 'ArrowLeft' && ev.key !== 'PageUp') return;
    const paging = ev.key.startsWith('Page');
    if (paging && !drawingOnScreen(ev.currentTarget.closest('.exp-diagram-card'))) return;
    ev.preventDefault();
    if (ev.repeat && paging) return;
    const from = segments.current.indexOf(ev.target as HTMLButtonElement);
    if (forward && (from >= 0 ? from : index) === stages.length - 1) return;
    if (from >= 0) {
      const next = forward ? Math.min(stages.length - 1, from + 1) : Math.max(0, from - 1);
      jump();
      onStep(next);
      segments.current[next]?.focus();
      return;
    }
    jump();
    onStep(forward ? Math.min(stages.length - 1, index + 1) : clock.get() - starts[index] > .6 || index === 0 ? index : index - 1);
  };
  const last = index === stages.length - 1;
  // A group of controls with a name, which is exactly what the role says; the tags the linter
  // offers instead (a fieldset, an address) would each claim to be something this is not.
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions
  return <div className="bp" role="group" aria-label="Watch it build" onKeyDown={keys}>
    <div className="bp-bar">
      <button type="button" className="bp-play" onClick={onPlay} aria-label={playing ? 'Pause' : ended ? 'Play again' : 'Play'}>
        {playing ? <Pause size={15} fill="currentColor" strokeWidth={0} /> : ended ? <RotateCcw size={15} strokeWidth={2.4} /> : <Play size={15} fill="currentColor" strokeWidth={0} />}
      </button>
      <div ref={track} className="bp-track" {...pointer}>
        {stages.map((s, i) => {
          const fill = fillOf(at, i);
          const here = i === index;
          // One tab stop for the five, on the stage the run is at: the arrow keys already move between
          // them, as in a list of tabs, and five stops stood between Play and Close.
          // No title: it was the stage's sentence, which a screen reader read as the segment's description
          // as the arrow keys moved onto it -- the same sentence the live region was reading for the stage
          // the key had just played, so every press said it twice. The sentence is printed under the bar.
          return <button key={s.key} ref={el => { segments.current[i] = el; }} type="button" tabIndex={here ? 0 : -1}
            className={'bp-seg' + (here ? ' is-here' : '') + (fill >= 1 ? ' is-done' : '')}
            style={{flexGrow: s.seconds}} aria-label={`Stage ${i + 1}: ${s.name}`} aria-current={here ? 'step' : undefined}
            onClick={() => { if (!dragged.current) { jump(); onSeek(starts[i], false); } dragged.current = false; }}>
            <span className="bp-seg-bar" aria-hidden="true"><span className="bp-seg-fill" style={{transform: `scaleX(${fill})`}} /></span>
            {here && <span className="bp-knob-track" aria-hidden="true" style={{transform: `translateX(${(fill * 100).toFixed(3)}%)`}}><span className="bp-knob" /></span>}
            <span className="bp-seg-name" aria-hidden="true">{s.name}</span>
          </button>;
        })}
      </div>
      <button type="button" className="bp-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
    </div>
    <div className="bp-now">
      {/* EVERY STAGE'S LINE IS SET, AND ONLY THE CURRENT ONE SHOWS. They share one cell, so the
          cell is always as tall as the longest of them: switching between three and four lines
          moved everything under the transport at each stage. The current one is re-keyed per stage
          so each new line arrives rather than being swapped in place. */}
      <div className="bp-lines">
        {stages.map((s, i) => i === index
          ? <p key={s.key} className="bp-line"><strong>{s.name}.</strong> <Prose text={s.prose} /></p>
          : <p key={`held-${s.key}`} className="bp-line-held" aria-hidden="true"><strong>{s.name}.</strong> <Prose text={s.prose} /></p>)}
      </div>
      <span className="bp-steps">
        <button type="button" className="bp-icon" onClick={() => { jump(); onStep(clock.get() - starts[index] > .6 || index === 0 ? index : index - 1); }} aria-label="Previous stage"><ChevronLeft size={17} /></button>
        {/* Marked unavailable rather than disabled at the last stage: disabling the button that has
            the focus -- which pressing it from the fourth stage did -- dropped the focus to the page. */}
        <button type="button" className="bp-icon" onClick={() => { if (!last) { jump(); onStep(index + 1); } }} aria-disabled={last || undefined} aria-label="Next stage"><ChevronRight size={17} /></button>
      </span>
    </div>
    {mathBlock}
  </div>;
});
