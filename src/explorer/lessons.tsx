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
 // The disk with its middle out: both edges drawn, the face between them filled.
 annulus:<path d="M9 3.2a5.8 5.8 0 1 0 0 11.6a5.8 5.8 0 1 0 0-11.6Zm0 3.4a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8Z" fill="currentColor" fillOpacity=".28" fillRule="evenodd"/>,
 semi:<><path d="M6 12.6V1.8M3.6 4.2 6 1.8l2.4 2.4"/><circle cx="14" cy="12.6" r="1.3" fill="currentColor" stroke="none"/></>,
 arc:<><path d="M4.2 13.8A6.8 6.8 0 0 1 13.8 4.2"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 sheet:<path d="M1.8 12.4 6.6 6.6h9.6l-4.8 5.8Z"/>,
 endpoint:<><path d="M6 3.4v9.2M3.6 3.4h4.8"/><circle cx="14" cy="12.6" r="1.3" fill="currentColor" stroke="none"/></>,
 ramp:<><path d="M6 12.6 3.8 3.4h4.4Z" fill="currentColor" fillOpacity=".3"/><circle cx="14" cy="12.6" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-ring':<circle cx="9" cy="9" r="5.8"/>,
 'v-disk':<circle cx="9" cy="9" r="5.8" fill="currentColor" fillOpacity=".28"/>,
 'v-arc':<><path d="M4.2 13.8A6.8 6.8 0 0 1 13.8 4.2"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-rod-bisector':<><path d="M7 3.5v11M4.6 3.5h4.8M4.6 14.5h4.8"/><circle cx="14" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 'v-rod-axial':<><path d="M3 9h7.5M3 6.6v4.8M10.5 6.6v4.8"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
 // The semicircle whose charge thickens toward its middle: drawn heavier where the density is.
 'uneven-arc':<><path d="M9 2.6A6.4 6.4 0 0 1 9 15.4"/><path d="M14.24 5.33A6.4 6.4 0 0 1 14.24 12.67" strokeWidth="3.2"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/></>};
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
 {label:'Rings, disks and arcs',ids:['ring','disk','annulus','arc','uneven-arc']},
 {label:'Charge with no end',ids:['infinite','semi','sheet']},
 {label:'The same shapes, as potential',ids:['v-ring','v-disk','v-arc','v-rod-bisector','v-rod-axial']}];
/** Group a set of lessons into the families above, keeping each family's stated order and
 *  dropping families nothing landed in. Anything the table has not heard of still appears, in
 *  a trailing group of its own: a new geometry must never go missing because this list is stale. */
export function families(list:Problem[]){const rest=new Set(list.map(p=>p.id));
 const groups=FAMILIES.map(f=>({label:f.label,items:f.ids.flatMap(id=>{const p=list.find(x=>x.id===id);if(!p)return[];rest.delete(id);return[p]})})).filter(g=>g.items.length>0);
 const extra=list.filter(p=>rest.has(p.id));
 return extra.length>0?[...groups,{label:'More geometries',items:extra}]:groups}
/** GAUSS'S LAW (docs/gauss-law-plan.md): the other half of the unit, shown as a family of its own wherever the
 *  lessons are offered. Its planned lessons are named here, in teaching order; the ones built and switched on
 *  (GAUSS_READY in problems/readiness.ts, the lessons in src/gauss) are links to `?g=<key>`, and the rest stay
 *  words marked "Coming soon", never links and never a stop for Tab. They are not Problems, so they have no
 *  ProblemId; the family is drawn by src/gauss/GaussFamily.tsx for the list, the library and the home page. */
export type PlannedLesson={key:string;name:string;about:string};
export const GAUSS:{key:'gauss';label:string;note:string;lessons:PlannedLesson[]}={key:'gauss',label:'Gauss’s law',
 note:'The shortcut, where symmetry already gives the field’s direction: one closed surface instead of the whole integral.',
 lessons:[
  {key:'symmetry',name:'Symmetry first',about:'Why a sphere’s, a line’s and a plane’s fields must point straight out or straight in, before any calculation.'},
  {key:'flux',name:'Flux, the idea',about:'A field through a tilted patch, then through any closed surface round a point charge.'},
  {key:'inside',name:'Why only the charge inside',about:'A sphere, then any shape, then a charge outside, then many charges at once.'},
  {key:'qenc',name:'Q_enc from a density',about:'The ratio method for uniform charge, thin shells for charge that varies.'},
  {key:'spheres',name:'Spheres',about:'No field inside a shell, a field that grows inside a ball, a point charge’s outside both.'},
  {key:'lines',name:'Lines and cylinders',about:'A cylinder round a line or a thick rod, checked against the integral you built.'},
  {key:'sheets',name:'Sheets and slabs',about:'A pillbox through a sheet or a thick slab, and why the distance drops out.'},
  {key:'conductors',name:'Conductors',about:'No field inside the metal, charge on its surface, and cavities that hold charge.'},
  {key:'holes',name:'Holes by superposition',about:'A hole as a positive object plus a negative one, each solved by Gauss’s law.'},
  {key:'runs-out',name:'When symmetry runs out',about:'The finite rod: Gauss’s law still holds, but no surface makes it solvable, so you build the integral.'},
  {key:'hard',name:'The hard cases',about:'Charge out to infinity, densities that blow up, and running Gauss’s law backwards.'}]};
/** The planned lessons' shapes, drawn as the lessons' are: the charge in ink, the closed surface dashed. */
const PLANNED_GLYPHS:Record<string,React.ReactNode>={
 symmetry:<><circle cx="9" cy="9" r="3.2" fill="currentColor" fillOpacity=".28"/><path d="M9 1.4v15.2" strokeDasharray="2 2"/><path d="M13.6 9h3M1.4 9h3M12.3 5.7l2.1-2.1M3.6 14.4l2.1-2.1"/></>,
 flux:<><path d="M6 4.2 12 2v11.8L6 16Z"/><path d="M1.6 9h14.6M14.2 7l2 2-2 2"/></>,
 inside:<><path d="M2.6 9.4c0-3.6 2.4-6 5.6-6 3.4 0 5.4 2.2 5.4 5.4 0 3.4-2.4 5.8-5.6 5.8-3 0-5.4-1.8-5.4-5.2Z" strokeDasharray="2 2"/><circle cx="8" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.6" cy="3.4" r="1.3" fill="currentColor" stroke="none"/></>,
 qenc:<><circle cx="9" cy="9" r="7" fill="currentColor" fillOpacity=".28"/><circle cx="9" cy="9" r="4" strokeDasharray="1.8 1.8"/></>,
 spheres:<><circle cx="9" cy="9" r="4.4"/><circle cx="9" cy="9" r="7.2" strokeDasharray="2 2.2"/></>,
 lines:<><path d="M9 1.6v14.8"/><ellipse cx="9" cy="4.6" rx="4.6" ry="1.6" strokeDasharray="2 2"/><ellipse cx="9" cy="13.4" rx="4.6" ry="1.6" strokeDasharray="2 2"/><path d="M4.4 4.6v8.8M13.6 4.6v8.8" strokeDasharray="2 2"/></>,
 sheets:<><path d="M1.8 12.4 6.6 6.6h9.6l-4.8 5.8Z"/><rect x="7" y="4.4" width="4" height="8.6" rx="1" strokeDasharray="2 1.8"/></>,
 conductors:<path d="M9 2.4a6.6 6.6 0 1 0 0 13.2a6.6 6.6 0 1 0 0-13.2Zm0 3.8a2.8 2.8 0 1 1 0 5.6a2.8 2.8 0 1 1 0-5.6Z" fill="currentColor" fillOpacity=".28" fillRule="evenodd"/>,
 holes:<><circle cx="9" cy="9" r="6.8" fill="currentColor" fillOpacity=".28"/><circle cx="11.2" cy="7.6" r="2.4"/></>,
 'runs-out':<><path d="M9 4v10M6.6 4h4.8M6.6 14h4.8"/><circle cx="9" cy="9" r="7.2" strokeDasharray="2 2.2"/></>,
 hard:<><circle cx="9" cy="9" r="7.2" strokeDasharray="2 2.2"/><circle cx="9" cy="9" r="4.2"/><circle cx="9" cy="9" r="1.6" fill="currentColor" stroke="none"/></>};
export function PlannedGlyph({id,size=18}:{id:string;size?:number}){return <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-glyph={`gauss-${id}`}>{PLANNED_GLYPHS[id]}</svg>}
/** A planned lesson's name as it is set: "Q_enc" with its subscript, read aloud as "Q enc". */
export function plannedName(name:string):React.ReactNode{const at=name.indexOf('Q_enc');return at<0?name:<>{name.slice(0,at)}Q<sub>enc</sub>{name.slice(at+5)}</>}
