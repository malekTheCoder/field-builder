'use client';
import {useId, useState} from 'react';
import {MathText, Prose} from '../components/Math';
import {SURFACE_CHOICES, type SurfaceChoice} from './surfaceChoices';
import type {Sym} from './instruments';
import './choose-surface.css';

const VALID_LAW = 'Gauss’s law remains true on this closed surface.';
function Explanation({choice}: {choice: SurfaceChoice}) {
  return <><h3>{choice.tex ? 'A surface that uses the symmetry' : 'A valid surface, but no direct field equation'}</h3>
    {!choice.tex && <p>{VALID_LAW}</p>}
    <p><Prose text={choice.reason} /></p>
    {choice.tex && <><MathText tex={choice.tex} block /><p>Reversing charge reverses the flux and leaves this surface choice unchanged.</p></>}</>;
}
/** The case owns the choice: GaussLesson keys this component by symmetry so a new charge starts a new question.
 * Feedback stays below the controls and never steals their keyboard focus. Print gets the useful construction
 * even if no answer was clicked; an inert bank of buttons would turn an exercise into an unexplained list. */
export function ChooseSurface({sym}: {sym: Sym}) {
  const uid = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const choices = SURFACE_CHOICES[sym], chosen = choices.find(c => c.id === selected), correct = choices.find(c => c.tex)!;
  return <section className="gs-instrument gs-surface" aria-labelledby={`${uid}-surface`}>
    <div className="gs-instrument-head"><h2 className="gs-instrument-title" id={`${uid}-surface`}>Choose the surface</h2>
      <p className="gs-instrument-lede gs-surface-screen">Which choice uses the symmetry to turn flux into one unknown field component times an area, and lets you determine that component?</p></div>
    <div className="gs-surface-options">{choices.map(choice => <button key={choice.id} type="button" aria-pressed={choice.id === selected} onClick={() => setSelected(choice.id)}>
      <strong>{choice.label}</strong><span>{choice.description}</span>
    </button>)}</div>
    <div className="gs-surface-feedback gs-surface-screen" aria-live="polite" aria-atomic="true">
      {chosen ? <Explanation choice={chosen} /> : <p>Choose a surface, then explain which parts carry flux.</p>}
    </div>
    <div className="gs-surface-print"><p><strong>{correct.label}.</strong> {correct.description}</p><Explanation choice={correct} /></div>
  </section>;
}
