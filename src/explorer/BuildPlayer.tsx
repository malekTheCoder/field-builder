'use client';
import {useRef, type KeyboardEvent, type PointerEvent} from 'react';
import {ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X} from 'lucide-react';
import {MathText} from '../components/Math';
import type {BuildStage} from './buildRun';
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
type Props = {
  stages: readonly BuildStage[];
  /** Seconds into the run. */
  at: number;
  index: number;
  playing: boolean;
  /** The current stage's lines of algebra, for the screens where the panel holding them is out of sight. */
  math?: string[];
  onPlay: () => void;
  /** Go to a moment, holding still there. `scrubbing` is true while a drag is still under way. */
  onSeek: (seconds: number, scrubbing: boolean) => void;
  /** Play one stage through and stop at its end. */
  onStep: (index: number) => void;
  onClose: () => void;
};
export function BuildPlayer({stages, at, index, playing, math = [], onPlay, onSeek, onStep, onClose}: Props) {
  const starts = stages.map((_, i) => stages.slice(0, i).reduce((t, s) => t + s.seconds, 0));
  const total = stages.reduce((t, s) => t + s.seconds, 0);
  const ended = !playing && at >= total - .01;
  const stage = stages[index];
  const segments = useRef<(HTMLButtonElement | null)[]>([]);
  const press = useRef<{x: number; moved: boolean} | null>(null), dragged = useRef(false);
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
  const pointer = {
    onPointerDown: (ev: PointerEvent<HTMLDivElement>) => { dragged.current = false; if (ev.button === 0) press.current = {x: ev.clientX, moved: false}; },
    onPointerMove: (ev: PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      if (!p) return;
      if (!p.moved && Math.abs(ev.clientX - p.x) < 4) return;
      if (!p.moved) { p.moved = dragged.current = true; try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* the drag still scrubs without capture */ } }
      onSeek(momentAt(ev.clientX), true);
    },
    onPointerUp: (ev: PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      press.current = null;
      if (p?.moved) onSeek(momentAt(ev.clientX), false);
    },
    onPointerCancel: () => { press.current = null; },
  };
  // The arrow keys step between stages from anywhere in the transport, as they do in a media
  // player's chapter list. The figure keeps its own arrow keys: these only act while the focus is
  // here, on one of the run's own buttons.
  const keys = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    onStep(ev.key === 'ArrowRight' ? Math.min(stages.length - 1, index + 1) : at - starts[index] > .6 || index === 0 ? index : index - 1);
  };
  // A group of controls with a name, which is exactly what the role says; the tags the linter
  // offers instead (a fieldset, an address) would each claim to be something this is not.
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions
  return <div className="bp" role="group" aria-label="Watch it build" onKeyDown={keys}>
    <div className="bp-bar">
      <button type="button" className="bp-play" onClick={onPlay} aria-label={playing ? 'Pause' : ended ? 'Play again' : 'Play'}>
        {playing ? <Pause size={15} fill="currentColor" strokeWidth={0} /> : ended ? <RotateCcw size={15} strokeWidth={2.4} /> : <Play size={15} fill="currentColor" strokeWidth={0} />}
      </button>
      <div className="bp-track" {...pointer}>
        {stages.map((s, i) => {
          const fill = Math.max(0, Math.min(1, (at - starts[i]) / s.seconds));
          const here = i === index;
          return <button key={s.key} ref={el => { segments.current[i] = el; }} type="button"
            className={'bp-seg' + (here ? ' is-here' : '') + (fill >= 1 ? ' is-done' : '')}
            style={{flexGrow: s.seconds}} aria-label={`Stage ${i + 1}: ${s.name}`} aria-current={here ? 'step' : undefined} title={`${s.name}. ${s.line}`}
            onClick={() => { if (!dragged.current) onSeek(starts[i], false); dragged.current = false; }}>
            <span className="bp-seg-bar" aria-hidden="true"><span className="bp-seg-fill" style={{transform: `scaleX(${fill})`}} /></span>
            {here && <span className="bp-knob" aria-hidden="true" style={{left: `${fill * 100}%`}} />}
            <span className="bp-seg-name" aria-hidden="true">{s.name}</span>
          </button>;
        })}
      </div>
      <button type="button" className="bp-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
    </div>
    <div className="bp-now">
      {/* Re-keyed per stage so each new line arrives rather than being swapped in place. */}
      <p key={stage.key} className="bp-line"><strong>{stage.name}.</strong> {stage.line}</p>
      <span className="bp-steps">
        <button type="button" className="bp-icon" onClick={() => onStep(at - starts[index] > .6 || index === 0 ? index : index - 1)} aria-label="Previous stage"><ChevronLeft size={17} /></button>
        <button type="button" className="bp-icon" onClick={() => onStep(Math.min(stages.length - 1, index + 1))} disabled={index === stages.length - 1} aria-label="Next stage"><ChevronRight size={17} /></button>
      </span>
    </div>
    {math.length > 0 && <div key={`m-${stage.key}`} className="bp-math">{math.map(tex => <MathText key={tex} tex={tex} block trusted />)}</div>}
  </div>;
}
