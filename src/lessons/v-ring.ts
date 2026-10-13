import type {Lesson} from './types';
const raw = String.raw;
/* The ring's potential, in the board's symbols: R, Q, λ = Q/(2πR), θ, P = (0,0,z), rᵢ, ΔQ = λRΔθ, ΔV = kΔQ/rᵢ.
 * V is a number: nothing cancels (all the charge has one sign), the pieces stack into a column, and the sum is
 * exact at any cut. The page ends by differentiating back, E_z = −dV/dz, so the lesson teaches that step too,
 * and says why it may be taken on the axis and nowhere else from this V. */
export const lesson: Lesson = {
  id: 'v-ring',
  lead: raw`Find the potential of a uniform ring at a point $P$ on its axis. The idea that makes it work: potential is a number, not an arrow, and all of the ring is the same distance from $P$, so its pieces simply add, exactly.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A ring of radius $R$ carries a charge $Q$ spread evenly round it, so $\lambda=Q/(2\pi R)$. It lies in the $xy$-plane with its centre at the origin, and $P=(0,0,z)$ is on its axis. The potential $V$ is measured relative to infinity, where it is zero.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the ring into $N$ pieces. The angle $\theta$ says where a piece is round the ring, and a piece $\Delta\theta$ wide holds`,
      {tex: raw`\Delta Q=\lambda R\,\Delta\theta`},
      raw`The pieces need not be small: all of a piece is the same distance from $P$.`,
    ]},
    {heading: 'One piece', body: [
      raw`A point charge’s potential is $k$ times its charge over its distance, with $k=1/(4\pi\varepsilon_0)$. The distance is to the first power, not squared as for the field, and there is no direction at all. Every piece is $r_i$ from $P$, the hypotenuse of a right triangle with legs $R$ and $z$:`,
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{r_i},\qquad r_i=\sqrt{R^2+z^2}`},
      raw`$\Delta V$ has the sign of the piece’s charge.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`For the field, the same length of ring half a turn round undid each piece’s sideways part. A number has no sideways part, and all of this charge has one sign, so that partner adds exactly as much again. This is what makes a potential easier: no angles, no projection, no cancelling to keep track of.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Stack every piece’s number, as the figure stacks them in a column. Every $r_i$ is the same, so it comes out of the sum, and the charges add to $Q$:`,
      {tex: raw`\begin{aligned}V&=\sum_i\frac{k\,\Delta Q_i}{r_i}\\&=\frac{k}{\sqrt{R^2+z^2}}\sum_i\Delta Q_i\\&=\frac{kQ}{\sqrt{R^2+z^2}}\end{aligned}`},
      raw`That is exact, however the ring is cut.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`Make the pieces thinner without end: the sum becomes an integral over $\theta$, once round, and since nothing in it changes with $\theta$ the answer does not move.`,
    ]},
    {heading: 'Differentiate back', body: [
      raw`The field points the way $V$ falls fastest, and on the axis symmetry leaves it only its part along the axis. So the field there is minus the rate $V$ changes with $z$:`,
      {tex: raw`E_z=-\frac{dV}{dz}=\frac{kQz}{(R^2+z^2)^{3/2}}`},
      raw`That is the ring’s field, found with no vectors at all. It needs $V$ as a function of $z$ all along the axis; the field off the axis would need $V$ off it too.`,
    ]},
    {heading: 'What the answer says', body: [
      raw`Far up the axis, $z\gg R$, $V$ approaches $kQ/z$, a point charge’s potential. At the centre the field is zero, yet $V$ is $kQ/R$: a zero field means $V$ is level there, not that it is zero.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§7.3, Calculations of Electric Potential; §7.4, Determining Field from Potential', url: 'https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.3, Electric potential'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 2, The electric potential'},
  ],
};
