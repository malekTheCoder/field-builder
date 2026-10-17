import { PROBLEM_IDS, type ProblemId } from '../distributions';
import { DEFAULT_PARAMS, type Params } from '../problems/types';

export type ExploreMode = 'divide' | 'project' | 'sum' | 'integrate';
/** `stage` is a stage of Watch it build, 1 to 5: the link opens the run held on that stage's finished frame. */
/** `view` is how the figure is drawn: flat ('2d') or in space ('3d'). Left out, each lesson opens its own way. */
export type Assignment = { id?: ProblemId; mode?: ExploreMode; params?: Partial<Params>; pair?: boolean; components?: boolean; stage?: number; view?: '2d' | '3d' };
/** The run's stages by the words a teacher would write them in, in the run's order (buildRun.ts). */
export const STAGE_WORDS = ['cut', 'piece', 'cancel', 'add', 'shrink'] as const;
const MODES = new Set<string>(['divide', 'project', 'sum', 'integrate']);
const IDS = new Set<string>(PROBLEM_IDS);
const RANGES: Record<keyof Params, [number, number]> = { distance: [.5, 6], size: [1, 8], charge: [-5, 5], phi: [Math.PI * .1, Math.PI * 2], element: [0, 1], slices: [3, 30], continuum: [0, 1], inner: [0, 3.8] };
const ALIAS: Record<string, keyof Params> = { r: 'distance', L: 'size', Q: 'charge', N: 'slices', c: 'continuum', distance: 'distance', size: 'size', charge: 'charge', phi: 'phi', slices: 'slices', continuum: 'continuum', element: 'element', inner: 'inner' };

/** Values held to what the controls can reach. That includes the charge's gap at zero: the slider steps
 * over it (Explorer.tsx, snapCharge), because with no charge every sentence the run says is about nothing,
 * over a figure with no field in it. A link reading charge=0 opened exactly that, and kept it in the
 * address; it opens on the lesson's own charge instead. */
export function cleanParams(v: Partial<Params>): Params {
 const out = { ...DEFAULT_PARAMS };
 for (const k of Object.keys(out) as (keyof Params)[]) {
  const n = v[k];
  if (typeof n === 'number' && Number.isFinite(n)) out[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], n));
 }
 if (Math.abs(out.charge) < .05) out.charge = DEFAULT_PARAMS.charge;
 return out;
}
function readNumber(raw: string | null): number | undefined {
 if (raw == null || raw === '') return undefined;
 const n = Number(raw);
 return Number.isFinite(n) ? n : undefined;
}
/** THE ARC'S ANGLE IN THE UNIT ITS SLIDER IS IN. `phi` was read as radians while the slider, and what a screen
 * reader says of it, are in degrees -- so ?p=arc&phi=90, a quarter arc as a teacher writes it, was clamped to 2π
 * and opened a closed ring with no field at P, the opposite of the lesson's point, without a word. A value marked
 * `deg` (or °) is degrees, and so is a bare number past 2π, which no angle in radians the slider allows can be;
 * one marked `pi` (or π) is a multiple of π, `0.5pi` or `pi/2`; a bare number up to 2π is radians still, as every
 * address the page wrote before this one was (phi=1.5707963267948966 opens the same quarter arc it always did). */
function readAngle(raw: string | null): number | undefined {
 if (raw == null) return undefined;
 const v = raw.trim().toLowerCase().replace(/\s+/g, '');
 const deg = v.match(/^(.+?)(?:deg|°)$/);
 if (deg) { const n = readNumber(deg[1]); return n === undefined ? undefined : n * Math.PI / 180; }
 const pi = v.match(/^(.*?)\*?(?:pi|π)(?:\/(.+))?$/);
 if (pi) {
  const times = pi[1] === '' ? 1 : readNumber(pi[1]), over = pi[2] === undefined ? 1 : readNumber(pi[2]);
  return times === undefined || !over ? undefined : times * Math.PI / over;
 }
 const n = readNumber(v);
 return n === undefined ? undefined : n > 2 * Math.PI ? n * Math.PI / 180 : n;
}
/** A stage of the run, by its number or its word; anything else is no stage. */
function readStage(raw: string | null): number | undefined {
 if (raw == null) return undefined;
 const v = raw.trim().toLowerCase();
 const word = STAGE_WORDS.indexOf(v as typeof STAGE_WORDS[number]);
 if (word >= 0) return word + 1;
 const n = readNumber(v);
 return n !== undefined && Number.isInteger(n) && n >= 1 && n <= STAGE_WORDS.length ? n : undefined;
}
function flag(raw: string | null): boolean | undefined {
 if (raw == null) return undefined;
 const v = raw.trim().toLowerCase();
 if (v === '1' || v === 'true' || v === 'yes') return true;
 if (v === '0' || v === 'false' || v === 'no') return false;
 return undefined;
}
/** Query string → assignment. Unknown keys and unparsable numbers are ignored, never thrown. */
export function parseAssignment(search: string): Assignment {
 const q = search.startsWith('?') ? search.slice(1) : search;
 let params: URLSearchParams;
 try { params = new URLSearchParams(q); } catch { return {}; }
 const out: Assignment = {};
 // As a teacher might type it -- ?p=Ring, or with a space pasted after it -- the lesson is still the ring:
 // the ids are all lower case, and an unknown one opened the first lesson with no word of why.
 const id = (params.get('p') ?? params.get('problem') ?? params.get('id'))?.trim().toLowerCase();
 if (id && IDS.has(id)) out.id = id as ProblemId;
 const mode = params.get('mode');
 if (mode && MODES.has(mode)) out.mode = mode as ExploreMode;
 const partial: Partial<Params> = {};
 for (const [key, field] of Object.entries(ALIAS)) {
  const n = field === 'phi' ? readAngle(params.get(key)) : readNumber(params.get(key));
  if (n !== undefined) partial[field] = n;
 }
 if (Object.keys(partial).length) out.params = partial;
 const pair = flag(params.get('pair')), components = flag(params.get('components'));
 if (pair !== undefined) out.pair = pair;
 if (components !== undefined) out.components = components;
 const stage = readStage(params.get('stage'));
 if (stage !== undefined) out.stage = stage;
 // As a teacher might type it: 3D, 3d, or with a space pasted after it. Anything else opens the lesson its own way.
 const view = params.get('view')?.trim().toLowerCase();
 if (view === '2d' || view === '3d') out.view = view;
 return out;
}
/** Compact query (no leading ?). Defaults are omitted so a teacher link stays short. The arc's angle is written
 * in whole degrees, marked, as its slider reads: phi=90deg, not phi=1.5707963267948966. */
export function serializeAssignment(a: Assignment): string {
 const q = new URLSearchParams();
 if (a.mode && a.mode !== 'divide') q.set('mode', a.mode);
 if (a.params) {
  const cleaned = cleanParams(a.params);
  for (const k of Object.keys(DEFAULT_PARAMS) as (keyof Params)[]) {
   if (Math.abs(cleaned[k] - DEFAULT_PARAMS[k]) > 1e-9) q.set(k, k === 'phi' ? `${Math.round(cleaned[k] * 180 / Math.PI)}deg` : String(cleaned[k]));
  }
 }
 if (a.pair) q.set('pair', '1');
 if (a.components) q.set('components', '1');
 if (a.stage) q.set('stage', String(a.stage));
 if (a.view) q.set('view', a.view);
 if (a.id && (a.id !== 'bisector' || q.toString())) q.set('p', a.id);
 return q.toString();
}
