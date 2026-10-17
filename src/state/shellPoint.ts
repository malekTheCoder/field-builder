import type {Params} from '../problems/types';
/** The field on an ideal charged skin has different one-sided limits. The ring integral at
 * the skin returns their mean, not the field just inside or outside that this lesson teaches.
 * Keep P on either side, one slider step away. Follow the direction of a slider crossing so
 * keyboard users can cross both ways; an old saved value or link on the skin opens outside. */
export function offShellSurface(next: Params, previous?: Params): Params {
 const radius=next.size/2;
 if(Math.abs(next.distance-radius)>1e-9)return next;
 const oldGap=previous?previous.distance-previous.size/2:0;
 const side=oldGap>1e-9?-1:1;
 const distance=Math.max(.5,radius+side*.05);
 return {...next,distance:Math.abs(distance-radius)<1e-9?radius+.05:distance};
}
