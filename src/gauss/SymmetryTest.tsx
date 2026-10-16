'use client';
/* A named group of toggles, a figure that is one named image, a charge in an SVG that is a control: none has a tag
   of its own inside an <svg>, or an HTML one that would say the same, so the role says it. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useEffect, useId, useRef, useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {RotateCcw} from 'lucide-react';
import {projectPoint} from '../diagrams/three/orthoCamera';
import {add, dot, norm, scale, sub, unit, v3, type V3} from './physics';
import {CANDIDATES, MOVES, moveBy, proposed, samples, survives, type Candidate, type Move, type Sym} from './instruments';
/* TURN IT, FLIP IT: THE SYMMETRY ARGUMENT AS SOMETHING TO DO. The reader picks a charge (a ball, a line, a sheet),
 * proposes a field for it (the true one, straight out, or one with a part the symmetry forbids), and applies a
 * move that leaves the charge exactly as it was. The field is carried with the charge; the dashed arrows are the
 * field that was there. If the two differ, one charge would be making two fields, so the proposal is impossible.
 * Only the field that points straight out survives every move.
 *
 * Drawn in SVG, from the same projection the 3D figure uses, so it works where WebGL does not. With Reduce Motion
 * on, a move steps through its halfway frame instead of gliding: the argument is the motion's end, and it is
 * reached, never skipped. */
const VIEW = {yaw: -.5, pitch: .34}, ORIGIN = {x: 300, y: 172}, UNIT = 74;
const proj = (p: V3) => projectPoint(p, ORIGIN, UNIT, VIEW.yaw, VIEW.pitch);
/** Toward the camera, for drawing the far arrows fainter. */
const TOWARD = v3(Math.sin(VIEW.yaw) * Math.cos(VIEW.pitch), -Math.cos(VIEW.yaw) * Math.cos(VIEW.pitch), Math.sin(VIEW.pitch));
function Arrow({a, b, className}: {a: V3; b: V3; className: string}) {
  const p = proj(a), q = proj(b), dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  if (len < 2) return <circle className={className + ' is-end-on'} cx={q.x} cy={q.y} r={3} />;
  const ux = dx / len, uy = dy / len, h = Math.min(10, len * .5), w = h * .5, bx = q.x - ux * h, by = q.y - uy * h;
  return <g className={className}><line x1={p.x} y1={p.y} x2={bx} y2={by} /><path d={`M${q.x.toFixed(1)} ${q.y.toFixed(1)}L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}Z`} /></g>;
}
export function SymmetryTest({sym, sign}: {sym: Sym; sign: 1 | -1}) {
  const [chosen, setCandidate] = useState<Candidate>('tilted');
  // The sheet has no swirl and the ball and the line have no one-way field: a proposal the charge does not offer
  // falls back to the lean, which every charge does.
  const candidate: Candidate = CANDIDATES[sym].some(c => c.key === chosen) ? chosen : 'tilted';
  // A move belongs to the charge, the proposal and the sign it was made on: change any of them and the charge
  // is back where it was, no move made yet.
  const setting = `${sym}|${candidate}|${sign}`;
  const [made, setMade] = useState<{setting: string; move: Move} | null>(null);
  const move = made?.setting === setting ? made.move : null;
  const [t, setT] = useState(0);
  const reduced = useReducedMotion();
  const timer = useRef<{stop: () => void} | null>(null);
  const uid = useId();
  useEffect(() => () => timer.current?.stop(), []);
  const setMove = (m: Move | null) => setMade(m ? {setting, move: m} : null);
  function apply(m: Move) {
    timer.current?.stop(); setReturning(false);
    setMove(m); setT(0);
    if (reduced) {
      // Stepped, never skipped: halfway, then there.
      let k = 0;
      const beat = window.setInterval(() => { k++; setT(Math.min(1, k / 2)); if (k >= 2) { window.clearInterval(beat); timer.current = null; } }, 450);
      timer.current = {stop: () => window.clearInterval(beat)};
      return;
    }
    let start = -1, raf = 0;
    const frame = (now: number) => {
      if (start < 0) start = now;
      const f = Math.min(1, (now - start) / 1300);
      setT(f * f * (3 - 2 * f));
      if (f < 1) raf = requestAnimationFrame(frame); else timer.current = null;
    };
    raf = requestAnimationFrame(frame);
    timer.current = {stop: () => cancelAnimationFrame(raf)};
  }
  // Put it back glides home as a move glides out, and steps under reduced motion: the charge and its field are
  // seen to return, not cut to the start.
  const [returning, setReturning] = useState(false);
  function back() {
    if (!move) return;
    timer.current?.stop();
    const from = t, home = () => { timer.current = null; setReturning(false); setMove(null); setT(0); };
    setReturning(true);
    if (reduced) {
      let k = 0;
      const beat = window.setInterval(() => { k++; if (k >= 2) { window.clearInterval(beat); home(); } else setT(from / 2); }, 450);
      timer.current = {stop: () => { window.clearInterval(beat); setReturning(false); }};
      return;
    }
    let start = -1, raf = 0;
    const frame = (now: number) => {
      if (start < 0) start = now;
      const f = Math.min(1, (now - start) / 800);
      setT(from * (1 - f * f * (3 - 2 * f)));
      if (f < 1) raf = requestAnimationFrame(frame); else home();
    };
    raf = requestAnimationFrame(frame);
    timer.current = {stop: () => { cancelAnimationFrame(raf); setReturning(false); }};
  }
  const done = !!move && t >= 1;
  const kept = move ? survives(sym, candidate, move, sign) : null;
  const pts = samples(sym);
  // The charge, carried by the move too: it lands on itself, which is the whole point.
  const charge = (() => {
    const at = (p: V3) => proj(move ? moveBy(move, t, p) : p);
    if (sym === 'sphere') { const o = proj(v3(0, 0, 0)); return <circle className="gs-charge is-body" cx={o.x} cy={o.y} r={.72 * UNIT} />; }
    if (sym === 'line') { const a = at(v3(0, 0, 1.75)), b = at(v3(0, 0, -1.75)); return <line className="gs-charge is-line" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; }
    const c = [v3(1.9, 1.9, 0), v3(-1.9, 1.9, 0), v3(-1.9, -1.9, 0), v3(1.9, -1.9, 0)].map(at);
    return <path className="gs-charge is-sheet" d={`M${c.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z`} />;
  })();
  const arrows = pts.map((X, i) => {
    const F = scale(unit(proposed(sym, candidate, sign, X)), .62), at = move ? moveBy(move, t, X) : X, dir = move ? moveBy(move, t, F) : F;
    const front = dot(at, TOWARD) >= -.05;
    return {i, at, dir, front, depth: dot(at, TOWARD), ghost: F, X};
  }).sort((a, b) => a.depth - b.depth);
  const glyph = sign > 0 ? '+' : '−';
  // Said while the move plays, too: "Choose a move" over a move under way told the reader to do what they had done.
  const verdict = returning ? 'Putting it back.' : !move ? 'Pick a move, then watch what happens to each arrow.' : !done ? `${move.label}: the field is carried with the charge.` : kept ? 'Unchanged: carried with the charge, this field lands on itself. The move allows it.' : 'Changed, though the charge did not: one charge cannot make two fields, so this field is impossible.';
  const candidateName = CANDIDATES[sym].find(c => c.key === candidate)?.label ?? '';
  return <section className="gs-instrument gs-symmetry" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">Turn it, flip it</h2>
      <p className="gs-instrument-lede">For the charge chosen above, propose a field, then move the charge in a way that leaves it exactly as it was. The dashed arrows are the field that was there; the solid ones are carried with the charge.</p>
    </div>
    <div className="gs-choices">
      <div className="cd-view-modes" role="group" aria-label="The field proposed">{CANDIDATES[sym].map(c => <button key={c.key} type="button" className={'cd-view-mode' + (candidate === c.key ? ' is-on' : '')} aria-pressed={candidate === c.key} onClick={() => setCandidate(c.key)}>{c.label}</button>)}</div>
    </div>
    {/* The verdict sits over the picture, in the eye line, rather than under the buttons. */}
    <p className={'gs-verdict is-above' + (done ? kept ? ' is-kept' : ' is-broken' : '')} aria-live="polite">{verdict}</p>
    <svg className="gs-symmetry-svg" viewBox="0 0 600 340" role="img" aria-label={`A ${sym === 'sphere' ? 'charged ball' : sym === 'line' ? 'charged line' : 'charged sheet'} with the proposed field, ${candidateName.toLowerCase()}${move ? `, after the ${move.label.toLowerCase()}` : ''}.`}>
      {arrows.filter(a => !a.front).map(a => <g key={a.i} className="is-far">{move && <Arrow a={a.X} b={add(a.X, a.ghost)} className="gs-arrow gs-ghost" />}<Arrow a={a.at} b={add(a.at, a.dir)} className="gs-arrow gs-e" /></g>)}
      <g className="gs-charge-layer">{charge}</g>
      {sym === 'sphere' && (() => { const o = proj(v3(0, 0, 0)); return <text className="gs-sign" x={o.x} y={o.y} textAnchor="middle" dominantBaseline="middle">{glyph}</text>; })()}
      {sym !== 'sphere' && [v3(0, 0, 0), sym === 'line' ? v3(0, 0, 1.3) : v3(1.35, -1.35, 0)].map((p, i) => { const q = proj(p); return <text key={i} className="gs-sign" x={q.x + (sym === 'line' ? 12 : 0)} y={q.y} textAnchor="middle" dominantBaseline="middle">{glyph}</text>; })}
      {arrows.filter(a => a.front).map(a => <g key={a.i}>{move && <Arrow a={a.X} b={add(a.X, a.ghost)} className="gs-arrow gs-ghost" />}<Arrow a={a.at} b={add(a.at, a.dir)} className="gs-arrow gs-e" /></g>)}
      {done && !kept && (() => { const bad = arrows.find(a => a.front && norm(sub(a.dir, scale(unit(proposed(sym, candidate, sign, a.at)), .62))) > 1e-6); if (!bad) return null; const q = proj(add(bad.at, bad.dir)); return <text className="gs-mismatch" x={q.x + 10} y={q.y - 10} aria-hidden="true">✕</text>; })()}
    </svg>
    <div className="gs-moves" role="group" aria-label="Moves that leave the charge as it was">
      {MOVES[sym].map(m => <button key={m.key} type="button" className="gs-move" aria-pressed={move?.key === m.key} onClick={() => apply(m)}>{m.label}</button>)}
      <button type="button" className="text-button gs-back" onClick={back} aria-disabled={!move || returning || undefined}><RotateCcw size={14} aria-hidden="true" />Put it back</button>
    </div>
  </section>;
}
