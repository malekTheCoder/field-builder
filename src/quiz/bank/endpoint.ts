import type {Question} from '../types';
const raw = String.raw;

/* THE ROD LEVEL WITH ONE END, in its lesson's symbols (src/lessons/endpoint.ts): a rod of length L and charge
 * Q standing on the y-axis from y = 0 to y = L, λ = Q/L, P = (r, 0) level with its lower end, a piece at
 * height y holding ΔQ = λΔy, rᵢ = √(y² + r²), α the angle at P to the x-axis, ΔE_x = ΔE cos α and
 * ΔE_y = −ΔE sin α. No piece has a mirror, so both components survive; here we integrate each separately. Every
 * result and limit here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'endpoint-what-cancels', lesson: 'endpoint', kind: 'predict',
    prompt: raw`$P$ is level with the rod’s lower end, a distance $r$ out. Which parts of the pieces’ fields cancel at $P$?`,
    choices: [
      {correct: true, text: raw`None: the whole rod is above the $x$-axis, so no piece has a mirror partner below it.`},
      {text: raw`The parts along the rod cancel, as they do beside its middle.`, misconception: 'cancel-survivor',
        why: raw`Beside the middle, each piece’s part along the rod was undone by a mirror piece below $P$’s level. Here there is no rod below $P$’s level, so there are no mirrors, and those parts all point the same way.`},
      {text: raw`The parts along $x$ cancel; the parts along the rod add.`, misconception: 'cancel-survivor',
        why: raw`Every piece is on the same side of $P$ along $x$, so every part along $x$ points the same way: away from the rod for a positive charge. Those parts add.`},
    ],
    explanation: raw`Cancellation needs equal and opposite components. Equal-charge mirror pieces would provide them. Every piece of this rod lies above the $x$-axis, the line through $P$, so none has a partner: both parts of every piece survive, and the field leans.`,
    review: {lesson: 'endpoint', stage: 'cancel'}},

  {id: 'endpoint-direction', lesson: 'endpoint', kind: 'predict',
    prompt: raw`For a positive rod, which way does the field at $P$ point?`,
    choices: [
      {correct: true, text: raw`Away from the rod and down, below the $x$-axis.`},
      {text: raw`Straight along $+x$, away from the rod.`, misconception: 'cancel-survivor',
        why: raw`That would need the parts along the rod to cancel, and they have no partners to cancel against. Every piece is above $P$, so every piece’s field at $P$ points a little down.`},
      {text: raw`Away from the rod and up, above the $x$-axis.`, misconception: 'sign',
        why: raw`Each piece’s field at $P$ points away from that piece, for a positive charge. Every piece is above $P$, so away from it is down, not up.`},
    ],
    explanation: raw`A positive piece at height $y$ has a field at $P$ along the line from the piece to $P$: out along $x$ and down. No piece is below $P$’s level to give a part pointing up, so $E_x>0$ and $E_y<0$ for a positive rod, and both reverse for a negative one.`,
    review: {lesson: 'endpoint', section: 'What the answer says'}},

  {id: 'endpoint-ey-integrand', lesson: 'endpoint', kind: 'setup',
    prompt: raw`Which integral gives $E_y$, the part of the field along the rod?`,
    choices: [
      {correct: true, tex: raw`E_y=-\int_0^L\frac{k\lambda\,y\,dy}{(y^2+r^2)^{3/2}}`},
      {tex: raw`E_y=\int_0^L\frac{k\lambda\,y\,dy}{(y^2+r^2)^{3/2}}`, misconception: 'sign',
        why: raw`That drops the minus. Every piece is above $P$, so for a positive charge its field at $P$ points down, $-y$: the part along the rod is $-\Delta E\sin\alpha$.`},
      {tex: raw`E_y=-\int_0^L\frac{k\lambda\,r\,dy}{(y^2+r^2)^{3/2}}`, misconception: 'wrong-part',
        why: raw`$r/\sqrt{y^2+r^2}$ is $\cos\alpha$, the part along $x$. The part along the rod is opposite the angle at $P$, so it takes $\sin\alpha=y/\sqrt{y^2+r^2}$.`},
      {tex: raw`E_y=0`, misconception: 'cancel-survivor',
        why: raw`$E_y$ vanished beside the middle because each piece had a mirror below $P$’s level. Here none has, so the parts along the rod all point the same way and add.`},
    ],
    explanation: raw`Each piece’s part along the rod is $-\Delta E\sin\alpha$, with $\sin\alpha=y/\sqrt{y^2+r^2}$; the minus says that, for a positive charge, it points down, away from the piece. With $u=y^2+r^2$ the integral is $E_y=-k\lambda\bigl(1/r-1/\sqrt{L^2+r^2}\bigr)$.`,
    review: {lesson: 'endpoint', stage: 'cancel'}},

  {id: 'endpoint-bounds', lesson: 'endpoint', kind: 'setup',
    prompt: raw`With each piece’s field written in $y$, which bounds give the whole rod?`,
    choices: [
      {correct: true, tex: raw`\int_{0}^{L}\cdots\,dy`},
      {tex: raw`\int_{-L/2}^{L/2}\cdots\,dy`, misconception: 'bounds',
        why: raw`Those are the bounds of a rod centred on $P$’s level. This rod stands on the origin, from $y=0$ up to $y=L$.`},
      {tex: raw`\int_{0}^{L/2}\cdots\,dy`, misconception: 'bounds',
        why: raw`That is the lower half of the rod only. With no symmetry here, there is no factor of two to make up the rest: integrate over all of it.`},
    ],
    explanation: raw`The bounds are where the charge is, in the variable you integrate over: from the foot of the rod, $y=0$, to its top, $y=L$. Both $E_x$ and $E_y$ run over these same bounds.`,
    review: {lesson: 'endpoint', stage: 'shrink'}},

  {id: 'endpoint-own-integral', lesson: 'endpoint', kind: 'setup',
    prompt: raw`Why can’t we use an arbitrary piece’s angle $\alpha$ to turn the total $E_x$ into $E_y$?`,
    choices: [
      {correct: true, text: raw`Each piece leans at its own angle $\alpha$, so the pieces’ parts along the rod are a different sum from their parts along $x$.`},
      {text: raw`It can: the field points straight away from the rod’s middle, so $E_y$ is $E_x$ times $-(L/2)/r$.`, misconception: 'point-up-close',
        why: raw`That treats the rod as a point charge at its middle. It is nearly right far away, $r\gg L$, but close by the pieces lean at very different angles, and the field does not point away from the middle.`},
      {text: raw`There is no need to project: $E_y$ is zero, as it is beside the middle.`, misconception: 'cancel-survivor',
        why: raw`$E_y$ vanished beside the middle only because each piece had a mirror below $P$’s level. Here none has, so $E_y$ survives and must be added up.`},
    ],
    explanation: raw`$E_x$ adds $\Delta E\cos\alpha$ and $E_y$ adds $-\Delta E\sin\alpha$, with $\alpha$ different for every piece. A piece’s angle does not in general give the total field’s direction. Here we evaluate the two component integrals: $E_x=kQ/\bigl(r\sqrt{L^2+r^2}\bigr)$ and $E_y=-k\lambda\bigl(1/r-1/\sqrt{L^2+r^2}\bigr)$.`,
    review: {lesson: 'endpoint', stage: 'add'}},

  {id: 'endpoint-half-rod', lesson: 'endpoint', kind: 'check',
    prompt: raw`This rod is the top half of a rod of length $2L$ centred on $P$’s level, with the same $\lambda$. How does its field at $P$ compare with that longer rod’s?`,
    choices: [
      {correct: true, text: raw`Its $E_x$ is exactly half the longer rod’s, and it has an $E_y$ the longer rod does not.`},
      {text: raw`Its whole field is half the longer rod’s, pointing the same way.`, misconception: 'half-of-symmetric',
        why: raw`Half the $E_x$, yes. But the lower half was also what cancelled the top half’s parts along the rod. With it gone, those parts survive, so the field turns.`},
      {text: raw`Its $E_x$ is the same as the longer rod’s, since the lower half’s pieces only cancelled.`, misconception: 'cancel-survivor',
        why: raw`The lower half’s pieces cancelled the top half’s parts along the rod, but their parts along $x$ added. Take the lower half away and you lose half of $E_x$.`},
    ],
    explanation: raw`On the centred rod, each piece below and its mirror above make the same part along $x$ and opposite parts along the rod. So the two halves give equal shares of $E_x$, and the top half alone gives half. The part along the rod that the lower half cancelled is what survives here as $E_y$.`,
    review: {lesson: 'endpoint', section: 'What the answer says'}},

  {id: 'endpoint-far', lesson: 'endpoint', kind: 'check',
    prompt: raw`Move $P$ far from the rod, $r\gg L$. What does the size of the field, $|\mathbf E|$, approach?`,
    choices: [
      {correct: true, tex: raw`\frac{k|Q|}{r^2}`},
      {tex: raw`\frac{k|Q|}{r}`, misconception: 'potential-power',
        why: raw`That falls as $1/r$, as a point charge’s potential does. A localized source with nonzero total charge has an inverse-square leading field far away.`},
      {tex: raw`\frac{2k|\lambda|}{r}`, misconception: 'far-limit',
        why: raw`That is a long rod seen from close to its middle, where it looks endless. Far from a finite rod its length stops mattering, and it looks like a point.`},
      {tex: raw`\frac{\sqrt2\,k|\lambda|}{r}`, misconception: 'far-limit',
        why: raw`That is the rod grown without end at fixed $\lambda$: the semi-infinite line. Here the rod stays finite and $P$ moves away, so it looks like a point.`},
    ],
    explanation: raw`When $r\gg L$ every piece is nearly $r$ from $P$, so the rod acts as its whole charge $Q$ at one point and $|\mathbf E|$ tends to $k|Q|/r^2$. Counting $r$ from the end rather than the middle changes that only by a part of order $(L/r)^2$.`,
    review: {lesson: 'endpoint', section: 'Limiting cases'}},

  {id: 'endpoint-grow', lesson: 'endpoint', kind: 'check',
    prompt: raw`Hold $\lambda$ fixed and let the rod grow upward without end. What does the field at $P$ become?`,
    choices: [
      {correct: true, text: raw`$E_x$ tends to $k\lambda/r$ and $E_y$ to $-k\lambda/r$: equal in size, so the field leans at $\pi/4$.`},
      {text: raw`$k\lambda/r$, straight along $x$: half an infinite line’s field.`, misconception: 'half-of-symmetric',
        why: raw`Half the part along $x$, yes. But no mirror half is there to cancel the parts along the rod, and they add up to $-k\lambda/r$ too.`},
      {text: raw`$2k\lambda/r$, straight along $x$, as for an infinite line.`, misconception: 'bounds',
        why: raw`That is a line running both ways from $P$’s level. This one starts at $P$’s level and runs only upward: half the bounds, and no partner to cancel the parts along it.`},
      {text: raw`Zero: the charge is spread over an endless length.`, misconception: 'held-total-charge',
        why: raw`That happens with $Q$ held fixed. Here $\lambda$ is fixed, so the rod gains charge as it grows, and the field settles at a finite value.`},
    ],
    explanation: raw`As $L$ grows, $\sqrt{L^2+r^2}$ grows with it, so $E_x=k\lambda L/\bigl(r\sqrt{L^2+r^2}\bigr)$ tends to $k\lambda/r$ and $E_y=-k\lambda\bigl(1/r-1/\sqrt{L^2+r^2}\bigr)$ to $-k\lambda/r$. That is the semi-infinite line, leaning at $\pi/4$.`,
    review: {lesson: 'endpoint', section: 'Limiting cases'}},

  {id: 'endpoint-raise-p', lesson: 'endpoint', kind: 'transfer',
    prompt: raw`Slide $P$ straight up, keeping its distance $r$ from the rod, until it is level with the rod’s middle. What becomes of $E_y$?`,
    choices: [
      {correct: true, text: raw`It vanishes: now every piece has a mirror the same distance from $P$, with the same charge.`},
      {text: raw`It is still there, since the rod still starts at the origin.`, misconception: 'missed-cancel',
        why: raw`Where the origin is does not matter; where $P$ is does. Level with the middle, each piece above has a mirror below the same distance from $P$, and their parts along the rod cancel.`},
      {text: raw`It vanishes, and $E_x$ vanishes with it.`, misconception: 'cancel-survivor',
        why: raw`Mirror pieces cancel each other’s parts along the rod, but their parts along $x$ point the same way and add. $E_x$ survives.`},
    ],
    explanation: raw`Level with the middle, $P$ sees the bisector’s geometry: the piece a distance above $P$’s level and the one the same distance below are equally far from $P$ and hold the same charge. Their parts along the rod cancel, so $E_y=0$, and their parts along $x$ add.`,
    review: {lesson: 'bisector', stage: 'cancel'}},

  {id: 'endpoint-negative', lesson: 'endpoint', kind: 'transfer',
    prompt: raw`Give the rod a negative charge. Which way does the field at $P$ point now?`,
    choices: [
      {correct: true, text: raw`Toward the rod and up, above the $x$-axis.`},
      {text: raw`Toward the rod and still down.`, misconception: 'sign',
        why: raw`A negative charge turns every piece’s arrow round, both of its parts. Each now points from $P$ toward its piece, which is above $P$: up.`},
      {text: raw`Straight toward the rod, along $x$.`, misconception: 'cancel-survivor',
        why: raw`The sign does not change what cancels, and here nothing does. Every piece is above $P$, so the parts along the rod still add, now pointing up.`},
    ],
    explanation: raw`Each piece’s field now points from $P$ toward the piece: back along $x$, and up toward the rod above. Both formulas carry the sign of $Q$, so $E_x<0$ and $E_y>0$.`,
    review: {lesson: 'endpoint', section: 'What the answer says'}},
];
