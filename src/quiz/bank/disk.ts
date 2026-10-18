import type {Question} from '../types';
const raw = String.raw;

/* THE DISK, ON ITS AXIS, in its lesson's symbols (src/lessons/disk.ts): radius R, charge Q, σ = Q/(πR²), thin
 * rings of radius s and width ds holding dQ = σ 2πs ds, rᵢ = √(s² + z²), α to the axis, P = (0, 0, z). Its pieces
 * are rings, so its second stage is One ring, and the ring lesson's field is reused whole. Every result and limit
 * here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'disk-what-cancels', lesson: 'disk', kind: 'predict',
    prompt: raw`Cut the disk into thin rings round its axis. Each ring makes a field at $P$. What is left to cancel between the rings?`,
    choices: [
      {correct: true, text: raw`Nothing: each ring’s sideways parts have already cancelled round it, so every ring’s field points along the axis, all the same way.`},
      {text: raw`Nothing, so each ring adds its whole $k\,\Delta Q/r_i^2$.`, misconception: 'projection',
        why: raw`Nothing is left to cancel, but that is because each ring’s field is already only its part along the axis, $k\,\Delta Q\cos\alpha/r_i^2$. The whole $k\,\Delta Q/r_i^2$ counts the sideways parts that cancelled round the ring.`},
      {text: raw`The rings on opposite sides of the centre cancel, so the field at $P$ is zero.`, misconception: 'cancel-survivor',
        why: raw`Every ring is centred on the axis, so what lies across the centre from one bit of a ring is another bit of the same ring. And every ring’s part along the axis points the same way, so those parts add.`},
      {text: raw`The parts along the axis cancel between rings; the sideways parts add.`, misconception: 'cancel-survivor',
        why: raw`Every ring is on the same side of $P$ along the axis, so every ring’s part along the axis points the same way, away from the disk for a positive charge. It is the sideways parts that cancel, inside each ring.`},
    ],
    explanation: raw`Within a ring, a bit and the bit straight across it undo each other’s parts across the axis, so each ring’s field at $P$ is only its part along the axis. Every ring is on the same side of $P$, so those parts all point the same way and add like numbers: the field is $E_z$, the sum of the rings’ $\Delta E_z$.`,
    review: {lesson: 'disk', stage: 'cancel'}},

  {id: 'disk-rings', lesson: 'disk', kind: 'predict',
    prompt: raw`On a rod the pieces had to be short to be nearly point charges. Why may the disk be cut into whole rings instead?`,
    choices: [
      {correct: true, text: raw`Every bit of a thin ring is the same distance from $P$, at the same angle to the axis, so the ring lesson’s answer gives its field.`},
      {text: raw`A thin ring is small enough to count as a point charge at its centre.`, misconception: 'ring-point',
        why: raw`A ring is not a point charge: its bits are $r_i=\sqrt{s^2+z^2}$ from $P$ and lean off the axis, while a point at its centre would be $z$ away, straight below. A ring looks like a point only from far away.`},
      {text: raw`It may not: each ring must still be cut into short pieces, and those added first.`, misconception: 'ring-small-pieces',
        why: raw`The ring lesson has already added a ring’s pieces, and found the sum exact at any cut, since every bit is one distance and one angle from $P$. That answer can be reused whole, with $s$ for $R$ and $\Delta Q$ for $Q$.`},
    ],
    explanation: raw`What makes a thin ring easy is not that it is small but that all of it is the same distance $r_i=\sqrt{s^2+z^2}$ from $P$, at the same angle $\alpha$. That is the case the ring lesson solved, so each ring’s field is that answer with radius $s$ and charge $\Delta Q$. The rings must be thin, so that all of each is nearly one distance from $P$.`,
    review: {lesson: 'disk', stage: 'cut'}},

  {id: 'disk-dq', lesson: 'disk', kind: 'setup',
    prompt: raw`The ring of radius $s$ and width $ds$ is part of a disk with surface charge density $\sigma$. What charge does it hold?`,
    choices: [
      {correct: true, tex: raw`dQ=\sigma\,2\pi s\,ds`},
      {tex: raw`dQ=\sigma\,\pi s^2\,ds`, misconception: 'ring-area',
        why: raw`$\pi s^2$ is the area of the whole disk inside the ring, not of the ring. The thin ring is a strip as long as its circumference, $2\pi s$, and $ds$ wide.`},
      {tex: raw`dQ=\sigma\,ds`, misconception: 'ring-area',
        why: raw`$\sigma$ is a charge per unit area, and $ds$ is only the ring’s width. Its area is that width times its length round, the circumference $2\pi s$.`},
      {tex: raw`dQ=Q\,2\pi s\,ds`, misconception: 'whole-charge',
        why: raw`$Q$ is the whole disk’s charge. A ring holds only its share, the charge per unit area $\sigma$ times its own area. Added from the centre to the rim, these would give $\pi R^2Q$, not $Q$.`},
    ],
    explanation: raw`A thin ring is a strip of length $2\pi s$ and width $ds$, so its area is $2\pi s\,ds$, and at $\sigma$ per unit area it holds $\sigma\,2\pi s\,ds$. Added from the centre to the rim, that gives $\sigma\pi R^2=Q$.`,
    review: {lesson: 'disk', stage: 'cut'}},

  {id: 'disk-one-ring', lesson: 'disk', kind: 'setup',
    prompt: raw`The ring lesson found $E_z=kQz/(R^2+z^2)^{3/2}$ for a ring of radius $R$ and charge $Q$. What field does the disk’s ring of radius $s$ and charge $\Delta Q$ make at $P$?`,
    choices: [
      {correct: true, tex: raw`\Delta E_z=\frac{k\,\Delta Q\,z}{(s^2+z^2)^{3/2}}`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,z}{(R^2+z^2)^{3/2}}`, misconception: 'fixed-distance',
        why: raw`$R$ is the disk’s rim, the radius of only its outermost ring. This ring has radius $s$, so its distance from $P$ is $r_i=\sqrt{s^2+z^2}$.`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q}{s^2+z^2}`, misconception: 'projection',
        why: raw`That adds the bits’ fields whole, as if they all pointed along the axis. Round the ring their sideways parts cancel, and only the fraction $\cos\alpha=z/\sqrt{s^2+z^2}$ of each points along it.`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,s}{(s^2+z^2)^{3/2}}`, misconception: 'wrong-part',
        why: raw`$s/\sqrt{s^2+z^2}$ is $\sin\alpha$, the sideways part, which cancels round the ring. The part along the axis is adjacent to $\alpha$: $z$ over the distance.`},
    ],
    explanation: raw`A thin ring of the disk is the ring lesson’s ring with radius $s$ and charge $\Delta Q$, so its field at $P$ is that answer with those swapped in: $k\,\Delta Q/r_i^2$ times $\cos\alpha=z/r_i$, with $r_i=\sqrt{s^2+z^2}$.`,
    review: {lesson: 'disk', stage: 'piece'}},

  {id: 'disk-bounds', lesson: 'disk', kind: 'setup',
    prompt: raw`The integral adds the rings, written in their radius $s$. What are its bounds?`,
    choices: [
      {correct: true, tex: raw`\int_0^R\cdots\,ds`},
      {tex: raw`\int_{-R}^{R}\cdots\,ds`, misconception: 'bounds',
        why: raw`$s$ is a ring’s radius and cannot be negative. Extending the formula to negative $s$ creates false opposite contributions: its odd integrand would cancel to zero over these bounds.`},
      {tex: raw`\int_0^{2\pi}\cdots\,ds`, misconception: 'bounds',
        why: raw`Once round is the ring lesson’s bounds, in its angle $\theta$. Here the variable is a ring’s radius, and the turn round each ring is already in $dQ=\sigma\,2\pi s\,ds$.`},
      {tex: raw`\int_0^{\infty}\cdots\,ds`, misconception: 'bounds',
        why: raw`That adds rings without end, which is the infinite sheet. The disk’s last ring is at its rim, $s=R$.`},
    ],
    explanation: raw`The bounds are where the charge starts and ends, in the variable integrated over. The rings run from the centre, $s=0$, to the rim, $s=R$, and each already holds its charge all the way round.`,
    review: {lesson: 'disk', stage: 'shrink'}},

  {id: 'disk-far', lesson: 'disk', kind: 'check',
    prompt: raw`$E_z=\dfrac{\sigma}{2\varepsilon_0}\left(1-\dfrac{z}{\sqrt{R^2+z^2}}\right)$. Move $P$ far up the axis, $z\gg R$. Which expression gives the leading far-field behavior?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{z^2}`},
      {tex: raw`\frac{\sigma}{2\varepsilon_0}`, misconception: 'far-limit',
        why: raw`That is the other end: close to the disk’s centre, $z\ll R$, where the disk looks like an endless sheet. Far away its size stops mattering, and it looks like a point charge.`},
      {tex: raw`0`, misconception: 'far-limit',
        why: raw`The field tends to zero as the distance tends to infinity. But zero does not give its leading decay law: at a large finite distance the point-charge expression gives the inverse-square behavior.`},
      {tex: raw`\frac{kQ}{z}`, misconception: 'potential-power',
        why: raw`That falls as $1/z$, as a point charge’s potential does. A localized source with nonzero total charge has an inverse-square leading field far away.`},
    ],
    explanation: raw`When $z\gg R$ the bracket is nearly $R^2/(2z^2)$, so $E_z$ tends to $(\sigma/2\varepsilon_0)R^2/(2z^2)=\pi k\sigma R^2/z^2=kQ/z^2$. From far away every ring is nearly $z$ from $P$ and its field points nearly along the axis: the disk is a point charge.`,
    review: {lesson: 'disk', section: 'What the answer says'}},

  {id: 'disk-near', lesson: 'disk', kind: 'check',
    prompt: raw`Bring $P$ down close to the centre of the disk, $z\ll R$. What does $E_z$ approach?`,
    choices: [
      {correct: true, tex: raw`\frac{\sigma}{2\varepsilon_0}`},
      {tex: raw`0`, misconception: 'cancel-survivor',
        why: raw`A ring’s field is zero at its centre, but a disk is not one ring. Every ring of it is below $P$, so every ring’s part along the axis points the same way, and they add.`},
      {tex: raw`\infty`, misconception: 'closer-stronger',
        why: raw`A point charge’s field grows without end as you come close, but the disk’s charge is spread out. Close to its centre the disk looks like an endless sheet, whose field is finite.`},
      {tex: raw`\frac{\sigma}{\varepsilon_0}`, misconception: 'sheet-double',
        why: raw`That is twice the field. With $k=1/(4\pi\varepsilon_0)$, $2\pi k\sigma$ is $\sigma/(2\varepsilon_0)$; $\sigma/\varepsilon_0$ belongs just outside a conductor, where all of the field is on one side.`},
    ],
    explanation: raw`When $z\ll R$, $z/\sqrt{R^2+z^2}$ is nearly zero and the bracket is nearly one, so $E_z$ tends to $\sigma/(2\varepsilon_0)$. Close to its centre the disk reaches out nearly a right angle from the axis in every direction, and looks like an infinite sheet.`,
    review: {lesson: 'disk', section: 'What the answer says'}},

  {id: 'disk-grow', lesson: 'disk', kind: 'check',
    prompt: raw`Hold $\sigma$ fixed and let the disk grow without end, $R\to\infty$. What does the field at $P$ do?`,
    choices: [
      {correct: true, text: raw`It settles to $\sigma/(2\varepsilon_0)$, the same at every height.`},
      {text: raw`It falls to zero, as the charge spreads ever thinner.`, misconception: 'held-total-charge',
        why: raw`That is what happens with $Q$ held fixed. Here $\sigma$ is fixed, so the charge $|Q|=|\sigma|\pi R^2$ grows with the disk, and every new ring adds to the field.`},
      {text: raw`It grows without end, as the charge does.`, misconception: 'endless-field',
        why: raw`Each ring added at the rim is farther away, and its field meets the axis more slantwise, so for a big disk each adds less than the last, falling off as $1/s^2$, fast enough that the sum settles. Charge without end does not make a field without end here.`},
      {text: raw`It settles to $\sigma/\varepsilon_0$.`, misconception: 'sheet-double',
        why: raw`That is twice the limit. The integral gives $2\pi k\sigma$, and with $k=1/(4\pi\varepsilon_0)$ that is $\sigma/(2\varepsilon_0)$. $\sigma/\varepsilon_0$ is the field just outside a conductor.`},
    ],
    explanation: raw`As $R\to\infty$ with $z$ fixed, $z/\sqrt{R^2+z^2}$ goes to zero, and $E_z$ tends to $\sigma/(2\varepsilon_0)$ with no $z$ left in it: the field of an infinite sheet, which has a lesson of its own.`,
    review: {lesson: 'disk', section: 'Limiting cases'}},

  {id: 'disk-negative', lesson: 'disk', kind: 'transfer',
    prompt: raw`Give the disk a negative charge, with $P$ above its centre. Which way is the field at $P$?`,
    choices: [
      {correct: true, text: raw`Along the axis, toward the disk.`},
      {text: raw`Along the axis, away from the disk.`, misconception: 'sign',
        why: raw`That is a positive disk’s field. A negative charge turns every ring’s arrow round, so the sum points toward the disk.`},
      {text: raw`Out sideways, toward the rim, where most of the charge is.`, misconception: 'missed-cancel',
        why: raw`The sign changes which way each arrow points, not what cancels. Round each ring the sideways parts still cancel, so what is left points along the axis.`},
    ],
    explanation: raw`Each ring’s field now points toward the ring. Round each ring the sideways parts still cancel, and every ring’s part along the axis points down, toward the disk. The formula says the same: $E_z$ has the sign of $\sigma$.`,
    review: {lesson: 'disk', section: 'What the answer says'}},

  {id: 'disk-hole', lesson: 'disk', kind: 'transfer',
    prompt: raw`Cut a hole of radius $a$ out of the middle of the disk, leaving the rest of its charge as it was. Which integral now gives the field at $P$?`,
    choices: [
      {correct: true, tex: raw`\int_a^R\cdots\,ds`},
      {tex: raw`\int_0^{R-a}\cdots\,ds`, misconception: 'bounds',
        why: raw`That is a whole disk of radius $R-a$, its charge in the middle. The charge left is a band from $s=a$ out to $s=R$, and the bounds say where the charge is.`},
      {tex: raw`\int_0^{a}\cdots\,ds`, misconception: 'bounds',
        why: raw`That adds the rings of the hole itself, the charge that was taken away. What is left runs from $s=a$ to the rim.`},
    ],
    explanation: raw`The integrand, one ring’s field, is unchanged; only which rings are there changes. They now run from the hole’s edge, $s=a$, to the rim, $s=R$, so the field is the whole disk’s minus that of a disk of radius $a$.`,
    review: {lesson: 'disk', stage: 'shrink'}},
];
