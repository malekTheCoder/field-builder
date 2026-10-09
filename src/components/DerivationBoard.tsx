'use client';
import {useId, type PointerEvent} from 'react';
import {MathText} from './Math';
import type {BoardLine, Term} from '../workbench/derivation';
/** THE INTEGRAL, ONE LINE PER STAGE OF THE RUN.
 *
 * This replaces a row of blanks under the sentence "Every factor is already drawn. Click it in
 * the figure." -- which was not true: clicking the figure filled nothing, and the blanks only
 * filled during a separate walkthrough most readers never opened. So the panel sat there as four
 * dashed lines and an instruction that did nothing, and read as broken.
 *
 * Now it is the derivation itself, the way it would be written on a board: each line is the one
 * above it with one new idea, in the same order as the run under the figure. While the run plays,
 * the lines arrive with it; at rest the whole derivation is there to read. Each line is also a
 * way in -- choosing one plays that step on the figure -- and every factor is coloured like the
 * feature it comes from, and lights that feature when pointed at. */
export type BoardState = {
  /** The run is open, playing or paused. At rest every line is shown and none is current. */
  open: boolean;
  /** The stage the run is in. */
  index: number;
  playing: boolean;
  /** The last stage has arrived at the integral, so its finished form can be shown. */
  settled: boolean;
};
const TERMS: readonly Term[] = ['element', 'distance', 'projection', 'bounds'];
/** The factor under the pointer, from the class KaTeX carried through for it. */
function termAt(target: EventTarget | null): Term | '' {
  const el = target instanceof Element ? target.closest('.fx') : null;
  return TERMS.find(t => el?.classList.contains(`fx-${t}`)) ?? '';
}
export function DerivationBoard({lines, names, notes, state, lit = '', onStep, onPoint}: {
  lines: BoardLine[]; names: string[]; notes: string[]; state: BoardState; lit?: Term | '';
  onStep?: (index: number) => void; onPoint?: (term: Term | '') => void;
}) {
  const {open, index, playing, settled} = state;
  const uid = useId();
  const point = (ev: PointerEvent) => onPoint?.(termAt(ev.target));
  return <ol className={'db' + (open ? ' is-running' : '') + (lit ? ` db-lit-${lit}` : '')} onPointerOver={point} onPointerLeave={() => onPoint?.('')}>
    {lines.map((line, i) => {
      const stage = !open ? 'rest' : i < index ? 'done' : i === index ? 'here' : 'next';
      // The finished integral is the last thing the run arrives at, so it waits for it.
      const finished = !open || i < index || (i === index && settled);
      // The whole step is one button: the name, the line and its gloss. A reader reaches for the
      // equation, not the label above it, so that is where the target has to be. The name is what
      // the button is called; the line itself is read as its description.
      return <li key={line.key} className={`db-step is-${stage}`} data-step={line.key}>
        <button type="button" className="db-head" onClick={() => onStep?.(i)} aria-current={stage === 'here' ? 'step' : undefined}
          aria-label={`${names[i]}: play this step on the figure`} aria-describedby={stage === 'next' ? undefined : `${uid}-${line.key}`}>
          <span className="db-title"><span className="db-node" aria-hidden="true" /><span className="db-name">{names[i]}</span></span>
          {/* Collapsed rather than unmounted while it is still to come, so it can open smoothly. */}
          <span className="db-reveal" aria-hidden={stage === 'next' ? true : undefined}>
            <span className="db-body" id={`${uid}-${line.key}`}>
              <MathText className="db-tex" tex={line.tex} block trusted />
              {line.where && <MathText className="db-where" tex={line.where} trusted />}
              {line.also && <MathText className="db-where db-also" tex={line.also} trusted />}
              {line.finish && <span className={'db-then' + (finished ? ' is-shown' : '')}><MathText tex={line.finish} block trusted /></span>}
              {stage === 'here' && !playing && <span className="db-note">{notes[i]}</span>}
            </span>
          </span>
        </button>
      </li>;
    })}
  </ol>;
}
