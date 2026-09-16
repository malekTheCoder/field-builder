import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {useState} from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
import {Assessment} from '../src/components/Assessment';
import {getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS, type Params} from '../src/problems/types';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

function inside(dialog: Element, node: Element | null) {
  return !!node && (dialog === node || dialog.contains(node));
}

describe('keyboard and screen-reader path', () => {
  it('traps tab inside the tour and returns focus to Walkthrough on Skip', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const {findByRole, getByRole} = render(<Explorer />);
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const tour = getByRole('button', {name: /Walkthrough/});
    await userEvent.click(tour);
    const dialog = await findByRole('dialog');
    const skip = getByRole('button', {name: 'Skip intro'});
    expect(dialog.contains(skip)).toBe(true);
    skip.focus();
    for (let i = 0; i < 12; i++) {
      await userEvent.tab();
      expect(inside(dialog, document.activeElement as Element | null), `tab ${i} left the dialog`).toBe(true);
    }
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(tour));
  });


  it('announces the selected element and a distance change in SI units', async () => {
    function Harness() {
      const [selected, setSelected] = useState(3);
      const [params, setParams] = useState<Params>({...DEFAULT_PARAMS, distance: 3});
      return <ChargeDiagram problem={getProblem('bisector')} params={params} setParams={partial => setParams(p => ({...p, ...partial}))}
        count={8} continuum={0} selected={selected} onSelect={setSelected} progress={1} components={false} pair={false}
        mode="divide" boundRange={[0, 100]} onBoundRangeChange={() => {}} />;
    }
    const {container} = render(<Harness />);
    const live = container.querySelector<HTMLOutputElement>('.cd-announcement')!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    const picker = container.querySelector<HTMLInputElement>('input[aria-label="Selected charge element"]')!;
    fireEvent.change(picker, {target: {value: '4'}});
    // The announcement carries the PHYSICS of the new selection. Which piece of how many is
    // the slider's own business and a screen reader reads it off these attributes, so saying
    // it again in the live region was telling the same reader the same number twice -- and the
    // count is exactly the detail the figure was asked to stop putting in front of everyone.
    expect(picker.min).toBe('0');
    expect(picker.max).toBe('7');
    expect(picker.value).toBe('4');
    await waitFor(() => expect(live.textContent).toMatch(/Charge element selected/i), {timeout: 2000});
    expect(live.textContent, 'the contribution is what changed').toMatch(/newtons per coulomb|volts/i);
    expect(live.textContent).toMatch(/newtons per coulomb/i);
    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="Observation distance in meters"]')!, {target: {value: '4'}});
    await waitFor(() => expect(live.textContent).toMatch(/Observation distance/i), {timeout: 2000});
    expect(live.textContent).toMatch(/meters/i);
    expect(live.textContent).toMatch(/Net field magnitude/i);
  });

  it('names every library glyph, including potential, and states fifteen lessons', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const {findByRole, getByRole} = render(<Explorer />);
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    await userEvent.click(getByRole('button', {name: 'Charge library'}));
    const dialog = await findByRole('dialog');
    expect(dialog.textContent).toMatch(/15 lessons, including electric potential/);
    expect(dialog.querySelector('svg[aria-label="Ring · potential"]')).toBeTruthy();
    expect(dialog.querySelector('svg[aria-label="Disk · potential"]')).toBeTruthy();
    expect(dialog.querySelector('svg[aria-label="Arc · potential"]')).toBeTruthy();
    expect(dialog.querySelector('svg[aria-label="Line · potential"]')).toBeTruthy();
    expect(dialog.querySelector('svg[aria-label="Axis · potential"]')).toBeTruthy();
  });

  it('lets the charge sliders reverse sign through zero', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const explorer = render(<Explorer />);
    expect(await explorer.findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const exploreNow:number[]=[];
    for(const slider of explorer.getAllByRole('slider')){slider.focus();await userEvent.keyboard('{Home}');exploreNow.push(Number(slider.getAttribute('aria-valuenow')));}
    expect(exploreNow).toContain(-5);
  });

  it('exposes the limit comparison as a table of t, exact, and reference, not only an aria-label', () => {
    const problem = getProblem('bisector');
    const {container} = render(<Assessment problem={problem} params={DEFAULT_PARAMS} limit={problem.limits[0]} />);
    const table = container.querySelector('table.sr-only');
    expect(table).toBeTruthy();
    expect(table!.querySelectorAll('thead th').length).toBe(3);
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(70);
    expect(table!.querySelector('tbody tr')!.querySelectorAll('td').length).toBe(3);
    const plot = container.querySelector('svg.comparison-plot');
    expect(plot).toBeTruthy();
    expect(plot!.getAttribute('role')).toBe('img');
    expect(plot!.getAttribute('aria-label')).toMatch(/Exact field/);
  });
});
