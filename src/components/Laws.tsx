'use client';
import {useId,useRef,useState,type RefObject} from 'react';
import {BookOpen,ChevronDown} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {MathText} from './Math';
import {hold} from '../problems/prose';
import './laws.css';
/** The three statements every lesson in this app rests on, and the relation that gives each piece its
 * charge. They are stated once, here, and rendered wherever a student asks — the tour on first run, a
 * lesson page later — so there is
 * exactly one account of the physics rather than a second one written for the reference panel.
 * `why` answers "what is this doing for me here" and is always visible; `detail` and `more`
 * answer "what does it actually say" and appear only when the row is opened. Nothing is marked,
 * nothing is asked: this is a place to look something up. */
// A piece is not always a point. The disk and the sheet are cut into rings, whose every bit is the same
// distance from P; the endless lines into equal angles, the outermost of which never ends. Saying
// every lesson starts from "one piece small enough to count as a point" was the old claim the run
// itself now contradicts ("a ring is not a point charge").
//
// Nor does every lesson start from Coulomb's field. The five potential lessons start from V = kQ/r,
// the third row of this same page, and "every derivation starts by applying it" told their reader
// that the law they were using was not the one their lesson began with.
//
// One move to a sentence. Those two corrections had been folded into one sentence of seventy-five
// words, two semicolons and two asides, which a projector's back row cannot parse; the tour opens
// this page, so it is the first paragraph many readers meet.
//
// "Small enough" was not true either. The endless lines are cut at equal angles, and the outermost
// piece never ends: what makes it a point is how thin it looks from P, which is what the run says
// ("Made thin enough in angle, each piece makes the field at P that a point charge would"). And
// Coulomb's law is the only field law the lessons BUILD from, not the only one in the app: the sheet's
// sources include Gauss's law and a charged plane.
export const LAWS_LEDE='Every lesson makes the same three moves. Cut the charge into pieces, each thin enough, seen from P, to count as a point, or a ring whose every bit is the same distance from P. A point charge’s law gives each piece its field (on the potential lessons, its potential), and superposition adds the pieces. Shrinking them turns the sum into an integral. Only the geometry changes.';
type Law={id:string;name:string;tex:string;why:string;detail:string;more:string[]};
// THE LAWS' PROSE IS HELD AS THE LESSONS' IS (prose.ts), and so is the lede where it is shown. At a
// phone's width "V" ended one line and "= kQ/r." began the next, on the tour's page and in the dialog.
const LAWS:Law[]=([
 {id:'coulomb',name:'Coulomb’s law',tex:String.raw`\mathbf E=\frac{kQ}{r^{2}}\,\hat{\mathbf r}`,
  why:'The only field law the lessons build from. Every field lesson starts by applying it to pieces of the charge: a bit thin enough, seen from P, to count as a point, or a ring whose every bit is the same distance from P. The potential lessons start from its scalar partner, V = kQ/r.',
  detail:'A point charge Q fills the space around it with a field that falls off as the inverse square of the distance. The unit vector points from the charge out to the place you are asking about, so the field points away from a positive Q and back toward a negative one. Coulomb measured the force between two charges; dividing by the charge you would put at that place leaves the field, which depends on the source alone.',
  more:[String.raw`\mathbf F=\frac{k\,q_{1}q_{2}}{r^{2}}\,\hat{\mathbf r}`,String.raw`k=\frac{1}{4\pi\varepsilon_{0}}`]},
 {id:'superposition',name:'Superposition',tex:String.raw`\mathbf E\approx\sum_{i}\Delta\mathbf E_{i}\quad\longrightarrow\quad\mathbf E=\int d\mathbf E`,
  why:'The permission to add. It is what lets a rod be treated as a row of points, and it is why an integral, a sum of infinitely many small contributions, is the right tool. The sum is only ≈ because each piece’s field is taken to be a point charge’s; the adding itself is exact.',
  detail:'Each charge sets up its own field as though the others were not there, and at every point those fields add as vectors. In electrostatics this is exact, not an approximation. So cut the distribution into N pieces and add the N contributions: that is nearly the field, since each piece is treated as a point charge. Then let N grow while each piece shrinks: the ≈ becomes =, the sum becomes an integral, and that integral is the one each lesson builds.',
  more:[String.raw`\Delta Q\to dQ\quad\text{as}\quad N\to\infty`]},
 {id:'potential',name:'Potential of a point charge',tex:String.raw`V=\frac{kQ}{r}`,
  why:'What the potential lessons add up. One number at each place instead of a vector, so the pieces add as plain numbers with no components to resolve.',
  detail:'The same point charge also sets a potential, measured from zero infinitely far away. It falls off as one over r, a power slower than the field, and carries the sign of Q rather than a direction. Because potential is a scalar, superposition here is ordinary addition. The field can be recovered afterwards by differentiating: it is the negative gradient of V, which on a symmetry axis, where E has only its part along the axis, is a single derivative.',
  more:[String.raw`V=\int\frac{k\,dQ}{r_{i}}`,String.raw`\mathbf E=-\nabla V\qquad E_{z}=-\frac{dV}{dz}`]},
 // THE RELATION STUDENTS NEED MOST THAT WEEK. Every lesson's first step is a piece's charge -- λ Δy, λR Δθ,
 // σ 2πs Δs, λ₀(y/L) Δy -- and that is where a class loses the most marks: Q dy, λ dθ, πs² ds, the very
 // slips "Easy to confuse with" diagnoses. The page a student is sent to look things up in had no row for it.
 {id:'density',name:'Charge density',tex:String.raw`dQ=\lambda\,d\ell=\sigma\,dA`,
  why:'What turns a piece’s size into its charge. λ is charge per unit length and σ charge per unit area; each is the same everywhere only where the lesson says the charge is uniform.',
  detail:'A piece’s charge is the density times the piece’s own length or area, measured in the variable the charge is cut by. A rod cut along y gives pieces dy long. A ring or an arc cut by angle gives pieces R dθ long: an angle is not a length. A disk cut into rings gives rings of area 2πs ds: circumference times width, growing with the radius. A spherical band has circumference 2πR sin θ and width R dθ. Where the density changes, as on the ramp or uneven semicircle, it is read at the piece’s own place.',
  more:[String.raw`d\ell=dy\qquad d\ell=R\,d\theta\qquad dA=2\pi s\,ds`,String.raw`dA=2\pi R^2\sin\theta\,d\theta`,String.raw`\lambda(y)=\lambda_{0}\,\frac{y}{L}\qquad\lambda(\theta)=\lambda_0\cos\theta`]}] as Law[]).map(l=>({...l,why:hold(l.why),detail:hold(l.detail)}));
/** The scalar law leads on a potential lesson, because that is the one being used there. */
/** Each law's name as it reads inside a sentence. */
const IN_PROSE:Record<string,string>={coulomb:'Coulomb’s law',superposition:'superposition',potential:'a point charge’s potential',density:'charge density'};
function ordered(quantity:'E'|'V'){return quantity==='V'?[LAWS[2],LAWS[1],LAWS[0],LAWS[3]]:LAWS}
/** `only` keeps the named rows, in their usual order, and says where the rest are. The tour's page is
 * titled "Start from Coulomb's law" and its sentence names superposition: shown all four rows, a laptop
 * and a phone saw those two and nothing said the potential and the density sat below the fold of a
 * dialog. The tour shows the two it names; the other two are a click away on every lesson. */
export function Laws({quantity='E',lede=true,only}:{quantity?:'E'|'V';lede?:boolean;only?:string[]}){
 const [open,setOpen]=useState('');const uid=useId();
 const rows=ordered(quantity).filter(l=>!only||only.includes(l.id)),rest=only?LAWS.filter(l=>!only.includes(l.id)):[];
 return <div className="laws">{lede&&<p className="laws-lede">{hold(LAWS_LEDE)}</p>}
  {/* Above the rows, not under them: under them it was the line below the fold. */}
  {rest.length>0&&<p className="laws-more">{`${rest.length===1?'One more':rest.length===2?'Two more':'More'}, ${rest.map(l=>IN_PROSE[l.id]).join(' and ')}, ${rest.length===1?'is':'are'} under “The laws behind every lesson”, in the ⋯ menu at the top of each lesson.`}</p>}
  <ul className="laws-list">{rows.map(l=>{const shown=open===l.id;return <li className="law" key={l.id} data-open={shown}>
   <button type="button" onClick={()=>setOpen(shown?'':l.id)} aria-expanded={shown} aria-controls={shown?`${uid}-${l.id}`:undefined}>
    <span className="law-name">{l.name}</span><ChevronDown size={15} aria-hidden="true"/>
    {/* In display style: set inline, kQ over r² was a text-style fraction, its numerator at twelve
        pixels and r² under nine, so the law everything rests on was the smallest maths on its page. */}
    <MathText className="law-tex" tex={String.raw`\displaystyle `+l.tex}/><span className="law-why">{l.why}</span></button>
   {shown&&<div className="law-detail" id={`${uid}-${l.id}`}><p>{l.detail}</p>{l.more.map(tex=><MathText key={tex} tex={tex} block/>)}</div>}
  </li>})}</ul></div>;
}
export function LawsDialog({open,onOpenChange,quantity='E',returnFocus}:{open:boolean;onOpenChange:(value:boolean)=>void;quantity?:'E'|'V';returnFocus?:RefObject<HTMLElement|null>}){
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="laws-dialog" finalFocus={returnFocus}>
  <DialogTitle className="laws-title">The laws behind every lesson</DialogTitle>
  <DialogDescription className="laws-lede">{hold(LAWS_LEDE)}</DialogDescription>
  <Laws quantity={quantity} lede={false}/></DialogContent></Dialog>;
}
/** The whole second entry point in one element: a quiet trigger that owns its dialog and hands
 * focus back to itself on close. Drop it anywhere a student might have a question about a law. */
export function LawsReference({quantity='E',label='The laws behind this',className='text-button'}:{quantity?:'E'|'V';label?:string;className?:string}){
 const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);
 return <><button ref={trigger} type="button" className={className} onClick={()=>setOpen(true)}><BookOpen size={15}/>{label}</button>
  <LawsDialog open={open} onOpenChange={setOpen} quantity={quantity} returnFocus={trigger}/></>;
}
