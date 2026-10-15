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
/** GAUSS'S LAW, COMING SOON (docs/gauss-law-plan.md). The other half of the unit, planned and not built: shown
 *  as a family of its own wherever the lessons are offered, its lessons named and marked, none of them a link.
 *  A reader sees where the subject goes next, and that the gap is deliberate. These are not Problems, so they
 *  have no ProblemId and no lesson behind them; `PLANNED_SECTIONS` in problems/readiness.ts is the switch.
 *  When a Gauss lesson is built it becomes a Problem and leaves this list. */
export type PlannedLesson={key:string;name:string;about:string};
export const GAUSS:{key:'gauss';label:string;note:string;lessons:PlannedLesson[]}={key:'gauss',label:'Gauss’s law',
 note:'The shortcut, where symmetry already gives the field’s direction: one closed surface instead of the whole integral.',
 lessons:[
  {key:'flux',name:'Flux, the idea',about:'A field through a tilted patch, then through any closed surface round a point charge.'},
  {key:'shell',name:'Shell and point charge',about:'A sphere: no field inside the shell, and outside it a point charge’s.'},
  {key:'ball',name:'Solid sphere',about:'The field grows inside the ball, then falls away outside it.'},
  {key:'line',name:'Line, by Gauss',about:'A cylinder round the infinite line, checked against the integral you built.'},
  {key:'sheet',name:'Sheet, by Gauss',about:'A pillbox through the sheet, and why the distance drops out.'},
  {key:'coax',name:'Cylinders and slabs',about:'Coaxial cylinders and a thick slab, a surface placed in each region.'},
  {key:'fails',name:'When it fails',about:'The finite rod: Gauss’s law is still true, and no help at all.'}]};
/** The planned lessons' shapes, drawn as the lessons' are: the charge in ink, the closed surface dashed. */
const PLANNED_GLYPHS:Record<string,React.ReactNode>={
 flux:<><path d="M6 4.2 12 2v11.8L6 16Z"/><path d="M1.6 9h14.6M14.2 7l2 2-2 2"/></>,
 shell:<><circle cx="9" cy="9" r="4.4"/><circle cx="9" cy="9" r="7.2" strokeDasharray="2 2.2"/></>,
 ball:<><circle cx="9" cy="9" r="4.4" fill="currentColor" fillOpacity=".28"/><circle cx="9" cy="9" r="7.2" strokeDasharray="2 2.2"/></>,
 line:<><path d="M9 1.6v14.8"/><ellipse cx="9" cy="4.6" rx="4.6" ry="1.6" strokeDasharray="2 2"/><ellipse cx="9" cy="13.4" rx="4.6" ry="1.6" strokeDasharray="2 2"/><path d="M4.4 4.6v8.8M13.6 4.6v8.8" strokeDasharray="2 2"/></>,
 sheet:<><path d="M1.8 12.4 6.6 6.6h9.6l-4.8 5.8Z"/><rect x="7" y="4.4" width="4" height="8.6" rx="1" strokeDasharray="2 1.8"/></>,
 coax:<><circle cx="9" cy="9" r="2.6"/><circle cx="9" cy="9" r="6.6"/><circle cx="9" cy="9" r="4.6" strokeDasharray="1.6 1.8"/></>,
 fails:<><path d="M9 4v10M6.6 4h4.8M6.6 14h4.8"/><circle cx="9" cy="9" r="7.2" strokeDasharray="2 2.2"/></>};
export function PlannedGlyph({id,size=18}:{id:string;size?:number}){return <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-glyph={`gauss-${id}`}>{PLANNED_GLYPHS[id]}</svg>}
