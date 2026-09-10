'use client';
import {stageOf,type Problem,type Params,type StepKind} from '../problems/types';
import {ChargeDiagram} from './ChargeDiagram';
import {partitionCount} from './subdivision';
export type DiagramProps={problem:Problem;params:Params;setParams:(p:Partial<Params>)=>void;stage:number;alternate:boolean;highlight:string;boundRange:[number,number];setBoundRange:(r:[number,number])=>void};
/** Drawn and sampled pieces. N doubles so a refinement is extra cuts, not a new set of blobs. */
export const pieceCount=(p:Params)=>partitionCount(p.slices,p.continuum);
/** Which drawn element the wizard's single `element` parameter selects. */
export const pieceIndex=(p:Params,count=pieceCount(p))=>Math.max(0,Math.min(count-1,Math.round(p.element*(count-1))));
/** Step kind → diagram emphasis. Origin and element slice the charge; contribution, symmetry and
 *  variable build and project one contribution; bounds needs draggable limits; the rest accumulate. */
const MODES:Record<StepKind,'divide'|'project'|'sum'|'integrate'>={origin:'divide',element:'divide',contribution:'project',symmetry:'project',variable:'project',bounds:'integrate',integrate:'sum',limits:'sum',gradient:'sum'};
export function Geometry({problem,params,setParams,stage,alternate,highlight,boundRange,setBoundRange}:DiagramProps){const count=pieceCount(params),kind=problem.steps[Math.max(0,Math.min(problem.steps.length-1,stage))].kind,mode=MODES[kind],bounding=mode==='integrate';
 // The partner appears with the symmetry step; a flow without one shows it from the first contribution on.
 const pairFrom=stageOf(problem,'symmetry')>=0?stageOf(problem,'symmetry'):stageOf(problem,'contribution');
 return <><ChargeDiagram problem={problem} params={params} setParams={setParams} count={count} continuum={params.continuum} selected={pieceIndex(params,count)} onSelect={i=>setParams({element:count>1?Math.max(0,Math.min(1,i/(count-1))):0})} progress={1} components={stage>=stageOf(problem,'contribution')} pair={stage>=pairFrom} mode={mode} boundRange={bounding?boundRange:[0,100]} onBoundRangeChange={setBoundRange} highlight={highlight}/>{alternate&&<p className="note" style={{borderRadius:0,fontSize:13}}>The drawing retains the reference axes. A shifted origin changes coordinate labels and bounds, but never the physical field.</p>}</>}
