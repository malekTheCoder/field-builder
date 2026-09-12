import {cleanup,fireEvent,render} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {userEvent} from 'vitest/browser';
import {ErrorBoundary} from '../src/components/ErrorBoundary';
import {resetSavedState} from '../src/state/storage';
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.removeItem('field-builder:broken');localStorage.removeItem('other-app:keep')});
function Broken(){if(localStorage.getItem('field-builder:broken'))throw new Error('Invalid saved view');return <p>View recovered</p>}
describe('Recovery without a network or saved data',()=>{
 it('recovers from a render error after resetting only Field Builder data',async()=>{vi.spyOn(console,'error').mockImplementation(()=>{});localStorage.setItem('field-builder:broken','yes');localStorage.setItem('other-app:keep','keep');const ui=render(<ErrorBoundary><Broken/></ErrorBoundary>);expect(ui.getByRole('heading',{name:'Field Builder could not display this view'})).toBeTruthy();await userEvent.click(ui.getByRole('button',{name:'Reset saved work and try again'}));expect(ui.getByText('View recovered')).toBeTruthy();expect(localStorage.getItem('other-app:keep')).toBe('keep')});
 it('handles a storage accessor that throws without throwing from recovery',()=>{vi.spyOn(window,'localStorage','get').mockImplementation(()=>{throw new DOMException('Blocked','SecurityError')});expect(resetSavedState()).toBe(false)});
 it('explains blocked storage in the recovery view',()=>{vi.spyOn(console,'error').mockImplementation(()=>{});localStorage.setItem('field-builder:broken','yes');const ui=render(<ErrorBoundary><Broken/></ErrorBoundary>);const accessor=vi.spyOn(window,'localStorage','get').mockImplementation(()=>{throw new DOMException('Blocked','SecurityError')});fireEvent.click(ui.getByRole('button',{name:'Reset saved work and try again'}));expect(ui.getByRole('alert').textContent).toContain('blocking access');accessor.mockRestore()});
});
