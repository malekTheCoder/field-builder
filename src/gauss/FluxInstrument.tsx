'use client';
/* A named group of toggles, a figure that is one named image, a charge in an SVG that is a control: none has a tag
   of its own inside an <svg>, or an HTML one that would say the same, so the role says it. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import {useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {MathText} from '../components/Math';
import {blob, enclosedOf, fluxTex, fluxWords, flowRound, isInside, START, type Charged, type Pt} from './instruments';
import {GaussRange} from './GaussRange';
/* THE FLUX INSTRUMENTS. A flat patch in a uniform field, turned through an angle from the normal, with its flux
 * read out in symbols; and a closed surface, dashed, with charges of either sign to drag in and out of it. The
 * closed surface's readout names the charges inside and nothing else, so it changes only when a charge crosses
 * the dashed line, never when one moves about inside or outside, and never when the surface grows without
 * swallowing one. Round the line, small arrows show the field's part along the outward normal: a charge
 * outside sends field in on one side and out on the other, so the field is not zero there although the flux is.
 *
 * Every charge can be moved from the keyboard (arrow keys, Shift for a long step), and a crossing is said aloud. */
const DEGREES: Intl.NumberFormatOptions = {style: 'unit', unit: 'degree', unitDisplay: 'long', maximumFractionDigits: 0};
const C = {x: 320, y: 165}, U = 66;
const toScreen = (p: Pt) => ({x: C.x + U * p.x, y: C.y - U * p.y});
function Arrow({a, b, className, head = 8}: {a: Pt; b: Pt; className: string; head?: number}) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < 1.5) return null;
  const ux = dx / len, uy = dy / len, h = Math.min(head, len * .5), w = h * .5, bx = b.x - ux * h, by = b.y - uy * h;
  return <g className={className}><line x1={a.x} y1={a.y} x2={bx} y2={by} /><path d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)}L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}Z`} /></g>;
}

/** A flat patch, seen edge on, in a uniform field: Φ = EA cos θ, θ measured from the normal. */
function Patch() {
  const [deg, setDeg] = useState(35);
  const th = deg * Math.PI / 180, cx = 320, cy = 150, half = 92;
  // The normal at θ from the field (which runs to the right); the patch square to it.
  const n = {x: Math.cos(th), y: -Math.sin(th)}, along = {x: -n.y, y: n.x};
  const a = {x: cx - along.x * half, y: cy - along.y * half}, b = {x: cx + along.x * half, y: cy + along.y * half};
  const perp = Math.cos(th);
  const at = Math.abs(deg) < .5 ? String.raw`\Phi=EA` : Math.abs(deg - 90) < .5 ? String.raw`\Phi=0` : Math.abs(deg - 180) < .5 ? String.raw`\Phi=-EA` : deg < 90 ? String.raw`0<\Phi<EA` : String.raw`-EA<\Phi<0`;
  const said = Math.abs(deg - 90) < .5 ? 'The field slides along the patch: no flux.' : deg < 90 ? 'The field goes through the way the normal points: the flux is positive.' : 'The field goes through against the normal: the flux is negative.';
  return <div className="gs-patch">
    <svg className="gs-instrument-svg" viewBox="0 0 640 300" role="img" aria-label={`A flat patch, seen edge on, in a uniform field pointing right. ${said}`}>
      {[-2, -1, 0, 1, 2].map(i => <Arrow key={i} a={{x: 40, y: cy + i * 46}} b={{x: 600, y: cy + i * 46}} className="gs-arrow gs-uniform" head={9} />)}
      <line className="gs-patch-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <Arrow a={{x: cx, y: cy}} b={{x: cx + n.x * 78, y: cy + n.y * 78}} className="gs-arrow gs-n" head={9} />
      {/* E's part along the normal, E cos θ, laid along it: the only part that crosses. */}
      {Math.abs(perp) > .02 && <Arrow a={{x: cx, y: cy}} b={{x: cx + n.x * 112 * perp, y: cy + n.y * 112 * perp}} className="gs-arrow gs-e is-part" head={9} />}
      {/* E cos θ and n̂ are named on either side of the normal, so neither name sits on the other's arrowhead. */}
      {Math.abs(perp) > .25 && <text className="gs-name gs-field-name" x={cx + n.x * 112 * perp - n.y * 30 * Math.sign(perp)} y={cy + n.y * 112 * perp + n.x * 30 * Math.sign(perp)} textAnchor="middle" dominantBaseline="middle">E cos θ</text>}
      <text className="gs-name gs-normal-name" x={cx + n.x * 90 + n.y * 18 * Math.sign(perp || 1)} y={cy + n.y * 90 - n.x * 18 * Math.sign(perp || 1)} textAnchor="middle" dominantBaseline="middle">n̂</text>
      <text className="gs-name gs-field-name" x={610} y={cy - 2 * 46 - 14} textAnchor="end">E</text>
      {/* The angle, from the field's direction to the normal. */}
      {deg > 3 && <path className="gs-angle" d={`M${cx + 40} ${cy}A40 40 0 ${deg > 180 ? 1 : 0} 0 ${(cx + 40 * Math.cos(th)).toFixed(1)} ${(cy - 40 * Math.sin(th)).toFixed(1)}`} />}
      {deg > 3 && <text className="gs-name" x={cx + 56 * Math.cos(th / 2)} y={cy - 56 * Math.sin(th / 2)} textAnchor="middle" dominantBaseline="middle">θ</text>}
    </svg>
    <div className="gs-readout"><MathText tex={String.raw`\Phi=\vec E\cdot\vec A=EA\cos\theta`} block /><MathText tex={at} block /><p aria-live="polite">{said}</p></div>
    <GaussRange label="Angle from the normal θ" value={deg} min={0} max={180} step={1} onChange={setDeg} format={DEGREES} />
  </div>;
}

/** The closed surface and the charges to drag in and out of it. */
function Closed() {
  const [charges, setCharges] = useState<Charged[]>(START);
  const store = useRef<Charged[]>(START);
  const [s, setS] = useState(1.75);
  const [said, setSaid] = useState('');
  const svg = useRef<SVGSVGElement>(null), grab = useRef<string | null>(null);
  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) { const th = 2 * Math.PI * i / 160, r = blob(th, s), p = toScreen({x: r * Math.cos(th), y: r * Math.sin(th)}); pts.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`); }
    return `M${pts.join('L')}Z`;
  }, [s]);
  const flow = useMemo(() => flowRound(charges, s, 36), [charges, s]);
  const inside = enclosedOf(charges, s);
  const tex = fluxTex(charges, s);
  /** Move a charge, and say so when it crosses the surface. */
  const place = (key: string, at: Pt) => {
    const clamp = {x: Math.max(-4.6, Math.min(4.6, at.x)), y: Math.max(-2.35, Math.min(2.35, at.y))};
    // Read from the store, not from a render: a fast drag sends moves faster than the page renders them.
    const old = store.current, was = old.find(c => c.key === key), next = old.map(c => c.key === key ? {...c, at: clamp} : c);
    store.current = next;
    setCharges(next);
    if (was && isInside(was.at, s) !== isInside(clamp, s)) setSaid(`${was.name} ${isInside(clamp, s) ? 'moved inside' : 'moved outside'} the surface. ${fluxWords(next, s)}`);
  };
  const resize = (next: number) => {
    const before = enclosedOf(charges, s).map(c => c.key).join(), after = enclosedOf(charges, next).map(c => c.key).join();
    setS(next);
    if (before !== after) setSaid(`The surface ${next > s ? 'grew over' : 'shrank past'} a charge. ${fluxWords(charges, next)}`);
  };
  const toWorld = (e: PointerEvent) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return {x: (p.x - C.x) / U, y: (C.y - p.y) / U};
  };
  const keys = (c: Charged) => (e: KeyboardEvent) => {
    const step = e.shiftKey ? .5 : .15, d: Record<string, Pt> = {ArrowLeft: {x: -step, y: 0}, ArrowRight: {x: step, y: 0}, ArrowUp: {x: 0, y: step}, ArrowDown: {x: 0, y: -step}};
    // Home puts the charge back where it started, as the other instruments' charges do.
    if (e.key === 'Home') { e.preventDefault(); const home = START.find(q => q.key === c.key); if (home) place(c.key, home.at); return; }
    const by = d[e.key];
    if (!by) return;
    e.preventDefault();
    place(c.key, {x: c.at.x + by.x, y: c.at.y + by.y});
  };
  const uid = useId();
  return <div className="gs-closed">
    <svg ref={svg} className="gs-instrument-svg gs-closed-svg" viewBox="0 0 640 330" role="group" aria-labelledby={`${uid}-what`}
      onPointerMove={e => { if (!grab.current) return; const w = toWorld(e); if (w) place(grab.current, w); }}
      onPointerUp={() => { grab.current = null; }} onPointerCancel={() => { grab.current = null; }}>
      <title id={`${uid}-what`}>A closed surface, dashed, and four charges to move in and out of it</title>
      <path className="gs-blob" d={curve} />
      {/* Which way the field crosses, round the slice: out where it leaves, in where it enters. Direction only, every tick one
          length: along this one slice the in and out do not balance for a charge outside (the far side of the whole surface
          covers more of it), so sized ticks would suggest a net flux the readout rightly says is not there. */}
      <g className="gs-flow" aria-hidden="true">{flow.map((f, i) => {
        const len = Math.abs(f.through) > 1e-3 ? 13 : 0, p = toScreen(f.at), dir = Math.sign(f.through);
        if (len < 2.5) return null;
        const a = dir > 0 ? p : {x: p.x + f.normal.x * len, y: p.y - f.normal.y * len}, b = dir > 0 ? {x: p.x + f.normal.x * len, y: p.y - f.normal.y * len} : p;
        return <Arrow key={i} a={a} b={b} className="gs-arrow gs-e is-flow" head={6} />;
      })}</g>
      {charges.map(c => {
        const p = toScreen(c.at), inn = isInside(c.at, s);
        return <g key={c.key} className={'gs-q' + (inn ? ' is-inside' : '')} role="button" tabIndex={0} aria-roledescription="draggable charge"
          aria-label={`${c.name}, ${c.sign > 0 ? 'positive' : 'negative'}, ${inn ? 'inside' : 'outside'} the surface. Arrow keys move it; Home puts it back.`}
          transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} onKeyDown={keys(c)}
          onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); grab.current = c.key; (e.currentTarget as SVGGElement).focus({preventScroll: true}); try { svg.current?.setPointerCapture(e.pointerId); } catch { /* still drags */ } }}>
          <circle className="gs-q-hit" r={22} />
          <circle className="gs-q-body" r={14} />
          <text className="gs-q-sign" textAnchor="middle" dominantBaseline="central">{c.sign > 0 ? '+' : '−'}</text>
          <text className="gs-name gs-q-name" x={19} y={-17}>{c.name}</text>
        </g>;
      })}
    </svg>
    <div className="gs-readout" data-inside={inside.map(c => c.key).join(',')}>
      <MathText tex={tex} block />
      <p className="gs-inside-list"><span>Inside: {inside.length ? inside.map(c => c.name).join(', ') : 'none'}.</span> <span>Outside: {charges.filter(c => !inside.includes(c)).map(c => c.name).join(', ') || 'none'}.</span></p>
      <output className="sr-only" aria-live="polite">{said}</output>
    </div>
    <GaussRange label="Size of the surface" value={s} min={.9} max={2.75} step={.01} onChange={resize} valueText={n => n < 1.4 ? 'small' : n < 2.1 ? 'medium' : 'large'} />
  </div>;
}

/** Each tab's own heading and lede: the closed surface's words over the tilted patch told the reader to drag
 * charges that were not there. */
const HEADS = {
  patch: {title: 'Tilt the patch', lede: 'Turn the patch with the slider. The flux is the part of the field through it, EA cos θ: zero when the patch is edge on to the field, negative when the field goes through it the other way.'},
  closed: {title: 'Move the charges', lede: 'Drag the charges in and out of the dashed surface, or move them with the arrow keys. The flux changes only when a charge crosses it.'},
} as const;
export function FluxInstrument() {
  const uid = useId();
  // It opens on the flat patch, the idea the lesson starts from, before the closed surface built of such patches.
  const [tab, setTab] = useState<keyof typeof HEADS>('patch');
  return <section className="gs-instrument gs-flux" aria-labelledby={`${uid}-title`}>
    <div className="gs-instrument-head">
      <h2 id={`${uid}-title`} className="gs-instrument-title">{HEADS[tab].title}</h2>
      <p className="gs-instrument-lede">{HEADS[tab].lede}</p>
    </div>
    <Tabs value={tab} onValueChange={v => setTab(v === 'closed' ? 'closed' : 'patch')}>
      <TabsList aria-label="Instruments" className="exp-limit-tabs gs-tabs"><TabsTrigger value="patch">A flat patch</TabsTrigger><TabsTrigger value="closed">A closed surface</TabsTrigger></TabsList>
      <TabsContent value="closed" className="gs-tab"><Closed /></TabsContent>
      <TabsContent value="patch" className="gs-tab"><Patch /></TabsContent>
    </Tabs>
  </section>;
}
