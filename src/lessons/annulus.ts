import type {Lesson} from './types';
const raw = String.raw;
/* The annulus, in the board's symbols: inner radius a, outer radius b, σ = Q/(π(b² − a²)), s for a thin ring's
 * radius, Δs its width, ΔQ = σ 2πs Δs, rᵢ = √(s² + z²), α to the axis, P = (0,0,z). It is the disk's lesson with
 * the middle taken out, and the lesson says so: the same rings, the same field of one ring, the same integral,
 * run from the hole's edge instead of from the centre. What is new is what the answer says at its limits, and
 * that the annulus is a disk less a smaller disk, the superposition the Gauss lesson on holes is built on. */
export const lesson: Lesson = {
  id: 'annulus',
  lead: raw`Find the field of a uniform annulus, a flat ring of charge with a round hole in its middle, at a point $P$ on its axis. The idea that makes it work: it is the disk with its middle rings taken out, so the same rings are added, from the hole’s edge out to the rim.`,
  sections: [
    {heading: 'The setup', body: [
      raw`An annulus of inner radius $a$ and outer radius $b$ carries a charge $Q$ spread evenly over its face. Its area is the disk’s, $\pi b^2$, less the hole’s, $\pi a^2$, so its surface charge density is $\sigma=Q/\bigl(\pi(b^2-a^2)\bigr)$. It lies in the $xy$-plane with its centre at the origin, in the middle of the hole, and $P=(0,0,z)$ is on its axis, a height $z$ above that centre.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the annulus into $N$ thin rings, all centred on the axis, from the hole’s edge to the rim. The ring of radius $s$ and width $\Delta s$ has an area of its circumference times its width, so it holds`,
      {tex: raw`\Delta Q=\sigma\,2\pi s\,\Delta s`},
      raw`These are the disk’s rings exactly, except that there is no charge in the hole: the first ring is at its edge, $s=a$.`,
    ]},
    {heading: 'One ring', body: [
      raw`The ring lesson found the field on the axis of a ring of radius $R$ and charge $Q$. This ring is the same thing with radius $s$ and charge $\Delta Q$. With $k=1/(4\pi\varepsilon_0)$, $r_i=\sqrt{s^2+z^2}$ its distance from $P$ and $\cos\alpha=z/r_i$:`,
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q\,z}{(s^2+z^2)^{3/2}}=\frac{k\,\Delta Q}{r_i^2}\cos\alpha`},
    ]},
    {heading: 'What cancels', body: [
      raw`Inside each ring the sideways parts have already cancelled: a bit of the ring and the bit straight across it undo each other’s parts across the axis. The hole changes none of that: every ring left is still a whole ring. So every ring’s field at $P$ points along the axis, all the same way, away from the annulus for a positive charge and toward it for a negative one, and they add like numbers.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the rings from the hole’s edge, $s=a$, to the rim, $s=b$, gives the field, nearly:`,
      {tex: raw`E_z\approx\sum_i\frac{k\,\sigma\,2\pi s_i\,\Delta s\,z}{(s_i^2+z^2)^{3/2}}`},
      raw`Nearly, because each ring is $\Delta s$ wide but all its charge is counted at one radius.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the rings grow ever thinner. The sum becomes an integral over $s$, and counting each ring at one radius becomes exact:`,
      {tex: raw`E_z=\int_a^b\frac{k\,\sigma\,2\pi s\,ds}{s^2+z^2}\cdot\frac{z}{\sqrt{s^2+z^2}}`},
      raw`The substitution $u=s^2+z^2$ turns $s\,ds$ into $du/2$, and the integral of $u^{-3/2}\,du/2$ is $-u^{-1/2}$, that is $-1/\sqrt{s^2+z^2}$. Taken from the hole’s edge to the rim, the upper end minus the lower:`,
      {tex: raw`E_z=2\pi k\sigma z\left(\frac{1}{\sqrt{a^2+z^2}}-\frac{1}{\sqrt{b^2+z^2}}\right)`},
      raw`The hole’s edge is nearer $P$ than the rim, so the first term is the larger: above the annulus $E_z$ has the sign of $\sigma$, and below it the opposite.`,
    ]},
    {heading: 'What the answer says', body: [
      raw`With $2\pi k\sigma=\sigma/(2\varepsilon_0)$, the answer is two disks: the disk lesson’s answer for radius $b$, $(\sigma/2\varepsilon_0)\bigl(1-z/\sqrt{b^2+z^2}\bigr)$, less the same answer for radius $a$. An annulus is a disk with a smaller disk of the same $\sigma$ taken out.`,
      raw`So each limit is a lesson met before. With no hole, $a\to0$, the first term is $z/\sqrt{z^2}=1$ above the annulus, and it is the disk. With $\sigma$ fixed and the rim run out, $b\to\infty$, the second term goes and what is left, $(\sigma/2\varepsilon_0)\,z/\sqrt{a^2+z^2}$, is an infinite sheet with a round hole: the sheet’s $\sigma/(2\varepsilon_0)$ less the field of the disk the hole took out, the superposition the Gauss lesson “Holes by superposition” uses. Far up the axis, $z\gg b$, it is a point charge’s $kQ/z^2$. And with $Q$ fixed and $a\to b$, every ring is nearly $b$ out: a ring’s $kQz/(b^2+z^2)^{3/2}$.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions: a disk of charge', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Continuous Charge Distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
