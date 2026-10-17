import type {Lesson} from './types';
const raw = String.raw;
/* The spherical shell, built from rings, in the board's symbols: R, Q, σ = Q/(4πR²); P = (0, 0, z) on the axis with
 * z > 0, inside or outside; θ the polar angle of a ring, measured at the centre from the +z axis, from 0 at the top
 * to π at the bottom; ring i is R sin θ out from the axis and R cos θ up it; ΔQ ≈ σ 2πR² sin θ Δθ;
 * r_i² = R² + z² − 2zR cos θ; its part along the axis is k ΔQ (z − R cos θ)/r_i³. The ring lesson's field is the
 * piece; the integral needs the substitution u = r_i², and the answer is the point charge's outside and zero inside.
 * Every claim is checked by number in tests/shell.test.ts. */
export const lesson: Lesson = {
  id: 'shell',
  lead: raw`Find the field of a uniformly charged spherical shell at a point $P$ on its axis. The idea: the shell is a stack of rings, each ring’s field on its axis is known, and adding them gives a point charge’s field outside and none inside.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin shell of radius $R$ holds a charge $Q$ spread evenly, $\sigma=Q/(4\pi R^2)$ per unit area. Its centre is the origin, and $P$ is on the $z$-axis at a height $z>0$: outside the shell when $z>R$, inside it when $z<R$. A ring is placed by its angle $\theta$ from the $+z$ axis, measured at the centre, from $0$ at the top to $\pi$ at the bottom.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the shell into $N$ rings, each spanning $\Delta\theta$. The ring at $\theta$ is $2\pi R\sin\theta$ round and $R\,\Delta\theta$ wide, so it holds nearly`,
      {tex: raw`\Delta Q\approx\sigma\,2\pi R^2\sin\theta\,\Delta\theta`},
      raw`The rings round the equator hold the most.`,
    ]},
    {heading: 'One ring', body: [
      raw`A ring seen from its axis is the ring lesson’s answer: its field points along the axis. This ring sits at the height $R\cos\theta$, so $P$ is $z-R\cos\theta$ above its plane, and by the law of cosines`,
      {tex: raw`r_i^2=R^2+z^2-2zR\cos\theta`},
      raw`The angle $\alpha$ at $P$ compares the bit-to-$P$ direction with $+z$: $\cos\alpha=(z-R\cos\theta)/r_i$. This is the axial projection:`,
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,(z-R\cos\theta)}{r_i^3}`},
      raw`For a ring above $P$ the factor $z-R\cos\theta$ is negative: its field points the other way along the axis.`,
    ]},
    {heading: 'What cancels', body: [
      raw`Round each ring the sideways parts cancel. Outside, every ring is below $P$, so every ring’s field points the same way along the axis, away from a positive shell and toward a negative one.`,
      raw`Inside, the fields of the rings above $P$ and of those below it point opposite ways: the small cap above $P$, near it, against the larger part of the shell below, farther off. Only the sum can say how they compare.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding all $N$ rings gives the field nearly, each ring’s charge counted at one angle $\theta_i$:`,
      {tex: raw`E_z\approx\sum_i\frac{k\,\Delta Q_i\,(z-R\cos\theta_i)}{r_i^3}`},
      raw`With enough rings the sum comes as close as you like; near the surface it takes many.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the sum becomes an integral from the top, $0$, to the bottom, $\pi$:`,
      {tex: raw`E_z=\int_0^\pi\frac{k\sigma\,2\pi R^2\sin\theta\,(z-R\cos\theta)}{(R^2+z^2-2zR\cos\theta)^{3/2}}\,d\theta`},
      raw`The substitution that unlocks it is the squared distance, $u=R^2+z^2-2zR\cos\theta$. Then $du=2zR\sin\theta\,d\theta$ takes care of the $\sin\theta$, and $z-R\cos\theta=(u+z^2-R^2)/(2z)$. The top is $u=(z-R)^2$, the bottom $u=(z+R)^2$, and what is left is two powers of $u$, $u^{-1/2}$ and $(z^2-R^2)\,u^{-3/2}$. Integrated, they join over $\sqrt u$ into one fraction in $\theta$:`,
      {tex: raw`E_z=\frac{2\pi k\sigma R^2}{z^2}\left[\frac{R-z\cos\theta}{\sqrt{R^2+z^2-2zR\cos\theta}}\right]_0^\pi`},
      raw`At the bottom the root is $z+R$, and the fraction there is $1$. At the top the root is $|z-R|$, the distance from $P$ to the top, never negative, and this is where the outside and inside answers differ.`,
    ]},
    {heading: 'What the answer says', body: [
      raw`Outside, $|z-R|=z-R$, the top gives $-1$, and the bracket is $2$; inside, $|z-R|=R-z$, the top gives $1$ too, and the bracket is zero:`,
      {tex: raw`E_z=\frac{kQ}{z^2}\;(z>R),\qquad E_z=0\;(z<R)`},
      raw`Outside, the shell is exactly a point charge $Q$ at its centre, not only far away. Inside there is no field at any point, not only at the centre: any point lies on some line through the centre, and the shell looks the same along every one. On the surface itself the integral gives their mean. Across the surface the field jumps from $0$ to $kQ/R^2$, which is $\sigma/\varepsilon_0$. Gauss’s law gets both answers in two lines; this is the integral it saves.`,
    ]},
  ],
  read: [
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Continuous Charge Distributions (Problem 2.7)'},
    {book: 'OpenStax, University Physics Volume 2', where: '§6.4, Applying Gauss’s Law', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-4-applying-gausss-law'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
