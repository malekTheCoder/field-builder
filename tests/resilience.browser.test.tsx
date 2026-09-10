import {cleanup,fireEvent,render,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {userEvent} from 'vitest/browser';
import {useState} from 'react';
import {ErrorBoundary} from '../src/components/ErrorBoundary';
import {MathField} from '../src/components/MathField';
import {loadMathLive} from '../src/components/mathlive-loader';
import {resetSavedState} from '../src/state/storage';
vi.mock('../src/components/mathlive-loader',()=>({loadMathLive:vi.fn(()=>Promise.reject(new Error('Network unavailable')))}));
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.removeItem('field-builder:broken');localStorage.removeItem('other-app:keep')});
function Broken(){if(localStorage.getItem('field-builder:broken'))throw new Error('Invalid saved view');return <p>View recovered</p>}
function Entry(){const[value,setValue]=useState('');const[checked,setChecked]=useState(false);return <><MathField value={value} onChange={setValue} label="Charge element" onEnter={()=>setChecked(value==='Q/L')}/>{checked&&<p>Answer accepted</p>}</>}
describe('Recovery without a network or saved data',()=>{
 it('keeps a labelled, keyboard-submittable answer input when MathLive cannot load',async()=>{const ui=render(<Entry/>);await waitFor(()=>expect(ui.getByText(/Math keyboard unavailable/)).toBeTruthy());await userEvent.fill(ui.getByRole('textbox',{name:'Charge element'}),'Q/L');await userEvent.keyboard('{Enter}');expect(ui.getByText('Answer accepted')).toBeTruthy();expect(ui.container.querySelector('input.mathfield-fallback')).toBeTruthy();const before=vi.mocked(loadMathLive).mock.calls.length;await userEvent.click(ui.getByRole('button',{name:'Retry math keyboard'}));await waitFor(()=>expect(vi.mocked(loadMathLive).mock.calls.length).toBeGreaterThan(before))});
 it('recovers from a render error after resetting only Field Builder data',async()=>{vi.spyOn(console,'error').mockImplementation(()=>{});localStorage.setItem('field-builder:broken','yes');localStorage.setItem('other-app:keep','keep');const ui=render(<ErrorBoundary><Broken/></ErrorBoundary>);expect(ui.getByRole('heading',{name:'Field Builder could not display this view'})).toBeTruthy();await userEvent.click(ui.getByRole('button',{name:'Reset saved work and try again'}));expect(ui.getByText('View recovered')).toBeTruthy();expect(localStorage.getItem('other-app:keep')).toBe('keep')});
 it('handles a storage accessor that throws without throwing from recovery',()=>{vi.spyOn(window,'localStorage','get').mockImplementation(()=>{throw new DOMException('Blocked','SecurityError')});expect(resetSavedState()).toBe(false)});
 it('explains blocked storage in the recovery view',()=>{vi.spyOn(console,'error').mockImplementation(()=>{});localStorage.setItem('field-builder:broken','yes');const ui=render(<ErrorBoundary><Broken/></ErrorBoundary>);const accessor=vi.spyOn(window,'localStorage','get').mockImplementation(()=>{throw new DOMException('Blocked','SecurityError')});fireEvent.click(ui.getByRole('button',{name:'Reset saved work and try again'}));expect(ui.getByRole('alert').textContent).toContain('blocking access');accessor.mockRestore()});
});
