import type {Question} from '../types';
const raw = String.raw;

/* THE DISK'S POTENTIAL, ON ITS AXIS, in its lesson's symbols (src/lessons/v-disk.ts): radius R, σ = Q/(πR²), thin
 * rings of radius s and width Δs holding ΔQ = σ 2πs Δs, rᵢ = √(s² + z²), P = (0, 0, z) with z > 0, ΔV = kΔQ/rᵢ,
 * V = (σ/2ε₀)(√(R² + z²) − z), and E_z = −dV/dz back to the disk's field. Its pieces are rings, so its second stage
 * is One ring. Every result and limit here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'v-disk-no-projection', lesson: 'v-disk', kind: 'predict',
    prompt: raw`The disk’s field needed each ring’s part along the axis, a factor $\cos\alpha=z/\sqrt{s^2+z^2}$. Why does its potential need no such factor?`,
    choices: [
      {correct: true, text: raw`A potential is a number with no direction: each ring adds $k\,\Delta Q/r_i$, with the sign of its charge, and there is nothing to project.`},
      {text: raw`It does need it: each ring’s share must be projected onto the axis, as for the field.`, misconception: 'potential-arrow',
        why: raw`Projecting takes the part of an arrow along a direction. $k\,\Delta Q/r_i$ is a number, not an arrow, so it has no parts and nothing to project.`},
      {text: raw`Because the sideways parts have already cancelled round each ring.`, misconception: 'potential-arrow',
        why: raw`That is why the field has no sideways part. The potential never had sideways parts at all: it is a number, and nothing in it cancels for charge of one sign.`},
    ],
    explanation: raw`Each thin ring is all one distance $r_i=\sqrt{s^2+z^2}$ from $P$, so it adds $k\,\Delta Q/r_i$ to $V$, a number with the sign of its charge. A number has no direction, so there is no $\cos\alpha$ and nothing cancels, which is why the potential’s integral is the easier one.`,
    review: {lesson: 'v-disk', stage: 'cancel'}},

  {id: 'v-disk-dv', lesson: 'v-disk', kind: 'setup',
    prompt: raw`What does the ring of radius $s$ and width $\Delta s$ add to the potential at $P$?`,
    choices: [
      {correct: true, tex: raw`\Delta V=\frac{k\,\sigma\,2\pi s\,\Delta s}{\sqrt{s^2+z^2}}`},
      {tex: raw`\Delta V=\frac{k\,\sigma\,2\pi s\,\Delta s\,z}{(s^2+z^2)^{3/2}}`, misconception: 'potential-arrow',
        why: raw`That is the ring’s field along the axis, with the projection $z/r_i$ and an extra power of $r_i$. A potential has no direction to project onto.`},
      {tex: raw`\Delta V=\frac{k\,\sigma\,\pi s^2\,\Delta s}{\sqrt{s^2+z^2}}`, misconception: 'ring-area',
        why: raw`$\pi s^2$ is the area of the whole disk inside the ring. A thin ring’s area is its circumference times its width, $2\pi s\,\Delta s$.`},
      {tex: raw`\Delta V=\frac{k\,\sigma\,2\pi s\,\Delta s}{\sqrt{R^2+z^2}}`, misconception: 'fixed-distance',
        why: raw`$\sqrt{R^2+z^2}$ is the distance to the rim only. This ring has radius $s$, so it is $\sqrt{s^2+z^2}$ from $P$.`},
    ],
    explanation: raw`The ring holds $\Delta Q=\sigma\,2\pi s\,\Delta s$, and all of it is $r_i=\sqrt{s^2+z^2}$ from $P$, so it adds $k\,\Delta Q/r_i$: the ring’s potential, with $s$ for $R$ and $\Delta Q$ for $Q$.`,
    review: {lesson: 'v-disk', stage: 'piece'}},

  {id: 'v-disk-substitution', lesson: 'v-disk', kind: 'setup',
    prompt: raw`What is $\int_0^R s\,ds/\sqrt{s^2+z^2}$, for $z>0$? Use $u=s^2+z^2$.`,
    choices: [
      {correct: true, tex: raw`\sqrt{R^2+z^2}-z`},
      {tex: raw`2\left(\sqrt{R^2+z^2}-z\right)`, misconception: 'jacobian',
        why: raw`With $u=s^2+z^2$, $du=2s\,ds$, so $s\,ds$ is $du/2$, not $du$. Leaving out that half doubles the answer.`},
      {tex: raw`\sqrt{R^2+z^2}`, misconception: 'bounds',
        why: raw`That is only the upper end. At the lower end, $s=0$, the root is $\sqrt{z^2}=z$, and it is subtracted.`},
      {tex: raw`\frac{1}{z}-\frac{1}{\sqrt{R^2+z^2}}`, misconception: 'potential-power',
        why: raw`That is the integral of $s\,ds/(s^2+z^2)^{3/2}$, the field’s, with its higher power of the distance. The potential’s integrand has the root to the first power.`},
    ],
    explanation: raw`$du=2s\,ds$, so the integral is $\int du/(2\sqrt u)=\sqrt u=\sqrt{s^2+z^2}$. From $s=0$ to $s=R$ that is $\sqrt{R^2+z^2}-z$, and with $2\pi k\sigma=\sigma/(2\varepsilon_0)$ in front it gives $V$.`,
    review: {lesson: 'v-disk', stage: 'shrink'}},

  {id: 'v-disk-differentiate', lesson: 'v-disk', kind: 'setup',
    prompt: raw`$V=\dfrac{\sigma}{2\varepsilon_0}\left(\sqrt{R^2+z^2}-z\right)$ all along the axis above the disk. What is the field there?`,
    choices: [
      {correct: true, tex: raw`E_z=\frac{\sigma}{2\varepsilon_0}\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)`},
      {tex: raw`E_z=-\frac{\sigma}{2\varepsilon_0}\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)`, misconception: 'gradient-sign',
        why: raw`That is $+dV/dz$, with the minus left out. $V$ falls as $P$ rises above a positive disk, so the field points up, away from it.`},
      {tex: raw`E_z=\frac{\sigma}{2\varepsilon_0}`, misconception: 'gradient',
        why: raw`That differentiates only the lone $z$, as if the root were a constant. The root changes with $z$ too, and its derivative, $z/\sqrt{R^2+z^2}$, is what makes a finite disk’s field fall off.`},
    ],
    explanation: raw`Differentiating the root and the lone $z$ in turn, $dV/dz=\dfrac{\sigma}{2\varepsilon_0}\left(\dfrac{z}{\sqrt{R^2+z^2}}-1\right)$. The field is minus that: the disk’s field, its integral traded for an easier one and a derivative.`,
    review: {lesson: 'v-disk', section: 'Differentiate back'}},

  {id: 'v-disk-far', lesson: 'v-disk', kind: 'check',
    prompt: raw`Move $P$ far up the axis, $z\gg R$. What does $V$ become?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{z}`},
      {tex: raw`\frac{kQ}{z^2}`, misconception: 'potential-power',
        why: raw`That falls as the inverse square, as a point charge’s field does. Its potential falls as $1/z$, one power lower.`},
      {tex: raw`\frac{\sigma R}{2\varepsilon_0}`, misconception: 'far-limit',
        why: raw`That is $V$ at the disk’s centre. Far away the disk looks like a point charge, and its potential falls with the distance to it.`},
    ],
    explanation: raw`When $z\gg R$, $\sqrt{R^2+z^2}-z$ is nearly $R^2/(2z)$, so $V$ tends to $(\sigma/2\varepsilon_0)R^2/(2z)=\pi k\sigma R^2/z=kQ/z$, the potential of a point charge $Q$.`,
    review: {lesson: 'v-disk', section: 'What the answer says'}},

  {id: 'v-disk-centre', lesson: 'v-disk', kind: 'check',
    prompt: raw`What is the potential at the centre of the disk, $z=0$?`,
    choices: [
      {correct: true, tex: raw`V=\frac{\sigma R}{2\varepsilon_0}=\frac{2kQ}{R}`},
      {tex: raw`V=\frac{kQ}{R}`, misconception: 'fixed-distance',
        why: raw`That puts all of the charge at the rim, $R$ from the centre. A ring of radius $s$ is only $s$ away, closer than the rim, so $V$ is twice as large.`},
      {tex: raw`V\to\infty`, misconception: 'ring-point',
        why: raw`$V$ grows without end beside a point charge, but this charge is spread over a surface. Each ring of radius $s$ is $s$ from the centre and adds $2\pi k\sigma\,ds$, a finite amount.`},
    ],
    explanation: raw`At $z=0$ each ring is $s$ from $P$, so it adds $k\sigma\,2\pi s\,ds/s=2\pi k\sigma\,ds$, and from $0$ to $R$ that is $2\pi k\sigma R=\sigma R/(2\varepsilon_0)=2kQ/R$: finite, though the field jumps there.`,
    review: {lesson: 'v-disk', section: 'Limiting cases'}},

  {id: 'v-disk-grow', lesson: 'v-disk', kind: 'check',
    prompt: raw`Hold $\sigma$ fixed and let the disk grow without end. Its field settles to $\sigma/(2\varepsilon_0)$. What does $V$ at $P$ do?`,
    choices: [
      {correct: true, text: raw`It grows without end: an infinite sheet has no potential relative to infinity, only differences.`},
      {text: raw`It settles to $\sigma/(2\varepsilon_0)$, as the field does.`, misconception: 'field-for-potential',
        why: raw`That is the field’s limit. The field settles because a far ring’s part along the axis is small; the potential takes no part, and each new ring at the rim adds nearly $2\pi k\sigma\,ds$, which never dies away.`},
      {text: raw`It falls to zero, as the charge spreads ever thinner.`, misconception: 'held-total-charge',
        why: raw`With $\sigma$ fixed the charge does not spread thinner: $Q=\sigma\pi R^2$ grows with the disk, and every new ring adds to $V$.`},
    ],
    explanation: raw`For a big disk, $\sqrt{R^2+z^2}-z$ is nearly $R$, so $V$ is nearly $\sigma R/(2\varepsilon_0)$ and grows without end. Each new ring at the rim adds nearly $2\pi k\sigma\,ds$ to $V$ but almost nothing to the field. So an infinite sheet’s potential is only ever given as a difference.`,
    review: {lesson: 'v-disk', section: 'Limiting cases'}},

  {id: 'v-disk-hole', lesson: 'v-disk', kind: 'transfer',
    prompt: raw`Cut a hole of radius $a$ out of the middle of the disk, leaving the rest of its charge as it was. What is $V$ at $P$ now?`,
    choices: [
      {correct: true, tex: raw`V=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{R^2+z^2}-\sqrt{a^2+z^2}\right)`},
      {tex: raw`V=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{(R-a)^2+z^2}-z\right)`, misconception: 'bounds',
        why: raw`That is a whole disk of radius $R-a$, its charge in the middle. The charge left is a band from $s=a$ to $s=R$, so those are the bounds.`},
      {tex: raw`V=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{R^2+z^2}-a\right)`, misconception: 'fixed-distance',
        why: raw`At the lower end the root is $\sqrt{a^2+z^2}$, the inner edge’s distance from $P$, not the radius $a$.`},
    ],
    explanation: raw`The rings now run from $s=a$ to $s=R$, so the same antiderivative, $\sqrt{s^2+z^2}$ between those ends, gives $\sqrt{R^2+z^2}-\sqrt{a^2+z^2}$. It is the whole disk’s potential minus that of a disk of radius $a$: numbers subtract as easily as they add.`,
    review: {lesson: 'v-disk', stage: 'shrink'}},

  {id: 'v-disk-negative', lesson: 'v-disk', kind: 'transfer',
    prompt: raw`Make the disk’s charge negative. What happens to $V$ and to $E_z$ on the axis above it?`,
    choices: [
      {correct: true, text: raw`Both change sign: $V$ is negative, and the field points toward the disk.`},
      {text: raw`$V$ stays positive, since a potential has no direction; the field points toward the disk.`, misconception: 'sign',
        why: raw`No direction does not mean no sign. Every ring adds $k\,\Delta Q/r_i$, negative for a negative charge, so $V$ is negative.`},
      {text: raw`$V$ is negative, and the field still points away from the disk.`, misconception: 'gradient-sign',
        why: raw`The field is $-dV/dz$. With $V$ negative and rising toward zero as $P$ moves up, $dV/dz$ is positive, so the field points down, toward the disk.`},
    ],
    explanation: raw`Every ring’s $k\,\Delta Q/r_i$ has the sign of its charge, so $V$ is negative. It rises toward zero as $P$ moves up, so $E_z=-dV/dz$ is negative: the field points toward the disk, as it must for a negative charge.`,
    review: {lesson: 'v-disk', section: 'Differentiate back'}},
];
