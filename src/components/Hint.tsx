'use client';
import type {ReactElement} from 'react';
import {Tooltip,TooltipTrigger,TooltipContent} from '@/components/ui/tooltip';
// A hover/focus label for a control whose meaning is carried only by its icon. The trigger IS the
// control: Base UI merges its listeners onto the element passed in, so focus order, the click
// handler and the accessible name are untouched. Keep `label` identical to that aria-label, or a
// mouse user and a screen-reader user are told two different things about the same button.
export function Hint({label,side='bottom',children}:{label:string;side?:'top'|'bottom'|'left'|'right';children:ReactElement}){
 return <Tooltip><TooltipTrigger delay={260} render={children}/><TooltipContent className="hint-tip" side={side} sideOffset={9}>{label}</TooltipContent></Tooltip>;
}
