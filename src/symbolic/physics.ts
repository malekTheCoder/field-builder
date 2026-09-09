import type {Params,ProblemId} from '../problems/types';
export const EPS0=8.8541878128e-12;
export const K=1/(4*Math.PI*EPS0);
export type Vec={x:number;y:number;z:number};
// Finite distributions use total Q in nC; infinite lines use λ in nC/m;
// an infinite sheet uses σ in nC/m². Distance and geometry are in meters.
export function field(id:ProblemId,p:Params):Vec {const d=p.distance,L=p.size,R=p.size/2,q=p.charge*1e-9;let x=0,y=0,z=0;switch(id){case 'bisector':x=K*q/(d*Math.sqrt(d*d+L*L/4));break;case 'axial':x=K*q/L*(1/d-1/(d+L));break;case 'infinite':x=2*K*q/d;break;case 'ring':z=K*q*d/(R*R+d*d)**1.5;break;case 'disk':{const sigma=q/(Math.PI*R*R);z=Math.sign(d)*sigma/(2*EPS0)*(1-Math.abs(d)/Math.sqrt(d*d+R*R));break;}case 'semi':x=-K*q/d;y=K*q/d;break;case 'arc':x=-2*K*q*Math.sin(p.phi/2)/(R*R*p.phi);break;case 'sheet':z=Math.sign(d)*q/(2*EPS0);break;}return{x,y,z};}
export function magnitude(v:Vec){return Math.hypot(v.x,v.y,v.z);}
export function pretty(n:number){if(!Number.isFinite(n))return '—';return Math.abs(n)<.001&&n!==0?n.toExponential(2):n.toLocaleString('en-US',{maximumSignificantDigits:4});}
export function numerical(id:ProblemId,p:Params,n=12000):Vec {const sum:Vec={x:0,y:0,z:0},q=p.charge*1e-9,d=p.distance,L=p.size,R=L/2;const add=(dq:number,x:number,y:number,z:number)=>{const r3=Math.hypot(x,y,z)**3;sum.x+=K*dq*x/r3;sum.y+=K*dq*y/r3;sum.z+=K*dq*z/r3;};
 if(id==='bisector'||id==='axial'){for(let i=0;i<n;i++){const u=(i+.5)*L/n;id==='bisector'?add(q/n,d,L/2-u,0):add(q/n,L+d-u,0,0);}}
 if(id==='ring'||id==='arc'){for(let i=0;i<n;i++){const theta=id==='ring'?2*Math.PI*(i+.5)/n:-p.phi/2+p.phi*(i+.5)/n;add(q/n,-R*Math.cos(theta),-R*Math.sin(theta),id==='ring'?d:0);}}
 // Map the unbounded source coordinate to t in (-π/2, π/2), and sum the
 // underlying point-charge vector with its Jacobian. No closed-form field is used.
 if(id==='infinite'||id==='semi'){const span=id==='infinite'?Math.PI:Math.PI/2;for(let i=0;i<n;i++){const t=(i+.5)*span/n-(id==='infinite'?Math.PI/2:0),u=d*Math.tan(t),dq=q*d/(Math.cos(t)**2)*span/n;id==='infinite'?add(dq,d,-u,0):add(dq,-u,d,0);}}
 if(id==='disk'||id==='sheet'){const nr=Math.max(100,Math.floor(Math.sqrt(n))),nt=160;const sigma=id==='disk'?q/(Math.PI*R*R):q;for(let i=0;i<nr;i++){const t=(i+.5)/nr;const rho=id==='disk'?R*t:Math.abs(d)*Math.tan(Math.PI*t/2);const dr=id==='disk'?R/nr:Math.abs(d)*Math.PI/2/(Math.cos(Math.PI*t/2)**2)/nr;for(let j=0;j<nt;j++){const theta=2*Math.PI*(j+.5)/nt;add(sigma*rho*dr*2*Math.PI/nt,-rho*Math.cos(theta),-rho*Math.sin(theta),d);}}}return sum;}
