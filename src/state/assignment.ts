import { PROBLEM_IDS, type ProblemId } from '../distributions';
import { DEFAULT_PARAMS, type Params } from '../problems/types';

export type ExploreMode = 'divide' | 'project' | 'sum' | 'integrate';
export type Assignment = { id?: ProblemId; mode?: ExploreMode; params?: Partial<Params>; pair?: boolean; components?: boolean };
const MODES = new Set<string>(['divide', 'project', 'sum', 'integrate']);
const IDS = new Set<string>(PROBLEM_IDS);
const RANGES: Record<keyof Params, [number, number]> = { distance: [.5, 6], size: [1, 8], charge: [.5, 5], phi: [Math.PI * .1, Math.PI * 2], element: [0, 1], slices: [3, 30], continuum: [0, 1] };
const ALIAS: Record<string, keyof Params> = { r: 'distance', L: 'size', Q: 'charge', N: 'slices', c: 'continuum', distance: 'distance', size: 'size', charge: 'charge', phi: 'phi', slices: 'slices', continuum: 'continuum', element: 'element' };

export function cleanParams(v: Partial<Params>): Params {
 const out = { ...DEFAULT_PARAMS };
 for (const k of Object.keys(out) as (keyof Params)[]) {
  const n = v[k];
  if (typeof n === 'number' && Number.isFinite(n)) out[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], n));
 }
 return out;
}
function readNumber(raw: string | null): number | undefined {
 if (raw == null || raw === '') return undefined;
 const n = Number(raw);
 return Number.isFinite(n) ? n : undefined;
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
 const id = params.get('p') ?? params.get('problem') ?? params.get('id');
 if (id && IDS.has(id)) out.id = id as ProblemId;
 const mode = params.get('mode');
 if (mode && MODES.has(mode)) out.mode = mode as ExploreMode;
 const partial: Partial<Params> = {};
 for (const [key, field] of Object.entries(ALIAS)) {
  const n = readNumber(params.get(key));
  if (n !== undefined) partial[field] = n;
 }
 if (Object.keys(partial).length) out.params = partial;
 const pair = flag(params.get('pair')), components = flag(params.get('components'));
 if (pair !== undefined) out.pair = pair;
 if (components !== undefined) out.components = components;
 return out;
}
/** Compact query (no leading ?). Defaults are omitted so a teacher link stays short. */
export function serializeAssignment(a: Assignment): string {
 const q = new URLSearchParams();
 if (a.mode && a.mode !== 'divide') q.set('mode', a.mode);
 if (a.params) {
  const cleaned = cleanParams(a.params);
  for (const k of Object.keys(DEFAULT_PARAMS) as (keyof Params)[]) {
   if (Math.abs(cleaned[k] - DEFAULT_PARAMS[k]) > 1e-9) q.set(k, String(cleaned[k]));
  }
 }
 if (a.pair) q.set('pair', '1');
 if (a.components) q.set('components', '1');
 if (a.id && (a.id !== 'bisector' || q.toString())) q.set('p', a.id);
 return q.toString();
}
