import type {Question} from '../types';
const raw = String.raw;

/* THE ANNULUS, ON ITS AXIS, in its lesson's symbols (src/lessons/annulus.ts): inner radius a, outer radius b, charge
 * Q, σ = Q/(π(b² − a²)), thin rings of radius s and width ds holding dQ = σ 2πs ds, rᵢ = √(s² + z²), α to the axis,
 * P = (0, 0, z). It is the disk with its middle rings taken out, so its second stage is One ring, and its answer is
 * a disk of radius b less a disk of radius a. Every result and limit here is checked by number in
 * tests/quiz-physics.test.ts, for both signs of the charge. */
export const bank: Question[] = [
  {id: 'annulus-what-cancels', lesson: 'annulus', kind: 'predict',
    prompt: raw`Cut the annulus into thin rings round its axis, from the hole’s edge to the rim. Does the hole leave anything sideways that no longer cancels at $P$?`,
    choices: [
      {correct: true, text: raw`No: every ring that is left is still a whole ring, so its sideways parts cancel round it and its field at $P$ points along the axis.`},
      {text: raw`Yes: with the middle gone, the rings’ sideways parts have nothing across the centre to cancel them.`, misconception: 'missed-cancel',
        why: raw`What cancels a bit’s sideways part is the bit straight across the same ring, not anything in the middle. The hole removes whole rings, and every ring left still has both its halves.`},
      {text: raw`No, and nothing along the axis is left either: the hole makes the field at $P$ zero.`, misconception: 'cancel-survivor',
        why: raw`Only the sideways parts cancel. Every ring is on the same side of $P$, so every ring’s part along the axis points the same way, and those parts add.`},
    ],
    explanation: raw`A bit of a ring and the bit straight across that ring undo each other’s parts across the axis, wherever the ring is. The hole takes whole rings away and leaves whole rings, so each one left makes a field at $P$ along the axis only, all pointing the same way, and they add like numbers.`,
    review: {lesson: 'annulus', stage: 'cancel'}},

  {id: 'annulus-density', lesson: 'annulus', kind: 'setup',
    prompt: raw`The annulus holds a charge $Q$ spread evenly over its face, between the radii $a$ and $b$. What is its surface charge density $\sigma$?`,
    choices: [
      {correct: true, tex: raw`\sigma=\frac{Q}{\pi(b^2-a^2)}`},
      {tex: raw`\sigma=\frac{Q}{\pi b^2}`, misconception: 'bounds',
        why: raw`$\pi b^2$ is the area of the whole disk, hole and all. There is no charge in the hole, so $Q$ is spread over the disk’s area less the hole’s, $\pi b^2-\pi a^2$.`},
      {tex: raw`\sigma=\frac{Q}{\pi(b-a)^2}`, misconception: 'ring-area',
        why: raw`That is the area of a disk as wide as the band, $b-a$, in radius. The band’s own area is the big disk’s less the hole’s, $\pi(b^2-a^2)$, which is larger: a band round the outside of a disk is long.`},
    ],
    explanation: raw`The face is the disk of radius $b$ with the disk of radius $a$ cut out, so its area is $\pi b^2-\pi a^2=\pi(b^2-a^2)$, and the density is the charge over that area. Each thin ring then holds $dQ=\sigma\,2\pi s\,ds$, and these add from $s=a$ to $s=b$ back to $Q$.`,
    review: {lesson: 'annulus', section: 'The setup'}},

  {id: 'annulus-one-ring', lesson: 'annulus', kind: 'setup',
    prompt: raw`The ring of radius $s$ and charge $\Delta Q$ is one of the annulus’s rings. What field does it make at $P$?`,
    choices: [
      {correct: true, tex: raw`\Delta E_z=\frac{k\,\Delta Q\,z}{(s^2+z^2)^{3/2}}`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,z}{(b^2+z^2)^{3/2}}`, misconception: 'fixed-distance',
        why: raw`$b$ is the rim, the radius of only the outermost ring. This ring has radius $s$, so its distance from $P$ is $r_i=\sqrt{s^2+z^2}$.`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q}{s^2+z^2}`, misconception: 'projection',
        why: raw`That adds the bits’ fields whole, as if they all pointed along the axis. Round the ring their sideways parts cancel, and only the fraction $\cos\alpha=z/\sqrt{s^2+z^2}$ of each points along it.`},
    ],
    explanation: raw`A ring of the annulus is the ring lesson’s ring with radius $s$ and charge $\Delta Q$, so its field at $P$ is $k\,\Delta Q/r_i^2$ times $\cos\alpha=z/r_i$, with $r_i=\sqrt{s^2+z^2}$. It is the disk’s ring exactly: the hole changes which rings there are, not what one ring does.`,
    review: {lesson: 'annulus', stage: 'piece'}},

  {id: 'annulus-bounds', lesson: 'annulus', kind: 'setup',
    prompt: raw`The integral adds the rings, written in their radius $s$. What are its bounds?`,
    choices: [
      {correct: true, tex: raw`\int_a^b\cdots\,ds`},
      {tex: raw`\int_0^{b}\cdots\,ds`, misconception: 'bounds',
        why: raw`That adds the rings of the hole too, from the centre out. There is no charge there: the first ring is at the hole’s edge, $s=a$.`},
      {tex: raw`\int_0^{b-a}\cdots\,ds`, misconception: 'bounds',
        why: raw`That is a whole disk of radius $b-a$, its charge in the middle. The charge is a band from $s=a$ out to $s=b$, and the bounds say where the charge is.`},
      {tex: raw`\int_a^{\infty}\cdots\,ds`, misconception: 'bounds',
        why: raw`That adds rings without end, an infinite sheet with a hole. The annulus’s last ring is at its rim, $s=b$.`},
    ],
    explanation: raw`The bounds are where the charge starts and ends, in the variable integrated over. The rings run from the hole’s edge, $s=a$, to the rim, $s=b$, and each already holds its charge all the way round.`,
    review: {lesson: 'annulus', stage: 'shrink'}},

  {id: 'annulus-result', lesson: 'annulus', kind: 'setup',
    prompt: raw`The antiderivative of $s/(s^2+z^2)^{3/2}$ is $-1/\sqrt{s^2+z^2}$. $E_z$ is $2\pi k\sigma z$ times which bracket?`,
    choices: [
      {correct: true, tex: raw`\frac{1}{\sqrt{a^2+z^2}}-\frac{1}{\sqrt{b^2+z^2}}`},
      {tex: raw`\frac{1}{\sqrt{b^2+z^2}}-\frac{1}{\sqrt{a^2+z^2}}`, misconception: 'sign',
        why: raw`That takes the lower end minus the upper. Upper minus lower of $-1/\sqrt{s^2+z^2}$ is $-1/\sqrt{b^2+z^2}$ plus $1/\sqrt{a^2+z^2}$: the hole’s edge is nearer $P$, so its term is the larger, and above the annulus $E_z$ has the sign of $\sigma$.`},
      {tex: raw`\frac{1}{z}-\frac{1}{\sqrt{b^2+z^2}}`, misconception: 'bounds',
        why: raw`That is the whole disk of radius $b$: the integral run from $s=0$, where $1/\sqrt{z^2}=1/z$ above it. The lower end is the hole’s edge, which gives $1/\sqrt{a^2+z^2}$, smaller than $1/z$.`},
    ],
    explanation: raw`Upper end minus lower: the rim gives $-1/\sqrt{b^2+z^2}$, and taking away the hole’s edge’s $-1/\sqrt{a^2+z^2}$ adds $1/\sqrt{a^2+z^2}$. Times $2\pi k\sigma z$, and with $2\pi k\sigma=\sigma/(2\varepsilon_0)$, that is the disk of radius $b$ less the disk of radius $a$.`,
    review: {lesson: 'annulus', stage: 'shrink'}},

  {id: 'annulus-no-hole', lesson: 'annulus', kind: 'check',
    prompt: raw`Hold $\sigma$ fixed and let the hole shrink to nothing, $a\to0$. What does $E_z$ become?`,
    choices: [
      {correct: true, tex: raw`\frac{\sigma}{2\varepsilon_0}\left(1-\frac{z}{\sqrt{b^2+z^2}}\right)`},
      {tex: raw`0`, misconception: 'cancel-survivor',
        why: raw`Closing the hole adds charge, it does not take any away, and every ring’s part along the axis points the same way. The field grows to the whole disk’s.`},
      {tex: raw`\frac{\sigma}{2\varepsilon_0}`, misconception: 'bounds',
        why: raw`That is the endless sheet’s field. The rim stays at $b$, so with no hole the annulus is a disk of radius $b$, whose field is less than the sheet’s by the rings past the rim.`},
    ],
    explanation: raw`At $a=0$ the first term is $z/\sqrt{z^2}=1$ above the annulus, and $E_z$ is the disk lesson’s answer for radius $b$. The hole only ever took away the field of the rings inside it.`,
    review: {lesson: 'annulus', section: 'What the answer says'}},

  {id: 'annulus-holed-sheet', lesson: 'annulus', kind: 'check',
    prompt: raw`Hold $\sigma$ and the hole fixed and let the rim run out without end, $b\to\infty$. What does $E_z$ become?`,
    choices: [
      {correct: true, tex: raw`\frac{\sigma}{2\varepsilon_0}\,\frac{z}{\sqrt{a^2+z^2}}`},
      {tex: raw`\frac{\sigma}{2\varepsilon_0}`, misconception: 'bounds',
        why: raw`That is a whole endless sheet, its middle included. The hole is still there: what is left is the sheet less the disk of radius $a$, smaller by that disk’s field.`},
      {tex: raw`0`, misconception: 'held-total-charge',
        why: raw`That is what happens with $Q$ held fixed, spread ever thinner. Here $\sigma$ is fixed, so the charge magnitude grows with the rim and every new ring adds to the field.`},
      {tex: raw`\frac{\sigma}{\varepsilon_0}\,\frac{z}{\sqrt{a^2+z^2}}`, misconception: 'sheet-double',
        why: raw`That is twice the field. With $k=1/(4\pi\varepsilon_0)$, $2\pi k\sigma$ is $\sigma/(2\varepsilon_0)$; $\sigma/\varepsilon_0$ belongs just outside a conductor.`},
    ],
    explanation: raw`As $b\to\infty$ the term $z/\sqrt{b^2+z^2}$ goes to zero, leaving $(\sigma/2\varepsilon_0)\,z/\sqrt{a^2+z^2}$: an infinite sheet with a round hole. It is the sheet’s $\sigma/(2\varepsilon_0)$ less the field of the disk of radius $a$ that the hole took out, the superposition the Gauss lesson on holes is built on.`,
    review: {lesson: 'annulus', section: 'Limiting cases'}},

  {id: 'annulus-far', lesson: 'annulus', kind: 'check',
    prompt: raw`Move $P$ far up the axis, $z\gg b$. What does $E_z$ approach?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{z^2},\quad Q=\sigma\pi(b^2-a^2)`},
      {tex: raw`\frac{k\,\sigma\pi b^2}{z^2}`, misconception: 'bounds',
        why: raw`Far away the annulus is a point charge, but of its own charge: $\sigma$ times its area, $\pi(b^2-a^2)$. $\sigma\pi b^2$ counts charge in the hole, where there is none.`},
      {tex: raw`\frac{kQ}{z}`, misconception: 'potential-power',
        why: raw`That falls as $1/z$, as a point charge’s potential does. A finite charge’s field, seen from far away, falls as the inverse square.`},
    ],
    explanation: raw`From far away every ring is nearly $z$ from $P$ and its field points nearly along the axis, so the annulus is a point charge holding its own charge, $Q=\sigma\pi(b^2-a^2)$. The error in that is of order $(b/z)^2$.`,
    review: {lesson: 'annulus', section: 'What the answer says'}},

  {id: 'annulus-thin', lesson: 'annulus', kind: 'transfer',
    prompt: raw`Hold the charge $Q$ fixed and close the annulus up onto its rim, $a\to b$. What does the field at $P$ become?`,
    choices: [
      {correct: true, tex: raw`\frac{kQz}{(b^2+z^2)^{3/2}}`},
      {tex: raw`\frac{kQ}{b^2+z^2}`, misconception: 'projection',
        why: raw`That is the charge’s whole $kQ/r_i^2$, with every bit $r_i=\sqrt{b^2+z^2}$ away. Round the ring the sideways parts cancel, and only the fraction $\cos\alpha=z/\sqrt{b^2+z^2}$ of each points along the axis.`},
      {tex: raw`\frac{kQ}{z^2}`, misconception: 'ring-point',
        why: raw`That is the far field, true only for $z\gg b$. A thin annulus is a ring of radius $b$, and close in its charge is $\sqrt{b^2+z^2}$ from $P$, all at one angle to the axis.`},
    ],
    explanation: raw`As $a\to b$ every ring is nearly $b$ from the axis, so all of the charge is $\sqrt{b^2+z^2}$ from $P$ at one angle: a ring of radius $b$ holding $Q$, with the ring lesson’s field. In the formula, $\bigl(1/\sqrt{a^2+z^2}-1/\sqrt{b^2+z^2}\bigr)/(b^2-a^2)$ becomes a derivative, $1/\bigl(2(b^2+z^2)^{3/2}\bigr)$.`,
    review: {lesson: 'annulus', section: 'Limiting cases'}},

  {id: 'annulus-negative', lesson: 'annulus', kind: 'transfer',
    prompt: raw`Give the annulus a negative charge, with $P$ above the middle of its hole. Which way is the field at $P$?`,
    choices: [
      {correct: true, text: raw`Along the axis, toward the annulus.`},
      {text: raw`Along the axis, away from the annulus.`, misconception: 'sign',
        why: raw`That is a positive annulus’s field. A negative charge turns every ring’s arrow round, so the sum points toward the annulus.`},
      {text: raw`Out sideways, toward the rim, since there is no charge under $P$.`, misconception: 'missed-cancel',
        why: raw`The hole and the sign change which rings there are and which way each arrow points, not what cancels. Round each ring the sideways parts still cancel, so what is left points along the axis.`},
    ],
    explanation: raw`Each ring’s field now points toward the ring. Round each ring the sideways parts still cancel, and every ring’s part along the axis points down, toward the annulus. The formula says the same: above the annulus $E_z$ has the sign of $\sigma$.`,
    review: {lesson: 'annulus', section: 'What the answer says'}},
];
