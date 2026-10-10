'use client';
import {memo, useId, type PointerEvent, type ReactNode} from 'react';
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
/** A remark in words, with any symbol in it -- written $…$ -- set as math: the λ in the sentence is
 * then the λ in the equation above it, in the same face, rather than a Greek letter from whatever
 * font the browser found. The words still wrap; only a symbol is held together. */
function Prose({text}: {text: string}) {
  const parts = text.split('$');
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (!(i % 2)) { out.push(parts[i]); continue; }
    // KaTeX sets a symbol as inline blocks, and a browser will break a line before one even after
    // a no-break space -- so a sentence ended on a lone "P." on a line of its own. A word joined to
    // its symbol that way is held to it, with the punctuation after, in one unbreakable run -- and
    // with the rest of a hyphenated word, which broke after its hyphen: "the x-" ending one line and
    // "axis." starting the next.
    // And a symbol is never broken inside: KaTeX lets a line break after an "=", and "y = L/2" was
    // set as "y =" at the end of one line and "L/2" at the start of the next.
    const before = typeof out.at(-1) === 'string' ? (out.at(-1) as string).match(/^([\s\S]*?)(\S+\u00a0)$/) : null;
    if (!before) { out.push(<MathText key={i} className="db-sym" tex={parts[i]} />); continue; }
    const after = parts[i + 1]?.match(/^(?:-[A-Za-z]+)?[.,;:]*/)?.[0] ?? '';
    out[out.length - 1] = before[1];
    out.push(<span key={i} className="db-held">{before[2]}<MathText className="db-sym" tex={parts[i]} />{after}</span>);
    if (after) parts[i + 1] = parts[i + 1].slice(after.length);
  }
  return out;
}
/** The factor under the pointer, from the class KaTeX carried through for it. */
function termAt(target: EventTarget | null): Term | '' {
  const el = target instanceof Element ? target.closest('.fx') : null;
  return TERMS.find(t => el?.classList.contains(`fx-${t}`)) ?? '';
}
/* Memoised because the run re-renders the page every frame it plays -- the figure has to move --
 * while the board changes only when the run enters a stage, pauses or settles. So its props are
 * kept stable by the panel (the lines memoised, the state rebuilt only when one of its four fields
 * changes, the callbacks fixed for the panel's life) and a frame that moves nothing here costs
 * nothing here. */
export const DerivationBoard = memo(function DerivationBoard({lines, names, notes, state, lit = '', onStep, onPoint}: {
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
              {/* The second half of a chain of equalities follows the first directly, its "=" under
                  the first one's; what the line's new symbols mean comes after the whole chain. */}
              {line.finish && <span className={'db-then' + (finished ? ' is-shown' : '')}><MathText tex={line.finish} block trusted /></span>}
              {line.where && <MathText className="db-where" tex={line.where} trusted />}
              {line.say && <span className="db-where db-say"><Prose text={line.say} /></span>}
              {line.cancels && <MathText className="db-where db-cancels" tex={line.cancels} trusted />}
              {/* The other component, then in words that it lives on: said in a sentence, which
                  wraps, rather than in a \text{} glued to the equation, which cannot. */}
              {line.also && <span className="db-where db-say db-also"><MathText tex={line.also} trusted /> survives too.</span>}
              {stage === 'here' && !playing && <span className="db-note">{notes[i]}</span>}
            </span>
          </span>
        </button>
      </li>;
    })}
  </ol>;
});
