import type {Limit,Params,Problem,ProblemId} from '../problems/types';
import {REGISTRY} from '../distributions';
export {EPS0,K,type Vec} from '../distributions/constants';
import {K,EPS0,type Vec} from '../distributions/constants';
import {annulusRadii,HOLE_MAX} from '../distributions/disk';
import {offsetEnds} from '../distributions/offset';
/** The thin annulus's sweep: its width b − a, as a share of b, at sweep position t ∈ [1, 30]: the whole disk at the
 * start, about a hundred and sixtieth of the rim at the end, swept on a log axis. */
export const thinGap=(t:number)=>Math.pow(t,-1.5);
import {shellRings} from '../distributions/shell';
// Finite distributions use total Q in nC; infinite lines use λ in nC/m;
// semi-infinite lines use λ in nC/m; an infinite sheet uses σ in nC/m². Distance and geometry are in metres.
// The per-geometry closed forms and point-charge sums live in src/distributions/.
export function field(id:ProblemId,p:Params):Vec {return REGISTRY[id].field(p);}
/** Closed-form potential at P in volts. Only the geometries with a potential problem define one. */
export function potential(id:ProblemId,p:Params):number {const v=REGISTRY[id].potential?.(p);if(v===undefined)throw Error(`${id} has no potential closed form.`);return v;}
export function magnitude(v:Vec){return Math.hypot(v.x,v.y,v.z);}
export function pretty(n:number){if(!Number.isFinite(n))return '–';return Math.abs(n)<.001&&n!==0?n.toExponential(2):n.toLocaleString('en-US',{maximumSignificantDigits:4});}
export function numerical(id:ProblemId,p:Params,n=12000):Vec {if(!Number.isFinite(n)||n<1)throw Error('Use a positive number of integration samples.');return REGISTRY[id].quadrature(p,Math.floor(n));}
/** How a limiting case is drawn.
 *  · `ratio`: the exact value divided by the limit's reference. It settles onto the dashed line at
 *    one as the limit is approached, which shows convergence where two curves would sit on top of
 *    each other -- and it stays readable when the reference itself diverges.
 *  · `constant`: the same ratio for a case whose whole point is that it never moves. The exact side
 *    is computed independently of any closed form (a point-charge sum), so a flat line is evidence,
 *    not a formula plotted against itself.
 *  · `decay`: the reference is zero, so the exact value is drawn scaled to its largest and falls to
 *    the axis.
 *  · `peak`: the exact value over its analytic maximum, which it touches once.
 *  · `growth`: a potential with no limit at all. The exact value and its growth law are drawn
 *    themselves, as two curves, each divided by the same constant (the larger of their two end
 *    values), so both climb the plot together. A ratio would fall and settle at one, and a curve
 *    that settles reads as V levelling off -- the opposite of what the case is about.
 *  · `law`: a field whose case is how it scales. Drawn like `growth`, the exact value and the law
 *    themselves on one shared scale, here falling together. THE INFINITE LINE'S "DOUBLE r AND E
 *    HALVES" WAS A FLAT LINE: its ratio to 2kλ/r, the same horizontal line on a dashed line as the
 *    sheet's "the field does not change". Two opposite scalings in one picture, on the two lessons
 *    whose whole contrast is that scaling, and the halving the title promises was divided out
 *    before it was drawn. Now the field itself falls on its law, with a point charge's fall (`second`)
 *    from the same start beside it, steeper. */
export type LimitKind='ratio'|'constant'|'decay'|'peak'|'growth'|'law';
/** One point on a limit's plot. `actual` and `target` are magnitudes (for the semi-infinite line's
 * direction, its two component magnitudes), so a negative charge never mirrors a curve below the
 * axis. `vector` is the field at P for that point, sign included: the thumbnail draws it.
 * `second` is the field's magnitude where a potential's case is drawn beside it: the arc closing on
 * its centre, where E vanishes and V does not, is only shown by drawing both. On the infinite line's
 * `law` case it is a point charge's field from the same start, the steeper fall the line never takes. */
export type LimitSample={actual:number;target:number;vector?:Vec;second?:number};
const sum=(samples:{field:Vec}[]):Vec=>samples.reduce((s,x)=>({x:s.x+x.field.x,y:s.y+x.field.y,z:s.z+x.field.z}),{x:0,y:0,z:0});
/** The arc's potential at its centre as a sum over point charges, not the closed form kQ/R. */
const arcPotentialSum=(p:Params)=>REGISTRY.arc.sample(p,60).reduce((s,x)=>s+x.potential,0);
/** The ring's peak sweep: P's height at position t ∈ [1, 30], from the centre out to 3R. */
/** The shell's field at P as its rings add it up, finely enough to be the integral: see the shell's cases below. */
const ringSum=(p:Params,n=4000):Vec=>sum(shellRings(p.size/2,p.charge*1e-9,p.distance,n));
const ringPeakZ=(R:number,t:number)=>3*R*(t-1)/29;
/** Where z = R/√2 and z = R fall on that sweep, for the plot's landmarks. */
export const RING_PEAK_T=1+29/(3*Math.SQRT2),RING_EDGE_T=1+29/3;
/** How many point charges the half ring is built from at sweep position t: one, two, … thirty. */
export const halfPieces=(t:number)=>Math.max(1,Math.round(t));
/** One point on the limiting-case comparison plot, at sweep position t ∈ [1, 30]. Densities are
 * derived from the student's own geometry: a 2 nC rod 4 m long carries λ = 0.5 nC/m, not 2 nC/m,
 * and a 2 nC disk of radius 2 m carries σ = Q/(πR²), not 2 nC/m². Only the infinite-line and
 * sheet problems expose a density on their charge slider directly. */
export function sampleLimit(problem:Problem,p:Params,limit:Limit,t:number):LimitSample{
 const copy={...p},geom=problem.geometry,scalar=problem.quantity==='V',q=Math.abs(REGISTRY[geom].total?.(p)??p.charge*1e-9),R=p.size/2;
 let actual=0,target=0,vector:Vec|undefined,second:number|undefined;
 const fieldOf=(id:ProblemId,c:Params)=>{vector=field(id,c);return magnitude(vector);};
 switch(limit.mode){
  case 'far':{copy.distance=t*p.size;
   // The rod on its own axis is placed by its near end, a. Its charge is centred L/2 further off,
   // and measured from there the point-charge form is off by a term of order (L/a)², not L/a.
   // The rod off its bisector is counted from its middle too, a height h below P: d = √(r² + h²).
   const d=geom==='axial'?copy.distance+p.size/2:geom==='offset'?Math.hypot(copy.distance,offsetEnds(copy).h):copy.distance;
   if(scalar){actual=Math.abs(potential(geom,copy));target=K*q/d;}else{actual=fieldOf(geom,copy);target=K*q/d**2;}break;}
  // The vertical far field, along the rod, is a first moment: −kQ y_c/r³ with y_c the centre of
  // charge. Only the ramp uses it, and its y_c is 2L/3. ("Transverse" named it once, which beside a
  // rod reads as across the rod -- E_x, the other component.)
  case 'moment':{copy.distance=t*p.size;const e=field(geom,copy);vector={x:0,y:e.y,z:0};actual=Math.abs(e.y);target=K*q*(2*p.size/3)/copy.distance**3;break;}
  // The annulus's rim run out at its own σ and its own hole, the reference the sheet with that hole, σ/(2ε₀) · z/√(a² + z²).
  // The curve is 1 − √(a² + z²)/√(b² + z²) of its line, so it settles only once the rim is far past the hole's edge as
  // seen from P, b ≫ √(a² + z²): it is swept as b = a + t√(a² + z²). Swept as a + t z, a wide hole over a low P ended a
  // fifth short of its line.
  case 'infinite':if(geom==='annulus'){const {a,b}=annulusRadii(p),sigma=p.charge/(Math.PI*(b*b-a*a)),grown=a+t*Math.hypot(a,p.distance);copy.size=2*grown;copy.inner=a;copy.charge=sigma*Math.PI*(grown*grown-a*a);actual=fieldOf('annulus',copy);target=Math.abs(sigma)*1e-9/(2*EPS0)*Math.abs(p.distance)/Math.hypot(p.distance,a);}
   else if(scalar&&geom==='disk'){const sigma=p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=Math.abs(potential('disk',copy));target=Math.abs(sigma)*1e-9*(copy.size/2)/(2*EPS0);}
   else if(scalar){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=Math.abs(potential('bisector',copy));target=2*K*Math.abs(lambda)*1e-9*Math.log(Math.max(copy.size/p.distance,1));}
   // The rod off its bisector grown at its own λ and its own h, both ends running off: L = 2|h| + tr keeps P the same
   // height above the middle all the way, and the reference is the endless line's 2kλ/r, straight along x.
   else if(geom==='offset'){const lambda=p.charge/p.size,h=offsetEnds(p).h;copy.size=2*Math.abs(h)+t*p.distance;copy.height=h;copy.charge=lambda*copy.size;actual=fieldOf('offset',copy);target=2*K*Math.abs(lambda)*1e-9/p.distance;}
   else if(geom==='bisector'||geom==='infinite'){const lambda=geom==='infinite'?p.charge:p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=fieldOf('bisector',copy);target=2*K*Math.abs(lambda)*1e-9/p.distance;}
   // The half line's own case is the same rod grown from its end, read from the line's side: its charge
   // slider is λ itself, as the infinite line's is, and the rod beside P carries that λ.
   else if(geom==='endpoint'||geom==='semi'){const lambda=geom==='semi'?p.charge:p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=fieldOf('endpoint',copy);target=Math.SQRT2*K*Math.abs(lambda)*1e-9/p.distance;}
   else{const sigma=geom==='sheet'?p.charge:p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=fieldOf('disk',copy);target=Math.abs(sigma)*1e-9/(2*EPS0);}
   break;
  // The field is swept down from its peak at R/√2, so the curve only falls: started beyond the peak
  // it first climbed, under a caption that said it fell. The potential has no peak to start from.
  case 'center':if(scalar){copy.distance=R*(1-t/30);actual=Math.abs(potential(geom,copy));target=geom==='disk'?2*K*q/R:K*q/R;}
   else{copy.distance=R/Math.SQRT2*(1-(t-1)/29);actual=fieldOf('ring',copy);target=0;}break;
  // P walking onto the rod's end, a = L/t. The potential against its logarithm; the field against
  // kλ/a, a semi-infinite line's on its own axis, which the rod's kλ(1/a − 1/(L + a)) approaches.
  case 'near':copy.distance=p.size/t;if(scalar){actual=Math.abs(potential('axial',copy));target=K*Math.abs(p.charge/p.size)*1e-9*Math.log(Math.max(p.size/copy.distance,1));}
   else{actual=fieldOf('axial',copy);target=K*Math.abs(p.charge/p.size)*1e-9/copy.distance;}break;
  // From the centre, z = 0, out to 3R. It used to start at R/10, where the field is already a
  // quarter of its peak, under the label "the centre" -- beside a tab that says it is zero there.
  // The annulus's hole closing at its own σ, from the widest the slider allows, HOLE_MAX of the rim, down to nothing: against the disk of
  // the same rim and the same σ, which is what the annulus is once the hole is gone.
  case 'hole':{const {a,b}=annulusRadii(p),sigma=p.charge/(Math.PI*(b*b-a*a));copy.inner=HOLE_MAX*b*(1-(t-1)/29);copy.charge=sigma*Math.PI*(b*b-copy.inner**2);actual=fieldOf('annulus',copy);target=Math.abs(field('disk',{...copy,charge:sigma*Math.PI*b*b}).z);break;}
  // And narrowing onto its rim at its own Q, against a ring of radius b holding that Q.
  case 'thin':copy.inner=R*(1-thinGap(t));actual=fieldOf('annulus',copy);target=Math.abs(field('ring',copy).z);break;
  // THE ROD OFF ITS BISECTOR SLID ALONG IT, P held at its r, the rod's L and Q held. To the middle: from level with the
  // end on the reader's own side down to h = 0, where E_y falls to nothing (plotted scaled, its reference zero). To an
  // end: from the middle out to that end, against the field of the rod level with its end at the same L and r, which
  // is what the rod is once the mirrored stretch has shrunk to nothing (turned over, at the upper end: the same size).
  case 'middle':case 'end':{const side=Math.sign(offsetEnds(p).h)||-1,s=(t-1)/29;copy.height=side*p.size/2*(limit.mode==='middle'?1-s:s);
   if(limit.mode==='middle'){vector=field('offset',copy);actual=Math.abs(vector.y);target=0;}
   else{actual=fieldOf('offset',copy);target=magnitude(field('endpoint',copy));}break;}
  case 'maximum':copy.distance=ringPeakZ(R,t);actual=fieldOf('ring',copy);target=K*q/(R*R)*2/(3*Math.sqrt(3));break;
  // The potential is a sum over the arc's point charges, so its flat line is measured, not assumed.
  // Beside it goes the field at the same centre, which falls to zero as the arc closes: the case is
  // the contrast, and a flat line alone said only half of it.
  case 'full':copy.phi=2*Math.PI*t/30;if(scalar){actual=Math.abs(arcPotentialSum(copy));target=K*q/R;second=fieldOf('arc',copy);}else{actual=fieldOf('arc',copy);target=0;}break;
  // The half ring is built from N point charges, N growing with t: their sum settles onto 2kλ/R.
  case 'half':copy.phi=Math.PI;
   // The uneven semicircle's N point charges each hold the charge of their own stretch, so one of them holds all of Q
   // and gives kQ/R²; their sum settles onto πkQ/(4R²).
   if(geom==='uneven-arc'){vector=numerical('uneven-arc',copy,halfPieces(t));actual=magnitude(vector);target=Math.PI*K*q/(4*R*R);break;}
   vector=numerical('arc',copy,halfPieces(t));actual=magnitude(vector);target=2*K*q/(Math.PI*R*R);break;
  // THE SAME CHARGE, SPREAD EVENLY. The uneven semicircle's charge is moved, Q fixed, from its cosine density to an
  // even spread: at sweep position t a share s = (30 − t)/29 is still laid as λ₀ cos θ and the rest evenly. Both
  // halves are point-charge sums of the two lessons' own pieces, so the curve is measured, not two closed forms
  // blended; the dashed line is the even semicircle's 2kQ/(πR²), which the curve reaches when s is zero.
  case 'even':{copy.phi=Math.PI;const s=(30-t)/29,cos=numerical('uneven-arc',copy,400),even=numerical('arc',copy,400);
   vector={x:s*cos.x+(1-s)*even.x,y:s*cos.y+(1-s)*even.y,z:0};actual=magnitude(vector);target=2*K*q/(Math.PI*R*R);break;}
  // THE SPHERICAL SHELL, its rings added up -- never the closed form, so a flat line is evidence. Four thousand rings,
  // each holding its band's exact charge, put the sum within a few parts in a million of the integral wherever P stands
  // more than a few hundredths of R from the surface, and within a few in a hundred thousand of the field just outside
  // closer in than that.
  //  · outside: P from just past the surface, z = R(1 + t/6), out to six radii, against a point charge's kQ/z².
  //  · inside: P brought down the axis from twice the radius, through the surface at t = 15.5, to the centre; the
  //    reference is zero, and the plot draws the field over its largest.
  //  · jump: P a gap δ = R/(2t) either side of the surface, the change of the field across it against σ/ε₀ = kQ/R²;
  //    there ten thousand rings, since the gap shrinks to a sixtieth of R and the rings that matter near P with it.
  case 'outside':{copy.distance=R*(1+t/6);vector=ringSum(copy);actual=Math.abs(vector.z);target=K*q/copy.distance**2;break;}
  case 'inside':{copy.distance=2*R*(1-(t-1)/29);vector=ringSum(copy);actual=Math.abs(vector.z);target=0;break;}
  case 'jump':{const d=R/(2*t),out=ringSum({...copy,distance:R+d},10000),inn=ringSum({...copy,distance:R-d},10000);vector=out;actual=Math.abs(out.z-inn.z);target=K*q/(R*R);break;}
  // Point-charge sums at P = t metres: the sheet's field against σ/2ε₀, the infinite line's against
  // 2kλ/r, and the semi-infinite line's two components against each other. None reads a closed form.
  // The line's `second` is a point charge's 1/r² fall, through the line's own value at the sweep's
  // start (t = 1): the plot scales it by its largest, which is that start, so the two leave together.
  case 'scale':copy.distance=t;if(geom==='sheet'){vector=sum(REGISTRY.sheet.sample(copy,400));actual=Math.abs(vector.z);target=q/(2*EPS0);}
   else if(geom==='infinite'){vector=numerical('infinite',copy,400);actual=Math.abs(vector.x);target=2*K*q/t;second=2*K*q/(t*t);}
   else{vector=numerical('semi',copy,400);actual=Math.abs(vector.x);target=Math.abs(vector.y);}break;
 }return{actual,target,vector,second};
}
/** What a limit's plot says, in words and symbols only: the page shows no numerals, so not even a
 * coefficient appears in the plot -- the formula set above it carries those. `y` names the plotted
 * quantity, `axis` the swept one with `from`/`to` at its two ends, `line` the dashed reference,
 * `solid` the curve when it is not simply the exact value, `marks` landmarks at sweep position t, and
 * `caption` the one sentence that says how to read it. */
/** Where the infinite line's law plot marks r doubling: t = 2, 4, 8, 16, from the sweep's start at
 * t = 1. On its logarithmic axis they are equal steps, and the field halves across each. Unlabelled:
 * "2r" and "4r" would put numerals on a page that shows none, so the caption names them instead. */
export const DOUBLINGS=[2,4,8,16];
/** What a logarithm looks like on the log axis it is swept on: a straight line, which a reader takes
 * for growth in proportion unless told. */
const LOG_STRAIGHT=(ratio:string)=>` The axis is a log scale, on which a logarithm is a straight line: |V| grows only as ln(${ratio}).`;
export type LimitPlot={kind:LimitKind;y:string;axis:string;from:string;to:string;line:string;caption:string;solid?:string;second?:string;marks?:{t:number;label:string}[]};
export function limitPlot(problem:Problem,limit:Limit):LimitPlot{
 const g=problem.geometry,scalar=problem.quantity==='V',rod=g==='bisector'||g==='axial'||g==='endpoint'||g==='ramp'||g==='offset';
 const d=g==='axial'?'a':g==='ring'||g==='disk'||g==='annulus'?'z':'r',size=rod?'L':g==='annulus'?'b':'R',Q=scalar?'|V|':'|E|',qty=scalar?'potential magnitude':'field';
 // A symbolic phrase such as "r ≫ L" never breaks across a line.
 const settles=(what:string,to:string)=>`On the dashed line the exact ${qty} equals ${what}. The curve settles onto it as ${to.replace(/ /g,'\u00a0')}.`;
 switch(limit.mode){
  case 'far':return{kind:'ratio',y:`${Q} ÷ point-charge ${qty}`,axis:`distance ${d}`,from:`${d} ∼ ${size}`,to:`${d} ≫ ${size}`,line:'point charge',caption:settles('a point charge’s',`${d} ≫ ${size}`)};
  case 'moment':return{kind:'ratio',y:'|Eᵧ| ÷ first-moment field',axis:'distance r',from:'r ∼ L',to:'r ≫ L',line:'first moment',caption:'On the dashed line the vertical field is the first-moment field, set by the centre of charge ȳ. The curve settles onto it as r\u00a0≫\u00a0L.'};
  case 'infinite':
   // The dashed curve is named by how it grows, as the rod's near case names its logarithm: "growth
   // law" alone left a student to work out what was dashed. Both curves are scaled, so no
   // coefficient is needed, and none could be shown.
   // The rod's is swept on a log axis (Assessment), where its logarithm is a straight line: drawn
   // straight with nothing said, ln(L/r) read as V growing in proportion to L. The disk's grows as R
   // and is swept on a linear axis, where that is the straight line.
   if(scalar)return{kind:'growth',y:'|V| and its growth law, scaled',axis:g==='disk'?'disk radius R, with σ fixed':'rod length L, with λ fixed',from:g==='disk'?'R ∼ z':'L ∼ r',to:g==='disk'?'R ≫ z':'L ≫ r',line:g==='disk'?'grows as R':'grows as ln(L/r)',caption:'Both magnitudes keep growing without end, in step: |V| has no finite limit.'+(g==='disk'?'':LOG_STRAIGHT('L/r'))};
   // On the disk and the bisector the curve is the lesson's own field, growing into its limit. On the
   // sheet and the infinite line it is a disk's or a rod's field growing into the lesson's: calling
   // it "your exact field" told a student their answer fell short of the true field -- and so did
   // the caption under it, "the exact field equals an infinite line's", in the lesson whose exact
   // field IS the infinite line's. There the caption names the rod or the disk, as the legend does.
   if(g==='offset')return{kind:'ratio',y:'|E| ÷ infinite-line field',axis:'rod length L, with λ and h fixed',from:'L ∼ r',to:'L ≫ r',line:'infinite line',caption:'On the dashed line the exact field equals an infinite line’s, along x. The curve settles onto it as both ends run off, L\u00a0≫\u00a0r: P’s height above the middle stops mattering once the rod is far longer than it.'};
   if(g==='annulus')return{kind:'ratio',y:'|E| ÷ holed-sheet field',axis:'outer radius b, with σ and a fixed',from:'b ∼ √(a² + z²)',to:'b ≫ a, z',line:'sheet with a hole',caption:'On the dashed line the exact field equals an infinite sheet’s with the same hole. The curve settles onto it once the rim is far past both the hole and P’s height, b\u00a0≫\u00a0a and b\u00a0≫\u00a0z.'};
   if(g==='disk'||g==='sheet')return{kind:'ratio',y:'|E| ÷ infinite-sheet field',axis:'disk radius R, with σ fixed',from:'R ∼ z',to:'R ≫ z',line:'infinite sheet',...g==='sheet'?{solid:'A disk of radius R',caption:'On the dashed line a disk’s field equals the infinite sheet’s. The curve settles onto it as R ≫ z.'}:{caption:settles('an infinite sheet’s','R ≫ z')}};
   // The half line's case is the infinite line's, from its end: the curve is a rod's, not the lesson's.
   {const half=g==='endpoint'||g==='semi';
   return{kind:'ratio',y:`|E| ÷ ${half?'semi-infinite':'infinite'}-line field`,axis:'rod length L, with λ fixed',from:'L ∼ r',to:'L ≫ r',line:half?'semi-infinite line':'infinite line',...g==='infinite'||g==='semi'?{solid:'A rod of length L',caption:`On the dashed line a rod’s field equals the ${half?'semi-infinite':'infinite'} line’s. The curve settles onto it as L\u00a0≫\u00a0r.`}:{caption:settles(half?'a semi-infinite line’s':'an infinite line’s','L ≫ r')}};}
  // The ring's potential arrives level, the disk's still sloping: one caption said the same thing of
  // both, and so pointed at neither. This plot shows a normalized magnitude, so its slope is not the
  // signed field. Name signed V explicitly: charge reversal reverses V and E, but leaves |V| unchanged.
  //
  // THE SWEEP RUNS DOWN THE AXIS, AND THE AXIS SAYS SO. It is P walking down onto the centre, so z falls
  // to the right; the ring's next tab, the peak, runs from the centre outward, with z rising. Under
  // "height z above the centre" the same stretch of E_z was drawn falling on one tab and rising on the
  // next, and the potentials' curves, climbing to the right, read as V growing with height -- the
  // opposite of the truth. The axis now names the direction of the walk.
  case 'center':return scalar
   ?{kind:'ratio',y:'|V| ÷ centre value',axis:'P coming down the axis to the centre',from:'z ≈ R',to:'the centre',line:'centre value',caption:g==='disk'
    ?'On the dashed line the potential magnitude equals its centre value. It arrives finite and still sloping. The field is minus the slope of signed V, so it is not zero just above the disk.'
    :'On the dashed line the potential magnitude equals its centre value. It arrives there finite and level. The field is minus the slope of signed V, and is zero at the centre.'}
   :{kind:'decay',y:'|E|, scaled',axis:'P coming down the axis to the centre',from:'the peak',to:'the centre',line:'zero',caption:'From its peak the field falls to zero as P reaches the centre, where every piece’s field lies in the ring’s plane and its partner opposite cancels it.'};
  // V and its logarithm, not their ratio: ln(L/a) is zero at a = L, so the ratio came in from off the
  // top of the plot there, where nothing is singular, and settled on one as V ran off to infinity.
  // Drawn as themselves they both climb, and close up: V − kλ ln(L/a) = kλ ln((L + a)/L) → 0.
  // THE AXIAL ROD'S REFERENCE IS NAMED BY ITS FORMULA. It was "semi-infinite-line field" and "semi-infinite
  // line", the words the rod level with an end uses for √2 k|λ|/r: the field beside a half line, off its
  // end, the one the Semi-infinite line lesson teaches. Here it is k|λ|/a, the field along the half line's
  // own axis, and a reader who brought that lesson's answer read the reference wrong. It is named as the
  // rod's potential names its near case, by its formula.
  case 'near':return !scalar?{kind:'ratio',y:'|E| ÷ k|λ|/a',axis:'gap a to the rod’s end',from:'a ∼ L',to:'a ≪ L',line:'k|λ|/a, a half line on its axis',caption:'On the dashed line the exact field equals k|λ|/a, the field of a half line along its own axis, the same gap a beyond its end. The curve settles onto it as a\u00a0≪\u00a0L.'}
   :{kind:'growth',y:'|V| and k|λ| ln(L/a), scaled',axis:'gap a to the rod’s end',from:'a ∼ L',to:'a ≪ L',line:'k|λ| ln(L/a)',caption:'Both grow without end as P walks onto the rod’s end, and draw together: the difference between them, k|λ| ln((L\u00a0+\u00a0a)/L), vanishes as a\u00a0≪\u00a0L.'+LOG_STRAIGHT('L/a')};
  case 'hole':return{kind:'ratio',y:'|E| ÷ disk field',axis:'the hole closing, with σ fixed',from:'a wide hole',to:'no hole',line:'the disk',caption:'On the dashed line the annulus’s field equals the whole disk’s, with the same rim and the same σ. The curve settles onto it as the hole closes.'};
  case 'thin':return{kind:'ratio',y:'|E| ÷ ring field',axis:'the annulus narrowing, with Q fixed',from:'a whole disk',to:'a thin ring',line:'ring of radius b',caption:'On the dashed line the annulus’s field equals a ring’s of radius b holding the same Q. The curve settles onto it as the annulus narrows onto its rim, a\u00a0→\u00a0b.'};
  case 'middle':return{kind:'decay',y:'|Eᵧ|, scaled',axis:'P sliding from an end to the middle',from:'level with an end',to:'level with the middle',line:'zero',caption:'As P slides level with the rod’s middle, the stretch that mirrors itself across P’s level grows to the whole rod, the leftover shrinks to nothing, and |Eᵧ| falls to zero with it: the bisector.'};
  case 'end':return{kind:'ratio',y:'|E| ÷ field level with an end',axis:'P sliding from the middle to an end',from:'level with the middle',to:'level with an end',line:'rod level with an end',caption:'On the dashed line the exact field equals the field of the rod level with its end, the same L and r. The curve settles onto it as P reaches the end, where the mirrored stretch has shrunk to nothing.'};
  case 'maximum':return{kind:'peak',y:'|E| ÷ its peak',axis:'height z on the axis',from:'the centre',to:'farther out',line:'the peak',marks:[{t:RING_PEAK_T,label:'peak'},{t:RING_EDGE_T,label:'R'}],caption:'The curve rises from zero at the centre, touches the dashed line once, at the marked peak inside z\u00a0=\u00a0R, and falls away beyond it.'};
  // The arc opens at fixed Q, so λ = Q/(Rφ) thins as it opens and |E| ∝ sin(φ/2)/φ only falls. At
  // fixed λ it would rise to the semicircle first, and the axis is where a reader learns which.
  // The potential's curve is the arc's point charges added up, not the closed form kQ/R: a legend
  // that said "your exact potential" read as kQ/R plotted against itself.
  case 'full':return scalar
   ?{kind:'constant',y:'|V| ÷ k|Q|/R, and |E| scaled',axis:'opening angle φ, with Q fixed',from:'φ small',to:'full circle',line:'k|Q|/R',solid:'The arc’s pieces, added up',second:'The field |E|, scaled',caption:'As the arc closes the field falls to zero, while the potential stays on the dashed line at every φ.'}
   :{kind:'decay',y:'|E|, scaled',axis:'opening angle φ, with Q fixed',from:'φ small',to:'full circle',line:'zero',caption:'With the charge fixed, the field only falls as the arc opens, and reaches zero when it closes into a full circle.'};
  case 'even':return{kind:'ratio',y:'|E| ÷ even semicircle’s',axis:'the charge moved to an even spread, Q fixed',from:'cosine density',to:'spread evenly',line:'even semicircle',solid:'The pieces of both, added up',caption:'As more of the same charge is moved out toward the ends, where its field lies mostly across the axis and its mirror cancels that part, the field at P falls onto the even semicircle’s, the dashed line.'};
  case 'half':return{kind:'ratio',y:'|sum| ÷ integral',axis:'the semicircle as N point charges',from:'one piece',to:'many pieces',line:'the integral',solid:'Sum of N point charges',caption:'The plot builds the semicircle from N point charges: the more there are, the closer their sum comes to the integral, the dashed line.'};
  // THE SPHERICAL SHELL. Its three cases are its rings added up, never the closed form: a flat line at one outside is
  // measured, and so is the zero inside.
  case 'outside':return{kind:'constant',y:'|E| ÷ point-charge field',axis:'height z, outside the shell',from:'z just past R',to:'z ≫ R',line:'point charge',solid:'The shell’s rings, added up',caption:'Flat: added up ring by ring, the field outside equals a point charge’s at every height, from just past the surface outward, not only far away.'};
  case 'inside':return{kind:'decay',y:'|E|, scaled',axis:'P coming down the axis, through the shell to its centre',from:'outside',to:'the centre',line:'zero',solid:'The shell’s rings, added up',caption:'Outside, the field grows as P comes in toward the shell. Through the surface it drops to zero, and stays there all the way to the centre: inside, the rings cancel at every point.'};
  case 'jump':return{kind:'ratio',y:'|jump| ÷ |σ|/ε₀',axis:'a gap δ either side of the surface',from:'δ ∼ R',to:'δ ≪ R',line:'|σ|/ε₀',solid:'The shell’s rings, added up',caption:'On the dashed line the field change has magnitude |σ|/ε₀; its signed jump is σ/ε₀. Measured a gap δ either side of the surface, its magnitude settles onto the line as δ\u00a0≪\u00a0R.'};
  // The sheet's curve is its rings added up, the line's its pieces: neither is the closed form, and a
  // legend that said "your exact field" read as σ/(2ε₀) divided by itself.
  case 'scale':return g==='sheet'
   ?{kind:'constant',y:'|E| ÷ sheet field',axis:'height z above the sheet',from:'z small',to:'z large',line:'sheet field',solid:'The sheet’s rings, added up',caption:'Flat: added up ring by ring, the field is the same at every height.'}
   :g==='infinite'
   ?{kind:'law',y:'|E|, scaled',axis:'distance r from the line',from:'r small',to:'r large',line:'infinite line',solid:'The line’s pieces, added up',second:'A point charge’s fall',marks:DOUBLINGS.map(t=>({t,label:''})),caption:'Added up piece by piece, the field falls along the dashed infinite-line curve: double r and it halves. Each stem stands one more doubling of r out and is half as tall as the one before it, while the ghost, a point charge’s field from the same start, drops to a quarter.'}
   // The semi-infinite line's curve is a ratio, the summed |Eₓ| over the summed |Eᵧ|: "your field’s two
   // components" named two curves over the one drawn, and the halving the card promises is divided out
   // of a ratio. It is the thumbnail's arrow that shortens, so the caption points there.
   :{kind:'constant',y:'|Eₓ| ÷ |Eᵧ|',axis:'distance r from the line’s end',from:'r small',to:'r large',line:'equal parts',solid:'The line’s pieces, added up',caption:'Flat: added up piece by piece, the two parts stay equal at every r, so the field never turns, while the arrow at P shortens: double r and it halves.'};
 }
}
