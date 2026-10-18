'use client';
import {useId,useRef,useState,type RefObject} from 'react';
import {BookOpen,ChevronDown} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {MathText} from './Math';
import {hold} from '../problems/prose';
import './laws.css';
/** One shared reference for the integral and Gauss workflows. A piece's physical field can be
 * integrated exactly or approximated by a representative point charge; superposition itself never
 * becomes approximate. Equal-distance scalar sums and the ring's axial sum are exact even at coarse
 * cuts. For an unbounded outer interval only its angular width shrinks: the representative charge
 * remains finite while the actual interval and its charge are unbounded. These distinctions must
 * agree with the board, the run and the individual lessons rather than teaching a second model here. */
export const LAWS_LEDE='The integral lessons cut charge into pieces and add their fields or potentials. Coulomb’s law or its potential gives each contribution. Superposition adds them, and refining an approximate sum gives an integral. Gauss’s law relates flux through a closed surface to enclosed charge. Its lessons use symmetry when that permits a direct field calculation.';
type Law={id:string;name:string;tex:string;why:string;detail:string;check?:string;more:string[]};
// THE LAWS' PROSE IS HELD AS THE LESSONS' IS (prose.ts), and so is the lede where it is shown. At a
// phone's width "V" ended one line and "= kQ/r." began the next, on the tour's page and in the dialog.
const LAWS:Law[]=([
 {id:'coulomb',name:'Coulomb’s law',tex:String.raw`\mathbf E=\frac{kQ}{r^{2}}\,\hat{\mathbf r}`,
  why:'The starting point for the integral field lessons. Integrate point-charge contributions over each piece, or approximate them with a representative point charge. The potential lessons use its scalar partner, V = kQ/r; Gauss’s law provides another route to the field.',
  detail:'A point charge Q fills the space around it with a field whose magnitude falls off as the inverse square of the distance. The unit vector points from the charge out to the place you are asking about, so the field points away from a positive Q and back toward a negative one. Coulomb measured the force between two charges; dividing by the charge you would put at that place leaves the field, which depends on the source alone.',
  more:[String.raw`\mathbf F=\frac{k\,q_{1}q_{2}}{r^{2}}\,\hat{\mathbf r}`,String.raw`k=\frac{1}{4\pi\varepsilon_{0}}`]},
 {id:'superposition',name:'Superposition',tex:String.raw`\mathbf E\approx\sum_{i}\Delta\mathbf E_{i}\quad\longrightarrow\quad\mathbf E=\int d\mathbf E`,
  why:'The permission to add fields as vectors and potentials as numbers. Adding is exact. The ≈ appears when a piece’s contribution is approximated by a representative point charge; refining the partition gives the integral.',
  detail:'Each specified charge contributes its own field, and those fields add as vectors. The ring’s axial field and the ring or arc’s potential are exact at any cut: the relevant distance and projection are constant. Other representative sums approach an integral as the partition is refined. For an endless line or sheet, the outer interval remains unbounded even as its angular width shrinks. Its finite representative charge approximates its contribution; it is not the interval’s actual charge.',
  more:[String.raw`\Delta Q\to dQ\quad\text{as}\quad N\to\infty`]},
 {id:'potential',name:'Potential of a point charge',tex:String.raw`V=\frac{kQ}{r}`,
  why:'What the potential lessons add up: potential energy per unit test charge, measured in volts (joules per coulomb). It is a scalar, so the pieces add as numbers with no components to resolve.',
  detail:'The same point charge also sets a potential, measured from zero infinitely far away. Its magnitude falls off as one over r, a power slower than the field magnitude. V carries the sign of Q rather than a direction. Because potential is a scalar, superposition here is ordinary addition. The field can be recovered afterwards by differentiating: it is the negative gradient of V, which on a symmetry axis, where E has only its part along the axis, is a single derivative.',
  more:[String.raw`V=\int\frac{k\,dQ}{r_{i}}`,String.raw`\mathbf E=-\nabla V\qquad E_{z}=-\frac{dV}{dz}`]},
 // THE RELATION STUDENTS NEED MOST THAT WEEK. Every lesson's first step is a piece's charge -- λ Δy, λR Δθ,
 // σ 2πs Δs, λ₀(y/L) Δy -- and that is where a class loses the most marks: Q dy, λ dθ, πs² ds, the very
 // slips "Easy to confuse with" diagnoses. The page a student is sent to look things up in had no row for it.
 // AND EVERY ELEMENT THE LESSONS USE. The spherical shell's band, 2πR² sin θ dθ, the hardest element on the
 // site, and the semicircle's cosine density came after the row was written and were missing from it: the row
 // now lists each piece the lessons cut, lengths on one line, areas on the next, the changing densities last.
 {id:'density',name:'Charge density',tex:String.raw`dQ=\lambda\,d\ell=\sigma\,dA`,
  why:'What turns a piece’s size into its charge. λ is charge per unit length and σ charge per unit area; each is the same everywhere only where the lesson says the charge is uniform.',
  detail:'A piece’s charge is the density times the piece’s own length or area, measured in the variable the charge is cut by. A rod cut along y gives pieces dy long. A ring or an arc cut by angle gives pieces R dθ long: an angle is not a length. A disk cut into rings gives rings of area 2πs ds: circumference times width, growing with the radius. A spherical shell cut into rings by the angle θ from its axis gives bands 2πR sin θ round and R dθ wide, of area 2πR² sin θ dθ. Where the density changes along the charge, as on the ramp and the uneven semicircle, it is read at the piece’s own place.',
  check:'For a finite source, check the charge element by integrating it over the whole source: the result must be Q. On the ramp, weight each length by its local density. The result is half the endpoint density times L, and fixes λ₀ if Q was given.',
  more:[String.raw`d\ell=dy\qquad d\ell=R\,d\theta`,String.raw`dA=2\pi s\,ds\qquad dA=2\pi R^2\sin\theta\,d\theta`,String.raw`\lambda(y)=\lambda_{0}\,\frac{y}{L}\qquad\lambda(\theta)=\lambda_{0}\cos\theta`,String.raw`Q=\int_{\text{source}}dQ`,String.raw`Q=\int_0^L\lambda_0\,\frac{y}{L}\,dy=\frac{\lambda_0L}{2}`]}] as Law[]).map(l=>({...l,why:hold(l.why),detail:hold(l.detail),check:l.check?hold(l.check):undefined}));
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
   {shown&&<div className="law-detail" id={`${uid}-${l.id}`}><p>{l.detail}</p>{l.check&&<p>{l.check}</p>}{l.more.map(tex=><MathText key={tex} tex={tex} block/>)}</div>}
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
