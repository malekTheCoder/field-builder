import type {GaussLesson} from '../types';
const raw = String.raw;
/* Q_ENC FROM A DENSITY. The left side of Gauss's law is nearly free once the surface is right; the right side is
 * where the work is. The study guide's order: the three densities and their small pieces, the ratio method for a
 * uniform charge, thin shells for a density that varies (spherical 4πr′²dr′, cylindrical 2πr′L dr′, slab A dz′),
 * normalising ρ₀ when the problem gives Q, and the integral mistakes graders see most.
 *
 * The three cases each let the surface pass through the charge and out of it, so each right side is written for
 * both regions: a uniform ball by the ratio of volumes, a ball whose density falls to zero at its surface by thin
 * shells after fixing ρ₀ from Q, and a slab whose density falls from its middle plane, by slices doubled for the
 * half below. The instrument builds Q_enc shell by shell for three densities, and shows the ρ dr′ mistake for what it
 * is. Every sentence holds for either sign. */
export const lesson: GaussLesson = {
  id: 'qenc',
  title: 'Q_enc from a density',
  short: 'Q_enc from a density',
  about: 'The ratio method for uniform charge, thin shells for charge that varies.',
  lead: raw`The left side of Gauss’s law is nearly free once the surface is right. The right side, $Q_{\text{enc}}$, is where the work is: add up the charge in the part of the object inside the surface, by a ratio when the density is uniform and by thin shells when it varies.`,
  sections: [
    {heading: 'Only the part inside', body: [
      raw`Charge comes spread along a line, over a surface or through a volume, with a density $\lambda$, $\sigma$ or $\rho$, and a small piece of it holds $dq=\lambda\,d\ell$, $\sigma\,dA$ or $\rho\,dV$. The charge enclosed is the sum of those pieces over the part of the object inside the Gaussian surface, and nothing beyond it:`,
      {tex: raw`Q_{\text{enc}}=\int_{\text{inside}}\rho\,dV`},
      raw`Once the surface is outside the object, that is the whole charge, and it stops changing as the surface grows. Inside the object, it is a part of the charge that depends on where the surface is.`,
    ]},
    {heading: 'Uniform: the ratio method', body: [
      raw`With a uniform density, the charge enclosed is the object’s charge times the fraction of it inside the surface. For a ball of radius $R$ and charge $Q$, a concentric sphere of radius $r$ inside it encloses the fraction $\frac43\pi r^3/\frac43\pi R^3$:`,
      {tex: raw`Q_{\text{enc}}=Q\,\frac{r^3}{R^3}\quad(r\le R),\qquad Q_{\text{enc}}=\lambda L\,\frac{r^2}{R^2},\qquad Q_{\text{enc}}=\rho A\,(2z)`},
      raw`The second is a long cylinder of radius $R$ with $\lambda$ per unit length, inside a coaxial cylinder of radius $r$ and length $L$; the third a slab inside a pillbox whose faces, of area $A$, are at $z$ and $-z$. Outside, each is the whole: $Q$, $\lambda L$, or $\rho A$ times the slab’s thickness.`,
    ]},
    {heading: 'When the density varies: thin shells', body: [
      raw`If $\rho$ changes with $r$ you cannot multiply it by a volume. But across a thin shell it hardly changes, so take one shell, multiply its volume by the density there, and add the shells from the centre out to the surface. The shell’s volume is its area times its thickness:`,
      {tex: raw`dV=4\pi r'^2\,dr'\ \ \text{(sphere)},\qquad dV=2\pi r'L\,dr'\ \ \text{(cylinder)},\qquad dV=A\,dz'\ \ \text{(slab)}`},
      raw`Each is the derivative of the volume it builds: $\frac{d}{dr}\big(\frac43\pi r^3\big)=4\pi r^2$, and $\frac{d}{dr}(\pi r^2L)=2\pi rL$. For a ball,`,
      {tex: raw`Q_{\text{enc}}(r)=\int_0^{r}\rho(r')\,4\pi r'^2\,dr'`},
      raw`Keep $r$ and $r'$ apart. $r$ is the Gaussian sphere’s radius, where you want the field: it is the upper limit, fixed while you integrate. $r'$ runs over the shells, from the centre to $r$. Writing $\rho(r)\,4\pi r^2\,dr$ with the limit $r$ as well mixes the two up, and the result means nothing.`,
    ]},
    {heading: 'Normalising when you are given Q', body: [
      raw`A problem may say only that $\rho$ is proportional to some shape, and give the total charge. Then write $\rho$ with an unknown constant $\rho_0$, integrate over the whole object, and set the result equal to $Q$. For a ball whose density falls to zero at its surface,`,
      {tex: raw`Q=\int_0^{R}\rho_0\Big(1-\frac{r'}{R}\Big)4\pi r'^2\,dr'=\frac{\pi\rho_0R^3}{3}\;\Rightarrow\;\rho_0=\frac{3Q}{\pi R^3}`},
      raw`The charge inside a sphere of radius $r$ is then the same integral with the upper limit $r$. If the problem hands you $\rho_0$, leave it in the answer.`,
    ]},
    {heading: 'The mistakes graders see most', body: [
      raw`Integrating $\rho\,dr'$ instead of $\rho\,4\pi r'^2\,dr'$: check the units, since $Q_{\text{enc}}$ must come out as a charge, and $\int\rho\,dr'$ is a charge per area. Using $\frac43\pi r^3$ as $dV$: a $dV$ must contain $dr'$. The upper limit $R$ for a point inside: inside, $Q_{\text{enc}}$ must change with $r$ and reach $Q$ only at $R$. The upper limit $r$ for a point outside: there is no charge beyond $R$, so outside $Q_{\text{enc}}$ is constant. Leaving $\rho_0$ unknown when $Q$ was given: normalise first. Dropping the slab’s factor of two: the pillbox runs from $-z$ to $z$, so integrate from zero to $z$ and double. Leaving $L$ or $A$ in $E$: the surface is imaginary, and they must cancel. And inside and outside answers that do not meet at $R$: with a finite density the field is continuous, so a mismatch is an algebra slip.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: charge distributions with spherical, cylindrical and planar symmetry', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.3, Applications of Gauss’s law: a density that depends on distance'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: charge distributions and Gauss’s law'},
  ],
  cases: [
    {
      key: 'ratio', label: 'Uniform ball',
      figure: {charge: {kind: 'ball', size: 1.1, symbol: 'Q', name: 'a uniformly charged ball'}, surface: {kind: 'sphere', size: {min: .35, max: 2.2, initial: .75}, other: 0, label: 'Radius r'}},
      setup: raw`A ball of radius $R$ holds a charge $Q$ spread evenly through its volume. Find the field a distance $r$ from its centre, inside the ball and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The charge depends only on the distance from the centre, so $\vec E$ is radial and its size depends only on $r$. $E_r$ is negative where the field points in.`,
        line: raw`The charge depends only on $r$: $\vec E$ is radial, and its size depends on $r$ alone.`,
        caption: 'The ball looks the same from every direction about its centre, so its field points along the radius, out or in, and its size depends only on the distance r.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ through $P$, centred on the ball: inside it while $r<R$, round it once $r>R$.`,
        line: raw`A sphere through $P$, centred on the ball: inside it or round it.`,
        caption: 'Draw a sphere of radius r through P, centred on the ball. It may cut through the ball or lie round it; the field is square to it and the same all over it either way.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`The left side is the same in both regions.`,
        line: raw`The left side is the same inside the ball and out: $E_r$ times $4\pi r^2$.`,
        caption: 'The left side. Each patch carries E_r times its area, and E_r is the same on all of them: the flux is E_r times four π r squared, wherever the sphere is.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=Q\,\frac{V_{\text{in}}}{V}=\begin{cases}Q\,\dfrac{r^3}{R^3}, & r\le R\\[6pt]Q, & r\ge R\end{cases}`,
        say: raw`Uniform, so the charge inside is $Q$ times the fraction of the ball’s volume inside the sphere, $\frac43\pi r^3$ over $\frac43\pi R^3$. Outside, it is all of $Q$.`,
        line: raw`Uniform: the charge inside is $Q$ times the fraction of the volume inside.`,
        caption: 'The right side, by the ratio method. The charge is spread evenly, so the sphere encloses Q times the fraction of the ball’s volume inside it: r cubed over R cubed while it is inside the ball, and all of Q once it is outside.',
      },
      solve: {
        tex: raw`E_r=\frac{Q_{\text{enc}}}{4\pi\varepsilon_0r^2}=\begin{cases}\dfrac{kQr}{R^3}, & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        answer: raw`E_r=\begin{cases}\dfrac{kQr}{R^3}, & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        say: raw`Each region has its own $Q_{\text{enc}}$; the two answers meet at $r=R$.`,
        line: raw`Divide by $4\pi\varepsilon_0r^2$ in each region: the two answers meet at $r=R$.`,
        caption: 'Set the two sides equal and divide by four π ε₀ r squared, in each region. Inside, the field grows in proportion to r; outside, it falls as a point charge’s. At r equal to R both give k Q over R squared.',
      },
      checks: [
        {title: 'Shells agree', text: raw`Thin shells give the same. The density $\rho=Q/\frac43\pi R^3$ is the same in every shell, so $\int_0^r\rho\,4\pi r'^2\,dr'$ is $\rho\,\frac43\pi r^3$, which is $Qr^3/R^3$. The ratio method is the shells, done in your head.`},
        {title: 'They meet at R', text: raw`At $r=R$ the inside answer gives $kQR/R^3=kQ/R^2$, the outside one’s value. A finite density puts no charge on the surface itself, so the field cannot jump there.`},
        {title: 'Either sign', text: raw`For a negative $Q$, $E_r$ is negative in both regions, pointing in. The ratio does not care about the sign.`},
      ],
    },
    {
      key: 'shells', label: 'Falling density',
      figure: {charge: {kind: 'falling', size: 1.1, symbol: 'Q', name: 'a ball whose density falls to zero at its surface'}, surface: {kind: 'sphere', size: {min: .35, max: 2.2, initial: .8}, other: 0, label: 'Radius r'}},
      setup: raw`A ball of radius $R$ holds a total charge $Q$, with a density that falls from its centre to zero at its surface, $\rho=\rho_0(1-r/R)$. Find the field inside the ball and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The density depends only on $r$, so the ball is still unchanged by every turn about its centre: $\vec E$ is radial.`,
        line: raw`The density depends only on $r$: the field is still radial, its size set by $r$.`,
        caption: 'The density changes with the distance from the centre but not with direction, so every turn about the centre leaves the ball as it was. The field is radial, and its size depends only on r.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ through $P$, centred on the ball.`,
        line: raw`A sphere of radius $r$ through $P$, centred on the ball.`,
        caption: 'Draw a sphere of radius r through P, centred on the ball, inside it or round it.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`The same left side as any sphere: the density changes nothing here.`,
        line: raw`The left side is $E_r$ times $4\pi r^2$, whatever the density does.`,
        caption: 'The left side is E_r times four π r squared, as for any sphere. All the work is on the right.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\int_0^{r}\rho_0\Big(1-\frac{r'}{R}\Big)4\pi r'^2\,dr'=Q\Big(\frac{4r^3}{R^3}-\frac{3r^4}{R^4}\Big)`,
        say: raw`A thin shell at $r'$ holds $\rho(r')\,4\pi r'^2\,dr'$. The same integral out to $R$ gives $Q=\pi\rho_0R^3/3$, which fixes $\rho_0=3Q/\pi R^3$. For $r\ge R$ the shells stop at $R$, and $Q_{\text{enc}}=Q$.`,
        line: raw`Add thin shells, $\rho\,4\pi r'^2\,dr'$ each, from the centre out to $r$.`,
        caption: 'The right side, by thin shells. A shell of radius r prime and thickness d r prime holds the density there times four π r prime squared d r prime. Adding them from the centre to r, with ρ₀ fixed by the whole ball holding Q, gives the charge inside; outside the ball the shells stop at R, and it is all of Q.',
      },
      solve: {
        tex: raw`E_r=\begin{cases}\dfrac{kQ}{R^3}\Big(4r-\dfrac{3r^2}{R}\Big), & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        answer: raw`E_r=\begin{cases}\dfrac{kQ}{R^3}\Big(4r-\dfrac{3r^2}{R}\Big), & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        say: raw`Divide by $4\pi\varepsilon_0r^2$. At $r=R$ the inside answer is $kQ/R^2$, the outside one’s value.`,
        line: raw`Divide by $4\pi\varepsilon_0r^2$: at $r=R$ both answers give $kQ/R^2$.`,
        caption: 'Set the two sides equal and divide by four π ε₀ r squared in each region. At r equal to R the inside answer comes to k Q over R squared, the outside one’s value: the field is continuous.',
      },
      checks: [
        {title: 'Normalise first', text: raw`$\rho_0$ was not given, $Q$ was. Integrating over the whole ball fixed $\rho_0=3Q/\pi R^3$; the answer is then in what the problem gave.`},
        {title: 'They meet at R', text: raw`Inside, at $r=R$: $\frac{kQ}{R^3}(4R-3R)=\frac{kQ}{R^2}$, as outside.`},
        {title: 'Strongest inside', text: raw`The field peaks before the surface, at $r=2R/3$, where it is $\frac43\,kQ/R^2$: past there the density at the sphere has fallen below two thirds of the average density inside it, so the charge enclosed grows more slowly than the sphere’s area, and $Q_{\text{enc}}/r^2$ falls.`},
        {title: 'Either sign', text: raw`For a negative $Q$ the density is negative throughout, and $E_r$ is negative in both regions.`},
      ],
    },
    {
      key: 'slab', label: 'Slab',
      figure: {charge: {kind: 'tent', size: .7, symbol: raw`\rho`, name: 'a slab whose density falls from its middle plane'}, surface: {kind: 'pillbox', size: {min: .2, max: 1.5, initial: .45}, other: .85, label: 'Height z'}},
      setup: raw`A slab of thickness $2a$, infinite in its other two directions, has a density $\rho=\rho_0(1-|z|/a)$: greatest on its middle plane and zero at its faces, with $\rho_0$ given. Find the field a height $z$ above the middle plane.`,
      symmetry: {
        tex: raw`\vec E=E_\perp(z)\,\hat{\mathbf n}`,
        say: raw`$\hat{\mathbf n}$ points away from the middle plane on either side. The slab is the same at $z$ and $-z$, so the field below is the mirror of the field above. $E_\perp$ is negative where the field points toward the middle.`,
        line: raw`Turns and the flip in the middle plane: $\vec E$ is square to the slab, mirrored.`,
        caption: 'Turns about a line square to the slab leave it unchanged, so the field has no part along it. The flip in the middle plane leaves it unchanged too, so the field below is the mirror of the field above.',
      },
      surface: {
        tex: raw`A_{\text{faces}}=2A`,
        say: raw`A pillbox standing across the slab, its faces of area $A$ at $z$ and $-z$. On the side, $\vec E$ lies along the surface.`,
        line: raw`A pillbox across the slab, its faces at $z$ and $-z$.`,
        caption: 'Draw a pillbox standing across the slab, centred on its middle plane, with its two faces, each of area A, at heights z and minus z. On the side the field lies along the surface.',
      },
      left: {
        tex: raw`\Phi=E_\perp A+E_\perp A+0=2E_\perp A`,
        say: raw`Each face carries $E_\perp A$; the side carries nothing.`,
        line: raw`Each face carries $E_\perp A$; the side carries nothing.`,
        caption: 'The left side. Both faces carry E_⊥ times A, since the outward normal points away from the middle on each, and the side carries nothing.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=2\int_0^{z}\rho_0\Big(1-\frac{z'}{a}\Big)A\,dz'=2\rho_0A\Big(z-\frac{z^2}{2a}\Big)`,
        say: raw`Thin slices of area $A$ and thickness $dz'$. The pillbox runs from $-z$ to $z$: integrate the top half and double it, which also deals with $|z'|$. For $z\ge a$ the slices stop at the face, and $Q_{\text{enc}}=\rho_0Aa$.`,
        line: raw`Slices $\rho A\,dz'$ from the middle up to $z$, doubled for the half below.`,
        caption: 'The right side, by thin slices. Each slice of area A and thickness d z prime holds the density there times A d z prime. Add the slices from the middle plane up to z, then double for the half below; outside the slab the slices stop at its face, a.',
      },
      solve: {
        tex: raw`E_\perp=\begin{cases}\dfrac{\rho_0}{\varepsilon_0}\Big(z-\dfrac{z^2}{2a}\Big), & z\le a\\[6pt]\dfrac{\rho_0a}{2\varepsilon_0}, & z\ge a\end{cases}`,
        answer: raw`E_\perp=\begin{cases}\dfrac{\rho_0}{\varepsilon_0}\Big(z-\dfrac{z^2}{2a}\Big), & z\le a\\[6pt]\dfrac{\rho_0a}{2\varepsilon_0}, & z\ge a\end{cases}`,
        say: raw`Divide by $2A\varepsilon_0$: $A$ cancels, and the two answers meet at $z=a$.`,
        line: raw`Divide by $2A\varepsilon_0$: $A$ cancels, and the answers meet at $z=a$.`,
        caption: 'Set the two sides equal and divide by two A ε₀. The face area A cancels. Inside, the field grows from zero on the middle plane; outside, it is the same at every height, and the two meet at the slab’s face.',
      },
      checks: [
        {title: 'The factor of two', text: raw`Integrating only from zero to $z$, without doubling, would enclose half the charge and give half the field. The pillbox reaches as far below the middle as above it.`},
        {title: 'A cancels', text: raw`$A$ is on both sides and is gone from $E_\perp$. An $A$ left in the field would mean it depended on an imaginary surface.`},
        {title: 'A sheet from outside', text: raw`The slab holds $\rho_0a$ per unit area in all. Outside, its field is $\rho_0a/2\varepsilon_0$: a sheet’s $\sigma/2\varepsilon_0$ with that $\sigma$, and the same at every height.`},
        {title: 'Either sign', text: raw`For a negative $\rho_0$, $E_\perp$ is negative on both sides: the field points toward the middle plane.`},
      ],
    },
  ],
  traps: [
    {wrong: raw`$Q_{\text{enc}}$ is the object’s total charge.`, right: raw`Only once the surface is outside the object. Inside, it is the part within the surface, and with a varying density an integral that depends on $r$.`},
    {wrong: raw`$\int_0^r\rho\,dr'$ is the charge inside.`, right: raw`It adds densities along one radius, and its units are charge per area. Each shell’s area belongs in it: $\int_0^r\rho\,4\pi r'^2\,dr'$.`},
    {wrong: raw`$dV$ is $\frac43\pi r^3$.`, right: raw`That is a whole ball’s volume. A thin shell’s is its area times its thickness, $4\pi r'^2\,dr'$, the derivative of $\frac43\pi r^3$.`},
    {wrong: 'Where the density is small, there is little charge.', right: raw`A shell’s charge is its density times its volume, and the outer shells are large. In this lesson’s ball, whose density falls steadily to zero at its surface, more than half the charge lies in the outer half of the radius.`},
  ],
  instrument: 'qenc',
  next: 'spheres',
  related: {field: 'disk', text: 'A disk added up ring by ring: the same thin pieces, in a plane'},
};
