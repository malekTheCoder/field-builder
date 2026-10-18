import type {Question} from '../types';
const raw = String.raw;

/* THE ARC, AT ITS CENTRE, in its lesson's symbols (src/lessons/arc.ts): radius R, opening angle φ (\varphi) set
 * symmetrically about the x-axis, a piece's angle θ from −φ/2 to φ/2, P at the centre, Q held fixed as φ changes so
 * λ = Q/(Rφ), ΔQ = λRΔθ, ΔE_x = −kΔQ cos θ/R², E_x = −2kQ sin(φ/2)/(R²φ). Unlike the ring's axis, the pieces must be
 * short: every bit is R from P, but the field's direction turns along a piece. Every result and limit here is
 * checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'arc-what-cancels', lesson: 'arc', kind: 'predict',
    prompt: raw`Pair each piece of the arc at $\theta$ with its mirror at $-\theta$. At $P$, which parts of their fields cancel?`,
    choices: [
      {correct: true, text: raw`The parts across the $x$-axis cancel; the parts along it add.`},
      {text: raw`The parts along the $x$-axis cancel; the parts across it add.`, misconception: 'cancel-survivor',
        why: raw`A piece and its mirror are mirror images across the $x$-axis, and so are their fields: equal parts along the axis, pointing the same way, and opposite parts across it.`},
      {text: raw`Both parts cancel, so the field at $P$ is zero.`, misconception: 'cancel-survivor',
        why: raw`Only the parts across the axis are equal and opposite. The parts along it point the same way for both pieces of a pair, so the field is zero only once the arc closes into a full circle.`},
      {text: raw`Nothing cancels: every piece is $R$ from $P$, so all their fields are the same.`, misconception: 'missed-cancel',
        why: raw`Every piece makes a field of the same size, but each points along its own radius. A piece and its mirror lean opposite ways across the axis, so those parts cancel.`},
    ],
    explanation: raw`A piece at $\theta$ and its mirror at $-\theta$ are both $R$ from $P$ and hold the same charge, so their fields are the same size, at the same angle on either side of the $x$-axis. Their parts across the axis cancel and their parts along it add: $E_y=0$, and the field at $P$ is $E_x$.`,
    review: {lesson: 'arc', stage: 'cancel'}},

  {id: 'arc-short-pieces', lesson: 'arc', kind: 'predict',
    prompt: raw`Every bit of the arc is $R$ from $P$. On a ring’s axis, where every bit is one distance away, the pieces could be any size. Must the arc’s pieces be short?`,
    choices: [
      {correct: true, text: raw`Yes: the bits of a piece are all $R$ away, but their fields point in different directions, so only a short piece is nearly a point charge.`},
      {text: raw`No: every bit is $R$ from $P$, so each piece adds exactly a point charge’s field, however long it is.`, misconception: 'same-distance',
        why: raw`Distance is not all a field has. Along a long piece of arc the bits’ fields turn, so they partly cancel each other, and the piece’s field is weaker than that of a point charge holding all its charge at its middle.`},
      {text: raw`Yes: the pieces farther round the arc are farther from $P$.`, misconception: 'fixed-distance',
        why: raw`Every piece of the arc is exactly $R$ from its centre, however far round it is. What changes along the arc is the direction of the field, not its distance.`},
    ],
    explanation: raw`On a ring’s axis every bit of a piece is one distance and one angle from $P$, so a long piece’s part along the axis is exactly a point charge’s. On the arc every bit is $R$ away, but each bit’s field points along its own radius, and that direction turns along a piece. So the pieces must be short, and the sum becomes exact only as they shrink.`,
    review: {lesson: 'arc', stage: 'cut'}},

  {id: 'arc-dq', lesson: 'arc', kind: 'setup',
    prompt: raw`A piece of the arc spans the angle $d\theta$. What charge does it hold?`,
    choices: [
      {correct: true, tex: raw`dQ=\lambda R\,d\theta`},
      {tex: raw`dQ=\lambda\,d\theta`, misconception: 'piece-length',
        why: raw`$\lambda$ is a charge per unit length, and $d\theta$ is an angle. The piece’s arc is $R\,d\theta$ long.`},
      {tex: raw`dQ=\lambda R\varphi\,d\theta`, misconception: 'piece-length',
        why: raw`$\varphi$ is the opening of the whole arc, and $R\varphi$ is the whole arc’s length. One piece spans only $d\theta$, so its length is $R\,d\theta$.`},
      {tex: raw`dQ=Q\,d\theta`, misconception: 'whole-charge',
        why: raw`That omits the angular normalization: $\lambda R=Q/\varphi$. Added over the arc, $Q\,d\theta$ would come to $Q\varphi$, not $Q$.`},
    ],
    explanation: raw`A piece $d\theta$ wide on a circle of radius $R$ is $R\,d\theta$ long, and the arc holds $\lambda=Q/(R\varphi)$ per unit length, so the piece holds $\lambda R\,d\theta$. Added from $-\varphi/2$ to $\varphi/2$, that gives $\lambda R\varphi=Q$.`,
    review: {lesson: 'arc', stage: 'cut'}},

  {id: 'arc-one-piece', lesson: 'arc', kind: 'setup',
    prompt: raw`A piece holding $\Delta Q$ sits at the angle $\theta$. What is the part of its field at $P$ along $x$?`,
    choices: [
      {correct: true, tex: raw`\Delta E_x=-\frac{k\,\Delta Q}{R^2}\cos\theta`},
      {tex: raw`\Delta E_x=\frac{k\,\Delta Q}{R^2}\cos\theta`, misconception: 'sign',
        why: raw`The minus is the geometry’s, not the charge’s. The field at $P$ lies along the radius through the piece, carried on through $P$: away from a positive piece. For a piece on the $+x$ side, that is toward $-x$; a negative $\Delta Q$ turns it round on top of that.`},
      {tex: raw`\Delta E_x=-\frac{k\,\Delta Q}{R^2}\sin\theta`, misconception: 'wrong-part',
        why: raw`$\sin\theta$ projects across the axis, onto $y$, the part the mirror piece cancels. The radius through the piece makes the angle $\theta$ with the $x$-axis, so the part along $x$ takes $\cos\theta$.`},
      {tex: raw`\Delta E_x=-\frac{k\,\Delta Q}{R^2}`, misconception: 'projection',
        why: raw`That is the piece’s whole field, as if it pointed along $x$. It points along the radius through the piece, at the angle $\theta$ to the axis, so only $\cos\theta$ of it lies along $x$.`},
    ],
    explanation: raw`Every piece is $R$ from $P$, so its field there is $k|\Delta Q|/R^2$ in size, along the radius through the piece, away from it for a positive charge. That radius makes the angle $\theta$ with the $x$-axis, so the part along $x$ is $\cos\theta$ of it, and for a positive piece on the $+x$ side it points toward $-x$.`,
    review: {lesson: 'arc', stage: 'piece'}},

  {id: 'arc-bounds', lesson: 'arc', kind: 'setup',
    prompt: raw`The arc spans the angle $\varphi$, set symmetrically about the $x$-axis. What are the integral’s bounds in $\theta$?`,
    choices: [
      {correct: true, tex: raw`\int_{-\varphi/2}^{\varphi/2}\cdots\,d\theta`},
      {tex: raw`\int_{0}^{\varphi}\cdots\,d\theta`, misconception: 'bounds',
        why: raw`That is an arc of the same opening that starts at the $x$-axis and runs up from it, not one centred on the axis. Except for a full circle, whose field is zero, this turns the field away from the symmetry axis used here.`},
      {tex: raw`\int_{0}^{\varphi/2}\cdots\,d\theta`, misconception: 'bounds',
        why: raw`That covers only the half of the arc above the axis, and gives half of $E_x$. It is right only with a factor of two in front, the mirror half’s share.`},
      {tex: raw`\int_{0}^{2\pi}\cdots\,d\theta`, misconception: 'bounds',
        why: raw`That is once round a full circle, whose field at the centre is zero. The arc spans only $\varphi$.`},
    ],
    explanation: raw`$\theta$ is measured from the $x$-axis, the arc’s line of symmetry, and the arc spans $\varphi$ split evenly on either side of it: from $\theta=-\varphi/2$ to $\theta=\varphi/2$.`,
    review: {lesson: 'arc', stage: 'shrink'}},

  {id: 'arc-full', lesson: 'arc', kind: 'check',
    prompt: raw`Close the arc into a full circle, $\varphi=2\pi$. What is the field at its centre?`,
    choices: [
      {correct: true, tex: raw`E_x=0`},
      {tex: raw`E_x=-\frac{kQ}{R^2}`, misconception: 'ring-point',
        why: raw`That is a point charge $Q$ a distance $R$ away. Closed into a circle, the charge surrounds $P$, and every piece has a partner straight across whose field cancels its own.`},
      {tex: raw`E_x=-\frac{2k\lambda}{R}`, misconception: 'missed-cancel',
        why: raw`That is the semicircle’s field. Close the circle and the other half adds pieces straight across from the first half’s, whose fields cancel theirs.`},
      {tex: raw`E_x=\frac{kQ}{R}`, misconception: 'potential-power',
        why: raw`$kQ/R$ is the potential at the centre, a number that falls as $1/R$. The field at the centre is an arrow, and the pieces’ arrows cancel there.`},
    ],
    explanation: raw`With $\varphi=2\pi$, $\sin(\varphi/2)=\sin\pi=0$, so $E_x=0$. Every piece has a partner straight across the circle, the same distance from $P$ with the same charge, whose field is equal and opposite.`,
    review: {lesson: 'arc', section: 'What the answer says'}},

  {id: 'arc-short', lesson: 'arc', kind: 'check',
    prompt: raw`Hold $Q$ fixed and shrink the arc to a very short one, $\varphi\to0$. What does $E_x=-\dfrac{2kQ}{R^2\varphi}\sin\dfrac{\varphi}{2}$ approach?`,
    choices: [
      {correct: true, tex: raw`-\frac{kQ}{R^2}`},
      {tex: raw`0`, misconception: 'arc-held-fixed',
        why: raw`$\sin(\varphi/2)$ goes to zero, but so does the $\varphi$ below it: $Q$ is fixed, so $|\lambda|=|Q|/(R\varphi)$ grows as the arc shrinks. Their ratio tends to one half.`},
      {tex: raw`-\frac{kQ}{R}`, misconception: 'potential-power',
        why: raw`That falls as $1/R$, as a potential does. A short arc is nearly a point charge $Q$ a distance $R$ from $P$, and its field falls as $1/R^2$.`},
    ],
    explanation: raw`For a small angle $\sin(\varphi/2)$ is nearly $\varphi/2$, so $E_x$ tends to $-2kQ(\varphi/2)/(R^2\varphi)=-kQ/R^2$: the field of a point charge $Q$ a distance $R$ from $P$, pointing away from it for a positive charge.`,
    review: {lesson: 'arc', section: 'What the answer says'}},

  {id: 'arc-semicircle', lesson: 'arc', kind: 'check',
    prompt: raw`Open the arc to a semicircle, $\varphi=\pi$. What is $E_x$?`,
    choices: [
      {correct: true, tex: raw`-\frac{2kQ}{\pi R^2}`},
      {tex: raw`-\frac{kQ}{R^2}`, misconception: 'projection',
        why: raw`That is what the semicircle would give if every piece’s field pointed along $x$, as if all of its charge sat at the middle. The pieces off to the side count only $\cos\theta$ of their fields along $x$.`},
      {tex: raw`-\frac{kQ}{\pi R^2}`, misconception: 'bounds',
        why: raw`That is half the answer: it keeps only the upper end of $\sin\theta$. Since $\sin(-\varphi/2)=-\sin(\varphi/2)$, the lower end adds a second $\sin(\varphi/2)$.`},
      {tex: raw`0`, misconception: 'cancel-survivor',
        why: raw`Only the parts across the axis cancel. Every piece of a semicircle centred on the $x$-axis is on the $+x$ side of $P$, so all their parts along $x$ point the same way.`},
    ],
    explanation: raw`With $\varphi=\pi$, $\sin(\varphi/2)=1$, so $E_x=-2kQ/(\pi R^2)$, which is $-2k\lambda/R$ with $\lambda=Q/(\pi R)$. It is weaker than a point charge’s $kQ/R^2$ by a factor $\pi/2$, because the pieces off to the side count only in part.`,
    review: {lesson: 'arc', section: 'Limiting cases'}},

  {id: 'arc-negative', lesson: 'arc', kind: 'transfer',
    prompt: raw`Give an arc that has not closed into a circle a negative charge. Which way is the field at $P$?`,
    choices: [
      {correct: true, text: raw`Along the $x$-axis, toward the middle of the arc.`},
      {text: raw`Along the $x$-axis, away from the middle of the arc.`, misconception: 'sign',
        why: raw`That is a positive arc’s field. A negative charge turns every piece’s arrow round, so their sum points toward the arc.`},
      {text: raw`Across the $x$-axis.`, misconception: 'missed-cancel',
        why: raw`The sign turns every arrow round but does not change what cancels. Mirror pieces still cancel each other’s parts across the axis.`},
    ],
    explanation: raw`Each piece’s field now points toward the piece. Mirror pieces still cancel each other’s parts across the axis, and the parts along it now point toward the arc. $E_x=-2kQ\sin(\varphi/2)/(R^2\varphi)$ has the opposite sign to $Q$, so for negative $Q$ it points toward $+x$, where the middle of the arc is.`,
    review: {lesson: 'arc', section: 'What the answer says'}},

  {id: 'arc-open', lesson: 'arc', kind: 'transfer',
    prompt: raw`Hold $Q$ fixed and open a short arc, step by step, until it closes into a circle. What does the size of the field at $P$ do?`,
    choices: [
      {correct: true, text: raw`It only falls, from nearly $k|Q|/R^2$ to zero.`},
      {text: raw`It grows until the arc is a semicircle, then falls to zero.`, misconception: 'arc-held-fixed',
        why: raw`That is what happens with $\lambda$ held fixed, when opening the arc adds charge. With $Q$ fixed the same charge spreads round the circle, more of each piece’s field cancels across the axis, and the field only falls.`},
      {text: raw`It stays $k|Q|/R^2$: every piece stays $R$ from $P$.`, misconception: 'same-distance',
        why: raw`The distance stays the same, but the directions do not. As the arc opens its pieces’ fields fan out and cancel more and more, until a closed circle cancels completely. It is the potential, $kQ/R$, that stays the same.`},
    ],
    explanation: raw`$|E_x|=2k|Q|\sin(\varphi/2)/(R^2\varphi)$ only falls as $\varphi$ grows. A short arc is nearly a point charge. As it opens, more of each piece’s field points across the axis, where its mirror cancels it, and past a semicircle some pieces point back the other way, until the closed circle gives zero.`,
    review: {lesson: 'arc', section: 'Limiting cases'}},
];
