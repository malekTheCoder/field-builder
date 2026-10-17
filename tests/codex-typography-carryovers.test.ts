import {expect,it} from 'vitest';
import {mathProseHtml,proseHtml} from '../src/state/artifact';
import {hold} from '../src/problems/prose';
it('plain check symbols use the math face without italicising prose or function names',()=>{
 const html=mathProseHtml(hold('A rod has charge Q at P and a radius a. When a < R, use sin α and ln(R/a).'));
 expect(html).toContain('<span class="g">Q</span>');expect(html).toContain('<span class="g">P</span>');
 expect(html).toContain('<span class="g">a</span>');expect(html).toContain('<span class="g">R</span>');
 for(const word of ['A','at','and','a radius','sin','ln'])expect(html).not.toContain(`<span class="g">${word}</span>`);
});
it('check markup escapes authored text before adding symbol spans',()=>{
 const html=mathProseHtml('<img src=x> & "Q"');
 expect(html).toContain('&lt;img');expect(html).toContain('&gt;');expect(html).toContain('&amp;');expect(html).toContain('&quot;');expect(html).not.toContain('<img');
});
it('explicit mathematics in a check follows the ordinary prose renderer',()=>{
 const text=String.raw`For $r>R$, the field is $kQ/r^2$.`;
 expect(mathProseHtml(text)).toBe(proseHtml(text));
});
