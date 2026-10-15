import type {Question} from '../types';
const raw = String.raw;

/* THE RING'S POTENTIAL, ON ITS AXIS, in its lesson's symbols (src/lessons/v-ring.ts): radius R, charge Q,
 * λ = Q/(2πR), θ round the ring, ΔQ = λRΔθ, P = (0, 0, z), every piece rᵢ = √(R² + z²) from P, ΔV = kΔQ/rᵢ, relative
 * to infinity. V is a number: nothing cancels, the sum is exact at any cut, and E_z = −dV/dz on the axis. Every
 * result and limit here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'v-ring-partner', lesson: 'v-ring', kind: 'predict',
    prompt: raw`For the field, the length of ring half a turn round undid each piece’s sideways part. For the potential at $P$, what does that length of ring do?`,
    choices: [
      {correct: true, text: raw`It adds exactly as much again: a potential has no direction, and all of the charge has one sign.`},
      {text: raw`It cancels the piece’s sideways part, as it did for the field.`, misconception: 'potential-arrow',
        why: raw`A potential is a number, with no sideways part to cancel. Each piece adds $k\,\Delta Q/r_i$, and the length of ring opposite, just as far away, adds the same.`},
      {text: raw`It cancels the piece altogether, so $V$ on the axis is zero.`, misconception: 'potential-arrow',
        why: raw`Two numbers of the same sign do not cancel. Potentials cancel only between charges of opposite sign, and all of this ring’s charge has one sign.`},
    ],
    explanation: raw`Each piece adds $k\,\Delta Q/r_i$ to $V$, a number with the sign of its charge. The length of ring straight across is the same distance from $P$ and holds the same charge, so it adds exactly as much. Nothing cancels: no angles, no projection.`,
    review: {lesson: 'v-ring', stage: 'cancel'}},

  {id: 'v-ring-dv', lesson: 'v-ring', kind: 'setup',
    prompt: raw`What does one piece of the ring, holding $\Delta Q$, add to the potential at $P$?`,
    choices: [
      {correct: true, tex: raw`\Delta V=\frac{k\,\Delta Q}{\sqrt{R^2+z^2}}`},
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{R^2+z^2}`, misconception: 'potential-power',
        why: raw`That is the size of a piece’s field, which falls as the inverse square. A potential falls as $1/r_i$, one power lower.`},
      {tex: raw`\Delta V=\frac{k\,\Delta Q\,z}{(R^2+z^2)^{3/2}}`, misconception: 'potential-arrow',
        why: raw`That is the piece’s field along the axis, with the projection $\cos\alpha=z/r_i$. A potential has no direction, so there is nothing to project.`},
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{z}`, misconception: 'fixed-distance',
        why: raw`$z$ is the distance from $P$ to the ring’s centre, where there is no charge. Every piece is $r_i=\sqrt{R^2+z^2}$ from $P$.`},
    ],
    explanation: raw`A point charge’s potential is $k$ times its charge over its distance, to the first power and with no direction. Every piece is $r_i=\sqrt{R^2+z^2}$ from $P$, the hypotenuse of a right triangle with legs $R$ and $z$.`,
    review: {lesson: 'v-ring', stage: 'piece'}},

  {id: 'v-ring-result', lesson: 'v-ring', kind: 'setup',
    prompt: raw`Add up every piece’s share. What is $V$ at $P$?`,
    choices: [
      {correct: true, tex: raw`V=\frac{kQ}{\sqrt{R^2+z^2}}`},
      {tex: raw`V=\frac{kQ}{z}`, misconception: 'ring-point',
        why: raw`That is a point charge $Q$ at the ring’s centre, right only far away, $z\gg R$. Every piece is $\sqrt{R^2+z^2}$ from $P$, farther than the centre.`},
      {tex: raw`V=\frac{kQ}{R}`, misconception: 'fixed-distance',
        why: raw`That is $V$ at the centre, where every piece is $R$ away. At a height $z$ each piece is $\sqrt{R^2+z^2}$ away.`},
      {tex: raw`V=0`, misconception: 'potential-arrow',
        why: raw`Nothing cancels in a potential when all of the charge has one sign: every piece adds a number with that sign.`},
    ],
    explanation: raw`Every piece is the same distance $\sqrt{R^2+z^2}$ from $P$, so $k/\sqrt{R^2+z^2}$ comes out of the sum and the charges add to $Q$: $V=kQ/\sqrt{R^2+z^2}$, exact however the ring is cut.`,
    review: {lesson: 'v-ring', stage: 'add'}},

  {id: 'v-ring-gradient', lesson: 'v-ring', kind: 'setup',
    prompt: raw`$V=kQ/\sqrt{R^2+z^2}$ all along the axis. What is the field there?`,
    choices: [
      {correct: true, tex: raw`E_z=-\frac{dV}{dz}=\frac{kQz}{(R^2+z^2)^{3/2}}`},
      {tex: raw`E_z=-\frac{kQz}{(R^2+z^2)^{3/2}}`, misconception: 'gradient-sign',
        why: raw`That is $+dV/dz$, with the minus left out. The field points the way $V$ falls; without the minus a positive ring’s field would point toward it.`},
      {tex: raw`E_z=\frac{kQ}{R^2+z^2}`, misconception: 'gradient',
        why: raw`That divides $V$ by the distance instead of differentiating it, and so misses that only $z/\sqrt{R^2+z^2}$ of each piece’s field lies along the axis. Differentiating the root brings that factor down.`},
    ],
    explanation: raw`On the axis symmetry leaves the field only its part along the axis, and it points the way $V$ falls, so $E_z=-dV/dz$. Differentiating $(R^2+z^2)^{-1/2}$ brings down $-\tfrac12\cdot2z$, and the two minuses make $E_z=kQz/(R^2+z^2)^{3/2}$: the ring’s field, found with no vectors.`,
    review: {lesson: 'v-ring', section: 'Differentiate back'}},

  {id: 'v-ring-centre', lesson: 'v-ring', kind: 'check',
    prompt: raw`At the centre of the ring, $z=0$, the field is zero. What is the potential there?`,
    choices: [
      {correct: true, tex: raw`V=\frac{kQ}{R}`},
      {tex: raw`V=0`, misconception: 'potential-zero-field',
        why: raw`A zero field means $V$ is level there, not that it is zero. Every piece is still $R$ from the centre and adds $k\,\Delta Q/R$ with the sign of its charge.`},
      {tex: raw`V\to\infty`, misconception: 'ring-point',
        why: raw`$V$ grows without end only right beside a charge, and the centre has none: every piece is $R$ away. The ring is not a point charge at its centre.`},
      {tex: raw`V=\frac{kQ}{R^2}`, misconception: 'potential-power',
        why: raw`That has the inverse square of a field. A potential falls as $1/R$: every piece adds $k\,\Delta Q/R$.`},
    ],
    explanation: raw`At the centre every piece is $R$ away, so $V=kQ/R$, finite and with the sign of $Q$. The field there is zero because $V$ is level at the centre: its size is largest there and falls off both ways along the axis.`,
    review: {lesson: 'v-ring', section: 'What the answer says'}},

  {id: 'v-ring-far', lesson: 'v-ring', kind: 'check',
    prompt: raw`Move $P$ far up the axis, $z\gg R$. What does $V$ approach?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{z}`},
      {tex: raw`\frac{kQ}{z^2}`, misconception: 'potential-power',
        why: raw`That falls as the inverse square, as a point charge’s field does. A point charge’s potential falls as $1/z$, one power lower.`},
      {tex: raw`\frac{kQ}{R}`, misconception: 'fixed-distance',
        why: raw`That is $V$ at the centre. Far up the axis every piece is nearly $z$ from $P$, and $V$ falls with that distance.`},
    ],
    explanation: raw`When $z\gg R$, $\sqrt{R^2+z^2}$ is nearly $z$, so $V$ tends to $kQ/z$: the potential of a point charge $Q$ at the centre, one power of distance softer than the field’s $kQ/z^2$.`,
    review: {lesson: 'v-ring', section: 'What the answer says'}},

  {id: 'v-ring-climb', lesson: 'v-ring', kind: 'predict',
    prompt: raw`Start at the centre of the ring and move $P$ up the axis. What does the size of $V$ do?`,
    choices: [
      {correct: true, text: raw`It falls steadily, from $k|Q|/R$ at the centre toward zero far away.`},
      {text: raw`It rises to a largest value at $z=R/\sqrt2$, then falls, as the field does.`, misconception: 'field-for-potential',
        why: raw`The field peaks because close in its pieces’ arrows turn sideways and cancel. $V$ has no arrows: every piece adds $k\,\Delta Q/r_i$, and every $r_i$ grows as $P$ rises.`},
      {text: raw`It stays the same, since every piece is the same distance from $P$.`, misconception: 'fixed-distance',
        why: raw`Every piece is the same distance from $P$ as every other, but that distance, $\sqrt{R^2+z^2}$, grows as $P$ moves up.`},
    ],
    explanation: raw`$|V|=k|Q|/\sqrt{R^2+z^2}$, and the root only grows with $z$, so the size of $V$ falls steadily from its value at the centre. The field is minus the slope of this curve: zero at the centre, where the curve is level, and largest where $V$ falls fastest, at $z=R/\sqrt2$.`,
    review: {lesson: 'v-ring', section: 'What the answer says'}},

  {id: 'v-ring-off-axis', lesson: 'v-ring', kind: 'transfer',
    prompt: raw`$E_z=-dV/dz$ gives the field on the axis. Why can this $V$ not give the field at a point off the axis?`,
    choices: [
      {correct: true, text: raw`It is known only along the axis; off the axis the field has a sideways part, which needs how $V$ changes sideways.`},
      {text: raw`It can: off the axis the field is also $-dV/dz$, with this same $V$.`, misconception: 'gradient-one-line',
        why: raw`$-dV/dz$ is only the field’s part along $z$, and only where this $V$ holds, on the axis. Off it the field has a sideways part too, and $V$ there is a different function.`},
      {text: raw`It need not: off the axis the field is zero, since the pieces’ fields cancel.`, misconception: 'cancel-survivor',
        why: raw`Off the axis the pieces are no longer all the same distance from $P$, so their sideways parts no longer cancel in pairs. The field there has a sideways part.`},
    ],
    explanation: raw`A derivative needs the function along the direction you differentiate in. $V=kQ/\sqrt{R^2+z^2}$ holds only on the axis, so it gives the rate of change along the axis, which is the whole field there because symmetry cancels the sideways parts. Off the axis that symmetry is gone, and the field has a sideways part that $V$ on the axis cannot tell.`,
    review: {lesson: 'v-ring', section: 'Differentiate back'}},

  {id: 'v-ring-negative', lesson: 'v-ring', kind: 'transfer',
    prompt: raw`Give the ring a negative charge. What is $V$ at $P$, on its axis?`,
    choices: [
      {correct: true, text: raw`Negative, the same size as a positive ring’s: $V$ has the sign of $Q$.`},
      {text: raw`Positive: a potential has no direction, so it has no sign either.`, misconception: 'sign',
        why: raw`No direction does not mean no sign. Each piece adds $k\,\Delta Q/r_i$, and with $\Delta Q$ negative every one of those numbers is negative.`},
      {text: raw`The same size, but pointing toward the ring.`, misconception: 'potential-arrow',
        why: raw`A potential does not point anywhere. It is a number, and a negative charge makes it negative; it is the field that points toward a negative ring.`},
    ],
    explanation: raw`Every piece’s $k\,\Delta Q/r_i$ has the sign of its charge, so with $Q$ negative they are all negative and add to $V=kQ/\sqrt{R^2+z^2}$: negative, and the same size as before.`,
    review: {lesson: 'v-ring', section: 'One piece'}},
];
