import type {Question} from '../types';
const raw = String.raw;

/* HOLES BY SUPERPOSITION, in its lesson's symbols (src/gauss/lessons/holes.ts): a ball of radius R and uniform ρ with
 * a round hole of radius b whose centre is a step d⃗ from the ball's, solved as a whole ball of ρ plus a plug of minus
 * ρ; r⃗₁ runs from the ball's centre to P and r⃗₂ from the hole's. In the hole, E⃗ = ρd⃗/(3ε₀). A rod with a hole drilled
 * along it gives ρd⃗/(2ε₀); a sheet of σ with a round hole of radius b gives, on the hole's axis, E_z = σz/(2ε₀√(z²+b²)).
 * Every result here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'holes-split', lesson: 'holes', kind: 'setup',
    prompt: raw`The ball with an off-centre hole is round about no point. How do you write it as charges that Gauss’s law can solve?`,
    choices: [
      {correct: true, text: raw`A whole ball of $\rho$, as if the hole were filled, plus a small ball of $-\rho$ filling the hole.`},
      {text: raw`A whole ball of $\rho$ plus a small ball of $\rho$ filling the hole.`, misconception: 'sign',
        why: raw`Where both sit the densities must add to what the hole holds, nothing: $\rho$ and $-\rho$ do, $\rho$ and $\rho$ make $2\rho$. The plug carries the opposite density.`},
      {text: raw`You cannot: with no centre to draw a sphere about, Gauss’s law is no help.`, misconception: 'law-fails',
        why: raw`No single sphere works, but each piece, the whole ball and the plug, is round about its own centre. Solve each by Gauss’s law and add the fields.`},
    ],
    explanation: raw`Filling the hole with $\rho$ and again with $-\rho$ changes nothing, since the two cancel. Grouped differently, the first filling makes a whole ball of $\rho$ and the second a ball of $-\rho$, each round about its own centre and each solved alone.`,
    review: {lesson: 'holes', stage: 'symmetry', case: 'ball'}},

  {id: 'holes-whole-ball', lesson: 'holes', kind: 'setup',
    prompt: raw`$P$ is in the hole, a distance $r_1$ from the ball’s centre. What field does the whole ball of $\rho$ make there, as a vector?`,
    choices: [
      {correct: true, tex: raw`\frac{\rho\,\vec r_1}{3\varepsilon_0}`},
      {tex: raw`\frac{\rho R^3}{3\varepsilon_0r_1^2}\,\hat{\mathbf r}_1`, misconception: 'qenc-total',
        why: raw`That counts the whole ball’s charge. A sphere of radius $r_1$ about its centre holds only $\rho\,\frac43\pi r_1^3$, so the field’s magnitude grows in step with $r_1$, along $\hat r_1$ with the sign of $\rho$.`},
      {tex: raw`0`, misconception: 'local-density',
        why: raw`The real hole is empty, but this question asks for the fictitious filled ball alone: it has density $\rho$ at $P$ too. Its field follows from the charge inside a sphere through $P$, $\rho\,\frac43\pi r_1^3$. The opposite-density plug is added afterward.`},
    ],
    explanation: raw`A sphere about the ball’s centre through $P$ holds $\rho\,\frac43\pi r_1^3$, so $E_1(4\pi r_1^2)=\rho\,\frac43\pi r_1^3/\varepsilon_0$ and $E_1=\rho r_1/(3\varepsilon_0)$ along $\hat{\mathbf r}_1$: as a vector, $\rho\vec r_1/(3\varepsilon_0)$.`,
    review: {lesson: 'holes', stage: 'right', case: 'ball'}},

  {id: 'holes-add', lesson: 'holes', kind: 'setup',
    prompt: raw`Add the whole ball’s field and the plug’s at $P$ in the hole. What do they come to?`,
    choices: [
      {correct: true, tex: raw`\frac{\rho}{3\varepsilon_0}\big(\vec r_1-\vec r_2\big)=\frac{\rho\,\vec d}{3\varepsilon_0}`},
      {tex: raw`\frac{\rho}{3\varepsilon_0}\big(r_1-r_2\big)\,\hat{\mathbf r}_1`, misconception: 'hole-vectors',
        why: raw`That subtracts the sizes and keeps the whole ball’s direction. The plug’s field points along its own radius, $\hat{\mathbf r}_2$, so the two add as vectors.`},
      {tex: raw`\frac{\rho}{3\varepsilon_0}\big(\vec r_1+\vec r_2\big)`, misconception: 'sign',
        why: raw`The plug carries $-\rho$, so its field is $-\rho\vec r_2/(3\varepsilon_0)$: added to the whole ball’s, it brings a minus sign of its own.`},
    ],
    explanation: raw`The whole ball gives $\rho\vec r_1/(3\varepsilon_0)$ and the plug $-\rho\vec r_2/(3\varepsilon_0)$. Their sum is $\rho(\vec r_1-\vec r_2)/(3\varepsilon_0)$, and $\vec r_1-\vec r_2$ is $\vec d$, the step from the ball’s centre to the hole’s, wherever $P$ is.`,
    review: {lesson: 'holes', stage: 'solve', case: 'ball'}},

  {id: 'holes-uniform', lesson: 'holes', kind: 'predict',
    prompt: raw`How does the field change from point to point in the ball’s hole?`,
    choices: [
      {correct: true, text: raw`It does not: it is the same everywhere in the hole, along $\vec d$ for a positive $\rho$, against it for a negative one.`},
      {text: raw`It points straight away from the ball’s centre, and grows toward the side of the hole farthest from it.`, misconception: 'hole-vectors',
        why: raw`That is the whole ball’s field alone. The plug’s field changes across the hole too, and added as vectors the two changes cancel, leaving $\rho\vec d/(3\varepsilon_0)$ everywhere.`},
      {text: raw`It points straight away from the hole’s centre, zero there and growing toward the hole’s edge.`, misconception: 'hole-vectors',
        why: raw`A field pointing out from the hole’s centre is what a ball of charge centred there would make, and the hole holds none. The whole ball’s and the plug’s fields, added, are one vector, the same at every point of the hole.`},
    ],
    explanation: raw`$\vec r_1-\vec r_2=\vec d$ at every point of the hole, so $\vec E=\rho\vec d/(3\varepsilon_0)$ there: uniform, and in general along neither radius. Drag $P$ across the hole and the two pieces’ fields change while their sum does not.`,
    review: {lesson: 'holes', section: 'Check the answer', case: 'ball'}},

  {id: 'holes-size', lesson: 'holes', kind: 'predict',
    prompt: raw`Make the hole bigger, keeping its centre where it was and all of it inside the ball. What happens to the field in it?`,
    choices: [
      {correct: true, text: raw`Nothing: it depends only on $\vec d$, how far the hole is off centre, not on its size.`},
      {text: raw`It grows, since more of the charge is gone.`, misconception: 'hole-vectors',
        why: raw`The hole’s radius never enters $\rho(\vec r_1-\vec r_2)/(3\varepsilon_0)$: inside a ball of $\pm\rho$ each field is a constant times the distance from its own centre, whatever the ball’s size.`},
      {text: raw`It shrinks, since $P$ is now farther from the charge round the hole.`, misconception: 'closer-stronger',
        why: raw`For spread-out charge, nearness alone does not set the field. Each piece’s field at $P$ is $\pm\rho/(3\varepsilon_0)$ times $P$’s step from that piece’s centre, so their sum stays $\rho\vec d/(3\varepsilon_0)$.`},
    ],
    explanation: raw`The plug’s field inside it, $-\rho\vec r_2/(3\varepsilon_0)$, does not depend on its radius $b$, so neither does the sum. Only the step $\vec d$ between the centres sets the field, so long as the hole lies wholly inside the ball.`,
    review: {lesson: 'holes', section: 'The field in a ball’s hole'}},

  {id: 'holes-centred', lesson: 'holes', kind: 'check',
    prompt: raw`Put the hole at the ball’s centre, so $\vec d=0$. The formula gives no field in the hole. Does Gauss’s law agree?`,
    choices: [
      {correct: true, text: raw`Yes: a sphere about the common centre, inside the hole, encloses no charge, and symmetry makes the field the same all over it, so it is zero.`},
      {text: raw`No: the ball’s charge all round the hole still makes a field in it.`, misconception: 'shell-inside',
        why: raw`The charge round a centred hole is a set of uniform shells, and a uniform shell makes no field anywhere inside it.`},
      {text: raw`Only at the very centre; elsewhere in the hole the nearer charge wins.`, misconception: 'shell-inside',
        why: raw`A uniform shell makes no field anywhere inside it, not only at its centre: the near part is closer, but there is less of it in each cone of directions.`},
    ],
    explanation: raw`With the hole centred, the charge is round about one point again, and a sphere in the hole encloses nothing. With $E_r$ the same all over that sphere, zero flux means zero field, as $\rho\vec d/(3\varepsilon_0)$ with $\vec d=0$ says.`,
    review: {lesson: 'holes', section: 'Check the answer', case: 'ball'}},

  {id: 'holes-rod', lesson: 'holes', kind: 'transfer',
    prompt: raw`An infinite rod of uniform $\rho$ has a hole drilled along it, the hole’s axis a step $\vec d$ from the rod’s, perpendicular to both. What is the field in the hole?`,
    choices: [
      {correct: true, tex: raw`\frac{\rho\,\vec d}{2\varepsilon_0}`},
      {tex: raw`\frac{\rho\,\vec d}{3\varepsilon_0}`, misconception: 'ratio-power',
        why: raw`That is the ball’s. Inside a uniform rod a cylinder of length $L$ holds $\rho\pi r^2L$ against a wall of $2\pi rL$, so each piece’s field is $\rho\vec r/(2\varepsilon_0)$, with a two, not a three.`},
      {tex: raw`0`, misconception: 'local-density',
        why: raw`The hole holds no charge, but the charge round it is lopsided. The rod and the plug of $-\rho$ each make a field there, and their sum is not zero unless the hole is on the axis.`},
    ],
    explanation: raw`Each piece gives $\pm\rho\vec r/(2\varepsilon_0)$, with $\vec r$ perpendicular to its own axis, from a cylinder about that axis. Their sum is $\rho(\vec r_1-\vec r_2)/(2\varepsilon_0)=\rho\vec d/(2\varepsilon_0)$: uniform again, half as big again as a ball’s for the same $\rho$ and step.`,
    review: {lesson: 'holes', section: 'A rod with a hole drilled along it'}},

  {id: 'holes-disc', lesson: 'holes', kind: 'transfer',
    prompt: raw`An infinite sheet of $\sigma$ has a round hole of radius $b$: a whole sheet plus a disk of $-\sigma$. Why does the disk’s symmetry alone not give its field through Gauss’s law?`,
    choices: [
      {correct: true, text: raw`The disk’s axial symmetry alone does not relate the total flux to its field at a chosen point. Its field on its axis comes from adding its rings.`},
      {text: raw`It can: a pillbox across the disk gives $-\sigma/(2\varepsilon_0)$, as for a sheet.`, misconception: 'false-symmetry',
        why: raw`That needs the charge to run on for ever across the plane. Near a disk’s edge its field leans and changes from place to place, so $E$ does not come out of the pillbox’s integral.`},
      {text: raw`It can: a sphere round the disk encloses $-\sigma\pi b^2$, and gives a point charge’s field.`, misconception: 'wrong-surface',
        why: raw`The sphere’s flux is right, but a disk is not round about a point: its field slants to the sphere and changes over it, so no division gives $E$.`},
    ],
    explanation: raw`Superposition does not care where a piece’s field came from. The whole sheet is Gauss’s, $\sigma/(2\varepsilon_0)$; the disk’s field on its axis is the Disk lesson’s, added ring by ring. Together, $E_z=\sigma z/\big(2\varepsilon_0\sqrt{z^2+b^2}\big)$ above the hole.`,
    review: {lesson: 'holes', stage: 'surface', case: 'sheet'}},

  {id: 'holes-far-above', lesson: 'holes', kind: 'check',
    prompt: raw`On the axis of the sheet’s hole, $E_z=\sigma z/\big(2\varepsilon_0\sqrt{z^2+b^2}\big)$. What does it tend to far above, $z\gg b$?`,
    choices: [
      {correct: true, text: raw`$\sigma/(2\varepsilon_0)$, the whole sheet’s: from far away the hole is too small to matter.`},
      {text: raw`Zero: far from the hole, the field dies away.`, misconception: 'sheet-falloff',
        why: raw`The hole is in an infinite sheet, whose own field does not fall with height. Far above, the disk of $-\sigma$ looks small and its field fades, leaving the sheet’s.`},
      {text: raw`$\sigma/\varepsilon_0$: the sheet’s and the disk’s fields add.`, misconception: 'sign',
        why: raw`The disk carries $-\sigma$, so its field points against the sheet’s, and far above, where the disk looks small, its field is almost nothing.`},
    ],
    explanation: raw`For $z\gg b$, $z/\sqrt{z^2+b^2}\to1$ and $E_z\to\sigma/(2\varepsilon_0)$. At the other end, in the hole’s plane at its centre, $z=0$ gives zero: there the sheet’s charge lies evenly all round.`,
    review: {lesson: 'holes', section: 'Check the answer', case: 'sheet'}},

  {id: 'holes-negative', lesson: 'holes', kind: 'transfer',
    prompt: raw`Give the ball with the hole a negative $\rho$. Which way does the field in the hole point?`,
    choices: [
      {correct: true, text: raw`Against $\vec d$, the way from the hole’s centre to the ball’s, and the same at every point of the hole.`},
      {text: raw`Along $\vec d$ still: $\vec d$ fixes the direction whatever the charge.`, misconception: 'sign',
        why: raw`$\rho\vec d/(3\varepsilon_0)$ takes the sign of $\rho$. A negative $\rho$ turns every arrow round, so the field points against $\vec d$.`},
      {text: raw`Toward the ball’s centre from each point, along $-\hat{\mathbf r}_1$.`, misconception: 'hole-vectors',
        why: raw`That is the whole ball’s field alone. Adding the plug’s, now of positive density, leaves $\rho\vec d/(3\varepsilon_0)$: one direction, the same at every point, in general not toward the ball’s centre.`},
    ],
    explanation: raw`Nothing in the argument used the sign: $\vec E=\rho\vec d/(3\varepsilon_0)$ in the hole for either. For a negative $\rho$ it points against $\vec d$, uniform across the hole.`,
    review: {lesson: 'holes', stage: 'solve', case: 'ball'}},
];
