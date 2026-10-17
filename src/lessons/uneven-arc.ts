import type {Lesson} from './types';
const raw = String.raw;
/* The semicircle with uneven charge, in the board's symbols: R, θ measured from the x-axis, its line of symmetry, from
 * −π/2 to π/2; P at the centre; λ(θ) = λ₀ cos θ, so Q = 2λ₀R; ΔQ ≈ λ₀ cos θ R Δθ; ΔE_x = −kΔQ cos θ/R². The arc's
 * lesson with the density weighted: the mirror pairs survive, because cos(−θ) = cos θ, and what the uneven density
 * changes is how much each pair adds. The integral is the board's, not the page's integralTex. */
export const lesson: Lesson = {
  id: 'uneven-arc',
  lead: raw`Find the field at the centre $P$ of a semicircle whose charge is piled toward its middle. The idea that makes it work: every piece is still $R$ from $P$ and still has a mirror holding the same charge, so the parts across the axis still cancel; the density decides how much each pair adds along it.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A semicircle of radius $R$ is set symmetrically about the $x$-axis, and $P$ is its centre. A piece’s angle $\theta$ is measured from the $x$-axis, so the semicircle runs from $\theta=-\pi/2$ to $\theta=\pi/2$. Its charge per unit length is`,
      {tex: raw`\lambda(\theta)=\lambda_0\cos\theta`},
      raw`largest in size on the axis and zero at the two ends. (Measured instead from the diameter, from one end, the same density reads $\lambda_0\sin\theta'$.) It holds $Q=\int_{-\pi/2}^{\pi/2}\lambda_0\cos\theta\,R\,d\theta=2\lambda_0R$ in all.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the semicircle into $N$ pieces. A piece $\Delta\theta$ wide is $R\,\Delta\theta$ long, and the density across it is nearly its value at the middle, so it holds`,
      {tex: raw`\Delta Q\approx\lambda_0\cos\theta\,R\,\Delta\theta`},
      raw`Every bit of a piece is $R$ from $P$, but along a piece the density changes and the bits’ fields turn, so a piece must be short to be nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$ and $r_i=R$ for every piece, gives the size of a piece’s field at $P$. It lies along the radius through the piece, carried on through $P$: away from a positive piece, toward a negative one. That radius makes the angle $\theta$ with the $x$-axis, so for a positive piece the part along $x$ points toward $-x$:`,
      {tex: raw`\Delta E_x=-\frac{k\,\Delta Q}{R^2}\cos\theta`},
      raw`A piece near the axis holds the most charge, and its field points almost along the axis; a piece near an end holds almost nothing.`,
    ]},
    {heading: 'What cancels', body: [
      raw`Take the piece’s mirror, at $-\theta$. It is as far from $P$, and since $\cos(-\theta)=\cos\theta$ it holds the same charge, so their parts across the axis cancel and their parts along it add, just as on an even arc: $E_y=0$.`,
      raw`What the uneven density changes is how much each pair is worth. A pair near the axis holds the most charge, and nearly all of its field points along the axis; a pair near an end holds little, and nearly all of its field lies across the axis and cancels. So less of the charge goes to cancelling than when it is spread evenly.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the $x$-parts of all $N$ pieces gives the field, nearly, since each piece’s $\cos\theta$ is taken at its middle:`,
      {tex: raw`E_x\approx-\sum_i\frac{k\,\Delta Q_i}{R^2}\cos\theta_i`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the pieces grow ever thinner, $\cos\theta$ stops changing across a piece, and the sum becomes an exact integral over $\theta$:`,
      {tex: raw`E_x=-\int_{-\pi/2}^{\pi/2}\frac{k\lambda_0\cos\theta\,R\,d\theta}{R^2}\cos\theta`},
      raw`One $R$ cancels, and $\cos\theta$ comes twice, once from the density and once from the direction. With $\cos^2\theta=(1+\cos(2\theta))/2$, the $\cos(2\theta)$ adds nothing over the half turn, and the $\tfrac12$ adds up to $\pi/2$:`,
      {tex: raw`E_x=-\frac{\pi k\lambda_0}{2R}=-\frac{\pi kQ}{4R^2}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`For a positive charge the field points away from the middle of the semicircle; for a negative one, toward it. The same charge spread evenly gives $E_x=-2kQ/(\pi R^2)$: the cosine density makes the stronger field, by the factor $\pi^2/8$, because more of its charge sits where a piece’s field points along the axis. Both have magnitude below $k|Q|/R^2$, all of the charge at the middle of the arc.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Continuous Charge Distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
