import {cleanup, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {useState} from 'react';
import {afterEach, expect, it} from 'vitest';
import {Slider} from '../components/ui/slider';

afterEach(cleanup);
function Range(){const [value,setValue]=useState([40]);return <Slider aria-label="Charge elements" value={value} onValueChange={v=>setValue(Array.isArray(v)?v:[v])}/>}
it('keeps slider gestures nonselectable and retains native keyboard adjustment',async()=>{
 const {container,getByRole}=render(<Range/>);const root=container.querySelector<HTMLElement>('[data-slot=slider]')!;
 expect(getComputedStyle(root).userSelect).toBe('none');expect(getComputedStyle(root).touchAction).toBe('none');
 const slider=getByRole('slider');slider.focus();await userEvent.keyboard('{ArrowRight}');
 await waitFor(()=>expect(slider.getAttribute('aria-valuenow')).toBe('41'));
});
