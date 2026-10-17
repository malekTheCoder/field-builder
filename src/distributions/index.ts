import type {Distribution} from './types';
import {bisector} from './bisector';
import {axial} from './axial';
import {infinite,semi} from './infinite';
import {ring,arc,unevenArc} from './ring';
import {disk,sheet,annulus} from './disk';
import {endpoint} from './endpoint';
import {ramp} from './ramp';
import {offset} from './offset';
import {shell} from './shell';
import {vRing,vDisk,vArc,vRodBisector,vRodAxial} from './potential';
export type {Distribution,ChargeSample} from './types';
export {EPS0,K,type Vec} from './constants';
/** Every distribution the pure layer knows. Adding a geometry means one module and one entry
 * here; `ProblemId` is derived from these keys, so a definition, glyph map or diagram branch that
 * forgets the new id fails to typecheck rather than silently drawing nothing. Order is the
 * library order; the practice wizard's icon map is keyed by ProblemId. */
export const REGISTRY={bisector,axial,infinite,ring,disk,semi,arc,sheet,endpoint,ramp,'v-ring':vRing,'v-disk':vDisk,'v-arc':vArc,'v-rod-bisector':vRodBisector,'v-rod-axial':vRodAxial,'uneven-arc':unevenArc,annulus,offset,shell} as const satisfies Record<string,Distribution>;
export type ProblemId=keyof typeof REGISTRY;
export const PROBLEM_IDS=Object.keys(REGISTRY) as ProblemId[];
export const distribution=(id:ProblemId):Distribution=>REGISTRY[id];
/** The geometries summed as whole rings round an axis through P: their pieces are rings, their field lies along
 * the axis, and the figure draws them in perspective. */
export const RING_SUMS:ReadonlySet<string>=new Set(['disk','sheet','annulus']);
export const ringSum=(id:string)=>RING_SUMS.has(id);
