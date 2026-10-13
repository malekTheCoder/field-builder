import type {Lesson} from './types';
const raw = String.raw;
/* The disk, in the board's symbols: R, σ = Q/(πR²), s for a thin ring's radius, Δs its width, ΔQ = σ 2πs Δs,
 * rᵢ = √(s² + z²), α to the axis, P = (0,0,z). Its pieces are rings, and the ring lesson has already found a ring's
 * field, cancellation and all: that reuse is the lesson, so One ring says it in so many words. Its integral is
 * written as the board's Shrink them writes it, not as the page's integralTex. */
export const lesson: Lesson = {
  id: 'disk',
  lead: raw`Find the field of a uniform disk at a point $P$ on its axis. The idea that makes it work: a disk is a set of thin rings, and the ring lesson has already found each ring’s field, so all that is left is to add the rings up.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A disk of radius $R$ carries a charge $Q$ spread evenly over its face: its surface charge density, the charge per unit area, is $\sigma=Q/(\pi R^2)$. It lies in the $xy$-plane with its centre at the origin, and $P=(0,0,z)$ is on its axis, a height $z$ above the centre.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the disk into $N$ thin rings, all centred on the axis. The ring of radius $s$ and width $\Delta s$ has an area of its circumference times its width, so it holds`,
      {tex: raw`\Delta Q=\sigma\,2\pi s\,\Delta s`},
      raw`A ring is not a point charge, and it does not need to be. What a thin ring has is that all of it is the same distance from $P$, and that is the case the ring lesson has already solved.`,
    ]},
    {heading: 'One ring', body: [
      raw`The ring lesson found the field on the axis of a ring of radius $R$ and charge $Q$. This ring is the same thing with radius $s$ and charge $\Delta Q$, so its field at $P$ is that answer with those two swapped in. With $k=1/(4\pi\varepsilon_0)$, $r_i=\sqrt{s^2+z^2}$ its distance from $P$ and $\cos\alpha=z/r_i$:`,
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,z}{(s^2+z^2)^{3/2}}=\frac{k\,\Delta Q}{r_i^2}\cos\alpha`},
    ]},
    {heading: 'What cancels', body: [
      raw`Inside each ring the sideways parts have already cancelled: a bit of the ring and the bit straight across it undo each other’s parts across the axis. So nothing sideways is left to cancel between rings. Every ring’s field at $P$ points straight along the axis, all the same way, away from the disk for a positive charge and toward it for a negative one, and the rings’ fields add like numbers.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the rings from the centre, $s=0$, to the rim, $s=R$, gives the field, nearly:`,
      {tex: raw`E_z\approx\sum_i\frac{k\,\sigma\,2\pi s_i\,\Delta s\,z}{(s_i^2+z^2)^{3/2}}`},
      raw`Nearly, because each ring is $\Delta s$ wide but all its charge is counted at one radius.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`Make the rings thinner without end. The sum becomes an integral over $s$, and counting each ring at one radius becomes exact:`,
      {tex: raw`E_z=\int_0^R\frac{k\,\sigma\,2\pi s\,ds}{s^2+z^2}\cdot\frac{z}{\sqrt{s^2+z^2}}`},
      raw`The substitution $u=s^2+z^2$ turns $s\,ds$ into $du/2$, and the integral of $u^{-3/2}$ gives $-1/\sqrt{s^2+z^2}$. Evaluated at the two ends, with $2\pi k\sigma=\sigma/(2\varepsilon_0)$:`,
      {tex: raw`E_z=\frac{\sigma}{2\varepsilon_0}\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)`},
    ]},
    {heading: 'What the answer says', body: [
      raw`$E_z$ has the sign of $\sigma$. Far up the axis, $z\gg R$, the bracket is nearly $R^2/(2z^2)$ and $E_z$ approaches $kQ/z^2$, a point charge’s field. Close to the centre, $z\ll R$, or with $\sigma$ held fixed while the disk grows without end, the bracket goes to one and $E_z$ approaches $\sigma/(2\varepsilon_0)$, with no $z$ left in it: the field of an infinite sheet, which has a lesson of its own.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions: a disk of charge', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1, The electric field of a continuous charge distribution'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: charges and fields'},
  ],
};
