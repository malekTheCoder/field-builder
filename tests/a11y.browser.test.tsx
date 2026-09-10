import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import Explorer from '../src/explorer/Explorer';
import FieldBuilder from '../src/wizard/FieldBuilder';
import {MathField} from '../src/components/MathField';
import {ChargeDiagram} from '../src/diagrams/ChargeDiagram';
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
  it('traps tab inside the tour and returns focus to Quick tour on Skip', async () => {
    localStorage.setItem('field-builder:explorer:v1', JSON.stringify({id: 'bisector', seen: true, dark: false, sidebarOpen: true, params: {}}));
    const {findByRole, getByRole} = render(<Explorer />);
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const tour = getByRole('button', {name: /Quick tour/});
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

  it('returns wizard intro focus to How it works', async () => {
    const {findByRole, getByRole} = render(<FieldBuilder initialProblem="bisector" />);
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const help = getByRole('button', {name: /How it works/});
    await userEvent.click(help);
    const intro = await findByRole('dialog');
    expect(intro.textContent).toMatch(/all 15 lessons, including electric potential/);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(help));
  });

  it('lets a keyboard user pick an origin, check it, and hear the grade', async () => {
    const {findByRole, getByRole, container} = render(<FieldBuilder initialProblem="bisector" />);
    expect(await findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const origin = getByRole('radio', {name: 'At the center of the rod'});
    origin.focus();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(origin.getAttribute('aria-checked') === 'true' || origin.getAttribute('data-checked') !== null || container.querySelector('.option.selected')?.textContent).toBeTruthy());
    getByRole('button', {name: /Check this step/}).focus();
    await userEvent.keyboard('{Enter}');
    const feedback = await waitFor(() => {
      const el = container.querySelector<HTMLOutputElement>('output.feedback');
      expect(el?.textContent).toMatch(/coordinate system/i);
      return el!;
    });
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.getAttribute('aria-atomic')).toBe('true');
  });

  it('keeps MathLive in the tab order and lets Enter submit from the plain-text fallback', async () => {
    const onEnter = vi.fn(), onChange = vi.fn();
    const {container, getByRole} = render(<MathField value="" onChange={onChange} label="Charge element" onEnter={onEnter} />);
    await waitFor(() => expect(container.querySelector('math-field')).toBeTruthy(), {timeout: 15000});
    const field = container.querySelector<HTMLElement>('math-field')!;
    expect(field.getAttribute('role')).toBe('textbox');
    expect(field.tabIndex).toBeGreaterThanOrEqual(0);
    await userEvent.click(getByRole('button', {name: 'Use plain text'}));
    const fallback = container.querySelector<HTMLInputElement>('input.mathfield-fallback')!;
    expect(fallback.getAttribute('aria-label')).toBe('Charge element');
    fallback.focus();
    await userEvent.fill(fallback, 'Q/L');
    await userEvent.keyboard('{Enter}');
    expect(onEnter).toHaveBeenCalled();
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
    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="Selected charge element"]')!, {target: {value: '4'}});
    await waitFor(() => expect(live.textContent).toMatch(/Charge element 5 of 8/i), {timeout: 2000});
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
    cleanup();
    const wizard = render(<FieldBuilder initialProblem="bisector" />);
    expect(await wizard.findByRole('heading', {name: /A line of charge/})).toBeTruthy();
    const wizardNow:number[]=[];
    for(const slider of wizard.getAllByRole('slider')){slider.focus();await userEvent.keyboard('{Home}');wizardNow.push(Number(slider.getAttribute('aria-valuenow')));}
    expect(wizardNow).toContain(-5);
  });
});
