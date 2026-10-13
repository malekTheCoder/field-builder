import type {Problem,ProblemId} from '../problems/types';
// The lessons as a reader meets them, wherever they are offered: the drawn shape of each geometry and the
// families they are grouped in. The lesson list, the library and the home page all draw from here, so the
// three pickers tell one story about the subject.
// Drawn rather than borrowed from the icon set: the generic shapes gave the ring
// and the arc the same circle, which is precisely the distinction a student is
// here to learn. Each glyph is the actual geometry, with P marked where the
// choice of observation point is what defines the problem.
export const GLYPHS:Record<ProblemId,React.ReactNode>={
 bisector:<><path d="M7 3.5v11M4.6 3.5h4.8M4.6 14.5h4.8"/><circle cx="14" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 axial:<><path d="M3 9h7.5M3 6.6v4.8M10.5 6.6v4.8"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 infinite:<><path d="M9 1.6v14.8M6.6 4L9 1.6 11.4 4M6.6 14L9 16.4 11.4 14"/><circle cx="14.4" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 ring:<circle cx="9" cy="9" r="5.8"/>,
 disk:<circle cx="9" cy="9" r="5.8" fill="currentColor" fillOpacity=".28"/>,
 semi:<><path d="M4 12.4h10.2M12.2 10.4l2.2 2-2.2 2"/><circle cx="4" cy="5.4" r="1.3" fill="currentColor" stroke="none"/></>,
 arc:<><path d="M4.2 13.8A6.8 6.8 0 0 1 13.8 4.2"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 sheet:<path d="M1.8 12.4 6.6 6.6h9.6l-4.8 5.8Z"/>,
 endpoint:<><path d="M6 3.4v9.2M3.6 3.4h4.8"/><circle cx="14" cy="12.6" r="1.3" fill="currentColor" stroke="none"/></>,
 ramp:<><path d="M6 12.6 3.8 3.4h4.4Z" fill="currentColor" fillOpacity=".3"/><circle cx="14" cy="12.6" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-ring':<circle cx="9" cy="9" r="5.8"/>,
 'v-disk':<circle cx="9" cy="9" r="5.8" fill="currentColor" fillOpacity=".28"/>,
 'v-arc':<><path d="M4.2 13.8A6.8 6.8 0 0 1 13.8 4.2"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-rod-bisector':<><path d="M7 3.5v11M4.6 3.5h4.8M4.6 14.5h4.8"/><circle cx="14" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-rod-axial':<><path d="M3 9h7.5M3 6.6v4.8M10.5 6.6v4.8"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/></>};
// Hidden from screen readers: the glyph always sits beside the lesson's printed name, and as a
// named image it read every lesson twice -- "Finite line Finite line".
export function ShapeGlyph({id,size=18}:{id:ProblemId;size?:number}){return <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-glyph={id}>{GLYPHS[id]}</svg>}
// FIFTEEN NAMES IN ONE COLUMN SAID NOTHING ABOUT THE SUBJECT. Scanning it, a reader could not
// see that four of them are the same rod looked at from four places, that three never end, or
// that the last five are the first shapes over again with the arrows replaced by numbers --
// which is the single most useful thing the list could have told them. The families are the
// lesson, so the list is grouped by them and each group says its own name.
export const FAMILIES:{label:string;ids:ProblemId[]}[]=[
 {label:'Straight rods',ids:['bisector','axial','endpoint','ramp']},
 {label:'Rings, disks and arcs',ids:['ring','disk','arc']},
 {label:'Charge with no end',ids:['infinite','semi','sheet']},
 {label:'The same shapes, as potential',ids:['v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial']}];
/** Group a set of lessons into the families above, keeping each family's stated order and
 *  dropping families nothing landed in. Anything the table has not heard of still appears, in
 *  a trailing group of its own: a new geometry must never go missing because this list is stale. */
export function families(list:Problem[]){const rest=new Set(list.map(p=>p.id));
 const groups=FAMILIES.map(f=>({label:f.label,items:f.ids.flatMap(id=>{const p=list.find(x=>x.id===id);if(!p)return[];rest.delete(id);return[p]})})).filter(g=>g.items.length>0);
 const extra=list.filter(p=>rest.has(p.id));
 return extra.length>0?[...groups,{label:'More geometries',items:extra}]:groups}
