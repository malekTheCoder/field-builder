import type {Lesson} from './types';
const raw = String.raw;
/* The ramp: the rod level with one end, its density rising from zero at the foot, λ(y) = λ₀ (y/L), written
 * with a slash as the board writes it. P = (r, 0) at the empty end; Q = λ₀L/2. The one new idea is the
 * density inside the integral, so it is taught in Cut it up and followed through: it makes E_x the easy
 * integral and E_y the hard one (y² on top). Its limits are the page's: far E_x is kQ/r² with Q = λ₀L/2, and
 * far E_y remembers the centre of charge, 2L/3. */
export const lesson: Lesson = {
  id: 'ramp',
  lead: raw`Find the field level with the empty end of a rod whose density grows in magnitude along it. The density rides inside the integral as $\lambda(y)$, and nothing cancels.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin rod lies along the $y$-axis, from $y=0$ up to $y=L$, but its charge is not spread evenly. Its density, the charge per unit length, is $\lambda(y)=\lambda_0\,(y/L)$: zero at the foot, changing steadily to $\lambda_0$ at the top. Its magnitude grows toward the top for either sign of charge. The point $P=(r,0)$ is a distance $r$ out, level with the empty end.`,
      raw`The total charge is the average density, half of $\lambda_0$, times the length: $Q=\lambda_0L/2$.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the rod into $N$ short pieces. The piece at height $y$, of length $\Delta y$, holds the density where it sits times its length:`,
      {tex: raw`\Delta Q=\lambda(y)\,\Delta y=\lambda_0\,(y/L)\,\Delta y`},
      raw`A uniform rod’s pieces all held the same charge. Here a piece near the top holds more charge in magnitude than one near the foot, so $y$ now appears twice in what follows: once in the charge, and once in the geometry.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives each piece’s field at $P$:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2},\qquad r_i=\sqrt{y^2+r^2}`},
      raw`Here $r_i$ is the hypotenuse of the triangle with legs $y$ and $r$, and the field lies along the line from the piece through $P$, at the angle $\alpha$ to the $x$-axis: away from the piece for a positive charge, toward it for a negative one.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`Every piece lies above the $x$-axis, so, as for the uniform rod level with its end, no piece has a mirror partner. Both parts survive: $\Delta E\cos\alpha$ along $x$, and $-\Delta E\sin\alpha$ along the rod, down for a positive charge.`,
      raw`Moving $P$ up to the middle would not rescue the symmetry either: a piece above the middle carries more charge in magnitude than its mirror below, so their parts along the rod are not equal.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding all $N$ pieces from $y=0$ to $y=L$ gives each component, nearly, each piece’s charge now set by where it is:`,
      {tex: raw`E_x\approx\sum_i\frac{k\,\Delta Q_i}{r_i^2}\cos\alpha_i`},
      raw`and $E_y$ is the same sum with $-\sin\alpha_i$.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`As the pieces shrink, $\Delta y$ becomes $dy$ and the sums become exact integrals. With $\cos\alpha=r/\sqrt{y^2+r^2}$:`,
      {tex: raw`E_x=\int_0^L\frac{k\lambda_0\,(y/L)\,dy}{y^2+r^2}\cdot\frac{r}{\sqrt{y^2+r^2}}`},
      {tex: raw`E_y=-\frac{k\lambda_0}{L}\int_0^L\frac{y^2\,dy}{(y^2+r^2)^{3/2}}`},
      raw`In $E_x$, the density’s $y$ makes the integral easy: $u=y^2+r^2$ integrates it at once. In $E_y$ the density’s $y$ meets the sine’s, putting $y^2$ on top, and $y=r\tan\alpha$ turns it into $(\sec\alpha-\cos\alpha)\,d\alpha$, whose integral brings in a logarithm:`,
      {tex: raw`E_x=\frac{k\lambda_0}{L}\left(1-\frac{r}{\sqrt{L^2+r^2}}\right)`},
      {tex: raw`\begin{aligned}E_y&=-\frac{k\lambda_0}{L}\bigg[\ln\frac{L+\sqrt{L^2+r^2}}{r}\\&\phantom{{}=-\frac{k\lambda_0}{L}\bigg[}-\frac{L}{\sqrt{L^2+r^2}}\bigg]\end{aligned}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`Far away, $r\gg L$, $E_x$ approaches $kQ/r^2$ with $Q=\lambda_0L/2$: only the total charge matters, and $\lambda_0L$ in its place would make it twice too big. Along the rod, $E_y$ decays faster in magnitude, behaving as $-kQ\bar y/r^3$, where $\bar y=2L/3$ is the centre of charge; a uniform rod’s is $L/2$. The part along the rod remembers where the charge sits, not just how much there is.`,
      raw`At every distance $E_x$ is weaker than a uniform rod’s with the same $Q$, because the ramp keeps its charge farther from $P$.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Continuous Charge Distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
