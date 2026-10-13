import type {Lesson} from './types';
const raw = String.raw;
/* The potential on the bisector: the bisector's rod and P = (r, 0), the board's symbols, ΔV = k ΔQ / rᵢ. A
 * potential is a number: no projection, and nothing cancels, since all the charge has one sign; the mirror
 * piece doubles the sum instead of cancelling it, which is the contrast with the field worth teaching, and
 * which the integral then uses (twice the upper half). It ends as its page does, by differentiating back:
 * E_x = −dV/dr recovers the bisector's field. */
export const lesson: Lesson = {
  id: 'v-rod-bisector',
  lead: raw`Find the potential of a uniform rod at a point $P$ beside its middle. A potential is a number, not an arrow: each piece adds $k\,\Delta Q/r_i$, nothing is projected, and the mirror pieces double the sum instead of cancelling.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin rod of length $L$ carries a charge $Q$ spread evenly along it, so $\lambda=Q/L$. It lies on the $y$-axis, centred at the origin, and $P=(r,0)$ is a distance $r$ out from its middle. The potential at $P$ is measured from zero infinitely far away.`,
      raw`The field of this rod needed components and a cancellation. The potential needs neither, which often makes it the easier road to the same physics.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the rod into $N$ short pieces. The piece at height $y$, of length $\Delta y$, holds the charge`,
      {tex: raw`\Delta Q=\lambda\,\Delta y`},
      raw`and, short compared with its distance from $P$, is nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`A point charge’s potential is $k$ times its charge over its distance, with $k=1/(4\pi\varepsilon_0)$: one power of the distance, not two, and no direction at all. Its distance $r_i$ is the hypotenuse of the triangle with legs $y$ and $r$:`,
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{r_i},\qquad r_i=\sqrt{y^2+r^2}`},
      raw`So $\Delta V$ is a number, with the sign of the piece’s charge.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`Take the piece’s mirror, at $-y$. For the field, their parts along the rod cancelled. A number has no parts: the mirror is just as far away and its charge has the same sign, so it adds exactly the same $\Delta V$. The page stacks the pieces’ contributions into a column, which can only grow one way.`,
    ]},
    {heading: 'Add them up', body: [
      raw`The column’s height, over the pieces from $y=-L/2$ to $y=L/2$, is the potential, nearly:`,
      {tex: raw`V\approx\sum_i\frac{k\,\Delta Q_i}{r_i}`},
      raw`No angle and no components: one sum of numbers, which is what makes a potential easier to add up than a field.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`As the pieces shrink the sum becomes an exact integral, and since mirror pieces add equally it is twice the upper half:`,
      {tex: raw`\begin{aligned}V&=\int_{-L/2}^{L/2}\frac{k\lambda\,dy}{\sqrt{y^2+r^2}}\\[0.6em]&=2k\lambda\int_0^{L/2}\frac{dy}{\sqrt{y^2+r^2}}\end{aligned}`},
      raw`The substitution $y=r\tan\alpha$ turns the integrand into $\sec\alpha\,d\alpha$, whose integral is $\ln(\sec\alpha+\tan\alpha)$, that is $\ln\bigl((y+\sqrt{y^2+r^2})/r\bigr)$, which is zero at $y=0$:`,
      {tex: raw`V=2k\lambda\ln\frac{L/2+\sqrt{(L/2)^2+r^2}}{r}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`The logarithm’s argument is a ratio of lengths greater than one, so $V$ has the sign of $Q$. Far away, $r\gg L$, $V$ tends to $kQ/r$, a point charge’s potential, one power of distance softer than the field. Let the rod grow with $\lambda$ fixed and $V$ grows like $2k\lambda\ln(L/r)$, without bound: an infinite line has no potential measured from infinity, only differences between two distances.`,
    ]},
    {heading: 'Differentiate back', body: [
      raw`On the bisector the field has only its $x$ part, and that part is minus the rate at which $V$ changes as $P$ moves out:`,
      {tex: raw`E_x=-\frac{dV}{dr}=\frac{kQ}{r\sqrt{(L/2)^2+r^2}}`},
      raw`That is the bisector’s field, found without a single arrow. Knowing $V$ only along this line gives only this component; the part along the rod would need $V$ off the line too.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§7.3, Calculations of Electric Potential; and §7.4, Determining Field from Potential', url: 'https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.3, Electric Potential'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 2, The electric potential'},
  ],
};
