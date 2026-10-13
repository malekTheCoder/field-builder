import type {Lesson} from './types';
const raw = String.raw;
/* The rod seen end-on: P on the rod's own line, past its end at x = L. The board's symbols: L, Q, λ, x, a,
 * rᵢ = L + a − x, P at x = L + a, ΔQ = λ Δx while the pieces are pieces and dx once they have shrunk. Its
 * What cancels is the most symmetric of all, not the least: every arrow already lies along the axis, so there
 * is nothing to project and nothing to cancel, and the lesson says that rather than "no symmetry". */
export const lesson: Lesson = {
  id: 'axial',
  lead: raw`Find the field of a uniform rod at a point $P$ on the rod’s own line, beyond one end. The idea that makes it work: every piece lies on that line, so every arrow already points along it, and the field is a plain sum with nothing to project.`,
  sections: [
    {heading: 'The setup', body: [
      raw`A thin rod of length $L$ carries a charge $Q$ spread evenly along it, so its linear charge density, the charge per unit length, is $\lambda=Q/L$. The rod lies on the $x$-axis from $x=0$ to $x=L$, and $P$ is on the same axis at $x=L+a$, a distance $a$ past the right end.`,
      raw`Coulomb’s law gives the field of a point charge, and a rod is not one. But it can be cut into pieces that each nearly are.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the rod into $N$ short pieces. The piece at $x$, of length $\Delta x$, holds the charge`,
      {tex: raw`\Delta Q=\lambda\,\Delta x`},
      raw`A piece that is short compared with its distance from $P$ is nearly a point charge.`,
    ]},
    {heading: 'One piece', body: [
      raw`Coulomb’s law, with $k=1/(4\pi\varepsilon_0)$, gives the field one piece makes at $P$. The piece and $P$ lie on one line, so its distance $r_i$ is a difference of positions, not a hypotenuse:`,
      {tex: raw`\Delta E=\frac{k\,\Delta Q}{r_i^2},\qquad r_i=L+a-x`},
      raw`The field lies along the axis: away from the piece, toward $+x$, for a positive charge, and back toward it for a negative one.`,
    ]},
    {heading: 'Nothing to cancel', body: [
      raw`On the bisector this was the step where a mirror piece removed a part. Here there is no part to remove. Every piece sits on the axis through $P$, short of it, so every arrow lies along $x$: the part along $x$ is the whole field, there is no angle and no projection factor, and $E_y=0$ with no pairing at all.`,
      raw`Nor does any piece undo another, since every arrow points the same way. The near pieces simply count for more than the far ones.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Adding the arrows of all $N$ pieces, from $x=0$ to $x=L$, gives the field, nearly: each piece is still only nearly a point.`,
      {tex: raw`E_x\approx\sum_i\frac{k\,\Delta Q_i}{r_i^2}`},
    ]},
    {heading: 'Shrink them', body: [
      raw`Make the pieces thinner without end. Each $\Delta x$ becomes $dx$, the sum becomes an integral over $x$, and the approximation becomes exact:`,
      {tex: raw`E_x=\int_0^L\frac{k\lambda\,dx}{(L+a-x)^2}`},
      raw`Put $u=L+a-x$, the piece’s distance from $P$, so $du=-dx$. The integral of $1/u^2$ is $-1/u$, and the two minus signs cancel, leaving $1/(L+a-x)$. At $x=L$ the distance is $a$ and at $x=0$ it is $L+a$, so with $\lambda L=Q$:`,
      {tex: raw`E_x=k\lambda\left(\frac1a-\frac1{L+a}\right)=\frac{kQ}{a(L+a)}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`The sign of $E_x$ is the sign of $Q$: the field points away from the rod for a positive charge and toward it for a negative one.`,
      raw`Far away, $a\gg L$, the product $a(L+a)$, which is $(a+L/2)^2-(L/2)^2$, is nearly $(a+L/2)^2$, and $E_x$ approaches $kQ/(a+L/2)^2$: from far off the rod is a point charge at its centre. Close to the end, $a\ll L$, the term $k\lambda/a$ takes over, and $|E_x|$ grows only as $1/a$, not $1/a^2$: seen from right beside its end, the rod looks like a line that never stops.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1, The Electric Field: continuous charge distributions'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
