import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';
import {parseAssignment} from '../src/state/assignment';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

/* THE PAPER SAYS WHERE IT CAME FROM. The offline copy prints the live lesson's address under its title
 * (artifact.ts, `lessonArtifact`'s third argument), but only when the page hands the address over -- and
 * the page's own "Save an offline copy" did not, so the copy a student actually downloads named no lesson
 * at all. A teacher who set the arc to a quarter turn and a negative charge sent home a paper whose link,
 * had it had one, would open the defaults. It must be the page's own address, values and all. */
describe('the downloaded copy carries the live lesson’s address', () => {
  it('names the lesson and its values, as Copy a link does', async () => {
    window.history.replaceState(null, '', '/?p=arc&phi=90deg&Q=-2');
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'arc', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const {findByRole, getByRole} = render(<Explorer />);
    expect(await findByRole('heading', {name: getProblem('arc').title})).toBeTruthy();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:field-builder-copy');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      await userEvent.click(getByRole('button', {name: 'Lesson tools'}));
      await userEvent.click(await findByRole('menuitem', {name: 'Save an offline copy of this lesson'}));
      await waitFor(() => expect(create).toHaveBeenCalled());
      const html = await (create.mock.calls[0][0] as Blob).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const link = doc.querySelector<HTMLAnchorElement>('p.address a');
      expect(link, 'the copy names no address').toBeTruthy();
      const url = new URL(link!.getAttribute('href')!);
      expect(url.origin + url.pathname).toBe(location.origin + location.pathname);
      // Read back the way the page reads a link, so the test holds whatever spelling the address uses.
      const back = parseAssignment(url.search);
      expect(back.id).toBe('arc');
      expect(back.params?.charge).toBe(-2);
      expect(back.params?.phi).toBeCloseTo(Math.PI / 2, 6);
    } finally {
      click.mockRestore();
      create.mockRestore();
      revoke.mockRestore();
    }
  }, 30000);
});
