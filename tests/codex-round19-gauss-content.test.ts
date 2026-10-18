import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {MISCONCEPTION} from '../src/quiz/misconceptions';
import {gaussLesson} from '../src/gauss';
import {bank as symmetry} from '../src/quiz/bank/gauss-symmetry';
import {bank as runsOut} from '../src/quiz/bank/gauss-runs-out';
import {bank as holes} from '../src/quiz/bank/gauss-holes';
import {bank as flux} from '../src/quiz/bank/gauss-flux';
it('scopes the direct field recipe without claiming no other surface can help',()=>{
 // A sphere centred on a line has varying |E| but constant E dot n after the line field is known.
 for(const sin of[.2,.6,1])expect((2/sin)*sin).toBeCloseTo(2);
 const guide=readFileSync(new URL('../src/guide/Guide.tsx',import.meta.url),'utf8');
 expect(guide).not.toMatch(/only where symmetry makes the field the same|On any other surface|no surface makes it solvable|has no such surface|If not, build the integral/);
 const banks=JSON.stringify([symmetry,runsOut,holes,flux]);
 expect(banks).not.toMatch(/on no surface|no closed surface has its field|field must be the same over each part|only a symmetry that makes the field the same/);
 expect(holes.find(q=>q.id==='holes-disc')?.choices.find(c=>c.correct)?.text).toContain('axial symmetry alone');
});
it('keeps the chosen normal when converting an angle to the plane',()=>{
 const beta=Math.PI/6,theta=Math.PI/2+beta;
 expect(Math.cos(theta)).toBeCloseTo(-Math.sin(beta));
 const lesson=JSON.stringify(gaussLesson('flux')?.sections);
 const idea=MISCONCEPTION.get('angle-from-surface')!.idea;
 for(const text of[lesson,idea]){
  expect(text).toContain('chosen normal');expect(text).toContain('magnitude');
  expect(text).not.toMatch(/angle you want is its complement|use its complement/);
 }
 expect(flux.find(q=>q.id==='flux-angle-to-surface')!.prompt).toContain('nonnegative');
});

it('checks density elements and the symmetry-qualified field quotient dimensionally',()=>{
 // Exponents of charge, force and length: rho dV is charge; rho dr is charge per area.
 const add=(a:number[],b:number[])=>a.map((x,i)=>x+b[i]);
 expect(add([1,0,-3],[0,0,3])).toEqual([1,0,0]);
 expect(add([1,0,-3],[0,0,1])).toEqual([1,0,-2]);
 const epsilonArea=add([2,-1,-2],[0,0,2]);
 expect(add([1,0,0],epsilonArea.map(x=>-x))).toEqual([-1,1,0]);
 const section=gaussLesson('qenc')!.sections!.find(s=>s.heading==='Check the units before integrating');
 const text=JSON.stringify(section);
 expect(text).toContain('spherical symmetry');expect(text).toContain('bounds, sign or dimensionless factors');
});
