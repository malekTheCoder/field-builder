import {cleanup, render, waitFor} from '@testing-library/react';
import {userEvent} from 'vitest/browser';
import {useState} from 'react';
import {afterEach, expect, it} from 'vitest';
import {Slider} from '../components/ui/slider';
import {AnswerInput} from '../src/components/AnswerInput';
import {getProblem} from '../src/problems/definitions';

afterEach(cleanup);
function Range(){const [value,setValue]=useState([40]);return <Slider aria-label="Charge elements" value={value} onValueChange={v=>setValue(Array.isArray(v)?v:[v])}/>}
it('keeps slider gestures nonselectable and retains native keyboard adjustment',async()=>{
 const {container,getByRole}=render(<Range/>);const root=container.querySelector<HTMLElement>('[data-slot=slider]')!;
 expect(getComputedStyle(root).userSelect).toBe('none');expect(getComputedStyle(root).touchAction).toBe('none');
 const slider=getByRole('slider');slider.focus();await userEvent.keyboard('{ArrowRight}');
 await waitFor(()=>expect(slider.getAttribute('aria-valuenow')).toBe('41'));
});
it('exposes symbol buttons as a named native fieldset',()=>{
 const field=getProblem('bisector').steps[4].fields![0];const {getByRole}=render(<AnswerInput field={field} value="" onChange={()=>{}} guided={false}/>);
 expect(getByRole('group',{name:'Symbols for '+field.label}).tagName).toBe('FIELDSET');
 expect(getByRole('button',{name:'lambda'})).toBeTruthy();
});
