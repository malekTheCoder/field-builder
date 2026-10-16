'use client';
import {memo, useCallback, useLayoutEffect, useMemo, useRef} from 'react';
import {MathText, Prose} from '../components/Math';
import {DerivationBoard, type BoardState} from '../components/DerivationBoard';
import {boardLines, stageNames} from './run';
import type {GaussCase} from './types';
import '../components/workbench.css';
/* THE BOARD BESIDE THE GAUSS FIGURE: the integral lessons' panel in its chrome and its rhythm (EquationWorkbench),
 * the recipe in its lines. The problem first, then one line per stage of the run, written as the run reaches it
 * (the integral lessons' own DerivationBoard: each line a button that plays its stage on the figure), then the
 * answer once the run has solved for it. At rest the whole of it is there to read. */
const REST: BoardState = {open: false, index: -1, playing: false, settled: true};
export const GaussBoard = memo(function GaussBoard({kase, flux, build = REST, onStep}: {
  kase: GaussCase;
  /** The flux lesson's answer is a flux, not a field: the box says so. */
  flux?: boolean;
  build?: BoardState;
  onStep?: (index: number) => void;
}) {
  const lines = useMemo(() => boardLines(kase), [kase]);
  const names = useMemo(() => stageNames(), []);
  const latest = useRef(onStep);
  useLayoutEffect(() => { latest.current = onStep; });
  const play = useCallback((i: number) => latest.current?.(i), []);
  const state = useMemo(() => ({open: build.open, index: build.index, playing: build.playing, settled: build.settled}), [build.open, build.index, build.playing, build.settled]);
  // The answer is where the recipe ends, so it waits for the run to get there.
  const settled = !build.open || (build.index === lines.length - 1 && build.settled);
  return <aside className="ew-panel gs-board" aria-label="Gauss’s law, step by step"><div className="ew-content">
    <section className="ew-problem" aria-labelledby="gs-problem"><h2 id="gs-problem" className="ew-problem-title">The problem</h2><p className="ew-problem-text"><Prose text={kase.setup} /></p></section>
    <div className="ew-assembly">
      <h2 className="ew-section-title">Apply Gauss’s law</h2>
      <p className="ew-lede">Five steps from the symmetry to the {flux ? 'flux' : 'field'}, each adding one idea. Choose one to watch it on the figure.</p>
      <DerivationBoard lines={lines} names={names} state={state} onStep={play} />
    </div>
    <div className={'ew-result' + (settled ? ' is-shown' : '')} aria-hidden={settled ? undefined : true}>
      <span className="ew-result-label">{kase.solve.label ?? (flux ? 'The answer, the flux out through the sphere' : 'The answer, the field at P')}</span>
      <MathText tex={kase.solve.answer} block />
      <p><Prose text={kase.solve.note ?? (flux ? raw`It is positive for a positive $q$, field leaving the sphere, and negative for a negative $q$, field entering it.` : raw`The component can come out negative: its sign says which way the field points, and reversing the charge reverses it.`)} /></p>
    </div>
  </div></aside>;
});
const raw = String.raw;
