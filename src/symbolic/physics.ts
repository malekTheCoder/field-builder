import type {Limit,Params,Problem,ProblemId} from '../problems/types';
import {REGISTRY} from '../distributions';
export {EPS0,K,type Vec} from '../distributions/constants';
import {K,EPS0,type Vec} from '../distributions/constants';
// Finite distributions use total Q in nC; infinite lines use λ in nC/m;
// semi-infinite lines use λ in nC/m; an infinite sheet uses σ in nC/m². Distance and geometry are in metres.
// The per-geometry closed forms and point-charge sums live in src/distributions/.
export function field(id:ProblemId,p:Params):Vec {return REGISTRY[id].field(p);}
/** Closed-form potential at P in volts. Only the geometries with a potential problem define one. */
export function potential(id:ProblemId,p:Params):number {const v=REGISTRY[id].potential?.(p);if(v===undefined)throw Error(`${id} has no potential closed form.`);return v;}
export function magnitude(v:Vec){return Math.hypot(v.x,v.y,v.z);}
export function pretty(n:number){if(!Number.isFinite(n))return '—';return Math.abs(n)<.001&&n!==0?n.toExponential(2):n.toLocaleString('en-US',{maximumSignificantDigits:4});}
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
   const d=geom==='axial'?copy.distance+p.size/2:copy.distance;
   if(scalar){actual=Math.abs(potential(geom,copy));target=K*q/d;}else{actual=fieldOf(geom,copy);target=K*q/d**2;}break;}
  // The vertical far field, along the rod, is a first moment: −kQ y_c/r³ with y_c the centre of
  // charge. Only the ramp uses it, and its y_c is 2L/3. ("Transverse" named it once, which beside a
  // rod reads as across the rod -- E_x, the other component.)
  case 'moment':{copy.distance=t*p.size;const e=field(geom,copy);vector={x:0,y:e.y,z:0};actual=Math.abs(e.y);target=K*q*(2*p.size/3)/copy.distance**3;break;}
  case 'infinite':if(scalar&&geom==='disk'){const sigma=p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=Math.abs(potential('disk',copy));target=Math.abs(sigma)*1e-9*(copy.size/2)/(2*EPS0);}
   else if(scalar){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=Math.abs(potential('bisector',copy));target=2*K*Math.abs(lambda)*1e-9*Math.log(Math.max(copy.size/p.distance,1));}
   else if(geom==='bisector'||geom==='infinite'){const lambda=geom==='infinite'?p.charge:p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=fieldOf('bisector',copy);target=2*K*Math.abs(lambda)*1e-9/p.distance;}
   else if(geom==='endpoint'){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=fieldOf('endpoint',copy);target=Math.SQRT2*K*Math.abs(lambda)*1e-9/p.distance;}
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
  case 'maximum':copy.distance=ringPeakZ(R,t);actual=fieldOf('ring',copy);target=K*q/(R*R)*2/(3*Math.sqrt(3));break;
  // The potential is a sum over the arc's point charges, so its flat line is measured, not assumed.
  // Beside it goes the field at the same centre, which falls to zero as the arc closes: the case is
  // the contrast, and a flat line alone said only half of it.
  case 'full':copy.phi=2*Math.PI*t/30;if(scalar){actual=Math.abs(arcPotentialSum(copy));target=K*q/R;second=fieldOf('arc',copy);}else{actual=fieldOf('arc',copy);target=0;}break;
  // The half ring is built from N point charges, N growing with t: their sum settles onto 2kλ/R.
  case 'half':copy.phi=Math.PI;vector=numerical('arc',copy,halfPieces(t));actual=magnitude(vector);target=2*K*q/(Math.PI*R*R);break;
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
const LOG_STRAIGHT=(ratio:string)=>` The axis is a log scale, on which a logarithm is a straight line: V grows only as ln(${ratio}).`;
export type LimitPlot={kind:LimitKind;y:string;axis:string;from:string;to:string;line:string;caption:string;solid?:string;second?:string;marks?:{t:number;label:string}[]};
export function limitPlot(problem:Problem,limit:Limit):LimitPlot{
 const g=problem.geometry,scalar=problem.quantity==='V',rod=g==='bisector'||g==='axial'||g==='endpoint'||g==='ramp';
 const d=g==='axial'?'a':g==='ring'||g==='disk'?'z':'r',size=rod?'L':'R',Q=scalar?'|V|':'|E|',qty=scalar?'potential':'field';
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
   if(scalar)return{kind:'growth',y:'|V| and its growth law, scaled',axis:g==='disk'?'disk radius R, with σ fixed':'rod length L, with λ fixed',from:g==='disk'?'R ∼ z':'L ∼ r',to:g==='disk'?'R ≫ z':'L ≫ r',line:g==='disk'?'grows as R':'grows as ln(L/r)',caption:'Both keep growing without end, in step: V has no limit to settle on.'+(g==='disk'?'':LOG_STRAIGHT('L/r'))};
   // On the disk and the bisector the curve is the lesson's own field, growing into its limit. On the
   // sheet and the infinite line it is a disk's or a rod's field growing into the lesson's: calling
   // it "your exact field" told a student their answer fell short of the true field -- and so did
   // the caption under it, "the exact field equals an infinite line's", in the lesson whose exact
   // field IS the infinite line's. There the caption names the rod or the disk, as the legend does.
   if(g==='disk'||g==='sheet')return{kind:'ratio',y:'|E| ÷ infinite-sheet field',axis:'disk radius R, with σ fixed',from:'R ∼ z',to:'R ≫ z',line:'infinite sheet',...g==='sheet'?{solid:'A disk of radius R',caption:'On the dashed line a disk’s field equals the infinite sheet’s. The curve settles onto it as R ≫ z.'}:{caption:settles('an infinite sheet’s','R ≫ z')}};
   return{kind:'ratio',y:`|E| ÷ ${g==='endpoint'?'semi-infinite':'infinite'}-line field`,axis:'rod length L, with λ fixed',from:'L ∼ r',to:'L ≫ r',line:g==='endpoint'?'semi-infinite line':'infinite line',...g==='infinite'?{solid:'A rod of length L',caption:'On the dashed line a rod’s field equals the infinite line’s. The curve settles onto it as L ≫ r.'}:{caption:settles(g==='endpoint'?'a semi-infinite line’s':'an infinite line’s','L ≫ r')}};
  // The ring's potential arrives level, the disk's still sloping: one caption said the same thing of
  // both, and so pointed at neither. The slope of V along the axis is minus the field there.
  //
  // THE SWEEP RUNS DOWN THE AXIS, AND THE AXIS SAYS SO. It is P walking down onto the centre, so z falls
  // to the right; the ring's next tab, the peak, runs from the centre outward, with z rising. Under
  // "height z above the centre" the same stretch of E_z was drawn falling on one tab and rising on the
  // next, and the potentials' curves, climbing to the right, read as V growing with height -- the
  // opposite of the truth. The axis now names the direction of the walk.
  case 'center':return scalar
   ?{kind:'ratio',y:'|V| ÷ centre value',axis:'P coming down the axis to the centre',from:'z ≈ R',to:'the centre',line:'centre value',caption:g==='disk'
    ?'On the dashed line the exact potential equals its value at the centre. The curve arrives there finite and still sloping: just above a charged disk the field, minus V’s slope, is not zero.'
    :'On the dashed line the exact potential equals its value at the centre. The curve arrives there finite and level: its slope is minus the field along the axis, which is zero at the centre.'}
   :{kind:'decay',y:'|E|, scaled',axis:'P coming down the axis to the centre',from:'the peak',to:'the centre',line:'zero',caption:'From its peak the field falls to zero as P reaches the centre, where every element’s field lies in the ring’s plane and its partner opposite cancels it.'};
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
  case 'maximum':return{kind:'peak',y:'|E| ÷ its peak',axis:'height z on the axis',from:'the centre',to:'farther out',line:'the peak',marks:[{t:RING_PEAK_T,label:'peak'},{t:RING_EDGE_T,label:'R'}],caption:'The curve rises from zero at the centre, touches the dashed line once, at the marked peak inside z\u00a0=\u00a0R, and falls away beyond it.'};
  // The arc opens at fixed Q, so λ = Q/(Rφ) thins as it opens and |E| ∝ sin(φ/2)/φ only falls. At
  // fixed λ it would rise to the semicircle first, and the axis is where a reader learns which.
  // The potential's curve is the arc's point charges added up, not the closed form kQ/R: a legend
  // that said "your exact potential" read as kQ/R plotted against itself.
  case 'full':return scalar
   ?{kind:'constant',y:'|V| ÷ kQ/R, and |E| scaled',axis:'opening angle φ, with Q fixed',from:'φ small',to:'full circle',line:'kQ/R',solid:'The arc’s pieces, added up',second:'The field |E|, scaled',caption:'As the arc closes the field falls to zero, while the potential stays on the dashed line at every φ.'}
   :{kind:'decay',y:'|E|, scaled',axis:'opening angle φ, with Q fixed',from:'φ small',to:'full circle',line:'zero',caption:'With the charge fixed, the field only falls as the arc opens, and reaches zero when it closes into a full circle.'};
  case 'half':return{kind:'ratio',y:'|sum| ÷ integral',axis:'the semicircle as N point charges',from:'one piece',to:'many pieces',line:'the integral',solid:'Sum of N point charges',caption:'The plot builds the semicircle from N point charges: the more there are, the closer their sum comes to the integral, the dashed line.'};
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
