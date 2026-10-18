import {describe, expect, it} from 'vitest';
import {MISCONCEPTION} from '../src/quiz/misconceptions';
import {GAUSS_LESSONS} from '../src/gauss';
import {bank as spheres} from '../src/quiz/bank/gauss-spheres';
import {bank as lines} from '../src/quiz/bank/gauss-lines';
import {bank as conductors} from '../src/quiz/bank/gauss-conductors';
import {fieldAt, v3} from '../src/gauss/physics';
const idea=(id:string)=>MISCONCEPTION.get(id)!.idea;
const lesson=(id:string)=>GAUSS_LESSONS.find(l=>l.id===id)!;
/* These counterexamples distinguish conditions of the elementary solving recipe from Gauss's law itself.
 * The text checks keep the counterexample's essential qualification in the feedback a learner actually reads. */
describe('Gauss feedback states the domain of its recipe',()=>{
 it('keeps the point charge solvable after changing the Gaussian surface',()=>{
  expect(lesson('runs-out').about).not.toContain('no surface');
  expect(JSON.stringify(lesson('runs-out').sections)).toContain('centred on the charge');
  expect(idea('false-symmetry')).toContain('centred on the charge');
 });
 it('presents useful surfaces as sufficient choices, not the only legal shapes',()=>{
  expect(idea('surface-real')).toContain('direct');
  expect(idea('wrong-surface')).not.toContain('On any other surface');
  expect(idea('false-symmetry')).not.toContain('Only spherical, cylindrical and planar');
  expect(lesson('holes').lead).toContain('disk plug');
  const holesText = JSON.stringify(lesson('holes'));
  expect(holesText).not.toMatch(/no closed surface has its field the same all over|no surface that would work/);
  expect(holesText).toContain('axial symmetry alone does not reduce');
  expect(lesson('holes').sections?.some(s=>s.heading==='A sheet with a hole: a disk integral')).toBe(true);
 });
 it('cancels auxiliary dimensions at fixed P while radius can set the field',()=>{
  const q={kind:'point' as const,size:0,sign:1 as const,amount:2};
  expect(fieldAt(q,v3(1,0,0)).x/fieldAt(q,v3(2,0,0)).x).toBeCloseTo(4);
  expect(idea('size-left-in')).toContain('fixed');
  expect(idea('size-left-in')).toContain('$r$');
  expect(idea('size-left-in')).not.toContain('always an algebra slip');
 });
 it('permits an integrated nonuniform charge ratio and other volume coordinates',()=>{
  expect(.5**4).toBeLessThan(.5**3);
  expect(idea('ratio-power')).not.toContain('a ratio at all');
  expect(idea('volume-as-dv')).not.toContain('always has');
  expect(idea('qenc-limit')).toContain('no edge');
  expect(idea('qenc-limit')).toContain('lower');
 });
 it('qualifies the two equal pillbox faces by even density',()=>{
  for(const sign of[1,-1]as const){const q={kind:'oddslab' as const,size:1,sign};
   expect(fieldAt(q,v3(0,0,.5)).z).toBeCloseTo(fieldAt(q,v3(0,0,-.5)).z);
  }
  expect(idea('pillbox-two')).toContain(String.raw`\rho(-z)=\rho(z)`);
  expect(idea('pillbox-two')).not.toContain('never cancel');
 });
 it('counts oriented crossings for nonconvex closed surfaces',()=>{
  expect([-1,1,-1,1].reduce((s,x)=>s+x,0)).toBe(0);
  expect([1,-1,1].reduce((s,x)=>s+x,0)).toBe(1);
  expect(idea('outside-counts')).toContain('pairs');
  expect(idea('bigger-surface')).toContain('net');
 });
 it('excludes the zero centre from strict comparisons and negative components',()=>{
  for(const kind of['ball','rising']as const)expect(fieldAt({kind,size:1,sign:-1},v3(0,0,0))).toEqual(v3(0,0,0));
  const comparison=spheres.find(q=>q.id==='spheres-rising-vs-uniform')!;
  expect(comparison.prompt).toContain('0<r<R');
  expect(comparison.explanation).toContain('centre');
  for(const bank of[spheres,lines])expect(JSON.stringify(bank)).not.toContain('negative at every $r$');
 });
 it('uses charge fractions and signed flux for either charge sign',()=>{
  expect(idea('local-density')).toContain('magnitude');
  expect(idea('local-density')).toContain('centre');
  expect(idea('conductor-half')).not.toContain('flux leaves');
  expect(JSON.stringify(conductors)).not.toContain('flux leaves');
  expect(JSON.stringify(lesson('inside'))).not.toContain('drops to zero');
 });
});
