import type {Question} from '../types';
const raw = String.raw;

/* THE POTENTIAL BEYOND THE END OF A ROD, in its lesson's symbols (src/lessons/v-rod-axial.ts): the axial rod,
 * length L and charge Q on the x-axis from x = 0 to x = L, λ = Q/L, P at x = L + a, a piece at x holding
 * ΔQ = λΔx, rᵢ = L + a − x, ΔV = kΔQ/rᵢ. One plain sum of numbers of one sign; with u = L + a − x it is
 * V = kλ ln((L + a)/a), measured from zero at infinity, and E_x = −dV/da gives back the axial field. Every
 * result and limit here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'v-rod-axial-piece', lesson: 'v-rod-axial', kind: 'setup',
    prompt: raw`What does the piece at $x$, of length $dx$, add to the potential at $P$?`,
    choices: [
      {correct: true, tex: raw`dV=\frac{k\lambda\,dx}{L+a-x}`},
      {tex: raw`dV=\frac{k\lambda\,dx}{(L+a-x)^2}`, misconception: 'potential-power',
        why: raw`That is the piece’s field. A potential falls with one power of the distance, not two.`},
      {tex: raw`dV=\frac{k\lambda\,dx}{a}`, misconception: 'fixed-distance',
        why: raw`$a$ is the gap from the rod’s near end only. The piece at $x$ is $L+a-x$ from $P$, and every piece but the nearest is farther than $a$.`},
      {tex: raw`dV=\frac{kQ}{L+a-x}`, misconception: 'whole-charge',
        why: raw`That puts the whole rod’s charge at this one piece’s distance. The piece holds only $\lambda\,dx$; the integral adds the shares up to $Q$.`},
    ],
    explanation: raw`The piece holds $\lambda\,dx$ and lies on $P$’s own line, so its distance is the difference of positions, $L+a-x$. A point charge’s potential is $k$ times its charge over its distance, a number with the sign of its charge.`,
    review: {lesson: 'v-rod-axial', stage: 'piece'}},

  {id: 'v-rod-axial-substitution', lesson: 'v-rod-axial', kind: 'setup',
    prompt: raw`$V=\int_0^L\dfrac{k\lambda\,dx}{L+a-x}$. Put $u=L+a-x$, the piece’s distance from $P$. Which integral is $V$?`,
    choices: [
      {correct: true, tex: raw`k\lambda\int_a^{L+a}\frac{du}{u}`},
      {tex: raw`k\lambda\int_0^{L}\frac{du}{u}`, misconception: 'bounds',
        why: raw`Those are the bounds in $x$. In $u$, the pieces run from $L+a$, at the far end, down to $a$, at the near end.`},
      {tex: raw`k\lambda\int_{L+a}^{a}\frac{du}{u}`, misconception: 'bounds',
        why: raw`Those are the right ends, but $du=-dx$ carries a minus that turns them round. Left as they are, they make the potential of a positive rod negative.`},
      {tex: raw`k\lambda\int_a^{L+a}\frac{du}{u^2}`, misconception: 'potential-power',
        why: raw`The square belongs to the field. The potential’s integrand has one power of the distance, and it integrates to a logarithm.`},
    ],
    explanation: raw`As $x$ runs from $0$ to $L$, $u$ runs from $L+a$ down to $a$, and the minus in $du=-dx$ turns the ends round. The integral of $1/u$ is a logarithm, so $V=k\lambda\ln\bigl((L+a)/a\bigr)$.`,
    review: {lesson: 'v-rod-axial', stage: 'shrink'}},

  {id: 'v-rod-axial-nothing-cancels', lesson: 'v-rod-axial', kind: 'predict',
    prompt: raw`Why does nothing cancel when the pieces’ potentials are added up?`,
    choices: [
      {correct: true, text: raw`Each piece adds a number with the sign of $\lambda$, and all of the rod’s charge has that one sign.`},
      {text: raw`Because the rod has no mirror pieces about $P$; with them, the potential would cancel.`, misconception: 'potential-arrow',
        why: raw`Mirror pieces cancel parts of a field, which has a direction. A potential is a number, and a mirror piece of the same sign would add to it, not cancel it.`},
      {text: raw`Because every piece’s potential points along the axis, the same way.`, misconception: 'potential-arrow',
        why: raw`A potential does not point at all: it is a number. It is the field whose arrows all lie along the axis here.`},
    ],
    explanation: raw`A number has no direction, so the only way two pieces could undo each other is with opposite signs. All of this rod’s charge has one sign, so every piece adds to $V$ with that sign, the near ones more than the far ones.`,
    review: {lesson: 'v-rod-axial', stage: 'cancel'}},

  {id: 'v-rod-axial-far', lesson: 'v-rod-axial', kind: 'check',
    prompt: raw`$V=k\lambda\ln\dfrac{L+a}{a}$. Move $P$ far out along the axis, $a\gg L$. Which expression does $V$ approach?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{a+L/2}`},
      {tex: raw`\frac{kQ}{(a+L/2)^2}`, misconception: 'potential-power',
        why: raw`That is a point charge’s field. Its potential falls one power more softly, as one over the distance.`},
      {tex: raw`k\lambda\ln\frac{L}{a}`, misconception: 'far-limit',
        why: raw`That is the potential right beside the end, $a\ll L$. Far away, the rod looks like a point charge.`},
    ],
    explanation: raw`For $a\gg L$, $\ln(1+L/a)$ is nearly $L/a-L^2/(2a^2)$, so $V$ is nearly $(kQ/a)(1-L/(2a))$, which agrees with $kQ/(a+L/2)$: the potential of a point charge at the rod’s centre, off only by a part of order $(L/a)^2$.`,
    review: {lesson: 'v-rod-axial', section: 'Limiting cases'}},

  {id: 'v-rod-axial-near', lesson: 'v-rod-axial', kind: 'check',
    prompt: raw`Now walk $P$ onto the end of the rod, $a\to0$. How does the size of $V$ grow?`,
    choices: [
      {correct: true, text: raw`As $\ln(L/a)$: without bound, but far more slowly than the field’s $1/a$.`},
      {text: raw`As $kQ/a$, a point charge at the end.`, misconception: 'point-up-close',
        why: raw`Only a little of the charge is near the end; most of it is much farther from $P$. Close by, the rod looks like a line, not a point holding all of $Q$.`},
      {text: raw`As $k\lambda/a$, just as the field does.`, misconception: 'potential-power',
        why: raw`That is how the field grows. The potential adds one power of the distance less steeply, and $\int du/u$ is a logarithm.`},
    ],
    explanation: raw`In $V=k\lambda\ln\bigl((L+a)/a\bigr)$, the near end’s $u=a$ sits inside a logarithm. As $a\to0$, $V$ goes as $k\lambda\ln(L/a)$: its size grows without bound, but only logarithmically, while $E_x$ grows as $k\lambda/a$.`,
    review: {lesson: 'v-rod-axial', section: 'Limiting cases'}},

  {id: 'v-rod-axial-gradient', lesson: 'v-rod-axial', kind: 'check',
    prompt: raw`Differentiate back: what is $E_x=-dV/da$?`,
    choices: [
      {correct: true, tex: raw`k\lambda\left(\frac1a-\frac1{L+a}\right)`},
      {tex: raw`-k\lambda\left(\frac1a-\frac1{L+a}\right)`, misconception: 'gradient-sign',
        why: raw`That is $+dV/da$. Beyond a positive rod, $V$ falls as $P$ moves away, so the field, which points the way $V$ falls, points away from the rod.`},
      {tex: raw`\frac{kQ}{a^2}`, misconception: 'point-up-close',
        why: raw`That treats the rod as a point charge at its near end. The derivative of the logarithm keeps the far end too: $kQ/\bigl(a(L+a)\bigr)$.`},
      {tex: raw`\frac{k\lambda}{a}\ln\frac{L+a}{a}`, misconception: 'gradient',
        why: raw`That divides $V$ by the distance, which works only for a point charge. The field is minus the rate at which $V$ changes as $P$ moves out.`},
    ],
    explanation: raw`$\ln\bigl((L+a)/a\bigr)$ differentiates to $1/(L+a)-1/a$, so $-dV/da=k\lambda\bigl(1/a-1/(L+a)\bigr)$: the field beyond the end of this rod, found without a single arrow.`,
    review: {lesson: 'v-rod-axial', section: 'Differentiate back'}},

  {id: 'v-rod-axial-whole-field', lesson: 'v-rod-axial', kind: 'transfer',
    prompt: raw`$V(a)$ is known only on the rod’s own line. Why does $-dV/da$ give the whole field there?`,
    choices: [
      {correct: true, text: raw`On that line every piece’s arrow lies along it, so the field has no other part.`},
      {text: raw`A potential has no direction, so its rate of change is the whole field wherever $P$ is.`, misconception: 'gradient-one-line',
        why: raw`Its rate along one line is the field’s part along that line only. Off the rod’s line the field has a part across it too, and $V(a)$ cannot give that.`},
      {text: raw`It does not: the part across the line needs $V$ off the line, and it is not zero.`, misconception: 'collinear',
        why: raw`It does need $V$ off the line to find it, but on the rod’s line that part is zero: every piece sits on the line, so every arrow lies along it.`},
    ],
    explanation: raw`$-dV/da$ is the field’s part along the line $P$ moves on. On the rod’s own line that is all there is, since every piece and $P$ share that line. Off it, the part across the line would need $V$ at points off the line.`,
    review: {lesson: 'v-rod-axial', section: 'Differentiate back'}},

  {id: 'v-rod-axial-negative', lesson: 'v-rod-axial', kind: 'transfer',
    prompt: raw`Give the rod a negative charge. What is the potential at $P$, and how does it change as $P$ comes in toward the end?`,
    choices: [
      {correct: true, text: raw`Negative, and more negative the closer $P$ comes.`},
      {text: raw`Positive, since a potential has no direction and so no sign.`, misconception: 'sign',
        why: raw`No direction does not mean no sign. Each piece adds $k\,\Delta Q/r_i$, negative for a negative piece.`},
      {text: raw`It points toward the rod, and grows as $P$ comes in.`, misconception: 'potential-arrow',
        why: raw`A potential does not point: it is a number. It is the field, $-dV/da$, that points toward a negative rod.`},
    ],
    explanation: raw`$\ln\bigl((L+a)/a\bigr)$ is positive, so $V$ has the sign of $\lambda$. As $a$ shrinks the logarithm grows, so a negative rod’s $V$ heads further below zero, and the field, pointing the way $V$ falls, points toward the rod.`,
    review: {lesson: 'v-rod-axial', section: 'What the answer says'}},
];
