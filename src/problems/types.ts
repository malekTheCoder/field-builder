import type {ProblemId} from '../distributions';
export type {ProblemId} from '../distributions';
export type Params={distance:number;size:number;charge:number;phi:number;element:number;slices:number;continuum:number};
export type Answer={id:string;label:string;expected:string;tex:string;options:string[];hint:string;mistakes?:{expression:string;message:string;highlight?:string}[]};
/** What a step asks for, independent of where it sits. The field flow runs origin → element →
 * contribution → symmetry → variable → bounds → integrate → limits; the potential flow drops
 * symmetry (a scalar has nothing to cancel) and may add a gradient step, E = −dV/dz, at the end. */
export type StepKind='origin'|'element'|'contribution'|'symmetry'|'variable'|'bounds'|'integrate'|'limits'|'gradient';
export type Step={kind:StepKind;title:string;text:string;fields?:Answer[];hint:string;worked?:{text:string;tex:string}[]};
export type Limit={id:string;title:string;prompt:string;answer:string;choices:string[];explanation:string;formula:string;mode:'far'|'infinite'|'center'|'half'|'full'|'scale'|'maximum'|'moment';reference:string};
/** `quantity` is what the integral produces; `geometry` is the field problem whose charge layout and diagram this one shares (itself, for a field problem). */
export type Problem={id:ProblemId;quantity:'E'|'V';geometry:ProblemId;title:string;short:string;subtitle:string;number:string;kind:string;setup:string;origin:string;alternateOrigin:string;coordinate:string;variable:string;variableTex:string;density:string;densityTex:string;dq:string;dqTex:string;distance:string;projection:string;kernel:string;kernelTex:string;integralTex:string;result:string;resultTex:string;secondaryResult?:string;secondaryResultTex?:string;bounds:[string,string];boundTex:[string,string];symmetry:{answer:string;options:string[];axis:string;axes:string[];text:string;tex:string};steps:Step[];limits:Limit[];sources:{title:string;url:string}[];link?:{id:ProblemId;text:string};};
export const DEFAULT_PARAMS:Params={distance:3,size:4,charge:2,phi:Math.PI,element:.65,slices:5,continuum:0};
export const STAGE_LABELS:Record<StepKind,string>={origin:'Coordinates',element:'Charge element',contribution:'One contribution',symmetry:'Symmetry',variable:'Substitution',bounds:'Bounds',integrate:'Integration',limits:'Sanity check',gradient:'Differentiate back'};
export const PHASES=['MODEL','VISUALIZE','SOLVE','ASSESS'];
export const PHASE_OF_KIND:Record<StepKind,number>={origin:0,element:1,contribution:2,symmetry:2,variable:2,bounds:2,integrate:2,limits:3,gradient:3};
/** Index of the step of a given kind, or −1 when the flow has none. */
export const stageOf=(p:Problem,kind:StepKind)=>p.steps.findIndex(s=>s.kind===kind);
