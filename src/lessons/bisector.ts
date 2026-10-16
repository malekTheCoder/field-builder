import type {Lesson} from './types';
const raw = String.raw;
/* The first lesson, and the pattern for the others. It teaches what the run and the board then show, in their
 * order and under their names -- Cut it up, One piece, What cancels, Add them up, Shrink them -- between a setup
 * and what the answer says, with the board's own symbols: L, Q, λ, y, r, rᵢ, α, P = (r, 0), ΔQ = λ Δy while the
 * pieces are pieces and dy once they have shrunk. A piece MAKES A FIELD at P; P is a point, not a charge, so
 * nothing there is pushed, and every sentence holds for a charge of either sign. No numerals as values: the few
 * in a formula are its structure, and are written inside $…$. Its integral is written with the projection still
 * a factor of its own, as the board's Shrink them writes it, not as the integral the page prints under its
 * heading on paper: the offline copy prints both, and the same display twice reads as a slip. */
export const lesson: Lesson = {
  id: 'bisector',
  lead: raw`Find the field of a uniform rod at a point $P$ beside its middle. The idea that makes it work: each piece of the rod has a mirror piece across the $x$-axis, their parts along the rod cancel, and only $E_x$ is left to add up.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin rod of length $L$ carries a charge $Q$ spread evenly along it: its linear charge density, the charge per unit length, is $\lambda=Q/L$. The rod lies on the $y$-axis with its centre at the origin, and $P=(r,0)$ is on its perpendicular bisector, a distance $r$ out from the middle.`,
      raw`Coulomb’s law gives the field of a point charge, and a rod is not one. But it can be cut into pieces that each nearly are.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the rod into $N$ short pieces. The piece at height $y$, of length $\Delta y$, holds the charge`,
      {tex: raw`\Delta Q=\lambda\,\Delta y`},
      raw`A piece that is short compared with its distance from $P$ is nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives the field one piece makes at $P$. Its distance $r_i$ from $P$ is the hypotenuse of a right triangle with legs $y$ and $r$:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2},\qquad r_i=\sqrt{y^2+r^2}`},
      raw`The field lies along the line from the piece through $P$, at the angle $\alpha$ to the $x$-axis: away from the piece for a positive charge, toward it for a negative one.`,
    ]},
    {heading: 'What cancels', body: [
      raw`Fields add as vectors, so split each one into parts along the axes. The part along $x$ is $\Delta E\cos\alpha$, and the same triangle gives $\cos\alpha=r/\sqrt{y^2+r^2}$.`,
      raw`Now take the piece’s mirror, at $-y$. It is the same distance from $P$ and makes a field of the same size, at the same angle on the other side of the axis. Their parts along the rod are equal and opposite, so they cancel; their parts along $x$ are equal, so they add. Every piece off the axis has such a partner, and a middle piece level with $P$ has no part along the rod at all, so`,
      {tex: raw`E_y=0`},
      raw`and the whole field at $P$ is $E_x$, perpendicular to the rod.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the $x$-parts of all $N$ pieces, from $y=-L/2$ to $y=L/2$, gives the field, nearly: each piece is still only nearly a point.`,
      {tex: raw`E_x\approx\sum_i\frac{k\,\Delta Q_i}{r_i^2}\cos\alpha_i`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the pieces grow ever thinner. Each $\Delta y$ becomes $dy$, the sum becomes an integral over $y$, and the approximation becomes exact, since in the limit each piece is a point charge:`,
      {tex: raw`E_x=\int_{-L/2}^{L/2}\frac{k\lambda\,dy}{y^2+r^2}\cdot\frac{r}{\sqrt{y^2+r^2}}`},
      raw`The projection puts one more power of the distance underneath, so the two together are $(y^2+r^2)^{3/2}$. The substitution $y=r\tan\alpha$ turns the integrand into $k\lambda\cos\alpha\,d\alpha/r$, whose integral is $k\lambda\sin\alpha/r$, that is $k\lambda y/(r\sqrt{y^2+r^2})$. Evaluated at the two ends, with $\lambda L=Q$:`,
      {tex: raw`E_x=\frac{kQ}{r\sqrt{(L/2)^2+r^2}}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`The sign of $E_x$ is the sign of $Q$: the field points away from the rod for a positive charge and toward it for a negative one.`,
      raw`Far from the rod, $r\gg L$, the root is nearly $r$ and $E_x$ approaches $kQ/r^2$: from far away the rod is a point charge. Hold $\lambda$ fixed and let the rod grow without end, and $E_x$ approaches $2k\lambda/r$, the field of an infinite line, which falls off only as $1/r$. A formula that passes both checks has earned some trust.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Example 2.2 (Example 2.1 in the 3rd edition): a line segment of length 2L, above its midpoint'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
