/** Comparing a student's guess at the field against the field.
 *
 * Only the DIRECTION is asked for. Nobody can predict the magnitude of E at a point — it
 * depends on k, on the density, and on a distance the eye cannot integrate — so asking for
 * it invites a wrong answer to a question that was never fair, and a student who gets the
 * direction right for exactly the right reason would still be told they were short.
 * Direction is the part symmetry actually determines, and symmetry is the lesson.
 *
 * This is deliberately not marking. Nothing here returns right or wrong, a score, or a
 * pass, and nothing returns a number: an angle in degrees is a measurement, not an
 * explanation, and a student who is told "forty degrees off" has learned nothing about why.
 * What comes back is the physical relationship between the two arrows, in words. The reason
 * that relationship holds is the lesson's own symmetry argument, which the caller appends.
 *
 * Committing to a guess and then meeting the answer is the move with the best evidence
 * behind it in physics teaching, and the commitment is the active ingredient: a prediction
 * you never made is one you cannot be surprised by. That only works if being off is
 * survivable. */
export type Plane={x:number;y:number};
/** How the guess sits relative to the field, as a shape of answer rather than a number. */
export type Reading=
 |'none'          /** nothing aimed yet */
 |'vanishing'     /** the field really is zero here, so there is no direction to guess */
 |'aligned'       /** pointing where the field points */
 |'across'        /** at right angles: aimed along what cancels */
 |'opposite'      /** reversed: the sign of the charge, or which way "away" runs */
 |'off';          /** somewhere else */
const LEN=(v:Plane)=>Math.hypot(v.x,v.y);
/** Below this the field is zero as far as the drawing is concerned, and a direction for it
 * would be noise rather than physics. The ring's centre is the case that matters. */
const ZERO=1e-12;
/** Degrees between the two arrows. Kept internal: it decides which sentence to say, and is
 * never said itself. */
export function angleBetween(guess:Plane,truth:Plane):number{
 const g=LEN(guess),t=LEN(truth);
 if(g<=ZERO||t<=ZERO)return 0;
 const cos=Math.max(-1,Math.min(1,(guess.x*truth.x+guess.y*truth.y)/(g*t)));
 return Math.acos(cos)*180/Math.PI;
}
export function read(guess:Plane,truth:Plane):Reading{
 if(LEN(truth)<=ZERO)return 'vanishing';
 if(LEN(guess)<=ZERO)return 'none';
 const angle=angleBetween(guess,truth);
 // Generous on purpose. A student aiming by hand at a rod is arguing from symmetry, not
 // measuring, and the last few degrees carry no physics worth correcting.
 if(angle<=14)return 'aligned';
 if(angle>=150)return 'opposite';
 if(angle>=62)return 'across';
 return 'off';
}
/** What to say about that relationship. Physics, never arithmetic, and never a verdict:
 * the caller follows it with the lesson's own reason, which is the part worth reading. */
export function phrase(reading:Reading,positive:boolean):string{
 switch(reading){
  case 'none':return 'Aim the dashed arrow from P, then look.';
  case 'vanishing':return 'There is no direction to point here: the field is zero. Every contribution has a partner pointing the opposite way, and they cancel exactly.';
  case 'aligned':return 'That is the direction the field points.';
  case 'across':return 'You have aimed along the direction that cancels. Contributions that way come in opposing pairs and add to nothing; what survives is at right angles to your arrow.';
  case 'opposite':return positive
   ?'The field runs the other way. It points away from positive charge, not back toward it.'
   :'The field runs the other way. It points toward negative charge, not away from it.';
  default:return 'Not the direction that survives.';
 }
}
/** The part of a guess lying along the axis the geometry cancels.
 *
 * A rod on its bisector has no field along the rod, and expecting one is the misconception
 * this whole family of problems exists to dislodge, so it is worth being able to name. */
export function strayComponent(guess:Plane,truth:Plane):number{
 const t=LEN(truth);
 if(t<=ZERO)return LEN(guess);
 const unit={x:truth.x/t,y:truth.y/t};
 const along=guess.x*unit.x+guess.y*unit.y;
 return Math.hypot(guess.x-along*unit.x,guess.y-along*unit.y);
}
