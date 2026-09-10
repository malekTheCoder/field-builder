import {describe, expect, it} from 'vitest';
import {artifactHtml, escapeHtml} from '../src/state/artifact';

describe('offline lesson artifact', () => {
  it('embeds the title, TeX, parameters, and escaped student answers', () => {
    const html = artifactHtml({
      title: 'A line of charge',
      subtitle: 'Perpendicular bisector',
      setup: 'A thin rod of length L.',
      integralTex: String.raw`E_x=\int dE_x`,
      resultTex: String.raw`E_x=\frac{kQ}{r}`,
      params: {distance: 3, size: 4, charge: 2, phi: Math.PI},
      answers: {origin: 'At the center of the rod', dq: '<script>alert(1)</script>'},
      svg: '<svg class="cd-svg" viewBox="0 0 10 10"><circle r="2"/></svg>',
    });
    expect(html).toContain('A line of charge');
    expect(html).toContain('size: letter');
    expect(html).toContain(String.raw`E_x=\int dE_x`);
    expect(html).toContain('Distance r / z / a = 3 m');
    expect(html).toContain('<svg class="cd-svg"');
    expect(html).toContain(escapeHtml('<script>alert(1)</script>'));
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
