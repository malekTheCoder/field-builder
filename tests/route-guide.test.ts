import {describe, expect, it} from 'vitest';
import {GUIDE_HREF, viewOf} from '../src/state/route';
/* THE STUDY GUIDE IS A PAGE OF ITS OWN. `?guide` opens it; a lesson's address still opens the lesson,
 * even with the guide's word in it, and the bare address is still the home page. */
describe('viewOf', () => {
  it('reads the guide from its address', () => {
    expect(viewOf('?guide')).toBe('guide');
    expect(viewOf(GUIDE_HREF)).toBe('guide');
    expect(viewOf('?guide=')).toBe('guide');
  });
  it('keeps every other page where it was', () => {
    expect(viewOf('')).toBe('home');
    expect(viewOf('?')).toBe('home');
    expect(viewOf('?p=ring')).toBe('lesson');
    expect(viewOf('?p=v-rod-axial')).toBe('lesson');
    expect(viewOf('?p=ring&guide')).toBe('lesson');
    expect(viewOf('?r=3')).toBe('lesson');
  });
});
