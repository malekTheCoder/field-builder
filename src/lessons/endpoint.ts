import type {Lesson} from './types';
const raw = String.raw;
/* The rod level with one end: the bisector's rod, standing from y = 0 to y = L, with P = (r, 0) at its foot.
 * The board's symbols: L, Q, λ, y, r, rᵢ = √(y² + r²), α at P from the x-axis, ΔQ = λ Δy, then dy. Nothing
 * cancels, so it teaches both components, the minus in E_y (for positive charge the part along the rod points
 * down, away from the piece), and both integrals. Its E_x is half a centred rod of length 2L's: said, since it
 * is the cleanest way to see what the missing lower half would have cancelled. */
export const lesson: Lesson = {
  id: 'endpoint',
  lead: raw`Find the field of a uniform rod at a point $P$ level with one end. No piece has a mirror partner, so neither component cancels: the field leans, and $E_x$ and $E_y$ each need an integral of their own.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin rod of length $L$ carries a charge $Q$ spread evenly along it, so its linear charge density is $\lambda=Q/L$. It stands on the $x$-axis at the origin, running from $y=0$ up to $y=L$, and $P=(r,0)$ is a distance $r$ out, level with the rod’s lower end.`,
      raw`It is the bisector’s rod with $P$ moved down to the end, and that one move costs the symmetry.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the rod into $N$ short pieces. The piece at height $y$, of length $\Delta y$, holds the charge`,
      {tex: raw`\Delta Q=\lambda\,\Delta y`},
      raw`A piece that is short compared with its distance from $P$ is nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives the field one piece makes at $P$. Its distance $r_i$ is the hypotenuse of a right triangle with legs $y$ and $r$:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2},\qquad r_i=\sqrt{y^2+r^2}`},
      raw`The field lies along the line from the piece through $P$, at the angle $\alpha$ to the $x$-axis: away from the piece for a positive charge, toward it for a negative one.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`Split each field into parts along the axes. The same triangle gives $\cos\alpha=r/\sqrt{y^2+r^2}$ and $\sin\alpha=y/\sqrt{y^2+r^2}$:`,
      {tex: raw`\Delta E_x=\Delta E\cos\alpha,\qquad\Delta E_y=-\Delta E\sin\alpha`},
      raw`For a positive charge the part along the rod points down, away from the piece: hence the minus. On the bisector a mirror piece below the axis undid that part. Here every piece lies above the $x$-axis, so no piece has a partner, and both parts of every piece survive.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the $x$-parts of all $N$ pieces, from $y=0$ to $y=L$, gives $E_x$, nearly; $E_y$ is the sum of the $\Delta E_y$ in the same way.`,
      {tex: raw`E_x\approx\sum_i\frac{k\,\Delta Q_i}{r_i^2}\cos\alpha_i`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the pieces grow ever thinner: each $\Delta y$ becomes $dy$, each sum an integral over $y$, and the approximation becomes exact.`,
      {tex: raw`E_x=\int_0^L\frac{k\lambda\,dy}{y^2+r^2}\cdot\frac{r}{\sqrt{y^2+r^2}}`},
      raw`This is the bisector’s integral between new limits: $y=r\tan\alpha$ gives the antiderivative $y/(r\sqrt{y^2+r^2})$, which is zero at the foot. The sine’s integral is easier still: with $u=y^2+r^2$, $y\,dy/(y^2+r^2)^{3/2}$ integrates to $-1/\sqrt{y^2+r^2}$. With $\lambda L=Q$:`,
      {tex: raw`E_x=\frac{kQ}{r\sqrt{L^2+r^2}}`},
      {tex: raw`E_y=-k\lambda\left(\frac1r-\frac1{\sqrt{L^2+r^2}}\right)`},
    ]},
    {heading: 'What the answer says', body: [
      raw`The bracket in $E_y$ is positive, since the near end is closer than the far one. So for a positive charge the field points away from the rod and down, below the $x$-axis; for a negative one, the reverse.`,
      raw`This rod is the top half of a centred rod of length $2L$, and its $E_x$ is exactly half of that rod’s. The $E_y$ the lower half would have cancelled is what survives here.`,
      raw`Far away, $r\gg L$, $|\mathbf E|$ approaches $k|Q|/r^2$, a point charge. Hold $\lambda$ fixed and let the rod grow without end, and $E_x$ tends to $k\lambda/r$ and $E_y$ to $-k\lambda/r$: equal in size, so the field settles at $\pi/4$ to the axis. That is the semi-infinite line, another lesson.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Continuous Charge Distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
