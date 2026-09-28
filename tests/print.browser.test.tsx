import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';
import {getProblem} from '../src/problems/definitions';

afterEach(async () => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  try { await cdp().send('Emulation.setEmulatedMedia', {media: ''}); } catch { /* not emulating */ }
  await page.viewport(1280, 800);
});

function cssText() {
  const parts: string[] = [];
  for (const sheet of document.styleSheets) {
    try { for (const rule of sheet.cssRules) parts.push(rule.cssText); } catch { /* ignored sheets */ }
  }
  return parts.join('\n');
}

describe('print stylesheet and offline copy', () => {
  it('declares letter paper and hides chrome while keeping the figure', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const {findByRole, getByRole, container} = render(<Explorer />);
    expect(await findByRole('heading', {name: getProblem('bisector').title})).toBeTruthy();
    expect(cssText()).toMatch(/@page[^{]*\{[^}]*size:\s*letter/i);
    // Print, save-a-copy and the repository now sit behind one trigger in the header, so the
    // trigger is the chrome this asserts about -- same claim, new location.
    const printBtn = getByRole('button', {name: 'Lesson tools'});
    const sidebar = container.querySelector('.exp-sidebar') as HTMLElement | null;
    const diagram = container.querySelector('.cd-svg') as SVGElement | null;
    // Found by role and name on screen, where every one of them is live; the names are what a
    // reader would call them. Queried before print hides them, when they have no name left.
    const screenOnly = ['2D', '3D', 'Field lines', 'Arrows', 'Off', 'Zoom in', 'Zoom out', 'Reset view', 'Watch it build', 'Walk me through the integral', 'Reset geometry']
      .map(name => [name, getByRole('button', {name})] as const);
    const builderSlot = getByRole('button', {name: /Charge in one piece/});
    const title = getByRole('heading', {name: getProblem('bisector').title});
    await page.viewport(816, 1056);
    await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
    expect(getComputedStyle(printBtn).display).toBe('none');
    if (sidebar) expect(getComputedStyle(sidebar).display).toBe('none');
    expect(diagram).toBeTruthy();
    expect(getComputedStyle(diagram!).display).not.toBe('none');
    expect(diagram!.getBoundingClientRect().width).toBeGreaterThan(40);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 24);
    // Nothing that only acts on a screen prints: the figure's view strip, the walkthrough's
    // buttons, slider tracks, the geometry reset, and endnotes nobody opened...
    for (const [name, control] of screenOnly) expect(control.checkVisibility(), `${name} prints`).toBe(false);
    const tracks = container.querySelectorAll<HTMLElement>('[data-slot=slider]');
    expect(tracks.length).toBeGreaterThan(0);
    for (const track of tracks) expect(track.checkVisibility()).toBe(false);
    expect(container.querySelector<HTMLElement>('.exp-endnotes')!.checkVisibility()).toBe(false);
    // ...while the title, the figure's equation and the integral being built all stay.
    expect(title.checkVisibility()).toBe(true);
    expect(container.querySelector<HTMLElement>('.exp-diagram-heading .katex')!.checkVisibility()).toBe(true);
    expect(builderSlot.checkVisibility()).toBe(true);
    await cdp().send('Emulation.setEmulatedMedia', {media: ''});
  });

  it('prints in the light theme when the screen is dark, and returns to dark after', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: true, sidebarOpen: true, params: {}}));
    const {findByRole, unmount} = render(<Explorer />);
    expect(await findByRole('heading', {name: getProblem('bisector').title})).toBeTruthy();
    const root = document.documentElement;
    await waitFor(() => expect(root.classList.contains('dark')).toBe(true));
    window.dispatchEvent(new Event('beforeprint'));
    expect(root.classList.contains('dark')).toBe(false);
    window.dispatchEvent(new Event('afterprint'));
    expect(root.classList.contains('dark')).toBe(true);
    unmount();
    root.classList.remove('dark');
  });

  it('downloads a self-contained HTML copy of the open lesson', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'ring', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const {findByRole, getByRole} = render(<Explorer />);
    expect(await findByRole('heading', {name: getProblem('ring').title})).toBeTruthy();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:field-builder-copy');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const names: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    try {
      await userEvent.click(getByRole('button', {name: 'Lesson tools'}));
      await userEvent.click(await findByRole('menuitem', {name: 'Save an offline copy of this lesson'}));
      await waitFor(() => expect(names[0]).toBe('field-builder-ring.html'));
      expect(create).toHaveBeenCalled();
      const blob = create.mock.calls[0][0] as Blob;
      expect(blob.type).toContain('text/html');
      const html = await blob.text();
      expect(html).toContain(getProblem('ring').title);
      expect(html).toContain('size: letter');
      expect(revoke).toHaveBeenCalled();
    } finally {
      click.mockRestore();
      create.mockRestore();
      revoke.mockRestore();
    }
  });
});
