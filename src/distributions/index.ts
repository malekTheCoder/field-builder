import type {Distribution} from './types';
import {bisector} from './bisector';
import {axial} from './axial';
import {infinite,semi} from './infinite';
import {ring,arc} from './ring';
import {disk,sheet} from './disk';
import {endpoint} from './endpoint';
import {ramp} from './ramp';
import {vRing,vDisk,vArc,vRodBisector,vRodAxial} from './potential';
export type {Distribution,ChargeSample} from './types';
export {EPS0,K,type Vec} from './constants';
/** Every distribution the pure layer knows. Adding a geometry means one module and one entry
 * here; `ProblemId` is derived from these keys, so a definition, glyph map or diagram branch that
 * forgets the new id fails to typecheck rather than silently drawing nothing. Order is the
 * library order; the practice wizard's icon map is keyed by ProblemId. */
export const REGISTRY={bisector,axial,infinite,ring,disk,semi,arc,sheet,endpoint,ramp,'v-ring':vRing,'v-disk':vDisk,'v-arc':vArc,'v-rod-bisector':vRodBisector,'v-rod-axial':vRodAxial} as const satisfies Record<string,Distribution>;
export type ProblemId=keyof typeof REGISTRY;
export const PROBLEM_IDS=Object.keys(REGISTRY) as ProblemId[];
export const distribution=(id:ProblemId):Distribution=>REGISTRY[id];
