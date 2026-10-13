import type {Lesson} from './types';
const raw = String.raw;
/* The potential beyond the end of a rod: the axial rod from x = 0 to L, P at x = L + a, rᵢ = L + a − x, the
 * board's symbols. Each piece adds a number, all of one sign; the integral of 1/u is a logarithm, the answer
 * kλ ln((L + a)/a). It ends as its page does, by differentiating back: E_x = −dV/da recovers the axial field. */
export const lesson: Lesson = {
  id: 'v-rod-axial',
  lead: raw`Find the potential of a uniform rod at a point $P$ on the rod’s own line, beyond one end. Each piece adds the number $k\,\Delta Q/r_i$, all with one sign, so the potential is one plain integral, and its answer is a logarithm.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin rod of length $L$ carries a charge $Q$ spread evenly along it, so $\lambda=Q/L$. It runs along the $x$-axis from $x=0$ to $x=L$, and $P$ is at $x=L+a$, a distance $a$ past the right end. The potential at $P$ is measured from zero infinitely far away.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the rod into $N$ short pieces. The piece at $x$, of length $\Delta x$, holds the charge`,
      {tex: raw`\Delta Q=\lambda\,\Delta x`},
      raw`and, short compared with its distance from $P$, is nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`A point charge’s potential is $k$ times its charge over its distance, with $k=1/(4\pi\varepsilon_0)$. The piece and $P$ share a line, so the distance is a difference of positions:`,
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{r_i},\qquad r_i=L+a-x`},
      raw`So $\Delta V$ is a number with the sign of the piece’s charge, and there is no direction to keep track of.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`A number has no direction, and all of this charge has one sign, so no piece can undo another. Every piece adds to $V$ with the sign of $\lambda$, the near ones more than the far ones, and the page stacks them into a column that only grows one way.`,
    ]},
    {heading: 'Add them up', body: [
      raw`The column’s height, over the pieces from $x=0$ to $x=L$, is the potential, nearly:`,
      {tex: raw`V\approx\sum_i\frac{k\,\Delta Q_i}{r_i}`},
      raw`That is the whole method for a potential: no projection, no partner, one sum.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`As the pieces shrink the sum becomes an exact integral:`,
      {tex: raw`V=\int_0^L\frac{k\lambda\,dx}{L+a-x}`},
      raw`Put $u=L+a-x$, the piece’s distance from $P$. As $x$ runs from $0$ to $L$, $u$ runs from $L+a$ down to $a$, and the minus in $du=-dx$ turns the ends round. The integral of $1/u$ is a logarithm:`,
      {tex: raw`V=k\lambda\int_a^{L+a}\frac{du}{u}=k\lambda\ln\frac{L+a}{a}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`The logarithm’s argument is a ratio of lengths greater than one, so $V$ has the sign of $\lambda$. Far away, $a\gg L$, $\ln(1+L/a)$ is nearly $L/a-L^2/(2a^2)$, and $V$ approaches $kQ/(a+L/2)$, the potential of a point charge at the rod’s centre. As $P$ walks onto the end, $a\to0$, $|V|$ grows without bound, but only as $\ln(L/a)$, far more slowly than the field’s $1/a$.`,
    ]},
    {heading: 'Differentiate back', body: [
      raw`On the rod’s line every piece’s arrow points along it, so the field does, and it is minus the rate at which $V$ changes as $P$ moves out. The logarithm of a quotient differentiates to $1/(L+a)-1/a$, so`,
      {tex: raw`E_x=-\frac{dV}{da}=k\lambda\left(\frac1a-\frac1{L+a}\right)`},
      raw`which is the field beyond the end of this rod, found without a single arrow.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§7.3, Calculations of Electric Potential; and §7.4, Determining Field from Potential', url: 'https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.3, Electric Potential'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 2, The electric potential'},
  ],
};
