import type {ChargeSample} from '../distributions/types';
import type {Vec} from '../symbolic/physics';
/** THE SUM IN MIRROR PAIRS.
 *
 * Laid tip to tail in the order the pieces sit along the charge, the arrows of a symmetric charge
 * bend round and come back to the axis: on the endless line, cut at equal angles, every piece's arrow
 * is the same length and their directions fan through half a turn, so the chain is half a polygon --
 * a great arch over the axis with the field as its chord. Right, and the worst picture of the lesson
 * there is: the sideways parts do cancel, but only at the far end of the arch, so the one thing the
 * symmetry is for -- each piece's sideways part undone by its mirror's -- is never seen.
 *
 * So these lessons add their pieces in MIRROR PAIRS. Each step adds a piece and its mirror together:
 * their sideways parts are equal and opposite, so what the step adds lies exactly along the axis, and
 * the running sum is an arrow along the axis at every moment -- never an arch. The pairs go from the
 * middle outward on the rod, the endless line and the arc, the biggest step along the axis first (the
 * middle piece of an odd count lies on the axis and goes in alone, in its place); round the ring, where
 * every piece is equally near, they go round from the run's own piece.
 *
 * A RING CUT AN ODD NUMBER OF WAYS has no piece straight across from any other. Its partner is what the
 * figure has always drawn there: the same length of ring centred straight across, which straddles two
 * pieces. Going round, (N − 1)/2 pieces and the lengths across them cover all but two half pieces --
 * the first half of the next piece and the last half of the one before the first -- and those two are
 * straight across from each other, so they make the last pair. Every bit of a ring makes the same field
 * along the axis for its charge, so the sum is exactly the N pieces' sum, pair by pair. */
export const PAIRED = new Set<string>(['bisector', 'infinite', 'ring', 'arc', 'uneven-arc']);
/** One stretch of charge in a step: where it is along the charge, as fractions of the parameter the
 * charge is cut by (the ring's runs once round per unit, so a stretch straight across can run past 1);
 * and what it is -- a whole piece, the ring's length straight across the step's other member, or half
 * of piece `of`. */
export type PairSpan = {lo: number; hi: number; kind: 'whole' | 'across' | 'half'; of: number};
export type PairSlot = {
 /** The piece named first, lit as the chosen piece; and its mirror, or null for a piece on the axis. */
 a: PairSpan; b: PairSpan | null;
 /** How much of each piece the step takes in, as [piece, share]. */
 shares: [number, number][];
};
export type PairStep = PairSlot & {
 /** The field each member makes at P. */
 fa: Vec; fb: Vec | null;
 /** What the step adds to the sum: the two parts along the axis. Their sideways parts cancel. */
 along: Vec;
};
const ZERO: Vec = {x: 0, y: 0, z: 0};
const add = (a: Vec, b: Vec): Vec => ({x: a.x + b.x, y: a.y + b.y, z: a.z + b.z});
/** The part of a field along the axis through P: z for the ring, x for the rod, the line and the arc. */
export function alongAxis(id: string, v: Vec): Vec { return id === 'ring' ? {x: 0, y: 0, z: v.z} : {x: v.x, y: 0, z: 0}; }
/** The part across it, which a mirror piece cancels. */
export function acrossAxis(id: string, v: Vec): Vec { return id === 'ring' ? {x: v.x, y: v.y, z: 0} : {x: 0, y: v.y, z: v.z}; }
/** The field a mirror stretch makes, from its piece's: the ring's straight across, the others' across the axis. */
const mirrored = (id: string, v: Vec): Vec => id === 'ring' ? {x: -v.x, y: -v.y, z: v.z} : {x: v.x, y: -v.y, z: v.z};
/** A ring piece's field turned about the axis by `angle`: the field of the same charge that far round. */
const turned = (v: Vec, angle: number): Vec => ({x: v.x * Math.cos(angle) - v.y * Math.sin(angle), y: v.x * Math.sin(angle) + v.y * Math.cos(angle), z: v.z});
const whole = (i: number, n: number): PairSpan => ({lo: i / n, hi: (i + 1) / n, kind: 'whole', of: i});
/** The pairs, in the order they are added, for a charge cut into `n`: which stretches go in together.
 * `start` is the ring's first piece; the other lessons go from the middle out. Null where the lesson
 * has no mirror symmetry. */
export function pairOrder(id: string, n: number, start = 0): PairSlot[] | null {
 if (!PAIRED.has(id) || !(n >= 1)) return null;
 if (id !== 'ring') {
  const out: PairSlot[] = [];
  if (n % 2) {
   const c = (n - 1) / 2;
   out.push({a: whole(c, n), b: null, shares: [[c, 1]]});
   for (let d = 1; d <= c; d++) out.push({a: whole(c + d, n), b: whole(c - d, n), shares: [[c + d, 1], [c - d, 1]]});
  } else {
   for (let d = 0; d < n / 2; d++) out.push({a: whole(n / 2 + d, n), b: whole(n / 2 - 1 - d, n), shares: [[n / 2 + d, 1], [n / 2 - 1 - d, 1]]});
  }
  return out;
 }
 const s = ((Math.round(start) % n) + n) % n, at = (k: number) => (s + k) % n;
 if (n % 2 === 0) return Array.from({length: n / 2}, (_, k) => ({a: whole(at(k), n), b: whole(at(k + n / 2), n), shares: [[at(k), 1], [at(k + n / 2), 1]] as [number, number][]}));
 const m = (n - 1) / 2, out: PairSlot[] = [];
 // The same length of ring straight across each piece: the last half of piece i + m and the first half of the next.
 for (let k = 0; k < m; k++) { const i = at(k); out.push({a: whole(i, n), b: {lo: (i + m + .5) / n, hi: (i + m + 1.5) / n, kind: 'across', of: i}, shares: [[i, 1], [at(k + m), .5], [at(k + m + 1), .5]]}); }
 // The two half pieces left: the first half of the next piece round, and straight across from it the last
 // half of the piece before the first.
 const q = at(m), last = at(n - 1);
 out.push({a: {lo: q / n, hi: (q + .5) / n, kind: 'half', of: q}, b: {lo: (last + .5) / n, hi: (last + 1) / n, kind: 'half', of: last}, shares: [[q, .5], [last, .5]]});
 return out;
}
/** The pairs with the field each member makes at P, from the pieces' own: a length straight across makes
 * its piece's field mirrored, and half a ring piece holds half its charge, at its own middle. */
export function pairPlan(id: string, samples: readonly ChargeSample[], start = 0): PairStep[] | null {
 const n = samples.length, order = pairOrder(id, n, start);
 if (!order) return null;
 return order.map(slot => {
  const {a, b} = slot;
  let fa = samples[a.of].field;
  if (a.kind === 'half') { const t = turned(fa, (a.lo + a.hi - (2 * a.of + 1) / n) * Math.PI); fa = {x: t.x / 2, y: t.y / 2, z: t.z / 2}; }
  const fb = !b ? null : b.kind === 'whole' ? samples[b.of].field : mirrored(id, fa);
  return {...slot, fa, fb, along: add(alongAxis(id, fa), fb ? alongAxis(id, fb) : ZERO)};
 });
}
/** The running sum after `steps` whole steps and `fraction` of the next one's part along the axis. */
export function pairSum(plan: readonly PairStep[], steps: number, fraction = 0): Vec {
 let sum = ZERO;
 for (let j = 0; j < Math.min(steps, plan.length); j++) sum = add(sum, plan[j].along);
 const next = plan[steps];
 if (next && fraction > 0) sum = add(sum, {x: next.along.x * fraction, y: next.along.y * fraction, z: next.along.z * fraction});
 return sum;
}
/** How much of each piece the first `steps` steps have taken in. */
export function pairShares(plan: readonly PairSlot[], n: number, steps: number): number[] {
 const out = Array.from({length: n}, () => 0);
 for (let j = 0; j < Math.min(steps, plan.length); j++) for (const [i, share] of plan[j].shares) out[i] += share;
 return out;
}
/** WHERE A STEP IS, `u` of the way through its share of the stage: the pair arrives at the tip of the sum
 * (`grow`), holds whole long enough to be seen as a mirror pair, its sideways parts shrink to nothing
 * toward each other (`cancel`) while the parts along the axis line up tip to tail, and the sum's arrow
 * takes them in (`merge`). Eased, each, so nothing jumps; and every one a pure function of the stage's
 * clock, so a pause, a seek or a stepped clock shows the frame the clock is at. */
export function pairPhase(u: number): {grow: number; cancel: number; merge: number} {
 const ease = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
 return {grow: ease(u / .2), cancel: ease((u - .4) / .32), merge: ease((u - .72) / .28)};
}
/** The step the sum is on, `progress` of the way through adding all `count` of them, and how far through it. */
export function pairStepAt(count: number, progress: number): {k: number; u: number} {
 const x = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * count, k = Math.max(0, Math.min(count - 1, Math.floor(x)));
 return {k, u: Math.max(0, Math.min(1, x - k))};
}
/** HOW MUCH OF ITS ENLARGEMENT A PAIR STILL HAS IN SPACE, 1 on arrival and 0 once it is in: it lets go of it
 * through the cancellation and the merge, not the merge alone. See `spacePairGain`. */
export function spacePairShrink(phase: {cancel: number; merge: number}): number { return (phase.cancel + phase.merge) / 2; }
type Point = {x: number; y: number};
/** ONE MAGNIFICATION FOR EVERY PAIR OF THE STAGE, FOR A FIGURE IN SPACE.
 *
 * Each pair arriving at the tip of the sum used to be enlarged by a gain of its own, read off its own arrow in the
 * view of the moment and capped by the room left above the tip it arrives at. Seen in space that drew the ring's
 * pairs as a burst of arrowheads: a piece whose part across the axis points at the camera is foreshortened, the
 * room above the tip shrinks pair by pair, and the stack of the two parts along the axis (twice the piece's own) was
 * fitted at the full enlargement. The default ring's second and last pairs came out fifteen to thirty units long,
 * and two pieces of exactly the same size were drawn at different sizes (one and a half times, then nearly twice).
 *
 * So in space the enlargement is one factor, the same for every pair, worked out once from the pairs' exact fields
 * and the view the figure opens in, so turning the view does not resize them. It is as large as makes the shortest
 * whole piece's arrow `readable` units long, and no larger than keeps every pair, laid from its own tip of the sum,
 * inside `box` (inset by twelve units). The pair lets the enlargement go while its parts across cancel and the sum
 * takes it in (`spacePairShrink`), so the stack is laid only at a shrinking enlargement and goes in at the sum's own
 * scale, as before; the arrival, where the parts across are the point, is what gets the room.
 *
 * `screen` maps a field to the screen at the sum's own scale, in the opening view; `from` is P there. */
export function spacePairGain(id: string, plan: readonly PairStep[], screen: (v: Vec) => Point, from: Point, box: {x: number; y: number; width: number; height: number}, readable: number): number {
 if (!plan.length) return 1;
 const len = (v: Vec) => { const s = screen(v); return Math.hypot(s.x, s.y); };
 // The shortest whole piece's arrow (a length straight across is a whole piece's length too); a half piece is half of one.
 let shortest = Infinity;
 for (const st of plan) for (const [span, f] of [[st.a, st.fa], [st.b, st.fb]] as const) if (span && f && span.kind !== 'half') { const l = len(f); if (l > 1e-6) shortest = Math.min(shortest, l); }
 if (!Number.isFinite(shortest)) for (const st of plan) for (const f of [st.fa, st.fb]) if (f) { const l = len(f); if (l > 1e-6) shortest = Math.min(shortest, l); }
 if (!Number.isFinite(shortest)) return 1;
 const want = readable / shortest;
 if (want <= 1) return 1;
 const lo = {x: box.x + 12, y: box.y + 12}, hi = {x: box.x + box.width - 12, y: box.y + box.height - 12};
 const inside = (p: Point) => p.x >= lo.x - 1e-9 && p.x <= hi.x + 1e-9 && p.y >= lo.y - 1e-9 && p.y <= hi.y + 1e-9;
 const tips: Point[] = plan.map((_, k) => { const s = screen(pairSum(plan, k)); return {x: from.x + s.x, y: from.y + s.y}; });
 const fits = (m: number) => plan.every((st, k) => {
  const t = tips[k], at = (v: Vec, g: number, base: Point = t) => { const s = screen(v); return {x: base.x + s.x * g, y: base.y + s.y * g}; };
  // Arriving: the whole arrows, the parts along the axis and across it, all from the tip at the full enlargement.
  for (const v of [st.fa, st.fb, alongAxis(id, st.fa), acrossAxis(id, st.fa), st.fb ? alongAxis(id, st.fb) : null, st.fb ? acrossAxis(id, st.fb) : null]) if (v && !inside(at(v, m))) return false;
  // Cancelling and going in: the mirror's part along the axis slides out to lie on the piece's, as the enlargement goes.
  if (st.fb) for (let i = 0; i <= 20; i++) {
   const c = i / 20, g = m + (1 - m) * spacePairShrink({cancel: c, merge: 0});
   if (!inside(at(alongAxis(id, st.fb), g, at(alongAxis(id, st.fa), g * c)))) return false;
  }
  return true;
 });
 if (fits(want)) return want;
 if (!fits(1)) return 1;
 let a = 1, b = want;
 for (let i = 0; i < 32; i++) { const m = (a + b) / 2; if (fits(m)) a = m; else b = m; }
 return a;
}
