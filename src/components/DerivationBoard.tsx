'use client';
import {memo, useId, type PointerEvent} from 'react';
import {MathText, Prose} from './Math';
import {BREAK, type BoardLine, type Term} from '../workbench/derivation';
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
// Keep the conclusion of a cancellation together. On the sheet's narrow board KaTeX broke after
// the final equals sign, leaving its zero alone on the next line. The implication is a natural
// place to wrap, but the relation it introduces is one unit. The authored formula stays intact.
const cancellationTex = (tex: string) => tex.replace(/(\\Rightarrow[\s\S]+)$/, String.raw`\allowbreak\htmlClass{db-conclusion}{$1}`);
const TERMS: readonly Term[] = ['element', 'distance', 'projection', 'bounds'];
/* THE BOARD HAS NO NOTE. A paused stage used to open the run's caption under its step, and once the
 * step's own remark said everything, the caption said it again: paused on What cancels at the rod's
 * end, "nothing cancels" stood in the transport, in the board's first sentence and in the note at
 * once, and the extra lines pushed the answer at the end of the run out of an 800px window. The
 * transport shows the stage's one line; the caption is read to a screen reader when the run holds;
 * and the one thing a caption said that its step did not is now said by the step. */
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
export const DerivationBoard = memo(function DerivationBoard({lines, names, state, lit = '', onStep, onPoint}: {
  lines: BoardLine[]; names: string[]; state: BoardState; lit?: Term | '';
  onStep?: (index: number) => void; onPoint?: (term: Term | '') => void;
}) {
  const {open, index, settled} = state;
  const uid = useId();
  const point = (ev: PointerEvent) => onPoint?.(termAt(ev.target));
  // At rest a lit factor is chipped wherever it appears, so a reader pointing at a slider finds it in
  // every line. While the run is open, only in the step being played: round two stopped chipping the
  // integral's limits, so at Shrink them the one chip on the board was the range in the finished Add
  // them up step, and the reader's eye went to the wrong line.
  const litHere = lit ? ` db-lit-${lit}` : '';
  return <ol className={'db' + (open ? ' is-running' : '') + (open ? '' : litHere)} onPointerOver={point} onPointerLeave={() => onPoint?.('')}>
    {lines.map((line, i) => {
      const stage = !open ? 'rest' : i < index ? 'done' : i === index ? 'here' : 'next';
      // The finished integral is the last thing the run arrives at, so it waits for it. An earlier
      // step's second half -- an exact sum taking its shared factor out, at Add them up -- is that step's
      // own conclusion, and arrives with it: "settled" is said only of the last stage.
      const finished = !open || i < index || (i === index && (i < lines.length - 1 || settled));
      // The whole step is one button: the name, the line and its gloss. A reader reaches for the
      // equation, not the label above it, so that is where the target has to be. The name is what
      // the button is called; the line itself is read as its description.
      return <li key={line.key} className={`db-step is-${stage}` + (stage === 'here' ? litHere : '')} data-step={line.key}>
        <button type="button" className="db-head" onClick={() => onStep?.(i)} aria-current={stage === 'here' ? 'step' : undefined}
          aria-label={`${names[i]}: play this step on the figure`} aria-describedby={stage === 'next' ? undefined : `${uid}-${line.key}`}>
          <span className="db-title"><span className="db-node" aria-hidden="true" /><span className="db-name">{names[i]}</span></span>
          {/* Collapsed rather than unmounted while it is still to come, so it can open smoothly. */}
          <span className="db-reveal" aria-hidden={stage === 'next' ? true : undefined}>
            <span className="db-body" id={`${uid}-${line.key}`}>
              {/* What cancels opens on the cancellation -- or on why nothing does: the step is named
                  for it, and with it fourth, under a paragraph, a reader scanning the step read "What
                  cancels: ΔE_x", the part that survives. The line after it is what is left. */}
              {line.cancels && <MathText className="db-where db-cancels" tex={cancellationTex(line.cancels)} trusted />}
              {/* What the cancellation's symbols are, directly under it: ΔE_y used to be named only
                  at the end of the paragraph four lines down. */}
              {/* In paragraphs, as a remark is: the rod off its middle says which pieces pair and which have none. */}
              {line.cancelsSay?.split(BREAK).map((para, j) => <span key={j} className="db-where db-say db-pair"><Prose text={para} /></span>)}
              {line.nothing && <span className="db-where db-say db-cancels db-nothing"><Prose text={line.nothing} /></span>}
              <MathText className="db-tex" tex={line.tex} block trusted />
              {/* The second half of a chain of equalities follows the first directly, its "=" under
                  the first one's; what the line's new symbols mean comes after the whole chain, in
                  the order of the lines they explain: Σᵢ → ∫ for the first, then the three-halves
                  power for the second. The second's gloss used to sit inside the chain's reveal, so it
                  came before the first's. It arrives with its line. */}
              {line.finish && <span className={'db-then' + (finished ? ' is-shown' : '')}><span className="db-then-in">
                <MathText className="db-then-tex" tex={line.finish} block trusted />
              </span></span>}
              {/* The sum-to-integral and charge replacements are separate statements. Keeping them
                  in one KaTeX box lets it break after the first arrow on the shell's narrow board,
                  leaving the integral on the next line. Wrap between the two complete relations. */}
              {line.where && (line.key === 'limit'
                ? <span className="db-where db-replacements">{line.where.split(/,\\quad |\\quad\\allowbreak /).map(tex => <MathText key={tex} tex={tex} trusted />)}</span>
                : <MathText className="db-where" tex={line.where} trusted />)}
              {/* Shrink them's other replacements, a formula each: separate pieces of math, so a narrow
                  panel wraps between them rather than scrolling one long row sideways. */}
              {line.swaps && <span className="db-where db-swaps">{line.swaps.map(t => <MathText key={t} tex={t} trusted />)}</span>}
              {line.merged && <span className={'db-then' + (finished ? ' is-shown' : '')}><span className="db-then-in">
                <MathText className="db-where db-merged" tex={line.merged} trusted />
              </span></span>}
              {/* A remark moves from one idea to the next in paragraphs (`BREAK`): set as one block, the
                  longest ran to sixteen lines under a lede that promises "each adding one idea". */}
              {line.say?.split(BREAK).map((para, j) => <span key={j} className="db-where db-say"><Prose text={para} /></span>)}
              {/* The other component, then in words that it lives on: said in a sentence, which
                  wraps, rather than in a \text{} glued to the equation, which cannot. */}
              {line.also && <span className="db-where db-say db-also"><MathText tex={line.also} trusted /> survives too.</span>}
              {line.alsoWhere && <MathText className="db-where" tex={line.alsoWhere} trusted />}
            </span>
          </span>
        </button>
      </li>;
    })}
  </ol>;
});
