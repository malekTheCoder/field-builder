import type {Question} from '../types';
const raw = String.raw;

/* THE POTENTIAL ON THE BISECTOR, in its lesson's symbols (src/lessons/v-rod-bisector.ts): the bisector's rod,
 * length L and charge Q on the y-axis centred on the origin, λ = Q/L, P = (r, 0), a piece at height y holding
 * ΔQ = λΔy, rᵢ = √(y² + r²), ΔV = kΔQ/rᵢ. A number, not an arrow: nothing to project, and the mirror piece
 * adds the same amount instead of cancelling. V = 2kλ ln((L/2 + √((L/2)² + r²))/r), measured from zero at
 * infinity; E_x = −dV/dr, the only part V on this line can give. Every result and limit here is checked by
 * number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'v-rod-bisector-piece', lesson: 'v-rod-bisector', kind: 'setup',
    prompt: raw`What does the piece at height $y$, holding $\Delta Q$, add to the potential at $P$?`,
    choices: [
      {correct: true, tex: raw`\Delta V=\frac{k\,\Delta Q}{\sqrt{y^2+r^2}}`},
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{y^2+r^2}`, misconception: 'potential-power',
        why: raw`That uses the field’s inverse-square rule. Its potential falls with one power of its distance, not two.`},
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{\sqrt{y^2+r^2}}\cdot\frac{r}{\sqrt{y^2+r^2}}`, misconception: 'potential-arrow',
        why: raw`That projects the potential onto $x$, as if it were an arrow. A potential is a number with no direction: there is nothing to project.`},
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{r}`, misconception: 'fixed-distance',
        why: raw`$r$ is how far $P$ is from the rod’s middle. The piece at height $y$ is farther, $r_i=\sqrt{y^2+r^2}$, and its own distance is the one that counts.`},
    ],
    explanation: raw`A point charge’s potential is $k$ times its charge over its distance, with no direction at all. The piece is $r_i=\sqrt{y^2+r^2}$ from $P$, so it adds $k\,\Delta Q/r_i$, a number with the sign of its charge.`,
    review: {lesson: 'v-rod-bisector', stage: 'piece'}},

  {id: 'v-rod-bisector-mirror', lesson: 'v-rod-bisector', kind: 'predict',
    prompt: raw`For the field, a piece’s mirror at $-y$ cancelled its part along the rod. What does the mirror do to the potential at $P$?`,
    choices: [
      {correct: true, text: raw`It adds exactly as much again: it is the same distance from $P$, and its charge has the same sign.`},
      {text: raw`It cancels the piece’s potential, as it cancelled the field’s part along the rod.`, misconception: 'potential-arrow',
        why: raw`Cancelling needs something with a direction, or charges of opposite sign. A potential is a number, and the mirror’s charge has the same sign, so it adds.`},
      {text: raw`It adds only its part along $x$.`, misconception: 'potential-arrow',
        why: raw`A potential has no parts: it is a single number, $k\,\Delta Q/r_i$, with no direction to split into $x$ and $y$.`},
    ],
    explanation: raw`The piece at $y$ and its mirror at $-y$ are the same distance $r_i$ from $P$ and hold the same charge, so each adds $k\,\Delta Q/r_i$. Where the field’s mirror cancelled, the potential’s doubles, which is why the integral can be written as twice the upper half.`,
    review: {lesson: 'v-rod-bisector', stage: 'cancel'}},

  {id: 'v-rod-bisector-integral', lesson: 'v-rod-bisector', kind: 'setup',
    prompt: raw`Which integral is the potential at $P$?`,
    choices: [
      {correct: true, tex: raw`V=2k\lambda\int_0^{L/2}\frac{dy}{\sqrt{y^2+r^2}}`},
      {tex: raw`V=k\lambda\int_0^{L/2}\frac{dy}{\sqrt{y^2+r^2}}`, misconception: 'bounds',
        why: raw`That is the upper half of the rod alone. The lower half, piece for piece the same distance from $P$, adds as much again: hence the two.`},
      {tex: raw`V=2k\lambda\int_0^{L/2}\frac{r\,dy}{(y^2+r^2)^{3/2}}`, misconception: 'potential-arrow',
        why: raw`That is the field’s integrand, with its inverse square and its projection $r/r_i$. A potential is a number: one power of the distance, and no projection.`},
      {tex: raw`V=\int_{-L/2}^{L/2}\frac{k\lambda\,dy}{y^2+r^2}`, misconception: 'potential-power',
        why: raw`That puts the square of the distance under the charge, as a field does. A potential falls as $1/r_i$.`},
    ],
    explanation: raw`Each piece adds $k\lambda\,dy/\sqrt{y^2+r^2}$, and mirror pieces add equally, so the integral over $-L/2$ to $L/2$ is twice the upper half. With $y=r\tan\alpha$ the integrand becomes $\sec\alpha\,d\alpha$, and $V=2k\lambda\ln\bigl((L/2+\sqrt{(L/2)^2+r^2})/r\bigr)$.`,
    review: {lesson: 'v-rod-bisector', stage: 'shrink'}},

  {id: 'v-rod-bisector-easier', lesson: 'v-rod-bisector', kind: 'predict',
    prompt: raw`Why is the potential here easier to add up than the field?`,
    choices: [
      {correct: true, text: raw`Each piece adds a number: no components, no projection, one sum.`},
      {text: raw`Its pieces cancel in mirror pairs, so there is less left to add.`, misconception: 'potential-arrow',
        why: raw`For the potential nothing cancels: mirror pieces add the same amount. It is easier because there is only one sum of numbers, not because anything drops out.`},
      {text: raw`It falls faster with distance, so the far pieces can be left out.`, misconception: 'potential-power',
        why: raw`A potential falls as $1/r_i$, more slowly than the field’s $1/r_i^2$, so the far pieces matter more for it, not less. None can be left out.`},
    ],
    explanation: raw`A field is an arrow: each piece’s must be split into parts, and the parts added separately. A potential is a number: each piece adds $k\,\Delta Q/r_i$, and one sum of numbers is the whole job.`,
    review: {lesson: 'v-rod-bisector', stage: 'add'}},

  {id: 'v-rod-bisector-far', lesson: 'v-rod-bisector', kind: 'check',
    prompt: raw`Move $P$ far from the rod, $r\gg L$. What does $V$ approach?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{r}`},
      {tex: raw`\frac{kQ}{r^2}`, misconception: 'potential-power',
        why: raw`That is a point charge’s field. A point charge’s potential falls one power of the distance more softly: $kQ/r$.`},
      {tex: raw`\frac{2k\lambda}{r}`, misconception: 'far-limit',
        why: raw`That is the field of an endless line, not a potential, and it is what a long rod looks like from close to its middle. Far from a finite rod, it looks like a point.`},
    ],
    explanation: raw`When $r\gg L$ every piece is nearly $r$ from $P$, so the rod acts as its whole charge at one point and $V$ tends to $kQ/r$. The error in that is of order $(L/r)^2$.`,
    review: {lesson: 'v-rod-bisector', section: 'Limiting cases'}},

  {id: 'v-rod-bisector-grow', lesson: 'v-rod-bisector', kind: 'check',
    prompt: raw`Hold $\lambda$ fixed and let the rod grow until $L$ is far longer than $r$. What happens to $V$ at $P$?`,
    choices: [
      {correct: true, text: raw`Its size grows without bound: $V$ goes as $2k\lambda\ln(L/r)$, and an endless line has no potential measured from infinity.`},
      {text: raw`It settles at $2k\lambda/r$.`, misconception: 'potential-power',
        why: raw`That is the endless line’s field, which does settle. The potential adds pieces that fall only as $1/r_i$, and the far ones never stop adding: its magnitude grows as a logarithm of $L$.`},
      {text: raw`It falls to zero, as the charge spreads out.`, misconception: 'held-total-charge',
        why: raw`That happens with $Q$ held fixed. With $\lambda$ fixed the rod gains charge as it grows, and every new piece adds to $V$ with the same sign.`},
    ],
    explanation: raw`For $L\gg r$ the logarithm’s argument is nearly $L/r$, so $V$ goes as $2k\lambda\ln(L/r)$ and its size grows without end. For an endless line only differences of potential mean anything: $V(r_1)-V(r_2)=2k\lambda\ln(r_2/r_1)$.`,
    review: {lesson: 'v-rod-bisector', section: 'Limiting cases'}},

  {id: 'v-rod-bisector-gradient', lesson: 'v-rod-bisector', kind: 'check',
    prompt: raw`You have $V(r)$ along the bisector. How do you get the field at $P$ from it?`,
    choices: [
      {correct: true, tex: raw`E_x=-\frac{dV}{dr}`},
      {tex: raw`E_x=\frac{dV}{dr}`, misconception: 'gradient-sign',
        why: raw`For a positive rod $V$ falls as $P$ moves away, so $dV/dr$ is negative, and that would point the field toward the rod. The field points the way $V$ falls: $E_x=-dV/dr$.`},
      {tex: raw`E_x=\frac{V}{r}`, misconception: 'gradient',
        why: raw`Dividing by the distance agrees with the derivative when $V$ is proportional to $1/r$, with zero at infinity, as outside a spherical shell. This rod’s logarithmic potential has a different derivative.`},
      {tex: raw`E_x=-\frac{dV}{dy}`, misconception: 'gradient-one-line',
        why: raw`$dV/dy$ is how fast $V$ changes as $P$ moves parallel to the rod: it would give the part along the rod, and $V(r)$ on this line cannot give it. The part along $x$ comes from moving $P$ out along $x$.`},
    ],
    explanation: raw`A part of the field is minus the rate at which $V$ changes as $P$ moves that way. Moving $P$ out along the bisector, $E_x=-dV/dr=kQ/\bigl(r\sqrt{(L/2)^2+r^2}\bigr)$: the bisector’s field, found without a single arrow.`,
    review: {lesson: 'v-rod-bisector', section: 'Differentiate back'}},

  {id: 'v-rod-bisector-ey', lesson: 'v-rod-bisector', kind: 'transfer',
    prompt: raw`$V(r)$, known only along the bisector, gave $E_x$. What does it say about $E_y$, the part along the rod?`,
    choices: [
      {correct: true, text: raw`Nothing: $E_y$ is minus how fast $V$ changes as $P$ moves parallel to the rod, off this line. Here symmetry, not $V(r)$, makes it zero.`},
      {text: raw`$E_y=-dV/dr$ as well, since a potential has no direction.`, misconception: 'gradient-one-line',
        why: raw`Differentiating along $r$ gives the part along $r$ only. The potential has no direction, but the field does, and each of its parts needs $V$ to change in that direction.`},
      {text: raw`$E_y$ is $-dV/dr$ times $\sin\alpha$.`, misconception: 'gradient-one-line',
        why: raw`There is no single $\alpha$ for the whole rod, and $dV/dr$ holds no information about moving parallel to it. Finding $E_y$ from $V$ needs $V$ off the bisector.`},
    ],
    explanation: raw`$-dV/dr$ is the part of the field along the direction $P$ moved. $E_y$ would need $V$ at points just above and below the bisector, which $V(r)$ does not give. It is zero here because each piece has a mirror, so the field’s parts along the rod cancel.`,
    review: {lesson: 'v-rod-bisector', section: 'Differentiate back'}},

  {id: 'v-rod-bisector-negative', lesson: 'v-rod-bisector', kind: 'transfer',
    prompt: raw`Give the rod a negative charge. What is the potential at $P$?`,
    choices: [
      {correct: true, text: raw`Negative: every piece adds a negative number, and nothing cancels.`},
      {text: raw`Positive: a potential has no direction, so it has no sign either.`, misconception: 'sign',
        why: raw`No direction does not mean no sign. Each piece adds $k\,\Delta Q/r_i$, and with $\Delta Q$ negative that is a negative number.`},
      {text: raw`A potential pointing toward the rod.`, misconception: 'potential-arrow',
        why: raw`A potential does not point anywhere: it is a number. It is the field, $-dV/dr$, that points toward a negative rod.`},
    ],
    explanation: raw`The logarithm’s argument is a ratio of lengths greater than one, so the logarithm is positive and $V$ has the sign of $Q$. Every piece of a negative rod adds a negative number, and their sum is negative.`,
    review: {lesson: 'v-rod-bisector', section: 'What the answer says'}},
];
