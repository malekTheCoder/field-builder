import type {Question} from '../types';
const raw = String.raw;

/* THE SEMICIRCLE WITH UNEVEN CHARGE, at its centre, in its lesson's symbols (src/lessons/uneven-arc.ts): radius R,
 * θ measured from the x-axis, its line of symmetry, from −π/2 to π/2; λ(θ) = λ₀ cos θ, so Q = 2λ₀R; P at the centre;
 * ΔQ ≈ λ₀ cos θ R Δθ, ΔE_x = −kΔQ cos θ/R², E_x = −πkλ₀/(2R) = −πkQ/(4R²). The comparison is the even semicircle
 * with the same Q, E_x = −2kQ/(πR²). Every result here is checked by number in tests/uneven-arc.test.ts. */
export const bank: Question[] = [
  {id: 'uneven-arc-what-cancels', lesson: 'uneven-arc', kind: 'predict',
    prompt: raw`On the semicircle with $\lambda=\lambda_0\cos\theta$, pair each piece at $\theta$ with its mirror at $-\theta$. At $P$, which parts of their fields cancel?`,
    choices: [
      {correct: true, text: raw`The parts across the $x$-axis cancel, as on an even arc: a piece and its mirror hold the same charge, since $\cos(-\theta)=\cos\theta$.`},
      {text: raw`Nothing cancels: the charge is uneven, so no two pieces hold the same charge.`, misconception: 'missed-cancel',
        why: raw`The density changes round the arc, but it changes the same way on both sides of the axis: $\cos(-\theta)=\cos\theta$. A piece and its mirror hold equal charges at equal distances, so their parts across the axis still cancel.`},
      {text: raw`The parts along the $x$-axis cancel; the parts across it add.`, misconception: 'cancel-survivor',
        why: raw`A piece and its mirror are mirror images across the $x$-axis, and so are their fields: equal parts along the axis, pointing the same way, and opposite parts across it.`},
    ],
    explanation: raw`The density is the same at $\theta$ and $-\theta$, so a piece and its mirror hold the same charge, $R$ from $P$. Their fields are the same size at the same angle on either side of the axis: the parts across it cancel, the parts along it add, and the field at $P$ is $E_x$. The density changes how much each pair adds, not what cancels.`,
    review: {lesson: 'uneven-arc', stage: 'cancel'}},

  {id: 'uneven-arc-dq', lesson: 'uneven-arc', kind: 'setup',
    prompt: raw`A short piece of the semicircle spans the angle $d\theta$ at the angle $\theta$. What charge does it hold?`,
    choices: [
      {correct: true, tex: raw`dQ=\lambda_0\cos\theta\,R\,d\theta`},
      {tex: raw`dQ=\lambda_0R\,d\theta`, misconception: 'density-inside',
        why: raw`$\lambda_0$ is the density on the axis only. At the angle $\theta$ the density is $\lambda_0\cos\theta$, so a piece near an end, where $\cos\theta$ is nearly zero, holds almost nothing.`},
      {tex: raw`dQ=\lambda_0\cos\theta\,d\theta`, misconception: 'piece-length',
        why: raw`$\lambda_0\cos\theta$ is a charge per unit length, and $d\theta$ is an angle. The piece’s arc is $R\,d\theta$ long.`},
      {tex: raw`dQ=Q\cos\theta\,d\theta`, misconception: 'whole-charge',
        why: raw`That puts the whole semicircle’s charge where a density belongs. Added round the half turn it would come to $2Q$, not $Q$. The density is $\lambda_0\cos\theta$ with $\lambda_0=Q/(2R)$.`},
    ],
    explanation: raw`A piece $d\theta$ wide is $R\,d\theta$ long, and the charge per unit length where it sits is $\lambda_0\cos\theta$, so it holds $\lambda_0\cos\theta\,R\,d\theta$. Added from $-\pi/2$ to $\pi/2$ that gives $2\lambda_0R=Q$.`,
    review: {lesson: 'uneven-arc', stage: 'cut'}},

  {id: 'uneven-arc-integrand', lesson: 'uneven-arc', kind: 'setup',
    prompt: raw`Put $dQ=\lambda_0\cos\theta\,R\,d\theta$ into $dE_x=-k\,dQ\cos\theta/R^2$. What is the integral for $E_x$?`,
    choices: [
      {correct: true, tex: raw`E_x=-\frac{k\lambda_0}{R}\int_{-\pi/2}^{\pi/2}\cos^2\theta\,d\theta`},
      {tex: raw`E_x=-\frac{k\lambda_0}{R}\int_{-\pi/2}^{\pi/2}\cos\theta\,d\theta`, misconception: 'density-inside',
        why: raw`That is the even arc’s integral with $\lambda_0$ for $\lambda$: it keeps the $\cos\theta$ of the direction and drops the $\cos\theta$ of the density. The integrand carries $\cos\theta$ twice.`},
      {tex: raw`E_x=-\frac{k\lambda_0}{R}\int_{-\pi/2}^{\pi/2}\cos\theta\sin\theta\,d\theta`, misconception: 'wrong-part',
        why: raw`$\sin\theta$ is the part across the axis, the part the mirror cancels; that integral is $E_y$, and it is zero. The part along $x$ takes $\cos\theta$, and the density brings a second one.`},
      {tex: raw`E_x=-\frac{k\lambda_0}{R^2}\int_{-\pi/2}^{\pi/2}\cos^2\theta\,d\theta`, misconception: 'piece-length',
        why: raw`One $R$ is the piece’s length, $R\,d\theta$, and it cancels one of the two in $R^2$. What is left in front is $k\lambda_0/R$.`},
    ],
    explanation: raw`The charge brings $\lambda_0\cos\theta\,R\,d\theta$ and the direction brings $-\cos\theta$, over the distance squared, $R^2$: one $R$ cancels, and $\cos\theta$ appears twice. The bounds run from one end of the semicircle, $-\pi/2$, to the other, $\pi/2$.`,
    review: {lesson: 'uneven-arc', stage: 'shrink'}},

  {id: 'uneven-arc-cos-squared', lesson: 'uneven-arc', kind: 'setup',
    prompt: raw`What is $\displaystyle\int_{-\pi/2}^{\pi/2}\cos^2\theta\,d\theta$?`,
    choices: [
      {correct: true, tex: raw`\frac{\pi}{2}`},
      {tex: raw`2`, misconception: 'density-inside',
        why: raw`$2$ is $\int\cos\theta\,d\theta$ over the half turn, the even arc’s integral. With $\cos^2\theta=(1+\cos(2\theta))/2$ the $\cos(2\theta)$ adds nothing over the half turn, and the $\tfrac12$ adds up to $\pi/2$.`},
      {tex: raw`\pi`, misconception: 'bounds',
        why: raw`$\pi$ is the length of the range, $\int d\theta$. The average of $\cos^2\theta$ over the half turn is $\tfrac12$, so the integral is half of that.`},
      {tex: raw`0`, misconception: 'cancel-survivor',
        why: raw`$\cos^2\theta$ is never negative, so its integral cannot be zero. It is the part along the axis that every piece adds to, with the same sign.`},
    ],
    explanation: raw`Write $\cos^2\theta=(1+\cos(2\theta))/2$. Over $-\pi/2\le\theta\le\pi/2$ the $\cos(2\theta)$ integrates to $\tfrac12\sin(2\theta)$, zero at both ends, and the $\tfrac12$ gives $\tfrac12\cdot\pi=\pi/2$.`,
    review: {lesson: 'uneven-arc', stage: 'shrink'}},

  {id: 'uneven-arc-total', lesson: 'uneven-arc', kind: 'check',
    prompt: raw`What is the semicircle’s total charge, in terms of $\lambda_0$ and $R$?`,
    choices: [
      {correct: true, tex: raw`Q=2\lambda_0R`},
      {tex: raw`Q=\pi\lambda_0R`, misconception: 'density-inside',
        why: raw`$\pi R$ is the semicircle’s length, and $\pi\lambda_0R$ would be its charge if the density were $\lambda_0$ all the way round. Its magnitude falls to zero at the ends, and $\int\cos\theta\,d\theta$ over the half turn is $2$, not $\pi$.`},
      {tex: raw`Q=\lambda_0R`, misconception: 'half-of-symmetric',
        why: raw`That is the charge of one half, from the axis to one end: $\int_0^{\pi/2}\cos\theta\,d\theta=1$. The other half holds as much again.`},
    ],
    explanation: raw`Add every piece’s charge, $\lambda_0\cos\theta\,R\,d\theta$, from $\theta=-\pi/2$ to $\pi/2$. Over that range $\int\cos\theta\,d\theta=[\sin\theta]=2$, so $Q=2\lambda_0R$.`,
    review: {lesson: 'uneven-arc', section: 'The setup'}},

  {id: 'uneven-arc-answer', lesson: 'uneven-arc', kind: 'check',
    prompt: raw`What is the field at $P$, in terms of the total charge $Q$?`,
    choices: [
      {correct: true, tex: raw`E_x=-\frac{\pi kQ}{4R^2}`},
      {tex: raw`E_x=-\frac{2kQ}{\pi R^2}`, misconception: 'density-inside',
        why: raw`That is the semicircle with the same $Q$ spread evenly. The cosine density piles the charge near the axis, where its field points along it, and the field is stronger.`},
      {tex: raw`E_x=-\frac{kQ}{R^2}`, misconception: 'projection',
        why: raw`That is all of the charge gathered at the middle of the arc, its whole field along $x$. The pieces off to the side count only $\cos\theta$ of their fields along $x$.`},
      {tex: raw`E_x=0`, misconception: 'cancel-survivor',
        why: raw`Only the parts across the axis cancel. Every piece is on the $+x$ side of $P$, so all their parts along $x$ point the same way.`},
    ],
    explanation: raw`$E_x=-(k\lambda_0/R)\cdot\pi/2=-\pi k\lambda_0/(2R)$, and with $\lambda_0=Q/(2R)$ that is $-\pi kQ/(4R^2)$: stronger than the even semicircle’s magnitude $2k|Q|/(\pi R^2)$ by $\pi^2/8$, and weaker than $k|Q|/R^2$, all the charge at the middle.`,
    review: {lesson: 'uneven-arc', section: 'What the answer says'}},

  {id: 'uneven-arc-compare', lesson: 'uneven-arc', kind: 'predict',
    prompt: raw`Two semicircles hold the same charge $Q$: one with $\lambda=\lambda_0\cos\theta$, one with its charge spread evenly. Which makes the stronger field at its centre, and why?`,
    choices: [
      {correct: true, text: raw`The cosine one: its charge sits near the axis, where a piece’s field points along it, so less of it cancels.`},
      {text: raw`Neither: they hold the same charge, and every piece is $R$ from $P$.`, misconception: 'same-distance',
        why: raw`The same charge at the same distance gives the same potential, $kQ/R$, but not the same field. The field adds arrows, and where the charge sits decides how much of each arrow points along the axis.`},
      {text: raw`The even one: its charge reaches farther round the arc.`, misconception: 'cancel-survivor',
        why: raw`Charge near the ends makes a field that lies mostly across the axis, and its mirror cancels that part. Spreading the charge out toward the ends weakens the field.`},
    ],
    explanation: raw`A piece’s part along the axis is $\cos\theta$ of its field. The cosine density puts its charge where $\cos\theta$ is large, so its pieces lose less to cancelling: $\pi k|Q|/(4R^2)$ against $2k|Q|/(\pi R^2)$ in magnitude.`,
    review: {lesson: 'uneven-arc', stage: 'cancel'}},

  {id: 'uneven-arc-negative', lesson: 'uneven-arc', kind: 'transfer',
    prompt: raw`Make $\lambda_0$ negative, so every piece holds a negative charge. Which way is the field at $P$?`,
    choices: [
      {correct: true, text: raw`Along the $x$-axis, toward the middle of the semicircle.`},
      {text: raw`Along the $x$-axis, away from the middle of the semicircle.`, misconception: 'sign',
        why: raw`That is a positive semicircle’s field. A negative charge turns every piece’s arrow round, so their sum points toward the arc.`},
      {text: raw`Across the $x$-axis: the density is uneven.`, misconception: 'missed-cancel',
        why: raw`The sign turns every arrow round but does not change what cancels. A piece and its mirror still hold the same charge, and their parts across the axis still cancel.`},
    ],
    explanation: raw`$E_x=-\pi k\lambda_0/(2R)$ has the opposite sign to $\lambda_0$, so for negative $\lambda_0$ it points toward $+x$, where the middle of the semicircle is. Mirror pieces still cancel each other’s parts across the axis.`,
    review: {lesson: 'uneven-arc', section: 'What the answer says'}},

  {id: 'uneven-arc-potential', lesson: 'uneven-arc', kind: 'transfer',
    prompt: raw`Keep $Q$ and $R$, and change only how the charge is spread round the semicircle. What happens to the potential at $P$?`,
    choices: [
      {correct: true, text: raw`Nothing: every piece is $R$ from $P$, so $V=kQ/R$ however the charge is spread.`},
      {text: raw`It grows with the field, by the same factor.`, misconception: 'field-for-potential',
        why: raw`The field depends on directions; the potential has none. Each piece adds $k\,dQ/R$ wherever it sits on the arc, and those add to $kQ/R$.`},
      {text: raw`It falls to zero, since the parts across the axis cancel.`, misconception: 'potential-arrow',
        why: raw`A potential is a number, not an arrow: nothing of it points across the axis to cancel. With all the charge of one sign, every piece adds to it.`},
    ],
    explanation: raw`$V=\int k\,dQ/R=kQ/R$: every piece is the same distance from $P$, so only the total charge counts. The field magnitude changes with the spread, $\pi k|Q|/(4R^2)$ for the cosine against $2k|Q|/(\pi R^2)$ evenly, because it adds arrows that point different ways.`,
    review: {lesson: 'uneven-arc', section: 'What the answer says'}},
];
