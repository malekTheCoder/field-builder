import type {Lesson} from './types';
const raw = String.raw;
/* The sheet, in the board's symbols: σ, the xy-plane, P at height z, rings of radius s cut at equal angles α at
 * P, s = z tan α, rᵢ = z sec α, ΔQ = σ(2πs)(z sec²α Δα). Its story is the reverse of the lines': cut at equal
 * angles, each farther ring makes a BIGGER field at P (2πkσ sin α Δα), weaker per unit charge but far bigger, so
 * nothing here says the far parts matter less. Why the answer has no z in it is said physically: raise P and
 * every equal-angle ring scales with it, four times the charge at twice the distance. */
export const lesson: Lesson = {
  id: 'sheet',
  lead: raw`Find the field of an infinite charged sheet at a point $P$ above it. The idea that makes it work: cut it into rings of equal angle at $P$; the far rings, weaker for their charge but much bigger, make the larger fields.`,
  sections: [
    {heading: 'The setup', body: [
      raw`An infinite sheet in the $xy$-plane carries a surface charge density $\sigma$, the charge per unit area, the same everywhere. $P$ is on the $z$-axis at a height $z$ above it.`,
    ]},
    {heading: 'Cut it up', body: [
      raw`A disk is cut into rings of equal width, but the sheet never ends, so there is no last ring. Seen from $P$, though, the sheet spans only a right angle out from the axis. So cut it into $N$ rings that each take the same small angle $\Delta\alpha$ at $P$, where $\alpha$ is the angle between the axis and the line to a ring. A ring at angle $\alpha$ has radius $s=z\tan\alpha$, is $r_i=z\sec\alpha$ from $P$, and is nearly $z\sec^2\alpha\,\Delta\alpha$ wide, so the thin ring standing in for it holds`,
      {tex: raw`\Delta Q=\sigma\,(2\pi s)(z\sec^2\alpha\,\Delta\alpha)`},
    ]},
    {heading: 'One ring', body: [
      raw`Each ring makes nearly the field of a thin ring of that charge at its middle angle, and the ring lesson has that field. With $k=1/(4\pi\varepsilon_0)$ and $\cos\alpha=z/r_i$, put in $s$, $r_i$ and $\Delta Q$ and almost everything cancels:`,
      {tex: raw`\Delta E_z=\frac{k\,\Delta Q}{r_i^2}\cos\alpha=2\pi k\sigma\sin\alpha\,\Delta\alpha`},
      raw`Its magnitude $|\Delta E_z|$ grows with $\alpha$. A farther ring is weaker for each unit of its charge, since it is farther away and its field meets the axis more slantwise, but it holds so much more charge that its field at $P$ is bigger than the nearer ring’s. Here the far parts of the charge matter most.`,
    ]},
    {heading: 'What cancels', body: [
      raw`Within each ring the sideways parts cancel, a bit against the bit straight across. Every ring’s field at $P$ points along the axis, all the same way: away from the sheet for positive $\sigma$, toward it for negative.`,
    ]},
    {heading: 'Add them up', body: [
      raw`So the rings add like numbers, from the axis, $\alpha=0$, out toward a right angle:`,
      {tex: raw`E_z\approx\sum_i 2\pi k\sigma\sin\alpha_i\,\Delta\alpha`},
      raw`Each term has magnitude at most $2\pi k|\sigma|\,\Delta\alpha$. Since $N\Delta\alpha=\pi/2$, the sum’s magnitude is at most $\pi^2 k|\sigma|$, a finite bound that stays fixed as the rings get thinner.`,
    ]},
    {heading: 'Shrink them', body: [
      raw`As $N\to\infty$ the rings grow ever thinner in angle, and treating each as a thin ring becomes exact. The integral of $\sin\alpha$ is $-\cos\alpha$, which rises by exactly one from $\alpha=0$ to $\alpha=\pi/2$:`,
      {tex: raw`E_z=2\pi k\sigma\int_0^{\pi/2}\sin\alpha\,d\alpha=2\pi k\sigma=\frac{\sigma}{2\varepsilon_0}`},
      raw`The board below writes the same integral first in $s$, from $0$ to $\infty$, the width $z\sec^2\alpha\,\Delta\alpha$ becoming $ds$; putting $s=z\tan\alpha$ back in turns it into this one.`,
    ]},
    {heading: 'What the answer says', body: [
      raw`There is no $z$ in it: the field is the same at every height above the sheet. Raise $P$ to twice the height and every equal-angle ring is the same ring with its size doubled, holding four times the charge at twice the distance, so its field at $P$ is exactly what it was. The sheet has no edge and no size to measure the height against, so nothing in it can make the field change with height.`,
      raw`A disk of radius $R$ reaches only the angles up to $\alpha_R$, where $\cos\alpha_R=z/\sqrt{R^2+z^2}$, and the same integral stopped there gives $2\pi k\sigma(1-\cos\alpha_R)$, the disk lesson’s answer. What a disk lacks is the rings near a right angle, the very ones that count the most for each angle they span.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§5.5, Calculating Electric Fields of Charge Distributions: an infinite plane', url: 'https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.1, continuous distributions; §2.2, the infinite plane by Gauss’s law'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics'},
  ],
};
