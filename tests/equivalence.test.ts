import {describe,it,expect} from 'vitest';
import {equivalent,normalize,safeParse,preview} from '../src/symbolic/equivalence';
import {bisector,getProblem,PROBLEMS} from '../src/problems/definitions';
const eq=(input:string,expected:string,id='bisector')=>equivalent(input,expected,getProblem(id)).ok;
describe('mathematical input',()=>{
 it('accepts a density times its differential without division precedence surprises',()=>{
  for(const expression of ['Q/L dy','(Q/L) dy','λ dy',String.raw`\frac{Q}{L}\,dy`])expect(eq(expression,'lambda*dy')).toBe(true);
  expect(eq('Q/(L*dy)','lambda*dy')).toBe(false);
 });
 it('accepts Greek letters, signed bounds and nested LaTeX',()=>{
  expect(eq('−π/2','-pi/2')).toBe(true);expect(eq(String.raw`\varphi/2`,'phi/2','arc')).toBe(true);
  expect(eq(String.raw`\frac{kQ}{r\sqrt{r^{2}+\frac{L^{2}}{4}}}`,bisector.result)).toBe(true);
  expect(eq(String.raw`\frac{λ}{2\pi\varepsilon_{0}r}`,'2*k*lambda/r','infinite')).toBe(true);
  expect(eq('R dθ','R*dtheta','ring')).toBe(true);expect(eq('2π r′ ds','2*pi*s*ds','disk')).toBe(true);
  expect(eq('rᵢ²','ri^2')).toBe(true);expect(eq(String.raw`r_{i}^2`,'ri^2')).toBe(true);
 });
 it('accepts common charge-density and Coulomb constant substitutions',()=>{
  expect(eq('k*Q/(a*(a+L))',getProblem('axial').result,'axial')).toBe(true);
  expect(eq('-2*k*Q*sin(phi/2)/(R^2*phi)',getProblem('arc').result,'arc')).toBe(true);
  expect(eq('k*Q*z/(R^2+z^2)^(3/2)','2*pi*k*lambda*R*z/(R^2+z^2)^(3/2)','ring')).toBe(true);
  expect(eq('2*pi*k*sigma','sigma/(2*eps0)','sheet')).toBe(true);
 });
 it('handles literal infinity bounds without accepting undefined arithmetic',()=>{
  for(const input of ['∞','inf',String.raw`\infty`,'(+Infinity)'])expect(eq(input,'Infinity','sheet')).toBe(true);
  for(const input of ['-Infinity','1/0','Infinity-Infinity'])expect(eq(input,'Infinity','sheet')).toBe(false);
  expect(eq('-∞','-Infinity')).toBe(true);
 });
 it('rejects sign, projection and small-value mistakes',()=>{
  expect(eq('k*lambda/r','-k*lambda/r','semi')).toBe(false);expect(eq('abs(lambda)','lambda')).toBe(false);
  expect(eq('dE*sin(alpha)','dE*cos(alpha)')).toBe(false);expect(eq('1e-20','0')).toBe(false);
  expect(eq('1e-20','2e-20')).toBe(false);expect(eq('r+1e-4','r')).toBe(false);
 });
 it('does not conflate independently varying symbols',()=>{
  // These relations happened to hold in every sample of the former linear sampler.
  expect(eq('(.37/.19)*(R-.8)+2.1','L')).toBe(false);
  expect(eq('(.23/.31)*(r-.43)+.6','z')).toBe(false);
  expect(eq('lambda*L','Q','semi')).toBe(false);expect(eq('sigma*pi*R^2','Q','sheet')).toBe(false);
 });
 it('is deterministic and rejects unsafe or excessively complex inputs',()=>{
  expect(equivalent('sqrt(r^2)','r',bisector)).toEqual(equivalent('sqrt(r^2)','r',bisector));
  for(const input of ['a=2;b=3','[1,2]','x[0]','random()','sqrt(1,2)','constructor(2)','2^2^100','1e100','"hello"','sin('.repeat(30)+'x'+')'.repeat(30),'x'.repeat(351)])expect(()=>safeParse(input)).toThrow();
  expect(equivalent('', 'r', bisector).error).toBeTruthy();expect(preview('sqrt(')).toContain('Keep typing');
 });
 it('normalizes but does not silently erase unknown notation',()=>{
  expect(normalize('Q/L dy')).toBe('Q/L*dy');expect(eq('unknown','r')).toBe(false);
 });
 for(const p of PROBLEMS)for(const step of p.steps)for(const f of step.fields??[])it(`${p.id}/${f.id} rejects each authored distractor`,()=>{
  for(const wrong of f.options.filter(o=>o!==f.expected))expect(eq(wrong,f.expected,p.id),`${wrong} vs ${f.expected}`).toBe(false);
 });
});
