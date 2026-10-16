import type {Lesson} from './types';
const raw = String.raw;
/* The arc, in the board's symbols: R, the arc's angle φ (\varphi, as the page sets it), θ measured from the
 * x-axis, its line of symmetry, from −φ/2 to φ/2; P at the centre; Q held fixed as φ changes, so λ = Q/(Rφ);
 * ΔQ = λRΔθ; ΔE_x = −kΔQ cos θ/R². Unlike the ring, the pieces must be short: every bit is R from P, but the
 * field's direction turns along a piece. The integral is the board's, not the page's integralTex. */
export const lesson: Lesson = {
  id: 'arc',
  lead: raw`Find the field at the centre $P$ of a uniform arc. The idea that makes it work: every piece is $R$ from $P$, mirror pieces cancel each other’s parts across the arc’s line of symmetry, and only the parts along it add up.`,
  sections: [
    {heading: 'The setup', body: [
      raw`An arc of radius $R$ spans the angle $\varphi$, set symmetrically about the $x$-axis, and $P$ is its centre. A piece’s angle $\theta$ is measured from the $x$-axis, so the arc runs from $\theta=-\varphi/2$ to $\theta=\varphi/2$. It carries a charge $Q$ spread evenly along it, and $Q$ stays the same as $\varphi$ changes, so its charge per unit length is $\lambda=Q/(R\varphi)$.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the arc into $N$ pieces. A piece $\Delta\theta$ wide is $R\,\Delta\theta$ long, so it holds`,
      {tex: raw`\Delta Q=\lambda R\,\Delta\theta`},
      raw`Every bit of a piece is $R$ from $P$, but the bits’ fields point in different directions, so a piece must be short to be nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$ and the distance $r_i=R$ for every piece, gives the size of the field one piece makes at $P$. It lies along the radius through the piece, carried on through $P$: away from the piece for a positive charge, toward it for a negative one. That radius makes the angle $\theta$ with the $x$-axis. For a positive piece where $\cos\theta>0$, on the $+x$ side of $P$, the field’s part along $x$ points toward $-x$, hence the minus sign:`,
      {tex: raw`\Delta E_x=-\frac{k\,\Delta Q}{R^2}\cos\theta`},
    ]},
    {heading: 'What cancels', body: [
      raw`Take the piece’s mirror, at $-\theta$. It is the same distance from $P$ and holds the same charge, so its field is the same size, at the same angle on the other side of the $x$-axis. Their parts across the axis are equal and opposite and cancel; their parts along it are equal and add. Every piece has such a partner, so $E_y=0$, and the field at $P$ is $E_x$.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the $x$-parts of all $N$ pieces, from one end to the other, gives the field, nearly, since each piece’s $\cos\theta$ is taken at its middle:`,
      {tex: raw`E_x\approx-\sum_i\frac{k\,\Delta Q_i}{R^2}\cos\theta_i`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the pieces grow ever thinner. Then $\cos\theta$ stops changing across a piece, and the sum becomes an exact integral over $\theta$:`,
      {tex: raw`E_x=-\int_{-\varphi/2}^{\varphi/2}\frac{k\lambda R\,d\theta}{R^2}\cos\theta`},
      raw`The integral of $\cos\theta$ is $\sin\theta$, and since $\sin(-\varphi/2)=-\sin(\varphi/2)$ the two ends add:`,
      {tex: raw`E_x=-\frac{2k\lambda}{R}\sin\frac{\varphi}{2}=-\frac{2kQ}{R^2\varphi}\sin\frac{\varphi}{2}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`For a positive charge $E_x$ is negative, the field pointing away from the middle of the arc, toward its gap once it opens past a semicircle; for a negative charge, the reverse. A very short arc, $\varphi\to0$, has $\sin(\varphi/2)$ nearly $\varphi/2$, and $E_x$ approaches $-kQ/R^2$, the field of a point charge $Q$ a distance $R$ away. A semicircle, $\varphi=\pi$, gives $-2k\lambda/R$. Close the arc into a full circle, $\varphi=2\pi$, and $\sin\pi=0$: every piece has a partner straight across, and the field at the centre is zero.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Continuous Charge Distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
