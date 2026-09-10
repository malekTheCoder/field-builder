import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cdp, page, userEvent} from 'vitest/browser';
import Explorer from '../src/explorer/Explorer';

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
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    expect(cssText()).toMatch(/@page[^{]*\{[^}]*size:\s*letter/i);
    const printBtn = getByRole('button', {name: 'Print this lesson'});
    const sidebar = container.querySelector('.exp-sidebar') as HTMLElement | null;
    const diagram = container.querySelector('.cd-svg') as SVGElement | null;
    await page.viewport(816, 1056);
    await cdp().send('Emulation.setEmulatedMedia', {media: 'print'});
    expect(getComputedStyle(printBtn).display).toBe('none');
    if (sidebar) expect(getComputedStyle(sidebar).display).toBe('none');
    expect(diagram).toBeTruthy();
    expect(getComputedStyle(diagram!).display).not.toBe('none');
    expect(diagram!.getBoundingClientRect().width).toBeGreaterThan(40);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 24);
    await cdp().send('Emulation.setEmulatedMedia', {media: ''});
  });

  it('downloads a self-contained HTML copy of the open lesson', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'ring', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const {findByRole, getByRole} = render(<Explorer />);
    expect(await findByRole('heading', {name: /Around a ring of charge/})).toBeTruthy();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:field-builder-copy');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const names: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    try {
      await userEvent.click(getByRole('button', {name: 'Save an offline copy of this lesson'}));
      await waitFor(() => expect(names[0]).toBe('field-builder-ring.html'));
      expect(create).toHaveBeenCalled();
      const blob = create.mock.calls[0][0] as Blob;
      expect(blob.type).toContain('text/html');
      const html = await blob.text();
      expect(html).toContain('Around a ring of charge');
      expect(html).toContain('size: letter');
      expect(revoke).toHaveBeenCalled();
    } finally {
      click.mockRestore();
      create.mockRestore();
      revoke.mockRestore();
    }
  });
});
