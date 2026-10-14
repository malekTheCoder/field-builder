import type {Question} from '../types';
const raw = String.raw;

/* THE RING, ON ITS AXIS, in its lesson's symbols (src/lessons/ring.ts): radius R, charge Q, λ = Q/(2πR), θ round
 * the ring, a piece ΔQ = λRΔθ, P = (0, 0, z), every piece rᵢ = √(R² + z²) from P at the angle α to the z-axis.
 * Every result and limit here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'ring-what-survives', lesson: 'ring', kind: 'predict',
    prompt: raw`Add up the fields of every piece of the ring at $P$, on its axis. Which part survives?`,
    choices: [
      {correct: true, text: raw`The part along the axis. The sideways parts cancel round the ring.`},
      {text: raw`The sideways part. The parts along the axis cancel.`, misconception: 'cancel-survivor',
        why: raw`Every piece is on the same side of $P$ along the axis, so every piece’s part along the axis points the same way. It is the sideways parts that point every way round and cancel.`},
      {text: raw`Neither: the ring is symmetric, so the field on its axis is zero.`, misconception: 'cancel-survivor',
        why: raw`Symmetry cancels only the sideways parts. The parts along the axis all point the same way and add, so the field is zero only at the centre, where they have no part along the axis at all.`},
      {text: raw`Both: every piece makes the same field at $P$.`, misconception: 'missed-cancel',
        why: raw`Every piece makes a field of the same size, but each leans a different way round the axis. The piece half a turn round leans the opposite way, so the sideways parts cancel.`},
    ],
    explanation: raw`The same length of ring half a turn round is just as far from $P$ and makes an equal sideways part pointing the opposite way, so the sideways parts cancel in pairs. The parts along the axis all point the same way and add: the field at $P$ is $E_z$.`,
    review: {lesson: 'ring', stage: 'cancel'}},

  {id: 'ring-dq', lesson: 'ring', kind: 'setup',
    prompt: raw`A piece of the ring spans the angle $d\theta$. What charge does it hold?`,
    choices: [
      {correct: true, tex: raw`dQ=\lambda R\,d\theta`},
      {tex: raw`dQ=\lambda\,d\theta`, misconception: 'piece-length',
        why: raw`$\lambda$ is a charge per unit length, and $d\theta$ is an angle, not a length. The piece’s arc is $R\,d\theta$ long.`},
      {tex: raw`dQ=\lambda\,2\pi R\,d\theta`, misconception: 'piece-length',
        why: raw`$2\pi R$ is the whole ring’s circumference. One piece spans only $d\theta$ of the turn, so its length is $R\,d\theta$.`},
      {tex: raw`dQ=Q\,d\theta`, misconception: 'whole-charge',
        why: raw`That gives every piece the whole ring’s charge. Added once round, it would come to $2\pi Q$, not $Q$.`},
    ],
    explanation: raw`An arc $d\theta$ wide on a circle of radius $R$ is $R\,d\theta$ long, and the ring holds $\lambda$ per unit length, so the piece holds $\lambda R\,d\theta$. Once round, from $0$ to $2\pi$, that adds to $2\pi R\lambda=Q$.`,
    review: {lesson: 'ring', stage: 'cut'}},

  {id: 'ring-projection', lesson: 'ring', kind: 'setup',
    prompt: raw`Which factor turns one piece’s field into its part along the axis?`,
    choices: [
      {correct: true, tex: raw`\cos\alpha=\frac{z}{\sqrt{R^2+z^2}}`},
      {tex: raw`\sin\alpha=\frac{R}{\sqrt{R^2+z^2}}`, misconception: 'wrong-part',
        why: raw`That is the sideways part, the part the piece half a turn round cancels. Along the axis the projection is adjacent to $\alpha$: $z$ over the distance.`},
      {tex: raw`1`, misconception: 'projection',
        why: raw`The piece’s field leans away from the axis, so only part of it lies along the axis. Adding the whole of it counts the sideways part too.`},
      {tex: raw`\frac{z}{R}`, misconception: 'fixed-distance',
        why: raw`The projection is the side along the axis over the hypotenuse, and the hypotenuse is the piece’s distance from $P$, $r_i=\sqrt{R^2+z^2}$, not $R$.`},
    ],
    explanation: raw`$\alpha$ is the angle between the piece’s field and the $z$-axis. In the right triangle with legs $R$ and $z$, the side along the axis is $z$ and the hypotenuse is $r_i=\sqrt{R^2+z^2}$, so the projection is $\cos\alpha=z/\sqrt{R^2+z^2}$.`,
    review: {lesson: 'ring', stage: 'piece'}},

  {id: 'ring-bounds', lesson: 'ring', kind: 'setup',
    prompt: raw`The integral adds the pieces once round the ring. What are its bounds in $\theta$?`,
    choices: [
      {correct: true, tex: raw`\int_{0}^{2\pi}\cdots\,d\theta`},
      {tex: raw`\int_{0}^{\pi}\cdots\,d\theta`, misconception: 'bounds',
        why: raw`That is half a turn: half the ring, half its charge, and half the field along the axis.`},
      {tex: raw`\int_{-\pi/2}^{\pi/2}\cdots\,d\theta`, misconception: 'bounds',
        why: raw`Those are the infinite line’s bounds, the half turn it fills as seen from $P$. A ring goes all the way round its centre.`},
      {tex: raw`\int_{0}^{2\pi R}\cdots\,d\theta`, misconception: 'piece-length',
        why: raw`$2\pi R$ is a length, the ring’s circumference. The variable here is the angle $\theta$, and once round is $2\pi$.`},
    ],
    explanation: raw`$\theta$ says where a piece is round the ring, so once round is $\theta$ from $0$ to $2\pi$. Nothing in the integrand changes with $\theta$, so the integral is $\lambda R\cdot2\pi=Q$ times the rest.`,
    review: {lesson: 'ring', stage: 'shrink'}},

  {id: 'ring-few-pieces', lesson: 'ring', kind: 'predict',
    prompt: raw`On a rod the pieces had to be short to be nearly point charges. Cut the ring into just a few long pieces and add their parts along the axis as if each were a point charge. How close is that to the exact $E_z$?`,
    choices: [
      {correct: true, text: raw`Exact, however few the pieces: every bit of the ring is the same distance from $P$ at the same angle.`},
      {text: raw`Close, and closer the more pieces there are.`, misconception: 'ring-small-pieces',
        why: raw`That is true of a rod, where a long piece spans many distances from $P$. Every bit of a ring is the same $r_i$ from $P$ at the same $\alpha$, so a long piece’s part along the axis is exactly a point charge’s.`},
      {text: raw`Far off, until each piece is short compared with its distance from $P$.`, misconception: 'ring-small-pieces',
        why: raw`A piece needs to be short only if different bits of it are different distances from $P$, or at different angles. On a ring seen from its axis none are.`},
    ],
    explanation: raw`Every piece has the same $r_i$ and the same $\alpha$, so they come out of the sum, and what is left is the sum of the charges, the whole of $Q$: $E_z=kQ\cos\alpha/(R^2+z^2)$, exact at any cut. A long piece’s own field is weaker and leans closer to the axis than a point charge’s, but its part along the axis is the same.`,
    review: {lesson: 'ring', stage: 'add'}},

  {id: 'ring-centre', lesson: 'ring', kind: 'check',
    prompt: raw`What is the field at the centre of the ring, $z=0$?`,
    choices: [
      {correct: true, tex: raw`0`},
      {tex: raw`\frac{kQ}{R^2}`, misconception: 'ring-point',
        why: raw`That is the field a point charge $Q$ would make at a distance $R$. But the ring’s pieces surround the centre, and their fields there point every way round and cancel.`},
      {tex: raw`\infty`, misconception: 'closer-stronger',
        why: raw`A field blows up only right beside a charge, and there is none at the centre: every piece is $R$ away. Their fields there cancel, so the field is zero.`},
    ],
    explanation: raw`At the centre each piece’s field lies flat in the ring’s plane, with no part along the axis, and the length of ring half a turn round cancels it. The formula agrees: $kQz/(R^2+z^2)^{3/2}$ is zero at $z=0$.`,
    review: {lesson: 'ring', section: 'Limiting cases'}},

  {id: 'ring-far', lesson: 'ring', kind: 'check',
    prompt: raw`$E_z=\dfrac{kQz}{(R^2+z^2)^{3/2}}$. Move $P$ far up the axis, $z\gg R$. What does $E_z$ approach?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{z^2}`},
      {tex: raw`\frac{kQR}{z^3}`, misconception: 'wrong-part',
        why: raw`That is what the sideways projection, $\sin\alpha=R/r_i$, would give. It cancels round the ring, and it is not what is left along the axis.`},
      {tex: raw`0`, misconception: 'cancel-survivor',
        why: raw`The field gets weak far away, but it does not cancel: every piece’s part along the axis points the same way. It falls as $1/z^2$.`},
      {tex: raw`\frac{2k\lambda}{z}`, misconception: 'far-limit',
        why: raw`That is the field near an endless line. A ring is a finite charge, and far away any finite charge looks like a point charge.`},
    ],
    explanation: raw`When $z\gg R$, $(R^2+z^2)^{3/2}$ is nearly $z^3$, so $E_z$ tends to $kQz/z^3=kQ/z^2$. From far away every piece is nearly $z$ from $P$ and its field points nearly along the axis: the ring is a point charge.`,
    review: {lesson: 'ring', section: 'Limiting cases'}},

  {id: 'ring-come-down', lesson: 'ring', kind: 'predict',
    prompt: raw`Start far up the axis and bring $P$ down to the centre of the ring. What does the size of the field do?`,
    choices: [
      {correct: true, text: raw`It grows, reaches a largest value, then falls to zero at the centre.`},
      {text: raw`It grows all the way down, and is largest at the centre.`, misconception: 'closer-stronger',
        why: raw`Coming closer makes each piece’s field larger, but it also turns it sideways, where it cancels. Near the centre the part along the axis shrinks to nothing.`},
      {text: raw`It stays the same, since every piece is the same distance from $P$.`, misconception: 'fixed-distance',
        why: raw`Every piece is the same distance from $P$ as every other, but that distance, $\sqrt{R^2+z^2}$, changes as $P$ moves.`},
    ],
    explanation: raw`Far away the field grows as $P$ comes in, as a point charge’s does. Close in, each piece’s field leans more and more sideways, where it cancels, and the part along the axis, the fraction $z/r_i$ of it, shrinks to zero at the centre. In between it is largest, at $z=R/\sqrt2$.`,
    review: {lesson: 'ring', section: 'What the answer says'}},

  {id: 'ring-negative', lesson: 'ring', kind: 'transfer',
    prompt: raw`Give the ring a negative charge, with $P$ above its centre. Which way is the field at $P$?`,
    choices: [
      {correct: true, text: raw`Along the axis, down toward the ring’s centre.`},
      {text: raw`Along the axis, up, away from the ring.`, misconception: 'sign',
        why: raw`That is a positive ring’s field. A negative charge turns every piece’s arrow round to point toward the piece, so the sum points down the axis.`},
      {text: raw`Sideways, toward the nearest piece of the ring.`, misconception: 'missed-cancel',
        why: raw`Every piece is the same distance from $P$, so none is nearest, and the sign does not change what cancels: the sideways parts still cancel round the ring.`},
    ],
    explanation: raw`Each piece’s field now points from $P$ toward the piece. The sideways parts still cancel round the ring, and the parts along the axis all point down, toward the ring. The formula says the same: $E_z$ has the sign of $Q$ for $z$ above the centre.`,
    review: {lesson: 'ring', section: 'What the answer says'}},

  {id: 'ring-half', lesson: 'ring', kind: 'transfer',
    prompt: raw`Take away half the ring, the half with $y<0$, and leave the other half’s charge as it was. What happens to the field at $P$?`,
    choices: [
      {correct: true, text: raw`The part along the axis halves, and a sideways part appears.`},
      {text: raw`The part along the axis halves, and the field still points along the axis.`, misconception: 'cancel-survivor',
        why: raw`The sideways parts cancelled only because each piece had a partner half a turn round. Those partners were in the half that is gone, so the sideways parts now add up.`},
      {text: raw`Nothing changes: every piece left is still the same distance from $P$.`, misconception: 'cancel-survivor',
        why: raw`The distance is the same, but half the charge is gone, and with it the partners that cancelled the sideways parts. The field is a sum of arrows, and half of them were taken away.`},
    ],
    explanation: raw`Each remaining piece still adds its own part along the axis, but there are half as many, so $E_z$ halves. And every piece’s sideways part was cancelled by the piece half a turn round, which is now missing, so a sideways part survives, pointing away from the half that is left for a positive charge.`,
    review: {lesson: 'ring', stage: 'cancel'}},
];
