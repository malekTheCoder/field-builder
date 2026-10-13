import type {Lesson} from './types';
const raw = String.raw;
/* The ring, in the board's symbols: R, Q, λ = Q/(2πR), θ round the ring, P = (0,0,z), rᵢ, α to the z-axis, ΔQ =
 * λRΔθ. Its one difference from the rod is the one the run makes much of: every bit of the ring is one distance
 * and one angle from P, so the sum is exact at any cut and the integral only confirms it. Its partner is "the
 * same length of ring half a turn round", as the board says, not "the opposite piece": at an odd N there is none. */
export const lesson: Lesson = {
  id: 'ring',
  lead: raw`Find the field of a uniform ring at a point $P$ on its axis. The idea that makes it work: every bit of the ring is the same distance from $P$ at the same angle, so the sideways parts cancel round the ring and the parts along the axis add up exactly.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A ring of radius $R$ carries a charge $Q$ spread evenly round it, so its charge per unit length is $\lambda=Q/(2\pi R)$. It lies in the $xy$-plane with its centre at the origin, and $P=(0,0,z)$ is on its axis, a height $z$ above the centre.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the ring into $N$ pieces. The angle $\theta$ says where a piece is round the ring, and a piece $\Delta\theta$ wide is $R\,\Delta\theta$ long, so it holds`,
      {tex: raw`\Delta Q=\lambda R\,\Delta\theta`},
      raw`On a rod the pieces had to be short, so that each was nearly a point charge. Here they need not be, for a reason the next step makes plain.`,
    ]},
    {heading: 'One piece', body: [
      raw`Every piece is $R$ out from the axis and $P$ is $z$ up it, so the distance $r_i$ from the piece to $P$ is the hypotenuse of a right triangle. Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives the field at $P$ of a point charge $\Delta Q$ at the piece, written without its direction, so with the sign of $\Delta Q$:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2},\qquad r_i=\sqrt{R^2+z^2}`},
      raw`It points away from the piece for a positive charge and toward it for a negative one, at the angle $\alpha$ to the $z$-axis, where $\cos\alpha=z/\sqrt{R^2+z^2}$. A long piece is not a point charge: its own field is a little weaker and leans closer to the axis. But every bit of it, however long, is this same $r_i$ from $P$ at this same $\alpha$, so the piece’s part along the axis, $\Delta E\cos\alpha$, is exactly a point charge’s.`,
    ]},
    {heading: 'What cancels', body: [
      raw`Each piece’s field also has a sideways part, across the axis. The same length of ring half a turn round, at $\theta+\pi$, is just as far from $P$ and makes an equal sideways part pointing the opposite way, so the two cancel. Round the whole ring every sideways part is undone, and only the parts along the axis are left: the field at $P$ is $E_z$.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Every piece has the same $r_i$ and the same $\alpha$, so those come out of the sum, and what is left inside is the sum of the charges, the whole of $Q$:`,
      {tex: raw`\begin{aligned}E_z&=\sum_i\frac{k\,\Delta Q_i}{r_i^2}\cos\alpha\\&=\frac{k\cos\alpha}{R^2+z^2}\sum_i\Delta Q_i\\&=\frac{kQ\cos\alpha}{R^2+z^2}\end{aligned}`},
      raw`That is exact however coarsely the ring was cut.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`Make the pieces thinner without end and the sum becomes an integral over $\theta$ from $0$ to $2\pi$. Nothing in it changes with $\theta$, and the integral of $\lambda R\,d\theta$ once round is $Q$, so the answer does not move. With $\cos\alpha$ written out:`,
      {tex: raw`E_z=\frac{kQz}{(R^2+z^2)^{3/2}}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`$E_z$ has the sign of $Q$: along the axis away from a positive ring, toward a negative one. At the centre, $z=0$, every piece’s field lies flat in the ring’s plane, where the ring half a turn round cancels it, and the field is zero. Far up the axis, $z\gg R$, it approaches $kQ/z^2$: from far away the ring is a point charge. In between, its size rises and falls, largest at $z=R/\sqrt2$. The disk and the sheet are built from thin rings like this one, and each thin ring makes this field, with its own radius and charge.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions: a ring of charge', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1, The electric field of a continuous charge distribution'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: charges and fields'},
  ],
};
