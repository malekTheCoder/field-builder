import type {Limit,Params,Problem,ProblemId} from '../problems/types';
import {REGISTRY} from '../distributions';
export {EPS0,K,type Vec} from '../distributions/constants';
import {K,EPS0,type Vec} from '../distributions/constants';
// Finite distributions use total Q in nC; infinite lines use λ in nC/m;
// semi-infinite lines use λ in nC/m; an infinite sheet uses σ in nC/m². Distance and geometry are in meters.
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
 *  · `peak`: the exact value over its analytic maximum, which it touches once. */
export type LimitKind='ratio'|'constant'|'decay'|'peak';
/** One point on a limit's plot. `actual` and `target` are magnitudes (for the semi-infinite line's
 * direction, its two component magnitudes), so a negative charge never mirrors a curve below the
 * axis. `vector` is the field at P for that point, sign included: the thumbnail draws it. */
export type LimitSample={actual:number;target:number;vector?:Vec};
const sum=(samples:{field:Vec}[]):Vec=>samples.reduce((s,x)=>({x:s.x+x.field.x,y:s.y+x.field.y,z:s.z+x.field.z}),{x:0,y:0,z:0});
/** The arc's potential at its centre as a sum over point charges, not the closed form kQ/R. */
const arcPotentialSum=(p:Params)=>REGISTRY.arc.sample(p,60).reduce((s,x)=>s+x.potential,0);
/** How many point charges the half ring is built from at sweep position t: one, two, … thirty. */
export const halfPieces=(t:number)=>Math.max(1,Math.round(t));
/** One point on the limiting-case comparison plot, at sweep position t ∈ [1, 30]. Densities are
 * derived from the student's own geometry: a 2 nC rod 4 m long carries λ = 0.5 nC/m, not 2 nC/m,
 * and a 2 nC disk of radius 2 m carries σ = Q/(πR²), not 2 nC/m². Only the infinite-line and
 * sheet problems expose a density on their charge slider directly. */
export function sampleLimit(problem:Problem,p:Params,limit:Limit,t:number):LimitSample{
 const copy={...p},geom=problem.geometry,scalar=problem.quantity==='V',q=Math.abs(REGISTRY[geom].total?.(p)??p.charge*1e-9),R=p.size/2;
 let actual=0,target=0,vector:Vec|undefined;
 const fieldOf=(id:ProblemId,c:Params)=>{vector=field(id,c);return magnitude(vector);};
 switch(limit.mode){
  case 'far':{copy.distance=t*p.size;
   // The rod on its own axis is placed by its near end, a. Its charge is centred L/2 further off,
   // and measured from there the point-charge form is right to second order in L, not just first.
   const d=geom==='axial'?copy.distance+p.size/2:copy.distance;
   if(scalar){actual=Math.abs(potential(geom,copy));target=K*q/d;}else{actual=fieldOf(geom,copy);target=K*q/d**2;}break;}
  // The transverse far field is a first moment: −kQ y_c/r³ with y_c the centre of charge. Only the ramp uses it, and its y_c is 2L/3.
  case 'moment':{copy.distance=t*p.size;const e=field(geom,copy);vector={x:0,y:e.y,z:0};actual=Math.abs(e.y);target=K*q*(2*p.size/3)/copy.distance**3;break;}
  case 'infinite':if(scalar&&geom==='disk'){const sigma=p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=Math.abs(potential('disk',copy));target=Math.abs(sigma)*1e-9*(copy.size/2)/(2*EPS0);}
   else if(scalar){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=Math.abs(potential('bisector',copy));target=2*K*Math.abs(lambda)*1e-9*Math.log(Math.max(copy.size/p.distance,1));}
   else if(geom==='bisector'||geom==='infinite'){const lambda=geom==='infinite'?p.charge:p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=fieldOf('bisector',copy);target=2*K*Math.abs(lambda)*1e-9/p.distance;}
   else if(geom==='endpoint'){const lambda=p.charge/p.size;copy.size=t*p.distance;copy.charge=lambda*copy.size;actual=fieldOf('endpoint',copy);target=Math.SQRT2*K*Math.abs(lambda)*1e-9/p.distance;}
   else{const sigma=geom==='sheet'?p.charge:p.charge/(Math.PI*R*R);copy.size=2*t*p.distance;copy.charge=sigma*Math.PI*(copy.size/2)**2;actual=fieldOf('disk',copy);target=Math.abs(sigma)*1e-9/(2*EPS0);}
   break;
  case 'center':copy.distance=R*(1-t/30);if(scalar){actual=Math.abs(potential(geom,copy));target=geom==='disk'?2*K*q/R:K*q/R;}else{actual=fieldOf('ring',copy);target=0;}break;
  case 'near':copy.distance=p.size/t;actual=Math.abs(potential('axial',copy));target=K*Math.abs(p.charge/p.size)*1e-9*Math.log(Math.max(p.size/copy.distance,1));break;
  case 'maximum':copy.distance=R*t/10;actual=fieldOf('ring',copy);target=K*q/(R*R)*2/(3*Math.sqrt(3));break;
  // The potential cases are sums over the arc's point charges, so a flat line is measured, not assumed.
  case 'full':copy.phi=2*Math.PI*t/30;if(scalar){actual=Math.abs(arcPotentialSum(copy));target=K*q/R;}else{actual=fieldOf('arc',copy);target=0;}break;
  // The field's half ring is built from N point charges, N growing with t: their sum settles onto
  // 2kλ/R. The potential's sweeps the arc open from a semicircle to the full ring at the same Q.
  case 'half':if(scalar){copy.phi=Math.PI*(1+(t-1)/29);actual=Math.abs(arcPotentialSum(copy));target=K*q/R;}
   else{copy.phi=Math.PI;vector=numerical('arc',copy,halfPieces(t));actual=magnitude(vector);target=2*K*q/(Math.PI*R*R);}break;
  // Point-charge sums at P = t metres: the sheet's field against σ/2ε₀, and the semi-infinite line's
  // two components against each other. Neither reads a closed form.
  case 'scale':copy.distance=t;if(geom==='sheet'){vector=sum(REGISTRY.sheet.sample(copy,400));actual=Math.abs(vector.z);target=q/(2*EPS0);}
   else{vector=numerical('semi',copy,400);actual=Math.abs(vector.x);target=Math.abs(vector.y);}break;
 }return{actual,target,vector};
}
/** What a limit's plot says, in words and symbols only: the page shows no numerals, so not even a
 * coefficient appears in the plot -- the formula set above it carries those. `y` names the plotted
 * quantity, `axis` the swept one with `from`/`to` at its two ends, `line` the dashed reference,
 * `solid` the curve when it is not simply the exact value, `marks` landmarks at sweep position t, and
 * `caption` the one sentence that says how to read it. */
export type LimitPlot={kind:LimitKind;y:string;axis:string;from:string;to:string;line:string;caption:string;solid?:string;marks?:{t:number;label:string}[]};
export function limitPlot(problem:Problem,limit:Limit):LimitPlot{
 const g=problem.geometry,scalar=problem.quantity==='V',rod=g==='bisector'||g==='axial'||g==='endpoint'||g==='ramp';
 const d=g==='axial'?'a':g==='ring'||g==='disk'?'z':'r',size=rod?'L':'R',Q=scalar?'|V|':'|E|',qty=scalar?'potential':'field';
 // A symbolic phrase such as "r ≫ L" never breaks across a line.
 const settles=(what:string,to:string)=>`On the dashed line the exact ${qty} equals ${what}. The curve settles onto it as ${to.replace(/ /g,'\u00a0')}.`;
 switch(limit.mode){
  case 'far':return{kind:'ratio',y:`${Q} ÷ point-charge ${qty}`,axis:`distance ${d}`,from:`${d} ∼ ${size}`,to:`${d} ≫ ${size}`,line:'point charge',caption:settles('a point charge’s',`${d} ≫ ${size}`)};
  case 'moment':return{kind:'ratio',y:'|Eᵧ| ÷ first-moment field',axis:'distance r',from:'r ∼ L',to:'r ≫ L',line:'first moment',caption:'On the dashed line the vertical field is the first-moment field, set by the centre of charge ȳ. The curve settles onto it as r\u00a0≫\u00a0L.'};
  case 'infinite':
   if(scalar)return{kind:'ratio',y:'|V| ÷ its growth law',axis:g==='disk'?'disk radius R, with σ fixed':'rod length L, with λ fixed',from:g==='disk'?'R ∼ z':'L ∼ r',to:g==='disk'?'R ≫ z':'L ≫ r',line:'growth without end',caption:`The potential has no limit to settle on: it grows without end, ${g==='disk'?'in step with R':'as the logarithm of L'}. The curve meets the dashed line because V and that growth become the same thing.`};
   if(g==='disk'||g==='sheet')return{kind:'ratio',y:'|E| ÷ infinite-sheet field',axis:'disk radius R, with σ fixed',from:'R ∼ z',to:'R ≫ z',line:'infinite sheet',caption:settles('an infinite sheet’s','R ≫ z')};
   return{kind:'ratio',y:`|E| ÷ ${g==='endpoint'?'semi-infinite':'infinite'}-line field`,axis:'rod length L, with λ fixed',from:'L ∼ r',to:'L ≫ r',line:g==='endpoint'?'semi-infinite line':'infinite line',caption:settles(g==='endpoint'?'a semi-infinite line’s':'an infinite line’s','L ≫ r')};
  case 'center':return scalar
   ?{kind:'ratio',y:'|V| ÷ centre value',axis:'height z above the centre',from:'z ≈ R',to:'the centre',line:'centre value',caption:'On the dashed line the exact potential equals its value at the centre. The curve arrives there, finite, as z reaches the centre.'}
   :{kind:'decay',y:'|E|, scaled',axis:'height z above the centre',from:'z ≈ R',to:'the centre',line:'zero',caption:'The field falls to zero as P reaches the centre, where every element has a partner opposite.'};
  case 'near':return{kind:'ratio',y:'|V| ÷ logarithm',axis:'gap a to the rod’s end',from:'a ∼ L',to:'a ≪ L',line:'logarithm',caption:'On the dashed line the exact potential is the logarithm, growing without end. The curve settles onto it as a\u00a0≪\u00a0L.'};
  case 'maximum':return{kind:'peak',y:'|E| ÷ its peak',axis:'height z on the axis',from:'the centre',to:'farther out',line:'the peak',marks:[{t:10/Math.SQRT2,label:'peak'},{t:10,label:'R'}],caption:'The curve touches the dashed line once, at the marked peak, just inside z\u00a0=\u00a0R, and falls away on either side.'};
  case 'full':return scalar
   ?{kind:'constant',y:'|V| ÷ kQ/R',axis:'opening angle φ',from:'φ small',to:'full circle',line:'kQ/R',caption:'Flat: at a fixed charge, V at the centre does not depend on φ.'}
   :{kind:'decay',y:'|E|, scaled',axis:'opening angle φ',from:'φ small',to:'full circle',line:'zero',caption:'The field falls to zero as the arc closes into a full circle.'};
  case 'half':return scalar
   ?{kind:'constant',y:'|V| ÷ kQ/R',axis:'from a semicircle to a full ring',from:'semicircle',to:'full ring',line:'kQ/R',caption:'Flat: a semicircle and a full ring with the same Q give the same V.'}
   :{kind:'ratio',y:'|sum| ÷ integral',axis:'the semicircle as N point charges',from:'one piece',to:'many pieces',line:'the integral',solid:'Sum of N point charges',caption:'The more point charges, the closer their sum comes to the integral, the dashed line.'};
  case 'scale':return g==='sheet'
   ?{kind:'constant',y:'|E| ÷ sheet field',axis:'height z above the sheet',from:'z small',to:'z large',line:'sheet field',caption:'Flat: the field is the same at every height.'}
   :{kind:'constant',y:'|Eₓ| ÷ |Eᵧ|',axis:'distance r from the line’s end',from:'r small',to:'r large',line:'equal parts',solid:'Your field’s two components',caption:'Flat: the two components stay equal at every r, so the field never turns.'};
 }
}
