'use client';
import {useId,useRef,useState,type RefObject} from 'react';
import {BookOpen,ChevronDown} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {MathText} from './Math';
import './laws.css';
/** The three statements every lesson in this app rests on. They are stated once, here, and
 * rendered wherever a student asks — the tour on first run, a lesson page later — so there is
 * exactly one account of the physics rather than a second one written for the reference panel.
 * `why` answers "what is this doing for me here" and is always visible; `detail` and `more`
 * answer "what does it actually say" and appear only when the row is opened. Nothing is marked,
 * nothing is asked: this is a place to look something up. */
export const LAWS_LEDE='Every lesson here is the same three moves: one piece of charge, small enough to count as a point, obeys Coulomb’s law; superposition says the pieces add; shrinking the pieces turns that sum into an integral. Only the geometry changes.';
type Law={id:string;name:string;tex:string;why:string;detail:string;more:string[]};
const LAWS:Law[]=[
 {id:'coulomb',name:'Coulomb’s law',tex:String.raw`\mathbf E=\frac{kQ}{r^{2}}\,\hat{\mathbf r}`,
  why:'The only field law in the app. Every derivation starts by applying it to one piece of charge small enough to count as a point.',
  detail:'A point charge Q fills the space around it with a field that falls off as the inverse square of the distance. The unit vector points from the charge out to the place you are asking about, so the field points away from a positive Q and back toward a negative one. Coulomb measured the force between two charges; dividing by the charge you would put at that place leaves the field, which depends on the source alone.',
  more:[String.raw`\mathbf F=\frac{k\,q_{1}q_{2}}{r^{2}}\,\hat{\mathbf r}`,String.raw`k=\frac{1}{4\pi\varepsilon_{0}}\approx8.99\times10^{9}\ \mathrm{N\,m^{2}/C^{2}}`]},
 {id:'superposition',name:'Superposition',tex:String.raw`\mathbf E=\sum_{i}\Delta\mathbf E_{i}\quad\longrightarrow\quad\mathbf E=\int d\mathbf E`,
  why:'The permission to add. It is what lets a rod be treated as a row of points, and it is why an integral — a sum of infinitely many small contributions — is the right tool.',
  detail:'Each charge sets up its own field as though the others were not there, and at every point those fields add as vectors. In electrostatics this is exact, not an approximation. So cut the distribution into N pieces, add the N contributions, then let N grow while each piece shrinks: the sum becomes an integral, and that integral is the one each lesson builds.',
  more:[String.raw`\Delta Q\to dQ\quad\text{as}\quad N\to\infty`]},
 {id:'potential',name:'Potential of a point charge',tex:String.raw`V=\frac{kQ}{r}`,
  why:'What the potential lessons add up. One number at each place instead of a vector, so the pieces add as plain numbers with no components to resolve.',
  detail:'The same point charge also sets a potential, measured from zero infinitely far away. It falls off as one over r — a power slower than the field — and carries the sign of Q rather than a direction. Because potential is a scalar, superposition here is ordinary addition. The field can be recovered afterwards by differentiating: it is the negative gradient of V, which along an axis is a single derivative.',
  more:[String.raw`V=\int\frac{k\,dQ}{r_{i}}`,String.raw`\mathbf E=-\nabla V\qquad E_{z}=-\frac{dV}{dz}`]}];
/** The scalar law leads on a potential lesson, because that is the one being used there. */
function ordered(quantity:'E'|'V'){return quantity==='V'?[LAWS[2],LAWS[1],LAWS[0]]:LAWS}
export function Laws({quantity='E',lede=true}:{quantity?:'E'|'V';lede?:boolean}){
 const [open,setOpen]=useState('');const uid=useId();
 return <div className="laws">{lede&&<p className="laws-lede">{LAWS_LEDE}</p>}
  <ul className="laws-list">{ordered(quantity).map(l=>{const shown=open===l.id;return <li className="law" key={l.id} data-open={shown}>
   <button type="button" onClick={()=>setOpen(shown?'':l.id)} aria-expanded={shown} aria-controls={`${uid}-${l.id}`}>
    <span className="law-name">{l.name}</span><ChevronDown size={15} aria-hidden="true"/>
    <MathText className="law-tex" tex={l.tex}/><span className="law-why">{l.why}</span></button>
   {shown&&<div className="law-detail" id={`${uid}-${l.id}`}><p>{l.detail}</p>{l.more.map(tex=><MathText key={tex} tex={tex} block/>)}</div>}
  </li>})}</ul></div>;
}
export function LawsDialog({open,onOpenChange,quantity='E',returnFocus}:{open:boolean;onOpenChange:(value:boolean)=>void;quantity?:'E'|'V';returnFocus?:RefObject<HTMLElement|null>}){
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="laws-dialog" finalFocus={returnFocus}>
  <DialogTitle className="laws-title">The laws behind every lesson</DialogTitle>
  <DialogDescription className="laws-lede">{LAWS_LEDE}</DialogDescription>
  <Laws quantity={quantity} lede={false}/></DialogContent></Dialog>;
}
/** The whole second entry point in one element: a quiet trigger that owns its dialog and hands
 * focus back to itself on close. Drop it anywhere a student might have a question about a law. */
export function LawsReference({quantity='E',label='The laws behind this',className='text-button'}:{quantity?:'E'|'V';label?:string;className?:string}){
 const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);
 return <><button ref={trigger} type="button" className={className} onClick={()=>setOpen(true)}><BookOpen size={15}/>{label}</button>
  <LawsDialog open={open} onOpenChange={setOpen} quantity={quantity} returnFocus={trigger}/></>;
}
