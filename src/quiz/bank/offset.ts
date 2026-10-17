import type {Question} from '../types';
const raw = String.raw;

/* THE ROD OFF ITS BISECTOR, in its lesson's symbols (src/lessons/offset.ts): a rod of length L and charge Q on the
 * y-axis from y₁ to y₂, λ = Q/L, P = (r, 0) a height h above the rod's middle, so y₁ = −h − L/2 and y₂ = L/2 − h; a
 * piece at height y holds ΔQ = λΔy, rᵢ = √(y² + r²), α the angle at P to the x-axis signed like y. The stretch from
 * −m to m, m the nearer end's distance from P's level, mirrors itself and cancels along the rod; the leftover does not.
 * Every result and limit here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'offset-what-cancels', lesson: 'offset', kind: 'predict',
    prompt: raw`$P$ is a distance $r$ out from the rod, a height $h>0$ above its middle. Which parts of the pieces’ fields cancel at $P$?`,
    choices: [
      {correct: true, text: raw`The parts along the rod, but only of the stretch reaching as far below $P$’s level as the top end is above it.`},
      {text: raw`All the parts along the rod, as beside the middle.`, misconception: 'cancel-survivor',
        why: raw`Beside the middle every piece had a mirror across $P$’s level. Here the rod reaches farther below $P$ than above, and the pieces of that extra stretch have no mirror: their parts along the rod survive.`},
      {text: raw`None: the rod is not centred on $P$’s level, so no piece has a mirror.`, misconception: 'missed-cancel',
        why: raw`Part of the rod still mirrors itself. From $y=-y_2$ to $y=y_2$ each piece has a partner the same distance from $P$ with the same charge, and their parts along the rod cancel.`},
      {text: raw`The parts along $x$ of the mirrored stretch.`, misconception: 'cancel-survivor',
        why: raw`A piece and its mirror across $P$’s level are on the same side of $P$ along $x$, so their parts along $x$ point the same way and add. It is their parts along the rod that are opposite.`},
    ],
    explanation: raw`Cancellation needs equal and opposite components. Here, equal-charge mirror pieces provide them. Folded across $P$’s level, the stretch from $-y_2$ to $y_2$ lands on itself, and there the pairs’ parts along the rod cancel. The rest of the rod, below $-y_2$, has no partners, so its parts along the rod survive.`,
    review: {lesson: 'offset', stage: 'cancel'}},

  {id: 'offset-direction', lesson: 'offset', kind: 'predict',
    prompt: raw`For a positive rod, with $P$ above the rod’s middle, which way does the field at $P$ point?`,
    choices: [
      {correct: true, text: raw`Away from the rod and up, above the $x$-axis.`},
      {text: raw`Straight along $+x$, away from the rod.`, misconception: 'cancel-survivor',
        why: raw`That would need every part along the rod to cancel. The rod reaches farther below $P$ than above, and the pieces of that leftover stretch have no mirrors: their parts along the rod add.`},
      {text: raw`Away from the rod and down, below the $x$-axis.`, misconception: 'sign',
        why: raw`The leftover stretch, the one without mirrors, is below $P$. A positive piece’s field at $P$ points away from it, so the leftover’s parts along the rod point up.`},
    ],
    explanation: raw`The mirrored stretch gives a field straight along $x$. The leftover is the rod’s extra reach below $P$, and a positive charge’s field points away from it: up. So $E_x>0$ and $E_y>0$, and both turn round for a negative rod.`,
    review: {lesson: 'offset', section: 'What the answer says'}},

  {id: 'offset-ey-integrand', lesson: 'offset', kind: 'setup',
    prompt: raw`Which integral gives $E_y$, the part of the field along the rod?`,
    choices: [
      {correct: true, tex: raw`E_y=-\int_{y_1}^{y_2}\frac{k\lambda\,y\,dy}{(y^2+r^2)^{3/2}}`},
      {tex: raw`E_y=\int_{y_1}^{y_2}\frac{k\lambda\,y\,dy}{(y^2+r^2)^{3/2}}`, misconception: 'sign',
        why: raw`That drops the minus. The line from a piece at $y$ to $P$ runs along $-y$: a positive piece above $P$’s level makes a field at $P$ pointing down, so the part along the rod is $-\Delta E\sin\alpha$.`},
      {tex: raw`E_y=-\int_{y_1}^{y_2}\frac{k\lambda\,r\,dy}{(y^2+r^2)^{3/2}}`, misconception: 'wrong-part',
        why: raw`$r/\sqrt{y^2+r^2}$ is $\cos\alpha$, the part along $x$. The part along the rod is opposite the angle at $P$, so it takes $\sin\alpha=y/\sqrt{y^2+r^2}$.`},
      {tex: raw`E_y=0`, misconception: 'cancel-survivor',
        why: raw`$E_y$ vanishes only when every piece has a mirror across $P$’s level. Here only part of the rod does, and the leftover’s parts along the rod survive.`},
    ],
    explanation: raw`Each piece’s part along the rod is $-\Delta E\sin\alpha$, with $\sin\alpha=y/\sqrt{y^2+r^2}$. With $u=y^2+r^2$ the integral is $E_y=k\lambda\bigl(1/\sqrt{y_2^2+r^2}-1/\sqrt{y_1^2+r^2}\bigr)$.`,
    review: {lesson: 'offset', stage: 'cancel'}},

  {id: 'offset-bounds', lesson: 'offset', kind: 'setup',
    prompt: raw`With each piece’s field written in $y$, measured from $P$’s level, and $P$ above the rod’s middle, which bounds give the whole rod?`,
    choices: [
      {correct: true, tex: raw`\int_{y_1}^{y_2}\cdots\,dy`},
      {tex: raw`\int_{-L/2}^{L/2}\cdots\,dy`, misconception: 'bounds',
        why: raw`Those are the ends of a rod centred on $P$’s level. This rod’s middle is a height $h$ below $P$, so its ends are at $y_1=-h-L/2$ and $y_2=L/2-h$.`},
      {tex: raw`\int_{0}^{L}\cdots\,dy`, misconception: 'bounds',
        why: raw`That is the rod level with its lower end, which is only the case $h=-L/2$. In general the rod runs from $y_1$ to $y_2$.`},
      {tex: raw`\int_{-y_2}^{y_2}\cdots\,dy`, misconception: 'bounds',
        why: raw`That is only the stretch that mirrors itself across $P$’s level. The leftover below it is charge too, and it is the part that makes $E_y$.`},
    ],
    explanation: raw`The bounds are where the charge is, in the variable you integrate over: from the lower end, $y=y_1$, to the upper, $y=y_2$. Both $E_x$ and $E_y$ run over these same bounds.`,
    review: {lesson: 'offset', stage: 'shrink'}},

  {id: 'offset-leftover', lesson: 'offset', kind: 'check',
    prompt: raw`Why is all of $E_y$ the leftover stretch’s, with nothing from the stretch that mirrors itself?`,
    choices: [
      {correct: true, text: raw`From $y=-m$ to $y=m$ the integrand $y/(y^2+r^2)^{3/2}$ is odd, so that stretch’s integral is zero.`},
      {text: raw`Because the leftover is closer to $P$, so its field is the stronger.`, misconception: 'closer-stronger',
        why: raw`The leftover lies beyond the mirrored stretch, on the side the rod reaches farther, so its pieces are the farther ones. What matters is not their size but that nothing cancels their parts along the rod.`},
      {text: raw`It is not: the mirrored stretch adds as much to $E_y$ again.`, misconception: 'missed-cancel',
        why: raw`Each piece of the mirrored stretch has a partner across $P$’s level whose part along the rod is equal and opposite. Those pairs add nothing to $E_y$.`},
    ],
    explanation: raw`A piece at $y$ and its mirror at $-y$ make equal and opposite parts along the rod, which is the integrand being odd. Over the mirrored stretch they cancel in pairs, so $E_y$ is the leftover’s alone, and its sign is set by the charge’s sign and which side the leftover is on.`,
    review: {lesson: 'offset', section: 'What the answer says'}},

  {id: 'offset-middle', lesson: 'offset', kind: 'check',
    prompt: raw`Slide $P$ along, at the same $r$, until it is level with the rod’s middle, $h\to0$. What becomes of the field?`,
    choices: [
      {correct: true, text: raw`$E_y$ goes to zero, and $E_x$ becomes the bisector’s $kQ/\bigl(r\sqrt{(L/2)^2+r^2}\bigr)$.`},
      {text: raw`$E_x$ goes to zero, and the field points along the rod.`, misconception: 'cancel-survivor',
        why: raw`Mirror pieces cancel each other’s parts along the rod, not along $x$. Level with the middle every piece has a mirror, so it is $E_y$ that vanishes and $E_x$ that survives.`},
      {text: raw`Nothing changes: $E_y$ is set by the rod’s length, not by where $P$ is.`, misconception: 'missed-cancel',
        why: raw`$E_y$ is the leftover’s alone, and the leftover is the rod’s extra reach on one side of $P$’s level. Level with the middle there is no extra reach, so no leftover and no $E_y$.`},
    ],
    explanation: raw`At $h=0$, $y_1=-L/2$ and $y_2=L/2$: the two ends are equally far from $P$, so $\cos\alpha_2=\cos\alpha_1$ and $E_y=0$, while $E_x=(k\lambda/r)\cdot2\sin\alpha_2$ is the bisector’s field.`,
    review: {lesson: 'offset', section: 'Limiting cases'}},

  {id: 'offset-end', lesson: 'offset', kind: 'check',
    prompt: raw`Slide $P$ along until it is level with the rod’s lower end, $h=-L/2$. Which field is that?`,
    choices: [
      {correct: true, text: raw`The rod level with its end: $y_1=0$ and $y_2=L$, the whole rod above $P$’s level.`},
      {text: raw`The bisector’s, since the rod has not changed.`, misconception: 'cancel-survivor',
        why: raw`The rod is the same but $P$ is not. Level with an end, no stretch of the rod mirrors itself across $P$’s level, so nothing cancels along the rod.`},
      {text: raw`Half of the bisector’s field, straight along $x$.`, misconception: 'half-of-symmetric',
        why: raw`Every piece is now above $P$, so every part along the rod points the same way and survives: the field leans, and it is not along $x$.`},
    ],
    explanation: raw`With $y_1=0$ the mirrored stretch has shrunk to nothing and the whole rod is leftover. The answers become $E_x=kQ/\bigl(r\sqrt{L^2+r^2}\bigr)$ and $E_y=-k\lambda\bigl(1/r-1/\sqrt{L^2+r^2}\bigr)$, the lesson on the rod level with its end.`,
    review: {lesson: 'offset', section: 'Limiting cases'}},

  {id: 'offset-far', lesson: 'offset', kind: 'check',
    prompt: raw`Move $P$ far out, $r\gg L$, with $h$ held. What does the size of the field, $|\mathbf E|$, approach?`,
    choices: [
      {correct: true, tex: raw`\frac{k|Q|}{r^2+h^2}`},
      {tex: raw`\frac{k|Q|}{\sqrt{r^2+h^2}}`, misconception: 'potential-power',
        why: raw`That falls as one over the distance, as a point charge’s potential does. A finite charge’s field, seen from far away, falls as the inverse square.`},
      {tex: raw`\frac{2k|\lambda|}{r}`, misconception: 'far-limit',
        why: raw`That is an endless line, which a long rod looks like from close up. Far from a finite rod its length stops mattering, and it looks like a point.`},
    ],
    explanation: raw`Far away every piece is nearly the same distance from $P$, so the rod acts as its whole charge $Q$ at its middle, a distance $\sqrt{r^2+h^2}$ from $P$. Since $h$ is held, that is $k|Q|/r^2$ as well, to the same order.`,
    review: {lesson: 'offset', section: 'Limiting cases'}},

  {id: 'offset-grow', lesson: 'offset', kind: 'transfer',
    prompt: raw`Hold $\lambda$ and $h$ fixed and let the rod grow at both ends without limit. What does the field at $P$ become?`,
    choices: [
      {correct: true, text: raw`$2k\lambda/r$, straight along $x$: an endless line has no middle to be off.`},
      {text: raw`$\sqrt2\,k|\lambda|/r$, at $\pi/4$ to the axis.`, misconception: 'bounds',
        why: raw`That is a line running only one way from $P$’s level, the semi-infinite line. Here both ends run off, so both $\sin\alpha_1\to-1$ and $\sin\alpha_2\to1$, and the cosines go to zero.`},
      {text: raw`Zero: the charge is spread over an endless length.`, misconception: 'held-total-charge',
        why: raw`That happens with $Q$ held fixed. Here $\lambda$ is fixed, so the rod gains charge as it grows, and the field settles at a finite value.`},
    ],
    explanation: raw`As both ends run off, $E_x=(k\lambda/r)(\sin\alpha_2-\sin\alpha_1)\to2k\lambda/r$ and $E_y=(k\lambda/r)(\cos\alpha_2-\cos\alpha_1)\to0$: the leftover runs off with the far end, and only the endless line’s field is left.`,
    review: {lesson: 'offset', section: 'Limiting cases'}},

  {id: 'offset-negative', lesson: 'offset', kind: 'transfer',
    prompt: raw`Give the rod a negative charge, with $P$ still above its middle. Which way does the field at $P$ point now?`,
    choices: [
      {correct: true, text: raw`Toward the rod and down, below the $x$-axis.`},
      {text: raw`Toward the rod and up, above the $x$-axis.`, misconception: 'sign',
        why: raw`A negative charge turns both parts of every piece’s arrow round. The leftover is below $P$, so its parts along the rod now point toward it: down.`},
      {text: raw`Straight toward the rod, along $-x$.`, misconception: 'cancel-survivor',
        why: raw`The sign does not change what cancels. The leftover below $P$ still has no mirrors, so its parts along the rod survive, now pointing down.`},
    ],
    explanation: raw`Each piece’s field now points from $P$ toward the piece, so every part along $x$ points back toward the rod. The mirror pairs’ parts along the rod still cancel, and the leftover’s point down, toward it. Both formulas carry the sign of $Q$, so $E_x<0$ and $E_y<0$.`,
    review: {lesson: 'offset', section: 'What the answer says'}},
];
