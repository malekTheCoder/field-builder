import type {Lesson} from './types';
const raw = String.raw;
/* The disk's potential, in the board's symbols: R, σ = Q/(πR²), s and Δs for a thin ring, ΔQ = σ 2πs Δs, rᵢ =
 * √(s² + z²), P = (0,0,z). Each ring's share is the ring-potential lesson's answer with R → s and Q → ΔQ; the
 * rings stack as numbers. Its integral is the board's, not the page's integralTex, and it differentiates back to
 * the disk's field, as the page's last step does. */
export const lesson: Lesson = {
  id: 'v-disk',
  lead: raw`Find the potential of a uniform disk at a point $P$ on its axis. The idea that makes it work: the disk is thin rings, each adds the number the ring’s potential gives, and numbers add with no directions to sort out.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A disk of radius $R$ carries a charge $Q$ spread evenly over its face, so its surface charge density is $\sigma=Q/(\pi R^2)$. It lies in the $xy$-plane with its centre at the origin, and $P=(0,0,z)$ is on its axis, with $z>0$. $V$ is measured relative to infinity.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the disk into $N$ thin rings round the axis. The ring of radius $s$ and width $\Delta s$ has an area of its circumference times its width, so it holds`,
      {tex: raw`\Delta Q=\sigma\,2\pi s\,\Delta s`},
    ]},
    {heading: 'One ring', body: [
      raw`All of a thin ring is the same distance $r_i=\sqrt{s^2+z^2}$ from $P$, so, just as for the ring’s potential, it adds $k$ times its charge over that distance, with $k=1/(4\pi\varepsilon_0)$:`,
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{r_i}=\frac{k\,\sigma\,2\pi s\,\Delta s}{\sqrt{s^2+z^2}}`},
      raw`It is a number with the sign of the ring’s charge, and the distance is to the first power.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`A potential has no direction, and all of this charge has one sign, so every ring adds to $V$ with that sign. The field needed each ring’s part along the axis, a factor of $\cos\alpha$; the potential needs no such factor, which is why its integral is the easier one.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Stack the rings’ numbers, from the centre, $s=0$, to the rim, $s=R$. The height of the column is the potential, nearly, since each ring’s charge is counted at one radius:`,
      {tex: raw`V\approx\sum_i\frac{k\,\Delta Q_i}{r_i}`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the rings grow ever thinner and the sum becomes an exact integral over $s$. With $u=s^2+z^2$, $s\,ds$ is $du/2$, and the integral of $u^{-1/2}/2$ is $\sqrt u$:`,
      {tex: raw`V=\int_0^R\frac{k\,\sigma\,2\pi s\,ds}{\sqrt{s^2+z^2}}=\frac{\sigma}{2\varepsilon_0}\left(\sqrt{R^2+z^2}-z\right)`},
      raw`using $2\pi k\sigma=\sigma/(2\varepsilon_0)$.`,
    ]},
    {heading: 'Differentiate back', body: [
      raw`On the axis the field has only its part along the axis, and it points the way $V$ falls, so $E_z=-dV/dz$. Differentiating the root and the lone $z$ in turn:`,
      {tex: raw`E_z=\frac{\sigma}{2\varepsilon_0}\left(1-\frac{z}{\sqrt{R^2+z^2}}\right)`},
      raw`That is the disk’s field, its integral traded for an easier one and a derivative.`,
    ]},
    {heading: 'What the answer says', body: [
      raw`Far up the axis, $z\gg R$, $V$ approaches $kQ/z$, a point charge’s potential. At the centre it is finite, $\sigma R/(2\varepsilon_0)$, though the field jumps there. Hold a nonzero $\sigma$ fixed and let the disk grow without end: $|V|$ grows without end, with $V$ keeping the sign of $\sigma$, while the field settles to the sheet’s $\sigma/(2\varepsilon_0)$: an infinite sheet has no potential relative to infinity, only differences.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§7.3, Calculations of Electric Potential; §7.4, Determining Field from Potential', url: 'https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.3, Electric Potential'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 2, The electric potential'},
  ],
};
