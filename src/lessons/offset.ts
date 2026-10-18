import type {Lesson} from './types';
const raw = String.raw;
/* The rod with P off its bisector: the bisector's rod with P slid along it, so P is level with neither its middle nor
 * an end. The board's symbols: L, Q, λ, y₁, y₂, h, r, rᵢ = √(y² + r²), α at P from the x-axis signed like y, ΔQ = λΔy,
 * then dy. What it teaches that its two neighbours cannot: a symmetry can hold for part of a charge. The stretch that
 * mirrors itself across P's level cancels its own parts along the rod; the leftover does not, and all of E_y is the
 * leftover's. Both answers are written in the angles at P to the two ends, the textbook's form. */
export const lesson: Lesson = {
  id: 'offset',
  lead: raw`Find the field of a uniform rod at a point $P$ beside it, level with neither its middle nor an end. Only the stretch that mirrors itself across $P$’s level cancels along the rod; the rest leans the field, and we add the $x$ and $y$ components separately.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin rod of length $L$ carries a charge $Q$ spread evenly, so $\lambda=Q/L$. It lies on the $y$-axis from $y=y_1$ up to $y=y_2$, and $P=(r,0)$ is a distance $r$ out from it. The origin is level with $P$, so a piece’s $y$ is its height above $P$’s level, negative below it.`,
      raw`$P$ stands a height $h$ above the rod’s middle: $y_1=-h-L/2$ and $y_2=L/2-h$. At $h=0$ this is the bisector’s rod; at $h=-L/2$ it is the rod level with its lower end.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the rod into $N$ short pieces. The piece at height $y$, of length $\Delta y$, holds`,
      {tex: raw`\Delta Q=\lambda\,\Delta y`},
      raw`A piece short compared with its distance from $P$ is nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives one piece’s field at $P$, its distance the hypotenuse of a triangle with legs $y$ and $r$:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2},\qquad r_i=\sqrt{y^2+r^2}`},
      raw`Away from the piece for a positive charge and toward it for a negative one, along the line through $P$ at $\alpha$ to the $x$-axis, signed like $y$: negative below $P$’s level.`,
    ]},
    {heading: 'What cancels', body: [
      raw`Split each field into parts, with $\cos\alpha=r/\sqrt{y^2+r^2}$ and $\sin\alpha=y/\sqrt{y^2+r^2}$:`,
      {tex: raw`\Delta E_x=\Delta E\cos\alpha,\qquad\Delta E_y=-\Delta E\sin\alpha`},
      raw`Fold the rod across $P$’s level. Call $m$ the nearer end’s distance from it, the smaller of $|y_1|$ and $|y_2|$. The stretch from $y=-m$ to $y=m$ lands on itself: each of its pieces has a mirror piece as far from $P$, with the same charge, so their parts along the rod cancel and their parts along $x$ add.`,
      raw`The leftover, on the side the rod reaches farther, has no mirrors. Its parts along the rod all point one way and survive: they are the whole of $E_y$.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Add all $\Delta E_x$ to approximate $E_x$, and all $\Delta E_y$ for $E_y$. The figure adds mirror pairs along $x$, then any leftover pieces whole, tilting the sum. At $h=0$ every piece pairs, so the sum stays along $x$.`,
      {tex: raw`E_x\approx\sum_i\frac{k\,\Delta Q_i}{r_i^2}\cos\alpha_i`},
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ each $\Delta y$ becomes $dy$, each sum an integral from $y_1$ to $y_2$, and the approximation becomes exact.`,
      {tex: raw`E_x=\int_{y_1}^{y_2}\frac{k\lambda\,dy}{y^2+r^2}\cdot\frac{r}{\sqrt{y^2+r^2}}`},
      {tex: raw`E_y=-\int_{y_1}^{y_2}\frac{k\lambda\,dy}{y^2+r^2}\cdot\frac{y}{\sqrt{y^2+r^2}}`},
      raw`These are the bisector’s integrals between new limits: $y=r\tan\alpha$ for the first, $u=y^2+r^2$ for the part along the rod. Upper end minus lower end, with $\alpha_1$ and $\alpha_2$ the angles at $P$ to the two ends:`,
      {tex: raw`E_x=\frac{k\lambda}{r}\left(\sin\alpha_2-\sin\alpha_1\right)`},
      {tex: raw`E_y=\frac{k\lambda}{r}\left(\cos\alpha_2-\cos\alpha_1\right)`},
      raw`Here $\sin\alpha_i=y_i/\sqrt{y_i^2+r^2}$ and $\cos\alpha_i=r/\sqrt{y_i^2+r^2}$; since $y_1\le0\le y_2$, the two ends add in $E_x$.`,
    ]},
    {heading: 'What the answer says', body: [
      raw`The end nearer $P$’s level has the larger cosine, so for a positive charge $E_y$ points away from the rod’s longer reach: with $P$ above the middle, $E_y>0$. A negative charge turns both components round.`,
      raw`From $y=-m$ to $y=m$ the integrand $y/(y^2+r^2)^{3/2}$ is odd, so the mirrored stretch adds nothing to $E_y$: all of it is the leftover’s.`,
      raw`At $h=0$ the cosines are equal and $E_y=0$: the bisector. At $y_1=0$ it is the rod level with its end. Far away $|\mathbf E|$ approaches $k|Q|/d^2$, $d=\sqrt{r^2+h^2}$ from the middle. Grown at fixed $\lambda$ and $h$, both ends run off and the field is the endless line’s $2k\lambda/r$, along $x$.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1.4, Continuous Charge Distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
