import type {Question} from '../types';
const raw = String.raw;

/* THE SPHERICAL SHELL, BUILT FROM RINGS, in its lesson's symbols (src/lessons/shell.ts): radius R, charge Q,
 * σ = Q/(4πR²); P = (0, 0, z) on the axis; a ring at the polar angle θ from the +z axis has radius R sin θ, sits at
 * the height R cos θ and holds ΔQ ≈ σ 2πR² sin θ Δθ; r_i² = R² + z² − 2zR cos θ; ΔE_z = k ΔQ (z − R cos θ)/r_i³;
 * u = r_i²; E_z = kQ/z² outside, 0 inside. Every result here is checked by number in tests/shell.test.ts. */
export const bank: Question[] = [
  {id: 'shell-ring-charge', lesson: 'shell', kind: 'setup',
    prompt: raw`A ring of the shell lies between the polar angles $\theta$ and $\theta+d\theta$. What charge does it hold?`,
    choices: [
      {correct: true, tex: raw`dQ=\sigma\,2\pi R^2\sin\theta\,d\theta`},
      {tex: raw`dQ=\sigma\,2\pi R\,d\theta`, misconception: 'ring-area',
        why: raw`$2\pi R$ is the equator’s length. The ring at $\theta$ is only $R\sin\theta$ from the axis, so its length is $2\pi R\sin\theta$, and it is $R\,d\theta$ wide.`},
      {tex: raw`dQ=\sigma\,4\pi R^2\,d\theta`, misconception: 'whole-charge',
        why: raw`$4\pi R^2$ is the area of the whole shell. One ring is a strip $2\pi R\sin\theta$ long and $R\,d\theta$ wide.`},
      {tex: raw`dQ=\sigma\,2\pi R\sin\theta\,d\theta`, misconception: 'piece-length',
        why: raw`That takes the strip’s width as $d\theta$, an angle. A strip spanning the angle $d\theta$ on a sphere of radius $R$ is $R\,d\theta$ wide.`},
    ],
    explanation: raw`The ring at $\theta$ is $R\sin\theta$ from the axis, so it is $2\pi R\sin\theta$ long, and $R\,d\theta$ wide. Its area is $2\pi R^2\sin\theta\,d\theta$, and added from $0$ to $\pi$ that is $4\pi R^2$, the whole shell.`,
    review: {lesson: 'shell', stage: 'cut'}},

  {id: 'shell-distance', lesson: 'shell', kind: 'setup',
    prompt: raw`Every bit of the ring at the polar angle $\theta$ is the same distance $r_i$ from $P=(0,0,z)$. What is $r_i^2$?`,
    choices: [
      {correct: true, tex: raw`r_i^2=R^2+z^2-2zR\cos\theta`},
      {tex: raw`r_i^2=R^2+z^2`, misconception: 'fixed-distance',
        why: raw`That is the distance to the equator only, the ring at $\theta=\pi/2$. A ring at $\theta$ is $R\cos\theta$ up the axis, so $P$ is $z-R\cos\theta$ above its plane.`},
      {tex: raw`r_i^2=(z-R\cos\theta)^2`, misconception: 'fixed-distance',
        why: raw`That is only the height of $P$ above the ring’s plane. The ring is also $R\sin\theta$ out from the axis, and the two are the legs of a right triangle.`},
    ],
    explanation: raw`The ring is $R\sin\theta$ out from the axis and $P$ is $z-R\cos\theta$ above its plane, so $r_i^2$ is $(R\sin\theta)^2+(z-R\cos\theta)^2$, which comes to $R^2+z^2-2zR\cos\theta$: the law of cosines for the triangle of the centre, $P$ and the ring.`,
    review: {lesson: 'shell', stage: 'piece'}},

  {id: 'shell-one-ring', lesson: 'shell', kind: 'setup',
    prompt: raw`The ring at the polar angle $\theta$ holds $\Delta Q$ and is $r_i$ from $P$. What is its field at $P$, along the axis?`,
    choices: [
      {correct: true, tex: raw`\Delta E_z=\frac{k\,\Delta Q\,(z-R\cos\theta)}{r_i^3}`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q}{r_i^2}`, misconception: 'projection',
        why: raw`That is the size of a point charge’s field. Round the ring the sideways parts cancel, and only the fraction $(z-R\cos\theta)/r_i$ of it points along the axis.`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,R\sin\theta}{r_i^3}`, misconception: 'wrong-part',
        why: raw`$R\sin\theta$ is the ring’s radius, the sideways leg: that part cancels round the ring. Along the axis the leg is $z-R\cos\theta$.`},
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,z}{r_i^3}`, misconception: 'fixed-distance',
        why: raw`That is the ring lesson’s answer with the ring in the plane of the centre. This ring sits at the height $R\cos\theta$, so $P$ is $z-R\cos\theta$ above it.`},
    ],
    explanation: raw`Every bit of the ring is $r_i$ from $P$ at the same angle to the axis, so the ring’s field there is along the axis, the fraction $(z-R\cos\theta)/r_i$ of $k\,\Delta Q/r_i^2$. Rings below $P$ and rings above it, where $z-R\cos\theta<0$, make fields pointing opposite ways along the axis, which way set by the sign of the charge.`,
    review: {lesson: 'shell', stage: 'piece'}},

  {id: 'shell-substitution', lesson: 'shell', kind: 'setup',
    prompt: raw`In $\displaystyle\int_0^\pi\frac{\sin\theta\,(z-R\cos\theta)}{(R^2+z^2-2zR\cos\theta)^{3/2}}\,d\theta$, which substitution turns the integrand into powers of one variable?`,
    choices: [
      {correct: true, tex: raw`u=R^2+z^2-2zR\cos\theta,\quad du=2zR\sin\theta\,d\theta`},
      {tex: raw`u=\cos\theta,\quad du=-\sin\theta\,d\theta`, misconception: 'part-substitution',
        why: raw`It takes care of the $\sin\theta$, but leaves $z-Ru$ over $(R^2+z^2-2zRu)^{3/2}$: a quotient, not powers of $u$. Put the whole squared distance in $u$, and the denominator is $u^{3/2}$ at once.`},
      {tex: raw`u=z-R\cos\theta,\quad du=R\sin\theta\,d\theta`, misconception: 'part-substitution',
        why: raw`That is the height of $P$ above the ring, only one leg of the distance. The squared distance is then $R^2-z^2+2zu$, and the denominator $(R^2-z^2+2zu)^{3/2}$ is still not a power of $u$.`},
    ],
    explanation: raw`The squared distance $u=R^2+z^2-2zR\cos\theta$ has $du=2zR\sin\theta\,d\theta$, which absorbs the $\sin\theta$, and $R\cos\theta=(R^2+z^2-u)/(2z)$ gives $z-R\cos\theta=(u+z^2-R^2)/(2z)$. The integrand is then $u^{-1/2}$ and $u^{-3/2}$, from $u=(z-R)^2$ at the top to $(z+R)^2$ at the bottom.`,
    review: {lesson: 'shell', section: 'Shrink them'}},

  {id: 'shell-outside', lesson: 'shell', kind: 'check',
    prompt: raw`Put $P$ anywhere outside the shell, $z>R$, even just past its surface. What is $E_z$?`,
    choices: [
      {correct: true, tex: raw`E_z=\frac{kQ}{z^2}`},
      {tex: raw`E_z\approx\frac{kQ}{z^2}\text{, but only far away}`, misconception: 'outside-point',
        why: raw`For most shapes the point charge’s field is only the far limit. For a shell it is exact at every distance outside: the lesson’s bracket is $1-(-1)=2$ for every $z>R$, and $\sigma\,4\pi R^2=Q$.`},
      {tex: raw`E_z=\frac{kQ}{(z-R)^2}`, misconception: 'fixed-distance',
        why: raw`$z-R$ is the distance to the nearest point of the shell. The charge acts as if it sat at the centre, $z$ away.`},
      {tex: raw`E_z=0`, misconception: 'cancel-survivor',
        why: raw`That is the field inside. Outside, every ring is below $P$ and its field points the same way along the axis; nothing cancels along it.`},
    ],
    explanation: raw`Outside, $|z-R|=z-R$, so the lesson’s bracket is $1-(-1)=2$ and $E_z=\frac{2\pi k\sigma R^2}{z^2}\cdot2=\frac{4\pi R^2k\sigma}{z^2}=\frac{kQ}{z^2}$: a point charge at the centre, exactly, at every $z>R$.`,
    review: {lesson: 'shell', section: 'What the answer says'}},

  {id: 'shell-inside', lesson: 'shell', kind: 'check',
    prompt: raw`Put $P$ inside the shell, off its centre, $0<z<R$. What is the field there?`,
    choices: [
      {correct: true, text: raw`Zero: the rings above $P$ and the rings below it cancel exactly.`},
      {text: raw`Zero only at the centre; elsewhere inside there is a field along the axis.`, misconception: 'shell-inside',
        why: raw`The near cap is close but small; the far side is farther but larger. The lesson’s fraction $(R-z\cos\theta)/\sqrt{R^2+z^2-2zR\cos\theta}$ equals $1$ at both ends for every $z<R$, so they cancel at every point inside, not only at the centre.`},
      {text: raw`$kQ/z^2$, as outside.`, misconception: 'missed-cancel',
        why: raw`Outside, every ring is below $P$ and their fields all point the same way along the axis. Inside, the rings above $P$ point the other way, and they cancel the rest.`},
    ],
    explanation: raw`Inside, $|z-R|=R-z$, and the lesson’s fraction at the top is $(R-z)/(R-z)=1$, the same as the bottom. The bracket is zero and so is $E_z$, at every point inside: the small cap close to $P$ cancels the larger part of the shell farther away.`,
    review: {lesson: 'shell', section: 'What the answer says'}},

  {id: 'shell-what-cancels', lesson: 'shell', kind: 'predict',
    prompt: raw`$P$ is inside the shell, above its centre. Before any integral, what can be said about the rings’ fields at $P$?`,
    choices: [
      {correct: true, text: raw`Each ring’s field is along the axis; the fields of the rings above $P$ point one way along it and those of the rings below it the other, so the sum can cancel.`},
      {text: raw`Each ring cancels its own field completely, because $P$ is inside the shell.`, misconception: 'cancel-survivor',
        why: raw`Round one ring only the sideways parts cancel. Its part along the axis is $k\,\Delta Q\,(z-R\cos\theta)/r_i^3$, which is zero only for the ring level with $P$.`},
      {text: raw`Every ring’s field at $P$ points the same way along the axis, as it does outside.`, misconception: 'missed-cancel',
        why: raw`For a positive shell the rings below $P$ make a field pointing up there and the rings above it one pointing down: $z-R\cos\theta$ changes sign at the height of $P$.`},
    ],
    explanation: raw`Symmetry about the axis cancels each ring’s sideways parts. What is left is each ring’s part along the axis, whose sign is that of $\Delta Q\,(z-R\cos\theta)$: one way for the rings below $P$, the other for those above. Only the integral shows the two sides cancel exactly.`,
    review: {lesson: 'shell', stage: 'cancel'}},

  {id: 'shell-surface', lesson: 'shell', kind: 'check',
    prompt: raw`Cross the shell from just inside to just outside. By how much does $E_z$ jump?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{R^2}=\frac{\sigma}{\varepsilon_0}`},
      {tex: raw`\frac{\sigma}{2\varepsilon_0}`, misconception: 'surface-jump',
        why: raw`$\sigma/(2\varepsilon_0)$ is a lone sheet’s field on each side. The jump across a charged surface is the difference of the two sides, $\sigma/(2\varepsilon_0)-(-\sigma/(2\varepsilon_0))=\sigma/\varepsilon_0$, and here $0$ to $kQ/R^2$.`},
      {tex: raw`0`, misconception: 'surface-jump',
        why: raw`The potential is continuous at the surface; the field is not. Inside it is zero, just outside $kQ/R^2$.`},
    ],
    explanation: raw`Just inside $E_z=0$; just outside $E_z=kQ/R^2$. With $Q=4\pi R^2\sigma$ and $k=1/(4\pi\varepsilon_0)$ the jump is $\sigma/\varepsilon_0$, as in the part of the field straight through any charged surface.`,
    review: {lesson: 'shell', section: 'What the answer says'}},

  {id: 'shell-negative', lesson: 'shell', kind: 'transfer',
    prompt: raw`Give the shell a negative charge. Which way is the field at a point outside it, on the axis above it?`,
    choices: [
      {correct: true, text: raw`Along the axis, toward the shell: $E_z=kQ/z^2$ is negative.`},
      {text: raw`Along the axis, away from the shell.`, misconception: 'sign',
        why: raw`That is a positive shell’s field. A negative charge turns every ring’s field round.`},
      {text: raw`Zero: a negative shell’s rings cancel.`, misconception: 'cancel-survivor',
        why: raw`The sign of the charge does not change what cancels. Outside, every ring’s field still points the same way along the axis, now toward the shell.`},
    ],
    explanation: raw`$E_z=kQ/z^2$ has the sign of $Q$, so for a negative shell it points toward $-z$, back toward the shell. Inside it is still zero.`,
    review: {lesson: 'shell', section: 'What the answer says'}},
];
