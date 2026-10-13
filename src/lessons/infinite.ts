import type {Lesson} from './types';
const raw = String.raw;
/* The infinite line, taught as its page builds it: cut at equal angles θ at P, the angle measured from the
 * perpendicular, y = r tan θ, rᵢ = r sec θ, ΔQ = λ r sec²θ Δθ for the point charge that stands in for a piece.
 * θ here, not α: the lesson itself integrates in θ. The centre of it is the board's own claim, that every
 * equal-angle piece makes the same kλΔθ/r at P, which is also the reason the field falls as 1/r. Its integral
 * is written as the board's Shrink them writes it, with the secants still in, not as the page's integralTex. */
export const lesson: Lesson = {
  id: 'infinite',
  lead: raw`Find the field of an infinite uniform line at a point $P$ a distance $r$ from it. Cut the line at equal angles seen from $P$: then every piece makes the same size of field, mirror pieces cancel along the line, and the integral runs over a finite angle.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A straight line of charge, with uniform density $\lambda$, the charge per unit length, runs the whole length of the $y$-axis, and $P=(r,0)$. No real line is endless, but a long one looks endless from close to its middle.`,
      raw`An endless line cannot be cut into pieces of equal length: there would be no last one. Seen from $P$, though, it spans only half a turn, and an angle can be cut.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Let $\theta$ be the angle at $P$ between the perpendicular to the line and the line of sight to a piece. The piece sits at $y=r\tan\theta$, a distance $r\sec\theta$ from $P$. Cut the half turn into $N$ equal angles $\Delta\theta$. Such a piece is about $r\sec^2\theta\,\Delta\theta$ long, the far ones far longer than the near ones, so it holds`,
      {tex: raw`\Delta Q=\lambda r\sec^2\theta\,\Delta\theta`},
      raw`Thin enough in angle, every piece, even the outermost, which never ends, makes nearly the field of a point charge at its middle angle.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives that field, and here the angle pays off. The distance is $r_i=r\sec\theta$, so the $\sec^2\theta$ in the charge cancels the one in $r_i^2$:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2}=\frac{k\lambda\,\Delta\theta}{r}`},
      raw`Every piece makes the same size of field at $P$: a far piece holds more charge, and is farther away by exactly enough. The field lies along the line of sight, away from the piece for a positive charge and toward it for a negative one.`,
    ]},
    {heading: 'What cancels', body: [
      raw`Its part along $x$ is $\Delta E\cos\theta$. The mirror piece, at $-\theta$, makes the same part along $x$ and the opposite part along the line, so the parts along the line cancel in pairs:`,
      {tex: raw`E_y=0`},
      raw`and the field at $P$ is perpendicular to the line.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the $x$-parts of all $N$ pieces, from $\theta=-\pi/2$ to $\theta=\pi/2$, gives the field, nearly:`,
      {tex: raw`E_x\approx\sum_i\frac{k\,\Delta Q_i}{r_i^2}\cos\theta_i`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $\Delta\theta$ becomes $d\theta$ the sum becomes an integral over the angle, finite although the line is not, and exact:`,
      {tex: raw`E_x=\int_{-\pi/2}^{\pi/2}\frac{k\lambda r\sec^2\theta\,d\theta}{r^2\sec^2\theta}\cos\theta`},
      raw`The secants cancel, the integral of $\cos\theta$ is $\sin\theta$, and from $-\pi/2$ to $\pi/2$ that rises by two:`,
      {tex: raw`E_x=\frac{2k\lambda}{r}=\frac{\lambda}{2\pi\varepsilon_0r}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`The sign of $E_x$ is the sign of $\lambda$: the field points away from the line for a positive charge and toward it for a negative one.`,
      raw`It falls only as $1/r$, not as a point charge’s $1/r^2$, and the cut shows why. From any distance the line fills the same half turn, and the stretch of it inside a fixed angle grows in proportion to $r$: its charge grows as $r$ while the inverse square shrinks its field as $r^2$. So doubling $r$ only halves the field.`,
      raw`And it is what a long rod gives near its middle: the bisector’s $kQ/\bigl(r\sqrt{(L/2)^2+r^2}\bigr)$, with $Q=\lambda L$, tends to $2k\lambda/r$ as $L$ grows far past $r$.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1, The Electric Field: continuous charge distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: charges and fields'},
  ],
};
