import type {Lesson} from './types';
const raw = String.raw;
/* The semi-infinite line up the y-axis from its end, P = (r, 0) level with the end, as the rod level with an
 * end stands. Cut at equal angles α at P, measured from the perpendicular P drops to the end, y = r tan α,
 * ΔQ = λ r sec²α Δα, as the board cuts it; then integrated in y, as the board's Shrink them writes it, with
 * the angle as the reason the two components are equal: each piece is worth kλ dα/r, and over a quarter
 * turn ∫cos α = ∫sin α. Signs as the page's: for positive λ, E_x = +kλ/r (out from the line) and
 * E_y = −kλ/r (back past the end), so the field leans at π/4. */
export const lesson: Lesson = {
  id: 'semi',
  lead: raw`Nothing beyond the end cancels the part along the line, so the field leans, at exactly $\pi/4$.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A line of charge with uniform density $\lambda$, the charge per unit length, runs up the $y$-axis from its end at $y=0$ to $+\infty$. The point $P=(r,0)$ is level with the end, a distance $r$ from it.`,
      raw`It is the rod level with its end, grown without end.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`An endless line has no last piece of equal length, but seen from $P$ it spans only a quarter turn. Let $\alpha$ be the angle at $P$ between the perpendicular, across to the end, and the line of sight to a piece: the piece sits at $y=r\tan\alpha$, a distance $r\sec\alpha$ from $P$. Cut the quarter turn into $N$ equal angles $\Delta\alpha$. Such a piece is about $r\sec^2\alpha\,\Delta\alpha$ long, so it holds`,
      {tex: raw`\Delta Q=\lambda r\sec^2\alpha\,\Delta\alpha`},
      raw`Thin enough in angle, every piece, even the outermost, makes nearly a point charge’s field at $P$.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives that field. With $r_i^2=y^2+r^2=r^2\sec^2\alpha$, the secants cancel, as on the infinite line:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2}=\frac{k\lambda\,\Delta\alpha}{r}`},
      raw`Every piece makes the same size of field at $P$, along the line of sight: away from the piece for a positive charge, toward it for a negative one.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`Its part across the line, along $x$, is $\Delta E\cos\alpha$, and its part along the line is $\Delta E\sin\alpha$, which for a positive charge points back past the end, toward $-y$:`,
      {tex: raw`\Delta E_x=\Delta E\cos\alpha,\qquad\Delta E_y=-\Delta E\sin\alpha`},
      raw`On the infinite line a mirror piece at $-\alpha$ undid the part along the line. Here the line starts level with $P$ and runs only upward: no piece has a mirror, and both parts of every piece survive.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding all $N$ pieces, from the end out to $\infty$, gives $E_x$, nearly, and $E_y$ is the same sum with $-\sin\alpha_i$ in place of $\cos\alpha_i$:`,
      {tex: raw`E_x\approx\sum_i\frac{k\,\Delta Q_i}{r_i^2}\cos\alpha_i`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the pieces shrink and the sums become exact integrals. Written in $y$, as the page writes them, $r\sec^2\alpha\,\Delta\alpha$ becomes the length $dy$ and $\cos\alpha=r/\sqrt{y^2+r^2}$:`,
      {tex: raw`E_x=\int_0^\infty\frac{k\lambda\,dy}{y^2+r^2}\cdot\frac{r}{\sqrt{y^2+r^2}}`},
      raw`and $y=r\tan\alpha$ makes it $k\lambda/r$. In the angle, where each piece is worth $k\lambda\,d\alpha/r$, the two components are one picture:`,
      {tex: raw`\begin{aligned}E_x&=\frac{k\lambda}{r}\int_0^{\pi/2}\cos\alpha\,d\alpha=\frac{k\lambda}{r}\\E_y&=-\frac{k\lambda}{r}\int_0^{\pi/2}\sin\alpha\,d\alpha=-\frac{k\lambda}{r}\end{aligned}`},
      raw`Over a quarter turn the cosine takes the sine’s values in reverse order, so the two integrals are equal.`,
    ]},
    {heading: 'What the answer says', body: [
      raw`The two parts are equal in size, so $|\mathbf E|=\sqrt2\,k|\lambda|/r$ and the field leans at $\pi/4$: halfway between $+x$ and $-y$ for a positive charge, the opposite way for a negative one. Both parts fall as $1/r$, so moving $P$ away weakens the field but never turns it.`,
      raw`The lean is the missing half. Add the mirror line, from the end down to $-\infty$, and its part along $y$ cancels this one’s while its part across adds, giving $2k\lambda/r$ straight out: the infinite line.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1, The Electric Field: continuous charge distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
