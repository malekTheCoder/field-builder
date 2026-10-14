import type {Lesson} from './types';
const raw = String.raw;
/* The arc's potential, in the board's symbols: R, φ (\varphi), θ from −φ/2 to φ/2 about the x-axis, P at the
 * centre, Q fixed as φ changes, λ = Q/(Rφ), ΔQ = λRΔθ, ΔV = kΔQ/R. Every piece is R from P, so the sum is exact
 * and the answer, kQ/R, does not depend on φ. The page has no Differentiate back here, and the lesson says why: V
 * is known at one point, and a field is how V changes from point to point. */
export const lesson: Lesson = {
  id: 'v-arc',
  lead: raw`Find the potential at the centre $P$ of a uniform arc. The idea that makes it work: every piece is $R$ from $P$ and potential has no direction, so the charge simply adds, however far the arc is bent round.`,
  sections: [
    {heading: 'The setup', body: [
      raw`An arc of radius $R$ spans the angle $\varphi$, set symmetrically about the $x$-axis, and $P$ is its centre. A piece’s angle $\theta$ runs from $-\varphi/2$ to $\varphi/2$. The arc carries a charge $Q$ spread evenly, and $Q$ stays the same as $\varphi$ changes, so $\lambda=Q/(R\varphi)$. $V$ is measured relative to infinity.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`Cut the arc into $N$ pieces. A piece $\Delta\theta$ wide is $R\,\Delta\theta$ long and holds`,
      {tex: raw`\Delta Q=\lambda R\,\Delta\theta`},
      raw`For the field the pieces had to be short, because the field’s direction turns along a piece. A potential has no direction, and every bit of a piece is $R$ from $P$, so here a piece of any size will do.`,
    ]},
    {heading: 'One piece', body: [
      raw`A point charge’s potential is $k$ times its charge over its distance, with $k=1/(4\pi\varepsilon_0)$, and every piece’s distance is $r_i=R$:`,
      {tex: raw`\Delta V=\frac{k\,\Delta Q}{R}`},
      raw`It is a number with the sign of the piece’s charge.`,
    ]},
    {heading: 'Nothing cancels', body: [
      raw`For the field, a piece and its mirror at $-\theta$ cancelled each other’s parts across the axis. A number has no parts, and all of this charge has one sign, so the mirror piece adds exactly as much as its partner.`,
    ]},
    {heading: 'Add them up', body: [
      raw`Stack every piece’s number in a column. Every piece is $R$ away, so $k/R$ comes out of the sum and the charges add to $Q$:`,
      {tex: raw`V=\sum_i\frac{k\,\Delta Q_i}{R}=\frac{k}{R}\sum_i\Delta Q_i=\frac{kQ}{R}`},
      raw`That is exact, however the arc is cut.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`Make the pieces thinner without end and the sum becomes an integral over $\theta$; nothing in it changes with $\theta$, so the height of the column does not move:`,
      {tex: raw`V=\int_{-\varphi/2}^{\varphi/2}\frac{k\lambda R\,d\theta}{R}=k\lambda\varphi=\frac{kQ}{R}`},
    ]},
    {heading: 'What the answer says', body: [
      raw`$V$ has the sign of $Q$, and with $Q$ held fixed $\varphi$ is nowhere in it. (Hold $\lambda$ fixed instead and $V=k\lambda\varphi$ grows with the arc, because the charge does.) Bending the arc moves its charge round the circle but never nearer to $P$ or farther, so a short arc, a semicircle and a closed ring all give $kQ/R$. The field does change with $\varphi$: it is $E_x=-2kQ\sin(\varphi/2)/(R^2\varphi)$, and zero for the closed ring, where $V$ is still $kQ/R$.`,
      raw`Nor can this $V$ be differentiated back into the field: it is known at one point only, and a field is how $V$ changes from point to point.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§7.3, Calculations of Electric Potential', url: 'https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.3, Electric potential'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 2, The electric potential'},
  ],
};
