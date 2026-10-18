import type {Question} from '../types';
const raw = String.raw;

/* SYMMETRY FIRST, in its lesson's symbols (src/gauss/lessons/symmetry.ts): a uniform ball of radius R and charge Q
 * in a concentric sphere, an infinite line of λ in a coaxial cylinder of radius r and length L, an infinite sheet
 * of σ in a pillbox with faces of area A at heights z and minus z. E_r and E_⊥ are signed components, negative
 * where the field points in. Every result here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'symmetry-line-direction', lesson: 'symmetry', kind: 'predict',
    prompt: raw`An infinite straight line carries a uniform charge $\lambda$ per unit length. Before any calculation, which way can its field point at $P$, a distance $r$ from the line?`,
    choices: [
      {correct: true, text: raw`Straight out from the line, or straight in toward it, with no part along the line and none round it.`},
      {text: raw`Along the line, since that is the way the charge lies.`, misconception: 'symmetry-forbids',
        why: raw`Flip everything in a mirror perpendicular to the line, through $P$. The line is unchanged, but a part of the field along it would now point the other way: the same charge would make two different fields. So there is no such part.`},
      {text: raw`Round the line, in circles about it.`, misconception: 'symmetry-forbids',
        why: raw`Flip everything in a mirror that contains the line and $P$. The line is unchanged, but a swirl round it would reverse. The same charge cannot make both, so there is no swirl.`},
      {text: raw`Any way at all: symmetry says nothing until you calculate.`, misconception: 'symmetry-forbids',
        why: raw`Symmetry speaks first. A move that leaves the line exactly as it was must leave its field as it was, and the mirrors that leave the line unchanged rule out every part but the one straight out or straight in.`},
    ],
    explanation: raw`A mirror perpendicular to the line rules out a part along it, and a mirror containing the line rules out a swirl round it, because each leaves the line unchanged while reversing that part. What is left points straight out or straight in, $\vec E=E_r(r)\,\hat{\mathbf r}$, and turning about the line or sliding along it shows its size depends only on $r$.`,
    review: {lesson: 'symmetry', section: 'A long straight line'}},

  {id: 'symmetry-finite-rod', lesson: 'symmetry', kind: 'transfer',
    prompt: raw`Swap the infinite line for a rod of length $L$, and put $P$ a distance $r$ from it, level with neither its middle nor an end. Can a coaxial cylinder through $P$ give the field there by Gauss’s law?`,
    choices: [
      {correct: true, text: raw`No. The law still holds, but away from the middle the field leans and its size changes along the wall, so $E$ cannot come out of the integral.`},
      {text: raw`Yes. The rod is straight and uniform, so $E_r\,(2\pi rL)=Q_{\text{enc}}/\varepsilon_0$ gives the field at once.`, misconception: 'false-symmetry',
        why: raw`A mirror perpendicular to the rod through $P$ leaves an infinite line unchanged, but not a rod unless $P$ is level with its middle. Away from there the field has a part along the rod, and on the cylinder’s wall it is stronger near the middle than near the ends.`},
      {text: raw`Yes, as long as the cylinder is long enough to enclose the whole rod.`, misconception: 'surface-real',
        why: raw`Enclosing all the charge is not what the surface needs. For the line’s wall-area formula, the normal field must be constant on the wall and the ends must carry no flux. The rod meets neither condition: its wall-normal field varies and its field also crosses the ends.`},
      {text: raw`No, because Gauss’s law is false for a rod with ends.`, misconception: 'law-fails',
        why: raw`Gauss’s law is true for every closed surface and every charge: the flux through that cylinder is still the charge inside over $\varepsilon_0$. What fails is pulling $E$ out of the integral to solve for it.`},
    ],
    explanation: raw`A finite rod survives too few of the moves that made the infinite line’s field radial and the same along a cylinder’s wall. The flux through any closed surface round it is still $Q_{\text{enc}}/\varepsilon_0$, but the rod’s symmetry alone does not relate that flux to its field at $P$. On this cylinder the wall-normal field varies and the ends carry flux, so dividing by the wall area does not give $E$. Its field comes from adding up its pieces, as the integral lessons do.`,
    review: {lesson: 'symmetry', section: 'When it only looks symmetric'}},

  {id: 'symmetry-ball-surface', lesson: 'symmetry', kind: 'setup',
    prompt: raw`For the uniform ball, which closed surface through $P$, outside the ball, turns the flux into $E_r$ times an area?`,
    choices: [
      {correct: true, text: raw`A sphere through $P$, centred on the centre of the ball.`},
      {text: raw`A cube centred on the ball, with $P$ at the middle of one face.`, misconception: 'wrong-surface',
        why: raw`The flux through the cube is still $Q/\varepsilon_0$, but the ball’s field is radial, so on a face it is slanted to every patch but the middle one, and weaker toward the corners. $E$ cannot come out of that integral.`},
      {text: raw`A sphere through $P$, centred on $P$’s nearest point of the ball’s surface.`, misconception: 'wrong-surface',
        why: raw`The field is radial from the ball’s centre, not from that point, so on this sphere it crosses each patch at a different angle and has a different size. Centre the sphere where the symmetry is centred.`},
      {text: raw`The ball’s own surface: a Gaussian surface has to be a real object.`, misconception: 'surface-real',
        why: raw`A Gaussian surface is imaginary and drawn wherever it helps. For the direct calculation asked for, use a sphere through $P$. The ball’s own surface would directly give the field at its surface, rather than at $P$.`},
    ],
    explanation: raw`Every turn about the ball’s centre leaves it unchanged, so its field is radial from that centre and the same size at the same distance. On a sphere centred there, through $P$, the field is perpendicular to every patch and the same on all of them, so the flux is $E_r\,(4\pi r^2)$.`,
    review: {lesson: 'symmetry', stage: 'surface', case: 'sphere'}},

  {id: 'symmetry-line-left', lesson: 'symmetry', kind: 'setup',
    prompt: raw`The cylinder round the line has radius $r$ and length $L$. What does $\oint\vec E\cdot d\vec A$ come to over the whole closed cylinder?`,
    choices: [
      {correct: true, tex: raw`E_r\,(2\pi rL)`},
      {tex: raw`E_r\,(2\pi rL+2\pi r^2)`, misconception: 'parallel-patch',
        why: raw`On the two flat ends the field lies along the surface, so $\vec E\cdot d\vec A=0$ on every patch of them. Their area carries nothing; only the wall’s does.`},
      {tex: raw`E_r\,(2\pi r^2)`, misconception: 'parallel-patch',
        why: raw`That is the area of the two ends, which the field slides along and never crosses. The field crosses the curved wall, of area $2\pi rL$.`},
      {tex: raw`E_r\,(4\pi r^2)`, misconception: 'wrong-surface',
        why: raw`That is a sphere’s area. Round a line the field is radial from the axis, outward or inward, not radial from a point, so a sphere would see it slanted and of different sizes; the surface that fits is a cylinder.`},
    ],
    explanation: raw`On the curved wall $\vec E$ is perpendicular to every patch and has the same $E_r$ all over, so the wall carries $E_r$ times its area, $2\pi rL$. On the two ends $\vec E$ lies along the surface and carries nothing. The left side is $E_r\,(2\pi rL)+0+0$.`,
    review: {lesson: 'symmetry', stage: 'left', case: 'line'}},

  {id: 'symmetry-line-answer', lesson: 'symmetry', kind: 'check',
    prompt: raw`Which of these could be the field of the infinite line? Check each against what a right answer has to do.`,
    choices: [
      {correct: true, tex: raw`E_r=\frac{\lambda}{2\pi\varepsilon_0r}`},
      {tex: raw`E_r=\frac{\lambda L}{2\pi\varepsilon_0r}`, misconception: 'size-left-in',
        why: raw`$L$ is the length of an imaginary cylinder you chose. The field cannot depend on it: $\lambda L$ on the right and $2\pi rL$ on the left cancel it.`},
      {tex: raw`E_r=\frac{\lambda}{4\pi\varepsilon_0r^2}`, misconception: 'line-falloff',
        why: raw`That falls as $1/r^2$, as a point charge’s field does. A cylinder farther out encloses the same charge with a wall that grows only as $r$, so the line’s field falls only as $1/r$.`},
      {tex: raw`E_r=\frac{\lambda}{2\varepsilon_0}`, misconception: 'line-falloff',
        why: raw`A field that does not change with distance is a sheet’s. A line’s field must weaken as $P$ moves away, because the same charge is spread over a wider wall.`},
    ],
    explanation: raw`Setting $E_r\,(2\pi rL)$ equal to $\lambda L/\varepsilon_0$, the length cancels, as it must, and $E_r=\lambda/(2\pi\varepsilon_0r)=2k\lambda/r$. Its magnitude falls as $1/r$, and it agrees with the Infinite line lesson’s sum of pieces.`,
    review: {lesson: 'symmetry', stage: 'solve', case: 'line'}},

  {id: 'symmetry-pillbox-left', lesson: 'symmetry', kind: 'setup',
    prompt: raw`A pillbox stands across the sheet, its two faces of area $A$ at heights $z$ and $-z$. What does the flux out through it come to?`,
    choices: [
      {correct: true, tex: raw`2E_\perp A`},
      {tex: raw`E_\perp A`, misconception: 'pillbox-two',
        why: raw`The pillbox has two faces, one on each side of the sheet, and the field crosses both. Counting one gives twice the right field in the end.`},
      {tex: raw`0`, misconception: 'pillbox-two',
        why: raw`The fields on the two faces do point opposite ways, but so do the faces’ outward normals: on both faces the normal points away from the sheet. Each face carries $E_\perp A$, and they add.`},
      {tex: raw`2E_\perp A+E_\perp A_{\text{side}}`, misconception: 'parallel-patch',
        why: raw`On the pillbox’s side the field lies along the surface, so it carries nothing, however tall the side is. Only the two faces are crossed.`},
    ],
    explanation: raw`On each face $d\vec A$ points away from the sheet, along $\hat{\mathbf n}$, the way the field points for a positive $\sigma$, so each face carries $E_\perp A$, whichever the sign. The side carries nothing, since the field lies along it. The flux is $2E_\perp A$.`,
    review: {lesson: 'symmetry', stage: 'left', case: 'plane'}},

  {id: 'symmetry-sheet-height', lesson: 'symmetry', kind: 'predict',
    prompt: raw`How does the size of the infinite sheet’s field change as $P$ rises from just above the sheet to far above it?`,
    choices: [
      {correct: true, text: raw`It does not change: $E_\perp=\sigma/(2\varepsilon_0)$ at every height.`},
      {text: raw`It falls as $1/z^2$, like a point charge’s.`, misconception: 'sheet-falloff',
        why: raw`An infinite sheet has no size to measure the height against. The pillbox’s two faces see the same field wherever they are, and $z$ never enters the answer.`},
      {text: raw`It falls as $1/z$, like a line’s.`, misconception: 'sheet-falloff',
        why: raw`A line’s field falls because a farther cylinder’s wall is bigger. A pillbox’s faces are the same area $A$ at any height, enclosing the same $\sigma A$, so the field is the same too.`},
      {text: raw`It grows, because a taller pillbox encloses more charge.`, misconception: 'bigger-surface',
        why: raw`A taller pillbox cuts the same patch out of the sheet, of area $A$, so it encloses the same $\sigma A$ and carries the same flux.`},
    ],
    explanation: raw`With $2E_\perp A=\sigma A/\varepsilon_0$, both $A$ and the height drop out: $E_\perp=\sigma/(2\varepsilon_0)$ at every height above the sheet, pointing away from it for positive $\sigma$ and toward it for negative.`,
    review: {lesson: 'symmetry', stage: 'solve', case: 'plane'}},

  {id: 'symmetry-gives-size', lesson: 'symmetry', kind: 'predict',
    prompt: raw`Symmetry says the ball’s field is radial, with the same size at the same distance $r$ from its centre. What does it say about how big that size is?`,
    choices: [
      {correct: true, text: raw`Nothing more. How big $E_r$ is at each $r$ comes from Gauss’s law: the flux set equal to the charge inside.`},
      {text: raw`That $E_r$ falls as $1/r^2$, since the ball is spherical.`, misconception: 'symmetry-size',
        why: raw`Symmetry allows any size that depends on $r$ alone. The $1/r^2$ outside comes from the law: the charge inside stays $Q$ while the area grows as $r^2$. Inside the ball the same symmetry goes with a field proportional to $r$.`},
      {text: raw`That $E_r$ is the same at every $r$.`, misconception: 'symmetry-size',
        why: raw`Symmetry says the size is the same over each sphere, at one $r$, not that it is the same from one $r$ to the next. Turns about the centre never carry a point to a different distance.`},
    ],
    explanation: raw`Symmetry gives the shape of the field: which way it points, and on which surfaces its size is the same. That is what lets $E_r$ come out of the integral. The strength itself is then fixed by $E_r\,(4\pi r^2)=Q_{\text{enc}}/\varepsilon_0$.`,
    review: {lesson: 'symmetry', section: 'Three useful symmetries'}},

  {id: 'symmetry-negative-sheet', lesson: 'symmetry', kind: 'transfer',
    prompt: raw`Give the infinite sheet a negative charge. Which way does its field point?`,
    choices: [
      {correct: true, text: raw`Perpendicular to the sheet and toward it, on both sides: $E_\perp=\sigma/(2\varepsilon_0)$ is now negative.`},
      {text: raw`Toward the sheet above it, and away from it below.`, misconception: 'symmetry-forbids',
        why: raw`A mirror in the sheet’s own plane leaves the sheet unchanged and swaps its two sides, so the field below must be the mirror of the field above. If it points toward the sheet above, it points toward it below as well.`},
      {text: raw`Nowhere: on each side the sheet’s field cancels itself.`, misconception: 'sign',
        why: raw`A negative charge turns every arrow round; it does not make them cancel. On each side the field has the same size as a positive sheet’s, $|\sigma|/(2\varepsilon_0)$, pointing the other way, toward the sheet.`},
    ],
    explanation: raw`Nothing in the argument used the sign. The field is perpendicular to the sheet and mirrored across it; for a negative $\sigma$ the signed component $E_\perp$ is negative on both sides, so the field points toward the sheet from above and from below.`,
    review: {lesson: 'symmetry', stage: 'symmetry', case: 'plane'}},

  {id: 'symmetry-sample', lesson: 'symmetry', kind: 'check',
    prompt: raw`The cylinder round the infinite line encloses only a length $L$ of it, and the rest of the line lies outside. Does that spoil the answer?`,
    choices: [
      {correct: true, text: raw`No. The surface only has to pass through $P$ with the field the same all over its wall and perpendicular to it. The line outside helps make that field, and adds nothing to the net flux.`},
      {text: raw`Yes: Gauss’s law needs a surface that encloses all the charge, so it cannot be used on an infinite line.`, misconception: 'surface-real',
        why: raw`No surface could enclose all of an infinite line, and none needs to. Round a line or a sheet the surface only ever encloses a sample, and the law still gives the field.`},
      {text: raw`Yes: the line outside adds to the field, so the answer is too small.`, misconception: 'only-inside-field',
        why: raw`The $\vec E$ in the law is already the whole field, from all of the line. The part outside the cylinder puts no net flux through it, so the law, solved for $E$, gives the total field.`},
    ],
    explanation: raw`The $\vec E$ on the left is the field of the whole line; the right counts only the $\lambda L$ inside. The line outside is what makes the field the same all along the wall, and it adds zero to the net flux. So $E_r\,(2\pi rL)=\lambda L/\varepsilon_0$ gives the whole line’s field.`,
    review: {lesson: 'symmetry', section: 'What makes a surface useful'}},
];
