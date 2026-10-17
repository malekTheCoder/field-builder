'use client';
/* A figure that is one named image, and named groups of toggles: role says so where no tag does. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useId, useState, type CSSProperties} from 'react';
import {MathText} from '../components/Math';
import {useRenderedWidth} from '../components/useRenderedWidth';
import {density, qencFraction, qencTex, shellCharge, type Profile} from './instruments';
import {GaussRange} from './GaussRange';
/* BUILD Q_ENC SHELL BY SHELL. A ball of radius R and charge Q, cut into thin shells shaded by their density, and a
 * Gaussian sphere of radius r to drag through it. The shells inside the sphere light up; beside the ball, the plot
 * of what one shell holds per unit radius, ρ·4πr′², fills in under its curve from the centre out to r, and that area
 * is Q_enc, said in symbols under it. Three densities: uniform, rising with r, and falling to zero at the surface,
 * whose outer shells, though thin in charge per volume, hold most of the charge because they are big.
 *
 * "Integrate ρ dr′" shows the commonest mistake for what it is: the area under the density alone, which is not a
 * charge (its units are charge per area) and changes as the true Q_enc does not. Past R the shells stop: the
 * readout's upper limit becomes R and the fill stops growing. */
const C = {x: 142, y: 152}, U = 100, MAX = 1.4, RINGS = 10;
/** The plot: r′ across from zero to MAX, each curve drawn to its own height. */
const P0 = 334, P1 = 618, BASE = 262, TOP = 92, X = (x: number) => P0 + (P1 - P0) * x / MAX;
const PROFILES: {key: Profile; label: string}[] = [{key: 'uniform', label: 'Uniform'}, {key: 'rising', label: 'Rising with r'}, {key: 'falling', label: 'Falling to zero'}];
/** A ring between radii a and b (units of R), as one even-odd path. */
function ring(a: number, b: number) {
  const circle = (r: number) => r <= 0 ? '' : `M${(C.x - r * U).toFixed(1)} ${C.y}a${(r * U).toFixed(1)} ${(r * U).toFixed(1)} 0 1 0 ${(2 * r * U).toFixed(1)} 0a${(r * U).toFixed(1)} ${(r * U).toFixed(1)} 0 1 0 ${(-2 * r * U).toFixed(1)} 0Z`;
  return circle(b) + circle(a);
}
/** A curve on the plot, f over [0, 1], scaled so its largest value reaches the top. */
function curve(f: (x: number) => number, peak: number, base: number, upTo = 1, closed = false) {
  const n = 80, pts: string[] = [];
  for (let i = 0; i <= n; i++) { const x = upTo * i / n; pts.push(`${X(x).toFixed(1)} ${(base - (BASE - TOP) * f(x) / peak).toFixed(1)}`); }
  return closed ? `M${X(0)} ${base}L${pts.join('L')}L${X(upTo).toFixed(1)} ${base}Z` : `M${pts.join('L')}`;
}
const peakOf = (f: (x: number) => number) => { let m = 0; for (let i = 0; i <= 200; i++) m = Math.max(m, Math.abs(f(i / 200))); return m || 1; };

export function QencInstrument({sign}: {sign: 1 | -1}) {
  const [profile, setProfile] = useState<Profile>('falling');
  const [mistaken, setMistaken] = useState(false);
  const [r, setR] = useState(.6);
  const uid = useId();
  const [measure, width] = useRenderedWidth(640);
  const k = Math.max(1, Math.min(2.2, 640 / Math.max(1, width) * .86));
  // The page's charge sign belongs to this instrument too. Reflect signed curves about their zero line;
  // shell darkness and the enclosed fraction encode magnitudes and therefore stay unchanged. A negative
  // fill is an oriented integral below zero, not a positive amount of negative charge.
  const rho = (x: number) => sign * density(profile, x), dq = (x: number) => sign * shellCharge(profile, x);
  const base = sign > 0 ? BASE : TOP, far = sign > 0 ? TOP : BASE;
  const Y = (value: number, peak: number) => base - (BASE - TOP) * value / peak;
  const rhoPeak = peakOf(rho), dqPeak = peakOf(dq);
  const upTo = Math.min(r, 1), frac = qencFraction(profile, r);
  // The shells: their edges, cut again at r so a shell the sphere passes through is lit only inside it.
  const edges = [...new Set([...Array.from({length: RINGS + 1}, (_, i) => i / RINGS), ...(r < 1 ? [r] : [])])].sort((a, b) => a - b);
  const shells = edges.slice(1).map((b, i) => ({a: edges[i], b, inside: b <= r + 1e-9, shade: Math.abs(rho((edges[i] + b) / 2)) / rhoPeak}));
  const tex = qencTex(profile, r, mistaken);
  const words = mistaken
    ? 'This adds up the density along one radius, without each shell’s area. Its units are charge per area: it is not a charge, and it gives the outer shells far too little weight.'
    : r < 1 ? 'The sphere encloses the shells from the centre out to r: the integral stops at r, and the signed shaded area is the charge inside.'
    : 'The sphere is outside the ball. There is no charge beyond R, so the shells stop there: the upper limit is R, and the charge inside is all of Q.';
  const displayWords = `The curves lie ${sign > 0 ? 'above' : 'below'} zero. Shell darkness shows density magnitude${mistaken ? '.' : '; the bar shows the enclosed fraction of the total charge.'}`;
  const name = PROFILES.find(p => p.key === profile)!.label.toLowerCase();
  return <section className="gs-instrument gs-qenc" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">Shell by shell</h2>
      <p className="gs-instrument-lede">Choose how the density’s magnitude varies. Grow the dashed sphere through the ball. The shells inside it light up, and the signed area under the curve on the right, what each shell holds, fills in to the charge enclosed.</p>
    </div>
    <div className="gs-choices">
      <div className="cd-view-modes" role="group" aria-label="The ball’s density magnitude">{PROFILES.map(p => <button key={p.key} type="button" className={'cd-view-mode' + (profile === p.key ? ' is-on' : '')} aria-pressed={profile === p.key} onClick={() => setProfile(p.key)}>{p.label}</button>)}</div>
      <div className="cd-view-modes" role="group" aria-label="What to integrate">{([['ρ · 4πr′² dr′', false], ['ρ dr′, the mistake', true]] as const).map(([label, value]) => <button key={label} type="button" className={'cd-view-mode' + (mistaken === value ? ' is-on' : '')} aria-pressed={mistaken === value} onClick={() => setMistaken(value)}>{label}</button>)}</div>
    </div>
    <svg ref={measure} className="gs-instrument-svg gs-qenc-svg" viewBox="0 0 640 310" role="img" style={{'--cd-k': k} as CSSProperties}
      aria-label={`A ball with ${sign > 0 ? 'positive' : 'negative'} density whose magnitude is ${name}, cut into thin shells, and a Gaussian sphere ${r < 1 ? 'inside it' : 'round it'}. Beside it, ${mistaken ? 'the density alone, its area shaded: not a charge' : 'the signed charge each shell holds against its radius, the area up to the sphere shaded'}. ${displayWords}`}>
      {shells.map((s, i) => <path key={i} className={'gs-shell' + (s.inside ? ' is-inside' : '')} d={ring(s.a, s.b)} fillRule="evenodd" style={{fillOpacity: (s.inside ? .2 + .62 * s.shade : .06 + .2 * s.shade)}} />)}
      <circle className="gs-ball-edge" cx={C.x} cy={C.y} r={U} />
      <circle className="gs-gauss" cx={C.x} cy={C.y} r={r * U} />
      <line className="gs-radius" x1={C.x} y1={C.y} x2={C.x + r * U * Math.cos(-.6)} y2={C.y + r * U * Math.sin(-.6)} />
      <text className="gs-name" x={C.x + r * U * .55 * Math.cos(-.6) - 4} y={C.y + r * U * .55 * Math.sin(-.6) - 12} textAnchor="middle">r</text>
      <text className="gs-name gs-ball-name" x={C.x - U * .72} y={C.y + U * .72 + 18} textAnchor="end">R</text>
      {/* The plot. */}
      <line className="gs-baseline" x1={P0} x2={P1 + 6} y1={base} y2={base} />
      <line className="gs-plot-axis" x1={P0} x2={P0} y1={base} y2={far - sign * 14} />
      <path className={'gs-fill' + (mistaken ? ' is-wrong' : '')} d={mistaken ? curve(rho, rhoPeak, base, upTo, true) : curve(dq, dqPeak, base, upTo, true)} />
      <path className={'gs-curve is-rho' + (mistaken ? ' is-on' : '')} d={curve(rho, rhoPeak, base)} />
      <path className={'gs-curve is-dq' + (mistaken ? '' : ' is-on')} d={curve(dq, dqPeak, base)} />
      <line className="gs-edge" x1={X(1)} x2={X(1)} y1={base} y2={far - sign * 6} />
      <text className="gs-name" x={X(1)} y={base + (sign > 0 ? 22 : -16)} textAnchor="middle">R</text>
      <line className="gs-at" x1={X(r)} x2={X(r)} y1={base + sign * 4} y2={far - sign * 10} />
      <text className="gs-name" x={X(r) + (Math.abs(r - 1) < .1 ? 14 : 0)} y={base + (sign > 0 ? 22 : -16)} textAnchor="middle">r</text>
      <text className="gs-name gs-axis-name" x={P1 + 10} y={base + (sign > 0 ? 22 : -16)} textAnchor="end">r′</text>
      {(() => { const xr = profile === 'rising' ? .45 : .2, xq = profile === 'falling' ? .62 : .78;
        return <>
          <text className="gs-name gs-rho-name" x={X(xr) + 8} y={Y(rho(xr), rhoPeak) - sign * 10}>ρ</text>
          <text className="gs-name gs-dq-name" x={X(xq) - 10} y={Y(dq(xq), dqPeak) - sign * 12} textAnchor="end">ρ · 4πr′²</text>
        </>; })()}
      {/* Leave room after the bar for Q: phone symbol scaling must not push its glyph outside the SVG. */}
      {/* How much of Q is inside: the share the shaded area is of the whole. */}
      {!mistaken && <g className="gs-share">
        <rect className="gs-share-track" x={P0} y={30} width={P1 - P0 - 32} height={14} rx={7} />
        <rect className="gs-share-fill" x={P0} y={30} width={(P1 - P0 - 32) * frac} height={14} rx={7} />
        <text className="gs-name gs-share-name" x={P0 - 8} y={37} textAnchor="end" dominantBaseline="middle">Q<tspan className="gs-sub" dy="5">enc</tspan></text>
        <text className="gs-name gs-share-name" x={P1 + 8} y={37} textAnchor="end" dominantBaseline="middle">Q</text>
      </g>}
      {mistaken && <text className="gs-wrong" x={(P0 + P1) / 2} y={40} textAnchor="middle">not a charge</text>}
    </svg>
    <div className="gs-readout">
      <MathText tex={tex.density} block />
      <MathText tex={tex.integral} block />
      <p aria-live="polite">{words} {displayWords}</p>
      <p>The curves use separate vertical scales: density and charge per unit radius have different units. Compare their shapes, not their heights.</p>
    </div>
    <GaussRange label="Radius of the Gaussian sphere r" value={r} min={.04} max={MAX} step={.01} onChange={setR} valueText={n => n < 1 ? 'inside the ball' : n > 1 ? 'outside the ball' : 'at the ball’s surface'} />
  </section>;
}
