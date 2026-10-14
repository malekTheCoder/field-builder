import {describe,expect,it} from 'vitest';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
import {K} from '../src/distributions';
import {limitPlot,potential,sampleLimit} from '../src/symbolic/physics';

describe('arc magnitude reference',()=>{
 it('names the arc plot reference with the same positive magnitude that is plotted',()=>{
  const problem=getProblem('v-arc'),limit=problem.limits[0],plot=limitPlot(problem,limit);
  for(const charge of [-5,5]){
   const p={...DEFAULT_PARAMS,charge},sample=sampleLimit(problem,p,limit,30);
   expect(sample.target).toBeCloseTo(K*Math.abs(charge)*1e-9/(p.size/2),12);
   expect(sample.actual/sample.target).toBeCloseTo(1,12);
   expect(Math.sign(potential('v-arc',p))).toBe(Math.sign(charge));
  }
  // The numerator is |V|. A signed denominator would label the negative-charge
  // curve as -1 while its independently summed magnitude is displayed as +1.
  expect(plot.y).toContain('|V| ÷ k|Q|/R');
  expect(plot.line).toBe('k|Q|/R');
 });
});
